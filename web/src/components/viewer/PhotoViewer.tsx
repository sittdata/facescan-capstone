/**
 * The photo viewer: the `user` overlay on a --viewer surround, with
 * pinch and double-tap zoom inside the viewer (page zoom stays enabled) and a three-option
 * switch between "เส้นวัดมาตรฐาน", "สัดส่วน 3 ส่วน (DSI314)", and "ภาพต้นฉบับ".
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, RotateCcw, Save } from "lucide-react";
import type { Result } from "../../api/schemas";
import { SegmentedControl } from "../ui/SegmentedControl";
import { cx } from "../ui/cx";
import { PointsLayer } from "./PointsLayer";
import { Surface } from "./Surface";
import { useZoomPan } from "./useZoomPan";
import { ZoomControls } from "./ZoomControls";
import { DsiInteractiveGrid } from "../../extensions/DsiInteractiveGrid";

export interface PhotoViewerProps {
  photoUrl: string;
  overlayUrl: string | null;
  result: Result | Pick<Result, "image" | "landmarks">;
  /** While uploading and analyzing: the photo is dimmed and not interactive. */
  dimmed?: boolean;
  controls?: boolean;
  /** The switch (not for a photo without results). */
  toggle?: boolean;
  className?: string;
  mode?: "overlay" | "dsi" | "original";
  onModeChange?: (mode: "overlay" | "dsi" | "original") => void;
}

export function PhotoViewer({
  photoUrl,
  overlayUrl,
  result,
  dimmed = false,
  controls = true,
  toggle = true,
  className,
  mode: controlledMode,
  onModeChange,
}: PhotoViewerProps) {
  const { t } = useTranslation();
  const [internalMode, setInternalMode] = useState<"overlay" | "dsi" | "original">("overlay");
  const mode = controlledMode ?? internalMode;
  const setMode = (m: "overlay" | "dsi" | "original") => {
    setInternalMode(m);
    onModeChange?.(m);
  };
  const { surfaceRef, surfaceStyle, handlers, contentStyle, view, zoomIn, zoomOut, maxScale } = useZoomPan({ doubleTapZoom: true });

  const isDsi = toggle && mode === "dsi";
  const isOverlay = toggle && mode === "overlay";
  const src = isOverlay && overlayUrl ? overlayUrl : photoUrl;

  // Live stats tracking from DsiInteractiveGrid
  const [liveThirds, setLiveThirds] = useState<string>("33.3% : 33.3% : 33.4%");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const handleGridChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        const g = detail;
        const hUpper = Math.max(1, g.midThird - g.upperThird);
        const hMid = Math.max(1, g.lowerThird - g.midThird);
        const hLower = Math.max(1, g.chinBase - g.lowerThird);
        const total = hUpper + hMid + hLower;
        const u = ((hUpper / total) * 100).toFixed(1);
        const m = ((hMid / total) * 100).toFixed(1);
        const l = ((hLower / total) * 100).toFixed(1);
        setLiveThirds(`${u}% : ${m}% : ${l}%`);
      }
    };

    const handleGridSaved = () => {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    };

    window.addEventListener("dsi_grid_changed", handleGridChanged);
    window.addEventListener("dsi_grid_saved", handleGridSaved);
    return () => {
      window.removeEventListener("dsi_grid_changed", handleGridChanged);
      window.removeEventListener("dsi_grid_saved", handleGridSaved);
    };
  }, []);

  return (
    <figure className={className}>
      <Surface
        ref={surfaceRef}
        width={result.image.width}
        height={result.image.height}
        style={dimmed ? undefined : surfaceStyle}
        {...(dimmed ? {} : handlers)}
        data-testid="photo-viewer"
      >
        <div className="absolute inset-0" style={contentStyle}>
          <img
            src={src}
            alt={isOverlay ? t("viewer.altOverlay") : t("viewer.altOriginal")}
            draggable={false}
            className={cx("absolute inset-0 size-full transition-opacity", dimmed && "opacity-40")}
          />
          {isOverlay && !overlayUrl && !dimmed && <PointsLayer result={result} />}
          {isDsi && !dimmed && (
            <DsiInteractiveGrid
              result={result as Result}
              width={result.image.width}
              height={result.image.height}
            />
          )}
        </div>
      </Surface>

      {/* DSI Action Toolbar placed outside Surface (No obstruction of face or chin) */}
      {isDsi && !dimmed && (
        <div
          className="mt-3 rounded-viewer border border-line bg-surface p-3 flex flex-wrap items-center justify-between gap-2 transition-all"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center gap-2" style={{ fontSize: "0.8125rem" }}>
            <span className="font-semibold text-ink">สัดส่วนแนวตั้ง:</span>
            <span style={{ color: "var(--accent)", fontWeight: 700, fontFamily: "monospace" }}>
              {liveThirds}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("dsi_action_save"))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: "0.8125rem",
                fontWeight: 600,
                backgroundColor: saveSuccess ? "#059669" : "var(--accent)",
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="บันทึกตำแหน่งเส้นที่ปรับแต่ง"
            >
              {saveSuccess ? (
                <Check style={{ width: 14, height: 14 }} />
              ) : (
                <Save style={{ width: 14, height: 14 }} />
              )}
              <span>{saveSuccess ? "บันทึกแล้ว" : "บันทึกสัดส่วน"}</span>
            </button>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("dsi_action_reset"))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "5px 10px",
                borderRadius: 6,
                fontSize: "0.8125rem",
                backgroundColor: "transparent",
                color: "var(--ink-2)",
                border: "1px solid var(--line)",
                cursor: "pointer",
              }}
              title="รีเซ็ตกลับเป็นตำแหน่งเริ่มต้นของ AI"
            >
              <RotateCcw style={{ width: 13, height: 13 }} />
              <span>รีเซ็ต</span>
            </button>
          </div>
        </div>
      )}

      {controls && !dimmed && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {toggle && (
            <SegmentedControl
              label={t("viewer.label")}
              value={mode}
              onChange={(val) => setMode(val as "overlay" | "dsi" | "original")}
              options={[
                { value: "overlay", label: "เส้นวัดมาตรฐาน" },
                { value: "dsi", label: "เส้นวัดคลินิก (ปรับเส้นได้)" },
                { value: "original", label: "ภาพต้นฉบับ" },
              ]}
            />
          )}
          <ZoomControls
            onIn={zoomIn}
            onOut={zoomOut}
            canIn={view.scale < maxScale}
            canOut={view.scale > 1}
          />
        </div>
      )}
    </figure>
  );
}
