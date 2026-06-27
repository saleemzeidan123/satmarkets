import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

const key = () => process.env.AI_API_KEY || process.env.deepseek_key;
const base = () => process.env.AI_BASE_URL || "https://api.deepseek.com";
const model = () => process.env.AI_MODEL || "deepseek-chat";

// Single server-side call to DeepSeek (OpenAI-compatible). The key never reaches
// the browser. Returns message text, or null on any failure so callers fall back.
async function llm(messages: any[], json: boolean): Promise<string | null> {
  const k = key();
  if (!k) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(`${base()}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${k}` },
      body: JSON.stringify({
        model: model(),
        temperature: json ? 0 : 0.4,
        ...(json ? { response_format: { type: "json_object" } } : {}),
        messages,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const j: any = await res.json();
    return j?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

const CLASSIFY = `Classify a message to a Saudi commercial real estate assistant into one intent. Respond strict JSON only with keys:
- mode: "chat" (a greeting, small talk, or asking what you can do, or a general question not tied to a specific space or figure), "search" (they want to find or browse actual spaces or listings), "draft" (they want listing copy written for a space they own or represent), or "value" (they ask whether a rent or price is fair, or about current rent levels for a district and asset type).
- district: the Riyadh district they mention, or null.
- asset: one of "office","retail","medical","showroom","warehouse","serviced","education","land", or null.
- figure: any SAR per square metre number they mention, or null.
Output only the JSON object.`;

// Closed-domain persona: sounds human, but knowledge is limited to SAT data only.
const CHAT_SYS = `You are SAT Advisor, a warm, plain-spoken commercial real estate advisor for SAT Markets in Riyadh, Saudi Arabia. Speak like a helpful human colleague, in first person, a sentence or two, never robotic or listy. Your knowledge is strictly limited to SAT Markets: its verified listings, the SAT Rent Index, and what is on the SAT site. You can help the user find a space, value a rent or price against the SAT Rent Index, draft a listing, or watch the market. If the user greets you, greet them back warmly and ask what they are looking for. If they ask for anything outside SAT Markets or outside Saudi commercial property, say politely that you only cover SAT Markets and Saudi commercial real estate, then offer what you can do. Never state a specific rent, price, or market statistic here; if they want numbers, ask for a district and an asset type and tell them you will pull the figure from the SAT Rent Index. No em dashes. Invent nothing.`;

export async function POST(req: NextRequest) {
  const { query } = (await req.json()) as { query?: string };
  const raw = (query || "").trim();
  // No key, or empty: let the client run the normal keyword search.
  if (!raw || !key()) return NextResponse.json({ mode: "search" });

  const cText = await llm([{ role: "system", content: CLASSIFY }, { role: "user", content: raw }], true);
  let intent: any = {};
  try { intent = cText ? JSON.parse(cText) : {}; } catch { intent = {}; }
  const mode = ["chat", "draft", "value"].includes(intent?.mode) ? intent.mode : "search";
  if (mode === "search") return NextResponse.json({ mode: "search" });

  const supabase = getSupabaseServer();

  if (mode === "chat") {
    const msg = await llm([{ role: "system", content: CHAT_SYS }, { role: "user", content: raw }], false);
    return NextResponse.json({ mode: "chat", message: msg || "I am SAT Advisor. I can help you find a space, value a rent against the SAT Rent Index, or draft a listing. What are you after?" });
  }

  if (mode === "value") {
    if (!intent?.district && !intent?.asset) {
      return NextResponse.json({ mode: "value", message: "Tell me the district and the asset type, for example Al Olaya office, and I will pull the current band from the SAT Rent Index." });
    }
    // Ground the comparison in the published SAT Rent Index. Never invent a band.
    let band: any = null;
    if (supabase) {
      let q = supabase
        .from("rent_index_published")
        .select("period, district_label, asset_type, segment, unit, band_low, band_high, median, source")
        .order("created_at", { ascending: false })
        .limit(1);
      if (intent?.asset) q = q.eq("asset_type", intent.asset);
      if (intent?.district) q = q.ilike("district_label", `%${intent.district}%`);
      const { data } = await q;
      band = data && data[0] ? data[0] : null;
    }
    if (!band) {
      return NextResponse.json({
        mode: "value",
        message: "I do not have published SAT Rent Index data for that district and asset type yet, so I will not put a number on it. Try another district, for example Al Olaya office, or browse the verified listings.",
      });
    }
    const seg = band.segment ? ` ${band.segment}` : "";
    const sys = `You are SAT Advisor, a warm, plain-spoken human advisor. Using ONLY the numbers below and never inventing or adjusting them, explain how the figure the user quotes compares to the SAT Rent Index band. Band for ${band.district_label} ${band.asset_type}${seg}: low ${band.band_low}, median ${band.median}, high ${band.band_high} ${band.unit}, period ${band.period}, source ${band.source}. Say clearly whether the quoted figure is below, within, or above the band and how it sits against the median. If they gave no figure, just describe the current band plainly. Two to four sentences. No em dashes.`;
    const msg = await llm([{ role: "system", content: sys }, { role: "user", content: raw }], false);
    const fallback = `SAT Rent Index ${band.period}, ${band.district_label} ${band.asset_type}${seg}: ${band.band_low} to ${band.band_high} ${band.unit}, median ${band.median}. Source ${band.source}.`;
    return NextResponse.json({ mode: "value", message: msg || fallback, band });
  }

  // draft: write listing copy from only what the user gave. No invented figures.
  const sys = `You are SAT Advisor, a warm, plain-spoken human advisor writing a commercial real estate listing for Riyadh from ONLY the details the user gives. Never invent a rent, price, or measurement they did not state. If they gave no price, omit price and end with one short line telling them to set their own asking figure. Do not fabricate permits or approvals. Write a short title line, then a description of about sixty to ninety words, professional and concrete, in English. No em dashes.`;
  const msg = await llm([{ role: "system", content: sys }, { role: "user", content: raw }], false);
  return NextResponse.json({ mode: "draft", message: msg || "Tell me the asset type, district, size, and condition, and I will draft the listing." });
}
