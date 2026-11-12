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
// WHY UNAVAILABLE IS AN INPUT MAP, NOT SOMETHING THIS MODULE READS ITSELF.
// Marking one photograph category or one fact as "unavailable, here is why"
// is a real and useful thing for a lister to be able to say. Under
// PKG-LISTING-CREATION-1A it lived in Studio component state only, disclosed
// as session-only rather than faked as saved
// (docs/pkg-listing-creation-1a-deferred-contracts.md item 2). Under
// PKG-LISTING-CREATION-1B it is durable: public.listing_evidence_marks is an
// append-only ledger of exactly this fact (see that migration's own header
// for why append-only), and a caller reduces its rows to a current-state map
// before calling this function. This module still does none of that reading
// or reducing itself, deliberately: it stays pure over whatever `unavailable`
// map it is given, whether that map came from Studio session state, a
// database read, or (in a test) a literal. Marking an item unavailable is an
// EXPLANATION for an outstanding requirement, never evidence that the
// requirement was met: `unavailable` stays a distinct fulfilment value, is
// never folded into `supplied` by this module or any of its summary counts,
// and no caller may treat it as satisfying a publication requirement (there
// is no publication gate in this codebase to satisfy today, and this module
// gives that future gate no way to make that mistake).
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
  /**
   * The draft's photo inventory, with no claim about which shot any photo
   * answers. Codex review of 8b9f72d: a boolean here invited exactly the
   * defect it found, `hasAnyPhoto: true` used as a deliberate false value to
   * force the "unknown" branch on a media-query failure. The real, honest
   * signal has three states: "present" (real listing_media rows exist,
   * whether or not a signed URL could be issued for them), "empty" (the
   * query succeeded and returned zero rows, a genuine fact), and "unknown"
   * (the query itself failed, or the caller has no basis to say either way).
   * Omitted defaults to "empty" for backward compatibility with callers that
   * have no photo signal to give at all.
   */
  photoInventory?: "present" | "empty" | "unknown";
  /** The draft's own attributes jsonb, to read whether a fact field is answered. */
  attributes?: Record<string, unknown>;
  /**
   * Lister declarations, item key to a reason string. Session-only under
   * PKG-LISTING-CREATION-1A; under PKG-LISTING-CREATION-1B a caller with
   * database access typically builds this via currentEvidenceMarks() below,
   * reducing the durable listing_evidence_marks ledger to its current state.
   */
  unavailable?: ReadonlyMap<string, string>;
}

function isAnswered(v: unknown): boolean {
  return v !== null && v !== undefined && v !== "";
}

/** One row of the listing_evidence_marks ledger, as a caller would select it. */
export interface EvidenceMarkRow {
  item_kind: string;
  item_key: string;
  action: string;
  reason: string | null;
  /** Human-readable timestamp only. NOT the ordering key: Postgres's
   * created_at is transaction-stable, so two rows can share a value, which
   * would make "latest" ambiguous. Kept for display/audit purposes. */
  created_at: string;
  /** The real total order: a database-generated identity value (20260902's
   * own seq column), monotonic and unique, never reused, never settable by
   * a caller. This, not created_at, decides "current state" below. */
  seq: number;
}

/**
 * Reduces an append-only listing_evidence_marks read (every row for one
 * listing, any order) to its current state: the latest action per
 * (item_kind, item_key), kept only where that latest action is
 * marked_unavailable. A cleared item, or one never marked at all, is simply
 * absent from the result, exactly as an unmarked item was under
 * PKG-LISTING-CREATION-1A's session-only Map.
 *
 * Pure and small on purpose: this table holds at most a handful of rows per
 * listing (one per guided-evidence item a lister has ever marked), so a
 * plain "latest row per key wins" reduction needs no SQL-side DISTINCT ON to
 * be simple, correct, and fast enough. Every reader of this ledger (the
 * Studio's resume path, the preview route) should call this rather than
 * keep its own copy of the reduction, the same "one truth model" reason
 * mediaStandard.ts's shot taxonomy lives in one place.
 */
export function currentEvidenceMarks(
  rows: readonly EvidenceMarkRow[],
): { item_kind: "photo" | "fact"; item_key: string; reason: string }[] {
  const latest = new Map<string, EvidenceMarkRow>();
  for (const row of [...rows].sort((a, b) => a.seq - b.seq)) {
    latest.set(`${row.item_kind}:${row.item_key}`, row);
  }
  // Exactly one action counts as currently effective. 20260905's own
  // invalidated_by_asset_change needs no separate branch here: it is
  // excluded the same way cleared already is, by not being this one
  // string, which is what makes "the latest row per item wins" a correct,
  // single definition of current state rather than one this function and
  // the trigger that appends invalidations could drift apart on.
  return Array.from(latest.values())
    .filter((r) => r.action === "marked_unavailable")
    .map((r) => ({ item_kind: r.item_kind === "fact" ? "fact" as const : "photo" as const, item_key: r.item_key, reason: r.reason ?? "" }));
}

/**
 * Whether item_key names a real, addressable evidence item for this asset
 * type: a photo shot mediaStandard.ts actually defines, or a fact field
 * assetFields.ts actually defines. Codex review: the evidence-marks route
 * previously accepted any non-empty string under 120 characters as a valid
 * item_key, which let a caller assert "this does not exist" against a shot
 * name that means nothing for the listing's real asset type (or that is
 * not a real shot or fact key at all), a ledger entry that can never be
 * meaningfully read back. The listing's asset_type must be read
 * server-side for this check, the same rule mediaCategorization.ts's own
 * isValidShotKey already holds shot_key validation to, for the same
 * reason: the caller cannot be trusted to state its own asset type.
 */
export function isValidEvidenceItemKey(assetType: string, itemKind: string, itemKey: string): boolean {
  if (itemKind === "photo") return mediaStandardFor(assetType).shots.some((s) => s.key === itemKey);
  if (itemKind === "fact") return fieldsFor(assetType).some((f) => f.key === itemKey);
  return false;
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
    // No per-shot data. A confirmed-empty inventory means every shot is
    // genuinely, knowably unmet. Any photo existing ("present"), or the
    // inventory itself being indeterminate ("unknown"), both mean this
    // specific shot's coverage cannot be determined, so it is reported as
    // unknown, never as supplied and never silently folded into "empty".
    const fulfilment: EvidenceFulfilment = (input.photoInventory ?? "empty") === "empty" ? "awaiting_evidence" : "unknown";
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
  // Codex review of 8b9f72d, with Fable's own read on the phrasing: "للإعلان"
  // ("for the advertisement") shares a root with "رخصة الإعلان" (the
  // advertising licence) already used elsewhere in this app, so it risked
  // reading as that statutory requirement rather than SAT's own listing
  // quality bar. "لجودة العرض" ("for the quality of the listing") names the
  // quality bar directly and cannot be mistaken for a licence condition.
  required_by_standard: ["Required by the SAT listing standard", "مطلوب وفق معيار سات لجودة العرض"],
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
  unavailable: ["Marked unavailable", "مُحدَّد كغير موجود"],
  unknown: ["Coverage unknown", "التغطية غير معروفة"],
};

export function evidenceFulfilmentLabel(f: EvidenceFulfilment, ar: boolean): string {
  return FULFILMENT_LABEL[f][ar ? 1 : 0];
}
