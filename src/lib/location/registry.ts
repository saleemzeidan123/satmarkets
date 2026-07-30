import type { Audience } from "@/lib/sourceRights";

// ADV-5A. The declaration of every external location provider this repository
// is allowed to know about.
//
// This file exists because of what ADV-5 found. Four separate code paths were
// reaching third-party geography services with no consultation of
// `source_registry` at all:
//
//   1. `src/lib/locationFacts.ts:driveMinutes` called api.mapbox.com/directions,
//      cached the answer for a day, and rendered the minutes on a public listing
//      page. `foursquare_mapbox` records `derived_display_policy: none`.
//   2. `src/app/api/places/route.ts` sent the visitor's typed query to Google
//      Places, then Mapbox Search, then Photon.
//   3. `src/app/api/geocode/route.ts` sent the same typed query to Photon.
//   4. `src/app/api/geo/resolve/route.ts` follows a short map link the user
//      pasted. That one is different in kind and is deliberately out of scope:
//      it is the user's own link, resolved on their behalf, not our query built
//      from their data. It is recorded as excluded rather than silently omitted.
//
// The pattern mirrors `src/lib/ai/` exactly, and for the same reason. A vendor
// cannot be added to the product by writing a fetch; it has to be declared here
// first, with its source id, its host, its credential names and what kind of use
// its answer represents. `boundary.ts` then decides, `transport.ts` is the only
// socket, and `gateway.ts` is the only route to the socket.
//
// `sourceId` is the join to `source_registry`. Some entries deliberately name an
// id that has no row. That is not a bug to be tidied: the register's own first
// rule is that an unknown source has no rights, so an undeclared vendor denies
// itself without anyone having to remember to add a check.

export type GeoCapability =
  | "travel_time"
  | "place_suggest"
  | "place_geocode"
  | "address_lookup"
  | "mobility";

export type GeoProviderId =
  | "mapbox_directions"
  | "mapbox_search"
  | "google_places"
  | "photon_suggest"
  | "photon_geocode"
  | "spl_national_address"
  | "geo_analytics";

/**
 * What kind of use the provider's answer is, in the register's own vocabulary.
 * This is the field that decides which policy column applies, and it is the one
 * that is easiest to get wrong by accident.
 *
 * A travel time is `derived`: we computed it from their routing engine, so
 * `derived_display_policy` governs, not `redisplay_policy`. A suggestion list is
 * `redisplay`: it is their own published place name shown as they published it.
 * The distinction is exactly the one `driveMinutes` did not make.
 */
export type GeoUse = "redisplay" | "derived" | "export" | "ai_retrieval";

export type GeoProvider = {
  id: GeoProviderId;
  capability: GeoCapability;
  /** Join key into `source_registry`. An id with no row denies. */
  sourceId: string;
  /** Null means no endpoint is wired. Declared, not reachable. */
  host: string | null;
  /** Credential NAMES only. No value ever appears in this file. */
  envKeys: readonly string[];
  use: GeoUse;
  /**
   * Does the request body or query string carry text the user typed. This is a
   * separate question from whether we may show the answer, and it is gated
   * separately by `PROCESSING_AGREEMENTS_IN_FORCE`.
   */
  carriesUserText: boolean;
  /** Every geo answer is request-time only. D27(a) permits nothing else. */
  retention: "never";
  /** Required attribution string, or null where none is contractually required. */
  attribution: string | null;
};

/**
 * Declaration order is call order. `gateway.ts` walks `providersFor()` in this
 * order and takes the first candidate the boundary permits, so reordering this
 * array changes production behaviour and is a reviewable act.
 */
export const GEO_PROVIDERS: readonly GeoProvider[] = [
  {
    id: "mapbox_directions",
    capability: "travel_time",
    sourceId: "foursquare_mapbox",
    host: "api.mapbox.com",
    envKeys: ["MAPBOX_TOKEN", "mapbox_token"],
    use: "derived",
    carriesUserText: false,
    retention: "never",
    attribution: "Mapbox",
  },
  {
    id: "google_places",
    capability: "place_suggest",
    // Deliberately an id with no row in source_registry. Google Places was in
    // production through /api/places and was never registered.
    sourceId: "google_places",
    host: "places.googleapis.com",
    envKeys: ["GOOGLE_MAPS_API_KEY", "google_places_key"],
    use: "redisplay",
    carriesUserText: true,
    retention: "never",
    attribution: null,
  },
  {
    id: "mapbox_search",
    capability: "place_suggest",
    sourceId: "foursquare_mapbox",
    host: "api.mapbox.com",
    envKeys: ["MAPBOX_TOKEN", "mapbox_token"],
    use: "redisplay",
    carriesUserText: true,
    retention: "never",
    attribution: "Mapbox",
  },
  {
    id: "photon_suggest",
    capability: "place_suggest",
    sourceId: "photon_osm",
    host: "photon.komoot.io",
    envKeys: [],
    use: "redisplay",
    carriesUserText: true,
    retention: "never",
    attribution: "OpenStreetMap contributors",
  },
  {
    id: "photon_geocode",
    capability: "place_geocode",
    sourceId: "photon_osm",
    host: "photon.komoot.io",
    envKeys: [],
    use: "redisplay",
    carriesUserText: true,
    retention: "never",
    attribution: "OpenStreetMap contributors",
  },
  {
    // ADV-5B. Declared with no host on purpose. The interface exists so the
    // procurement record has something concrete to point at; it cannot be
    // called, and the boundary denies it for a rights reason before it ever
    // reaches the missing-endpoint reason.
    id: "spl_national_address",
    capability: "address_lookup",
    sourceId: "spl_address",
    host: null,
    envKeys: ["SPL_API_KEY"],
    use: "redisplay",
    carriesUserText: true,
    retention: "never",
    attribution: null,
  },
  {
    // ADV-5B. Mobility and visitation. No row, no host, no key. Owner ruling 7:
    // the interface may exist, the capability stays disabled.
    id: "geo_analytics",
    capability: "mobility",
    sourceId: "geo_analytics",
    host: null,
    envKeys: [],
    use: "derived",
    carriesUserText: false,
    retention: "never",
    attribution: null,
  },
];

/** Candidates for a capability, in declared call order. */
export function providersFor(
  capability: GeoCapability
): readonly GeoProvider[] {
  return GEO_PROVIDERS.filter((p) => p.capability === capability);
}

/** One provider by id, or null. Never throws, never invents. */
export function geoProvider(id: GeoProviderId): GeoProvider | null {
  return GEO_PROVIDERS.find((p) => p.id === id) ?? null;
}

/** Every source id the geo package can consult, deduplicated. */
export const GEO_SOURCE_IDS: readonly string[] = Array.from(
  new Set(GEO_PROVIDERS.map((p) => p.sourceId))
);

/**
 * Audience is re-exported as a type so callers of the geo package do not have to
 * import from two places to build a context. There is no geo-specific audience.
 */
export type { Audience };
