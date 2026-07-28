// The Listing Studio's step model.
//
// One asset type in, an ordered list of short steps out, each step owning a
// named set of facts and nothing else. The model is pure: it holds no state,
// writes nothing, and knows nothing about React or the database, so the same
// list drives the intake surface, the edit surface, the resume banner and the
// progress meter without any of them inventing their own ordering.
//
// Three properties this is built to hold:
//
// 1. Every fact a lister can supply lives on exactly one step. A fact on two
//    steps is a fact the lister answers twice and the platform stores once,
//    and a fact on no step is a fact nobody is ever asked for. The test
//    partitions both the platform facts and the asset's registry fields.
// 2. A step asks only for facts of its own subject (./factScope). The step
//    that asks about the building never smuggles in a rent, and the step that
//    asks about the offer never smuggles in a ceiling height.
// 3. A fact the lister cannot know is never asked. Facts about the
//    surroundings come from a licensed source and are omitted from the steps
//    entirely rather than presented as a blank a person is expected to fill.
//
// Progress and resume both read ./listingQuality, so "what is missing" has one
// definition on this surface and on every public surface. The Studio never
// computes its own completeness.

import { intakeFields, type AssetField } from "./assetFields";
import { PLATFORM_FACT_SCOPE, factScope, type FactScope } from "./factScope";
import { PLATFORM_OWNED_FIELD_KEYS } from "./listingQuality";
import type { ListingQuality, QualityCheck } from "./listingQuality";

export type StudioStepKind =
  | "asset" | "identity" | "property" | "space" | "deal"
  | "compliance" | "media" | "location" | "contact" | "review";

// Short steps are the point. A step longer than this is split into numbered
// parts rather than scrolled, because a lister abandons a long form and
// finishes a short one, and a saved partial listing is worth more to a buyer
// than an abandoned complete one.
export const STEP_MAX_FIELDS = 8;

export interface StudioStep {
  id: string;
  kind: StudioStepKind;
  part: number;          // 1 unless the step was split
  parts: number;         // how many parts this kind has in total
  index: number;         // 1 based position in the returned list
  title_en: string;
  title_ar: string;
  purpose_en: string;
  purpose_ar: string;
  fields: AssetField[];  // registry fields captured here, in registry order
  platformKeys: string[]; // platform facts captured here
  // The completeness checks this step answers. Every key here exists in the
  // model. The asking rent rate and the sale price are asked for on the terms
  // step and counted by the platform price check rather than by a check of their
  // own, so they appear in `fields` and not here: a step that claimed a check the
  // model never emits would carry a denominator it can never fill.
  checkKeys: string[];
}

// The platform facts each step owns. Together these are exactly the keys of
// PLATFORM_FACT_SCOPE, which the test asserts, so a new platform check cannot
// be added to the completeness model without being given a step to live on.
const PLATFORM_BY_KIND: Partial<Record<StudioStepKind, string[]>> = {
  identity: ["title_en", "title_ar", "description_en", "description_ar"],
  space: ["area_sqm"],
  deal: ["price", "availability_confirmed"],
  compliance: ["ad_permit", "permit_expiry", "right_to_market", "documents"],
  media: ["photos", "photo_set", "floorplan", "video"],
  location: ["coordinates", "district", "building"],
  contact: ["contact"],
};

// The order a lister meets the steps in. Asset type first because it decides
// which fields every later step contains. Media before location because a
// lister with photographs to hand should not be stopped by a map. Review last,
// and it asks for nothing.
const KIND_ORDER: StudioStepKind[] = [
  "asset", "identity", "property", "space", "deal", "compliance", "media", "location", "contact", "review",
];

// The registry scope each field-bearing step draws from. Kinds absent here
// carry platform facts only.
const SCOPE_BY_KIND: Partial<Record<StudioStepKind, FactScope>> = {
  property: "property",
  space: "space",
  deal: "deal",
  compliance: "compliance",
};

