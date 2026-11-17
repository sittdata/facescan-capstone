import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CephalometricResult, ProcedureRecommendation } from "../src/api/schemas";
import { CephalometricCard } from "../src/components/results/CephalometricCard";

describe("CephalometricCard", () => {
  const mockClassI: CephalometricResult = {
    skeletal_class: 0,
    skeletal_class_name: "Class_I",
    confidence: 0.95,
    probabilities: { Class_I: 0.95, Class_II: 0.03, Class_III: 0.02 },
    severity: "Normal",
    primary_etiology: "balanced_orthognathic",
    vertical_pattern: "Normodivergent",
    surgical_indication: "none",
    label_th: "สมดุลกระดูกขากรรไกรปกติ (Class I)",
    label_en: "Balanced Orthognathic (Class I)",
    description_th: "ความสัมพันธ์ของขากรรไกรบนและล่างอยู่ในเกณฑ์สมดุล",
    description_en: "Harmonious sagittal relationship between jaws",
    features: {
      sna_angle: 82.0,
      snb_angle: 80.0,
      anb_angle: 2.0,
      wits_appraisal_mm: -0.5,
      fma_angle: 25.0,
    },
    inference_time_ms: 0.08,
  };

  const mockClassII: CephalometricResult = {
    skeletal_class: 1,
    skeletal_class_name: "Class_II",
    confidence: 0.98,
    probabilities: { Class_I: 0.01, Class_II: 0.98, Class_III: 0.01 },
    severity: "Severe",
    primary_etiology: "mandibular_retrusion",
    vertical_pattern: "Hyperdivergent",
    surgical_indication: "orthognathic_strongly_recommended",
    label_th: "ขากรรไกรล่างถอย / คางถอย (Class II)",
    label_en: "Mandibular Retrusion (Class II)",
    description_th: "ขากรรไกรล่างอยู่ถอยไปทางด้านหลังเมื่อเทียบกับขากรรไกรบน",
    description_en: "Severe mandibular retrognathia",
    features: {
      sna_angle: 83.5,
      snb_angle: 73.5,
      anb_angle: 10.0,
      wits_appraisal_mm: 7.5,
      fma_angle: 32.0,
    },
    inference_time_ms: 0.09,
  };

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
      wits_appraisal_mm: -8.5,
      fma_angle: 26.0,
    },
    inference_time_ms: 0.09,
  };

  const mockRecs: ProcedureRecommendation[] = [
    {
      procedure: "orthognathic_surgery",
      intensity: 0.95,
      rationale:
        "Severe Skeletal Class II mandibular deficiency with high sagittal discrepancy. Corrective orthognathic surgery is strongly recommended.",
      triggering_metrics: ["skeletal_class_ii", "anb_angle"],
    },
    {
      procedure: "chin_augmentation",
      intensity: 0.0,
      rationale:
        "Chin augmentation (filler or implant) is contraindicated due to Skeletal Class III prognathism.",
      triggering_metrics: ["cephalometric_class_iii"],
    },
  ];

  it("returns null when cephalometric is null or undefined", () => {
    const { container: c1 } = render(<CephalometricCard cephalometric={null} />);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(<CephalometricCard cephalometric={undefined} />);
    expect(c2.firstChild).toBeNull();
  });

  it("renders Class I normal orthognathic results correctly", () => {
    render(<CephalometricCard cephalometric={mockClassI} />);

    expect(
      screen.getByText(/การวิเคราะห์โครงสร้างกระดูกขากรรไกร/)
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Class I/).length).toBeGreaterThan(0);
    expect(screen.getByText(/ไม่ต้องผ่าตัด/)).toBeInTheDocument();
    expect(screen.getByText("2.0°")).toBeInTheDocument();
    expect(screen.getByText("82.0°")).toBeInTheDocument();
  });

  it("renders Class II severe retrognathia and orthognathic recommendation", () => {
    render(
      <CephalometricCard cephalometric={mockClassII} recommendations={mockRecs} />
    );

    expect(screen.getAllByText(/Class II/).length).toBeGreaterThan(0);
    expect(screen.getByText(/แนะนำผ่าตัดขากรรไกรอย่างยิ่ง/)).toBeInTheDocument();
    expect(screen.getByText(/ศัลยกรรมเลื่อนขากรรไกร/)).toBeInTheDocument();
    expect(screen.getByText(/95%/)).toBeInTheDocument();
  });

  it("renders Class III prognathism and chin filler contraindication", () => {
    render(
      <CephalometricCard cephalometric={mockClassIII} recommendations={mockRecs} />
    );

    expect(screen.getAllByText(/Class III/).length).toBeGreaterThan(0);
    expect(screen.getByText(/ข้อห้ามทางการแพทย์/)).toBeInTheDocument();
    expect(
      screen.getByText(/contraindicated due to Skeletal Class III prognathism/)
    ).toBeInTheDocument();
  });
});
