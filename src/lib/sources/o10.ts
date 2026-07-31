// ADV-1E, Codex item 6. O10, recorded precisely and made executable.
//
// O10 has been open since ADV-0 and has been carried in four documents in four
// different shapes: "REGA and Ejar permitted use", "derived values, export and
// retrieval", "the licence question". Each shape was true and none was a
// specification, so the question could be answered in a meeting, believed to be
// closed, and leave three of its dimensions untouched. Codex item 6 names the
// dimensions. This file is that naming, as data.
//
// The pattern is `src/lib/location/sufficiency.ts`, ratified in ADV-5B: a clause
// is answered only by RECORDING THE TEXT of the answer, never by a boolean. A
// tick can be applied by anyone in a hurry and reads identically whether the
// underlying statement is a licence or a recollection. A recorded string is a
// reviewable commit that a second reader can disagree with.
//
// OWNER RULING 7 GOVERNS THE CONTENTS. No party has been contacted, nothing has
// been purchased, nothing has been signed, and `O10_RECORDS` is empty on
// purpose. Nothing in this file represents that a right exists. It is the
// interface the owner fills in once a written statement exists, and the shape of
// the question until then.
//
// WHAT THIS FILE DOES NOT DO. It does not gate anything by itself. The gate is
// already in place and is `source_registry.rega_ejar` carrying
// `rights_status = 'asserted_unverified'` with a recorded stop condition, which
// `effectivePolicy` ceils at `internal` and `decidePublicQuote` turns into a
// withholding. This file exists so that the reason for that withholding is
// legible, so that a partial answer produces a recorded gap rather than a
// judgement call, and so that `o10.test.ts` can prove the fail-closed property
// Codex item 6 requires rather than leaving it as an assurance.

import { REGA_RENT_INDEX_SOURCE_ID } from "./catalogue";

/**
 * The ten dimensions of O10, in the order Codex item 6 states them.
 *
 * Not a priority order. Resolution is unanimous rather than scored, because a
 * statement that permits public display and is silent on AI retrieval does not
 * permit AI retrieval nine tenths of the way: it does not permit it at all.
 */
export type O10ClauseId =
  | "source_access"
  | "public_display"
  | "attribution_wording"
  | "transformations_and_derived"
  | "aggregation_and_minimum_samples"
  | "export"
  | "api_and_machine_readable"
  | "ai_retrieval_and_response"
  | "retention_and_correction"
  | "arabic_and_english_publication";

export type O10Clause = {
  id: O10ClauseId;
  /**
   * The clause as `docs/regulatory-register.md` states it, verbatim.
   * `o10.test.ts` asserts each phrase is present in the register with whitespace
   * normalised, so editing the register without editing this file fails the
   * build, and so does the reverse. This field is the link that keeps the
   * document and the code from becoming two different specifications of one
   * question.
   */
  registerPhrase: string;
  /** What remains unanswered, and therefore withheld, while this clause is open. */
  why: string;
};

export const O10_CLAUSES: readonly O10Clause[] = [
  {
    id: "source_access",
    registerPhrase: "source access",
    why: "Whether SAT may obtain the index at all, and by which route. A figure held without a right to hold it is a defect before it is ever displayed.",
  },
  {
    id: "public_display",
    registerPhrase: "public display",
    why: "The permission the whole Rent Index surface waits on. Distinct from access: holding a figure and publishing it are two rights, and the second is the one a reader sees.",
  },
  {
    id: "attribution_wording",
    registerPhrase: "attribution wording",
    why: "Owner ruling 2 fixes SAT's side of this independently: every Rent Index reference retains the REGA Rental Index (Ejar) attribution whatever else is agreed. What is unanswered is the exact string the licensor requires, and an attribution invented at the render site is a breach with good intentions.",
  },
  {
    id: "transformations_and_derived",
    registerPhrase: "SAT transformations and derived figures",
    why: "A median restated as a band, a percentage against an asking rent, a yield built on the band: each is the licensed figure in a different shape, and a figure reshaped is still the figure. Redisplay and derived display are two permissions and the platform needs both.",
  },
  {
    id: "aggregation_and_minimum_samples",
    registerPhrase: "aggregation and minimum samples",
    why: "The licensor's own threshold, not one SAT applies afterwards. Below a threshold an aggregate stops being an aggregate, and a threshold chosen by the republisher is a threshold chosen to fit the data it has.",
  },
  {
    id: "export",
    registerPhrase: "export",
    why: "A decision pack, a CSV or a PDF carries the figure out of the surface that qualified it, into a document that outlives the licence and carries no banner.",
  },
  {
    id: "api_and_machine_readable",
    registerPhrase: "API and machine-readable output",
    why: "Codex item 2 puts the API, metadata and structured data inside the fence. A JSON response is a publication with no reader to see a disclaimer, and structured data is written for a crawler that will repeat it without one.",
  },
  {
    id: "ai_retrieval_and_response",
    registerPhrase: "AI retrieval and response use",
    why: "An assistant restating a figure in prose is a publication in the least controllable form there is. `mayAiRetrieve` opens only if the statement covers retrieval explicitly, because a display right is not a retrieval right.",
  },
  {
    id: "retention_and_correction",
    registerPhrase: "retention and correction",
    why: "How long a figure may be held after the licence ends, and what SAT must do when the licensor corrects a published value. A licence that ends without deletion leaves a derived figure on a page whose right expired.",
  },
  {
    id: "arabic_and_english_publication",
    registerPhrase: "Arabic and English publication",
    why: "The platform publishes both and the law requires identical figures and evidence states in each. A permission covering one language would make bilingual parity impossible to satisfy honestly, so it has to be asked rather than assumed.",
  },
];

