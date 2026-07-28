import test from "node:test";
import assert from "node:assert/strict";

import { ASSET_FIELDS, intakeFields } from "./assetFields";
import { factScope } from "./factScope";
import {
  PLATFORM_OWNED_FIELD_KEYS,
  assessListing,
  bandFrom,
  scoreFromChecks,
  type CheckState,
  type CheckWeight,
  type Contradiction,
  type ListingQuality,
  type QualityCheck,
} from "./listingQuality";
import * as mod from "./listingStudio";
import {
  STEP_MAX_FIELDS,
  resumeStepId,
  stepKindLabel,
  stepProgress,
  studioFields,
  studioProgress,
  studioSteps,
  type StudioStep,
  type StudioStepKind,
} from "./listingStudio";

const TYPES = Object.keys(ASSET_FIELDS);

function chk(
  key: string,
  state: CheckState,
  weight: CheckWeight = "expected",
): QualityCheck {
  return {
    key,
    scope: "space",
    weight,
    state,
    label_en: key,
    label_ar: key,
    why_en: "test fixture",
    why_ar: "بيانات اختبار",
  };
}

function qualityFrom(checks: QualityCheck[], contradictions: Contradiction[] = []): ListingQuality {
  const missingEssential = checks
    .filter((c) => c.weight === "essential" && c.state === "missing")
    .map((c) => c.key);
  const score = scoreFromChecks(checks);
  return {
    checks,
    contradictions,
    score,
    band: bandFrom(score, missingEssential, contradictions),
    missingEssential,
  };
}

/** Every check the steps own, in one state. */
function allChecksIn(steps: StudioStep[], state: CheckState, weight: CheckWeight = "expected"): QualityCheck[] {
  return steps.flatMap((s) => s.checkKeys).map((k) => chk(k, state, weight));
}

function stepOf(steps: StudioStep[], kind: StudioStepKind): StudioStep {
  const found = steps.find((s) => s.kind === kind);
  assert.ok(found, `no ${kind} step`);
  return found;
}

const CONTRADICTION: Contradiction = {
  kind: "lease_with_sale_price",
  fields: ["deal_type", "sale_price"],
  statement_en: "The listing is offered for lease and carries a sale price.",
  statement_ar: "القائمة معروضة للإيجار وتحمل سعر بيع.",
};

test("every fact a lister supplies lives on exactly one step, for every asset type", () => {
  for (const assetType of TYPES) {
    const asked = studioFields(assetType).map((f) => f.key);
    const placed = studioSteps(assetType).flatMap((s) => s.fields.map((f) => f.key));
    assert.equal(new Set(placed).size, placed.length, `${assetType} asks for a field twice`);
    assert.deepEqual([...placed].sort(), [...asked].sort(), assetType);
  }
});

test("every platform fact lives on exactly one step, and the set is the model's own", () => {
  // Asserted against an asset type with no registry so the platform pass stands
  // alone, then against a real one so the registry cannot displace it.
  const modelKeys = assessListing({ asset_type: "no_such_asset_type" }).checks.map((c) => c.key);
  for (const assetType of ["no_such_asset_type", "office", "land"]) {
    const placed = studioSteps(assetType).flatMap((s) => s.platformKeys);
    assert.equal(new Set(placed).size, placed.length, `${assetType} asks for a platform fact twice`);
    assert.deepEqual([...placed].sort(), [...modelKeys].sort(), assetType);
  }
});

test("every check a step claims is a check the model emits", () => {
  for (const assetType of TYPES) {
    const model = new Set(assessListing({ asset_type: assetType }).checks.map((c) => c.key));
    for (const step of studioSteps(assetType)) {
      for (const key of step.checkKeys) {
        assert.ok(model.has(key), `${assetType} step ${step.id} claims ${key}, which the model never emits`);
      }
    }
  }
});

test("the price fields are asked for but never claimed as checks of their own", () => {
  const steps = studioSteps("office");
  const asked = steps.flatMap((s) => s.fields.map((f) => f.key));
  const claimed = steps.flatMap((s) => s.checkKeys);
  let seen = 0;
  for (const key of PLATFORM_OWNED_FIELD_KEYS) {
    if (!asked.includes(key)) continue;
    seen += 1;
    assert.ok(!claimed.includes(`field:${key}`), `${key} is counted twice`);
  }
  assert.ok(seen > 0, "office must ask for at least one platform owned price field");
  // The price itself is still counted, once, on the terms step.
  assert.ok(stepOf(steps, "deal").platformKeys.includes("price"));
});

