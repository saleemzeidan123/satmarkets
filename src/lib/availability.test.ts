import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import {
  availabilityOf,
  availabilityLabel,
  availabilityShortLabel,
  availabilityAge,
  availabilityTone,
  daysUntilBoundary,
  listerAvailability,
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
  //
  // PKG-CARD1. The search grid's own freshness/availability markup moved into
  // `ListingCard` (`showFreshness`), so that is where its call to the tone
  // writer now lives; the listing detail page draws its own availability line
  // and is unaffected.
  for (const f of ["src/components/ListingCard.tsx", "src/app/[locale]/listings/[id]/page.tsx"]) {
    const code = readFileSync(f, "utf8").replace(/\{?\/\*[\s\S]*?\*\/\}?/g, " ");
    assert.equal(/av\.state\s*===/.test(code), false, `${f} still branches on availability state to pick a colour`);
    assert.match(code, /availabilityTone\(/, `${f} does not use the single tone writer`);
  }
});

// ---------------------------------------------------------------------------
// PKG-AV2: the lister's side of the same sentence (finding 11).
// ---------------------------------------------------------------------------

const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const digits = (s: string) => (s.match(/\d+/g) || []).join(",");

test("the countdown to a boundary is inclusive of the day it changes, and never negative", () => {
  assert.equal(daysUntilBoundary(FRESH_MAX_DAYS, FRESH_MAX_DAYS), 1);
  assert.equal(daysUntilBoundary(FRESH_MAX_DAYS + 1, FRESH_MAX_DAYS), 0);
  assert.equal(daysUntilBoundary(0, STALE_MIN_DAYS), STALE_MIN_DAYS + 1);
  assert.equal(daysUntilBoundary(999, STALE_MIN_DAYS), 0);
});

test("the lister is shown the occupier's sentence rather than a private paraphrase of it", () => {
  for (const state of STATES) {
    const a = sample[state]();
    const at = daysAgo(a.days);
    for (const ar of [false, true]) {
      assert.equal(
        listerAvailability(at, ar, NOW).publicLine,
        availabilityShortLabel(a, ar),
        `${state}/${ar ? "ar" : "en"} shows the lister something other than what the card says`,
      );
      assert.equal(listerAvailability(at, ar, NOW).tone, availabilityTone(state));
    }
  }
});

test("a listing that has never been confirmed says so, and claims no age", () => {
  for (const ar of [false, true]) {
    const la = listerAvailability(null, ar, NOW);
    assert.equal(la.publicLine, null);
    assert.equal(la.worthReaffirming, true);
    assert.equal(digits(la.note), "", "a listing with no confirmation must not be given a day count");
  }
});

test("only a fresh affirmation is left alone; every other state is worth answering", () => {
  assert.equal(listerAvailability(daysAgo(3), false, NOW).worthReaffirming, false);
  assert.equal(listerAvailability(daysAgo(FRESH_MAX_DAYS), false, NOW).worthReaffirming, false);
  assert.equal(listerAvailability(daysAgo(FRESH_MAX_DAYS + 1), false, NOW).worthReaffirming, true);
  assert.equal(listerAvailability(daysAgo(STALE_MIN_DAYS + 1), false, NOW).worthReaffirming, true);
  assert.equal(listerAvailability(null, false, NOW).worthReaffirming, true);
});

