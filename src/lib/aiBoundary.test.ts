import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AI_AGREEMENT_IN_FORCE,
  AGGREGATE_MIN,
  ADVISOR_PROMPT_PARTS,
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

// 2. What is always permitted, and why.

test("already-published material and the users own words may leave", () => {
  assert.equal(ext({ label: "listing copy", dataClass: "public_published" }).allowed, true);
  assert.equal(ext({ label: "their message", dataClass: "user_own_words" }).allowed, true);
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

test("an aggregate over inventory may leave regardless of size", () => {
  assert.equal(ext({ label: "listing count", dataClass: "aggregate_count", n: 1 }).allowed, true);
});

test("an aggregate over parties is denied below the minimum group size", () => {
  for (const n of [0, 1, 9]) {
    const d = ext({ label: "landlord count", dataClass: "aggregate_count", overParties: true, n });
    assert.equal(d.allowed, false, String(n));
    assert.match(d.reason, /minimum group size/);
  }
  assert.equal(
    ext({ label: "landlord count", dataClass: "aggregate_count", overParties: true, n: AGGREGATE_MIN }).allowed,
    true
  );
});

test("an aggregate over parties with a missing or non-finite n is treated as zero", () => {
  for (const n of [undefined, NaN, Infinity]) {
    const d = ext({ label: "party count", dataClass: "aggregate_count", overParties: true, n: n as number });
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
    { label: "user message", dataClass: "user_own_words" },
    { label: "deed", dataClass: "verification_evidence" },
    { label: "listing copy", dataClass: "public_published" },
  ]);
  assert.equal(r.allowed, false);
  assert.equal(r.allowed === false && r.denials.length, 1);
  assert.equal(r.reasons.length, 3);
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

// 7. The live advisor surface.

test("the declared advisor context passes the boundary today", () => {
  const r = buildExternalPrompt(ADVISOR_PROMPT_PARTS);
  assert.equal(r.allowed, true);
});

test("the declared advisor context carries no licensed or private material", () => {
  for (const p of ADVISOR_PROMPT_PARTS) {
    assert.ok(
      ["user_own_words", "aggregate_count", "public_published"].includes(p.dataClass),
      `${p.label} is ${p.dataClass}`
    );
  }
});

test("no advisor aggregate counts parties", () => {
  for (const p of ADVISOR_PROMPT_PARTS) {
    if (p.dataClass === "aggregate_count") assert.notEqual(p.overParties, true, p.label);
  }
});
