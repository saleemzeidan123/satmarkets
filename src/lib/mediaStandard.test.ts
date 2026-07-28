import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mediaStandardFor,
  assessMedia,
  shotWeightLabel,
  MEDIA_ASSET_TYPES,
  type MediaShot,
} from "./mediaStandard";
import { PHOTO_SET_MIN } from "./listingQuality";
import { planTypesFor } from "./planTypes";

// ADV-2E. The media standard says what a listing of a given asset type should show,
// and reports only on the three things the record actually holds. These tests hold
// that line: the brief may never turn into a claim about image content, and the
// status may never count something nobody recorded.

const KNOWN = [
  "office",
  "serviced",
  "retail",
  "showroom",
  "medical",
  "warehouse",
  "self_storage",
  "education",
  "hospitality",
  "land",
  "mixed_use",
  "gas_station",
  "wedding_hall",
  "worker_housing",
  "entertainment",
];

test("media standard: every asset type in the plan taxonomy carries a specific brief", () => {
  for (const t of KNOWN) {
    assert.ok(MEDIA_ASSET_TYPES.includes(t), `${t} has no asset specific shots`);
    const std = mediaStandardFor(t);
    // A brief that is only the base set has not said anything about this asset type.
    assert.ok(std.shots.length > 6, `${t} adds nothing beyond the base brief`);
  }
  // And nothing in the brief is for a type the plan taxonomy has never heard of.
  for (const t of MEDIA_ASSET_TYPES) assert.ok(KNOWN.includes(t), `${t} is not a known asset type`);
});

test("media standard: shot keys are unique within a standard", () => {
  for (const t of KNOWN) {
    const keys = mediaStandardFor(t).shots.map((s) => s.key);
    assert.equal(new Set(keys).size, keys.length, `${t} repeats a shot key`);
  }
});

test("media standard: every shot is bilingual and states its reason in both languages", () => {
  const seen = new Set<MediaShot>();
  for (const t of KNOWN) for (const s of mediaStandardFor(t).shots) seen.add(s);
  assert.ok(seen.size > 20);
  for (const s of seen) {
    for (const v of [s.label_en, s.label_ar, s.why_en, s.why_ar]) {
      assert.ok(typeof v === "string" && v.trim().length > 0, `${s.key} has an empty string`);
    }
    // Arabic strings must actually be Arabic, not an English string copied across.
    assert.match(s.label_ar, /\p{Script=Arabic}/u, `${s.key} label_ar is not Arabic`);
    assert.match(s.why_ar, /\p{Script=Arabic}/u, `${s.key} why_ar is not Arabic`);
  }
});

test("media standard: the brief raises the photograph minimum and never lowers it", () => {
  for (const t of KNOWN) {
    const std = mediaStandardFor(t);
    const required = std.shots.filter((s) => s.weight === "required").length;
    assert.ok(std.minPhotos >= PHOTO_SET_MIN, `${t} floor is below the generic minimum`);
    assert.ok(std.minPhotos >= required, `${t} cannot show every required view`);
  }
});

test("media standard: the plan expectation comes from the shared taxonomy, not a second opinion", () => {
  for (const t of [...KNOWN, "not_a_real_type"]) {
    const std = mediaStandardFor(t);
    const plans = planTypesFor(t);
    assert.equal(std.planType, plans.def);
    assert.deepEqual(std.planAllowed, plans.allowed);
  }
});

test("media standard: an unknown asset type gets the base brief, not an invented one", () => {
  const std = mediaStandardFor("something_nobody_configured");
  assert.equal(std.shots.length, 6);
  assert.equal(std.minPhotos, Math.max(PHOTO_SET_MIN, 4));
});

test("assess: the plan type check only arises once a plan exists", () => {
  const none = assessMedia("warehouse", { photos: 0, planTypes: [], video: false });
  assert.equal(none.requirements.some((r) => r.key === "plan_type"), false);
  // The gap is reported once, under one name.
  assert.equal(none.outstanding.filter((r) => r.key === "plan" || r.key === "plan_type").length, 1);

  const some = assessMedia("warehouse", { photos: 0, planTypes: ["site"], video: false });
  assert.equal(some.requirements.some((r) => r.key === "plan_type"), true);
  assert.equal(some.requirements.find((r) => r.key === "plan_type")?.met, true);
});

