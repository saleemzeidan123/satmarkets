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
// The constructors below exist because the escape hatch has to be less
// convenient than the honest route. `userWords` and `priorTurn` are one-liners.
// `instruction` takes a template with `{{slot}}` placeholders and refuses to
// render an unfilled one, so live data reaches a system prompt only through a
// slot, and a slot declares its own parts. `classified` is the general form and
// throws on an empty parts list.

export type Role = "system" | "user" | "assistant";

export type ClassifiedMessage = {
  readonly role: Role;
  readonly content: string;
  /** Every distinguishable thing this message carries. Never empty. */
  readonly parts: readonly PromptPart[];
};

/** A value interpolated into an instruction, with the classes it carries. */
export type Slot = {
  key: string;
  value: string;
  parts: PromptPart[];
};

// Doubled braces rather than single, because system prompts in this codebase
// describe JSON and single braces appear in that prose. A doubled brace does not.
const PLACEHOLDER = /\{\{([A-Za-z0-9_]+)\}\}/g;

export class UnclassifiedMessageError extends Error {}

/**
 * A system prompt SAT authored, optionally quoting live values through slots.
 *
 * Throws rather than sends when a placeholder is left unfilled, when a slot names
 * a placeholder the template does not contain, or when a slot declares no class.
 * Each of those is a request that was about to carry undeclared material.
 */
export function instruction(label: string, template: string, slots: readonly Slot[] = []): ClassifiedMessage {
  const open = new Set<string>();
  for (const m of template.matchAll(PLACEHOLDER)) open.add(m[1]);

  const parts: PromptPart[] = [{ label, dataClass: "own_instruction" }];
  let content = template;

  for (const s of slots) {
    if (!open.has(s.key)) {
      throw new UnclassifiedMessageError(`ai/message: instruction '${label}' has no {{${s.key}}} placeholder for the slot supplied`);
    }
    if (!s.parts.length) {
      throw new UnclassifiedMessageError(`ai/message: slot '${s.key}' in instruction '${label}' declares no data class`);
    }
    content = content.split(`{{${s.key}}}`).join(s.value);
    parts.push(...s.parts);
    open.delete(s.key);
  }

  if (open.size) {
    throw new UnclassifiedMessageError(
      `ai/message: instruction '${label}' has unfilled placeholders: ${[...open].sort().join(", ")}`
    );
  }

  return { role: "system", content, parts };
}

/** The person's own message, going to the model on their behalf. */
export function userWords(content: string, label = "user message"): ClassifiedMessage {
  return { role: "user", content, parts: [{ label, dataClass: "user_own_words" }] };
}

/** One of the person's own earlier turns, theirs or the assistant's reply to them. */
export function priorTurn(role: "user" | "assistant", content: string): ClassifiedMessage {
  return { role, content, parts: [{ label: "conversation history", dataClass: "user_own_words" }] };
}

/** The general form. Requires at least one declared part, which is the whole point. */
export function classified(role: Role, content: string, parts: PromptPart[]): ClassifiedMessage {
  if (!parts.length) {
    throw new UnclassifiedMessageError(`ai/message: a ${role} message was built with no declared data class`);
  }
  return { role, content, parts };
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
    if (!m.parts.length) {
      throw new UnclassifiedMessageError(`ai/message: a ${m.role} message reached the gateway with no declared data class`);
    }
    out.push(...m.parts);
  }
  return out;
}
