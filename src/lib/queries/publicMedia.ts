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
 * one listing, in display order. Returns [] on any storage failure or when
 * the listing has no such media, never throws: a public page's own
 * DataState handling is for the listing lookup itself, not for this.
 */
export const getPublicListingMedia = cache(async (listingId: string): Promise<PublicMediaRow[]> => {
  const sb = await getSupabaseServer();
  if (!sb) return [];
  const { data } = await scopeToPublicMedia(
    sb.from("listing_media")
      .select("path,source,kind,mime,alt_en,alt_ar,plan_type,sort_order")
      .eq("listing_id", listingId)
      .in("kind", ["photo", "floorplan", "brochure"]),
  ).order("sort_order");
  return (data as PublicMediaRow[]) ?? [];
});
