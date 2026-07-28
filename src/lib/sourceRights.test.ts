import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deniedRights,
  parseSourceRights,
  statusCeiling,
  mayRedisplay,
  mayDisplayDerived,
  mayExport,
  mayAiRetrieve,
  maySendToModel,
  denialReason,
  indexSourceRights,
  type SourceRights,
} from "./sourceRights";

// The whole value of this module is that it says no when it does not know.
// These tests are written adversarially: each one asks whether some plausible
// mistake could turn a missing answer into a granted right.

const row = (over: Record<string, unknown> = {}) => ({
  source_id: "test_source",
  storage_policy: "full",
  redisplay_policy: "public",
  derived_display_policy: "public",
  export_policy: "public",
  ai_retrieval_policy: "public",
  model_input_policy: "full",
  rights_status: "evidenced",
  stop_condition: "The licence lapses.",
  rights_reviewed_at: "2026-07-28T00:00:00Z",
  rights_reviewed_note: "note",
  ...over,
});

const evidencedAll = parseSourceRights(row());

// 1. Absence.

test("deniedRights grants nothing at all", () => {
  const r = deniedRights("ghost");
  assert.equal(r.rightsStatus, "unknown");
  for (const a of ["internal", "public"] as const) {
    assert.equal(mayRedisplay(r, a), false);
    assert.equal(mayDisplayDerived(r, a), false);
    assert.equal(mayExport(r, a), false);
    assert.equal(mayAiRetrieve(r, a), false);
  }
  assert.equal(maySendToModel(r, "redacted"), false);
});

test("a null, undefined or non-object row parses to a denied record", () => {
  for (const bad of [null, undefined, 42, "gastat_sama", []]) {
    const r = parseSourceRights(bad);
    assert.equal(r.rightsStatus, "unknown");
    assert.equal(mayRedisplay(r, "internal"), false);
  }
});

test("a row without a source_id is denied even if every policy says public", () => {
  const r = parseSourceRights(row({ source_id: null }));
  assert.equal(mayDisplayDerived(r, "public"), false);
  assert.equal(mayExport(r, "public"), false);
});

// 2. Unrecognised values.

test("an unrecognised use policy coerces to none, not to the permissive branch", () => {
  for (const bad of ["PUBLIC", "yes", "", null, undefined, true, 1, "external"]) {
    const r = parseSourceRights(row({ derived_display_policy: bad }));
    assert.equal(r.derivedDisplayPolicy, "none");
    assert.equal(mayDisplayDerived(r, "internal"), false);
  }
});

test("an unrecognised model input policy coerces to none", () => {
  for (const bad of ["FULL", "partial", null, 3]) {
    const r = parseSourceRights(row({ model_input_policy: bad }));
    assert.equal(r.modelInputPolicy, "none");
    assert.equal(maySendToModel(r, "redacted"), false);
  }
});

test("an unrecognised rights status coerces to unknown, which denies everything", () => {
  for (const bad of ["approved", "ok", "EVIDENCED", null, 0]) {
    const r = parseSourceRights(row({ rights_status: bad }));
    assert.equal(r.rightsStatus, "unknown");
    assert.equal(mayRedisplay(r, "internal"), false);
    assert.equal(maySendToModel(r, "redacted"), false);
  }
});

test("an unrecognised storage policy coerces to none", () => {
  assert.equal(parseSourceRights(row({ storage_policy: "some" })).storagePolicy, "none");
  assert.equal(parseSourceRights(row({ storage_policy: "id_only" })).storagePolicy, "id_only");
});

test("blank text fields read as null rather than empty strings", () => {
  const r = parseSourceRights(row({ stop_condition: "   ", rights_reviewed_note: "" }));
  assert.equal(r.stopCondition, null);
  assert.equal(r.reviewedNote, null);
});

// 3. The status ceiling, downward only.

test("statusCeiling never rises above the status it is given", () => {
  assert.equal(statusCeiling("evidenced"), "public");
  assert.equal(statusCeiling("asserted_unverified"), "internal");
  assert.equal(statusCeiling("unknown"), "none");
  assert.equal(statusCeiling("prohibited"), "none");
});

test("prohibited denies every use even when every policy column says public", () => {
  const r = parseSourceRights(row({ rights_status: "prohibited" }));
  for (const a of ["internal", "public"] as const) {
    assert.equal(mayRedisplay(r, a), false);
    assert.equal(mayDisplayDerived(r, a), false);
    assert.equal(mayExport(r, a), false);
    assert.equal(mayAiRetrieve(r, a), false);
  }
  assert.equal(maySendToModel(r, "redacted"), false);
});

