import { fieldsFor, type AssetField } from "./assetFields";
import { mediaStandardFor, type MediaShot, type ShotWeight } from "./mediaStandard";

// PKG-LISTING-CREATION-1A. The guided evidence mission: one list, per asset
// type, of every item (photograph or fact) a professional listing carries,
// each with an explicit state.
//
// THIS MODULE INVENTS NOTHING. It composes two systems that already exist and
// are already tested: mediaStandard.ts (what a listing of this type should be
// photographed showing) and assetFields.ts (what a listing of this type
// states as fact). Both were built for other surfaces (MediaBrief.tsx and the
// intake form) and neither had a six-state vocabulary, because neither needed
// one on its own. This module is the composition, not a third data source.
//
// THE SIX STATES, AND WHERE EACH ONE COMES FROM.
//
//   required_by_rule      a mediaStandard "required" shot, or an assetFields
//                         entry with required:true. Both are already server
//                         enforced elsewhere (assessMedia's minPhotos floor,
//                         listingQuality's essential weight), so calling an
//                         item "required by rule" here names a rule that is
//                         genuinely checked, not a suggestion dressed as one.
//   recommended           a mediaStandard "expected" or "optional" shot, or an
//                         assetFields entry with an expected/enriching weight.
//                         "Expected" and "optional" shots stay distinguishable
//                         through `weight` on the returned item; this module
//                         does not erase that distinction, it relabels both
//                         into the vocabulary this package was asked for.
//   conditionally_applicable  see CONDITIONS below. A small, explicit,
//                         reviewable table, not an inferred property.
//   not_applicable         the field or shot's asset type is not the chosen
//                         one (mediaStandard's EXTRA and assetFields' registry
//                         are both keyed by asset type, so "does not apply"
//                         is a lookup, never a guess).
//   unavailable            the lister has explicitly said so, this session.
//                         See WHY SESSION ONLY below.
//   awaiting_evidence      required or recommended, present in the registry
//                         for this asset type, not yet supplied, not marked
//                         unavailable. The default state for anything unmet.
//
// WHY UNAVAILABLE IS SESSION ONLY, AND WHY THAT IS DISCLOSED RATHER THAN
// HIDDEN. Marking one photograph category or one fact as "unavailable, here
// is why" is a real and useful thing for a lister to be able to say, and the
// existing schema has no column to hold it: `listing_media` has no per-shot
// key, and `listings.attributes` holds values, not the absence of a value
// with a stated reason. Persisting a lister's "unavailable" answer into an
// unrelated text field would be exactly the dishonest persistence this
// package was told not to do. So it lives in memory for the length of the
// Studio session, the UI says so plainly, and the schema this would need to
// survive a reload is written up in
// docs/pkg-listing-creation-1a-deferred-contracts.md rather than faked.
//
// CONDITIONS. A field is genuinely conditional only when another field in the
// SAME registry entry already gates it, and the gate is named here rather
// than inferred from field names. This is deliberately a short list: most of
// what a first read might call "conditional" is actually just an optional
// field (assetFields.ts's own `show_rule: "if-present"`), which already
// renders honestly as recommended-if-present without this module claiming a
// dependency that is not written down anywhere.

export type EvidenceState =
  | "required_by_rule"
  | "recommended"
  | "conditionally_applicable"
  | "not_applicable"
  | "unavailable"
  | "awaiting_evidence";

export type EvidenceKind = "photo" | "fact";

export interface EvidenceItem {
  key: string;
  kind: EvidenceKind;
  state: EvidenceState;
  /** Preserved from the source system so the finer distinction is never lost. */
  weight: ShotWeight | "field_required" | "field_optional";
  label_en: string;
  label_ar: string;
  why_en: string;
  why_ar: string;
  /** Present only when state is "conditionally_applicable". */
  conditionOn?: { key: string; label_en: string; label_ar: string };
  /** Present only when state is "unavailable", filled by the lister this session. */
  unavailableReason?: string | null;
}

/**
 * Genuinely conditional dependencies within a single asset type's registry.
 * Each entry names the gating field and the field(s) it gates. Anything not
 * listed here that merely has `show_rule: "if-present"` stays "recommended",
 * because presence-optional is not the same claim as condition-gated.
 */
const CONDITIONS: Record<string, ReadonlyArray<{ on: string; gates: readonly string[] }>> = {
  showroom: [{ on: "mezzanine", gates: ["mezzanine_area_sqm"] }],
  land: [{ on: "subdividable", gates: ["masterplan_ready"] }],
};

function conditionFor(assetType: string, fieldKey: string): { key: string; label_en: string; label_ar: string } | null {
  const rules = CONDITIONS[assetType];
  if (!rules) return null;
  const fields = fieldsFor(assetType);
  for (const rule of rules) {
    if (!rule.gates.includes(fieldKey)) continue;
    const gate = fields.find((f) => f.key === rule.on);
    if (!gate) continue;
    return { key: gate.key, label_en: gate.label_en, label_ar: gate.label_ar };
  }
  return null;
}

function shotToItem(shot: MediaShot, state: EvidenceState): EvidenceItem {
  return {
    key: shot.key,
    kind: "photo",
    state,
    weight: shot.weight,
    label_en: shot.label_en,
    label_ar: shot.label_ar,
    why_en: shot.why_en,
    why_ar: shot.why_ar,
  };
}

function fieldToItem(f: AssetField, state: EvidenceState, condition: EvidenceItem["conditionOn"] | null): EvidenceItem {
  return {
    key: f.key,
    kind: "fact",
    state,
    weight: f.required ? "field_required" : "field_optional",
    label_en: f.label_en,
    label_ar: f.label_ar,
    why_en: f.help_en ?? "",
    why_ar: f.help_ar ?? "",
    conditionOn: condition ?? undefined,
  };
}

