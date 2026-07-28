import {
  maySendToModel,
  type ModelInputPolicy,
  type SourceRights,
} from "@/lib/sourceRights";

// ADV-0. The AI data-classification boundary.
//
// This is the code answer to a question the strategy asked as a contract
// question: what may leave our process for a third party's model.
//
// The distinction matters more than it sounds. A system prompt that says "never
// reveal private documents" is an instruction to a model, and a model is not a
// permission system. It can be talked out of an instruction, it can be given a
// document it was told not to reveal and reveal it by accident, and it cannot
// enforce anything about the request that was made before it saw the text. A
// classification boundary is different in kind: the material never enters the
// request. The provider does not decline to use it; the provider never receives
// it.
//
// So every piece of context assembled for an external model passes through
// `buildExternalPrompt` and carries a declared class. Undeclared material has no
// route to an external provider that does not go through this file.
//
// Two gates, both of which must pass, because they answer different questions:
//
//   1. THE PROVIDER GATE. Have we an agreement with the provider that covers
//      training, retention, region, subprocessors, deletion and incident notice.
//      Today: no. `AI_AGREEMENT_IN_FORCE` is false.
//   2. THE SOURCE GATE. Does the licence behind this specific material permit it
//      to be sent to a third party at all. Today: no source does, which is what
//      `source_registry.model_input_policy` records.
//
// A source we may publish to the world can still be barred from a model, and a
// provider agreement does not create a licence we never had. Neither gate is a
// weaker version of the other.

/**
 * Whether an enterprise AI agreement covering our data is in force.
 *
 * Deliberately a compile-time constant and deliberately NOT read from the
 * environment. An environment variable is the wrong shape for this: it can be
 * set by anyone with deploy access, it can be set by accident, it can differ
 * between preview and production, and none of those are properties you want in
 * the switch that decides whether private documents cross a border. Flipping
 * this is a code change, in a commit, next to the agreement reference.
 *
 * Requirements a sufficient agreement must cover are listed in
 * `docs/regulatory-register.md`, Part D.
 */
export const AI_AGREEMENT_IN_FORCE = false;

/**
 * Minimum group size before an aggregate over people or parties may leave.
 * Below this, a count is not an aggregate, it is a description of a small number
 * of identifiable parties wearing an aggregate's clothes.
 */
export const AGGREGATE_MIN = 10;

export type ModelDestination = "internal" | "external";

/**
 * What a piece of context IS, which is the question that decides where it may
 * go. Not what it is about, and not how sensitive it feels.
 */
export type DataClass =
  /** Already rendered on a public page. Sending it to a model discloses nothing new. */
  | "public_published"
  /**
   * The user's own message, their own earlier turns, or copy they authored
   * themselves and submitted themselves for processing, going back on their
   * behalf. The test is authorship plus submission by the same party, not the
   * shape of the text: a lister who writes a listing description and asks for it
   * in Arabic is sending their own words exactly as a chat user is.
   */
  | "user_own_words"
  /**
   * Text SAT itself authored as an instruction to the model. A system prompt, a
   * schema description, a house-style rule.
   *
   * This class exists so that a system prompt has an honest name. Before it, the
   * prompt was the one part of a request that carried no declaration at all,
   * which is a strange hole in a boundary whose whole argument is that undeclared
   * material has no route out. It carries no party data, no platform record and
   * no licensed figure, so it is permitted unconditionally, and what it discloses
   * to the provider is our own prompt engineering.
   *
   * The laundering risk is obvious and is closed structurally rather than by
   * care: `src/lib/ai/message.ts` will not interpolate a value into an
   * instruction except through a slot, and a slot carries its own declared parts.
   * So an instruction that quotes live data declares that data separately, and an
   * instruction with an unfilled placeholder throws instead of being sent.
   */
  | "own_instruction"
  /** A count or aggregate over platform data. Governed by AGGREGATE_MIN when it is over parties. */
  | "aggregate_count"
  /** Operational platform data that is real but unpublished. Enquiry volumes, internal status, drafts. */
  | "platform_internal"
  /** Personal data of any party: contact details, messages between parties, identity attributes. */
  | "party_personal"
  /** Verification evidence: deeds, identity documents, authorization letters, uploaded files. */
  | "verification_evidence"
  /** Material governed by a registered source licence. Requires sourceId and a fidelity. */
  | "licensed_source";

export type PromptPart = {
  /** Short human label, used in the denial reason and in logs. Never the content itself. */
  label: string;
  dataClass: DataClass;
  /** Required when dataClass is 'licensed_source'. */
  sourceId?: string;
  /** How much of the licensed material this part carries. Defaults to the strictest reading, 'full'. */
  fidelity?: ModelInputPolicy;
  /** Group size, when dataClass is 'aggregate_count' and the aggregate is over parties. */
  n?: number;
  /** True when the aggregate counts people, organizations or their behaviour rather than inventory. */
  overParties?: boolean;
};

export type BoundaryDecision = {
  allowed: boolean;
  /** Always present. On an allow it says why it was permitted, so a log line is legible either way. */
  reason: string;
};

export type BoundaryContext = {
  destination: ModelDestination;
  /** Rights rows for any licensed_source parts, keyed by source_id. Absent keys deny. */
  rights?: Map<string, SourceRights>;
  /** Override only for tests that exercise the post-agreement branch. Production reads the constant. */
  agreementInForce?: boolean;
};

/**
 * May this one part leave the process for this destination.
 *
 * Every unrecognised class denies. That matters more than it looks: a future
 * package that adds a class and forgets to add a rule here gets a denial and a
 * failing test, not a silent grant.
 */
