import { test } from "node:test";
import assert from "node:assert/strict";
import { gateFailures, passesGate, ownerVerified, permitOf } from "./gate";

// This logic is deliberately duplicated: once in Postgres (the trigger that has the
// final word) and once here (so the UI can tell the truth without a round trip).
// Duplication is only safe if it is pinned, so these tests pin the TS mirror to the
// trigger's exact semantics, including the asymmetric null handling that is easy to
// get backwards.

const ok = {
  ownership_verified: true,
  authorization_verified: true,
  right_to_market_confirmed: true,
  ad_permit_no: "REGA-AD-001002",
  ad_permit_expires_at: null,
};

test("a fully checked listing passes", () => {
  assert.equal(passesGate(ok), true);
  assert.deepEqual(gateFailures(ok), []);
});

test("no advertising permit means no publish", () => {
  const l = { ...ok, ad_permit_no: null, ad_permit_number: null };
  assert.equal(passesGate(l), false);
  assert.deepEqual(gateFailures(l), ["permit_missing"]);
});

test("either permit column satisfies the gate, as the trigger coalesces both", () => {
  assert.equal(permitOf({ ad_permit_no: "A" }), "A");
  assert.equal(permitOf({ ad_permit_number: "B" }), "B");
  assert.equal(permitOf({ ad_permit_number: "B", ad_permit_no: "A" }), "B");
  assert.equal(permitOf({}), null);
  assert.equal(passesGate({ ...ok, ad_permit_no: null, ad_permit_number: "B" }), true);
});

test("an expired permit is not a permit", () => {
  const l = { ...ok, ad_permit_expires_at: "2020-01-01T00:00:00Z" };
  assert.deepEqual(gateFailures(l), ["permit_expired"]);
  const future = { ...ok, ad_permit_expires_at: "2999-01-01T00:00:00Z" };
  assert.equal(passesGate(future), true);
});

// The trigger reads coalesce(ownership_verified, true) and coalesce(authorization_verified, true),
// but coalesce(right_to_market_confirmed, false). Unset is a PASS for the first two and
// a FAIL for the third. Invert either and the gate silently changes meaning.
test("unset ownership and authorisation pass; unset right-to-market fails", () => {
  assert.deepEqual(gateFailures({ ...ok, ownership_verified: null, authorization_verified: null }), []);
  const l = { ...ok, right_to_market_confirmed: null };
  assert.deepEqual(gateFailures(l), ["right_to_market"]);
});

test("explicit false on ownership or authorisation fails", () => {
  assert.deepEqual(gateFailures({ ...ok, ownership_verified: false }), ["ownership"]);
  assert.deepEqual(gateFailures({ ...ok, authorization_verified: false }), ["authorization"]);
});

test("every failing reason is reported, not just the first", () => {
  const l = {
    ownership_verified: false,
    authorization_verified: false,
    right_to_market_confirmed: false,
    ad_permit_no: null,
  };
  assert.deepEqual(gateFailures(l), ["ownership", "authorization", "right_to_market", "permit_missing"]);
});

// The six listings that were live with no permit looked exactly like this, and every
// one of them carried a green "Verified listing" tick.
test("the shape that was live and badged: owner verified, listing not", () => {
  const live = {
    ownership_verified: true,
    authorization_verified: false,
    right_to_market_confirmed: true,
    ad_permit_no: null,
    ad_permit_number: null,
  };
  assert.equal(ownerVerified(live), true, "the owner check did pass");
  assert.equal(passesGate(live), false, "the listing check did not, so no listing badge");
});

test("being SAT's own stock is not an input to either claim", () => {
  const satListed = { is_sat_listed: true } as any;
  assert.equal(ownerVerified(satListed), false);
  assert.equal(passesGate(satListed), false);
});
