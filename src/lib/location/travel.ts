import { callGeoTravel, type GeoCallContext } from "./gateway";
import type { TravelTime } from "./results";

// ADV-5A. Travel time, computed at request time, carrying its own method and
// time context.
//
// `docs/strategy-reconciliation.md`, reconciliation ruling (a), recorded in
// D27(a): "Travel time, if it ships, is computed at request time, carries its
// method and time context, and is never stored as a property fact."
//
// All three clauses are structural here rather than remembered. Request time is
// enforced by the transport's `cache: "no-store"`. Method and time context are
// fields on the returned union, not a label chosen at the render site. And
// nothing in this path writes: the value is returned to a server component and
// rendered, and there is no column for it.

export type TravelOrigin = { lat: number; lng: number };

export async function travelTime(
  from: TravelOrigin,
  toLat: number,
  toLng: number,
  ctx: GeoCallContext
): Promise<TravelTime> {
  const r = await callGeoTravel(
    { fromLat: from.lat, fromLng: from.lng, toLat, toLng },
    ctx
  );

  if (!r.ok) {
    return {
      state: "unavailable",
      reason: r.reasons.join("; "),
      code: r.code,
    };
  }

  return {
    state: "computed",
    // A route of under a minute is still a journey. Rounding it to zero would
    // read as an error, so the floor is one.
    minutes: Math.max(1, Math.round(r.value / 60)),
    method: "driving",
    timeContext: "typical_off_peak",
    labelKey: "driving",
    attribution: r.attribution,
  };
}
