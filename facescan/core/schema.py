"""Pydantic result models.

Every model is JSON-serializable and survives a JSON round trip without loss
(``Model.model_validate_json(r.model_dump_json()) == r``): floats are finite
(``allow_inf_nan=False``; "unavailable" is ``None``, never NaN), containers are
lists and dicts, and enumerations are string literals.
"""

from __future__ import annotations

import math
from typing import Any, Literal

import numpy as np
from pydantic import BaseModel, ConfigDict, Field, model_validator

SCHEMA_VERSION = "2.0"

ResultStatus = Literal["ok", "no_face", "multiple_faces", "quality_failed", "contour_failed"]
PointSource = Literal["auto", "segmentation", "contour", "user_adjusted", "clinician"]
OverrideSource = Literal["user_adjusted", "clinician"]
Confidence = Literal["high", "low"]
MetricStatus = Literal["within", "below", "above", "inconclusive", "unavailable", "no_reference"]
Display = Literal["user", "clinic_only"]
MetricRole = Literal["primary", "secondary"]
UncertaintyMethod = Literal["burst_sd", "tta", "landmark_sampling"]
CameraSource = Literal["device", "exif", "configured_fov", "calibration"]
Sex = Literal["female", "male", "unspecified"]
CheckStatus = Literal["pass", "fail", "unverified"]

ADJUSTED_SOURCES: frozenset[str] = frozenset({"user_adjusted", "clinician"})


class _Model(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, allow_inf_nan=False)


# --------------------------------------------------------------------------- inputs


class CameraInfo(_Model):
    """Camera intrinsics for the image exactly as analyzed (after EXIF orientation)."""

    focal_px: float = Field(gt=0)
    source: CameraSource


class SubjectInfo(_Model):
    """Who is being analyzed.

    ``sex`` is entered by the user and never inferred from the face. ``age`` is the
    self-reported age in whole years, an input of the analysis carried in the result.
    ``norms_profile`` is set by deployment config (e.g. "canon", "th_east_asian"),
    never by the user.
    """

    sex: Sex
    age: int = Field(ge=1, le=120)
    norms_profile: str = "canon"


class DemographicsResult(_Model):
    """Inferred demographics from the face (Sex and Age)."""

    predicted_sex: Sex
    sex_confidence: float
    predicted_age: float
    age_sd: float = 2.5


class Override(_Model):
    """A point adjustment in pixel coordinates of the analyzed image.

    For a burst, coordinates refer to the reference frame. The caller sets
    ``source`` from who made the change; the core never infers it.
    """

    x: float
    y: float
    source: OverrideSource


# ------------------------------------------------------------------------ landmarks


class Point2D(_Model):
    x: float
    y: float


class AutoPosition(_Model):
    """The automatic position kept for an adjusted point (``x``/``y`` None if none existed)."""

    x: float | None = None
    y: float | None = None
    source: PointSource
    confidence: Confidence
    sd_px: float | None = None
    reason: str | None = None


class Landmark(_Model):
    """A named anatomical point. ``x``/``y`` are None when the point is unavailable."""

    x: float | None = None
    y: float | None = None
    source: PointSource
    confidence: Confidence
    sd_px: float | None = None
    auto: AutoPosition | None = None
    flags: list[str] = Field(default_factory=list)
    reason: str | None = None

    @property
    def available(self) -> bool:
        return self.x is not None and self.y is not None

    @property
    def adjusted(self) -> bool:
        return self.source in ADJUSTED_SOURCES

    def xy(self) -> np.ndarray | None:
        return None if not self.available else np.array([self.x, self.y], dtype=float)


# ---------------------------------------------------------------------- capture info


class HeadPose(_Model):
    """Head pose in degrees (subject's perspective, unmirrored image).

    yaw > 0: face turned toward the subject's left; pitch > 0: chin up;
    roll > 0: head tilted toward the subject's left shoulder.
    """

    yaw_deg: float
    pitch_deg: float
    roll_deg: float


class QualityCheck(_Model):
    id: str
    value: float | None = None
    limit: float | list[float] | None = None
    passed: bool
    status: CheckStatus
    hint_key: str | None = None
    frames_passed: int | None = None


class Quality(_Model):
    """Capture quality. A failed or unverified capture can never trigger considerations."""

    passed: bool
    considerations_eligible: bool
    checks: list[QualityCheck] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    hint_keys: list[str] = Field(default_factory=list)


class Calibration(_Model):
    method: Literal["iris", "transferred_from_frontal", "none"]
    mm_per_px: float | None = None
    rel_uncertainty: float | None = None
    iris_diameter_px: dict[str, float] | None = None
    # Stored calibration inputs (profile: the frontal scan's distances in mm), so that
    # apply_overrides can recompute the calibration without the frontal result.
    inputs: dict[str, float] | None = None
    landmarks_used: list[str] = Field(default_factory=list)
    reason: str | None = None


class Frames(_Model):
    count: int
    used: list[int]
    reference_frame: int
    reference_sha256: str


class ImageSize(_Model):
    width: int
    height: int


# -------------------------------------------------------------------------- metrics


