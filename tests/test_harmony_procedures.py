"""Unit tests for Facial Harmony scoring and Aesthetic Procedure Recommendations.

Exhaustively covers:
- Gaussian distance decay properties and mathematical derivation from canon targets.
- Value extraction and type hardening (Metric objects, dicts, primitives, None, NaN/inf).
- 4 harmony subscores: vertical thirds, transverse fifths, lip harmony, and symmetry.
- Overall harmony score aggregation and bounds [0.0, 100.0].
- Procedure recommendations for Chin Augmentation, Lip Augmentation, and Rhinoplasty.
- Intensity bounding within [0.0, 1.0], rounded to 2 decimal places.
- Clinical rationales and triggering metrics tracking.
- Single-view (frontal only) vs dual-view (frontal + profile) recommendation behavior.
- Missing metrics, extreme inputs, and robustness against hostile data.
- Pipeline integration: FrontalResult, Report, and FrontalAssembler.apply_overrides.
"""

from __future__ import annotations

import math
import pytest

from facescan.core.harmony import _extract_value, calculate_harmony_score, gaussian_decay
from facescan.core.procedure_recommender import ProcedureRecommender, recommend_procedures
from facescan.core.schema import (
    FrontalResult,
    HarmonyScore,
    HarmonySubscores,
    Metric,
    ProcedureRecommendation,
    Report,
    SubjectInfo,
)
from helpers import synthetic_result, synthetic_settings


# ---------------------------------------------------------------------------
# 1. Gaussian Distance Decay & Numerical Foundation
# ---------------------------------------------------------------------------


def test_gaussian_decay_peak_at_canon():
    """Verify Gaussian decay evaluates to exactly 100.0 at the canonical target."""
    assert gaussian_decay(1.0, 1.0, 0.1) == pytest.approx(100.0)
    assert gaussian_decay(0.3333, 0.3333, 0.035) == pytest.approx(100.0)
    assert gaussian_decay(1.618, 1.618, 0.20) == pytest.approx(100.0)


def test_gaussian_decay_symmetry():
    """Verify decay is strictly symmetric around the mean mu."""
    mu = 0.50
    sigma = 0.06
    d = 0.04
    score_above = gaussian_decay(mu + d, mu, sigma)
    score_below = gaussian_decay(mu - d, mu, sigma)
    assert score_above == pytest.approx(score_below)


def test_gaussian_decay_sigma_scaling():
    """Verify theoretical Gaussian decay values at 1, 2, and 3 standard deviations:
    1 sigma -> 100 * exp(-0.5) ~ 60.653
    2 sigma -> 100 * exp(-2.0) ~ 13.534
    3 sigma -> 100 * exp(-4.5) ~ 1.111
    """
    mu = 1.0
    sigma = 0.2
    assert gaussian_decay(mu + sigma, mu, sigma) == pytest.approx(100.0 * math.exp(-0.5), rel=1e-4)
    assert gaussian_decay(mu + 2 * sigma, mu, sigma) == pytest.approx(100.0 * math.exp(-2.0), rel=1e-4)
    assert gaussian_decay(mu + 3 * sigma, mu, sigma) == pytest.approx(100.0 * math.exp(-4.5), rel=1e-4)


def test_gaussian_decay_edge_cases():
    """Verify non-positive sigma returns 0.0 and extreme deviations do not overflow."""
    assert gaussian_decay(1.0, 1.0, 0.0) == 0.0
    assert gaussian_decay(1.0, 1.0, -0.05) == 0.0
    # Extreme distance should gracefully decay to 0.0 without numerical overflow
    assert gaussian_decay(10000.0, 1.0, 0.1) == 0.0
    assert gaussian_decay(-10000.0, 1.0, 0.1) == 0.0


# ---------------------------------------------------------------------------
# 2. Metric Value Extraction Hardening
# ---------------------------------------------------------------------------


