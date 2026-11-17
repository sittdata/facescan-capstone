"""Deep Semantic Segmentation & Hybrid Fallback for Forehead Hairline (Trichion).

Uses models/hairline_segmenter.onnx (MobileNetV3-UNet) to predict forehead skin-hair
boundaries and extract the hairline curve and central trichion landmark.
If the forehead is heavily occluded by thick bangs, automatically falls back to
models/trichion_regressor.onnx.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import onnxruntime as ort

from facescan.core.geometry import dist

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_PATH = ROOT_DIR / "models" / "hairline_segmenter.onnx"
METADATA_PATH = ROOT_DIR / "models" / "hairline_metadata.json"

IMG_SIZE = 256
IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(1, 1, 3)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(1, 1, 3)


@dataclass(frozen=True)
class HairlineSegmentationResult:
    trichion: np.ndarray | None  # (2,) [x, y] in original image coordinates
    hairline_curve: list[tuple[float, float]]  # list of [x, y] points along the hairline
    forehead_skin_ratio: float  # fraction of forehead ROI covered by visible skin
    is_occluded_bangs: bool  # True if bangs or hair obscure the forehead
    method: str  # "deep_segmentation" | "anatomical_regression"
    confidence: float


_SESSION: ort.InferenceSession | None = None
_METADATA: dict[str, Any] | None = None


def get_segmenter_session() -> tuple[ort.InferenceSession, dict[str, Any]]:
    global _SESSION, _METADATA
    if _SESSION is None:
        if not MODEL_PATH.is_file():
            raise FileNotFoundError(f"Hairline segmenter model not found: {MODEL_PATH}")
        _SESSION = ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])
    if _METADATA is None:
        if METADATA_PATH.is_file():
            with open(METADATA_PATH, "r", encoding="utf-8") as f:
                _METADATA = json.load(f)
        else:
            _METADATA = {}
    return _SESSION, _METADATA


def crop_forehead_roi(
    rgb: np.ndarray, landmarks_xy: np.ndarray
) -> tuple[np.ndarray, dict[str, float]]:
    """Crops the forehead ROI above glabella using anatomical landmarks."""
    h, w = rgb.shape[:2]

    # Landmark 9 = glabella, 10 = mesh_top, 234 = right cheek, 454 = left cheek
    gla = landmarks_xy[9]
    top = landmarks_xy[10]
    zyg_r, zyg_l = landmarks_xy[234], landmarks_xy[454]

    face_w = dist(zyg_r, zyg_l)
    face_h = dist(gla, landmarks_xy[152])  # glabella to menton

    # Target box around the upper face & hair
    center_x = (zyg_r[0] + zyg_l[0]) / 2.0
    crop_w = face_w * 1.3
    crop_h = face_h * 1.0

    x_min = max(0, int(center_x - crop_w / 2.0))
    x_max = min(w, int(center_x + crop_w / 2.0))
    y_min = max(0, int(gla[1] - crop_h * 0.85))
    y_max = min(h, int(gla[1] + crop_h * 0.25))

    crop = rgb[y_min:y_max, x_min:x_max]
    crop_resized = cv2.resize(crop, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_LINEAR)

    meta = {
        "x_min": float(x_min),
        "x_max": float(x_max),
        "y_min": float(y_min),
        "y_max": float(y_max),
        "crop_w": float(x_max - x_min),
        "crop_h": float(y_max - y_min),
        "center_x": float(center_x),
        "glabella_y": float(gla[1]),
    }
    return crop_resized, meta


def extract_hairline_curve_from_mask(
    prob_mask: np.ndarray, meta: dict[str, float], threshold: float = 0.5
) -> tuple[np.ndarray | None, list[tuple[float, float]], float]:
    """Finds the skin-hair boundary curve and central trichion from 256x256 skin mask."""
    bin_mask = (prob_mask > threshold).astype(np.uint8)
    skin_ratio = float(bin_mask.mean())

    if skin_ratio < 0.05:
        # Full occlusion (bangs completely cover the forehead)
        return None, [], skin_ratio

    # Smooth the mask to remove tiny noise
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    bin_mask = cv2.morphologyEx(bin_mask, cv2.MORPH_CLOSE, kernel)

    # For each column in the central 70% width, find the highest skin pixel (lowest row index y)
    curve_points_crop = []
    x_start = int(0.15 * IMG_SIZE)
    x_end = int(0.85 * IMG_SIZE)

    for x in range(x_start, x_end, 4):
        col = bin_mask[:, x]
        skin_rows = np.where(col == 1)[0]
        if len(skin_rows) > 0:
            top_y = skin_rows.min()
            curve_points_crop.append((float(x), float(top_y)))

    if len(curve_points_crop) < 5:
        return None, [], skin_ratio

    # Map back to original image space
    scale_x = meta["crop_w"] / float(IMG_SIZE)
    scale_y = meta["crop_h"] / float(IMG_SIZE)

    curve_img: list[tuple[float, float]] = []
    for cx, cy in curve_points_crop:
        ox = meta["x_min"] + cx * scale_x
        oy = meta["y_min"] + cy * scale_y
        curve_img.append((round(ox, 2), round(oy, 2)))

    # Find the point closest to the central vertical line (center_x)
    center_x = meta["center_x"]
    best_pt = min(curve_img, key=lambda pt: abs(pt[0] - center_x))
    trichion = np.array([best_pt[0], best_pt[1]], dtype=np.float32)

    return trichion, curve_img, skin_ratio


def segment_hairline_hybrid(
    rgb: np.ndarray, landmarks_478: np.ndarray
) -> HairlineSegmentationResult:
    """Hybrid Hairline Segmenter: Deep UNet with automatic Trichion Regressor fallback."""
    landmarks_xy = landmarks_478[:, :2]
    crop, meta = crop_forehead_roi(rgb, landmarks_xy)

    # Preprocess
    inp = crop.astype(np.float32) / 255.0
    inp = (inp - IMAGENET_MEAN) / IMAGENET_STD
    inp = np.transpose(inp, (2, 0, 1))[np.newaxis, ...]  # (1, 3, 256, 256)

    session, _ = get_segmenter_session()
    ort_inputs = {session.get_inputs()[0].name: inp}
    logits = session.run(None, ort_inputs)[0][0, 0]  # (256, 256)
    probs = 1.0 / (1.0 + np.exp(-logits))

    trichion, curve, skin_ratio = extract_hairline_curve_from_mask(probs, meta)

    if trichion is not None and skin_ratio >= 0.12:
        return HairlineSegmentationResult(
            trichion=trichion,
            hairline_curve=curve,
            forehead_skin_ratio=round(skin_ratio, 3),
            is_occluded_bangs=False,
            method="deep_segmentation",
            confidence=0.92,
        )

    # Fallback to anatomically learned Trichion Regressor if occluded
    try:
        from facescan.core.trichion_model import get_regressor

        regressor = get_regressor()
        if regressor.is_available:
            pts_dict = {
                "mesh_top": landmarks_xy[10],
                "glabella": landmarks_xy[9],
                "nasion": landmarks_xy[168],
                "subnasale": landmarks_xy[2],
                "menton": landmarks_xy[152],
                "medial_canthus_right": landmarks_xy[133],
                "medial_canthus_left": landmarks_xy[362],
                "lateral_canthus_right": landmarks_xy[33],
                "lateral_canthus_left": landmarks_xy[263],
                "bizygomatic_right": landmarks_xy[234],
                "bizygomatic_left": landmarks_xy[454],
            }
            pred_pt = regressor.predict(pts_dict)
            if pred_pt is not None:
                return HairlineSegmentationResult(
                    trichion=pred_pt,
                    hairline_curve=[],
                    forehead_skin_ratio=round(skin_ratio, 3),
                    is_occluded_bangs=True,
                    method="anatomical_regression",
                    confidence=0.82,
                )
    except Exception:
        pass

    return HairlineSegmentationResult(
        trichion=landmarks_xy[10],  # mesh_top fallback
        hairline_curve=[],
        forehead_skin_ratio=round(skin_ratio, 3),
        is_occluded_bangs=True,
        method="mesh_top_fallback",
        confidence=0.50,
    )
