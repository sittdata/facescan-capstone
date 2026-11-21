import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ResultScreen } from "../src/screens/scan/ResultScreen";
import { useScan } from "../src/scan/ScanContext";
import frontalTh from "../fixtures/frontal_ok.th.json" with { type: "json" };
import { setupI18n } from "../src/i18n";

vi.mock("../src/scan/ScanContext", () => ({
  useScan: vi.fn(),
}));

describe("Option A: Consumer First Auto-Align Integration", () => {
  beforeEach(() => {
    setupI18n("th");
  });
  it("renders auto-align banner when result has is_auto_aligned set to true", () => {
    const mockResult = {
      ...frontalTh.result,
      is_auto_aligned: true,
    };

    vi.mocked(useScan).mockReturnValue({
      state: {
        frontal: {
          latest: {
            token: "tok_test",
            result: mockResult,
            overlay: "data:image/jpeg;base64,mock",
            overlayProblem: null,
            versions: { api: "0.1.0", core: "0.1.0", schema: "2.0" },
            requestId: "req_test",
            locale: "th",
            analyzedAt: Date.now(),
          },
          photoUrl: "blob:http://localhost/test",
          announcement: null,
          capturing: false,
          busy: false,
          capture: null,
          failures: 0,
          lastFailure: null,
        },
        profile: {
          latest: null,
          photoUrl: undefined,
          announcement: null,
          capturing: false,
          busy: false,
          capture: null,
          failures: 0,
          lastFailure: null,
          facing: "left",
        },
        subject: { sex: "female", age: 25 },
        draft: null,
        report: null,
        step: "frontal",
      },
      dispatch: vi.fn(),
      confirmSubject: vi.fn(),
      setFacing: vi.fn(),
      selectPhoto: vi.fn(),
      selectBurst: vi.fn(),
      analyze: vi.fn(),
      saveAdjustment: vi.fn(),
      resetToAutomatic: vi.fn(),
      requestReport: vi.fn(),
      newScan: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <ResultScreen view="frontal" />
      </MemoryRouter>,
    );

    const banner = screen.getByTestId("auto-align-banner");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/โหมดปรับระนาบอัตโนมัติ/);
  });

  it("does not render auto-align banner on standard clinical capture without is_auto_aligned", () => {
    const mockResult = {
      ...frontalTh.result,
      is_auto_aligned: false,
    };

    vi.mocked(useScan).mockReturnValue({
      state: {
        frontal: {
          latest: {
            token: "tok_test",
            result: mockResult,
            overlay: "data:image/jpeg;base64,mock",
            overlayProblem: null,
            versions: { api: "0.1.0", core: "0.1.0", schema: "2.0" },
            requestId: "req_test",
            locale: "th",
            analyzedAt: Date.now(),
          },
          photoUrl: "blob:http://localhost/test",
          announcement: null,
          capturing: false,
          busy: false,
          capture: null,
          failures: 0,
          lastFailure: null,
        },
        profile: {
          latest: null,
          photoUrl: undefined,
          announcement: null,
          capturing: false,
          busy: false,
          capture: null,
          failures: 0,
          lastFailure: null,
          facing: "left",
        },
        subject: { sex: "female", age: 25 },
        draft: null,
        report: null,
        step: "frontal",
      },
      dispatch: vi.fn(),
      confirmSubject: vi.fn(),
      setFacing: vi.fn(),
      selectPhoto: vi.fn(),
      selectBurst: vi.fn(),
      analyze: vi.fn(),
      saveAdjustment: vi.fn(),
      resetToAutomatic: vi.fn(),
      requestReport: vi.fn(),
      newScan: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <ResultScreen view="frontal" />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("auto-align-banner")).not.toBeInTheDocument();
  });
});
