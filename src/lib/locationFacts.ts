// Location Facts: deterministic, sourced location computation for a listing.
// Principle (CLAUDE.md Law 3): every value shown is either a verified coordinate
// fact or a computation over verified coordinates. No invented figures, no market
// narrative. Metro anchors are the RCRC (Royal Commission for Riyadh City) open
// dataset; airports are public reference points. Both live in the map_anchors table.
// Footfall stays OFF until a real vendor is signed (see work/advisory/VENDOR-footfall-mobility).

export interface Anchor {
  kind: string;            // "metro" | "airport"
  name_en: string;
  name_ar: string;
  line: string | null;     // metro line name (e.g. "Blue line") or null
  lat: number;
  lng: number;
}

export interface Origin { lat: number; lng: number; exact: boolean }

export interface Nearest { anchor: Anchor; km: number }

// Great-circle distance in kilometres. Straight-line, honestly labelled as such in the UI.
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const la1 = toRad(aLat);
  const la2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Nearest anchor of a given kind. Interchange stations appear once per line, so the
// same station name can occur multiple times; taking the minimum distance is correct.
export function nearest(origin: Origin, anchors: Anchor[], kind: string): Nearest | null {
  let best: Nearest | null = null;
  for (const a of anchors) {
    if (a.kind !== kind) continue;
    const km = haversineKm(origin.lat, origin.lng, a.lat, a.lng);
    if (!best || km < best.km) best = { anchor: a, km };
  }
  return best;
}

// Walking at ~4.8 km/h (a standard planning speed). Reported only for short hops.
export function walkMinutes(km: number): number {
  return Math.max(1, Math.round((km / 4.8) * 60));
}

// Metro walk is only meaningful when the station is genuinely walkable.
export const WALKABLE_KM = 1.5;

export type FactKey = "metro" | "airport" | "rail";
export interface Relevance { primary: FactKey[]; less: FactKey[] }

// Which computed facts matter for which use, per context/asset-type-data-specs.md.
// Travel-oriented uses weight transit + air access; retail weights transit, air is
// secondary; logistics/storage weight air (freight), transit is secondary. Land and
// anything unmapped shows both without demotion.
const TRAVEL = ["office", "serviced", "medical", "education", "mixed_use", "hospitality"];
const RETAIL = ["retail", "showroom", "entertainment", "wedding_hall"];
const LOGISTICS = ["warehouse", "self_storage", "worker_housing", "gas_station"];

export function relevanceFor(asset: string): Relevance {
  if (LOGISTICS.includes(asset)) return { primary: ["airport"], less: ["metro", "rail"] };
  if (RETAIL.includes(asset)) return { primary: ["metro", "rail"], less: ["airport"] };
  if (TRAVEL.includes(asset)) return { primary: ["metro", "rail", "airport"], less: [] };
  return { primary: ["metro", "rail", "airport"], less: [] };
}

// WHERE `driveMinutes` WENT, AND WHY IT IS NOT COMING BACK HERE
//
// This module used to export an async `driveMinutes(o, destLat, destLng)` that
// called api.mapbox.com/directions directly. It had three defects, and they were
// hard to see because the one thing it did right hid all three.
//
//   1. It consulted no permission. `source_registry.foursquare_mapbox` records
//      `derived_display_policy: none`, and a routing answer we computed a figure
//      from is a derived value, not the source's own published one. The minutes
//      were rendered on a public listing page anyway.
//   2. It cached: `next: { revalidate: 86400 }`. Mapbox forbids caching routing
//      results, and D27(a) says travel time is computed at request time and is
//      never stored as a property fact. A day-long cache is storage whatever the
//      option is named.
//   3. It returned `number | null`, so the figure carried no record of the
//      method or the time context it was computed under. The label "driving,
//      typical off-peak" was hardcoded beside it at the render site and would
//      have kept reading that way whatever the computation later became.
//
// What it did right, and what hid the rest: with no token it returned null and
// the page degraded cleanly to straight-line distance. Everything looked
// correct. The only thing standing between a public page and an unlicensed
// figure was an unset environment variable.
//
// The replacement is `src/lib/location/travel.ts`, behind the rights boundary in
// `src/lib/location/boundary.ts`, which evaluates the register BEFORE the
// credential precisely so that this failure mode cannot recur silently. What
// remains in this file is the pure half: our own coordinates, our own distance
// arithmetic, and our own relevance rules. None of it needs a licence and none
// of it needs a socket, which is why this module now imports nothing at all.
