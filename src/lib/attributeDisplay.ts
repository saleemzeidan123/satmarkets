// Turns registry-defined attribute values into display rows for the detail page.
// This is how per-asset `attributes` (Phase 0 storage) reach the screen without
// a bespoke block per field: the registry says what a field is, this formats it.
//
// Scope for the first Phase 1 slice: the "space" section, and only fields that
// live in `attributes` (fields backed by a typed column are already rendered by
// the existing column-based blocks, so they are skipped here to avoid
// duplication). No em dashes (Law 2). Western numerals in both locales.

import { fieldsFor, type AssetField } from "./assetFields";

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
    "months": "شهراً",
    "years": "سنة",
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
      const u = unitLabel(field.unit, ar);
      return u ? `${num(n, ar)} ${u}` : num(n, ar);
    }
    case "boolean":
      return value ? (ar ? "نعم" : "Yes") : null;
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
