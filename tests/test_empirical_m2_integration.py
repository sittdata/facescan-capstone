"""Empirical Challenger integration and stress test suite for Milestone M2.

Stress-tests:
1. FrontalResult & Report schema instantiation with procedure_recommendations.
2. JSON round-trip validation (model_dump_json / model_validate_json).
3. Explicit overrides vs auto-defaults.
4. Dynamic recalculation of procedure_recommendations under landmark overrides.
5. user_view (_result_view and _report_view) output shapes, localization, least-disclosure, and promotional compliance.
6. Adversarial boundaries, extreme values, NaN/Inf rejection, and schema immutability.
"""

import json
import math
import pytest
from pydantic import ValidationError

from facescan.core.assemble import FrontalAssembler
from facescan.core.config import DEFAULT_CONFIG_DIR, load_locales
from facescan.core.locale import Strings, _report_view, _result_view, user_view
from facescan.core.procedure_recommender import ProcedureRecommender, recommend_procedures
from facescan.core.schema import (
    FrontalResult,
    HarmonyScore,
    Metric,
    Override,
    Point2D,
    ProcedureRecommendation,
    ProfileResult,
    Report,
)
from helpers import synthetic_result, synthetic_settings


# ---------------------------------------------------------------------------
# 1. Schema Instantiation and Field Population
# ---------------------------------------------------------------------------


def test_procedure_recommendation_schema_invariants():
    """Verify strict Pydantic model invariants on ProcedureRecommendation."""
    rec = ProcedureRecommendation(
        procedure="chin_augmentation",
        intensity=0.5,
        rationale="Deficient chin projection",
        triggering_metrics=["F1_lower_third"],
    )
    assert rec.procedure == "chin_augmentation"
    assert rec.intensity == 0.5
    assert rec.recommended is True

    # Test frozen model
    with pytest.raises(ValidationError):
        rec.intensity = 0.8  # cannot mutate frozen instance

    # Test bounds [0.0, 1.0]
    with pytest.raises(ValidationError):
        ProcedureRecommendation(procedure="test", intensity=-0.01, rationale="x")
    with pytest.raises(ValidationError):
        ProcedureRecommendation(procedure="test", intensity=1.01, rationale="x")

    # Test NaN / Inf forbidden (allow_inf_nan=False)
    with pytest.raises(ValidationError):
        ProcedureRecommendation(procedure="test", intensity=float("nan"), rationale="x")
    with pytest.raises(ValidationError):
        ProcedureRecommendation(procedure="test", intensity=float("inf"), rationale="x")

    # Test extra attributes forbidden
    with pytest.raises(ValidationError):
        ProcedureRecommendation(procedure="test", intensity=0.5, rationale="x", extra_field="bad")


def test_frontal_result_auto_populates_recommendations():
    """Ensure FrontalResult automatically computes procedure_recommendations if omitted."""
    r, _ = synthetic_result()
    assert r.procedure_recommendations is not None
    assert len(r.procedure_recommendations) == 3
    procs = {p.procedure for p in r.procedure_recommendations}
    assert procs == {"chin_augmentation", "lip_augmentation", "rhinoplasty"}


def test_frontal_result_explicit_recommendations_preserved():
    """Ensure explicit procedure_recommendations are not overwritten by the validator."""
    custom_recs = [
        ProcedureRecommendation(procedure="chin_augmentation", intensity=0.99, rationale="custom", triggering_metrics=["custom"])
    ]
    r, _ = synthetic_result()
    data = dict(r)
    data["procedure_recommendations"] = custom_recs
    custom_r = FrontalResult(**data)
    assert len(custom_r.procedure_recommendations) == 1
    assert custom_r.procedure_recommendations[0].intensity == 0.99
    assert custom_r.procedure_recommendations[0].rationale == "custom"


def test_report_auto_populates_from_frontal_and_profile():
    """Verify Report combines frontal and profile recommendations."""
    r, _ = synthetic_result()
    prof = ProfileResult(
        core_version="0.1.0",
        config_hash="sha256:test",
        status="ok",
        subject=r.subject,
        facing="left",
        metrics={
            "P4_eline_upper_lip_mm": Metric(
                value=-5.5, unit="mm", status="below", confidence="high"
            )
        },
    )
    rep = Report(
        core_version="0.1.0",
        config_hash="sha256:test",
        status="ok",
        frontal=r,
        profile=prof,
    )
    assert rep.procedure_recommendations is not None
    rec_by_proc = {p.procedure: p for p in rep.procedure_recommendations}
    # Retruded upper lip in profile should trigger lip_augmentation in Report
    assert "P4_eline_upper_lip_mm" in rec_by_proc["lip_augmentation"].triggering_metrics
    assert rec_by_proc["lip_augmentation"].intensity > 0.0


