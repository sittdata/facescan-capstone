import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { InferredDemographics, FacialSaggingResult } from "../src/api/schemas";
import { DemographicsCard } from "../src/components/results/DemographicsCard";
import {
  getSkinVitalityProfile,
  calculateSpectrumPercentage,
  getCollagenPhase,
  getAnatomicalSexStandard,
} from "../src/utils/skinAgeProfile";

describe("DemographicsCard & Skin Vitality Index", () => {
  const mockFemaleYoung: InferredDemographics = {
    predicted_sex: "female",
    sex_confidence: 0.94,
    predicted_age: 22.4,
    age_sd: 2.1,
  };

  const mockMalePreventive: InferredDemographics = {
    predicted_sex: "male",
    sex_confidence: 0.88,
    predicted_age: 29.5,
    age_sd: 2.5,
  };

  const mockStructural: InferredDemographics = {
    predicted_sex: "female",
    sex_confidence: 0.96,
    predicted_age: 39.0,
    // age_sd intentionally omitted to test fallback
  };

  const mockRestorative: InferredDemographics = {
    predicted_sex: "male",
    sex_confidence: 0.91,
    predicted_age: 52.0,
    age_sd: 3.2,
  };

  const createMockSagging = (tier: 1 | 2 | 3): FacialSaggingResult => ({
    tier,
    tier_name: tier === 1 ? "Firm" : tier === 2 ? "Moderate" : "Advanced",
    laxity_score: tier === 1 ? 15 : tier === 2 ? 45 : 78,
    confidence: 0.92,
    probabilities: { tier1: 0.8, tier2: 0.15, tier3: 0.05 },
    rating_th: tier === 1 ? "ความกระชับสูง" : tier === 2 ? "หย่อนคล้อยปานกลาง" : "หย่อนคล้อยชัดเจน",
    rating_en: tier === 1 ? "Firm" : tier === 2 ? "Moderate" : "Advanced",
    description_th: "การประเมินความหย่อนคล้อยของเนื้อเยื่อ",
    description_en: "Tissue laxity assessment",
  });

  it("renders null when demographics is undefined or null", () => {
    const { container: c1 } = render(<DemographicsCard demographics={null} />);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(<DemographicsCard demographics={undefined} />);
    expect(c2.firstChild).toBeNull();
  });

  describe("Phase 1: Peak Collagen (< 25 yrs)", () => {
    it("renders clinical title, youthful metrics, and peak collagen phase info", () => {
      render(<DemographicsCard demographics={mockFemaleYoung} />);

      // Title & Biometrics badge
      expect(
        screen.getByText("ประเมินอายุสภาพผิวและความอ่อนเยาว์")
      ).toBeInTheDocument();
      expect(screen.getByText("ชีวมิติผิวพรรณ")).toBeInTheDocument();

      // Estimated age & range
      const ageEl = screen.getByTestId("estimated-skin-age");
      expect(ageEl).toHaveTextContent("22.4");
      const rangeEl = screen.getByTestId("age-range-text");
      expect(rangeEl).toHaveTextContent("20 - 25 ปี");

      // Formatted age_sd with proper spacing
      expect(screen.getByText(/(±2.1 ปี)/)).toBeInTheDocument();

      // Phase details
      expect(screen.getByTestId("collagen-phase-name")).toHaveTextContent(
        "Phase 1: Peak Collagen Phase"
      );
      expect(screen.getByText("ระยะความสมบูรณ์คอลลาเจนสูงสุด")).toBeInTheDocument();
      expect(
        screen.getByText(/ชั้นคอลลาเจนและอิลาสตินหนาแน่นเต็มที่/i)
      ).toBeInTheDocument();
    });
  });

  describe("Phase 2: Preventive Pre-aging (25 - 34 yrs)", () => {
    it("renders preventive pre-aging phase info and status tag", () => {
      render(<DemographicsCard demographics={mockMalePreventive} />);

      expect(screen.getByTestId("estimated-skin-age")).toHaveTextContent("29.5");
      expect(screen.getByTestId("age-range-text")).toHaveTextContent("27 - 32 ปี");

      expect(screen.getByTestId("collagen-phase-name")).toHaveTextContent(
        "Phase 2: Preventive Pre-aging Phase"
      );
      expect(screen.getByText("ระยะเริ่มชะลอวัยเชิงป้องกัน")).toBeInTheDocument();
      expect(
        screen.getByText(/การสร้างคอลลาเจนเริ่มลดลงเฉลี่ยปีละ ~1%/i)
      ).toBeInTheDocument();
    });
  });

  describe("Phase 3: Structural Maturation (35 - 44 yrs)", () => {
    it("renders structural maturation phase and handles omitted age_sd smoothly", () => {
      render(<DemographicsCard demographics={mockStructural} />);

      expect(screen.getByTestId("estimated-skin-age")).toHaveTextContent("39.0");
      // Fallback ±2 calculation
      expect(screen.getByTestId("age-range-text")).toHaveTextContent("37 - 41 ปี");

      expect(screen.getByTestId("collagen-phase-name")).toHaveTextContent(
        "Phase 3: Structural Maturation Phase"
      );
      expect(screen.getByText("ระยะการเปลี่ยนแปลงเชิงโครงสร้าง")).toBeInTheDocument();
      expect(
        screen.getByText(/ชั้นไขมันใต้ผิว \(Fat Pads\) เริ่มฝ่อตัว/i)
      ).toBeInTheDocument();
    });
  });

  describe("Phase 4: Deep Restorative (45+ yrs)", () => {
    it("renders deep restorative phase and mature facial standard", () => {
      render(<DemographicsCard demographics={mockRestorative} />);

      expect(screen.getByTestId("estimated-skin-age")).toHaveTextContent("52.0");
      expect(screen.getByTestId("age-range-text")).toHaveTextContent("49 - 55 ปี");

      expect(screen.getByTestId("collagen-phase-name")).toHaveTextContent(
        "Phase 4: Deep Restorative Phase"
      );
      expect(screen.getByText("ระยะฟื้นฟูโครงสร้างเชิงลึก")).toBeInTheDocument();
      expect(
        screen.getByText(/โครงสร้างผิวชั้นลึก \(SMAS\) และกระดูกเบ้าตา\/แนวกรามเริ่มทรุดตัว/i)
      ).toBeInTheDocument();
    });
  });

  describe("Facial Firmness & Sagging Correlation", () => {
    it("correlates with Tier 1 Firm tissue without duplicate tier badge", () => {
      render(
        <DemographicsCard
          demographics={mockFemaleYoung}
          sagging={createMockSagging(1)}
        />
      );

      const statusTag = screen.getByTestId("vitality-status-tag");
      expect(statusTag).toHaveTextContent("อ่อนเยาว์สมวัย");
      // Duplicate firmness badge removed from DemographicsCard to avoid duplicating FacialSaggingCard
      expect(screen.queryByText(/Tier 1/i)).toBeNull();
      expect(
        screen.getByText(/โครงสร้างเนื้อเยื่อและผิวพรรณมีความกระชับสูง/i)
      ).toBeInTheDocument();
    });

    it("correlates with Tier 2 Moderate laxity without duplicate tier badge", () => {
      render(
        <DemographicsCard
          demographics={mockMalePreventive}
          sagging={createMockSagging(2)}
        />
      );

      const statusTag = screen.getByTestId("vitality-status-tag");
      expect(statusTag).toHaveTextContent("เริ่มหย่อนคล้อยตามวัย");
      expect(screen.queryByText(/Tier 2/i)).toBeNull();
      expect(
        screen.getByText(/เนื้อเยื่อเริ่มคลายตัวระดับปานกลางตามวัฏจักรคอลลาเจน/i)
      ).toBeInTheDocument();
    });

    it("correlates with Tier 3 Advanced laxity without duplicate tier badge", () => {
      render(
        <DemographicsCard
          demographics={mockRestorative}
          sagging={createMockSagging(3)}
        />
      );

      const statusTag = screen.getByTestId("vitality-status-tag");
      expect(statusTag).toHaveTextContent("ต้องการการฟื้นฟูโครงสร้าง");
      expect(screen.queryByText(/Tier 3/i)).toBeNull();
      expect(
        screen.getByText(/เนื้อเยื่อและผิวชั้นลึกมีความหย่อนคล้อยชัดเจน/i)
      ).toBeInTheDocument();
    });

    it("handles sagging object with tier_name fallback when tier is missing", () => {
      const saggingWithoutTierNumber = {
        tier_name: "Moderate" as const,
        laxity_score: 42,
        confidence: 0.9,
        probabilities: {},
        rating_th: "หย่อนคล้อยปานกลาง",
        rating_en: "Moderate",
        description_th: "เนื้อเยื่อเริ่มคลายตัว",
        description_en: "Tissue laxity",
      } as unknown as FacialSaggingResult;

      render(
        <DemographicsCard
          demographics={mockMalePreventive}
          sagging={saggingWithoutTierNumber}
        />
      );

      const statusTag = screen.getByTestId("vitality-status-tag");
      expect(statusTag).toHaveTextContent("เริ่มหย่อนคล้อยตามวัย");
      expect(screen.queryByText(/Tier 2/i)).toBeNull();
      expect(
        screen.getByText(/เนื้อเยื่อเริ่มคลายตัวระดับปานกลางตามวัฏจักรคอลลาเจน/i)
      ).toBeInTheDocument();
    });

    it("correctly evaluates cross-age sagging scenarios", () => {
      // 1. Young face (<25) with premature laxity (Tier 2)
      const { unmount: u1 } = render(
        <DemographicsCard
          demographics={mockFemaleYoung}
          sagging={createMockSagging(2)}
        />
      );
      expect(screen.getByTestId("vitality-status-tag")).toHaveTextContent(
        "เริ่มหย่อนคล้อยก่อนวัย"
      );
      u1();

      // 2. Senior face (45+) with remarkable firm skin (Tier 1)
      const { unmount: u2 } = render(
        <DemographicsCard
          demographics={mockRestorative}
          sagging={createMockSagging(1)}
        />
      );
      expect(screen.getByTestId("vitality-status-tag")).toHaveTextContent(
        "ผิวพรรณกระชับกว่าวัย"
      );
      u2();

      // 3. Mature face (35-44) with preserved firmness (Tier 1)
      const { unmount: u3 } = render(
        <DemographicsCard
          demographics={mockStructural}
          sagging={createMockSagging(1)}
        />
      );
      expect(screen.getByTestId("vitality-status-tag")).toHaveTextContent(
        "ผิวกระชับกว่าเกณฑ์วัย"
      );
      u3();
    });
  });

  describe("Anatomical Sex Standard Edge Cases", () => {
    it("calculates confidence bounds safely", () => {
      const sexStd = getAnatomicalSexStandard("female", 1.5);
      expect(sexStd.confidencePercent).toBe(100);

      const sexStdLow = getAnatomicalSexStandard("male", -0.2);
      expect(sexStdLow.confidencePercent).toBe(0);
    });
  });

  describe("Typography & Precision Formatting", () => {
    it("formats unrounded floating-point age_sd to 1 decimal place with spacing", () => {
      const demoWithLongFloatSd: InferredDemographics = {
        predicted_sex: "female",
        sex_confidence: 0.95,
        predicted_age: 26.35,
        age_sd: 2.481239,
      };

      render(<DemographicsCard demographics={demoWithLongFloatSd} />);

      expect(screen.getByTestId("estimated-skin-age")).toHaveTextContent("26.4");
      expect(screen.getByText(/(±2.5 ปี)/)).toBeInTheDocument();
      expect(screen.getByTestId("age-range-text")).toHaveTextContent("24 - 29 ปี");
    });

    it("prevents identical age range span when variance is very small", () => {
      const profile = getSkinVitalityProfile(20.0, 0.1);
      expect(profile.ageRangeText).toBe("20 - 21 ปี");
    });
  });

  describe("Spectrum Positioning & Overflow Guardrails", () => {
    it("applies CSS clamp to keep marker pin inside container bounds on mobile viewports", () => {
      render(<DemographicsCard demographics={mockFemaleYoung} />);

      const marker = screen.getByTestId("spectrum-marker");
      expect(marker.style.left).toContain("clamp(2rem,");
    });

    it("calculates accurate, continuous spectrum position percentages from 0% to 100%", () => {
      expect(calculateSpectrumPercentage(15)).toBe(0);
      expect(calculateSpectrumPercentage(18)).toBe(0);
      expect(calculateSpectrumPercentage(21.5)).toBe(12.5);
      expect(calculateSpectrumPercentage(25)).toBe(25);
      expect(calculateSpectrumPercentage(30)).toBe(37.5);
      expect(calculateSpectrumPercentage(35)).toBe(50);
      expect(calculateSpectrumPercentage(40)).toBe(62.5);
      expect(calculateSpectrumPercentage(45)).toBe(75);
      expect(calculateSpectrumPercentage(55)).toBe(87.5);
      expect(calculateSpectrumPercentage(65)).toBe(100);
      expect(calculateSpectrumPercentage(80)).toBe(100);
      expect(calculateSpectrumPercentage(NaN)).toBe(50);
    });

    it("correctly boundaries collagen phases", () => {
      expect(getCollagenPhase(18).id).toBe("peak_collagen");
      expect(getCollagenPhase(24.9).id).toBe("peak_collagen");
      expect(getCollagenPhase(25.0).id).toBe("preventive_preaging");
      expect(getCollagenPhase(34.9).id).toBe("preventive_preaging");
      expect(getCollagenPhase(35.0).id).toBe("structural_maturation");
      expect(getCollagenPhase(44.9).id).toBe("structural_maturation");
      expect(getCollagenPhase(45.0).id).toBe("deep_restorative");
      expect(getCollagenPhase(70).id).toBe("deep_restorative");
    });

    it("clamps safeAge and confidence", () => {
      const profile = getSkinVitalityProfile(-5, 0);
      expect(profile.estimatedAge).toBe(1);

      const sexStd = getAnatomicalSexStandard("female", 1.5);
      expect(sexStd.confidencePercent).toBe(100);

      const sexStdLow = getAnatomicalSexStandard("male", -0.2);
      expect(sexStdLow.confidencePercent).toBe(0);
    });
  });
});
