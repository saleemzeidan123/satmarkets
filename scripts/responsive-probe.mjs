// Local responsive probe: measure a shipped fragment at real viewport widths.
//
// WHY THIS EXISTS. Responsive evidence used to be taken off the deployed page.
// PKG-2A did it by giving the live page a containing block of each width inside a
// same-origin iframe, driven by the Chrome extension bridge. Both channels that
// method needs are gone in the current environment:
//
//   1. the extension bridge is down (tabs_context_mcp: "Browser extension is not
//      connected"), so there is no live browser session to drive;
//   2. container Chromium cannot reach the deployed host at all. page.goto on
//      https://satmarkets-wheat.vercel.app/en fails with
//      net::ERR_TUNNEL_CONNECTION_FAILED through the egress proxy.
//
// So a fragment is reproduced locally against the repository's own CSS instead.
// This is weaker evidence than measuring production and it is labelled as such
// everywhere it is cited. It is not weaker in the way that matters most for
// layout, though: the cascade, the type scale, the breakpoints and the markup are
// the shipped ones, compiled by the same tailwind the build uses.
//
// WHAT IS REAL, AND WHAT IS SUBSTITUTED.
//   real  globals.css compiled through the repo's own tailwind, so preflight, the
//         :root type scale and the [dir="rtl"] block are present in source order
//   real  sat-platform.css verbatim: .row/.gap8/.gap20/.wrap and the
//         .satmkt-hero padding breakpoints at 680px and 600px
//   real  the fragment markup, copied out of the component character for character
//   SUB   the two faces are @fontsource woff2, not next/font/google. Same families
//         and weights. next/font subsets and self-hosts its own copies, so glyph
//         advance can differ by a hair; the deployed font chunk declares its own
//         fallback size-adjust at 100.94% (Hanken Grotesk) and 101.17% (IBM Plex
//         Sans Arabic), so the families are confirmed but not byte-identical here.
//
// A fragment probe answers "does this row fit and wrap sanely", not "does the page
// overflow". Whole-page overflow is PKG-2A's evidence and is not restated by this.
//
// USAGE (two steps, because tailwind must compile globals.css first):
//
//   npx tailwindcss -i src/styles/globals.css -o /tmp/globals.built.css --minify
//   node scripts/responsive-probe.mjs --css /tmp/globals.built.css \
//     --fonts /tmp/ogbuild/node_modules/@fontsource --chromium /opt/pw-browsers/chromium
//
// The fonts come from the same one-line install as scripts/og-cards.mjs:
//   npm i --no-save --prefix /tmp/ogbuild @fontsource/hanken-grotesk @fontsource/ibm-plex-sans-arabic
//
// Exit code is 1 on any overflow, so this can be wired into a gate later. It is
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
const ONLY = flag("--only", "");

const need = (p, how) => {
  if (!existsSync(p)) { console.error(`Missing: ${p}\n${how}`); process.exit(1); }
  return p;
};
need(CSS, "Compile it first: npx tailwindcss -i src/styles/globals.css -o /tmp/globals.built.css --minify");
const GLOBALS = readFileSync(CSS, "utf8");
const PLATFORM = readFileSync(join(ROOT, "src/styles/sat-platform.css"), "utf8");

const face = (rel) => `data:font/woff2;base64,${readFileSync(need(join(FONTS, rel), "See the header of this file for the one-line font install.")).toString("base64")}`;
const family = (name, dir, stem) => [400, 500, 600]
  .map((w) => `@font-face{font-family:'${name}';font-weight:${w};font-style:normal;font-display:block;src:url('${face(`${dir}/files/${stem}-${w}-normal.woff2`)}')format('woff2')}`)
  .join("\n");

