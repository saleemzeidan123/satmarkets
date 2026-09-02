import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * PKG-LISTING-CREATION-1A, post-review correction. Three wiring defects an
 * independent review found that no existing test caught, because each is a
 * property of how a component wires state together, not of any pure function
 * it calls (guidedEvidence.test.ts and provenanceDisplay.test.ts already
 * cover those correctly). Same technique authErrors.test.ts uses for the same
 * reason: read the source, assert the wiring rather than render it.
 */

const ROOT = path.join(__dirname, "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const STUDIO = read("src/components/ListingStudio.tsx");
const DRAFT_PREVIEW = read("src/components/listing/DraftPreview.tsx");
const PREVIEW_ROUTE = read("src/app/[locale]/dashboard/listings/[id]/preview/page.tsx");

test("the mark-unavailable checkbox does not disappear once any photo exists", () => {
  // evidenceMission's per-shot "supplied" reading is a coarse any-photo-exists
  // guess when the caller has no real per-shot data (ListingStudio never
  // does). The checkbox used to be gated on item.state === "awaiting_evidence"
  // || "unavailable", which the coarse guess flips away from the instant one
  // photo existed anywhere, for every shot, hiding the only control that can
  // correct a wrong guess. It must be reachable for every non-optional photo
  // item regardless of the guessed state.
  assert.doesNotMatch(
    STUDIO,
    /item\.state === "awaiting_evidence" ?\|\| ?item\.state === "unavailable"\).*item\.weight !== "optional"/,
    "the checkbox is gated on the coarse guessed state again",
  );
  assert.match(
    STUDIO,
    /\{item\.weight !== "optional" && \(/,
    "the checkbox's only remaining gate should be weight, not the guessed state",
  );
});

test("confirming the Arabic wording actually changes what the draft preview badge shows", () => {
  // The confirm button used to only flip local state that hid itself; the
  // badge read the static server-built presentation prop directly, so it
  // never moved off ai_suggested no matter how many times a lister confirmed.
  assert.match(
    DRAFT_PREVIEW,
    /effectiveArabicProvenance/,
    "the badge should read a value that accounts for this session's confirmation",
  );
  assert.doesNotMatch(
    DRAFT_PREVIEW,
    /ProvenanceBadge value=\{p\.arabicWording\.description\.provenance\}/,
    "the description badge reads the raw, never-updated presentation value again",
  );
  assert.match(
    DRAFT_PREVIEW,
    /confirmedThisSession && base === "ai_suggested" \? "lister_supplied" : base/,
    "the promotion rule should mirror arabicWordingProvenance's own: only ai_suggested promotes, absent stays absent",
  );
});

test("the Arabic title's provenance is shown, not just computed", () => {
  // listingPresentation.ts computes arabicWording.title.provenance and
  // listingPresentation.test.ts asserts it, but neither rendering surface
  // ever read it, despite the package's own stated scope covering title AND
  // description.
  assert.match(
    DRAFT_PREVIEW,
    /titleProvenance/,
    "the draft preview route should render a title provenance badge",
  );
  assert.match(
    STUDIO,
    /arabicWording\.title\.provenance/,
    "the Studio's own inline preview should render a title provenance badge too",
  );
});

test("the preview route no longer carries the dead per-count coverage heuristic", () => {
  // photos.length >= standard.shots.length ? new Set(...) : undefined produced
  // the same result as hasAnyPhoto alone in every case (including zero
  // photos, where both branches agree), so it implied a precision the route
  // does not have. mediaStandardFor's only caller in this file was that dead
  // branch.
  assert.doesNotMatch(PREVIEW_ROUTE, /photoShotsSupplied:/, "the dead coverage heuristic is still here");
  assert.doesNotMatch(PREVIEW_ROUTE, /mediaStandardFor/, "an unused import should not remain after removing its only use");
});
