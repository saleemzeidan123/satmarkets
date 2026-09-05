// PKG-LISTING-CREATION-1B, outcome B. Per-shot media categorization: pure
// validation for the three columns this outcome's own slice of the package
// puts real UI and API surface behind, shot_key, media_scope and
// media_condition (see supabase/migrations/20260902b_pkg1b_media_categorization.sql
// for the columns themselves and the reasoning behind their shape).
//
// is_cover, rights_acknowledged_by/at, visibility and moderation_state are
// deliberately untouched here. The migration added all seven columns
// together because they share one table and one design review, but is_cover
// in particular collides with an existing, unrelated "cover photo" concept
// this codebase already has, implicit in sort_order (see media/route.ts's
// own PATCH, which makes sort_order 0 the cover). Whether the new boolean
// replaces that convention or serves some other purpose is a real product
// decision with public-facing blast radius that has not been made, so this
// module, and the route and UI built against it, stop at the three columns
// that carry no such conflict.
//
// Pure: no I/O, no React, no clock, matching mediaStandard.ts's own
// discipline. No em dashes (Law 2).

import { mediaStandardFor } from "./mediaStandard";

export type MediaScope = "building" | "unit";
export type MediaCondition = "current" | "illustrative";

export const MEDIA_SCOPES: readonly MediaScope[] = ["building", "unit"];
export const MEDIA_CONDITIONS: readonly MediaCondition[] = ["current", "illustrative"];

/**
 * Whether `shotKey` is a shot this asset type actually carries.
 *
 * Null is always valid: the migration's own header comment states shot_key
 * stays nullable and null means "not yet categorised", never "no shot" and
 * never a state this function invents by treating an empty value as
 * anything other than uncategorised. A non-null key is checked against
 * `mediaStandardFor(assetType).shots`, the one place the shot taxonomy is
 * defined, rather than a second, independently drifting copy of it here.
 * This is why the caller (the API route) must read the listing's real
 * asset_type server-side and never trust a client-supplied one: the set of
 * valid keys is asset-type-specific, and validating against the wrong
 * asset type would accept a key that means something else, or reject one
 * that is genuinely valid.
 */
export function isValidShotKey(assetType: string, shotKey: string | null): boolean {
  if (shotKey === null) return true;
  return mediaStandardFor(assetType).shots.some((s) => s.key === shotKey);
}

/** Null (not yet set) or one of the two fixed scopes. Asset-type independent. */
export function isValidMediaScope(v: string | null): v is MediaScope | null {
  return v === null || (MEDIA_SCOPES as readonly string[]).includes(v);
}

/** Null (not yet set) or one of the two fixed conditions. Asset-type independent. */
export function isValidMediaCondition(v: string | null): v is MediaCondition | null {
  return v === null || (MEDIA_CONDITIONS as readonly string[]).includes(v);
}
