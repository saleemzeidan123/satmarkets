// PKG-E1-READINESS slice C, WS16. The known-query set and the canonicalization
// matrix.
//
// The baseline asks for two things this file holds together, because they are
// one thing: a query is what a person typed, a canonical URL is what the page
// says that query WAS, and a platform whose second answer disagrees with its
// first is guessing in public.
//
// `queryParse.test.ts` already holds 34 tests on the parser's internals, so
// nothing here re-tests folding, longest-first or the numeric axis rules. This
// file starts one level up: a sentence in English or Arabic, or a URL a person
// pasted, and the whole chain of consequences from it. The rows are named
// KNOWN_QUERIES because they are a set, not examples: adding a row is how a
// behaviour becomes something the platform has promised.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  DEAL_VALUES,
  SORT_VALUES,
  CANONICAL_PLACE_KEYS,
  numericParam,
  measureParam,
  dealParam,
  sortParam,
  knownValue,
  canonicalCity,
  safePlace,
  bboxParam,
  canonicalListingsQuery,
  canonicalListingsPath,
  locationLabel,
  sameCanonical,
  mergeParams,
  toQuery,
  searchFormCarry,
  SEARCH_FORM_OWNS,
} from "./canonical";
import { parseQuery, type QueryVocab } from "./queryParse";

const PAGE = readFileSync("src/app/[locale]/listings/page.tsx", "utf8");
const FILTERBAR = readFileSync("src/components/FilterBar.tsx", "utf8");

// --------------------------------------------------------------- the vocabulary
//
// The same shape the page hands the parser: the tables the filter bar is built
// from, plus the districts it loaded. Two of the places below are developments
// and one is a district in a second city, because that is where the two laws
// this file guards actually bite.

const LOCATIONS = [
  { id: "d1", city: "Riyadh", kind: "district", en: "Al Olaya", ar: "العليا" },
  { id: "d2", city: "Riyadh", kind: "development", en: "KAFD", ar: "الملك عبدالله المالي" },
  { id: "d3", city: "Riyadh", kind: "development", en: "Roshn Front", ar: "روشن فرونت" },
  { id: "d4", city: "Jeddah", kind: "district", en: "Al Rawdah", ar: "الروضة" },
] as const;

const VOCAB: QueryVocab = {
  assets: [
    { value: "office", en: "Office", ar: "مكتب" },
    { value: "warehouse", en: "Warehouse", ar: "مستودع" },
    { value: "retail", en: "Retail", ar: "محل تجاري" },
  ],
  grades: [
    { value: "a_plus", en: "A+", ar: "أ+" },
    { value: "a", en: "A", ar: "أ" },
  ],
  fitouts: [
    { value: "fitted", en: "Fitted", ar: "مجهز" },
    { value: "shell_and_core", en: "Shell and core", ar: "على العظم" },
  ],
  deals: [
    { value: "lease", en: "Lease", ar: "إيجار" },
    { value: "sale", en: "Sale", ar: "بيع" },
  ],
  cities: [
    { value: "Riyadh", en: "Riyadh", ar: "الرياض" },
    { value: "Jeddah", en: "Jeddah", ar: "جدة" },
  ],
  places: LOCATIONS.map((l) => ({ id: l.id, en: l.en, ar: l.ar })),
};

const ASSETS = VOCAB.assets.map((a) => a.value);

// ------------------------------------------------------------ the known queries
//
// Each row is a sentence somebody could type, in one of the two languages the
// platform serves, with the readings the parser is promised to take from it.
// `expect` is a partial reading: a row states the readings it is ABOUT, and the
// `ignored` and `empty` fields are stated wherever the row exists to pin them.

type Row = {
  name: string;
  q: string;
  lang: "en" | "ar";
  expect: {
    asset?: string | null;
    deal?: string | null;
    grade?: string | null;
    fitout?: string | null;
    city?: string | null;
    place?: string | null;
    priceMax?: number | null;
    priceMin?: number | null;
    areaTarget?: number | null;
    areaMin?: number | null;
    areaMax?: number | null;
    empty?: boolean;
    terms?: string[];
  };
};

