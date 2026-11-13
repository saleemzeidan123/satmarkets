import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * PKG-DISCOVERY-1 item 9: "canonical listing-card behavior".
 *
 * PKG-CARD1's own header comment states the defect this file exists to
 * prevent from recurring: Home, Listings Search and the Lister profile each
 * hand-rolled a near-duplicate card, and every private copy had drifted from
 * the others on at least one thing a listing card must never get wrong (a
 * lease unit under a sale price, a decorative heart with no handler, no
 * verification shown at all). `ListingCard.tsx` became "the one place a
 * listing becomes a card"; nothing here re-verifies that claim was true when
 * it was written, only that it still is.
 *
 * WHY SOURCE-LEVEL. No React renderer in `npm test`, the same constraint
 * every other law test in this repository states for itself.
 */

const COMPONENT = path.join(__dirname, "ListingCard.tsx");
const SRC = fs.readFileSync(COMPONENT, "utf8");

test("ListingCard is still the only listing-card component every call site imports", () => {
  // The claim PKG-CARD1 made. If a future page starts drawing its own card
  // markup again, this is the test that should start failing: it counts real
  // import sites of a second competing default export rather than trusting
  // the comment to still be true.
  const APP = path.join(__dirname, "../app/[locale]");
  // Home's own ListingCard usage is delegated to MarketingHome.tsx (checked
  // separately below), not called from app/[locale]/page.tsx directly.
  const callers = ["building/[id]/page.tsx", "lister/[id]/page.tsx", "listings/page.tsx", "saved/page.tsx"];
  const missing: string[] = [];
  for (const rel of callers) {
    const f = path.join(APP, rel);
    if (!fs.existsSync(f)) { missing.push(`${rel} (file gone)`); continue; }
    const body = fs.readFileSync(f, "utf8");
    if (!/import ListingCard/.test(body)) missing.push(rel);
  }
  assert.deepEqual(missing, [], `expected every one of these surfaces to import the shared ListingCard, but it is missing from: ${missing.join(", ")}`);
  // And MarketingHome, the sixth caller (Home's own leaf render lives there,
  // not directly under app/).
  const home = fs.readFileSync(path.join(__dirname, "MarketingHome.tsx"), "utf8");
  assert.match(home, /import ListingCard/, "MarketingHome.tsx no longer imports the shared ListingCard");
});

test("a listing with no stated price falls back to ui.onRequest in both card densities, never a blank or a literal 0", () => {
  const leadBlock = /if \(variant === "lead"\) \{[\s\S]*?\n  \}\n/.exec(SRC)?.[0] ?? "";
  assert.match(leadBlock, /pp \? pp\.value : ui\.onRequest/, "the lead card must fall back to ui.onRequest when priceParts returns nothing");
  // The grid branch is everything after the lead branch closes.
  const gridBlock = SRC.slice(SRC.indexOf(leadBlock) + leadBlock.length);
  assert.match(gridBlock, /pp \? pp\.value : ui\.onRequest/, "the grid card must fall back to ui.onRequest when priceParts returns nothing");
});

