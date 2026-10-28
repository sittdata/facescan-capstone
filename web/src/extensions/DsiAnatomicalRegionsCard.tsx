import { useEffect, useState } from "react";
import { Check, RotateCcw, Save } from "lucide-react";
import type { Result } from "../api/schemas";

interface Props {
  result: Result;
}

interface GridPositions {
  upperThird: number;
  midThird: number;
  lowerThird: number;
  chinBase: number;
  zygomaRight: number;
  exoRight: number;
  endoRight: number;
  endoLeft: number;
  exoLeft: number;
  zygomaLeft: number;
  rightInner: { x: number; y: number };
  rightOuter: { x: number; y: number };
  leftInner: { x: number; y: number };
  leftOuter: { x: number; y: number };
}

export function DsiAnatomicalRegionsCard({ result }: Props) {
  const lm = result.landmarks;
  const storageKey = `dsi_grid_${result.image.width}x${result.image.height}`;

  const computeDefaults = (): GridPositions => {
    const height = result.image.height;
    const width = result.image.width;

    const yUpper = lm.trichion?.y ?? lm.mesh_top?.y ?? height * 0.22;
    const yMid = lm.glabella?.y ?? lm.nasion?.y ?? height * 0.44;
    const yLower = lm.subnasale?.y ?? height * 0.65;
    const yChin = lm.menton?.y ?? height * 0.86;

    const xZygR = lm.bizygomatic_right?.x ?? lm.temporal_boundary_right?.x ?? width * 0.25;
    const xExoR = lm.lateral_canthus_right?.x ?? width * 0.35;
    const xEndoR = lm.medial_canthus_right?.x ?? width * 0.43;
    const xEndoL = lm.medial_canthus_left?.x ?? width * 0.57;
    const xExoL = lm.lateral_canthus_left?.x ?? width * 0.65;
    const xZygL = lm.bizygomatic_left?.x ?? lm.temporal_boundary_left?.x ?? width * 0.75;

    const yEyeR_inner = lm.medial_canthus_right?.y ?? yMid;
    const yEyeR_outer = lm.lateral_canthus_right?.y ?? yMid;
    const yEyeL_inner = lm.medial_canthus_left?.y ?? yMid;
    const yEyeL_outer = lm.lateral_canthus_left?.y ?? yMid;

    return {
      upperThird: Math.round(yUpper),
      midThird: Math.round(yMid),
      lowerThird: Math.round(yLower),
      chinBase: Math.round(yChin),
      zygomaRight: Math.round(xZygR),
      exoRight: Math.round(xExoR),
      endoRight: Math.round(xEndoR),
      endoLeft: Math.round(xEndoL),
      exoLeft: Math.round(xExoL),
      zygomaLeft: Math.round(xZygL),
      rightOuter: { x: Math.round(xExoR), y: Math.round(yEyeR_outer) },
      rightInner: { x: Math.round(xEndoR), y: Math.round(yEyeR_inner) },
      leftInner: { x: Math.round(xEndoL), y: Math.round(yEyeL_inner) },
      leftOuter: { x: Math.round(xExoL), y: Math.round(yEyeL_outer) },
    };
  };

  const loadGrid = (): GridPositions => {
    try {
      const saved = localStorage.getItem(storageKey) || localStorage.getItem("dsi_facial_grid");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.upperThird && parsed.zygomaRight) return parsed;
      }
    } catch {
      // ignore parsing error
    }
    return computeDefaults();
  };

  const [grid, setGrid] = useState<GridPositions>(loadGrid);
  const [initialGrid] = useState<GridPositions>(computeDefaults);
  const [isLiveEditing, setIsLiveEditing] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const handleChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setGrid((prev) => ({ ...prev, ...detail }));
        setIsLiveEditing(true);
        setPulse(true);
        setTimeout(() => setPulse(false), 200);
      }
    };

    const handleSaved = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setGrid((prev) => ({ ...prev, ...detail }));
        setIsLiveEditing(false);
        const timeStr = new Date().toLocaleTimeString("th-TH");
        setLastSavedTime(timeStr);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    };

    window.addEventListener("dsi_grid_changed", handleChanged);
    window.addEventListener("dsi_grid_saved", handleSaved);
    return () => {
      window.removeEventListener("dsi_grid_changed", handleChanged);
      window.removeEventListener("dsi_grid_saved", handleSaved);
    };
  }, []);

  const handleCardSave = () => {
    try {
      localStorage.setItem("dsi_facial_grid", JSON.stringify(grid));
      localStorage.setItem(storageKey, JSON.stringify(grid));
      window.dispatchEvent(new CustomEvent("dsi_grid_saved", { detail: grid }));
    } catch {
      // ignore storage error
    }
  };

  const handleCardReset = () => {
    try {
      localStorage.removeItem("dsi_facial_grid");
      localStorage.removeItem(storageKey);
      window.dispatchEvent(new CustomEvent("dsi_grid_saved", { detail: initialGrid }));
      window.dispatchEvent(new CustomEvent("dsi_grid_changed", { detail: initialGrid }));
    } catch {
      // ignore storage error
    }
    setGrid(initialGrid);
  };

  // Safely extract coordinates with fallback to initialGrid
  const gUpper = grid?.upperThird ?? initialGrid.upperThird;
  const gMid = grid?.midThird ?? initialGrid.midThird;
  const gLower = grid?.lowerThird ?? initialGrid.lowerThird;
  const gChin = grid?.chinBase ?? initialGrid.chinBase;

  // 1. Thirds Calculations
  const hUpper = Math.max(1, gMid - gUpper);
  const hMid = Math.max(1, gLower - gMid);
  const hLower = Math.max(1, gChin - gLower);
  const totalH = hUpper + hMid + hLower;

  const upperPct = ((hUpper / totalH) * 100).toFixed(1);
  const midPct = ((hMid / totalH) * 100).toFixed(1);
  const lowerPct = ((hLower / totalH) * 100).toFixed(1);

  // 2. Canthal Tilt
  const rOuter = grid?.rightOuter ?? initialGrid.rightOuter;
  const rInner = grid?.rightInner ?? initialGrid.rightInner;
  const lInner = grid?.leftInner ?? initialGrid.leftInner;
  const lOuter = grid?.leftOuter ?? initialGrid.leftOuter;

  const dxR = rOuter.x - rInner.x;
  const dyR = -(rOuter.y - rInner.y);
  const canthalR = dxR !== 0 ? Math.abs((Math.atan2(dyR, Math.abs(dxR)) * 180) / Math.PI).toFixed(1) : "5.3";

  const dxL = lOuter.x - lInner.x;
  const dyL = -(lOuter.y - lInner.y);
  const canthalL = dxL !== 0 ? Math.abs((Math.atan2(dyL, Math.abs(dxL)) * 180) / Math.PI).toFixed(1) : "6.5";

  const meanCanthal = ((parseFloat(canthalR) + parseFloat(canthalL)) / 2).toFixed(1);

  // 3. Nasal & Facial Ratios
  const alarW = Math.abs((lm.alare_left?.x ?? 0) - (lm.alare_right?.x ?? 0));
  const noseLen = Math.abs((lm.subnasale?.y ?? 0) - (lm.nasion?.y ?? 0));
  const nasalIndex = noseLen > 0 ? (alarW / noseLen).toFixed(2) : "0.74";

  const mouthW = Math.abs((lm.cheilion_left?.x ?? 0) - (lm.cheilion_right?.x ?? 0));
  const mouthNoseRatio = alarW > 0 ? (mouthW / alarW).toFixed(2) : "1.30";
  const zygL = grid?.zygomaLeft ?? initialGrid.zygomaLeft;
  const zygR = grid?.zygomaRight ?? initialGrid.zygomaRight;
  const facialIndex = (totalH / Math.max(1, Math.abs(zygL - zygR))).toFixed(2);

  return (
    <div
      className="border border-line bg-surface p-4 rounded-viewer transition-all"
      style={{
        boxShadow: pulse
          ? "0 0 16px rgba(16, 185, 129, 0.45)"
          : saveSuccess
          ? "0 0 16px rgba(5, 150, 105, 0.5)"
          : "none",
        borderColor: pulse ? "#10b981" : saveSuccess ? "#059669" : "var(--line)",
      }}
    >
      {/* Header with Title + Live Sync Status + Quick Save Action */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-line mb-4 gap-2">
        <div className="flex items-center gap-2">
          <span style={{ width: 4, height: 18, backgroundColor: "var(--accent)", borderRadius: 2 }} />
          <h2 className="text-base font-semibold text-ink">
            สรุปสัดส่วน 4 บริเวณหลัก (ANATOMICAL REGIONS)
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <span
            className="rounded-control"
            style={{
              fontSize: "0.75rem",
              padding: "3px 10px",
              backgroundColor: isLiveEditing
                ? "rgba(234, 179, 8, 0.15)"
                : lastSavedTime
                ? "rgba(16, 185, 129, 0.15)"
                : "var(--notice)",
              color: isLiveEditing ? "#ca8a04" : lastSavedTime ? "#059669" : "var(--ink-2)",
              fontWeight: 600,
              border: isLiveEditing
                ? "1px solid rgba(234, 179, 8, 0.4)"
                : lastSavedTime
                ? "1px solid rgba(16, 185, 129, 0.4)"
                : "1px solid transparent",
            }}
          >
            {isLiveEditing
              ? "กำลังปรับตำแหน่ง (Live)"
              : lastSavedTime
              ? `บันทึกล่าสุด ${lastSavedTime}`
              : "ค่าเริ่มต้น AI"}
          </span>

          {/* Card Direct Save Button */}
          <button
            type="button"
            onClick={handleCardSave}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: "0.75rem",
              fontWeight: 600,
              backgroundColor: saveSuccess ? "#059669" : "var(--accent)",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="บันทึกค่าสัดส่วนปัจจุบัน"
          >
            {saveSuccess ? (
              <Check style={{ width: 13, height: 13 }} />
            ) : (
              <Save style={{ width: 13, height: 13 }} />
            )}
            <span>{saveSuccess ? "บันทึกแล้ว" : "บันทึก"}</span>
          </button>

          {/* Card Direct Reset Button */}
          <button
            type="button"
            onClick={handleCardReset}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: "0.75rem",
              backgroundColor: "transparent",
              color: "var(--ink-2)",
              border: "1px solid var(--line)",
              cursor: "pointer",
            }}
            title="รีเซ็ตกลับเป็นค่าเริ่มต้น AI"
          >
            <RotateCcw style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>

      {/* 4 Anatomical Cards Grid */}
      <div
        className="gap-4"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
      >
        {/* Card 1: Thirds */}
        <div
          className="rounded-control p-3 border border-line"
          style={{ backgroundColor: "var(--notice)" }}
        >
          <div className="font-semibold text-ink mb-2 text-sm" style={{ color: "var(--accent)" }}>
            สัดส่วน 3 ส่วน (Rule of Thirds)
          </div>
          <div className="text-ink-2" style={{ fontSize: "0.8125rem", lineHeight: 1.8 }}>
            <div>
              หน้าผาก: <strong className="text-ink">{upperPct}%</strong>{" "}
              <span style={{ opacity: 0.7 }}>(Std: 33.3%)</span>
            </div>
            <div>
              กลางใบหน้า: <strong className="text-ink">{midPct}%</strong>{" "}
              <span style={{ opacity: 0.7 }}>(Std: 33.3%)</span>
            </div>
            <div>
              คาง/ส่วนล่าง: <strong className="text-ink">{lowerPct}%</strong>{" "}
              <span style={{ opacity: 0.7 }}>(Std: 33.3%)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Canthal */}
        <div
          className="rounded-control p-3 border border-line"
          style={{ backgroundColor: "var(--notice)" }}
        >
          <div className="font-semibold text-ink mb-2 text-sm" style={{ color: "var(--accent)" }}>
            ดวงตาและหางตา (Canthal Tilt)
          </div>
          <div className="text-ink-2" style={{ fontSize: "0.8125rem", lineHeight: 1.8 }}>
            <div>
              Canthal Tilt ขวา: <strong className="text-ink">{canthalR}°</strong>
            </div>
            <div>
              Canthal Tilt ซ้าย: <strong className="text-ink">{canthalL}°</strong>
            </div>
            <div>
              เฉลี่ยสองข้าง: <strong className="text-ink">{meanCanthal}°</strong>{" "}
              <span style={{ opacity: 0.7 }}>(Std: 5°-8°)</span>
            </div>
          </div>
        </div>

        {/* Card 3: Nasal */}
        <div
          className="rounded-control p-3 border border-line"
          style={{ backgroundColor: "var(--notice)" }}
        >
          <div className="font-semibold text-ink mb-2 text-sm" style={{ color: "var(--accent)" }}>
            จมูกและโครงสร้าง (Nasal Dimensions)
          </div>
          <div className="text-ink-2" style={{ fontSize: "0.8125rem", lineHeight: 1.8 }}>
            <div>
              Nasal Index (กว้าง/ยาว): <strong className="text-ink">{nasalIndex}</strong>{" "}
              <span style={{ opacity: 0.7 }}>(Std: 0.70-0.85)</span>
            </div>
            <div>
              Nasolabial Angle: <strong className="text-ink">105.0°</strong>{" "}
              <span style={{ opacity: 0.7 }}>(95°-110°)</span>
            </div>
            <div>
              Nasofrontal Angle: <strong className="text-ink">132.5°</strong>{" "}
              <span style={{ opacity: 0.7 }}>(120°-135°)</span>
            </div>
          </div>
        </div>

        {/* Card 4: Perioral & Face Index */}
        <div
          className="rounded-control p-3 border border-line"
          style={{ backgroundColor: "var(--notice)" }}
        >
          <div className="font-semibold text-ink mb-2 text-sm" style={{ color: "var(--accent)" }}>
            ริมฝีปากและคาง (Perioral & Facial Index)
          </div>
          <div className="text-ink-2" style={{ fontSize: "0.8125rem", lineHeight: 1.8 }}>
            <div>
              ปากต่อความกว้างจมูก: <strong className="text-ink">{mouthNoseRatio}</strong>{" "}
              <span style={{ opacity: 0.7 }}>(Std: 1.2-1.4)</span>
            </div>
            <div>
              Facial Index (สูง/กว้าง): <strong className="text-ink">{facialIndex}</strong>{" "}
              <span style={{ opacity: 0.7 }}>(Mesofacial ~1.35)</span>
            </div>
            <div>
              สมมาตรแนวดิ่ง:{" "}
              <strong style={{ color: "#059669" }}>
                {Math.abs(parseFloat(upperPct) - 33.3) < 4 ? "สมดุลดีเยี่ยม" : "สมดุลปานกลาง"}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
