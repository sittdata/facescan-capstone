"""Automated tests for Orthodontic Cephalometric Skeletal Deformity Model.

Verifies:
- Dataset integrity and schema compliance
- Model artifact presence (ONNX, metadata, plots)
- ONNX inference correctness for prototypical Class I, II, III cases
- Sub-2ms warm inference latency (< 2.0 ms)
- Robustness: missing features, NaNs, infinities, and extreme inputs
- Schema serialization and JSON round-trip fidelity
- Clinical integration with ProcedureRecommender (camouflage vs orthognathic surgery)
"""

from __future__ import annotations

import json
import math
import time
from pathlib import Path

import numpy as np
import pytest

from facescan.core.cephalometric_model import (
    CLASS_NAMES,
    FEATURE_NAMES,
    classify_cephalometric_skeletal,
    get_cephalometric_session,
    prepare_cephalometric_vector,
)
from facescan.core.procedure_recommender import (
    ProcedureRecommender,
    recommend_orthognathic_procedures,
    recommend_procedures,
)
from facescan.core.schema import CephalometricResultModel, Report

ROOT_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = ROOT_DIR / "models"
DATASET_CSV = ROOT_DIR / "dataset" / "cephalometric_features.csv"
MODEL_PATH = MODELS_DIR / "cephalometric_model.onnx"
METADATA_PATH = MODELS_DIR / "cephalometric_metadata.json"
CONF_MATRIX_PATH = MODELS_DIR / "cephalometric_confusion_matrix.png"
SHAP_PLOT_PATH = MODELS_DIR / "cephalometric_shap_summary.png"


# =====================================================================
# 1. Artifacts & Dataset Validation
# =====================================================================

def test_cephalometric_artifacts_exist():
    """Verify all trained artifacts and metadata exist."""
    assert MODEL_PATH.is_file(), f"Missing ONNX model: {MODEL_PATH}"
    assert METADATA_PATH.is_file(), f"Missing metadata: {METADATA_PATH}"
    assert CONF_MATRIX_PATH.is_file(), f"Missing CM plot: {CONF_MATRIX_PATH}"
    assert SHAP_PLOT_PATH.is_file(), f"Missing SHAP plot: {SHAP_PLOT_PATH}"
    assert DATASET_CSV.is_file(), f"Missing dataset: {DATASET_CSV}"


def test_cephalometric_metadata_schema():
    """Verify metadata contains all required clinical and benchmark keys."""
    with open(METADATA_PATH, "r", encoding="utf-8") as f:
        meta = json.load(f)

    assert meta["version"] == "1.0.0"
    assert meta["task"] == "orthodontic_cephalometric_skeletal_classification"
    assert "champion_model" in meta
    assert len(meta["features"]) == 10
    assert meta["features"] == FEATURE_NAMES
    assert "class_mapping" in meta
    assert set(meta["class_mapping"].keys()) == {"0", "1", "2"}
    assert "metrics" in meta
    assert meta["metrics"]["accuracy"] >= 0.95
    assert meta["metrics"]["macro_f1"] >= 0.95
    assert "clinical_norms" in meta
    assert "feature_medians" in meta
    assert len(meta["feature_medians"]) == 10


def test_dataset_columns_and_balance():
    """Verify generated dataset contains correct columns and class distribution."""
    import pandas as pd
    df = pd.read_csv(DATASET_CSV)
    assert len(df) >= 1500
    for col in FEATURE_NAMES:
        assert col in df.columns
    assert set(df["skeletal_class"].unique()) == {0, 1, 2}
    counts = df["skeletal_class"].value_counts()
    # Check approximately balanced
    assert max(counts) - min(counts) <= 50


# =====================================================================
# 2. Inference Accuracy on Prototypical Clinical Cases
# =====================================================================

def test_inference_prototypical_class_i():
    """Normal balanced orthognathic profile must classify as Class I."""
    inputs = {
        "sna_angle": 82.0,
        "snb_angle": 80.0,
        "anb_angle": 2.0,
        "wits_appraisal_mm": -0.5,
        "fma_angle": 25.0,
        "gonial_angle": 125.0,
        "u1_sn_angle": 103.0,
        "impa_angle": 93.0,
        "y_axis_angle": 66.0,
        "jarabak_ratio": 63.5,
    }
    result = classify_cephalometric_skeletal(inputs)
    assert isinstance(result, CephalometricResultModel)
    assert result.skeletal_class == 0
    assert result.skeletal_class_name == "Class_I"
    assert result.confidence >= 0.80
    assert result.severity == "Normal"
    assert result.surgical_indication == "none"
    assert result.primary_etiology == "balanced_orthognathic"
    assert "ปกติ" in result.label_th