test("unknown denies every use even when every policy column says public", () => {
  const r = parseSourceRights(row({ rights_status: "unknown" }));
  assert.equal(mayDisplayDerived(r, "internal"), false);
  assert.equal(mayAiRetrieve(r, "public"), false);
});

test("asserted_unverified permits internal at most, never public", () => {
  const r = parseSourceRights(row({ rights_status: "asserted_unverified" }));
  assert.equal(mayRedisplay(r, "internal"), true);
  assert.equal(mayRedisplay(r, "public"), false);
  assert.equal(mayDisplayDerived(r, "public"), false);
  assert.equal(mayExport(r, "public"), false);
  assert.equal(mayAiRetrieve(r, "public"), false);
});

test("the ceiling cannot widen a policy that is already narrower", () => {
  const r = parseSourceRights(
    row({ rights_status: "evidenced", export_policy: "none", derived_display_policy: "internal" })
  );
  assert.equal(mayExport(r, "internal"), false);
  assert.equal(mayDisplayDerived(r, "internal"), true);
  assert.equal(mayDisplayDerived(r, "public"), false);
});

// 4. Model input is stricter than display on purpose.

test("model input opens only for evidenced sources", () => {
  for (const s of ["unknown", "asserted_unverified", "prohibited"] as const) {
    const r = parseSourceRights(row({ rights_status: s, model_input_policy: "full" }));
    assert.equal(maySendToModel(r, "redacted"), false, s);
    assert.equal(maySendToModel(r, "full"), false, s);
  }
  assert.equal(maySendToModel(evidencedAll, "full"), true);
});

test("model input is graded, so a lower grant does not satisfy a higher need", () => {
  const r = parseSourceRights(row({ model_input_policy: "sample_only" }));
  assert.equal(maySendToModel(r, "redacted"), true);
  assert.equal(maySendToModel(r, "sample_only"), true);
  assert.equal(maySendToModel(r, "full"), false);
});

test("a need of none is always satisfiable because nothing leaves the process", () => {
  assert.equal(maySendToModel(deniedRights("ghost"), "none"), true);
});

// 5. Public display and model input are independent questions.

test("a source we may publish to the world can still be barred from a model", () => {
  const gastatShape = parseSourceRights(
    row({ source_id: "gastat_sama", model_input_policy: "none" })
  );
  assert.equal(mayDisplayDerived(gastatShape, "public"), true);
  assert.equal(maySendToModel(gastatShape, "redacted"), false);
});

// 6. Denial reasons.

test("denialReason returns null when the use is permitted", () => {
  assert.equal(denialReason(evidencedAll, "derived", "public"), null);
});

test("denialReason names the status when the status is what denied it", () => {
  const prohibited = parseSourceRights(row({ rights_status: "prohibited" }));
  assert.match(String(denialReason(prohibited, "derived", "internal")), /prohibited/);
  const unreviewed = parseSourceRights(row({ rights_status: "unknown" }));
  assert.match(String(denialReason(unreviewed, "export", "internal")), /no recorded rights review/);
  const asserted = parseSourceRights(row({ rights_status: "asserted_unverified" }));
  assert.match(String(denialReason(asserted, "ai_retrieval", "public")), /unverified/);
});

test("denialReason names the policy when the policy is what denied it", () => {
  const r = parseSourceRights(row({ export_policy: "internal" }));
  assert.match(String(denialReason(r, "export", "public")), /'internal'/);
});

// 7. The nine live registry rows, as recorded by the ADV-0 migration.
// If a future migration widens one of these, this test is the thing that asks
// whether the licence evidence widened with it.

