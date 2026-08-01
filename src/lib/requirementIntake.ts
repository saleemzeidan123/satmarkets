// PKG-DEM1. The one vocabulary the demand form, the write path and the matcher
// all read.
//
// THE DEFECT THIS EXISTS TO END.
//
// `/post-requirement` is the public entry point for demand, and it could not
// submit from the state it shipped in. The form held its own list of move-in
// timelines and the route held a different one, as two unrelated literals in two
// files, and nobody had put them side by side:
//
//   the form offered   Immediate, 1-3 months, 3-6 months, Flexible
//                      فوري, 1-3 أشهر, 3-6 أشهر, مرن
//   the route accepted ASAP, Q1, Q2, Q3, Q4, Flexible, Immediate
//
// So two of the four English options were refused with "Choose a valid
// timeline.", all four of the Arabic options were refused, and the option the
// form pre-selected for every visitor was one of the refused ones. An Arabic
// speaker filling this form in correctly could not post a requirement at all.
//
// There was a second layer under it. `matching.ts` decides whether availability
// is part of the question by testing the stored timeline against a set of urgent
// words, and that set was a third literal. Even if `فوري` had reached the
// column, the matcher would not have recognised it, because the matcher reads
// English tokens and the form was writing Arabic ones.
//
// WHICH SIDE IS WRONG, AND WHY IT IS THE FORM.
//
// The tempting fix is to widen the route until it accepts whatever the form
// sends. That is fixing the wrong side. The stored value is read by
// `matching.ts` and is already present on live rows, so the token set is the
// system of record and the form is the thing that drifted from it. Relaxing the
// validator would let `1-3 months` into a column nothing can interpret, and the
// requirement would look posted while being invisible to matching forever.
//
// So the stored tokens are unchanged. Arabic gets labels, not new tokens. One
// module holds the token, both labels and the urgency flag, the form renders
// from it, the route validates against it and the matcher derives its urgent set
// from it, which is what makes a future disagreement impossible rather than
// merely unlikely.
//
// WHAT THIS DELIBERATELY REFUSES TO ASSERT.
//
// `ASAP` is accepted and not offered. It is a synonym of `Immediate`, and a form
// that asks a visitor to choose between two words with the same meaning is
// asking them to guess at a distinction that does not exist. Rows already
// carrying `ASAP` keep working, and `timelineLabel` still names it, because
// dropping a stored value from the vocabulary would blank an existing
// requirement's timeline on the board.
//
// Nothing here pre-selects an option. The column is nullable, one live row
// carries no timeline, and the route accepts an empty string. A radio that
// arrives already chosen states a constraint the visitor never gave, and on this
// form that constraint is then used to decide whether availability is scored.
// An unstated timeline is a real answer and is stored as one.
//
// The quarters carry no year. `Q1` submitted in the second half of 2026 could
// mean either 2026 or 2027 and the column holds no year to disambiguate it. That
// is registered as finding 103 rather than papered over here, because inventing
// a year the storage cannot hold would be worse than the ambiguity.

import { cityKey, cityLabel } from "./labels";
import { placeName } from "./displayName";

/** One move-in timeline, as it is stored, shown and scored. */
export interface TimelineOption {
  /** The value written to the column. English, and never translated. */
  token: string;
  label_en: string;
  label_ar: string;
  /**
   * Whether this timeline makes availability part of the match question. A
   * requirement due next quarter is not answered by how recently a lister
   * affirmed the space is free; one due now is.
   */
  urgent: boolean;
  /**
   * Whether the form offers it. A token that is accepted but not offered stays
   * readable on rows that already carry it.
   */
  offered: boolean;
}

/**
 * Every timeline the column may hold, in the order the form presents them.
 *
 * The order is the reader's order, soonest first, with the open-ended answer
 * last. `ASAP` sits beside `Immediate` because they are the same answer.
 */
export const TIMELINE_OPTIONS: readonly TimelineOption[] = [
  { token: "Immediate", label_en: "Immediate", label_ar: "فوري", urgent: true, offered: true },
  { token: "ASAP", label_en: "As soon as possible", label_ar: "بأسرع وقت", urgent: true, offered: false },
  { token: "Q1", label_en: "Q1", label_ar: "الربع الأول", urgent: false, offered: true },
  { token: "Q2", label_en: "Q2", label_ar: "الربع الثاني", urgent: false, offered: true },
  { token: "Q3", label_en: "Q3", label_ar: "الربع الثالث", urgent: false, offered: true },
  { token: "Q4", label_en: "Q4", label_ar: "الربع الرابع", urgent: false, offered: true },
  { token: "Flexible", label_en: "Flexible", label_ar: "مرن", urgent: false, offered: true },
];