test("the verified-badge tick is confirmed green only when at least one badge actually resolved, and the incomplete state never borrows that color", () => {
  assert.match(SRC, /badges\.length > 0 \? \(/, "the badge tick must branch on badges.length, not render green unconditionally");
  const branches = /\{badges\.length > 0 \? \([\s\S]*?\) : \([\s\S]*?\)\}/.exec(SRC)?.[0] ?? "";
  assert.ok(branches.length > 0, "could not locate the badges.length ternary to check its two branches");
  const [confirmedBranch, incompleteBranch] = branches.split(/\) : \(/);
  assert.match(confirmedBranch, /#1B7A50/, "the confirmed branch should carry the reserved verification green");
  assert.doesNotMatch(incompleteBranch, /#1B7A50|var\(--verified\)/, "the verificationIncomplete branch must not carry the reserved confirmed-green color; finding 46 exists specifically to keep this line from claiming a check that was not run");
});

test("the availability dot's color always comes from availabilityTone(), never the reserved verification green literal", () => {
  // Finding 46, restated as its own test: an availability date is what the
  // lister typed, not a check SAT ran, so the dot beside it may not borrow
  // the confirmed-green hex the badge tick above it earns honestly.
  const availLine = /av \? \([\s\S]*?availabilityTone\(av\.state\)[\s\S]*?\) : null/.exec(SRC)?.[0] ?? "";
  assert.ok(availLine.length > 0, "could not find the availability dot block");
  assert.doesNotMatch(availLine, /#1B7A50/, "the availability dot hardcodes the reserved verification green instead of reading availabilityTone()");
});

test("showFreshness and indexPosition are opt-in: a caller that passes neither gets no freshness line and no index bar", () => {
  assert.match(SRC, /showFreshness = false/, "showFreshness must default to false");
  assert.match(SRC, /indexPosition = null/, "indexPosition must default to null");
  assert.match(SRC, /const ls = showFreshness \? listedSince/, "the freshness computation must itself be gated on showFreshness, not just its render");
  assert.match(SRC, /const av = showFreshness \? availabilityOf/, "the availability computation must itself be gated on showFreshness, not just its render");
});

test("the save affordance reads the shared common.save string, never a hardcoded English literal", () => {
  // ADV-1D: dict had no ui.save, so this silently fell back to the literal
  // "Save" for every Arabic reader on Building and Saved.
  assert.match(SRC, /const saveLabel = dict\.common\.save;/, "saveLabel must be read from dict.common.save");
  assert.doesNotMatch(SRC, /label=\{?["']Save["']\}?/, "a hardcoded \"Save\" literal was passed to SaveHeart instead of the resolved saveLabel");
});

test("the map hover-sync class and data attribute are conditional on mapId, so Building and Saved (which pass none) draw no .listing class", () => {
  assert.match(SRC, /className=\{"card group relative block overflow-hidden" \+ \(mapId \? " listing" : ""\)\}/, "the .listing class must stay conditional on mapId");
  assert.match(SRC, /data-lid=\{mapId\}/, "data-lid must be present so ListingsMap's hover sync can find the card when mapId is supplied");
});

// ---------------------------------------------------------------------------
// PKG-DESIGN-3. The `row` density: one search result.
//
// The row is a variant of this component and not a component of the listings
// page, for the reason the first test in this file exists. These tests hold the
// things a row may not get wrong, each of which the grid card already answers
// for in the tests above.
// ---------------------------------------------------------------------------

const ROW = /if \(variant === "row"\) \{[\s\S]*?\n  \}\n/.exec(SRC)?.[0] ?? "";
const CSS = fs.readFileSync(path.join(__dirname, "../styles/globals.css"), "utf8");

test("the listings page draws its results through ListingCard's row density, not markup of its own", () => {
  assert.ok(ROW.length > 0, "could not find the `row` branch in ListingCard.tsx");
  const page = fs.readFileSync(path.join(__dirname, "../app/[locale]/listings/page.tsx"), "utf8");
  assert.match(page, /<ListingCard variant="row"[^>]*showFreshness[^>]*mapId=\{l\.id\}/, "listings/page.tsx must render each result as <ListingCard variant=\"row\" ... showFreshness mapId={l.id} />");
  assert.match(ROW, /className=\{"rs-row" \+ \(mapId \? " listing" : ""\)\}/, "the row must keep the .listing class conditional on mapId, the hook ListingsMap's hover sync reads");
  assert.match(ROW, /data-lid=\{mapId\}/, "the row must carry data-lid so the map can find it");
});

test("a row square is filled only where the resolver returned verified, and the reserved green is spent nowhere else in the results", () => {
  // D24 in both directions. The squares are drawn from `listingVerification`,
  // the same resolver the badge reads, so a square cannot be filled by a flag.
  assert.match(ROW, /listingVerification\(listing as any, null\)\.filter\(\(x\) => x\.state !== "not_applicable"\)/, "the squares must come from listingVerification, with questions that do not apply left out rather than drawn as unmet");
  const green = ROW.split("\n").filter((l) => /#1B7A50|var\(--verified\)|var\(--green\)/i.test(l) && !l.trim().startsWith("//"));
  assert.equal(green.length, 1, "the reserved green may be stated on exactly one line of the row: the square");
  assert.match(green[0], /className=\{x\.state === "verified" \? "rs-sq on" : "rs-sq"\} style=\{x\.state === "verified" \? \{ background: "var\(--verified\)" \} : undefined\}/, "a square may be filled, and may be green, only when its own dimension resolved to verified");
  // greenReservation.test.ts does not allow the green in globals.css at all;
  // this states the same thing for the results block by name.
  const block = CSS.slice(CSS.indexOf("PKG-DESIGN-3. Search results."));
  assert.doesNotMatch(block, /#1B7A50|var\(--verified\)|var\(--green\)|var\(--status-verified\)/i, "the results styles must not state the reserved verification green");
});

test("the row states its count in words beside the squares and hides the squares from assistive technology", () => {
  assert.match(ROW, /<span className="rs-squares" aria-hidden="true">/, "the squares are a drawing of the count beside them and must be aria-hidden");
  assert.match(ROW, /fill\(L\.rowVerified, \{ n: String\(nVerified\), m: String\(dims\.length\) \}\)/, "the row must state how many checks are verified, out of how many apply, in words");
});

test("the row's availability colour comes from availabilityTone(), as the card's does", () => {
  const line = /av \? \([\s\S]*?\) : null/.exec(ROW)?.[0] ?? "";
  assert.ok(line.length > 0, "could not find the row's availability line");
  assert.match(line, /availabilityTone\(av\.state\)/, "the row's availability line must take its colour from availabilityTone()");
});

test("a row with no stated price or area says so in words, never a blank and never a dash", () => {
  assert.match(ROW, /pp \? pp\.value : ui\.onRequest/, "a row with no stated price must fall back to ui.onRequest");
  assert.match(ROW, /areaFig \?\? L\.na/, "a row with no stated area must fall back to the dictionary's not-available word");
});

test("a row draws the type of space, never a library photograph standing in for the property", () => {
  // src/lib/photos.ts picks a stock picture by hashing the listing id. Beside a
  // real address and a real price that is a statement about the listing nobody
  // recorded. The row uses the drawing until a listing has photographs of its own.
  assert.doesNotMatch(ROW, /photo\b|<img|<Ph\b/, "the row must not render the stock photograph");
  assert.match(ROW, /<TypeGlyph type=\{listing\.asset_type\} \/>/, "the row must draw the asset type through TypeGlyph");
  const glyph = fs.readFileSync(path.join(__dirname, "TypeGlyph.tsx"), "utf8");
  assert.match(glyph, /aria-hidden="true"/, "the drawing is decoration and must be hidden from assistive technology");
  const code = glyph.replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(code, /<text\b/, "the drawing must carry no text, so it can carry no figure");
  // And the page says what the drawing is, in both languages.
  const page = fs.readFileSync(path.join(__dirname, "../app/[locale]/listings/page.tsx"), "utf8");
  assert.match(page, /\{dl\.thumbNote\}/, "the listings page must state that the drawing is not a picture of the property and is not to scale");
  for (const lang of ["en", "ar"]) {
    const d = JSON.parse(fs.readFileSync(path.join(__dirname, `../i18n/dictionaries/${lang}.json`), "utf8"));
    assert.ok(typeof d.listings.thumbNote === "string" && d.listings.thumbNote.length > 20, `listings.thumbNote is missing from ${lang}.json`);
  }
});

test("the lead measure a row prints is read from the registry and from the record, never stated in the component", () => {
  assert.match(ROW, /const lead = leadMeasureOf\(listing as any, ar\);/, "the row must read its lead measure through leadMeasureOf");
  assert.match(ROW, /\{lead \? /, "a listing with no recorded lead measure must get no line, not a default");
  const lib = fs.readFileSync(path.join(__dirname, "../lib/leadMeasure.ts"), "utf8");
  assert.match(lib, /if \(value === null\) return null;/, "leadMeasureOf must return nothing when the record holds no value");
});
