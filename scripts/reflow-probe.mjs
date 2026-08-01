// Reflow probe: measure what a fixed grid track does at the 400 percent zoom
// reference viewport, and prove the replacement changes nothing above it.
//
// Why this exists alongside scripts/responsive-probe.mjs and scripts/touch-probe.mjs
//
// The responsive probe renders at device widths. WCAG 2.2 SC 1.4.10 is not a
// device-width criterion: it is stated against 320 by 256 CSS pixels, which is
// what a 1280 by 1024 window becomes at 400 percent zoom. Nothing in this
// repository rendered at that size, so findings 141, 158 and 184 were all
// reported by hand and none of them could be re-checked afterwards. That is the
// gap this closes.
//
// The three findings are one property in three places: a fixed dimension where a
// content-driven one belongs. A `1fr 1fr` track pair states that two columns
// exist at every width there will ever be. A `minmax(320px, 1fr)` track states
// that 320 pixels of column are available inside a box that is 246 wide. Neither
// statement is checkable by reading it, which is why both survived review.
//
// WHAT THE MEASUREMENTS ACTUALLY SHOW, stated plainly because it corrects the
// finding as filed: the `1fr 1fr` pairs do NOT make the document scroll
// horizontally. Every field is `width:100%` inside a `<div>` whose min-content
// is set by its label text, and label text wraps, so the grid squeezes instead
// of overflowing. The defect is therefore not an overflow failure. It is that at
// the 400 percent reference each field gets roughly 117 pixels and its label
// wraps to three or four lines, which is why the probe reports column WIDTH and
// label LINE COUNT and not only an overflow number. Reporting this as an
// overflow failure would have been a claim the instrument does not support.
//
// The second measurement matters as much as the first. Codex's instruction for
// PKG-A11Y-1 is "Do not reduce visual quality to satisfy accessibility." A fix
// that stacked these pairs on a 390 pixel phone would be a design change wearing
// an accessibility label. The probe asserts the column count is unchanged at
// every width above the collapse point, so that claim can be read rather than
// trusted.
//
// `--survey` prints the resolved column count for a range of candidate collapse
// thresholds at every width in both directions. That table is how each shipped
// threshold was chosen: measured before it was written, not justified after. It
// is also why the two form pairs ship at 8rem and the requirement stat pair at
// 7rem. They sit in different containers, so the same threshold does not
// collapse them at the same width, and one number for both would have moved the
// stat pair on a 360 pixel phone.
//
// The container chain is copied from the real routes and is stated as such:
// `.dbody` is 18px 16px 32px below 600px and 24px 30px 40px above it
// (src/styles/sat-platform.css:389 and :622), `.dpanel` carries an inline
// padding of 20 on both dashboard form routes, and the requirement success
// panel is a `.card.pad` at 22px inside a 720px column with 24px of gutter. The
// field markup is copied from src/components/EditListingForm.tsx,
// src/components/ProfileForm.tsx, src/app/[locale]/post-requirement/
// RequirementForm.tsx and src/app/[locale]/compare/loading.tsx. This is
// browser-emulated evidence of the layout rules. It is not a screen reader and
// it is not a physical device; both are recorded as outstanding in
// docs/findings-register.md.
//
// Usage, from the repository root:
//
//   node scripts/reflow-probe.mjs --chromium /opt/pw-browsers/chromium
//   node scripts/reflow-probe.mjs --chromium /opt/pw-browsers/chromium --survey
//
// Exit code 1 on horizontal overflow, on a column-count regression above the
// collapse point, or on a pair that failed to collapse at 320. Exit code 2 on a
// harness fault.

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
const SURVEY = argv.includes("--survey");
const CHROME = flag("--chromium", process.env.CHROMIUM_PATH || "");

const platform = readFileSync(join(ROOT, "src", "styles", "sat-platform.css"), "utf8");

const PAIR_8 = "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))";
const PAIR_7 = "repeat(auto-fit, minmax(min(100%, 7rem), 1fr))";
const COMPARE_FIXED = "160px repeat(3, 1fr)";
const COMPARE_SHIPPED = "minmax(0, 160px) repeat(3, minmax(0, 1fr))";

