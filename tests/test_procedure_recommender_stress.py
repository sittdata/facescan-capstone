"""Empirical Challenger stress tests for facescan/core/procedure_recommender.py.

Stress-tests canon ideals, individual and multi-metric triggers, strict [0.0, 1.0] bounds,
single-view vs dual-view, and hostile/edge-case inputs.
"""

import json
import math
import pytest

from facescan.core.procedure_recommender import ProcedureRecommender, recommend_procedures
from facescan.core.schema import (
    FrontalResult,
    Metric,
    ProcedureRecommendation,
    ProfileResult,
    Report,
    SubjectInfo,
)
from helpers import synthetic_result


# ---------------------------------------------------------------------------
# 1. Canon Ideals: verify 0.0 intensity for all procedures
# ---------------------------------------------------------------------------


def test_canon_ideals_zero_intensity():
    """Verify that a subject with ideal canonical measurements receives exactly 0.0 intensity."""
    canon_frontal = {
        "F1_lower_third": 0.3333,
        "F2_lower_face_ratio": 0.50,
        "F1_middle_lower_ratio": 1.00,
        "F6_alar_icd_ratio": 1.00,
        "F8_lip_ratio": 1.618,
    }
    canon_profile = {
        "P1_nasofrontal_angle": 122.5,
        "P2_nasolabial_angle": 100.0,
        "P3a_tip_projection_goode": 0.575,
        "P4_eline_upper_lip_mm": -3.0,
        "P4_eline_lower_lip_mm": -1.5,
    }

    recs = recommend_procedures(frontal=canon_frontal, profile=canon_profile)
    assert len(recs) == 3

    for rec in recs:
        assert rec.intensity == 0.0, f"Expected 0.0 intensity for {rec.procedure}, got {rec.intensity}"
        assert rec.recommended is False
        assert rec.triggering_metrics == []
        assert len(rec.rationale) > 0
        assert "within reference ranges" in rec.rationale

    # only_recommended should be completely empty for canonical face
    active = recommend_procedures(frontal=canon_frontal, profile=canon_profile, only_recommended=True)
    assert len(active) == 0


def test_canon_tolerance_threshold_boundaries():
    """Test values exactly on the non-triggering boundary thresholds."""
    boundary_frontal = {
        "F1_lower_third": 0.3167,       # threshold is < 0.3167
        "F2_lower_face_ratio": 0.525,    # threshold is > 0.525
        "F1_middle_lower_ratio": 1.05,   # threshold is > 1.05
        "F6_alar_icd_ratio": 1.05,       # threshold is > 1.05
        "F8_lip_ratio": 1.50,            # threshold is < 1.50 or > 1.75
    }
    boundary_profile = {
        "P1_nasofrontal_angle": 115.0,   # threshold is < 115.0 or > 130.0
        "P2_nasolabial_angle": 95.0,     # threshold is < 95.0
        "P3a_tip_projection_goode": 0.55,# threshold is < 0.55
        "P4_eline_upper_lip_mm": -2.0,   # chin: > -2.0; lip: < -4.0
        "P4_eline_lower_lip_mm": -1.0,   # chin: > -1.0; lip: < -2.0
    }

    recs = recommend_procedures(boundary_frontal, boundary_profile)
    for rec in recs:
        assert rec.intensity == 0.0
        assert rec.triggering_metrics == []


# ---------------------------------------------------------------------------
# 2. Chin Augmentation Triggers
# ---------------------------------------------------------------------------


def test_chin_augmentation_triggers_individually():
    """Verify each individual chin trigger fires correctly with expected metric logged."""
    rec = ProcedureRecommender()

    # Trigger 1: F1_lower_third deficient
    r1 = rec.evaluate_chin_augmentation({"F1_lower_third": 0.3166})
    assert r1.intensity > 0.0
    assert r1.triggering_metrics == ["F1_lower_third"]

    # Trigger 2: F2_lower_face_ratio high
    r2 = rec.evaluate_chin_augmentation({"F2_lower_face_ratio": 0.526})
    assert r2.intensity > 0.0
    assert r2.triggering_metrics == ["F2_lower_face_ratio"]

    # Trigger 3: F1_middle_lower_ratio high
    r3 = rec.evaluate_chin_augmentation({"F1_middle_lower_ratio": 1.06})
    assert r3.intensity > 0.0
    assert r3.triggering_metrics == ["F1_middle_lower_ratio"]

    # Trigger 4: Profile P4 lower lip anterior to E-line
    r4 = rec.evaluate_chin_augmentation({}, {"P4_eline_lower_lip_mm": -0.9})
    assert r4.intensity > 0.0
    assert r4.triggering_metrics == ["P4_eline_lower_lip_mm"]

    # Trigger 5: Profile P4 upper lip anterior to E-line
    r5 = rec.evaluate_chin_augmentation({}, {"P4_eline_upper_lip_mm": -1.9})
    assert r5.intensity > 0.0
    assert r5.triggering_metrics == ["P4_eline_upper_lip_mm"]


