"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Confirm or decline. No optimistic update: if the decision did not save, the screen
// must not show it as saved. The lister is about to tell a human being to drive across
// Riyadh on the strength of what this button says.
export default function ViewingDecision({
  id, locale, current,
}: { id: string; locale: string; current: string }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const t = ar
    ? { confirm: "تأكيد", decline: "اعتذار", failed: "تعذر الحفظ. حاول مرة أخرى." }
    : { confirm: "Confirm", decline: "Decline", failed: "That did not save. Try again." };

  async function decide(status: "confirmed" | "cancelled") {
    setBusy(status);
    setErr(null);
    try {
      const res = await fetch(`/api/viewings/${id}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j?.error || t.failed);
        setBusy(null);
        return;
      }
      router.refresh();
    } catch {
      setErr(t.failed);
    }
    setBusy(null);
  }

  if (current !== "requested") return null;

  return (
    <div className="col" style={{ gap: 6, alignItems: "flex-end" }}>
      <div className="row" style={{ gap: 8 }}>
        <button
          onClick={() => decide("confirmed")}
          disabled={!!busy}
          className="btn primary sm"
          style={{ minHeight: 36, opacity: busy ? 0.6 : 1 }}
        >
          {busy === "confirmed" ? "..." : t.confirm}
        </button>
        <button
          onClick={() => decide("cancelled")}
          disabled={!!busy}
          className="btn ghost sm"
          style={{ minHeight: 36, opacity: busy ? 0.6 : 1 }}
        >
          {busy === "cancelled" ? "..." : t.decline}
        </button>
      </div>
      {err && <span role="alert" style={{ color: "var(--red)", fontSize: 11.5 }}>{err}</span>}
    </div>
  );
}
