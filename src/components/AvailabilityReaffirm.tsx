"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// The lister's answer to the sentence PKG-AV1 put on their card. One button, one
// listing, one affirmation.
//
// Two deliberate refusals, both of them Law 3 (the date must be a real event):
//
//   There is no bulk "confirm everything" control. An affirmation SAT prompted
//   into existence across a whole portfolio with one click is not more truthful
//   than the date it replaced; it is the same guess with a newer timestamp. The
//   lister answers for one space at a time because that is the only way the
//   answer means anything.
//
//   The button is not called "refresh" or "update". It is the sentence being
//   affirmed, so pressing it is saying it. A control labelled by its effect on
//   the display invites the lister to think about their ranking; a control
//   labelled by its claim invites them to think about the space.
//
// The write goes to PATCH /api/listings/[id], which owns the permission rule
// (availability is the lister's at any stage) and rejects a future date. This
// component sends `now` and nothing else, so no other field can move with it.
export default function AvailabilityReaffirm({
  id,
  t,
}: {
  id: string;
  t: { action: string; working: string; done: string; failed: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ availability_confirmed_at: new Date().toISOString() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof j.error === "string" ? j.error : t.failed);
        setBusy(false);
        return;
      }
      setBusy(false);
      setDone(true);
      router.refresh();
    } catch {
      setErr(t.failed);
      setBusy(false);
    }
  }

  if (done) {
    return (
      <span role="status" className="mono" style={{ color: "var(--harbor-d)", fontSize: 11 }}>
        {t.done}
      </span>
    );
  }

  return (
    <span className="col" style={{ alignItems: "flex-start", gap: 4 }}>
      <button type="button" className="btn secondary sm" onClick={go} disabled={busy}>
        {busy ? t.working : t.action}
      </button>
      {err && (
        <span role="alert" style={{ color: "var(--red)", fontSize: 11, lineHeight: 1.5 }}>
          {err}
        </span>
      )}
    </span>
  );
}
