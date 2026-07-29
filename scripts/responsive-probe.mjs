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

  // ADV-2 owed responsive evidence for seven surfaces. They follow, one fragment each.
  //
  // Every string below was DUMPED from the model that produces it, not written here.
  // studioSteps, assessMedia, matchListing and decisionPack were run over one office
  // lease scenario (520 sqm, 1,350 SAR per square metre per year, fitted, three
  // photographs, no plan, no video) against an office brief of 400 to 600 sqm with a
  // 1,200 ceiling, and the EN and AR output was copied in verbatim. String length is
  // the entire thing a responsive measurement is measuring, so plausible-looking
  // invented copy would have measured nothing.
  //
  // Four of the seven sit inside the dashboard shell. Its sidebar is 240px and fixed
  // above 820px and a horizontal strip below it (sat-platform.css:305, 368). It is
  // reproduced as an empty .dside, because its width is the only property of it that
  // changes what is left for .dbody.

  // src/components/ListingStudio.tsx, the progress block and the step rail, as mounted
  // by src/app/[locale]/dashboard/new/page.tsx inside the dashboard shell.
  //
  // data-probe is on the <nav>, NOT on the <ol>. The <ol> is min-w-max, so it grows to
  // its own content and can never report overflow of itself; the element that scrolls
  // is the nav. Anchoring on the <ol> would have reported rowOverflow 0 at every width
  // and quietly measured nothing.
  //
  // Unlike the listings pill rail, this rail carries no media query, so it is declared
  // as a scroll rail at every measured width rather than below a breakpoint.
  //
  // Step 6 is drawn blocked on purpose: that is the only state in which the marker
  // renders, and until this package the marker carried text-red-600, which compiles to
  // nothing because tailwind.config.ts overwrites the red scale with a single hex.
  "studio-steps": {
    source: "src/components/ListingStudio.tsx (progress, resume and step rail)",
    rowRail: { maxWidth: 1280, why: "ListingStudio.tsx, nav.overflow-x-auto over an ol.min-w-max, no media query, so at every width" },
    copy: {
      en: {
        step: "Step 3 of 10",
        counts: "6 of 39 facts supplied",
        aria: "Facts supplied",
        resume: "Go to where you left off",
        nav: "Listing steps",
        titles: ["Asset and offer type", "What you are offering", "The property", "The offered space", "The terms", "Licence and documents", "Photographs and plans", "Location", "How viewers reach you", "Review and publish"],
      },
      ar: {
        step: "الخطوة 3 من 10",
        counts: "6 من 39 حقيقة مُدخلة",
        aria: "الحقائق المُدخلة",
        resume: "انتقل إلى موضع التوقف",
        nav: "خطوات العرض",
        titles: ["نوع الأصل والعرض", "التعريف بالعرض", "العقار", "المساحة المعروضة", "شروط العرض", "الترخيص والمستندات", "الصور والمخططات", "الموقع", "طريقة التواصل", "المراجعة والنشر"],
      },
    },
    render: (c) => `
<div class="dash" style="font-family:var(--sans);color:var(--ink)">
 <div class="dside"></div>
 <div class="dmain">
  <div class="dbody">
   <div class="max-w-2xl" data-inner="1">
    <div class="rounded-lg border border-line bg-ivory-2/40 p-3">
     <div class="flex items-baseline justify-between gap-3">
      <div class="text-[13px] font-medium">${c.step}</div>
      <div class="text-[12px] text-charcoal/60">${c.counts}</div>
     </div>
     <div class="mt-2 h-1.5 w-full rounded bg-charcoal/10 overflow-hidden" role="progressbar" aria-valuemin="0" aria-valuemax="39" aria-valuenow="6" aria-label="${c.aria}"><div class="h-full bg-signal" style="width:15.4%"></div></div>
     <button type="button" class="mt-2 text-[12px] text-signal underline min-h-[44px]">${c.resume}</button>
    </div>
    <nav aria-label="${c.nav}" class="mt-3 -mx-1 overflow-x-auto" data-probe="1">
     <ol class="flex gap-1 px-1 min-w-max">
${c.titles.map((title, i) => `      <li><button type="button" data-item="1" class="rounded border px-2.5 py-2 text-[12px] min-h-[44px] whitespace-nowrap ${i === 2 ? "border-signal text-signal font-medium" : "border-line text-charcoal/60"}"><span>${title}</span>${i === 5 ? `<span class="ms-1.5 text-red" aria-hidden="true">!</span>` : ""}</button></li>`).join("\n")}
     </ol>
    </nav>
   </div>
  </div>
 </div>
</div>`,
  },

  // src/components/MediaBrief.tsx, the countable status above the upload controls, in
  // the Photographs and plans step. Three statements, each a count of what the record
  // holds, plus the disclosure toggle whose label carries the shot count for the asset
  // type (9 for an office).
  //
  // data-item is on the statement spans and on the toggle, not on the <li>: an <li> is
  // a block and is therefore always exactly as wide as its container, so measuring it
  // could never produce widest > innerW no matter how long the sentence became.
  "media-brief": {
    source: "src/components/MediaBrief.tsx (requirement statements and disclosure toggle)",
    copy: {
      en: {
        title: "What this listing needs to show",
        reqs: [
          { met: false, text: "3 of 6 photographs attached.", note: "" },
          { met: false, text: "No plan attached.", note: "" },
          { met: false, text: "No video walkthrough attached.", note: " (expected, not required)" },
        ],
        toggle: "The 9 views a professional listing carries",
      },
      ar: {
        title: "ما الذي يجب أن يعرضه هذا الإعلان",
        reqs: [
          { met: false, text: "3 من 6 صور مرفقة.", note: "" },
          { met: false, text: "لا يوجد مخطط مرفق.", note: "" },
          { met: false, text: "لا يوجد فيديو للجولة.", note: " (متوقع وغير مطلوب)" },
        ],
        toggle: "9 لقطات يحملها الإعلان الاحترافي",
      },
    },
    render: (c) => `
<div class="dash" style="font-family:var(--sans);color:var(--ink)">
 <div class="dside"></div>
 <div class="dmain">
  <div class="dbody">
   <div class="max-w-2xl">
    <section class="mt-4 rounded-lg border border-line p-4">
     <div class="rounded border border-line p-3" data-inner="1">
      <div class="text-[12px] font-medium text-charcoal/80">${c.title}</div>
      <ul class="mt-2 space-y-1" data-probe="1">
${c.reqs.map((r) => `       <li class="text-[12px] flex items-start gap-2"><span aria-hidden="true" class="${r.met ? "text-signal" : "text-amber"}">${r.met ? "✓" : "○"}</span><span data-item="1" class="${r.met ? "text-charcoal/60" : "text-charcoal/80"}">${r.text}${r.note ? `<span class="text-charcoal/45">${r.note}</span>` : ""}</span></li>`).join("\n")}
      </ul>
      <button type="button" data-item="1" aria-expanded="false" class="mt-2 text-[12px] text-signal underline underline-offset-2 min-h-[44px]">${c.toggle}</button>
     </div>
    </section>
   </div>
  </div>
 </div>
</div>`,
  },

  // src/app/[locale]/dashboard/requirements/page.tsx, the match reason list, drawn with
  // the <details> OPEN because the closed state measures a single summary line and
  // tells you nothing about the eight rows underneath it.
  //
  // This is the longest per-row copy anywhere in ADV-2: a remedy sentence sits on its
  // own line under a reason sentence, inside a flex row that already gave 16px to the
  // state mark, inside .dpanel, inside .dbody, inside a shell that keeps 240px for the
  // sidebar until 820px. At 320px that is the narrowest column any of this copy is
  // asked to survive.
  "match-reasons": {
    source: "src/app/[locale]/dashboard/requirements/page.tsx (match reason disclosure)",
    copy: {
      en: {
        title: "Fitted office floor, Al Olaya",
        verdict: "Not a match",
        meta: "Al Olaya · 400 to 600 sqm",
        why: "Why this result",
        remedy: "What would settle it",
        open: "Open listing",
        pitch: "Pitch",
        reasons: [
          { mark: "✓", tone: "var(--slate)", label: "Asset type", reason: "The requirement asks for Office and this listing is Office.", remedy: "" },
          { mark: "✓", tone: "var(--slate)", label: "Deal type", reason: "Both the requirement and the listing are Lease.", remedy: "" },
          { mark: "?", tone: "var(--status-attention)", label: "City", reason: "The requirement is for Riyadh. This listing does not state a city.", remedy: "The lister states the city on the listing." },
          { mark: "✓", tone: "var(--slate)", label: "District", reason: "This listing is in the district the requirement names (Al Olaya).", remedy: "" },
          { mark: "✓", tone: "var(--slate)", label: "Size", reason: "520 sqm falls inside the requirement of 400 to 600 sqm.", remedy: "" },
          { mark: "×", tone: "var(--status-error)", label: "Budget", reason: "1350 per sqm is 12.5 percent above the ceiling of 1200.", remedy: "" },
          { mark: "?", tone: "var(--status-attention)", label: "Must have", reason: "The requirement lists \"parking\". SAT holds no record that states whether this space has it.", remedy: "The lister or the broker confirms it in writing." },
          { mark: "?", tone: "var(--status-attention)", label: "Must have", reason: "The requirement lists \"fitted\". SAT holds no record that states whether this space has it.", remedy: "The lister or the broker confirms it in writing." },
        ],
      },
      ar: {
        title: "دور مكتبي مجهّز، العليا",
        verdict: "غير مطابق",
        meta: "العليا · 400 إلى 600 متر مربع",
        why: "لماذا هذه النتيجة",
        remedy: "ما الذي يحسمها",
        open: "افتح العرض",
        pitch: "تقدّم",
        reasons: [
          { mark: "✓", tone: "var(--slate)", label: "نوع الأصل", reason: "المتطلب يطلب مكاتب وهذه القائمة مكاتب.", remedy: "" },
          { mark: "✓", tone: "var(--slate)", label: "نوع الصفقة", reason: "المتطلب والقائمة كلاهما إيجار.", remedy: "" },
          { mark: "?", tone: "var(--status-attention)", label: "المدينة", reason: "المتطلب في الرياض. هذه القائمة لا تذكر المدينة.", remedy: "يذكر المُدرِج المدينة في القائمة." },
          { mark: "✓", tone: "var(--slate)", label: "الحي", reason: "هذه القائمة في الحي الذي يحدده المتطلب (العليا).", remedy: "" },
          { mark: "✓", tone: "var(--slate)", label: "المساحة", reason: "520 متر مربع ضمن المطلوب من 400 إلى 600 متر مربع.", remedy: "" },
          { mark: "×", tone: "var(--status-error)", label: "الميزانية", reason: "1350 للمتر المربع أعلى من السقف 1200 بنسبة 12.5 بالمئة.", remedy: "" },
          { mark: "?", tone: "var(--status-attention)", label: "شرط أساسي", reason: "المتطلب يذكر \"parking\". لا تحتفظ سات بسجل يبيّن توفره في هذه المساحة.", remedy: "يؤكده المُدرِج أو الوسيط كتابةً." },
          { mark: "?", tone: "var(--status-attention)", label: "شرط أساسي", reason: "المتطلب يذكر \"fitted\". لا تحتفظ سات بسجل يبيّن توفره في هذه المساحة.", remedy: "يؤكده المُدرِج أو الوسيط كتابةً." },
        ],
      },
    },
    render: (c) => `
<div class="dash" style="font-family:var(--sans);color:var(--ink)">
 <div class="dside"></div>
 <div class="dmain">
  <div class="dbody">
   <div class="dpanel" data-inner="1">
    <div style="padding:14px 18px">
     <div class="row gap12" style="align-items:flex-start">
      <span class="queue-ic"></span>
      <div style="flex:1;min-width:0">
       <div class="row gap8 wrap" style="align-items:center">
        <span style="font-size:13.5px;font-weight:600">${c.title}</span>
        <span class="tag" style="font-size:10.5px;color:var(--status-attention);background:var(--status-attention-wash);border-color:transparent">${c.verdict}</span>
       </div>
       <div class="muted" style="font-size:11.5px;margin-top:3px"><bdi>${c.meta}</bdi></div>
      </div>
      <a class="btn secondary sm rowact" href="#">${c.pitch}</a>
     </div>
     <details style="margin-top:10px" open>
      <summary style="font-size:12px;color:var(--slate);cursor:pointer">${c.why} <bdi>(${c.reasons.length})</bdi></summary>
      <ul style="list-style:none;margin:8px 0 0;padding:0;display:grid;gap:7px" data-probe="1">
${c.reasons.map((r) => `       <li style="display:flex;gap:8px;align-items:flex-start;font-size:12.3px;line-height:1.6"><span aria-hidden="true" class="mono" style="flex:none;width:16px;text-align:center;color:${r.tone}">${r.mark}</span><span style="min-width:0" data-item="1"><span style="font-weight:600">${r.label}</span><span class="muted"> ${r.reason}</span>${r.remedy ? `<span style="display:block;margin-top:2px;color:var(--slate)">${c.remedy}: ${r.remedy} <a href="#" style="color:var(--azure-d)">${c.open}</a></span>` : ""}</span></li>`).join("\n")}
      </ul>
     </details>
    </div>
   </div>
  </div>
 </div>
</div>`,
  },

  // src/app/[locale]/me/page.tsx, the viewings section. The row is the interesting
  // part: a text block with min-width:0 beside an action block with flex:none, in a
  // wrapping flex row. If the action block ever refuses to drop to a second line the
  // status label and the button squeeze the title instead, and the Arabic status
  // "بانتظار رد المُعلن" is the longest label either language produces.
  //
  // The timestamp is what Intl actually returns for Asia/Riyadh in this runtime, not a
  // hand-typed date, since the Arabic form carries three comma-separated parts and the
  // English two.
  "me-viewings": {
    source: "src/app/[locale]/me/page.tsx (viewings rows)",
    copy: {
      en: {
        head: "Your viewings",
        sub: "The slots you asked for, and what was decided",
        n: "2",
        rows: [
          { title: "Fitted office floor, Al Olaya", meta: "Al Olaya · 520 m²", when: "Tue 04 Aug, 14:00", status: "Awaiting the lister", tone: "var(--amber)", past: "" },
          { title: "Shell and core floor, King Fahd Road", meta: "Al Olaya · 610 m²", when: "Thu 06 Aug, 10:30", status: "Confirmed", tone: "var(--harbor)", past: "" },
        ],
        view: "View",
      },
      ar: {
        head: "معايناتك",
        sub: "المواعيد التي طلبتها وما استقر عليه الأمر",
        n: "2",
        rows: [
          { title: "دور مكتبي مجهّز، العليا", meta: "العليا · 520 m²", when: "الثلاثاء، 04 أغسطس، 14:00", status: "بانتظار رد المُعلن", tone: "var(--amber)", past: "" },
          { title: "دور على المحارة، طريق الملك فهد", meta: "العليا · 610 m²", when: "الخميس، 06 أغسطس، 10:30", status: "مؤكد", tone: "var(--harbor)", past: "" },
        ],
        view: "عرض",
      },
    },
    render: (c) => `
<div style="max-width:1120px;margin:0 auto;padding:28px 24px 64px;font-family:var(--sans);color:var(--ink);background:var(--paper)" data-inner="1">
 <div class="modhead"><span class="ttl" style="font-weight:700">${c.head}</span><span class="muted" style="margin-inline-start:8px;font-size:13px">${c.n}</span></div>
 <div style="display:grid;gap:10px">
${c.rows.map((r, i) => `  <div class="card pad row between wrap"${i === 0 ? ` data-probe="1"` : ""} style="align-items:center;gap:12px;box-shadow:none;border:1px solid var(--silver)">
   <div style="min-width:0"${i === 0 ? ` data-item="1"` : ""}>
    <a href="#" style="font-size:14px;font-weight:600;color:var(--ink);text-decoration:none">${r.title}</a>
    <div class="muted" style="font-size:12px;margin-top:3px"><bdi dir="ltr">${r.meta}</bdi></div>
    <div class="mono" style="font-size:12.5px;margin-top:4px"><bdi dir="ltr">${r.when}</bdi></div>
   </div>
   <div class="row gap12" style="align-items:center;flex:none"${i === 0 ? ` data-item="1"` : ""}>
    <span style="color:${r.tone};font-weight:600;font-size:12.5px">${r.status}</span>
    <a class="btn secondary sm" href="#">${c.view}</a>
   </div>
  </div>`).join("\n")}
 </div>
</div>`,
  },

  // src/app/[locale]/me/page.tsx, the saved list grouped by shortlist. The group header
  // appears only when a person has more than one group, so it is drawn here with two.
  //
  // data-probe is the grid, because the question this fragment answers is whether
  // minmax(210px,1fr) with a 16px gap still fits inside 1120px minus 48px of side
  // padding at 320px. It does not overflow by construction, and the measurement is
  // what proves the construction, not a substitute for it.
  "me-shortlist": {
    source: "src/app/[locale]/me/page.tsx (shortlist grouping and card grid)",
    copy: {
      en: {
        head: "Saved", n: "3", group: "Head office search", unfiled: "Not on a shortlist",
        cards: [
          { price: "1,350", unit: " SAR/m²·yr", title: "Fitted office floor, Al Olaya", meta: "Al Olaya · 520 m²" },
          { price: "1,180", unit: " SAR/m²·yr", title: "Shell and core floor, King Fahd Road", meta: "Al Olaya · 610 m²" },
        ],
      },
      ar: {
        head: "المحفوظات", n: "3", group: "البحث عن مقر رئيسي", unfiled: "غير مدرجة في قائمة",
        cards: [
          { price: "1,350", unit: " ريال/م²·سنة", title: "دور مكتبي مجهّز، العليا", meta: "العليا · 520 m²" },
          { price: "1,180", unit: " ريال/م²·سنة", title: "دور على المحارة، طريق الملك فهد", meta: "العليا · 610 m²" },
        ],
      },
    },
    render: (c) => `
<div style="max-width:1120px;margin:0 auto;padding:28px 24px 64px;font-family:var(--sans);color:var(--ink);background:var(--paper)" data-inner="1">
 <div class="modhead"><span class="ttl" style="font-weight:700">${c.head}</span><span class="muted" style="margin-inline-start:8px;font-size:13px">${c.n}</span></div>
 <div style="margin-top:14px">
  <div class="row gap12" style="align-items:baseline;margin-bottom:8px">
   <span style="font-size:13px;font-weight:700;color:var(--harbor)">${c.group}</span>
   <span class="muted" style="font-size:12px">2</span>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px" data-probe="1">
${c.cards.map((k) => `   <a href="#" class="listing" style="text-decoration:none;color:inherit" data-item="1">
    <div style="height:130px;background:var(--silver)"></div>
    <div class="body" style="padding:10px 12px 12px">
     <div class="mono" style="font-size:13px;font-weight:600">${k.price}<small style="font-weight:400;color:var(--slate)">${k.unit}</small></div>
     <div style="font-size:12.5px;margin-top:4px;line-height:1.35">${k.title}</div>
     <div class="muted" style="font-size:11.5px;margin-top:3px"><bdi dir="ltr">${k.meta}</bdi></div>
    </div>
   </a>`).join("\n")}
  </div>
 </div>
</div>`,
  },

  // src/app/[locale]/saved/page.tsx, the shortlist chooser. A wrapping chip row whose
  // last member is not a chip at all but the sentence saying where the names live, and
  // that sentence is the longest thing in the row in both languages. The per-card
  // <select> is included because a native select at 12.5px inside a 210px column is a
  // separate narrow-width risk and there is no reason to measure the row without it.
  "saved-folders": {
    source: "src/app/[locale]/saved/page.tsx (shortlist chooser and per-card folder select)",
    copy: {
      en: {
        all: "All · 3", folders: ["Head office search · 2", "Warehouse brief · 1"],
        where: "Shortlists are saved to your account",
        none: "No folder", nw: "New folder…",
      },
      ar: {
        all: "الكل · 3", folders: ["البحث عن مقر رئيسي · 2", "متطلب المستودع · 1"],
        where: "القوائم محفوظة في حسابك",
        none: "بدون مجلد", nw: "مجلد جديد…",
      },
    },
    render: (c) => `
<section class="mx-auto max-w-[1360px] px-6 pt-7 pb-16" style="font-family:var(--sans);color:var(--ink);background:var(--paper)">
 <div data-inner="1">
  <div class="mt-6 flex flex-wrap items-center gap-2" data-probe="1">
   <button type="button" class="chip on" data-item="1">${c.all}</button>
${c.folders.map((f) => `   <button type="button" class="chip" data-item="1">${f}</button>`).join("\n")}
   <span class="text-[11px] text-charcoal/40" data-item="1">${c.where}</span>
  </div>
  <div class="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
   <div>
    <div style="height:130px;background:var(--silver);border-radius:12px"></div>
    <select class="mt-2 w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12.5px] text-charcoal/70">
     <option>${c.none}</option>
     <option>${c.folders[0]}</option>
     <option>${c.nw}</option>
    </select>
   </div>
  </div>
 </div>
</section>`,
  },

  // src/components/DecisionPackPanel.tsx, the readiness card, drawn for the candidate
  // that states almost nothing, because "Not stated" rows carry the longest details in
  // the set and the amber state label is the widest.
  //
  // This is the tightest constraint in ADV-2: the label span holds min-width:140 and
  // the detail span holds flex:1 with min-width:200 in the same wrapping row, so the
  // row demands 352px before it is allowed to wrap at all. data-item sits on all three
  // spans of every row so that widest > innerW catches it at 320 and 360 rather than
  // trusting that flex-wrap resolved it.
  "pack-dimensions": {
    source: "src/components/DecisionPackPanel.tsx (per-candidate readiness and dimension rows)",
    copy: {
      en: {
        head: "Readiness, space by space",
        title: "Shell and core floor, King Fahd Road",
        readiness: "Missing an essential",
        counts: "0 confirmed · 3 stated · 0 aged · 7 not on the record",
        dims: [
          { label: "Asking rent", detail: "Asking 1,180 SAR per square metre per year, stated by the lister.", state: "Stated", amber: false },
          { label: "Area", detail: "610 square metres, stated by the lister. The record does not say whether that area is net or gross.", state: "Stated", amber: false },
          { label: "Availability", detail: "No affirmation of availability is on the record.", state: "Not stated", amber: true },
          { label: "Right to offer", detail: "The record does not say on what basis this party offers the space.", state: "Not stated", amber: true },
          { label: "Advertisement permit", detail: "No advertisement permit number is on the record.", state: "Not stated", amber: true },
          { label: "Service charge", detail: "The record states no service charge. That is not the same as no service charge being payable.", state: "Not stated", amber: true },
          { label: "VAT treatment", detail: "The record does not say whether the stated figure includes VAT.", state: "Not stated", amber: true },
          { label: "Incentives", detail: "The record states no rent free period and no fit out contribution. Neither is recorded as absent; neither is recorded at all.", state: "Not stated", amber: true },
          { label: "Lease term", detail: "The record states no lease term.", state: "Not stated", amber: true },
          { label: "Fit out condition", detail: "Shell & core, stated by the lister.", state: "Stated", amber: false },
        ],
      },
      ar: {
        head: "جاهزية كل مساحة",
        title: "دور على المحارة، طريق الملك فهد",
        readiness: "ناقص أساسي",
        counts: "0 مثبتة · 3 مذكورة · 0 قديمة · 7 غير مسجّلة",
        dims: [
          { label: "الإيجار المطلوب", detail: "السعر المطلوب 1,180 ريال لكل متر مربع سنوياً، بحسب ما ذكره المُدرِج.", state: "مذكور", amber: false },
          { label: "المساحة", detail: "610 متر مربع، بحسب ما ذكره المُدرِج. ولا يوضح السجل ما إذا كانت المساحة صافية أم إجمالية.", state: "مذكور", amber: false },
          { label: "التوفر", detail: "لا يوجد في السجل أي تأكيد للتوفر.", state: "غير مذكور", amber: true },
          { label: "صفة العرض", detail: "لا يذكر السجل الأساس الذي يعرض به هذا الطرف المساحة.", state: "غير مذكور", amber: true },
          { label: "ترخيص الإعلان", detail: "لا يوجد رقم ترخيص إعلان في السجل.", state: "غير مذكور", amber: true },
          { label: "رسوم الخدمات", detail: "لا يذكر السجل أي رسوم خدمات، وهذا لا يعني أن الرسوم غير مستحقة.", state: "غير مذكور", amber: true },
          { label: "معالجة ضريبة القيمة المضافة", detail: "لا يذكر السجل ما إذا كان المبلغ المذكور شاملاً ضريبة القيمة المضافة.", state: "غير مذكور", amber: true },
          { label: "الحوافز", detail: "لا يذكر السجل فترة بلا إيجار ولا مساهمة في التجهيز. ولم تُسجل أي منهما كغير موجودة، بل لم تُسجل أصلاً.", state: "غير مذكور", amber: true },
          { label: "مدة العقد", detail: "لا يذكر السجل مدة العقد.", state: "غير مذكور", amber: true },
          { label: "حالة التجهيز", detail: "على المحارة، بحسب ما ذكره المُدرِج.", state: "مذكور", amber: false },
        ],
      },
    },
    render: (c) => `
<div style="background:var(--cool);font-family:var(--sans);color:var(--ink)">
 <div style="max-width:1360px;margin:0 auto">
  <div style="padding:24px 24px 44px">
   <section class="card" style="margin-top:20px;padding:20px;box-shadow:var(--sh-1)">
    <div style="margin-top:20px">
     <div style="font-size:12.5px;font-weight:700;color:var(--slate)">${c.head}</div>
     <div style="display:grid;gap:8px;margin-top:8px">
      <div class="card pad" style="box-shadow:none;border:1px solid var(--silver)" data-inner="1">
       <div class="row between wrap" style="align-items:baseline;gap:10px">
        <span style="font-size:13.5px;font-weight:600">${c.title}</span>
        <span style="font-size:12px;font-weight:700;color:var(--slate)">${c.readiness}</span>
       </div>
       <div class="muted mono" style="font-size:11.5px;margin-top:4px"><bdi dir="ltr">${c.counts}</bdi></div>
       <div style="display:grid;gap:4px;margin-top:8px" data-probe="1">
${c.dims.map((d) => `        <div class="row gap12 wrap" style="align-items:baseline"><span data-item="1" style="font-size:12px;font-weight:600;min-width:140px">${d.label}</span><span data-item="1" class="muted" style="font-size:12px;flex:1 1 200px;line-height:1.55">${d.detail}</span><span data-item="1" style="font-size:11px;font-weight:700;color:${d.amber ? "var(--amber)" : "var(--slate)"}">${d.state}</span></div>`).join("\n")}
       </div>
      </div>
     </div>
    </div>
   </section>
  </div>
 </div>
</div>`,
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
// the row is built to be wider than its box and the reader swipes it.
//
// ADV-3A.1, finding 53. `docOverflow` IS NOT A CHECK. `sat-platform.css:550` sets
// `html,body{overflow-x:clip}`, which is right for the product and means
// `documentElement.scrollWidth` can never exceed `clientWidth`. So the first
// clause below is structurally incapable of firing, and the `doc ovf` column is
// zero whether or not anything overflows. It is kept as a backstop against a
// future change to that CSS rule, and named here so that nobody reads a clean
// column as evidence.
//
// The assertions that actually decide this run are the two element-level ones:
// a row wider than its box outside a rail, and any measured item wider than the
// content box it sits in. Both read element geometry. The decision pack defect
// at finding 51 is the worked example: it surfaced as `row ovf 16` with
// `doc ovf 0`, so a probe trusting the document measurement would have passed
// it. Any assertion added later belongs with the element-level pair.
//
// A leaking scroll rail is therefore caught by `widest > innerW`, not by the
// document clause, because the rail's own items are measured.
const bad = rows.filter((r) => r.docOverflow > 0 || (r.rowOverflow > 0 && !r.rail) || r.widest > r.innerW);
const rails = rows.filter((r) => r.rail && r.rowOverflow > 0).length;
console.log(bad.length === 0
  ? `\nPASS  ${rows.length} measurements, no row past its box, no item wider than its content box`
    + ` (document overflow is not measurable under overflow-x:clip and is not claimed)`
    + (rails ? `, ${rails} inside a declared scroll rail (row wider than its box by design)` : "")
  : `\nFAIL  ${bad.length} of ${rows.length}: ` + bad.map((b) => `${b.name} ${b.loc}@${b.width}`).join(", "));
process.exit(bad.length === 0 ? 0 : 1);
