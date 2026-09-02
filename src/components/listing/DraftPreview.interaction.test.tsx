import "../../test/domEnv"; // must be the first import: sets up jsdom globals before react-dom/client evaluates
import { test } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { buildListingPresentation, type DraftListingInput } from "@/lib/listingPresentation";
import { evidenceMission } from "@/lib/guidedEvidence";
import { getDictionary } from "@/i18n/getDictionary";
import { listingEvidenceByField } from "@/lib/listingEvidence";
import DraftPreview, { type DraftPreviewListingData } from "./DraftPreview";

// Codex review of 9132714, phase A step 3: the existing "regression (e) ...
// both directions" test (DraftPreview.render.test.tsx) renders the component
// TWICE with two different `initialLocale` props via renderToStaticMarkup.
// That proves the server picks the right initial bundle; it does not prove
// clicking the EN/AR control in a mounted component actually re-renders
// anything. This file mounts the real component once with react-dom/client
// into a real (jsdom) DOM and dispatches real `click()` calls at the actual
// button elements, the same event path a browser would take.
//
// WHAT THIS FILE DELIBERATELY DOES NOT ATTEMPT. jsdom implements the DOM
// data model, not a rendering engine: it does not synthesize a click from an
// Enter/Space keydown on a focused <button> (that is default browser
// behavior, not application code), it has no layout engine (no real focus
// ring, no computed touch-target pixel size, no viewport reflow), and a
// same-process mount cannot prove server-side authorization or that data
// actually survives a reload. Keyboard activation, visible focus, touch
// targets, overflow and true Tab order at 320/390/430/768/1280px are
// verified instead on the live, authenticated preview in a real browser
// (see the PR description for that evidence). This file's job is narrower
// and complementary: prove the toggle and review buttons are wired to real
// state, that origin and review truly never affect each other, and that the
// controls are semantically real buttons with non-empty accessible names.

const INPUT: DraftListingInput = {
  asset_type: "office",
  deal_type: "lease",
  area_sqm: 300,
  price: 1600,
  title_en: "Grade A floor, Al Olaya",
  title_ar: "طابق فئة أ، العليا",
  description_en: "A fitted floor with river views.",
  description_ar: "طابق مجهّز بإطلالة على النهر.",
  attributes: {},
  contact_channels: [],
  reference_code: "SATM-TEST0002",
};

const LISTING: DraftPreviewListingData = {
  id: "l2",
  asset_type: "office",
  deal_type: "lease",
  price: 1600,
  area_sqm: 300,
  building_grade: null,
  fitout_condition: null,
  clear_height_m: null,
  loading_docks: null,
  power_kva: null,
  parking_ratio: null,
  civil_defense_approved: null,
  ad_permit_no: null,
  ad_permit_number: null,
  ad_permit_expires_at: null,
  right_to_market_confirmed: false,
  ownership_verified: null,
  authorization_verified: null,
  verified_at: null,
  verified_by: null,
  verification_method: null,
  lister_type: "owner_direct",
  is_demo: null,
};

const EN_GEOGRAPHY = "Al Olaya, Riyadh";
const AR_GEOGRAPHY = "حي العليا، الرياض";

function fixtureProps(): Parameters<typeof DraftPreview>[0] {
  const en = buildListingPresentation(INPUT, "en");
  const ar = buildListingPresentation(INPUT, "ar");
  // Real origin facts, no session context: title_ar and description_ar are
  // both present with no editedThisSession/translatedThisSessionUnedited
  // flag, so arabicWordingOrigin resolves both to "origin_unknown" (present
  // on the record, authorship not observed this session), exactly what
  // buildListingPresentation gets called with in the preview route absent a
  // live Studio session, and exactly the case that makes both review
  // buttons appear so this test can click them independently.
  const items = evidenceMission({ assetType: "office", photoInventory: "empty", attributes: {} });
  const evidence = {
    en: Object.fromEntries(listingEvidenceByField(LISTING, { locale: "en", account: null, geography: EN_GEOGRAPHY })),
    ar: Object.fromEntries(listingEvidenceByField(LISTING, { locale: "ar", account: null, geography: AR_GEOGRAPHY })),
  };
  return {
    status: "published",
    en,
    ar,
    listing: LISTING,
    account: null,
    photos: [] as string[],
    mediaState: "ok" as const,
    unloadedPhotoCount: 0,
    evidenceItems: items,
    evidence,
    initialLocale: "en" as const,
    dict: { en: getDictionary("en"), ar: getDictionary("ar") },
  };
}

function mount(props: Parameters<typeof DraftPreview>[0]) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(React.createElement(DraftPreview, props));
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function click(el: Element | null | undefined) {
  assert.ok(el, "element to click must exist");
  act(() => {
    (el as HTMLElement).click();
  });
}

function buttonByText(container: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.trim() === text);
}

