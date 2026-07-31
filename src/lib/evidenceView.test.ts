import { test } from "node:test";
import assert from "node:assert/strict";
import type { EvidencePassport } from "@/lib/evidence";
import type { SourceRights } from "@/lib/sourceRights";
import { DECLARED_SOURCES } from "@/lib/publishedRecords";
import {
  FIRST_PARTY_PERMISSIONS,
  type EvidenceState,
  type PublicEvidenceView,
  evidenceStateLabel,
  evidenceStateNote,
  localiseSource,
  permissionLabel,
  publicEvidenceView,
  sourceOwnerLabel,
} from "@/lib/evidenceView";
import { RENT_INDEX_SOURCE } from "./market/attribution";

// ADV-1C. The producer, tested at the object level rather than by reading its
// source.
//
// The leak test below is the one that matters most and it is deliberately
// behavioural. A scan of this module's text for the three forbidden field names
// would fail on the doc comment that explains why they are forbidden, and a scan
// written to tolerate that comment would tolerate the leak too. So instead the
// test builds a rights row whose internal fields hold sentinel strings that
// appear nowhere else on the platform, produces a view from it, serialises the
// whole object and asserts the sentinels are absent. That holds however the type
// is refactored, and it fails the moment someone widens it.

const NOW = Date.parse("2026-07-31T00:00:00Z");
const DAY = 86_400_000;

function iso(daysAgo: number): string {
  return new Date(NOW - daysAgo * DAY).toISOString();
}

/** A first-party figure of the kind a listing page actually holds. */
function entered(over: Partial<EvidencePassport> = {}): EvidencePassport {
  return {
    field: "area_sqm",
    subjectKind: "listing",
    subjectId: "l1",
    value: "450",
    unit: "m2",
    assetType: "office",
    tier: "entered",
    statistic: "single",
    transformation: "as_published",
    sufficiency: "sufficient",
    asOf: iso(10),
    maxAgeDays: 365,
    ...over,
  };
}

/** A sourced figure of the kind the rent index would carry if rights existed. */
function sourced(over: Partial<EvidencePassport> = {}): EvidencePassport {
  return {
    field: "rent_sar_sqm_year",
    subjectKind: "segment",
    value: "1,250",
    unit: "sar_sqm_year",
    assetType: "office",
    tier: "sourced",
    statistic: "median",
    transformation: "as_published",
    sufficiency: "sufficient",
    sourceId: "rega_ejar",
    period: "2026-Q2",
    geography: "Riyadh, Olaya",
    asOf: iso(20),
    maxAgeDays: 180,
    ...over,
  };
}

const SENTINEL = {
  stop: "ZZQ" + "STOPCOND",
  note: "ZZQ" + "REVIEWNOTE",
};

function rights(over: Partial<SourceRights> = {}): SourceRights {
  return {
    sourceId: "rega_ejar",
    storagePolicy: "full",
    redisplayPolicy: "public",
    derivedDisplayPolicy: "public",
    exportPolicy: "internal",
    aiRetrievalPolicy: "none",
    modelInputPolicy: "none",
    rightsStatus: "evidenced",
    stopCondition: SENTINEL.stop,
    reviewedAt: iso(30),
    reviewedNote: SENTINEL.note,
    ...over,
  } as SourceRights;
}

const segmentCtx = { pageKind: "segment" as const, now: NOW };
const listingCtx = { pageKind: "listing" as const, now: NOW };

// ---------------------------------------------------------------------------
// Boundary 6. Nothing internal travels.
// ---------------------------------------------------------------------------

test("no internal licence field can reach a public view, whatever the rights row holds", () => {
  const v = publicEvidenceView(sourced(), { ...segmentCtx, rights: rights() });
  const s = JSON.stringify(v);
  assert.ok(!s.includes(SENTINEL.stop), "the stop condition reached the public view");
  assert.ok(!s.includes(SENTINEL.note), "the review note reached the public view");
  // And the denial reasoning, which publishability produces on every call.
  assert.ok(!s.includes("licence"), "internal licence reasoning reached the public view");
  assert.ok(!s.includes("permit"), "internal decision text reached the public view");
});

test("a denied figure carries neither the value nor the licensor's name", () => {
  // /sources states the rule: no licensor is named on a prohibited row, because
  // naming them republishes the term being respected.
  const v = publicEvidenceView(
    sourced(),
    { ...segmentCtx, rights: rights({ redisplayPolicy: "none", rightsStatus: "prohibited" }) }
  );
  assert.equal(v.value, null);
  assert.equal(v.source, null);
  assert.equal(v.state, "restricted");
  assert.ok(!JSON.stringify(v).includes("rega_ejar"));
});

// ---------------------------------------------------------------------------
// Boundary 4. The eleven things the passport must preserve.
// ---------------------------------------------------------------------------

