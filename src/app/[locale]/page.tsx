import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel } from "@/lib/labels";
import type { Listing } from "@/lib/types";
import { photoFor } from "@/lib/photos";
import MarketingHome, { type FeaturedListing } from "@/components/MarketingHome";

function idxSegment(asset: string, grade: string | null): string | null {
  if (asset === "office") return grade === "a" || grade === "a_plus" ? "grade_a" : grade === "b" || grade === "c" ? "grade_b" : null;
  if (asset === "medical") return "clinic";
  if (asset === "serviced") return "serviced";
  return null;
}

export default async function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const sb = getSupabaseServer();

  let rows: Listing[] = [];
  let listings = 0, districts = 0, buildings = 0, verified = 0;
  const idxBands = new Map<string, { low: number; high: number }>();
  if (sb) {
    const { data } = await sb.from("listings").select("*, districts(name_en, name_ar, city)").eq("status", "published").order("created_at", { ascending: false }).limit(4);
    rows = (data as Listing[]) ?? [];
    const { count: lc } = await sb.from("listings").select("*", { count: "exact", head: true }).eq("status", "published");
    listings = lc ?? 0;
    const { count: vc } = await sb.from("listings").select("*", { count: "exact", head: true }).eq("status", "published").or("ownership_verified.eq.true,authorization_verified.eq.true,is_sat_listed.eq.true");
    verified = vc ?? 0;
    const { count: dc } = await sb.from("districts").select("*", { count: "exact", head: true });
    districts = dc ?? 0;
    const { count: bc } = await sb.from("buildings").select("*", { count: "exact", head: true });
    buildings = bc ?? 0;
    const { data: idxRows } = await sb.from("rent_index_published").select("district_label, asset_type, segment, band_low, band_high");
    for (const r of (idxRows ?? []) as any[]) idxBands.set(`${String(r.district_label).toLowerCase()}|${r.asset_type}|${r.segment}`, { low: Number(r.band_low), high: Number(r.band_high) });
  }

  const featured: FeaturedListing[] = rows.map((l) => {
    const dn = l.districts ? (ar ? l.districts.name_ar : l.districts.name_en) : null;
    const dnEn = l.districts ? l.districts.name_en : null;
    const price = l.deal_type === "lease" ? l.asking_rent_sqm : l.sale_price;
    const type = assetLabel(l.asset_type, locale);
    let idx: FeaturedListing["idx"] = null;
    const seg = idxSegment(l.asset_type, ((l as any).building_grade as string | null) ?? null);
    const rent = (l as any).asking_rent_sqm;
    if (l.deal_type === "lease" && rent != null && dnEn && seg) {
      const band = idxBands.get(`${dnEn.toLowerCase()}|${l.asset_type}|${seg}`);
      if (band && band.high > band.low) {
        const rv = Number(rent);
        const pos = Math.max(0, Math.min(1, (rv - band.low) / (band.high - band.low)));
        idx = { v: rv < band.low ? "below" : rv > band.high ? "above" : "within", pos };
      }
    }
    return {
      id: l.id,
      price: price != null ? Number(price).toLocaleString() : (ar ? "عند الطلب" : "On request"),
      title: (ar ? l.title_ar : l.title_en) || l.reference_code,
      district: dn || "Riyadh",
      area: `${l.area_sqm} m²`,
      type,
      verified: !!((l as any).ownership_verified || (l as any).authorization_verified || (l as any).is_sat_listed),
      ph: `${type}, ${dn || "Riyadh"}`,
      img: photoFor(l.asset_type, l.id),
      idx,
    };
  });

  const stats = {
    listings: listings > 0 ? `${listings}` : "Verified",
    buildings: buildings > 0 ? `${buildings}+` : "60+",
    districts: districts > 0 ? `${districts}` : "15",
    verifiedPct: listings > 0 ? `${Math.round((verified / listings) * 100)}%` : "100%",
  };

  return <MarketingHome locale={locale} featured={featured} stats={stats} />;
}