const LIVE: Record<string, Partial<SourceRights>> = {
  gastat_sama: {
    derivedDisplayPolicy: "public",
    exportPolicy: "public",
    aiRetrievalPolicy: "public",
    modelInputPolicy: "none",
    rightsStatus: "evidenced",
  },
  rega_ejar: {
    derivedDisplayPolicy: "internal",
    exportPolicy: "none",
    aiRetrievalPolicy: "internal",
    modelInputPolicy: "none",
    rightsStatus: "asserted_unverified",
  },
  broker_overlay: {
    derivedDisplayPolicy: "none",
    exportPolicy: "none",
    aiRetrievalPolicy: "none",
    modelInputPolicy: "none",
    rightsStatus: "prohibited",
  },
  fsq_os_places: {
    derivedDisplayPolicy: "public",
    exportPolicy: "internal",
    aiRetrievalPolicy: "public",
    modelInputPolicy: "none",
    rightsStatus: "evidenced",
  },
  foursquare_mapbox: {
    derivedDisplayPolicy: "none",
    exportPolicy: "none",
    aiRetrievalPolicy: "none",
    modelInputPolicy: "none",
    rightsStatus: "evidenced",
  },
  rega_permit: {
    derivedDisplayPolicy: "none",
    exportPolicy: "internal",
    aiRetrievalPolicy: "public",
    modelInputPolicy: "none",
    rightsStatus: "evidenced",
  },
  nafath: {
    derivedDisplayPolicy: "none",
    exportPolicy: "none",
    aiRetrievalPolicy: "none",
    modelInputPolicy: "none",
    rightsStatus: "evidenced",
  },
  wathq_deeds: {
    derivedDisplayPolicy: "none",
    exportPolicy: "none",
    aiRetrievalPolicy: "none",
    modelInputPolicy: "none",
    rightsStatus: "evidenced",
  },
  spl_address: {
    derivedDisplayPolicy: "none",
    exportPolicy: "none",
    aiRetrievalPolicy: "none",
    modelInputPolicy: "none",
    rightsStatus: "asserted_unverified",
  },
};

test("no live source permits model input", () => {
  for (const [id, want] of Object.entries(LIVE)) {
    const r = parseSourceRights(row({ source_id: id, ...toRow(want) }));
    assert.equal(maySendToModel(r, "redacted"), false, id);
  }
});

test("only GASTAT and the open Foursquare snapshot reach a public derived value", () => {
  const publicDerived = Object.entries(LIVE)
    .filter(([id, want]) =>
      mayDisplayDerived(parseSourceRights(row({ source_id: id, ...toRow(want) })), "public")
    )
    .map(([id]) => id)
    .sort();
  assert.deepEqual(publicDerived, ["fsq_os_places", "gastat_sama"]);
});

test("no live source permits a public export except GASTAT", () => {
  const publicExport = Object.entries(LIVE)
    .filter(([id, want]) =>
      mayExport(parseSourceRights(row({ source_id: id, ...toRow(want) })), "public")
    )
    .map(([id]) => id);
  assert.deepEqual(publicExport, ["gastat_sama"]);
});

test("the verification sources never reach an export or a derived public value", () => {
  for (const id of ["nafath", "wathq_deeds", "rega_permit"]) {
    const r = parseSourceRights(row({ source_id: id, ...toRow(LIVE[id]) }));
    assert.equal(mayDisplayDerived(r, "public"), false, id);
    assert.equal(mayExport(r, "public"), false, id);
  }
});

test("the Rent Index source cannot be derived into a public figure while O10 is open", () => {
  const r = parseSourceRights(row({ source_id: "rega_ejar", ...toRow(LIVE.rega_ejar) }));
  assert.equal(mayDisplayDerived(r, "public"), false);
  assert.equal(mayExport(r, "public"), false);
  assert.equal(mayAiRetrieve(r, "public"), false);
});

// 8. Indexing. A bad row must disappear, not become a permissive default row.

test("indexSourceRights drops unusable rows instead of defaulting them", () => {
  const m = indexSourceRights([
    row({ source_id: "good" }),
    null,
    { source_id: "" },
    "not a row",
    row({ source_id: "also_good", rights_status: "prohibited" }),
  ]);
  assert.deepEqual([...m.keys()].sort(), ["also_good", "good"]);
  assert.equal(m.get("good")?.rightsStatus, "evidenced");
});

test("indexSourceRights returns an empty map for anything that is not an array", () => {
  for (const bad of [null, undefined, {}, "rows", 7]) {
    assert.equal(indexSourceRights(bad).size, 0);
  }
});

test("a lookup miss against an indexed map must be handled by the caller as denied", () => {
  const m = indexSourceRights([row({ source_id: "good" })]);
  const r = m.get("missing") ?? deniedRights("missing");
  assert.equal(mayRedisplay(r, "internal"), false);
});

function toRow(want: Partial<SourceRights>): Record<string, unknown> {
  return {
    derived_display_policy: want.derivedDisplayPolicy,
    export_policy: want.exportPolicy,
    ai_retrieval_policy: want.aiRetrievalPolicy,
    model_input_policy: want.modelInputPolicy,
    rights_status: want.rightsStatus,
  };
}