def test_extract_value_types():
    """Test value extraction across primitives, Metric instances, and dicts."""
    assert _extract_value(None) is None
    assert _extract_value(42) == 42.0
    assert _extract_value(3.14159) == pytest.approx(3.14159)
    assert _extract_value({"value": 0.333}) == pytest.approx(0.333)
    assert _extract_value({"value": "0.55"}) == pytest.approx(0.55)

    # Metric instance with .value
    m = Metric(
        value=1.618,
        unit="ratio",
        status="within",
        confidence="high",
    )
    assert _extract_value(m) == pytest.approx(1.618)


def test_extract_value_invalid_and_hostile_inputs():
    """Verify graceful handling of NaN, inf, invalid strings, and non-extractable types."""
    assert _extract_value(float("nan")) is None
    assert _extract_value(float("inf")) is None
    assert _extract_value(float("-inf")) is None
    assert _extract_value("not_a_number") is None
    assert _extract_value({"value": "corrupt_data"}) is None
    assert _extract_value({"value": None}) is None
    assert _extract_value({}) is None
    assert _extract_value([1, 2, 3]) is None
    assert _extract_value(object()) is None


# ---------------------------------------------------------------------------
# 3. Facial Harmony Subscores & Overall Score
# ---------------------------------------------------------------------------


def test_harmony_subscore_vertical_thirds_ideal():
    """Verify ideal vertical thirds (1/3, 1/3, 1/3, ratio 1.0) achieve 100.0."""
    metrics = {
        "F1_upper_third": 1.0 / 3.0,
        "F1_middle_third": 1.0 / 3.0,
        "F1_lower_third": 1.0 / 3.0,
        "F1_middle_lower_ratio": 1.0,
    }
    score = calculate_harmony_score(metrics)
    assert score.subscores.vertical_thirds == 100.0


def test_harmony_subscore_vertical_thirds_partial():
    """Verify partial vertical thirds metrics compute the mean across available ones."""
    # Only F1_lower_third provided: 1/3 -> 100.0
    score = calculate_harmony_score({"F1_lower_third": 1.0 / 3.0})
    assert score.subscores.vertical_thirds == 100.0

    # Middle lower ratio deviated by 1 sigma (0.08)
    # Target 1.0, value 1.08 -> score = 100 * exp(-0.5) ~ 60.7
    score_ratio = calculate_harmony_score({"F1_middle_lower_ratio": 1.08})
    assert score_ratio.subscores.vertical_thirds == pytest.approx(60.7, abs=0.1)


def test_harmony_subscore_transverse_fifths_ideal_and_partial():
    """Verify transverse fifths compute accurately for ideal and partial inputs."""
    ideal_fifths = {
        "F3_fifth_outer_right": 0.20,
        "F3_fifth_eye_right": 0.20,
        "F3_fifth_intercanthal": 0.20,
        "F3_fifth_eye_left": 0.20,
        "F3_fifth_outer_left": 0.20,
    }
    score = calculate_harmony_score(ideal_fifths)
    assert score.subscores.transverse_fifths == 100.0

    # Partial fifths: only 2 available
    partial_fifths = {
        "F3_fifth_intercanthal": 0.20,  # 100.0
        "F3_fifth_eye_right": 0.225,   # 1 sigma (0.025) away -> ~60.65
    }
    score_partial = calculate_harmony_score(partial_fifths)
    expected_mean = round((100.0 + 100.0 * math.exp(-0.5)) / 2.0, 1)
    assert score_partial.subscores.transverse_fifths == expected_mean


