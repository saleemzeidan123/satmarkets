"use client";
import { useState } from "react";

// A quiet "Report this listing" affordance. Governance made visible: it signals SAT
// actively polices the exchange. Opens a small inline form (reason + optional note),
// posts to /api/report, and thanks the reporter. No page navigation, no modal trap.
export default function ReportListing({ listingId, locale }: { listingId: string; locale: "en" | "ar" }) {
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const t = ar
    ? { link: "الإبلاغ عن هذا الإعلان", prompt: "هل هناك مشكلة في هذا الإعلان؟", reason: "السبب", choose: "اختر السبب", detail: "تفاصيل (اختياري)", submit: "إرسال البلاغ", sending: "جارٍ الإرسال…", done: "شكراً لك. سنراجع هذا الإعلان.", err: "تعذّر الإرسال، حاول مرة أخرى.", cancel: "إلغاء",
        reasons: { inaccurate: "معلومات غير دقيقة", unavailable: "لم يعد متاحاً", duplicate: "إعلان مكرر", suspicious: "يبدو مريباً", other: "أخرى" } }
    : { link: "Report this listing", prompt: "Something wrong with this listing?", reason: "Reason", choose: "Choose a reason", detail: "Details (optional)", submit: "Submit report", sending: "Sending…", done: "Thank you. We will review this listing.", err: "Could not send, please try again.", cancel: "Cancel",
        reasons: { inaccurate: "Inaccurate information", unavailable: "No longer available", duplicate: "Duplicate listing", suspicious: "Looks suspicious", other: "Other" } };

  if (state === "done") {
    return <p className="muted" style={{ fontSize: 12.5, marginTop: 14, display: "flex", gap: 6, alignItems: "center" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2C557F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
      {t.done}
    </p>;
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="muted" style={{ background: "none", border: "none", padding: 0, marginTop: 14, cursor: "pointer", fontSize: 12.5, color: "var(--slate)", textDecoration: "underline", textUnderlineOffset: 3 }}>
        {t.link}
      </button>
    );
  }

  const submit = async () => {
    if (!reason) return;
    setState("busy");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listing_id: listingId, reason, detail }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="card pad" style={{ marginTop: 14, boxShadow: "none", border: "1px solid var(--silver)", maxWidth: 460 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.prompt}</div>
      <label style={{ display: "block", fontSize: 12, color: "var(--slate)", marginTop: 10 }}>{t.reason}</label>
      <select value={reason} onChange={(e) => setReason(e.target.value)}
        style={{ width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--silver)", fontSize: 13, background: "var(--paper)" }}>
        <option value="">{t.choose}</option>
        {Object.entries(t.reasons).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <label style={{ display: "block", fontSize: 12, color: "var(--slate)", marginTop: 10 }}>{t.detail}</label>
      <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={2} maxLength={1000}
        style={{ width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--silver)", fontSize: 13, background: "var(--paper)", resize: "vertical", fontFamily: "inherit" }} />
      {state === "error" && <p style={{ color: "#B23B3B", fontSize: 12.5, marginTop: 8 }}>{t.err}</p>}
      <div className="row gap8" style={{ marginTop: 12 }}>
        <button type="button" onClick={submit} disabled={!reason || state === "busy"} className="btn primary sm" style={{ opacity: !reason || state === "busy" ? 0.6 : 1 }}>
          {state === "busy" ? t.sending : t.submit}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn secondary sm">{t.cancel}</button>
      </div>
    </div>
  );
}
