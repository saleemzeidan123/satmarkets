import type { GeoProvider } from "./registry";
import type { AddressFields, GeoPlaceItem, GeoPointItem } from "./results";

// ADV-5A. The only place in this repository that opens a socket to a location
// provider.
//
// THIS MODULE IS PRIVATE TO src/lib/location/gateway.ts. Nothing else may import
// it, and `src/lib/location/index.ts` deliberately does not re-export it. The
// reasoning is identical to `src/lib/ai/transport.ts`: if a caller can reach a
// transport, the rights boundary is advice rather than a precondition.
//
// Two properties are enforced here rather than left to callers:
//
//   EVERY URL IS BUILT FROM `provider.host`. Hostnames are written in exactly
//   one file, `registry.ts`. A new vendor cannot arrive through a string literal
//   in a route handler.
//
//   EVERY REQUEST IS `cache: "no-store"` WITH NO `next.revalidate`. The old
//   `driveMinutes` held a Mapbox routing answer for 86,400 seconds. Mapbox
//   forbids caching routing results, D27(a) says travel time is computed at
//   request time and is never stored as a property fact, and a 24-hour cache is
//   storage whatever the variable is called.

export type GeoOutcome<T> = { ok: true; value: T } | { ok: false; detail: string };

const DEFAULT_TIMEOUT_MS = 3_000;
const TRAVEL_TIMEOUT_MS = 2_500;

const OSM_AGENT = "SATMarkets/1.0 (+https://github.com/saleemzeidan123/satmarkets)";
const SA = "SA";
const RIYADH_LAT = 24.7136;
const RIYADH_LNG = 46.6753;

/** Which of the declared credential names are actually set. Names, not values. */
export function presentCredentialKeys(
  p: GeoProvider,
  env: Record<string, string | undefined>
): readonly string[] {
  return p.envKeys.filter((k) => {
    const v = env[k];
    return typeof v === "string" && v.trim() !== "";
  });
}

