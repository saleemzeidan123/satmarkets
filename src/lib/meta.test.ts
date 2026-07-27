import { test } from "node:test";
import assert from "node:assert/strict";
import { localeMeta, pageMeta, languageAlternates, localeUrl } from "@/lib/meta";
import { formatArea } from "@/lib/format";

// The four defects meta.ts exists to kill, asserted rather than described.

test("the reciprocal set names every locale plus x-default", () => {
  const set = languageAlternates("/listings");
  assert.deepEqual(Object.keys(set).sort(), ["ar", "en", "x-default"]);
  assert.ok(set.en.endsWith("/en/listings"));
  assert.ok(set.ar.endsWith("/ar/listings"));
  // x-default points at the default locale, not at a bare unprefixed URL that
  // would 404 or redirect.
  assert.equal(set["x-default"], set.en);
});

test("the set is reciprocal: both locales of a path declare the same three URLs", () => {
  const en = localeMeta("en", "/market", "T", "D").alternates!.languages!;
  const ar = localeMeta("ar", "/market", "ت", "و").alternates!.languages!;
  assert.deepEqual(en, ar);
});

test("the canonical is the requested locale, not the default", () => {
  assert.equal(localeMeta("ar", "/map", "ت", "و").alternates!.canonical, localeUrl("ar", "/map"));
  assert.equal(localeMeta("en", "/map", "T", "D").alternates!.canonical, localeUrl("en", "/map"));
});

test("an unknown locale falls back to the default rather than building a broken URL", () => {
  assert.equal(localeUrl("fr", "/map"), localeUrl("en", "/map"));
});

test("Open Graph is complete and locale aware", () => {
  const og = localeMeta("ar", "/listings/1", "ت", "و").openGraph as any;
  assert.equal(og.locale, "ar_SA");
  assert.deepEqual(og.alternateLocale, ["en_US"]);
  assert.equal(og.siteName, "سات ماركتس");
  assert.equal(og.type, "website");
  assert.equal(og.images[0].width, 1200);
  assert.equal(og.images[0].height, 630);
  assert.ok(String(og.images[0].url).endsWith("/og-ar.png"));
  assert.ok(og.images[0].alt.length > 0);
  const en = localeMeta("en", "/listings/1", "T", "D").openGraph as any;
  assert.ok(String(en.images[0].url).endsWith("/og-en.png"));
  assert.equal(en.siteName, "SAT Markets");
});

test("the Twitter card is present and carries the same image", () => {
  const m = localeMeta("en", "/market", "T", "D") as any;
  assert.equal(m.twitter.card, "summary_large_image");
  assert.equal(m.twitter.images[0], (m.openGraph as any).images[0].url);
});

test("type article is carried through for single-entity templates", () => {
  assert.equal((localeMeta("en", "/building/1", "T", "D", { type: "article" }).openGraph as any).type, "article");
});

test("robots is emitted only when a template asks for it", () => {
  assert.equal(localeMeta("en", "/market", "T", "D").robots, undefined);
  assert.deepEqual(localeMeta("en", "/terms", "T", "D", { robots: { index: false } }).robots, { index: false });
});

test("pageMeta picks the language and never leaks the other one", () => {
  const ar = pageMeta("ar", "/about", "About", "من نحن", "EN copy", "نبذة") as any;
  assert.equal(ar.title, "من نحن");
  assert.equal(ar.description, "نبذة");
  assert.equal(ar.openGraph.title, "من نحن");
  const en = pageMeta("en", "/about", "About", "من نحن", "EN copy", "نبذة") as any;
  assert.equal(en.title, "About");
});

test("invisible bidi controls from the formatters are stripped out of metadata", () => {
  // formatArea isolates its composite for laid-out prose; a title is not prose.
  const area = formatArea(2000, "ar");
  assert.match(area, /[\u2066-\u2069]/);
  const m = localeMeta("ar", "/listings/1", `مساحة ${area}`, `وصف ${area}`) as any;
  assert.doesNotMatch(String(m.title), /[\u2060\u2066-\u2069]/);
  assert.doesNotMatch(String(m.description), /[\u2060\u2066-\u2069]/);
  assert.doesNotMatch(String(m.openGraph.title), /[\u2060\u2066-\u2069]/);
  assert.doesNotMatch(String(m.twitter.description), /[\u2060\u2066-\u2069]/);
  // The digits and the unit survive; only the invisible controls go.
  assert.ok(String(m.title).includes("2,000"));
});
