"""Prepare training dataset for Trichion (Hairline) Regressor.

Extracts 12-dimensional cranial and facial anatomical features (normalized by ICD)
from dataset/faces/ and dataset/archive.zip, using MediaPipe FaceLandmarker and
Selfie Multiclass Hair Segmenter as ground truth for clear hairlines.

Outputs: dataset/trichion_features.csv
"""

from __future__ import annotations

import argparse
import csv
import logging
import math
import sys
import zipfile
from pathlib import Path

import cv2
import numpy as np

# Ensure repository root is on sys.path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from facescan.core.config import CaptureSettings, DEFAULT_CONFIG_DIR, read_yaml
from facescan.core.detector import FaceDetector, HairSegmenter
from facescan.core.frontal_points import mesh_points, temporal_boundary
from facescan.core.geometry import FaceAxes, dist
from facescan.core.hairline import find_trichion, segment_head
from facescan.core.normalize import face_axes, load_image

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("prepare_dataset")

FEATURE_NAMES = [
    "mid_face_norm",          # (v(sn) - v(gla)) / ICD
    "lower_face_norm",        # (v(men) - v(sn)) / ICD
    "mesh_top_norm",          # (v(gla) - v(mesh_top)) / ICD
    "bizygomatic_norm",       # dist(bizy_r, bizy_l) / ICD
    "temporal_width_norm",    # |h(tb_l) - h(tb_r)| / ICD
    "forehead_mid_151_norm",  # (v(gla) - v(151)) / ICD
    "forehead_r_109_norm",    # (v(gla) - v(109)) / ICD
    "forehead_r_108_norm",    # (v(gla) - v(108)) / ICD
    "forehead_l_338_norm",    # (v(gla) - v(338)) / ICD
    "forehead_l_337_norm",    # (v(gla) - v(337)) / ICD
    "forehead_curvature_norm",# (v(151) - 0.5*(v(109) + v(338))) / ICD
    "forehead_width_norm",    # |h(338) - h(109)| / ICD
]


def extract_features(xy: np.ndarray, pts: dict[str, np.ndarray], axes: FaceAxes) -> np.ndarray | None:
    """Extracts 12-dimensional scale- and roll-invariant anatomical features."""
    icd = dist(pts["medial_canthus_right"], pts["medial_canthus_left"])
    if icd <= 1.0:
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
    tb_r = temporal_boundary(xy, pts, axes, "right")
    if tb_r is None and "bizygomatic_right" in pts:
        tb_r = pts["bizygomatic_right"]
    tb_l = temporal_boundary(xy, pts, axes, "left")
    if tb_l is None and "bizygomatic_left" in pts:
        tb_l = pts["bizygomatic_left"]

    if tb_r is not None and tb_l is not None:
        temp_w = abs(axes.h(tb_l) - axes.h(tb_r)) / icd
    else:
        temp_w = bizy_w * 0.85

    # Forehead landmarks
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


