import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// PKG-SUP1, finding 98. A CSS custom property that was never declared fails
// silently.
//
// THE DEFECT CLASS. `border: "1px solid var(--line)"` looks correct, passes
// typecheck, passes every test, renders no border, and reports nothing. The
// cascade treats a declaration containing an unresolvable `var()` as invalid at
// computed-value time: the whole declaration is dropped, so the element falls
// back to whatever it inherited rather than to a visible default. There is no
// console warning and no build error. Nothing in this repository could have
// caught it, which is why it survived on a reader-facing surface.
//
// It was found the only way it can be found without a guard: by looking. The
// new `/list` used `var(--line)` for its stage separators, a grep of
// `src/styles` for `--line` returned nothing, and the same sweep then found the
// same property on the owner-documents card of the listing detail page, where
// it had been shipped and read by owners with a border that never drew.
//
// WHERE A PROPERTY MAY BE DECLARED, and why this is derived rather than listed.
// Two places, and both are read rather than assumed:
//
//   `src/styles/*.css`     the platform tokens.
//   `src/app/layout.tsx`   the four `next/font` families, which are declared by
//                          `variable: "--font-x"` and injected onto the `html`
//                          element at runtime. They are absent from every
//                          stylesheet and are still perfectly valid.
//
// An allow list of those four names would have been shorter and wrong. It would
// accept `--font-serif` forever, including after somebody deleted the font that
// declares it, and it would reject a fifth family the day it is added. Reading
// `layout.tsx` means the guard tracks the fonts rather than a memory of them.

const SRC = join(__dirname, "..");
const STYLES = join(SRC, "styles");
const LAYOUT = join(SRC, "app", "layout.tsx");

/** A declaration: `--x:` at the head of a CSS declaration, or a next/font `variable:`. */
const CSS_DECL = /(--[A-Za-z0-9_-]+)\s*:/g;
const FONT_DECL = /variable:\s*"(--[A-Za-z0-9_-]+)"/g;

/**
 * A reference with no fallback, which is the only shape that can fail silently.
 *
 * `var(--x, #92400e)` is deliberately not flagged. The second argument is used
 * whenever the property is missing, so the declaration stays valid and the
 * element still paints. `AdPermit.tsx` uses exactly that shape for `--amber-d`
 * and is correct.
 */
const USE = /var\(\s*(--[A-Za-z0-9_-]+)\s*([,)])/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|css)$/.test(p)) out.push(p);
  }
  return out;
}

function declared(): Set<string> {
  const out = new Set<string>();
  for (const f of readdirSync(STYLES)) {
    if (!f.endsWith(".css")) continue;
    const s = readFileSync(join(STYLES, f), "utf8");
    for (const m of s.matchAll(CSS_DECL)) out.add(m[1]);
  }
  for (const m of readFileSync(LAYOUT, "utf8").matchAll(FONT_DECL)) out.add(m[1]);
  return out;
}

test("every CSS custom property used without a fallback is declared somewhere", () => {
  const known = declared();
  const offenders: string[] = [];
  for (const f of walk(SRC)) {
    if (/\.test\.tsx?$/.test(f)) continue;
    const s = readFileSync(f, "utf8");
    const lines = s.split("\n");
    lines.forEach((line, i) => {
      for (const m of line.matchAll(USE)) {
        if (m[2] === ",") continue;
        if (known.has(m[1])) continue;
        offenders.push(`${relative(SRC, f).split("\\").join("/")}:${i + 1} uses ${m[1]}`);
      }
    });
  }
  assert.deepEqual(
    offenders,
    [],
    `these declarations reference a custom property nothing declares, so the whole declaration is dropped and the rule silently does not apply:\n  ${offenders.join("\n  ")}`,
  );
});

test("the guard catches the shape it was written for", () => {
  // A guard nobody has watched fail is a guard nobody knows works. The four
  // cases are the four judgements the guard makes, written as the strings it
  // actually meets.
  const known = declared();
  const hits = (line: string): string[] => {
    const out: string[] = [];
    for (const m of line.matchAll(USE)) if (m[2] === ")" && !known.has(m[1])) out.push(m[1]);
    return out;
  };
  assert.deepEqual(hits('border: "1px solid var(--line)"'), ["--line"], "the shipped defect must be caught");
  assert.deepEqual(hits('color: "var(--amber-d, #92400e)"'), [], "a fallback keeps the declaration valid");
  assert.deepEqual(hits('background: "var(--cool)"'), [], "a declared token is not an offence");
  assert.deepEqual(hits("fontFamily: \"var(--font-serif), Georgia, serif\""), [], "a next/font family is declared in layout.tsx");
});

test("the font families are read from layout.tsx rather than remembered", () => {
  // If this ever fails, a font was added or removed and the guard has already
  // followed it. The assertion is that the source of truth is the one that
  // injects them, not that there happen to be four.
  const layout = readFileSync(LAYOUT, "utf8");
  const fonts = [...layout.matchAll(FONT_DECL)].map((m) => m[1]);
  assert.ok(fonts.length > 0, "layout.tsx no longer declares any font variable");
  const styles = new Set<string>();
  for (const f of readdirSync(STYLES)) {
    if (!f.endsWith(".css")) continue;
    for (const m of readFileSync(join(STYLES, f), "utf8").matchAll(CSS_DECL)) styles.add(m[1]);
  }
  for (const name of fonts) {
    assert.equal(styles.has(name), false, `${name} is now declared in CSS too, so the layout read is no longer load bearing`);
    assert.ok(declared().has(name), `${name} is injected by next/font and must be accepted`);
  }
});
