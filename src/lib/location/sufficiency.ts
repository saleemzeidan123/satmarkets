// ADV-5B. Part E of `docs/regulatory-register.md`, made executable.
//
// Part E already stated what a sufficient location-intelligence agreement has to
// answer. It stated it in prose, which means the checklist lived in a file that
// no gate reads, and the failure mode of a prose checklist is not that somebody
// disagrees with it: it is that somebody signs an agreement, believes it is
// covered, and nothing in the codebase disagrees. This file is the same list as
// data, and `sufficiency.test.ts` reads the register and fails if the two drift
// apart in either direction.
//
// THE UNIT OF ANSWER IS A RECORDED STRING, NOT A TICK.
//
// A boolean checklist can be ticked by anyone in a hurry. A clause here is
// answered only by recording the text of the answer, which a reviewer can read
// and disagree with, and which is a reviewable commit rather than a state change
// in a dashboard. That is the same reasoning that made
// `PROCESSING_AGREEMENTS_IN_FORCE` a compile-time constant in `boundary.ts`.
//
// Owner ruling 7 governs the contents: no vendor has been contacted, nothing has
// been purchased, nothing has been signed, and `RECORDED_AGREEMENTS` is empty on
// purpose. Nothing in this file represents that a right exists.

export type ClauseId =
  // Mobility and visitation, Part E, "stc Geo Analytics, or any
  // location-intelligence provider".
  | "coverage_map"
  | "historical_depth"
  | "refresh_cadence"
  | "sample_construction"
  | "consent_provenance"
  | "aggregation_threshold"
  | "controller_roles"
  | "storage_location"
  | "cross_border"
  | "audit_rights"
  | "deletion_on_termination"
  | "no_user_level_output"
  // Any location provider that would receive text a user typed, Part E,
  // "Location and geography providers (settled in ADV-5A)".
  | "processing_terms"
  | "controller_or_processor"
  | "storage_and_cross_border"
  | "query_retention"
  | "display_form"
  | "caching"
  | "attribution_string";

export type SufficiencyClause = {
  id: ClauseId;
  /**
   * The clause as Part E states it, verbatim. `sufficiency.test.ts` asserts this
   * substring is present in the register with whitespace normalized, so editing
   * the register without editing this file fails the build, and so does the
   * reverse. This field is the link that makes the checklist executable rather
   * than a second copy of it.
   */
  registerPhrase: string;
  /** What goes wrong when this clause is missing. Internal reviewer text. */
  why: string;
};

/**
 * The twelve clauses a mobility or visitation agreement must answer.
 *
 * Order follows Part E. It is not a priority order: sufficiency is unanimous,
 * not scored, so there is no partial credit and no clause is more skippable than
 * another.
 */
export const MOBILITY_CLAUSES: readonly SufficiencyClause[] = [
  {
    id: "coverage_map",
    registerPhrase: "coverage map and its gaps",
    why: "A figure for a district the panel does not observe is not a low-confidence figure, it is a fabricated one.",
  },
  {
    id: "historical_depth",
    registerPhrase: "historical depth",
    why: "Without depth there is no baseline, so a change cannot be distinguished from a start.",
  },
  {
    id: "refresh_cadence",
    registerPhrase: "refresh cadence",
    why: "A figure with no cadence cannot be dated, and an undated figure is presented as current forever.",
  },
  {
    id: "sample_construction",
    registerPhrase: "how the sample is constructed and its known biases",
    why: "A device panel is not the population. A pilot that cannot answer coverage and bias will produce a confident wrong number.",
  },
  {
    id: "consent_provenance",
    registerPhrase: "consent provenance for the underlying subjects",
    why: "PDPL applies to the subjects behind the panel, and we are not their controller. Buying an aggregate does not launder the basis it was built on.",
  },
  {
    id: "aggregation_threshold",
    registerPhrase: "minimum aggregation threshold",
    why: "Below a threshold an aggregate re-identifies. The threshold has to be the vendor's stated one, not ours applied after the fact.",
  },
  {
    id: "controller_roles",
    registerPhrase: "controller and processor roles",
    why: "Roles decide who answers a data subject and who is liable. An unstated role is disputed at exactly the wrong moment.",
  },
  {
    id: "storage_location",
    registerPhrase: "storage location",
    why: "Where the data rests decides which regulator is asking.",
  },
  {
    id: "cross_border",
    registerPhrase: "cross-border transfer basis",
    why: "PDPL Article 29 requires a stated basis before a transfer, not after one.",
  },
  {
    id: "audit_rights",
    registerPhrase: "audit rights",
    why: "A claim we cannot audit is a claim we are repeating rather than verifying, which is the opposite of what this product is.",
  },
  {
    id: "deletion_on_termination",
    registerPhrase: "deletion on termination",
    why: "A licence that ends without deletion leaves a derived figure on a page whose right expired.",
  },
  {
    id: "no_user_level_output",
    registerPhrase: "an explicit prohibition on user-level output",
    why: "The prohibition has to be in the contract, not only in our code, because our code is the thing being reviewed when the question is asked.",
  },
];