def test_chin_augmentation_multi_trigger_aggregation():
    """Verify all triggering metrics are aggregated and intensity is max of components."""
    rec = ProcedureRecommender()
    frontal = {
        "F1_lower_third": 0.28,      # (0.3333 - 0.28)/0.05 = 1.066 -> capped 1.0
        "F2_lower_face_ratio": 0.58,  # (0.58 - 0.50)/0.20 = 0.40
        "F1_middle_lower_ratio": 1.15,# (1.15 - 1.00)/0.25 = 0.60
    }
    profile = {
        "P4_eline_lower_lip_mm": 0.5, # (0.5 - (-1.0))/3.0 = 0.50
        "P4_eline_upper_lip_mm": -0.5,# (-0.5 - (-2.0))/3.0 = 0.50
    }
    res = rec.evaluate_chin_augmentation(frontal, profile)
    assert res.intensity == 1.0
    assert set(res.triggering_metrics) == {
        "F1_lower_third",
        "F2_lower_face_ratio",
        "F1_middle_lower_ratio",
        "P4_eline_lower_lip_mm",
        "P4_eline_upper_lip_mm",
    }
    assert "Lower facial third height" in res.rationale
    assert "Lower face ratio" in res.rationale
    assert "Middle-to-lower third ratio" in res.rationale
    assert "Ricketts' E-line" in res.rationale


def test_chin_augmentation_opposing_deviations_do_not_trigger():
    """Verify elongated chin or prognathic chin does NOT trigger augmentation."""
    rec = ProcedureRecommender()
    opposing_frontal = {
        "F1_lower_third": 0.40,       # long lower third
        "F2_lower_face_ratio": 0.40,   # long chin relative to upper lip
        "F1_middle_lower_ratio": 0.85, # short midface / long lower face
    }
    opposing_profile = {
        "P4_eline_lower_lip_mm": -3.0, # prominent chin / retruded lower lip
        "P4_eline_upper_lip_mm": -4.0, # retruded upper lip
    }
    res = rec.evaluate_chin_augmentation(opposing_frontal, opposing_profile)
    assert res.intensity == 0.0
    assert res.triggering_metrics == []


# ---------------------------------------------------------------------------
# 3. Lip Augmentation Triggers
# ---------------------------------------------------------------------------


def test_lip_augmentation_triggers_individually():
    """Verify lip triggers fire for thin lower lip, thin upper lip, and E-line retrusion."""
    rec = ProcedureRecommender()

    # Trigger 1: Thin lower lip (F8 < 1.50)
    r1 = rec.evaluate_lip_augmentation({"F8_lip_ratio": 1.40})
    assert r1.intensity > 0.0
    assert r1.triggering_metrics == ["F8_lip_ratio"]
    assert "lower lip vermilion height is relatively thin" in r1.rationale

    # Trigger 2: Thin upper lip (F8 > 1.75)
    r2 = rec.evaluate_lip_augmentation({"F8_lip_ratio": 1.85})
    assert r2.intensity > 0.0
    assert r2.triggering_metrics == ["F8_lip_ratio"]
    assert "upper lip vermilion height is relatively thin" in r2.rationale

    # Trigger 3: Profile upper lip retrusion (P4_upper < -4.0)
    r3 = rec.evaluate_lip_augmentation({}, {"P4_eline_upper_lip_mm": -4.5})
    assert r3.intensity > 0.0
    assert r3.triggering_metrics == ["P4_eline_upper_lip_mm"]

    # Trigger 4: Profile lower lip retrusion (P4_lower < -2.0)
    r4 = rec.evaluate_lip_augmentation({}, {"P4_eline_lower_lip_mm": -2.5})
    assert r4.intensity > 0.0
    assert r4.triggering_metrics == ["P4_eline_lower_lip_mm"]


def test_lip_augmentation_protrusive_lips_do_not_trigger():
    """Verify that protrusive/full lips do not trigger lip augmentation."""
    rec = ProcedureRecommender()
    protrusive_profile = {
        "P4_eline_upper_lip_mm": 0.0,  # forward of E-line
        "P4_eline_lower_lip_mm": 1.0,  # forward of E-line
    }
    res = rec.evaluate_lip_augmentation({"F8_lip_ratio": 1.618}, protrusive_profile)
    assert res.intensity == 0.0
    assert res.triggering_metrics == []


# ---------------------------------------------------------------------------
# 4. Rhinoplasty Triggers
# ---------------------------------------------------------------------------


