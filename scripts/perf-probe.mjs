// Synthetic performance probe: what a route family costs, by locale and device.
//
// WHY THIS EXISTS. Before this file the platform had no performance number of
// any kind, so every claim about speed was an opinion and every regression was
// invisible until somebody noticed a page felt slow. WS33 asks for a first
// reproducible baseline by route family, locale and device profile, and for
// budgets derived from what this application actually measures rather than from
// industry round numbers borrowed off a blog.
//
// WHAT IT MEASURES, AND WHY THOSE THINGS. Four families of number, each chosen
// because it answers a question the route table cannot:
//
//   bytes      transfer by resource type, and the request count behind it. The
//              build output's "First Load JS" column is per page segment and
//              excludes the layout, so it understates every route on this
//              platform by the whole of the layout's client tree. What the
//              browser actually fetched is the only honest figure.
//   paint      LCP, and first contentful paint. Taken from PerformanceObserver
//              rather than from a lab score, because a score is a weighting of
//              somebody else's priorities and this baseline should record the
//              measurements, not a grade.
//   stability  cumulative layout shift, which is the number an image without
//              intrinsic dimensions moves.
//   blocking   total long-task time, meaning main-thread work in blocks over
//              50 ms after navigation starts. This is where a 200 kB dictionary
//              parsed on the client shows up and bytes alone do not.
//
// REPEATABILITY. Every measurement is taken RUNS times in a fresh context with
// a cold cache, and the median is reported. A single run of a browser is not a
// measurement, it is an anecdote. Throttling is applied through CDP rather than
// by hoping the machine is consistent: the mobile profile is 4x CPU slowdown on
// a 1.6 Mbps/750 kbps link with 150 ms of latency, which is a deliberately
// unkind reading of a mid-range Android on Saudi mobile data, and the desktop
// profile is unthrottled. Neither is a physical device and this file does not
// pretend otherwise. See docs/performance-baseline.md for the limitations that
// belong beside every figure this prints.
//
// WHAT IT DOES NOT DO. It does not score, it does not compare against any
// external target, and it fails only against budgets that were themselves
// measured here first and written down in a file that can be read. Passing this
// probe means "no worse than the day the baseline was taken", which is the only
// thing an automated performance check can honestly assert.
//
// USAGE. It needs a served production build, because a development build
// measures webpack rather than the product:
//
//   npm run build && npx next start -p 4311
//   node scripts/perf-probe.mjs --base http://127.0.0.1:4311 \
//     --chromium /opt/pw-browsers/chromium
//
// Useful flags:
//   --runs 3            samples per cell, median reported
//   --profile mobile    mobile | desktop | both (default both)
//   --only listings     substring filter over route family keys
//   --json out.json     write the full matrix, for diffing between baselines
//   --budgets path      budget file to check against (default docs/perf-budgets.json)
//   --write-budgets     rewrite the budget file from this run. Deliberately a
//                       separate flag, so a regression can never be resolved by
//                       running the tool that measured it.
//
// It is not in `npm test`: it needs a browser, a built application and a server.
// Exit code is 1 when a measured value exceeds its budget, so it can be wired
// into a gate once the deployed build is measurable from wherever that gate runs.

import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes(n);

const BASE = flag("--base", "http://127.0.0.1:4311").replace(/\/$/, "");
const CHROME = flag("--chromium", process.env.CHROMIUM_PATH || "");
const RUNS = Number(flag("--runs", "3"));
const PROFILE = flag("--profile", "both");
const ONLY = flag("--only", "");
const JSON_OUT = flag("--json", "");
const BUDGETS = flag("--budgets", join(ROOT, "docs/perf-budgets.json"));
const WRITE_BUDGETS = has("--write-budgets");

/**
 * The route families, and why these ones.
 *
 * A family is a page whose cost is paid again by every page shaped like it, so
 * measuring one member is measuring the shape. `listings` stands for every
 * filtered index, `listing detail` for every record page, `map` for everything
 * that pulls the map library, `login` for the authenticated entrance. `home` is
 * its own family because it is the first thing anyone sees and shares its cost
 * with nothing.
 *
 * Every path here answers 200 without a database, which matters because the
 * measuring environment cannot reach one. Pages whose body is a no-data state
 * are marked, so nobody reads their byte count as the loaded-page cost.
 */
