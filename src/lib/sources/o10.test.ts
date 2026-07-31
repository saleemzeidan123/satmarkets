// ADV-1E, Codex item 6. Two things are proved here, and they are different in
// kind.
//
// The first is that the code and `docs/regulatory-register.md` state ONE
// question rather than two. A checklist that lives in a document no gate reads
// fails in a specific way: not that somebody disagrees with it, but that
// somebody records an answer, believes the matter closed, and nothing in the
// repository disagrees. The register-phrase assertions below make the document
// and the module fail together.
//
// The second is the fail-closed property itself: while O10 is unresolved, no
// path through the platform's one quote decision can return an authorised
// figure for the REGA Rental Index (Ejar) row as that row actually stands. That
// is asserted against `decidePublicQuote` rather than against a comment.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  type O10ClauseId,
  type O10Record,
  O10_CLAUSES,
  O10_RECORDS,
  O10_RESOLVED,
  assessO10,
} from "./o10";
import { REGA_RENT_INDEX_SOURCE_ID } from "./catalogue";
import { decidePublicQuote, type QuoteFacts } from "../publicQuote";
import type { SourceRights } from "../sourceRights";

const REGISTER = readFileSync("docs/regulatory-register.md", "utf8").replace(/\s+/g, " ");

/**
 * The REGA row as `supabase/migrations/20260728_source_rights_ledger.sql` writes
 * it today: asserted, unverified, with O10 named as the stop condition, and with
 * the policy columns left at their permissive pre-existing values precisely so
 * that the ceiling has something to ceil. A fixture that pre-denied the columns
 * would prove nothing, because it would pass even if the ceiling were deleted.
 */
const REGA_TODAY: SourceRights = {
  sourceId: REGA_RENT_INDEX_SOURCE_ID,
  storagePolicy: "full",
  redisplayPolicy: "public",
  derivedDisplayPolicy: "public",
  exportPolicy: "public",
  aiRetrievalPolicy: "public",
  modelInputPolicy: "none",
  rightsStatus: "asserted_unverified",
  stopCondition: "O10 unresolved",
  reviewedAt: null,
  reviewedNote: null,
};

const regaFacts = (over: Partial<QuoteFacts> = {}): QuoteFacts => ({
  hasValue: true,
  sufficiency: "sufficient",
  recordDemoStatus: "not_flagged",
  dataClass: "observed",
  tier: "sourced",
  sourceId: REGA_RENT_INDEX_SOURCE_ID,
  rights: REGA_TODAY,
  asPublished: true,
  environment: "production_unlabelled",
  ...over,
});

test("O10: the ten clauses Codex item 6 names, and only those", () => {
  const ids = O10_CLAUSES.map((c) => c.id);
  assert.deepEqual(ids, [
    "source_access",
    "public_display",
    "attribution_wording",
    "transformations_and_derived",
    "aggregation_and_minimum_samples",
    "export",
    "api_and_machine_readable",
    "ai_retrieval_and_response",
    "retention_and_correction",
    "arabic_and_english_publication",
  ] satisfies O10ClauseId[]);
  assert.equal(new Set(ids).size, ids.length, "an id appears twice");
});

test("O10: every clause quotes the register, so the two cannot drift apart", () => {
  for (const c of O10_CLAUSES) {
    assert.ok(
      REGISTER.includes(c.registerPhrase),
      `'${c.registerPhrase}' is in the code and not in docs/regulatory-register.md`,
    );
    assert.ok(c.why.trim().length > 20, `${c.id} states no consequence`);
  }
});

test("O10: the register states the fail-closed rule the code implements", () => {
  // Not a style check. If this sentence leaves the register, a reader of the
  // register alone would conclude the withholding is discretionary.
  assert.ok(REGISTER.includes("Until O10 is resolved the production decision fails closed"));
  assert.ok(REGISTER.includes("REGA Rental Index (Ejar)"));
});

