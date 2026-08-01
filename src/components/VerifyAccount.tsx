"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
      if (!res.ok) { setErr(j.error || "Could not save."); setBusy(false); return; }
      setOpen(null); setBasis(""); setBusy(false);
      router.refresh();
    } catch {
      setErr("Could not save."); setBusy(false);
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
