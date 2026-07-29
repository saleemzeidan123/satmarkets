import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readAdvisorIntent } from "./intent";
import { readNumericIntent } from "@/lib/market/numericIntent";

// ADV-3A.1, Codex item 5. The advisor's own suggestions must reach the path they
// promise, in both languages.
//
// THE DEFECT THIS EXISTS TO KILL, found by exercising the deployed Arabic advisor.
//
// A person clicked, or typed, the platform's own suggested question "ما النطاق
// الاسترشادي في كافد؟" and was answered with four KAFD office listings. No band,
// no Rent Index figure, no source line. The deterministic reader carried no band
// vocabulary at all, so a request for the indicative range fell through to
// `search`, and the same was true of "سعّر مكتب فئة أ في العليا" and of both
// English equivalents. Two of the four chips on the page did not do the thing
// their own words describe.
//
// The mirror defect sat on the discovery side. The suggested SEARCH prompt ends
// "under 1,600 SAR/m2", the numeric reader correctly recognised a per-area rent,
// and the intent reader treated any rent figure as a valuation. So the platform's
// primary discovery prompt produced a valuation, and its two pricing prompts
// produced a search. Each of the four was routed to the other's path.
//
// These strings are shipped copy. They change, and when they change nothing else
// checks that the new wording still lands where the chip says it will. So the
// test reads the dictionaries themselves rather than a copy of them: a future
// rewording that breaks the routing fails here, in both locales at once.

const ROOT = join(__dirname, "..", "..");
const dict = (loc: string) =>
  JSON.parse(readFileSync(join(ROOT, "i18n", "dictionaries", `${loc}.json`), "utf8")).advisor as Record<string, string>;

const EN = dict("en");
const AR = dict("ar");

/** Every shipped suggestion, with the path its own wording promises. */
const PROMISED: Record<string, "search" | "value" | "watch" | "draft"> = {
  jobFindP: "search",
  jobDraftP: "draft",
  jobWatchP: "watch",
  chipPrice: "value",
  chipBand: "value",
  chipFair: "value",
  chipWatch: "watch",
};

test("every shipped advisor suggestion reaches the path its own words promise, in both languages", () => {
  for (const [loc, d] of [["en", EN], ["ar", AR]] as const) {
    for (const [key, promised] of Object.entries(PROMISED)) {
      const prompt = d[key];
      assert.equal(typeof prompt, "string", `${loc}.advisor.${key} is missing`);
      assert.equal(readAdvisorIntent(prompt).mode, promised, `${loc}.advisor.${key}: "${prompt}"`);
    }
  }
});

test("the two locales route their equivalent suggestions the same way", () => {
  // A chip that values in English and searches in Arabic is the bilingual parity
  // law failing in the one place a reader cannot see it.
  for (const key of Object.keys(PROMISED)) {
    assert.equal(readAdvisorIntent(EN[key]).mode, readAdvisorIntent(AR[key]).mode, key);
  }
});

test("a band question is a valuation, however it is phrased", () => {
  for (const q of [
    "What's within band in KAFD?",
    "what is the indicative band for Grade A offices in KAFD",
    "what is the indicative range for offices in Hittin",
    "ما النطاق الاسترشادي في كافد؟",
    "ما النطاق الاسترشادي لمكاتب فئة أ في كافد؟",
    "ما هو النطاق السعري للمكاتب في العليا",
  ]) {
    assert.equal(readAdvisorIntent(q).mode, "value", q);
  }
});

test("a request to price something is a valuation in both languages", () => {
  for (const q of ["Price a Grade A office in Al Olaya", "price my warehouse in Sulay", "سعّر مكتب فئة أ في العليا", "سعر مستودعي في السلي"]) {
    assert.equal(readAdvisorIntent(q).mode, "value", q);
  }
});

test("the pricing imperative is read only at the start, so an ordinary price word does not hijack a search", () => {
  // Folding removes the shadda, so the imperative "سعّر" and the noun "سعر" are
  // one token. A search that merely mentions a reasonable price is still a search.
  const i = readAdvisorIntent("مكتب للايجار في العليا بسعر شامل الخدمات");
  assert.equal(i.mode, "search");
  assert.notEqual(i.district, null);
  assert.equal(readAdvisorIntent("مستودع للايجار في السلي 800 متر مربع").mode, "search");
});

test("a budget ceiling is a constraint on a search, never a figure offered for judgement", () => {
  for (const q of [
    "Fitted Grade A office in Granada, around 300 m², under 1,600 SAR/m²",
    "office in Al Olaya below 1,200 SAR per sqm",
    "مكتب في العليا بأقل من 1,600 ريال/م²",
    "مستودع في السلي لا يزيد عن 400 ريال/م²",
  ]) {
    const i = readAdvisorIntent(q);
    assert.equal(i.mode, "search", q);
    assert.equal(i.figure, null, `a ceiling must not become the user's offered rent: ${q}`);
  }
});

test("a ceiling inside a genuine rent comparison is still the rent they pay", () => {
  // The bound only diverts a figure when the sentence is not also an explicit
  // comparison. Someone who says what they pay has offered a figure.
  const i = readAdvisorIntent("we pay under 1,600 SAR/m2, is that fair for Hittin offices");
  assert.equal(i.mode, "value");
  assert.equal(i.figure, 1600);
});

test("the ceiling is kept, not discarded, so a later search layer can still use it", () => {
  const n = readNumericIntent("Fitted Grade A office in Granada, around 300 m², under 1,600 SAR/m²");
  assert.deepEqual(n.caps, [1600]);
  assert.equal(n.rent, null);
  assert.deepEqual(n.areas, [300]);
});

test("a bracketed placeholder is never read as a place", () => {
  // The shipped watch prompt carries "[location]" for the person to replace. That
  // placeholder, and the words after it, used to be sent to the districts table
  // as the district the person asked about.
  for (const q of [EN.jobWatchP, AR.jobWatchP, EN.jobDraftP, AR.jobDraftP]) {
    const d = readAdvisorIntent(q).district;
    if (d !== null) assert.doesNotMatch(d, /[[\]{}<>]/, q);
  }
  assert.equal(readAdvisorIntent(EN.jobWatchP).district, null);
  assert.equal(readAdvisorIntent(AR.jobWatchP).district, null);
});

test("the watch prompts still carry their percent", () => {
  assert.equal(readAdvisorIntent(EN.jobWatchP).threshold, 3);
  assert.equal(readAdvisorIntent(AR.jobWatchP).threshold, 3);
});

test("no suggestion is routed by a figure the person did not offer", () => {
  // Every shipped prompt, checked against the rule numericIntent exists to hold:
  // a figure appears only when a rent unit or an explicit comparison put it there.
  for (const d of [EN, AR]) {
    for (const key of Object.keys(PROMISED)) {
      const i = readAdvisorIntent(d[key]);
      if (i.figure !== null) assert.equal(i.mode, "value", `${key} carries a figure but is not a valuation`);
    }
  }
});
