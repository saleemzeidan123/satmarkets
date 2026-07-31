// ADV-1E. The one decision that says whether SAT may quote a figure in public.
//
// WHY THIS MODULE EXISTS.
//
// Finding 90, which Codex has now ruled a release-blocking truth and rights
// defect: the Advisor sentence composed its number from the published row while
// the Evidence Passport beside it composed its number from the passport. Two
// computations, one screen, and on a withheld licence they disagreed: the
// sentence kept the figure and the passport withheld it. A reader was told a
// market number and, one disclosure below, told that the number could not be
// shown.
//
// The underlying cause is larger than the one route. Three different questions
// were being answered by the same value in different places:
//
//   1. Is the sample behind this figure large enough to state a figure at all.
//   2. Has the row been published into the platform.
//   3. May SAT display this figure to the public, here, in this deployment.
//
// The first is statistics. The second is workflow. The third is truth and
// rights, and it is the only one that decides what a reader sees. Codex item 2:
// "Statistical sufficiency must never bypass publication permission." A row can
// be `published` and `sufficient` and still be a figure SAT has no right to
// quote, or a synthetic figure SAT has no right to call a market figure.
//
// So there is one boundary, here, and every quoting surface asks it: the server
// render, the APIs, the Advisor prose, the Evidence Passport, page metadata,
// structured data and machine-readable output. One decision cannot disagree
// with itself, which is the property finding 90 needed and did not have.
//
// THE FOUR ANSWERS, AND WHY THERE ARE FOUR RATHER THAN TWO.
//
//   authorized_public  A real figure, from a source whose public display right
//                      is recorded, or SAT's own lawfully collected record.
//                      Show the figure and its matching passport.
//
//   labelled_sample    Synthetic data, on the labelled private preview only.
//                      Show the figure ONLY beside the explicit sample
//                      statement, and never as a published market figure.
//
//   withheld           A real source exists and its public display right is not
//                      confirmed, or a stop condition is recorded against it.
//                      Show no figure and say the market figure is unavailable
//                      for public use.
//
//   unavailable        We hold no figure, or the sample does not support one.
//                      Show no figure and invent no substitute.
//
// A binary permitted/denied cannot carry this. "We may not show you this" and
// "we do not have this" are different sentences about different facts, and
// collapsing them was the exact failure ADV-1C.1 correction 5 corrected for the
// evidence states. This is the same rule applied to the figure itself.
//
// HOW IT FAILS.
//
// Closed, at every branch, and closed in the direction that removes a number
// rather than the direction that keeps one. Specifically:
//
//   * No value, or an insufficient sample, is decided BEFORE anything about
//     rights, so a licence can never be read as a reason to publish a figure
//     that does not exist.
//   * Synthetic data outside the labelled preview degrades to `withheld`, not
//     to `authorized_public`. Codex item 3 permits sample data to remain visible
//     "on the private, noindex preview only". A deployment that has stopped
//     labelling its samples has stopped earning that permission.
//   * A recorded stop condition withholds regardless of the policy columns.
//     `rega_ejar` carries "O10 unresolved" today, and Codex item 6 rules that
//     until O10 is resolved the production decision must fail closed.
//   * A figure carrying a source id withholds on that source's licence even
//     when its tier is not `sourced`. Codex item 4: a transformed third-party
//     figure is still that third party's figure, and relabelling it as SAT's
//     own record is source laundering.
//
// WHAT IT DELIBERATELY DOES NOT DO.
//
// It does not read `noindex`, a preview banner, a CSS class or the absence of a
// passport as authorization, and it cannot: none of them is an input. Codex
// item 2 forbids relying on any of them, and the way to not rely on something
// is to not be able to see it.
//
// No em dashes (Law 2). Western numerals in both locales (Law 4).

import type { Sufficiency, ProvenanceTierRef } from "./evidence";
import { type PreviewEnvironment, type RecordDemoStatus, previewEnvironmentNow } from "./launchGate";
import { type SourceRights, effectivePolicy } from "./sourceRights";

// ---------------------------------------------------------------------------
// The answers
// ---------------------------------------------------------------------------

export type PublicQuoteKind =
  | "authorized_public"
  | "labelled_sample"
  | "withheld"
  | "unavailable";

/**
 * Why the decision came out the way it did, as a closed union.
 *
 * Internal only, in the sense that no reader is shown one of these strings: the
 * public sentences are the four statements below. These exist so a gate can
 * assert the PATH and not merely the outcome. A test that only checks
 * `mayShowFigure === false` passes when a figure is withheld for the wrong
 * reason, and a wrong reason is a bug waiting for the day it becomes the only
 * reason.
 */
export type PublicQuoteReason =
  | "no_value"
  | "sample_not_sufficient"
  | "flagged_simulated_in_labelled_preview"
  | "flagged_simulated_outside_labelled_preview"
  | "third_party_rights_unread"
  | "third_party_rights_mismatch"
  | "third_party_stop_condition_recorded"
  | "third_party_display_not_public"
  | "third_party_display_permitted"
  | "first_party_record";