function titleOf(kind: StudioStepKind, ar: boolean): string {
  switch (kind) {
    case "asset": return ar ? "نوع الأصل والعرض" : "Asset and offer type";
    case "identity": return ar ? "التعريف بالعرض" : "What you are offering";
    case "property": return ar ? "العقار" : "The property";
    case "space": return ar ? "المساحة المعروضة" : "The offered space";
    case "deal": return ar ? "شروط العرض" : "The terms";
    case "compliance": return ar ? "الترخيص والمستندات" : "Licence and documents";
    case "media": return ar ? "الصور والمخططات" : "Photographs and plans";
    case "location": return ar ? "الموقع" : "Location";
    case "contact": return ar ? "طريقة التواصل" : "How viewers reach you";
    case "review": return ar ? "المراجعة والنشر" : "Review and publish";
  }
}

function purposeOf(kind: StudioStepKind, ar: boolean): string {
  switch (kind) {
    case "asset":
      return ar
        ? "يحدّد هذا الاختيار الحقول المطلوبة في الخطوات التالية."
        : "This choice decides which facts the later steps ask for.";
    case "identity":
      return ar
        ? "العنوان والوصف بالعربية والإنجليزية، كما سيقرأهما الباحث."
        : "The title and description in both languages, as a searcher will read them.";
    case "property":
      return ar
        ? "حقائق عن المبنى أو الأرض ككل، تبقى صحيحة مع أي عرض لاحق."
        : "Facts about the building or plot as a whole, still true of the next offer over it.";
    case "space":
      return ar
        ? "حقائق عن هذه المساحة وحدها."
        : "Facts about this space alone.";
    case "deal":
      return ar
        ? "السعر والمدة وما يشمله العرض. تتغيّر هذه مع تغيّر العرض دون أن يتغيّر العقار."
        : "Price, term and what the offer includes. These change with the offer while the property does not.";
    case "compliance":
      return ar
        ? "رقم الترخيص الإعلاني وتاريخ انتهائه والمستندات المؤيدة."
        : "The advertising licence, its expiry date and the documents behind it.";
    case "media":
      return ar
        ? "الصور والمخططات والفيديو. العرض بلا صور يُقرأ ناقصاً."
        : "Photographs, floor plans and video. An offer without photographs reads as incomplete.";
    case "location":
      return ar
        ? "الإحداثيات والحي والمبنى، حتى يظهر العرض في البحث بالخريطة."
        : "Coordinates, district and building, so the offer appears in a map search.";
    case "contact":
      return ar
        ? "كيف يصل إليك الباحث الجاد."
        : "How a serious viewer reaches you.";
    case "review":
      return ar
        ? "ما زال ناقصاً، ثم المعاينة كما سيراها الزائر بالعربية والإنجليزية."
        : "What is still missing, then the preview exactly as a visitor will see it in both languages.";
  }
}

/** The registry fields a lister is asked for, in registry order. */
export function studioFields(assetType: string): AssetField[] {
  return intakeFields(assetType).filter((f) => f.available !== false && f.show_rule !== "hidden");
}

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function partSuffix(part: number, parts: number, ar: boolean): string {
  if (parts <= 1) return "";
  return ar ? `، الجزء ${part}` : `, part ${part}`;
}

/**
 * The steps for one asset type, in order. Deterministic: the same asset type
 * always returns the same list, because a resume point that moved between
 * renders would send a lister back to a step they finished.
 */
