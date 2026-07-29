import type { DataClass, PromptPart } from "@/lib/aiBoundary";
import { AI_AGREEMENT_IN_FORCE } from "@/lib/aiBoundary";
import type { TaskProfile } from "@/lib/ai/router";
import type { Capability } from "./tool";

// ADV-3B. The six agent boundaries.
//
// WHAT THIS FILE IS, AND WHAT IT IS NOT.
//
// It is six declarations of what an agent may reach, stated as data and enforced
// as code. It is NOT six running agents, and the difference is deliberate rather
// than unfinished. `AI_AGREEMENT_IN_FORCE` is false, so under ADV-3A.1 item 1 no
// user text, requirement, draft or platform record may reach an external
// provider, and every one of these six exists to work with exactly that
// material. Six live loops today would be six loops that deny on their first
// turn and fall back, which is what `mode()` below returns, honestly, for all of
// them.
//
// So what is buildable now is the part that has to be right before anything
// runs: which tools each agent may call, which classes of material each may put
// in front of a model even after an agreement exists, whether it may state a
// figure, and what it does when there is no model. That is the boundary. The
// loop is the easy part and it is worth nothing without this.
//
// TWO GATES, NARROWER FIRST.
//
// `agentMayInclude` runs before `buildExternalPrompt`, not instead of it. The
// global boundary answers "may this class of material leave the process at all";
// this one answers "does THIS agent have any business with it". They differ, and
// the difference matters after the agreement is signed rather than before. Once
// `AI_AGREEMENT_IN_FORCE` flips, `verification_evidence` becomes globally
// sendable; a discovery agent helping a visitor find offices still has no reason
// to hold a deed. An agreement widens what the platform may do. It does not
// widen what a search assistant is for.
//
// This is the same argument as the source gate versus the provider gate in
// `aiBoundary.ts`: neither is a weaker version of the other, so neither is
// skipped when the other passes.

export type AgentId =
  | "discovery"
  | "listing_copilot"
  | "opportunity_matching"
  | "evidence_auditor"
  | "deal_analyst"
  | "operations";

/**
 * Whether an agent may put a number in an answer, and on what authority.
 *
 * Law 3 is that AI never generates a rent figure, price or market statistic.
 * `tool_vouched` is the only permission that exists here: a figure may appear if
 * a tool returned that exact value or the person typed it. There is deliberately
 * no `derived` state. A number the model computed from two it was given is a new
 * number, and the platform's arithmetic lives in tools precisely so that nobody
 * has to decide, later and in a hurry, whether a particular multiplication was
 * safe.
 */
export type FigurePolicy = "none" | "tool_vouched";

export type AgentBoundary = {
  id: AgentId;
  /** The routing profile. Keyed on the work, never on which agent asked. */
  profile: TaskProfile;
  purpose: { en: string; ar: string };
  /** Tool names this agent may call. Nothing outside this list is offered or accepted. */
  tools: readonly string[];
  /** The highest capability any of its tools may require. A cheap second check on the list above. */
  maxCapability: Capability;
  /**
   * Classes this agent may put in front of an external model, at most, and only
   * where the global boundary also permits them.
   */
  permittedClasses: readonly DataClass[];
  figures: FigurePolicy;
  /** Bound on a single turn, so a loop cannot become a spend. */
  maxToolCalls: number;
  /** What the agent does with no model. Every agent has one; this is not optional. */
  fallback: { en: string; ar: string };
};

/**
 * Classes every agent may use, because they carry nobody.
 *
 * Listed once so a new agent cannot be written that forgets its own instructions
 * are a class, and so the interesting part of each declaration below is what it
 * adds to this rather than a wall of repetition.
 */
const NEUTRAL: readonly DataClass[] = ["own_instruction", "public_published", "synthetic_sample"];

