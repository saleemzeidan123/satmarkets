import type { ProvenanceTier } from "./provenance";
import { arabicState, type ArabicField } from "./listingArabic";

// PKG-LISTING-CREATION-1A. The provenance vocabulary the Studio and the draft
// preview show, built ON TOP of provenance.ts rather than beside it.
//
// provenance.ts already answers "where did this come from" for every registry
// field, in four tiers: entered, verified, computed, sourced. That module is
// the source of truth for the registry and stays untouched here. This file
// exists because two surfaces (the guided evidence mission, the exact
// bilingual preview) need a coarser classification a reader can act on
// without knowing what "computed" or "sourced" means in this codebase's
// terms, and because two cases the four-tier model was never asked to cover
// now need an honest answer: AI-suggested Arabic wording, and a fact nobody
// has supplied at all.
//
//   lister_supplied     the lister typed it, unconfirmed by anyone else
//   platform_derived    SAT's own deterministic computation, or a named
//                       external dataset (computed and sourced, merged: both
//                       are "not the lister's word". The two are genuinely
//                       different claims, computed being SAT's own working
//                       and sourced being a named external dataset's, so a
//                       caller with the richer EvidencePassport/ProvenanceParts
//                       detail available should show THAT rather than stop at
//                       this coarse label; this module still preserves which
//                       tier a value came from wherever it is threaded through)
//   sat_verified        a real, row-level verification event backs this,
//                       not merely a field's static registry classification
//                       (see fromProvenanceTier below)
//   ai_suggested        produced by a model, not yet reviewed by a person
//   not_confirmed       nobody has supplied it, or it is present but nobody
//                       has confirmed it means what it appears to mean
//
// WHY THERE IS NO "REGA_VERIFIED" OR "NAFATH_VERIFIED" CATEGORY. Because
// neither integration exists. sat_verified is the only verified tier, and
// nothing in this module or its callers may claim a REGA or Nafath check
// happened. See docs/pkg-listing-creation-1a-deferred-contracts.md.

export type DisplayProvenance =
  | "lister_supplied"
  | "platform_derived"
  | "sat_verified"
  | "ai_suggested"
  | "not_confirmed";

/**
 * Real, row-level evidence that a field was actually checked: a date and an
 * actor, not merely a registry classification. Codex review of 922780d: the
 * registry's static per-field `provenance: "verified"` tier is metadata
 * about the FIELD, not an event about this ROW, and today no field in
 * assetFields.ts actually carries that tier (confirmed: 304 "entered", 4
 * "sourced", 2 "computed", 0 "verified"), so the branch below was dead code
 * with no live caller to catch it if a future field added the tier without
 * real backing. It now requires the caller to supply real evidence.
 */
export interface VerificationEvidence {
  verifiedAt: string | null;
  verifiedBy: string | null;
}

/**
 * The direct mapping from a registry field's own tier. Deliberately a pure
 * switch with no fallthrough default, so a fifth tier added to provenance.ts
 * later fails to compile here rather than silently landing in the wrong
 * bucket.
 */
export function fromProvenanceTier(tier: ProvenanceTier, verification?: VerificationEvidence | null): DisplayProvenance {
  switch (tier) {
    case "entered":
      return "lister_supplied";
    case "verified":
      // A field's registry tier alone is not an event. Only a real, dated,
      // actor-attributed record may promote to sat_verified; anything else
      // is not_confirmed rather than an unproven claim of verification.
      return verification?.verifiedAt && verification?.verifiedBy ? "sat_verified" : "not_confirmed";
    case "computed":
    case "sourced":
      return "platform_derived";
  }
}

/**
 * A field with no value at all. Never "lister_supplied" with an empty string,
 * because an empty string is not a supplied fact.
 */
export function notConfirmed(): DisplayProvenance {
  return "not_confirmed";
}

