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
  currentEvidenceMarks,
  isValidEvidenceItemKey,
  type EvidenceRequirement,
  type EvidenceFulfilment,
  type EvidenceMarkRow,
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

// PKG-LISTING-CREATION-1B outcome A. currentEvidenceMarks() reduces a raw
// listing_evidence_marks read (any order, the whole ledger) to the map
// evidenceMission()'s own `unavailable` input expects.
//
// Codex review: seq, not created_at, is the real total order (see
// 20260902's own migration comment: Postgres's created_at is
// transaction-stable, so two rows can share a value). Every test below
// passes seq explicitly, standing for the database identity value real
// rows would carry, so "which row is latest" is never left to depend on
// created_at or on array order, matching how the real reducer now works.
function mark(item_kind: string, item_key: string, action: string, reason: string | null, created_at: string, seq: number): EvidenceMarkRow {
  return { item_kind, item_key, action, reason, created_at, seq };
}

test("currentEvidenceMarks: a single marked_unavailable row is returned", () => {
  const rows = [mark("photo", "approach", "marked_unavailable", "No street frontage exists here", "2026-09-01T00:00:00Z", 1)];
  assert.deepEqual(currentEvidenceMarks(rows), [{ item_kind: "photo", item_key: "approach", reason: "No street frontage exists here" }]);
});

test("currentEvidenceMarks: a later cleared row removes an earlier mark", () => {
  const rows = [
    mark("photo", "approach", "marked_unavailable", "No street frontage exists here", "2026-09-01T00:00:00Z", 1),
    mark("photo", "approach", "cleared", null, "2026-09-02T00:00:00Z", 2),
  ];
  assert.deepEqual(currentEvidenceMarks(rows), []);
});

test("currentEvidenceMarks: re-marking after a clear returns the newer reason, not the old one", () => {
  const rows = [
    mark("photo", "approach", "marked_unavailable", "No street frontage exists here", "2026-09-01T00:00:00Z", 1),
    mark("photo", "approach", "cleared", null, "2026-09-02T00:00:00Z", 2),
    mark("photo", "approach", "marked_unavailable", "Frontage was later demolished", "2026-09-03T00:00:00Z", 3),
  ];
  assert.deepEqual(currentEvidenceMarks(rows), [{ item_kind: "photo", item_key: "approach", reason: "Frontage was later demolished" }]);
});

test("currentEvidenceMarks: reads by seq, not by array order or created_at", () => {
  const rows = [
    // Array position 0, but the OLDER created_at AND the lower seq: must lose.
    mark("photo", "approach", "marked_unavailable", "No street frontage exists here", "2026-09-01T00:00:00Z", 1),
    // Array position 1, later created_at and higher seq: must win.
    mark("photo", "approach", "cleared", null, "2026-09-02T00:00:00Z", 2),
  ];
  assert.deepEqual(currentEvidenceMarks(rows), [], "seq 2 (cleared) must win over seq 1 regardless of array order");
});

test("currentEvidenceMarks: two events sharing an identical created_at are still ordered correctly, by seq", () => {
  // The exact scenario 20260902's migration comment names: Postgres's
  // created_at is transaction-stable, so a mark and its own clearing can
  // carry the identical timestamp. seq must still disambiguate correctly.
  const SAME_INSTANT = "2026-09-01T00:00:00.000Z";
  const rows = [
    mark("photo", "approach", "marked_unavailable", "No street frontage exists here", SAME_INSTANT, 5),
    mark("photo", "approach", "cleared", null, SAME_INSTANT, 6),
  ];
  assert.deepEqual(currentEvidenceMarks(rows), [], "seq 6 (cleared) must win over seq 5 despite an identical created_at");

  // And the reverse: if the mark happened to be assigned the higher seq
  // despite an identical timestamp, it must be the one that wins.
  const reversed = [
    mark("photo", "roof", "cleared", null, SAME_INSTANT, 7),
    mark("photo", "roof", "marked_unavailable", "Roof access was later blocked", SAME_INSTANT, 8),
  ];
  assert.deepEqual(currentEvidenceMarks(reversed), [{ item_kind: "photo", item_key: "roof", reason: "Roof access was later blocked" }]);
});

test("currentEvidenceMarks: a fact and a photo sharing the same key string are tracked independently", () => {
  const rows = [
    mark("photo", "loading", "marked_unavailable", "No loading dock on this plot", "2026-09-01T00:00:00Z", 1),
    mark("fact", "loading", "marked_unavailable", "Loading capacity was never assessed", "2026-09-01T00:00:00Z", 2),
  ];
  const result = currentEvidenceMarks(rows);
  assert.equal(result.length, 2);
  assert.ok(result.some((r) => r.item_kind === "photo" && r.item_key === "loading" && r.reason === "No loading dock on this plot"));
  assert.ok(result.some((r) => r.item_kind === "fact" && r.item_key === "loading" && r.reason === "Loading capacity was never assessed"));
});

test("currentEvidenceMarks: an empty ledger returns an empty list", () => {
  assert.deepEqual(currentEvidenceMarks([]), []);
});

test("currentEvidenceMarks output feeds evidenceMission() directly", () => {
  const rows = [mark("photo", "approach", "marked_unavailable", "No street frontage exists here", "2026-09-01T00:00:00Z", 1)];
  const unavailable = new Map(currentEvidenceMarks(rows).map((m) => [m.item_key, m.reason]));
  const items = evidenceMission({ assetType: "office", unavailable });
  const approach = items.find((i) => i.key === "approach");
  assert.equal(approach?.fulfilment, "unavailable");
  assert.equal(approach?.unavailableReason, "No street frontage exists here");
});

