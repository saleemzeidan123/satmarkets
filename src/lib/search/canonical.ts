// PKG-E1-READINESS slice C, WS16. What a /listings URL means, stated once.
//
// THE DEFECTS THIS EXISTS TO KILL, all four found by reading the page against
// itself rather than against a specification.
//
// 1. The page canonicalised the city in its body and echoed it raw in its head.
//    `src/app/[locale]/listings/page.tsx` reads the city through `cityKey`, so
//    `?city=riyadh`, `?city=Riyadh`, `?city=RIYADH` and `?city=الرياض` all render
//    one identical result set. `generateMetadata` did not: it built
//    `?city=${encodeURIComponent(searchParams.city)}` straight from the URL, so
//    those four requests declared four different canonical URLs and four
//    different three-entry hreflang sets for one page. `crumbQs`, which feeds the
//    `item` of the BreadcrumbList structured data, carried the identical bug.
//    Owner ruling 5 named the display half of this defect and it was closed in
//    b3e2dfa. This is the canonical half of the same defect.
//
// 2. A label rendered into a title, a description or structured data was echoed
//    from the URL. `dealLabel`, `assetLabel` and `cityLabel` all end in `?? t`
//    or `prettifyKey(t)`, which is correct for a database value we have not
//    translated yet and wrong for a query string a stranger wrote. `?deal=banana`
//    put "banana" in the `<title>`, the `og:title` and the meta description of a
//    public page. `?place=` put whatever followed it in the same three places and
//    in the BreadcrumbList `name`. React and Next escape all of it, so this was
//    never script injection; it was the page making a claim about a place it had
//    never heard of, which is the same failure class as an unattributed figure.
//
// 3. Numeric parameters reached the database unvalidated. `Number("abc")` is NaN
//    and `NaN != null` is true, so `?sz=abc` started a proximity sort whose
//    comparator returned NaN for every pair, and `?smin=abc` sent
//    `gte("area_sqm", NaN)` to PostgREST. `bbox` was the one parameter with a
//    guard, and that guard is the shape the rest now copy.
//
// 4. A development was named back to the reader as a bare place. The picker and
//    the map bubbles both mark one (`" · project"`, under a "Developments"
//    heading), and the location header, the breadcrumb and the parse chip did
//    not. Selecting Roshn Front from the Developments group produced a page whose
//    URL says `district=` and whose heading says "Roshn Front". Developments are
//    not districts is a platform law, so the marker travels with the name
//    wherever the name is printed.
//
// Every rule here is a plain function over strings so that
// `src/lib/search/knownQueries.test.ts` can hold the whole matrix without a
// browser, a database or a rendered page.

import { cityKey } from "@/lib/labels";

/** The only shape this module needs from a `/listings` search parameter bag. */
export type ListingsParams = Readonly<Record<string, string | undefined>>;

/** The deal types the exchange holds. Anything else is not a deal type. */
export const DEAL_VALUES = ["lease", "sale"] as const;
export type DealValue = (typeof DEAL_VALUES)[number];

/**
 * The orderings the page can actually run.
 *
 * `best` is the value score against the published index, and it is also the name
 * the page gives to a proximity ordering, because "nearest to the exact size you
 * asked for" is a best match. The sort control is handed this computed value
 * rather than the raw parameter, so a pill can no longer read "Newest" over a
 * list ordered by closeness to 350 m².
 */
export const SORT_VALUES = ["new", "rent", "rent_desc", "size", "size_desc", "best"] as const;
export type SortValue = (typeof SORT_VALUES)[number];

/**
 * The parameters that may appear in a canonical `/listings` URL, in the order
 * they take precedence.
 *
 * Nothing else belongs there. A sort is a presentation of one set of results, a
 * price band is a slice of it, and a map viewport is a scroll position; none of
 * them is a different page, so none of them may declare a different canonical
 * URL. Place is the one axis that changes what the page is about.
 */
export const CANONICAL_PLACE_KEYS = ["district", "city", "place"] as const;

/** Arabic-Indic and Eastern Arabic-Indic digits, folded before any numeric test. */
const AR_DIGITS = /[٠-٩۰-۹]/g;
function foldDigits(s: string): string {
  return s.replace(AR_DIGITS, (d) => {
    const c = d.charCodeAt(0);
    return String(c >= 0x06f0 ? c - 0x06f0 : c - 0x0660);
  });
}

