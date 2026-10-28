"""
Face Warping Simulation Engine (Ported from DSI314).
Implements Thin Plate Spline (TPS) deformation with rigid boundary anchors,
anatomical landmark locks, and smooth feathered ROI blending.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np


class FaceWarper:
    """Core image deformation engine using Thin Plate Splines with boundary anchors."""

    CONTOUR_INDICES = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
    EYE_LEFT_INDICES = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
    EYE_RIGHT_INDICES = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
    BROW_LEFT_INDICES = [336, 296, 334, 293, 300, 276, 283, 282, 295, 285]
    BROW_RIGHT_INDICES = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46]
    LIP_INDICES = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 146, 91, 181, 84, 17, 314, 405, 321, 375]
    NOSE_INDICES = [168, 6, 197, 195, 5, 4, 1, 19, 94, 2, 98, 97, 279, 49, 102, 331]

    def __init__(self, grid_step: int = 4, regularization: float = 1e-4) -> None:
        self.grid_step = grid_step
        self.regularization = regularization

    @staticmethod
    def generate_boundary_anchors(
        image_shape: Tuple[int, int],
        num_per_side: int = 16,
        margin: int = 0
    ) -> np.ndarray:
        """Anchors along outer borders to lock background in place."""
        h, w = image_shape[:2]
        xs = np.linspace(margin, w - 1 - margin, num_per_side, dtype=np.float32)
        ys = np.linspace(margin, h - 1 - margin, num_per_side, dtype=np.float32)

        anchors = []
        for x in xs:
            anchors.append([x, float(margin)])
            anchors.append([x, float(h - 1 - margin)])
        for y in ys[1:-1]:
            anchors.append([float(margin), y])
            anchors.append([float(w - 1 - margin), y])

        return np.array(anchors, dtype=np.float32)

    @classmethod
    def get_standard_facial_anchors(
        cls,
        landmarks: np.ndarray,
        exclude_group: Optional[str] = None
    ) -> np.ndarray:
        """Fixed landmarks outside the operative region."""
        fixed_indices: List[int] = []
        fixed_indices.extend(cls.CONTOUR_INDICES)
        fixed_indices.extend(cls.BROW_LEFT_INDICES)
        fixed_indices.extend(cls.BROW_RIGHT_INDICES)

        if exclude_group != "eyes":
            fixed_indices.extend(cls.EYE_LEFT_INDICES)
            fixed_indices.extend(cls.EYE_RIGHT_INDICES)
        if exclude_group != "nose":
            fixed_indices.extend(cls.NOSE_INDICES)
        if exclude_group != "lips":
            fixed_indices.extend(cls.LIP_INDICES)

        unique_indices = sorted(list(set(fixed_indices)))
        valid_indices = [idx for idx in unique_indices if idx < len(landmarks)]
        return np.asarray(landmarks[valid_indices, :2], dtype=np.float32)

    @staticmethod
    def generate_ring_anchors(
        center: np.ndarray,
        radius: float,
        num_points: int = 16
    ) -> np.ndarray:
        """Circle of rigid anchors around operative area."""
        angles = np.linspace(0, 2.0 * np.pi, num_points, endpoint=False, dtype=np.float32)
        xs = center[0] + radius * np.cos(angles)
        ys = center[1] + radius * np.sin(angles)
        return np.column_stack([xs, ys]).astype(np.float32)

    @staticmethod
    def compute_feather_mask(
        image_shape: Tuple[int, int],
        center: np.ndarray,
        r_inner: float,
        r_outer: float
    ) -> np.ndarray:
        """Smoothstep radial falloff mask."""
        h, w = image_shape[:2]
        yy, xx = np.indices((h, w), dtype=np.float32)
        dist = np.sqrt((xx - center[0]) ** 2 + (yy - center[1]) ** 2)
        t = np.clip(1.0 - (dist - r_inner) / max(1e-6, (r_outer - r_inner)), 0.0, 1.0)
        alpha = t * t * (3.0 - 2.0 * t)
        return alpha.astype(np.float32)

    def solve_tps(
        self,
        src_points: np.ndarray,
        dst_points: np.ndarray,
        reg: Optional[float] = None
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Solve Thin Plate Spline weights."""
        if reg is None:
            reg = self.regularization

        n_pts = len(dst_points)
        disp = src_points - dst_points

        diff = dst_points[:, None, :] - dst_points[None, :, :]
        r2 = np.sum(diff ** 2, axis=-1)

        K = 0.5 * r2 * np.log(np.maximum(r2, 1e-12))
        K += reg * np.eye(n_pts, dtype=np.float32)

        P = np.hstack([np.ones((n_pts, 1), dtype=np.float32), dst_points])
        L_top = np.hstack([K, P])
        L_bottom = np.hstack([P.T, np.zeros((3, 3), dtype=np.float32)])
        L = np.vstack([L_top, L_bottom])

        V = np.vstack([disp, np.zeros((3, 2), dtype=np.float32)])

        try:
            weights = np.linalg.solve(L, V)
        except np.linalg.LinAlgError:
            weights = np.linalg.pinv(L) @ V

        W = weights[:n_pts]
        A = weights[n_pts:]
        return W, A, dst_points

    @staticmethod
    def evaluate_tps_grid(
        grid_points: np.ndarray,
        W: np.ndarray,
        A: np.ndarray,
        ctrl_dst_points: np.ndarray
    ) -> np.ndarray:
        diff = grid_points[:, None, :] - ctrl_dst_points[None, :, :]
        r2 = np.sum(diff ** 2, axis=-1)
        K = 0.5 * r2 * np.log(np.maximum(r2, 1e-12))
        P = np.hstack([np.ones((len(grid_points), 1), dtype=np.float32), grid_points])
        return K @ W + P @ A

    def warp_image_tps(
        self,
        image: np.ndarray,
        src_points: np.ndarray,
        dst_points: np.ndarray,
        feather_mask: Optional[np.ndarray] = None,
        interpolation: int = cv2.INTER_CUBIC,
        border_mode: int = cv2.BORDER_REFLECT_101
    ) -> np.ndarray:
        h, w = image.shape[:2]
        W, A, ctrl_dst = self.solve_tps(src_points, dst_points)

        step = self.grid_step
        gx, gy = np.meshgrid(
            np.arange(0, w, step, dtype=np.float32),
            np.arange(0, h, step, dtype=np.float32)
        )
        grid_pts = np.column_stack([gx.ravel(), gy.ravel()])

        disp = self.evaluate_tps_grid(grid_pts, W, A, ctrl_dst)
        disp_x = cv2.resize(disp[:, 0].reshape(gx.shape), (w, h), interpolation=cv2.INTER_CUBIC)
        disp_y = cv2.resize(disp[:, 1].reshape(gx.shape), (w, h), interpolation=cv2.INTER_CUBIC)

        yy, xx = np.indices((h, w), dtype=np.float32)
        if feather_mask is not None:
            disp_x = disp_x * feather_mask
            disp_y = disp_y * feather_mask

        map_x = xx + disp_x
        map_y = yy + disp_y

        warped = cv2.remap(image, map_x, map_y, interpolation=interpolation, borderMode=border_mode)
        return warped
