"""Tests for Comprehensive Clinical Aesthetic Procedure Recommendation Engine.

Exhaustively verifies:
1. All 12 clinical spectrum procedures (non-surgical/injections, minimally invasive, and surgical).
2. Botulinum Toxin Masseter: acute gonial angle, low FMA, low F10, low F1 middle-lower ratio.
3. Botulinum Toxin Wrinkles: upper third strain, brow apex & head asymmetries, P5 inclination.
4. Hyaluronic Acid Filler Nasolabial: soft-tissue droop, laxity score, acute P2, cephalometric SNA retrusion.
5. Hyaluronic Acid Filler Temple: Neoclassical outer fifths deficiency, bitemporal asymmetry.
6. Surgical Mandibular Angle Ostectomy: severe bony gonial angle < 115°, low FMA base.
7. Comprehensive recommendation generation and descending intensity sorting.
8. Backward compatibility for canonical 3-procedure and 6-procedure callers.
9. Hostile/degenerate input hardening (NaN, Inf, negative, empty dicts).
"""

from __future__ import annotations

import math
import pytest

from facescan.core.procedure_recommender import (
    ProcedureRecommendation,
    ProcedureRecommender,
    recommend_comprehensive_procedures,
    recommend_procedures,
)


EXPECTED_12_PROCEDURES = {
    "chin_augmentation",
    "lip_augmentation",
    "rhinoplasty",
    "botulinum_toxin_masseter",
    "botulinum_toxin_wrinkles",
    "hyaluronic_acid_filler_nasolabial",
    "hyaluronic_acid_filler_temple",
    "skin_tightening",
    "thread_lift",
    "mandibular_contouring",
    "orthognathic_surgery",
    "surgical_facelift",
}


# ---------------------------------------------------------------------------
# 1. Masseter Botulinum Toxin
# ---------------------------------------------------------------------------


def test_masseter_botox_triggered_by_acute_gonial_and_fma():
    """Verify masseter botox triggers with acute gonial angle and hypodivergent FMA."""
    recommender = ProcedureRecommender()
    ceph = {
        "features": {
            "gonial_angle": 116.0,  # Acute square angle
            "fma_angle": 19.5,      # Hypodivergent strong bite force
        }
    }
    rec = recommender.evaluate_botulinum_toxin_masseter({}, cephalometric=ceph)
    assert rec.procedure == "botulinum_toxin_masseter"
    assert rec.intensity > 0.0
    assert "gonial_angle" in rec.triggering_metrics
    assert "fma_angle" in rec.triggering_metrics
    assert "masseter" in rec.rationale.lower()


def test_masseter_botox_triggered_by_frontal_f10_and_f1():
    """Verify masseter botox triggers with wide lower face F10 and F1 ratio."""
    recommender = ProcedureRecommender()
    frontal = {
        "F10_golden_ratio": 1.22,         # Short wide face
        "F1_middle_lower_ratio": 0.88,    # Wide/square lower face
    }
    rec = recommender.evaluate_botulinum_toxin_masseter(frontal)
    assert rec.intensity > 0.0
    assert "F10_golden_ratio" in rec.triggering_metrics
    assert "F1_middle_lower_ratio" in rec.triggering_metrics


def test_masseter_botox_balanced():
    """Normal gonial angle and harmonious facial ratio yields intensity 0.0."""
    recommender = ProcedureRecommender()
    ceph = {"features": {"gonial_angle": 126.0, "fma_angle": 25.0}}
    frontal = {"F10_golden_ratio": 1.36, "F1_middle_lower_ratio": 1.0}
    rec = recommender.evaluate_botulinum_toxin_masseter(frontal, cephalometric=ceph)
    assert rec.intensity == 0.0
    assert rec.triggering_metrics == []


# ---------------------------------------------------------------------------
# 2. Upper-Face Anti-Wrinkle Botulinum Toxin
# ---------------------------------------------------------------------------


def test_wrinkle_botox_triggered_by_upper_third_and_brow_asymmetry():
    """Verify wrinkle botox triggers with expanded upper third and brow apex asymmetry."""
    recommender = ProcedureRecommender()
    frontal = {
        "F1_upper_third": 0.380,              # Frontalis hyperactivity
        "F11_asym_brow_apex_ratio": 0.22,     # Unequal brow lift
        "F11_asym_brow_head_offset": 8.5,     # Corrugator tone imbalance
    }
    profile = {
        "P5_forehead_inclination": 16.5,      # Sloping forehead
    }
    rec = recommender.evaluate_botulinum_toxin_wrinkles(frontal, profile_metrics=profile)
    assert rec.procedure == "botulinum_toxin_wrinkles"
    assert rec.intensity > 0.0
    assert "F1_upper_third" in rec.triggering_metrics
    assert "F11_asym_brow_apex_ratio" in rec.triggering_metrics
    assert "F11_asym_brow_head_offset" in rec.triggering_metrics
    assert "P5_forehead_inclination" in rec.triggering_metrics


