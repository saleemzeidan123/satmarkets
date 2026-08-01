import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { arabicState, arabicIsBehind } from "@/lib/listingArabic";
import { hashSource } from "@/lib/translate/hash";

// PKG-LS1. The behavioural tests fix what the lister is told. The source scan at
// the bottom is the one that matters over time: the defect this package closes
// was not that the edit form lacked a field, it was that nothing anywhere said a
// form which submits a listing title must submit both of them.

const EN = "Grade A floor, Al Olaya";
const AR = "دور فئة أ، العليا";

test("no Arabic is absent, whatever else is on the row", () => {
  assert.equal(arabicState({ value: null, english: EN, englishHash: hashSource(EN) }), "absent");
  assert.equal(arabicState({ value: "   ", english: EN, englishHash: hashSource(EN) }), "absent");
  assert.equal(arabicState(null), "absent");
  assert.equal(arabicState(undefined), "absent");
});

test("Arabic written against the English on the row is current", () => {
  const f = { value: AR, srcHash: hashSource(EN), english: EN, englishHash: hashSource(EN) };
  assert.equal(arabicState(f), "current");
  assert.equal(arabicIsBehind(f), false);
});

test("Arabic written against different English is behind it", () => {
  const f = { value: AR, srcHash: hashSource("Grade B floor, Al Olaya"), english: EN, englishHash: hashSource(EN) };
  assert.equal(arabicState(f), "stale");
  assert.equal(arabicIsBehind(f), true);
});

test("one character of English is enough to put the Arabic behind it", () => {
  // The same rule the translate route applies, so the lister is not told the
  // Arabic is current on a row the translator is about to rewrite.
  const f = { value: AR, srcHash: hashSource(EN), english: EN + ".", englishHash: hashSource(EN + ".") };
  assert.equal(arabicState(f), "stale");
});

test("a listing written in Arabic with no English is current, not stale", () => {
  assert.equal(arabicState({ value: AR, srcHash: null, english: "", englishHash: null }), "current");
  assert.equal(arabicState({ value: AR, srcHash: null, english: "   ", englishHash: "" }), "current");
});

test("no recorded hash is unknown, and unknown says nothing", () => {
  // Fail quiet. Telling a lister their Arabic is behind the English when the
  // record cannot support it is a false statement about their own listing, and
  // the cost of silence is that they read it themselves.
  const f = { value: AR, srcHash: null, english: EN, englishHash: hashSource(EN) };
  assert.equal(arabicState(f), "unknown");
  assert.equal(arabicIsBehind(f), false);
  assert.equal(arabicState({ value: AR, srcHash: hashSource(EN), english: EN, englishHash: null }), "unknown");
});

test("the hash is the same one the translate route compares", () => {
  // If these two ever diverge the lister sees "current" on a field the next
  // translate run overwrites, which is the exact confusion this package exists
  // to end.
  assert.equal(hashSource(EN), hashSource(EN));
  assert.notEqual(hashSource(EN), hashSource(EN + " "));
  assert.equal(hashSource(EN).length, 64);
});

// ------------------------------------------------------------- source guard
//
// Needles assembled from fragments so this file does not match its own scan, the
// same reasoning as the guards in `listingTitle.test.ts` and `ai/gateway.test.ts`.

const SRC = join(__dirname, "..");
const TITLE_EN = "title_" + "en";
const TITLE_AR = "title_" + "ar";
/** A client that sends a listing patch or a listing create. */
const CLIENT = /fetch\(\s*`?\/api\/listings/;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

test("a form that submits a listing title submits both languages", () => {
  // EditListingForm submitted `title_en` and `description_en` and nothing else,
  // while `PATCH /api/listings/[id]` had accepted `title_ar` and
  // `description_ar` behind the same permission check the whole time. The result
  // was a lister who could be told by PKG-NM1 that an Arabic reader sees a
  // generic description of their space, on the very page whose form gave them no
  // way to answer it. A listing created in the Studio could even hold an Arabic
  // title its owner could neither read nor change.
  //
  // The scan is narrow on purpose: it looks only at files that actually call the
  // listings API, so a page that merely READS `title_en` (an internal English
  // verification queue, a card that renders one language) is not accused of
  // anything. What it forbids is a writer that knows about one language only.
  const offenders: string[] = [];
  for (const f of walk(SRC)) {
    const s = readFileSync(f, "utf8");
    if (!CLIENT.test(s)) continue;
    if (s.includes(TITLE_EN) && !s.includes(TITLE_AR)) offenders.push(relative(SRC, f).split("\\").join("/"));
  }
  assert.deepEqual(
    offenders,
    [],
    `these files submit a listing title in one language only, so the other language can never be written from that screen:\n  ${offenders.join("\n  ")}`,
  );
});

test("the guard catches the shape it was written for", () => {
  // A guard nobody has watched fail is a guard nobody knows works.
  const writer = 'const r = await fetch(`/api/listings/${id}`, { method: "PATCH", body: JSON.stringify({ title_' + 'en: f.title_' + "en }) });";
  assert.ok(CLIENT.test(writer) && writer.includes(TITLE_EN) && !writer.includes(TITLE_AR));
  const reader = 'const { data } = await sb.from("listings").select("title_' + 'en");';
  assert.equal(CLIENT.test(reader), false, "a file that only reads a title is not a writer");
});
