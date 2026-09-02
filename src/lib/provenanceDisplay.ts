import type { ProvenanceTier } from "./provenance";
import { arabicState, type ArabicField } from "./listingArabic";

// PKG-LISTING-CREATION-1A. The provenance vocabulary the Studio and the draft
// preview show for REGISTRY ATTRIBUTE FIELDS, built ON TOP of provenance.ts
// rather than beside it. Arabic title/description wording has its own,
// separate vocabulary further down this file (ArabicOrigin/ArabicReview):
// wording needs a session-observed-evidence model this coarser, registry-tier
// mapping was never built for, and a category this module cannot produce
// must not sit in its type as if it could (see the removal note below).
//
// provenance.ts already answers "where did this come from" for every registry
// field, in four tiers: entered, verified, computed, sourced. That module is
// the source of truth for the registry and stays untouched here. This file
// exists because two surfaces (the guided evidence mission, the exact
// bilingual preview) need a coarser classification a reader can act on
// without knowing what "computed" or "sourced" means in this codebase's
// terms, and because one case the four-tier model was never asked to cover
// now needs an honest answer: a fact nobody has supplied at all.
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
//   not_confirmed       nobody has supplied it, or it is present but nobody
//                       has confirmed it means what it appears to mean
//
// WHY THERE IS NO "REGA_VERIFIED" OR "NAFATH_VERIFIED" CATEGORY. Because
// neither integration exists. sat_verified is the only verified tier, and
// nothing in this module or its callers may claim a REGA or Nafath check
// happened. See docs/pkg-listing-creation-1a-deferred-contracts.md.
//
// WHY THERE IS NO "AI_SUGGESTED" HERE ANYMORE. It used to exist for Arabic
// wording, produced only by a function this file no longer has. Nothing
// produces it now: fromProvenanceTier never returns it and notConfirmed()
// cannot either, so it was a value this module claimed to be able to render
// while no code path could ever reach it, exactly the unreachable-code
// pattern two rounds of review have now found in this package. Removed
// rather than left as decoration.

export type DisplayProvenance =
  | "lister_supplied"
  | "platform_derived"
  | "sat_verified"
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
// Arabic wording origin and review, corrected across two Codex review rounds
// ---------------------------------------------------------------------------
//
// ROUND ONE'S DEFECT. A lister clicking "Confirm this Arabic reads
// correctly" promoted the field straight from ai_suggested to
// lister_supplied. Clicking a review button does not prove the lister wrote
// or supplied the wording; it proves they read it.
//
// ROUND TWO'S DEFECT, IN THE ROUND-ONE FIX. Two things, both corrected here.
//
// First: `ai_suggested` was inferred from `listings.ar_translation_status`/
// `ar_translated_at`, which prove a translation event happened SOMETIME, not
// that the CURRENT field content still equals what that event wrote. A
// lister can translate, then hand-edit the Arabic afterward, then reload:
// the session flag that would have caught the edit is gone, the listing-level
// "machine" status is not (only the translate route ever touches it, and it
// is listing-level, not per-field, so it cannot even name which field), and
// the manually authored text is mislabeled AI output. So the listing-level
// columns are no longer read for origin AT ALL. The only two facts this
// module will assert Arabic origin from are both session-observed, real,
// and immediate:
//   1. This session's own code observed the lister type directly into the
//      field: real, unambiguous evidence of `lister_supplied`.
//   2. This session's own code observed the exact, current field value
//      arrive as this session's own translate response, unedited since:
//      real, unambiguous evidence of `ai_suggested`. (ListingStudio.tsx
//      awaits the translate call now and reads the text it returns, rather
//      than firing it blind; see that file's own comment.)
// A loaded record with neither signal, which is every record on a fresh
// page load including the whole standalone preview route, is honestly
// `origin_unknown`. Durable per-field provenance would be the schema fix
// (see docs/pkg-listing-creation-1a-deferred-contracts.md); nothing short
// of that may claim a specific origin for a record this session did not
// itself observe end to end.
//
// Second: origin and review used to collapse into one flat value, so a
// reviewed field's ORIGIN (was it AI output? unknown?) became unrecoverable
// from the single field a caller could read; `reviewed_this_session` simply
// overwrote whatever origin string had been there. They are now two
// genuinely independent fields on every result, neither derived from the
// other, and a caller that wants both renders both.

export type ArabicOrigin = "lister_supplied" | "ai_suggested" | "origin_unknown";
export type ArabicReview = "unreviewed" | "reviewed_this_session";

export interface ArabicOriginContext {
  /** True only when this session's own code observed the lister type into this exact field. */
  editedThisSession?: boolean;
  /**
   * True only when this session's own code observed the exact text this
   * session's own translate call wrote to this field, with no edit to the
   * field since. Never inferred from listings.ar_translation_status /
   * ar_translated_at: see the module header for why those are listing-level
   * history, not per-field, per-session proof.
   */
  translatedThisSessionUnedited?: boolean;
}

/** Origin only. Never let a caller derive this from review state or vice versa. */
export function arabicWordingOrigin(ctx?: ArabicOriginContext | null): ArabicOrigin {
  if (ctx?.editedThisSession) return "lister_supplied";
  if (ctx?.translatedThisSessionUnedited) return "ai_suggested";
  return "origin_unknown";
}

