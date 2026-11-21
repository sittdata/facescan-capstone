import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Glasses,
  Layers,
  Scissors,
  Sparkles,
} from "lucide-react";
import type { Result } from "../../api/schemas";
import { generateHairAdvice, type Gender } from "../../extensions/hairAdvice";
import { HairDiagramThumbnail, HairDiagramModal } from "./HairDiagram";

interface Props {
  result: Result;
  initialSex?: string | null;
}

export function HairAdviceCard({ result, initialSex }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [activeDiagram, setActiveDiagram] = useState<{
    key: string;
    title: string;
    category?: "hair" | "beard";
    barberInstructions?: string;
  } | null>(null);
  const gender = initialSex === "male" ? "male" : "female";
  const advice = generateHairAdvice(result, gender);

  return (
    <section className="my-4 border border-line bg-surface p-4 print:break-inside-avoid">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Scissors size={18} className="text-accent shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-ink">
              คำแนะนำทรงผมและกรอบแว่นตามสัดส่วนโครงหน้า
            </h3>
            <p className="text-sm text-ink-2">
              หลักการวางสถาปัตยกรรมเส้นผม (Optical Balancing) จากสัดส่วนกายวิภาคจริง
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-ink-2 hover:text-ink cursor-pointer"
          aria-label="สลับการแสดงรายละเอียด"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="pt-4 space-y-4">
          {/* Section 1: Detected Anatomical Proportions */}
          <div>
            <div className="text-sm font-medium text-ink-3 mb-2 flex items-center gap-2">
              <Layers size={16} className="text-accent shrink-0" />
              <span>มิติโครงสร้างใบหน้าที่ตรวจวัดได้ (Detected Facial Proportions)</span>
            </div>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
              {/* Vertical Ratio */}
              <div className="border border-line bg-paper p-3 rounded-control">
                <div className="text-sm text-ink-3 mb-1">สัดส่วนความยาวใบหน้า</div>
                <div className="text-sm font-semibold text-ink mb-1">
                  {advice.features.vertical.label}
                </div>
                <p className="text-sm text-ink-2">
                  {advice.features.vertical.description}
                </p>
              </div>

              {/* Forehead */}
              <div className="border border-line bg-paper p-3 rounded-control">
                <div className="text-sm text-ink-3 mb-1">สัดส่วนหน้าผากส่วนบน</div>
                <div className="text-sm font-semibold text-ink mb-1">
                  {advice.features.forehead.label}
                </div>
                <p className="text-sm text-ink-2">
                  {advice.features.forehead.description}
                </p>
              </div>

              {/* Jawline & Chin */}
              <div className="border border-line bg-paper p-3 rounded-control">
                <div className="text-sm text-ink-3 mb-1">แนวกรามและปลายคาง</div>
                <div className="text-sm font-semibold text-ink mb-1">
                  {advice.features.jawline.label}
                </div>
                <p className="text-sm text-ink-2">
                  {advice.features.jawline.description}
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Optical Balancing Principles */}
          <div className="border border-line bg-paper p-3 rounded-control">
            <div className="text-sm font-semibold text-ink mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-accent shrink-0" />
              <span>กลยุทธ์การปรับสมดุลด้วยเส้นผม (Optical Balancing Strategy)</span>
            </div>
            <div className="grid gap-2 text-sm text-ink-2 grid-cols-1 md:grid-cols-2">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-ink shrink-0">• ตำแหน่ง Volume:</span>
                <span>{advice.opticalPrinciples.volumePlacement}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-ink shrink-0">• การแสก/หน้าม้า:</span>
                <span>{advice.opticalPrinciples.partingTechnique}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Recommended Hairstyles & Facial Hair */}
          <div>
            <div className="text-sm font-medium text-ink-3 mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-accent shrink-0" />
                <span>ทรงผมที่แนะนำสำหรับโครงหน้าของคุณ</span>
              </div>
              <span className="border border-line bg-paper px-2 py-1 text-sm text-ink-3 rounded-control">
                {gender === "male" ? "Hairstyles & Beard Grooming" : "Hairstyle Lookbook"}
              </span>
            </div>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
              {advice.recommendations.map((style, idx) => (
                <div
                  key={`${style.key || "style"}-${idx}`}
                  className="border border-line bg-paper p-3 rounded-control flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="border border-line bg-surface text-ink-2 px-2 py-1 text-sm rounded-control font-medium">
                        {style.category === "beard" ? "สไตล์หนวดเคราเสริมคาง" : "ทรงผมแนะนำ"}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-ink mb-1">
                      {style.name}
                    </div>
                    <p className="text-sm text-ink-2 mb-2">
                      {style.description}
                    </p>
                  </div>
                  <HairDiagramThumbnail
                    styleKey={style.key}
                    title={style.name}
                    category={style.category}
                    onExpand={() =>
                      setActiveDiagram({
                        key: style.key,
                        title: style.name,
                        category: style.category,
                        barberInstructions: style.barberInstructions,
                      })
                    }
                  />
                  <div className="border-t border-line pt-2 text-sm text-accent mt-3">
                    <span className="font-medium text-ink">จุดเด่น: </span>
                    {style.benefit}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Avoid Styles & Eyewear Grid */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            {/* Avoid Styles */}
            <div className="border border-line bg-paper p-3 rounded-control">
              <div className="text-sm font-semibold text-error mb-2 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>ทรงผมที่ควรหลีกเลี่ยง</span>
              </div>
              <div className="space-y-2">
                {advice.avoidStyles.map((item, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-medium text-ink block">• {item.name}</span>
                    <span className="text-ink-2 pl-3 block">{item.reason}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Eyewear Guide */}
            <div className="border border-line bg-paper p-3 rounded-control">
              <div className="text-sm font-semibold text-ink mb-2 flex items-center gap-2">
                <Glasses size={16} className="text-accent shrink-0" />
                <span>กรอบแว่นตาที่เข้ากับใบหน้า</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {advice.eyewear.shapes.map((shape, idx) => (
                  <span
                    key={idx}
                    className="border border-line bg-surface text-ink px-2 py-1 text-sm rounded-control"
                  >
                    {shape}
                  </span>
                ))}
              </div>
              <p className="text-sm text-ink-2">
                {advice.eyewear.tip}
              </p>
            </div>
          </div>
        </div>
      )}

      <HairDiagramModal
        open={activeDiagram !== null}
        onOpenChange={(open) => !open && setActiveDiagram(null)}
        diagramKey={activeDiagram?.key ?? ""}
        title={activeDiagram?.title ?? ""}
        category={activeDiagram?.category}
        barberInstructions={activeDiagram?.barberInstructions}
      />
    </section>
  );
}