def test_inference_prototypical_mild_class_ii():
    """Mild mandibular retrognathia must classify as Class II with mild severity."""
    inputs = {
        "sna_angle": 82.0,
        "snb_angle": 77.0,
        "anb_angle": 5.0,
        "wits_appraisal_mm": 2.8,
        "fma_angle": 26.0,
        "gonial_angle": 125.5,
        "u1_sn_angle": 104.5,
        "impa_angle": 95.0,
        "y_axis_angle": 67.0,
        "jarabak_ratio": 62.5,
    }
    result = classify_cephalometric_skeletal(inputs)
    assert result.skeletal_class == 1
    assert result.skeletal_class_name == "Class_II"
    assert result.confidence >= 0.80
    assert result.severity == "Mild"
    assert result.surgical_indication == "camouflage_or_orthognathic"
    assert result.primary_etiology == "mandibular_retrusion"


def test_inference_prototypical_severe_class_ii():
    """Severe retrognathia (ANB > 8°, Wits > 6mm) must indicate orthognathic surgery."""
    inputs = {
        "sna_angle": 83.5,
        "snb_angle": 73.5,
        "anb_angle": 10.0,
        "wits_appraisal_mm": 7.5,
        "fma_angle": 32.0,
        "gonial_angle": 131.0,
        "u1_sn_angle": 108.0,
        "impa_angle": 99.0,
        "y_axis_angle": 71.0,
        "jarabak_ratio": 59.0,
    }
    result = classify_cephalometric_skeletal(inputs)
    assert result.skeletal_class == 1
    assert result.skeletal_class_name == "Class_II"
    assert result.severity == "Severe"
    assert result.surgical_indication == "orthognathic_strongly_recommended"
    assert result.vertical_pattern == "Hyperdivergent"


def test_inference_prototypical_mild_class_iii():
    """Mild mandibular excess must classify as Class III."""
    inputs = {
        "sna_angle": 82.0,
        "snb_angle": 83.5,
        "anb_angle": -1.5,
        "wits_appraisal_mm": -3.5,
        "fma_angle": 25.5,
        "gonial_angle": 127.0,
        "u1_sn_angle": 104.5,
        "impa_angle": 90.0,
        "y_axis_angle": 65.5,
        "jarabak_ratio": 63.8,
    }
    result = classify_cephalometric_skeletal(inputs)
    assert result.skeletal_class == 2
    assert result.skeletal_class_name == "Class_III"
    assert result.severity == "Mild"
    assert result.surgical_indication == "camouflage_or_orthognathic"
    assert "คางยื่น" in result.label_th or "ขากรรไกรล่างยื่น" in result.label_th


def test_inference_prototypical_severe_class_iii():
    """Severe prognathism (ANB < -5°, Wits < -7mm) must strongly recommend surgery."""
    inputs = {
        "sna_angle": 82.0,
        "snb_angle": 89.5,
        "anb_angle": -7.5,
        "wits_appraisal_mm": -8.5,
        "fma_angle": 27.0,
        "gonial_angle": 133.0,
        "u1_sn_angle": 110.0,
        "impa_angle": 82.0,
        "y_axis_angle": 64.0,
        "jarabak_ratio": 64.5,
    }
    result = classify_cephalometric_skeletal(inputs)
    assert result.skeletal_class == 2
    assert result.skeletal_class_name == "Class_III"
    assert result.severity == "Severe"
    assert result.surgical_indication == "orthognathic_strongly_recommended"
    assert result.primary_etiology == "mandibular_prognathism"


# =====================================================================
# 3. Smart Clinical Cross-Deduction & Partial Inputs
# =====================================================================

def test_smart_anb_deduction_from_sna_and_snb():
    """Missing anb_angle is deduced from sna_angle - snb_angle."""
    # SNA=82, SNB=76 -> ANB=6.0 -> Class II
    inputs = {"sna_angle": 82.0, "snb_angle": 76.0}
    result = classify_cephalometric_skeletal(inputs)
    assert result.skeletal_class == 1
    assert result.features["anb_angle"] == pytest.approx(6.0)

    # SNA=82, SNB=85 -> ANB=-3.0 -> Class III
    inputs3 = {"sna_angle": 82.0, "snb_angle": 85.0}
    result3 = classify_cephalometric_skeletal(inputs3)
    assert result3.skeletal_class == 2
    assert result3.features["anb_angle"] == pytest.approx(-3.0)