// 20260905_pkg1b_evidence_mark_invalidation.sql. A mark keyed on a shared
// item_key ("frontage": retail's shopfront vs. showroom's display glazing)
// must stop reading as effective the instant the listing's asset type
// changes away from the type it was made under, without erasing the row
// that made it, and must not silently reappear if the asset type later
// reverts. currentEvidenceMarks() itself needed no new branch for this (see
// its own comment); these tests are what prove that claim rather than
// merely assert it.
test("currentEvidenceMarks: an invalidated_by_asset_change row makes an earlier mark ineffective, same as cleared", () => {
  const rows = [
    mark("photo", "frontage", "marked_unavailable", "No frontage, it is an interior mall unit", "2026-09-01T00:00:00Z", 1),
    mark("photo", "frontage", "invalidated_by_asset_change", "asset type changed from retail to showroom", "2026-09-02T00:00:00Z", 2),
  ];
  assert.deepEqual(currentEvidenceMarks(rows), []);
});

test("currentEvidenceMarks: reverting the asset type does not resurrect the original, invalidated mark", () => {
  const rows = [
    mark("photo", "frontage", "marked_unavailable", "No frontage, it is an interior mall unit", "2026-09-01T00:00:00Z", 1),
    mark("photo", "frontage", "invalidated_by_asset_change", "asset type changed from retail to showroom", "2026-09-02T00:00:00Z", 2),
    // Reverting retail -> showroom -> retail finds nothing currently
    // effective to invalidate a second time (the trigger's own WHERE
    // clause), so no further row is appended here. The assertion that
    // matters is that the ledger, as it stands, still reads as ineffective.
  ];
  assert.deepEqual(currentEvidenceMarks(rows), [], "the pre-invalidation mark must not become effective again on its own");
});

test("currentEvidenceMarks: a genuinely new mark made after invalidation is effective again", () => {
  const rows = [
    mark("photo", "frontage", "marked_unavailable", "No frontage, it is an interior mall unit", "2026-09-01T00:00:00Z", 1),
    mark("photo", "frontage", "invalidated_by_asset_change", "asset type changed from retail to showroom", "2026-09-02T00:00:00Z", 2),
    mark("photo", "frontage", "marked_unavailable", "No street-facing glazing under showroom either", "2026-09-03T00:00:00Z", 3),
  ];
  assert.deepEqual(currentEvidenceMarks(rows), [
    { item_kind: "photo", item_key: "frontage", reason: "No street-facing glazing under showroom either" },
  ]);
});

test("currentEvidenceMarks: an item never marked unavailable is untouched by an unrelated invalidation", () => {
  const rows = [
    mark("photo", "approach", "marked_unavailable", "No street frontage exists here", "2026-09-01T00:00:00Z", 1),
    mark("photo", "frontage", "invalidated_by_asset_change", "asset type changed from retail to showroom", "2026-09-02T00:00:00Z", 2),
  ];
  assert.deepEqual(currentEvidenceMarks(rows), [
    { item_kind: "photo", item_key: "approach", reason: "No street frontage exists here" },
  ]);
});

// Codex review: the evidence-marks route previously accepted any string
// under 120 characters as item_key. isValidEvidenceItemKey is the real
// check now applied server-side, against the listing's own real asset
// type, mirroring mediaCategorization.ts's isValidShotKey exactly.
test("isValidEvidenceItemKey: a real shot for this asset type is valid", () => {
  assert.equal(isValidEvidenceItemKey("warehouse", "photo", "loading"), true);
  assert.equal(isValidEvidenceItemKey("office", "photo", "approach"), true);
});

test("isValidEvidenceItemKey: a shot belonging to a different asset type is rejected", () => {
  assert.equal(isValidEvidenceItemKey("office", "photo", "loading"), false);
});

test("isValidEvidenceItemKey: a real fact field for this asset type is valid", () => {
  const realField = fieldsFor("office")[0]?.key;
  assert.ok(realField, "office must have at least one fact field for this test to mean anything");
  assert.equal(isValidEvidenceItemKey("office", "fact", realField), true);
});

test("isValidEvidenceItemKey: a fact key belonging to a different asset type is rejected", () => {
  const officeOnly = fieldsFor("office").find((f) => !fieldsFor("warehouse").some((w) => w.key === f.key));
  assert.ok(officeOnly, "there must be at least one office-only fact field for this test to mean anything");
  assert.equal(isValidEvidenceItemKey("warehouse", "fact", officeOnly!.key), false);
});

test("isValidEvidenceItemKey: an arbitrary caller-supplied string is rejected even under 120 characters", () => {
  assert.equal(isValidEvidenceItemKey("office", "photo", "not_a_real_shot"), false);
  assert.equal(isValidEvidenceItemKey("office", "fact", "not_a_real_field"), false);
  assert.equal(isValidEvidenceItemKey("office", "photo", ""), false);
});

test("isValidEvidenceItemKey: an unrecognised item_kind is always rejected", () => {
  assert.equal(isValidEvidenceItemKey("office", "document", "approach"), false);
});

test("isValidEvidenceItemKey: mediaStandard's own shots for a given type all validate, generically across all 15 asset types", () => {
  for (const t of [
    "office", "serviced", "retail", "showroom", "medical", "warehouse",
    "self_storage", "education", "hospitality", "land", "mixed_use",
    "gas_station", "wedding_hall", "worker_housing", "entertainment",
  ]) {
    for (const s of mediaStandardFor(t).shots) {
      assert.equal(isValidEvidenceItemKey(t, "photo", s.key), true, `${s.key} should validate for ${t}`);
    }
  }
});
