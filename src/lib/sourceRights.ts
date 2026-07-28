// ADV-0. The permission boundary for every external source in source_registry.
//
// This module is deliberately pure: no React, no Supabase, no I/O. The loader
// lives in `src/lib/queries/sourceRights.ts`. The split is not tidiness. A
// permission rule that can only be exercised inside a request context is a rule
// that cannot be unit tested, and an untested fail-closed rule is a fail-closed
// rule in name only.
//
// The table records what each licence permits. This module is the only place
// that is allowed to answer the question "may we". It exists because the
// dangerous failure in a rights system is never a loud one. It is a row that was
// never reviewed being read as a row that said yes, a lookup that threw and
// returned undefined, a status string nobody recognised falling through a switch
// into the permissive branch.
//
// So every function here fails closed, and it fails closed at each of three
// independent points:
//
//   1. The row is missing, or the query threw, or Supabase is not configured.
//      -> DENIED. An unknown source has no rights. Not "probably fine because
//         the other sources are fine".
//   2. The stored value is not a value we recognise. A typo, a future enum
//      member this build predates, a null.
//      -> coerced to the most restrictive member, not to a default that happens
//         to sit first in a type union by accident.
//   3. rights_status overrides the policy columns downward, never upward.
//      -> 'unknown' and 'prohibited' deny everything. 'asserted_unverified'
//         permits internal use at most, because a right we believe in and cannot
//         evidence is not a right we may exercise in public.
//
// Nothing here ever grants. A caller cannot pass a flag that widens a policy,
// and there is deliberately no override parameter. Widening happens in one
// place only: a migration that records new licence evidence, reviewed by a
// person, with the licence text quoted in licence_ref.
//
// Law 3 is the same discipline one layer up: an absent figure is stated as
// unavailable, never guessed. An absent permission is treated as absent, never
// assumed.

export type UsePolicy = "none" | "internal" | "public";
export type ModelInputPolicy = "none" | "redacted" | "sample_only" | "full";
export type RightsStatus =
  | "unknown"
  | "asserted_unverified"
  | "evidenced"
  | "prohibited";

/** Who the output is for. There is no third audience; "logged-in" is not a licence term. */
export type Audience = "internal" | "public";

export type SourceRights = {
  sourceId: string;
  /** May we hold it: none | id_only | full. Pre-existing column. */
  storagePolicy: "none" | "id_only" | "full";
  /** May we show the source's OWN published value. Pre-existing column. */
  redisplayPolicy: UsePolicy;
  /** May we publish a value we COMPUTED from it. Not the same question. */
  derivedDisplayPolicy: UsePolicy;
  /** May a user carry the value out, in a decision pack, a CSV, a PDF. */
  exportPolicy: UsePolicy;
  /** May the assistant retrieve the value and state it in an answer. */
  aiRetrievalPolicy: UsePolicy;
  /** How much of it may leave our process for a third-party model. */
  modelInputPolicy: ModelInputPolicy;
  rightsStatus: RightsStatus;
  stopCondition: string | null;
  reviewedAt: string | null;
  reviewedNote: string | null;
};

const USE_POLICIES: readonly UsePolicy[] = ["none", "internal", "public"];
const MODEL_POLICIES: readonly ModelInputPolicy[] = [
  "none",
  "redacted",
  "sample_only",
  "full",
];
const RIGHTS_STATUSES: readonly RightsStatus[] = [
  "unknown",
  "asserted_unverified",
  "evidenced",
  "prohibited",
];

const USE_RANK: Record<UsePolicy, number> = { none: 0, internal: 1, public: 2 };
const MODEL_RANK: Record<ModelInputPolicy, number> = {
  none: 0,
  redacted: 1,
  sample_only: 2,
  full: 3,
};
const AUDIENCE_RANK: Record<Audience, number> = { internal: 1, public: 2 };

const asUsePolicy = (v: unknown): UsePolicy =>
  USE_POLICIES.includes(v as UsePolicy) ? (v as UsePolicy) : "none";

const asModelPolicy = (v: unknown): ModelInputPolicy =>
  MODEL_POLICIES.includes(v as ModelInputPolicy)
    ? (v as ModelInputPolicy)
    : "none";

const asRightsStatus = (v: unknown): RightsStatus =>
  RIGHTS_STATUSES.includes(v as RightsStatus) ? (v as RightsStatus) : "unknown";

const asStoragePolicy = (v: unknown): SourceRights["storagePolicy"] =>
  v === "id_only" || v === "full" ? v : "none";

const asText = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v : null;

/**
 * The record a caller gets when the source is not in the registry at all.
 * Identical in behaviour to a source that was reviewed and denied, which is the
 * point: a source we have never heard of is not a source we may use.
 */
export function deniedRights(sourceId: string): SourceRights {
  return {
    sourceId,
    storagePolicy: "none",
    redisplayPolicy: "none",
    derivedDisplayPolicy: "none",
    exportPolicy: "none",
    aiRetrievalPolicy: "none",
    modelInputPolicy: "none",
    rightsStatus: "unknown",
    stopCondition: null,
    reviewedAt: null,
    reviewedNote: null,
  };
}

