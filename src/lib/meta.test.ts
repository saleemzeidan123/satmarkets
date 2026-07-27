import { test } from "node:test";
import assert from "node:assert/strict";
import { localeMeta, pageMeta, languageAlternates, localeUrl, ogTypeFor, OG_TYPE_POLICY } from "@/lib/meta";
import { formatArea } from "@/lib/format";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { SITEMAP_ROUTES, HELD_ROUTES } from "@/lib/routePolicy";

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

test("the Open Graph type comes from the route policy, and the generic value is website", () => {
  // A single entity is not automatically an article: a listing, a building, an
  // occupier requirement, a printable flyer and a company profile are none of
  // them editorial articles. website is the safe generic value; the detailed
  // entity meaning is published in the Schema.org JSON-LD, not in og:type.
  assert.equal(ogTypeFor("/building/1"), "website");
  assert.equal(ogTypeFor("/lister/1"), "website");
  assert.equal(ogTypeFor("/"), "website");
  assert.equal((localeMeta("en", "/building/1", "T", "D").openGraph as any).type, ogTypeFor("/building/1"));
});

test("every departure from the website default names a type and states its reason", () => {
  for (const rule of OG_TYPE_POLICY) {
    assert.ok(["website", "profile", "article"].includes(rule.type), `${rule.pattern} declares an Open Graph type this site does not use`);
    assert.ok(rule.reason.trim().split(/\s+/).length >= 5, `${rule.pattern} departs from the default without stating why`);
    // profile describes an individual person and article describes an editorial
    // article. Neither may be claimed for a route whose reason does not say what
    // in the entity data supports it.
    assert.notEqual(rule.type, "website", `${rule.pattern} is not a departure and belongs outside this table`);
  }
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

// ------------------------------------------------- coverage across templates

// Public detail templates: indexable-later, so not literal sitemap members.
// This list is the same one scripts/prose-scan.mjs scopes its GATE tier to;
// docs/routes.md mirrors both.
const DETAIL_ROUTES = ["/listings/[id]", "/listings/[id]/flyer", "/building/[id]", "/lister/[id]", "/requirements/[id]"];

test("every public template builds its own head, none inherits the root layout's", () => {
  // WS12 defect 3: several public templates defined no metadata at all, so they
  // served the root layout's generic title and description with no canonical and
  // no reciprocal language set. A "use client" page physically cannot export
  // generateMetadata, so for those the head lives in a sibling route-segment
  // layout; either position satisfies this test, an absence satisfies neither.
  const APP = join(__dirname, "../app/[locale]");
  const missing: string[] = [];
  for (const p of [...SITEMAP_ROUTES, ...HELD_ROUTES.map((h) => h.path), ...DETAIL_ROUTES]) {
    const found = ["page.tsx", "layout.tsx"].some((leaf) => {
      const f = join(APP, p, leaf);
      return existsSync(f) && /export\s+(async\s+)?function\s+generateMetadata|export\s+const\s+metadata/.test(readFileSync(f, "utf8"));
    });
    if (!found) missing.push(p || "/");
  }
  assert.deepEqual(missing, [], `public templates with no head of their own: ${missing.join(", ")}`);
});

test("every public template's head is built through the factory, never hand written", () => {
  // WS12 defect 4: hand-assembled alternates and openGraph literals disagreed
  // about siteName, about type and about whether languages were declared.
  const APP = join(__dirname, "../app/[locale]");
  for (const p of [...SITEMAP_ROUTES, ...HELD_ROUTES.map((h) => h.path), ...DETAIL_ROUTES]) {
    for (const leaf of ["page.tsx", "layout.tsx"]) {
      const f = join(APP, p, leaf);
      if (!existsSync(f)) continue;
      const body = readFileSync(f, "utf8");
      if (!/generateMetadata|export\s+const\s+metadata/.test(body)) continue;
      assert.match(body, /localeMeta|pageMeta/, `${p || "/"}/${leaf} defines metadata without the factory`);
      assert.doesNotMatch(body, /alternates\s*:/, `${p || "/"}/${leaf} hand writes alternates`);
      assert.doesNotMatch(body, /openGraph\s*:/, `${p || "/"}/${leaf} hand writes openGraph`);
    }
  }
});

test("no template chooses its own Open Graph type, the route policy is the only source", () => {
  // The earlier rule here required every detail route to declare "article",
  // which made all five mechanically identical and semantically wrong: only an
  // editorial article is an article. The type now comes from OG_TYPE_POLICY, so
  // the thing to assert on source is that no call site passes one at all.
  const APP = join(__dirname, "../app/[locale]");
  for (const p of [...SITEMAP_ROUTES, ...HELD_ROUTES.map((h) => h.path), ...DETAIL_ROUTES]) {
    for (const leaf of ["page.tsx", "layout.tsx"]) {
      const f = join(APP, p, leaf);
      if (!existsSync(f)) continue;
      const body = readFileSync(f, "utf8");
      if (!/generateMetadata|export\s+const\s+metadata/.test(body)) continue;
      assert.doesNotMatch(body, /type:\s*"(website|profile|article)"/, `${p || "/"}/${leaf} picks an Open Graph type at the call site`);
    }
  }
});

test("no two public templates share a title or a description, in either language", () => {
  // WS12: unique bilingual title and description per public template. The
  // dictionaries are the source, so uniqueness is asserted there, where a
  // copy-paste between two sections is what would actually cause a collision.
  const dir = join(__dirname, "../i18n/dictionaries");
  for (const loc of ["en", "ar"]) {
    const d = JSON.parse(readFileSync(join(dir, `${loc}.json`), "utf8")) as Record<string, Record<string, string>>;
    for (const field of ["metaTitle", "metaDesc"]) {
      const seen = new Map<string, string>();
      for (const [section, body] of Object.entries(d)) {
        const v = body && typeof body === "object" ? body[field] : undefined;
        if (typeof v !== "string" || !v.trim()) continue;
        const prev = seen.get(v);
        assert.equal(prev, undefined, `${loc}: ${section}.${field} duplicates ${prev}.${field}`);
        seen.set(v, section);
      }
      assert.ok(seen.size >= 12, `${loc}: only ${seen.size} sections declare ${field}`);
    }
  }
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
