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

test("origin and review are two independent fields, never collapsed into one flat display value again", () => {
  // Codex review of 8b9f72d, item 2. Round one (922780d) fixed "review
  // overwrites origin"; round two found the flat ArabicWordingDisplay type
  // itself was still the defect, because collapsing two facts into one
  // field is what let a caller merge them by construction. Neither
  // effectiveArabicDisplay nor ArabicWordingDisplay may exist any more.
  assert.doesNotMatch(DRAFT_PREVIEW, /effectiveArabicDisplay/, "the flat merge-into-one-value helper is back");
  assert.doesNotMatch(DRAFT_PREVIEW, /ArabicWordingDisplay/, "the flat, collapsed display type is back");
  // Origin is read straight from the presentation and never reassigned by
  // this component; review is a separate, independently-computed value.
  assert.match(DRAFT_PREVIEW, /const titleOrigin[^=]*=\s*p\.arabicWording\.title\.origin/, "origin should be read directly, not derived");
  assert.match(DRAFT_PREVIEW, /const titleReview[^=]*=\s*titleReviewed \? "reviewed_this_session" : p\.arabicWording\.title\.review/, "review should merge only the review dimension, never origin");
  // ListingStudio: real, session-observed edits are tracked per field and
  // feed origin; the review buttons are a separate action per field.
  assert.match(STUDIO, /setArabicTitleEditedThisSession/);
  assert.match(STUDIO, /setArabicDescriptionEditedThisSession/);
  assert.match(STUDIO, /setTitleReviewedThisSession/);
  assert.match(STUDIO, /setDescriptionReviewedThisSession/);
});

test("the Arabic title's origin is shown on both preview surfaces, not just computed", () => {
  // listingPresentation.ts computes arabicWording.title.origin and
  // listingPresentation.test.ts asserts it, but an earlier version of
  // neither rendering surface read it (and an even earlier version read a
  // now-removed .display field instead).
  assert.match(DRAFT_PREVIEW, /titleOrigin/, "the draft preview route should render a title origin badge");
  assert.match(STUDIO, /arabicWording\.title\.origin/, "the Studio's own inline preview should render a title origin badge too");
});