test("a model check no step covers is one a lister could not have supplied", () => {
  for (const assetType of TYPES) {
    const covered = new Set(studioSteps(assetType).flatMap((s) => s.checkKeys));
    const registry = new Map(ASSET_FIELDS[assetType].map((f) => [f.key, f]));
    for (const check of assessListing({ asset_type: assetType }).checks) {
      if (covered.has(check.key)) continue;
      const key = check.key.replace(/^field:/, "");
      const field = registry.get(key);
      assert.ok(field, `${assetType}: ${check.key} is uncovered and is not a registry field`);
      const listerCannotSupply =
        field.provenance !== "entered" ||
        field.available === false ||
        field.show_rule === "hidden" ||
        PLATFORM_OWNED_FIELD_KEYS.has(key);
      assert.ok(listerCannotSupply, `${assetType}: ${check.key} is asked of nobody yet a lister could supply it`);
    }
  }
});

test("a step asks only for facts of its own subject", () => {
  const subjects = { property: "property", space: "space", deal: "deal", compliance: "compliance" } as const;
  for (const assetType of TYPES) {
    for (const step of studioSteps(assetType)) {
      const subject = subjects[step.kind as keyof typeof subjects];
      if (!subject) {
        assert.deepEqual(step.fields, [], `${assetType} step ${step.id} carries registry fields it does not own`);
        continue;
      }
      for (const field of step.fields) {
        assert.equal(factScope(assetType, field.key), subject, `${assetType}:${field.key} on ${step.id}`);
      }
    }
  }
});

test("a fact of the surroundings is never asked of a lister", () => {
  const inRegistry: string[] = [];
  for (const assetType of TYPES) {
    for (const field of ASSET_FIELDS[assetType]) {
      if (factScope(assetType, field.key) === "area") inRegistry.push(`${assetType}:${field.key}`);
    }
    for (const step of studioSteps(assetType)) {
      for (const field of step.fields) {
        assert.notEqual(factScope(assetType, field.key), "area", `${assetType}:${field.key} on ${step.id}`);
      }
    }
  }
  // The sweep must have something to catch. These fields exist and come from a
  // licensed source, so they are omitted rather than shown as a blank.
  assert.ok(inRegistry.length > 0, "no area scoped field exists, so this test proves nothing");
});

test("a field a lister cannot enter never reaches a step", () => {
  for (const assetType of TYPES) {
    for (const field of studioFields(assetType)) {
      assert.equal(field.provenance, "entered", `${assetType}:${field.key}`);
      assert.notEqual(field.available, false, `${assetType}:${field.key}`);
      assert.notEqual(field.show_rule, "hidden", `${assetType}:${field.key}`);
    }
    const entered = intakeFields(assetType).length;
    assert.ok(studioFields(assetType).length <= entered);
  }
});

test("no step is longer than the limit, and a longer group becomes numbered parts", () => {
  let split = 0;
  for (const assetType of TYPES) {
    for (const step of studioSteps(assetType)) {
      assert.ok(step.fields.length <= STEP_MAX_FIELDS, `${assetType} ${step.id} has ${step.fields.length}`);
      if (step.parts > 1) {
        split += 1;
        assert.ok(step.part >= 1 && step.part <= step.parts, step.id);
        assert.equal(step.id, `${step.kind}-${step.part}`);
      } else {
        assert.equal(step.id, step.kind);
        assert.equal(step.part, 1);
      }
    }
  }
  assert.ok(split > 0, "no step was ever split, so the limit is untested");
});

test("a split step carries its platform facts once, on the first part", () => {
  for (const assetType of TYPES) {
    const byKind = new Map<StudioStepKind, StudioStep[]>();
    for (const step of studioSteps(assetType)) {
      byKind.set(step.kind, [...(byKind.get(step.kind) ?? []), step]);
    }
    for (const [kind, parts] of byKind) {
      if (parts.length < 2) continue;
      assert.equal(parts[0].part, 1, `${assetType} ${kind}`);
      for (const later of parts.slice(1)) {
        assert.deepEqual(later.platformKeys, [], `${assetType} ${later.id}`);
      }
    }
  }
});

