import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { callModel, sanitizeModelText } from "./gateway";
import { instruction, phrase, classifiedSlot, userWords, priorUserTurn, classified, partsOf, UnclassifiedMessageError } from "./message";
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

// ADV-3A.1. WHAT THIS SCAN DOES AND DOES NOT PROVE.
//
// The first version looked for three needles: a completions path and two
// provider headers. Codex was right that this did not establish what the closure
// record claimed. A file could have reached a provider through an SDK, through a
// responses or messages endpoint, through a hostname, through a differently
// named authorization header, or through a generic fetch to a URL held in a
// configuration value, and this test would have passed.
//
// The list below is wider: endpoints, hostnames, SDK package names, provider
// authorization headers and model-related environment reads. It is still a list.
// A determined future edit can assemble a hostname from fragments, exactly as
// this file assembles its own needles to avoid matching itself, and no source
// scan can see through that.
//
// So the claim this test supports is the narrow one, and the closure record now
// makes only that claim: every currently known and registered provider
// integration is centralized in the transport and guarded here. It is not a
// proof that no other socket is expressible.
//
// A note on `/messages`: taken bare it is a route in this application, linked
// from the header, so a bare match would flag a dozen navigation files and the
// test would be turned off within a week. It is matched as a versioned API path
// instead, which is the form every provider actually uses.

const PROVIDER_NEEDLES: RegExp[] = [
  // Endpoints.
  new RegExp("chat/" + "completions"),
  new RegExp("/v\\d+/" + "messages"),
  new RegExp("/v\\d+/" + "responses"),
  new RegExp("/v\\d+/" + "complete"),
  new RegExp("[\"'`]/" + "responses[\"'`]"),
  new RegExp(":generate" + "Content"),
  // Authorization and versioning headers providers use.
  new RegExp("x-api" + "-key", "i"),
  new RegExp("anthropic" + "-version", "i"),
  // Google's model header is the same header Google Places uses, and
  // `/api/places` is a legitimate maps integration. Gemini is caught by its
  // hostname and by the generateContent path instead, which are specific to it.
  new RegExp("openai" + "-organization", "i"),
  new RegExp("http-" + "referer[\"'`]?\\s*:", "i"),
  // Hostnames.
  new RegExp("api\\.open" + "ai\\.com"),
  new RegExp("api\\.anthro" + "pic\\.com"),
  new RegExp("api\\.deep" + "seek\\.com"),
  new RegExp("generativelanguage\\.google" + "apis\\.com"),
  new RegExp("api\\.moon" + "shot\\.(cn|ai)"),
  new RegExp("open" + "router\\.ai"),
  new RegExp("api\\.mis" + "tral\\.ai"),
  new RegExp("api\\.gro" + "q\\.com"),
  new RegExp("api\\.toget" + "her\\.xyz"),
  new RegExp("bed" + "rock-runtime\\."),
  // Provider SDK imports.
  new RegExp("from\\s+[\"']open" + "ai"),
  new RegExp("from\\s+[\"']@anthro" + "pic-ai/"),
  new RegExp("from\\s+[\"']@google/gener" + "ative-ai"),
  new RegExp("from\\s+[\"']@mist" + "ralai/"),
  new RegExp("from\\s+[\"']@aws-sdk/client-bed" + "rock"),
  new RegExp("from\\s+[\"']@azure/open" + "ai"),
  new RegExp("require\\([\"']open" + "ai"),
  // Model-related environment reads. A second place that decides which model
  // answers is a second provider integration even when it opens no socket, which
  // is how the Arabic translator held its own tier table for a while.
  // Deliberately not a bare `API_KEY`: the maps key and the database keys are not
  // model configuration, and a guard that flags them is a guard somebody deletes.
  new RegExp("process\\.env\\.[A-Z0-9_]*(_MODEL|MODEL_|ANTHRO" + "PIC|OPEN" + "AI|DEEP" + "SEEK|GEM" + "INI|MOON" + "SHOT|LLM|AI_API_KEY)"),
];

