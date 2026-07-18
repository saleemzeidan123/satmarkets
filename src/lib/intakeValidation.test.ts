import { test } from "node:test";
import assert from "node:assert";
import { coerceAndValidateAttributes } from "./intakeValidation";

// The minimal required baseline per asset (see assetFields required flags). Tests
// that are NOT about required-ness merge this in so a missing-required error does
// not drown out the behaviour under test.
const REQ: Record<string, Record<string, string>> = {
  office: { building_grade: "b", fitout_condition: "fitted", floor_level: "3" },
  warehouse: { clear_height_m: "9" },
  retail: { frontage_m: "12" },
};
const withReq = (asset: string, extra: Record<string, unknown>) =>
  coerceAndValidateAttributes(asset, { ...(REQ[asset] ?? {}), ...extra });

test("unknown keys are dropped, never stored", () => {
  const r = withReq("office", { not_a_field: "x", floor_plate_sqm: "900" });
  assert.equal((r.attributes as any).not_a_field, undefined);
  assert.equal((r.columns as any).not_a_field, undefined);
  assert.equal(r.attributes.floor_plate_sqm, 900);
});

test("numeric strings are coerced to JSON numbers, not stored as strings", () => {
  const r = withReq("office", { floor_plate_sqm: "1200", ceiling_height_m: "3.2" });
  assert.strictEqual(r.attributes.floor_plate_sqm, 1200);
  assert.strictEqual(typeof r.attributes.floor_plate_sqm, "number");
  assert.strictEqual(r.attributes.ceiling_height_m, 3.2);
});

test("THE SPLIT: column-backed fields route to columns, non-column to attributes", () => {
  const r = coerceAndValidateAttributes("warehouse", {
    clear_height_m: "9",       // column-backed -> columns (also required)
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
  const r = withReq("office", { ceiling_height_m: "999" }); // max 30
  assert.equal(r.attributes.ceiling_height_m, undefined);
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].key, "ceiling_height_m");
});

test("enum values must be declared; unknown enum is an error", () => {
  const ok = withReq("office", { green_cert: "leed" });
  assert.equal(ok.attributes.green_cert, "leed");
  assert.equal(ok.errors.length, 0);
  const bad = withReq("office", { green_cert: "platinum" });
  assert.equal(bad.attributes.green_cert, undefined);
  assert.equal(bad.errors[0].key, "green_cert");
});

test("non-integer for an integer field is rejected", () => {
  const bad = withReq("office", { floor_level: "3.5" });
  assert.equal(bad.errors[0].key, "floor_level");
  const ok = withReq("office", { floor_level: "24" });
  assert.strictEqual(ok.attributes.floor_level, 24);
});

test("booleans: true stored, false / unchecked omitted (never stored false)", () => {
  const t = withReq("office", { raised_floor: "on" });
  assert.strictEqual(t.attributes.raised_floor, true);
  const f = withReq("office", { raised_floor: false });
  assert.equal(f.attributes.raised_floor, undefined);
  const absent = withReq("office", {});
  assert.equal(absent.attributes.raised_floor, undefined);
});

test("empty, null, and whitespace values are omitted, not stored as null", () => {
  const r = withReq("office", { hvac_type: "  ", floor_plate_sqm: "", green_cert: null });
  assert.equal(r.attributes.hvac_type, undefined);
  assert.equal(r.attributes.floor_plate_sqm, undefined);
  assert.equal((r.attributes as any).green_cert, undefined);
  assert.equal(r.errors.length, 0);
});

test("attributes stays sparse: only keys with real values appear", () => {
  const r = coerceAndValidateAttributes("office", {
    building_grade: "b", fitout_condition: "fitted", floor_level: "3",
    floor_plate_sqm: "900", hvac_type: "VAV",
  });
  // building_grade + fitout_condition are column-backed, so attributes holds only
  // the non-column values (floor_level, floor_plate_sqm, hvac_type).
  assert.deepEqual(Object.keys(r.attributes).sort(), ["floor_level", "floor_plate_sqm", "hvac_type"]);
});

test("an asset type with no registry yields empty result, no crash", () => {
  const r = coerceAndValidateAttributes("land", { anything: "x" });
  assert.deepEqual(r.attributes, {});
  assert.deepEqual(r.columns, {});
  assert.deepEqual(r.errors, []);
});

test("unavailable (sourced) fields are never accepted, even if supplied", () => {
  // footfall/catchment are sourced+unavailable, so not in intakeFields -> dropped
  const r = withReq("retail", { footfall: "5000", catchment_population: "120000", frontage_m: "12" });
  assert.equal(r.attributes.footfall, undefined);
  assert.equal(r.attributes.catchment_population, undefined);
  assert.equal(r.attributes.frontage_m, 12);
});

// ---- Required-field enforcement (server is authoritative) ----

test("missing required office fields each produce an 'is required' error", () => {
  const r = coerceAndValidateAttributes("office", {}); // nothing supplied
  assert.deepEqual(r.errors.map((e) => e.key).sort(), ["building_grade", "fitout_condition", "floor_level"]);
  for (const e of r.errors) assert.equal(e.message, "is required");
});

test("required satisfied => no required errors, values land correctly", () => {
  const r = coerceAndValidateAttributes("office", { building_grade: "a", fitout_condition: "fitted", floor_level: "12" });
  assert.equal(r.errors.length, 0);
  assert.equal(r.columns.building_grade, "a");
  assert.equal(r.columns.fitout_condition, "fitted");
  assert.equal(r.attributes.floor_level, 12);
});

test("warehouse requires clear height only; power is NOT required (invention risk)", () => {
  const w = coerceAndValidateAttributes("warehouse", {});
  assert.deepEqual(w.errors.map((e) => e.key), ["clear_height_m"]);
  assert.ok(!w.errors.some((e) => e.key === "power_kva"), "power_kva must be optional");
});

test("retail requires frontage only", () => {
  const rt = coerceAndValidateAttributes("retail", {});
  assert.deepEqual(rt.errors.map((e) => e.key), ["frontage_m"]);
});

test("a present-but-invalid required field reports its validation error, not 'is required'", () => {
  const r = coerceAndValidateAttributes("warehouse", { clear_height_m: "999" }); // max 40
  const e = r.errors.find((x) => x.key === "clear_height_m");
  assert.equal(e?.message, "must be at most 40");
});

test("tristate stores yes/no explicitly; unknown or empty is omitted (never a silent no)", () => {
  // ejar_registered is a compliance tristate on every leased asset.
  assert.equal(withReq("office", { ejar_registered: "yes" }).attributes.ejar_registered, "yes");
  assert.equal(withReq("office", { ejar_registered: "no" }).attributes.ejar_registered, "no");
  assert.equal(withReq("office", { ejar_registered: "" }).attributes.ejar_registered, undefined);
  assert.equal(withReq("office", {}).attributes.ejar_registered, undefined);
  // a legacy boolean true reads as yes, so old data keeps rendering
  assert.equal(withReq("office", { ejar_registered: true }).attributes.ejar_registered, "yes");
});
