import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

const ASSETS = ["office","retail","medical","showroom","warehouse","serviced","education","land"] as const;

export async function POST(req: NextRequest) {
  const { query } = (await req.json()) as { query?: string };
  const q = (query || "").toLowerCase();
  const supabase = getSupabaseServer();
  if (!supabase) return NextResponse.json({ results: [], parsed: {} });

  const asset = ASSETS.find((a) => q.includes(a)) || (q.includes("clinic") ? "medical" : q.includes("warehouse") || q.includes("logistic") ? "warehouse" : null);
  const deal = q.includes("buy") || q.includes("sale") || q.includes("for sale") ? "sale" : "lease";
  const sizeMatch = q.match(/([0-9][0-9,\.]{1,9})\s*(sqm|sq m|m2|m²|meter)/);
  const minSize = sizeMatch ? Number(sizeMatch[1].replace(/[,]/g, "")) : null;
  const budgetMatch = q.match(/(under|below|max|up to)\s*(sar)?\s*([0-9][0-9,\.]{1,9})/);
  const maxRent = budgetMatch ? Number(budgetMatch[3].replace(/[,]/g, "")) : null;

  const { data: districts } = await supabase.from("districts").select("id, name_en, city");
  const dMatch = (districts ?? []).find((d: any) =>
    q.includes((d.name_en || "").toLowerCase()) || q.includes((d.city || "").toLowerCase()) || (d.name_en === "KAFD" && q.includes("kafd"))
  );

  let sb = supabase.from("listings").select("*, districts(name_en, name_ar, city)").eq("status", "published").limit(36);
  if (asset) sb = sb.eq("asset_type", asset);
  sb = sb.eq("deal_type", deal);
  if (dMatch) sb = sb.eq("district_id", dMatch.id);
  if (minSize) sb = sb.gte("area_sqm", minSize * 0.6);
  if (maxRent && deal === "lease") sb = sb.lte("asking_rent_sqm", maxRent);
  const { data, error } = await sb;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    parsed: { asset: asset ?? null, deal, district: dMatch?.name_en ?? null, minSize, maxRent },
    results: data ?? []
  });
}
