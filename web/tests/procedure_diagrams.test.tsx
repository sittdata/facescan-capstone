import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProcedureRecommendation } from "../src/api/schemas";
import {
  PROCEDURE_ASSETS,
  PROCEDURE_DIAGRAM_METADATA,
  ProcedureDiagramModal,
  ProcedureDiagramThumbnail,
  ProcedureSvgDiagram,
  RhinoplastySvg,
} from "../src/components/results/ProcedureDiagram";
import { ProcedureRecommendationCard } from "../src/components/results/ProcedureRecommendationCard";

describe("Procedure 3D Aesthetic Educational Illustrations & Modal Inspection", () => {
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
      expect(meta?.correctionVectorsTh.some((v) => v.includes("เวกเตอร์หมุนยกปลายจมูก"))).toBe(true);
      expect(meta?.correctionVectorsTh.some((v) => v.includes("เวกเตอร์ความพุ่งของปลายจมูก"))).toBe(true);
      expect(meta?.correctionVectorsTh.some((v) => v.includes("เวกเตอร์รวบความกว้างปีกจมูก"))).toBe(true);
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
      expect(meta?.correctionVectorsTh.some((v) => v.includes("เวกเตอร์หดกระชับชั้น SMAS"))).toBe(true);
    });
  });

  describe("2. 3D Aesthetic Educational Illustrations & Image Dispatcher", () => {
    const keyProcedures = [
      "chin_augmentation",
      "rhinoplasty",
      "botulinum_toxin_masseter",
      "lip_augmentation",
      "hyaluronic_acid_filler_nasolabial",
      "skin_tightening",
      "thread_lift",
      "botulinum_toxin_wrinkles",
    ];

    it.each(keyProcedures)("defines 3D illustration asset paths for %s", (proc) => {
      const asset = PROCEDURE_ASSETS[proc];
      expect(asset).toBeDefined();
      expect(asset?.compare).toBe(`/procedures/${proc}_compare.webp`);
      expect(asset?.before).toBe(`/procedures/${proc}_before.webp`);
      expect(asset?.after).toBe(`/procedures/${proc}_after.webp`);
      expect(asset?.alt).toBeTruthy();
    });

    it("renders Rhinoplasty 3D illustration with compare image by default", () => {
      const { container } = render(<ProcedureSvgDiagram procedure="rhinoplasty" mode="compare" />);
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img?.getAttribute("src")).toBe("/procedures/rhinoplasty_compare.webp");
      expect(img?.getAttribute("alt")).toContain("ปรับแต่งทรงจมูก");
    });

    it("renders Chin Augmentation with 3D illustration", () => {
      const { container } = render(<ProcedureSvgDiagram procedure="chin_augmentation" mode="compare" />);
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img?.getAttribute("src")).toBe("/procedures/chin_augmentation_compare.webp");
      expect(img?.getAttribute("alt")).toContain("เสริมคาง");
    });

    it("renders Masseter Botox with 3D illustration", () => {
      const { container } = render(<ProcedureSvgDiagram procedure="botulinum_toxin_masseter" mode="compare" />);
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img?.getAttribute("src")).toBe("/procedures/botulinum_toxin_masseter_compare.webp");
      expect(img?.getAttribute("alt")).toContain("โบท็อกซ์ลดกราม");
    });

    it("renders Lip Augmentation with 3D illustration", () => {
      const { container } = render(<ProcedureSvgDiagram procedure="lip_augmentation" mode="compare" />);
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img?.getAttribute("src")).toBe("/procedures/lip_augmentation_compare.webp");
      expect(img?.getAttribute("alt")).toContain("ฟิลเลอร์ริมฝีปาก");
    });

    it("renders Skin Tightening with 3D illustration", () => {
      const { container } = render(<ProcedureSvgDiagram procedure="skin_tightening" mode="compare" />);
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img?.getAttribute("src")).toBe("/procedures/skin_tightening_compare.webp");
      expect(img?.getAttribute("alt")).toContain("ยกกระชับผิว");
    });

    it("renders Barbed Thread Lift with 3D illustration", () => {
      const { container } = render(<ProcedureSvgDiagram procedure="thread_lift" mode="compare" />);
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img?.getAttribute("src")).toBe("/procedures/thread_lift_compare.webp");
      expect(img?.getAttribute("alt")).toContain("ร้อยไหม");
    });

    it("renders Wrinkle Botox with 3D illustration", () => {
      const { container } = render(<ProcedureSvgDiagram procedure="botulinum_toxin_wrinkles" mode="compare" />);
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img?.getAttribute("src")).toBe("/procedures/botulinum_toxin_wrinkles_compare.webp");
      expect(img?.getAttribute("alt")).toContain("โบท็อกซ์ริ้วรอย");
    });

    it("renders Nasolabial Filler with 3D illustration", () => {
      const { container } = render(
        <ProcedureSvgDiagram procedure="hyaluronic_acid_filler_nasolabial" mode="compare" />
      );
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img?.getAttribute("src")).toBe("/procedures/hyaluronic_acid_filler_nasolabial_compare.webp");
      expect(img?.getAttribute("alt")).toContain("ฟิลเลอร์ร่องแก้ม");
    });

    it("supports before-only mode rendering pre-treatment structure image", () => {
      const { container } = render(<ProcedureSvgDiagram procedure="rhinoplasty" mode="before" />);
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img?.getAttribute("src")).toBe("/procedures/rhinoplasty_before.webp");
      expect(img?.getAttribute("alt")).toContain("ก่อนทำ");
    });

    it("supports after-only mode rendering target aesthetic image", () => {
      const { container } = render(<ProcedureSvgDiagram procedure="rhinoplasty" mode="after" />);
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img?.getAttribute("src")).toBe("/procedures/rhinoplasty_after.webp");
      expect(img?.getAttribute("alt")).toContain("ผลลัพธ์เป้าหมาย");
    });

    it("renders Universal Fallback diagram for unknown or general procedures without assets", () => {
      const { container } = render(
        <ProcedureSvgDiagram procedure="unknown_experimental_procedure" mode="compare" />
      );
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(container.textContent).toContain("Clinical Correction Vector");
    });

    it("allows rendering pure vector SVG when forceSvg is true", () => {
      const { container } = render(
        <ProcedureSvgDiagram procedure="rhinoplasty" mode="vectors" forceSvg={true} />
      );
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(container.textContent).toContain("Tip Rotation 95°-105°");
    });

    it("gracefully falls back to SVG diagram when image fails to load (onError)", () => {
      const { container } = render(
        <ProcedureSvgDiagram procedure="rhinoplasty" mode="compare" />
      );
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();

      // Trigger image load failure
      fireEvent.error(img!);

      // Should seamlessly fall back to RhinoplastySvg
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(container.querySelector("img")).not.toBeInTheDocument();
      expect(container.textContent).toContain("Tip Rotation 95°-105°");
    });

    it("uses uncropped portrait scaling for before and after modes, and wide scaling for compare mode", () => {
      const { container: cBefore } = render(
        <ProcedureSvgDiagram procedure="chin_augmentation" mode="before" />
      );
      const imgBefore = cBefore.querySelector("img");
      expect(imgBefore?.className).toContain("object-contain");
      expect(imgBefore?.className).toContain("w-auto");

      const { container: cCompare } = render(
        <ProcedureSvgDiagram procedure="chin_augmentation" mode="compare" />
      );
      const imgCompare = cCompare.querySelector("img");
      expect(imgCompare?.className).toContain("w-full");
    });

    it("renders individual RhinoplastySvg directly when requested", () => {
      const { container } = render(<RhinoplastySvg mode="vectors" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg?.getAttribute("viewBox")).toBe("0 0 360 220");
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

      // Thumbnail card container & Educational tag
      expect(screen.getByText("ภาพตัวอย่างหัตถการ")).toBeInTheDocument();
      expect(screen.getByText("ก่อนทำ")).toBeInTheDocument();
      expect(screen.getByText("หลังปรับแก้")).toBeInTheDocument();
      expect(screen.getByText("ดูภาพขยาย")).toBeInTheDocument();

      // 3D image thumbnail inside
      const img = container.querySelector("img[src*='rhinoplasty_compare.webp']");
      expect(img).toBeInTheDocument();
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
      expect(screen.queryByText("ภาพตัวอย่างหัตถการ")).not.toBeInTheDocument();
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
      const expandBtn = screen.getByLabelText(/คลิกเพื่อดูภาพขยายและตัวอย่างหัตถการ/);
      fireEvent.click(expandBtn);

      // Modal dialog is now opened
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();

      // Modal header details
      expect(screen.getAllByText("เสริมคางยื่นรับสัดส่วน E-line").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Chin Projection & Vertical Proportion Harmonization")).toBeInTheDocument();
      expect(screen.getAllByText("ภาพตัวอย่างหัตถการ").length).toBeGreaterThanOrEqual(1);

      // Mode switcher tabs
      expect(screen.getByRole("button", { name: "ภาพเปรียบเทียบ" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "ก่อนทำ" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "ผลลัพธ์เป้าหมาย" })).toBeInTheDocument();

      // 3D image displayed inside modal
      const modalImg = dialog.querySelector("img[src*='chin_augmentation_compare.webp']");
      expect(modalImg).toBeInTheDocument();

      // Clinical vectors breakdown
      expect(
        screen.getByText("เวกเตอร์ทิศทางการรักษาทางการแพทย์")
      ).toBeInTheDocument();
      expect(screen.getByText(/ดันจุด Pogonion ไปด้านหน้ารับกับเส้นระนาบ E-line/)).toBeInTheDocument();

      // Anatomical landmarks
      expect(screen.getAllByText("Pogonion (Pog)").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Ricketts' Aesthetic E-Line (P4)")).toBeInTheDocument();

      // Close modal by clicking Close button
      const closeButton = screen.getByRole("button", { name: "ปิดหน้าต่าง" });
      fireEvent.click(closeButton);

      // Dialog is closed
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("allows switching view modes between Before vs After, Before, and After in modal", () => {
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
          defaultTitle="ปรับแต่งทรงจมูก"
        />
      );

      // Check mode buttons
      const compareTab = screen.getByRole("button", { name: "ภาพเปรียบเทียบ" });
      const beforeTab = screen.getByRole("button", { name: "ก่อนทำ" });
      const afterTab = screen.getByRole("button", { name: "ผลลัพธ์เป้าหมาย" });

      // Click Before
      fireEvent.click(beforeTab);
      const beforeImg = screen.getByRole("img");
      expect(beforeImg.getAttribute("src")).toBe("/procedures/rhinoplasty_before.webp");

      // Click After
      fireEvent.click(afterTab);
      const afterImg = screen.getByRole("img");
      expect(afterImg.getAttribute("src")).toBe("/procedures/rhinoplasty_after.webp");

      // Click Compare
      fireEvent.click(compareTab);
      const compareImg = screen.getByRole("img");
      expect(compareImg.getAttribute("src")).toBe("/procedures/rhinoplasty_compare.webp");
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
      const thumbnailBtn = screen.getByLabelText(/คลิกเพื่อดูภาพขยายและตัวอย่างหัตถการ/);

      // Press Enter
      fireEvent.keyDown(thumbnailBtn, { key: "Enter", code: "Enter" });

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/ลดความหนาของมวลกล้ามเนื้อกราม/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "ภาพเปรียบเทียบ" })).toBeInTheDocument();
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

      const expandLink = screen.getByText("ดูภาพขยาย");
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
