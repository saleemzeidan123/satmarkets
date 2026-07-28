// ADV-3A. The task-profile router.
//
// Before this file the platform chose a model in three places, in three shapes:
// a pair of `key()`/`base()`/`model()` helpers in the advisor route, an inline
// array of provider tuples in the search route, and a `MODELS` record keyed by
// tier in the translator. Each had its own idea of what the fallback was, its
// own timeout, and its own default. "Model agnostic" is not a property you can
// have while three files each hold a different opinion about which model runs.
//
// So selection happens here, keyed on what the WORK is rather than on which file
// is asking. A profile states the shape of the task; a candidate states which
// profiles it is declared able to serve and whether it has been evaluated on
// them; the router orders the candidates that are actually configured.
//
// TWO RULES ARE ENCODED RATHER THAN WRITTEN DOWN.
//
// 1. Nothing is chosen on token price. `ModelCandidate` has no price field, no
//    cost field and no rate field, so the ordering function cannot reach one
//    even if a future edit wanted it to. A cheaper model earns classification
//    work by scoring on classification, not by being cheaper. There is a test
//    that reads this file and fails if a price-shaped key appears in it.
//
// 2. Nothing is selected on the strength of a vendor claim. A candidate's
//    `evaluation` is `unevaluated` until a recorded suite says otherwise, and
//    today every candidate is unevaluated because the gold set is later ADV-3
//    work. So `selectChain` returns its answers with a `basis` of
//    `configured_default_no_evaluation`, which is the honest description of what
//    is happening: this is the model the environment configures, not the model
//    that won anything. When the gold set exists, evaluated candidates sort
//    ahead of unevaluated ones and the basis says `evaluation` instead.
//
// Kimi is registered as a candidate for exactly this reason. The strategy asked
// for it to be considered; considering it means putting it in the register with
// an honest evaluation state and no key configured, not routing traffic to it.

export type TaskProfile =
  /** Extract a small structured object from a short input. JSON out, temperature 0. */
  | "classification"
  /** One or two sentences of user-facing prose in English or Arabic. */
  | "short_prose"
  /** English to professional Saudi MSA Arabic, or the reverse, holding terminology. */
  | "bilingual_translation"
  /** Reading a long document and answering from it. Gated: needs the AI agreement. */
  | "document_analysis"
  /** Reading an image, a floor plan or a photograph. Gated the same way. */
  | "vision";

export type Capability = "json_mode" | "arabic" | "long_context" | "vision";

export type Transport = "openai_chat" | "anthropic_messages";

export type ProviderId = "deepseek" | "anthropic" | "moonshot";

export type Provider = {
  id: ProviderId;
  transport: Transport;
  /** Env names holding the key, in order. The first non-empty one wins. */
  keyEnv: readonly string[];
  /** Env names holding a base URL override, in order. */
  baseUrlEnv: readonly string[];
  defaultBaseUrl: string;
};

export const PROVIDERS: Record<ProviderId, Provider> = {
  deepseek: {
    id: "deepseek",
    transport: "openai_chat",
    // `deepseek_key` is the lowercase legacy name that is still set in the
    // deployed environment. It is read second so a correctly named variable wins.
    keyEnv: ["AI_API_KEY", "deepseek_key"],
    baseUrlEnv: ["AI_BASE_URL"],
    defaultBaseUrl: "https://api.deepseek.com",
  },
  anthropic: {
    id: "anthropic",
    transport: "anthropic_messages",
    keyEnv: ["ANTHROPIC_API_KEY"],
    baseUrlEnv: ["AI_FALLBACK_BASE_URL"],
    defaultBaseUrl: "https://api.anthropic.com/v1",
  },
  moonshot: {
    id: "moonshot",
    transport: "openai_chat",
    keyEnv: ["MOONSHOT_API_KEY"],
    baseUrlEnv: ["MOONSHOT_BASE_URL"],
    defaultBaseUrl: "https://api.moonshot.ai/v1",
  },
};

export type EvaluationState =
  | { status: "unevaluated"; why: string }
  | { status: "evaluated"; suite: string; date: string; scores: Partial<Record<TaskProfile, number>> };

