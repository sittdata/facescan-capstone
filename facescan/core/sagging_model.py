"""Production inference for Morphological Facial Aging & Structural Laxity Index.

Loads models/facial_sagging.onnx and models/sagging_metadata.json to compute:
- Structural Sagging Tier: 1 (Firm), 2 (Moderate), 3 (Advanced)
- Continuous Laxity Index score: 0.0% to 100.0%
- Posterior class confidence probabilities
- Morphological landmark feature vector (12 clinical measurements)
- Localized clinical descriptions (TH/EN)
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Mapping

import numpy as np
import onnxruntime as ort

from facescan.core.schema import FacialSaggingResultModel

MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models"
MODEL_PATH = MODELS_DIR / "facial_sagging.onnx"
METADATA_PATH = MODELS_DIR / "sagging_metadata.json"

# Key MediaPipe Landmark Indices (matching scripts/extract_sagging_features.py)
IDX_MESH_TOP = 10
IDX_GLABELLA = 9
IDX_NASION = 168
IDX_SUBNASALE = 2
IDX_UPPER_LIP = 13
IDX_LOWER_LIP = 14
IDX_MENTON = 152

IDX_EXO_R = 33
IDX_ENDO_R = 133
IDX_ENDO_L = 362
IDX_EXO_L = 263

IDX_ALA_R = 129
IDX_ALA_L = 358

IDX_COMMISSURE_R = 61
IDX_COMMISSURE_L = 291

IDX_ZYGION_R = 234
IDX_ZYGION_L = 454

IDX_GONION_R = 58
IDX_GONION_L = 288

# Mandibular border points (jawline contour from gonion to menton)
JAWLINE_RIGHT = [58, 172, 136, 150, 149, 176, 148, 152]
JAWLINE_LEFT = [288, 397, 365, 379, 378, 400, 377, 152]

FEATURE_NAMES: list[str] = [
    "jowl_sagging_index",
    "malar_to_jaw_ratio",
    "lower_face_height_ratio",
    "oral_commissure_droop",
    "nasolabial_depth_ratio",
    "mean_canthal_tilt_deg",
    "jawline_irregularity",
    "chin_to_philtrum_ratio",
    "jawline_taper_ratio",
    "midface_to_lowerface_ratio",
    "face_aspect_ratio",
    "combined_sag_index",
]

TIER_NAMES: list[str] = ["Firm", "Moderate", "Advanced"]

TIER_CLINICAL_DESCRIPTIONS: dict[int, dict[str, str]] = {
    1: {
        "rating_th": "ความกระชับระดับดีเยี่ยม (Firm Structure)",
        "rating_en": "Firm & Well-Supported Facial Architecture",
        "desc_th": "กรอบหน้าคมชัด แนวกรามเรียวสวย โครงสร้างใบหน้าส่วนล่างมีความกระชับสูง ไม่พบความหย่อนคล้อยของแนวกราม",
        "desc_en": "Preserved structural contours, sharp mandibular border, minimal soft-tissue laxity.",
    },
    2: {
        "rating_th": "ความหย่อนคล้อยระดับปานกลาง (Moderate Laxity)",
        "rating_en": "Moderate Structural Laxity & Early Descent",
        "desc_th": "เริ่มพบการคล้อยตัวของเนื้อเยื่อบริเวณกระพุ้งแก้ม (Early Jowling) ร่องแก้มและร่องมุมปากเริ่มปรากฏ กรอบกรามเริ่มลดความคมชัด",
        "desc_en": "Mild to moderate soft-tissue descent, subtle jowl formation, early deepening of nasolabial and marionette folds.",
    },
    3: {
        "rating_th": "ความหย่อนคล้อยระดับสูง (Advanced Structural Laxity)",
        "rating_en": "Advanced Structural Laxity & Mandibular Blunting",
        "desc_th": "เนื้อเยื่อแก้มส่วนล่างคล้อยลงมาใต้แนวกรามชัดเจน (Prominent Jowls) ร่องแก้มลึก แนวกรามลบเลือน ต้องการการยกกระชับโครงสร้างอย่างจริงจัง",
        "desc_en": "Pronounced soft-tissue descent below mandibular border, deep facial folds, loss of youth triangle.",
    },
}

_SESSION: ort.InferenceSession | None = None
_METADATA: dict[str, Any] | None = None


def get_sagging_session() -> tuple[ort.InferenceSession, dict[str, Any]]:
    """Lazy-load and cache ONNX inference session and metadata."""
    global _SESSION, _METADATA
    if _SESSION is None:
        if not MODEL_PATH.is_file():
            raise FileNotFoundError(f"Facial sagging ONNX model not found: {MODEL_PATH}")
        _SESSION = ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])
    if _METADATA is None:
        if not METADATA_PATH.is_file():
            raise FileNotFoundError(f"Facial sagging metadata not found: {METADATA_PATH}")
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            _METADATA = json.load(f)
    return _SESSION, _METADATA


def dist2d(p1: np.ndarray, p2: np.ndarray) -> float:
    return float(np.hypot(p1[0] - p2[0], p1[1] - p2[1]))


def extract_sagging_features(landmarks: Any) -> dict[str, float] | None:
    """Extract the 12 clinical sagging morphometrics from 478 MediaPipe landmarks.

    Matches scripts/extract_sagging_features.py precisely.
    Accepts:
    - np.ndarray of shape (478, 2) or (478, 3) or (N, 2)
    - List of landmark objects with x, y attributes or dicts
    """
    if landmarks is None:
        return None

    # Convert to numpy array of xy
    if isinstance(landmarks, np.ndarray):
        xy = landmarks[:, :2].astype(np.float64)
    elif isinstance(landmarks, (list, tuple)):
        pts = []
        for lm in landmarks:
            if hasattr(lm, "x") and hasattr(lm, "y"):
                pts.append([lm.x, lm.y])
            elif isinstance(lm, Mapping) and "x" in lm and "y" in lm:
                pts.append([lm["x"], lm["y"]])
            elif isinstance(lm, (list, tuple)) and len(lm) >= 2:
                pts.append([lm[0], lm[1]])
            else:
                return None
        xy = np.array(pts, dtype=np.float64)
    else:
        return None

    if len(xy) < 468:
        return None

    if not isinstance(xy, np.ndarray) or xy.ndim != 2 or xy.shape[0] < 468 or xy.shape[1] < 2:
        return None

    if not np.all(np.isfinite(xy)):
        return None

    # Handle normalized [0, 1] coordinates by scaling up to nominal pixel size (500x500)
    # The geometric features are completely scale-invariant, but scaling avoids numeric underflow
    max_val = np.max(np.abs(xy))
    if max_val <= 2.0:
        xy = xy * 500.0

    # 1. Roll normalization (horizontal intercanthal line)
    eye_r = (xy[IDX_EXO_R] + xy[IDX_ENDO_R]) / 2.0
    eye_l = (xy[IDX_EXO_L] + xy[IDX_ENDO_L]) / 2.0
    d_eye = eye_l - eye_r
    angle = math.atan2(d_eye[1], d_eye[0])
    cos_a, sin_a = math.cos(-angle), math.sin(-angle)
    rot_mat = np.array([[cos_a, -sin_a], [sin_a, cos_a]])
    mid_eyes = (eye_r + eye_l) / 2.0
    xy_norm = (xy - mid_eyes) @ rot_mat.T

    top = xy_norm[IDX_MESH_TOP]
    gla = xy_norm[IDX_GLABELLA]
    sn = xy_norm[IDX_SUBNASALE]
    menton = xy_norm[IDX_MENTON]
    stomion = (xy_norm[IDX_UPPER_LIP] + xy_norm[IDX_LOWER_LIP]) / 2.0

    face_h = menton[1] - top[1]
    zyg_r, zyg_l = xy_norm[IDX_ZYGION_R], xy_norm[IDX_ZYGION_L]
    face_w = abs(zyg_l[0] - zyg_r[0])
    if face_h <= 10.0 or face_w <= 10.0:
        return None

    # 1. Jowl Sagging Index (sagging below gonion-menton baseline)
    gon_r = xy_norm[IDX_GONION_R]
    gon_l = xy_norm[IDX_GONION_L]

    def jowl_sag_deviation(jaw_indices: list[int], gon: np.ndarray) -> float:
        line_vec = menton - gon
        line_len = np.linalg.norm(line_vec)
        if line_len < 1e-4:
            return 0.0
        unit_line = line_vec / line_len
        normal_vec = np.array([-unit_line[1], unit_line[0]])  # pointing downward

        devs = []
        for idx in jaw_indices[1:-1]:
            pt = xy_norm[idx]
            proj_dist = np.dot(pt - gon, normal_vec)
            devs.append(max(0.0, float(proj_dist)))
        return float(np.mean(devs)) / face_h

    jowl_sag_r = jowl_sag_deviation(JAWLINE_RIGHT, gon_r)
    jowl_sag_l = jowl_sag_deviation(JAWLINE_LEFT, gon_l)
    jowl_sagging_index = float((jowl_sag_r + jowl_sag_l) / 2.0)

    # 2. Malar to Jaw Width Ratio (Triangle of Youth: inverted triangle vs pyramid)
    gonion_w = abs(gon_l[0] - gon_r[0])
    malar_to_jaw_ratio = float(face_w / max(gonion_w, 1.0))

    # 3. Lower Face Height Ratio
    lower_face_h = menton[1] - sn[1]
    lower_face_height_ratio = float(lower_face_h / face_h)

    # 4. Oral Commissure Droop (Marionette line indicator)
    com_r = xy_norm[IDX_COMMISSURE_R]
    com_l = xy_norm[IDX_COMMISSURE_L]
    mouth_mid_y = stomion[1]
    commissure_droop_r = (com_r[1] - mouth_mid_y) / face_h
    commissure_droop_l = (com_l[1] - mouth_mid_y) / face_h
    oral_commissure_droop = float((commissure_droop_r + commissure_droop_l) / 2.0)

    # 5. Nasolabial Distance Ratio
    nasolabial_len = (dist2d(xy_norm[IDX_ALA_R], com_r) + dist2d(xy_norm[IDX_ALA_L], com_l)) / 2.0
    nasolabial_depth_ratio = float(nasolabial_len / max(lower_face_h, 1e-4))

    # 6. Canthal Tilt (Eye corner drooping)
    exo_r, endo_r = xy_norm[IDX_EXO_R], xy_norm[IDX_ENDO_R]
    endo_l, exo_l = xy_norm[IDX_ENDO_L], xy_norm[IDX_EXO_L]
    tilt_r = math.degrees(math.atan2(exo_r[1] - endo_r[1], exo_r[0] - endo_r[0]))
    tilt_l = math.degrees(math.atan2(endo_l[1] - exo_l[1], endo_l[0] - exo_l[0]))
    mean_canthal_tilt = float((tilt_r + tilt_l) / 2.0)

    # 7. Jawline Contour Sharpness (Smoothness / linearity of gonion-menton curve)
    jaw_pts_r = np.array([xy_norm[i] for i in JAWLINE_RIGHT])
    dx_r = jaw_pts_r[:, 0] - jaw_pts_r[0, 0]
    dy_r = jaw_pts_r[:, 1] - jaw_pts_r[0, 1]
    try:
        poly_r = np.polyfit(dx_r, dy_r, deg=1, full=True)[1]
        res_r = float(poly_r[0]) if len(poly_r) > 0 else 0.0
    except Exception:
        res_r = 0.0

    jaw_pts_l = np.array([xy_norm[i] for i in JAWLINE_LEFT])
    dx_l = jaw_pts_l[:, 0] - jaw_pts_l[0, 0]
    dy_l = jaw_pts_l[:, 1] - jaw_pts_l[0, 1]
    try:
        poly_l = np.polyfit(dx_l, dy_l, deg=1, full=True)[1]
        res_l = float(poly_l[0]) if len(poly_l) > 0 else 0.0
    except Exception:
        res_l = 0.0

    jawline_irregularity = float((res_r + res_l) / (face_h ** 2 + 1e-4))

    # 8. Chin to Philtrum Ratio
    philtrum_h = max(1.0, stomion[1] - sn[1])
    chin_h = max(1.0, menton[1] - stomion[1])
    chin_to_philtrum_ratio = float(chin_h / philtrum_h)

    # 9. Mandibular Width to Face Width
    jawline_taper_ratio = float(gonion_w / face_w)

    # 10. Midface to Lowerface Aspect
    midface_h = sn[1] - gla[1]
    midface_to_lowerface_ratio = float(midface_h / max(lower_face_h, 1.0))

    # 11. Face Aspect Ratio
    face_aspect_ratio = float(face_h / face_w)

    # 12. Combined Sagging Index (Clinical composite heuristic)
    combined_sag_index = float(
        (jowl_sagging_index * 100.0) * 0.35 +
        (1.45 - malar_to_jaw_ratio) * 25.0 * 0.30 +
        (oral_commissure_droop * 100.0) * 0.20 +
        (1.0 - (mean_canthal_tilt / 8.0)) * 15.0 * 0.15
    )

    return {
        "jowl_sagging_index": round(jowl_sagging_index, 6),
        "malar_to_jaw_ratio": round(malar_to_jaw_ratio, 6),
        "lower_face_height_ratio": round(lower_face_height_ratio, 6),
        "oral_commissure_droop": round(oral_commissure_droop, 6),
        "nasolabial_depth_ratio": round(nasolabial_depth_ratio, 6),
        "mean_canthal_tilt_deg": round(mean_canthal_tilt, 4),
        "jawline_irregularity": round(jawline_irregularity, 6),
        "chin_to_philtrum_ratio": round(chin_to_philtrum_ratio, 6),
        "jawline_taper_ratio": round(jawline_taper_ratio, 6),
        "midface_to_lowerface_ratio": round(midface_to_lowerface_ratio, 6),
        "face_aspect_ratio": round(face_aspect_ratio, 6),
        "combined_sag_index": round(combined_sag_index, 6),
    }


def predict_sagging(landmarks: Any) -> FacialSaggingResultModel | None:
    """Run ONNX inference on MediaPipe landmarks for facial sagging & laxity classification.

    Returns FacialSaggingResultModel with:
    - tier (1, 2, 3)
    - tier_name ("Firm", "Moderate", "Advanced")
    - laxity_score (0.0 to 100.0%)
    - confidence (0.0 to 1.0)
    - probabilities (dict of class probabilities)
    - localized clinical guidance
    """
    feats = extract_sagging_features(landmarks)
    if feats is None:
        return None

    try:
        session, meta = get_sagging_session()
    except Exception:
        return None

    feature_order = meta.get("features", FEATURE_NAMES)
    input_vector = np.array([[feats.get(f, 0.0) for f in feature_order]], dtype=np.float32)

    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: input_vector})

    # Parse probabilities: outputs[1] can be ndarray (1, 3) or list of dicts [{0: p0, 1: p1, ...}]
    raw_probs = outputs[1]
    if isinstance(raw_probs, np.ndarray):
        probs_vec = raw_probs.flatten()
    elif isinstance(raw_probs, list) and len(raw_probs) > 0 and isinstance(raw_probs[0], dict):
        d = raw_probs[0]
        probs_vec = np.array([d.get(i, 0.0) for i in range(3)], dtype=np.float32)
    else:
        probs_vec = np.array([0.333, 0.333, 0.334], dtype=np.float32)

    # Normalize probabilities to sum to 1.0
    sum_p = float(np.sum(probs_vec))
    if sum_p > 1e-6:
        probs_vec = probs_vec / sum_p
    else:
        probs_vec = np.array([0.333, 0.333, 0.334], dtype=np.float32)

    pred_class_idx = int(np.argmax(probs_vec))
    tier = pred_class_idx + 1  # 1, 2, 3
    tier_name: Any = TIER_NAMES[pred_class_idx]

    confidence = round(float(probs_vec[pred_class_idx]), 4)
    probabilities = {
        "Firm": round(float(probs_vec[0]), 4),
        "Moderate": round(float(probs_vec[1]), 4),
        "Advanced": round(float(probs_vec[2]), 4),
    }

    # Continuous laxity score from probability expectation:
    # 0.0 * P(Firm) + 50.0 * P(Moderate) + 100.0 * P(Advanced)
    raw_laxity = float(probs_vec[0] * 0.0 + probs_vec[1] * 50.0 + probs_vec[2] * 100.0)
    laxity_score = round(float(np.clip(raw_laxity, 0.0, 100.0)), 1)

    desc_info = TIER_CLINICAL_DESCRIPTIONS.get(tier, TIER_CLINICAL_DESCRIPTIONS[2])

    return FacialSaggingResultModel(
        tier=tier,
        tier_name=tier_name,
        laxity_score=laxity_score,
        confidence=confidence,
        probabilities=probabilities,
        rating_th=desc_info["rating_th"],
        rating_en=desc_info["rating_en"],
        features=feats,
        description_th=desc_info["desc_th"],
        description_en=desc_info["desc_en"],
    )


__all__ = [
    "FEATURE_NAMES",
    "TIER_NAMES",
    "extract_sagging_features",
    "get_sagging_session",
    "predict_sagging",
]
