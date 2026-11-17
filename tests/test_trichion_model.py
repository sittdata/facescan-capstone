"""Unit and integration tests for Trichion Regressor (hairline prediction fallback)."""

from __future__ import annotations

from pathlib import Path
import numpy as np
import pytest

from facescan import EngineConfig, FaceScanEngine, LoadedImage, SubjectInfo
from facescan.core.detector import FaceDetector
from facescan.core.frontal_points import extract_frontal_points, mesh_points
from facescan.core.geometry import FaceAxes
from facescan.core.normalize import face_axes
from facescan.core.trichion_model import FEATURE_NAMES, TrichionModel, extract_cranial_features
from helpers import DATA, MODELS, capture_settings, models_available


@pytest.fixture(scope="module")
def trichion_onnx() -> Path:
    p = MODELS / "trichion_regressor.onnx"
    if not p.is_file():
        pytest.skip("trichion_regressor.onnx not found")
    return p


def test_trichion_model_init_and_availability(trichion_onnx):
    model = TrichionModel(trichion_onnx)
    assert model.is_available is True
    assert model.model_path == trichion_onnx


def test_trichion_model_missing_file_fails_gracefully():
    model = TrichionModel(MODELS / "non_existent_file.onnx")
    assert model.is_available is False
    assert model.predict(np.zeros((10, 2)), {}, None) is None


def test_extract_cranial_features_dimension_and_validity(astronaut):
    detector = FaceDetector(MODELS / "face_landmarker.task")
    faces = detector.detect(astronaut.pixels)
    assert len(faces) == 1
    det = faces[0]

    pts, _ = mesh_points(det.xy, astronaut.width, astronaut.height)
    axes = face_axes(pts)
    assert axes is not None

    feats = extract_cranial_features(det.xy, pts, axes)
    assert feats is not None
    assert len(feats) == 12
    assert len(feats) == len(FEATURE_NAMES)
    assert not np.any(np.isnan(feats))
    assert not np.any(np.isinf(feats))


def test_extract_cranial_features_handles_incomplete_mesh():
    incomplete_pts = {"glabella": np.array([100.0, 100.0])}
    assert extract_cranial_features(np.zeros((468, 2)), incomplete_pts, None) is None


def test_trichion_model_prediction_on_astronaut(trichion_onnx, astronaut):
    detector = FaceDetector(MODELS / "face_landmarker.task")
    faces = detector.detect(astronaut.pixels)
    det = faces[0]
    pts, _ = mesh_points(det.xy, astronaut.width, astronaut.height)
    axes = face_axes(pts)

    model = TrichionModel(trichion_onnx)
    hl = model.predict(det.xy, pts, axes)

    assert hl is not None
    assert hl.point is not None
    assert hl.reason is None
    assert hl.sd_px is not None and hl.sd_px > 0

    # Trichion must lie above glabella on the image midline
    gla = pts["glabella"]
    assert hl.point[1] < gla[1]
    assert abs(hl.point[0] - gla[0]) < 10.0  # roughly vertical midline


def test_frontal_points_fallback_toggle(trichion_onnx, astronaut):
    detector = FaceDetector(MODELS / "face_landmarker.task")
    segmenter = HairSegmenter_stub = FaceScanEngine(EngineConfig.from_models_dir(MODELS))._segmenter
    faces = detector.detect(astronaut.pixels)
    det = faces[0]
    cfg = capture_settings()
    model = TrichionModel(trichion_onnx)

    # 1. Fallback disabled (default): bangs cause trichion unavailable
    cfg_off = cfg.model_copy(update={"hairline": cfg.hairline.model_copy(update={"enable_model_fallback": False})})
    ext_off = extract_frontal_points(det, astronaut.pixels, segmenter, cfg_off, trichion_model=model)
    assert "trichion" not in ext_off.points
    assert ext_off.reasons.get("trichion") == "hair_covers_forehead"

    # 2. Fallback enabled: regressor predicts trichion
    cfg_on = cfg.model_copy(update={"hairline": cfg.hairline.model_copy(update={"enable_model_fallback": True})})
    ext_on = extract_frontal_points(det, astronaut.pixels, segmenter, cfg_on, trichion_model=model)
    assert "trichion" in ext_on.points
    assert "trichion" not in ext_on.reasons
    assert ext_on.extra_sd["trichion"] > 0


