import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { releaseVisibleInventory } from "@/lib/inventory";
import { assetLabel, gradeLabel, gradePhrase, cityLabel } from "@/lib/labels";
import { photoFor } from "@/lib/photos";
import ListingCard from "@/components/ListingCard";
import { getDictionary } from "@/i18n/getDictionary";
import type { Listing } from "@/lib/types";
import JsonLd, { SITE } from "@/components/JsonLd";
import { localeMeta } from "@/lib/meta";
import { fillProse } from "@/lib/format";
import { getBuildingById } from "@/lib/queries/listings";
import { getAllSourceRights } from "@/lib/queries/sourceRights";
import { districtMobilityPanel } from "@/lib/location/panel";
import { quotableRentIndexRows } from "@/lib/market/quotable";
import { entityName } from "@/lib/displayName";
import { netArea } from "@/lib/listingFigures";
import { formatInteger, formatRange, formatUnit } from "@/lib/format";

const TEAL = "#3A6EA5"; const GOLD = "#3A6EA5";

// ADV-5B. A seeded generator used to live here. It took the building id, hashed
// it, and produced a weekly visitor curve, an hourly rhythm, three catchment
// rings, a dwell figure, a daytime index and a spend index, all of which then
// rendered as this building's numbers, three of them in the overview row with no
// sample label at all. It was stable per building, which made it worse: reload
// the page and the same numbers came back, which is exactly how a reader decides
// a figure is measured. That breaches "no invented figures", and the drive-time
// rings additionally asserted a travel-time computation that D27(a) says this
// schema does not hold and is not permitted to cache. It is gone. What replaces
// it is `districtMobilityPanel`, which today returns the reason there is nothing
// to show.

export async function generateMetadata(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  if (!isLocale(params.locale)) return {};
  const loc = (params.locale === "ar" ? "ar" : "en") as "en" | "ar";
  const ar = loc === "ar";
  const dict = getDictionary(loc);
  const b: any = await getBuildingById(params.id);
  if (!b) return { title: dict.building.metaNotFound };
  const name = entityName(b, loc) || dict.building.fallbackName;
  const place = `${ar ? (b.district_label_ar || b.district_label) : b.district_label}${b.city ? (ar ? "، " : ", ") + cityLabel(b.city, loc) : ""}`;
  // An ungraded building has no grade phrase at all, rather than an N/A sitting
  // inside the sentence in both languages.
  const grade = gradePhrase(b.grade, loc);
  const type = assetLabel(b.asset_type, loc);
  const title = fillProse(dict.building.metaTitle, { name, place });
  const description = fillProse(dict.building.metaDesc, { name, type, grade, place });
  return localeMeta(params.locale, `/building/${params.id}`, title, description);
}

