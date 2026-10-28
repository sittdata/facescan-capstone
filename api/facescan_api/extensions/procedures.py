"""
Aesthetic Procedure Deformation Rules (Ported from DSI314).
Translates procedure intensities (0.0 to 1.0) into landmark displacements for:
- Rhinoplasty (Alar reduction, tip lift)
- Lip Augmentation (Upper & lower vermilion fullness)
- Chin Augmentation (Vertical elongation, tapering)
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import numpy as np

from facescan_api.extensions.warper import FaceWarper


class DeformationRules:
    """Manages clinical anatomical landmark displacements for surgical simulation."""

    # Nose landmarks
    NOSE_PRONASALE = 4       # Tip
    NOSE_SUBNASALE = 2       # Base
    NOSE_RHINION = 197       # Mid-bridge
    NOSE_SELLION = 168       # Nasion
    NOSE_ALAR_L = 279
    NOSE_ALAR_R = 49
    NOSE_ALAR_CREASE_L = 358
    NOSE_ALAR_CREASE_R = 129
    NOSE_COLUMELLA = 1
    NOSE_TIP_SUPRA = 5

    # Lip landmarks
    LIP_UPPER_TUBERCLE = 0
    LIP_CUPID_PEAK_R = 37
    LIP_CUPID_PEAK_L = 267
    LIP_UPPER_VERMILION_R = 39
    LIP_UPPER_VERMILION_L = 269
    LIP_LOWER_MID = 17
    LIP_LOWER_SUB_R = 84
    LIP_LOWER_SUB_L = 314
    LIP_CORNER_R = 61
    LIP_CORNER_L = 291

    # Chin landmarks
    CHIN_MENTON = 152
    CHIN_POGONION = 199
    CHIN_GNATHION = 175
    CHIN_SUBMENTAL = 200
    CHIN_BORDER_R1 = 377
    CHIN_BORDER_L1 = 148
    CHIN_BORDER_R2 = 400
    CHIN_BORDER_L2 = 176

    def __init__(self, warper: Optional[FaceWarper] = None) -> None:
        self.warper = warper or FaceWarper(grid_step=4, regularization=1e-3)

    @staticmethod
    def _get_interpupillary_distance(landmarks: np.ndarray) -> float:
        """Computes IPD for scale-invariant displacement calculations."""
        left_eye = (landmarks[362, :2] + landmarks[263, :2]) * 0.5
        right_eye = (landmarks[33, :2] + landmarks[133, :2]) * 0.5
        ipd = float(np.linalg.norm(left_eye - right_eye))
        return max(ipd, 40.0)

    def apply_rhinoplasty(
        self,
        image: np.ndarray,
        landmarks: np.ndarray,
        intensity: float = 0.5,
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        intensity = float(np.clip(intensity, 0.0, 1.0))
        if intensity <= 0.0:
            return image.copy(), {"procedure": "rhinoplasty", "intensity": 0.0}

        pts_2d = np.asarray(landmarks[:, :2], dtype=np.float32)
        ipd = self._get_interpupillary_distance(pts_2d)
        h, w = image.shape[:2]

        tip_orig = pts_2d[self.NOSE_PRONASALE].copy()
        sub_orig = pts_2d[self.NOSE_SUBNASALE].copy()
        alar_l_orig = pts_2d[self.NOSE_ALAR_L].copy()
        alar_r_orig = pts_2d[self.NOSE_ALAR_R].copy()
        crease_l_orig = pts_2d[self.NOSE_ALAR_CREASE_L].copy()
        crease_r_orig = pts_2d[self.NOSE_ALAR_CREASE_R].copy()

        displacements: Dict[int, np.ndarray] = {}

        # Alar reduction
        max_alar_shift = 0.08 * ipd * intensity
        displacements[self.NOSE_ALAR_L] = alar_l_orig + np.array([-max_alar_shift, 0.0], dtype=np.float32)
        displacements[self.NOSE_ALAR_R] = alar_r_orig + np.array([max_alar_shift, 0.0], dtype=np.float32)
        displacements[self.NOSE_ALAR_CREASE_L] = crease_l_orig + np.array([-max_alar_shift * 0.5, 0.0], dtype=np.float32)
        displacements[self.NOSE_ALAR_CREASE_R] = crease_r_orig + np.array([max_alar_shift * 0.5, 0.0], dtype=np.float32)

        # Tip lift
        dy_lift = -0.09 * ipd * intensity
        displacements[self.NOSE_PRONASALE] = tip_orig + np.array([0.0, dy_lift], dtype=np.float32)
        displacements[self.NOSE_COLUMELLA] = pts_2d[self.NOSE_COLUMELLA] + np.array([0.0, dy_lift * 0.6], dtype=np.float32)
        displacements[self.NOSE_TIP_SUPRA] = pts_2d[self.NOSE_TIP_SUPRA] + np.array([0.0, dy_lift * 0.4], dtype=np.float32)

        src_active = [pts_2d[idx] for idx in displacements.keys()]
        dst_active = [displacements[idx] for idx in displacements.keys()]

        fixed_nose_idx = [self.NOSE_SELLION, self.NOSE_RHINION, 6, 195]
        fixed_nose_pts = [pts_2d[idx] for idx in fixed_nose_idx if idx not in displacements]

        center_nose = (tip_orig + sub_orig) * 0.5
        r_inner = 0.70 * ipd
        r_outer = 1.35 * ipd
        ring_anchors = self.warper.generate_ring_anchors(center_nose, radius=r_outer * 0.95, num_points=16)
        facial_anchors = self.warper.get_standard_facial_anchors(pts_2d, exclude_group="nose")
        border_anchors = self.warper.generate_boundary_anchors((h, w), num_per_side=12)

        fixed_all = np.vstack([fixed_nose_pts, ring_anchors, facial_anchors, border_anchors])
        src_pts = np.vstack([src_active, fixed_all]).astype(np.float32)
        dst_pts = np.vstack([dst_active, fixed_all]).astype(np.float32)

        feather = self.warper.compute_feather_mask((h, w), center=center_nose, r_inner=r_inner, r_outer=r_outer)
        warped = self.warper.warp_image_tps(image, src_pts, dst_pts, feather_mask=feather)

        return warped, {"procedure": "rhinoplasty", "intensity": intensity}

    def apply_lip_augmentation(
        self,
        image: np.ndarray,
        landmarks: np.ndarray,
        intensity: float = 0.5,
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        intensity = float(np.clip(intensity, 0.0, 1.0))
        if intensity <= 0.0:
            return image.copy(), {"procedure": "lip_augmentation", "intensity": 0.0}

        pts_2d = np.asarray(landmarks[:, :2], dtype=np.float32)
        ipd = self._get_interpupillary_distance(pts_2d)
        h, w = image.shape[:2]

        displacements: Dict[int, np.ndarray] = {}
        max_lip_shift = 0.05 * ipd * intensity

        # Upper lip fullness
        dy_upper = -max_lip_shift
        displacements[self.LIP_UPPER_TUBERCLE] = pts_2d[self.LIP_UPPER_TUBERCLE] + np.array([0.0, dy_upper], dtype=np.float32)
        displacements[self.LIP_CUPID_PEAK_R] = pts_2d[self.LIP_CUPID_PEAK_R] + np.array([0.0, dy_upper * 0.9], dtype=np.float32)
        displacements[self.LIP_CUPID_PEAK_L] = pts_2d[self.LIP_CUPID_PEAK_L] + np.array([0.0, dy_upper * 0.9], dtype=np.float32)

        # Lower lip fullness
        dy_lower = max_lip_shift
        displacements[self.LIP_LOWER_MID] = pts_2d[self.LIP_LOWER_MID] + np.array([0.0, dy_lower], dtype=np.float32)
        displacements[self.LIP_LOWER_SUB_R] = pts_2d[self.LIP_LOWER_SUB_R] + np.array([0.0, dy_lower * 0.8], dtype=np.float32)
        displacements[self.LIP_LOWER_SUB_L] = pts_2d[self.LIP_LOWER_SUB_L] + np.array([0.0, dy_lower * 0.8], dtype=np.float32)

        src_active = [pts_2d[idx] for idx in displacements.keys()]
        dst_active = [displacements[idx] for idx in displacements.keys()]

        # Fixed corners
        fixed_lip_idx = [self.LIP_CORNER_R, self.LIP_CORNER_L, self.NOSE_SUBNASALE]
        fixed_lip_pts = [pts_2d[idx] for idx in fixed_lip_idx]

        mouth_center = (pts_2d[self.LIP_CORNER_R] + pts_2d[self.LIP_CORNER_L]) * 0.5
        r_inner = 0.55 * ipd
        r_outer = 1.10 * ipd
        ring_anchors = self.warper.generate_ring_anchors(mouth_center, radius=r_outer * 0.95, num_points=16)
        facial_anchors = self.warper.get_standard_facial_anchors(pts_2d, exclude_group="lips")
        border_anchors = self.warper.generate_boundary_anchors((h, w), num_per_side=12)

        fixed_all = np.vstack([fixed_lip_pts, ring_anchors, facial_anchors, border_anchors])
        src_pts = np.vstack([src_active, fixed_all]).astype(np.float32)
        dst_pts = np.vstack([dst_active, fixed_all]).astype(np.float32)

        feather = self.warper.compute_feather_mask((h, w), center=mouth_center, r_inner=r_inner, r_outer=r_outer)
        warped = self.warper.warp_image_tps(image, src_pts, dst_pts, feather_mask=feather)

        return warped, {"procedure": "lip_augmentation", "intensity": intensity}

    def apply_chin_augmentation(
        self,
        image: np.ndarray,
        landmarks: np.ndarray,
        intensity: float = 0.5,
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        intensity = float(np.clip(intensity, 0.0, 1.0))
        if intensity <= 0.0:
            return image.copy(), {"procedure": "chin_augmentation", "intensity": 0.0}

        pts_2d = np.asarray(landmarks[:, :2], dtype=np.float32)
        ipd = self._get_interpupillary_distance(pts_2d)
        h, w = image.shape[:2]

        displacements: Dict[int, np.ndarray] = {}
        max_chin_shift = 0.09 * ipd * intensity
        dy = max_chin_shift

        displacements[self.CHIN_MENTON] = pts_2d[self.CHIN_MENTON] + np.array([0.0, dy], dtype=np.float32)
        displacements[self.CHIN_GNATHION] = pts_2d[self.CHIN_GNATHION] + np.array([0.0, dy * 0.9], dtype=np.float32)
        displacements[self.CHIN_POGONION] = pts_2d[self.CHIN_POGONION] + np.array([0.0, dy * 0.75], dtype=np.float32)
        displacements[self.CHIN_SUBMENTAL] = pts_2d[self.CHIN_SUBMENTAL] + np.array([0.0, dy * 0.85], dtype=np.float32)
        displacements[self.CHIN_BORDER_R1] = pts_2d[self.CHIN_BORDER_R1] + np.array([0.0, dy * 0.65], dtype=np.float32)
        displacements[self.CHIN_BORDER_L1] = pts_2d[self.CHIN_BORDER_L1] + np.array([0.0, dy * 0.65], dtype=np.float32)

        src_active = [pts_2d[idx] for idx in displacements.keys()]
        dst_active = [displacements[idx] for idx in displacements.keys()]

        fixed_chin_idx = [self.LIP_LOWER_MID, self.LIP_CORNER_R, self.LIP_CORNER_L, 0]
        fixed_chin_pts = [pts_2d[idx] for idx in fixed_chin_idx]

        chin_center = pts_2d[self.CHIN_POGONION].copy()
        chin_exclude = {self.CHIN_MENTON, self.CHIN_POGONION, self.CHIN_GNATHION, self.CHIN_SUBMENTAL,
                        self.CHIN_BORDER_R1, self.CHIN_BORDER_L1, self.CHIN_BORDER_R2, self.CHIN_BORDER_L2,
                        152, 148, 176, 149, 150, 136, 172, 58, 377, 378, 400, 379, 365, 397}
        facial_anchors = [pt for idx, pt in enumerate(pts_2d) if (idx not in chin_exclude and idx in (self.warper.BROW_LEFT_INDICES + self.warper.BROW_RIGHT_INDICES + self.warper.EYE_LEFT_INDICES + self.warper.EYE_RIGHT_INDICES + self.warper.NOSE_INDICES))]
        facial_anchors = np.asarray(facial_anchors, dtype=np.float32)

        dist_to_bottom = (h - 1) - chin_center[1]
        r_inner = max(20.0, 0.50 * ipd)
        r_outer = min(dist_to_bottom * 0.90, 1.25 * ipd)
        if r_outer <= r_inner:
            r_outer = r_inner + 15.0

        ring_anchors = self.warper.generate_ring_anchors(chin_center, radius=r_outer, num_points=16)
        border_anchors = self.warper.generate_boundary_anchors((h, w), num_per_side=16)

        fixed_all = np.vstack([fixed_chin_pts, ring_anchors, facial_anchors, border_anchors])
        src_pts = np.vstack([src_active, fixed_all]).astype(np.float32)
        dst_pts = np.vstack([dst_active, fixed_all]).astype(np.float32)

        feather = self.warper.compute_feather_mask((h, w), center=chin_center, r_inner=r_inner, r_outer=r_outer)
        warped = self.warper.warp_image_tps(image, src_pts, dst_pts, feather_mask=feather)

        return warped, {"procedure": "chin_augmentation", "intensity": intensity}

    def apply_composite_procedures(
        self,
        image: np.ndarray,
        landmarks: np.ndarray,
        rhino_intensity: float = 0.0,
        lip_intensity: float = 0.0,
        chin_intensity: float = 0.0
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        current_img = image.copy()
        history: Dict[str, Any] = {}

        if rhino_intensity > 0.0:
            current_img, meta_r = self.apply_rhinoplasty(current_img, landmarks, intensity=rhino_intensity)
            history["rhinoplasty"] = meta_r
        if lip_intensity > 0.0:
            current_img, meta_l = self.apply_lip_augmentation(current_img, landmarks, intensity=lip_intensity)
            history["lip_augmentation"] = meta_l
        if chin_intensity > 0.0:
            current_img, meta_c = self.apply_chin_augmentation(current_img, landmarks, intensity=chin_intensity)
            history["chin_augmentation"] = meta_c

        return current_img, history
