import { isLocale } from "@/i18n/config";
import { localeMeta } from "@/lib/meta";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getDictionary } from "@/i18n/getDictionary";
import { assetLabel, cityLabel } from "@/lib/labels";
import { listingTitle } from "@/lib/listingTitle";
import { formatArea, formatNumber } from "@/lib/format";
import type { Listing } from "@/lib/types";
import { photoFor } from "@/lib/photos";
import MarketingHome, { type FeaturedListing, type HeroBand } from "@/components/MarketingHome";
import { getPublishedKpis } from "@/lib/market/published";
import { CHECK_METHODS, listingVerifiedDimensions, verifiedBadgeText } from "@/lib/listingVerification";

export const revalidate = 600;

function idxSegment(asset: string, grade: string | null): string | null {
  if (asset === "office") return grade === "a" || grade === "a_plus" ? "grade_a" : grade === "b" || grade === "c" ? "grade_b" : null;
  if (asset === "medical") return "clinic";
  if (asset === "serviced") return "serviced";
  return null;
}

export function generateMetadata({ params }: { params: { locale: string } }) {
  const d = getDictionary(params.locale === "ar" ? "ar" : "en").home;
  return localeMeta(params.locale, "", d.metaTitle, d.metaDesc);
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
    // C4. This counted three different things and called all of them owner-verified:
    // a checked owner, a broker's authorisation to market, and the row simply being
    // our own stock. src/lib/gate.ts is the truth source and says the first of those
    // is the only one that carries the claim, so the KPI now counts exactly what its
    // label says. Guarded by src/lib/claims.test.ts.
    // ADV-1. C4 made this count the right FIELD; it still counted the wrong thing,
    // because the field is set on all 88 published rows and none of them has been
    // checked by anyone. The count is now the same four-part chain the badge is
    // resolved from, so the number on the home page and the badge on the card can
    // never disagree. It reads zero today, which is the true answer and is why the
    // tile drops out below rather than publishing a rate.
    const { count: vc } = await sb
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .eq("ownership_verified", true)
      .eq("is_demo", false)
      .not("verified_by", "is", null)
      .in("verification_method", [...CHECK_METHODS]);
    verified = vc ?? 0;
    const { count: dc } = await sb.from("districts").select("*", { count: "exact", head: true });
    districts = dc ?? 0;
    const { count: bc } = await sb.from("buildings").select("*", { count: "exact", head: true });
    buildings = bc ?? 0;
    const { data: idxRows } = await sb.from("rent_index_published").select("district_label, asset_type, segment, band_low, band_high");
    for (const r of (idxRows ?? []) as any[]) idxBands.set(`${String(r.district_label).toLowerCase()}|${r.asset_type}|${r.segment}`, { low: Number(r.band_low), high: Number(r.band_high) });
    const { data: bandRows } = await sb.from("rent_index_published").select("district_label, district_label_ar, band_low, band_high, median, period").eq("asset_type", "office").eq("segment", "all").eq("sufficient", true).order("median", { ascending: false });
    for (const r of (bandRows ?? []) as any[]) heroBands.push({ en: r.district_label, ar: r.district_label_ar || r.district_label, low: Number(r.band_low), high: Number(r.band_high), median: Number(r.median), period: r.period });
    // Matches the English district_label stored in rent_index_published, not a
    // label shown to anyone, so it stays a literal.
    const oi = heroBands.findIndex((b) => b.en === /* i18n-exempt */ "Al Olaya");
    if (oi > -1 && oi < heroBands.length - 1) heroBands.push(heroBands.splice(oi, 1)[0]);
    const { count: rc } = await sb.from("requirements_public").select("*", { count: "exact", head: true });
    openReqs = rc ?? null;
    const { count: sc } = await sb.from("rent_index_published").select("*", { count: "exact", head: true }).eq("sufficient", true);
    idxSegs = sc ?? null;
  }

  const h = getDictionary(locale).home;
  // The card fell back to the Latin string "Riyadh" in both languages and wrote
  // the area as "300 m²" in both. The city name is controlled vocabulary and the
  // area is a unit, so both now come from the shared formatters.
  const city = cityLabel("Riyadh", locale);
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
      price: price != null ? formatNumber(Number(price), locale) : h.onRequest,
      title: listingTitle(l, ar ? "ar" : "en"),
      district: dn || city,
      area: formatArea(l.area_sqm, locale),
      type,
      // ADV-1. A boolean here produced one badge that stood for four separate
      // checks. The card now carries the badges the record has actually earned,
      // each naming its own gate, which is an empty list on every published row.
      badges: listingVerifiedDimensions(l as any, null).map((d) => verifiedBadgeText(d, ar)),
      ph: `${type}, ${dn || city}`,
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
    // A proportion of nothing is not a proportion. The strip already drops a tile
    // whose count is zero; a verification rate has the same rule, and printing "0%"
    // would state a rate the corpus cannot support in either direction.
    verifiedPct: verified > 0 && listings > 0 ? `${Math.round((verified / listings) * 100)}%` : null,
  };

  return <MarketingHome kpis={kpis} locale={locale} featured={featured} stats={stats} bands={heroBands} jobs={{ reqs: openReqs, segs: idxSegs }} />;
}
