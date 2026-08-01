import type { AssetField } from "@/lib/assetFields";
import { COUNTED, formatUnit, unitText, type CountedNoun, type Loc, type PluralForms } from "@/lib/format";
import { priceUnit, priceUnitKey } from "@/lib/listingFigures";

/**
 * PKG-LS2, findings 133 and 134. The one place a registry field becomes a label.
 *
 * The defect this closes: three surfaces built a field label by concatenating
 * `field.unit` verbatim, so the string the registry stores for a developer was
 * printed unchanged to a reader in either language. An Arabic lister filling in
 * a warehouse was asked for "ارتفاع السقف (m)", "مساحة الطابق (m²)", "(kVA)",
 * "(t/m²)", "(kN/m²)", "(L)", and for a lease term in the English words
 * "(months)" and "(years)". The canon in `format.ts` holds م, م², ك.ف.أ, طن/م²,
 * ك.ن/م² and لتر for exactly these, and nothing was reading it.
 *
 * Why the label and not the value: `attributeDisplay.ts` already routes the
 * VALUE through the one table, and says so in its own comment. So the number a
 * reader sees on a listing page carries the right unit while the box they typed
 * it into carried the wrong one. That asymmetry is the whole finding. This is
 * the point where a figure enters the platform, and no downstream gate can see
 * it, because what is stored is a bare number: if the label names a different
 * unit from the one the platform stores and renders, every figure derived from
 * it is wrong at the source and consistently so.
 *
 * `months` and `years` are the one case that is not a unit at all. They are
 * counted nouns, and `formatUnit` would pass them through verbatim because they
 * are not in the table. A label carries no count, so the generic plural is the
 * right form, and `formatCounted` cannot be used because it prefixes a numeral.
 * The forms are read from `COUNTED`, the same table the counted prose uses, so
 * "months" cannot be spelled one way in a sentence and another way in a label.
 */

/** Registry units that are counted nouns rather than units of measure. */
const LABEL_NOUNS: Record<string, CountedNoun> = { months: "month", years: "year" };

/**
 * The generic plural of a counted noun, for a label position that names no count.
 * English takes `other`; Arabic takes `few`, which is the plural that stands
 * alone (أشهر, سنوات) rather than the singular `other` that follows a large number.
 */
function nounLabel(noun: CountedNoun, locale: Loc): string {
  const forms: PluralForms = COUNTED[noun][locale];
  return (locale === "ar" ? forms.few : undefined) ?? forms.other;
}

/**
 * A registry unit as a reader of `locale` should see it, without word joiners.
 * Empty for a field that declares no unit. Use this where the text is compared,
 * exported or tested; use `fieldUnitLabel` where it is rendered.
 */
export function fieldUnitText(unit: string | null | undefined, locale: Loc): string {
  const raw = String(unit ?? "").trim();
  if (!raw) return "";
  const noun = LABEL_NOUNS[raw.toLowerCase()];
  return noun ? nounLabel(noun, locale) : unitText(raw, locale, "short");
}

/**
 * The same unit for a rendered label, with the word joiners that stop
 * SAR/m²/yr breaking across two lines at 320 pixels.
 */
export function fieldUnitLabel(unit: string | null | undefined, locale: Loc): string {
  const raw = String(unit ?? "").trim();
  if (!raw) return "";
  const noun = LABEL_NOUNS[raw.toLowerCase()];
  return noun ? nounLabel(noun, locale) : formatUnit(raw, locale, "short");
}

/**
 * `Floor area (m²)` / `مساحة الطابق (م²)`, or the bare label where the field
 * declares no unit.
 *
 * Deliberately does not append the required marker or a range hint. Each caller
 * owns its own suffix, and a required marker inside the parentheses would read
 * as part of the unit.
 */
export function fieldLabel(field: Pick<AssetField, "label_en" | "label_ar" | "unit">, locale: Loc): string {
  const base = locale === "ar" ? field.label_ar : field.label_en;
  const u = fieldUnitLabel(field.unit, locale);
  return u ? `${base} (${u})` : base;
}

/**
 * Finding 134. The two platform columns every listing carries, labelled once.
 *
 * These are not registry fields, so `fieldLabel` cannot reach them, and both
 * intake screens spelled them by hand. The Listing Studio asked for
 * "Area (sqm)" and "Asking rent (SAR per sqm per year)"; the edit screen for the
 * same two stored numbers asked for "Size (m²)" and "Asking rent (SAR/m²/yr)".
 * Neither of the Studio's unit spellings is any spelling in the one table, and
 * "sqm" is not a unit this platform uses anywhere a reader can see. So a lister
 * created a price under one unit and edited it under another, and could not tell
 * which one the number they typed was stored as.
 *
 * "Area" rather than "Size" because that is the noun the public dictionaries and
 * `netArea` already use, and the label a lister types into should be the label
 * the reader is shown.
 */
export function areaFieldLabel(locale: Loc): string {
  const base = locale === "ar" ? "المساحة" : "Area";
  return `${base} (${formatUnit("sqm", locale, "short")})`;
}

/**
 * `Asking rent (SAR/m²/yr)` for a lease, `Sale price (SAR)` for a sale, with the
 * deal decided by `priceUnitKey` and nowhere else.
 *
 * Both screens branched on `deal_type` inline. `listingFigures.ts` already owns
 * that decision for every surface that RENDERS the price, and the surface that
 * COLLECTS it has to agree with them or the figure is wrong before it is stored.
 */
export function priceFieldLabel(deal: string | null | undefined, locale: Loc): string {
  const sale = priceUnitKey(deal) === "sar";
  const base = locale === "ar" ? (sale ? "سعر البيع" : "الإيجار المطلوب") : sale ? "Sale price" : "Asking rent";
  return `${base} (${priceUnit(deal, locale)})`;
}
