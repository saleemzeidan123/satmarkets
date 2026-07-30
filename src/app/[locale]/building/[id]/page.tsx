import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
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

export async function generateMetadata({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) return {};
  const loc = (params.locale === "ar" ? "ar" : "en") as "en" | "ar";
  const ar = loc === "ar";
  const dict = getDictionary(loc);
  const b: any = await getBuildingById(params.id);
  if (!b) return { title: dict.building.metaNotFound };
  const name = (ar ? (b.name_ar || b.name_en) : b.name_en) || (dict.building.fallbackName);
  const place = `${ar ? (b.district_label_ar || b.district_label) : b.district_label}${b.city ? (ar ? "، " : ", ") + cityLabel(b.city, loc) : ""}`;
  // An ungraded building has no grade phrase at all, rather than an N/A sitting
  // inside the sentence in both languages.
  const grade = gradePhrase(b.grade, loc);
  const type = assetLabel(b.asset_type, loc);
  const title = fillProse(dict.building.metaTitle, { name, place });
  const description = fillProse(dict.building.metaDesc, { name, type, grade, place });
  return localeMeta(params.locale, `/building/${params.id}`, title, description);
}

export default async function BuildingPage({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale; const ar = locale === "ar";
  const dict = getDictionary(locale);
  const sb = getSupabaseServer();
  if (!sb) notFound();
  const b: any = await getBuildingById(params.id);
  if (!b) notFound();
  const [{ data: units }, { data: rentRows }, { data: briefs }] = await Promise.all([
    sb.from("listings").select("*, districts(name_en, name_ar, city)").eq("building_id", b.id).eq("status", "published").order("created_at", { ascending: false }),
    sb.from("rent_index_published").select("asset_type, unit, band_low, band_high, median, sufficient").eq("district_id", b.district_id).eq("asset_type", b.asset_type),
    sb.from("tenant_briefs").select("id").eq("district_id", b.district_id).eq("asset_type", b.asset_type),
  ]);
  const listings = (units as Listing[]) ?? [];
  const band = (rentRows ?? []).find((r: any) => r.sufficient && r.median != null) as any;
  const demand = (briefs ?? []).length;

  // The register is read here rather than inside the panel so that the geo
  // package stays free of React's request cache and remains unit testable.
  const rights = await getAllSourceRights();
  const mobility = districtMobilityPanel(b.district_id, "public", { rights });

  const name = ar ? (b.name_ar || b.name_en) : b.name_en;
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
      <Link href={`/${locale}/map`} className="text-[13px] text-charcoal/55 hover:text-charcoal">{ar ? "→" : "←"} {T.back}</Link>

      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <div className="relative h-52 sm:h-60">
          <img src={photoFor(b.asset_type, b.id)} alt={name} className="h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(20,24,28,0.80), rgba(20,24,28,0.05))" }} />
          <span className="absolute start-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[11px] text-white backdrop-blur"><span className="live-dot" />{T.profile}</span>
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
            <div className="text-[11px] uppercase tracking-wide text-white/70">{place}</div>
            <h1 className="mt-1 font-display text-3xl text-white sm:text-4xl">{name}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-white/85">
              <span className="rounded-md bg-white/15 px-2 py-1 backdrop-blur">{assetLabel(b.asset_type, locale)}</span>
              {grade && grade !== "N/A" ? <span className="rounded-md bg-white/15 px-2 py-1 backdrop-blur">{T.grade} {grade}</span> : null}
              {b.year_built ? <span className="rounded-md bg-white/15 px-2 py-1 backdrop-blur fig">{b.year_built}</span> : null}
              {b.size_sqm ? <span className="rounded-md bg-white/15 px-2 py-1 backdrop-blur"><span className="fig">{Number(b.size_sqm).toLocaleString()}</span> {dict.common.sqm}</span> : null}
              {b.owner_developer ? <span className="rounded-md bg-white/15 px-2 py-1 backdrop-blur">{b.owner_developer}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          {band ? (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-charcoal/45">{T.rentBand}</div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="fig text-[26px]" style={{ color: GOLD }}>{Math.round(band.median).toLocaleString()}</span>
                <span className="fig text-[12px] text-charcoal/55">{band.band_low ? `${Number(band.band_low).toLocaleString()}–${Number(band.band_high).toLocaleString()} · ` : ""}{T.perYear}</span>
              </div>
              {/* ADV-1. A chip here read "Verified" beside a band drawn from
                  rent_index_published, whose own data_class is synthetic. It now names
                  the source, which is also the attribution owner ruling 2 requires of
                  every Rent Index reference on the platform. */}
              <div className="mt-1 text-[11px] text-charcoal/45">{T.bandSource}</div>
            </div>
          ) : <div className="text-[13px] text-charcoal/45">{T.noBand}</div>}
          <span className="text-[13px] text-charcoal/60"><span className="fig">{listings.length}</span> {T.units}</span>
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

      <SectionLabel n="01" title={T.mobilityTitle} sub="" />
      <div className="mt-3 card p-5">
        <p className="text-[14px] leading-relaxed text-charcoal/70">{T.mobilityBody}</p>
        {mobility.available ? (
          <>
            <div className="mt-3 fig text-[26px]" style={{ color: TEAL }}>{mobility.value}</div>
            <p className="mt-1 text-[11px] text-charcoal/45">
              {T.mobilityK} <span className="fig">{mobility.k}</span> · {T.mobilityPeriod} <span className="fig">{mobility.periodEnd}</span> · {T.mobilityCoverage} <span className="fig">{Math.round(mobility.coverageShare * 100)}%</span>
            </p>
            <p className="mt-1 text-[11px] text-charcoal/45">{mobility.method}</p>
            <p className="mt-1 text-[11px] text-charcoal/45">{mobility.attribution}</p>
          </>
        ) : (
          <p className="mt-3 text-[13px] leading-relaxed text-charcoal/55">{T[mobility.statusKey]}</p>
        )}
        <p className="mt-4 border-t border-line pt-3 text-[12.5px] leading-relaxed text-charcoal/45">{T.mobilityRule}</p>
      </div>

      {/* The subtitle read "Verified" above the whole unit grid, which claimed for
          every card below it whatever the reader took the word to mean. Each card
          states its own verification for itself. */}
      <SectionLabel n="02" title={T.unitsSec} sub="" />
      {listings.length === 0 ? (
        <p className="mt-3 text-[14px] text-charcoal/50">{T.noUnits}</p>
      ) : (
        <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l)=>(<ListingCard key={l.id} listing={l} locale={locale} sqm={dict.common.sqm} ui={dict.ui} />))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-4"><Link href={`/${locale}/area?district=${b.district_id}`} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-signal hover:underline">{T.areaReport} {ar ? "←" : "→"}</Link><Link href={`/${locale}/listings?asset=${b.asset_type}`} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-signal hover:underline">{T.browseUse} {ar ? "←" : "→"}</Link><Link href={`/${locale}/rent-index`} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-signal hover:underline">{T.rentIndexLink} {ar ? "←" : "→"}</Link></div>
      <p className="mt-6 text-xs text-charcoal/40">{T.note}</p>
    </section>
  );
}

function SectionLabel({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (<div className="mt-8 flex items-baseline gap-3 border-b border-line pb-2"><span className="fig text-[12px] text-charcoal">{n}</span><h2 className="font-display text-xl text-charcoal">{title}</h2>{sub ? <span className="text-[11px] uppercase tracking-wide text-charcoal/40">{sub}</span> : null}</div>);
}
function Kpi({ label, value, tone }: { label: string; value: string; tone: "live" | "verified" }) {
  const c = tone === "live" ? TEAL : GOLD;
  return (<div className="card p-3.5"><div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-charcoal/45"><span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: c }} />{label}</div><div className="mt-1 fig text-[20px] tracking-tight" style={{ color: c }}>{value}</div></div>);
}
// ADV-5B. `Card`, `Ring` and `Bar` were deleted with the panels they drew. The
// sample-tag branch of `Card` is not worth keeping against a future need: a tag
// reading "Sample" beside a generated number is what made the old panels look
// disclosed when they were invented.
