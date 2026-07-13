"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Pause / republish a listing. The owner dashboard used to show listings with no
// way to act on them at all.
//
// Republishing is a publish, and the database will not let anything into the
// market that has not cleared the advertising-permit gate. The first version of
// this component offered a Republish button on every paused listing regardless,
// so a listing with no permit on file gave the owner a spinner and then a bare
// "Could not update." The button now tells the truth before it is pressed: if the
// listing cannot legally go back up, the control is disabled and names what is
// missing, because that is the thing the owner has to go and fix.
export default function ListingStatusToggle({
  id, status, blocked, t,
}: {
  id: string;
  status: string;
  blocked?: string | null;
  t: { pause: string; resume: string; working: string; cannot: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canToggle = status === "published" || status === "archived";
  if (!canToggle) return null;

  const isBlocked = status === "archived" && !!blocked;

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
      <button
        type="button"
        className="btn secondary sm"
        onClick={go}
        disabled={busy || isBlocked}
        title={isBlocked ? blocked || undefined : undefined}
      >
        {busy ? t.working : status === "published" ? t.pause : t.resume}
      </button>
      {isBlocked && (
        <span style={{ color: "var(--slate)", fontSize: 11, maxWidth: 230, textAlign: "end", lineHeight: 1.5 }}>
          {t.cannot} {blocked}
        </span>
      )}
      {err && <span role="alert" style={{ color: "var(--red)", fontSize: 11 }}>{err}</span>}
    </div>
  );
}