export interface EvidenceMissionInput {
  assetType: string;
  /** Keys of photo shots already covered by at least one uploaded photo this draft holds. */
  photoShotsSupplied?: ReadonlySet<string>;
  /** Whether ANY photo has been supplied at all (used only when per-shot coverage is unknown). */
  hasAnyPhoto?: boolean;
  /** The draft's own attributes jsonb, to read whether a fact field is answered. */
  attributes?: Record<string, unknown>;
  /** Session-only lister declarations: item key to a reason string (may be empty). */
  unavailable?: ReadonlyMap<string, string>;
}

function isAnswered(v: unknown): boolean {
  return v !== null && v !== undefined && v !== "";
}

/**
 * The full mission for one asset type, given what the draft currently holds.
 *
 * Deliberately not memoised and not a class: a pure function over the
 * registry plus the draft's current values, so it can be called fresh on
 * every render without a staleness question ever arising.
 */
export function evidenceMission(input: EvidenceMissionInput): EvidenceItem[] {
  const { assetType } = input;
  const unavailable = input.unavailable ?? new Map<string, string>();
  const attrs = input.attributes ?? {};
  const items: EvidenceItem[] = [];

  const standard = mediaStandardFor(assetType);
  for (const shot of standard.shots) {
    if (unavailable.has(shot.key)) {
      items.push({ ...shotToItem(shot, "unavailable"), unavailableReason: unavailable.get(shot.key) || null });
      continue;
    }
    const supplied = input.photoShotsSupplied
      ? input.photoShotsSupplied.has(shot.key)
      : (input.hasAnyPhoto ?? false);
    // A supplied item is folded into required or recommended, matching its
    // own weight, so a caller can filter on "still owed" without a seventh
    // "done" state. An unsupplied one is awaiting_evidence, the default for
    // anything unmet, regardless of how important it is; weight (still
    // carried on the item) is what a UI sorts required-first by.
    items.push(shotToItem(shot, supplied ? (shot.weight === "required" ? "required_by_rule" : "recommended") : "awaiting_evidence"));
  }

  for (const field of fieldsFor(assetType)) {
    // Computed and sourced fields are never lister-supplied evidence; entered
    // and verified are the ones a mission item can meaningfully ask for.
    if (field.provenance === "computed" || field.provenance === "sourced") continue;
    if (unavailable.has(field.key)) {
      items.push({ ...fieldToItem(field, "unavailable", null), unavailableReason: unavailable.get(field.key) || null });
      continue;
    }
    const condition = conditionFor(assetType, field.key);
    if (condition) {
      const gateAnswered = isAnswered(attrs[condition.key]);
      const gateSaysYes = attrs[condition.key] === true || attrs[condition.key] === "yes";
      if (!gateAnswered) {
        items.push(fieldToItem(field, "conditionally_applicable", condition));
        continue;
      }
      if (!gateSaysYes) {
        items.push(fieldToItem(field, "not_applicable", condition));
        continue;
      }
      // The gate says yes: the field now behaves like an ordinary required or
      // recommended item, assessed below with everything else.
    }
    const answered = isAnswered(attrs[field.key]);
    if (answered) {
      items.push(fieldToItem(field, field.required ? "required_by_rule" : "recommended", condition));
      continue;
    }
    items.push(fieldToItem(field, "awaiting_evidence", condition));
  }

  return items;
}

/**
 * Items still owed: required or recommended, with no evidence and not marked
 * unavailable. This is the list a progressive-disclosure UI shows first.
 */
export function outstandingItems(items: readonly EvidenceItem[]): EvidenceItem[] {
  return items.filter((i) => i.state === "awaiting_evidence");
}

/** A visible completion summary: counts by state, never a fabricated single score. */
export interface EvidenceSummary {
  total: number;
  requiredOutstanding: number;
  recommendedOutstanding: number;
  unavailable: number;
  notApplicable: number;
  conditionallyApplicable: number;
  supplied: number;
}

export function evidenceSummary(items: readonly EvidenceItem[]): EvidenceSummary {
  let requiredOutstanding = 0;
  let recommendedOutstanding = 0;
  let unavailable = 0;
  let notApplicable = 0;
  let conditionallyApplicable = 0;
  let supplied = 0;
  for (const item of items) {
    if (item.state === "awaiting_evidence") {
      const isRequired = item.weight === "required" || item.weight === "field_required";
      if (isRequired) requiredOutstanding++;
      else recommendedOutstanding++;
    } else if (item.state === "unavailable") unavailable++;
    else if (item.state === "not_applicable") notApplicable++;
    else if (item.state === "conditionally_applicable") conditionallyApplicable++;
    else supplied++;
  }
  return {
    total: items.length,
    requiredOutstanding,
    recommendedOutstanding,
    unavailable,
    notApplicable,
    conditionallyApplicable,
    supplied,
  };
}

const STATE_LABEL: Record<EvidenceState, [string, string]> = {
  required_by_rule: ["Required", "مطلوب"],
  recommended: ["Recommended", "مُوصى به"],
  conditionally_applicable: ["Depends on another answer", "يعتمد على إجابة أخرى"],
  not_applicable: ["Not applicable", "لا ينطبق"],
  unavailable: ["Marked unavailable", "مُحدَّد كغير متاح"],
  awaiting_evidence: ["Still needed", "لا يزال مطلوباً"],
};

export function evidenceStateLabel(s: EvidenceState, ar: boolean): string {
  return STATE_LABEL[s][ar ? 1 : 0];
}
