import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { allow } from "@/lib/ratelimit";
import { llmParse, rulesParse, type Parsed } from "@/lib/search/aiParse";

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
      const { data: byRef } = await supabase
        .from("listings")
        .select("*, districts(name_en, name_ar, city)")
        .eq("status", "published")
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

  const { data: districts } = await supabase.from("districts").select("id, name_en, name_ar, city");
  const SYN: Record<string, string> = { kafd: "KAFD", cafd: "KAFD", "كافد": "KAFD", "واجهة الرياض المالية": "KAFD", "المركز المالي": "KAFD", olaya: "Al Olaya", "al olaya": "Al Olaya", "العليا": "Al Olaya", hittin: "Hittin", "حطين": "Hittin", granada: "Granada", "غرناطة": "Granada", itcc: "ITCC", "روشن": "Roshn Front", "roshn": "Roshn Front" };
  let wanted = (parsed.district || "").toLowerCase().trim();
  const rawLower = raw.toLowerCase();
  for (const [k, v] of Object.entries(SYN)) {
    if (wanted.includes(k) || rawLower.includes(k)) { wanted = v.toLowerCase(); break; }
  }
  const dMatch = (districts ?? []).find((d: any) => {
    const ne = (d.name_en || "").toLowerCase();
    const ci = (d.city || "").toLowerCase();
    const na = (d.name_ar || "");
    if (wanted) return (ne && (wanted.includes(ne) || ne.includes(wanted))) || (na && raw.includes(na));
    return rawLower.includes(ne) || rawLower.includes(ci) || (na && raw.includes(na));
  });

  const hasIntent = !!(asset || dMatch || minSize || maxRent || dealDetected);
  const vague = /(suggest|recommend|help|idea|option|advice|not sure|don'?t know|dont know|anything|what (can|do|should)|where should|guide)/i.test(raw);
  const clarify = !hasIntent && (vague || raw.trim().length < 4);

  const build = (level: number) => {
    let sb = supabase.from("listings").select("*, districts(name_en, name_ar, city)").eq("status", "published").order("created_at", { ascending: false }).limit(clarify ? 6 : 36);
    if (clarify) return sb;
    if (asset) sb = sb.eq("asset_type", asset);
    if (dealDetected) sb = sb.eq("deal_type", dealDetected);
    if (dMatch && level < 3) sb = sb.eq("district_id", dMatch.id);
    if (minSize && level < 2) sb = sb.gte("area_sqm", minSize * 0.6);
    if (maxRent && dealDetected !== "sale" && level < 1) sb = sb.lte("asking_rent_sqm", maxRent);
    return sb;
  };

  const relaxNotes = [
    maxRent && dealDetected !== "sale" ? `above your ${maxRent.toLocaleString()} SAR/m² cap` : null,
    minSize ? "smaller than your size" : null,
    dMatch ? `outside ${dMatch.name_en}` : null,
  ];
  let data: any[] = []; let level = 0; let relaxedReason: string | null = null;
  for (level = 0; level <= 3; level++) {
    const { data: d, error } = await build(level);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    data = d ?? [];
    if (clarify || data.length > 0 || level === 3) {
      relaxedReason = level > 0 ? relaxNotes[level - 1] : null;
      break;
    }
  }
  const relaxed = !clarify && level > 0 && data.length > 0;

  return NextResponse.json({
    parsed: { asset: asset ?? null, deal: dealDetected, district: dMatch?.name_en ?? null, minSize, maxRent },
    clarify,
    relaxed,
    relaxedReason,
    aiUsed,
    count: data.length,
    results: data,
  });
}
