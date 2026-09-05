import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// ---------------------------------------------------------------------------
// Why this file exists
//
// Findings 139 and 26. The coarse-pointer touch floor is an enumeration of
// selectors, and an enumeration is a list of the controls somebody remembered.
// Every defect reported against it has been the same defect: a control that was
// not on the list. The language segment was reported, but the language segment
// was never the cause; the cause is that nothing fails when a control is added
// and the list is not.
//
// So this file does not check the language segment. It checks the properties an
// enumeration has to hold to be trustworthy:
//
//   1. every button variant declared anywhere in the stylesheets is on the list,
//      so a new `.btn-*` cannot ship below the floor;
//   2. every family that can render as an inline box also receives a display,
//      because `min-height` is silently discarded on a non-replaced inline box
//      and a floor that does nothing is worse than no floor, it reads as done;
//   3. the icon group claims both axes, because claiming width alone produced a
//      34px-tall control that was 44px wide;
//   4. the header and the footer link columns, which carry no floor-bearing
//      class at all, are covered by structural selectors;
//   5. the inactive language segment passes SC 1.4.3 by arithmetic on the
//      declared values rather than by assertion.
//
// What this file cannot do is prove a thumb reaches anything. A CSS min-height
// is evidence that a rule exists. The physical-device verification is recorded
// as outstanding in docs/findings-register.md and is not claimed here.
// ---------------------------------------------------------------------------

const ROOT = join(import.meta.dirname, "..", "..");
const platform = readFileSync(join(ROOT, "src", "styles", "sat-platform.css"), "utf8");
const globals = readFileSync(join(ROOT, "src", "styles", "globals.css"), "utf8");
const footer = readFileSync(join(ROOT, "src", "styles", "footer.css"), "utf8");

/** The body of the first `@media (pointer: coarse)` block, by brace matching. */
function coarseBlock(css: string): string {
  const at = css.indexOf("@media (pointer: coarse)");
  assert.ok(at >= 0, "the coarse-pointer touch floor block has been removed or renamed");
  const open = css.indexOf("{", at);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error("the coarse-pointer block is not closed");
}

type Rule = { selectors: string[]; decls: string };

