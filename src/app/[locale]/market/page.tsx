import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel } from "@/lib/labels";
import { pickIndexRow, marketVerdict, type IndexRow } from "@/lib/market/verdict";
import WatchBanner from "@/components/WatchBanner";
import JsonLd, { SITE } from "@/components/JsonLd";

export const revalidate = 1800;

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const ar = params.locale === "ar";
  return {
    title: ar ? "نبض السوق التجاري في الرياض | سات ماركتس" : "Riyadh commercial market pulse | SAT Markets",
    description: ar
      ? "السوق التجاري في الرياض بنظرة واحدة: نطاقات مؤشر الإيجارات المنشورة والمنسوبة ومؤشرات المنصّة الموثّقة. استرشادي وليس نصيحة."
      : "The Riyadh commercial market at a glance: published, attributed Rent Index bands and verified platform indicators. Indicative, not advice.",
    alternates: { canonical: `${SITE}/${params.locale}/market` },
  };
}

export default async function MarketPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const sb = getSupabaseServer();
  const nf = (n: number) => n.toLocaleString("en-US");

  let listings: any[] = [];
  let idxRows: any[] = [];
  let locCount = 0;
  if (sb) {
    const [{ data: ls }, { data: ir }, { count }] = await Promise.all([
      sb.from("listings").select("asset_type,deal_type,asking_rent_sqm,district_id,building_grade").eq("status", "published").limit(1000),
      sb.from("rent_index_published").select("district_id,district_label,district_label_ar,asset_type,segment,unit,median,band_low,band_high,period,sufficient").eq("sufficient", true),
      sb.from("districts").select("id", { count: "exact", head: true }),
    ]);
    listings = ls ?? [];
    idxRows = ir ?? [];
    locCount = count ?? 0;
  }

  const officeRows = idxRows.filter((r) => r.asset_type === "office" && r.unit === "sar_sqm_year" && r.median != null);
  const bandRows = officeRows
    .map((r) => ({ label: (ar ? r.district_label_ar : r.district_label) || r.district_label, low: Number(r.band_low ?? r.median), med: Number(r.median), high: Number(r.band_high ?? r.median), seg: r.segment }))
    .sort((a, b) => b.med - a.med)
    .slice(0, 8);
  const bandMin = bandRows.length ? Math.min(...bandRows.map((r) => r.low)) : 0;
  const bandMax = bandRows.length ? Math.max(...bandRows.map((r) => r.high)) : 1;
  const span = Math.max(bandMax - bandMin, 1);

  const byAsset = new Map<string, number>();
  listings.forEach((l) => byAsset.set(l.asset_type, (byAsset.get(l.asset_type) ?? 0) + 1));
  const assetMix = Array.from(byAsset.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const assetMax = assetMix.length ? assetMix[0][1] : 1;
  const leaseN = listings.filter((l) => l.deal_type === "lease").length;
  const saleN = listings.length - leaseN;

  const idxByDistrict = new Map<string, IndexRow[]>();
  idxRows.forEach((r: any) => { const a = idxByDistrict.get(r.district_id) ?? []; a.push(r as IndexRow); idxByDistrict.set(r.district_id, a); });
  let below = 0, within = 0, above = 0, graded = 0;
  listings.forEach((l) => {
    if (l.deal_type !== "lease" || l.asking_rent_sqm == null || !l.district_id) return;
    const v = marketVerdict(l.asking_rent_sqm, pickIndexRow(idxByDistrict.get(l.district_id) ?? [], l.asset_type, l.building_grade));
    if (v.status === "below") { below++; graded++; }
    else if (v.status === "within") { within++; graded++; }
    else if (v.status === "above") { above++; graded++; }
  });
  const pct = (n: number) => (graded ? Math.round((n / graded) * 100) : 0);

  const medOffice = officeRows.length ? officeRows.map((r) => Number(r.median)).sort((a, b) => a - b)[Math.floor(officeRows.length / 2)] : null;
  const period = idxRows.length ? idxRows[0].period : null;

  const tiles: [string, string][] = [
    [nf(listings.length), ar ? "مساحة موثّقة معروضة" : "verified spaces live"],
    [nf(locCount), ar ? "موقعاً مُغطى" : "locations covered"],
    [nf(idxRows.length), ar ? "شريحة مؤشر ببيانات كافية" : "index segments with sufficient data"],
    [medOffice != null ? nf(medOffice) : (ar ? "غير متاح" : "n/a"), ar ? "وسيط إيجار المكاتب ريال/م²·سنة" : "median office rent SAR/m²·yr"],
  ];

  const disc = [
    { n: below, p: pct(below), c: "#1F8A5B", en: "Below their index band", arb: "أقل من نطاق المؤشر" },
    { n: within, p: pct(within), c: "#3A6EA5", en: "Within their index band", arb: "ضمن نطاق المؤشر" },
    { n: above, p: pct(above), c: "#8A5A1F", en: "Above their index band", arb: "أعلى من نطاق المؤشر" },
  ];

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 24px 64px", fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <JsonLd data={{ "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: ar ? "الرئيسية" : "Home", item: `${SITE}/${locale}` },
        { "@type": "ListItem", position: 2, name: ar ? "نبض السوق" : "Market pulse", item: `${SITE}/${locale}/market` },
      ] }} />
      <JsonLd data={{
        "@type": "Dataset",
        name: `Riyadh Commercial Market Pulse${period ? ", " + period : ""}`,
        url: `${SITE}/${locale}/market`,
        inLanguage: ["ar", "en"],
        description: "Published, attributed Saudi commercial rent benchmarks and verified platform indicators for Riyadh, compiled by SAT Markets. Indicative market context, not advice; SAT does not originate these figures.",
        creator: { "@type": "Organization", name: "SAT Markets", url: SITE },
        isBasedOn: ["JLL published research", "CBRE published research", "Knight Frank published research", "SAMA published data"],
        spatialCoverage: "Riyadh, Saudi Arabia",
      }} />
      <div className="eyebrow">{ar ? "نبض السوق" : "Market pulse"}</div>
      <h1 className="serif" style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-.02em", margin: "10px 0 0" }}>{ar ? "السوق التجاري في الرياض، بنظرة واحدة" : "The Riyadh commercial market, at a glance"}</h1>
      <p className="muted" style={{ marginTop: 8, fontSize: 14.5, maxWidth: 660, lineHeight: 1.6 }}>{ar ? "كل رقم في هذه الصفحة من بيانات المنصّة الموثّقة أو من مؤشر الإيجارات، عيّنة المنصّة. لا تقديرات ولا أرقام بلا مصدر." : "Every figure on this page comes from verified platform data or the Rent Index, platform sample. No estimates, no unsourced numbers."}</p>

      <div style={{ marginTop: 22 }}><WatchBanner locale={params.locale as "en" | "ar"} /></div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginTop: 26 }}>
        {tiles.map((t, i) => (
          <div key={i} className="card" style={{ padding: "18px 20px" }}>
            <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: "var(--harbor)", letterSpacing: "-.02em" }}>{t[0]}</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{t[1]}</div>
          </div>
        ))}
      </div>

      {bandRows.length > 0 && (
        <section className="card" style={{ marginTop: 26, padding: "22px 24px" }}>
          <div className="row between wrap" style={{ alignItems: "baseline", gap: 10 }}>
            <h2 className="serif" style={{ fontSize: 21, fontWeight: 500, margin: 0 }}>{ar ? "نطاقات إيجار المكاتب حسب الموقع" : "Office rent bands by location"}</h2>
            <span className="mono muted" style={{ fontSize: 11.5 }}>{(period || "") + (ar ? " · ريال/م²·سنة" : " · SAR/m²·yr")}</span>
          </div>
          <div style={{ marginTop: 18 }}>
            {bandRows.map((r, i) => {
              const left = ((r.low - bandMin) / span) * 100;
              const width = Math.max(((r.high - r.low) / span) * 100, 2);
              const medPos = ((r.med - bandMin) / span) * 100;
              return (
                <div key={i} className="row gap10" style={{ alignItems: "center", padding: "7px 0" }}>
                  <span style={{ width: 150, flex: "none", fontSize: 12.5, fontWeight: 600 }}>{r.label}</span>
                  <div style={{ position: "relative", flex: 1, height: 14, background: "var(--cool)", borderRadius: 7 }}>
                    <span style={{ position: "absolute", insetInlineStart: `${left}%`, width: `${width}%`, top: 0, bottom: 0, background: "rgba(58,110,165,.28)", borderRadius: 7 }} />
                    <span style={{ position: "absolute", insetInlineStart: `calc(${medPos}% - 4px)`, top: 2, width: 9, height: 9, borderRadius: "50%", background: "var(--harbor)" }} />
                  </div>
                  <span className="mono" style={{ width: 118, flex: "none", fontSize: 11.5, color: "var(--slate)", textAlign: ar ? "left" : "right" }}>{nf(r.low)}–{nf(r.high)} · <b style={{ color: "var(--harbor)" }}>{nf(r.med)}</b></span>
                </div>
              );
            })}
          </div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 12 }}>{ar ? "الشريط هو نطاق المؤشر، والنقطة هي الوسيط. شرائح ذات بيانات كافية فقط." : "The bar is the index band, the dot is the median. Sufficient segments only."}</div>
        </section>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18, marginTop: 18 }}>
        <section className="card" style={{ padding: "22px 24px" }}>
          <h2 className="serif" style={{ fontSize: 21, fontWeight: 500, margin: 0 }}>{ar ? "المعروض حسب نوع الأصل" : "Supply by asset type"}</h2>
          <div style={{ marginTop: 16 }}>
            {assetMix.map(([a, n], i) => (
              <div key={i} className="row gap10" style={{ alignItems: "center", padding: "6px 0" }}>
                <span style={{ width: 120, flex: "none", fontSize: 12.5 }}>{assetLabel(a, locale)}</span>
                <div style={{ flex: 1, height: 10, background: "var(--cool)", borderRadius: 5 }}>
                  <span style={{ display: "block", width: `${Math.max((n / assetMax) * 100, 3)}%`, height: "100%", background: "var(--harbor)", borderRadius: 5, opacity: 0.85 }} />
                </div>
                <span className="mono" style={{ width: 30, flex: "none", fontSize: "var(--fs-xs)", color: "var(--slate)", textAlign: ar ? "left" : "right" }}>{n}</span>
              </div>
            ))}
          </div>
          <div className="row gap10" style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--silver)", alignItems: "center" }}>
            <span className="muted" style={{ fontSize: 12.5, flex: "none" }}>{ar ? "الصفقات:" : "Deals:"}</span>
            <div style={{ flex: 1, height: 10, borderRadius: 5, overflow: "hidden", display: "flex" }}>
              <span style={{ width: `${listings.length ? (leaseN / listings.length) * 100 : 50}%`, background: "var(--harbor)" }} />
              <span style={{ flex: 1, background: "rgba(58,110,165,.25)" }} />
            </div>
            <span className="mono" style={{ fontSize: 11.5, color: "var(--slate)", flex: "none" }}>{ar ? `إيجار ${nf(leaseN)} · بيع ${nf(saleN)}` : `${nf(leaseN)} lease · ${nf(saleN)} sale`}</span>
          </div>
        </section>

        <section className="card" style={{ padding: "22px 24px" }}>
          <h2 className="serif" style={{ fontSize: 21, fontWeight: 500, margin: 0 }}>{ar ? "انضباط التسعير" : "Pricing discipline"}</h2>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.55 }}>{ar ? `من بين ${nf(graded)} عرض إيجار له شريحة مؤشر كافية، هكذا تقع الأسعار المطلوبة مقابل نطاق المؤشر.` : `Of ${nf(graded)} lease listings with a sufficient index segment, this is where asking rents sit against their band.`}</p>
          <div style={{ marginTop: 14 }}>
            {disc.map((d, i) => (
              <div key={i} style={{ padding: "8px 0" }}>
                <div className="row between" style={{ fontSize: 12.5, marginBottom: 5 }}>
                  <span style={{ fontWeight: 600 }}>{ar ? d.arb : d.en}</span>
                  <span className="mono" style={{ color: d.c, fontWeight: 700 }}>{d.n} · {d.p}%</span>
                </div>
                <div style={{ height: 10, background: "var(--cool)", borderRadius: 5 }}>
                  <span style={{ display: "block", width: `${Math.max(d.p, 2)}%`, height: "100%", background: d.c, borderRadius: 5, opacity: 0.85 }} />
                </div>
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 11.5, marginTop: 12, lineHeight: 1.55 }}>{ar ? "المؤشر يقيّم الأسعار لا الأشخاص. استرشادي وليس نصيحة." : "The index grades prices, never people. Indicative, not advice."}</p>
        </section>
      </div>

      <div className="row gap10 wrap" style={{ marginTop: 26 }}>
        <Link href={`/${locale}/listings`} className="btn primary" style={{ textDecoration: "none" }}>{ar ? "تصفّح المساحات الموثّقة" : "Browse verified spaces"}</Link>
        <Link href={`/${locale}/rent-index`} className="btn secondary" style={{ textDecoration: "none" }}>{ar ? "مؤشر الإيجارات الكامل" : "The full Rent Index"}</Link>
        <Link href={`/${locale}/locations`} className="btn ghost" style={{ textDecoration: "none" }}>{ar ? "دليل المواقع" : "Locations directory"}</Link>
      </div>
      <p className="muted" style={{ marginTop: 22, fontSize: "var(--fs-xs)" }}>{ar ? "بيانات عيّنة قبل الإطلاق تُوضّح الآلية. المعايير المنشورة المنسوبة إلى مصادرها على صفحة المؤشر." : "Pre-launch sample data illustrating the mechanism. Attributed published benchmarks live on the Rent Index page."}</p>
    </div>
  );
}
