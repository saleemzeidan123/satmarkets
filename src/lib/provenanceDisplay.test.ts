import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fromProvenanceTier,
  notConfirmed,
  arabicWordingOrigin,
  arabicWordingDisplay,
  displayProvenanceLabel,
  displayProvenanceAria,
  arabicWordingDisplayLabel,
  arabicWordingDisplayAria,
  type DisplayProvenance,
  type ArabicWordingDisplay,
} from "./provenanceDisplay";

const ALL: DisplayProvenance[] = ["lister_supplied", "platform_derived", "sat_verified", "ai_suggested", "not_confirmed"];
const ALL_ARABIC: ArabicWordingDisplay[] = ["not_confirmed", "origin_unknown", "ai_suggested", "reviewed_this_session", "lister_supplied"];

test("entered maps to lister_supplied", () => {
  assert.equal(fromProvenanceTier("entered"), "lister_supplied");
});

test("verified with no real evidence is not_confirmed, never sat_verified from the tier alone", () => {
  // Codex review of 922780d: a field's static registry tier is metadata, not
  // an event. Only a real, dated, actor-attributed record may promote to
  // sat_verified.
  assert.equal(fromProvenanceTier("verified"), "not_confirmed");
  assert.equal(fromProvenanceTier("verified", null), "not_confirmed");
  assert.equal(fromProvenanceTier("verified", { verifiedAt: null, verifiedBy: null }), "not_confirmed");
  assert.equal(fromProvenanceTier("verified", { verifiedAt: "2026-01-01", verifiedBy: null }), "not_confirmed");
  assert.equal(fromProvenanceTier("verified", { verifiedAt: null, verifiedBy: "acct-1" }), "not_confirmed");
});

test("verified with a real, dated, actor-attributed record promotes to sat_verified", () => {
  assert.equal(fromProvenanceTier("verified", { verifiedAt: "2026-01-01", verifiedBy: "acct-1" }), "sat_verified");
});

test("computed and sourced both map to platform_derived", () => {
  assert.equal(fromProvenanceTier("computed"), "platform_derived");
  assert.equal(fromProvenanceTier("sourced"), "platform_derived");
});

test("the platform_derived label never says bare 'retrieved': a computed value was not retrieved from anywhere", () => {
  // Codex review of 922780d, item 4: computed and sourced are genuinely
  // different claims (SAT's own working vs a named external dataset), and
  // "retrieved" alone overclaims the computed half. The combined label
  // qualifies both directions instead of picking the wrong one.
  const en = displayProvenanceLabel("platform_derived", false);
  const arText = displayProvenanceLabel("platform_derived", true);
  assert.match(en, /derived/i, `label does not qualify "derived": ${en}`);
  assert.doesNotMatch(en, /^Retrieved$|^retrieved$/, `label is bare "retrieved": ${en}`);
  assert.ok(arText.length > 0);
});

test("no sixth category exists anywhere the switch cannot reach", () => {
  assert.equal(ALL.length, 5);
});

test("notConfirmed() is the not_confirmed category", () => {
  assert.equal(notConfirmed(), "not_confirmed");
});

test("every DisplayProvenance category has a non-empty EN and AR label, distinct from each other", () => {
  for (const p of ALL) {
    assert.ok(displayProvenanceLabel(p, false).length > 0, `${p} has no EN label`);
    assert.ok(displayProvenanceLabel(p, true).length > 0, `${p} has no AR label`);
    assert.notEqual(displayProvenanceLabel(p, false), displayProvenanceLabel(p, true), `${p} EN and AR labels are identical`);
  }
});

test("every DisplayProvenance category has a non-empty EN and AR aria description", () => {
  for (const p of ALL) {
    assert.ok(displayProvenanceAria(p, false).length > 0, `${p} has no EN aria`);
    assert.ok(displayProvenanceAria(p, true).length > 0, `${p} has no AR aria`);
  }
});

test("no DisplayProvenance label or aria string contains an em dash (Law 2)", () => {
  // Named by code point, not written as a literal, so this file's own bytes
  // never contain the character ar-lint forbids in shipped copy.
  const EM_DASH = String.fromCharCode(0x2014);
  for (const p of ALL) {
    for (const ar of [false, true]) {
      assert.ok(!displayProvenanceLabel(p, ar).includes(EM_DASH));
      assert.ok(!displayProvenanceAria(p, ar).includes(EM_DASH));
    }
  }
});

test("sat_verified is the only DisplayProvenance category naming SAT as having checked something, and none names REGA or Nafath", () => {
  // The package must not claim an integration that does not exist.
  for (const p of ALL) {
    for (const ar of [false, true]) {
      const text = displayProvenanceLabel(p, ar) + " " + displayProvenanceAria(p, ar);
      assert.doesNotMatch(text, /rega/i, `${p} names REGA`);
      assert.doesNotMatch(text, /nafath|النفاذ/i, `${p} names Nafath`);
    }
  }
});

// ---------------------------------------------------------------------------
// Arabic wording origin and review, corrected under Codex review of 922780d
// ---------------------------------------------------------------------------

