import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { allow } from "@/lib/ratelimit";

const key = () => process.env.AI_API_KEY || process.env.deepseek_key;
const base = () => process.env.AI_BASE_URL || "https://api.deepseek.com";
const model = () => process.env.AI_MODEL || "deepseek-chat";

// Law 3 (structural): block any rent, price, or market figure in free-text
// model output that is not present in the allowed source (the user's own words
// or a verified band we supplied). Errs safe. The value and watch paths are
// already data-gated; this fences the chat, ask, and draft paths.
function unsourcedFigure(text: string, allowed: string): boolean {
  if (!text) return false;
  const ascii = (x: string) => (x || "").replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).toLowerCase();
  const stripNum = (x: string) => x.replace(/[,\s٬]/g, "");
  const t = ascii(text);
  const a = stripNum(ascii(allowed));
  const unit = /(sar|ريال|riyal|halala|\/\s*m²|\/\s*sqm|per\s*sqm|per\s*square|sq\s*m|m²|m2|per\s*year|\/\s*yr|per\s*month|\/\s*mo|percent|%|٪)/i;
  const numRe = /\d[\d,.٬]*/g;
  let m: RegExpExecArray | null;
  while ((m = numRe.exec(t))) {
    const num = m[0];
    if (stripNum(num).replace(/\./g, "").length < 2) continue;
    const ctx = t.slice(Math.max(0, m.index - 20), Math.min(t.length, m.index + num.length + 20));
    if (unit.test(ctx) && !a.includes(stripNum(num))) return true;
  }
  return false;
}

