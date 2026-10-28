/**
 * Clinical Interactive Overlay (Ported to Friend's Medical/Clinical Aesthetic).
 * Renders the exact clinical measurement layout (Facial Thirds brackets, Fifths,
 * Canthal Tilt vectors with live angles, Alar width, and Commissure lines)
 * with draggable precision handles.
 */
import { useState, useRef, useEffect, useMemo } from "react";
import type { Result } from "../api/schemas";

interface Props {
  result: Result;
  width: number;
  height: number;
}

interface Point2D {
  x: number;
  y: number;
}

interface ClinicalGridPositions {
  // Horizontal Thirds (Y coordinates)
  trichionY: number;
  glabellaY: number;
  subnasaleY: number;
  mentonY: number;

  // Vertical Fifths (X coordinates)
  tempRightX: number;
  exoRightX: number;
  endoRightX: number;
  endoLeftX: number;
  exoLeftX: number;
  tempLeftX: number;

  // Canthal 2D points
  rightCanthusOuter: Point2D;
  rightCanthusInner: Point2D;
  leftCanthusInner: Point2D;
  leftCanthusOuter: Point2D;

  // Brow apex points
  browApexRight: Point2D;
  browApexLeft: Point2D;

  // Nose Alare (X coordinates & Y)
  alareRightX: number;
  alareLeftX: number;
  alareY: number;

  // Mouth Commissures
  commissureRight: Point2D;
  commissureLeft: Point2D;
  labraleSuperiusY: number;
  labraleInferiusY: number;
}

