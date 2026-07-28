import {
  type VerificationDimension,
  type VerificationRecord,
  type VerificationState,
  verificationDimensionLabel as dimensionLabel,
  verificationStateLabel as stateLabel,
  verificationStateOf,
  verifiedDimensions,
} from "@/lib/evidence";
import { type GateFields, permitOf } from "@/lib/gate";

// ADV-1. What a listing's verification actually says, dimension by dimension.
//
// This is the second half of register findings 3 and 24 and of owner decision
// O3. `evidence.ts` gave the platform a vocabulary for verification; this turns
// one listing row into that vocabulary, so a surface can name the gate a state
// rests on instead of collapsing four different questions into one green tick.
//
// WHAT THE RECORD ACTUALLY SAYS, MEASURED 2026-07-28 ON THE 88 PUBLISHED ROWS.
//
//   every row            is_demo = true
//   ownership_verified   true on all 88
//   authorization_verified true on all 88
//   verification_method  'seed' on 50, null on 38, and nothing else
//   verified_at          set on exactly the 50 whose method is 'seed'
//   verified_by          null on all 88, so no actor ever countersigned
//   ad_permit_number     null on all 88
//   lister_type          owner_direct 82, broker_authorized 6
//
// Read together those columns do not describe a checked corpus. They describe a
// fixture loader that set two booleans and stamped its own name in the method
// column. Yet every card, every gallery and the product detail page drew
// "Verified owner" off `ownership_verified` alone, including on the six
// broker_authorized rows, where the badge named a party who did not file the
// listing. That is finding 24, and it is measurable: 4 rows claim
// broker_authorized while the filing account is an owner, 4 claim owner_direct
// while the filing account is SAT, 1 claims broker_authorized from SAT.
//
// FOUR INDEPENDENT REASONS, EACH SUFFICIENT ON ITS OWN.
//
// The module is built so that no single column can carry a badge. A dimension
// reaches `verified` only if all four hold, and today every published listing
// fails at least three of them:
//
//   1. the record is not a fixture              (is_demo)
//   2. the method names a real check            ('seed' is the loader, not a check)
//   3. there is a date of check                 (verificationStateOf enforces this)
//   4. an actor countersigned it                (verified_by)
//
// This is the same shape as `sourceRights.ts`, which has three independent
// fail-closed points for the same reason: a correction that depends on one flag
// is one migration away from being undone by accident.
//
// RELATIONSHIP TO gate.ts. `gate.ts` stays the truth source and `ownerVerified`
// stays its narrowest claim. Everything here is narrower still, never broader:
// a dimension that resolves to verified here implies the gate boolean was true,
// and the converse is deliberately false. `listingVerification.test.ts` asserts
// that direction over the real column combinations, so the two cannot drift
// apart silently.
//
// No em dashes (Law 2). Western numerals in both locales (Law 4). The green
// reservation (D24) is bidirectional: nothing here returns a verified state
// that a surface may paint green unless the record earned it, and nothing that
// did earn it is painted any other colour.

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/**
 * How the filer says they relate to the asset. These are the listing's own
 * values, which are NOT the same vocabulary as `accounts.type`. Keeping the two
 * apart is the whole of finding 24: they disagree on 9 of the 88 published rows,
 * and a badge that reads one while naming the other is wrong on every one.
 */
export type ListerRelation = "owner_direct" | "broker_authorized" | "unknown";

/** `accounts.type`, as exposed publicly by the `listers_public` view. */
export type AccountType = "owner" | "broker" | "sat" | "investor" | "occupier" | "unknown";

export function normalizeListerRelation(v: unknown): ListerRelation {
  return v === "owner_direct" || v === "broker_authorized" ? v : "unknown";
}

export function normalizeAccountType(v: unknown): AccountType {
  return v === "owner" || v === "broker" || v === "sat" || v === "investor" || v === "occupier"
    ? v
    : "unknown";
}

/**
 * The columns this module reads. A superset of `GateFields`, because the gate
 * asks whether a listing may publish and this asks what its record supports
 * saying, which are different questions with an overlapping input set.
 */
export type VerifiableListing = GateFields & {
  is_demo?: boolean | null;
  verified_at?: string | null;
  verified_by?: string | null;
  verification_method?: string | null;
  lister_type?: string | null;
};

/** The account that filed it, when the surface has loaded one. */
export type FilingAccount = {
  type?: string | null;
  verification_status?: string | null;
  is_demo?: boolean | null;
};

// ---------------------------------------------------------------------------
// Methods
// ---------------------------------------------------------------------------

