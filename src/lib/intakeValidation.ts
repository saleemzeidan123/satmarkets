// The capture-side twin of attributeDisplay. Turns a raw intake payload (all
// strings and checkbox values from a form, or an untrusted JSON body) into a
// clean, registry-validated write, and is the ONLY thing that should ever decide
// what reaches the database from a lister. Run it on the server; the client may
// run it too for pre-flight, but the server call is authoritative.
//
// It enforces, per the field registry (Law 3 made structural at capture):
//  - Whitelist by key: only registry `entered` fields for the asset type. Any
//    other key is dropped, never stored.
//  - Type coercion: numbers become JSON numbers (never "1500"), booleans are
//    real true or omitted (never false / "on" / 0/1), enums must be a declared
//    value, text is trimmed. Empty / null / "" is omitted, not stored as null.
//  - Validation: min/max for numbers, enum membership, regex for text. An
//    invalid value is an error, never a silently stored lie.
//  - The critical split: a field with a `column` routes to that typed column
//    (so the detail page and search see it); everything else goes to
//    `attributes`. Writing a column-backed field into `attributes` would make it
//    vanish. This is the whole point of returning { attributes, columns }.
//
// No provenance marker is ever written; the tier lives in the registry. The
// lister cannot mark anything verified from here.

import { intakeFields, type AssetField } from "./assetFields";

export interface FieldError {
  key: string;
  message: string;
}

export interface CoerceResult {
  attributes: Record<string, unknown>; // sparse, correctly typed, non-column values
  columns: Record<string, unknown>;    // column-backed values, keyed by column name
  errors: FieldError[];
}

function coerceOne(field: AssetField, value: unknown): { value?: unknown; error?: string } {
  // Omit empty. For booleans, absence and false both mean "not set" (the read
  // side renders nothing for false), so a falsey checkbox is simply omitted.
  if (value === null || value === undefined || value === "") return {};

  switch (field.type) {
    case "money":
    case "number": {
      const n = Number(value);
      if (!Number.isFinite(n)) return { error: "must be a number" };
      const v = field.validation;
      if (v?.min != null && n < v.min) return { error: `must be at least ${v.min}` };
      if (v?.max != null && n > v.max) return { error: `must be at most ${v.max}` };
      return { value: n };
    }
    case "integer": {
      const n = Number(value);
      if (!Number.isFinite(n)) return { error: "must be a number" };
      if (!Number.isInteger(n)) return { error: "must be a whole number" };
      const v = field.validation;
      if (v?.min != null && n < v.min) return { error: `must be at least ${v.min}` };
      if (v?.max != null && n > v.max) return { error: `must be at most ${v.max}` };
      return { value: n };
    }
    case "boolean": {
      const truthy = value === true || value === 1 || value === "1" ||
        value === "true" || value === "on";
      return truthy ? { value: true } : {}; // false => omit
    }
    case "enum": {
      const s = String(value).trim();
      if (!s) return {};
      const allowed = field.validation?.enum;
      if (allowed && !allowed.includes(s)) return { error: "not an allowed value" };
      return { value: s };
    }
    case "text":
    case "url":
    case "doc-ref":
    default: {
      const s = String(value).trim();
      if (!s) return {};
      if (field.validation?.regex && !new RegExp(field.validation.regex).test(s)) {
        return { error: "invalid format" };
      }
      return { value: s };
    }
  }
}

export function coerceAndValidateAttributes(
  assetType: string,
  raw: Record<string, unknown> | null | undefined,
): CoerceResult {
  const attributes: Record<string, unknown> = {};
  const columns: Record<string, unknown> = {};
  const errors: FieldError[] = [];
  const input = raw ?? {};

  // Iterate the REGISTRY, not the payload. Unknown keys are never read, so they
  // are dropped by construction.
  for (const field of intakeFields(assetType)) {
    const { value, error } = coerceOne(field, input[field.key]);
    if (error) {
      errors.push({ key: field.key, message: error });
      continue;
    }
    if (value === undefined) continue; // omitted
    if (field.column) columns[field.column] = value;
    else attributes[field.key] = value;
  }

  return { attributes, columns, errors };
}
