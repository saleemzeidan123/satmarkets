// Structured evidence boundary for the Advisor "value" (price-vs-band) answer
// (PKG-1B.1, Codex Advisor P0). ONE structured result is built from the retrieved
// Rent Index row plus the user's own input; the English and Arabic renderers then
// consume the SAME result, so the two languages can never diverge on scope,
// segment, numbers, source or location. No figure is ever produced except the
// evidence row's own values or the user's quoted number. Rendering is deterministic
// (no model call), which is what makes the EN/AR parity testable and guarantees a
// general-office band can never be relabelled as a Grade A band.
//
// PKG-1B.2 extends the same boundary in three ways (Codex items 3, 4 and 5):
// the reporting period the user asked for is carried explicitly, so an answer built
// from a different period must SAY so instead of passing it off as the requested
// one; Arabic grade letters (أ, إ, آ) are recognized alongside Latin A/B/C, so an
// Arabic grade request is scope-limited exactly as its English twin is; and every
// visible period is rendered through the shared bilingual formatPeriod() helper
// rather than leaking the raw "2026-Q2" storage form into user-facing prose.

import { assetLabel } from "@/lib/labels";
import { formatPeriod, parsePeriod } from "@/lib/market/period";

/** Whether the answer is built from the period the user actually asked for. */
export type PeriodStatus = "match" | "unavailable" | "none";

export type PeriodRequest = {
  /** "2025" or "2025-Q3" as the user asked for it, or null when they asked generally. */
  requested: string | null;
  status: PeriodStatus;
};

export type ValueEvidence = {
  evidenceId: string;              // the rent_index_published row id
  // FINDING 91. There is no `source` here any more. This object described a row
  // and, in the same breath, asserted its provenance, and the assertion was a
  // default: a row with an empty column was handed the rent index authority's
  // name. Provenance is a licence question and this file cannot ask one, so it
  // no longer answers one. `rentIndexQuoteGate` decides the name beside the
  // figure, and `advisorQuoteMessage` appends it to what this file composes.
  period: string;
  requestedPeriod: string | null;  // only ever a period the user explicitly asked for
  periodStatus: PeriodStatus;
  locationEn: string;
  locationAr: string;
  districtId: string | null;
  assetType: string;               // enum key, e.g. "office"
  supportedSegment: string;        // the segment the evidence actually covers, e.g. "all"
  requestedSegment: string | null; // a specific segment the user asked for, e.g. "grade_a"
  requestedSegmentLabelEn: string | null;
  requestedSegmentLabelAr: string | null;
  unit: string;
  low: number;
  average: number;
  high: number;
  userFigure: number | null;       // only ever the user's own quoted number
  supportStatus: "supported" | "segment_mismatch";
  limitationReason: string | null; // machine code, e.g. "requested_segment_not_in_index"
};

export type RowLike = {
  id: string;
  district_label: string;
  district_label_ar?: string | null;
  district_id?: string | null;
  asset_type: string;
  segment?: string | null;
  unit: string;
  band_low: number | string | null;
  band_high: number | string | null;
  median: number | string | null; // DB column name; value is an average
  period: string;
  source?: string | null;
};

// Arabic letters carry no case and the grade letter is usually written in Arabic
// script, not Latin: فئة أ is the ordinary way to write "Grade A". The first pass
// matched Latin A/B/C only, so "سعّر مكتب فئة أ في العليا" fell through to the
// general-office band with NO scope limitation, which is the exact failure the
// structured boundary exists to prevent. Alef appears as أ, إ, آ and bare ا; all
// four normalize to A. ب is B and ج is C.
const AR_LETTER_BOUNDARY = "(?![\\u0621-\\u064A])";
const arGrade = (letters: string, plus: boolean) =>
  new RegExp(`(?:فئة|درجة|تصنيف)\\s*[${letters}]${plus ? "\\s*\\+" : `${AR_LETTER_BOUNDARY}(?!\\s*\\+)`}`);