const KNOWN_QUERIES: readonly Row[] = Object.freeze([
  // type
  { name: "type alone, EN", q: "office", lang: "en", expect: { asset: "office", deal: null, city: null, empty: false } },
  { name: "type alone, AR", q: "مكتب", lang: "ar", expect: { asset: "office", deal: null, city: null, empty: false } },
  // type and deal
  { name: "type and deal, EN", q: "warehouse for lease", lang: "en", expect: { asset: "warehouse", deal: "lease" } },
  { name: "type and deal, AR", q: "مستودع للإيجار", lang: "ar", expect: { asset: "warehouse", deal: "lease" } },
  { name: "sale, EN", q: "retail for sale", lang: "en", expect: { asset: "retail", deal: "sale" } },
  { name: "sale, AR", q: "محل تجاري للبيع", lang: "ar", expect: { asset: "retail", deal: "sale" } },
  // city
  { name: "type and city, EN", q: "office for lease in Riyadh", lang: "en", expect: { asset: "office", deal: "lease", city: "Riyadh" } },
  { name: "type and city, AR", q: "مكتب للإيجار في الرياض", lang: "ar", expect: { asset: "office", deal: "lease", city: "Riyadh" } },
  { name: "second city, EN", q: "warehouse in Jeddah", lang: "en", expect: { asset: "warehouse", city: "Jeddah" } },
  { name: "second city, AR", q: "مستودع في جدة", lang: "ar", expect: { asset: "warehouse", city: "Jeddah" } },
  // district, and the two developments
  { name: "district, EN", q: "office in Al Olaya", lang: "en", expect: { asset: "office", place: "Al Olaya" } },
  { name: "district, AR", q: "مكتب في العليا", lang: "ar", expect: { asset: "office", place: "Al Olaya" } },
  { name: "development, EN", q: "office in KAFD", lang: "en", expect: { asset: "office", place: "KAFD" } },
  { name: "development, AR", q: "مكتب في روشن فرونت", lang: "ar", expect: { asset: "office", place: "Roshn Front" } },
  // grade and fitout
  { name: "grade, EN", q: "grade A office", lang: "en", expect: { asset: "office", grade: "a" } },
  { name: "fitout, EN", q: "fitted office in Riyadh", lang: "en", expect: { asset: "office", fitout: "fitted", city: "Riyadh" } },
  // area
  { name: "area target, EN", q: "office around 350 m2", lang: "en", expect: { asset: "office", areaTarget: 350 } },
  { name: "area target, AR", q: "مكتب حوالي 350 متر", lang: "ar", expect: { asset: "office", areaTarget: 350 } },
  { name: "area maximum, EN", q: "office under 500 sqm", lang: "en", expect: { asset: "office", areaMax: 500 } },
  // price
  { name: "rent ceiling, EN", q: "office for lease under 1,200 sar/sqm", lang: "en", expect: { asset: "office", deal: "lease", priceMax: 1200 } },
  // nothing understood
  { name: "nothing understood, EN", q: "zzzz qqqq", lang: "en", expect: { asset: null, deal: null, city: null, place: null, empty: false } },
  { name: "empty string is not a query, EN", q: "   ", lang: "en", expect: { empty: true } },
]);

test("known queries: every row reads exactly what it promises, in both languages", () => {
  for (const row of KNOWN_QUERIES) {
    const p = parseQuery(row.q, VOCAB);
    const got: Record<string, unknown> = {
      asset: p.asset, deal: p.deal, grade: p.grade, fitout: p.fitout, city: p.city,
      place: p.place ? p.place.en : null,
      priceMax: p.priceMax, priceMin: p.priceMin,
      areaTarget: p.areaTarget, areaMin: p.areaMin, areaMax: p.areaMax,
      empty: p.empty, terms: p.terms,
    };
    for (const [k, want] of Object.entries(row.expect)) {
      assert.deepEqual(got[k], want, `${row.name} (${row.lang}): ${k} read as ${JSON.stringify(got[k])}, expected ${JSON.stringify(want)} from "${row.q}"`);
    }
  }
});

