import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * PKG-DISCOVERY-1 item 8's cross-route sweep found three more instances of
 * the exact defect class item 9 ruled and fixed for `/listings/[id]` and its
 * flyer: a route that resolved "no Supabase client" or a real query error
 * the same way it resolved "no such record", so a storage outage rendered
 * as a false claim that the record does not exist (`notFound()` on a
 * public route, or a bare `null` on `getBuildingById`, whose only two
 * callers could not otherwise tell the two apart).
 *
 * Fixed here, same commit that found them: `/building/[id]` (public),
 * `/lister/[id]` (public), and `/dashboard/listings/[id]` (private,
 * authenticated). The private route is fixed for the same UX reason, not
 * an information-disclosure reason, since it already requires session and
 * ownership before it reaches the query at all.
 *
 * WHY SOURCE-LEVEL. The same constraint every other law test in this
 * repository states for itself: no React renderer in `npm test`.
 */

const QUERIES = fs.readFileSync(path.join(__dirname, "queries/listings.ts"), "utf8");
const BUILDING = fs.readFileSync(path.join(__dirname, "../app/[locale]/building/[id]/page.tsx"), "utf8");
const LISTER = fs.readFileSync(path.join(__dirname, "../app/[locale]/lister/[id]/page.tsx"), "utf8");
const MANAGE = fs.readFileSync(path.join(__dirname, "../app/[locale]/dashboard/listings/[id]/page.tsx"), "utf8");

test("getBuildingById distinguishes a storage failure from a genuine absence, same shape as getListingById", () => {
  const fnMatch = /export const getBuildingById = cache\(async \(id: string\)[\s\S]*?\n\}\);/.exec(QUERIES);
  assert.ok(fnMatch, "could not locate the getBuildingById function body");
  const fn = fnMatch![0];
  assert.match(fn, /\.maybeSingle\(\)/, "getBuildingById must use maybeSingle()");
  assert.match(fn, /if \(!sb\) return \{ dataOk: false, row: null \};/, "no Supabase client must resolve to dataOk: false");
  assert.match(fn, /if \(error\) return \{ dataOk: false, row: null \};/, "a real query error must resolve to dataOk: false, not a discarded error and a bare null");
  assert.match(fn, /return \{ dataOk: true, row: data \?\? null \};/, "a successful read must resolve to dataOk: true, with row null only for genuine absence");
});

