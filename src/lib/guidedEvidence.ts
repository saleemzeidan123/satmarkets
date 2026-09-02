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
// intake form) and neither had a state vocabulary, because neither needed
// one on its own. This module is the composition, not a third data source.
//
// TWO ORTHOGONAL AXES, CORRECTED UNDER CODEX REVIEW OF 922780d. The first
// version of this module used one six-way EvidenceState that silently mixed
// two different questions: how IMPORTANT an item is (would a professional
// listing carry it), and whether it has been FULFILLED (has the draft
// actually got it). Collapsing them meant an item marked "required_by_rule"
// was read, everywhere downstream, as also meaning "supplied", which is
// exactly the false-positive Codex's review caught: a shot marked
// required_by_rule from a coarse any-photo-exists guess LOOKED satisfied
// when nobody had photographed it. The two axes below are now separate
// fields on every item and neither is ever collapsed back into the other.
//
//   REQUIREMENT, why this item matters:
//     required_by_standard   the SAT listing standard expects it. This is a
//                             platform authoring standard, not a REGA or
//                             other statutory requirement, and no label
//                             anywhere may read as the latter. For photo
//                             shots it names a category the standard expects
//                             a professional listing to show; the platform's
//                             own enforced check is a MINIMUM PHOTO COUNT
//                             (mediaStandard.ts's minPhotos), not a check
//                             that this exact shot exists, so the label says
//                             "required by the SAT listing standard" and
//                             never "required by rule" or anything implying
//                             a specific, individually-enforced mandate.
//     recommended             mediaStandard's "expected" or "optional" shot,
//                             or an assetFields entry with an
//                             expected/enriching weight. The two stay
//                             distinguishable through `weight`, carried on
//                             the item unchanged.
//     conditional             see CONDITIONS below: a small, explicit,
//                             reviewable table, not an inferred property.
//     not_applicable          the field or shot's asset type is not the
//                             chosen one, or a condition's gate says no.
//
//   FULFILMENT, whether the draft actually has it:
//     supplied                a real answer exists for THIS item specifically.
//                             For a fact field that means attrs[key] is
//                             answered. For a photo shot it means real,
//                             per-shot evidence exists that this exact shot
//                             was photographed; nothing in this codebase can
//                             produce that today (no shot_key column), so no
//                             caller currently reaches this branch for a
//                             photo, and none may reach it by inferring
//                             per-shot coverage from a photo COUNT.
//     awaiting_evidence       known, specifically, not to be fulfilled: a
//                             fact with no value, or every shot when the
//                             draft holds no photograph at all.
//     unavailable              the lister has explicitly said so, this
//                             session. See WHY SESSION ONLY below.
//     unknown                  fulfilment genuinely cannot be determined.
//                             This is the honest reading for a photo shot
//                             when the draft holds SOME photographs but this
//                             module has no per-shot data to say which shots
//                             they answer: one interior photograph does not
//                             prove the exterior, entrance or loading shots
//                             were taken, and this module must not guess
//                             that it does.
//
//   `fulfilment` is `null` exactly when `requirement` is `conditional` or
//   `not_applicable`: asking "is this supplied" of an item that has not yet
//   resolved whether it applies, or that does not apply at all, is a
//   category error, not an unmet fulfilment.
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
// Marking an item unavailable is an EXPLANATION for an outstanding
// requirement, never evidence that the requirement was met: `unavailable`
// stays a distinct fulfilment value, is never folded into `supplied` by
// this module or any of its summary counts, and no caller may treat it as
// satisfying a publication requirement (there is no publication gate in
// this codebase to satisfy today, and this module gives that future gate no
// way to make that mistake).
//
// CONDITIONS. A field is genuinely conditional only when another field in the
// SAME registry entry already gates it, and the gate is named here rather
// than inferred from field names. This is deliberately a short list; most of
// what a first read might call "conditional" is actually just an optional
// field (assetFields.ts's own `show_rule: "if-present"`), which already
// renders honestly as recommended-if-present without this module claiming a
// dependency that is not written down anywhere.