// Single server-side call to DeepSeek (OpenAI-compatible). The key never reaches
// the browser. Returns message text, or null on any failure so callers fall back.
async function callProvider(baseUrl: string, k: string, mdl: string, messages: any[], json: boolean): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${k}` },
      body: JSON.stringify({
        model: mdl,
        temperature: json ? 0 : 0.4,
        ...(json ? { response_format: { type: "json_object" } } : {}),
        messages,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const j: any = await res.json();
    const out = j?.choices?.[0]?.message?.content ?? null;
    return out ? out.replace(/\s*[\u2014\u2013]\s*/g, ", ") : null;
  } catch {
    return null;
  }
}

// Primary: the configured provider (DeepSeek by default). Fallback: the Anthropic
// key already in the environment, via Anthropic's OpenAI-compatible endpoint, so
// the advisor stays alive when one provider is down (two-provider resilience).
async function llm(messages: any[], json: boolean): Promise<string | null> {
  const k = key();
  if (k) {
    const out = await callProvider(base(), k, model(), messages, json);
    if (out) return out;
  }
  const ak = process.env.ANTHROPIC_API_KEY;
  if (ak) {
    return callProvider(process.env.AI_FALLBACK_BASE_URL || "https://api.anthropic.com/v1", ak, process.env.AI_FALLBACK_MODEL || "claude-haiku-4-5-20251001", messages, json);
  }
  return null;
}

const CLASSIFY = `Classify a message to a Saudi commercial real estate assistant into one intent. Respond strict JSON only with keys:
- mode: "chat" (a greeting, small talk, or asking what you can do, or a general question not tied to a specific space or figure), "search" (they want to find or browse actual spaces or listings), "draft" (they want listing copy written for a space they own or represent), "value" (they ask whether a rent or price is fair, or about current rent levels for a district and asset type), or "watch" (they want a standing alert when rents in a district or asset move).
- district: the Saudi district or city they mention, or null.
- asset: one of "office","retail","medical","showroom","warehouse","serviced","education","land", or null.
- figure: any SAR per square metre number they mention, or null.
- threshold: the percent move they want to be alerted on as a number, or null.
Output only the JSON object.`;

const CHAT_SYS = `You are SAT Advisor, a warm, plain-spoken commercial real estate advisor for SAT Markets, covering commercial property across the Kingdom of Saudi Arabia. Speak like a helpful human colleague, in first person, a sentence or two, never robotic or listy. Your knowledge is strictly limited to SAT Markets: its verified listings, the SAT Rent Index, and what is on the SAT site. You can help the user find a space, value a rent or price against the SAT Rent Index, draft a listing, or watch the market. If the user greets you, welcome them to SAT Markets in one warm sentence, then briefly say you can help them find a space, value a rent against the Rent Index, draft a listing, or watch the market, and ask what they need. Only do this welcome on the very first message of a conversation. If there are earlier messages, do not re-introduce SAT Markets; respond directly to what the user just said. Respect Saudi commercial tiers and never compare across tiers: developments are KAFD, ITCC, Laysen Valley and Roshn Front; districts are Al Olaya, Al Malaz, Hittin, Qurtubah, Sulay, Granada and the Diplomatic Quarter in Riyadh, Al Hamra, Ar Rawdah and Ash Shati in Jeddah, Al Aziziyah in Makkah, Quba in Madinah, and Al Faisaliyah in Dammam. If they ask for anything outside SAT Markets or outside Saudi commercial property, say politely that you only cover SAT Markets and Saudi commercial real estate, then offer what you can do. Never state a specific rent, price, or market statistic here; if they want numbers, ask for a district and an asset type and tell them you will pull the figure from the SAT Rent Index. No em dashes. Invent nothing.`;

const ASK_SYS = `You are SAT Advisor, a warm, plain-spoken human advisor for SAT Markets. The user wants to find a commercial space but has not given enough detail to narrow it down. Ask one or two concise, friendly questions to pin it down, such as the district, the budget per square metre, the size in square metres, and whether they want to lease or buy. Do not list any properties or figures yet. Two sentences at most. No em dashes.`;

export async function POST(req: NextRequest) {
  if (!allow("advisor", req)) return NextResponse.json({ mode: "search" }, { status: 429 });
  const { query, history } = (await req.json()) as { query?: string; history?: { role: string; text: string }[] };
  const raw = (query || "").trim().slice(0, 2000);
  const hist = (Array.isArray(history) ? history : []).slice(-6).filter((h: any) => h && (h.role === "user" || h.role === "assistant") && h.text).map((h: any) => ({ role: h.role as "user" | "assistant", content: String(h.text).slice(0, 600) }));
  const allowedSrc = raw + " " + hist.map((h) => h.content).join(" ");
  if (!raw || !key()) return NextResponse.json({ mode: "search" });

  const cText = await llm([{ role: "system", content: CLASSIFY }, { role: "user", content: raw }], true);
  let intent: any = {};
  try { intent = cText ? JSON.parse(cText) : {}; } catch { intent = {}; }
  const mode = ["chat", "draft", "value", "watch"].includes(intent?.mode) ? intent.mode : "search";

  const supabase = getSupabaseServer();

  if (mode === "search") {
    const broad = !intent?.district && (intent?.figure === null || intent?.figure === undefined);
    if (!broad) return NextResponse.json({ mode: "search" });
    const askMsg = await llm([{ role: "system", content: ASK_SYS }, { role: "user", content: raw }], false);
    const askSafe = askMsg && !unsourcedFigure(askMsg, allowedSrc) ? askMsg : "Happy to help you find the right space. Which location are you considering, for example Al Olaya or KAFD, what is your budget per square metre, and roughly what size do you need?";
    return NextResponse.json({ mode: "ask", message: askSafe });
  }

  if (mode === "chat") {
    const msg = await llm([{ role: "system", content: CHAT_SYS }, ...hist, { role: "user", content: raw }], false);
    const chatSafe = msg && !unsourcedFigure(msg, allowedSrc) ? msg : "I would rather pull any rent or price from the SAT Rent Index than quote one from memory. Tell me the location and asset type, for example Al Olaya office or KAFD office, and I will give you the verified band.";
    return NextResponse.json({ mode: "chat", message: chatSafe });
  }

  if (mode === "value") {
    if (!intent?.district && !intent?.asset) {
      return NextResponse.json({ mode: "value", message: "Tell me the location and the asset type, for example Al Olaya office or KAFD office, and I will pull the current band from the SAT Rent Index." });
    }
    let band: any = null;
    if (supabase) {
      let q = supabase.from("rent_index_published").select("period, district_label, asset_type, segment, unit, band_low, band_high, median, source").order("created_at", { ascending: false }).limit(1);
      if (intent?.asset) q = q.eq("asset_type", intent.asset);
      if (intent?.district) q = q.ilike("district_label", `%${intent.district}%`);
      const { data } = await q;
      band = data && data[0] ? data[0] : null;
    }
    if (!band) {
      return NextResponse.json({ mode: "value", message: "I do not have published SAT Rent Index data for that location and asset type yet, so I will not put a number on it. Try another location, for example Al Olaya office, or browse the verified listings." });
    }
    const seg = band.segment ? ` ${band.segment}` : "";
    const sys = `You are SAT Advisor, a warm, plain-spoken human advisor. Using ONLY the numbers below and never inventing or adjusting them, explain how the figure the user quotes compares to the SAT Rent Index band. Band for ${band.district_label} ${band.asset_type}${seg}: low ${band.band_low}, median ${band.median}, high ${band.band_high} ${band.unit}, period ${band.period}, source ${band.source}. Say clearly whether the quoted figure is below, within, or above the band and how it sits against the median. If they gave no figure, just describe the current band plainly. Two to four sentences. No em dashes.`;
    const msg = await llm([{ role: "system", content: sys }, { role: "user", content: raw }], false);
    const fallback = `SAT Rent Index ${band.period}, ${band.district_label} ${band.asset_type}${seg}: ${band.band_low} to ${band.band_high} ${band.unit}, median ${band.median}. Source ${band.source}.`;
    return NextResponse.json({ mode: "value", message: msg || fallback, band });
  }

  if (mode === "watch") {
    if (!intent?.district && !intent?.asset) {
      return NextResponse.json({ mode: "watch", message: "Tell me the location and asset type you want to watch, for example Al Olaya office or KAFD office, and the percent move to alert on." });
    }
    let band: any = null;
    if (supabase) {
      let q = supabase.from("rent_index_published").select("period, district_label, asset_type, segment, unit, band_low, band_high, median, source").order("created_at", { ascending: false }).limit(1);
      if (intent?.asset) q = q.eq("asset_type", intent.asset);
      if (intent?.district) q = q.ilike("district_label", `%${intent.district}%`);
      const { data } = await q;
      band = data && data[0] ? data[0] : null;
    }
    if (!band) {
      return NextResponse.json({ mode: "watch", message: "I do not have published SAT Rent Index data for that location and asset type yet, so I cannot set a baseline. Try another location, for example Al Olaya office." });
    }
    const threshold = typeof intent?.threshold === "number" && intent.threshold > 0 ? intent.threshold : 5;
    const seg = band.segment ? ` ${band.segment}` : "";
    let saved = false;
    if (supabase) {
      const { error } = await supabase.from("market_watches").insert({ district_label: band.district_label, asset_type: band.asset_type, segment: band.segment ?? null, threshold_pct: threshold, baseline_median: band.median, baseline_band_low: band.band_low, baseline_band_high: band.band_high, baseline_period: band.period });
      saved = !error;
    }
    const baseline = `${band.band_low} to ${band.band_high} ${band.unit}, median ${band.median}, for ${band.period}`;
    const message = saved ? `Done. I am watching ${band.district_label} ${band.asset_type}${seg} for you. The baseline is the current SAT Rent Index band, ${baseline}. When the index next updates, I will flag any move of more than ${threshold} percent. Source ${band.source}.` : `I could not save the watch just now, but the current SAT Rent Index band for ${band.district_label} ${band.asset_type}${seg} is ${baseline}. Source ${band.source}.`;
    return NextResponse.json({ mode: "watch", message, band, threshold, saved });
  }

  const sys = `You are SAT Advisor, a warm, plain-spoken human advisor writing a commercial real estate listing in Saudi Arabia from ONLY the details the user gives. Never invent a rent, price, or measurement they did not state. If they gave no price, omit price and end with one short line telling them to set their own asking figure. Do not fabricate permits or approvals. Write a short title line, then a description of about sixty to ninety words, professional and concrete, in English. No em dashes.`;
  const msg = await llm([{ role: "system", content: sys }, { role: "user", content: raw }], false);
  const draftSafe = msg && !unsourcedFigure(msg, allowedSrc) ? msg : "I have kept any figure out of the draft so nothing unverified goes into your listing. Tell me the asking price you want, or set your own, and I will format the rest from only the details you give.";
  return NextResponse.json({ mode: "draft", message: draftSafe });
}
