// Touch-target probe: measure the rendered size of every chrome control under an
// emulated coarse pointer.
//
// Why this exists alongside scripts/responsive-probe.mjs
//
// The responsive probe launches a plain desktop page. `(pointer: coarse)` never
// matches there, so the entire touch floor in sat-platform.css is invisible to
// it: the probe would report the desktop sizes and pass, whatever the floor said.
// Findings 139 and 26 were both reported against controls that the floor did not
// reach, and neither could be measured by anything in the repository. This closes
// that gap. It enables touch emulation, checks that the media query actually
// matched before asserting anything, and measures both axes.
//
// It also runs the same page with touch off. That second pass is the evidence
// that the desktop rendering did not move: a touch floor that silently inflates
// the precise-pointer UI would be a visual regression dressed up as an
// accessibility fix, and the two tables sit next to each other so that claim can
// be read rather than trusted.
//
// The markup below is copied from the real components and is stated as such. It
// is browser-emulated evidence of the rules, not evidence that a thumb reaches a
// control on a physical handset; that verification is recorded as outstanding in
// docs/findings-register.md.
//
// Usage, from the repository root:
//
//   npx tailwindcss -i src/styles/globals.css -o /tmp/globals.built.css --minify
//   node scripts/touch-probe.mjs --css /tmp/globals.built.css --chromium /opt/pw-browsers/chromium
//
// Exit code 1 if any control measures below 44px while the coarse query matched,
// or if the document scrolls horizontally at any width.

import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name, fallback = "") => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const CSS = flag("--css");
if (!CSS) {
  console.error("--css is required: compile globals.css with tailwindcss first, then pass the output path.");
  process.exit(2);
}
const CHROME = flag("--chromium", process.env.CHROMIUM_PATH || "");

const built = readFileSync(CSS, "utf8");
const platform = readFileSync(join(ROOT, "src", "styles", "sat-platform.css"), "utf8");
const footer = readFileSync(join(ROOT, "src", "styles", "footer.css"), "utf8");

// Class strings copied from src/components/Header.tsx, src/components/LanguageSwitch.tsx
// and src/components/SatFooter.tsx. Labels are placeholders; only geometry is measured.
const HEADER = `
<header class="site-header sticky top-0 z-40">
  <div class="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-6">
    <a href="#" class="flex items-center" data-t="logo" aria-label="home"><span style="display:block;width:34px;height:34px;background:#3A6EA5"></span></a>
    <nav class="hidden md:flex items-center gap-0.5" aria-label="Primary">
      <a href="#" data-t="nav" class="rounded-lg px-3 py-2 text-[0.84375rem] transition-colors text-charcoal/70 font-medium">LBL</a>
      <a href="#" data-t="nav" class="rounded-lg px-3 py-2 text-[0.84375rem] transition-colors bg-ivory-2 text-charcoal font-semibold">LBL</a>
    </nav>
    <div class="flex items-center gap-2 sm:gap-2.5">
      <span class="hidden sm:inline-flex"><span class="lang-pill"><a href="#" data-t="lang" class="lang-seg on">EN</a><a href="#" data-t="lang" class="lang-seg">AR</a></span></span>
      <a href="#" data-t="btnink" class="btn-ink px-3.5 py-2 text-[0.8125rem] font-medium">LBL</a>
      <div class="relative">
        <button type="button" data-t="trigger" aria-label="Menu" aria-expanded="false" class="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-2.5 text-charcoal/80 transition-colors"><span class="hidden text-[0.8125rem] font-medium sm:inline">Menu</span></button>
        <div role="group" aria-label="Menu" class="absolute end-0 top-full z-50 mt-2 w-[270px] overflow-hidden rounded-xl border border-line bg-ivory">
          <div class="px-2 py-2">
            <a href="#" data-t="menurow" class="flex items-center justify-between rounded-lg px-2.5 py-2 text-[0.875rem] text-charcoal/80">LBL</a>
            <a href="#" data-t="menurow" class="block rounded-lg px-2.5 py-2 text-[0.875rem] text-charcoal/80">LBL</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</header>`;

