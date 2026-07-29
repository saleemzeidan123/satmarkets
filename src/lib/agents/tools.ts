import type { PromptPart } from "@/lib/aiBoundary";
import { COUNTED, formatCounted, formatInteger, type CountedNoun } from "@/lib/format";
import { assetLabel, cityLabel, dealLabel, fitoutLabel, gradeLabel } from "@/lib/labels";
import { rentIndexSource } from "@/lib/market/attribution";
import { gateFailures, gateReasonsText, passesGate, type GateFields } from "@/lib/gate";
import { parseQuery, type ParsedQuery, type QueryVocab } from "@/lib/search/queryParse";
import { defineTool, err, ok, type SatTool, type ToolContext, type ToolResult } from "./tool";

// ADV-3B. The first typed SAT tools.
//
// Every tool here is deterministic. None of them calls a model, and the layers
// the roadmap requires to stay deterministic are exactly the ones implemented as
// tools rather than described in a prompt: query parsing, verification
// eligibility, Arabic agreement and source attribution. An agent may ask for
// these; it may not perform them, and it may not disagree with the answer.
//
// THE `value` / `text` SPLIT MATTERS AND IS EASY TO LOSE.
//
// `value` is for our own code. `text` is the only field that can reach a
// provider, because `toolResultSlot` builds the slot from `text`. So `parts`
// classifies `text`, not `value`, and a tool is free to return internal ids in
// `value` while naming a place in `text`. Every tool below is written that way on
// purpose: `parse_query` hands the platform a list of district ids and hands the
// model the district's name.

// --------------------------------------------------------------- parse_query

/**
 * What the parse of a query carries, split three ways.
 *
 * This is the most interesting classification decision in the package, so it is
 * argued rather than asserted.
 *
 * The vocabulary matches are OUR closed enum. "office", "lease", "riyadh" are
 * values we authored and render on public pages; the parse says which of our own
 * labels a string matched. That is our own instruction vocabulary, and it can
 * carry nothing else, because a value that is not in the enum does not appear.
 *
 * The numbers are not that. `priceMax` is a budget the person typed, `areaMin` is
 * a footprint requirement, and both are ordinary commercially sensitive facts
 * about a business that has not signed anything. A tenant's ceiling is exactly
 * the material ADV-3A.1 stopped sending. So numeric constraints are declared
 * `user_own_words` and deny while the agreement gate is closed.
 *
 * `terms` is the residue: the words that matched nothing we know. It is raw user
 * text by definition and is declared as such.
 *
 * The consequence is worth stating plainly, because it is the practical payoff of
 * classifying at this grain rather than per request. "office for lease in Riyadh"
 * parses to a structured object containing no user text at all, so it can reach
 * an external model today. "office under 1400 for the Acme expansion" cannot, and
 * should not.
 */
export function parsedQueryParts(p: ParsedQuery): PromptPart[] {
  const parts: PromptPart[] = [
    { label: "matched platform vocabulary", dataClass: "own_instruction" },
  ];
  const numeric =
    p.priceMax !== null || p.priceMin !== null || p.areaTarget !== null || p.areaMin !== null || p.areaMax !== null;
  if (numeric) {
    parts.push({ label: "budget or size constraint the person typed", dataClass: "user_own_words" });
  }
  if (p.terms.length) {
    parts.push({ label: "free text the vocabulary did not recognise", dataClass: "user_own_words" });
  }
  return parts;
}