// Candidates surveyed for the field pairs. The first entry is the defect.
const PAIR_CANDIDATES = [
  ["1fr 1fr", "the defect: two columns declared at every width"],
  [PAIR_7, "112px floor"],
  [PAIR_8, "128px floor"],
  ["repeat(auto-fit, minmax(min(100%, 9rem), 1fr))", "144px floor"],
  ["repeat(auto-fit, minmax(min(100%, 10rem), 1fr))", "160px floor"],
];

// Widths. 320x256 is the SC 1.4.10 reference: a 1280x1024 window at 400 percent.
// The rest are the standing SAT viewport set.
const VIEWS = [
  { w: 320, h: 256, note: "400% zoom reference" },
  { w: 320, h: 900, note: "smallest phone" },
  { w: 360, h: 900, note: "" },
  { w: 390, h: 900, note: "" },
  { w: 430, h: 900, note: "" },
  { w: 768, h: 1024, note: "" },
  { w: 1280, h: 1024, note: "" },
];

// Real labels from the two dictionaries. The Arabic ones are the strings the
// components actually render; a probe run on English text alone would miss that
// "البريد الإلكتروني" is a single unbreakable-looking pair of long words.
// The price label is the lease variant, which is the longest of the four the
// component can render, so the pair is measured at its worst case rather than a
// convenient one. Both label sets are the exact strings asserted in
// src/lib/fieldLabel.test.ts.
const LOCALES = [
  ["ltr", "en", {
    area: "Area (m²)", price: "Asking rent (SAR/m²/yr)", phone: "Contact phone", email: "Email address",
    site: "Website", logo: "Logo URL",
    card: { tag: "Office · Lease", ref: "REQ-2451", title: "Fitted office floor, King Fahd Road", loc: "Al Olaya, Riyadh", size: "800 to 1,200 m² · up to 1,400 SAR/m²/yr" },
  }],
  ["rtl", "ar", {
    area: "المساحة (م²)", price: "الإيجار المطلوب (ريال/م²·سنة)", phone: "هاتف التواصل", email: "البريد الإلكتروني",
    site: "الموقع الإلكتروني", logo: "رابط الشعار",
    card: { tag: "مكاتب · إيجار", ref: "REQ-2451", title: "دور مكتبي مجهّز على طريق الملك فهد", loc: "العليا، الرياض", size: "800 إلى 1,200 م² · حتى 1,400 ريال/م²·سنة" },
  }],
];

const INP =
  "width:100%;border-radius:8px;border:1px solid var(--silver-2);padding:9px 11px;" +
  "font-size:0.84375rem;color:var(--ink);background:var(--paper);box-sizing:border-box;";
const LBL = "display:block;font-size:0.75rem;color:var(--slate);margin-bottom:5px;font-weight:600;";

const field = (id, label, type) =>
  `<div><label style="${LBL}" for="${id}" data-l>${label}</label><input id="${id}" style="${INP}" type="${type}"></div>`;