// The transport is the socket. The router is the register of which models exist
// and which environment keys configure them, which is its declared job.
const PROVIDER_ALLOWED = new Set([
  "src/lib/ai/trans" + "port.ts",
  "src/lib/ai/router.ts",
  "src/lib/ai/gateway.test.ts",
]);

test("no file outside the AI package reaches a provider or decides which model answers", () => {
  const offenders: { file: string; needle: string }[] = [];
  for (const f of tsFiles()) {
    const n = norm(f);
    if (PROVIDER_ALLOWED.has(n)) continue;
    const t = fs.readFileSync(f, "utf8");
    for (const re of PROVIDER_NEEDLES) {
      if (re.test(t)) offenders.push({ file: n, needle: String(re) });
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `these files reach a provider or hold provider configuration directly: ${offenders.map((o) => `${o.file} (${o.needle})`).join(", ")}`
  );
});

test("the supabase key reads are not caught by the provider env rule", () => {
  // A guard that flags the database client is a guard somebody switches off.
  const re = PROVIDER_NEEDLES.find((r) => String(r).includes("process"))!;
  assert.equal(re.test("process.env.SUPABASE_SERVICE_ROLE_KEY"), false);
  assert.equal(re.test("process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY"), false);
  assert.equal(re.test("process.env.GOOGLE_MAPS_API_KEY"), false);
  assert.equal(re.test("process.env.SAT_TRANSLATE_MODEL_FAST"), true);
  assert.equal(re.test("process.env.ANTHROPIC_API_KEY"), true);
  assert.equal(re.test("process.env.AI_API_KEY"), true);
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
  assert.throws(() => partsOf([{ role: "user", content: "x", parts: [] } as any]), UnclassifiedMessageError);
});

test("an object literal shaped like a classified message is not one", () => {
  // ADV-3A.1. Before the private-symbol brand this passed. The type was purely
  // structural, so any literal with a role, a content and a parts array was
  // accepted everywhere a classified message was, and it declared whatever class
  // its author fancied. The brand key cannot be named outside message.ts, so the
  // forgery below cannot be written by application code at all, and if it is
  // cast into place it still does not reach a provider.
  const forged: any = {
    role: "user",
    content: "Acme is leaving Al Olaya and needs 900 sqm",
    parts: [{ label: "harmless", dataClass: "own_instruction" }],
  };
  assert.throws(() => partsOf([forged]), UnclassifiedMessageError);
});

test("an instruction cannot be called with a composed string", () => {
  // This is the old signature, and it is the exact call that laundered a dynamic
  // value into own_instruction. It must not type-check and must not run.
  assert.throws(() => (instruction("sys") as any)("counts: " + 3), UnclassifiedMessageError);
});

test("a raw interpolation is refused at the point of interpolation", () => {
  const tenantRequirement = "Acme is leaving Al Olaya and needs 900 sqm";
  assert.throws(() => instruction("sys")`extract from: ${tenantRequirement as any}`, UnclassifiedMessageError);
  assert.throws(() => instruction("sys")`count: ${412 as any}`, UnclassifiedMessageError);
  assert.throws(() => phrase`count: ${412 as any}`, UnclassifiedMessageError);
});

test("a slot with no declared class throws", () => {
  assert.throws(() => classifiedSlot("412", []), UnclassifiedMessageError);
});

test("a filled instruction declares both itself and what it quotes", () => {
  const m = instruction("advisor system")`published listings: ${classifiedSlot("412", [
    { label: "published listing count", dataClass: "aggregate_count" },
  ])}`;
  assert.equal(m.role, "system");
  assert.equal(m.content, "published listings: 412");
  assert.deepEqual(
    m.parts.map((p) => p.dataClass),
    ["own_instruction", "aggregate_count"]
  );
});

test("a phrase carries its own slots up into the instruction that holds it", () => {
  const m = instruction("advisor system")`base.${phrase` context: ${classifiedSlot("7", [
    { label: "segment count", dataClass: "aggregate_count" },
  ])}`}`;
  assert.equal(m.content, "base. context: 7");
  assert.deepEqual(
    m.parts.map((p) => p.dataClass),
    ["own_instruction", "aggregate_count"]
  );
});

test("a phrase with no slots is our own instruction text", () => {
  const m = instruction("advisor system")`say this: ${phrase`in Arabic`}`;
  assert.deepEqual(
    m.parts.map((p) => p.dataClass),
    ["own_instruction", "own_instruction"]
  );
});

test("the parts checked are the parts of the messages sent", () => {
  const messages = [
    instruction("sys")`be brief`,
    priorUserTurn("earlier"),
    userWords("what is available in Olaya"),
  ];
  assert.deepEqual(
    partsOf(messages).map((p) => p.dataClass),
    ["own_instruction", "user_own_words", "user_own_words"]
  );
});

test("there is no way to build an assistant turn for a provider", () => {
  // ADV-3A.1, Codex item 3. `priorTurn(role, content)` accepted "assistant" and
  // classified it user_own_words. The correction is not a stricter label, it is
  // the absence of the constructor: until history carries typed provenance per
  // turn, assistant text does not go to an external model at all.
  const mod = stripComments(fs.readFileSync("src/lib/ai/message.ts", "utf8"));
  assert.doesNotMatch(mod, /role:\s*"assistant"/);
  assert.doesNotMatch(mod, /export function priorTurn\b/);
});

// 4. The gateway.

const noFetch = () => {
  throw new Error("the gateway opened a socket when it should not have");
};

// ADV-3A.1. The behavioural tests below need a message the boundary permits
// before an agreement exists, because `userWords` no longer is one. A row from
// the registered evaluation gold set is exactly that, and it is also the only
// material Codex permits for provider testing: written for the purpose, copied
// from no listing, requirement, message or document.
const goldRow = (text: string) =>
  classified("user", text, [
    { label: "evaluation gold row", dataClass: "synthetic_sample", syntheticSetId: "adv3-eval-gold" },
  ]);

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
        instruction("sys")`extract`,
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
    callModel({ profile: "classification", messages: [goldRow("hello")], env: {} })
  );
  assert.equal(r.ok === false && r.failure, "no_provider");
});

