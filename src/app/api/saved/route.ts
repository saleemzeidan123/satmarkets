import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get("ids") || "").split(",").map((s) => s.trim()).filter((s) => /^[0-9a-fA-F-]{36}$/.test(s)).slice(0, 50);
  if (!ids.length) return NextResponse.json({ listings: [] });
  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ listings: [] });
  const { data } = await sb.from("listings").select("*, districts(name_en, name_ar, city)").in("id", ids).eq("status", "published");
  return NextResponse.json({ listings: data ?? [] });
}