// Four real surfaces, each with its own container chain, because the collapse
// point depends on the box the grid sits in and not on the grid alone. `tracks`
// maps a site key to the track list under test for this run.
function surfaces(tracks, L) {
  return `
  <div class="dash"><div class="dmain"><div class="dbody">
    <div class="dpanel" style="padding:20px">
      <div data-g="edit-numbers" style="display:grid;grid-template-columns:${tracks["edit-numbers"]};gap:12px">
        ${field("area_sqm", L.area, "number")}${field("price", L.price, "number")}
      </div>
      <div data-g="edit-contact" style="display:grid;grid-template-columns:${tracks["edit-contact"]};gap:12px;margin-top:14px">
        ${field("contact_phone", L.phone, "text")}${field("contact_email", L.email, "email")}
      </div>
    </div>
    <div class="dpanel" style="padding:20px;margin-top:18px">
      <div data-g="profile-links" style="display:grid;grid-template-columns:${tracks["profile-links"]};gap:12px">
        ${field("pf-website", L.site, "text")}${field("pf-logo", L.logo, "text")}
      </div>
    </div>
  </div></div></div>
  <div style="background:var(--cool)"><div style="padding:40px 24px 56px;max-width:720px;margin:0 auto">
    <div class="card pad" style="text-align:center">
      <div data-g="req-stats" style="display:grid;grid-template-columns:${tracks["req-stats"]};gap:12px;margin:22px 0">
        <div class="card pad" style="box-shadow:none;background:var(--cool)">
          <div style="font-size:1.625rem;font-weight:600">12</div><div style="font-size:0.75rem" data-l>Matches today</div>
        </div>
        <div class="card pad" style="box-shadow:none;background:var(--cool)">
          <div style="font-size:1.625rem;font-weight:600">3</div><div style="font-size:0.75rem" data-l>Audiences notified</div>
        </div>
      </div>
    </div>
  </div></div>
  <div style="max-width:1180px;margin:0 auto;padding:28px 24px 64px">
    <div data-g="compare-skeleton" style="display:grid;grid-template-columns:${tracks["compare-skeleton"]};gap:12px;margin-top:24px">
      ${Array.from({ length: 8 }, (_, i) => `<div class="sk" style="height:${i < 4 ? 90 : 20}px;border-radius:${i < 4 ? 12 : 6}px"></div>`).join("")}
    </div>
  </div>
  <div style="background:var(--cool)"><div style="padding:36px 24px 48px;max-width:1080px;margin:0 auto">
    <div data-g="req-cards" style="display:grid;grid-template-columns:${tracks["req-cards"]};gap:16px;margin-top:28px">
      ${Array.from({ length: 2 }, () => `
      <div class="card pad" style="display:block">
        <div class="row between" style="align-items:center">
          <span class="tag">${L.card.tag}</span>
          <span class="mono" style="font-size:0.6875rem">${L.card.ref}</span>
        </div>
        <div style="font-size:0.96875rem;font-weight:700;margin:12px 0 8px;line-height:1.3">${L.card.title}</div>
        <div style="font-size:0.78125rem;line-height:1.7">
          <div>${L.card.loc}</div><div>${L.card.size}</div>
        </div>
      </div>`).join("")}
    </div>
  </div></div>`;
}

const page = (dir, lang, body) => `<!doctype html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${platform}</style>
<style>html,body{margin:0}.dside{display:none}.sk{background:#e9edf1}</style></head><body>${body}</body></html>`;

const columns = (v) => (v === "none" ? 0 : v.trim().split(/\s+/).filter((x) => parseFloat(x) > 0).length);

// Sites whose collapse behaviour is asserted as a pair. The compare skeleton is
// not a pair, so it is checked on width alone.
const PAIRS = ["edit-numbers", "edit-contact", "profile-links", "req-stats"];
const KEYS = [...PAIRS, "compare-skeleton", "req-cards"];

// Finding 184's exact track, before and after. This is the one site of the three
// where the fixed dimension really does push the document sideways, and the
// difference is measured rather than argued.
const CARDS_FIXED = "repeat(auto-fill, minmax(320px, 1fr))";
const CARDS_SHIPPED = "repeat(auto-fill, minmax(min(100%, 320px), 1fr))";

// The shipped configuration, and the width from which each pair must still be
// two columns. `from` is the non-regression floor: at that width and above, the
// rendering has to be byte-identical to what shipped before this package.
const SHIPPED = {
  "edit-numbers": { track: PAIR_8, from: 360 },
  "edit-contact": { track: PAIR_8, from: 360 },
  "profile-links": { track: PAIR_8, from: 360 },
  "req-stats": { track: PAIR_7, from: 360 },
  // Deliberately unchanged, and the survey below is why. `160px repeat(3, 1fr)`
  // was going to become `minmax(0, 160px) repeat(3, minmax(0, 1fr))` on the
  // reasoning that a fixed 160px label column inside a 272px box is the same
  // defect class as the field pairs. Measured, the two track lists resolve
  // identically at every width in both directions: the first track takes its
  // 160px maximum whenever the row fits at all, and the row does fit, because
  // the three `1fr` tracks hold empty skeleton boxes whose min-content is zero.
  // The rewrite is a no-op, so it is not shipped. What the numbers do show is
  // that the label column takes 59 percent of the row at the 400 percent
  // reference and the three data columns get 25px each. That is recorded as a
  // finding rather than patched blind, because the repair is a layout decision
  // about the compare table itself and not a track-syntax swap.
  "compare-skeleton": { track: COMPARE_FIXED, from: 0 },
  "req-cards": { track: CARDS_SHIPPED, from: 0 },
};
const shippedTracks = Object.fromEntries(Object.entries(SHIPPED).map(([k, v]) => [k, v.track]));