def test_smart_snb_deduction_from_sna_and_anb():
    """Missing snb_angle is deduced from sna_angle - anb_angle."""
    inputs = {"sna_angle": 82.0, "anb_angle": 2.0}
    result = classify_cephalometric_skeletal(inputs)
    assert result.features["snb_angle"] == pytest.approx(80.0)
    assert result.skeletal_class == 0


# =====================================================================
# 4. Latency Benchmark (< 2.0 ms)
# =====================================================================

def test_inference_latency_sub_2ms():
    """Verify warm inference execution takes well under 2.0 ms."""
    inputs = {
        "sna_angle": 82.0,
        "snb_angle": 80.0,
        "anb_angle": 2.0,
        "wits_appraisal_mm": -0.5,
        "fma_angle": 25.0,
    }
    # Warmup
    for _ in range(5):
        classify_cephalometric_skeletal(inputs)

    latencies_ms = []
    for _ in range(100):
        t0 = time.perf_counter()
        res = classify_cephalometric_skeletal(inputs)
        latencies_ms.append((time.perf_counter() - t0) * 1000.0)

    avg_ms = float(np.mean(latencies_ms))
    p95_ms = float(np.percentile(latencies_ms, 95))
    print(f"\nCephalometric Inference Latency: Avg = {avg_ms:.4f} ms, P95 = {p95_ms:.4f} ms")
    assert avg_ms < 2.0, f"Average latency too slow: {avg_ms:.3f} ms"
    assert p95_ms < 3.0, f"P95 latency too slow: {p95_ms:.3f} ms"


# =====================================================================
# 5. Robustness & Extreme Input Handling
# =====================================================================

def test_empty_input_falls_back_to_medians():
    """Empty inputs should safely use medians without throwing exceptions."""
    res = classify_cephalometric_skeletal({})
    assert isinstance(res, CephalometricResultModel)
    assert res.skeletal_class == 0  # Medians represent normal Class I
    assert res.confidence >= 0.50
    assert len(res.features) == 10


def test_nan_and_inf_handling():
    """Non-finite floats must be replaced by medians without errors."""
    corrupted = {
        "sna_angle": math.nan,
        "snb_angle": math.inf,
        "anb_angle": -math.inf,
        "wits_appraisal_mm": float("nan"),
    }
    res = classify_cephalometric_skeletal(corrupted)
    assert isinstance(res, CephalometricResultModel)
    for k, v in res.features.items():
        assert not math.isnan(v) and not math.isinf(v)


def test_extreme_boundary_angles():
    """Extreme angles must not cause internal errors or crashes."""
    extreme_class_ii = {"anb_angle": 25.0, "wits_appraisal_mm": 20.0, "sna_angle": 110.0}
    res_ii = classify_cephalometric_skeletal(extreme_class_ii)
    assert res_ii.skeletal_class == 1

    extreme_class_iii = {"anb_angle": -25.0, "wits_appraisal_mm": -22.0, "snb_angle": 110.0}
    res_iii = classify_cephalometric_skeletal(extreme_class_iii)
    assert res_iii.skeletal_class == 2


# =====================================================================
# 6. Schema & JSON Roundtrip Serialization
# =====================================================================

def test_schema_json_roundtrip():
    """Result model must survive lossless JSON serialization."""
    inputs = {
        "sna_angle": 82.0,
        "snb_angle": 76.0,
        "anb_angle": 6.0,
        "wits_appraisal_mm": 3.8,
        "fma_angle": 28.0,
    }
    res = classify_cephalometric_skeletal(inputs)
    json_str = res.model_dump_json()
    assert isinstance(json_str, str)
    assert "NaN" not in json_str
    assert "Infinity" not in json_str

    restored = CephalometricResultModel.model_validate_json(json_str)
    assert restored == res
    assert restored.skeletal_class_name == "Class_II"
    assert restored.severity == "Moderate"


# =====================================================================
# 7. ProcedureRecommender Clinical Integration
# =====================================================================

