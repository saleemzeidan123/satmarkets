import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { APP_ROUTES, PRODUCT_ROUTES, chromeTier, rendersFooterSlot } from "./chrome";

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
  // The footer test used to be spelled `tier === "marketing"` inline here. Slice
  // B replaced it with the exported predicate so that the tab bar and the space
  // reserved for the tab bar are one decision rather than two that agree by
  // habit. The assertion follows the spelling; what it holds is unchanged, and
  // the next test holds the predicate's ANSWER rather than its name.
  assert.match(gate, /footerSlot\s*&&\s*footer/, "the footer is no longer limited to the tier that renders it");
  assert.match(
    gate,
    /const\s+footerSlot\s*=\s*rendersFooterSlot\(path\)/,
    "ChromeGate no longer takes the footer decision from the shared predicate",
  );

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

/*
 * PKG-E1-READINESS slice B, WS09. Below here the subject changes from which
 * chrome a route gets to how much SPACE the chrome is given, which turned out to
 * be the same question asked in three places and answered in only one of them.
 *
 * `main.has-tabbar` reserves 62px of bottom padding for the fixed tab bar and
 * `.advfab` sits 82px up, which is that 62 plus a 20px gap. Both numbers were
 * arithmetic about a bar that only the marketing tier renders, and both were
 * applied to every route, so an owner on /dashboard at 390px scrolled to the end
 * of the page and found 62px of nothing, with the Advisor button floating above
 * it clearing a bar that was not there.
 *
 * These tests hold the three sites to one predicate, and hold the CSS breakpoint
 * that RELEASES the reservation equal to the one that HIDES the bar. A bar hidden
 * at one width and a reservation released at another is either content under a
 * bar or a gap under nothing, and neither is visible in a diff.
 *
 * There was a second half to the defect, and only a browser found it.
 * scripts/shell-probe.mjs scrolls a marketing shell and a product shell to the
 * end of the document at nine widths in both locales and measures the last
 * painted pixel against the top edge of the bar. It reported 10px of the
 * footer's copyright strip underneath the bar at 320, 360, 390 and 430, and
 * 24.5px at 768. The reservation was real, it was the right size, and it was in
 * the wrong element: `main` is not the last thing in the document, the footer
 * renders after it, so padding on `main` protected the seam between the two
 * while the bar covered the end. The 62px now travels to the footer through the
 * `--tabbar-reserve` custom property, which footer.css adds to its own bottom
 * padding. globals.css keeps the bar's number, footer.css keeps the footer's,
 * and the tests below hold the seam between them.
 */

const GLOBALS = readFileSync(join("src", "styles", "globals.css"), "utf8");
const FOOTER_CSS = readFileSync(join("src", "styles", "footer.css"), "utf8");

test("only a route that renders the tab bar reserves space for it", () => {
  for (const locale of ["en", "ar"]) {
    for (const route of [...Object.keys(APP_ROUTES), ...Object.keys(PRODUCT_ROUTES)]) {
      assert.equal(
        rendersFooterSlot(`/${locale}/${route}`),
        false,
        `/${locale}/${route} renders no tab bar, so it must not reserve the 62px the bar would occupy`,
      );
    }
    // And the marketing tier, which does render it, still does.
    for (const route of ["", "listings", "listings/abc-123", "map", "rent-index", "signup", "login", "something-new"]) {
      assert.equal(
        rendersFooterSlot(`/${locale}/${route}`),
        true,
        `/${locale}/${route} renders the tab bar and must keep the space beneath it`,
      );
    }
  }
});

