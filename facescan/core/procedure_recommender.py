"""Aesthetic Procedure Recommendation Engine.

Recommends clinical aesthetic treatments (Chin Augmentation, Lip Augmentation,
Rhinoplasty) with recommended intensities bounded in [0.0, 1.0] and clinical
rationales based on measured deviations from frontal (F1-F11) and profile (P1-P5)
metrics against classical aesthetic canons.
"""

from __future__ import annotations

import math
from typing import Any, Mapping

from facescan.core.schema import ProcedureRecommendation


def _extract_metric_val(metrics: Mapping[str, Any] | None, key: str) -> float | None:
    """Extract a float value from a metric dict or Metric instance."""
    if not metrics or key not in metrics:
        return None
    item = metrics[key]
    if item is None:
        return None
    if isinstance(item, (int, float)):
        v = item
    elif hasattr(item, "value"):
        v = item.value
    elif isinstance(item, Mapping):
        v = item.get("value")
    else:
        return None
    if v is None:
        return None
    try:
        v = float(v)
    except (TypeError, ValueError):
        return None
    if math.isnan(v) or math.isinf(v):
        return None
    return v


def _get_metrics(obj: Any) -> Mapping[str, Any]:
    """Extract a metrics mapping from a Result, Report, or raw dict."""
    if obj is None:
        return {}
    if hasattr(obj, "metrics") and isinstance(obj.metrics, Mapping):
        return obj.metrics
    if isinstance(obj, Mapping):
        if "metrics" in obj and isinstance(obj["metrics"], Mapping):
            return obj["metrics"]
        return obj
    return {}


def _extract_sagging_data(sagging: Any = None, frontal: Any = None) -> tuple[int | None, float | None, dict[str, float]]:
    """Extract (tier, laxity_score, features) from a sagging result, FrontalResult, or dict."""
    target = sagging
    if target is None and frontal is not None:
        if hasattr(frontal, "facial_sagging") and getattr(frontal, "facial_sagging") is not None:
            target = getattr(frontal, "facial_sagging")
        elif isinstance(frontal, Mapping) and frontal.get("facial_sagging") is not None:
            target = frontal["facial_sagging"]

    if target is None:
        return None, None, {}

    tier: int | None = None
    laxity_score: float | None = None
    features: dict[str, float] = {}

    if hasattr(target, "tier"):
        tier = getattr(target, "tier", None)
        laxity_score = getattr(target, "laxity_score", None)
        features = getattr(target, "features", {}) or {}
    elif isinstance(target, Mapping):
        tier = target.get("tier")
        laxity_score = target.get("laxity_score")
        features = target.get("features", {}) or {}

    try:
        tier = int(tier) if tier is not None else None
    except (ValueError, TypeError):
        tier = None

    try:
        laxity_score = float(laxity_score) if laxity_score is not None else None
    except (ValueError, TypeError):
        laxity_score = None

    return tier, laxity_score, features