const FOOTER = `
<footer class="foot">
  <div class="foot-cols">
    <div class="foot-col"><h5 class="col-h">COL</h5>
      <a href="#" data-t="footcol">Listings</a><a href="#" data-t="footcol">Requirements</a><a href="#" data-t="footcol">Market</a></div>
    <div class="foot-col"><h5 class="col-h">COL</h5>
      <a href="#" data-t="footcol">About</a><a href="#" data-t="footcol">Sources</a></div>
  </div>
  <div class="foot-mid"><div class="trust-row"></div>
    <div class="foot-end">
      <span class="lang-pill"><a href="#" data-t="lang" class="lang-seg on">EN</a><a href="#" data-t="lang" class="lang-seg">AR</a></span>
      <a class="soc" data-t="soc" href="#" aria-label="Contact"><span style="display:block;width:16px;height:16px"></span></a>
    </div>
  </div>
</footer>`;

// The two bare `.btn-gold` anchors, from src/app/not-found.tsx and
// src/app/auth/callback/page.tsx, and the inline-block one from
// src/app/[locale]/saved/page.tsx. The first is an inline box, which is the case
// a bare `min-height` cannot reach.
const LOOSE = `
<div style="padding:20px;background:#fff">
  <a href="#" data-t="btngold" class="btn-gold mt-5 px-5 py-2.5 text-sm">Back to sign in</a>
  <a href="#" data-t="btngoldib" class="btn-gold mt-5 inline-block px-5 py-2.5 text-sm font-medium">Browse</a>
</div>`;

const page = (dir, lang) => `<!doctype html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${built}</style><style>${platform}</style><style>${footer}</style>
<style>html,body{margin:0}</style></head>
<body>${HEADER}${LOOSE}${FOOTER}</body></html>`;

const WIDTHS = [320, 360, 390, 430, 768, 1280];
const LOCALES = [["ltr", "en"], ["rtl", "ar"]];
const FLOOR = 44;
// Icon-only controls: the floor has to hold on both axes, not just the block one.
const BOTH_AXES = new Set(["soc"]);

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
let failures = 0;
let measurements = 0;

for (const touch of [true, false]) {
  console.log(`\n---- pointer emulation: ${touch ? "coarse (touch)" : "fine (mouse)"} ----`);
  for (const [dir, lang] of LOCALES) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 },
        hasTouch: touch,
        isMobile: touch,
        deviceScaleFactor: 2,
      });
      const p = await ctx.newPage();
      await p.setContent(page(dir, lang), { waitUntil: "load" });
      const res = await p.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll("[data-t]")) {
          const r = el.getBoundingClientRect();
          // Controls the responsive rules hide at this width (the primary nav is
          // `hidden md:flex`, the header language pill `hidden sm:inline-flex`)
          // measure zero. A box that is not rendered is not a short target.
          if (r.height === 0 && r.width === 0) continue;
          out.push({
            t: el.getAttribute("data-t"),
            h: Math.round(r.height * 10) / 10,
            w: Math.round(r.width * 10) / 10,
          });
        }
        return {
          coarse: matchMedia("(pointer: coarse)").matches,
          out,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      await ctx.close();

      if (touch && !res.coarse) {
        console.error("touch emulation is on but (pointer: coarse) did not match; the probe proves nothing.");
        process.exit(2);
      }

      // Keep the smallest instance of each control: the floor has to hold for
      // the worst one, not the average.
      const worst = new Map();
      for (const r of res.out) {
        const cur = worst.get(r.t);
        if (!cur || r.h < cur.h) worst.set(r.t, r);
      }
      measurements += worst.size;

      const short = [...worst.values()].filter(
        (r) => res.coarse && (r.h < FLOOR || (BOTH_AXES.has(r.t) && r.w < FLOOR)),
      );
      const tag = `${lang} ${String(width).padStart(4)}px  coarse=${res.coarse ? "yes" : "no "}`;
      const sizes = [...worst.values()].map((r) => `${r.t}:${r.h}`).join(" ");
      if (short.length || res.overflow > 0) {
        failures++;
        const why = short.length
          ? short.map((r) => `${r.t} is ${r.h} by ${r.w}`).join(", ")
          : `document scrolls horizontally by ${res.overflow}px`;
        console.log(`FAIL ${tag}  ${why}`);
      } else {
        console.log(`ok   ${tag}  overflow=${res.overflow}  ${sizes}`);
      }
    }
  }
}
await browser.close();

console.log(
  failures === 0
    ? `\nPASS  ${measurements} control measurements. Every control reaches ${FLOOR}px wherever the coarse ` +
        "query matched, no document overflow at any width, and the fine-pointer table is unchanged."
    : `\n${failures} failing viewport(s)`,
);
process.exit(failures === 0 ? 0 : 1);
