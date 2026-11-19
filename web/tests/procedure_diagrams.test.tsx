import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProcedureRecommendation } from "../src/api/schemas";
import {
  PROCEDURE_DIAGRAM_METADATA,
  ProcedureDiagramModal,
  ProcedureDiagramThumbnail,
  ProcedureSvgDiagram,
} from "../src/components/results/ProcedureDiagram";
import { ProcedureRecommendationCard } from "../src/components/results/ProcedureRecommendationCard";

describe("Procedure Aesthetic Line Art Diagrams & Modal Inspection", () => {
  describe("1. Clinical Metadata & Landmark Definitions", () => {
    const keyProcedures = [
      "rhinoplasty",
      "chin_augmentation",
      "botulinum_toxin_masseter",
      "lip_augmentation",
      "skin_tightening",
      "thread_lift",
      "botulinum_toxin_wrinkles",
      "hyaluronic_acid_filler_nasolabial",
    ];

    it.each(keyProcedures)("defines comprehensive clinical metadata for %s", (proc) => {
      const meta = PROCEDURE_DIAGRAM_METADATA[proc];
      expect(meta).toBeDefined();
      expect(meta?.titleTh).toBeTruthy();
      expect(meta?.titleEn).toBeTruthy();
      expect(meta?.anatomicalAreaTh).toBeTruthy();
      expect(meta?.targetLandmarks.length).toBeGreaterThanOrEqual(3);
      expect(meta?.correctionVectorsTh.length).toBeGreaterThanOrEqual(2);
      expect(meta?.clinicalSignificanceTh).toBeTruthy();
    });

    it("includes specific directional vectors for Rhinoplasty", () => {
      const meta = PROCEDURE_DIAGRAM_METADATA["rhinoplasty"];
      expect(meta).toBeDefined();
      expect(meta?.correctionVectorsTh.some((v) => v.includes("Tip Cephalic Rotation"))).toBe(true);
      expect(meta?.correctionVectorsTh.some((v) => v.includes("Tip Projection Vector"))).toBe(true);
      expect(meta?.correctionVectorsTh.some((v) => v.includes("Alar Base Reduction"))).toBe(true);
    });

    it("includes Ricketts' E-line projection vector for Chin Augmentation", () => {
      const meta = PROCEDURE_DIAGRAM_METADATA["chin_augmentation"];
      expect(meta).toBeDefined();
      expect(meta?.targetLandmarks).toContain("Ricketts' Aesthetic E-Line (P4)");
      expect(meta?.correctionVectorsTh.some((v) => v.includes("E-line"))).toBe(true);
    });

    it("includes SMAS tightening and jowl elevation vectors for Skin Tightening", () => {
      const meta = PROCEDURE_DIAGRAM_METADATA["skin_tightening"];
      expect(meta).toBeDefined();
      expect(meta?.targetLandmarks).toContain("SMAS Fascial Plane (4.5mm depth)");
      expect(meta?.correctionVectorsTh.some((v) => v.includes("Deep SMAS Contraction"))).toBe(true);
    });
  });

  describe("2. Pure SVG Vector Diagrams Rendering & Modes", () => {
    it("renders Rhinoplasty SVG with correct viewBox and correction vectors", () => {
      const { container } = render(<ProcedureSvgDiagram procedure="rhinoplasty" mode="vectors" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg?.getAttribute("viewBox")).toBe("0 0 360 220");
      expect(svg?.getAttribute("aria-label")).toContain("Rhinoplasty");

      // Marker definitions for arrowheads
      expect(container.querySelector("#vector-arrow-accent")).toBeInTheDocument();
      // Vectors in Rhinoplasty
      expect(container.textContent).toContain("Tip Rotation 95°-105°");
      expect(container.textContent).toContain("Projection (Goode 0.58)");
    });

    it("renders Chin Augmentation with Ricketts' E-line reference plane", () => {
      const { container } = render(<ProcedureSvgDiagram procedure="chin_augmentation" mode="vectors" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(container.textContent).toContain("Ricketts' E-Line");
      expect(container.textContent).toContain("Pogonion (Pog)");
      expect(container.textContent).toContain("+4 to 6mm Forward");
    });

    it("renders Masseter Botox with bilateral reduction vectors and safe injection zones", () => {
      const { container } = render(<ProcedureSvgDiagram procedure="botulinum_toxin_masseter" mode="vectors" />);
      expect(container.textContent).toContain("Masseter Muscle Reduction");
      expect(container.textContent).toContain("-3mm Inward");
      expect(container.textContent).toContain("Safe Injection Zone");
    });

    it("renders Lip Augmentation with Cupid's bow and Golden Ratio markers", () => {
      const { container } = render(<ProcedureSvgDiagram procedure="lip_augmentation" mode="vectors" />);
      expect(container.textContent).toContain("Cupid's Bow Definition");
      expect(container.textContent).toContain("Golden Ratio 1 : 1.6 Fullness");
    });

    it("renders Skin Tightening with SMAS 4.5mm vectors", () => {
      const { container } = render(<ProcedureSvgDiagram procedure="skin_tightening" mode="vectors" />);
      expect(container.textContent).toContain("SMAS 4.5mm Vector");
      expect(container.textContent).toContain("Jowl Soft-Tissue Lift");
    });

    it("renders Barbed Thread Lift with mechanical traction vectors and anchors", () => {
      const { container } = render(<ProcedureSvgDiagram procedure="thread_lift" mode="vectors" />);
      expect(container.textContent).toContain("Temporal Anchor");
      expect(container.textContent).toContain("Mechanical Traction");
      expect(container.textContent).toContain("Malar Repositioning");
    });

    it("renders Universal Fallback diagram for unknown or general procedures", () => {
      const { container } = render(<ProcedureSvgDiagram procedure="unknown_experimental_procedure" mode="vectors" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(container.textContent).toContain("Clinical Correction Vector");
    });

    it("supports before-only mode rendering pre-op dashed lines without correction vectors", () => {
      const { container } = render(<ProcedureSvgDiagram procedure="rhinoplasty" mode="before" />);
      // Before mode has dashed outline
      const dashedGroup = container.querySelector("g[stroke-dasharray='4 3']");
      expect(dashedGroup).toBeInTheDocument();
      // Should not show vectors in before-only mode
      expect(container.textContent).not.toContain("Tip Rotation 95°-105°");
    });

    it("supports after-only mode rendering target solid lines without pre-op dashed contour", () => {
      const { container } = render(<ProcedureSvgDiagram procedure="rhinoplasty" mode="after" />);
      // Should not have dashed pre-op group
      const dashedGroup = container.querySelector("g[stroke-dasharray='4 3']");
      expect(dashedGroup).not.toBeInTheDocument();
    });
  });

  describe("3. Inline Thumbnail Card Integration in ProcedureRecommendationCard", () => {
    it("embeds inline thumbnail for recommended procedure (intensity > 0)", () => {
      const recs: ProcedureRecommendation[] = [
        {
          procedure: "rhinoplasty",
          intensity: 0.85,
          rationale: "Nasal tip rotation is downward and alar width is wide.",
          triggering_metrics: ["P2_nasolabial_angle", "F6_alar_width"],
        },
      ];

      const { container } = render(<ProcedureRecommendationCard recommendations={recs} />);

      // Thumbnail card container
      expect(screen.getByText("แผนภาพจำลองเวกเตอร์การรักษา (Treatment Vector Diagram)")).toBeInTheDocument();
      expect(screen.getByText("Medical Line Art")).toBeInTheDocument();
      expect(screen.getByText("เส้นประ: ก่อนทำ (Before)")).toBeInTheDocument();
      expect(screen.getByText("สีน้ำเงิน: หลังปรับแก้ (After)")).toBeInTheDocument();
      expect(screen.getByText("ขยายดูเวกเตอร์")).toBeInTheDocument();

      // SVG thumbnail inside
      const svg = container.querySelector("svg[aria-label*='Rhinoplasty']");
      expect(svg).toBeInTheDocument();
    });

    it("does not display inline diagram thumbnail for unrecommended (0% intensity) procedure", () => {
      const recs: ProcedureRecommendation[] = [
        {
          procedure: "chin_augmentation",
          intensity: 0.0,
          rationale: "Chin projection within reference range.",
          triggering_metrics: [],
        },
      ];

      render(<ProcedureRecommendationCard recommendations={recs} />);
      expect(screen.queryByText("แผนภาพจำลองเวกเตอร์การรักษา (Treatment Vector Diagram)")).not.toBeInTheDocument();
    });
  });

  describe("4. Click-to-Expand Modal Dialog Interaction", () => {
    it("opens high-resolution modal when clicking thumbnail box", () => {
      const recs: ProcedureRecommendation[] = [
        {
          procedure: "chin_augmentation",
          intensity: 0.7,
          rationale: "Lower lip position relative to Ricketts' E-line indicates chin retrusion.",
          triggering_metrics: ["P4_eline_lower_lip"],
          specific_action: "เสริมคางยื่นรับสัดส่วน E-line",
          area: "chin",
          action_type: "injection",
        },
      ];

      render(<ProcedureRecommendationCard recommendations={recs} />);

      // Initially modal is not open
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // Click thumbnail expand button
      const expandBtn = screen.getByLabelText(/คลิกเพื่อดูภาพขยายและเวกเตอร์/);
      fireEvent.click(expandBtn);

      // Modal dialog is now opened
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();

      // Modal header details
      expect(screen.getAllByText("เสริมคางยื่นรับสัดส่วน E-line").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Chin Projection & Vertical Proportion Harmonization")).toBeInTheDocument();
      expect(screen.getByText("Clinical Vector Diagram")).toBeInTheDocument();

      // Mode switcher tabs
      expect(screen.getByRole("button", { name: "เวกเตอร์รวม (All Vectors)" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "ก่อนทำ (Before)" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "หลังปรับแก้ (After)" })).toBeInTheDocument();

      // Clinical vectors breakdown
      expect(
        screen.getByText("เวกเตอร์ทิศทางการรักษาทางการแพทย์ (Clinical Motion & Correction Vectors)")
      ).toBeInTheDocument();
      expect(screen.getByText(/ดันจุด Pogonion ไปด้านหน้ารับกับเส้นระนาบ E-line/)).toBeInTheDocument();

      // Anatomical landmarks
      expect(screen.getAllByText("Pogonion (Pog)").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Ricketts' Aesthetic E-Line (P4)")).toBeInTheDocument();

      // Close modal by clicking Close button
      const closeButton = screen.getByRole("button", { name: "ปิดหน้าต่าง (Close)" });
      fireEvent.click(closeButton);

      // Dialog is closed
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("allows switching view modes between All Vectors, Before, and After in modal", () => {
      const rec: ProcedureRecommendation = {
        procedure: "rhinoplasty",
        intensity: 0.8,
        rationale: "Tip is drooping.",
        triggering_metrics: ["P2_nasolabial_angle"],
      };

      render(
        <ProcedureDiagramModal
          open={true}
          onOpenChange={() => {}}
          recommendation={rec}
          defaultTitle="ปรับแต่งทรงจมูก (Rhinoplasty)"
        />
      );

      // Check mode buttons
      const beforeTab = screen.getByRole("button", { name: "ก่อนทำ (Before)" });
      const afterTab = screen.getByRole("button", { name: "หลังปรับแก้ (After)" });
      const allVectorsTab = screen.getByRole("button", { name: "เวกเตอร์รวม (All Vectors)" });

      // Click Before
      fireEvent.click(beforeTab);
      expect(screen.queryByText("Tip Rotation 95°-105°")).not.toBeInTheDocument();

      // Click After
      fireEvent.click(afterTab);
      expect(screen.queryByText("Tip Rotation 95°-105°")).not.toBeInTheDocument();

      // Click All Vectors
      fireEvent.click(allVectorsTab);
      expect(screen.getByText("Tip Rotation 95°-105°")).toBeInTheDocument();
    });

    it("opens modal via keyboard Enter on thumbnail", () => {
      const recs: ProcedureRecommendation[] = [
        {
          procedure: "botulinum_toxin_masseter",
          intensity: 0.65,
          rationale: "Strong masseter muscle hypertrophy.",
          triggering_metrics: ["gonial_angle"],
        },
      ];

      render(<ProcedureRecommendationCard recommendations={recs} />);
      const thumbnailBtn = screen.getByLabelText(/คลิกเพื่อดูภาพขยายและเวกเตอร์/);

      // Press Enter
      fireEvent.keyDown(thumbnailBtn, { key: "Enter", code: "Enter" });

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/ลดความหนาของมวลกล้ามเนื้อกราม/)).toBeInTheDocument();
    });
  });

  describe("5. Component Resilience & Standalone Thumbnail", () => {
    it("renders standalone thumbnail with custom expand callback", () => {
      const onExpand = vi.fn();
      render(
        <ProcedureDiagramThumbnail
          procedure="skin_tightening"
          title="ยกกระชับด้วยคลื่นพลังงาน"
          onExpand={onExpand}
        />
      );

      const expandLink = screen.getByText("ขยายดูเวกเตอร์");
      fireEvent.click(expandLink);
      expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it("returns null when modal is passed null recommendation", () => {
      const { container } = render(
        <ProcedureDiagramModal
          open={true}
          onOpenChange={() => {}}
          recommendation={null}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });
});
