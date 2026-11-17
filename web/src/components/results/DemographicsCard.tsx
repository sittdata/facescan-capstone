import { Sparkles, User, Calendar } from "lucide-react";
import type { InferredDemographics } from "../../api/schemas";

interface Props {
  demographics?: InferredDemographics | null;
}

export function DemographicsCard({ demographics }: Props) {
  if (!demographics) return null;

  const { predicted_sex, sex_confidence, predicted_age, age_sd } = demographics;
  const isFemale = predicted_sex === "female";
  const sexLabel = isFemale ? "เพศหญิง" : "เพศชาย";
  const confPercent = Math.round(sex_confidence * 100);

  return (
    <div className="border border-line bg-surface p-4 overflow-hidden break-words">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <div>
            <h3 className="text-sm font-semibold text-ink">
              ข้อมูลประชากรศาสตร์ (Demographic Profile)
            </h3>
            <p className="text-sm text-ink-2">
              การประเมินเพศและช่วงอายุเบื้องต้นเพื่อเทียบเคียงเกณฑ์มาตรฐาน
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Sex Prediction */}
        <div className="border border-line bg-paper p-3">
          <div className="flex items-center gap-3">
            <User size={20} className="text-accent" />
            <div>
              <div className="text-sm text-ink-2">เพศที่ประเมินได้</div>
              <div className="text-base font-semibold text-ink">{sexLabel}</div>
              <div className="text-sm text-ink-3">
                ระดับความสอดคล้อง: <span className="text-ink-2">{confPercent}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Age Prediction */}
        <div className="border border-line bg-paper p-3">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-accent" />
            <div>
              <div className="text-sm text-ink-2">ช่วงอายุโดยประมาณ</div>
              <div className="text-base font-semibold text-ink">
                {predicted_age.toFixed(1)} ปี
                {age_sd ? (
                  <span className="font-normal text-ink-3"> (±{age_sd} ปี)</span>
                ) : null}
              </div>
              <div className="text-sm text-ink-3">
                การเทียบเกณฑ์: <span className="text-ink-2">เกณฑ์ประชากรตามช่วงอายุ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
