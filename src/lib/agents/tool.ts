import type { PromptPart } from "@/lib/aiBoundary";
import { classifiedSlot, type ClassifiedSlot } from "@/lib/ai/message";

// ADV-3B. What a SAT tool is.
//
// An agent is a model with a list of things it may ask the platform to do. The
// list is the whole design; the model is the least interesting part of it. So
// this file is about four properties, each of which is enforced by a shape
// rather than described in a prompt.
//
// 1. A TOOL CANNOT WRITE ANYTHING CONSEQUENTIAL.
//
// `ToolEffect` is `read | compute | propose` and there is deliberately no
// `write` member. A tool that would change a listing, send a message, book a
// viewing or move a transaction cannot be expressed in this type at all, so
// "no autonomous consequential writes" is not a rule somebody has to keep. A
// `propose` returns a draft for a person to accept, and returning a draft is
// what it does; it is not a write with an approval step bolted on afterwards.
//
// 2. A TOOL RESULT IS PROMPT MATERIAL, AND IT CARRIES ITS OWN CLASSIFICATION.
//
// This is the hole ADV-3B would otherwise open in everything ADV-3A.1 just
// closed. The obvious agent loop is: model asks for a tool, the tool returns
// platform data, the loop appends the result to the transcript as an
// observation, and the observation goes back to the provider on the next turn
// as ordinary instruction text. The boundary sees `own_instruction` and the
// private material walks straight out.
//
// So a `ToolResult` carries `parts`, exactly as a `ClassifiedMessage` does, and
// `toolResultSlot()` is the only route from a result into a prompt. It builds a
// `ClassifiedSlot` from those parts, and `src/lib/ai/message.ts` will not
// interpolate anything else. A tool that returns unpublished platform rows
// therefore denies at the gateway while the agreement gate is closed, which is
// the correct behaviour and not a regression.
//
// 3. A MODEL'S TOOL CALL IS UNTRUSTED INPUT, SO IT IS PARSED RATHER THAN CAST.
//
// "Typed tools" is worth nothing if the type exists only in the source. What
// arrives is JSON a language model produced, and it will at some point contain
// a string where a number belongs, a district that does not exist, a null, or
// an object with the right keys and the wrong meanings. `parse` is required on
// every tool and returns a rejection rather than throwing, so a malformed call
// is a turn the agent can recover from instead of a five hundred.
//
// 4. FIGURES ARE VOUCHED FOR BY THE TOOL THAT PRODUCED THEM.
//
// Law 3: AI never generates a rent figure, price or market statistic. The
// advisor already enforces a version of this with `unsourcedFigure` against an
// allowed-source string. An agent has more ways to produce a number, so a result
// declares `figures`: the numbers this tool stands behind. The final answer may
// contain a figure only if some tool vouched for it or the person typed it.
// A number the model composed from two it was given is not a number it was
// given, which is the point of checking values rather than trusting arithmetic.

export type ToolEffect =
  /** Retrieve records that already exist. Changes nothing. */
  | "read"
  /** Derive a value from inputs by deterministic code. Touches no store. */
  | "compute"
  /** Produce a draft for a person to accept, edit or discard. Commits nothing. */
  | "propose";

/** Machine-readable rejection reasons, so a caller can branch without string matching. */
export type ToolFailure =
  /** The model's arguments did not parse against the tool's schema. */
  | "bad_input"
  /** The actor is not permitted to call this tool. Decided before the tool runs. */
  | "not_permitted"
  /** The tool ran and found nothing. Not an error; an answer. */
  | "not_found"
  /** A store or dependency failed. */
  | "unavailable";

export type ToolOk<T> = {
  ok: true;
  value: T;
  /** The result as the model should see it. Never the raw row. */
  text: string;
  /** What that text carries. Never empty; `defineTool` refuses an empty declaration. */
  parts: readonly PromptPart[];
  /** Every number this tool stands behind, as it stands behind it. */
  figures: readonly number[];
};

export type ToolErr = {
  ok: false;
  failure: ToolFailure;
  /** A sentence the agent may relay. Carries no record content. */
  text: string;
};

export type ToolResult<T> = ToolOk<T> | ToolErr;

export type ParseResult<I> = { ok: true; input: I } | { ok: false; problem: string };

