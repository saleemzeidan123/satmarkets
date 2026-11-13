import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Reported by the owner from an iPhone on the live site, 2026-11-13: pages were
// slow, the language switch was only inside the menu, the bottom bar floated in
// the middle of the screen, and the assistant button sat on Home's Search
// button. Source-level, like every other law test here.

const root = path.join(import.meta.dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const strip = (s: string) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

test("server functions run in Frankfurt, beside the database", () => {
  // The database is in eu-central-1. With no region set, every page was built
  // in Washington and crossed the Atlantic once per query.
  const v = JSON.parse(read("vercel.json"));
  assert.deepEqual(v.regions, ["fra1"]);
});

test("the favicon is a file, not a page render", () => {
  // Browsers ask for /favicon.ico on every visit. Without the file the request
  // fell through to the localised 404 page, a server render each time.
  const ico = fs.readFileSync(path.join(root, "public/favicon.ico"));
  assert.deepEqual(Array.from(ico.subarray(0, 4)), [0, 0, 1, 0], "public/favicon.ico must be a real ICO file");
});

test("the language switch is in the phone header, one tap, and keeps the query", () => {
  const header = strip(read("src/components/Header.tsx"));
  assert.match(header, /<span className="sm:hidden"><LanguageSwitch locale=\{locale\} compact \/><\/span>/);
  assert.match(header, /<span className="hidden sm:inline-flex"><LanguageSwitch locale=\{locale\} \/><\/span>/);
  const sw = strip(read("src/components/LanguageSwitch.tsx"));
  assert.match(sw, /className="lang-one" lang=\{other\} hrefLang=\{other\}/);
  assert.equal((sw.match(/onClick=\{\(e\) => keepQuery\(e, href\)\}/g) ?? []).length, 2, "both forms of the switch must carry the query string across");
  const css = read("src/styles/globals.css");
  assert.match(css, /\.lang-one\{[^}]*min-height:44px/, "the header language link must be a full touch target");
});

test("pinned phone chrome follows the real bottom of the screen and yields to Search", () => {
  const layout = strip(read("src/app/[locale]/layout.tsx"));
  assert.match(layout, /<PhoneChrome \/>/);
  const pc = strip(read("src/components/PhoneChrome.tsx"));
  // The three guards. Without any one of them the repair becomes a bug of its own.
  assert.match(pc, /Math\.abs\(vv\.scale - 1\) < 0\.01/, "must not act while the page is pinch-zoomed");
  assert.match(pc, /!fieldFocused\(\)/, "must not act while a field is focused (a real keyboard)");
  assert.match(pc, /gap > 40/, "must ignore small differences");
  const css = read("src/styles/globals.css");
  assert.match(css, /\.tabbar,\.advfab,\.contact-dock\{translate:0 var\(--vv-gap,0px\);\}/);
  assert.match(css, /html\.fab-yield \.advfab\{opacity:0;pointer-events:none;\}/);
});

test("PKG-DESIGN-9: every section the site has is reachable from the header menu, in both languages", () => {
  // The owner's complaint: the header did not carry the sections the site has.
  // The menu is drawn from one list, and this is the list it must hold.
  const header = strip(read("src/components/Header.tsx"));
  for (const path of ["/listings", "/map", "/locations", "/post-requirement", "/rent-index", "/market", "/advisor", "/sources", "/list", "/requirements", "/brokers", "/listers", "/verification", "/neutrality", "/about", "/saved", "/login", "/dashboard"]) {
    assert.ok(header.includes(`at("${path}")`), `the header menu has no link to ${path}`);
  }
  // A planned page is not offered beside working ones.
  assert.ok(!header.includes("/pricing"), "the header links the pricing page, which has no working offer behind it");
  for (const lang of ["en", "ar"]) {
    const nav = JSON.parse(read(`src/i18n/dictionaries/${lang}.json`)).nav;
    for (const key of ["explore", "requirements", "rentIndex", "market", "advisor", "map", "locations", "postRequirement", "sources", "listSpace", "requirementsBoard", "brokers", "listers", "verification", "neutrality", "about", "gFind", "gMarket", "gOwners", "gHow", "account", "saved", "signIn", "menu", "list"]) {
      assert.ok(typeof nav[key] === "string" && nav[key].trim().length > 0, `${lang}: nav.${key} is missing`);
    }
  }
  const arNav = JSON.parse(read("src/i18n/dictionaries/ar.json")).nav;
  assert.match(arNav.gFind + arNav.gMarket + arNav.gOwners + arNav.gHow + arNav.market, /^[؀-ۿ\s]+$/, "an Arabic group title carries Latin text");
});

test("PKG-DESIGN-9: the menu is a disclosure a keyboard can leave, and the current page is named", () => {
  const header = strip(read("src/components/Header.tsx"));
  // It is a list of links, not a menu widget, so it must not promise one.
  assert.ok(!header.includes("aria-haspopup"), "the trigger promises a menu widget the sheet is not");
  assert.match(header, /aria-expanded=\{open\}/);
  assert.match(header, /aria-controls=\{open \? MENU_ID : undefined\}/);
  // Focus leaving the trigger and the sheet closes the sheet.
  assert.match(header, /onBlur=\{\(e\) => \{ if \(!e\.currentTarget\.contains\(e\.relatedTarget as Node \| null\)\) setOpen\(false\); \}\}/);
  // The current page is stated, not only coloured, in the bar and in the sheet.
  assert.equal((header.match(/aria-current=\{active\(n\.href\) \? "page" : undefined\}/g) ?? []).length, 2);
  // Links sit in lists under a labelled group.
  assert.match(header, /role="group" aria-labelledby=\{`hdr-g-\$\{g\.id\}`\}/);
  assert.match(header, /<ul className="m-0 list-none p-0">/);
});
