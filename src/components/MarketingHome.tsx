"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/satkit";
// PKG-CARD1. `ListingCard` is the one place a listing becomes a card; this file
// only decides which listing goes in the lead slot and which go in the row
// beside it. PKG-DESIGN-2 keeps that: the redesign of the card itself belongs
// to the search-results package, so the home page cannot drift from it.
import ListingCard, { type IndexPosition } from "@/components/ListingCard";
import type { Listing } from "@/lib/types";
import { getDictionary } from "@/i18n/getDictionary";
import { formatPeriod } from "@/lib/market/period";
// Slice B, item 8. The one shared, RTL-safe pattern the rest of the platform
// uses for a section that has nothing to show, so the featured inventory and
// the Rent Index panel fail the same honest way Listings Search does.
import DataState from "@/components/DataState";
// Slice B, item 6. The one component that renders a real link to `/lister/[id]`.
import ListerBadge from "@/components/ListerBadge";
import type { Lister } from "@/lib/queries/listings";
// PKG-FIG2 closure, finding 132. Type only, so nothing server-side is pulled
// into the client bundle.
import type { PublishedKpis } from "@/lib/market/published";
import { fill, formatInteger, formatRange, formatUnit } from "@/lib/format";
import { assetLabel } from "@/lib/labels";
import { leadMeasureLabel } from "@/lib/leadMeasure";

// PKG-DESIGN-2. The home page, rebuilt to the design the owner approved on
// 2026-11-13. It answers docs/design-audit-2026-11-12.md finding by finding:
// no photograph hero, no pill eyebrow, no frosted search panel, no persona
// cards, no numbered cards on content that is not a sequence, no feature grid
// with planned tiles, one call to action instead of two back to back, and no
// scroll reveal. What it keeps is every piece of real data the old page had:
// the search and its place suggestions, the featured listings through
// `ListingCard`, and the published Rent Index band with its statistic, period,
// source and notes. All prose now lives in the `home` dictionary; the 136
// strings this file used to carry inline are gone.
//
// Two things the approved drawings show are deliberately NOT here, and both
// for the same reason. The drawings label three example listings with rents
// and label the hero building with rents per floor. On a canvas those are
// examples. On the site they would be figures nobody recorded, which Law 3 and
// owner ruling 4 (claims ledger C15) both forbid. So the cards below are the
// real featured rows, and the hero drawing carries no figure at all.

export type FeaturedListing = { listing: Listing; indexPosition: IndexPosition | null };
// PKG-FIG2 closure, finding 130. `stat` is the statistic the row itself records,
// already resolved into the reader's language by the server. It is not optional
// and it has no default, so a caller cannot obtain a band without saying what
// the figure is.
export type HeroBand = { en: string; ar: string; low: number; high: number; median: number; period: string; stat: string };
type Stats = { listings: string | null; buildings: string | null; districts: string | null; verifiedPct: string | null };

// The fifteen asset types, in the order the search offers them, each with the
// key of the field the directory names beside it. The key is looked up in
// `ASSET_FIELDS`, the registry the listing form and the listing page are both
// built from, so the directory can only name a measure a listing of that type
// actually records. The table of keys lives in src/lib/leadMeasure.ts, because
// search results print the same measure with its recorded value, and
// MarketingHome.homeRuling.test.ts fails if a key there stops existing in the
// registry.
const ASSET_TYPES = ["office", "retail", "warehouse", "medical", "land", "showroom", "serviced", "mixed_use", "hospitality", "education", "gas_station", "entertainment", "wedding_hall", "worker_housing", "self_storage"] as const;