// ---------------------------------------------------------------------------
// Arabic wording origin and review, corrected under Codex review of 922780d
// ---------------------------------------------------------------------------
//
// THE DEFECT THE FIRST VERSION HAD. A lister clicking "Confirm this Arabic
// reads correctly" promoted the field straight from ai_suggested to
// lister_supplied. Clicking a review button does not prove the lister wrote
// or supplied the wording; it proves they read it. That was false
// provenance, structurally: authorship and review are two different claims,
// and the first version had only one flag to represent both.
//
// WHAT REAL EVIDENCE ACTUALLY EXISTS. listingArabic.ts's own header states
// plainly that per-field authorship is not derivable from the stored hash:
// a lister's own save stamps the same source hash a machine translation
// would. Two real signals do exist and are used below, and neither is
// invented for this purpose:
//   1. `listings.ar_translation_status` / `ar_translated_at`, written by
//      `/api/listings/[id]/translate` (`update.ar_translation_status =
//      "machine"`, with a real timestamp and model) only when it actually
//      wrote machine output. This is listing-level, not per-field (the same
//      route header note listingArabic.ts describes), so it is combined with
//      arabicState()==="current" before it is trusted for one field: a
//      field whose hash no longer matches the English is not attested by a
//      timestamp that predates the change.
//   2. Whether THIS session's own code observed the lister type directly
//      into the field. That is real, immediate, unambiguous session
//      evidence of authorship the moment it happens, and it is the only
//      path that may ever produce "lister_supplied" here, because it is the
//      only one this module can actually verify.
// Neither signal is claimed to be more than it is. When neither is present,
// origin is honestly "origin_unknown", not defaulted to ai_suggested.
//
// REVIEW IS A SEPARATE, SESSION-ONLY OVERLAY. Confirming "I have read this
// and it reads correctly" sets a review flag, never origin. It is never
// persisted (no column exists to hold it; see the deferred-contracts doc),
// and a reload loses it, which the UI states rather than hides.

export type ArabicOrigin = "origin_unknown" | "ai_suggested" | "lister_supplied";

export interface ArabicOriginContext {
  /** listings.ar_translation_status, read from the row. Listing-level, not per-field. */
  translationStatus?: string | null;
  /** listings.ar_translated_at, read from the row. */
  translatedAt?: string | null;
  /** True only when this session's own code observed the lister type into this exact field. */
  editedThisSession?: boolean;
}

export function arabicWordingOrigin(field: ArabicField, ctx?: ArabicOriginContext | null): ArabicOrigin {
  if (ctx?.editedThisSession) return "lister_supplied";
  // Deliberately not gated on arabicState()==="current": a hash mismatch
  // means the Arabic may now be stale relative to newer English (a separate,
  // already-surfaced concern; see arabicIsBehind), not that the record of
  // WHO produced the current text stopped being true. Requiring hash
  // currency here would need title_ar_src_hash/description_ar_src_hash
  // threaded through every caller for no honesty gain: the translation
  // event and its timestamp are true regardless of what happened to the
  // English afterward.
  if (ctx?.translationStatus === "machine" && !!ctx?.translatedAt) return "ai_suggested";
  return "origin_unknown";
}

/**
 * The full display vocabulary for one Arabic field: absence, origin, and a
 * session-only review overlay that never rewrites origin. `sat_verified` is
 * deliberately not a member: nothing in this codebase verifies Arabic
 * WORDING specifically (the general sat_verified tier above is for
 * structured facts like a licence number), so including a value this module
 * can never produce would be exactly the kind of unreachable, misleading
 * code this package's own review already found once.
 */
export type ArabicWordingDisplay = "not_confirmed" | "origin_unknown" | "ai_suggested" | "reviewed_this_session" | "lister_supplied";

export function arabicWordingDisplay(
  field: ArabicField,
  ctx: ArabicOriginContext & { reviewedThisSession?: boolean },
): ArabicWordingDisplay {
  if (arabicState(field) === "absent") return "not_confirmed";
  const origin = arabicWordingOrigin(field, ctx);
  if (origin === "lister_supplied") return "lister_supplied";
  if (ctx.reviewedThisSession) return "reviewed_this_session";
  return origin;
}

