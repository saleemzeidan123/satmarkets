import { test } from "node:test";
import assert from "node:assert";
import { availabilityOf, availabilityLabel, FRESH_MAX_DAYS, STALE_MIN_DAYS } from "./availability";

const NOW = Date.parse("2026-07-18T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();

test("null or unparseable input yields null", () => {
  assert.equal(availabilityOf(null, NOW), null);
  assert.equal(availabilityOf(undefined, NOW), null);
  assert.equal(availabilityOf("not-a-date", NOW), null);
});

test("recent confirmation is fresh", () => {
  assert.deepEqual(availabilityOf(daysAgo(0), NOW), { days: 0, state: "fresh" });
  assert.deepEqual(availabilityOf(daysAgo(FRESH_MAX_DAYS), NOW), { days: FRESH_MAX_DAYS, state: "fresh" });
});

test("between the thresholds is aging", () => {
  assert.equal(availabilityOf(daysAgo(FRESH_MAX_DAYS + 1), NOW)!.state, "aging");
  assert.equal(availabilityOf(daysAgo(STALE_MIN_DAYS), NOW)!.state, "aging");
});

test("past the stale threshold is stale", () => {
  assert.equal(availabilityOf(daysAgo(STALE_MIN_DAYS + 1), NOW)!.state, "stale");
  assert.equal(availabilityOf(daysAgo(400), NOW)!.state, "stale");
});

test("future dates never go negative", () => {
  assert.deepEqual(availabilityOf(daysAgo(-5), NOW), { days: 0, state: "fresh" });
});

test("label reads as affirmation when current, nudge when stale", () => {
  const fresh = availabilityOf(daysAgo(3), NOW)!;
  assert.match(availabilityLabel(fresh, "15 Jul 2026", false), /^Available · confirmed 15 Jul 2026$/);
  assert.match(availabilityLabel(fresh, "15 Jul 2026", true), /^متاح/);
  const stale = availabilityOf(daysAgo(120), NOW)!;
  assert.match(availabilityLabel(stale, "20 Mar 2026", false), /^Confirm availability with the lister/);
  assert.match(availabilityLabel(stale, "20 Mar 2026", true), /^تأكّد من التوفر/);
});