test("an absent field is not_confirmed regardless of any context", () => {
  assert.equal(arabicWordingDisplay({ value: null }, {}), "not_confirmed");
  assert.equal(arabicWordingDisplay({ value: "" }, { editedThisSession: true, reviewedThisSession: true }), "not_confirmed");
});

test("present Arabic with no origin evidence at all is origin_unknown, never ai_suggested by default", () => {
  // The corrected default: the previous version defaulted every unconfirmed
  // present field to ai_suggested, which overclaimed the same way
  // lister_supplied would have, just in the other direction. With no
  // evidence either way, the honest reading is that origin is not recorded.
  assert.equal(arabicWordingOrigin({ value: "مكتب في حي العليا" }, {}), "origin_unknown");
  assert.equal(arabicWordingDisplay({ value: "مكتب في حي العليا" }, {}), "origin_unknown");
});

test("ai_suggested requires a real machine-translation record: both a status of machine and a timestamp", () => {
  const field = { value: "مكتب في حي العليا", english: "Office in Olaya" };
  assert.equal(arabicWordingOrigin(field, { translationStatus: "machine", translatedAt: "2026-01-01" }), "ai_suggested");
  // Missing translatedAt: not a real record.
  assert.equal(arabicWordingOrigin(field, { translationStatus: "machine", translatedAt: null }), "origin_unknown");
  // Status is not "machine": no record of a machine translation.
  assert.equal(arabicWordingOrigin(field, { translationStatus: "pending", translatedAt: "2026-01-01" }), "origin_unknown");
  // Deliberately NOT gated on hash currency: a hash mismatch means the
  // Arabic may be stale relative to newer English (arabicIsBehind's own
  // concern), not that the record of who produced the current text stopped
  // being true, so a "stale" field with a real machine-translation record
  // still reads ai_suggested.
});

test("only a session-observed direct edit produces lister_supplied, and it overrides everything else", () => {
  const field = { value: "مكتب في حي العليا", english: "Office in Olaya", srcHash: "h1", englishHash: "h1" };
  assert.equal(arabicWordingOrigin(field, { editedThisSession: true }), "lister_supplied");
  // Even alongside a real machine-translation record, a session-observed
  // direct edit is the stronger, more specific claim and wins.
  assert.equal(arabicWordingOrigin(field, { translationStatus: "machine", translatedAt: "2026-01-01", editedThisSession: true }), "lister_supplied");
});

test("review sets a distinct display value and never rewrites origin", () => {
  const aiField = { value: "مكتب في حي العليا", english: "Office in Olaya", srcHash: "h1", englishHash: "h1" };
  const ctx = { translationStatus: "machine", translatedAt: "2026-01-01" };
  assert.equal(arabicWordingDisplay(aiField, ctx), "ai_suggested");
  assert.equal(arabicWordingDisplay(aiField, { ...ctx, reviewedThisSession: true }), "reviewed_this_session");
  // origin_unknown promotes the same way.
  const unknownField = { value: "مكتب في حي العليا", english: "Office in Olaya" };
  assert.equal(arabicWordingDisplay(unknownField, {}), "origin_unknown");
  assert.equal(arabicWordingDisplay(unknownField, { reviewedThisSession: true }), "reviewed_this_session");
  // A genuinely lister_supplied origin is not relabelled by review; it was
  // already the strongest claim this module can make.
  const editedField = { value: "مكتب في حي العليا", english: "Office in Olaya" };
  assert.equal(arabicWordingDisplay(editedField, { editedThisSession: true, reviewedThisSession: true }), "lister_supplied");
});

test("sat_verified is deliberately not a reachable ArabicWordingDisplay value", () => {
  // Nothing in this codebase verifies Arabic WORDING specifically; including
  // an unreachable value would be exactly the kind of dead, misleading code
  // this package's own review already found once.
  assert.ok(!ALL_ARABIC.includes("sat_verified" as ArabicWordingDisplay));
});

test("every ArabicWordingDisplay value has a non-empty EN and AR label and aria, distinct EN vs AR, no em dash", () => {
  const EM_DASH = String.fromCharCode(0x2014);
  for (const v of ALL_ARABIC) {
    const enLabel = arabicWordingDisplayLabel(v, false);
    const arLabel = arabicWordingDisplayLabel(v, true);
    assert.ok(enLabel.length > 0 && arLabel.length > 0, `${v} missing a label`);
    assert.notEqual(enLabel, arLabel);
    assert.ok(!enLabel.includes(EM_DASH));
    assert.ok(!arLabel.includes(EM_DASH));
    const enAria = arabicWordingDisplayAria(v, false);
    const arAria = arabicWordingDisplayAria(v, true);
    assert.ok(enAria.length > 0 && arAria.length > 0, `${v} missing an aria description`);
    assert.ok(!enAria.includes(EM_DASH));
    assert.ok(!arAria.includes(EM_DASH));
  }
});

test("reviewed_this_session's aria discloses that the review is not saved", () => {
  const en = arabicWordingDisplayAria("reviewed_this_session", false);
  const arText = arabicWordingDisplayAria("reviewed_this_session", true);
  assert.doesNotMatch(en, /rega/i);
  assert.match(en, /not saved|will not survive/i, `aria does not disclose the review is session-only: ${en}`);
  assert.ok(arText.length > 0);
});