/**
 * The methods that describe a check against something outside this database.
 *
 * `seed` is deliberately absent. It is a real member of the
 * `verification_method` enum and it is the value on 50 of the 88 published
 * rows, but it names the fixture loader, not an act of verification. Treating
 * it as a check is precisely how a demo corpus came to render as a verified one.
 */
export const CHECK_METHODS: readonly string[] = ["nafath", "manual_review", "rega_match", "ejar_match"];

export function isCheckMethod(v: unknown): boolean {
  return typeof v === "string" && CHECK_METHODS.includes(v);
}

// ---------------------------------------------------------------------------
// Why something is not verified
// ---------------------------------------------------------------------------

/**
 * Not decoration. A surface that cannot say why a dimension is unverified ends
 * up saying nothing, and saying nothing is how the reader fills the gap with an
 * assumption. Every reason here is a fact about the row.
 */
export type NotVerifiedReason =
  | "demo_record"
  | "seed_method"
  | "no_check_method"
  | "no_check_date"
  | "no_checking_actor"
  | "flag_not_set"
  | "relation_contradicted"
  | "permit_missing"
  | "permit_expired";

const REASON_TEXT: Record<NotVerifiedReason, [string, string]> = {
  demo_record: ["Sample record, not a checked one", "سجل تجريبي، لم يخضع للفحص"],
  seed_method: ["Loaded as sample data, not checked", "أُدرج كبيانات تجريبية دون فحص"],
  no_check_method: ["No check method recorded", "لا توجد طريقة فحص مسجّلة"],
  no_check_date: ["No date of check recorded", "لا يوجد تاريخ فحص مسجّل"],
  no_checking_actor: ["No reviewer recorded", "لا يوجد مراجع مسجّل"],
  flag_not_set: ["Not recorded as checked", "غير مسجّل كمفحوص"],
  relation_contradicted: [
    "The filer's stated relation to the asset does not match their account",
    "صفة مُقدّم الإعلان تجاه الأصل لا تطابق نوع حسابه",
  ],
  permit_missing: ["No advertising permit on file", "لا يوجد تصريح إعلان مسجّل"],
  permit_expired: ["The advertising permit has expired", "انتهى تصريح الإعلان"],
};

export function notVerifiedReasonText(r: NotVerifiedReason, ar: boolean): string {
  return REASON_TEXT[r][ar ? 1 : 0];
}

// ---------------------------------------------------------------------------
// Relation consistency (finding 24)
// ---------------------------------------------------------------------------

export type RelationConsistency = "consistent" | "contradicted" | "unknown";

/**
 * Whether the listing's stated relation and the filing account's type can both
 * be true.
 *
 * A SAT account filing as `broker_authorized` is consistent: SAT Real Estate is
 * a licensed brokerage and `listers_public` already maps its type to broker.
 * A SAT account filing as `owner_direct` is not, by that same mapping. An owner
 * account filing as `broker_authorized` is not either, in the other direction.
 *
 * Unknown on either side returns `unknown` rather than a guess. An unknown
 * relation is not a consistent one, and it is not a contradiction either.
 */
