import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  HarmonyScoreSchema,
  HarmonySubscoresSchema,
  ProcedureRecommendationSchema,
  ResultSchema,
  ReportSchema,
  type HarmonyScore,
  type AIHarmonyResult,
  type ProcedureRecommendation,
} from "../src/api/schemas";
import { HarmonyCard } from "../src/components/results/HarmonyCard";
import { ProcedureRecommendationCard } from "../src/components/results/ProcedureRecommendationCard";
import { SimulationDrawer } from "../src/extensions/SimulationDrawer";
import frontalTh from "../fixtures/frontal_ok.th.json" with { type: "json" };
import reportTh from "../fixtures/report_ok.th.json" with { type: "json" };

describe("Milestone M3 Empirical Challenger Suite", () => {
  describe("1. Schema Empirical Validation & Fuzzing", () => {
    it("validates valid HarmonyScore and Subscores payloads", () => {
      const validSubscores = {
        vertical_thirds: 82.5,
        transverse_fifths: 91.0,
        lip_harmony: 78.4,
        symmetry: 88.2,
      };
      const parsedSub = HarmonySubscoresSchema.parse(validSubscores);
      expect(parsedSub).toEqual(validSubscores);

      const validScore = {
        overall: 85.0,
        subscores: validSubscores,
      };
      const parsedScore = HarmonyScoreSchema.parse(validScore);
      expect(parsedScore.overall).toBe(85.0);
      expect(parsedScore.subscores.vertical_thirds).toBe(82.5);
    });

    it("rejects invalid HarmonyScore payloads", () => {
      // Missing subscore field
      expect(() =>
        HarmonySubscoresSchema.parse({
          vertical_thirds: 80,
          transverse_fifths: 90,
          symmetry: 85,
        }),
      ).toThrow();

      // String instead of number
      expect(() =>
        HarmonyScoreSchema.parse({
          overall: "85",
          subscores: {
            vertical_thirds: 80,
            transverse_fifths: 90,
            lip_harmony: 75,
            symmetry: 85,
          },
        }),
      ).toThrow();
    });

    it("validates valid ProcedureRecommendation payloads", () => {
      const validRec: ProcedureRecommendation = {
        procedure: "rhinoplasty",
        intensity: 0.65,
        rationale: "Wide alar base (F6: 1.15) exceeds intercanthal distance.",
        triggering_metrics: ["F6_alar_intercanthal_ratio"],
      };
      const parsed = ProcedureRecommendationSchema.parse(validRec);
      expect(parsed).toEqual(validRec);
    });

    it("validates backwards compatibility on existing Result fixtures (missing harmony/procedures)", () => {
      const strippedResult = { ...frontalTh.result, harmony: undefined, procedure_recommendations: undefined };
      const parsed = ResultSchema.parse(strippedResult);
      expect(parsed.status).toBe("ok");
      expect(parsed.harmony).toBeUndefined();
      expect(parsed.procedure_recommendations).toBeUndefined();
    });

    it("validates ResultSchema with populated harmony and procedure recommendations", () => {
      const enrichedResult = {
        ...frontalTh.result,
        harmony: {
          overall: 82.4,
          subscores: {
            vertical_thirds: 80.0,
            transverse_fifths: 85.0,
            lip_harmony: 75.0,
            symmetry: 90.0,
          },
        },
        procedure_recommendations: [
          {
            procedure: "chin_augmentation",
            intensity: 0.45,
            rationale: "Lower third height deficiency.",
            triggering_metrics: ["F1_lower_third"],
          },
          {
            procedure: "rhinoplasty",
            intensity: 0.0,
            rationale: "Morphology within reference ranges.",
            triggering_metrics: [],
          },
        ],
      };

      const parsed = ResultSchema.parse(enrichedResult);
      expect(parsed.harmony?.overall).toBe(82.4);
      expect(parsed.procedure_recommendations).toHaveLength(2);
      expect(parsed.procedure_recommendations?.[0]?.procedure).toBe("chin_augmentation");
      expect(parsed.procedure_recommendations?.[1]?.intensity).toBe(0.0);
    });

    it("validates ReportSchema with nullable/optional harmony and procedure recommendations", () => {
      // Existing fixture with stripped fields
      const strippedOld = { ...reportTh.report, harmony: undefined, procedure_recommendations: undefined };
      const parsedOld = ReportSchema.parse(strippedOld);
      expect(parsedOld.harmony).toBeUndefined();
      expect(parsedOld.procedure_recommendations).toBeUndefined();

      // Enriched report with nulls
      const enrichedNull = {
        ...reportTh.report,
        harmony: null,
        procedure_recommendations: null,
      };
      const parsedNull = ReportSchema.parse(enrichedNull);
      expect(parsedNull.harmony).toBeNull();
      expect(parsedNull.procedure_recommendations).toBeNull();
    });
  });

  describe("2. HarmonyCard Component Empirical Stress", () => {
    it("returns null when harmony is undefined or null", () => {
      const { container: c1 } = render(<HarmonyCard harmony={undefined} />);
      expect(c1.firstChild).toBeNull();

      const { container: c2 } = render(<HarmonyCard harmony={null} />);
      expect(c2.firstChild).toBeNull();
    });

    it("renders Golden Ratio badge for scores >= 85", () => {
      const harmony: HarmonyScore = {
        overall: 88.6,
        subscores: {
          vertical_thirds: 85,
          transverse_fifths: 90,
          lip_harmony: 88,
          symmetry: 92,
        },
      };
      render(<HarmonyCard harmony={harmony} />);
      expect(screen.getByText(/สัดส่วนทองคำยอดเยี่ยม/)).toBeInTheDocument();
      expect(screen.getAllByText("89%").length).toBeGreaterThanOrEqual(1);
    });

    it("renders Well Balanced badge for scores 70-84", () => {
      const harmony: HarmonyScore = {
        overall: 74.2,
        subscores: {
          vertical_thirds: 72,
          transverse_fifths: 75,
          lip_harmony: 70,
          symmetry: 80,
        },
      };
      render(<HarmonyCard harmony={harmony} />);
      expect(screen.getByText(/สัดส่วนสมดุลดี/)).toBeInTheDocument();
    });

    it("renders Moderate badge for scores 50-69", () => {
      const harmony: HarmonyScore = {
        overall: 58.0,
        subscores: {
          vertical_thirds: 60,
          transverse_fifths: 55,
          lip_harmony: 58,
          symmetry: 60,
        },
      };
      render(<HarmonyCard harmony={harmony} />);
      expect(screen.getByText(/สัดส่วนระดับปานกลาง/)).toBeInTheDocument();
    });

    it("renders Needs Attention badge for scores < 50", () => {
      const harmony: HarmonyScore = {
        overall: 42.1,
        subscores: {
          vertical_thirds: 40,
          transverse_fifths: 45,
          lip_harmony: 38,
          symmetry: 45,
        },
      };
      render(<HarmonyCard harmony={harmony} />);
      expect(screen.getByText(/สัดส่วนควรพิจารณาปรับสมดุล/)).toBeInTheDocument();
    });

    it("renders all 4 subscores and descriptions", () => {
      const harmony: HarmonyScore = {
        overall: 80,
        subscores: {
          vertical_thirds: 81,
          transverse_fifths: 82,
          lip_harmony: 83,
          symmetry: 84,
        },
      };
      render(<HarmonyCard harmony={harmony} />);
      expect(screen.getByText(/สัดส่วน 3 ส่วนแนวดิ่ง/)).toBeInTheDocument();
      expect(screen.getByText(/สัดส่วน 5 ส่วนแนวนอน/)).toBeInTheDocument();
      expect(screen.getByText(/สัดส่วนริมฝีปาก/)).toBeInTheDocument();
      expect(screen.getByText(/ความสมมาตรซ้าย-ขวา/)).toBeInTheDocument();
    });

    it("defaults SHAP feature attribution to collapsed and expands upon user click", async () => {
      const user = userEvent.setup();
      const mockAiHarmony: AIHarmonyResult = {
        overall_score: 82,
        raw_model_score: 0.82,
        percentile: 78,
        rating_th: "สัดส่วนดีเยี่ยม",
        rating_en: "Excellent",
        key_strengths: [
          {
            feature: "f1",
            name_th: "สัดส่วนความกว้างปากต่อจมูก",
            name_en: "Mouth to nose",
            impact_score: 1.8,
            is_positive: true,
            user_value: 1.35,
            reference_median: 1.35,
            description: "สมดุลดี",
          },
        ],
        key_improvements: [
          {
            feature: "f2",
            name_th: "มุมองศาหางตา",
            name_en: "Canthal tilt",
            impact_score: -1.2,
            is_positive: false,
            user_value: 5.5,
            reference_median: 6.5,
            description: "ควรปรับ",
          },
        ],
        total_features_evaluated: 10,
      };

      render(<HarmonyCard harmony={null} aiHarmony={mockAiHarmony} />);

      // Initially collapsed: shows "ดูปัจจัยเด่น" and does NOT render the feature attributions
      const toggleBtn = screen.getByRole("button", { name: /การอธิบายผลโมเดล/ });
      expect(toggleBtn).toBeInTheDocument();
      expect(screen.getByText("ดูปัจจัยเด่น")).toBeInTheDocument();
      expect(screen.queryByText("จุดเด่นของสัดส่วน")).toBeNull();
      expect(screen.queryByText("สัดส่วนความกว้างปากต่อจมูก")).toBeNull();
      expect(screen.queryByText("มุมองศาหางตา")).toBeNull();

      // Click to expand
      await user.click(toggleBtn);
      expect(screen.getByText("ย่อรายละเอียด")).toBeInTheDocument();
      expect(screen.getByText("จุดเด่นของสัดส่วน")).toBeInTheDocument();
      expect(screen.getByText("สัดส่วนความกว้างปากต่อจมูก")).toBeInTheDocument();
      expect(screen.getByText("จุดควรพิจารณาปรับสมดุล")).toBeInTheDocument();
      expect(screen.getByText("มุมองศาหางตา")).toBeInTheDocument();
    });
  });

  describe("3. ProcedureRecommendationCard Component Empirical Stress", () => {
    it("returns null when recommendations are null, undefined, or empty", () => {
      const { container: c1 } = render(<ProcedureRecommendationCard recommendations={null} />);
      expect(c1.firstChild).toBeNull();

      const { container: c2 } = render(<ProcedureRecommendationCard recommendations={undefined} />);
      expect(c2.firstChild).toBeNull();

      const { container: c3 } = render(<ProcedureRecommendationCard recommendations={[]} />);
      expect(c3.firstChild).toBeNull();
    });

    it("renders recommended procedure with intensity percentage and rationale", () => {
      const recs: ProcedureRecommendation[] = [
        {
          procedure: "chin_augmentation",
          intensity: 0.55,
          rationale: "Lower facial height is vertically deficient.",
          triggering_metrics: ["F1_lower_third", "F2_lower_face_ratio"],
        },
      ];

      render(<ProcedureRecommendationCard recommendations={recs} />);
      expect(screen.getByText("ปรับมิติปลายคาง")).toBeInTheDocument();
      expect(screen.getByText("แนะนำระดับ 55%")).toBeInTheDocument();
      expect(screen.getByText("Lower facial height is vertically deficient.")).toBeInTheDocument();
      expect(screen.getByText("F1_lower_third")).toBeInTheDocument();
      expect(screen.getByText("F2_lower_face_ratio")).toBeInTheDocument();
    });

    it("renders unrecommended procedure (intensity 0) as balanced", () => {
      const recs: ProcedureRecommendation[] = [
        {
          procedure: "rhinoplasty",
          intensity: 0.0,
          rationale: "Nasal proportions within reference ranges.",
          triggering_metrics: [],
        },
      ];

      render(<ProcedureRecommendationCard recommendations={recs} />);
      expect(screen.getByText("ปรับแต่งทรงจมูก")).toBeInTheDocument();
      expect(screen.getByText("สัดส่วนสมดุล (0%)")).toBeInTheDocument();
    });

    it("invokes onOpenSimulation callback when Try Face Simulation button is clicked", async () => {
      const onOpen = vi.fn();
      const recs: ProcedureRecommendation[] = [
        {
          procedure: "lip_augmentation",
          intensity: 0.4,
          rationale: "Thin vermilion height.",
          triggering_metrics: ["F8_lip_ratio"],
        },
      ];

      render(<ProcedureRecommendationCard recommendations={recs} onOpenSimulation={onOpen} />);
      const btn = screen.getByRole("button", { name: /เปิดหน้าต่างจำลองผลลัพธ์หัตถการ|ทดลองจำลองใบหน้า/ });
      await userEvent.click(btn);
      expect(onOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe("4. SimulationDrawer Preset Logic & Warp Parameter Scaling", () => {
    it("returns null when open=false or photoUrl=null", () => {
      const { container: c1 } = render(
        <SimulationDrawer open={false} onClose={() => {}} photoUrl="blob:http://localhost/test.jpg" />,
      );
      expect(c1.firstChild).toBeNull();

      const { container: c2 } = render(
        <SimulationDrawer open={true} onClose={() => {}} photoUrl={null} />,
      );
      expect(c2.firstChild).toBeNull();
    });

    it("scales preset values correctly from recommendedProcedures upon clicking Apply AI Golden Ratio", async () => {
      let capturedFormData: FormData | null = null;

      // Mock fetch
      const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url === "blob:http://localhost/test.jpg") {
          return Promise.resolve(new Response(new Blob(["test-image"], { type: "image/jpeg" })));
        }
        if (url === "/v1/simulation/warp" && init?.method === "POST") {
          capturedFormData = init.body as FormData;
          return Promise.resolve(new Response(new Blob(["warped-image"], { type: "image/jpeg" })));
        }
        return Promise.reject(new Error(`Unhandled URL ${url}`));
      });
      globalThis.fetch = mockFetch;

      const recs: ProcedureRecommendation[] = [
        { procedure: "rhinoplasty", intensity: 0.45, rationale: "Alar wide", triggering_metrics: ["F6"] },
        { procedure: "lip_augmentation", intensity: 0.60, rationale: "Lip thin", triggering_metrics: ["F8"] },
        { procedure: "chin_augmentation", intensity: 0.35, rationale: "Chin short", triggering_metrics: ["F1"] },
      ];

      render(
        <SimulationDrawer
          open={true}
          onClose={() => {}}
          photoUrl="blob:http://localhost/test.jpg"
          recommendedProcedures={recs}
        />,
      );

      const applyBtn = screen.getByRole("button", { name: /ตั้งค่าตามสัดส่วนที่แนะนำ|Apply AI Golden Ratio/i });
      await userEvent.click(applyBtn);

      await waitFor(() => {
        expect(capturedFormData).not.toBeNull();
      });

      // Verify slider display updated
      expect(screen.getByText("45%")).toBeInTheDocument();
      expect(screen.getByText("60%")).toBeInTheDocument();
      expect(screen.getByText("35%")).toBeInTheDocument();

      // Verify warp endpoint payload scaling (param / 100).toString()
      expect(capturedFormData!.get("rhinoplasty")).toBe("0.45");
      expect(capturedFormData!.get("lip_augmentation")).toBe("0.6");
      expect(capturedFormData!.get("chin_augmentation")).toBe("0.35");
      expect(capturedFormData!.get("file")).toBeInstanceOf(Blob);
    });

    it("falls back to default preset values (35, 40, 30) when recommendations are absent", async () => {
      let capturedFormData: FormData | null = null;

      const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url === "blob:http://localhost/test.jpg") {
          return Promise.resolve(new Response(new Blob(["test-image"], { type: "image/jpeg" })));
        }
        if (url === "/v1/simulation/warp") {
          capturedFormData = init?.body as FormData;
          return Promise.resolve(new Response(new Blob(["warped-image"], { type: "image/jpeg" })));
        }
        return Promise.reject(new Error(`Unhandled URL ${url}`));
      });
      globalThis.fetch = mockFetch;

      render(
        <SimulationDrawer
          open={true}
          onClose={() => {}}
          photoUrl="blob:http://localhost/test.jpg"
          recommendedProcedures={undefined}
        />,
      );

      const applyBtn = screen.getByRole("button", { name: /ตั้งค่าตามสัดส่วนที่แนะนำ|Apply AI Golden Ratio/i });
      await userEvent.click(applyBtn);

      await waitFor(() => {
        expect(capturedFormData).not.toBeNull();
      });

      // Verify default fallbacks: rhinoplasty 35, lip 40, chin 30
      expect(screen.getByText("35%")).toBeInTheDocument();
      expect(screen.getByText("40%")).toBeInTheDocument();
      expect(screen.getByText("30%")).toBeInTheDocument();

      expect(capturedFormData!.get("rhinoplasty")).toBe("0.35");
      expect(capturedFormData!.get("lip_augmentation")).toBe("0.4");
      expect(capturedFormData!.get("chin_augmentation")).toBe("0.3");
    });

    it("evaluates behavior when a procedure is indicated with 0.0 intensity", async () => {
      let capturedFormData: FormData | null = null;

      const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url === "blob:http://localhost/test.jpg") {
          return Promise.resolve(new Response(new Blob(["test-image"], { type: "image/jpeg" })));
        }
        if (url === "/v1/simulation/warp") {
          capturedFormData = init?.body as FormData;
          return Promise.resolve(new Response(new Blob(["warped-image"], { type: "image/jpeg" })));
        }
        return Promise.reject(new Error(`Unhandled URL ${url}`));
      });
      globalThis.fetch = mockFetch;

      const recs: ProcedureRecommendation[] = [
        { procedure: "rhinoplasty", intensity: 0.0, rationale: "Already balanced", triggering_metrics: [] },
        { procedure: "lip_augmentation", intensity: 0.5, rationale: "Thin lips", triggering_metrics: ["F8"] },
        { procedure: "chin_augmentation", intensity: 0.0, rationale: "Balanced chin", triggering_metrics: [] },
      ];

      render(
        <SimulationDrawer
          open={true}
          onClose={() => {}}
          photoUrl="blob:http://localhost/test.jpg"
          recommendedProcedures={recs}
        />,
      );

      const applyBtn = screen.getByRole("button", { name: /ตั้งค่าตามสัดส่วนที่แนะนำ|Apply AI Golden Ratio/i });
      await userEvent.click(applyBtn);

      await waitFor(() => {
        expect(capturedFormData).not.toBeNull();
      });

      // Observe: lip is 50%, while 0.0 intensity procedures fell back to default 35 and 30
      expect(screen.getByText("50%")).toBeInTheDocument();
      expect(capturedFormData!.get("lip_augmentation")).toBe("0.5");
      expect(capturedFormData!.get("rhinoplasty")).toBe("0.35");
      expect(capturedFormData!.get("chin_augmentation")).toBe("0.3");
    });

    it("resets slider values and cleared state when reset button is clicked", async () => {
      render(
        <SimulationDrawer
          open={true}
          onClose={() => {}}
          photoUrl="blob:http://localhost/test.jpg"
        />,
      );

      const resetBtn = screen.getByRole("button", { name: /รีเซ็ตค่า/ });
      await userEvent.click(resetBtn);

      const zeros = screen.getAllByText("0%");
      expect(zeros.length).toBeGreaterThanOrEqual(3);
    });
  });
});
