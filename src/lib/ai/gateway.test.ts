import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { callModel, sanitizeModelText } from "./gateway";
import { instruction, userWords, priorTurn, classified, partsOf, UnclassifiedMessageError } from "./message";
import { CANDIDATES, selectChain } from "./router";

// ADV-3A. Three kinds of test live here and they are not interchangeable.
//
// The behavioural tests check that the gateway does what it says. The structural
// tests read the repository and fail if a future edit reopens a path around the
// gateway, because "the gateway is the only door" is a claim about every file in
// the tree and cannot be checked from inside one module. The router tests check
// that selection is honest about what it knows.
//
// The needles in the structural tests are assembled from fragments so that this
// file does not match its own scan. That is deliberate: a scan that has to exempt
// its own test file has already lost a little of its authority.

const SRC = "src";

const tsFiles = (): string[] => {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(p)) out.push(p);
    }
  };
  walk(SRC);
  return out;
};

const norm = (p: string) => p.split(path.sep).join("/");

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

// 1. The structural claim: one module opens a socket to a provider.

test("no file outside the transport opens a provider request", () => {
  const needles = ["chat/" + "completions", "x-api" + "-key", "anthropic" + "-version"];
  const allowed = "src/lib/ai/trans" + "port.ts";
  const offenders: string[] = [];
  for (const f of tsFiles()) {
    if (norm(f) === allowed) continue;
    const t = fs.readFileSync(f, "utf8");
    if (needles.some((n) => t.includes(n))) offenders.push(norm(f));
  }
  assert.deepEqual(offenders, [], `these files reach a provider directly: ${offenders.join(", ")}`);
});

test("nothing but the gateway imports the transport", () => {
  const mod = "trans" + "port";
  const re = new RegExp(`from\\s+["'][^"']*${mod}["']`);
  const allowed = new Set(["src/lib/ai/gateway.ts", `src/lib/ai/${mod}.ts`]);
  const offenders: string[] = [];
  for (const f of tsFiles()) {
    if (allowed.has(norm(f))) continue;
    if (re.test(fs.readFileSync(f, "utf8"))) offenders.push(norm(f));
  }
  assert.deepEqual(offenders, [], `these files import the transport directly: ${offenders.join(", ")}`);
});

test("the package index does not re-export the transport", () => {
  const mod = "trans" + "port";
  const idx = fs.readFileSync("src/lib/ai/index.ts", "utf8");
  assert.doesNotMatch(idx, new RegExp(`export[\\s\\S]{0,200}from\\s+["']\\./${mod}["']`));
});

// 2. The router refuses to know what anything costs.

test("no price-shaped key can reach the ordering function", () => {
  // The header comment says nothing is chosen on token price. A comment is not a
  // constraint, so this reads the code with the comments removed.
  const code = stripComments(fs.readFileSync("src/lib/ai/router.ts", "utf8"));
  assert.doesNotMatch(code, /\b(price|pricing|cost|costs|rate|rates|usd|cents|perToken|per_token)\b/i);
});

test("every candidate is registered with an explicit evaluation state", () => {
  for (const c of CANDIDATES) {
    assert.ok(c.evaluation.status === "evaluated" || c.evaluation.status === "unevaluated", c.key);
    if (c.evaluation.status === "unevaluated") assert.ok(c.evaluation.why.length > 0, c.key);
  }
});

test("kimi is registered for evaluation and is not reachable without a key", () => {
  const kimi = CANDIDATES.find((c) => c.key === "kimi-k2");
  assert.ok(kimi, "kimi is registered so that considering it is a recorded act");
  assert.equal(kimi!.evaluation.status, "unevaluated");
  const chain = selectChain("classification", { AI_API_KEY: "k" });
  assert.equal(chain.some((s) => s.candidate.key === "kimi-k2"), false);
});

