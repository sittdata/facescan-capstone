"""Trichion (Hairline) Regressor using ONNX Runtime.

Predicts the trichion position from cranial and facial landmarks when hairline
segmentation is obscured by bangs or hair cover, ensuring upper third metrics
remain available and accurate.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping

import numpy as np

from facescan.core.geometry import FaceAxes, dist
from facescan.core.hairline import HairlineResult

logger = logging.getLogger(__name__)

FEATURE_NAMES = (
    "mid_face_norm",
    "lower_face_norm",
    "mesh_top_norm",
    "bizygomatic_norm",
    "temporal_width_norm",
    "forehead_mid_151_norm",
    "forehead_r_109_norm",
    "forehead_r_108_norm",
    "forehead_l_338_norm",
    "forehead_l_337_norm",
    "forehead_curvature_norm",
    "forehead_width_norm",
)


def extract_cranial_features(xy: np.ndarray, pts: Mapping[str, np.ndarray], axes: FaceAxes) -> np.ndarray | None:
    """Extracts 12-dimensional scale- and roll-invariant anatomical features."""
    if "medial_canthus_right" not in pts or "medial_canthus_left" not in pts:
        return None
    icd = dist(pts["medial_canthus_right"], pts["medial_canthus_left"])
    if icd <= 1.0:
        return None

    needed = ("glabella", "subnasale", "menton", "mesh_top", "bizygomatic_right", "bizygomatic_left")
    if any(n not in pts for n in needed):
        return None

    gla = pts["glabella"]
    sn = pts["subnasale"]
    men = pts["menton"]
    mesh_top = pts["mesh_top"]

    # 1. Middle face proportion
    mid_face = (axes.v(sn) - axes.v(gla)) / icd
    # 2. Lower face proportion
    lower_face = (axes.v(men) - axes.v(sn)) / icd
    # 3. Top of mesh to glabella
    mesh_top_norm = (axes.v(gla) - axes.v(mesh_top)) / icd
    # 4. Bizygomatic width
    bizy_w = dist(pts["bizygomatic_right"], pts["bizygomatic_left"]) / icd

    # 5. Temporal width
    from facescan.core.frontal_points import temporal_boundary

    tb_r = pts.get("temporal_boundary_right")
    if tb_r is None:
        tb_r = temporal_boundary(xy, pts, axes, "right")
    if tb_r is None:
        tb_r = pts.get("bizygomatic_right")

    tb_l = pts.get("temporal_boundary_left")
    if tb_l is None:
        tb_l = temporal_boundary(xy, pts, axes, "left")
    if tb_l is None:
        tb_l = pts.get("bizygomatic_left")

    if tb_r is not None and tb_l is not None:
        temp_w = abs(axes.h(tb_l) - axes.h(tb_r)) / icd
    else:
        temp_w = bizy_w * 0.85

    # Forehead landmarks (MediaPipe indices)
    if len(xy) < 339:
        return None

    p151 = xy[151]
    p109 = xy[109]
    p108 = xy[108]
    p338 = xy[338]
    p337 = xy[337]

    f151 = (axes.v(gla) - axes.v(p151)) / icd
    f109 = (axes.v(gla) - axes.v(p109)) / icd
    f108 = (axes.v(gla) - axes.v(p108)) / icd
    f338 = (axes.v(gla) - axes.v(p338)) / icd
    f337 = (axes.v(gla) - axes.v(p337)) / icd

    # Forehead curvature and width
    f_curv = (axes.v(p151) - 0.5 * (axes.v(p109) + axes.v(p338))) / icd
    f_width = abs(axes.h(p338) - axes.h(p109)) / icd

    feats = np.array([
        mid_face, lower_face, mesh_top_norm, bizy_w, temp_w,
        f151, f109, f108, f338, f337,
        f_curv, f_width
    ], dtype=np.float32)

    if np.any(np.isnan(feats)) or np.any(np.isinf(feats)):
        return None
    return feats


class TrichionModel:
    """Inference wrapper for Trichion Regressor ONNX model."""

    def __init__(self, model_path: Path | str | None = None):
        self._session = None
        self.model_path = None
        if model_path is None:
            return

        path = Path(model_path)
        if not path.is_file():
            logger.warning("Trichion regressor model file not found: %s", path)
            return

        try:
            import onnxruntime as ort

            opts = ort.SessionOptions()
            opts.intra_op_num_threads = 1
            opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            self._session = ort.InferenceSession(str(path), sess_options=opts, providers=["CPUExecutionProvider"])
            self.model_path = path
            logger.info("Loaded Trichion regressor ONNX model from %s", path)
        except Exception as e:
            logger.warning("Failed to initialize ONNX runtime for Trichion regressor: %s", e)

    @property
    def is_available(self) -> bool:
        return self._session is not None

    def predict(self, xy: np.ndarray, pts: Mapping[str, np.ndarray], axes: FaceAxes) -> HairlineResult | None:
        """Predicts trichion position from cranial and facial landmarks.
        
        Returns HairlineResult with predicted (x, y) point and uncertainty standard deviation.
        """
        if not self.is_available:
            return None

        feats = extract_cranial_features(xy, pts, axes)
        if feats is None:
            return None

        try:
            input_tensor = feats.reshape(1, -1)
            outputs = self._session.run(["trichion_offset"], {"cranial_features": input_tensor})
            offset_y = float(outputs[0][0, 0])

            # Sanity filter on predicted offset
            if math.isnan(offset_y) or math.isinf(offset_y) or not (0.5 <= offset_y <= 3.5):
                logger.warning("Trichion regressor predicted unrealistic offset: %s", offset_y)
                return None

            icd = dist(pts["medial_canthus_right"], pts["medial_canthus_left"])
            gla = pts["glabella"]

            # Predicted trichion is offset_y * icd upward along midline (-axes.ey)
            up = -axes.ey
            point = gla + (offset_y * icd) * up

            # Uncertainty estimate based on model validation MAE (~0.19 * ICD in pixels)
            sd_px = float(0.19 * icd)

            return HairlineResult(point=point, sd_px=sd_px, reason=None)
        except Exception as e:
            logger.warning("Trichion regressor inference error: %s", e)
            return None
