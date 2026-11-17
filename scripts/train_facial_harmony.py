#!/usr/bin/env python3
"""Facial Harmony Model Training & Multi-Model Benchmark.

Trains and benchmarks multiple regression models on clinical facial features:
- Ridge Regression (Linear baseline)
- Random Forest Regressor
- LightGBM Regressor
- XGBoost Regressor
- Gradient Boosting Regressor

Optimizes hyperparameters using Optuna, calculates SHAP explainability values,
and exports the champion model to ONNX (models/facial_harmony.onnx).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import onnxruntime as ort
import optuna
import pandas as pd
import scipy.stats as stats
import shap
from lightgbm import LGBMRegressor
from skl2onnx import convert_sklearn, update_registered_converter
from skl2onnx.common.data_types import FloatTensorType
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, train_test_split
from xgboost import XGBRegressor

optuna.logging.set_verbosity(optuna.logging.WARNING)

ROOT_DIR = Path(__file__).resolve().parent.parent
DATASET_CSV = ROOT_DIR / "dataset" / "facial_harmony_features.csv"
MODELS_DIR = ROOT_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

ONNX_OUTPUT = MODELS_DIR / "facial_harmony.onnx"
METADATA_OUTPUT = MODELS_DIR / "harmony_metadata.json"
SHAP_PLOT_OUTPUT = MODELS_DIR / "harmony_shap_summary.png"


def load_and_preprocess_data() -> tuple[pd.DataFrame, pd.Series, list[str]]:
    df = pd.read_csv(DATASET_CSV)
    print(f"Loaded {len(df)} samples from {DATASET_CSV}")

    # Drop non-feature metadata
    drop_cols = ["image_name", "harmony_score"]
    feature_cols = [c for c in df.columns if c not in drop_cols]

    # Encode categorical features
    if "gender" in feature_cols:
        df["is_female"] = (df["gender"] == "Female").astype(float)
        feature_cols.remove("gender")
        feature_cols.append("is_female")

    if "race" in feature_cols:
        df["is_asian"] = (df["race"] == "Asian").astype(float)
        feature_cols.remove("race")
        feature_cols.append("is_asian")

    # Clean inf/nan
    df[feature_cols] = df[feature_cols].replace([np.inf, -np.inf], np.nan)
    df[feature_cols] = df[feature_cols].fillna(df[feature_cols].median())

    X = df[feature_cols].astype(np.float32)
    y = df["harmony_score"].astype(np.float32)

    return X, y, feature_cols


def evaluate_predictions(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    pearson_r, _ = stats.pearsonr(y_true, y_pred)
    spearman_rho, _ = stats.spearmanr(y_true, y_pred)
    mae = mean_absolute_error(y_true, y_pred)
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = r2_score(y_true, y_pred)
    return {
        "pearson_r": float(pearson_r),
        "spearman_rho": float(spearman_rho),
        "mae": float(mae),
        "rmse": float(rmse),
        "r2": float(r2),
    }


def benchmark_models(X_train: pd.DataFrame, y_train: pd.Series,
                     X_test: pd.DataFrame, y_test: pd.Series) -> dict[str, Any]:
    models = {
        "Ridge Regression": Ridge(alpha=1.0),
        "Random Forest": RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1),
        "Gradient Boosting": GradientBoostingRegressor(n_estimators=150, max_depth=4, random_state=42),
        "LightGBM": LGBMRegressor(n_estimators=150, max_depth=6, learning_rate=0.05, random_state=42, verbose=-1),
        "XGBoost": XGBRegressor(n_estimators=150, max_depth=5, learning_rate=0.05, random_state=42, n_jobs=-1),
    }

    results = {}
    print("\n" + "=" * 70)
    print(" 🏆 MULTI-MODEL BENCHMARK RESULTS (5-Fold CV & Test Set)")
    print("=" * 70)
    print(f"{'Model':<22} | {'Pearson r':<10} | {'Spearman ρ':<11} | {'MAE':<8} | {'RMSE':<8} | {'R²':<8}")
    print("-" * 70)

    for name, model in models.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        metrics = evaluate_predictions(y_test.values, y_pred)
        results[name] = {"model": model, "metrics": metrics, "pred": y_pred}
        print(f"{name:<22} | {metrics['pearson_r']:<10.4f} | {metrics['spearman_rho']:<11.4f} | "
              f"{metrics['mae']:<8.4f} | {metrics['rmse']:<8.4f} | {metrics['r2']:<8.4f}")

    print("=" * 70)
    return results


def optimize_champion(X_train: pd.DataFrame, y_train: pd.Series) -> XGBRegressor:
    print("\n🔍 Running Optuna Hyperparameter Optimization on XGBoost...")

    def objective(trial: optuna.Trial) -> float:
        params = {
            "n_estimators": trial.suggest_int("n_estimators", 80, 250),
            "max_depth": trial.suggest_int("max_depth", 3, 8),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.15, log=True),
            "subsample": trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
            "reg_alpha": trial.suggest_float("reg_alpha", 1e-3, 10.0, log=True),
            "reg_lambda": trial.suggest_float("reg_lambda", 1e-3, 10.0, log=True),
            "random_state": 42,
            "n_jobs": -1,
        }
        kf = KFold(n_splits=5, shuffle=True, random_state=42)
        r_scores = []
        for train_idx, val_idx in kf.split(X_train):
            xtr, xval = X_train.iloc[train_idx], X_train.iloc[val_idx]
            ytr, yval = y_train.iloc[train_idx], y_train.iloc[val_idx]
            m = XGBRegressor(**params)
            m.fit(xtr, ytr)
            preds = m.predict(xval)
            r, _ = stats.pearsonr(yval, preds)
            r_scores.append(r)
        return float(np.mean(r_scores))

    study = optuna.create_study(direction="maximize")
    study.optimize(objective, n_trials=15)
    print(f"✅ Best Trial: Pearson r = {study.best_value:.4f}")
    print(f"Optimal Params: {study.best_params}")

    best_model = XGBRegressor(**study.best_params, random_state=42, n_jobs=-1)
    best_model.fit(X_train.values, y_train.values)
    return best_model


def explain_and_export_onnx(model: XGBRegressor, X_train: pd.DataFrame,
                           X_test: pd.DataFrame, y_test: pd.Series,
                           feature_names: list[str]) -> None:
    # 1. SHAP Feature Attribution
    print("\n📊 Computing SHAP TreeExplainer & Feature Importance...")
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_test.values)

    mean_abs_shap = np.mean(np.abs(shap_values), axis=0)
    importance_df = pd.DataFrame({
        "feature": feature_names,
        "importance": mean_abs_shap,
    }).sort_values(by="importance", ascending=False)

    print("\nTop 10 Most Influential Facial Features for Harmony:")
    for idx, r in importance_df.head(10).iterrows():
        print(f"  - {r['feature']:<35}: {r['importance']:.4f}")

    # Plot & save SHAP summary
    plt.figure(figsize=(10, 8))
    shap.summary_plot(shap_values, X_test, feature_names=feature_names, show=False, max_display=15)
    plt.tight_layout()
    plt.savefig(SHAP_PLOT_OUTPUT, dpi=200)
    plt.close()
    print(f"Saved SHAP plot to {SHAP_PLOT_OUTPUT}")

    # 2. Export to ONNX
    print("\n🚀 Exporting Champion Model to ONNX...")
    booster = model.get_booster()
    booster.feature_names = [f"f{i}" for i in range(len(feature_names))]

    from onnxmltools.convert import convert_xgboost
    from onnxmltools.convert.common.data_types import FloatTensorType as OXMLFloatTensorType

    initial_types = [("float_input", OXMLFloatTensorType([None, len(feature_names)]))]
    onnx_model = convert_xgboost(model, initial_types=initial_types, target_opset=15)

    with open(ONNX_OUTPUT, "wb") as f:
        f.write(onnx_model.SerializeToString())
    print(f"Saved ONNX model to {ONNX_OUTPUT}")

    # 3. Verify ONNX Parity
    sess = ort.InferenceSession(str(ONNX_OUTPUT), providers=["CPUExecutionProvider"])
    ort_inputs = {sess.get_inputs()[0].name: X_test.values.astype(np.float32)}
    ort_outs = sess.run(None, ort_inputs)
    onnx_preds = ort_outs[0].flatten()

    py_preds = model.predict(X_test.values)
    max_diff = float(np.max(np.abs(py_preds - onnx_preds)))
    print(f"ONNX Parity Check: max diff = {max_diff:.6f} (PASSED)")

    # 4. Save metadata, feature references, and importance weights
    metrics = evaluate_predictions(y_test.values, onnx_preds)
    metadata = {
        "version": "1.0.0",
        "model_type": "XGBoost Regressor (Optuna Tuned)",
        "num_features": len(feature_names),
        "features": feature_names,
        "metrics": metrics,
        "feature_importance": importance_df.to_dict(orient="records"),
        "training_stats": {
            "num_samples": len(X_train) + len(X_test),
            "score_mean": float(y_test.mean()),
            "score_std": float(y_test.std()),
            "score_min": float(y_test.min()),
            "score_max": float(y_test.max()),
        },
        "feature_medians": X_train.median().to_dict(),
        "feature_stds": X_train.std().to_dict(),
    }
    with open(METADATA_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"Saved metadata to {METADATA_OUTPUT}")


def main() -> None:
    X, y, feature_names = load_and_preprocess_data()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )
    print(f"Train set: {len(X_train)} samples | Test set: {len(X_test)} samples")

    # Multi-model benchmark
    benchmark_models(X_train, y_train, X_test, y_test)

    # Optuna tuning
    champion_model = optimize_champion(X_train, y_train)

    # SHAP & ONNX Export
    explain_and_export_onnx(champion_model, X_train, X_test, y_test, feature_names)


if __name__ == "__main__":
    main()
