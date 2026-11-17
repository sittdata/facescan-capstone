"""Training and export tool for Multi-Task Demographics (Sex & Age) model.

Supported Dataset:
- UTKFace aligned face crops (filename format: [age]_[gender]_[race]_[date&time].jpg)
  where gender: 0 = male, 1 = female.

Exports:
- PyTorch state_dict (.pt)
- ONNX runtime graph (.onnx)
"""

from __future__ import annotations

import argparse
import logging
import os
import re
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms

from facescan.core.demographics import IMAGENET_MEAN, IMAGENET_STD, MultiTaskDemographicsNet

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


class UTKFaceDataset(Dataset):
    """Dataset loader for UTKFace formatted directory."""

    # Filename format: [age]_[gender]_[race]_[datetime].jpg
    FNAME_PATTERN = re.compile(r"^(\d+)_([01])_(\d+)_(.+)\.(jpg|png|jpeg)$", re.IGNORECASE)

    def __init__(self, root_dir: Path | str, transform=None):
        self.root = Path(root_dir)
        self.transform = transform
        self.samples: list[tuple[Path, int, int]] = []

        if not self.root.is_dir():
            raise FileNotFoundError(f"Dataset directory not found: {self.root}")

        for entry in self.root.iterdir():
            if not entry.is_file():
                continue
            m = self.FNAME_PATTERN.match(entry.name)
            if m:
                age = int(m.group(1))
                gender = int(m.group(2))  # 0: male, 1: female
                self.samples.append((entry, gender, age))

        logger.info("Found %d valid labeled samples in %s", len(self.samples), self.root)
        if len(self.samples) == 0:
            raise ValueError(f"No valid UTKFace format files found in {self.root}")

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        path, gender, age = self.samples[idx]
        bgr = cv2.imread(str(path))
        if bgr is None:
            # Fallback black image if corrupt
            rgb = np.zeros((224, 224, 3), dtype=np.uint8)
        else:
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            rgb = cv2.resize(rgb, (224, 224))

        if self.transform:
            tensor = self.transform(rgb)
        else:
            norm = (rgb.astype(np.float32) / 255.0 - IMAGENET_MEAN) / IMAGENET_STD
            tensor = torch.from_numpy(np.transpose(norm, (2, 0, 1)).astype(np.float32))

        return tensor, torch.tensor([float(gender)], dtype=torch.float32), torch.tensor([float(age)], dtype=torch.float32)


class MockFaceDataset(Dataset):
    """Generates synthetic colored faces for self-testing without external dataset."""

    def __init__(self, num_samples: int = 32):
        self.num_samples = num_samples
        np.random.seed(42)
        self.data = []
        for _ in range(num_samples):
            # Synthetic 224x224 RGB image
            img = np.random.randint(50, 200, (224, 224, 3), dtype=np.uint8)
            # Add oval face-like blob
            cv2.ellipse(img, (112, 112), (70, 90), 0, 0, 360, (220, 180, 160), -1)
            gender = np.random.choice([0.0, 1.0])
            age = float(np.random.randint(18, 65))
            self.data.append((img, gender, age))

    def __len__(self) -> int:
        return self.num_samples

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        img, gender, age = self.data[idx]
        norm = (img.astype(np.float32) / 255.0 - IMAGENET_MEAN) / IMAGENET_STD
        tensor = torch.from_numpy(np.transpose(norm, (2, 0, 1)).astype(np.float32))
        return tensor, torch.tensor([gender], dtype=torch.float32), torch.tensor([age], dtype=torch.float32)


def train_and_export(
    data_dir: Path | None,
    output_dir: Path,
    epochs: int = 2,
    batch_size: int = 8,
    lr: float = 1e-4,
    age_loss_weight: float = 0.05,
    mock_train: bool = False,
    device_name: str = "cpu",
) -> tuple[Path, Path]:
    """Trains the model and exports both PyTorch (.pt) and ONNX (.onnx) weights."""
    device = torch.device(device_name if torch.cuda.is_available() and device_name == "cuda" else "cpu")
    logger.info("Using device: %s", device)

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if mock_train or data_dir is None:
        logger.info("Running in mock-train self-test mode...")
        dataset: Dataset = MockFaceDataset(num_samples=32)
    else:
        dataset = UTKFaceDataset(data_dir)

    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True, drop_last=False)

    model = MultiTaskDemographicsNet(pretrained=False)
    model.to(device)
    model.train()

    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    bce_loss = nn.BCEWithLogitsLoss()
    l1_loss = nn.L1Loss()

    logger.info("Starting training for %d epochs...", epochs)
    for epoch in range(1, epochs + 1):
        total_loss = 0.0
        for batch_idx, (imgs, genders, ages) in enumerate(loader):
            imgs = imgs.to(device)
            genders = genders.to(device)
            ages = ages.to(device)

            optimizer.zero_grad()
            sex_logits, age_pred = model(imgs)

            loss_sex = bce_loss(sex_logits, genders)
            loss_age = l1_loss(age_pred, ages)
            loss = loss_sex + (age_loss_weight * loss_age)

            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        avg_loss = total_loss / max(1, len(loader))
        logger.info("Epoch [%d/%d] - Average Loss: %.4f", epoch, epochs, avg_loss)

    # Export PyTorch weights
    model.eval()
    pt_path = output_dir / "demographics_mobilenetv3.pt"
    torch.save(model.state_dict(), pt_path)
    logger.info("Saved PyTorch weights: %s", pt_path)

    # Export ONNX model (using classic TorchScript-based exporter for maximum compatibility)
    onnx_path = output_dir / "demographics_mobilenetv3.onnx"
    dummy_input = torch.randn(1, 3, 224, 224, device=device)
    torch.onnx.export(
        model,
        dummy_input,
        str(onnx_path),
        input_names=["input_image"],
        output_names=["sex_logits", "age_pred"],
        dynamic_axes={"input_image": {0: "batch_size"}, "sex_logits": {0: "batch_size"}, "age_pred": {0: "batch_size"}},
        opset_version=18,
        dynamo=False,
    )
    logger.info("Exported ONNX graph: %s", onnx_path)
    return pt_path, onnx_path


def main():
    parser = argparse.ArgumentParser(description="Train and Export Demographics (Sex & Age) Multi-Task Model")
    parser.add_argument("--data-dir", type=str, default=None, help="Path to UTKFace cropped images folder")
    parser.add_argument("--output-dir", type=str, default="models", help="Directory to save exported models")
    parser.add_argument("--epochs", type=int, default=1, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=8, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate")
    parser.add_argument("--mock-train", action="store_true", help="Run mock training to generate sample model")
    parser.add_argument("--device", type=str, default="cpu", help="Device (cpu or cuda)")
    args = parser.parse_args()

    train_and_export(
        data_dir=Path(args.data_dir) if args.data_dir else None,
        output_dir=Path(args.output_dir),
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        mock_train=args.mock_train,
        device_name=args.device,
    )


if __name__ == "__main__":
    main()
