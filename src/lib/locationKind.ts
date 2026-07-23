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

// Normalise an unknown/legacy value to a safe kind. Unknown kinds fall back to
// the neutral "area" rather than the specific "district", so a mislabelled row
// can never assert district-hood it does not have.
export function coerceKind(v: string | null | undefined): LocationKind {
  return isLocationKind(v) ? v : "area";
}

const KIND_LABEL: Record<LocationKind, [string, string]> = {
  district: ["District", "حي"],
  development: ["Development", "مشروع تطويري"],
  area: ["Area", "منطقة"],
};

// The umbrella noun to use when a single kind is known.
export function kindLabel(kind: string | null | undefined, ar: boolean): string {
  return KIND_LABEL[coerceKind(kind)][ar ? 1 : 0];
}

// Neutral umbrella for a list that MIXES kinds: never "district" (Law 7), always
// "Location" / "الموقع".
export function locationUmbrella(ar: boolean): string {
  return ar ? "الموقع" : "Location";
}

// True when a project marker should be shown next to the name (developments).
export function isDevelopment(kind: string | null | undefined): boolean {
  return coerceKind(kind) === "development";
}
