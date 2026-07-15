import { isLocale } from "@/i18n/config";
import { pageMeta } from "@/lib/meta";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel } from "@/lib/labels";
import type { Listing } from "@/lib/types";
import { photoFor } from "@/lib/photos";
import MarketingHome, { type FeaturedListing, type HeroBand } from "@/components/MarketingHome";
import { getPublishedKpis } from "@/lib/market/published";

export const revalidate = 600;

function idxSegment(asset: string, grade: string | null): string | null {
  if (asset === "office") return grade === "a" || grade === "a_plus" ? "grade_a" : grade === "b" || grade === "c" ? "grade_b" : null;
  if (asset === "medical") return "clinic";
  if (asset === "serviced") return "serviced";
  return null;
}

export function generateMetadata({ params }: { params: { locale: string } }) {
  return pageMeta(params.locale, '', 'SAT Markets | Verified commercial real estate, Saudi Arabia', 'سات ماركتس | مساحات تجارية موثّقة في السعودية', 'The neutral commercial exchange for Riyadh: owner-verified listings, a source-attributed rent index, and AI that never invents a figure.', 'منصة محايدة للعقار التجاري في الرياض: عروض موثّقة من الملّاك، مؤشر إيجارات منسوب إلى مصادره، وذكاء اصطناعي لا يخترع الأرقام.');
}

export default async function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const sb = getSupabaseServer();
  const kpis = await getPublishedKpis();

  let rows: Listing[] = [];
  let listings = 0, districts = 0, buildings = 0, verified = 0;
  const idxBands = new Map<string, { low: number; high: number }>();
  const heroBands: HeroBand[] = [];
  let openReqs: number | null = null, idxSegs: number | null = null;
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
    const { data: bandRows } = await sb.from("rent_index_published").select("district_label, district_label_ar, band_low, band_high, median, period").eq("asset_type", "office").eq("segment", "all").eq("sufficient", true).order("median", { ascending: false });
    for (const r of (bandRows ?? []) as any[]) heroBands.push({ en: r.district_label, ar: r.district_label_ar || r.district_label, low: Number(r.band_low), high: Number(r.band_high), median: Number(r.median), period: r.period });
    const oi = heroBands.findIndex((b) => b.en === "Al Olaya");
    if (oi > -1 && oi < heroBands.length - 1) heroBands.push(heroBands.splice(oi, 1)[0]);
    const { count: rc } = await sb.from("requirements_public").select("*", { count: "exact", head: true });
    openReqs = rc ?? null;
    const { count: sc } = await sb.from("rent_index_published").select("*", { count: "exact", head: true }).eq("sufficient", true);
    idxSegs = sc ?? null;
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

  // Law 3: a stat is either a counted value or it is absent. No invented
  // fallbacks ("60+", "15", "100%") that would read as real market figures
  // when the database is empty or unreachable.
  const stats = {
    listings: listings > 0 ? `${listings}` : null,
    buildings: buildings > 0 ? `${buildings}` : null,
    districts: districts > 0 ? `${districts}` : null,
    verifiedPct: listings > 0 ? `${Math.round((verified / listings) * 100)}%` : null,
  };

  return <MarketingHome kpis={kpis} locale={locale} featured={featured} stats={stats} bands={heroBands} jobs={{ reqs: openReqs, segs: idxSegs }} />;
}
