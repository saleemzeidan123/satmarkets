import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BASE_PROPERTIES,
  COLLECTION_AUTHORISED,
  EVENTS,
  EVENT_FAMILIES,
  FORBIDDEN_PROPERTIES,
  MEASURE_IDS,
  PROPERTY_CATALOGUE,
  allowedPropertiesOf,
  basisPermitsCollection,
  eventsForMeasure,
  findEvent,
  mayCollect,
  type EventSpec,
  type MeasureId,
} from "@/lib/analytics/events";
import {
  SCORECARD,
  computableToday,
  findMeasure,
  measuresForEvent,
  partiallyComputableToday,
  unknownEventReferences,
} from "@/lib/analytics/scorecard";

// PKG-ELITE-E1 slice F. The half of the ELITE-8 slice that has teeth.
//
// An event dictionary written as a document is a document. The reason this one
// is data is that the rules Codex wrote can then be asserted rather than
// remembered, and the assertions below are the difference between "we decided
// not to log searches" and "a commit that logs a search does not build".
//
// The three that matter most:
//
//   1. No allowed property list may touch the forbidden catalogue, and the two
//      name spaces may not overlap. That is Codex item 6's prohibition sentence.
//   2. Nothing is collectable while O17 is unanswered, and answering O17 does
//      not open the notification family, because O12 holds that one separately.
//   3. Every event serves a named measure and every measure with a behavioural
//      source is served by a real event. An event nobody can point at a decision
//      for is telemetry, which is the thing this design is trying not to become.

const ids = EVENTS.map((e) => e.id);

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------

test("the dictionary is not empty and every id is unique and machine safe", () => {
  assert.ok(EVENTS.length >= 40, `only ${EVENTS.length} events, which is too few to cover ten families`);
  assert.equal(new Set(ids).size, ids.length, "duplicate event id");
  for (const id of ids) assert.match(id, /^[a-z][a-z0-9_]*$/, `${id} is not a safe identifier`);
});

test("every one of the ten families Codex named has at least one event", () => {
  assert.equal(EVENT_FAMILIES.length, 10);
  for (const f of EVENT_FAMILIES) {
    assert.ok(
      EVENTS.some((e) => e.family === f),
      `family ${f} has no event, so a requirement Codex wrote is unimplemented`
    );
  }
  for (const e of EVENTS) {
    assert.ok(EVENT_FAMILIES.includes(e.family), `${e.id} is in an unlisted family`);
  }
});

test("every event carries all nine attributes, none of them empty", () => {
  for (const e of EVENTS) {
    // A purpose or a trigger of three words is a field that was filled in, not
    // a decision that was made, so the length floor is deliberate.
    assert.ok(e.purpose.length > 40, `${e.id} has no real purpose`);
    assert.ok(e.trigger.length > 20, `${e.id} has no real trigger`);
    assert.ok(e.allowed.length > 0, `${e.id} allows no properties beyond the base set`);
    assert.ok(e.prohibited.length > 0, `${e.id} names no prohibited property, so nobody thought about it`);
    assert.ok(e.basis.length > 0, `${e.id} has no lawful basis`);
    assert.ok(e.basisNote.length > 40, `${e.id} has a basis with no reasoning`);
    assert.ok(e.retention.length > 0, `${e.id} has no retention`);
    assert.ok(e.scope.length > 0, `${e.id} has no scope`);
    assert.ok(e.dedup !== undefined, `${e.id} has no deduplication rule`);
    assert.ok(e.metrics.length > 0, `${e.id} supports no measure, so it should not exist`);
  }
});

// ---------------------------------------------------------------------------
// The prohibition
// ---------------------------------------------------------------------------

test("the allowed and forbidden name spaces do not overlap", () => {
  // The type system already separates PropertyId from ForbiddenId. This catches
  // the case the type system cannot: the same NAME added to both unions, which
  // would make a forbidden field allowable without any error.
  const allowed = new Set<string>(PROPERTY_CATALOGUE.map((p) => p.id));
  for (const f of FORBIDDEN_PROPERTIES) {
    assert.ok(!allowed.has(f), `${f} is both allowed and forbidden`);
  }
});

test("no event allows anything from the forbidden catalogue", () => {
  const forbidden = new Set<string>(FORBIDDEN_PROPERTIES);
  for (const e of EVENTS) {
    for (const p of allowedPropertiesOf(e)) {
      assert.ok(!forbidden.has(p), `${e.id} allows the forbidden property ${p}`);
    }
  }
});

