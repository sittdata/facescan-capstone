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


def _extract_cephalometric_data(
    cephalometric: Any = None,
    *fallbacks: Any,
) -> tuple[int | None, str | None, str | None, str | None, dict[str, float]]:
    """Extract (skeletal_class, class_name, severity, surgical_indication, features)."""
    target = cephalometric
    if target is None:
        for fb in fallbacks:
            if fb is None:
                continue
            if hasattr(fb, "cephalometric") and getattr(fb, "cephalometric") is not None:
                target = getattr(fb, "cephalometric")
                break
            if isinstance(fb, Mapping):
                if fb.get("cephalometric") is not None:
                    target = fb["cephalometric"]
                    break
                p = fb.get("profile")
                if isinstance(p, Mapping) and p.get("cephalometric") is not None:
                    target = p["cephalometric"]
                    break
                elif hasattr(p, "cephalometric") and getattr(p, "cephalometric") is not None:
                    target = getattr(p, "cephalometric")
                    break
                f = fb.get("frontal")
                if isinstance(f, Mapping) and f.get("cephalometric") is not None:
                    target = f["cephalometric"]
                    break
                elif hasattr(f, "cephalometric") and getattr(f, "cephalometric") is not None:
                    target = getattr(f, "cephalometric")
                    break

    if target is None:
        return None, None, None, None, {}

    # If target is raw cephalometric measurements without skeletal_class, auto-classify
    if isinstance(target, Mapping) and "skeletal_class" not in target:
        from facescan.core.cephalometric_model import FEATURE_NAMES, classify_cephalometric_skeletal

        if any(k in target for k in FEATURE_NAMES):
            target = classify_cephalometric_skeletal(target)

    cls_id: int | None = None
    cls_name: str | None = None
    severity: str | None = None
    surgical_ind: str | None = None
    features: dict[str, float] = {}

    if hasattr(target, "skeletal_class"):
        cls_id = getattr(target, "skeletal_class", None)
        cls_name = getattr(target, "skeletal_class_name", None)
        severity = getattr(target, "severity", None)
        surgical_ind = getattr(target, "surgical_indication", None)
        features = getattr(target, "features", {}) or {}
    elif isinstance(target, Mapping):
        cls_id = target.get("skeletal_class")
        cls_name = target.get("skeletal_class_name")
        severity = target.get("severity")
        surgical_ind = target.get("surgical_indication")
        features = target.get("features", {}) or {}

    try:
        cls_id = int(cls_id) if cls_id is not None else None
    except (ValueError, TypeError):
        cls_id = None

    if cls_name is not None:
        cls_name = str(cls_name)
    if severity is not None:
        severity = str(severity)
    if surgical_ind is not None:
        surgical_ind = str(surgical_ind)

    return cls_id, cls_name, severity, surgical_ind, features


