import { useEffect, useState } from "react";
import { Sparkles, BrainCircuit, ChevronDown, CheckCircle2, AlertCircle } from "lucide-react";
import type { HarmonyScore, AIHarmonyResult, Result } from "../../api/schemas";
import { cx } from "../ui/cx";

interface Props {
  harmony?: HarmonyScore | null;
  aiHarmony?: AIHarmonyResult | null;
  result?: Result | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DsiGridState = Record<string, any>;

export function HarmonyCard({ harmony, aiHarmony, result }: Props) {
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

  const [isShapOpen, setIsShapOpen] = useState(false);

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

  if (!harmony && !aiHarmony) return null;

  // Compute scores directly from 4 Anatomical Regions (Rule of Thirds, Canthal, Nasal, Perioral)
  let vThirdsScore = harmony?.subscores.vertical_thirds ?? 0;
  let canthalScore = harmony?.subscores.symmetry ?? 0;
  let nasalScore = harmony?.subscores.transverse_fifths ?? 0;
  let perioralScore = harmony?.subscores.lip_harmony ?? 0;

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
      : Math.round(harmony?.overall ?? 0);
  const overallPct = overall;

  const aiScore = aiHarmony ? Math.round(aiHarmony.overall_score) : null;
  const aiPercentile = aiHarmony ? Math.round(aiHarmony.percentile) : null;
  const topPct = aiPercentile !== null ? Math.max(1, 100 - aiPercentile) : null;

  const getHarmonyBadge = (score: number) => {
    if (score >= 85) return "สัดส่วนทองคำยอดเยี่ยม";
    if (score >= 70) return "สัดส่วนสมดุลดี";
    if (score >= 50) return "สัดส่วนระดับปานกลาง";
    return "สัดส่วนควรพิจารณาปรับสมดุล";
  };

  const subscoreItems = [
    {
      id: "vertical_thirds",
      title: "1. สัดส่วน 3 ส่วนแนวดิ่ง",
      score: vThirdsScore,
      description: "ความสมดุลความสูงหน้าผาก กลางหน้า และคางล่าง (33.3% : 33.3% : 33.3%)",
    },
    {
      id: "transverse_fifths",
      title: "2. สัดส่วน 5 ส่วนแนวนอน",
      score: nasalScore,
      description: "อัตราส่วนความกว้างปีกจมูกต่อความยาวสันจมูก",
    },
    {
      id: "lip_harmony",
      title: "3. สัดส่วนริมฝีปาก",
      score: perioralScore,
      description: "สัดส่วนความกว้างปากต่อจมูก และความสมส่วนของริมฝีปาก",
    },
    {
      id: "symmetry",
      title: "4. ความสมมาตรซ้าย-ขวา",
      score: canthalScore,
      description: "มุมองศาหางตาเฉลี่ยสองข้าง และความสมดุลระนาบดวงตา (5° - 8°)",
    },
  ];

  return (
    <div className="border border-line bg-surface p-4 overflow-hidden break-words">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-ink">
              {aiHarmony && harmony
                ? "สัดส่วนและความกลมกลืนใบหน้า"
                : aiHarmony
                  ? "ความกลมกลืนใบหน้า"
                  : "คะแนนสัดส่วน 4 บริเวณหลัก"}
            </h3>
            <p className="text-sm text-ink-2">
              {aiHarmony && harmony
                ? "เปรียบเทียบมาตรฐานสูตรคลินิก และการประเมินด้วย AI Benchmark"
                : aiHarmony
                  ? "ประเมินความกลมกลืนและสัดส่วนใบหน้าด้วยโมเดล AI Benchmark"
                  : "ประเมินจากสัดส่วน 3 ส่วน, จมูก, ริมฝีปาก และมุมองศาดวงตา (อัปเดตแบบ Dynamic ตามเส้นวัดคลินิก)"}
            </p>
          </div>
        </div>
        <span className="border border-line bg-paper px-2 py-1 text-sm font-semibold text-ink-2">
          {harmony ? `${overallPct}%` : `${aiScore}%`}
        </span>
      </div>

      {/* 1. Clinical Geometric Score Banner (มาตรฐานสูตรคลินิก) */}
      {harmony && (
        <div className="mt-4 border border-line bg-paper p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-ink-2">
                มาตรฐานสูตรคลินิก
              </div>
              <div className="text-base font-semibold text-ink">
                {overallPct}% <span className="text-sm font-normal text-accent">— {getHarmonyBadge(overallPct)}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-semibold text-accent">{overallPct}</span>
              <span className="text-sm text-ink-3"> / 100</span>
            </div>
          </div>
          <div className="mt-2 h-2 w-full bg-line overflow-hidden rounded-control">
            <div
              className="h-2 bg-accent rounded-control transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, overallPct))}%` }}
            />
          </div>
        </div>
      )}

      {/* 2. Subscores Grid (คะแนนย่อย 4 บริเวณหลัก) - Placed directly beneath มาตรฐานสูตรคลินิก */}
      {harmony && (
        <div className="mt-3">
          <div className="flex items-center justify-between pb-1">
            <h4 className="text-sm font-semibold text-ink">
              คะแนนย่อย 4 บริเวณหลัก
            </h4>
            <span className="text-sm text-ink-3">Dynamic Clinical Grid</span>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
            {subscoreItems.map((item) => {
              const pct = Math.round(item.score);
              return (
                <div key={item.id} className="border border-line bg-paper p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-ink">{item.title}</div>
                    <span className="text-sm font-semibold text-accent">{pct}%</span>
                  </div>
                  <div className="mt-2 h-2 w-full bg-line overflow-hidden rounded-control">
                    <div
                      className="h-2 bg-accent rounded-control transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-ink-3">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. AI Perceptual Harmony Score Banner (การประเมินด้วย AI Benchmark) */}
      {aiHarmony && (
        <div className="mt-4 border border-line bg-paper p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit size={16} className="text-accent shrink-0" />
              <div>
                <div className="text-sm font-medium text-ink-2">
                  การประเมินด้วย AI Benchmark
                </div>
                <div className="text-base font-semibold text-ink">
                  {aiScore}%{" "}
                  <span className="text-sm font-normal text-accent">
                    — {aiHarmony.rating_th} · Percentile: {aiPercentile}th (Top {topPct}%)
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-semibold text-accent">{aiScore}</span>
              <span className="text-sm text-ink-3"> / 100</span>
            </div>
          </div>
          <div className="mt-2 h-2 w-full bg-line overflow-hidden rounded-control">
            <div
              className="h-2 bg-accent rounded-control transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, aiScore ?? 0))}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-sm text-ink-3">
            <span>เกณฑ์มาตรฐานประชากร</span>
            <span>กลุ่มสมดุลสูง (Top 25%)</span>
            <span>ระดับยอดเยี่ยม (Top 10%)</span>
          </div>

          {/* Section 4: SHAP Feature Attribution Collapsible */}
          <div className="mt-3 border-t border-line pt-2">
            <button
              type="button"
              onClick={() => setIsShapOpen((prev) => !prev)}
              className="flex w-full items-center justify-between text-left text-sm font-medium text-ink transition hover:text-accent cursor-pointer"
              aria-expanded={isShapOpen}
            >
              <span className="flex items-center gap-2">
                <span>💡 การอธิบายผลโมเดล</span>
              </span>
              <span className="flex items-center gap-1 text-sm text-ink-3">
                <span>{isShapOpen ? "ย่อรายละเอียด" : "ดูปัจจัยเด่น"}</span>
                <ChevronDown
                  size={16}
                  className={cx("transition-transform duration-200", isShapOpen && "rotate-180")}
                />
              </span>
            </button>

            {isShapOpen && (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                {/* Key Strengths */}
                <div className="rounded-control border border-line bg-surface p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>จุดเด่นของสัดส่วน</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {aiHarmony.key_strengths.length === 0 ? (
                      <p className="text-sm text-ink-3">สัดส่วนใกล้เคียงเกณฑ์ประชากรมาตรฐาน</p>
                    ) : (
                      aiHarmony.key_strengths.slice(0, 2).map((item) => (
                        <div key={item.feature} className="border-b border-line pb-2 last:border-b-0 last:pb-0">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-ink">{item.name_th}</span>
                            <span className="font-semibold text-emerald-600">
                              +{item.impact_score > 0 ? item.impact_score.toFixed(1) : item.impact_score} impact
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-sm text-ink-3">
                            <span>
                              วัดได้: <strong className="font-medium text-ink-2">{item.user_value}</strong>
                            </span>
                            <span>
                              ค่าอ้างอิง: <strong className="font-medium text-ink-2">{item.reference_median}</strong>
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-ink-3">{item.description}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Key Improvements */}
                <div className="rounded-control border border-line bg-surface p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>จุดควรพิจารณาปรับสมดุล</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {aiHarmony.key_improvements.length === 0 ? (
                      <p className="text-sm text-ink-3">ไม่มีจุดเบี่ยงเบนเด่นชัด</p>
                    ) : (
                      aiHarmony.key_improvements.slice(0, 2).map((item) => (
                        <div key={item.feature} className="border-b border-line pb-2 last:border-b-0 last:pb-0">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-ink">{item.name_th}</span>
                            <span className="font-semibold text-amber-600">
                              {item.impact_score.toFixed(1)} impact
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-sm text-ink-3">
                            <span>
                              วัดได้: <strong className="font-medium text-ink-2">{item.user_value}</strong>
                            </span>
                            <span>
                              ค่าอ้างอิง: <strong className="font-medium text-ink-2">{item.reference_median}</strong>
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-ink-3">{item.description}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
