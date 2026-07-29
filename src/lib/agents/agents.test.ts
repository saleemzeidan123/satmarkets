import { test } from "node:test";
import assert from "node:assert/strict";
import { AI_AGREEMENT_IN_FORCE, buildExternalPrompt, type DataClass, type PromptPart } from "@/lib/aiBoundary";
import {
  AGENTS,
  AGENT_IDS,
  agentMayInclude,
  agentMayUseTool,
  agentMode,
  answerPermitted,
  figuresIn,
  unvouchedFigures,
  type AgentId,
} from "./agents";
import { capabilitiesOf } from "./permission";
import { STATIC_TOOLS, TOOL_NAMES, makeParseQueryTool, makeRentBandTool } from "./tools";
import type { ActorRole, Capability, SatTool } from "./tool";

// ADV-3B. The six agent boundaries.

const ROLES: ActorRole[] = ["anonymous", "tenant", "lister", "verified_lister", "staff"];

const REGISTRY = new Map<string, SatTool<never, unknown> | { name: string; capability: Capability }>(
  (
    [
      makeParseQueryTool({ assets: [], grades: [], fitouts: [], deals: [], cities: [], places: [] }),
      ...STATIC_TOOLS,
      makeRentBandTool(async () => null),
    ] as readonly { name: string; capability: Capability }[]
  ).map((t) => [t.name, t])
);

function part(dataClass: DataClass, extra: Partial<PromptPart> = {}): PromptPart {
  return { label: "a part", dataClass, ...extra };
}

// --------------------------------------------------------- the set is complete

test("there are six agents and they are the six the package names", () => {
  assert.deepEqual(AGENT_IDS, [
    "discovery",
    "listing_copilot",
    "opportunity_matching",
    "evidence_auditor",
    "deal_analyst",
    "operations",
  ]);
});

test("every agent states its purpose and its no-model behaviour in both languages", () => {
  for (const id of AGENT_IDS) {
    const a = AGENTS[id];
    for (const field of [a.purpose, a.fallback]) {
      assert.ok(field.en.trim().length > 20, `${id} en`);
      assert.ok(field.ar.trim().length > 20, `${id} ar`);
      assert.equal(/[؀-ۿ]/.test(field.ar), true, `${id} ar script`);
    }
  }
});

test("each agent's id matches the key it is filed under", () => {
  for (const id of AGENT_IDS) assert.equal(AGENTS[id].id, id);
});

test("a turn is bounded, so a loop cannot become a spend", () => {
  for (const id of AGENT_IDS) {
    const n = AGENTS[id].maxToolCalls;
    assert.ok(Number.isInteger(n) && n > 0 && n <= 10, `${id}: ${n}`);
  }
});

// ------------------------------------------------- the tool lists are coherent

test("every tool an agent may call exists", () => {
  for (const id of AGENT_IDS) {
    for (const name of AGENTS[id].tools) {
      assert.ok(REGISTRY.has(name), `${id} lists ${name}, which no tool defines`);
      assert.ok((TOOL_NAMES as readonly string[]).includes(name), name);
    }
  }
});

test("no agent lists the same tool twice", () => {
  for (const id of AGENT_IDS) {
    assert.equal(new Set(AGENTS[id].tools).size, AGENTS[id].tools.length, id);
  }
});

test("anybody who can run an agent at its stated ceiling can call every tool it lists", () => {
  for (const id of AGENT_IDS) {
    const a = AGENTS[id];
    const holders = ROLES.filter((r) => capabilitiesOf({ role: r }).includes(a.maxCapability));
    assert.ok(holders.length > 0, `${id}: no role holds ${a.maxCapability}`);
    for (const role of holders) {
      const caps = capabilitiesOf({ role });
      for (const name of a.tools) {
        const need = REGISTRY.get(name)!.capability;
        assert.ok(caps.includes(need), `${id}: ${role} holds ${a.maxCapability} but not ${need} for ${name}`);
      }
    }
  }
});

test("the tool check is enforced at the call and not only at the offer", () => {
  assert.equal(agentMayUseTool("discovery", "parse_query"), true);
  assert.equal(agentMayUseTool("discovery", "rent_band"), false);
  assert.equal(agentMayUseTool("discovery", "listing_eligibility"), false);
  assert.equal(agentMayUseTool("operations", "rent_band"), false);
});

test("only the operations agent reaches operational capability", () => {
  for (const id of AGENT_IDS) {
    assert.equal(AGENTS[id].maxCapability === "read_operations", id === "operations", id);
  }
});

// -------------------------------------------------------- the narrower gate

test("every agent may use its own instructions, published material and a synthetic set", () => {
  for (const id of AGENT_IDS) {
    for (const c of ["own_instruction", "public_published", "synthetic_sample"] as DataClass[]) {
      assert.ok(AGENTS[id].permittedClasses.includes(c), `${id}: ${c}`);
    }
  }
});

test("no agent may hold personal data or verification evidence, agreement or not", () => {
  for (const id of AGENT_IDS) {
    for (const c of ["party_personal", "verification_evidence"] as DataClass[]) {
      assert.equal(AGENTS[id].permittedClasses.includes(c), false, `${id}: ${c}`);
    }
  }
});

test("a discovery agent has no business with a deed even after the agreement is signed", () => {
  const d = agentMayInclude("discovery", [part("verification_evidence")]);
  assert.equal(d.allowed, false);
  assert.equal(d.denials.length, 1);
  // The global boundary would permit it once the agreement exists. The narrower
  // gate is what keeps a search assistant out of the evidence.
  assert.equal(buildExternalPrompt([part("verification_evidence")], { agreementInForce: true }).allowed, true);
});

