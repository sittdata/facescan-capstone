"""Multi-task neural network and inference predictor for demographics (Sex & Age).

Architecture:
- Shared Backbone: MobileNetV3-Small (576-dim latent feature)
- Head 1: Binary sex classification (logits -> sigmoid)
- Head 2: Continuous age regression (years)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import cv2
import numpy as np

logger = logging.getLogger(__name__)

IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


@dataclass(frozen=True)
class DemographicsEstimate:
    predicted_sex: Literal["female", "male"]
    sex_confidence: float
    predicted_age: float
    age_sd: float = 2.5


def preprocess_face_crop(
    image_rgb: np.ndarray,
    bbox: tuple[int, int, int, int] | None = None,
    target_size: tuple[int, int] = (224, 224),
    margin_ratio: float = 0.15,
    to_bgr: bool = False,
    normalize_imagenet: bool = True,
) -> np.ndarray:
    """Crops and normalizes face region into NCHW float32 tensor array."""
    h, w = image_rgb.shape[:2]
    if bbox is not None:
        x_min, y_min, x_max, y_max = bbox
        bw = x_max - x_min
        bh = y_max - y_min
        x_min = max(0, int(x_min - bw * margin_ratio))
        y_min = max(0, int(y_min - bh * margin_ratio))
        x_max = min(w, int(x_max + bw * margin_ratio))
        y_max = min(h, int(y_max + bh * margin_ratio))
        crop = image_rgb[y_min:y_max, x_min:x_max]
    else:
        crop = image_rgb

    if crop.size == 0:
        crop = image_rgb

    if to_bgr:
        crop = cv2.cvtColor(crop, cv2.COLOR_RGB2BGR)

    resized = cv2.resize(crop, target_size, interpolation=cv2.INTER_LINEAR)
    if normalize_imagenet:
        norm = (resized.astype(np.float32) / 255.0 - IMAGENET_MEAN) / IMAGENET_STD
    else:
        norm = resized.astype(np.float32)
    # Convert HWC -> CHW -> NCHW
    tensor = np.transpose(norm, (2, 0, 1))[np.newaxis, ...]
    return tensor.astype(np.float32)


try:
    import torch
    import torch.nn as nn
    from torchvision.models import MobileNet_V3_Small_Weights, mobilenet_v3_small

    class MultiTaskDemographicsNet(nn.Module):
        """PyTorch multi-task network with MobileNetV3-Small backbone."""

        def __init__(self, pretrained: bool = False):
            super().__init__()
            weights = MobileNet_V3_Small_Weights.DEFAULT if pretrained else None
            try:
                base = mobilenet_v3_small(weights=weights)
            except Exception:
                base = mobilenet_v3_small(weights=None)

            self.features = base.features
            self.avgpool = nn.AdaptiveAvgPool2d((1, 1))
            feature_dim = 576  # MobileNetV3-Small final channel dimension

            # Sex classification head: 0 = male, 1 = female
            self.sex_head = nn.Sequential(
                nn.Linear(feature_dim, 64),
                nn.Hardswish(),
                nn.Dropout(p=0.2),
                nn.Linear(64, 1),
            )

            # Age continuous regression head
            self.age_head = nn.Sequential(
                nn.Linear(feature_dim, 64),
                nn.Hardswish(),
                nn.Dropout(p=0.2),
                nn.Linear(64, 1),
            )

        def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
            f = self.features(x)
            f = self.avgpool(f)
            f = torch.flatten(f, 1)
            sex_logits = self.sex_head(f)
            age_pred = self.age_head(f)
            return sex_logits, age_pred

except ImportError:  # pragma: no cover
    MultiTaskDemographicsNet = None  # type: ignore


class DemographicsPredictor:
    """Inference engine supporting ONNX Runtime with PyTorch fallback."""

    def __init__(self, model_path: Path | str | None = None):
        self.session = None
        self.torch_model = None
        self.mode = None

        if model_path is None:
            return

        path = Path(model_path)
        if not path.is_file():
            logger.warning("Demographics model file not found: %s", path)
            return

        if path.suffix.lower() == ".onnx":
            try:
                import onnxruntime as ort

                opts = ort.SessionOptions()
                opts.intra_op_num_threads = 2
                self.session = ort.InferenceSession(str(path), sess_options=opts, providers=["CPUExecutionProvider"])
                self.mode = "onnx"
                logger.info("Loaded demographics ONNX model: %s", path)
            except Exception as e:
                logger.warning("Failed to initialize ONNX runtime session: %s", e)
        elif path.suffix.lower() in (".pt", ".pth"):
            try:
                import torch

                if MultiTaskDemographicsNet is not None:
                    model = MultiTaskDemographicsNet(pretrained=False)
                    state = torch.load(path, map_location="cpu", weights_only=True)
                    model.load_state_dict(state)
                    model.eval()
                    self.torch_model = model
                    self.mode = "torch"
                    logger.info("Loaded demographics PyTorch model: %s", path)
            except Exception as e:
                logger.warning("Failed to initialize PyTorch model: %s", e)

    @property
    def is_available(self) -> bool:
        return self.mode in ("onnx", "torch")

    def predict(
        self,
        image_rgb: np.ndarray,
        bbox: tuple[int, int, int, int] | None = None,
    ) -> DemographicsEstimate | None:
        """Runs inference on face crop. Returns DemographicsEstimate or None if unavailable."""
        if not self.is_available:
            return None

        try:
            if self.mode == "onnx" and self.session is not None:
                input_meta = self.session.get_inputs()[0]
                input_name = input_meta.name
                target_size = (224, 224)
                if len(input_meta.shape) == 4 and isinstance(input_meta.shape[2], int) and isinstance(input_meta.shape[3], int):
                    target_size = (int(input_meta.shape[3]), int(input_meta.shape[2]))

                is_insightface = (target_size == (96, 96))
                tensor_nchw = preprocess_face_crop(
                    image_rgb,
                    bbox=bbox,
                    target_size=target_size,
                    to_bgr=False,
                    normalize_imagenet=not is_insightface,
                )
                outputs = self.session.run(None, {input_name: tensor_nchw})

                if len(outputs) == 1 and outputs[0].shape[-1] == 3:
                    # In InsightFace standard model:
                    # outputs[0] is [1, 3] -> [gender_f_logit, gender_m_logit, normalized_age]
                    raw_age = float(outputs[0][0, 2])
                    calibrated_age = max(1.0, min(100.0, raw_age * 100.0))

                    # Gender logit with numerical-stable softmax
                    g0 = float(outputs[0][0, 0])
                    g1 = float(outputs[0][0, 1])
                    max_g = max(g0, g1)
                    exp_g = np.exp([g0 - max_g, g1 - max_g])
                    probs = exp_g / np.sum(exp_g)

                    if g1 >= g0:
                        pred_sex: Literal["female", "male"] = "male"
                        conf = float(probs[1])
                    else:
                        pred_sex = "female"
                        conf = float(probs[0])

                    return DemographicsEstimate(
                        predicted_sex=pred_sex,
                        sex_confidence=round(conf, 3),
                        predicted_age=round(calibrated_age, 1),
                        age_sd=2.5,
                    )
                else:
                    sex_logit = float(outputs[0][0, 0])
                    age_val = float(outputs[1][0, 0])
            elif self.mode == "torch" and self.torch_model is not None:
                tensor_nchw = preprocess_face_crop(image_rgb, bbox=bbox, target_size=(224, 224))
                import torch

                with torch.no_grad():
                    t = torch.from_numpy(tensor_nchw)
                    sex_out, age_out = self.torch_model(t)
                    sex_logit = float(sex_out[0, 0].item())
                    age_val = float(age_out[0, 0].item())
            else:
                return None
        except Exception as e:
            logger.warning("Demographics inference failed: %s", e)
            return None

        # Sigmoid probability
        prob_female = 1.0 / (1.0 + np.exp(-sex_logit))
        if prob_female >= 0.5:
            pred_sex = "female"
            conf = float(prob_female)
        else:
            pred_sex = "male"
            conf = float(1.0 - prob_female)

        # Age clamp (1 to 100 years)
        clamped_age = max(1.0, min(100.0, age_val))

        return DemographicsEstimate(
            predicted_sex=pred_sex,
            sex_confidence=round(conf, 3),
            predicted_age=round(clamped_age, 1),
            age_sd=2.5,
        )