/**
 * A numeric URL parameter, or null when the string is not a number.
 *
 * Deliberately stricter than `Number`. `Number("")` is 0, `Number(" ")` is 0,
 * `Number("0x10")` is 16 and `Number("1e400")` is Infinity, and every one of
 * those is a number the person did not type. Only a plain decimal, optionally
 * signed, counts.
 */
export function numericParam(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  const s = foldDigits(String(raw)).trim();
  if (!s || !/^[+-]?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * A measurement parameter: an area, a rent or a price.
 *
 * A negative area is not a small area, it is not an area, so it is dropped
 * rather than clamped. Clamping would answer a question nobody asked.
 */
export function measureParam(raw: string | undefined | null): number | null {
  const n = numericParam(raw);
  return n != null && n >= 0 ? n : null;
}

/** The deal type, or null. Never the string as written. */
export function dealParam(raw: string | undefined | null): DealValue | null {
  const s = (raw ?? "").trim().toLowerCase();
  return (DEAL_VALUES as readonly string[]).includes(s) ? (s as DealValue) : null;
}

/** The sort, or null when the parameter names an ordering the page cannot run. */
export function sortParam(raw: string | undefined | null): SortValue | null {
  const s = (raw ?? "").trim();
  return (SORT_VALUES as readonly string[]).includes(s) ? (s as SortValue) : null;
}

/**
 * A member of a closed vocabulary, or null.
 *
 * Used for the metadata label only. The QUERY keeps the value as written on
 * purpose: `in("asset_type", ["banana"])` returns nothing, and returning nothing
 * is the true answer to a request for a type we do not hold. Dropping the
 * constraint instead would return every listing on the exchange, which is the
 * "silently widen" half of the fault `src/lib/search/place.ts` records.
 */
export function knownValue(raw: string | undefined | null, allowed: readonly string[]): string | null {
  const s = (raw ?? "").trim();
  return s && allowed.includes(s) ? s : null;
}

/**
 * The canonical form of a city parameter, or null when we do not hold that city.
 *
 * `cityKey` folds spelling, case, transliteration and Arabic, so the four
 * spellings of Riyadh collapse to one key. An unrecognised city returns null and
 * therefore never reaches a canonical URL or a title: the page holds no
 * districts in it, renders nothing for it, and must not declare a page about it.
 */
export function canonicalCity(raw: string | undefined | null): string | null {
  const s = (raw ?? "").trim();
  return s ? cityKey(s) : null;
}

/**
 * A free-text place name that is safe to print back.
 *
 * `place` is the one parameter whose values come from outside our own
 * vocabulary: the location picker fills it from `/api/places`, so it can name
 * somewhere real that the districts table does not hold. That is a legitimate
 * state and the page already discloses it ("no spaces in {place} yet"), so the
 * name is kept rather than dropped. What it is not allowed to be is arbitrary:
 * a place name is short, has a letter in it, and carries no markup punctuation
 * or control characters. A string failing any of those is not a place name, and
 * a page that prints it into a title is asserting something it cannot support.
 */
const PLACE_MAX = 60;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;
const MARKUP = /[<>{}[\]|\\^`"]/;
const HAS_LETTER = /[A-Za-z؀-ۿ]/;
export function safePlace(raw: string | undefined | null): string | null {
  const s = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!s || s.length > PLACE_MAX) return null;
  if (CONTROL.test(s) || MARKUP.test(s)) return null;
  return HAS_LETTER.test(s) ? s : null;
}

/**
 * A map viewport, or null.
 *
 * This is the guard that was already on the page, moved here so a test can call
 * it, plus the bound it was missing: a latitude outside plus or minus 90 and a
 * longitude outside plus or minus 180 are not a viewport. Winding order is NOT
 * checked. A box whose west edge is east of its east edge simply contains
 * nothing, and returning nothing is the honest answer to it.
 */
export function bboxParam(raw: string | undefined | null): [number, number, number, number] | null {
  if (!raw) return null;
  const parts = String(raw).split(",");
  if (parts.length !== 4) return null;
  const n = parts.map((p) => numericParam(p));
  if (n.some((v) => v == null)) return null;
  const [w, s, e, no] = n as number[];
  if (Math.abs(w) > 180 || Math.abs(e) > 180 || Math.abs(s) > 90 || Math.abs(no) > 90) return null;
  return [w, s, e, no];
}

/**
 * The query string of the canonical URL for a `/listings` request.
 *
 * Returns "" or exactly one parameter. Both `generateMetadata` and the
 * breadcrumb call this, which is the point: the two used to build the same
 * string twice, four lines apart in one file, and they disagreed with the body
 * of the page in the same way at the same time.
 */
export function canonicalListingsQuery(sp: ListingsParams): string {
  if (sp.district) return `?district=${encodeURIComponent(sp.district)}`;
  const city = canonicalCity(sp.city);
  if (city) return `?city=${encodeURIComponent(city)}`;
  const place = safePlace(sp.place);
  if (place) return `?place=${encodeURIComponent(place)}`;
  return "";
}

/** The canonical path, locale excluded, for `localeMeta`. */
export function canonicalListingsPath(sp: ListingsParams): string {
  return `/listings${canonicalListingsQuery(sp)}`;
}

/**
 * A location named back to the reader, carrying its kind.
 *
 * `projectWord` is passed in rather than held here because it is prose and prose
 * lives in `src/i18n/dictionaries`. The caller supplies `dl.project`, which is
 * the same string the map bubbles already append.
 */
export function locationLabel(name: string, kind: string | null | undefined, projectWord: string): string {
  return kind === "development" && name ? `${name} · ${projectWord}` : name;
}

/**
 * Whether two `/listings` URLs are the same page.
 *
 * Used by the canonicalization matrix: every row that renders one result set
 * must resolve to one canonical query, and two rows that render different result
 * sets must not.
 */
export function sameCanonical(a: ListingsParams, b: ListingsParams): boolean {
  return canonicalListingsQuery(a) === canonicalListingsQuery(b);
}

// --------------------------------------------------------- URL persistence
//
// Every control on /listings navigates: the filter pills push a URL, the view
// chips are links, the search box is a GET form. That is deliberate and it is
// what makes the back button work, because a page whose entire state is in its
// URL has nothing to lose when the browser restores an earlier one. The rules
// below are the two places that could break it, and they are here rather than
// inline so a test can call them instead of reading JSX.

/**
 * The parameters a control change carries forward, with the change applied.
 *
 * An empty value REMOVES a key rather than writing `key=`, which is how a
 * "clear" is expressed by every caller: `nav({ district: "", city: "", place: "" })`.
 * Everything not named in the patch survives untouched, so choosing a grade does
 * not silently drop the city, the sort or the map viewport the reader already
 * chose. Key order follows the current parameters first, then anything the patch
 * introduces, so a URL stays stable under repeated edits and the back button
 * returns to a string the reader has actually seen.
 */
export function mergeParams(
  current: Readonly<Record<string, string | undefined>>,
  patch: Readonly<Record<string, string | undefined>> = {}
): Record<string, string> {
  const out: Record<string, string> = {};
  const keys = [...Object.keys(current), ...Object.keys(patch).filter((k) => !(k in current))];
  for (const k of keys) {
    const v = k in patch ? patch[k] : current[k];
    if (v != null && String(v) !== "") out[k] = String(v);
  }
  return out;
}

/** A parameter bag as a query string, "" when empty, with the leading "?" included. */
export function toQuery(params: Readonly<Record<string, string | undefined>>): string {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : "";
}

/**
 * The parameters the search form re-emits as hidden inputs.
 *
 * A GET form submits only the fields it carries, so without these, typing a
 * sentence discarded the deal, city, district, grade, fitout, facet, sort and map
 * area the reader had already chosen. `q` is excluded because the visible input
 * supplies it, and `qx` because a withdrawn reading belongs to the sentence it
 * was withdrawn from: a new search starts from the whole parse.
 */
export const SEARCH_FORM_OWNS = ["q", "qx"] as const;
export function searchFormCarry(params: Readonly<Record<string, string>>): [string, string][] {
  return Object.entries(params).filter(([k]) => !(SEARCH_FORM_OWNS as readonly string[]).includes(k));
}
