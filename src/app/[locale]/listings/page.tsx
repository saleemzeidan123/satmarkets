import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { releaseVisibleInventory } from "@/lib/inventory";
import { assetLabel, dealLabel, cityLabel, cityKey, gradeLabel, gradePhrase, fitoutLabel, segmentLabel } from "@/lib/labels";
import { listingTitle } from "@/lib/listingTitle";
// Discovery search. Deterministic, no model: the box has promised to understand a
// stated requirement since the day it shipped, and until now it did nothing at all.
import { parseQuery, dropKeys, matchesQuery, type QueryVocab } from "@/lib/search/queryParse";
// PKG-E1-READINESS slice C, WS16. Every rule about what this page's URL means
// lives in one module now, and this page is its first caller. The four defects
// it exists to kill are recorded in its header.
import {
  bboxParam, canonicalCity, canonicalListingsPath, canonicalListingsQuery, dealParam,
  knownValue, locationLabel, measureParam, safePlace, sortParam,
} from "@/lib/search/canonical";
import type { Listing } from "@/lib/types";
import { Icon } from "@/components/satkit";
import ListingCard from "@/components/ListingCard";
import ScrollRegion from "@/components/ScrollRegion";
import type { DistrictBubble, ExactPin } from "@/components/ListingsMap";
// maplibre-gl is ~800KB and the map is below the fold on mobile. Statically importing
// it put the whole thing (plus its CSS) in the initial bundle for /listings and blocked
// hydration. It still loads on the client, after paint, behind the same skeleton;
// Next.js 16 requires that deferral to live inside a Client Component, so it moved into
// ListingsMapDeferred, which explains itself there.
import ListingsMap from "@/components/ListingsMapDeferred";

export const revalidate = 300;
import SaveSearch from "@/components/SaveSearch";
import DataState from "@/components/DataState";
import FilterBar, { type LocOpt } from "@/components/FilterBar";
import { coveredFacetFields, matchesAssetFacets } from "@/lib/facets";
import { fieldLabel } from "@/lib/fieldLabel";
import { pickIndexRow, type IndexRow } from "@/lib/market/verdict";
import { decidedRentIndexRows, quotableRentIndexRows } from "@/lib/market/quotable";
import { askingPrice } from "@/lib/listingFigures";
// A listing being SAT's own stock is not a verification of anything. It used to
// light the "Verified owner" badge all by itself, which handed our own inventory a
// trust mark it had not earned, on the platform that publishes /neutrality.
// ADV-1: the badge now names its own gate and no longer reads a single boolean.
import { CHECK_METHODS } from "@/lib/listingVerification";
import JsonLd, { SITE } from "@/components/JsonLd";
import { localeMeta } from "@/lib/meta";
import { fill, formatArea, formatCounted, formatInteger, formatNumber, formatRange, formatUnit } from "@/lib/format";
// PKG-FIG2 closure, finding 132. The index cut's two figure headings, read
// off the rows under them.
import { figureCellOf, statUnitHeading, withUnit } from "@/lib/market/columnHeading";
import { getDictionary } from "@/i18n/getDictionary";
import { placeName } from "@/lib/displayName";

const ASSETS = ["office", "retail", "medical", "showroom", "warehouse", "serviced", "education", "land", "mixed_use", "hospitality", "gas_station", "entertainment", "wedding_hall", "worker_housing", "self_storage"];
const GRADES = ["a_plus", "a", "b", "c"];

// ADV-1. The verified filter expressed as a query, in the same four parts the
// badge is resolved from: the flag is set, the record is not a fixture, the
// method names a real check rather than the loader that inserted the row, and an
// actor signed it. Anything looser and the chip returns rows the card cannot
// badge, which is the disagreement C4 was meant to end.
function verifiedOnly<T>(q: T): T {
  return (q as any)
    .eq("ownership_verified", true)
    .eq("is_demo", false)
    .not("verified_by", "is", null)
    .in("verification_method", [...CHECK_METHODS]) as T;
}
const FITS = ["shell_and_core", "warm_shell", "fitted", "furnished"];

type SP = { asset?: string; deal?: string; q?: string; qx?: string; district?: string; city?: string; place?: string; view?: string; smin?: string; smax?: string; sz?: string; pmin?: string; pmax?: string; rt?: string; spmin?: string; spmax?: string; sp?: string; grade?: string; fit?: string; verified?: string; sort?: string; bbox?: string };

export async function generateMetadata(props: { params: Promise<{ locale: string }>; searchParams: Promise<SP> }) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const loc = (params.locale === "ar" ? "ar" : "en") as "en" | "ar";
  const dl = getDictionary(loc).listings;
  const ar = loc === "ar";
  // Slice C, WS16. Everything below is read from the URL, and the head of a public
  // page is the one place where a value read from the URL is also a claim. Until
  // this slice `?deal=banana` put "banana" in the title, the description and the
  // Open Graph card, because `dealLabel` ends `?? t`; `?place=<anything>` did the
  // same and also became the third BreadcrumbList entry. Nothing was injected,
  // React and Next escape all of it. The page was simply asserting something about
  // a thing it had never heard of, which is the same fault as an unattributed
  // figure. Every parameter now has to be recognised before it can be printed.
  let locLabel = "";
  if (searchParams.district) {
    const sb = await getSupabaseServer();
    // `kind` joins the read because a development is not a district and the title
    // is one of the four surfaces that used to name one as if it were.
    if (sb) { const { data } = await sb.from("districts").select("name_en,name_ar,city,kind").eq("id", searchParams.district).single(); if (data) locLabel = locationLabel(placeName(data, loc), (data as { kind?: string }).kind, dl.project); }
  } else {
    // An unrecognised city is not a city, so it falls through to the place axis
    // exactly as the canonical URL does. The two must agree or the head declares
    // a canonical URL for a page whose title names something else.
    const place = safePlace(searchParams.place);
    const city = canonicalCity(searchParams.city);
    if (place) locLabel = place;
    else if (city) locLabel = cityLabel(city, loc);
  }
  const assetValue = searchParams.asset && !searchParams.asset.includes(",") ? knownValue(searchParams.asset, ASSETS) : null;
  const dealValue = dealParam(searchParams.deal);
  const asset = assetValue ? assetLabel(assetValue, loc) : "";
  const deal = dealValue ? dealLabel(dealValue, loc) : "";
  const what = [asset, deal].filter(Boolean).join(" ").trim();
  const title = locLabel
    ? fill(dl.metaTitleIn, { what: what || dl.metaWhatFallback, place: locLabel })
    : dl.metaTitle;
  const description = locLabel
    ? fill(dl.metaDescIn, { place: locLabel })
    : dl.metaDesc;
  return localeMeta(params.locale, canonicalListingsPath(searchParams), title, description);
}

