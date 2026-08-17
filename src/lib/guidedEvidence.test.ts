import { test } from "node:test";
import assert from "node:assert/strict";
import { fieldsFor } from "./assetFields";
import { mediaStandardFor } from "./mediaStandard";
import {
  evidenceMission,
  outstandingItems,
  evidenceSummary,
  evidenceStateLabel,
  type EvidenceState,
} from "./guidedEvidence";

const ALL_STATES: EvidenceState[] = [
  "required_by_rule", "recommended", "conditionally_applicable",
  "not_applicable", "unavailable", "awaiting_evidence",
];

// Named by code point, not written as a literal, so this file's own bytes
// never contain the character ar-lint forbids in shipped copy.
const EM_DASH = String.fromCharCode(0x2014);

test("every mission item's state is one of the six named states, nothing else", () => {
  for (const type of ["office", "retail", "warehouse", "land", "mixed_use"]) {
    const items = evidenceMission({ assetType: type });
    for (const item of items) {
      assert.ok(ALL_STATES.includes(item.state), `${type}/${item.key} has an unrecognised state: ${item.state}`);
    }
  }
});

test("with nothing supplied, every required photo shot and required field reads awaiting_evidence", () => {
  const items = evidenceMission({ assetType: "office" });
  const standard = mediaStandardFor("office");
  const requiredShotKeys = new Set(standard.shots.filter((s) => s.weight === "required").map((s) => s.key));
  const requiredFieldKeys = new Set(fieldsFor("office").filter((f) => f.required).map((f) => f.key));
  for (const item of items) {
    if (item.kind === "photo" && requiredShotKeys.has(item.key)) {
      assert.equal(item.state, "awaiting_evidence", `required shot ${item.key} did not read awaiting_evidence when unsupplied`);
    }
    if (item.kind === "fact" && requiredFieldKeys.has(item.key) && item.state !== "conditionally_applicable" && item.state !== "not_applicable") {
      assert.equal(item.state, "awaiting_evidence", `required field ${item.key} did not read awaiting_evidence when unanswered`);
    }
  }
});

test("a supplied required photo shot is required_by_rule, not awaiting_evidence", () => {
  const standard = mediaStandardFor("office");
  const requiredShot = standard.shots.find((s) => s.weight === "required")!;
  const items = evidenceMission({ assetType: "office", photoShotsSupplied: new Set([requiredShot.key]) });
  const item = items.find((i) => i.key === requiredShot.key)!;
  assert.equal(item.state, "required_by_rule");
});

test("a supplied recommended (expected) photo shot is recommended, not required_by_rule", () => {
  const standard = mediaStandardFor("office");
  const expectedShot = standard.shots.find((s) => s.weight === "expected")!;
  const items = evidenceMission({ assetType: "office", photoShotsSupplied: new Set([expectedShot.key]) });
  const item = items.find((i) => i.key === expectedShot.key)!;
  assert.equal(item.state, "recommended");
});

test("an answered field reads required_by_rule or recommended, matching its own required flag", () => {
  const field = fieldsFor("office").find((f) => f.key === "building_grade")!;
  assert.equal(field.required, true, "test fixture assumption: building_grade is required on office");
  const items = evidenceMission({ assetType: "office", attributes: { building_grade: "a" } });
  const item = items.find((i) => i.key === "building_grade")!;
  assert.equal(item.state, "required_by_rule");
});

test("an item marked unavailable this session carries its reason and never reads awaiting_evidence", () => {
  const standard = mediaStandardFor("warehouse");
  const requiredShot = standard.shots.find((s) => s.weight === "required")!;
  const items = evidenceMission({
    assetType: "warehouse",
    unavailable: new Map([[requiredShot.key, "The yard is not accessible until the tenant vacates."]]),
  });
  const item = items.find((i) => i.key === requiredShot.key)!;
  assert.equal(item.state, "unavailable");
  assert.equal(item.unavailableReason, "The yard is not accessible until the tenant vacates.");
});

test("unavailable with an empty reason still reads unavailable, and the reason is null rather than an empty string", () => {
  const standard = mediaStandardFor("warehouse");
  const requiredShot = standard.shots.find((s) => s.weight === "required")!;
  const items = evidenceMission({ assetType: "warehouse", unavailable: new Map([[requiredShot.key, ""]]) });
  const item = items.find((i) => i.key === requiredShot.key)!;
  assert.equal(item.state, "unavailable");
  assert.equal(item.unavailableReason, null);
});

