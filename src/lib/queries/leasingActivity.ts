import type { SupabaseClient } from "@supabase/supabase-js";

// PKG-DATA-2. The latest published quarter the weekly job has loaded, if any.
//
// Null means "nothing to read here": the tables are not there yet, the read
// failed, or no load is published. The caller then shows the quarter that
// ships with the code. Null is never a reason to show nothing, and never a
// reason to show a figure from somewhere else.

export type LoadedQuarter = {
  period: string;
  title: string;
  titleAr: string | null;
  url: string;
  /** district, office, shop, showroom: the shape the bundled file uses. */
  rows: [string, number | null, number | null, number | null][];
};

export async function latestLoadedQuarter(sb: SupabaseClient, regionInFile: string, cityInFile: string): Promise<LoadedQuarter | null> {
  try {
    const { data: load, error } = await sb
      .from("official_leasing_loads")
      .select("dataset_id, period, title_en, title_ar, dataset_url")
      .eq("status", "published")
      .eq("region", regionInFile)
      .order("period", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !load) return null;
    const { data: counts, error: countErr } = await sb
      .from("official_leasing_counts")
      .select("district, office, shop, showroom")
      .eq("dataset_id", load.dataset_id)
      .eq("city", cityInFile)
      .limit(2000);
    if (countErr || !counts || counts.length === 0) return null;
    return {
      period: String(load.period),
      title: String(load.title_en),
      titleAr: load.title_ar ? String(load.title_ar) : null,
      url: String(load.dataset_url),
      rows: counts.map((c) => [String(c.district), c.office ?? null, c.shop ?? null, c.showroom ?? null]),
    };
  } catch {
    return null;
  }
}
