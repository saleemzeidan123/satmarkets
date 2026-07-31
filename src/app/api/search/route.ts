import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { releaseVisibleInventory } from "@/lib/inventory";
import { allow } from "@/lib/ratelimit";
import { llmParse, rulesParse, type Parsed } from "@/lib/search/aiParse";
import { cityKey } from "@/lib/labels";
import { resolvePlace } from "@/lib/search/place";

export async function POST(req: NextRequest) {
  if (!allow("search", req)) return NextResponse.json({ results: [], parsed: {}, clarify: false }, { status: 429 });
  const { query } = (await req.json()) as { query?: string };
  const raw = (query || "").slice(0, 2000);
  const supabase = getSupabaseServer();
  if (!supabase) return NextResponse.json({ results: [], parsed: {}, clarify: false });

  // WO-8 reference-code fast path: a SATM code query resolves straight to its
  // listing via one indexed lookup, before any parsing.
  {
    const qs = raw.trim().toUpperCase().replace(/\s+/g, "");
    const m = qs.match(/^SAT[M]?-?([0-9A-Z]{4,10})$/);
    if (m) {
      const code = `SATM-${m[1]}`;
      const { data: byRef } = await releaseVisibleInventory(supabase
        .from("listings")
        .select("*, districts(name_en, name_ar, city)")
        .eq("status", "published"))
        .ilike("reference_code", code)
        .limit(1);
      if (byRef && byRef.length) {
        return NextResponse.json({ parsed: { reference: byRef[0].reference_code }, clarify: false, byReference: true, count: byRef.length, results: byRef });
      }
    }
  }

  // Smart parse first (DeepSeek, Arabic + nuance), rules parser as the fallback.
  const ai = await llmParse(raw);
  const parsed = ai || rulesParse(raw);
  const aiUsed = !!ai;
  const asset = parsed.asset;
  const dealDetected = parsed.deal;
  const minSize = parsed.minSize;
  const maxRent = parsed.maxRent;
  const city = parsed.city ? cityKey(parsed.city) : null;

  const { data: districts } = await supabase.from("districts").select("id, name_en, name_ar, city");
  // Place resolution lives in `@/lib/search/place` so it can be tested. It used
  // to be inline here, where nothing could reach it, and it answered a query
  // naming a city by narrowing to one arbitrary district of that city.
  const { district: dMatch, cityDistrictIds, applied: placeApplied } = resolvePlace(raw, parsed.district, city, districts);

  const hasIntent = !!(asset || placeApplied || minSize || maxRent || dealDetected);
  const vague = /(suggest|recommend|help|idea|option|advice|not sure|don'?t know|dont know|anything|what (can|do|should)|where should|guide)/i.test(raw);
  const clarify = !hasIntent && (vague || raw.trim().length < 4);

  // Returns null when the place filter cannot match anything, which is a result
  // rather than an error: `.in("district_id", [])` is not expressible, and
  // pretending the filter was never asked for is the defect this package exists
  // to remove.
  const build = (level: number) => {
    let sb = releaseVisibleInventory(supabase.from("listings").select("*, districts(name_en, name_ar, city)").eq("status", "published")).order("created_at", { ascending: false }).limit(clarify ? 6 : 36);
    if (clarify) return sb;
    if (asset) sb = sb.eq("asset_type", asset);
    if (dealDetected) sb = sb.eq("deal_type", dealDetected);
    if (level < 3) {
      if (dMatch) sb = sb.eq("district_id", dMatch.id);
      else if (cityDistrictIds) {
        if (!cityDistrictIds.length) return null;
        sb = sb.in("district_id", cityDistrictIds);
      }
    }
    if (minSize && level < 2) sb = sb.gte("area_sqm", minSize * 0.6);
    if (maxRent && dealDetected !== "sale" && level < 1) sb = sb.lte("asking_rent_sqm", maxRent);
    return sb;
  };

  // What was given up, as a token rather than a sentence. This used to be an
  // English string composed on the server, and `useAdvisorChat` dropped it into
  // the middle of an Arabic sentence, so an Arabic reader was told their results
  // were "outside KAFD" in Latin script inside their own language. The client
  // owns the wording in both languages now; the route says only which constraint
  // was relaxed and what the place was called.
  const relaxKinds: ("budget" | "size" | "place" | null)[] = [
    maxRent && dealDetected !== "sale" ? "budget" : null,
    minSize ? "size" : null,
    placeApplied ? "place" : null,
  ];
  let data: any[] = []; let level = 0; let relaxedBy: "budget" | "size" | "place" | null = null;
  for (level = 0; level <= 3; level++) {
    const qb = build(level);
    if (qb) {
      const { data: d, error } = await qb;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      data = d ?? [];
    } else {
      data = [];
    }
    if (clarify || data.length > 0 || level === 3) {
      relaxedBy = level > 0 ? relaxKinds[level - 1] : null;
      break;
    }
  }
  const relaxed = !clarify && level > 0 && data.length > 0;

  return NextResponse.json({
    parsed: { asset: asset ?? null, deal: dealDetected, district: dMatch?.name_en ?? null, city, minSize, maxRent },
    place: placeApplied,
    clarify,
    relaxed,
    relaxedBy,
    aiUsed,
    count: data.length,
    results: data,
  });
}
