import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel, dealLabel, cityLabel } from "@/lib/labels";
import type { Listing } from "@/lib/types";
import { Photo, Verified, Icon } from "@/components/satkit";
import ListingsMap, { type DistrictBubble, type ExactPin } from "@/components/ListingsMap";
import SaveSearch from "@/components/SaveSearch";
import LocationFilter, { type LocOpt } from "@/components/LocationFilter";
import { pickIndexRow, marketVerdict, type IndexRow } from "@/lib/market/verdict";

const ASSETS = ["office", "retail", "medical", "showroom", "warehouse", "serviced", "education", "land", "mixed_use", "hospitality", "gas_station", "entertainment", "wedding_hall", "worker_housing", "self_storage"];
const DEALS = ["lease", "sale"];

export default async function ListingsPage({ params, searchParams }: { params: { locale: string }; searchParams: { asset?: string; deal?: string; q?: string; district?: string; view?: string; smin?: string; smax?: string; pmin?: string; pmax?: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const sb = getSupabaseServer();
  let listings: Listing[] = [];
  let bubbles: DistrictBubble[] = [];
  let pins: ExactPin[] = [];
  let locations: LocOpt[] = [];
  const idxByDistrict = new Map<string, IndexRow[]>();
  const locKind = new Map<string, string>();
  if (sb) {
    let query = sb.from("listings").select("*, districts(name_en,name_ar,city)").eq("status", "published").order("created_at", { ascending: false }).limit(200);
    if (searchParams.asset) query = query.eq("asset_type", searchParams.asset);
    if (searchParams.deal) query = query.eq("deal_type", searchParams.deal);
    if (searchParams.smin) query = query.gte("area_sqm", Number(searchParams.smin));
    if (searchParams.smax) query = query.lte("area_sqm", Number(searchParams.smax));
    if (searchParams.deal !== "sale") {
      if (searchParams.pmin) query = query.gte("asking_rent_sqm", Number(searchParams.pmin));
      if (searchParams.pmax) query = query.lte("asking_rent_sqm", Number(searchParams.pmax));
    }
    const { data } = await query;
    listings = (data as Listing[]) ?? [];
    const { data: geo } = await sb.from("districts_geo").select("id,name_en,name_ar,lat,lng,kind");
    const { data: allLocs } = await sb.from("districts").select("id,city,name_en,name_ar,kind");
    (geo ?? []).forEach((g: any) => { if (g.kind) locKind.set(g.id, g.kind); });
    const { data: irows } = await sb.from("rent_index_published").select("district_id,asset_type,segment,unit,band_low,median,band_high,period,sufficient").eq("sufficient", true);
    (irows ?? []).forEach((r: any) => {
      const arr = idxByDistrict.get(r.district_id) ?? [];
      arr.push(r as IndexRow);
      idxByDistrict.set(r.district_id, arr);
    });
    const counts = new Map<string, number>();
    listings.forEach((l: any) => { if (l.district_id) counts.set(l.district_id, (counts.get(l.district_id) ?? 0) + 1); });
    bubbles = (geo ?? []).filter((g: any) => counts.get(g.id)).map((g: any) => ({ id: g.id, name: ((params.locale === "ar" ? g.name_ar : g.name_en) || g.name_en) + (g.kind === "development" ? (params.locale === "ar" ? " · مشروع" : " · project") : ""), lat: Number(g.lat), lng: Number(g.lng), count: counts.get(g.id) as number }));
    locations = (allLocs ?? []).map((d: any) => ({ id: d.id, city: d.city || "Other", kind: d.kind || "district", en: d.name_en, ar: d.name_ar, count: counts.get(d.id) ?? 0 }));
    const bids = Array.from(new Set(listings.map((l: any) => l.building_id).filter(Boolean)));
    if (bids.length) {
      const { data: bs } = await sb.from("buildings").select("id,lat,lng").in("id", bids).not("lat", "is", null);
      const bmap = new Map((bs ?? []).map((b: any) => [b.id, b]));
      pins = listings.filter((l: any) => bmap.get(l.building_id)).map((l: any) => {
        const b: any = bmap.get(l.building_id);
        return { id: l.id, title: (params.locale === "ar" ? l.title_ar : l.title_en) || l.reference_code, lat: Number(b.lat), lng: Number(b.lng), price: "" };
      });
    }
  }
  const shown = searchParams.district ? listings.filter((l: any) => l.district_id === searchParams.district) : listings;
  const activeDistrict = searchParams.district ? bubbles.find((b) => b.id === searchParams.district) ?? null : null;
  const dtop = bubbles.slice().sort((a, b) => b.count - a.count).slice(0, 12);
  if (activeDistrict && !dtop.some((d) => d.id === activeDistrict.id)) dtop.unshift(activeDistrict);
  const cityTotals = new Map<string, number>();
  locations.forEach((l) => cityTotals.set(l.city, (cityTotals.get(l.city) ?? 0) + l.count));
  const cities = Array.from(new Set(locations.map((l) => l.city)))
    .sort((a, b) => (b === "Riyadh" ? 1 : 0) - (a === "Riyadh" ? 1 : 0) || (cityTotals.get(b) ?? 0) - (cityTotals.get(a) ?? 0))
    .map((k) => ({ key: k, label: cityLabel(k, locale) }));
  const baseSp = new URLSearchParams();
  if (searchParams.asset) baseSp.set("asset", searchParams.asset);
  if (searchParams.deal) baseSp.set("deal", searchParams.deal);
  if (searchParams.q) baseSp.set("q", searchParams.q);
  if (searchParams.smin) baseSp.set("smin", searchParams.smin);
  if (searchParams.smax) baseSp.set("smax", searchParams.smax);
  if (searchParams.pmin) baseSp.set("pmin", searchParams.pmin);
  if (searchParams.pmax) baseSp.set("pmax", searchParams.pmax);
  const base = baseSp.toString();
  const insightsView = searchParams.view === "insights";
  const qsWith = (extra?: Record<string, string>) => {
    const p = new URLSearchParams(baseSp);
    if (searchParams.district) p.set("district", searchParams.district);
    if (extra) Object.entries(extra).forEach(([k, v]) => p.set(k, v));
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  let idx: any[] = [];
  if (sb && insightsView) {
    let iq = sb.from("rent_index_published").select("district_label, district_label_ar, district_id, asset_type, segment, median, band_low, band_high, sufficient, sort_order").order("sort_order", { ascending: true }).limit(20);
    if (searchParams.asset) iq = iq.eq("asset_type", searchParams.asset);
    if (searchParams.district) iq = iq.eq("district_id", searchParams.district);
    const { data: idata } = await iq;
    idx = idata ?? [];
  }
  const SEGL: Record<string, string> = params.locale === "ar"
    ? { grade_a: "الفئة A", grade_b: "الفئة B", grade_c: "الفئة C", serviced: "مخدومة", street_front: "واجهة شارع", mall_inline: "داخل مول", clinic: "عيادة" }
    : { grade_a: "Grade A", grade_b: "Grade B", grade_c: "Grade C", serviced: "Serviced", street_front: "Street front", mall_inline: "Mall inline", clinic: "Clinic" };
  const rcity = ar ? "الرياض" : "Riyadh";
  const chip = (label: string, key: "asset" | "deal", val: string) => {
    const active = searchParams[key] === val;
    const sp = new URLSearchParams(searchParams as Record<string, string>);
    if (active) sp.delete(key); else sp.set(key, val);
    return <Link key={key + val} href={`/${locale}/listings?${sp.toString()}`} className={active ? "chip on" : "chip"} style={{ textDecoration: "none" }}>{label}</Link>;
  };
  const rangeChip = (label: string, minKey: string, maxKey: string, minVal: string, maxVal: string) => {
    const sp = new URLSearchParams(searchParams as Record<string, string>);
    const active = (sp.get(minKey) || "") === minVal && (sp.get(maxKey) || "") === maxVal;
    if (active) { sp.delete(minKey); sp.delete(maxKey); }
    else { if (minVal) sp.set(minKey, minVal); else sp.delete(minKey); if (maxVal) sp.set(maxKey, maxVal); else sp.delete(maxKey); }
    return <Link key={minKey + label} href={`/${locale}/listings?${sp.toString()}`} className={active ? "chip on" : "chip"} style={{ textDecoration: "none" }}>{label}</Link>;
  };
  const SIZES: string[][] = ar
    ? [["أقل من 200 م²", "", "200"], ["200 إلى 500", "200", "500"], ["500 إلى 1,000", "500", "1000"], ["1,000 إلى 2,500", "1000", "2500"], ["أكثر من 2,500", "2500", ""]]
    : [["Under 200 m²", "", "200"], ["200 to 500", "200", "500"], ["500 to 1,000", "500", "1000"], ["1,000 to 2,500", "1000", "2500"], ["Over 2,500 m²", "2500", ""]];
  const PRICES: string[][] = ar
    ? [["أقل من 1,000", "", "1000"], ["1,000 إلى 2,000", "1000", "2000"], ["2,000 إلى 3,000", "2000", "3000"], ["أكثر من 3,000", "3000", ""]]
    : [["Under 1,000", "", "1000"], ["1,000 to 2,000", "1000", "2000"], ["2,000 to 3,000", "2000", "3000"], ["Over 3,000", "3000", ""]];
  const kindFor = (a: string) => (a === "retail" || a === "showroom" ? "retail" : a === "warehouse" ? "warehouse" : "office");
  return (
    <div style={{ maxWidth: 1360, margin: "0 auto", padding: "28px 24px 64px", fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <div className="row between wrap" style={{ alignItems: "flex-end", gap: 12 }}>
        <div>
          <div className="eyebrow">{ar ? "المنصّة" : "The exchange"}</div>
          <h1 className="serif" style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-.02em", margin: "10px 0 0", color: "var(--ink)" }}>{ar ? "مساحات موثّقة في المملكة" : "Verified spaces across the Kingdom"}</h1>
        </div>
        <Link href={`/${locale}/map`} className="btn ghost" style={{ gap: 7, textDecoration: "none" }}>{ar ? "عرض على الخريطة" : "View on map"} <Icon.pin size={16} /></Link>
      </div>
      <form method="get" className="search focus" style={{ marginTop: 18, border: "1px solid var(--azure)", boxShadow: "none" }}>
        <span style={{ color: "var(--harbor)" }}><Icon.spark size={18} /></span>
        <input name="q" defaultValue={searchParams.q || ""} placeholder={ar ? "صف ما تحتاجه، مثل: مكتب فئة A مجهّز في العليا بأقل من 1,600، بنحو 300 م²" : "Describe what you need, e.g. fitted Grade A office in Al Olaya under 1,600, around 300 m²"} style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14, color: "var(--ink)", fontFamily: "var(--sans)", textAlign: ar ? "right" : "left" }} />
        <button type="submit" className="btn primary">{ar ? "بحث" : "Search"}</button>
      </form>
      <div className="card pad" style={{ marginTop: 16, boxShadow: "var(--sh-1)" }}>
        <div className="row gap8 wrap" style={{ alignItems: "center", marginBottom: 10 }}>
          <span className="tag" style={{ minWidth: 62 }}>{ar ? "الصفقة" : "Deal"}</span>{DEALS.map((d) => chip(dealLabel(d, locale), "deal", d))}
        </div>
        <div className="row gap8" style={{ alignItems: "flex-start", marginBottom: 10 }}>
          <span className="tag" style={{ minWidth: 62, marginTop: 6 }}>{ar ? "النوع" : "Type"}</span>
          <div className="row gap8 wrap" style={{ flex: 1, minWidth: 0 }}>{ASSETS.map((a) => chip(assetLabel(a, locale), "asset", a))}</div>
        </div>
        <div className="row gap8 wrap" style={{ alignItems: "center", marginBottom: 10 }}>
          <span className="tag" style={{ minWidth: 62 }}>{ar ? "المساحة" : "Size"}</span>{SIZES.map((sz) => rangeChip(sz[0], "smin", "smax", sz[1], sz[2]))}
        </div>
        {searchParams.deal !== "sale" && (
          <div className="row gap8 wrap" style={{ alignItems: "center", marginBottom: 10 }}>
            <span className="tag" style={{ minWidth: 62 }}>{ar ? "الإيجار" : "Rent"}</span>{PRICES.map((pr) => rangeChip(pr[0], "pmin", "pmax", pr[1], pr[2]))}<span className="muted" style={{ fontSize: 11 }}>{ar ? "ريال/م²·سنة" : "SAR/m²·yr"}</span>
          </div>
        )}
        <div className="row gap8" style={{ alignItems: "flex-start", borderTop: "1px solid var(--silver)", paddingTop: 12 }}>
          <span className="tag" style={{ minWidth: 62, marginTop: 6 }}>{ar ? "الموقع" : "Location"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <LocationFilter locale={locale as "en" | "ar"} locations={locations} cities={cities} selected={searchParams.district ?? null} basePath={`/${locale}/listings`} baseQs={base} />
          </div>
        </div>
      </div>
      <div className="muted" style={{ marginTop: 14, fontSize: 13 }}>{ar ? `${shown.length} عرض موثّق` : `${shown.length} verified ${shown.length === 1 ? "space" : "spaces"}`}</div>
      <div className="row gap8 wrap" style={{ marginTop: 14 }}>
        <Link href={`/${locale}/listings${qsWith()}`} className={!insightsView ? "chip on" : "chip"} style={{ textDecoration: "none" }}>{ar ? "المساحات" : "Properties"}</Link>
        <Link href={`/${locale}/listings${qsWith({ view: "insights" })}`} className={insightsView ? "chip on" : "chip"} style={{ textDecoration: "none" }}>{ar ? "رؤى المؤشر" : "Insights"}</Link>
      </div>
      <SaveSearch locale={locale as "en" | "ar"} qs={qsWith().replace(/^\?/, "")} label={[searchParams.deal ? dealLabel(searchParams.deal, locale) : "", searchParams.asset ? assetLabel(searchParams.asset, locale) : "", activeDistrict ? activeDistrict.name : ""].filter(Boolean).join(" · ") || (ar ? "كل المساحات" : "All spaces")} />
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
                      <td className="num mono muted">{r.sufficient && r.band_low != null && r.band_high != null ? `${Number(r.band_low).toLocaleString("en-US")} \u2013 ${Number(r.band_high).toLocaleString("en-US")}` : (ar ? "عيّنة قليلة" : "Thin sample")}</td>
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
        <p className="muted" style={{ marginTop: 10 }}>{ar ? "لا توجد مساحات مطابقة. جرّب توسيع عوامل التصفية." : "No matching spaces. Try widening your filters."}</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 18 }}>
          {shown.map((l) => {
            const dn = l.districts ? (ar ? l.districts.name_ar : l.districts.name_en) : null;
            const price = l.deal_type === "lease" ? l.asking_rent_sqm : l.sale_price;
            const type = assetLabel(l.asset_type, locale);
            return (
              <Link key={l.id} href={`/${locale}/listings/${l.id}`} className="listing" style={{ textDecoration: "none", color: "inherit" }}>
                <Photo kind={kindFor(l.asset_type)} label={`${type}, ${dn || rcity}`} h={150} fav badges={[...((l as any).ownership_verified || (l as any).authorization_verified || (l as any).is_sat_listed ? [<Verified key="v" text={ar ? "موثّق من المالك" : "Verified owner"} />] : []), <span key="t" className="tag" style={{ background: "rgba(255,255,255,.9)" }}>{type}</span>]} />
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
                  <div className="meta"><span>{dn || rcity}</span><i /><span>{l.area_sqm} m²</span><i /><span>{type}</span></div>
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
