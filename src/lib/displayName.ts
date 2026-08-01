// PKG-NM1, finding 66's second half. What a ROW is called in the reader's
// language, when the row has a name in one language and not the other.
//
// `listingTitle.ts` closed this for one field, the listing title, and its header
// states the law it enforces: the other language's title is deliberately not a
// rung on the ladder. Nothing enforced that law anywhere else, and the same
// hand-written idiom survived in twenty-two files:
//
//   (ar ? x.name_ar : x.name_en) || x.name_en
//
// which hands an Arabic reader "Al Olaya" and calls it a translation.
//
// THE TWO POLICIES, AND WHY THEY DIFFER.
//
// A place name is a DESCRIPTION. When we do not hold it in the reader's
// language, we own a truthful alternative: the city, which is wider than the
// district and never false, and which we do hold in both languages. So a
// district never borrows: it widens. That is `placeName`.
//
// An account, lister or building name is an IDENTIFIER. "Olaya Towers" is what
// the building is called; there is no wider true form of it, and blanking it
// leaves the reader with nothing to recognise. Showing the one registered
// spelling we have is not a mistranslation, because nobody claimed it was a
// translation. So an entity does borrow, deliberately, once, here. That is
// `entityName`.
//
// The distinction is the whole point of this module. It is written down once so
// that a future call site inherits a decision rather than making one, and the
// source guard in `listingTitle.test.ts` makes both idioms unwritable by hand.
//
// NOT COVERED, DELIBERATELY. The `district_label` and `district_label_ar`
// columns on the rent index rows carry the same borrow in about twenty-five
// places, and they are NOT this module's business. That label names the
// geography a published third-party statistic describes. Widening it to a city
// would restate a band measured in one district as a band measured across a
// city, which is a false statement about someone else's figure, not a kinder
// rendering of our own. Recorded as its own finding.

import { cityLabel } from "@/lib/labels";

export type Loc = "en" | "ar";

/** The shape of a district row this module reads. */
export type PlaceRow = { name_en?: string | null; name_ar?: string | null; city?: string | null };

/** The shape of a named entity: an account, a lister, a building. */
export type NamedRow = { name_en?: string | null; name_ar?: string | null };

export const trimmedName = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * A district's name in the reader's language, its city when we do not hold the
 * name, or "" when we hold neither.
 *
 * Never the other language's name. See the header.
 */
export function placeName(d: PlaceRow | null | undefined, locale: Loc): string {
  if (!d) return "";
  const name = trimmedName(locale === "ar" ? d.name_ar : d.name_en);
  if (name) return name;
  return trimmedName(d.city) ? cityLabel(d.city, locale) : "";
}

/**
 * An entity's name in the reader's language, or the one spelling we hold.
 *
 * This is the authorized borrow, and the only one. An identifier has no wider
 * true form, so the choice is the registered spelling or nothing, and nothing
 * is worse: a message list whose counterpart column is blank tells the reader
 * less than one that says "Riyadh Holding" in Latin script.
 */
export function entityName(r: NamedRow | null | undefined, locale: Loc): string {
  if (!r) return "";
  const own = trimmedName(locale === "ar" ? r.name_ar : r.name_en);
  if (own) return own;
  return trimmedName(locale === "ar" ? r.name_en : r.name_ar);
}