def test_pipeline_end_to_end_trichion_fallback(engine, astronaut, subject):
    # Default without fallback: astronaut has no trichion due to bangs
    r_off = engine.analyze_frontal(astronaut, subject=subject, enable_trichion_fallback=False)
    assert r_off.landmarks["trichion"].available is False
    assert r_off.metrics["F1_upper_third"].status == "unavailable"

    # With fallback enabled: astronaut has predicted trichion and all thirds available
    r_on = engine.analyze_frontal(astronaut, subject=subject, enable_trichion_fallback=True)
    assert r_on.landmarks["trichion"].available is True
    assert r_on.landmarks["trichion"].x is not None
    assert r_on.landmarks["trichion"].y is not None

    m_up = r_on.metrics["F1_upper_third"]
    m_mid = r_on.metrics["F1_middle_third"]
    m_low = r_on.metrics["F1_lower_third"]

    assert m_up.status != "unavailable"
    assert m_mid.status != "unavailable"
    assert m_low.status != "unavailable"

    assert 0.20 < m_up.value < 0.40
    assert 0.25 < m_mid.value < 0.45
    assert 0.25 < m_low.value < 0.45

    total = m_up.value + m_mid.value + m_low.value
    assert abs(total - 1.0) < 0.001


def test_engine_config_with_fallback_flag(astronaut, subject):
    cfg = EngineConfig.from_models_dir(MODELS, enable_trichion_fallback=True)
    with FaceScanEngine(cfg) as eng:
        r = eng.analyze_frontal(astronaut, subject=subject)
        assert r.landmarks["trichion"].available is True
        assert r.metrics["F1_upper_third"].value is not None


def test_extract_cranial_features_with_existing_temporal_boundary_no_crash(astronaut):
    """Regression test: numpy arrays in pts must not crash with ambiguous truth value."""
    detector = FaceDetector(MODELS / "face_landmarker.task")
    faces = detector.detect(astronaut.pixels)
    det = faces[0]
    pts, _ = mesh_points(det.xy, astronaut.width, astronaut.height)
    axes = face_axes(pts)

    # Pre-populate temporal boundaries as ndarrays (simulates post-extraction or pipeline re-use)
    pts["temporal_boundary_right"] = np.array([180.0, 100.0])
    pts["temporal_boundary_left"] = np.array([270.0, 105.0])

    feats = extract_cranial_features(det.xy, pts, axes)
    assert feats is not None
    assert len(feats) == 12
    assert not np.isnan(feats[4])


def test_trichion_model_standalone_in_isolated_directory(trichion_onnx):
    """Regression test: model must be self-contained without external .data file."""
    import shutil
    import tempfile
    import onnxruntime as ort

    with tempfile.TemporaryDirectory() as tmpdir:
        isolated_model = Path(tmpdir) / "isolated_model.onnx"
        shutil.copy(trichion_onnx, isolated_model)
        # Verify inference succeeds from the isolated folder
        model = TrichionModel(isolated_model)
        assert model.is_available is True


def test_fallback_out_of_frame_rejection(trichion_onnx, astronaut):
    """Edge case: if predicted point is outside image bounds, reason must be out_of_frame."""
    detector = FaceDetector(MODELS / "face_landmarker.task")
    segmenter = HairSegmenter_stub = FaceScanEngine(EngineConfig.from_models_dir(MODELS))._segmenter
    faces = detector.detect(astronaut.pixels)
    det = faces[0]
    cfg = capture_settings()
    cfg_on = cfg.model_copy(update={"hairline": cfg.hairline.model_copy(update={"enable_model_fallback": True})})

    class FakeOutModel:
        is_available = True
        def predict(self, xy, pts, axes):
            from facescan.core.hairline import HairlineResult
            return HairlineResult(point=np.array([100.0, -50.0]), sd_px=2.0, reason=None)

    ext = extract_frontal_points(det, astronaut.pixels, segmenter, cfg_on, trichion_model=FakeOutModel())
    assert "trichion" not in ext.points
    assert ext.reasons.get("trichion") == "out_of_frame"