test("assess: a plan whose type was never recorded counts as a plan and not as the right one", () => {
  const s = assessMedia("office", { photos: 0, planTypes: [null], video: false });
  assert.equal(s.requirements.find((r) => r.key === "plan")?.met, true);
  assert.equal(s.requirements.find((r) => r.key === "plan_type")?.met, false);
});

test("assess: a plan of a type this asset does not use is reported as such", () => {
  // A survey (كروكي) is a land plan; an office is not shown by one.
  const s = assessMedia("office", { photos: 0, planTypes: ["survey"], video: false });
  assert.equal(s.requirements.find((r) => r.key === "plan_type")?.met, false);
  const ok = assessMedia("land", { photos: 0, planTypes: ["survey"], video: false });
  assert.equal(ok.requirements.find((r) => r.key === "plan_type")?.met, true);
});

test("assess: the photograph count is measured against this asset type's minimum", () => {
  const std = mediaStandardFor("warehouse");
  const short = assessMedia("warehouse", { photos: std.minPhotos - 1, planTypes: ["site"], video: true });
  assert.equal(short.requirements.find((r) => r.key === "photo_count")?.met, false);
  const met = assessMedia("warehouse", { photos: std.minPhotos, planTypes: ["site"], video: true });
  assert.equal(met.requirements.find((r) => r.key === "photo_count")?.met, true);
  assert.equal(met.outstanding.length, 0);
  assert.equal(met.countableComplete, true);
});

test("assess: countableComplete is false while anything countable is outstanding", () => {
  const std = mediaStandardFor("retail");
  const noVideo = assessMedia("retail", { photos: std.minPhotos, planTypes: ["unit"], video: false });
  assert.equal(noVideo.countableComplete, false);
  assert.deepEqual(noVideo.outstanding.map((r) => r.key), ["video"]);
});

test("assess: a nonsense count is read down to zero rather than trusted", () => {
  for (const n of [-5, Number.NaN, 2.7]) {
    const s = assessMedia("office", { photos: n as number, planTypes: [], video: false });
    const st = s.requirements.find((r) => r.key === "photo_count")!;
    assert.equal(st.met, false);
    assert.match(st.statement_en, /^(0|2) of /);
  }
});

test("assess: nothing emitted carries an em dash or Arabic Indic numerals", () => {
  const strings: string[] = [];
  for (const t of [...KNOWN, "unknown_type"]) {
    for (const s of mediaStandardFor(t).shots) strings.push(s.label_en, s.label_ar, s.why_en, s.why_ar);
    for (const held of [
      { photos: 0, planTypes: [], video: false },
      { photos: 99, planTypes: ["floor", null], video: true },
    ]) {
      for (const r of assessMedia(t, held).requirements) strings.push(r.statement_en, r.statement_ar);
    }
  }
  for (const a of [false, true]) {
    for (const w of ["required", "expected", "optional"] as const) strings.push(shotWeightLabel(w, a));
  }
  assert.ok(strings.length > 100);
  for (const s of strings) {
    assert.doesNotMatch(s, /\u2014/, `em dash in: ${s}`);
    assert.doesNotMatch(s, /[\u0660-\u0669]/, `Arabic Indic numeral in: ${s}`);
    // D24: quality is not verification. Nothing here may read as a check of a fact.
    assert.doesNotMatch(s, /\bverified\b/i, `verification language in: ${s}`);
  }
});

test("weight labels are distinct in both languages", () => {
  for (const ar of [false, true]) {
    const labels = (["required", "expected", "optional"] as const).map((w) => shotWeightLabel(w, ar));
    assert.equal(new Set(labels).size, 3);
    labels.forEach((l) => assert.ok(l.trim().length > 0));
  }
});
