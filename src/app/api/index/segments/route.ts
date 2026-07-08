import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

// Public, already-published index rows (sufficient segments only), used by the
// deal analyser. Same data the /rent-index page renders. Law 3: published rows
// only, nothing computed or estimated here.
export const revalidate = 1800;

export async function GET() {
 const sb = getSupabaseServer();
 if (!sb) return NextResponse.json({ segments: [] });
 const { data } = await sb
  .from("rent_index_published")
  .select("district_label, district_label_ar, district_id, asset_type, segment, band_low, band_high, median, unit, period, source")
  .eq("sufficient", true)
  .order("median", { ascending: false });
 return NextResponse.json({ segments: data ?? [] });
}
