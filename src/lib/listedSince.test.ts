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

test("the Arabic day count agrees at the counts this badge actually shows", () => {
  // The badge lives for fourteen days, so 1 to 14 is not an edge case here, it
  // is the whole population. Every one of these read "N يوماً" before.
  assert.equal(listedLabel(1, true), "أُدرج قبل يوم واحد");
  assert.equal(listedLabel(2, true), "أُدرج قبل يومين");
  assert.equal(listedLabel(3, true), "أُدرج قبل 3 أيام");
  assert.equal(listedLabel(10, true), "أُدرج قبل 10 أيام");
  assert.equal(listedLabel(11, true), "أُدرج قبل 11 يوماً");
  assert.equal(listedLabel(99, true), "أُدرج قبل 99 يوماً");
  assert.equal(listedLabel(100, true), "أُدرج قبل 100 يوم");
  assert.equal(listedLabel(2, false), "Listed 2 days ago");
});
