// ADV-1C. The binding: one real listing row, turned into real Evidence Passports.
//
// WHY THIS FILE IS THE PART THAT MATTERS.
//
// Codex boundary 3 rules that ADV-1C cannot close because types, utilities and
// components exist. `evidence.ts` had all three and shipped dormant for two
// packages. This module is the one that makes a passport out of something a
// reader is actually looking at, so that `publicEvidenceView` has a producer and
// the listing page has something to render. Without it the whole spine is still
// a design.
//
// WHY THE LISTING PAGE IS THE SURFACE, AND WHY IT IS THE ONLY HONEST ONE TODAY.
//
// Read at ADV-1C on the deployed preview: `/en/sources` renders the
// `register.size === 0` branch, so there is no external source rights row in
// production. Under `publishability` a `tier: "sourced"` figure with no rights
// row is denied, and correctly: an unread permission is not a permission. So
// every market statistic drawn from a licensed source resolves to `unavailable`
// today and there is nothing to dress it up as.
//
// What is left is what the exchange holds in its own right: figures a lister
// entered about their own space, and figures SAT computed from those. That is
// the listing detail page. Owner ruling 7 says gated features stay disabled
// until the permission exists, so building the passport here is not settling for
// less, it is building the only part that is presently lawful.
//
// WHAT A PASSPORT HERE DOES NOT CLAIM.
//
// Every entered figure is `tier: "entered"`, which `confidenceOf` resolves to
// `low` no matter how fresh it is and no matter who filed it. That is the field
// level statement and it is the true one: nobody at SAT measured the floor plate
// or audited the quoted rent. The verification records travel with the passport
// because a reader deserves to know what WAS checked, but the four dimensions
// name themselves precisely (ownership, authorization, right to market, ad
// permit) and not one of them is a claim about the number. Finding 24 is what
// happens when four different questions are collapsed into one badge, and this
// module is written so that collapse has nowhere to happen.
//
// Today every dimension on every published row resolves `not_verified` anyway,
// which `listingVerification` documents as the correct and intended outcome of
// owner ruling 3. `listingEvidence.test.ts` asserts that from the record rather
// than trusting it.

import {
  type EvidencePassport,
  type StatisticKind,
  type Transformation,
} from "./evidence";
import { STALE_MIN_DAYS } from "./availability";
import {
  type Loc,
  type UnitKey,
  formatArea,
  formatMoney,
  formatWithUnit,
} from "./format";
import {
  type FilingAccount,
  type VerifiableListing,
  listingVerification,
} from "./listingVerification";
import {
  type PublicEvidenceView,
  publicEvidenceView,
} from "./evidenceView";

// ---------------------------------------------------------------------------
// The row
// ---------------------------------------------------------------------------

/**
 * The columns a passport is built from, and no others.
 *
 * Narrower than the row the page loads, on purpose. A module that accepts the
 * whole listing can quietly start reading a column nobody reviewed, and a
 * passport is the last place that should be possible. Numbers are typed as
 * `number | string` because PostgREST returns numerics as strings.
 */
export type EvidenceListing = VerifiableListing & {
  id: string;
  asset_type?: string | null;
  deal_type?: string | null;
  area_sqm?: number | string | null;
  asking_rent_sqm?: number | string | null;
  sale_price?: number | string | null;
  sale_price_sqm?: number | string | null;
  service_charge_sqm?: number | string | null;
  /**
   * The date the lister last affirmed the filing. Never `updated_at`, which any
   * edit bumps, and never `verified_at`, which is a different fact about a
   * different question. `availability.ts` states the same rule for the same
   * reason and this module reads the same column so the two signals on one page
   * cannot contradict each other.
   */
  availability_confirmed_at?: string | null;
};

export type ListingEvidenceOptions = {
  locale: Loc;
  /** The account that filed it, when the surface has loaded one. */
  account?: FilingAccount | null;
  /**
   * The place, already resolved in the reader's language by the caller. The page
   * knows the district and city names in both locales; this module does not, and
   * inventing an English place name for the Arabic page would break parity.
   */
  geography?: string | null;
  now?: number;
};

// ---------------------------------------------------------------------------
// How long a figure stays current
// ---------------------------------------------------------------------------

/**
 * The tolerance for a commercial term: the same 60 days at which the
 * availability affirmation on this page turns stale.
 *
 * Reused rather than chosen again. Two freshness signals sitting on one screen
 * that disagree about whether the same filing is current is worse than either
 * being slightly wrong, and a second hand-picked constant is how that happens.
 */
const TERM_MAX_AGE_DAYS = STALE_MIN_DAYS;

/**
 * A stated floor area carries NO tolerance, and the omission is deliberate.
 *
 * `freshnessOf` reads a missing tolerance as `unknown`, documented there as "we
 * do not know how long it stays true". For an area that is exactly right: it
 * does not decay on a clock. It was either stated correctly at filing or it was
 * not, and ageing it would invent a decay that does not exist while dressing a
 * possibly wrong figure as a recently correct one.
 */
const AREA_MAX_AGE_DAYS = null;

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

/**
 * The machine field names, so a correction, a log line, an export and a rendered
 * tile all name the same thing. These are the database column names rather than
 * labels, which is why they are legible to a reviewer reading the table.
 */
export const LISTING_EVIDENCE_FIELDS = [
  "area_sqm",
  "asking_rent_sqm",
  "service_charge_sqm",
  "sale_price",
  "sale_price_sqm",
] as const;

export type ListingEvidenceField = (typeof LISTING_EVIDENCE_FIELDS)[number];

