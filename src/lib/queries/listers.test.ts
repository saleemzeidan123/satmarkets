import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { listListers, listersPageInfo, LISTERS_PAGE_SIZE } from "./listers";
import { filingAccountOf, listerIdentityVerified } from "@/lib/listingVerification";
import { SITEMAP_ROUTES, HELD_ROUTES, PRIVATE_PREFIXES } from "@/lib/routePolicy";

/**
 * PKG-DISCOVERY-1, item 6 and item 9. Regression coverage for the Listers
 * directory: the contradiction between "browse every lister" and a fixed row
 * cap, and the four states a claim about that record set can be wrong in.
 *
 * WHY MOST OF THIS IS SOURCE-LEVEL OR PURE-FUNCTION, NOT A DATABASE ROUND
 * TRIP. `npm test` wires no React rendering library and no live Supabase
 * project (see `functionalTruth.test.ts`'s header for the same constraint on
 * the write routes); `getSupabaseServer()` in this process returns null. That
 * makes the "storage unavailable" path the one behaviour genuinely
 * reachable by calling `listListers` for real, which the first test below
 * does. Pagination bounds, the honest-count contract and the role filter's
 * refusal to guess are pulled into pure functions or asserted on source for
 * the same reason `laws.test.ts` and `reflow.test.ts` read source rather
 * than rendering: the property under test is what the code DOES across every
 * input, not what one fixture happens to produce.
 */

const SRC = fs.readFileSync(path.join(__dirname, "listers.ts"), "utf8");

test("listers: with no database configured, the directory reports unavailable rather than empty", async () => {
  const result = await listListers({ page: 1, role: null });
  assert.equal(result.dataOk, false, "no Supabase client in this process, so dataOk must be false, not a silent empty page");
  assert.deepEqual(result.rows, []);
  assert.equal(result.total, 0);
  assert.equal(result.pageSize, LISTERS_PAGE_SIZE);
});

test("listers: a page number below 1 clamps to page 1 rather than reaching Supabase with a negative offset", async () => {
  // The clamp runs before the `!sb` early return (source-verified below), so
  // it is observable even with no database configured.
  const zero = await listListers({ page: 0 });
  const negative = await listListers({ page: -7 });
  const fractional = await listListers({ page: 2.9 });
  assert.equal(zero.page, 1);
  assert.equal(negative.page, 1);
  assert.equal(fractional.page, 2, "a fractional page floors rather than rounds");
});

test("listers: the page clamp in source runs before the storage-unavailable return, not after", () => {
  const clampIdx = SRC.indexOf("Math.max(1, Math.floor(opts.page");
  const earlyReturnIdx = SRC.indexOf("if (!sb) return");
  assert.ok(clampIdx > -1 && earlyReturnIdx > -1, "expected source shape not found; listers.ts was restructured");
  assert.ok(clampIdx < earlyReturnIdx, "page clamping must run before the no-database early return so `page` is always honest, even when storage is unavailable");
});

test("listers: the total is read from a separate exact count, never derived from the page of rows returned", () => {
  // Item 6: "Do not calculate or present complete inventory counts from
  // truncated reads." The one way this codebase can silently regress into
  // that is `total: data.length` (or `rows.length`) replacing `count`.
  assert.match(SRC, /count:\s*"exact"/, "listListers must request an exact count from Supabase, not infer one");
  assert.match(SRC, /total:\s*count\s*\?\?\s*0/, "the returned total must come from the exact-count aggregate, not from the fetched page");
  assert.doesNotMatch(SRC, /total:\s*(data|rows)(\?\.| )*length/, "the total must never be computed from the truncated page it also returns");
});

test("listers: the role filter is applied only when a role was actually requested, and only as an equality match", () => {
  assert.match(SRC, /if\s*\(opts\.role\)\s*query\s*=\s*query\.eq\("lister_type",\s*opts\.role\)/, "the role filter must be a conditional, exact eq(), never applied unconditionally or with a guess");
});

test("listers: pagination arithmetic. totalPages, the shown range, and past-end are all bounded and honest", () => {
  // 57 listers, 24 per page: 3 pages, last page holds 9.
  const p1 = listersPageInfo(57, 1, 24);
  assert.deepEqual(p1, { totalPages: 3, pastEnd: false, from: 1, to: 24 });
  const p3 = listersPageInfo(57, 3, 24);
  assert.deepEqual(p3, { totalPages: 3, pastEnd: false, from: 49, to: 57 });

  // A page past the last real one is its own condition, not a match count of 0.
  const p9 = listersPageInfo(57, 9, 24);
  assert.equal(p9.pastEnd, true);
  assert.equal(p9.totalPages, 3);

  // A genuine empty result (total 0) is never mistaken for a continuation
  // failure: page 1 of nothing is not "past the end".
  const empty = listersPageInfo(0, 1, 24);
  assert.deepEqual(empty, { totalPages: 1, pastEnd: false, from: 0, to: 0 });

  // Exact multiples of the page size do not overshoot the total on the last page.
  const exact = listersPageInfo(48, 2, 24);
  assert.deepEqual(exact, { totalPages: 2, pastEnd: false, from: 25, to: 48 });
});

