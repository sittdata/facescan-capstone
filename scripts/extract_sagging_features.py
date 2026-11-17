#!/usr/bin/env python3
"""Feature Extraction ETL for Facial Aging & Sagging Tier Classification.

Extracts 12 clinical sagging, laxity, and mandibular contour features
from UTKFace benchmark images using MediaPipe FaceLandmarker (478 points).
Saves balanced dataset to dataset/facial_sagging_features.csv.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import cv2
import mediapipe as mp
import numpy as np
import pandas as pd
from mediapipe.tasks.python import BaseOptions, vision
from tqdm import tqdm

ROOT_DIR = Path(__file__).resolve().parent.parent
SUBSET_DIR = ROOT_DIR / "dataset" / "utkface_subset"
OUTPUT_CSV = ROOT_DIR / "dataset" / "facial_sagging_features.csv"
MODEL_PATH = ROOT_DIR / "models" / "face_landmarker.task"

# Key Landmarks
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


def dist2d(p1: np.ndarray, p2: np.ndarray) -> float:
    return float(np.hypot(p1[0] - p2[0], p1[1] - p2[1]))


def extract_sagging_features(pts: np.ndarray) -> dict[str, float] | None:
    xy = pts[:, :2]

    # Roll normalization
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
    jowl_sagging_index = (jowl_sag_r + jowl_sag_l) / 2.0

    # 2. Malar to Jaw Width Ratio (Triangle of Youth: inverted triangle vs pyramid)
    gonion_w = abs(gon_l[0] - gon_r[0])
    malar_to_jaw_ratio = face_w / max(gonion_w, 1.0)

    # 3. Lower Face Height Ratio
    lower_face_h = menton[1] - sn[1]
    lower_face_height_ratio = lower_face_h / face_h

    # 4. Oral Commissure Droop (Marionette line indicator)
    com_r = xy_norm[IDX_COMMISSURE_R]
    com_l = xy_norm[IDX_COMMISSURE_L]
    mouth_mid_y = stomion[1]
    commissure_droop_r = (com_r[1] - mouth_mid_y) / face_h  # >0: drooping
    commissure_droop_l = (com_l[1] - mouth_mid_y) / face_h
    oral_commissure_droop = (commissure_droop_r + commissure_droop_l) / 2.0

    # 5. Nasolabial Distance Ratio
    ala_mid = (xy_norm[IDX_ALA_R] + xy_norm[IDX_ALA_L]) / 2.0
    nasolabial_len = (dist2d(xy_norm[IDX_ALA_R], com_r) + dist2d(xy_norm[IDX_ALA_L], com_l)) / 2.0
    nasolabial_depth_ratio = nasolabial_len / lower_face_h

    # 6. Canthal Tilt (Eye corner drooping)
    exo_r, endo_r = xy_norm[IDX_EXO_R], xy_norm[IDX_ENDO_R]
    endo_l, exo_l = xy_norm[IDX_ENDO_L], xy_norm[IDX_EXO_L]
    tilt_r = math.degrees(math.atan2(exo_r[1] - endo_r[1], exo_r[0] - endo_r[0]))
    tilt_l = math.degrees(math.atan2(endo_l[1] - exo_l[1], endo_l[0] - exo_l[0]))
    mean_canthal_tilt = (tilt_r + tilt_l) / 2.0

    # 7. Jawline Contour Sharpness (Smoothness / linearity of gonion-menton curve)
    jaw_pts_r = np.array([xy_norm[i] for i in JAWLINE_RIGHT])
    dx_r = jaw_pts_r[:, 0] - jaw_pts_r[0, 0]
    dy_r = jaw_pts_r[:, 1] - jaw_pts_r[0, 1]
    poly_r = np.polyfit(dx_r, dy_r, deg=1, full=True)[1]
    res_r = float(poly_r[0]) if len(poly_r) > 0 else 0.0

    jaw_pts_l = np.array([xy_norm[i] for i in JAWLINE_LEFT])
    dx_l = jaw_pts_l[:, 0] - jaw_pts_l[0, 0]
    dy_l = jaw_pts_l[:, 1] - jaw_pts_l[0, 1]
    poly_l = np.polyfit(dx_l, dy_l, deg=1, full=True)[1]
    res_l = float(poly_l[0]) if len(poly_l) > 0 else 0.0

    jawline_irregularity = (res_r + res_l) / (face_h ** 2 + 1e-4)

    # 8. Chin to Philtrum Ratio
    philtrum_h = max(1.0, stomion[1] - sn[1])
    chin_h = max(1.0, menton[1] - stomion[1])
    chin_to_philtrum_ratio = chin_h / philtrum_h

    # 9. Mandibular Width to Face Width
    jawline_taper_ratio = gonion_w / face_w

    # 10. Midface to Lowerface Aspect
    midface_h = sn[1] - gla[1]
    midface_to_lowerface_ratio = midface_h / max(lower_face_h, 1.0)

    # 11. Face Aspect Ratio
    face_aspect_ratio = face_h / face_w

    # 12. Combined Sagging Index (Clinical composite heuristic)
    combined_sag_index = (
        (jowl_sagging_index * 100.0) * 0.35 +
        (1.45 - malar_to_jaw_ratio) * 25.0 * 0.30 +
        (oral_commissure_droop * 100.0) * 0.20 +
        (1.0 - (mean_canthal_tilt / 8.0)) * 15.0 * 0.15
    )

    return {
        "jowl_sagging_index": jowl_sagging_index,
        "malar_to_jaw_ratio": malar_to_jaw_ratio,
        "lower_face_height_ratio": lower_face_height_ratio,
        "oral_commissure_droop": oral_commissure_droop,
        "nasolabial_depth_ratio": nasolabial_depth_ratio,
        "mean_canthal_tilt_deg": mean_canthal_tilt,
        "jawline_irregularity": jawline_irregularity,
        "chin_to_philtrum_ratio": chin_to_philtrum_ratio,
        "jawline_taper_ratio": jawline_taper_ratio,
        "midface_to_lowerface_ratio": midface_to_lowerface_ratio,
        "face_aspect_ratio": face_aspect_ratio,
        "combined_sag_index": combined_sag_index,
    }


def main():
    print("Loading UTKFace shards...")
    dfs = [pd.read_parquet(SUBSET_DIR / f"utkface_shard{i}.parquet") for i in range(3)]
    df_all = pd.concat(dfs, ignore_index=True)

    # Filter adults (age 18-85)
    adults = df_all[(df_all["age"] >= 18) & (df_all["age"] <= 85)].copy()

    # Stratify into 3 Tiers
    t1 = adults[(adults["age"] >= 18) & (adults["age"] <= 32)].sample(n=1000, random_state=42)
    t2 = adults[(adults["age"] >= 33) & (adults["age"] <= 50)].sample(n=1000, random_state=42)
    t3 = adults[(adults["age"] >= 51) & (adults["age"] <= 85)].sample(n=1000, random_state=42)

    t1["tier"] = 1
    t1["tier_name"] = "Firm"
    t2["tier"] = 2
    t2["tier_name"] = "Moderate"
    t3["tier"] = 3
    t3["tier_name"] = "Advanced"

    dataset_sample = pd.concat([t1, t2, t3], ignore_index=True).sample(frac=1.0, random_state=42)
    print(f"Sampled balanced dataset: {len(dataset_sample)} faces (1000 per tier)")

    options = vision.FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(MODEL_PATH)),
        num_faces=1,
    )
    landmarker = vision.FaceLandmarker.create_from_options(options)

    rows = []
    failed = 0

    for idx, row in tqdm(dataset_sample.iterrows(), total=len(dataset_sample), desc="Extracting Sagging Features"):
        try:
            img_bytes = row["image"]["bytes"]
            img_np = np.frombuffer(img_bytes, np.uint8)
            img_bgr = cv2.imdecode(img_np, cv2.IMREAD_COLOR)
            if img_bgr is None:
                failed += 1
                continue
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
            res = landmarker.detect(mp_img)
            if not res.face_landmarks:
                failed += 1
                continue

            h, w = img_rgb.shape[:2]
            lms = res.face_landmarks[0]
            pts = np.array([[lm.x * w, lm.y * h, lm.z * w] for lm in lms], dtype=np.float32)

            feats = extract_sagging_features(pts)
            if feats is None:
                failed += 1
                continue

            rows.append({
                "file_name": row["file_name"],
                "age": int(row["age"]),
                "gender": str(row["gender"]),
                "ethnicity": str(row["ethnicity"]),
                **feats,
                "sagging_tier": int(row["tier"]),
                "tier_name": str(row["tier_name"]),
            })
        except Exception:
            failed += 1

    landmarker.close()

    df_out = pd.DataFrame(rows)
    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    df_out.to_csv(OUTPUT_CSV, index=False)
    print(f"\nExtraction complete!")
    print(f"Successfully processed: {len(df_out)} images")
    print(f"Failed: {failed}")
    print(f"Saved dataset to: {OUTPUT_CSV}")
    print(f"Tier distribution:\n{df_out['tier_name'].value_counts()}")


if __name__ == "__main__":
    main()
