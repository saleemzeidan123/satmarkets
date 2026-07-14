import { test } from "node:test";
import assert from "node:assert/strict";
import { listedSince, listedLabel } from "./listedSince";

const NOW = Date.parse("2026-07-14T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();

test("null or unparseable input returns null", () => {
  assert.equal(listedSince(null, NOW), null);
  assert.equal(listedSince(undefined, NOW), null);
  assert.equal(listedSince("not a date", NOW), null);
});

test("today is 0 days and new", () => {
  const r = listedSince(daysAgo(0), NOW)!;
  assert.equal(r.days, 0);
  assert.equal(r.isNew, true);
});

test("14 days is the last new day, 15 is not new", () => {
  assert.equal(listedSince(daysAgo(14), NOW)!.isNew, true);
  assert.equal(listedSince(daysAgo(15), NOW)!.isNew, false);
  assert.equal(listedSince(daysAgo(29), NOW)!.days, 29);
});

test("a future created_at never goes negative", () => {
  const r = listedSince(daysAgo(-5), NOW)!;
  assert.equal(r.days, 0);
});

test("labels are bilingual with Western numerals", () => {
  assert.equal(listedLabel(0, false), "Listed today");
  assert.equal(listedLabel(1, false), "Listed 1 day ago");
  assert.equal(listedLabel(12, false), "Listed 12 days ago");
  assert.equal(listedLabel(0, true), "أُدرج اليوم");
  assert.equal(listedLabel(12, true), "أُدرج قبل 12 يوماً");
});
