import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import type { ProcedureRecommendation, CephalometricResult } from "../src/api/schemas";
import {
  ProcedureRecommendationCard,
  PROCEDURE_TITLES,
  translateRationale,
} from "../src/components/results/ProcedureRecommendationCard";
import { CephalometricCard } from "../src/components/results/CephalometricCard";
import { evaluateComprehensiveProcedures } from "../src/utils/procedureRecommender";

describe("Comprehensive Aesthetic Procedures & ProcedureRecommendationCard", () => {
  it("defines titles for all 12 aesthetic procedures", () => {
    const expectedProcedures = [
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
    ];

    for (const proc of expectedProcedures) {
      expect(PROCEDURE_TITLES[proc]).toBeDefined();
      expect(typeof PROCEDURE_TITLES[proc]).toBe("string");
    }
  });

  it("translates all clinical rationales to Thai correctly", () => {
    // Masseter
    const masseter = translateRationale(
      "Gonial angle (118.5°) indicates strong masseteric muscle attachment and square jaw pattern; botulinum toxin type A to masseter muscles can significantly reduce transverse lower face width."
    );
    expect(masseter).toContain("มุมกราม (118.5°)");
    expect(masseter).toContain("Masseter Botox");

    // Wrinkles
    const wrinkles = translateRationale(
      "Upper facial third proportion (F1: 0.38) indicates dynamic frontalis muscular strain in forehead region."
    );
    expect(wrinkles).toContain("Frontalis");

    // Nasolabial
    const nasolabial = translateRationale(
      "Deep nasolabial fold depth score (64.2%) warrants structural deep-bolus hyaluronic acid filler."
    );
    expect(nasolabial).toContain("ร่องแก้มลึก (64.2%)");
    expect(nasolabial).toContain("ฟิลเลอร์ไฮยาลูโรนิกแอซิด");

    // Temple
    const temple = translateRationale(
      "Temporal outer fifths ratio (F5: 0.82) indicates temporal hollowing and skeletonized upper lateral facial contour."
    );
    expect(temple).toContain("ขมับตอบ");

    // Mandibular contouring
    const mandibular = translateRationale(
      "Very acute gonial angle (112.0°) indicates severe bony mandibular angle prominence and square jaw deformity; ostectomy or contouring surgery provides definitive bony reduction."
    );
    expect(mandibular).toContain("มุมกรามแคบมาก (112.0°)");
    expect(mandibular).toContain("ผ่าตัดตัดแต่งมุมกราม");

    // Orthognathic
    const ortho = translateRationale(
      "Skeletal Class III malocclusion (ANB: -3.5°, Wits: -5.0mm) with prominent mandibular prognathism warrants multidisciplinary orthognathic surgery (BSSO/Le Fort I) for definitive skeletal and occlusal correction."
    );
    expect(ortho).toContain("Skeletal Class III");
    expect(ortho).toContain("BSSO/Le Fort I");
  });

  it("sorts recommendations in descending order of recommendation intensity", () => {
    const recs: ProcedureRecommendation[] = [
      {
        procedure: "surgical_facelift",
        intensity: 0.0,
        rationale: "Facial structural contours show low-to-moderate descent (Tier 1-2); invasive surgical facelift is not indicated.",
        triggering_metrics: [],
      },
      {
        procedure: "botulinum_toxin_masseter",
        intensity: 0.85,
        rationale: "Gonial angle (118.0°) indicates strong masseteric muscle attachment and square jaw pattern; botulinum toxin type A to masseter muscles can significantly reduce transverse lower face width.",
        triggering_metrics: ["gonial_angle"],
      },
      {
        procedure: "hyaluronic_acid_filler_temple",
        intensity: 0.45,
        rationale: "Temporal outer fifths ratio (F5: 0.82) indicates temporal hollowing and skeletonized upper lateral facial contour.",
        triggering_metrics: ["F5_outer_fifths_ratio"],
      },
    ];

    const { container } = render(<ProcedureRecommendationCard recommendations={recs} />);
    const cards = container.querySelectorAll(".border.border-line.bg-paper.p-3");
    expect(cards.length).toBe(3);

    // First card should be masseter botox (85%)
    expect(cards[0]!.textContent).toContain("โบท็อกซ์ลดกราม ปรับรูปหน้าเรียว (Masseter Botulinum Toxin)");
    expect(cards[0]!.textContent).toContain("แนะนำระดับ 85%");

    // Second card should be temple filler (45%)
    expect(cards[1]!.textContent).toContain("ฟิลเลอร์เติมเต็มขมับตอบ (Temporal Volume Restoration)");
    expect(cards[1]!.textContent).toContain("แนะนำระดับ 45%");

    // Third card should be facelift (0%)
    expect(cards[2]!.textContent).toContain("ศัลยกรรมยกกระชับดึงหน้า (Surgical Rhytidectomy)");
    expect(cards[2]!.textContent).toContain("สัดส่วนสมดุล (0%)");
  });

  it("evaluates comprehensive procedures client-side with full fallback support", () => {
    const evaluated = evaluateComprehensiveProcedures([], {
      F10_golden_ratio: 1.22,
      F5_outer_fifths_ratio: 0.80,
    });

    expect(evaluated.length).toBe(12);
    // Should sort descending
    for (let i = 0; i < evaluated.length - 1; i++) {
      expect(evaluated[i]!.intensity).toBeGreaterThanOrEqual(evaluated[i + 1]!.intensity);
    }

    const masseter = evaluated.find((r) => r.procedure === "botulinum_toxin_masseter");
    expect(masseter).toBeDefined();
    expect(masseter!.intensity).toBeGreaterThan(0);
    expect(masseter!.specific_action).toBeDefined();
    expect(masseter!.area).toBe("jawline");
    expect(masseter!.action_type).toBe("injection");

    const temple = evaluated.find((r) => r.procedure === "hyaluronic_acid_filler_temple");
    expect(temple).toBeDefined();
    expect(temple!.intensity).toBeGreaterThan(0);
    expect(temple!.specific_action).toBe("ฟิลเลอร์เติมเต็มขมับตอบ ปรับมิติกรอบหน้าส่วนบน (Temporal Volume Restoration)");
  });

  it("filters out 0% non-recommended procedures when filterNonRecommended is true", () => {
    const recs: ProcedureRecommendation[] = [
      {
        procedure: "surgical_facelift",
        intensity: 0.0,
        rationale: "Facial structural contours show low-to-moderate descent; invasive surgical facelift is not indicated.",
        triggering_metrics: [],
      },
      {
        procedure: "rhinoplasty",
        intensity: 0.75,
        rationale: "Nasal alar width (F6: 1.15) exceeds intercanthal distance.",
        triggering_metrics: ["F6_alar_intercanthal_ratio"],
        specific_action: "ตัดปีกจมูก (ลดความกว้าง)",
      },
    ];

    const { queryByText, getByText } = render(
      <ProcedureRecommendationCard recommendations={recs} filterNonRecommended={true} />
    );

    // Rhinoplasty should be visible with specific action
    expect(getByText("ตัดปีกจมูก (ลดความกว้าง)")).toBeInTheDocument();
    expect(getByText("แนะนำระดับ 75%")).toBeInTheDocument();

    // 0% facelift should NOT be present in DOM
    expect(queryByText("สัดส่วนสมดุล (0%)")).not.toBeInTheDocument();
    expect(queryByText("ศัลยกรรมยกกระชับดึงหน้า (Surgical Rhytidectomy)")).not.toBeInTheDocument();
  });

  it("displays harmonious balance notice when all procedures are balanced / 0% with filterNonRecommended", () => {
    const balancedRecs: ProcedureRecommendation[] = [
      {
        procedure: "rhinoplasty",
        intensity: 0.0,
        rationale: "Nasal proportions within reference ranges.",
        triggering_metrics: [],
      },
      {
        procedure: "chin_augmentation",
        intensity: 0.0,
        rationale: "Chin projection within reference ranges.",
        triggering_metrics: [],
      },
    ];

    const { getByText, queryByText } = render(
      <ProcedureRecommendationCard recommendations={balancedRecs} filterNonRecommended={true} />
    );

    expect(
      getByText("สัดส่วนใบหน้าทุกมิติอยู่ในเกณฑ์สมดุล (Harmonious Balance)")
    ).toBeInTheDocument();
    expect(queryByText("แนะนำระดับ")).not.toBeInTheDocument();
  });

  it("renders specific actionable procedure titles for nose and chin correctly", () => {
    const recs: ProcedureRecommendation[] = [
      {
        procedure: "rhinoplasty",
        intensity: 0.65,
        rationale: "Nasal tip projection is deficient.",
        triggering_metrics: ["P3a_nasal_tip_angle"],
        area: "nose",
        action_type: "surgical",
        specific_action: "เสริมจมูกยกปลายพุ่ง",
      },
      {
        procedure: "chin_augmentation",
        intensity: 0.70,
        rationale: "Lower lip position relative to Ricketts' E-line indicates chin retrusion.",
        triggering_metrics: ["P4_lip_to_eline_lower"],
        area: "chin",
        action_type: "injection",
        specific_action: "เสริมคางยื่นรับสัดส่วน E-line",
      },
    ];

    const { getByText, getAllByText } = render(
      <ProcedureRecommendationCard recommendations={recs} filterNonRecommended={true} />
    );

    expect(getByText("เสริมจมูกยกปลายพุ่ง")).toBeInTheDocument();
    expect(getByText("เสริมคางยื่นรับสัดส่วน E-line")).toBeInTheDocument();
    expect(getByText("จมูก")).toBeInTheDocument();
    expect(getByText("คาง")).toBeInTheDocument();
    expect(getByText("ศัลยกรรมผ่าตัด")).toBeInTheDocument();
    expect(getByText("หัตถการฉีด")).toBeInTheDocument();
    expect(getAllByText("แนะนำสูง").length).toBe(2);
  });

  it("translates clinical rationales across all procedure categories to Thai", () => {
    // Rhinoplasty P3a
    const tP3a = translateRationale("Nasal tip projection ratio (P3a Goode: 0.50) is below reference range.");
    expect(tP3a).toContain("ความพุ่งของปลายจมูกตามเกณฑ์ Goode");

    // Wrinkles F1 upper third
    const tWrinkles = translateRationale(
      "Upper facial third height (F1: 0.380) indicates elevated frontalis dynamic strain and forehead line tendency."
    );
    expect(tWrinkles).toContain("สัดส่วนความสูงใบหน้าส่วนบน");
    expect(tWrinkles).toContain("Frontalis");

    // Temple F3 outer fifth
    const tTemple = translateRationale(
      "Temporal width in outer facial fifths (F3: 0.165) falls below Neoclassical canon (0.200), indicating temporal fossa hollowing."
    );
    expect(tTemple).toContain("สัดส่วนความกว้างขมับ");
    expect(tTemple).toContain("ขมับตอบ");

    // Class III chin augmentation contraindication
    const tContra = translateRationale(
      "Chin augmentation (filler or implant) is contraindicated due to Skeletal Class III prognathism (mandibular excess or midface hypoplasia). Adding chin volume would exacerbate lower-face anterior protrusion; orthognathic surgical consultation is recommended instead."
    );
    expect(tContra).toContain("ข้อห้ามทางการแพทย์");
    expect(tContra).toContain("Skeletal Class III");
  });

  it("filters only recommended procedures in evaluateComprehensiveProcedures when onlyRecommended is true", () => {
    const evaluated = evaluateComprehensiveProcedures([], {
      F1_lower_third: 0.28,
      F6_alar_icd_ratio: 1.20,
    }, null, null, { onlyRecommended: true });

    expect(evaluated.length).toBeGreaterThan(0);
    expect(evaluated.every((r) => r.intensity > 0)).toBe(true);
  });

  it("renders contraindication notice in CephalometricCard for Class III even when chin recommendation is filtered out", () => {
    const mockClassIII: CephalometricResult = {
      skeletal_class: 2,
      skeletal_class_name: "Class_III",
      confidence: 0.99,
      probabilities: { Class_I: 0.0, Class_II: 0.01, Class_III: 0.99 },
      severity: "Severe",
      primary_etiology: "mandibular_prognathism",
      vertical_pattern: "Normodivergent",
      surgical_indication: "orthognathic_strongly_recommended",
      label_th: "ขากรรไกรล่างยื่น / คางยื่น (Class III)",
      label_en: "Mandibular Excess (Class III)",
      description_th: "ขากรรไกรล่างเจริญเติบโตเกินไปทางด้านหน้า คางยื่น",
      description_en: "Severe mandibular prognathism",
      features: {
        sna_angle: 80.0,
        snb_angle: 88.0,
        anb_angle: -8.0,
      },
    };

    // recommendations array has NO chin_augmentation (omitted because 0%)
    const recsWithoutChin: ProcedureRecommendation[] = [
      {
        procedure: "orthognathic_surgery",
        intensity: 0.95,
        rationale: "Severe Skeletal Class III deformity.",
        triggering_metrics: ["skeletal_class_iii"],
      },
    ];

    const { getByText } = render(
      <CephalometricCard cephalometric={mockClassIII} recommendations={recsWithoutChin} />
    );

    expect(getByText("ข้อห้ามทางการแพทย์ (Clinical Contraindication)")).toBeInTheDocument();
  });
});
