import { cache } from "react";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  SOURCE_RIGHTS_COLUMNS,
  deniedRights,
  indexSourceRights,
  type SourceRights,
} from "@/lib/sourceRights";

// ADV-0 loader. The rules live in `src/lib/sourceRights.ts`; this file only
// fetches. Every failure path returns an empty map rather than throwing, and an
// empty map denies every subsequent lookup. That is the important property: an
// outage, a missing env var or a schema drift must never be able to open a
// permission that a licence closed. The product losing a figure is a visible,
// recoverable fault. The product publishing an unlicensed figure is not.

export const getAllSourceRights = cache(
  async (): Promise<Map<string, SourceRights>> => {
    try {
      const sb = getSupabaseServer();
      if (!sb) return new Map();
      const { data, error } = await sb
        .from("source_registry")
        .select(SOURCE_RIGHTS_COLUMNS);
      if (error || !data) return new Map();
      return indexSourceRights(data);
    } catch {
      return new Map();
    }
  }
);

/** Rights for one source. Never throws, never returns null, denies on absence. */
export async function getSourceRights(sourceId: string): Promise<SourceRights> {
  const all = await getAllSourceRights();
  return all.get(sourceId) ?? deniedRights(sourceId);
}
