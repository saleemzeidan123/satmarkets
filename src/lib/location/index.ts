// ADV-5A. The public face of the location package.
//
// `transport.ts` is deliberately absent from this file. It is the only module
// that opens a socket to a location provider, and it is reachable only from
// `gateway.ts`. Re-exporting it here would turn the rights boundary back into
// advice, so the omission is the design and `gateway.test.ts` enforces it by
// reading the repository. This mirrors `src/lib/ai/index.ts`.

export {
  GEO_PROVIDERS,
  GEO_SOURCE_IDS,
  geoProvider,
  providersFor,
  type GeoCapability,
  type GeoProvider,
  type GeoProviderId,
  type GeoUse,
} from "./registry";

export {
  PROCESSING_AGREEMENTS_IN_FORCE,
  decideGeoCall,
  decideGeoProvider,
  type GeoBoundaryContext,
  type GeoDecision,
  type GeoDenialCode,
} from "./boundary";

export {
  callGeoGeocode,
  callGeoSuggest,
  callGeoTravel,
  type GeoCallContext,
  type GeoCallResult,
  type GeoFailure,
  type TravelRequest,
} from "./gateway";

export { travelTime, type TravelOrigin } from "./travel";

export type {
  GeoPlaceItem,
  GeoPointItem,
  TravelComputed,
  TravelLabelKey,
  TravelMethod,
  TravelTime,
  TravelTimeContext,
  TravelUnavailable,
} from "./results";
