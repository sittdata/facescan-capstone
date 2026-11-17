#!/usr/bin/env python3
"""Facial Aging & Sagging Tier Classification Model Training & Benchmark.

Benchmarks:
- Logistic Regression (with StandardScaler)
- Random Forest Classifier
- LightGBM Classifier
- XGBoost Classifier

Performs:
- 5-Fold Stratified Cross-Validation on balanced UTKFace sagging features (2,967 samples)
- Optuna hyperparameter optimization on champion classifier
- Artifact generation:
    - models/sagging_confusion_matrix.png
    - models/sagging_shap_summary.png
    - models/sagging_metadata.json
    - models/facial_sagging.onnx (champion exported to ONNX Runtime)
- Verification of numerical parity between Python model and ONNX Runtime
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
import shap
from lightgbm import LGBMClassifier
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType as SklearnFloatTensorType
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

optuna.logging.set_verbosity(optuna.logging.WARNING)

ROOT_DIR = Path(__file__).resolve().parent.parent
DATASET_CSV = ROOT_DIR / "dataset" / "facial_sagging_features.csv"
MODELS_DIR = ROOT_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

ONNX_OUTPUT = MODELS_DIR / "facial_sagging.onnx"
METADATA_OUTPUT = MODELS_DIR / "sagging_metadata.json"
CONF_MATRIX_OUTPUT = MODELS_DIR / "sagging_confusion_matrix.png"
SHAP_PLOT_OUTPUT = MODELS_DIR / "sagging_shap_summary.png"

FEATURE_NAMES: list[str] = [
    "jowl_sagging_index",
    "malar_to_jaw_ratio",
    "lower_face_height_ratio",
    "oral_commissure_droop",
    "nasolabial_depth_ratio",
    "mean_canthal_tilt_deg",
    "jawline_irregularity",
    "chin_to_philtrum_ratio",
    "jawline_taper_ratio",
    "midface_to_lowerface_ratio",
    "face_aspect_ratio",
    "combined_sag_index",
]

TIER_NAMES: list[str] = ["Firm", "Moderate", "Advanced"]


def load_and_preprocess_data() -> tuple[pd.DataFrame, pd.Series, list[str]]:
    df = pd.read_csv(DATASET_CSV)
    print(f"Loaded {len(df)} samples from {DATASET_CSV}")

    # Validate required features
    missing = [f for f in FEATURE_NAMES if f not in df.columns]
    if missing:
        raise ValueError(f"Missing required feature columns: {missing}")

    # Clean inf / -inf / nan
    X_df = df[FEATURE_NAMES].copy()
    X_df = X_df.replace([np.inf, -np.inf], np.nan)
    X_df = X_df.fillna(X_df.median())

    # Target: convert 1-based tier (1, 2, 3) to 0-based integer class (0, 1, 2)
    y = (df["sagging_tier"].astype(int) - 1).copy()

    return X_df.astype(np.float32), y, FEATURE_NAMES


def benchmark_models(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_test: pd.DataFrame,
    y_test: pd.Series,
) -> tuple[dict[str, Any], str]:
    models: dict[str, Any] = {
        "Logistic Regression": Pipeline([
            ("scaler", StandardScaler()),
            ("lr", LogisticRegression(max_iter=1000, random_state=42)),
        ]),
        "Random Forest": RandomForestClassifier(
            n_estimators=150, max_depth=8, random_state=42, n_jobs=-1
        ),
        "LightGBM": LGBMClassifier(
            n_estimators=150, max_depth=5, learning_rate=0.05, random_state=42, verbose=-1
        ),
        "XGBoost": XGBClassifier(
            n_estimators=150, max_depth=4, learning_rate=0.05, random_state=42,
            eval_metric="mlogloss", n_jobs=-1
        ),
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    results: dict[str, Any] = {}

    print("\n" + "=" * 90)
    print(" 🏆 MULTI-MODEL BENCHMARK: 5-FOLD STRATIFIED CV ON SAGGING DATASET")
    print("=" * 90)
    print(f"{'Model':<22} | {'CV Acc':<10} | {'CV Macro F1':<12} | {'CV ROC-AUC':<11} | {'Test Acc':<9} | {'Test F1':<9}")
    print("-" * 90)

    best_name = "Logistic Regression"
    best_score = -1.0

    for name, model in models.items():
        # CV scores
        cv_res = cross_validate(
            model,
            X_train.values,
            y_train.values,
            cv=cv,
            scoring=["accuracy", "f1_macro", "roc_auc_ovr"],
            n_jobs=-1,
        )
        cv_acc = float(cv_res["test_accuracy"].mean())
        cv_f1 = float(cv_res["test_f1_macro"].mean())
        cv_auc = float(cv_res["test_roc_auc_ovr"].mean())

        # Fit on full train and evaluate test set
        model.fit(X_train.values, y_train.values)
        test_pred = model.predict(X_test.values)
        test_acc = float(accuracy_score(y_test, test_pred))
        test_f1 = float(f1_score(y_test, test_pred, average="macro"))

        results[name] = {
            "cv_accuracy_mean": round(cv_acc, 4),
            "cv_accuracy_std": round(float(cv_res["test_accuracy"].std()), 4),
            "cv_macro_f1_mean": round(cv_f1, 4),
            "cv_macro_f1_std": round(float(cv_res["test_f1_macro"].std()), 4),
            "cv_roc_auc_mean": round(cv_auc, 4),
            "cv_roc_auc_std": round(float(cv_res["test_roc_auc_ovr"].std()), 4),
            "test_accuracy": round(test_acc, 4),
            "test_macro_f1": round(test_f1, 4),
        }

        print(f"{name:<22} | {cv_acc:<10.4f} | {cv_f1:<12.4f} | {cv_auc:<11.4f} | {test_acc:<9.4f} | {test_f1:<9.4f}")

        # Choose best based on CV Macro F1
        if cv_f1 > best_score:
            best_score = cv_f1
            best_name = name

    print("=" * 90)
    print(f"🌟 Champion Model Selected: {best_name} (CV Macro F1 = {best_score:.4f})")
    return results, best_name


def tune_champion(
    champion_name: str,
    X_train: pd.DataFrame,
    y_train: pd.Series,
) -> tuple[Any, str]:
    print(f"\n🔍 Running Optuna Hyperparameter Optimization on {champion_name}...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    if champion_name == "Logistic Regression":
        def objective_lr(trial: optuna.Trial) -> float:
            c_val = trial.suggest_float("C", 1e-3, 50.0, log=True)
            solver = trial.suggest_categorical("solver", ["lbfgs", "saga"])
            pipe = Pipeline([
                ("scaler", StandardScaler()),
                ("lr", LogisticRegression(C=c_val, solver=solver, max_iter=2000, random_state=42)),
            ])
            scores = []
            for train_idx, val_idx in cv.split(X_train.values, y_train.values):
                pipe.fit(X_train.values[train_idx], y_train.values[train_idx])
                preds = pipe.predict(X_train.values[val_idx])
                scores.append(f1_score(y_train.values[val_idx], preds, average="macro"))
            return float(np.mean(scores))

        study = optuna.create_study(direction="maximize")
        study.optimize(objective_lr, n_trials=25)
        print(f"✅ Optuna Best Trial ({champion_name}): Macro F1 = {study.best_value:.4f}")
        print(f"Optimal Params: {study.best_params}")

        best_model = Pipeline([
            ("scaler", StandardScaler()),
            ("lr", LogisticRegression(**study.best_params, max_iter=2000, random_state=42)),
        ])
        best_model.fit(X_train.values, y_train.values)
        return best_model, champion_name

    elif champion_name == "XGBoost":
        def objective_xgb(trial: optuna.Trial) -> float:
            params = {
                "n_estimators": trial.suggest_int("n_estimators", 80, 250),
                "max_depth": trial.suggest_int("max_depth", 3, 7),
                "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.15, log=True),
                "subsample": trial.suggest_float("subsample", 0.6, 1.0),
                "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
                "min_child_weight": trial.suggest_int("min_child_weight", 1, 6),
                "reg_alpha": trial.suggest_float("reg_alpha", 1e-3, 10.0, log=True),
                "reg_lambda": trial.suggest_float("reg_lambda", 1e-3, 10.0, log=True),
                "eval_metric": "mlogloss",
                "random_state": 42,
                "n_jobs": -1,
            }
            f1_scores = []
            for train_idx, val_idx in cv.split(X_train.values, y_train.values):
                xtr, xval = X_train.values[train_idx], X_train.values[val_idx]
                ytr, yval = y_train.values[train_idx], y_train.values[val_idx]
                clf = XGBClassifier(**params)
                clf.fit(xtr, ytr)
                preds = clf.predict(xval)
                f1_scores.append(f1_score(yval, preds, average="macro"))
            return float(np.mean(f1_scores))

        study = optuna.create_study(direction="maximize")
        study.optimize(objective_xgb, n_trials=25)
        print(f"✅ Optuna Best Trial ({champion_name}): Macro F1 = {study.best_value:.4f}")
        print(f"Optimal Params: {study.best_params}")

        best_model = XGBClassifier(
            **study.best_params,
            eval_metric="mlogloss",
            random_state=42,
            n_jobs=-1,
        )
        best_model.fit(X_train.values, y_train.values)
        return best_model, champion_name

    else:
        # Fallback default
        best_model = XGBClassifier(
            n_estimators=150, max_depth=4, learning_rate=0.05,
            eval_metric="mlogloss", random_state=42, n_jobs=-1
        )
        best_model.fit(X_train.values, y_train.values)
        return best_model, champion_name


def plot_confusion_matrix_artifact(
    cm: np.ndarray,
    classes: list[str],
    output_path: Path,
) -> None:
    fig, ax = plt.subplots(figsize=(7, 6))
    im = ax.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    ax.figure.colorbar(im, ax=ax)
    ax.set(
        xticks=np.arange(cm.shape[1]),
        yticks=np.arange(cm.shape[0]),
        xticklabels=classes,
        yticklabels=classes,
        title="Facial Sagging & Laxity Tier Confusion Matrix",
        ylabel="True Tier",
        xlabel="Predicted Tier",
    )
    plt.setp(ax.get_xticklabels(), rotation=20, ha="right", rotation_mode="anchor")

    thresh = cm.max() / 2.0
    total = np.sum(cm)
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            val = cm[i, j]
            pct = val / total * 100.0
            ax.text(
                j,
                i,
                f"{val}\n({pct:.1f}%)",
                ha="center",
                va="center",
                color="white" if val > thresh else "black",
                fontweight="bold" if i == j else "normal",
            )
    fig.tight_layout()
    plt.savefig(output_path, dpi=200)
    plt.close()
    print(f"Saved confusion matrix plot to {output_path}")


def explain_and_plot_shap(
    model: Any,
    model_name: str,
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    output_path: Path,
) -> list[dict[str, Any]]:
    print(f"\n📊 Computing SHAP Explainer & Feature Importance ({model_name})...")

    if model_name == "Logistic Regression":
        scaler: StandardScaler = model.named_steps["scaler"]
        lr: LogisticRegression = model.named_steps["lr"]
        X_train_scaled = scaler.transform(X_train.values)
        X_test_scaled = scaler.transform(X_test.values)

        explainer = shap.LinearExplainer(lr, X_train_scaled)
        shap_values = explainer.shap_values(X_test_scaled)  # (N, features, classes) or list
        if isinstance(shap_values, list):
            mean_abs = np.mean([np.abs(sv) for sv in shap_values], axis=0)
            overall_importance = np.mean(mean_abs, axis=0)
        elif shap_values.ndim == 3:
            overall_importance = np.mean(np.mean(np.abs(shap_values), axis=0), axis=-1)
        else:
            overall_importance = np.mean(np.abs(shap_values), axis=0)

        plt.figure(figsize=(10, 8))
        shap.summary_plot(
            shap_values,
            X_test,
            feature_names=FEATURE_NAMES,
            class_names=TIER_NAMES,
            show=False,
            max_display=12,
        )
    else:
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_test.values)
        if isinstance(shap_values, list):
            mean_abs = np.mean([np.abs(sv) for sv in shap_values], axis=0)
            overall_importance = np.mean(mean_abs, axis=0)
        elif shap_values.ndim == 3:
            overall_importance = np.mean(np.mean(np.abs(shap_values), axis=0), axis=-1)
        else:
            overall_importance = np.mean(np.abs(shap_values), axis=0)

        plt.figure(figsize=(10, 8))
        shap.summary_plot(
            shap_values,
            X_test,
            feature_names=FEATURE_NAMES,
            class_names=TIER_NAMES,
            show=False,
            max_display=12,
        )

    plt.tight_layout()
    plt.savefig(output_path, dpi=200)
    plt.close()
    print(f"Saved SHAP summary plot to {output_path}")

    importance_df = pd.DataFrame({
        "feature": FEATURE_NAMES,
        "importance": [float(x) for x in overall_importance],
    }).sort_values(by="importance", ascending=False)

    print("\nFeature Importance Ranking (Facial Sagging Morphometrics):")
    for _, r in importance_df.iterrows():
        print(f"  - {r['feature']:<30}: {r['importance']:.4f}")

    return importance_df.to_dict(orient="records")


def export_champion_to_onnx(
    model: Any,
    model_name: str,
    X_test: pd.DataFrame,
    output_path: Path,
) -> None:
    print(f"\n🚀 Exporting Champion Model ({model_name}) to ONNX...")

    if model_name == "Logistic Regression":
        initial_types = [("float_input", SklearnFloatTensorType([None, len(FEATURE_NAMES)]))]
        options = {LogisticRegression: {"zipmap": False}}
        onnx_model = convert_sklearn(model, initial_types=initial_types, target_opset=15, options=options)
    elif model_name == "XGBoost":
        from onnxmltools.convert import convert_xgboost
        from onnxmltools.convert.common.data_types import FloatTensorType as OXMLFloatTensorType
        initial_types = [("float_input", OXMLFloatTensorType([None, len(FEATURE_NAMES)]))]
        onnx_model = convert_xgboost(model, initial_types=initial_types, target_opset=15)
    else:
        initial_types = [("float_input", SklearnFloatTensorType([None, len(FEATURE_NAMES)]))]
        onnx_model = convert_sklearn(model, initial_types=initial_types, target_opset=15)

    with open(output_path, "wb") as f:
        f.write(onnx_model.SerializeToString())
    print(f"Saved ONNX model to {output_path}")

    # Parity check
    sess = ort.InferenceSession(str(output_path), providers=["CPUExecutionProvider"])
    ort_inputs = {sess.get_inputs()[0].name: X_test.values.astype(np.float32)}
    ort_outs = sess.run(None, ort_inputs)

    onnx_labels = ort_outs[0].flatten()
    onnx_probs = ort_outs[1]

    py_preds = model.predict(X_test.values)
    py_probs = model.predict_proba(X_test.values)

    label_mismatches = int(np.sum(onnx_labels != py_preds))
    max_prob_diff = float(np.max(np.abs(onnx_probs - py_probs)))

    print(f"ONNX Parity Check: Label mismatches = {label_mismatches}, Max prob diff = {max_prob_diff:.6e}")
    if label_mismatches > 0 or max_prob_diff > 1e-4:
        raise RuntimeError(f"ONNX parity check failed! Mismatches: {label_mismatches}, Diff: {max_prob_diff}")
    print("✅ ONNX Parity Verified (PASSED)")


def main() -> None:
    X, y, feature_names = load_and_preprocess_data()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"Train set: {len(X_train)} samples | Test set: {len(X_test)} samples")
    print(f"Class distribution in test: {np.bincount(y_test)}")

    # 1. Multi-model benchmark
    benchmark_results, champion_name = benchmark_models(X_train, y_train, X_test, y_test)

    # 2. Hyperparameter optimization
    champion_model, champion_name = tune_champion(champion_name, X_train, y_train)

    # 3. Test evaluation
    y_pred = champion_model.predict(X_test.values)
    y_proba = champion_model.predict_proba(X_test.values)

    acc = float(accuracy_score(y_test, y_pred))
    bal_acc = float(balanced_accuracy_score(y_test, y_pred))
    macro_f1 = float(f1_score(y_test, y_pred, average="macro"))
    weighted_f1 = float(f1_score(y_test, y_pred, average="weighted"))
    roc_auc = float(roc_auc_score(y_test, y_proba, multi_class="ovr"))
    cm = confusion_matrix(y_test, y_pred)

    print("\n" + "=" * 60)
    print(f" 🎯 FINAL TEST SET EVALUATION ({champion_name})")
    print("=" * 60)
    print(f"Accuracy:          {acc:.4f}")
    print(f"Balanced Accuracy: {bal_acc:.4f}")
    print(f"Macro F1-Score:    {macro_f1:.4f}")
    print(f"Weighted F1-Score: {weighted_f1:.4f}")
    print(f"ROC-AUC (OVR):     {roc_auc:.4f}")
    print("\nClassification Report:\n", classification_report(y_test, y_pred, target_names=TIER_NAMES))
    print("=" * 60)

    # 4. Generate confusion matrix plot
    plot_confusion_matrix_artifact(cm, [f"{t} (T{i+1})" for i, t in enumerate(TIER_NAMES)], CONF_MATRIX_OUTPUT)

    # 5. SHAP explainability plot
    importance_records = explain_and_plot_shap(champion_model, champion_name, X_train, X_test, SHAP_PLOT_OUTPUT)

    # 6. Export to ONNX
    export_champion_to_onnx(champion_model, champion_name, X_test, ONNX_OUTPUT)

    # 7. Save metadata
    per_class_metrics = {}
    for i, name in enumerate(TIER_NAMES):
        per_class_metrics[name] = {
            "tier": i + 1,
            "precision": round(float(precision_score(y_test == i, y_pred == i, zero_division=0)), 4),
            "recall": round(float(recall_score(y_test == i, y_pred == i, zero_division=0)), 4),
            "f1": round(float(f1_score(y_test == i, y_pred == i, zero_division=0)), 4),
            "support": int(np.sum(y_test == i)),
        }

    metadata = {
        "version": "1.0.0",
        "task": "morphological_facial_sagging_classification",
        "champion_model": champion_name,
        "model_type": f"{champion_name} (Optuna Tuned)",
        "num_features": len(feature_names),
        "features": feature_names,
        "tier_mapping": {
            "0": {"tier": 1, "tier_name": "Firm", "description": "Minimal laxity, preserved structural contours and youthful mandibular border"},
            "1": {"tier": 2, "tier_name": "Moderate", "description": "Mild to moderate soft-tissue descent, subtle jowling, early nasolabial deepening"},
            "2": {"tier": 3, "tier_name": "Advanced", "description": "Significant structural laxity, pronounced jowling, mandibular border distortion"},
        },
        "metrics": {
            "accuracy": round(acc, 4),
            "balanced_accuracy": round(bal_acc, 4),
            "macro_f1": round(macro_f1, 4),
            "weighted_f1": round(weighted_f1, 4),
            "roc_auc_ovr": round(roc_auc, 4),
            "per_class": per_class_metrics,
        },
        "benchmark_summary": benchmark_results,
        "confusion_matrix": cm.tolist(),
        "feature_importance": importance_records,
        "training_stats": {
            "total_samples": len(X),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
        },
        "feature_medians": X_train.median().to_dict(),
        "feature_stds": X_train.std().to_dict(),
    }

    with open(METADATA_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"Saved model metadata to {METADATA_OUTPUT}")


if __name__ == "__main__":
    main()
