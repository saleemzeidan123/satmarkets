// Numeric intent separation for the Advisor (PKG-1B.2, Codex items 1 to 3).
//
// THE DEFECT THIS EXISTS TO KILL. The value path used to take the first number in
// the sentence and hand it to the band comparison as the user's rent. So "What was
// the office band in Al Olaya in 2026?" answered "Your figure of 2,026 sits above
// the band", and the Arabic equivalent produced "سعرك 2,026". A reporting year, a
// floor area, a percentage and a total budget are not rents, and presenting one as
// a rent is a fabricated claim about what the user said.
//
// The rule implemented here is deliberately conservative and is the one Codex set:
// a number becomes a comparison rent ONLY when the user explicitly supplies a rent
// unit (SAR/m2, ريال/م², "per square metre", "لكل متر مربع"), or when the sentence
// itself is unambiguously a rent comparison ("is 1,600 fair", "we pay", "إيجاري").
// Everything else is classified as a year, an area, a percentage or a budget, or is
// left unclassified. The DEFAULT IS NOT A RENT.
//
// Classification is deterministic (no model) so it is testable, and it runs before
// value evidence is built, on the server, which is the only place the answer text
// is composed.

export type NumericIntent = {
  /** Only ever a figure the user genuinely offered for comparison against a band. */
  rent: number | null;
  /** Why `rent` was accepted, for tests and diagnostics. */
  rentBasis: "unit" | "comparison" | null;
  areas: number[];
  percents: number[];
  years: number[];
  budgets: number[];
  /**
   * Per-area rent figures the person set as a CEILING or a FLOOR rather than
   * offered for judgement. "under 1,600 SAR/m2" is what they will pay at most; it
   * is a constraint on a search, not a number they asked us to grade.
   */
  caps: number[];
  /** "2025" or "2025-Q3" when the user asked about a specific reporting period. */
  requestedPeriod: string | null;
};

// The digit fold now lives in `textFold.ts` so the advisor, the discovery parser and
// the label tables all read a figure by the same rule. Re-exported here because this
// module is where callers have always found it.
export { toWesternDigits } from "@/lib/textFold";
import { toWesternDigits } from "@/lib/textFold";

// A number token: Western digits with optional thousands separators and decimal.
const NUM = /\d[\d,]*(?:\.\d+)?/g;

const PCT_AFTER = /^[\s]*(?:%|٪|percent\b|per\s*cent\b|بالمئة|بالمائة)/i;
const PCT_BEFORE = /(?:نسبة|بنسبة)\s*\D{0,6}$/;

// Area: the measurement unit sits immediately after the number, or the number is
// introduced by a size word.
// \b cannot terminate a unit that ends in a NON-word character: after "m²" both sides
// of the position are non-word, so /m²\b/ never matches "2,000 m² in Al Olaya" and the
// area silently fell through to the unclaimed bucket. Terminate on "not followed by an
// alphanumeric" instead, which still rejects "m20".
const UNIT_END = "(?![0-9A-Za-z])";
const AREA_AFTER = new RegExp(`^[\\s,]*(?:m2|m²|sqm|sq\\.?\\s?m|square\\s+met(?:er|re)s?|متر\\s*مربع|م²|م2)${UNIT_END}`, "i");
const AREA_BEFORE = /(?:size|area|floorplate|مساحة|بمساحة)\s*(?:of\s*)?\D{0,4}$/i;

// Rent: an explicit per-area rent unit. "1,600 SAR/m2", "1600 per square metre",
// "1,600 ريال/م²", "1600/m2".
const RENT_UNIT_AFTER = /^[\s,]*(?:sar|sr|riyals?|ريال|ر\.?س)?\s*(?:\/|per\s|لكل\s|لل)\s*(?:m2|m²|sqm|sq\.?\s?m|square\s+met(?:er|re)s?|متر|م²|م2)/i;
const RENT_BEFORE = /(?:rent\s+of|rent\s+is|paying|pay|asking|quoted|offered|إيجار|ايجار|أدفع|ادفع|يطلبون)\s*\D{0,6}$/i;

