import { test } from "node:test";
import assert from "node:assert/strict";
import type { SourceRights } from "@/lib/sourceRights";
import { mobilityFigure, type MobilityObservation } from "./mobility";
import { MOBILITY_CLAUSES, type AgreementRecord } from "./sufficiency";
import { providersFor } from "./registry";

// ADV-5B. What this file is for.
//
// The three gates run in a fixed order and the order is the claim. A test that
// only asserted "unavailable" would pass if the gates ran backwards, and a
// backwards order is exactly the failure that matters: it reports a licence
// problem as a data problem, and data problems get fixed by engineers without
// anyone reading a contract. So every test below asserts the STAGE.

const SOURCE = providersFor("mobility")[0]?.sourceId ?? "";

const permitting = (): Map<string, SourceRights> =>
  new Map([
    [
      SOURCE,
      {
        sourceId: SOURCE,
        storagePolicy: "full",
        redisplayPolicy: "public",
        derivedDisplayPolicy: "public",
        exportPolicy: "none",
        aiRetrievalPolicy: "none",
        modelInputPolicy: "none",
        rightsStatus: "evidenced",
        stopCondition: null,
        reviewedAt: null,
        reviewedNote: null,
      } as SourceRights,
    ],
  ]);

const fullAgreement = (): AgreementRecord[] => [
  {
    sourceId: SOURCE,
    recordedBy: "owner",
    recordedOn: "2026-07-30",
    answers: Object.fromEntries(
      MOBILITY_CLAUSES.map((c) => [c.id, "recorded answer text"])
    ),
  },
];

const ASOF = new Date("2026-07-30T00:00:00Z");

const observation = (
  over: Partial<MobilityObservation> = {}
): MobilityObservation => ({
  sourceId: SOURCE,
  geography: "district",
  areaId: "riyadh-olaya",
  k: 400,
  periodEnd: "2026-06-30",
  coverageShare: 0.82,
  sampleBasis: "opted-in mobile SDK panel, weighted to GASTAT district population",
  methodNote: "device dwell clustering, known under-representation of over-65s",
  value: 138,
  attribution: "Source name, as the agreement requires",
  ...over,
});

const req = {
  metric: "footfall_index" as const,
  geography: "district" as const,
  areaId: "riyadh-olaya",
  audience: "public" as const,
};

// 1. The state as it actually stands.

test("mobility: with the register as it stands, every figure is unavailable", () => {
  const v = mobilityFigure(req, { rights: new Map() });
  assert.equal(v.status, "unavailable");
  if (v.status !== "unavailable") return;
  assert.equal(v.stage, "rights");
  assert.equal(v.code, "no_rights_row");
});

test("mobility: an unread register denies for the unread reason, not a missing row", () => {
  const v = mobilityFigure(req, {});
  assert.equal(v.status, "unavailable");
  if (v.status !== "unavailable") return;
  assert.equal(v.stage, "rights");
  assert.equal(v.code, "rights_unreadable");
});

test("mobility: no recorded agreement exists, so a permitted source still yields nothing", () => {
  const v = mobilityFigure(req, { rights: permitting() });
  assert.equal(v.status, "unavailable");
  if (v.status !== "unavailable") return;
  assert.equal(v.stage, "sufficiency");
  assert.equal(v.unanswered.length, 12);
});

// 2. Order. Rights before sufficiency before data before coverage.

test("mobility: a rights denial is reported even when everything else is wrong too", () => {
  const v = mobilityFigure(req, {
    rights: new Map(),
    agreements: [],
    observation: observation({ k: null, geography: "parcel" }),
    asOf: ASOF,
  });
  assert.equal(v.status, "unavailable");
  if (v.status !== "unavailable") return;
  assert.equal(v.stage, "rights");
  assert.deepEqual(v.failures, []);
  assert.deepEqual(v.unanswered, []);
});

