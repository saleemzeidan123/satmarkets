import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { UnclassifiedMessageError, partsOf } from "@/lib/ai/message";
import { buildExternalPrompt } from "@/lib/aiBoundary";
import { GOLD_CASES, GOLD_SET_ID, casesFor, type GoldCase } from "./gold";
import {
  deterministicSubject,
  formatReport,
  modelSubject,
  promptFor,
  runSuite,
  type Subject,
} from "./run";

// ADV-3B. The harness, and the firewall between it and selection.

const clock = () => {
  let t = 0;
  return () => (t += 5);
};

// ------------------------------------------------------------- the baseline

test("the deterministic parser answers every classification row correctly", async () => {
  const r = await runSuite(deterministicSubject(), { cases: casesFor("classification"), now: clock() });
  assert.equal(r.fail, 0, formatReport(r));
  assert.equal(r.pass, 12);
  assert.equal(r.unavailable, 0);
});

test("it reports the profiles it cannot attempt rather than guessing at them", async () => {
  const r = await runSuite(deterministicSubject(), { now: clock() });
  assert.equal(r.pass, 12);
  assert.equal(r.fail, 0);
  assert.equal(r.unavailable, GOLD_CASES.length - 12);
  for (const c of r.cases) {
    if (c.outcome !== "unavailable") continue;
    assert.ok(c.reason.length > 0, c.id);
  }
});

test("an all-unavailable run is clean and is not a pass, so both numbers have to be read", async () => {
  const silent: Subject = {
    id: "silent",
    kind: "deterministic",
    profiles: [],
    async run() {
      return { state: "unavailable", reason: "nothing is configured" };
    },
  };
  const r = await runSuite(silent, { now: clock() });
  assert.equal(r.clean, true);
  assert.equal(r.pass, 0);
  assert.equal(r.unavailable, GOLD_CASES.length);
});

test("a subject that throws fails that row and the run continues", async () => {
  let asked = 0;
  const flaky: Subject = {
    id: "flaky",
    kind: "deterministic",
    profiles: ["classification"],
    async run(c) {
      asked++;
      if (c.id === "q-en-03") throw new Error("a deliberate fault");
      return { state: "answered", answer: { kind: "text", text: "not a parse" } };
    },
  };
  const r = await runSuite(flaky, { cases: casesFor("classification"), now: clock() });
  assert.equal(asked, 12);
  const bad = r.cases.find((c) => c.id === "q-en-03")!;
  assert.equal(bad.outcome, "fail");
  assert.match(bad.failures.join(" "), /a deliberate fault/);
  assert.equal(r.fail, 12);
});

test("the report is keyed to the set it ran, so two reports cannot be compared by accident", async () => {
  const r = await runSuite(deterministicSubject(), { cases: [], now: clock() });
  assert.equal(r.setId, GOLD_SET_ID);
  assert.equal(r.subjectId, "deterministic");
  assert.equal(r.subjectKind, "deterministic");
});

test("the clock is injected, so a latency figure is an assertion rather than a hope", async () => {
  const r = await runSuite(deterministicSubject(), { cases: casesFor("classification"), now: clock() });
  for (const c of r.cases) assert.equal(c.ms, 5);
  assert.ok(r.totalMs > 0);
});

test("units add up across rows and start at zero for a subject that never leaves the process", async () => {
  const r = await runSuite(deterministicSubject(), { now: clock() });
  assert.deepEqual(r.units, { requests: 0, promptChars: 0, completionChars: 0 });
  const counted: Subject = {
    id: "counted",
    kind: "model",
    profiles: ["short_prose"],
    async run() {
      return {
        state: "answered",
        answer: { kind: "text", text: "Which asset type do you need?" },
        units: { requests: 1, promptChars: 100, completionChars: 29 },
      };
    },
  };
  const c = await runSuite(counted, { cases: casesFor("short_prose"), now: clock() });
  assert.equal(c.units.requests, 6);
  assert.equal(c.units.promptChars, 600);
  assert.equal(c.units.completionChars, 174);
});

test("a written report names every row that did not pass and no row that did", async () => {
  const r = await runSuite(deterministicSubject(), { now: clock() });
  const text = formatReport(r);
  assert.match(text, /12 pass/);
  assert.equal(text.includes("q-en-01"), false);
  assert.match(text, /p-en-01/);
  assert.equal(text.includes(String.fromCharCode(8212)), false);
});

// --------------------------------------------------------------- the prompt