def test_harmony_subscore_lip_harmony_weights():
    """Verify lip harmony weighting: 0.6 * F8_lip_ratio + 0.4 * F2_lower_face_ratio."""
    # Both ideal
    score_ideal = calculate_harmony_score({
        "F8_lip_ratio": 1.618,
        "F2_lower_face_ratio": 0.50,
    })
    assert score_ideal.subscores.lip_harmony == 100.0

    # F8 at target (100.0), F2 at 1 sigma (0.50 + 0.06 = 0.56 -> ~60.65)
    score_weighted = calculate_harmony_score({
        "F8_lip_ratio": 1.618,
        "F2_lower_face_ratio": 0.56,
    })
    expected_lip = round(0.6 * 100.0 + 0.4 * (100.0 * math.exp(-0.5)), 1)
    assert score_weighted.subscores.lip_harmony == expected_lip

    # Only F8 present -> weight 1.0
    score_f8_only = calculate_harmony_score({"F8_lip_ratio": 1.618})
    assert score_f8_only.subscores.lip_harmony == 100.0

    # Only F2 present -> weight 1.0
    score_f2_only = calculate_harmony_score({"F2_lower_face_ratio": 0.50})
    assert score_f2_only.subscores.lip_harmony == 100.0


def test_harmony_subscore_symmetry():
    """Verify facial symmetry scoring across ratio, angular, and offset metrics."""
    ideal_sym = {
        "F11_asym_eye_width": 0.0,
        "F11_asym_outer_fifth": 0.0,
        "F11_asym_brow_apex_ratio": 0.0,
        "F11_asym_canthal_tilt": 0.0,
        "F11_asym_commissure_offset": 0.0,
        "F11_asym_brow_head_offset": 0.0,
        "F11_asym_brow_apex_offset": 0.0,
        "F11_asym_brow_tail_offset": 0.0,
    }
    score = calculate_harmony_score(ideal_sym)
    assert score.subscores.symmetry == 100.0

    # Test angular asymmetry: canthal tilt at 1 sigma (2.0 deg) -> ~60.7
    score_angular = calculate_harmony_score({"F11_asym_canthal_tilt": 2.0})
    assert score_angular.subscores.symmetry == pytest.approx(60.7, abs=0.1)


def test_calculate_harmony_score_overall_composition():
    """Verify overall score is the unweighted average of the 4 subscores (0.25 each)."""
    # Create metrics that yield known subscores:
    # vertical_thirds: 100.0
    # transverse_fifths: 100.0
    # lip_harmony: 100.0
    # symmetry: 100.0
    perfect_canon = {
        "F1_upper_third": 1.0 / 3.0,
        "F1_middle_third": 1.0 / 3.0,
        "F1_lower_third": 1.0 / 3.0,
        "F1_middle_lower_ratio": 1.0,
        "F3_fifth_outer_right": 0.20,
        "F3_fifth_eye_right": 0.20,
        "F3_fifth_intercanthal": 0.20,
        "F3_fifth_eye_left": 0.20,
        "F3_fifth_outer_left": 0.20,
        "F8_lip_ratio": 1.618,
        "F2_lower_face_ratio": 0.50,
        "F11_asym_canthal_tilt": 0.0,
    }
    score = calculate_harmony_score(perfect_canon)
    assert score.overall == 100.0
    assert score.subscores.vertical_thirds == 100.0
    assert score.subscores.transverse_fifths == 100.0
    assert score.subscores.lip_harmony == 100.0
    assert score.subscores.symmetry == 100.0

    # Only vertical thirds provided (100.0), other 3 subscores are 0.0
    # overall = 0.25 * 100 = 25.0
    single_subscore = calculate_harmony_score({"F1_lower_third": 1.0 / 3.0})
    assert single_subscore.subscores.vertical_thirds == 100.0
    assert single_subscore.subscores.transverse_fifths == 0.0
    assert single_subscore.subscores.lip_harmony == 0.0
    assert single_subscore.subscores.symmetry == 0.0
    assert single_subscore.overall == 25.0


def test_calculate_harmony_score_empty():
    """Ensure empty metrics dictionary produces valid 0.0 scores without exception."""
    score = calculate_harmony_score({})
    assert score.overall == 0.0
    assert score.subscores.vertical_thirds == 0.0
    assert score.subscores.transverse_fifths == 0.0
    assert score.subscores.lip_harmony == 0.0
    assert score.subscores.symmetry == 0.0