class ProcedureRecommender:
    """Clinical aesthetic procedure evaluation and recommendation engine."""

    def evaluate_chin_augmentation(
        self,
        frontal_metrics: Mapping[str, Any],
        profile_metrics: Mapping[str, Any] | None = None,
    ) -> ProcedureRecommendation:
        """Evaluate indication for Chin Augmentation.

        Trigger thresholds:
        - Frontal:
          - F1_lower_third < 0.3167 (canon target 1/3 ~ 0.3333)
          - F2_lower_face_ratio > 0.525 (canon target 0.50)
          - F1_middle_lower_ratio > 1.05 (canon target 1.00)
        - Profile:
          - P4_eline_upper_lip_mm > -2.0
          - P4_eline_lower_lip_mm > -1.0
        """
        triggering_metrics: list[str] = []
        components: list[float] = []
        rationales: list[str] = []

        # Frontal checks
        f1_lower = _extract_metric_val(frontal_metrics, "F1_lower_third")
        if f1_lower is not None and f1_lower < 0.3167:
            intensity_comp = (0.3333 - f1_lower) / 0.05
            components.append(intensity_comp)
            triggering_metrics.append("F1_lower_third")
            rationales.append(
                f"Lower facial third height (F1: {f1_lower:.3f}) is vertically deficient relative to canon proportions (0.333)."
            )

        f2 = _extract_metric_val(frontal_metrics, "F2_lower_face_ratio")
        if f2 is not None and f2 > 0.525:
            intensity_comp = (f2 - 0.50) / 0.20
            components.append(intensity_comp)
            triggering_metrics.append("F2_lower_face_ratio")
            rationales.append(
                f"Lower face ratio (F2: {f2:.2f}) indicates relatively short chin height compared to upper lip."
            )

        f1_ratio = _extract_metric_val(frontal_metrics, "F1_middle_lower_ratio")
        if f1_ratio is not None and f1_ratio > 1.05:
            intensity_comp = (f1_ratio - 1.00) / 0.25
            components.append(intensity_comp)
            triggering_metrics.append("F1_middle_lower_ratio")
            rationales.append(
                f"Middle-to-lower third ratio (F1: {f1_ratio:.2f}) indicates lower face vertical deficit compared to midface."
            )

        # Profile checks
        if profile_metrics:
            p4_lower = _extract_metric_val(profile_metrics, "P4_eline_lower_lip_mm")
            if p4_lower is not None and p4_lower > -1.0:
                intensity_comp = (p4_lower - (-1.0)) / 3.0
                components.append(intensity_comp)
                triggering_metrics.append("P4_eline_lower_lip_mm")
                rationales.append(
                    f"Lower lip position relative to Ricketts' E-line (P4: {p4_lower:.1f} mm) indicates chin retrusion in profile."
                )

            p4_upper = _extract_metric_val(profile_metrics, "P4_eline_upper_lip_mm")
            if p4_upper is not None and p4_upper > -2.0:
                intensity_comp = (p4_upper - (-2.0)) / 3.0
                components.append(intensity_comp)
                triggering_metrics.append("P4_eline_upper_lip_mm")
                rationales.append(
                    f"Upper lip position relative to Ricketts' E-line (P4: {p4_upper:.1f} mm) indicates relative chin retrusion in profile."
                )

        if components:
            raw_intensity = max(components)
            intensity = round(max(0.01, min(1.0, raw_intensity)), 2)
            rationale = " ".join(rationales)
        else:
            intensity = 0.0
            rationale = "Chin projection and vertical proportions are within reference ranges."

        return ProcedureRecommendation(
            procedure="chin_augmentation",
            intensity=intensity,
            rationale=rationale,
            triggering_metrics=triggering_metrics,
        )

    def evaluate_lip_augmentation(
        self,
        frontal_metrics: Mapping[str, Any],
        profile_metrics: Mapping[str, Any] | None = None,
    ) -> ProcedureRecommendation:
        """Evaluate indication for Lip Augmentation.

        Trigger thresholds:
        - Frontal:
          - F8_lip_ratio deviating from 1.618 (< 1.50 or > 1.75)
        - Profile:
          - P4_eline_upper_lip_mm < -4.0
          - P4_eline_lower_lip_mm < -2.0
        """
        triggering_metrics: list[str] = []
        components: list[float] = []
        rationales: list[str] = []

        # Frontal checks
        f8 = _extract_metric_val(frontal_metrics, "F8_lip_ratio")
        if f8 is not None:
            if f8 < 1.50:
                intensity_comp = (1.618 - f8) / 0.60
                components.append(intensity_comp)
                triggering_metrics.append("F8_lip_ratio")
                rationales.append(
                    f"Lip vermilion ratio (F8: {f8:.2f}) departs from classical phi proportion (lower lip vermilion height is relatively thin)."
                )
            elif f8 > 1.75:
                intensity_comp = (f8 - 1.618) / 0.60
                components.append(intensity_comp)
                triggering_metrics.append("F8_lip_ratio")
                rationales.append(
                    f"Lip vermilion ratio (F8: {f8:.2f}) departs from classical phi proportion (upper lip vermilion height is relatively thin)."
                )

        # Profile checks
        if profile_metrics:
            p4_upper = _extract_metric_val(profile_metrics, "P4_eline_upper_lip_mm")
            if p4_upper is not None and p4_upper < -4.0:
                intensity_comp = (-4.0 - p4_upper) / 3.0
                components.append(intensity_comp)
                triggering_metrics.append("P4_eline_upper_lip_mm")
                rationales.append(
                    f"Upper lip (P4: {p4_upper:.1f} mm) is positioned behind Ricketts' aesthetic E-line plane."
                )

            p4_lower = _extract_metric_val(profile_metrics, "P4_eline_lower_lip_mm")
            if p4_lower is not None and p4_lower < -2.0:
                intensity_comp = (-2.0 - p4_lower) / 3.0
                components.append(intensity_comp)
                triggering_metrics.append("P4_eline_lower_lip_mm")
                rationales.append(
                    f"Lower lip (P4: {p4_lower:.1f} mm) is positioned behind Ricketts' aesthetic E-line plane."
                )

        if components:
            raw_intensity = max(components)
            intensity = round(max(0.01, min(1.0, raw_intensity)), 2)
            rationale = " ".join(rationales)
        else:
            intensity = 0.0
            rationale = "Lip vermilion fullness and sagittal projection are within reference ranges."

        return ProcedureRecommendation(
            procedure="lip_augmentation",
            intensity=intensity,
            rationale=rationale,
            triggering_metrics=triggering_metrics,
        )

    def evaluate_rhinoplasty(
        self,
        frontal_metrics: Mapping[str, Any],
        profile_metrics: Mapping[str, Any] | None = None,
    ) -> ProcedureRecommendation:
        """Evaluate indication for Rhinoplasty.

        Trigger thresholds:
        - Frontal:
          - F6_alar_icd_ratio > 1.05 (canon target 1.00)
        - Profile:
          - P2_nasolabial_angle < 95.0° (canon range [95.0, 105.0]°)
          - P3a_tip_projection_goode < 0.55 (canon range [0.55, 0.60])
          - P1_nasofrontal_angle < 115.0° or > 130.0° (canon range [115.0, 130.0]°)
        """
        triggering_metrics: list[str] = []
        components: list[float] = []
        rationales: list[str] = []

        # Frontal checks
        f6 = _extract_metric_val(frontal_metrics, "F6_alar_icd_ratio")
        if f6 is not None and f6 > 1.05:
            intensity_comp = (f6 - 1.05) / 0.20
            components.append(intensity_comp)
            triggering_metrics.append("F6_alar_icd_ratio")
            rationales.append(
                f"Alar base width relative to intercanthal distance (F6: {f6:.2f}) exceeds classical canon proportion."
            )

        # Profile checks
        if profile_metrics:
            p2 = _extract_metric_val(profile_metrics, "P2_nasolabial_angle")
            if p2 is not None and p2 < 95.0:
                intensity_comp = (95.0 - p2) / 15.0
                components.append(intensity_comp)
                triggering_metrics.append("P2_nasolabial_angle")
                rationales.append(
                    f"Nasolabial angle (P2: {p2:.1f}°) is acute, indicating downward nasal tip rotation."
                )

            p3a = _extract_metric_val(profile_metrics, "P3a_tip_projection_goode")
            if p3a is not None and p3a < 0.55:
                intensity_comp = (0.55 - p3a) / 0.10
                components.append(intensity_comp)
                triggering_metrics.append("P3a_tip_projection_goode")
                rationales.append(
                    f"Nasal tip projection ratio (P3a Goode: {p3a:.2f}) is below reference range."
                )

            p1 = _extract_metric_val(profile_metrics, "P1_nasofrontal_angle")
            if p1 is not None:
                if p1 < 115.0:
                    intensity_comp = (115.0 - p1) / 15.0
                    components.append(intensity_comp)
                    triggering_metrics.append("P1_nasofrontal_angle")
                    rationales.append(
                        f"Nasofrontal angle (P1: {p1:.1f}°) is acute, indicating deep nasal radix transition."
                    )
                elif p1 > 130.0:
                    intensity_comp = (p1 - 130.0) / 15.0
                    components.append(intensity_comp)
                    triggering_metrics.append("P1_nasofrontal_angle")
                    rationales.append(
                        f"Nasofrontal angle (P1: {p1:.1f}°) is obtuse, indicating flattened nasal dorsum-forehead angle."
                    )

        if components:
            raw_intensity = max(components)
            intensity = round(max(0.01, min(1.0, raw_intensity)), 2)
            rationale = " ".join(rationales)
        else:
            intensity = 0.0
            rationale = "Nasal proportions, tip rotation, and projection are within reference ranges."

        return ProcedureRecommendation(
            procedure="rhinoplasty",
            intensity=intensity,
            rationale=rationale,
            triggering_metrics=triggering_metrics,
        )

    def evaluate_skin_tightening(
        self,
        sagging: Any = None,
        frontal: Any = None,
    ) -> ProcedureRecommendation:
        """Evaluate indication for Non-Surgical Skin Tightening (HIFU / Ultherapy / Monopolar RF).

        Best indicated for:
        - Mild to Moderate structural laxity (Tier 2, or Laxity Score ~28% - 70%).
        """
        tier, laxity_score, feats = _extract_sagging_data(sagging, frontal)

        triggering_metrics: list[str] = []
        intensity = 0.0
        rationale = "Facial skin and subcutaneous structures display high firmness; routine preventive skincare recommended without energy-based tightening."

        if laxity_score is not None and tier is not None:
            if tier == 1 and laxity_score < 25.0:
                intensity = 0.0
                rationale = "Facial skin and soft-tissue architecture display youthful firmness (Tier 1); no energy-based skin tightening indicated."
            elif tier == 1 and laxity_score >= 25.0:
                intensity = round(max(0.15, (laxity_score - 20.0) / 40.0), 2)
                triggering_metrics.append("laxity_score")
                rationale = f"Early boundary structural laxity ({laxity_score:.1f}%); preventive low-intensity focused ultrasound or RF may delay soft-tissue descent."
            elif tier == 2:
                # Moderate laxity: primary sweet spot for HIFU/RF
                intensity = round(min(0.90, max(0.35, laxity_score / 70.0)), 2)
                triggering_metrics.extend(["sagging_tier", "laxity_score"])
                if feats.get("jowl_sagging_index", 0.0) > 0.02:
                    triggering_metrics.append("jowl_sagging_index")
                rationale = (
                    f"Moderate structural laxity (Tier 2, Laxity Score: {laxity_score:.1f}%) "
                    "is optimally indicated for High-Intensity Focused Ultrasound (HIFU/Ultherapy) or Monopolar RF (Thermage) "
                    "to stimulate deep collagen remodeling and SMAS fascial contraction without surgery."
                )
            elif tier == 3:
                # Advanced laxity: energy devices provide secondary dermal conditioning
                intensity = round(min(0.55, max(0.30, 40.0 / (laxity_score + 1e-4))), 2)
                triggering_metrics.extend(["sagging_tier", "laxity_score"])
                rationale = (
                    f"Advanced structural laxity (Tier 3, Laxity Score: {laxity_score:.1f}%) "
                    "receives moderate dermal tightening benefit from energy devices, but deep structural ptosis "
                    "typically warrants surgical or suspension repositioning for definitive rejuvenation."
                )

        return ProcedureRecommendation(
            procedure="skin_tightening",
            intensity=intensity,
            rationale=rationale,
            triggering_metrics=triggering_metrics,
        )

    def evaluate_thread_lift(
        self,
        sagging: Any = None,
        frontal: Any = None,
    ) -> ProcedureRecommendation:
        """Evaluate indication for Subdermal Suspension Thread Lifting.

        Indicated for:
        - Moderate to early advanced soft-tissue descent (Tier 2-3, Laxity Score 40% - 80%),
        - Prominent early jowling or downward oral commissure droop.
        """
        tier, laxity_score, feats = _extract_sagging_data(sagging, frontal)

        triggering_metrics: list[str] = []
        intensity = 0.0
        rationale = "Mandibular and malar vectors show preserved anatomical position; suspension thread lifting is not indicated."

        if laxity_score is not None and tier is not None:
            if tier == 1 or laxity_score < 35.0:
                intensity = 0.0
                rationale = "Facial soft tissue vectors exhibit minimal ptosis; mechanical thread suspension is not clinically indicated."
            elif tier == 2 or (35.0 <= laxity_score < 75.0):
                raw_int = (laxity_score - 30.0) / 45.0
                intensity = round(min(0.85, max(0.25, raw_int)), 2)
                triggering_metrics.extend(["sagging_tier", "laxity_score"])
                if feats.get("jowl_sagging_index", 0.0) > 0.025:
                    triggering_metrics.append("jowl_sagging_index")
                if feats.get("oral_commissure_droop", 0.0) > 0.0:
                    triggering_metrics.append("oral_commissure_droop")
                rationale = (
                    f"Mild-to-moderate descent of malar and mandibular soft tissue (Tier {tier}, Laxity: {laxity_score:.1f}%) "
                    "indicates absorbable barbed suspension threads (PDO/PLLA) for mechanical repositioning of descending jowl "
                    "and perioral tissue vectors."
                )
            elif tier == 3 or laxity_score >= 75.0:
                intensity = round(min(0.65, max(0.35, (laxity_score - 20.0) / 90.0)), 2)
                triggering_metrics.extend(["sagging_tier", "laxity_score", "jowl_sagging_index"])
                rationale = (
                    f"Advanced tissue laxity (Tier 3, Laxity: {laxity_score:.1f}%) provides moderate indication for thread lifting "
                    "as a minimally invasive vector-lifting alternative when surgical rhytidectomy is contraindicated or declined."
                )

        return ProcedureRecommendation(
            procedure="thread_lift",
            intensity=intensity,
            rationale=rationale,
            triggering_metrics=triggering_metrics,
        )

    def evaluate_surgical_facelift(
        self,
        sagging: Any = None,
        frontal: Any = None,
    ) -> ProcedureRecommendation:
        """Evaluate indication for Surgical Rhytidectomy (Deep Plane / SMAS Facelift).

        Indicated for:
        - Advanced structural laxity (Tier 3, Laxity Score >= 65%),
        - Mandibular contour blunting and significant redundant skin.
        """
        tier, laxity_score, feats = _extract_sagging_data(sagging, frontal)

        triggering_metrics: list[str] = []
        intensity = 0.0
        rationale = "Facial structural contours are within non-surgical boundaries; invasive surgical rhytidectomy is not indicated."

        if laxity_score is not None and tier is not None:
            if tier < 3 and laxity_score < 65.0:
                intensity = 0.0
                rationale = "Facial structural contours show low-to-moderate descent (Tier 1-2); invasive surgical facelift is not indicated."
            else:
                # Tier 3 or laxity_score >= 65%
                raw_int = (laxity_score - 60.0) / 35.0
                intensity = round(min(1.0, max(0.35, raw_int)), 2)
                triggering_metrics.extend(["sagging_tier", "laxity_score"])
                if feats.get("jowl_sagging_index", 0.0) > 0.03:
                    triggering_metrics.append("jowl_sagging_index")
                if feats.get("jawline_irregularity", 0.0) > 0.01:
                    triggering_metrics.append("jawline_irregularity")
                rationale = (
                    f"Advanced morphological structural laxity (Tier 3, Laxity Score: {laxity_score:.1f}%) "
                    "warrants surgical SMAS or deep-plane rhytidectomy with platysmaplasty for definitive anatomical repositioning "
                    "and redundant skin envelope excision."
                )

        return ProcedureRecommendation(
            procedure="surgical_facelift",
            intensity=intensity,
            rationale=rationale,
            triggering_metrics=triggering_metrics,
        )

    def evaluate_sagging_treatments(
        self,
        sagging: Any = None,
        frontal: Any = None,
        *,
        only_recommended: bool = False,
    ) -> list[ProcedureRecommendation]:
        """Evaluate the three clinical sagging treatments (skin tightening, thread lift, surgical facelift)."""
        recs = [
            self.evaluate_skin_tightening(sagging=sagging, frontal=frontal),
            self.evaluate_thread_lift(sagging=sagging, frontal=frontal),
            self.evaluate_surgical_facelift(sagging=sagging, frontal=frontal),
        ]
        if only_recommended:
            return [r for r in recs if r.intensity > 0.0]
        return recs

    def recommend(
        self,
        frontal: Any,
        profile: Any = None,
        *,
        only_recommended: bool = False,
        sagging: Any = None,
        include_sagging: bool = False,
    ) -> list[ProcedureRecommendation]:
        """Generate procedure recommendations for aesthetic proportions and structural laxity.

        Accepts FrontalResult, ProfileResult, Report, or metrics dictionaries.
        """
        # If frontal is a Report, extract frontal and profile from it if profile not given
        if profile is None and hasattr(frontal, "frontal") and hasattr(frontal, "profile"):
            profile = getattr(frontal, "profile", None)
            frontal = getattr(frontal, "frontal", None)

        frontal_metrics = _get_metrics(frontal)
        profile_metrics = _get_metrics(profile)

        chin = self.evaluate_chin_augmentation(frontal_metrics, profile_metrics)
        lip = self.evaluate_lip_augmentation(frontal_metrics, profile_metrics)
        rhino = self.evaluate_rhinoplasty(frontal_metrics, profile_metrics)

        all_recs = [chin, lip, rhino]

        # Check if sagging data is present or requested
        has_sagging_data = (
            sagging is not None
            or include_sagging
            or (hasattr(frontal, "facial_sagging") and getattr(frontal, "facial_sagging") is not None)
            or (isinstance(frontal, Mapping) and frontal.get("facial_sagging") is not None)
        )

        if has_sagging_data:
            sagging_recs = self.evaluate_sagging_treatments(sagging=sagging, frontal=frontal)
            all_recs.extend(sagging_recs)

        if only_recommended:
            return [r for r in all_recs if r.intensity > 0.0]
        return all_recs


def recommend_procedures(
    frontal: Any,
    profile: Any = None,
    *,
    only_recommended: bool = False,
    sagging: Any = None,
    include_sagging: bool = False,
) -> list[ProcedureRecommendation]:
    """Calculate aesthetic procedure recommendations for facial proportions and sagging laxity.

    Intensities are bounded in [0.0, 1.0] and rounded to 2 decimal places. 0.0 indicates no recommendation.
    """
    recommender = ProcedureRecommender()
    return recommender.recommend(
        frontal,
        profile,
        only_recommended=only_recommended,
        sagging=sagging,
        include_sagging=include_sagging,
    )


def recommend_sagging_procedures(
    sagging: Any,
    frontal: Any = None,
    *,
    only_recommended: bool = False,
) -> list[ProcedureRecommendation]:
    """Calculate clinical treatments specifically indicated for facial sagging and structural laxity."""
    recommender = ProcedureRecommender()
    return recommender.evaluate_sagging_treatments(
        sagging=sagging, frontal=frontal, only_recommended=only_recommended
    )


__all__ = [
    "ProcedureRecommendation",
    "ProcedureRecommender",
    "recommend_procedures",
    "recommend_sagging_procedures",
]
