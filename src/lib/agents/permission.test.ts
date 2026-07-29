import { test } from "node:test";
import assert from "node:assert/strict";
import { callTool, capabilitiesOf, mayCall, offerableTools } from "./permission";
import { defineTool, ok, type Actor, type ActorRole, type ToolContext } from "./tool";

// ADV-3B. The permission layer, tested for the three faults its header names.

const ROLES: ActorRole[] = ["anonymous", "tenant", "lister", "verified_lister", "staff"];

const PUBLIC_TOOL = { name: "parse_query", capability: "read_public" } as const;
const OWN_TOOL = { name: "my_requirements", capability: "read_own" } as const;
const OPS_TOOL = { name: "operations_pipeline", capability: "read_operations" } as const;
const PLATFORM_TOOL = { name: "unpublished_rows", capability: "read_platform" } as const;

function ctx(actor: Actor, locale: "en" | "ar" = "en"): ToolContext {
  return { actor, locale };
}

// ------------------------------------------------------------- the grant table

test("a signed-out visitor holds public reading and nothing else", () => {
  assert.deepEqual(capabilitiesOf({ role: "anonymous" }), ["read_public"]);
});

test("only staff hold the platform and operations capabilities", () => {
  for (const role of ROLES) {
    const caps = capabilitiesOf({ role });
    const staffOnly = caps.includes("read_platform") || caps.includes("read_operations");
    assert.equal(staffOnly, role === "staff", role);
  }
});

test("every role holds public reading, so a refusal is never about the public catalogue", () => {
  for (const role of ROLES) assert.ok(capabilitiesOf({ role }).includes("read_public"), role);
});

test("an unknown role falls back to the signed-out grants rather than to everything", () => {
  assert.deepEqual(capabilitiesOf({ role: "auditor" as ActorRole }), ["read_public"]);
});

// ---------------------------------------------------------- own without a party

test("a capability over the actors own records needs an actor", () => {
  const d = mayCall({ role: "tenant" }, OWN_TOOL);
  assert.equal(d.allowed, false);
  assert.match(d.reason, /signed-in party/);
});

test("the same call is allowed once the session carries a party id", () => {
  assert.equal(mayCall({ role: "tenant", partyId: "p-1" }, OWN_TOOL).allowed, true);
});

test("a decision carries a reason on both branches, so a log line has one shape", () => {
  for (const d of [mayCall({ role: "anonymous" }, OPS_TOOL), mayCall({ role: "staff", partyId: "s-1" }, OPS_TOOL)]) {
    assert.ok(d.reason.length > 0);
    assert.match(d.reason, /operations_pipeline/);
  }
});

// ---------------------------------------------------- the offer is the disclosure

test("an unpermitted tool is not named in the list a model is given", () => {
  const offered = offerableTools({ role: "anonymous" }, [PUBLIC_TOOL, OWN_TOOL, OPS_TOOL, PLATFORM_TOOL]);
  assert.deepEqual(
    offered.map((t) => t.name),
    ["parse_query"]
  );
  assert.equal(
    JSON.stringify(offered).includes("operations_pipeline"),
    false,
    "naming a tool as unavailable discloses everything naming it would have"
  );
});

test("a signed-in tenant is offered their own records and still not operations", () => {
  const offered = offerableTools({ role: "tenant", partyId: "p-1" }, [PUBLIC_TOOL, OWN_TOOL, OPS_TOOL]);
  assert.deepEqual(
    offered.map((t) => t.name),
    ["parse_query", "my_requirements"]
  );
});

test("a tenant with no party id is not offered a tool they would then be refused", () => {
  const offered = offerableTools({ role: "tenant" }, [PUBLIC_TOOL, OWN_TOOL]);
  assert.deepEqual(
    offered.map((t) => t.name),
    ["parse_query"]
  );
});

// --------------------------------------------------- the check precedes the parse

function spyTool(seen: string[]) {
  return defineTool<{ segment: string }, string>({
    name: "operations_pipeline",
    effect: "read",
    capability: "read_operations",
    summary: { en: "Operational state.", ar: "الحالة التشغيلية." },
    parse(raw) {
      seen.push("parsed");
      const s = (raw as { segment?: unknown })?.segment;
      if (typeof s !== "string") return { ok: false, problem: "'segment' must be a string naming an operational stage" };
      return { ok: true, input: { segment: s } };
    },
    async run(input) {
      seen.push("ran");
      return ok(input.segment, input.segment, [{ label: "operational state", dataClass: "platform_internal" }]);
    },
  });
}

test("a refused caller never reaches the parser, so the schema is not published to them", async () => {
  const seen: string[] = [];
  const r = await callTool(spyTool(seen), { segment: 42 }, ctx({ role: "anonymous" }));
  assert.equal(r.ok, false);
  assert.deepEqual(seen, []);
  assert.equal(r.ok === false && r.failure, "not_permitted");
});

test("the refusal sentence names no field of the schema", async () => {
  const r = await callTool(spyTool([]), { segment: 42 }, ctx({ role: "anonymous" }));
  assert.equal(r.ok === false && r.text.includes("segment"), false);
  assert.equal(r.ok === false && r.text.includes("operational stage"), false);
});

test("a permitted caller with bad arguments learns what was wrong", async () => {
  const seen: string[] = [];
  const r = await callTool(spyTool(seen), { segment: 42 }, ctx({ role: "staff", partyId: "s-1" }));
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.failure, "bad_input");
  assert.match(r.ok === false ? r.text : "", /operational stage/);
  assert.deepEqual(seen, ["parsed"]);
});

test("a permitted caller with good arguments runs the tool", async () => {
  const seen: string[] = [];
  const r = await callTool(spyTool(seen), { segment: "viewings" }, ctx({ role: "staff", partyId: "s-1" }));
  assert.equal(r.ok, true);
  assert.deepEqual(seen, ["parsed", "ran"]);
});

// ---------------------------------------------------- one refusal, two reasons

test("both refusal reasons return the same sentence, so neither confirms a tool exists", async () => {
  const barred = await callTool(spyTool([]), {}, ctx({ role: "anonymous" }));
  const own = defineTool<Record<string, never>, string>({
    name: "my_requirements",
    effect: "read",
    capability: "read_own",
    summary: { en: "Your own requirements.", ar: "متطلباتك أنت." },
    parse: () => ({ ok: true, input: {} }),
    run: async () => ok("x", "x", [{ label: "own records", dataClass: "party_personal" }]),
  });
  const partyless = await callTool(own, {}, ctx({ role: "tenant" }));
  assert.equal(barred.ok, false);
  assert.equal(partyless.ok, false);
  assert.equal(barred.ok === false && barred.text, partyless.ok === false && partyless.text);
});

test("the refusal is written in the readers language", async () => {
  const en = await callTool(spyTool([]), {}, ctx({ role: "anonymous" }, "en"));
  const ar = await callTool(spyTool([]), {}, ctx({ role: "anonymous" }, "ar"));
  assert.equal(en.ok === false && /[a-z]/i.test(en.text), true);
  assert.equal(ar.ok === false && /[؀-ۿ]/.test(ar.text), true);
});

// ------------------------------------------------------------- no self-elevation

test("nothing in the permission layer takes a role from an argument", async () => {
  const seen: string[] = [];
  const r = await callTool(
    spyTool(seen),
    { segment: "viewings", role: "staff", actor: { role: "staff", partyId: "s-1" } },
    ctx({ role: "anonymous" })
  );
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.failure, "not_permitted");
  assert.deepEqual(seen, []);
});