test("the note counts down to the real threshold, and both locales count the same days", () => {
  // Fresh: the wording changes the day after FRESH_MAX_DAYS. Aging: the day after
  // STALE_MIN_DAYS. If these ever disagree with availabilityOf, the lister is being
  // told a date the public label will not honour.
  const cases: [number, number][] = [
    [3, FRESH_MAX_DAYS + 1 - 3],
    [FRESH_MAX_DAYS, 1],
    [FRESH_MAX_DAYS + 1, STALE_MIN_DAYS - FRESH_MAX_DAYS],
    [STALE_MIN_DAYS, 1],
  ];
  for (const [age, left] of cases) {
    const en = listerAvailability(daysAgo(age), false, NOW).note;
    const ar = listerAvailability(daysAgo(age), true, NOW).note;
    assert.equal(digits(en), String(left), `English note for a ${age} day old affirmation`);
    // Arabic spells one and two rather than numbering them (يوم واحد, يومين), which
    // is the counted-noun rule and not a numeral choice. From three up the figure is
    // a Western numeral like every other figure on the platform, and it must be the
    // same figure the English note gives.
    if (left >= 3) assert.equal(digits(ar), digits(en), `the two locales disagree at ${age} days`);
    else assert.equal(digits(ar), "", `Arabic numbered a count it should spell at ${age} days`);
  }
});

test("a stale affirmation is not given a countdown, because the change has already happened", () => {
  for (const ar of [false, true]) {
    assert.equal(digits(listerAvailability(daysAgo(STALE_MIN_DAYS + 1), ar, NOW).note), "");
  }
});

test("the lister note carries Western numerals in Arabic, like every other figure", () => {
  for (const age of [0, 3, FRESH_MAX_DAYS + 5, STALE_MIN_DAYS + 5]) {
    const la = listerAvailability(daysAgo(age), true, NOW);
    assert.equal(/[٠-٩]/.test(la.note), false, `Arabic-Indic numeral at ${age} days`);
    if (la.publicLine) assert.equal(/[٠-٩]/.test(la.publicLine), false);
  }
});

test("the Arabic countdown takes the oblique dual, because the preposition governs it", () => {
  // بعد, like قبل, is followed by the genitive: "بعد يومين", never "بعد 2 يوماً".
  assert.match(listerAvailability(daysAgo(FRESH_MAX_DAYS - 1), true, NOW).note, /بعد يومين/);
  assert.match(listerAvailability(daysAgo(STALE_MIN_DAYS - 1), true, NOW).note, /بعد يومين/);
});

test("every state says something different to the lister in each locale", () => {
  const notes = new Set<string>();
  for (const ar of [false, true]) {
    notes.add(listerAvailability(null, ar, NOW).note);
    for (const state of STATES) notes.add(listerAvailability(daysAgo(sample[state]().days), ar, NOW).note);
  }
  assert.equal(notes.size, 8, "two lister states are saying the same thing");
});

test("the lister workspace reads availability through the one module and offers the answer only where the claim is made", () => {
  const page = codeOnly(readFileSync("src/app/[locale]/dashboard/listings/page.tsx", "utf8"));
  assert.match(page, /availability_confirmed_at/, "the dashboard query does not read the timestamp it renders");
  assert.match(page, /listerAvailability\(/, "the dashboard composes availability itself instead of using the module");
  assert.equal(/av\.state\s*===/.test(page), false, "the dashboard branches on availability state");
  assert.equal(/availabilityTone\(/.test(page), false, "the dashboard reaches past listerAvailability for the colour");
  // A paused or draft listing makes no public availability claim, so no affirmation
  // is collected for one.
  assert.match(page, /live \? listerAvailability\(/, "availability is offered on listings that are not on the market");
});

test("the re-affirm control moves the timestamp and nothing else, one listing at a time", () => {
  const c = codeOnly(readFileSync("src/components/AvailabilityReaffirm.tsx", "utf8"));
  assert.match(c, /method:\s*"PATCH"/);
  assert.match(c, /JSON\.stringify\(\{\s*availability_confirmed_at:[^}]+\}\)/, "the affirmation carries more than the date");
  assert.equal(/\.map\(|\.forEach\(/.test(c), false, "a bulk affirmation path appeared; Law 3 says each date is one real event");
  assert.equal(/\b(?:status|price|title_en|title_ar|ad_permit_no|deal_type)\s*:/.test(c), false, "the affirmation touches a field that is not availability");
});
