import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * Item 8: the mobile filter sheet. Regression coverage for the checklist
 * named verbatim: "correct dialog labelling; aria-expanded and control
 * relationship; initial focus; contained keyboard focus; Escape dismissal;
 * focus restoration; backdrop behavior; background scroll locking; RTL
 * placement; reduced-motion behavior; no overflow at 320, 360, 390 and 430
 * pixels."
 *
 * WHY SOURCE-LEVEL, AND WHAT THAT DOES NOT PROVE. `npm test` has no React
 * renderer and no browser, so nothing here clicks a pill, presses Tab, or
 * measures a rendered box at a given viewport width; this is deterministic
 * fixture reading of the component's own source and the stylesheet it
 * depends on, the same pattern `laws.test.ts` and `reflow.test.ts` use for
 * the same reason. It proves the intended behaviour is wired in (the right
 * ARIA attributes are present, the right effects exist and are gated
 * correctly, the CSS has no fixed floor that would overflow a 320px
 * viewport); it does not substitute for an actual narrow-viewport,
 * screen-reader or physical-device pass, and no such pass is claimed here.
 */

const FILE = path.join(__dirname, "FilterBar.tsx");
const SRC = fs.readFileSync(FILE, "utf8");
const CSS = fs.readFileSync(path.join(__dirname, "../styles/sat-platform.css"), "utf8");
const GLOBALS_CSS = fs.readFileSync(path.join(__dirname, "../styles/globals.css"), "utf8");

test("mobile sheet: correct dialog labelling (role, aria-modal, aria-labelledby pointing at a real heading id)", () => {
  assert.match(SRC, /role="dialog"/, "the mobile sheet must carry role=\"dialog\"");
  assert.match(SRC, /aria-modal="true"/, "the mobile sheet must carry aria-modal=\"true\"");
  assert.match(SRC, /aria-labelledby=\{PANEL_TITLE_ID\}/, "the mobile sheet must be labelled by a real heading id, not aria-label copy that can drift from the visible title");
  assert.match(SRC, /id=\{PANEL_TITLE_ID\}/, "PANEL_TITLE_ID must actually be assigned to an element (the sheet's own heading)");
});

test("mobile sheet: the triggering pill's aria-expanded / aria-controls relationship is preserved, and both sheet and desktop panel share the one id it names", () => {
  assert.match(SRC, /aria-expanded=\{open === key\}/, "each pill must still report its own expanded state");
  assert.match(SRC, /aria-controls=\{open === key \? PANEL_ID : undefined\}/, "each pill must still point aria-controls at the panel it opens");
  // Both render branches (mobile sheet, desktop popup) must use the SAME
  // PANEL_ID, or a pill's aria-controls would point at an id that does not
  // exist in whichever mode is actually rendering.
  const idAssignments = Array.from(SRC.matchAll(/id=\{PANEL_ID\}/g));
  assert.equal(idAssignments.length, 2, `expected PANEL_ID assigned in exactly two places (mobile sheet + desktop popup), found ${idAssignments.length}`);
});

test("mobile sheet: initial focus lands in the sheet, except the location panel which keeps its own search-input autoFocus", () => {
  assert.match(SRC, /closeBtnRef\.current\?\.focus\(\)/, "opening the sheet must move focus to the close button");
  // The effect that does this must explicitly skip the "loc" panel, or it
  // would fight the location search input's autoFocus and steal focus back
  // to the close button after the input already claimed it.
  assert.match(SRC, /if \(!open \|\| !isMobileSheet \|\| open === "loc"\) return;\s*\n\s*closeBtnRef\.current\?\.focus\(\);/, "the initial-focus effect must skip the location panel");
});

