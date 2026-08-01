import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import {
  availabilityOf,
  availabilityLabel,
  availabilityShortLabel,
  availabilityAge,
  availabilityTone,
  FRESH_MAX_DAYS,
  STALE_MIN_DAYS,
} from "./availability";

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

// ---------------------------------------------------------------- finding 46
// The card used to say "Available" for the fresh AND the aging state, with no date
// in either, so a listing confirmed this week and one confirmed two months ago
// differed by a colour alone. Everything below is the proof that they no longer do.

const STATES = ["fresh", "aging", "stale"] as const;
const sample = {
  fresh: () => availabilityOf(daysAgo(3), NOW)!,
  aging: () => availabilityOf(daysAgo(FRESH_MAX_DAYS + 5), NOW)!,
  stale: () => availabilityOf(daysAgo(STALE_MIN_DAYS + 5), NOW)!,
};

test("short card label: an affirmation when current, a nudge when stale", () => {
  assert.equal(availabilityShortLabel(sample.fresh(), false), "Available · confirmed 3 days ago");
  assert.equal(availabilityShortLabel(sample.stale(), false), "Confirm availability · last confirmed 65 days ago");
  assert.match(availabilityShortLabel(sample.fresh(), true), /^متاح · تأكد التوفر قبل /);
  assert.match(availabilityShortLabel(sample.stale(), true), /^تأكّد من التوفر · آخر تأكيد قبل /);
});

test("the aging state no longer claims the space is available", () => {
  const aging = sample.aging();
  assert.equal(availabilityShortLabel(aging, false).includes("Available"), false);
  assert.equal(availabilityShortLabel(aging, true).includes("متاح"), false);
  assert.equal(availabilityLabel(aging, "10 Jun 2026", false).includes("Available"), false);
  assert.equal(availabilityLabel(aging, "10 Jun 2026", true).includes("متاح"), false);
  // Only the fresh state may affirm it, because only the fresh state has a recent
  // affirmation to rest on.
  assert.match(availabilityShortLabel(sample.fresh(), false), /^Available/);
});

test("each state produces a distinct card label in each locale", () => {
  for (const ar of [false, true]) {
    const labels = STATES.map((s) => availabilityShortLabel(sample[s](), ar));
    assert.equal(new Set(labels).size, 3, `states collapse to the same words: ${labels.join(" | ")}`);
  }
});

test("each state produces a distinct full label in each locale", () => {
  for (const ar of [false, true]) {
    const labels = STATES.map((s) => availabilityLabel(sample[s](), "01 Jan 2026", ar));
    assert.equal(new Set(labels).size, 3, `states collapse to the same words: ${labels.join(" | ")}`);
  }
});

test("every card label carries the age in Western numerals", () => {
  for (const s of STATES) {
    for (const ar of [false, true]) {
      const text = availabilityShortLabel(sample[s](), ar);
      assert.match(text, /[0-9]/, `${s}/${ar ? "ar" : "en"} has no number: ${text}`);
      assert.equal(/[٠-٩]/.test(text), false, `${s}/${ar ? "ar" : "en"} uses Arabic-Indic digits`);
    }
  }
});

test("English and Arabic expose the same state and the same day count", () => {
  for (const s of STATES) {
    const a = sample[s]();
    const n = (t: string) => (t.match(/[0-9]+/g) || []).join(",");
    assert.equal(n(availabilityShortLabel(a, false)), n(availabilityShortLabel(a, true)), `${s}: EN and AR disagree about the number`);
  }
});

test("the day-zero case reads as today rather than as zero days", () => {
  assert.equal(availabilityAge(0, false), "today");
  assert.equal(availabilityAge(0, true), "اليوم");
  assert.match(availabilityShortLabel(availabilityOf(daysAgo(0), NOW)!, false), /confirmed today$/);
});

test("the Arabic count uses the oblique dual after the preposition", () => {
  assert.equal(availabilityAge(2, true), "قبل يومين");
  assert.equal(availabilityAge(2, false), "2 days ago");
});

test("availability never takes the reserved verification green", () => {
  const tones = STATES.map((s) => availabilityTone(s));
  for (const t of tones) {
    assert.equal(/1b7a50|--green|--verified/i.test(t), false, `availability tone is reserved green: ${t}`);
  }
  assert.equal(new Set(tones).size, 3, "two states share a tone");
});

test("no availability render path composes its own colour", () => {
  // The defect was that both surfaces built the colour inline, and both reached for
  // the same green. There is one writer now, and this is what keeps it that way.
  for (const f of ["src/app/[locale]/listings/page.tsx", "src/app/[locale]/listings/[id]/page.tsx"]) {
    const code = readFileSync(f, "utf8").replace(/\{?\/\*[\s\S]*?\*\/\}?/g, " ");
    assert.equal(/av\.state\s*===/.test(code), false, `${f} still branches on availability state to pick a colour`);
    assert.match(code, /availabilityTone\(/, `${f} does not use the single tone writer`);
  }
});