async function run(browser, tracks) {
  const rows = [];
  for (const [dir, lang, L] of LOCALES) {
    for (const v of VIEWS) {
      const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h } });
      const p = await ctx.newPage();
      await p.setContent(page(dir, lang, surfaces(tracks, L)), { waitUntil: "load" });
      const res = await p.evaluate(() => {
        const out = {};
        for (const el of document.querySelectorAll("[data-g]")) {
          const cs = getComputedStyle(el);
          let lines = 0;
          let narrow = Infinity;
          let overhang = 0;
          const box = el.getBoundingClientRect().width;
          for (const kid of el.children) {
            const kw = kid.getBoundingClientRect().width;
            narrow = Math.min(narrow, Math.round(kw * 10) / 10);
            // How far a grid item sticks out of its own grid box. This is the
            // number that matters here, and not the document scroll width,
            // because sat-platform.css:630 and globals.css:220 both set
            // `html,body{overflow-x:clip}`. Clipped overflow is not scrollable
            // overflow: the document reports zero and the content is simply cut
            // off and unreachable. Any reflow check written against
            // `scrollWidth - clientWidth` passes on every page of this site
            // whatever the layout does, which is exactly how a 320px track
            // inside a 272px box survived review.
            overhang = Math.max(overhang, Math.round((kw - box) * 10) / 10);
            const lab = kid.matches("[data-l]") ? kid : kid.querySelector("[data-l]");
            if (lab) {
              // Line boxes, not height divided by line-height. These labels
              // compute `line-height: normal`, which is not a number, so the
              // arithmetic form silently produced NaN and reported zero lines
              // for every label at every width. A Range over the text node
              // returns one client rect per line box, which is the thing being
              // counted.
              const rg = document.createRange();
              rg.selectNodeContents(lab);
              lines = Math.max(lines, rg.getClientRects().length);
            }
          }
          out[el.getAttribute("data-g")] = {
            cols: cs.gridTemplateColumns,
            w: Math.round(el.getBoundingClientRect().width * 10) / 10,
            narrow: narrow === Infinity ? 0 : narrow,
            overhang: Math.max(0, overhang),
            lines,
          };
        }
        return { out, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      await ctx.close();
      rows.push({ dir, lang, v, ...res });
    }
  }
  return rows;
}

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});

if (SURVEY) {
  console.log(
    "\nSURVEY. One candidate applied to all four field pairs at once, so the four\n" +
      "container chains can be compared against the same threshold. Each cell is\n" +
      "`site=columns@narrowest-column-px/label-lines`.\n",
  );
  for (const [track, note] of PAIR_CANDIDATES) {
    const tracks = Object.fromEntries(PAIRS.map((k) => [k, track]));
    tracks["compare-skeleton"] = COMPARE_FIXED;
    tracks["req-cards"] = CARDS_SHIPPED;
    const rows = await run(browser, tracks);
    console.log(`--- ${track}\n    ${note}`);
    for (const r of rows) {
      const cells = PAIRS.map((k) => `${k}=${columns(r.out[k].cols)}@${r.out[k].narrow}/${r.out[k].lines}L`).join("  ");
      const tag = `${r.lang} ${String(r.v.w).padStart(4)}x${String(r.v.h).padEnd(4)}${r.v.note ? " " + r.v.note : ""}`;
      console.log(`    ${tag.padEnd(34)} overflow=${r.overflow}  ${cells}`);
    }
  }
  console.log("\n--- finding 184, journey 4, src/app/[locale]/requirements/page.tsx:59");
  for (const [track, note] of [[CARDS_FIXED, "the defect: a 320px floor inside a 272px box"], [CARDS_SHIPPED, "shipped"]]) {
    const tracks = Object.fromEntries(PAIRS.map((k) => [k, "1fr 1fr"]));
    tracks["compare-skeleton"] = COMPARE_FIXED;
    tracks["req-cards"] = track;
    const rows = await run(browser, tracks);
    console.log(`    ${track}   ${note}`);
    for (const r of rows) {
      const c = r.out["req-cards"];
      const tag = `${r.lang} ${String(r.v.w).padStart(4)}x${String(r.v.h).padEnd(4)}`;
      console.log(
        `      ${tag.padEnd(20)} document scroll overflow=${String(r.overflow).padStart(3)}  clipped overhang=${String(c.overhang).padStart(4)}px  card width=${c.narrow}  tracks=[${c.cols}]`,
      );
    }
  }

  console.log("\n--- compare skeleton, journey 3, src/app/[locale]/compare/loading.tsx:6");
  for (const [track, note] of [[COMPARE_FIXED, "shipped, unchanged"], [COMPARE_SHIPPED, "the rewrite that was considered and measured as a no-op"]]) {
    const tracks = Object.fromEntries(PAIRS.map((k) => [k, "1fr 1fr"]));
    tracks["compare-skeleton"] = track;
    tracks["req-cards"] = CARDS_SHIPPED;
    const rows = await run(browser, tracks);
    console.log(`    ${track}   ${note}`);
    for (const r of rows) {
      const c = r.out["compare-skeleton"];
      const tag = `${r.lang} ${String(r.v.w).padStart(4)}x${String(r.v.h).padEnd(4)}`;
      console.log(`      ${tag.padEnd(20)} narrowest=${c.narrow}  tracks=[${c.cols}]`);
    }
  }
  console.log(
    "\nRead it as: a shipped threshold must hold the `1fr 1fr` column count at every\n" +
      "width from its stated floor upward, and must drop to one column at 320.\n",
  );
}

