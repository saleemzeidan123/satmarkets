// Local shell probe: measure the bottom edge of the document against the mobile
// tab bar, on a route that renders the bar and on a route that does not.
//
// PKG-E1-READINESS slice B, WS09.
//
// WHY THIS EXISTS, AND WHY IT IS NOT scripts/responsive-probe.mjs. That probe
// measures one fragment inside a containing block: it answers "does this row fit
// and wrap sanely at width N". The question here is the opposite shape. Nothing
// is too wide. What is at stake is a fixed element that is painted OVER the
// document rather than laid out in it, and a padding rule somewhere else that is
// supposed to compensate. Neither half is visible to a fragment measurement,
// because the failure is a relationship between two boxes that never share a
// parent.
//
// THE THREE NUMBERS. `.tabbar` is fixed to the bottom edge and is 5px + a 50px
// minimum row + 5px + a 1px top border tall. `main.has-tabbar` reserves 62px of
// padding-bottom. `.advfab` sits at 82px, which is that 62 plus a 20px gap. All
// three are in globals.css, all three are arithmetically consistent with each
// other, and until this slice none of them asked whether the bar was on the page:
// the class was set by a server component that cannot read the pathname, while
// the bar travels in the `footer` node ChromeGate hands only to the marketing
// tier. `src/lib/chromeGate.test.ts` now holds the ROUTE half of that decision.
// This probe holds the GEOMETRY half, which a text assertion cannot reach.
//
// WHAT IS ASSERTED, in the words of the brief this slice answers ("preserve
// safe-area handling and real bottom-navigation spacing where the tab bar
// exists"):
//
//   where the bar renders    the reservation is at least the bar's measured
//                            height, and no content is left underneath it when
//                            the reader has scrolled to the end of the document
//   where it does not        the reservation is zero, and the document ends at
//                            the viewport edge rather than a bar's height above
//                            an empty strip
//   everywhere               the floating Advisor button is inside the viewport
//                            and never overlaps the bar, and its gap is the same
//                            20px whether it is measured from the bar or from
//                            the viewport edge
//
// THE CLASS NAMES ARE NOT WRITTEN HERE. They are read out of ChromeGate.tsx and
// AdvisorWidget.tsx at run time, so this probe measures the strings the product
// actually ships. A probe that hardcoded "has-tabbar" would keep passing after
// someone renamed it and stopped applying it.
//
// LIMITATION, stated rather than hidden. Headless Chromium resolves
// env(safe-area-inset-bottom) to 0, so every calc() below evaluates as though
// there were no home indicator. That is the correct floor case and it is the one
// measured here. That the inset is still IN the three declarations is a property
// of the stylesheet text, and it is asserted there, by the two safe-area
// assertions in src/lib/chromeGate.test.ts. Neither check substitutes for the
// other and neither is claimed to.
//
// USAGE (two steps, because tailwind must compile globals.css first):
//
//   npx tailwindcss -i src/styles/globals.css -o /tmp/globals.built.css --minify
//   node scripts/shell-probe.mjs --css /tmp/globals.built.css \
//     --fonts /tmp/ogbuild/node_modules/@fontsource --chromium /opt/pw-browsers/chromium
//
// Exit code is 1 on any failed assertion. Like the responsive probe it is
// deliberately not in `npm test`: it needs a browser and two out-of-tree inputs.

import { chromium } from "playwright";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const CSS = flag("--css", "/tmp/globals.built.css");
const FONTS = flag("--fonts", "/tmp/ogbuild/node_modules/@fontsource");
const CHROME = flag("--chromium", process.env.CHROMIUM_PATH || "");

const need = (p, how) => {
  if (!existsSync(p)) { console.error(`Missing: ${p}\n${how}`); process.exit(1); }
  return p;
};
need(CSS, "Compile it first: npx tailwindcss -i src/styles/globals.css -o /tmp/globals.built.css --minify");
const GLOBALS = readFileSync(CSS, "utf8");
const PLATFORM = readFileSync(join(ROOT, "src/styles/sat-platform.css"), "utf8");
const FOOTER = readFileSync(join(ROOT, "src/styles/footer.css"), "utf8");

