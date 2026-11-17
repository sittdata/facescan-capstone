#!/usr/bin/env python3
"""Feature Extraction ETL for Facial Harmony & Balance Analysis.

Extracts 32 clinical geometric and proportion features from SCUT-FBP5500 images
using MediaPipe FaceLandmarker (478 landmarks).
Saves the structured feature dataset to dataset/facial_harmony_features.csv.
"""

from __future__ import annotations

import math
import sys
import zipfile
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path
from typing import Any

import cv2
import mediapipe as mp
import numpy as np
import pandas as pd
from mediapipe.tasks.python import BaseOptions, vision
from tqdm import tqdm

ROOT_DIR = Path(__file__).resolve().parent.parent
ARCHIVE_ZIP = ROOT_DIR / "dataset" / "archive.zip"
OUTPUT_CSV = ROOT_DIR / "dataset" / "facial_harmony_features.csv"
MODEL_PATH = ROOT_DIR / "models" / "face_landmarker.task"

# Anatomical landmark mapping (MediaPipe 478 points)
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


def extract_features_from_landmarks(pts: np.ndarray) -> dict[str, float] | None:
    """Computes 32 clinical proportion & balance metrics from 478 3D landmarks."""
    xy = pts[:, :2]

    # Face orientation normalization (roll removal)
    eye_r = xy[IDX_IRIS_R]
    eye_l = xy[IDX_IRIS_L]
    d_eye = eye_l - eye_r
    angle = math.atan2(d_eye[1], d_eye[0])
    cos_a, sin_a = math.cos(-angle), math.sin(-angle)
    rot_mat = np.array([[cos_a, -sin_a], [sin_a, cos_a]])
    mid_eyes = (eye_r + eye_l) / 2.0
    xy_norm = (xy - mid_eyes) @ rot_mat.T

    # Vertical landmarks
    top = xy_norm[IDX_MESH_TOP]
    glabella = xy_norm[IDX_GLABELLA]
    subnasale = xy_norm[IDX_SUBNASALE]
    stomion = (xy_norm[IDX_UPPER_LIP] + xy_norm[IDX_LOWER_LIP]) / 2.0
    menton = xy_norm[IDX_MENTON]

    face_height = menton[1] - top[1]
    if face_height <= 10.0:
        return None

    # Horizontal landmarks
    zyg_r, zyg_l = xy_norm[IDX_ZYGION_R], xy_norm[IDX_ZYGION_L]
    face_width = abs(zyg_l[0] - zyg_r[0])
    if face_width <= 10.0:
        return None

    # 1. Aspect ratio
    face_aspect_ratio = face_height / face_width

    # 2-4. Facial Thirds (Vertical Proportions)
    upper_h = max(1.0, glabella[1] - top[1])
    mid_h = max(1.0, subnasale[1] - glabella[1])
    lower_h = max(1.0, menton[1] - subnasale[1])
    tot_thirds = upper_h + mid_h + lower_h

    upper_third = upper_h / tot_thirds
    middle_third = mid_h / tot_thirds
    lower_third = lower_h / tot_thirds

    # 5. Golden Ratio vertical balance deviation
    golden_ratio_dev = (
        abs(upper_third - 0.3333) +
        abs(middle_third - 0.3333) +
        abs(lower_third - 0.3333)
    )

    # 6. Rule of Fifths (Horizontal Balance)
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

    # 7-8. Eyes & Nose Proportions
    icd = abs(endo_l[0] - endo_r[0])
    alar_w = abs(xy_norm[IDX_ALA_L][0] - xy_norm[IDX_ALA_R][0])
    intercanthal_to_nasal_ratio = icd / max(alar_w, 1.0)
    biocular_w = abs(exo_l[0] - exo_r[0])
    eye_spacing_ratio = icd / max(biocular_w, 1.0)

    # 9-10. Width Ratios
    gonion_w = abs(xy_norm[IDX_GONION_L][0] - xy_norm[IDX_GONION_R][0])
    jaw_to_cheekbone_ratio = gonion_w / face_width
    forehead_w = abs(temp_l[0] - temp_r[0])
    forehead_to_cheekbone_ratio = forehead_w / face_width

    # 11-12. Lower Face & Chin
    philtrum_h = max(1.0, stomion[1] - subnasale[1])
    chin_h = max(1.0, menton[1] - stomion[1])
    chin_to_philtrum_ratio = chin_h / philtrum_h
    lower_face_height_ratio = lower_h / face_height

    # 13-15. Angles
    chin_angle = angle_deg(xy_norm[IDX_GONION_R], xy_norm[IDX_MENTON], xy_norm[IDX_GONION_L])
    mandibular_r = angle_deg(xy_norm[IDX_ZYGION_R], xy_norm[IDX_GONION_R], xy_norm[IDX_MENTON])
    mandibular_l = angle_deg(xy_norm[IDX_ZYGION_L], xy_norm[IDX_GONION_L], xy_norm[IDX_MENTON])
    mandibular_angle_asymmetry = abs(mandibular_r - mandibular_l)

    # 16. Facial Convexity Angle (3D)
    convexity_angle = angle_deg(pts[IDX_GLABELLA], pts[IDX_SUBNASALE], pts[IDX_POGONION])

    # 17. Nasofacial Angle
    nasofacial_angle = angle_deg(pts[IDX_GLABELLA], pts[IDX_NASION], pts[IDX_PRONASALE])

    # 18. Nasolabial Angle
    nasolabial_angle = angle_deg(pts[IDX_PRONASALE], pts[IDX_SUBNASALE], pts[IDX_LABRALE_SUPERIUS])

    # 19. Bilateral Facial Symmetry Index
    # Compare distances of bilateral landmarks to the vertical facial midline (x=0 in xy_norm)
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

    # 20. Eye Symmetry
    eye_w_r = dist2d(xy_norm[IDX_EXO_R], xy_norm[IDX_ENDO_R])
    eye_w_l = dist2d(xy_norm[IDX_EXO_L], xy_norm[IDX_ENDO_L])
    eye_symmetry_ratio = min(eye_w_r, eye_w_l) / max(eye_w_r, eye_w_l, 1.0)

    # 21-22. Lips & Mouth
    mouth_w = abs(xy_norm[IDX_COMMISSURE_L][0] - xy_norm[IDX_COMMISSURE_R][0])
    upper_vermilion = max(0.5, stomion[1] - xy_norm[IDX_LABRALE_SUPERIUS][1])
    lower_vermilion = max(0.5, xy_norm[IDX_LABRALE_INFERIUS][1] - stomion[1])
    lip_fullness_ratio = (upper_vermilion + lower_vermilion) / max(mouth_w, 1.0)
    upper_to_lower_lip_ratio = upper_vermilion / lower_vermilion

    # 23-24. Prominence & Cheeks
    cheekbone_prominence = face_width / max(biocular_w, 1.0)
    chin_prominence_horizontal = abs(menton[0]) / face_width  # Chin deviation from central vertical

    # 25-27. Canthal Tilt
    tilt_r = math.degrees(math.atan2(exo_r[1] - endo_r[1], exo_r[0] - endo_r[0]))
    tilt_l = math.degrees(math.atan2(endo_l[1] - exo_l[1], endo_l[0] - exo_l[0]))
    canthal_tilt_asymmetry = abs(tilt_r - tilt_l)

    # 28-32. Compound Indices
    alar_width_to_face_width = alar_w / face_width
    ipd = dist2d(xy_norm[IDX_IRIS_R], xy_norm[IDX_IRIS_L])
    mouth_width_to_ipd = mouth_w / max(ipd, 1.0)
    jawline_taper = gonion_w / face_width
    forehead_to_lower_face = upper_h / lower_h
    vertical_harmony_index = 1.0 - (float(np.std([upper_third, middle_third, lower_third])) / 0.3333)

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
    }


