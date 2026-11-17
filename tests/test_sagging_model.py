"""Comprehensive Unit & Integration Tests for Facial Sagging & Laxity Model.

Tests:
1. MediaPipe 478 Landmark Feature Extraction & Scale Invariance.
2. ONNX Runtime Inference & Numerical Stability.
3. Pydantic Schema Validation & JSON Round-Trip Invariance.
4. Pipeline & FrontalResult Integration.
5. Clinical Procedure Recommender Mapping for Sagging & Laxity Treatments.
6. Facemesh Utility Module Interface.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import numpy as np
import pytest

from facescan.core.facemesh import (
    FEATURE_NAMES,
    IDX_GONION_L,
    IDX_GONION_R,
    IDX_MENTON,
    IDX_MESH_TOP,
    IDX_ZYGION_L,
    IDX_ZYGION_R,
    JAWLINE_LEFT,
    JAWLINE_RIGHT,
    TIER_NAMES,
    analyze_facemesh_sagging,
    extract_landmarks_points,
    extract_sagging_features,
    predict_sagging,
)
from facescan.core.locale import user_view
from facescan.core.procedure_recommender import (
    ProcedureRecommendation,
    ProcedureRecommender,
    recommend_procedures,
    recommend_sagging_procedures,
)
from facescan.core.sagging_model import get_sagging_session
from facescan.core.schema import (
    FacialSaggingResultModel,
    FrontalResult,
    Report,
    SubjectInfo,
)


@pytest.fixture
def mock_landmarks() -> np.ndarray:
    """Construct anatomically plausible 478 landmark mesh points for testing."""
    np.random.seed(42)
    # 478 points in a 500x500 face coordinate space
    pts = np.random.uniform(150.0, 350.0, size=(478, 3)).astype(np.float32)

    # Key landmark coordinates
    pts[IDX_MESH_TOP] = [250.0, 80.0, 0.0]       # Top forehead
    pts[9] = [250.0, 140.0, 0.0]                  # Glabella
    pts[168] = [250.0, 160.0, 0.0]                # Nasion
    pts[2] = [250.0, 240.0, 0.0]                  # Subnasale
    pts[13] = [250.0, 280.0, 0.0]                 # Upper lip
    pts[14] = [250.0, 290.0, 0.0]                 # Lower lip
    pts[IDX_MENTON] = [250.0, 380.0, 0.0]         # Menton (chin)

    # Eyes
    pts[33] = [190.0, 180.0, 0.0]                 # Exo R
    pts[133] = [225.0, 180.0, 0.0]                # Endo R
    pts[362] = [275.0, 180.0, 0.0]                # Endo L
    pts[263] = [310.0, 180.0, 0.0]                # Exo L

    # Nose alar
    pts[129] = [220.0, 240.0, 0.0]                # Ala R
    pts[358] = [280.0, 240.0, 0.0]                # Ala L

    # Mouth commissures
    pts[61] = [210.0, 285.0, 0.0]                 # Commissure R
    pts[291] = [290.0, 285.0, 0.0]                # Commissure L

    # Zygion (Cheekbones)
    pts[IDX_ZYGION_R] = [140.0, 220.0, 0.0]
    pts[IDX_ZYGION_L] = [360.0, 220.0, 0.0]

    # Gonion (Jaw angles)
    pts[IDX_GONION_R] = [170.0, 320.0, 0.0]
    pts[IDX_GONION_L] = [330.0, 320.0, 0.0]

    # Jawline right: [58, 172, 136, 150, 149, 176, 148, 152]
    pts[172] = [180.0, 335.0, 0.0]
    pts[136] = [190.0, 350.0, 0.0]
    pts[150] = [200.0, 360.0, 0.0]
    pts[149] = [210.0, 368.0, 0.0]
    pts[176] = [220.0, 373.0, 0.0]
    pts[148] = [235.0, 377.0, 0.0]

    # Jawline left: [288, 397, 365, 379, 378, 400, 377, 152]
    pts[397] = [320.0, 335.0, 0.0]
    pts[365] = [310.0, 350.0, 0.0]
    pts[379] = [300.0, 360.0, 0.0]
    pts[378] = [290.0, 368.0, 0.0]
    pts[400] = [280.0, 373.0, 0.0]
    pts[377] = [265.0, 377.0, 0.0]

    return pts


# ===========================================================================
# 1. Feature Extraction Tests
# ===========================================================================


def test_extract_sagging_features_contains_all_12_features(mock_landmarks: np.ndarray):
    """Verify that extract_sagging_features extracts exactly the 12 clinical morphometrics."""
    feats = extract_sagging_features(mock_landmarks)
    assert feats is not None
    assert len(feats) == 12

    for name in FEATURE_NAMES:
        assert name in feats
        val = feats[name]
        assert isinstance(val, (int, float))
        assert not math.isnan(val)
        assert not math.isinf(val)


def test_feature_extraction_scale_invariance(mock_landmarks: np.ndarray):
    """Verify that landmark features are scale-invariant across camera magnifications."""
    feats1 = extract_sagging_features(mock_landmarks)
    feats2 = extract_sagging_features(mock_landmarks * 2.5)
    feats3 = extract_sagging_features(mock_landmarks * 0.5)

    assert feats1 is not None and feats2 is not None and feats3 is not None

    for k in FEATURE_NAMES:
        # Scale invariance within reasonable floating-point numerical tolerance
        assert abs(feats1[k] - feats2[k]) < 1e-4, f"Feature {k} changed under 2.5x scaling"
        assert abs(feats1[k] - feats3[k]) < 1e-4, f"Feature {k} changed under 0.5x scaling"


def test_feature_extraction_normalized_coordinates(mock_landmarks: np.ndarray):
    """Verify that normalized [0, 1] landmark coordinates are properly handled."""
    norm_landmarks = mock_landmarks / 500.0
    feats_norm = extract_sagging_features(norm_landmarks)
    feats_raw = extract_sagging_features(mock_landmarks)

    assert feats_norm is not None
    assert feats_raw is not None
    for k in FEATURE_NAMES:
        assert abs(feats_norm[k] - feats_raw[k]) < 1e-4


def test_feature_extraction_hostile_inputs():
    """Verify graceful handling of degenerate or hostile landmark inputs."""
    assert extract_sagging_features(None) is None
    assert extract_sagging_features([]) is None
    assert extract_sagging_features(np.zeros((10, 3))) is None  # Too few points

    # Degenerate face with zero height (top == menton)
    zero_face = np.zeros((478, 3))
    assert extract_sagging_features(zero_face) is None


# ===========================================================================
# 2. ONNX Model Inference Tests
# ===========================================================================


def test_sagging_model_session_and_metadata():
    """Verify ONNX model file and JSON metadata load cleanly."""
    session, meta = get_sagging_session()
    assert session is not None
    assert meta is not None

    assert "features" in meta
    assert len(meta["features"]) == 12
    assert "metrics" in meta
    assert "tier_mapping" in meta


def test_predict_sagging_output_schema(mock_landmarks: np.ndarray):
    """Verify full prediction output conforms to FacialSaggingResultModel."""
    result = predict_sagging(mock_landmarks)
    assert result is not None
    assert isinstance(result, FacialSaggingResultModel)

    # Tier validation
    assert result.tier in (1, 2, 3)
    assert result.tier_name in ("Firm", "Moderate", "Advanced")
    assert result.tier_name == TIER_NAMES[result.tier - 1]

    # Laxity score bounded [0.0, 100.0]
    assert 0.0 <= result.laxity_score <= 100.0

    # Confidence bounded [0.0, 1.0]
    assert 0.0 <= result.confidence <= 1.0

    # Posterior probabilities sum to 1.0
    probs = result.probabilities
    assert set(probs.keys()) == {"Firm", "Moderate", "Advanced"}
    for p in probs.values():
        assert 0.0 <= p <= 1.0
    assert abs(sum(probs.values()) - 1.0) < 1e-2

    # Localized clinical ratings
    assert len(result.rating_th) > 0
    assert len(result.rating_en) > 0
    assert len(result.description_th) > 0
    assert len(result.description_en) > 0

    # 12 features present
    assert len(result.features) == 12


def test_predict_sagging_invalid_input():
    """Verify prediction returns None gracefully on bad landmarks."""
    assert predict_sagging(None) is None
    assert predict_sagging(np.zeros((50, 2))) is None


# ===========================================================================
# 3. Pydantic Schema Validation & JSON Round-Trip
# ===========================================================================


def test_facial_sagging_json_roundtrip(mock_landmarks: np.ndarray):
    """Verify that FacialSaggingResultModel survives exact JSON serialization without loss."""
    res = predict_sagging(mock_landmarks)
    assert res is not None

    json_str = res.model_dump_json()
    reconstructed = FacialSaggingResultModel.model_validate_json(json_str)
    assert reconstructed == res


def test_facial_sagging_schema_bounds_enforcement():
    """Verify strict Pydantic range constraints on tier, laxity_score, and confidence."""
    valid_kwargs = {
        "tier": 2,
        "tier_name": "Moderate",
        "laxity_score": 52.4,
        "confidence": 0.65,
        "probabilities": {"Firm": 0.15, "Moderate": 0.65, "Advanced": 0.20},
        "rating_th": "ความหย่อนคล้อยระดับปานกลาง",
        "rating_en": "Moderate Laxity",
        "features": {"jowl_sagging_index": 0.03},
        "description_th": "คำอธิบาย",
        "description_en": "Description",
    }
    model = FacialSaggingResultModel(**valid_kwargs)
    assert model.tier == 2

    # Invalid tier (must be 1, 2, or 3)
    with pytest.raises(Exception):
        FacialSaggingResultModel(**{**valid_kwargs, "tier": 4})

    # Invalid laxity score (> 100.0)
    with pytest.raises(Exception):
        FacialSaggingResultModel(**{**valid_kwargs, "laxity_score": 105.0})

    # Invalid confidence (> 1.0)
    with pytest.raises(Exception):
        FacialSaggingResultModel(**{**valid_kwargs, "confidence": 1.2})


# ===========================================================================
# 4. Pipeline & Schema Integration Tests
# ===========================================================================


def test_frontal_result_schema_accepts_facial_sagging(mock_landmarks: np.ndarray):
    """Verify FrontalResult model holds facial_sagging seamlessly."""
    sagging_res = predict_sagging(mock_landmarks)
    assert sagging_res is not None

    frontal = FrontalResult(
        core_version="0.1.0",
        config_hash="test",
        status="ok",
        subject=SubjectInfo(sex="female", age=30),
        landmarks={},
        metrics={},
        facial_sagging=sagging_res,
    )
    assert frontal.facial_sagging is not None
    assert frontal.facial_sagging.tier == sagging_res.tier

    # User view serialization includes facial_sagging
    view = user_view(frontal, locale="th")
    assert "facial_sagging" in view
    assert view["facial_sagging"] is not None
    assert view["facial_sagging"]["tier"] == sagging_res.tier
    assert view["facial_sagging"]["laxity_score"] == sagging_res.laxity_score


def test_report_schema_copies_facial_sagging_from_frontal(mock_landmarks: np.ndarray):
    """Verify Report automatically inherits facial_sagging from its frontal result."""
    sagging_res = predict_sagging(mock_landmarks)
    frontal = FrontalResult(
        core_version="0.1.0",
        config_hash="test",
        status="ok",
        subject=SubjectInfo(sex="female", age=30),
        landmarks={},
        metrics={},
        facial_sagging=sagging_res,
    )

    report = Report(
        core_version="0.1.0",
        config_hash="test",
        status="ok",
        frontal=frontal,
    )
    assert report.facial_sagging is not None
    assert report.facial_sagging.tier == sagging_res.tier

    rep_view = user_view(report, locale="en")
    assert "facial_sagging" in rep_view
    assert rep_view["facial_sagging"] is not None
    assert rep_view["facial_sagging"]["tier_name"] == sagging_res.tier_name


# ===========================================================================
# 5. Procedure Recommender Sagging Treatments Tests
# ===========================================================================


def test_recommender_firm_tier_minimal_procedures():
    """Verify Tier 1 (Firm) results in zero or baseline procedural interventions."""
    rec = ProcedureRecommender()
    firm_sagging = {
        "tier": 1,
        "tier_name": "Firm",
        "laxity_score": 14.5,
        "features": {"jowl_sagging_index": 0.008, "oral_commissure_droop": -0.01},
    }

    tightening = rec.evaluate_skin_tightening(firm_sagging)
    assert tightening.intensity == 0.0
    assert not tightening.recommended

    thread = rec.evaluate_thread_lift(firm_sagging)
    assert thread.intensity == 0.0
    assert not thread.recommended

    facelift = rec.evaluate_surgical_facelift(firm_sagging)
    assert facelift.intensity == 0.0
    assert not facelift.recommended


def test_recommender_moderate_tier_indicates_hifu_and_threads():
    """Verify Tier 2 (Moderate) indicates non-surgical skin tightening and suspension threads."""
    rec = ProcedureRecommender()
    mod_sagging = {
        "tier": 2,
        "tier_name": "Moderate",
        "laxity_score": 54.0,
        "features": {"jowl_sagging_index": 0.032, "oral_commissure_droop": 0.015},
    }

    tightening = rec.evaluate_skin_tightening(mod_sagging)
    assert tightening.intensity > 0.4
    assert tightening.recommended
    assert "laxity_score" in tightening.triggering_metrics
    assert "HIFU" in tightening.rationale or "RF" in tightening.rationale

    thread = rec.evaluate_thread_lift(mod_sagging)
    assert thread.intensity > 0.3
    assert thread.recommended
    assert "thread" in thread.rationale.lower()

    facelift = rec.evaluate_surgical_facelift(mod_sagging)
    assert facelift.intensity == 0.0  # Surgery not indicated for moderate laxity


def test_recommender_advanced_tier_indicates_surgical_facelift():
    """Verify Tier 3 (Advanced) strongly indicates surgical rhytidectomy."""
    rec = ProcedureRecommender()
    adv_sagging = {
        "tier": 3,
        "tier_name": "Advanced",
        "laxity_score": 86.5,
        "features": {"jowl_sagging_index": 0.055, "jawline_irregularity": 0.025},
    }

    facelift = rec.evaluate_surgical_facelift(adv_sagging)
    assert facelift.intensity >= 0.70
    assert facelift.recommended
    assert "surgical" in facelift.rationale.lower()
    assert "laxity_score" in facelift.triggering_metrics

    # Non-surgical options also evaluated
    thread = rec.evaluate_thread_lift(adv_sagging)
    assert thread.intensity > 0.0


def test_recommend_procedures_with_sagging_includes_all_6_procedures():
    """Verify recommend_procedures includes all 6 procedures when sagging is passed."""
    mod_sagging = {
        "tier": 2,
        "tier_name": "Moderate",
        "laxity_score": 50.0,
        "features": {},
    }
    recs = recommend_procedures({}, {}, sagging=mod_sagging)
    assert len(recs) == 6
    names = {r.procedure for r in recs}
    assert names == {
        "chin_augmentation",
        "lip_augmentation",
        "rhinoplasty",
        "skin_tightening",
        "thread_lift",
        "surgical_facelift",
    }


def test_recommend_procedures_canonical_backward_compatibility():
    """Verify recommend_procedures without sagging preserves exact len == 3 behavior."""
    recs = recommend_procedures({}, {})
    assert len(recs) == 3
    assert {r.procedure for r in recs} == {
        "chin_augmentation",
        "lip_augmentation",
        "rhinoplasty",
    }


def test_recommend_sagging_procedures_standalone():
    """Verify standalone recommend_sagging_procedures helper."""
    mod_sagging = {
        "tier": 2,
        "tier_name": "Moderate",
        "laxity_score": 52.0,
        "features": {},
    }
    recs = recommend_sagging_procedures(mod_sagging)
    assert len(recs) == 3
    assert {r.procedure for r in recs} == {
        "skin_tightening",
        "thread_lift",
        "surgical_facelift",
    }


# ===========================================================================
# 6. Facemesh Module Interface Tests
# ===========================================================================


def test_facemesh_utilities(mock_landmarks: np.ndarray):
    """Verify facemesh module exports and helper functions."""
    pts = extract_landmarks_points(mock_landmarks)
    assert pts is not None
    assert pts.shape == (478, 2)

    pts_list = extract_landmarks_points([{"x": 10.0, "y": 20.0}] * 478)
    assert pts_list is not None
    assert pts_list.shape == (478, 2)

    res = analyze_facemesh_sagging(mock_landmarks)
    assert res is not None
    assert res.tier in (1, 2, 3)


def test_sagging_features_non_finite_and_degenerate_handling():
    """Verify non-finite inputs (NaN, Inf) and degenerate flat points do not crash with LinAlgError."""
    # 1. NaN inputs
    nan_pts = np.full((478, 3), np.nan, dtype=np.float32)
    assert extract_sagging_features(nan_pts) is None
    assert predict_sagging(nan_pts) is None
    assert analyze_facemesh_sagging(nan_pts) is None

    # 2. Inf inputs
    inf_pts = np.full((478, 3), np.inf, dtype=np.float32)
    assert extract_sagging_features(inf_pts) is None
    assert predict_sagging(inf_pts) is None

    # 3. Degenerate flat points where dx is all zeros
    flat_pts = np.full((478, 3), 200.0, dtype=np.float32)
    flat_pts[IDX_MESH_TOP] = [200.0, 100.0, 0.0]
    flat_pts[IDX_MENTON] = [200.0, 400.0, 0.0]
    flat_pts[IDX_ZYGION_R] = [100.0, 250.0, 0.0]
    flat_pts[IDX_ZYGION_L] = [300.0, 250.0, 0.0]
    # All jaw points have identical x coords (dx=0), triggering potential LinAlgError in polyfit
    for idx in JAWLINE_RIGHT:
        flat_pts[idx] = [200.0, 300.0, 0.0]
    for idx in JAWLINE_LEFT:
        flat_pts[idx] = [200.0, 300.0, 0.0]

    # Should not raise numpy.linalg.LinAlgError
    feats = extract_sagging_features(flat_pts)
    assert feats is not None
    assert "jawline_irregularity" in feats
    assert feats["jawline_irregularity"] == 0.0


def test_frontal_result_auto_generates_sagging_procedures(mock_landmarks: np.ndarray):
    """Verify that FrontalResult with facial_sagging generates all 6 procedures."""
    sagging_res = predict_sagging(mock_landmarks)
    assert sagging_res is not None

    m = {
        "F1_facial_index": {"value": 1.35, "unit": "ratio", "status": "within", "confidence": "high"},
        "F8_lip_ratio": {"value": 1.618, "unit": "ratio", "status": "within", "confidence": "high"},
    }
    frontal = FrontalResult(
        core_version="0.1.0",
        config_hash="test",
        status="ok",
        subject=SubjectInfo(sex="female", age=30),
        landmarks={},
        metrics=m,
        facial_sagging=sagging_res,
    )
    assert frontal.procedure_recommendations is not None
    rec_names = [p.procedure for p in frontal.procedure_recommendations]
    assert len(rec_names) == 6
    assert set(rec_names) == {
        "chin_augmentation",
        "lip_augmentation",
        "rhinoplasty",
        "skin_tightening",
        "thread_lift",
        "surgical_facelift",
    }


def test_assembler_with_overrides_preserves_sagging_procedures(mock_landmarks: np.ndarray):
    """Verify FrontalAssembler.with_overrides preserves sagging procedures."""
    from facescan import Override
    from helpers import synthetic_result

    res, asm = synthetic_result()
    sagging_res = predict_sagging(mock_landmarks)
    assert sagging_res is not None

    # Attach sagging result to the synthetic frontal result
    frontal = res.model_copy(update={"facial_sagging": sagging_res})
    tri = frontal.landmarks["trichion"]
    adjusted = asm.apply_overrides(
        frontal, {"trichion": Override(x=tri.x, y=tri.y - 10, source="user_adjusted")}
    )

    assert adjusted.facial_sagging is not None
    assert adjusted.procedure_recommendations is not None
    rec_names = [p.procedure for p in adjusted.procedure_recommendations]
    assert len(rec_names) == 6
    assert "skin_tightening" in rec_names
    assert "thread_lift" in rec_names
    assert "surgical_facelift" in rec_names

