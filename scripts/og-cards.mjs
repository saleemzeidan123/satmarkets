// Social share cards, one per locale (WS12, PKG-1C).
//
// Open Graph without an image is an incomplete Open Graph: a shared link falls
// back to whatever the platform scrapes, which for this site was nothing. The
// two cards this writes are the only images the metadata factory points at, so
// every public template shares with the same identity in its own language.
//
// The card is rendered in Chromium rather than composed with an image library
// because the Arabic line needs real shaping and bidi, which a text-drawing API
// gets wrong. Output is a PNG at the 1200x630 Open Graph standard, which both
// Twitter's summary_large_image and LinkedIn accept without re-cropping.
//
// FONTS. The two brand faces are not committed here (they are pulled at build
// time by next/font). Provide them once to regenerate the cards:
//
//   npm i --no-save --prefix /tmp/ogbuild @fontsource/source-serif-4 @fontsource/ibm-plex-sans-arabic
//   node scripts/og-cards.mjs --fonts /tmp/ogbuild/node_modules/@fontsource
//
// The cards are committed, so this only needs running when the brand line or
// the palette changes. Both faces are SIL Open Font License 1.1.

import { chromium } from "playwright";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const flag = (name, fallback) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : fallback; };
const FONTS = flag("--fonts", "/tmp/ogbuild/node_modules/@fontsource");
// Optional: point at an already-installed Chromium instead of Playwright's own
// download (the CI image pins a build that may not match this package's pin).
const CHROME = flag("--chromium", process.env.CHROMIUM_PATH || "");

const HARBOR = "#3A6EA5", HARBOR_DEEP = "#2C557F", INK = "#14181B", COOL = "#F6F8FB";

const face = (file) => {
  const p = join(FONTS, file);
  if (!existsSync(p)) {
    console.error(`Missing font: ${p}\nSee the header of this file for the one-line install.`);
    process.exit(1);
  }
  return `data:font/woff2;base64,${readFileSync(p).toString("base64")}`;
};
const SERIF = face("source-serif-4/files/source-serif-4-latin-700-normal.woff2");
const SERIF_600 = face("source-serif-4/files/source-serif-4-latin-600-normal.woff2");
const PLEX_AR = face("ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-700-normal.woff2");
const PLEX_AR_500 = face("ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-500-normal.woff2");
const PLEX_LAT = face("ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-latin-600-normal.woff2");

// The parcel mark, the same four-cell geometry as src/components/satkit.tsx.
// Reproduced as plain SVG so this script does not need to run React.
function mark(size, base, lit) {
  const p = 7, foot = 100 - 2 * p, vx = 0.4 * foot, hy = 0.58 * foot, st = 0.05 * foot, R = 10, ir = 2.5;
  const f = (v) => Math.round(v * 1000) / 1000;
  const rr = (x, y, w, h, [tl, tr, br, bl], fill) =>
    `<path d="M${f(x + tl)} ${f(y)}H${f(x + w - tr)}A${f(tr)} ${f(tr)} 0 0 1 ${f(x + w)} ${f(y + tr)}`
    + `V${f(y + h - br)}A${f(br)} ${f(br)} 0 0 1 ${f(x + w - br)} ${f(y + h)}`
    + `H${f(x + bl)}A${f(bl)} ${f(bl)} 0 0 1 ${f(x)} ${f(y + h - bl)}`
    + `V${f(y + tl)}A${f(tl)} ${f(tl)} 0 0 1 ${f(x + tl)} ${f(y)}Z" fill="${fill}"/>`;
  const w1 = vx - st / 2, w2 = foot - vx - st / 2, h1 = hy - st / 2, h2 = foot - hy - st / 2, X = p, Y = p;
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" style="display:block;flex:none">`
    + rr(X, Y, w1, h1, [R, ir, ir, ir], base)
    + rr(X + vx + st / 2, Y, w2, h1, [ir, R, ir, ir], lit)
    + rr(X, Y + hy + st / 2, w1, h2, [ir, ir, ir, R], base)
    + rr(X + vx + st / 2, Y + hy + st / 2, w2, h2, [ir, ir, R, ir], base)
    + `</svg>`;
}

