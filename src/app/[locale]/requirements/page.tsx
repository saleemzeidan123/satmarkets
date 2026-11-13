"use client";
import { getDictionary } from "@/i18n/getDictionary";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Icon } from "@/components/satkit";
import TypeGlyph from "@/components/TypeGlyph";
import JsonLd, { SITE } from "@/components/JsonLd";
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

export default function RequirementsBoard(props: { params: Promise<{ locale: string }> }) {
 const params = use(props.params);
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
  <div className="rq">
   <div className="rq-wrap">
    <JsonLd data={{ "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: dict.req.crumbHome, item: `${SITE}/${locale}` },
      { "@type": "ListItem", position: 2, name: dict.req.crumbReq, item: `${SITE}/${locale}/requirements` },
    ] }} />
    {/* PKG-DESIGN-7. The board is drawn like the search results it mirrors: a
        heading, one line of count, then a ruled list read row by row. The old
        cards boxed every brief and put a chip on every word, so the one thing a
        lister scans for (size, budget, move-in) had the same weight as the tags
        around it. The figures now sit in their own columns under labels. */}
    <header className="rq-top">
     <div>
      <div className="eyebrow">{dict.req.openReqs}</div>
      <h1 className="serif rq-h1">{dict.req.h1}</h1>
      <p className="rq-sub">{dict.req.sub}</p>
     </div>
     <Link href={`/${locale}/post-requirement`} className="btn primary"><Icon.plus size={15} /> {dict.req.postReq}</Link>
    </header>

    <div className="sronly" role="status" aria-live="polite">{status}</div>

    <div aria-busy={loading}>
    {loading ? (
     <div className="ds-note rq-state">{dict.req.loading}</div>
    ) : failed ? (
     <div className="ds-note rq-state">
      <p>{dict.req.boardFailed}</p>
      <div style={{ marginTop: 12 }}><button type="button" className="btn primary" onClick={load}>{dict.req.boardRetry}</button></div>
     </div>
    ) : reqs.length === 0 ? (
     /* An empty board rendered an empty grid: the header, the loading line gone,
        and then nothing, which reads as a page that failed rather than a market
        with no open demand yet. */
     (<div className="ds-note rq-state">
      <p>{dict.req.empty}</p>
      <div style={{ marginTop: 12 }}><Link href={`/${locale}/post-requirement`} className="btn primary"><Icon.plus size={15} /> {dict.req.postReq}</Link></div>
     </div>)
    ) : (
     <>
     <div className="rq-count">{reqs.length === 1 ? dict.req.boardCountOne : dict.req.boardCount.replace("{n}", String(reqs.length))}</div>
     <ol className="rq-list">
      {reqs.map((r) => {
       // PKG-DEM2, finding 114. Both are optional on the form and nullable in
       // the column, so both may be absent, and an absent figure is stated by
       // not drawing its line rather than by drawing the line around nothing.
       const size = sizeRange(r.sizeMin, r.sizeMax, locale);
       const budget = budgetCeiling(r.budget, r.deal, locale);
       const when = timelineLabel(r.timeline, ar);
       const titleAttrs = textLangAttrs((ar && r.titleAr) || r.title);
       return (
       <li key={r.id}>
       <Link href={`/${locale}/requirements/${r.id}`} className="rq-row">
        <span className="rq-pic"><TypeGlyph type={r.asset} size={40} /></span>
        <span className="rq-main">
         <span className="rq-kind">{assetLabel(r.asset, locale)} · {r.deal === "lease" ? (dict.req.lease) : (dict.req.buy)}</span>
         {/* RC10, finding 171's class on journey 4. A brief's title is prose the
             occupier typed, and the fallback can hand an Arabic reader the
             English title, so the script is read from the text and declared.
             Finding 202 records the parity defect itself. */}
         <span className="rq-title" lang={titleAttrs.lang} dir={titleAttrs.dir}>{(ar && r.titleAr) || r.title}</span>
         <span className="rq-place"><Icon.pin size={13} /> {(ar && r.districtAr) || r.district}{r.city && r.district !== r.city ? (ar ? "، " : ", ") + cityLabel(r.city, locale) : ""}</span>
         {r.mustHaves?.length ? <span className="rq-needs">{r.mustHaves.slice(0, 4).map((m) => mustHaveLabel(m, ar)).join(" · ")}</span> : null}
        </span>
        <span className="rq-figs">
         {/* A brief with no move-in date is a real answer, and the column is
             nullable, so an absent figure is not drawn rather than drawn beside
             nothing. */}
         {size ? <span className="rq-fig"><span className="rq-k">{dict.req.colSize}</span><bdi className="rq-v">{size}</bdi></span> : null}
         {budget ? <span className="rq-fig"><span className="rq-k">{dict.req.colBudget}</span><bdi className="rq-v">{budget}</bdi></span> : null}
         {when ? <span className="rq-fig"><span className="rq-k">{dict.req.timeline}</span><span className="rq-v">{when}</span></span> : null}
        </span>
        <span className="rq-end">
         <span className={r.interest ? "rq-int on" : "rq-int"}>{r.interest ? (r.interest === 1 ? dict.req.interestedOne : dict.req.interestedN.replace("{n}", String(r.interest))) : (dict.req.noInterest)}</span>
         <span className="rq-go">{dict.req.viewRespond}</span>
         <span className="rq-ref"><bdi>{r.ref}</bdi>{r.sample ? <> · {dict.req.sampleTag}</> : null}</span>
        </span>
       </Link>
       </li>
       );
      })}
     </ol>
     </>
    )}
    </div>
   </div>
  </div>
 );
}
