import test from "node:test";
import assert from "node:assert/strict";
import {
  ALWAYS_EDITABLE,
  DRAFT_ONLY_EDITABLE,
  NEVER_EDITABLE,
  editableAt,
  mayEdit,
  stageOf,
} from "./listingEdit";

test("only the draft status is a draft, and every other status is public", () => {
  assert.equal(stageOf("draft"), "draft");
  for (const s of ["published", "under_review", "withdrawn", "expired", "", null, undefined]) {
    assert.equal(stageOf(s), "live", `${String(s)} must not read as a draft`);
  }
});

test("the three lists do not overlap, so no field has two rules", () => {
  const all = [...ALWAYS_EDITABLE, ...DRAFT_ONLY_EDITABLE, ...NEVER_EDITABLE];
  assert.equal(new Set(all).size, all.length);
});

test("nothing SAT owns is editable by the lister at any stage", () => {
  for (const field of NEVER_EDITABLE) {
    assert.equal(mayEdit(field, "draft"), false, field);
    assert.equal(mayEdit(field, "live"), false, field);
  }
});

test("a field nobody has heard of is refused rather than allowed", () => {
  for (const field of ["", "drop table", "verified", "account_id ", "LAT"]) {
    assert.equal(mayEdit(field, "draft"), false, field);
    assert.equal(mayEdit(field, "live"), false, field);
  }
});

test("the licence, the pin and the deal type are the lister's while it is a draft and SAT's once it is public", () => {
  for (const field of DRAFT_ONLY_EDITABLE) {
    assert.equal(mayEdit(field, "draft"), true, field);
    assert.equal(mayEdit(field, "live"), false, field);
  }
  // The point of the distinction: a published listing is an advertisement, and
  // the licence number printed on it cannot be swapped without SAT seeing it.
  assert.equal(mayEdit("ad_permit_no", "live"), false);
});

test("what a lister describes and charges stays theirs after publication", () => {
  for (const field of ALWAYS_EDITABLE) {
    assert.equal(mayEdit(field, "draft"), true, field);
    assert.equal(mayEdit(field, "live"), true, field);
  }
});

test("a draft may change strictly more than a live listing, never less", () => {
  const draft = new Set(editableAt("draft"));
  const live = editableAt("live");
  for (const field of live) assert.ok(draft.has(field), field);
  assert.ok(draft.size > live.length, "a draft that could change no more than a live listing needs no stage at all");
});