export const AGENTS: Record<AgentId, AgentBoundary> = {
  /**
   * Helps a searcher reach verified inventory.
   *
   * It sits on top of `queryParse.ts` and may not replace it. That is enforced by
   * the tool list: `parse_query` is the only route from a sentence to a filter,
   * and there is no tool by which this agent can assert that an unrecognised word
   * is a district. An unrecognised word comes back in `ignored` and stays there.
   */
  discovery: {
    id: "discovery",
    profile: "classification",
    purpose: {
      en: "Turn a described need into the platform's own filters, and say plainly what was not understood.",
      ar: "تحويل الحاجة الموصوفة إلى عوامل تصفية المنصة، مع بيان ما لم يُفهم بوضوح.",
    },
    tools: ["parse_query", "counted_phrase"],
    maxCapability: "read_public",
    permittedClasses: [...NEUTRAL, "user_own_words"],
    figures: "tool_vouched",
    maxToolCalls: 3,
    fallback: {
      en: "The deterministic parser answers alone: the query is parsed, unrecognised words are disclosed rather than guessed at, and the result note is composed from the formatter.",
      ar: "يعمل المحلّل الحتمي وحده: تُحلَّل العبارة، وتُعرض الكلمات غير المفهومة بدل تخمينها، وتُصاغ ملاحظة النتائج من المنسّق.",
    },
  },

  /**
   * Helps a lister describe a space, in both languages.
   *
   * `propose` only. It drafts; a person publishes. The draft is the lister's own
   * unpublished material, which is why this agent is fully blocked today and will
   * be the first real beneficiary of an agreement.
   */
  listing_copilot: {
    id: "listing_copilot",
    profile: "bilingual_translation",
    purpose: {
      en: "Draft and translate a listing description the lister then edits and publishes themselves.",
      ar: "صياغة وترجمة وصف الإعلان ليقوم المُعلن بتحريره ونشره بنفسه.",
    },
    tools: ["listing_eligibility", "counted_phrase", "rent_index_attribution"],
    maxCapability: "propose_own",
    permittedClasses: [...NEUTRAL, "user_own_words", "approved_redaction"],
    figures: "none",
    maxToolCalls: 4,
    fallback: {
      en: "Translation returns a controlled unavailable state rather than a fabricated one, and the eligibility checklist runs deterministically so the lister still learns what their listing is missing.",
      ar: "تُرجع الترجمة حالة عدم توفّر محكومة بدل حالة ملفّقة، ويعمل فحص الاستيفاء حتمياً ليعرف المُعلن ما ينقص إعلانه.",
    },
  },

  /**
   * Matches a stated requirement to verified inventory.
   *
   * Ranking eligibility is deterministic and is not in this agent's gift: the
   * agent may explain why a match is a match, and may not decide that it is one.
   */
  opportunity_matching: {
    id: "opportunity_matching",
    profile: "short_prose",
    purpose: {
      en: "Explain, in the reader's language, why deterministic matching returned what it returned.",
      ar: "شرح سبب النتائج التي أعادها المطابقة الحتمية، بلغة القارئ.",
    },
    tools: ["parse_query", "listing_eligibility", "counted_phrase"],
    maxCapability: "read_own",
    permittedClasses: [...NEUTRAL, "user_own_words"],
    figures: "tool_vouched",
    maxToolCalls: 4,
    fallback: {
      en: "Matching runs deterministically and the explanation is the fixed reason text from the gate, not a composed one.",
      ar: "تعمل المطابقة حتمياً ويكون الشرح هو نص الأسباب الثابت من البوابة، لا نصاً مؤلَّفاً.",
    },
  },

  /**
   * Checks a claim against the evidence behind it.
   *
   * The narrowest figure policy in the set is deliberate: an auditor that may
   * state a figure can state a wrong one about evidence, which is the one place
   * a wrong figure is also a false verification claim. It reports what the record
   * supports, in the platform's own reason strings.
   */
  evidence_auditor: {
    id: "evidence_auditor",
    profile: "classification",
    purpose: {
      en: "Report which claims a record actually supports, and name the ones it does not.",
      ar: "بيان الادعاءات التي يدعمها السجل فعلاً، وتسمية ما لا يدعمه.",
    },
    tools: ["listing_eligibility", "rent_index_attribution"],
    maxCapability: "read_own",
    permittedClasses: [...NEUTRAL],
    figures: "none",
    maxToolCalls: 3,
    fallback: {
      en: "The gate and the rights rows decide, as they already do. With no model the audit is the same audit, without the sentence around it.",
      ar: "تقرّر البوابة وسجلات الحقوق كما هو الحال أصلاً. وبلا نموذج يبقى التدقيق نفسه، دون الجملة المحيطة به.",
    },
  },

  /**
   * Assembles a comparison and a decision pack.
   *
   * Holds `licensed_source` in its permitted set and therefore cannot run
   * externally even after a provider agreement, until a source licence permits
   * model input. That is the source gate doing its job rather than a gap.
   */
  deal_analyst: {
    id: "deal_analyst",
    profile: "short_prose",
    purpose: {
      en: "Lay out an evidence-backed comparison with every figure attributed to the record it came from.",
      ar: "عرض مقارنة مسنَدة بالأدلة مع نسبة كل رقم إلى السجل الذي جاء منه.",
    },
    tools: ["rent_band", "rent_index_attribution", "counted_phrase", "listing_eligibility"],
    maxCapability: "read_own",
    permittedClasses: [...NEUTRAL, "licensed_source", "aggregate_count"],
    figures: "tool_vouched",
    maxToolCalls: 6,
    fallback: {
      en: "The comparison is rendered from the retrieved bands with their attribution, and the prose around it is the written template rather than a generated paragraph.",
      ar: "تُعرض المقارنة من النطاقات المسترجَعة مع إسنادها، ويكون النص المحيط قالباً مكتوباً لا فقرة مولَّدة.",
    },
  },

  /**
   * SAT's own operations.
   *
   * The only agent holding `platform_internal`, and the only one restricted to
   * staff by capability. It is listed here rather than left informal precisely
   * because an internal tool is the one people assume needs no boundary.
   */
  operations: {
    id: "operations",
    profile: "short_prose",
    purpose: {
      en: "Summarise operational state for SAT staff, over aggregates rather than over parties.",
      ar: "تلخيص الحالة التشغيلية لفريق سات، على مستوى التجميعات لا الأطراف.",
    },
    tools: ["counted_phrase", "listing_eligibility"],
    maxCapability: "read_operations",
    permittedClasses: [...NEUTRAL, "aggregate_count", "platform_internal"],
    figures: "tool_vouched",
    maxToolCalls: 4,
    fallback: {
      en: "Operational counts are rendered directly. A summary nobody can check is worth less than the counts it summarises.",
      ar: "تُعرض الأعداد التشغيلية مباشرة. فالملخّص الذي لا يمكن التحقق منه أقل قيمة من الأعداد التي يلخّصها.",
    },
  },
};

