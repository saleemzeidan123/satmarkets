import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AI_AGREEMENT_IN_FORCE,
  AGGREGATE_MIN,
  SYNTHETIC_SETS,
  REDACTION_APPROVALS,
  buildExternalPrompt,
  mayLeaveProcess,
  type PromptPart,
} from "./aiBoundary";
import { parseSourceRights, type SourceRights } from "./sourceRights";

const rightsFor = (over: Record<string, unknown>): Map<string, SourceRights> => {
  const r = parseSourceRights({
    source_id: "src",
    storage_policy: "full",
    redisplay_policy: "public",
    derived_display_policy: "public",
    export_policy: "public",
    ai_retrieval_policy: "public",
    model_input_policy: "none",
    rights_status: "evidenced",
    ...over,
  });
  return new Map([[r.sourceId, r]]);
};

const ext = (part: PromptPart, ctx: Record<string, unknown> = {}) =>
  mayLeaveProcess(part, { destination: "external", ...ctx } as any);

// 1. The provider gate.

test("no enterprise AI agreement is in force", () => {
  assert.equal(AI_AGREEMENT_IN_FORCE, false);
});

test("the agreement switch is not readable from the environment", () => {
  // An env var is the wrong shape for this switch. If a future edit makes it one,
  // this test is the thing that argues with it.
  const src = readFileSync("src/lib/aiBoundary.ts", "utf8");
  assert.doesNotMatch(src, /AI_AGREEMENT_IN_FORCE\s*=\s*[^;]*process\.env/);
});

test("private material is denied at the external boundary while no agreement exists", () => {
  for (const dataClass of ["party_personal", "verification_evidence", "platform_internal"] as const) {
    const d = ext({ label: dataClass, dataClass });
    assert.equal(d.allowed, false, dataClass);
    assert.match(d.reason, /enterprise AI agreement/);
  }
});

test("an agreement opens private material but is not the production state", () => {
  for (const dataClass of ["party_personal", "verification_evidence", "platform_internal"] as const) {
    assert.equal(ext({ label: dataClass, dataClass }, { agreementInForce: true }).allowed, true, dataClass);
  }
});

// 2. What is permitted before an agreement, and why.

test("already-published material may leave", () => {
  assert.equal(ext({ label: "listing copy", dataClass: "public_published" }).allowed, true);
});

test("unstructured user text is not a permission", () => {
  // ADV-3A.1. This used to pass. The argument was that a person who types a
  // sentence has consented to its processing, which does not survive contact with
  // what people actually type: a search query carries a company name and an
  // expansion budget, an advisor message carries a tenant's confidential
  // requirement, a draft listing is unpublished third-party copy. The person
  // typing is frequently not the only party the text is about.
  const d = ext({ label: "their message", dataClass: "user_own_words" });
  assert.equal(d.allowed, false);
  assert.match(d.reason, /enterprise AI agreement/);
  assert.equal(ext({ label: "their message", dataClass: "user_own_words" }, { agreementInForce: true }).allowed, true);
});

test("a synthetic sample must name a registered set", () => {
  const bare = ext({ label: "gold row", dataClass: "synthetic_sample" });
  assert.equal(bare.allowed, false);
  assert.match(bare.reason, /assertion, not evidence/);

  const unknown = ext({ label: "gold row", dataClass: "synthetic_sample", syntheticSetId: "whatever" });
  assert.equal(unknown.allowed, false);
  assert.match(unknown.reason, /not a registered synthetic set/);

  const known = ext({ label: "gold row", dataClass: "synthetic_sample", syntheticSetId: "adv3-eval-gold" });
  assert.equal(known.allowed, true);
});

test("the registered synthetic sets are named, not open-ended", () => {
  assert.ok(SYNTHETIC_SETS.includes("adv3-eval-gold"));
  assert.equal(SYNTHETIC_SETS.length, 1);
});

test("approved redaction denies every time while no approval is on record", () => {
  // The register is empty and honestly so: no redaction standard has been
  // written, applied or approved. The class exists so that approving one later is
  // a recorded decision rather than a code path invented under time pressure.
  assert.equal(REDACTION_APPROVALS.length, 0);

  const bare = ext({ label: "redacted deed", dataClass: "approved_redaction" });
  assert.equal(bare.allowed, false);
  assert.match(bare.reason, /no recorded approval id/);

  const claimed = ext({ label: "redacted deed", dataClass: "approved_redaction", redactionApprovalId: "trust-me" });
  assert.equal(claimed.allowed, false);
  assert.match(claimed.reason, /is on record/);

  // Not even an agreement opens it. The agreement is about the provider; this
  // register is about whether anybody actually redacted anything.
  assert.equal(
    ext({ label: "redacted deed", dataClass: "approved_redaction", redactionApprovalId: "trust-me" }, { agreementInForce: true }).allowed,
    false
  );
});