def test_calculate_harmony_score_synthetic_result():
    """Calculate harmony score on synthetic pipeline result and verify bounds."""
    r, _ = synthetic_result()
    score = calculate_harmony_score(r.metrics)
    assert isinstance(score, HarmonyScore)
    assert 0.0 <= score.overall <= 100.0
    assert 0.0 <= score.subscores.vertical_thirds <= 100.0
    assert 0.0 <= score.subscores.transverse_fifths <= 100.0
    assert 0.0 <= score.subscores.lip_harmony <= 100.0
    assert 0.0 <= score.subscores.symmetry <= 100.0


# ---------------------------------------------------------------------------
# 4. Procedure Recommendation Models & Properties
# ---------------------------------------------------------------------------


def test_procedure_recommendation_models():
    """Verify ProcedureRecommendation schema and bounds."""
    rec = ProcedureRecommendation(
        procedure="chin_augmentation",
        intensity=0.45,
        rationale="Lower facial third height is vertically deficient.",
        triggering_metrics=["F1_lower_third"],
    )
    assert rec.procedure == "chin_augmentation"
    assert rec.intensity == 0.45
    assert rec.recommended is True

    rec_zero = ProcedureRecommendation(
        procedure="rhinoplasty",
        intensity=0.0,
        rationale="Within reference limits",
        triggering_metrics=[],
    )
    assert rec_zero.intensity == 0.0
    assert rec_zero.recommended is False


def test_procedure_recommendation_bounds_validation():
    """Verify Pydantic model rejects intensities strictly outside [0.0, 1.0]."""
    with pytest.raises(Exception):
        ProcedureRecommendation(
            procedure="chin_augmentation",
            intensity=-0.1,
            rationale="Negative intensity invalid",
        )

    with pytest.raises(Exception):
        ProcedureRecommendation(
            procedure="rhinoplasty",
            intensity=1.05,
            rationale="Intensity > 1.0 invalid",
        )


# ---------------------------------------------------------------------------
# 5. Chin Augmentation Triggers & Mathematical Intensities
# ---------------------------------------------------------------------------


def test_chin_augmentation_canon_neutral():
    """Verify normal chin metrics produce 0.0 intensity and empty triggering_metrics."""
    recommender = ProcedureRecommender()
    normal_metrics = {
        "F1_lower_third": 0.3333,
        "F2_lower_face_ratio": 0.50,
        "F1_middle_lower_ratio": 1.00,
    }
    rec = recommender.evaluate_chin_augmentation(normal_metrics)
    assert rec.intensity == 0.0
    assert rec.recommended is False
    assert rec.triggering_metrics == []
    assert "within reference ranges" in rec.rationale


def test_chin_augmentation_frontal_triggers():
    """Verify individual frontal triggers for Chin Augmentation and exact intensity formulas:
    - F1_lower_third < 0.3167: (0.3333 - f1) / 0.05
    - F2_lower_face_ratio > 0.525: (f2 - 0.50) / 0.20
    - F1_middle_lower_ratio > 1.05: (ratio - 1.00) / 0.25
    """
    recommender = ProcedureRecommender()

    # 1. Deficient lower third: f1 = 0.30
    # Expected: (0.3333 - 0.30) / 0.05 = 0.0333 / 0.05 = 0.666 -> 0.67
    chin_f1 = recommender.evaluate_chin_augmentation({"F1_lower_third": 0.30})
    assert chin_f1.intensity == 0.67
    assert chin_f1.triggering_metrics == ["F1_lower_third"]
    assert "Lower facial third height" in chin_f1.rationale

    # 2. High lower face ratio: f2 = 0.58
    # Expected: (0.58 - 0.50) / 0.20 = 0.08 / 0.20 = 0.40
    chin_f2 = recommender.evaluate_chin_augmentation({"F2_lower_face_ratio": 0.58})
    assert chin_f2.intensity == 0.40
    assert chin_f2.triggering_metrics == ["F2_lower_face_ratio"]
    assert "Lower face ratio" in chin_f2.rationale

    # 3. High middle-to-lower ratio: f1_ratio = 1.15
    # Expected: (1.15 - 1.00) / 0.25 = 0.15 / 0.25 = 0.60
    chin_ratio = recommender.evaluate_chin_augmentation({"F1_middle_lower_ratio": 1.15})
    assert chin_ratio.intensity == 0.60
    assert chin_ratio.triggering_metrics == ["F1_middle_lower_ratio"]
    assert "Middle-to-lower third ratio" in chin_ratio.rationale