test("interaction: a real click on the AR control, then a real click back on EN, toggles locale, dir, evidence text and geography both directions", () => {
  const { container, unmount } = mount(fixtureProps());
  try {
    const root = container.firstElementChild as HTMLElement;
    assert.equal(root.getAttribute("dir"), "ltr", "starts English/LTR per initialLocale");
    assert.match(container.textContent ?? "", new RegExp(EN_GEOGRAPHY));
    assert.doesNotMatch(container.textContent ?? "", new RegExp(AR_GEOGRAPHY));

    const enBtn = buttonByText(container, "EN")!;
    const arBtn = buttonByText(container, "AR")!;
    assert.equal(enBtn.getAttribute("aria-current"), "true", "EN is the active control before any click");
    assert.equal(arBtn.getAttribute("aria-current"), null);

    click(arBtn);

    assert.equal(root.getAttribute("dir"), "rtl", "a real click on AR flips the root to RTL");
    assert.equal(root.getAttribute("lang"), "ar");
    assert.equal(arBtn.getAttribute("aria-current"), "true", "AR becomes active after the click");
    assert.equal(enBtn.getAttribute("aria-current"), null, "EN stops being active; this is a real state transition, not two static renders");
    assert.match(container.textContent ?? "", new RegExp(AR_GEOGRAPHY), "Arabic geography appears after the click");
    assert.doesNotMatch(container.textContent ?? "", new RegExp(EN_GEOGRAPHY), "English geography is gone, not merely appended to");

    click(enBtn);

    assert.equal(root.getAttribute("dir"), "ltr", "clicking EN flips back");
    assert.equal(enBtn.getAttribute("aria-current"), "true");
    assert.equal(arBtn.getAttribute("aria-current"), null);
    assert.match(container.textContent ?? "", new RegExp(EN_GEOGRAPHY));
    assert.doesNotMatch(container.textContent ?? "", new RegExp(AR_GEOGRAPHY), "toggling back removes the Arabic text rather than leaving both languages on screen");
  } finally {
    unmount();
  }
});

// Both buttons and both labels render in Arabic once the AR control is
// clicked (isAr governs both "which language" and "is a review action
// needed at all"), so the review-independence proof below reads Arabic text
// throughout, not the English strings the component would show in EN.
const AR_REVIEW_TITLE_BTN = "راجعتُ هذا العنوان";
const AR_REVIEW_DESCRIPTION_BTN = "راجعتُ هذا الوصف";
const AR_ORIGIN_UNKNOWN = "المصدر غير مسجَّل";
const AR_UNREVIEWED = "لم تتم مراجعتها بعد";
const AR_REVIEWED = "رُوجعت خلال هذه الجلسة";

test("interaction: reviewing the title is a real click that changes only the title's review label, never its origin, and never the description", () => {
  const { container, unmount } = mount(fixtureProps());
  try {
    click(buttonByText(container, "AR")); // review buttons only render in the Arabic locale

    const titleReviewBtn = buttonByText(container, AR_REVIEW_TITLE_BTN);
    const descriptionReviewBtn = buttonByText(container, AR_REVIEW_DESCRIPTION_BTN);
    assert.ok(titleReviewBtn, "fixture assumption: origin_unknown title needs a review action");
    assert.ok(descriptionReviewBtn, "fixture assumption: origin_unknown description needs a review action");

    const before = container.textContent ?? "";
    assert.match(before, new RegExp(AR_ORIGIN_UNKNOWN), "both fields start as origin_unknown");
    assert.equal((before.match(new RegExp(AR_ORIGIN_UNKNOWN, "g")) ?? []).length, 2, "title and description both show it before either is reviewed");
    assert.equal((before.match(new RegExp(AR_UNREVIEWED, "g")) ?? []).length, 2);

    click(titleReviewBtn);

    const afterTitle = container.textContent ?? "";
    assert.equal((afterTitle.match(new RegExp(AR_ORIGIN_UNKNOWN, "g")) ?? []).length, 2, "origin is untouched by reviewing: still origin_unknown for both fields");
    assert.equal((afterTitle.match(new RegExp(AR_REVIEWED, "g")) ?? []).length, 1, "exactly one field's review flipped");
    assert.equal((afterTitle.match(new RegExp(AR_UNREVIEWED, "g")) ?? []).length, 1, "the description's review is independently still pending");
    assert.equal(buttonByText(container, AR_REVIEW_TITLE_BTN), undefined, "the title's own review action disappears once satisfied");
    assert.ok(buttonByText(container, AR_REVIEW_DESCRIPTION_BTN), "the description's review action is untouched by reviewing the title");

    click(buttonByText(container, AR_REVIEW_DESCRIPTION_BTN));

    const afterBoth = container.textContent ?? "";
    assert.equal((afterBoth.match(new RegExp(AR_ORIGIN_UNKNOWN, "g")) ?? []).length, 2, "origin still untouched after both reviews");
    assert.equal((afterBoth.match(new RegExp(AR_REVIEWED, "g")) ?? []).length, 2, "both fields now independently reviewed");
    assert.equal((afterBoth.match(new RegExp(AR_UNREVIEWED, "g")) ?? []).length, 0);
  } finally {
    unmount();
  }
});

test("interaction: the locale and review controls are real, natively focusable <button> elements with a non-empty accessible name and no tabindex trap", () => {
  const { container, unmount } = mount(fixtureProps());
  try {
    click(buttonByText(container, "AR"));
    const controls = [buttonByText(container, "EN"), buttonByText(container, "AR"), buttonByText(container, AR_REVIEW_TITLE_BTN)];
    for (const btn of controls) {
      assert.ok(btn, "control must exist to be checked");
      assert.equal(btn!.tagName, "BUTTON", "a semantic button gets keyboard activation for free; a styled div would not");
      assert.equal(btn!.getAttribute("type"), "button", "not type=submit, so Enter here cannot accidentally submit a surrounding form");
      assert.ok((btn!.textContent ?? "").trim().length > 0, "visible text content is this button's accessible name");
      const tabIndexAttr = btn!.getAttribute("tabindex");
      assert.ok(tabIndexAttr === null || tabIndexAttr === "0", "no positive tabindex: natural DOM order, no keyboard trap via tab-order override");
      btn!.focus();
      assert.equal(container.ownerDocument.activeElement, btn, "the control can genuinely receive DOM focus");
    }
    const group = container.querySelector('[role="group"]');
    assert.ok(group?.getAttribute("aria-label")?.trim().length, "the locale toggle group has a non-empty accessible name");
  } finally {
    unmount();
  }
});
