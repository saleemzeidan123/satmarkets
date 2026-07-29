import type { PromptPart } from "@/lib/aiBoundary";

// ADV-3A. A message that carries its own classification.
//
// The problem this solves is not that the old code forgot to classify. It is
// that the old code classified a DESCRIPTION of the request while sending the
// request. `/api/advisor` handed `ADVISOR_PROMPT_PARTS` to the boundary and a
// separate `messages` array to the provider, and nothing in the language, the
// type system or the tests connected the two. The declaration stayed true only
// while somebody remembered to update it.
//
// So a message here is content plus the classes that content carries, in one
// value, and the gateway derives what it checks from what it sends. There is no
// second list to keep in step.
//
// ADV-3A.1. THE FIRST VERSION OF THIS FILE DID NOT DO WHAT ITS DOCUMENTATION
// CLAIMED.
//
// It offered `instruction(label, template, slots)`, where `template` was an
// ordinary string parameter. The closure record then claimed that undeclared
// interpolation was impossible. It was not. Nothing stopped:
//
//     instruction("classifier", SYS + "\n\nUser said: " + query)
//     instruction("classifier", `${SYS} ${tenantRequirement}`)
//
// Both compile, both run, and the boundary sees one part classified
// `own_instruction`. The placeholder machinery only governed values passed
// through the `slots` argument; it had nothing to say about a string composed
// before the call. The guarantee was a convention with a type signature draped
// over it.
//
// The API below removes the string parameter entirely. An instruction is built
// by a tagged template, so JavaScript itself hands this module the fixed spans
// and the interpolated values as separate arrays. The only way to put a runtime
// value into a prompt is `classifiedSlot(value, parts)`, which forces the caller
// to say what the value IS.
//
// ADV-3B. The interpolation parameter is typed `readonly ClassifiedSlot[]` rather
// than `readonly unknown[]`, so an undeclared value is a compile error at the
// call site and not only a throw at run time. The first version of this file took
// `unknown` and the closure record still said the type checker rejected a raw
// value; it did not, because everything is assignable to `unknown`. That was the
// same shape of overstatement Codex found in the rest of the package, one layer
// down. The runtime check in `assemble` stays, because a caller can still reach
// this through `any`, through JSON, or from JavaScript, and the throw is what
// catches those.
//
// There is deliberately no `fixedText(someString)` convenience. It would be one
// line and it would reopen exactly the hole this closes.
//
// `ClassifiedMessage` and `ClassifiedSlot` are also nominally branded with
// module-private symbols. Before, both were plain structural types, so any object
// literal with the right three fields was accepted everywhere a classified value
// was. Now the key cannot be named outside this file.

export type Role = "system" | "user" | "assistant";

// Not exported. That is the entire mechanism: application code cannot write a
// property it cannot name, so it cannot forge one of these with a literal.
const MESSAGE_BRAND = Symbol("sat.ai.classifiedMessage");
const SLOT_BRAND = Symbol("sat.ai.classifiedSlot");

export type ClassifiedMessage = {
  readonly [MESSAGE_BRAND]: true;
  readonly role: Role;
  readonly content: string;
  /** Every distinguishable thing this message carries. Never empty. */
  readonly parts: readonly PromptPart[];
};

/** A runtime value cleared for interpolation into a prompt, with what it carries. */
export type ClassifiedSlot = {
  readonly [SLOT_BRAND]: true;
  readonly value: string;
  readonly parts: readonly PromptPart[];
};

export class UnclassifiedMessageError extends Error {}

function isSlot(v: unknown): v is ClassifiedSlot {
  return typeof v === "object" && v !== null && (v as Record<symbol, unknown>)[SLOT_BRAND] === true;
}

/** True for a value this module built. Used by the gateway, not by callers. */
export function isClassifiedMessage(v: unknown): v is ClassifiedMessage {
  return typeof v === "object" && v !== null && (v as Record<symbol, unknown>)[MESSAGE_BRAND] === true;
}

/**
 * Clear a runtime value for use inside a prompt.
 *
 * This is the only door. Everything that is not a fixed span written into a
 * template literal in the source comes through here, and it cannot be called
 * without naming at least one data class, which is the point.
 */
export function classifiedSlot(value: string, parts: readonly PromptPart[]): ClassifiedSlot {
  if (!parts.length) {
    throw new UnclassifiedMessageError("ai/message: a slot was built with no declared data class");
  }
  return { [SLOT_BRAND]: true, value: String(value), parts };
}

