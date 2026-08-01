# ELITE-8 event dictionary and product scorecard, PKG-ELITE-E1 slice F

Codex item 6 of PKG-ELITE-E1. A privacy-minimized first-party event dictionary
and the initial twelve measure product scorecard. No third-party analytics SDK
was installed, and nothing is collected at this commit.

## The six anti-overengineering fields

**User journey improved.** None directly, and that is the honest answer. This
slice improves the next decision about every journey rather than any journey
itself. Slice E produced 54 recorded accessibility defects and no evidence about
which of them costs a real person a task, and the ELITE-1 instrument from slice
D can only observe ten people in a room. The dictionary is what turns the
eleventh person onward into evidence.

**Observed problem or unavoidable foundation.** Unavoidable foundation, with an
observed problem behind it. The observed problem is that every prioritisation
argument in this repository so far has been made from reading, reasoning and
severity labels, because there is no behavioural evidence of any kind. The
foundation is that the moment somebody wants that evidence, the cheapest path is
an SDK that ships a session recorder and a query string, and by then the
argument about what may be collected is being had under deadline. Writing the
dictionary before the collector means the prohibition exists before the pressure
does.

**Measurable outcome expected.** Twelve named measures, of which two can be
produced from records already held at this commit, four in part, and six not at
all until the outcome recorded below is answered. The expected outcome of this
slice is that the first design-partner round produces a baseline for the six
research-observed measures, and that no measure is ever reported without one.

**Simplest acceptable implementation.** Typed data with tests, in two modules
that nothing imports. No emitter, no client, no endpoint, no table, no vendor,
no environment variable. The dictionary is a set of TypeScript literals so that
each of the rules Codex wrote is an assertion in `events.test.ts` rather than a
sentence in a document nobody runs.

**What will not be built.** No analytics SDK, no collector, no ingestion
endpoint, no event table, no dashboard, no session replay, and no consent
banner. Nothing in this slice sends a byte anywhere.

**The date or evidence that decides whether to continue.** The answer to O17,
recorded in the status ledger in this slice. Until the lawful basis, the
retention position and the user disclosure for first-party behavioural
measurement are settled, building a collector would be building something that
must not be switched on.

**Next highest-value action after this slice.** Not implementation. With slices
A to F complete, the package has produced a research instrument, an
accessibility queue and a measurement design, and every one of them is now
waiting on the same thing: real people using the product. The next highest-value
action is user research, specifically recruiting the ten ELITE-1 participants,
and the owner decisions that let a round run. Writing more product surface ahead
of that round would be writing against six requirements and zero registered
interests, which is the reasoning Codex already approved at the start of this
package.

## What is in the dictionary

`src/lib/analytics/events.ts` holds 46 events across exactly the ten families
Codex named: listing, missing fact, media, search, requirement, match,
notification, passport, advisor and progression.

Every event carries the nine attributes Codex required: purpose, trigger,
allowed properties, prohibited sensitive properties, lawful basis or consent
dependency, retention, user and organization scope, deduplication, and the
measure or measures it supports. A tenth field, `basisNote`, carries the
reasoning for the basis, and a test asserts that every one of them refers to the
regulatory register or to a named open outcome rather than simply asserting a
basis.

48 properties are catalogued. Each one states its exact shape and the reason it
is not personal content. Five of them are on every event: `schema_version`,
`occurred_at_minute`, `locale`, `surface` and `session_key`. `occurred_at_minute`
rather than a timestamp, and `surface` as a route family identifier rather than a
URL, are both deliberate: a millisecond and a query string are the two fields
that turn a counter into a trace.

30 properties are forbidden by name, in a `FORBIDDEN_PROPERTIES` list rather than
a comment, so that a test can assert no event allows any of them and that the two
name spaces do not overlap. The list covers every category Codex prohibited:
query text, facet values, saved search definitions, requirement text and field
values, shortlist contents, message and enquiry bodies, document content and
filenames, contact names, email addresses and phone numbers, national ID, CR and
deed numbers, Nafath payloads, prompts, model output, draft field values, exact
prices and areas, coordinates, street addresses, IP addresses, user agent
strings, full URLs and referrers with query strings, screen recordings and
keystrokes.

