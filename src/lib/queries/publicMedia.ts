import { cache } from "react";
import { getSupabaseServer } from "@/lib/supabase/server";
import { scopeToPublicMedia } from "@/lib/mediaVisibility";

// Codex review, item 3. The single canonical reader for what an anonymous
// visitor may see of a listing's media. mediaVisibility.ts states the rule
// (visibility = 'public' AND moderation_state <> 'removed'); this is the
// one place that rule is actually applied as a real query, so a public
// page never has to remember to call scopeToPublicMedia() itself, and
// mediaVisibility.test.ts's structural scan has exactly one real query to
// verify rather than one per public page.
//
// WHY A DEDICATED QUERY MODULE. Matches this codebase's own
// src/lib/queries/ convention (getLister in listings.ts, listListers in
// listers.ts): a query with a specific, reusable shape lives next to the
// others rather than inline in the one route that happens to need it
// first. `cache()` gives request-level memoization the same way getLister
// already does, in case a future page needs this listing's media more
// than once per request.
export type PublicMediaRow = {
  path: string;
  source: string;
  kind: string;
  mime: string | null;
  alt_en: string | null;
  alt_ar: string | null;
  plan_type: string | null;
  sort_order: number;
};

/**
 * Every photo, floor plan and brochure row an anonymous visitor may see for
 * one listing, in display order.
 *
 * Codex review round 3, item 2: this used to return a bare `[]` on EITHER
 * a genuine "no such media" OR any query/client failure, the same
 * dataOk-collapsing defect `getListingById`/`getBuildingById`
 * (src/lib/queries/listings.ts) were already fixed for. A caller could not
 * tell "this listing really has no photos" from "we could not check", so a
 * transient Supabase outage read identically to an empty listing and
 * silently fell back to a generic placeholder image, which is misleading
 * in a different way than either honest state. Matches the same
 * `{ dataOk, ... }` shape those two functions already use, so a caller
 * checks it the same way.
 */
export type PublicListingMediaResult = {
  /** False only when the read itself could not be trusted: no Supabase
   * client, or the query errored. Never false for a genuine "no media",
   * which is `dataOk: true, media: []`. */
  dataOk: boolean;
  media: PublicMediaRow[];
};

export const getPublicListingMedia = cache(async (listingId: string): Promise<PublicListingMediaResult> => {
  const sb = await getSupabaseServer();
  if (!sb) return { dataOk: false, media: [] };
  const { data, error } = await scopeToPublicMedia(
    sb.from("listing_media")
      .select("path,source,kind,mime,alt_en,alt_ar,plan_type,sort_order")
      .eq("listing_id", listingId)
      .in("kind", ["photo", "floorplan", "brochure"]),
  ).order("sort_order");
  if (error) return { dataOk: false, media: [] };
  return { dataOk: true, media: (data as PublicMediaRow[]) ?? [] };
});
