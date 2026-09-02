import { test } from "node:test";
import assert from "node:assert/strict";
import { fieldsFor } from "./assetFields";
import { mediaStandardFor } from "./mediaStandard";
import {
  evidenceMission,
  outstandingItems,
  unknownCoverageItems,
  evidenceSummary,
  evidenceRequirementLabel,
  evidenceFulfilmentLabel,
  type EvidenceRequirement,
  type EvidenceFulfilment,
} from "./guidedEvidence";

const ALL_REQUIREMENTS: EvidenceRequirement[] = ["required_by_standard", "recommended", "conditional", "not_applicable"];
const ALL_FULFILMENTS: EvidenceFulfilment[] = ["supplied", "awaiting_evidence", "unavailable", "unknown"];

// Named by code point, not written as a literal, so this file's own bytes
// never contain the character ar-lint forbids in shipped copy.
const EM_DASH = String.fromCharCode(0x2014);

test("every mission item's requirement and fulfilment are recognised values, and fulfilment is null exactly for conditional/not_applicable", () => {
  for (const type of ["office", "retail", "warehouse", "land", "mixed_use"]) {
    const items = evidenceMission({ assetType: type });
    for (const item of items) {
      assert.ok(ALL_REQUIREMENTS.includes(item.requirement), `${type}/${item.key} has an unrecognised requirement: ${item.requirement}`);
      if (item.fulfilment !== null) assert.ok(ALL_FULFILMENTS.includes(item.fulfilment), `${type}/${item.key} has an unrecognised fulfilment: ${item.fulfilment}`);
      const shouldBeNull = item.requirement === "conditional" || item.requirement === "not_applicable";
      assert.equal(item.fulfilment === null, shouldBeNull, `${type}/${item.key}: fulfilment must be null exactly when requirement is conditional or not_applicable`);
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
      assert.equal(item.requirement, "required_by_standard");
      assert.equal(item.fulfilment, "awaiting_evidence", `required shot ${item.key} did not read awaiting_evidence when unsupplied`);
    }
    if (item.kind === "fact" && requiredFieldKeys.has(item.key) && item.requirement !== "conditional" && item.requirement !== "not_applicable") {
      assert.equal(item.fulfilment, "awaiting_evidence", `required field ${item.key} did not read awaiting_evidence when unanswered`);
    }
  }
});

test("a photo shot with no per-shot data and a present inventory reads coverage unknown, never supplied", () => {
  // This is the defect Codex's review found: the first version marked every
  // shot "supplied" the moment any photograph existed. photoInventory:
  // "present" alone can never prove a SPECIFIC shot was photographed, so it
  // must never produce "supplied" for a photo item; "unknown" is the honest
  // ceiling.
  const items = evidenceMission({ assetType: "office", photoInventory: "present" });
  const photoItems = items.filter((i) => i.kind === "photo");
  assert.ok(photoItems.length > 1, "test fixture assumption: office has more than one photo shot");
  for (const item of photoItems) {
    assert.notEqual(item.fulfilment, "supplied", `${item.key} read supplied from photoInventory: "present" alone`);
    assert.equal(item.fulfilment, "unknown");
  }
});

test("one arbitrary photograph never satisfies multiple named shot categories", () => {
  // Restated directly: with photoInventory "present" and no real per-shot
  // data, no two distinct shot keys may both read "supplied" from that one
  // signal, because none of them may read "supplied" from it at all.
  const items = evidenceMission({ assetType: "warehouse", photoInventory: "present" });
  const suppliedPhotoKeys = items.filter((i) => i.kind === "photo" && i.fulfilment === "supplied").map((i) => i.key);
  assert.deepEqual(suppliedPhotoKeys, []);
});

test("with an empty inventory, every shot reads awaiting_evidence, not unknown", () => {
  const items = evidenceMission({ assetType: "office", photoInventory: "empty" });
  for (const item of items.filter((i) => i.kind === "photo")) {
    assert.equal(item.fulfilment, "awaiting_evidence");
  }
});

test("an omitted photoInventory defaults to empty, not present", () => {
  // Backward compatibility for a caller with no photo signal to give at
  // all, stated explicitly in EvidenceMissionInput's own header.
  const withDefault = evidenceMission({ assetType: "office" });
  const withExplicitEmpty = evidenceMission({ assetType: "office", photoInventory: "empty" });
  const photoFulfilments = (items: ReturnType<typeof evidenceMission>) =>
    items.filter((i) => i.kind === "photo").map((i) => i.fulfilment);
  assert.deepEqual(photoFulfilments(withDefault), photoFulfilments(withExplicitEmpty));
});