/** The structured hints, named in the reader's language, with no ids in it. */
function parsedQueryText(p: ParsedQuery, locale: "en" | "ar"): { text: string; figures: number[] } {
  const ar = locale === "ar";
  const bits: string[] = [];
  const figures: number[] = [];
  if (p.asset) bits.push(`${ar ? "النوع" : "type"}: ${assetLabel(p.asset, locale)}`);
  if (p.grade) bits.push(`${ar ? "الفئة" : "grade"}: ${gradeLabel(p.grade, locale)}`);
  if (p.fitout) bits.push(`${ar ? "التجهيز" : "fit-out"}: ${fitoutLabel(p.fitout, locale)}`);
  if (p.deal) bits.push(`${ar ? "الصفقة" : "deal"}: ${dealLabel(p.deal, locale)}`);
  if (p.place) bits.push(`${ar ? "الموقع" : "place"}: ${ar ? p.place.ar : p.place.en}`);
  if (p.city) bits.push(`${ar ? "المدينة" : "city"}: ${cityLabel(p.city, locale)}`);
  for (const [key, en, arLabel] of [
    ["priceMax", "max price", "أعلى سعر"],
    ["priceMin", "min price", "أدنى سعر"],
    ["areaTarget", "area", "المساحة"],
    ["areaMin", "min area", "أدنى مساحة"],
    ["areaMax", "max area", "أعلى مساحة"],
  ] as const) {
    const v = p[key];
    if (typeof v === "number") {
      figures.push(v);
      bits.push(`${ar ? arLabel : en}: ${formatInteger(v, locale)}`);
    }
  }
  if (p.terms.length) bits.push(`${ar ? "نص حر" : "free text"}: ${p.terms.join(" ")}`);
  if (!bits.length) return { text: ar ? "لم يُفهم أي قيد." : "nothing understood", figures };
  return { text: bits.join("; "), figures };
}

/**
 * The discovery parser, as a tool.
 *
 * The roadmap constraint this exists to satisfy: the discovery agent sits on top
 * of `queryParse.ts` and may not replace it or silently upgrade an unrecognised
 * term into a constraint. Exposing the parser as a tool is what makes that
 * enforceable rather than hoped for. The agent receives the parse, including
 * `ignored`, and an unrecognised word stays unrecognised: there is no argument
 * to this tool by which a model can assert that a token is a district.
 */
export function makeParseQueryTool(vocab: QueryVocab): SatTool<{ query: string }, ParsedQuery> {
  return defineTool<{ query: string }, ParsedQuery>({
    name: "parse_query",
    effect: "compute",
    capability: "read_public",
    summary: {
      en: "Read a search sentence into the platform's own structured filters. Words it does not recognise stay unrecognised.",
      ar: "تحويل جملة البحث إلى عوامل تصفية منظّمة من مفردات المنصة. الكلمات غير المعروفة تبقى غير معروفة.",
    },
    parse(raw) {
      if (typeof raw !== "object" || raw === null) return { ok: false, problem: "expected an object with a 'query' string" };
      const q = (raw as { query?: unknown }).query;
      if (typeof q !== "string" || !q.trim()) return { ok: false, problem: "'query' must be a non-empty string" };
      if (q.length > 400) return { ok: false, problem: "'query' is longer than 400 characters" };
      return { ok: true, input: { query: q } };
    },
    async run({ query }, ctx) {
      const p = parseQuery(query, vocab);
      const { text, figures } = parsedQueryText(p, ctx.locale);
      return ok(p, text, parsedQueryParts(p), figures);
    },
  });
}

// -------------------------------------------------------- listing_eligibility

export type EligibilityInput = { listing: GateFields };
export type EligibilityValue = { passes: boolean; reasons: string[]; text: string };

/**
 * Whether a listing may carry the verified state, decided by `gate.ts`.
 *
 * This is a tool rather than a prompt paragraph because verification eligibility
 * is one of the things the roadmap requires to stay deterministic, and because a
 * model asked to judge it will produce a plausible answer every time, including
 * the times it is wrong. The verified green mark appears only for evidence-backed
 * verification, and a mark that a model can talk itself into is not that.
 *
 * The result is `own_instruction` and not the listing: the text names the reasons,
 * which are our own fixed strings, and never the record.
 */
