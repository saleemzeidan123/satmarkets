import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel, dealLabel } from "@/lib/labels";
import type { Listing } from "@/lib/types";
import { Photo, Verified, Icon } from "@/components/satkit";

const ASSETS = ["office", "retail", "medical", "showroom", "warehouse", "serviced", "education", "land"];
const DEALS = ["lease", "sale"];

export default async function ListingsPage({ params, searchParams }: { params: { locale: string }; searchParams: { asset?: string; deal?: string; q?: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const sb = getSupabaseServer();
  let listings: Listing[] = [];
  if (sb) {
    let query = sb.from("listings").select("*, districts(name_en,name_ar,city)").eq("status", "published").order("created_at", { ascending: false }).limit(60);
    if (searchParams.asset) query = query.eq("asset_type", searchParams.asset);
    if (searchParams.deal) query = query.eq("deal_type", searchParams.deal);
    const { data } = await query;
    listings = (data as Listing[]) ?? [];
  }
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
          <div className="eyebrow">The exchange</div>
          <h1 className="serif" style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-.02em", margin: "10px 0 0", color: "var(--ink)" }}>Verified spaces in Riyadh</h1>
        </div>
        <Link href={`/${locale}/map`} className="btn ghost" style={{ gap: 7, textDecoration: "none" }}>View on map <Icon.pin size={16} /></Link>
      </div>
      <form method="get" className="search focus" style={{ marginTop: 18, border: "1px solid var(--azure)", boxShadow: "none" }}>
        <span style={{ color: "var(--harbor)" }}><Icon.spark size={18} /></span>
        <input name="q" defaultValue={searchParams.q || ""} placeholder="Describe what you need, e.g. fitted Grade A office in Al Olaya under 1,600, around 300 m²" style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14, color: "var(--ink)", fontFamily: "var(--sans)" }} />
        <button type="submit" className="btn primary">Search</button>
      </form>
      <div className="row gap8 wrap" style={{ marginTop: 14 }}>
        <span className="tag">Deal:</span>{DEALS.map((d) => chip(dealLabel(d, locale), "deal", d))}
      </div>
      <div className="row gap8 wrap" style={{ marginTop: 8 }}>{ASSETS.map((a) => chip(assetLabel(a, locale), "asset", a))}</div>
      <div className="muted" style={{ marginTop: 14, fontSize: 13 }}>{listings.length} verified {listings.length === 1 ? "space" : "spaces"}</div>
      {listings.length === 0 ? (
        <p className="muted" style={{ marginTop: 28 }}>No matching spaces. Try widening your filters.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 18, marginTop: 18 }}>
          {listings.map((l) => {
            const dn = l.districts ? (ar ? l.districts.name_ar : l.districts.name_en) : null;
            const price = l.deal_type === "lease" ? l.asking_rent_sqm : l.sale_price;
            const type = assetLabel(l.asset_type, locale);
            return (
              <Link key={l.id} href={`/${locale}/listings/${l.id}`} className="listing" style={{ textDecoration: "none", color: "inherit" }}>
                <Photo kind={kindFor(l.asset_type)} label={`${type}, ${dn || "Riyadh"}`} h={150} fav badges={[<Verified key="v" />, <span key="t" className="tag" style={{ background: "rgba(255,255,255,.9)" }}>{type}</span>]} />
                <div className="body">
                  <div className="price">{price != null ? Number(price).toLocaleString() : "On request"}<small> {l.deal_type === "lease" ? "SAR/m²·yr" : "SAR"}</small></div>
                  <div className="ttl">{(ar ? l.title_ar : l.title_en) || l.reference_code}</div>
                  <div className="meta"><span>{dn || "Riyadh"}</span><i /><span>{l.area_sqm} m²</span><i /><span>{type}</span></div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
