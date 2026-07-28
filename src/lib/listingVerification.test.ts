import assert from "node:assert/strict";
import { test } from "node:test";

import { ownerVerified, type GateFields } from "@/lib/gate";
import { type VerificationDimension } from "@/lib/evidence";
import {
  LISTING_DIMENSIONS,
  isCheckMethod,
  listerIdentityReasons,
  listerIdentityRecord,
  listerIdentityVerified,
  listingDimensionState,
  listingHasVerifiedDimension,
  listingVerifiedDimensions,
  listingVerification,
  normalizeAccountType,
  normalizeListerRelation,
  notVerifiedReasonText,
  relationConsistency,
  unverifiedNoticeText,
  type AccountType,
  type FilingAccount,
  type ListerRelation,
  type NotVerifiedReason,
  type VerifiableListing,
} from "@/lib/listingVerification";

// A fixed clock. Permit expiry is the only time-dependent branch here, and a
// test that reads the wall clock is a test that fails on a Tuesday.
const NOW = Date.parse("2026-07-28T12:00:00Z");
const PAST = "2026-01-01T00:00:00Z";
const FUTURE = "2027-01-01T00:00:00Z";

/**
 * A listing that passes every check, so each test can break exactly one thing
 * and know that the thing it broke is the thing that mattered.
 *
 * No such row exists in the database today. That is the point: the fixture has
 * to be constructed deliberately, which is a smaller version of the work a real
 * verification would be.
 */
function good(over: Partial<VerifiableListing> = {}): VerifiableListing {
  return {
    is_demo: false,
    verification_method: "nafath",
    verified_at: PAST,
    verified_by: "reviewer-1",
    ownership_verified: true,
    authorization_verified: true,
    right_to_market_confirmed: true,
    ad_permit_number: "AD-1200025510-001",
    ad_permit_expires_at: FUTURE,
    lister_type: "broker_authorized",
    ...over,
  };
}

/** The account behind `good`, consistent with its stated relation. */
function brokerAccount(over: Partial<FilingAccount> = {}): FilingAccount {
  return { type: "broker", verification_status: "verified", is_demo: false, ...over };
}

/**
 * The corpus as it actually stands. 50 of the 88 published rows look like this:
 * two booleans set by a fixture loader, a method naming that loader, a date it
 * stamped itself, no reviewer and no permit.
 */
function seededRow(over: Partial<VerifiableListing> = {}): VerifiableListing {
  return {
    is_demo: true,
    verification_method: "seed",
    verified_at: "2026-06-01T00:00:00Z",
    verified_by: null,
    ownership_verified: true,
    authorization_verified: true,
    right_to_market_confirmed: true,
    ad_permit_number: null,
    ad_permit_expires_at: null,
    lister_type: "owner_direct",
    ...over,
  };
}

function ownerAccount(over: Partial<FilingAccount> = {}): FilingAccount {
  return { type: "owner", verification_status: "verified", is_demo: true, ...over };
}

function stateOf(
  l: VerifiableListing,
  d: VerificationDimension,
  account?: FilingAccount | null
): string {
  return listingDimensionState(l, d, account ?? null, NOW);
}

function reasonsFor(
  l: VerifiableListing,
  d: VerificationDimension,
  account?: FilingAccount | null
): NotVerifiedReason[] {
  const found = listingVerification(l, account ?? null, NOW).find((r) => r.dimension === d);
  assert.ok(found, `no result for ${d}`);
  return found.reasons;
}

// ---------------------------------------------------------------------------
// Vocabularies
// ---------------------------------------------------------------------------

test("a relation the build does not recognise is unknown, not the commoner of the two", () => {
  assert.equal(normalizeListerRelation("owner_direct"), "owner_direct");
  assert.equal(normalizeListerRelation("broker_authorized"), "broker_authorized");
  for (const v of ["owner", "broker", "OWNER_DIRECT", "", null, undefined, 3, {}]) {
    assert.equal(normalizeListerRelation(v), "unknown", `coerced ${String(v)}`);
  }
});

test("an account type the build does not recognise is unknown", () => {
  for (const v of ["owner", "broker", "sat", "investor", "occupier"] as const) {
    assert.equal(normalizeAccountType(v), v);
  }
  for (const v of ["landlord", "agent", "", null, undefined, 0]) {
    assert.equal(normalizeAccountType(v), "unknown", `coerced ${String(v)}`);
  }
});

