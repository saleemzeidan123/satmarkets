// Turns a pinned coordinate into the SAT district it sits in (nearest centroid),
// so a lister never has to pick from a long district dropdown: they place the
// building on the map and the district is derived for the Rent Index and search.
// Centroids are coarse, so this is a best-guess assignment the lister can still
// override; it is never presented as a verified boundary match.

export interface DistrictPoint {
  id: string;
  name_en: string;
  name_ar?: string | null;
  city?: string | null;
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

export function nearestDistrict(
  lat: number,
  lng: number,
  districts: DistrictPoint[],
): DistrictPoint | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let best: DistrictPoint | null = null;
  let bestKm = Infinity;
  for (const d of districts) {
    if (!Number.isFinite(d.lat) || !Number.isFinite(d.lng)) continue;
    const km = distanceKm(lat, lng, d.lat, d.lng);
    if (km < bestKm) { bestKm = km; best = d; }
  }
  return best;
}
