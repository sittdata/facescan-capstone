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

/**
 * Converts a base64 data URI to a blob URL synchronously and safely without fetch(),
 * avoiding CSP restrictions and browser fetch failures on data URIs.
 */
function dataUriToBlobUrl(dataUri: string): string {
  try {
    const parts = dataUri.split(",");
    const mime = parts[0]?.match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(parts[1] || "");
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    return URL.createObjectURL(new Blob([u8arr], { type: mime }));
  } catch {
    return dataUri;
  }
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
      formData.append("sex", state.subject?.sex ?? state.draft?.sex ?? "female");
      formData.append("age", String(state.subject?.age ?? state.draft?.age ?? 25));
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
        let photoUrl = "";
        if (data.aligned_photo) {
          photoUrl = dataUriToBlobUrl(data.aligned_photo);
        } else if (state.frontal.photoUrl) {
          photoUrl = state.frontal.photoUrl;
        } else if (frame.blob) {
          photoUrl = URL.createObjectURL(frame.blob);
        }

        const analysis = analysisFrom(data, currentLanguage() as "th" | "en", Date.now());

        dispatch({
          type: "analysis_ok",
          view: "frontal",
          analysis,
          photoUrl: photoUrl || undefined,
        });

        navigate(scanPath("frontal", "result"));
      } else {
        const msg =
          (Array.isArray(data.hints) && data.hints[0]) ||
          "ระบบไม่สามารถตรวจจับใบหน้าในภาพนี้ได้ กรุณาใช้ภาพที่เห็นใบหน้าชัดเจน";
        throw new Error(msg);
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
        หมุนปรับระดับระนาบดวงตา (Affine Roll Alignment) ชดเชยมุมเอียง และคำนวณสัดส่วนใบหน้าทันทีโดยข้าม Quality Gate ทางคลินิก (เหมาะสำหรับภาพถ่ายทั่วไป / เซลฟี่)
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
          {busy ? "กำลังปรับระนาบและคำนวณ..." : "วิเคราะห์ต่อทันทีด้วย Auto-Alignment (ข้ามเกณฑ์คัดกรอง)"}
        </Button>
      </div>
    </section>
  );
}
