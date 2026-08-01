// Turns a pinned coordinate into the nearest SAT location row (nearest centroid),
// so a lister never has to pick from a long dropdown: they place the building on
// the map and a candidate location is offered for the Rent Index and search.
//
// THE NAME OF THIS FILE IS THE POINT. It used to be called nearestDistrict, and
// it returned something the screen then labelled "District". The location table
// holds districts, developments and broader areas together, and the nearest
// centroid to a pin is frequently a development: KAFD, ITCC, Laysen Valley,
// Roshn Front all carry listings today. Law 7 says a development is never a
// district, so a function that cannot tell them apart must not be named as
// though it can. `kind` now travels with the row and the caller labels it
// through `locationKind.ts`.
//
// Centroids are coarse. SAT holds one point per location row and no polygon, no
// radius and no area, so this is a best guess the lister can still override and
// it is never presented as a verified boundary match. `locationConsistency.ts`
// is the module that says so in the lister's own language.

export interface LocationPoint {
  id: string;
  name_en: string;
  name_ar?: string | null;
  city?: string | null;
  /** district | development | area. Absent means unknown, and unknown is never coerced to district. */
  kind?: string | null;
  lat: number;
  lng: number;
}

const R = 6371; // km
const rad = (d: number) => (d * Math.PI) / 180;

// Haversine great-circle distance in km.
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function nearestLocation(
  lat: number,
  lng: number,
  locations: LocationPoint[],
): LocationPoint | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let best: LocationPoint | null = null;
  let bestKm = Infinity;
  for (const d of locations) {
    if (!Number.isFinite(d.lat) || !Number.isFinite(d.lng)) continue;
    const km = distanceKm(lat, lng, d.lat, d.lng);
    if (km < bestKm) { bestKm = km; best = d; }
  }
  return best;
}

/** The row a recorded id points at, or null. Used to compare a pin with what is already on file. */
export function locationById(id: string | null | undefined, locations: LocationPoint[]): LocationPoint | null {
  if (!id) return null;
  return locations.find((d) => d.id === id) ?? null;
}
