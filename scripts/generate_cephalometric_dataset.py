#!/usr/bin/env python3
"""Clinical Cephalometric Tabular Dataset Generator.

Generates a realistic, clinically calibrated orthodontic dataset
(dataset/cephalometric_features.csv) based on international cephalometric standards
(Steiner, Tweed, Jacobson Wits, and McNamara analyses).

Features:
- sna_angle: Sella-Nasion-A point (degrees, maxilla AP position, norm ~82.0° ± 3.0°)
- snb_angle: Sella-Nasion-B point (degrees, mandible AP position, norm ~80.0° ± 3.0°)
- anb_angle: SNA - SNB (degrees, sagittal skeletal discrepancy)
    - Class I:  0.0° to 4.0° (norm ~2.0° ± 1.2°)
    - Class II: > 4.0° (mandibular retrognathia / maxillary protrusion)
    - Class III: < 0.0° (mandibular prognathism / maxillary retrusion)
- wits_appraisal_mm: Jacobson Wits appraisal (mm distance along occlusal plane)
    - Class I:  -1.5 mm to +1.0 mm (norm ~ -0.5 mm ± 1.5 mm)
    - Class II: > +1.5 mm (+2.0 to +9.0 mm)
    - Class III: < -2.5 mm (-3.0 to -10.0 mm)
- fma_angle: Frankfort-Mandibular Plane Angle (degrees, vertical facial pattern, norm ~25.0° ± 4.5°)
- gonial_angle: Ar-Go-Me angle (degrees, norm ~125.0° ± 5.5°)
- u1_sn_angle: Upper incisor to Sella-Nasion plane (degrees, norm ~103.0° ± 5.5°)
- impa_angle: Incisor Mandibular Plane Angle (degrees, norm ~93.0° ± 6.0°)
- y_axis_angle: SGn-SN growth direction axis (degrees, norm ~66.0° ± 3.5°)
- jarabak_ratio: Posterior/Anterior face height ratio S-Go/N-Me * 100 (%, norm ~63.5% ± 3.5%)

Target Labels:
- skeletal_class: 0 (Class_I), 1 (Class_II), 2 (Class_III)
"""

from __future__ import annotations

from pathlib import Path
import numpy as np
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_CSV = ROOT_DIR / "dataset" / "cephalometric_features.csv"
OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)