export const listingEligibilityTool = defineTool<EligibilityInput, EligibilityValue>({
  name: "listing_eligibility",
  effect: "compute",
  capability: "read_public",
  summary: {
    en: "Decide whether a listing meets the publication and verification gate, and name the reasons it does not.",
    ar: "تحديد ما إذا كان الإعلان يستوفي شروط النشر والتوثيق، مع بيان أسباب عدم الاستيفاء.",
  },
  parse(raw) {
    if (typeof raw !== "object" || raw === null) return { ok: false, problem: "expected an object with a 'listing'" };
    const l = (raw as { listing?: unknown }).listing;
    if (typeof l !== "object" || l === null) return { ok: false, problem: "'listing' must be an object" };
    return { ok: true, input: { listing: l as GateFields } };
  },
  async run({ listing }, ctx) {
    const reasons = gateFailures(listing);
    const passes = passesGate(listing);
    const ar = ctx.locale === "ar";
    const text = passes
      ? ar
        ? "يستوفي الإعلان شروط النشر والتوثيق."
        : "The listing meets the publication and verification gate."
      : gateReasonsText(reasons, ar);
    return ok({ passes, reasons, text }, text, [
      { label: "gate decision, stated in our own fixed reasons", dataClass: "own_instruction" },
    ]);
  },
});

// ------------------------------------------------------------ counted_phrase

// Derived from the formatter's own table rather than listed again here. A second
// list of nouns would be a second thing to keep in step, and the whole reason
// finding 52 needed a formatter is that agreement was being maintained by hand in
// more than one place.
const COUNTED_NOUNS = new Set<string>(Object.keys(COUNTED));

export type CountedInput = { count: number; noun: string; oblique?: boolean };

/**
 * Arabic counted-noun agreement, as a tool, so a model never inflects Arabic.
 *
 * Finding 52 was closed with a formatter covering 1, 2, 3, 10, 11, 99 and 100
 * precisely because per-sentence patching does not survive the next sentence. An
 * agent composing bilingual prose is a machine for producing next sentences, so
 * it gets the formatter rather than an instruction to be careful. A model asked
 * to inflect `مطابقة` for a count of four will often be right, and "often" is the
 * failure mode: it produces text nobody checks because it usually reads fine.
 *
 * An unregistered noun is rejected rather than passed through, because a
 * pass-through would put an uninflected Arabic noun on the screen under the
 * appearance of having been formatted.
 */
export const countedPhraseTool = defineTool<CountedInput, string>({
  name: "counted_phrase",
  effect: "compute",
  capability: "read_public",
  summary: {
    en: "Write a count and its noun with correct agreement in the reader's language.",
    ar: "كتابة العدد مع معدوده بصيغة مطابقة صحيحة بلغة القارئ.",
  },
  parse(raw) {
    if (typeof raw !== "object" || raw === null) return { ok: false, problem: "expected an object" };
    const o = raw as { count?: unknown; noun?: unknown; oblique?: unknown };
    if (typeof o.count !== "number" || !Number.isFinite(o.count) || o.count < 0 || !Number.isInteger(o.count)) {
      return { ok: false, problem: "'count' must be a non-negative whole number" };
    }
    if (typeof o.noun !== "string" || !COUNTED_NOUNS.has(o.noun)) {
      return { ok: false, problem: `'noun' must be one of: ${[...COUNTED_NOUNS].join(", ")}` };
    }
    return { ok: true, input: { count: o.count, noun: o.noun, oblique: o.oblique === true } };
  },
  async run({ count, noun, oblique }, ctx) {
    const text = formatCounted(count, noun as CountedNoun, ctx.locale, oblique ? { oblique: true } : {});
    // The count is a figure this tool vouches for: the caller supplied it, and
    // the tool returns it unchanged rather than deriving anything from it.
    return ok(text, text, [{ label: "a formatted count in our own words", dataClass: "own_instruction" }], [count]);
  },
});

// ------------------------------------------------------- source_attribution

/**
 * The canonical Rent Index attribution, so an agent cannot compose its own.
 *
 * Finding 61 was five different spellings of this attribution appearing wherever
 * a sentence was composed at runtime, and the fix was one owner of the string
 * plus a source-tree scan. An agent is the largest possible source of sentences
 * composed at runtime, so it does not get to write this one.
 */