test("an unevaluated selection says so rather than claiming it won something", () => {
  const chain = selectChain("classification", { AI_API_KEY: "k", ANTHROPIC_API_KEY: "k2" });
  assert.ok(chain.length >= 2);
  assert.equal(chain[0].candidate.key, "deepseek-chat");
  for (const s of chain) assert.equal(s.basis, "configured_default_no_evaluation");
});

test("a profile no configured model serves returns an empty chain rather than a guess", () => {
  assert.deepEqual(selectChain("vision", { AI_API_KEY: "k", ANTHROPIC_API_KEY: "k" }), []);
  assert.deepEqual(selectChain("classification", {}), []);
});

test("an env override changes the model id without changing the candidate", () => {
  const chain = selectChain("classification", { AI_API_KEY: "k", AI_MODEL: "deepseek-reasoner" });
  assert.equal(chain[0].candidate.key, "deepseek-chat");
  assert.equal(chain[0].model, "deepseek-reasoner");
});

// 3. A message carries its own classification.

test("a message cannot be built with no declared class", () => {
  assert.throws(() => classified("user", "hello", []), UnclassifiedMessageError);
  assert.throws(() => partsOf([{ role: "user", content: "x", parts: [] }]), UnclassifiedMessageError);
});

test("an instruction with an unfilled placeholder throws instead of being sent", () => {
  assert.throws(() => instruction("sys", "counts: {{ctx}}"), UnclassifiedMessageError);
});

test("a slot the template does not contain throws", () => {
  assert.throws(
    () => instruction("sys", "no slots here", [{ key: "ctx", value: "3", parts: [{ label: "c", dataClass: "aggregate_count" }] }]),
    UnclassifiedMessageError
  );
});

test("a slot with no declared class throws", () => {
  assert.throws(
    () => instruction("sys", "counts: {{ctx}}", [{ key: "ctx", value: "3", parts: [] }]),
    UnclassifiedMessageError
  );
});

test("a filled instruction declares both itself and what it quotes", () => {
  const m = instruction("advisor system", "published listings: {{ctx}}", [
    { key: "ctx", value: "412", parts: [{ label: "published listing count", dataClass: "aggregate_count" }] },
  ]);
  assert.equal(m.role, "system");
  assert.equal(m.content, "published listings: 412");
  assert.deepEqual(
    m.parts.map((p) => p.dataClass),
    ["own_instruction", "aggregate_count"]
  );
});

test("the parts checked are the parts of the messages sent", () => {
  const messages = [
    instruction("sys", "be brief"),
    priorTurn("user", "earlier"),
    userWords("what is available in Olaya"),
  ];
  assert.deepEqual(
    partsOf(messages).map((p) => p.dataClass),
    ["own_instruction", "user_own_words", "user_own_words"]
  );
});

// 4. The gateway.

const noFetch = () => {
  throw new Error("the gateway opened a socket when it should not have");
};

const stubFetch = async (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

const withFetch = async <T>(impl: any, fn: () => Promise<T>): Promise<T> => {
  const original = globalThis.fetch;
  (globalThis as any).fetch = impl;
  try {
    return await fn();
  } finally {
    (globalThis as any).fetch = original;
  }
};

test("a denied part stops the request before the network is touched", async () => {
  const r = await withFetch(noFetch, () =>
    callModel({
      profile: "classification",
      messages: [
        instruction("sys", "extract"),
        classified("user", "a deed scan", [{ label: "deed", dataClass: "verification_evidence" }]),
      ],
      env: { AI_API_KEY: "k" },
    })
  );
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.failure, "boundary");
  assert.ok(r.ok === false && r.denials.some((d) => /enterprise AI agreement/.test(d)));
});

test("the boundary runs before selection, so a denial is never a provider failure", async () => {
  // No key is configured here either. If selection ran first this would report
  // no_provider and the denial would never be recorded.
  const r = await withFetch(noFetch, () =>
    callModel({
      profile: "classification",
      messages: [classified("user", "x", [{ label: "contact", dataClass: "party_personal" }])],
      env: {},
    })
  );
  assert.equal(r.ok === false && r.failure, "boundary");
});

