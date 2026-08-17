import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * Regression coverage for the three defect classes the live 320px and 390px
 * EN/AR discovery matrix confirmed: the footer CTA row clipping at 320px in
 * English, the filter sheet failing to lock the background, and standalone
 * controls under the 44px touch floor.
 *
 * WHY SOURCE-LEVEL, AND WHAT THAT DOES NOT PROVE. `npm test` has no React
 * renderer and no browser, so nothing here opens a sheet, spins a wheel, or
 * measures a rendered box at a given viewport width. This is deterministic
 * reading of the component sources and the stylesheets they depend on, the
 * same pattern `FilterBar.mobileSheet.test.ts`, `reflow.test.ts` and
 * `touchTarget.test.ts` use, for the same reason. It pins the invariants so a
 * future edit cannot quietly undo them; it is not evidence that the behaviour
 * is correct in a browser. That evidence comes from the narrow-viewport
 * Playwright pass recorded against the deployment in the findings register,
 * and the two are cited separately there on purpose.
 */

const COMPONENTS = __dirname;
const SRC = path.join(__dirname, "..");
const read = (p: string) => fs.readFileSync(p, "utf8");

const FILTER_BAR = read(path.join(COMPONENTS, "FilterBar.tsx"));
const PLATFORM_CSS = read(path.join(SRC, "styles/sat-platform.css"));
const FOOTER_CSS = read(path.join(SRC, "styles/footer.css"));

/** The coarse-pointer block, which is where every touch floor is declared. */
const coarseBlock = (() => {
  const i = PLATFORM_CSS.indexOf("@media (pointer: coarse)");
  assert.ok(i >= 0, "the coarse-pointer enumeration is gone");
  let depth = 0;
  for (let j = PLATFORM_CSS.indexOf("{", i); j < PLATFORM_CSS.length; j++) {
    if (PLATFORM_CSS[j] === "{") depth++;
    else if (PLATFORM_CSS[j] === "}") { depth--; if (depth === 0) return PLATFORM_CSS.slice(i, j + 1); }
  }
  throw new Error("unterminated coarse-pointer block");
})();

// ---------------------------------------------------------------------------
// 1. The footer CTA row, which clipped at 320px in English
// ---------------------------------------------------------------------------

test("the footer CTA row is allowed to wrap", () => {
  const rule = FOOTER_CSS.match(/\.foot \.cta-actions\{([^}]*)\}/);
  assert.ok(rule, ".foot .cta-actions rule is gone");
  assert.match(
    rule[1],
    /flex-wrap:\s*wrap/,
    "the CTA row is flex:none, so without wrapping a pair of buttons whose " +
      "automatic minimum size exceeds the content box leaves the viewport"
  );
});

test("a single CTA button may shrink rather than force the wrap", () => {
  assert.match(
    FOOTER_CSS,
    /\.foot \.cta-actions \.btn\{[^}]*min-width:\s*0/,
    "min-width:0 is what lets one long label shrink instead of overflowing"
  );
});