/** Every token the write path accepts. */
export const TIMELINE_TOKENS: readonly string[] = TIMELINE_OPTIONS.map((o) => o.token);

/** The tokens whose timelines make availability part of the match question. */
export const URGENT_TIMELINE_TOKENS: readonly string[] = TIMELINE_OPTIONS.filter((o) => o.urgent).map((o) => o.token);

/** The subset the form renders. */
export function timelineOptions(): TimelineOption[] {
  return TIMELINE_OPTIONS.filter((o) => o.offered);
}

/** True if `value` is a token the column may hold. Case sensitive, because the column is. */
export function isTimelineToken(value: string): boolean {
  return TIMELINE_TOKENS.includes(value);
}

/**
 * A stored token as a reader of this locale should see it.
 *
 * Falls back to the raw value rather than to a placeholder. A row written before
 * this module existed, or by an import, may carry something outside the
 * vocabulary, and showing it unchanged is honest where showing "unknown" would
 * discard information the row actually holds.
 */
export function timelineLabel(value: string | null | undefined, ar: boolean): string {
  const v = String(value ?? "").trim();
  if (!v) return "";
  const found = TIMELINE_OPTIONS.find((o) => o.token.toLowerCase() === v.toLowerCase());
  if (!found) return v;
  return ar ? found.label_ar : found.label_en;
}

/**
 * True if a stored timeline makes availability part of the question.
 *
 * Tolerant of case and surrounding space because it reads a stored column rather
 * than a control, and rows predate the control.
 */
export function isUrgentTimeline(value: string | null | undefined): boolean {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return false;
  return TIMELINE_OPTIONS.some((o) => o.urgent && o.token.toLowerCase() === v);
}

/**
 * The asset types a requirement may be posted for.
 *
 * The form offered five and the write path accepted seven, so a visitor could
 * not post a serviced office or an education requirement through the public
 * form at all, and nothing said why. One list, read by both. Labels come from
 * `assetLabel`, which is where the platform already names an asset type; the
 * form used to title-case the token itself and so called retail "Retail" where
 * every other surface calls it "Retail & F&B".
 */
export const REQUIREMENT_ASSET_TYPES: readonly string[] = [
  "office", "retail", "warehouse", "medical", "showroom", "serviced", "education",
];

/** The deal types a requirement may be posted for. */
export const REQUIREMENT_DEAL_TYPES: readonly string[] = ["lease", "sale"];

/**
 * A condition a requirement can name, as it is stored and as it is read.
 *
 * WHY THESE ARE TOKENS. The form offered seven fixed chips and stored whichever
 * language the visitor happened to be reading in, so "Fitted" and "مجهّز" became
 * two different stored conditions that no surface could tell were the same one.
 * An English reader of the board then saw an Arabic phrase and an Arabic reader
 * saw an English one, on a field the matcher quotes back verbatim.
 *
 * The matcher's treatment of must-haves is deliberately unchanged: it holds no
 * field that answers "is this fitted", so each condition is carried through as
 * an open question with the phrase quoted back rather than scored. Giving the
 * chips a token changes what is stored and what is shown, not what is claimed.
 */
export interface MustHaveOption {
  token: string;
  label_en: string;
  label_ar: string;
}

export const MUST_HAVE_OPTIONS: readonly MustHaveOption[] = [
  { token: "fitted", label_en: "Fitted", label_ar: "مجهّز" },
  { token: "parking", label_en: "Parking", label_ar: "موقف سيارات" },
  { token: "raised_floor", label_en: "Raised floor", label_ar: "أرضية مرتفعة" },
  { token: "access_24_7", label_en: "24/7 access", label_ar: "دخول 24/7" },
  { token: "metro_nearby", label_en: "Metro nearby", label_ar: "قرب المترو" },
  { token: "street_front", label_en: "Street-front", label_ar: "واجهة شارع" },
  { token: "dock_doors", label_en: "Dock doors", label_ar: "أبواب تحميل" },
];

export const MUST_HAVE_TOKENS: readonly string[] = MUST_HAVE_OPTIONS.map((o) => o.token);