test("O10: nothing is recorded, and the verdict says so rather than assuming it", () => {
  assert.deepEqual(O10_RECORDS, [], "owner ruling 7: no right is represented here");
  const v = assessO10();
  assert.equal(v.resolved, false);
  assert.equal(O10_RESOLVED, false);
  assert.deepEqual(v.unanswered, O10_CLAUSES.map((c) => c.id));
  assert.equal(v.reasons.length, 1);
  assert.match(v.reasons[0], /no permitted-use statement is recorded/);
});

test("O10: a partial statement is a recorded gap, not a rounding-up to yes", () => {
  const partial: O10Record = {
    sourceId: REGA_RENT_INDEX_SOURCE_ID,
    recordedBy: "test",
    recordedOn: "2026-01-01",
    instrument: "a fixture, not an agreement",
    answers: {
      source_access: "Permitted via open.data.gov.sa.",
      public_display: "Permitted with attribution.",
      // The remaining eight are silent, which is the realistic shape of a first
      // reply and the shape a boolean checklist would have rounded up.
      attribution_wording: "   ", // whitespace is a tick with extra steps
    },
  };
  const v = assessO10([partial]);
  assert.equal(v.resolved, false);
  assert.equal(v.unanswered.length, 8);
  assert.ok(v.unanswered.includes("attribution_wording"));
  assert.ok(v.unanswered.includes("ai_retrieval_and_response"));
  assert.ok(!v.unanswered.includes("public_display"));
  // Every gap is reported, not the first, so a reviewer sees the whole diff.
  assert.equal(v.reasons.length, 8);
});

test("O10: a record for another source does not answer this question", () => {
  const v = assessO10([
    {
      sourceId: "some_other_source",
      recordedBy: "test",
      recordedOn: "2026-01-01",
      instrument: "a fixture",
      answers: Object.fromEntries(O10_CLAUSES.map((c) => [c.id, "yes"])) as O10Record["answers"],
    },
  ]);
  assert.equal(v.resolved, false);
  assert.deepEqual(v.unanswered, O10_CLAUSES.map((c) => c.id));
});

test("O10 unresolved: the production decision withholds the REGA figure", () => {
  const d = decidePublicQuote(regaFacts());
  assert.equal(d.kind, "withheld");
  assert.equal(d.mayShowFigure, false);
  assert.equal(d.mayNameSatOwnRecord, false);
  assert.deepEqual(d.reasons, ["third_party_stop_condition_recorded"]);
});

test("O10 unresolved: no other true fact about the row buys the figure back", () => {
  // The columns already say public, so what is varied here is everything a
  // surface might have reasoned from instead: the shape the figure is in, the
  // environment, whether the row is the source's own published value or one SAT
  // derived. None of them is a permission and none of them may act like one.
  for (const asPublished of [true, false]) {
    for (const environment of ["preview_labelled", "production_unlabelled"] as const) {
      for (const tier of ["sourced", "computed"] as const) {
        const d = decidePublicQuote(regaFacts({ asPublished, environment, tier }));
        assert.equal(d.mayShowFigure, false, `${asPublished} ${environment} ${tier}`);
        assert.equal(d.kind, "withheld");
      }
    }
  }
});

test("O10 resolved would open the row through the ledger, not through a code change", () => {
  // The counterfactual matters: a gate that denies unconditionally is
  // indistinguishable from a gate that denies for the stated reason, and only
  // the second one opens when the owner records an answer. This is the single
  // place the suite constructs an `evidenced` REGA row, and it constructs it as
  // data rather than by touching any module.
  const cleared: SourceRights = { ...REGA_TODAY, rightsStatus: "evidenced", stopCondition: null };
  const d = decidePublicQuote(regaFacts({ rights: cleared }));
  assert.equal(d.kind, "authorized_public");
  assert.equal(d.mayShowFigure, true);
  assert.deepEqual(d.reasons, ["third_party_display_permitted"]);
  // And still not SAT's own record. Clearing a third party's rights never turns
  // its figure into first-party information (Codex item 4).
  assert.equal(d.mayNameSatOwnRecord, false);
});