def test_chin_augmentation_profile_triggers():
    """Verify profile triggers for Chin Augmentation:
    - P4_eline_lower_lip_mm > -1.0: (p4_lower - (-1.0)) / 3.0
    - P4_eline_upper_lip_mm > -2.0: (p4_upper - (-2.0)) / 3.0
    """
    recommender = ProcedureRecommender()
    canon_frontal = {"F1_lower_third": 0.3333, "F2_lower_face_ratio": 0.50, "F1_middle_lower_ratio": 1.00}

    # Profile lower lip protruding past E-line: p4_lower = 0.5 mm
    # Expected: (0.5 - (-1.0)) / 3.0 = 1.5 / 3.0 = 0.50
    chin_prof_lower = recommender.evaluate_chin_augmentation(canon_frontal, {"P4_eline_lower_lip_mm": 0.5})
    assert chin_prof_lower.intensity == 0.50
    assert chin_prof_lower.triggering_metrics == ["P4_eline_lower_lip_mm"]
    assert "Ricketts' E-line" in chin_prof_lower.rationale

    # Profile upper lip: p4_upper = -0.5 mm
    # Expected: (-0.5 - (-2.0)) / 3.0 = 1.5 / 3.0 = 0.50
    chin_prof_upper = recommender.evaluate_chin_augmentation(canon_frontal, {"P4_eline_upper_lip_mm": -0.5})
    assert chin_prof_upper.intensity == 0.50
    assert chin_prof_upper.triggering_metrics == ["P4_eline_upper_lip_mm"]


# ---------------------------------------------------------------------------
# 6. Lip Augmentation Triggers & Mathematical Intensities
# ---------------------------------------------------------------------------


def test_lip_augmentation_canon_neutral():
    """Verify normal lip vermilion ratio produces 0.0 intensity."""
    recommender = ProcedureRecommender()
    normal_lips = {"F8_lip_ratio": 1.618}
    rec = recommender.evaluate_lip_augmentation(normal_lips)
    assert rec.intensity == 0.0
    assert rec.recommended is False
    assert rec.triggering_metrics == []
    assert "within reference ranges" in rec.rationale


def test_lip_augmentation_frontal_triggers():
    """Verify frontal triggers for Lip Augmentation:
    - Thin lower lip: F8 < 1.50 -> (1.618 - f8) / 0.60
    - Thin upper lip: F8 > 1.75 -> (f8 - 1.618) / 0.60
    """
    recommender = ProcedureRecommender()

    # Thin lower lip: f8 = 1.318
    # Expected: (1.618 - 1.318) / 0.60 = 0.30 / 0.60 = 0.50
    lip_thin_lower = recommender.evaluate_lip_augmentation({"F8_lip_ratio": 1.318})
    assert lip_thin_lower.intensity == 0.50
    assert lip_thin_lower.triggering_metrics == ["F8_lip_ratio"]
    assert "lower lip vermilion height is relatively thin" in lip_thin_lower.rationale

    # Thin upper lip: f8 = 1.918
    # Expected: (1.918 - 1.618) / 0.60 = 0.30 / 0.60 = 0.50
    lip_thin_upper = recommender.evaluate_lip_augmentation({"F8_lip_ratio": 1.918})
    assert lip_thin_upper.intensity == 0.50
    assert lip_thin_upper.triggering_metrics == ["F8_lip_ratio"]
    assert "upper lip vermilion height is relatively thin" in lip_thin_upper.rationale


