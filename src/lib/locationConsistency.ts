import { distanceKm, type LocationPoint } from "./nearestLocation";
import { kindLabel, normalizeKind } from "./locationKind";
import { placeName } from "./displayName";

// Finding 137. A first map pin must not silently contradict the location the
// listing already records.
//
// THE EVIDENCE SOURCE FOR EVERY BOUNDARY DECISION IN THIS FILE, STATED PLAINLY.
//
// SAT holds no district boundary geometry. The evidence is the deployed
// production preview itself: the listings page ships the whole location set to
// the browser, and every one of the 24 rows carries exactly an id, an English
// name, an Arabic name, a latitude, a longitude and a kind. There is no polygon,
// no radius, no bounding box and no area anywhere in the record. No dataset was
// purchased, licensed or scraped to write this module, and none may be.
//
// That fact decides the shape of the answer. A pin cannot be tested for
// containment inside a district when no district has an inside. So this module
// has NO `verified` state and can never grow one while the data is a single
// point per row. The best true answer it can give is "these two are far enough
// apart that they cannot both describe the same building", and the best it can
// say when they agree is "nothing contradicts this, and nothing confirms it
// either".
//
// THE FLOOR IS DELIBERATELY GENEROUS. Centroid-to-centroid distance inside one
// city is routinely several kilometres: Riyadh's built area spans roughly 60 km
// and a large district's own centroid can sit 5 km from a building genuinely
// inside it. A false accusation costs a lister their trust in every other thing
// the screen tells them; a missed contradiction costs one review. So the floor
// is set far above ordinary intra-city spread, and a city name that merely
// differs is not on its own an accusation, because Dammam, Dhahran and Al Khobar
// sit within a few kilometres of one another.
//
// Law 7 is why the descriptor comes from `locationKind.ts` rather than the word
// "district": the nearest row to a pin is frequently a development, and a
// development is never a district. Law 2: no em dashes. Western numerals in both
// languages. The statements name no column, no table and no internal mechanism,
// because a lister is owed the problem, not the implementation.

export type LocationConsistencyVerdict =
  | "no_pin"
  | "no_location_recorded"
  | "unverifiable"
  | "consistent_unverified"
  | "contradicted";

export type LocationConsistencyReason = "far_from_recorded_location" | "different_city";

export interface LocationConsistency {
  verdict: LocationConsistencyVerdict;
  reasons: readonly LocationConsistencyReason[];
  /** Great-circle km from the pin to the recorded location's point, or null when it could not be measured. */
  distanceKm: number | null;
  /** Present only when the verdict is `contradicted`. */
  statement_en: string | null;
  statement_ar: string | null;
  /** The plain explanation of a non-contradicted state, including why it is not a confirmation. */
  note_en: string | null;
  note_ar: string | null;
}

/**
 * The distance at and above which a pin and the recorded location are held to
 * contradict each other. See the header for why it is this large.
 */
export const CONTRADICTION_KM = 25;

export interface LocationConsistencyInput {
  lat?: number | null;
  lng?: number | null;
  /** The location row the listing already records, resolved by the caller. */
  recorded?: LocationPoint | null;
  /** The row nearest the pin, resolved by the caller. Used only to read the pin's city. */
  nearest?: LocationPoint | null;
}

const norm = (v: unknown): string => (typeof v === "string" ? v.trim().toLowerCase() : "");

/** The recorded location as a lister would name it: "Al Olaya (District)", "KAFD (Development)", or "". */
function descriptorOf(row: LocationPoint, ar: boolean): string {
  const name = placeName(row, ar ? "ar" : "en");
  const kind = normalizeKind(row.kind);
  if (name && kind) return `${name} (${kindLabel(kind, ar)})`;
  if (name) return name;
  return kind ? kindLabel(kind, ar) : "";
}

function result(
  verdict: LocationConsistencyVerdict,
  reasons: LocationConsistencyReason[],
  distance: number | null,
  statements: [string, string] | null,
  notes: [string, string] | null,
): LocationConsistency {
  return {
    verdict,
    reasons,
    distanceKm: distance,
    statement_en: statements ? statements[0] : null,
    statement_ar: statements ? statements[1] : null,
    note_en: notes ? notes[0] : null,
    note_ar: notes ? notes[1] : null,
  };
}

export function assessLocationConsistency(input: LocationConsistencyInput): LocationConsistency {
  const lat = typeof input.lat === "number" ? input.lat : NaN;
  const lng = typeof input.lng === "number" ? input.lng : NaN;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return result("no_pin", [], null, null, [
      "No pin has been placed yet, so there is nothing to compare with the location on file.",
      "لم توضع علامة على الخريطة بعد، فلا يوجد ما يُقارن بالموقع المسجّل.",
    ]);
  }

  const recorded = input.recorded ?? null;
  if (!recorded) {
    return result("no_location_recorded", [], null, null, [
      "No location is on file for this listing yet, so the pin contradicts nothing.",
      "لا يوجد موقع مسجّل لهذا العرض بعد، فالعلامة لا تتعارض مع شيء.",
    ]);
  }

  if (!Number.isFinite(recorded.lat) || !Number.isFinite(recorded.lng)) {
    return result("unverifiable", [], null, null, [
      "SAT holds no point for the location on file, so the pin cannot be compared with it. A reviewer will check it.",
      "لا يوجد لدى سات إحداثي للموقع المسجّل، فلا يمكن مقارنة العلامة به. سيتحقق منه المراجع.",
    ]);
  }

  const km = distanceKm(lat, lng, recorded.lat, recorded.lng);
  const pinCity = norm(input.nearest?.city);
  const recordedCity = norm(recorded.city);
  const cityDiffers = pinCity !== "" && recordedCity !== "" && pinCity !== recordedCity;

  if (km < CONTRADICTION_KM) {
    return result("consistent_unverified", cityDiffers ? ["different_city"] : [], km, null, [
      "The pin sits near the location on file. SAT does not hold district boundaries, so this is not a confirmed match and it is not shown to a visitor as one.",
      "العلامة قريبة من الموقع المسجّل. لا تملك سات حدود الأحياء، لذلك هذه ليست مطابقة مؤكدة ولا تُعرض على الزائر على أنها كذلك.",
    ]);
  }

  const reasons: LocationConsistencyReason[] = ["far_from_recorded_location"];
  if (cityDiffers) reasons.push("different_city");

  const dEn = descriptorOf(recorded, false);
  const dAr = descriptorOf(recorded, true);
  const tailEn = dEn ? `, ${dEn}` : "";
  const tailAr = dAr ? `، ${dAr}` : "";
  const closeEn = "They cannot both be right.";
  const closeAr = "لا يمكن أن يصحّ الاثنان معاً.";

  const statements: [string, string] = cityDiffers
    ? [
        `The map pin is in a different city from the location on file${tailEn}. ${closeEn}`,
        `علامة الخريطة تقع في مدينة غير مدينة الموقع المسجّل${tailAr}. ${closeAr}`,
      ]
    : [
        `The map pin is about ${Math.round(km)} km from the location on file${tailEn}. ${closeEn}`,
        `علامة الخريطة تبعد نحو ${Math.round(km)} كم عن الموقع المسجّل${tailAr}. ${closeAr}`,
      ];

  return result("contradicted", reasons, km, statements, null);
}

/** True only for the state that must stop a production publication. */
export function isLocationContradicted(c: LocationConsistency | null | undefined): boolean {
  return c?.verdict === "contradicted";
}
