"""Tests for the extension endpoints (Face Shape and TPS Warping Simulation)."""

from pathlib import Path
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from facescan_api.app import create_app
from facescan_api.extensions.face_shape import (
    classify_face_shape,
    FACE_SHAPES,
)
from facescan_api.extensions.warper import FaceWarper
from facescan_api.extensions.procedures import DeformationRules


@pytest.fixture
def dummy_face_landmarks():
    """Generates 478 plausible synthetic 2D face mesh landmarks centered at (200, 200)."""
    np.random.seed(42)
    pts = np.zeros((478, 2), dtype=np.float32)
    pts[10] = [200.0, 50.0]
    pts[152] = [200.0, 350.0]
    pts[234] = [100.0, 200.0]
    pts[454] = [300.0, 200.0]
    pts[103] = [120.0, 110.0]
    pts[332] = [280.0, 110.0]
    pts[172] = [130.0, 280.0]
    pts[397] = [270.0, 280.0]
    pts[2] = [200.0, 230.0]
    pts[4] = [200.0, 210.0]
    pts[168] = [200.0, 150.0]
    pts[197] = [200.0, 180.0]
    pts[49] = [170.0, 230.0]
    pts[279] = [230.0, 230.0]
    pts[129] = [165.0, 225.0]
    pts[358] = [235.0, 225.0]
    pts[1] = [200.0, 225.0]
    pts[5] = [200.0, 195.0]
    pts[33] = [140.0, 170.0]
    pts[133] = [175.0, 170.0]
    pts[362] = [225.0, 170.0]
    pts[263] = [260.0, 170.0]
    pts[0] = [200.0, 260.0]
    pts[17] = [200.0, 285.0]
    pts[61] = [160.0, 272.0]
    pts[291] = [240.0, 272.0]
    pts[37] = [190.0, 260.0]
    pts[267] = [210.0, 260.0]
    pts[39] = [180.0, 265.0]
    pts[269] = [220.0, 265.0]
    pts[84] = [185.0, 285.0]
    pts[314] = [215.0, 285.0]
    pts[199] = [200.0, 330.0]
    pts[175] = [200.0, 340.0]
    pts[200] = [200.0, 345.0]
    pts[148] = [170.0, 330.0]
    pts[377] = [230.0, 330.0]
    pts[176] = [150.0, 310.0]
    pts[400] = [250.0, 310.0]
    return pts


def test_face_shape_classification(dummy_face_landmarks):
    result = classify_face_shape(dummy_face_landmarks)
    assert result["shape"] in FACE_SHAPES
    assert 0.0 <= result["confidence"] <= 1.0
    assert len(result["hairstyles"]) > 0
    assert len(result["glasses"]) > 0
    assert "metrics" in result
    assert "length_to_width_ratio" in result["metrics"]


def test_tps_face_warper(dummy_face_landmarks):
    warper = FaceWarper(grid_step=8, regularization=1e-3)
    img = np.full((400, 400, 3), 128, dtype=np.uint8)
    rules = DeformationRules(warper=warper)

    # Test Rhinoplasty
    warped_rhino, meta_r = rules.apply_rhinoplasty(img, dummy_face_landmarks, intensity=0.5)
    assert warped_rhino.shape == img.shape
    assert meta_r["intensity"] == 0.5

    # Test Lip Augmentation
    warped_lip, meta_l = rules.apply_lip_augmentation(img, dummy_face_landmarks, intensity=0.5)
    assert warped_lip.shape == img.shape
    assert meta_l["intensity"] == 0.5

    # Test Chin Augmentation
    warped_chin, meta_c = rules.apply_chin_augmentation(img, dummy_face_landmarks, intensity=0.5)
    assert warped_chin.shape == img.shape
    assert meta_c["intensity"] == 0.5

    # Test Composite
    warped_all, meta_all = rules.apply_composite_procedures(
        img, dummy_face_landmarks, rhino_intensity=0.4, lip_intensity=0.4, chin_intensity=0.4
    )
    assert warped_all.shape == img.shape
    assert len(meta_all) == 3


def test_api_endpoints_with_real_photo():
    photo_path = Path("web") / "fixtures" / "photo_front.jpg"
    if not photo_path.is_file():
        photo_path = Path(__file__).resolve().parent.parent.parent / "web" / "fixtures" / "photo_front.jpg"

    assert photo_path.is_file()
    photo_bytes = photo_path.read_bytes()

    app = create_app()
    with TestClient(app) as client:
        # Test /v1/simulation/face-shape
        res_shape = client.post(
            "/v1/simulation/face-shape",
            files={"file": ("photo.jpg", photo_bytes, "image/jpeg")},
        )
        assert res_shape.status_code == 200
        data = res_shape.json()
        assert data["shape"] in FACE_SHAPES
        assert "confidence" in data
        assert "hairstyles" in data

        # Test /v1/simulation/warp
        res_warp = client.post(
            "/v1/simulation/warp",
            files={"file": ("photo.jpg", photo_bytes, "image/jpeg")},
            data={"rhinoplasty": "0.5", "lip_augmentation": "0.3", "chin_augmentation": "0.4"},
        )
        assert res_warp.status_code == 200
        assert res_warp.headers["content-type"] == "image/jpeg"
        assert len(res_warp.content) > 1000

        # Test /v1/simulation/auto-align
        res_align = client.post(
            "/v1/simulation/auto-align",
            files={"file": ("photo.jpg", photo_bytes, "image/jpeg")},
            data={"sex": "female", "age": "25", "locale": "th"},
        )
        assert res_align.status_code == 200
        data_align = res_align.json()
        assert data_align["status"] == "ok"
        assert "result_token" in data_align
        assert "result" in data_align
        assert "overlay" in data_align
        assert "aligned_photo" in data_align
        assert "roll_deg" in data_align
        assert len(data_align["result"]["metrics"]) > 0
