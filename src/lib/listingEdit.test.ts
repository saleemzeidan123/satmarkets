import test from "node:test";
import assert from "node:assert/strict";
import {
  ALWAYS_EDITABLE,
  DRAFT_ONLY_EDITABLE,
  NEVER_EDITABLE,
  editableAt,
  mayEdit,
  mayFillAbsent,
  FILLABLE_WHEN_ABSENT,
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

// PKG-LS3. The narrow third category: a fact that was never supplied may be
// supplied, and a fact that exists is still SAT's to change.
test("a pin that was never placed may be placed on a live listing, and one that exists may not be moved", () => {
  assert.equal(mayFillAbsent("lat", "live", false), true);
  assert.equal(mayFillAbsent("lng", "live", false), true);
  assert.equal(mayFillAbsent("lat", "live", true), false);
  assert.equal(mayFillAbsent("lng", "live", true), false);
});

test("filling when absent never narrows what mayEdit already allows", () => {
  for (const field of [...ALWAYS_EDITABLE, ...DRAFT_ONLY_EDITABLE]) {
    for (const stage of ["draft", "live"] as const) {
      if (!mayEdit(field, stage)) continue;
      assert.equal(mayFillAbsent(field, stage, true), true, `${field} at ${stage} with a value`);
      assert.equal(mayFillAbsent(field, stage, false), true, `${field} at ${stage} with none`);
    }
  }
});

test("the district does not travel with the first pin", () => {
  // The pin implies a district, but every published listing already carries one
  // and that district is what places it in search. Deriving a new one from a
  // first pin would substitute a fact readers rely on while looking like an
  // addition, so district_id stays draft-only at every value.
  assert.ok(!FILLABLE_WHEN_ABSENT.includes("district_id"));
  assert.equal(mayFillAbsent("district_id", "live", false), false);
  assert.equal(mayFillAbsent("district_id", "draft", false), true);
});

test("filling when absent fails closed on a field nobody declared", () => {
  for (const field of ["owner_verified", "status", "account_id", "column_added_next_year"]) {
    assert.equal(mayFillAbsent(field, "live", false), false, field);
    assert.equal(mayFillAbsent(field, "draft", false), false, field);
  }
});