test("the narrow-viewport CTA basis is auto, not zero", () => {
  // `flex:1` is `flex:1 1 0%`, which asks both buttons to share the row at any
  // width and is what kept them on one line while their content refused to fit.
  const narrow = FOOTER_CSS.slice(FOOTER_CSS.indexOf("@media (max-width:760px)"));
  assert.match(narrow, /\.foot \.cta-actions \.btn\{flex:\s*1 1 auto/, "narrow-viewport CTA basis regressed to 0%");
  assert.doesNotMatch(narrow, /\.foot \.cta-actions \.btn\{flex:\s*1;/, "the zero-basis shorthand is back");
});

test("the desktop CTA row keeps its layout", () => {
  // The fix must not restyle the wide layout: the row is still a flex row that
  // does not grow, and only gains the ability to wrap.
  const rule = FOOTER_CSS.match(/\.foot \.cta-actions\{([^}]*)\}/);
  assert.match(rule![1], /display:\s*flex/);
  assert.match(rule![1], /flex:\s*none/);
  assert.match(rule![1], /gap:\s*12px/);
});

// ---------------------------------------------------------------------------
// 2. The background scroll lock
// ---------------------------------------------------------------------------

/** The scroll-lock effect, isolated so assertions cannot match elsewhere. */
const lockEffect = (() => {
  const i = FILTER_BAR.indexOf("const doc = document.documentElement;");
  assert.ok(i >= 0, "the scroll-lock effect no longer resolves the scrolling element");
  return FILTER_BAR.slice(Math.max(0, i - 1200), i + 2200);
})();

test("the lock is applied to the scrolling element, not to body alone", () => {
  // This document scrolls on <html>. Locking only <body> locks nothing, which
  // is the defect: the page scrolled behind an open sheet.
  assert.match(lockEffect, /doc\.style\.overflow\s*=\s*"hidden"/, "the documentElement is no longer locked");
  assert.match(lockEffect, /body\.style\.overflow\s*=\s*"hidden"/, "the body lock was dropped");
});

test("the body is pinned at a negative offset, which is what holds on iOS Safari", () => {
  assert.match(lockEffect, /body\.style\.position\s*=\s*"fixed"/, "iOS Safari ignores overflow:hidden as a lock");
  assert.match(lockEffect, /body\.style\.top\s*=\s*`-\$\{y\}px`/, "the offset is no longer pinned");
});

test("pinning does not let the locked page collapse to a width jump", () => {
  assert.match(lockEffect, /body\.style\.width\s*=\s*"100%"/, "a pinned body without an explicit width reflows behind the sheet");
});

test("the scroll offset is captured before the lock and restored exactly", () => {
  assert.match(lockEffect, /const y\s*=\s*window\.scrollY/, "the offset must be recorded, never inferred on close");
  assert.match(lockEffect, /window\.scrollTo\(\{\s*top:\s*y/, "restoration must use the captured offset");
  assert.match(lockEffect, /behavior:\s*"instant"/, "a smooth restore replays the scroll as an animation");
});

test("every previous inline style is captured and put back", () => {
  for (const prop of ["htmlOverflow", "bodyOverflow", "bodyPosition", "bodyTop", "bodyWidth"]) {
    assert.ok(lockEffect.includes(prop), `${prop} is not preserved, so the lock leaks a style it did not own`);
  }
  assert.match(lockEffect, /doc\.style\.overflow\s*=\s*prev\.htmlOverflow/);
  assert.match(lockEffect, /body\.style\.position\s*=\s*prev\.bodyPosition/);
  assert.match(lockEffect, /body\.style\.width\s*=\s*prev\.bodyWidth/);
});

test("history.scrollRestoration is borrowed, not permanently changed", () => {
  // Forcing it to manual stops the browser racing our restore. Leaving it that
  // way would change how the whole application restores history for the rest of
  // the session, which this component has no business deciding.
  assert.match(lockEffect, /history\.scrollRestoration\s*=\s*"manual"/, "the browser will race the restore");
  assert.match(
    lockEffect,
    /history\.scrollRestoration\s*=\s*prev\.restoration/,
    "scrollRestoration is never handed back, so the component permanently changes browser history behaviour"
  );
});

test("restoration lives in the effect cleanup, so every dismissal path shares it", () => {
  // Escape, the backdrop, the explicit Close control and an unmount all end the
  // effect. Wiring restoration to any single handler is how one path forgets.
  const cleanup = lockEffect.slice(lockEffect.indexOf("return () => {"));
  assert.ok(cleanup.length > 0, "the lock effect has no cleanup");
  assert.match(cleanup, /window\.scrollTo/, "restoration is not in the cleanup, so some dismissal path will miss it");
  assert.doesNotMatch(
    FILTER_BAR,
    /onKeyDown[^\n]*scrollTo|onClick[^\n]*window\.scrollTo/,
    "a per-handler restore has appeared; the cleanup is the single place this belongs"
  );
});

test("the lock is symmetric, so Strict Mode's double invoke cannot leave the page locked", () => {
  // React 18 Strict Mode mounts, unmounts and remounts effects in development.
  // Every property the effect writes must be written from a captured previous
  // value, so a second cleanup restores rather than compounds.
  const writes = ["doc.style.overflow", "body.style.overflow", "body.style.position", "body.style.top", "body.style.width"];
  const cleanup = lockEffect.slice(lockEffect.indexOf("return () => {"));
  for (const w of writes) {
    assert.ok(cleanup.includes(w), `${w} is set on open but never restored, so a double invoke leaves it stuck`);
  }
});

test("the lock only engages when the sheet is a modal takeover", () => {
  // The desktop popup never locks the page; locking it would be a regression of
  // its own.
  assert.match(lockEffect, /if \(!open \|\| !isMobileSheet\) return;/, "the lock is no longer gated to the mobile sheet");
});

test("the sheet's own body keeps its scroll", () => {
  // Locking the page must not lock the panel the reader is meant to scroll.
  assert.match(FILTER_BAR, /\.fb-sheet-body/, "the sheet's scroll container is gone");
  assert.match(PLATFORM_CSS + FOOTER_CSS + read(path.join(SRC, "styles/globals.css")), /\.fb-sheet-body[^{]*\{[^}]*overflow-y:\s*auto/,
    "the sheet body must remain scrollable while the page behind it does not");
});

// ---------------------------------------------------------------------------
// 3. Touch targets
// ---------------------------------------------------------------------------

test("the shared touch primitive declares the floor on both axes", () => {
  // A block-only floor is the exact defect this primitive exists to close in a
  // different shape: a short label such as a breadcrumb "Home" crumb passes a
  // height check at 44px tall while still measuring far under 44px wide, which
  // is precisely as much a mis-tap as the reverse. Both axes are required here,
  // not just one, so a future edit cannot silently drop back to height-only.
  assert.match(coarseBlock, /\.touch-target\s*\{[^}]*min-block-size:\s*44px/, "the shared touch primitive lost its block floor");
  assert.match(coarseBlock, /\.touch-target\s*\{[^}]*min-inline-size:\s*44px/, "the shared touch primitive lost its inline floor");
  assert.match(coarseBlock, /\.touch-target\s*\{[^}]*display:\s*inline-flex/, "without a flex box the min size cannot take effect on an inline anchor");
  assert.match(coarseBlock, /\.touch-target\s*\{[^}]*justify-content:\s*center/, "a short label needs centring on the axis the box just grew on, or it sits pinned to one edge of a wider box");
});

test("the touch primitive is not applied blanket to every anchor", () => {
  // An anchor inside a sentence is exempt under the WCAG inline exception, and a
  // blanket rule would stretch prose line boxes.
  // Only a bare `a` that OPENS a selector counts. A descendant rule such as
  // `.site-header a` is scoped to a known row and is not a blanket floor.
  assert.doesNotMatch(
    coarseBlock,
    /(?:^|\n)\s*a\s*(?:,[^{]*)?\{[^}]*min-block-size:\s*44px/,
    "a blanket anchor floor would break inline prose"
  );
});

test("the language segments carry the floor on both axes", () => {
  // Two 19px targets whose centres sit 21px apart is compliant in height and a
  // mis-tap in practice.
  assert.match(coarseBlock, /\.lang-seg\s*\{[^}]*min-inline-size:\s*44px/, "the language segments lost their inline floor");
  assert.match(coarseBlock, /\.lang-seg\s*\{[^}]*padding-inline/, "inline padding keeps the glyphs centred as the target grows");
});

test("widening the segments cannot create overlapping hit regions", () => {
  // The alternative considered was an invisible 44px overlay on a 19px control.
  // Two such overlays centred 21px apart overlap by more than half. Widening the
  // laid-out box moves the centres apart as it grows, so this must stay a size
  // rule and never become a transform or a negative inset.
  const seg = coarseBlock.match(/\.lang-seg\s*\{([^}]*)\}/);
  assert.ok(seg, ".lang-seg rule is gone from the coarse block");
  assert.doesNotMatch(seg![1], /position:\s*absolute|transform:|inset:\s*-|margin:\s*-/, "hit area must come from the box, not an overlay");
});

test("text inputs are enumerated as pointer targets", () => {
  assert.match(coarseBlock, /input\[type="search"\]/, "the search field is not covered by any touch floor");
  assert.match(coarseBlock, /input:not\(\[type\]\)/, "an input with no type attribute is still a text field");
  const inputRule = coarseBlock.match(/input\[type="text"\][^{]*\{([^}]*)\}/);
  assert.ok(inputRule, "the input floor rule is gone");
  assert.match(inputRule![1], /min-block-size:\s*44px/);
  assert.doesNotMatch(inputRule![1], /min-inline-size/, "forcing a text field's inline size would fight its grid");
});

test("the touch floors use logical dimensions so RTL is not a separate case", () => {
  for (const rule of [/\.touch-target\s*\{([^}]*)\}/, /\.lang-seg\s*\{([^}]*)\}/]) {
    const m = coarseBlock.match(rule);
    assert.ok(m, "a touch rule vanished");
    assert.doesNotMatch(m![1], /min-width:|min-height:|padding-left:|padding-right:/, "physical dimensions reintroduce an RTL special case");
  }
});

test("a grown target shows a visible focus ring, outside the coarse query", () => {
  // A keyboard user on a touch device is still a keyboard user, and a control
  // that grew a larger box must show that box when focused.
  const outside = PLATFORM_CSS.replace(coarseBlock, "");
  assert.match(outside, /\.touch-target:focus-visible\s*\{[^}]*outline:/, "the grown target has no visible focus state");
  assert.match(outside, /\.touch-target:focus-visible\s*\{[^}]*outline-offset:/, "an outline with no offset sits on the glyphs");
});

/** Every call site the live matrix confirmed as a standalone control. */
const CALL_SITES: ReadonlyArray<readonly [string, string]> = [
  ["MarketingHome.tsx", "the standalone post-a-requirement prompt, sole content of its row"],
  ["ListerBadge.tsx", "the lister name, the only control in a row of status chips"],
  ["../app/[locale]/listings/[id]/page.tsx", "the detail breadcrumb and the see-all link"],
  // Measured at 35 by 17 live, the shortest confirmed target in the discovery
  // matrix and the one an earlier pass on this class missed entirely: this file
  // was never touched, so a block-only primitive could not have caught it
  // either. Present in the same source-truth sweep that found it.
  ["../app/[locale]/listers/page.tsx", "the Home crumb in the listers directory breadcrumb"],
];

for (const [file, why] of CALL_SITES) {
  test(`the touch primitive is applied at: ${why}`, () => {
    const src = read(path.join(COMPONENTS, file));
    assert.match(src, /className=(?:"[^"]*touch-target|\{`[^`]*touch-target)/, `${file} lost its touch-target application`);
  });
}

test("the see-all and breadcrumb links on listing detail both carry it", () => {
  const src = read(path.join(COMPONENTS, "../app/[locale]/listings/[id]/page.tsx"));
  const applied = [...src.matchAll(/className="[^"]*touch-target[^"]*"/g)];
  assert.ok(applied.length >= 2, `expected the breadcrumb and the see-all link, found ${applied.length}`);
});

test("the listers directory breadcrumb row can wrap", () => {
  // The row containing the touch-target crumb has no flex-wrap of its own
  // (`.eyebrow` sets none), so a longer Arabic label or a future third crumb
  // segment needs an explicit `wrap` on this call site rather than relying on
  // the shared class to provide it, which would affect every other `.eyebrow`
  // usage across the app (section labels that must not wrap oddly).
  const src = read(path.join(COMPONENTS, "../app/[locale]/listers/page.tsx"));
  assert.match(src, /className="eyebrow wrap"/, "the breadcrumb row lost its ability to wrap");
});