test("every field Codex boundary 4 requires is present on the view", () => {
  const v = publicEvidenceView(
    sourced({
      verification: [{ dimension: "measurement", state: "verified", checkedAt: iso(5) }],
      corrections: [{ at: iso(3), kind: "correction", reason: "restated to the published basis" }],
    }),
    { ...segmentCtx, rights: rights() }
  );
  // source owner and permitted source reference
  assert.equal(v.source?.id, "rega_ejar");
  assert.equal(v.source?.owner, RENT_INDEX_SOURCE.en);
  // reporting period, geography, entity kind
  assert.equal(v.period, "2026-Q2");
  assert.equal(v.geography, "Riyadh, Olaya");
  assert.equal(v.subjectKind, "segment");
  // asset type and unit
  assert.equal(v.assetType, "office");
  assert.equal(v.unit, "sar_sqm_year");
  // statistic type, average versus median above all
  assert.equal(v.statistic, "median");
  // transformation performed by SAT
  assert.equal(v.transformation, "as_published");
  // sample or sufficiency status
  assert.equal(v.sufficiency, "sufficient");
  // freshness and last update
  assert.equal(v.freshness, "current");
  assert.ok(v.asOf);
  // correction history
  assert.equal(v.corrections.length, 1);
  // exact verification scope
  assert.deepEqual(v.verification, [{ dimension: "measurement", state: "verified", checkedAt: iso(5) }]);
  // public display, export and AI use permissions
  assert.deepEqual(v.permissions, { display: "public", export: "internal", aiUse: "none" });
});

test("average and median stay distinct all the way to the view", () => {
  const a = publicEvidenceView(sourced({ statistic: "average" }), { ...segmentCtx, rights: rights() });
  const m = publicEvidenceView(sourced({ statistic: "median" }), { ...segmentCtx, rights: rights() });
  assert.notEqual(a.statistic, m.statistic);
});

// ---------------------------------------------------------------------------
// The two denials a reader must be able to tell apart.
// ---------------------------------------------------------------------------

test("no rights row reads as permission not established, not as permission refused", () => {
  // This is the live state today. /en/sources renders the register unreadable
  // branch, so every sourced figure on the platform lands here.
  const v = publicEvidenceView(sourced(), { ...segmentCtx, rights: null });
  assert.equal(v.state, "unavailable");
  assert.equal(v.value, null);
  assert.equal(v.source, null);
  assert.deepEqual(v.permissions, { display: "unknown", export: "unknown", aiUse: "unknown" });
});

test("a rights row for a different source is not a rights row", () => {
  const v = publicEvidenceView(sourced(), { ...segmentCtx, rights: rights({ sourceId: "gastat_sama" }) });
  assert.equal(v.state, "unavailable");
  assert.equal(v.value, null);
});

test("derived display is judged by the derived policy, not the redisplay one", () => {
  const p = sourced({ transformation: "derived" });
  const open = publicEvidenceView(p, { ...segmentCtx, rights: rights({ derivedDisplayPolicy: "public" }) });
  const shut = publicEvidenceView(p, { ...segmentCtx, rights: rights({ derivedDisplayPolicy: "internal" }) });
  assert.equal(open.value, "1,250");
  assert.ok(open.states.includes("derived"));
  assert.equal(shut.value, null);
  assert.equal(shut.state, "restricted");
});

// ---------------------------------------------------------------------------
// First-party figures, which is everything the exchange can publish today.
// ---------------------------------------------------------------------------

test("a first-party figure consults no licence and states its permissions as recorded", () => {
  const v = publicEvidenceView(entered(), listingCtx);
  assert.equal(v.value, "450");
  assert.equal(v.state, "held");
  assert.equal(v.source, null);
  assert.deepEqual(v.permissions, FIRST_PARTY_PERMISSIONS);
  // Not recorded is not the same as not permitted, and the view must not round
  // an absent clause into a decision nobody made.
  assert.equal(v.permissions.export, "unknown");
  assert.equal(v.permissions.aiUse, "unknown");
});

test("a listing fact does not describe the market segment page it might sit on", () => {
  const v = publicEvidenceView(entered(), { pageKind: "segment", now: NOW });
  assert.equal(v.value, null);
});

// ---------------------------------------------------------------------------
// Boundary 10. Every state, and the order they resolve in.
// ---------------------------------------------------------------------------

test("empty is a state and never a blank", () => {
  const v = publicEvidenceView(entered({ value: null }), listingCtx);
  assert.equal(v.state, "empty");
  assert.equal(v.value, null);
});

test("a retraction outranks everything and withdraws the value", () => {
  const v = publicEvidenceView(
    entered({ corrections: [{ at: iso(2), kind: "retraction", reason: "the filing was withdrawn" }] }),
    listingCtx
  );
  assert.equal(v.state, "retracted");
  assert.equal(v.value, null);
  // The record of the withdrawal stays, because a withdrawal nobody can see is
  // indistinguishable from a figure that was never there.
  assert.equal(v.corrections.length, 1);
});