class CanonRef(_Model):
    """The canon target, resolved to a [min, max] band for this subject."""

    type: Literal["range", "target", "zero_band"]
    min: float | None = None
    max: float | None = None
    target: float | None = None
    tolerance_frac: float | None = None
    band_frac_icd: float | None = None


class Population(_Model):
    mean: float | None = None
    sd: float | None = None
    z: float | None = None
    typical_min: float | None = None
    typical_max: float | None = None
    source: str | None = None


class Metric(_Model):
    value: float | None
    unit: str
    uncertainty: float | None = None
    uncertainty_method: UncertaintyMethod | None = None
    canon: CanonRef | None = None
    deviation_abs: float | None = None
    deviation_pct: float | None = None
    population: Population = Field(default_factory=Population)
    status: MetricStatus
    status_basis: Literal["canon", "population"] | None = None
    display: Display = "user"
    role: MetricRole = "primary"
    confidence: Confidence
    flags: list[str] = Field(default_factory=list)
    landmarks_used: list[str] = Field(default_factory=list)
    reason: str | None = None


# ----------------------------------------------------------- harmony & procedures


class HarmonySubscores(_Model):
    vertical_thirds: float
    transverse_fifths: float
    lip_harmony: float
    symmetry: float


class HarmonyScore(_Model):
    overall: float
    subscores: HarmonySubscores


class FeatureAttributionModel(_Model):
    feature: str
    name_th: str
    name_en: str
    user_value: float
    reference_median: float
    impact_score: float
    is_positive: bool
    description: str


class AIHarmonyResultModel(_Model):
    overall_score: float
    raw_model_score: float
    percentile: float
    rating_th: str
    rating_en: str
    key_strengths: list[FeatureAttributionModel]
    key_improvements: list[FeatureAttributionModel]
    total_features_evaluated: int


class FacialSaggingResultModel(_Model):
    tier: int = Field(ge=1, le=3)
    tier_name: Literal["Firm", "Moderate", "Advanced"]
    laxity_score: float = Field(ge=0.0, le=100.0)
    confidence: float = Field(ge=0.0, le=1.0)
    probabilities: dict[str, float]
    rating_th: str
    rating_en: str
    features: dict[str, float] = Field(default_factory=dict)
    description_th: str
    description_en: str


class CephalometricResultModel(_Model):
    skeletal_class: int = Field(ge=0, le=2)
    skeletal_class_name: Literal["Class_I", "Class_II", "Class_III"]
    confidence: float = Field(ge=0.0, le=1.0)
    probabilities: dict[str, float]
    severity: Literal["Normal", "Mild", "Moderate", "Severe"]
    primary_etiology: str
    vertical_pattern: Literal["Normodivergent", "Hypodivergent", "Hyperdivergent"]
    surgical_indication: Literal["none", "camouflage_or_orthognathic", "orthognathic_indicated", "orthognathic_strongly_recommended"]
    label_th: str
    label_en: str
    description_th: str
    description_en: str
    features: dict[str, float] = Field(default_factory=dict)
    inference_time_ms: float | None = None

    @model_validator(mode="before")
    @classmethod
    def _coerce_from_measurements(cls, data: Any) -> Any:
        if isinstance(data, dict) and "skeletal_class" not in data:
            from facescan.core.cephalometric_model import classify_cephalometric_skeletal
            res = classify_cephalometric_skeletal(data)
            return res.model_dump()
        return data


class ProcedureRecommendation(_Model):
    procedure: str
    intensity: float = Field(ge=0.0, le=1.0)
    rationale: str
    triggering_metrics: list[str] = Field(default_factory=list)
    title_th: str | None = None
    title_en: str | None = None
    action_type: str | None = None
    area: str | None = None
    priority_level: str | None = None
    specific_action: str | None = None

    @property
    def recommended(self) -> bool:
        return self.intensity > 0.0


# -------------------------------------------------------------------------- results


class _ResultBase(_Model):
    schema_version: str = SCHEMA_VERSION
    core_version: str
    config_hash: str
    status: ResultStatus
    subject: SubjectInfo
    camera: CameraInfo | None = None
    image: ImageSize | None = None
    frames: Frames | None = None
    quality: Quality | None = None
    pose: HeadPose | None = None
    calibration: Calibration | None = None
    inferred_demographics: DemographicsResult | None = None
    landmarks: dict[str, Landmark] = Field(default_factory=dict)
    metrics: dict[str, Metric] = Field(default_factory=dict)

    @property
    def norms_profile(self) -> str:
        return self.subject.norms_profile