// The hero drawing: the top seven floors of a building as a stack, three of
// them lit. It is the product's signature form and it is decoration here, so
// it is hidden from assistive technology and it carries no number. A stack
// that states areas and rents belongs to a listing that recorded them.
function Stack({ rtl }: { rtl: boolean }) {
 const tw = 96, fh = 12, gap = 2, x0 = 10, top = 6;
 const lit: Record<number, number> = { 1: 53.3, 3: 51.7, 4: 100 };
 const rows = [];
 for (let i = 0; i < 7; i++) {
  const y = top + i * (fh + gap);
  const pct = lit[i];
  if (pct === undefined) {
   rows.push(i === 0
    ? <path key={i} d={`M${x0} ${y + fh}V${y + 7}a7 7 0 0 1 7 -7H${x0 + tw - 7}a7 7 0 0 1 7 7V${y + fh}Z`} fill="rgba(255,255,255,.3)" />
    : <rect key={i} x={x0} y={y} width={tw} height={fh} rx="2" fill="rgba(255,255,255,.3)" />);
   continue;
  }
  const lw = tw * pct / 100;
  const lx = rtl ? x0 + tw - lw : x0;
  if (pct < 100) rows.push(<rect key={`r${i}`} x={rtl ? x0 : x0 + lw + gap} y={y} width={tw - lw - gap} height={fh} rx="2" fill="rgba(255,255,255,.3)" />);
  rows.push(<rect key={i} x={lx} y={y} width={lw} height={fh} rx="2" fill="#FFFFFF" />);
 }
 const gy = top + 7 * (fh + gap) + 1.5;
 return (
  <svg className="hm-stack" aria-hidden="true" viewBox={`0 0 116 ${top + 7 * (fh + gap) + 6}`}>
   {rows}
   {/* The lower floors are not drawn: a broken line, not a ground line. */}
   <line x1={x0} y1={gy} x2={x0 + tw} y2={gy} stroke="rgba(255,255,255,.75)" strokeWidth="2" strokeDasharray="5 5" />
  </svg>
 );
}

