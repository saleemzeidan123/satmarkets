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
import { formatPeriod } from "@/lib/market/period";

/** Whether the answer is built from the period the user actually asked for. */
export type PeriodStatus = "match" | "unavailable" | "none";

export type PeriodRequest = {
  /** "2025" or "2025-Q3" as the user asked for it, or null when they asked generally. */
  requested: string | null;
  status: PeriodStatus;
};

export type ValueEvidence = {
  evidenceId: string;              // the rent_index_published row id
  source: string;                  // canonical source string as stored
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
    source: row.source || "REGA Rental Index (Ejar)",
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

function unitLabel(unit: string, ar: boolean): string {
  if (/m2\/yr|m²\/yr|sqm\/yr/i.test(unit)) return ar ? "ريال/م²·سنة" : "SAR/m²/year";
  if (/m2\/mo|m²\/mo/i.test(unit)) return ar ? "ريال/م²·شهر" : "SAR/m²/month";
  return unit;
}

function sourceLabel(source: string, ar: boolean): string {
  if (/rega|ejar|rcri/i.test(source)) {
    return ar ? "مؤشر الإيجارات (إيجار)، متوسط العقود المسجّلة" : "REGA Rental Index (Ejar), average of registered rental contracts";
  }
  return source;
}

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
  const src = sourceLabel(ev.source, ar);
  const period = displayPeriod(ev.period, ar);
  const bandPhrase = ar
    ? `من ${fmt(ev.low)} إلى ${fmt(ev.high)} ${unit}، بمتوسط ${fmt(ev.average)}`
    : `${fmt(ev.low)} to ${fmt(ev.high)} ${unit}, averaging ${fmt(ev.average)}`;
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
  const lead = !unavailable
    ? ""
    : ar
      ? `لا ينشر مؤشر الإيجارات أرقام ${assetLower} في ${loc} للفترة ${req}. أحدث فترة منشورة هي ${period}، لذلك لا يمكنني الإجابة عن ${req}. الأرقام التالية للفترة ${period} فقط، وليست جواباً عن ${req}. `
      : `The Rent Index does not publish ${assetLower} figures for ${loc} for ${req}. The newest published period is ${period}, so I cannot answer for ${req}. The figures below are for ${period} only and are not an answer for ${req}. `;

  if (ev.supportStatus === "segment_mismatch") {
    const reqLabel = (ar ? ev.requestedSegmentLabelAr : ev.requestedSegmentLabelEn) || (ar ? "تلك الفئة" : "that grade");
    if (ar) {
      return `${lead}لا ينشر مؤشر الإيجارات نطاقاً خاصاً بـ${reqLabel} في ${loc}. النطاق المنشور لـ${assetLower} يغطي الفئة كاملةً وليس درجة بعينها، لذلك لا يمكنني تقديمه كنطاق ${reqLabel}. كسياق عام للسوق، يمتد هذا النطاق ${bandPhrase}، للفترة ${period}.${posSentence()} المصدر: ${src}.`;
    }
    return `${lead}The Rent Index does not publish a ${reqLabel} band for ${loc}. Its published ${assetLower} band covers the whole segment, not a single grade, so I cannot present it as a ${reqLabel} band. As general market context, that band runs ${bandPhrase}, for ${period}.${posSentence()} Source: ${src}.`;
  }

  if (ar) {
    return `${lead}نطاق مؤشر الإيجارات لـ${assetLower} في ${loc} ${bandPhrase}، للفترة ${period}.${posSentence()} المصدر: ${src}.`;
  }
  return `${lead}The Rent Index ${assetLower} band for ${loc} is ${bandPhrase}, for ${period}.${posSentence()} Source: ${src}.`;
}