/** First non-empty declared credential value, or "". */
function credential(p: GeoProvider, env: Record<string, string | undefined>): string {
  for (const k of p.envKeys) {
    const v = env[k];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return "";
}

function withTimeout(timeoutMs: number | undefined, signal: AbortSignal | undefined) {
  if (!timeoutMs) return { signal, done: () => {} };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  return { signal: ctrl.signal, done: () => clearTimeout(timer) };
}

export type TransportOptions = { timeoutMs?: number; signal?: AbortSignal };

// ---------------------------------------------------------------- travel time

export type TravelRequest = {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
};

async function mapboxDirections(
  p: GeoProvider,
  r: TravelRequest,
  env: Record<string, string | undefined>,
  o: TransportOptions
): Promise<GeoOutcome<number>> {
  const token = credential(p, env);
  if (!token) return { ok: false, detail: `${p.id}: no credential at call time` };
  const t = withTimeout(o.timeoutMs ?? TRAVEL_TIMEOUT_MS, o.signal);
  try {
    const url =
      `https://${p.host}/directions/v5/mapbox/driving/` +
      `${r.fromLng},${r.fromLat};${r.toLng},${r.toLat}` +
      `?access_token=${encodeURIComponent(token)}&overview=false&alternatives=false`;
    const res = await fetch(url, { cache: "no-store", signal: t.signal });
    if (!res.ok) return { ok: false, detail: `${p.id} returned ${res.status}` };
    const j: any = await res.json();
    const secs = j?.routes?.[0]?.duration;
    if (typeof secs !== "number" || !Number.isFinite(secs)) {
      return { ok: false, detail: `${p.id} returned no route` };
    }
    return { ok: true, value: secs };
  } catch (e: any) {
    return { ok: false, detail: `${p.id} call failed: ${String(e?.name || e)}` };
  } finally {
    t.done();
  }
}

export function fetchTravelSeconds(
  p: GeoProvider,
  r: TravelRequest,
  env: Record<string, string | undefined>,
  o: TransportOptions = {}
): Promise<GeoOutcome<number>> {
  switch (p.id) {
    case "mapbox_directions":
      return mapboxDirections(p, r, env, o);
    default:
      return Promise.resolve({
        ok: false,
        detail: `${p.id}: no travel-time transport is implemented`,
      });
  }
}

// ------------------------------------------------------------ place suggest

function stripCountry(s: string): string {
  return String(s || "").replace(/,?\s*(Saudi Arabia|السعودية)$/i, "").trim();
}

function sessionToken(): string {
  const g: any = globalThis as any;
  return g.crypto && g.crypto.randomUUID
    ? g.crypto.randomUUID()
    : "sat-" + Math.random().toString(36).slice(2);
}

async function googleAutocomplete(
  p: GeoProvider,
  q: string,
  env: Record<string, string | undefined>,
  o: TransportOptions
): Promise<GeoOutcome<GeoPlaceItem[]>> {
  const key = credential(p, env);
  if (!key) return { ok: false, detail: `${p.id}: no credential at call time` };
  const t = withTimeout(o.timeoutMs ?? DEFAULT_TIMEOUT_MS, o.signal);
  try {
    const res = await fetch(`https://${p.host}/v1/places:autocomplete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
      body: JSON.stringify({
        input: q,
        includedRegionCodes: [SA.toLowerCase()],
        languageCode: "en",
      }),
      cache: "no-store",
      signal: t.signal,
    });
    if (!res.ok) return { ok: false, detail: `${p.id} returned ${res.status}` };
    const j: any = await res.json();
    const out: GeoPlaceItem[] = [];
    for (const s of j.suggestions || []) {
      const pp = s.placePrediction;
      if (!pp) continue;
      const label = pp.structuredFormat?.mainText?.text || pp.text?.text;
      if (!label) continue;
      const sub = stripCountry(pp.structuredFormat?.secondaryText?.text || "");
      const types: string[] = pp.types || [];
      const kind = types.some((x) => /locality|administrative_area|country/.test(x))
        ? "city"
        : types.some((x) => /sublocality|neighborhood/.test(x))
        ? "district"
        : "place";
      out.push({ label, sub, kind });
      if (out.length >= 8) break;
    }
    return { ok: true, value: out };
  } catch (e: any) {
    return { ok: false, detail: `${p.id} call failed: ${String(e?.name || e)}` };
  } finally {
    t.done();
  }
}

async function mapboxSuggest(
  p: GeoProvider,
  q: string,
  env: Record<string, string | undefined>,
  o: TransportOptions
): Promise<GeoOutcome<GeoPlaceItem[]>> {
  const token = credential(p, env);
  if (!token) return { ok: false, detail: `${p.id}: no credential at call time` };
  const t = withTimeout(o.timeoutMs ?? DEFAULT_TIMEOUT_MS, o.signal);
  try {
    const url =
      `https://${p.host}/search/searchbox/v1/suggest?q=${encodeURIComponent(q)}` +
      `&access_token=${encodeURIComponent(token)}&language=en&limit=8&country=${SA.toLowerCase()}` +
      `&proximity=${RIYADH_LNG},${RIYADH_LAT}&session_token=${sessionToken()}`;
    const res = await fetch(url, { cache: "no-store", signal: t.signal });
    if (!res.ok) return { ok: false, detail: `${p.id} returned ${res.status}` };
    const j: any = await res.json();
    const out: GeoPlaceItem[] = [];
    for (const sg of j.suggestions || []) {
      const label = sg.name as string;
      if (!label) continue;
      const sub = stripCountry(String(sg.place_formatted || sg.address || ""));
      const ft = String(sg.feature_type || "");
      if (/category|brand/i.test(ft) || /^(category|brand)$/i.test(sub)) continue;
      const kind = /place|locality|region|country/.test(ft)
        ? "city"
        : /neighborhood|district|postcode|locality/.test(ft)
        ? "district"
        : "place";
      out.push({ label, sub, kind });
      if (out.length >= 8) break;
    }
    return { ok: true, value: out };
  } catch (e: any) {
    return { ok: false, detail: `${p.id} call failed: ${String(e?.name || e)}` };
  } finally {
    t.done();
  }
}

function photonUrl(host: string, q: string): string {
  return (
    `https://${host}/api/?q=${encodeURIComponent(q)}` +
    `&lang=en&limit=15&lat=${RIYADH_LAT}&lon=${RIYADH_LNG}`
  );
}

function photonSub(pr: Record<string, unknown>, name: string): string {
  const parts = [pr.district, pr.city, pr.county, pr.state]
    .map((x) => (x ? String(x) : ""))
    .filter((x, i, a) => x && x !== name && a.indexOf(x) === i);
  return parts.slice(0, 2).join(", ");
}

async function photonSuggest(
  p: GeoProvider,
  q: string,
  o: TransportOptions
): Promise<GeoOutcome<GeoPlaceItem[]>> {
  const t = withTimeout(o.timeoutMs ?? DEFAULT_TIMEOUT_MS, o.signal);
  try {
    const res = await fetch(photonUrl(p.host as string, q), {
      headers: { "User-Agent": OSM_AGENT },
      cache: "no-store",
      signal: t.signal,
    });
    if (!res.ok) return { ok: false, detail: `${p.id} returned ${res.status}` };
    const j: any = await res.json();
    const seen = new Set<string>();
    const items: GeoPlaceItem[] = [];
    for (const f of j.features || []) {
      const pr = (f.properties || {}) as Record<string, unknown>;
      if (pr.countrycode !== SA) continue;
      const name = String(pr.name ?? "");
      if (!name) continue;
      const sub = photonSub(pr, name);
      const key = (name + "|" + sub).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const ov = String(pr.osm_value || pr.type || "");
      const kind = /city|town|state|province/.test(ov)
        ? "city"
        : /suburb|neighbourhood|neighborhood|district|quarter|village/.test(ov)
        ? "district"
        : "place";
      items.push({ label: name, sub, kind });
      if (items.length >= 8) break;
    }
    return { ok: true, value: items };
  } catch (e: any) {
    return { ok: false, detail: `${p.id} call failed: ${String(e?.name || e)}` };
  } finally {
    t.done();
  }
}

export function fetchPlaceSuggestions(
  p: GeoProvider,
  q: string,
  env: Record<string, string | undefined>,
  o: TransportOptions = {}
): Promise<GeoOutcome<GeoPlaceItem[]>> {
  switch (p.id) {
    case "google_places":
      return googleAutocomplete(p, q, env, o);
    case "mapbox_search":
      return mapboxSuggest(p, q, env, o);
    case "photon_suggest":
      return photonSuggest(p, q, o);
    default:
      return Promise.resolve({
        ok: false,
        detail: `${p.id}: no place-suggest transport is implemented`,
      });
  }
}

// ----------------------------------------------------------------- geocode

async function photonGeocode(
  p: GeoProvider,
  q: string,
  o: TransportOptions
): Promise<GeoOutcome<GeoPointItem[]>> {
  const t = withTimeout(o.timeoutMs ?? DEFAULT_TIMEOUT_MS, o.signal);
  try {
    const res = await fetch(photonUrl(p.host as string, q), {
      headers: { "User-Agent": OSM_AGENT },
      cache: "no-store",
      signal: t.signal,
    });
    if (!res.ok) return { ok: false, detail: `${p.id} returned ${res.status}` };
    const j: {
      features?: Array<{
        properties?: Record<string, unknown>;
        geometry?: { coordinates?: number[] };
      }>;
    } = await res.json();
    const seen = new Set<string>();
    const items: GeoPointItem[] = [];
    for (const feat of j.features || []) {
      const pr = (feat.properties || {}) as Record<string, unknown>;
      if (pr.countrycode !== SA) continue;
      const coords = feat.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const name = String(pr.name ?? "");
      if (!name) continue;
      const sub = photonSub(pr, name);
      const key = (name + "|" + sub).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ label: name, sub, lat, lng });
      if (items.length >= 8) break;
    }
    return { ok: true, value: items };
  } catch (e: any) {
    return { ok: false, detail: `${p.id} call failed: ${String(e?.name || e)}` };
  } finally {
    t.done();
  }
}

