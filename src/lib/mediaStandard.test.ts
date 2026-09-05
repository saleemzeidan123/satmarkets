import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mediaStandardFor,
  assessMedia,
  shotWeightLabel,
  MEDIA_ASSET_TYPES,
  MEDIA_TRANSFORMS,
  isPermittedMediaTransform,
  mediaIntegrityFaults,
  mediaPublishable,
  type MediaShot,
  type MediaDerivation,
} from "./mediaStandard";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

// Codex review round 2, item 12 (Fable evidence review). Of the eleven
// shots this package added, three (fire_protection, service_block,
// fire_safety) have a real, checked regulatory citation
// (docs/pkg-listing-creation-1b-migration-runbook.md section 14); the other
// eight are market convention or SAT's own standard, and must never claim
// otherwise. This test exists because one of the eight, compound_perimeter,
// was found doing exactly that (calling itself a "licensing question" with
// no citation anywhere) by this same review round; it is the regression
// guard for that specific class of bug, not a general style check, which is
// why it is scoped to this package's own eleven additions rather than to
// every shot mediaStandard.ts has ever defined (an older shot, unrelated to
// this package, was found carrying the same pattern during the same
// review and is tracked separately, not fixed or asserted on here).
const REGULATION_DERIVED_SHOTS = new Set(["fire_protection", "service_block", "fire_safety"]);
const PKG_1B_ADDED_SHOTS = new Set([
  "fnb_services", "outdoor_seating", "mezzanine",
  "fire_protection", "service_block", "ancillary_units",
  "sections_separate", "bride_suite",
  "fire_safety", "compound_perimeter", "utilities_provision",
]);
const REGULATION_LANGUAGE = [/licens/i, /regulation/i, /mandat/i, /required by/i, /statut/i, /ترخيص/, /نظام/, /لائحة/, /قانون/, /إلزام/];