def test_rhinoplasty_triggers_individually():
    """Verify rhinoplasty triggers fire for wide alar, acute nasolabial, underprojection, and nasofrontal departures."""
    rec = ProcedureRecommender()

    # Trigger 1: Wide alar base (F6 > 1.05)
    r1 = rec.evaluate_rhinoplasty({"F6_alar_icd_ratio": 1.15})
    assert r1.intensity > 0.0
    assert r1.triggering_metrics == ["F6_alar_icd_ratio"]

    # Trigger 2: Drooping tip / acute nasolabial angle (P2 < 95.0)
    r2 = rec.evaluate_rhinoplasty({}, {"P2_nasolabial_angle": 90.0})
    assert r2.intensity > 0.0
    assert r2.triggering_metrics == ["P2_nasolabial_angle"]
    assert "downward nasal tip rotation" in r2.rationale

    # Trigger 3: Goode underprojection (P3a < 0.55)
    r3 = rec.evaluate_rhinoplasty({}, {"P3a_tip_projection_goode": 0.48})
    assert r3.intensity > 0.0
    assert r3.triggering_metrics == ["P3a_tip_projection_goode"]
    assert "Nasal tip projection ratio" in r3.rationale

    # Trigger 4: Acute nasofrontal angle (P1 < 115.0)
    r4 = rec.evaluate_rhinoplasty({}, {"P1_nasofrontal_angle": 110.0})
    assert r4.intensity > 0.0
    assert r4.triggering_metrics == ["P1_nasofrontal_angle"]
    assert "deep nasal radix transition" in r4.rationale

    # Trigger 5: Obtuse nasofrontal angle (P1 > 130.0)
    r5 = rec.evaluate_rhinoplasty({}, {"P1_nasofrontal_angle": 135.0})
    assert r5.intensity > 0.0
    assert r5.triggering_metrics == ["P1_nasofrontal_angle"]
    assert "flattened nasal dorsum-forehead angle" in r5.rationale


# ---------------------------------------------------------------------------
# 5. Strict Bounds [0.0, 1.0] under extreme and adversarial inputs
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "frontal,profile",
    [
        (
            {"F1_lower_third": 0.001, "F2_lower_face_ratio": 99.0, "F1_middle_lower_ratio": 99.0},
            {"P4_eline_upper_lip_mm": 100.0, "P4_eline_lower_lip_mm": 100.0},
        ),
        (
            {"F8_lip_ratio": 0.001},
            {"P4_eline_upper_lip_mm": -100.0, "P4_eline_lower_lip_mm": -100.0},
        ),
        (
            {"F8_lip_ratio": 100.0},
            {},
        ),
        (
            {"F6_alar_icd_ratio": 50.0},
            {
                "P1_nasofrontal_angle": 10.0,
                "P2_nasolabial_angle": 10.0,
                "P3a_tip_projection_goode": 0.001,
            },
        ),
        (
            {"F6_alar_icd_ratio": 50.0},
            {
                "P1_nasofrontal_angle": 175.0,
            },
        ),
    ],
)
def test_intensity_strictly_bounded_at_extreme_values(frontal, profile):
    """Ensure intensity never exceeds 1.0 even under massive anatomical deviations."""
    recs = recommend_procedures(frontal=frontal, profile=profile)
    for rec in recs:
        assert 0.0 <= rec.intensity <= 1.0, f"Intensity {rec.intensity} violated [0.0, 1.0] bound!"
        assert round(rec.intensity, 2) == rec.intensity, f"Intensity {rec.intensity} was not rounded to 2 decimals"


def test_intensity_tiny_deviation_floor():
    """Verify that any non-zero intensity is at least 0.01."""
    rec = ProcedureRecommender()
    # Deviation just barely across threshold
    res = rec.evaluate_chin_augmentation({"F1_lower_third": 0.316699})
    assert res.intensity >= 0.01
    assert res.intensity <= 1.0


# ---------------------------------------------------------------------------
# 6. Single-View vs Dual-View Handling
# ---------------------------------------------------------------------------


def test_single_view_frontal_only_graceful():
    """Verify single-view frontal input evaluates without error and does not touch profile."""
    frontal_only = {"F1_lower_third": 0.30}
    recs = recommend_procedures(frontal=frontal_only, profile=None)
    assert len(recs) == 3
    chin = next(r for r in recs if r.procedure == "chin_augmentation")
    assert chin.intensity > 0.0
    assert "F1_lower_third" in chin.triggering_metrics
    # Profile metrics should not appear in triggers
    assert not any(m.startswith("P") for m in chin.triggering_metrics)


def test_single_view_profile_only_graceful():
    """Verify single-view profile input evaluates without error when frontal is absent."""
    profile_only = {"P2_nasolabial_angle": 85.0}
    recs = recommend_procedures(frontal=None, profile=profile_only)
    assert len(recs) == 3
    rhino = next(r for r in recs if r.procedure == "rhinoplasty")
    assert rhino.intensity > 0.0
    assert rhino.triggering_metrics == ["P2_nasolabial_angle"]