/**
 * Fixed instruction text that itself contains slots.
 *
 * Long system prompts branch: an Arabic clause here, an English one there, an
 * optional paragraph that only applies when live context exists. Without this,
 * the alternative is one enormous template per branch combination, duplicated per
 * language, which is how two languages drift apart in behaviour.
 *
 * Every span of a `phrase` is written in the source, so it is our own instruction
 * text; anything interpolated into it must itself be a slot, recursively.
 */
export function phrase(strings: TemplateStringsArray, ...values: readonly ClassifiedSlot[]): ClassifiedSlot {
  const built = assemble("phrase", strings, values);
  return {
    [SLOT_BRAND]: true,
    value: built.content,
    parts: built.parts.length ? built.parts : [{ label: "instruction text", dataClass: "own_instruction" }],
  };
}

function assemble(
  label: string,
  strings: TemplateStringsArray,
  values: readonly unknown[]
): { content: string; parts: PromptPart[] } {
  if (!strings || !Array.isArray(strings.raw)) {
    throw new UnclassifiedMessageError(
      `ai/message: '${label}' must be used as a tagged template, not called with a composed string`
    );
  }
  const parts: PromptPart[] = [];
  let content = strings[0] ?? "";
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!isSlot(v)) {
      // The whole correction, in one branch. A string, a number, a template
      // literal built elsewhere, a variable holding a tenant's requirement: all
      // of them land here and none of them go any further.
      throw new UnclassifiedMessageError(
        `ai/message: '${label}' interpolated an undeclared value at position ${i + 1}. ` +
          `Wrap it in classifiedSlot(value, parts) and say what it is.`
      );
    }
    content += v.value + (strings[i + 1] ?? "");
    parts.push(...v.parts);
  }
  return { content, parts };
}

/**
 * A system prompt SAT authored.
 *
 *     instruction("advisor classifier")`Return JSON. Context: ${classifiedSlot(ctx, [...])}`
 *
 * The fixed spans are our own instruction text. Every interpolation is a
 * `ClassifiedSlot` and contributes its own parts to the message, so an
 * instruction that quotes live data declares that data separately and the
 * boundary sees it.
 */
export function instruction(label: string) {
  return function tag(strings: TemplateStringsArray, ...values: readonly ClassifiedSlot[]): ClassifiedMessage {
    const built = assemble(`instruction '${label}'`, strings, values);
    return {
      [MESSAGE_BRAND]: true,
      role: "system",
      content: built.content,
      parts: [{ label, dataClass: "own_instruction" }, ...built.parts],
    };
  };
}

/** The person's own message, going to the model on their behalf. */
export function userWords(content: string, label = "user message"): ClassifiedMessage {
  return {
    [MESSAGE_BRAND]: true,
    role: "user",
    content,
    parts: [{ label, dataClass: "user_own_words" }],
  };
}

/**
 * One of the person's OWN earlier turns.
 *
 * ADV-3A.1. This replaces `priorTurn(role, content)`, which took an assistant
 * reply and classified it `user_own_words`. An assistant reply is not the user's
 * own words. It is model output, and it may restate a licensed figure, a platform
 * record or something the model invented. Classifying it as the user's own words
 * gave model output a route out of the process under a class it had no claim to,
 * and gave a fabricated figure a second life as apparent user-supplied context.
 *
 * There is deliberately no constructor for an assistant turn. Until conversation
 * history retains typed provenance per turn, assistant text does not go to an
 * external model at all, so the honest shape is that the function does not exist.
 */
export function priorUserTurn(content: string): ClassifiedMessage {
  return {
    [MESSAGE_BRAND]: true,
    role: "user",
    content,
    parts: [{ label: "the users earlier message", dataClass: "user_own_words" }],
  };
}

/** The general form. Requires at least one declared part, which is the whole point. */
export function classified(role: Role, content: string, parts: readonly PromptPart[]): ClassifiedMessage {
  if (!parts.length) {
    throw new UnclassifiedMessageError(`ai/message: a ${role} message was built with no declared data class`);
  }
  return { [MESSAGE_BRAND]: true, role, content, parts };
}

/**
 * The parts a set of messages carries.
 *
 * This is the function that makes the boundary check the request rather than a
 * description of it. The gateway calls it on the exact array it is about to send.
 */
export function partsOf(messages: readonly ClassifiedMessage[]): PromptPart[] {
  const out: PromptPart[] = [];
  for (const m of messages) {
    if (!isClassifiedMessage(m)) {
      throw new UnclassifiedMessageError(
        "ai/message: a value reached the gateway that this module did not build, so nothing declared what it carries"
      );
    }
    if (!m.parts.length) {
      throw new UnclassifiedMessageError(`ai/message: a ${m.role} message reached the gateway with no declared data class`);
    }
    out.push(...m.parts);
  }
  return out;
}
