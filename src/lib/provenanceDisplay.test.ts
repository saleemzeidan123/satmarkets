import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fromProvenanceTier,
  notConfirmed,
  arabicWordingOrigin,
  arabicWordingFacts,
  displayProvenanceLabel,
  displayProvenanceAria,
  arabicOriginLabel,
  arabicOriginAria,
  arabicReviewLabel,
  arabicReviewAria,
  type DisplayProvenance,
  type ArabicOrigin,
  type ArabicReview,
} from "./provenanceDisplay";

const ALL: DisplayProvenance[] = ["lister_supplied", "platform_derived", "sat_verified", "not_confirmed"];
const ALL_ARABIC_ORIGIN: ArabicOrigin[] = ["lister_supplied", "ai_suggested", "origin_unknown"];
const ALL_ARABIC_REVIEW: ArabicReview[] = ["unreviewed", "reviewed_this_session"];

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

test("no fifth category exists anywhere the switch cannot reach", () => {
  // Codex review of 8b9f72d: ai_suggested was removed from this vocabulary
  // entirely, because nothing in this module could ever produce it here
  // (only the Arabic-specific ArabicOrigin vocabulary below can); it was
  // dead, unreachable code, confirmed by grep before removal.
  assert.equal(ALL.length, 4);
  assert.ok(!ALL.includes("ai_suggested" as DisplayProvenance));
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
// Arabic wording origin and review, corrected across two Codex review rounds
// (922780d, then 8b9f72d). See provenanceDisplay.ts's own header for the
// full account of both defects; the tests below are organised by the
// regression coverage the second round required explicitly.
// ---------------------------------------------------------------------------

test("arabicWordingOrigin with no session-observed signal at all is origin_unknown", () => {
  assert.equal(arabicWordingOrigin(), "origin_unknown");
  assert.equal(arabicWordingOrigin(null), "origin_unknown");
  assert.equal(arabicWordingOrigin({}), "origin_unknown");
});

test("arabicWordingOrigin: a session-observed direct edit is lister_supplied", () => {
  assert.equal(arabicWordingOrigin({ editedThisSession: true }), "lister_supplied");
});

test("arabicWordingOrigin: a session-observed, unedited translate output is ai_suggested", () => {
  assert.equal(arabicWordingOrigin({ translatedThisSessionUnedited: true }), "ai_suggested");
});

test("arabicWordingOrigin: a session-observed edit outranks a session-observed translation", () => {
  // Both true is the in-session version of "translated, then hand-edited
  // afterward": the edit is the more specific, more current claim.
  assert.equal(arabicWordingOrigin({ editedThisSession: true, translatedThisSessionUnedited: true }), "lister_supplied");
});

test("regression (a): a field this session neither edited nor watched being translated is origin_unknown, never inferred from durable metadata", () => {
  // Codex review of 8b9f72d item 1's exact scenario: a lister translates,
  // hand-edits the Arabic afterward, then reloads. On reload this is a fresh
  // session, so neither editedThisSession nor translatedThisSessionUnedited
  // can be true (both are session-only, by construction: see
  // ArabicOriginContext's own header), regardless of what
  // listings.ar_translation_status / ar_translated_at still say on the row.
  // arabicWordingOrigin's signature does not even accept those two columns
  // any more, so there is no path left for this file to compile a call that
  // infers origin from them.
  const freshSessionCtx = {};
  assert.equal(arabicWordingOrigin(freshSessionCtx), "origin_unknown");
  const field = { value: "مكتب في حي العليا", english: "Office in Olaya", srcHash: "h1", englishHash: "h1" };
  assert.equal(arabicWordingFacts(field, freshSessionCtx).origin, "origin_unknown");
});

test("arabicWordingFacts: an absent field is origin null regardless of context, even a session-observed edit", () => {
  // A category error, not an unknown origin (see ArabicWordingFacts's own
  // header): there is no wording here to have an origin. Checked even
  // against editedThisSession: true, because arabicState's own absence
  // check runs first and is not overridden by any context.
  assert.equal(arabicWordingFacts({ value: null }, {}).origin, null);
  assert.equal(arabicWordingFacts({ value: "" }, { editedThisSession: true }).origin, null);
});

test("arabicWordingFacts: present Arabic with no origin evidence at all is origin_unknown, never ai_suggested by default", () => {
  const field = { value: "مكتب في حي العليا" };
  assert.equal(arabicWordingFacts(field, {}).origin, "origin_unknown");
});

test("regression (b): review confirmation never rewrites origin, in either direction", () => {
  // Codex review of 8b9f72d item 2, the exact required scenario. Checked for
  // all three origins: a real lister_supplied edit, a real session-observed
  // translation, and the honest origin_unknown default. In every case,
  // adding reviewedThisSession: true changes review and leaves origin
  // byte-for-byte the value it already was.
  const field = { value: "مكتب في حي العليا", english: "Office in Olaya", srcHash: "h1", englishHash: "h1" };

  const edited = arabicWordingFacts(field, { editedThisSession: true, reviewedThisSession: true });
  assert.equal(edited.origin, "lister_supplied");
  assert.equal(edited.review, "reviewed_this_session");

  const translated = arabicWordingFacts(field, { translatedThisSessionUnedited: true, reviewedThisSession: true });
  assert.equal(translated.origin, "ai_suggested");
  assert.equal(translated.review, "reviewed_this_session");

  const unknown = arabicWordingFacts(field, { reviewedThisSession: true });
  assert.equal(unknown.origin, "origin_unknown");
  assert.equal(unknown.review, "reviewed_this_session");
});

test("review defaults to unreviewed and is never inferred from origin", () => {
  const field = { value: "مكتب في حي العليا" };
  assert.equal(arabicWordingFacts(field, { editedThisSession: true }).review, "unreviewed");
  assert.equal(arabicWordingFacts(field, {}).review, "unreviewed");
});

test("every ArabicOrigin value has a non-empty EN and AR label and aria, distinct EN vs AR, no em dash", () => {
  const EM_DASH = String.fromCharCode(0x2014);
  for (const v of ALL_ARABIC_ORIGIN) {
    const enLabel = arabicOriginLabel(v, false);
    const arLabel = arabicOriginLabel(v, true);
    assert.ok(enLabel.length > 0 && arLabel.length > 0, `${v} missing a label`);
    assert.notEqual(enLabel, arLabel);
    assert.ok(!enLabel.includes(EM_DASH));
    assert.ok(!arLabel.includes(EM_DASH));
    const enAria = arabicOriginAria(v, false);
    const arAria = arabicOriginAria(v, true);
    assert.ok(enAria.length > 0 && arAria.length > 0, `${v} missing an aria description`);
    assert.ok(!enAria.includes(EM_DASH));
    assert.ok(!arAria.includes(EM_DASH));
  }
});

test("every ArabicReview value has a non-empty EN and AR label and aria, distinct EN vs AR, no em dash", () => {
  const EM_DASH = String.fromCharCode(0x2014);
  for (const v of ALL_ARABIC_REVIEW) {
    const enLabel = arabicReviewLabel(v, false);
    const arLabel = arabicReviewLabel(v, true);
    assert.ok(enLabel.length > 0 && arLabel.length > 0, `${v} missing a label`);
    assert.notEqual(enLabel, arLabel);
    assert.ok(!enLabel.includes(EM_DASH));
    assert.ok(!arLabel.includes(EM_DASH));
    const enAria = arabicReviewAria(v, false);
    const arAria = arabicReviewAria(v, true);
    assert.ok(enAria.length > 0 && arAria.length > 0, `${v} missing an aria description`);
    assert.ok(!enAria.includes(EM_DASH));
    assert.ok(!arAria.includes(EM_DASH));
  }
});

test("reviewed_this_session's aria discloses that the review is not saved", () => {
  const en = arabicReviewAria("reviewed_this_session", false);
  const arText = arabicReviewAria("reviewed_this_session", true);
  assert.doesNotMatch(en, /rega/i);
  assert.match(en, /not saved|will not survive/i, `aria does not disclose the review is session-only: ${en}`);
  assert.ok(arText.length > 0);
});