test("an unknown inventory reads coverage unknown, the same as a present one, never awaiting_evidence", () => {
  // Codex review of 8b9f72d item 4, and required regression (d): a media
  // query failure must never be read the same as a genuinely empty draft.
  // guidedEvidence.ts itself does not know WHY the inventory is unknown
  // (that is the caller's concern, see listingPreviewWiring.test.ts for the
  // preview route's own row-count-vs-query-failure wiring); its own
  // contract is just that "unknown" behaves like "present", never like
  // "empty", for every shot.
  const items = evidenceMission({ assetType: "office", photoInventory: "unknown" });
  for (const item of items.filter((i) => i.kind === "photo")) {
    assert.equal(item.fulfilment, "unknown");
    assert.notEqual(item.fulfilment, "awaiting_evidence");
  }
});

test("real per-shot data is the only path that may report a photo shot as supplied", () => {
  const standard = mediaStandardFor("office");
  const requiredShot = standard.shots.find((s) => s.weight === "required")!;
  const items = evidenceMission({ assetType: "office", photoShotsSupplied: new Set([requiredShot.key]) });
  const item = items.find((i) => i.key === requiredShot.key)!;
  assert.equal(item.requirement, "required_by_standard");
  assert.equal(item.fulfilment, "supplied");
  // Every OTHER shot, absent from the real per-shot set, stays unmet, not
  // promoted by the one shot that genuinely was supplied.
  const others = items.filter((i) => i.kind === "photo" && i.key !== requiredShot.key);
  assert.ok(others.every((i) => i.fulfilment === "awaiting_evidence"));
});

test("a supplied recommended (expected) photo shot is recommended, not required_by_standard", () => {
  const standard = mediaStandardFor("office");
  const expectedShot = standard.shots.find((s) => s.weight === "expected")!;
  const items = evidenceMission({ assetType: "office", photoShotsSupplied: new Set([expectedShot.key]) });
  const item = items.find((i) => i.key === expectedShot.key)!;
  assert.equal(item.requirement, "recommended");
  assert.equal(item.fulfilment, "supplied");
});

test("an answered field reads required_by_standard or recommended, matching its own required flag, with real fulfilment", () => {
  const field = fieldsFor("office").find((f) => f.key === "building_grade")!;
  assert.equal(field.required, true, "test fixture assumption: building_grade is required on office");
  const items = evidenceMission({ assetType: "office", attributes: { building_grade: "a" } });
  const item = items.find((i) => i.key === "building_grade")!;
  assert.equal(item.requirement, "required_by_standard");
  assert.equal(item.fulfilment, "supplied");
});

test("marking an item unavailable overrides a coarse 'unknown' guess, and unavailable is never counted as supplied", () => {
  const standard = mediaStandardFor("warehouse");
  const requiredShot = standard.shots.find((s) => s.weight === "required")!;
  const items = evidenceMission({
    assetType: "warehouse",
    photoInventory: "present", // would otherwise read "unknown" for every shot
    unavailable: new Map([[requiredShot.key, "The yard is not accessible until the tenant vacates."]]),
  });
  const item = items.find((i) => i.key === requiredShot.key)!;
  assert.equal(item.fulfilment, "unavailable");
  assert.equal(item.unavailableReason, "The yard is not accessible until the tenant vacates.");
  const s = evidenceSummary(items);
  assert.ok(s.unavailable >= 1);
  // unavailable must never be reachable through the "supplied" counter: it
  // is an explanation for an outstanding requirement, not evidence the
  // requirement was met.
  assert.notEqual(item.fulfilment, "supplied");
});

test("unavailable with an empty reason still reads unavailable, and the reason is null rather than an empty string", () => {
  const standard = mediaStandardFor("warehouse");
  const requiredShot = standard.shots.find((s) => s.weight === "required")!;
  const items = evidenceMission({ assetType: "warehouse", unavailable: new Map([[requiredShot.key, ""]]) });
  const item = items.find((i) => i.key === requiredShot.key)!;
  assert.equal(item.fulfilment, "unavailable");
  assert.equal(item.unavailableReason, null);
});

test("a genuinely conditional field with its gate unanswered reads requirement conditional, fulfilment null, and names the gate", () => {
  const items = evidenceMission({ assetType: "showroom" });
  const item = items.find((i) => i.key === "mezzanine_area_sqm")!;
  assert.equal(item.requirement, "conditional");
  assert.equal(item.fulfilment, null);
  assert.equal(item.conditionOn?.key, "mezzanine");
});