/**
 * The seven clauses that govern sending text a user typed to any location
 * provider. Settled in ADV-5A and gated by `PROCESSING_AGREEMENTS_IN_FORCE`.
 *
 * Deliberately a separate list from the mobility one. A routing licence says
 * nothing about a search-query licence, and neither implies the AI agreement.
 */
export const PROCESSING_CLAUSES: readonly SufficiencyClause[] = [
  {
    id: "processing_terms",
    registerPhrase: "the processing terms",
    why: "The terms are the agreement. Everything below is a question the terms either answer or do not.",
  },
  {
    id: "controller_or_processor",
    registerPhrase:
      "whether the provider is a controller or a processor for the query text",
    why: "A provider acting as its own controller may use a tenant's typed query for its own purposes.",
  },
  {
    id: "storage_and_cross_border",
    registerPhrase: "the storage location and cross-border basis",
    why: "A search query can name a brand, a budget or an unannounced expansion, and it leaves the country before it is answered.",
  },
  {
    id: "query_retention",
    registerPhrase: "the retention period applied to queries",
    why: "Retention decides whether a query is a transient lookup or a record held by a third party.",
  },
  {
    id: "display_form",
    registerPhrase:
      "whether the answer may be displayed, and in redisplayed or derived form",
    why: "Redisplay and derived display are two permissions. The travel-time defect ADV-5A found needed the second and checked neither.",
  },
  {
    id: "caching",
    registerPhrase: "whether it may be cached, and for how long",
    why: "A day-long cache is storage whatever the framework calls the option.",
  },
  {
    id: "attribution_string",
    registerPhrase: "the required attribution string",
    why: "An attribution invented at the render site is a breach with good intentions.",
  },
];

export type AgreementRecord = {
  /** Join key into `source_registry`, the same id the registry declares. */
  sourceId: string;
  /** Who recorded it. Owner action, never inferred from a deployment setting. */
  recordedBy: string;
  /** ISO date the answers were recorded. */
  recordedOn: string;
  /**
   * Clause id to the recorded answer. A key present with an empty or whitespace
   * value is not an answer: it is a tick with extra steps, and it is treated as
   * unanswered.
   */
  answers: Partial<Record<ClauseId, string>>;
};

/**
 * EMPTY, AND NOT AN OVERSIGHT.
 *
 * Owner ruling 7: no vendor is contacted, nothing is purchased, nothing is
 * signed, and no entry here represents that a right exists. The list is the
 * interface the owner fills in after an agreement exists, and until then every
 * mobility and every user-text call fails sufficiency with all clauses
 * unanswered.
 */
export const RECORDED_AGREEMENTS: readonly AgreementRecord[] = [];

export type SufficiencyVerdict = {
  sufficient: boolean;
  /** Every unanswered clause, not the first. */
  unanswered: ClauseId[];
  /**
   * Internal only, on the same rule as `denialReason` and the boundary reasons:
   * this quotes contract reasoning and is never rendered to a caller.
   */
  reasons: string[];
};

const answered = (rec: AgreementRecord | undefined, id: ClauseId): boolean => {
  const v = rec?.answers?.[id];
  return typeof v === "string" && v.trim() !== "";
};

/**
 * Assess one source against one clause list.
 *
 * EVERY FAILURE IS COLLECTED, not the first. The boundary short-circuits because
 * the first rights denial is the whole answer and asking further questions of a
 * source we may not call is theatre. This is the opposite situation: the caller
 * is a reviewer deciding whether an agreement is worth signing, and being told
 * one gap at a time across twelve rounds is how a negotiation ends with eleven
 * of them still open.
 */
export function assessAgreement(
  sourceId: string,
  clauses: readonly SufficiencyClause[],
  records: readonly AgreementRecord[] = RECORDED_AGREEMENTS
): SufficiencyVerdict {
  const rec = records.find((r) => r.sourceId === sourceId);
  const reasons: string[] = [];

  if (!rec) {
    reasons.push(
      `${sourceId}: no agreement is recorded, so no clause is answered`
    );
    return {
      sufficient: false,
      unanswered: clauses.map((c) => c.id),
      reasons,
    };
  }

  const unanswered = clauses.filter((c) => !answered(rec, c.id)).map((c) => c.id);
  for (const id of unanswered) {
    const c = clauses.find((x) => x.id === id) as SufficiencyClause;
    reasons.push(`${sourceId}: '${c.registerPhrase}' is unanswered. ${c.why}`);
  }
  if (unanswered.length === 0) {
    reasons.push(
      `${sourceId}: every clause is answered, recorded by ${rec.recordedBy} on ${rec.recordedOn}`
    );
  }
  return { sufficient: unanswered.length === 0, unanswered, reasons };
}

/** Sufficiency for a mobility or visitation figure. */
export function assessMobilityAgreement(
  sourceId: string,
  records: readonly AgreementRecord[] = RECORDED_AGREEMENTS
): SufficiencyVerdict {
  return assessAgreement(sourceId, MOBILITY_CLAUSES, records);
}

/** Sufficiency for sending text a user typed to a location provider. */
export function assessProcessingAgreement(
  sourceId: string,
  records: readonly AgreementRecord[] = RECORDED_AGREEMENTS
): SufficiencyVerdict {
  return assessAgreement(sourceId, PROCESSING_CLAUSES, records);
}