def test_wrinkle_botox_balanced():
    """Harmonious upper third and symmetrical brows yield intensity 0.0."""
    recommender = ProcedureRecommender()
    frontal = {
        "F1_upper_third": 0.333,
        "F11_asym_brow_apex_ratio": 0.04,
        "F11_asym_brow_head_offset": 2.0,
    }
    rec = recommender.evaluate_botulinum_toxin_wrinkles(frontal)
    assert rec.intensity == 0.0
    assert rec.triggering_metrics == []


# ---------------------------------------------------------------------------
# 3. Nasolabial Fold HA Filler
# ---------------------------------------------------------------------------


def test_nasolabial_filler_triggered_by_sagging_and_acute_p2():
    """Verify nasolabial filler triggers with oral commissure droop, laxity, and acute P2."""
    recommender = ProcedureRecommender()
    sagging = {
        "tier": 2,
        "laxity_score": 45.0,
        "features": {
            "oral_commissure_droop": 0.025,
            "jowl_sagging_index": 0.030,
        },
    }
    profile = {
        "P2_nasolabial_angle": 88.0,  # Acute angle / pyriform recession
    }
    ceph = {
        "features": {
            "sna_angle": 77.5,        # Maxillary midface retrusion
        }
    }
    rec = recommender.evaluate_hyaluronic_acid_filler_nasolabial(
        {}, profile_metrics=profile, sagging=sagging, cephalometric=ceph
    )
    assert rec.procedure == "hyaluronic_acid_filler_nasolabial"
    assert rec.intensity > 0.0
    assert "oral_commissure_droop" in rec.triggering_metrics
    assert "jowl_sagging_index" in rec.triggering_metrics
    assert "P2_nasolabial_angle" in rec.triggering_metrics
    assert "sna_angle" in rec.triggering_metrics


def test_nasolabial_filler_balanced():
    """Firm tissue and obtuse nasolabial angle yields intensity 0.0."""
    recommender = ProcedureRecommender()
    sagging = {
        "tier": 1,
        "laxity_score": 15.0,
        "features": {
            "oral_commissure_droop": 0.002,
            "jowl_sagging_index": 0.005,
        },
    }
    profile = {"P2_nasolabial_angle": 102.0}
    rec = recommender.evaluate_hyaluronic_acid_filler_nasolabial(
        {}, profile_metrics=profile, sagging=sagging
    )
    assert rec.intensity == 0.0


# ---------------------------------------------------------------------------
# 4. Temporal Hollow HA Filler
# ---------------------------------------------------------------------------


def test_temple_filler_triggered_by_narrow_outer_fifths():
    """Verify temple filler triggers when outer fifth is below Neoclassical 0.200."""
    recommender = ProcedureRecommender()
    frontal = {
        "F3_fifth_outer_right": 0.165,  # Temporal hollowing
        "F3_fifth_outer_left": 0.170,
        "F11_asym_outer_fifth": 0.15,   # Outer fifth asymmetry
    }
    rec = recommender.evaluate_hyaluronic_acid_filler_temple(frontal)
    assert rec.procedure == "hyaluronic_acid_filler_temple"
    assert rec.intensity > 0.0
    assert "F3_fifth_outer" in rec.triggering_metrics
    assert "F11_asym_outer_fifth" in rec.triggering_metrics
    assert "Neoclassical" in rec.rationale or "temporal" in rec.rationale.lower()


def test_temple_filler_balanced():
    """Neoclassical outer fifths (0.200) yields intensity 0.0."""
    recommender = ProcedureRecommender()
    frontal = {
        "F3_fifth_outer_right": 0.200,
        "F3_fifth_outer_left": 0.200,
        "F11_asym_outer_fifth": 0.02,
    }
    rec = recommender.evaluate_hyaluronic_acid_filler_temple(frontal)
    assert rec.intensity == 0.0


# ---------------------------------------------------------------------------
# 5. Surgical Mandibular Angle Ostectomy
# ---------------------------------------------------------------------------


def test_mandibular_contouring_triggered_by_severe_bony_gonial():
    """Verify surgical jaw contouring triggers with acute bony gonial angle < 115°."""
    recommender = ProcedureRecommender()
    ceph = {
        "features": {
            "gonial_angle": 108.0,  # Severe acute bony angle
            "fma_angle": 16.0,      # Severe hypodivergent base
        }
    }
    rec = recommender.evaluate_mandibular_contouring({}, cephalometric=ceph)
    assert rec.procedure == "mandibular_contouring"
    assert rec.intensity > 0.0
    assert "gonial_angle" in rec.triggering_metrics
    assert "fma_angle" in rec.triggering_metrics
    assert "surgical" in rec.rationale.lower() or "ostectomy" in rec.rationale.lower()