export type ModelCandidate = {
  /** Stable internal name. Not the string sent to the provider. */
  key: string;
  provider: ProviderId;
  /** The model id sent to the provider when no env override and no caller override applies. */
  defaultModel: string;
  /** Env names that override the model id, in order. */
  modelEnv?: readonly string[];
  profiles: readonly TaskProfile[];
  capabilities: readonly Capability[];
  evaluation: EvaluationState;
  note: string;
};

const UNEVALUATED: EvaluationState = {
  status: "unevaluated",
  why: "no ADV-3 evaluation gold set exists yet, so no score has been recorded for any profile",
};

/**
 * The register, in declaration order. Declaration order is the tie-break when
 * nothing has been evaluated, which is every candidate today.
 */
export const CANDIDATES: readonly ModelCandidate[] = [
  {
    key: "deepseek-chat",
    provider: "deepseek",
    defaultModel: "deepseek-chat",
    modelEnv: ["AI_MODEL"],
    profiles: ["classification", "short_prose"],
    capabilities: ["json_mode", "arabic"],
    evaluation: UNEVALUATED,
    note: "The configured primary for the advisor and search intent parsers today.",
  },
  {
    key: "claude-haiku",
    provider: "anthropic",
    defaultModel: "claude-haiku-4-5-20251001",
    modelEnv: ["AI_FALLBACK_MODEL"],
    profiles: ["classification", "short_prose", "bilingual_translation"],
    capabilities: ["arabic", "long_context"],
    evaluation: UNEVALUATED,
    note: "The configured second call when the primary is down, and the fast translation tier.",
  },
  {
    key: "claude-sonnet",
    provider: "anthropic",
    defaultModel: "claude-sonnet-4-6",
    profiles: ["bilingual_translation", "document_analysis"],
    capabilities: ["arabic", "long_context"],
    evaluation: UNEVALUATED,
    note: "The quality translation tier. Its document_analysis profile is unreachable today because no source permits model input.",
  },
  {
    key: "kimi-k2",
    provider: "moonshot",
    defaultModel: "kimi-k2-0711-preview",
    profiles: ["classification", "short_prose", "bilingual_translation"],
    capabilities: ["json_mode", "arabic", "long_context"],
    evaluation: UNEVALUATED,
    note: "Registered for evaluation because the competitive-advantage strategy named it. Not selected: it has no recorded evaluation and no key is configured, and neither of those is fixed by wanting it to be good.",
  },
];

export type SelectionBasis = "evaluation" | "configured_default_no_evaluation";

export type Selection = {
  candidate: ModelCandidate;
  provider: Provider;
  /** The model id to send. */
  model: string;
  apiKey: string;
  baseUrl: string;
  basis: SelectionBasis;
};

type Env = Record<string, string | undefined>;

const firstSet = (names: readonly string[] | undefined, env: Env): string | undefined => {
  for (const n of names ?? []) {
    const v = env[n];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
};

const scoreFor = (c: ModelCandidate, profile: TaskProfile): number | null =>
  c.evaluation.status === "evaluated" ? c.evaluation.scores[profile] ?? null : null;

/**
 * The ordered list of models to try for this profile, given the environment.
 *
 * Returns every eligible candidate rather than one, because failover is a
 * property of the router now instead of three different opinions in three files.
 * An empty array means no configured model serves this profile, which the
 * gateway reports rather than papering over.
 */
export function selectChain(profile: TaskProfile, env: Env = process.env): Selection[] {
  const eligible: { c: ModelCandidate; p: Provider; key: string; order: number }[] = [];

  CANDIDATES.forEach((c, order) => {
    if (!c.profiles.includes(profile)) return;
    const p = PROVIDERS[c.provider];
    const key = firstSet(p.keyEnv, env);
    if (!key) return;
    eligible.push({ c, p, key, order });
  });

  eligible.sort((a, b) => {
    const sa = scoreFor(a.c, profile);
    const sb = scoreFor(b.c, profile);
    if (sa !== null && sb !== null && sa !== sb) return sb - sa;
    if (sa !== null && sb === null) return -1;
    if (sa === null && sb !== null) return 1;
    return a.order - b.order;
  });

  return eligible.map(({ c, p, key }) => ({
    candidate: c,
    provider: p,
    model: firstSet(c.modelEnv, env) ?? c.defaultModel,
    apiKey: key,
    baseUrl: firstSet(p.baseUrlEnv, env) ?? p.defaultBaseUrl,
    basis: scoreFor(c, profile) !== null ? "evaluation" : "configured_default_no_evaluation",
  }));
}
