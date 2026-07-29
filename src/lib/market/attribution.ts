// ADV-3A.1, owner ruling 2. The one place the Rent Index names its source.
//
// THE DEFECT THIS EXISTS TO KILL, found by reading the deployed Arabic advisor
// beside its English twin on the same question.
//
// Owner ruling 2: every Rent Index reference must retain the required
// attribution to the REGA Rental Index (Ejar). English obeyed it everywhere.
// Arabic did not obey it anywhere a sentence was composed at runtime, and it
// disobeyed differently in each of the three places:
//
//   src/lib/market/valueEvidence.ts   "مؤشر الإيجارات (إيجار)"
//   src/app/api/advisor/route.ts      "مؤشر الإيجار (إيجار)"
//   src/lib/market/analyser.ts        "المؤشر الإيجاري (إيجار)"
//
// Three spellings of one source, none of them naming the General Real Estate
// Authority, all of them facing a single fixed English form that does. An
// Arabic reader was shown a licensed figure attributed to a body the sentence
// never named, while the English reader on the identical question was shown the
// full attribution. That is the bilingual parity law and the attribution ruling
// failing in the same breath.
//
// The rule was already tested. `src/lib/claims.test.ts` asserts the canonical
// Arabic attribution, and `src/lib/attribution.test.ts` guards llms.txt and the
// legal copy, but both read SHIPPED DICTIONARY STRINGS. Every string above is
// composed in TypeScript at request time, so no dictionary gate could ever see
// it. The gate held exactly where it was easy to hold and the closure record
// claimed it held everywhere. That is this package's own defect class.
//
// So the source name is a constant here, imported by every composer, and the
// guard in attribution.test.ts scans the source tree rather than the
// dictionaries. A fourth composer added tomorrow with a fourth spelling fails
// the build.

/**
 * The Rent Index source, in both languages.
 *
 * Nothing may name this source in user-facing prose except through this
 * constant. The Arabic form is the canonical one already asserted by
 * `claims.test.ts` for the /about card and the `sourceRega` dictionary key, so
 * the composed sentences and the shipped copy now say the same words.
 */
export const RENT_INDEX_SOURCE = {
  en: "REGA Rental Index (Ejar)",
  ar: "المؤشر الإيجاري للهيئة العامة للعقار (إيجار)",
} as const;

/**
 * What the figures in that source are: averages of registered rental contracts.
 *
 * Kept separate from the name because the three call sites join them with
 * different punctuation, and because a sentence may legitimately name the
 * source without restating the basis.
 */
export const RENT_INDEX_BASIS = {
  en: "average of registered rental contracts",
  ar: "متوسط العقود المسجّلة",
} as const;

/**
 * The full source clause, name and basis, in the caller's language.
 *
 * @param ar   true for Arabic
 * @param sep  the joiner between name and basis. Defaults to the comma each
 *             language actually uses; pass ": " where the sentence reads as a
 *             label rather than as a list.
 */
export function rentIndexSource(ar: boolean, sep?: string): string {
  const joiner = sep ?? (ar ? "، " : ", ");
  return ar
    ? `${RENT_INDEX_SOURCE.ar}${joiner}${RENT_INDEX_BASIS.ar}`
    : `${RENT_INDEX_SOURCE.en}${joiner}${RENT_INDEX_BASIS.en}`;
}

/**
 * Resolve a stored `source` column to its display label.
 *
 * The column holds provenance keys such as "rcri" or "REGA Rental Index
 * (Ejar)". Anything recognisable as the Rent Index is rendered through the
 * canonical constant; anything else is passed through untouched, because a
 * source we do not recognise must not be relabelled as one we do.
 */
export function rentIndexSourceLabel(source: string | null | undefined, ar: boolean, sep?: string): string {
  const s = String(source ?? "");
  if (/rega|ejar|rcri/i.test(s)) return rentIndexSource(ar, sep);
  return s;
}
