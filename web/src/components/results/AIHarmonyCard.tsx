import { BrainCircuit, CheckCircle2, AlertCircle, Info } from "lucide-react";
import type { AIHarmonyResult } from "../../api/schemas";

interface Props {
  aiHarmony?: AIHarmonyResult | null;
  onOpenSimulation?: () => void;
}

export function AIHarmonyCard({ aiHarmony, onOpenSimulation }: Props) {
  if (!aiHarmony) return null;

  const score = Math.round(aiHarmony.overall_score);
  const percentile = Math.round(aiHarmony.percentile);

  return (
    <div className="border border-line bg-surface p-4 transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-viewer bg-accent/10 text-accent">
            <BrainCircuit size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-ink">
                ดัชนีความสมดุลของใบหน้า (Facial Balance Index)
              </h3>
              <span className="rounded-control bg-accent/15 px-2 py-1 text-sm font-semibold text-accent">
                การประเมินสัดส่วน
              </span>
            </div>
            <p className="text-sm text-ink-2">
              ประเมินความสมดุลและสัดส่วนใบหน้าตามเกณฑ์กายวิภาคศาสตร์คลินิก
            </p>
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-ink">{score}</span>
          <span className="text-sm text-ink-3">/ 100</span>
        </div>
      </div>

      {/* Main Score & Distribution */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="border border-line bg-paper p-3 md:col-span-2">
          <div className="flex items-center justify-between text-sm text-ink-2">
            <span>ระดับความสมดุลของรูปหน้า</span>
            <span className="font-semibold text-ink">Percentile {percentile}%</span>
          </div>
          <div className="mt-1 text-sm font-semibold text-accent">
            {aiHarmony.rating_th}
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-control bg-line">
            <div
              className="h-full rounded-control bg-accent transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-sm text-ink-3">
            <span>เกณฑ์มาตรฐาน</span>
            <span>กลุ่มสมดุลสูง (Top 25%)</span>
            <span>ระดับยอดเยี่ยม (Top 10%)</span>
          </div>
        </div>

        <div className="flex flex-col justify-between border border-line bg-paper p-3">
          <div className="text-sm text-ink-2">มิติที่ใช้ประเมิน</div>
          <div className="my-1">
            <div className="text-lg font-semibold text-ink">
              {aiHarmony.total_features_evaluated}{" "}
              <span className="text-sm font-normal text-ink-3">มิติกายวิภาค</span>
            </div>
            <div className="text-sm text-ink-3">
              เปรียบเทียบกับเกณฑ์ประชากรมาตรฐาน
            </div>
          </div>
          {onOpenSimulation && (
            <button
              type="button"
              onClick={onOpenSimulation}
              className="mt-2 w-full rounded-control border border-line bg-surface py-1 text-sm font-medium text-ink transition hover:bg-line/20"
            >
              จำลองการปรับสัดส่วน
            </button>
          )}
        </div>
      </div>

      {/* Feature Impact Breakdown */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Positive Drivers */}
        <div className="border border-line bg-paper p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>จุดที่ได้สัดส่วนสมดุล (Key Strengths)</span>
          </div>
          <div className="mt-3 space-y-3">
            {aiHarmony.key_strengths.length === 0 ? (
              <div className="text-sm text-ink-3">สัดส่วนกระจายตัวใกล้เคียงค่ามาตรฐาน</div>
            ) : (
              aiHarmony.key_strengths.map((item) => (
                <div
                  key={item.feature}
                  className="rounded-control border border-line bg-surface p-3 text-sm"
                >
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-ink">{item.name_th}</span>
                    <span className="font-semibold text-emerald-600">
                      +{item.impact_score.toFixed(1)} impact
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm text-ink-3">
                    <span>
                      วัดได้: <strong className="text-ink-2">{item.user_value}</strong>
                    </span>
                    <span>
                      ค่ากลางกลุ่มตัวอย่าง:{" "}
                      <strong className="text-ink-2">{item.reference_median}</strong>
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-ink-3">{item.description}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Improvement Areas */}
        <div className="border border-line bg-paper p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <AlertCircle size={16} className="text-amber-600" />
            <span>จุดที่เบี่ยงเบนจากเกณฑ์อ้างอิง (Proportion Variance)</span>
          </div>
          <div className="mt-3 space-y-3">
            {aiHarmony.key_improvements.length === 0 ? (
              <div className="text-sm text-ink-3">ไม่มีจุดเบี่ยงเบนเด่นชัด</div>
            ) : (
              aiHarmony.key_improvements.map((item) => (
                <div
                  key={item.feature}
                  className="rounded-control border border-line bg-surface p-3 text-sm"
                >
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-ink">{item.name_th}</span>
                    <span className="font-semibold text-amber-600">
                      {item.impact_score.toFixed(1)} impact
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm text-ink-3">
                    <span>
                      วัดได้: <strong className="text-ink-2">{item.user_value}</strong>
                    </span>
                    <span>
                      ค่าอ้างอิงมาตรฐาน:{" "}
                      <strong className="text-ink-2">{item.reference_median}</strong>
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-ink-3">{item.description}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm text-ink-3">
        <Info size={14} />
        <span>
          การวิเคราะห์มิติสัดส่วนแสดงผลกระทบเชิงกายวิภาค เพื่อช่วยระบุบริเวณที่สอดคล้องหรือเบี่ยงเบนจากเกณฑ์มาตรฐาน
        </span>
      </div>
    </div>
  );
}