export const AGENT_IDS = Object.keys(AGENTS) as AgentId[];

export type AgentMode =
  /** A provider may be called, within this agent's classes. */
  | "external"
  /** No provider is called. The deterministic path answers. */
  | "deterministic";

/**
 * What this agent actually does today.
 *
 * Returns `deterministic` for every agent while the agreement gate is closed,
 * and says so through one function rather than six copies of the same condition.
 * A caller that forgets to check it does not thereby reach a provider: the
 * gateway denies anyway. This exists so a caller can degrade well rather than
 * discover the denial.
 */
export function agentMode(_id: AgentId, agreementInForce = AI_AGREEMENT_IN_FORCE): AgentMode {
  return agreementInForce ? "external" : "deterministic";
}

export type AgentInclusion = { allowed: boolean; denials: string[] };

/**
 * May this agent put these parts in front of a model.
 *
 * The narrower gate, run before the global one. A denial names the agent and the
 * class, never the content, so it can be logged in full.
 */
export function agentMayInclude(id: AgentId, parts: readonly PromptPart[]): AgentInclusion {
  const a = AGENTS[id];
  const denials: string[] = [];
  for (const p of parts) {
    if (!a.permittedClasses.includes(p.dataClass)) {
      denials.push(`${id}: '${p.label}' is ${p.dataClass}, which this agent has no business with`);
    }
  }
  return { allowed: denials.length === 0, denials };
}

/** May this agent call this tool. Checked at the call, not only at the offer. */
export function agentMayUseTool(id: AgentId, toolName: string): boolean {
  return AGENTS[id].tools.includes(toolName);
}

// ------------------------------------------------------------ figure policy

/**
 * Every distinct number written in a piece of text, as written.
 *
 * Separators are stripped so that "1,420" and "1420" are the same figure, because
 * a guard that can be defeated by a comma is a guard that will be. Western
 * numerals only is Law 7, so Arabic-Indic digits are deliberately not read here:
 * a reply containing them fails the Arabic lint before it can fail this.
 */
export function figuresIn(text: string): number[] {
  const out: number[] = [];
  const re = /\d[\d,]*(?:\.\d+)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const n = Number(m[0].replace(/,/g, ""));
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

/**
 * The figures in an answer that nothing vouched for.
 *
 * `vouched` is the union of what tools returned and what the person typed. An
 * empty return is the only acceptable result for an answer that is about to be
 * shown to somebody.
 *
 * Small integers are NOT exempted, and that is a considered choice rather than an
 * oversight. Exempting them would let "3 verified matches" through unchecked,
 * which is exactly the class of claim finding 65 was: a count that was true of
 * something other than what the reader was looking at. If an agent wants to say
 * three, a tool says three.
 */
export function unvouchedFigures(answer: string, vouched: readonly number[]): number[] {
  const allowed = new Set(vouched);
  return figuresIn(answer).filter((n) => !allowed.has(n));
}

/**
 * Whether this answer may be shown, under the agent's figure policy.
 *
 * `none` means no figure at all, not "no figure we consider a market statistic".
 * Deciding at read time which numbers count as statistics is the judgement call
 * that produces the wrong answer under pressure, so the policy does not offer it.
 */
export function answerPermitted(
  id: AgentId,
  answer: string,
  vouched: readonly number[]
): { allowed: boolean; reason: string } {
  const policy = AGENTS[id].figures;
  const found = figuresIn(answer);
  if (policy === "none") {
    return found.length
      ? { allowed: false, reason: `${id}: may state no figure, and this answer states ${found.length}` }
      : { allowed: true, reason: `${id}: states no figure, as its policy requires` };
  }
  const unvouched = unvouchedFigures(answer, vouched);
  return unvouched.length
    ? { allowed: false, reason: `${id}: ${unvouched.length} figure(s) in this answer were vouched for by nothing` }
    : { allowed: true, reason: `${id}: every figure was vouched for by a tool or by the person` };
}
