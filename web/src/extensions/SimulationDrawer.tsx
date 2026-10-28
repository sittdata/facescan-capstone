import { useState } from "react";
import { X, Sliders, RotateCcw, Download, Sparkles, SplitSquareHorizontal } from "lucide-react";
import type { SimulationParams } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  photoUrl: string | null;
}

export function SimulationDrawer({ open, onClose, photoUrl }: Props) {
  const [params, setParams] = useState<SimulationParams>({
    rhinoplasty: 0,
    lip_augmentation: 0,
    chin_augmentation: 0,
  });

  const [warpedUrl, setWarpedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"side-by-side" | "single">("side-by-side");
  const [showOriginal, setShowOriginal] = useState(false);

  if (!open || !photoUrl) return null;

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    try {
      const resBlob = await fetch(photoUrl);
      const blob = await resBlob.blob();

      const formData = new FormData();
      formData.append("file", blob, "photo.jpg");
      formData.append("rhinoplasty", (params.rhinoplasty / 100).toString());
      formData.append("lip_augmentation", (params.lip_augmentation / 100).toString());
      formData.append("chin_augmentation", (params.chin_augmentation / 100).toString());

      const res = await fetch("/v1/simulation/warp", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Simulation failed with status ${res.status}`);
      }

      const warpedBlob = await res.blob();
      const url = URL.createObjectURL(warpedBlob);
      setWarpedUrl(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to warp image");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setParams({
      rhinoplasty: 0,
      lip_augmentation: 0,
      chin_augmentation: 0,
    });
    setWarpedUrl(null);
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative flex max-h-[92vh] w-full flex-col rounded-viewer bg-surface border border-line overflow-hidden"
        style={{ maxWidth: 896, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-2">
            <span
              className="flex items-center justify-center rounded-viewer text-accent"
              style={{ width: 36, height: 36, backgroundColor: "var(--accent-band)" }}
            >
              <Sliders style={{ width: 20, height: 20 }} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-ink">จำลองการปรับรูปหน้า (Aesthetic Simulation)</h2>
              <p className="text-ink-2" style={{ fontSize: "0.8125rem" }}>
                ระบบ Thin Plate Spline (TPS) คำนวณการปรับรูปทรงใบหน้าเฉพาะจุด
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "side-by-side" ? "single" : "side-by-side")}
              className="inline-flex items-center gap-1 rounded-control border border-line px-2 py-1 text-ink-2"
              style={{ fontSize: "0.8125rem" }}
              title="Toggle View Mode"
            >
              <SplitSquareHorizontal style={{ width: 16, height: 16 }} />
              {viewMode === "side-by-side" ? "จอเดี่ยว" : "เปรียบเทียบ"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-control p-1 text-ink-2"
              aria-label="Close"
            >
              <X style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="grid flex-1 overflow-y-auto md:grid-cols-12 gap-6 p-6">
          {/* Images Section */}
          <div
            className="md:col-span-7 flex flex-col items-center justify-center rounded-viewer border border-line p-3"
            style={{ minHeight: 340, backgroundColor: "var(--notice)" }}
          >
            {viewMode === "side-by-side" ? (
              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="flex flex-col items-center">
                  <span className="mb-1 font-medium text-ink-2" style={{ fontSize: "0.8125rem" }}>
                    รูปต้นฉบับ (Original)
                  </span>
                  <img
                    src={photoUrl}
                    alt="Original Face"
                    className="rounded-control object-contain border border-line"
                    style={{ maxHeight: 380, width: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                  />
                </div>
                <div className="flex flex-col items-center">
                  <span className="mb-1 font-medium text-accent" style={{ fontSize: "0.8125rem" }}>
                    ผลลัพธ์จำลอง (Simulated)
                  </span>
                  <img
                    src={warpedUrl || photoUrl}
                    alt="Simulated Face"
                    className="rounded-control object-contain border border-line"
                    style={{ maxHeight: 380, width: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                  />
                </div>
              </div>
            ) : (
              <div className="relative flex flex-col items-center">
                <img
                  src={showOriginal ? photoUrl : (warpedUrl || photoUrl)}
                  alt="Face"
                  className="rounded-control object-contain border border-line"
                  style={{ maxHeight: 400, width: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                />
                {warpedUrl && (
                  <button
                    type="button"
                    onMouseDown={() => setShowOriginal(true)}
                    onMouseUp={() => setShowOriginal(false)}
                    onTouchStart={() => setShowOriginal(true)}
                    onTouchEnd={() => setShowOriginal(false)}
                    className="mt-2 text-accent underline select-none"
                    style={{ fontSize: "0.8125rem" }}
                  >
                    (กดค้างเพื่อดูรูปต้นฉบับ)
                  </button>
                )}
              </div>
            )}

            {error && (
              <p className="mt-2 font-medium text-error" style={{ fontSize: "0.8125rem" }}>
                {error}
              </p>
            )}
          </div>

          {/* Sliders & Controls */}
          <div
            className="md:col-span-5 flex flex-col justify-between"
            style={{ display: "flex", flexDirection: "column", gap: 20 }}
          >
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-ink border-b border-line pb-2">
                ระดับการปรับรูปทรง (Procedure Intensity)
              </h3>

              {/* Slider 1: Rhinoplasty */}
              <div>
                <div className="flex justify-between mb-1" style={{ fontSize: "0.8125rem" }}>
                  <span className="font-medium text-ink">ปรับแต่งทรงจมูก (Rhinoplasty)</span>
                  <span className="text-ink-2" style={{ fontFamily: "monospace" }}>
                    {params.rhinoplasty}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={params.rhinoplasty}
                  onChange={(e) => setParams({ ...params, rhinoplasty: Number(e.target.value) })}
                  className="w-full accent-accent cursor-pointer"
                />
                <p className="text-ink-2" style={{ fontSize: 11, marginTop: 2 }}>
                  ลดขนาดปีกจมูก (Alar) และยกปลายจมูก
                </p>
              </div>

              {/* Slider 2: Lip Augmentation */}
              <div>
                <div className="flex justify-between mb-1" style={{ fontSize: "0.8125rem" }}>
                  <span className="font-medium text-ink">ปรับมิติมุมปาก (Lip Fullness)</span>
                  <span className="text-ink-2" style={{ fontFamily: "monospace" }}>
                    {params.lip_augmentation}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={params.lip_augmentation}
                  onChange={(e) => setParams({ ...params, lip_augmentation: Number(e.target.value) })}
                  className="w-full accent-accent cursor-pointer"
                />
                <p className="text-ink-2" style={{ fontSize: 11, marginTop: 2 }}>
                  เติมมิติและวอลลุ่มขอบปากบน-ล่าง
                </p>
              </div>

              {/* Slider 3: Chin Augmentation */}
              <div>
                <div className="flex justify-between mb-1" style={{ fontSize: "0.8125rem" }}>
                  <span className="font-medium text-ink">ปรับมิติปลายคาง (Chin Augmentation)</span>
                  <span className="text-ink-2" style={{ fontFamily: "monospace" }}>
                    {params.chin_augmentation}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={params.chin_augmentation}
                  onChange={(e) => setParams({ ...params, chin_augmentation: Number(e.target.value) })}
                  className="w-full accent-accent cursor-pointer"
                />
                <p className="text-ink-2" style={{ fontSize: 11, marginTop: 2 }}>
                  ยืดมิติปลายคางแนวดิ่ง ปรับหน้าเรียว
                </p>
              </div>
            </div>

            {/* Actions */}
            <div
              className="pt-4 border-t border-line"
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              <button
                type="button"
                onClick={handleSimulate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-control bg-accent text-sm font-semibold transition-all"
                style={{ color: "#ffffff", padding: "10px 0" }}
              >
                <Sparkles style={{ width: 16, height: 16 }} />
                {loading ? "กำลังประมวลผล TPS..." : "จำลองผลลัพธ์ (Simulate)"}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 flex items-center justify-center gap-1 rounded-control border border-line py-2 text-ink-2 transition-all"
                  style={{ fontSize: "0.8125rem" }}
                >
                  <RotateCcw style={{ width: 14, height: 14 }} />
                  รีเซ็ตค่า
                </button>

                {warpedUrl && (
                  <a
                    href={warpedUrl}
                    download="face_simulation.jpg"
                    className="flex-1 flex items-center justify-center gap-1 rounded-control border border-line py-2 text-ink-2 transition-all"
                    style={{ fontSize: "0.8125rem" }}
                  >
                    <Download style={{ width: 14, height: 14 }} />
                    บันทึกรูป
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
