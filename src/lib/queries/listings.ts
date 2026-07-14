import { cache } from "react";
import { getSupabaseServer } from "@/lib/supabase/server";

// Request-deduped fetches: called from both generateMetadata and the page
// component, React cache() collapses them into one query per request.
export const getListingById = cache(async (id: string) => {
  const sb = getSupabaseServer();
  if (!sb) return null;
  const { data } = await sb.from("listings").select("*, districts(name_en,name_ar,city)").eq("id", id).single();
  return data;
});

export const getBuildingById = cache(async (id: string) => {
  const sb = getSupabaseServer();
  if (!sb) return null;
  const { data } = await sb.from("buildings").select("*").eq("id", id).maybeSingle();
  return data;
});

export type Lister = {
  id: string;
  name_en: string | null;
  name_ar: string | null;
  lister_type: string;   // "owner" | "broker" | "investor" | "occupier"
  is_operator: boolean;  // SAT Real Estate, the company that runs this exchange
  is_verified: boolean;
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
  const sb = getSupabaseServer();
  if (!sb) return null;
  const { data } = await sb
    .from("listers_public")
    .select("id,name_en,name_ar,lister_type,is_operator,is_verified")
    .eq("id", accountId)
    .maybeSingle();
  return (data as Lister) ?? null;
});
