import type { VerificationState } from "./evidence";
import type { GateReason } from "./gate";
import type { NotVerifiedReason } from "./listingVerification";
import type { CountedNoun } from "./format";

// ADV-4B. The lists the three public records publish.
//
// These lived beside the pages that render them, which is where they read best
// but is not where they are allowed to live: a Next.js App Router page module
// may only export the route contract itself, and `next build` generates a type
// that fails the compile on any other export. They are therefore declared here
// and imported by the pages.
//
// Every array is a union spelled out by hand, because TypeScript erases a union
// and cannot enumerate one at runtime. `src/lib/adv4b.test.ts` asserts each list
// against the declaration it mirrors, so a state, reason or source added to an
// engine tomorrow fails the suite here rather than quietly going unpublished.

/** Every `VerificationState`, in the order the narrative reads them. */
export const ALL_STATES: readonly VerificationState[] = [
  "verified",
  "not_verified",
  "expired",
  "not_applicable",
  "unknown",
];

/**
 * The reasons the demotion chain in `listingVerification.ts` can return.
 *
 * Not the whole `NotVerifiedReason` union: `permit_missing`, `permit_expired`
 * and `relation_contradicted` are produced elsewhere and are shown in their own
 * sections, so listing them here would misreport where each check happens.
 */
export const DEMOTION_REASONS: readonly NotVerifiedReason[] = [
  "flag_not_set",
  "demo_record",
  "seed_method",
  "no_check_method",
  "no_check_date",
  "no_checking_actor",
];

/** Every `GateReason`. The marketing gate, which is a different question. */
export const ALL_GATE_REASONS: readonly GateReason[] = [
  "ownership",
  "authorization",
  "right_to_market",
  "permit_missing",
  "permit_expired",
];

/** Declared order for the source register. A map has no reading order. */
export const DECLARED_SOURCES: readonly string[] = [
  "gastat_sama",
  "rega_ejar",
  "broker_overlay",
  "fsq_os_places",
  "foursquare_mapbox",
  "rega_permit",
  "nafath",
  "wathq_deeds",
  "spl_address",
];

/** source_id to the dictionary key pair that names and describes it. */
export const SOURCE_COPY: Record<
  string,
  "Gastat" | "Rega" | "Broker" | "Fsq" | "Mapbox" | "Permit" | "Nafath" | "Wathq" | "Spl"
> = {
  gastat_sama: "Gastat",
  rega_ejar: "Rega",
  broker_overlay: "Broker",
  fsq_os_places: "Fsq",
  foursquare_mapbox: "Mapbox",
  rega_permit: "Permit",
  nafath: "Nafath",
  wathq_deeds: "Wathq",
  spl_address: "Spl",
};

/**
 * Where Arabic changes the counted form. CLDR gives it six categories against
 * English's two, and the breaks fall at 1, 2, 3, 11 and 100. Zero is included
 * because an empty result set is the count a discovery surface renders most.
 */
export const COUNT_BOUNDARIES: readonly number[] = [0, 1, 2, 3, 10, 11, 99, 100];

/**
 * Two nouns rather than one. A single noun would leave open whether the rule is
 * general or whether that one word had simply been spelled out by hand:
 * `listing` is the platform's own count and `month` is the one that appears
 * inside a lease term.
 */
export const SHOWN_NOUNS: readonly CountedNoun[] = ["listing", "month"];
