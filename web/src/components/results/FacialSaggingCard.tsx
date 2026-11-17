import { Activity, Sparkles, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import type { FacialSaggingResult, ProcedureRecommendation } from "../../api/schemas";
import { PROCEDURE_TITLES, translateRationale } from "./ProcedureRecommendationCard";

interface Props {
  sagging?: FacialSaggingResult | null;
  recommendations?: ProcedureRecommendation[] | null;
}

const SAGGING_PROCEDURE_KEYS = new Set(["skin_tightening", "thread_lift", "surgical_facelift"]);

interface TierStyle {
  label: string;
  badgeClass: string;
  barColor: string;
}

const DEFAULT_TIER_STYLE: TierStyle = {
  label: "Tier 1: Firm (ความกระชับสูง)",
  badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  barColor: "#10b981",
};

const TIER_STYLES: Record<number, TierStyle> = {
  1: DEFAULT_TIER_STYLE,
  2: {
    label: "Tier 2: Moderate (หย่อนคล้อยปานกลาง)",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    barColor: "#f59e0b",
  },
  3: {
    label: "Tier 3: Advanced (หย่อนคล้อยชัดเจน)",
    badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    barColor: "#f43f5e",
  },
};

interface FeatureDisplayConfig {
  nameTh: string;
  nameEn: string;
  description: string;
  fallbackKeys?: string[];
  interpret: (val: number) => { label: string; badgeClass: string };
}

const FEATURE_CONFIGS: Record<string, FeatureDisplayConfig> = {
  jowl_sagging_index: {
    nameTh: "แนวกรามหย่อนคล้อย (Jowl Sagging Index)",
    nameEn: "Mandibular Soft-Tissue Descent",
    description: "การคล้อยตัวของเนื้อเยื่อกระพุ้งแก้มลงมาใต้แนวขอบกระดูกกรามล่าง",
    fallbackKeys: ["jowl_sagging"],
    interpret: (val: number) => {
      if (val <= 0.029) {
        return { label: "ปกติ (Minimal)", badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
      }
      if (val <= 0.033) {
        return { label: "เริ่มหย่อนคล้อย (Mild)", badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
      }
      return { label: "คล้อยชัดเจน (Prominent)", badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/20" };
    },
  },
  malar_to_jaw_ratio: {
    nameTh: "สัดส่วนโหนกแก้มต่อกราม (Malar-to-Jaw Ratio)",
    nameEn: "Facial Youth Triangle (∇ → Δ)",
    description: "สัดส่วนความกว้างโหนกแก้มต่อแนวกราม สะท้อนการเปลี่ยนรูปสามเหลี่ยมใบหน้า",
    fallbackKeys: ["malar_jaw_ratio"],
    interpret: (val: number) => {
      if (val >= 1.11) {
        return { label: "กระชับรูปไข่ (V-Shape ∇)", badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
      }
      if (val >= 1.07) {
        return { label: "เริ่มขยายตัว (Transitional)", badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
      }
      return { label: "ฐานกรามขยาย (Inverted Δ)", badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/20" };
    },
  },
  oral_commissure_droop: {
    nameTh: "มุมองศาขอบปากตกลู่ (Marionette Droop)",
    nameEn: "Oral Commissure Angle Descent",
    description: "การตกลู่ของมุมปากและร่องน้ำหมาก บ่งบอกการหย่อนคล้อยของกล้ามเนื้อรอบปาก",
    fallbackKeys: ["marionette_droop", "commissure_droop"],
    interpret: (val: number) => {
      if (val <= -0.025) {
        return { label: "มุมปากยกกระชับ (Uplifted)", badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
      }
      if (val <= -0.015) {
        return { label: "เริ่มตกลู่ (Slight Droop)", badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
      }
      return { label: "ตกลู่ชัดเจน (Noticeable)", badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/20" };
    },
  },
  jawline_irregularity: {
    nameTh: "ความคมชัดของขอบกราม (Mandibular Contour)",
    nameEn: "Jawline Smoothness & Definition",
    description: "ความเรียบเนียนของแนวกระดูกขากรรไกรล่าง ไม่สะดุดด้วยเนื้อส่วนเกิน",
    fallbackKeys: ["mandibular_contour_irregularity", "mandibular_irregularity"],
    interpret: (val: number) => {
      if (val <= 0.020) {
        return { label: "คมชัดเรียบเนียน (Sharp)", badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
      }
      if (val <= 0.025) {
        return { label: "เริ่มมีรอยคลื่น (Wavy)", badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
      }
      return { label: "กรอบกรามลบเลือน (Blunted)", badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/20" };
    },
  },
};

export function FacialSaggingCard({ sagging, recommendations }: Props) {
  if (!sagging) return null;

  let tier = sagging.tier;
  if (!tier && sagging.tier_name) {
    if (sagging.tier_name === "Firm") tier = 1;
    else if (sagging.tier_name === "Moderate") tier = 2;
    else if (sagging.tier_name === "Advanced") tier = 3;
  }
  tier = tier ?? 1;

  const tierStyle: TierStyle = TIER_STYLES[tier] ?? DEFAULT_TIER_STYLE;
  const rawScore =
    typeof sagging.laxity_score === "number" && !Number.isNaN(sagging.laxity_score)
      ? sagging.laxity_score
      : 0;
  const laxityScore = Math.max(0, Math.min(100, rawScore));

  // Extract posterior probabilities (handles named, 0-indexed, and 1-indexed keys without collision)
  const probs = sagging.probabilities ?? {};
  const has0Index = probs["0"] !== undefined;
  const probFirm =
    (probs.Firm ??
      probs.firm ??
      (has0Index ? probs["0"] : probs["1"]) ??
      0) * 100;
  const probMod =
    (probs.Moderate ??
      probs.moderate ??
      (has0Index ? probs["1"] : probs["2"]) ??
      0) * 100;
  const probAdv =
    (probs.Advanced ??
      probs.advanced ??
      (has0Index ? probs["2"] : probs["3"]) ??
      0) * 100;

  // Filter indicated sagging procedures
  const saggingRecs = (recommendations ?? []).filter(
    (r) => r && SAGGING_PROCEDURE_KEYS.has(r.procedure) && (r.intensity ?? 0) > 0
  );

  const features = sagging.features ?? {};

  return (
    <div className="border border-line bg-surface p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-accent" />
          <div>
            <h3 className="text-sm font-semibold text-ink">
              การประเมินความหย่อนคล้อยและแนวกราม (Facial Sagging & Laxity Index)
            </h3>
            <p className="text-sm text-ink-2">
              ประเมินโครงสร้างกายวิภาคส่วนล่างและแนวกรามด้วย 478 MediaPipe Dense Mesh
            </p>
          </div>
        </div>
        <span className="border border-line bg-paper px-2 py-1 text-sm text-ink-2">
          MediaPipe 478 Mesh + Logistic Regression (UTKFace)
        </span>
      </div>

      {/* Tier Result Banner */}
      <div className="mt-4 border border-line bg-paper p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm text-ink-2">ระดับความหย่อนคล้อยของโครงสร้างใบหน้า</div>
            <div className="mt-1 flex items-center gap-2">
              <span className={`border px-2 py-1 text-sm font-semibold rounded-control ${tierStyle.badgeClass}`}>
                {tierStyle.label}
              </span>
              <span className="text-sm font-semibold text-ink">
                {sagging.rating_th}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm text-ink-3">Laxity Score</span>
            <div className="text-base font-semibold text-accent">
              {laxityScore.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Clinical Description */}
        <p className="mt-2 text-sm text-ink-2">
          {sagging.description_th}
        </p>

        {/* Continuous Laxity Spectrum Bar */}
        <div className="mt-4 pt-2 border-t border-line">
          <div className="flex items-center justify-between text-sm text-ink-2 mb-1">
            <span>แถบวัดระดับความหย่อนคล้อย (Facial Laxity Spectrum)</span>
            <span className="font-semibold text-ink">
              {laxityScore.toFixed(1)}%
            </span>
          </div>

          {/* Spectrum Bar Container */}
          <div className="relative mt-2">
            {/* 3 Zone Segmented Background */}
            <div className="flex h-3 w-full overflow-hidden rounded-control border border-line">
              <div
                className="bg-emerald-500/30 flex items-center justify-center text-[11px] font-medium text-emerald-600"
                style={{ width: "35%" }}
                title="โซนกระชับ Firm (0-35%)"
              />
              <div
                className="bg-amber-500/30 flex items-center justify-center text-[11px] font-medium text-amber-600"
                style={{ width: "30%" }}
                title="โซนหย่อนคล้อยปานกลาง Moderate (36-65%)"
              />
              <div
                className="bg-rose-500/30 flex items-center justify-center text-[11px] font-medium text-rose-600"
                style={{ width: "35%" }}
                title="โซนหย่อนคล้อยชัดเจน Advanced (66-100%)"
              />
            </div>

            {/* Marker Indicator Needle */}
            <div
              className="absolute -top-1 transition-all duration-300"
              style={{
                left: `calc(6px + (${laxityScore} / 100) * (100% - 12px))`,
                transform: "translateX(-50%)",
              }}
            >
              <div className="flex flex-col items-center">
                <div
                  className="size-3 rounded-viewer border-2 border-surface"
                  style={{ backgroundColor: tierStyle.barColor }}
                />
                <div
                  className="h-3"
                  style={{ width: "2px", backgroundColor: tierStyle.barColor }}
                />
              </div>
            </div>
          </div>

          {/* Zone Labels */}
          <div className="mt-2 flex flex-wrap justify-between gap-1 text-sm text-ink-3">
            <span className="text-emerald-600 font-medium">กระชับ Firm (0–35%)</span>
            <span className="text-amber-600 font-medium">หย่อนคล้อยปานกลาง Moderate (36–65%)</span>
            <span className="text-rose-600 font-medium">หย่อนคล้อยชัดเจน Advanced (66–100%)</span>
          </div>

          {/* Tier Probability Breakdown */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2 text-sm text-ink-3">
            <span>ความน่าจะเป็นตามระดับ (Posterior Probability):</span>
            <div className="flex items-center gap-3">
              <span>
                Firm: <strong className="text-ink-2">{probFirm.toFixed(1)}%</strong>
              </span>
              <span>
                Moderate: <strong className="text-ink-2">{probMod.toFixed(1)}%</strong>
              </span>
              <span>
                Advanced: <strong className="text-ink-2">{probAdv.toFixed(1)}%</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Explainable AI (XAI) Anatomical Features */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-accent" />
          <h4 className="text-sm font-semibold text-ink">
            ดัชนีกายวิภาคเบื้องหลัง (Explainable XAI Morphological Features)
          </h4>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Object.entries(FEATURE_CONFIGS).map(([key, config]) => {
            let rawVal = features[key];
            if ((rawVal === undefined || rawVal === null) && config.fallbackKeys) {
              for (const fb of config.fallbackKeys) {
                if (features[fb] !== undefined && features[fb] !== null) {
                  rawVal = features[fb];
                  break;
                }
              }
            }
            const hasVal = rawVal !== undefined && rawVal !== null && !Number.isNaN(rawVal);
            const val = hasVal ? Number(rawVal) : 0;
            const interp = config.interpret(val);

            return (
              <div key={key} className="border border-line bg-paper p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{config.nameTh}</span>
                  {hasVal && (
                    <span className={`border px-2 py-1 text-sm rounded-control ${interp.badgeClass}`}>
                      {interp.label}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-sm text-ink-3">{config.nameEn}</span>
                  <span className="text-sm font-semibold text-ink">
                    {hasVal ? val.toFixed(4) : "—"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-2">{config.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Targeted Sagging & Laxity Aesthetic Procedure Recommendations */}
      <div className="mt-4 border-t border-line pt-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert size={16} className="text-accent" />
          <h4 className="text-sm font-semibold text-ink">
            แนวทางหัตถการยกกระชับแนะนำเฉพาะบุคคล (Targeted Lifting Procedures)
          </h4>
        </div>

        {saggingRecs.length === 0 ? (
          <div className="border border-line bg-paper p-3 text-sm text-ink-2 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>
              โครงสร้างใบหน้าและแนวกรามมีความกระชับในเกณฑ์ดีเยี่ยม ไม่พบข้อบ่งชี้ที่ต้องรับการยกกระชับโครงสร้างในขณะนี้ แนะนำการดูแลบำรุงผิวตามปกติเพื่อป้องกันการหย่อนคล้อยในระยะยาว
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {saggingRecs.map((rec) => {
              const title = PROCEDURE_TITLES[rec.procedure] ?? rec.procedure;
              const pct = Math.round(rec.intensity * 100);

              return (
                <div key={rec.procedure} className="border border-line bg-paper p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">{title}</span>
                    <span className="text-sm font-semibold text-accent">
                      ความจำเป็นระดับ {pct}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2 h-2 w-full bg-line overflow-hidden rounded-control">
                    <div
                      className="h-2 bg-accent transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>

                  <p className="mt-2 text-sm text-ink-2">
                    {translateRationale(rec.rationale)}
                  </p>

                  {rec.triggering_metrics && rec.triggering_metrics.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <span className="text-sm text-ink-3">ตัวชี้วัดที่กระตุ้น:</span>
                      {rec.triggering_metrics.map((m) => (
                        <span
                          key={m}
                          className="border border-line bg-surface px-2 py-1 text-sm text-ink-2 rounded-control"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
