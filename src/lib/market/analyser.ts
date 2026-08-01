// Pure logic for the Advisor deal-and-lease analyser (PKG-0B, Codex corrections).
// Extracted from the page component so it can be regression-tested directly:
// human labels (never internal keys), localized rate units, a hardened numeric
// guard, non-implicit segment selection, and the bilingual result sentence.
//
// FINDING 91. THIS FILE NO LONGER NAMES A SOURCE.
//
// The deal check used to end both languages with the rent index attribution,
// composed here from a stored column with no licence consulted. It ran in the
// browser, on a row the client had been handed, which is the furthest possible
// point from the decision that knows whether the figure may be attributed at
// all. The sentence now ends at the period and the indicative note; the source
// clause, when there is one to make, arrives on the gate.

import { assetLabel, segmentLabel } from "@/lib/labels";
import { isSqmYear } from "@/lib/market/verdict";
import { formatPeriod } from "@/lib/market/period";

export type Band = { low: number; average: number; high: number };

// Strict numeric coercion. Number(null) and Number("") are 0 and Number("x") is
// NaN, so a plain Number()+isFinite check would silently accept a false zero
// from stale or empty state. Reject null, undefined, empty/whitespace strings,
// NaN and Infinity up front; only a genuinely finite value passes.
export function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  if (typeof v === "boolean") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// A band is valid only when low, average and high are all finite, STRICTLY
// POSITIVE (rents are positive; a zero or negative band is data corruption, not
// a real range) AND ordered low <= average <= high. Positive average also means
// downstream percentage maths can never divide by zero into Infinity or NaN.
// Accepts either the public shape (average/band_low/band_high) or a stale stored
// shape (median/low/high) so an old prototype message fails safe.
export function validBand(raw: unknown): Band | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const low = num(r.low ?? r.band_low);
  const high = num(r.high ?? r.band_high);
  const average = num(r.average ?? r.median);
  if (low === null || high === null || average === null) return null;
  if (low <= 0 || average <= 0 || high <= 0) return null;
  if (!(low <= average && average <= high)) return null;
  return { low, average, high };
}

// The rent basis a stored unit denotes. Returns null for anything unrecognised:
// the price basis is NEVER inferred (Codex Phase 0 correction 2). A null kind
// means "unsupported", not "assume SAR/m²/year".
export type UnitKind = "sqm_year" | "desk_month";
export function unitKind(unit: string | null | undefined): UnitKind | null {
  if (isSqmYear(unit)) return "sqm_year";
  const n = String(unit || "").toLowerCase();
  if (/desk/.test(n) && /(mo|month)/.test(n)) return "desk_month";
  return null;
}
export function isKnownUnit(unit: string | null | undefined): boolean {
  return unitKind(unit) !== null;
}

// Human space-type label, never an internal compound key like "retail|all".
// The "all" segment carries no qualifier, so retail|all reads simply "Retail".
export function spaceTypeLabel(assetType: string, segment: string | null | undefined, ar: boolean): string {
  const l = ar ? "ar" : "en";
  const a = assetLabel(assetType, l);
  const seg = segment && segment !== "all" ? segmentLabel(segment, l) : "";
  return seg ? `${a} · ${seg}` : a;
}

// Concise localized rent unit. Western numerals always; Arabic uses م², never
// "SAR/m2/yr". Returns null for an unrecognised unit rather than inferring a
// basis (Codex Phase 0 correction 2), so callers surface an unsupported state.
export function rentUnitLabel(unit: string | null | undefined, ar: boolean): string | null {
  const k = unitKind(unit);
  if (k === "sqm_year") return ar ? "ريال/م²·سنة" : "SAR/m²/year";
  if (k === "desk_month") return ar ? "ريال/مكتب·شهر" : "SAR/desk/month";
  return null;
}