def test_lip_augmentation_profile_triggers():
    """Verify profile retrusion triggers for Lip Augmentation:
    - P4_eline_upper_lip_mm < -4.0: (-4.0 - p4_upper) / 3.0
    - P4_eline_lower_lip_mm < -2.0: (-2.0 - p4_lower) / 3.0
    """
    recommender = ProcedureRecommender()
    normal_frontal = {"F8_lip_ratio": 1.618}

    # Upper lip retrusion: p4_upper = -5.5 mm
    # Expected: (-4.0 - (-5.5)) / 3.0 = 1.5 / 3.0 = 0.50
    lip_prof_upper = recommender.evaluate_lip_augmentation(normal_frontal, {"P4_eline_upper_lip_mm": -5.5})
    assert lip_prof_upper.intensity == 0.50
    assert lip_prof_upper.triggering_metrics == ["P4_eline_upper_lip_mm"]
    assert "behind Ricketts' aesthetic E-line plane" in lip_prof_upper.rationale

    # Lower lip retrusion: p4_lower = -3.5 mm
    # Expected: (-2.0 - (-3.5)) / 3.0 = 1.5 / 3.0 = 0.50
    lip_prof_lower = recommender.evaluate_lip_augmentation(normal_frontal, {"P4_eline_lower_lip_mm": -3.5})
    assert lip_prof_lower.intensity == 0.50
    assert lip_prof_lower.triggering_metrics == ["P4_eline_lower_lip_mm"]


# ---------------------------------------------------------------------------
# 7. Rhinoplasty Triggers & Mathematical Intensities
# ---------------------------------------------------------------------------


def test_rhinoplasty_canon_neutral():
    """Verify ideal nasal metrics produce 0.0 intensity."""
    recommender = ProcedureRecommender()
    normal_nose = {"F6_alar_icd_ratio": 1.00}
    rec = recommender.evaluate_rhinoplasty(normal_nose)
    assert rec.intensity == 0.0
    assert rec.recommended is False
    assert rec.triggering_metrics == []
    assert "within reference ranges" in rec.rationale


def test_rhinoplasty_frontal_triggers():
    """Verify frontal trigger for Rhinoplasty:
    - F6_alar_icd_ratio > 1.05: (f6 - 1.05) / 0.20
    """
    recommender = ProcedureRecommender()

    # Wide alar base: f6 = 1.15
    # Expected: (1.15 - 1.05) / 0.20 = 0.10 / 0.20 = 0.50
    rhino_f6 = recommender.evaluate_rhinoplasty({"F6_alar_icd_ratio": 1.15})
    assert rhino_f6.intensity == 0.50
    assert rhino_f6.triggering_metrics == ["F6_alar_icd_ratio"]
    assert "Alar base width" in rhino_f6.rationale


