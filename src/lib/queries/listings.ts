import { cache } from "react";
import { getSupabaseServer } from "@/lib/supabase/server";

// Request-deduped fetches: called from both generateMetadata and the page
// component, React cache() collapses them into one query per request.

// PKG-DISCOVERY-1 item 9. `getListingById` used to return the row or `null`
// for three different facts at once: no Supabase client, a genuine "no such
// id", and any other query error (a real connection failure among them). A
// caller receiving `null` could not tell "this listing does not exist" from
// "the platform could not check", so `/listings/[id]` and its flyer both
// rendered the same "Listing not found" sentence for a storage outage as for
// a listing that never existed, which is the exact defect class finding 207
// closed for the API routes and never reached these two page templates.
//
// `.single()` is also what let the two collapse: PostgREST turns "zero rows"
// into an error of the same shape as a real failure, so a caller reading
// only `{ data }` (as this line did) cannot separate them by construction.
// `.maybeSingle()` is what its two neighbours below, `getBuildingById` and
// `getLister`, already use for exactly this reason: zero rows comes back as
// `{ data: null, error: null }`, and only a real failure sets `error`.
export type ListingByIdResult = {
  /** False only when the read itself could not be trusted: no Supabase
   * client, or the query errored. Never false for a genuine "no such id",
   * which is `dataOk: true, row: null`. */
  dataOk: boolean;
  row: any | null;
};

export const getListingById = cache(async (id: string): Promise<ListingByIdResult> => {
  const sb = await getSupabaseServer();
  if (!sb) return { dataOk: false, row: null };
  const { data, error } = await sb.from("listings").select("*, districts(name_en,name_ar,city)").eq("id", id).maybeSingle();
  if (error) return { dataOk: false, row: null };
  return { dataOk: true, row: data ?? null };
});

// PKG-DISCOVERY-1 item 8. Same defect class as getListingById above, found
// on the building profile route during the cross-route sweep: `if (!sb)
// notFound()` in the page, and this function discarding `error` and
// returning `null` for a real query failure exactly as it did for a
// genuine "no such id", collapsed a storage outage into the public
// not-found page on `/building/[id]`.
export type BuildingByIdResult = {
  dataOk: boolean;
  row: any | null;
};

export const getBuildingById = cache(async (id: string): Promise<BuildingByIdResult> => {
  const sb = await getSupabaseServer();
  if (!sb) return { dataOk: false, row: null };
  const { data, error } = await sb.from("buildings").select("*").eq("id", id).maybeSingle();
  if (error) return { dataOk: false, row: null };
  return { dataOk: true, row: data ?? null };
});

export type Lister = {
  id: string;
  name_en: string | null;
  name_ar: string | null;
  lister_type: string;   // "owner" | "broker" | "investor" | "occupier"
  is_operator: boolean;  // SAT Real Estate, the company that runs this exchange
  is_verified: boolean;  // accounts.verification_status = 'verified', which is a STATUS
  is_demo: boolean;      // and this is why that status cannot carry a badge (ADV-1)
};

// Who is listing this, and are they us?
//
// `accounts` is invisible to the public, correctly: it holds commercial registration
// numbers and verification records. The side effect was that every listing on the
// exchange was ANONYMOUS. A tenant could not see who they were dealing with, and a broker
// could not tell which listings belonged to the company that runs the platform.
//
// listers_public exposes the minimum a lister must show and not one column more, and only
// for accounts that already have a published listing, so it cannot be used to enumerate
// everyone who has signed up.
export const getLister = cache(async (accountId: string | null | undefined): Promise<Lister | null> => {
  if (!accountId) return null;
  const sb = await getSupabaseServer();
  if (!sb) return null;
  const { data } = await sb
    .from("listers_public")
    .select("id,name_en,name_ar,lister_type,is_operator,is_verified,is_demo")
    .eq("id", accountId)
    .maybeSingle();
  return (data as Lister) ?? null;
});
