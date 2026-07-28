import { buildExternalPrompt } from "@/lib/aiBoundary";
import type { SourceRights } from "@/lib/sourceRights";
import { partsOf, type ClassifiedMessage } from "./message";
import { selectChain, type ProviderId, type SelectionBasis, type Selection, type TaskProfile } from "./router";
import { send } from "./transport";

// ADV-3A. The one door.
//
// Every external model call in this repository goes through `callModel`. That is
// not a convention, it is the shape of the package: `transport.ts` holds the only
// `fetch` to a provider, `transport.ts` is imported by this file and nothing
// else, and this file cannot proceed without `ClassifiedMessage` values, which
// cannot be constructed without a declared data class. So the boundary is a
// precondition of reaching a provider rather than a step a caller remembers.
//
// What went wrong before is worth naming precisely, because "we forgot to call
// the boundary" is the wrong diagnosis. The advisor route DID call it. It called
// it on `ADVISOR_PROMPT_PARTS`, a hand-written description of the request, and
// then sent a different array to the provider. Two of the three provider paths
// (`/api/search` and the Arabic translator) called nothing at all. A boundary
// that one of three callers remembers to invoke, on a description rather than on
// the request, is a policy document with a test suite attached.
//
// Here the checked list is derived from the sent list by `partsOf(messages)`. It
// is the same array of objects. They cannot drift because there is nothing to
// keep in step.
//
// A denial returns before the network is touched. Callers degrade
// deterministically, which is the pattern the platform already uses: the advisor
// answers with a written sentence asking for a location and an asset type rather
// than guessing.

export type GatewayRequest = {
  /** What kind of work this is. Selection is keyed on this, never on which file asked. */
  profile: TaskProfile;
  /** The exact messages to send. The boundary is derived from these. */
  messages: readonly ClassifiedMessage[];
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  /**
   * Restrict the chain to one candidate key from the register, with no failover.
   * The translator needs this: a fast tier and a quality tier are a deliberate
   * choice about output, and silently answering a quality request from the fast
   * model would be a worse failure than returning nothing.
   */
  candidate?: string;
  /** Send this exact provider model id instead of the candidate's default. */
  modelId?: string;
  /** Rights rows for any licensed_source parts, keyed by source_id. */
  rights?: Map<string, SourceRights>;
  env?: Record<string, string | undefined>;
};

export type GatewayFailure = "boundary" | "no_provider" | "provider_error";

export type GatewayResult =
  | { ok: true; text: string; model: string; provider: ProviderId; basis: SelectionBasis; reasons: string[] }
  | { ok: false; failure: GatewayFailure; denials: string[]; reasons: string[] };

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_TOKENS = 700;

// The characters are built from their code points rather than written, because
// the em dash is forbidden in shipped source and an escape of it is forbidden
// too unless the line is marked. This is the platform sanitizer, so it is marked.
/* em-dash-law */
const EM_DASH = String.fromCharCode(8212);
/* em-dash-law */
const EN_DASH = String.fromCharCode(8211);
const DASHES = new RegExp(`\\s*[${EM_DASH}${EN_DASH}]\\s*`, "g");

/**
 * Model output cannot be trusted to respect a house rule it was merely told
 * about, so the rule is applied to the output rather than requested in the
 * prompt. Every provider path shares this now; before, only the advisor had it.
 */
export function sanitizeModelText(text: string): string {
  return text.replace(DASHES, ", ");
}

function chainFor(req: GatewayRequest): Selection[] {
  const env = req.env ?? process.env;
  let chain = selectChain(req.profile, env);
  if (req.candidate) {
    chain = chain.filter((s) => s.candidate.key === req.candidate).slice(0, 1);
  }
  if (req.modelId) {
    chain = chain.map((s) => ({ ...s, model: req.modelId as string }));
  }
  return chain;
}

/**
 * The only sanctioned route to an external model.
 *
 * Order matters and is not an implementation detail: the boundary runs first, on
 * the messages themselves, and a denial returns without a socket being opened.
 * Selection happens second, so a denied request cannot be logged as a provider
 * failure or retried against a different vendor.
 */
export async function callModel(req: GatewayRequest): Promise<GatewayResult> {
  const parts = partsOf(req.messages);
  const decision = buildExternalPrompt(parts, req.rights ? { rights: req.rights } : undefined);
  if (!decision.allowed) {
    return { ok: false, failure: "boundary", denials: decision.denials, reasons: decision.reasons };
  }

  const chain = chainFor(req);
  if (!chain.length) {
    return {
      ok: false,
      failure: "no_provider",
      denials: [],
      reasons: [
        ...decision.reasons,
        req.candidate
          ? `no configured provider serves candidate '${req.candidate}' for profile '${req.profile}'`
          : `no configured provider serves profile '${req.profile}'`,
      ],
    };
  }

  const json = req.json ?? false;
  const opts = {
    json,
    maxTokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: req.temperature ?? (json ? 0 : 0.4),
    timeoutMs: req.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    signal: req.signal,
  };

  const reasons = [...decision.reasons];
  for (const sel of chain) {
    const outcome = await send(sel, req.messages, opts);
    if (outcome.ok) {
      const text = sanitizeModelText(outcome.text);
      if (!text.trim()) {
        reasons.push(`${sel.candidate.key}: returned only whitespace after sanitizing`);
        continue;
      }
      return {
        ok: true,
        text,
        model: sel.model,
        provider: sel.provider.id,
        basis: sel.basis,
        reasons: [...reasons, `answered by ${sel.candidate.key} (${sel.model}), basis ${sel.basis}`],
      };
    }
    reasons.push(`${sel.candidate.key}: ${outcome.detail}`);
  }

  return { ok: false, failure: "provider_error", denials: [], reasons };
}

/**
 * Convenience for the callers that only want the text and already degrade on
 * null. It exists so that routing a call site through the gateway is a smaller
 * diff than not routing it, which is the only reliable way to keep a chokepoint
 * a chokepoint.
 */
export async function callModelText(req: GatewayRequest): Promise<string | null> {
  const r = await callModel(req);
  return r.ok ? r.text : null;
}
