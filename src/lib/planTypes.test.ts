import { test } from "node:test";
import assert from "node:assert";
import { planLabel, planTypesFor, defaultPlanType, isPlanType, PLAN_TYPES } from "./planTypes";

test("null or unknown plan type reads as a generic Floor plan", () => {
  assert.equal(planLabel(null, false), "Floor plan");
  assert.equal(planLabel(undefined, true), "مخطط الطابق");
  assert.equal(planLabel("nonsense", false), "Floor plan");
});

test("survey is the Kroki cadastral survey, never the deed", () => {
  assert.equal(planLabel("survey", false), "Cadastral survey (Kroki)");
  assert.equal(planLabel("survey", true), "كروكي مساحي");
  // guard: the deed term must never be a plan label
  for (const t of PLAN_TYPES) assert.ok(!planLabel(t, true).includes("صك"), `${t} must not say صك`);
});

test("asset defaults match the CRE matrix", () => {
  assert.equal(defaultPlanType("land"), "survey");
  assert.equal(defaultPlanType("office"), "unit");
  assert.equal(defaultPlanType("warehouse"), "site");
  assert.equal(defaultPlanType("mixed_use"), "masterplan");
});

test("allowed always includes the default, and unknown assets fall back safely", () => {
  for (const a of ["office", "warehouse", "land", "mixed_use", "retail", "hospitality"]) {
    const { def, allowed } = planTypesFor(a);
    assert.ok(allowed.includes(def), `${a}: default not in allowed`);
  }
  const fb = planTypesFor("not_an_asset");
  assert.equal(fb.def, "floor");
  assert.deepEqual(fb.allowed, PLAN_TYPES);
});

test("isPlanType validates the enum", () => {
  assert.ok(isPlanType("unit"));
  assert.ok(!isPlanType("kitchen"));
  assert.ok(!isPlanType(null));
});

test("no plan label contains an em dash (Law 2)", () => {
  for (const t of PLAN_TYPES) {
    assert.ok(!planLabel(t, false).includes("\u2014"));
    assert.ok(!planLabel(t, true).includes("\u2014"));
  }
});
