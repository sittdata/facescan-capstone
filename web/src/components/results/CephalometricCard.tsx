import { Compass, AlertTriangle, ShieldAlert } from "lucide-react";
import type { CephalometricResult, ProcedureRecommendation } from "../../api/schemas";
import { translateRationale } from "./ProcedureRecommendationCard";

interface Props {
  cephalometric?: CephalometricResult | null;
  recommendations?: ProcedureRecommendation[] | null;
}

interface SkeletalClassStyle {
  label: string;
  badgeClass: string;
}

const DEFAULT_CLASS_STYLE: SkeletalClassStyle = {
  label: "Skeletal Class I: สมดุลกระดูกปกติ (Balanced)",
  badgeClass: "border border-line bg-paper text-ink",
};

const CLASS_STYLES: Record<string, SkeletalClassStyle> = {
  Class_I: DEFAULT_CLASS_STYLE,
  Class_II: {
    label: "Skeletal Class II: ขากรรไกรล่างถอย / คางถอย (Retrognathic)",
    badgeClass: "border border-line-strong bg-notice text-ink",
  },
  Class_III: {
    label: "Skeletal Class III: ขากรรไกรล่างยื่น / คางยื่น (Prognathic)",
    badgeClass: "border border-accent bg-paper text-accent",
  },
};

const DEFAULT_SURGICAL_BADGE = {
  labelTh: "ไม่ต้องผ่าตัด (None)",
  badgeClass: "border border-line bg-paper text-ink-2",
};

const SURGICAL_BADGES: Record<string, { labelTh: string; badgeClass: string }> = {
  none: DEFAULT_SURGICAL_BADGE,
  camouflage_or_orthognathic: {
    labelTh: "พิจารณาตกแต่งพรางหรือผ่าตัด (Camouflage / Orthodontic)",
    badgeClass: "border border-accent bg-paper text-accent",
  },
  orthognathic_indicated: {
    labelTh: "ข้อบ่งชี้ผ่าตัดเลื่อนขากรรไกร (Orthognathic Indicated)",
    badgeClass: "border border-line-strong bg-notice text-ink",
  },
  orthognathic_strongly_recommended: {
    labelTh: "แนะนำผ่าตัดขากรรไกรอย่างยิ่ง (Strongly Recommended)",
    badgeClass: "border border-error bg-surface text-error",
  },
};

interface MetricNorm {
  id: string;
  nameTh: string;
  norm: string;
  unit: string;
  check: (v: number) => { status: "normal" | "low" | "high"; statusTh: string };
}

const CLINICAL_METRICS: MetricNorm[] = [
  {
    id: "anb_angle",
    nameTh: "มุม ANB (ความสัมพันธ์แนวกระดูกขากรรไกร)",
    norm: "0.0° - 4.0°",
    unit: "°",
    check: (v) => {
      if (v < 0.0) return { status: "low", statusTh: "คางยื่น (Class III)" };
      if (v > 4.0) return { status: "high", statusTh: "คางถอย (Class II)" };
      return { status: "normal", statusTh: "สมดุลปกติ" };
    },
  },
  {
    id: "wits_appraisal_mm",
    nameTh: "Wits Appraisal (ระยะห่างแนวดิ่งบนระนาบสบฟัน)",
    norm: "-1.5 - +1.0 mm",
    unit: " mm",
    check: (v) => {
      if (v < -2.0) return { status: "low", statusTh: "ล่างยื่น (Class III)" };
      if (v > 1.5) return { status: "high", statusTh: "ล่างถอย (Class II)" };
      return { status: "normal", statusTh: "สมดุลปกติ" };
    },
  },
  {
    id: "sna_angle",
    nameTh: "มุม SNA (ตำแหน่งขากรรไกรบนเทียบฐานกะโหลก)",
    norm: "79.0° - 85.0°",
    unit: "°",
    check: (v) => {
      if (v < 79.0) return { status: "low", statusTh: "บนถดถอย (Hypoplasia)" };
      if (v > 85.0) return { status: "high", statusTh: "บนยื่น (Protrusion)" };
      return { status: "normal", statusTh: "สมดุลปกติ" };
    },
  },
  {
    id: "snb_angle",
    nameTh: "มุม SNB (ตำแหน่งขากรรไกรล่างเทียบฐานกะโหลก)",
    norm: "77.0° - 83.0°",
    unit: "°",
    check: (v) => {
      if (v < 77.0) return { status: "low", statusTh: "ล่างถอย (Retrusion)" };
      if (v > 83.0) return { status: "high", statusTh: "ล่างยื่น (Prognathism)" };
      return { status: "normal", statusTh: "สมดุลปกติ" };
    },
  },
  {
    id: "fma_angle",
    nameTh: "มุม FMA (แนวกราม Frankfort Mandibular)",
    norm: "21.0° - 29.0°",
    unit: "°",
    check: (v) => {
      if (v < 21.0) return { status: "low", statusTh: "หน้าสั้น (Hypodivergent)" };
      if (v > 29.0) return { status: "high", statusTh: "หน้ายาว (Hyperdivergent)" };
      return { status: "normal", statusTh: "สมดุลปกติ" };
    },
  },
];