export type O10Record = {
  /** Join key into `source_registry`. Always the REGA Rental Index (Ejar) row. */
  sourceId: string;
  /** Who recorded it. An owner action, never inferred from a deployment setting. */
  recordedBy: string;
  /** ISO date the answers were recorded. */
  recordedOn: string;
  /** The written instrument the answers were read from, cited so it can be re-read. */
  instrument: string;
  /**
   * Clause id to the recorded answer. A key present with an empty or whitespace
   * value is not an answer: it is a tick with extra steps, and it is read as
   * unanswered.
   */
  answers: Partial<Record<O10ClauseId, string>>;
};

/**
 * EMPTY, AND NOT AN OVERSIGHT.
 *
 * Owner ruling 7. Until a written permitted-use statement exists and the owner
 * records it here, O10 is unresolved and every clause is unanswered.
 */
export const O10_RECORDS: readonly O10Record[] = [];

export type O10Verdict = {
  resolved: boolean;
  /** Every unanswered clause, not the first. */
  unanswered: O10ClauseId[];
  /**
   * Internal only, on the same rule as `sourceRights.denialReason`: this quotes
   * licence reasoning and is never rendered to the public.
   */
  reasons: string[];
};

const answered = (rec: O10Record | undefined, id: O10ClauseId): boolean => {
  const v = rec?.answers?.[id];
  return typeof v === "string" && v.trim() !== "";
};

/**
 * Assess O10 against whatever has been recorded.
 *
 * EVERY GAP IS COLLECTED, not the first, for the reason ADV-5B gave: the caller
 * is a reviewer deciding whether a statement is sufficient, and being told one
 * gap at a time across ten rounds is how a review ends with nine still open.
 */
export function assessO10(records: readonly O10Record[] = O10_RECORDS): O10Verdict {
  const rec = records.find((r) => r.sourceId === REGA_RENT_INDEX_SOURCE_ID);
  const reasons: string[] = [];
  if (!rec) {
    reasons.push(
      `${REGA_RENT_INDEX_SOURCE_ID}: no permitted-use statement is recorded, so no clause is answered`,
    );
    return { resolved: false, unanswered: O10_CLAUSES.map((c) => c.id), reasons };
  }
  const unanswered = O10_CLAUSES.filter((c) => !answered(rec, c.id)).map((c) => c.id);
  for (const id of unanswered) {
    const c = O10_CLAUSES.find((x) => x.id === id) as O10Clause;
    reasons.push(`${REGA_RENT_INDEX_SOURCE_ID}: '${c.registerPhrase}' is unanswered. ${c.why}`);
  }
  if (unanswered.length === 0) {
    reasons.push(
      `${REGA_RENT_INDEX_SOURCE_ID}: every clause is answered from ${rec.instrument}, recorded by ${rec.recordedBy} on ${rec.recordedOn}`,
    );
  }
  return { resolved: unanswered.length === 0, unanswered, reasons };
}

/**
 * Whether O10 is resolved right now. False, and it is meant to be read that way.
 *
 * Deliberately NOT wired into `decidePublicQuote`. The production decision
 * already fails closed on this source through the rights ledger, and a second
 * independent gate on the same question is a second thing that can be flipped by
 * mistake. This constant is for documentation surfaces and for the test that
 * proves the ledger and this record agree.
 */
export const O10_RESOLVED = assessO10().resolved;
