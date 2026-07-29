import { test } from "node:test";
import assert from "node:assert/strict";
import { SYNTHETIC_SETS, buildExternalPrompt } from "@/lib/aiBoundary";
import { GOLD_CASES, GOLD_PROFILES, GOLD_SET_ID, GOLD_VOCAB, casesFor } from "./gold";

// ADV-3B. The gold set, tested for the claims made about it rather than for its
// contents.
//
// The claim that matters is that this set carries no real user and no real
// platform data, because that claim is what permits it to reach an external
// model while the agreement gate is closed. No test can prove a negative about
// invented text, so what is tested here is everything that would make the claim
// checkable by a reader: that the set is registered under the id it declares,
// that its vocabulary is its own rather than the loaded location list, that its
// districts are the invented ones, and that the rows obey the same laws the
// answers to them will be graded against.

test("the set is registered, which is what lets a row leave the process", () => {
  assert.ok(SYNTHETIC_SETS.includes(GOLD_SET_ID));
});

test("a part carrying this set is permitted out while the agreement gate is closed", () => {
  const d = buildExternalPrompt([
    { label: "a gold row", dataClass: "synthetic_sample", syntheticSetId: GOLD_SET_ID },
  ]);
  assert.equal(d.allowed, true);
});

test("a synthetic part naming an unregistered set is not", () => {
  const d = buildExternalPrompt([
    { label: "a row", dataClass: "synthetic_sample", syntheticSetId: "some-other-set" },
  ]);
  assert.equal(d.allowed, false);
});

test("every case has an id, and no id is used twice", () => {
  const ids = GOLD_CASES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z]-(en|ar)-\d\d$/);
});

test("every case says why it exists, because a row nobody can justify gets deleted", () => {
  for (const c of GOLD_CASES) assert.ok(c.why.trim().length > 40, c.id);
});

test("all three profiles are covered in both languages", () => {
  for (const p of GOLD_PROFILES) {
    const cases = casesFor(p);
    assert.ok(cases.length >= 4, p);
    assert.ok(
      cases.some((c) => c.locale === "en"),
      `${p} has no English case`
    );
    assert.ok(
      cases.some((c) => c.locale === "ar"),
      `${p} has no Arabic case`
    );
  }
});

test("an Arabic case is written in Arabic and an English one is not", () => {
  const arabic = /[؀-ۿ]/;
  for (const c of GOLD_CASES) {
    if (c.input.trim() === "") continue;
    assert.equal(arabic.test(c.input), c.locale === "ar", c.id);
  }
});

test("the rows obey the laws the answers to them are graded against", () => {
  for (const c of GOLD_CASES) {
    assert.equal(c.input.includes(String.fromCharCode(8212)), false, `${c.id} carries an em dash`);
    assert.equal(/[٠-٩۰-۹]/.test(c.input), false, `${c.id} carries a non-Western numeral`);
  }
});

test("the set states no licence number, so no row can teach a model a wrong one", () => {
  for (const c of GOLD_CASES) {
    assert.equal(/(?<![\d,.])\d{10}(?![\d,.])/.test(c.input), false, c.id);
  }
});

// ------------------------------------------------------- the invented vocabulary

test("the districts are the invented ones and are not a real location list", () => {
  assert.deepEqual(
    GOLD_VOCAB.places.map((p) => p.id),
    ["gold-northgate", "gold-lantern", "gold-sailpoint"]
  );
  for (const p of GOLD_VOCAB.places) assert.match(p.id, /^gold-/);
});

test("every district a case expects is one this file invented", () => {
  const known = new Set(GOLD_VOCAB.places.map((p) => p.id));
  for (const c of casesFor("classification")) {
    if (c.profile !== "classification") continue;
    for (const id of c.expect.placeIds ?? []) assert.ok(known.has(id), `${c.id}: ${id}`);
  }
});

test("every slot value a case expects is one the vocabulary defines", () => {
  const values = (rows: readonly { value: string }[]) => new Set(rows.map((r) => r.value));
  const assets = values(GOLD_VOCAB.assets);
  const grades = values(GOLD_VOCAB.grades);
  const fitouts = values(GOLD_VOCAB.fitouts);
  const deals = values(GOLD_VOCAB.deals);
  const cities = values(GOLD_VOCAB.cities);
  for (const c of casesFor("classification")) {
    if (c.profile !== "classification") continue;
    const e = c.expect;
    if (e.asset) assert.ok(assets.has(e.asset), `${c.id}: ${e.asset}`);
    if (e.grade) assert.ok(grades.has(e.grade), `${c.id}: ${e.grade}`);
    if (e.fitout) assert.ok(fitouts.has(e.fitout), `${c.id}: ${e.fitout}`);
    if (e.deal) assert.ok(deals.has(e.deal), `${c.id}: ${e.deal}`);
    if (e.city) assert.ok(cities.has(e.city), `${c.id}: ${e.city}`);
  }
});

test("an empty case expects nothing else, because empty and specific cannot both be true", () => {
  for (const c of casesFor("classification")) {
    if (c.profile !== "classification" || !c.expect.empty) continue;
    assert.deepEqual(Object.keys(c.expect), ["empty"], c.id);
  }
});

// ------------------------------------------------------------ the prose rules

test("no prose case allows a figure, because Law 3 is the point of the profile", () => {
  for (const c of casesFor("short_prose")) {
    if (c.profile !== "short_prose") continue;
    assert.deepEqual(c.expect.allowedFigures ?? [], [], c.id);
  }
});

test("a translation case names something that must survive it", () => {
  for (const c of casesFor("bilingual_translation")) {
    if (c.profile !== "bilingual_translation") continue;
    assert.ok(c.expect.mustContain.length > 0, c.id);
  }
});

test("anything a translation case says must be preserved is present in its input", () => {
  for (const c of casesFor("bilingual_translation")) {
    if (c.profile !== "bilingual_translation") continue;
    for (const needle of c.expect.preserve ?? []) {
      assert.ok(c.input.includes(needle), `${c.id}: the input never says ${needle}`);
    }
  }
});