test("the person's own words do not reach a provider while no agreement is in force", async () => {
  // ADV-3A.1, Codex item 1. This is the whole correction in one assertion: a
  // fully configured provider, a working socket, and the request still stops.
  const r = await withFetch(noFetch, () =>
    callModel({
      profile: "classification",
      messages: [instruction("search intent")`extract filters`, userWords("office in Olaya", "search query")],
      env: { AI_API_KEY: "k", ANTHROPIC_API_KEY: "k2" },
    })
  );
  assert.equal(r.ok === false && r.failure, "boundary");
  assert.ok(r.ok === false && r.denials.some((d) => /enterprise AI agreement/.test(d)));
});

test("a synthetic gold row is permitted, so the harness can still be exercised", async () => {
  const impl = async () => stubFetch({ choices: [{ message: { content: "office" } }] });
  const r = await withFetch(impl, () =>
    callModel({ profile: "classification", messages: [goldRow("office in Olaya")], env: { AI_API_KEY: "k" } })
  );
  assert.equal(r.ok, true);
});

test("a synthetic class without a registered set id is not a permission", async () => {
  const r = await withFetch(noFetch, () =>
    callModel({
      profile: "classification",
      messages: [classified("user", "x", [{ label: "row", dataClass: "synthetic_sample" }])],
      env: { AI_API_KEY: "k" },
    })
  );
  assert.equal(r.ok === false && r.failure, "boundary");
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
      messages: [instruction("sys")`extract`, goldRow("office in Olaya")],
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
      messages: [goldRow("hello")],
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
      messages: [instruction("sys")`translate`, goldRow("a listing description")],
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
      messages: [goldRow("text")],
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
    callModel({ profile: "classification", messages: [goldRow("x")], env: { AI_API_KEY: "k" } })
  );
  assert.equal(r.ok, false);
});