test("a denial names the agent and the class and never the content", () => {
  const d = agentMayInclude("evidence_auditor", [
    { label: "a tenant requirement", dataClass: "user_own_words" },
  ]);
  assert.equal(d.allowed, false);
  assert.match(d.denials[0], /evidence_auditor/);
  assert.match(d.denials[0], /user_own_words/);
});

test("the auditor is kept away from user text, because it reports on records", () => {
  assert.equal(agentMayInclude("evidence_auditor", [part("user_own_words")]).allowed, false);
  assert.equal(agentMayInclude("discovery", [part("user_own_words")]).allowed, true);
});

test("only the operations agent may hold unpublished platform records", () => {
  for (const id of AGENT_IDS) {
    assert.equal(agentMayInclude(id, [part("platform_internal")]).allowed, id === "operations", id);
  }
});

test("only the deal analyst may hold licensed source material", () => {
  for (const id of AGENT_IDS) {
    assert.equal(agentMayInclude(id, [part("licensed_source")]).allowed, id === "deal_analyst", id);
  }
});

test("the narrower gate passes a part the global gate then refuses", () => {
  const p = [part("licensed_source", { sourceId: "rega_rent_index", fidelity: "full" })];
  assert.equal(agentMayInclude("deal_analyst", p).allowed, true);
  assert.equal(buildExternalPrompt(p, { agreementInForce: true }).allowed, false);
});

test("an empty part list is allowed, because nothing is not a disclosure", () => {
  for (const id of AGENT_IDS) assert.equal(agentMayInclude(id, []).allowed, true);
});

test("one denied part fails the set, matching the global boundary", () => {
  const d = agentMayInclude("discovery", [part("own_instruction"), part("platform_internal"), part("public_published")]);
  assert.equal(d.allowed, false);
  assert.equal(d.denials.length, 1);
});

// ----------------------------------------------------------------- the mode

test("every agent is deterministic today, because the agreement gate is closed", () => {
  assert.equal(AI_AGREEMENT_IN_FORCE, false);
  for (const id of AGENT_IDS) assert.equal(agentMode(id), "deterministic");
});

test("the mode is a function of the agreement and of nothing else", () => {
  for (const id of AGENT_IDS) {
    assert.equal(agentMode(id, false), "deterministic");
    assert.equal(agentMode(id, true), "external");
  }
});

// ------------------------------------------------------------ figure policy

test("a figure is read the same whether or not it carries separators", () => {
  assert.deepEqual(figuresIn("1,420 and 1420"), [1420, 1420]);
  assert.deepEqual(figuresIn("SAR 1,250,000"), [1250000]);
  assert.deepEqual(figuresIn("1,450.5 per square metre"), [1450.5]);
});

test("text with no number reports none", () => {
  assert.deepEqual(figuresIn("No published band exists for that segment."), []);
  assert.deepEqual(figuresIn(""), []);
});

test("a small integer is not exempt, because finding 65 was a count", () => {
  assert.deepEqual(unvouchedFigures("3 verified matches", []), [3]);
  assert.deepEqual(unvouchedFigures("3 verified matches", [3]), []);
});

test("a number the model composed from two it was given is a new number", () => {
  // 1200 and 1800 were vouched for. Their midpoint was not.
  assert.deepEqual(unvouchedFigures("the midpoint is 1500", [1200, 1800]), [1500]);
});

test("an agent that may state no figure may state no figure at all", () => {
  const d = answerPermitted("evidence_auditor", "The listing is missing 2 of the required checks.", [2]);
  assert.equal(d.allowed, false);
  assert.match(d.reason, /no figure/);
});

test("the same agent is allowed an answer with no number in it", () => {
  const d = answerPermitted("evidence_auditor", "Ownership is not verified, so the listing cannot carry the mark.", []);
  assert.equal(d.allowed, true);
});

test("an agent that may state a vouched figure may not state an unvouched one", () => {
  assert.equal(answerPermitted("discovery", "18 results matched.", [18]).allowed, true);
  assert.equal(answerPermitted("discovery", "18 results matched.", [4]).allowed, false);
});

test("the deal analyst may restate a band it was given and may not average it", () => {
  const vouched = [1200, 1800, 1450];
  assert.equal(answerPermitted("deal_analyst", "The band runs 1,200 to 1,800.", vouched).allowed, true);
  assert.equal(answerPermitted("deal_analyst", "That averages about 1,540.", vouched).allowed, false);
});

test("a decision carries a reason on both branches", () => {
  for (const id of AGENT_IDS) {
    for (const answer of ["no numbers here", "exactly 7 of them"]) {
      assert.ok(answerPermitted(id, answer, [7]).reason.length > 0, `${id}: ${answer}`);
    }
  }
});

test("the only figure policies are none and tool vouched", () => {
  for (const id of AGENT_IDS) {
    assert.ok(["none", "tool_vouched"].includes(AGENTS[id].figures), id);
  }
});

test("an agent holding licensed material still may not derive a figure from it", () => {
  const id: AgentId = "deal_analyst";
  assert.equal(AGENTS[id].figures, "tool_vouched");
  assert.equal(answerPermitted(id, "roughly 1,500 per square metre", [1200, 1800]).allowed, false);
});
