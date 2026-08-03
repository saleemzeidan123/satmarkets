// PKG-NEXT16-SECURITY slice F. Burst probe, second version.
//
// The ledger asks slice F for "a measured normal peak burst": how many requests
// one ordinary visitor, behaving ordinarily, actually sends to the API inside a
// sixty second window. Guessing that number is what produced the withdrawn
// blanket /api/* recommendation, so it is measured here instead.
//
// The instrument drives the real production build with a real browser and
// records every request the page makes, with a millisecond timestamp and the
// path it went to. Nothing about the client is simulated: the typeahead
// debounce, the abort on each keystroke, the router's document requests and the
// advisor's two-call fallback are all whatever the shipped code does.
//
// Typing speed is the variable that decides the answer, and it is the one a
// careless probe gets wrong. Both public typeaheads debounce at 220 ms. A fast
// typist never lets the timer expire, so an eight letter word costs ONE request.
// A slow or hunt-and-peck typist lets it expire between every letter, so the
// same eight letter word costs EIGHT. The second is the ordinary peak, not an
// attack, and a threshold set from the first would throttle real people. Both
// are measured here, as two arms over the same script.

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env.BURST_BASE || "http://localhost:4321";
const CHROMIUM = process.env.BURST_CHROMIUM || "/opt/pw-browsers/chromium";
const OUT = process.env.BURST_OUT || "/tmp/burst.json";

const log = [];
const t0 = Date.now();
const now = () => Date.now() - t0;
const pathOf = (u) => { try { return new URL(u).pathname; } catch { return u; } };

let KEY_MS = 140;

async function typeHuman(page, sel, text) {
  const el = page.locator(sel).first();
  await el.click({ timeout: 8000 });
  for (const ch of text) {
    await el.type(ch, { delay: 0 });
    await page.waitForTimeout(KEY_MS);
  }
}

async function session(browser, arm, name, steps) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on("request", (r) => log.push({ arm, session: name, t: now(), method: r.method(), path: pathOf(r.url()), type: r.resourceType() }));
  try { await steps(page); } catch (e) { console.log(`  [${arm}/${name}] stopped early: ${String(e).split("\n")[0].slice(0, 140)}`); }
  await ctx.close();
}

function peak(entries, windowMs = 60_000) {
  const ts = entries.map((e) => e.t).sort((a, b) => a - b);
  let best = 0, lo = 0;
  for (let hi = 0; hi < ts.length; hi++) {
    while (ts[hi] - ts[lo] >= windowMs) lo++;
    best = Math.max(best, hi - lo + 1);
  }
  return best;
}

const HERO = 'input[placeholder="District, project or building"], input[placeholder*="حي"], input[placeholder*="مشروع"]';
const NLQ = 'input[name="q"]';
const ADVISOR = 'input[placeholder*="Ask about"], input[placeholder*="اسأل"]';

const browser = await chromium.launch({ executablePath: CHROMIUM });