const face = (rel) => `data:font/woff2;base64,${readFileSync(need(join(FONTS, rel), "See the header of scripts/responsive-probe.mjs for the one-line font install.")).toString("base64")}`;
const family = (name, dir, stem) => [400, 500, 600]
  .map((w) => `@font-face{font-family:'${name}';font-weight:${w};font-style:normal;font-display:block;src:url('${face(`${dir}/files/${stem}-${w}-normal.woff2`)}')format('woff2')}`)
  .join("\n");

// The two class strings each come out of the file that decides them, so a rename
// follows through to the measurement instead of quietly ending it.
const readSrc = (rel) => readFileSync(join(ROOT, rel), "utf8");
const caps = (rel, re, what) => {
  const m = readSrc(rel).match(re);
  if (!m) {
    console.error(`Could not read ${what} out of ${rel}. The probe measures the shipped strings rather than its own copies, so it stops rather than measure something the product does not render.`);
    process.exit(1);
  }
  return m.slice(1);
};
const [MAIN_WITH_BAR, MAIN_WITHOUT_BAR] = caps(
  "src/components/ChromeGate.tsx",
  /className=\{footerSlot \? "([^"]*)" : "([^"]*)"\}/,
  "the two <main> class strings",
);
// The Advisor button's class is composed from a base token and a suffix rather
// than written out as two complete literals, because scripts/prose-scan.mjs
// allowlists a single token but not a two word class list held in a plain const.
// The two rendered strings are therefore reassembled here from the same three
// pieces the product concatenates, rather than restated as constants that could
// drift from it.
const [FAB_BASE, FAB_SUFFIX_WITH_BAR, FAB_SUFFIX_WITHOUT_BAR] = caps(
  "src/components/AdvisorWidget.tsx",
  /const fabClass = `([^`$]*)\$\{rendersFooterSlot\(path\) \? "([^"]*)" : "([^"]*)"\}`/,
  "the Advisor button class expression",
);
const FAB_WITH_BAR = FAB_BASE + FAB_SUFFIX_WITH_BAR;
const FAB_WITHOUT_BAR = FAB_BASE + FAB_SUFFIX_WITHOUT_BAR;

// src/components/TabBar.tsx, five links, real labels from the two dictionaries.
// The icon is the component's own <svg> at 22px inside the .tb-ic box, because
// the bar's measured height is what the reservation is checked against and an
// empty bar would measure short.
const TAB_IC = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"></path><path d="M5 9.5V21h14V9.5"></path></svg>`;
const TABS = {
  en: { nav: "Bottom navigation", labels: ["Home", "Explore", "Post", "Index", "Saved"] },
  ar: { nav: "التنقل السفلي", labels: ["الرئيسية", "استكشف", "اطلب", "المؤشر", "المحفوظة"] },
};

// src/components/SatFooter.tsx, reduced to the part that decides where the
// document ends: the .foot block and its .bottom strip, which carries the
// copyright line and is the last painted content on every marketing route.
const FOOT = (loc) => `
 <footer class="foot">
  <div class="foot-mid" style="min-height:40px"></div>
  <div class="bottom">
   <span data-last="1">${loc === "ar" ? "© 2026 سات ماركتس · الرياض، السعودية · SAT REAL ESTATE FAL 1200025510" : "© 2026 SAT MARKETS · RIYADH, KSA · SAT REAL ESTATE FAL 1200025510"}</span>
   <span>${loc === "ar" ? "بدعم من سات العقارية" : "POWERED BY SAT REAL ESTATE"}</span>
  </div>
 </footer>`;

const TABBAR = (loc) => `
 <nav class="tabbar" aria-label="${TABS[loc].nav}">
${TABS[loc].labels.map((l, i) => `  <a href="#" class="${i === 0 ? "on" : ""}"><span class="tb-ic">${TAB_IC}</span><span>${l}</span></a>`).join("\n")}
 </nav>`;

// src/components/AdvisorWidget.tsx, the closed button only. The panel is not
// drawn: it is not in the flow and it is not what reserves space.
const FAB = (cls) => `<button type="button" class="${cls}" aria-label="Advisor" aria-haspopup="dialog"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><circle cx="12" cy="12" r="9"></circle></svg></button>`;

// Tall enough that min-h-[70vh] never binds at any width in the matrix, so the
// document is always scrollable and "scrolled to the end" is a real state.
const BODY_COPY = Array.from({ length: 24 }, (_, i) =>
  `   <p style="margin:0 0 18px">${i + 1}. ${"content ".repeat(14)}</p>`).join("\n");

const SHELLS = [
  {
    name: "marketing",
    bar: true,
    mainClass: MAIN_WITH_BAR,
    fabClass: FAB_WITH_BAR,
    why: "`/`, `/listings`, `/map`, `/rent-index`, `/signup`, `/login` and every route nobody has classified. ChromeGate hands these the footer node, and the tab bar travels inside it.",
  },
  {
    name: "product",
    bar: false,
    mainClass: MAIN_WITHOUT_BAR,
    fabClass: FAB_WITHOUT_BAR,
    why: "`/deal`, `/saved`, `/compare`, `/list`, `/invest`, `/find`, `/post-requirement` and the APP tier. No footer node, so no tab bar at any width, so nothing to reserve for.",
  },
];

const DIR = { en: "ltr", ar: "rtl" };
const doc = (shell, loc) => `<!doctype html><html dir="${DIR[loc]}" lang="${loc}"><head><meta charset="utf-8">
<style>${family("ProbeSans", "hanken-grotesk", "hanken-grotesk-latin")}
${family("ProbeAr", "ibm-plex-sans-arabic", "ibm-plex-sans-arabic-arabic")}</style>
<style>${GLOBALS}</style>
<style>${PLATFORM}</style>
<style>${FOOTER}</style>
<style>
:root{--font-sans:'ProbeSans';--font-ar:'ProbeAr';--font-serif:'ProbeSans';--font-mono:'ProbeSans';}
html,body{margin:0;padding:0;}
</style></head><body style="background:var(--paper);color:var(--ink);font-family:var(--sans)">
 <header style="height:56px;border-bottom:1px solid #E6EAEF"></header>
 <main id="main" tabindex="-1" class="${shell.mainClass}">
  <div style="padding:20px">
${BODY_COPY}
  </div>${shell.bar ? "" : `\n  <p style="padding:0 20px 0" data-last="1">${loc === "ar" ? "آخر سطر في الصفحة" : "last line on the page"}</p>`}
 </main>
${shell.bar ? FOOT(loc) + TABBAR(loc) : ""}
 ${FAB(shell.fabClass)}
</body></html>`;

const WIDTHS = [320, 360, 390, 430, 768, 1024, 1280, 1440, 1920];
const BREAK = 1024; // the width at which .tabbar{display:none} and the padding release both fire

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const rows = [];
for (const shell of SHELLS) {
  for (const loc of ["en", "ar"]) {
    for (const width of WIDTHS) {
      const p = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 2 });
      await p.setContent(doc(shell, loc), { waitUntil: "load" });
      await p.evaluate(() => document.fonts.ready);
      const m = await p.evaluate((rtl) => {
        // The end of the document is the state the bar can hide content in. A
        // measurement taken at scroll 0 would report a clean bottom edge on any
        // page longer than the viewport, which is every page.
        //
        // The override on the line below is load bearing. globals.css:7 sets
        // `html{scroll-behavior:smooth}`, so a bare `window.scrollTo` starts an
        // ANIMATION and every synchronous measurement after it reads the
        // pre-scroll position. The first run of this probe did exactly that: it
        // reported thousands of pixels of content under the bar on the marketing
        // shell and a clean product shell, when what it had really measured was
        // the top of both documents. `scrollY` and `maxScroll` are returned so
        // the landing is asserted rather than assumed, because an instrument
        // that quietly measures a state it never reached is worse than no
        // instrument at all.
        document.documentElement.style.scrollBehavior = "auto";
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo(0, maxScroll);
        const r1 = (n) => Math.round(n * 10) / 10;
        const vh = window.innerHeight, vw = window.innerWidth;
        const main = document.querySelector("main");
        const foot = document.querySelector(".foot");
        const bar = document.querySelector(".tabbar");
        const fab = document.querySelector(".advfab");
        const last = document.querySelector("[data-last]");
        const barVisible = !!bar && getComputedStyle(bar).display !== "none";
        const b = barVisible ? bar.getBoundingClientRect() : null;
        const f = fab.getBoundingClientRect();
        const body = document.body.getBoundingClientRect();
        return {
          scrollY: r1(window.scrollY),
          maxScroll: r1(maxScroll),
          padBottom: r1(parseFloat(getComputedStyle(main).paddingBottom)),
          // The reservation moved off `main` and onto the footer, because the
          // footer is what the bar is actually painted over. Both numbers are
          // reported: `main` must now reserve nothing on either shell, and the
          // footer's own padding must have grown by the bar's height on the
          // shell that has one.
          footPresent: !!foot,
          footPadBottom: foot ? r1(parseFloat(getComputedStyle(foot).paddingBottom)) : 0,
          barPresent: !!bar,
          barVisible,
          barH: b ? r1(b.height) : 0,
          barTop: b ? r1(b.top) : r1(vh),
          lastBottom: r1(last.getBoundingClientRect().bottom),
          // After scrolling to the end this is the strip of viewport below the
          // last pixel of the document. Zero is correct. A positive number is a
          // reservation for something that is not there.
          deadStrip: r1(vh - body.bottom),
          fabGap: r1(vh - f.bottom),
          fabInlineEnd: r1(rtl ? f.left : vw - f.right),
          fabTop: r1(f.top),
          fabOverBar: b ? f.bottom > b.top + 0.5 : false,
        };
      }, DIR[loc] === "rtl");
      const wide = width >= BREAK;
      const barShown = shell.bar && !wide;
      const fail = [];
      // Every assertion below is about the END of the document, so the state
      // itself is checked first. A row that did not scroll has measured the top
      // of the page and its other numbers mean nothing.
      if (m.maxScroll <= 0) fail.push("the document is no taller than the viewport, so the end of it is not a scrolled state and this row proves nothing");
      else if (Math.abs(m.scrollY - m.maxScroll) > 0.5) fail.push(`the document did not reach its end: scrollY ${m.scrollY} of ${m.maxScroll}`);
      // The bar renders where the route says it does and the width allows it.
      if (m.barPresent !== shell.bar) fail.push(`tab bar ${m.barPresent ? "present" : "absent"} where the tier says ${shell.bar ? "present" : "absent"}`);
      if (m.barVisible !== barShown) fail.push(`bar ${m.barVisible ? "visible" : "hidden"} at ${width}px`);
      // `main` never reserves for the bar, on either shell or at any width. It
      // did until this slice, and that was the defect: `main` is followed by the
      // footer, so padding on it protects the seam between the two rather than
      // the end of the document, which is the only place a bar fixed to the
      // bottom of the viewport can cover anything.
      if (m.padBottom !== 0) fail.push(`${m.padBottom} of bottom padding on <main>, which is not the last element in the flow`);
      if (barShown) {
        // Real bottom-navigation spacing where the tab bar exists. This is the
        // whole question, and it is asked about the LAST PAINTED PIXEL rather
        // than about any one element's padding, so it stays true however the
        // space is arranged.
        if (m.lastBottom > m.barTop + 0.5) fail.push(`${r(m.lastBottom - m.barTop)} of content under the bar at the end of the document`);
        if (m.footPadBottom < m.barH) fail.push(`the footer reserves ${m.footPadBottom}, under the bar's ${m.barH}`);
        // The clearance is held as a floor, not as an equality, and the reason is
        // a one-pixel difference that is a cushion rather than an error. The
        // stylesheet declares 82px for the button and 62px for the reservation,
        // so the button is exactly 20px above the space set aside. The bar
        // renders 61px (5 + a 50px minimum row + 5 + a 1px top border), one pixel
        // inside its reservation, so it clears the PAINTED bar by 21. The
        // declared pair 82 = 62 + 20 is held exactly, as text, by
        // src/lib/chromeGate.test.ts; this is the geometry it produces.
        if (m.fabGap - m.barH < 20) fail.push(`Advisor button clears the painted bar by ${r(m.fabGap - m.barH)}, under the 20 the stylesheet intends`);
      } else {
        // No bar, so no reservation anywhere, and the document ends at the
        // viewport edge rather than a bar's height above an empty strip.
        if (m.deadStrip > 0.5) fail.push(`${m.deadStrip} of empty viewport below the end of the document`);
        const want = wide ? 22 : 20;
        if (m.fabGap !== want) fail.push(`Advisor button ${m.fabGap} above the edge, expected ${want}`);
      }
      if (m.fabOverBar) fail.push("Advisor button overlaps the tab bar");
      if (m.fabTop < 0 || m.fabGap < 0) fail.push("Advisor button is outside the viewport");
      if (m.fabInlineEnd !== (wide ? 22 : 16)) fail.push(`Advisor button ${m.fabInlineEnd} from the inline end, expected ${wide ? 22 : 16}`);
      rows.push({ shell: shell.name, loc, width, ...m, fail });
      await p.close();
    }
  }
}
await browser.close();
function r(n) { return Math.round(n * 10) / 10; }

