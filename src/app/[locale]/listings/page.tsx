import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel, dealLabel } from "@/lib/labels";
import type { Listing } from "@/lib/types";
import { Photo, Verified, Icon } from "@/components/satkit";
import LocationSearch from "@/components/LocationSearch";

const ASSETS = ["office", "retail", "medical", "showroom", "warehouse", "serviced", "education", "land"];
const DEALS = ["lease", "sale"];

export default async function ListingsPage({ params, searchParams }: { params: { locale: string }; searchParams: { asset?: string; deal?: string; city?: string; district?: string; q?: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const sb = getSupabaseServer();
  let listings: Listing[] = [];
  let districts: { id: string; name_en: string; name_ar: string; city: string }[] = [];
  let activeCity: string | null = null;
  if (sb) {
    const { data: ds } = await sb.from("districts").select("id,name_en,name_ar,city").order("city").order("name_en");
    districts = (ds as any) ?? [];
    const join = searchParams.city ? "*, districts!inner(name_en,name_ar,city)" : "*, districts(name_en,name_ar,city)";
    let query = sb.from("listings").select(join).eq("status", "published").order("created_at", { ascending: false }).limit(120);
    if (searchParams.asset) query = query.eq("asset_type", searchParams.asset);
    if (searchParams.deal) query = query.eq("deal_type", searchParams.deal);
    if (searchParams.district) query = query.eq("district_id", searchParams.district);
    if (searchParams.city) query = query.eq("districts.city", searchParams.city);
    const { data } = await query;
    listings = (data as unknown as Listing[]) ?? [];
    if (searchParams.district) { const d = districts.find((x) => x.id === searchParams.district); activeCity = d ? d.city : null; }
    else if (searchParams.city) activeCity = searchParams.city;
  }
  const cities = Array.from(new Set(districts.map((d) => d.city)));
  const options = [
    ...cities.map((c) => ({ label: c, href: `/${locale}/listings?city=${encodeURIComponent(c)}`, kind: "city" as const })),
    ...districts.map((d) => ({ label: `${ar ? d.name_ar : d.name_en}, ${d.city}`, href: `/${locale}/listings?district=${d.id}`, kind: "district" as const })),
  ];
  const activeD = searchParams.district ? districts.find((x) => x.id === searchParams.district) : null;
  const initialLoc = activeD ? `${ar ? activeD.name_ar : activeD.name_en}, ${activeD.city}` : (searchParams.city || "");

  const chip = (label: string, key: "asset" | "deal" | "city", val: string) => {
    const active = searchParams[key] === val;
    const sp = new URLSearchParams(searchParams as Record<string, string>);
    if (active) sp.delete(key); else sp.set(key, val);
    if (key === "city") sp.delete("district");
    return <Link key={key + val} href={`/${locale}/listings?${sp.toString()}`} className={active ? "chip on" : "chip"} style={{ textDecoration: "none" }}>{label}</Link>;
  };
  const kindFor = (a: string) => (a === "retail" || a === "showroom" ? "retail" : a === "warehouse" ? "warehouse" : "office");
  const heading = activeCity ? `Verified spaces in ${activeCity}` : "Verified commercial spaces across Saudi Arabia";
  return (
    <div style={{ maxWidth: 1360, margin: "0 auto", padding: "28px 24px 64px", fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <div className="row between wrap" style={{ alignItems: "flex-end", gap: 12 }}>
        <div>
          <div className="eyebrow">The exchange</div>
          <h1 className="serif" style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-.02em", margin: "10px 0 0", color: "var(--ink)" }}>{heading}</h1>
        </div>
        <Link href={`/${locale}/map`} className="btn ghost" style={{ gap: 7, textDecoration: "none" }}>View on map <Icon.pin size={16} /></Link>
      </div>
      <div style={{ marginTop: 18 }}>
        <LocationSearch locale={locale} options={options} initial={initialLoc} />
      </div>
      <div className="row gap8 wrap" style={{ marginTop: 14 }}>
        <span className="tag">Deal:</span>{DEALS.map((d) => chip(dealLabel(d, locale), "deal", d))}
      </div>
      <div className="row gap8 wrap" style={{ marginTop: 8 }}>
        <span className="tag">City:</span>{cities.map((c) => chip(c, "city", c))}
      </div>
      <div className="row gap8 wrap" style={{ marginTop: 8 }}>{ASSETS.map((a) => chip(assetLabel(a, locale), "asset", a))}</div>
      <div className="muted" style={{ marginTop: 14, fontSize: 13 }}>{listings.length} verified {listings.length === 1 ? "space" : "spaces"}{activeCity ? ` in ${activeCity}` : " across the Kingdom"}</div>
      {listings.length === 0 ? (
        <p className="muted" style={{ marginTop: 28 }}>No matching spaces. Try widening your filters.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 18, marginTop: 18 }}>
          {listings.map((l) => {
            const dn = l.districts ? (ar ? l.districts.name_ar : l.districts.name_en) : null;
            const cy = (l.districts as any)?.city || "";
            const loc = [dn, cy].filter(Boolean).join(", ");
            const price = l.deal_type === "lease" ? l.asking_rent_sqm : l.sale_price;
            const type = assetLabel(l.asset_type, locale);
            return (
              <Link key={l.id} href={`/${locale}/listings/${l.id}`} className="listing" style={{ textDecoration: "none", color: "inherit" }}>
                <Photo kind={kindFor(l.asset_type)} label={`${type}, ${loc || cy}`} h={150} fav badges={[<Verified key="v" />, <span key="t" className="tag" style={{ background: "rgba(255,255,255,.9)" }}>{type}</span>]} />
                <div className="body">
                  <div className="price">{price != null ? Number(price).toLocaleString() : "On request"}<small> {l.deal_type === "lease" ? "SAR/m²·yr" : "SAR"}</small></div>
                  <div className="ttl">{(ar ? l.title_ar : l.title_en) || l.reference_code}</div>
                  <div className="meta"><span>{loc || cy}</span><i /><span>{l.area_sqm} m²</span><i /><span>{type}</span></div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
