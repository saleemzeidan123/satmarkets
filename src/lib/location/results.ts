// ADV-5A. The shapes a location answer can take.
//
// THIS FILE IMPORTS NOTHING, ON PURPOSE. `src/components/LocationFacts.tsx` is a
// client component and type-imports `TravelTime` from here. If this module
// imported the registry, the boundary or anything holding a socket, a type-only
// import would still be a maintenance trap the first time someone dropped the
// `type` keyword. Keeping it dependency-free means that mistake cannot pull
// server code into the browser bundle.

export type GeoPlaceItem = {
  label: string;
  sub: string;
  kind: string;
  did?: string;
  indexed?: boolean;
};

export type GeoPointItem = {
  label: string;
  sub: string;
  lat: number;
  lng: number;
};

/**
 * The fields the SPL National Address service can return.
 *
 * Declared so the request shape is discussable, NOT so it can be requested. See
 * `address.ts`: the permitted set is empty until the written redisplay terms are
 * read and recorded, and a request is built from the permitted set alone.
 */
export type AddressFieldId =
  | "short_code"
  | "building_number"
  | "street"
  | "district"
  | "city"
  | "postal_code"
  | "additional_number";

export type AddressFields = Partial<Record<AddressFieldId, string>>;

export type TravelMethod = "driving";

export type TravelTimeContext = "typical_off_peak";

/**
 * The dictionary key that describes the method AND the time context together.
 *
 * The shipped string reads "driving, typical off-peak". A future method, or a
 * peak-hour figure, must add a new key and a new string in both dictionaries
 * rather than inheriting wording describing conditions it was not computed
 * under. That is the failure mode a bare `driveMin: number | null` invited: the
 * number carried no record of how it was produced, so the label was hardcoded
 * next to it and would have kept reading "typical off-peak" whatever changed.
 */
export type TravelLabelKey = "driving";

export type TravelComputed = {
  state: "computed";
  minutes: number;
  method: TravelMethod;
  timeContext: TravelTimeContext;
  labelKey: TravelLabelKey;
  attribution: string | null;
};

export type TravelUnavailable = {
  state: "unavailable";
  /**
   * Internal only. Quotes licence reasoning and provider detail, and is never
   * rendered publicly, following the same rule as `denialReason`.
   */
  reason: string;
  /** The boundary code, typed loosely so this file imports nothing. */
  code: string | null;
};

export type TravelTime = TravelComputed | TravelUnavailable;
