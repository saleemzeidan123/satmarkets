import { test } from "node:test";
import assert from "node:assert/strict";
import { getDictionary } from "@/i18n/getDictionary";
import { factsGridTiles, type FactsGridSource } from "./listingFactsGrid";

const en = getDictionary("en");
const ar = getDictionary("ar");

const BASE: FactsGridSource = {
  area_sqm: 300,
  building_grade: "a",
  fitout_condition: "fitted",
  deal_type: "lease",
  price: 1600,
};

test("area and price always appear; area first, price last", () => {
  const tiles = factsGridTiles(BASE, en, "en");
  assert.ok(tiles.length >= 2);
  assert.equal(tiles[0].label, en.ld.area);
  assert.equal(tiles[tiles.length - 1].evidenceKey, "asking_rent_sqm");
});

test("grade and fit-out tiles are skipped when the value is n_a, not shown as a stated n/a", () => {
  const tiles = factsGridTiles({ ...BASE, building_grade: "n_a", fitout_condition: "n_a" }, en, "en");
  assert.ok(!tiles.some((t) => t.label === en.ld.grade));
  assert.ok(!tiles.some((t) => t.label === en.ld.fitout));
});

test("typed-column headline specs appear only when the record actually states them", () => {
  const withSpecs: FactsGridSource = { ...BASE, clear_height_m: 9, loading_docks: 4, power_kva: 200, parking_ratio: 40, civil_defense_approved: true };
  const tiles = factsGridTiles(withSpecs, en, "en");
  assert.ok(tiles.some((t) => t.label === en.ld.clearHeight));
  assert.ok(tiles.some((t) => t.label === en.ld.loadingDocks));
  assert.ok(tiles.some((t) => t.label === en.ld.power));
  assert.ok(tiles.some((t) => t.label === en.ld.parking));
  assert.ok(tiles.some((t) => t.label === en.ld.civilDefense && t.value === en.ld.approved));

  const withoutSpecs = factsGridTiles(BASE, en, "en");
  assert.ok(!withoutSpecs.some((t) => t.label === en.ld.clearHeight), "an absent clear height must not draw a tile");
  assert.ok(!withoutSpecs.some((t) => t.label === en.ld.loadingDocks));
});

test("a lease price tile is labelled 'asking' with the per-sqm-per-year evidence key; a sale price is labelled 'price' with the sale key", () => {
  const lease = factsGridTiles(BASE, en, "en");
  const leaseTile = lease[lease.length - 1];
  assert.equal(leaseTile.label, en.ld.asking);
  assert.equal(leaseTile.evidenceKey, "asking_rent_sqm");

  const sale = factsGridTiles({ ...BASE, deal_type: "sale", price: 5_000_000 }, en, "en");
  const saleTile = sale[sale.length - 1];
  assert.equal(saleTile.label, en.ld.price);
  assert.equal(saleTile.evidenceKey, "sale_price");
});

test("an unstated price draws 'on request', never a zero or an empty value", () => {
  const tiles = factsGridTiles({ ...BASE, price: null }, en, "en");
  const priceTile = tiles[tiles.length - 1];
  assert.equal(priceTile.value, en.ld.onRequest);
});

test("Arabic renders every label and value from the Arabic dictionary, never falling back to English", () => {
  const tiles = factsGridTiles(BASE, ar, "ar");
  assert.equal(tiles[0].label, ar.ld.area);
  const priceTile = tiles[tiles.length - 1];
  assert.equal(priceTile.label, ar.ld.asking);
});

test("the tile list never fabricates a value: every tile's value is derived from a field actually present in the source", () => {
  const minimal: FactsGridSource = { area_sqm: null, price: null, deal_type: "lease" };
  const tiles = factsGridTiles(minimal, en, "en");
  // Only area and price survive (both always render, area empty-safe via
  // formatArea's own contract, price as "on request"); nothing else appears
  // for a source with no other fields set.
  assert.equal(tiles.length, 2);
});
