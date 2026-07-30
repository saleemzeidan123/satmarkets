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
  decideGeoDisplay,
  decideGeoProvider,
  type GeoBoundaryContext,
  type GeoDecision,
  type GeoDenialCode,
} from "./boundary";

export {
  callGeoAddress,
  callGeoGeocode,
  callGeoSuggest,
  callGeoTravel,
  type GeoCallContext,
  type GeoCallResult,
  type GeoFailure,
  type TravelRequest,
} from "./gateway";

export { travelTime, type TravelOrigin } from "./travel";

export {
  ADDRESS_FIELDS,
  PERMITTED_ADDRESS_FIELDS,
  buildAddressRequest,
  lookupNationalAddress,
  type AddressQuery,
  type AddressRequest,
  type AddressResult,
} from "./address";

export {
  MOBILITY_CLAUSES,
  PROCESSING_CLAUSES,
  RECORDED_AGREEMENTS,
  assessMobilityAgreement,
  assessProcessingAgreement,
  type AgreementRecord,
  type ClauseId,
  type SufficiencyVerdict,
} from "./sufficiency";

export {
  MAX_PERIOD_AGE_MONTHS,
  MIN_AGGREGATION_K,
  MIN_COVERAGE_SHARE,
  PUBLISHABLE_GEOGRAPHIES,
  assessCoverage,
  type CoverageFailure,
  type CoverageFailureCode,
  type CoverageInput,
  type CoverageVerdict,
  type Geography,
} from "./coverage";

// ADV-5B. `mobilityFigure` is deliberately absent from this file, for the same
// reason `transport.ts` is. Its verdict carries `reasons` that quote licence and
// contract reasoning, a register `code` and a list of unanswered clause
// identifiers, none of which may reach a reader. Re-exporting it here would put
// that value one plain import away from any page. The names below cross as types
// only, so nothing callable does. `panel.ts` is the runtime route, and
// `claims.test.ts` enforces that by reading the repository.
export type {
  MobilityAvailable,
  MobilityContext,
  MobilityMetric,
  MobilityObservation,
  MobilityRequest,
  MobilityResult,
  MobilityStage,
  MobilityUnavailable,
} from "./mobility";

export {
  districtMobilityPanel,
  type MobilityPanelView,
  type PanelStatusKey,
} from "./panel";

export type {
  AddressFieldId,
  AddressFields,
  GeoPlaceItem,
  GeoPointItem,
  TravelComputed,
  TravelLabelKey,
  TravelMethod,
  TravelTime,
  TravelTimeContext,
  TravelUnavailable,
} from "./results";