test("the first step names the asset and the last asks for nothing", () => {
  for (const assetType of TYPES) {
    const steps = studioSteps(assetType);
    assert.equal(steps[0].kind, "asset", assetType);
    assert.deepEqual(steps[0].fields, []);
    assert.deepEqual(steps[0].platformKeys, []);
    const last = steps[steps.length - 1];
    assert.equal(last.kind, "review", assetType);
    assert.deepEqual(last.fields, []);
    assert.deepEqual(last.platformKeys, []);
    assert.deepEqual(last.checkKeys, []);
  }
});

test("ids are unique and the index reads the list back in order", () => {
  for (const assetType of TYPES) {
    const steps = studioSteps(assetType);
    const ids = steps.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length, assetType);
    steps.forEach((s, i) => assert.equal(s.index, i + 1, `${assetType} ${s.id}`));
  }
});

test("the same asset type always returns the same steps, so a resume point cannot move", () => {
  for (const assetType of TYPES) {
    const a = studioSteps(assetType);
    const b = studioSteps(assetType);
    assert.deepEqual(a.map((s) => [s.id, s.index, s.fields.map((f) => f.key), s.checkKeys]),
      b.map((s) => [s.id, s.index, s.fields.map((f) => f.key), s.checkKeys]), assetType);
  }
});

test("an asset type with no registry still produces a form rather than nothing", () => {
  const steps = studioSteps("no_such_asset_type");
  assert.ok(steps.length >= 3);
  assert.equal(steps[0].kind, "asset");
  assert.equal(steps[steps.length - 1].kind, "review");
  assert.deepEqual(steps.flatMap((s) => s.fields), []);
  assert.ok(steps.flatMap((s) => s.platformKeys).includes("title_ar"));
});

test("a missing essential blocks a step and is never reported as complete", () => {
  const steps = studioSteps("office");
  const compliance = stepOf(steps, "compliance");
  const checks = compliance.checkKeys.map((k, i) =>
    chk(k, i === 0 ? "missing" : "present", i === 0 ? "essential" : "expected"));
  const progress = stepProgress(compliance, qualityFrom(checks));
  assert.equal(progress.state, "blocked");
  assert.equal(progress.missingEssential.length, 1);
  assert.equal(progress.answered, compliance.checkKeys.length - 1);
  assert.equal(progress.askable, compliance.checkKeys.length);
});

test("a step with nothing missing is complete, and one with nothing answered is empty", () => {
  const steps = studioSteps("office");
  const media = stepOf(steps, "media");
  assert.equal(stepProgress(media, qualityFrom(allChecksIn([media], "present"))).state, "complete");
  const empty = stepProgress(media, qualityFrom(allChecksIn([media], "missing")));
  assert.equal(empty.state, "empty");
  assert.equal(empty.answered, 0);
  assert.equal(empty.missingOther.length, media.checkKeys.length);
});

test("a step with some answers and no missing essential is partial", () => {
  const steps = studioSteps("office");
  const media = stepOf(steps, "media");
  const checks = media.checkKeys.map((k, i) => chk(k, i === 0 ? "present" : "missing"));
  const progress = stepProgress(media, qualityFrom(checks));
  assert.equal(progress.state, "partial");
  assert.equal(progress.answered, 1);
});

test("a check the model marks not applicable leaves the denominator", () => {
  const steps = studioSteps("office");
  const media = stepOf(steps, "media");
  const checks = media.checkKeys.map((k, i) => chk(k, i === 0 ? "not_applicable" : "present"));
  const progress = stepProgress(media, qualityFrom(checks));
  assert.equal(progress.askable, media.checkKeys.length - 1);
  assert.equal(progress.answered, media.checkKeys.length - 1);
  assert.equal(progress.state, "complete", "an unwired source must not read as a lister's omission");
});

test("a step reads only its own checks and is untouched by another step's state", () => {
  const steps = studioSteps("office");
  const media = stepOf(steps, "media");
  const contact = stepOf(steps, "contact");
  const quality = qualityFrom([
    ...allChecksIn([media], "present"),
    ...allChecksIn([contact], "missing", "essential"),
  ]);
  assert.equal(stepProgress(media, quality).state, "complete");
  assert.equal(stepProgress(contact, quality).state, "blocked");
});