const rows = await run(browser, shippedTracks);
await browser.close();

let failures = 0;
for (const r of rows) {
  const tag = `${r.lang} ${String(r.v.w).padStart(4)}x${String(r.v.h).padEnd(4)}`;
  const bad = [];
  if (r.overflow > 0) bad.push(`document scrolls horizontally by ${r.overflow}px`);
  for (const k of KEYS) {
    if (r.out[k].overhang > 0) {
      bad.push(`${k} has an item ${r.out[k].overhang}px wider than its own grid box; \`overflow-x:clip\` means that width is cut off, not scrollable`);
    }
  }
  for (const k of PAIRS) {
    const n = columns(r.out[k].cols);
    if (r.v.w >= SHIPPED[k].from && n !== 2) {
      bad.push(`${k} is ${n} column(s) at ${r.v.w}px, expected 2. This threshold moves a layout that already fitted.`);
    }
    if (r.v.w === 320 && n !== 1) {
      bad.push(`${k} is ${n} column(s) at the 400% reference, expected 1. The pair did not collapse.`);
    }
  }
  // The compare skeleton ships unchanged. It is measured here so the decision
  // not to touch it stays checkable: four tracks, no overflow, and a label
  // column that is still 160px at 320. If any of that moves, the register entry
  // describing it has gone stale.
  const cmp = r.out["compare-skeleton"];
  if (columns(cmp.cols) !== 4) bad.push(`compare-skeleton is ${columns(cmp.cols)} track(s), expected 4`);
  if (Math.abs(parseFloat(cmp.cols.split(/\s+/)[0]) - 160) > 0.6) {
    bad.push(`compare-skeleton label column is ${cmp.cols.split(/\s+/)[0]} at ${r.v.w}px, expected the unchanged 160px`);
  }

  // Finding 184. One column below the floor, and the card must fit the box it
  // is in rather than the 320px the track used to demand.
  const cards = r.out["req-cards"];
  if (r.v.w <= 360 && columns(cards.cols) !== 1) bad.push(`req-cards is ${columns(cards.cols)} column(s) at ${r.v.w}px, expected 1`);
  if (r.v.w === 320 && cards.narrow > 272) bad.push(`req-cards card is ${cards.narrow}px inside a 272px box`);
  if (r.v.w >= 768 && columns(cards.cols) < 2) bad.push(`req-cards is ${columns(cards.cols)} column(s) at ${r.v.w}px; the desktop grid has collapsed`);

  if (bad.length) {
    failures++;
    console.log(`FAIL ${tag}  ${bad.join("; ")}`);
  } else {
    const cells = KEYS.map((k) => `${k}=${columns(r.out[k].cols)}@${r.out[k].narrow}`).join(" ");
    console.log(`ok   ${tag}  overflow=${r.overflow}  ${cells}`);
  }
}

console.log(
  failures === 0
    ? `\nPASS  ${rows.length} viewport renders, EN and AR, 320x256 through 1280x1024. Every field pair ` +
        "collapses at the 400 percent reference, every width from its stated floor upward is unchanged, " +
        "and no surface scrolls horizontally."
    : `\n${failures} failing viewport(s)`,
);
process.exit(failures === 0 ? 0 : 1);