class ProcedureRecommender:
    """Clinical aesthetic procedure evaluation and recommendation engine."""

    def evaluate_chin_augmentation(
        self,
        frontal_metrics: Mapping[str, Any],
        profile_metrics: Mapping[str, Any] | None = None,
        cephalometric: Any = None,
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
        - Cephalometric:
          - Class III: Chin filler/implant is strictly contraindicated.
          - Class II: Mild cases benefit from camouflage; severe cases note surgical necessity.
        """
        # Cross-check cephalometric skeletal deformity
        ceph_class, ceph_name, ceph_sev, ceph_surg, ceph_feats = _extract_cephalometric_data(
            cephalometric, profile_metrics, frontal_metrics
        )

        if ceph_class == 2 or ceph_name == "Class_III":
            return ProcedureRecommendation(
                procedure="chin_augmentation",
                intensity=0.0,
                rationale=(
                    "Chin augmentation (filler or implant) is contraindicated due to Skeletal Class III prognathism "
                    "(mandibular excess or midface hypoplasia). Adding chin volume would exacerbate lower-face anterior protrusion; "
                    "orthognathic surgical consultation is recommended instead."
                ),
                triggering_metrics=["cephalometric_class_iii"],
            )

        triggering_metrics: list[str] = []
        components: list[float] = []
        rationales: list[str] = []

        # Cephalometric Class II enhancement
        if ceph_class == 1 or ceph_name == "Class_II":
            triggering_metrics.append("cephalometric_class_ii")
            if ceph_sev == "Severe":
                components.append(0.35)
                rationales.append(
                    "Cephalometric skeletal analysis confirms severe Skeletal Class II retrognathia. Soft-tissue chin filler "
                    "provides only limited aesthetic camouflage and cannot correct underlying mandibular hypoplasia or airway compromise; "
                    "corrective orthognathic surgery is the primary clinical treatment."
                )
            elif ceph_sev == "Moderate":
                components.append(0.50)
                rationales.append(
                    "Cephalometric skeletal analysis confirms moderate Skeletal Class II retrognathia. Chin filler or implant can offer "
                    "partial aesthetic camouflage, but orthognathic mandibular advancement is recommended for definitive skeletal correction."
                )
            else:  # Mild
                components.append(0.40)
                rationales.append(
                    "Cephalometric skeletal analysis confirms mild Skeletal Class II retrognathia, which is well-suited for non-surgical "
                    "chin filler or implant camouflage."
                )

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
            # If severe Class II, cap non-surgical chin filler at 0.50 to avoid overpromising
            if ceph_class == 1 and ceph_sev == "Severe":
                raw_intensity = min(0.50, raw_intensity)
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

    def evaluate_orthognathic_surgery(
        self,
        cephalometric: Any = None,
        profile_metrics: Mapping[str, Any] | None = None,
        frontal_metrics: Mapping[str, Any] | None = None,
        *,
        profile: Any = None,
        frontal: Any = None,
    ) -> ProcedureRecommendation:
        """Evaluate indication for Orthognathic (Corrective Jaw) Surgery.

        Evaluates sagittal and vertical skeletal discrepancies (Skeletal Class II retrognathism,
        Skeletal Class III prognathism) to differentiate between non-surgical aesthetic camouflage
        (chin filler/genioplasty) vs surgical orthognathic intervention.
        """
        ceph_class, ceph_name, ceph_sev, ceph_surg, ceph_feats = _extract_cephalometric_data(
            cephalometric, profile, frontal, profile_metrics, frontal_metrics
        )

        triggering_metrics: list[str] = []
        intensity = 0.0
        rationale = "Skeletal jaw relationships are balanced (Class I); orthognathic surgery is not indicated."

        if ceph_class is not None and ceph_name is not None:
            if ceph_class == 0 or ceph_name == "Class_I":
                intensity = 0.0
                rationale = "Cephalometric analysis indicates harmonious skeletal jaw bases (Skeletal Class I); corrective orthognathic surgery is not clinically indicated."
            elif ceph_class == 1 or ceph_name == "Class_II":
                triggering_metrics.append("skeletal_class_ii")
                if "anb_angle" in ceph_feats:
                    triggering_metrics.append("anb_angle")
                if "wits_appraisal_mm" in ceph_feats:
                    triggering_metrics.append("wits_appraisal_mm")

                if ceph_sev == "Mild":
                    intensity = 0.25
                    rationale = (
                        "Mild Skeletal Class II retrognathia. Corrective orthognathic jaw surgery is an elective option; "
                        "aesthetic camouflage (chin filler or implant) or orthodontic compensation is generally preferred."
                    )
                elif ceph_sev == "Moderate":
                    intensity = 0.65
                    rationale = (
                        "Moderate Skeletal Class II malocclusion with mandibular retrognathia. "
                        "Orthognathic bilateral sagittal split osteotomy (BSSO) mandibular advancement is clinically indicated "
                        "to establish functional occlusion and restore lower-face projection."
                    )
                else:  # Severe
                    intensity = 0.95
                    rationale = (
                        "Severe Skeletal Class II mandibular deficiency with high sagittal discrepancy. "
                        "Corrective orthognathic surgery (BSSO advancement ± Le Fort I osteotomy) is strongly recommended "
                        "to resolve substantial skeletal disharmony, masticatory dysfunction, and potential pharyngeal airway collapse."
                    )
            elif ceph_class == 2 or ceph_name == "Class_III":
                triggering_metrics.append("skeletal_class_iii")
                if "anb_angle" in ceph_feats:
                    triggering_metrics.append("anb_angle")
                if "wits_appraisal_mm" in ceph_feats:
                    triggering_metrics.append("wits_appraisal_mm")

                if ceph_sev == "Mild":
                    intensity = 0.35
                    rationale = (
                        "Mild Skeletal Class III discrepancy. Orthognathic surgery may be considered if orthodontic dental camouflage "
                        "is insufficient. Non-surgical chin volume addition is contraindicated."
                    )
                elif ceph_sev == "Moderate":
                    intensity = 0.75
                    rationale = (
                        "Moderate Skeletal Class III malocclusion with mandibular prognathism or midface retrusion. "
                        "Corrective orthognathic surgery (mandibular setback ± maxillary advancement) is clinically indicated "
                        "for functional bite correction and profile balance."
                    )
                else:  # Severe
                    intensity = 1.00
                    rationale = (
                        "Severe Skeletal Class III skeletal deformity (prominent mandibular excess and negative overjet). "
                        "Two-jaw corrective orthognathic surgery (Le Fort I maxillary advancement with BSSO mandibular setback) "
                        "is strongly recommended to restore chewing function, TMJ stability, and facial harmony."
                    )

        return ProcedureRecommendation(
            procedure="orthognathic_surgery",
            intensity=intensity,
            rationale=rationale,
            triggering_metrics=triggering_metrics,
        )

    def evaluate_botulinum_toxin_masseter(
        self,
        frontal_metrics: Mapping[str, Any],
        cephalometric: Any = None,
        profile_metrics: Mapping[str, Any] | None = None,
    ) -> ProcedureRecommendation:
        """Evaluate indication for Masseter Botulinum Toxin injection.

        Anatomic indication:
        - Masseter muscle hypertrophy causing widened lower face or square jaw contour.
        - Trigger criteria & Clinical standards:
          - Cephalometric:
            - Gonial angle <= 122.0° (acute/square mandibular angle; normal range 120-130°).
            - FMA angle <= 22.0° (hypodivergent low-angle facial pattern with elevated bite force).
          - Frontal:
            - F10_golden_ratio < 1.30 (short, wide facial proportion).
            - F1_middle_lower_ratio < 0.92 (wide, compact lower facial third).
        """
        ceph_class, ceph_name, ceph_sev, ceph_surg, ceph_feats = _extract_cephalometric_data(
            cephalometric, profile_metrics, frontal_metrics
        )

        triggering_metrics: list[str] = []
        components: list[float] = []
        rationales: list[str] = []

        gonial = ceph_feats.get("gonial_angle")
        if gonial is not None and gonial <= 122.0:
            intensity_comp = (122.0 - gonial) / 15.0 + 0.35
            components.append(intensity_comp)
            triggering_metrics.append("gonial_angle")
            rationales.append(
                f"Gonial angle ({gonial:.1f}°) indicates strong masseteric muscle attachment and square jaw pattern; "
                "botulinum toxin type A to masseter muscles can significantly reduce transverse lower face width."
            )

        fma = ceph_feats.get("fma_angle")
        if fma is not None and fma <= 22.0:
            intensity_comp = (22.0 - fma) / 10.0 + 0.30
            components.append(intensity_comp)
            triggering_metrics.append("fma_angle")
            rationales.append(
                f"Hypodivergent skeletal pattern (FMA: {fma:.1f}°) indicates high masticatory muscle tone and masseter hypertrophy."
            )

        f10 = _extract_metric_val(frontal_metrics, "F10_golden_ratio")
        if f10 is not None and f10 < 1.30:
            intensity_comp = (1.30 - f10) / 0.25
            components.append(intensity_comp)
            triggering_metrics.append("F10_golden_ratio")
            rationales.append(
                f"Vertical-to-bizygomatic facial ratio (F10: {f10:.2f}) indicates transverse lower facial width dominance."
            )

        f1_ratio = _extract_metric_val(frontal_metrics, "F1_middle_lower_ratio")
        if f1_ratio is not None and f1_ratio < 0.92:
            intensity_comp = (0.95 - f1_ratio) / 0.20
            components.append(intensity_comp)
            triggering_metrics.append("F1_middle_lower_ratio")
            rationales.append(
                f"Middle-to-lower third ratio (F1: {f1_ratio:.2f}) indicates wide, square lower facial morphology."
            )

        if components:
            raw_intensity = max(components)
            intensity = round(max(0.01, min(1.0, raw_intensity)), 2)
            rationale = " ".join(rationales)
        else:
            intensity = 0.0
            rationale = "Mandibular angle width and masseter volume are in harmony with facial proportions."

        return ProcedureRecommendation(
            procedure="botulinum_toxin_masseter",
            intensity=intensity,
            rationale=rationale,
            triggering_metrics=triggering_metrics,
        )

    def evaluate_botulinum_toxin_wrinkles(
        self,
        frontal_metrics: Mapping[str, Any],
        profile_metrics: Mapping[str, Any] | None = None,
        sagging: Any = None,
    ) -> ProcedureRecommendation:
        """Evaluate indication for Upper-Face Anti-Wrinkle Botulinum Toxin.

        Anatomic indication:
        - Dynamic rhytids of forehead (frontalis), glabella (corrugator/procerus), and periorbital crow's feet.
        - Measured by:
          - F1_upper_third > 0.355 (frontalis dynamic strain) or < 0.30 (corrugator frown furrowing).
          - F11_asym_brow_apex_ratio > 0.15 (brow apex elevation asymmetry from uneven frontalis tone).
          - F11_asym_brow_head_offset > 7.0 %ICD (corrugator depressor tone imbalance).
          - Profile P5_forehead_inclination > 14.0° (sloping forehead prompting dynamic strain).
        """
        triggering_metrics: list[str] = []
        components: list[float] = []
        rationales: list[str] = []

        f1_upper = _extract_metric_val(frontal_metrics, "F1_upper_third")
        if f1_upper is not None:
            if f1_upper > 0.355:
                intensity_comp = (f1_upper - 0.333) / 0.10
                components.append(intensity_comp)
                triggering_metrics.append("F1_upper_third")
                rationales.append(
                    f"Upper facial third height (F1: {f1_upper:.3f}) indicates elevated frontalis dynamic strain and forehead line tendency."
                )
            elif f1_upper < 0.30:
                intensity_comp = (0.333 - f1_upper) / 0.10
                components.append(intensity_comp)
                triggering_metrics.append("F1_upper_third")
                rationales.append(
                    f"Upper facial third (F1: {f1_upper:.3f}) is compressed, associated with persistent glabellar frown depressor hyperactivity."
                )

        asym_apex = _extract_metric_val(frontal_metrics, "F11_asym_brow_apex_ratio")
        if asym_apex is not None and asym_apex > 0.15:
            intensity_comp = (asym_apex - 0.10) / 0.25
            components.append(intensity_comp)
            triggering_metrics.append("F11_asym_brow_apex_ratio")
            rationales.append(
                f"Brow apex height asymmetry (F11: {asym_apex:.2f}) indicates uneven frontalis muscle contraction; micro-botulinum toxin can balance brow vectors."
            )

        asym_head = _extract_metric_val(frontal_metrics, "F11_asym_brow_head_offset")
        if asym_head is not None and abs(asym_head) > 7.0:
            intensity_comp = (abs(asym_head) - 5.0) / 10.0
            components.append(intensity_comp)
            triggering_metrics.append("F11_asym_brow_head_offset")
            rationales.append(
                f"Medial brow offset asymmetry (F11: {asym_head:.1f} %ICD) reflects asymmetrical corrugator supercilii tone."
            )

        if profile_metrics:
            p5 = _extract_metric_val(profile_metrics, "P5_forehead_inclination")
            if p5 is not None and p5 > 14.0:
                intensity_comp = (p5 - 12.0) / 10.0
                components.append(intensity_comp)
                triggering_metrics.append("P5_forehead_inclination")
                rationales.append(
                    f"Posterior forehead inclination (P5: {p5:.1f}°) promotes compensatory dynamic frontalis elevation rhytids."
                )

        tier, laxity_score, feats = _extract_sagging_data(sagging, frontal_metrics)
        if laxity_score is not None and laxity_score >= 35.0:
            intensity_comp = (laxity_score - 25.0) / 75.0
            components.append(intensity_comp)
            triggering_metrics.append("laxity_score")

        if components:
            raw_intensity = max(components)
            intensity = round(max(0.01, min(1.0, raw_intensity)), 2)
            rationale = " ".join(rationales)
        else:
            intensity = 0.0
            rationale = "Upper facial dynamic lines and brow vector symmetry are well-balanced."

        return ProcedureRecommendation(
            procedure="botulinum_toxin_wrinkles",
            intensity=intensity,
            rationale=rationale,
            triggering_metrics=triggering_metrics,
        )

    def evaluate_hyaluronic_acid_filler_nasolabial(
        self,
        frontal_metrics: Mapping[str, Any],
        profile_metrics: Mapping[str, Any] | None = None,
        sagging: Any = None,
        cephalometric: Any = None,
    ) -> ProcedureRecommendation:
        """Evaluate indication for Nasolabial Fold Hyaluronic Acid Filler.

        Anatomic indication:
        - Deepening of the nasolabial fold from pyriform aperture bone resorption,
          malar fat pad descent, and acute nasolabial angle.
        - Measured by:
          - Sagging oral commissure droop > 0.010 or jowl sagging index > 0.020.
          - Sagging tier >= 2 or laxity score >= 28.0%.
          - Profile P2 nasolabial angle < 95.0° (pyriform/maxillary bone recession).
          - Cephalometric SNA angle < 80.0° (skeletal midface hypoplasia).
          - Frontal F1 middle-to-lower ratio > 1.05.
        """
        triggering_metrics: list[str] = []
        components: list[float] = []
        rationales: list[str] = []

        tier, laxity_score, feats = _extract_sagging_data(sagging, frontal_metrics)
        commissure_droop = feats.get("oral_commissure_droop", 0.0)
        if commissure_droop > 0.010:
            intensity_comp = min(0.85, commissure_droop * 30.0)
            components.append(intensity_comp)
            triggering_metrics.append("oral_commissure_droop")
            rationales.append(
                "Perioral soft tissue descent accentuates nasolabial crease deepening."
            )

        jowl_idx = feats.get("jowl_sagging_index", 0.0)
        if jowl_idx > 0.020:
            intensity_comp = min(0.80, jowl_idx * 20.0)
            components.append(intensity_comp)
            triggering_metrics.append("jowl_sagging_index")

        if laxity_score is not None and laxity_score >= 28.0:
            intensity_comp = (laxity_score - 20.0) / 60.0
            components.append(intensity_comp)
            triggering_metrics.append("laxity_score")
            rationales.append(
                f"Midfacial structural laxity ({laxity_score:.1f}%) contributes to medial fat pad descent over the nasolabial fold."
            )

        if profile_metrics:
            p2 = _extract_metric_val(profile_metrics, "P2_nasolabial_angle")
            if p2 is not None and p2 < 95.0:
                intensity_comp = (95.0 - p2) / 15.0
                components.append(intensity_comp)
                triggering_metrics.append("P2_nasolabial_angle")
                rationales.append(
                    f"Acute nasolabial angle (P2: {p2:.1f}°) reflects deep pyriform aperture recession, benefiting from structural HA filler bolus."
                )

        ceph_class, ceph_name, ceph_sev, ceph_surg, ceph_feats = _extract_cephalometric_data(
            cephalometric, profile_metrics, frontal_metrics
        )
        sna = ceph_feats.get("sna_angle")
        if sna is not None and sna < 80.0:
            intensity_comp = (82.0 - sna) / 8.0
            components.append(intensity_comp)
            triggering_metrics.append("sna_angle")
            rationales.append(
                f"Cephalometric maxillary retrusion (SNA: {sna:.1f}°) predisposes to deep paranasal hollows."
            )

        f1_ratio = _extract_metric_val(frontal_metrics, "F1_middle_lower_ratio")
        if f1_ratio is not None and f1_ratio > 1.05:
            intensity_comp = (f1_ratio - 1.00) / 0.30
            components.append(intensity_comp)
            triggering_metrics.append("F1_middle_lower_ratio")

        if components:
            raw_intensity = max(components)
            intensity = round(max(0.01, min(1.0, raw_intensity)), 2)
            rationale = " ".join(rationales)
        else:
            intensity = 0.0
            rationale = "Nasolabial transition and paranasal structural volume are youthful and well-supported."

        return ProcedureRecommendation(
            procedure="hyaluronic_acid_filler_nasolabial",
            intensity=intensity,
            rationale=rationale,
            triggering_metrics=triggering_metrics,
        )

    def evaluate_hyaluronic_acid_filler_temple(
        self,
        frontal_metrics: Mapping[str, Any],
        profile_metrics: Mapping[str, Any] | None = None,
    ) -> ProcedureRecommendation:
        """Evaluate indication for Temporal Hollow Hyaluronic Acid Filler.

        Anatomic indication:
        - Bitemporal fossa volume loss (skeletonization), making zygomatic arches appear protruding.
        - Measured by:
          - Neoclassical Facial Fifths Canon (Farkas): F3 outer fifths target is 0.200.
          - F3_fifth_outer_right or F3_fifth_outer_left < 0.185 indicates temporal constriction.
          - F11_asym_outer_fifth > 0.12 indicates bitemporal volume asymmetry.
        """
        triggering_metrics: list[str] = []
        components: list[float] = []
        rationales: list[str] = []

        outer_r = _extract_metric_val(frontal_metrics, "F3_fifth_outer_right")
        outer_l = _extract_metric_val(frontal_metrics, "F3_fifth_outer_left")

        outers = [v for v in (outer_r, outer_l) if v is not None]
        if outers:
            min_outer = min(outers)
            if min_outer < 0.185:
                intensity_comp = (0.200 - min_outer) / 0.05
                components.append(intensity_comp)
                triggering_metrics.append("F3_fifth_outer")
                rationales.append(
                    f"Temporal width in outer facial fifths (F3: {min_outer:.3f}) falls below Neoclassical canon (0.200), indicating temporal fossa hollowing."
                )

        asym_outer = _extract_metric_val(frontal_metrics, "F11_asym_outer_fifth")
        if asym_outer is not None and asym_outer > 0.12:
            intensity_comp = (asym_outer - 0.08) / 0.20
            components.append(intensity_comp)
            triggering_metrics.append("F11_asym_outer_fifth")
            rationales.append(
                f"Outer facial fifth asymmetry (F11: {asym_outer:.2f}) indicates uneven bitemporal soft-tissue volume."
            )

        if components:
            raw_intensity = max(components)
            intensity = round(max(0.01, min(1.0, raw_intensity)), 2)
            rationale = " ".join(rationales)
        else:
            intensity = 0.0
            rationale = "Temporal fossa contour and bitemporal-to-zygomatic proportions are well-balanced."

        return ProcedureRecommendation(
            procedure="hyaluronic_acid_filler_temple",
            intensity=intensity,
            rationale=rationale,
            triggering_metrics=triggering_metrics,
        )

    def evaluate_mandibular_contouring(
        self,
        frontal_metrics: Mapping[str, Any],
        cephalometric: Any = None,
        profile_metrics: Mapping[str, Any] | None = None,
    ) -> ProcedureRecommendation:
        """Evaluate indication for Surgical Mandibular Angle Ostectomy / Jaw Contouring.

        Anatomic indication:
        - Severe bony mandibular flare / square jaw osteal hypertrophy that cannot be corrected
          by masseter botulinum toxin alone.
        - Measured by:
          - Cephalometric gonial angle < 115.0° (severe acute bony mandibular angle; canon 120-130°).
          - Cephalometric FMA angle < 20.0° (extreme hypodivergent skeletal pattern).
        """
        ceph_class, ceph_name, ceph_sev, ceph_surg, ceph_feats = _extract_cephalometric_data(
            cephalometric, profile_metrics, frontal_metrics
        )

        triggering_metrics: list[str] = []
        components: list[float] = []
        rationales: list[str] = []

        gonial = ceph_feats.get("gonial_angle")
        if gonial is not None and gonial < 115.0:
            intensity_comp = (118.0 - gonial) / 12.0
            components.append(intensity_comp)
            triggering_metrics.append("gonial_angle")
            rationales.append(
                f"Cephalometric gonial angle ({gonial:.1f}° < 115°) indicates marked bony mandibular angle prominence; "
                "surgical mandibular angle ostectomy is indicated as bone flare cannot be resolved by neuromodulators alone."
            )

        fma = ceph_feats.get("fma_angle")
        if fma is not None and fma < 20.0:
            intensity_comp = (20.0 - fma) / 8.0
            components.append(intensity_comp)
            triggering_metrics.append("fma_angle")
            rationales.append(
                f"Severe hypodivergent skeletal base (FMA: {fma:.1f}°) with pronounced bony mandibular flare."
            )

        if components:
            raw_intensity = max(components)
            intensity = round(max(0.01, min(1.0, raw_intensity)), 2)
            rationale = " ".join(rationales)
        else:
            intensity = 0.0
            rationale = "Mandibular bony contour and gonial angle are within physiological aesthetic boundaries."

        return ProcedureRecommendation(
            procedure="mandibular_contouring",
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
        cephalometric: Any = None,
        include_cephalometric: bool = False,
        comprehensive: bool = False,
    ) -> list[ProcedureRecommendation]:
        """Generate procedure recommendations for aesthetic proportions and structural laxity.

        Accepts FrontalResult, ProfileResult, Report, or metrics dictionaries.
        When comprehensive=False (default), evaluates the canonical set (chin, lip, rhino, + ortho/sagging if present).
        When comprehensive=True, evaluates the full 12-procedure clinical spectrum sorted by intensity descending.
        """
        # If frontal is a Report, extract frontal and profile from it if profile not given
        if profile is None and hasattr(frontal, "frontal") and hasattr(frontal, "profile"):
            profile = getattr(frontal, "profile", None)
            frontal = getattr(frontal, "frontal", None)

        frontal_metrics = _get_metrics(frontal)
        profile_metrics = _get_metrics(profile)

        # Check for cephalometric data in args, profile, or frontal
        ceph_target = cephalometric
        if ceph_target is None and profile is not None:
            if hasattr(profile, "cephalometric") and getattr(profile, "cephalometric") is not None:
                ceph_target = getattr(profile, "cephalometric")
            elif isinstance(profile, Mapping) and profile.get("cephalometric") is not None:
                ceph_target = profile["cephalometric"]
        if ceph_target is None and frontal is not None:
            if hasattr(frontal, "cephalometric") and getattr(frontal, "cephalometric") is not None:
                ceph_target = getattr(frontal, "cephalometric")
            elif isinstance(frontal, Mapping) and frontal.get("cephalometric") is not None:
                ceph_target = frontal["cephalometric"]

        # Check for sagging data in args or frontal
        sag_target = sagging
        if sag_target is None and frontal is not None:
            if hasattr(frontal, "facial_sagging") and getattr(frontal, "facial_sagging") is not None:
                sag_target = getattr(frontal, "facial_sagging")
            elif isinstance(frontal, Mapping) and frontal.get("facial_sagging") is not None:
                sag_target = frontal["facial_sagging"]

        chin = self.evaluate_chin_augmentation(frontal_metrics, profile_metrics, cephalometric=ceph_target)
        lip = self.evaluate_lip_augmentation(frontal_metrics, profile_metrics)
        rhino = self.evaluate_rhinoplasty(frontal_metrics, profile_metrics)

        if not comprehensive:
            all_recs = [chin, lip, rhino]

            # Check if cephalometric data is present or requested
            has_ceph_data = ceph_target is not None or include_cephalometric
            if has_ceph_data:
                ortho = self.evaluate_orthognathic_surgery(
                    cephalometric=ceph_target,
                    profile_metrics=profile_metrics,
                    frontal_metrics=frontal_metrics,
                    profile=profile,
                    frontal=frontal,
                )
                all_recs.append(ortho)

            # Check if sagging data is present or requested
            has_sagging_data = sag_target is not None or include_sagging

            if has_sagging_data:
                sagging_recs = self.evaluate_sagging_treatments(sagging=sag_target, frontal=frontal)
                all_recs.extend(sagging_recs)

            if only_recommended:
                return [r for r in all_recs if r.intensity > 0.0]
            return all_recs

        # Comprehensive 12-procedure evaluation across the full clinical spectrum
        masseter = self.evaluate_botulinum_toxin_masseter(
            frontal_metrics=frontal_metrics,
            cephalometric=ceph_target,
            profile_metrics=profile_metrics,
        )
        wrinkles = self.evaluate_botulinum_toxin_wrinkles(
            frontal_metrics=frontal_metrics,
            profile_metrics=profile_metrics,
            sagging=sag_target,
        )
        nasolabial = self.evaluate_hyaluronic_acid_filler_nasolabial(
            frontal_metrics=frontal_metrics,
            profile_metrics=profile_metrics,
            sagging=sag_target,
            cephalometric=ceph_target,
        )
        temple = self.evaluate_hyaluronic_acid_filler_temple(
            frontal_metrics=frontal_metrics,
            profile_metrics=profile_metrics,
        )
        skin = self.evaluate_skin_tightening(sagging=sag_target, frontal=frontal)
        thread = self.evaluate_thread_lift(sagging=sag_target, frontal=frontal)
        mandibular = self.evaluate_mandibular_contouring(
            frontal_metrics=frontal_metrics,
            cephalometric=ceph_target,
            profile_metrics=profile_metrics,
        )
        ortho = self.evaluate_orthognathic_surgery(
            cephalometric=ceph_target,
            profile_metrics=profile_metrics,
            frontal_metrics=frontal_metrics,
            profile=profile,
            frontal=frontal,
        )
        facelift = self.evaluate_surgical_facelift(sagging=sag_target, frontal=frontal)

        all_recs = [
            chin,
            lip,
            rhino,
            masseter,
            wrinkles,
            nasolabial,
            temple,
            skin,
            thread,
            mandibular,
            ortho,
            facelift,
        ]

        # Sort descending by intensity / priority % (highest recommended at top)
        all_recs.sort(key=lambda r: (-r.intensity, r.procedure))

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
    cephalometric: Any = None,
    include_cephalometric: bool = False,
    comprehensive: bool = False,
) -> list[ProcedureRecommendation]:
    """Calculate aesthetic procedure recommendations for facial proportions and structural laxity.

    Intensities are bounded in [0.0, 1.0] and rounded to 2 decimal places. 0.0 indicates no recommendation.
    When comprehensive=True, covers the full 12-procedure clinical spectrum sorted by intensity descending.
    """
    recommender = ProcedureRecommender()
    return recommender.recommend(
        frontal,
        profile,
        only_recommended=only_recommended,
        sagging=sagging,
        include_sagging=include_sagging,
        cephalometric=cephalometric,
        include_cephalometric=include_cephalometric,
        comprehensive=comprehensive,
    )


def recommend_comprehensive_procedures(
    frontal: Any,
    profile: Any = None,
    *,
    only_recommended: bool = False,
    sagging: Any = None,
    cephalometric: Any = None,
) -> list[ProcedureRecommendation]:
    """Calculate aesthetic procedure recommendations covering the full 12-procedure clinical spectrum.

    Sorted by priority / recommendation intensity descending.
    """
    recommender = ProcedureRecommender()
    return recommender.recommend(
        frontal,
        profile,
        only_recommended=only_recommended,
        sagging=sagging,
        include_sagging=True,
        cephalometric=cephalometric,
        include_cephalometric=True,
        comprehensive=True,
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


def recommend_orthognathic_procedures(
    cephalometric: Any = None,
    profile: Any = None,
    frontal: Any = None,
    *,
    only_recommended: bool = False,
) -> list[ProcedureRecommendation]:
    """Calculate clinical treatments indicated for cephalometric skeletal malocclusions."""
    recommender = ProcedureRecommender()
    profile_metrics = _get_metrics(profile)
    frontal_metrics = _get_metrics(frontal)
    rec = recommender.evaluate_orthognathic_surgery(
        cephalometric=cephalometric,
        profile_metrics=profile_metrics,
        frontal_metrics=frontal_metrics,
        profile=profile,
        frontal=frontal,
    )
    if only_recommended and rec.intensity == 0.0:
        return []
    return [rec]


__all__ = [
    "ProcedureRecommendation",
    "ProcedureRecommender",
    "recommend_procedures",
    "recommend_comprehensive_procedures",
    "recommend_sagging_procedures",
    "recommend_orthognathic_procedures",
]
