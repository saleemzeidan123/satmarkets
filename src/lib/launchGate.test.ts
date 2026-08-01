import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  AVAILABILITY_FRESH_DAYS,
  availabilityFreshnessOf,
  indexingPermitted,
  indexingSwitchOn,
  inventoryRecordFacts,
  locationConsistencyOf,
  mayCountAsProductionInventory,
  previewEnvironmentNow,
  productionCountEligibility,
  productionInventorySwitchOn,
  publicationAuthorizationOf,
  recordDemoStatusOf,
  type InventoryRecordFacts,
} from "@/lib/launchGate";

//
// ADV-1C.1 correction 1, and two of Codex's eight required gates:
//
//   "preview/sample records cannot silently become production-count inventory"
//   "the production indexing gate fails closed"
//
// The word doing the work in the first is SILENTLY. The failure this guards
// against is not an operator deciding to publish sample data; it is a nullable
// boolean quietly reading as a permission nobody granted, which is what
// `realInventoryOnly` did by name for two packages.
//

const ENV_KEYS = [
  "SITE_ENV",
  "NEXT_PUBLIC_SITE_ENV",
  "ALLOW_INDEX",
  "NEXT_PUBLIC_ALLOW_INDEX",
  "PRODUCTION_INVENTORY_AUTHORIZED",
  "NEXT_PUBLIC_PRODUCTION_INVENTORY_AUTHORIZED",
] as const;

