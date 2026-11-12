// PKG-PWA-2. The installed app is one app in two languages.
//
// There are two manifest files, one per language, because a manifest is a
// static file and its name, description and shortcut labels are prose. Two
// files can drift. These tests are what stops them: everything that makes the
// two the same app must be identical, everything a reader sees must come from
// the dictionaries, and the root layout must hand each language its own file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import en from "../i18n/dictionaries/en.json";
import ar from "../i18n/dictionaries/ar.json";

type Shortcut = { name: string; url: string; icons: { src: string; sizes: string; type: string }[] };
type Manifest = {
  id: string; name: string; short_name: string; description: string; start_url: string; scope: string;
  display: string; orientation: string; background_color: string; theme_color: string; dir: string; lang: string;
  categories: string[]; icons: { src: string; sizes: string; type: string; purpose: string }[]; shortcuts: Shortcut[];
};
const read = (f: string) => JSON.parse(readFileSync(f, "utf8")) as Manifest;
const EN = read("public/manifest.webmanifest");
const AR = read("public/manifest-ar.webmanifest");

test("the two manifests are one app: same identity, entry, scope, display, colours and icons", () => {
  for (const k of ["id", "start_url", "scope", "display", "orientation", "background_color", "theme_color", "categories", "icons"] as const) {
    assert.deepEqual(AR[k], EN[k], `the Arabic manifest's ${k} differs from the English one's`);
  }
  assert.equal(EN.id, "/", "the id is what makes two manifests one installed app; it must be set and stable");
  assert.equal(EN.start_url, "/", "the entry is language-neutral by design: the middleware sends it to the reader's language");
  assert.deepEqual(AR.shortcuts.map((s) => s.url), EN.shortcuts.map((s) => s.url), "both languages must offer the same shortcuts");
  assert.deepEqual(AR.shortcuts.map((s) => s.icons), EN.shortcuts.map((s) => s.icons));
});

test("each manifest declares its own language and direction", () => {
  assert.deepEqual([EN.lang, EN.dir], ["en", "ltr"]);
  assert.deepEqual([AR.lang, AR.dir], ["ar", "rtl"]);
});

test("every shortcut is language-neutral, inside the scope, and uses an icon that exists", () => {
  for (const s of EN.shortcuts) {
    assert.match(s.url, /^\/[a-z-]+$/, `${s.url} must be a locale-less path so the middleware can route it to the reader's language`);
    assert.ok(!/^\/(en|ar)(\/|$)/.test(s.url), `${s.url} bakes a language into the installed app`);
    for (const i of s.icons) assert.ok(readFileSync(`public${i.src}`).length > 0);
  }
  assert.equal(EN.shortcuts.length, 3);
});

test("what a reader sees in the installed app comes from the dictionaries, in both languages", () => {
  assert.deepEqual(EN.shortcuts.map((s) => s.name), [en.nav.listings, en.req.postReq, en.nav.listSpace]);
  assert.deepEqual(AR.shortcuts.map((s) => s.name), [ar.nav.listings, ar.req.postReq, ar.nav.listSpace]);
  assert.equal(EN.name, en.appMeta.appName);
  assert.equal(AR.name, ar.appMeta.appName);
  assert.equal(AR.short_name, ar.appMeta.appName);
  assert.equal(AR.description, ar.appMeta.description, "the Arabic manifest must not carry Arabic copy that exists nowhere else");
});

test("the root layout gives each language its own manifest", () => {
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  assert.match(layout, /manifest: ar \? "\/manifest-ar\.webmanifest" : "\/manifest\.webmanifest"/);
});

test("the install control has its words in both dictionaries and nowhere else", () => {
  assert.ok(en.install.button.length > 0 && en.install.iosHint.length > 0);
  assert.ok(ar.install.button.length > 0 && ar.install.iosHint.length > 0);
  const component = readFileSync("src/components/InstallApp.tsx", "utf8");
  assert.ok(!/["'`][^"'`]*\b(Install|Add to Home)\b[^"'`]*["'`]/.test(component), "InstallApp.tsx must take its words as props, not write them");
});
