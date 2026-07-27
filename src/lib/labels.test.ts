import test from "node:test";
import assert from "node:assert/strict";
import { gradePhrase, gradeLabel } from "./labels";

test("gradePhrase disappears when a listing carries no grade", () => {
  // The live defect: a null grade printed the literal N/A into the middle of a
  // meta description, in Arabic as a Latin abbreviation. Absent is absent.
  for (const missing of [null, undefined, "", "n_a"] as const) {
    assert.equal(gradePhrase(missing, "en"), "");
    assert.equal(gradePhrase(missing, "ar"), "");
  }
  // gradeLabel keeps its chip behaviour; only prose changes.
  assert.equal(gradeLabel("n_a", "en"), "N/A");
  assert.equal(gradeLabel("n_a", "ar"), "N/A");
});

test("gradePhrase reads as a phrase in both scripts", () => {
  assert.equal(gradePhrase("a", "en"), "Grade A");
  assert.equal(gradePhrase("a", "ar"), "فئة أ");
  assert.equal(gradePhrase("a_plus", "en"), "Grade A+");
  assert.equal(gradePhrase("a_plus", "ar"), "فئة أ+");
  assert.equal(gradePhrase("b", "en"), "Grade B");
  assert.equal(gradePhrase("b", "ar"), "فئة ب");
  assert.equal(gradePhrase("c", "en"), "Grade C");
  assert.equal(gradePhrase("c", "ar"), "فئة ج");
});

test("gradePhrase carries no Latin script into Arabic prose", () => {
  for (const g of ["a", "a_plus", "b", "c"]) {
    // The plus sign is punctuation, not script. Letters are what must not leak.
    assert.equal(/[A-Za-z]/.test(gradePhrase(g, "ar")), false, g);
  }
});
