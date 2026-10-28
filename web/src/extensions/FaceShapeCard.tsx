import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Sliders } from "lucide-react";
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

  // Select styling recommendations according to active gender
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
    <section
      className="my-6 rounded-viewer border border-line bg-surface p-4 print:break-inside-avoid"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-2">
          <span
            style={{
              width: 4,
              height: 20,
              backgroundColor: "var(--accent)",
              borderRadius: 2,
            }}
          />
          <div>
            <h3 className="text-lg font-semibold text-ink">รูปทรงใบหน้า & สไตล์ลิ่ง (Face Shape & Styling)</h3>
            <p className="text-ink-2" style={{ fontSize: "0.8125rem" }}>
              วิเคราะห์อัตราส่วนโครงหน้าตามเกณฑ์มานุษยวิทยาคลินิก
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSimulation && (
            <button
              type="button"
              onClick={onOpenSimulation}
              className="inline-flex items-center gap-1 rounded-control bg-accent px-3 py-1 font-medium transition-all"
              style={{ fontSize: "0.8125rem", color: "#ffffff" }}
            >
              <Sliders style={{ width: 14, height: 14 }} />
              <span>จำลองปรับรูปหน้า</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="rounded-control p-1 text-ink-2"
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
        <div className="pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center rounded-control px-3 py-1 text-sm font-semibold text-accent"
                style={{ backgroundColor: "var(--accent-band)" }}
              >
                {data.name_th}
              </span>
              <span className="text-ink-2" style={{ fontSize: "0.8125rem" }}>
                ความสอดคล้อง: <strong>{Math.round(data.confidence * 100)}%</strong>
              </span>
            </div>

            <div className="flex gap-2 text-ink-2" style={{ fontSize: "0.8125rem" }}>
              <span>
                L/W Ratio: <strong>{data.metrics.length_to_width_ratio}</strong>
              </span>
              <span>•</span>
              <span>
                Chin Angle: <strong>{data.metrics.chin_angle_deg}°</strong>
              </span>
            </div>
          </div>

          <p className="mt-2 text-sm text-ink">{data.description}</p>

          {/* Gender Selector Segmented Pills */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <div className="font-semibold text-ink-2" style={{ fontSize: "0.75rem" }}>
              คำแนะนำสไตล์ลิ่งเฉพาะเพศ:
            </div>
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

          {expanded && (
            <div
              className="mt-3 gap-4"
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
            >
              {/* Hairstyles */}
              <div
                className="rounded-viewer p-3 border border-line"
                style={{ backgroundColor: "var(--notice)" }}
              >
                <div
                  className="font-semibold text-ink mb-2"
                  style={{ fontSize: "0.8125rem", color: "var(--accent)" }}
                >
                  ทรงผมที่แนะนำ ({gender === "female" ? "ผู้หญิง" : "ผู้ชาย"})
                </div>
                <ul className="space-y-1 text-ink-2" style={{ fontSize: "0.8125rem" }}>
                  {currentStyling.hairstyles.map((tip, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-accent" style={{ marginTop: 2 }}>
                        •
                      </span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Glasses */}
              <div
                className="rounded-viewer p-3 border border-line"
                style={{ backgroundColor: "var(--notice)" }}
              >
                <div
                  className="font-semibold text-ink mb-2"
                  style={{ fontSize: "0.8125rem", color: "var(--accent)" }}
                >
                  แว่นตาที่รับกับรูปหน้า ({gender === "female" ? "ผู้หญิง" : "ผู้ชาย"})
                </div>
                <ul className="space-y-1 text-ink-2" style={{ fontSize: "0.8125rem" }}>
                  {currentStyling.glasses.map((tip, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-accent" style={{ marginTop: 2 }}>
                        •
                      </span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Aesthetic Focus */}
              <div
                className="rounded-viewer p-3 border border-line"
                style={{ backgroundColor: "var(--notice)" }}
              >
                <div
                  className="font-semibold text-ink mb-2"
                  style={{ fontSize: "0.8125rem", color: "var(--accent)" }}
                >
                  จุดเน้นเสริมมิติโครงหน้า ({gender === "female" ? "ผู้หญิง" : "ผู้ชาย"})
                </div>
                <ul className="space-y-1 text-ink-2" style={{ fontSize: "0.8125rem" }}>
                  {currentStyling.aesthetic_focus.map((tip, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-accent" style={{ marginTop: 2 }}>
                        •
                      </span>
                      <span>{tip}</span>
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