// Icon.check at size 16, from src/components/satkit.tsx: Ic renders width and
// height = size, viewBox 0 0 24 24, strokeWidth 1.6, flex:none.
const CHECK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="M5 12.5l4.5 4.5L19 7"></path></svg>`;

// Each fragment names the component it was copied from, so a future reader can
// diff the two rather than trusting that they still match.
const FRAGMENTS = {
  // src/components/MarketingHome.tsx, the hero trust chip row. Owner ruling 3
  // rewrote micro1 in both locales and repainted the three ticks, which made the
  // English string nine characters longer, so the row needed remeasuring.
  "hero-chips": {
    source: "src/components/MarketingHome.tsx (hero trust chips)",
    copy: {
      en: ["At launch, owners checked before listing", "No assumed commission", "FAL 1200025510"],
      ar: ["عند الإطلاق، يُفحص المُلّاك قبل الإدراج", "لا عمولة مفترضة", "فال 1200025510"],
    },
    // The full padding chain, not just the row: .satmkt-hero carries the side
    // padding and its two mobile overrides, and the inner block carries maxWidth.
    render: (chips) => `
<div style="font-family:var(--sans);color:var(--ink);background:var(--paper)">
 <div class="satmkt-hero" style="position:relative;padding:clamp(44px,10vw,70px) 20px clamp(50px,10vw,84px);overflow:hidden;background:#0B1219">
  <div style="position:relative;max-width:920px;margin:0 auto;text-align:center" data-inner="1">
   <div class="row gap20 wrap" data-probe="1" style="margin-top:22px;font-size:var(--fs-sm);color:rgba(255,255,255,.85);justify-content:center">
${chips.map((t) => `    <span class="row gap8" data-item="1"><span style="color:#C4DAF2">${CHECK}</span> ${t}</span>`).join("\n")}
   </div>
  </div>
 </div>
</div>`,
  },

  // src/components/FilterBar.tsx, the pill rail at the top of /listings. ADV-1 (C)
  // replaced a bare "Verified" toggle with "Ownership verified" / "الملكية موثّقة",
  // which names the one dimension the filter actually queries. That is the longest
  // chip in the rail in both languages, so the rail is remeasured.
  //
  // The verified chip is drawn in its ACTIVE state on purpose: active prepends a
  // tick, which is the widest the chip ever gets, and it is the only state in which
  // the reserved green appears at all.
  //
  // Below 769px the rail is a deliberate horizontal scroller (globals.css:408-414:
  // flex-wrap:nowrap, overflow-x:auto, a 93% mask fade, children flex:0 0 auto), so
  // overflow INSIDE the row is the design at those widths and is declared by rowRail
  // rather than silently tolerated. Overflow of the DOCUMENT is still a failure
  // there, and that is the assertion the rail has to survive.
  "filter-pills": {
    source: "src/components/FilterBar.tsx (pill rail) as mounted by src/app/[locale]/listings/page.tsx",
    rowRail: { maxWidth: 768, why: "globals.css:408, .lst-filterpills is a scroll rail on mobile" },
    copy: {
      en: {
        pills: ["Location", "Deal", "Property type", "Size", "Rent", "Grade", "Fit-out"],
        verified: "Ownership verified",
        sort: "Sort: Newest",
      },
      ar: {
        pills: ["الموقع", "الصفقة", "نوع العقار", "المساحة", "الإيجار", "الفئة", "التجهيز"],
        verified: "الملكية موثّقة",
        sort: "ترتيب: الأحدث",
      },
    },
    // The page container is the listings container verbatim (page.tsx:313), because
    // the 24px side padding is what decides how much rail there is to scroll.
    render: (c) => `
<div style="font-family:var(--sans);color:var(--ink);background:var(--paper)">
 <div style="max-width:1360px;margin:0 auto;padding:28px 24px 64px">
  <div class="lst-filterwrap" data-inner="1" style="margin-top:16px">
   <div class="row gap8 wrap lst-filterpills" data-probe="1" style="align-items:center">
