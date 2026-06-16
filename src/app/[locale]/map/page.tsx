import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/getDictionary";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel } from "@/lib/labels";
import MapExplorer, { type MapBuilding } from "@/components/MapExplorer";

const ASSET_ORDER = ["office","retail","medical","warehouse","showroom","serviced"];

export default async function MapPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const dict = getDictionary(locale);
  const sb = getSupabaseServer();
  let buildings: MapBuilding[] = [];
  if (sb) {
    const { data: bs } = await sb.from("buildings")
      .select("id,name_en,name_ar,district_label,district_label_ar,district_id,asset_type,grade,size_sqm,lat,lng")
      .not("lat","is",null);
    const { data: bands } = await sb.from("rent_index_published").select("district_id,district_label,asset_type,median,band_low,band_high,unit,sufficient");
    const { data: lst } = await sb.from("listings").select("building_id").eq("status","published").not("building_id","is",null);

    const bandMap = new Map<string, { median: number|null; low: number|null; high: number|null; unit: string }>();
    (bands ?? []).forEach((r: any) => { if (r.sufficient) bandMap.set(`${r.district_id ?? r.district_label}|${r.asset_type}`, { median: r.median, low: r.band_low, high: r.band_high, unit: r.unit }); });
    const counts = new Map<string, number>();
    (lst ?? []).forEach((r: any) => counts.set(r.building_id, (counts.get(r.building_id) ?? 0) + 1));

    buildings = (bs ?? []).filter((b: any) => b.lat != null && b.lng != null).map((b: any) => {
      const band = bandMap.get(`${b.district_id ?? b.district_label}|${b.asset_type}`);
      return {
        id: b.id, name: (ar ? b.name_ar : b.name_en) || b.name_en,
        place: (ar ? b.district_label_ar : b.district_label) || "",
        asset: b.asset_type, assetLabel: assetLabel(b.asset_type, locale),
        grade: b.grade || "n_a", size: b.size_sqm,
        lat: Number(b.lat), lng: Number(b.lng),
        band: band?.median ?? null, bandLow: band?.low ?? null, bandHigh: band?.high ?? null, unit: band?.unit ?? null,
        listings: counts.get(b.id) ?? 0,
      };
    });
  }
  const assetLabels: Record<string,string> = {};
  ASSET_ORDER.forEach((a) => assetLabels[a] = assetLabel(a, locale));

  return (
    <section>
      <div className="eyebrow">{ar ? "خريطة الذكاء العقاري" : "Commercial intelligence map"}</div>
      <h1 className="mt-1 font-display text-3xl text-charcoal">{ar ? "مباني الرياض التجارية" : "Riyadh commercial buildings"}</h1>
      <p className="mt-2 max-w-2xl text-[15px] text-charcoal/60">
        {ar ? "كل مبنى عنصر قابل للنقر مع ملف ذكاء: النوع، التصنيف، نطاق الإيجار الموثق، والمساحات المتاحة. مخطط أولي ببيانات تجريبية تُستبدل ببيانات المباني الحقيقية." : "Every building is a clickable object with an intelligence profile: asset class, grade, the verified rent band, and available space. Prototype with seed data, to be replaced by the real building graph."}
      </p>
      <div className="mt-5">
        <MapExplorer
          buildings={buildings}
          locale={locale}
          assetOrder={ASSET_ORDER}
          assetLabels={assetLabels}
          t={{
            all: ar ? "الكل" : "All",
            available: ar ? "قائمة متاحة" : "available",
            viewListings: ar ? "عرض القوائم" : "View listings",
            rentBand: ar ? "نطاق الإيجار" : "Rent band",
            size: dict.ui.area, grade: dict.ui.grade,
            sqm: dict.common.sqm, noData: dict.ui.notEnough,
            results: ar ? "مبنى" : "buildings", close: ar ? "إغلاق" : "Close",
            clusterUnit: ar ? "مبنى" : "buildings",
          }}
        />
      </div>
      <p className="mt-3 text-xs text-charcoal/40">
        {ar ? "إحداثيات تقريبية للعرض الأولي." : "Coordinates are approximate for this prototype view."}
      </p>
    </section>
  );
}