def test_report_with_null_frontal_and_profile():
    """Verify Report handles frontal=None and profile=None without error."""
    rep = Report(
        core_version="0.1.0",
        config_hash="sha256:test",
        status="no_face",
        frontal=None,
        profile=None,
    )
    assert rep.procedure_recommendations is None
    assert rep.harmony is None


# ---------------------------------------------------------------------------
# 2. JSON Round-Trip Validation
# ---------------------------------------------------------------------------


def test_frontal_result_json_round_trip():
    """Verify exact lossless JSON round-trip for FrontalResult with procedure_recommendations."""
    r, _ = synthetic_result()
    json_str = r.model_dump_json()
    validated = FrontalResult.model_validate_json(json_str)
    assert validated == r
    assert validated.procedure_recommendations == r.procedure_recommendations


def test_report_json_round_trip():
    """Verify exact lossless JSON round-trip for Report with procedure_recommendations."""
    r, _ = synthetic_result()
    prof = ProfileResult(
        core_version="0.1.0",
        config_hash="sha256:test",
        status="ok",
        subject=r.subject,
        facing="left",
        contour=[Point2D(x=10.0, y=20.0)],
        metrics={
            "P2_nasolabial_angle": Metric(
                value=85.0, unit="deg", status="below", confidence="high"
            )
        },
    )
    rep = Report(
        core_version="0.1.0",
        config_hash="sha256:test",
        status="ok",
        frontal=r,
        profile=prof,
    )
    json_str = rep.model_dump_json()
    validated = Report.model_validate_json(json_str)
    assert validated == rep
    assert validated.procedure_recommendations == rep.procedure_recommendations


# ---------------------------------------------------------------------------
# 3. Dynamic Recalculation on Landmark Overrides
# ---------------------------------------------------------------------------


def test_menton_override_modifies_chin_recommendation():
    """Test that adjusting menton vertically alters F1 and F2, updating chin_augmentation."""
    r, _ = synthetic_result()
    asm = FrontalAssembler(synthetic_settings())

    orig_chin = next(p for p in r.procedure_recommendations if p.procedure == "chin_augmentation")

    # Shift menton up by 40 pixels (making lower third shorter -> stronger chin indication)
    menton = r.landmarks["menton"]
    overrides = {
        "menton": Override(x=menton.x, y=menton.y - 40.0, source="clinician")
    }
    updated = asm.apply_overrides(r, overrides)

    assert updated.procedure_recommendations is not None
    new_chin = next(p for p in updated.procedure_recommendations if p.procedure == "chin_augmentation")

    # F1_lower_third should have decreased
    assert updated.metrics["F1_lower_third"].value < r.metrics["F1_lower_third"].value
    # Intensity should have increased or changed
    assert new_chin.intensity > orig_chin.intensity
    assert "F1_lower_third" in new_chin.triggering_metrics


def test_alar_override_modifies_rhinoplasty_recommendation():
    """Test that adjusting alare points widens nose and triggers rhinoplasty."""
    r, _ = synthetic_result()
    asm = FrontalAssembler(synthetic_settings())

    orig_rhino = next(p for p in r.procedure_recommendations if p.procedure == "rhinoplasty")

    # Widen alare points significantly (left is +x, right is -x)
    al_l = r.landmarks["alare_left"]
    al_r = r.landmarks["alare_right"]
    overrides = {
        "alare_left": Override(x=al_l.x + 25.0, y=al_l.y, source="clinician"),
        "alare_right": Override(x=al_r.x - 25.0, y=al_r.y, source="clinician"),
    }
    updated = asm.apply_overrides(r, overrides)

    new_rhino = next(p for p in updated.procedure_recommendations if p.procedure == "rhinoplasty")
    assert updated.metrics["F6_alar_icd_ratio"].value > r.metrics["F6_alar_icd_ratio"].value
    assert new_rhino.intensity > orig_rhino.intensity
    assert "F6_alar_icd_ratio" in new_rhino.triggering_metrics


