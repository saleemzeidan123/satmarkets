import { isLocale } from "@/i18n/config";
import { pageMeta } from "@/lib/meta";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon, Verified } from "@/components/satkit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getPublishedKpis } from "@/lib/market/published";
import JsonLd, { SITE } from "@/components/JsonLd";
import WatchBanner from "@/components/WatchBanner";
import { getDictionary } from "@/i18n/getDictionary";
import { formatPeriod } from "@/lib/market/period";

const AZURE = "#3A6EA5";

type DRow = [string, string, string, string, boolean];

export function generateMetadata({ params }: { params: { locale: string } }) {
  return pageMeta(params.locale, '/rent-index', 'Rent Index | SAT Markets', 'مؤشر الإيجارات | سات ماركتس', 'Saudi commercial rent figures by district and asset type, derived from the REGA Rental Index (Ejar). Averages of registered contracts, with honest blanks where the sample is too thin. Indicative, not advice.', 'أرقام إيجار العقار التجاري في السعودية حسب الحي ونوع الأصل، مستمدّة من المؤشر الإيجاري (إيجار). متوسطات العقود المسجّلة، مع ترك الخلايا فارغة بصدق حين تقلّ العيّنة. استرشادي وليس نصيحة.');
}

export default async function RentIndexPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const ar = params.locale === "ar";
 const ri = getDictionary(params.locale === "ar" ? "ar" : "en").rentIndex;
 const pub = await getPublishedKpis();

 const SEG: Record<string, string> = ar
  ? { grade_a: "الفئة A", grade_b: "الفئة B", grade_c: "الفئة C", serviced: "مخدومة", street: "شارع تجزئة", prime: "مميّز", clinic: "عيادات", street_front: "واجهة شارع", mall_inline: "داخل مول", modern: "حديثة", older: "أقدم", blended: "مجمّع" }
  : { grade_a: "Grade A", grade_b: "Grade B", grade_c: "Grade C", serviced: "Serviced", street: "street", prime: "prime", clinic: "Clinic", street_front: "Street front", mall_inline: "Mall inline", modern: "Modern", older: "Older", blended: "Blended" };
 const ASSET: Record<string, string> = ar
  ? { office: "مكاتب", retail: "تجزئة", warehouse: "مستودعات", serviced: "مفروشة", medical: "طبي", showroom: "معارض", land: "أراضٍ" }
  : { office: "Office", retail: "Retail", warehouse: "Warehouse", serviced: "Serviced", medical: "Medical", showroom: "Showroom", land: "Land" };
 const nf = (n: number) => n.toLocaleString("en-US");

 // There is no mock table any more. The Rent Index shows what the pipeline
 // produced from a source file, or it shows nothing. A district with too few
 // registered transactions is a blank row, not a quieter guess.
 let districts: DRow[] = [];
 try {
  const supabase = getSupabaseServer();
  if (supabase) {
   const { data } = await supabase
    .from("rent_index_published")
    .select("district_label, district_label_ar, asset_type, segment, median, band_low, band_high, sufficient, stat_kind, sort_order")
    .order("sort_order", { ascending: true })
    .limit(40);
   districts = (data ?? []).map((r: any): DRow => {
    const asset = `${ASSET[r.asset_type] || r.asset_type}${r.segment && r.segment !== "all" ? " \u00b7 " + (SEG[r.segment] || r.segment) : ""}`;
    const figure = r.sufficient && r.median != null ? nf(Number(r.median)) : (ri.na);
    const band = r.sufficient && r.band_low != null && r.band_high != null ? `${nf(Number(r.band_low))}\u2013${nf(Number(r.band_high))}` : (ri.thinSample);
    return [ar ? (r.district_label_ar || r.district_label) : r.district_label, asset, figure, band, !!r.sufficient];
   });
  }
 } catch {
  districts = [];
 }

 // Only what the index can actually evidence. Where a figure has no cell behind
 // it, we show a dash. The old row led with "3,630 KAFD prime", which is JLL's
 // published figure, and an occupancy percentage taken from broker research that
 // we have no licence to republish.
 const dash = "\u2014";
 const kpis: [string, string, string, string | null][] = [
  [pub.officeRent != null ? nf(pub.officeRent) : dash,
   ar ? "\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0645\u0643\u0627\u062a\u0628 \u0631\u064a\u0627\u0644/\u0645\u00b2\u00b7\u0633\u0646\u0629" : "Office, SAR/m\u00b2\u00b7yr",
   ar ? "\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0639\u0642\u0648\u062f \u0627\u0644\u0645\u0633\u062c\u0651\u0644\u0629" : "average of registered contracts", null],
  [pub.retailRent != null ? nf(pub.retailRent) : dash,
   ar ? "\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u062a\u062c\u0632\u0626\u0629 \u0631\u064a\u0627\u0644/\u0645\u00b2\u00b7\u0633\u0646\u0629" : "Retail, SAR/m\u00b2\u00b7yr",
   ar ? "\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0639\u0642\u0648\u062f \u0627\u0644\u0645\u0633\u062c\u0651\u0644\u0629" : "average of registered contracts", null],
  [String(pub.cells),
   ar ? "\u062e\u0644\u0627\u064a\u0627 \u0645\u0646\u0634\u0648\u0631\u0629" : "Published cells",
   ar ? "\u0627\u062c\u062a\u0627\u0632\u062a \u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0639\u064a\u0646\u0629" : "cleared the sample rule", null],
  [String(pub.districts),
   ar ? "\u0623\u062d\u064a\u0627\u0621 \u0645\u063a\u0637\u0651\u0627\u0629" : "Districts covered",
   pub.period ?? dash, null],
 ];

 return (
  <div style={{ background: "var(--cool)" }}>
   <JsonLd data={{
    "@type": "Dataset",
    name: "Saudi Commercial Rent Index",
    url: `${SITE}/${params.locale}/rent-index`,
    inLanguage: ["ar", "en"],
    description: "Commercial rent figures derived from the REGA Rental Index (Ejar): averages of registered rental contracts, by district and asset type. Cells that do not clear a minimum transaction count are shown blank rather than estimated. Indicative market context, not advice.",
    creator: { "@type": "Organization", name: "SAT Markets", url: SITE },
    isBasedOn: ["REGA Rental Index (Ejar), registered rental contracts"],
    spatialCoverage: "Riyadh, Saudi Arabia",
   }} />
   <div style={{ maxWidth: 1360, margin: "0 auto" }}>
    {/* header band */}
    <div className="row between wrap" style={{ padding: "26px 24px 20px", alignItems: "flex-end", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 16 }}>
     <div>
      <div className="eyebrow">{ri.eyebrow}{pub.period ? " \u00b7 " + formatPeriod(pub.period, ar) : ""}</div>
      <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.02em", margin: "10px 0 0" }}>{ri.h1}</h1>
      <div className="muted" style={{ fontSize: 13.5, marginTop: 6 }}>{ri.intro}</div>
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
       <div className="big" style={{ color: "var(--amber)" }}>≈ 0.0% <span style={{ fontSize: 13, color: "var(--slate)" }}>{ri.cappedMovement}</span></div>
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
     <span className="muted" style={{ fontSize: 12.5 }}>{ri.benchNote}</span>
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
      <div style={{ fontSize: 15, fontWeight: 700 }}>{ri.trendT}</div>
      <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.7, marginTop: 6, marginBottom: 0, maxWidth: 560 }}>{ri.trendB}</p>
     </div>

     {/* heat map */}
     <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{ri.heatT}</div>
      <div className="muted" style={{ fontSize: 12.5 }}>{ri.heatSubReal}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(94px, 1fr))", gap: 8, marginTop: 16 }}>
       {(() => {
        const vals = districts.map((d) => Number(String(d[2]).replace(/[^0-9.]/g, "")) || 0);
        const pos = vals.filter((v) => v > 0);
        const mx = Math.max(...pos, 1);
        const mn = Math.min(...pos, mx);
        return districts.map((d, i) => {
         const v = vals[i];
         const t = v > 0 ? (v - mn) / (mx - mn || 1) : 0;
         const a = v > 0 ? 0.14 + t * 0.64 : 0;
         const light = t > 0.55;
         return (
          <div key={i} title={String(d[0]) + " · " + String(d[1])} style={{ borderRadius: 8, padding: "9px 10px 11px", border: "1px solid var(--silver)", background: v > 0 ? "rgba(58,110,165," + a.toFixed(2) + ")" : "var(--cool)", minHeight: 60 }}>
           <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.25, color: light ? "var(--on-brand)" : "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d[0]}</div>
           <div className="mono" style={{ fontSize: 13, fontWeight: 700, marginTop: 6, color: light ? "var(--on-brand)" : "var(--azure-d)" }}>{v > 0 ? d[2] : "–"}</div>
          </div>
         );
        });
       })()}
      </div>
      <div className="row between" style={{ marginTop: 14 }}>
       <span className="mono muted" style={{ fontSize: 10 }}>{ri.heatLow}</span>
       <div style={{ flex: 1, height: 7, margin: "0 10px", borderRadius: 4, background: "linear-gradient(90deg,var(--azure-wash),var(--azure))" }} />
       <span className="mono muted" style={{ fontSize: 10 }}>{ri.heatHigh}</span>
      </div>
     </div>

     {/* district table */}
     <div className="card" style={{ gridColumn: "1 / -1", overflow: "hidden", boxShadow: "var(--sh-1)" }}>
      <div className="row between" style={{ padding: "16px 20px", borderBottom: "1px solid var(--silver)" }}>
       <div style={{ fontSize: 15, fontWeight: 700 }}>{ri.tableTitle}</div>
       <span className="chip" style={{ borderColor: "var(--silver)" }}>{ri.sortYoY} <Icon.chevd size={14} /></span>
      </div>
      <div style={{ overflowX: "auto" }}>
       <table className="dt" style={{ minWidth: 640 }}>
        <thead><tr><th>{ri.thLocation}</th><th>{ri.thAsset}</th><th style={{ textAlign: "right" }}>{ri.thMedian}</th><th style={{ textAlign: "right" }}>{ri.thBand}</th><th style={{ textAlign: "right" }}>{ri.thData}</th><th style={{ textAlign: "right" }}>{ri.thSource}</th></tr></thead>
        <tbody>
         {districts.map((d, i) => (
          <tr key={i}>
           <td style={{ fontWeight: 600 }}>{d[0]}</td>
           <td className="muted">{d[1]}</td>
           <td className="num mono" style={{ fontWeight: 500 }}><bdi dir="ltr">{d[2]}</bdi></td>
           {/* A low-high figure range is a single numeric atom: force LTR so it always
               reads low-to-high left-to-right, even under RTL (Codex area 4). Without
               this the two numbers reorder to high-on-left, misreading the range. The
               thin-sample text stays in the ambient direction. */}
           <td className="num mono muted">{d[4] ? <bdi dir="ltr">{d[3]}</bdi> : d[3]}</td>
           <td className="num">{d[4] ? <span className="statusdot ok">{ri.sufficient}</span> : <span className="statusdot pend">{ri.thin}</span>}</td>
           <td className="num"><span className="statusdot pend">{ri.sample}</span></td>
          </tr>
         ))}
        </tbody>
       </table>
      </div>
      <div className="row gap10" style={{ padding: "14px 20px", borderTop: "1px solid var(--silver)", background: "var(--cool)" }}>
       <span style={{ color: "var(--harbor)" }}><Icon.check size={15} /></span>
       <span className="muted" style={{ fontSize: 12.5 }}>{ri.tableNote}</span>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