export function mayLeaveProcess(
  part: PromptPart,
  ctx: BoundaryContext
): BoundaryDecision {
  // Internal destination means our own process and our own infrastructure.
  // Nothing crosses a boundary, so nothing is gated here. The reason string is
  // still returned so that callers log the same shape either way.
  if (ctx.destination === "internal") {
    return { allowed: true, reason: `${part.label}: internal destination, no external disclosure` };
  }

  const agreement = ctx.agreementInForce ?? AI_AGREEMENT_IN_FORCE;

  switch (part.dataClass) {
    case "public_published":
      return { allowed: true, reason: `${part.label}: already published publicly` };

    case "user_own_words":
      return { allowed: true, reason: `${part.label}: the users own words, sent on their behalf` };

    case "own_instruction":
      return { allowed: true, reason: `${part.label}: our own instruction to the model, carrying no party or licensed material` };

    case "aggregate_count": {
      if (!part.overParties) {
        return { allowed: true, reason: `${part.label}: aggregate over inventory, not over parties` };
      }
      const n = typeof part.n === "number" && Number.isFinite(part.n) ? part.n : 0;
      if (n >= AGGREGATE_MIN) {
        return { allowed: true, reason: `${part.label}: aggregate over ${n} parties, at or above the minimum group size` };
      }
      return {
        allowed: false,
        reason: `${part.label}: aggregate over ${n} parties is below the minimum group size of ${AGGREGATE_MIN} and could identify them`,
      };
    }

    case "platform_internal":
      return agreement
        ? { allowed: true, reason: `${part.label}: unpublished platform data, permitted under the provider agreement` }
        : { allowed: false, reason: `${part.label}: unpublished platform data may not reach an external provider before an enterprise AI agreement is in force` };

    case "party_personal":
      return agreement
        ? { allowed: true, reason: `${part.label}: personal data, permitted under the provider agreement and its PDPL terms` }
        : { allowed: false, reason: `${part.label}: personal data may not reach an external provider before an enterprise AI agreement is in force` };

    case "verification_evidence":
      return agreement
        ? { allowed: true, reason: `${part.label}: verification evidence, permitted under the provider agreement` }
        : { allowed: false, reason: `${part.label}: verification evidence may not reach an external provider before an enterprise AI agreement is in force` };

    case "licensed_source": {
      const id = part.sourceId ?? "";
      if (!id) {
        return { allowed: false, reason: `${part.label}: licensed material with no source_id has no recorded rights` };
      }
      const rights = ctx.rights?.get(id);
      if (!rights) {
        return { allowed: false, reason: `${part.label}: no rights row for ${id}, so no model-input right exists` };
      }
      const need = part.fidelity ?? "full";
      if (!maySendToModel(rights, need)) {
        return { allowed: false, reason: `${part.label}: ${id} does not permit model input at '${need}'` };
      }
      if (!agreement) {
        return { allowed: false, reason: `${part.label}: ${id} permits model input at '${need}', but no enterprise AI agreement is in force` };
      }
      return { allowed: true, reason: `${part.label}: ${id} permits model input at '${need}' and the provider agreement is in force` };
    }

    default:
      return { allowed: false, reason: `${part.label}: unrecognised data class, denied` };
  }
}

export type PromptDecision =
  | { allowed: true; parts: PromptPart[]; reasons: string[] }
  | { allowed: false; denials: string[]; reasons: string[] };

/**
 * The only sanctioned way to assemble context for an external model.
 *
 * A single denied part fails the WHOLE request. It deliberately does not drop
 * the offending part and send the rest, because a model given a context with a
 * hole in it does not know the hole is there: it answers anyway, from the
 * remaining material plus whatever it invents to bridge the gap. A partial
 * context is not a safer context, it is a context that produces a confident
 * wrong answer instead of a refusal.
 *
 * Callers handle a denial by degrading deterministically, which is a pattern the
 * platform already uses: the advisor falls back to a written sentence asking for
 * a location and asset type rather than guessing a figure.
 */
export function buildExternalPrompt(
  parts: PromptPart[],
  ctx?: Omit<BoundaryContext, "destination">
): PromptDecision {
  const full: BoundaryContext = { ...(ctx ?? {}), destination: "external" };
  const reasons: string[] = [];
  const denials: string[] = [];
  for (const p of parts) {
    const d = mayLeaveProcess(p, full);
    reasons.push(d.reason);
    if (!d.allowed) denials.push(d.reason);
  }
  if (denials.length) return { allowed: false, denials, reasons };
  return { allowed: true, parts, reasons };
}

// WHY THERE IS NO LONGER A DECLARED LIST OF ADVISOR PROMPT PARTS.
//
// There used to be one: `ADVISOR_PROMPT_PARTS`, a hand-written array naming the
// four things `/api/advisor` sends. `llm()` passed that array to
// `buildExternalPrompt` and, if it came back allowed, sent an entirely separate
// `messages` array to the provider.
//
// So the boundary checked a description of the request rather than the request.
// Nothing tied the two together. Adding a field to the messages array did not
// change the declaration, adding a class to the declaration did not change the
// messages, and neither the type checker nor a test could see the two drift
// apart. The declaration was a claim about the code, kept true by remembering.
//
// ADV-3A replaced it with derivation. A message carries its own parts
// (`src/lib/ai/message.ts`), the gateway derives the parts it checks from the
// messages it is about to send (`src/lib/ai/gateway.ts`), and a message with no
// declared parts cannot be constructed. The checked list and the sent list are
// now the same object, so they cannot disagree.