def test_dual_view_pydantic_results_and_reports():
    """Verify schema integration with FrontalResult, ProfileResult, and Report."""
    fr, _ = synthetic_result()
    pr = ProfileResult(
        core_version="0.1.0",
        config_hash="sha256:test",
        status="ok",
        subject=fr.subject,
        facing="right",
        metrics={
            "P2_nasolabial_angle": Metric(
                value=85.0,
                unit="deg",
                status="below",
                confidence="high",
            )
        },
    )

    # FrontalResult alone
    recs_fr = recommend_procedures(fr)
    assert len(recs_fr) == 3
    assert all(isinstance(r, ProcedureRecommendation) for r in recs_fr)

    # FrontalResult + ProfileResult
    recs_dual = recommend_procedures(frontal=fr, profile=pr)
    assert len(recs_dual) == 3

    # Report object containing both
    rep = Report(
        core_version="0.1.0",
        config_hash="sha256:test",
        status="ok",
        frontal=fr,
        profile=pr,
    )
    recs_rep = recommend_procedures(rep)
    assert len(recs_rep) == 3

    # Report automatically defaulted recommendations
    assert rep.procedure_recommendations is not None
    assert len(rep.procedure_recommendations) == 3


# ---------------------------------------------------------------------------
# 7. Hostile, Malformed, and Robustness Edge Cases
# ---------------------------------------------------------------------------


def test_robustness_against_nan_inf_bad_types():
    """Empirically test that NaN, Inf, strings, Booleans, and None do not cause crashes."""
    bad_frontal = {
        "F1_lower_third": float("nan"),
        "F2_lower_face_ratio": float("inf"),
        "F1_middle_lower_ratio": float("-inf"),
        "F6_alar_icd_ratio": "not_a_float",
        "F8_lip_ratio": None,
        "unexpected_key": [1, 2, 3],
    }
    bad_profile = {
        "P1_nasofrontal_angle": {"value": float("nan")},
        "P2_nasolabial_angle": {"value": "corrupted"},
        "P3a_tip_projection_goode": None,
        "P4_eline_upper_lip_mm": object(),
    }

    recs = recommend_procedures(bad_frontal, bad_profile)
    assert len(recs) == 3
    for r in recs:
        assert r.intensity == 0.0
        assert r.triggering_metrics == []


def test_metric_object_inputs():
    """Verify recommender handles dict of Metric pydantic objects seamlessly."""
    frontal_metric_objs = {
        "F1_lower_third": Metric(
            value=0.29,
            unit="ratio",
            status="below",
            confidence="high",
        ),
        "F8_lip_ratio": Metric(
            value=1.618,
            unit="ratio",
            status="within",
            confidence="high",
        ),
    }
    recs = recommend_procedures(frontal_metric_objs)
    chin = next(r for r in recs if r.procedure == "chin_augmentation")
    assert chin.intensity > 0.0
    assert "F1_lower_third" in chin.triggering_metrics


def test_pydantic_json_roundtrip_stability():
    """Verify ProcedureRecommendation models survive strict JSON serialization roundtrip."""
    recs = recommend_procedures({"F1_lower_third": 0.28, "F6_alar_icd_ratio": 1.20})
    for rec in recs:
        dumped = rec.model_dump_json()
        restored = ProcedureRecommendation.model_validate_json(dumped)
        assert restored == rec
        parsed_dict = json.loads(dumped)
        assert 0.0 <= parsed_dict["intensity"] <= 1.0
        assert isinstance(parsed_dict["triggering_metrics"], list)


def test_no_prohibited_promotional_words_in_rationales():
    """Verify rationales maintain medical neutral tone without commercial or promotional hype."""
    banned_words = [
        "ugly",
        "flawless",
        "perfect",
        "beautify",
        "anti-aging",
        "defective",
        "deformed",
        "fix",
        "cure",
        "guarantee",
    ]
    # Test across multiple active triggering conditions
    deviations = {
        "F1_lower_third": 0.25,
        "F2_lower_face_ratio": 0.65,
        "F1_middle_lower_ratio": 1.30,
        "F6_alar_icd_ratio": 1.25,
        "F8_lip_ratio": 1.20,
    }
    profile_deviations = {
        "P1_nasofrontal_angle": 105.0,
        "P2_nasolabial_angle": 80.0,
        "P3a_tip_projection_goode": 0.45,
        "P4_eline_upper_lip_mm": -6.0,
        "P4_eline_lower_lip_mm": -4.0,
    }
    recs = recommend_procedures(deviations, profile_deviations)
    for r in recs:
        text = r.rationale.lower()
        for banned in banned_words:
            assert banned not in text, f"Banned word '{banned}' found in rationale: {r.rationale}"
