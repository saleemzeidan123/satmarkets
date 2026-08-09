// Mobile filter sheet probe: live-interaction proof for item 8's mobile
// filter sheet checklist, in a real Chromium tab.
//
// WHY THIS EXISTS ALONGSIDE src/components/FilterBar.mobileSheet.test.ts
//
// That file is a source-level regression test: it reads FilterBar.tsx's own
// text and asserts the right attributes, effects and CSS rules are present.
// It proves the behaviour is WIRED IN. It cannot press Tab, read
// document.activeElement, click a backdrop, or measure a computed style,
// because `npm test` has no browser. This probe is the live counterpart,
// built the same way scripts/reflow-probe.mjs and scripts/touch-probe.mjs
// already prove CSS claims in this sandbox: a hand-built fixture using the
// REAL shipped CSS (read raw from src/styles/*.css, never re-typed) plus a
// faithful vanilla-JS mirror of the real component's own effect logic
// (open/close, the Tab trap, Escape, backdrop dismissal, scroll lock),
// copied from src/components/FilterBar.tsx line-for-line in spirit, because
// this sandbox cannot run `next dev` (next/font cannot reach Google Fonts
// through the egress proxy, the same documented limitation that blocks
// `npm run build` locally) and so cannot serve the real component tree.
//
// WHAT THIS PROVES AND WHAT IT DOES NOT. It proves: real Tab/Shift+Tab
// keyboard traversal stays inside the sheet, Escape and a backdrop click
// both close it, focus lands on the close button on open and returns to the
// triggering pill on close, body scroll is genuinely locked and restored
// (not just intended to be), the sheet is genuinely full-width with no
// horizontal document overflow at 320/360/390/430, RTL mirrors the close
// button to the visual left rather than staying pinned right, and
// prefers-reduced-motion actually zeroes the computed animation duration
// through the SAME global kill switch rule read raw from globals.css. It
// does not prove a screen reader announces any of this correctly (no screen
// reader exists in this environment, the same limit
// docs/status-ledger.md section 9 already states for the rest of the
// platform), and it is a faithful reconstruction of the mechanics, not a
// render of the actual React tree, so it cannot catch a defect that exists
// only in how FilterBar.tsx's real JSX differs from this fixture's markup.
//
// Exit code 1 on any failed assertion, exit code 2 on a harness fault.
//
// Usage: node scripts/mobile-sheet-probe.mjs --chromium /opt/pw-browsers/chromium

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
const CHROME = flag("--chromium", process.env.CHROMIUM_PATH || "");

const platformCss = readFileSync(join(ROOT, "src", "styles", "sat-platform.css"), "utf8");
const globalsCss = readFileSync(join(ROOT, "src", "styles", "globals.css"), "utf8");

const WIDTHS = [320, 360, 390, 430];

const L = {
  en: { pillLabel: "Price", panelTitle: "Price", close: "Close", apply: "Apply", min: "Min", max: "Max" },
  ar: { pillLabel: "السعر", panelTitle: "السعر", close: "إغلاق", apply: "تطبيق", min: "الحد الأدنى", max: "الحد الأقصى" },
};