test("listers: the identity-verified indicator does not render from is_verified alone", () => {
  // ADV-1 / finding 3 discipline, restated for the directory card specifically.
  // account_verifications holds zero rows platform-wide, so no account carries
  // a checked date; listerIdentityRecord() always sets checkedAt: null, and
  // verificationStateOf() requires a checkedAt to ever answer "verified". A
  // regression here (the badge going back to reading is_verified directly)
  // is exactly finding 24's defect class, on the one surface item 6 adds.
  const rowFlaggedVerifiedNotDemo = { lister_type: "owner", is_operator: false, is_verified: true, is_demo: false };
  assert.equal(
    listerIdentityVerified(filingAccountOf(rowFlaggedVerifiedNotDemo)),
    false,
    "is_verified: true with no checked date must not earn the badge",
  );

  // Demo rows are refused independently, so a future fix that backfills a
  // checked date still cannot light the badge for sample data.
  const demoRow = { lister_type: "owner", is_operator: false, is_verified: true, is_demo: true };
  assert.equal(listerIdentityVerified(filingAccountOf(demoRow)), false, "a demo record must never qualify, even if flagged verified");

  // A null lister (no record at all) resolves to false, not a thrown error:
  // the directory card's `verified` computation must be safe to call.
  assert.equal(listerIdentityVerified(filingAccountOf(null)), false);
});

test("listers: /listers is registered in the sitemap route policy, and only there", () => {
  assert.ok(SITEMAP_ROUTES.includes("/listers"), "/listers must be in SITEMAP_ROUTES for the directory to be indexable once launch gates pass");
  assert.ok(!HELD_ROUTES.some((h) => h.path === "/listers"), "/listers must not also be held out of indexing");
  assert.ok(!PRIVATE_PREFIXES.includes("/listers"), "/listers must not also be marked private");
});

test("listers: the directory page exists at the route the policy names, and reads real Supabase columns only", () => {
  const pagePath = path.join(__dirname, "../../app/[locale]/listers/page.tsx");
  assert.ok(fs.existsSync(pagePath), "src/app/[locale]/listers/page.tsx is missing");
  const body = fs.readFileSync(pagePath, "utf8");
  assert.match(body, /listListers/, "the page must read the paginated directory query, not a private ad hoc fetch");
  // No inferred fields. Item 6: "Do not infer licence, expertise, performance,
  // activity or specialisation." "Licensed broker" itself is not one of these:
  // it is the platform's existing, factual role name for lister_type ===
  // "broker" (the same label ListerBadge and the lister profile page already
  // render), not an invented credential. What may never appear is a claim
  // ABOUT a licence, a rating or a tenure that `listers_public` does not carry.
  for (const word of ["licence number", "license number", "expertise", "top rated", "top-rated", "years of experience", "specializ", "specialis", "performance", "5-star", "rating"]) {
    assert.doesNotMatch(body.toLowerCase(), new RegExp(word), `the directory page appears to claim "${word}", which listers_public does not carry`);
  }
});

// PKG-DISCOVERY-1 item 10's closure ruling: "confirm with cited tests before
// closure... the Listers directory actually supports pagination or
// continuation." listersPageInfo's arithmetic (tested above) proves the
// MATH is honest; nothing until this test proved the actual continuation
// controls (the hrefFor links Prev/Next render) are wired to that math
// rather than, say, a dead href or a role filter that resets on page 2.
test("listers: Prev/Next continuation links are real, gated on the true page bounds, and preserve the active role filter", () => {
  const pagePath = path.join(__dirname, "../../app/[locale]/listers/page.tsx");
  const body = fs.readFileSync(pagePath, "utf8");
  // The nav itself only renders when there is more than one page to move
  // between; a single-page result shows no dead controls.
  assert.match(body, /\{totalPages > 1 && \(/, "the pagination nav must be gated on totalPages > 1");
  // Prev is a real link only above page 1, Next only below the last page;
  // otherwise each renders an inert placeholder rather than a disabled or
  // dead link.
  assert.match(body, /\{page > 1\s*\n\s*\? <Link href=\{hrefFor\(page - 1, role\)\}/, "Prev must be a real Link to page - 1, gated on page > 1");
  assert.match(body, /\{page < totalPages\s*\n\s*\? <Link href=\{hrefFor\(page \+ 1, role\)\}/, "Next must be a real Link to page + 1, gated on page < totalPages");
  // hrefFor is the one function building every continuation URL (Prev, Next
  // and the past-end "back to page 1" recovery link all call it), so its own
  // construction is what actually determines whether the role filter
  // survives a page change and whether page=1 is ever written into the URL.
  const hrefFor = /const hrefFor = \(p: number, r: ListerRole \| null\) => \{[\s\S]*?\n  \};/.exec(body)?.[0] ?? "";
  assert.ok(hrefFor.length > 0, "could not locate hrefFor's own definition");
  assert.match(hrefFor, /if \(r\) sp\.set\("role", r\);/, "hrefFor must carry the active role filter into a continuation link, or Next would silently drop it");
  assert.match(hrefFor, /if \(p > 1\) sp\.set\("page", String\(p\)\);/, "hrefFor must omit the page param for page 1, so the first page's own URL stays canonical rather than reading ?page=1");
});
