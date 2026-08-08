import { isLocale } from "@/i18n/config";
import { localeMeta } from "@/lib/meta";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { releaseVisibleInventory } from "@/lib/inventory";
import { getDictionary } from "@/i18n/getDictionary";
import type { Listing } from "@/lib/types";
import MarketingHome, { type FeaturedListing, type HeroBand } from "@/components/MarketingHome";
import { getPublishedKpis } from "@/lib/market/published";
import { quotableRentIndexRows } from "@/lib/market/quotable";
import { normalizeStatisticKind, statisticLabel } from "@/lib/evidence";
import { CHECK_METHODS } from "@/lib/listingVerification";
import { getLister, type Lister } from "@/lib/queries/listings";

export const revalidate = 600;

function idxSegment(asset: string, grade: string | null): string | null {
  if (asset === "office") return grade === "a" || grade === "a_plus" ? "grade_a" : grade === "b" || grade === "c" ? "grade_b" : null;
  if (asset === "medical") return "clinic";
  if (asset === "serviced") return "serviced";
  return null;
}

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const d = getDictionary(params.locale === "ar" ? "ar" : "en").home;
  return localeMeta(params.locale, "", d.metaTitle, d.metaDesc);
}

export default async function HomePage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const sb = await getSupabaseServer();
  // Slice B, item 8. `dataOk` is the one signal that separates "we asked and
  // there is genuinely nothing published yet" from "we could not reach the
  // database", so Home's async sections can say the true one of those two
  // things instead of rendering the same silent gap for both.
  const dataOk = !!sb;
  const kpis = await getPublishedKpis(locale);

  let rows: Listing[] = [];
  let listings = 0, districts = 0, buildings = 0, verified = 0;
  const idxBands = new Map<string, { low: number; high: number }>();
  const heroBands: HeroBand[] = [];
  let openReqs: number | null = null, idxSegs: number | null = null;
  let idxStatements: readonly string[] = [];
  if (sb) {
    const { data } = await releaseVisibleInventory(sb.from("listings").select("*, districts(name_en, name_ar, city)").eq("status", "published")).order("created_at", { ascending: false }).limit(4);
    rows = (data as Listing[]) ?? [];
    const { count: lc } = await releaseVisibleInventory(sb.from("listings").select("*", { count: "exact", head: true }).eq("status", "published"));
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
    const { count: vc } = await releaseVisibleInventory(sb
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"))
      .eq("ownership_verified", true)
      .eq("is_demo", false)
      .not("verified_by", "is", null)
      .in("verification_method", [...CHECK_METHODS]);
    verified = vc ?? 0;
    const { count: dc } = await sb.from("districts").select("*", { count: "exact", head: true });
    districts = dc ?? 0;
    const { count: bc } = await sb.from("buildings").select("*", { count: "exact", head: true });
    buildings = bc ?? 0;
    // ADV-1E. Three separate reads of this table used to sit here: one for the
    // band a featured card positions its asking rent inside, one for the hero
    // strip, and a head count of sufficient segments. Each asked its own
    // question and none asked whether SAT may publish the answer. They are now
    // one read and one decision, and the hero strip, the card position and the
    // segment count are all derived from the rows that survived it.
    const { data: idxRows } = await sb.from("rent_index_published").select("district_label, district_label_ar, district_id, asset_type, segment, unit, period, band_low, band_high, median, sufficient, stat_kind, data_class, is_demo").order("median", { ascending: false });
    const quotable = await quotableRentIndexRows((idxRows ?? []) as any[], locale, (r: any) => (ar ? (r.district_label_ar || r.district_label) : r.district_label) ?? null);
    idxStatements = quotable.statements;
    const quotedRows = quotable.rows.map((q) => q.row as any);
    for (const r of quotedRows) {
      if (r.band_low == null || r.band_high == null) continue;
      idxBands.set(`${String(r.district_label).toLowerCase()}|${r.asset_type}|${r.segment}`, { low: Number(r.band_low), high: Number(r.band_high) });
    }
    for (const r of quotedRows) {
      if (r.asset_type !== "office" || r.segment !== "all" || r.median == null) continue;
      // PKG-FIG2 closure, finding 130. The band caption used to read "average"
      // from a frozen dictionary string while the figure beside it came from a
      // column named `median`. This select has always carried `stat_kind` and
      // this loop used to drop it. The label is resolved here, on the server,
      // beside the row it describes, so a band cannot travel to the client
      // without the statistic it is. A row whose `stat_kind` is missing
      // resolves to "unknown" and renders as unlabelled rather than as an
      // average; in practice the quote gate has already denied such a row,
      // because `publishability` treats an unlabelled figure as not a figure.
      heroBands.push({ en: r.district_label, ar: r.district_label_ar || r.district_label, low: Number(r.band_low), high: Number(r.band_high), median: Number(r.median), period: r.period, stat: statisticLabel(normalizeStatisticKind(r.stat_kind), ar) });
    }
    // Matches the English district_label stored in rent_index_published, not a
    // label shown to anyone, so it stays a literal.
    const oi = heroBands.findIndex((b) => b.en === /* i18n-exempt */ "Al Olaya");
    if (oi > -1 && oi < heroBands.length - 1) heroBands.push(heroBands.splice(oi, 1)[0]);
    const { count: rc } = await sb.from("requirements_public").select("*", { count: "exact", head: true });
    openReqs = rc ?? null;
    // The tile says how many segments the reader can actually see a figure for,
    // so it counts what survived the decision rather than what the table holds.
    // A count that includes rows nothing on the site will print is a promise the
    // rest of the site does not keep.
    idxSegs = quotedRows.length;
  }

  // PKG-CARD1. This used to flatten every card figure (price, title, district,
  // area, badge text) by hand, which was a second place those figures were
  // computed, beside `ListingCard`'s own. The lease unit under a sale price on
  // this page's own lead card was that duplication catching up with it:
  // nothing here read `deal_type` before choosing a unit, because nothing here
  // dealt in units at all, only in strings someone else had already picked
  // one for. `ListingCard` now reads the row directly; this loop keeps only
  // the one decision that is genuinely this page's, not the card's, which is
  // where a lease listing's rent falls in the published band.
  // Slice B, item 6. Home has no general lister directory to link to (that is
  // PKG-DISCOVERY-1 slice E, not built yet), so the one honest discovery path
  // available today is through a listing that is actually featured here, to
  // the real individual profile route `ListerBadge` already links to on
  // Listing Detail. Only the lead slot carries it, to keep this addition
  // proportionate rather than repeating a byline on every grid card.
  const leadLister: Lister | null = rows[0] ? await getLister(rows[0].account_id) : null;

  const featured: FeaturedListing[] = rows.map((l) => {
    const dnEn = l.districts ? l.districts.name_en : null;
    let indexPosition: FeaturedListing["indexPosition"] = null;
    const seg = idxSegment(l.asset_type, ((l as any).building_grade as string | null) ?? null);
    const rent = (l as any).asking_rent_sqm;
    if (l.deal_type === "lease" && rent != null && dnEn && seg) {
      const band = idxBands.get(`${dnEn.toLowerCase()}|${l.asset_type}|${seg}`);
      if (band && band.high > band.low) {
        const rv = Number(rent);
        const pos = Math.max(0, Math.min(1, (rv - band.low) / (band.high - band.low)));
        indexPosition = { v: rv < band.low ? "below" : rv > band.high ? "above" : "within", pos };
      }
    }
    return { listing: l, indexPosition };
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

  return <MarketingHome kpis={kpis} locale={locale} featured={featured} stats={stats} bands={heroBands} bandNotes={idxStatements} jobs={{ reqs: openReqs, segs: idxSegs }} dataOk={dataOk} leadLister={leadLister} />;
}