def test_class_iii_contraindicates_chin_augmentation():
    """Class III prognathism must set chin augmentation intensity to 0.0 with contraindication rationale."""
    recommender = ProcedureRecommender()
    ceph_class_iii = classify_cephalometric_skeletal({
        "sna_angle": 80.0,
        "snb_angle": 86.0,
        "anb_angle": -6.0,
        "wits_appraisal_mm": -7.0,
    })

    # Artificial profile metrics that would normally trigger chin augmentation
    frontal_metrics = {"F1_lower_third": 0.29}
    profile_metrics = {"P4_eline_lower_lip_mm": 2.0}

    rec = recommender.evaluate_chin_augmentation(
        frontal_metrics=frontal_metrics,
        profile_metrics=profile_metrics,
        cephalometric=ceph_class_iii,
    )

    assert rec.intensity == 0.0
    assert "contraindicated" in rec.rationale.lower()
    assert "cephalometric_class_iii" in rec.triggering_metrics


def test_class_iii_recommends_orthognathic_surgery():
    """Moderate/Severe Class III must trigger orthognathic surgery recommendation."""
    recommender = ProcedureRecommender()
    ceph_class_iii = classify_cephalometric_skeletal({
        "sna_angle": 79.0,
        "snb_angle": 86.0,
        "anb_angle": -7.0,
        "wits_appraisal_mm": -8.0,
    })

    rec = recommender.evaluate_orthognathic_surgery(cephalometric=ceph_class_iii)
    assert rec.procedure == "orthognathic_surgery"
    assert rec.intensity >= 0.75
    assert "skeletal_class_iii" in rec.triggering_metrics
    assert "orthognathic" in rec.rationale.lower()


def test_mild_class_ii_allows_chin_filler_camouflage():
    """Mild Class II allows non-surgical chin augmentation camouflage."""
    recommender = ProcedureRecommender()
    ceph_mild_ii = classify_cephalometric_skeletal({
        "sna_angle": 82.0,
        "snb_angle": 77.0,
        "anb_angle": 5.0,
        "wits_appraisal_mm": 2.5,
    })

    chin_rec = recommender.evaluate_chin_augmentation(
        frontal_metrics={"F1_lower_third": 0.30},
        cephalometric=ceph_mild_ii,
    )
    assert chin_rec.intensity > 0.0
    assert "camouflage" in chin_rec.rationale.lower()

    ortho_rec = recommender.evaluate_orthognathic_surgery(cephalometric=ceph_mild_ii)
    assert ortho_rec.intensity <= 0.30
    assert "elective" in ortho_rec.rationale.lower() or "camouflage" in ortho_rec.rationale.lower()


def test_severe_class_ii_strongly_recommends_orthognathic_surgery():
    """Severe Class II triggers orthognathic surgery with high intensity (> 0.90)."""
    recommender = ProcedureRecommender()
    ceph_severe_ii = classify_cephalometric_skeletal({
        "sna_angle": 84.0,
        "snb_angle": 73.0,
        "anb_angle": 11.0,
        "wits_appraisal_mm": 8.5,
    })

    ortho_rec = recommender.evaluate_orthognathic_surgery(cephalometric=ceph_severe_ii)
    assert ortho_rec.intensity >= 0.90
    assert "bsso" in ortho_rec.rationale.lower() or "strongly recommended" in ortho_rec.rationale.lower()

    # Chin filler should cap and note clinical limitation
    chin_rec = recommender.evaluate_chin_augmentation(
        frontal_metrics={"F1_lower_third": 0.28},
        cephalometric=ceph_severe_ii,
    )
    assert chin_rec.intensity <= 0.50
    assert "primary clinical treatment" in chin_rec.rationale.lower() or "limited" in chin_rec.rationale.lower()


def test_recommend_procedures_with_cephalometric():
    """Full recommend_procedures function integrates orthognathic recommendations."""
    ceph_ii = classify_cephalometric_skeletal({
        "sna_angle": 83.0,
        "snb_angle": 75.0,
        "anb_angle": 8.0,
        "wits_appraisal_mm": 6.5,
    })

    recs = recommend_procedures(
        frontal={"F1_lower_third": {"value": 0.30}},
        cephalometric=ceph_ii,
        include_cephalometric=True,
    )
    procedures = [r.procedure for r in recs]
    assert "orthognathic_surgery" in procedures
    assert "chin_augmentation" in procedures

    ortho_rec = next(r for r in recs if r.procedure == "orthognathic_surgery")
    assert ortho_rec.intensity >= 0.80


