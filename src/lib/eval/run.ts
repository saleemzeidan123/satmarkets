import { parseQuery, type QueryVocab } from "@/lib/search/queryParse";
import { callModelText } from "@/lib/ai/gateway";
import { classifiedSlot, instruction, phrase } from "@/lib/ai/message";
import type { TaskProfile } from "@/lib/ai/router";
import { GOLD_CASES, GOLD_SET_ID, GOLD_VOCAB, type GoldCase, type GoldLocale, type GoldProfile } from "./gold";
import { gradeCase, type GoldAnswer } from "./grade";

// ADV-3B. The evaluation harness.
//
// WHAT THIS RUNS AGAINST. A subject, not a model. The distinction is the whole
// design. `src/lib/ai/router.ts` holds four candidates and every one of them is
// `unevaluated`, and it will stay that way until the owner records the AI
// agreement, so a harness that could only run against a provider would produce
// no evidence at all today and would first be exercised on the day it was most
// needed. Instead the subject is an interface. The deterministic parser is a
// subject. A provider chain is a subject. They are graded by the same graders
// against the same rows, so the number that comes back on the day a model is
// first evaluated is comparable to a number that already existed.
//
// THREE OUTCOMES, NOT TWO. `unavailable` is a first-class result and is never
// folded into either pass or fail. A subject that cannot answer a profile has
// not failed the row: counting it as a failure makes the deterministic baseline
// look broken, and counting it as a pass makes an unconfigured provider look
// perfect. Both readings have the same effect, which is that nobody trusts the
// report. Every unavailable result carries a written reason.
//
// WHAT `unavailable` MEANS FOR THE MODEL SUBJECT TODAY, PRECISELY. The gold set
// is registered in `SYNTHETIC_SETS`, so its rows classify `synthetic_sample` and
// the boundary permits them out while the agreement gate is closed. That is
// exactly the permission Codex granted: the harness may call providers using a
// deliberately synthetic set carrying no real user or platform data. So a model
// run today does not stop at the boundary. It reaches provider selection and
// stops there, because no provider key is configured, and it reports
// `no provider is configured` rather than `the boundary refused this`. Those are
// different facts about the system and a report that confused them would be
// telling the owner the gate is doing work it is not doing.
//
// WHAT IS DELIBERATELY NOT MEASURED. Money. `src/lib/ai/transport.ts` does not
// surface token usage from either transport, so a token count here would be an
// estimate presented as a measurement, and a price would additionally require a
// rate card this file has no way to keep current. What is measured instead is
// stated plainly in `Units`: requests, characters in, characters out, and
// elapsed milliseconds. Those are counted rather than inferred.
//
// THE COST FIREWALL. Nothing in this package is imported by the router, and
// `run.test.ts` asserts it. Cost may be reported to a person and must never be
// an input to selection: the owner's instruction is that no provider is chosen
// merely because it is inexpensive, and the reliable way to enforce that is to
// make the selection code structurally unable to see a cost.

/**
 * What a run consumed.
 *
 * Not money, and deliberately not tokens. See the header: the transport layer
 * surfaces no usage, so a token figure would be a guess wearing the clothes of a
 * measurement. Characters are counted from the strings that actually moved.
 */
export type Units = {
  /** Provider requests attempted, including ones that returned nothing. */
  requests: number;
  /** Characters sent. Zero for a subject that never leaves the process. */
  promptChars: number;
  /** Characters received. */
  completionChars: number;
};

const ZERO: Units = { requests: 0, promptChars: 0, completionChars: 0 };

const addUnits = (a: Units, b: Partial<Units> | undefined): Units => ({
  requests: a.requests + (b?.requests ?? 0),
  promptChars: a.promptChars + (b?.promptChars ?? 0),
  completionChars: a.completionChars + (b?.completionChars ?? 0),
});

export type SubjectAnswer =
  | { state: "answered"; answer: GoldAnswer; units?: Partial<Units> }
  | { state: "unavailable"; reason: string; units?: Partial<Units> };

/**
 * A thing that can be asked a gold case.
 *
 * `profiles` is what the subject claims it can attempt. A case outside that list
 * is reported unavailable without being asked, which keeps the deterministic
 * baseline honest about its own range rather than having it emit prose it has no
 * business emitting.
 */
export type Subject = {
  id: string;
  kind: "deterministic" | "model";
  profiles: readonly GoldProfile[];
  run(c: GoldCase): Promise<SubjectAnswer>;
};

export type CaseOutcome = "pass" | "fail" | "unavailable";

