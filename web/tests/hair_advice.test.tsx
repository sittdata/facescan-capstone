import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { generateHairAdvice } from "../src/extensions/hairAdvice";
import { HairAdviceCard } from "../src/components/results/HairAdviceCard";
import type { Metric, Result } from "../src/api/schemas";

function createDummyMetric(value: number): Metric {
  return {
    name: "Metric",
    short: "M",
    description: "Metric description",
    area: "thirds",
    role: "primary",
    value,
    unit: "ratio",
    value_text: String(value),
    status: "within",
    status_text: "Normal",
    reference: null,
    confidence: "high",
    confidence_text: "High",
    flags: [],
  };
}

function createDummyResult(metrics: Record<string, number> = {}): Result {
  const metricRecord: Record<string, Metric> = {
    F10_golden_ratio: createDummyMetric(1.4),
    F1_upper_third: createDummyMetric(0.33),
    F1_lower_third: createDummyMetric(0.33),
    F2_lower_face_ratio: createDummyMetric(0.5),
  };
  for (const [k, v] of Object.entries(metrics)) {
    metricRecord[k] = createDummyMetric(v);
  }

  return {
    schema_version: "1.0",
    core_version: "1.0",
    view: "frontal",
    status: "ok",
    locale: "th",
    warnings: [],
    disclaimer: "Disclaimer",
    side_note: "",
    reference_note: "",
    image: { width: 1000, height: 1000 },
    frames: { count: 1, reference_frame: 0, reference_sha256: "abc" },
    adjustable_points: [],
    landmarks: {
      menton: { x: 500, y: 900, sd_px: null },
      trichion: { x: 500, y: 200, sd_px: null },
      bizygomatic_left: { x: 750, y: 500, sd_px: null },
      bizygomatic_right: { x: 250, y: 500, sd_px: null },
    },
    metrics: metricRecord,
  } as unknown as Result;
}

describe("Hair Advice Engine", () => {
  it("generates balanced hair advice profile for standard proportions", () => {
    const result = createDummyResult();
    const advice = generateHairAdvice(result, "female");

    expect(advice.features.vertical.type).toBe("balanced");
    expect(advice.features.forehead.type).toBe("balanced");
    expect(advice.recommendations.length).toBeGreaterThanOrEqual(3);
    expect(advice.avoidStyles.length).toBe(2);
    expect(advice.eyewear.shapes.length).toBeGreaterThan(0);
  });

  it("recommends side volume and curtain bangs for elongated profile", () => {
    const result = createDummyResult({
      F10_golden_ratio: 1.55,
      F1_upper_third: 0.38,
    });
    const advice = generateHairAdvice(result, "female");

    expect(advice.features.vertical.type).toBe("elongated");
    expect(advice.features.forehead.type).toBe("high");
    expect(advice.opticalPrinciples.partingTechnique).toContain("หน้าม้า");
    expect(advice.opticalPrinciples.volumePlacement).toContain("ข้าง");
  });

  it("switches haircut recommendations when toggling to male gender", () => {
    const result = createDummyResult({
      F10_golden_ratio: 1.22,
    });
    const maleAdvice = generateHairAdvice(result, "male");

    expect(maleAdvice.gender).toBe("male");
    expect(maleAdvice.features.vertical.type).toBe("compact");
    // Male compact recommendations should feature quiff / fade / pompadour
    const allNames = maleAdvice.recommendations.map((r) => r.name).join(" ");
    expect(allNames).toMatch(/ปอมปาดัวร์|ควิฟ|เฟด|ไอวี่ลีก/);
  });

  it("recommends chin_goatee beard for men with short or tapered chin", () => {
    const result = createDummyResult({
      F10_golden_ratio: 1.35,
      F2_lower_face_ratio: 0.42, // short/tapered chin
    });
    const advice = generateHairAdvice(result, "male");

    const beardRec = advice.recommendations.find((r) => r.category === "beard");
    expect(beardRec).toBeDefined();
    expect(beardRec?.key).toBe("chin_goatee");
    expect(beardRec?.name).toContain("เคราแพะ");
    expect(beardRec?.image).toBe("/hairstyles/chin_goatee.webp");
    expect(beardRec?.barberInstructions).toBeTruthy();
  });

  it("recommends stubble_jawline beard for men with angular or prominent jawline", () => {
    const result = createDummyResult({
      F10_golden_ratio: 1.35,
      F1_lower_third: 0.38, // prominent lower third / angular jaw
    });
    const advice = generateHairAdvice(result, "male");

    const beardRec = advice.recommendations.find((r) => r.category === "beard");
    expect(beardRec).toBeDefined();
    expect(beardRec?.key).toBe("stubble_jawline");
    expect(beardRec?.name).toContain("เคราตอสั้น");
    expect(beardRec?.image).toBe("/hairstyles/stubble_jawline.webp");
    expect(beardRec?.barberInstructions).toBeTruthy();
  });

  it("assigns valid image paths and barber instructions for all recommendations", () => {
    const femaleAdvice = generateHairAdvice(createDummyResult(), "female");
    for (const rec of femaleAdvice.recommendations) {
      expect(rec.image).toMatch(/^\/hairstyles\/.+\.webp$/);
      expect(rec.barberInstructions.length).toBeGreaterThan(10);
      expect(rec.category).toBe("hair");
    }

    const maleAdvice = generateHairAdvice(createDummyResult(), "male");
    for (const rec of maleAdvice.recommendations) {
      expect(rec.image).toMatch(/^\/hairstyles\/.+\.webp$/);
      expect(rec.barberInstructions.length).toBeGreaterThan(10);
      expect(["hair", "beard"]).toContain(rec.category);
    }
  });
});

describe("HairAdviceCard UI Component", () => {
  it("renders card properly without manual gender toggle buttons", () => {
    const result = createDummyResult();
    render(<HairAdviceCard result={result} initialSex="female" />);

    // Header title
    expect(screen.getByText("คำแนะนำทรงผมและกรอบแว่นตามสัดส่วนโครงหน้า")).toBeDefined();

    // Verify manual gender selector buttons are NOT present in the DOM
    expect(screen.queryByRole("button", { name: /👩 ผู้หญิง/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /👨 ผู้ชาย/i })).toBeNull();

    // Verify female hairstyle is rendered automatically from initialSex
    expect(screen.getByText("ทรงผมที่แนะนำสำหรับโครงหน้าของคุณ")).toBeDefined();
    expect(screen.getAllByText(/ลอนคลื่นธรรมชาติ|บ็อบระดับกระดูกไหปลาร้า/).length).toBeGreaterThan(0);
  });

  it("renders male hairstyles when initialSex is male without toggle buttons", () => {
    const result = createDummyResult({ F10_golden_ratio: 1.22 });
    render(<HairAdviceCard result={result} initialSex="male" />);

    // Verify no toggle buttons
    expect(screen.queryByRole("button", { name: /👩 ผู้หญิง/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /👨 ผู้ชาย/i })).toBeNull();

    // Male style should be rendered directly
    expect(screen.getAllByText(/ปอมปาดัวร์และควิฟยกสูง|อันเดอร์คัทหรือเฟดสูง/).length).toBeGreaterThan(0);
    // Facial hair grooming card badge should be rendered
    expect(screen.getAllByText("สไตล์หนวดเคราเสริมคาง").length).toBeGreaterThan(0);
  });
});