/**
 * What a tool is allowed to reach, and on whose behalf.
 *
 * `actor` is resolved by the caller from the session, never from anything the
 * model said. A model that asks to run as staff is asking, not becoming.
 */
export type ToolContext = {
  actor: Actor;
  locale: "en" | "ar";
  signal?: AbortSignal;
};

export type ActorRole =
  /** Nobody signed in. Public inventory only. */
  | "anonymous"
  /** Signed in, looking for space. May see their own requirements. */
  | "tenant"
  /** Signed in, listing space. May see their own listings and drafts. */
  | "lister"
  /** A lister whose ownership is evidenced. May see their own verification state. */
  | "verified_lister"
  /** SAT operations. May see operational aggregates. */
  | "staff";

export type Actor = {
  role: ActorRole;
  /** The party id, when there is one. Tools scope "own" reads with it. */
  partyId?: string;
};

/**
 * Capabilities a tool may require.
 *
 * These are coarse on purpose. A capability answers "what kind of material does
 * this reach", not "which record", because per-record authorisation belongs in
 * the query, where a mistake is a missing row rather than a leaked one.
 */
export type Capability =
  /** Published inventory and published market material. */
  | "read_public"
  /** The signed-in party's own records, scoped by `partyId`. */
  | "read_own"
  /** Unpublished platform records. Staff only. */
  | "read_platform"
  /** Produce a draft addressed to the signed-in party's own records. */
  | "propose_own"
  /** Operational aggregates and pipeline state. Staff only. */
  | "read_operations";

export type SatTool<I, O> = {
  /** Stable name. This is the string a model emits, so it never changes casually. */
  name: string;
  effect: ToolEffect;
  /** Required capability. Checked before `parse`, and before the tool is offered. */
  capability: Capability;
  /** One line per language, describing the tool to the model and to a reader. */
  summary: { en: string; ar: string };
  /** Validate untrusted arguments. Must not throw. */
  parse(raw: unknown): ParseResult<I>;
  /** Do the work. Deterministic: a tool never calls a model. */
  run(input: I, ctx: ToolContext): Promise<ToolResult<O>>;
};

export class ToolDefinitionError extends Error {}

const NAME = /^[a-z][a-z0-9_]{2,39}$/;

/**
 * Register a tool, checking the things that are cheap to check now and expensive
 * to discover later.
 *
 * The `ok` branch of `run` is wrapped so a result cannot be returned with no
 * declared parts. Without that, the first tool written in a hurry would return
 * `{ ok: true, value, text, parts: [] }`, `toolResultSlot` would throw at the
 * point of use rather than at the point of the mistake, and the fix would land
 * in the loop instead of in the tool.
 */
export function defineTool<I, O>(t: SatTool<I, O>): SatTool<I, O> {
  if (!NAME.test(t.name)) {
    throw new ToolDefinitionError(`agents/tool: '${t.name}' is not a valid tool name`);
  }
  if (!t.summary.en.trim() || !t.summary.ar.trim()) {
    throw new ToolDefinitionError(`agents/tool: '${t.name}' must describe itself in both languages`);
  }
  const inner = t.run;
  return {
    ...t,
    async run(input: I, ctx: ToolContext): Promise<ToolResult<O>> {
      const r = await inner(input, ctx);
      if (r.ok && !r.parts.length) {
        throw new ToolDefinitionError(
          `agents/tool: '${t.name}' returned a result with no declared data class, so nothing says what it carries`
        );
      }
      return r;
    },
  };
}

/**
 * The only route from a tool result into a model prompt.
 *
 * There is deliberately no overload taking a plain string. A caller who wants to
 * paraphrase a result into the transcript has to classify the paraphrase, which
 * is the correct amount of friction: a summary of unpublished rows is still
 * unpublished rows.
 */
export function toolResultSlot(name: string, r: ToolOk<unknown>): ClassifiedSlot {
  return classifiedSlot(`${name}: ${r.text}`, r.parts);
}

/** Convenience for the common shape, so a tool body reads as its own logic. */
export function ok<T>(value: T, text: string, parts: readonly PromptPart[], figures: readonly number[] = []): ToolOk<T> {
  return { ok: true, value, text, parts, figures };
}

export function err(failure: ToolFailure, text: string): ToolErr {
  return { ok: false, failure, text };
}
