import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Metric, Result } from "../src/api/schemas";
import { HairAdviceCard } from "../src/components/results/HairAdviceCard";
import {
  HAIR_DIAGRAM_METADATA,
  HairDiagramModal,
  HairDiagramThumbnail,
  HairSvgDiagram,
  getHairMetadata,
  type CoreHairKey,
} from "../src/components/results/HairDiagram";

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

describe("Hairstyle Optical Balancing Diagrams & Modal Inspection", () => {
  describe("1. Metadata & Definitions", () => {
    const coreKeys: CoreHairKey[] = [
      "long_layers",
      "curtain_bangs",
      "collarbone_lob",
      "soft_waves",
      "slick_back",
      "comma_hair",
      "modern_crew",
      "pompadour_quiff",
      "french_crop",
    ];

    it.each(coreKeys)("defines comprehensive metadata for %s", (key) => {
      const meta = HAIR_DIAGRAM_METADATA[key];
      expect(meta).toBeDefined();
      expect(meta?.titleTh).toBeTruthy();
      expect(meta?.titleEn).toBeTruthy();
      expect(meta?.balancingRoleTh).toBeTruthy();
      expect(meta?.flowVectorsTh.length).toBeGreaterThanOrEqual(2);
      expect(meta?.targetAnatomyTh.length).toBeGreaterThanOrEqual(2);
      expect(meta?.stylingTipsTh).toBeTruthy();
    });

    it("matches metadata using getHairMetadata for direct and fuzzy matches", () => {
      // Direct key
      const direct = getHairMetadata("comma_hair");
      expect(direct.titleEn).toContain("Comma");

      // Fuzzy keyword fallback
      const fuzzyLayer = getHairMetadata("custom_face_framing_layers");
      expect(fuzzyLayer.titleEn).toContain("Layers");

      const fuzzyCrop = getHairMetadata("unknown", "ทรงครอปสั้น");
      expect(fuzzyCrop.titleEn).toContain("French Crop");

      // Extended keywords: two-block and undercut
      const twoBlock = getHairMetadata("two_block");
      expect(twoBlock.titleEn).toContain("Comma");

      const undercut = getHairMetadata(null, "อันเดอร์คัทเปิดข้าง");
      expect(undercut.titleEn).toContain("Crew");

      // Safe against undefined / null keys
      const safeUndefined = getHairMetadata(undefined as any);
      expect(safeUndefined.titleTh).toBeTruthy();

      const safeNull = getHairMetadata(null as any);
      expect(safeNull.titleTh).toBeTruthy();

      // Complete unknown returns sound default
      const unknown = getHairMetadata("completely_unknown_xyz");
      expect(unknown.titleTh).toBeTruthy();
      expect(unknown.flowVectorsTh.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("2. Pure SVG Diagram Component (HairSvgDiagram)", () => {
    const coreKeys: CoreHairKey[] = [
      "long_layers",
      "curtain_bangs",
      "collarbone_lob",
      "soft_waves",
      "slick_back",
      "comma_hair",
      "modern_crew",
      "pompadour_quiff",
      "french_crop",
    ];

    it.each(coreKeys)("renders SVG diagram properly for %s in vectors mode", (key) => {
      const { container } = render(<HairSvgDiagram styleKey={key} mode="vectors" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg?.getAttribute("role")).toBe("img");
      expect(svg?.getAttribute("aria-label")).toContain(key);

      // SvgDefs should be present
      expect(container.querySelector("#hair-vector-arrow-accent")).toBeInTheDocument();
    });

    it("renders in 'before' mode with cranium baseline and no hairstyle markers", () => {
      const { container } = render(<HairSvgDiagram styleKey="long_layers" mode="before" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      // In before mode, vector lines with markerEnd are not rendered
      const markerLines = container.querySelectorAll("[marker-end]");
      expect(markerLines.length).toBe(0);
    });

    it("renders in 'result' mode without flow vector arrows", () => {
      const { container } = render(<HairSvgDiagram styleKey="slick_back" mode="result" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      const markerLines = container.querySelectorAll("[marker-end]");
      expect(markerLines.length).toBe(0);
    });

    it("renders in 'thumbnail' mode cleanly", () => {
      const { container } = render(<HairSvgDiagram styleKey="curtain_bangs" mode="thumbnail" />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("handles unrecognized style keys with graceful fallback", () => {
      const { container } = render(<HairSvgDiagram styleKey="non_existent_style" mode="vectors" />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("renders without error when styleKey is undefined or empty and infers from title", () => {
      const { container } = render(<HairSvgDiagram styleKey={undefined as any} title="ทรงครอป" mode="vectors" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      // Should match french_crop based on title
      expect(svg?.getAttribute("aria-label")).toContain("french_crop");

      // Renders cleanly with zero props
      const { container: emptyContainer } = render(<HairSvgDiagram />);
      expect(emptyContainer.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("3. Inline Thumbnail Component (HairDiagramThumbnail)", () => {
    it("renders thumbnail label, title, and triggers onExpand on click", () => {
      const onExpand = vi.fn();
      render(
        <HairDiagramThumbnail
          styleKey="pompadour_quiff"
          title="ทรงปอมปาดัวร์และควิฟยกสูง"
          onExpand={onExpand}
        />
      );

      expect(screen.getByText("ภาพจำลองทรงผม")).toBeInTheDocument();
      expect(screen.getByText("Optical Balancing")).toBeInTheDocument();

      const previewBox = screen.getByRole("button", {
        name: /คลิกเพื่อดูภาพขยายและสถาปัตยกรรมทรงผม ทรงปอมปาดัวร์และควิฟยกสูง/,
      });
      fireEvent.click(previewBox);
      expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it("triggers onExpand with Enter and Space keyboard events", () => {
      const onExpand = vi.fn();
      render(
        <HairDiagramThumbnail
          styleKey="french_crop"
          title="ทรงเท็กซ์เจอร์ครอป"
          onExpand={onExpand}
        />
      );

      const previewBox = screen.getByRole("button", {
        name: /คลิกเพื่อดูภาพขยายและสถาปัตยกรรมทรงผม/,
      });

      fireEvent.keyDown(previewBox, { key: "Enter", code: "Enter" });
      expect(onExpand).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(previewBox, { key: " ", code: "Space" });
      expect(onExpand).toHaveBeenCalledTimes(2);
    });

    it("triggers onExpand when clicking the text link button", () => {
      const onExpand = vi.fn();
      render(
        <HairDiagramThumbnail
          styleKey="comma_hair"
          title="ทรงคอมม่า"
          onExpand={onExpand}
        />
      );

      const expandLink = screen.getByText("ดูภาพขยาย");
      fireEvent.click(expandLink);
      expect(onExpand).toHaveBeenCalledTimes(1);
    });
  });

  describe("4. Modal Inspection Dialog (HairDiagramModal)", () => {
    it("does not render dialog when open is false", () => {
      render(
        <HairDiagramModal
          open={false}
          onOpenChange={() => {}}
          diagramKey="long_layers"
          title="ผมยาวสไลด์เลเยอร์"
        />
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders clean photorealistic lookbook dialog with image, title, and benefits", () => {
      const onOpenChange = vi.fn();
      render(
        <HairDiagramModal
          open={true}
          onOpenChange={onOpenChange}
          diagramKey="soft_waves"
          title="ลอนคลื่นธรรมชาติแสกข้าง"
          barberInstructions="ซอยเลเยอร์ระดับกลาง สไลด์ปลายผมให้พลิ้ว ดัดลอนใหญ่คลายๆ แบบธรรมชาติ"
        />
      );

      // Dialog is visible
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("ลอนคลื่นธรรมชาติแสกข้าง")).toBeInTheDocument();
      expect(screen.getByText("Natural Soft Waves & Mid-Length Volume")).toBeInTheDocument();

      // Renders the photorealistic lookbook image directly
      const img = screen.getByRole("img", { name: /ภาพผลลัพธ์จำลองทรงลอนคลื่นธรรมชาติแสกข้าง/ });
      expect(img).toBeInTheDocument();
      expect(img.getAttribute("src")).toBe("/hairstyles/soft_waves.webp");

      // Verifies wireframe sketches and before/vectors tabs are NOT present
      expect(screen.queryByText("ก่อนจัดทรง (ธรรมชาติ)")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "เวกเตอร์จัดทรง" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "ภาพเปรียบเทียบ" })).not.toBeInTheDocument();

      // Barber instructions and benefit are displayed cleanly
      expect(screen.getByText("คำสั่งสำหรับบอกช่าง (Barber Instructions)")).toBeInTheDocument();
      expect(screen.getByText(/ซอยเลเยอร์ระดับกลาง/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "คัดลอกข้อความ" })).toBeInTheDocument();
      expect(screen.getByText(/จุดเด่นในการเสริมโครงหน้า:/)).toBeInTheDocument();

      // Close modal button
      const closeBtn = screen.getByRole("button", { name: "ปิดหน้าต่าง" });
      fireEvent.click(closeBtn);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("triggers onOpenChange when clicking header X button", () => {
      const onOpenChange = vi.fn();
      render(
        <HairDiagramModal
          open={true}
          onOpenChange={onOpenChange}
          diagramKey="modern_crew"
          title="ทรงครูว์คัต"
        />
      );

      const xBtn = screen.getByLabelText("ปิดหน้าต่างแผนภาพ");
      fireEvent.click(xBtn);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("renders beard grooming lookbook modal properly", () => {
      render(
        <HairDiagramModal
          open={true}
          onOpenChange={() => {}}
          diagramKey="chin_goatee"
          title="เคราแพะเรียวปลายคาง"
          category="beard"
          barberInstructions="เล็มเคราปลายคางความยาว 8-12 มม. โกนแก้มและขอบกรามให้เรียบเนียน"
        />
      );

      expect(screen.getByText("Beard Grooming")).toBeInTheDocument();
      expect(screen.getByText("ภาพจำลองจัดแต่งหนวดเครา")).toBeInTheDocument();
      expect(screen.getByText("เคราแพะเรียวปลายคาง")).toBeInTheDocument();
      const img = screen.getByRole("img", { name: /ภาพผลลัพธ์จำลองการจัดแต่งเคราแพะปลายคาง/ });
      expect(img).toBeInTheDocument();
      expect(img.getAttribute("src")).toBe("/hairstyles/chin_goatee.webp");
    });

    it("handles undefined diagramKey gracefully when title is provided", () => {
      render(
        <HairDiagramModal
          open={true}
          onOpenChange={() => {}}
          title="หน้าม้าซีทรู"
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("หน้าม้าซีทรู")).toBeInTheDocument();
    });
  });

  describe("5. Integration with HairAdviceCard", () => {
    it("renders hair recommendations with thumbnail and opens modal on click", () => {
      const result = createDummyResult({
        F10_golden_ratio: 1.55, // elongated
      });

      render(<HairAdviceCard result={result} initialSex="female" />);

      // Recommendations should be displayed
      expect(screen.getByText("ทรงผมที่แนะนำสำหรับโครงหน้าของคุณ")).toBeInTheDocument();

      // Thumbnails should be rendered inside each recommendation card
      const thumbnails = screen.getAllByText("ภาพจำลองทรงผม");
      expect(thumbnails.length).toBeGreaterThanOrEqual(3);

      // Click on the first thumbnail to open the modal
      const previewButtons = screen.getAllByLabelText(/คลิกเพื่อดูภาพขยายและสถาปัตยกรรมทรงผม/);
      expect(previewButtons.length).toBeGreaterThanOrEqual(1);

      fireEvent.click(previewButtons[0]!);

      // Modal dialog opens
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("ภาพตัวอย่างผลลัพธ์จริง (After Lookbook)")).toBeInTheDocument();

      // Close modal
      const closeBtn = screen.getByRole("button", { name: "ปิดหน้าต่าง" });
      fireEvent.click(closeBtn);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders male hairstyles with diagrams appropriately", () => {
      const result = createDummyResult({
        F10_golden_ratio: 1.2, // compact male
      });

      render(<HairAdviceCard result={result} initialSex="male" />);

      const thumbnails = screen.getAllByText("ภาพจำลองทรงผม");
      expect(thumbnails.length).toBeGreaterThanOrEqual(3);

      const previewButtons = screen.getAllByLabelText(/คลิกเพื่อดูภาพขยายและสถาปัตยกรรมทรงผม/);
      fireEvent.click(previewButtons[0]!);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("ภาพตัวอย่างผลลัพธ์จริง (After Lookbook)")).toBeInTheDocument();
    });
  });
});
