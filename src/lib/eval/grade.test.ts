import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuery } from "@/lib/search/queryParse";
import { RENT_INDEX_SOURCE } from "@/lib/market/attribution";
import { GOLD_VOCAB, type GoldCase } from "./gold";
import { FAL_NUMBER, answerLocale, gradeCase, gradeProse, gradeQuery, gradeTranslation, lawFailures } from "./grade";

// ADV-3B. The graders, tested against the faults they exist to catch.
//
// A grader that never fails is a grader nobody notices is broken, so every rule
// below is tested from both sides: text that breaks it and text that does not.

const EM_DASH = String.fromCharCode(8212); // em-dash-law

const proseCase = (locale: "en" | "ar"): GoldCase => ({
  id: `p-${locale}-test`,
  profile: "short_prose",
  locale,
  input: "x",
  why: "a fixture",
  expect: {},
});

const translationCase = (locale: "en" | "ar", input: string): GoldCase => ({
  id: `t-${locale}-test`,
  profile: "bilingual_translation",
  locale,
  input,
  why: "a fixture",
  expect: { mustContain: [] },
});

// ------------------------------------------------------------------- the laws

test("an empty answer is a failure and stops there, so one fault is not reported as six", () => {
  const f = lawFailures("   ", "en");
  assert.equal(f.length, 1);
  assert.match(f[0], /empty/);
});

test("an em dash fails and an ordinary comma does not", () => {
  assert.equal(lawFailures(`a good office${EM_DASH}for lease`, "en").length, 1);
  assert.deepEqual(lawFailures("a good office, for lease", "en"), []);
});

test("a non-Western numeral fails in either language", () => {
  assert.match(lawFailures("المساحة ٣٠٠ متر", "ar").join(" "), /law 7/);
  assert.deepEqual(lawFailures("المساحة 300 متر", "ar"), []);
});

test("a licence number that is not ours is named in the failure", () => {
  const f = lawFailures("licence 1234567890", "en");
  assert.equal(f.length, 1);
  assert.match(f[0], /1234567890/);
  assert.match(f[0], new RegExp(FAL_NUMBER));
});

test("our own licence number passes", () => {
  assert.deepEqual(lawFailures(`licence ${FAL_NUMBER}`, "en"), []);
});

test("a long figure that merely contains ten digits is not read as a licence", () => {
  assert.deepEqual(lawFailures("1,250,000,000 riyals", "en"), []);
});

test("a forbidden phrase fails in either language", () => {
  assert.match(lawFailures("see the company deck", "en").join(" "), /vocabulary law/);
  assert.match(lawFailures("راجع عرض الشركة", "ar").join(" "), /vocabulary law/);
});

test("an answer in the wrong script fails, because content is not the only thing that is right", () => {
  assert.match(lawFailures("There is no published band.", "ar").join(" "), /not written in Arabic/);
  assert.match(lawFailures("لا يوجد نطاق منشور.", "en").join(" "), /not written in English/);
});

test("a translation case is graded in the language it is going into", () => {
  assert.equal(answerLocale(translationCase("en", "x")), "ar");
  assert.equal(answerLocale(translationCase("ar", "x")), "en");
  assert.equal(answerLocale(proseCase("ar")), "ar");
});

// --------------------------------------------------------------- the parse

test("a correct parse passes", () => {
  const p = parseQuery("warehouse for sale in Jeddah", GOLD_VOCAB);
  assert.deepEqual(gradeQuery({ asset: "warehouse", deal: "sale", city: "Jeddah" }, p).failures, []);
});

test("a field the expectation never named must come back empty", () => {
  const p = parseQuery("warehouse for sale in Jeddah", GOLD_VOCAB);
  const v = gradeQuery({ asset: "warehouse", deal: "sale" }, p);
  assert.equal(v.ok, false);
  assert.match(v.failures.join(" "), /city/);
});

test("the failure sentence says what was read and what was correct", () => {
  const p = parseQuery("office in Riyadh", GOLD_VOCAB);
  const v = gradeQuery({ asset: "warehouse", city: "Riyadh" }, p);
  assert.match(v.failures[0], /read "office"/);
  assert.match(v.failures[0], /correct is "warehouse"/);
});

test("free text is compared as a set, because word order is not a parse result", () => {
  const p = parseQuery("office for lease in Riyadh for the Northwind Logistics expansion", GOLD_VOCAB);
  const expect = { asset: "office", deal: "lease", city: "Riyadh", terms: ["expansion", "northwind", "logistics"] };
  assert.deepEqual(gradeQuery(expect, p).failures, []);
});