const FAMILIES = [
  { key: "home", path: "", data: "static" },
  { key: "listings", path: "/listings", data: "empty" },
  { key: "map", path: "/map", data: "empty" },
  { key: "rent-index", path: "/rent-index", data: "static" },
  { key: "invest", path: "/invest", data: "static" },
  { key: "market", path: "/market", data: "empty" },
  { key: "find", path: "/find", data: "static" },
  { key: "login", path: "/login", data: "static" },
  { key: "post-requirement", path: "/post-requirement", data: "static" },
  { key: "signup", path: "/signup", data: "static" },
];

const LOCALES = ["en", "ar"];

/**
 * Device profiles.
 *
 * The mobile numbers are the ones that decide anything. This platform's readers
 * are brokers and owners on phones, on mobile data, and a desktop reading on an
 * office connection will never be the constraint. Desktop is measured anyway so
 * that a regression which only shows up unthrottled is not invisible.
 */
const PROFILES = {
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    cpu: 4,
    net: { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
  },
  desktop: {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    cpu: 1,
    net: null,
  },
};

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

/** Resource type buckets. Anything unrecognised lands in `other` rather than vanishing. */
function bucket(url, type) {
  if (type === "stylesheet" || url.endsWith(".css")) return "css";
  if (type === "script" || url.endsWith(".js")) return "js";
  if (type === "font" || /\.(woff2?|ttf|otf)(\?|$)/.test(url)) return "font";
  if (type === "image" || /\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/.test(url)) return "image";
  if (type === "document") return "html";
  if (type === "fetch" || type === "xhr") return "data";
  return "other";
}

/**
 * The in-page collector.
 *
 * Registered before navigation, because an observer registered after the paint
 * it wants to observe records nothing. `buffered: true` covers the entries that
 * landed between navigation start and this script running.
 */
const COLLECTOR = `(() => {
  window.__perf = { lcp: 0, cls: 0, longTasks: 0, longTaskCount: 0, fcp: 0 };
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.lcp = Math.max(window.__perf.lcp, e.startTime); })
      .observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value; })
      .observe({ type: "layout-shift", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__perf.longTasks += e.duration; window.__perf.longTaskCount++; } })
      .observe({ type: "longtask", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === "first-contentful-paint") window.__perf.fcp = e.startTime; })
      .observe({ type: "paint", buffered: true });
  } catch {}
})();`;

async function measure(browser, profileName, url) {
  const p = PROFILES[profileName];
  const ctx = await browser.newContext({
    viewport: p.viewport,
    deviceScaleFactor: p.deviceScaleFactor,
    isMobile: p.isMobile,
    hasTouch: p.isMobile,
    bypassCSP: false,
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (p.net) await cdp.send("Network.emulateNetworkConditions", p.net);
  if (p.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.cpu });

  const bytes = { html: 0, js: 0, css: 0, font: 0, image: 0, data: 0, other: 0 };
  const counts = { html: 0, js: 0, css: 0, font: 0, image: 0, data: 0, other: 0 };
  let failed = 0;

  // Encoded length off the network, not decoded body length: transfer is what a
  // reader on mobile data pays for, and decoded size is what the CPU pays for,
  // which the long-task total already reports.
  //
  // Taken from CDP rather than from playwright's `response` event because the
  // playwright route needs an await on the body to learn its size, and an await
  // inside an event handler is a race against navigation and context close. It
  // lost that race often enough to report the same page at 23 kB of script on
  // one run and 183 kB on the next. `Network.loadingFinished.encodedDataLength`
  // is reported by the browser when the transfer actually ends and needs
  // nothing awaited, so it is both correct and repeatable.
  const seen = new Map();
  cdp.on("Network.responseReceived", (e) => {
    seen.set(e.requestId, bucket(e.response.url, String(e.type || "").toLowerCase()));
  });
  cdp.on("Network.loadingFinished", (e) => {
    const b = seen.get(e.requestId);
    if (!b) return;
    counts[b]++;
    bytes[b] += e.encodedDataLength || 0;
    seen.delete(e.requestId);
  });
  cdp.on("Network.loadingFailed", () => { failed++; });

  await page.addInitScript(COLLECTOR);
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 90_000 });
  // Settle window. Long tasks and layout shifts after load are still felt by a
  // reader, and on this platform the client-side dictionary parse lands here.
  await page.waitForTimeout(2500);
  const wall = Date.now() - t0;

  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] || {};
    return {
      ...window.__perf,
      ttfb: Math.round(nav.responseStart || 0),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
      load: Math.round(nav.loadEventEnd || 0),
    };
  });

  const total = Object.values(bytes).reduce((a, b) => a + b, 0);
  await ctx.close();
  return {
    lcp: Math.round(perf.lcp),
    fcp: Math.round(perf.fcp),
    cls: Math.round(perf.cls * 1000) / 1000,
    blockingMs: Math.round(perf.longTasks),
    longTasks: perf.longTaskCount,
    ttfb: perf.ttfb,
    load: perf.load,
    wall,
    totalKb: Math.round(total / 1024),
    kb: Object.fromEntries(Object.entries(bytes).map(([k, v]) => [k, Math.round(v / 1024)])),
    requests: { ...counts, total: Object.values(counts).reduce((a, b) => a + b, 0) },
    failed,
  };
}

