import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/getDictionary";
import { getSupabaseServer } from "@/lib/supabase/server";
import { releaseVisibleInventory } from "@/lib/inventory";
import { assetLabel } from "@/lib/labels";
import MapExplorer, { type MapBuilding } from "@/components/MapExplorer";
import { localeMeta } from "@/lib/meta";
import { quotableRentIndexRows } from "@/lib/market/quotable";
import { entityName } from "@/lib/displayName";

const ASSET_ORDER = ["office","retail","medical","warehouse","showroom","serviced","education","land","mixed_use","hospitality","gas_station","entertainment","wedding_hall","worker_housing","self_storage"];

export function generateMetadata({ params }: { params: { locale: string } }) {
  const m = getDictionary(params.locale === "ar" ? "ar" : "en").map;
  return localeMeta(params.locale, "/map", m.metaTitle, m.metaDesc);
}

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
    // ADV-1E. The select carries what the decision needs, and the decision, not
    // `sufficient`, is what puts a band on the map. A band whose publication
    // rights are unread or withheld is absent from `bandMap`, so the building
    // renders as "no data" rather than as a figure with nothing standing behind
    // it. Codex item 2: it does not reach the browser at all, and the map's
    // GeoJSON properties are a browser payload like any other.
    const { data: bands } = await sb.from("rent_index_published").select("district_id,district_label,district_label_ar,asset_type,segment,period,median,band_low,band_high,unit,sufficient,stat_kind,data_class,is_demo");
    const { data: lst } = await releaseVisibleInventory(sb.from("listings").select("building_id").eq("status","published")).not("building_id","is",null);

    const bandMap = new Map<string, { median: number|null; low: number|null; high: number|null; unit: string; note: string|null }>();
    const quotable = await quotableRentIndexRows((bands ?? []) as any[], locale, (r: any) => (ar ? (r.district_label_ar || r.district_label) : r.district_label) ?? null);
    for (const { row: r, gate } of quotable.rows) {
      bandMap.set(`${(r as any).district_id ?? (r as any).district_label}|${r.asset_type}`, { median: (r as any).median, low: (r as any).band_low, high: (r as any).band_high, unit: (r as any).unit, note: gate.statement });
    }
    const counts = new Map<string, number>();
    (lst ?? []).forEach((r: any) => counts.set(r.building_id, (counts.get(r.building_id) ?? 0) + 1));

    buildings = (bs ?? []).filter((b: any) => b.lat != null && b.lng != null).map((b: any) => {
      const band = bandMap.get(`${b.district_id ?? b.district_label}|${b.asset_type}`);
      return {
        id: b.id, name: entityName(b, ar ? "ar" : "en"),
        place: (ar ? b.district_label_ar : b.district_label) || "",
        asset: b.asset_type, assetLabel: assetLabel(b.asset_type, locale),
        grade: b.grade || "n_a", size: b.size_sqm,
        lat: Number(b.lat), lng: Number(b.lng),
        band: band?.median ?? null, bandLow: band?.low ?? null, bandHigh: band?.high ?? null, unit: band?.unit ?? null,
        bandNote: band?.note ?? null,
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
