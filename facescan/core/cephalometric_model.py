"""Production inference for Orthodontic Cephalometric Skeletal Deformity Classification.

Loads models/cephalometric_model.onnx and models/cephalometric_metadata.json to compute:
- Skeletal Malocclusion Classification: Class I (Normal), Class II (Retrognathic), Class III (Prognathic)
- Deformity Severity: Normal, Mild, Moderate, Severe
- Anatomic Primary Etiology & Vertical Facial Pattern
- Surgical vs Non-Surgical Orthognathic Indication
- Sub-millisecond (< 2ms) ONNX inference
"""

from __future__ import annotations

import json
import math
import time
from pathlib import Path
from typing import Any, Mapping

import numpy as np
import onnxruntime as ort

from facescan.core.schema import CephalometricResultModel

MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models"
MODEL_PATH = MODELS_DIR / "cephalometric_model.onnx"
METADATA_PATH = MODELS_DIR / "cephalometric_metadata.json"

FEATURE_NAMES: list[str] = [
    "sna_angle",
    "snb_angle",
    "anb_angle",
    "wits_appraisal_mm",
    "fma_angle",
    "gonial_angle",
    "u1_sn_angle",
    "impa_angle",
    "y_axis_angle",
    "jarabak_ratio",
]

CLASS_NAMES: list[str] = ["Class_I", "Class_II", "Class_III"]

_SESSION: ort.InferenceSession | None = None
_METADATA: dict[str, Any] | None = None


def get_cephalometric_session() -> tuple[ort.InferenceSession, dict[str, Any]]:
    """Lazy-load and cache ONNX inference session and metadata."""
    global _SESSION, _METADATA
    if _SESSION is None or _METADATA is None:
        if not MODEL_PATH.is_file():
            raise FileNotFoundError(
                f"Cephalometric model not found at {MODEL_PATH}. "
                "Run `python scripts/train_cephalometric_model.py` first."
            )
        if not METADATA_PATH.is_file():
            raise FileNotFoundError(f"Cephalometric metadata not found at {METADATA_PATH}.")

        opts = ort.SessionOptions()
        opts.inter_op_num_threads = 1
        opts.intra_op_num_threads = 1
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        _SESSION = ort.InferenceSession(
            str(MODEL_PATH),
            sess_options=opts,
            providers=["CPUExecutionProvider"],
        )
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            _METADATA = json.load(f)

    return _SESSION, _METADATA


def _extract_float(val: Any) -> float | None:
    """Safely convert value to finite float."""
    if val is None:
        return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (TypeError, ValueError):
        return None