test("known queries: the set covers both languages and every axis the brief names", () => {
  const langs = new Set(KNOWN_QUERIES.map((r) => r.lang));
  assert.deepEqual([...langs].sort(), ["ar", "en"]);
  const axis = (k: keyof Row["expect"]) => KNOWN_QUERIES.some((r) => r.expect[k] != null && r.expect[k] !== false);
  for (const k of ["asset", "deal", "city", "place", "grade", "fitout", "areaTarget", "areaMax", "priceMax"] as const) {
    assert.ok(axis(k), `the known-query set has no row exercising ${k}`);
  }
  // Arabic is not a translation of the English rows, it is its own coverage.
  const arAxes = new Set(
    KNOWN_QUERIES.filter((r) => r.lang === "ar").flatMap((r) => Object.keys(r.expect).filter((k) => (r.expect as Record<string, unknown>)[k] != null))
  );
  for (const k of ["asset", "deal", "city", "place", "areaTarget"]) {
    assert.ok(arAxes.has(k), `no Arabic row exercises ${k}`);
  }
});

// --------------------------------------------------- the canonicalization matrix
//
// One result set, one canonical URL. The rows are grouped: everything inside a
// group renders the same page and must therefore declare the same canonical, and
// no two groups may collide.

const MATRIX: readonly { name: string; canonical: string; rows: readonly Record<string, string | undefined>[] }[] = Object.freeze([
  {
    name: "no place",
    canonical: "",
    rows: [
      {},
      { sort: "rent" },
      { asset: "office,retail", grade: "a", fit: "fitted", verified: "1" },
      { smin: "200", smax: "500", pmin: "800", pmax: "1200" },
      { bbox: "46.5,24.6,46.8,24.8" },
      { q: "office for lease in Riyadh", qx: "city" },
      { view: "insights" },
      { city: "" },
      { city: "Atlantis" },
      { place: "<script>" },
    ],
  },
  {
    name: "Riyadh, however it is spelled",
    canonical: "?city=Riyadh",
    rows: [
      { city: "Riyadh" },
      { city: "riyadh" },
      { city: "RIYADH" },
      { city: "  riyadh  " },
      { city: "ar riyadh" },
      { city: "al riyadh" },
      { city: "arriyadh" },
      { city: "الرياض" },
      { city: "riyadh", sort: "rent_desc" },
      { city: "riyadh", asset: "office", smin: "200", view: "insights", bbox: "46,24,47,25" },
    ],
  },
  {
    name: "Jeddah",
    canonical: "?city=Jeddah",
    rows: [{ city: "jeddah" }, { city: "جدة" }, { city: "jiddah" }],
  },
  {
    name: "a district, which outranks the city it sits in",
    canonical: "?district=d2",
    rows: [{ district: "d2" }, { district: "d2", city: "riyadh" }, { district: "d2", city: "Riyadh", place: "KAFD" }],
  },
  {
    name: "a free-text place, which ranks below both",
    canonical: "?place=Jeddah%20Corniche",
    rows: [{ place: "Jeddah Corniche" }, { place: "  Jeddah   Corniche " }],
  },
]);

test("canonicalization matrix: one result set declares one canonical URL", () => {
  for (const group of MATRIX) {
    for (const row of group.rows) {
      assert.equal(
        canonicalListingsQuery(row),
        group.canonical,
        `${group.name}: ${JSON.stringify(row)} declared ${canonicalListingsQuery(row)}`
      );
      assert.ok(sameCanonical(row, group.rows[0]));
    }
  }
});

test("canonicalization matrix: no two groups collide", () => {
  const seen = new Map<string, string>();
  for (const group of MATRIX) {
    const prior = seen.get(group.canonical);
    assert.equal(prior, undefined, `${group.name} and ${prior} both declare ${group.canonical || "the bare path"}`);
    seen.set(group.canonical, group.name);
  }
});

