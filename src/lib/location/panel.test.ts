import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { districtMobilityPanel } from "./panel";

// ADV-5B. The view boundary between a mobility verdict and a reader.
//
// The claim under test is not "the panel is unavailable today". It is that a
// page holding this value CANNOT print licence reasoning, a register code or a
// clause identifier, because the value does not contain any of them. A test that
// only checked `available === false` would still pass on the day someone widened
// the return type to carry `reasons` for debugging.

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

test("panel: a public district panel is unavailable at the rights stage", () => {
  const v = districtMobilityPanel("d_olaya", "public", { rights: new Map() });
  assert.equal(v.available, false);
  if (v.available) return;
  assert.equal(v.statusKey, "mobilityStageRights");
});

test("panel: an unread register denies exactly as an empty one does", () => {
  const unread = districtMobilityPanel("d_olaya", "public");
  const empty = districtMobilityPanel("d_olaya", "public", { rights: new Map() });
  assert.deepEqual(unread, empty);
});

test("panel: an internal audience is refused on the same rights gate", () => {
  const v = districtMobilityPanel("d_olaya", "internal", { rights: new Map() });
  assert.equal(v.available, false);
  if (v.available) return;
  assert.equal(v.statusKey, "mobilityStageRights");
});

test("panel: a missing district id denies rather than resolving to a wider area", () => {
  for (const id of [null, undefined, ""]) {
    const v = districtMobilityPanel(id, "public", { rights: new Map() });
    assert.equal(v.available, false, `a ${String(id)} district id produced a figure`);
  }
});

test("panel: the view carries no reason, code or clause field", () => {
  const v = districtMobilityPanel("d_olaya", "public", { rights: new Map() });
  const keys = Object.keys(v).sort();
  assert.deepEqual(keys, ["available", "statusKey"]);
  const serialised = JSON.stringify(v);
  // The register denial reasoning names the source. If any of it leaked into the
  // view, the source id would travel with it.
  assert.doesNotMatch(serialised, /geo_analy/);
  assert.doesNotMatch(serialised, /source_regi/);
});

test("panel: the view type declares no field for licence reasoning", () => {
  const src = read("src/lib/location/panel.ts");
  const i = src.indexOf("export type MobilityPanelView");
  assert.ok(i > 0, "the view type is gone");
  const decl = src.slice(i, src.indexOf("const STAGE_KEY"));
  for (const forbidden of ["reasons", "unanswered", "code:", "denialReason"]) {
    assert.ok(
      !decl.includes(forbidden),
      `MobilityPanelView gained a ${forbidden} field, so a page can now print internal licence reasoning`
    );
  }
});

test("panel: every stage maps to a status key, so no verdict renders as a blank", () => {
  const src = read("src/lib/location/panel.ts");
  for (const stage of ["rights", "sufficiency", "data", "coverage"]) {
    assert.match(src, new RegExp(`\\b${stage}: "mobilityStage`), `stage ${stage} has no key`);
  }
  const mob = read("src/lib/location/mobility.ts");
  const declared = mob.match(/export type MobilityStage =([^;]+);/);
  assert.ok(declared, "MobilityStage is no longer declared where this file expects it");
  const stages = (declared[1].match(/"([a-z]+)"/g) ?? []).map((s) => s.replace(/"/g, ""));
  assert.deepEqual(stages.sort(), ["coverage", "data", "rights", "sufficiency"]);
});

test("panel: both dictionaries carry every status key this file can return", () => {
  const keys = [
    "mobilityStageRights",
    "mobilityStageSufficiency",
    "mobilityStageData",
    "mobilityStageCoverage",
  ];
  for (const locale of ["en", "ar"]) {
    const d = JSON.parse(
      read(path.join("src", "i18n", "dictionaries", `${locale}.json`))
    ) as Record<string, Record<string, string>>;
    for (const k of keys) {
      const v = d.building?.[k] ?? "";
      assert.ok(v.trim().length > 0, `${locale}: building.${k} is missing`);
    }
  }
});