test("every gold case builds a classified prompt with no undeclared interpolation", () => {
  for (const c of GOLD_CASES) {
    const m = promptFor(c);
    assert.ok(m.content.includes(c.input.trim()) || c.input.trim() === "", c.id);
    const parts = partsOf([m]);
    assert.ok(parts.length >= 2, c.id);
    for (const p of parts) {
      assert.ok(["own_instruction", "synthetic_sample"].includes(p.dataClass), `${c.id}: ${p.dataClass}`);
    }
  }
});

test("the case text travels as this set's synthetic sample and not as a users words", () => {
  const c = GOLD_CASES[0];
  const sample = partsOf([promptFor(c)]).filter((p) => p.dataClass === "synthetic_sample");
  assert.equal(sample.length, 1);
  assert.equal(sample[0].syntheticSetId, GOLD_SET_ID);
});

test("the prompt is permitted out while the agreement gate is closed, which is the whole permission", () => {
  for (const c of GOLD_CASES) {
    assert.equal(buildExternalPrompt(partsOf([promptFor(c)])).allowed, true, c.id);
  }
});

test("the same prompt would be refused if the set were ever unregistered", () => {
  const parts = partsOf([promptFor(GOLD_CASES[0])]).map((p) =>
    p.dataClass === "synthetic_sample" ? { ...p, syntheticSetId: "retired-set" } : p
  );
  assert.equal(buildExternalPrompt(parts).allowed, false);
});

test("a builder cannot be handed a composed string, which is the ADV-3A.1 correction", () => {
  const bad = { id: "x", profile: "short_prose", locale: "en", input: "hello", why: "y", expect: {} } as GoldCase;
  const m = promptFor(bad);
  assert.ok(m.content.includes("hello"));
  // The type checker refuses a raw interpolation at compile time. This asserts the
  // runtime half of the same rule, so the guarantee does not rest on the build.
  assert.throws(
    () => partsOf([{ role: "system", content: "x", parts: [] } as never]),
    UnclassifiedMessageError
  );
});

// -------------------------------------------------------- the model subject

test("the model subject reports no provider rather than a boundary denial", async () => {
  const r = await runSuite(modelSubject({ env: {} }), {
    cases: casesFor("short_prose").slice(0, 1),
    now: clock(),
  });
  assert.equal(r.unavailable, 1);
  assert.equal(r.fail, 0);
  const reason = r.cases[0].reason;
  assert.match(reason, /no provider is configured/);
  assert.match(reason, /not a boundary denial/);
});

test("an attempted request is counted even when it returned nothing", async () => {
  const r = await runSuite(modelSubject({ env: {} }), {
    cases: casesFor("short_prose").slice(0, 1),
    now: clock(),
  });
  assert.equal(r.units.requests, 1);
  assert.ok(r.units.promptChars > 0);
  assert.equal(r.units.completionChars, 0);
});

test("the model subject does not claim classification, because comparing JSON to a parse needs a decoder", () => {
  assert.deepEqual(modelSubject().profiles, ["short_prose", "bilingual_translation"]);
});

// ------------------------------------------------------------ the firewall

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

test("selection cannot see an evaluation cost, because nothing routes one to it", () => {
  const router = stripComments(fs.readFileSync("src/lib/ai/router.ts", "utf8"));
  assert.equal(/from\s+["'][^"']*eval[^"']*["']/.test(router), false, "the router imports the evaluation package");
  assert.equal(/\brequire\(\s*["'][^"']*eval/.test(router), false);
});

test("no module outside the evaluation package imports the harness, so a run is deliberate", () => {
  const offenders: string[] = [];
  const walk = (d: string) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) {
        if (path.basename(p) === "eval") continue;
        walk(p);
      } else if (/\.tsx?$/.test(p) && /from\s+["'][^"']*lib\/eval\//.test(fs.readFileSync(p, "utf8"))) {
        offenders.push(p.split(path.sep).join("/"));
      }
    }
  };
  walk("src");
  assert.deepEqual(offenders, []);
});

test("the register still carries no price, so cost cannot become an input to selection", () => {
  const router = stripComments(fs.readFileSync("src/lib/ai/router.ts", "utf8"));
  for (const needle of [/\bprice\b/i, /\bcostPer/i, /perMillion/i, /\busd\b/i, /\bcents\b/i]) {
    assert.equal(needle.test(router), false, `the router mentions ${needle}`);
  }
});
