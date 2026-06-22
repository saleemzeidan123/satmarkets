import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel } from "@/lib/labels";
import type { Listing } from "@/lib/types";
import { photoFor } from "@/lib/photos";
import MarketingHome, { type FeaturedListing } from "@/components/MarketingHome";

export default async function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const sb = getSupabaseServer();

  let rows: Listing[] = [];
  let listings = 0, districts = 0, buildings = 0;
  if (sb) {
    const { data } = await sb.from("listings").select("*, districts(name_en, name_ar, city)").eq("status", "published").order("created_at", { ascending: false }).limit(4);
    rows = (data as Listing[]) ?? [];
    const { count: lc } = await sb.from("listings").select("*", { count: "exact", head: true }).eq("status", "published");
    listings = lc ?? 0;
    const { count: dc } = await sb.from("districts").select("*", { count: "exact", head: true });
    districts = dc ?? 0;
    const { count: bc } = await sb.from("buildings").select("*", { count: "exact", head: true });
    buildings = bc ?? 0;
  }

  const featured: FeaturedListing[] = rows.map((l) => {
    const dn = l.districts ? (ar ? l.districts.name_ar : l.districts.name_en) : null;
    const price = l.deal_type === "lease" ? l.asking_rent_sqm : l.sale_price;
    const type = assetLabel(l.asset_type, locale);
    return {
      id: l.id,
      price: price != null ? Number(price).toLocaleString() : (ar ? "عند الطلب" : "On request"),
      title: (ar ? l.title_ar : l.title_en) || l.reference_code,
      district: dn || "Riyadh",
      area: `${l.area_sqm} m²`,
      type,
      verified: true,
      ph: `${type}, ${dn || "Riyadh"}`,
      img: photoFor(l.asset_type, l.id),
    };
  });

  const stats = {
    listings: listings > 0 ? `${listings}` : "Verified",
    buildings: buildings > 0 ? `${buildings}+` : "60+",
    districts: districts > 0 ? `${districts}` : "15",
  };

  return <MarketingHome locale={locale} featured={featured} stats={stats} />;
}