/** Run `fn` with an exactly known environment, and put the real one back. */
function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const before = new Map(ENV_KEYS.map((k) => [k, process.env[k]] as const));
  try {
    for (const k of ENV_KEYS) delete process.env[k];
    for (const [k, v] of Object.entries(env)) if (v !== undefined) process.env[k] = v;
    fn();
  } finally {
    for (const k of ENV_KEYS) {
      const v = before.get(k);
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

/** Facts that clear every gate, so each test can spoil exactly one of them. */
const CLEAN: InventoryRecordFacts = {
  recordDemoStatus: "not_flagged",
  previewEnvironment: "production_unlabelled",
  publicationAuthorization: "authorized_for_production_display",
  availabilityFreshness: "fresh",
  locationConsistency: "not_contradicted",
};

test("ADV-1C.1: the five facts are five values, and none is read off another", () => {
  // The correction stated as a test. An unflagged row is unflagged. It is not
  // authorised, not fresh, and not therefore countable.
  const unflagged = { is_demo: false };
  assert.equal(recordDemoStatusOf(unflagged), "not_flagged");
  assert.equal(publicationAuthorizationOf(unflagged), "not_recorded");
  assert.equal(availabilityFreshnessOf(unflagged), "unknown");

  const facts = { ...CLEAN, ...inventoryRecordFacts(unflagged) };
  const v = productionCountEligibility(facts);
  assert.equal(v.eligible, false, "the absence of a demo marker was read as authenticity");
  assert.ok(v.blockers.includes("production_display_not_authorized"));
  assert.ok(v.blockers.includes("availability_freshness_unknown"));
});

test("ADV-1C.1: a null demo flag is a third state, not a quiet no", () => {
  assert.equal(recordDemoStatusOf({}), "unknown");
  assert.equal(recordDemoStatusOf({ is_demo: null }), "unknown");
  assert.equal(recordDemoStatusOf({ is_demo: true }), "flagged_simulated");
  assert.equal(recordDemoStatusOf({ is_demo: false }), "not_flagged");

  const v = productionCountEligibility({ ...CLEAN, recordDemoStatus: "unknown" });
  assert.deepEqual(v.blockers, ["record_demo_status_unknown"]);
  assert.equal(v.eligible, false);
});

test("Codex gate: a preview or sample record cannot silently become production inventory", () => {
  // Every one of the four ways a record can fail, one at a time, each producing
  // its own named blocker rather than a shared refusal.
  const cases: [Partial<InventoryRecordFacts>, string][] = [
    [{ recordDemoStatus: "flagged_simulated" }, "record_is_flagged_simulated"],
    [{ recordDemoStatus: "unknown" }, "record_demo_status_unknown"],
    [{ previewEnvironment: "preview_labelled" }, "environment_is_labelled_preview"],
    [{ publicationAuthorization: "not_recorded" }, "production_display_not_authorized"],
    [{ publicationAuthorization: "refused" }, "production_display_refused"],
    [{ availabilityFreshness: "stale" }, "availability_stale"],
    [{ availabilityFreshness: "unknown" }, "availability_freshness_unknown"],
    [{ locationConsistency: "contradicted" }, "location_contradicts_pin"],
    [{ locationConsistency: "not_checked" }, "location_consistency_not_checked"],
  ];
  for (const [spoil, blocker] of cases) {
    const v = productionCountEligibility({ ...CLEAN, ...spoil });
    assert.equal(v.eligible, false, `${blocker} did not block`);
    assert.deepEqual(v.blockers, [blocker], `${blocker} was reported as something else, or alongside it`);
  }
  // And the clean set is genuinely reachable, so the gate is a gate rather than
  // a permanent no that nobody would notice had stopped discriminating.
  assert.deepEqual(productionCountEligibility(CLEAN), { eligible: true, blockers: [] });
});

test("Codex gate: one bad record spoils the set, and an empty set is not a clean one", () => {
  withEnv({ SITE_ENV: "production" }, () => {
    assert.equal(previewEnvironmentNow(), "production_unlabelled");
    const fresh = new Date();
    const ok = { is_demo: false, availability_confirmed_at: fresh.toISOString() };
    // Still blocked, because nothing records production display authorisation.
    // This is the live state of the corpus and it is asserted rather than
    // assumed, so the day a column exists this test says so.
    assert.equal(mayCountAsProductionInventory([ok]).eligible, false);
    // Two blockers now, and the second is finding 137: no caller has yet computed
    // whether this row's pin agrees with the location on file, and an unanswered
    // question is not a pass.
    assert.deepEqual(mayCountAsProductionInventory([ok]).blockers, [
      "production_display_not_authorized",
      "location_consistency_not_checked",
    ]);
    assert.deepEqual(
      mayCountAsProductionInventory([{ ...ok, location_consistency: "consistent_unverified" }]).blockers,
      ["production_display_not_authorized"],
    );

    const withSample = mayCountAsProductionInventory([ok, { is_demo: true }]);
    assert.ok(withSample.blockers.includes("record_is_flagged_simulated"), "one sample row did not spoil the set");

    const none = mayCountAsProductionInventory([]);
    assert.equal(none.eligible, false, "an empty set was treated as a clean set");
  });
});

test("ADV-1C.1: availability is measured, not assumed", () => {
  const now = new Date("2026-07-31T00:00:00Z");
  const at = (days: number) => ({
    is_demo: false,
    availability_confirmed_at: new Date(now.getTime() - days * 86_400_000).toISOString(),
  });
  assert.equal(availabilityFreshnessOf(at(1), now), "fresh");
  assert.equal(availabilityFreshnessOf(at(AVAILABILITY_FRESH_DAYS), now), "fresh");
  assert.equal(availabilityFreshnessOf(at(AVAILABILITY_FRESH_DAYS + 1), now), "stale");
  assert.equal(availabilityFreshnessOf({ is_demo: false }, now), "unknown");
  assert.equal(availabilityFreshnessOf({ is_demo: false, availability_confirmed_at: "not a date" }, now), "unknown");
  // A confirmation in the future is a clock or an import fault, not freshness.
  assert.equal(availabilityFreshnessOf(at(-5), now), "unknown");
});

test("Codex gate: the production indexing gate fails closed", () => {
  // Unset, half set, and every near miss an operator actually types. Only the
  // exact pair opens it.
  const closed: Record<string, string | undefined>[] = [
    {},
    { ALLOW_INDEX: "true" },
    { PRODUCTION_INVENTORY_AUTHORIZED: "true" },
    { ALLOW_INDEX: "true", PRODUCTION_INVENTORY_AUTHORIZED: "false" },
    { ALLOW_INDEX: "TRUE", PRODUCTION_INVENTORY_AUTHORIZED: "TRUE" },
    { ALLOW_INDEX: "1", PRODUCTION_INVENTORY_AUTHORIZED: "1" },
    { ALLOW_INDEX: "yes", PRODUCTION_INVENTORY_AUTHORIZED: "yes" },
    { ALLOW_INDEX: "true ", PRODUCTION_INVENTORY_AUTHORIZED: "true " },
    { ALLOW_INDEX: "", PRODUCTION_INVENTORY_AUTHORIZED: "" },
  ];
  for (const env of closed) {
    withEnv(env, () => {
      assert.equal(indexingPermitted(), false, `${JSON.stringify(env)} opened the indexing gate`);
    });
  }

  withEnv({ ALLOW_INDEX: "true", PRODUCTION_INVENTORY_AUTHORIZED: "true" }, () => {
    assert.equal(indexingSwitchOn(), true);
    assert.equal(productionInventorySwitchOn(), true);
    assert.equal(indexingPermitted(), true, "the gate cannot be opened at all, so it is not a gate");
  });

  // The public twins work too, because Vercel exposes only the prefixed ones to
  // some runtimes and an operator setting the pair there must get the same answer.
  withEnv({ NEXT_PUBLIC_ALLOW_INDEX: "true", NEXT_PUBLIC_PRODUCTION_INVENTORY_AUTHORIZED: "true" }, () => {
    assert.equal(indexingPermitted(), true);
  });
});

test("Codex gate: the middleware and the sitemap read one gate, not two copies of it", () => {
  // Finding 79's lesson applied to indexing. Two hand-written readings of the
  // same switches drift, and the drift here is a route that is absent from the
  // sitemap while serving an indexable header, or the reverse.
  for (const p of ["src/middleware.ts", "src/app/sitemap.ts"]) {
    const s = fs.readFileSync(p, "utf8");
    assert.ok(s.includes("indexing" + "Permitted"), `${p} no longer reads the shared indexing gate`);
    const code = s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
    assert.equal(
      /process\.env\.[A-Z_]*ALLOW_INDEX/.test(code),
      false,
      `${p} reads the indexing environment directly again instead of asking the one gate`,
    );
  }
});

test("Codex gate: the sitemap emits no detail URL until the records clear too", () => {
  // The switches are an operator's intent. They are not evidence about the rows,
  // and the sitemap must not treat them as if they were.
  const s = fs.readFileSync("src/app/sitemap.ts", "utf8");
  assert.ok(s.includes("mayCountAs" + "ProductionInventory"), "the sitemap no longer checks the records themselves");
  assert.match(
    s,
    /indexing ?Permitted\(\) && mayCountAsProductionInventory\(listings\)\.eligible/,
    "the sitemap no longer requires both the switches and the records",
  );
  assert.ok(s.includes("is_demo"), "the sitemap stopped selecting the column its record gate reads");
  assert.equal(
    /if \(ALLOW_INDEX\)/.test(s),
    false,
    "the module-level build-time constant is back, so a running deployment answers with the environment it was built in",
  );
});

test("finding 137: a pin that contradicts the location on file cannot count as production inventory", () => {
  // The three verdicts that mean nothing is being contradicted.
  assert.equal(locationConsistencyOf({ location_consistency: "consistent_unverified" }), "not_contradicted");
  assert.equal(locationConsistencyOf({ location_consistency: "no_pin" }), "not_contradicted");
  assert.equal(locationConsistencyOf({ location_consistency: "no_location_recorded" }), "not_contradicted");

  // The one that does.
  assert.equal(locationConsistencyOf({ location_consistency: "contradicted" }), "contradicted");

  // And the two that are silence rather than an answer. `unverifiable` is the
  // state where SAT holds no point for the recorded location, so the comparison
  // never happened; it must not read as a pass.
  assert.equal(locationConsistencyOf({}), "not_checked");
  assert.equal(locationConsistencyOf({ location_consistency: null }), "not_checked");
  assert.equal(locationConsistencyOf({ location_consistency: "unverifiable" }), "not_checked");

  const bad = productionCountEligibility({ ...CLEAN, locationConsistency: "contradicted" });
  assert.equal(bad.eligible, false);
  assert.deepEqual(bad.blockers, ["location_contradicts_pin"]);

  // There is no verified state to reach, so the clean row is "not_contradicted"
  // and that is the best any row can ever be here.
  assert.deepEqual(productionCountEligibility(CLEAN), { eligible: true, blockers: [] });
});
