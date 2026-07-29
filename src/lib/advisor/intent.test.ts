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

// ------------------------------------------------------- ADV-3A.1, item 5
// Found by exercising the deployed Arabic advisor. The vocabulary the value path
// recognised carried no word for the indicative band and no word for pricing, so
// two of the four suggestion chips on the platform's own page fell through to
// `search`. The mirror fault sat on the search side: a ceiling written into the
// suggested discovery prompt was read as a rent the person had offered for
// judgement, so the discovery prompt answered with a valuation.

test("a question about the indicative band is a valuation, in both languages", () => {
  for (const q of [
    "What's within band in KAFD?",
    "what is the indicative band for offices in Hittin",
    "what is the price band for Al Olaya offices",
    "ما النطاق الاسترشادي في كافد؟",
    "ما النطاق الاسترشادي لمكاتب فئة أ في كافد؟",
    "ما النطاق السعري لمكاتب العليا",
  ]) {
    assert.equal(readAdvisorIntent(q).mode, "value", q);
  }
});

test("a request to price something is a valuation", () => {
  assert.equal(readAdvisorIntent("Price a Grade A office in Al Olaya").mode, "value");
  assert.equal(readAdvisorIntent("price my warehouse in Sulay").mode, "value");
  assert.equal(readAdvisorIntent("what should I charge for an office in Hittin").mode, "value");
  assert.equal(readAdvisorIntent("سعّر مكتب فئة أ في العليا").mode, "value");
});

test("the Arabic pricing imperative is read only where it is a command", () => {
  // Folding removes the shadda, so the imperative "سعّر" and the ordinary noun
  // "سعر" collapse to one token. Only a sentence that opens with it is the
  // command; a search that mentions a reasonable price is still a search.
  assert.equal(readAdvisorIntent("مستودع للايجار في السلي 800 متر مربع").mode, "search");
  assert.equal(readAdvisorIntent("مكتب للايجار في العليا بسعر شامل الخدمات").mode, "search");
  assert.equal(readAdvisorIntent("مستودع في السلي سعر الايجار شهري").mode, "search");
});

test("a ceiling is a constraint on a search, not a figure offered for judgement", () => {
  for (const q of [
    "Fitted Grade A office in Granada, around 300 m², under 1,600 SAR/m²",
    "office in Al Olaya below 1,200 SAR per sqm",
    "مكتب في العليا بأقل من 1,600 ريال/م²",
    "مستودع في السلي لا يزيد عن 400 ريال/م²",
  ]) {
    const i = readAdvisorIntent(q);
    assert.equal(i.mode, "search", q);
    assert.equal(i.figure, null, q);
  }
});

test("a ceiling inside an explicit comparison is still the rent the person pays", () => {
  const i = readAdvisorIntent("we pay under 1,600 SAR/m2, is that fair for Hittin offices");
  assert.equal(i.mode, "value");
  assert.equal(i.figure, 1600);
});

test("a bracketed placeholder is never captured as a district", () => {
  // The shipped watch prompt carries "[location]" for the person to replace, and
  // the words after it used to be sent to the districts table as their district.
  assert.equal(readAdvisorIntent("Alert me when office rents in [location] move more than 3%").district, null);
  assert.equal(readAdvisorIntent("نبّهني عندما تتحرك إيجارات المكاتب في [الموقع] أكثر من 3%").district, null);
});

test("the movement words in a watch sentence do not become part of the place", () => {
  const i = readAdvisorIntent("Alert me when office rents in Hittin move more than 3%");
  assert.equal(i.mode, "watch");
  assert.equal(i.threshold, 3);
  assert.match(String(i.district), /Hittin/i);
  assert.equal(/move|more|than/i.test(String(i.district)), false);
});