test("an internal destination gates nothing, because nothing crosses a boundary", () => {
  for (const dataClass of [
    "party_personal",
    "verification_evidence",
    "platform_internal",
    "licensed_source",
  ] as const) {
    assert.equal(
      mayLeaveProcess({ label: dataClass, dataClass }, { destination: "internal" }).allowed,
      true,
      dataClass
    );
  }
});

// 3. Aggregates.

test("a count over platform data is gated on the agreement before it is gated on size", () => {
  // ADV-3A.1. A large group makes a count safe to publish; it does not make it
  // lawful to export to a processor we hold no terms with. Group size answers a
  // re-identification question, the agreement answers a processing question, and
  // passing one is not passing the other.
  const d = ext({ label: "listing count", dataClass: "aggregate_count", n: 1 });
  assert.equal(d.allowed, false);
  assert.match(d.reason, /enterprise AI agreement/);

  const big = ext({ label: "landlord count", dataClass: "aggregate_count", overParties: true, n: 5000 });
  assert.equal(big.allowed, false);
  assert.match(big.reason, /enterprise AI agreement/);
});

test("an aggregate over inventory may leave regardless of size", () => {
  assert.equal(
    ext({ label: "listing count", dataClass: "aggregate_count", n: 1 }, { agreementInForce: true }).allowed,
    true
  );
});

test("an aggregate over parties is denied below the minimum group size", () => {
  for (const n of [0, 1, 9]) {
    const d = ext(
      { label: "landlord count", dataClass: "aggregate_count", overParties: true, n },
      { agreementInForce: true }
    );
    assert.equal(d.allowed, false, String(n));
    assert.match(d.reason, /minimum group size/);
  }
  assert.equal(
    ext(
      { label: "landlord count", dataClass: "aggregate_count", overParties: true, n: AGGREGATE_MIN },
      { agreementInForce: true }
    ).allowed,
    true
  );
});

test("an aggregate over parties with a missing or non-finite n is treated as zero", () => {
  for (const n of [undefined, NaN, Infinity]) {
    const d = ext(
      { label: "party count", dataClass: "aggregate_count", overParties: true, n: n as number },
      { agreementInForce: true }
    );
    assert.equal(d.allowed, false, String(n));
  }
});

// 4. The source gate, which is independent of the provider gate.

test("licensed material with no source_id is denied", () => {
  const d = ext({ label: "figure", dataClass: "licensed_source" });
  assert.equal(d.allowed, false);
  assert.match(d.reason, /no recorded rights/);
});

test("licensed material with no rights row is denied", () => {
  const d = ext({ label: "figure", dataClass: "licensed_source", sourceId: "ghost" }, { rights: rightsFor({}) });
  assert.equal(d.allowed, false);
  assert.match(d.reason, /no rights row/);
});

test("fidelity defaults to the strictest reading rather than the loosest", () => {
  // A part that does not say how much it carries is treated as carrying all of it.
  const d = ext(
    { label: "figure", dataClass: "licensed_source", sourceId: "src" },
    { rights: rightsFor({ model_input_policy: "redacted" }), agreementInForce: true }
  );
  assert.equal(d.allowed, false);
  assert.match(d.reason, /'full'/);
});

test("a source that permits model input still needs the provider agreement", () => {
  const d = ext(
    { label: "figure", dataClass: "licensed_source", sourceId: "src", fidelity: "full" },
    { rights: rightsFor({ model_input_policy: "full" }) }
  );
  assert.equal(d.allowed, false);
  assert.match(d.reason, /no enterprise AI agreement/);
});

test("a provider agreement does not create a licence we never had", () => {
  const d = ext(
    { label: "figure", dataClass: "licensed_source", sourceId: "src", fidelity: "redacted" },
    { rights: rightsFor({ model_input_policy: "none" }), agreementInForce: true }
  );
  assert.equal(d.allowed, false);
  assert.match(d.reason, /does not permit model input/);
});

test("both gates open together and only together", () => {
  const d = ext(
    { label: "figure", dataClass: "licensed_source", sourceId: "src", fidelity: "redacted" },
    { rights: rightsFor({ model_input_policy: "redacted" }), agreementInForce: true }
  );
  assert.equal(d.allowed, true);
});

