"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/satkit";
import { getDictionary } from "@/i18n/getDictionary";
import { assetLabel, cityLabel } from "@/lib/labels";
import { timelineLabel, mustHaveLabel } from "@/lib/requirementIntake";
import type { MatchReason, MatchVerdict } from "@/lib/matching";

// PKG-DEM1, finding 100's read side. The stored timeline and must-have tokens are
// named through the vocabulary the form renders from and the write path
// validates against, so this page cannot start naming them a second way.

interface Req { id: string; ref: string; title: string; titleAr?: string | null; asset: string; deal: string; district: string; districtAr?: string | null; city: string; sizeMin: number; sizeMax: number; budget: number; timeline: string; mustHaves: string[]; createdAt: string; }
interface Interest { id: string; type: string; name: string; org: string; message: string; createdAt: string; mine?: boolean; }
interface Summary { total: number; owners: number; brokers: number; }

// The shape /api/requirements/[id]/matches returns. It is the matching model's
// own output, carried through rather than flattened, because a verdict without
// its dimensions is a recommendation and this page may not make one.
interface MatchRow {
  listing_id: string;
  title_en: string | null;
  title_ar: string | null;
  // PKG-NM1. The name in each language, already resolved by the route through
  // `listingTitle`. This page picks its own and never borrows the other one.
  name_en?: string | null;
  name_ar?: string | null;
  verdict: MatchVerdict;
  verdict_en: string;
  verdict_ar: string;
  counts: { met: number; tolerance: number; unknown: number; failed: number };
  reasons: MatchReason[];
}
interface MatchPayload {
  tolerances: { size_pct: number; budget_pct: number };
  matches: MatchRow[];
  truncated: boolean;
  excluded_count: number;
}

const NOTE: Record<MatchReason["state"], string> = { met: "✓", tolerance: "~", unknown: "?", failed: "×" };