const cells = [];
const profiles = PROFILE === "both" ? ["mobile", "desktop"] : [PROFILE];
const families = FAMILIES.filter((f) => !ONLY || f.key.includes(ONLY));

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
try {
  for (const prof of profiles) {
    for (const loc of LOCALES) {
      for (const fam of families) {
        const url = `${BASE}/${loc}${fam.path}`;
        const runs = [];
        for (let i = 0; i < RUNS; i++) runs.push(await measure(browser, prof, url));
        const pick = (k) => median(runs.map((r) => r[k]));
        const cell = {
          family: fam.key,
          data: fam.data,
          locale: loc,
          profile: prof,
          url: `/${loc}${fam.path}`,
          lcp: pick("lcp"),
          fcp: pick("fcp"),
          cls: median(runs.map((r) => Math.round(r.cls * 1000))) / 1000,
          blockingMs: pick("blockingMs"),
          ttfb: pick("ttfb"),
          totalKb: pick("totalKb"),
          jsKb: median(runs.map((r) => r.kb.js)),
          cssKb: median(runs.map((r) => r.kb.css)),
          fontKb: median(runs.map((r) => r.kb.font)),
          imageKb: median(runs.map((r) => r.kb.image)),
          htmlKb: median(runs.map((r) => r.kb.html)),
          dataKb: median(runs.map((r) => r.kb.data)),
          otherKb: median(runs.map((r) => r.kb.other)),
          requests: median(runs.map((r) => r.requests.total)),
          failed: Math.max(...runs.map((r) => r.failed)),
          runs: RUNS,
        };
        cells.push(cell);
        console.log(
          `${prof.padEnd(7)} ${cell.url.padEnd(24)} ${String(cell.totalKb).padStart(5)} kB  js ${String(cell.jsKb).padStart(4)}  ` +
          `LCP ${String(cell.lcp).padStart(5)} ms  CLS ${cell.cls.toFixed(3)}  block ${String(cell.blockingMs).padStart(5)} ms  req ${cell.requests}`,
        );
      }
    }
  }
} finally {
  await browser.close();
}

const key = (c) => `${c.profile}:${c.locale}:${c.family}`;

// Cells whose layout shift is bistable rather than noisy, with the ceiling that
// covers the range and the reason it is not a budget anyone should be proud of.
// A cell listed here is not being held to a standard: it is being stopped from
// failing the gate at random while its finding is open. Removing an entry is the
// point, and the entry says what has to be true first.
const UNSTABLE_CLS = {
  "desktop:en:listings": {
    ceiling: 0.31,
    note:
      "Finding: the desktop listings grid shifts intermittently. Five campaigns on the " +
      "same page recorded 0.182, 0.147, 0.182, 0.288 and 0.288, so the value is bistable " +
      "and not machine noise. It predates the Next.js 16 migration: the Next.js 14 record " +
      "carries 0.182. The ceiling covers the worst reading and is not an acceptable CLS. " +
      "Remove this entry, and lower the budget, when the shift is fixed.",
  },
  "desktop:ar:listings": {
    ceiling: 0.31,
    note:
      "Same finding as desktop:en:listings, same page in Arabic. Campaigns recorded " +
      "0.056, 0.151, 0.183, 0.056 and 0.056, so this locale lands on the low branch more " +
      "often, which is a difference in timing rather than in layout. Held at the same " +
      "ceiling so a fix in one locale is not hidden by a looser budget in the other.",
  },
};

