// ADV-3A.1, finding 55. Which place a search actually filtered by.
//
// THE DEFECT THIS EXISTS TO KILL, recorded exactly as the live site produced it.
//
// A person typed "warehouse for lease in Riyadh" into the deployed advisor and
// was answered with: "No exact matches, so here are the closest 6, some are
// outside KAFD." They never typed KAFD. They named a city of some eight million
// people and the platform silently replaced it with one district of that city.
//
// The mechanism was three lines in the route. The district matcher's fallback
// branch tested the query against the districts table's `city` COLUMN, `.find`
// returns the first row that satisfies the predicate, and the resulting filter
// was `.eq("district_id", <that first row>)`. Every Riyadh query in English
// therefore collapsed to whichever Riyadh district happened to sort first.
//
// The Arabic half failed the opposite way and was worse. "الرياض" matches no
// district's Arabic name and contains no Latin text, so nothing matched, no place
// filter was applied at all, and a query for Riyadh came back holding a Dammam
// listing. One fault, two faces: invent a constraint the person did not give, or
// drop the one they did.
//
// This module is separate from the route for the reason `aiParse.ts` is: a route
// module may only export HTTP handlers, so anything left inside it cannot be
// tested, and an untestable place resolver is what shipped.
//
// The asymmetry between city and district here is deliberate and is the discovery
// law, not an accident of what was easy. The city vocabulary is closed, finite
// and already published on public surfaces, so recognising one is recognition. A
// district vocabulary is open and lives in the database, so guessing one from a
// word list is the silent upgrade of an unrecognised term into a constraint.

import { cityKey, cityLabel } from "@/lib/labels";
import { placeName } from "@/lib/displayName";

export type DistrictRow = { id: string | number; name_en?: string | null; name_ar?: string | null; city?: string | null };

export type ResolvedPlace = {
  /** The single district the query named, if it named one. */
  district: DistrictRow | null;
  /**
   * Every district id belonging to the city the query named, when a city was
   * named and no district was.
   *
   * An EMPTY ARRAY is an answer, not a missing filter: it says we hold no
   * districts in that city. The caller must keep filtering by it, so the search
   * returns nothing and relaxes honestly, rather than treating an empty list as
   * "no place was asked for" and widening to every city we do hold.
   */
  cityDistrictIds: string[] | null;
  /** What to name in a sentence, in both languages. Null when nothing was applied. */
  applied: { kind: "district" | "city"; en: string; ar: string } | null;
};

/**
 * District spellings the districts table does not carry.
 *
 * These are all districts, and every one of them is a name people actually type
 * for a place that exists in the table under another spelling. Nothing here maps
 * a city to a district, and nothing may be added that does.
 */
export const DISTRICT_SYN: Record<string, string> = {
  kafd: "KAFD",
  cafd: "KAFD",
  "كافد": "KAFD",
  "واجهة الرياض المالية": "KAFD",
  "المركز المالي": "KAFD",
  olaya: "Al Olaya",
  "al olaya": "Al Olaya",
  "العليا": "Al Olaya",
  hittin: "Hittin",
  "حطين": "Hittin",
  granada: "Granada",
  "غرناطة": "Granada",
  itcc: "ITCC",
  "روشن": "Roshn Front",
  roshn: "Roshn Front",
};

/**
 * Resolve the place a query named against the districts we hold.
 *
 * @param raw          the query as typed, unfolded, because the Arabic name test
 *                     compares against stored Arabic
 * @param wantedInput  a district name the parser produced, or null
 * @param city         a canonical city key the parser produced, or null
 */
export function resolvePlace(
  raw: string,
  wantedInput: string | null,
  city: string | null,
  districts: readonly DistrictRow[] | null | undefined
): ResolvedPlace {
  const rows = districts ?? [];
  const rawLower = raw.toLowerCase();
  let wanted = (wantedInput || "").toLowerCase().trim();
  for (const [k, v] of Object.entries(DISTRICT_SYN)) {
    if ((wanted && wanted.includes(k)) || rawLower.includes(k)) {
      wanted = v.toLowerCase();
      break;
    }
  }

  // The empty-string guards matter: `"anything".includes("")` is true, so a row
  // with a null English name used to match every query ever typed and win by
  // being first.
  const district =
    rows.find((d) => {
      const ne = (d.name_en || "").toLowerCase();
      const na = d.name_ar || "";
      if (wanted) return (!!ne && (wanted.includes(ne) || ne.includes(wanted))) || (!!na && raw.includes(na));
      return (!!ne && rawLower.includes(ne)) || (!!na && raw.includes(na));
    }) ?? null;

  // A district the person actually named is more specific than the city that
  // contains it, so the city applies only when no district matched.
  const canonicalCity = city ? cityKey(city) : null;
  const cityDistrictIds =
    !district && canonicalCity ? rows.filter((d) => cityKey(d.city) === canonicalCity).map((d) => String(d.id)) : null;

  const applied: ResolvedPlace["applied"] = district
    ? { kind: "district", en: placeName(district, "en"), ar: placeName(district, "ar") }
    : cityDistrictIds
      ? { kind: "city", en: cityLabel(canonicalCity, "en"), ar: cityLabel(canonicalCity, "ar") }
      : null;

  return { district, cityDistrictIds, applied };
}