test("the two vocabularies are separate: a listing relation is never an account type", () => {
  // Finding 24 exists because these two columns look interchangeable and are not.
  assert.equal(normalizeAccountType("owner_direct"), "unknown");
  assert.equal(normalizeListerRelation("broker"), "unknown");
});

test("seed is not a check method, however real an enum member it is", () => {
  for (const m of ["nafath", "manual_review", "rega_match", "ejar_match"]) {
    assert.equal(isCheckMethod(m), true, m);
  }
  assert.equal(isCheckMethod("seed"), false);
  assert.equal(isCheckMethod(null), false);
  assert.equal(isCheckMethod(undefined), false);
  assert.equal(isCheckMethod(""), false);
});

// ---------------------------------------------------------------------------
// The four independent demotions
// ---------------------------------------------------------------------------

test("a fully checked row verifies, so the demotions below mean something", () => {
  assert.equal(stateOf(good(), "ownership", brokerAccount()), "verified");
  assert.equal(stateOf(good(), "authorization", brokerAccount()), "verified");
  assert.equal(stateOf(good(), "right_to_market", brokerAccount()), "verified");
  assert.equal(stateOf(good(), "ad_permit", brokerAccount()), "verified");
  assert.equal(listingHasVerifiedDimension(good(), brokerAccount(), NOW), true);
});

test("a demo record is never verified, whatever else the row says", () => {
  const l = good({ is_demo: true });
  assert.equal(stateOf(l, "ownership", brokerAccount()), "not_verified");
  assert.deepEqual(reasonsFor(l, "ownership", brokerAccount()), ["demo_record"]);
  assert.equal(listingHasVerifiedDimension(l, brokerAccount(), NOW), false);
});

test("the fixture loader naming itself in the method column is not a check", () => {
  const l = good({ verification_method: "seed" });
  assert.equal(stateOf(l, "ownership", brokerAccount()), "not_verified");
  assert.deepEqual(reasonsFor(l, "ownership", brokerAccount()), ["seed_method"]);
});

test("a method the build does not recognise is not a check either", () => {
  for (const m of [null, undefined, "", "checked", "manual"]) {
    const l = good({ verification_method: m as string | null });
    assert.deepEqual(
      reasonsFor(l, "ownership", brokerAccount()),
      ["no_check_method"],
      `method ${String(m)}`
    );
  }
});

test("a check with no date of check is not a check", () => {
  const l = good({ verified_at: null });
  assert.equal(stateOf(l, "ownership", brokerAccount()), "not_verified");
  assert.deepEqual(reasonsFor(l, "ownership", brokerAccount()), ["no_check_date"]);
});

test("nobody countersigned it, so nobody checked it", () => {
  const l = good({ verified_by: null });
  assert.equal(stateOf(l, "ownership", brokerAccount()), "not_verified");
  assert.deepEqual(reasonsFor(l, "ownership", brokerAccount()), ["no_checking_actor"]);
});

test("the flag alone carries nothing, which is the whole correction", () => {
  const l = good({ ownership_verified: null });
  assert.equal(stateOf(l, "ownership", brokerAccount()), "not_verified");
  assert.deepEqual(reasonsFor(l, "ownership", brokerAccount()), ["flag_not_set"]);
});

test("each demotion stands alone: removing all of them at once lists all of them", () => {
  const l = good({
    is_demo: true,
    verification_method: "seed",
    verified_at: null,
    verified_by: null,
    ownership_verified: false,
  });
  assert.deepEqual(reasonsFor(l, "ownership", brokerAccount()), [
    "flag_not_set",
    "demo_record",
    "seed_method",
    "no_check_date",
    "no_checking_actor",
  ]);
});

// ---------------------------------------------------------------------------
// The corpus as it stands
// ---------------------------------------------------------------------------

test("no published listing in the current corpus has a verified dimension", () => {
  // The 50 rows with method 'seed' and the 38 with no method at all.
  const seeded = seededRow();
  const bare = seededRow({ verification_method: null, verified_at: null });
  for (const l of [seeded, bare]) {
    assert.deepEqual(listingVerifiedDimensions(l, ownerAccount(), NOW), []);
    assert.equal(listingHasVerifiedDimension(l, ownerAccount(), NOW), false);
  }
});

