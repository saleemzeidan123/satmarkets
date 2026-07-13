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

const AZURE = "#3A6EA5";

type DRow = [string, string, string, string, boolean];

export function generateMetadata({ params }: { params: { locale: string } }) {
  return pageMeta(params.locale, '/rent-index', 'Rent Index | SAT Markets', 'مؤشر الإيجارات | سات ماركتس', 'Riyadh commercial rent bands by district, asset and grade, compiled from published benchmarks and attributed to source. Indicative, not advice.', 'نطاقات إيجار العقار التجاري في الرياض حسب الحي والأصل والفئة، مجمّعة من مراجع منشورة ومنسوبة إلى مصادرها. استرشادي وليس نصيحة.');
}

export default async function RentIndexPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const ar = params.locale === "ar";
 const ri = getDictionary(params.locale === "ar" ? "ar" : "en").rentIndex;
 const pub = await getPublishedKpis();

 const MOCK_DISTRICTS: DRow[] = ar ? [
  ["العليا", "مكاتب · الفئة A", "2,400", "1,800–2,900", true],
  ["كافد", "مكاتب · الفئة A", pub.kafdMedian.toLocaleString(), "3,000–4,200", true],
  ["طريق الملك فهد", "مكاتب · الفئة A", "2,100", "1,500–2,700", true],
  ["شمال الرياض (غرناطة · حطين)", "مكاتب · الفئة A", "1,350", "1,000–1,800", true],
  ["العليا", "مكاتب · الفئة B", "1,150", "900–1,400", true],
  ["الحي الدبلوماسي", "مكاتب · الفئة A", "غير متاح", "عينة قليلة", false],
 ] : [
  ["Al Olaya", "Office · Grade A", "2,400", "1,800–2,900", true],
  ["KAFD", "Office · Grade A", pub.kafdMedian.toLocaleString(), "3,000–4,200", true],
  ["King Fahd Road", "Office · Grade A", "2,100", "1,500–2,700", true],
  ["North Riyadh (Granada · Hittin)", "Office · Grade A", "1,350", "1,000–1,800", true],
  ["Al Olaya", "Office · Grade B", "1,150", "900–1,400", true],
  ["Diplomatic Quarter", "Office · Grade A", "n/a", "Thin sample", false],
 ];

 const SEG: Record<string, string> = ar
  ? { grade_a: "الفئة A", grade_b: "الفئة B", grade_c: "الفئة C", serviced: "مخدومة", street: "شارع تجزئة", prime: "مميّز", clinic: "عيادات", street_front: "واجهة شارع", mall_inline: "داخل مول", modern: "حديثة", older: "أقدم", blended: "مجمّع" }
  : { grade_a: "Grade A", grade_b: "Grade B", grade_c: "Grade C", serviced: "Serviced", street: "street", prime: "prime", clinic: "Clinic", street_front: "Street front", mall_inline: "Mall inline", modern: "Modern", older: "Older", blended: "Blended" };
 const ASSET: Record<string, string> = ar
  ? { office: "مكاتب", retail: "تجزئة", warehouse: "مستودعات", serviced: "مفروشة", medical: "طبي", showroom: "معارض", land: "أراضٍ" }
  : { office: "Office", retail: "Retail", warehouse: "Warehouse", serviced: "Serviced", medical: "Medical", showroom: "Showroom", land: "Land" };
 const nf = (n: number) => n.toLocaleString("en-US");
 let districts: DRow[] = MOCK_DISTRICTS;
 try {
  const supabase = getSupabaseServer();
  if (supabase) {
   const { data } = await supabase
    .from("rent_index_published")
    .select("district_label, district_label_ar, asset_type, segment, median, band_low, band_high, sufficient, sort_order")
    .order("sort_order", { ascending: true })
    .limit(14);
   if (data && data.length) {
    districts = data.map((r: any): DRow => {
     const asset = `${ASSET[r.asset_type] || r.asset_type}${r.segment ? " · " + (SEG[r.segment] || r.segment) : ""}`;
     const median = r.sufficient && r.median != null ? nf(Number(r.median)) : (ri.na);
     const band = r.sufficient && r.band_low != null && r.band_high != null ? `${nf(Number(r.band_low))}–${nf(Number(r.band_high))}` : (ri.thinSample);
     return [ar ? (r.district_label_ar || r.district_label) : r.district_label, asset, median, band, !!r.sufficient];
    });
   }
  }
 } catch {
  districts = MOCK_DISTRICTS;
 }
 const kpis: [string, string, string, string | null][] = ar ? [
  ["3,630", "كافد الفئة الأولى ريال/م²·سنة", "+5.5% سنوياً", "up"],
  [pub.gradeAMedian.toLocaleString(), "الفئة A ريال/م²·سنة", `+${pub.gradeAYoyPct}% سنوياً`, "up"],
  ["1,680", "الفئة B ريال/م²·سنة", "+5.1% سنوياً", "up"],
  [`${pub.gradeAOccupancyPct}%`, "إشغال الفئة A", "شواغر الفئة الأولى 3.1%", null],
 ] : [
  ["3,630", "KAFD prime SAR/m²·yr", "+5.5% YoY", "up"],
  [pub.gradeAMedian.toLocaleString(), "Grade A SAR/m²·yr", `+${pub.gradeAYoyPct}% YoY`, "up"],
  ["1,680", "Grade B SAR/m²·yr", "+5.1% YoY", "up"],
  [`${pub.gradeAOccupancyPct}%`, "Grade A occupancy", "prime vacancy 3.1%", null],
 ];

 return (
  <div style={{ background: "var(--cool)" }}>
   <JsonLd data={{
    "@type": "Dataset",
    name: "Riyadh Commercial Rent Index, Q1 2026",
    url: `${SITE}/${params.locale}/rent-index`,
    inLanguage: ["ar", "en"],
    description: "A comparison of published Saudi commercial rent benchmarks for Q1 2026, compiled and attributed by SAT Markets. Sources: JLL Q1 2026, CBRE Q1 2026, Knight Frank, SAMA. Indicative market context, not advice; SAT does not originate these figures.",
    creator: { "@type": "Organization", name: "SAT Markets", url: SITE },
    isBasedOn: ["JLL Q1 2026 published research", "CBRE Q1 2026 published research", "Knight Frank published research", "SAMA published data"],
    temporalCoverage: "2026-01/2026-03",
    spatialCoverage: "Riyadh, Saudi Arabia",
   }} />
   <div style={{ maxWidth: 1360, margin: "0 auto" }}>
    {/* header band */}
    <div className="row between wrap" style={{ padding: "26px 24px 20px", alignItems: "flex-end", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 16 }}>
     <div>
      <div className="eyebrow">{ri.eyebrow}</div>
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
       <div className="big" style={{ color: "var(--azure-d)" }}>{`+${pub.gradeAYoyPct}%`} <span style={{ fontSize: 13, color: "var(--slate)" }}>{ri.yoyGradeA}</span></div>
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
     {/* published bands, attributed (Layer 1) */}
     <div className="card pad" style={{ gridColumn: "1 / -1", boxShadow: "var(--sh-1)" }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{ri.bandsTitle}</div>
      <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{ri.bandsSub}</div>
      <div className="col gap8" style={{ marginTop: 14, fontSize: 13.5 }}>
       <div><strong>{ri.developments}</strong> {ri.developmentsData}</div>
       <div><strong>{ri.districtsLabel}</strong> {ri.districtsData}</div>
       <div><strong>{ri.streets}</strong> {ri.streetsData}</div>
      </div>
     </div>
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
      <div style={{ fontSize: 15, fontWeight: 700 }}>Rent heat · by district</div>
      <div className="muted" style={{ fontSize: 12.5 }}>Darker = higher SAR/m² · illustrative sample</div>
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
           <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.25, color: light ? "#fff" : "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d[0]}</div>
           <div className="mono" style={{ fontSize: 13, fontWeight: 700, marginTop: 6, color: light ? "#fff" : "var(--azure-d)" }}>{v > 0 ? d[2] : "–"}</div>
          </div>
         );
        });
       })()}
      </div>
      <div className="row between" style={{ marginTop: 14 }}>
       <span className="mono muted" style={{ fontSize: 10 }}>Lower</span>
       <div style={{ flex: 1, height: 7, margin: "0 10px", borderRadius: 4, background: "linear-gradient(90deg,var(--azure-wash),var(--azure))" }} />
       <span className="mono muted" style={{ fontSize: 10 }}>Higher</span>
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
           <td className="num mono" style={{ fontWeight: 500 }}>{d[2]}</td>
           <td className="num mono muted">{d[3]}</td>
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
