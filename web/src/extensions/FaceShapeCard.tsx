import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import type { FaceShapeResult } from "./types";

interface Props {
  photoUrl: string | null;
  initialSex?: string | null;
  onOpenSimulation?: () => void;
}

export function FaceShapeCard({ photoUrl, initialSex, onOpenSimulation }: Props) {
  const [data, setData] = useState<FaceShapeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [genderOverride, setGenderOverride] = useState<"female" | "male" | null>(null);
  const gender = genderOverride ?? (initialSex === "male" ? "male" : "female");

  useEffect(() => {
    if (!photoUrl) return;

    let cancelled = false;

    async function fetchShape() {
      setLoading(true);
      setError(null);
      try {
        const resBlob = await fetch(photoUrl!);
        const blob = await resBlob.blob();

        const formData = new FormData();
        formData.append("file", blob, "photo.jpg");
        formData.append("sex", gender);

        const res = await fetch("/v1/simulation/face-shape", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Failed to analyze face shape (${res.status})`);
        }

        const json = (await res.json()) as FaceShapeResult;
        if (!cancelled) {
          setData(json);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not analyze face shape");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchShape();

    return () => {
      cancelled = true;
    };
  }, [photoUrl, gender]);

  if (!photoUrl) return null;

  const currentStyling =
    gender === "male"
      ? data?.styling?.male ?? {
          hairstyles: data?.hairstyles ?? [],
          glasses: data?.glasses ?? [],
          aesthetic_focus: data?.aesthetic_focus ?? [],
        }
      : data?.styling?.female ?? {
          hairstyles: data?.hairstyles ?? [],
          glasses: data?.glasses ?? [],
          aesthetic_focus: data?.aesthetic_focus ?? [],
        };

  return (
    <section className="my-4 border border-line bg-surface p-4 print:break-inside-avoid">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <div>
            <h3 className="text-sm font-semibold text-ink">รูปทรงใบหน้าและแนวทางการเลือกสไตล์</h3>
            <p className="text-sm text-ink-2">
              วิเคราะห์รูปทรงใบหน้าและสัดส่วนโครงหน้าเบื้องต้น
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-ink-2 hover:text-ink cursor-pointer"
            aria-label="Toggle details"
          >
            {expanded ? (
              <ChevronUp style={{ width: 16, height: 16 }} />
            ) : (
              <ChevronDown style={{ width: 16, height: 16 }} />
            )}
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-6 text-center text-sm text-ink-2">
          กำลังประเมินโครงสร้างและจำแนกรูปทรงใบหน้า...
        </div>
      )}

      {error && (
        <div className="py-4 text-sm text-error">
          ไม่สามารถวิเคราะห์รูปทรงใบหน้าได้: {error}
        </div>
      )}

      {data && (
        <div className="pt-4 space-y-4">
          {/* Summary Box */}
          <div className="border border-line bg-paper p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-ink">
                  {data.name_th}
                </span>
                <span className="text-sm text-ink-3">
                  ความสอดคล้อง: <strong className="text-ink-2">{Math.round(data.confidence * 100)}%</strong>
                </span>
              </div>
              <div className="flex gap-2 text-sm text-ink-3">
                <span>
                  L/W Ratio: <strong className="text-ink-2">{data.metrics.length_to_width_ratio}</strong>
                </span>
                <span className="text-ink-muted/50">|</span>
                <span>
                  Chin Angle: <strong className="text-ink-2">{data.metrics.chin_angle_deg}°</strong>
                </span>
              </div>
            </div>
            <p className="mt-2 text-sm text-ink-2">{data.description}</p>
          </div>

          {/* Gender Selector for Styling */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-ink-2">คำแนะนำสำหรับทรงผมและกรอบแว่นตา:</span>
            <div className="inline-flex rounded-control border border-line bg-surface" style={{ padding: 2 }}>
              <button
                type="button"
                onClick={() => setGenderOverride("female")}
                className="rounded-control px-3 py-1 transition-all"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: gender === "female" ? 600 : 400,
                  backgroundColor: gender === "female" ? "var(--accent)" : "transparent",
                  color: gender === "female" ? "#ffffff" : "var(--ink-2)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ผู้หญิง (Female)
              </button>
              <button
                type="button"
                onClick={() => setGenderOverride("male")}
                className="rounded-control px-3 py-1 transition-all"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: gender === "male" ? 600 : 400,
                  backgroundColor: gender === "male" ? "var(--accent)" : "transparent",
                  color: gender === "male" ? "#ffffff" : "var(--ink-2)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ผู้ชาย (Male)
              </button>
            </div>
          </div>

          {/* Subcards Grid */}
          {expanded && (
            <div
              className="gap-3"
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
            >
              {/* Hairstyles */}
              <div className="border border-line bg-paper p-3">
                <div className="text-sm font-semibold text-ink mb-2">
                  ทรงผมที่แนะนำ ({gender === "female" ? "ผู้หญิง" : "ผู้ชาย"})
                </div>
                <ul className="space-y-1 text-sm text-ink-2">
                  {currentStyling.hairstyles.map((tip, i) => (
                    <li key={i}>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Glasses */}
              <div className="border border-line bg-paper p-3">
                <div className="text-sm font-semibold text-ink mb-2">
                  แว่นตาที่รับกับรูปหน้า ({gender === "female" ? "ผู้หญิง" : "ผู้ชาย"})
                </div>
                <ul className="space-y-1 text-sm text-ink-2">
                  {currentStyling.glasses.map((tip, i) => (
                    <li key={i}>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Aesthetic Focus */}
              <div className="border border-line bg-paper p-3">
                <div className="text-sm font-semibold text-ink mb-2">
                  จุดเน้นเสริมมิติโครงหน้า ({gender === "female" ? "ผู้หญิง" : "ผู้ชาย"})
                </div>
                <ul className="space-y-1 text-sm text-ink-2">
                  {currentStyling.aesthetic_focus.map((tip, i) => (
                    <li key={i}>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