// Detect a specific graded/class segment the user asked for, in EN or AR. The Rent
// Index publishes only a general ("all") segment per district and asset today, so any
// specific grade request is a scope the evidence cannot support. Returns null when the
// user asked generally. Matching is deterministic (no model).
export function detectRequestedSegment(raw: string): { key: string; en: string; ar: string } | null {
  const text = raw || "";
  const s = " " + text.toLowerCase() + " ";
  const hasAr = (re: RegExp) => re.test(text);
  // A+ / grade A+ / class A+, in Latin or Arabic script.
  if (/\b(grade|class)?\s*a\s*\+/.test(s) || hasAr(/(?:فئة|درجة|تصنيف)\s*a\s*\+/i) || hasAr(arGrade("أإآا", true))) {
    return { key: "grade_a_plus", en: "Grade A+", ar: "فئة A+" };
  }
  if (/\b(grade|class)\s*a\b/.test(s) || hasAr(/(?:فئة|درجة|تصنيف)\s*a(?![+\w])/i) || hasAr(arGrade("أإآا", false))) {
    return { key: "grade_a", en: "Grade A", ar: "فئة A" };
  }
  if (/\b(grade|class)\s*b\b/.test(s) || hasAr(/(?:فئة|درجة|تصنيف)\s*b(?![+\w])/i) || hasAr(arGrade("ب", false))) {
    return { key: "grade_b", en: "Grade B", ar: "فئة B" };
  }
  if (/\b(grade|class)\s*c\b/.test(s) || hasAr(/(?:فئة|درجة|تصنيف)\s*c(?![+\w])/i) || hasAr(arGrade("ج", false))) {
    return { key: "grade_c", en: "Grade C", ar: "فئة C" };
  }
  return null;
}

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Build the one structured result. Returns null only when the row cannot form a valid
// band (missing/invalid numbers); the caller then emits its own no-data message.
export function buildValueEvidence(
  row: RowLike,
  requested: { key: string; en: string; ar: string } | null,
  userFigure: number | null,
  periodRequest?: PeriodRequest | null,
): ValueEvidence | null {
  const low = numOrNull(row.band_low);
  const average = numOrNull(row.median);
  const high = numOrNull(row.band_high);
  if (low === null || average === null || high === null || !(low <= average && average <= high)) return null;
  const supportedSegment = row.segment || "all";
  const mismatch = !!requested && supportedSegment !== requested.key;
  const pr: PeriodRequest = periodRequest ?? { requested: null, status: "none" };
  return {
    evidenceId: row.id,
    period: row.period,
    requestedPeriod: pr.requested,
    periodStatus: pr.requested ? pr.status : "none",
    locationEn: row.district_label,
    locationAr: row.district_label_ar || row.district_label,
    districtId: row.district_id ?? null,
    assetType: row.asset_type,
    supportedSegment,
    requestedSegment: requested?.key ?? null,
    requestedSegmentLabelEn: requested?.en ?? null,
    requestedSegmentLabelAr: requested?.ar ?? null,
    unit: row.unit,
    low,
    average,
    high,
    userFigure: userFigure !== null && Number.isFinite(userFigure) && userFigure > 0 ? userFigure : null,
    supportStatus: mismatch ? "segment_mismatch" : "supported",
    limitationReason: mismatch ? "requested_segment_not_in_index" : null,
  };
}

// Western numerals always, even in Arabic (global law).
const fmt = (n: number) => n.toLocaleString("en-US");

// Every visible period goes through the shared bilingual helper. A year-only
// request ("2025") has no quarter to render and is shown as the plain year.
export function displayPeriod(period: string | null | undefined, ar: boolean): string {
  const p = String(period ?? "");
  if (/^\d{4}$/.test(p)) return p;
  return formatPeriod(p, ar);
}

// The Arabic unit is one token to a reader, but a browser will happily break a
// line after the slash and after the middle dot, which at 320px split
// "ريال/م²·سنة" across two lines mid-unit. U+2060 WORD JOINER removes those
// break opportunities without adding a visible character or a space. It cannot
// cause horizontal overflow: the advisor bubble already carries
// overflow-wrap:anywhere, which still breaks the token if a line genuinely
// cannot hold it. Only the deterministic advisor answer is treated here; the
// listing and analyser surfaces render the unit in their own layouts.
const WJ = "⁠";
const arUnit = (s: string) => s.replace(/([/·])/g, `${WJ}$1${WJ}`);

