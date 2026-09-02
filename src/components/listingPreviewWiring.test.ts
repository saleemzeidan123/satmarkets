import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * PKG-LISTING-CREATION-1A, corrected across two review rounds (Fable's pass
 * at 922780d's predecessor, then Codex's REQUEST CHANGES on 922780d itself).
 * Each test here covers a property of how a component wires state together,
 * not of any pure function it calls (guidedEvidence.test.ts and
 * provenanceDisplay.test.ts already cover those correctly). Same technique
 * authErrors.test.ts uses for the same reason: read the source, assert the
 * wiring rather than render it.
 */

const ROOT = path.join(__dirname, "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const STUDIO = read("src/components/ListingStudio.tsx");
const DRAFT_PREVIEW = read("src/components/listing/DraftPreview.tsx");
const PREVIEW_ROUTE = read("src/app/[locale]/dashboard/listings/[id]/preview/page.tsx");

test("the mark-unavailable checkbox does not disappear once any photo exists", () => {
  // evidenceMission's per-shot fulfilment, absent real per-shot data, is at
  // best "unknown" once any photo exists, never "supplied". The checkbox
  // used to be gated on the guessed state, which hid the only control that
  // can say a shot genuinely does not exist. It must be reachable for every
  // non-optional photo item regardless of fulfilment.
  assert.doesNotMatch(
    STUDIO,
    /item\.fulfilment === "awaiting_evidence" ?\|\| ?item\.fulfilment === "unavailable"\).*item\.weight !== "optional"/,
    "the checkbox is gated on the coarse guessed fulfilment again",
  );
  assert.match(
    STUDIO,
    /\{item\.weight !== "optional" && \(/,
    "the checkbox's only remaining gate should be weight, not the guessed fulfilment",
  );
});

test("requirement and fulfilment are two separate properties, never collapsed into one state", () => {
  // Codex review of 922780d, item 1: the original EvidenceState mixed
  // importance (required/recommended) with fulfilment (supplied/missing),
  // which is how a coarse "supplied" guess came to read as "required and
  // therefore done". Both axes must be distinct fields on every item.
  assert.doesNotMatch(STUDIO, /\bitem\.state\b/, "ListingStudio still reads the collapsed item.state");
  assert.doesNotMatch(DRAFT_PREVIEW, /\bitem\.state\b|\bi\.state\b/, "DraftPreview still reads the collapsed item/i.state");
  assert.match(STUDIO, /item\.requirement/, "ListingStudio should read the requirement axis");
  assert.match(STUDIO, /item\.fulfilment/, "ListingStudio should read the fulfilment axis");
});

test("no named shot's fulfilment is inferred from a raw photo count in the preview route", () => {
  // Codex review of 922780d, item 2. hasAnyPhoto is still passed, but only
  // ever as a signal evidenceMission itself resolves to "unknown" for a
  // named shot, never as a per-shot reconstruction from a count.
  assert.doesNotMatch(PREVIEW_ROUTE, /photoShotsSupplied:/, "the dead per-count coverage heuristic is back");
  assert.doesNotMatch(PREVIEW_ROUTE, /mediaStandardFor/, "an unused import should not remain after removing its only use");
});

test("the mark-unavailable checkbox never counts as evidence the requirement was met", () => {
  // Codex review of 922780d, item 2's closing note: marking an item
  // unavailable is an explanation, never evidence. The checkbox's checked
  // state must read fulfilment === "unavailable", never "supplied".
  assert.match(STUDIO, /checked=\{item\.fulfilment === "unavailable"\}/);
});

test("Arabic review is a distinct action from authorship, and origin is real evidence, not a session guess", () => {
  // Codex review of 922780d, item 3. A lister clicking "reviewed" must never
  // rewrite origin to lister_supplied; only a session-observed direct edit
  // of the field may do that. The draft preview client-side mirrors
  // arabicWordingDisplay's own rule: lister_supplied and not_confirmed are
  // never touched by the review flag.
  assert.match(DRAFT_PREVIEW, /effectiveArabicDisplay/, "the badge should read a value computed with the review overlay");
  assert.doesNotMatch(
    DRAFT_PREVIEW,
    /ArabicWordingBadge value=\{p\.arabicWording\.(title|description)\.display\}/,
    "a badge reads the raw, never-updated presentation value again, bypassing the review overlay",
  );
  assert.match(
    DRAFT_PREVIEW,
    /if \(base === "lister_supplied" \|\| base === "not_confirmed"\) return base;/,
    "the review overlay must never touch a real lister_supplied or an absent value",
  );
  // ListingStudio: real, session-observed edits are tracked per field and
  // feed origin; the review buttons are a separate action per field.
  assert.match(STUDIO, /setArabicTitleEditedThisSession/);
  assert.match(STUDIO, /setArabicDescriptionEditedThisSession/);
  assert.match(STUDIO, /setTitleReviewedThisSession/);
  assert.match(STUDIO, /setDescriptionReviewedThisSession/);
});

test("the Arabic title's display is shown on both preview surfaces, not just computed", () => {
  // listingPresentation.ts computes arabicWording.title.display and
  // listingPresentation.test.ts asserts it, but an earlier version of
  // neither rendering surface read it.
  assert.match(DRAFT_PREVIEW, /titleDisplay/, "the draft preview route should render a title provenance badge");
  assert.match(STUDIO, /arabicWording\.title\.display/, "the Studio's own inline preview should render a title provenance badge too");
});

test("a real draft is never marked demo as a verification shortcut", () => {
  // Codex review of 922780d, item 7: demo status and verification status are
  // different concepts. draftInputFromState must not set is_demo: true
  // unconditionally.
  assert.doesNotMatch(STUDIO, /is_demo:\s*true/, "is_demo is still hardcoded true somewhere in the Studio");
});

test("a media query failure is distinguished from a genuinely empty draft", () => {
  // Codex review of 922780d, item 6: a failed listing_media query must not
  // silently read as zero photos, which would tell the evidence mission (and
  // the lister) that no photos exist when the truth is unknown.
  assert.match(PREVIEW_ROUTE, /error:\s*mediaError/, "the media query's error must be captured, not discarded");
  assert.match(PREVIEW_ROUTE, /mediaState/, "a distinct media state must be threaded to the client");
  assert.match(DRAFT_PREVIEW, /mediaState/, "the draft preview must render the media state distinction");
});

test("an unloaded signed URL is surfaced, not silently skipped", () => {
  assert.match(PREVIEW_ROUTE, /unloadedPhotoCount/, "a signed-URL failure must be counted, not discarded");
  assert.match(DRAFT_PREVIEW, /unloadedPhotoCount/, "the draft preview must disclose unloaded photos");
});

test("the placeholder hero image is visibly labelled, never shown as if it were uploaded evidence", () => {
  // Codex review of 922780d, item 8.
  assert.match(DRAFT_PREVIEW, /heroPlaceholder/);
  assert.match(DRAFT_PREVIEW, /Placeholder image, not an uploaded photo/);
});

test("the draft preview route projects an explicit column list and a minimal client-safe object, not select(\"*\")", () => {
  // Codex review of 922780d, item 9.
  assert.doesNotMatch(PREVIEW_ROUTE, /\.select\("\*"/, "the preview route still selects every column");
  assert.match(PREVIEW_ROUTE, /PREVIEW_COLUMNS/, "an explicit column list should be named");
  assert.match(PREVIEW_ROUTE, /DraftPreviewListingData/, "a minimal typed client-safe object should be built");
  assert.doesNotMatch(DRAFT_PREVIEW, /rawListing/, "the component should no longer accept the raw, unbounded row");
});

test("real Evidence Passports are wired into the draft preview's facts grid", () => {
  // Codex review of 922780d, item 10.
  assert.match(PREVIEW_ROUTE, /listingEvidenceByField/);
  assert.match(DRAFT_PREVIEW, /evidenceMap/);
});
