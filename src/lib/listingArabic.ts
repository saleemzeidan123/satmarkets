// PKG-LS1. Whether the Arabic on a listing still answers the English on it.
//
// PKG-NM1 closed the rendering half of finding 66: a reader whose language has no
// title is shown an honest description of the space instead of a reference code
// or the other language's sentence. It also began telling the lister, on their
// listings table and on their listing page, exactly what the other half of the
// market reads. What it could not do was give them anywhere to answer, because
// the edit form has one title field and one description field and both are
// English.
//
// This module holds the one piece of that answer that is a decision rather than a
// form control: given a stored Arabic field and the English it was written
// against, is it current, is it behind, or do we not know?
//
// WHY THE CALLER PASSES THE HASH IN.
//
// Staleness is decided by comparing `title_ar_src_hash` against the hash of the
// English on the row now. That is how `/api/listings/[id]/translate` decides what
// to rewrite, so this module must use the same comparison or the lister would be
// told one thing and the translator would do another. The hashing itself lives in
// `@/lib/translate/hash`, and the caller does it. Today the caller is the lister's
// manage page, which is a server component; the form it feeds is a client one and
// receives the answer as a boolean. Keeping the hash outside this module is what
// lets that stay true if the question is ever asked from the browser, and it is
// also what makes every case below testable without a crypto call in the fixture.
//
// WHAT THIS MODULE DELIBERATELY DOES NOT CLAIM.
//
// It never says who wrote the Arabic. The row carries `ar_translation_status`,
// which is one value for the whole listing, so on a row whose title was drafted
// by SAT and whose description was written by the lister it cannot be true of
// both. A hash cannot separate them either: when a lister saves their own Arabic,
// `PATCH /api/listings/[id]` stamps the same hash the translator would have
// stamped, and correctly so, because the point of the stamp is that a later
// translate run must not overwrite Arabic that answers the current English. So
// authorship is not derivable here and is not asserted here. Recorded as its own
// finding; the fix is per-field provenance, which is a schema change.
//
// "Behind the English" is a claim we can support from the record, and it is the
// one the lister actually needs: it is true regardless of who typed either
// sentence.

/**
 * The state of one Arabic field relative to its English.
 *
 * `absent`  nothing is stored, so a reader gets the description ladder.
 * `current` the stored Arabic was written against the English that is on the row.
 * `stale`   it was written against different English, so it may now describe a
 *           space in terms the English no longer uses.
 * `unknown` no source hash was ever recorded, so the question cannot be answered
 *           and nothing is said about it. Fail quiet, not fail confident.
 */
export type ArabicState = "absent" | "current" | "stale" | "unknown";

export type ArabicField = {
  /** The stored Arabic, as it sits in the column. */
  value?: string | null;
  /** The recorded hash of the English this Arabic was written against. */
  srcHash?: string | null;
  /** The English currently on the row. */
  english?: string | null;
  /** The hash of `english`, computed by the caller. See the header. */
  englishHash?: string | null;
};

const trimmed = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** See `ArabicState`. */
export function arabicState(f: ArabicField | null | undefined): ArabicState {
  if (!f) return "absent";
  if (!trimmed(f.value)) return "absent";
  // Arabic with no English cannot be behind anything, so it is current on its own
  // terms. This is the ordinary shape of a listing written in Arabic first.
  if (!trimmed(f.english)) return "current";
  const src = trimmed(f.srcHash);
  const now = trimmed(f.englishHash);
  if (!src || !now) return "unknown";
  return src === now ? "current" : "stale";
}

/**
 * Whether the lister should be shown the "this is behind the English" note.
 *
 * A separate name rather than a comparison at the call site, so the two surfaces
 * that show the note cannot drift apart, and so `unknown` is silent in both
 * without anybody having to remember that it should be.
 */
export function arabicIsBehind(f: ArabicField | null | undefined): boolean {
  return arabicState(f) === "stale";
}