/** PostgREST numerics arrive as strings. Anything not a real number is nothing. */
function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/**
 * Every passport the listing detail page can carry, in the order the page shows
 * them. One per published figure, and none for a figure the row does not hold:
 * a passport for an absent value would render as `empty`, which is true but is
 * an answer to a question the page never asked.
 *
 * The value string is produced by the same formatter the tile uses, from the
 * same unit table, so the passport and the figure beside it cannot disagree.
 * `unit` carries the machine key for the same reason `field` does.
 */
export function listingPassports(
  l: EvidenceListing,
  opts: ListingEvidenceOptions
): EvidencePassport[] {
  const lp = opts.locale;
  const now = opts.now ?? Date.now();
  const lease = l.deal_type === "lease";
  const asOf = l.availability_confirmed_at ?? null;

  // What was checked about the FILING. Attached to each figure because a reader
  // weighing a number is entitled to know whether the party who filed it had the
  // right to, and withheld from none of them because that right is not per field.
  // It is not, and must never be read as, a check on the number itself: the tier
  // is what says that, and for every one of these it says `entered` or
  // `computed`.
  const verification = listingVerification(l, opts.account ?? null, now).map((d) => d.record);

  const base = {
    subjectKind: "listing" as const,
    subjectId: l.id,
    assetType: l.asset_type ?? null,
    // A listing figure describes a present state rather than a reporting period,
    // so there is no period to state. `publishability` requires one only of a
    // sourced figure, which is the case where a period is what makes a
    // republished number meaningful.
    period: null,
    geography: opts.geography ?? null,
    asOf,
    // Nothing in the schema records a field-level correction yet. The ADV-1
    // append-only write path is the blocker, and it is recorded as one. An empty
    // history is the honest reading: no correction has been filed, which is not
    // the same as none being possible.
    corrections: [] as const,
    verification,
  };

  const entered = (
    field: ListingEvidenceField,
    value: string,
    unit: UnitKey,
    maxAgeDays: number | null
  ): EvidencePassport => ({
    ...base,
    field,
    value,
    unit,
    tier: "entered",
    statistic: "single" as StatisticKind,
    // The lister's own figure, shown as they filed it. `unit_converted` would be
    // the honest answer if we ever restate a figure filed in another unit; we do
    // not, and claiming a conversion we did not perform is the same class of
    // error as claiming one we did not disclose.
    transformation: "as_published" as Transformation,
    sufficiency: "sufficient",
    maxAgeDays,
  });

  const out: EvidencePassport[] = [];

  const area = num(l.area_sqm);
  if (area !== null) {
    out.push(entered("area_sqm", formatArea(area, lp), "sqm", AREA_MAX_AGE_DAYS));
  }

  if (lease) {
    const rent = num(l.asking_rent_sqm);
    if (rent !== null) {
      out.push(
        entered(
          "asking_rent_sqm",
          formatWithUnit(rent, "sar_sqm_year", lp, "short", 0),
          "sar_sqm_year",
          TERM_MAX_AGE_DAYS
        )
      );
    }
    const service = num(l.service_charge_sqm);
    if (service !== null) {
      out.push(
        entered(
          "service_charge_sqm",
          formatWithUnit(service, "sar_sqm_year", lp, "short", 0),
          "sar_sqm_year",
          TERM_MAX_AGE_DAYS
        )
      );
    }
  } else {
    const sale = num(l.sale_price);
    if (sale !== null) {
      out.push(entered("sale_price", formatMoney(sale, lp), "sar", TERM_MAX_AGE_DAYS));
    }
    // Price per m2 is COMPUTED, never entered, so a lister can never post one
    // that contradicts their own price. The page says the same thing in a
    // comment; here it is the tier, which means a reader can see it.
    //
    // The stored column is preferred when present because it is generated from
    // the same two numbers, and it is still SAT's arithmetic rather than the
    // lister's statement either way. So `computed` and `derived` hold whichever
    // path produced it: a passport that reported the stored column as entered
    // would be crediting the lister with a figure they never filed.
    const stored = num(l.sale_price_sqm);
    const pps = stored !== null ? stored : sale !== null && area !== null && area > 0 ? sale / area : null;
    if (pps !== null) {
      out.push({
        ...base,
        field: "sale_price_sqm",
        value: formatWithUnit(Math.round(pps), "sar_sqm", lp, "short", 0),
        unit: "sar_sqm",
        tier: "computed",
        statistic: "single",
        transformation: "derived",
        sufficiency: "sufficient",
        maxAgeDays: TERM_MAX_AGE_DAYS,
      });
    }
  }

  return out;
}

/**
 * The same set as the objects a public surface may actually render.
 *
 * `rights` is null and is not a parameter. Nothing here is `tier: "sourced"`, so
 * nothing consults the licence ledger, and a listing page that could pass a
 * rights row is a listing page that could pass the wrong one.
 */
export function listingEvidenceViews(
  l: EvidenceListing,
  opts: ListingEvidenceOptions
): PublicEvidenceView[] {
  const now = opts.now ?? Date.now();
  return listingPassports(l, opts).map((p) =>
    publicEvidenceView(p, { pageKind: "listing", rights: null, now })
  );
}

/**
 * Keyed by field, for a page that renders a figure and its evidence in one
 * place. A tile asks for its own field and gets nothing if the row does not hold
 * it, which is the same answer the tile itself gives.
 */
export function listingEvidenceByField(
  l: EvidenceListing,
  opts: ListingEvidenceOptions
): Map<string, PublicEvidenceView> {
  return new Map(listingEvidenceViews(l, opts).map((v) => [v.field, v]));
}