// The card copy is deliberately the positioning line, not a page title: one
// image serves every public template, so it states what the exchange is rather
// than what any single page holds. Western numerals in both languages.
const COPY = {
  en: {
    dir: "ltr",
    wordmark: `<span style="color:${HARBOR}">SAT</span><span style="color:${COOL}">MARKETS</span>`,
    headline: "Commercial real estate,<br/>Saudi Arabia",
    sub: "Listings that show their verification state · Published rent index, attributed to source · AI that never invents a figure",
    foot: "SAT REAL ESTATE · REGA FAL 1200025510",
    headFont: "'SatSerif', Georgia, serif",
    subFont: "'SatPlexLatin', system-ui, sans-serif",
    wmFont: "'SatSerif', Georgia, serif",
    headSize: 62, headLh: 1.12, subSize: 24, wmSize: 40, wmSpace: ".02em", subMax: 1010,
  },
  ar: {
    dir: "rtl",
    wordmark: `<span style="color:${HARBOR}">سات</span><span style="color:${COOL}">ماركتس</span>`,
    headline: "العقارات التجارية<br/>في السعودية",
    sub: "عروض تُظهر حالة توثيقها · مؤشر إيجارات منشور منسوب إلى مصادره · ذكاء اصطناعي لا يخترع الأرقام",
    foot: "سات العقارية · رخصة فال 1200025510",
    // The Arabic wordmark is set in the Arabic brand face, not the Latin serif:
    // a serif fallback would silently substitute a system Arabic font.
    headFont: "'SatPlexAr', system-ui, sans-serif",
    subFont: "'SatPlexArMed', system-ui, sans-serif",
    wmFont: "'SatPlexAr', system-ui, sans-serif",
    headSize: 58, headLh: 1.28, subSize: 23, wmSize: 38, wmSpace: "0", subMax: 1000,
  },
};

const html = (loc) => {
  const c = COPY[loc];
  const gap = loc === "ar" ? "12px" : "6px";
  return `<!doctype html><html dir="${c.dir}"><head><meta charset="utf-8"><style>
@font-face{font-family:'SatSerif';src:url('${SERIF}')format('woff2');font-weight:700}
@font-face{font-family:'SatSerif600';src:url('${SERIF_600}')format('woff2');font-weight:600}
@font-face{font-family:'SatPlexAr';src:url('${PLEX_AR}')format('woff2');font-weight:700}
@font-face{font-family:'SatPlexArMed';src:url('${PLEX_AR_500}')format('woff2');font-weight:500}
@font-face{font-family:'SatPlexLatin';src:url('${PLEX_LAT}')format('woff2');font-weight:600}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;background:${INK};
  background-image:
    radial-gradient(1100px 620px at ${c.dir === "rtl" ? "88%" : "12%"} -18%, rgba(58,110,165,.42), rgba(58,110,165,0) 62%),
    radial-gradient(760px 520px at ${c.dir === "rtl" ? "8%" : "92%"} 118%, rgba(44,85,127,.34), rgba(44,85,127,0) 66%);
  color:${COOL};display:flex;flex-direction:column;justify-content:space-between;
  padding:74px 84px;position:relative}
.grid{position:absolute;inset:0;opacity:.05;
  background-image:linear-gradient(${COOL} 1px,transparent 1px),linear-gradient(90deg,${COOL} 1px,transparent 1px);
  background-size:88px 88px}
.rule{height:2px;width:96px;border-radius:2px;background:linear-gradient(${c.dir === "rtl" ? "270deg" : "90deg"},${HARBOR},rgba(58,110,165,0))}
.brand{display:flex;align-items:center;gap:18px;position:relative}
.wm{font-family:${c.wmFont};font-weight:700;font-size:${c.wmSize}px;letter-spacing:${c.wmSpace};line-height:1;display:flex;gap:${gap}}
h1{font-family:${c.headFont};font-weight:700;font-size:${c.headSize}px;line-height:${c.headLh};letter-spacing:${loc === "ar" ? "0" : "-.015em"};position:relative}
.sub{font-family:${c.subFont};font-weight:${loc === "ar" ? 500 : 600};font-size:${c.subSize}px;line-height:1.5;color:rgba(246,248,251,.78);max-width:${c.subMax}px;position:relative}
.foot{font-family:${loc === "ar" ? "'SatPlexArMed'" : "'SatPlexLatin'"},system-ui,sans-serif;font-weight:${loc === "ar" ? 500 : 600};
  font-size:15px;letter-spacing:${loc === "ar" ? "0" : ".17em"};color:rgba(246,248,251,.52);position:relative}
.mid{display:flex;flex-direction:column;gap:26px;position:relative}
</style></head><body>
<div class="grid"></div>
<div class="brand">${mark(58, COOL, HARBOR)}<div class="wm">${c.wordmark}</div></div>
<div class="mid"><div class="rule"></div><h1>${c.headline}</h1><div class="sub">${c.sub}</div></div>
<div class="foot">${c.foot}</div>
</body></html>`;
};

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
for (const loc of ["en", "ar"]) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html(loc), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const out = `public/og-${loc}.png`;
  await page.screenshot({ path: out });
  console.log(`wrote ${out}`);
  await page.close();
}
await browser.close();