test("media standard: the eight market-convention shots added this package never claim a regulatory basis", () => {
  const seen = new Map<string, MediaShot>();
  for (const t of KNOWN) for (const s of mediaStandardFor(t).shots) if (PKG_1B_ADDED_SHOTS.has(s.key)) seen.set(s.key, s);
  assert.equal(seen.size, PKG_1B_ADDED_SHOTS.size, `expected to find all ${PKG_1B_ADDED_SHOTS.size} shots; found ${seen.size} (${[...seen.keys()].join(", ")}). A renamed or removed key means this test's own list is stale.`);
  for (const [key, s] of seen) {
    if (REGULATION_DERIVED_SHOTS.has(key)) continue; // these three ARE regulation-derived and may say so
    for (const re of REGULATION_LANGUAGE) {
      assert.doesNotMatch(s.why_en, re, `${key}'s why_en matches ${re}: a market-convention shot must not claim a regulatory/legal basis it has no citation for`);
      assert.doesNotMatch(s.why_ar, re, `${key}'s why_ar matches ${re}: a market-convention shot must not claim a regulatory/legal basis it has no citation for`);
    }
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

// ---------------------------------------------------------------------------
// Law 8, property media integrity (Codex ADV-1C boundary 9)
// ---------------------------------------------------------------------------
//
// The law lives in `docs/LAWS.md` and its enumeration lives in the module. Two
// statements of one rule drift, so these tests hold them together: the document
// cannot lose the law without failing, and the module cannot quietly permit
// something the document forbids.

const LAWS = readFileSync(join(process.cwd(), "docs", "LAWS.md"), "utf8");

const LAW_8 =
  "AI must never alter media in a way that changes the\n   apparent physical reality, condition, dimensions, finishes, fixtures, views,\n   access, defects or surroundings of a property. Originals must be preserved.\n   Any permitted enhancement must be non-deceptive and traceable.";

test("law 8: the register still carries the media integrity law in the words it was given", () => {
  assert.ok(LAWS.includes(LAW_8), "Law 8 is missing or reworded in docs/LAWS.md");
  assert.match(LAWS, /^8\. Property media integrity\./m, "Law 8 lost its place in the numbered register");
});

test("law 8: every reality-altering transformation is forbidden by name", () => {
  const MUST_BE_FORBIDDEN = [
    "object_removal",
    "object_insertion",
    "sky_replacement",
    "relight",
    "generative_fill",
    "generative_upscale",
    "geometry_change",
    "virtual_staging",
  ] as const;
  for (const t of MUST_BE_FORBIDDEN) {
    assert.equal(MEDIA_TRANSFORMS[t].permitted, false, `${t} is permitted, and it changes the property`);
    assert.equal(isPermittedMediaTransform(t), false, t);
  }
});

test("law 8: an unrecognised transformation is forbidden rather than unrecognised", () => {
  // The direction of the list is the protection. A capability that did not
  // exist when this was written must be ruled on before it can be used.
  for (const t of ["", "enhance", "auto_magic", "restyle", "OBJECT_REMOVAL", "reframe_2027"]) {
    assert.equal(isPermittedMediaTransform(t), false, `${t} passed without a ruling`);
  }
});

test("law 8: every rule carries a substantive reason, so a change of mind is visible", () => {
  for (const [k, rule] of Object.entries(MEDIA_TRANSFORMS)) {
    assert.ok(rule.reason.length > 60, `${k} has a reason too thin to review`);
    assert.doesNotMatch(rule.reason, /\u2014/, `em dash in the reason for ${k}`);
  }
});

test("law 8: the permitted set changes no fact about the property", () => {
  const permitted = Object.entries(MEDIA_TRANSFORMS)
    .filter(([, r]) => r.permitted)
    .map(([k]) => k)
    .sort();
  assert.deepEqual(permitted, [
    "downscale",
    "exposure",
    "format_convert",
    "lens_correction",
    "noise_reduction",
    "straighten",
    "white_balance",
  ]);
});

const TRACED: MediaDerivation = {
  originalRef: "media/original/abc.jpg",
  transforms: ["exposure", "downscale"],
  appliedBy: "listing-studio/pipeline@1",
  appliedAt: "2026-07-30T09:00:00Z",
};

test("law 8: an untouched original commits no fault and needs no derivation record", () => {
  const untouched: MediaDerivation = {
    originalRef: null,
    transforms: [],
    appliedBy: null,
    appliedAt: null,
  };
  assert.deepEqual(mediaIntegrityFaults(untouched), []);
  assert.equal(mediaPublishable(untouched), true);
});

test("law 8: a derived file that loses its original is not publishable", () => {
  assert.deepEqual(mediaIntegrityFaults({ ...TRACED, originalRef: null }), ["original_not_preserved"]);
  assert.equal(mediaPublishable({ ...TRACED, originalRef: null }), false);
});

test("law 8: an untraceable enhancement is treated as a forbidden one", () => {
  assert.deepEqual(mediaIntegrityFaults({ ...TRACED, appliedBy: null }), ["untraceable"]);
  assert.deepEqual(mediaIntegrityFaults({ ...TRACED, appliedAt: null }), ["untraceable"]);
  assert.equal(mediaPublishable({ ...TRACED, appliedAt: null }), false);
});

test("law 8: one forbidden transformation condemns the whole derivation", () => {
  const d = { ...TRACED, transforms: ["exposure", "object_removal", "downscale"] };
  assert.deepEqual(mediaIntegrityFaults(d), ["forbidden_transform"]);
  assert.equal(mediaPublishable(d), false);
});

test("law 8: every fault is reported, not only the first", () => {
  const d: MediaDerivation = {
    originalRef: null,
    transforms: ["generative_fill"],
    appliedBy: null,
    appliedAt: null,
  };
  assert.deepEqual(mediaIntegrityFaults(d), [
    "original_not_preserved",
    "forbidden_transform",
    "untraceable",
  ]);
});

test("law 8: a fully traced, permitted derivation is publishable", () => {
  assert.deepEqual(mediaIntegrityFaults(TRACED), []);
  assert.equal(mediaPublishable(TRACED), true);
});

// PKG-LISTING-CREATION-1B outcome D. media/route.ts's own unconditional
// pipeline (rotate to apply EXIF orientation, resize, re-encode to webp)
// writes exactly this literal transform pair as every upload's
// derived_transforms. This is the first real call site for the machinery
// above; if a future change to that pipeline adds a transform not on
// mediaStandard.ts's allow list, this is the test that catches it, rather
// than the defect surfacing as a suddenly-unpublishable photo in production.
test("law 8: the upload route's own derivation record is publishable by construction", () => {
  const uploadPipelineDerivation: MediaDerivation = {
    originalRef: "acct/listing/originals/file.jpg",
    transforms: ["downscale", "format_convert"],
    appliedBy: "system:upload-pipeline",
    appliedAt: "2026-09-04T00:00:00Z",
  };
  assert.deepEqual(mediaIntegrityFaults(uploadPipelineDerivation), []);
  assert.equal(mediaPublishable(uploadPipelineDerivation), true);
});
