import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { allow } from "@/lib/ratelimit";

const ASSETS = ["office","retail","medical","showroom","warehouse","serviced","education","land"] as const;
type AssetT = typeof ASSETS[number];
type Parsed = { asset: AssetT | null; deal: "lease" | "sale" | null; district: string | null; minSize: number | null; maxRent: number | null };

// Rules-based parser, kept as a fast, reliable fallback for when the model is
// unavailable (no key set, timeout, or error). It never sees the network.
function rulesParse(raw: string): Parsed {
  const q = raw.toLowerCase();
  const asset = (ASSETS.find((a) => q.includes(a)) as AssetT | undefined) || (q.includes("clinic") ? "medical" : (q.includes("logistic") || q.includes("warehouse")) ? "warehouse" : (q.includes("shop") || q.includes("f&b") || q.includes("restaurant")) ? "retail" : null);
  const deal: Parsed["deal"] = /\b(buy|sale|for sale|purchase|freehold|acquire)\b/.test(q) ? "sale" : (/\b(lease|rent|rental|let)\b/.test(q) ? "lease" : null);
  const sizeMatch = q.match(/([0-9][0-9,\.]{1,9})\s*(sqm|sq m|m2|m²|meter)/);
  const minSize = sizeMatch ? Number(sizeMatch[1].replace(/[,]/g, "")) : null;
  const budgetMatch = q.match(/(under|below|max|up to)\s*(sar)?\s*([0-9][0-9,\.]{1,9})/);
  const maxRent = budgetMatch ? Number(budgetMatch[3].replace(/[,]/g, "")) : null;
  return { asset: asset ?? null, deal, district: null, minSize, maxRent };
}

const SYS = `You extract structured search filters from a commercial real estate query for Riyadh, Saudi Arabia. Understand both Arabic and English, including dialect and loose phrasing. Respond with strict JSON only, no prose, with exactly these keys:
- asset: one of "office","retail","medical","showroom","warehouse","serviced","education","land", or null
- deal: "lease", "sale", or null
- district: the Riyadh district or area name the user means as a string, or null
- minSize: minimum floor area in square metres as a number, or null
- maxRent: maximum rent in SAR per square metre per year as a number, or null
Infer intent: a clinic is medical, a logistics shed is warehouse, a restaurant or shop is retail, a fitted or co-working suite is serviced, a school or training centre is education. Never invent a value that is not implied. Output only the JSON object.`;

// DeepSeek (OpenAI-compatible) intent parser. Server-side only; the key is read
// from AI_API_KEY and never reaches the browser. Falls back to rules on any failure.
async function llmParse(raw: string): Promise<Parsed | null> {
  const key = process.env.AI_API_KEY || process.env.deepseek_key;
  if (raw.trim().length < 3) return null;
  const providers: [string, string, string][] = [];
  if (key) providers.push([process.env.AI_BASE_URL || "https://api.deepseek.com", key, process.env.AI_MODEL || "deepseek-chat"]);
  if (process.env.ANTHROPIC_API_KEY) providers.push([process.env.AI_FALLBACK_BASE_URL || "https://api.anthropic.com/v1", process.env.ANTHROPIC_API_KEY, process.env.AI_FALLBACK_MODEL || "claude-haiku-4-5-20251001"]);
  for (const [base, k, model] of providers) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${k}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: SYS }, { role: "user", content: raw }],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) continue;
    const j: any = await res.json();
    const txt: string | undefined = j?.choices?.[0]?.message?.content;
    if (!txt) continue;
    const o: any = JSON.parse(txt);
    const asset = (ASSETS as readonly string[]).includes(o?.asset) ? (o.asset as AssetT) : null;
    const deal: Parsed["deal"] = o?.deal === "lease" || o?.deal === "sale" ? o.deal : null;
    const district = typeof o?.district === "string" && o.district.trim() ? o.district.trim() : null;
    const minSize = typeof o?.minSize === "number" && isFinite(o.minSize) ? o.minSize : null;
    const maxRent = typeof o?.maxRent === "number" && isFinite(o.maxRent) ? o.maxRent : null;
    return { asset, deal, district, minSize, maxRent };
  } catch {
    continue;
  }
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!allow("search", req)) return NextResponse.json({ results: [], parsed: {}, clarify: false }, { status: 429 });
  const { query } = (await req.json()) as { query?: string };
  const raw = (query || "").slice(0, 2000);
  const supabase = getSupabaseServer();
  if (!supabase) return NextResponse.json({ results: [], parsed: {}, clarify: false });

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