def process_dataset(max_samples: int | None = None) -> None:
    print(f"Reading labels and images from: {ARCHIVE_ZIP}")
    z = zipfile.ZipFile(ARCHIVE_ZIP)
    raw_labels = z.read("labels.txt").decode("utf-8").strip().splitlines()

    label_entries = []
    for line in raw_labels:
        parts = line.strip().split()
        if len(parts) >= 2:
            fname, score = parts[0], float(parts[1])
            label_entries.append((fname, score))

    if max_samples:
        label_entries = label_entries[:max_samples]

    print(f"Total labelled samples to process: {len(label_entries)}")

    # Initialize Face Landmarker
    options = vision.FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(MODEL_PATH)),
        num_faces=1,
    )
    landmarker = vision.FaceLandmarker.create_from_options(options)

    # Pre-map zip entries for O(1) lookup
    zip_namelist = set(z.namelist())

    rows: list[dict[str, Any]] = []
    failed = 0

    for fname, score in tqdm(label_entries, desc="Extracting Facial Features"):
        zip_path = f"Images/Images/{fname}"
        if zip_path not in zip_namelist:
            # Fallback
            zip_path = fname

        if zip_path not in zip_namelist:
            failed += 1
            continue

        try:
            img_bytes = z.read(zip_path)
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

            # Convert 478 NormalizedLandmark to (478, 3) pixel array
            h, w = img_rgb.shape[:2]
            lms = res.face_landmarks[0]
            pts = np.array([[lm.x * w, lm.y * h, lm.z * w] for lm in lms], dtype=np.float32)

            feats = extract_features_from_landmarks(pts)
            if feats is None:
                failed += 1
                continue

            prefix = fname[:2].upper()
            race = "Asian" if prefix in ("AF", "AM") else "Caucasian"
            gender = "Female" if "F" in prefix else "Male"

            row = {
                "image_name": fname,
                "race": race,
                "gender": gender,
                **feats,
                "harmony_score": score,
            }
            rows.append(row)

        except Exception as e:
            failed += 1

    landmarker.close()
    z.close()

    df = pd.DataFrame(rows)
    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_CSV, index=False)
    print(f"\nExtraction complete!")
    print(f"Successfully processed: {len(df)} images")
    print(f"Failed / No face detected: {failed}")
    print(f"Saved dataset to: {OUTPUT_CSV}")
    print(f"Dataset shape: {df.shape}")


if __name__ == "__main__":
    max_s = int(sys.argv[1]) if len(sys.argv) > 1 else None
    process_dataset(max_s)
