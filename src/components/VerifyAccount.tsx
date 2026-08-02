"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiErrors";

// The control behind the "verified owner" badge. Deliberately not a one-click
// approve: a decision requires a stated basis, because a verification with no
// evidence behind it is a rubber stamp, and the badge exists to say it is not one.
// The basis is written to an append-only ledger with the actor and the timestamp,
// so every badge on the platform can be traced back to a person and a reason.
export default function VerifyAccount({
  accountId, status, locale, t,
}: {
  accountId: string;
  status: string;
  locale: string;
  t: { verify: string; reject: string; revoke: string; basis: string; basisPh: string; cancel: string; save: string; saving: string; minBasis: string };
}) {
  // Finding 203. The locale arrived here and was never read, so every refusal
  // on this screen was English on a page rendering Arabic. The bilingual labels
  // beside them came down from the page as `t`, which made the error line the
  // one string on the screen that did not follow the reader.
  const ar = locale === "ar";
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [basis, setBasis] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (basis.trim().length < 8) { setErr(t.minBasis); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/verification`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: open, basis: basis.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(apiErrorMessage(j.code, ar, ar ? "تعذّر الحفظ." : "Could not save."));
        setBusy(false);
        return;
      }
      setOpen(null); setBasis(""); setBusy(false);
      router.refresh();
    } catch {
      // A network or parse failure, which is not the same event as a decision
      // the server refused and no longer borrows its sentence.
      setErr(ar
        ? "تعذّر الوصول إلى الخادم. تحقق من اتصالك ثم أعد المحاولة."
        : "Could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  const actions = status === "verified"
    ? [{ key: "unverified", label: t.revoke }]
    : [{ key: "verified", label: t.verify }, { key: "rejected", label: t.reject }];

  if (open) {
    return (
      <div style={{ minWidth: 260 }}>
        <label htmlFor={`basis-${accountId}`} style={{ fontSize: "0.71875rem", fontWeight: 600, display: "block", marginBottom: 4 }}>{t.basis}</label>
        <textarea
          id={`basis-${accountId}`}
          value={basis}
          onChange={(e) => setBasis(e.target.value)}
          placeholder={t.basisPh}
          rows={3}
          style={{ width: "100%", border: "1px solid var(--silver)", borderRadius: 8, padding: "8px 10px", fontSize: "0.78125rem", resize: "vertical" }}
        />
        {err && <div role="alert" style={{ color: "var(--red)", fontSize: "0.71875rem", marginTop: 4 }}>{err}</div>}
        <div className="row gap6" style={{ marginTop: 8 }}>
          <button type="button" className="btn primary sm" onClick={submit} disabled={busy}>{busy ? t.saving : t.save}</button>
          <button type="button" className="btn secondary sm" onClick={() => { setOpen(null); setErr(null); }}>{t.cancel}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="row gap6" style={{ justifyContent: "flex-end" }}>
      {actions.map((a) => (
        <button key={a.key} type="button" className="btn secondary sm" onClick={() => { setOpen(a.key); setBasis(""); setErr(null); }}>{a.label}</button>
      ))}
    </div>
  );
}