export default function RequirementDetail({ params }: { params: { locale: string; id: string } }) {
 const locale = params.locale === "ar" ? "ar" : "en";
 const ar = locale === "ar";
 const t = getDictionary(locale).reqDetail;
 const [req, setReq] = useState<Req | null>(null);
 const [ints, setInts] = useState<Interest[]>([]);
 const [summary, setSummary] = useState<Summary>({ total: 0, owners: 0, brokers: 0 });
 const [identitiesVisible, setIdentitiesVisible] = useState(false);
 const [loading, setLoading] = useState(true);
 const [show, setShow] = useState(false);
 const [msg, setMsg] = useState("");
 const [busy, setBusy] = useState(false);
 const [err, setErr] = useState<string | null>(null);
 const [needAuth, setNeedAuth] = useState(false);
 const [matches, setMatches] = useState<MatchPayload | null>(null);
 const [matchesLoading, setMatchesLoading] = useState(false);
 const [attached, setAttached] = useState<string | null>(null);

 const load = () => fetch(`/api/requirements/${params.id}`).then((r) => r.json()).then((j) => { setReq(j.requirement); setInts(j.interests || []); setSummary(j.summary || { total: 0, owners: 0, brokers: 0 }); setIdentitiesVisible(!!j.identitiesVisible); setLoading(false); }).catch(() => setLoading(false));
 useEffect(() => { load(); }, []);

 // Asked only once the responder opens the panel, and only ever answered for
 // the caller's own listings. A 401 or a 403 is not an error to show here: the
 // register button below already says what signing in and verification are for,
 // and repeating it beside an empty list would read as a failure rather than as
 // a permission the visitor has not got yet.
 function openPanel() {
  const next = !show;
  setShow(next);
  if (!next || matches || matchesLoading) return;
  setMatchesLoading(true);
  fetch(`/api/requirements/${params.id}/matches`)
   .then((r) => (r.ok ? r.json() : null))
   .then((j) => { if (j) setMatches(j as MatchPayload); setMatchesLoading(false); })
   .catch(() => setMatchesLoading(false));
 }

 async function register() {
  setBusy(true); setErr(null); setNeedAuth(false);
  try {
   // Identity (owner vs broker, name, org) is derived server-side from the
   // verified account. We only send what the user actually wrote, plus the id
   // of a listing they picked from their own matches. The write path validates
   // that id; nothing here can attach a listing the account does not own.
   const res = await fetch(`/api/requirements/${params.id}/interest`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: msg, listing_id: attached }) });
   const j = await res.json().catch(() => ({}));
   if (res.status === 401) { setNeedAuth(true); setErr(j.error || t.errSignIn); setBusy(false); return; }
   if (!res.ok || j.error) { setErr(j.error || t.errRegister); setBusy(false); return; }
   setMsg(""); setShow(false); setBusy(false); setAttached(null);
   load();
  } catch {
   setErr(t.errRegister); setBusy(false);
  }
 }

 if (loading) return <div style={{ padding: 48, textAlign: "center" }} className="muted">{t.loading}…</div>;
 if (!req) return <div style={{ padding: 48, textAlign: "center" }} className="muted">{t.notFound} <Link href={`/${locale}/requirements`} style={{ color: "var(--azure-d)" }}>{t.backLink} {ar ? "←" : "→"}</Link></div>;

 return (
  <div style={{ background: "var(--cool)" }}>
   <div style={{ padding: "26px 24px 48px", maxWidth: 880, margin: "0 auto" }}>
    <Link href={`/${locale}/requirements`} className="row gap6" style={{ fontSize: 13, color: "var(--slate)", textDecoration: "none" }}><span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><Icon.chevr size={15} /></span> {t.back}</Link>
    <div className="card pad" style={{ marginTop: 14, boxShadow: "var(--sh-1)" }}>
     <div className="row between" style={{ alignItems: "center" }}>
      <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>{assetLabel(req.asset, locale)} · {req.deal === "lease" ? t.lease : t.buy}</span>
      <span className="mono muted" style={{ fontSize: 11 }}>{req.ref}</span>
     </div>
     <h1 style={{ fontSize: 23, fontWeight: 700, margin: "12px 0 4px" }}>{(ar && req.titleAr) || req.title}</h1>
     <div className="muted" style={{ fontSize: 13.5 }}>{(ar && req.districtAr) || req.district}{req.city && req.district !== req.city ? (ar ? "، " : ", ") + cityLabel(req.city, locale) : ""}</div>
     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12, marginTop: 18 }}>
      {([
        [t.size, `${req.sizeMin} ${t.rangeTo} ${req.sizeMax} ${t.sqm}`],
        [t.budget, `${Number(req.budget).toLocaleString("en-US")} ${req.deal === "lease" ? t.sarSqmYr : t.sar}`],
        // An unstated timeline is a real answer, not missing data: the column is
        // nullable and the form deliberately pre-selects nothing. "n/a" would
        // read as a figure we failed to collect.
        [t.timeline, timelineLabel(req.timeline, ar) || t.timelineUnstated],
      ] as [string, string][]).map((s, i) => (
       <div key={i} className="card pad" style={{ boxShadow: "none", background: "var(--cool)" }}>
        <div className="muted" style={{ fontSize: 11 }}>{s[0]}</div>
        {/* bdi keeps "320 m2" from rendering as "m2 320" once the paragraph
            direction is RTL: the number and its unit are one LTR run. */}
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}><bdi>{s[1]}</bdi></div>
       </div>
      ))}
     </div>
     {req.mustHaves?.length ? <div className="row gap6 wrap" style={{ marginTop: 14 }}>{req.mustHaves.map((m, i) => <span key={i} className="chip on" style={{ fontSize: 11.5 }}>{mustHaveLabel(m, ar)}</span>)}</div> : null}
    </div>

    <div className="card pad" style={{ marginTop: 18, boxShadow: "var(--sh-1)" }}>
     <div className="row between" style={{ alignItems: "center", marginBottom: 4 }}>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{t.interestedH} {summary.total ? `· ${summary.total}` : ""}</div>
      <button className="btn primary sm" onClick={openPanel}><Icon.plus size={14} /> {t.haveSpace}</button>
     </div>
     <p className="muted" style={{ fontSize: 12.5, margin: "0 0 14px" }}>{t.interestedP}</p>

     {show && (
      <div className="card pad" style={{ boxShadow: "none", background: "var(--cool)", marginBottom: 14 }}>
       <p className="muted" style={{ fontSize: 12.5, margin: "0 0 10px" }}>{t.appearAs}</p>

       {matchesLoading ? (
        <p className="muted" style={{ fontSize: 12.5, margin: "0 0 12px" }}>{t.matchesLoading}…</p>
       ) : matches ? (
        <div style={{ marginBottom: 14 }}>
         <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t.matchesH}</div>
         <p className="muted" style={{ fontSize: 12.3, margin: "3px 0 10px", lineHeight: 1.6 }}>{t.matchesP}</p>
         {matches.matches.length === 0 ? (
          <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>{t.matchesNone}</p>
         ) : (
          <div className="col gap10">
           {matches.matches.map((m) => {
            const on = attached === m.listing_id;
            // Harbor when every stated dimension was met, amber otherwise.
            // Confirmed green stays reserved for evidence-backed verification,
            // and answering a requirement verifies nothing.
            const tone = m.verdict === "exact"
              ? { fg: "var(--status-info)", bg: "var(--status-info-wash)" }
              : { fg: "var(--status-attention)", bg: "var(--status-attention-wash)" };
            const mt = (ar ? m.name_ar : m.name_en) || m.listing_id;
            return (
             <div key={m.listing_id} style={{ background: "var(--paper)", border: `1px solid ${on ? "var(--border-brand)" : "var(--silver)"}`, borderRadius: 11, padding: 12 }}>
              <div className="row gap8 wrap" style={{ alignItems: "center" }}>
               <span style={{ fontSize: 13, fontWeight: 600, minWidth: 0 }}>{mt}</span>
               <span className="tag" style={{ fontSize: 10.5, color: tone.fg, background: tone.bg, borderColor: "transparent" }}>{ar ? m.verdict_ar : m.verdict_en}</span>
              </div>
              <details style={{ marginTop: 8 }}>
               <summary style={{ fontSize: 12, color: "var(--slate)", cursor: "pointer" }}>
                {t.matchesWhy} <bdi>({m.reasons.length})</bdi>
               </summary>
               <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "grid", gap: 7 }}>
                {m.reasons.map((r) => (
                 <li key={r.key} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.3, lineHeight: 1.6 }}>
                  {/* The state is carried by the label and the sentence as well
                      as by this mark, so nothing depends on colour alone. */}
                  <span aria-hidden="true" className="mono" style={{ flex: "none", width: 16, textAlign: "center", color: r.state === "failed" ? "var(--status-error)" : r.state === "met" ? "var(--slate)" : "var(--status-attention)" }}>{NOTE[r.state]}</span>
                  <span style={{ minWidth: 0 }}>
                   <span style={{ fontWeight: 600 }}>{ar ? r.label_ar : r.label_en}</span>
                   <span className="muted"> {ar ? r.reason_ar : r.reason_en}</span>
                   {(ar ? r.remedy_ar : r.remedy_en) ? (
                    <span style={{ display: "block", marginTop: 2, color: "var(--slate)" }}>{t.matchesRemedy}: {ar ? r.remedy_ar : r.remedy_en}</span>
                   ) : null}
                  </span>
                 </li>
                ))}
               </ul>
              </details>
              <label className="row gap8" style={{ alignItems: "center", marginTop: 10, fontSize: 12.5, cursor: "pointer" }}>
               <input
                type="radio"
                name="attach-listing"
                checked={on}
                onChange={() => setAttached(on ? null : m.listing_id)}
               />
               <span>{on ? t.matchesAttached : t.matchesAttach}</span>
              </label>
             </div>
            );
           })}
           {matches.truncated ? <p className="muted" style={{ fontSize: 12, margin: 0 }}>{t.matchesTruncated}</p> : null}
          </div>
         )}
         <p className="muted" style={{ fontSize: 11.8, margin: "10px 0 0", lineHeight: 1.6 }}>
          <bdi>{t.matchesMargins.replace("{size}", String(matches.tolerances.size_pct)).replace("{budget}", String(matches.tolerances.budget_pct))}</bdi>
          {matches.excluded_count > 0 ? <> <bdi>{matches.excluded_count}</bdi> {t.matchesExcluded}</> : null}
         </p>
        </div>
       ) : null}

       <textarea className="input" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={`${t.placeholder}…`} style={{ ...inp, minHeight: 64, resize: "vertical" }} />
       {err && (
        <p role="alert" style={{ color: "#B3261E", fontSize: 12.5, marginTop: 8 }}>
         {err}{needAuth ? <> <Link href={`/${locale}/login`} style={{ color: "var(--azure-d)", fontWeight: 600 }}>{t.signIn}</Link></> : null}
        </p>
       )}
       <div className="row gap10" style={{ marginTop: 10, justifyContent: "flex-end" }}>
        <button className="btn secondary sm" onClick={() => setShow(false)}>{t.cancel}</button>
        <button className="btn primary sm" onClick={register} disabled={busy}>{busy ? `${t.registering}…` : t.register}</button>
       </div>
      </div>
     )}

     {summary.total === 0 ? (
      <div className="card pad" style={{ boxShadow: "none", border: "1px dashed var(--silver)", textAlign: "center", color: "var(--slate)", fontSize: 13 }}>{t.none}</div>
     ) : !identitiesVisible ? (
      // OD-003: the public sees how much interest there is, never who.
      <div className="col gap10">
       <div className="card pad" style={{ boxShadow: "none", background: "var(--cool)" }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>
         <bdi>{summary.total}</bdi> {summary.total === 1 ? t.interestedOne : t.interestedCount}
        </div>
        <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
         <bdi>{summary.owners}</bdi> {t.ownersB} · <bdi>{summary.brokers}</bdi> {t.brokersB}
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.6 }}>{t.hiddenNote}</div>
       </div>
       {ints.filter((i) => i.mine).map((it) => (
        <div key={it.id} className="row gap12" style={{ background: "var(--paper)", border: "1px solid var(--silver)", borderRadius: 11, padding: 12, alignItems: "flex-start" }}>
         <span style={{ width: 34, height: 34, borderRadius: 8, flex: "none", background: "var(--azure-wash)", color: "var(--azure-d)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon.shield size={16} /></span>
         <div className="grow">
          <div className="row gap8" style={{ alignItems: "center" }}><span style={{ fontSize: 13.5, fontWeight: 600 }}>{t.yours}</span></div>
          {it.message && <div className="muted" style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.5 }}>{it.message}</div>}
         </div>
        </div>
       ))}
      </div>
     ) : (
      <div className="col gap10">
       {ints.map((it) => (
        <div key={it.id} className="row gap12" style={{ background: "var(--paper)", border: "1px solid var(--silver)", borderRadius: 11, padding: 12, alignItems: "flex-start" }}>
         <span style={{ width: 34, height: 34, borderRadius: 8, flex: "none", background: "var(--azure-wash)", color: "var(--azure-d)", display: "flex", alignItems: "center", justifyContent: "center" }}>{it.type === "broker" ? <Icon.user size={16} /> : <Icon.shield size={16} />}</span>
         <div className="grow">
          <div className="row gap8" style={{ alignItems: "center" }}><span style={{ fontSize: 13.5, fontWeight: 600 }}>{it.name || (it.type === "broker" ? t.aBroker : t.anOwner)}</span><span className="tag" style={{ fontSize: 10 }}>{it.type === "broker" ? t.broker : t.owner}</span></div>
          {it.message && <div className="muted" style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.5 }}>{it.message}</div>}
         </div>
         <span className="btn secondary sm">{t.reply}</span>
        </div>
       ))}
      </div>
     )}
    </div>
   </div>
  </div>
 );
}
const inp: React.CSSProperties = { border: "1px solid var(--silver)", borderRadius: 9, padding: "9px 12px", fontSize: 13.5, color: "var(--ink)", background: "var(--paper)", outline: "none", width: "100%" };