export type EvidenceRequirement = "required_by_standard" | "recommended" | "conditional" | "not_applicable";
export type EvidenceFulfilment = "supplied" | "awaiting_evidence" | "unavailable" | "unknown";
export type EvidenceKind = "photo" | "fact";

export interface EvidenceItem {
  key: string;
  kind: EvidenceKind;
  requirement: EvidenceRequirement;
  /** Null exactly when requirement is "conditional" or "not_applicable". */
  fulfilment: EvidenceFulfilment | null;
  /** Preserved from the source system so the finer distinction is never lost. */
  weight: ShotWeight | "field_required" | "field_optional";
  label_en: string;
  label_ar: string;
  why_en: string;
  why_ar: string;
  /** Present only when requirement is "conditional". */
  conditionOn?: { key: string; label_en: string; label_ar: string };
  /** Present only when fulfilment is "unavailable", filled by the lister this session. */
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

function shotToItem(shot: MediaShot, requirement: EvidenceRequirement, fulfilment: EvidenceFulfilment | null): EvidenceItem {
  return {
    key: shot.key,
    kind: "photo",
    requirement,
    fulfilment,
    weight: shot.weight,
    label_en: shot.label_en,
    label_ar: shot.label_ar,
    why_en: shot.why_en,
    why_ar: shot.why_ar,
  };
}

function fieldToItem(
  f: AssetField,
  requirement: EvidenceRequirement,
  fulfilment: EvidenceFulfilment | null,
  condition: EvidenceItem["conditionOn"] | null,
): EvidenceItem {
  return {
    key: f.key,
    kind: "fact",
    requirement,
    fulfilment,
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
  /**
   * Keys of photo shots this module can PROVE are covered, from real
   * per-shot data. No caller in this codebase populates this today (no
   * shot_key column exists to read it from); it exists so a future
   * in-session Studio association (per shot, per this visit, explicitly
   * not persisted) has somewhere honest to report through, without this
   * module ever inferring it from a photo count.
   */
  photoShotsSupplied?: ReadonlySet<string>;
  /** Whether ANY photograph has been supplied at all, with no claim about which shot it answers. */
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
    const requirement: EvidenceRequirement = shot.weight === "required" ? "required_by_standard" : "recommended";
    if (unavailable.has(shot.key)) {
      items.push({ ...shotToItem(shot, requirement, "unavailable"), unavailableReason: unavailable.get(shot.key) || null });
      continue;
    }
    // Real per-shot proof, when a caller ever has it: the only path that may
    // ever report "supplied" for a photo shot.
    if (input.photoShotsSupplied) {
      items.push(shotToItem(shot, requirement, input.photoShotsSupplied.has(shot.key) ? "supplied" : "awaiting_evidence"));
      continue;
    }
    // No per-shot data. Zero photographs anywhere means every shot is
    // genuinely, knowably unmet. Any photograph existing at all means this
    // specific shot's coverage cannot be determined from a count, so it is
    // reported as unknown, never as supplied.
    const fulfilment: EvidenceFulfilment = input.hasAnyPhoto ? "unknown" : "awaiting_evidence";
    items.push(shotToItem(shot, requirement, fulfilment));
  }

  for (const field of fieldsFor(assetType)) {
    // Computed and sourced fields are never lister-supplied evidence; entered
    // and verified are the ones a mission item can meaningfully ask for.
    if (field.provenance === "computed" || field.provenance === "sourced") continue;
    const requirement: EvidenceRequirement = field.required ? "required_by_standard" : "recommended";
    if (unavailable.has(field.key)) {
      items.push({ ...fieldToItem(field, requirement, "unavailable", null), unavailableReason: unavailable.get(field.key) || null });
      continue;
    }
    const condition = conditionFor(assetType, field.key);
    if (condition) {
      const gateAnswered = isAnswered(attrs[condition.key]);
      const gateSaysYes = attrs[condition.key] === true || attrs[condition.key] === "yes";
      if (!gateAnswered) {
        items.push(fieldToItem(field, "conditional", null, condition));
        continue;
      }
      if (!gateSaysYes) {
        items.push(fieldToItem(field, "not_applicable", null, condition));
        continue;
      }
      // The gate says yes: the field now behaves like an ordinary required or
      // recommended item, assessed below with everything else, and its
      // fulfilment is real (attrs[field.key] is directly checkable), so the
      // requirement label is the field's own, not "conditional".
      items.push(fieldToItem(field, requirement, isAnswered(attrs[field.key]) ? "supplied" : "awaiting_evidence", condition));
      continue;
    }
    items.push(fieldToItem(field, requirement, isAnswered(attrs[field.key]) ? "supplied" : "awaiting_evidence", null));
  }

  return items;
}

/**
 * Items still owed with certainty: required or recommended, known not to be
 * fulfilled, and not marked unavailable. Excludes "unknown": an item this
 * module cannot verify is a different claim from one it can prove is
 * missing, and a caller that wants both must ask for both explicitly (see
 * unknownCoverageItems).
 */
export function outstandingItems(items: readonly EvidenceItem[]): EvidenceItem[] {
  return items.filter((i) => i.fulfilment === "awaiting_evidence");
}

/** Items this module cannot determine the fulfilment of: real attention, distinct from proven-missing. */
export function unknownCoverageItems(items: readonly EvidenceItem[]): EvidenceItem[] {
  return items.filter((i) => i.fulfilment === "unknown");
}

/** A visible completion summary: counts by requirement and fulfilment, never a fabricated single score. */
export interface EvidenceSummary {
  total: number;
  requiredOutstanding: number;
  recommendedOutstanding: number;
  requiredUnknownCoverage: number;
  recommendedUnknownCoverage: number;
  unavailable: number;
  notApplicable: number;
  conditional: number;
  supplied: number;
}

export function evidenceSummary(items: readonly EvidenceItem[]): EvidenceSummary {
  let requiredOutstanding = 0;
  let recommendedOutstanding = 0;
  let requiredUnknownCoverage = 0;
  let recommendedUnknownCoverage = 0;
  let unavailable = 0;
  let notApplicable = 0;
  let conditional = 0;
  let supplied = 0;
  for (const item of items) {
    const isRequired = item.requirement === "required_by_standard";
    if (item.fulfilment === "awaiting_evidence") {
      if (isRequired) requiredOutstanding++;
      else recommendedOutstanding++;
    } else if (item.fulfilment === "unknown") {
      if (isRequired) requiredUnknownCoverage++;
      else recommendedUnknownCoverage++;
    } else if (item.fulfilment === "unavailable") unavailable++;
    else if (item.requirement === "not_applicable") notApplicable++;
    else if (item.requirement === "conditional") conditional++;
    else if (item.fulfilment === "supplied") supplied++;
  }
  return {
    total: items.length,
    requiredOutstanding,
    recommendedOutstanding,
    requiredUnknownCoverage,
    recommendedUnknownCoverage,
    unavailable,
    notApplicable,
    conditional,
    supplied,
  };
}

const REQUIREMENT_LABEL: Record<EvidenceRequirement, [string, string]> = {
  required_by_standard: ["Required by the SAT listing standard", "مطلوب وفق معايير سات للإعلان"],
  recommended: ["Recommended", "مُوصى به"],
  conditional: ["Depends on another answer", "يعتمد على إجابة أخرى"],
  not_applicable: ["Not applicable", "لا ينطبق"],
};

export function evidenceRequirementLabel(r: EvidenceRequirement, ar: boolean): string {
  return REQUIREMENT_LABEL[r][ar ? 1 : 0];
}

const FULFILMENT_LABEL: Record<EvidenceFulfilment, [string, string]> = {
  supplied: ["Supplied", "مُقدَّم"],
  awaiting_evidence: ["Still needed", "لا يزال مطلوباً"],
  unavailable: ["Marked unavailable", "مُحدَّد كغير متاح"],
  unknown: ["Coverage unknown", "التغطية غير معروفة"],
};

export function evidenceFulfilmentLabel(f: EvidenceFulfilment, ar: boolean): string {
  return FULFILMENT_LABEL[f][ar ? 1 : 0];
}
