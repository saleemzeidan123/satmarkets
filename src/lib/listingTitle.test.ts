import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { listingTitle, listingPlace, type TitledListing } from "@/lib/listingTitle";

// ADV-3A.1, finding 66. See the header of `listingTitle.ts` for the defect.
//
// The behavioural tests fix the ladder. The source scan at the bottom is the one
// that matters over time, because the defect was never that one card was wrong:
// it was that the same idiom was written by hand in sixteen places and repaired
// in one.

const LATIN = /[A-Za-z]/;

const row = (a: Partial<TitledListing> = {}): TitledListing => ({
  title_en: null,
  title_ar: null,
  asset_type: "office",
  reference_code: "SATM-A0DC83D0",
  districts: { name_en: "Al Olaya", name_ar: "العليا", city: "riyadh" },
  ...a,
});

test("a written title wins in its own language", () => {
  const l = row({ title_en: "Grade A floor, Al Olaya", title_ar: "دور فئة أ، العليا" });
  assert.equal(listingTitle(l, "en"), "Grade A floor, Al Olaya");
  assert.equal(listingTitle(l, "ar"), "دور فئة أ، العليا");
});

test("the live defect is gone: a missing Arabic title yields a description, never the reference code", () => {
  // The exact row shape photographed on the deployed advisor: an English title,
  // no Arabic one. The Arabic reader was shown SATM-A0DC83D0.
  const l = row({ title_en: "Grade A floor, Al Olaya" });
  const ar = listingTitle(l, "ar");
  assert.equal(ar.includes("SATM"), false, ar);
  assert.equal(LATIN.test(ar), false, ar);
  assert.ok(ar.includes("العليا"), ar);
});

test("the two languages describe the same untitled row the same way", () => {
  const l = row({});
  assert.equal(listingTitle(l, "en"), "Office in Al Olaya");
  assert.equal(listingTitle(l, "ar"), "مكاتب في العليا");
});

test("the description matches the share metadata, because both fill the same key", () => {
  // `listings/[id]/page.tsx` generateMetadata composes ld.metaTitleFallback with
  // the same two variables. A card and a shared link must not name one listing
  // two different ways.
  const l = row({});
  for (const loc of ["en", "ar"] as const) {
    assert.equal(listingTitle(l, loc).includes("{"), false, "an unfilled placeholder reached the reader");
  }
});

test("a whitespace-only title is not a title", () => {
  assert.equal(listingTitle(row({ title_en: "   " }), "en"), "Office in Al Olaya");
});

test("the other language's title is never borrowed", () => {
  const l = row({ title_en: "Grade A floor, Al Olaya" });
  assert.equal(listingTitle(l, "ar").includes("Grade A"), false);
});

test("a row with no district is described by its type rather than by its code", () => {
  for (const districts of [null, undefined, [] as TitledListing["districts"]]) {
    assert.equal(listingTitle(row({ districts }), "en"), "Office");
    assert.equal(listingTitle(row({ districts }), "ar"), "مكاتب");
  }
});

test("a district with no name in this language falls back to its city, not to nothing", () => {
  const l = row({ districts: { name_en: "Al Olaya", name_ar: null, city: "riyadh" } });
  const ar = listingTitle(l, "ar");
  assert.equal(ar.includes("Al Olaya"), false, "an English district name reached an Arabic sentence");
  assert.equal(LATIN.test(ar), false, ar);
  assert.equal(listingPlace(l, "ar"), "الرياض");
});

test("a PostgREST embed that arrives as an array of one is still a district", () => {
  const l = row({ districts: [{ name_en: "Al Olaya", name_ar: "العليا", city: "riyadh" }] });
  assert.equal(listingTitle(l, "en"), "Office in Al Olaya");
});

test("the reference code is reached only by a row with neither a title nor a type", () => {
  assert.equal(listingTitle(row({ asset_type: null }), "en"), "SATM-A0DC83D0");
  assert.equal(listingTitle(row({ asset_type: null, reference_code: null }), "en"), "");
  assert.equal(listingTitle(null, "en"), "");
  assert.equal(listingTitle(undefined, "ar"), "");
});

// ------------------------------------------------------------- source guard
//
// The needles are assembled from fragments so this file does not match its own
// scan. A scan that has to exempt itself has lost some of its authority; the
// same reasoning as the transport scan in `src/lib/ai/gateway.test.ts`.

const SRC = join(__dirname, "..");
const TITLE = "title_" + "ar";
const TITLE2 = "title_" + "en";
const CODE = "reference" + "_code";
/** A title expression whose fallback, within a short reach, is the code. */
const IDIOM = new RegExp(`(?:${TITLE}|${TITLE2})[\\s\\S]{0,140}?\\|\\|[\\s\\S]{0,60}?${CODE}`);

/** Files that may legitimately name the code beside a title. */
const EXEMPT = new Set(["lib/listingTitle.ts", "lib/listingTitle.test.ts"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

test("no file falls back from a title to a reference code", () => {
  const offenders: string[] = [];
  for (const f of walk(SRC)) {
    const rel = relative(SRC, f).split("\\").join("/");
    if (EXEMPT.has(rel)) continue;
    if (IDIOM.test(readFileSync(f, "utf8"))) offenders.push(rel);
  }
  assert.deepEqual(
    offenders,
    [],
    `these files name a listing by its reference code when the title is missing in the reader's language. Use listingTitle() from @/lib/listingTitle:\n  ${offenders.join("\n  ")}`,
  );
});
