import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { APP_ROUTES, PRODUCT_ROUTES, chromeTier } from "./chrome";

// RC13, finding 147. Three separate things are held here.
//
// The first is the classification itself. `/signup` sat in the APP tier for
// months against APP's own written criterion, "routes that carry their own
// navigation rail", while carrying no navigation of any kind. Nothing caught it
// because the criterion was a comment and the tier was a regular expression, and
// no test can read a comment. The tables now live in a plain module so a test can
// call `chromeTier()` on a path and hold the ANSWER, not the spelling.
//
// The second is the bar for APP membership, which is stricter than it reads. An
// APP route gets no header, no footer and no mobile tab bar, so whatever it
// renders itself is the only way off the page for every visitor at every width.
// A rail hidden by a media query below 820 pixels does not clear that bar. The
// last test walks each APP route and requires a real link that leaves it, or a
// `redirect()` proving the route never reaches a browser at all.
//
// The third is the separation the finding actually exposed. `layout.tsx` nested
// the release-state notice inside the header node it hands to ChromeGate, so a
// switch whose entire purpose is navigation was also deciding a disclosure. The
// notice is now its own slot, rendered on every tier, and the source guards below
// exist because that is a structural property no rendering test would catch: a
// future edit could move `{notice}` back inside `tier !== "app"` and every visual
// check would still pass.

const APP_DIR = join("src", "app", "[locale]");
const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

test("signup and login are one journey and get one answer", () => {
  // These are the two halves of the same decision: a visitor who lands on one
  // and needs the other is the ordinary case. Before this slice /login had the
  // full chrome and /signup had none of it, so the same person crossing between
  // them lost the language switch, the footer and the tab bar halfway through.
  // SC 3.2.3 asks for consistent navigation across a set of pages; two pages of
  // one flow disagreeing about whether navigation exists is the clearest form of
  // failing it.
  for (const locale of ["en", "ar"]) {
    assert.equal(
      chromeTier(`/${locale}/signup`),
      chromeTier(`/${locale}/login`),
      `/${locale}/signup and /${locale}/login are in different chrome tiers`,
    );
    assert.equal(chromeTier(`/${locale}/signup`), "marketing");
    assert.equal(chromeTier(`/${locale}/login`), "marketing");
  }
});

test("a route is classified the same in both languages", () => {
  const all = [...Object.keys(APP_ROUTES), ...Object.keys(PRODUCT_ROUTES), "signup", "login", "listings", "map", ""];
  for (const r of all) {
    assert.equal(
      chromeTier(`/en/${r}`),
      chromeTier(`/ar/${r}`),
      `"${r}" gets different chrome in English and Arabic`,
    );
  }
});

test("the tier tables name routes that exist", () => {
  for (const route of [...Object.keys(APP_ROUTES), ...Object.keys(PRODUCT_ROUTES)]) {
    const dir = join(APP_DIR, route);
    assert.ok(
      existsSync(dir) && statSync(dir).isDirectory(),
      `the chrome tables classify "${route}", which is not a route under ${APP_DIR}`,
    );
  }
});

test("no route is claimed by two tiers, and every route states its reason", () => {
  const app = Object.keys(APP_ROUTES);
  const product = Object.keys(PRODUCT_ROUTES);
  const both = app.filter((k) => product.includes(k));
  assert.deepEqual(both, [], `these routes are in two tiers at once: ${both.join(", ")}`);

  for (const [route, why] of [...Object.entries(APP_ROUTES), ...Object.entries(PRODUCT_ROUTES)]) {
    // The reason is the whole point of the table. A one-word entry restores the
    // condition that produced this finding: a list with no argument attached.
    assert.ok(
      why.trim().length >= 40,
      `"${route}" is in a chrome tier with no stated reason worth reading`,
    );
  }
});

test("tiers match a whole path segment, never a prefix", () => {
  // `list` is a PRODUCT route and `listings` is the public catalogue. Without the
  // trailing boundary the alternation would strip the footer off the busiest
  // public page on the site.
  assert.equal(chromeTier("/en/listings"), "marketing");
  assert.equal(chromeTier("/en/listings/abc-123"), "marketing");
  assert.equal(chromeTier("/en/list"), "product");
  assert.equal(chromeTier("/en/list/new"), "product");
  assert.equal(chromeTier("/en/dashboard"), "app");
  assert.equal(chromeTier("/en/dashboard/listings"), "app");
  assert.equal(chromeTier("/ar/post-requirement"), "product");
  assert.equal(chromeTier("/en"), "marketing");
  assert.equal(chromeTier("/"), "marketing");
  assert.equal(chromeTier(""), "marketing");
});

test("an unknown route falls to full chrome, not to none", () => {
  // The default matters more than any entry in either table. A route nobody has
  // classified should cost a visitor a redundant sitemap, not every way off the
  // page.
  for (const path of ["/en/something-new", "/ar/2027/report", "/en/x"]) {
    assert.equal(chromeTier(path), "marketing", `${path} defaults to something other than full chrome`);
  }
});