test("building/[id]: the storage-unavailable branch is checked, and rendered, before the not-found branch, in both generateMetadata and the page body", () => {
  const metaIdx = BUILDING.indexOf("if (!dataOk) return { title: dict.building.unavailableTitleMeta };");
  const metaNotFoundIdx = BUILDING.indexOf("if (!b) return { title: dict.building.metaNotFound };");
  assert.ok(metaIdx > -1 && metaNotFoundIdx > -1 && metaIdx < metaNotFoundIdx, "generateMetadata must check dataOk before the not-found branch");

  const bodyIdx = BUILDING.lastIndexOf("if (!dataOk) {");
  const bodyNotFoundIdx = BUILDING.indexOf("if (!b) notFound();");
  assert.ok(bodyIdx > -1 && bodyNotFoundIdx > -1 && bodyIdx < bodyNotFoundIdx, "the page body must check dataOk before calling notFound() for a genuinely absent building");
  assert.doesNotMatch(BUILDING, /if \(!sb\) notFound\(\);\s*\n\s*const \{ dataOk/, "the old `if (!sb) notFound()` ahead of the building read must be gone, not merely joined by a new check");
});

test("building/[id]: the storage-unavailable state renders DataState with a real retry action", () => {
  assert.match(BUILDING, /<DataState kind="error" title=\{dict\.building\.unavailableTitle\} body=\{dict\.building\.unavailableBody\} action=\{<RetryButton label=\{dict\.building\.retryLabel\} \/>\} \/>/, "the storage-unavailable branch must render DataState with an error kind, both dictionary strings, and a RetryButton action");
});

test("lister/[id]: neither the no-client case nor a real query error reaches notFound() unchecked", () => {
  assert.doesNotMatch(LISTER, /if \(!sb\) notFound\(\);/, "the old bare `if (!sb) notFound()` must be gone");
  assert.match(LISTER, /const \{ data: lister, error: listerError \}/, "the lister query must read its own error rather than discarding it");
  assert.match(LISTER, /if \(listerError\) \{/, "a real query error must be checked before the not-found branch");
  const errIdx = LISTER.indexOf("if (listerError) {");
  const notFoundIdx = LISTER.indexOf("if (!lister) notFound();");
  assert.ok(errIdx > -1 && notFoundIdx > -1 && errIdx < notFoundIdx, "the error branch must be checked before the not-found branch");
});

test("lister/[id]: both the no-client and query-error branches render DataState with a real retry action", () => {
  const dataStateSites = Array.from(LISTER.matchAll(/<DataState kind="error" title=\{t0\.unavailableTitle\} body=\{t0\.unavailableBody\} action=\{<RetryButton label=\{t0\.retryLabel\} \/>\} \/>/g));
  assert.equal(dataStateSites.length, 2, `expected exactly two storage-unavailable DataState renders (no client, query error), found ${dataStateSites.length}`);
});

test("dashboard/listings/[id]: the owner's manage route no longer resolves a storage outage or a real query error to notFound()", () => {
  assert.doesNotMatch(MANAGE, /if \(!sb\) notFound\(\);/, "the old bare `if (!sb) notFound()` must be gone");
  assert.match(MANAGE, /\.maybeSingle\(\)/, "the owner's own row must be read with maybeSingle(), not single(), so a real error can be told apart from a genuine zero-row result");
  assert.doesNotMatch(MANAGE, /\.single\(\)/, "single() must not remain anywhere in this route's own listing read");
  assert.match(MANAGE, /const \{ data: l, error: listingError \}/, "the listing query must read its own error rather than discarding it");
  const errIdx = MANAGE.indexOf("if (listingError) {");
  const notFoundIdx = MANAGE.indexOf("if (!l) notFound();");
  assert.ok(errIdx > -1 && notFoundIdx > -1 && errIdx < notFoundIdx, "the error branch must be checked before the not-found branch");
});

test("dashboard/listings/[id]: both the no-client and query-error branches render DataState with a real retry action, in both locales", () => {
  const dataStateSites = Array.from(MANAGE.matchAll(/<DataState kind="error" title=\{unavailable\.title\} body=\{unavailable\.body\} action=\{<RetryButton label=\{unavailable\.retry\} \/>\} \/>/g));
  assert.equal(dataStateSites.length, 2, `expected exactly two storage-unavailable DataState renders, found ${dataStateSites.length}`);
  assert.match(MANAGE, /const unavailable = ar\s*\n\s*\? \{ title: "تعذّر تحميل هذا العرض"/, "the Arabic unavailable strings must be present");
});

test("neither the building nor lister unavailable-state dictionary strings name an internal reason", () => {
  const dicts = ["en", "ar"].map((loc) => JSON.parse(fs.readFileSync(path.join(__dirname, `../i18n/dictionaries/${loc}.json`), "utf8")));
  const banned = /database|supabase|postgres|sql|table|column|licence|license|query|api|server error|500|503/i;
  for (const d of dicts) {
    for (const [section, keys] of [
      ["building", ["unavailableTitle", "unavailableBody", "unavailableTitleMeta"]],
      ["listerPage", ["unavailableTitle", "unavailableBody"]],
    ] as const) {
      for (const key of keys) {
        const v = d[section]?.[key];
        assert.ok(typeof v === "string" && v.trim().length > 0, `${section}.${key} is missing or empty`);
        assert.doesNotMatch(v, banned, `${section}.${key} = "${v}" names an internal reason`);
      }
    }
  }
});