// The rate-basis label shown BEFORE input, so the user knows what to type. An
// unrecognised unit yields an explicit unsupported label, never a guessed basis.
export function rateBasisLabel(unit: string | null | undefined, ar: boolean): string {
  const u = rentUnitLabel(unit, ar);
  if (!u) return ar ? "وحدة الإيجار غير مدعومة" : "Rent unit not supported";
  const monthly = unitKind(unit) === "desk_month";
  if (ar) return monthly ? `الإيجار الشهري المطلوب، ${u}` : `الإيجار السنوي المطلوب، ${u}`;
  return monthly ? `Quoted monthly rent, ${u}` : `Quoted annual rent, ${u}`;
}

// Non-implicit segment selection. API row order must never become user intent:
// keep a still-valid previous choice, else use a valid page-context type, else
// return "" so the UI requires an explicit human choice.
export function pickSegment(options: string[], previous: string | null | undefined, contextType?: string | null): string {
  if (previous && options.includes(previous)) return previous;
  if (contextType && options.includes(contextType)) return contextType;
  return "";
}

export type DealInput = {
  rate: unknown;
  size?: unknown;
  band: unknown;
  unit: string | null | undefined;
  assetType: string;
  segment: string | null | undefined;
  locationLabel: string;
  period: string;
  ar: boolean;
};

export type DealResult = { text: string; band: Band; quoted: number; verdict: "below" | "within" | "above" };

// The whole deal check as one pure, testable function. Returns null on any
// invalid input (bad band, non-positive or non-numeric rate) so the caller
// renders nothing rather than a misleading zero.
export function analyseDeal(input: DealInput): DealResult | null {
  const band = validBand(input.band);
  const rate = num(input.rate);
  // Block analysis on an invalid band, a non-positive/invalid rate, OR an
  // unrecognised unit: the price basis is never inferred (Codex correction 2).
  if (!band || rate === null || rate <= 0 || !isKnownUnit(input.unit)) return null;
  const { low, average, high } = band;
  const ar = input.ar;
  const fmt = (n: number) => n.toLocaleString("en-US");
  const spaceL = spaceTypeLabel(input.assetType, input.segment, ar);
  const unitL = rentUnitLabel(input.unit, ar);
  const periodL = formatPeriod(input.period, ar);
  const verdict = rate < low ? "below" : rate > high ? "above" : "within";
  const dm = Math.round(Math.abs(((rate - average) / average) * 100));
  const size = num(input.size);
  const annual = size !== null && size > 0 && isSqmYear(input.unit) ? Math.round(rate * size) : null;

  let text: string;
  if (ar) {
    const vAr = verdict === "within" ? "يقع ضمن النطاق الاسترشادي التجريبي" : verdict === "below" ? "يقع تحت النطاق الاسترشادي التجريبي" : "يقع فوق النطاق الاسترشادي التجريبي";
    const dAr = rate === average ? "عند المتوسط تماماً" : rate < average ? `أقل من المتوسط بنحو ${dm}%` : `أعلى من المتوسط بنحو ${dm}%`;
    text = `فحص الصفقة: ${spaceL}، ${input.locationLabel}، عند ${fmt(rate)} ${unitL}. ${vAr} (${fmt(low)} إلى ${fmt(high)}، المتوسط ${fmt(average)})، ${dAr}.` +
      (annual ? ` عند ${fmt(size!)} م² يعادل نحو ${fmt(annual)} ريال سنوياً.` : "") +
      ` ${periodL}. استرشادي وليس نصيحة.`;
  } else {
    const vEn = verdict === "within" ? "sits within the sample indicative range" : verdict === "below" ? "sits below the sample indicative range" : "sits above the sample indicative range";
    const dEn = rate === average ? "exactly at the average" : rate < average ? `about ${dm}% below the average` : `about ${dm}% above the average`;
    text = `Deal check: ${spaceL}, ${input.locationLabel}, at ${fmt(rate)} ${unitL}. That ${vEn} (${fmt(low)} to ${fmt(high)}, average ${fmt(average)}), ${dEn}.` +
      (annual ? ` At ${fmt(size!)} m² that is about ${fmt(annual)} SAR a year.` : "") +
      ` ${periodL}. Indicative, not advice.`;
  }
  return { text, band, quoted: rate, verdict };
}
