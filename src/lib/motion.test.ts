import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prefersReducedMotion, scrollBehavior } from "./motion";

// RC12, finding 164. Two things are being held in place here.
//
// The first is the helper's own behaviour, which is small and mostly about what
// it does when it cannot answer: a server render, a browser without matchMedia,
// and a matchMedia that throws all have to come back "not reduced", because
// guessing "reduced" would strip motion from readers who never asked for it.
//
// The second is the reason the defect existed at all. Nothing in the CSS can
// see an explicit `behavior: "smooth"`, so the only way to keep this fixed is a
// rule about the source: that string may appear in exactly one file, the one
// that decides what it should be. Five call sites had drifted past the CSS
// reduced-motion block before anyone looked, and they will drift again the next
// time someone writes a scroll, unless writing one fails the suite.

const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

/** Every .ts/.tsx under src, minus tests and minus the module under test. */
function sources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!/\.tsx?$/.test(p)) continue;
      if (/\.test\.tsx?$/.test(p)) continue;
      if (p === join("src", "lib", "motion.ts")) continue;
      out.push(p);
    }
  };
  walk("src");
  return out;
}

test("an unanswerable preference is not a preference", () => {
  // No window at all: this is the server render, and it must not decide.
  assert.equal(typeof (globalThis as any).window, "undefined");
  assert.equal(prefersReducedMotion(), false);
  assert.equal(scrollBehavior(), "smooth");
});

test("the preference is read, not assumed", () => {
  const w = globalThis as any;
  try {
    w.window = { matchMedia: (q: string) => ({ matches: q.includes("reduce") }) };
    assert.equal(prefersReducedMotion(), true);
    assert.equal(scrollBehavior(), "auto");

    w.window = { matchMedia: () => ({ matches: false }) };
    assert.equal(prefersReducedMotion(), false);
    assert.equal(scrollBehavior(), "smooth");
  } finally {
    delete w.window;
  }
});

test("the query asked for is the reduce query, spelled the way a browser expects", () => {
  const w = globalThis as any;
  const seen: string[] = [];
  try {
    w.window = { matchMedia: (q: string) => { seen.push(q); return { matches: false }; } };
    prefersReducedMotion();
  } finally {
    delete w.window;
  }
  assert.deepEqual(seen, ["(prefers-reduced-motion: reduce)"]);
});

test("a browser that cannot answer, and one that refuses to, both mean no", () => {
  const w = globalThis as any;
  try {
    w.window = {};                                  // very old browser, no matchMedia
    assert.equal(prefersReducedMotion(), false);
    w.window = { matchMedia: 42 };                  // present but not callable
    assert.equal(prefersReducedMotion(), false);
    w.window = { matchMedia: () => { throw new Error("no"); } };
    assert.equal(prefersReducedMotion(), false);
  } finally {
    delete w.window;
  }
});

test("the preference is re-read on every call, never cached", () => {
  // A reader can turn reduced motion on while the page is open. MapLibre reads
  // its own getter live for this reason; a value captured at import would hold
  // the answer from before they changed it.
  const w = globalThis as any;
  let reduce = false;
  try {
    w.window = { matchMedia: () => ({ get matches() { return reduce; } }) };
    assert.equal(scrollBehavior(), "smooth");
    reduce = true;
    assert.equal(scrollBehavior(), "auto");
    reduce = false;
    assert.equal(scrollBehavior(), "smooth");
  } finally {
    delete w.window;
  }
});

test("no source outside motion.ts states a scroll behaviour of its own", () => {
  // `globals.css` sets `html{scroll-behavior:auto}` under prefers-reduced-motion,
  // but that only decides what "auto" means, and "auto" is the DEFAULT. A call
  // that passes "smooth" explicitly never consults the property, which is how
  // five call sites came to animate for readers who had asked them not to.
  const offenders = sources().filter((p) =>
    /behavior\s*:\s*["']smooth["']/.test(codeOnly(readFileSync(p, "utf8"))),
  );
  assert.deepEqual(
    offenders,
    [],
    "these files state a scroll behaviour instead of asking scrollBehavior() for one, " +
      "so the CSS reduced-motion block cannot reach them: " + offenders.join(", "),
  );
});

test("no camera call opts out of MapLibre's reduced-motion handling", () => {
  // `flyTo` and `easeTo` in maplibre-gl already collapse to a jump under
  // prefers-reduced-motion. `essential: true` is the single flag that turns that
  // off, and it is the one way our source could reintroduce finding 164's stated
  // defect for real.
  const offenders = sources().filter((p) => {
    const code = codeOnly(readFileSync(p, "utf8"));
    return /\bessential\s*:/.test(code) && /\b(flyTo|easeTo|jumpTo|fitBounds|panTo|zoomTo)\s*\(/.test(code);
  });
  assert.deepEqual(offenders, [], "a camera call marks itself essential, which skips reduced motion");
});

test("the library guarantee finding 164 now rests on is the one installed", () => {
  // This test is the evidence for correcting the register rather than obeying
  // it. If maplibre is replaced or downgraded, the correction has to be re-read
  // before it can be trusted again.
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.match(
    String(pkg.dependencies["maplibre-gl"]),
    /^\^?4\./,
    "maplibre-gl moved off 4.x; re-verify that flyTo still honours prefers-reduced-motion",
  );
  const dist = "node_modules/maplibre-gl/dist/maplibre-gl.js";
  if (!existsSync(dist)) return; // a lint-only checkout has no node_modules to read
  const lib = readFileSync(dist, "utf8");
  assert.ok(
    lib.includes("!t.essential&&o.prefersReducedMotion"),
    "the installed maplibre no longer guards its camera animations on prefers-reduced-motion",
  );
  assert.ok(
    lib.includes('matchMedia("(prefers-reduced-motion: reduce)")'),
    "the installed maplibre no longer reads the reduced-motion query",
  );
});
