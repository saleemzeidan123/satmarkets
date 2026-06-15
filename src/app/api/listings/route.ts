import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer();
  if (!supabase) return NextResponse.json({ listings: [], note: "supabase not configured" });
  const { searchParams } = new URL(req.url);
  let query = supabase.from("listings").select("*").eq("status", "published").limit(50);
  const asset = searchParams.get("asset");
  const district = searchParams.get("district");
  if (asset) query = query.eq("asset_type", asset);
  if (district) query = query.eq("district_id", district);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ listings: data ?? [] });
}
