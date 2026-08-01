// What a lister may change about their own listing, and when.
//
// The self-serve edit path had one rule: a short allow list of fields, applied
// identically forever. That rule was written for a published listing, where the
// advertising licence, the pinned location and the deal type are load-bearing
// facts that other people have already read, so changing them quietly is not an
// edit but a substitution. It is the right rule there.
//
// It is the wrong rule for a draft. A draft has never been published, no viewer
// has seen it, no enquiry points at it, and it is still intake. A lister who
// pinned the wrong building or typed the licence number wrong on Tuesday should
// be able to correct it on Wednesday without asking SAT to intervene, or the
// resumable Studio is only resumable for the fields nobody gets wrong.
//
// So editability is a function of two things, the field and the stage, and it is
// stated here rather than inside a route handler, because a rule about what a
// person is permitted to change is exactly the kind of rule that should be
// readable and testable on its own.
//
// It fails closed. A field this module has never heard of is not editable at any
// stage, so adding a column to the listings table does not silently open it to
// self-serve writes.

/** Draft is intake and still the lister's own. Anything else is out in public. */
export type ListingStage = "draft" | "live";

export function stageOf(status: string | null | undefined): ListingStage {
  return status === "draft" ? "draft" : "live";
}

/**
 * Editable at any stage: the lister's own description of what they are offering,
 * its size, its price and how to reach them. Correcting these on a live listing
 * is the ordinary business of marketing a space.
 */
export const ALWAYS_EDITABLE: readonly string[] = [
  "title_en",
  "title_ar",
  "description_en",
  "description_ar",
  "area_sqm",
  "price",
  "video_url",
  "contact_phone",
  "contact_email",
  "contact_channels",
  "attributes",
  "availability_confirmed_at",
];

/**
 * Editable only while the listing is a draft.
 *
 * Each of these is a fact a reader of a published listing relies on. The licence
 * number is what makes the advertisement lawful and it is printed on the advert
 * itself. The pin is what puts the space in a district, a map and a comparison.
 * The deal type decides which price column the figure lives in and therefore
 * which market the listing appears in. Changing any of them after publication is
 * a change of what is being advertised, which goes through SAT.
 */
export const DRAFT_ONLY_EDITABLE: readonly string[] = [
  "lat",
  "lng",
  "district_id",
  "deal_type",
  "ad_permit_no",
  "ad_permit_expires_at",
  "lister_type",
  "floorplan_url",
];

/**
 * Never editable by the lister at any stage, listed so the reason is on the
 * record rather than implied by absence.
 *
 * account_id and status decide whose listing it is and whether it is public.
 * asset_type decides which registry governs every other field, so changing it
 * would leave validated values behind belonging to no field. The verification
 * columns are SAT's statements, not the lister's, and a lister who could write
 * them could mark their own listing verified. right_to_market_confirmed is an
 * affirmation made once at creation; unmaking it is a withdrawal, not an edit.
 */
export const NEVER_EDITABLE: readonly string[] = [
  "account_id",
  "asset_type",
  "status",
  "published_at",
  "right_to_market_confirmed",
  "owner_verified",
  "verified_at",
  "verification_source",
  "is_demo",
];

/**
 * Fillable when absent, and only then.
 *
 * The draft-only rule above is written against substitution: a reader relied on
 * the pin, so moving it changes what was advertised. That reasoning does not
 * reach a listing that never had a pin. Nothing was relied on, the space is on
 * no map, it answers no radius search, and every published row in the corpus is
 * in exactly that state. Supplying the first pin adds a fact; replacing an
 * existing one substitutes one. Only the first is opened here.
 *
 * district_id is deliberately not in this set even though the pin implies a
 * district. Every published listing already carries a district and that district
 * is what places it in search today, so letting a first pin overwrite it would
 * be a substitution wearing an addition's clothes. A first pin that disagrees
 * with the recorded district is a real disagreement; it is recorded as finding
 * 137 rather than resolved silently here.
 */
export const FILLABLE_WHEN_ABSENT: readonly string[] = ["lat", "lng"];

const ALWAYS = new Set(ALWAYS_EDITABLE);
const DRAFT_ONLY = new Set(DRAFT_ONLY_EDITABLE);
const FILL_ABSENT = new Set(FILLABLE_WHEN_ABSENT);

/** Fails closed: an unknown field is not editable at any stage. */
export function mayEdit(field: string, stage: ListingStage): boolean {
  if (ALWAYS.has(field)) return true;
  return stage === "draft" && DRAFT_ONLY.has(field);
}

/**
 * Whether a lister may write this field given the stage and whether the field
 * already holds a value.
 *
 * This is a widening of mayEdit and never a narrowing: anything mayEdit permits
 * is permitted here too, at any value. It adds exactly one case, the first write
 * to an empty fillable field on a live listing. It fails closed on an unknown
 * field for the same reason mayEdit does.
 */
export function mayFillAbsent(field: string, stage: ListingStage, hasValue: boolean): boolean {
  if (mayEdit(field, stage)) return true;
  return !hasValue && FILL_ABSENT.has(field);
}

/** The fields a lister may change right now, in a stable order, for a caller that wants the set rather than the test. */
export function editableAt(stage: ListingStage): string[] {
  return stage === "draft" ? [...ALWAYS_EDITABLE, ...DRAFT_ONLY_EDITABLE] : [...ALWAYS_EDITABLE];
}