# ---------------------------------------------------------------------------
# 4. user_view, Localization & Promotional Compliance
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("locale", ["en", "th"])
def test_user_view_contains_procedure_recommendations(locale):
    """Verify user_view includes serialized procedure_recommendations."""
    r, _ = synthetic_result()
    view = user_view(r, locale=locale)
    assert "procedure_recommendations" in view
    recs = view["procedure_recommendations"]
    assert isinstance(recs, list)
    assert len(recs) == 3
    for rec in recs:
        assert "procedure" in rec
        assert "intensity" in rec
        assert "rationale" in rec
        assert "triggering_metrics" in rec
        assert 0.0 <= rec["intensity"] <= 1.0


def test_user_view_least_disclosure_on_failed_capture():
    """Ensure failed captures do not expose procedure recommendations to consumers."""
    r, _ = synthetic_result(status="quality_failed")
    view = user_view(r, locale="en")
    assert view["status"] == "quality_failed"
    assert "procedure_recommendations" not in view
    assert "harmony" not in view
    assert "metrics" not in view


def test_procedure_rationales_have_no_banned_or_promotional_terms():
    """Stress test rationales across generated recommendations for banned/promotional terms."""
    from test_schema_views import BANNED, PROMOTIONAL

    recommender = ProcedureRecommender()

    # Generate recommendations across a wide sweep of frontal and profile metrics
    test_frontal = {
        "F1_lower_third": 0.20,
        "F2_lower_face_ratio": 0.65,
        "F1_middle_lower_ratio": 1.40,
        "F6_alar_icd_ratio": 1.35,
        "F8_lip_ratio": 1.10,
    }
    test_profile = {
        "P1_nasofrontal_angle": 105.0,
        "P2_nasolabial_angle": 80.0,
        "P3a_tip_projection_goode": 0.40,
        "P4_eline_upper_lip_mm": -7.0,
        "P4_eline_lower_lip_mm": 2.0,
    }

    recs = recommender.recommend(test_frontal, test_profile)
    for rec in recs:
        rationale_lower = rec.rationale.lower()
        for term in BANNED["en"] + PROMOTIONAL["en"]:
            assert term not in rationale_lower, f"Rationale contains prohibited term {term!r}: {rec.rationale}"


# ---------------------------------------------------------------------------
# 5. Adversarial and Edge-Case Stress Testing
# ---------------------------------------------------------------------------


def test_adversarial_metric_values():
    """Stress-test ProcedureRecommender against extreme, adversarial, and malformed metric values."""
    recommender = ProcedureRecommender()

    # Extreme values
    extreme_metrics = {
        "F1_lower_third": -999999.0,
        "F2_lower_face_ratio": 999999.0,
        "F1_middle_lower_ratio": -100.0,
        "F6_alar_icd_ratio": 500.0,
        "F8_lip_ratio": 0.0001,
        "P4_eline_upper_lip_mm": -10000.0,
        "P4_eline_lower_lip_mm": 10000.0,
        "P2_nasolabial_angle": -50.0,
        "P3a_tip_projection_goode": -1.0,
        "P1_nasofrontal_angle": 999.0,
    }

    recs = recommender.recommend(extreme_metrics, extreme_metrics)
    assert len(recs) == 3
    for r in recs:
        # Intensity must strictly clamp to [0.0, 1.0] despite extreme math
        assert 0.0 <= r.intensity <= 1.0, f"Intensity {r.intensity} out of bounds for {r.procedure}"
        assert not math.isnan(r.intensity)
        assert not math.isinf(r.intensity)

    # Corrupted / non-numeric types
    corrupted_metrics = {
        "F1_lower_third": "severe_retrusion",
        "F2_lower_face_ratio": None,
        "F6_alar_icd_ratio": {"nested": "dict"},
        "F8_lip_ratio": [1, 2, 3],
        "P4_eline_upper_lip_mm": float("nan"),
        "P4_eline_lower_lip_mm": float("inf"),
    }
    recs_corrupted = recommender.recommend(corrupted_metrics, corrupted_metrics)
    assert len(recs_corrupted) == 3
    for r in recs_corrupted:
        assert r.intensity == 0.0
        assert r.triggering_metrics == []