if (WRITE_BUDGETS) {
  // Budgets are the measured value plus headroom, and the headroom is different
  // per metric on purpose, because the metrics do not repeat equally. Repeating
  // the whole forty-cell sweep twice against an unchanged build gave the worst
  // run-to-run ratios: JavaScript bytes 1.000, total bytes 1.088, LCP 1.115,
  // blocking time 1.426. So bytes get 10 per cent, which covers the observed
  // spread with a little to spare, and timings get 35 per cent, which is wide
  // enough that a green run means something and narrow enough that doubling a
  // bundle cannot hide inside it.
  //
  // Blocking time also gets a floor, and 100 ms rather than a smaller number is
  // a measured choice. Its 1.426 worst case was 68 ms becoming 97 ms: a 29 ms
  // absolute move that is large only because the base is small. Below roughly
  // 100 ms this machine is reporting its own scheduling noise, so a budget
  // derived from a lower floor is a budget that fails on a build that did not
  // change. The floor puts the smallest possible blocking budget at 135 ms,
  // which sits above the noise while still failing any real regression.
  //
  // LCP gets a floor too, added by the PKG-NEXT16-SECURITY release-correction
  // batch, and it exists because the recorded 1.115 worst ratio was wrong. It
  // came from repeating one sweep twice. Five campaigns are now on record, and
  // the same unchanged desktop page reports LCP anywhere from 240 to 544 ms:
  // a 2.125 ratio on desktop:en:market alone. Desktop here is unthrottled, so
  // its LCP lands in the few hundred milliseconds where paint timing is mostly
  // machine scheduling, and a percentage of a small number is a small number.
  // Mobile is throttled and its smallest LCP is 772 ms, so the floor never
  // touches the profile where an LCP regression would actually hurt a reader.
  // The floor is 500 ms, which makes the smallest LCP budget 675 ms: above the
  // 544 ms worst desktop reading on record, with enough margin that the gate
  // does not go green and red on the same build, and still failing any desktop
  // paint that crosses two thirds of a second.
  //
  // Layout shift gets neither a floor nor a wider additive, because a CLS
  // budget of 0.15 would be a budget that permits a bad page. Where a cell is
  // genuinely bistable the exception is named, per cell, below.
  const out = { measuredAt: new Date().toISOString().slice(0, 10), base: BASE, runs: RUNS, cells: {} };
  for (const c of cells) {
    const k = key(c);
    const ex = UNSTABLE_CLS[k];
    out.cells[k] = {
      totalKb: Math.ceil(c.totalKb * 1.1),
      jsKb: Math.ceil(c.jsKb * 1.1),
      lcp: Math.ceil(Math.max(c.lcp, 500) * 1.35),
      blockingMs: Math.ceil(Math.max(c.blockingMs, 100) * 1.35),
      cls: ex ? ex.ceiling : Math.max(Math.round((c.cls + 0.02) * 1000) / 1000, 0.05),
    };
    if (ex) out.cells[k].clsNote = ex.note;
  }
  writeFileSync(BUDGETS, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote ${Object.keys(out.cells).length} budgets to ${BUDGETS}`);
}

if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ base: BASE, runs: RUNS, cells }, null, 2) + "\n");

let failures = 0;
if (!WRITE_BUDGETS && existsSync(BUDGETS)) {
  const budgets = JSON.parse(readFileSync(BUDGETS, "utf8"));
  for (const c of cells) {
    const b = budgets.cells?.[key(c)];
    if (!b) { console.log(`no budget: ${key(c)}`); continue; }
    for (const m of ["totalKb", "jsKb", "lcp", "blockingMs", "cls"]) {
      if (c[m] > b[m]) { failures++; console.error(`OVER ${key(c)} ${m}: ${c[m]} > ${b[m]}`); }
    }
  }
  console.log(failures ? `\nperf-probe: ${failures} over budget` : `\nperf-probe: PASS ${cells.length} cells within budget`);
} else if (!WRITE_BUDGETS) {
  console.log(`\nNo budget file at ${BUDGETS}. Run once with --write-budgets to record one.`);
}

process.exit(failures ? 1 : 0);