export const rentIndexAttributionTool = defineTool<Record<string, never>, string>({
  name: "rent_index_attribution",
  effect: "compute",
  capability: "read_public",
  summary: {
    en: "Return the exact attribution that must accompany any Rent Index figure.",
    ar: "إرجاع نص الإسناد الدقيق الذي يجب أن يرافق أي رقم من المؤشر الإيجاري.",
  },
  parse() {
    return { ok: true, input: {} };
  },
  async run(_input, ctx) {
    const text = rentIndexSource(ctx.locale === "ar");
    return ok(text, text, [{ label: "the published attribution line", dataClass: "public_published" }]);
  },
});

// ------------------------------------------------------------- rent_band

export type RentBand = { segment: string; low: number; high: number; median: number; period: string };
export type RentBandReader = (segment: string) => Promise<RentBand | null>;

/**
 * A published rent band, read from the store, carrying its licence with it.
 *
 * This is a factory because the reader is injected: a tool that reaches a store
 * directly cannot be unit-tested without one, and a tool nobody can test is where
 * the next finding lives.
 *
 * The classification is the point of including it. The band is `licensed_source`
 * against the Rent Index, so `mayLeaveProcess` denies it today on two independent
 * grounds: no source permits model input, and no provider agreement is in force.
 * That means the deal analyst can hold a rent band and cannot send it to a model,
 * which is the correct behaviour and will remain correct after the agreement
 * exists, because the source gate is not the provider gate.
 */
export function makeRentBandTool(read: RentBandReader, sourceId = "rega_rent_index"): SatTool<{ segment: string }, RentBand> {
  return defineTool<{ segment: string }, RentBand>({
    name: "rent_band",
    effect: "read",
    capability: "read_public",
    summary: {
      en: "Look up the published rent band for a segment, with its source attribution.",
      ar: "الاطّلاع على النطاق الإيجاري المنشور لشريحة معيّنة، مع إسناد المصدر.",
    },
    parse(raw) {
      if (typeof raw !== "object" || raw === null) return { ok: false, problem: "expected an object with a 'segment'" };
      const s = (raw as { segment?: unknown }).segment;
      if (typeof s !== "string" || !s.trim()) return { ok: false, problem: "'segment' must be a non-empty string" };
      return { ok: true, input: { segment: s.trim() } };
    },
    async run({ segment }, ctx): Promise<ToolResult<RentBand>> {
      const band = await read(segment);
      if (!band) {
        return err(
          "not_found",
          ctx.locale === "ar" ? "لا يوجد نطاق منشور لهذه الشريحة." : "No published band exists for that segment."
        );
      }
      const ar = ctx.locale === "ar";
      const attribution = rentIndexSource(ar);
      const text = ar
        ? `${band.segment}: ${formatInteger(band.low, "ar")} إلى ${formatInteger(band.high, "ar")}، الوسيط ${formatInteger(band.median, "ar")}. ${attribution}`
        : `${band.segment}: ${formatInteger(band.low, "en")} to ${formatInteger(band.high, "en")}, median ${formatInteger(band.median, "en")}. ${attribution}`;
      return ok(band, text, [{ label: "published rent band", dataClass: "licensed_source", sourceId, fidelity: "full" }], [
        band.low,
        band.high,
        band.median,
      ]);
    },
  });
}

/** Every tool that needs no injection, so a registry can be assembled statically. */
export const STATIC_TOOLS = [
  listingEligibilityTool,
  countedPhraseTool,
  rentIndexAttributionTool,
] as const;

/**
 * Every tool name this package defines, injected ones included.
 *
 * `agents.ts` names tools as strings, because an agent boundary is data and data
 * cannot hold a closure over a store reader. That leaves the two files able to
 * disagree: an agent listing `rent_bands` gets a boundary that permits a tool
 * which does not exist, and nothing says so until a model asks for it. This is
 * the list both sides are checked against.
 */
export const TOOL_NAMES = [
  "parse_query",
  "listing_eligibility",
  "counted_phrase",
  "rent_index_attribution",
  "rent_band",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export type { ToolContext };
