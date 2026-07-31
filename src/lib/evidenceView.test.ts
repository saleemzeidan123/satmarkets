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

test("no rights row reads as permission not recorded, not as permission refused", () => {
  // This is the live state today. /en/sources renders a register it could not
  // read, so every sourced figure on the platform lands here. ADV-1C.1 renamed
  // the state from `unavailable`, which was the one member of the union named
  // for how it feels rather than for what it says.
  const v = publicEvidenceView(sourced(), { ...segmentCtx, rights: null });
  assert.equal(v.state, "permission_unrecorded");
  assert.equal(v.value, null);
  assert.equal(v.source, null);
  assert.deepEqual(v.permissions, { display: "unknown", export: "unknown", aiUse: "unknown" });
});

test("a rights row for a different source is not a rights row", () => {
  const v = publicEvidenceView(sourced(), { ...segmentCtx, rights: rights({ sourceId: "gastat_sama" }) });
  assert.equal(v.state, "permission_unrecorded");
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
  // Not `held`. ADV-1C.1 correction 5: a figure a lister supplied and nobody
  // checked is shown as supplied, and saying "evidence held" over it was the
  // collapse the correction is about. The value is still displayed.
  assert.equal(v.state, "unverified");
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
  assert.ok(v.states.includes("corrected"));
  assert.equal(v.value, "450");
  assert.equal(v.corrections[0].previousDisplay, "430");
});

test("every state has a label and a note in both languages, and they differ", () => {
  const all: EvidenceState[] = [
    "held", "empty", "retracted", "restricted", "permission_unrecorded", "insufficient",
    "check_unavailable", "unverified", "stale", "corrected", "derived",
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

// ---------------------------------------------------------------------------
// ADV-1C.1 correction 5. The seven readings a reader must be able to tell apart.
// ---------------------------------------------------------------------------

test("correction 5: the seven distinctions are seven states, not one", () => {
  // Codex ruled that "unavailable" must stop standing in for several materially
  // different facts. Each row below is one of the seven, produced from a record
  // that is actually in that condition rather than asserted about a label.
  const cases: [string, EvidenceState][] = [
    ["not supplied", "empty"],
    ["supplied but not independently verified", "unverified"],
    ["verification unavailable", "check_unavailable"],
    ["stale", "stale"],
    ["insufficient", "insufficient"],
    ["access restricted", "restricted"],
    ["sourced and checked within a defined scope", "held"],
  ];
  const produced: Record<string, readonly EvidenceState[]> = {
    "not supplied": publicEvidenceView(entered({ value: null }), listingCtx).states,
    "supplied but not independently verified": publicEvidenceView(entered(), listingCtx).states,
    "verification unavailable": publicEvidenceView(
      entered({ verification: [{ dimension: "measurement", state: "unknown" }] }),
      listingCtx
    ).states,
    stale: publicEvidenceView(entered({ asOf: iso(400), maxAgeDays: 365 }), listingCtx).states,
    insufficient: publicEvidenceView(
      sourced({ sufficiency: "insufficient" }),
      { ...segmentCtx, rights: rights() }
    ).states,
    "access restricted": publicEvidenceView(
      sourced(),
      { ...segmentCtx, rights: rights({ redisplayPolicy: "internal" }) }
    ).states,
    "sourced and checked within a defined scope": publicEvidenceView(
      sourced(),
      { ...segmentCtx, rights: rights() }
    ).states,
  };
  for (const [name, expected] of cases) {
    assert.ok(
      produced[name].includes(expected),
      `${name} does not produce ${expected}; it produced ${produced[name].join(", ")}`
    );
  }
  // And the eighth, which is not one of the seven but is the one they were all
  // collapsing into: a permission record we could not read.
  assert.ok(
    publicEvidenceView(sourced(), { ...segmentCtx, rights: null }).states.includes("permission_unrecorded")
  );
});

test("correction 5: a check with no known outcome is not a check that failed", () => {
  // `verificationStateOf` demotes a stored `unknown` to `not_verified`, which is
  // right for deciding whether to CLAIM a check and wrong for describing one.
  // Reading the resolved state here would tell a reader we checked and it did
  // not pass, which is the "SAT attempted verification and failed" impression
  // Codex ruled the copy must not give.
  const v = publicEvidenceView(
    entered({ verification: [{ dimension: "measurement", state: "unknown" }] }),
    listingCtx
  );
  assert.ok(v.states.includes("check_unavailable"));
  assert.equal(v.value, "450", "an unknown check outcome must not withhold a supplied value");
  const en = evidenceStateNote("check_unavailable", false);
  assert.ok(!/fail/i.test(en), "the note reads as a failed check");
  assert.ok(!/attempt/i.test(en), "the note claims an attempt the record does not record");
});

test("correction 5: a seeded verification record is not an attempted check", () => {
  // Ruling 3: a fixture may populate a page, it may not confer a claim. It also
  // may not confer the appearance of a check that could not be completed.
  const v = publicEvidenceView(
    entered({ verification: [{ dimension: "measurement", state: "unknown", isDemo: true }] }),
    listingCtx
  );
  assert.equal(v.states.includes("check_unavailable"), false);
  assert.ok(v.states.includes("unverified"));
});

test("correction 5: a checked first-party figure is held rather than shown as supplied", () => {
  const v = publicEvidenceView(
    entered({ verification: [{ dimension: "measurement", state: "verified", checkedAt: iso(5) }] }),
    listingCtx
  );
  assert.equal(v.state, "held");
  assert.equal(v.states.includes("unverified"), false);
});

test("correction 5: the checking states qualify a figure, they never withhold one", () => {
  // The failure this guards against is a listing page that looks broken. If
  // either state started withholding, every unchecked lister figure on the
  // platform would render as an absence.
  for (const p of [
    entered(),
    entered({ verification: [{ dimension: "measurement", state: "unknown" }] }),
  ]) {
    const v = publicEvidenceView(p, listingCtx);
    assert.equal(v.value, "450", `${v.state} withheld a value it only qualifies`);
  }
});

test("correction 5: a sourced or computed figure is never described as supplied to us", () => {
  // `unverified` is a statement about a value someone gave us. On a sourced
  // figure it would be a category error, and it would also read as a criticism
  // of the source rather than of our own checking.
  const v = publicEvidenceView(sourced(), { ...segmentCtx, rights: rights() });
  assert.equal(v.states.includes("unverified"), false);
});

test("correction 5: no two states share a label or a note, in either language", () => {
  // Distinct members are worth nothing if they read identically. This is the
  // gate on "do not collapse these into one generic unavailable state" holding
  // at the surface rather than only in the type.
  const all: EvidenceState[] = [
    "held", "empty", "retracted", "restricted", "permission_unrecorded", "insufficient",
    "check_unavailable", "unverified", "stale", "corrected", "derived",
  ];
  for (const ar of [false, true]) {
    for (const fn of [evidenceStateLabel, evidenceStateNote]) {
      const texts = all.map((s) => fn(s, ar));
      assert.equal(new Set(texts).size, all.length, `two states read the same, ar=${ar}`);
    }
  }
});
