import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { FacialSaggingResult, ProcedureRecommendation } from "../src/api/schemas";
import { FacialSaggingCard } from "../src/components/results/FacialSaggingCard";
import { PROCEDURE_TITLES, translateRationale } from "../src/components/results/ProcedureRecommendationCard";

describe("FacialSaggingCard", () => {
  const mockSagging: FacialSaggingResult = {
    tier: 2,
    tier_name: "Moderate",
    laxity_score: 52.4,
    confidence: 0.88,
    probabilities: {
      Firm: 0.12,
      Moderate: 0.76,
      Advanced: 0.12,
    },
    rating_th: "ความหย่อนคล้อยระดับปานกลาง (Moderate Laxity)",
    rating_en: "Moderate Structural Laxity & Early Descent",
    features: {
      jowl_sagging_index: 0.0315,
      malar_to_jaw_ratio: 1.082,
      oral_commissure_droop: -0.021,
      jawline_irregularity: 0.0225,
    },
    description_th: "เริ่มพบการคล้อยตัวของเนื้อเยื่อบริเวณกระพุ้งแก้ม (Early Jowling) ร่องแก้มและร่องมุมปากเริ่มปรากฏ กรอบกรามเริ่มลดความคมชัด",
    description_en: "Mild to moderate soft-tissue descent, subtle jowl formation, early deepening of nasolabial and marionette folds.",
  };

  const mockRecommendations: ProcedureRecommendation[] = [
    {
      procedure: "skin_tightening",
      intensity: 0.75,
      rationale:
        "Moderate structural laxity (Tier 2, Laxity Score: 52.4%) is optimally indicated for High-Intensity Focused Ultrasound (HIFU/Ultherapy) or Monopolar RF (Thermage) to stimulate deep collagen remodeling and SMAS fascial contraction without surgery.",
      triggering_metrics: ["sagging_tier", "laxity_score"],
    },
    {
      procedure: "thread_lift",
      intensity: 0.5,
      rationale:
        "Mild-to-moderate descent of malar and mandibular soft tissue (Tier 2, Laxity: 52.4%) indicates absorbable barbed suspension threads (PDO/PLLA) for mechanical repositioning of descending jowl and perioral tissue vectors.",
      triggering_metrics: ["sagging_tier", "laxity_score"],
    },
    {
      procedure: "surgical_facelift",
      intensity: 0.0,
      rationale:
        "Facial structural contours show low-to-moderate descent (Tier 1-2); invasive surgical facelift is not indicated.",
      triggering_metrics: [],
    },
    {
      procedure: "rhinoplasty",
      intensity: 0.6,
      rationale: "Nasal tip projection is below reference.",
      triggering_metrics: ["P3a"],
    },
  ];

  it("returns null when sagging is null or undefined", () => {
    const { container: c1 } = render(<FacialSaggingCard sagging={null} />);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(<FacialSaggingCard sagging={undefined} />);
    expect(c2.firstChild).toBeNull();
  });

  it("renders the header and benchmark badge", () => {
    render(<FacialSaggingCard sagging={mockSagging} recommendations={mockRecommendations} />);
    expect(
      screen.getByText("การประเมินความหย่อนคล้อยและแนวกราม (Facial Sagging & Laxity Index)")
    ).toBeInTheDocument();
    expect(
      screen.getByText("MediaPipe 478 Mesh + Logistic Regression (UTKFace)")
    ).toBeInTheDocument();
  });

  it("renders Tier 2 Moderate badge, rating, and clinical description", () => {
    render(<FacialSaggingCard sagging={mockSagging} recommendations={mockRecommendations} />);
    expect(screen.getByText("Tier 2: Moderate (หย่อนคล้อยปานกลาง)")).toBeInTheDocument();
    expect(
      screen.getByText("ความหย่อนคล้อยระดับปานกลาง (Moderate Laxity)")
    ).toBeInTheDocument();
    expect(screen.getByText(mockSagging.description_th)).toBeInTheDocument();
  });

  it("renders Tier 1 Firm badge correctly", () => {
    const firmSagging: FacialSaggingResult = {
      ...mockSagging,
      tier: 1,
      tier_name: "Firm",
      laxity_score: 18.2,
      probabilities: { Firm: 0.85, Moderate: 0.12, Advanced: 0.03 },
      rating_th: "ความกระชับระดับดีเยี่ยม (Firm Structure)",
      description_th: "กรอบหน้าคมชัด แนวกรามเรียวสวย ไม่พบความหย่อนคล้อย",
    };
    render(<FacialSaggingCard sagging={firmSagging} recommendations={[]} />);
    expect(screen.getByText("Tier 1: Firm (ความกระชับสูง)")).toBeInTheDocument();
    expect(screen.getByText("ความกระชับระดับดีเยี่ยม (Firm Structure)")).toBeInTheDocument();
  });

  it("renders Tier 3 Advanced badge correctly", () => {
    const advSagging: FacialSaggingResult = {
      ...mockSagging,
      tier: 3,
      tier_name: "Advanced",
      laxity_score: 78.6,
      probabilities: { Firm: 0.05, Moderate: 0.25, Advanced: 0.7 },
      rating_th: "ความหย่อนคล้อยระดับสูง (Advanced Structural Laxity)",
      description_th: "เนื้อเยื่อแก้มส่วนล่างคล้อยลงมาใต้แนวกรามชัดเจน",
    };
    render(<FacialSaggingCard sagging={advSagging} recommendations={[]} />);
    expect(screen.getByText("Tier 3: Advanced (หย่อนคล้อยชัดเจน)")).toBeInTheDocument();
    expect(
      screen.getByText("ความหย่อนคล้อยระดับสูง (Advanced Structural Laxity)")
    ).toBeInTheDocument();
  });

  it("renders the continuous laxity spectrum bar and posterior probabilities", () => {
    render(<FacialSaggingCard sagging={mockSagging} recommendations={mockRecommendations} />);
    expect(screen.getByText("แถบวัดระดับความหย่อนคล้อย (Facial Laxity Spectrum)")).toBeInTheDocument();
    expect(screen.getByText("กระชับ Firm (0–35%)")).toBeInTheDocument();
    expect(screen.getByText("หย่อนคล้อยปานกลาง Moderate (36–65%)")).toBeInTheDocument();
    expect(screen.getByText("หย่อนคล้อยชัดเจน Advanced (66–100%)")).toBeInTheDocument();
    expect(screen.getByText("76.0%")).toBeInTheDocument(); // Moderate prob
  });

  it("correctly interprets oral commissure droop directions", () => {
    // 1. Uplifted (youthful smile: commissure higher than stomion, val <= -0.025)
    const upliftedSagging: FacialSaggingResult = {
      ...mockSagging,
      features: { ...mockSagging.features, oral_commissure_droop: -0.035 },
    };
    const { unmount: u1 } = render(<FacialSaggingCard sagging={upliftedSagging} />);
    expect(screen.getByText("มุมปากยกกระชับ (Uplifted)")).toBeInTheDocument();
    u1();

    // 2. Severe droop (commissure lower than stomion, val > -0.015)
    const severeDroopSagging: FacialSaggingResult = {
      ...mockSagging,
      features: { ...mockSagging.features, oral_commissure_droop: 0.015 },
    };
    const { unmount: u2 } = render(<FacialSaggingCard sagging={severeDroopSagging} />);
    expect(screen.getByText("ตกลู่ชัดเจน (Noticeable)")).toBeInTheDocument();
    u2();
  });

  it("handles 0-indexed probability mappings without collision", () => {
    const zeroIndexedSagging: FacialSaggingResult = {
      ...mockSagging,
      probabilities: { "0": 0.8, "1": 0.15, "2": 0.05 },
    };
    render(<FacialSaggingCard sagging={zeroIndexedSagging} />);
    expect(screen.getByText("80.0%")).toBeInTheDocument(); // Firm
    expect(screen.getByText("15.0%")).toBeInTheDocument(); // Moderate
    expect(screen.getByText("5.0%")).toBeInTheDocument();  // Advanced
  });

  it("handles 1-indexed probability mappings without collision", () => {
    const oneIndexedSagging: FacialSaggingResult = {
      ...mockSagging,
      probabilities: { "1": 0.1, "2": 0.7, "3": 0.2 },
    };
    render(<FacialSaggingCard sagging={oneIndexedSagging} />);
    expect(screen.getByText("10.0%")).toBeInTheDocument(); // Firm
    expect(screen.getByText("70.0%")).toBeInTheDocument(); // Moderate
    expect(screen.getByText("20.0%")).toBeInTheDocument(); // Advanced
  });

  it("resolves feature aliases if primary keys are absent", () => {
    const aliasSagging: FacialSaggingResult = {
      ...mockSagging,
      features: {
        jowl_sagging: 0.025,
        malar_jaw_ratio: 1.15,
        marionette_droop: -0.03,
        mandibular_contour_irregularity: 0.018,
      },
    };
    render(<FacialSaggingCard sagging={aliasSagging} />);
    expect(screen.getByText("0.0250")).toBeInTheDocument();
    expect(screen.getByText("1.1500")).toBeInTheDocument();
    expect(screen.getByText("-0.0300")).toBeInTheDocument();
    expect(screen.getByText("0.0180")).toBeInTheDocument();
    expect(screen.getByText("ปกติ (Minimal)")).toBeInTheDocument();
    expect(screen.getByText("กระชับรูปไข่ (V-Shape ∇)")).toBeInTheDocument();
    expect(screen.getByText("มุมปากยกกระชับ (Uplifted)")).toBeInTheDocument();
    expect(screen.getByText("คมชัดเรียบเนียน (Sharp)")).toBeInTheDocument();
  });

  it("renders needle without clipping at boundary laxity scores (0% and 100%)", () => {
    const boundary0: FacialSaggingResult = { ...mockSagging, laxity_score: 0.0 };
    const { unmount: u1 } = render(<FacialSaggingCard sagging={boundary0} />);
    expect(screen.getAllByText("0.0%").length).toBeGreaterThan(0);
    u1();

    const boundary100: FacialSaggingResult = { ...mockSagging, laxity_score: 100.0 };
    const { unmount: u2 } = render(<FacialSaggingCard sagging={boundary100} />);
    expect(screen.getAllByText("100.0%").length).toBeGreaterThan(0);
    u2();
  });

  it("resolves tier from tier_name when tier number is undefined", () => {
    const noTierNum: FacialSaggingResult = {
      ...mockSagging,
      tier: undefined as unknown as number,
      tier_name: "Advanced",
    };
    render(<FacialSaggingCard sagging={noTierNum} />);
    expect(screen.getByText("Tier 3: Advanced (หย่อนคล้อยชัดเจน)")).toBeInTheDocument();
  });

  it("renders the 4 explainable XAI anatomical features", () => {
    render(<FacialSaggingCard sagging={mockSagging} recommendations={mockRecommendations} />);
    expect(screen.getByText("แนวกรามหย่อนคล้อย (Jowl Sagging Index)")).toBeInTheDocument();
    expect(screen.getByText("สัดส่วนโหนกแก้มต่อกราม (Malar-to-Jaw Ratio)")).toBeInTheDocument();
    expect(screen.getByText("มุมองศาขอบปากตกลู่ (Marionette Droop)")).toBeInTheDocument();
    expect(screen.getByText("ความคมชัดของขอบกราม (Mandibular Contour)")).toBeInTheDocument();

    // Check numerical formatting
    expect(screen.getByText("0.0315")).toBeInTheDocument();
    expect(screen.getByText("1.0820")).toBeInTheDocument();
    expect(screen.getByText("-0.0210")).toBeInTheDocument();
    expect(screen.getByText("0.0225")).toBeInTheDocument();

    // Check interpretation badges
    expect(screen.getByText("เริ่มหย่อนคล้อย (Mild)")).toBeInTheDocument();
    expect(screen.getByText("เริ่มขยายตัว (Transitional)")).toBeInTheDocument();
    expect(screen.getByText("เริ่มตกลู่ (Slight Droop)")).toBeInTheDocument();
    expect(screen.getByText("เริ่มมีรอยคลื่น (Wavy)")).toBeInTheDocument();
  });

  it("filters and displays only indicated sagging procedures (intensity > 0)", () => {
    render(<FacialSaggingCard sagging={mockSagging} recommendations={mockRecommendations} />);

    // skin_tightening (intensity 0.75 -> 75%)
    expect(
      screen.getByText("ยกกระชับด้วยคลื่นพลังงาน (HIFU / Ultherapy / RF)")
    ).toBeInTheDocument();
    expect(screen.getByText("ความจำเป็นระดับ 75%")).toBeInTheDocument();

    // thread_lift (intensity 0.50 -> 50%)
    expect(
      screen.getByText("ร้อยไหมพยุงกรอบหน้า (Barbed Thread Lift)")
    ).toBeInTheDocument();
    expect(screen.getByText("ความจำเป็นระดับ 50%")).toBeInTheDocument();

    // surgical_facelift has intensity 0 -> should NOT be displayed
    expect(
      screen.queryByText("ศัลยกรรมยกกระชับดึงหน้า (Surgical Rhytidectomy)")
    ).toBeNull();

    // rhinoplasty is NOT a sagging procedure -> should NOT be displayed
    expect(screen.queryByText("ปรับแต่งทรงจมูก (Rhinoplasty)")).toBeNull();
  });

  it("displays preventive message when no sagging procedures are indicated", () => {
    render(<FacialSaggingCard sagging={mockSagging} recommendations={[]} />);
    expect(
      screen.getByText(/โครงสร้างใบหน้าและแนวกรามมีความกระชับในเกณฑ์ดีเยี่ยม ไม่พบข้อบ่งชี้ที่ต้องรับการยกกระชับ/i)
    ).toBeInTheDocument();
  });

  it("handles missing features gracefully", () => {
    const noFeatSagging: FacialSaggingResult = {
      ...mockSagging,
      features: undefined,
    };
    render(<FacialSaggingCard sagging={noFeatSagging} recommendations={[]} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBe(4);
  });
});

describe("ProcedureRecommendationCard translations for sagging procedures", () => {
  it("translates titles for all 3 sagging procedures", () => {
    expect(PROCEDURE_TITLES["skin_tightening"]).toBe(
      "ยกกระชับด้วยคลื่นพลังงาน (HIFU / Ultherapy / RF)"
    );
    expect(PROCEDURE_TITLES["thread_lift"]).toBe(
      "ร้อยไหมพยุงกรอบหน้า (Barbed Thread Lift)"
    );
    expect(PROCEDURE_TITLES["surgical_facelift"]).toBe(
      "ศัลยกรรมยกกระชับดึงหน้า (Surgical Rhytidectomy)"
    );
  });

  it("translates static rationale for sagging procedures into natural Thai", () => {
    const enText =
      "Facial skin and subcutaneous structures display high firmness; routine preventive skincare recommended without energy-based tightening.";
    const thText = translateRationale(enText);
    expect(thText).toContain("โครงสร้างผิวและความกระชับอยู่ในระดับดีเยี่ยม");
  });

  it("translates parameterized dynamic rationale for HIFU/Ultherapy", () => {
    const enText =
      "Moderate structural laxity (Tier 2, Laxity Score: 58.2%) is optimally indicated for High-Intensity Focused Ultrasound (HIFU/Ultherapy) or Monopolar RF (Thermage) to stimulate deep collagen remodeling and SMAS fascial contraction without surgery.";
    const thText = translateRationale(enText);
    expect(thText).toContain("ความหย่อนคล้อยระดับปานกลาง (Tier 2, คะแนนความหย่อนคล้อย: 58.2%)");
    expect(thText).toContain("SMAS");
  });

  it("translates parameterized dynamic rationale for thread lift", () => {
    const enText =
      "Mild-to-moderate descent of malar and mandibular soft tissue (Tier 2, Laxity: 58.2%) indicates absorbable barbed suspension threads (PDO/PLLA) for mechanical repositioning of descending jowl and perioral tissue vectors.";
    const thText = translateRationale(enText);
    expect(thText).toContain("การคล้อยตัวระดับเล็กน้อยถึงปานกลางของเนื้อเยื่อโหนกแก้มและแนวกราม (Tier 2, ความหย่อนคล้อย: 58.2%)");
    expect(thText).toContain("PDO/PLLA");
  });

  it("translates parameterized dynamic rationale for surgical facelift", () => {
    const enText =
      "Advanced morphological structural laxity (Tier 3, Laxity Score: 82.0%) warrants surgical SMAS or deep-plane rhytidectomy with platysmaplasty for definitive anatomical repositioning and redundant skin envelope excision.";
    const thText = translateRationale(enText);
    expect(thText).toContain("ความหย่อนคล้อยเชิงโครงสร้างระดับสูง (Tier 3, คะแนนความหย่อนคล้อย: 82.0%)");
    expect(thText).toContain("Deep-Plane");
  });

  it("handles null, undefined, and empty string safely", () => {
    expect(translateRationale(null)).toBe("");
    expect(translateRationale(undefined)).toBe("");
    expect(translateRationale("")).toBe("");
  });
});