Two of those deserve naming individually, because they are where a privacy
promise usually fails quietly. The search family records `facet_ids`, the
identifiers of the filters that were active, and never `facet_values`, what was
typed or selected into them. The advisor family records whether a result was
grounded, which typed tool produced it and whether it was refused, and never the
prompt or the model output. In both cases the measure Codex asked for is still
answerable and the content is still absent.

## Why nothing is collected

Two independent conditions hold the dictionary shut, and they are deliberately
not collapsed into one flag.

The first is **O17**, opened in this slice: the lawful basis, retention position
and user disclosure for first-party behavioural measurement. It is expressed as
`COLLECTION_AUTHORISED = false`, a module constant rather than an environment
variable, because an environment variable can be set by whoever holds the
dashboard and a constant has to be changed in a commit, next to the comment that
explains the ruling it depends on.

The second is per-event. Five notification events carry
`basis: "not_established"` and `retention: "not_collected"` under **O12**, and
two comprehension events carry `basis: "consent"` with the same retention,
because the surface that would ask the question does not exist. `mayCollect` is
the conjunction of the two, and `basisPermitsCollection` is separated from it so
that a test can ask what would happen on the day O17 is answered without
answering it. The answer, asserted by that test, is that answering O17 would open
39 events and would still leave the notification family shut, because O12 holds
it separately.

By lawful basis: 39 events rest on contract performance, 2 on consent, 5 on no
established basis. By retention: 28 hold raw rows for 90 days before aggregation,
11 hold 400 days because a year-on-year measure needs a full cycle plus a
comparison window, and 7 are not collected at all. Zero events are collectable at
this commit, and a test asserts that.

The lawful basis vocabulary is not invented here. It is the vocabulary of
`docs/regulatory-register.md` Part C2, the PDPL lawful-basis-per-category table,
and Part C1 records that SAT is the controller and that any external processor
needs a processing agreement first. No processor is named in this slice because
no processing happens in it.

## The scorecard

`src/lib/analytics/scorecard.ts` holds the twelve measures Codex named, once
each. Every measure states the question it answers, its definition, its unit, its
sources, the events that feed it, its cadence, the decision it causes somebody to
make, and the cheapest way to move it without improving anything. That last field
exists because a measure with no stated distortion is a measure that will
eventually be gamed by someone acting in good faith.

No measure carries a target, and a test asserts that no percentage and no
target-shaped phrase appears anywhere in the file. A target invented before a
baseline exists is a figure with no source, which the standing rule forbids.
Every baseline is the literal value `not_established`.

What can be produced today, stated honestly rather than promised:

| Producible now | Measures |
| --- | --- |
| Yes, from records already held | `data_freshness`, `accessibility_health` |
| In part | `independent_listing_completion`, `requirement_completion`, `match_relevance_progression`, `unsupported_figure_incidents` |
| No, until O17 or a research round | the remaining six |

Two of the twelve are worth calling out. `unsupported_figure_incidents` is
reported as a count and never as a rate, because the acceptable number is zero
and a rate implies a budget. `accessibility_health` carries its own distortion
warning: slice E raised the open defect count from 57 to 111 while fixing 48
severe defects, because looking finds things, and reading a rising count as
falling health would punish the pass that produced it.

## Verification

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Clean |
| `npm test` | 1557 tests, 0 failing, including 30 new in `events.test.ts` |
| `npm run ar-lint` | Clean |
| `node scripts/prose-scan.mjs` | GATE 0 hardcoded prose strings in public page source |
| Vercel production build | READY |

There is no live EN or AR evidence for this slice and there cannot be. Nothing in
it renders, so there is no page to open. The evidence that it works is the test
suite, and the evidence that it changed nothing user-facing is that both modules
are recorded in `ALLOWED_UNREACHED` in `src/lib/reachability.test.ts`, which
fails the moment either of them gains a consumer without that entry being
removed deliberately.

## What a future collector must do before it may exist

Recorded here so that the next person does not have to reconstruct it.

Answer O17 first, in the status ledger, with the basis, the retention position
and the disclosure text. Then write the collector against `EVENTS` rather than
against a list of strings, so that an event absent from the dictionary cannot be
emitted. Then check `mayCollect` per event at the emit site rather than once at
startup, so that a family held by its own dependency stays held. Then confirm the
processor position in register Part C1 before any row leaves the platform. A
collector that reads the dictionary and ignores the gate would pass typecheck and
break every promise in this file, which is why the gate is a function of the
event and not a boolean beside it.
