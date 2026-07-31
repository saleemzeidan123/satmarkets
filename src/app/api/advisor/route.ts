import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { releaseVisibleInventory } from "@/lib/inventory";
import { allowShared } from "@/lib/ratelimit";
import { unsourcedFigure } from "@/lib/market/guard";
import { toPublicSegment, type IndexRowLike } from "@/lib/market/segments";
import { buildValueEvidence, detectRequestedSegment, displayPeriod, renderValue, type PeriodStatus } from "@/lib/market/valueEvidence";
import { readNumericIntent } from "@/lib/market/numericIntent";
import { readAdvisorIntent, type AdvisorMode } from "@/lib/advisor/intent";
import { allowedSources, userHistory } from "@/lib/advisor/history";
import { callModelText, classifiedSlot, instruction, phrase, priorUserTurn, userWords, type ClassifiedMessage } from "@/lib/ai";
import { rentIndexSourceLabel } from "@/lib/market/attribution";
import { type RentIndexCell, rentIndexQuoteGate, withheldGate } from "@/lib/rentIndexEvidence";
import { advisorQuoteMessage } from "@/lib/advisor/quote";
import { getSourceRightsOrNull } from "@/lib/queries/sourceRights";
import { REGA_RENT_INDEX_SOURCE_ID } from "@/lib/sources/catalogue";

const isAr = (s: string) => /[\u0600-\u06FF]/.test(s);

/**
 * A canonical statement, joined mid-sentence after a lead-in clause.
 *
 * Only the first character, and only when it is one the language actually
 * cases. Arabic has no case, so this is a no-op there, and lowercasing the
 * whole string would flatten a proper noun in English.
 */
const lower = (s: string): string => (s ? s[0].toLowerCase() + s.slice(1) : s);

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

// Resolve a district name the classifier extracted (which comes back in whatever
// language the user typed, e.g. "العليا") to a canonical district id, matching on
// both the English and Arabic names. Without this, an Arabic district name is
// ilike-matched against the English-only district_label, never matches, and the
// Advisor falsely tells Arabic users there is no data for a district that has data.
async function resolveDistrictId(supabase: any, name?: string | null): Promise<string | null> {
  if (!supabase || !name) return null;
  const n = String(name).trim();
  if (!n) return null;
  try {
    const { data } = await supabase
      .from("districts")
      .select("id, name_en, name_ar")
      .or(`name_en.ilike.%${n}%,name_ar.ilike.%${n}%`)
      .limit(1);
    return data && data[0] ? data[0].id : null;
  } catch { return null; }
}

// The Rent Index is derived from the REGA Rental Index (Ejar): averages of
// registered rental contracts. It used to say the figures came from JLL, CBRE and
// Knight Frank. They did not, and all three forbid republication of their research
// without written permission, so the Advisor may not name them.
// Owner ruling 2. This used to carry its own escaped Arabic literal, a third
// spelling of the source that named no authority. One canonical constant now.
const srcLabel = (s: string, arabic: boolean): string => rentIndexSourceLabel(s, arabic);

// Law 3 (structural): block any rent, price, or market figure in free-text
// model output that is not present in the allowed source (the user's own words
// or a published band we supplied). Errs safe. The value and watch paths are
// already data-gated; this fences the chat, ask, and draft paths.
// unsourcedFigure lives in src/lib/market/guard.ts (shared with translate + shortlist).

// ADV-3A. There is no provider call in this file any more.
//
// There used to be one: a `callProvider` that opened a socket, a `key()`/`base()`
// /`model()` trio that decided which vendor answered, and an `llm()` that checked
// the boundary against `ADVISOR_PROMPT_PARTS`, a hand-written description of the
// request, before sending a completely separate `messages` array. The description
// and the request were two objects that nothing kept in step.
//
// Now the messages carry their own classes and the gateway derives the boundary
// check from the exact array it sends. Failover, timeouts, the dash sanitizer and
// model selection all moved to `src/lib/ai`, so the advisor no longer holds a
// private opinion about any of them.
//
// A denial or a dead provider still returns null, which is the value every caller
// below already handles by degrading to a written deterministic sentence. The
// failure mode of a closed boundary remains a plainer advisor, never a silent send.
async function llm(messages: ClassifiedMessage[], json: boolean): Promise<string | null> {
  return callModelText({
    profile: json ? "classification" : "short_prose",
    messages,
    json,
    // Classification is a few tokens of JSON; prose replies are a sentence or two
    // by design, so neither needs the package default.
    maxTokens: json ? 300 : 700,
  });
}


