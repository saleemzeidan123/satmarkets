import type { ProvenanceTier } from "./provenance";
import { arabicState, type ArabicField } from "./listingArabic";

// PKG-LISTING-CREATION-1A. The five-category provenance vocabulary the Studio
// and the draft preview show, built ON TOP of provenance.ts rather than beside
// it.
//
// provenance.ts already answers "where did this come from" for every registry
// field, in four tiers: entered, verified, computed, sourced. That module is
// the source of truth for the registry and stays untouched here. This file
// exists because two surfaces (the guided evidence mission, the exact
// bilingual preview) need a coarser, five-way classification a reader can act
// on without knowing what "computed" or "sourced" means in this codebase's
// terms, and because two cases the four-tier model was never asked to cover
// now need an honest answer: AI-suggested Arabic wording, and a fact nobody
// has supplied at all.
//
// The five categories are exactly the ones required of this package:
//   lister_supplied    the lister typed it, unconfirmed by anyone else
//   platform_retrieved SAT's own deterministic computation, or a named
//                       external dataset (computed and sourced, merged: both
//                       are "not the lister's word", and the finer distinction
//                       stays visible through the tier this maps from)
//   sat_verified        SAT checked it against something outside this
//                       database, with a date and an actor
//   ai_suggested        produced by a model, not yet confirmed by a person
//   not_confirmed       nobody has supplied it, or it is present but nobody
//                       has confirmed it means what it appears to mean
//
// WHY THERE IS NO "REGA_VERIFIED" OR "NAFATH_VERIFIED" CATEGORY. Because
// neither integration exists. sat_verified is the only verified tier, and
// nothing in this module or its callers may claim a REGA or Nafath check
// happened. See docs/pkg-listing-creation-1a-deferred-contracts.md.

export type DisplayProvenance =
  | "lister_supplied"
  | "platform_retrieved"
  | "sat_verified"
  | "ai_suggested"
  | "not_confirmed";

/**
 * The direct mapping from a registry field's own tier. Deliberately a pure
 * switch with no fallthrough default, so a fifth tier added to provenance.ts
 * later fails to compile here rather than silently landing in the wrong
 * bucket.
 */
export function fromProvenanceTier(tier: ProvenanceTier): DisplayProvenance {
  switch (tier) {
    case "entered":
      return "lister_supplied";
    case "verified":
      return "sat_verified";
    case "computed":
    case "sourced":
      return "platform_retrieved";
  }
}

/**
 * A field with no value at all. Never "lister_supplied" with an empty string,
 * because an empty string is not a supplied fact.
 */
export function notConfirmed(): DisplayProvenance {
  return "not_confirmed";
}

/**
 * Arabic title or description wording, classified honestly against what the
 * record can actually support.
 *
 * WHAT THIS CANNOT DO, STATED PLAINLY. listingArabic.ts's own header says it
 * outright: "It never says who wrote the Arabic... authorship is not
 * derivable here." `/api/listings/[id]/translate` runs automatically after
 * every Studio save (ListingStudio.tsx, fire-and-forget, immediately after a
 * successful write) and stamps the same source hash a lister's own edit would
 * stamp, so a hash match proves only that the Arabic answers the current
 * English, never who typed it.
 *
 * Given that, defaulting to "lister_supplied" would overclaim: it would tell
 * a reader a human wrote wording that may be entirely machine output nobody
 * has looked at. Defaulting to "ai_suggested" is the cautious direction, and
 * it is also usually true, because the translate call fires on every save
 * whether or not the lister touched the Arabic field.
 *
 * `confirmedThisSession` is the one honest way this package can let a lister
 * clear that label: an explicit, in-session "I have read this" action (the
 * preview is the natural place to ask it). It is never persisted, because no
 * column exists to hold a per-field confirmation, and persisting a UI
 * checkbox as if it survived a reload would misstate what happened. See the
 * deferred-contracts doc for the schema this would need to be a real,
 * durable confirmation rather than a session gesture.
 *
 * This exact classification, and the fact that it is a session gesture and
 * not a durable one, is the term flagged for Fable and Codex review per
 * instruction H: the platform has no way today to honestly tell a
 * lister-authored Arabic sentence from a machine-translated one it has not
 * reviewed, and "ai_suggested by default" is this package's judgment call,
 * not a settled house rule.
 */
export function arabicWordingProvenance(
  field: ArabicField,
  confirmedThisSession: boolean,
): DisplayProvenance {
  const state = arabicState(field);
  if (state === "absent") return "not_confirmed";
  if (confirmedThisSession) return "lister_supplied";
  return "ai_suggested";
}

const LABEL: Record<DisplayProvenance, [string, string]> = {
  lister_supplied: ["Lister supplied", "قدّمها المُعلن"],
  platform_retrieved: ["Platform retrieved", "استرجعتها المنصة"],
  sat_verified: ["SAT verified", "تحقّقت منها سات"],
  ai_suggested: ["AI suggested, not yet confirmed", "اقتراح ذكاء اصطناعي، لم يُؤكَّد بعد"],
  not_confirmed: ["Not confirmed", "غير مؤكَّد"],
};

export function displayProvenanceLabel(p: DisplayProvenance, ar: boolean): string {
  return LABEL[p][ar ? 1 : 0];
}

const ARIA: Record<DisplayProvenance, [string, string]> = {
  lister_supplied: ["Stated by the lister, not yet checked by SAT", "ذكرها المُعلن، ولم تراجعها سات بعد"],
  platform_retrieved: ["Retrieved or computed by the platform, not typed by the lister", "استرجعتها أو حسبتها المنصة، ولم يكتبها المُعلن"],
  sat_verified: ["SAT checked this against a record outside this database", "تحقّقت سات من هذا مقابل سجل خارج هذه القاعدة"],
  ai_suggested: ["Produced by machine translation, waiting on the lister to confirm it reads correctly", "ناتج عن ترجمة آلية، بانتظار تأكيد المُعلن أنها صحيحة"],
  not_confirmed: ["Nobody has supplied or confirmed this yet", "لم يقدّمها أو يؤكّدها أحد بعد"],
};

export function displayProvenanceAria(p: DisplayProvenance, ar: boolean): string {
  return ARIA[p][ar ? 1 : 0];
}
