// Typed location taxonomy (WS04). Law 7: a development is never a district.
// The districts table carries `kind` (district | development | area). This
// module is the single typed surface that turns a stored kind into a correct
// human label and an umbrella label for mixed lists, so no UI can silently
// call KAFD (a development) a حي.

export type LocationKind = "district" | "development" | "area";

export const LOCATION_KINDS: LocationKind[] = ["district", "development", "area"];

export function isLocationKind(v: string | null | undefined): v is LocationKind {
  return v === "district" || v === "development" || v === "area";
}

// Return the kind only when it is a real taxonomy value, else null. An unknown
// kind is NOT coerced to "area": "area" is a genuine taxonomy assertion (a real
// catchment), not a dumping ground for unrecognised values (Codex Phase 0
// correction 3). Callers show the neutral "Location" umbrella for null.
export function normalizeKind(v: string | null | undefined): LocationKind | null {
  return isLocationKind(v) ? v : null;
}

const KIND_LABEL: Record<LocationKind, [string, string]> = {
  district: ["District", "حي"],
  development: ["Development", "مشروع تطويري"],
  area: ["Area", "منطقة"],
};

// The umbrella noun for a location. A known kind gets its specific label; an
// unknown/neutral kind gets "Location" / "الموقع", never an invented "Area" and
// never "District" (Law 7).
export function kindLabel(kind: string | null | undefined, ar: boolean): string {
  const k = normalizeKind(kind);
  return k ? KIND_LABEL[k][ar ? 1 : 0] : locationUmbrella(ar);
}

// Neutral umbrella for a mixed list or an unknown kind: always "Location" / "الموقع".
export function locationUmbrella(ar: boolean): string {
  return ar ? "الموقع" : "Location";
}

// True only when the kind is explicitly a development.
export function isDevelopment(kind: string | null | undefined): boolean {
  return normalizeKind(kind) === "development";
}
