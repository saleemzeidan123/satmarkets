// Structured evidence boundary for the Advisor "value" (price-vs-band) answer
// (PKG-1B.1, Codex Advisor P0). ONE structured result is built from the retrieved
// Rent Index row plus the user's own input; the English and Arabic renderers then
// consume the SAME result, so the two languages can never diverge on scope,
// segment, numbers, source or location. No figure is ever produced except the
// evidence row's own values or the user's quoted number. Rendering is deterministic
// (no model call), which is what makes the EN/AR parity testable and guarantees a
// general-office band can never be relabelled as a Grade A band.

import { assetLabel } from "@/lib/labels";

export type ValueEvidence = {
  evidenceId: string;              // the rent_index_published row id
  source: string;                  // canonical source string as stored
  period: string;
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

// Detect a specific graded/class segment the user asked for, in EN or AR. The Rent
// Index publishes only a general ("all") segment per district and asset today, so any
// specific grade request is a scope the evidence cannot support. Returns null when the
// user asked generally. Matching is deterministic (no model).
export function detectRequestedSegment(raw: string): { key: string; en: string; ar: string } | null {
  const s = " " + (raw || "").toLowerCase() + " ";
  const hasAr = (re: RegExp) => re.test(raw || "");
  // A+ / grade A+ / class A+ (Latin letter, appears even in Arabic queries)
  if (/\b(grade|class)?\s*a\s*\+/.test(s) || hasAr(/فئة\s*a\s*\+|درجة\s*a\s*\+/i)) {
    return { key: "grade_a_plus", en: "Grade A+", ar: "فئة A+" };
  }
  if (/\b(grade|class)\s*a\b/.test(s) || hasAr(/فئة\s*a\b|درجة\s*a\b|تصنيف\s*a\b/i)) {
    return { key: "grade_a", en: "Grade A", ar: "فئة A" };
  }
  if (/\b(grade|class)\s*b\b/.test(s) || hasAr(/فئة\s*b\b|درجة\s*b\b/i)) {
    return { key: "grade_b", en: "Grade B", ar: "فئة B" };
  }
  if (/\b(grade|class)\s*c\b/.test(s) || hasAr(/فئة\s*c\b|درجة\s*c\b/i)) {
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
): ValueEvidence | null {
  const low = numOrNull(row.band_low);
  const average = numOrNull(row.median);
  const high = numOrNull(row.band_high);
  if (low === null || average === null || high === null || !(low <= average && average <= high)) return null;
  const supportedSegment = row.segment || "all";
  const mismatch = !!requested && supportedSegment !== requested.key;
  return {
    evidenceId: row.id,
    source: row.source || "REGA Rental Index (Ejar)",
    period: row.period,
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

  if (ev.supportStatus === "segment_mismatch") {
    const reqLabel = (ar ? ev.requestedSegmentLabelAr : ev.requestedSegmentLabelEn) || (ar ? "تلك الفئة" : "that grade");
    if (ar) {
      return `مؤشر الإيجارات لا ينشر نطاقاً خاصاً بـ ${reqLabel} في ${loc}؛ النطاق المنشور يغطي جميع ${assetLower} في ${loc}، لذلك لا يمكنني تقديمه كنطاق ${reqLabel}. كسياق عام لسوق ${assetLower}، النطاق ${bandPhrase}، للفترة ${ev.period}.${posSentence()} المصدر: ${src}.`;
    }
    return `The Rent Index does not publish a ${reqLabel} band for ${loc}; the published band covers all ${assetLower} in ${loc}, so I cannot present it as a ${reqLabel} band. As general ${assetLower} market context, the band runs ${bandPhrase}, for ${ev.period}.${posSentence()} Source: ${src}.`;
  }

  if (ar) {
    return `نطاق مؤشر الإيجارات لـ ${assetLower} في ${loc} ${bandPhrase}، للفترة ${ev.period}.${posSentence()} المصدر: ${src}.`;
  }
  return `The Rent Index band for ${assetLower} in ${loc} is ${bandPhrase}, for ${ev.period}.${posSentence()} Source: ${src}.`;
}