test("no configured provider is reported rather than papered over", async () => {
  const r = await withFetch(noFetch, () =>
    callModel({ profile: "classification", messages: [userWords("hello")], env: {} })
  );
  assert.equal(r.ok === false && r.failure, "no_provider");
});

test("a permitted request reaches the provider and returns its text", async () => {
  const seen: any[] = [];
  const impl = async (url: string, init: any) => {
    seen.push({ url, body: JSON.parse(init.body) });
    return stubFetch({ choices: [{ message: { content: "office" } }] });
  };
  const r = await withFetch(impl, () =>
    callModel({
      profile: "classification",
      messages: [instruction("sys", "extract"), userWords("office in Olaya")],
      json: true,
      env: { AI_API_KEY: "k" },
    })
  );
  assert.equal(r.ok, true);
  assert.equal(r.ok === true && r.text, "office");
  assert.equal(r.ok === true && r.provider, "deepseek");
  assert.equal(seen.length, 1);
  assert.equal(seen[0].body.messages.length, 2);
  assert.equal(seen[0].body.messages[0].role, "system");
});

test("a failing primary falls over to the next candidate in the chain", async () => {
  const calls: string[] = [];
  const impl = async (url: string) => {
    calls.push(url);
    if (calls.length === 1) return stubFetch({ error: "down" }, 500);
    return stubFetch({ content: [{ type: "text", text: "recovered" }] });
  };
  const r = await withFetch(impl, () =>
    callModel({
      profile: "classification",
      messages: [userWords("hello")],
      env: { AI_API_KEY: "k", ANTHROPIC_API_KEY: "k2" },
    })
  );
  assert.equal(r.ok === true && r.text, "recovered");
  assert.equal(calls.length, 2);
});

test("a named candidate does not fail over to a different one", async () => {
  const calls: string[] = [];
  const impl = async (url: string) => {
    calls.push(url);
    return stubFetch({ error: "down" }, 500);
  };
  const r = await withFetch(impl, () =>
    callModel({
      profile: "bilingual_translation",
      candidate: "claude-sonnet",
      messages: [instruction("sys", "translate"), userWords("a listing description")],
      env: { ANTHROPIC_API_KEY: "k" },
    })
  );
  assert.equal(r.ok === false && r.failure, "provider_error");
  assert.equal(calls.length, 1, "a quality request must not be answered by the fast tier");
});

test("an exact model id overrides the candidate default", async () => {
  let sentModel = "";
  const impl = async (_url: string, init: any) => {
    sentModel = JSON.parse(init.body).model;
    return stubFetch({ content: [{ type: "text", text: "ok" }] });
  };
  await withFetch(impl, () =>
    callModel({
      profile: "bilingual_translation",
      candidate: "claude-haiku",
      modelId: "claude-haiku-pinned",
      messages: [userWords("text")],
      env: { ANTHROPIC_API_KEY: "k" },
    })
  );
  assert.equal(sentModel, "claude-haiku-pinned");
});

test("every provider path sanitizes the dash the platform forbids", () => {
  const em = String.fromCharCode(8212);
  const en = String.fromCharCode(8211);
  assert.equal(sanitizeModelText(`Olaya ${em} Riyadh`), "Olaya, Riyadh");
  assert.equal(sanitizeModelText(`1,800${en}2,900`), "1,800, 2,900");
  assert.doesNotMatch(sanitizeModelText(`a ${em} b`), new RegExp(em));
});

test("an empty answer is a failure to answer rather than an empty answer", async () => {
  const impl = async () => stubFetch({ choices: [{ message: { content: "   \n  " } }] });
  const r = await withFetch(impl, () =>
    callModel({ profile: "classification", messages: [userWords("x")], env: { AI_API_KEY: "k" } })
  );
  assert.equal(r.ok, false);
});
