import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildExternalPrompt, type PromptPart } from "@/lib/aiBoundary";
import { instruction, partsOf } from "@/lib/ai/message";
import { defineTool, err, ok, toolResultSlot, ToolDefinitionError, type ToolContext, type ToolOk } from "./tool";

// ADV-3B. The properties the tool contract claims, asserted rather than trusted.
//
// Each of these corresponds to a sentence in the header of `tool.ts`. A claim in
// a comment that no test reads is the same kind of claim ADV-3A.1 had to withdraw.

const CTX: ToolContext = { actor: { role: "anonymous" }, locale: "en" };

function trivial<T>(value: T, text: string, parts: readonly PromptPart[]) {
  return defineTool<Record<string, never>, T>({
    name: "test_tool",
    effect: "compute",
    capability: "read_public",
    summary: { en: "A tool used only by this test file.", ar: "أداة تُستخدم في ملف الاختبار هذا فقط." },
    parse: () => ({ ok: true, input: {} }),
    run: async () => ok(value, text, parts),
  });
}

// ------------------------------------------------------- 1. no consequential write

// `ToolEffect` has no `write` member, so the property is enforced by the type
// checker and cannot be asserted at runtime by calling anything. It can be
// asserted about the source, which is what a reviewer would check by eye and
// therefore what stops being checked. A future package that adds a fourth effect
// has to come through here.

test("the effect union stays read, compute and propose, with no write", () => {
  const src = readFileSync(join(__dirname, "tool.ts"), "utf8");
  const union = src.slice(src.indexOf("export type ToolEffect ="));
  const decl = union.slice(0, union.indexOf(";"));
  const members = [...decl.matchAll(/\|\s*"([a-z_]+)"/g)].map((m) => m[1]);
  assert.deepEqual(members, ["read", "compute", "propose"]);
});

// --------------------------------------------------- 2. a result declares itself

test("a tool cannot return an ok result with no declared data class", async () => {
  const t = trivial("v", "some text", []);
  await assert.rejects(() => t.run({}, CTX), ToolDefinitionError);
});

test("the failure names the tool, so the fix lands in the tool and not in the loop", async () => {
  const t = trivial("v", "some text", []);
  await assert.rejects(
    () => t.run({}, CTX),
    (e: Error) => e.message.includes("test_tool") && e.message.includes("data class")
  );
});

test("a rejection carries no parts, because a refusal sentence is our own words", async () => {
  const t = defineTool<Record<string, never>, string>({
    name: "refusing_tool",
    effect: "compute",
    capability: "read_public",
    summary: { en: "Always refuses.", ar: "يرفض دائماً." },
    parse: () => ({ ok: true, input: {} }),
    run: async () => err("not_found", "Nothing matched."),
  });
  const r = await t.run({}, CTX);
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.failure, "not_found");
});

// ------------------------------------------- toolResultSlot is the only route

test("a tool result reaches a prompt carrying its own classification", () => {
  const r: ToolOk<string> = ok("v", "Riyadh, Al Olaya", [
    { label: "published inventory", dataClass: "public_published" },
  ]);
  const msg = instruction("test")`Consider: ${toolResultSlot("parse_query", r)}`;
  const parts = partsOf([msg]);
  assert.deepEqual(
    parts.map((p) => p.dataClass),
    ["own_instruction", "public_published"]
  );
  assert.match(msg.content, /parse_query: Riyadh, Al Olaya/);
});

test("a result carrying licensed material denies at the boundary rather than at the tool", () => {
  const r: ToolOk<string> = ok("v", "1200 to 1600", [
    { label: "published rent band", dataClass: "licensed_source", sourceId: "rega_rent_index", fidelity: "full" },
  ]);
  const msg = instruction("analyst")`Bands: ${toolResultSlot("rent_band", r)}`;
  const decision = buildExternalPrompt(partsOf([msg]));
  assert.equal(decision.allowed, false);
  assert.equal(decision.allowed === false && decision.denials.length, 1);
});

test("a result carrying user text denies while the agreement gate is closed", () => {
  const r: ToolOk<string> = ok("v", "the Acme expansion", [
    { label: "free text the vocabulary did not recognise", dataClass: "user_own_words" },
  ]);
  const msg = instruction("discovery")`Query: ${toolResultSlot("parse_query", r)}`;
  assert.equal(buildExternalPrompt(partsOf([msg])).allowed, false);
});

test("the same result is permitted once the agreement is recorded", () => {
  const r: ToolOk<string> = ok("v", "the Acme expansion", [
    { label: "free text the vocabulary did not recognise", dataClass: "user_own_words" },
  ]);
  const msg = instruction("discovery")`Query: ${toolResultSlot("parse_query", r)}`;
  assert.equal(buildExternalPrompt(partsOf([msg]), { agreementInForce: true }).allowed, true);
});

// The observation-laundering route ADV-3B would otherwise open: appending a tool
// result to the transcript as ordinary instruction text. There is no overload
// that accepts a bare string, so the only way to write this test is to do the
// thing the design forbids by hand, and see the type checker and the boundary
// both notice.
test("a tool result cannot be interpolated into a prompt as a bare string", () => {
  const r: ToolOk<string> = ok("v", "unpublished platform rows", [
    { label: "platform records", dataClass: "platform_internal" },
  ]);
  assert.throws(
    // @ts-expect-error a raw value is exactly what the tagged template refuses
    () => instruction("loop")`Observation: ${r.text}`,
    /undeclared value/
  );
});

// -------------------------------------------------------------- 3. names parse

test("a tool name that a model could not reliably emit is refused at definition", () => {
  for (const name of ["Parse", "x", "parse-query", "1parse", "parse query"]) {
    assert.throws(
      () =>
        defineTool({
          name,
          effect: "compute",
          capability: "read_public",
          summary: { en: "x", ar: "س" },
          parse: () => ({ ok: true, input: {} }),
          run: async () => ok({}, "t", [{ label: "l", dataClass: "own_instruction" }]),
        }),
      ToolDefinitionError,
      name
    );
  }
});

test("a tool that describes itself in one language only is refused", () => {
  assert.throws(
    () =>
      defineTool({
        name: "half_described",
        effect: "compute",
        capability: "read_public",
        summary: { en: "Described in English only.", ar: "  " },
        parse: () => ({ ok: true, input: {} }),
        run: async () => ok({}, "t", [{ label: "l", dataClass: "own_instruction" }]),
      }),
    ToolDefinitionError
  );
});