class FrontalResult(_ResultBase):
    view: Literal["frontal"] = "frontal"
    harmony: HarmonyScore | None = None
    ai_harmony: AIHarmonyResultModel | None = None
    facial_sagging: FacialSaggingResultModel | None = None
    cephalometric: CephalometricResultModel | None = None
    procedure_recommendations: list[ProcedureRecommendation] | None = None

    @model_validator(mode="before")
    @classmethod
    def _default_harmony_and_procedures(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if data.get("harmony") is None and data.get("metrics"):
                from facescan.core.harmony import calculate_harmony_score

                try:
                    data["harmony"] = calculate_harmony_score(data["metrics"])
                except Exception:
                    pass
            if data.get("procedure_recommendations") is None and data.get("metrics"):
                from facescan.core.procedure_recommender import recommend_procedures

                try:
                    data["procedure_recommendations"] = recommend_procedures(
                        data["metrics"],
                        sagging=data.get("facial_sagging"),
                        cephalometric=data.get("cephalometric"),
                    )
                except Exception:
                    pass
        return data


class ProfileResult(_ResultBase):
    """Phase 2. Same shape as FrontalResult plus ``facing`` and the stored contour."""

    view: Literal["profile"] = "profile"
    facing: Literal["left", "right"]
    # Silhouette simplified to ≤ 400 points (pixel coordinates), so clients can snap
    # dragged points on-device and apply_overrides can re-snap them.
    contour: list[Point2D] | None = None
    cephalometric: CephalometricResultModel | None = None


class Consideration(_Model):
    rule_id: str
    rule_version: int | None = None
    area: str
    finding_key: str
    consideration_keys: list[str]
    triggering_metrics: list[str]
    severity: str


class RuleOutcome(_Model):
    """Audit entry per rule (clinic export / QA; not part of the consumer view)."""

    rule_id: str
    rule_version: int | None = None
    outcome: Literal["fired", "not_met", "excluded"]
    ineligible: dict[str, str] = Field(default_factory=dict)   # metric → why it could not count


class Report(_Model):
    """Phase 3: frontal + profile results with considerations from the rules file.

    ``config_hash`` identifies the measurement configuration (as in the results);
    ``rules_version`` and ``rules_hash`` identify the rules file that produced the
    considerations.
    """

    schema_version: str = SCHEMA_VERSION
    core_version: str
    config_hash: str
    status: ResultStatus
    frontal: FrontalResult | None = None
    profile: ProfileResult | None = None
    harmony: HarmonyScore | None = None
    facial_sagging: FacialSaggingResultModel | None = None
    cephalometric: CephalometricResultModel | None = None
    procedure_recommendations: list[ProcedureRecommendation] | None = None
    considerations: list[Consideration] = Field(default_factory=list)
    rules_version: str | None = None
    rules_hash: str | None = None
    rule_audit: list[RuleOutcome] = Field(default_factory=list)
    disclaimer_key: str = "disclaimer.general"

    @model_validator(mode="before")
    @classmethod
    def _default_harmony_and_procedures(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if data.get("harmony") is None:
                frontal = data.get("frontal")
                if frontal is not None:
                    if isinstance(frontal, dict):
                        data["harmony"] = frontal.get("harmony")
                    else:
                        data["harmony"] = getattr(frontal, "harmony", None)
            if data.get("facial_sagging") is None:
                frontal = data.get("frontal")
                if frontal is not None:
                    if isinstance(frontal, dict):
                        data["facial_sagging"] = frontal.get("facial_sagging")
                    else:
                        data["facial_sagging"] = getattr(frontal, "facial_sagging", None)
            if data.get("cephalometric") is None:
                profile = data.get("profile")
                if profile is not None:
                    if isinstance(profile, dict):
                        data["cephalometric"] = profile.get("cephalometric")
                    else:
                        data["cephalometric"] = getattr(profile, "cephalometric", None)
                if data.get("cephalometric") is None:
                    frontal = data.get("frontal")
                    if frontal is not None:
                        if isinstance(frontal, dict):
                            data["cephalometric"] = frontal.get("cephalometric")
                        else:
                            data["cephalometric"] = getattr(frontal, "cephalometric", None)
            if data.get("procedure_recommendations") is None:
                frontal = data.get("frontal")
                profile = data.get("profile")
                if frontal is not None or profile is not None or data.get("cephalometric") is not None:
                    from facescan.core.procedure_recommender import recommend_procedures

                    try:
                        data["procedure_recommendations"] = recommend_procedures(
                            frontal=frontal,
                            profile=profile,
                            cephalometric=data.get("cephalometric"),
                        )
                    except Exception:
                        if isinstance(frontal, dict):
                            data["procedure_recommendations"] = frontal.get("procedure_recommendations")
                        elif frontal is not None:
                            data["procedure_recommendations"] = getattr(frontal, "procedure_recommendations", None)
        return data

    def to_vector(self) -> tuple[np.ndarray, list[str]]:
        """Fixed-order float vector of every metric (NaN = unavailable) and its id order."""
        from facescan.core.metrics_frontal import FRONTAL_METRIC_IDS
        from facescan.core.metrics_profile import PROFILE_METRIC_IDS

        ids = list(FRONTAL_METRIC_IDS) + list(PROFILE_METRIC_IDS)
        values = np.full(len(ids), math.nan, dtype=float)
        for i, metric_id in enumerate(ids):
            for res in (self.frontal, self.profile):
                if res is not None and metric_id in res.metrics:
                    v = res.metrics[metric_id].value
                    if v is not None:
                        values[i] = v
        return values, ids