test("canonicalization is idempotent, which is what makes the back button safe", () => {
  // A canonical URL parsed back into parameters must canonicalise to itself.
  for (const group of MATRIX) {
    const q = canonicalListingsQuery(group.rows[0]);
    const back: Record<string, string> = {};
    new URLSearchParams(q.replace(/^\?/, "")).forEach((v, k) => { back[k] = v; });
    assert.equal(canonicalListingsQuery(back), q, `${group.name} does not survive a round trip`);
  }
});

test("the canonical path is the locale-free path localeMeta expects", () => {
  assert.equal(canonicalListingsPath({}), "/listings");
  assert.equal(canonicalListingsPath({ city: "riyadh" }), "/listings?city=Riyadh");
  assert.ok(!canonicalListingsPath({ city: "riyadh" }).startsWith("/en"));
});

test("only the place axis may appear in a canonical URL", () => {
  for (const group of MATRIX) {
    const q = canonicalListingsQuery(group.rows[0]);
    if (!q) continue;
    const keys = [...new URLSearchParams(q.replace(/^\?/, "")).keys()];
    assert.equal(keys.length, 1);
    assert.ok((CANONICAL_PLACE_KEYS as readonly string[]).includes(keys[0]), `${keys[0]} is not a canonical axis`);
  }
});

// ------------------------------------------- developments never become districts

test("a development carries its kind wherever its name is printed", () => {
  assert.equal(locationLabel("KAFD", "development", "project"), "KAFD · project");
  assert.equal(locationLabel("KAFD", "development", "مشروع"), "KAFD · مشروع");
  assert.equal(locationLabel("Al Olaya", "district", "project"), "Al Olaya");
  assert.equal(locationLabel("Al Olaya", "area", "project"), "Al Olaya");
  assert.equal(locationLabel("Al Olaya", null, "project"), "Al Olaya");
  assert.equal(locationLabel("", "development", "project"), "");
});

