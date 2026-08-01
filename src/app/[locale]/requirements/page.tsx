"use client";
import { getDictionary } from "@/i18n/getDictionary";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/satkit";
import { assetLabel, cityLabel } from "@/lib/labels";
import { timelineLabel, mustHaveLabel } from "@/lib/requirementIntake";
import { sizeRange, budgetCeiling } from "@/lib/requirementFigures";
import { textLangAttrs } from "@/lib/textScript";

// PKG-DEM1, finding 100's read side. A requirement's timeline and must-haves are
// stored as tokens, and this board printed the tokens. `Q3` is readable enough in
// English to have gone unnoticed; `fitted` beside `مجهّز` on an Arabic card is
// not, and neither is the raw token an Arabic reader sees for a brief posted in
// English. Both fields go through the vocabulary that defines them, which is the
// same one the form renders from and the write path validates against.

// PKG-DEM2, finding 114. `sizeMin`, `sizeMax` and `budget` were typed as
// `number` and are nullable in the column, optional on the form and null on live
// rows. The type said the null could not arrive; the renderer below printed it
// when it did.
interface Req { sample?: boolean; id: string; ref: string; title: string; titleAr?: string | null; asset: string; deal: string; district: string; districtAr?: string | null; city: string; sizeMin: number | null; sizeMax: number | null; budget: number | null; timeline: string; mustHaves: string[]; interest: number; }