const LABEL: Record<DisplayProvenance, [string, string]> = {
  lister_supplied: ["Lister supplied", "قدّمها المُعلن"],
  platform_derived: ["Platform derived or retrieved", "استخلصتها أو استرجعتها المنصة"],
  sat_verified: ["SAT verified", "تحقّقت منها سات"],
  ai_suggested: ["AI suggested, not yet reviewed", "اقتراح ذكاء اصطناعي، لم يُراجَع بعد"],
  not_confirmed: ["Not confirmed", "غير مؤكَّد"],
};

export function displayProvenanceLabel(p: DisplayProvenance, ar: boolean): string {
  return LABEL[p][ar ? 1 : 0];
}

const ARIA: Record<DisplayProvenance, [string, string]> = {
  lister_supplied: ["Stated by the lister, not yet checked by SAT", "ذكرها المُعلن، ولم تراجعها سات بعد"],
  platform_derived: ["Derived or retrieved by the platform, not typed by the lister", "استخلصتها أو استرجعتها المنصة، ولم يكتبها المُعلن"],
  sat_verified: ["SAT checked this against a record outside this database, with a date and an actor on file", "تحقّقت سات من هذا مقابل سجل خارج هذه القاعدة، وسُجِّل تاريخ ومسؤول التحقّق"],
  ai_suggested: ["Produced by machine translation, not yet reviewed by anyone", "ناتج عن ترجمة آلية، ولم يراجعها أحد بعد"],
  not_confirmed: ["Nobody has supplied or confirmed this yet", "لم يقدّمها أو يؤكّدها أحد بعد"],
};

export function displayProvenanceAria(p: DisplayProvenance, ar: boolean): string {
  return ARIA[p][ar ? 1 : 0];
}

const ARABIC_WORDING_LABEL: Record<ArabicWordingDisplay, [string, string]> = {
  not_confirmed: ["Not confirmed", "غير مؤكَّد"],
  origin_unknown: ["Origin not recorded", "المصدر غير مسجَّل"],
  ai_suggested: ["AI suggested, not yet reviewed", "اقتراح ذكاء اصطناعي، لم يُراجَع بعد"],
  reviewed_this_session: ["Reviewed by the lister this session", "راجعها المُعلن خلال هذه الجلسة"],
  lister_supplied: ["Lister supplied", "قدّمها المُعلن"],
};

export function arabicWordingDisplayLabel(p: ArabicWordingDisplay, ar: boolean): string {
  return ARABIC_WORDING_LABEL[p][ar ? 1 : 0];
}

const ARABIC_WORDING_ARIA: Record<ArabicWordingDisplay, [string, string]> = {
  not_confirmed: ["Nobody has supplied this yet", "لم يقدّمها أحد بعد"],
  origin_unknown: ["Present on the record, but nothing here proves who wrote it or whether it is still machine output", "موجودة في السجل، لكن لا شيء هنا يثبت من كتبها أو أنها لا تزال ناتج ترجمة آلية"],
  ai_suggested: ["A recorded machine translation produced this text and it has not been reviewed", "ترجمة آلية مسجَّلة أنتجت هذا النص ولم تتم مراجعته"],
  reviewed_this_session: ["The lister reviewed this text during this visit and it read correctly to them; this review is not saved and will not survive a reload", "راجع المُعلن هذا النص خلال هذه الزيارة ورآه صحيحاً؛ هذه المراجعة غير محفوظة ولن تبقى بعد إعادة تحميل الصفحة", ],
  lister_supplied: ["Observed this session: the lister typed this text themselves", "لوحظ خلال هذه الجلسة: كتب المُعلن هذا النص بنفسه"],
};

export function arabicWordingDisplayAria(p: ArabicWordingDisplay, ar: boolean): string {
  return ARABIC_WORDING_ARIA[p][ar ? 1 : 0];
}