export function CephalometricCard({ cephalometric, recommendations }: Props) {
  if (!cephalometric) return null;

  const className = cephalometric.skeletal_class_name || "Class_I";
  const classStyle = CLASS_STYLES[className] ?? DEFAULT_CLASS_STYLE;
  const surgicalBadge =
    SURGICAL_BADGES[cephalometric.surgical_indication] ?? DEFAULT_SURGICAL_BADGE;

  const probs = cephalometric.probabilities || {};
  const probI = Math.round((probs.Class_I ?? 0) * 100);
  const probII = Math.round((probs.Class_II ?? 0) * 100);
  const probIII = Math.round((probs.Class_III ?? 0) * 100);

  const features = cephalometric.features || {};

  // Orthognathic surgery recommendation
  const orthoRec = (recommendations ?? []).find(
    (r) => r && r.procedure === "orthognathic_surgery"
  );
  const chinRec = (recommendations ?? []).find(
    (r) => r && r.procedure === "chin_augmentation"
  );

  return (
    <div className="border border-line bg-surface p-4 overflow-hidden break-words">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Compass size={16} className="text-accent" />
          <div>
            <h3 className="text-sm font-semibold text-ink">
              การวิเคราะห์โครงสร้างกระดูกขากรรไกร (Cephalometric Skeletal Classifier)
            </h3>
            <p className="text-sm text-ink-2">
              ประเมินความสัมพันธ์ของฐานกระดูกขากรรไกรตามเกณฑ์มาตรฐาน Steiner & Tweed Analysis
            </p>
          </div>
        </div>
        <span className="border border-line bg-paper px-2 py-1 text-sm text-ink-2">
          ตารางวิเคราะห์กระดูก (Cephalometric Tabular Analysis)
        </span>
      </div>

      {/* Main Diagnosis Banner */}
      <div className="mt-4 border border-line bg-paper p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm text-ink-2">ประเภทโครงสร้างกระดูกขากรรไกร</div>
            <div className="mt-1 flex items-center gap-2">
              <span className={`px-2 py-1 text-sm font-semibold rounded-control ${classStyle.badgeClass}`}>
                {classStyle.label}
              </span>
              <span className="text-sm font-semibold text-ink">
                ระดับความรุนแรง: {cephalometric.severity}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm text-ink-3">ข้อบ่งชี้ทางศัลยกรรม</span>
            <div className="mt-1">
              <span className={`px-2 py-1 text-sm font-medium rounded-control ${surgicalBadge.badgeClass}`}>
                {surgicalBadge.labelTh}
              </span>
            </div>
          </div>
        </div>

        {/* Clinical Description */}
        <p className="mt-2 text-sm text-ink-2">
          {cephalometric.description_th || cephalometric.description_en}
        </p>

        {/* Probability Breakdown */}
        <div className="mt-3 border-t border-line pt-2">
          <div className="flex items-center justify-between text-sm text-ink-3">
            <span>ความน่าจะเป็นจำแนกกลุ่ม (Posterior Probabilities):</span>
            <span className="text-ink-2">ความมั่นใจ {(cephalometric.confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="mt-1 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="border border-line bg-surface p-1">
              <div className="text-ink-3">Class I (ปกติ)</div>
              <div className="font-semibold text-ink">{probI}%</div>
            </div>
            <div className="border border-line bg-surface p-1">
              <div className="text-ink-3">Class II (คางถอย)</div>
              <div className="font-semibold text-ink">{probII}%</div>
            </div>
            <div className="border border-line bg-surface p-1">
              <div className="text-ink-3">Class III (คางยื่น)</div>
              <div className="font-semibold text-accent">{probIII}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Measurement Gauges */}
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-ink">
          ดัชนีวัดทางเซฟาโลเมตริกส์ (Cephalometric Standard Parameters)
        </h4>
        <div className="mt-2 space-y-2">
          {CLINICAL_METRICS.map((m) => {
            const rawVal = features[m.id];
            const hasVal = typeof rawVal === "number" && !Number.isNaN(rawVal);
            const check = hasVal ? m.check(rawVal) : null;
            const badgeStyle =
              check?.status === "normal"
                ? "border border-line bg-surface text-ink-2"
                : "border border-line-strong bg-notice text-ink";

            return (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 border border-line bg-paper px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-ink">{m.nameTh}</span>
                  <span className="ml-2 text-ink-3">
                    (เกณฑ์ปกติ: {m.norm})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">
                    {hasVal ? `${rawVal.toFixed(1)}${m.unit}` : "—"}
                  </span>
                  {check && (
                    <span className={`px-2 py-1 text-sm font-semibold rounded-control ${badgeStyle}`}>
                      {check.statusTh}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Surgical vs Non-Surgical Guidance Cross-Link */}
      {orthoRec && orthoRec.intensity > 0 && (
        <div className="mt-4 border border-error bg-surface p-3">
          <div className="flex items-center gap-2 text-error">
            <ShieldAlert size={16} />
            <span className="text-sm font-semibold">
              ข้อเสนอแนะด้านการรักษา: ศัลยกรรมเลื่อนขากรรไกร (Orthognathic Surgery)
            </span>
            <span className="ml-auto text-sm font-semibold">
              ระดับความจำเป็น: {(orthoRec.intensity * 100).toFixed(0)}%
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-2">{translateRationale(orthoRec.rationale)}</p>
        </div>
      )}

      {className === "Class_III" && (!chinRec || chinRec.intensity === 0) && (
        <div className="mt-3 border border-line-strong bg-notice p-3">
          <div className="flex items-center gap-2 text-ink">
            <AlertTriangle size={16} />
            <span className="text-sm font-semibold">
              ข้อห้ามทางการแพทย์ (Clinical Contraindication)
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-2">
            {translateRationale(
              chinRec?.rationale ||
                "Chin augmentation (filler or implant) is contraindicated due to Skeletal Class III prognathism (mandibular excess or midface hypoplasia). Adding chin volume would exacerbate lower-face anterior protrusion; orthognathic surgical consultation is recommended instead."
            )}
          </p>
        </div>
      )}
    </div>
  );
}
