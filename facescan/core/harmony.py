"""Facial Harmony & Golden Ratio score calculation (0-100%).

Calculates overall facial harmony and dimensional subscores using Gaussian
distance decay from classical aesthetic canon targets.
"""

from __future__ import annotations

import math
from typing import Any, Mapping

from facescan.core.schema import HarmonyScore, HarmonySubscores


def gaussian_decay(x: float, mu: float, sigma: float) -> float:
    """Calculate Gaussian distance decay score scaled from 0.0 to 100.0.

    s(x, mu, sigma) = 100 * exp(- (x - mu)^2 / (2 * sigma^2))
    """
    if sigma <= 0.0:
        return 0.0
    diff = x - mu
    score = 100.0 * math.exp(-(diff * diff) / (2.0 * sigma * sigma))
    return max(0.0, min(100.0, score))


def _extract_value(item: Any) -> float | None:
    if item is None:
        return None
    if isinstance(item, (int, float)):
        v = item
    elif hasattr(item, "value"):
        v = item.value
    elif isinstance(item, dict):
        v = item.get("value")
    else:
        return None
    if v is None:
        return None
    try:
        v = float(v)
    except (TypeError, ValueError):
        return None
    if math.isnan(v) or math.isinf(v):
        return None
    return v


def calculate_harmony_score(metrics: Mapping[str, Any]) -> HarmonyScore:
    """Compute overall facial harmony score (0-100%) and 4 subscores.

    Subscores:
    - vertical_thirds: F1_upper_third, F1_middle_third, F1_lower_third (mu=1/3, sigma=0.035),
      F1_middle_lower_ratio (mu=1.0, sigma=0.08). Mean across available thirds.
    - transverse_fifths: 5 fifths in F3 (mu=0.20, sigma=0.025). Mean across available fifths.
    - lip_harmony: F8_lip_ratio (mu=1.618, sigma=0.20, weight=0.6) and F2_lower_face_ratio
      (mu=0.50, sigma=0.06, weight=0.4).
    - symmetry: F11_asym_* metrics (mu=0.0) with ratio sigma=0.08, angular sigma=2.0 deg,
      offset sigma=4.0 %ICD. Mean across available asymmetry metrics.

    Overall:
    Overall = 0.25 * S_thirds + 0.25 * S_fifths + 0.25 * S_lips + 0.25 * S_symmetry
    Strictly bounded [0.0, 100.0] and rounded to 1 decimal place.
    """
    # 1. Vertical thirds
    thirds_configs = [
        ("F1_upper_third", 1.0 / 3.0, 0.035),
        ("F1_middle_third", 1.0 / 3.0, 0.035),
        ("F1_lower_third", 1.0 / 3.0, 0.035),
        ("F1_middle_lower_ratio", 1.0, 0.08),
    ]
    thirds_scores: list[float] = []
    for mid, mu, sigma in thirds_configs:
        if mid in metrics:
            val = _extract_value(metrics[mid])
            if val is not None:
                thirds_scores.append(gaussian_decay(val, mu, sigma))
    s_thirds = sum(thirds_scores) / len(thirds_scores) if thirds_scores else 0.0

    # 2. Transverse fifths
    fifths_ids = [
        "F3_fifth_outer_right",
        "F3_fifth_eye_right",
        "F3_fifth_intercanthal",
        "F3_fifth_eye_left",
        "F3_fifth_outer_left",
    ]
    fifths_scores: list[float] = []
    for mid in fifths_ids:
        if mid in metrics:
            val = _extract_value(metrics[mid])
            if val is not None:
                fifths_scores.append(gaussian_decay(val, 0.20, 0.025))
    s_fifths = sum(fifths_scores) / len(fifths_scores) if fifths_scores else 0.0

    # 3. Lip harmony
    s_f8: float | None = None
    if "F8_lip_ratio" in metrics:
        v_f8 = _extract_value(metrics["F8_lip_ratio"])
        if v_f8 is not None:
            s_f8 = gaussian_decay(v_f8, 1.618, 0.20)

    s_f2: float | None = None
    if "F2_lower_face_ratio" in metrics:
        v_f2 = _extract_value(metrics["F2_lower_face_ratio"])
        if v_f2 is not None:
            s_f2 = gaussian_decay(v_f2, 0.50, 0.06)

    if s_f8 is not None and s_f2 is not None:
        s_lips = 0.6 * s_f8 + 0.4 * s_f2
    elif s_f8 is not None:
        s_lips = s_f8
    elif s_f2 is not None:
        s_lips = s_f2
    else:
        s_lips = 0.0

    # 4. Symmetry
    asym_configs = [
        ("F11_asym_eye_width", 0.0, 0.08),
        ("F11_asym_outer_fifth", 0.0, 0.08),
        ("F11_asym_brow_apex_ratio", 0.0, 0.08),
        ("F11_asym_canthal_tilt", 0.0, 2.0),
        ("F11_asym_commissure_offset", 0.0, 4.0),
        ("F11_asym_brow_head_offset", 0.0, 4.0),
        ("F11_asym_brow_apex_offset", 0.0, 4.0),
        ("F11_asym_brow_tail_offset", 0.0, 4.0),
    ]
    sym_scores: list[float] = []
    for mid, mu, sigma in asym_configs:
        if mid in metrics:
            val = _extract_value(metrics[mid])
            if val is not None:
                sym_scores.append(gaussian_decay(val, mu, sigma))
    s_sym = sum(sym_scores) / len(sym_scores) if sym_scores else 0.0

    # Overall harmony score
    overall_raw = 0.25 * s_thirds + 0.25 * s_fifths + 0.25 * s_lips + 0.25 * s_sym

    vertical_thirds = round(max(0.0, min(100.0, s_thirds)), 1)
    transverse_fifths = round(max(0.0, min(100.0, s_fifths)), 1)
    lip_harmony = round(max(0.0, min(100.0, s_lips)), 1)
    symmetry = round(max(0.0, min(100.0, s_sym)), 1)
    overall = round(max(0.0, min(100.0, overall_raw)), 1)

    return HarmonyScore(
        overall=overall,
        subscores=HarmonySubscores(
            vertical_thirds=vertical_thirds,
            transverse_fifths=transverse_fifths,
            lip_harmony=lip_harmony,
            symmetry=symmetry,
        ),
    )
