"""Production inference for AI Facial Harmony & Balance scoring using ONNX Runtime.

Loads models/facial_harmony.onnx and models/harmony_metadata.json to compute:
- AI Harmony Score (0-100%)
- Percentile rank compared to Asian & Caucasian aesthetic benchmarks
- Feature attribution & impact breakdown (Positive drivers vs Deviations)
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

import numpy as np
import onnxruntime as ort

from facescan.core.schema import AIHarmonyResultModel, FeatureAttributionModel, _Model

MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models"
MODEL_PATH = MODELS_DIR / "facial_harmony.onnx"
METADATA_PATH = MODELS_DIR / "harmony_metadata.json"

# Landmark indices
IDX_MESH_TOP = 10
IDX_GLABELLA = 9
IDX_NASION = 168
IDX_PRONASALE = 4
IDX_SUBNASALE = 2
IDX_UPPER_LIP = 13
IDX_LOWER_LIP = 14
IDX_LABRALE_SUPERIUS = 0
IDX_LABRALE_INFERIUS = 17
IDX_MENTON = 152
IDX_POGONION = 175

IDX_EXO_R = 33
IDX_ENDO_R = 133
IDX_ENDO_L = 362
IDX_EXO_L = 263

IDX_IRIS_R = 468
IDX_IRIS_L = 473

IDX_ALA_R = 129
IDX_ALA_L = 358
IDX_ALA_BASE_R = 64
IDX_ALA_BASE_L = 294

IDX_COMMISSURE_R = 61
IDX_COMMISSURE_L = 291

IDX_ZYGION_R = 234
IDX_ZYGION_L = 454

IDX_GONION_R = 58
IDX_GONION_L = 288

IDX_TEMPLE_R = 127
IDX_TEMPLE_L = 356

# Feature Thai/English names & clinical guidance
FEATURE_LABELS: dict[str, dict[str, str]] = {
    "chin_angle_deg": {
        "th": "มุมปลายคาง",
        "en": "Chin Angle",
        "unit": "°",
        "ideal_desc": "มุมเรียวระดับ 65°-75° สอดคล้องกับกรอบรูปหน้า V-Shape",
    },
    "eye_spacing_ratio": {
        "th": "สัดส่วนระยะห่างตา (ICD / Biocular)",
        "en": "Intercanthal Eye Spacing",
        "unit": "ratio",
        "ideal_desc": "ระยะห่างหัวตาสมดุลกับความกว้างตารวมตามกฎ Rule of Fifths",
    },
    "alar_width_to_face_width_ratio": {
        "th": "ความกว้างปีกจมูกต่อใบหน้า",
        "en": "Alar Base to Face Width",
        "unit": "ratio",
        "ideal_desc": "ปีกจมูกกว้างพอดีระหว่างหัวตาทั้งสองข้าง (ประมาณ 20-25% ของโหนกแก้ม)",
    },
    "chin_to_philtrum_ratio": {
        "th": "สัดส่วนคางต่อร่องริมฝีปากบน",
        "en": "Chin to Philtrum Ratio",
        "unit": "ratio",
        "ideal_desc": "ความยาวปลายคางควรเป็น 2 เท่าของความยาวร่องริมฝีปากบน (2.0 : 1.0)",
    },
    "cheekbone_prominence": {
        "th": "มิติความกว้างโหนกแก้ม",
        "en": "Cheekbone Prominence",
        "unit": "ratio",
        "ideal_desc": "ความกว้างโหนกแก้มได้สัดส่วนรับกับแนวกระบอกตา",
    },
    "forehead_to_lower_face_ratio": {
        "th": "สัดส่วนหน้าผากต่อหน้าส่วนล่าง",
        "en": "Forehead to Lower Face Ratio",
        "unit": "ratio",
        "ideal_desc": "ความยาวหน้าผากสมดุลกับความยาวคางและขากรรไกร (ใกล้เคียง 1.0)",
    },
    "forehead_to_cheekbone_ratio": {
        "th": "สัดส่วนหน้าผากต่อโหนกแก้ม",
        "en": "Forehead to Cheekbone Ratio",
        "unit": "ratio",
        "ideal_desc": "ความกว้างขมับและไรผมสมดุลกับโหนกแก้ม",
    },
    "face_aspect_ratio": {
        "th": "อัตราส่วนความยาวต่อความกว้างหน้า",
        "en": "Face Aspect Ratio (Height/Width)",
        "unit": "ratio",
        "ideal_desc": "ความยาวหน้าต่อความกว้างสมดุลระดับ 1.3 - 1.4",
    },
    "intercanthal_to_nasal_ratio": {
        "th": "สัดส่วนหัวตาต่อปีกจมูก",
        "en": "Intercanthal to Nasal Ratio",
        "unit": "ratio",
        "ideal_desc": "ปีกจมูกไม่กว้างเกินระยะห่างหัวตาสองข้าง (ใกล้เคียง 1.0)",
    },
    "vertical_harmony_index": {
        "th": "ดัชนีความสมดุล 3 ส่วนแนวดิ่ง",
        "en": "Vertical Thirds Harmony Index",
        "unit": "index",
        "ideal_desc": "สัดส่วนหน้าผาก กลางหน้า และคาง แบ่งเท่ากันอย่างกลมกลืน (1:1:1)",
    },
    "bilateral_symmetry_index": {
        "th": "ดัชนีความสมมาตรซ้าย-ขวา",
        "en": "Bilateral Facial Symmetry",
        "unit": "index",
        "ideal_desc": "จุดตำแหน่งกายวิภาคซ้ายขวามีระยะห่างจากกึ่งกลางสมมาตรเกิน 95%",
    },
    "golden_ratio_deviation_vertical": {
        "th": "ความเบี่ยงเบนจากสัดส่วนทองคำ",
        "en": "Golden Ratio Vertical Deviation",
        "unit": "deviation",
        "ideal_desc": "ความคลาดเคลื่อนจากเกณฑ์ทองคำแนวดิ่ง ยิ่งน้อยยิ่งกลมกลืน",
    },
}


FeatureAttribution = FeatureAttributionModel
AIHarmonyResult = AIHarmonyResultModel


_SESSION: ort.InferenceSession | None = None
_METADATA: dict[str, Any] | None = None


def get_session() -> tuple[ort.InferenceSession, dict[str, Any]]:
    global _SESSION, _METADATA
    if _SESSION is None:
        if not MODEL_PATH.is_file():
            raise FileNotFoundError(f"AI Harmony ONNX model not found: {MODEL_PATH}")
        _SESSION = ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])
    if _METADATA is None:
        if not METADATA_PATH.is_file():
            raise FileNotFoundError(f"AI Harmony Metadata not found: {METADATA_PATH}")
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            _METADATA = json.load(f)
    return _SESSION, _METADATA


def dist2d(p1: np.ndarray, p2: np.ndarray) -> float:
    return float(np.hypot(p1[0] - p2[0], p1[1] - p2[1]))


def angle_deg(p1: np.ndarray, vertex: np.ndarray, p2: np.ndarray) -> float:
    v1 = p1 - vertex
    v2 = p2 - vertex
    dot = np.dot(v1, v2)
    norm = np.linalg.norm(v1) * np.linalg.norm(v2)
    if norm < 1e-6:
        return 0.0
    cos_val = np.clip(dot / norm, -1.0, 1.0)
    return float(math.degrees(math.acos(cos_val)))


def extract_features(pts: np.ndarray, gender: str = "female", race: str = "asian") -> dict[str, float] | None:
    xy = pts[:, :2]

    eye_r = xy[IDX_IRIS_R]
    eye_l = xy[IDX_IRIS_L]
    d_eye = eye_l - eye_r
    angle = math.atan2(d_eye[1], d_eye[0])
    cos_a, sin_a = math.cos(-angle), math.sin(-angle)
    rot_mat = np.array([[cos_a, -sin_a], [sin_a, cos_a]])
    mid_eyes = (eye_r + eye_l) / 2.0
    xy_norm = (xy - mid_eyes) @ rot_mat.T

    top = xy_norm[IDX_MESH_TOP]
    glabella = xy_norm[IDX_GLABELLA]
    subnasale = xy_norm[IDX_SUBNASALE]
    stomion = (xy_norm[IDX_UPPER_LIP] + xy_norm[IDX_LOWER_LIP]) / 2.0
    menton = xy_norm[IDX_MENTON]

    face_height = menton[1] - top[1]
    zyg_r, zyg_l = xy_norm[IDX_ZYGION_R], xy_norm[IDX_ZYGION_L]
    face_width = abs(zyg_l[0] - zyg_r[0])
    if face_height <= 10.0 or face_width <= 10.0:
        return None

    face_aspect_ratio = face_height / face_width

    upper_h = max(1.0, glabella[1] - top[1])
    mid_h = max(1.0, subnasale[1] - glabella[1])
    lower_h = max(1.0, menton[1] - subnasale[1])
    tot_thirds = upper_h + mid_h + lower_h

    upper_third = upper_h / tot_thirds
    middle_third = mid_h / tot_thirds
    lower_third = lower_h / tot_thirds

    golden_ratio_dev = (
        abs(upper_third - 0.3333) +
        abs(middle_third - 0.3333) +
        abs(lower_third - 0.3333)
    )

    temp_r, temp_l = xy_norm[IDX_TEMPLE_R], xy_norm[IDX_TEMPLE_L]
    exo_r, endo_r = xy_norm[IDX_EXO_R], xy_norm[IDX_ENDO_R]
    endo_l, exo_l = xy_norm[IDX_ENDO_L], xy_norm[IDX_EXO_L]

    total_w_fifths = abs(temp_l[0] - temp_r[0])
    if total_w_fifths > 10.0:
        w1 = abs(exo_r[0] - temp_r[0]) / total_w_fifths
        w2 = abs(endo_r[0] - exo_r[0]) / total_w_fifths
        w3 = abs(endo_l[0] - endo_r[0]) / total_w_fifths
        w4 = abs(exo_l[0] - endo_l[0]) / total_w_fifths
        w5 = abs(temp_l[0] - exo_l[0]) / total_w_fifths
        rule_of_fifths_dev = sum(abs(w - 0.20) for w in (w1, w2, w3, w4, w5))
    else:
        rule_of_fifths_dev = 0.15

    icd = abs(endo_l[0] - endo_r[0])
    alar_w = abs(xy_norm[IDX_ALA_L][0] - xy_norm[IDX_ALA_R][0])
    intercanthal_to_nasal_ratio = icd / max(alar_w, 1.0)
    biocular_w = abs(exo_l[0] - exo_r[0])
    eye_spacing_ratio = icd / max(biocular_w, 1.0)

    gonion_w = abs(xy_norm[IDX_GONION_L][0] - xy_norm[IDX_GONION_R][0])
    jaw_to_cheekbone_ratio = gonion_w / face_width
    forehead_w = abs(temp_l[0] - temp_r[0])
    forehead_to_cheekbone_ratio = forehead_w / face_width

    philtrum_h = max(1.0, stomion[1] - subnasale[1])
    chin_h = max(1.0, menton[1] - stomion[1])
    chin_to_philtrum_ratio = chin_h / philtrum_h
    lower_face_height_ratio = lower_h / face_height

    chin_angle = angle_deg(xy_norm[IDX_GONION_R], xy_norm[IDX_MENTON], xy_norm[IDX_GONION_L])
    mandibular_r = angle_deg(xy_norm[IDX_ZYGION_R], xy_norm[IDX_GONION_R], xy_norm[IDX_MENTON])
    mandibular_l = angle_deg(xy_norm[IDX_ZYGION_L], xy_norm[IDX_GONION_L], xy_norm[IDX_MENTON])
    mandibular_angle_asymmetry = abs(mandibular_r - mandibular_l)

    convexity_angle = angle_deg(pts[IDX_GLABELLA], pts[IDX_SUBNASALE], pts[IDX_POGONION])
    nasofacial_angle = angle_deg(pts[IDX_GLABELLA], pts[IDX_NASION], pts[IDX_PRONASALE])
    nasolabial_angle = angle_deg(pts[IDX_PRONASALE], pts[IDX_SUBNASALE], pts[IDX_LABRALE_SUPERIUS])

    pairs = [
        (IDX_EXO_R, IDX_EXO_L),
        (IDX_ENDO_R, IDX_ENDO_L),
        (IDX_ALA_R, IDX_ALA_L),
        (IDX_COMMISSURE_R, IDX_COMMISSURE_L),
        (IDX_ZYGION_R, IDX_ZYGION_L),
        (IDX_GONION_R, IDX_GONION_L),
    ]
    sym_diffs = []
    for r_idx, l_idx in pairs:
        dr = abs(xy_norm[r_idx][0])
        dl = abs(xy_norm[l_idx][0])
        max_d = max(dr, dl, 1.0)
        sym_diffs.append(abs(dr - dl) / max_d)
    bilateral_symmetry_index = 1.0 - float(np.mean(sym_diffs))

    eye_w_r = dist2d(xy_norm[IDX_EXO_R], xy_norm[IDX_ENDO_R])
    eye_w_l = dist2d(xy_norm[IDX_EXO_L], xy_norm[IDX_ENDO_L])
    eye_symmetry_ratio = min(eye_w_r, eye_w_l) / max(eye_w_r, eye_w_l, 1.0)

    mouth_w = abs(xy_norm[IDX_COMMISSURE_L][0] - xy_norm[IDX_COMMISSURE_R][0])
    upper_vermilion = max(0.5, stomion[1] - xy_norm[IDX_LABRALE_SUPERIUS][1])
    lower_vermilion = max(0.5, xy_norm[IDX_LABRALE_INFERIUS][1] - stomion[1])
    lip_fullness_ratio = (upper_vermilion + lower_vermilion) / max(mouth_w, 1.0)
    upper_to_lower_lip_ratio = upper_vermilion / lower_vermilion

    cheekbone_prominence = face_width / max(biocular_w, 1.0)
    chin_prominence_horizontal = abs(menton[0]) / face_width

    tilt_r = math.degrees(math.atan2(exo_r[1] - endo_r[1], exo_r[0] - endo_r[0]))
    tilt_l = math.degrees(math.atan2(endo_l[1] - exo_l[1], endo_l[0] - exo_l[0]))
    canthal_tilt_asymmetry = abs(tilt_r - tilt_l)

    alar_width_to_face_width = alar_w / face_width
    ipd = dist2d(xy_norm[IDX_IRIS_R], xy_norm[IDX_IRIS_L])
    mouth_width_to_ipd = mouth_w / max(ipd, 1.0)
    jawline_taper = gonion_w / face_width
    forehead_to_lower_face = upper_h / lower_h
    vertical_harmony_index = 1.0 - (float(np.std([upper_third, middle_third, lower_third])) / 0.3333)

    is_female = 1.0 if str(gender).lower() in ("female", "f", "หญิง") else 0.0
    is_asian = 1.0 if str(race).lower() in ("asian", "th", "thai") else 1.0

    return {
        "face_aspect_ratio": face_aspect_ratio,
        "upper_third_ratio": upper_third,
        "middle_third_ratio": middle_third,
        "lower_third_ratio": lower_third,
        "golden_ratio_deviation_vertical": golden_ratio_dev,
        "rule_of_fifths_deviation": rule_of_fifths_dev,
        "intercanthal_to_nasal_ratio": intercanthal_to_nasal_ratio,
        "eye_spacing_ratio": eye_spacing_ratio,
        "jaw_to_cheekbone_ratio": jaw_to_cheekbone_ratio,
        "forehead_to_cheekbone_ratio": forehead_to_cheekbone_ratio,
        "chin_to_philtrum_ratio": chin_to_philtrum_ratio,
        "lower_face_height_ratio": lower_face_height_ratio,
        "chin_angle_deg": chin_angle,
        "mandibular_angle_left_deg": mandibular_l,
        "mandibular_angle_right_deg": mandibular_r,
        "mandibular_angle_asymmetry_deg": mandibular_angle_asymmetry,
        "facial_convexity_angle_deg": convexity_angle,
        "nasofacial_angle_deg": nasofacial_angle,
        "nasolabial_angle_deg": nasolabial_angle,
        "bilateral_symmetry_index": bilateral_symmetry_index,
        "eye_symmetry_ratio": eye_symmetry_ratio,
        "lip_fullness_ratio": lip_fullness_ratio,
        "upper_to_lower_lip_ratio": upper_to_lower_lip_ratio,
        "cheekbone_prominence": cheekbone_prominence,
        "chin_midline_deviation": chin_prominence_horizontal,
        "canthal_tilt_right_deg": tilt_r,
        "canthal_tilt_left_deg": tilt_l,
        "canthal_tilt_asymmetry_deg": canthal_tilt_asymmetry,
        "alar_width_to_face_width_ratio": alar_width_to_face_width,
        "mouth_width_to_ipd_ratio": mouth_width_to_ipd,
        "jawline_taper_ratio": jawline_taper,
        "forehead_to_lower_face_ratio": forehead_to_lower_face,
        "vertical_harmony_index": vertical_harmony_index,
        "is_female": is_female,
        "is_asian": is_asian,
    }


def predict_ai_harmony(
    pts: np.ndarray, gender: str = "female", race: str = "asian"
) -> AIHarmonyResult | None:
    """Predicts continuous Facial Harmony & computes feature impact breakdown."""
    feats = extract_features(pts, gender=gender, race=race)
    if feats is None:
        return None

    session, meta = get_session()
    feature_order: list[str] = meta["features"]
    input_vector = np.array([[feats.get(f, 0.0) for f in feature_order]], dtype=np.float32)

    # ONNX inference
    input_name = session.get_inputs()[0].name
    raw_pred = float(session.run(None, {input_name: input_vector})[0].flatten()[0])

    # Calibrate to 0-100 scale & Percentile
    # Training set mean ~3.18, std ~0.68
    stats = meta.get("training_stats", {})
    mean_score = stats.get("score_mean", 3.18)
    std_score = stats.get("score_std", 0.68)

    z_score = (raw_pred - mean_score) / max(std_score, 0.01)
    # CDF for percentile
    percentile = float(0.5 * (1.0 + math.erf(z_score / math.sqrt(2.0))) * 100.0)
    percentile = max(1.0, min(99.0, percentile))

    # Continuous score mapped to 0-100
    overall_score = round(max(10.0, min(98.0, 50.0 + z_score * 16.0)), 1)

    if overall_score >= 85.0:
        r_th, r_en = "โครงหน้าสมดุลกลมกลืนระดับยอดเยี่ยม (Exceptional Balance)", "Exceptional Balance"
    elif overall_score >= 75.0:
        r_th, r_en = "โครงหน้าสมดุลระดับสูง (High Harmony)", "High Harmony"
    elif overall_score >= 60.0:
        r_th, r_en = "โครงหน้าได้สัดส่วนมาตรฐาน (Well-Balanced)", "Well-Balanced"
    else:
        r_th, r_en = "มีความเบี่ยงเบนสัดส่วนบางจุด (Moderate Proportion Variance)", "Moderate Proportion Variance"

    # Feature attribution computation
    medians = meta.get("feature_medians", {})
    stds = meta.get("feature_stds", {})
    importance_list = meta.get("feature_importance", [])
    importance_map = {item["feature"]: item["importance"] for item in importance_list}

    attributions: list[FeatureAttribution] = []
    for f in feature_order:
        if f in ("is_female", "is_asian"):
            continue
        val = feats.get(f, 0.0)
        med = medians.get(f, val)
        std = stds.get(f, 1.0)
        imp = importance_map.get(f, 0.01)

        # Standardized deviation
        dev_z = abs(val - med) / max(std, 1e-4)
        is_positive = dev_z < 0.8  # close to population gold standard
        impact_score = round(imp * (1.5 - min(dev_z, 2.0)) * 10.0, 2)

        lbl = FEATURE_LABELS.get(f, {
            "th": f.replace("_", " ").title(),
            "en": f.replace("_", " ").title(),
            "unit": "",
            "ideal_desc": "สอดคล้องกับเกณฑ์มาตรฐานกายวิภาค",
        })

        attributions.append(
            FeatureAttribution(
                feature=f,
                name_th=lbl["th"],
                name_en=lbl["en"],
                user_value=round(val, 3),
                reference_median=round(med, 3),
                impact_score=impact_score,
                is_positive=is_positive,
                description=lbl["ideal_desc"],
            )
        )

    # Sort strengths and improvements
    strengths = sorted([a for a in attributions if a.is_positive], key=lambda x: x.impact_score, reverse=True)[:4]
    improvements = sorted([a for a in attributions if not a.is_positive], key=lambda x: x.impact_score)[:4]

    return AIHarmonyResult(
        overall_score=overall_score,
        raw_model_score=round(raw_pred, 3),
        percentile=round(percentile, 1),
        rating_th=r_th,
        rating_en=r_en,
        key_strengths=strengths,
        key_improvements=improvements,
        total_features_evaluated=len(attributions),
    )
