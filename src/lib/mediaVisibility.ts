// PKG-LISTING-CREATION-1B. The one rule for what an anonymous, public reader
// may ever see of a listing's media, and the one place it is written.
//
// WHY THIS EXISTS, SEPARATELY FROM THE MIGRATION THAT ADDED THE COLUMNS.
//
// 20260902b_pkg1b_media_categorization.sql gave listing_media a visibility
// column (public | private) and a moderation_state column (unreviewed |
// flagged | removed), and gave visibility an honest default: 'public',
// matching the actual, already-live behaviour of the public listing page
// (no visibility filter existed anywhere in it). A migration that records a
// true default is not the same thing as a feature that enforces it. Nothing
// stops a future row, or a future admin action, from ever setting
// visibility to 'private' or moderation_state to 'removed'; when that
// happens, this is the rule that must already be in force everywhere a
// stranger to the listing can read its media, not a rule someone has to
// remember to add later.
//
// THE RULE.
//
// A row is publicly visible when, and only when, its visibility is
// 'public' AND its moderation_state is not 'removed'. 'unreviewed' (the
// default, and today the ONLY state any real moderation action has ever
// produced, since none exists yet) stays visible: nothing in this codebase
// reviews media before publication, and treating "never reviewed" as
// "hidden" would take down every photo ever uploaded. 'flagged' also stays
// visible: a flag is a pending concern, not a decision, and it is 'removed'
// alone that a real moderation action can use to actually take something
// down. If a future package (LST-6 or equivalent) adds a real publication-
// review gate, that is a product decision to change THIS rule, made once,
// here, not a second copy of it grown independently on some other route.
//
// EVERY PUBLIC OR ANONYMOUS CONSUMER OF listing_media MUST GO THROUGH THIS.
// mediaVisibility.test.ts enumerates every file that reads listing_media at
// all and asserts each one either applies this rule or is on an explicit,
// reasoned allowlist of ownership-scoped surfaces (the dashboard, the
// Studio, the reviewer routes) that read their own or a reviewed listing's
// data regardless of visibility, by design. A new public-facing file that
// queries listing_media and does neither fails that test, on purpose.

export const PUBLIC_MEDIA_VISIBILITY = "public";
export const HIDDEN_MODERATION_STATE = "removed";

// CORRECTION, security closure, second adversarial review: this rule was
// previously visibility/moderation_state only. That left a real gap: a
// forged row (inserted directly, bypassing the upload route entirely) or
// a genuinely pending, not-yet-finalized row could satisfy visibility=
// public and moderation_state<>removed and still be treated as valid
// public media by this rule, even though its underlying storage object
// was already correctly unreachable (20260912b/c_pkg1b_*.sql's own
// trust gate). A denied object must never leave its own metadata record
// presented as valid public media: derivation_verified/is_legacy_media
// (20260912b_pkg1b_media_trusted_object_binding.sql) are now part of the
// rule itself, matching the real RLS table policy
// (20260912d_pkg1b_media_row_visibility_boundary.sql) and the real
// storage policy (20260912c_pkg1b_storage_originals_read_boundary.sql)
// exactly. Valid legacy media (is_legacy_media=true) and a genuine
// finalized upload (derivation_verified=true) are both still eligible,
// unchanged; only a forged or not-yet-finalized row is newly excluded
// here, matching what the database already independently enforces.
export interface MediaVisibilityRow {
  visibility: string;
  moderation_state: string;
  derivation_verified: boolean;
  is_legacy_media: boolean;
}

/** The rule, as a predicate, for a row already fetched (defence in depth: a
 * caller that also applied scopeToPublicMedia() at the query level should
 * never see a row that fails this, but a query is not a proof). */
export function isPubliclyVisibleMedia(row: MediaVisibilityRow): boolean {
  return (
    row.visibility === PUBLIC_MEDIA_VISIBILITY &&
    row.moderation_state !== HIDDEN_MODERATION_STATE &&
    (row.derivation_verified === true || row.is_legacy_media === true)
  );
}

/**
 * The rule, applied at the query level, before any row reaches application
 * code. `query` is a Supabase PostgrestFilterBuilder; deliberately typed as
 * `any` in and out, matching every other Supabase query in this codebase
 * (which has no generated Database type to bind it to, see
 * docs/pkg-listing-creation-1b-migration-runbook.md section 4.1) rather
 * than a structural generic, which drives the real builder's own type into
 * an instantiation TypeScript cannot resolve. The calls below are exactly,
 * and only, isPubliclyVisibleMedia() restated as filter conditions, so the
 * two can never silently drift apart.
 */
export function scopeToPublicMedia(query: any): any {
  return query
    .eq("visibility", PUBLIC_MEDIA_VISIBILITY)
    .neq("moderation_state", HIDDEN_MODERATION_STATE)
    .or("derivation_verified.eq.true,is_legacy_media.eq.true");
}