def generate_cephalometric_data(n_per_class: int = 800, seed: int = 42) -> pd.DataFrame:
    """Generate balanced, clinically realistic cephalometric records."""
    rng = np.random.default_rng(seed)
    records: list[dict[str, float | int | str]] = []

    # -------------------------------------------------------------
    # 1. CLASS I: Normal Balanced Orthognathic
    # -------------------------------------------------------------
    for i in range(n_per_class):
        age = int(rng.integers(14, 55))
        sex = rng.choice(["female", "male"])
        sex_wits_adj = -0.5 if sex == "male" else 0.2

        # Sagittal baseline: Class I norm ~2.0° within [0.0°, 4.0°]
        sna = float(rng.normal(82.0, 2.5))
        anb = float(rng.normal(2.0, 1.1))
        # Support full continuous clinical Class I range [0.0°, 4.0°] without artificial boundary gaps
        anb = float(np.clip(anb, 0.0, 4.0))
        snb = sna - anb + float(rng.normal(0, 0.2))

        # Wits appraisal closely linked with ANB
        wits = (anb - 2.0) * 0.8 + sex_wits_adj + float(rng.normal(0, 0.6))
        wits = float(np.clip(wits, -2.0, 1.2))

        # Vertical facial pattern (FMA)
        fma = float(rng.normal(25.0, 3.5))
        gonial = 125.0 + (fma - 25.0) * 0.65 + float(rng.normal(0, 2.5))
        y_axis = 66.0 + (fma - 25.0) * 0.40 + float(rng.normal(0, 1.8))
        jarabak = 63.5 - (fma - 25.0) * 0.45 + float(rng.normal(0, 2.0))

        # Dental angulation (minimal compensation in Class I)
        u1_sn = float(rng.normal(103.0, 4.0))
        impa = float(rng.normal(93.0, 4.0))

        vert_pattern = "Normodivergent"
        if fma < 21.0:
            vert_pattern = "Hypodivergent"
        elif fma > 29.0:
            vert_pattern = "Hyperdivergent"

        records.append({
            "patient_id": f"CEPH_{len(records) + 1:04d}",
            "age": age,
            "sex": sex,
            "sna_angle": round(sna, 2),
            "snb_angle": round(snb, 2),
            "anb_angle": round(anb, 2),
            "wits_appraisal_mm": round(wits, 2),
            "fma_angle": round(fma, 2),
            "gonial_angle": round(gonial, 2),
            "u1_sn_angle": round(u1_sn, 2),
            "impa_angle": round(impa, 2),
            "y_axis_angle": round(y_axis, 2),
            "jarabak_ratio": round(jarabak, 2),
            "skeletal_class": 0,
            "skeletal_class_name": "Class_I",
            "deformity_severity": "Normal",
            "vertical_pattern": vert_pattern,
            "primary_etiology": "balanced_orthognathic",
        })

    # -------------------------------------------------------------
    # 2. CLASS II: Retrognathic / Mandibular Deficiency / คางถอย
    # -------------------------------------------------------------
    for i in range(n_per_class):
        age = int(rng.integers(14, 55))
        sex = rng.choice(["female", "male"])
        sex_wits_adj = -0.5 if sex == "male" else 0.2

        # Severity distribution: Mild (45%), Moderate (35%), Severe (20%)
        sev_roll = rng.random()
        if sev_roll < 0.45:
            severity = "Mild"
            anb = float(rng.uniform(4.01, 5.8))
            wits_base = float(rng.uniform(1.5, 3.5))
        elif sev_roll < 0.80:
            severity = "Moderate"
            anb = float(rng.uniform(5.8, 7.8))
            wits_base = float(rng.uniform(3.5, 6.0))
        else:
            severity = "Severe"
            anb = float(rng.uniform(7.8, 11.5))
            wits_base = float(rng.uniform(6.0, 9.5))

        # Etiology: Mandibular retrusion (70%), Maxillary protrusion (20%), Bi-maxillary (10%)
        etio_roll = rng.random()
        if etio_roll < 0.70:
            etiology = "mandibular_retrusion"
            sna = float(rng.normal(82.0, 2.0))
            snb = sna - anb + float(rng.normal(0, 0.3))
        elif etio_roll < 0.90:
            etiology = "maxillary_protrusion"
            snb = float(rng.normal(79.5, 2.0))
            sna = snb + anb + float(rng.normal(0, 0.3))
        else:
            etiology = "bimaxillary_class_ii"
            sna = float(rng.normal(84.0, 2.0))
            snb = sna - anb + float(rng.normal(0, 0.3))

        wits = wits_base + sex_wits_adj + float(rng.normal(0, 0.5))

        # Class II often features variable vertical patterns (hyperdivergent retrognathic is common)
        vert_bias = rng.choice([-3.0, 0.0, 3.5], p=[0.25, 0.45, 0.30])
        fma = float(rng.normal(26.0 + vert_bias, 4.0))
        gonial = 125.0 + (fma - 25.0) * 0.70 + float(rng.normal(0, 2.8))
        y_axis = 66.5 + (fma - 25.0) * 0.45 + (anb - 4.0) * 0.3 + float(rng.normal(0, 1.8))
        jarabak = 63.0 - (fma - 25.0) * 0.48 + float(rng.normal(0, 2.2))

        # Physiological Dental Compensation in Class II:
        # Lower incisors procline (IMPA increases to bridge sagittal gap)
        # Upper incisors may procline (Div 1) or retrocline (Div 2)
        impa = float(93.0 + (anb - 3.0) * 0.8 + rng.normal(0, 3.5))
        div2 = rng.random() < 0.25
        if div2:
            u1_sn = float(rng.normal(95.0, 4.0))  # retroclined upper incisors
        else:
            u1_sn = float(104.0 + (anb - 4.0) * 0.4 + rng.normal(0, 4.0))

        vert_pattern = "Normodivergent"
        if fma < 21.0:
            vert_pattern = "Hypodivergent"
        elif fma > 29.0:
            vert_pattern = "Hyperdivergent"

        records.append({
            "patient_id": f"CEPH_{len(records) + 1:04d}",
            "age": age,
            "sex": sex,
            "sna_angle": round(sna, 2),
            "snb_angle": round(snb, 2),
            "anb_angle": round(anb, 2),
            "wits_appraisal_mm": round(wits, 2),
            "fma_angle": round(fma, 2),
            "gonial_angle": round(gonial, 2),
            "u1_sn_angle": round(u1_sn, 2),
            "impa_angle": round(impa, 2),
            "y_axis_angle": round(y_axis, 2),
            "jarabak_ratio": round(jarabak, 2),
            "skeletal_class": 1,
            "skeletal_class_name": "Class_II",
            "deformity_severity": severity,
            "vertical_pattern": vert_pattern,
            "primary_etiology": etiology,
        })

    # -------------------------------------------------------------
    # 3. CLASS III: Prognathic / Mandibular Excess / คางยื่น
    # -------------------------------------------------------------
    for i in range(n_per_class):
        age = int(rng.integers(14, 55))
        sex = rng.choice(["female", "male"])
        sex_wits_adj = -0.5 if sex == "male" else 0.2

        # Severity distribution: Mild (45%), Moderate (35%), Severe (20%)
        sev_roll = rng.random()
        if sev_roll < 0.45:
            severity = "Mild"
            anb = float(rng.uniform(-2.2, -0.01))
            wits_base = float(rng.uniform(-4.5, -2.1))
        elif sev_roll < 0.80:
            severity = "Moderate"
            anb = float(rng.uniform(-4.8, -2.2))
            wits_base = float(rng.uniform(-7.5, -4.5))
        else:
            severity = "Severe"
            anb = float(rng.uniform(-9.0, -4.8))
            wits_base = float(rng.uniform(-11.5, -7.5))

        # Etiology: Mandibular prognathism (60%), Maxillary hypoplasia (25%), Combined (15%)
        etio_roll = rng.random()
        if etio_roll < 0.60:
            etiology = "mandibular_prognathism"
            sna = float(rng.normal(82.0, 2.0))
            snb = sna - anb + float(rng.normal(0, 0.3))
        elif etio_roll < 0.85:
            etiology = "maxillary_hypoplasia"
            snb = float(rng.normal(80.0, 2.0))
            sna = snb + anb + float(rng.normal(0, 0.3))
        else:
            etiology = "combined_class_iii"
            sna = float(rng.normal(79.0, 1.8))
            snb = sna - anb + float(rng.normal(0, 0.3))

        wits = wits_base + sex_wits_adj + float(rng.normal(0, 0.5))

        # Class III vertical: often high gonial angle and longer mandibular corpus
        fma = float(rng.normal(26.0, 4.5))
        gonial = 128.0 + (fma - 25.0) * 0.70 + float(rng.normal(0, 3.0))
        y_axis = 65.0 + (fma - 25.0) * 0.40 + float(rng.normal(0, 1.8))
        jarabak = 64.0 - (fma - 25.0) * 0.45 + float(rng.normal(0, 2.2))

        # Physiological Dental Compensation in Class III:
        # Lower incisors retrocline (IMPA drops to ~80-87°)
        # Upper incisors procline (U1-SN increases to ~107-115°)
        impa = float(92.0 + (anb - 0.0) * 1.1 + rng.normal(0, 3.2))
        u1_sn = float(103.0 - (anb - 0.0) * 0.8 + rng.normal(0, 3.5))

        vert_pattern = "Normodivergent"
        if fma < 21.0:
            vert_pattern = "Hypodivergent"
        elif fma > 29.0:
            vert_pattern = "Hyperdivergent"

        records.append({
            "patient_id": f"CEPH_{len(records) + 1:04d}",
            "age": age,
            "sex": sex,
            "sna_angle": round(sna, 2),
            "snb_angle": round(snb, 2),
            "anb_angle": round(anb, 2),
            "wits_appraisal_mm": round(wits, 2),
            "fma_angle": round(fma, 2),
            "gonial_angle": round(gonial, 2),
            "u1_sn_angle": round(u1_sn, 2),
            "impa_angle": round(impa, 2),
            "y_axis_angle": round(y_axis, 2),
            "jarabak_ratio": round(jarabak, 2),
            "skeletal_class": 2,
            "skeletal_class_name": "Class_III",
            "deformity_severity": severity,
            "vertical_pattern": vert_pattern,
            "primary_etiology": etiology,
        })

    df = pd.DataFrame(records)
    # Shuffle dataset
    df = df.sample(frac=1.0, random_state=seed).reset_index(drop=True)
    return df


def main() -> None:
    print(f"Generating clinical cephalometric dataset...")
    df = generate_cephalometric_data(n_per_class=800, seed=42)
    df.to_csv(OUTPUT_CSV, index=False)
    print(f"Successfully saved {len(df)} samples to {OUTPUT_CSV}")
    print("\nClass distribution:")
    print(df["skeletal_class_name"].value_counts())
    print("\nSeverity distribution:")
    print(df["deformity_severity"].value_counts())
    print("\nMean ANB per class:")
    print(df.groupby("skeletal_class_name")["anb_angle"].agg(["mean", "std", "min", "max"]))
    print("\nMean Wits per class:")
    print(df.groupby("skeletal_class_name")["wits_appraisal_mm"].agg(["mean", "std", "min", "max"]))


if __name__ == "__main__":
    main()