def test_rhinoplasty_profile_triggers():
    """Verify profile triggers for Rhinoplasty:
    - P2_nasolabial_angle < 95.0: (95.0 - p2) / 15.0
    - P3a_tip_projection_goode < 0.55: (0.55 - p3a) / 0.10
    - P1_nasofrontal_angle < 115.0: (115.0 - p1) / 15.0
    - P1_nasofrontal_angle > 130.0: (p1 - 130.0) / 15.0
    """
    recommender = ProcedureRecommender()
    normal_frontal = {"F6_alar_icd_ratio": 1.00}

    # 1. Acute nasolabial angle: p2 = 87.5 deg
    # Expected: (95.0 - 87.5) / 15.0 = 7.5 / 15.0 = 0.50
    rhino_p2 = recommender.evaluate_rhinoplasty(normal_frontal, {"P2_nasolabial_angle": 87.5})
    assert rhino_p2.intensity == 0.50
    assert rhino_p2.triggering_metrics == ["P2_nasolabial_angle"]
    assert "Nasolabial angle" in rhino_p2.rationale

    # 2. Deficient tip projection: p3a = 0.50
    # Expected: (0.55 - 0.50) / 0.10 = 0.05 / 0.10 = 0.50
    rhino_p3a = recommender.evaluate_rhinoplasty(normal_frontal, {"P3a_tip_projection_goode": 0.50})
    assert rhino_p3a.intensity == 0.50
    assert rhino_p3a.triggering_metrics == ["P3a_tip_projection_goode"]
    assert "Nasal tip projection ratio" in rhino_p3a.rationale

    # 3. Acute nasofrontal angle (deep radix): p1 = 107.5 deg
    # Expected: (115.0 - 107.5) / 15.0 = 7.5 / 15.0 = 0.50
    rhino_p1_acute = recommender.evaluate_rhinoplasty(normal_frontal, {"P1_nasofrontal_angle": 107.5})
    assert rhino_p1_acute.intensity == 0.50
    assert rhino_p1_acute.triggering_metrics == ["P1_nasofrontal_angle"]
    assert "deep nasal radix" in rhino_p1_acute.rationale

    # 4. Obtuse nasofrontal angle (flat forehead transition): p1 = 137.5 deg
    # Expected: (137.5 - 130.0) / 15.0 = 7.5 / 15.0 = 0.50
    rhino_p1_obtuse = recommender.evaluate_rhinoplasty(normal_frontal, {"P1_nasofrontal_angle": 137.5})
    assert rhino_p1_obtuse.intensity == 0.50
    assert rhino_p1_obtuse.triggering_metrics == ["P1_nasofrontal_angle"]
    assert "flattened nasal dorsum-forehead" in rhino_p1_obtuse.rationale


# ---------------------------------------------------------------------------
# 8. Bounds Enforcement & Extreme Values
# ---------------------------------------------------------------------------


def test_intensity_bounds_extreme_deviations():
    """Verify that extreme metric deviations are strictly capped at 1.0 (never exceed 1.0)."""
    recommender = ProcedureRecommender()

    # Extreme chin deficit
    chin_extreme = recommender.evaluate_chin_augmentation({"F1_lower_third": 0.05})
    assert chin_extreme.intensity == 1.0

    # Extreme lip thinning
    lip_extreme = recommender.evaluate_lip_augmentation({"F8_lip_ratio": 0.20})
    assert lip_extreme.intensity == 1.0

    # Extreme wide nose
    rhino_extreme = recommender.evaluate_rhinoplasty({"F6_alar_icd_ratio": 3.50})
    assert rhino_extreme.intensity == 1.0


def test_triggered_intensity_minimum_bound():
    """Verify that any triggered indication has an intensity of at least 0.01."""
    recommender = ProcedureRecommender()
    # Tiny trigger: F1_lower_third just below threshold 0.3167 (e.g. 0.3166)
    # Raw intensity is very small (~0.0001), but minimum triggered bound is 0.01
    chin_tiny = recommender.evaluate_chin_augmentation({"F1_lower_third": 0.3166})
    assert chin_tiny.intensity >= 0.01
    assert chin_tiny.intensity <= 1.0
    assert chin_tiny.recommended is True


# ---------------------------------------------------------------------------
# 9. Recommendation Dispatcher: Dual-View, Single-View & Filtering
# ---------------------------------------------------------------------------