test("a seeded row says why, and says it in terms of the record rather than of a policy", () => {
  assert.deepEqual(reasonsFor(seededRow(), "ownership", ownerAccount()), [
    "demo_record",
    "seed_method",
    "no_checking_actor",
  ]);
});

test("the rows with no method at all are missing a date as well", () => {
  const bare = seededRow({ verification_method: null, verified_at: null });
  assert.deepEqual(reasonsFor(bare, "ownership", ownerAccount()), [
    "demo_record",
    "no_check_method",
    "no_check_date",
    "no_checking_actor",
  ]);
});

test("not one published row holds an advertising permit, so the permit dimension says so", () => {
  assert.equal(stateOf(seededRow(), "ad_permit", ownerAccount()), "not_verified");
  assert.deepEqual(reasonsFor(seededRow(), "ad_permit", ownerAccount()), ["permit_missing"]);
});

// ---------------------------------------------------------------------------
// Finding 24: the relation and the account
// ---------------------------------------------------------------------------

test("relation consistency over every combination the database can produce", () => {
  const cases: Array<[ListerRelation, AccountType, string]> = [
    ["owner_direct", "owner", "consistent"],
    ["owner_direct", "broker", "contradicted"],
    ["owner_direct", "sat", "contradicted"],
    ["owner_direct", "investor", "contradicted"],
    ["owner_direct", "occupier", "contradicted"],
    ["broker_authorized", "broker", "consistent"],
    ["broker_authorized", "sat", "consistent"],
    ["broker_authorized", "owner", "contradicted"],
    ["broker_authorized", "investor", "contradicted"],
    ["broker_authorized", "occupier", "contradicted"],
    ["unknown", "owner", "unknown"],
    ["owner_direct", "unknown", "unknown"],
    ["unknown", "unknown", "unknown"],
  ];
  for (const [relation, account, expected] of cases) {
    assert.equal(
      relationConsistency(relation, account),
      expected,
      `${relation} filed by ${account}`
    );
  }
});

test("SAT filing as a broker is consistent, because the public view maps it to broker", () => {
  assert.equal(relationConsistency("broker_authorized", "sat"), "consistent");
  assert.equal(relationConsistency("owner_direct", "sat"), "contradicted");
});

test("an unknown relation is not a consistent one and is not a contradiction", () => {
  assert.equal(relationConsistency("unknown", "broker"), "unknown");
  // Which means it does not add a contradiction reason to an otherwise good row.
  const l = good({ lister_type: "landlord" });
  assert.equal(reasonsFor(l, "ownership", brokerAccount()).includes("relation_contradicted"), false);
});

test("a row that disagrees with itself about who filed it cannot verify ownership", () => {
  // 4 published rows claim broker_authorized from an owner account.
  const a = good({ lister_type: "broker_authorized" });
  assert.equal(stateOf(a, "ownership", { type: "owner" }), "not_verified");
  assert.deepEqual(reasonsFor(a, "ownership", { type: "owner" }), ["relation_contradicted"]);

  // 4 more claim owner_direct from the SAT account.
  const b = good({ lister_type: "owner_direct" });
  assert.equal(stateOf(b, "ownership", { type: "sat" }), "not_verified");
  assert.deepEqual(reasonsFor(b, "ownership", { type: "sat" }), ["relation_contradicted"]);
});

test("with no account loaded a surface cannot invent a contradiction", () => {
  assert.equal(stateOf(good(), "ownership", null), "verified");
  assert.equal(stateOf(good(), "ownership", undefined), "verified");
});

// ---------------------------------------------------------------------------
// Authorization: not applicable is an answer
// ---------------------------------------------------------------------------

test("an owner listing their own asset has nobody to be authorised by", () => {
  const l = good({ lister_type: "owner_direct" });
  assert.equal(stateOf(l, "authorization", ownerAccount({ is_demo: false })), "not_applicable");
  assert.deepEqual(reasonsFor(l, "authorization", ownerAccount({ is_demo: false })), []);
});

test("not applicable survives a demo record, because it is not a claim of a check", () => {
  // The alternative reads as "this was not verified", which is a different and
  // untrue statement about a row where the question does not arise.
  assert.equal(stateOf(seededRow(), "authorization", ownerAccount()), "not_applicable");
  assert.deepEqual(reasonsFor(seededRow(), "authorization", ownerAccount()), []);
});