export function studioSteps(assetType: string): StudioStep[] {
  const fields = studioFields(assetType);
  const steps: StudioStep[] = [];

  for (const kind of KIND_ORDER) {
    const scope = SCOPE_BY_KIND[kind];
    const platformKeys = PLATFORM_BY_KIND[kind] ?? [];
    const owned = scope ? fields.filter((f) => factScope(assetType, f.key) === scope) : [];
    const groups = chunk(owned, STEP_MAX_FIELDS);

    // A step with no fields and no platform facts is dropped, except the two
    // that exist to frame the work rather than to collect anything.
    if (groups.length === 0 && platformKeys.length === 0 && kind !== "asset" && kind !== "review") continue;

    const parts = Math.max(groups.length, 1);
    for (let part = 1; part <= parts; part += 1) {
      const group = groups[part - 1] ?? [];
      // Platform facts ride on the first part of their kind, so a lister meets
      // the price once even when the terms run to two pages.
      const keys = part === 1 ? platformKeys : [];
      steps.push({
        id: parts > 1 ? `${kind}-${part}` : kind,
        kind,
        part,
        parts,
        index: steps.length + 1,
        title_en: titleOf(kind, false) + partSuffix(part, parts, false),
        title_ar: titleOf(kind, true) + partSuffix(part, parts, true),
        purpose_en: purposeOf(kind, false),
        purpose_ar: purposeOf(kind, true),
        fields: group,
        platformKeys: keys,
        checkKeys: [
          ...keys,
          ...group
            .filter((f) => !PLATFORM_OWNED_FIELD_KEYS.has(f.key))
            .map((f) => `field:${f.key}`),
        ],
      });
    }
  }

  return steps.map((s, i) => ({ ...s, index: i + 1 }));
}

export type StepState = "empty" | "partial" | "complete" | "blocked";

export interface StepProgress {
  stepId: string;
  state: StepState;
  answered: number;
  askable: number;
  missingEssential: QualityCheck[];
  missingOther: QualityCheck[];
}

/**
 * What one step still needs, read from the completeness model rather than
 * recomputed. `blocked` means an essential fact is missing, which is the only
 * state that holds publication, and it is never reported as complete however
 * many of the step's other facts are supplied.
 *
 * A check the step owns but the model marks not applicable leaves the
 * denominator, the same rule the score uses, so a step whose external source
 * is unwired cannot read as a lister's omission.
 */
export function stepProgress(step: StudioStep, quality: ListingQuality): StepProgress {
  const owned = new Set(step.checkKeys);
  const checks = quality.checks.filter((c) => owned.has(c.key));
  const askable = checks.filter((c) => c.state !== "not_applicable");
  const answered = askable.filter((c) => c.state === "present").length;
  const missing = askable.filter((c) => c.state === "missing");
  const missingEssential = missing.filter((c) => c.weight === "essential");
  const missingOther = missing.filter((c) => c.weight !== "essential");

  let state: StepState;
  if (missingEssential.length > 0) state = "blocked";
  else if (missing.length === 0) state = "complete";
  else if (answered === 0) state = "empty";
  else state = "partial";

  return { stepId: step.id, state, answered, askable: askable.length, missingEssential, missingOther };
}

export interface StudioProgress {
  steps: StepProgress[];
  answered: number;
  askable: number;
  blockedStepIds: string[];
  readyToPublish: boolean;
}

/**
 * The whole draft, step by step. `readyToPublish` is false while any essential
 * fact is missing or any contradiction stands, and it is not a permission to
 * publish: ./gate.ts decides that, and this only reports that the lister's own
 * side of the work is done.
 */
export function studioProgress(steps: StudioStep[], quality: ListingQuality): StudioProgress {
  const per = steps.map((s) => stepProgress(s, quality));
  const answered = per.reduce((n, p) => n + p.answered, 0);
  const askable = per.reduce((n, p) => n + p.askable, 0);
  const blockedStepIds = per.filter((p) => p.state === "blocked").map((p) => p.stepId);
  return {
    steps: per,
    answered,
    askable,
    blockedStepIds,
    readyToPublish: blockedStepIds.length === 0 && quality.contradictions.length === 0,
  };
}

/**
 * Where a returning lister resumes: the first step still holding publication,
 * else the first step with anything left to add, else the review step. Resume
 * never sends someone back past work they finished.
 */
export function resumeStepId(steps: StudioStep[], quality: ListingQuality): string {
  const per = steps.map((s) => stepProgress(s, quality));
  const blocked = per.find((p) => p.state === "blocked");
  if (blocked) return blocked.stepId;
  const unfinished = per.find((p) => p.state === "partial" || p.state === "empty");
  if (unfinished) return unfinished.stepId;
  const review = steps.find((s) => s.kind === "review");
  return review ? review.id : steps[steps.length - 1].id;
}

export function stepKindLabel(kind: StudioStepKind, ar: boolean): string {
  return titleOf(kind, ar);
}