/**
 * Origin and review as two independent facts about one Arabic field. `origin`
 * is `null` exactly when the field is absent (arabicState(field) ===
 * "absent"): a category error, not an unknown origin, the same convention
 * guidedEvidence.ts's `fulfilment: EvidenceFulfilment | null` already uses
 * for the same reason. `review` never influences `origin` and is never
 * influenced by it; a caller renders whichever facts are relevant, together
 * or apart.
 */
export interface ArabicWordingFacts {
  origin: ArabicOrigin | null;
  review: ArabicReview;
}

export function arabicWordingFacts(
  field: ArabicField,
  ctx: ArabicOriginContext & { reviewedThisSession?: boolean },
): ArabicWordingFacts {
  const origin = arabicState(field) === "absent" ? null : arabicWordingOrigin(ctx);
  return {
    origin,
    review: ctx.reviewedThisSession ? "reviewed_this_session" : "unreviewed",
  };
}

const LABEL: Record<DisplayProvenance, [string, string]> = {
  lister_supplied: ["Lister supplied", "قدّمها المُعلن"],
  platform_derived: ["Platform derived or retrieved", "استخلصتها أو استرجعتها المنصة"],
  sat_verified: ["SAT verified", "تحقّقت منها سات"],
  not_confirmed: ["Not confirmed", "غير مؤكَّد"],
};

export function displayProvenanceLabel(p: DisplayProvenance, ar: boolean): string {
  return LABEL[p][ar ? 1 : 0];
}

const ARIA: Record<DisplayProvenance, [string, string]> = {
  lister_supplied: ["Stated by the lister, not yet checked by SAT", "ذكرها المُعلن، ولم تراجعها سات بعد"],
  platform_derived: ["Derived or retrieved by the platform, not typed by the lister", "استخلصتها أو استرجعتها المنصة، ولم يكتبها المُعلن"],
  sat_verified: ["SAT checked this against a record outside this database, with a date and an actor on file", "تحقّقت سات من هذا مقابل سجل خارج هذه القاعدة، وسُجِّل تاريخ ومسؤول التحقّق"],
  not_confirmed: ["Nobody has supplied or confirmed this yet", "لم يقدّمها أو يؤكّدها أحد بعد"],
};

export function displayProvenanceAria(p: DisplayProvenance, ar: boolean): string {
  return ARIA[p][ar ? 1 : 0];
}

// `origin === null` (the field is absent) is deliberately not a member of
// this label map: a caller only asks for an origin label when there is text
// to have an origin, exactly mirroring how a null EvidenceFulfilment is
// never passed to evidenceFulfilmentLabel either.
const ARABIC_ORIGIN_LABEL: Record<ArabicOrigin, [string, string]> = {
  lister_supplied: ["Lister supplied", "قدّمها المُعلن"],
  ai_suggested: ["AI suggested", "اقتراح ذكاء اصطناعي"],
  origin_unknown: ["Origin not recorded", "المصدر غير مسجَّل"],
};

export function arabicOriginLabel(o: ArabicOrigin, ar: boolean): string {
  return ARABIC_ORIGIN_LABEL[o][ar ? 1 : 0];
}

const ARABIC_ORIGIN_ARIA: Record<ArabicOrigin, [string, string]> = {
  lister_supplied: ["Observed this session: the lister typed this text themselves", "لوحظ خلال هذه الجلسة: كتب المُعلن هذا النص بنفسه"],
  ai_suggested: ["Observed this session: this session's own translation produced this exact text, unedited since", "لوحظ خلال هذه الجلسة: أنتجت الترجمة الخاصة بهذه الجلسة هذا النص تحديداً، ولم يُعدَّل منذ ذلك"],
  origin_unknown: ["Present on the record, but nothing this session observed proves who wrote it or whether it is still machine output", "موجودة في السجل، لكن لا شيء لاحظته هذه الجلسة يثبت من كتبها أو أنها لا تزال ناتج ترجمة آلية"],
};

export function arabicOriginAria(o: ArabicOrigin, ar: boolean): string {
  return ARABIC_ORIGIN_ARIA[o][ar ? 1 : 0];
}

const ARABIC_REVIEW_LABEL: Record<ArabicReview, [string, string]> = {
  unreviewed: ["Not yet reviewed", "لم تتم مراجعتها بعد"],
  reviewed_this_session: ["Reviewed this session", "روجعت خلال هذه الجلسة"],
};

export function arabicReviewLabel(r: ArabicReview, ar: boolean): string {
  return ARABIC_REVIEW_LABEL[r][ar ? 1 : 0];
}

const ARABIC_REVIEW_ARIA: Record<ArabicReview, [string, string]> = {
  unreviewed: ["Nobody has confirmed this text reads correctly yet", "لم يؤكّد أحد أن هذا النص صحيح بعد"],
  reviewed_this_session: ["The lister confirmed this text reads correctly during this visit; this review is not saved and will not survive a reload", "أكّد المُعلن أن هذا النص صحيح خلال هذه الزيارة؛ هذه المراجعة غير محفوظة ولن تبقى بعد إعادة تحميل الصفحة"],
};

export function arabicReviewAria(r: ArabicReview, ar: boolean): string {
  return ARABIC_REVIEW_ARIA[r][ar ? 1 : 0];
}
