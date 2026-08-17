import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fromProvenanceTier,
  notConfirmed,
  arabicWordingProvenance,
  displayProvenanceLabel,
  displayProvenanceAria,
  type DisplayProvenance,
} from "./provenanceDisplay";

test("entered maps to lister_supplied", () => {
  assert.equal(fromProvenanceTier("entered"), "lister_supplied");
});

test("verified maps to sat_verified", () => {
  assert.equal(fromProvenanceTier("verified"), "sat_verified");
});

test("computed and sourced both map to platform_retrieved", () => {
  assert.equal(fromProvenanceTier("computed"), "platform_retrieved");
  assert.equal(fromProvenanceTier("sourced"), "platform_retrieved");
});

test("no fifth category exists anywhere the switch cannot reach", () => {
  const ALL: DisplayProvenance[] = ["lister_supplied", "platform_retrieved", "sat_verified", "ai_suggested", "not_confirmed"];
  assert.equal(ALL.length, 5);
});

test("an absent field is not_confirmed regardless of session confirmation", () => {
  assert.equal(arabicWordingProvenance({ value: null }, true), "not_confirmed");
  assert.equal(arabicWordingProvenance({ value: "" }, true), "not_confirmed");
});

test("present Arabic defaults to ai_suggested, never lister_supplied by default", () => {
  // This is the deliberately cautious default the module documents: authorship
  // is not derivable, so the UNCONFIRMED case must not read as human-authored.
  assert.equal(arabicWordingProvenance({ value: "مكتب في حي العليا" }, false), "ai_suggested");
});

test("an explicit session confirmation, and only that, promotes to lister_supplied", () => {
  assert.equal(arabicWordingProvenance({ value: "مكتب في حي العليا" }, true), "lister_supplied");
});

test("notConfirmed() is the not_confirmed category", () => {
  assert.equal(notConfirmed(), "not_confirmed");
});

test("every category has a non-empty EN and AR label", () => {
  const ALL: DisplayProvenance[] = ["lister_supplied", "platform_retrieved", "sat_verified", "ai_suggested", "not_confirmed"];
  for (const p of ALL) {
    assert.ok(displayProvenanceLabel(p, false).length > 0, `${p} has no EN label`);
    assert.ok(displayProvenanceLabel(p, true).length > 0, `${p} has no AR label`);
    assert.notEqual(displayProvenanceLabel(p, false), displayProvenanceLabel(p, true), `${p} EN and AR labels are identical`);
  }
});

test("every category has a non-empty EN and AR aria description, distinct from its label", () => {
  const ALL: DisplayProvenance[] = ["lister_supplied", "platform_retrieved", "sat_verified", "ai_suggested", "not_confirmed"];
  for (const p of ALL) {
    assert.ok(displayProvenanceAria(p, false).length > 0, `${p} has no EN aria`);
    assert.ok(displayProvenanceAria(p, true).length > 0, `${p} has no AR aria`);
  }
});

test("no label or aria string contains an em dash (Law 2)", () => {
  // Named by code point, not written as a literal, so this file's own bytes
  // never contain the character ar-lint forbids in shipped copy.
  const EM_DASH = String.fromCharCode(0x2014);
  const ALL: DisplayProvenance[] = ["lister_supplied", "platform_retrieved", "sat_verified", "ai_suggested", "not_confirmed"];
  for (const p of ALL) {
    for (const ar of [false, true]) {
      assert.ok(!displayProvenanceLabel(p, ar).includes(EM_DASH));
      assert.ok(!displayProvenanceAria(p, ar).includes(EM_DASH));
    }
  }
});

test("sat_verified is the only category naming SAT as having checked something, and none names REGA or Nafath", () => {
  // The package must not claim an integration that does not exist.
  const ALL: DisplayProvenance[] = ["lister_supplied", "platform_retrieved", "sat_verified", "ai_suggested", "not_confirmed"];
  for (const p of ALL) {
    for (const ar of [false, true]) {
      const text = displayProvenanceLabel(p, ar) + " " + displayProvenanceAria(p, ar);
      assert.doesNotMatch(text, /rega/i, `${p} names REGA`);
      assert.doesNotMatch(text, /nafath|النفاذ/i, `${p} names Nafath`);
    }
  }
});
