import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel, dealLabel, cityLabel, gradeLabel, fitoutLabel } from "@/lib/labels";
import type { Listing } from "@/lib/types";
import { Photo, Verified, Icon } from "@/components/satkit";
import ListingsMap, { type DistrictBubble, type ExactPin } from "@/components/ListingsMap";
import SaveSearch from "@/components/SaveSearch";
import FilterBar, { type LocOpt } from "@/components/FilterBar";
import { pickIndexRow, marketVerdict, type IndexRow } from "@/lib/market/verdict";
import JsonLd, { SITE } from "@/components/JsonLd";

const ASSETS = ["office", "retail", "medical", "showroom", "warehouse", "serviced", "education", "land", "mixed_use", "hospitality", "gas_station", "entertainment", "wedding_hall", "worker_housing", "self_storage"];
const GRADES = ["a_plus", "a", "b", "c"];
const FITS = ["shell_and_core", "warm_shell", "fitted", "furnished"];

type SP = { asset?: string; deal?: string; q?: string; district?: string; city?: string; place?: string; view?: string; smin?: string; smax?: string; sz?: string; pmin?: string; pmax?: string; rt?: string; spmin?: string; spmax?: string; sp?: string; grade?: string; fit?: string; verified?: string; sort?: string };

export async function generateMetadata({ params, searchParams }: { params: { locale: string }; searchParams: SP }) {
  const loc = (params.locale === "ar" ? "ar" : "en") as "en" | "ar";
  const ar = loc === "ar";
  let locLabel = "";
  if (searchParams.district) {
    const sb = getSupabaseServer();
    if (sb) { const { data } = await sb.from("districts").select("name_en,name_ar").eq("id", searchParams.district).single(); if (data) locLabel = ar ? (data.name_ar || data.name_en) : data.name_en; }
  } else if (searchParams.place) locLabel = searchParams.place;
  else if (searchParams.city) locLabel = cityLabel(searchParams.city, loc);
  const asset = searchParams.asset && !searchParams.asset.includes(",") ? assetLabel(searchParams.asset, loc) : "";
  const deal = searchParams.deal ? dealLabel(searchParams.deal, loc) : "";
  const what = [asset, deal].filter(Boolean).join(" ").trim();
  const title = locLabel
    ? (ar ? `${what || "مساحات تجارية"} في ${locLabel} | سات ماركتس` : `${what || "Commercial spaces"} in ${locLabel} | SAT Markets`)
    : (ar ? "مساحات تجارية موثّقة في السعودية | سات ماركتس" : "Verified commercial spaces in Saudi Arabia | SAT Markets");
  const description = locLabel
    ? (ar ? `تصفّح المساحات التجارية الموثّقة في ${locLabel} على سات ماركتس، من الملّاك مباشرة ومدعومة بمؤشر الإيجارات المنشور.` : `Browse verified commercial spaces in ${locLabel} on SAT Markets, owner-verified and backed by the published Rent Index.`)
    : (ar ? "تصفّح المساحات التجارية الموثّقة في المملكة، من الملّاك مباشرة، مدعومة بمؤشر الإيجارات." : "Browse verified commercial spaces across Saudi Arabia, owner-verified and backed by the Rent Index.");
  const qs = searchParams.district ? `?district=${searchParams.district}` : searchParams.city ? `?city=${encodeURIComponent(searchParams.city)}` : searchParams.place ? `?place=${encodeURIComponent(searchParams.place)}` : "";
  return { title, description, alternates: { canonical: `${SITE}/${params.locale}/listings${qs}` } };
}