/** Every .ts/.tsx under a route folder, plus the components those files import. */
function surfaceOf(route: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (/\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p);
    }
  };
  walk(join(APP_DIR, route));
  // A page's links often live in the client component it renders: /messages is a
  // server component with no markup of its own and every link inside
  // MessagesClient. Following one level of `@/components` import is enough to see
  // them, and stopping at one level keeps the guard from wandering the tree.
  const imported = new Set<string>();
  for (const p of out) {
    for (const m of readFileSync(p, "utf8").matchAll(/from\s+"@\/components\/([A-Za-z0-9_/-]+)"/g)) {
      for (const ext of [".tsx", ".ts"]) {
        const c = join("src", "components", m[1] + ext);
        if (existsSync(c)) imported.add(c);
      }
    }
  }
  return [...out, ...imported];
}

/** Does this href leave `route`? `/${l}` and `/${l}/listings` do; `/${l}/docs/x` does not. */
function leaves(href: string, route: string): boolean {
  const norm = href.replace(/\$\{[^}]*\}/g, "*").replace(/["'`+\s]/g, "");
  if (!norm.startsWith("/")) return false;
  const seg = norm.split("/");        // ["", "*", "listings", ...]
  return seg[2] === undefined || seg[2] === "" || seg[2] !== route;
}

test("every APP route offers a way out at every width", () => {
  // This is the test /docs failed. It rendered a chevron in a disc in the corner
  // where a back control belongs, and the chevron was a `<span>`: not focusable,
  // not activatable, and pointing at nothing. With no header, no footer and no
  // tab bar behind it, the page had zero links of any kind and a keyboard user
  // reaching it had no route off it but the browser's own back button, which
  // SC 2.4.5 does not accept as a way to reach a page.
  const missing: string[] = [];
  for (const route of Object.keys(APP_ROUTES)) {
    const files = surfaceOf(route);
    const redirects = files.some((p) => /\bredirect\s*\(/.test(codeOnly(readFileSync(p, "utf8"))));
    if (redirects) continue;          // the route never paints; nothing to escape from
    const out = files.some((p) => {
      const code = codeOnly(readFileSync(p, "utf8"));
      return [...code.matchAll(/<Link[^>]*?href=\{?([^\s>]+)/g)].some((m) => leaves(m[1], route));
    });
    if (!out) missing.push(route);
  }
  assert.deepEqual(
    missing,
    [],
    "these APP routes render no header, no footer, no tab bar and no link that leaves them: " + missing.join(", "),
  );
});

test("the release-state notice is not a navigation decision", () => {
  // The disclosure says every figure on this deployment is sample data. It is
  // true of /advisor, which is in SITEMAP_ROUTES and therefore publicly
  // reachable once the release gates pass, and it was not being shown there,
  // because /advisor is an APP route and the notice was nested inside the header
  // node that the APP tier withholds.
  const gate = codeOnly(readFileSync("src/components/ChromeGate.tsx", "utf8"));
  assert.ok(gate.includes("{notice}"), "ChromeGate no longer renders a notice slot");

  // `{notice}` must sit outside both tier tests. Reading the lines is enough:
  // the render body is four expressions and the guard is that the notice line is
  // not one of the guarded ones.
  const line = gate.split("\n").find((l) => l.includes("{notice}"))!;
  assert.equal(
    /tier/.test(line),
    false,
    "the notice is rendered behind a tier test again, so an APP route can lose the disclosure",
  );
  assert.match(gate, /tier\s*!==\s*"app"\s*&&\s*header/, "the header is no longer withheld from the APP tier");
  assert.match(gate, /tier\s*===\s*"marketing"\s*&&\s*footer/, "the footer is no longer limited to the marketing tier");

  // And the tiers come from the table, not from a second copy of it.
  assert.match(gate, /from\s+"@\/lib\/chrome"/, "ChromeGate no longer reads the chrome tier table");
  assert.equal(
    /const\s+(APP|PRODUCT)\s*=\s*\//.test(gate),
    false,
    "ChromeGate declares its own tier alternation again, so the table and the behaviour can drift",
  );
});

test("the layout hands the disclosure to the notice slot, not to the header", () => {
  const layout = readFileSync(join(APP_DIR, "layout.tsx"), "utf8");
  assert.match(layout, /<ChromeGate[^>]*notice=\{previewNotice\}/, "the layout stopped passing a notice");
  assert.ok(layout.includes('className="topnotice preview-notice"'), "the preview notice is gone from the layout");

  const start = layout.indexOf("header={<>");
  assert.ok(start > 0, "the layout no longer passes a header node");
  const end = layout.indexOf("footer=", start);
  const headerNode = layout.slice(start, end);
  assert.equal(
    headerNode.includes("preview-notice"),
    false,
    "the release-state notice is nested inside the header node again, which is finding 147",
  );
  // The marketing strip is a rent-index promotion with a link. That one IS
  // marketing chrome and belongs where the header goes.
  assert.ok(headerNode.includes("{marketingNotice}"), "the marketing strip left the header node");
});
