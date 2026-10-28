"""
Affine Roll Alignment for No-Reject Facial Analysis.
Ported and adapted from DSI314 data cleaning pipeline.
Eliminates camera/head roll angle by leveling the eye pupils.
"""

from __future__ import annotations

from typing import Tuple
import cv2
import numpy as np


def compute_roll_angle(landmarks_xy: np.ndarray) -> Tuple[float, np.ndarray, np.ndarray]:
    """
    Computes roll angle in degrees and returns (roll_deg, left_pupil, right_pupil).
    Uses MediaPipe iris landmarks 468 & 473 if available, otherwise canthi midpoints.
    """
    num_lms = len(landmarks_xy)
    if num_lms >= 478:
        left_pupil = landmarks_xy[468]
        right_pupil = landmarks_xy[473]
    else:
        # Landmark indices for canthi
        left_pupil = (landmarks_xy[133] + landmarks_xy[33]) / 2.0
        right_pupil = (landmarks_xy[362] + landmarks_xy[263]) / 2.0

    dx = float(right_pupil[0] - left_pupil[0])
    dy = float(right_pupil[1] - left_pupil[1])
    roll_rad = np.arctan2(dy, dx)
    roll_deg = float(np.degrees(roll_rad))
    return roll_deg, left_pupil, right_pupil


def affine_align_face(image_rgb: np.ndarray, landmarks_xy: np.ndarray) -> Tuple[np.ndarray, float]:
    """
    Performs 2D affine roll rotation around mid-eye point so eyes are horizontally level (roll = 0.0).
    Returns (aligned_image_rgb, roll_deg).
    """
    roll_deg, left_pupil, right_pupil = compute_roll_angle(landmarks_xy)

    # If roll is already negligible (< 0.2 deg), skip rotation
    if abs(roll_deg) < 0.2:
        return image_rgb, roll_deg

    mid_eye = ((left_pupil[0] + right_pupil[0]) / 2.0, (left_pupil[1] + right_pupil[1]) / 2.0)
    h, w = image_rgb.shape[:2]

    # cv2.getRotationMatrix2D angle is in degrees counter-clockwise
    M = cv2.getRotationMatrix2D(tuple(mid_eye), roll_deg, 1.0)
    aligned_rgb = cv2.warpAffine(
        image_rgb,
        M,
        (w, h),
        flags=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_REFLECT,
    )
    return aligned_rgb, roll_deg