function unitLabel(unit: string, ar: boolean): string {
  if (/m2\/yr|m²\/yr|sqm\/yr/i.test(unit)) return ar ? arUnit("ريال/م²·سنة") : "SAR/m²/year";
  if (/m2\/mo|m²\/mo/i.test(unit)) return ar ? arUnit("ريال/م²·شهر") : "SAR/m²/month";
  return unit;
}

// ===== Arabic surface grammar for the deterministic answer =====
//
// The first pass built Arabic sentences by gluing a one-letter preposition to a
// bare label ("لـ" + "مكاتب") and by labelling every period with the same
// noun+apposition ("للفترة الربع الثاني 2026"). Both are correct data and wrong
// Arabic: a single-letter preposition attaches to the DEFINITE noun (للمكاتب,
// بالفئة A) and a quarter reads as a phrase, not as an apposition to "الفترة".
// The helpers below keep that grammar in one place so no sentence can drift.

// Definite plural form of each asset noun as it is used after a preposition or
// after "قطاع". Written out rather than derived, because Arabic definiteness in
// a compound label is not a prefix operation ("سكن عمالة" is "سكن العمالة", not
// "السكن عمالة").
const AR_ASSET_DEFINITE: Record<string, string> = {
  office: "المكاتب",
  retail: "التجزئة والمطاعم",
  medical: "الرعاية الصحية",
  showroom: "المعارض",
  warehouse: "المستودعات",
  serviced: "المكاتب المخدومة",
  education: "التعليم",
  hospitality: "الضيافة",
  mixed_use: "المباني متعددة الاستخدامات",
  land: "الأراضي",
  gas_station: "محطات الوقود",
  entertainment: "الترفيه",
  wedding_hall: "قاعات المناسبات",
  worker_housing: "سكن العمالة",
  self_storage: "التخزين الذاتي",
};
const arAssetDefinite = (t: string) => AR_ASSET_DEFINITE[t] ?? assetLabel(t, "ar");

/** "ل" + "المكاتب" contracts to "للمكاتب"; every other prefix simply attaches. */
function arPrefix(p: "ل" | "ب", noun: string): string {
  if (p === "ل" && noun.startsWith("ال")) return `لل${noun.slice(2)}`;
  return `${p}${noun}`;
}

/**
 * A period as Arabic prose, with NO leading preposition so each sentence can
 * attach the one it needs. "2026-Q2" reads "الربع الثاني من عام 2026" and a
 * year-only request reads "عام 2025". The quarter word itself still comes from
 * the shared formatPeriod, so EN and AR cannot disagree on which quarter it is.
 */
export function arPeriodPhrase(period: string | null | undefined): string {
  const p = String(period ?? "").trim();
  if (/^\d{4}$/.test(p)) return `عام ${p}`;
  const parsed = parsePeriod(p);
  if (!parsed) return p;
  return `${formatPeriod(p, true).replace(/\s*\d{4}\s*$/, "")} من عام ${parsed.year}`;
}

// FINDING 91. THE SOURCE LABEL USED TO BE COMPOSED HERE, AND IS NOT ANY MORE.
//
// Owner ruling 2 had already pulled the two languages onto one canonical
// constant, which fixed a divergence and left the deeper problem: a renderer
// that names a source is a renderer asserting a right it never checked. The
// name now travels on the gate, beside the figure, and this file writes the
// figure only.

function position(ev: ValueEvidence): "below" | "within" | "above" | null {
  if (ev.userFigure === null) return null;
  if (ev.userFigure < ev.low) return "below";
  if (ev.userFigure > ev.high) return "above";
  return "within";
}

