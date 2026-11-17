#!/usr/bin/env python3
"""Orthodontic Cephalometric Skeletal Deformity Classifier Training & Benchmark.

Benchmarks:
- Ridge / Logistic Regression (StandardScaler + L2 penalty)
- Random Forest Classifier
- LightGBM Classifier
- XGBoost Classifier

Workflow:
1. 5-Fold Stratified Cross-Validation benchmark across all 4 models.
2. Select champion model based on validation macro F1-score.
3. Optuna Bayesian hyperparameter optimization on the champion model.
4. Comprehensive test set evaluation (Accuracy, Balanced Acc, Macro/Weighted F1, ROC-AUC, CM).
5. Visualizations:
   - models/cephalometric_confusion_matrix.png
   - models/cephalometric_shap_summary.png
6. Export champion model to ONNX Runtime (models/cephalometric_model.onnx).
7. Rigorous numerical parity verification (ONNX vs scikit-learn/XGBoost).
8. Save clinical metadata & reference norms (models/cephalometric_metadata.json).
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
DATASET_CSV = ROOT_DIR / "dataset" / "cephalometric_features.csv"
MODELS_DIR = ROOT_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

ONNX_OUTPUT = MODELS_DIR / "cephalometric_model.onnx"
METADATA_OUTPUT = MODELS_DIR / "cephalometric_metadata.json"
CONF_MATRIX_OUTPUT = MODELS_DIR / "cephalometric_confusion_matrix.png"
SHAP_PLOT_OUTPUT = MODELS_DIR / "cephalometric_shap_summary.png"

FEATURE_NAMES: list[str] = [
    "sna_angle",
    "snb_angle",
    "anb_angle",
    "wits_appraisal_mm",
    "fma_angle",
    "gonial_angle",
    "u1_sn_angle",
    "impa_angle",
    "y_axis_angle",
    "jarabak_ratio",
]

CLASS_NAMES: list[str] = ["Class_I", "Class_II", "Class_III"]
CLASS_LABELS_TH: list[str] = [
    "Class I (สมดุลกระดูกขากรรไกรปกติ)",
    "Class II (ขากรรไกรล่างถอย / คางถอย)",
    "Class III (ขากรรไกรล่างยื่น / คางยื่น)",
]


def load_and_preprocess_data() -> tuple[pd.DataFrame, pd.Series, list[str]]:
    """Load dataset, validate columns, and clean missing values."""
    if not DATASET_CSV.exists():
        from scripts.generate_cephalometric_dataset import generate_cephalometric_data
        print(f"Dataset not found at {DATASET_CSV}. Generating new dataset...")
        df_gen = generate_cephalometric_data(n_per_class=800, seed=42)
        df_gen.to_csv(DATASET_CSV, index=False)

    df = pd.read_csv(DATASET_CSV)
    print(f"Loaded {len(df)} samples from {DATASET_CSV}")

    missing = [f for f in FEATURE_NAMES if f not in df.columns]
    if missing:
        raise ValueError(f"Missing required feature columns: {missing}")

    X_df = df[FEATURE_NAMES].copy()
    X_df = X_df.replace([np.inf, -np.inf], np.nan)
    X_df = X_df.fillna(X_df.median())

    y = df["skeletal_class"].astype(int).copy()
    return X_df, y, FEATURE_NAMES


def benchmark_models(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_test: pd.DataFrame,
    y_test: pd.Series,
) -> tuple[dict[str, Any], str]:
    """Run 5-Fold Stratified Cross-Validation on all candidate models."""
    print("\n" + "=" * 65)
    print(" 🔬 5-FOLD STRATIFIED CROSS-VALIDATION BENCHMARK")
    print("=" * 65)

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scoring = ["accuracy", "balanced_accuracy", "f1_macro", "f1_weighted"]

    candidates: dict[str, Any] = {
        "Logistic Regression (Ridge)": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(penalty="l2", C=1.0, max_iter=1000, random_state=42)),
        ]),
        "Random Forest": RandomForestClassifier(
            n_estimators=150, max_depth=10, min_samples_split=4, random_state=42, n_jobs=-1
        ),
        "LightGBM": LGBMClassifier(
            n_estimators=150, max_depth=6, learning_rate=0.05, subsample=0.8,
            random_state=42, verbose=-1, n_jobs=-1
        ),
        "XGBoost": XGBClassifier(
            n_estimators=150, max_depth=5, learning_rate=0.05, subsample=0.8,
            random_state=42, eval_metric="mlogloss", n_jobs=-1
        ),
    }

    benchmark_results: dict[str, Any] = {}
    best_f1 = -1.0
    champion_name = ""

    for name, model in candidates.items():
        print(f"\nEvaluating: {name}...")
        scores = cross_validate(model, X_train, y_train, cv=cv, scoring=scoring, n_jobs=-1)

        mean_acc = float(np.mean(scores["test_accuracy"]))
        std_acc = float(np.std(scores["test_accuracy"]))
        mean_bal_acc = float(np.mean(scores["test_balanced_accuracy"]))
        mean_f1_macro = float(np.mean(scores["test_f1_macro"]))
        std_f1_macro = float(np.std(scores["test_f1_macro"]))
        mean_f1_weighted = float(np.mean(scores["test_f1_weighted"]))

        # Fit on whole train set and test on held-out test
        model.fit(X_train, y_train)
        test_preds = model.predict(X_test)
        test_acc = float(accuracy_score(y_test, test_preds))
        test_f1_macro = float(f1_score(y_test, test_preds, average="macro"))

        benchmark_results[name] = {
            "cv_accuracy_mean": round(mean_acc, 4),
            "cv_accuracy_std": round(std_acc, 4),
            "cv_balanced_accuracy_mean": round(mean_bal_acc, 4),
            "cv_f1_macro_mean": round(mean_f1_macro, 4),
            "cv_f1_macro_std": round(std_f1_macro, 4),
            "cv_f1_weighted_mean": round(mean_f1_weighted, 4),
            "test_accuracy": round(test_acc, 4),
            "test_f1_macro": round(test_f1_macro, 4),
        }

        print(f"  CV Macro F1: {mean_f1_macro:.4f} ± {std_f1_macro:.4f} | Test Macro F1: {test_f1_macro:.4f}")

        if mean_f1_macro > best_f1:
            best_f1 = mean_f1_macro
            champion_name = name

    print(f"\n🏆 Champion Model Selected: {champion_name} (CV Macro F1: {best_f1:.4f})")
    return benchmark_results, champion_name


def tune_champion(
    champion_name: str,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    n_trials: int = 30,
) -> tuple[Any, str]:
    """Tune hyperparameters for champion model using Optuna."""
    print(f"\n⚙️ Tuning Hyperparameters for Champion: {champion_name} (Optuna {n_trials} trials)...")

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    if champion_name == "Logistic Regression (Ridge)":
        def objective(trial: optuna.Trial) -> float:
            c_val = trial.suggest_float("C", 1e-3, 1e2, log=True)
            pipe = Pipeline([
                ("scaler", StandardScaler()),
                ("clf", LogisticRegression(penalty="l2", C=c_val, max_iter=1500, random_state=42)),
            ])
            scores = cross_validate(pipe, X_train, y_train, cv=cv, scoring="f1_macro", n_jobs=-1)
            return float(np.mean(scores["test_score"]))

        study = optuna.create_study(direction="maximize")
        study.optimize(objective, n_trials=n_trials)
        best_params = study.best_params
        print(f"Best params: {best_params} (Best CV F1: {study.best_value:.4f})")

        champion = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(penalty="l2", C=best_params["C"], max_iter=1500, random_state=42)),
        ])

    elif champion_name == "Random Forest":
        def objective(trial: optuna.Trial) -> float:
            n_estimators = trial.suggest_int("n_estimators", 80, 250)
            max_depth = trial.suggest_int("max_depth", 4, 15)
            min_samples_split = trial.suggest_int("min_samples_split", 2, 8)
            clf = RandomForestClassifier(
                n_estimators=n_estimators,
                max_depth=max_depth,
                min_samples_split=min_samples_split,
                random_state=42,
                n_jobs=-1,
            )
            scores = cross_validate(clf, X_train, y_train, cv=cv, scoring="f1_macro", n_jobs=-1)
            return float(np.mean(scores["test_score"]))

        study = optuna.create_study(direction="maximize")
        study.optimize(objective, n_trials=n_trials)
        best_params = study.best_params
        print(f"Best params: {best_params} (Best CV F1: {study.best_value:.4f})")

        champion = RandomForestClassifier(
            n_estimators=best_params["n_estimators"],
            max_depth=best_params["max_depth"],
            min_samples_split=best_params["min_samples_split"],
            random_state=42,
            n_jobs=-1,
        )

    elif champion_name == "LightGBM":
        def objective(trial: optuna.Trial) -> float:
            n_estimators = trial.suggest_int("n_estimators", 80, 250)
            max_depth = trial.suggest_int("max_depth", 3, 8)
            lr = trial.suggest_float("learning_rate", 0.01, 0.2, log=True)
            subsample = trial.suggest_float("subsample", 0.6, 1.0)
            clf = LGBMClassifier(
                n_estimators=n_estimators,
                max_depth=max_depth,
                learning_rate=lr,
                subsample=subsample,
                random_state=42,
                verbose=-1,
                n_jobs=-1,
            )
            scores = cross_validate(clf, X_train, y_train, cv=cv, scoring="f1_macro", n_jobs=-1)
            return float(np.mean(scores["test_score"]))

        study = optuna.create_study(direction="maximize")
        study.optimize(objective, n_trials=n_trials)
        best_params = study.best_params
        print(f"Best params: {best_params} (Best CV F1: {study.best_value:.4f})")

        champion = LGBMClassifier(
            n_estimators=best_params["n_estimators"],
            max_depth=best_params["max_depth"],
            learning_rate=best_params["learning_rate"],
            subsample=best_params["subsample"],
            random_state=42,
            verbose=-1,
            n_jobs=-1,
        )

    else:  # XGBoost
        def objective(trial: optuna.Trial) -> float:
            n_estimators = trial.suggest_int("n_estimators", 80, 250)
            max_depth = trial.suggest_int("max_depth", 3, 7)
            lr = trial.suggest_float("learning_rate", 0.01, 0.2, log=True)
            subsample = trial.suggest_float("subsample", 0.6, 1.0)
            clf = XGBClassifier(
                n_estimators=n_estimators,
                max_depth=max_depth,
                learning_rate=lr,
                subsample=subsample,
                random_state=42,
                eval_metric="mlogloss",
                n_jobs=-1,
            )
            scores = cross_validate(clf, X_train, y_train, cv=cv, scoring="f1_macro", n_jobs=-1)
            return float(np.mean(scores["test_score"]))

        study = optuna.create_study(direction="maximize")
        study.optimize(objective, n_trials=n_trials)
        best_params = study.best_params
        print(f"Best params: {best_params} (Best CV F1: {study.best_value:.4f})")

        champion = XGBClassifier(
            n_estimators=best_params["n_estimators"],
            max_depth=best_params["max_depth"],
            learning_rate=best_params["learning_rate"],
            subsample=best_params["subsample"],
            random_state=42,
            eval_metric="mlogloss",
            n_jobs=-1,
        )

    champion.fit(X_train, y_train)
    return champion, champion_name


def plot_confusion_matrix_artifact(cm: np.ndarray, labels: list[str], output_path: Path) -> None:
    """Plot and save confusion matrix figure."""
    fig, ax = plt.subplots(figsize=(6, 5), dpi=150)
    im = ax.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    ax.figure.colorbar(im, ax=ax)

    ax.set(
        xticks=np.arange(cm.shape[1]),
        yticks=np.arange(cm.shape[0]),
        xticklabels=labels,
        yticklabels=labels,
        title="Cephalometric Classifier: Confusion Matrix",
        ylabel="True Skeletal Class",
        xlabel="Predicted Skeletal Class",
    )

    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(
                j, i, format(cm[i, j], "d"),
                ha="center", va="center",
                color="white" if cm[i, j] > thresh else "black",
                fontweight="bold",
            )

    fig.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)
    print(f"Saved confusion matrix plot to {output_path}")


def explain_and_plot_shap(
    model: Any,
    model_name: str,
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    output_path: Path,
) -> list[dict[str, Any]]:
    """Compute SHAP feature importances and generate summary plot."""
    print("Computing SHAP feature importances...")
    try:
        if isinstance(model, Pipeline):
            # For pipeline, transform features first
            scaler = model.named_steps["scaler"]
            clf = model.named_steps["clf"]
            X_train_scaled = pd.DataFrame(scaler.transform(X_train), columns=X_train.columns)
            X_test_scaled = pd.DataFrame(scaler.transform(X_test), columns=X_test.columns)
            explainer = shap.LinearExplainer(clf, X_train_scaled)
            shap_values = explainer.shap_values(X_test_scaled)
            feature_names = list(X_train.columns)
        elif hasattr(model, "feature_importances_"):
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X_test)
            feature_names = list(X_train.columns)
        else:
            explainer = shap.Explainer(model, X_train)
            shap_values = explainer(X_test).values
            feature_names = list(X_train.columns)

        # Plot SHAP summary
        plt.figure(figsize=(9, 6), dpi=150)
        if isinstance(shap_values, list):
            # Multi-class list of arrays: compute mean absolute SHAP across classes
            mean_shap = np.mean([np.abs(sv).mean(axis=0) for sv in shap_values], axis=0)
        elif len(shap_values.shape) == 3:
            mean_shap = np.abs(shap_values).mean(axis=(0, 2))
        else:
            mean_shap = np.abs(shap_values).mean(axis=0)

        sorted_indices = np.argsort(mean_shap)[::-1]
        importance_records = []
        for idx in sorted_indices:
            importance_records.append({
                "feature": feature_names[idx],
                "mean_abs_shap": round(float(mean_shap[idx]), 4),
            })

        # Bar chart
        plt.barh(
            [feature_names[i] for i in sorted_indices[::-1]],
            [mean_shap[i] for i in sorted_indices[::-1]],
            color="#2b5c8f",
        )
        plt.xlabel("Mean |SHAP Value| (Impact on Skeletal Class Prediction)")
        plt.title("Cephalometric Features: SHAP Global Importance")
        plt.tight_layout()
        plt.savefig(output_path, dpi=150)
        plt.close()
        print(f"Saved SHAP summary plot to {output_path}")
        return importance_records
    except Exception as e:
        print(f"SHAP explanation failed ({e}); falling back to standard feature importances.")
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
        else:
            importances = np.ones(len(X_train.columns)) / len(X_train.columns)
        sorted_indices = np.argsort(importances)[::-1]
        records = []
        for idx in sorted_indices:
            records.append({
                "feature": X_train.columns[idx],
                "mean_abs_shap": round(float(importances[idx]), 4),
            })
        return records


def export_champion_to_onnx(
    model: Any,
    model_name: str,
    X_test: pd.DataFrame,
    output_path: Path,
) -> None:
    """Export the champion model to ONNX and verify numerical parity."""
    print(f"\n🚀 Exporting Champion Model ({model_name}) to ONNX...")

    if "Logistic Regression" in model_name:
        initial_types = [("float_input", SklearnFloatTensorType([None, len(FEATURE_NAMES)]))]
        options = {LogisticRegression: {"zipmap": False}}
        onnx_model = convert_sklearn(model, initial_types=initial_types, target_opset=15, options=options)
    elif "Random Forest" in model_name:
        initial_types = [("float_input", SklearnFloatTensorType([None, len(FEATURE_NAMES)]))]
        options = {RandomForestClassifier: {"zipmap": False}}
        onnx_model = convert_sklearn(model, initial_types=initial_types, target_opset=15, options=options)
    elif "XGBoost" in model_name:
        from onnxmltools.convert import convert_xgboost
        from onnxmltools.convert.common.data_types import FloatTensorType as OXMLFloatTensorType
        initial_types = [("float_input", OXMLFloatTensorType([None, len(FEATURE_NAMES)]))]
        onnx_model = convert_xgboost(model, initial_types=initial_types, target_opset=15)
    elif "LightGBM" in model_name:
        from onnxmltools.convert import convert_lightgbm
        from onnxmltools.convert.common.data_types import FloatTensorType as OXMLFloatTensorType
        initial_types = [("float_input", OXMLFloatTensorType([None, len(FEATURE_NAMES)]))]
        onnx_model = convert_lightgbm(model, initial_types=initial_types, target_opset=15)
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

    onnx_labels = ort_outs[0].flatten().astype(int)
    onnx_probs = ort_outs[1]

    # Convert probability output format if needed (e.g. dictionary vs array)
    if isinstance(onnx_probs, list) and isinstance(onnx_probs[0], dict):
        onnx_probs = np.array([[row[c] for c in sorted(row.keys())] for row in onnx_probs])

    py_preds = model.predict(X_test.values if not isinstance(model, Pipeline) else X_test)
    py_probs = model.predict_proba(X_test.values if not isinstance(model, Pipeline) else X_test)

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
    champion_model, champion_name = tune_champion(champion_name, X_train, y_train, n_trials=30)

    # 3. Test set evaluation
    y_pred = champion_model.predict(X_test)
    y_proba = champion_model.predict_proba(X_test)

    acc = float(accuracy_score(y_test, y_pred))
    bal_acc = float(balanced_accuracy_score(y_test, y_pred))
    macro_f1 = float(f1_score(y_test, y_pred, average="macro"))
    weighted_f1 = float(f1_score(y_test, y_pred, average="weighted"))
    roc_auc = float(roc_auc_score(y_test, y_proba, multi_class="ovr"))
    cm = confusion_matrix(y_test, y_pred)

    print("\n" + "=" * 65)
    print(f" 🎯 FINAL TEST SET EVALUATION ({champion_name})")
    print("=" * 65)
    print(f"Accuracy:          {acc:.4f}")
    print(f"Balanced Accuracy: {bal_acc:.4f}")
    print(f"Macro F1-Score:    {macro_f1:.4f}")
    print(f"Weighted F1-Score: {weighted_f1:.4f}")
    print(f"ROC-AUC (OVR):     {roc_auc:.4f}")
    print("\nClassification Report:\n", classification_report(y_test, y_pred, target_names=CLASS_NAMES))
    print("=" * 65)

    # 4. Plots
    plot_confusion_matrix_artifact(cm, CLASS_NAMES, CONF_MATRIX_OUTPUT)
    importance_records = explain_and_plot_shap(champion_model, champion_name, X_train, X_test, SHAP_PLOT_OUTPUT)

    # 5. Export to ONNX
    export_champion_to_onnx(champion_model, champion_name, X_test, ONNX_OUTPUT)

    # 6. Save metadata
    per_class_metrics = {}
    for i, name in enumerate(CLASS_NAMES):
        per_class_metrics[name] = {
            "class_id": i,
            "label_th": CLASS_LABELS_TH[i],
            "precision": round(float(precision_score(y_test == i, y_pred == i, zero_division=0)), 4),
            "recall": round(float(recall_score(y_test == i, y_pred == i, zero_division=0)), 4),
            "f1": round(float(f1_score(y_test == i, y_pred == i, zero_division=0)), 4),
            "support": int(np.sum(y_test == i)),
        }

    clinical_norms = {
        "sna_angle": {"norm_mean": 82.0, "norm_sd": 3.0, "unit": "deg", "clinical_name": "SNA (Maxillary AP Position)"},
        "snb_angle": {"norm_mean": 80.0, "norm_sd": 3.0, "unit": "deg", "clinical_name": "SNB (Mandibular AP Position)"},
        "anb_angle": {"norm_mean": 2.0, "norm_sd": 1.5, "unit": "deg", "clinical_name": "ANB (Sagittal Skeletal Relation)"},
        "wits_appraisal_mm": {"norm_mean": -0.5, "norm_sd": 1.5, "unit": "mm", "clinical_name": "Wits Appraisal"},
        "fma_angle": {"norm_mean": 25.0, "norm_sd": 4.5, "unit": "deg", "clinical_name": "FMA (Mandibular Plane Angle)"},
        "gonial_angle": {"norm_mean": 125.0, "norm_sd": 5.5, "unit": "deg", "clinical_name": "Gonial Angle"},
        "u1_sn_angle": {"norm_mean": 103.0, "norm_sd": 5.5, "unit": "deg", "clinical_name": "U1-SN (Upper Incisor Inclination)"},
        "impa_angle": {"norm_mean": 93.0, "norm_sd": 6.0, "unit": "deg", "clinical_name": "IMPA (Lower Incisor Inclination)"},
        "y_axis_angle": {"norm_mean": 66.0, "norm_sd": 3.5, "unit": "deg", "clinical_name": "Y-Axis (Growth Direction)"},
        "jarabak_ratio": {"norm_mean": 63.5, "norm_sd": 3.5, "unit": "%", "clinical_name": "Jarabak Ratio (Face Height)"},
    }

    metadata = {
        "version": "1.0.0",
        "task": "orthodontic_cephalometric_skeletal_classification",
        "champion_model": champion_name,
        "model_type": f"{champion_name} (Optuna Tuned)",
        "num_features": len(feature_names),
        "features": feature_names,
        "class_mapping": {
            "0": {
                "class_name": "Class_I",
                "label_th": "โครงสร้างกระดูกขากรรไกรสมดุลระดับปกติ (Skeletal Class I)",
                "label_en": "Normal Balanced Orthognathic (Skeletal Class I)",
                "description_th": "ความสัมพันธ์ของขากรรไกรบนและล่างอยู่ในเกณฑ์สมดุลตามมาตรฐานออร์โธพีดิกส์ ใบหน้าตรง ไม่พบความผิดปกติของโครงสร้างกระดูกขากรรไกรในแนวหน้าหลัง",
                "description_en": "Harmonious sagittal relationship between maxilla and mandible. Balanced orthognathic facial profile with normal apical base discrepancy.",
                "surgical_indication": "none",
            },
            "1": {
                "class_name": "Class_II",
                "label_th": "โครงสร้างกระดูกขากรรไกรล่างถอย / คางถอย (Skeletal Class II)",
                "label_en": "Retrognathic / Mandibular Deficiency (Skeletal Class II)",
                "description_th": "ขากรรไกรล่างอยู่ถอยไปทางด้านหลังเมื่อเทียบกับขากรรไกรบน หรือขากรรไกรบนยื่นมากกว่าปกติ ทำให้คางดูสั้นหรือหลบหลัง ส่งผลต่อความสวยงามของกรอบหน้าและทางเดินหายใจ",
                "description_en": "Sagittal skeletal discrepancy with mandibular retrognathia and/or maxillary protrusion. Increased ANB and positive Wits appraisal indicating convex facial profile.",
                "surgical_indication": "camouflage_or_orthognathic",
            },
            "2": {
                "class_name": "Class_III",
                "label_th": "โครงสร้างกระดูกขากรรไกรล่างยื่น / คางยื่น (Skeletal Class III)",
                "label_en": "Prognathic / Mandibular Excess (Skeletal Class III)",
                "description_th": "ขากรรไกรล่างเจริญเติบโตเกินไปทางด้านหน้า หรือขากรรไกรบนเจริญถดถอย ทำให้คางดูยื่น ใบหน้าดูแบนหรือเว้า การเสริมคางด้วยฟิลเลอร์ถือเป็นข้อห้ามในกลุ่มนี้",
                "description_en": "Sagittal skeletal discrepancy with mandibular prognathism and/or midface hypoplasia. Negative ANB and negative Wits appraisal indicating concave profile. Chin filler contraindicated.",
                "surgical_indication": "orthognathic_indicated",
            },
        },
        "clinical_norms": clinical_norms,
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
