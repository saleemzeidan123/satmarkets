// PKG-DATA-1. Registered commercial leases by district, from official open data.
//
// WHAT THIS IS. The Real Estate General Authority publishes, each quarter and
// for each region, a file of rental indicators on the National Open Data
// Platform: one row per city, district and property type, with the number of
// lease contracts registered in the quarter. This module reads the commercial
// rows of one such file, already reduced to `src/data/leasingActivity.json` by
// `scripts/build-leasing-activity.mjs`, and answers one question: how many
// office, shop and showroom contracts does the file record for a district the
// platform covers.
//
// WHAT THIS IS NOT. It is not a rent. Every commercial row in the official file
// holds 0 in both rent columns, the generator refuses a file where that is not
// so, and nothing here has a field a rent could travel in. It is also not a
// total, a share or a rank: the regulatory register holds derived market
// figures until open decision O13 is answered, so this module returns the
// source's own figures, one per district and type, and adds nothing up.
//
// WHY THE MATCH IS BY NAME. The file names a district in Arabic and carries no
// identifier the platform shares. A district is therefore matched on its Arabic
// name inside its city, after the light normalisation below, and a platform
// district the file does not name is simply absent. Absent is the honest state:
// it means "not in the file under the name we hold", not "no leases".

import data from "@/data/leasingActivity.json";

export type LeasingKind = "office" | "shop" | "showroom";

/** Contracts registered in the quarter. Null where the file has no row for that type. */
export type LeasingCounts = Record<LeasingKind, number | null>;

export type LeasingRow = LeasingCounts & {
  /** The platform's English name for the district. */
  en: string;
  /** The platform's Arabic name for the district. */
  ar: string;
};

/** The platform's own district record, as far as this module needs it. */
export type PlatformDistrict = { name_en: string; name_ar: string; city: string };

type RawRow = [string, number | null, number | null, number | null];
const CITIES = data.cities as unknown as Record<string, RawRow[]>;

/** The dataset, its publisher and its licence, for the notice the licence requires. */
export const LEASING_DATASET = {
  title: data.dataset.title,
  titleAr: data.dataset.titleAr,
  url: data.dataset.url,
  licenceUrl: data.licence.url,
  period: data.period,
} as const;

/**
 * The platform's city key to the file's name for the same city.
 *
 * One entry, because one region's file is loaded and the platform covers one
 * city in it. A second file adds its cities here; a city with no entry matches
 * nothing, which is the failing default.
 */
const CITY_IN_FILE: Record<string, string> = {
  Riyadh: /* i18n-exempt */ "الرياض",
};

/** The region and city of the bundled file, as the file writes them, for the reader of loaded quarters. */
export const BUNDLED_PLACE = { region: data.region, city: /* i18n-exempt */ "الرياض" } as const;

/** One file's districts for one city: district, office, shop, showroom. */
export type CityRows = readonly (readonly [string, number | null, number | null, number | null])[];

/**
 * A district name reduced to what two honest spellings of it share.
 *
 * Marks and elongation are dropped, the hamza forms of alef are folded, a final
 * alef maqsura is read as ya, runs of space collapse, and a leading "حي"
 * (the word "district" itself) is removed. Nothing else: this is not a fuzzy
 * match, and two names that differ by a letter stay different.
 */
export function normaliseDistrictName(name: string): string {
  return name
    .normalize("NFC")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^حي /, "");
}

/** The file's districts for one of its cities, keyed by normalised name. */
function indexCity(cityInFile: string, loaded?: Record<string, CityRows>): Map<string, LeasingCounts> {
  const out = new Map<string, LeasingCounts>();
  for (const [district, office, shop, showroom] of (loaded ?? CITIES)[cityInFile] ?? []) {
    out.set(normaliseDistrictName(district), { office, shop, showroom });
  }
  return out;
}

/**
 * The file's figures for the platform districts it names, in the order given.
 *
 * A district the file does not name is left out. The caller decides the order
 * of what comes back; this function does not sort, because the order a reader
 * sees is a presentation choice and belongs beside the presentation.
 *
 * `loaded` is a later quarter the weekly job stored, keyed by the file's city
 * name. When it is given, it is the whole answer: the bundled quarter is not
 * mixed in, so a row can never come from two files.
 */
export function leasingActivityFor(districts: readonly PlatformDistrict[], loaded?: Record<string, CityRows>): LeasingRow[] {
  const byCity = new Map<string, Map<string, LeasingCounts>>();
  const rows: LeasingRow[] = [];
  const seen = new Set<string>();
  for (const d of districts) {
    const cityInFile = CITY_IN_FILE[d.city];
    if (!cityInFile || !d.name_ar) continue;
    let index = byCity.get(cityInFile);
    if (!index) { index = indexCity(cityInFile, loaded); byCity.set(cityInFile, index); }
    const key = normaliseDistrictName(d.name_ar);
    const counts = index.get(key);
    if (!counts || seen.has(cityInFile + "|" + key)) continue;
    seen.add(cityInFile + "|" + key);
    rows.push({ en: d.name_en, ar: d.name_ar, ...counts });
  }
  return rows;
}

/** The largest figure in a column, for scaling that column's bars. Zero when empty. */
export function columnMax(rows: readonly LeasingRow[], kind: LeasingKind): number {
  return rows.reduce((m, r) => Math.max(m, r[kind] ?? 0), 0);
}
