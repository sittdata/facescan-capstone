#!/usr/bin/env python3
import io
import cv2
import numpy as np
import pandas as pd
from PIL import Image
from facescan.core.facemesh import analyze_facemesh_sagging
from facescan.core.procedure_recommender import recommend_sagging_procedures

print("=" * 65)
print("DEMO: FACIAL AGING & SAGGING TIER INFERENCE TEST")
print("=" * 65)

# 1. Astronaut reference photo
img1 = cv2.imread("tests/data/astronaut.png")
s1 = analyze_facemesh_sagging(img1)
print("\n>>> 1. Reference Photo: tests/data/astronaut.png (Eileen Collins - Middle-aged)")
if s1:
    print(f"  • Predicted Tier       : Tier {s1.tier} ({s1.tier_name})")
    print(f"  • Laxity Score         : {s1.laxity_score:.1f}%")
    print(f"  • Tier Probabilities   : Firm={s1.probabilities['Firm']*100:.1f}%, Moderate={s1.probabilities['Moderate']*100:.1f}%, Advanced={s1.probabilities['Advanced']*100:.1f}%")
    print("  • Morphological Anatomical Indices:")
    print(f"     - Jowl Sagging Index (mm/norm) : {s1.features['jowl_sagging_index']:.4f}")
    print(f"     - Malar-to-Jaw Ratio (∇ to Δ)  : {s1.features['malar_to_jaw_ratio']:.4f}")
    print(f"     - Marionette Droop Angle       : {s1.features['oral_commissure_droop']:.4f}")
    print(f"     - Mandibular Line Irregularity : {s1.features['jawline_irregularity']:.4f}")
    
    procs = recommend_sagging_procedures(s1)
    print("  • Clinical Treatment Indications:")
    for p in procs:
        status = f"INDICATED (intensity={p.intensity:.2f})" if p.intensity > 0 else "NOT INDICATED"
        print(f"     [{status:30s}] {p.procedure:18s} | {p.rationale}")
else:
    print("  Failed to analyze sagging")

# 2. Extract 3 diverse subjects across cohorts from UTKFace (Young, Middle-aged, Senior)
print("\nLoading UTKFace shards for cohort comparison...")
dfs = [pd.read_parquet(f"dataset/utkface_subset/utkface_shard{i}.parquet") for i in range(3)]
df_all = pd.concat(dfs, ignore_index=True)

test_cases = [
    ("Subject A (Young Adult)", df_all[df_all["age"] == 21].iloc[0]),
    ("Subject B (Middle-Aged)", df_all[df_all["age"] == 47].iloc[0]),
    ("Subject C (Senior)", df_all[df_all["age"] == 72].iloc[0]),
]

for label, row in test_cases:
    age = int(row["age"])
    gender = str(row["gender"])
    print(f"\n>>> 2. UTKFace: {label} (True Age: {age}, Gender: {gender})")
    img_bytes = row["image"]["bytes"]
    pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

    s = analyze_facemesh_sagging(cv_img)
    if s:
        print(f"  • Predicted Tier       : Tier {s.tier} ({s.tier_name})")
        print(f"  • Laxity Score         : {s.laxity_score:.1f}%")
        print(f"  • Tier Probabilities   : Firm={s.probabilities['Firm']*100:.1f}%, Moderate={s.probabilities['Moderate']*100:.1f}%, Advanced={s.probabilities['Advanced']*100:.1f}%")
        print("  • Key Anatomical Features:")
        print(f"     - Jowl Sagging Index    : {s.features['jowl_sagging_index']:.4f}")
        print(f"     - Malar/Jaw Ratio       : {s.features['malar_to_jaw_ratio']:.4f}")
        print(f"     - Marionette Droop      : {s.features['oral_commissure_droop']:.4f}")
        
        procs = recommend_sagging_procedures(s)
        print("  • Recommended Procedures:")
        for p in procs:
            if p.intensity > 0:
                print(f"     -> {p.procedure} (Intensity: {p.intensity:.2f}) - {p.rationale}")
            else:
                print(f"     -> {p.procedure}: Not indicated (Intensity 0.0)")
    else:
        print("  No face mesh detected")

print("\n" + "=" * 65)
print("INFERENCE TEST COMPLETED")
print("=" * 65)