def test_recommend_procedures_frontal_and_dual():
    """Verify recommend_procedures handles both frontal-only and dual-view inputs."""
    frontal_metrics = {
        "F1_lower_third": 0.29,    # chin indication
        "F6_alar_icd_ratio": 1.15,  # rhino indication
        "F8_lip_ratio": 1.618,      # normal
    }
    recs = recommend_procedures(frontal_metrics)
    assert len(recs) == 3
    rec_by_name = {r.procedure: r for r in recs}
    assert rec_by_name["chin_augmentation"].intensity > 0.0
    assert rec_by_name["rhinoplasty"].intensity > 0.0
    assert rec_by_name["lip_augmentation"].intensity == 0.0

    # only_recommended filter returns only procedures with intensity > 0.0
    active = recommend_procedures(frontal_metrics, only_recommended=True)
    assert len(active) == 2
    assert {r.procedure for r in active} == {"chin_augmentation", "rhinoplasty"}

    # Dual view adding profile retrusion for lips
    profile_metrics = {"P4_eline_upper_lip_mm": -5.0}
    recs_dual = recommend_procedures(frontal_metrics, profile_metrics)
    rec_dual_by_name = {r.procedure: r for r in recs_dual}
    assert rec_dual_by_name["lip_augmentation"].intensity > 0.0


def test_recommend_procedures_empty_inputs():
    """Verify recommend_procedures gracefully handles empty or None inputs."""
    recs = recommend_procedures({})
    assert len(recs) == 3
    for r in recs:
        assert r.intensity == 0.0
        assert r.recommended is False
        assert r.triggering_metrics == []

    recs_none = recommend_procedures(None, None)
    assert len(recs_none) == 3
    for r in recs_none:
        assert r.intensity == 0.0


# ---------------------------------------------------------------------------
# 10. Pipeline Integration: FrontalResult, Report & Overrides
# ---------------------------------------------------------------------------


def test_integration_with_frontal_result_and_report():
    """Verify procedure_recommendations and harmony are attached to FrontalResult and Report."""
    r, _ = synthetic_result()
    assert r.harmony is not None
    assert 0.0 <= r.harmony.overall <= 100.0
    assert r.procedure_recommendations is not None
    assert len(r.procedure_recommendations) == 3

    rep = Report(
        core_version="0.1.0",
        config_hash="sha256:test",
        status="ok",
        frontal=r,
    )
    assert rep.harmony is not None
    assert rep.harmony.overall == r.harmony.overall
    assert rep.procedure_recommendations is not None
    assert len(rep.procedure_recommendations) == 3


def test_json_roundtrip_preservation():
    """Verify FrontalResult and Report with harmony & recommendations survive JSON round-trip."""
    r, _ = synthetic_result()
    serialized = r.model_dump_json()
    deserialized = FrontalResult.model_validate_json(serialized)
    assert deserialized.harmony == r.harmony
    assert deserialized.procedure_recommendations == r.procedure_recommendations

    rep = Report(
        core_version="0.1.0",
        config_hash="sha256:test",
        status="ok",
        frontal=r,
    )
    rep_serialized = rep.model_dump_json()
    rep_deserialized = Report.model_validate_json(rep_serialized)
    assert rep_deserialized.harmony == rep.harmony
    assert rep_deserialized.procedure_recommendations == rep.procedure_recommendations


def test_apply_overrides_updates_procedures_and_harmony():
    """Verify FrontalAssembler.apply_overrides updates procedure_recommendations and harmony."""
    from facescan.core.assemble import FrontalAssembler

    r, _ = synthetic_result()
    asm = FrontalAssembler(synthetic_settings())

    # Adjust menton vertically to alter lower third height
    new_y = float(r.landmarks["menton"].y + 20)
    adjusted = asm.apply_overrides(
        r,
        {"menton": {"x": float(r.landmarks["menton"].x), "y": new_y, "source": "clinician"}},
    )
    assert adjusted.harmony is not None
    assert adjusted.procedure_recommendations is not None
    assert len(adjusted.procedure_recommendations) == 3
    # Check that new harmony score was computed for adjusted geometry
    assert isinstance(adjusted.harmony, HarmonyScore)
    assert 0.0 <= adjusted.harmony.overall <= 100.0