test("every category Codex prohibited by name is in the forbidden catalogue", () => {
  // "Do not log raw searches, private requirements, messages, documents,
  // contact details, prompts or property-sensitive content by default."
  const required = [
    "query_text", // raw searches
    "requirement_text", // private requirements
    "message_body", // messages
    "document_content", // documents
    "contact_email", // contact details
    "prompt_text", // prompts
    "exact_price", // property-sensitive content
    "lat_lng",
  ];
  const have = new Set<string>(FORBIDDEN_PROPERTIES);
  for (const r of required) assert.ok(have.has(r), `${r} is not prohibited, and Codex named its category`);
});

test("every prohibited entry on an event is a real forbidden property", () => {
  const forbidden = new Set<string>(FORBIDDEN_PROPERTIES);
  for (const e of EVENTS) {
    for (const p of e.prohibited) assert.ok(forbidden.has(p), `${e.id} prohibits the unknown ${p}`);
  }
});

test("the search family carries no query and no facet value anywhere", () => {
  // The single most likely regression in this whole design, called out on its
  // own so the failure message says what went wrong rather than which set
  // operation failed.
  const search = EVENTS.filter((e) => e.family === "search");
  assert.ok(search.length >= 5);
  for (const e of search) {
    const names = allowedPropertiesOf(e).join(" ");
    assert.ok(!/query|value|text|url/.test(names), `${e.id} allows something query shaped: ${names}`);
  }
});

test("the advisor family carries no prompt and no model output anywhere", () => {
  const advisor = EVENTS.filter((e) => e.family === "advisor");
  assert.ok(advisor.length >= 4);
  for (const e of advisor) {
    assert.ok(e.prohibited.includes("prompt_text"), `${e.id} does not prohibit the prompt`);
    assert.ok(e.prohibited.includes("model_output_text"), `${e.id} does not prohibit the model output`);
    const names = allowedPropertiesOf(e).join(" ");
    assert.ok(!/prompt|answer_text|output/.test(names), `${e.id} allows something transcript shaped`);
  }
});

// ---------------------------------------------------------------------------
// The property catalogue
// ---------------------------------------------------------------------------

test("every allowed property has a catalogue entry that says why it is safe", () => {
  const cat = new Map(PROPERTY_CATALOGUE.map((p) => [p.id as string, p]));
  assert.equal(cat.size, PROPERTY_CATALOGUE.length, "duplicate property in the catalogue");
  for (const e of EVENTS) {
    for (const p of allowedPropertiesOf(e)) {
      const spec = cat.get(p);
      assert.ok(spec, `${e.id} allows ${p}, which is not in the catalogue`);
      assert.ok(spec.shape.length > 10, `${p} has no stated shape`);
      assert.ok(spec.why.length > 40, `${p} has no reason it is not personal content`);
    }
  }
});

test("no catalogue entry is unused", () => {
  const used = new Set<string>(BASE_PROPERTIES);
  for (const e of EVENTS) for (const p of e.allowed) used.add(p);
  const dead = PROPERTY_CATALOGUE.filter((p) => !used.has(p.id)).map((p) => p.id);
  assert.deepEqual(dead, [], `catalogued but carried by no event: ${dead.join(", ")}`);
});

test("the base properties are on every event exactly once", () => {
  for (const e of EVENTS) {
    const all = allowedPropertiesOf(e);
    assert.equal(new Set(all).size, all.length, `${e.id} lists a property twice`);
    for (const b of BASE_PROPERTIES) assert.ok(all.includes(b), `${e.id} is missing the base property ${b}`);
    for (const b of BASE_PROPERTIES) {
      assert.ok(!e.allowed.includes(b), `${e.id} restates the base property ${b}`);
    }
  }
});

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

test("a deduplication key is made only of properties the event is allowed to carry", () => {
  for (const e of EVENTS) {
    const all = new Set<string>(allowedPropertiesOf(e));
    for (const k of e.dedup.key) {
      assert.ok(all.has(k), `${e.id} deduplicates on ${k}, which it may not carry`);
    }
  }
});

