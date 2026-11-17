"""Named frontal points from one detection: mesh points, trichion, temporal boundaries.

This is the only place that turns raw detector output into named points.
Metrics are then a pure function of the named points (``metrics_frontal``), so a
full re-analysis with overrides and ``apply_overrides`` on a stored result give
the same values.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

import numpy as np

from facescan.core.config import CaptureSettings
from facescan.core.detector import FaceDetection, HairSegmenter
from facescan.core.geometry import FaceAxes, apply_affine, dist, intersect_polyline_with_line
from facescan.core.hairline import find_trichion, hair_fraction, segment_head
from facescan.core.landmark_map import FACE_OVAL_LEFT, FACE_OVAL_RIGHT, MESH_LANDMARKS
from facescan.core.normalize import face_axes

if TYPE_CHECKING:
    from facescan.core.trichion_model import TrichionModel


@dataclass
class ExtractedPoints:
    points: dict[str, np.ndarray]                         # available points, image coordinates
    reasons: dict[str, str] = field(default_factory=dict)  # unavailable derived points → reason
    extra_sd: dict[str, float] = field(default_factory=dict)  # e.g. trichion mask quantization

    def mapped(self, A: np.ndarray) -> "ExtractedPoints":
        """The same points under a 2×3 affine map (used to undo test-time augmentation)."""
        return ExtractedPoints({k: apply_affine(A, v) for k, v in self.points.items()},
                               dict(self.reasons), dict(self.extra_sd))


def mesh_points(xy: np.ndarray, width: int | None = None, height: int | None = None
                ) -> tuple[dict[str, np.ndarray], dict[str, str]]:
    """Named mesh points, and the names dropped because a source vertex lies outside the image.

    MediaPipe returns all 478 points even when part of the face is out of frame; those
    points are extrapolated, so they are reported ``unavailable``.
    """
    pts: dict[str, np.ndarray] = {}
    dropped: dict[str, str] = {}
    for name, spec in MESH_LANDMARKS.items():
        v = xy[list(spec.indices)]
        if width is not None and height is not None and not bool(
                np.all((v[:, 0] >= 0) & (v[:, 0] < width) & (v[:, 1] >= 0) & (v[:, 1] < height))):
            dropped[name] = "out_of_frame"
            continue
        pts[name] = v.mean(axis=0)
    return pts, dropped


def temporal_boundary(xy: np.ndarray, pts: dict[str, np.ndarray], axes: FaceAxes, side: str) -> np.ndarray | None:
    """Face-oval contour crossed by the face-horizontal line through the lateral canthus."""
    oval = xy[list(FACE_OVAL_RIGHT if side == "right" else FACE_OVAL_LEFT)]
    canthus = pts[f"lateral_canthus_{side}"]
    hits = intersect_polyline_with_line(oval, canthus, axes.ex)
    sign = axes.lateral_sign(side)
    lateral = [p for p in hits if sign * (axes.h(p) - axes.h(canthus)) > 0]
    if not lateral:
        return None
    return max(lateral, key=lambda p: sign * axes.h(p))


def extract_frontal_points(det: FaceDetection, rgb: np.ndarray, segmenter: HairSegmenter,
                           settings: CaptureSettings,
                           trichion_model: TrichionModel | None = None) -> ExtractedPoints:
    xy = det.xy
    h, w = rgb.shape[:2]
    pts, dropped = mesh_points(xy, w, h)
    out = ExtractedPoints(points=pts, reasons=dict(dropped))
    axes = face_axes(pts)
    derived = ("trichion", "temporal_boundary_right", "temporal_boundary_left")
    if axes is None:
        for name in derived:
            out.reasons[name] = "degenerate_geometry"
        return out
    needed = ("glabella", "subnasale", "menton", "mesh_top")
    if any(n not in pts for n in needed):
        for name in derived:
            out.reasons[name] = "out_of_frame"
        return out

    seg = segment_head(segmenter, rgb, pts["mesh_top"], pts["menton"], settings.hairline)

    hl = find_trichion(seg, pts, axes, settings.hairline)
    if hl.point is not None:
        pts["trichion"] = hl.point
        out.extra_sd["trichion"] = float(hl.sd_px)
    else:
        out.reasons["trichion"] = hl.reason or "unavailable"
        if getattr(settings.hairline, "enable_model_fallback", False):
            placed = False
            model_attempted = False
            if trichion_model is not None and getattr(trichion_model, "is_available", False):
                model_attempted = True
                pred = trichion_model.predict(xy, pts, axes)
                if pred is not None and pred.point is not None:
                    p = pred.point
                    if 0 <= p[0] < w and 0 <= p[1] < h:
                        pts["trichion"] = p
                        out.extra_sd["trichion"] = float(pred.sd_px) if pred.sd_px is not None else 2.0
                        out.reasons.pop("trichion", None)
                        placed = True
                    else:
                        out.reasons["trichion"] = "out_of_frame"
                elif pred is not None and pred.reason:
                    out.reasons["trichion"] = pred.reason
            if not placed and not model_attempted and "glabella" in pts and "subnasale" in pts:
                middle_h = float(np.dot(pts["subnasale"] - pts["glabella"], axes.ey))
                if middle_h > 5:
                    p_canon = pts["glabella"] - middle_h * axes.ey
                    if 0 <= p_canon[0] < w and 0 <= p_canon[1] < h:
                        pts["trichion"] = p_canon
                        out.extra_sd["trichion"] = float(middle_h * 0.25)
                        out.reasons.pop("trichion", None)

    icd = dist(pts["medial_canthus_right"], pts["medial_canthus_left"])
    tb = settings.temporal_boundary
    for side in ("right", "left"):
        name = f"temporal_boundary_{side}"
        if f"lateral_canthus_{side}" not in pts:
            out.reasons[name] = "out_of_frame"
            continue
        p = temporal_boundary(xy, pts, axes, side)
        if p is None:
            if f"bizygomatic_{side}" in pts:
                p = pts[f"bizygomatic_{side}"]
                out.extra_sd[name] = float(icd * 0.25)
            else:
                out.reasons[name] = "temporal_boundary_not_found"
                continue
        if not (0 <= p[0] < w and 0 <= p[1] < h):
            out.reasons[name] = "out_of_frame"
            continue
        frac = hair_fraction(seg, p, tb.window_frac_icd * icd)
        if frac is not None and frac > tb.max_hair_frac:
            # Hair covers temporal boundary: keep point with increased uncertainty instead of dropping
            pts[name] = p
            out.extra_sd[name] = float(icd * 0.20)
        else:
            pts[name] = p
    return out
