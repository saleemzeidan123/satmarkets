"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Pause / resume a listing. The owner dashboard used to show listings with no way
// to act on them at all.
export default function ListingStatusToggle({
  id, status, t,
}: {
  id: string;
  status: string;
  t: { pause: string; resume: string; working: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canToggle = status === "published" || status === "archived";
  if (!canToggle) return null;

  async function go() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/listings/${id}/status`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error || "Could not update."); setBusy(false); return; }
      setBusy(false);
      router.refresh();
    } catch {
      setErr("Could not update."); setBusy(false);
    }
  }

  return (
    <div className="col" style={{ alignItems: "flex-end", gap: 4 }}>
      <button type="button" className="btn secondary sm" onClick={go} disabled={busy}>
        {busy ? t.working : status === "published" ? t.pause : t.resume}
      </button>
      {err && <span role="alert" style={{ color: "var(--red)", fontSize: 11 }}>{err}</span>}
    </div>
  );
}
