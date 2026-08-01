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
import type { Listing } from "@/lib/types";
import { Photo, Verified, Icon } from "@/components/satkit";
import dynamic from "next/dynamic";
import type { DistrictBubble, ExactPin } from "@/components/ListingsMap";

// maplibre-gl is ~800KB and the map is below the fold on mobile. Statically importing
// it put the whole thing (plus its CSS) in the initial bundle for /listings and blocked
// hydration. It now loads on the client, after paint, behind a skeleton.
const ListingsMap = dynamic(() => import("@/components/ListingsMap"), {
  ssr: false,
  loading: () => <div className="mapskel" aria-hidden />,
});

export const revalidate = 300;
import SaveSearch from "@/components/SaveSearch";
import DataState from "@/components/DataState";
import FilterBar, { type LocOpt } from "@/components/FilterBar";
import { coveredFacetFields, matchesAssetFacets } from "@/lib/facets";
import { pickIndexRow, type IndexRow } from "@/lib/market/verdict";
import { decidedRentIndexRows, quotableRentIndexRows } from "@/lib/market/quotable";
import { listedSince, listedLabel } from "@/lib/listedSince";
import { availabilityOf, availabilityShortLabel, availabilityTone } from "@/lib/availability";
// A listing being SAT's own stock is not a verification of anything. It used to
// light the "Verified owner" badge all by itself, which handed our own inventory a
// trust mark it had not earned, on the platform that publishes /neutrality.
// ADV-1: the badge now names its own gate and no longer reads a single boolean.
import { CHECK_METHODS } from "@/lib/listingVerification";
import { verifiedBadges } from "@/components/VerificationState";
import JsonLd, { SITE } from "@/components/JsonLd";
import { localeMeta } from "@/lib/meta";
import { fill, formatArea, formatCounted, formatNumber, formatUnit } from "@/lib/format";
import { getDictionary } from "@/i18n/getDictionary";

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

export async function generateMetadata({ params, searchParams }: { params: { locale: string }; searchParams: SP }) {
  const loc = (params.locale === "ar" ? "ar" : "en") as "en" | "ar";
  const dl = getDictionary(loc).listings;
  const ar = loc === "ar";
  let locLabel = "";
  if (searchParams.district) {
    const sb = getSupabaseServer();
    if (sb) { const { data } = await sb.from("districts").select("name_en,name_ar").eq("id", searchParams.district).single(); if (data) locLabel = ar ? (data.name_ar || data.name_en) : data.name_en; }
  } else if (searchParams.place) locLabel = searchParams.place;
  else if (searchParams.city) locLabel = cityLabel(searchParams.city, loc);
  const asset = searchParams.asset && !searchParams.asset.includes(",") ? assetLabel(searchParams.asset, loc) : "";
  const deal = searchParams.deal ? dealLabel(searchParams.deal, loc) : "";
  const what = [asset, deal].filter(Boolean).join(" ").trim();
  const title = locLabel
    ? fill(dl.metaTitleIn, { what: what || dl.metaWhatFallback, place: locLabel })
    : dl.metaTitle;
  const description = locLabel
    ? fill(dl.metaDescIn, { place: locLabel })
    : dl.metaDesc;
  const qs = searchParams.district ? `?district=${searchParams.district}` : searchParams.city ? `?city=${encodeURIComponent(searchParams.city)}` : searchParams.place ? `?place=${encodeURIComponent(searchParams.place)}` : "";
  return localeMeta(params.locale, `/listings${qs}`, title, description);
}

