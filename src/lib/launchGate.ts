import { simulatedRowsAreLabelled } from "./inventory";

// SAT Markets. The five facts that stand between a stored row and a production
// inventory claim, kept apart from each other on purpose.
//
// ADV-1C.1 correction 1. Codex: "`is_demo = false` does not establish that a
// listing is real, authorized, current or suitable for a production inventory
// claim", and "do not infer authenticity from the absence of a demo marker".
//
// That is exactly what the codebase was doing, and the name was doing it in one
// word. `realInventoryOnly` applied a single predicate, `is_demo IS NOT TRUE`,
// and called the result real inventory. The predicate is right and the name was
// a claim the predicate cannot support. A row with no demo flag may be a row
// nobody flagged, a row inserted before the column existed, a row whose lister
// never confirmed it is still available, or a row nobody has authorized for
// production display. None of those is established by a null.
//
// So the rename is the small half of the correction. The large half is that the
// five things the old name ran together are now five separate values, each with
// its own vocabulary, and the production gate is a function of all five rather
// than a reading of one:
//
//   1. record demo status          did anything flag this row as simulated
//   2. preview environment status  is this deployment labelling what it shows
//   3. publication authorization   has anyone authorized production display
//   4. availability freshness      is the row still known to be available
//   5. production count eligibility the conclusion, never an input
//
// The third has no column behind it today. It is therefore `not_recorded` for
// every row in the corpus, and the gate fails closed on it. That is not a
// placeholder waiting to be softened: an authorization nobody recorded must read
// as absent, because the alternative is the exchange authorizing itself.

/** Did anything flag this row as simulated. A null is not a no. */
export type RecordDemoStatus = "flagged_simulated" | "not_flagged" | "unknown";

/** Is this deployment telling every reader that what they see is sample data. */
export type PreviewEnvironment = "preview_labelled" | "production_unlabelled";

/**
 * Has anyone authorized this row for production display.
 *
 * Deliberately NOT derivable from anything else on the row. A lister publishing
 * a listing into a labelled preview has agreed to be shown in that preview; it
 * is not a statement about a production exchange that does not exist yet.
 */
export type PublicationAuthorization =
  | "authorized_for_production_display"
  | "not_recorded"
  | "refused";

/** Is the row still known to be available, or has nobody confirmed it lately. */
export type AvailabilityFreshness = "fresh" | "stale" | "unknown";

/** Why a row may not be counted. Named per cause, never collapsed into one. */
export type ProductionCountBlocker =
  | "record_is_flagged_simulated"
  | "record_demo_status_unknown"
  | "environment_is_labelled_preview"
  | "production_display_not_authorized"
  | "production_display_refused"
  | "availability_stale"
  | "availability_freshness_unknown";

export type InventoryRecordFacts = {
  readonly recordDemoStatus: RecordDemoStatus;
  readonly previewEnvironment: PreviewEnvironment;
  readonly publicationAuthorization: PublicationAuthorization;
  readonly availabilityFreshness: AvailabilityFreshness;
};

/** The conclusion. `blockers` is empty if and only if `eligible` is true. */
export type ProductionCountEligibility = {
  readonly eligible: boolean;
  readonly blockers: readonly ProductionCountBlocker[];
};

/** The shape of a listings row this module is willing to read. */
export type InventoryRowShape = {
  readonly is_demo?: boolean | null;
  readonly availability_confirmed_at?: string | null;
};

/**
 * Fact 1. Three values, because the column is nullable and a null is genuinely a
 * third thing. `is_demo IS NOT TRUE` is the right QUERY predicate, for the reason
 * `inventory.ts` gives, and it is the wrong thing to read as a fact: it answers
 * "may this row be shown in a labelled preview", not "is this row real".
 */
export function recordDemoStatusOf(row: InventoryRowShape): RecordDemoStatus {
  if (row.is_demo === true) return "flagged_simulated";
  if (row.is_demo === false) return "not_flagged";
  return "unknown";
}

/** Fact 2. One predicate, shared with the banner, read at call time. */
export function previewEnvironmentNow(): PreviewEnvironment {
  return simulatedRowsAreLabelled() ? "preview_labelled" : "production_unlabelled";
}

/**
 * Fact 3. Always `not_recorded`, and the constant body is the finding.
 *
 * No column, migration or admin surface in this repository records that a row is
 * authorized for production display. Until one exists, the honest answer for
 * every row is that nobody recorded it. This function exists rather than a
 * hardcoded literal at the call site so that the day the column arrives there is
 * one place to change, and so that the gate's tests can point at the reason.
 */
export function publicationAuthorizationOf(_row: InventoryRowShape): PublicationAuthorization {
  return "not_recorded";
}

