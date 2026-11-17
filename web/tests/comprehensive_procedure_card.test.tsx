import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import type { ProcedureRecommendation } from "../src/api/schemas";
import {
  ProcedureRecommendationCard,
  PROCEDURE_TITLES,
  translateRationale,
} from "../src/components/results/ProcedureRecommendationCard";
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

    const temple = evaluated.find((r) => r.procedure === "hyaluronic_acid_filler_temple");
    expect(temple).toBeDefined();
    expect(temple!.intensity).toBeGreaterThan(0);
  });
});
