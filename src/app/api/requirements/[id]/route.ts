import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

// GET one requirement (public-safe) + who has shown interest
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ requirement: null, interests: [] });
  const { data: r } = await sb.from("requirements_public").select("*").eq("id", params.id).single();
  const { data: ints } = await sb.from("requirement_interests").select("*").eq("brief_id", params.id).order("created_at", { ascending: false });
  // Arabic parity: the client cannot localize a district it never receives, so
  // send both names and let the locale pick.
  let district = r?.city ?? "";
  let districtAr = r?.city ?? "";
  if (r?.district_id) {
    const { data: d } = await sb.from("districts").select("name_en, name_ar").eq("id", r.district_id).single();
    if (d?.name_en) district = d.name_en;
    if (d?.name_ar || d?.name_en) districtAr = d.name_ar || d.name_en;
  }
  return NextResponse.json({
    requirement: r ? { id: r.id, ref: r.ref_code, title: r.title, titleAr: r.title_ar ?? null, asset: r.asset_type, deal: r.deal_type, district, districtAr, city: r.city, sizeMin: r.size_min_sqm, sizeMax: r.size_max_sqm, budget: r.budget_sqm_max, timeline: r.timeline, mustHaves: r.must_haves ?? [], createdAt: r.created_at } : null,
    interests: (ints ?? []).map((i: any) => ({ id: i.id, type: i.party_type, name: i.party_name, org: i.org, message: i.message, createdAt: i.created_at })),
  });
}