test("a disclosed figure the expectation did not allow for is a failure", () => {
  const p = parseQuery("office 200 to 400", GOLD_VOCAB);
  const v = gradeQuery({ asset: "office" }, p);
  assert.equal(v.ok, false);
  assert.match(v.failures.join(" "), /ignored/);
  assert.deepEqual(gradeQuery({ asset: "office", ignored: ["200", "400"] }, p).failures, []);
});

test("an empty query is graded as empty", () => {
  assert.deepEqual(gradeQuery({ empty: true }, parseQuery("   ", GOLD_VOCAB)).failures, []);
  assert.equal(gradeQuery({}, parseQuery("   ", GOLD_VOCAB)).ok, false);
});

// ---------------------------------------------------------------- the prose

test("a figure nothing vouched for is the failure the profile exists to catch", () => {
  const v = gradeProse(proseCase("en"), { allowedFigures: [] }, "A fair rent there is about 1,450 per square metre.");
  assert.equal(v.ok, false);
  assert.match(v.failures.join(" "), /law 3/);
});

test("the same answer passes once a tool has vouched for the figure", () => {
  const v = gradeProse(proseCase("en"), { allowedFigures: [1450] }, "The published band is 1,450 per square metre.");
  assert.deepEqual(v.failures, []);
});

test("naming the Rent Index without the attribution fails, in both languages", () => {
  const en = gradeProse(proseCase("en"), { requireAttribution: true }, "Our figures come from the published rent index.");
  assert.equal(en.ok, false);
  assert.match(en.failures.join(" "), /attribution/);
  const ok = gradeProse(
    proseCase("en"),
    { requireAttribution: true },
    `Our figures come from the ${RENT_INDEX_SOURCE.en}.`
  );
  assert.deepEqual(ok.failures, []);
  const ar = gradeProse(
    proseCase("ar"),
    { requireAttribution: true },
    `أرقامنا من ${RENT_INDEX_SOURCE.ar}.`
  );
  assert.deepEqual(ar.failures, []);
});

test("a required phrase and a forbidden one are both checked", () => {
  const v = gradeProse(proseCase("en"), { mustContain: ["asset type"], mustNotContain: ["Grade A"] }, "Which Grade A option?");
  assert.equal(v.failures.length, 2);
});

// ----------------------------------------------------------- the translation

test("a rendering that gained a figure the source never stated fails", () => {
  const c = translationCase("en", "Fitted office, 300 m2, reference NG-4417.");
  const v = gradeTranslation(c, { mustContain: [] }, "مكتب مجهز، 300 م2، مرجع NG-4417، بإيجار 1,450.");
  assert.equal(v.ok, false);
  assert.match(v.failures.join(" "), /1450|1,450/);
});

test("a rendering that carried every figure across passes", () => {
  const c = translationCase("en", "Fitted office, 300 m2, reference NG-4417.");
  const v = gradeTranslation(c, { mustContain: ["مكتب"], preserve: ["NG-4417", "300"] }, "مكتب مجهز، 300 م2، رقم المرجع NG-4417.");
  assert.deepEqual(v.failures, []);
});

test("a lost identifier is named as an identifier and not as a missing word", () => {
  const c = translationCase("en", "Fitted office, reference NG-4417.");
  const v = gradeTranslation(c, { mustContain: [], preserve: ["NG-4417"] }, "مكتب مجهز.");
  assert.match(v.failures.join(" "), /identifier/);
});

// -------------------------------------------------------------- the dispatch

test("a case answered in the wrong shape is reported as a harness fault, not thrown", () => {
  const c = translationCase("en", "x");
  const v = gradeCase(c, { kind: "parse", parsed: parseQuery("office", GOLD_VOCAB) });
  assert.equal(v.ok, false);
  assert.match(v.failures[0], /answered with a parse/);
});

test("a classification case answered with prose is the same kind of fault", () => {
  const c: GoldCase = {
    id: "q-en-test",
    profile: "classification",
    locale: "en",
    input: "office",
    why: "a fixture",
    expect: { asset: "office" },
  };
  const v = gradeCase(c, { kind: "text", text: "an office, probably" });
  assert.equal(v.ok, false);
  assert.match(v.failures[0], /answered with text/);
});

test("dispatch reaches the right grader for each profile", () => {
  const q: GoldCase = {
    id: "q-en-test",
    profile: "classification",
    locale: "en",
    input: "warehouse for sale in Jeddah",
    why: "a fixture",
    expect: { asset: "warehouse", deal: "sale", city: "Jeddah" },
  };
  assert.equal(gradeCase(q, { kind: "parse", parsed: parseQuery(q.input, GOLD_VOCAB) }).ok, true);
  assert.equal(gradeCase(proseCase("en"), { kind: "text", text: "Which asset type do you need?" }).ok, true);
  assert.equal(
    gradeCase(translationCase("en", "Fitted office."), { kind: "text", text: "مكتب مجهز." }).ok,
    true
  );
});