test("a deduplication window and its key agree", () => {
  for (const e of EVENTS) {
    if (e.dedup.window === "none") {
      assert.equal(e.dedup.key.length, 0, `${e.id} has no window but names a key`);
    } else {
      assert.ok(e.dedup.key.length > 0, `${e.id} has a ${e.dedup.window} window and no key to apply it to`);
    }
  }
});

test("an event that can only happen once to a record is deduplicated once ever", () => {
  // Completion is a state transition. Counting it twice inflates every rate it
  // appears in, and it is the cheapest way for this whole scorecard to lie.
  const onceOnly = ["listing_completed", "requirement_completed", "listing_published", "listing_draft_started", "requirement_started"];
  for (const id of onceOnly) {
    const e = findEvent(id);
    assert.ok(e, `${id} is missing from the dictionary`);
    assert.equal(e.dedup.window, "once_ever", `${id} may be counted more than once`);
  }
});

// ---------------------------------------------------------------------------
// The collection gate
// ---------------------------------------------------------------------------

test("nothing at all is collected at this commit", () => {
  assert.equal(COLLECTION_AUTHORISED, false, "O17 is unanswered and collection must stay shut");
  for (const e of EVENTS) {
    assert.equal(mayCollect(e), false, `${e.id} would be collected while O17 is open`);
  }
});

test("answering O17 would not open the notification family, because O12 holds it separately", () => {
  // `basisPermitsCollection` is `mayCollect` with the platform flag removed, so
  // this is the question "what happens on the day O17 is answered" asked without
  // having to answer it.
  for (const e of EVENTS.filter((x) => x.family === "notification")) {
    assert.equal(e.basis, "not_established", `${e.id} claims a basis O12 has not established`);
    assert.equal(
      basisPermitsCollection(e),
      false,
      `${e.id} would start collecting the moment O17 is answered, and O12 is a separate ruling`
    );
  }
});

test("an unestablished basis and an uncollected retention always travel together", () => {
  for (const e of EVENTS) {
    if (e.basis === "not_established") {
      assert.equal(e.retention, "not_collected", `${e.id} has no basis but a retention window`);
    }
    if (e.retention === "not_collected") {
      assert.ok(
        e.basis === "not_established" || e.basis === "consent",
        `${e.id} is uncollected for no recorded reason`
      );
    }
  }
});

test("a consent basis is used only where the product asks a person a question", () => {
  // Consent is not a stronger version of contract performance. It is the basis
  // for asking somebody something, and using it anywhere else makes an opt-out
  // into a way to break the service.
  for (const e of EVENTS.filter((x) => x.basis === "consent")) {
    assert.match(e.id, /comprehension/, `${e.id} claims consent without asking anybody anything`);
    assert.equal(basisPermitsCollection(e), false, `${e.id} would collect before the consent surface exists`);
  }
});

test("every basis note is grounded in the regulatory register rather than asserted", () => {
  for (const e of EVENTS) {
    const n = e.basisNote.toLowerCase();
    const grounded =
      n.includes("register") || n.includes("o12") || n.includes("o14") || n.includes("as above") || n.includes("consent");
    assert.ok(grounded, `${e.id} states a basis with no register reference and no dependency`);
  }
});

// ---------------------------------------------------------------------------
// Scope and retention
// ---------------------------------------------------------------------------

test("an event scoped to a person carries a person key and one scoped to an organization does not", () => {
  for (const e of EVENTS) {
    const all = allowedPropertiesOf(e);
    if (e.scope === "user_and_org") {
      assert.ok(all.includes("actor_key"), `${e.id} is user scoped and has no actor key`);
      assert.ok(all.includes("org_key"), `${e.id} is user scoped and has no organization key`);
    }
    if (e.scope === "org_only") {
      assert.ok(!all.includes("actor_key"), `${e.id} is organization scoped and still carries an actor key`);
      assert.ok(all.includes("org_key"), `${e.id} is organization scoped and has no organization key`);
    }
    if (e.scope === "anonymous_session") {
      assert.ok(!all.includes("actor_key"), `${e.id} is anonymous and carries an actor key`);
      assert.ok(!all.includes("org_key"), `${e.id} is anonymous and carries an organization key`);
    }
  }
});

