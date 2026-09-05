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

export interface MediaVisibilityRow {
  visibility: string;
  moderation_state: string;
}

/** The rule, as a predicate, for a row already fetched (defence in depth: a
 * caller that also applied scopeToPublicMedia() at the query level should
 * never see a row that fails this, but a query is not a proof). */
export function isPubliclyVisibleMedia(row: MediaVisibilityRow): boolean {
  return row.visibility === PUBLIC_MEDIA_VISIBILITY && row.moderation_state !== HIDDEN_MODERATION_STATE;
}

/**
 * The rule, applied at the query level, before any row reaches application
 * code. `query` is a Supabase PostgrestFilterBuilder; deliberately typed as
 * `any` in and out, matching every other Supabase query in this codebase
 * (which has no generated Database type to bind it to, see
 * docs/pkg-listing-creation-1b-migration-runbook.md section 4.1) rather
 * than a structural generic, which drives the real builder's own type into
 * an instantiation TypeScript cannot resolve. The two calls below are
 * exactly, and only, isPubliclyVisibleMedia() restated as filter
 * conditions, so the two can never silently drift apart.
 */
export function scopeToPublicMedia(query: any): any {
  return query.eq("visibility", PUBLIC_MEDIA_VISIBILITY).neq("moderation_state", HIDDEN_MODERATION_STATE);
}