export default async function ListingsPage({ params, searchParams }: { params: { locale: string }; searchParams: SP }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const dict = getDictionary(locale as "en" | "ar");
  // The page used to carry a private t(en, ar) helper, which is how roughly two
  // dozen visible strings came to live in this file instead of the dictionaries,
  // with a second grade vocabulary and a second sort vocabulary among them.
  const dl = dict.listings;
  const list = (k?: string) => (k ? k.split(",").filter(Boolean) : []);
  const sb = getSupabaseServer();
  let listings: Listing[] = [];
  let bubbles: DistrictBubble[] = [];
  let pins: ExactPin[] = [];
  const coordByListing = new Map<string, { lat: number; lng: number }>();
  let locations: LocOpt[] = [];
  const idxByDistrict = new Map<string, IndexRow[]>();
  const assetCounts: Record<string, number> = {}, gradeCounts: Record<string, number> = {}, fitCounts: Record<string, number> = {};
  if (sb) {
    let query = releaseVisibleInventory(sb.from("listings").select("*, districts(name_en,name_ar,city)").eq("status", "published")).limit(300);
    const assetArr = list(searchParams.asset);
    if (assetArr.length) query = query.in("asset_type", assetArr);
    if (searchParams.deal) query = query.eq("deal_type", searchParams.deal);
    if (searchParams.smin) query = query.gte("area_sqm", Number(searchParams.smin));
    if (searchParams.smax) query = query.lte("area_sqm", Number(searchParams.smax));
    if (searchParams.deal !== "sale") {
      if (searchParams.pmin) query = query.gte("asking_rent_sqm", Number(searchParams.pmin));
      if (searchParams.pmax) query = query.lte("asking_rent_sqm", Number(searchParams.pmax));
    } else {
      if (searchParams.spmin) query = query.gte("sale_price", Number(searchParams.spmin));
      if (searchParams.spmax) query = query.lte("sale_price", Number(searchParams.spmax));
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
    if (searchParams.smin) fq = fq.gte("area_sqm", Number(searchParams.smin));
    if (searchParams.smax) fq = fq.lte("area_sqm", Number(searchParams.smax));
    if (searchParams.deal !== "sale") { if (searchParams.pmin) fq = fq.gte("asking_rent_sqm", Number(searchParams.pmin)); if (searchParams.pmax) fq = fq.lte("asking_rent_sqm", Number(searchParams.pmax)); }
    else { if (searchParams.spmin) fq = fq.gte("sale_price", Number(searchParams.spmin)); if (searchParams.spmax) fq = fq.lte("sale_price", Number(searchParams.spmax)); }
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
    bubbles = (geo ?? []).filter((g: any) => counts.get(g.id)).map((g: any) => ({ id: g.id, name: ((ar ? g.name_ar : g.name_en) || g.name_en) + (g.kind === "development" ? " · " + dl.project : ""), lat: Number(g.lat), lng: Number(g.lng), count: counts.get(g.id) as number }));
    locations = (allLocs ?? []).map((d: any) => ({ id: d.id, city: d.city || "Other", kind: d.kind || "district", en: d.name_en, ar: d.name_ar, count: counts.get(d.id) ?? 0 }));
    const bids = Array.from(new Set(listings.map((l: any) => l.building_id).filter(Boolean)));
    if (bids.length) {
      const { data: bs } = await sb.from("buildings").select("id,lat,lng").in("id", bids).not("lat", "is", null);
      const bmap = new Map((bs ?? []).map((b: any) => [b.id, b]));
      pins = listings.filter((l: any) => bmap.get(l.building_id)).map((l: any) => { const b: any = bmap.get(l.building_id); coordByListing.set(l.id, { lat: Number(b.lat), lng: Number(b.lng) }); return { id: l.id, title: listingTitle(l, ar ? "ar" : "en"), lat: Number(b.lat), lng: Number(b.lng), price: l.deal_type === "lease" ? (l.asking_rent_sqm != null ? Number(l.asking_rent_sqm).toLocaleString("en-US") + (ar ? " ريال/م²·سنة" : " SAR/m²·yr") : "") : (l.sale_price != null ? Number(l.sale_price).toLocaleString("en-US") + (ar ? " ريال" : " SAR") : "") }; });
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
  const cityParam = searchParams.city ? (cityKey(searchParams.city) ?? searchParams.city) : null;
  const cityIds = new Set(cityParam ? locations.filter((l) => l.city === cityParam).map((l) => l.id) : []);
  const placeIds = searchParams.place ? new Set(locations.filter((l) => l.en.toLowerCase() === searchParams.place!.toLowerCase() || (l.ar || "") === searchParams.place).map((l) => l.id)) : null;
  let shown = listings.slice();
  if (searchParams.district) shown = shown.filter((l: any) => l.district_id === searchParams.district);
  else if (placeIds) shown = placeIds.size ? shown.filter((l: any) => l.district_id && placeIds.has(l.district_id)) : [];
  else if (searchParams.city) shown = shown.filter((l: any) => l.district_id && cityIds.has(l.district_id));
  const bbox = (() => { if (!searchParams.bbox) return null; const p = searchParams.bbox.split(",").map(Number); return p.length === 4 && p.every((n) => Number.isFinite(n)) ? p : null; })();
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
  const qSizeT = !searchParams.sz && !searchParams.sort && q?.areaTarget != null ? q.areaTarget : null;
  const szT = searchParams.sz ? Number(searchParams.sz) : qSizeT;
  const rtT = searchParams.rt ? Number(searchParams.rt) : null;
  const spT = searchParams.sp ? Number(searchParams.sp) : null;
  const sort = searchParams.sort || (szT || rtT || spT ? "best" : "new");
  const vScore = (l: any) => { if (l.deal_type !== "lease" || l.asking_rent_sqm == null) return Infinity; const row = pickIndexRow(idxByDistrict.get(l.district_id) ?? [], l.asset_type, (l as any).building_grade); const med = row?.median; return med == null ? Infinity : Number(l.asking_rent_sqm) / Number(med); };
  const priceOf = (l: any) => Number(l.deal_type === "sale" ? (l.sale_price ?? 1e15) : (l.asking_rent_sqm ?? 1e15));
  if (szT != null) shown.sort((a: any, b: any) => Math.abs((a.area_sqm || 0) - szT) - Math.abs((b.area_sqm || 0) - szT));
  else if (rtT != null) shown.sort((a: any, b: any) => Math.abs((a.asking_rent_sqm || 0) - rtT) - Math.abs((b.asking_rent_sqm || 0) - rtT));
  else if (spT != null) shown.sort((a: any, b: any) => Math.abs((a.sale_price || 0) - spT) - Math.abs((b.sale_price || 0) - spT));
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
  if (q) {
    const money = (v: number) =>
      `${formatNumber(v, locale)}${q.deal === "sale" ? ` ${formatUnit("sar", locale, "short")}` : q.deal === "lease" ? ` ${formatUnit("sar_sqm_year", locale, "short")}` : ""}`;
    if (q.asset) qChips.push({ key: "asset", label: assetLabel(q.asset, locale) });
    if (q.deal) qChips.push({ key: "deal", label: dealLabel(q.deal, locale) });
    if (q.grade) qChips.push({ key: "grade", label: gradePhrase(q.grade, locale) });
    if (q.fitout) qChips.push({ key: "fitout", label: fitoutLabel(q.fitout, locale) });
    if (q.place) qChips.push({ key: "place", label: ar ? q.place.ar : q.place.en });
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
  const rcity = dl.riyadh;
  const kindFor = (a: string) => a;

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

  const saveLabel = [searchParams.deal ? dealLabel(searchParams.deal, locale) : "", activeDistrict ? activeDistrict.name : (searchParams.place || (searchParams.city ? cityLabel(searchParams.city, locale) : ""))].filter(Boolean).join(" · ") || (dl.allSpaces);

  const distLoc = searchParams.district ? locations.find((l) => l.id === searchParams.district) : null;
  const crumbLoc = distLoc ? (ar ? (distLoc.ar || distLoc.en) : distLoc.en) : (searchParams.place || (searchParams.city ? cityLabel(searchParams.city, locale) : ""));
  const crumbQs = searchParams.district ? `?district=${searchParams.district}` : searchParams.city ? `?city=${encodeURIComponent(searchParams.city)}` : searchParams.place ? `?place=${encodeURIComponent(searchParams.place)}` : "";
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
          <h1 className="serif" style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-.02em", margin: "10px 0 0", color: "var(--ink)" }}>{dl.h1}</h1>
        </div>
        <Link href={`/${locale}/map`} className="btn" style={{ gap: 7, textDecoration: "none", background: "rgba(58,110,165,.10)", color: "var(--harbor)", border: "1px solid var(--harbor)", fontWeight: 600 }}><Icon.pin size={16} /> {dl.viewOnMap}</Link>
      </div>
      <form method="get" className="search focus" style={{ marginTop: 18, border: "1px solid var(--azure)", boxShadow: "none" }}>
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
        <input name="q" defaultValue={searchParams.q || ""} placeholder={dl.searchPlaceholder} style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14, color: "var(--ink)", fontFamily: "var(--sans)", textAlign: ar ? "right" : "left" }} />
        <button type="submit" className="btn primary">{dl.search}</button>
      </form>
      {/* ------------------------------------------------- the transparency row
          A search that quietly drops half of what was typed is the same defect class
          as an unattributed figure: the person cannot tell what the answer is an
          answer to. Every reading is shown back, and every one can be taken away. */}
      {parsedFull && (
        <div className="row gap8 wrap" style={{ marginTop: 10, alignItems: "center" }}>
          {qChips.length > 0 && <span className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>{dl.qUnderstood}:</span>}
          {qChips.map((c) => (
            <Link key={c.key} href={qxHref(c.key)} className="chip on" style={{ textDecoration: "none" }} aria-label={fill(dl.qRemove, { what: c.label })}>
              {c.label} <span aria-hidden="true">✕</span>
            </Link>
          ))}
          {/* Only when the parser genuinely understood nothing. A person who has
              withdrawn every chip themselves is not owed an explanation of why. */}
          {parsedFull.empty && <span className="muted" style={{ fontSize: 12.5 }}>{dl.qNothing}</span>}
          <Link href={qClearHref} className="muted" style={{ fontSize: 12.5, textDecoration: "none" }}>{dl.qClearSearch}</Link>
        </div>
      )}
      {parsedFull && parsedFull.ignored.length > 0 && (
        <p className="muted" style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6, maxWidth: 720 }}>
          {fill(dl.qNotUsed, { what: parsedFull.ignored.join(ar ? "، " : ", ") })} {dl.qNotUsedWhy}
        </p>
      )}
      {qSizeT != null && (
        <p className="muted" style={{ marginTop: 4, fontSize: 12, lineHeight: 1.6 }}>{fill(dl.qOrderedBySize, { v: formatArea(qSizeT, locale) })}</p>
      )}
      <div className="lst-filterwrap" style={{ marginTop: 16 }}>
        <FilterBar locale={locale as "en" | "ar"} params={fparams} cities={cities} locations={locations} assets={assets} grades={grades} fits={fits} sorts={sorts} assetCounts={assetCounts} gradeCounts={gradeCounts} fitCounts={fitCounts} basePath={`/${locale}/listings`} />
      </div>
      {facetAsset && facets.length > 0 && (
        <form method="get" className="row gap8 wrap" style={{ marginTop: 12, alignItems: "center" }}>
          {Object.entries(fparams).filter(([k]) => !k.startsWith("f_")).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <span className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>{assetLabel(facetAsset, locale)} {dl.assetFilters}:</span>
          {facets.map((f) => {
            const cur = String((searchParams as Record<string, string | undefined>)[`f_${f.key}`] ?? "");
            const lbl = ar ? f.label_ar : f.label_en;
            const inpStyle = { padding: "7px 10px", borderRadius: 8, border: "1px solid var(--silver)", fontSize: 13, background: "#fff", color: "var(--ink)" } as const;
            if (f.type === "number" || f.type === "integer") {
              return <input key={f.key} name={`f_${f.key}`} type="number" defaultValue={cur} placeholder={`${lbl}${f.unit ? " (" + f.unit + ")" : ""} ${dl.minimum}`} style={{ ...inpStyle, width: 170 }} />;
            }
            const opts: [string, string][] = f.type === "tristate" || f.type === "boolean"
              ? [["yes", dl.yes], ["no", dl.no]]
              : (f.validation?.enum ?? []).map((v) => [v, f.options?.[v]?.[ar ? 1 : 0] ?? v.replace(/_/g, " ")] as [string, string]);
            return (
              <select key={f.key} name={`f_${f.key}`} defaultValue={cur} style={inpStyle}>
                <option value="">{lbl}: {dl.any}</option>
                {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            );
          })}
          <button type="submit" className="btn primary" style={{ height: 34 }}>{dl.apply}</button>
          {facets.some((f) => (searchParams as Record<string, string | undefined>)[`f_${f.key}`]) && (
            <a href={`/${locale}/listings?${Object.entries(fparams).filter(([k]) => !k.startsWith("f_")).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`} className="muted" style={{ fontSize: 12.5, textDecoration: "none" }}>{dl.clear}</a>
          )}
        </form>
      )}
      {/* Location filter header: when a district/place/city is active (e.g. from a
          map bubble click), say so plainly with a one-tap clear, so a filter is never
          an invisible state the user has to infer. */}
      {(searchParams.district || searchParams.place || searchParams.city) && crumbLoc && (
        <div className="row gap8 wrap" style={{ marginTop: 14, alignItems: "center", padding: "9px 14px", background: "var(--azure-wash)", border: "1px solid var(--azure-l)", borderRadius: 10 }}>
          <span style={{ color: "var(--harbor)", display: "inline-flex" }}><Icon.pin size={15} /></span>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{crumbLoc}</span>
          <span className="muted" style={{ fontSize: 13 }}>· {formatCounted(shown.length, "space", locale)}</span>
          <span style={{ flex: 1 }} />
          <Link href={base ? `/${locale}/listings?${base}` : `/${locale}/listings`} className="chip" style={{ textDecoration: "none", fontWeight: 600 }}>{dl.clear} ✕</Link>
        </div>
      )}
      <div className="row between wrap" style={{ marginTop: 14, alignItems: "center", gap: 10 }}>
        {/* The result count printed one Arabic noun form after every number, and
            it disagreed with the count in the location header two lines up, which
            said "مساحة" where this said "عرض". One counted noun answers both. */}
        <div className="muted" style={{ fontSize: 13 }}>{formatCounted(shown.length, "space", locale)}{searchParams.place && (!placeIds || !placeIds.size) ? " · " + fill(dl.noSpacesIn, { place: searchParams.place }) : ""}{bbox ? <> {"\u00B7"} {dl.mapArea} {"\u00B7"} <Link href={`/${locale}/listings?${base}`} style={{ color: "var(--harbor)", textDecoration: "none", fontWeight: 600 }}>{dl.clearArea}</Link></> : null}</div>
        <div className="row gap8 wrap">
          <Link href={`/${locale}/listings${qsWith()}`} className={!insightsView ? "chip on" : "chip"} style={{ textDecoration: "none" }}>{dl.properties}</Link>
          <Link href={`/${locale}/listings${qsWith({ view: "insights" })}`} className={insightsView ? "chip on" : "chip"} style={{ textDecoration: "none" }}>{dl.insights}</Link>
        </div>
      </div>
      <SaveSearch locale={locale as "en" | "ar"} qs={qsWith().replace(/^\?/, "")} label={saveLabel} />
      <div className="lst-split" style={{ marginTop: 18 }}>
      <div>
      {insightsView ? (
        <div className="card" style={{ overflow: "hidden", boxShadow: "var(--sh-1)" }}>
          <div className="row between" style={{ padding: "14px 18px", borderBottom: "1px solid var(--silver)" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>{dl.indexCut}</div>
            <Link href={`/${locale}/rent-index`} className="chip" style={{ textDecoration: "none" }}>{dl.fullIndex}</Link>
          </div>
          {idx.length === 0 ? (
            <p className="muted" style={{ padding: 18, margin: 0, fontSize: 13.5 }}>{dl.noSegments}</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="dt" style={{ minWidth: 520 }}>
                <thead><tr><th>{dl.colLocation}</th><th>{dl.colAsset}</th><th style={{ textAlign: "right" }}>{dl.colMedian}</th><th style={{ textAlign: "right" }}>{dl.colBand}</th><th style={{ textAlign: "right" }}>{dl.colData}</th></tr></thead>
                <tbody>
                  {idx.map((q, i: number) => {
                    const r: any = q.row;
                    const show = q.gate.mayShowFigure;
                    return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{(ar ? r.district_label_ar : r.district_label) || r.district_label}</td>
                      <td className="muted">{assetLabel(r.asset_type, locale)}{r.segment ? " · " + segmentLabel(r.segment, locale) : ""}</td>
                      <td className="num mono">{show && r.median != null ? <bdi dir="ltr">{Number(r.median).toLocaleString("en-US")}</bdi> : (dl.na)}</td>
                      <td className="num mono muted">{show && r.band_low != null && r.band_high != null ? <bdi dir="ltr">{`${Number(r.band_low).toLocaleString("en-US")} – ${Number(r.band_high).toLocaleString("en-US")}`}</bdi> : (dl.thinSample)}</td>
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
            </div>
          )}
          <div className="muted" style={{ padding: "12px 18px", borderTop: "1px solid var(--silver)", background: "var(--cool)", fontSize: 12 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 18 }}>
          {shown.map((l) => {
            const dn = l.districts ? (ar ? l.districts.name_ar : l.districts.name_en) : null;
            const price = l.deal_type === "lease" ? l.asking_rent_sqm : l.sale_price;
            const type = assetLabel(l.asset_type, locale);
            return (
              <Link key={l.id} href={`/${locale}/listings/${l.id}`} className="listing" data-lid={l.id} style={{ textDecoration: "none", color: "inherit" }}>
                <Photo kind={kindFor(l.asset_type)} alt={`${type}, ${dn || rcity}`} h={150} fav badges={[...verifiedBadges(l as any, null, ar), <span key="t" className="tag" style={{ background: "rgba(255,255,255,.9)" }}>{type}</span>, ...(listedSince((l as any).created_at)?.isNew ? [<span key="new" className="tag" style={{ background: "var(--harbor)", color: "#fff", borderColor: "transparent" }}>{dl.newBadge}</span>] : [])]} />
                <div className="body">
                  {(() => {
                    const ls = listedSince((l as any).created_at);
                    return (<>
                      {/* The card kept the figure and its unit in separate elements
                          so the unit could be set smaller, and paid for it with four
                          inline unit strings and a Latin "m²" on the Arabic card. The
                          split stays; both parts now come from the unit table. */}
                      <div className="price" style={{ whiteSpace: "nowrap" }}>{price != null ? formatNumber(Number(price), locale) : dl.onRequest}<small> {formatUnit(l.deal_type === "lease" ? "sar_sqm_year" : "sar", locale, "short")}</small></div>
                      <div className="ttl">{listingTitle(l, ar ? "ar" : "en")}</div>
                      <div className="meta"><span>{dn || rcity}</span><i /><span>{formatArea(l.area_sqm, locale)}</span>{(l as any).building_grade && (l as any).building_grade !== "n_a" ? <><i /><span>{gradeLabel((l as any).building_grade, locale)}</span></> : null}</div>
                      {ls ? <div className="mono muted" style={{ marginTop: 6, fontSize: 10.5, letterSpacing: ".02em" }}>{listedLabel(ls.days, ar)}</div> : null}
                      {/* Finding 46. The label states the freshness in words and
                          carries the age, so the dot is decoration and stays
                          aria-hidden. The reserved verification green is gone from
                          here: the tick in the photo badges is the only claim on
                          this card that an evidence-backed check was run. */}
                      {(() => {
                        const av = availabilityOf((l as any).availability_confirmed_at);
                        if (!av) return null;
                        const c = availabilityTone(av.state);
                        return (
                          <div className="row gap6" style={{ marginTop: 5, alignItems: "flex-start" }}>
                            <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: c, display: "inline-block", flex: "0 0 auto", marginTop: 4 }} />
                            <span className="mono" style={{ fontSize: 10.5, letterSpacing: ".02em", lineHeight: 1.35, color: c }}>{availabilityShortLabel(av, ar)}</span>
                          </div>
                        );
                      })()}
                    </>);
                  })()}
                </div>
              </Link>
            );
          })}
        </div>
      )}
      </div>
      <ListingsMap locale={locale as "en" | "ar"} bubbles={bubbles} pins={pins} baseParams={base} initialBbox={bbox ?? undefined} selectedDistrict={searchParams.district ?? null} />
      </div>
    </div>
  );
}