// Deterministic bilingual renderer. Both languages read the SAME ValueEvidence.
export function renderValue(ev: ValueEvidence, locale: "en" | "ar"): string {
  const ar = locale === "ar";
  const loc = ar ? ev.locationAr : ev.locationEn;
  const asset = assetLabel(ev.assetType, locale);
  const assetLower = ar ? asset : asset.toLowerCase();
  const unit = unitLabel(ev.unit, ar);
  const period = displayPeriod(ev.period, ar);
  // Arabic prose forms: the definite asset noun, the period as a phrase, and the
  // two range shapes ("يتراوح ... بين ... و..." for the answer proper, "يمتد هذا
  // النطاق من ... إلى ..." for the context sentence after a scope refusal).
  const arAsset = arAssetDefinite(ev.assetType);
  const arPeriod = arPeriodPhrase(ev.period);
  const bandPhrase = ar
    ? `من ${fmt(ev.low)} إلى ${fmt(ev.high)} ${unit}، بمتوسط ${fmt(ev.average)}`
    : `${fmt(ev.low)} to ${fmt(ev.high)} ${unit}, averaging ${fmt(ev.average)}`;
  const arBetween = `بين ${fmt(ev.low)} و${fmt(ev.high)} ${unit}، بمتوسط ${fmt(ev.average)}`;
  const pos = position(ev);
  const posSentence = () => {
    if (pos === null || ev.userFigure === null) return "";
    if (ar) {
      const where = pos === "below" ? "أقل من النطاق" : pos === "above" ? "أعلى من النطاق" : "ضمن النطاق";
      return ` رقمك ${fmt(ev.userFigure)} يقع ${where}.`;
    }
    const where = pos === "below" ? "below the band" : pos === "above" ? "above the band" : "within the band";
    return ` Your figure of ${fmt(ev.userFigure)} sits ${where}.`;
  };

  // The requested period is not published. Say so first, name the newest published
  // period, and never let the following figures read as the answer to the question
  // that was actually asked (Codex item 3).
  const unavailable = ev.periodStatus === "unavailable" && ev.requestedPeriod;
  const req = displayPeriod(ev.requestedPeriod, ar);
  const arReq = arPeriodPhrase(ev.requestedPeriod);
  const lead = !unavailable
    ? ""
    : ar
      ? `لا ينشر مؤشر الإيجارات أرقام ${arAsset} في ${loc} ${arPrefix("ل", arReq)}. أحدث فترة منشورة هي ${arPeriod}، لذلك لا يمكنني الإجابة عن ${arReq}. الأرقام التالية تخص ${arPeriod} فقط، وليست جواباً عن ${arReq}. `
      : `The Rent Index does not publish ${assetLower} figures for ${loc} for ${req}. The newest published period is ${period}, so I cannot answer for ${req}. The figures below are for ${period} only and are not an answer for ${req}. `;

  if (ev.supportStatus === "segment_mismatch") {
    const reqLabel = (ar ? ev.requestedSegmentLabelAr : ev.requestedSegmentLabelEn) || (ar ? "تلك الفئة" : "that grade");
    if (ar) {
      // "الفئة A" so the preposition attaches as بالفئة A, never as بـفئة A.
      const grade = ev.requestedSegmentLabelAr ? `ال${ev.requestedSegmentLabelAr}` : "تلك الفئة";
      return `${lead}لا ينشر مؤشر الإيجارات نطاقاً خاصاً ${arPrefix("ب", grade)} في ${loc}. يغطي النطاق المنشور قطاع ${arAsset} ككل، وليس درجةً بعينها، لذلك لا يمكنني تقديمه كنطاق ${grade}. وكسياق عام للسوق، يمتد هذا النطاق ${bandPhrase}، في ${arPeriod}.${posSentence()}`;
    }
    return `${lead}The Rent Index does not publish a ${reqLabel} band for ${loc}. Its published ${assetLower} band covers the whole segment, not a single grade, so I cannot present it as a ${reqLabel} band. As general market context, that band runs ${bandPhrase}, for ${period}.${posSentence()}`;
  }

  if (ar) {
    return `${lead}يتراوح نطاق مؤشر الإيجارات ${arPrefix("ل", arAsset)} في ${loc} ${arBetween}، في ${arPeriod}.${posSentence()}`;
  }
  return `${lead}The Rent Index ${assetLower} band for ${loc} is ${bandPhrase}, for ${period}.${posSentence()}`;
}
