"""Tests for Multi-Task Demographics (Sex & Age Estimation) module."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest
import torch

from facescan.core.demographics import (
    DemographicsPredictor,
    MultiTaskDemographicsNet,
    preprocess_face_crop,
)
from facescan.core.normalize import load_image
from facescan.core.pipeline import FaceScanEngine
from facescan.core.schema import SubjectInfo


def test_multitask_net_forward():
    model = MultiTaskDemographicsNet(pretrained=False)
    model.eval()
    dummy = torch.randn(2, 3, 224, 224)
    with torch.no_grad():
        sex_logits, age_pred = model(dummy)

    assert sex_logits.shape == (2, 1)
    assert age_pred.shape == (2, 1)


def test_preprocess_face_crop():
    img = np.ones((480, 640, 3), dtype=np.uint8) * 120
    # Test without bbox
    t1 = preprocess_face_crop(img)
    assert t1.shape == (1, 3, 224, 224)
    assert t1.dtype == np.float32

    # Test with bbox
    bbox = (100, 100, 300, 350)
    t2 = preprocess_face_crop(img, bbox=bbox)
    assert t2.shape == (1, 3, 224, 224)
    assert t2.dtype == np.float32


def test_predictor_missing_model():
    p = DemographicsPredictor(Path("non_existent_model.onnx"))
    assert not p.is_available
    res = p.predict(np.zeros((100, 100, 3), dtype=np.uint8))
    assert res is None


def test_predictor_onnx_inference():
    onnx_path = Path("models/demographics_mobilenetv3.onnx")
    if not onnx_path.is_file():
        pytest.skip("ONNX model file not yet exported")

    predictor = DemographicsPredictor(onnx_path)
    assert predictor.is_available

    dummy_face = np.random.randint(50, 200, (256, 256, 3), dtype=np.uint8)
    estimate = predictor.predict(dummy_face)
    assert estimate is not None
    assert estimate.predicted_sex in ("female", "male")
    assert 0.0 <= estimate.sex_confidence <= 1.0
    assert 1.0 <= estimate.predicted_age <= 100.0


def test_pipeline_with_demographics():
    test_img_path = Path("tests/data/astronaut.png")
    if not test_img_path.is_file():
        pytest.skip("Test image astronaut.png not available")

    engine = FaceScanEngine()
    loaded = load_image(test_img_path.read_bytes())

    # 1. Standard test with specified sex
    res = engine.analyze_frontal(loaded, subject=SubjectInfo(sex="female", age=25))
    if engine._demographics.is_available:
        assert res.inferred_demographics is not None
        assert res.inferred_demographics.predicted_sex in ("female", "male")
        assert res.inferred_demographics.predicted_age > 0

    # 2. Test auto-demographic routing with unspecified sex
    res_auto = engine.analyze_frontal(loaded, subject=SubjectInfo(sex="unspecified", age=25))
    if engine._demographics.is_available:
        assert res_auto.inferred_demographics is not None