${c.pills.map((label) => `    <button type="button" class="chip" data-item="1" style="height:38px;padding:0 13px;border-radius:999px;gap:7px;cursor:pointer;border-color:var(--silver-2);background:var(--paper);color:var(--ink);font-size:var(--fs-base);white-space:nowrap">${label}<span style="font-size:var(--fs-sm);color:var(--slate-2)">▾</span></button>`).join("\n")}
    <button type="button" class="chip" data-item="1" style="height:38px;padding:0 13px;border-radius:999px;cursor:pointer;gap:7px;white-space:nowrap;border-color:var(--green);background:#EAF6EF;color:var(--verified);font-size:var(--fs-base)">✓ ${c.verified}</button>
    <button type="button" class="chip" data-item="1" style="height:38px;padding:0 13px;border-radius:999px;gap:7px;cursor:pointer;margin-inline-start:auto;border-color:var(--silver-2);background:var(--paper);color:var(--ink);font-size:var(--fs-base);white-space:nowrap">${c.sort}<span style="font-size:var(--fs-sm);color:var(--slate-2)">▾</span></button>
   </div>
  </div>
 </div>
</div>`,
  },

  // src/app/[locale]/building/[id]/page.tsx, the published-rent-band header. ADV-1
  // (C) removed a "Verified" chip from beside the band and put an attribution line
  // under it instead, which is both the honest label for a row whose data_class is
  // synthetic and the attribution owner ruling 2 requires. The Arabic attribution is
  // 44 characters against the English 24, so this block is the one the rewrite could
  // plausibly have broken on a narrow screen.
  //
  // Copied from the live page rather than from the fixtures: the median, the range
  // and the unit are what /en/building/30f8d496-292a-475c-917b-e31d2e21c49e printed
  // at 0c4e615, which is the widest real band on the platform.
  //
  // The wrapper is NOT a container by mistake. The building page returns a bare
  // <section> into <main>, which has no max-width and no side padding, so the card
  // sits edge to edge at every width while the route's own loading skeleton renders
  // inside max-width:1280px with 24px sides. The mismatch is real and is recorded as
  // a finding; reproducing it here rather than papering over it is what makes the
  // measurement mean anything.
  "band-source": {
    source: "src/app/[locale]/building/[id]/page.tsx (published rent band + ruling 2 attribution)",
    copy: {
      en: {
        label: "Published rent band",
        median: "1,421",
        range: "1,250.04–1,590.96 · ",
        per: "SAR/m²·yr",
        attribution: "REGA Rental Index (Ejar)",
        n: "9",
        units: "Available units",
      },
      ar: {
        label: "نطاق الإيجار المنشور",
        median: "1,421",
        range: "1,250.04–1,590.96 · ",
        per: "ريال/م²/سنة",
        attribution: "المؤشر الإيجاري للهيئة العامة للعقار (إيجار)",
        n: "9",
        units: "وحدات متاحة",
      },
    },
    render: (c) => `
<section style="font-family:var(--sans);color:var(--ink);background:var(--paper)">
 <div class="mt-3 overflow-hidden rounded-2xl border border-line bg-white shadow-card" data-inner="1">
  <div class="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5" data-probe="1">
   <div data-item="1">
    <div class="text-[10px] uppercase tracking-wide text-charcoal/45">${c.label}</div>
    <div class="mt-0.5 flex items-baseline gap-2">
     <span class="fig text-[26px]" style="color:#3A6EA5">${c.median}</span>
     <span class="fig text-[12px] text-charcoal/55">${c.range}${c.per}</span>
    </div>
    <div class="mt-1 text-[11px] text-charcoal/45">${c.attribution}</div>
   </div>
   <span class="text-[13px] text-charcoal/60" data-item="1"><span class="fig">${c.n}</span> ${c.units}</span>
  </div>
 </div>
</section>`,
  },
};

const WIDTHS = [320, 360, 390, 430, 768, 1280];
const DIR = { en: "ltr", ar: "rtl" };

const page = (frag, loc) => `<!doctype html><html dir="${DIR[loc]}" lang="${loc}"><head><meta charset="utf-8">
<style>${family("ProbeSans", "hanken-grotesk", "hanken-grotesk-latin")}
${family("ProbeAr", "ibm-plex-sans-arabic", "ibm-plex-sans-arabic-arabic")}</style>
<style>${GLOBALS}</style>
<style>${PLATFORM}</style>
<style>
/* next/font sets these two variables on the html element in the real app. Same
   names and same families, locally hosted files. Nothing else is touched. */
