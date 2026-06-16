import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

const ASSETS = ["office","retail","medical","showroom","warehouse","serviced","education","land"] as const;

// Rules-based intent parser. Swap this function for an Anthropic call later;
// the response contract (parsed + clarify + results) stays the same so the UI is unchanged.
export async function POST(req: NextRequest) {
  const { query } = (await req.json()) as { query?: string };
  const raw = query || "";
  const q = raw.toLowerCase();
  const supabase = getSupabaseServer();
  if (!supabase) return NextResponse.json({ results: [], parsed: {}, clarify: false });

  const asset = ASSETS.find((a) => q.includes(a)) || (q.includes("clinic") ? "medical" : (q.includes("logistic") || q.includes("warehouse")) ? "warehouse" : (q.includes("shop") || q.includes("f&b") || q.includes("restaurant")) ? "retail" : null);
  const dealDetected = /\b(buy|sale|for sale|purchase|freehold|acquire)\b/.test(q) ? "sale" : (/\b(lease|rent|rental|let)\b/.test(q) ? "lease" : null);
  const sizeMatch = q.match(/([0-9][0-9,\.]{1,9})\s*(sqm|sq m|m2|m²|meter)/);
  const minSize = sizeMatch ? Number(sizeMatch[1].replace(/[,]/g, "")) : null;
  const budgetMatch = q.match(/(under|below|max|up to)\s*(sar)?\s*([0-9][0-9,\.]{1,9})/);
  const maxRent = budgetMatch ? Number(budgetMatch[3].replace(/[,]/g, "")) : null;

  const { data: districts } = await supabase.from("districts").select("id, name_en, city");
  const dMatch = (districts ?? []).find((d: any) =>
    q.includes((d.name_en || "").toLowerCase()) || q.includes((d.city || "").toLowerCase()) || (d.name_en === "KAFD" && q.includes("kafd"))
  );

  const hasIntent = !!(asset || dMatch || minSize || maxRent || dealDetected);
  const vague = /(suggest|recommend|help|idea|option|advice|not sure|don'?t know|dont know|anything|what (can|do|should)|where should|guide)/i.test(raw);
  const clarify = !hasIntent && (vague || raw.trim().length < 4);

  let sb = supabase.from("listings").select("*, districts(name_en, name_ar, city)").eq("status", "published").order("created_at", { ascending: false }).limit(clarify ? 6 : 36);
  if (!clarify) {
    if (asset) sb = sb.eq("asset_type", asset);
    if (dealDetected) sb = sb.eq("deal_type", dealDetected);
    if (dMatch) sb = sb.eq("district_id", dMatch.id);
    if (minSize) sb = sb.gte("area_sqm", minSize * 0.6);
    if (maxRent && dealDetected !== "sale") sb = sb.lte("asking_rent_sqm", maxRent);
  }
  const { data, error } = await sb;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    parsed: { asset: asset ?? null, deal: dealDetected, district: dMatch?.name_en ?? null, minSize, maxRent },
    clarify,
    count: (data ?? []).length,
    results: data ?? []
  });
}