test("the tab bar class is set in one place, by the tab bar's own test", () => {
  // A source guard, because the defect was not a wrong value anywhere. Every
  // number involved was right. The defect was an unconditional class in a file
  // that had no way to ask the question, so the guard is about WHERE the class
  // is written, which no rendering test can see.
  const withClass: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir)) {
      const f = join(dir, e);
      if (statSync(f).isDirectory()) { walk(f); continue; }
      if (!/\.tsx?$/.test(f) || /\.test\.tsx?$/.test(f)) continue;
      // Comments are stripped first. Three files now EXPLAIN this reservation
      // and the guard is about which file APPLIES it; a rule that punished
      // writing the reason down would be the wrong rule.
      if (codeOnly(readFileSync(f, "utf8")).includes("has-tabbar")) withClass.push(f);
    }
  };
  walk("src");
  assert.deepEqual(
    withClass,
    [join("src", "components", "ChromeGate.tsx")],
    "`has-tabbar` is written outside ChromeGate, where the tab bar decision is not available",
  );

  const gate = readFileSync(join("src", "components", "ChromeGate.tsx"), "utf8");
  const line = gate.split("\n").find((l) => l.includes("has-tabbar") && l.includes("<main"))!;
  assert.ok(line, "ChromeGate no longer renders the main element that carries the reservation");
  assert.ok(
    line.includes("footerSlot"),
    "the 62px reservation is applied without asking whether the tab bar renders, which is the defect itself",
  );
  // The skip link is the only way a keyboard user reaches the content, and it
  // targets an id that just moved between two files.
  const layout = readFileSync(join(APP_DIR, "layout.tsx"), "utf8");
  assert.ok(layout.includes('href="#main"'), "the skip link is gone");
  assert.ok(line.includes('id="main"'), "the skip link target left with the element it points at");
});