test("a broker filing for someone else does have to show the authorisation", () => {
  const l = seededRow({ lister_type: "broker_authorized" });
  assert.equal(stateOf(l, "authorization", brokerAccount({ is_demo: true })), "not_verified");
  assert.ok(reasonsFor(l, "authorization", brokerAccount({ is_demo: true })).length > 0);
});

test("a declared right to market is a declaration, so it needs the same check as anything else", () => {
  const l = seededRow();
  assert.equal(l.right_to_market_confirmed, true);
  assert.equal(stateOf(l, "right_to_market", ownerAccount()), "not_verified");
});

// ---------------------------------------------------------------------------
// The advertising permit
// ---------------------------------------------------------------------------

test("a missing permit and an expired one are different facts", () => {
  const missing = good({ ad_permit_number: null, ad_permit_no: null });
  assert.equal(stateOf(missing, "ad_permit", brokerAccount()), "not_verified");
  assert.deepEqual(reasonsFor(missing, "ad_permit", brokerAccount()), ["permit_missing"]);

  const expired = good({ ad_permit_expires_at: PAST });
  assert.equal(stateOf(expired, "ad_permit", brokerAccount()), "expired");
  assert.deepEqual(reasonsFor(expired, "ad_permit", brokerAccount()), ["permit_expired"]);
});

test("the legacy permit column still counts as a permit on file", () => {
  const l = good({ ad_permit_number: null, ad_permit_no: "AD-OLD-1" });
  assert.equal(stateOf(l, "ad_permit", brokerAccount()), "verified");
});

test("a permit with no stated expiry has not expired", () => {
  const l = good({ ad_permit_expires_at: null });
  assert.equal(stateOf(l, "ad_permit", brokerAccount()), "verified");
});

test("expiry is measured against the clock passed in, not the wall clock", () => {
  const l = good({ ad_permit_expires_at: "2026-08-01T00:00:00Z" });
  assert.equal(listingDimensionState(l, "ad_permit", brokerAccount(), NOW), "verified");
  assert.equal(
    listingDimensionState(l, "ad_permit", brokerAccount(), Date.parse("2026-09-01T00:00:00Z")),
    "expired"
  );
});

test("the permit dimension still passes through the demotion chain", () => {
  // A permit number on a fixture row does not make the fixture real.
  const l = good({ is_demo: true });
  assert.equal(stateOf(l, "ad_permit", brokerAccount()), "not_verified");
});

// ---------------------------------------------------------------------------
// The invariant against gate.ts
// ---------------------------------------------------------------------------

test("a verified dimension implies the gate boolean, and never the converse", () => {
  const flags: Array<boolean | null> = [true, false, null];
  const methods: Array<string | null> = ["nafath", "seed", null];
  const demos = [true, false];
  const dates: Array<string | null> = [PAST, null];
  const actors: Array<string | null> = ["reviewer-1", null];

  let sawGateTrueWithoutVerified = false;
  for (const ownership of flags) {
    for (const method of methods) {
      for (const is_demo of demos) {
        for (const verified_at of dates) {
          for (const verified_by of actors) {
            const l = good({
              ownership_verified: ownership,
              verification_method: method,
              is_demo,
              verified_at,
              verified_by,
            });
            const verified = stateOf(l, "ownership", brokerAccount()) === "verified";
            if (verified) {
              assert.equal(
                ownerVerified(l as GateFields),
                true,
                "a verified ownership dimension must imply ownerVerified"
              );
            }
            if (ownerVerified(l as GateFields) && !verified) sawGateTrueWithoutVerified = true;
          }
        }
      }
    }
  }
  // The converse failing is the correction, not an accident of the fixture set.
  assert.equal(sawGateTrueWithoutVerified, true);
});

test("gate.ts stays the truth source: this module never sets a flag it only reads", () => {
  const l = seededRow();
  assert.equal(ownerVerified(l as GateFields), true);
  assert.equal(listingHasVerifiedDimension(l, ownerAccount(), NOW), false);
});

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------

test("a listing speaks to four dimensions, always in the same order", () => {
  assert.deepEqual(LISTING_DIMENSIONS, [
    "ownership",
    "authorization",
    "right_to_market",
    "ad_permit",
  ]);
  assert.deepEqual(
    listingVerification(good(), brokerAccount(), NOW).map((r) => r.dimension),
    LISTING_DIMENSIONS
  );
});

