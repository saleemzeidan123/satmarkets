import { isLocale } from "@/i18n/config";
import { localeMeta } from "@/lib/meta";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon, Verified } from "@/components/satkit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getPublishedKpis } from "@/lib/market/published";
import JsonLd, { SITE } from "@/components/JsonLd";
import WatchBanner from "@/components/WatchBanner";
import ScrollRegion from "@/components/ScrollRegion";
import { getDictionary } from "@/i18n/getDictionary";
import { formatPeriod } from "@/lib/market/period";
import { assetLabel, segmentLabel } from "@/lib/labels";
import { formatInteger } from "@/lib/format";
// PKG-FIG2 closure, finding 132. The heading over a column of figures, and
// the unit beside a derived one, read off the records rather than typed above
// them.
import { appendUnit, figureCellOf, statUnitHeading, withUnit, type FigureCell } from "@/lib/market/columnHeading";
import EvidencePassport from "@/components/EvidencePassport";
import { type PublicEvidenceView, evidenceStateLabel, publicSourceText } from "@/lib/evidenceView";
import { type PublicQuoteKind, quoteStatement } from "@/lib/publicQuote";
import {
  rentIndexEvidenceByField,
  rentIndexRecordClassOf,
  type RentIndexCell,
} from "@/lib/rentIndexEvidence";
import { getSourceRightsOrNull } from "@/lib/queries/sourceRights";
import { REGA_RENT_INDEX_SOURCE_ID } from "@/lib/sources/catalogue";

const AZURE = "#3A6EA5";

/**
 * ADV-1E. The Source column, in one short phrase, from the same decision that
 * decided whether there is a figure beside it.
 *
 * Short by necessity: this is the sixth column of a table that is already
 * scrolling sideways at 320 pixels. The full sentence Codex item 3 requires is
 * printed once under the table rather than repeated down it, which keeps it
 * legible and keeps it attached to the figures it qualifies.
 *
 * The name itself comes from `publicSourceText`, the same function the Evidence
 * Passport's Source row reads, so this column and the panel a reader opens from
 * it cannot answer "who says so" differently. Writing the rule out again here,
 * which is what this did first, is how "SAT Markets own record" ends up on a
 * figure SAT never collected.
 */
function sourceCell(d: DRow, sampleWord: string, ar: boolean) {
  const avg = d.evidence.get("rent_index_average") ?? d.evidence.get("rent_index_band");
  if (d.quote === "authorized_public" && avg) {
    return <span className="statusdot ok">{publicSourceText(avg, ar)}</span>;
  }
  if (d.quote === "labelled_sample") return <span className="statusdot pend">{sampleWord}</span>;
  return <span className="statusdot pend">{evidenceStateLabel(d.quote === "withheld" ? "withheld_public_use" : "empty", ar)}</span>;
}

// ADV-1D. This was a five-tuple of display strings, which is why the evidence
// could not be attached: by the time the row reached the table there was nothing
// left of the record, only the text it had been turned into. It now carries the
// figures AND the passports built from the same row, so the evidence and the
// number beside it are two readings of one object rather than two lookups that
// can disagree.
type DRow = {
  location: string;
  asset: string;
  /**
   * ADV-1E, finding 90. Read off the passport, never off the record.
   *
   * These two were computed here from `r.median` and `r.sufficient` while the
   * evidence card below printed `avg.value` from the passport. Two readings of
   * one row, taken by two different rules, which is finding 90 on the server
   * render: the table could print 1,420 in the same card whose panel said the
   * figure may not be shown. There is now one reading. If the passport withholds
   * the figure, the table has no figure to print, because there is no other
   * place to get one from.
   */
  figure: string;
  band: string;
  sufficient: boolean;
  /** Whether the row says of itself that it is a simulated demonstration cell. */
  simulated: boolean;
  /** The one decision, for the row's headline figure. Drives what Source says. */
  quote: PublicQuoteKind;
  evidence: Map<string, PublicEvidenceView>;
  /**
   * PKG-FIG2 closure, finding 132. What this row's figure actually is: its
   * statistic and its unit, as stored, not as described in the header above it.
   *
   * It is carried on the row rather than recomputed at the table because the
   * narrow select does not fetch `unit`, and a heading built from a second read
   * could name a unit the row it sits over never had. One read, on the same
   * object the figure came from.
   */
  figureCell: FigureCell;
};

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 const loc = params.locale === "ar" ? "ar" : "en";
 const d = getDictionary(loc).rentIndex;
 return localeMeta(params.locale, "/rent-index", d.metaTitle, d.metaDesc);
}

