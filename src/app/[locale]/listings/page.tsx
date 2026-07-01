import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel, dealLabel } from "@/lib/labels";
import type { Listing } from "@/lib/types";
import { Photo, Verified, Icon } from "@/components/satkit";
import ListingsMap, { type DistrictBubble, type ExactPin } from "@/components/ListingsMap";

const ASSETS = ["office", "retail", "medical", "showroom", "warehouse", "serviced", "education", "land"];
const DEALS = ["lease", "sale"];

export default async function ListingsPage({ params, searchParams }: { params: { locale: string }; searchParams: { asset?: string; deal?: string; q?: string; district?: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const sb = getSupabaseServer();
  let listings: Listing[] = [];
  let bubbles: DistrictBubble[] = [];
  let pins: ExactPin[] = [];
  if (sb) {
    let query = sb.from("listings").select("*, districts(name_en,name_ar,city)").eq("status", "published").order("created_at", { ascending: false }).limit(200);
    if (searchParams.asset) query = query.eq("asset_type", searchParams.asset);
    if (searchParams.deal) query = query.eq("deal_type", searchParams.deal);
    const { data } = await query;
    listings = (data as Listing[]) ?? [];
    const { data: geo } = await sb.from("districts_geo").select("id,name_en,name_ar,lat,lng");
    const counts = new Map<string, number>();
    listings.forEach((l: any) => { if (l.district_id) counts.set(l.district_id, (counts.get(l.district_id) ?? 0) + 1); });
    bubbles = (geo ?? []).filter((g: any) => counts.get(g.id)).map((g: any) => ({ id: g.id, name: (params.locale === "ar" ? g.name_ar : g.name_en) || g.name_en, lat: Number(g.lat), lng: Number(g.lng), count: counts.get(g.id) as number }));
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
  const baseSp = new URLSearchParams();
  if (searchParams.asset) baseSp.set("asset", searchParams.asset);
  if (searchParams.deal) baseSp.set("deal", searchParams.deal);
  if (searchParams.q) baseSp.set("q", searchParams.q);
  const base = baseSp.toString();
  const rcity = ar ? "الرياض" : "Riyadh";
  const chip = (label: string, key: "asset" | "deal", val: string) => {
    const active = searchParams[key] === val;
    const sp = new URLSearchParams(searchParams as Record<string, string>);
    if (active) sp.delete(key); else sp.set(key, val);
    return <Link key={key + val} href={`/${locale}/listings?${sp.toString()}`} className={active ? "chip on" : "chip"} style={{ textDecoration: "none" }}>{label}</Link>;
  };
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
      <div className="row gap8 wrap" style={{ marginTop: 14 }}>
        <span className="tag">{ar ? "نوع الصفقة:" : "Deal:"}</span>{DEALS.map((d) => chip(dealLabel(d, locale), "deal", d))}
      </div>
      <div className="row gap8 wrap" style={{ marginTop: 8 }}>{ASSETS.map((a) => chip(assetLabel(a, locale), "asset", a))}</div>
      {activeDistrict && (
        <div className="row gap8 wrap" style={{ marginTop: 8 }}>
          <Link href={`/${locale}/listings${base ? `?${base}` : ""}`} className="chip on" style={{ textDecoration: "none" }}>{(ar ? "الحي: " : "District: ") + activeDistrict.name} ✕</Link>
        </div>
      )}
      <div className="muted" style={{ marginTop: 14, fontSize: 13 }}>{ar ? `${shown.length} عرض موثّق` : `${shown.length} verified ${shown.length === 1 ? "space" : "spaces"}`}</div>
      <div className="lst-split" style={{ marginTop: 18 }}>
      <div>
      {shown.length === 0 ? (
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