export default async function BuildingPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;const ar = locale === "ar";
  const dict = getDictionary(locale);
  const sb = getSupabaseServer();
  if (!sb) notFound();
  const b: any = await getBuildingById(params.id);
  if (!b) notFound();
  const [{ data: units }, { data: rentRows }, { data: briefs }] = await Promise.all([
    releaseVisibleInventory(sb.from("listings").select("*, districts(name_en, name_ar, city)").eq("building_id", b.id).eq("status", "published")).order("created_at", { ascending: false }),
    // ADV-1E. The select carries what the decision needs. `sufficient` alone
    // used to choose this band, and `sufficient` describes a sample size, not a
    // right to publish what the sample produced.
    sb.from("rent_index_published").select("asset_type, unit, band_low, band_high, median, period, segment, sufficient, stat_kind, data_class, is_demo").eq("district_id", b.district_id).eq("asset_type", b.asset_type),
    sb.from("tenant_briefs").select("id").eq("district_id", b.district_id).eq("asset_type", b.asset_type),
  ]);
  const listings = (units as Listing[]) ?? [];
  // The band on a building profile is one figure, so the decision is taken over
  // the rows that could supply it and the first survivor wins. A band whose
  // publication rights are unread or withheld leaves `band` undefined, and the
  // page falls to `T.noBand` rather than printing a number with nothing behind
  // it (Codex item 2: it does not reach the browser at all).
  const quotableBands = await quotableRentIndexRows((rentRows ?? []) as any[], locale, () => (ar ? (b.district_label_ar || b.district_label) : b.district_label) ?? null);
  const quoted = quotableBands.rows.find((q) => (q.row as any).median != null);
  const band = (quoted?.row ?? null) as any;
  const bandStatement = quoted?.gate.statement ?? null;
  const demand = (briefs ?? []).length;

  // The register is read here rather than inside the panel so that the geo
  // package stays free of React's request cache and remains unit testable.
  const rights = await getAllSourceRights();
  const mobility = districtMobilityPanel(b.district_id, "public", { rights });

  const name = entityName(b, ar ? "ar" : "en");
  const place = `${ar ? (b.district_label_ar || b.district_label) : b.district_label}${b.city ? "، " + cityLabel(b.city, locale) : ""}`;
  const grade = gradeLabel(b.grade, locale);

  const T = dict.building;

  return (
    <section>
      <JsonLd data={{ "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: dict.building.crumbHome, item: `${SITE}/${locale}` },
        { "@type": "ListItem", position: 2, name: dict.building.crumbListings, item: `${SITE}/${locale}/listings` },
        ...(b.district_id ? [{ "@type": "ListItem", position: 3, name: ar ? (b.district_label_ar || b.district_label) : b.district_label, item: `${SITE}/${locale}/listings?district=${b.district_id}` }] : []),
        { "@type": "ListItem", position: b.district_id ? 4 : 3, name, item: `${SITE}/${locale}/building/${b.id}` },
      ] }} />
      <Link href={`/${locale}/map`} className="text-[0.8125rem] text-charcoal/65 hover:text-charcoal">{ar ? "→" : "←"} {T.back}</Link>

      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <div className="relative h-52 sm:h-60">
          <img src={photoFor(b.asset_type, b.id)} alt={name} className="h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(20,24,28,0.80), rgba(20,24,28,0.05))" }} />
          <span className="absolute start-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[0.6875rem] text-white backdrop-blur"><span className="live-dot" />{T.profile}</span>
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
            <div className="text-[0.6875rem] uppercase tracking-wide text-white/70">{place}</div>
            <h1 className="mt-1 font-display text-3xl text-white sm:text-4xl">{name}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-[0.75rem] text-white/85">
              <span className="rounded-md bg-white/15 px-2 py-1 backdrop-blur">{assetLabel(b.asset_type, locale)}</span>
              {grade && grade !== "N/A" ? <span className="rounded-md bg-white/15 px-2 py-1 backdrop-blur">{T.grade} {grade}</span> : null}
              {b.year_built ? <span className="rounded-md bg-white/15 px-2 py-1 backdrop-blur fig">{b.year_built}</span> : null}
              {b.size_sqm ? <span className="rounded-md bg-white/15 px-2 py-1 backdrop-blur"><bdi>{netArea(b.size_sqm, locale)}</bdi></span> : null}
              {b.owner_developer ? <span className="rounded-md bg-white/15 px-2 py-1 backdrop-blur">{b.owner_developer}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          {band ? (
            <div>
              <div className="text-[0.625rem] uppercase tracking-wide text-charcoal/65">{T.rentBand}</div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="fig text-[1.625rem]" style={{ color: GOLD }}>{formatInteger(Math.round(band.median), locale)}</span>
                <span className="fig text-[0.75rem] text-charcoal/65">{/* PKG-FIG1, findings 125 and 127. A bare `toLocaleString()` resolves the
                    runtime default rather than the page; a stated low with an absent high
                    printed "1,800-0"; and the separator was spelled here rather than read
                    from `formatRange`, which is the only place that knows Arabic takes
                    إلى between two figures. Both ends are required before either is shown. */}
                {band.band_low != null && band.band_high != null ? `${formatRange(Number(band.band_low), Number(band.band_high), locale, 0)} · ` : ""}{formatUnit("sar_sqm_year", locale, "short")}</span>
              </div>
              {/* ADV-1. A chip here read "Verified" beside a band drawn from
                  rent_index_published, whose own data_class is synthetic. It now names
                  the source, which is also the attribution owner ruling 2 requires of
                  every Rent Index reference on the platform. */}
              <div className="mt-1 text-[0.6875rem] text-charcoal/65">{T.bandSource}</div>
              {/* The sentence sits with the figure, not in a footer, because a
                  reader who sees the number and not the sentence has been told
                  something untrue about it. */}
              {bandStatement ? <div className="mt-1 text-[0.6875rem] leading-snug text-charcoal/65">{bandStatement}</div> : null}
            </div>
          ) : <div className="text-[0.8125rem] text-charcoal/65">{T.noBand}</div>}
          <span className="text-[0.8125rem] text-charcoal/70"><span className="fig">{listings.length}</span> {T.units}</span>
        </div>
      </div>

      <SectionLabel n="00" title={T.overview} sub="" />
      {/* Three of the six tiles here were generated numbers carrying tone="live",
          which rendered them in the same colour as the counted ones. The row now
          holds only what the record actually says. */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        <Kpi label={T.units} value={`${listings.length}`} tone="verified" />
        <Kpi label={T.grade} value={grade && grade !== "N/A" ? grade : "N/A"} tone="verified" />
        <Kpi label={T.demand} value={`${demand}`} tone="verified" />
      </div>

      {/* ADV-5B, finding 75. The muted tiers on this panel are set at
          charcoal/60 rather than the platform's habitual /45 and /55. Those two
          composite to 2.93:1 and 3.96:1 on white, both below WCAG AA for normal
          text, and this is the one panel on the page where the muted text IS the
          content: the status line is the only thing telling a reader why there is
          no figure, and the rule paragraph is the publication rule itself. A
          footnote nobody can read is a footnote. An explanation nobody can read
          is an absence. /60 measures 4.69:1. The wider pattern is finding 75 and
          belongs to the parked visual-quality package, not to a claims package. */}
      <SectionLabel n="01" title={T.mobilityTitle} sub="" />
      <div className="mt-3 card p-5">
        <p className="text-[0.875rem] leading-relaxed text-charcoal/70">{T.mobilityBody}</p>
        {mobility.available ? (
          <>
            <div className="mt-3 fig text-[1.625rem]" style={{ color: TEAL }}>{mobility.value}</div>
            <p className="mt-1 text-[0.6875rem] text-charcoal/70">
              {T.mobilityK} <span className="fig">{mobility.k}</span> · {T.mobilityPeriod} <span className="fig">{mobility.periodEnd}</span> · {T.mobilityCoverage} <span className="fig">{Math.round(mobility.coverageShare * 100)}%</span>
            </p>
            <p className="mt-1 text-[0.6875rem] text-charcoal/70">{mobility.method}</p>
            <p className="mt-1 text-[0.6875rem] text-charcoal/70">{mobility.attribution}</p>
          </>
        ) : (
          <p className="mt-3 text-[0.8125rem] leading-relaxed text-charcoal/70">{T[mobility.statusKey]}</p>
        )}
        <p className="mt-4 border-t border-line pt-3 text-[0.78125rem] leading-relaxed text-charcoal/70">{T.mobilityRule}</p>
      </div>

      {/* The subtitle read "Verified" above the whole unit grid, which claimed for
          every card below it whatever the reader took the word to mean. Each card
          states its own verification for itself. */}
      <SectionLabel n="02" title={T.unitsSec} sub="" />
      {listings.length === 0 ? (
        <p className="mt-3 text-[0.875rem] text-charcoal/65">{T.noUnits}</p>
      ) : (
        <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l)=>(<ListingCard key={l.id} listing={l} locale={locale} ui={dict.ui} />))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-4"><Link href={`/${locale}/area?district=${b.district_id}`} className="inline-flex items-center gap-1 text-[0.78125rem] font-medium text-signal hover:underline">{T.areaReport} {ar ? "←" : "→"}</Link><Link href={`/${locale}/listings?asset=${b.asset_type}`} className="inline-flex items-center gap-1 text-[0.78125rem] font-medium text-signal hover:underline">{T.browseUse} {ar ? "←" : "→"}</Link><Link href={`/${locale}/rent-index`} className="inline-flex items-center gap-1 text-[0.78125rem] font-medium text-signal hover:underline">{T.rentIndexLink} {ar ? "←" : "→"}</Link></div>
      <p className="mt-6 text-xs text-charcoal/65">{T.note}</p>
    </section>
  );
}

function SectionLabel({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (<div className="mt-8 flex items-baseline gap-3 border-b border-line pb-2"><span className="fig text-[0.75rem] text-charcoal">{n}</span><h2 className="font-display text-xl text-charcoal">{title}</h2>{sub ? <span className="text-[0.6875rem] uppercase tracking-wide text-charcoal/65">{sub}</span> : null}</div>);
}
function Kpi({ label, value, tone }: { label: string; value: string; tone: "live" | "verified" }) {
  const c = tone === "live" ? TEAL : GOLD;
  return (<div className="card p-3.5"><div className="flex items-center gap-1.5 text-[0.625rem] uppercase tracking-wide text-charcoal/65"><span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: c }} />{label}</div><div className="mt-1 fig text-[1.25rem] tracking-tight" style={{ color: c }}>{value}</div></div>);
}
// ADV-5B. `Card`, `Ring` and `Bar` were deleted with the panels they drew. The
// sample-tag branch of `Card` is not worth keeping against a future need: a tag
// reading "Sample" beside a generated number is what made the old panels look
// disclosed when they were invented.