export default function RequirementsBoard({ params }: { params: { locale: string } }) {
 const locale = params.locale === "ar" ? "ar" : "en";
 const ar = locale === "ar";
 const dict = getDictionary(locale);
 // The asset type was named from a map declared here, which held seven types in
 // Arabic and none in English, so an English reader got the token title-cased and
 // read "Retail" where every other surface says "Retail & F&B", and an Arabic
 // reader of an education or hospitality brief got the English token. `assetLabel`
 // is where the platform names an asset type.
 const [reqs, setReqs] = useState<Req[]>([]);
 const [loading, setLoading] = useState(true);
 /* RC9d, finding 187. This board is fetched by the browser after the page has
    already painted, so the visitor is given a heading, a subtitle and a loading
    line, and then, some time later, the entire body of the page is replaced. A
    sighted reader sees that happen. Nobody else was told anything at all.

    The remedy the register proposed for this was a focus move to the heading
    once the board arrived, and that is wrong here, for the same kind of reason
    the aria-expanded proposal was wrong in finding 167. A screen reader user who
    lands on this URL does not sit still while the fetch runs: they start reading
    the heading and the subtitle with the virtual cursor, which moves through the
    document without moving DOM focus. `document.activeElement` is `document.body`
    for that reader and for a reader who has not touched anything, so no guard
    written around focus can tell the two apart, and calling focus() would drag
    the attentive one back to the top of a page they were already three
    paragraphs into. Moving focus is right when the user asked for the change.
    Nobody asked for this one; it is the page finishing loading.

    So the instrument is a status message, which is what SC 4.1.3 is for. The
    region below is present from first paint and empty, because a live region
    only announces what changes inside it after it exists, and a message that is
    already in the initial HTML announces nothing. It receives one sentence when
    the request settles, and the results container carries `aria-busy` until then
    so the incompleteness is stated rather than implied by silence.

    The catch is also repaired here. It set `loading` to false and nothing else,
    so a request that failed fell into the empty branch and told the visitor that
    no occupier in the country is looking for space. That is the same defect as
    ELITE-4 J4-5 on the matches panel, and the same answer: a failure says it
    failed, and offers the retry that an automatic one would have hidden. */
 const [failed, setFailed] = useState(false);
 const [status, setStatus] = useState("");
 const load = () => {
  setLoading(true);
  setFailed(false);
  fetch("/api/requirements")
   .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
   .then((j) => {
    const rows: Req[] = j.requirements || [];
    setReqs(rows);
    setLoading(false);
    setStatus(rows.length === 0 ? dict.req.empty : rows.length === 1 ? dict.req.boardReadyOne : dict.req.boardReady.replace("{n}", String(rows.length)));
   })
   .catch(() => { setFailed(true); setLoading(false); setStatus(dict.req.boardFailed); });
 };
 useEffect(() => { load(); }, []);

 return (
  <div style={{ background: "var(--cool)" }}>
   <div style={{ padding: "36px 24px 48px", maxWidth: 1080, margin: "0 auto" }}>
    <div className="row between wrap" style={{ alignItems: "flex-end", gap: 14 }}>
     <div>
      <div className="eyebrow">{dict.req.openReqs}</div>
      <h1 className="serif" style={{ fontSize: "2rem", fontWeight: 500, margin: "12px 0 6px" }}>{dict.req.h1}</h1>
      <p className="muted" style={{ fontSize: "0.9375rem", maxWidth: 580, lineHeight: 1.6 }}>{dict.req.sub}</p>
     </div>
     <Link href={`/${locale}/post-requirement`} className="btn primary"><Icon.plus size={15} /> {dict.req.postReq}</Link>
    </div>

    <div className="sronly" role="status" aria-live="polite">{status}</div>

    <div aria-busy={loading}>
    {loading ? (
     <div className="muted" style={{ marginTop: 40, fontSize: "0.875rem" }}>{dict.req.loading}</div>
    ) : failed ? (
     <div className="card pad" style={{ marginTop: 28, boxShadow: "none", background: "var(--paper)" }}>
      <p className="muted" style={{ fontSize: "0.875rem", lineHeight: 1.7, margin: 0 }}>{dict.req.boardFailed}</p>
      <div style={{ marginTop: 14 }}><button type="button" className="btn primary" onClick={load}>{dict.req.boardRetry}</button></div>
     </div>
    ) : reqs.length === 0 ? (
     /* An empty board rendered an empty grid: the header, the loading line gone,
        and then nothing, which reads as a page that failed rather than a market
        with no open demand yet. */
     <div className="card pad" style={{ marginTop: 28, boxShadow: "none", background: "var(--paper)" }}>
      <p className="muted" style={{ fontSize: "0.875rem", lineHeight: 1.7, margin: 0 }}>{dict.req.empty}</p>
      <div style={{ marginTop: 14 }}><Link href={`/${locale}/post-requirement`} className="btn primary"><Icon.plus size={15} /> {dict.req.postReq}</Link></div>
     </div>
    ) : (
     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%, 320px), 1fr))", gap: 16, marginTop: 28 }}>
      {reqs.map((r) => {
       // PKG-DEM2, finding 114. Both are optional on the form and nullable in
       // the column, so both may be absent, and an absent figure is stated by
       // not drawing its line rather than by drawing the line around nothing.
       const size = sizeRange(r.sizeMin, r.sizeMax, locale);
       const budget = budgetCeiling(r.budget, r.deal, locale);
       const titleAttrs = textLangAttrs((ar && r.titleAr) || r.title);
       return (
       <Link key={r.id} href={`/${locale}/requirements/${r.id}`} className="card pad lift" style={{ boxShadow: "var(--sh-1)", textDecoration: "none", color: "inherit", display: "block" }}>
        <div className="row between" style={{ alignItems: "center" }}>
         <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>{assetLabel(r.asset, locale)} · {r.deal === "lease" ? (dict.req.lease) : (dict.req.buy)}</span>
         <span className="row gap6" style={{ alignItems: "center" }}>
          {r.sample ? <span className="tag" style={{ color: "#92400E", background: "#FFFBEB", borderColor: "#FCD34D", fontSize: "0.65625rem" }}>{dict.req.sampleTag}</span> : null}
          <span className="mono muted" style={{ fontSize: "0.6875rem" }}>{r.ref}</span>
         </span>
        </div>
        {/* RC10, finding 171's class on journey 4. A brief's title is prose the
            occupier typed, and this fallback hands an Arabic reader the English
            title whenever no Arabic one was written, so the title on this card
            is regularly not in the language of the page it sits on. The script
            is read from the text and declared, so a screen reader stops
            pronouncing English with Arabic phonetics and the bidi algorithm
            stops resolving the run against the page direction. That the reader
            is shown the other language's title at all is a separate parity
            defect and is recorded as finding 202; this states the truth about
            whatever text the fallback produced. */}
        <div lang={titleAttrs.lang} dir={titleAttrs.dir} style={{ fontSize: "0.96875rem", fontWeight: 700, margin: "12px 0 8px", lineHeight: 1.3 }}>{(ar && r.titleAr) || r.title}</div>
        <div className="muted" style={{ fontSize: "0.78125rem", lineHeight: 1.7 }}>
         <div className="row gap6"><Icon.pin size={14} /> {(ar && r.districtAr) || r.district}{r.city && r.district !== r.city ? (ar ? "، " : ", ") + cityLabel(r.city, locale) : ""}</div>
         {size || budget ? (
          <div className="row gap6"><Icon.layers size={14} /> {size ? <bdi>{size}</bdi> : null}{size && budget ? " · " : ""}{budget ? <bdi>{budget}</bdi> : null}</div>
         ) : null}
         {/* A brief with no move-in date is a real answer, and the column is
             nullable, so the clock and its empty line are not drawn at all
             rather than drawn beside nothing. */}
         {timelineLabel(r.timeline, ar) ? <div className="row gap6"><Icon.clock size={14} /> {dict.req.timeline}: {timelineLabel(r.timeline, ar)}</div> : null}
        </div>
        {r.mustHaves?.length ? <div className="row gap6 wrap" style={{ marginTop: 10 }}>{r.mustHaves.slice(0, 4).map((m, i) => <span key={i} className="chip" style={{ fontSize: "0.6875rem" }}>{mustHaveLabel(m, ar)}</span>)}</div> : null}
        <div className="row between" style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--silver)", alignItems: "center" }}>
         <span style={{ fontSize: "0.78125rem", color: r.interest ? "var(--harbor)" : "var(--slate)" }}>{r.interest ? (ar ? `${r.interest} مهتم` : `${r.interest} interested`) : (dict.req.noInterest)}</span>
         <span style={{ fontSize: "0.78125rem", fontWeight: 600, color: "var(--azure-d)" }}>{dict.req.viewRespond}</span>
        </div>
       </Link>
       );
      })}
     </div>
    )}
    </div>
   </div>
  </div>
 );
}
