import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { allowShared } from "@/lib/ratelimit";
import { unsourcedFigure } from "@/lib/market/guard";

const key = () => process.env.AI_API_KEY || process.env.deepseek_key;
const base = () => process.env.AI_BASE_URL || "https://api.deepseek.com";
const model = () => process.env.AI_MODEL || "deepseek-chat";

const isAr = (s: string) => /[\u0600-\u06FF]/.test(s);

// Cluster-aware examples per the owner market briefing (2026-07-03): Riyadh is
// polycentric, so examples rotate across clusters instead of defaulting to Al Olaya.
// Every entry here is backed by a sufficient published index segment today.
const EXAMPLES = [
  { keys: ["kafd", "كافد"], en: "a KAFD office", ar: "مكتب في كافد" },
  { keys: ["granada", "غرناطة"], en: "a Granada office", ar: "مكتب في غرناطة" },
  { keys: ["hittin", "حطين"], en: "a retail unit in Hittin", ar: "محل تجزئة في حطين" },
  { keys: ["olaya", "al olaya", "العليا"], en: "an Al Olaya office", ar: "مكتب في العليا" },
];
// Exclude the segment the user just asked about, so a thin-sample answer never
// suggests the query that just failed (advisor UX advisory 2026-07-11).
function examplePair(arabic: boolean, exclude?: string | null): string {
  let pool = EXAMPLES;
  if (exclude) {
    const ex = String(exclude).toLowerCase();
    const filtered = EXAMPLES.filter((e) => !e.keys.some((k) => ex.includes(k) || k.includes(ex)));
    if (filtered.length >= 2) pool = filtered;
  }
  const list = pool.map((e) => (arabic ? e.ar : e.en));
  const i = Math.floor(Math.random() * list.length);
  return `${list[i]}${arabic ? " أو " : " or "}${list[(i + 1) % list.length]}`;
}

// The Rent Index is derived from the REGA Rental Index (Ejar): averages of
// registered rental contracts. It used to say the figures came from JLL, CBRE and
// Knight Frank. They did not, and all three forbid republication of their research
// without written permission, so the Advisor may not name them.
function srcLabel(s: string, arabic: boolean): string {
  if (/rcri/i.test(s || "")) return arabic
    ? "\u0645\u0624\u0634\u0631 \u0627\u0644\u0625\u064a\u062c\u0627\u0631 (\u0625\u064a\u062c\u0627\u0631)\u060c \u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0639\u0642\u0648\u062f \u0627\u0644\u0645\u0633\u062c\u0651\u0644\u0629"
    : "REGA Rental Index (Ejar), average of registered rental contracts";
  return s;
}

// Law 3 (structural): block any rent, price, or market figure in free-text
// model output that is not present in the allowed source (the user's own words
// or a verified band we supplied). Errs safe. The value and watch paths are
// already data-gated; this fences the chat, ask, and draft paths.
// unsourcedFigure lives in src/lib/market/guard.ts (shared with translate + shortlist).

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
        // Anthropic requires max_tokens, and an unbounded completion on a public
        // endpoint is a cost and latency hole regardless of provider. Classification
        // is a few tokens of JSON; prose replies are a sentence or two by design.
        max_tokens: json ? 300 : 700,
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


// response_format is honoured by the primary provider but not by Anthropic's
// OpenAI-compatibility layer, so on failover the model may wrap its JSON in a code
// fence or lead with a sentence. Pull the first balanced object out rather than
// letting JSON.parse throw and collapsing every intent to {}.
function parseJsonLoose(text: string | null): any {
  if (!text) return {};
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const i = t.indexOf("{");
  const j = t.lastIndexOf("}");
  if (i >= 0 && j > i) {
    try { return JSON.parse(t.slice(i, j + 1)); } catch { /* give up */ }
  }
  return {};
}

