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

import { formatCounted, formatInteger } from "@/lib/format";

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
    return ar
      ? `أعلى من سقف ${formatInteger(cap, "ar")} ريال/م² سنوياً`
      : `above your ${formatInteger(cap, "en")} SAR/m²·yr cap`;
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
 * The whole sentence above a set of search results.
 *
 * `count` is passed rather than read off the answer because the caller renders
 * the rows it holds, and a sentence that counts something other than what is on
 * the screen is the same class of untruth as an invented figure.
 */
export function searchNote(a: SearchAnswer, count: number, locale: Loc): string {
  const ar = locale === "ar";
  if (a.clarify) {
    return ar
      ? "أخبرني بالمزيد، نوع المساحة أو المدينة أو الميزانية، وسأضيّق النطاق."
      : "Tell me a bit more, a space type, a city, or a budget, and I'll narrow it down.";
  }
  if (a.relaxed && count > 0) {
    const why = relaxReason(a, locale);
    return ar
      ? `لا توجد مطابقات تامة، فإليك أقرب ${formatCounted(count, "result", "ar", { oblique: true })}، بعضها ${why}. عدّل الميزانية أو المساحة أو الموقع للتضييق.`
      : `No exact matches, so here are the closest ${formatCounted(count, "result", "en")}, some are ${why}. Adjust the budget, size, or location to tighten it.`;
  }
  if (count > 0) {
    // The descriptors are verbal nouns in Arabic on purpose: an adjective would
    // have to agree with the count, and the dual would then be wrong.
    return ar
      ? `${formatCounted(count, "verifiedMatch", "ar")}. التحقق من المالك مباشرة، بلا تكرار، مع سند الترخيص.`
      : `${formatCounted(count, "verifiedMatch", "en")}, owner-verified and deduplicated.`;
  }
  return ar
    ? "لا توجد مطابقات موثّقة لذلك بعد. جرّب موقعاً أو مساحة أو ميزانية مختلفة وسأبحث مجدداً."
    : "No verified matches yet for that. Try a different location, size, or budget and I'll search again.";
}