test("regression (a) / item 1: no code path infers Arabic origin from ar_translation_status or ar_translated_at any more", () => {
  // Codex review of 8b9f72d item 1's core fix: those two columns prove a
  // translation event happened SOMETIME, never that the CURRENT field still
  // equals that output. Both column names legitimately still appear in this
  // package's own prose explaining why they are no longer read (this file's
  // own paragraph above is one), so this checks for the actual removed DATA
  // FLOW constructs, not the column names as English text: the listing-level
  // record object each file used to build, and the type field that carried
  // it into Studio state.
  assert.doesNotMatch(STUDIO, /arabicOriginRecord/, "the dead listing-level Arabic origin record should no longer be threaded through Studio state");
  assert.doesNotMatch(STUDIO, /ar_translation_status:\s*string/, "StudioInitial should no longer declare a listing-level translation-status field");
  assert.doesNotMatch(PREVIEW_ROUTE, /arabicOriginCtx/, "the dead listing-level Arabic origin context should no longer be built in the preview route");
  assert.doesNotMatch(PREVIEW_ROUTE, /"ar_translation_status", "ar_translated_at"/, "PREVIEW_COLUMNS should no longer select the two listing-level columns");
  // The Studio now reads its own translate() response back, rather than
  // firing it blind, which is what makes a real translatedThisSessionUnedited
  // signal possible at all.
  assert.match(STUDIO, /setArabicTitleTranslatedThisSessionUnedited/, "the Studio should track a real, session-observed translation signal per field");
  assert.match(STUDIO, /\/translate`, \{ method: "POST"/, "save() should still call the translate endpoint");
  assert.match(STUDIO, /\.then\(\(r\) => r\.json\(\)\)/, "save() should read the translate response back instead of firing and forgetting it");
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

test("regression (f) / item 3: the preview query itself is scoped to the caller's own account, not only checked afterward", () => {
  // Codex review of 8b9f72d item 3. The application-level check
  // (`L.account_id !== su.accountId`) must remain as a second boundary, not
  // be replaced by the query constraint; both assertions below must hold at
  // once.
  assert.match(
    PREVIEW_ROUTE,
    /\.eq\("id", params\.id\)\s*\.eq\("account_id", su\.accountId\)/,
    "the listings query should constrain on account_id immediately after id, before .maybeSingle()",
  );
  assert.match(
    PREVIEW_ROUTE,
    /L\.account_id !== su\.accountId/,
    "the application-level ownership check must remain as a second, independent boundary",
  );
});

test("regression (c) and (d) / item 4: photo inventory is driven by the raw row count, and a query failure reads unknown, never empty", () => {
  // (c): a row that exists but whose signed URL failed must still count as
  // present. photoInventory must be computed from photoRows (the raw query
  // result), never from photos.length (only the successfully-signed subset).
  assert.match(
    PREVIEW_ROUTE,
    /\(photoRows \?\? \[\]\)\.length > 0/,
    "photoInventory should be driven by the raw row count, not by how many signed URLs succeeded",
  );
  assert.doesNotMatch(
    PREVIEW_ROUTE,
    /photoInventory[\s\S]{0,80}photos\.length > 0/,
    "photoInventory must not be derived from photos.length, the signed-URL-succeeded subset",
  );
  // (d): a query failure must read "unknown", never silently fall through
  // to "empty".
  assert.match(
    PREVIEW_ROUTE,
    /mediaError \? "unknown"/,
    "a media query failure should map photoInventory to \"unknown\"",
  );
  // The old false-value sentinel (hasAnyPhoto: true forced on a query
  // failure to reach evidenceMission's unknown branch) must be gone
  // entirely, along with the parameter name it was passed under.
  assert.doesNotMatch(PREVIEW_ROUTE, /hasAnyPhoto/, "the old boolean sentinel parameter should no longer be referenced");
  assert.match(PREVIEW_ROUTE, /photoInventory/, "the real tri-state signal should be threaded to evidenceMission");
});

test("PKG-LISTING-CREATION-1B outcome A: the preview route now reads durable evidence marks, not an always-empty unavailable map", () => {
  // Deferred-contracts item 2's own words: this route "has no session to
  // read state from" and "cannot show this promotion at all". The durable
  // listing_evidence_marks ledger closed that; a caller that stopped
  // reading the table, or stopped threading its result into evidenceMission,
  // would silently regress the preview route back to that exact gap.
  assert.match(PREVIEW_ROUTE, /listing_evidence_marks/, "the preview route should read the durable evidence-marks ledger");
  assert.match(PREVIEW_ROUTE, /currentEvidenceMarks/, "the preview route should reduce the ledger with the shared helper, not its own copy of the reduction");
  assert.match(
    PREVIEW_ROUTE,
    /unavailable:\s*unavailableMarks/,
    "the reduced marks must actually be threaded into evidenceMission's unavailable parameter",
  );
});

test("Codex review, item 2: the Studio's own asset-type lock explains evidence-mark reconfirmation, in both languages", () => {
  // The asset_type <select> is disabled once a listing is saved (a
  // different asset type is a different listing), which is also the
  // reason 20260905's own trigger currently has no reachable path through
  // this app's real UI: nothing lets a saved listing's asset_type change
  // today. The trigger is deliberate, real defense in depth for a future
  // admin/correction capability regardless, and this is the one place a
  // lister reads why the field is locked, so the evidence-mark
  // consequence belongs in that same sentence, in both languages, rather
  // than a separate notice for a screen that does not otherwise exist.
  assert.match(STUDIO, /asked for again under the new one/, "the English lock message should name the evidence-mark consequence");
  assert.match(STUDIO, /يُطلب مجدداً/, "the Arabic lock message should name the evidence-mark consequence");
});

test("regression (g) / item 6: the terms section actually attaches evidence now, the exact-preview claim is no longer contradicted", () => {
  assert.match(
    DRAFT_PREVIEW,
    /evidenceKey \? evidenceMap\.get\(evidenceKey\) : undefined/,
    "the terms section should attach a real Evidence Passport for rows that carry an evidenceKey",
  );
  assert.match(DRAFT_PREVIEW, /p\.termsRows/, "the terms section should render the shared listingTermsRows.ts output");
  assert.doesNotMatch(DRAFT_PREVIEW, /p\.commercialRows/, "the old registry-only rows field should no longer be referenced");
});
