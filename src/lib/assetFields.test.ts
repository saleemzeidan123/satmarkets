import { test } from "node:test";
import assert from "node:assert";
import {
  ASSET_FIELDS,
  fieldsFor,
  sectionFieldsFor,
  filterableFields,
  hasRegistry,
  type DisplaySection,
} from "./assetFields";

const SECTIONS: DisplaySection[] = [
  "identity", "space", "commercial", "compliance", "location", "market", "suitability",
];
const TIERS = ["entered", "verified", "computed", "sourced"];

test("every listable asset type has a registry; unknown types report none", () => {
  const listable = ["office", "retail", "medical", "showroom", "warehouse", "serviced", "education", "land", "gas_station", "entertainment", "wedding_hall", "worker_housing", "self_storage", "hospitality", "mixed_use"];
  for (const t of listable) assert.ok(hasRegistry(t), `${t} should have a registry`);
  assert.equal(hasRegistry("nonsense"), false);
  assert.deepEqual(fieldsFor("nonsense"), []);
});

test("every field is well-formed and uses a valid section and tier", () => {
  for (const [assetType, fields] of Object.entries(ASSET_FIELDS)) {
    for (const f of fields) {
      assert.ok(f.key, `${assetType}: field missing key`);
      assert.ok(f.label_en && f.label_ar, `${assetType}.${f.key}: missing a label`);
      assert.ok(SECTIONS.includes(f.section), `${assetType}.${f.key}: bad section ${f.section}`);
      assert.ok(TIERS.includes(f.provenance), `${assetType}.${f.key}: bad tier ${f.provenance}`);
    }
  }
});

test("field keys are unique within an asset type", () => {
  for (const [assetType, fields] of Object.entries(ASSET_FIELDS)) {
    const keys = fields.map((f) => f.key);
    assert.equal(new Set(keys).size, keys.length, `${assetType}: duplicate field key`);
  }
});

test("no em dash in any label or help text (Law 2)", () => {
  for (const [assetType, fields] of Object.entries(ASSET_FIELDS)) {
    for (const f of fields) {
      for (const s of [f.label_en, f.label_ar, f.help_en, f.help_ar]) {
        assert.ok(!(s ?? "").includes("—"), `${assetType}.${f.key}: em dash in text`);
      }
    }
  }
});

test("sourced fields that are not yet wired are marked unavailable, not faked", () => {
  // Catchment and footfall must be defined but off (available:false), never shown as a number.
  const retail = fieldsFor("retail");
  const footfall = retail.find((f) => f.key === "footfall");
  const catchment = retail.find((f) => f.key === "catchment_population");
  assert.ok(footfall && footfall.available === false, "footfall must be defined and unavailable");
  assert.ok(catchment && catchment.available === false, "catchment must be defined and unavailable");
  assert.equal(footfall!.provenance, "sourced");
});

test("filterable fields map to a typed column so search can index them", () => {
  for (const assetType of ["office", "warehouse", "retail"]) {
    for (const f of filterableFields(assetType)) {
      assert.ok(f.column, `${assetType}.${f.key}: filterable field must map to a column`);
    }
  }
});

test("section selector returns only that section's fields", () => {
  const space = sectionFieldsFor("warehouse", "space");
  assert.ok(space.length > 0);
  assert.ok(space.every((f) => f.section === "space"));
  assert.ok(space.some((f) => f.key === "clear_height_m"));
});

test("warehouse and office both surface commercial terms", () => {
  for (const t of ["warehouse", "office", "retail"]) {
    const commercial = sectionFieldsFor(t, "commercial");
    assert.ok(commercial.some((f) => f.key === "asking_rent_sqm"), `${t} should show asking rent`);
  }
});

test("every enum field declares its allowed values and a label for each", () => {
  for (const [assetType, fields] of Object.entries(ASSET_FIELDS)) {
    for (const f of fields) {
      if (f.type !== "enum") continue;
      assert.ok(f.validation?.enum?.length, `${assetType}.${f.key}: enum needs validation.enum`);
      if (f.options) {
        for (const v of f.validation!.enum!) {
          assert.ok(f.options[v], `${assetType}.${f.key}: enum value ${v} has no label`);
        }
      }
    }
  }
});

test("every required field is enterable at intake (provenance 'entered')", () => {
  // A required field the lister cannot type would make the form unsubmittable.
  for (const [assetType, fields] of Object.entries(ASSET_FIELDS)) {
    for (const f of fields) {
      if (f.required) assert.equal(f.provenance, "entered", `${assetType}.${f.key}: required but not enterable`);
    }
  }
});

test("price per m2 is computed, never collected at intake", () => {
  for (const t of ["office", "warehouse"]) {
    const pps = fieldsFor(t).find((f) => f.key === "price_per_sqm");
    assert.ok(pps, `${t} should define price_per_sqm`);
    assert.equal(pps!.provenance, "computed");
  }
});
