import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import type { HarmonyScore, Result } from "../../api/schemas";

interface Props {
  harmony?: HarmonyScore | null;
  result?: Result | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DsiGridState = Record<string, any>;

export function HarmonyCard({ harmony, result }: Props) {
  // Listen to live DSI grid changes and local storage
  const [dsiGrid, setDsiGrid] = useState<DsiGridState | null>(() => {
    if (!result?.image) return null;
    const storageKey = `dsi_clinical_grid_${result.image.width}x${result.image.height}`;
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleGridChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setDsiGrid(detail);
      }
    };
    window.addEventListener("dsi_grid_changed", handleGridChanged);
    return () => window.removeEventListener("dsi_grid_changed", handleGridChanged);
  }, []);

  if (!harmony) return null;

  // Compute scores directly from 4 Anatomical Regions (Rule of Thirds, Canthal, Nasal, Perioral)
  let vThirdsScore = harmony.subscores.vertical_thirds;
  let canthalScore = harmony.subscores.symmetry;
  let nasalScore = harmony.subscores.transverse_fifths;
  let perioralScore = harmony.subscores.lip_harmony;

  if (dsiGrid && result) {
    const yUpper = dsiGrid.trichionY ?? dsiGrid.upperThird;
    const yMid = dsiGrid.glabellaY ?? dsiGrid.midThird;
    const yLower = dsiGrid.subnasaleY ?? dsiGrid.lowerThird;
    const yChin = dsiGrid.mentonY ?? dsiGrid.chinBase;

    if (yUpper && yMid && yLower && yChin) {
      const hUpper = Math.max(1, yMid - yUpper);
      const hMid = Math.max(1, yLower - yMid);
      const hLower = Math.max(1, yChin - yLower);
      const totalH = hUpper + hMid + hLower;

      const uPct = (hUpper / totalH) * 100;
      const mPct = (hMid / totalH) * 100;
      const lPct = (hLower / totalH) * 100;

      // 1. Thirds Score (Target 33.3% each)
      const devThirds = (Math.abs(uPct - 33.3) + Math.abs(mPct - 33.3) + Math.abs(lPct - 33.3)) / 3;
      vThirdsScore = Math.max(10, Math.min(100, Math.round(100 * Math.exp(-0.5 * Math.pow(devThirds / 4.0, 2)))));
    }

    // 2. Canthal Tilt Score (Target 5-8 deg)
    const rOuter = dsiGrid.rightCanthusOuter ?? dsiGrid.rightOuter;
    const rInner = dsiGrid.rightCanthusInner ?? dsiGrid.rightInner;
    const lInner = dsiGrid.leftCanthusInner ?? dsiGrid.leftInner;
    const lOuter = dsiGrid.leftCanthusOuter ?? dsiGrid.leftOuter;

    if (rOuter && rInner && lInner && lOuter) {
      const dxR = rOuter.x - rInner.x;
      const dyR = -(rOuter.y - rInner.y);
      const tiltR = dxR !== 0 ? Math.abs((Math.atan2(dyR, Math.abs(dxR)) * 180) / Math.PI) : 6.0;

      const dxL = lOuter.x - lInner.x;
      const dyL = -(lOuter.y - lInner.y);
      const tiltL = dxL !== 0 ? Math.abs((Math.atan2(dyL, Math.abs(dxL)) * 180) / Math.PI) : 6.0;

      const meanTilt = (tiltR + tiltL) / 2;
      const devTilt = Math.abs(meanTilt - 6.5);
      canthalScore = Math.max(15, Math.min(100, Math.round(100 * Math.exp(-0.5 * Math.pow(devTilt / 3.0, 2)))));
    }

    // 3. Nasal Dimensions Score (Target Nasal Index 0.75)
    const alareR = dsiGrid.alareRightX ?? result.landmarks.alare_right?.x ?? 0;
    const alareL = dsiGrid.alareLeftX ?? result.landmarks.alare_left?.x ?? 0;
    const alarW = Math.abs(alareL - alareR);
    const snY = dsiGrid.subnasaleY ?? result.landmarks.subnasale?.y ?? 0;
    const nY = dsiGrid.glabellaY ?? result.landmarks.nasion?.y ?? 0;
    const nLen = Math.abs(snY - nY);

    if (alarW > 0 && nLen > 0) {
      const nIndex = alarW / nLen;
      const devNasal = Math.abs(nIndex - 0.75);
      nasalScore = Math.max(15, Math.min(100, Math.round(100 * Math.exp(-0.5 * Math.pow(devNasal / 0.15, 2)))));
    }

    // 4. Perioral Score (Mouth to Nose Ratio target 1.35)
    const comR = dsiGrid.commissureRight?.x ?? result.landmarks.commissure_right?.x ?? 0;
    const comL = dsiGrid.commissureLeft?.x ?? result.landmarks.commissure_left?.x ?? 0;
    const mW = Math.abs(comL - comR);
    if (mW > 0 && alarW > 0) {
      const mnRatio = mW / alarW;
      const devPerioral = Math.abs(mnRatio - 1.35);
      perioralScore = Math.max(15, Math.min(100, Math.round(100 * Math.exp(-0.5 * Math.pow(devPerioral / 0.25, 2)))));
    }
  }

  // Weighted overall calculation from 4 Anatomical Regions (0.25 equal weight aligned with backend)
  const overall =
    dsiGrid && result
      ? Math.round((vThirdsScore + nasalScore + perioralScore + canthalScore) / 4)
      : Math.round(harmony.overall);
  const overallPct = overall;

  const getHarmonyBadge = (score: number) => {
    if (score >= 85) return "สัดส่วนทองคำยอดเยี่ยม (Golden Ratio)";
    if (score >= 70) return "สัดส่วนสมดุลดี (Well Balanced)";
    if (score >= 50) return "สัดส่วนระดับปานกลาง (Moderate)";
    return "สัดส่วนควรพิจารณาปรับสมดุล (Needs Attention)";
  };

  const subscoreItems = [
    {
      id: "vertical_thirds",
      title: "1. สัดส่วน 3 ส่วนแนวดิ่ง (Vertical Thirds)",
      score: vThirdsScore,
      description: "ความสมดุลความสูงหน้าผาก กลางหน้า และคางล่าง (33.3% : 33.3% : 33.3%)",
    },
    {
      id: "transverse_fifths",
      title: "2. สัดส่วน 5 ส่วนแนวนอน (Transverse Fifths)",
      score: nasalScore,
      description: "อัตราส่วนความกว้างปีกจมูกต่อความยาวสันจมูก (Nasal Index)",
    },
    {
      id: "lip_harmony",
      title: "3. สัดส่วนริมฝีปาก (Lip Harmony)",
      score: perioralScore,
      description: "สัดส่วนความกว้างปากต่อจมูก และความสมส่วนของริมฝีปาก",
    },
    {
      id: "symmetry",
      title: "4. ความสมมาตรซ้าย-ขวา (Facial Symmetry)",
      score: canthalScore,
      description: "มุมองศาหางตาเฉลี่ยสองข้าง และความสมดุลระนาบดวงตา (5° - 8°)",
    },
  ];

  return (
    <div className="border border-line bg-surface p-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <div>
            <h3 className="text-sm font-semibold text-ink">
              คะแนนสัดส่วน 4 บริเวณหลัก
            </h3>
            <p className="text-sm text-ink-2">
              ประเมินจากสัดส่วน 3 ส่วน, จมูก, ริมฝีปาก และมุมองศาดวงตา (อัปเดตแบบ Dynamic ตามเส้นวัดคลินิก)
            </p>
          </div>
        </div>
        <span className="border border-line bg-paper px-2 py-1 text-sm text-ink-2">
          {overallPct}%
        </span>
      </div>

      {/* Overall score hero banner */}
      <div className="mt-4 border border-line bg-paper p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-ink-2">คะแนนความกลมกลืนโดยรวม</div>
            <div className="text-base font-semibold text-ink">
              {overallPct}% <span className="text-sm font-normal text-accent">— {getHarmonyBadge(overallPct)}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-base font-semibold text-accent">{overallPct}</span>
            <span className="text-sm text-ink-3"> / 100</span>
          </div>
        </div>
        <div className="mt-2 h-2 w-full bg-line overflow-hidden">
          <div
            className="h-2 bg-accent transition-all"
            style={{ width: `${Math.min(100, Math.max(0, overallPct))}%` }}
          />
        </div>
      </div>

      {/* Subscores Grid */}
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {subscoreItems.map((item) => {
          const pct = Math.round(item.score);
          return (
            <div key={item.id} className="border border-line bg-paper p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-ink">{item.title}</div>
                <span className="text-sm font-semibold text-accent">{pct}%</span>
              </div>
              <div className="mt-2 h-2 w-full bg-line overflow-hidden">
                <div
                  className="h-2 bg-accent transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-ink-3">{item.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