export type PublicQuoteDecision = {
  readonly kind: PublicQuoteKind;
  /** The only question a rendering surface should ask before printing a number. */
  readonly mayShowFigure: boolean;
  /** True when the figure may appear ONLY beside the explicit sample statement. */
  readonly requiresSampleStatement: boolean;
  /**
   * May this figure be described as SAT Markets' own record.
   *
   * False for everything except a genuine first-party value. Codex item 4: the
   * phrase may not replace an unresolved third-party source, synthetic data, a
   * transformed third-party figure, or a source whose attribution or display
   * rights are withheld. A surface that renders the source name reads this and
   * nothing else, so the phrase cannot be reached by any other path.
   */
  readonly mayNameSatOwnRecord: boolean;
  readonly reasons: readonly PublicQuoteReason[];
};

// ---------------------------------------------------------------------------
// The inputs
// ---------------------------------------------------------------------------

/**
 * Everything the decision is allowed to consider, and nothing else.
 *
 * Codex item 1 names six things the decision must weigh: data class, demo
 * status, source-rights status, permitted display, environment and any
 * applicable stop condition. All six are here. What is not here matters as
 * much: there is no `published` flag, no route, no locale, no indexing switch
 * and no banner state, because none of those is evidence of a right.
 */
export type QuoteFacts = {
  /** Do we hold a value at all. A missing figure is decided before anything else. */
  readonly hasValue: boolean;
  /** Statistics, and only statistics. Never a substitute for permission. */
  readonly sufficiency: Sufficiency;
  /** Did anything flag the record behind this figure as simulated. */
  readonly recordDemoStatus: RecordDemoStatus;
  /** The record's own data class column, e.g. "synthetic" or "real". */
  readonly dataClass: string | null;
  readonly tier: ProvenanceTierRef;
  /** The registered source id, when the figure came from or was derived from one. */
  readonly sourceId: string | null;
  /** The rights row for that source id, or null when none could be read. */
  readonly rights: SourceRights | null;
  /**
   * True when the figure is the source's own published number rather than one
   * SAT computed from it. Decides which licence question is asked, exactly as
   * `publishability` decides it, because the two must never diverge.
   */
  readonly asPublished: boolean;
  /** Is this deployment labelling what it shows as sample data. */
  readonly environment: PreviewEnvironment;
};

// ---------------------------------------------------------------------------
// The decision
// ---------------------------------------------------------------------------

const answer = (
  kind: PublicQuoteKind,
  mayShowFigure: boolean,
  requiresSampleStatement: boolean,
  mayNameSatOwnRecord: boolean,
  reasons: readonly PublicQuoteReason[],
): PublicQuoteDecision => ({ kind, mayShowFigure, requiresSampleStatement, mayNameSatOwnRecord, reasons });

/**
 * The canonical boundary. Every quoting surface on the platform asks this.
 *
 * The order of the branches is the argument. Absence is settled before
 * statistics, statistics before sample status, sample status before licences,
 * and licences before the first-party fallback. Read downwards, no branch can
 * be reached by a figure that an earlier branch should have stopped, which is
 * what makes "statistical sufficiency never bypasses publication permission" a
 * property of the control flow rather than a rule someone has to remember.
 */