test("insufficient, stale, corrected and derived all apply at once and resolve in order", () => {
  const v = publicEvidenceView(
    sourced({
      sufficiency: "insufficient",
      transformation: "aggregated",
      asOf: iso(400),
      maxAgeDays: 180,
      corrections: [{ at: iso(9), kind: "correction", reason: "period restated" }],
    }),
    { ...segmentCtx, rights: rights() }
  );
  assert.ok(v.states.includes("insufficient"));
  assert.ok(v.states.includes("stale"));
  assert.ok(v.states.includes("corrected"));
  assert.ok(v.states.includes("derived"));
  // An insufficient sample is the most disqualifying of the four, so it is what
  // a compact indicator says.
  assert.equal(v.state, "insufficient");
  assert.equal(v.value, null, "an insufficient sample is not a figure");
});

test("a stale figure is shown with its date rather than withdrawn", () => {
  const v = publicEvidenceView(entered({ asOf: iso(400), maxAgeDays: 365 }), listingCtx);
  assert.equal(v.freshness, "stale");
  assert.ok(v.states.includes("stale"));
  assert.equal(v.value, "450", "an old value is old, not absent");
  assert.ok(v.asOf, "a stale figure without its date is worse than no figure");
});

test("a corrected figure still shows, with the history a reader can weigh", () => {
  const v = publicEvidenceView(
    entered({ corrections: [{ at: iso(4), kind: "correction", reason: "area restated after measurement", previousDisplay: "430" }] }),
    listingCtx
  );
  assert.equal(v.state, "corrected");
  assert.equal(v.value, "450");
  assert.equal(v.corrections[0].previousDisplay, "430");
});

test("every state has a label and a note in both languages, and they differ", () => {
  const all: EvidenceState[] = [
    "held", "empty", "retracted", "restricted", "unavailable", "insufficient", "stale", "corrected", "derived",
  ];
  for (const s of all) {
    for (const fn of [evidenceStateLabel, evidenceStateNote]) {
      const en = fn(s, false);
      const ar = fn(s, true);
      assert.ok(en.length > 0 && ar.length > 0, `${s} is missing a reading`);
      assert.notEqual(en, ar, `${s} shows the same text in both languages`);
      assert.ok(!/[؀-ۿ]/.test(en), `${s} has Arabic on the English side`);
      assert.ok(/[؀-ۿ]/.test(ar), `${s} has no Arabic on the Arabic side`);
      assert.ok(!/[\u2014\u2013]/.test(en + ar), `${s} carries a dash the law bans`);
      assert.ok(!/[٠-٩]/.test(ar), `${s} carries eastern numerals`);
    }
  }
});

test("every permission value reads in both languages", () => {
  for (const v of ["public", "internal", "none", "unknown"] as const) {
    assert.notEqual(permissionLabel(v, false), permissionLabel(v, true));
    assert.ok(/[؀-ۿ]/.test(permissionLabel(v, true)));
  }
});

// ---------------------------------------------------------------------------
// Source identity
// ---------------------------------------------------------------------------

test("every declared source has an owner in both languages", () => {
  for (const id of DECLARED_SOURCES) {
    const en = sourceOwnerLabel(id, false);
    const ar = sourceOwnerLabel(id, true);
    assert.notEqual(en, id, `${id} has no English owner and falls back to its own id`);
    assert.notEqual(ar, id, `${id} has no Arabic owner and falls back to its own id`);
    assert.ok(/[؀-ۿ]/.test(ar), `${id} has no Arabic owner name`);
  }
});

test("an unregistered source id falls back to itself rather than to a guess", () => {
  assert.equal(sourceOwnerLabel("brand_new_source", false), "brand_new_source");
  assert.equal(sourceOwnerLabel("brand_new_source", true), "brand_new_source");
});

test("the Arabic reading swaps the owner name and nothing else", () => {
  const v: PublicEvidenceView = publicEvidenceView(sourced(), { ...segmentCtx, rights: rights() });
  const a = localiseSource(v, true);
  assert.equal(a.source?.owner, RENT_INDEX_SOURCE.ar);
  assert.deepEqual({ ...a, source: null }, { ...v, source: null });
  assert.deepEqual(localiseSource(v, false), v);
});

// ---------------------------------------------------------------------------
// Boundary 6, at the correction record
// ---------------------------------------------------------------------------

test("boundary 6: who filed a correction never reaches the public view", () => {
  const v = publicEvidenceView(
    entered({
      corrections: [
        {
          at: iso(3),
          kind: "correction",
          reason: "restated after remeasurement",
          actorRole: "ops_reviewer",
          previousDisplay: "430",
        },
      ],
    }),
    segmentCtx
  );
  assert.equal(v.corrections.length, 1);
  // Not "is not rendered": is not present. A field a page holds is a field some
  // future page prints.
  assert.ok(!("actorRole" in v.corrections[0]), "the actor role travelled into the public view");
  assert.ok(!JSON.stringify(v).includes("ops_reviewer"), "the actor role reached the serialised view");
  assert.equal(v.corrections[0].previousDisplay, "430");
  assert.equal(v.corrections[0].reason, "restated after remeasurement");
});

test("boundary 6: the filing language survives the copy, so a page can mark it", () => {
  const v = publicEvidenceView(
    entered({
      corrections: [{ at: iso(3), kind: "correction", reason: "refiled", reasonLang: "en" }],
    }),
    segmentCtx
  );
  assert.equal(v.corrections[0].reasonLang, "en");
});