export type CaseResult = {
  id: string;
  profile: GoldProfile;
  locale: GoldLocale;
  outcome: CaseOutcome;
  /** One sentence per broken rule. Empty unless the outcome is a failure. */
  failures: readonly string[];
  /** Why the subject could not answer. Empty unless the outcome is unavailable. */
  reason: string;
  ms: number;
  units: Units;
};

export type SuiteReport = {
  subjectId: string;
  subjectKind: Subject["kind"];
  setId: string;
  cases: readonly CaseResult[];
  pass: number;
  fail: number;
  unavailable: number;
  totalMs: number;
  units: Units;
  /** No case failed. An all-unavailable run is clean and is also worthless, so read both. */
  clean: boolean;
};

export type RunOptions = {
  /** Restrict the run to these cases. Defaults to the whole set. */
  cases?: readonly GoldCase[];
  /**
   * The clock. Injectable because a report that embeds a wall clock cannot be
   * asserted in a test, and a latency number nobody tests is a latency number
   * that silently becomes wrong.
   */
  now?: () => number;
};

/**
 * Run one subject over the set.
 *
 * A subject that throws is recorded as a failure of that row and the run
 * continues. One bad row must not cost the evidence from the other twenty-one,
 * which is the same reasoning that keeps `gradeCase` from throwing.
 */