test("the whole draft counts every step once and names the ones holding publication", () => {
  const steps = studioSteps("office");
  const contact = stepOf(steps, "contact");
  const quality = qualityFrom([
    ...allChecksIn(steps.filter((s) => s.id !== contact.id), "present"),
    ...allChecksIn([contact], "missing", "essential"),
  ]);
  const progress = studioProgress(steps, quality);
  assert.equal(progress.steps.length, steps.length);
  assert.deepEqual(progress.blockedStepIds, [contact.id]);
  assert.equal(progress.readyToPublish, false);
  assert.equal(progress.askable, steps.flatMap((s) => s.checkKeys).length);
  assert.equal(progress.answered, progress.askable - contact.checkKeys.length);
});

test("a draft is ready only when nothing essential is missing and nothing contradicts", () => {
  const steps = studioSteps("office");
  const filled = allChecksIn(steps, "present");
  assert.equal(studioProgress(steps, qualityFrom(filled)).readyToPublish, true);
  assert.equal(studioProgress(steps, qualityFrom(filled, [CONTRADICTION])).readyToPublish, false);
});

test("resume returns the first blocked step, then the first unfinished one, then review", () => {
  const steps = studioSteps("office");
  const deal = stepOf(steps, "deal");
  const contact = stepOf(steps, "contact");

  const blocked = qualityFrom([
    ...allChecksIn(steps.filter((s) => s.id !== deal.id && s.id !== contact.id), "present"),
    ...allChecksIn([deal], "missing", "essential"),
    ...allChecksIn([contact], "missing", "essential"),
  ]);
  assert.equal(resumeStepId(steps, blocked), deal.id, "the earliest blocked step wins");

  const unfinished = qualityFrom([
    ...allChecksIn(steps.filter((s) => s.id !== contact.id), "present"),
    ...allChecksIn([contact], "missing"),
  ]);
  assert.equal(resumeStepId(steps, unfinished), contact.id);

  assert.equal(resumeStepId(steps, qualityFrom(allChecksIn(steps, "present"))), "review");
});

test("every step states its title and purpose in both locales", () => {
  for (const assetType of TYPES) {
    for (const step of studioSteps(assetType)) {
      for (const text of [step.title_en, step.title_ar, step.purpose_en, step.purpose_ar]) {
        assert.ok(text.trim().length > 0, `${assetType} ${step.id}`);
        assert.ok(!/\u2014/.test(text), `${assetType} ${step.id} em dash`);
        assert.ok(!/[٠-٩]/.test(text), `${assetType} ${step.id} eastern numerals`);
      }
      assert.notEqual(step.title_en, step.title_ar, `${assetType} ${step.id}`);
      assert.notEqual(step.purpose_en, step.purpose_ar, `${assetType} ${step.id}`);
      assert.ok(/[؀-ۿ]/.test(step.title_ar), `${assetType} ${step.id} title_ar is not Arabic`);
      assert.ok(/[؀-ۿ]/.test(step.purpose_ar), `${assetType} ${step.id} purpose_ar is not Arabic`);
    }
  }
});

test("a numbered part says so in both locales, with the same numeral in each", () => {
  const split = studioSteps("warehouse").filter((s) => s.parts > 1);
  assert.ok(split.length > 1, "warehouse must have a split step for this to test anything");
  for (const step of split) {
    assert.ok(step.title_en.includes(`part ${step.part}`), step.title_en);
    assert.ok(step.title_ar.includes(String(step.part)), step.title_ar);
    assert.ok(!/[٠-٩]/.test(step.title_ar), step.title_ar);
  }
  const unsplit = studioSteps("retail").filter((s) => s.parts === 1);
  for (const step of unsplit) {
    assert.equal(step.title_en, stepKindLabel(step.kind, false), step.id);
    assert.equal(step.title_ar, stepKindLabel(step.kind, true), step.id);
  }
});

test("the studio's vocabulary never reads as verification", () => {
  const forbidden = /verif|موثّق|موثق/i;
  for (const step of studioSteps("office")) {
    for (const text of [step.title_en, step.title_ar, step.purpose_en, step.purpose_ar]) {
      assert.ok(!forbidden.test(text), `${step.id}: ${text}`);
    }
  }
});

test("the module arranges questions and never produces a colour", () => {
  const source = Object.entries(mod)
    .map(([, v]) => (typeof v === "function" ? v.toString() : JSON.stringify(v)))
    .join("\n");
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(source), "no colour literal may appear in a step model");
  assert.ok(!/\bvar\(--/.test(source));
});
