// ADV-3A.1, findings 55, 56 and 57. What the advisor says about a search result,
// in both languages, in one testable place.
//
// This lived inside `useAdvisorChat`, a React hook, where no test could reach it,
// and it carried three faults that the live EN and AR exercise of the deployed
// site found in a single afternoon.
//
// The first is provenance of a constraint. The route composed the relaxation
// reason as an English sentence and the hook interpolated it. So an Arabic reader
// whose search had been widened was told, inside an otherwise Arabic sentence,
// that some results were "outside KAFD", in Latin script. Bilingual parity is not
// a translation of the finished sentence; it is both languages owning their own
// sentence and the server saying only which constraint moved.
//
// The second is the constraint itself. The route resolved the city the person
// typed into whichever district of that city sorted first, so the sentence named
// a district nobody had asked for. That is fixed in the route; this file exists
// so the wording can never reintroduce it, because the only place name it can
// print is the one the route says it actually applied.
//
// The third is agreement. `${results.length} مطابقة موثّقة` shipped and was
// photographed live reading "6 مطابقة موثّقة". The counted-noun formatter that
// closed finding 52 was applied across eight modules and this hook was not one of
// them, which is what happens when public prose lives somewhere no gate looks.
// This file is in the Arabic lint's file list.

import { formatCounted, formatInteger, formatWithUnit } from "@/lib/format";

export type Loc = "en" | "ar";

/** The place the route actually filtered by, named in both languages. */
export type SearchPlace = { kind: "district" | "city"; en: string; ar: string };

/** The part of the search response this file reads. */
export type SearchAnswer = {
  clarify?: boolean;
  relaxed?: boolean;
  relaxedBy?: "budget" | "size" | "place" | null;
  place?: SearchPlace | null;
  parsed?: { maxRent?: number | null } | null;
};

/**
 * Why the results are wider than the question, as a phrase that slots into
 * "some are ..." or "بعضها ...".
 *
 * Returns the generic phrase when the route named a constraint it cannot
 * describe: an unknown reason is stated as unknown, never guessed at.
 */
export function relaxReason(a: SearchAnswer, locale: Loc): string {
  const ar = locale === "ar";
  const cap = a.parsed?.maxRent;
  if (a.relaxedBy === "budget" && typeof cap === "number" && isFinite(cap)) {
    // PKG-FIG2, finding 129. Two more spellings of the lease unit, one per
    // language, and the Arabic one was unique on the platform: "ريال/م² سنوياً"
    // puts an adverb where every other Arabic surface puts the noun after a
    // middle dot. `formatWithUnit` also isolates the Arabic figure, which a
    // hand-built interpolation into an Arabic sentence did not.
    return ar
      ? `أعلى من سقف ${formatWithUnit(cap, "sar_sqm_year", "ar", "short", 0)}`
      : `above your ${formatWithUnit(cap, "sar_sqm_year", "en", "short", 0)} cap`;
  }
  if (a.relaxedBy === "size") return ar ? "أصغر من المساحة المطلوبة" : "smaller than the size you asked for";
  // The place is printed only from what the route applied. There is deliberately
  // no fallback that reaches for a district name from anywhere else.
  if (a.relaxedBy === "place" && a.place) {
    const name = ar ? a.place.ar : a.place.en;
    if (name) return ar ? `خارج ${name}` : `outside ${name}`;
  }
  return ar ? "خارج عوامل التصفية" : "outside your filters";
}

/**
 * True when the caller is holding back rows, so the sentence owes the reader
 * both numbers rather than silently picking one of them.
 */
const withheld = (count: number, total?: number): total is number =>
  typeof total === "number" && isFinite(total) && total > count;

/**
 * "of 7", in the caller's language, or nothing when nothing is withheld.
 *
 * "من أصل" is the ordinary Arabic for "out of", and it governs a bare numeral,
 * so no counted noun has to agree twice in one sentence.
 */
function ofTotal(total: number | undefined, count: number, ar: boolean): string {
  if (!withheld(count, total)) return "";
  return ar ? ` من أصل ${formatInteger(total, "ar")}` : ` of ${formatInteger(total, "en")}`;
}