test("every surface that names the selected location asks for its kind", () => {
  // The map bubble and the filter panel already marked a development. These four
  // did not, and each one is a place where a reader is told what they filtered by.
  assert.ok(PAGE.includes("locationLabel("), "the listings page never calls locationLabel");
  // The location header and the breadcrumb share one value.
  assert.match(PAGE, /const crumbLoc = [^\n]*locationLabel\(/);
  // The metadata read selects the kind it needs to make that decision.
  assert.match(PAGE, /from\("districts"\)\s*\.select\("[^"]*kind[^"]*"\)/);
  // The parse chip.
  assert.match(PAGE, /key: "place", label: locationLabel\(/);
  // The bubble marker predates this slice and must stay.
  assert.ok(PAGE.includes('g.kind === "development"'));
  assert.ok(FILTERBAR.includes('k === "development"'));
});

test("a development is never counted as a district by the filter panel groups", () => {
  assert.ok(FILTERBAR.includes('development: ["Developments"'));
  assert.ok(FILTERBAR.includes('district: ["Districts"'));
  const devIdx = FILTERBAR.indexOf("development:");
  const distIdx = FILTERBAR.indexOf("district:");
  assert.ok(devIdx > -1 && distIdx > devIdx, "the kind table lost its separate development entry");
});

// ---------------------------------------------------------- parameter validation

test("a numeric parameter is a number or it is nothing", () => {
  assert.equal(numericParam("350"), 350);
  assert.equal(numericParam(" 350 "), 350);
  assert.equal(numericParam("350.5"), 350.5);
  assert.equal(numericParam("-5"), -5);
  assert.equal(numericParam("٣٥٠"), 350, "Arabic-Indic digits are digits");
  assert.equal(numericParam("۳۵۰"), 350, "Eastern Arabic-Indic digits are digits");
  for (const bad of ["abc", "", "   ", "0x10", "1e400", "1e3", "12abc", "1,200", "Infinity", "NaN", "--1", null, undefined]) {
    assert.equal(numericParam(bad as string), null, `${JSON.stringify(bad)} is not a number`);
  }
});

test("a measurement is never negative, and a negative one is dropped rather than clamped", () => {
  assert.equal(measureParam("0"), 0);
  assert.equal(measureParam("350"), 350);
  assert.equal(measureParam("-350"), null);
  assert.equal(measureParam("abc"), null);
});

test("the deal type is one of two values, never the string as written", () => {
  assert.equal(dealParam("lease"), "lease");
  assert.equal(dealParam("SALE"), "sale");
  assert.equal(dealParam(" sale "), "sale");
  assert.equal(dealParam("banana"), null);
  assert.equal(dealParam("<b>lease</b>"), null);
  assert.equal(dealParam(""), null);
  assert.deepEqual([...DEAL_VALUES], ["lease", "sale"]);
});

test("the sort is an ordering the page can actually run", () => {
  for (const s of SORT_VALUES) assert.equal(sortParam(s), s);
  assert.equal(sortParam("cheapest"), null);
  assert.equal(sortParam(""), null);
  assert.equal(sortParam(undefined), null);
});

test("a label may only name a value the platform recognises", () => {
  assert.equal(knownValue("office", ASSETS), "office");
  assert.equal(knownValue("banana", ASSETS), null);
  assert.equal(knownValue("", ASSETS), null);
  assert.equal(knownValue(undefined, ASSETS), null);
});

test("an unrecognised city is not a city", () => {
  assert.equal(canonicalCity("riyadh"), "Riyadh");
  assert.equal(canonicalCity("الرياض"), "Riyadh");
  assert.equal(canonicalCity("Atlantis"), null);
  assert.equal(canonicalCity(""), null);
  assert.equal(canonicalCity(undefined), null);
});

test("a place name printed into a title has to look like a place name", () => {
  assert.equal(safePlace("Jeddah Corniche"), "Jeddah Corniche");
  assert.equal(safePlace("  Jeddah   Corniche  "), "Jeddah Corniche");
  assert.equal(safePlace("كورنيش جدة"), "كورنيش جدة");
  assert.equal(safePlace("<script>alert(1)</script>"), null);
  assert.equal(safePlace('Riyadh" onload="x'), null);
  assert.equal(safePlace("{{7*7}}"), null);
  assert.equal(safePlace("a".repeat(61)), null);
  assert.equal(safePlace("12345"), null, "a number is not a place name");
  assert.equal(safePlace(""), null);
  assert.equal(safePlace("   "), null);
  assert.equal(safePlace(undefined), null);
});

test("a map viewport is four finite coordinates on this planet", () => {
  assert.deepEqual(bboxParam("46.5,24.6,46.8,24.8"), [46.5, 24.6, 46.8, 24.8]);
  assert.equal(bboxParam("46.5,24.6,46.8"), null);
  assert.equal(bboxParam("46.5,24.6,46.8,24.8,1"), null);
  assert.equal(bboxParam("a,b,c,d"), null);
  assert.equal(bboxParam("200,24,201,25"), null, "longitude past 180");
  assert.equal(bboxParam("46,91,47,92"), null, "latitude past 90");
  assert.equal(bboxParam(""), null);
  assert.equal(bboxParam(undefined), null);
});

// ------------------------------------------------------------- URL persistence

test("changing one control keeps every other choice", () => {
  const current = { city: "Riyadh", asset: "office", sort: "rent", q: "fitted", bbox: "46,24,47,25" };
  const next = mergeParams(current, { grade: "a" });
  assert.deepEqual(next, { city: "Riyadh", asset: "office", sort: "rent", q: "fitted", bbox: "46,24,47,25", grade: "a" });
});

test("an empty value clears a parameter rather than writing an empty one", () => {
  const next = mergeParams({ district: "d2", city: "Riyadh", asset: "office" }, { district: "", city: "", place: "" });
  assert.deepEqual(next, { asset: "office" });
  assert.ok(!toQuery(next).includes("district="));
});

test("parameter order is stable, so the back button returns to a URL the reader saw", () => {
  const a = mergeParams({ city: "Riyadh", asset: "office" }, { sort: "rent" });
  const b = mergeParams(a, { sort: "rent" });
  assert.deepEqual(Object.keys(a), Object.keys(b));
  assert.equal(toQuery(a), toQuery(b));
  assert.equal(toQuery(mergeParams(a, {})), toQuery(a));
});

test("a query string round trips through the parameter bag unchanged", () => {
  const params = { city: "Riyadh", asset: "office,retail", q: "مكتب في الرياض" };
  const back: Record<string, string> = {};
  new URLSearchParams(toQuery(params).replace(/^\?/, "")).forEach((v, k) => { back[k] = v; });
  assert.deepEqual(back, params);
});

test("the search box narrows rather than resets, and owns only its own two parameters", () => {
  const current = { city: "Riyadh", asset: "office", sort: "rent", view: "insights", q: "old text", qx: "city" };
  const carried = searchFormCarry(current).map(([k]) => k);
  assert.deepEqual(carried, ["city", "asset", "sort", "view"]);
  for (const k of SEARCH_FORM_OWNS) assert.ok(!carried.includes(k));
});

test("the page holds no state outside the URL, which is what the back button restores", () => {
  assert.ok(!PAGE.includes('"use client"'), "the listings page became a client component");
  assert.ok(!/\buseState\s*\(/.test(PAGE));
  assert.ok(!/\buseEffect\s*\(/.test(PAGE));
});

// -------------------------------------------------- the page uses these rules

test("the listings page canonicalises through this module, in both places", () => {
  assert.ok(PAGE.includes("canonicalListingsPath("), "generateMetadata builds its own canonical again");
  assert.ok(PAGE.includes("canonicalListingsQuery("), "the breadcrumb builds its own query again");
  assert.ok(
    !/encodeURIComponent\(searchParams\.city\)/.test(PAGE),
    "the raw city is still echoed into a URL"
  );
  assert.ok(!/\?city=\$\{/.test(PAGE), "a city query string is still assembled inline");
  assert.ok(!/\?district=\$\{/.test(PAGE), "a district query string is still assembled inline");
});

test("no figure or label reaches the head of the page straight from the URL", () => {
  const meta = PAGE.slice(PAGE.indexOf("export async function generateMetadata"), PAGE.indexOf("export default async function"));
  assert.ok(meta.includes("canonicalCity("), "the metadata city is not canonicalised");
  assert.ok(meta.includes("safePlace("), "the metadata place is not guarded");
  assert.ok(meta.includes("dealParam("), "the metadata deal is not validated");
  assert.ok(meta.includes("knownValue("), "the metadata asset is not validated");
  assert.ok(!/locLabel = searchParams\.place/.test(meta), "the raw place is still the title label");
});

test("every numeric parameter the page sends to the database is validated first", () => {
  // The defect was `Number(searchParams.smin)` reaching PostgREST as NaN.
  for (const p of ["smin", "smax", "pmin", "pmax", "spmin", "spmax", "sz", "rt", "sp"]) {
    assert.ok(
      !new RegExp(`Number\\(searchParams\\.${p}\\)`).test(PAGE),
      `searchParams.${p} still reaches Number() unguarded`
    );
  }
  assert.ok(PAGE.includes("measureParam("), "the page validates no measurement");
  assert.ok(PAGE.includes("bboxParam("), "the bbox guard did not move into the module");
});

test("an explicit sort wins over a proximity target, and the control shows what ran", () => {
  // `if (szT != null) shown.sort(...)` used to run before every sort branch, so
  // ?sz=350&sort=rent ordered by size while the pill read "Price, low to high".
  assert.match(PAGE, /const explicitSort = sortParam\(searchParams\.sort\)/);
  assert.match(PAGE, /if \(!explicitSort && szT != null\)/);
  // The filter bar is handed the sort that ran, not the raw parameter.
  assert.ok(PAGE.includes("activeSort={sort}"));
  assert.ok(FILTERBAR.includes("activeSort"));
  assert.ok(!/params\.sort \|\| sorts\[0\]\.value/.test(FILTERBAR), "the pill still reads the raw parameter");
});
