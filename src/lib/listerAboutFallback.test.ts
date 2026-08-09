import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * PKG-DISCOVERY-1 item 9: "bilingual biography fallback".
 *
 * Finding 93's fix (PKG-DISCOVERY-1, commit bac8a57) is described at length
 * in `src/app/[locale]/lister/[id]/page.tsx`'s own inline comment but had no
 * dedicated regression test of its own until this file: only
 * `seoDiscovery.test.ts`'s narrower check that the entity JSON-LD's
 * `description` field stays gated on `aboutOwnLang`, which says nothing
 * about the visible paragraph the fix was actually about.
 *
 * The defect: an Arabic reader with no `about_ar` on file used to be handed
 * `about_en` unlabelled, as if it were the lister's own Arabic words. The
 * fix shows the paragraph either way (hiding a lister's own written words
 * would be its own honesty failure toward a reader who could still read
 * that language) but labels it and sets `lang`/`dir` to the paragraph's own
 * language whenever it is not the reader's.
 *
 * WHY SOURCE-LEVEL. Same constraint as every other law test in this
 * repository: no React renderer in `npm test`.
 */

const SRC = fs.readFileSync(path.join(__dirname, "../app/[locale]/lister/[id]/page.tsx"), "utf8");

test("aboutIsFallback is computed from presence, not language equality, and is true only when the reader's own language is genuinely absent", () => {
  assert.match(SRC, /const aboutOwnLang = ar \? p\.about_ar : p\.about_en;/, "aboutOwnLang must read the column matching the reader's own locale");
  assert.match(SRC, /const aboutOtherLang = ar \? p\.about_en : p\.about_ar;/, "aboutOtherLang must read the other column");
  assert.match(SRC, /const about = aboutOwnLang \|\| aboutOtherLang \|\| "";/, "the shown paragraph must prefer the reader's own language and fall back to the other one, never the reverse");
  assert.match(SRC, /const aboutIsFallback = !aboutOwnLang && !!aboutOtherLang;/, "aboutIsFallback must be true exactly when the reader's own language is absent AND the other one exists; a looser condition would mislabel a paragraph that is actually already in the reader's language");
});

test("the fallback notice renders only when aboutIsFallback is true, immediately before the paragraph it explains", () => {
  const aboutBlock = /\{about && \([\s\S]*?\n {10}\)\}/.exec(SRC)?.[0] ?? "";
  assert.ok(aboutBlock.length > 0, "could not locate the conditional block that renders the About paragraph");
  assert.match(aboutBlock, /\{aboutIsFallback && <p className="muted t-xs".*?>\{t\.aboutOtherLanguage\}<\/p>\}/, "the fallback notice must be gated on aboutIsFallback and read the shared aboutOtherLanguage dictionary string, not a hardcoded sentence");
  // The notice must appear before the paragraph in source order, so a screen
  // reader announces the caveat before the text it qualifies rather than
  // after.
  const noticeIdx = aboutBlock.indexOf("aboutIsFallback && <p");
  const paraIdx = aboutBlock.indexOf('<p className="muted" lang=');
  assert.ok(noticeIdx > -1 && paraIdx > -1 && noticeIdx < paraIdx, "the fallback notice must precede the About paragraph in source order");
});

test("lang and dir on the shown paragraph follow the paragraph's own language only when it is a fallback, and are left unset otherwise", () => {
  const aboutBlock = /\{about && \([\s\S]*?\n {10}\)\}/.exec(SRC)?.[0] ?? "";
  assert.match(
    aboutBlock,
    /lang=\{ar && aboutIsFallback \? "en" : !ar && aboutIsFallback \? "ar" : undefined\}/,
    "lang must name the paragraph's actual language when it is a fallback (English on an Arabic page, Arabic on an English page), and stay undefined otherwise so the page's own lang is not overridden needlessly",
  );
  assert.match(
    aboutBlock,
    /dir=\{ar && aboutIsFallback \? "ltr" : !ar && aboutIsFallback \? "rtl" : undefined\}/,
    "dir must match lang's own branching exactly, or a fallback paragraph could be announced in one language while laid out for the other",
  );
});

test("the paragraph itself is never hidden when only the other language is on file; hiding a lister's own words is not the fix finding 93 made", () => {
  // The guard on the whole block is presence (`about`), not
  // `!aboutIsFallback`. A regression that added the latter would silently
  // delete every About paragraph on the platform written in only one
  // language, which given the fix's own reasoning (a reader who can read
  // that language should still see it) would be its own new defect.
  assert.match(SRC, /\{about && \(/);
  assert.doesNotMatch(SRC, /\{about && !aboutIsFallback && \(/, "the About block must not additionally gate on !aboutIsFallback");
});