// A bound the person put on a search, immediately before the figure.
//
// THE DEFECT THIS EXISTS TO KILL. The advisor's own suggested search prompt is
// "Fitted Grade A office in Granada, around 300 m2, under 1,600 SAR/m2". The unit
// rule below reads "1,600 SAR/m2" as a rent, correctly, and the advisor then
// treated a rent as a figure offered for comparison and answered the platform's
// own discovery prompt with a valuation instead of listings. A ceiling is not an
// offer. The Arabic alternatives carry both hamza spellings because this pattern
// runs on the source text, which is not folded.
const BOUND_BEFORE =
  /(?:under|below|less\s+than|no\s+more\s+than|not\s+more\s+than|up\s*to|max(?:imum)?|at\s+most|over|above|more\s+than|at\s+least|min(?:imum)?|starting\s+(?:at|from))\s*(?:sar|sr|riyals?)?\s*\D{0,4}$|(?:[أا]قل\s+من|ب[أا]قل\s+من|تحت|حت[ىي]|دون|بحد\s+[أا]قص[ىي]|لا\s+يزيد\s*(?:عن)?|[أا]كثر\s+من|فوق|بحد\s+[أا]دن[ىي]|لا\s+يقل\s*(?:عن)?)\s*\D{0,6}$/i;

// Budget: a currency amount with NO per-area unit, or an explicit budget word.
const CURRENCY_AFTER = /^[\s,]*(?:sar|sr|riyals?|ريال|ر\.?س)\b/i;
const BUDGET_BEFORE = /(?:budget|spend|up\s*to|ميزانية|ميزانيتي)\s*\D{0,8}$/i;

// Year cues. "in 2026", "for 2025", "عام 2025", "في 2026", and "the 2025 band".
const YEAR_BEFORE = /(?:\bin|\bfor|\bduring|\bof|\bfrom|\bsince|\byear|\bfy|عام|لعام|سنة|لسنة|في|خلال|منذ)\s*$/i;
const YEAR_AFTER = /^[\s]*(?:band|bands|figures?|data|numbers?|index|levels?|rates?|نطاق|بيانات|أرقام|مؤشر)\b/i;

// Sentence-level rent comparison. Used ONLY for numbers no unit rule claimed.
const RENT_COMPARISON = [
  /\b(?:is|are)\b[^?.!]{0,48}\b(?:fair|reasonable|too\s+high|too\s+low|about\s+right|market\s+rate|over\s+the\s+odds)\b/i,
  /\b(?:my|our|the)\s+(?:rent|asking\s+rent|quoted\s+rent)\b/i,
  /\bwe\s+pay\b|\bi\s+pay\b|\bi\s*'?m\s+paying\b|\bwe\s*'?re\s+paying\b/i,
  /\bthey\s+(?:are\s+)?asking\b|\basking\s+(?:rent|price)\b|\bbeen\s+quoted\b/i,
  /هل\s[^؟?]{0,48}(?:عادل|مناسب|مرتفع|منخفض|معقول)/,
  /إيجاري|ايجاري|أدفع|ادفع|ندفع|يطلبون/,
];

const AR_QUARTER_WORD: Record<string, string> = {
  "الأول": "1", "الاول": "1",
  "الثاني": "2",
  "الثالث": "3",
  "الرابع": "4",
};

/** Extract an explicitly requested reporting period, if any. Never guesses one. */
export function detectRequestedPeriod(raw: string, years: number[]): string | null {
  const s = toWesternDigits(String(raw || ""));
  let m = /\b(\d{4})\s*[-\s]?\s*Q\s*([1-4])\b/i.exec(s);
  if (m) return `${m[1]}-Q${m[2]}`;
  m = /\bQ\s*([1-4])\s*[-\s,]?\s*(\d{4})\b/i.exec(s);
  if (m) return `${m[2]}-Q${m[1]}`;
  const arq = /الربع\s+(الأول|الاول|الثاني|الثالث|الرابع)/.exec(s);
  if (arq) {
    const q = AR_QUARTER_WORD[arq[1]];
    const y = /\b(\d{4})\b/.exec(s.slice(arq.index));
    if (q && y) return `${y[1]}-Q${q}`;
    if (q && years.length) return `${years[0]}-Q${q}`;
  }
  return years.length ? String(years[0]) : null;
}

