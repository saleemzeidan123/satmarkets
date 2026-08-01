import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { listingTitle, listingPlace, titleMissingIn, type TitledListing } from "@/lib/listingTitle";

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

test("the lister is told which language is missing, and a blank one is not a title", () => {
  const l = row({ title_en: "Grade A floor, Al Olaya" });
  assert.equal(titleMissingIn(l, "ar"), true);
  assert.equal(titleMissingIn(l, "en"), false);
  assert.equal(titleMissingIn(row({ title_en: "   ", title_ar: "\t" }), "en"), true);
  assert.equal(titleMissingIn(row({ title_en: "   ", title_ar: "\t" }), "ar"), true);
  // A row nobody passed is not a row with a missing title, so no page shows a
  // notice about a listing it does not have.
  assert.equal(titleMissingIn(null, "ar"), false);
  assert.equal(titleMissingIn(undefined, "en"), false);
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
const NAME = "name_" + "ar";
const NAME2 = "name_" + "en";
/** A title expression whose fallback, within a short reach, is the code. */
const IDIOM = new RegExp(`(?:${TITLE}|${TITLE2})[\\s\\S]{0,140}?\\|\\|[\\s\\S]{0,60}?${CODE}`);

// PKG-NM1. The second idiom, and the one that outlived the first fix in
// twenty-two files including the public brokers page:
//
//   (ar ? l.title_ar : l.title_en) || l.title_en
//
// `listingTitle`'s own header says the other language's title is deliberately
// not a rung on the ladder, and until now nothing enforced that. Showing an
// Arabic reader an English sentence is worse than a short honest description,
// because it looks like a title somebody chose. The district form of the same
// borrow is caught too: a district with no Arabic name widens to its city,
// never to "Al Olaya".
//
// The pattern must join fields of DIFFERENT languages, on ONE line, and the
// field name must end where it is written: `title_ar_src_hash` is a hash of a
// source, not a title, and `title_en: title_en || null` in an insert is a
// default, not a fallback. Without those three constraints the scan reports
// twenty files it has no business reporting, and a guard that cries wolf is
// switched off by the next person who reads it.
//
// The AUTHORIZED borrow is `entityName` in `lib/displayName.ts`, and it is the
// only one: an account, lister or building name is an identifier with no wider
// true form, so the choice there is the one spelling we hold or nothing. That
// file is exempt because it is where the decision is written down.
//
// NOT COVERED: `district_label` and `district_label_ar` on the rent index rows,
// which carry the same shape in about twenty-five places. That label names the
// geography a published third-party statistic describes, so widening it would
// restate someone else's district figure as a city figure. Its own finding.
const BOUND = "(?![\\w])";
const AR_FIELD = `(?:${TITLE}|${NAME})${BOUND}`;
const EN_FIELD = `(?:${TITLE2}|${NAME2})${BOUND}`;
const REACH = "[^\\n]{0,120}?\\|\\|[^\\n]{0,40}?";
const BORROW = new RegExp(`(?:${AR_FIELD}${REACH}${EN_FIELD})|(?:${EN_FIELD}${REACH}${AR_FIELD})`);

/** Where a name may legitimately sit beside the other language's, or beside a code. */
const EXEMPT = new Set([
  "lib/listingTitle.ts",
  "lib/listingTitle.test.ts",
  "lib/displayName.ts",
  "lib/displayName.test.ts",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

function scan(re: RegExp): string[] {
  const offenders: string[] = [];
  for (const f of walk(SRC)) {
    const rel = relative(SRC, f).split("\\").join("/");
    if (EXEMPT.has(rel)) continue;
    if (re.test(readFileSync(f, "utf8"))) offenders.push(rel);
  }
  return offenders;
}

test("no file falls back from a title to a reference code", () => {
  const offenders = scan(IDIOM);
  assert.deepEqual(
    offenders,
    [],
    `these files name a listing by its reference code when the title is missing in the reader's language. Use listingTitle() from @/lib/listingTitle:\n  ${offenders.join("\n  ")}`,
  );
});

// A guard nobody has watched fail is a guard nobody knows works. These are the
// eight shapes actually deleted in PKG-NM1 and seven shapes that must stay
// legal, because the first version of this regex reported twenty files, twelve
// of them innocent, and a scan with that hit rate gets an allow list instead of
// a fix.
test("the borrow guard catches what it was written for and leaves legitimate code alone", () => {
  const caught = [
    "const nm = (ar ? a.name_ar : a.name_en) || a.name_en;",
    "const title = (ar ? l.title_ar : l.title_en) || l.title_en;",
    "{ar ? r.title_ar || r.title_en : r.title_en}",
    "label: (lang === 'ar' ? (d.name_ar || d.name_en) : d.name_en) as string,",
    "if (d?.name_ar || d?.name_en) districtAr = d.name_ar || d.name_en;",
    "const name = ar ? (b.name_ar || b.name_en) : b.name_en;",
    "ar: district.name_ar || district.name_en || ''",
    "name: ((ar ? g.name_ar : g.name_en) || g.name_en) + suffix",
  ];
  const legal = [
    // A hash of the English title, compared against a column whose name merely
    // begins with the Arabic one.
    "if (l.title_en && (force || hashSource(l.title_en) !== l.title_ar_src_hash)) {",
    // An insert with a default per column, one column per line.
    "  title_en: title_en || null,\n  title_ar: title_ar || null,",
    "const ne = (d.name_en || '').toLowerCase();",
    // The shipped shape: one language chosen, then a non-name last resort.
    "const mt = (ar ? m.name_ar : m.name_en) || m.listing_id;",
    "const dnEn = l.districts ? l.districts.name_en : null;",
    "const t = (ar ? l.title_ar : l.title_en) || fallback;",
    'sb.from("districts").select("name_en,name_ar,city")',
  ];
  for (const s of caught) assert.ok(BORROW.test(s), `missed a borrow: ${s}`);
  for (const s of legal) assert.equal(BORROW.test(s), false, `false positive: ${s}`);
});

test("no file falls back from one language's title to the other language's", () => {
  const offenders = scan(BORROW);
  assert.deepEqual(
    offenders,
    [],
    `these files show a reader the other language's name when their own is blank. Use listingTitle(), placeName() or entityName():\n  ${offenders.join("\n  ")}`,
  );
});