test("the longer retention window is reserved for events a year-on-year measure needs", () => {
  // 400 days is 365 plus a comparison period. Anything given that window without
  // a seasonal measure behind it is just a longer window.
  const seasonal: readonly MeasureId[] = [
    "independent_listing_completion",
    "time_to_tenant_ready",
    "requirement_completion",
    "match_relevance_progression",
    "notification_opt_out_and_complaint",
    "data_freshness",
  ];
  for (const e of EVENTS.filter((x) => x.retention === "raw_400_then_aggregate")) {
    assert.ok(
      e.metrics.some((m) => seasonal.includes(m)),
      `${e.id} keeps rows for 400 days and serves no measure that needs a year`
    );
  }
});

// ---------------------------------------------------------------------------
// The scorecard
// ---------------------------------------------------------------------------

test("the scorecard is exactly the twelve measures Codex named, once each", () => {
  assert.equal(SCORECARD.length, 12);
  assert.deepEqual([...SCORECARD.map((m) => m.id)].sort(), [...MEASURE_IDS].sort());
});

test("every measure names a decision, a distortion and a real definition", () => {
  for (const m of SCORECARD) {
    assert.ok(m.question.endsWith("?"), `${m.id} does not ask a question`);
    assert.ok(m.definition.length > 80, `${m.id} has no computable definition`);
    assert.ok(m.unit.length > 10, `${m.id} has no unit`);
    assert.ok(m.sources.length > 0, `${m.id} has no source`);
    assert.ok(m.decision.length > 60, `${m.id} moves and nobody does anything`);
    assert.ok(m.distortion.length > 60, `${m.id} has no known way to be gamed, which means nobody looked`);
    assert.ok(m.computableNote.length > 40, `${m.id} does not say what is computable today`);
  }
});

test("no measure carries an invented target", () => {
  // Owner rule: no invented figures. A baseline nobody has measured is exactly
  // that, and an internal audience does not make it acceptable.
  for (const m of SCORECARD) {
    assert.equal(m.baseline, "not_established", `${m.id} claims a baseline`);
    const prose = [m.question, m.definition, m.unit, m.decision, m.distortion, m.baselineNote, m.computableNote].join(" ");
    assert.ok(!prose.includes("%"), `${m.id} states a percentage figure`);
    assert.ok(!/\btarget of\b|\bshould reach\b|\bat least \d/.test(prose), `${m.id} states a target`);
  }
});

test("every event the scorecard names exists, and declares the measure that names it", () => {
  assert.deepEqual(unknownEventReferences(), [], "the scorecard names an event that is not in the dictionary");
  for (const m of SCORECARD) {
    for (const id of m.events) {
      const e = findEvent(id) as EventSpec;
      assert.ok(
        e.metrics.includes(m.id),
        `${m.id} reads ${id}, but ${id} does not declare that it serves ${m.id}`
      );
    }
  }
});

test("every measure with a behavioural source has an event, and one without does not pretend to", () => {
  for (const m of SCORECARD) {
    if (m.sources.includes("event")) {
      assert.ok(m.events.length > 0, `${m.id} claims an event source and names no event`);
      assert.ok(eventsForMeasure(m.id).length > 0, `${m.id} is served by no event in the dictionary`);
    } else {
      assert.equal(m.events.length, 0, `${m.id} names events without declaring an event source`);
    }
  }
});

test("no event in the dictionary is unreachable from the scorecard", () => {
  // The inverse of the check above, and the one that stops the dictionary
  // growing events that exist because they were easy to think of.
  const orphans = ids.filter((id) => measuresForEvent(id).length === 0);
  assert.deepEqual(orphans, [], `events no measure reads: ${orphans.join(", ")}`);
});

test("every measure id resolves and every measure knows what it can produce today", () => {
  for (const id of MEASURE_IDS) assert.ok(findMeasure(id), `${id} has no specification`);
  const now = computableToday();
  const partial = partiallyComputableToday();
  // Two in full and four in part. If this changes, something was either
  // instrumented or quietly reclassified, and both deserve to be noticed.
  assert.deepEqual([...now].sort(), ["accessibility_health", "data_freshness"]);
  assert.equal(partial.length, 4);
  for (const id of now) assert.ok(!partial.includes(id), `${id} is in both lists`);
});

test("the two measures that are computable today need no event at all", () => {
  for (const id of computableToday()) {
    const m = findMeasure(id) as (typeof SCORECARD)[number];
    assert.ok(
      m.sources.some((s) => s === "record" || s === "manual"),
      `${id} is called computable today and has no record or manual source`
    );
  }
});
