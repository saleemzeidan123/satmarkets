"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiErrors";
import { gateReasonsText, isGateReason } from "@/lib/gate";

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
  id, status, blocked, ar, t,
}: {
  id: string;
  status: string;
  blocked?: string | null;
  /** Finding 203. Both call sites live under `src/app/[locale]/`, so both know
   *  the locale, and the component no longer has to infer it. */
  ar: boolean;
  /** `failed` is optional so the manage screen, which does not pass it, still
   *  compiles; the fallback is written in the language `ar` names. */
  t: { pause: string; resume: string; working: string; cannot: string; failed?: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // ELITE-4 J2-20: this said "Could not update." in English to an Arabic reader.
  // The sentence comes from the caller, and where the caller is silent it is
  // written in the reader's language.
  //
  // Finding 203: the fallback used to detect that language by looking for Arabic
  // characters in two labels the caller happened to pass. That is a guess, and it
  // fails silently the moment a label is a numeral, a brand name or an empty
  // string. `ar` is now passed in by callers that have always known it.
  const failedText = t.failed ?? (ar ? "تعذّر التحديث." : "Could not update.");
  const reasonId = `status-blocked-${id}`;

  const canToggle = status === "published" || status === "archived";
  if (!canToggle) return null;

  const isBlocked = status === "archived" && !!blocked;

  async function go() {
    // ELITE-4 J2-6: no `disabled` attribute anywhere on this control, so pressing
    // it cannot blur it. This guard is the behaviour `aria-disabled` announces.
    if (busy || isBlocked) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/listings/${id}/status`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Finding 203. The publish gate names its own reasons in the gate's stable
        // vocabulary, and those are record specific: they say which document is
        // missing, which is the thing the owner has to go and fix. They are
        // preferred over the one sentence the shared table has for the whole gate.
        // Every other refusal is named from that table.
        const reasons = Array.isArray(j.reasons) ? j.reasons.filter(isGateReason) : [];
        setErr(reasons.length ? gateReasonsText(reasons, ar) : apiErrorMessage(j.code, ar, failedText));
        setBusy(false); return;
      }
      setBusy(false);
      router.refresh();
    } catch {
      setErr(failedText); setBusy(false);
    }
  }

  return (
    <div className="col" style={{ alignItems: "flex-end", gap: 4 }} aria-busy={busy || undefined}>
      {/* ELITE-4 J2-10: the reason used to live on `title=` of a button that was
          simultaneously `disabled`, which keyboard and screen reader users could
          neither reach nor hover. It is now the button's own description, read
          from the span already on screen. */}
      <button
        type="button"
        className="btn secondary sm"
        onClick={go}
        aria-disabled={busy || isBlocked || undefined}
        aria-describedby={isBlocked ? reasonId : undefined}
        style={{ opacity: busy || isBlocked ? 0.65 : 1 }}
      >
        {busy ? t.working : status === "published" ? t.pause : t.resume}
      </button>
      {isBlocked && (
        <span id={reasonId} style={{ color: "var(--slate)", fontSize: "0.6875rem", maxWidth: 230, textAlign: "end", lineHeight: 1.5 }}>
          {t.cannot} {blocked}
        </span>
      )}
      {err && <span role="alert" style={{ color: "var(--red)", fontSize: "0.6875rem" }}>{err}</span>}
    </div>
  );
}
