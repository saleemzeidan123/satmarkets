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