const isYearValue = (n: number) => Number.isInteger(n) && n >= 1900 && n <= 2100;

/**
 * Separate every number in the message by what the user actually meant, BEFORE any
 * value evidence is built. A number is a comparison rent only on explicit evidence.
 */
export function readNumericIntent(raw: string): NumericIntent {
  const src = toWesternDigits(String(raw || ""));
  const comparison = RENT_COMPARISON.some((re) => re.test(src));

  const areas: number[] = [];
  const percents: number[] = [];
  const years: number[] = [];
  const budgets: number[] = [];
  const caps: number[] = [];
  const unclaimed: { value: number; hasSep: boolean }[] = [];
  let rent: number | null = null;
  let rentBasis: "unit" | "comparison" | null = null;

  NUM.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NUM.exec(src)) !== null) {
    const token = m[0];
    // A bare separator-only match like "," cannot occur, but a trailing comma can.
    const value = parseFloat(token.replace(/,/g, ""));
    if (!Number.isFinite(value)) continue;
    const before = src.slice(Math.max(0, m.index - 28), m.index);
    const after = src.slice(m.index + token.length, m.index + token.length + 28);
    const hasSep = token.includes(",") || token.includes(".");

    if (PCT_AFTER.test(after) || PCT_BEFORE.test(before)) { percents.push(value); continue; }
    if (AREA_AFTER.test(after) || AREA_BEFORE.test(before)) { areas.push(value); continue; }
    // "unit" means the user wrote a per-area rent unit; "comparison" means they said
    // in words that the number IS a rent ("we pay", "they're asking", "إيجاري").
    if (RENT_UNIT_AFTER.test(after)) {
      // A bound only diverts the figure when the sentence is not ALSO an explicit
      // rent comparison: "we pay under 1,600 SAR/m2, is that fair" is still a
      // question about a rent they actually pay.
      if (!comparison && BOUND_BEFORE.test(before)) { caps.push(value); continue; }
      if (rent === null || rentBasis !== "unit") { rent = value; rentBasis = "unit"; }
      continue;
    }
    if (RENT_BEFORE.test(before)) {
      if (rent === null) { rent = value; rentBasis = "comparison"; }
      continue;
    }
    if (BUDGET_BEFORE.test(before) || CURRENCY_AFTER.test(after)) { budgets.push(value); continue; }
    // A year needs either an explicit cue, or a bare in-range integer written
    // without a thousands separator. "2,000" is a quantity, "2026" is a year.
    //
    // PRECEDENCE CORRECTION (Codex, 27 July). The bare-integer default outranked
    // the sentence-level comparison fallback, so "Is 2000 fair for an Al Olaya
    // office?" was read as a request about the year 2000 and answered with a
    // historical-period refusal. The sentence is an explicit rent comparison and
    // carries no year cue, so 2000 is the proposed rent. An explicit cue ("in
    // 2000", "for 2000", "عام 2000", "the 2000 band") still wins outright; the
    // bare-integer default now applies only when comparison intent is absent.
    const cued = YEAR_BEFORE.test(before) || YEAR_AFTER.test(after);
    if (isYearValue(value) && (cued || (!hasSep && !comparison))) { years.push(value); continue; }
    unclaimed.push({ value, hasSep });
  }

  // Sentence-level fallback: only a genuine rent comparison may promote a bare
  // number, and only when no unit-backed rent was already found.
  if (rent === null && comparison && unclaimed.length) {
    rent = unclaimed[0].value;
    rentBasis = "comparison";
  }

  return {
    rent: rent !== null && rent > 0 ? rent : null,
    rentBasis: rent !== null && rent > 0 ? rentBasis : null,
    areas,
    percents,
    years,
    budgets,
    caps,
    requestedPeriod: detectRequestedPeriod(src, years),
  };
}