/**
 * A stored must-have as a reader of this locale should see it.
 *
 * Falls back to the raw value, because rows written before this vocabulary
 * existed carry the English or the Arabic phrase itself, and a requirement's own
 * words are worth more than a placeholder.
 *
 * PKG-DEM1 live sweep, finding 113. That fallback was measured against the
 * deployed corpus and it was carrying almost all of it. `GET /api/requirements`
 * on the shipped deployment returns six real rows holding "Fitted", "Parking",
 * "Metro nearby", "24/7 access", "Raised floor", "Dock doors", "Street-front",
 * "Heavy power" and "High footfall": display phrases the old form stored in
 * whichever language the visitor was reading. Only the single-word ones happen
 * to lowercase into a token, so five of the six rows showed an Arabic reader
 * English phrases and the read-side repair reached almost nobody who is on the
 * board today.
 *
 * A stored value is therefore recognised by its own label in either language as
 * well as by its token. That is a reading of what the row already says, not a
 * new claim about it: "Fitted" is the English label of `fitted`, so an Arabic
 * reader is shown مجهّز, and an Arabic phrase stored by the old form resolves
 * the same way for an English reader. Matching ignores case, and treats the
 * space and the underscore as the same character, because "Metro nearby",
 * "metro nearby" and `metro_nearby` are one condition written three ways.
 *
 * A phrase outside the vocabulary still falls back to itself. "Heavy power" and
 * "High footfall" were never offered by any form, so there is no token they
 * belong to, and inventing one would file a condition under a name the visitor
 * never chose. The row's own words are shown instead. The real repair for those
 * is a supervised data migration, which is finding 113's open half.
 */
const MUST_HAVE_BY_KEY: ReadonlyMap<string, MustHaveOption> = (() => {
  const norm = (s: string): string => s.trim().toLowerCase().replace(/_/g, " ");
  const m = new Map<string, MustHaveOption>();
  for (const o of MUST_HAVE_OPTIONS) {
    for (const k of [o.token, o.label_en, o.label_ar]) m.set(norm(k), o);
  }
  return m;
})();

export function mustHaveLabel(value: string | null | undefined, ar: boolean): string {
  const v = String(value ?? "").trim();
  if (!v) return "";
  const found = MUST_HAVE_BY_KEY.get(v.toLowerCase().replace(/_/g, " "));
  if (!found) return v;
  return ar ? found.label_ar : found.label_en;
}

/** One location a requirement may name, as the districts source holds it. */
export interface IntakeLocation {
  id: string;
  name_en: string;
  name_ar: string;
  city: string;
}

/** One city's locations, for a grouped control. */
export interface IntakeLocationGroup {
  /** The canonical city key, or the raw column value where no key is known. */
  city: string;
  /** The city as this locale's reader should see it. */
  label: string;
  locations: IntakeLocation[];
}

/**
 * One location as a control should show it.
 *
 * This delegates to `placeName` rather than choosing between the two name
 * columns here, and the difference is a law rather than a style. A district we
 * hold in one language only widens to its city, which is true, and never
 * borrows the other language's spelling, which would hand an Arabic reader
 * "Al Olaya" and call it a translation. `displayName.ts` is where that decision
 * is written down and `listingTitle.test.ts` makes the borrow unwritable by
 * hand. On the seventy seven locations the source holds today every row carries
 * both names, so this changes no option's text; it decides what happens to the
 * seventy eighth.
 */
export function locationLabel(row: IntakeLocation, ar: boolean): string {
  return placeName(row, ar ? "ar" : "en");
}

/**
 * Locations grouped by city, cities in the order a reader expects and locations
 * sorted within each.
 *
 * WHY THIS IS GROUPED AT ALL. The form used to offer five locations, all in
 * Riyadh, hardcoded with their UUIDs, and hardcoded `city: "Riyadh"` alongside
 * them. The platform holds 77 locations across 21 cities, measured on the
 * deployment. A tenant in Jeddah could not post a Jeddah requirement: whatever
 * they typed, the brief was stored against a Riyadh district. Reading the source
 * and grouping by its own `city` column is what makes the control describe the
 * platform rather than a memory of it.
 *
 * Grouping is by canonical key rather than by the raw string, so two spellings
 * of one city cannot become two groups. The label goes through `cityLabel`, the
 * same function the locations directory uses, so the demand form and the
 * directory cannot start naming a city two ways.
 *
 * City order follows the count of locations, largest first, then the label, so
 * the market a visitor is most likely to want is first without anyone writing a
 * ranking down. Within a city, locations are sorted by the label the reader will
 * actually see.
 */
export function groupLocations(rows: IntakeLocation[], ar: boolean): IntakeLocationGroup[] {
  const l = ar ? "ar" : "en";
  const byCity = new Map<string, IntakeLocation[]>();
  for (const r of rows) {
    const raw = String(r.city ?? "").trim();
    if (!raw || !r.id) continue;
    const key = cityKey(raw) ?? raw;
    const list = byCity.get(key);
    if (list) list.push(r);
    else byCity.set(key, [r]);
  }
  const out: IntakeLocationGroup[] = [];
  for (const [city, list] of byCity) {
    out.push({
      city,
      label: cityLabel(city, l),
      locations: [...list].sort((a, b) => locationLabel(a, ar).localeCompare(locationLabel(b, ar), l)),
    });
  }
  out.sort((a, b) => b.locations.length - a.locations.length || a.label.localeCompare(b.label, l));
  return out;
}