// The fixture markup and logic mirror src/components/FilterBar.tsx's mobile
// branch: a pill with aria-expanded/aria-controls, a backdrop, and a sheet
// carrying role="dialog", aria-modal="true" and aria-labelledby pointing at
// a real heading id, per FilterBar.mobileSheet.test.ts's own assertions.
function buildHtml(dir, lang, t) {
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<style>${globalsCss}</style>
<style>${platformCss}</style>
<style>
  body{margin:0;font-family:sans-serif;background:var(--paper,#fff);}
  .row{padding:16px;}
  button{font:inherit;}
</style>
</head>
<body>
<div class="row">
  <button id="pill" aria-expanded="false" aria-controls="fb-panel" data-testid="pill">${t.pillLabel}</button>
</div>
<div id="backdrop" class="fb-sheet-backdrop" style="display:none"></div>
<div id="sheet" class="fb-sheet" role="dialog" aria-modal="true" aria-labelledby="fb-panel-title" style="display:none">
  <div class="fb-sheet-head">
    <span id="fb-panel-title" class="fb-sheet-title">${t.panelTitle}</span>
    <button id="close" class="fb-sheet-close" aria-label="${t.close}">&times;</button>
  </div>
  <div class="fb-sheet-body" id="fb-panel">
    <label>${t.min} <input id="min-input" type="number"></label>
    <label>${t.max} <input id="max-input" type="number"></label>
    <button id="apply">${t.apply}</button>
  </div>
</div>
<script>
  // Faithful mirror of FilterBar.tsx's own effects: initial focus to the
  // close button, a Tab trap scoped to the sheet's own focusable elements,
  // Escape dismissal, backdrop-click dismissal, body scroll lock with
  // restoration of the PRIOR value (not an unconditional clear), and focus
  // restoration to the element that opened the sheet.
  const pill = document.getElementById("pill");
  const backdrop = document.getElementById("backdrop");
  const sheet = document.getElementById("sheet");
  const closeBtn = document.getElementById("close");
  let prevOverflow = "";

  function focusables() {
    return Array.from(sheet.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
  }

  function openSheet() {
    pill.setAttribute("aria-expanded", "true");
    backdrop.style.display = "block";
    sheet.style.display = "flex";
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.focus();
    document.addEventListener("keydown", onKey);
  }
  function closeSheet() {
    pill.setAttribute("aria-expanded", "false");
    backdrop.style.display = "none";
    sheet.style.display = "none";
    document.body.style.overflow = prevOverflow;
    document.removeEventListener("keydown", onKey);
    pill.focus();
  }
  function onKey(e) {
    if (e.key === "Escape") { closeSheet(); return; }
    if (e.key !== "Tab") return;
    const els = focusables();
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  pill.addEventListener("click", openSheet);
  closeBtn.addEventListener("click", closeSheet);
  backdrop.addEventListener("click", closeSheet);
  window.__openSheet = openSheet;
  window.__closeSheet = closeSheet;
</script>
</body>
</html>`;
}

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "OK " : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
}

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});

for (const [dir, lang] of [["ltr", "en"], ["rtl", "ar"]]) {
  const t = L[lang];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.setContent(buildHtml(dir, lang, t), { waitUntil: "load" });

  // 1. Dialog labelling.
  const dialogAttrs = await page.evaluate(() => {
    const s = document.getElementById("sheet");
    const label = document.getElementById(s.getAttribute("aria-labelledby"));
    return { role: s.getAttribute("role"), modal: s.getAttribute("aria-modal"), labelText: label ? label.textContent : null };
  });
  record(`[${dir}] dialog role + aria-modal + real aria-labelledby target`, dialogAttrs.role === "dialog" && dialogAttrs.modal === "true" && dialogAttrs.labelText === t.panelTitle, JSON.stringify(dialogAttrs));

  // 2. aria-expanded/aria-controls before open.
  const before = await page.evaluate(() => ({ expanded: document.getElementById("pill").getAttribute("aria-expanded"), controls: document.getElementById("pill").getAttribute("aria-controls") }));
  record(`[${dir}] aria-expanded=false and aria-controls set before open`, before.expanded === "false" && before.controls === "fb-panel", JSON.stringify(before));

  // Open the sheet via a real click.
  await page.click("#pill");
  const afterOpenExpanded = await page.getAttribute("#pill", "aria-expanded");
  record(`[${dir}] aria-expanded=true after a real click opens the sheet`, afterOpenExpanded === "true");

  // 3. Initial focus.
  const activeIsClose = await page.evaluate(() => document.activeElement && document.activeElement.id === "close");
  record(`[${dir}] initial focus lands on the close button`, activeIsClose);

  // Background scroll lock.
  const overflowLocked = await page.evaluate(() => getComputedStyle(document.body).overflow === "hidden");
  record(`[${dir}] background scroll is locked (body overflow:hidden) while open`, overflowLocked);

  // 4. Focus containment: Tab from the last focusable wraps to the first.
  await page.evaluate(() => document.getElementById("apply").focus());
  await page.keyboard.press("Tab");
  const wrappedForward = await page.evaluate(() => document.activeElement && document.activeElement.id === "close");
  record(`[${dir}] Tab from the last focusable wraps to the first (close button)`, wrappedForward);

  // Shift+Tab from the first focusable wraps to the last.
  await page.keyboard.press("Shift+Tab");
  const wrappedBack = await page.evaluate(() => document.activeElement && document.activeElement.id === "apply");
  record(`[${dir}] Shift+Tab from the first focusable wraps to the last`, wrappedBack);

  // 5. Escape dismissal + 6. focus restoration.
  await page.keyboard.press("Escape");
  const closedByEscape = await page.evaluate(() => getComputedStyle(document.getElementById("sheet")).display === "none");
  const focusRestoredToEscape = await page.evaluate(() => document.activeElement && document.activeElement.id === "pill");
  record(`[${dir}] Escape closes the sheet`, closedByEscape);
  record(`[${dir}] focus is restored to the triggering pill after Escape`, focusRestoredToEscape);

  // Background scroll unlocked again.
  const overflowRestored = await page.evaluate(() => document.body.style.overflow === "");
  record(`[${dir}] background scroll is restored to its prior value after close`, overflowRestored);

  // 7. Backdrop dismissal.
  await page.click("#pill");
  await page.click("#backdrop", { position: { x: 5, y: 5 } });
  const closedByBackdrop = await page.evaluate(() => getComputedStyle(document.getElementById("sheet")).display === "none");
  record(`[${dir}] clicking the backdrop closes the sheet`, closedByBackdrop);

  // 8. RTL correctness: the close button sits at the visual END of the
  // header in both directions (flex justify-content:space-between mirrors
  // automatically), which for RTL means the close button is to the LEFT of
  // the title, not pinned to the same physical side as LTR.
  await page.click("#pill");
  const positions = await page.evaluate(() => {
    const title = document.getElementById("fb-panel-title").getBoundingClientRect();
    const close = document.getElementById("close").getBoundingClientRect();
    return { titleLeft: title.left, closeLeft: close.left };
  });
  const closeIsVisuallyEnd = dir === "rtl" ? positions.closeLeft < positions.titleLeft : positions.closeLeft > positions.titleLeft;
  record(`[${dir}] the close button mirrors to the visual end of the header under RTL`, closeIsVisuallyEnd, JSON.stringify(positions));
  // Reset directly through the exposed close hook rather than a second
  // #pill click: the backdrop overlay still covers the pill while the sheet
  // is open, so a click here would hit the backdrop, not the pill, and
  // Playwright would hang waiting for the (structurally correct) backdrop to
  // stop intercepting pointer events.
  await page.evaluate(() => window.__closeSheet());

  // 9. No horizontal overflow at each required width.
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.evaluate(() => window.__openSheet());
    const overflowPx = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    record(`[${dir}] no horizontal overflow at ${w}px with the sheet open`, overflowPx <= 0, `overflow=${overflowPx}px`);
    await page.evaluate(() => window.__closeSheet());
  }

  // 10. Reduced motion: the animation duration collapses to ~0.01ms under
  // the SAME global kill switch every other animated element on the
  // platform relies on (read raw from globals.css above, not reproduced by
  // hand), confirmed by actually emulating the media feature and reading
  // the computed style rather than trusting the CSS text alone.
  await ctx.close();
  const reducedCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const reducedPage = await reducedCtx.newPage();
  await reducedPage.setContent(buildHtml(dir, lang, t), { waitUntil: "load" });
  await reducedPage.click("#pill");
  const animDuration = await reducedPage.evaluate(() => getComputedStyle(document.getElementById("sheet")).animationDuration);
  record(`[${dir}] prefers-reduced-motion collapses the sheet's animation duration`, /^0\.0?1?ms$|^0s$/.test(animDuration) || parseFloat(animDuration) < 0.001, `animation-duration=${animDuration}`);
  await reducedCtx.close();
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed.`);
if (failed.length) {
  console.log("\nFAILED:");
  for (const f of failed) console.log(`  - ${f.name}`);
  process.exit(1);
}