test("a dimension a listing cannot speak to is unknown, not unverified", () => {
  // A deed check is a real dimension of the vocabulary and no listing row holds
  // one, so asking for it returns unknown rather than an implied failure.
  assert.equal(listingDimensionState(good(), "deed", brokerAccount(), NOW), "unknown");
  assert.equal(listingDimensionState(good(), "identity", brokerAccount(), NOW), "unknown");
});

test("every result carries the record it was resolved from", () => {
  for (const r of listingVerification(seededRow(), ownerAccount(), NOW)) {
    assert.equal(r.record.dimension, r.dimension);
    assert.equal(typeof r.record.isDemo, "boolean");
  }
});

test("a verified or not applicable dimension carries no reasons", () => {
  for (const r of listingVerification(good({ lister_type: "owner_direct" }), null, NOW)) {
    if (r.state === "verified" || r.state === "not_applicable") {
      assert.deepEqual(r.reasons, [], r.dimension);
    } else {
      assert.ok(r.reasons.length > 0, `${r.dimension} is unverified with no stated reason`);
    }
  }
});

// ---------------------------------------------------------------------------
// The filer's own identity
// ---------------------------------------------------------------------------

test("no account is identity verified, because account_verifications holds no rows", () => {
  assert.equal(listerIdentityVerified(ownerAccount()), false);
  assert.equal(listerIdentityVerified({ type: "broker", verification_status: "verified" }), false);
  assert.equal(listerIdentityVerified(null), false);
  assert.equal(listerIdentityVerified(undefined), false);
});

test("a verified status with no document behind it is a status, not a verification", () => {
  const r = listerIdentityRecord({ verification_status: "verified", is_demo: false });
  assert.equal(r.state, "verified");
  assert.equal(r.checkedAt, null);
  // Stored as verified, resolved as not verified, which is the point of resolving.
  assert.equal(listerIdentityVerified({ verification_status: "verified", is_demo: false }), false);
});

test("the identity dimension says why, including that it is a demo account", () => {
  assert.deepEqual(listerIdentityReasons(ownerAccount()), [
    "demo_record",
    "no_check_date",
    "no_check_method",
  ]);
  assert.deepEqual(listerIdentityReasons({ type: "occupier", verification_status: "unverified" }), [
    "flag_not_set",
    "no_check_date",
    "no_check_method",
  ]);
});

test("the identity record names the identity dimension and nothing else", () => {
  assert.equal(listerIdentityRecord(ownerAccount()).dimension, "identity");
});

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

const ALL_REASONS: NotVerifiedReason[] = [
  "demo_record",
  "seed_method",
  "no_check_method",
  "no_check_date",
  "no_checking_actor",
  "flag_not_set",
  "relation_contradicted",
  "permit_missing",
  "permit_expired",
];

test("every reason reads in both locales and the two are not the same string", () => {
  for (const r of ALL_REASONS) {
    const en = notVerifiedReasonText(r, false);
    const ar = notVerifiedReasonText(r, true);
    assert.ok(en.length > 0, r);
    assert.ok(ar.length > 0, r);
    assert.notEqual(en, ar, r);
  }
});

test("the notice in place of a badge exists in both locales", () => {
  assert.ok(unverifiedNoticeText(false).length > 0);
  assert.ok(unverifiedNoticeText(true).length > 0);
  assert.notEqual(unverifiedNoticeText(false), unverifiedNoticeText(true));
});

test("missing and expired stay distinguishable in Arabic as well as English", () => {
  assert.notEqual(
    notVerifiedReasonText("permit_missing", true),
    notVerifiedReasonText("permit_expired", true)
  );
  assert.notEqual(
    notVerifiedReasonText("no_check_method", true),
    notVerifiedReasonText("no_check_date", true)
  );
});

test("no copy in this module carries an em dash or an Arabic-Indic numeral", () => {
  const all = [
    ...ALL_REASONS.flatMap((r) => [notVerifiedReasonText(r, false), notVerifiedReasonText(r, true)]),
    unverifiedNoticeText(false),
    unverifiedNoticeText(true),
  ];
  // Written as escapes on purpose: ar-lint scans this file too, so a test that
  // searches for a banned character must not contain one.
  for (const s of all) {
    assert.doesNotMatch(s, /[\u2014\u2013]/, `dash in ${s}`);
    assert.doesNotMatch(s, /[\u0660-\u0669]/, `Arabic-Indic numeral in ${s}`);
  }
});