def process_image(
    data: bytes,
    detector: FaceDetector,
    segmenter: HairSegmenter,
    cfg: CaptureSettings,
    max_pose_deg: float = 12.0,
) -> tuple[np.ndarray, float, dict] | None:
    """Processes a single image bytes, returns (features, target_y, metadata) or None."""
    try:
        img = load_image(data)
    except Exception:
        return None

    faces = detector.detect(img.pixels)
    if len(faces) != 1:
        return None

    det = faces[0]
    # Strict frontal pose gate: pitch and yaw <= max_pose_deg
    if abs(det.pose.pitch_deg) > max_pose_deg or abs(det.pose.yaw_deg) > max_pose_deg:
        return None

    pts, dropped = mesh_points(det.xy, img.width, img.height)
    if dropped:
        return None

    axes = face_axes(pts)
    if axes is None:
        return None

    # Ground truth hairline segmentation
    seg = segment_head(segmenter, img.pixels, pts["mesh_top"], pts["menton"], cfg.hairline)
    hl = find_trichion(seg, pts, axes, cfg.hairline)
    if hl.point is None:
        return None

    feats = extract_features(det.xy, pts, axes)
    if feats is None:
        return None

    icd = dist(pts["medial_canthus_right"], pts["medial_canthus_left"])
    target_y = float((axes.v(pts["glabella"]) - axes.v(hl.point)) / icd)

    # Sanity filter: upper third offset should be realistic (e.g. 0.8 to 2.8 ICD)
    if not (0.8 <= target_y <= 2.8):
        return None

    meta = {
        "pitch_deg": round(det.pose.pitch_deg, 2),
        "yaw_deg": round(det.pose.yaw_deg, 2),
        "roll_deg": round(det.pose.roll_deg, 2),
        "icd_px": round(icd, 2),
        "trichion_x": round(float(hl.point[0]), 2),
        "trichion_y": round(float(hl.point[1]), 2),
    }
    return feats, target_y, meta


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract anatomical features for trichion model")
    parser.add_argument("--faces-dir", type=Path, default=ROOT / "dataset" / "faces")
    parser.add_argument("--archive-zip", type=Path, default=ROOT / "dataset" / "archive.zip")
    parser.add_argument("--output-csv", type=Path, default=ROOT / "dataset" / "trichion_features.csv")
    parser.add_argument("--max-archive-images", type=int, default=2500, help="Max images to sample from archive.zip")
    parser.add_argument("--max-pose-deg", type=float, default=12.0, help="Pose filter threshold in degrees")
    args = parser.parse_args()

    models_dir = ROOT / "models"
    detector = FaceDetector(models_dir / "face_landmarker.task")
    segmenter = HairSegmenter(models_dir / "selfie_multiclass_256x256.tflite")
    cfg = CaptureSettings.model_validate(read_yaml(DEFAULT_CONFIG_DIR / "capture.yaml"))

    fieldnames = ["sample_id", "source", "category"] + FEATURE_NAMES + ["target_y"] + [
        "pitch_deg", "yaw_deg", "roll_deg", "icd_px", "trichion_x", "trichion_y"
    ]

    args.output_csv.parent.mkdir(parents=True, exist_ok=True)
    out_file = open(args.output_csv, "w", newline="", encoding="utf-8")
    writer = csv.DictWriter(out_file, fieldnames=fieldnames)
    writer.writeheader()

    count = 0
    # 1. Process dataset/faces/
    if args.faces_dir.is_dir():
        face_images = list(args.faces_dir.rglob("*.jpg")) + list(args.faces_dir.rglob("*.png"))
        logger.info("Processing %d images from %s...", len(face_images), args.faces_dir)
        for p in face_images:
            category = p.parent.name
            try:
                res = process_image(p.read_bytes(), detector, segmenter, cfg, max_pose_deg=args.max_pose_deg)
                if res is not None:
                    feats, target_y, meta = res
                    row = {
                        "sample_id": p.stem,
                        "source": "dataset/faces",
                        "category": category,
                        "target_y": round(target_y, 5),
                    }
                    for name, val in zip(FEATURE_NAMES, feats):
                        row[name] = round(float(val), 5)
                    row.update(meta)
                    writer.writerow(row)
                    count += 1
            except Exception as e:
                logger.debug("Error processing %s: %s", p, e)
        out_file.flush()
        logger.info("Finished dataset/faces: %d valid samples extracted.", count)

    # 2. Process dataset/archive.zip for demographic diversity and scaling
    if args.archive_zip.is_file() and args.max_archive_images > 0:
        logger.info("Processing archive.zip for diversity expansion (up to %d images)...", args.max_archive_images)
        with zipfile.ZipFile(args.archive_zip, "r") as z:
            all_names = [n for n in z.namelist() if n.lower().endswith((".jpg", ".png", ".jpeg"))]
            # Prioritize diverse demographic prefixes: AF, AM (Asian Female, Asian Male), then others
            asian_faces = [n for n in all_names if "AF" in n or "AM" in n]
            other_faces = [n for n in all_names if n not in set(asian_faces)]
            
            # Interleave / sample to get strong Asian & general representation
            candidates = asian_faces[:args.max_archive_images // 2] + other_faces[:args.max_archive_images // 2]
            logger.info("Selected %d candidate images from archive.zip (including %d Asian faces)", len(candidates), len(asian_faces[:args.max_archive_images // 2]))

            archive_count = 0
            for i, name in enumerate(candidates):
                if archive_count >= args.max_archive_images:
                    break
                try:
                    data = z.read(name)
                    res = process_image(data, detector, segmenter, cfg, max_pose_deg=args.max_pose_deg)
                    if res is not None:
                        feats, target_y, meta = res
                        cat = "asian" if ("AF" in name or "AM" in name) else "general"
                        row = {
                            "sample_id": Path(name).stem,
                            "source": "archive.zip",
                            "category": cat,
                            "target_y": round(target_y, 5),
                        }
                        for fname, val in zip(FEATURE_NAMES, feats):
                            row[fname] = round(float(val), 5)
                        row.update(meta)
                        writer.writerow(row)
                        count += 1
                        archive_count += 1
                except Exception as e:
                    logger.debug("Error processing %s from zip: %s", name, e)
                
                if (i + 1) % 500 == 0:
                    out_file.flush()
                    logger.info("Archive progress: processed %d/%d, total valid samples so far: %d", i + 1, len(candidates), count)

    out_file.close()
    logger.info("Dataset preparation complete! Total samples: %d saved to %s", count, args.output_csv)


if __name__ == "__main__":
    main()