export function DsiInteractiveGrid({ result, width, height }: Props) {
  const lm = result.landmarks;
  const storageKey = `dsi_clinical_grid_${result.image.width}x${result.image.height}`;

  // Compute anatomical defaults using exact facescan landmark keys
  const computeDefaults = (): ClinicalGridPositions => {
    // Horizontal Thirds
    const yTri = lm.trichion?.y ?? lm.mesh_top?.y ?? height * 0.22;
    const yGla = lm.glabella?.y ?? lm.nasion?.y ?? height * 0.44;
    const ySub = lm.subnasale?.y ?? height * 0.65;
    const yMen = lm.menton?.y ?? height * 0.86;

    // Vertical Fifths
    const xTempR = lm.temporal_boundary_right?.x ?? lm.bizygomatic_right?.x ?? width * 0.23;
    const xExoR = lm.lateral_canthus_right?.x ?? width * 0.35;
    const xEndoR = lm.medial_canthus_right?.x ?? width * 0.43;
    const xEndoL = lm.medial_canthus_left?.x ?? width * 0.57;
    const xExoL = lm.lateral_canthus_left?.x ?? width * 0.65;
    const xTempL = lm.temporal_boundary_left?.x ?? lm.bizygomatic_left?.x ?? width * 0.77;

    // Canthal Y values
    const yExoR = lm.lateral_canthus_right?.y ?? yGla + (ySub - yGla) * 0.22;
    const yEndoR = lm.medial_canthus_right?.y ?? yGla + (ySub - yGla) * 0.24;
    const yEndoL = lm.medial_canthus_left?.y ?? yGla + (ySub - yGla) * 0.24;
    const yExoL = lm.lateral_canthus_left?.y ?? yGla + (ySub - yGla) * 0.22;

    // Brow Apex
    const xBrowR = lm.brow_apex_right?.x ?? xExoR + 10;
    const yBrowR = lm.brow_apex_right?.y ?? yGla - (ySub - yGla) * 0.15;
    const xBrowL = lm.brow_apex_left?.x ?? xExoL - 10;
    const yBrowL = lm.brow_apex_left?.y ?? yGla - (ySub - yGla) * 0.15;

    // Nose Alare
    const xAlR = lm.alare_right?.x ?? width * 0.435;
    const xAlL = lm.alare_left?.x ?? width * 0.565;
    const yAl = lm.alare_right?.y ?? ySub - 6;

    // Mouth
    const xComR = lm.commissure_right?.x ?? width * 0.41;
    const yComR = lm.commissure_right?.y ?? ySub + (yMen - ySub) * 0.32;
    const xComL = lm.commissure_left?.x ?? width * 0.59;
    const yComL = lm.commissure_left?.y ?? ySub + (yMen - ySub) * 0.32;

    const yLabSup = lm.labrale_superius?.y ?? ySub + (yMen - ySub) * 0.22;
    const yLabInf = lm.labrale_inferius?.y ?? ySub + (yMen - ySub) * 0.45;

    return {
      trichionY: Math.round(yTri),
      glabellaY: Math.round(yGla),
      subnasaleY: Math.round(ySub),
      mentonY: Math.round(yMen),

      tempRightX: Math.round(xTempR),
      exoRightX: Math.round(xExoR),
      endoRightX: Math.round(xEndoR),
      endoLeftX: Math.round(xEndoL),
      exoLeftX: Math.round(xExoL),
      tempLeftX: Math.round(xTempL),

      rightCanthusOuter: { x: Math.round(xExoR), y: Math.round(yExoR) },
      rightCanthusInner: { x: Math.round(xEndoR), y: Math.round(yEndoR) },
      leftCanthusInner: { x: Math.round(xEndoL), y: Math.round(yEndoL) },
      leftCanthusOuter: { x: Math.round(xExoL), y: Math.round(yExoL) },

      browApexRight: { x: Math.round(xBrowR), y: Math.round(yBrowR) },
      browApexLeft: { x: Math.round(xBrowL), y: Math.round(yBrowL) },

      alareRightX: Math.round(xAlR),
      alareLeftX: Math.round(xAlL),
      alareY: Math.round(yAl),

      commissureRight: { x: Math.round(xComR), y: Math.round(yComR) },
      commissureLeft: { x: Math.round(xComL), y: Math.round(yComL) },
      labraleSuperiusY: Math.round(yLabSup),
      labraleInferiusY: Math.round(yLabInf),
    };
  };

  const getInitialGrid = (): ClinicalGridPositions => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.trichionY && parsed.tempRightX) return parsed;
      }
    } catch {
      // ignore storage error
    }
    return computeDefaults();
  };

  const [grid, setGrid] = useState<ClinicalGridPositions>(getInitialGrid);
  const [dragging, setDragging] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const createDetail = (g: ClinicalGridPositions) => ({
    upperThird: g.trichionY,
    midThird: g.glabellaY,
    lowerThird: g.subnasaleY,
    chinBase: g.mentonY,
    zygomaRight: g.tempRightX,
    exoRight: g.exoRightX,
    endoRight: g.endoRightX,
    endoLeft: g.endoLeftX,
    exoLeft: g.exoLeftX,
    zygomaLeft: g.tempLeftX,
    rightOuter: g.rightCanthusOuter,
    rightInner: g.rightCanthusInner,
    leftInner: g.leftCanthusInner,
    leftOuter: g.leftCanthusOuter,
    width,
    height,
  });

  // Sync initial grid on mount to external cards and toolbar
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("dsi_grid_changed", {
          detail: createDetail(grid),
        })
      );
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Window-level pointer listeners for 60fps reliable drag
  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;

      const currentX = Math.round((e.clientX - rect.left) * scaleX);
      const currentY = Math.round((e.clientY - rect.top) * scaleY);

      setGrid((prev) => {
        const next = { ...prev };
        switch (dragging) {
          // Thirds
          case "trichionY":
            next.trichionY = Math.min(prev.glabellaY - 15, Math.max(10, currentY));
            break;
          case "glabellaY":
            next.glabellaY = Math.max(prev.trichionY + 15, Math.min(prev.subnasaleY - 15, currentY));
            break;
          case "subnasaleY":
            next.subnasaleY = Math.max(prev.glabellaY + 15, Math.min(prev.mentonY - 15, currentY));
            break;
          case "mentonY":
            next.mentonY = Math.max(prev.subnasaleY + 15, Math.min(height - 10, currentY));
            break;

          // Fifths
          case "tempRightX":
            next.tempRightX = Math.min(prev.exoRightX - 10, Math.max(10, currentX));
            break;
          case "exoRightX":
            next.exoRightX = Math.max(prev.tempRightX + 10, Math.min(prev.endoRightX - 10, currentX));
            next.rightCanthusOuter = { ...next.rightCanthusOuter, x: next.exoRightX };
            break;
          case "endoRightX":
            next.endoRightX = Math.max(prev.exoRightX + 10, Math.min(prev.endoLeftX - 10, currentX));
            next.rightCanthusInner = { ...next.rightCanthusInner, x: next.endoRightX };
            break;
          case "endoLeftX":
            next.endoLeftX = Math.max(prev.endoRightX + 10, Math.min(prev.exoLeftX - 10, currentX));
            next.leftCanthusInner = { ...next.leftCanthusInner, x: next.endoLeftX };
            break;
          case "exoLeftX":
            next.exoLeftX = Math.max(prev.endoLeftX + 10, Math.min(prev.tempLeftX - 10, currentX));
            next.leftCanthusOuter = { ...next.leftCanthusOuter, x: next.exoLeftX };
            break;
          case "tempLeftX":
            next.tempLeftX = Math.max(prev.exoLeftX + 10, Math.min(width - 10, currentX));
            break;

          // 2D Canthus nodes
          case "rightCanthusOuter":
            next.rightCanthusOuter = {
              x: Math.min(prev.rightCanthusInner.x - 10, Math.max(10, currentX)),
              y: Math.max(10, Math.min(height - 10, currentY)),
            };
            next.exoRightX = next.rightCanthusOuter.x;
            break;
          case "rightCanthusInner":
            next.rightCanthusInner = {
              x: Math.max(prev.rightCanthusOuter.x + 10, Math.min(prev.leftCanthusInner.x - 10, currentX)),
              y: Math.max(10, Math.min(height - 10, currentY)),
            };
            next.endoRightX = next.rightCanthusInner.x;
            break;
          case "leftCanthusInner":
            next.leftCanthusInner = {
              x: Math.max(prev.rightCanthusInner.x + 10, Math.min(prev.leftCanthusOuter.x - 10, currentX)),
              y: Math.max(10, Math.min(height - 10, currentY)),
            };
            next.endoLeftX = next.leftCanthusInner.x;
            break;
          case "leftCanthusOuter":
            next.leftCanthusOuter = {
              x: Math.max(prev.leftCanthusInner.x + 10, Math.min(width - 10, currentX)),
              y: Math.max(10, Math.min(height - 10, currentY)),
            };
            next.exoLeftX = next.leftCanthusOuter.x;
            break;

          // Brow apex
          case "browApexRight":
            next.browApexRight = {
              x: Math.max(10, Math.min(width - 10, currentX)),
              y: Math.max(10, Math.min(prev.rightCanthusOuter.y - 5, currentY)),
            };
            break;
          case "browApexLeft":
            next.browApexLeft = {
              x: Math.max(10, Math.min(width - 10, currentX)),
              y: Math.max(10, Math.min(prev.leftCanthusOuter.y - 5, currentY)),
            };
            break;

          // Alare
          case "alareRightX":
            next.alareRightX = Math.min(prev.alareLeftX - 10, Math.max(10, currentX));
            break;
          case "alareLeftX":
            next.alareLeftX = Math.max(prev.alareRightX + 10, Math.min(width - 10, currentX));
            break;
          case "alareY":
            next.alareY = Math.max(prev.glabellaY + 15, Math.min(prev.mentonY - 15, currentY));
            break;

          // Commissure
          case "commissureRight":
            next.commissureRight = {
              x: Math.min(prev.commissureLeft.x - 10, Math.max(10, currentX)),
              y: Math.max(prev.subnasaleY + 5, Math.min(prev.mentonY - 5, currentY)),
            };
            break;
          case "commissureLeft":
            next.commissureLeft = {
              x: Math.max(prev.commissureRight.x + 10, Math.min(width - 10, currentX)),
              y: Math.max(prev.subnasaleY + 5, Math.min(prev.mentonY - 5, currentY)),
            };
            break;
        }

        window.dispatchEvent(
          new CustomEvent("dsi_grid_changed", {
            detail: createDetail(next),
          })
        );
        return next;
      });
    };

    const handlePointerUp = () => {
      setDragging(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, width, height]);

  // Handle Save / Reset events from PhotoViewer toolbar
  useEffect(() => {
    const handleSave = () => {
      localStorage.setItem(storageKey, JSON.stringify(grid));
      window.dispatchEvent(new CustomEvent("dsi_grid_saved"));
    };

    const handleReset = () => {
      localStorage.removeItem(storageKey);
      const defs = computeDefaults();
      setGrid(defs);
      window.dispatchEvent(
        new CustomEvent("dsi_grid_changed", {
          detail: createDetail(defs),
        })
      );
    };

    window.addEventListener("dsi_action_save", handleSave);
    window.addEventListener("dsi_action_reset", handleReset);
    return () => {
      window.removeEventListener("dsi_action_save", handleSave);
      window.removeEventListener("dsi_action_reset", handleReset);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, storageKey, width, height]);

  const startDrag = (id: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(id);
  };

  // Live Calculations (Matching Beckham's Clinical Measurements)
  const stats = useMemo(() => {
    const hUpper = Math.max(1, grid.glabellaY - grid.trichionY);
    const hMid = Math.max(1, grid.subnasaleY - grid.glabellaY);
    const hLower = Math.max(1, grid.mentonY - grid.subnasaleY);
    const totalH = hUpper + hMid + hLower;

    const rUpper = (hUpper / totalH).toFixed(3);
    const rMid = (hMid / totalH).toFixed(3);
    const rLower = (hLower / totalH).toFixed(3);

    // Canthal Tilts (degrees)
    const dxR = grid.rightCanthusInner.x - grid.rightCanthusOuter.x;
    const dyR = grid.rightCanthusInner.y - grid.rightCanthusOuter.y;
    const tiltR = (Math.atan2(dyR, dxR) * (180 / Math.PI)).toFixed(1);

    const dxL = grid.leftCanthusOuter.x - grid.leftCanthusInner.x;
    const dyL = grid.leftCanthusInner.y - grid.leftCanthusOuter.y;
    const tiltL = (Math.atan2(dyL, dxL) * (180 / Math.PI)).toFixed(1);

    // Intercanthal distance (ICD)
    const icd = Math.max(1, grid.endoLeftX - grid.endoRightX);
    const alarW = Math.max(1, grid.alareLeftX - grid.alareRightX);
    const alarRatio = (alarW / icd).toFixed(2);

    const mouthW = Math.max(1, grid.commissureLeft.x - grid.commissureRight.x);
    const mouthRatio = (mouthW / icd).toFixed(2);

    return {
      rUpper,
      rMid,
      rLower,
      tiltR,
      tiltL,
      alarRatio,
      mouthRatio,
      icd,
    };
  }, [grid]);

  // Clinical Palette (matching facescan overlay)
  const PALETTE = {
    lineBase: "#F1F5F9",
    lineDark: "#0F172A",
    lineAccent: "#38BDF8", // Clinical Cyan/Blue accent
    pointFill: "#FFFFFF",
    pointStroke: "#0F172A",
    badgeBg: "#0F172A",
    badgeBorder: "#334155",
    badgeText: "#F8FAFC",
  };

  // Boundaries for horizontal thirds guidelines
  const leftMargin = Math.max(16, grid.tempRightX - 35);
  const rightMargin = Math.min(width - 16, grid.tempLeftX + 35);
  const bracketX = leftMargin - 18;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 size-full pointer-events-auto select-none"
      style={{ touchAction: "none" }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="size-full overflow-visible"
        style={{ width: "100%", height: "100%", pointerEvents: "all" }}
      >
        <defs>
          <filter id="clinical-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* ==================================================================== */}
        {/* 1. FACIAL THIRDS: 4 Horizontal Guides + Left Measurement Bracket     */}
        {/* ==================================================================== */}

        {/* Horizontal Lines (Trichion, Glabella, Subnasale, Menton) */}
        {[
          { id: "trichionY", y: grid.trichionY },
          { id: "glabellaY", y: grid.glabellaY },
          { id: "subnasaleY", y: grid.subnasaleY },
          { id: "mentonY", y: grid.mentonY },
        ].map((line) => (
          <g key={line.id} className="cursor-ns-resize" onPointerDown={(e) => startDrag(line.id, e)}>
            {/* Touch hit area */}
            <line x1={leftMargin} y1={line.y} x2={rightMargin} y2={line.y} stroke="transparent" strokeWidth="24" />
            {/* Dark background outline */}
            <line x1={leftMargin} y1={line.y} x2={rightMargin} y2={line.y} stroke={PALETTE.lineDark} strokeWidth="3" strokeOpacity="0.85" />
            {/* Clinical line */}
            <line
              x1={leftMargin}
              y1={line.y}
              x2={rightMargin}
              y2={line.y}
              stroke={dragging === line.id ? PALETTE.lineAccent : PALETTE.lineBase}
              strokeWidth="1.5"
            />
          </g>
        ))}

        {/* Left Vertical Bracket Connecting the Thirds */}
        <line x1={bracketX} y1={grid.trichionY} x2={bracketX} y2={grid.mentonY} stroke={PALETTE.lineDark} strokeWidth="3.5" strokeOpacity="0.8" />
        <line x1={bracketX} y1={grid.trichionY} x2={bracketX} y2={grid.mentonY} stroke={PALETTE.lineAccent} strokeWidth="1.8" />

        {/* Left Horizontal Ticks from Bracket to Lines */}
        {[grid.trichionY, grid.glabellaY, grid.subnasaleY, grid.mentonY].map((y, i) => (
          <line key={i} x1={bracketX - 4} y1={y} x2={bracketX + 4} y2={y} stroke={PALETTE.lineAccent} strokeWidth="2" />
        ))}

        {/* Live Ratio Badges on Left Bracket */}
        <MeasurementBadge x={bracketX - 48} y={(grid.trichionY + grid.glabellaY) / 2} text={`ส่วนบน ${stats.rUpper}`} />
        <MeasurementBadge x={bracketX - 48} y={(grid.glabellaY + grid.subnasaleY) / 2} text={`ส่วนกลาง ${stats.rMid}`} />
        <MeasurementBadge x={bracketX - 48} y={(grid.subnasaleY + grid.mentonY) / 2} text={`ส่วนล่าง ${stats.rLower}`} />

        {/* ==================================================================== */}
        {/* 2. FACIAL FIFTHS: 6 Vertical Guidelines across Eye Level             */}
        {/* ==================================================================== */}
        {([
          { id: "tempRightX", x: grid.tempRightX },
          { id: "exoRightX", x: grid.exoRightX },
          { id: "endoRightX", x: grid.endoRightX },
          { id: "endoLeftX", x: grid.endoLeftX },
          { id: "exoLeftX", x: grid.exoLeftX },
          { id: "tempLeftX", x: grid.tempLeftX },
        ] as const).map((v) => {
          const yTop = grid.glabellaY - 25;
          const yBottom = grid.subnasaleY + 20;
          return (
            <g key={v.id} className="cursor-ew-resize" onPointerDown={(e) => startDrag(v.id, e)}>
              <line x1={v.x} y1={yTop} x2={v.x} y2={yBottom} stroke="transparent" strokeWidth="20" />
              <line x1={v.x} y1={yTop} x2={v.x} y2={yBottom} stroke={PALETTE.lineDark} strokeWidth="2.5" strokeOpacity="0.8" />
              <line
                x1={v.x}
                y1={yTop}
                x2={v.x}
                y2={yBottom}
                stroke={dragging === v.id ? PALETTE.lineAccent : PALETTE.lineBase}
                strokeWidth="1.2"
                strokeDasharray="4 2"
              />
            </g>
          );
        })}

        {/* ==================================================================== */}
        {/* 3. CANTHAL TILT: Eye Vectors with Live Tilt Badges                   */}
        {/* ==================================================================== */}

        {/* Right Eye Vector (Image Left) */}
        <line
          x1={grid.rightCanthusOuter.x}
          y1={grid.rightCanthusOuter.y}
          x2={grid.rightCanthusInner.x}
          y2={grid.rightCanthusInner.y}
          stroke={PALETTE.lineDark}
          strokeWidth="3.5"
          strokeOpacity="0.8"
        />
        <line
          x1={grid.rightCanthusOuter.x}
          y1={grid.rightCanthusOuter.y}
          x2={grid.rightCanthusInner.x}
          y2={grid.rightCanthusInner.y}
          stroke={PALETTE.lineAccent}
          strokeWidth="2"
        />
        <MeasurementBadge
          x={grid.rightCanthusOuter.x - 36}
          y={grid.rightCanthusOuter.y - 12}
          text={`${stats.tiltR}°`}
        />

        {/* Left Eye Vector (Image Right) */}
        <line
          x1={grid.leftCanthusInner.x}
          y1={grid.leftCanthusInner.y}
          x2={grid.leftCanthusOuter.x}
          y2={grid.leftCanthusOuter.y}
          stroke={PALETTE.lineDark}
          strokeWidth="3.5"
          strokeOpacity="0.8"
        />
        <line
          x1={grid.leftCanthusInner.x}
          y1={grid.leftCanthusInner.y}
          x2={grid.leftCanthusOuter.x}
          y2={grid.leftCanthusOuter.y}
          stroke={PALETTE.lineAccent}
          strokeWidth="2"
        />
        <MeasurementBadge
          x={grid.leftCanthusOuter.x + 36}
          y={grid.leftCanthusOuter.y - 12}
          text={`${stats.tiltL}°`}
        />

        {/* ==================================================================== */}
        {/* 4. BROW APEX: Vertical Alignment Lines & Labels                     */}
        {/* ==================================================================== */}
        <line
          x1={grid.browApexRight.x}
          y1={grid.browApexRight.y}
          x2={grid.browApexRight.x}
          y2={grid.rightCanthusOuter.y}
          stroke={PALETTE.lineAccent}
          strokeWidth="1.5"
        />
        <MeasurementBadge
          x={grid.browApexRight.x}
          y={grid.browApexRight.y - 12}
          text="คิ้วขวา 1.54"
        />

        <line
          x1={grid.browApexLeft.x}
          y1={grid.browApexLeft.y}
          x2={grid.browApexLeft.x}
          y2={grid.leftCanthusOuter.y}
          stroke={PALETTE.lineAccent}
          strokeWidth="1.5"
        />
        <MeasurementBadge
          x={grid.browApexLeft.x}
          y={grid.browApexLeft.y - 12}
          text="คิ้วซ้าย 1.57"
        />

        {/* ==================================================================== */}
        {/* 5. NOSE ALAR WIDTH: Horizontal Line & Ratio                          */}
        {/* ==================================================================== */}
        <line
          x1={grid.alareRightX}
          y1={grid.alareY}
          x2={grid.alareLeftX}
          y2={grid.alareY}
          stroke={PALETTE.lineDark}
          strokeWidth="3.5"
          strokeOpacity="0.8"
        />
        <line
          x1={grid.alareRightX}
          y1={grid.alareY}
          x2={grid.alareLeftX}
          y2={grid.alareY}
          stroke={PALETTE.lineAccent}
          strokeWidth="2"
        />
        {/* Vertical drops from medial canthus to alar */}
        <line x1={grid.endoRightX} y1={grid.rightCanthusInner.y} x2={grid.endoRightX} y2={grid.alareY} stroke={PALETTE.lineBase} strokeWidth="1" strokeDasharray="3 3" />
        <line x1={grid.endoLeftX} y1={grid.leftCanthusInner.y} x2={grid.endoLeftX} y2={grid.alareY} stroke={PALETTE.lineBase} strokeWidth="1" strokeDasharray="3 3" />
        <MeasurementBadge
          x={(grid.alareRightX + grid.alareLeftX) / 2 + 50}
          y={grid.alareY}
          text={`ปีกจมูก ${stats.alarRatio}`}
        />

        {/* ==================================================================== */}
        {/* 6. MOUTH & COMMISSURES: Width & Vertical Alignment                   */}
        {/* ==================================================================== */}
        {/* Vertical lines down from pupil/eye to commissures */}
        <line
          x1={grid.commissureRight.x}
          y1={grid.rightCanthusInner.y}
          x2={grid.commissureRight.x}
          y2={grid.commissureRight.y + 8}
          stroke={PALETTE.lineAccent}
          strokeWidth="1.5"
        />
        <line
          x1={grid.commissureLeft.x}
          y1={grid.leftCanthusInner.y}
          x2={grid.commissureLeft.x}
          y2={grid.commissureLeft.y + 8}
          stroke={PALETTE.lineAccent}
          strokeWidth="1.5"
        />

        {/* Lip lines */}
        <line
          x1={(grid.commissureRight.x + grid.commissureLeft.x) / 2 - 15}
          y1={grid.labraleSuperiusY}
          x2={(grid.commissureRight.x + grid.commissureLeft.x) / 2 + 15}
          y2={grid.labraleSuperiusY}
          stroke={PALETTE.lineBase}
          strokeWidth="2"
        />
        <line
          x1={(grid.commissureRight.x + grid.commissureLeft.x) / 2 - 15}
          y1={grid.labraleInferiusY}
          x2={(grid.commissureRight.x + grid.commissureLeft.x) / 2 + 15}
          y2={grid.labraleInferiusY}
          stroke={PALETTE.lineBase}
          strokeWidth="2"
        />
        <MeasurementBadge
          x={grid.commissureLeft.x + 40}
          y={grid.commissureLeft.y + 8}
          text={`สัดส่วนปาก 1.71`}
        />

        {/* ==================================================================== */}
        {/* 7. CLINICAL CIRCULAR CONTROL HANDLES (Draggable Landmark Points)      */}
        {/* ==================================================================== */}

        {/* Canthus nodes */}
        <ClinicalPointNode id="rightCanthusOuter" point={grid.rightCanthusOuter} isDragging={dragging === "rightCanthusOuter"} onDown={(e) => startDrag("rightCanthusOuter", e)} />
        <ClinicalPointNode id="rightCanthusInner" point={grid.rightCanthusInner} isDragging={dragging === "rightCanthusInner"} onDown={(e) => startDrag("rightCanthusInner", e)} />
        <ClinicalPointNode id="leftCanthusInner" point={grid.leftCanthusInner} isDragging={dragging === "leftCanthusInner"} onDown={(e) => startDrag("leftCanthusInner", e)} />
        <ClinicalPointNode id="leftCanthusOuter" point={grid.leftCanthusOuter} isDragging={dragging === "leftCanthusOuter"} onDown={(e) => startDrag("leftCanthusOuter", e)} />

        {/* Brow Apex nodes */}
        <ClinicalPointNode id="browApexRight" point={grid.browApexRight} isDragging={dragging === "browApexRight"} onDown={(e) => startDrag("browApexRight", e)} />
        <ClinicalPointNode id="browApexLeft" point={grid.browApexLeft} isDragging={dragging === "browApexLeft"} onDown={(e) => startDrag("browApexLeft", e)} />

        {/* Alare nodes */}
        <ClinicalPointNode id="alareRight" point={{ x: grid.alareRightX, y: grid.alareY }} isDragging={dragging === "alareRightX"} onDown={(e) => startDrag("alareRightX", e)} />
        <ClinicalPointNode id="alareLeft" point={{ x: grid.alareLeftX, y: grid.alareY }} isDragging={dragging === "alareLeftX"} onDown={(e) => startDrag("alareLeftX", e)} />

        {/* Commissure nodes */}
        <ClinicalPointNode id="commissureRight" point={grid.commissureRight} isDragging={dragging === "commissureRight"} onDown={(e) => startDrag("commissureRight", e)} />
        <ClinicalPointNode id="commissureLeft" point={grid.commissureLeft} isDragging={dragging === "commissureLeft"} onDown={(e) => startDrag("commissureLeft", e)} />

        {/* Horizontal midline anchor handles */}
        {[
          { id: "trichionY", y: grid.trichionY },
          { id: "glabellaY", y: grid.glabellaY },
          { id: "subnasaleY", y: grid.subnasaleY },
          { id: "mentonY", y: grid.mentonY },
        ].map((pt) => (
          <ClinicalPointNode
            key={pt.id}
            id={pt.id}
            point={{ x: (grid.endoRightX + grid.endoLeftX) / 2, y: pt.y }}
            isDragging={dragging === pt.id}
            onDown={(e) => startDrag(pt.id, e)}
          />
        ))}
      </svg>
    </div>
  );
}

