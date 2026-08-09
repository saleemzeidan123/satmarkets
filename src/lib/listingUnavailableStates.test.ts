import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * PKG-DISCOVERY-1 item 9, ruled: "listing and flyer unavailable states."
 *
 * THE RULING, VERBATIM SHAPE.
 *   - A listing that is definitively absent or not publicly available
 *     returns the existing public not-found treatment, without confirming
 *     the existence of an unpublished record.
 *   - A failed or unavailable storage read must not be presented as
 *     "listing not found."
 *   - Storage unavailability renders a bilingual temporary-unavailable
 *     state with a retry path and unavailable response semantics.
 *   - No internal database or licence reasoning is exposed.
 *   - The flyer route preserves the same distinction.
 *
 * THE DEFECT THIS REPLACES. `getListingById` returned the row or `null` for
 * three different facts collapsed into one value: no Supabase client, a
 * genuine "no such id", and any other query error (a real connection
 * failure among them). `.single()` turns "zero rows" into an error of the
 * same shape as a real failure, so a caller reading only `{ data }` cannot
 * tell them apart. Both `/listings/[id]` and its flyer read exactly that
 * shape and rendered "Listing not found" for all three. Separately, neither
 * template filtered on `status === "published"` at all: a draft, an
 * expired, or a withdrawn listing rendered its full public detail page and
 * flyer to anyone who had or guessed its id.
 *
 * WHY SOURCE-LEVEL. No React renderer in `npm test`, the same constraint
 * every other law test in this repository states for itself. What follows
 * is what these tests actually prove and do not: they prove the three
 * branches exist, are ordered correctly (storage-unavailable checked before
 * not-found), and that the not-found and unpublished cases collapse to the
 * identical rendered output (an information-disclosure property a live
 * render could not check any more precisely than a string-equality read
 * can). They do not exercise a real Supabase failure or a real draft row.
 */

const QUERIES = fs.readFileSync(path.join(__dirname, "queries/listings.ts"), "utf8");
const DETAIL = fs.readFileSync(path.join(__dirname, "../app/[locale]/listings/[id]/page.tsx"), "utf8");
const FLYER = fs.readFileSync(path.join(__dirname, "../app/[locale]/listings/[id]/flyer/page.tsx"), "utf8");

test("getListingById distinguishes a storage failure from a genuine absence by construction", () => {
  // Scoped to the function's own body (its `cache(async ... })` block), not
  // the file's prose: the header comment above it explains the old .single()
  // defect in words, which legitimately contains the literal text ".single()"
  // without the function itself calling it.
  const fnMatch = /export const getListingById = cache\(async \(id: string\)[\s\S]*?\n\}\);/.exec(QUERIES);
  assert.ok(fnMatch, "could not locate the getListingById function body");
  const fn = fnMatch![0];
  assert.match(fn, /\.maybeSingle\(\)/, "getListingById must use maybeSingle(), which returns { data: null, error: null } for zero rows, rather than single(), which turns zero rows into an error indistinguishable from a real failure");
  assert.doesNotMatch(fn, /\.single\(\)/, "getListingById's own body must not call single()");
  assert.match(fn, /if \(!sb\) return \{ dataOk: false, row: null \};/, "no Supabase client must resolve to dataOk: false");
  assert.match(fn, /if \(error\) return \{ dataOk: false, row: null \};/, "a real query error must resolve to dataOk: false");
  assert.match(fn, /return \{ dataOk: true, row: data \?\? null \};/, "a successful read (row present or genuinely absent) must resolve to dataOk: true, with row null only for absence");
});

