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

export type FactKey = "metro" | "airport";
export interface Relevance { primary: FactKey[]; less: FactKey[] }

// Which computed facts matter for which use, per context/asset-type-data-specs.md.
// Travel-oriented uses weight transit + air access; retail weights transit, air is
// secondary; logistics/storage weight air (freight), transit is secondary. Land and
// anything unmapped shows both without demotion.
const TRAVEL = ["office", "serviced", "medical", "education", "mixed_use", "hospitality"];
const RETAIL = ["retail", "showroom", "entertainment", "wedding_hall"];
const LOGISTICS = ["warehouse", "self_storage", "worker_housing", "gas_station"];

export function relevanceFor(asset: string): Relevance {
  if (LOGISTICS.includes(asset)) return { primary: ["airport"], less: ["metro"] };
  if (RETAIL.includes(asset)) return { primary: ["metro"], less: ["airport"] };
  if (TRAVEL.includes(asset)) return { primary: ["metro", "airport"], less: [] };
  return { primary: ["metro", "airport"], less: [] };
}

// Off-peak driving time to a destination via the Mapbox Directions API. Returns null
// when no token is configured or the call fails, so the page degrades to straight-line
// distance rather than showing nothing or, worse, a fabricated time.
export async function driveMinutes(o: Origin, destLat: number, destLng: number): Promise<number | null> {
  const token = process.env.MAPBOX_TOKEN || process.env.mapbox_token || "";
  if (!token) return null;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${o.lng},${o.lat};${destLng},${destLat}?access_token=${token}&overview=false&alternatives=false`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(url, { signal: ctrl.signal, next: { revalidate: 86400 } } as any);
    clearTimeout(timer);
    if (!res.ok) return null;
    const j: any = await res.json();
    const sec = j?.routes?.[0]?.duration;
    return typeof sec === "number" ? Math.max(1, Math.round(sec / 60)) : null;
  } catch {
    return null;
  }
}
