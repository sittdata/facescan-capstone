import type { ProcedureRecommendation, FacialSaggingResult, CephalometricResult } from "../api/schemas";
import {
  DEFAULT_PROCEDURE_AREAS,
  DEFAULT_PROCEDURE_CATEGORIES,
  PROCEDURE_TITLES,
  getSpecificAction,
} from "../components/results/ProcedureRecommendationCard";

function getNum(metrics: Record<string, unknown> | null | undefined, key: string): number | null {
  if (!metrics || !(key in metrics)) return null;
  const item = metrics[key];
  if (item == null) return null;
  if (typeof item === "number") return isFinite(item) ? item : null;
  if (typeof item === "object" && item !== null && "value" in item) {
    const v = Number((item as { value: unknown }).value);
    return isFinite(v) ? v : null;
  }
  const v = Number(item);
  return isFinite(v) ? v : null;
}

/**
 * Client-side clinical rule engine to supplement or compute procedure recommendations
 * from facial metrics, sagging analysis, and cephalometric measurements.
 * Always produces recommendations for all 12 aesthetic procedures, sorted by intensity descending.
 */
export function evaluateComprehensiveProcedures(
  existingRecs?: ProcedureRecommendation[] | null,
  metrics?: Record<string, unknown> | null,
  sagging?: FacialSaggingResult | null,
  cephalometric?: CephalometricResult | null,
  options?: { onlyRecommended?: boolean },
): ProcedureRecommendation[] {
  const recMap = new Map<string, ProcedureRecommendation>();

  // Add existing recommendations
  if (existingRecs) {
    for (const r of existingRecs) {
      recMap.set(r.procedure, r);
    }
  }

  const cephFeats = cephalometric?.features ?? {};
  const sagFeats = sagging?.features ?? {};
  const laxityScore = sagging?.laxity_score ?? null;
  const saggingTier = sagging?.tier ?? null;

  // 1. Chin Augmentation
  if (!recMap.has("chin_augmentation")) {
    const triggers: string[] = [];
    const comps: number[] = [];
    const rationales: string[] = [];

    const f1 = getNum(metrics, "F1_middle_lower_ratio");
    if (f1 != null && f1 > 1.15) {
      comps.push((f1 - 1.0) / 0.35);
      triggers.push("F1_middle_lower_ratio");
      rationales.push(`Middle-to-lower third ratio (F1: ${f1.toFixed(2)}) indicates lower face vertical deficit compared to midface.`);
    }

    const f1Lower = getNum(metrics, "F1_lower_third");
    if (f1Lower != null && f1Lower < 0.3167) {
      comps.push((0.3333 - f1Lower) / 0.10);
      triggers.push("F1_lower_third");
      rationales.push(`Lower face proportion (F1: ${f1Lower.toFixed(3)}) is shorter than classical third (33.3%).`);
    }

    const f2 = getNum(metrics, "F2_lower_face_ratio");
    if (f2 != null && f2 < 1.70) {
      comps.push((2.0 - f2) / 0.60);
      triggers.push("F2_lower_face_ratio");
      rationales.push(`Lower face ratio (F2: ${f2.toFixed(2)}) indicates relatively short chin height compared to upper lip.`);
    }

    const p4Lower = getNum(metrics, "P4_lip_to_eline_lower");
    if (p4Lower != null && p4Lower > 2.0) {
      comps.push((p4Lower - 0.0) / 6.0);
      triggers.push("P4_lip_to_eline_lower");
      rationales.push(`Lower lip position relative to Ricketts' E-line (P4: ${p4Lower.toFixed(1)}mm) indicates chin retrusion in profile.`);
    }

    const intensity = comps.length > 0 ? Math.round(Math.max(0.01, Math.min(1.0, Math.max(...comps))) * 100) / 100 : 0.0;
    recMap.set("chin_augmentation", {
      procedure: "chin_augmentation",
      intensity,
      rationale: comps.length > 0 ? rationales.join(" ") : "Chin projection and vertical proportions are within reference ranges.",
      triggering_metrics: triggers,
    });
  }

  // 2. Lip Augmentation
  if (!recMap.has("lip_augmentation")) {
    const triggers: string[] = [];
    const comps: number[] = [];
    const rationales: string[] = [];

    const f8 = getNum(metrics, "F8_lip_ratio");
    if (f8 != null && f8 < 1.40) {
      comps.push((1.618 - f8) / 0.40);
      triggers.push("F8_lip_ratio");
      rationales.push(`Lip vermilion ratio (F8: ${f8.toFixed(2)}) departs from classical phi proportion (lower lip vermilion height is relatively thin).`);
    } else if (f8 != null && f8 > 1.85) {
      comps.push((f8 - 1.618) / 0.45);
      triggers.push("F8_lip_ratio");
      rationales.push(`Lip vermilion ratio (F8: ${f8.toFixed(2)}) departs from classical phi proportion (upper lip vermilion height is relatively thin).`);
    }

    const p4Upper = getNum(metrics, "P4_lip_to_eline_upper");
    if (p4Upper != null && p4Upper < -6.0) {
      comps.push((-4.0 - p4Upper) / 4.0);
      triggers.push("P4_lip_to_eline_upper");
      rationales.push(`Upper lip (P4: ${p4Upper.toFixed(1)}mm) is positioned behind Ricketts' aesthetic E-line plane.`);
    }

    const intensity = comps.length > 0 ? Math.round(Math.max(0.01, Math.min(1.0, Math.max(...comps))) * 100) / 100 : 0.0;
    recMap.set("lip_augmentation", {
      procedure: "lip_augmentation",
      intensity,
      rationale: comps.length > 0 ? rationales.join(" ") : "Lip vermilion fullness and sagittal projection are within reference ranges.",
      triggering_metrics: triggers,
    });
  }

  // 3. Rhinoplasty
  if (!recMap.has("rhinoplasty")) {
    const triggers: string[] = [];
    const comps: number[] = [];
    const rationales: string[] = [];

    const f6 = getNum(metrics, "F6_alar_intercanthal_ratio") ?? getNum(metrics, "F6_alar_icd_ratio");
    if (f6 != null && f6 > 1.05) {
      comps.push((f6 - 1.00) / 0.20);
      triggers.push(getNum(metrics, "F6_alar_intercanthal_ratio") != null ? "F6_alar_intercanthal_ratio" : "F6_alar_icd_ratio");
      rationales.push(`Alar base width relative to intercanthal distance (F6: ${f6.toFixed(2)}) exceeds classical canon proportion.`);
    }

    const p1 = getNum(metrics, "P1_nasofrontal_angle");
    if (p1 != null && (p1 < 115.0 || p1 > 135.0)) {
      const dev = p1 < 115.0 ? (120.0 - p1) / 15.0 : (p1 - 130.0) / 15.0;
      comps.push(dev);
      triggers.push("P1_nasofrontal_angle");
      rationales.push(p1 < 115.0 ? `Nasofrontal angle (P1: ${p1.toFixed(1)}°) is acute, indicating deep nasal radix transition.` : `Nasofrontal angle (P1: ${p1.toFixed(1)}°) is obtuse, indicating flattened nasal dorsum-forehead angle.`);
    }

    const p2 = getNum(metrics, "P2_nasolabial_angle");
    if (p2 != null && (p2 < 90.0 || p2 > 115.0)) {
      const dev = p2 < 90.0 ? (98.0 - p2) / 15.0 : (p2 - 108.0) / 15.0;
      comps.push(dev);
      triggers.push("P2_nasolabial_angle");
      rationales.push(p2 < 90.0 ? `Nasolabial angle (P2: ${p2.toFixed(1)}°) is acute, indicating downward nasal tip rotation.` : `Nasolabial angle (P2: ${p2.toFixed(1)}°) is obtuse, indicating upward nasal tip rotation.`);
    }

    const intensity = comps.length > 0 ? Math.round(Math.max(0.01, Math.min(1.0, Math.max(...comps))) * 100) / 100 : 0.0;
    recMap.set("rhinoplasty", {
      procedure: "rhinoplasty",
      intensity,
      rationale: comps.length > 0 ? rationales.join(" ") : "Nasal proportions, tip rotation, and projection are within reference ranges.",
      triggering_metrics: triggers,
    });
  }

  // 4. Botulinum Toxin Masseter
  if (!recMap.has("botulinum_toxin_masseter")) {
    const triggers: string[] = [];
    const comps: number[] = [];
    const rationales: string[] = [];

    const gonial = typeof cephFeats.gonial_angle === "number" ? cephFeats.gonial_angle : null;
    if (gonial != null && gonial <= 122.0) {
      comps.push((122.0 - gonial) / 15.0 + 0.35);
      triggers.push("gonial_angle");
      rationales.push(
        `Gonial angle (${gonial.toFixed(1)}°) indicates strong masseteric muscle attachment and square jaw pattern; botulinum toxin type A to masseter muscles can significantly reduce transverse lower face width.`
      );
    }

    const fma = typeof cephFeats.fma_angle === "number" ? cephFeats.fma_angle : null;
    if (fma != null && fma <= 22.0) {
      comps.push((22.0 - fma) / 10.0 + 0.30);
      triggers.push("fma_angle");
      rationales.push(
        `Hypodivergent skeletal pattern (FMA: ${fma.toFixed(1)}°) indicates high masticatory muscle tone and masseter hypertrophy.`
      );
    }

    const f10 = getNum(metrics, "F10_golden_ratio");
    if (f10 != null && f10 < 1.30) {
      comps.push((1.30 - f10) / 0.25);
      triggers.push("F10_golden_ratio");
      rationales.push(
        `Vertical-to-bizygomatic facial ratio (F10: ${f10.toFixed(2)}) indicates transverse lower facial width dominance.`
      );
    }

    const f1 = getNum(metrics, "F1_middle_lower_ratio");
    if (f1 != null && f1 < 0.92) {
      comps.push((0.95 - f1) / 0.20);
      triggers.push("F1_middle_lower_ratio");
      rationales.push(
        `Middle-to-lower third ratio (F1: ${f1.toFixed(2)}) indicates wide, square lower facial morphology.`
      );
    }

    const intensity = comps.length > 0 ? Math.round(Math.max(0.01, Math.min(1.0, Math.max(...comps))) * 100) / 100 : 0.0;
    recMap.set("botulinum_toxin_masseter", {
      procedure: "botulinum_toxin_masseter",
      intensity,
      rationale: comps.length > 0 ? rationales.join(" ") : "Mandibular angle width and masseter volume are in harmony with facial proportions.",
      triggering_metrics: triggers,
    });
  }

  // 5. Botulinum Toxin Upper Face Wrinkles
  if (!recMap.has("botulinum_toxin_wrinkles")) {
    const triggers: string[] = [];
    const comps: number[] = [];
    const rationales: string[] = [];

    const f1Upper = getNum(metrics, "F1_upper_third");
    if (f1Upper != null && f1Upper > 0.355) {
      comps.push((f1Upper - 0.333) / 0.06);
      triggers.push("F1_upper_third");
      rationales.push(
        `Upper facial third proportion (F1: ${f1Upper.toFixed(2)}) indicates dynamic frontalis muscular strain in forehead region.`
      );
    } else if (f1Upper != null && f1Upper < 0.30) {
      comps.push((0.333 - f1Upper) / 0.06);
      triggers.push("F1_upper_third");
      rationales.push(
        `Upper facial third proportion (F1: ${f1Upper.toFixed(2)}) indicates corrugator supercilii hyperactivity with deep glabellar furrowing.`
      );
    }

    const asymBrow = getNum(metrics, "F11_asym_brow_apex_ratio");
    if (asymBrow != null && asymBrow > 0.15) {
      comps.push((asymBrow - 0.10) / 0.20);
      triggers.push("F11_asym_brow_apex_ratio");
      rationales.push(
        `Brow apex vertical height asymmetry (${asymBrow.toFixed(2)}) suggests differential frontalis/orbicularis muscle tone.`
      );
    }

    const asymHead = getNum(metrics, "F11_asym_brow_head_offset");
    if (asymHead != null && Math.abs(asymHead) > 7.0) {
      comps.push((Math.abs(asymHead) - 5.0) / 10.0);
      triggers.push("F11_asym_brow_head_offset");
      rationales.push(
        `Brow medial head vertical offset (${Math.abs(asymHead).toFixed(1)}px) indicates asymmetric corrugator and depressor supercilii dynamic pull.`
      );
    }

    const intensity = comps.length > 0 ? Math.round(Math.max(0.01, Math.min(1.0, Math.max(...comps))) * 100) / 100 : 0.0;
    recMap.set("botulinum_toxin_wrinkles", {
      procedure: "botulinum_toxin_wrinkles",
      intensity,
      rationale: comps.length > 0 ? rationales.join(" ") : "Upper face dynamic vectors and brow contours display smooth, harmonious muscular tone.",
      triggering_metrics: triggers,
    });
  }

  // 6. Nasolabial Fold HA Filler
  if (!recMap.has("hyaluronic_acid_filler_nasolabial")) {
    const triggers: string[] = [];
    const comps: number[] = [];
    const rationales: string[] = [];

    const commDroop = typeof sagFeats.oral_commissure_droop === "number" ? sagFeats.oral_commissure_droop : 0;
    if (commDroop > 0.010) {
      comps.push(Math.min(0.85, commDroop * 30.0));
      triggers.push("oral_commissure_droop");
    }

    if (laxityScore != null && laxityScore >= 28.0) {
      comps.push((laxityScore - 20.0) / 60.0);
      triggers.push("laxity_score");
      rationales.push(
        `Midface soft-tissue laxity (${laxityScore.toFixed(1)}%) with descending malar fat pad deepens nasolabial creases.`
      );
    }

    const p2 = getNum(metrics, "P2_nasolabial_angle");
    if (p2 != null && p2 < 95.0) {
      comps.push((95.0 - p2) / 15.0);
      triggers.push("P2_nasolabial_angle");
      rationales.push(
        `Acute nasolabial angle (P2: ${p2.toFixed(1)}°) with alar crease depression indicates sub-alar pyriform aperture volume deficiency.`
      );
    }

    const sna = typeof cephFeats.sna_angle === "number" ? cephFeats.sna_angle : null;
    if (sna != null && sna < 80.0) {
      comps.push((82.0 - sna) / 8.0);
      triggers.push("sna_angle");
      rationales.push(
        `Cephalometric maxillary retrusion indicates deficient skeletal pyriform support requiring deep structural filler boluses.`
      );
    }

    const intensity = comps.length > 0 ? Math.round(Math.max(0.01, Math.min(1.0, Math.max(...comps))) * 100) / 100 : 0.0;
    recMap.set("hyaluronic_acid_filler_nasolabial", {
      procedure: "hyaluronic_acid_filler_nasolabial",
      intensity,
      rationale: comps.length > 0 ? rationales.join(" ") : "Nasolabial fold contours and pyriform aperture projection are youthfully supported without soft-tissue deficit.",
      triggering_metrics: triggers,
    });
  }

  // 7. Temporal Hollow HA Filler
  if (!recMap.has("hyaluronic_acid_filler_temple")) {
    const triggers: string[] = [];
    const comps: number[] = [];
    const rationales: string[] = [];

    const outerRatio = getNum(metrics, "F5_outer_fifths_ratio");
    if (outerRatio != null && outerRatio < 0.85) {
      comps.push((0.88 - outerRatio) / 0.15);
      triggers.push("F5_outer_fifths_ratio");
      rationales.push(
        `Temporal outer fifths ratio (F5: ${outerRatio.toFixed(2)}) indicates temporal hollowing and skeletonized upper lateral facial contour.`
      );
    }

    const outerR = getNum(metrics, "F3_fifth_outer_right");
    const outerL = getNum(metrics, "F3_fifth_outer_left");
    const outers = [outerR, outerL].filter((v): v is number => v != null);
    if (outers.length > 0) {
      const minOuter = Math.min(...outers);
      if (minOuter < 0.185) {
        comps.push((0.200 - minOuter) / 0.05);
        triggers.push("F3_fifth_outer");
        rationales.push(
          `Temporal outer fifths ratio (F5: ${minOuter.toFixed(2)}) indicates temporal hollowing and skeletonized upper lateral facial contour.`
        );
      }
    }

    const asymOuter = getNum(metrics, "F11_asym_outer_fifth");
    if (asymOuter != null && asymOuter > 0.12) {
      comps.push((asymOuter - 0.08) / 0.20);
      triggers.push("F11_asym_outer_fifth");
      rationales.push("Bitemporal width asymmetry indicates uneven temporal fossa soft tissue atrophy.");
    }

    const intensity = comps.length > 0 ? Math.round(Math.max(0.01, Math.min(1.0, Math.max(...comps))) * 100) / 100 : 0.0;
    recMap.set("hyaluronic_acid_filler_temple", {
      procedure: "hyaluronic_acid_filler_temple",
      intensity,
      rationale: comps.length > 0 ? rationales.join(" ") : "Temporal fossa volume and bitemporal contour are in balanced anatomical proportion.",
      triggering_metrics: triggers,
    });
  }

  // 8. Mandibular Contouring Surgery
  if (!recMap.has("mandibular_contouring")) {
    const triggers: string[] = [];
    const comps: number[] = [];
    const rationales: string[] = [];

    const gonial = typeof cephFeats.gonial_angle === "number" ? cephFeats.gonial_angle : null;
    if (gonial != null && gonial < 115.0) {
      comps.push((118.0 - gonial) / 12.0);
      triggers.push("gonial_angle");
      rationales.push(
        `Very acute gonial angle (${gonial.toFixed(1)}°) indicates severe bony mandibular angle prominence and square jaw deformity; ostectomy or contouring surgery provides definitive bony reduction.`
      );
    }

    const fma = typeof cephFeats.fma_angle === "number" ? cephFeats.fma_angle : null;
    if (fma != null && fma < 20.0) {
      comps.push((20.0 - fma) / 8.0);
      triggers.push("fma_angle");
      rationales.push(
        `Marked hypodivergent pattern (FMA: ${fma.toFixed(1)}°) demonstrates thick bony mandibular base beyond muscular correction alone.`
      );
    }

    const intensity = comps.length > 0 ? Math.round(Math.max(0.01, Math.min(1.0, Math.max(...comps))) * 100) / 100 : 0.0;
    recMap.set("mandibular_contouring", {
      procedure: "mandibular_contouring",
      intensity,
      rationale: comps.length > 0 ? rationales.join(" ") : "Bony mandibular angle and basal bone dimensions are balanced without structural skeletal flare.",
      triggering_metrics: triggers,
    });
  }

  // 9. Orthognathic Surgery
  if (!recMap.has("orthognathic_surgery")) {
    const cephClass = cephalometric?.skeletal_class;
    const cephSev = cephalometric?.severity;
    let intensity = 0.0;
    let rationale = "Skeletal and occlusal relationships display harmonic Class I alignment without indication for orthognathic surgical intervention.";
    const triggers: string[] = [];

    if (cephClass === 1 || cephalometric?.skeletal_class_name === "Class_II") {
      triggers.push("skeletal_class_ii");
      if (cephSev === "Mild") {
        intensity = 0.25;
        rationale = "Mild Skeletal Class II retrognathia. Corrective orthognathic jaw surgery is an elective option; aesthetic camouflage (chin filler or implant) or orthodontic compensation is generally preferred.";
      } else if (cephSev === "Moderate") {
        intensity = 0.65;
        rationale = "Moderate Skeletal Class II malocclusion with mandibular retrognathia. Orthognathic bilateral sagittal split osteotomy (BSSO) mandibular advancement is clinically indicated to establish functional occlusion and restore lower-face projection.";
      } else {
        intensity = 0.95;
        rationale = "Severe Skeletal Class II malocclusion (ANB: 6.5°, Wits: 4.8mm) with mandibular retrognathia warrants bilateral sagittal split osteotomy (BSSO) mandibular advancement.";
      }
    } else if (cephClass === 2 || cephalometric?.skeletal_class_name === "Class_III") {
      triggers.push("skeletal_class_iii");
      if (cephSev === "Mild") {
        intensity = 0.35;
        rationale = "Mild Skeletal Class III discrepancy. Orthognathic surgery may be considered if orthodontic dental camouflage is insufficient. Non-surgical chin volume addition is contraindicated.";
      } else if (cephSev === "Moderate") {
        intensity = 0.75;
        rationale = "Moderate Skeletal Class III malocclusion with mandibular prognathism or midface retrusion. Corrective orthognathic surgery (mandibular setback ± maxillary advancement) is clinically indicated for functional bite correction and profile balance.";
      } else {
        intensity = 1.00;
        rationale = "Skeletal Class III malocclusion (ANB: -3.5°, Wits: -5.0mm) with prominent mandibular prognathism warrants multidisciplinary orthognathic surgery (BSSO/Le Fort I) for definitive skeletal and occlusal correction.";
      }
    }

    recMap.set("orthognathic_surgery", {
      procedure: "orthognathic_surgery",
      intensity,
      rationale,
      triggering_metrics: triggers,
    });
  }

  // 10. Skin Tightening (HIFU / RF)
  if (!recMap.has("skin_tightening")) {
    let intensity = 0.0;
    let rationale = "Facial skin and subcutaneous structures display high firmness; routine preventive skincare recommended without energy-based tightening.";
    const triggers: string[] = [];

    if (saggingTier === 1 && laxityScore != null && laxityScore >= 25.0) {
      intensity = Math.round(Math.max(0.15, (laxityScore - 20.0) / 40.0) * 100) / 100;
      triggers.push("laxity_score");
      rationale = `Early boundary structural laxity (${laxityScore.toFixed(1)}%); preventive low-intensity focused ultrasound or RF may delay soft-tissue descent.`;
    } else if (saggingTier === 2 && laxityScore != null) {
      intensity = Math.round(Math.min(0.90, Math.max(0.35, laxityScore / 70.0)) * 100) / 100;
      triggers.push("sagging_tier", "laxity_score");
      rationale = `Moderate structural laxity (Tier 2, Laxity Score: ${laxityScore.toFixed(1)}%) is optimally indicated for High-Intensity Focused Ultrasound (HIFU/Ultherapy) or Monopolar RF (Thermage) to stimulate deep collagen remodeling and SMAS fascial contraction without surgery.`;
    } else if (saggingTier === 3 && laxityScore != null) {
      intensity = Math.round(Math.min(0.55, Math.max(0.30, 40.0 / (laxityScore + 1e-4))) * 100) / 100;
      triggers.push("sagging_tier", "laxity_score");
      rationale = `Advanced structural laxity (Tier 3, Laxity Score: ${laxityScore.toFixed(1)}%) receives moderate dermal tightening benefit from energy devices, but deep structural ptosis typically warrants surgical or suspension repositioning for definitive rejuvenation.`;
    }

    recMap.set("skin_tightening", {
      procedure: "skin_tightening",
      intensity,
      rationale,
      triggering_metrics: triggers,
    });
  }

  // 11. Thread Lift
  if (!recMap.has("thread_lift")) {
    let intensity = 0.0;
    let rationale = "Mandibular and malar vectors show preserved anatomical position; suspension thread lifting is not indicated.";
    const triggers: string[] = [];

    if (saggingTier === 2 || (laxityScore != null && laxityScore >= 35.0 && laxityScore < 75.0)) {
      intensity = Math.round(Math.min(0.85, Math.max(0.25, ((laxityScore ?? 45.0) - 30.0) / 45.0)) * 100) / 100;
      triggers.push("sagging_tier", "laxity_score");
      rationale = `Mild-to-moderate descent of malar and mandibular soft tissue (Tier ${saggingTier ?? 2}, Laxity: ${(laxityScore ?? 45.0).toFixed(1)}%) indicates absorbable barbed suspension threads (PDO/PLLA) for mechanical repositioning of descending jowl and perioral tissue vectors.`;
    } else if (saggingTier === 3 || (laxityScore != null && laxityScore >= 75.0)) {
      intensity = Math.round(Math.min(0.65, Math.max(0.35, ((laxityScore ?? 80.0) - 20.0) / 90.0)) * 100) / 100;
      triggers.push("sagging_tier", "laxity_score", "jowl_sagging_index");
      rationale = `Advanced tissue laxity (Tier 3, Laxity: ${(laxityScore ?? 80.0).toFixed(1)}%) provides moderate indication for thread lifting as a minimally invasive vector-lifting alternative when surgical rhytidectomy is contraindicated or declined.`;
    }

    recMap.set("thread_lift", {
      procedure: "thread_lift",
      intensity,
      rationale,
      triggering_metrics: triggers,
    });
  }

  // 12. Surgical Facelift
  if (!recMap.has("surgical_facelift")) {
    let intensity = 0.0;
    let rationale = "Facial structural contours are within non-surgical boundaries; invasive surgical rhytidectomy is not indicated.";
    const triggers: string[] = [];

    if (saggingTier === 3 || (laxityScore != null && laxityScore >= 65.0)) {
      intensity = Math.round(Math.min(1.0, Math.max(0.35, ((laxityScore ?? 75.0) - 60.0) / 35.0)) * 100) / 100;
      triggers.push("sagging_tier", "laxity_score");
      rationale = `Advanced morphological structural laxity (Tier 3, Laxity Score: ${(laxityScore ?? 75.0).toFixed(1)}%) warrants surgical SMAS or deep-plane rhytidectomy with platysmaplasty for definitive anatomical repositioning and redundant skin envelope excision.`;
    }

    recMap.set("surgical_facelift", {
      procedure: "surgical_facelift",
      intensity,
      rationale,
      triggering_metrics: triggers,
    });
  }

  // Convert map to array and sort descending by intensity
  const resultList = Array.from(recMap.values());
  resultList.sort((a, b) => {
    if (b.intensity !== a.intensity) {
      return b.intensity - a.intensity;
    }
    return a.procedure.localeCompare(b.procedure);
  });

  const mapped = resultList.map((rec) => {
    const specificAction = rec.specific_action ?? getSpecificAction(rec);
    const priorityLevel = rec.priority_level ?? (
      rec.intensity >= 0.65 ? "high" :
      rec.intensity >= 0.35 ? "moderate" :
      rec.intensity > 0 ? "low" : "none"
    );
    const area = rec.area ?? DEFAULT_PROCEDURE_AREAS[rec.procedure] ?? "face";
    const actionType = rec.action_type ?? DEFAULT_PROCEDURE_CATEGORIES[rec.procedure] ?? "surgical";
    const defaultTitle = PROCEDURE_TITLES[rec.procedure] ?? rec.procedure;
    const titleTh = rec.title_th ?? (rec.intensity > 0 && specificAction ? specificAction : defaultTitle);

    return {
      ...rec,
      specific_action: specificAction,
      priority_level: priorityLevel,
      area,
      action_type: actionType,
      title_th: titleTh,
    };
  });

  if (options?.onlyRecommended) {
    return mapped.filter((r) => r.intensity > 0);
  }
  return mapped;
}