def test_mandibular_contouring_balanced():
    """Normal gonial angle (125°) yields intensity 0.0."""
    recommender = ProcedureRecommender()
    ceph = {"features": {"gonial_angle": 125.0, "fma_angle": 24.0}}
    rec = recommender.evaluate_mandibular_contouring({}, cephalometric=ceph)
    assert rec.intensity == 0.0


# ---------------------------------------------------------------------------
# 6. Comprehensive 12-Procedure Spectrum & Sorting
# ---------------------------------------------------------------------------


def test_recommend_comprehensive_procedures_all_12_present():
    """Verify recommend_comprehensive_procedures evaluates all 12 procedures."""
    frontal = {
        "F1_lower_third": 0.28,
        "F1_upper_third": 0.38,
        "F3_fifth_outer_right": 0.16,
        "F3_fifth_outer_left": 0.165,
        "F6_alar_icd_ratio": 1.20,
        "F8_lip_ratio": 1.40,
        "F10_golden_ratio": 1.22,
    }
    profile = {
        "P2_nasolabial_angle": 88.0,
        "P4_eline_upper_lip_mm": -5.0,
        "P4_eline_lower_lip_mm": -3.5,
        "P5_forehead_inclination": 16.0,
    }
    sagging = {
        "tier": 2,
        "laxity_score": 52.0,
        "features": {"jowl_sagging_index": 0.035, "oral_commissure_droop": 0.02},
    }
    ceph = {
        "skeletal_class": 1,
        "skeletal_class_name": "Class_II",
        "severity": "Moderate",
        "features": {
            "gonial_angle": 112.0,
            "fma_angle": 18.0,
            "anb_angle": 6.5,
        },
    }

    recs = recommend_comprehensive_procedures(
        frontal=frontal,
        profile=profile,
        sagging=sagging,
        cephalometric=ceph,
    )
    assert len(recs) == 12
    proc_names = {r.procedure for r in recs}
    assert proc_names == EXPECTED_12_PROCEDURES

    # Verify sorted descending by intensity
    intensities = [r.intensity for r in recs]
    assert intensities == sorted(intensities, reverse=True)


def test_recommend_comprehensive_procedures_only_recommended_filter():
    """Verify only_recommended=True filters out 0.0 intensity procedures."""
    # Input with deviations in only some areas
    frontal = {
        "F1_lower_third": 0.28,      # chin trigger
        "F6_alar_icd_ratio": 1.20,    # rhino trigger
    }
    recs = recommend_comprehensive_procedures(frontal=frontal, only_recommended=True)
    assert len(recs) > 0
    assert all(r.intensity > 0.0 for r in recs)


# ---------------------------------------------------------------------------
# 7. Backward Compatibility Preservation
# ---------------------------------------------------------------------------


def test_recommend_procedures_canonical_backward_compatibility():
    """Verify canonical recommend_procedures without comprehensive flag returns 3 procedures."""
    recs = recommend_procedures({}, {})
    assert len(recs) == 3
    assert {r.procedure for r in recs} == {
        "chin_augmentation",
        "lip_augmentation",
        "rhinoplasty",
    }


def test_recommend_procedures_with_sagging_backward_compatibility():
    """Verify canonical recommend_procedures with sagging returns 6 procedures."""
    sagging = {"tier": 2, "laxity_score": 40.0, "features": {}}
    recs = recommend_procedures({}, {}, sagging=sagging)
    assert len(recs) == 6
    assert {r.procedure for r in recs} == {
        "chin_augmentation",
        "lip_augmentation",
        "rhinoplasty",
        "skin_tightening",
        "thread_lift",
        "surgical_facelift",
    }


# ---------------------------------------------------------------------------
# 8. Hostile and Degenerate Input Hardening
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("val", [None, float("nan"), float("inf"), float("-inf"), "invalid"])
def test_comprehensive_procedures_hostile_values(val):
    """Verify graceful handling of non-numeric / non-finite inputs."""
    bad_frontal = {
        "F1_lower_third": val,
        "F1_upper_third": val,
        "F3_fifth_outer_right": val,
        "F6_alar_icd_ratio": val,
        "F8_lip_ratio": val,
        "F10_golden_ratio": val,
    }
    recs = recommend_comprehensive_procedures(frontal=bad_frontal)
    assert len(recs) == 12
    for r in recs:
        assert isinstance(r, ProcedureRecommendation)
        assert 0.0 <= r.intensity <= 1.0
        assert not math.isnan(r.intensity)
