// The first thing a listing of each asset type is measured by.
//
// Home prints the LABEL beside each type in its directory. Search results print
// the label and the VALUE the lister recorded, when there is one. Both read this
// one table, so the two surfaces cannot disagree about what an office or a
// warehouse leads with, and both read the wording from ASSET_FIELDS rather than
// stating it again here.
//
// Nothing in this file is a figure. A listing whose lister left the field empty
// gets no line at all: an absent measure is not a zero and it is not a default.
// No em dashes (Law 2). Western numerals in both locales (Law 4).

import { fieldsFor } from "./assetFields";
import { formatFieldValue } from "./attributeDisplay";

export const LEAD_MEASURE: Record<string, string> = {
  office: "floor_plate_sqm", retail: "frontage_m", warehouse: "clear_height_m", medical: "clinic_rooms", land: "street_width_m",
  showroom: "frontage_m", serviced: "workstations", mixed_use: "retail_gla_sqm", hospitality: "keys", education: "classrooms",
  gas_station: "dispensers", entertainment: "screens_count", wedding_hall: "guest_capacity", worker_housing: "bed_capacity", self_storage: "unit_count",
};

/** The registry label of an asset type's lead measure, or "" when the type has none. */
export function leadMeasureLabel(assetType: string, ar: boolean): string {
  const f = fieldsFor(assetType).find((x) => x.key === LEAD_MEASURE[assetType]);
  return f ? (ar ? f.label_ar : f.label_en) : "";
}

export type LeadMeasure = { label: string; value: string };

/**
 * The lead measure a listing actually recorded, already worded, or null.
 *
 * A typed column wins over the attributes bag, in the same order the detail
 * page reads them, so the two cannot print different values for one field.
 */
export function leadMeasureOf(
  listing: { asset_type?: string | null; attributes?: Record<string, unknown> | null } & Record<string, unknown>,
  ar: boolean,
): LeadMeasure | null {
  const type = listing.asset_type ?? "";
  const f = fieldsFor(type).find((x) => x.key === LEAD_MEASURE[type]);
  if (!f) return null;
  const attrs = (listing.attributes as Record<string, unknown> | null | undefined) ?? {};
  const raw = f.column && listing[f.column] != null ? listing[f.column] : attrs[f.key];
  const value = formatFieldValue(f, raw, ar);
  if (value === null) return null;
  return { label: ar ? f.label_ar : f.label_en, value };
}
