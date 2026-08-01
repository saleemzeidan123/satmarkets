// ADV-3A.1, finding 66. What a listing is called when it has no title in the
// reader's language.
//
// THE DEFECT THIS EXISTS TO KILL, found by putting the deployed Arabic advisor
// beside its English twin on the same search.
//
// English:  "Grade A floor, Al Olaya"
// Arabic:   "SATM-A0DC83D0"
//
// One row, two readers, and only one of them was told what the space is. Every
// card in the platform wrote the same idiom by hand:
//
//   const title = (ar ? l.title_ar : l.title_en) || l.reference_code;
//
// A reference code identifies a listing. It does not describe one. A row whose
// Arabic title has not been written yet is not thereby nameless: its asset type
// and its district are known, and they are exactly what the English sentence is
// made of.
//
// This class was already found once, and fixed once, in the share metadata of
// `listings/[id]/page.tsx`, whose comment reads "the Arabic share title read
// SATM-BB3FCB59 where the English one read a sentence". The fix stopped at that
// one function while fifteen other call sites kept the idiom, which is the same
// pattern `src/lib/market/attribution.ts` names: the gate held exactly where it
// was easy to hold. So this is a shared function with a source-tree guard, not
// another local repair, per Codex item 6: do not patch individual sentences.

import { assetLabel } from "@/lib/labels";
import { placeName, trimmedName as trimmed, type Loc, type PlaceRow } from "@/lib/displayName";
import { fillProse } from "@/lib/format";
import { getDictionary } from "@/i18n/getDictionary";

export type { Loc, PlaceRow };

/**
 * The part of a listing this file reads.
 *
 * Everything is optional because the callers select different columns, and a
 * card that was given less must still degrade to a description rather than to a
 * code. `districts` may arrive as an object or, from a PostgREST embed that the
 * caller did not constrain, as an array of one.
 */
export type TitledListing = {
  title_en?: string | null;
  title_ar?: string | null;
  asset_type?: string | null;
  reference_code?: string | null;
  districts?:
    | { name_en?: string | null; name_ar?: string | null; city?: string | null }
    | { name_en?: string | null; name_ar?: string | null; city?: string | null }[]
    | null;
};

/** The place a listing is in, in the reader's language, or "" when unknown. */
export function listingPlace(l: TitledListing, locale: Loc): string {
  return placeName(Array.isArray(l.districts) ? l.districts[0] : l.districts, locale);
}

/**
 * What to call this listing, in the reader's language.
 *
 * The ladder, in order, and the reason for each rung:
 *
 *   1. The title in the reader's own language. Nothing beats what the lister
 *      actually wrote.
 *   2. "{type} in {place}", the same sentence the share metadata already
 *      composes, from the same dictionary key, so a listing is called the same
 *      thing in a card, in a tab title and in a shared link.
 *   3. The asset type alone, when no district came with the row.
 *   4. The reference code, which is now genuinely last: it is reached only by a
 *      row with no title and no asset type, and no such row can be published.
 *
 * The other language's title is deliberately NOT a rung. Showing an Arabic
 * reader an English sentence is the same parity defect wearing a different
 * shirt, and it is worse than a short honest description because it looks like
 * a title someone chose.
 */
export function listingTitle(l: TitledListing | null | undefined, locale: Loc): string {
  if (!l) return "";
  const own = trimmed(locale === "ar" ? l.title_ar : l.title_en);
  if (own) return own;

  const type = trimmed(l.asset_type) ? assetLabel(String(l.asset_type), locale) : "";
  if (type) {
    const place = listingPlace(l, locale);
    if (place) return fillProse(getDictionary(locale).ld.metaTitleFallback, { type, place });
    return type;
  }
  return trimmed(l.reference_code);
}

/**
 * Whether the lister has written no title for this listing in this language.
 *
 * PKG-NM1. The ladder above means a reader is never shown a code and never
 * shown the wrong language, but it cannot invent the sentence the lister would
 * have written. The one person who can is the lister, and until now nothing
 * told them the gap existed: they wrote an English title, saw their listing
 * named correctly on their own screen, and never learned that an Arabic reader
 * was being handed a generic description of it.
 *
 * This is the same rule as PKG-AV2's availability line. Show the lister what
 * the other side reads, and leave the decision with them. SAT does not
 * translate the title for them, because a machine translation of a name is a
 * name SAT invented.
 */
export function titleMissingIn(l: TitledListing | null | undefined, locale: Loc): boolean {
  if (!l) return false;
  return !trimmed(locale === "ar" ? l.title_ar : l.title_en);
}