/**
 * How many of the rendered rows carry the owner-verified badge, as a clause.
 *
 * THE CLAIM THIS EXISTS TO KILL (owner ruling 3, found by extending the claims
 * guard past `src/components` and `src/app`). The head sentence used to read
 * "7 verified matches, owner-verified and deduplicated" and, in Arabic,
 * "7 مطابقات موثّقة. التحقق من المالك مباشرة، بلا تكرار، مع سند الترخيص". Three
 * assertions, none of them supported by the query that produced the rows:
 *
 *   1. `/api/search` filters on `status = published` and on what the person
 *      asked for. It has never filtered on `ownership_verified`, so calling
 *      every returned row a verified match asserted a property of the corpus
 *      that the search did not select for. `src/lib/gate.ts` is the truth
 *      source and `ownerVerified` is `ownership_verified === true` alone.
 *   2. Deduplication is not measured anywhere in this repository.
 *   3. "مع سند الترخيص", a licence authorisation, is a permit claim. No listing
 *      row carries an advertising permit number.
 *
 * So the count now counts matches, which is what the search returned, and the
 * verified subset is reported separately and only when the caller counted it.
 * This is the same correction `726b72b` made to the home Owner-verified KPI: a
 * count has to count the thing its label names.
 *
 * Arabic takes a prepositional phrase rather than an adjective on purpose. An
 * adjective agrees with its noun, so a dual count would need a dual adjective,
 * and "بمالك موثّق" governs the badge rather than the count and is invariant.
 */
function verifiedClause(verified: number | undefined, ar: boolean): string {
  if (typeof verified !== "number" || !isFinite(verified) || verified < 0) return ".";
  if (verified === 0) return ar ? "، ولا واحدة بمالك موثّق." : ", none with a verified owner.";
  return ar
    ? `، منها ${formatInteger(verified, "ar")} بمالك موثّق.`
    : `, ${formatInteger(verified, "en")} with a verified owner.`;
}

/**
 * The whole sentence above a set of search results.
 *
 * `count` is passed rather than read off the answer because the caller renders
 * the rows it holds, and a sentence that counts something other than what is on
 * the screen is the same class of untruth as an invented figure.
 *
 * `total` is what the search actually matched, and it is optional only because a
 * caller that renders everything it was given has nothing to declare. THE DEFECT
 * THIS PARAMETER EXISTS TO KILL, found by exercising the deployed advisor in both
 * languages: the note read "7 verified matches" and "7 مطابقات موثّقة" above four
 * rows, because the hook passed the server total while the two renderers sliced
 * to four and to three. The formatter honoured the number it was given. Nobody
 * was counting the same thing.
 *
 * `verified` is how many of those same rendered rows carry the owner-verified
 * badge. It is optional because a caller that has not counted must not have a
 * claim invented on its behalf: an absent count prints no verification clause at
 * all, rather than defaulting to the flattering reading.
 */
export function searchNote(a: SearchAnswer, count: number, locale: Loc, total?: number, verified?: number): string {
  const ar = locale === "ar";
  if (a.clarify) {
    return ar
      ? "أخبرني بالمزيد، نوع المساحة أو المدينة أو الميزانية، وسأضيّق النطاق."
      : "Tell me a bit more, a space type, a city, or a budget, and I'll narrow it down.";
  }
  if (a.relaxed && count > 0) {
    const why = relaxReason(a, locale);
    const of = ofTotal(total, count, ar);
    return ar
      ? `لا توجد مطابقات تامة، فإليك أقرب ${formatCounted(count, "result", "ar", { oblique: true })}${of}، بعضها ${why}. عدّل الميزانية أو المساحة أو الموقع للتضييق.`
      : `No exact matches, so here are the closest ${formatCounted(count, "result", "en")}${of}, some are ${why}. Adjust the budget, size, or location to tighten it.`;
  }
  if (count > 0) {
    const head = `${formatCounted(count, "match", locale)}${verifiedClause(verified, ar)}`;
    if (!withheld(count, total)) return head;
    // The leading count is what is on the screen. This sentence is the only place
    // the larger number may appear, and it says plainly which of the two it is.
    // English drops the leading numeral at one, because "These are the closest 1
    // result of 7" is not a sentence anyone writes.
    const of = ofTotal(total, count, ar);
    if (ar) return `${head} هذه أقرب ${formatCounted(count, "result", "ar", { oblique: true })}${of}.`;
    return count === 1
      ? `${head} This is the closest result${of}.`
      : `${head} These are the closest ${formatCounted(count, "result", "en")}${of}.`;
  }
  return ar
    ? "لا توجد مطابقات لذلك بعد. جرّب موقعاً أو مساحة أو ميزانية مختلفة وسأبحث مجدداً."
    : "No matches yet for that. Try a different location, size, or budget and I'll search again.";
}