async function runArm(arm, keyMs) {
  KEY_MS = keyMs;
  console.log(`\n=== arm ${arm}: ${keyMs} ms between keystrokes ===`);

  // The ordinary listing browse. Land on the marketing home, use the hero
  // typeahead the way a person looking for offices in Riyadh does, correct the
  // term once, then move into the listings grid and use the natural language
  // box there, then walk the filtered views.
  console.log("  session: browse-en");
  await session(browser, arm, "browse-en", async (page) => {
    await page.goto(`${BASE}/en`, { waitUntil: "load", timeout: 60_000 });
    await page.waitForTimeout(1200);
    await typeHuman(page, HERO, "riyadh");
    await page.waitForTimeout(800);
    const hero = page.locator(HERO).first();
    for (let i = 0; i < 6; i++) { await hero.press("Backspace"); await page.waitForTimeout(KEY_MS); }
    await typeHuman(page, HERO, "al olaya");
    await page.waitForTimeout(1000);

    await page.goto(`${BASE}/en/listings`, { waitUntil: "load", timeout: 60_000 });
    await page.waitForTimeout(1400);
    await typeHuman(page, NLQ, "grade a office olaya");
    await page.waitForTimeout(900);

    for (const qs of ["?deal=sale", "?deal=sale&asset=office", "?deal=sale&asset=office&sort=price_asc", "?deal=lease", "?deal=lease&grade=a"]) {
      await page.goto(`${BASE}/en/listings${qs}`, { waitUntil: "load", timeout: 60_000 });
      await page.waitForTimeout(1000);
    }
  });

  // The same reader keeps going into the read-heavy market surfaces.
  console.log("  session: market-en");
  await session(browser, arm, "market-en", async (page) => {
    for (const p of ["/en/map", "/en/rent-index", "/en/market", "/en/locations", "/en/sources", "/en/find"]) {
      await page.goto(`${BASE}${p}`, { waitUntil: "load", timeout: 60_000 });
      await page.waitForTimeout(1200);
    }
  });

  // Arabic, same shape, shorter.
  console.log("  session: browse-ar");
  await session(browser, arm, "browse-ar", async (page) => {
    await page.goto(`${BASE}/ar`, { waitUntil: "load", timeout: 60_000 });
    await page.waitForTimeout(1200);
    await typeHuman(page, HERO, "الرياض");
    await page.waitForTimeout(900);
    await page.goto(`${BASE}/ar/listings`, { waitUntil: "load", timeout: 60_000 });
    await page.waitForTimeout(1300);
    await typeHuman(page, NLQ, "مكتب العليا");
    await page.waitForTimeout(900);
    await page.goto(`${BASE}/ar/listings?deal=lease`, { waitUntil: "load", timeout: 60_000 });
    await page.waitForTimeout(1100);
  });

  // The advisor. One person asking four questions in a row. This is the paid
  // path: /api/index/segments on mount, then POST /api/advisor per turn, with
  // POST /api/search behind it whenever the turn resolves to search mode.
  console.log("  session: advisor-en");
  await session(browser, arm, "advisor-en", async (page) => {
    await page.goto(`${BASE}/en/advisor`, { waitUntil: "load", timeout: 60_000 });
    await page.waitForTimeout(1600);
    for (const q of ["office rents in olaya", "what about jeddah", "show me fitted space under 1500", "is that above the index"]) {
      await typeHuman(page, ADVISOR, q);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(2500);
    }
  });
}

await runArm("fast-typist", 140);
await runArm("deliberate-typist", 320);

await browser.close();

// ---------------------------------------------------------------------------
const family = (p) => p.replace(/\/[0-9a-f-]{8,}(\/|$)/g, "/:id$1");
const report = { base: BASE, arms: {}, requests: [] };

for (const arm of ["fast-typist", "deliberate-typist"]) {
  const all = log.filter((e) => e.arm === arm);
  const api = all.filter((e) => e.path.startsWith("/api/"));
  const byFam = new Map();
  for (const e of api) {
    const f = family(e.path);
    if (!byFam.has(f)) byFam.set(f, []);
    byFam.get(f).push(e);
  }
  const bySes = new Map();
  for (const e of api) {
    if (!bySes.has(e.session)) bySes.set(e.session, []);
    bySes.get(e.session).push(e);
  }
  report.arms[arm] = {
    totalRequests: all.length,
    totalApiRequests: api.length,
    peakAllPer60s: peak(all),
    peakApiPer60s: peak(api),
    peakApiPer10s: peak(api, 10_000),
    bySession: Object.fromEntries([...bySes].map(([k, v]) => [k, { count: v.length, peak60: peak(v), peak10: peak(v, 10_000) }])),
    byFamily: Object.fromEntries([...byFam].sort((a, b) => b[1].length - a[1].length).map(([k, v]) => [k, { count: v.length, peak60: peak(v), peak10: peak(v, 10_000), methods: [...new Set(v.map((e) => e.method))] }])),
  };
  report.requests.push(...api.map((e) => ({ arm, session: e.session, t: e.t, method: e.method, path: e.path })));
}
writeFileSync(OUT, JSON.stringify(report, null, 2));

for (const [arm, r] of Object.entries(report.arms)) {
  console.log(`\n########## ${arm}`);
  console.log(`  total requests ${r.totalRequests}   total /api ${r.totalApiRequests}`);
  console.log(`  peak ALL per 60 s  ${r.peakAllPer60s}`);
  console.log(`  peak /api per 60 s ${r.peakApiPer60s}    per 10 s ${r.peakApiPer10s}`);
  console.log("  by session:");
  for (const [k, v] of Object.entries(r.bySession)) console.log(`    ${k.padEnd(12)} count ${String(v.count).padStart(4)}  peak60 ${String(v.peak60).padStart(4)}  peak10 ${String(v.peak10).padStart(3)}`);
  console.log("  by route family:");
  for (const [k, v] of Object.entries(r.byFamily)) console.log(`    ${k.padEnd(28)} count ${String(v.count).padStart(4)}  peak60 ${String(v.peak60).padStart(4)}  peak10 ${String(v.peak10).padStart(3)}  ${v.methods.join(",")}`);
}
console.log(`\nwritten to ${OUT}`);
