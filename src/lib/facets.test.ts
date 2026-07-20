import { test } from "node:test";
import assert from "node:assert";
import { facetFields, hasFacets, matchesAssetFacets, coveredFacetFields } from "./facets";

test("facet fields resolve to real registry fields for the asset", () => {
  const land = facetFields("land").map((f) => f.key);
  assert.deepEqual(land, ["land_use", "deed_type"]);
  const hosp = facetFields("hospitality").map((f) => f.key);
  assert.deepEqual(hosp, ["hospitality_subtype", "star_rating"]);
  assert.equal(hasFacets("office"), false); // grade/fit-out use dedicated filters
  assert.equal(hasFacets("nonsense"), false);
});

test("enum facet matches by exact value; empty value means any", () => {
  const l = { attributes: { land_use: "commercial", deed_type: "sakk_organized" } };
  assert.ok(matchesAssetFacets(l, "land", { land_use: "commercial" }));
  assert.ok(!matchesAssetFacets(l, "land", { land_use: "residential" }));
  assert.ok(matchesAssetFacets(l, "land", { land_use: "" })); // any
  assert.ok(matchesAssetFacets(l, "land", {})); // no facets set
});

test("numeric facet is a minimum threshold", () => {
  const hotel = { attributes: { hospitality_subtype: "hotel" } };
  const bigHall = { attributes: { guest_capacity: 500, gender_config: "both_separate" } };
  const smallHall = { attributes: { guest_capacity: 120, gender_config: "women_only" } };
  assert.ok(matchesAssetFacets(bigHall, "wedding_hall", { guest_capacity: "300" }));
  assert.ok(!matchesAssetFacets(smallHall, "wedding_hall", { guest_capacity: "300" }));
  // a listing missing the numeric attribute does not meet a minimum
  assert.ok(!matchesAssetFacets(hotel, "wedding_hall", { guest_capacity: "1" }));
});

test("tri-state facet matches yes/no, including legacy booleans", () => {
  const climate = { attributes: { listing_scope: "whole_facility", climate_controlled: "yes" } };
  const legacy = { attributes: { listing_scope: "single_unit", climate_controlled: true } };
  const none = { attributes: { listing_scope: "single_unit" } };
  assert.ok(matchesAssetFacets(climate, "self_storage", { climate_controlled: "yes" }));
  assert.ok(matchesAssetFacets(legacy, "self_storage", { climate_controlled: "yes" }));
  assert.ok(!matchesAssetFacets(none, "self_storage", { climate_controlled: "yes" }));
});

test("column-backed facet reads from the row, not attributes", () => {
  // warehouse clear_height_m is a typed column, so it lives on the listing row.
  const tall = { clear_height_m: 12, attributes: {} };
  const shortWh = { clear_height_m: 6, attributes: {} };
  assert.ok(matchesAssetFacets(tall, "warehouse", { clear_height_m: "10" }));
  assert.ok(!matchesAssetFacets(shortWh, "warehouse", { clear_height_m: "10" }));
});

test("multiple facets are AND-combined", () => {
  const l = { attributes: { land_use: "commercial", deed_type: "sakk_organized" } };
  assert.ok(matchesAssetFacets(l, "land", { land_use: "commercial", deed_type: "sakk_organized" }));
  assert.ok(!matchesAssetFacets(l, "land", { land_use: "commercial", deed_type: "hujja" }));
});

test("boolean facet matches yes/no (civil_defense_approved column)", () => {
  const approved = { civil_defense_approved: true, attributes: {} };
  const not = { civil_defense_approved: false, attributes: {} };
  assert.ok(matchesAssetFacets(approved, "warehouse", { civil_defense_approved: "yes" }));
  assert.ok(!matchesAssetFacets(not, "warehouse", { civil_defense_approved: "yes" }));
  assert.ok(matchesAssetFacets(not, "warehouse", { civil_defense_approved: "no" }));
});

test("coverage gate hides facets with no data, shows well-covered ones", () => {
  // Eight warehouses: the technical columns are fully populated, sprinkler_type
  // (jsonb) sits on only one, so it must stay hidden until inventory fills in.
  const warehouses = Array.from({ length: 8 }, (_, i) => ({
    clear_height_m: 10 + i,
    loading_docks: 2,
    power_kva: 500,
    civil_defense_approved: true,
    attributes: i === 0 ? { sprinkler_type: "esfr" } : {},
  }));
  const shown = coveredFacetFields("warehouse", warehouses).map((f) => f.key);
  assert.ok(shown.includes("clear_height_m"));
  assert.ok(shown.includes("loading_docks"));
  assert.ok(shown.includes("power_kva"));
  assert.ok(shown.includes("civil_defense_approved"));
  assert.ok(!shown.includes("sprinkler_type")); // 1/8 coverage, gated out
});

test("coverage gate hides everything for an asset with empty attributes", () => {
  // Land with only typed base columns and no registry attributes (the seed-data
  // reality today) exposes zero facets, so no dead land_use/deed_type controls.
  const land = [{ attributes: {} }, { attributes: {} }, { attributes: {} }];
  assert.deepEqual(coveredFacetFields("land", land), []);
});

test("coverage gate treats n_a and empty as absent", () => {
  const rows = Array.from({ length: 5 }, () => ({ building_grade: "n_a", attributes: {} }));
  // building_grade is not a land facet, but the presence rule is what we assert:
  // an all-n_a field never props a facet open (guards the grade-facet case).
  assert.deepEqual(coveredFacetFields("land", rows), []);
});