export default async function RentIndexPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 if (!isLocale(params.locale)) notFound();
 const ar = params.locale === "ar";
 const ri = getDictionary(params.locale === "ar" ? "ar" : "en").rentIndex;
 // The one sentence shape that puts a quantity word and a unit together. Shared
 // with the front door and the listings index cut, so a heading cannot be
 // punctuated one way here and another way there.
 const C = getDictionary(params.locale === "ar" ? "ar" : "en").common;
 const pub = await getPublishedKpis(ar ? "ar" : "en");

 // This page used to carry its own asset table and its own segment table, a
 // fourth and a fifth copy of vocabulary that labels.ts already owns. That is
 // where "الفئة A" came from, with a Latin letter in an Arabic phrase, while the
 // listing pages spelled the same grade "فئة أ". The index now reads the same
 // tables every other public surface reads, so a row cannot name an asset or a
 // segment differently from the listings it sits beside.
 const loc: "en" | "ar" = ar ? "ar" : "en";

 // There is no mock table any more. The Rent Index shows what the pipeline
 // produced from a source file, or it shows nothing. A district with too few
 // registered transactions is a blank row, not a quieter guess.
 let districts: DRow[] = [];
 // ADV-1D. The rights row for the declared source, resolved once for the page.
 //
 // `getSourceRightsOrNull` and not `getSourceRights`. The latter returns
 // `deniedRights(id)` when nothing was read, and that object is not null and
 // does carry the id that was asked for, so a passport handed it would report
 // "the permission recorded for this source does not cover this audience" when
 // in truth no permission was recorded and none was read. Codex correction 5
 // requires those two to stay apart, so the null is passed through.
 const rights = await getSourceRightsOrNull(REGA_RENT_INDEX_SOURCE_ID);
 try {
  const supabase = await getSupabaseServer();
  if (supabase) {
   // The passport needs five columns this page never read: the district id and
   // the period for the subject and the reporting period, the unit so the
   // number means something, and the two record-class markers.
   //
   // Two selects rather than one, because PostgREST fails the WHOLE query on an
   // unknown column, and `data_class` and `is_demo` are selected nowhere else in
   // `src`, so this is the first surface that would find out the hard way. The
   // narrow select is the pre-ADV-1D list exactly. If it is the one that runs,
   // both markers arrive undefined, `rentIndexRecordClassOf` answers `unknown`,
   // and an unknown row takes the sourced branch, which withholds. A schema that
   // is not what we expect must cost us a figure, never buy us a claim.
   const WIDE = "district_id, district_label, district_label_ar, asset_type, segment, unit, period, median, band_low, band_high, sufficient, stat_kind, sort_order, data_class, is_demo";
   const NARROW = "district_label, district_label_ar, asset_type, segment, median, band_low, band_high, sufficient, stat_kind, sort_order";
   const q = (cols: string) => supabase
    .from("rent_index_published")
    .select(cols)
    .order("sort_order", { ascending: true })
    .limit(40);
   const wide = await q(WIDE);
   let data = wide.data;
   if (wide.error || !data) ({ data } = await q(NARROW));
   districts = ((data ?? []) as any[]).map((r: any): DRow => {
    const asset = `${assetLabel(r.asset_type, loc)}${r.segment && r.segment !== "all" ? " \u00b7 " + segmentLabel(r.segment, loc) : ""}`;
    const location = ar ? (r.district_label_ar || r.district_label) : r.district_label;
    const cell: RentIndexCell = r;
    // The geography the passport states is the one the reader is looking at,
    // in the reader's language, so the Arabic page cannot report an English
    // place name in the single field a reader is most likely to check.
    const evidence = rentIndexEvidenceByField(cell, { locale: loc, geography: location }, rights);
    const avg = evidence.get("rent_index_average");
    const bandView = evidence.get("rent_index_band");
    const sufficient = !!r.sufficient;
    return {
     location,
     asset,
     // `avg.value` is already null wherever the decision withheld, so the
     // fallback here is reached by an absent figure and a withheld one alike,
     // and prints the same "not available" for both. Which of the two it was is
     // in the panel below, stated rather than encoded in the blank.
     figure: avg?.value ?? ri.na,
     // `ri.thinSample` only where thinness is actually the reason. A band the
     // licence withheld is not a thin sample, and saying so would blame the
     // data for a decision about our rights.
     band: bandView?.value ?? (sufficient ? ri.na : ri.thinSample),
     sufficient,
     simulated: rentIndexRecordClassOf(cell) === "flagged_simulated",
     quote: avg?.quote ?? bandView?.quote ?? "unavailable",
     evidence,
     // Fails closed by construction: the narrow select carries no `unit`, so a
     // fallback query costs the heading its unit rather than letting it assume
     // one.
     figureCell: figureCellOf(r),
    };
   });
  }
 } catch {
  districts = [];
 }

 // The machine-readable claim, gated. `isBasedOn` names the REGA Rental Index
 // (Ejar) as the basis of this dataset, and a crawler reads that as a statement
 // about the numbers on the page. Every row today is a flagged simulated cell,
 // so emitting it would have the human surface stamping every row "Sample" while
 // the structured data told a machine the figures came from REGA. That asymmetry
 // is the same defect as ADV-1C.1 correction 1, one layer down: a claim standing
 // on a marker that says the opposite. It is emitted only when there are rows and
 // not one of them is flagged simulated.
 //
 // ADV-1E widens the predicate from "not flagged simulated" to "every row is
 // authorized public evidence". The old test caught the case we had, a synthetic
 // corpus, and missed the one we are about to have: a real REGA row whose
 // display rights are still unread is not simulated, so it passed, and the
 // structured data would have told a crawler the dataset is based on the REGA
 // Rental Index while the page beside it withheld every figure for want of
 // permission to say exactly that. Codex item 2 puts metadata and structured
 // data inside the fence, so the fence is the same decision the figures use.
 const basedOnPermitted = districts.length > 0 && districts.every((d) => d.quote === "authorized_public");

 // The distinct statements the table needs, in table order, deduplicated. An
 // `authorized_public` row contributes nothing, because a figure we are
 // permitted to publish needs no qualification and adding one would teach a
 // reader to ignore the sentence when it matters.
 const quoteNotes = Array.from(
  new Set(districts.map((d) => quoteStatement(d.quote, ar)).filter((t): t is string => t !== null))
 );

 // Only what the index can actually evidence. Where a figure has no cell behind
 // it, we show the same "not available" the table shows. The old row led with
 // "3,630 KAFD prime", which is JLL's published figure, and an occupancy
 // percentage taken from broker research that we have no licence to republish.
 //
 // The two rent tiles used to carry their unit inside the label string, once per
 // language, which is how "SAR/m\u00b2\u00b7yr" came to be spelled here and in the unit
 // table separately. The period tile printed the raw "2026-06" from the database
 // while the eyebrow eight lines below printed the same period formatted.
 // PKG-FIG2 closure, finding 132. `formatUnit("sar_sqm_year", ...)` used to
 // stand here: the page naming the unit of a figure it had not looked at. The
 // unit now comes from `pub`, which resolved it from the same quoted cells the
 // two rent figures were averaged over, and is null the moment those cells stop
 // agreeing. Two tiles then read "Office rent, average across cells" with no
 // unit, which is the honest reading of a set that has none.
 const cells = districts.map((d) => d.figureCell);
 const kpis: [string, string, string, string | null][] = [
  [pub.officeRent != null ? formatInteger(pub.officeRent, loc) : ri.na,
   appendUnit(ri.kpiOffice, pub.unit, loc, C.statUnit), ri.kpiContracts, null],
  [pub.retailRent != null ? formatInteger(pub.retailRent, loc) : ri.na,
   appendUnit(ri.kpiRetail, pub.unit, loc, C.statUnit), ri.kpiContracts, null],
  [formatInteger(pub.cells, loc), ri.kpiCells, ri.kpiCellsSub, null],
  [formatInteger(pub.districts, loc), ri.kpiDistricts, pub.period ? formatPeriod(pub.period, ar) : ri.na, null],
 ];

 return (
  <div style={{ background: "var(--cool)" }}>
   <JsonLd data={{ "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: ri.crumbHome, item: `${SITE}/${params.locale}` },
    { "@type": "ListItem", position: 2, name: ri.eyebrow, item: `${SITE}/${params.locale}/rent-index` },
   ] }} />
   <JsonLd data={{
    "@type": "Dataset",
    name: ri.dsName,
    url: `${SITE}/${params.locale}/rent-index`,
    inLanguage: ["ar", "en"],
    description: ri.dsDesc,
    creator: { "@type": "Organization", name: getDictionary(loc).appMeta.appName, url: SITE },
    ...(basedOnPermitted ? { isBasedOn: [ri.dsBasedOn] } : {}),
    spatialCoverage: ri.dsCoverage,
   }} />
   <div style={{ maxWidth: 1360, margin: "0 auto" }}>
    {/* header band */}
    <div className="row between wrap" style={{ padding: "26px 24px 20px", alignItems: "flex-end", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 16 }}>
     <div>
      <div className="eyebrow">{ri.eyebrow}{pub.period ? " \u00b7 " + formatPeriod(pub.period, ar) : ""}</div>
      <h1 style={{ fontSize: "1.875rem", fontWeight: 700, letterSpacing: "-.02em", margin: "10px 0 0" }}>{ri.h1}</h1>
      <div className="muted" style={{ fontSize: "0.84375rem", marginTop: 6 }}>{ri.intro}</div>
      {/* ADV-1E. The four tiles below the header are averages taken across
          cells, so the sentence that governs those cells belongs beside the
          tiles and not only beside the table further down. */}
      {pub.statements.map((s) => (
       <div key={s} className="muted" style={{ fontSize: "0.78125rem", lineHeight: 1.7, marginTop: 4 }}>{s}</div>
      ))}
     </div>
     <div className="row gap10 wrap">
      <span className="seg"><span className="on">{ri.all}</span><span>{ri.open}</span><span>{ri.capped}</span></span>
      <span className="chip">{ri.office} <Icon.chevd size={14} /></span>
      <Link href={`/${params.locale}/market`} className="chip" style={{ textDecoration: "none", color: "var(--azure-d)" }}>{ri.marketPulse}</Link>
      <span className="btn secondary"><Icon.download size={15} /> {ri.export}</span>
      <span className="btn primary"><Icon.spark size={15} /> {ri.askAi}</span>
     </div>
    </div>

    {/* device-local index watches */}
    <div style={{ padding: "18px 24px 0" }}>
     <WatchBanner locale={params.locale as "en" | "ar"} />
    </div>

    {/* bifurcation banner */}
    <div style={{ padding: "22px 24px 0" }}>
     <div className="bifur">
      <div className="side">
       <div className="h"><span className="freeze capped"><span className="dot" />{ri.capped}</span> {ri.cappedExisting}</div>
       <div className="sub">{ri.cappedBody}</div>
       <div className="big" style={{ color: "var(--amber-d)" }}>≈ 0.0% <span style={{ fontSize: "0.8125rem", color: "var(--slate)" }}>{ri.cappedMovement}</span></div>
      </div>
      <div className="side">
       <div className="h"><span className="freeze open"><span className="dot" />{ri.open}</span> {ri.openNew}</div>
       <div className="sub">{ri.openBody}</div>
      </div>
     </div>
    </div>

    {/* KPI row */}
    <div className="row gap16 wrap" style={{ padding: "20px 24px 0" }}>
     {kpis.map((k, i) => (
      <div key={i} className="statpill grow" style={{ minWidth: 150 }}>
       <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="v tnum">{k[0]}</div>
        {k[3] && <span className={"delta " + k[3]}>▲</span>}
       </div>
       <div className="l">{k[1]}</div>
       <div className={"delta " + (k[3] || "")} style={{ marginTop: 8, color: k[3] ? undefined : "var(--slate)" }}>{k[2]}</div>
      </div>
     ))}
    </div>

    <div style={{ padding: "12px 24px 0" }}>
     <span className="muted" style={{ fontSize: "0.78125rem" }}>{ri.benchNote}</span>
    </div>

    {/* main grid */}
    <div className="rent-grid">
     {/* A card here read "Published bands, Q1 2026 (attributed)" and listed KAFD
         3,400 to 3,800 (verified), Al Olaya 2,200 to 3,200 (verified), Tahlia Street
         2,500 to 4,000 (verified). Every one of those numbers was a string in a
         dictionary file. They sat directly above a line admitting that "named sources
         are attached at launch, when the figures are real", so the page called the
         same figures verified and fake in adjacent paragraphs. The table below is the
         index: computed from source, or blank. */}
     {/* The trend chart plotted a hardcoded twelve-quarter series
         ([40,44,42,50,56,54,62,68,70,76,80,86]) as if it were a rent trend, on the one
         page whose entire premise is that every figure is cited to its source. There is
         no time series behind it, and it rendered blank besides. It is gone until we
         have real history. */}
     <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
      <div style={{ fontSize: "0.9375rem", fontWeight: 700 }}>{ri.trendT}</div>
      <p className="muted" style={{ fontSize: "0.78125rem", lineHeight: 1.7, marginTop: 6, marginBottom: 0, maxWidth: 560 }}>{ri.trendB}</p>
     </div>

     {/* heat map */}
     <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
      <div style={{ fontSize: "0.9375rem", fontWeight: 700 }}>{ri.heatT}</div>
      {/* The unit was spelled in this sentence, in both dictionaries, over cells
          whose unit nothing here read. It is now the unit the cells agree on, or
          absent. The thin-sample clause is a second string so the first can end
          where the unit does. */}
      <div className="muted" style={{ fontSize: "0.78125rem" }}>{withUnit(ri.heatSubReal, cells, loc, C.statUnit) + ". " + ri.heatSubRealThin}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 94px), 1fr))", gap: 8, marginTop: 16 }}>
       {(() => {
        const vals = districts.map((d) => Number(String(d.figure).replace(/[^0-9.]/g, "")) || 0);
        const pos = vals.filter((v) => v > 0);
        const mx = Math.max(...pos, 1);
        const mn = Math.min(...pos, mx);
        return districts.map((d, i) => {
         const v = vals[i];
         const t = v > 0 ? (v - mn) / (mx - mn || 1) : 0;
         const a = v > 0 ? 0.14 + t * 0.64 : 0;
         const light = t > 0.55;
         return (
          <div key={i} title={String(d.location) + " · " + String(d.asset)} style={{ borderRadius: 8, padding: "9px 10px 11px", border: "1px solid var(--silver)", background: v > 0 ? "rgba(58,110,165," + a.toFixed(2) + ")" : "var(--cool)", minHeight: 60 }}>
           <div style={{ fontSize: "0.6875rem", fontWeight: 600, lineHeight: 1.25, color: light ? "var(--on-brand)" : "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.location}</div>
           <div className="mono" style={{ fontSize: "0.8125rem", fontWeight: 700, marginTop: 6, color: light ? "var(--on-brand)" : "var(--azure-d)" }}>{v > 0 ? d.figure : "–"}</div>
          </div>
         );
        });
       })()}
      </div>
      <div className="row between" style={{ marginTop: 14 }}>
       <span className="mono muted" style={{ fontSize: "0.625rem" }}>{ri.heatLow}</span>
       <div style={{ flex: 1, height: 7, margin: "0 10px", borderRadius: 4, background: "linear-gradient(90deg,var(--azure-wash),var(--azure))" }} />
       <span className="mono muted" style={{ fontSize: "0.625rem" }}>{ri.heatHigh}</span>
      </div>
     </div>

     {/* district table */}
     <div className="card" style={{ gridColumn: "1 / -1", overflow: "hidden", boxShadow: "var(--sh-1)" }}>
      <div className="row between" style={{ padding: "16px 20px", borderBottom: "1px solid var(--silver)" }}>
       <div style={{ fontSize: "0.9375rem", fontWeight: 700 }}>{ri.tableTitle}</div>
       <span className="chip" style={{ borderColor: "var(--silver)" }}>{ri.sortYoY} <Icon.chevd size={14} /></span>
      </div>
      <ScrollRegion label={ri.tableTitle}>
       <table className="dt" style={{ minWidth: 640 }}>
        <caption className="sronly">{ri.tableTitle}</caption>
        <thead><tr><th scope="col">{ri.thLocation}</th><th scope="col">{ri.thAsset}</th><th scope="col" style={{ textAlign: "right" }}>{statUnitHeading(cells, loc, { neutral: ri.thStat, pattern: C.statUnit })}</th><th scope="col" style={{ textAlign: "right" }}>{withUnit(ri.thBand, cells, loc, C.statUnit)}</th><th scope="col" style={{ textAlign: "right" }}>{ri.thData}</th><th scope="col" style={{ textAlign: "right" }}>{ri.thSource}</th></tr></thead>
        <tbody>
         {districts.map((d, i) => (
          <tr key={i}>
           <td style={{ fontWeight: 600 }}>{d.location}</td>
           <td className="muted">{d.asset}</td>
           <td className="num mono" style={{ fontWeight: 500 }}><bdi dir="ltr">{d.figure}</bdi></td>
           {/* A low-high figure range is a single numeric atom: force LTR so it always
               reads low-to-high left-to-right, even under RTL (Codex area 4). Without
               this the two numbers reorder to high-on-left, misreading the range. The
               thin-sample text stays in the ambient direction. */}
           <td className="num mono muted">{d.sufficient ? <bdi dir="ltr">{d.band}</bdi> : d.band}</td>
           <td className="num">{d.sufficient ? <span className="statusdot ok">{ri.sufficient}</span> : <span className="statusdot pend">{ri.thin}</span>}</td>
           {/* ADV-1E. This cell was the literal word "Sample" on every row
               regardless of what the row was, which was right by accident while
               every row happened to be synthetic and would have gone on saying
               it over a real REGA figure. It now says what the decision decided,
               and the sentence behind the short label is under the table. */}
           <td className="num">{sourceCell(d, ri.sample, ar)}</td>
          </tr>
         ))}
        </tbody>
       </table>
      </ScrollRegion>
      {/* ADV-1E, Codex item 3. The explicit meaning, in the reader's language,
          inside the same card as the figures it qualifies and immediately below
          them. One line per kind actually present, so a table of real cleared
          figures carries no sample sentence and a table of sample rows cannot
          be read without one. The wording is the canonical constant, not a
          restatement of it: a second copy would be the copy that drifts. */}
      {quoteNotes.length > 0 && (
       <div style={{ padding: "12px 20px 0" }}>
        {quoteNotes.map((t) => (
         <p key={t} className="muted" style={{ fontSize: "0.78125rem", lineHeight: 1.7, margin: "0 0 6px" }}>{t}</p>
        ))}
       </div>
      )}
      <div className="row gap10" style={{ padding: "14px 20px", borderTop: "1px solid var(--silver)", background: "var(--cool)" }}>
       <span style={{ color: "var(--harbor)" }}><Icon.check size={15} /></span>
       <span className="muted" style={{ fontSize: "0.78125rem" }}>{ri.tableNote}</span>
      </div>
     </div>

     {/* ADV-1D. The Evidence Passports for the figures in the table above.

         BELOW the table and not a seventh column in it. The table sits inside
         `overflow-x: auto` at `min-width: 640`, so at 320 and 360 pixels it is
         already scrolling horizontally. An expanded `<details>` inside a cell
         would push that scroll width out by the width of the longest evidence
         row and make the whole table scroll further sideways to read a figure,
         which fails Codex's own gate: mobile disclosure overflow-free. Out here
         each block is a normal flow element that wraps.

         One block per published cell, each carrying both passports for that
         cell, because the average and the band are two figures with two
         different licence questions behind them and one shared row of record. */}
     <div className="card" style={{ gridColumn: "1 / -1", boxShadow: "var(--sh-1)" }} id="evidence">
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--silver)" }}>
       <div style={{ fontSize: "0.9375rem", fontWeight: 700 }}>{ri.eviTitle}</div>
       <p className="muted" style={{ fontSize: "0.78125rem", lineHeight: 1.7, margin: "6px 0 0", maxWidth: 680 }}>{ri.eviBody}</p>
      </div>
      <div style={{ padding: "16px 20px" }}>
       {districts.length === 0 ? (
        <p className="muted" style={{ fontSize: "0.78125rem", margin: 0 }}>{ri.eviNone}</p>
       ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: 14 }}>
         {districts.map((d, i) => {
          const avg = d.evidence.get("rent_index_average");
          const band = d.evidence.get("rent_index_band");
          return (
           <div key={i} className="card pad" style={{ boxShadow: "none", padding: 16, minWidth: 0 }}>
            <div style={{ fontSize: "0.8125rem", fontWeight: 700 }}>{d.location}</div>
            <div className="muted" style={{ fontSize: "0.71875rem", marginTop: 2 }}>{d.asset}</div>
            {avg ? (
             <div style={{ marginTop: 12 }}>
              <div className="muted" style={{ fontSize: "0.71875rem" }}>{ri.eviAverage}</div>
              {/* The passport's own value, not the row's. `d.figure` is read
                  straight off the record and is printed whenever `sufficient`
                  is true; `avg.value` is null whenever the passport withheld
                  the figure, and sufficiency is only one of the reasons it
                  does. If the NARROW select runs, both record-class markers
                  arrive undefined, the row takes the sourced branch and the
                  licence withholds, and printing `d.figure` here would put a
                  number directly above a panel saying the number cannot be
                  shown. One object decides both, so they cannot disagree. */}
              <div className="mono" style={{ fontSize: "0.9375rem", fontWeight: 500, marginTop: 4 }}><bdi dir="ltr">{avg.value ?? ri.na}</bdi></div>
              <EvidencePassport view={avg} label={ri.eviAverage} ar={ar} locale={loc} />
             </div>
            ) : null}
            {band ? (
             <div style={{ marginTop: 12 }}>
              <div className="muted" style={{ fontSize: "0.71875rem" }}>{ri.eviBand}</div>
              {/* Same rule for the band, and `ri.na` rather than the table's
                  `ri.thinSample`, because a withheld band is not always a thin
                  sample: it can equally be a licence that does not cover
                  derived display. The panel below states which. */}
              <div className="mono" style={{ fontSize: "0.9375rem", fontWeight: 500, marginTop: 4 }}><bdi dir="ltr">{band.value ?? ri.na}</bdi></div>
              <EvidencePassport view={band} label={ri.eviBand} ar={ar} locale={loc} />
             </div>
            ) : null}
           </div>
          );
         })}
        </div>
       )}
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
