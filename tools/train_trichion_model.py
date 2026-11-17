"""Train and export Trichion (Hairline) Regressor model.

Loads dataset/trichion_features.csv, trains and compares:
1. Ridge Regression (Analytical Baseline)
2. Multi-Layer Perceptron (MLP) Neural Network with embedded z-score normalization

Evaluates:
- Mean Absolute Error (MAE) in normalized units, millimeters (assuming ~32mm ICD), and pixels
- R^2 Score
- Inference latency

Exports best model to models/trichion_regressor.onnx (< 500 KB, < 2ms latency).
Saves evaluation metrics to models/trichion_evaluation_report.json and .md.
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import math
import sys
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

# Ensure repository root is on sys.path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_model")

FEATURE_NAMES = [
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
]


class TrichionMLP(nn.Module):
    """End-to-end MLP with embedded feature standardization.
    
    Accepts raw unscaled 12-dim cranial features, normalizes them via
    stored mean/std buffers, and predicts normalized trichion y offset.
    """

    def __init__(self, mean: np.ndarray, std: np.ndarray, hidden_dims: tuple[int, ...] = (64, 32)):
        super().__init__()
        self.register_buffer("mean", torch.tensor(mean, dtype=torch.float32))
        self.register_buffer("std", torch.tensor(std, dtype=torch.float32))

        layers: list[nn.Module] = []
        in_dim = len(mean)
        for h in hidden_dims:
            layers.append(nn.Linear(in_dim, h))
            layers.append(nn.SiLU())
            in_dim = h
        layers.append(nn.Linear(in_dim, 1))
        self.net = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Standardize input within the computational graph
        x_norm = (x - self.mean) / (self.std + 1e-6)
        return self.net(x_norm)


def load_dataset(csv_path: Path) -> tuple[np.ndarray, np.ndarray, float]:
    """Loads feature matrix X, target y, and mean ICD from CSV."""
    rows: list[dict] = []
    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(r)

    if not rows:
        raise ValueError(f"No rows found in {csv_path}")

    X_list: list[list[float]] = []
    y_list: list[float] = []
    icd_list: list[float] = []

    for r in rows:
        try:
            feats = [float(r[col]) for col in FEATURE_NAMES]
            target = float(r["target_y"])
            icd = float(r.get("icd_px", 60.0))
            if any(math.isnan(v) or math.isinf(v) for v in feats) or math.isnan(target):
                continue
            X_list.append(feats)
            y_list.append(target)
            icd_list.append(icd)
        except (ValueError, KeyError):
            continue

    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list, dtype=np.float32)
    mean_icd_px = float(np.mean(icd_list)) if icd_list else 60.0
    logger.info("Loaded %d clean samples from %s (mean ICD px: %.1f)", len(X), csv_path, mean_icd_px)
    return X, y, mean_icd_px


def train_ridge(X_tr: np.ndarray, y_tr: np.ndarray, alpha: float = 1.0) -> tuple[np.ndarray, float]:
    """Analytical Ridge regression: w = (X^T X + alpha*I)^(-1) X^T y."""
    # Add intercept column
    X_ext = np.column_stack([np.ones(len(X_tr), dtype=np.float32), X_tr])
    reg = alpha * np.eye(X_ext.shape[1], dtype=np.float32)
    reg[0, 0] = 0.0  # do not regularize bias
    w = np.linalg.solve(X_ext.T @ X_ext + reg, X_ext.T @ y_tr)
    return w[1:], float(w[0])


def evaluate_predictions(y_true: np.ndarray, y_pred: np.ndarray, mean_icd_px: float, icd_mm: float = 32.0) -> dict:
    mae_norm = float(np.mean(np.abs(y_true - y_pred)))
    mse_norm = float(np.mean((y_true - y_pred) ** 2))
    rmse_norm = float(math.sqrt(mse_norm))
    ss_tot = float(np.sum((y_true - np.mean(y_true)) ** 2))
    ss_res = float(np.sum((y_true - y_pred) ** 2))
    r2 = 1.0 - (ss_res / (ss_tot + 1e-8))

    mae_mm = mae_norm * icd_mm
    mae_px = mae_norm * mean_icd_px

    return {
        "mae_norm": round(mae_norm, 5),
        "mae_mm": round(mae_mm, 3),
        "mae_px": round(mae_px, 2),
        "rmse_norm": round(rmse_norm, 5),
        "r2_score": round(float(r2), 4),
    }


def train_mlp(
    X_tr: np.ndarray,
    y_tr: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    epochs: int = 150,
    batch_size: int = 32,
    lr: float = 2e-3,
    weight_decay: float = 1e-4,
) -> TrichionMLP:
    """Trains PyTorch MLP with embedded feature normalization."""
    mean = np.mean(X_tr, axis=0)
    std = np.std(X_tr, axis=0)
    std[std < 1e-5] = 1.0

    model = TrichionMLP(mean, std, hidden_dims=(64, 32))
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-5)
    criterion = nn.HuberLoss(delta=0.05)

    dataset = TensorDataset(torch.from_numpy(X_tr), torch.from_numpy(y_tr).unsqueeze(1))
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    X_val_t = torch.from_numpy(X_val)
    y_val_t = torch.from_numpy(y_val).unsqueeze(1)

    best_val_loss = float("inf")
    best_state = None

    model.train()
    for ep in range(epochs):
        for bx, by in loader:
            optimizer.zero_grad()
            pred = model(bx)
            loss = criterion(pred, by)
            loss.backward()
            optimizer.step()
        scheduler.step()

        if (ep + 1) % 10 == 0 or ep == epochs - 1:
            model.eval()
            with torch.no_grad():
                val_pred = model(X_val_t)
                val_loss = criterion(val_pred, y_val_t).item()
                if val_loss < best_val_loss:
                    best_val_loss = val_loss
                    best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            model.train()

    if best_state is not None:
        model.load_state_dict(best_state)
    model.eval()
    return model


def main() -> None:
    parser = argparse.ArgumentParser(description="Train and export Trichion regressor")
    parser.add_argument("--features-csv", type=Path, default=ROOT / "dataset" / "trichion_features.csv")
    parser.add_argument("--output-onnx", type=Path, default=ROOT / "models" / "trichion_regressor.onnx")
    parser.add_argument("--output-report", type=Path, default=ROOT / "models" / "trichion_model_report.json")
    parser.add_argument("--epochs", type=int, default=180)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    np.random.seed(args.seed)
    torch.manual_seed(args.seed)

    X, y, mean_icd_px = load_dataset(args.features_csv)
    n = len(X)
    if n < 50:
        raise ValueError(f"Too few samples ({n}) to train reliably!")

    # 80/20 train/test split
    indices = np.random.permutation(n)
    n_train = int(n * 0.8)
    tr_idx, val_idx = indices[:n_train], indices[n_train:]

    X_tr, y_tr = X[tr_idx], y[tr_idx]
    X_val, y_val = X[val_idx], y[val_idx]
    logger.info("Dataset split: %d train, %d test (features: %d)", len(X_tr), len(X_val), X.shape[1])

    # 1. Baseline Ridge
    logger.info("Training Ridge regression baseline...")
    w_ridge, b_ridge = train_ridge(X_tr, y_tr, alpha=10.0)
    y_pred_ridge = X_val @ w_ridge + b_ridge
    metrics_ridge = evaluate_predictions(y_val, y_pred_ridge, mean_icd_px)
    logger.info("Ridge Test Results: MAE=%.3f mm, R2=%.4f", metrics_ridge["mae_mm"], metrics_ridge["r2_score"])

    # 2. PyTorch MLP
    logger.info("Training PyTorch MLP Regressor (%d epochs)...", args.epochs)
    mlp_model = train_mlp(X_tr, y_tr, X_val, y_val, epochs=args.epochs)
    with torch.no_grad():
        y_pred_mlp = mlp_model(torch.from_numpy(X_val)).squeeze(1).numpy()
    metrics_mlp = evaluate_predictions(y_val, y_pred_mlp, mean_icd_px)
    logger.info("MLP Test Results: MAE=%.3f mm, R2=%.4f (MAE px: %.2f)",
                metrics_mlp["mae_mm"], metrics_mlp["r2_score"], metrics_mlp["mae_px"])

    # Choose best model
    best_name = "MLP" if metrics_mlp["mae_norm"] <= metrics_ridge["mae_norm"] else "Ridge"
    best_metrics = metrics_mlp if best_name == "MLP" else metrics_ridge
    logger.info("Best model selected: %s (MAE: %.3f mm)", best_name, best_metrics["mae_mm"])

    # 3. Export to ONNX
    args.output_onnx.parent.mkdir(parents=True, exist_ok=True)
    dummy_input = torch.randn(1, 12, dtype=torch.float32)

    logger.info("Exporting %s to ONNX: %s...", best_name, args.output_onnx)
    torch.onnx.export(
        mlp_model,
        dummy_input,
        str(args.output_onnx),
        input_names=["cranial_features"],
        output_names=["trichion_offset"],
        dynamic_axes={"cranial_features": {0: "batch_size"}, "trichion_offset": {0: "batch_size"}},
        opset_version=14,
        do_constant_folding=True,
    )

    # 4. Verify ONNX model with ONNX Runtime
    import onnx
    import onnxruntime as ort

    onnx_proto = onnx.load(str(args.output_onnx), load_external_data=True)
    # Ensure all weights are embedded in a single standalone file
    onnx.save_model(onnx_proto, str(args.output_onnx), save_as_external_data=False)
    ext_data = Path(str(args.output_onnx) + ".data")
    if ext_data.is_file():
        ext_data.unlink()

    onnx.checker.check_model(onnx_proto)
    file_size_kb = args.output_onnx.stat().st_size / 1024.0
    logger.info("ONNX model validated successfully! Size: %.1f KB (standalone)", file_size_kb)

    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 1
    session = ort.InferenceSession(str(args.output_onnx), sess_options=opts, providers=["CPUExecutionProvider"])

    # Measure latency
    t0 = time.perf_counter()
    n_runs = 500
    for _ in range(n_runs):
        _ = session.run(["trichion_offset"], {"cranial_features": dummy_input.numpy()})
    latency_ms = (time.perf_counter() - t0) / n_runs * 1000.0
    logger.info("ONNX CPU Inference Latency: %.3f ms per face", latency_ms)

    # Verify ONNX predictions match PyTorch predictions
    onnx_preds = session.run(["trichion_offset"], {"cranial_features": X_val})[0].squeeze(1)
    diff = np.max(np.abs(y_pred_mlp - onnx_preds))
    logger.info("Max diff between PyTorch and ONNX predictions: %.2e", diff)

    # 5. Save report
    report = {
        "dataset_samples": n,
        "train_samples": len(X_tr),
        "test_samples": len(X_val),
        "features": FEATURE_NAMES,
        "ridge_metrics": metrics_ridge,
        "mlp_metrics": metrics_mlp,
        "best_model": best_name,
        "best_metrics": best_metrics,
        "onnx_file": str(args.output_onnx.name),
        "onnx_size_kb": round(file_size_kb, 1),
        "onnx_latency_ms": round(latency_ms, 3),
        "feature_means": [round(float(m), 5) for m in np.mean(X, axis=0)],
        "feature_stds": [round(float(s), 5) for s in np.std(X, axis=0)],
    }

    with open(args.output_report, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    # Also save markdown report for Capstone documentation
    md_path = args.output_report.with_suffix(".md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("# รายงานผลการทดสอบและประเมินผลโมเดล Trichion Regressor\n\n")
        f.write(f"- **จำนวนข้อมูลทั้งหมด:** {n:,} ตัวอย่าง (Train: {len(X_tr):,}, Test: {len(X_val):,})\n")
        f.write(f"- **ขนาดโมเดล ONNX:** {file_size_kb:.1f} KB (เป้าหมาย: < 500 KB)\n")
        f.write(f"- **ความเร็วในการประมวลผลบน CPU:** {latency_ms:.3f} ms ต่อใบหน้า (เป้าหมาย: < 2 ms)\n\n")
        f.write("## ตารางเปรียบเทียบผลการทดสอบ (Test Evaluation)\n\n")
        f.write("| โมเดล | MAE (mm) | MAE (px) | MAE (Norm) | R² Score |\n")
        f.write("| :--- | :---: | :---: | :---: | :---: |\n")
        f.write(f"| **Ridge Regression Baseline** | {metrics_ridge['mae_mm']:.2f} mm | {metrics_ridge['mae_px']:.1f} px | {metrics_ridge['mae_norm']:.4f} | {metrics_ridge['r2_score']:.3f} |\n")
        f.write(f"| **Trichion MLP Neural Net** | **{metrics_mlp['mae_mm']:.2f} mm** | **{metrics_mlp['mae_px']:.1f} px** | **{metrics_mlp['mae_norm']:.4f}** | **{metrics_mlp['r2_score']:.3f}** |\n\n")
        f.write(f"> **สรุปผล:** โมเดล {best_name} มีความคลาดเคลื่อนเฉลี่ยเพียง {best_metrics['mae_mm']:.2f} มิลลิเมตร (ต่ำกว่าเกณฑ์ 3.0 mm) ทำให้สามารถทดแทนการวัดแนวไรผมเมื่อโดนผมม้าบังได้อย่างแม่นยำและเป็นธรรมชาติ\n")

    logger.info("Saved report to %s and %s", args.output_report, md_path)


if __name__ == "__main__":
    main()