export function fetchGeocode(
  p: GeoProvider,
  q: string,
  o: TransportOptions = {}
): Promise<GeoOutcome<GeoPointItem[]>> {
  switch (p.id) {
    case "photon_geocode":
      return photonGeocode(p, q, o);
    default:
      return Promise.resolve({
        ok: false,
        detail: `${p.id}: no geocode transport is implemented`,
      });
  }
}

/**
 * Address lookup. DELIBERATELY WITHOUT A SINGLE BRANCH.
 *
 * Every other dispatcher in this file has a case per implemented provider and a
 * denying default. This one has only the default, and that is the ADV-5B
 * decision rather than unfinished work.
 *
 * A request cannot be written honestly before the written redisplay terms are
 * read. The SPL National Address service answers with a set of fields, and
 * asking for more fields than we are permitted to display is itself the
 * problem: the request is the moment the data crosses, not the render. So the
 * permitted field set in `address.ts` is empty, a request built from an empty
 * field set is nothing, and there is nothing here to implement until the owner
 * records the terms under Part E.
 */
export function fetchAddress(
  p: GeoProvider,
  _query: string,
  _o: TransportOptions = {}
): Promise<GeoOutcome<AddressFields[]>> {
  return Promise.resolve({
    ok: false,
    detail: `${p.id}: no address transport is implemented, and none may be written before the redisplay terms are recorded`,
  });
}