const CLASSIFY = `Classify a message to a Saudi commercial real estate assistant into one intent. Respond strict JSON only with keys:
- mode: "chat" (a greeting, small talk, or asking what you can do, or a general question not tied to a specific space or figure), "search" (they want to find or browse actual spaces or listings), "draft" (they want listing copy written for a space they own or represent), "value" (they ask whether a rent or price is fair, or about current rent levels for a district and asset type), or "watch" (they want a standing alert when rents in a district or asset move).
- district: the Saudi district or city they mention, or null.
- asset: one of "office","retail","medical","showroom","warehouse","serviced","education","land", or null.
- figure: any SAR per square metre number they mention, or null.
- threshold: the percent move they want to be alerted on as a number, or null.
Output only the JSON object.`;

const chatSys = (ctx: string, arabic: boolean) => `You are SAT Advisor, a warm, plain-spoken commercial real estate advisor for SAT Markets, covering commercial property across the Kingdom of Saudi Arabia. Speak like a helpful human colleague, in first person, a sentence or two, never robotic or listy. ${arabic ? "Write your reply in Modern Standard Arabic with Western numerals." : "Write your reply in British English. Do not use Arabic."} Your knowledge is strictly limited to SAT Markets: its verified listings, the Rent Index, and what is on the SAT site. You can help the user find a space, value a rent or price against the Rent Index, draft a listing, or watch the market. Market structure you respect: Riyadh is polycentric and organised in clusters, for example the Laysen Valley cluster in the west beside the Diplomatic Quarter, the KAFD cluster in the north-center, and the Granada cluster in the east, with more forming; each Saudi city has its own market logic and Riyadh's cluster story never transfers to Jeddah, Makkah, Madinah or the Eastern Province. Respect Saudi commercial tiers and never compare across tiers: developments are projects like KAFD, ITCC, Laysen Valley and Roshn Front, never districts; districts are Al Olaya, Al Malaz, Hittin, Qurtubah, Sulay, Granada and the Diplomatic Quarter in Riyadh, Al Hamra, Ar Rawdah and Ash Shati in Jeddah, Al Aziziyah in Makkah, Quba in Madinah, and Al Faisaliyah in Dammam. Deal types go beyond lease and sale: land can be sold or ground-leased, and lease rights can be assigned (tanazul), sometimes with the fit-out sold alongside; you may explain these in general terms, and any specific assignment or capex deal routes to SAT's verified process. The Rent Index is derived from the REGA Rental Index (Ejar): averages of registered rental contracts, by district and asset type. Say average, never median, because that is what the source publishes. Cells with too few registered transactions are shown blank and you must not fill them in. It is indicative, never advice. Never attribute a figure to JLL, CBRE, Knight Frank or any research house: they did not produce our figures and their research may not be republished.${ctx ? ` Live platform context you may cite: ${ctx}. Use only these counts; every rent or price figure still comes only from the Rent Index.` : ""} If the user greets you, welcome them to SAT Markets in one warm sentence, then briefly say you can help them find a space, value a rent against the Rent Index, draft a listing, or watch the market, and ask what they need. Only do this welcome on the very first message of a conversation. If there are earlier messages, do not re-introduce SAT Markets; respond directly to what the user just said. If they ask for anything outside SAT Markets or outside Saudi commercial property, say politely that you only cover SAT Markets and Saudi commercial real estate, then offer what you can do. Never state a specific rent, price, or market statistic that is not in the live platform context; if they want numbers, ask for a location and an asset type and tell them you will pull the figure from the Rent Index. No em dashes. Invent nothing.`;

const askSys = (arabic: boolean) => `You are SAT Advisor, a warm, plain-spoken human advisor for SAT Markets. The user wants to find a commercial space but has not given enough detail to narrow it down. Ask one or two concise, friendly questions to pin it down, such as the district, the budget per square metre, the size in square metres, and whether they want to lease or buy. Do not list any properties or figures yet. Two sentences at most. ${arabic ? "Ask in Modern Standard Arabic with Western numerals." : "Ask in British English. Do not use Arabic."} No em dashes.`;