test("an unevidenced source is denied model input even with an agreement", () => {
  const d = ext(
    { label: "figure", dataClass: "licensed_source", sourceId: "src", fidelity: "redacted" },
    {
      rights: rightsFor({ model_input_policy: "full", rights_status: "asserted_unverified" }),
      agreementInForce: true,
    }
  );
  assert.equal(d.allowed, false);
});

// 5. Unknown classes deny.

test("an unrecognised data class is denied rather than defaulted", () => {
  const d = ext({ label: "mystery", dataClass: "something_new" as never });
  assert.equal(d.allowed, false);
  assert.match(d.reason, /unrecognised data class/);
});

// 6. The prompt builder fails whole, never partial.

test("one denied part fails the entire prompt", () => {
  const r = buildExternalPrompt([
    { label: "instruction", dataClass: "own_instruction" },
    { label: "deed", dataClass: "verification_evidence" },
    { label: "listing copy", dataClass: "public_published" },
  ]);
  assert.equal(r.allowed, false);
  assert.equal(r.allowed === false && r.denials.length, 1);
  assert.equal(r.reasons.length, 3);
});

test("a prompt carrying only pre-agreement classes is permitted whole", () => {
  const r = buildExternalPrompt([
    { label: "instruction", dataClass: "own_instruction" },
    { label: "listing copy", dataClass: "public_published" },
    { label: "gold row", dataClass: "synthetic_sample", syntheticSetId: "adv3-eval-gold" },
  ]);
  assert.equal(r.allowed, true);
  assert.equal(r.allowed === true && r.parts.length, 3);
});

test("a denied prompt returns no parts at all, so nothing can be sent by accident", () => {
  const r = buildExternalPrompt([{ label: "deed", dataClass: "verification_evidence" }]);
  assert.equal(r.allowed, false);
  assert.equal("parts" in r, false);
});

test("an empty prompt is permitted and carries nothing", () => {
  const r = buildExternalPrompt([]);
  assert.equal(r.allowed, true);
  assert.equal(r.allowed === true && r.parts.length, 0);
});

test("every allow and every denial produces a reason line", () => {
  const r = buildExternalPrompt([
    { label: "a", dataClass: "public_published" },
    { label: "b", dataClass: "party_personal" },
  ]);
  assert.equal(r.reasons.length, 2);
  for (const line of r.reasons) assert.ok(line.length > 0);
});

// 7. The live surface, which is now derived rather than declared.

test("the class our own system prompts carry is permitted unconditionally", () => {
  // A system prompt is the one part of a request that used to carry no
  // declaration at all. It carries no party data, no platform record and no
  // licensed figure, so it passes both gates, and saying so out loud is the point:
  // an undeclared part has no route out of the process.
  const d = ext({ label: "advisor system prompt", dataClass: "own_instruction" });
  assert.equal(d.allowed, true);
  assert.match(d.reason, /our own instruction/);
});

test("an instruction class does not launder what it quotes", () => {
  // The instruction itself passes. A count of parties below the minimum group
  // size, quoted into that instruction through a slot, still fails the whole
  // request. The structural half of this lives in src/lib/ai/message.ts, which
  // will not interpolate a value into a prompt except through a slot that
  // declares its own parts; this is the boundary half.
  const r = buildExternalPrompt(
    [
      { label: "advisor system prompt", dataClass: "own_instruction" },
      { label: "landlord count", dataClass: "aggregate_count", overParties: true, n: 3 },
    ],
    // The agreement is opened deliberately, so that the denial below can only be
    // the group-size rule. Otherwise the provider gate would answer first and this
    // test would pass without exercising the thing it is named after.
    { agreementInForce: true }
  );
  assert.equal(r.allowed, false);
  assert.equal(r.allowed === false && r.denials.length, 1);
  assert.match(r.allowed === false ? r.denials[0] : "", /minimum group size/);
});

test("there is no hand-written declaration of what the advisor sends", () => {
  // There used to be: ADVISOR_PROMPT_PARTS, checked by the boundary while a
  // different array went to the provider. Nothing tied the two together, so the
  // declaration was true only while somebody remembered. The gateway now derives
  // the checked parts from the sent messages. If a future edit reintroduces a
  // standing list of parts for a route, this is the test that argues with it.
  const src = readFileSync("src/lib/aiBoundary.ts", "utf8");
  assert.doesNotMatch(src, /export const [A-Z_]*PROMPT_PARTS/);
});