def test_smart_snb_and_sna_deduction_when_only_anb_provided():
    """When only anb_angle is provided, SNA anchors at median and SNB = SNA - ANB."""
    # ANB = 7.0 -> Class II, SNA~82, SNB~75 -> Mandibular retrusion
    r2 = classify_cephalometric_skeletal({"anb_angle": 7.0})
    assert r2.skeletal_class == 1
    assert r2.skeletal_class_name == "Class_II"
    assert r2.features["sna_angle"] == pytest.approx(82.0, abs=0.3)
    assert r2.features["snb_angle"] == pytest.approx(75.0, abs=0.3)
    assert r2.features["sna_angle"] - r2.features["snb_angle"] == pytest.approx(7.0)
    assert r2.primary_etiology == "mandibular_retrusion"

    # ANB = -4.0 -> Class III, SNA~82, SNB~86 -> Mandibular prognathism
    r3 = classify_cephalometric_skeletal({"anb_angle": -4.0})
    assert r3.skeletal_class == 2
    assert r3.skeletal_class_name == "Class_III"
    assert r3.features["sna_angle"] == pytest.approx(82.0, abs=0.3)
    assert r3.features["snb_angle"] == pytest.approx(86.0, abs=0.3)
    assert r3.features["sna_angle"] - r3.features["snb_angle"] == pytest.approx(-4.0)
    assert r3.primary_etiology == "mandibular_prognathism"


def test_borderline_clinical_angles_steiner():
    """Verify exact Steiner classification boundaries."""
    # ANB = 2.0 -> Standard Class I
    r_norm = classify_cephalometric_skeletal({"anb_angle": 2.0})
    assert r_norm.skeletal_class == 0

    # ANB = 0.5 -> Class I
    r_low_i = classify_cephalometric_skeletal({"anb_angle": 0.5})
    assert r_low_i.skeletal_class == 0

    # ANB = 3.8 -> Class I
    r_high_i = classify_cephalometric_skeletal({"anb_angle": 3.8})
    assert r_high_i.skeletal_class == 0

    # ANB = 4.5 -> Class II
    r_ii = classify_cephalometric_skeletal({"anb_angle": 4.5})
    assert r_ii.skeletal_class == 1

    # ANB = -1.0 -> Class III
    r_iii = classify_cephalometric_skeletal({"anb_angle": -1.0})
    assert r_iii.skeletal_class == 2


def test_recommend_orthognathic_procedures_from_profile_object():
    """recommend_orthognathic_procedures must extract cephalometrics from profile argument."""
    ceph = classify_cephalometric_skeletal({
        "sna_angle": 83.0,
        "snb_angle": 74.0,
        "anb_angle": 9.0,
        "wits_appraisal_mm": 7.0,
    })
    fake_profile = {"status": "ok", "metrics": {}, "cephalometric": ceph}

    recs = recommend_orthognathic_procedures(profile=fake_profile)
    assert len(recs) == 1
    assert recs[0].procedure == "orthognathic_surgery"
    assert recs[0].intensity >= 0.90
    assert "skeletal_class_ii" in recs[0].triggering_metrics


def test_recommend_orthognathic_procedures_from_raw_measurements():
    """Passing a raw measurements dict directly should auto-classify and recommend."""
    recs = recommend_orthognathic_procedures(
        cephalometric={"anb_angle": -6.0, "wits_appraisal_mm": -7.5}
    )
    assert len(recs) == 1
    assert recs[0].procedure == "orthognathic_surgery"
    assert recs[0].intensity >= 0.90
    assert "skeletal_class_iii" in recs[0].triggering_metrics


def test_report_auto_coerces_raw_cephalometric_dict():
    """Report schema accepts raw cephalometric dict and computes orthognathic recommendations."""
    rep = Report(
        core_version="1.0.0",
        config_hash="test",
        status="ok",
        cephalometric={"anb_angle": 8.5, "wits_appraisal_mm": 6.5},
    )
    assert isinstance(rep.cephalometric, CephalometricResultModel)
    assert rep.cephalometric.skeletal_class_name == "Class_II"
    assert rep.cephalometric.severity in ("Moderate", "Severe")

    procedures = {r.procedure: r for r in rep.procedure_recommendations or []}
    assert "orthognathic_surgery" in procedures
    assert procedures["orthognathic_surgery"].intensity >= 0.65