export function relationConsistency(
  relation: ListerRelation,
  account: AccountType
): RelationConsistency {
  if (relation === "unknown" || account === "unknown") return "unknown";
  if (relation === "owner_direct") return account === "owner" ? "consistent" : "contradicted";
  // broker_authorized
  return account === "broker" || account === "sat" ? "consistent" : "contradicted";
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

export type DimensionResult = {
  dimension: VerificationDimension;
  /** Resolved through `verificationStateOf`, never the stored value. */
  state: VerificationState;
  /** Empty when the state is verified or not_applicable. */
  reasons: NotVerifiedReason[];
  record: VerificationRecord;
};

/** The dimensions a listing row can speak to at all. */
export const LISTING_DIMENSIONS: readonly VerificationDimension[] = [
  "ownership",
  "authorization",
  "right_to_market",
  "ad_permit",
];

type Built = { state: VerificationState; reasons: NotVerifiedReason[] };

/**
 * The shared demotion chain. A dimension whose flag is set still has to survive
 * every one of these, and each of them is a separate observable fact about the
 * row rather than a restatement of the last.
 */
function chainFor(l: VerifiableListing, flag: boolean | null | undefined): Built {
  const reasons: NotVerifiedReason[] = [];
  if (flag !== true) reasons.push("flag_not_set");
  if (l.is_demo === true) reasons.push("demo_record");
  if (l.verification_method === "seed") reasons.push("seed_method");
  else if (!isCheckMethod(l.verification_method)) reasons.push("no_check_method");
  if (!l.verified_at) reasons.push("no_check_date");
  if (!l.verified_by) reasons.push("no_checking_actor");
  return { state: reasons.length === 0 ? "verified" : "not_verified", reasons };
}

function result(
  dimension: VerificationDimension,
  built: Built,
  l: VerifiableListing
): DimensionResult {
  const record: VerificationRecord = {
    dimension,
    state: built.state,
    checkedAt: l.verified_at ?? null,
    method: l.verification_method ?? null,
    actorRole: l.verified_by ? "sat_reviewer" : null,
    // A question that does not apply is not a check, so it is not a demo check
    // either. Marking it demo would send it through the demotion below and turn
    // "there is no third party here" into "this was not verified", which is a
    // different and untrue statement about the row.
    isDemo: built.state === "not_applicable" ? false : l.is_demo === true,
  };
  // Resolved rather than trusted, so the evidence module gets the last word even
  // if this one is ever changed carelessly.
  const state = verificationStateOf(record);
  return {
    dimension,
    state,
    reasons: state === "verified" || state === "not_applicable" ? [] : built.reasons,
    record,
  };
}

/**
 * Every dimension a listing row speaks to, resolved.
 *
 * `now` is passed in rather than read, so permit expiry is testable and so this
 * module stays free of a clock it does not control.
 */
export function listingVerification(
  l: VerifiableListing,
  account?: FilingAccount | null,
  now: number = Date.now()
): DimensionResult[] {
  const relation = normalizeListerRelation(l.lister_type);
  const consistency = relationConsistency(relation, normalizeAccountType(account?.type));

  // Ownership. The claim the old badge made everywhere. It also fails whenever
  // the filer's stated relation contradicts their account, because in that case
  // the row does not agree with itself about whose ownership was checked.
  const own = chainFor(l, l.ownership_verified);
  if (consistency === "contradicted" && !own.reasons.includes("relation_contradicted")) {
    own.reasons.push("relation_contradicted");
    own.state = "not_verified";
  }

  // Authorization to market. An owner listing their own asset has no third
  // party to be authorised by, so this is not applicable rather than unmet.
  // "Not applicable" is an honest answer and `evidence.ts` preserves it.
  const authApplies = relation !== "owner_direct";
  const auth: Built = authApplies
    ? chainFor(l, l.authorization_verified)
    : { state: "not_applicable", reasons: [] };

  // Right to market. Confirmed by the filer, which is a declaration and not a
  // check, so it needs the same reviewer and method that everything else does
  // before it may be shown as verified.
  const rtm = chainFor(l, l.right_to_market_confirmed);

  // Advertising permit. Its own two failures, independent of everything above:
  // a permit either exists or it does not, and it either has run out or it has not.
  const permit = permitOf(l);
  const permitBuilt: Built = (() => {
    if (!permit) return { state: "not_verified", reasons: ["permit_missing"] };
    const exp = l.ad_permit_expires_at ? Date.parse(l.ad_permit_expires_at) : NaN;
    if (Number.isFinite(exp) && exp <= now) {
      return { state: "expired", reasons: ["permit_expired"] };
    }
    return chainFor(l, true);
  })();

  return [
    result("ownership", own, l),
    result("authorization", auth, l),
    result("right_to_market", rtm, l),
    result("ad_permit", permitBuilt, l),
  ];
}

/** Only the dimensions that genuinely resolved to verified, in listing order. */
export function listingVerifiedDimensions(
  l: VerifiableListing,
  account?: FilingAccount | null,
  now: number = Date.now()
): VerificationDimension[] {
  return verifiedDimensions(listingVerification(l, account, now).map((d) => d.record));
}

/**
 * The one question a badge is allowed to ask. False today for every published
 * listing, which is the correct and intended outcome of owner ruling 3.
 */
export function listingHasVerifiedDimension(
  l: VerifiableListing,
  account?: FilingAccount | null,
  now: number = Date.now()
): boolean {
  return listingVerifiedDimensions(l, account, now).length > 0;
}

/** The resolved state of one named dimension. */
export function listingDimensionState(
  l: VerifiableListing,
  dimension: VerificationDimension,
  account?: FilingAccount | null,
  now: number = Date.now()
): VerificationState {
  return (
    listingVerification(l, account, now).find((d) => d.dimension === dimension)?.state ?? "unknown"
  );
}

// ---------------------------------------------------------------------------
// Identity of the filer
// ---------------------------------------------------------------------------

/**
 * The lister's own identity check, which is a different question again from
 * anything about the asset. `account_verifications` holds zero rows, so no
 * account on the platform has a document behind its status. The status column
 * alone therefore cannot carry a badge, and a demo account cannot either.
 */
export function listerIdentityRecord(account: FilingAccount | null | undefined): VerificationRecord {
  return {
    dimension: "identity",
    state: account?.verification_status === "verified" ? "verified" : "not_verified",
    // No account holds a checked date, because account_verifications is empty.
    checkedAt: null,
    method: null,
    actorRole: null,
    isDemo: account?.is_demo === true,
  };
}

export function listerIdentityVerified(account: FilingAccount | null | undefined): boolean {
  return verificationStateOf(listerIdentityRecord(account)) === "verified";
}

export function listerIdentityReasons(
  account: FilingAccount | null | undefined
): NotVerifiedReason[] {
  if (listerIdentityVerified(account)) return [];
  const reasons: NotVerifiedReason[] = [];
  if (account?.verification_status !== "verified") reasons.push("flag_not_set");
  if (account?.is_demo === true) reasons.push("demo_record");
  reasons.push("no_check_date", "no_check_method");
  return reasons;
}

/**
 * The account that filed a listing, as this module needs to see it.
 *
 * `listers_public` rewrites SAT's own account type to `broker` so the public
 * byline reads sensibly, and exposes the real answer only through `is_operator`.
 * Reading `lister_type` alone would therefore tell the finding 24 contradiction
 * check that our own inventory was filed by a third-party broker, which is the one
 * thing it is not. `is_verified` is carried across as a STATUS, never as a check:
 * it is `accounts.verification_status`, and the resolver above is what decides
 * that a status with no document behind it earns nothing.
 */
export function filingAccountOf(
  l:
    | {
        lister_type?: string | null;
        is_operator?: boolean | null;
        is_verified?: boolean | null;
        is_demo?: boolean | null;
      }
    | null
    | undefined
): FilingAccount | null {
  if (!l) return null;
  return {
    type: l.is_operator ? "sat" : l.lister_type ?? null,
    verification_status: l.is_verified ? "verified" : "unverified",
    is_demo: l.is_demo ?? null,
  };
}

// ---------------------------------------------------------------------------
// What a surface says when nothing is verified
// ---------------------------------------------------------------------------

/**
 * The sentence a listing surface shows in place of a badge.
 *
 * Not an apology and not a warning. The reader is owed the state of the record,
 * and the state of the record is that the checks have not run yet. The wording
 * matches the standard already published on /about, so the two cannot drift.
 */
export function unverifiedNoticeText(ar: boolean): string {
  return ar
    ? "لم تُجرَ فحوصات التوثيق على هذا السجل بعد."
    : "The verification checks have not been run on this record yet.";
}

/** The heading over the dimension list on a listing page. */
export function verificationHeadingText(ar: boolean): string {
  return ar ? "حالة التوثيق" : "Verification status";
}

const BADGE_TEXT: Partial<Record<VerificationDimension, [string, string]>> = {
  ownership: ["Ownership verified", "الملكية موثّقة"],
  authorization: ["Authorisation verified", "التفويض موثّق"],
  right_to_market: ["Right to market verified", "حق التسويق موثّق"],
  ad_permit: ["Advertising permit verified", "تصريح الإعلان موثّق"],
  identity: ["Identity verified", "الهوية موثّقة"],
};

/**
 * What a badge says when a dimension has genuinely earned one.
 *
 * Each names its own gate. The bare word "Verified" is deliberately not
 * available here: it is the claim that stood in for all four and is what owner
 * decision O3 removes. A dimension with no phrasing of its own falls back to
 * its label plus the resolved state, which still names the gate.
 */
export function verifiedBadgeText(d: VerificationDimension, ar: boolean): string {
  const t = BADGE_TEXT[d];
  return t ? t[ar ? 1 : 0] : `${dimensionLabel(d, ar)}: ${stateLabel("verified", ar)}`;
}

/**
 * Every badge a listing has earned, already worded.
 *
 * Strings rather than nodes, because the surfaces that need this include a
 * client component, a print flyer and an owner dashboard, and none of them
 * should be reaching into the resolver to decide for itself what counts. The
 * server hands the finished list down; an empty list means no badge, which is
 * the answer on every published row today.
 */
export function verifiedBadgeTexts(
  l: VerifiableListing,
  account: FilingAccount | null | undefined,
  ar: boolean,
  now: number = Date.now()
): string[] {
  return listingVerifiedDimensions(l, account ?? null, now).map((d) => verifiedBadgeText(d, ar));
}