export default async function ListingsPage(props: { params: Promise<{ locale: string }>; searchParams: Promise<SP> }) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const dict = getDictionary(locale as "en" | "ar");
  // The page used to carry a private t(en, ar) helper, which is how roughly two
  // dozen visible strings came to live in this file instead of the dictionaries,
  // with a second grade vocabulary and a second sort vocabulary among them.
  const dl = dict.listings;
  const list = (k?: string) => (k ? k.split(",").filter(Boolean) : []);
  const sb = await getSupabaseServer();
  let listings: Listing[] = [];
  let bubbles: DistrictBubble[] = [];
  let pins: ExactPin[] = [];
  const coordByListing = new Map<string, { lat: number; lng: number }>();
  let locations: LocOpt[] = [];
  const idxByDistrict = new Map<string, IndexRow[]>();
  const assetCounts: Record<string, number> = {}, gradeCounts: Record<string, number> = {}, fitCounts: Record<string, number> = {};
  // Slice C, WS16. Read once, here, and used by both the result query and the facet
  // count below. `Number("abc")` is NaN, `NaN != null` is true, and the two queries
  // were sending `gte("area_sqm", NaN)` to PostgREST while the page went on to sort
  // by a comparator that returned NaN for every pair. A parameter that is not a
  // number is now not a bound, which leaves the reader with the results they would
  // have had if they had not typed it, rather than a page that failed silently.
  const nSmin = measureParam(searchParams.smin), nSmax = measureParam(searchParams.smax);
  const nPmin = measureParam(searchParams.pmin), nPmax = measureParam(searchParams.pmax);
  const nSpmin = measureParam(searchParams.spmin), nSpmax = measureParam(searchParams.spmax);
  if (sb) {
    let query = releaseVisibleInventory(sb.from("listings").select("*, districts(name_en,name_ar,city)").eq("status", "published")).limit(300);
    const assetArr = list(searchParams.asset);
    if (assetArr.length) query = query.in("asset_type", assetArr);
    // The deal value is deliberately NOT narrowed to the two the platform knows.
    // `eq("deal_type", "banana")` returning nothing is the true answer; dropping
    // the constraint would return every listing, which is the widening half of the
    // fault src/lib/search/place.ts records. Only the LABEL is gated, in the head.
    if (searchParams.deal) query = query.eq("deal_type", searchParams.deal);
    if (nSmin != null) query = query.gte("area_sqm", nSmin);
    if (nSmax != null) query = query.lte("area_sqm", nSmax);
    if (searchParams.deal !== "sale") {
      if (nPmin != null) query = query.gte("asking_rent_sqm", nPmin);
      if (nPmax != null) query = query.lte("asking_rent_sqm", nPmax);
    } else {
      if (nSpmin != null) query = query.gte("sale_price", nSpmin);
      if (nSpmax != null) query = query.lte("sale_price", nSpmax);
    }
    const gradeArr = list(searchParams.grade);
    if (gradeArr.length) query = query.in("building_grade", gradeArr);
    const fitArr = list(searchParams.fit);
    if (fitArr.length) query = query.in("fitout_condition", fitArr);
    // C4, then ADV-1. The chip and the badge have to agree, or a reader ticks
    // "verified" and receives rows carrying nothing. The badge is now the four-part
    // chain in src/lib/listingVerification.ts, so the filter is the same chain
    // expressed as a query: the flag, a real record, a method that names a check and
    // an actor who signed it. It returns nothing today, which is the true answer.
    if (searchParams.verified) query = verifiedOnly(query);
    const { data } = await query.order("created_at", { ascending: false });
    listings = (data as Listing[]) ?? [];
    // Booking-style per-option counts: same filters minus the multi-select facets themselves.
    let fq = releaseVisibleInventory(sb.from("listings").select("asset_type,building_grade,fitout_condition").eq("status", "published")).limit(400);
    if (searchParams.deal) fq = fq.eq("deal_type", searchParams.deal);
    if (nSmin != null) fq = fq.gte("area_sqm", nSmin);
    if (nSmax != null) fq = fq.lte("area_sqm", nSmax);
    if (searchParams.deal !== "sale") { if (nPmin != null) fq = fq.gte("asking_rent_sqm", nPmin); if (nPmax != null) fq = fq.lte("asking_rent_sqm", nPmax); }
    else { if (nSpmin != null) fq = fq.gte("sale_price", nSpmin); if (nSpmax != null) fq = fq.lte("sale_price", nSpmax); }
    // Same predicate as the result query above, for the same reason: a facet count
    // that disagrees with the list it describes is its own small false claim.
    if (searchParams.verified) fq = verifiedOnly(fq);
    const { data: fdata } = await fq;
    (fdata ?? []).forEach((r: any) => { if (r.asset_type) assetCounts[r.asset_type] = (assetCounts[r.asset_type] || 0) + 1; if (r.building_grade) gradeCounts[r.building_grade] = (gradeCounts[r.building_grade] || 0) + 1; if (r.fitout_condition) fitCounts[r.fitout_condition] = (fitCounts[r.fitout_condition] || 0) + 1; });
    const { data: geo } = await sb.from("districts_geo").select("id,name_en,name_ar,lat,lng,kind");
    const { data: allLocs } = await sb.from("districts").select("id,city,name_en,name_ar,kind");
    // ADV-1E. This map feeds `marketVerdict` on every card in the result list,
    // and that verdict is the third-party figure restated as a percentage. A row
    // the gate withholds never enters the map, so the card says nothing about
    // market position rather than saying it from a figure SAT may not publish.
    const { data: irows } = await sb.from("rent_index_published").select("district_id,asset_type,segment,unit,band_low,median,band_high,period,sufficient,stat_kind,data_class,is_demo").eq("sufficient", true);
    const quotableIdx = await quotableRentIndexRows((irows ?? []) as any[], locale);
    quotableIdx.rows.forEach(({ row }) => { const r: any = row; const arr = idxByDistrict.get(r.district_id) ?? []; arr.push(r as IndexRow); idxByDistrict.set(r.district_id, arr); });
    const counts = new Map<string, number>();
    listings.forEach((l: any) => { if (l.district_id) counts.set(l.district_id, (counts.get(l.district_id) ?? 0) + 1); });
    // PKG-NM1. `districts_geo` carries no city, so the city comes from the
    // districts read just above: a bubble whose name is missing in the
    // reader's language widens to its city rather than printing the other
    // language's name on the map.
    const gcity = new Map((allLocs ?? []).map((d: any) => [d.id, d.city]));
    bubbles = (geo ?? []).filter((g: any) => counts.get(g.id)).map((g: any) => ({ id: g.id, name: placeName({ ...g, city: gcity.get(g.id) }, ar ? "ar" : "en") + (g.kind === "development" ? " · " + dl.project : ""), lat: Number(g.lat), lng: Number(g.lng), count: counts.get(g.id) as number }));
    locations = (allLocs ?? []).map((d: any) => ({ id: d.id, city: d.city || "Other", kind: d.kind || "district", en: d.name_en, ar: d.name_ar, count: counts.get(d.id) ?? 0 }));
    const bids = Array.from(new Set(listings.map((l: any) => l.building_id).filter(Boolean)));
    if (bids.length) {
      const { data: bs } = await sb.from("buildings").select("id,lat,lng").in("id", bids).not("lat", "is", null);
      const bmap = new Map((bs ?? []).map((b: any) => [b.id, b]));
      pins = listings.filter((l: any) => bmap.get(l.building_id)).map((l: any) => { const b: any = bmap.get(l.building_id); coordByListing.set(l.id, { lat: Number(b.lat), lng: Number(b.lng) }); return { id: l.id, title: listingTitle(l, ar ? "ar" : "en"), lat: Number(b.lat), lng: Number(b.lng), price: askingPrice(l.deal_type === "sale" ? l.sale_price : l.asking_rent_sqm, l.deal_type, locale) ?? "" }; });
    }
  }

  const cityTotals = new Map<string, number>();
  locations.forEach((l) => cityTotals.set(l.city, (cityTotals.get(l.city) ?? 0) + l.count));
  const cities = Array.from(new Set(locations.map((l) => l.city)))
    .sort((a, b) => (b === "Riyadh" ? 1 : 0) - (a === "Riyadh" ? 1 : 0) || (cityTotals.get(b) ?? 0) - (cityTotals.get(a) ?? 0))
    .map((k) => ({ key: k, label: cityLabel(k, locale) }));

  // The city parameter is a slug in every link a person is likely to type or share,
  // and the column stores "Riyadh". Comparing them raw returned an empty page for
  // ?city=riyadh while the heading printed the slug back (owner ruling 5).
  const cityParam = searchParams.city ? (canonicalCity(searchParams.city) ?? searchParams.city) : null;
  const cityIds = new Set(cityParam ? locations.filter((l) => l.city === cityParam).map((l) => l.id) : []);
  const placeIds = searchParams.place ? new Set(locations.filter((l) => l.en.toLowerCase() === searchParams.place!.toLowerCase() || (l.ar || "") === searchParams.place).map((l) => l.id)) : null;
  let shown = listings.slice();
  if (searchParams.district) shown = shown.filter((l: any) => l.district_id === searchParams.district);
  else if (placeIds) shown = placeIds.size ? shown.filter((l: any) => l.district_id && placeIds.has(l.district_id)) : [];
  else if (searchParams.city) shown = shown.filter((l: any) => l.district_id && cityIds.has(l.district_id));
  // The bbox was the one parameter this page already validated, and its guard is the
  // pattern every other numeric parameter now follows. It moved into the module so
  // that the rule is stated once rather than restated wherever a viewport is read.
  const bbox = bboxParam(searchParams.bbox);
  if (bbox) { const [w, so, e, no] = bbox; shown = shown.filter((l: any) => { const c = coordByListing.get(l.id); return !!c && c.lng >= w && c.lng <= e && c.lat >= so && c.lat <= no; }); }

  // ------------------------------------------------------------- the search
  // The vocabulary handed to the parser is the vocabulary this page already renders:
  // the same asset, grade, fitout, deal and city tables the filter bar is built from,
  // plus the districts loaded above. Nothing can be understood that is not selectable,
  // which is what keeps the parse explainable back to the person who typed it.
  const qVocab: QueryVocab = {
    assets: ASSETS.map((v) => ({ value: v, en: assetLabel(v, "en"), ar: assetLabel(v, "ar") })),
    grades: GRADES.map((v) => ({ value: v, en: gradeLabel(v, "en"), ar: gradeLabel(v, "ar") })),
    fitouts: FITS.map((v) => ({ value: v, en: fitoutLabel(v, "en"), ar: fitoutLabel(v, "ar") })),
    deals: ["lease", "sale"].map((v) => ({ value: v, en: dealLabel(v, "en"), ar: dealLabel(v, "ar") })),
    cities: Array.from(new Set(locations.map((l) => l.city))).filter((c) => c && c !== "Other")
      .map((v) => ({ value: v, en: cityLabel(v, "en"), ar: cityLabel(v, "ar") })),
    places: locations.map((l) => ({ id: l.id, en: l.en, ar: l.ar || l.en })),
  };
  const parsedFull = searchParams.q && searchParams.q.trim() ? parseQuery(searchParams.q, qVocab) : null;
  const qDropped = list(searchParams.qx);
  const q = parsedFull ? dropKeys(parsedFull, qDropped) : null;
  const qCityIds = q?.city ? new Set(locations.filter((l) => l.city === q.city).map((l) => l.id)) : null;
  if (q && !q.empty) {
    shown = shown.filter((l: any) => matchesQuery(l, q, {
      // Identifying fields only. A description is prose, some of it assembled, and a
      // result nobody can explain from what they typed is worse than no result.
      text: [l.title_en, l.title_ar, l.reference_code, l.districts?.name_en, l.districts?.name_ar, l.districts?.city],
      cityDistrictIds: qCityIds,
    }));
  }

  // Registry-driven per-asset facets, only when exactly one asset type is selected
  // (facets are asset-specific). Coverage-gated over the fetched listings of that
  // asset, so a facet renders only when enough listings actually carry the value:
  // no dead controls (land_use on land, clinic_rooms on medical) until the data
  // backfill lands, and each facet auto-appears once inventory crosses the bar.
  const facetAsset = list(searchParams.asset).length === 1 ? list(searchParams.asset)[0] : null;
  const facets = facetAsset ? coveredFacetFields(facetAsset, listings as any) : [];
  const facetValues: Record<string, string | undefined> = {};
  if (facetAsset) for (const f of facets) facetValues[f.key] = (searchParams as Record<string, string | undefined>)[`f_${f.key}`];
  if (facets.length) shown = shown.filter((l: any) => matchesAssetFacets(l, facetAsset!, facetValues));

  // "around 300 m²" is a preference, not a bound. It orders the results by closeness
  // rather than narrowing them, because inventing a tolerance the person never stated
  // would either hide reasonable spaces or empty the page. An explicit sort still wins.
  //
  // Slice C, WS16. "An explicit sort still wins" was the intention and was not the
  // behaviour. The three proximity sorts below ran BEFORE every `sort === ...`
  // branch, so `?sz=350&sort=rent` ordered by closeness to 350 while the filter bar
  // pill read "Price, low to high", and with no sort parameter at all the pill read
  // "Newest" over a proximity-ordered list. The control was describing an ordering
  // the page was not running, which is a small false statement made on every load.
  //
  // Two changes end it. `explicitSort` is the recognised sort or nothing, and it
  // guards the proximity branches. And the sort that RAN is handed to the filter
  // bar, so the pill names it: `best` reads "Best match", which is an honest name
  // for "nearest to the size you asked for".
  const explicitSort = sortParam(searchParams.sort);
  const qSizeT = !searchParams.sz && !explicitSort && q?.areaTarget != null ? q.areaTarget : null;
  const szT = searchParams.sz ? measureParam(searchParams.sz) : qSizeT;
  const rtT = measureParam(searchParams.rt);
  const spT = measureParam(searchParams.sp);
  const sort = explicitSort || (szT != null || rtT != null || spT != null ? "best" : "new");
  const vScore = (l: any) => { if (l.deal_type !== "lease" || l.asking_rent_sqm == null) return Infinity; const row = pickIndexRow(idxByDistrict.get(l.district_id) ?? [], l.asset_type, (l as any).building_grade); const med = row?.median; return med == null ? Infinity : Number(l.asking_rent_sqm) / Number(med); };
  const priceOf = (l: any) => Number(l.deal_type === "sale" ? (l.sale_price ?? 1e15) : (l.asking_rent_sqm ?? 1e15));
  if (!explicitSort && szT != null) shown.sort((a: any, b: any) => Math.abs((a.area_sqm || 0) - szT) - Math.abs((b.area_sqm || 0) - szT));
  else if (!explicitSort && rtT != null) shown.sort((a: any, b: any) => Math.abs((a.asking_rent_sqm || 0) - rtT) - Math.abs((b.asking_rent_sqm || 0) - rtT));
  else if (!explicitSort && spT != null) shown.sort((a: any, b: any) => Math.abs((a.sale_price || 0) - spT) - Math.abs((b.sale_price || 0) - spT));
  else if (sort === "rent") shown.sort((a: any, b: any) => priceOf(a) - priceOf(b));
  else if (sort === "rent_desc") shown.sort((a: any, b: any) => priceOf(b) - priceOf(a));
  else if (sort === "size") shown.sort((a: any, b: any) => (a.area_sqm || 0) - (b.area_sqm || 0));
  else if (sort === "size_desc") shown.sort((a: any, b: any) => (b.area_sqm || 0) - (a.area_sqm || 0));
  else if (sort === "best") shown.sort((a: any, b: any) => vScore(a) - vScore(b));

  const activeDistrict = searchParams.district ? bubbles.find((b) => b.id === searchParams.district) ?? null : null;

  const fparams: Record<string, string> = {};
  (Object.keys(searchParams) as (keyof SP)[]).forEach((k) => { if (searchParams[k]) fparams[k] = String(searchParams[k]); });

  const baseSp = new URLSearchParams();
  Object.entries(fparams).forEach(([k, v]) => { if (k !== "district" && k !== "place" && k !== "view" && k !== "bbox") baseSp.set(k, v); });
  const base = baseSp.toString();
  const insightsView = searchParams.view === "insights";
  const qsWith = (extra?: Record<string, string>) => {
    const p = new URLSearchParams();
    Object.entries(fparams).forEach(([k, v]) => { if (k !== "view") p.set(k, v); });
    if (extra) Object.entries(extra).forEach(([k, v]) => p.set(k, v));
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  // ------------------------------------------------- the transparency row
  // A search that quietly drops half of what was typed is the same defect class as
  // an unattributed figure: the person cannot tell what the answer is an answer to.
  // Every reading the parser made is shown back, and every one of them can be taken
  // away again by name, through `qx`.
  const qChips: { key: string; label: string }[] = [];
  const qPlaceRows = q?.placeIds?.length ? locations.filter((l) => q.placeIds.includes(l.id)) : [];
  const qPlaceKind = qPlaceRows.length && qPlaceRows.every((l) => l.kind === "development") ? "development" : null;
  if (q) {
    const money = (v: number) =>
      `${formatNumber(v, locale)}${q.deal === "sale" ? ` ${formatUnit("sar", locale, "short")}` : q.deal === "lease" ? ` ${formatUnit("sar_sqm_year", locale, "short")}` : ""}`;
    if (q.asset) qChips.push({ key: "asset", label: assetLabel(q.asset, locale) });
    if (q.deal) qChips.push({ key: "deal", label: dealLabel(q.deal, locale) });
    if (q.grade) qChips.push({ key: "grade", label: gradePhrase(q.grade, locale) });
    if (q.fitout) qChips.push({ key: "fitout", label: fitoutLabel(q.fitout, locale) });
    // Slice C, WS16. The parser resolves a typed place name to the district rows
    // that carry it, and those rows know their kind. A chip is the page telling the
    // reader what it understood, so "KAFD" read out of a sentence has to be marked
    // the same way "KAFD" chosen from the panel is. Marked only when every row the
    // name resolved to is a development: a name shared by a development and a
    // district is not a development, and guessing which one was meant is the class
    // of invention the transparency row exists to prevent.
    if (q.place) qChips.push({ key: "place", label: locationLabel(ar ? q.place.ar : q.place.en, qPlaceKind, dl.project) });
    if (q.city) qChips.push({ key: "city", label: cityLabel(q.city, locale) });
    if (q.priceMin != null) qChips.push({ key: "priceMin", label: fill(dl.qFrom, { v: money(q.priceMin) }) });
    if (q.priceMax != null) qChips.push({ key: "priceMax", label: fill(dl.qUpTo, { v: money(q.priceMax) }) });
    if (q.areaMin != null) qChips.push({ key: "areaMin", label: fill(dl.qFrom, { v: formatArea(q.areaMin, locale) }) });
    if (q.areaMax != null) qChips.push({ key: "areaMax", label: fill(dl.qUpTo, { v: formatArea(q.areaMax, locale) }) });
    if (q.areaTarget != null) qChips.push({ key: "area", label: fill(dl.qAbout, { v: formatArea(q.areaTarget, locale) }) });
    if (q.terms.length) qChips.push({ key: "terms", label: fill(dl.qText, { v: q.terms.join(" ") }) });
  }
  const qxHref = (key: string) => {
    const p = new URLSearchParams();
    Object.entries(fparams).forEach(([k, v]) => { if (k !== "qx") p.set(k, v); });
    p.set("qx", Array.from(new Set([...qDropped, key])).join(","));
    return `/${locale}/listings?${p.toString()}`;
  };
  const qClearHref = (() => {
    const p = new URLSearchParams();
    Object.entries(fparams).forEach(([k, v]) => { if (k !== "q" && k !== "qx") p.set(k, v); });
    const s = p.toString();
    return s ? `/${locale}/listings?${s}` : `/${locale}/listings`;
  })();

  // ADV-1E. The index cut keeps its rows and loses only the figures it may not
  // print, which is why it takes `decidedRentIndexRows` rather than the dropping
  // form: a district vanishing from a comparison is itself a statement about the
  // market. Every figure cell below tests `q.gate.mayShowFigure`, so `sufficient`
  // no longer decides on its own what reaches the browser.
  let idx: Array<{ row: any; gate: { mayShowFigure: boolean } }> = [];
  let idxStatements: readonly string[] = [];
  if (sb && insightsView) {
    let iq = sb.from("rent_index_published").select("district_label, district_label_ar, district_id, asset_type, segment, unit, period, median, band_low, band_high, sufficient, stat_kind, data_class, is_demo, sort_order").order("sort_order", { ascending: true }).limit(20);
    const aArr = list(searchParams.asset);
    if (aArr.length) iq = iq.in("asset_type", aArr);
    if (searchParams.district) iq = iq.eq("district_id", searchParams.district);
    const { data: idata } = await iq;
    const decided = await decidedRentIndexRows((idata ?? []) as any[], locale, (r: any) => (ar ? (r.district_label_ar || r.district_label) : r.district_label) ?? null);
    idx = decided.rows as any;
    idxStatements = decided.statements;
  }
  // PKG-FIG2 closure, finding 132. The heading said "Average SAR/m²" over rows
  // storing `SAR/m2/yr`, so it was wrong about the statistic it never read and
  // wrong about the period it dropped. Both halves now come from the rows.
  const idxCells = idx.map((q) => figureCellOf(q.row));

  const assets = ASSETS.map((a) => ({ value: a, label: assetLabel(a, locale) }));
  const grades = GRADES.map((g) => ({ value: g, label: gradeLabel(g, locale) }));
  const fits = FITS.map((f) => ({ value: f, label: fitoutLabel(f, locale) }));
  const sorts = [
    { value: "new", label: dl.sortNewest },
    { value: "rent", label: dl.sortPriceAsc },
    { value: "rent_desc", label: dl.sortPriceDesc },
    { value: "size", label: dl.sortSizeAsc },
    { value: "size_desc", label: dl.sortSizeDesc },
    { value: "best", label: dl.sortBest },
  ];

  // Slice C, WS16. The name proposed for a saved search is a label like any
  // other, so it passes the same three gates the head does. Before this it read
  // the three parameters exactly as typed, which meant a saved search could be
  // stored under the name of a deal type the platform does not offer or a city
  // it does not cover, and the reader would meet that name again months later
  // with no way to tell it had never meant anything. `activeDistrict.name`
  // already carries the development marker from the bubble it comes from.
  const saveDeal = dealParam(searchParams.deal);
  const savePlace = activeDistrict ? activeDistrict.name : (safePlace(searchParams.place) || (canonicalCity(searchParams.city) ? cityLabel(searchParams.city, locale) : ""));
  const saveLabel = [saveDeal ? dealLabel(saveDeal, locale) : "", savePlace].filter(Boolean).join(" · ") || (dl.allSpaces);

  const distLoc = searchParams.district ? locations.find((l) => l.id === searchParams.district) : null;
  // Slice C, WS16, three corrections on one line.
  //
  // The kind. Selecting KAFD in the filter panel navigates to `?district=<id>`,
  // and the panel that offered it had it under "Developments". The breadcrumb then
  // called it a district by saying nothing, on the platform whose own law is that
  // developments are not districts. It now carries the same marker the map bubble
  // and the panel row carry.
  //
  // The name. `distLoc.ar || distLoc.en` handed an Arabic reader the English name
  // and called it a translation, which is the exact idiom src/lib/displayName.ts
  // exists to end. A district widens to its city instead; it never borrows.
  //
  // The URL. The city query string was assembled here from the parameter as typed, so
  // this breadcrumb entry pointed at a different URL from the one the head declared
  // canonical for the same page. Both now come from the one module.
  const crumbLoc = distLoc ? locationLabel(placeName({ name_en: distLoc.en, name_ar: distLoc.ar, city: distLoc.city }, ar ? "ar" : "en"), distLoc.kind, dl.project) : (safePlace(searchParams.place) || (cityParam && canonicalCity(searchParams.city) ? cityLabel(cityParam, locale) : ""));
  const crumbQs = canonicalListingsQuery(searchParams);
  return (
    <div style={{ maxWidth: 1360, margin: "0 auto", padding: "28px 24px 64px", fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <JsonLd data={{ "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: dl.crumbHome, item: `${SITE}/${locale}` },
        { "@type": "ListItem", position: 2, name: dl.crumbListings, item: `${SITE}/${locale}/listings` },
        ...(crumbLoc ? [{ "@type": "ListItem", position: 3, name: crumbLoc, item: `${SITE}/${locale}/listings${crumbQs}` }] : []),
      ] }} />
      <div className="row between wrap" style={{ alignItems: "flex-end", gap: 12 }}>
        <div>
          <div className="eyebrow">{dl.exchange}</div>
          <h1 className="serif" style={{ fontSize: "2rem", fontWeight: 500, letterSpacing: "-.02em", margin: "10px 0 0", color: "var(--ink)" }}>{dl.h1}</h1>
        </div>
        <Link href={`/${locale}/map`} className="btn" style={{ gap: 7, textDecoration: "none", background: "rgba(58,110,165,.10)", color: "var(--harbor)", border: "1px solid var(--harbor)", fontWeight: 600 }}><Icon.pin size={16} /> {dl.viewOnMap}</Link>
      </div>
      {/* ELITE-4 J3-19: the site's main search was an unnamed input in an unnamed
          form, so neither the landmark nor the box could be found or announced. */}
      <form method="get" role="search" aria-label={dl.search} className="search focus" style={{ marginTop: 18, border: "1px solid var(--azure)", boxShadow: "none" }}>
        {/* A GET form submits only the fields it carries, so without these the box
            silently discarded the deal, city, district, grade, fitout, facet, sort
            and map area a person had already chosen. Typing a sentence should narrow
            what is on screen, not reset it. `q` is excluded because the input below
            supplies it, and `qx` because withdrawn readings belong to the sentence
            they were withdrawn from: a new search starts from the whole parse. */}
        {Object.entries(fparams).filter(([k]) => k !== "q" && k !== "qx").map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <span style={{ color: "var(--harbor)" }}><Icon.spark size={18} /></span>
        <input name="q" defaultValue={searchParams.q || ""} aria-label={dl.searchPlaceholder} placeholder={dl.searchPlaceholder} style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: "0.875rem", color: "var(--ink)", fontFamily: "var(--sans)", textAlign: ar ? "right" : "left" }} />
        <button type="submit" className="btn primary">{dl.search}</button>
      </form>
      {/* ------------------------------------------------- the transparency row
          A search that quietly drops half of what was typed is the same defect class
          as an unattributed figure: the person cannot tell what the answer is an
          answer to. Every reading is shown back, and every one can be taken away. */}
      {parsedFull && (
        <div className="row gap8 wrap" style={{ marginTop: 10, alignItems: "center" }}>
          {qChips.length > 0 && <span className="muted" style={{ fontSize: "0.78125rem", fontWeight: 600 }}>{dl.qUnderstood}:</span>}
          {qChips.map((c) => (
            <Link key={c.key} href={qxHref(c.key)} className="chip on" style={{ textDecoration: "none" }} aria-label={fill(dl.qRemove, { what: c.label })}>
              {c.label} <span aria-hidden="true">✕</span>
            </Link>
          ))}
          {/* Only when the parser genuinely understood nothing. A person who has
              withdrawn every chip themselves is not owed an explanation of why. */}
          {parsedFull.empty && <span className="muted" style={{ fontSize: "0.78125rem" }}>{dl.qNothing}</span>}
          <Link href={qClearHref} className="muted" style={{ fontSize: "0.78125rem", textDecoration: "none" }}>{dl.qClearSearch}</Link>
        </div>
      )}
      {parsedFull && parsedFull.ignored.length > 0 && (
        <p className="muted" style={{ marginTop: 6, fontSize: "0.75rem", lineHeight: 1.6, maxWidth: 720 }}>
          {fill(dl.qNotUsed, { what: parsedFull.ignored.join(ar ? "، " : ", ") })} {dl.qNotUsedWhy}
        </p>
      )}
      {qSizeT != null && (
        <p className="muted" style={{ marginTop: 4, fontSize: "0.75rem", lineHeight: 1.6 }}>{fill(dl.qOrderedBySize, { v: formatArea(qSizeT, locale) })}</p>
      )}
      <div className="lst-filterwrap" style={{ marginTop: 16 }}>
        <FilterBar locale={locale as "en" | "ar"} params={fparams} cities={cities} locations={locations} assets={assets} grades={grades} fits={fits} sorts={sorts} assetCounts={assetCounts} gradeCounts={gradeCounts} fitCounts={fitCounts} basePath={`/${locale}/listings`} activeSort={sort} />
      </div>
      {facetAsset && facets.length > 0 && (
        <form method="get" className="row gap8 wrap" style={{ marginTop: 12, alignItems: "center" }}>
          {Object.entries(fparams).filter(([k]) => !k.startsWith("f_")).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <span className="muted" style={{ fontSize: "0.78125rem", fontWeight: 600 }}>{assetLabel(facetAsset, locale)} {dl.assetFilters}:</span>
          {facets.map((f) => {
            const cur = String((searchParams as Record<string, string | undefined>)[`f_${f.key}`] ?? "");
            const lbl = fieldLabel(f, locale);
            const inpStyle = { padding: "7px 10px", borderRadius: 8, border: "1px solid var(--silver)", fontSize: "0.8125rem", background: "#fff", color: "var(--ink)" } as const;
            if (f.type === "number" || f.type === "integer") {
              /* ELITE-4 J3-20: named by placeholder only, so unnamed once filled in. */
              return <input key={f.key} name={`f_${f.key}`} type="number" defaultValue={cur} aria-label={`${lbl} ${dl.minimum}`} placeholder={`${lbl} ${dl.minimum}`} style={{ ...inpStyle, width: 170 }} />;
            }
            const opts: [string, string][] = f.type === "tristate" || f.type === "boolean"
              ? [["yes", dl.yes], ["no", dl.no]]
              : (f.validation?.enum ?? []).map((v) => [v, f.options?.[v]?.[ar ? 1 : 0] ?? v.replace(/_/g, " ")] as [string, string]);
            return (
              /* ELITE-4 J3-20: the only name this had was the placeholder option, which
                 stops being the selected text the moment a value is chosen. */
              <select key={f.key} name={`f_${f.key}`} defaultValue={cur} aria-label={lbl} style={inpStyle}>
                <option value="">{lbl}: {dl.any}</option>
                {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            );
          })}
          <button type="submit" className="btn primary" style={{ height: 34 }}>{dl.apply}</button>
          {facets.some((f) => (searchParams as Record<string, string | undefined>)[`f_${f.key}`]) && (
            <a href={`/${locale}/listings?${Object.entries(fparams).filter(([k]) => !k.startsWith("f_")).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`} className="muted" style={{ fontSize: "0.78125rem", textDecoration: "none" }}>{dl.clear}</a>
          )}
        </form>
      )}
      {/* Location filter header: when a district/place/city is active (e.g. from a
          map bubble click), say so plainly with a one-tap clear, so a filter is never
          an invisible state the user has to infer. */}
      {(searchParams.district || searchParams.place || searchParams.city) && crumbLoc && (
        <div className="row gap8 wrap" style={{ marginTop: 14, alignItems: "center", padding: "9px 14px", background: "var(--azure-wash)", border: "1px solid var(--azure-l)", borderRadius: 10 }}>
          <span style={{ color: "var(--harbor)", display: "inline-flex" }}><Icon.pin size={15} /></span>
          <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--ink)" }}>{crumbLoc}</span>
          <span className="muted" style={{ fontSize: "0.8125rem" }}>· {formatCounted(shown.length, "space", locale)}</span>
          <span style={{ flex: 1 }} />
          <Link href={base ? `/${locale}/listings?${base}` : `/${locale}/listings`} className="chip" style={{ textDecoration: "none", fontWeight: 600 }}>{dl.clear} ✕</Link>
        </div>
      )}
      <div className="row between wrap" style={{ marginTop: 14, alignItems: "center", gap: 10 }}>
        {/* The result count printed one Arabic noun form after every number, and
            it disagreed with the count in the location header two lines up, which
            said "مساحة" where this said "عرض". One counted noun answers both. */}
        {/* ELITE-4 J3-15: a filter change rewrites the result set with no navigation
            and no announcement, so this count is the only thing that says it worked. */}
        <div role="status" aria-live="polite" className="muted" style={{ fontSize: "0.8125rem" }}>{formatCounted(shown.length, "space", locale)}{searchParams.place && (!placeIds || !placeIds.size) ? " · " + fill(dl.noSpacesIn, { place: searchParams.place }) : ""}{bbox ? <> {"\u00B7"} {dl.mapArea} {"\u00B7"} <Link href={`/${locale}/listings?${base}`} style={{ color: "var(--harbor)", textDecoration: "none", fontWeight: 600 }}>{dl.clearArea}</Link></> : null}</div>
        {/* RC9c, finding 167. These two are links: each one changes the URL and the
            server renders a different view from it, so the state they carry is "this
            is the page you are on", and `aria-current="page"` is that state. They are
            not toggle buttons and `aria-pressed` would misdescribe them.

            The weight is the other half. `.chip.on` differs from `.chip` in text
            colour, background and border colour and in nothing else, so which view
            was open was carried by colour alone (SC 1.4.1). The active chip is 700
            here, which is a difference in form rather than in hue. It is done inline
            on this pair rather than in `.chip.on`, because `.chip.on` is now also the
            selected face of every native radio the platform draws after RC9a, and
            reweighting all of them is a cosmetic sweep this package has no evidence
            for and no mandate to make. */}
        <div className="row gap8 wrap">
          <Link href={`/${locale}/listings${qsWith()}`} aria-current={!insightsView ? "page" : undefined} className={!insightsView ? "chip on" : "chip"} style={{ textDecoration: "none", fontWeight: !insightsView ? 700 : undefined }}>{dl.properties}</Link>
          <Link href={`/${locale}/listings${qsWith({ view: "insights" })}`} aria-current={insightsView ? "page" : undefined} className={insightsView ? "chip on" : "chip"} style={{ textDecoration: "none", fontWeight: insightsView ? 700 : undefined }}>{dl.insights}</Link>
        </div>
      </div>
      <SaveSearch locale={locale as "en" | "ar"} qs={qsWith().replace(/^\?/, "")} label={saveLabel} />
      <div className="lst-split" style={{ marginTop: 18 }}>
      <div>
      {insightsView ? (
        <div className="card" style={{ overflow: "hidden", boxShadow: "var(--sh-1)" }}>
          <div className="row between" style={{ padding: "14px 18px", borderBottom: "1px solid var(--silver)" }}>
            <div style={{ fontSize: "0.90625rem", fontWeight: 700 }}>{dl.indexCut}</div>
            <Link href={`/${locale}/rent-index`} className="chip" style={{ textDecoration: "none" }}>{dl.fullIndex}</Link>
          </div>
          {idx.length === 0 ? (
            <p className="muted" style={{ padding: 18, margin: 0, fontSize: "0.84375rem" }}>{dl.noSegments}</p>
          ) : (
            <ScrollRegion label={dl.indexCut}>
              <table className="dt" style={{ minWidth: 520 }}>
                <caption className="sronly">{dl.indexCut}</caption>
                <thead><tr><th scope="col">{dl.colLocation}</th><th scope="col">{dl.colAsset}</th><th scope="col" style={{ textAlign: "right" }}>{statUnitHeading(idxCells, locale, { neutral: dl.colStat, pattern: dict.common.statUnit })}</th><th scope="col" style={{ textAlign: "right" }}>{withUnit(dl.colBand, idxCells, locale, dict.common.statUnit)}</th><th scope="col" style={{ textAlign: "right" }}>{dl.colData}</th></tr></thead>
                <tbody>
                  {idx.map((q, i: number) => {
                    const r: any = q.row;
                    const show = q.gate.mayShowFigure;
                    return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{(ar ? r.district_label_ar : r.district_label) || r.district_label}</td>
                      <td className="muted">{assetLabel(r.asset_type, locale)}{r.segment ? " · " + segmentLabel(r.segment, locale) : ""}</td>
                      {/* PKG-FIG2 closure, finding 131. This cell called `toLocaleString("en-US")`
                          directly, which is the one numeral policy stated in a page rather than
                          read from the one function that owns it. `formatInteger` pins the same
                          Latin numerals for both languages, and it does so in one place. */}
                      <td className="num mono">{show && r.median != null ? <bdi dir="ltr">{formatInteger(Number(r.median), locale)}</bdi> : (dl.na)}</td>
                      {/* PKG-FIG1, finding 127. The cell spelled the separator as a spaced
                          en dash and forced the whole range left to right, which is right
                          for a bare figure and wrong for a range whose Arabic separator is
                          a word. `formatRange` states it once, for both languages, and
                          isolates the composite instead of overriding its direction.
                          `rentIndexEvidence.ts` renders the passport value from the same
                          call, so the two cannot disagree about what was displayed. */}
                      <td className="num mono muted">{show && r.band_low != null && r.band_high != null ? formatRange(Number(r.band_low), Number(r.band_high), ar ? "ar" : "en", 0) : (dl.thinSample)}</td>
                      {/* This column reports the sample, which is a separate
                          question from whether the figure may be published, so
                          it keeps saying what it always said. The sentences
                          under the table say the other thing. */}
                      <td className="num">{r.sufficient ? <span className="statusdot ok">{dl.sufficient}</span> : <span className="statusdot pend">{dl.thin}</span>}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollRegion>
          )}
          <div className="muted" style={{ padding: "12px 18px", borderTop: "1px solid var(--silver)", background: "var(--cool)", fontSize: "0.75rem" }}>
            {dl.sampleDisclaimer}
            {idxStatements.map((s) => (
              <div key={s} style={{ marginTop: 6, lineHeight: 1.7 }}>{s}</div>
            ))}
          </div>
        </div>
      ) : shown.length === 0 ? (
        <div style={{ marginTop: 12 }}>
          <DataState
            kind="empty"
            title={bbox ? (dl.emptyMapArea) : (dl.emptyNoMatch)}
            action={
              <Link href={bbox ? `/${locale}/listings?${base}` : `/${locale}/listings`} className="btn" style={{ display: "inline-flex", alignItems: "center", height: 38, padding: "0 14px", borderRadius: 999, textDecoration: "none" }}>{bbox ? (dl.clearMapArea) : (dl.clearAllFilters)}</Link>
            }
          />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 230px), 1fr))", gap: 18 }}>
          {/* PKG-CARD1. This grid used to draw its own card: a `Photo` badge row
              with the decorative fav star (finding 173's class: no handler),
              a price assembled inline rather than through `priceParts`, and its
              own copy of the verified-badge and freshness markup. `ListingCard`
              is now the one place a listing becomes a card; `showFreshness`
              keeps the "listed N days ago" and availability lines this page
              alone shows, and `mapId` keeps the `.listing[data-lid]` hook
              ListingsMap's hover sync already depends on. */}
          {shown.map((l) => (
            <ListingCard key={l.id} listing={l} locale={locale as "en" | "ar"} ui={dict.ui} showFreshness mapId={l.id} />
          ))}
        </div>
      )}
      </div>
      <ListingsMap locale={locale as "en" | "ar"} bubbles={bubbles} pins={pins} baseParams={base} initialBbox={bbox ?? undefined} selectedDistrict={searchParams.district ?? null} />
      </div>
    </div>
  );
}
