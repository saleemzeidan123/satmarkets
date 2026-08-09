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
