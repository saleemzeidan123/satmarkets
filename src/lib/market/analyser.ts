// Pure logic for the Advisor deal-and-lease analyser (PKG-0B, Codex corrections).
// Extracted from the page component so it can be regression-tested directly:
// human labels (never internal keys), localized rate units, a hardened numeric
// guard, non-implicit segment selection, and the bilingual result sentence with
// the sample-range wording kept separate from the REGA average attribution.

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

// A band is valid only when low, average and high are all finite AND ordered
// low <= average <= high. Accepts either the public shape (average/band_low/
// band_high) or a stale stored shape (median/low/high) so an old prototype
// message fails safe instead of rendering a false zero.
export function validBand(raw: unknown): Band | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const low = num(r.low ?? r.band_low);
  const high = num(r.high ?? r.band_high);
  const average = num(r.average ?? r.median);
  if (low === null || high === null || average === null) return null;
  if (!(low <= average && average <= high)) return null;
  return { low, average, high };
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
// "SAR/m2/yr". Robust to the inconsistent stored unit strings (the seed carries
// "SAR/m2/yr", ingest carries "sar_sqm_yr"), normalising through isSqmYear.
export function rentUnitLabel(unit: string | null | undefined, ar: boolean): string {
  if (isSqmYear(unit)) return ar ? "ريال/م²·سنة" : "SAR/m²/year";
  const n = String(unit || "").toLowerCase();
  if (/desk/.test(n) && /(mo|month)/.test(n)) return ar ? "ريال/مكتب·شهر" : "SAR/desk/month";
  return ar ? "ريال/م²·سنة" : "SAR/m²/year";
}

// The rate-basis label shown BEFORE input, so the user knows what to type.
export function rateBasisLabel(unit: string | null | undefined, ar: boolean): string {
  const u = rentUnitLabel(unit, ar);
  const monthly = !isSqmYear(unit) && /desk/.test(String(unit || "").toLowerCase());
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
  if (!band || rate === null || rate <= 0) return null;
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
      ` ${periodL}، المؤشر الإيجاري (إيجار): متوسط العقود المسجّلة. استرشادي وليس نصيحة.`;
  } else {
    const vEn = verdict === "within" ? "sits within the sample indicative range" : verdict === "below" ? "sits below the sample indicative range" : "sits above the sample indicative range";
    const dEn = rate === average ? "exactly at the average" : rate < average ? `about ${dm}% below the average` : `about ${dm}% above the average`;
    text = `Deal check: ${spaceL}, ${input.locationLabel}, at ${fmt(rate)} ${unitL}. That ${vEn} (${fmt(low)} to ${fmt(high)}, average ${fmt(average)}), ${dEn}.` +
      (annual ? ` At ${fmt(size!)} m² that is about ${fmt(annual)} SAR a year.` : "") +
      ` ${periodL}, REGA Rental Index (Ejar): average of registered rental contracts. Indicative, not advice.`;
  }
  return { text, band, quoted: rate, verdict };
}
