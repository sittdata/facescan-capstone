/**
 * Auto-Alignment Card (Extension ported from DSI314).
 * Allows bypassing strict clinical pose/tilt rejection by performing
 * 2D affine roll alignment on eye pupils and computing facial geometry.
 */
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/Button";
import { Notice } from "../components/ui/Notice";
import { currentLanguage } from "../i18n";
import { useScan } from "../scan/ScanContext";
import { analysisFrom } from "../scan/session";
import { scanPath } from "../screens/paths";

interface AutoAlignCardProps {
  className?: string;
  compact?: boolean;
}

export function AutoAlignCard({ className = "", compact = false }: AutoAlignCardProps) {
  const navigate = useNavigate();
  const { state, dispatch } = useScan();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = state.frontal.capture;
  if (!capture || !capture.frames[0]) return null;

  const handleAutoAlign = async () => {
    setBusy(true);
    setError(null);
    try {
      const frame = capture.frames[0]!;
      const formData = new FormData();
      formData.append("file", frame.blob, "frontal.jpg");
      formData.append("sex", state.subject?.sex ?? "female");
      formData.append("age", String(state.subject?.age ?? 25));
      formData.append("locale", currentLanguage());

      const res = await fetch("/v1/simulation/auto-align", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ detail: "ไม่สามารถประมวลผลภาพได้" }));
        throw new Error(errJson.detail || "การประมวลผลปรับระนาบล้มเหลว");
      }

      const data = await res.json();
      if (data.status === "ok") {
        let photoUrl = state.frontal.photoUrl;
        if (data.aligned_photo) {
          const blobRes = await fetch(data.aligned_photo);
          const blob = await blobRes.blob();
          photoUrl = URL.createObjectURL(blob);
        }

        dispatch({
          type: "analysis_ok",
          view: "frontal",
          analysis: analysisFrom(data, currentLanguage() as "th" | "en", Date.now()),
          photoUrl: photoUrl ?? undefined,
        });
        navigate(scanPath("frontal", "result"));
      } else {
        throw new Error("ระบบไม่สามารถตรวจจับใบหน้าในภาพนี้ได้");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการประมวลผลปรับระนาบ");
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    return (
      <Button
        variant="secondary"
        onClick={handleAutoAlign}
        disabled={busy}
        className={className}
      >
        {busy ? "กำลังปรับระนาบ..." : "วิเคราะห์ด้วย Auto-Align"}
      </Button>
    );
  }

  return (
    <section className={`rounded-control border border-line bg-surface-elevated p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-ink">
          โหมดปรับแนวระนาบอัตโนมัติ (Auto-Alignment)
        </h3>
        <span
          className="font-medium text-ink-2"
          style={{ padding: "2px 8px", fontSize: "11px", borderRadius: "9999px", backgroundColor: "rgba(0, 0, 0, 0.06)" }}
        >
          No Reject
        </span>
      </div>
      <p className="mt-2 text-sm text-ink-2">
        หมุนปรับระดับระนาบดวงตา (Affine Roll Alignment) ชดเชยมุมเอียง และคำนวณสัดส่วนใบหน้าทันทีโดยข้าม Quality Gate ทางคลินิก
      </p>

      {error && (
        <Notice role="alert" className="mt-3">
          <p>{error}</p>
        </Notice>
      )}

      <div className="mt-4">
        <Button
          variant="primary"
          onClick={handleAutoAlign}
          disabled={busy}
          className="w-full"
        >
          {busy ? "กำลังปรับระนาบและคำนวณ..." : "วิเคราะห์ต่อด้วย Auto-Alignment"}
        </Button>
      </div>
    </section>
  );
}