// ADV-3A.1. THE INTENT CLASSIFIER IS NO LONGER A MODEL CALL.
//
// It used to be: a `CLASSIFY` system prompt returned strict JSON with a mode, a
// district, an asset, a figure and a threshold, and a `parseJsonLoose` helper
// existed solely to rescue that JSON when a failover provider wrapped it in a
// code fence.
//
// Two things ended it. The first is the boundary: while no enterprise AI
// agreement is in force, the person's message may not reach an external provider,
// so the classifier would return null on every turn and every non-greeting would
// collapse to `mode: "search"`. That would have silently destroyed the `value`
// and `watch` paths, which are the two that read the published Rent Index and
// involve no model at all once the intent is known.
//
// The second is that the deterministic reader is simply better at this. The
// route already ignored the model's `figure` field, because a model reading "in
// 2026" returned a rent of 2,026; `readNumericIntent` was written to fix exactly
// that and is tested against it. Having replaced the one field that mattered
// most, keeping a model for the other four was paying a provider to be less
// reliable than a table of words.
//
// So `src/lib/advisor/intent.ts` reads the intent, in both languages, with no
// network call and no provider. The model is still used for PROSE, which is what
// it is good at, and every prose path already degrades to a written sentence.

const chatInstruction = (ctx: string, arabic: boolean): ClassifiedMessage =>
  instruction("advisor chat instruction")`You are SAT Advisor, a warm, plain-spoken commercial real estate advisor for SAT Markets, covering commercial property across the Kingdom of Saudi Arabia. Speak like a helpful human colleague, in first person, a sentence or two, never robotic or listy. ${arabic ? phrase`Write your reply in Modern Standard Arabic with Western numerals.` : phrase`Write your reply in British English. Do not use Arabic.`} Your knowledge is strictly limited to SAT Markets: its listings, the Rent Index, and what is on the SAT site. You can help the user find a space, value a rent or price against the Rent Index, draft a listing, or watch the market. Market structure you respect: Riyadh is polycentric and organised in clusters, for example the Laysen Valley cluster in the west beside the Diplomatic Quarter, the KAFD cluster in the north-center, and the Granada cluster in the east, with more forming; each Saudi city has its own market logic and Riyadh's cluster story never transfers to Jeddah, Makkah, Madinah or the Eastern Province. Respect Saudi commercial tiers and never compare across tiers: developments are projects like KAFD, ITCC, Laysen Valley and Roshn Front, never districts; districts are Al Olaya, Al Malaz, Hittin, Qurtubah, Sulay, Granada and the Diplomatic Quarter in Riyadh, Al Hamra, Ar Rawdah and Ash Shati in Jeddah, Al Aziziyah in Makkah, Quba in Madinah, and Al Faisaliyah in Dammam. Deal types go beyond lease and sale: land can be sold or ground-leased, and lease rights can be assigned (tanazul), sometimes with the fit-out sold alongside; you may explain these in general terms, and any specific assignment or capex deal routes to SAT's verified process. The Rent Index is derived from the REGA Rental Index (Ejar): averages of registered rental contracts, by district and asset type. Say average, never median, because that is what the source publishes. Cells with too few registered transactions are shown blank and you must not fill them in. It is indicative, never advice. Never attribute a figure to JLL, CBRE, Knight Frank or any research house: they did not produce our figures and their research may not be republished.${
    ctx
      ? // The one place the advisor quotes live platform data inside its own
        // instruction. It is a slot, so the counts declare themselves as an
        // aggregate over inventory and the boundary sees them separately from the
        // instruction that carries them. Under the ADV-3A.1 tagged-template API
        // there is no other way in: a raw interpolation throws.
        phrase` Live platform context you may cite: ${classifiedSlot(ctx, [
          { label: "published listing and index segment counts", dataClass: "aggregate_count", overParties: false },
        ])}. Use only these counts; every rent or price figure still comes only from the Rent Index.`
      : phrase``
  } If the user greets you, welcome them to SAT Markets in one warm sentence, then briefly say you can help them find a space, value a rent against the Rent Index, draft a listing, or watch the market, and ask what they need. Only do this welcome on the very first message of a conversation. If there are earlier messages, do not re-introduce SAT Markets; respond directly to what the user just said. If they ask for anything outside SAT Markets or outside Saudi commercial property, say politely that you only cover SAT Markets and Saudi commercial real estate, then offer what you can do. Never state a specific rent, price, or market statistic that is not in the live platform context; if they want numbers, ask for a location and an asset type and tell them you will pull the figure from the Rent Index. No em dashes. Invent nothing.`;