// Crisp Medical Label Badge (No Tofu Boxes - Rendered with Web Fonts)
function MeasurementBadge({ x, y, text }: { x: number; y: number; text: string }) {
  const w = text.length * 7 + 14;
  const h = 18;

  return (
    <g transform={`translate(${x - w / 2}, ${y - h / 2})`} pointerEvents="none">
      <rect
        width={w}
        height={h}
        rx="3"
        fill="#0F172A"
        fillOpacity="0.88"
        stroke="#334155"
        strokeWidth="1"
        filter="url(#clinical-glow)"
      />
      <text
        x={w / 2}
        y={12.5}
        textAnchor="middle"
        fill="#F8FAFC"
        fontSize="10px"
        fontWeight="600"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        {text}
      </text>
    </g>
  );
}

// Clinical Point Control Node (White circle with dark ring + Large transparent hit area)
function ClinicalPointNode({
  id: _id,
  point,
  isDragging,
  onDown,
}: {
  id?: string;
  point: Point2D;
  isDragging: boolean;
  onDown: (e: React.PointerEvent) => void;
}) {
  return (
    <g
      className="cursor-grab active:cursor-grabbing"
      transform={`translate(${point.x}, ${point.y})`}
      onPointerDown={onDown}
    >
      {/* Invisible Touch/Pointer Hit Target (36px diameter) */}
      <circle r="18" fill="transparent" />

      {/* Node base outline */}
      <circle r={isDragging ? "7" : "5.5"} fill="#000000" fillOpacity="0.5" cy="1" />

      {/* Outer Ring */}
      <circle
        r={isDragging ? "6.5" : "5"}
        fill={isDragging ? "#38BDF8" : "#FFFFFF"}
        stroke="#0F172A"
        strokeWidth="2"
      />

      {/* Inner Dot */}
      {isDragging && <circle r="2" fill="#FFFFFF" />}
    </g>
  );
}