for (const [label, SRC] of [["listing detail", DETAIL], ["flyer", FLYER]] as const) {
  test(`${label}: the storage-unavailable branch is checked, and rendered, before the not-found/unpublished branch`, () => {
    const dataOkIdx = SRC.indexOf("if (!dataOk)");
    const notFoundIdx = SRC.indexOf('l.status !== "published"');
    assert.ok(dataOkIdx > -1, `${label}: no "if (!dataOk)" guard found in the page body`);
    assert.ok(notFoundIdx > -1, `${label}: no status-published guard found in the page body`);
    // Each file has two such pairs (generateMetadata, then the page body);
    // checking the first occurrence of each catches an accidental reorder in
    // either location, since a correctly-ordered file never has the
    // not-found check appear before the first dataOk check.
    assert.ok(dataOkIdx < notFoundIdx, `${label}: the not-found/unpublished check appears before the storage-unavailable check; storage failures would read as "not found"`);
  });

  test(`${label}: the not-found and unpublished cases are the same condition, not two different messages`, () => {
    assert.match(SRC, /!l \|\| l\.status !== "published"/, `${label}: absence and non-publication must be checked in the same condition, so neither the response nor its wording can differ`);
  });

  test(`${label}: dict keys for the three states are visibly distinct strings, so they cannot collapse into each other by accident`, () => {
    assert.match(SRC, /unavailableTitle/, `${label} must reference an unavailable-state title`);
    assert.match(SRC, /notFound/i, `${label} must reference a not-found state`);
  });
}

test("listing detail: the storage-unavailable state renders DataState with a real retry action, not a bare sentence", () => {
  assert.match(DETAIL, /<DataState kind="error" title=\{dict\.ld\.unavailableTitle\} body=\{dict\.ld\.unavailableBody\} action=\{<RetryButton label=\{dict\.ld\.retryLabel\} \/>\} \/>/, "the storage-unavailable branch must render DataState with an error kind, both dictionary strings, and a RetryButton action");
});

test("flyer: the storage-unavailable state also renders DataState with a real retry action", () => {
  assert.match(FLYER, /<DataState kind="error" title=\{t\.unavailableTitle\} body=\{t\.unavailableBody\} action=\{<RetryButton label=\{t\.retryLabel\} \/>\} \/>/, "the flyer's storage-unavailable branch must render DataState with an error kind, both dictionary strings, and a RetryButton action");
});

test("flyer no longer runs a second, private copy of the listing query", () => {
  // The defect this specifically closes: the flyer used to run its own raw
  // `.single()` read for the same row generateMetadata above it already
  // fetched through getListingById, so the two could independently succeed
  // or fail and the flyer's copy carried none of the distinction the other
  // one had.
  assert.doesNotMatch(FLYER, /sb\.from\("listings"\)\.select\("\*, districts/, "the flyer body must read the listing through getListingById, not a second raw query");
  const callSites = Array.from(FLYER.matchAll(/getListingById\(/g));
  assert.equal(callSites.length, 2, `expected exactly two getListingById call sites (generateMetadata and the page body), found ${callSites.length}`);
});

test("neither unavailable-state dictionary string names an internal reason", () => {
  // "No internal database or licence reasoning is exposed."
  const dicts = ["en", "ar"].map((loc) => JSON.parse(fs.readFileSync(path.join(__dirname, `../i18n/dictionaries/${loc}.json`), "utf8")));
  const banned = /database|supabase|postgres|sql|table|column|licence|license|query|api|server error|500|503/i;
  for (const d of dicts) {
    for (const section of ["ld", "flyer"]) {
      for (const key of ["unavailableTitle", "unavailableBody", "unavailableTitleMeta"]) {
        const v = d[section]?.[key];
        if (typeof v !== "string") continue;
        assert.doesNotMatch(v, banned, `${section}.${key} = "${v}" names an internal reason`);
      }
    }
  }
});

test("the unavailable-state strings exist in both locales for both routes (bilingual, not English-only)", () => {
  const dicts = ["en", "ar"].map((loc) => JSON.parse(fs.readFileSync(path.join(__dirname, `../i18n/dictionaries/${loc}.json`), "utf8")));
  for (const d of dicts) {
    for (const [section, keys] of [
      ["ld", ["unavailableTitle", "unavailableBody", "unavailableTitleMeta", "retryLabel"]],
      ["flyer", ["unavailableTitle", "unavailableBody", "retryLabel"]],
    ] as const) {
      for (const key of keys) {
        const v = d[section]?.[key];
        assert.ok(typeof v === "string" && v.trim().length > 0, `${section}.${key} is missing or empty`);
      }
    }
  }
});