:root{--font-sans:'ProbeSans';--font-ar:'ProbeAr';--font-serif:'ProbeSans';--font-mono:'ProbeSans';}
html,body{margin:0;padding:0;}
</style></head><body>${frag.render(frag.copy[loc], loc)}</body></html>`;

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const rows = [];
for (const [name, frag] of Object.entries(FRAGMENTS)) {
  if (ONLY && ONLY !== name) continue;
  console.log(`\n${name}  <-  ${frag.source}`);
  for (const loc of ["en", "ar"]) {
    for (const width of WIDTHS) {
      const p = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
      await p.setContent(page(frag, loc), { waitUntil: "load" });
      await p.evaluate(() => document.fonts.ready);
      const m = await p.evaluate(() => {
        const row = document.querySelector("[data-probe]");
        const inner = document.querySelector("[data-inner]");
        const boxes = [...document.querySelectorAll("[data-item]")].map((el) => {
          const r = el.getBoundingClientRect();
          return { top: Math.round(r.top), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
        });
        const de = document.documentElement;
        return {
          docOverflow: de.scrollWidth - de.clientWidth,
          rowOverflow: row.scrollWidth - row.clientWidth,
          innerW: Math.round(inner.getBoundingClientRect().width),
          fs: getComputedStyle(row).fontSize,
          face: getComputedStyle(row).fontFamily.split(",")[0].replace(/["']/g, ""),
          // Distinct top offsets, so this counts visual lines after wrapping
          // rather than assuming the flex container kept everything on one.
          lines: new Set(boxes.map((b) => b.top)).size,
          widest: Math.max(...boxes.map((b) => b.w)),
          minH: Math.min(...boxes.map((b) => b.h)),
          heights: boxes.map((b) => b.h),
        };
      });
      const rail = !!(frag.rowRail && width <= frag.rowRail.maxWidth);
      rows.push({ name, loc, width, rail, ...m });
      await p.close();
    }
  }
}
await browser.close();

const pad = (s, n) => String(s).padEnd(n);
let head = "";
for (const r of rows) {
  if (r.name !== head) { head = r.name; console.log("\n" + head); }
  if (r.loc === "en" && r.width === WIDTHS[0]) {
    console.log(pad("loc", 5) + pad("vw", 6) + pad("content", 9) + pad("fs", 6) + pad("face", 11)
      + pad("doc ovf", 9) + pad("row ovf", 9) + pad("lines", 7) + pad("widest", 8) + pad("minH", 6) + "item heights");
  }
  console.log(pad(r.loc, 5) + pad(r.width, 6) + pad(r.innerW, 9) + pad(r.fs, 6) + pad(r.face, 11)
    + pad(r.docOverflow, 9) + pad(r.rowOverflow + (r.rail ? " rail" : ""), 9) + pad(r.lines, 7)
    + pad(r.widest, 8) + pad(r.minH, 6) + r.heights.join(" / "));
}
// A fragment fails if the DOCUMENT scrolls horizontally, or if one item is wider
// than the block it sits in, which is the failure a longer string actually
// introduces: an item that cannot fit even on a line of its own.
//
// Row overflow is a failure everywhere EXCEPT inside a declared scroll rail, where
// the row is built to be wider than its box and the reader swipes it. The rail
// still has to keep that width to itself: if the document scrolls, the rail has
// leaked, and that is caught by the first clause rather than excused by this one.
const bad = rows.filter((r) => r.docOverflow > 0 || (r.rowOverflow > 0 && !r.rail) || r.widest > r.innerW);
const rails = rows.filter((r) => r.rail && r.rowOverflow > 0).length;
console.log(bad.length === 0
  ? `\nPASS  ${rows.length} measurements, 0 document overflow, no item wider than its content box`
    + (rails ? `, ${rails} inside a declared scroll rail (row wider than its box by design, document not)` : "")
  : `\nFAIL  ${bad.length} of ${rows.length}: ` + bad.map((b) => `${b.name} ${b.loc}@${b.width}`).join(", "));
process.exit(bad.length === 0 ? 0 : 1);