// ADV-1E. `bandNotes` carries the sentences the server's quote decision attached
// to the figures in `bands`. It is a prop rather than a lookup because this
// component is a client component and the decision is a server one.
//
// `stats` and `jobs` stay in the props type because `page.tsx` still supplies
// them. Only `stats.districts` is read: the four-figure strip and the job
// counts they fed are gone with the sections that showed them.
export default function MarketingHome({ locale = "en", featured = [], stats, bands = [], bandNotes = [], kpis, dataOk = true, leadLister = null }: { locale?: string; featured?: FeaturedListing[]; stats: Stats; bands?: HeroBand[]; bandNotes?: readonly string[]; jobs?: { reqs: number | null; segs: number | null }; kpis: PublishedKpis; /** False only when the server could not reach the database at all, never when it reached it and found nothing. Distinguishes an honest "temporarily unavailable" from an honest "nothing published yet". */ dataOk?: boolean; /** The lead featured listing's public lister, when one loaded. Home's one lister-discovery entry point (item 6): a real link to `/lister/[id]`, never a fabricated directory. */ leadLister?: Lister | null }) {
 const router = useRouter();
 const ar = locale === "ar";
 const loc = ar ? "ar" : "en";
 // PKG-FIG1, finding 125. A bare `toLocaleString()` resolves the DEVICE locale
 // in a client component, which printed the published band in Arabic-Indic
 // digits on a phone set to Arabic. Both languages use Western numerals.
 const fig = (n: number) => formatInteger(Math.round(n), loc);
 const H = getDictionary(loc).home;
 const C = getDictionary(loc).common;
 const UI = getDictionary(loc).ui;
 // PKG-FIG2, finding 129. The unit is spelled in one table and nowhere else.
 const unitShort = formatUnit("sar_sqm_year", loc, "short");

 const [door, setDoor] = useState<"find" | "list">("find");
 const [deal, setDeal] = useState<"lease" | "buy">("lease");
 const [assetType, setAssetType] = useState("");
 const [q, setQ] = useState("");
 const [smin, setSmin] = useState("");
 const [smax, setSmax] = useState("");
 const [sug, setSug] = useState<{ label: string; sub: string; did?: string; indexed?: boolean }[]>([]);
 const [sopen, setSopen] = useState(false);
 const sref = useRef<HTMLDivElement>(null);
 const [bi, setBi] = useState(0);
 const band = bands[bi] || bands[0] || null;

 useEffect(() => {
  const onDoc = (e: MouseEvent) => { if (sref.current && !sref.current.contains(e.target as Node)) setSopen(false); };
  document.addEventListener("mousedown", onDoc);
  return () => document.removeEventListener("mousedown", onDoc);
 }, []);
 useEffect(() => {
  const term = q.trim();
  if (term.length < 2) { setSug([]); return; }
  const ctl = new AbortController();
  const t = setTimeout(() => {
   fetch(`/api/places?q=${encodeURIComponent(term)}&v=1&lang=${locale}`, { signal: ctl.signal })
    .then((r) => r.json())
    .then((d) => { setSug((d.items || []).slice(0, 6)); setSopen(true); })
    .catch(() => {});
  }, 220);
  return () => { clearTimeout(t); ctl.abort(); };
 }, [q, locale]);

 const dealParam = deal === "buy" ? "sale" : "lease";
 // `smin` and `smax` are the size parameters /listings already reads. A value
 // that is not a positive whole number is dropped rather than sent, so a
 // stray character narrows nothing instead of producing an empty result.
 const whole = (v: string) => { const n = Number(v.replace(/[,\s]/g, "")); return Number.isInteger(n) && n > 0 ? String(n) : ""; };
 const go = (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  const sp = new URLSearchParams();
  sp.set("deal", dealParam);
  if (assetType) sp.set("asset", assetType);
  if (q.trim()) sp.set("q", q.trim());
  if (whole(smin)) sp.set("smin", whole(smin));
  if (whole(smax)) sp.set("smax", whole(smax));
  router.push(`/${locale}/listings?${sp.toString()}`);
 };
 const L = (p: string) => `/${locale}${p}`;
 const measure = (t: string) => leadMeasureLabel(t, ar);

 const f0 = featured[0];
 const rest = featured.slice(1);
 // Where the recorded statistic sits inside the published band, as a share of
 // its width. Clamped, because a statistic is not obliged to sit inside the
 // band a different column records.
 const bandPos = band && band.high > band.low ? Math.min(1, Math.max(0, (band.median - band.low) / (band.high - band.low))) : null;

 return (
  <div className="hm">
   <section className="hm-hero">
    <div className="hm-wrap">
     <div className="hm-hero-grid">
      <h1 className="serif hm-h1">{H.h1a}<br />{H.h1b}</h1>
      <p className="hm-sub">{H.sub}</p>
      <div className="hm-stackbox"><Stack rtl={ar} /></div>
     </div>

     <div className="hm-doors" id="doors">
      {/* Findings 182, 197 and 198. Find or list is one choice of two, so it
          is a pair of native radios bound by a name, not two toggle buttons
          and not a rebuilt radiogroup. The radio itself is .sronly; the label
          draws the face and the focus ring. */}
      <fieldset className="hm-seg">
       <legend className="sronly">{H.doorsLabel}</legend>
       <label className={door === "find" ? "on" : undefined}><input type="radio" name="hm-door" className="sronly" checked={door === "find"} onChange={() => setDoor("find")} /><span>{H.doorFind}</span></label>
       <label className={door === "list" ? "on" : undefined}><input type="radio" name="hm-door" className="sronly" checked={door === "list"} onChange={() => setDoor("list")} /><span>{H.doorList}</span></label>
      </fieldset>
      {door === "find" ? (
       <form className="hm-form" onSubmit={go}>
        <div className="hm-where" ref={sref}>
         <input className="hm-field" value={q} onChange={(e) => setQ(e.target.value)} aria-label={H.whereLabel} placeholder={H.whereLabel} autoComplete="off" />
         {sopen && sug.length > 0 && (
          <div className="hm-sug">
           {sug.map((o, i) => (
            <button key={i} type="button" onClick={() => { setSopen(false); if (o.did) { const sp = new URLSearchParams(); sp.set("deal", dealParam); sp.set("district", o.did); router.push(`/${locale}/listings?${sp.toString()}`); } else { setQ(o.label); } }}>
             <span className="hm-sug-pin"><Icon.pin size={15} /></span>
             <span className="hm-sug-name">{o.label}</span>
             {/* ADV-1, and D24 in the direction that is easier to miss. This chip
                 says a place is in our index, which is all that is true of it,
                 in a colour that claims nothing. */}
             {o.indexed ? <span className="hm-sug-chip">{H.indexedShort}</span> : null}
             {o.sub ? <span className="hm-sug-sub">{o.sub}</span> : null}
            </button>
           ))}
          </div>
         )}
        </div>
        <select className="hm-field" aria-label={H.typeLabel} value={assetType} onChange={(e) => setAssetType(e.target.value)}>
         <option value="">{H.allTypes}</option>
         {ASSET_TYPES.map((t) => <option key={t} value={t}>{assetLabel(t, loc)}</option>)}
        </select>
        <select className="hm-field" aria-label={H.dealLabel} value={deal} onChange={(e) => setDeal(e.target.value === "buy" ? "buy" : "lease")}>
         <option value="lease">{H.dealLease}</option>
         <option value="buy">{H.dealBuy}</option>
        </select>
        <div className="hm-area">
         <input className="hm-field" inputMode="numeric" value={smin} onChange={(e) => setSmin(e.target.value)} aria-label={H.areaFromLabel} placeholder={H.areaFrom} />
         {/* A dimension line between the two ends of the range, with the unit
             on it. Drawn, not typed, and hidden from a screen reader because
             both fields already say square metres in their own names. */}
         <span className="hm-dim" aria-hidden="true">
          <span>{formatUnit("sqm", loc, "short")}</span>
          <svg width="52" height="10" viewBox="0 0 52 10"><path d="M0 5H52M4 8L8 2M44 8L48 2" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
         </span>
         <input className="hm-field" inputMode="numeric" value={smax} onChange={(e) => setSmax(e.target.value)} aria-label={H.areaToLabel} placeholder={H.areaTo} />
        </div>
        <button type="submit" className="hm-btn">{H.searchBtn}</button>
        <div className="hm-form-foot">
         <Link href={L("/map")} className="btn-line hm-btn-line">{H.mapLink}</Link>
         <Link href={L("/post-requirement")} className="touch-target hm-textlink">{H.postReqPrompt}</Link>
        </div>
       </form>
      ) : (
       <div className="hm-list">
        <p>{H.listBody}</p>
        {/* Home prototype-link ruling. /list is the real, public intake. It
            says plainly that signing in comes first, which an authenticated
            route presented as a public feature cannot. */}
        <Link href={L("/list")} className="hm-btn">{H.listBtn}</Link>
       </div>
      )}
     </div>
    </div>
   </section>

   {/* PKG-DISCOVERY-1 slice B, item 8. The heading and the browse path are
       unconditional, and the one part that depends on data resolves to one of
       three honest states: the cards, or a `DataState` that names which of the
       two failures actually happened. */}
   <section className="hm-sec">
    <div className="hm-wrap">
     <div className="hm-head">
      <h2 className="serif hm-h2">{H.featuredH}</h2>
      <div className="hm-head-links">
       <Link href={L("/listings")} className="touch-target hm-arrowlink">{H.browseAll} <Icon.arrow size={16} /></Link>
       <Link href={L("/listers")} className="touch-target hm-arrowlink">{H.listersLink} <Icon.arrow size={16} /></Link>
      </div>
     </div>
     {f0 ? (
      <>
       <div className="hm-lead">
        <ListingCard listing={f0.listing} locale={loc} ui={UI} variant="lead" indexPosition={f0.indexPosition} />
        {leadLister && <ListerBadge lister={leadLister} ar={ar} locale={locale} />}
       </div>
       <div className="snap-row hm-row">
        {rest.map((f) => (
         <ListingCard key={f.listing.id} listing={f.listing} locale={loc} ui={UI} variant="grid" indexPosition={f.indexPosition} />
        ))}
       </div>
      </>
     ) : (
      <div className="hm-lead">
       <DataState
        kind={dataOk ? "empty" : "error"}
        title={dataOk ? H.featuredEmptyTitle : H.featuredErrorTitle}
        body={dataOk ? H.featuredEmptyBody : H.featuredErrorBody}
        action={
         <div className="row gap10 wrap" style={{ justifyContent: "center" }}>
          <Link href={L("/listings")} className="btn" style={{ textDecoration: "none" }}>{H.browseAll}</Link>
          {!dataOk && (
           <button type="button" className="btn ghost" onClick={() => router.refresh()}>{H.retryLabel}</button>
          )}
         </div>
        }
       />
      </div>
     )}
    </div>
   </section>

   {/* The directory. Every asset type the platform lists, each with the first
       thing a listing of that type is measured by, read from the field
       registry. It replaces the row of icon tiles: a name and a measure say
       more than a pictogram did, and each row is a real filtered search. */}
   <section className="hm-types">
    <div className="hm-wrap">
     <h2 className="serif hm-h2">{H.typesH}</h2>
     <p className="hm-types-sub">{H.typesSub}</p>
     <div className="hm-types-grid">
      {ASSET_TYPES.map((t) => (
       <Link key={t} href={L(`/listings?deal=lease&asset=${t}`)} className="hm-type">
        <span className="hm-type-name">{assetLabel(t, loc)}</span>
        <span className="hm-type-measure">{measure(t)}</span>
        <span className="hm-type-arrow"><Icon.arrow size={16} /></span>
       </Link>
      ))}
      <Link href={L("/listings")} className="hm-type hm-type-all">
       <span className="hm-type-name">{H.allListings}</span>
       <span className="hm-type-arrow"><Icon.arrow size={16} /></span>
      </Link>
     </div>
    </div>
   </section>

   <section className="hm-sec">
    <div className="hm-wrap hm-band">
     <div className="hm-band-copy">
      <h2 className="serif hm-h2">{H.bandH}</h2>
      <p className="hm-p">{stats.districts ? fill(H.bandP, { n: stats.districts }) : H.bandPPlain}</p>
      {bands.length > 1 && (
       <fieldset className="hm-chips">
        <legend className="sronly">{H.bandPick}</legend>
        {bands.map((b, i) => (
         <label key={b.en} className={i === bi ? "on" : undefined}><input type="radio" name="hm-band" className="sronly" checked={i === bi} onChange={() => setBi(i)} /><span>{ar ? b.ar : b.en}</span></label>
        ))}
       </fieldset>
      )}
      <Link href={L("/rent-index")} className="btn-line hm-btn-line">{H.bandBtn}</Link>
     </div>
     {!band && (
      <DataState
       kind={dataOk ? "empty" : "error"}
       title={dataOk ? H.bandEmptyTitle : H.bandErrorTitle}
       body={dataOk ? H.bandEmptyBody : H.bandErrorBody}
      />
     )}
     {band && (
      <div className="hm-card">
       <div className="hm-card-head">
        <div>
         <div className="hm-card-title">{(ar ? band.ar : band.en) + H.gradeAOfficeSuffix}</div>
         <div className="hm-card-unit">{unitShort}</div>
        </div>
        <span className="hm-period">{formatPeriod(band.period, ar)}</span>
       </div>
       <div className="hm-figure">
        <span className="hm-figure-n tnum">{fig(band.median)}</span>
        {/* PKG-FIG2 closure, findings 129 and 130. The statistic comes from
            the row's own `stat_kind` and the unit from `formatUnit`. Neither
            is a frozen word in a dictionary. */}
        <span className="hm-figure-stat">{fill(C.statUnit, { stat: band.stat, unit: unitShort })}</span>
       </div>
       {/* The published band as a dimension line, with the recorded statistic
           marked on it. Both ends and the mark are the row's own figures. A
           year-on-year change is not drawn: that needs two periods of the same
           series and there is one. */}
       {bandPos !== null && (
        <div className="hm-range" aria-hidden="true">
         <div className="hm-range-track"><span style={{ insetInlineStart: `${bandPos * 100}%` }} /></div>
         <div className="hm-range-ends tnum"><span>{fig(band.low)}</span><span>{fig(band.high)}</span></div>
        </div>
       )}
       {/* PKG-FIG1, finding 127. `formatRange` is the one place that knows
           Arabic takes إلى between two figures and that the pair has to be
           isolated so an RTL line cannot reorder it. */}
       <div className="hm-card-line">{fill(H.bandRange, { range: formatRange(band.low, band.high, loc, 0) })}</div>
       <div className="hm-card-foot">
        <span>{kpis.source || H.sourceWord}</span>
        <span className="tnum">{kpis.cells > 0 ? fill(H.cellsWord, { n: String(kpis.cells) }) : ""}</span>
       </div>
       {bandNotes.map((n) => (
        <div key={n} className="hm-card-note">{n}</div>
       ))}
      </div>
     )}
    </div>
   </section>

   {/* PKG-DISCOVERY-1 slice B, item 7. This copy names what a check actually
       is and stops short of restating the rules, because /verification is the
       one place that engine-generated list is rendered and this section must
       never restate it in its own, driftable words. */}
   <section className="hm-sec">
    <div className="hm-wrap hm-verify">
     <h2 className="serif hm-h2">{H.verifyHeading}</h2>
     <p className="hm-p">{H.verifyBody}</p>
     <Link href={L("/verification")} className="btn-line hm-btn-line">{H.verifyLinkLabel} <Icon.arrow size={16} /></Link>
    </div>
   </section>

   {/* One closing statement, where the old page had a blue panel followed at
       once by a dark one carrying the same two buttons (audit finding 14). It
       has no buttons of its own: the footer that follows it on every page
       already offers "List your space" and "Browse listings", and repeating
       them here would rebuild the defect one section lower. */}
   <section className="hm-close">
    <div className="hm-wrap">
     <h2 className="serif hm-h2">{H.closeH}</h2>
     <p className="hm-close-body">{H.closeBody}</p>
     <p className="hm-close-note">{H.closeNote}</p>
    </div>
   </section>
  </div>
 );
}
