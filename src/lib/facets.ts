// Buyer-side search facets, derived from the field registry. Each asset type
// exposes a tiny set of the attributes buyers actually filter on (land use, hotel
// subtype, clear height, bed capacity, ...). Filtering runs in memory over the
// already-fetched listings, so it needs no typed columns and no migrations: enum
// and tri-state facets match by value, numeric facets are a minimum threshold.
// Keep the set SMALL, like the required sets: a wall of filters helps no one.

import { fieldsFor, type AssetField } from "./assetFields";

// The facet keys per asset. office/warehouse grade and fit-out already have
// dedicated top-level filters, so they are not duplicated here.
const FACET_KEYS: Record<string, string[]> = {
  warehouse: ["sprinkler_type", "clear_height_m"],
  medical: ["fit_out_state", "clinic_rooms"],
  showroom: ["mezzanine"],
  serviced: ["suite_type"],
  education: ["premises_type"],
  land: ["land_use", "deed_type"],
  gas_station: ["sale_scope", "brand_affiliation"],
  entertainment: ["venue_subtype"],
  wedding_hall: ["gender_config", "guest_capacity"],
  worker_housing: ["bed_capacity"],
  self_storage: ["listing_scope", "climate_controlled"],
  hospitality: ["hospitality_subtype", "star_rating"],
  mixed_use: ["sale_scope", "occupancy_status"],
};

// The facet fields for an asset type, in the order declared above.
export function facetFields(assetType: string): AssetField[] {
  const keys = FACET_KEYS[assetType] ?? [];
  const byKey = new Map(fieldsFor(assetType).map((f) => [f.key, f]));
  return keys.map((k) => byKey.get(k)).filter((f): f is AssetField => !!f);
}

export function hasFacets(assetType: string): boolean {
  return facetFields(assetType).length > 0;
}

type ListingLike = { attributes?: Record<string, unknown> | null } & Record<string, unknown>;

// Does a listing match the selected facet values? A missing/empty facet value is
// "any" (ignored). Numeric facets are a minimum; enum/tri-state match exactly. A
// column-backed field is read from the row, everything else from `attributes`.
export function matchesAssetFacets(
  listing: ListingLike,
  assetType: string,
  values: Record<string, string | undefined>,
): boolean {
  const attrs = (listing.attributes ?? {}) as Record<string, unknown>;
  for (const f of facetFields(assetType)) {
    const raw = values[f.key];
    if (raw == null || raw === "") continue;
    const lv = f.column ? listing[f.column] : attrs[f.key];
    if (f.type === "number" || f.type === "integer") {
      const n = Number(lv);
      if (lv == null || !Number.isFinite(n) || n < Number(raw)) return false;
    } else if (f.type === "tristate") {
      const norm = lv === true ? "yes" : lv === false ? "no" : lv;
      if (String(norm) !== String(raw)) return false;
    } else {
      if (String(lv) !== String(raw)) return false;
    }
  }
  return true;
}