test("a genuinely conditional field with its gate unanswered reads conditionally_applicable and names the gate", () => {
  const items = evidenceMission({ assetType: "showroom" });
  const item = items.find((i) => i.key === "mezzanine_area_sqm")!;
  assert.equal(item.state, "conditionally_applicable");
  assert.equal(item.conditionOn?.key, "mezzanine");
});

test("a conditional field whose gate answers no reads not_applicable, not awaiting_evidence", () => {
  const items = evidenceMission({ assetType: "showroom", attributes: { mezzanine: "no" } });
  const item = items.find((i) => i.key === "mezzanine_area_sqm")!;
  assert.equal(item.state, "not_applicable");
});

test("a conditional field whose gate answers yes behaves as an ordinary unmet field, not stuck conditional forever", () => {
  const items = evidenceMission({ assetType: "showroom", attributes: { mezzanine: "yes" } });
  const item = items.find((i) => i.key === "mezzanine_area_sqm")!;
  assert.equal(item.state, "awaiting_evidence");
});

test("a field belonging to a different asset type never appears in this type's mission at all", () => {
  const items = evidenceMission({ assetType: "office" });
  const officeKeys = new Set(items.map((i) => i.key));
  assert.ok(!officeKeys.has("clear_height_m"), "warehouse-only field leaked into the office mission");
  assert.ok(!officeKeys.has("land_use"), "land-only field leaked into the office mission");
});

test("computed and sourced fields are excluded from the mission entirely, never asked of the lister", () => {
  const items = evidenceMission({ assetType: "office" });
  assert.ok(!items.some((i) => i.key === "price_per_sqm"), "a computed field was asked of the lister as if it were evidence");
  assert.ok(!items.some((i) => i.key === "zoning_balady"), "a sourced, not-yet-wired field was asked of the lister");
});

test("outstandingItems returns exactly the awaiting_evidence items, nothing else", () => {
  const items = evidenceMission({ assetType: "land" });
  const outstanding = outstandingItems(items);
  assert.ok(outstanding.every((i) => i.state === "awaiting_evidence"));
  assert.equal(outstanding.length, items.filter((i) => i.state === "awaiting_evidence").length);
});

test("evidenceSummary counts partition the mission with no item double counted", () => {
  const items = evidenceMission({ assetType: "mixed_use", attributes: { has_retail: true } });
  const s = evidenceSummary(items);
  const sum = s.requiredOutstanding + s.recommendedOutstanding + s.unavailable + s.notApplicable + s.conditionallyApplicable + s.supplied;
  assert.equal(sum, s.total);
  assert.equal(s.total, items.length);
});

test("evidenceSummary is never a single fabricated completeness score, only named counts", () => {
  const items = evidenceMission({ assetType: "office" });
  const s = evidenceSummary(items);
  const keys = Object.keys(s);
  assert.ok(!keys.some((k) => /score|percent|pct/i.test(k)), "a score-shaped field appeared on the evidence summary");
});

test("every state has a distinct, non-empty EN and AR label with no em dash", () => {
  for (const s of ALL_STATES) {
    const en = evidenceStateLabel(s, false);
    const ar = evidenceStateLabel(s, true);
    assert.ok(en.length > 0 && ar.length > 0, `${s} missing a label`);
    assert.notEqual(en, ar);
    assert.ok(!en.includes(EM_DASH));
    assert.ok(!ar.includes(EM_DASH));
  }
});

test("the conditions table only names fields that actually exist in that asset type's registry", () => {
  // A stale gate or gated key (renamed in assetFields.ts and not updated here)
  // would silently stop the condition from ever firing, which is worse than a
  // crash: it would read as "no conditional fields for this type" instead of
  // "the table is out of date".
  const table: Record<string, ReadonlyArray<{ on: string; gates: readonly string[] }>> = {
    showroom: [{ on: "mezzanine", gates: ["mezzanine_area_sqm"] }],
    land: [{ on: "subdividable", gates: ["masterplan_ready"] }],
  };
  for (const [assetType, rules] of Object.entries(table)) {
    const keys = new Set(fieldsFor(assetType).map((f) => f.key));
    for (const rule of rules) {
      assert.ok(keys.has(rule.on), `${assetType}: gate field "${rule.on}" does not exist in the registry`);
      for (const g of rule.gates) assert.ok(keys.has(g), `${assetType}: gated field "${g}" does not exist in the registry`);
    }
  }
});
