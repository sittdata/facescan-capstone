"""FaceMesh landmark definitions and morphological aging / laxity analysis.

Provides canonical landmark indices, geometric extraction utilities,
and integration for facial sagging tier and laxity scoring from MediaPipe 478 landmarks.
"""

from __future__ import annotations

from typing import Any

import numpy as np

from facescan.core.sagging_model import (
    FEATURE_NAMES,
    IDX_ALA_L,
    IDX_ALA_R,
    IDX_COMMISSURE_L,
    IDX_COMMISSURE_R,
    IDX_ENDO_L,
    IDX_ENDO_R,
    IDX_EXO_L,
    IDX_EXO_R,
    IDX_GLABELLA,
    IDX_GONION_L,
    IDX_GONION_R,
    IDX_LOWER_LIP,
    IDX_MENTON,
    IDX_MESH_TOP,
    IDX_NASION,
    IDX_SUBNASALE,
    IDX_UPPER_LIP,
    IDX_ZYGION_L,
    IDX_ZYGION_R,
    JAWLINE_LEFT,
    JAWLINE_RIGHT,
    TIER_NAMES,
    extract_sagging_features,
    predict_sagging,
)
from pathlib import Path
from facescan.core.schema import FacialSaggingResultModel

_DEFAULT_DETECTOR = None


def _get_face_detector():
    global _DEFAULT_DETECTOR
    if _DEFAULT_DETECTOR is None:
        from facescan.core.detector import FaceDetector
        task_path = Path(__file__).resolve().parent.parent.parent / "models" / "face_landmarker.task"
        if task_path.is_file():
            _DEFAULT_DETECTOR = FaceDetector(task_path)
    return _DEFAULT_DETECTOR


def extract_landmarks_points(landmarks: Any) -> np.ndarray | None:
    """Extract (N, 2) float64 numpy array from landmarks objects or array."""
    if landmarks is None:
        return None
    if isinstance(landmarks, np.ndarray):
        if landmarks.ndim != 2:
            return None
        return landmarks[:, :2].astype(np.float64)
    if isinstance(landmarks, (list, tuple)):
        pts = []
        for lm in landmarks:
            if hasattr(lm, "x") and hasattr(lm, "y"):
                pts.append([lm.x, lm.y])
            elif isinstance(lm, dict) and "x" in lm and "y" in lm:
                pts.append([lm["x"], lm["y"]])
            elif isinstance(lm, (list, tuple)) and len(lm) >= 2:
                pts.append([lm[0], lm[1]])
            else:
                return None
        return np.array(pts, dtype=np.float64)
    return None


def analyze_facemesh_sagging(landmarks_or_image: Any) -> FacialSaggingResultModel | None:
    """Analyze MediaPipe facemesh landmarks or RGB/BGR image for facial sagging."""
    if landmarks_or_image is None:
        return None
    if isinstance(landmarks_or_image, np.ndarray) and landmarks_or_image.ndim == 3:
        try:
            det = _get_face_detector()
            if det is None:
                return None
            img = landmarks_or_image
            # If BGR (OpenCV), convert to RGB
            if img.shape[2] == 3:
                rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB) if "cv2" in globals() else img[:, :, ::-1]
            else:
                rgb = img
            dets = det.detect(rgb)
            if not dets:
                return None
            return predict_sagging(dets[0].landmarks)
        except Exception:
            return None
    return predict_sagging(landmarks_or_image)


__all__ = [
    "FEATURE_NAMES",
    "IDX_ALA_L",
    "IDX_ALA_R",
    "IDX_COMMISSURE_L",
    "IDX_COMMISSURE_R",
    "IDX_ENDO_L",
    "IDX_ENDO_R",
    "IDX_EXO_L",
    "IDX_EXO_R",
    "IDX_GLABELLA",
    "IDX_GONION_L",
    "IDX_GONION_R",
    "IDX_LOWER_LIP",
    "IDX_MENTON",
    "IDX_MESH_TOP",
    "IDX_NASION",
    "IDX_SUBNASALE",
    "IDX_UPPER_LIP",
    "IDX_ZYGION_L",
    "IDX_ZYGION_R",
    "JAWLINE_LEFT",
    "JAWLINE_RIGHT",
    "TIER_NAMES",
    "analyze_facemesh_sagging",
    "extract_landmarks_points",
    "extract_sagging_features",
    "predict_sagging",
]