export default async function ListingsPage({ params, searchParams }: { params: { locale: string }; searchParams: SP }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const t = (en: string, arr: string) => (ar ? arr : en);
  const list = (k?: string) => (k ? k.split(",").filter(Boolean) : []);
  const sb = getSupabaseServer();
  let listings: Listing[] = [];
  let bubbles: DistrictBubble[] = [];
  let pins: ExactPin[] = [];
  let locations: LocOpt[] = [];
  const idxByDistrict = new Map<string, IndexRow[]>();
  const assetCounts: Record<string, number> = {}, gradeCounts: Record<string, number> = {}, fitCounts: Record<string, number> = {};
  if (sb) {
    let query = sb.from("listings").select("*, districts(name_en,name_ar,city)").eq("status", "published").limit(300);
    const assetArr = list(searchParams.asset);
    if (assetArr.length) query = query.in("asset_type", assetArr);
    if (searchParams.deal) query = query.eq("deal_type", searchParams.deal);
    if (searchParams.smin) query = query.gte("area_sqm", Number(searchParams.smin));
    if (searchParams.smax) query = query.lte("area_sqm", Number(searchParams.smax));
    if (searchParams.deal !== "sale") {
      if (searchParams.pmin) query = query.gte("asking_rent_sqm", Number(searchParams.pmin));
      if (searchParams.pmax) query = query.lte("asking_rent_sqm", Number(searchParams.pmax));
    } else {
      if (searchParams.spmin) query = query.gte("sale_price", Number(searchParams.spmin));
      if (searchParams.spmax) query = query.lte("sale_price", Number(searchParams.spmax));
    }
    const gradeArr = list(searchParams.grade);
    if (gradeArr.length) query = query.in("building_grade", gradeArr);
    const fitArr = list(searchParams.fit);
    if (fitArr.length) query = query.in("fitout_condition", fitArr);
    if (searchParams.verified) query = query.or("ownership_verified.eq.true,authorization_verified.eq.true,is_sat_listed.eq.true");
    const { data } = await query.order("created_at", { ascending: false });
    listings = (data as Listing[]) ?? [];
    // Booking-style per-option counts: same filters minus the multi-select facets themselves.
    let fq = sb.from("listings").select("asset_type,building_grade,fitout_condition").eq("status", "published").limit(400);
    if (searchParams.deal) fq = fq.eq("deal_type", searchParams.deal);
    if (searchParams.smin) fq = fq.gte("area_sqm", Number(searchParams.smin));
    if (searchParams.smax) fq = fq.lte("area_sqm", Number(searchParams.smax));
    if (searchParams.deal !== "sale") { if (searchParams.pmin) fq = fq.gte("asking_rent_sqm", Number(searchParams.pmin)); if (searchParams.pmax) fq = fq.lte("asking_rent_sqm", Number(searchParams.pmax)); }
    else { if (searchParams.spmin) fq = fq.gte("sale_price", Number(searchParams.spmin)); if (searchParams.spmax) fq = fq.lte("sale_price", Number(searchParams.spmax)); }
    if (searchParams.verified) fq = fq.or("ownership_verified.eq.true,authorization_verified.eq.true,is_sat_listed.eq.true");
    const { data: fdata } = await fq;
    (fdata ?? []).forEach((r: any) => { if (r.asset_type) assetCounts[r.asset_type] = (assetCounts[r.asset_type] || 0) + 1; if (r.building_grade) gradeCounts[r.building_grade] = (gradeCounts[r.building_grade] || 0) + 1; if (r.fitout_condition) fitCounts[r.fitout_condition] = (fitCounts[r.fitout_condition] || 0) + 1; });
    const { data: geo } = await sb.from("districts_geo").select("id,name_en,name_ar,lat,lng,kind");
    const { data: allLocs } = await sb.from("districts").select("id,city,name_en,name_ar,kind");
    const { data: irows } = await sb.from("rent_index_published").select("district_id,asset_type,segment,unit,band_low,median,band_high,period,sufficient").eq("sufficient", true);
    (irows ?? []).forEach((r: any) => { const arr = idxByDistrict.get(r.district_id) ?? []; arr.push(r as IndexRow); idxByDistrict.set(r.district_id, arr); });
    const counts = new Map<string, number>();
    listings.forEach((l: any) => { if (l.district_id) counts.set(l.district_id, (counts.get(l.district_id) ?? 0) + 1); });
    bubbles = (geo ?? []).filter((g: any) => counts.get(g.id)).map((g: any) => ({ id: g.id, name: ((ar ? g.name_ar : g.name_en) || g.name_en) + (g.kind === "development" ? t(" · project", " · مشروع") : ""), lat: Number(g.lat), lng: Number(g.lng), count: counts.get(g.id) as number }));
    locations = (allLocs ?? []).map((d: any) => ({ id: d.id, city: d.city || "Other", kind: d.kind || "district", en: d.name_en, ar: d.name_ar, count: counts.get(d.id) ?? 0 }));
    const bids = Array.from(new Set(listings.map((l: any) => l.building_id).filter(Boolean)));
    if (bids.length) {
      const { data: bs } = await sb.from("buildings").select("id,lat,lng").in("id", bids).not("lat", "is", null);
      const bmap = new Map((bs ?? []).map((b: any) => [b.id, b]));
      pins = listings.filter((l: any) => bmap.get(l.building_id)).map((l: any) => { const b: any = bmap.get(l.building_id); return { id: l.id, title: (ar ? l.title_ar : l.title_en) || l.reference_code, lat: Number(b.lat), lng: Number(b.lng), price: "" }; });
    }
  }

  const cityTotals = new Map<string, number>();
  locations.forEach((l) => cityTotals.set(l.city, (cityTotals.get(l.city) ?? 0) + l.count));
  const cities = Array.from(new Set(locations.map((l) => l.city)))
    .sort((a, b) => (b === "Riyadh" ? 1 : 0) - (a === "Riyadh" ? 1 : 0) || (cityTotals.get(b) ?? 0) - (cityTotals.get(a) ?? 0))
    .map((k) => ({ key: k, label: cityLabel(k, locale) }));

  const cityIds = new Set(searchParams.city ? locations.filter((l) => l.city === searchParams.city).map((l) => l.id) : []);
  const placeIds = searchParams.place ? new Set(locations.filter((l) => l.en.toLowerCase() === searchParams.place!.toLowerCase() || (l.ar || "") === searchParams.place).map((l) => l.id)) : null;
  let shown = listings.slice();
  if (searchParams.district) shown = shown.filter((l: any) => l.district_id === searchParams.district);
  else if (placeIds) shown = placeIds.size ? shown.filter((l: any) => l.district_id && placeIds.has(l.district_id)) : [];
  else if (searchParams.city) shown = shown.filter((l: any) => l.district_id && cityIds.has(l.district_id));

  const szT = searchParams.sz ? Number(searchParams.sz) : null;
  const rtT = searchParams.rt ? Number(searchParams.rt) : null;
  const spT = searchParams.sp ? Number(searchParams.sp) : null;
  const sort = searchParams.sort || (szT || rtT || spT ? "best" : "new");
  const vScore = (l: any) => { if (l.deal_type !== "lease" || l.asking_rent_sqm == null) return Infinity; const row = pickIndexRow(idxByDistrict.get(l.district_id) ?? [], l.asset_type, (l as any).building_grade); const med = row?.median; return med == null ? Infinity : Number(l.asking_rent_sqm) / Number(med); };
  const priceOf = (l: any) => Number(l.deal_type === "sale" ? (l.sale_price ?? 1e15) : (l.asking_rent_sqm ?? 1e15));
  if (szT != null) shown.sort((a: any, b: any) => Math.abs((a.area_sqm || 0) - szT) - Math.abs((b.area_sqm || 0) - szT));
  else if (rtT != null) shown.sort((a: any, b: any) => Math.abs((a.asking_rent_sqm || 0) - rtT) - Math.abs((b.asking_rent_sqm || 0) - rtT));
  else if (spT != null) shown.sort((a: any, b: any) => Math.abs((a.sale_price || 0) - spT) - Math.abs((b.sale_price || 0) - spT));
  else if (sort === "rent") shown.sort((a: any, b: any) => priceOf(a) - priceOf(b));
  else if (sort === "rent_desc") shown.sort((a: any, b: any) => priceOf(b) - priceOf(a));
  else if (sort === "size") shown.sort((a: any, b: any) => (a.area_sqm || 0) - (b.area_sqm || 0));
  else if (sort === "size_desc") shown.sort((a: any, b: any) => (b.area_sqm || 0) - (a.area_sqm || 0));
  else if (sort === "best") shown.sort((a: any, b: any) => vScore(a) - vScore(b));

  const activeDistrict = searchParams.district ? bubbles.find((b) => b.id === searchParams.district) ?? null : null;

  const fparams: Record<string, string> = {};
  (Object.keys(searchParams) as (keyof SP)[]).forEach((k) => { if (searchParams[k]) fparams[k] = String(searchParams[k]); });

  const baseSp = new URLSearchParams();
  Object.entries(fparams).forEach(([k, v]) => { if (k !== "district" && k !== "place" && k !== "view") baseSp.set(k, v); });
  const base = baseSp.toString();
  const insightsView = searchParams.view === "insights";
  const qsWith = (extra?: Record<string, string>) => {
    const p = new URLSearchParams();
    Object.entries(fparams).forEach(([k, v]) => { if (k !== "view") p.set(k, v); });
    if (extra) Object.entries(extra).forEach(([k, v]) => p.set(k, v));
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  let idx: any[] = [];
  if (sb && insightsView) {
    let iq = sb.from("rent_index_published").select("district_label, district_label_ar, district_id, asset_type, segment, median, band_low, band_high, sufficient, sort_order").order("sort_order", { ascending: true }).limit(20);
    const aArr = list(searchParams.asset);
    if (aArr.length) iq = iq.in("asset_type", aArr);
    if (searchParams.district) iq = iq.eq("district_id", searchParams.district);
    const { data: idata } = await iq;
    idx = idata ?? [];
  }
  const SEGL: Record<string, string> = ar
    ? { grade_a: "الفئة A", grade_b: "الفئة B", grade_c: "الفئة C", serviced: "مخدومة", street_front: "واجهة شارع", mall_inline: "داخل مول", clinic: "عيادة" }
    : { grade_a: "Grade A", grade_b: "Grade B", grade_c: "Grade C", serviced: "Serviced", street_front: "Street front", mall_inline: "Mall inline", clinic: "Clinic" };
  const rcity = ar ? "الرياض" : "Riyadh";
  const kindFor = (a: string) => a;

  const assets = ASSETS.map((a) => ({ value: a, label: assetLabel(a, locale) }));
  const grades = GRADES.map((g) => ({ value: g, label: gradeLabel(g, locale) }));
  const fits = FITS.map((f) => ({ value: f, label: fitoutLabel(f, locale) }));
  const sorts = ar
    ? [{ value: "new", label: "الأحدث" }, { value: "rent", label: "السعر من الأقل" }, { value: "rent_desc", label: "السعر من الأعلى" }, { value: "size", label: "المساحة من الأصغر" }, { value: "size_desc", label: "المساحة من الأكبر" }, { value: "best", label: "الأفضل مطابقة" }]
    : [{ value: "new", label: "Newest" }, { value: "rent", label: "Price, low to high" }, { value: "rent_desc", label: "Price, high to low" }, { value: "size", label: "Size, small to large" }, { value: "size_desc", label: "Size, large to small" }, { value: "best", label: "Best match" }];

  const saveLabel = [searchParams.deal ? dealLabel(searchParams.deal, locale) : "", activeDistrict ? activeDistrict.name : (searchParams.place || (searchParams.city ? cityLabel(searchParams.city, locale) : ""))].filter(Boolean).join(" · ") || (ar ? "كل المساحات" : "All spaces");

  const distLoc = searchParams.district ? locations.find((l) => l.id === searchParams.district) : null;
  const crumbLoc = distLoc ? (ar ? (distLoc.ar || distLoc.en) : distLoc.en) : (searchParams.place || (searchParams.city ? cityLabel(searchParams.city, locale) : ""));
  const crumbQs = searchParams.district ? `?district=${searchParams.district}` : searchParams.city ? `?city=${encodeURIComponent(searchParams.city)}` : searchParams.place ? `?place=${encodeURIComponent(searchParams.place)}` : "";
  return (
    <div style={{ maxWidth: 1360, margin: "0 auto", padding: "28px 24px 64px", fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <JsonLd data={{ "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: ar ? "الرئيسية" : "Home", item: `${SITE}/${locale}` },
        { "@type": "ListItem", position: 2, name: ar ? "المساحات" : "Listings", item: `${SITE}/${locale}/listings` },
        ...(crumbLoc ? [{ "@type": "ListItem", position: 3, name: crumbLoc, item: `${SITE}/${locale}/listings${crumbQs}` }] : []),
      ] }} />
      <div className="row between wrap" style={{ alignItems: "flex-end", gap: 12 }}>
        <div>
          <div className="eyebrow">{ar ? "المنصّة" : "The exchange"}</div>
          <h1 className="serif" style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-.02em", margin: "10px 0 0", color: "var(--ink)" }}>{ar ? "مساحات موثّقة في المملكة" : "Verified spaces across the Kingdom"}</h1>
        </div>
        <Link href={`/${locale}/map`} className="btn" style={{ gap: 7, textDecoration: "none", background: "rgba(58,110,165,.10)", color: "var(--harbor)", border: "1px solid var(--harbor)", fontWeight: 600 }}><Icon.pin size={16} /> {ar ? "عرض على الخريطة" : "View on map"}</Link>
      </div>
      <form method="get" className="search focus" style={{ marginTop: 18, border: "1px solid var(--azure)", boxShadow: "none" }}>
        <span style={{ color: "var(--harbor)" }}><Icon.spark size={18} /></span>
        <input name="q" defaultValue={searchParams.q || ""} placeholder={ar ? "صف ما تحتاجه، مثل: مكتب فئة A مجهّز في العليا بأقل من 1,600، بنحو 300 م²" : "Describe what you need, e.g. fitted Grade A office in Al Olaya under 1,600, around 300 m²"} style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14, color: "var(--ink)", fontFamily: "var(--sans)", textAlign: ar ? "right" : "left" }} />
        <button type="submit" className="btn primary">{ar ? "بحث" : "Search"}</button>
      </form>
      <div style={{ marginTop: 16 }}>
        <FilterBar locale={locale as "en" | "ar"} params={fparams} cities={cities} locations={locations} assets={assets} grades={grades} fits={fits} sorts={sorts} assetCounts={assetCounts} gradeCounts={gradeCounts} fitCounts={fitCounts} basePath={`/${locale}/listings`} />
      </div>
      <div className="row between wrap" style={{ marginTop: 14, alignItems: "center", gap: 10 }}>
        <div className="muted" style={{ fontSize: 13 }}>{ar ? `${shown.length} عرض موثّق` : `${shown.length} verified ${shown.length === 1 ? "space" : "spaces"}`}{searchParams.place && (!placeIds || !placeIds.size) ? (ar ? ` · لا مساحات موثّقة في ${searchParams.place} بعد` : ` · no verified spaces in ${searchParams.place} yet`) : ""}</div>
        <div className="row gap8 wrap">
          <Link href={`/${locale}/listings${qsWith()}`} className={!insightsView ? "chip on" : "chip"} style={{ textDecoration: "none" }}>{ar ? "المساحات" : "Properties"}</Link>
          <Link href={`/${locale}/listings${qsWith({ view: "insights" })}`} className={insightsView ? "chip on" : "chip"} style={{ textDecoration: "none" }}>{ar ? "رؤى المؤشر" : "Insights"}</Link>
        </div>
      </div>
      <SaveSearch locale={locale as "en" | "ar"} qs={qsWith().replace(/^\?/, "")} label={saveLabel} />
      <div className="lst-split" style={{ marginTop: 18 }}>
      <div>
      {insightsView ? (
        <div className="card" style={{ overflow: "hidden", boxShadow: "var(--sh-1)" }}>
          <div className="row between" style={{ padding: "14px 18px", borderBottom: "1px solid var(--silver)" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>{ar ? "شرائح المؤشر للتصفية الحالية · عيّنة المنصّة" : "Index cut for this filter · platform sample"}</div>
            <Link href={`/${locale}/rent-index`} className="chip" style={{ textDecoration: "none" }}>{ar ? "المؤشر الكامل" : "Full index"}</Link>
          </div>
          {idx.length === 0 ? (
            <p className="muted" style={{ padding: 18, margin: 0, fontSize: 13.5 }}>{ar ? "لا توجد شرائح مؤشر لهذه التصفية. ما لا يحمل بيانات كافية يُوجَّه إلى المستشار." : "No index segments for this filter. Anything without sufficient data routes to the advisor."}</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="dt" style={{ minWidth: 520 }}>
                <thead><tr><th>{ar ? "الموقع" : "Location"}</th><th>{ar ? "الأصل" : "Asset"}</th><th style={{ textAlign: "right" }}>{ar ? "الوسيط ريال/م²" : "Median SAR/m²"}</th><th style={{ textAlign: "right" }}>{ar ? "النطاق" : "Band"}</th><th style={{ textAlign: "right" }}>{ar ? "البيانات" : "Data"}</th></tr></thead>
                <tbody>
                  {idx.map((r: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{(ar ? r.district_label_ar : r.district_label) || r.district_label}</td>
                      <td className="muted">{assetLabel(r.asset_type, locale)}{r.segment ? " · " + (SEGL[r.segment] || r.segment) : ""}</td>
                      <td className="num mono">{r.sufficient && r.median != null ? Number(r.median).toLocaleString("en-US") : (ar ? "غير متاح" : "n/a")}</td>
                      <td className="num mono muted">{r.sufficient && r.band_low != null && r.band_high != null ? `${Number(r.band_low).toLocaleString("en-US")} – ${Number(r.band_high).toLocaleString("en-US")}` : (ar ? "عيّنة قليلة" : "Thin sample")}</td>
                      <td className="num">{r.sufficient ? <span className="statusdot ok">{ar ? "كافٍ" : "Sufficient"}</span> : <span className="statusdot pend">{ar ? "قليل" : "Thin"}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="muted" style={{ padding: "12px 18px", borderTop: "1px solid var(--silver)", background: "var(--cool)", fontSize: 12 }}>{ar ? "بيانات عيّنة قبل الإطلاق تُوضّح الآلية. النطاقات المنشورة المنسوبة على صفحة المؤشر." : "Pre-launch sample data illustrating the mechanism. Attributed published bands live on the Rent Index page."}</div>
        </div>
      ) : shown.length === 0 ? (
        <div style={{ marginTop: 12 }}>
          <p className="muted" style={{ margin: 0 }}>{ar ? "لا توجد مساحات مطابقة. جرّب توسيع عوامل التصفية أو مسح الكل." : "No matching spaces. Try widening your filters, or clear them all."}</p>
          <Link href={`/${locale}/listings`} className="btn" style={{ display: "inline-flex", alignItems: "center", marginTop: 10, height: 38, padding: "0 14px", borderRadius: 999, textDecoration: "none" }}>{ar ? "مسح كل عوامل التصفية" : "Clear all filters"}</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 18 }}>
          {shown.map((l) => {
            const dn = l.districts ? (ar ? l.districts.name_ar : l.districts.name_en) : null;
            const price = l.deal_type === "lease" ? l.asking_rent_sqm : l.sale_price;
            const type = assetLabel(l.asset_type, locale);
            return (
              <Link key={l.id} href={`/${locale}/listings/${l.id}`} className="listing" data-lid={l.id} style={{ textDecoration: "none", color: "inherit" }}>
                <Photo kind={kindFor(l.asset_type)} alt={`${type}, ${dn || rcity}`} h={150} fav badges={[...((l as any).ownership_verified || (l as any).authorization_verified || (l as any).is_sat_listed ? [<Verified key="v" text={ar ? "موثّق من المالك" : "Verified owner"} />] : []), <span key="t" className="tag" style={{ background: "rgba(255,255,255,.9)" }}>{type}</span>]} />
                <div className="body">
                  <div className="price">{price != null ? Number(price).toLocaleString("en-US") : (ar ? "عند الطلب" : "On request")}<small> {l.deal_type === "lease" ? (ar ? "ريال/م²·سنة" : "SAR/m²·yr") : (ar ? "ريال" : "SAR")}</small></div>
                  {(() => {
                    if (l.deal_type !== "lease" || l.asking_rent_sqm == null || !l.district_id) return null;
                    const v = marketVerdict(l.asking_rent_sqm, pickIndexRow(idxByDistrict.get(l.district_id) ?? [], l.asset_type, (l as any).building_grade));
                    if (v.status === "na" || v.deltaPct == null) return null;
                    const a = Math.abs(v.deltaPct);
                    const txt = v.status === "below" ? (ar ? `أقل من وسيط المؤشر بنحو ${a}%` : `~${a}% below index median`) : v.status === "above" ? (ar ? `أعلى من وسيط المؤشر بنحو ${a}%` : `~${a}% above index median`) : (ar ? "ضمن نطاق المؤشر" : "Within index band");
                    const col = v.status === "below" ? "#1F8A5B" : v.status === "above" ? "#8A5A1F" : "var(--harbor)";
                    return <div className="mono" style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: col }} title={ar ? "مقابل مؤشر الإيجارات، عيّنة المنصّة. استرشادي وليس نصيحة." : "Vs the Rent Index, platform sample. Indicative, not advice."}>{txt}</div>;
                  })()}
                  <div className="ttl">{(ar ? l.title_ar : l.title_en) || l.reference_code}</div>
                  <div className="meta"><span>{dn || rcity}</span><i /><span>{l.area_sqm} m²</span><i /><span>{type}</span>{(l as any).building_grade && (l as any).building_grade !== "n_a" ? <><i /><span>{gradeLabel((l as any).building_grade, locale)}</span></> : null}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      </div>
      <ListingsMap locale={locale as "en" | "ar"} bubbles={bubbles} pins={pins} baseParams={base} />
      </div>
    </div>
  );
}