const pad = (s, n) => String(s).padEnd(n);
let head = "";
for (const row of rows) {
  if (row.shell !== head) {
    head = row.shell;
    const s = SHELLS.find((x) => x.name === head);
    console.log(`\n${head}  ${s.bar ? "renders the tab bar" : "renders no tab bar"}\n  ${s.why}\n  main class "${s.mainClass}", Advisor button class "${s.fabClass}"`);
    console.log(pad("loc", 5) + pad("vw", 6) + pad("bar", 6) + pad("barH", 7) + pad("main pad", 10)
      + pad("foot pad", 10) + pad("clear", 8) + pad("dead", 7) + pad("fab gap", 9) + pad("fab end", 9) + "result");
  }
  // `clear` is the space between the last painted pixel of the document and the
  // top edge of the bar, or of the viewport where there is no bar. Negative is
  // content underneath the bar, which is the failure this probe exists to catch.
  console.log(pad(row.loc, 5) + pad(row.width, 6) + pad(row.barVisible ? "yes" : "no", 6)
    + pad(row.barH, 7) + pad(row.padBottom, 10) + pad(row.footPresent ? row.footPadBottom : "n/a", 10)
    + pad(r(row.barTop - row.lastBottom), 8)
    + pad(row.deadStrip, 7) + pad(row.fabGap, 9) + pad(row.fabInlineEnd, 9)
    + (row.fail.length ? "FAIL  " + row.fail.join("; ") : "ok"));
}

const bad = rows.filter((x) => x.fail.length);
console.log(bad.length === 0
  ? `\nPASS  ${rows.length} measurements: the reservation follows the bar, nothing is under it at the end of the document, and the Advisor button keeps one gap`
    + `\n      env(safe-area-inset-bottom) resolves to 0 in headless Chromium, so this is the no-home-indicator floor case. The inset's presence in the three declarations is held by src/lib/chromeGate.test.ts.`
  : `\nFAIL  ${bad.length} of ${rows.length}: ` + bad.map((x) => `${x.shell} ${x.loc}@${x.width}`).join(", "));
process.exit(bad.length === 0 ? 0 : 1);