test("mobile sheet: contained keyboard focus. Tab and Shift+Tab wrap within the sheet, gated to mobile-open only", () => {
  assert.match(SRC, /if \(e\.key !== "Tab"\) return;/, "a Tab-trap handler must exist");
  assert.match(SRC, /root\.querySelectorAll<HTMLElement>/, "the trap must query the sheet's own focusable elements, not the whole document");
  assert.match(SRC, /if \(!open \|\| !isMobileSheet\) return;\s*\n\s*const onKey = \(e: KeyboardEvent\) => \{\s*\n\s*if \(e\.key !== "Tab"\)/, "the Tab trap must be gated to open && isMobileSheet, so it never runs against the desktop popup");
});

test("mobile sheet: Escape dismissal, and it is not scoped only to mobile (desktop keeps the same behaviour it already had)", () => {
  // UX closure item 1/5 (the mobile Location sheet repair and the "All
  // filters" two-level sheet) replaced the scattered `setOpen(null)` calls
  // (Escape, outside click, nav(), clearAll(), the close button, the
  // backdrop) with one `closeSheet()` helper, so a category drilled into
  // from "All filters" and its own back-navigation share one definition of
  // "closed" instead of the two being able to drift apart. `closeSheet`
  // itself still resolves to `setOpen(null)` underneath; that assertion
  // moves to the dedicated test below rather than disappearing.
  assert.match(SRC, /const closeSheet = \(\) => \{ setOpen\(null\); setCameFromAll\(false\); \};/, "closeSheet must reset both the open panel and the All-filters drill-down state");
  assert.match(SRC, /if \(e\.key === "Escape"\) closeSheet\(\);/, "Escape must close the open panel via closeSheet");
});

test("mobile sheet: focus restoration returns to the pill that opened the panel", () => {
  // Pre-existing behaviour (ELITE-4 J3-16), re-asserted here because the
  // mobile sheet reuses the same `open` state machine rather than a second,
  // parallel one; if that ever forks, this is the test that would catch the
  // sheet losing the restoration its desktop sibling already has.
  assert.match(SRC, /el\.focus\(\)/, "closing the panel must be able to refocus the pill that opened it");
  assert.match(SRC, /pillRefs\.current\[prev\]/, "focus restoration must read the SAME pillRefs map the mobile sheet's close button and Tab trap also operate within");
});

test("mobile sheet: backdrop is present, dismisses on click, and is distinct from the existing outside-click listener", () => {
  assert.match(SRC, /className="fb-sheet-backdrop"/, "a backdrop element must render in mobile mode");
  // Same closeSheet() consolidation as the Escape test above.
  assert.match(SRC, /className="fb-sheet-backdrop" onClick=\{closeSheet\}/, "the backdrop must dismiss the sheet on click, via closeSheet");
  assert.match(CSS, /\.fb-sheet-backdrop\{[^}]*position:fixed;inset:0/, "the backdrop must cover the full viewport");
});

test("mobile sheet: background scroll locking is gated to open && isMobileSheet, and restores the prior values on cleanup", () => {
  // This originally asserted `document.body.style.overflow = "hidden"` and
  // nothing else, which is exactly the shape of the defect the live matrix
  // found: this document scrolls on <html>, so locking <body> alone locked
  // nothing and the page scrolled behind an open sheet. The assertion is kept
  // but widened to the whole invariant, so the weaker mechanism cannot come
  // back and still satisfy it.
  assert.match(SRC, /doc\.style\.overflow = "hidden"/, "the scrolling element (documentElement) must be locked, not body alone");
  assert.match(SRC, /body\.style\.overflow = "hidden"/, "the body lock is still required alongside it");
  assert.match(SRC, /body\.style\.position = "fixed"/, "iOS Safari ignores overflow:hidden as a scroll lock; the body must be pinned");
  assert.match(SRC, /doc\.style\.overflow = prev\.htmlOverflow/, "closing must restore the PRIOR value, not unconditionally clear it");
  assert.match(SRC, /body\.style\.overflow = prev\.bodyOverflow/, "closing must restore the PRIOR body overflow");
  assert.match(SRC, /if \(!open \|\| !isMobileSheet\) return;/, "the scroll lock must be gated to open && isMobileSheet, so desktop never locks the page");
});

test("mobile sheet: RTL placement uses logical CSS, never a hardcoded left/right on the sheet chrome", () => {
  const sheetBlock = /\.fb-sheet\{[^}]*\}/.exec(CSS)?.[0] ?? "";
  const headBlock = /\.fb-sheet-head\{[^}]*\}/.exec(CSS)?.[0] ?? "";
  assert.match(CSS, /\.fb-sheet\{[^}]*inset-inline:0/, "the sheet must be positioned with the logical inset-inline, not left/right");
  for (const block of [sheetBlock, headBlock]) {
    assert.doesNotMatch(block, /(?<!inset-)\bleft\s*:/, `a physical left: property was found in FilterBar's sheet CSS: ${block}`);
    assert.doesNotMatch(block, /(?<!inset-)\bright\s*:/, `a physical right: property was found in FilterBar's sheet CSS: ${block}`);
  }
  // The close button's placement comes from flexbox's own logical
  // start/end (justify-content:space-between on a row), which mirrors
  // automatically under dir="rtl" with no separate rule required.
  assert.match(CSS, /\.fb-sheet-head\{[^}]*justify-content:space-between/, "the sheet header must place the close button via flex justify-content, not a physical-side offset");
});

test("mobile sheet: reduced-motion behaviour comes from the one site-wide kill switch, not a second bespoke rule", () => {
  assert.match(CSS, /\.fb-sheet-backdrop\{[^}]*animation:/, "the backdrop should animate in (opacity fade)");
  assert.match(CSS, /\.fb-sheet\{[^}]*animation:/, "the sheet should animate in (slide up)");
  // The FilterBar-specific CSS block deliberately carries no
  // prefers-reduced-motion rule of its own: globals.css's global kill switch
  // (`*,*::before,*::after{animation-duration:.01ms!important;...}`) already
  // neutralises every animation on the platform under reduced motion,
  // including these two, and a second bespoke rule here would just be a
  // second place that same behaviour could drift out of sync.
  assert.match(GLOBALS_CSS, /@media\(prefers-reduced-motion:reduce\)\{\*,\*::before,\*::after\{animation-duration:\.01ms\s*!important/, "the site-wide reduced-motion kill switch this component relies on is missing or has changed shape");
});

test("mobile sheet: no fixed pixel floor on the sheet or backdrop that could overflow a 320px viewport", () => {
  const sheetBlock = /\.fb-sheet\{[^}]*\}/.exec(CSS)?.[0] ?? "";
  // inset-inline:0 makes the sheet exactly the viewport's width at any size;
  // a `width:` declaration here would be a second, possibly conflicting,
  // source of truth for that dimension.
  assert.doesNotMatch(sheetBlock, /\bwidth\s*:/, "the sheet must not declare its own width; inset-inline:0 already pins it to the full viewport");
  assert.doesNotMatch(sheetBlock, /\bmin-width\s*:\s*[0-9]/, "the sheet must not declare a fixed min-width, which would overflow below that width");
});