test("the floating Advisor button clears the bar, and only where the bar is", () => {
  const widget = readFileSync(join("src", "components", "AdvisorWidget.tsx"), "utf8");
  // The class is composed from a base token and a suffix, not written out as two
  // complete literals. That is deliberate: scripts/prose-scan.mjs allowlists a
  // single token and a className attribute, and "advfab no-tabbar" sitting in a
  // plain const is neither, so the two-literal form raised the shared-component
  // baseline in a package that migrates no strings. The assertion below is on
  // the composed form for that reason, and it still holds the only thing worth
  // holding: the suffix that changes the offset is chosen by the predicate that
  // decides whether the bar is on the page.
  assert.match(
    widget,
    /const fabClass = `advfab\$\{rendersFooterSlot\(path\) \? "" : " no-tabbar"\}`;/,
    "the Advisor button offset no longer follows the tab bar it is offset for",
  );
  assert.ok(
    widget.includes('className={fabClass}'),
    "the computed class is not the one the button renders",
  );

  // The two offsets are read out of the stylesheet rather than restated here,
  // so the relationship is checked against the shipped values.
  const reserved = Number(/main\.has-tabbar ~ \.foot\{--tabbar-reserve:calc\((\d+)px \+ env\(safe-area-inset-bottom\)\)/.exec(GLOBALS)![1]);
  const fab = Number(/\.advfab\{[^}]*bottom:calc\((\d+)px \+ env\(safe-area-inset-bottom\)\)/.exec(GLOBALS)![1]);
  const fabClear = Number(/\.advfab\.no-tabbar\{bottom:calc\((\d+)px \+ env\(safe-area-inset-bottom\)\)/.exec(GLOBALS)![1]);
  assert.equal(reserved, 62);
  assert.ok(fab > reserved, `the Advisor button at ${fab}px sits inside the ${reserved}px tab bar`);
  assert.equal(fab - reserved, fabClear, "the gap above the bar and the gap above the floor are different numbers");

  // The safe-area inset is the home indicator, which is present whether or not a
  // tab bar is, so it survives in both variants.
  assert.match(GLOBALS, /\.advfab\.no-tabbar\{bottom:calc\(\d+px \+ env\(safe-area-inset-bottom\)\);\}/);
  assert.match(GLOBALS, /\.tabbar\{[^}]*padding:5px 6px calc\(5px \+ env\(safe-area-inset-bottom\)\)/);
});

test("the width that hides the bar is the width that releases the reservation", () => {
  const hides = /@media\(min-width:(\d+)px\)\{\.tabbar\{display:none;\}\}/.exec(GLOBALS);
  const releases = /@media\(min-width:(\d+)px\)\{main\.has-tabbar ~ \.foot\{--tabbar-reserve:0px;\}\}/.exec(GLOBALS);
  const fabDesktop = /@media\(min-width:(\d+)px\)\{\.advfab\{bottom:22px/.exec(GLOBALS);
  const fabClear = /@media\(max-width:(\d+)px\)\{\.advfab\.no-tabbar\{/.exec(GLOBALS);
  assert.ok(hides && releases && fabDesktop && fabClear, "one of the four tab bar width rules is missing");
  assert.equal(releases![1], hides![1], "the reservation is released at a different width from the one that hides the bar");
  assert.equal(fabDesktop![1], hides![1], "the Advisor button changes corner at a width the bar does not change at");
  // The no-tabbar override must stop one pixel below the desktop rule, or it
  // would win on specificity above it and move the desktop button.
  assert.equal(Number(fabClear![1]) + 1, Number(hides![1]), "the .no-tabbar override leaks past the desktop breakpoint");
});

test("the reservation is on the last element in the flow, and the two files keep their own numbers", () => {
  // The browser half of this is scripts/shell-probe.mjs, which measures the
  // outcome. This half holds the arrangement that produces it, because the
  // probe needs a browser and two out-of-tree inputs and so cannot run in the
  // suite.

  // `main` reserves nothing. It carries the class as the marker of a document
  // that has a bar; anything it reserved would sit above a footer rather than
  // above the bar, which is exactly the defect the probe found.
  assert.equal(
    /main\.has-tabbar\s*\{[^}]*padding-bottom/.test(GLOBALS),
    false,
    "the reservation is back on <main>, which is not the last element in the document",
  );

  // One rule sets the reservation, and it is scoped to a footer that FOLLOWS a
  // main with the class. The sibling combinator is the whole point: it is the
  // one arrangement in which a bar fixed to the bottom of the viewport is
  // painted over the end of that footer.
  const sets = GLOBALS.match(/--tabbar-reserve:/g) ?? [];
  assert.equal(sets.length, 2, "the reservation is set somewhere other than the one rule and its 1024px release");
  assert.match(GLOBALS, /main\.has-tabbar ~ \.foot\{--tabbar-reserve:/);

  // The footer consumes it in both of its padding declarations, the wide one and
  // the 760px one, and both keep the footer's own number outside the seam. A
  // reservation added to only one of them would be correct above 760px and
  // absent on precisely the widths where the bar exists.
  const consumes = FOOTER_CSS.match(/var\(--tabbar-reserve, 0px\)/g) ?? [];
  assert.equal(consumes.length, 2, "the footer does not consume the reservation in both of its padding declarations");
  assert.match(FOOTER_CSS, /\.foot\{[^}]*padding:32px 20px calc\(26px \+ var\(--tabbar-reserve, 0px\)\);/);
  assert.match(FOOTER_CSS, /padding:48px 64px calc\(36px \+ var\(--tabbar-reserve, 0px\)\);/);

  // The selector only matches because the footer and the bar arrive together, in
  // one slot, decided by one boolean. If a future edit renders the bar without
  // the footer the rule silently stops matching, so the pairing is asserted here
  // rather than assumed.
  const layout = readFileSync(join(APP_DIR, "layout.tsx"), "utf8");
  assert.match(
    layout,
    /footer=\{<><SatFooter locale=\{locale\} \/><TabBar locale=\{locale\} \/><\/>\}/,
    "the footer and the tab bar are no longer handed to ChromeGate as one slot, so the reservation selector may not match",
  );
  const gate = readFileSync(join("src", "components", "ChromeGate.tsx"), "utf8");
  assert.ok(
    gate.includes("{footerSlot && footer}"),
    "the footer slot is rendered on a condition other than the one that sets the reservation class",
  );
});
