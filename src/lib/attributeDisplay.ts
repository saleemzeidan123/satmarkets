// Turns registry-defined attribute values into display rows for the detail page.
// This is how per-asset `attributes` (Phase 0 storage) reach the screen without
// a bespoke block per field: the registry says what a field is, this formats it.
//
// Scope for the first Phase 1 slice: the "space" section, and only fields that
// live in `attributes` (fields backed by a typed column are already rendered by
// the existing column-based blocks, so they are skipped here to avoid
// duplication). No em dashes (Law 2). Western numerals in both locales.

import { fieldsFor, type AssetField } from "./assetFields";
import { formatCounted } from "./format";

function num(n: unknown, ar: boolean): string {
  return Number(n).toLocaleString(ar ? "ar-SA-u-nu-latn" : "en-US");
}

// Bilingual unit rendering. Unknown units are shown as-is.
function unitLabel(unit: string | undefined, ar: boolean): string {
  if (!unit) return "";
  if (!ar) return unit;
  const map: Record<string, string> = {
    "m": "م",
    "m²": "م²",
    "t/m²": "طن/م²",
    "SAR": "ريال",
    "SAR/m²": "ريال/م²",
    "SAR/m²·yr": "ريال/م²·سنة",
  };
  return map[unit] ?? unit;
}

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