def prepare_cephalometric_vector(
    inputs: Mapping[str, Any] | Any,
    medians: dict[str, float] | None = None,
) -> tuple[np.ndarray, dict[str, float]]:
    """Extract, impute, and validate cephalometric feature vector.

    Accepts a dictionary, Mapping, or object with feature attributes.
    Supports smart cross-feature deduction (e.g. ANB = SNA - SNB).
    """
    if medians is None:
        medians = {
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

    raw: dict[str, float | None] = {}
    for feat in FEATURE_NAMES:
        val = None
        if isinstance(inputs, Mapping):
            val = inputs.get(feat)
        elif hasattr(inputs, feat):
            val = getattr(inputs, feat)
        raw[feat] = _extract_float(val)

    # Smart clinical cross-deduction
    sna = raw["sna_angle"]
    snb = raw["snb_angle"]
    anb = raw["anb_angle"]

    if anb is not None:
        if sna is not None and snb is None:
            snb = sna - anb
            raw["snb_angle"] = snb
        elif sna is None and snb is not None:
            sna = snb + anb
            raw["sna_angle"] = sna
        elif sna is None and snb is None:
            # Anchor SNA at standard median (82.0°) and deduce SNB = SNA - ANB
            # to maintain biological consistency (SNA - SNB == ANB)
            sna = float(medians.get("sna_angle", 82.0))
            snb = sna - anb
            raw["sna_angle"] = sna
            raw["snb_angle"] = snb
    elif sna is not None and snb is not None:
        anb = sna - snb
        raw["anb_angle"] = anb

    if raw["wits_appraisal_mm"] is None and anb is not None:
        # Approximate Wits from ANB correlation if missing
        raw["wits_appraisal_mm"] = (anb - 2.0) * 0.8 - 0.5

    clean_features: dict[str, float] = {}
    vec: list[float] = []
    for feat in FEATURE_NAMES:
        val = raw[feat]
        if val is None or math.isnan(val) or math.isinf(val):
            val = float(medians.get(feat, 0.0))
        clean_features[feat] = float(val)
        vec.append(float(val))

    arr = np.array([vec], dtype=np.float32)
    return arr, clean_features


def determine_severity_and_indication(
    cls_idx: int,
    features: dict[str, float],
) -> tuple[str, str, str, str]:
    """Compute severity, etiology, vertical pattern, and surgical indication."""
    anb = features.get("anb_angle", 2.0)
    wits = features.get("wits_appraisal_mm", -0.5)
    fma = features.get("fma_angle", 25.0)
    sna = features.get("sna_angle", 82.0)
    snb = features.get("snb_angle", 80.0)

    # Vertical pattern
    if fma < 21.0:
        vert_pattern = "Hypodivergent"
    elif fma > 29.0:
        vert_pattern = "Hyperdivergent"
    else:
        vert_pattern = "Normodivergent"

    if cls_idx == 0:
        severity = "Normal"
        etiology = "balanced_orthognathic"
        surgical_ind = "none"
    elif cls_idx == 1:
        # Class II
        if anb <= 5.8 and wits <= 3.5:
            severity = "Mild"
            surgical_ind = "camouflage_or_orthognathic"
        elif anb <= 7.8 and wits <= 6.0:
            severity = "Moderate"
            surgical_ind = "orthognathic_indicated"
        else:
            severity = "Severe"
            surgical_ind = "orthognathic_strongly_recommended"

        if sna > 84.0 and snb >= 78.5:
            etiology = "maxillary_protrusion"
        elif snb < 78.0 and sna <= 84.0:
            etiology = "mandibular_retrusion"
        else:
            etiology = "bimaxillary_class_ii"
    else:
        # Class III
        if anb >= -2.2 and wits >= -4.5:
            severity = "Mild"
            surgical_ind = "camouflage_or_orthognathic"
        elif anb >= -4.8 and wits >= -7.5:
            severity = "Moderate"
            surgical_ind = "orthognathic_indicated"
        else:
            severity = "Severe"
            surgical_ind = "orthognathic_strongly_recommended"

        if snb > 82.0 and sna >= 80.0:
            etiology = "mandibular_prognathism"
        elif sna < 80.0 and snb <= 82.0:
            etiology = "maxillary_hypoplasia"
        else:
            etiology = "combined_class_iii"

    return severity, etiology, vert_pattern, surgical_ind


def classify_cephalometric_skeletal(
    inputs: Mapping[str, Any] | Any,
) -> CephalometricResultModel:
    """Predict skeletal class and clinical deformity from cephalometric measurements.

    Runs in < 2ms using cached ONNX Runtime session.
    """
    t_start = time.perf_counter()
    session, metadata = get_cephalometric_session()
    medians = metadata.get("feature_medians", {})

    arr, clean_feats = prepare_cephalometric_vector(inputs, medians)

    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: arr})

    pred_label = int(outputs[0].flatten()[0])
    raw_probs = outputs[1]

    if isinstance(raw_probs, list) and isinstance(raw_probs[0], dict):
        prob_dict = {CLASS_NAMES[k]: float(v) for k, v in raw_probs[0].items()}
    elif hasattr(raw_probs, "shape") and len(raw_probs.shape) == 2:
        prob_dict = {CLASS_NAMES[i]: float(raw_probs[0][i]) for i in range(len(CLASS_NAMES))}
    else:
        prob_dict = {name: (1.0 if i == pred_label else 0.0) for i, name in enumerate(CLASS_NAMES)}

    confidence = round(float(prob_dict.get(CLASS_NAMES[pred_label], 1.0)), 4)
    cls_name = CLASS_NAMES[pred_label]

    severity, etiology, vert_pattern, surgical_ind = determine_severity_and_indication(
        pred_label, clean_feats
    )

    class_info = metadata.get("class_mapping", {}).get(str(pred_label), {})
    label_th = class_info.get("label_th", cls_name)
    label_en = class_info.get("label_en", cls_name)
    description_th = class_info.get("description_th", "")
    description_en = class_info.get("description_en", "")

    inference_ms = round((time.perf_counter() - t_start) * 1000.0, 3)

    return CephalometricResultModel(
        skeletal_class=pred_label,
        skeletal_class_name=cls_name,  # type: ignore[arg-type]
        confidence=confidence,
        probabilities={k: round(v, 4) for k, v in prob_dict.items()},
        severity=severity,  # type: ignore[arg-type]
        primary_etiology=etiology,
        vertical_pattern=vert_pattern,  # type: ignore[arg-type]
        surgical_indication=surgical_ind,  # type: ignore[arg-type]
        label_th=label_th,
        label_en=label_en,
        description_th=description_th,
        description_en=description_en,
        features=clean_feats,
        inference_time_ms=inference_ms,
    )


__all__ = [
    "FEATURE_NAMES",
    "CLASS_NAMES",
    "get_cephalometric_session",
    "prepare_cephalometric_vector",
    "classify_cephalometric_skeletal",
]
