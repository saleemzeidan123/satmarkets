import { test } from "node:test";
import assert from "node:assert";
import { coerceAndValidateAttributes } from "./intakeValidation";

test("unknown keys are dropped, never stored", () => {
  const r = coerceAndValidateAttributes("office", { not_a_field: "x", floor_plate_sqm: "900" });
  assert.equal((r.attributes as any).not_a_field, undefined);
  assert.equal((r.columns as any).not_a_field, undefined);
  assert.equal(r.attributes.floor_plate_sqm, 900);
});

test("numeric strings are coerced to JSON numbers, not stored as strings", () => {
  const r = coerceAndValidateAttributes("office", { floor_plate_sqm: "1200", ceiling_height_m: "3.2" });
  assert.strictEqual(r.attributes.floor_plate_sqm, 1200);
  assert.strictEqual(typeof r.attributes.floor_plate_sqm, "number");
  assert.strictEqual(r.attributes.ceiling_height_m, 3.2);
});

test("THE SPLIT: column-backed fields route to columns, non-column to attributes", () => {
  const r = coerceAndValidateAttributes("warehouse", {
    clear_height_m: "9",       // column-backed -> columns
    power_kva: "800",          // column-backed -> columns
    asking_rent_sqm: "300",    // column-backed (money) -> columns
    yard_depth_m: "40",        // attribute -> attributes
    column_grid: "12 x 24 m",  // attribute -> attributes
  });
  assert.equal(r.columns.clear_height_m, 9);
  assert.equal(r.columns.power_kva, 800);
  assert.equal(r.columns.asking_rent_sqm, 300);
  assert.equal(r.attributes.yard_depth_m, 40);
  assert.equal(r.attributes.column_grid, "12 x 24 m");
  // A column-backed field must NEVER be in attributes (the vanishing-data bug)
  assert.equal((r.attributes as any).clear_height_m, undefined);
  assert.equal((r.attributes as any).asking_rent_sqm, undefined);
  // A non-column field must NEVER be a top-level column
  assert.equal((r.columns as any).yard_depth_m, undefined);
});

test("out-of-range numbers are rejected as errors, not stored", () => {
  const r = coerceAndValidateAttributes("office", { ceiling_height_m: "999" }); // max 30
  assert.equal(r.attributes.ceiling_height_m, undefined);
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].key, "ceiling_height_m");
});

test("enum values must be declared; unknown enum is an error", () => {
  const ok = coerceAndValidateAttributes("office", { green_cert: "leed" });
  assert.equal(ok.attributes.green_cert, "leed");
  assert.equal(ok.errors.length, 0);
  const bad = coerceAndValidateAttributes("office", { green_cert: "platinum" });
  assert.equal(bad.attributes.green_cert, undefined);
  assert.equal(bad.errors[0].key, "green_cert");
});

test("non-integer for an integer field is rejected", () => {
  const bad = coerceAndValidateAttributes("office", { floor_level: "3.5" });
  assert.equal(bad.errors[0].key, "floor_level");
  const ok = coerceAndValidateAttributes("office", { floor_level: "24" });
  assert.strictEqual(ok.attributes.floor_level, 24);
});

test("booleans: true stored, false / unchecked omitted (never stored false)", () => {
  const t = coerceAndValidateAttributes("office", { raised_floor: "on" });
  assert.strictEqual(t.attributes.raised_floor, true);
  const f = coerceAndValidateAttributes("office", { raised_floor: false });
  assert.equal(f.attributes.raised_floor, undefined);
  const absent = coerceAndValidateAttributes("office", {});
  assert.equal(absent.attributes.raised_floor, undefined);
});

test("empty, null, and whitespace values are omitted, not stored as null", () => {
  const r = coerceAndValidateAttributes("office", { hvac_type: "  ", floor_plate_sqm: "", green_cert: null });
  assert.deepEqual(r.attributes, {});
  assert.deepEqual(r.columns, {});
  assert.equal(r.errors.length, 0);
});

test("attributes stays sparse: only keys with real values appear", () => {
  const r = coerceAndValidateAttributes("office", { floor_plate_sqm: "900", hvac_type: "VAV" });
  assert.deepEqual(Object.keys(r.attributes).sort(), ["floor_plate_sqm", "hvac_type"]);
});

test("an asset type with no registry yields empty result, no crash", () => {
  const r = coerceAndValidateAttributes("land", { anything: "x" });
  assert.deepEqual(r.attributes, {});
  assert.deepEqual(r.columns, {});
  assert.deepEqual(r.errors, []);
});

test("unavailable (sourced) fields are never accepted, even if supplied", () => {
  // footfall/catchment are sourced+unavailable, so not in intakeFields -> dropped
  const r = coerceAndValidateAttributes("retail", { footfall: "5000", catchment_population: "120000", frontage_m: "12" });
  assert.equal(r.attributes.footfall, undefined);
  assert.equal(r.attributes.catchment_population, undefined);
  assert.equal(r.attributes.frontage_m, 12);
});
