// Turns registry-defined attribute values into display rows for the detail page.
// This is how per-asset `attributes` (Phase 0 storage) reach the screen without
// a bespoke block per field: the registry says what a field is, this formats it.
//
// Scope for the first Phase 1 slice: the "space" section, and only fields that
// live in `attributes` (fields backed by a typed column are already rendered by
// the existing column-based blocks, so they are skipped here to avoid
// duplication). No em dashes (Law 2). Western numerals in both locales.

import { fieldsFor, type AssetField } from "./assetFields";
import { formatCounted, formatNumber, formatUnit } from "./format";

// PKG-FIG2, finding 129. Both helpers this replaced were private copies of work
// `format.ts` already does.
//
// `num` called `toLocaleString("ar-SA-u-nu-latn")` for Arabic. It was written up
// first as a grouping defect and that was checked before it was believed, which
// is the only reason it is stated correctly here: on the runtime this ships on,
// ar-SA with the Latin numbering system groups with the same comma en-US does,
// so no visible grouping difference exists and none is claimed.
//
// What the call did do was pin HALF the format. The numbering system was fixed
// and everything else was left to whichever CLDR data the runtime happens to
// carry, so the output was a property of the deployment rather than a decision
// this project had made. The one difference visible today is on a negative
// value, where ar-SA emits a U+200E LEFT-TO-RIGHT MARK before the minus sign
// and en-US does not, which puts an invisible control into a figure that can be
// copied out of the page. `formatNumber` pins the whole format for both
// locales. The third fraction digit below is what `toLocaleString()` with no
// options was already doing, so the digits themselves are unchanged.
const num = (n: unknown, ar: boolean): string =>
  formatNumber(Number(n), ar ? "ar" : "en", { maximumFractionDigits: 3 });

// And `unitLabel` was a six-entry EN to AR map keyed on the exact strings in
// `assetFields.ts`. It was a fourth unit table, and it was the reason `kN/m²`
// and `L` reached an Arabic attribute row still in Latin script: a unit the map
// did not list fell through to the English spelling and nobody saw it, because
// no error is raised by a passthrough. `formatUnit` resolves the same strings
// through `UNIT_ALIASES`, renders both locales from `UNITS`, and passes an
// unknown unit through in the same way, so the fallback behaviour is unchanged
// while the known set is now the platform's whole set rather than this file's.
const unitLabel = (unit: string | undefined, ar: boolean): string =>
  unit ? formatUnit(unit, ar ? "ar" : "en", "short") : "";

// A single field's value formatted for display, or null when it should not show
// (empty, or a false boolean, which reads as absence not a fact).
export function formatFieldValue(field: AssetField, value: unknown, ar: boolean): string | null {
  if (value === null || value === undefined || value === "") return null;

  switch (field.type) {
    case "money":
    case "number":
    case "integer": {
      const n = Number(value);
      if (!Number.isFinite(n)) return null;
      // ADV-3A.1, finding 52. A month and a year are counted nouns, not units.
      // Appending a fixed word gave "1 months" in English and "3 شهراً" in
      // Arabic, where the Arabic form used was the 11-to-99 one and the counts
      // these fields actually hold (a deposit, a rent free period, a minimum
      // term) are almost always 1 to 10. Nineteen registry fields carry one of
      // these two units, so the fix belongs here and not in the registry.
      //
      // An attribute row is a standalone cell, so the dual is nominative.
      if (field.unit === "months") return formatCounted(n, "month", ar ? "ar" : "en");
      if (field.unit === "years") return formatCounted(n, "year", ar ? "ar" : "en");
      const u = unitLabel(field.unit, ar);
      return u ? `${num(n, ar)} ${u}` : num(n, ar);
    }
    case "boolean":
      return value ? (ar ? "نعم" : "Yes") : null;
    case "tristate": {
      // Only an explicit yes/no shows; unknown/absent renders nothing (never an
      // asserted "no"). Legacy boolean values are read as yes.
      if (value === "yes" || value === true) return ar ? "نعم" : "Yes";
      if (value === "no" || value === false) return ar ? "لا" : "No";
      return null;
    }
    case "enum": {
      const key = String(value).trim();
      if (!key) return null;
      const opt = field.options?.[key];
      if (opt) return ar ? opt[1] : opt[0];
      // Fallback until a value gets a label: humanise snake_case.
      return key.replace(/_/g, " ");
    }
    case "text":
    default: {
      const s = String(value).trim();
      return s || null;
    }
  }
}

// Rows for the "compliance" section. Unlike the space rows, these include
// column-backed values (for example a boolean stored as a typed column), because
// there is no existing hand-built compliance block. `civil_defense_approved` is
// excluded because it is already shown under The space, and unavailable (not yet
// wired) fields are skipped rather than faked.
export function complianceRows(
  assetType: string,
  listing: Record<string, unknown> | null | undefined,
  ar: boolean,
): [string, string][] {
  if (!listing) return [];
  const attributes = (listing.attributes as Record<string, unknown> | undefined) ?? {};
  const rows: [string, string][] = [];
  for (const f of fieldsFor(assetType)) {
    if (f.section !== "compliance") continue;
    if (f.available === false) continue;
    if (f.key === "civil_defense_approved") continue; // shown under The space
    const raw = f.column && listing[f.column] != null ? listing[f.column] : attributes[f.key];
    const formatted = formatFieldValue(f, raw, ar);
    if (formatted === null) continue;
    rows.push([ar ? f.label_ar : f.label_en, formatted]);
  }
  return rows;
}

// Rows for the "commercial" section drawn from a listing's attributes. The detail
// page builds the core commercial terms (rent, service charge, VAT) from typed
// columns; this appends the registry commercial attributes an asset defines that
// have no column (for example a serviced office's price basis or a hotel's deal
// scope). Column-backed and computed fields are skipped: computed price per m2 is
// derived on the page from price and area, never entered.
export function commercialAttributeRows(
  assetType: string,
  attributes: Record<string, unknown> | null | undefined,
  ar: boolean,
): [string, string][] {
  if (!attributes) return [];
  const rows: [string, string][] = [];
  for (const f of fieldsFor(assetType)) {
    if (f.section !== "commercial") continue;
    if (f.column) continue;              // rendered by the existing column block
    if (f.provenance === "computed") continue; // derived on the page, never stored
    if (f.available === false) continue;
    const formatted = formatFieldValue(f, attributes[f.key], ar);
    if (formatted === null) continue;
    rows.push([ar ? f.label_ar : f.label_en, formatted]);
  }
  return rows;
}

// Rows for the "space" section drawn from a listing's attributes. Column-backed
// fields are skipped (handled by the existing column blocks). Returns
// [label, value] pairs in registry order, each already formatted.
export function spaceAttributeRows(
  assetType: string,
  attributes: Record<string, unknown> | null | undefined,
  ar: boolean,
): [string, string][] {
  if (!attributes) return [];
  const rows: [string, string][] = [];
  for (const f of fieldsFor(assetType)) {
    if (f.section !== "space") continue;
    if (f.column) continue; // rendered by the existing column-based block
    if (f.available === false) continue; // not wired yet; must not fake it
    const formatted = formatFieldValue(f, attributes[f.key], ar);
    if (formatted === null) continue;
    rows.push([ar ? f.label_ar : f.label_en, formatted]);
  }
  return rows;
}