export function decidePublicQuote(f: QuoteFacts): PublicQuoteDecision {
  // 1. Absence. Nothing downstream may turn a missing figure into a shown one.
  if (!f.hasValue) return answer("unavailable", false, false, false, ["no_value"]);

  // 2. Statistics, on their own terms. An insufficient sample is not a rights
  //    problem and must not be reported as one: the records behind it do not
  //    amount to a figure, and no permission would change that.
  if (f.sufficiency !== "sufficient") {
    return answer("unavailable", false, false, false, ["sample_not_sufficient"]);
  }

  // 3. Sample status, read as an OR on the restrictive side, the same reading
  //    `rentIndexRecordClassOf` applies to the same two columns. One marker
  //    saying simulated is enough; both are not required, because a row that
  //    says it is synthetic in one column and is silent in the other is one
  //    fact and one silence.
  if (f.recordDemoStatus === "flagged_simulated" || f.dataClass === "synthetic") {
    return f.environment === "preview_labelled"
      ? answer("labelled_sample", true, true, false, ["flagged_simulated_in_labelled_preview"])
      : answer("withheld", false, false, false, ["flagged_simulated_outside_labelled_preview"]);
  }

  // 4. Somebody else's figure, or a figure of ours built out of theirs. Both
  //    ask the licence, and the licence is the only thing that answers.
  if (f.tier === "sourced" || f.sourceId !== null) {
    const r = f.rights;
    if (!r) return answer("withheld", false, false, false, ["third_party_rights_unread"]);
    if (r.sourceId !== f.sourceId) {
      return answer("withheld", false, false, false, ["third_party_rights_mismatch"]);
    }
    // The stop condition, checked before the policy columns so that the reason
    // names the more fundamental fact rather than its consequence.
    //
    // It withholds on any row that is not `evidenced`. On such a row the stop
    // condition is an unresolved blocker a reviewer wrote down and nobody has
    // cleared: `rega_ejar` carries "O10 unresolved" at `asserted_unverified`
    // today, and Codex item 6 rules that until O10 is resolved the decision must
    // fail closed. On an `evidenced` row the same field means something else, a
    // standing operational term of a licence that has actually been read, and
    // withholding on it would make recording the term a reason to distrust the
    // review that recorded it.
    //
    // The two are not redundant. Reaching this line on a non-evidenced row is
    // possible only because the check runs before `effectivePolicy`, and the
    // point of running it first is that the withholding is then attributed to
    // the unresolved dependency by name, in the reason a gate can assert.
    if (r.stopCondition && r.rightsStatus !== "evidenced") {
      return answer("withheld", false, false, false, ["third_party_stop_condition_recorded"]);
    }
    const display = effectivePolicy(r, f.asPublished ? "redisplay" : "derived_display");
    if (display !== "public") {
      return answer("withheld", false, false, false, ["third_party_display_not_public"]);
    }
    return answer("authorized_public", true, false, false, ["third_party_display_permitted"]);
  }

  // 5. Genuinely ours: entered by a lister on the exchange, verified by SAT, or
  //    computed by SAT from those, with no third-party figure inside it. This
  //    is the only branch that may say so.
  return answer("authorized_public", true, false, true, ["first_party_record"]);
}

/** The same decision with the environment read from this deployment, now. */
export function decidePublicQuoteNow(f: Omit<QuoteFacts, "environment">): PublicQuoteDecision {
  return decidePublicQuote({ ...f, environment: previewEnvironmentNow() });
}

// ---------------------------------------------------------------------------
// What a reader is told
// ---------------------------------------------------------------------------

/**
 * The sample statement, in the exact meaning Codex item 3 required.
 *
 * It is a constant rather than page copy because it has to appear identically
 * in a table cell, an evidence panel and an Advisor sentence, and a phrase
 * retyped in three places is a phrase that will differ in two of them. It stays
 * attached to the figure visually and semantically wherever the figure goes.
 */
export const SAMPLE_STATEMENT: Readonly<Record<"en" | "ar", string>> = {
  en: "Sample data for product testing. Not a published market figure.",
  ar: "بيانات تجريبية لاختبار المنتج، وليست رقماً سوقياً منشوراً.",
};

/**
 * What is said where a withheld figure would have been.
 *
 * It states the limit and it names nothing. `/sources` already settled the rule
 * this follows: no licensor is named on a row whose terms are being respected,
 * because naming them republishes the term. So the sentence is about SAT's
 * permission, not about the source's data.
 */
export const WITHHELD_STATEMENT: Readonly<Record<"en" | "ar", string>> = {
  en: "The market figure is not available for public use.",
  ar: "الرقم السوقي غير متاح للاستخدام العام.",
};

/** What is said where we simply hold nothing. Never an estimate, never a blank. */
export const UNAVAILABLE_STATEMENT: Readonly<Record<"en" | "ar", string>> = {
  en: "No figure is held for this. Nothing is estimated in its place.",
  ar: "لا يوجد رقم محفوظ لهذه الحالة، ولا نضع تقديراً مكانه.",
};

/**
 * The source line for a figure that may not be called SAT's own record and has
 * no nameable licensor. Used by the passport in place of the owner name.
 */
export const SOURCE_NOT_DISCLOSED: Readonly<Record<"en" | "ar", string>> = {
  en: "Not disclosed for public use",
  ar: "غير مُفصح عنه للاستخدام العام",
};

/** The one sentence that belongs beside the figure, or null when none does. */
export function quoteStatement(kind: PublicQuoteKind, ar: boolean): string | null {
  const l = ar ? "ar" : "en";
  if (kind === "labelled_sample") return SAMPLE_STATEMENT[l];
  if (kind === "withheld") return WITHHELD_STATEMENT[l];
  if (kind === "unavailable") return UNAVAILABLE_STATEMENT[l];
  return null;
}

/**
 * Every string this module can put in front of a reader, in both languages.
 *
 * Exported so the Arabic lint and the parity gates can enumerate them rather
 * than rediscover them by grep, and so a statement added later without an
 * Arabic twin fails a test instead of shipping.
 */
export const QUOTE_STATEMENTS = [
  SAMPLE_STATEMENT,
  WITHHELD_STATEMENT,
  UNAVAILABLE_STATEMENT,
  SOURCE_NOT_DISCLOSED,
] as const;
