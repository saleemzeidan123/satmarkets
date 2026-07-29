import test from "node:test";
import assert from "node:assert/strict";
import { readAdvisorIntent } from "./intent";

// ADV-3A.1, Codex item 1. The advisor's behaviour when no model answers.
//
// While no enterprise AI agreement is in force the boundary denies unstructured
// user text, so the model-backed classifier returns null before a socket opens
// and this reader is what routes every message. It is therefore not a fallback in
// the sense of a rarely exercised branch. It is the advisor.
//
// The two paths that matter most here are `value` and `watch`, because both are
// answered with no model at all once the intent is known: they read the published
// Rent Index, build structured evidence and render both languages
// deterministically. If the reader collapsed everything to `search`, a closed AI
// boundary would have cost the advisor its most evidence-correct answers for a
// reason that has nothing to do with them.

const modeOf = (q: string) => readAdvisorIntent(q).mode;

test("a request for space is a search, in both languages", () => {
  assert.equal(modeOf("I need a 400 sqm office in Al Olaya"), "search");
  assert.equal(modeOf("find me retail space in Hittin"), "search");
  assert.equal(modeOf("ابحث عن مكتب في العليا"), "search");
  assert.equal(modeOf("مكتب للايجار في الملز"), "search");
});

test("a rent question is a valuation, in both languages", () => {
  assert.equal(modeOf("what are rents in Al Malaz"), "value");
  assert.equal(modeOf("office rents in Al Olaya"), "value");
  assert.equal(modeOf("كم متوسط الإيجار للمكاتب في حطين"), "value");
});

test("a standing instruction is a watch and carries its percent", () => {
  const en = readAdvisorIntent("notify me when office rents in Granada move 5%");
  assert.equal(en.mode, "watch");
  assert.equal(en.threshold, 5);
  const ar = readAdvisorIntent("نبهني إذا تغيرت إيجارات المكاتب في غرناطة ٥٪");
  assert.equal(ar.mode, "watch");
  assert.equal(ar.threshold, 5);
});

test("asking for copy is a draft, in both languages", () => {
  assert.equal(modeOf("write me a listing description for my warehouse in Sulay"), "draft");
  assert.equal(modeOf("اكتب لي وصف إعلان لمستودع في السلي"), "draft");
});

test("a question about the advisor itself is chat", () => {
  assert.equal(modeOf("what can you do"), "chat");
  assert.equal(modeOf("who are you"), "chat");
  assert.equal(modeOf("وش تسوي"), "chat");
});

test("a capability phrase that also names a place is about inventory, not about us", () => {
  // "What can you tell me about offices in Hittin" is a question about what SAT
  // has, and answering it with a description of the advisor would be a
  // classifier that pattern-matched the first four words.
  const i = readAdvisorIntent("can you help me with offices in Hittin");
  assert.notEqual(i.mode, "chat");
  assert.equal(i.district, "Hittin");
  assert.equal(i.asset, "office");
});

test("Arabic proclitics do not hide the asset word", () => {
  // The article and several prepositions are written onto the word itself, so
  // "للمكاتب" is how a person actually asks. A padded substring test finds
  // nothing there, and the advisor would answer without an asset type.
  assert.equal(readAdvisorIntent("كم متوسط الإيجار للمكاتب في حطين").asset, "office");
  assert.equal(readAdvisorIntent("عروض بالمكاتب في العليا").asset, "office");
  assert.equal(readAdvisorIntent("ابحث عن مستودع في السلي").asset, "warehouse");
});

test("a development is read as itself, not folded into a district", () => {
  assert.equal(readAdvisorIntent("is 1800 SAR per sqm fair for an office in KAFD").district, "KAFD");
  assert.equal(readAdvisorIntent("هل 1800 ريال للمتر مناسب لمكتب في كافد").district, "KAFD");
});

test("an unknown place is passed through as typed, never swapped for a known one", () => {
  // The law the discovery parser works under, applied here: an unrecognised term
  // is not upgraded into a constraint and is not replaced by the nearest thing
  // the list happens to know. It goes to the districts table as the person's own
  // words, and when nothing matches the advisor says it has no published data.
  const i = readAdvisorIntent("I need an office in Al Nakheel Plaza area");
  assert.equal(i.asset, "office");
  assert.match(String(i.district), /Nakheel/i);
  assert.notEqual(i.district, "Al Olaya");
});

test("a size, a year or a percent is not read as a rent", () => {
  // `readNumericIntent` already enforces this and has its own tests. The check
  // here is that the advisor consumes it rather than taking the first number,
  // which is the bug it was written to fix.
  assert.equal(readAdvisorIntent("I need a 400 sqm office in Al Olaya").figure, null);
  assert.equal(readAdvisorIntent("how did rents move in 2025").figure, null);
  assert.equal(readAdvisorIntent("is 1800 SAR per sqm fair for an office in KAFD").figure, 1800);
});

test("an offered rent makes a bare sentence a valuation without any value word", () => {
  const i = readAdvisorIntent("they are asking 1800 SAR per sqm for an office in Hittin");
  assert.equal(i.mode, "value");
  assert.equal(i.figure, 1800);
});

test("a greeting or an empty message does not throw and names nothing", () => {
  for (const q of ["", "   ", "hello", "هلا"]) {
    const i = readAdvisorIntent(q);
    assert.equal(i.district, null);
    assert.equal(i.asset, null);
    assert.equal(i.figure, null);
  }
});

test("a threshold is only kept where it means something", () => {
  // A percent in a valuation question is not a watch threshold, and carrying it
  // would create a standing alert nobody asked for.
  const v = readAdvisorIntent("rents in Al Olaya are up 12%, is 1800 SAR per sqm fair");
  assert.equal(v.mode, "value");
  assert.equal(v.threshold, null);
});