export async function POST(req: NextRequest) {
  // Durable across instances when a KV store is configured; degrades to the local
  // window when it is not, and never silently opens the endpoint.
  const gate = await allowShared("advisor", req, 15, 60);
  if (!gate.ok) return NextResponse.json({ mode: "search" }, { status: 429 });
  const { query, history } = (await req.json()) as { query?: string; history?: { role: string; text: string }[] };
  const raw = (query || "").trim().slice(0, 2000);
  const hist = (Array.isArray(history) ? history : []).slice(-6).filter((h: any) => h && (h.role === "user" || h.role === "assistant") && h.text).map((h: any) => ({ role: h.role as "user" | "assistant", content: String(h.text).slice(0, 600) }));
  const allowedSrc = raw + " " + hist.map((h) => h.content).join(" ");
  if (!raw || !key()) return NextResponse.json({ mode: "search" });

  const greeting = /^(hey+|hi+|hello+|hala|halla|salam+|salaam|marhaba|\u0647\u0644\u0627|\u0645\u0631\u062d\u0628\u0627?|\u0627\u0644\u0633\u0644\u0627\u0645( \u0639\u0644\u064a\u0643\u0645)?|good (morning|evening|afternoon)|yo|sup)[\s!.\u061f?]*$/i.test(raw) || raw.length < 4;
  const cText = greeting ? null : await llm([{ role: "system", content: CLASSIFY }, { role: "user", content: raw }], true);
  let intent: any = {};
  intent = parseJsonLoose(cText);
  const mode = greeting ? "chat" : ["chat", "draft", "value", "watch"].includes(intent?.mode) ? intent.mode : "search";

  const supabase = getSupabaseServer();
  const arq = isAr(raw);

  // Per-conversation live context (counts only, honest pre-launch posture).
  let ctx = "";
  if (supabase && mode === "chat") {
    try {
      const [ls, seg] = await Promise.all([
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("rent_index_published").select("*", { count: "exact", head: true }).eq("sufficient", true),
      ]);
      if (ls?.count != null && seg?.count != null) ctx = `${ls.count} verified listings live on the exchange (pre-launch sample inventory) and ${seg.count} published Rent Index segments with sufficient data`;
    } catch {}
  }

  if (mode === "search") {
    const broad = !intent?.district && (intent?.figure === null || intent?.figure === undefined);
    if (!broad) return NextResponse.json({ mode: "search" });
    const askMsg = await llm([{ role: "system", content: askSys(arq) }, { role: "user", content: raw }], false);
    const askSafe = askMsg && !unsourcedFigure(askMsg, allowedSrc) ? askMsg : (arq ? `يسعدني مساعدتك في إيجاد المساحة المناسبة. أي موقع تفكر فيه، مثلاً ${examplePair(true)}، وما ميزانيتك للمتر المربع، وما المساحة التي تحتاجها تقريباً؟` : `Happy to help you find the right space. Which location are you considering, for example ${examplePair(false)}, what is your budget per square metre, and roughly what size do you need?`);
    return NextResponse.json({ mode: "ask", message: askSafe });
  }

  if (mode === "chat") {
    const msg = await llm([{ role: "system", content: chatSys(ctx, arq) }, ...hist, { role: "user", content: raw }], false);
    const chatSafe = msg && !unsourcedFigure(msg, allowedSrc + " " + ctx) ? msg : (arq ? `أفضل أن آخذ أي إيجار أو سعر من مؤشر الإيجارات لا من الذاكرة. أخبرني بالموقع ونوع الأصل، مثلاً ${examplePair(true)}، وسأعطيك النطاق الموثّق.` : `I would rather pull any rent or price from the Rent Index than quote one from memory. Tell me the location and asset type, for example ${examplePair(false)}, and I will give you the verified band.`);
    return NextResponse.json({ mode: "chat", message: chatSafe });
  }

  if (mode === "value") {
    if (!intent?.district && !intent?.asset) {
      return NextResponse.json({ mode: "value", message: arq ? `أخبرني بالموقع ونوع الأصل، مثلاً ${examplePair(true)}، وسأستخرج النطاق الحالي من مؤشر الإيجارات.` : `Tell me the location and the asset type, for example ${examplePair(false)}, and I will pull the current band from the Rent Index.` });
    }
    let band: any = null;
    if (supabase) {
      let q = supabase.from("rent_index_published").select("period, district_label, district_id, asset_type, segment, unit, band_low, band_high, median, source").eq("sufficient", true).order("created_at", { ascending: false }).limit(1);
      if (intent?.asset) q = q.eq("asset_type", intent.asset);
      if (intent?.district) q = q.ilike("district_label", `%${intent.district}%`);
      const { data } = await q;
      band = data && data[0] ? data[0] : null;
    }
    if (!band) {
      return NextResponse.json({ mode: "value", message: arq ? `لا تتوفر لدي بيانات منشورة في مؤشر الإيجارات لهذا الموقع ونوع الأصل بعد، لذلك لن أضع رقماً. جرّب موقعاً آخر، مثلاً ${examplePair(true, intent?.district)}، أو تصفّح العروض الموثّقة.` : `I do not have published Rent Index data for that location and asset type yet, so I will not put a number on it. Try another location, for example ${examplePair(false, intent?.district)}, or browse the verified listings.` });
    }
    const seg = band.segment ? ` ${band.segment}` : "";
    const sys = `You are SAT Advisor, a warm, plain-spoken human advisor. Using ONLY the numbers below and never inventing or adjusting them, explain how the figure the user quotes compares to the Rent Index band. Band for ${band.district_label} ${band.asset_type}${seg}: low ${band.band_low}, median ${band.median}, high ${band.band_high} ${band.unit}, period ${band.period}, source ${srcLabel(band.source, arq)}. Say clearly whether the quoted figure is below, within, or above the band and how it sits against the median. If they gave no figure, just describe the current band plainly. Two to four sentences. ${arq ? "Write in Modern Standard Arabic with Western numerals." : "Write in British English. Do not use Arabic."} No em dashes.`;
    const msg = await llm([{ role: "system", content: sys }, { role: "user", content: raw }], false);
    const fallback = arq
      ? `\u0645\u0624\u0634\u0631 \u0633\u0627\u062a \u0644\u0644\u0625\u064a\u062c\u0627\u0631\u0627\u062a ${band.period}\u060c ${band.district_label} ${band.asset_type}${seg}: \u0645\u0646 ${band.band_low} \u0625\u0644\u0649 ${band.band_high} ${band.unit}\u060c \u0627\u0644\u0648\u0633\u064a\u0637 ${band.median}. \u0627\u0644\u0645\u0635\u062f\u0631 ${srcLabel(band.source, true)}.`
      : `Rent Index ${band.period}, ${band.district_label} ${band.asset_type}${seg}: ${band.band_low} to ${band.band_high} ${band.unit}, median ${band.median}. Source ${srcLabel(band.source, false)}.`;
    return NextResponse.json({ mode: "value", message: msg || fallback, band });
  }

  if (mode === "watch") {
    if (!intent?.district && !intent?.asset) {
      return NextResponse.json({ mode: "watch", message: arq ? `أخبرني بالموقع ونوع الأصل الذي تريد مراقبته، مثلاً ${examplePair(true)}، ونسبة التحرك التي تريد التنبيه عندها.` : `Tell me the location and asset type you want to watch, for example ${examplePair(false)}, and the percent move to alert on.` });
    }
    let band: any = null;
    if (supabase) {
      let q = supabase.from("rent_index_published").select("period, district_label, district_id, asset_type, segment, unit, band_low, band_high, median, source").eq("sufficient", true).order("created_at", { ascending: false }).limit(1);
      if (intent?.asset) q = q.eq("asset_type", intent.asset);
      if (intent?.district) q = q.ilike("district_label", `%${intent.district}%`);
      const { data } = await q;
      band = data && data[0] ? data[0] : null;
    }
    if (!band) {
      return NextResponse.json({ mode: "watch", message: arq ? `لا تتوفر لدي بيانات منشورة في مؤشر الإيجارات لهذا الموقع ونوع الأصل بعد، لذلك لا أستطيع تثبيت خط أساس. جرّب موقعاً آخر، مثلاً ${examplePair(true, intent?.district)}.` : `I do not have published Rent Index data for that location and asset type yet, so I cannot set a baseline. Try another location, for example ${examplePair(false, intent?.district)}.` });
    }
    const threshold = typeof intent?.threshold === "number" && intent.threshold > 0 ? intent.threshold : 5;
    const seg = band.segment ? ` ${band.segment}` : "";
    let saved = false;
    if (supabase) {
      const { error } = await supabase.from("market_watches").insert({ district_label: band.district_label, asset_type: band.asset_type, segment: band.segment ?? null, threshold_pct: threshold, baseline_median: band.median, baseline_band_low: band.band_low, baseline_band_high: band.band_high, baseline_period: band.period });
      saved = !error;
    }
    const baseline = arq
      ? `من ${band.band_low} إلى ${band.band_high} ${band.unit}، الوسيط ${band.median}، للفترة ${band.period}`
      : `${band.band_low} to ${band.band_high} ${band.unit}, median ${band.median}, for ${band.period}`;
    const message = saved
      ? (arq
        ? `تم. أراقب لك ${band.district_label} ${band.asset_type}${seg}. خط الأساس هو نطاق المؤشر الحالي، ${baseline}. عند التحديث القادم للمؤشر سأنبهك لأي حركة تتجاوز ${threshold} بالمئة. المصدر ${srcLabel(band.source, true)}.`
        : `Done. I am watching ${band.district_label} ${band.asset_type}${seg} for you. The baseline is the current Rent Index band, ${baseline}. When the index next updates, I will flag any move of more than ${threshold} percent. Source ${srcLabel(band.source, false)}.`)
      : (arq
        ? `تعذر حفظ المراقبة الآن، لكن نطاق المؤشر الحالي لـ ${band.district_label} ${band.asset_type}${seg} هو ${baseline}. المصدر ${srcLabel(band.source, true)}.`
        : `I could not save the watch just now, but the current Rent Index band for ${band.district_label} ${band.asset_type}${seg} is ${baseline}. Source ${srcLabel(band.source, false)}.`);
    return NextResponse.json({ mode: "watch", message, band, threshold, saved });
  }

  const sys = `You are SAT Advisor, a warm, plain-spoken human advisor writing a commercial real estate listing in Saudi Arabia from ONLY the details the user gives. Never invent a rent, price, or measurement they did not state. If they gave no price, omit price and end with one short line telling them to set their own asking figure. Do not fabricate permits or approvals. Write a short title line, then a description of about sixty to ninety words, professional and concrete. ${arq ? "Write in Modern Standard Arabic with Western numerals." : "Write in British English. Do not use Arabic."} No em dashes.`;
  const msg = await llm([{ role: "system", content: sys }, { role: "user", content: raw }], false);
  const draftSafe = msg && !unsourcedFigure(msg, allowedSrc) ? msg : (arq ? `أبقيت أي رقم خارج المسودة حتى لا يدخل شيء غير موثّق في إعلانك. أخبرني بالسعر المطلوب الذي تريده، أو حدده بنفسك، وسأنسق الباقي مما تقدمه من تفاصيل فقط.` : `I have kept any figure out of the draft so nothing unverified goes into your listing. Tell me the asking price you want, or set your own, and I will format the rest from only the details you give.`);
  return NextResponse.json({ mode: "draft", message: draftSafe });
}
