import { Sparkles, Layers, Activity } from "lucide-react";
import type { InferredDemographics, FacialSaggingResult } from "../../api/schemas";
import {
  getSkinVitalityProfile,
} from "../../utils/skinAgeProfile";

interface Props {
  demographics?: InferredDemographics | null;
  sagging?: FacialSaggingResult | null;
}

export function DemographicsCard({ demographics, sagging }: Props) {
  if (!demographics) return null;

  const { predicted_age, age_sd } = demographics;
  const resolvedTier =
    sagging?.tier ??
    (sagging?.tier_name === "Firm"
      ? 1
      : sagging?.tier_name === "Moderate"
        ? 2
        : sagging?.tier_name === "Advanced"
          ? 3
          : undefined);
  const profile = getSkinVitalityProfile(predicted_age, age_sd, resolvedTier);

  return (
    <div
      data-testid="skin-age-card"
      className="border border-line bg-surface p-4 overflow-hidden break-words"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent shrink-0" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-semibold text-ink">
              ประเมินอายุสภาพผิวและความอ่อนเยาว์
            </h3>
            <p className="text-sm text-ink-2">
              วิเคราะห์อายุสภาพผิวพรรณ เชื่อมโยงกับวัฏจักรคอลลาเจนและความกระชับของเนื้อเยื่อ
            </p>
          </div>
        </div>
        <span className="rounded-control border border-line bg-paper px-2 py-1 text-sm text-ink-2">
          ชีวมิติผิวพรรณ
        </span>
      </div>

      {/* Primary Vitality Hero: Estimated Skin Age & Status */}
      <div className="mt-4 border border-line bg-paper p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm text-ink-2">อายุผิวพรรณโดยประมาณ</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                data-testid="estimated-skin-age"
                className="text-2xl font-semibold text-ink"
              >
                {profile.formattedAge}
              </span>
              <span className="text-sm font-medium text-ink-2">ปี</span>
              {profile.formattedAgeSd ? (
                <span className="text-sm text-ink-3"> (±{profile.formattedAgeSd} ปี)</span>
              ) : null}
            </div>
            <div className="mt-1 text-sm text-ink-3">
              ช่วงวัยอ้างอิง:{" "}
              <span data-testid="age-range-text" className="font-medium text-ink-2">
                {profile.ageRangeText}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span
              data-testid="vitality-status-tag"
              className={`inline-block px-2 py-1 text-sm font-semibold rounded-control ${profile.statusTag.badgeClass}`}
            >
              {profile.statusTag.labelTh}
            </span>
          </div>
        </div>
      </div>

      {/* Age Spectrum Bar */}
      <div data-testid="spectrum-bar" className="mt-4 border border-line bg-paper p-4">
        <div className="flex flex-wrap items-center justify-between gap-1 text-sm">
          <span className="font-semibold text-ink">
            แถบสเปกตรัมช่วงวัยผิว
          </span>
          <span className="text-sm text-ink-3">
            ตำแหน่งที่ประเมินได้:{" "}
            <strong className="text-ink">{profile.formattedAge} ปี</strong>{" "}
            ({profile.phase.ageBracketTh})
          </span>
        </div>

        {/* Bar track & marker pin */}
        <div aria-hidden="true" className="relative mt-3 pt-6 pb-2">
          {/* Floating Marker Pin */}
          <div
            data-testid="spectrum-marker"
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-300"
            style={{
              left: `clamp(2rem, ${profile.spectrumPercentage}%, calc(100% - 2rem))`,
            }}
          >
            <span
              className="rounded-control bg-accent px-2 py-1 text-sm font-semibold text-surface whitespace-nowrap"
              style={{
                printColorAdjust: "exact",
                WebkitPrintColorAdjust: "exact",
              }}
            >
              {profile.formattedAge} ปี
            </span>
            <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-accent" />
          </div>

          {/* 4-phase segmented bar */}
          <div
            className="grid grid-cols-4 gap-1 h-3 rounded-control overflow-hidden bg-line p-1"
            style={{
              printColorAdjust: "exact",
              WebkitPrintColorAdjust: "exact",
            }}
          >
            <div
              className={`h-full rounded-control transition-opacity ${
                profile.phase.phase === 1
                  ? "bg-emerald-500 opacity-100 ring-2 ring-emerald-500/50"
                  : "bg-emerald-500/40 opacity-70"
              }`}
              title="Peak Collagen (< 25)"
            />
            <div
              className={`h-full rounded-control transition-opacity ${
                profile.phase.phase === 2
                  ? "bg-accent opacity-100 ring-2 ring-accent/50"
                  : "bg-accent/40 opacity-70"
              }`}
              title="Preventive Pre-aging (25-34)"
            />
            <div
              className={`h-full rounded-control transition-opacity ${
                profile.phase.phase === 3
                  ? "bg-amber-500 opacity-100 ring-2 ring-amber-500/50"
                  : "bg-amber-500/40 opacity-70"
              }`}
              title="Structural Maturation (35-44)"
            />
            <div
              className={`h-full rounded-control transition-opacity ${
                profile.phase.phase === 4
                  ? "bg-rose-500 opacity-100 ring-2 ring-rose-500/50"
                  : "bg-rose-500/40 opacity-70"
              }`}
              title="Deep Restorative (45+)"
            />
          </div>

          {/* Segment Labels */}
          <div className="mt-2 grid grid-cols-4 gap-1 text-sm text-ink-3 text-center">
            <div className={profile.phase.phase === 1 ? "font-semibold text-emerald-600" : ""}>
              &lt; 25 ปี<br />
              <span className="hidden md:inline">Peak Collagen</span>
            </div>
            <div className={profile.phase.phase === 2 ? "font-semibold text-accent" : ""}>
              25 - 34 ปี<br />
              <span className="hidden md:inline">Preventive</span>
            </div>
            <div className={profile.phase.phase === 3 ? "font-semibold text-amber-600" : ""}>
              35 - 44 ปี<br />
              <span className="hidden md:inline">Structural</span>
            </div>
            <div className={profile.phase.phase === 4 ? "font-semibold text-rose-600" : ""}>
              45+ ปี<br />
              <span className="hidden md:inline">Restorative</span>
            </div>
          </div>
        </div>
      </div>

      {/* Collagen Lifecycle Phase Detail Card */}
      <div data-testid="collagen-phase-card" className="mt-4 border border-line bg-paper p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-accent shrink-0" aria-hidden="true" />
            <span
              data-testid="collagen-phase-name"
              className="text-sm font-semibold text-ink"
            >
              วัฏจักรคอลลาเจน: {profile.phase.nameTh}
            </span>
          </div>
          <span
            className={`px-2 py-1 text-sm font-semibold rounded-control ${profile.phase.badgeClass}`}
          >
            {profile.phase.stageTh}
          </span>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
          <div className="rounded-control border border-line bg-surface p-3">
            <div className="font-semibold text-ink flex items-center gap-2">
              <Activity size={14} className="text-accent shrink-0" aria-hidden="true" />
              ลักษณะเฉพาะของสภาพผิว
            </div>
            <p className="mt-1 text-ink-2 text-sm">
              {profile.phase.characteristicsTh}
            </p>
          </div>

          <div className="rounded-control border border-line bg-surface p-3">
            <div className="font-semibold text-ink flex items-center gap-2">
              <Sparkles size={14} className="text-accent shrink-0" aria-hidden="true" />
              แนวทางชะลอวัยเชิงป้องกัน
            </div>
            <p className="mt-1 text-ink-2 text-sm">
              {profile.phase.preventiveFocusTh}
            </p>
          </div>
        </div>

        {profile.firmnessCorrelation && (
          <div className="mt-3 flex items-start gap-2 border-t border-line pt-3 text-sm text-ink-2">
            <span className="font-semibold text-ink shrink-0">ความสัมพันธ์กับความกระชับ:</span>
            <span>{profile.firmnessCorrelation.descriptionTh}</span>
          </div>
        )}
      </div>
    </div>
  );
}