test("mobility: a sufficiency gap is reported before any coverage gap", () => {
  const v = mobilityFigure(req, {
    rights: permitting(),
    agreements: [],
    observation: observation({ k: 2 }),
    asOf: ASOF,
  });
  assert.equal(v.status, "unavailable");
  if (v.status !== "unavailable") return;
  assert.equal(v.stage, "sufficiency");
  assert.deepEqual(v.failures, []);
});

// 3. Absence of data is its own answer.

test("mobility: a permitted, sufficient source with no observation is unavailable, not zero", () => {
  const v = mobilityFigure(req, {
    rights: permitting(),
    agreements: fullAgreement(),
    asOf: ASOF,
  });
  assert.equal(v.status, "unavailable");
  if (v.status !== "unavailable") return;
  assert.equal(v.stage, "data");
  assert.match(v.reasons.join(" "), /no observation was supplied/);
});

test("mobility: a permission is not transferable between sources", () => {
  const v = mobilityFigure(req, {
    rights: permitting(),
    agreements: fullAgreement(),
    observation: observation({ sourceId: "some_other_vendor" }),
    asOf: ASOF,
  });
  assert.equal(v.status, "unavailable");
  if (v.status !== "unavailable") return;
  assert.equal(v.stage, "data");
});

// 4. Coverage, once the first three gates are open.

test("mobility: a thin or undated observation fails at coverage with its codes", () => {
  const v = mobilityFigure(req, {
    rights: permitting(),
    agreements: fullAgreement(),
    observation: observation({ k: 3, periodEnd: null }),
    asOf: ASOF,
  });
  assert.equal(v.status, "unavailable");
  if (v.status !== "unavailable") return;
  assert.equal(v.stage, "coverage");
  assert.deepEqual(
    v.failures.map((f) => f.code),
    ["k_below_threshold", "period_missing"]
  );
});

test("mobility: an isochrone figure is refused even with everything else in place", () => {
  const v = mobilityFigure(req, {
    rights: permitting(),
    agreements: fullAgreement(),
    observation: observation({ geography: "isochrone" }),
    asOf: ASOF,
  });
  assert.equal(v.status, "unavailable");
  if (v.status !== "unavailable") return;
  assert.equal(v.stage, "coverage");
  assert.deepEqual(
    v.failures.map((f) => f.code),
    ["geography_is_isochrone"]
  );
});

test("mobility: a missing attribution string blocks publication", () => {
  const v = mobilityFigure(req, {
    rights: permitting(),
    agreements: fullAgreement(),
    observation: observation({ attribution: "  " }),
    asOf: ASOF,
  });
  assert.equal(v.status, "unavailable");
  if (v.status !== "unavailable") return;
  assert.equal(v.stage, "coverage");
});

// 5. The available branch exists and carries its own evidence.

test("mobility: with all three gates open a figure is available and carries k, period and method", () => {
  const v = mobilityFigure(req, {
    rights: permitting(),
    agreements: fullAgreement(),
    observation: observation(),
    asOf: ASOF,
  });
  assert.equal(v.status, "available");
  if (v.status !== "available") return;
  assert.equal(v.value, 138);
  assert.equal(v.k, 400);
  assert.equal(v.periodEnd, "2026-06-30");
  assert.equal(v.coverageShare, 0.82);
  assert.equal(v.sourceId, SOURCE);
  assert.ok(v.method.length > 0);
  assert.ok(v.attribution.length > 0);
  assert.ok(v.geography === "city" || v.geography === "district");
});

test("mobility: every unavailable result carries internal reasons and no rendered text", () => {
  const cases = [
    mobilityFigure(req, {}),
    mobilityFigure(req, { rights: permitting() }),
    mobilityFigure(req, { rights: permitting(), agreements: fullAgreement(), asOf: ASOF }),
  ];
  for (const v of cases) {
    assert.equal(v.status, "unavailable");
    if (v.status !== "unavailable") continue;
    assert.ok(v.reasons.length > 0);
  }
});