/** Parse a registry row. Anything unrecognised becomes the most restrictive member. */
export function parseSourceRights(row: unknown): SourceRights {
  if (!row || typeof row !== "object") return deniedRights("");
  const r = row as Record<string, unknown>;
  const sourceId = asText(r.source_id) ?? "";
  if (!sourceId) return deniedRights("");
  return {
    sourceId,
    storagePolicy: asStoragePolicy(r.storage_policy),
    redisplayPolicy: asUsePolicy(r.redisplay_policy),
    derivedDisplayPolicy: asUsePolicy(r.derived_display_policy),
    exportPolicy: asUsePolicy(r.export_policy),
    aiRetrievalPolicy: asUsePolicy(r.ai_retrieval_policy),
    modelInputPolicy: asModelPolicy(r.model_input_policy),
    rightsStatus: asRightsStatus(r.rights_status),
    stopCondition: asText(r.stop_condition),
    reviewedAt: asText(r.rights_reviewed_at),
    reviewedNote: asText(r.rights_reviewed_note),
  };
}

/**
 * The ceiling rights_status places on every use policy, regardless of what the
 * policy column says. Downward only.
 *
 *   prohibited          nothing, ever, until written permission is recorded.
 *   unknown             nothing. An unreviewed row behaves as a denied row.
 *   asserted_unverified internal at most. We believe it; we cannot prove it;
 *                       so it does not reach a page, an export or an answer.
 *   evidenced           no ceiling. The policy column decides.
 */
export function statusCeiling(status: RightsStatus): UsePolicy {
  switch (status) {
    case "evidenced":
      return "public";
    case "asserted_unverified":
      return "internal";
    case "unknown":
    case "prohibited":
      return "none";
  }
}

/** The effective policy after the status ceiling is applied. Never above either input. */
function effective(policy: UsePolicy, status: RightsStatus): UsePolicy {
  return USE_RANK[policy] <= USE_RANK[statusCeiling(status)]
    ? policy
    : statusCeiling(status);
}

function permits(policy: UsePolicy, r: SourceRights, audience: Audience): boolean {
  return USE_RANK[effective(policy, r.rightsStatus)] >= AUDIENCE_RANK[audience];
}

/** May we show the source's own published value to this audience. */
export const mayRedisplay = (r: SourceRights, audience: Audience) =>
  permits(r.redisplayPolicy, r, audience);

/** May we publish a value we computed from this source to this audience. */
export const mayDisplayDerived = (r: SourceRights, audience: Audience) =>
  permits(r.derivedDisplayPolicy, r, audience);

/** May a user carry this value out of the product. */
export const mayExport = (r: SourceRights, audience: Audience) =>
  permits(r.exportPolicy, r, audience);

/** May the assistant retrieve this value and state it in an answer. */
export const mayAiRetrieve = (r: SourceRights, audience: Audience) =>
  permits(r.aiRetrievalPolicy, r, audience);

/**
 * May material from this source be sent to an external model provider, at the
 * fidelity the caller needs.
 *
 * Only 'evidenced' opens this at all. asserted_unverified is not a partial yes
 * here the way it is for display, because the act is irreversible: once the
 * material has left our process under a permission we cannot evidence, no
 * later correction retrieves it. The registers exist to turn those rows into
 * evidenced ones; until then the answer is no.
 */
export function maySendToModel(
  r: SourceRights,
  need: ModelInputPolicy
): boolean {
  if (need === "none") return true;
  if (r.rightsStatus !== "evidenced") return false;
  return MODEL_RANK[r.modelInputPolicy] >= MODEL_RANK[need];
}

/**
 * Why a use was denied, in one sentence, for a log line or a register entry.
 * Returns null when the use is permitted. Callers must not render this to the
 * public: it quotes internal licence reasoning.
 */
export function denialReason(
  r: SourceRights,
  use: "redisplay" | "derived" | "export" | "ai_retrieval",
  audience: Audience
): string | null {
  const policy =
    use === "redisplay"
      ? r.redisplayPolicy
      : use === "derived"
        ? r.derivedDisplayPolicy
        : use === "export"
          ? r.exportPolicy
          : r.aiRetrievalPolicy;
  if (permits(policy, r, audience)) return null;
  const id = r.sourceId || "an unregistered source";
  if (r.rightsStatus === "prohibited")
    return `${id} is recorded as prohibited. ${r.stopCondition ?? "Written permission is required before any use."}`;
  if (r.rightsStatus === "unknown")
    return `${id} has no recorded rights review, so every use is denied until one exists.`;
  if (r.rightsStatus === "asserted_unverified" && audience === "public")
    return `${id} carries an asserted but unverified right, which does not extend to public use. ${r.stopCondition ?? ""}`.trim();
  return `${id} records ${use} as '${policy}', which does not reach ${audience}.`;
}

/** The columns the loader selects. Kept here so the shape and its parser stay together. */
export const SOURCE_RIGHTS_COLUMNS =
  "source_id, storage_policy, redisplay_policy, derived_display_policy, export_policy, ai_retrieval_policy, model_input_policy, rights_status, stop_condition, rights_reviewed_at, rights_reviewed_note";

/** Build the keyed map from whatever the loader returned. Bad rows are dropped, not defaulted. */
export function indexSourceRights(rows: unknown): Map<string, SourceRights> {
  const out = new Map<string, SourceRights>();
  if (!Array.isArray(rows)) return out;
  for (const row of rows) {
    const parsed = parseSourceRights(row);
    if (parsed.sourceId) out.set(parsed.sourceId, parsed);
  }
  return out;
}