const askInstruction = (arabic: boolean): ClassifiedMessage =>
  instruction("advisor ask instruction")`You are SAT Advisor, a warm, plain-spoken human advisor for SAT Markets. The user wants to find a commercial space but has not given enough detail to narrow it down. Ask one or two concise, friendly questions to pin it down, such as the district, the budget per square metre, the size in square metres, and whether they want to lease or buy. Do not list any properties or figures yet. Two sentences at most. ${arabic ? phrase`Ask in Modern Standard Arabic with Western numerals.` : phrase`Ask in British English. Do not use Arabic.`} No em dashes.`;

const draftInstruction = (arabic: boolean): ClassifiedMessage =>
  instruction("advisor draft instruction")`You are SAT Advisor, a warm, plain-spoken human advisor writing a commercial real estate listing in Saudi Arabia from ONLY the details the user gives. Never invent a rent, price, or measurement they did not state. If they gave no price, omit price and end with one short line telling them to set their own asking figure. Do not fabricate permits or approvals. Write a short title line, then a description of about sixty to ninety words, professional and concrete. ${arabic ? phrase`Write in Modern Standard Arabic with Western numerals.` : phrase`Write in British English. Do not use Arabic.`} No em dashes.`;

export async function POST(req: NextRequest) {
  // Durable across instances when a KV store is configured; degrades to the local
  // window when it is not, and never silently opens the endpoint.
  const gate = await allowShared("advisor", req, 15, 60);
  if (!gate.ok) return NextResponse.json({ mode: "search" }, { status: 429 });
  const { query, history } = (await req.json()) as { query?: string; history?: { role: string; text: string }[] };
  const raw = (query || "").trim().slice(0, 2000);
  // ADV-3A.1. ONLY THE PERSON'S OWN TURNS SURVIVE THIS LINE.
  //
  // The filter and the evidence set both live in `@/lib/advisor/history` rather
  // than here, and the reason is not tidiness. A route module may only export
  // HTTP handlers, so an inline filter is a rule no test can call. Codex item 3
  // asks for a regression test proving that a number present only in a previous
  // assistant message stays unsupported, and that test has to exercise the rule
  // the route actually runs, not a copy of it written in the test file.
  //
  // What the rule is, and why, is written where it lives.
  const hist = userHistory(history);
  const allowedSrc = allowedSources(raw, hist);
  if (!raw) return NextResponse.json({ mode: "search" });

  const greeting = /^(hey+|hi+|hello+|hala|halla|salam+|salaam|marhaba|\u0647\u0644\u0627|\u0645\u0631\u062d\u0628\u0627?|\u0627\u0644\u0633\u0644\u0627\u0645( \u0639\u0644\u064a\u0643\u0645)?|good (morning|evening|afternoon)|yo|sup)[\s!.\u061f?]*$/i.test(raw) || raw.length < 4;
  const intent = readAdvisorIntent(raw);
  const mode: AdvisorMode = greeting ? "chat" : intent.mode;

  const supabase = getSupabaseServer();
  const arq = isAr(raw);

  // Per-conversation live context (counts only, honest pre-launch posture).
  let ctx = "";
  if (supabase && mode === "chat") {
    try {
      const [ls, seg] = await Promise.all([
        releaseVisibleInventory(supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "published")),
        supabase.from("rent_index_published").select("*", { count: "exact", head: true }).eq("sufficient", true),
      ]);
      if (ls?.count != null && seg?.count != null) ctx = `${ls.count} published listings live on the exchange (pre-launch sample inventory) and ${seg.count} published Rent Index segments with sufficient data`;
    } catch {}
  }

  if (mode === "search") {
    const broad = !intent?.district && (intent?.figure === null || intent?.figure === undefined);
    if (!broad) return NextResponse.json({ mode: "search" });
    const askMsg = await llm([askInstruction(arq), userWords(raw)], false);
    const askSafe = askMsg && !unsourcedFigure(askMsg, allowedSrc) ? askMsg : (arq ? `يسعدني مساعدتك في إيجاد المساحة المناسبة. أي موقع تفكر فيه، مثلاً ${examplePair(true)}، وما ميزانيتك للمتر المربع، وما المساحة التي تحتاجها تقريباً؟` : `Happy to help you find the right space. Which location are you considering, for example ${examplePair(false)}, what is your budget per square metre, and roughly what size do you need?`);
    return NextResponse.json({ mode: "ask", message: askSafe });
  }

  if (mode === "chat") {
    const msg = await llm([chatInstruction(ctx, arq), ...hist.map((h) => priorUserTurn(h.content)), userWords(raw)], false);
    const chatSafe = msg && !unsourcedFigure(msg, allowedSrc + " " + ctx) ? msg : (arq ? `أفضل أن آخذ أي إيجار أو سعر من مؤشر الإيجارات لا من الذاكرة. أخبرني بالموقع ونوع الأصل، مثلاً ${examplePair(true)}، وسأعطيك النطاق المنشور.` : `I would rather pull any rent or price from the Rent Index than quote one from memory. Tell me the location and asset type, for example ${examplePair(false)}, and I will give you the published band.`);
    return NextResponse.json({ mode: "chat", message: chatSafe });
  }

  if (mode === "value") {
    if (!intent?.district && !intent?.asset) {
      return NextResponse.json({ mode: "value", message: arq ? `أخبرني بالموقع ونوع الأصل، مثلاً ${examplePair(true)}، وسأستخرج النطاق الحالي من مؤشر الإيجارات.` : `Tell me the location and the asset type, for example ${examplePair(false)}, and I will pull the current band from the Rent Index.` });
    }
    // Numbers are separated by MEANING before anything is compared to a band
    // (PKG-1B.2, Codex items 1 to 3). A reporting year, a floor area, a percentage
    // and a total budget are not rents; only an explicit rent unit or an explicit
    // rent comparison produces a comparison figure. The model's own `figure` is
    // deliberately ignored here: it is what turned "in 2026" into a 2,026 rent.
    const numeric = readNumericIntent(raw);
    const wantedPeriod = numeric.requestedPeriod;
    let periodStatus: PeriodStatus = "none";
    let band: any = null;
    if (supabase) {
      const did = await resolveDistrictId(supabase, intent?.district);
      const scoped = (cols: string) => {
        let q = supabase.from("rent_index_published").select(cols).eq("sufficient", true);
        if (intent?.asset) q = q.eq("asset_type", intent.asset);
        // Prefer an exact district_id match (language-independent); fall back to a
        // label ilike only when the name did not resolve to a known district.
        if (did) q = q.eq("district_id", did);
        else if (intent?.district) q = q.ilike("district_label", `%${intent.district}%`);
        return q;
      };
      // ADV-1D. Four columns the answer never needed and the Evidence Passport
      // cannot do without: `sufficient` so the sample state is read rather than
      // assumed from the filter, `stat_kind` so the statistic is the row's own
      // word and not the column name (Law 6), and the two record-class markers.
      //
      // Two selects, exactly as `/rent-index` does it, because PostgREST fails
      // the WHOLE query on one unknown column. If the wide list is not what the
      // schema holds, the narrow list is the pre-ADV-1D list unchanged, the
      // answer is identical to the one shipped before this package, and every
      // passport resolves to `unknown` and withholds. A schema that is not what
      // we expect must cost us the evidence, never buy us a claim.
      const V_WIDE = "id, period, district_label, district_label_ar, district_id, asset_type, segment, unit, band_low, band_high, median, source, sufficient, stat_kind, data_class, is_demo";
      const V_NARROW = "id, period, district_label, district_label_ar, district_id, asset_type, segment, unit, band_low, band_high, median, source";
      const firstRow = async (build: (cols: string) => any): Promise<any | null> => {
        let { data, error } = await build(V_WIDE);
        if (error || !data) ({ data } = await build(V_NARROW));
        return data && data[0] ? data[0] : null;
      };
      // Ask for the period the user asked for. Only when that period is not
      // published do we fall back to the newest one, and then the answer must say
      // so rather than presenting the newest row as the requested period.
      if (wantedPeriod) {
        const exact = /^\d{4}-Q[1-4]$/.test(wantedPeriod);
        const row = await firstRow((cols) =>
          (exact ? scoped(cols).eq("period", wantedPeriod) : scoped(cols).ilike("period", `${wantedPeriod}%`))
            .order("period", { ascending: false })
            .limit(1)
        );
        if (row) { band = row; periodStatus = "match"; }
      }
      if (!band) {
        band = await firstRow((cols) => scoped(cols).order("created_at", { ascending: false }).limit(1));
        if (band && wantedPeriod) periodStatus = "unavailable";
      }
    }
    if (!band) {
      return NextResponse.json({ mode: "value", message: arq ? `لا تتوفر لدي بيانات منشورة في مؤشر الإيجارات لهذا الموقع ونوع الأصل بعد، لذلك لن أضع رقماً. جرّب موقعاً آخر، مثلاً ${examplePair(true, intent?.district)}، أو تصفّح العروض المنشورة.` : `I do not have published Rent Index data for that location and asset type yet, so I will not put a number on it. Try another location, for example ${examplePair(false, intent?.district)}, or browse the published listings.` });
    }
    // Structured evidence boundary (Codex Advisor P0). Build ONE result from the
    // retrieved row plus the user's own figure and any specific segment they asked
    // for; render BOTH locales from it deterministically (no model call). This is
    // what makes EN and AR provably agree on scope, segment, numbers, source and a
    // localized location, and stops a general-office band from ever being relabelled
    // a Grade A band. Tests: src/lib/market/valueEvidence.test.ts.
    const requestedSegment = detectRequestedSegment(raw);
    const ev = buildValueEvidence(band as any, requestedSegment, numeric.rent, { requested: wantedPeriod, status: periodStatus });
    if (!ev) {
      return NextResponse.json({ mode: "value", message: arq ? `\u0644\u0627 \u062a\u062a\u0648\u0641\u0631 \u0644\u062f\u064a \u0628\u064a\u0627\u0646\u0627\u062a \u0643\u0627\u0641\u064a\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639 \u0648\u0646\u0648\u0639 \u0627\u0644\u0623\u0635\u0644 \u0628\u0639\u062f.` : `I do not have sufficient published data for that location and asset type yet, so I will not put a number on it.` });
    }
    // ADV-1E, finding 90. The decision is taken BEFORE the sentence is written,
    // because a sentence that has already been written is a sentence somebody
    // will be tempted to send.
    //
    // `getSourceRightsOrNull`, never `getSourceRights`: the denying variant
    // returns a row matching the id asked for, which would render "the
    // permission recorded for this source does not cover this audience" when
    // nothing was recorded and nothing was read. Correction 5 keeps those apart.
    //
    // A throw here is not a reason to answer anyway. Evidence used to be "an
    // addition to the answer, never a precondition for it", which was true while
    // the answer was ungated and is the opposite of true now: if we cannot
    // establish that we may quote the figure, we may not quote the figure. So
    // the catch fails closed onto `unavailable` rather than onto the sentence.
    const geography = arq ? (band.district_label_ar || band.district_label) : band.district_label;
    let gate;
    try {
      const rights = await getSourceRightsOrNull(REGA_RENT_INDEX_SOURCE_ID);
      gate = rentIndexQuoteGate(band as RentIndexCell, { locale: arq ? "ar" : "en", geography }, rights);
    } catch {
      gate = withheldGate(arq ? "ar" : "en");
    }

    // Codex item 2. The figure does not reach the browser, the API consumer or
    // the chart when the decision says it may not be quoted. Not hidden, not
    // styled away, not left in a key the client happens not to read today: the
    // keys carrying it are absent from the response, so there is nothing to
    // expose later by reading them.
    if (!gate.mayShowFigure) {
      return NextResponse.json({
        mode: "value",
        message: `${arq ? `لدي خلية منشورة لهذا الموقع ونوع الأصل، لكن` : `I hold a published cell for that location and asset type, but`} ${lower(gate.statement ?? "")}`,
        evidence: { id: ev.evidenceId, supportedSegment: ev.supportedSegment, requestedSegment: ev.requestedSegment, supportStatus: ev.supportStatus, limitationReason: ev.limitationReason, requestedPeriod: ev.requestedPeriod, periodStatus: ev.periodStatus },
        quote: gate.kind,
      });
    }

    const message = advisorQuoteMessage(gate, renderValue(ev, arq ? "ar" : "en"));

    // ADV-1D, correction 4: the passport on the Advisor published-band surface.
    //
    // "Do not attach a passport to an Advisor answer unless the displayed figure
    // is completely traceable through an authorized typed tool result." Two
    // things make that true here and both are structural rather than hopeful.
    //
    // First, the figure. `renderValue` is a pure function of `ev`, `ev` is a
    // pure function of `band`, and `band` is one row this route read from
    // `rent_index_published`. No model call sits anywhere on that path, so the
    // number in the message is the number in the row. The passports are built
    // from the SAME `band` object, so they cannot be evidence for a different
    // figure than the one the reader was shown.
    //
    // Second, ADV-1E: the gate above decided whether there is a figure at all,
    // and these passports are the views it carried out of that same decision.
    // The route no longer builds a second set here, which is what made finding
    // 90 possible: two readings of one row cannot disagree if only one is taken.
    const passports = gate.passports;
    // Public payload: the figure travels as `average` (the stored value IS an
    // arithmetic average; see lib/market/segments.ts). Never expose `median`. The
    // evidence summary lets the client and QA assert the same scope both languages saw.
    return NextResponse.json({
      mode: "value",
      message,
      band: toPublicSegment(band as IndexRowLike),
      // The server is the ONLY place a user figure is identified. The client used to
      // re-parse the question with the same naive first-number regex, so it drew the
      // "your rate" marker on the chart from a year or an area even after the prose
      // stopped doing so. It now consumes this authoritative value and nothing else.
      quoted: ev.userFigure,
      evidence: { id: ev.evidenceId, supportedSegment: ev.supportedSegment, requestedSegment: ev.requestedSegment, supportStatus: ev.supportStatus, limitationReason: ev.limitationReason, requestedPeriod: ev.requestedPeriod, periodStatus: ev.periodStatus },
      // A separate key. `evidence` above is the scope summary the client and QA
      // already assert on, and overloading it would have one name meaning two
      // things. Absent as an empty array when nothing was traceable.
      passports,
      // The decision itself, named, so a machine consumer reads the same verdict
      // the sentence was written from instead of inferring one from whether a
      // key happens to be present.
      quote: gate.kind,
    });
  }

  if (mode === "watch") {
    if (!intent?.district && !intent?.asset) {
      return NextResponse.json({ mode: "watch", message: arq ? `أخبرني بالموقع ونوع الأصل الذي تريد مراقبته، مثلاً ${examplePair(true)}، ونسبة التحرك التي تريد التنبيه عندها.` : `Tell me the location and asset type you want to watch, for example ${examplePair(false)}, and the percent move to alert on.` });
    }
    let band: any = null;
    if (supabase) {
      const did = await resolveDistrictId(supabase, intent?.district);
      // ADV-1E. The same two-select widening the value path and `/rent-index`
      // use. The watch answer quotes a baseline band in prose, which is a public
      // figure and is therefore subject to the same decision, and a decision
      // cannot be taken on columns that were never selected. If the wide list is
      // not what the schema holds, the narrow list is the pre-ADV-1E list
      // unchanged, every record-class marker arrives undefined, and the decision
      // fails closed onto a withheld baseline. A schema that is not what we
      // expect must cost us a figure, never buy us a claim.
      const W_WIDE = "period, district_label, district_label_ar, district_id, asset_type, segment, unit, band_low, band_high, median, source, sufficient, stat_kind, data_class, is_demo";
      const W_NARROW = "period, district_label, district_id, asset_type, segment, unit, band_low, band_high, median, source";
      const build = (cols: string) => {
        let q = supabase.from("rent_index_published").select(cols).eq("sufficient", true).order("created_at", { ascending: false }).limit(1);
        if (intent?.asset) q = q.eq("asset_type", intent.asset);
        if (did) q = q.eq("district_id", did);
        else if (intent?.district) q = q.ilike("district_label", `%${intent.district}%`);
        return q;
      };
      let { data, error } = await build(W_WIDE);
      if (error || !data) ({ data } = await build(W_NARROW));
      band = data && data[0] ? data[0] : null;
    }
    if (!band) {
      return NextResponse.json({ mode: "watch", message: arq ? `لا تتوفر لدي بيانات منشورة في مؤشر الإيجارات لهذا الموقع ونوع الأصل بعد، لذلك لا أستطيع تثبيت خط أساس. جرّب موقعاً آخر، مثلاً ${examplePair(true, intent?.district)}.` : `I do not have published Rent Index data for that location and asset type yet, so I cannot set a baseline. Try another location, for example ${examplePair(false, intent?.district)}.` });
    }
    const threshold = typeof intent?.threshold === "number" && intent.threshold > 0 ? intent.threshold : 5;
    const seg = band.segment ? ` ${band.segment}` : "";

    // ADV-1E, finding 90 on the watch path.
    //
    // This path printed `band.band_low`, `band.band_high` and `band.median`
    // straight out of the row, in both languages, with no licence question asked
    // and no passport anywhere near it. It is the same public quote the value
    // path makes, so it takes the same decision, from the same function.
    //
    // The WRITE is not gated and deliberately so. Storing a baseline is internal
    // processing, which `sourceRights.ts` governs by `storagePolicy` and not by
    // display, and the row we insert is never shown to anyone. What is gated is
    // the sentence, which is the part a person reads.
    const wGeo = arq ? (band.district_label_ar || band.district_label) : band.district_label;
    let wGate;
    try {
      const rights = await getSourceRightsOrNull(REGA_RENT_INDEX_SOURCE_ID);
      wGate = rentIndexQuoteGate(band as RentIndexCell, { locale: arq ? "ar" : "en", geography: wGeo }, rights);
    } catch {
      wGate = withheldGate(arq ? "ar" : "en");
    }

    let saved = false;
    if (supabase) {
      const { error } = await supabase.from("market_watches").insert({ district_label: band.district_label, asset_type: band.asset_type, segment: band.segment ?? null, threshold_pct: threshold, baseline_median: band.median, baseline_band_low: band.band_low, baseline_band_high: band.band_high, baseline_period: band.period });
      saved = !error;
    }
    // Periods are rendered through the shared bilingual helper, never as the raw
    // "2026-Q2" storage form (Codex item 5).
    const baselinePeriod = displayPeriod(band.period, arq);
    const baseline = arq
      ? `من ${band.band_low} إلى ${band.band_high} ${band.unit}، المتوسط ${band.median}، للفترة ${baselinePeriod}`
      : `${band.band_low} to ${band.band_high} ${band.unit}, average ${band.median}, for ${baselinePeriod}`;
    // WE CANNOT ALERT ANYONE, SO WE DO NOT SAY WE WILL.
    //
    // This used to answer: "I am watching X for you. When the index next updates, I
    // will flag any move of more than N percent."
    //
    // We cannot. The row we just wrote carries no contact_email and no user id -- look
    // at the insert above, it sets neither -- and there is no job anywhere in this
    // codebase that reads market_watches and notifies a human being. So the sentence
    // was a promise the platform has no means of keeping, made to someone who would
    // then stop checking the index because they believed we were watching it for them.
    //
    // The watch IS recorded, and that is genuinely useful: it tells SAT which bands
    // people care about. So we keep the write and describe it accurately. When there is
    // a notifier and a way to reach the person, this copy can promise a notification,
    // and not one minute before.
    //
    // The baseline clause is the part that carries figures, so it is the part
    // that appears or does not. Everything else in the sentence is true either
    // way: the watch was recorded, or it was not, and we still cannot notify
    // anybody. `wGeo` rather than `band.district_label`, so an Arabic answer
    // names the district in Arabic.
    const noted = saved
      ? (arq
        ? `سجّلت اهتمامك بـ ${wGeo} ${band.asset_type}${seg}.`
        : `Noted: ${wGeo} ${band.asset_type}${seg}.`)
      : (arq
        ? `تعذر حفظ المراقبة الآن لـ ${wGeo} ${band.asset_type}${seg}.`
        : `I could not save the watch just now for ${wGeo} ${band.asset_type}${seg}.`);
    const tail = arq
      ? `لا يمكنني إشعارك تلقائياً بعد، لذا راجع مؤشر الإيجارات عند تحديثه.`
      : `I cannot alert you automatically yet, so check the Rent Index when it next updates.`;
    const message = wGate.mayShowFigure
      ? advisorQuoteMessage(
          wGate,
          arq
            ? `${noted} خط الأساس هو نطاق المؤشر الحالي، ${baseline}. ${tail} المصدر ${srcLabel(band.source, true)}.`
            : `${noted} The baseline is the current Rent Index band, ${baseline}. ${tail} Source ${srcLabel(band.source, false)}.`
        )
      : `${noted} ${wGate.statement ?? ""} ${tail}`.replace(/\s+/g, " ").trim();
    return NextResponse.json({
      mode: "watch",
      message,
      // Codex item 2 again. `toPublicSegment` carries the average and both band
      // ends, so it is a figure leaving the server and is omitted outright when
      // the decision withheld one. The client already guards on its absence.
      ...(wGate.mayShowFigure ? { band: toPublicSegment(band as IndexRowLike) } : {}),
      threshold,
      saved,
      quote: wGate.kind,
    });
  }

  const msg = await llm([draftInstruction(arq), userWords(raw)], false);
  const draftSafe = msg && !unsourcedFigure(msg, allowedSrc) ? msg : (arq ? `أبقيت أي رقم خارج المسودة حتى لا يدخل شيء غير موثّق في إعلانك. أخبرني بالسعر المطلوب الذي تريده، أو حدده بنفسك، وسأنسق الباقي مما تقدمه من تفاصيل فقط.` : `I have kept any figure out of the draft so nothing unverified goes into your listing. Tell me the asking price you want, or set your own, and I will format the rest from only the details you give.`);
  return NextResponse.json({ mode: "draft", message: draftSafe });
}
