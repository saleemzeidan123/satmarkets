import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  MOBILITY_CLAUSES,
  PROCESSING_CLAUSES,
  RECORDED_AGREEMENTS,
  assessAgreement,
  assessMobilityAgreement,
  assessProcessingAgreement,
  type AgreementRecord,
  type ClauseId,
} from "./sufficiency";

// ADV-5B. What this file is for.
//
// `sufficiency.ts` is only worth having if it cannot drift away from the
// register. A second copy of a checklist is worse than one copy, because two
// lists that disagree let a reviewer read whichever one is convenient. So the
// central test here does not assert that the phrases are "present somewhere":
// it extracts the two enumerations from `docs/regulatory-register.md` and
// asserts equality, in order, in both directions. Adding a clause to the
// register without adding it to the code fails. Adding one to the code without
// the register fails. Reordering either fails.

const REGISTER = fs.readFileSync(
  path.join(process.cwd(), "docs", "regulatory-register.md"),
  "utf8"
);

// Part E wraps mid-clause across source lines, so every comparison is made on
// whitespace-normalized text. Nothing else is normalized: the wording itself has
// to match, because the wording is the obligation.
const flat = REGISTER.replace(/\s+/g, " ");

const clauseListFrom = (marker: string): string[] => {
  const i = flat.indexOf(marker);
  assert.ok(i >= 0, `Part E no longer contains the lead-in "${marker}"`);
  const rest = flat.slice(i + marker.length);
  const end = rest.indexOf(". ");
  assert.ok(end > 0, `the enumeration after "${marker}" does not terminate`);
  return rest
    .slice(0, end)
    .split(";")
    .map((s) => s.trim().replace(/^and /, ""))
    .filter(Boolean);
};

// 1. The register and the code are the same list.

test("sufficiency: the mobility clauses are Part E, in Part E order", () => {
  const fromRegister = clauseListFrom("A sufficient agreement must state: ");
  assert.deepEqual(
    MOBILITY_CLAUSES.map((c) => c.registerPhrase),
    fromRegister
  );
});

test("sufficiency: the processing clauses are Part E, in Part E order", () => {
  const fromRegister = clauseListFrom("the owner must record, per provider: ");
  assert.deepEqual(
    PROCESSING_CLAUSES.map((c) => c.registerPhrase),
    fromRegister
  );
});

test("sufficiency: the two lists are twelve and seven and share no clause id", () => {
  assert.equal(MOBILITY_CLAUSES.length, 12);
  assert.equal(PROCESSING_CLAUSES.length, 7);
  const ids = [...MOBILITY_CLAUSES, ...PROCESSING_CLAUSES].map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "a clause id is used twice");
});

test("sufficiency: every clause carries reviewer text explaining the failure", () => {
  for (const c of [...MOBILITY_CLAUSES, ...PROCESSING_CLAUSES]) {
    assert.ok(c.why.trim().length > 20, `${c.id} has no substantive 'why'`);
  }
});

// 2. The state as it actually stands. Owner ruling 7.

test("sufficiency: no agreement is recorded", () => {
  assert.deepEqual(RECORDED_AGREEMENTS, []);
});

test("sufficiency: a mobility source fails with all twelve clauses unanswered", () => {
  const v = assessMobilityAgreement("geo_analytics");
  assert.equal(v.sufficient, false);
  assert.deepEqual(
    v.unanswered,
    MOBILITY_CLAUSES.map((c) => c.id)
  );
  assert.match(v.reasons.join(" "), /no agreement is recorded/);
});

test("sufficiency: a user-text provider fails with all seven clauses unanswered", () => {
  for (const id of ["google_places", "foursquare_mapbox", "photon_osm"]) {
    const v = assessProcessingAgreement(id);
    assert.equal(v.sufficient, false, `${id} passed processing sufficiency`);
    assert.equal(v.unanswered.length, 7);
  }
});

// 3. What an answer is.

const rec = (over: Partial<AgreementRecord> = {}): AgreementRecord => ({
  sourceId: "test_source",
  recordedBy: "owner",
  recordedOn: "2026-07-30",
  answers: {},
  ...over,
});

const allAnswered = (ids: readonly ClauseId[]): Partial<Record<ClauseId, string>> =>
  Object.fromEntries(ids.map((id) => [id, "recorded answer text"]));

test("sufficiency: a whitespace answer is not an answer", () => {
  const answers = allAnswered(MOBILITY_CLAUSES.map((c) => c.id));
  answers.aggregation_threshold = "   ";
  const v = assessMobilityAgreement("test_source", [rec({ answers })]);
  assert.equal(v.sufficient, false);
  assert.deepEqual(v.unanswered, ["aggregation_threshold"]);
});

test("sufficiency: partial answers are not sufficiency, and every gap is reported", () => {
  const answers = allAnswered(MOBILITY_CLAUSES.map((c) => c.id));
  delete answers.consent_provenance;
  delete answers.cross_border;
  delete answers.no_user_level_output;
  const v = assessMobilityAgreement("test_source", [rec({ answers })]);
  assert.equal(v.sufficient, false);
  // Collected, not short-circuited. Three gaps, three reasons, one round.
  assert.deepEqual(v.unanswered, [
    "consent_provenance",
    "cross_border",
    "no_user_level_output",
  ]);
  assert.equal(v.reasons.length, 3);
  assert.match(v.reasons.join(" "), /consent provenance for the underlying subjects/);
});

test("sufficiency: a record for another source does not answer for this one", () => {
  const other = rec({
    sourceId: "some_other_source",
    answers: allAnswered(MOBILITY_CLAUSES.map((c) => c.id)),
  });
  const v = assessMobilityAgreement("geo_analytics", [other]);
  assert.equal(v.sufficient, false);
  assert.equal(v.unanswered.length, 12);
});

test("sufficiency: a fully recorded agreement passes, so the gate is a check and not a constant", () => {
  const answers = allAnswered(MOBILITY_CLAUSES.map((c) => c.id));
  const v = assessMobilityAgreement("test_source", [rec({ answers })]);
  assert.equal(v.sufficient, true);
  assert.deepEqual(v.unanswered, []);
  assert.match(v.reasons.join(" "), /recorded by owner on 2026-07-30/);
});

test("sufficiency: answering the mobility clauses does not answer the processing ones", () => {
  const r = rec({ answers: allAnswered(MOBILITY_CLAUSES.map((c) => c.id)) });
  const v = assessAgreement("test_source", PROCESSING_CLAUSES, [r]);
  assert.equal(v.sufficient, false);
  assert.equal(v.unanswered.length, 7);
});

// 4. Reasons are internal, on the same rule as `denialReason`.

test("sufficiency: no rendering surface imports the sufficiency module", () => {
  const roots = ["src/app", "src/components"];
  const needle = new RegExp("location/suffic" + "iency");
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && needle.test(fs.readFileSync(p, "utf8"))) {
        offenders.push(p.split(path.sep).join("/"));
      }
    }
  };
  for (const r of roots) walk(path.join(process.cwd(), r));
  assert.deepEqual(
    offenders,
    [],
    "a render surface imports sufficiency: its reasons quote contract reasoning and are internal"
  );
});
