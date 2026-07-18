import { test } from "node:test";
import assert from "node:assert";
import { formatFieldValue, spaceAttributeRows } from "./attributeDisplay";
import { fieldsFor, type AssetField } from "./assetFields";

const field = (over: Partial<AssetField>): AssetField => ({
  key: "k", label_en: "K", label_ar: "ك", type: "number", section: "space", provenance: "entered", ...over,
});

test("empty, null, and false values do not render", () => {
  assert.equal(formatFieldValue(field({ type: "number" }), null, false), null);
  assert.equal(formatFieldValue(field({ type: "number" }), undefined, false), null);
  assert.equal(formatFieldValue(field({ type: "text" }), "", false), null);
  assert.equal(formatFieldValue(field({ type: "boolean" }), false, false), null);
});

test("numbers render with their unit, localised", () => {
  assert.equal(formatFieldValue(field({ type: "number", unit: "m" }), 4.5, false), "4.5 m");
  assert.equal(formatFieldValue(field({ type: "number", unit: "m" }), 4.5, true), "4.5 م");
  assert.equal(formatFieldValue(field({ type: "money", unit: "SAR/m²·yr" }), 1500, false), "1,500 SAR/m²·yr");
  assert.equal(formatFieldValue(field({ type: "money", unit: "SAR/m²·yr" }), 1500, true), "1,500 ريال/م²·سنة");
});

test("true boolean renders Yes / نعم", () => {
  assert.equal(formatFieldValue(field({ type: "boolean" }), true, false), "Yes");
  assert.equal(formatFieldValue(field({ type: "boolean" }), true, true), "نعم");
});

test("enum values use their option label, or humanise as fallback", () => {
  const withOpts = field({ type: "enum", options: { n_plus_1: ["N+1", "N+1"], leed: ["LEED", "LEED"] } });
  assert.equal(formatFieldValue(withOpts, "n_plus_1", false), "N+1");
  assert.equal(formatFieldValue(withOpts, "leed", true), "LEED");
  // no options -> snake_case is humanised
  assert.equal(formatFieldValue(field({ type: "enum" }), "some_value", false), "some value");
});

test("office generator and green-cert enums resolve to proper labels", () => {
  const gen = fieldsFor("office").find((f) => f.key === "generator_redundancy")!;
  const green = fieldsFor("office").find((f) => f.key === "green_cert")!;
  assert.equal(formatFieldValue(gen, "n_plus_1", false), "N+1");
  assert.equal(formatFieldValue(green, "leed", false), "LEED");
});

test("space rows skip column-backed and unavailable fields, keep attribute fields", () => {
  const rows = spaceAttributeRows("office", {
    floor_plate_sqm: 1200,       // attribute field -> shows
    ceiling_height_m: 3.2,       // attribute field -> shows
    building_grade: "a_plus",    // column-backed -> skipped
    parking_ratio: "1 / 40",     // column-backed -> skipped
    raised_floor: true,          // attribute boolean true -> shows
  }, false);
  const labels = rows.map((r) => r[0]);
  assert.ok(labels.includes("Floor plate"));
  assert.ok(labels.includes("Ceiling height"));
  assert.ok(labels.includes("Raised floor"));
  assert.ok(!labels.includes("Grade"), "grade is column-backed, should be skipped");
  assert.ok(!labels.includes("Parking ratio"), "parking is column-backed, should be skipped");
});

test("no attributes yields no rows", () => {
  assert.deepEqual(spaceAttributeRows("office", null, false), []);
  assert.deepEqual(spaceAttributeRows("office", {}, false), []);
});

test("only registry-known keys render, junk is ignored", () => {
  const rows = spaceAttributeRows("office", { not_a_field: 5, floor_plate_sqm: 900 }, false);
  assert.equal(rows.length, 1);
  assert.equal(rows[0][0], "Floor plate");
});

test("warehouse attribute fields render (yard depth, column grid)", () => {
  const rows = spaceAttributeRows("warehouse", { yard_depth_m: 35, column_grid: "12 x 24 m" }, false);
  const labels = rows.map((r) => r[0]);
  assert.ok(labels.includes("Yard depth"));
  assert.ok(labels.includes("Column grid"));
  // clear_height_m is column-backed, skipped even if present in attributes
  const rows2 = spaceAttributeRows("warehouse", { clear_height_m: 9 }, false);
  assert.equal(rows2.length, 0);
});