function rules(body: string): Rule[] {
  const out: Rule[] = [];
  for (const m of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    out.push({
      selectors: m[1]
        .split(",")
        .map((s) => s.replace(/\/\*[\s\S]*?\*\//g, "").trim())
        .filter(Boolean),
      decls: m[2],
    });
  }
  return out;
}

const COARSE = rules(coarseBlock(platform));
// The floor may be declared physically or logically. `min-block-size` is the
// logical spelling of `min-height` and is what the enumeration now uses, so that
// a right-to-left document needs no separate rule. Both are accepted here
// because the invariant this file guards is "a 44px floor exists", not which
// spelling declares it.
const MIN_BLOCK = /min-(?:height|block-size):\s*44px/;
const MIN_INLINE = /min-(?:width|inline-size):\s*44px/;
const FLOORED = new Set(COARSE.filter((r) => MIN_BLOCK.test(r.decls)).flatMap((r) => r.selectors));
const DISPLAYED = new Set(COARSE.filter((r) => /display:/.test(r.decls)).flatMap((r) => r.selectors));

// Button variants that are deliberately not controls. Empty on purpose: every
// `.btn-*` in the system today is a control. An entry here needs a reason, not
// just a name.
const NOT_A_CONTROL = new Set<string>([]);

test("every declared button variant is on the coarse-pointer floor", () => {
  const declared = new Set<string>();
  for (const css of [globals, platform, footer]) {
    for (const m of css.matchAll(/\.(btn-[a-z0-9]+)/g)) declared.add(`.${m[1]}`);
  }
  assert.ok(declared.size >= 5, `only ${declared.size} button variants found; the scan has stopped working`);

  const missing = [...declared].filter((c) => !NOT_A_CONTROL.has(c) && !FLOORED.has(c)).sort();
  assert.deepEqual(
    missing,
    [],
    `${missing.join(", ")} declared as a button variant but absent from the coarse-pointer floor in ` +
      "sat-platform.css. `.btn` on its own does not cover it: several call sites use the variant class " +
      "alone. Add it to the enumeration, or add it to NOT_A_CONTROL with a stated reason.",
  );
});

test("families that can render inline also receive a display", () => {
  // `min-height` has no effect on a non-replaced inline box. These families are
  // applied to bare anchors at some call site, so the floor is inert without a
  // display that makes the box able to have a height.
  for (const sel of [".btn-gold", ".btn-ink", ".btn-ghost", ".lang-seg"]) {
    assert.ok(
      DISPLAYED.has(sel),
      `${sel} is given a 44px floor but no display. It is used on a bare anchor, which is an inline ` +
        "box, and min-height is discarded on an inline box. The floor would be declared and do nothing.",
    );
  }
});

test("the icon group claims both axes", () => {
  const iconRules = COARSE.filter((r) => MIN_INLINE.test(r.decls));
  assert.ok(iconRules.length > 0, "the icon-target rule has been removed");
  for (const r of iconRules) {
    assert.match(
      r.decls,
      MIN_BLOCK,
      `\`${r.selectors.join(", ")}\` sets an inline floor without a block floor. That is what turned a 34px ` +
        "square icon link into a 44 by 34 control: wider than it needed to be and still short.",
    );
  }
});

test("the header and the footer link columns are covered structurally", () => {
  assert.ok(
    FLOORED.has(".site-header a"),
    "the site header's controls carry no floor-bearing class: its nav links and account-menu rows are " +
      "Tailwind-only and resolve to about 36px while the menu trigger beside them, being a `button`, " +
      "is already 44. `.site-header a` is the structural cover for them.",
  );
  const footerCoarse = coarseBlock(footer);
  assert.match(
    footerCoarse,
    /\.foot \.foot-col a\s*\{[^}]*min-(?:height|block-size):\s*44px/,
    "the footer link columns have no touch floor. They are the densest stack of targets on the site " +
      "and sit two abreast on a phone. The rule must live in footer.css: `.foot .foot-col a` is (0,2,1) " +
      "and footer.css is imported last, so an equally specific rule written earlier loses on source order.",
  );
});

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrast(fg: [number, number, number], bg: [number, number, number]): number {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

test("the inactive language segment passes SC 1.4.3 on its own pill", () => {
  const seg = globals.match(/\.lang-seg \{[^}]*color:\s*rgba\((\d+),(\d+),(\d+),([\d.]+)\)/);
  assert.ok(seg, "the .lang-seg colour is no longer declared as an rgba() on one line");
  const pill = globals.match(/\.lang-pill \{[^}]*background:#([0-9A-Fa-f]{6})/);
  assert.ok(pill, "the .lang-pill background is no longer declared as a six-digit hex");

  const bg: [number, number, number] = [
    parseInt(pill[1].slice(0, 2), 16),
    parseInt(pill[1].slice(2, 4), 16),
    parseInt(pill[1].slice(4, 6), 16),
  ];
  const alpha = Number(seg[4]);
  // The segment colour is translucent, so what a reader sees is the composite
  // over the pill, not the declared ink. Compositing before measuring is the
  // whole point: the declared #1C2126 passes easily and the rendered colour did
  // not.
  const fg = [0, 1, 2].map((i) => alpha * Number(seg[i + 1]) + (1 - alpha) * bg[i]) as [number, number, number];
  const ratio = contrast(fg, bg);

  assert.ok(
    ratio >= 4.5,
    `the inactive language segment composites to ${ratio.toFixed(2)}:1 over its pill background, below ` +
      "the 4.5:1 that SC 1.4.3 requires at this size and weight. It is a 12px 600 label, so the large-text " +
      "allowance of 3:1 does not apply. Raise the alpha; /65 gives 4.83.",
  );

  // The active segment is white on Harbor and is checked here too so that a
  // future change to one half of the control cannot quietly break the other.
  const on = globals.match(/\.lang-seg\.on \{[^}]*background:#([0-9A-Fa-f]{6})/);
  assert.ok(on, "the active .lang-seg background is no longer a six-digit hex");
  const onBg: [number, number, number] = [
    parseInt(on[1].slice(0, 2), 16),
    parseInt(on[1].slice(2, 4), 16),
    parseInt(on[1].slice(4, 6), 16),
  ];
  const onRatio = contrast([255, 255, 255], onBg);
  assert.ok(
    onRatio >= 4.5,
    `the active language segment is ${onRatio.toFixed(2)}:1, white on #${on[1]}, below 4.5:1`,
  );
});

// ---------------------------------------------------------------------------
// PKG-LISTING-CREATION-1B outcome B/E. The three new per-photo categorisation
// controls (shot/scope/condition) added no CSS of their own for the
// coarse-pointer floor: they inherit it for free from the bare `select`
// selector already in the enumeration above, which applies to every
// <select> in the app regardless of class. That inheritance is only real as
// long as these three controls stay real <select> elements; a future
// refactor to a custom-styled div-based dropdown would silently drop out of
// the bare-tag rule with nothing to catch it, so this locks in the markup
// choice itself, not a new CSS rule.
// ---------------------------------------------------------------------------
test("ListingMediaManager's three categorisation controls are real <select> elements, inheriting the bare-select coarse-pointer floor", () => {
  const src = readFileSync(join(ROOT, "src", "components", "ListingMediaManager.tsx"), "utf8");
  const selectCount = (src.match(/<select\b/g) ?? []).length;
  assert.ok(
    selectCount >= 3,
    `expected at least 3 <select> elements (shot, scope, condition), found ${selectCount}. If any of ` +
      "these three were changed to a non-<select> control, they would silently drop out of the generic " +
      "`select { min-block-size: 44px }` rule in sat-platform.css's coarse-pointer block and need an " +
      "explicit floor of their own.",
  );
  assert.match(src, /aria-label=\{t\.shotAt/, "the shot select lost its per-tile accessible name");
  assert.match(src, /aria-label=\{t\.scopeAt/, "the scope select lost its per-tile accessible name");
  assert.match(src, /aria-label=\{t\.conditionAt/, "the condition select lost its per-tile accessible name");
});
