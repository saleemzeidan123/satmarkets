"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Where does this enquiry stand? The owner sets it, and that is what makes the
// dashboard queue and the enquiries badge resolve. Kept to a small, plain set a
// broker will actually use: new, in touch, won, closed. "Qualified" exists in the
// data model but is folded into the flow rather than shown as a fifth button that
// nobody reads.
const STATES = [
  { v: "new", en: "New", ar: "جديد" },
  { v: "contacted", en: "In touch", ar: "تم التواصل" },
  { v: "converted", en: "Won", ar: "مكسوب" },
  { v: "closed_lost", en: "Closed", ar: "مُغلق" },
] as const;

export default function LeadStatusControl({ id, locale, initial }: { id: string; locale: string; initial: string }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [status, setStatus] = useState(initial || "new");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function set(next: string) {
    if (next === status || busy) return;
    setBusy(next); setErr(null);
    const prev = status;
    setStatus(next); // optimistic
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) { setStatus(prev); setErr(ar ? "تعذّر التحديث." : "Could not update."); }
      else router.refresh();
    } catch { setStatus(prev); setErr(ar ? "تعذّر التحديث." : "Could not update."); }
    finally { setBusy(null); }
  }

  return (
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>{ar ? "الحالة" : "Status"}</div>
      <div className="row gap8 wrap">
        {STATES.map((s) => {
          const on = status === s.v;
          return (
            <button
              key={s.v}
              type="button"
              onClick={() => set(s.v)}
              disabled={!!busy}
              aria-pressed={on}
              className="chip"
              style={{
                cursor: busy ? "default" : "pointer",
                borderColor: on ? "var(--harbor)" : "var(--silver)",
                background: on ? "var(--harbor)" : "var(--paper)",
                color: on ? "var(--on-brand)" : "var(--slate)",
                fontWeight: on ? 700 : 500,
              }}
            >
              {busy === s.v ? (ar ? "..." : "...") : (ar ? s.ar : s.en)}
            </button>
          );
        })}
      </div>
      {err && <p style={{ fontSize: 12, color: "var(--red)", marginTop: 8, marginBottom: 0 }}>{err}</p>}
    </div>
  );
}
