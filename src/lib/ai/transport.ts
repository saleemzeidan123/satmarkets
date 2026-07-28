import type { ClassifiedMessage } from "./message";
import type { Selection } from "./router";

// ADV-3A. The only place in this repository that opens a socket to a model
// provider.
//
// THIS MODULE IS PRIVATE TO src/lib/ai/gateway.ts. Nothing else may import it,
// and `src/lib/ai/index.ts` deliberately does not re-export it. The reason is
// the whole architecture of the package: if a caller can reach a transport, the
// classification boundary is advice. If the only route to a provider runs
// through the gateway, and the gateway cannot proceed without messages that
// carry their own declared classes, then the boundary is a precondition of the
// call rather than something a caller remembers to do.
//
// `src/lib/ai/gateway.test.ts` reads the repository and fails if a provider URL
// or a chat-completions path appears in any file other than this one, and if
// this module is imported from anywhere other than the gateway. That test is the
// enforcement; this comment is only the explanation.

export type TransportOptions = {
  json: boolean;
  maxTokens: number;
  temperature: number;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export type TransportOutcome =
  | { ok: true; text: string }
  | { ok: false; detail: string };

function withTimeout(timeoutMs: number | undefined, signal: AbortSignal | undefined) {
  if (!timeoutMs) return { signal, done: () => {} };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  return { signal: ctrl.signal, done: () => clearTimeout(timer) };
}

async function openaiChat(sel: Selection, messages: readonly ClassifiedMessage[], o: TransportOptions): Promise<TransportOutcome> {
  const t = withTimeout(o.timeoutMs, o.signal);
  try {
    const res = await fetch(`${sel.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sel.apiKey}` },
      body: JSON.stringify({
        model: sel.model,
        temperature: o.temperature,
        // An unbounded completion on a public endpoint is a cost and latency hole
        // whatever the provider, and Anthropic requires the field outright.
        max_tokens: o.maxTokens,
        ...(o.json ? { response_format: { type: "json_object" } } : {}),
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
      signal: t.signal,
    });
    if (!res.ok) return { ok: false, detail: `${sel.provider.id} returned ${res.status}` };
    const j: any = await res.json();
    const out: string | null = j?.choices?.[0]?.message?.content ?? null;
    return out ? { ok: true, text: out } : { ok: false, detail: `${sel.provider.id} returned no content` };
  } catch (e: any) {
    return { ok: false, detail: `${sel.provider.id} call failed: ${String(e?.name || e)}` };
  } finally {
    t.done();
  }
}

const ANTHROPIC_VERSION = "2023-06-01";

async function anthropicMessages(sel: Selection, messages: readonly ClassifiedMessage[], o: TransportOptions): Promise<TransportOutcome> {
  // The native Messages API takes the system prompt as its own field rather than
  // as a message role. Several system messages join with blank lines, which is
  // how the advisor's instruction and the translator's house style both arrive.
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const turns = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  if (!turns.length) return { ok: false, detail: "anthropic requires at least one non-system message" };

  const t = withTimeout(o.timeoutMs, o.signal);
  try {
    const res = await fetch(`${sel.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": sel.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: sel.model,
        max_tokens: o.maxTokens,
        temperature: o.temperature,
        ...(system ? { system } : {}),
        messages: turns,
      }),
      signal: t.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, detail: `anthropic returned ${res.status}: ${detail.slice(0, 300)}` };
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const out = (data.content || []).filter((b) => b.type === "text").map((b) => b.text || "").join("").trim();
    return out ? { ok: true, text: out } : { ok: false, detail: "anthropic returned empty content" };
  } catch (e: any) {
    return { ok: false, detail: `anthropic call failed: ${String(e?.name || e)}` };
  } finally {
    t.done();
  }
}

/** Dispatch on the provider's transport. Called only by the gateway. */
export async function send(sel: Selection, messages: readonly ClassifiedMessage[], o: TransportOptions): Promise<TransportOutcome> {
  switch (sel.provider.transport) {
    case "openai_chat":
      return openaiChat(sel, messages, o);
    case "anthropic_messages":
      return anthropicMessages(sel, messages, o);
    default:
      return { ok: false, detail: "unknown transport" };
  }
}
