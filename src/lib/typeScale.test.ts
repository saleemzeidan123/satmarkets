import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// ---------------------------------------------------------------------------
// Why this file exists
//
// Finding 174. Every step of the type scale, and every one of the 1073 font
// sizes set outside it, used to be a px literal. A px font-size ignores the
// browser's default text size, so a reader who raises that setting gets no
// change at all, which is what SC 1.4.4 resize text is about. PKG-A11Y-1 RC4
// converted the scale and every site to rem. The conversion is exact at the
// 16px default root size, so nothing moved for a reader who had changed
// nothing.
//
// Finding 27. The Arabic size uplift was written as `[dir="rtl"]`, specificity
// (0,1,0). The `:root` block that declares the Latin scale is also (0,1,0) and
// sits further down the file, so it won on source order and every Arabic
// declaration was discarded. The uplift was in the repository for weeks with no
// effect whatsoever. The selector is now `html[dir="rtl"]`, which wins on
// specificity rather than position and therefore cannot be undone by a future
// reorder of the file.
//
// Both defects share one property: they are invisible. A px size renders
// perfectly, and a discarded custom property produces no error, no warning and
// no visual difference at the default settings the author is looking at. Only a
// scan catches them, so this is a scan.
// ---------------------------------------------------------------------------

const ROOT = join(import.meta.dirname, "..", "..");
const SRC = join(ROOT, "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const FILES = walk(SRC);
const globals = readFileSync(join(SRC, "styles", "globals.css"), "utf8");

// The one deliberate px value in the whole scale. It is the iOS focus-zoom
// floor, not a reading size: Safari zooms the viewport when a focused text
// field computes below 16px, so the token keeps a 16px floor and grows from
// there with `max()`. Written out here so a future reader sees that the
// exception is declared rather than overlooked.
const INPUT_FLOOR = "--fs-input:max(16px, 1rem);";

test("the type scale declares no px sizes except the declared input floor", () => {
  assert.ok(
    globals.includes(INPUT_FLOOR),
    `globals.css no longer declares the input floor exactly as \`${INPUT_FLOOR}\`. ` +
      "If the token changed shape, update this constant and say why in the CSS comment.",
  );

  const offenders: string[] = [];
  for (const p of FILES) {
    if (!/\.(css|tsx?)$/.test(p)) continue;
    if (p.endsWith(".test.ts") || p.endsWith(".test.tsx")) continue;
    const s = readFileSync(p, "utf8");
    const rel = p.slice(ROOT.length + 1);
    const lines = s.split("\n");
    lines.forEach((line, i) => {
      const at = `${rel}:${i + 1}`;
      // CSS: `font-size: 13px`, including inside a clamp().
      if (/font-size:\s*[^;}]*\d(?:\.\d+)?px/.test(line)) {
        if (!line.includes(INPUT_FLOOR)) offenders.push(`${at}  css font-size in px`);
      }
      // Custom property named like a scale step, valued in px.
      if (/--fs-[a-z0-9]+:\s*[^;}]*\d(?:\.\d+)?px/.test(line) && !line.includes(INPUT_FLOOR)) {
        offenders.push(`${at}  --fs token in px`);
      }
      // React: `fontSize: 13.5` serialises to px, and `fontSize: "clamp(28px,...)"`.
      if (/fontSize:\s*\d/.test(line)) offenders.push(`${at}  bare numeric fontSize serialises to px`);
      if (/fontSize:\s*"[^"]*\d(?:\.\d+)?px/.test(line)) offenders.push(`${at}  fontSize string in px`);
      // Tailwind arbitrary font size.
      const tw = line.match(/text-\[\d+(?:\.\d+)?px\]/g);
      if (tw) for (const t of tw) offenders.push(`${at}  ${t}`);
    });
  }

  assert.deepEqual(
    offenders,
    [],
    `${offenders.length} font size(s) declared in px. A px size does not answer a browser ` +
      "text-size preference (SC 1.4.4). Divide by 16 and write rem; the two are identical at " +
      `the default root size. Offenders:\n${offenders.join("\n")}`,
  );
});

function block(selector: string): string {
  const marker = `${selector}{`;
  const start = globals.indexOf(marker);
  assert.ok(start >= 0, `globals.css no longer contains a \`${marker}\` block`);
  const end = globals.indexOf("}", start);
  assert.ok(end > start, `the \`${marker}\` block is not closed`);
  return globals.slice(start + marker.length, end);
}

function steps(body: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of body.matchAll(/--fs-([a-z0-9]+):\s*([\d.]+)rem/g)) out.set(m[1], Number(m[2]));
  return out;
}

const LATIN = steps(block(":root"));
const ARABIC = steps(block('html[dir="rtl"]'));

test("the Arabic scale outranks the Latin scale on specificity, not on position", () => {
  // `dir` is set on the html element itself (src/app/layout.tsx), so
  // `html[dir="rtl"]` at (0,1,1) matches the same element `:root` does at
  // (0,1,0) and beats it wherever either block is moved to.
  assert.ok(
    globals.includes('html[dir="rtl"]{'),
    "the Arabic size uplift must be selected by `html[dir=\"rtl\"]`. A bare `[dir=\"rtl\"]` " +
      "ties with `:root` on specificity and loses to it on source order, which is finding 27: " +
      "the uplift sat in the file for weeks and rendered nothing.",
  );
  const bare = globals.match(/(^|[\s}])\[dir="rtl"\]\{[^}]*--fs-/);
  assert.equal(
    bare,
    null,
    "a bare `[dir=\"rtl\"]` block is declaring --fs tokens again. It will lose to `:root`.",
  );
});

test("both scales are strictly increasing and cover the same steps", () => {
  const order = ["cap", "3xs", "2xs", "xs", "sm", "base", "md", "lg", "xl", "2xl", "3xl", "4xl"];

  for (const [name, scale] of [["Latin", LATIN], ["Arabic", ARABIC]] as const) {
    const missing = order.filter((s) => !scale.has(s));
    assert.deepEqual(
      missing,
      [],
      `the ${name} scale does not declare ${missing.join(", ")}. An Arabic scale that raises ` +
        "only some steps inverts: --fs-base overtakes --fs-md and the scale stops being a scale.",
    );
    for (let i = 1; i < order.length; i++) {
      const lo = scale.get(order[i - 1])!;
      const hi = scale.get(order[i])!;
      assert.ok(
        hi > lo,
        `${name} --fs-${order[i]} (${hi}rem) is not larger than --fs-${order[i - 1]} (${lo}rem)`,
      );
    }
  }

  // Arabic reads smaller than Latin at the same size, so every Arabic step is
  // larger. This is the uplift's whole purpose and finding 27's remedy.
  for (const s of order) {
    assert.ok(
      ARABIC.get(s)! > LATIN.get(s)!,
      `Arabic --fs-${s} (${ARABIC.get(s)}rem) is not larger than Latin (${LATIN.get(s)}rem)`,
    );
  }
});
