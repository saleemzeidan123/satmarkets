import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/getDictionary";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel } from "@/lib/labels";
import MapExplorer, { type MapBuilding } from "@/components/MapExplorer";

const ASSET_ORDER = ["office","retail","medical","warehouse","showroom","serviced","education","land","mixed_use","hospitality","gas_station","entertainment","wedding_hall","worker_housing","self_storage"];

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
    <section className="intel-canvas -mx-5 rounded-3xl px-5 py-8 sm:-mx-6 sm:px-8 sm:py-10">
      <a href={`/${locale}/listings`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-charcoal/60 transition hover:text-charcoal">{dict.map.back}</a>
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] intel-gold">{dict.map.eyebrow}</div>
      <h1 className="mt-1 font-display text-3xl text-charcoal sm:text-4xl">{dict.map.title}</h1>
      <p className="mt-2 max-w-2xl text-[15px] intel-muted">
        {dict.map.desc}
      </p>
      <div className="mt-5">
        <MapExplorer
          buildings={buildings}
          locale={locale}
          assetOrder={ASSET_ORDER}
          assetLabels={assetLabels}
          t={{
            all: dict.map.all,
            available: dict.map.available,
            viewListings: dict.map.viewListings,
            rentBand: dict.map.rentBand,
            size: dict.ui.area, grade: dict.ui.grade,
            sqm: dict.common.sqm, noData: dict.ui.notEnough,
            results: dict.map.results, close: dict.map.close,
            clusterUnit: dict.map.clusterUnit,
          }}
        />
      </div>
      <p className="mt-3 text-xs intel-faint">
        {dict.map.footer}
      </p>
    </section>
  );
}