test("a conditional field whose gate answers no reads not_applicable, fulfilment null", () => {
  const items = evidenceMission({ assetType: "showroom", attributes: { mezzanine: "no" } });
  const item = items.find((i) => i.key === "mezzanine_area_sqm")!;
  assert.equal(item.requirement, "not_applicable");
  assert.equal(item.fulfilment, null);
});

test("a conditional field whose gate answers yes behaves as an ordinary unmet field, not stuck conditional forever", () => {
  const items = evidenceMission({ assetType: "showroom", attributes: { mezzanine: "yes" } });
  const item = items.find((i) => i.key === "mezzanine_area_sqm")!;
  assert.notEqual(item.requirement, "conditional");
  assert.equal(item.fulfilment, "awaiting_evidence");
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

test("outstandingItems returns exactly the awaiting_evidence items, excluding unknown", () => {
  const items = evidenceMission({ assetType: "land", photoInventory: "present" });
  const outstanding = outstandingItems(items);
  assert.ok(outstanding.every((i) => i.fulfilment === "awaiting_evidence"));
  assert.equal(outstanding.length, items.filter((i) => i.fulfilment === "awaiting_evidence").length);
  // The photo shots are all "unknown" here (photoInventory "present", no
  // per-shot data), so none of them may appear in outstandingItems.
  const photoKeys = new Set(items.filter((i) => i.kind === "photo").map((i) => i.key));
  assert.ok(outstanding.every((i) => !photoKeys.has(i.key) || i.kind !== "photo"));
});

test("unknownCoverageItems returns exactly the unknown-fulfilment items", () => {
  const items = evidenceMission({ assetType: "land", photoInventory: "present" });
  const unknown = unknownCoverageItems(items);
  assert.ok(unknown.length > 0);
  assert.ok(unknown.every((i) => i.fulfilment === "unknown"));
  assert.equal(unknown.length, items.filter((i) => i.fulfilment === "unknown").length);
});

test("evidenceSummary counts partition the mission with no item double counted", () => {
  const items = evidenceMission({ assetType: "mixed_use", attributes: { has_retail: true }, photoInventory: "present" });
  const s = evidenceSummary(items);
  const sum = s.requiredOutstanding + s.recommendedOutstanding + s.requiredUnknownCoverage + s.recommendedUnknownCoverage
    + s.unavailable + s.notApplicable + s.conditional + s.supplied;
  assert.equal(sum, s.total);
  assert.equal(s.total, items.length);
});

test("evidenceSummary is never a single fabricated completeness score, only named counts", () => {
  const items = evidenceMission({ assetType: "office" });
  const s = evidenceSummary(items);
  const keys = Object.keys(s);
  assert.ok(!keys.some((k) => /score|percent|pct/i.test(k)), "a score-shaped field appeared on the evidence summary");
});

test("every requirement and fulfilment value has a distinct, non-empty EN and AR label with no em dash", () => {
  for (const r of ALL_REQUIREMENTS) {
    const en = evidenceRequirementLabel(r, false);
    const ar = evidenceRequirementLabel(r, true);
    assert.ok(en.length > 0 && ar.length > 0, `${r} missing a label`);
    assert.notEqual(en, ar);
    assert.ok(!en.includes(EM_DASH));
    assert.ok(!ar.includes(EM_DASH));
  }
  for (const f of ALL_FULFILMENTS) {
    const en = evidenceFulfilmentLabel(f, false);
    const ar = evidenceFulfilmentLabel(f, true);
    assert.ok(en.length > 0 && ar.length > 0, `${f} missing a label`);
    assert.notEqual(en, ar);
    assert.ok(!en.includes(EM_DASH));
    assert.ok(!ar.includes(EM_DASH));
  }
});

test("the required-by-standard label never reads as a statutory or REGA requirement", () => {
  // Codex review of 922780d: the platform's own enforced check is a minimum
  // PHOTO COUNT, not a per-shot mandate, and the label must not imply
  // otherwise. "Rule" (as in the old required_by_rule) reads as a specific,
  // individually-enforced mandate; the corrected label names the platform
  // standard instead.
  const en = evidenceRequirementLabel("required_by_standard", false);
  const ar = evidenceRequirementLabel("required_by_standard", true);
  assert.ok(/SAT/.test(en) && /standard/i.test(en), `label does not name the SAT listing standard: ${en}`);
  assert.ok(!/REGA|law|statute|legal/i.test(en), `label reads as a statutory requirement: ${en}`);
  assert.ok(ar.length > 0);
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
