"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/satkit";
import { getDictionary } from "@/i18n/getDictionary";
import { assetLabel, cityLabel } from "@/lib/labels";
import { timelineLabel, mustHaveLabel } from "@/lib/requirementIntake";
import { sizeRange, budgetCeiling } from "@/lib/requirementFigures";
import { textLangAttrs } from "@/lib/textScript";
import { stateLabel } from "@/lib/matching";
import { apiErrorMessage } from "@/lib/apiErrors";
import type { MatchReason, MatchVerdict } from "@/lib/matching";

// PKG-DEM1, finding 100's read side. The stored timeline and must-have tokens are
// named through the vocabulary the form renders from and the write path
// validates against, so this page cannot start naming them a second way.

// PKG-DEM2, finding 114. Nullable in the column, optional on the form, and
// declared here as though neither were true.
interface Req { id: string; ref: string; title: string; titleAr?: string | null; asset: string; deal: string; district: string; districtAr?: string | null; city: string; sizeMin: number | null; sizeMax: number | null; budget: number | null; timeline: string; mustHaves: string[]; createdAt: string; }
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
 /* ELITE-4 J4-5: a failed matches fetch used to end with the panel simply
    showing nothing, which reads as "you have no listings" rather than as a
    request that did not complete. */
 const [matchesErr, setMatchesErr] = useState(false);
 const [attached, setAttached] = useState<string | null>(null);
 const panelBtn = useRef<HTMLButtonElement | null>(null);

 /* RC9d, finding 187. The whole of this page is fetched by the browser after the
    route has painted, so line 110 below returns a loading div and then, when the
    request settles, the next render replaces the entire document body. Nothing
    said so. The instrument is a status message and not a focus move, for the
    reason written out at length in the board file beside this one: a reader is
    as likely to be part way through the loading page with the virtual cursor as
    to be waiting, DOM focus cannot tell those apart, and moving it would punish
    the attentive one.

    `announce` is set from three places rather than one, because this page has
    three settlements and they are different facts: the requirement arrived, the
    requirement does not exist, and a response was registered. The third is the
    one worth naming here, because it is not part of finding 187 and is recorded
    separately as finding 201. */
 const [announce, setAnnounce] = useState("");
 const load = (after?: string) => fetch(`/api/requirements/${params.id}`).then((r) => r.json()).then((j) => { setReq(j.requirement); setInts(j.interests || []); setSummary(j.summary || { total: 0, owners: 0, brokers: 0 }); setIdentitiesVisible(!!j.identitiesVisible); setLoading(false); setAnnounce(after ?? (j.requirement ? t.detailReady : t.notFound)); }).catch(() => setLoading(false));
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
  setMatchesErr(false);
  fetch(`/api/requirements/${params.id}/matches`)
   .then((r) => (r.ok ? r.json() : null))
   .then((j) => { if (j) setMatches(j as MatchPayload); setMatchesLoading(false); })
   /* ELITE-4 J4-5: a network failure is not a permission answer, so it is
      stated rather than left as an empty panel. */
   .catch(() => { setMatchesErr(true); setMatchesLoading(false); });
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
   /* Finding 203. Both lines rendered the route's own English sentence, and the
      bilingual sentence beside each was the branch that almost never ran. Three
      of the four refusals this endpoint makes are about who the responder is,
      which is exactly the case where a person needs to be told, in their own
      language, whether to sign in, to finish verification, or that this is not
      something their kind of account does at all. The route names each reason as
      a stable code now.

      The second condition also stopped testing the payload. A 200 carrying a
      reason is not a shape this endpoint produces, and testing for one meant a
      response that stated no reason at all was treated as a refusal. */
   if (res.status === 401) { setNeedAuth(true); setErr(apiErrorMessage(j.code, ar, t.errSignIn)); setBusy(false); return; }
   if (!res.ok) { setErr(apiErrorMessage(j.code, ar, t.errRegister)); setBusy(false); return; }
   setMsg(""); setShow(false); setBusy(false); setAttached(null);
   /* Finding 201. `setShow(false)` unmounts the panel, and the submit button
      inside it is the element that holds focus at this moment, so focus fell to
      document.body: the same defect as finding 199 in journey 1, in journey 4.
      The disclosure that opened the panel is where focus belongs when a
      disclosure closes, and it is still on screen. The `load()` that follows
      refreshes the list this response now appears in, and carries the sentence
      that says so, so the confirmation is announced by the request that makes it
      true rather than optimistically before it. */
   panelBtn.current?.focus();
   load(t.responseSaved);
  } catch {
   setErr(t.errRegister); setBusy(false);
  }
 }

 /* Every branch below opens with the same outer div and the same status region
    as its first child, in the same position, and that is the whole of what makes
    the region work. A live region announces changes inside an element the
    browser was already watching. The three states this page has were three early
    returns with three unrelated root elements, so a region placed in each of
    them would be torn down and rebuilt with its text already in place at exactly
    the moment it had something to say, and would say nothing. React reconciles
    by type and position, so an identical root and an identical first child are
    preserved across the swap while everything under them is replaced, which is
    the difference between a live region and a decorative attribute. */
 const statusRegion = <div className="sronly" role="status" aria-live="polite">{announce}</div>;

 if (loading || !req) return (
  <div style={{ background: "var(--cool)" }} aria-busy={loading}>
   {statusRegion}
   {loading ? (
    <div style={{ padding: 48, textAlign: "center" }} className="muted">{t.loading}…</div>
   ) : (
    <div style={{ padding: 48, textAlign: "center" }} className="muted">{t.notFound} <Link href={`/${locale}/requirements`} style={{ color: "var(--azure-d)" }}>{t.backLink} {ar ? "←" : "→"}</Link></div>
   )}
  </div>
 );

 const titleAttrs = textLangAttrs((ar && req.titleAr) || req.title);

 return (
  <div style={{ background: "var(--cool)" }} aria-busy={false}>
   {statusRegion}
   <div style={{ padding: "26px 24px 48px", maxWidth: 880, margin: "0 auto" }}>
    <Link href={`/${locale}/requirements`} className="row gap6" style={{ fontSize: "0.8125rem", color: "var(--slate)", textDecoration: "none" }}><span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><Icon.chevr size={15} /></span> {t.back}</Link>
    <div className="card pad" style={{ marginTop: 14, boxShadow: "var(--sh-1)" }}>
     <div className="row between" style={{ alignItems: "center" }}>
      <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>{assetLabel(req.asset, locale)} · {req.deal === "lease" ? t.lease : t.buy}</span>
      <span className="mono muted" style={{ fontSize: "0.6875rem" }}>{req.ref}</span>
     </div>
     {/* RC10, finding 171's class on journey 4. Same paragraph of reasoning as
         the board card: the title is prose the occupier typed, the fallback
         regularly puts it on a page of the other language, and the script is
         read from the text rather than assumed from the column it arrived in.
         The parity defect behind the fallback is finding 202. */}
     <h1 lang={titleAttrs.lang} dir={titleAttrs.dir} style={{ fontSize: "1.4375rem", fontWeight: 700, margin: "12px 0 4px" }}>{(ar && req.titleAr) || req.title}</h1>
     <div className="muted" style={{ fontSize: "0.84375rem" }}>{(ar && req.districtAr) || req.district}{req.city && req.district !== req.city ? (ar ? "، " : ", ") + cityLabel(req.city, locale) : ""}</div>
     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 120px), 1fr))", gap: 12, marginTop: 18 }}>
      {([
        // PKG-DEM2, finding 114. `${req.sizeMin}` printed the word `null` for a
        // size the occupier did not state, and `Number(null).toLocaleString()`
        // printed a budget of `0` for one they did not state either: a figure
        // nobody gave, on a card that reads as the occupier's own words. Both
        // figures are read through one module now, and an unstated one says so
        // in the reader's language rather than being filled in.
        [t.size, sizeRange(req.sizeMin, req.sizeMax, locale) || t.figureUnstated],
        [t.budget, budgetCeiling(req.budget, req.deal, locale) || t.figureUnstated],
        // An unstated timeline is a real answer, not missing data: the column is
        // nullable and the form deliberately pre-selects nothing. "n/a" would
        // read as a figure we failed to collect.
        [t.timeline, timelineLabel(req.timeline, ar) || t.timelineUnstated],
      ] as [string, string][]).map((s, i) => (
       <div key={i} className="card pad" style={{ boxShadow: "none", background: "var(--cool)" }}>
        <div className="muted" style={{ fontSize: "0.6875rem" }}>{s[0]}</div>
        {/* bdi keeps "320 m2" from rendering as "m2 320" once the paragraph
            direction is RTL: the number and its unit are one LTR run. */}
        <div style={{ fontSize: "0.875rem", fontWeight: 600, marginTop: 3 }}><bdi>{s[1]}</bdi></div>
       </div>
      ))}
     </div>
     {req.mustHaves?.length ? <div className="row gap6 wrap" style={{ marginTop: 14 }}>{req.mustHaves.map((m, i) => <span key={i} className="chip on" style={{ fontSize: "0.71875rem" }}>{mustHaveLabel(m, ar)}</span>)}</div> : null}
    </div>

    <div className="card pad" style={{ marginTop: 18, boxShadow: "var(--sh-1)" }}>
     <div className="row between" style={{ alignItems: "center", marginBottom: 4 }}>
      <div style={{ fontSize: "1rem", fontWeight: 700 }}>{t.interestedH} {summary.total ? `· ${summary.total}` : ""}</div>
      {/* ELITE-4 J4-4: this button is the disclosure for the panel below it. */}
      <button ref={panelBtn} className="btn primary sm" onClick={openPanel} aria-expanded={show} aria-controls="req-response-panel"><Icon.plus size={14} /> {t.haveSpace}</button>
     </div>
     <p className="muted" style={{ fontSize: "0.78125rem", margin: "0 0 14px" }}>{t.interestedP}</p>

     {show && (
      <div id="req-response-panel" className="card pad" style={{ boxShadow: "none", background: "var(--cool)", marginBottom: 14 }}>
       <p className="muted" style={{ fontSize: "0.78125rem", margin: "0 0 10px" }}>{t.appearAs}</p>

       {/* ELITE-4 J4-5: the matches arrive after the panel opens, so the region
           that holds them announces its own changes and reports that it is
           busy while the request is in flight. */}
       <div aria-live="polite" aria-busy={matchesLoading}>
       {matchesLoading ? (
        <p className="muted" style={{ fontSize: "0.78125rem", margin: "0 0 12px" }}>{t.matchesLoading}…</p>
       ) : matches ? (
        /* Finding 180. This was a <div> with a bold <div> caption over a set of
           radios, so the caption named nothing and the group was not a group. It is
           now a fieldset with the same caption as its legend, which needed no new
           string. The legend restates the styling the caption div carried, and
           `minInlineSize: 0` keeps the fieldset shrinkable, which the UA default
           otherwise prevents. */
        <fieldset style={{ border: 0, padding: 0, margin: "0 0 14px", minInlineSize: 0 }}>
         <legend style={{ fontSize: "0.84375rem", fontWeight: 700, padding: 0 }}>{t.matchesH}</legend>
         <p className="muted" style={{ fontSize: "0.76875rem", margin: "3px 0 10px", lineHeight: 1.6 }}>{t.matchesP}</p>
         {matches.matches.length === 0 ? (
          <p className="muted" style={{ fontSize: "0.78125rem", margin: 0 }}>{t.matchesNone}</p>
         ) : (
          <div className="col gap10">
           {matches.matches.map((m) => {
            const on = attached === m.listing_id;
            // Harbor when every stated dimension was met, amber otherwise.
            // Confirmed green stays reserved for evidence-backed verification,
            // and answering a requirement verifies nothing.
            const tone = m.verdict === "exact"
              ? { fg: "var(--status-info)", bg: "var(--status-info-wash)" }
              : { fg: "var(--status-attention-text)", bg: "var(--status-attention-wash)" };
            const mt = (ar ? m.name_ar : m.name_en) || m.listing_id;
            return (
             <div key={m.listing_id} style={{ background: "var(--paper)", border: `1px solid ${on ? "var(--border-brand)" : "var(--silver)"}`, borderRadius: 11, padding: 12 }}>
              <div className="row gap8 wrap" style={{ alignItems: "center" }}>
               <span style={{ fontSize: "0.8125rem", fontWeight: 600, minWidth: 0 }}>{mt}</span>
               <span className="tag" style={{ fontSize: "0.65625rem", color: tone.fg, background: tone.bg, borderColor: "transparent" }}>{ar ? m.verdict_ar : m.verdict_en}</span>
              </div>
              <details style={{ marginTop: 8 }}>
               <summary style={{ fontSize: "0.75rem", color: "var(--slate)", cursor: "pointer" }}>
                {t.matchesWhy} <bdi>({m.reasons.length})</bdi>
               </summary>
               <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "grid", gap: 7 }}>
                {m.reasons.map((r) => (
                 <li key={r.key} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: "0.76875rem", lineHeight: 1.6 }}>
                  {/* The mark is decoration. The state reaches a reader through
                      the visually hidden word below, not through this. */}
                  <span aria-hidden="true" className="mono" style={{ flex: "none", width: 16, textAlign: "center", color: r.state === "failed" ? "var(--status-error)" : r.state === "met" ? "var(--slate)" : "var(--status-attention-text)" }}>{NOTE[r.state]}</span>
                  <span style={{ minWidth: 0 }}>
                   {/* ELITE-4 J4-6: the state as a word. The mark above it is
                       aria-hidden and the colour is not exposed at all, so
                       without this the state reached nobody using a reader. */}
                   <span className="sronly">{stateLabel(r.state, ar)}. </span>
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
              {/* Finding 180. Every radio in this group read "Attach this listing to
                  your response", identically, so the four or five options were told
                  apart only by which card they were drawn inside, which is a visual
                  fact and not an announced one. The listing title is beside the radio
                  on screen and now also inside its name. */}
              <label className="row gap8" style={{ alignItems: "center", marginTop: 10, fontSize: "0.78125rem", cursor: "pointer" }}>
               <input
                type="radio"
                name="attach-listing"
                checked={on}
                onChange={() => setAttached(m.listing_id)}
               />
               <span>{on ? t.matchesAttached : t.matchesAttach}</span>
               <span className="sronly">{mt}</span>
              </label>
             </div>
            );
           })}
           {/* Finding 180. A radio group needs a way back out of it. Every option here
              attached something, so once a lister selected a listing the only way to
              send a response with nothing attached was to reload the panel. The old
              onChange read `setAttached(on ? null : m.listing_id)`, which looks like a
              toggle and is not one: a radio's change event does not fire on the option
              that is already selected, so the clearing branch was unreachable. The
              choice of attaching nothing is now an option like any other, which is
              also the one that starts selected. */}
           <label className="row gap8" style={{ alignItems: "center", fontSize: "0.78125rem", cursor: "pointer" }}>
            <input type="radio" name="attach-listing" checked={attached === null} onChange={() => setAttached(null)} />
            <span>{t.matchesAttachNone}</span>
           </label>
           {matches.truncated ? <p className="muted" style={{ fontSize: "0.75rem", margin: 0 }}>{t.matchesTruncated}</p> : null}
          </div>
         )}
         <p className="muted" style={{ fontSize: "0.7375rem", margin: "10px 0 0", lineHeight: 1.6 }}>
          <bdi>{t.matchesMargins.replace("{size}", String(matches.tolerances.size_pct)).replace("{budget}", String(matches.tolerances.budget_pct))}</bdi>
          {matches.excluded_count > 0 ? <> <bdi>{matches.excluded_count}</bdi> {t.matchesExcluded}</> : null}
         </p>
        </fieldset>
       ) : matchesErr ? (
        <p style={{ color: "var(--status-error)", fontSize: "0.78125rem", margin: "0 0 12px", lineHeight: 1.6 }}>{t.matchesErr}</p>
       ) : null}
       </div>

       {/* ELITE-4 J4-2: the only field in this flow, and it had no id, no label
           and no accessible name of any kind. */}
       <label htmlFor="req-interest-msg" style={{ display: "block", fontSize: "0.78125rem", fontWeight: 600, marginBottom: 6 }}>{t.msgLabel}</label>
       <textarea id="req-interest-msg" className="input" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={`${t.placeholder}…`} style={{ ...inp, minHeight: 64, resize: "vertical" }} />
       {err && (
        <p role="alert" style={{ color: "#B3261E", fontSize: "0.78125rem", marginTop: 8 }}>
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
      <div className="card pad" style={{ boxShadow: "none", border: "1px dashed var(--silver)", textAlign: "center", color: "var(--slate)", fontSize: "0.8125rem" }}>{t.none}</div>
     ) : !identitiesVisible ? (
      // OD-003: the public sees how much interest there is, never who.
      <div className="col gap10">
       <div className="card pad" style={{ boxShadow: "none", background: "var(--cool)" }}>
        <div style={{ fontSize: "0.9375rem", fontWeight: 700 }}>
         <bdi>{summary.total}</bdi> {summary.total === 1 ? t.interestedOne : t.interestedCount}
        </div>
        <div className="muted" style={{ fontSize: "0.78125rem", marginTop: 4 }}>
         <bdi>{summary.owners}</bdi> {t.ownersB} · <bdi>{summary.brokers}</bdi> {t.brokersB}
        </div>
        <div className="muted" style={{ fontSize: "0.75rem", marginTop: 10, lineHeight: 1.6 }}>{t.hiddenNote}</div>
       </div>
       {ints.filter((i) => i.mine).map((it) => (
        <div key={it.id} className="row gap12" style={{ background: "var(--paper)", border: "1px solid var(--silver)", borderRadius: 11, padding: 12, alignItems: "flex-start" }}>
         <span style={{ width: 34, height: 34, borderRadius: 8, flex: "none", background: "var(--azure-wash)", color: "var(--azure-d)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon.shield size={16} /></span>
         <div className="grow">
          <div className="row gap8" style={{ alignItems: "center" }}><span style={{ fontSize: "0.84375rem", fontWeight: 600 }}>{t.yours}</span></div>
          {it.message && <div className="muted" style={{ fontSize: "0.78125rem", marginTop: 4, lineHeight: 1.5 }}>{it.message}</div>}
         </div>
        </div>
       ))}
      </div>
     ) : (
      <div className="col gap10">
       {/* PKG-DEM2, finding 116. Every response used to carry a Reply control
           beside it. It was a `span` with no handler, no role and no keyboard
           path, and there was nothing for it to open: this route returns a
           respondent's name, organisation and message and deliberately returns
           no email and no phone, so the platform holds no channel from the
           occupier back to the person who answered. A control that cannot act
           is a promise the product does not keep, and the occupier who posted
           the requirement is the only person who ever saw it. It is gone, and
           what a real reply needs is recorded in the findings register rather
           than mocked up here. */}
       <p className="muted" style={{ fontSize: "0.75rem", margin: "0 0 2px", lineHeight: 1.6 }}>{t.replyNote}</p>
       {ints.map((it) => (
        <div key={it.id} className="row gap12" style={{ background: "var(--paper)", border: "1px solid var(--silver)", borderRadius: 11, padding: 12, alignItems: "flex-start" }}>
         <span style={{ width: 34, height: 34, borderRadius: 8, flex: "none", background: "var(--azure-wash)", color: "var(--azure-d)", display: "flex", alignItems: "center", justifyContent: "center" }}>{it.type === "broker" ? <Icon.user size={16} /> : <Icon.shield size={16} />}</span>
         <div className="grow">
          <div className="row gap8" style={{ alignItems: "center" }}><span style={{ fontSize: "0.84375rem", fontWeight: 600 }}>{it.name || (it.type === "broker" ? t.aBroker : t.anOwner)}</span><span className="tag" style={{ fontSize: "0.625rem" }}>{it.type === "broker" ? t.broker : t.owner}</span></div>
          {it.message && <div className="muted" style={{ fontSize: "0.78125rem", marginTop: 4, lineHeight: 1.5 }}>{it.message}</div>}
         </div>
        </div>
       ))}
      </div>
     )}
    </div>
   </div>
  </div>
 );
}
/* ELITE-4 J4-1: `outline: "none"` is gone. The visible focus ring is
   `.input:focus-visible` in the shared stylesheet, and an inline outline
   cannot be overridden from a stylesheet. */
const inp: React.CSSProperties = { border: "1px solid var(--silver)", borderRadius: 9, padding: "9px 12px", fontSize: "0.84375rem", color: "var(--ink)", background: "var(--paper)", width: "100%" };