export async function runSuite(subject: Subject, opts: RunOptions = {}): Promise<SuiteReport> {
  const now = opts.now ?? Date.now;
  const cases = opts.cases ?? GOLD_CASES;
  const results: CaseResult[] = [];
  let units = ZERO;
  const startedAll = now();

  for (const c of cases) {
    const started = now();
    let outcome: CaseOutcome;
    let failures: readonly string[] = [];
    let reason = "";
    let caseUnits: Partial<Units> | undefined;

    if (!subject.profiles.includes(c.profile)) {
      outcome = "unavailable";
      reason = `${subject.id} does not attempt ${c.profile} cases`;
    } else {
      let answered: SubjectAnswer | null = null;
      let thrown = "";
      try {
        answered = await subject.run(c);
      } catch (e) {
        // A throw is a defect, not a missing capability, so it is a failure of
        // the row rather than an excused unavailability.
        thrown = `the subject threw: ${errorText(e)}`;
      }
      if (answered === null) {
        results.push({
          id: c.id,
          profile: c.profile,
          locale: c.locale,
          outcome: "fail",
          failures: [thrown],
          reason: "",
          ms: now() - started,
          units: ZERO,
        });
        continue;
      }
      caseUnits = answered.units;
      if (answered.state === "unavailable") {
        outcome = "unavailable";
        reason = answered.reason;
      } else {
        const verdict = gradeCase(c, answered.answer);
        outcome = verdict.ok ? "pass" : "fail";
        failures = verdict.failures;
      }
    }

    units = addUnits(units, caseUnits);
    results.push({
      id: c.id,
      profile: c.profile,
      locale: c.locale,
      outcome,
      failures,
      reason,
      ms: now() - started,
      units: addUnits(ZERO, caseUnits),
    });
  }

  const count = (o: CaseOutcome) => results.filter((r) => r.outcome === o).length;
  return {
    subjectId: subject.id,
    subjectKind: subject.kind,
    setId: GOLD_SET_ID,
    cases: results,
    pass: count("pass"),
    fail: count("fail"),
    unavailable: count("unavailable"),
    totalMs: now() - startedAll,
    units,
    clean: count("fail") === 0,
  };
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// ---------------------------------------------------------------- subjects

/**
 * The runnable-today baseline: the shipped deterministic parser.
 *
 * It attempts classification and nothing else. There is no deterministic prose
 * writer and no deterministic translator on this platform, and inventing one
 * here to fill the table would produce a baseline nobody ships, which is a
 * comparison against a fiction. The honest report is a stated unavailability.
 */
export function deterministicSubject(vocab: QueryVocab = GOLD_VOCAB): Subject {
  return {
    id: "deterministic",
    kind: "deterministic",
    profiles: ["classification"],
    async run(c) {
      if (c.profile !== "classification") {
        return { state: "unavailable", reason: "there is no deterministic writer for this profile" };
      }
      return { state: "answered", answer: { kind: "parse", parsed: parseQuery(c.input, vocab) } };
    },
  };
}

/**
 * The instruction a model is given for a case.
 *
 * Written with the tagged-template builder, so the case text is a declared slot
 * rather than an interpolation nobody classified. Its class is `synthetic_sample`
 * carrying this set's id, which is the registration that permits it out while the
 * agreement gate is closed, and which would deny it if the id were ever removed
 * from `SYNTHETIC_SETS`. That coupling is deliberate: retiring the set should
 * close the door behind it.
 */
export function promptFor(c: GoldCase) {
  const slot = classifiedSlot(c.input, [
    { label: `gold case ${c.id}`, dataClass: "synthetic_sample", syntheticSetId: GOLD_SET_ID },
  ]);
  // Fixed text that varies by branch is still fixed text, and it still has to
  // say so. `phrase` is the builder for that: every span of it is written here
  // in the source, so it carries `own_instruction` and nothing else, and the
  // type checker refuses the shortcut of interpolating the bare string. That
  // refusal is the ADV-3A.1 correction working on its first new caller.
  const rules = phrase`Use Western numerals in both languages. Never state a rent, price or market figure that was not given to you. Do not use a long dash.`;
  if (c.profile === "classification") {
    return instruction(`eval ${c.id}`)`Read the property search below and return JSON with the fields asset, grade, fitout, deal, city, placeIds, priceMin, priceMax, areaMin, areaMax, areaTarget and terms. Leave a field null when the search does not state it. ${rules}

Search: ${slot}`;
  }
  if (c.profile === "short_prose") {
    const lang = c.locale === "ar" ? phrase`Arabic` : phrase`English`;
    return instruction(`eval ${c.id}`)`Answer the message below in ${lang}, in at most two sentences, as a commercial property platform. ${rules}

Message: ${slot}`;
  }
  const into = c.locale === "en" ? phrase`professional Saudi Modern Standard Arabic` : phrase`professional English`;
  return instruction(`eval ${c.id}`)`Render the text below into ${into}. Keep every reference code and every figure exactly as written. Return the rendering only. ${rules}

Text: ${slot}`;
}

/**
 * The provider subject.
 *
 * It answers every profile as text, including classification, because a model
 * asked to classify returns JSON as text and the harness has no business
 * pretending otherwise. A classification row answered as text is graded as a
 * harness mismatch by `gradeCase` today, which is correct and is why this subject
 * declines classification rather than sending it: comparing a model's JSON to a
 * `ParsedQuery` needs a typed decoder, and that decoder is its own package rather
 * than a lenient `JSON.parse` written in passing.
 */
export function modelSubject(opts: { profiles?: readonly GoldProfile[]; timeoutMs?: number; env?: Record<string, string | undefined> } = {}): Subject {
  const profiles = opts.profiles ?? (["short_prose", "bilingual_translation"] as const);
  return {
    id: "model",
    kind: "model",
    profiles,
    async run(c) {
      const message = promptFor(c);
      const units: Partial<Units> = { requests: 1, promptChars: message.content.length };
      const text = await callModelText({
        profile: c.profile satisfies TaskProfile,
        messages: [message],
        json: c.profile === "classification",
        temperature: 0,
        timeoutMs: opts.timeoutMs,
        env: opts.env,
      });
      if (text === null) {
        // Today this is `no_provider`: no key is configured. It is not a boundary
        // denial, because the set is registered synthetic and the boundary lets
        // it through. Saying so is the point of the sentence.
        return {
          state: "unavailable",
          reason: "the gateway returned nothing, which today means no provider is configured; it is not a boundary denial",
          units,
        };
      }
      return {
        state: "answered",
        answer: { kind: "text", text },
        units: { ...units, completionChars: text.length },
      };
    },
  };
}

// ------------------------------------------------------------------ reporting

/**
 * The report as a person reads it.
 *
 * Plain ASCII and no dash characters, because this text is pasted into closure
 * records and handbacks, which the dash law covers.
 */
export function formatReport(r: SuiteReport): string {
  const lines: string[] = [
    `subject ${r.subjectId} (${r.subjectKind}) over set ${r.setId}`,
    `${r.pass} pass, ${r.fail} fail, ${r.unavailable} unavailable, ${r.totalMs} ms`,
    `${r.units.requests} requests, ${r.units.promptChars} chars sent, ${r.units.completionChars} chars received`,
  ];
  for (const c of r.cases) {
    if (c.outcome === "pass") continue;
    const detail = c.outcome === "unavailable" ? c.reason : c.failures.join("; ");
    lines.push(`  ${c.id} [${c.profile}/${c.locale}] ${c.outcome}: ${detail}`);
  }
  return lines.join("\n");
}