/**
 * Fact 4. A listing is a claim that a space is available now, and availability
 * decays on a calendar whatever the record says. `availability_confirmed_at` is
 * not written by anything today, so this returns `unknown` for the corpus, which
 * is a blocker rather than a pass.
 */
export function availabilityFreshnessOf(row: InventoryRowShape, now = new Date()): AvailabilityFreshness {
  const raw = row.availability_confirmed_at;
  if (!raw) return "unknown";
  const t = new Date(raw).getTime();
  if (!Number.isFinite(t)) return "unknown";
  const days = (now.getTime() - t) / 86_400_000;
  if (days < 0) return "unknown";
  return days <= AVAILABILITY_FRESH_DAYS ? "fresh" : "stale";
}

/** How recently availability must have been confirmed to count as fresh. */
export const AVAILABILITY_FRESH_DAYS = 30;

/** All four facts for one row, in this deployment, now. */
export function inventoryRecordFacts(row: InventoryRowShape, now = new Date()): InventoryRecordFacts {
  return {
    recordDemoStatus: recordDemoStatusOf(row),
    previewEnvironment: previewEnvironmentNow(),
    publicationAuthorization: publicationAuthorizationOf(row),
    availabilityFreshness: availabilityFreshnessOf(row, now),
  };
}

/**
 * Fact 5, and the only one that is a conclusion.
 *
 * Every blocker is listed rather than the first one returned, because a caller
 * writing an owner report needs to know everything standing in the way, and
 * because a gate that stops at the first failure teaches nobody why the second
 * one was there.
 */
export function productionCountEligibility(f: InventoryRecordFacts): ProductionCountEligibility {
  const blockers: ProductionCountBlocker[] = [];
  if (f.recordDemoStatus === "flagged_simulated") blockers.push("record_is_flagged_simulated");
  if (f.recordDemoStatus === "unknown") blockers.push("record_demo_status_unknown");
  if (f.previewEnvironment === "preview_labelled") blockers.push("environment_is_labelled_preview");
  if (f.publicationAuthorization === "not_recorded") blockers.push("production_display_not_authorized");
  if (f.publicationAuthorization === "refused") blockers.push("production_display_refused");
  if (f.availabilityFreshness === "stale") blockers.push("availability_stale");
  if (f.availabilityFreshness === "unknown") blockers.push("availability_freshness_unknown");
  return { eligible: blockers.length === 0, blockers };
}

/**
 * The set gate. Codex: prevent a production inventory claim "while ANY included
 * record is sample, synthetic, unknown or not explicitly authorized for
 * production display".
 *
 * An empty set is not eligible either. A count of zero presented as production
 * inventory is still a production inventory claim, and nothing has been checked.
 */
export function mayCountAsProductionInventory(
  rows: readonly InventoryRowShape[],
  now = new Date(),
): ProductionCountEligibility {
  if (rows.length === 0) return { eligible: false, blockers: ["record_demo_status_unknown"] };
  const seen = new Set<ProductionCountBlocker>();
  for (const r of rows) {
    for (const b of productionCountEligibility(inventoryRecordFacts(r, now)).blockers) seen.add(b);
  }
  return { eligible: seen.size === 0, blockers: [...seen] };
}

// THE TWO SWITCHES.
//
// Indexing used to be one flag. `ALLOW_INDEX` meant both "the operator intends
// this host to be indexed" and, by silence, "the inventory behind it is fit to
// be indexed". Those are different decisions made by different people at
// different times, and one variable cannot carry both: flipping it on launch day
// would have indexed a corpus every row of which is flagged simulated.
//
// So there are two, and both must be explicitly the string "true". Anything else,
// unset, empty, "TRUE", "1", "yes", a typo, is off. A switch that fails open on a
// misspelling is not a gate.

const on = (v: string | undefined) => v === "true";

/** Switch one. The operator intends this host to be indexable at all. */
export function indexingSwitchOn(): boolean {
  return on(process.env.ALLOW_INDEX) || on(process.env.NEXT_PUBLIC_ALLOW_INDEX);
}

/**
 * Switch two. The owner has recorded that the inventory behind this deployment
 * may be presented as production inventory rather than as labelled samples.
 */
export function productionInventorySwitchOn(): boolean {
  return on(process.env.PRODUCTION_INVENTORY_AUTHORIZED) || on(process.env.NEXT_PUBLIC_PRODUCTION_INVENTORY_AUTHORIZED);
}

/**
 * Both switches, and the AND is the point. Read by `middleware.ts` for the
 * `X-Robots-Tag` and by `sitemap.ts` for detail URLs, so a page cannot be
 * indexable through one path and held through the other.
 */
export function indexingPermitted(): boolean {
  return indexingSwitchOn() && productionInventorySwitchOn();
}
