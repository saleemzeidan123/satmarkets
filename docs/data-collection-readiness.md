# Data collection readiness record (O17)

Status: **proposal awaiting owner and counsel decision. Nothing described here is
running.** `COLLECTION_AUTHORISED` is `false` in `src/lib/analytics/events.ts`, no
collector exists in `src/`, no analytics vendor is installed, and no event has ever
been emitted or stored. This document exists so that O17 can be decided against a
concrete proposal rather than against an intention.

Every row below is written in one of two voices, and the voice is stated on the row:
**decided** means the position is already enforced in code or already recorded in
`docs/regulatory-register.md`; **proposed** means it is this document's
recommendation and has no force until the owner rules.

## The six fields

**User journey improved.** None directly. This record is the precondition Codex
attached to O17. Its indirect effect is on every journey the twelve scorecard
measures cover, because none of them can be baselined while collection is shut and
none of them should be opened while the answers below are blank.

**Observed problem or unavoidable foundation.** Unavoidable foundation, and a
narrow one. PKG-ELITE-E1 produced a 46 event catalogue and a 12 measure scorecard
that deliberately collect nothing. The failure mode this record prevents is the
ordinary one: a collector gets built because the dictionary exists, and the lawful
basis, the retention window and the privacy notice are settled afterwards by
whoever is on the ticket.

**Measurable outcome expected.** One owner or counsel ruling on O17, recorded with
a date, that either enables a named subset of events under stated conditions or
keeps collection shut with a stated reason. No product metric moves.

**Simplest acceptable implementation.** This file. No collector, no schema
migration, no vendor evaluation, no environment variable.

**What will not be built.** No client SDK. No vendor integration of any kind. No
event table. No session replay, heat mapping, keystroke capture or screen
recording, now or later, at any authorization level. No third party tag on any
page. No cross site identifier. No advertising or marketing use of any event.

**The date or evidence that decides whether to continue.** The O17 ruling. If it
has not been made by the time the first design partner round completes, the round
is measured from consented research notes and manual observation as Codex
directed, and this record simply waits.

**Next highest value action after this record.** Legal work, then owner decision.
Not implementation. The engineering side of O17 is one boolean and a writer; the
part that is actually hard is the lawful basis and the notice, and neither is
mine to settle.

## The fourteen items

### 1. Exact events to be enabled

Not all 46. The proposal is a staged opening, and the stages are already
computable from the data rather than asserted here.

**Stage 1, proposed, 39 events.** Every event for which
`basisPermitsCollection` returns true today. These are the 39 whose declared
basis is `contract` or `consent` and whose retention is not `not_collected`.
Enabling them is what answering O17 alone would permit.

**Held, 7 events, decided.** Five carry `basis: "not_established"` and two carry
`retention: "not_collected"`. They cannot be opened by an O17 ruling at all;
each needs its own basis established first. The notification family is held
separately and independently by O12, which the PKG-A11Y-1 commission has just
reconfirmed, so a stage 1 opening still sends nothing outward and still records
no external delivery.

**Proposed sub-staging.** Even within the 39, the recommendation is to open one
journey first rather than all nine remaining families at once. The natural first
journey is Listing Studio: the 7 `listing` events plus the 3 `missing_fact`
events, 10 in total. The reason is not that they are the safest, because they are
not obviously safer than the rest; it is that
`independent_listing_completion` is the measure with the clearest product
decision attached to it, so a first opening produces a number somebody actually
uses rather than a pipeline nobody reads.

A note against a tempting mistake. The two measures the scorecard marks
computable today, `data_freshness` and `accessibility_health`, are computable
precisely because they need no behavioural event at all; they are read from
platform records and from accessibility runs. They are not a gentle first
sub-stage for collection, and proposing them as one would be a way of appearing
to start while starting nothing.

The authoritative list is not restated here in prose, because a prose copy drifts
from the code. It is `src/lib/analytics/events.ts`, filtered by
`basisPermitsCollection`, and the filter is asserted by
`src/lib/analytics/events.test.ts`.

### 2. Identifiers used

Four, and no others. Each is defined in `PROPERTY_CATALOGUE` with the reason it is
not personal content.

| Identifier | Shape | Linkable to a person by a reader of the store | Voice |
| --- | --- | --- | --- |
| `session_key` | Rotating pseudonymous key, scoped to one visit, not linkable across visits by the emitter | No | Decided in code |
| `actor_key` | Pseudonymous per-installation key derived from the account id, not the account id, not reversible by a reader of the event store | No, not without the derivation secret | Decided in code |
| `org_key` | Pseudonymous organization key | No | Decided in code |
| `is_research_participant` | Boolean, set only for an account enrolled in a design partner round with recorded consent | No | Decided in code |

**Decided, and enforced by test:** `ip_address`, `user_agent_string`,
`full_url_with_query`, `referrer_with_query`, `contact_name`, `contact_email`,
`contact_phone`, `national_id`, `cr_number`, `deed_number` and `nafath_payload`
are all in `FORBIDDEN_PROPERTIES` and cannot appear on any event.

**Proposed and unresolved:** where the derivation secret for `actor_key` lives,
and whether it rotates. If it never rotates, `actor_key` is a permanent
pseudonym; if it rotates, longitudinal measures break at the rotation. This is a
real trade off and it is the owner's to make, not a detail to be settled in
implementation.

### 3. Storage location

**Decided:** nowhere. No table, bucket or external endpoint holds any event
today.

**Proposed:** the existing Supabase Postgres project, in the Saudi or nearest
supported region already used for platform data, as a first party table under
row level security. The point of the proposal is what it rules out: no vendor
endpoint, no cross border transfer beyond whatever the platform database already
lawfully does, and therefore no new Part C4 transfer question opened by
measurement. If the region the project actually sits in is not the region the
privacy notice implies, that is a pre-existing question this record surfaces
rather than creates, and it must be answered before item 1 stage 1 opens.

### 4. Access roles

**Proposed.** Three roles, least privilege, no standing raw access for anyone.

| Role | Raw rows | Aggregates | Notes |
| --- | --- | --- | --- |
| Product and research | No | Yes | The scorecard is served entirely from aggregates. This is the role that does the day to day work and it never needs a row. |
| Engineering, on call | Time boxed, logged, reason recorded | Yes | Only for a named defect in the pipeline itself. |
| Database administrator | Technically unavoidable | Yes | Covered by item 13 rather than pretended away. |

No role outside SAT. No sharing of raw rows with any third party for any purpose,
including a prospective processor evaluating its own product.

### 5. Encryption

**Proposed.** In transit, TLS on every hop, which is already the platform
position. At rest, the storage layer's encryption, which for the existing
database is the provider's disk level encryption. The honest statement is that
disk level encryption protects against a stolen disk and not against an
authorized query, which is why items 4 and 13 carry the actual weight. No
additional application level encryption is proposed for pseudonymous
non content events, because it would prevent the aggregation the whole design
exists for while adding no protection against the realistic threat.

### 6. Raw event retention

**Decided in code, per event.** Three windows, declared on every event, not set
globally:

| Window | Events | Meaning |
| --- | --- | --- |
| `raw_90_then_aggregate` | 28 | Row level rows deleted at 90 days, aggregates survive |
| `raw_400_then_aggregate` | 11 | Row level rows deleted at 400 days, aggregates survive. Used only where a measure genuinely needs a year over year comparison |
| `not_collected` | 7 | No raw row at all |

**Proposed:** deletion runs as a scheduled job with its own log, and the log is
the evidence of compliance rather than a claim that the job exists. A retention
window nobody can prove ran is not a retention window.

**Not yet specified anywhere:** `docs/regulatory-register.md` Part C5 records
retention as unspecified per category for platform data generally. Measurement
retention being specified while the underlying record's is not is an inconsistency
worth naming; it does not block O17 but it should not be presented as the
platform having a complete retention position.

### 7. Aggregation retention

**Proposed.** Aggregates are kept indefinitely, because a baseline whose history
is deleted cannot show whether the product improved, and Codex's own scorecard
rule requires the original baseline and target history be preserved and never
revised retrospectively.

The condition that makes indefinite retention acceptable is a minimum cell size.
**Proposed:** no aggregate is written or displayed for a cell containing fewer
than 10 distinct `actor_key` values, and no aggregate carries `actor_key`,
`org_key` or `session_key` at all. An aggregate over 3 people is a person with
extra steps.

### 8. Deletion and correction

**Proposed, and it must be stated plainly because it is the weakest part of the
design.** Pseudonymous by design and honouring a deletion request are in
tension: if `actor_key` is not reversible, an account deletion cannot find that
account's rows.

The proposal resolves it as follows. The derivation is one way to a reader of the
store, but the derivation itself is reproducible by the service, so on an
erasure request the service recomputes the subject's `actor_key` and deletes the
matching raw rows. Aggregates already written are not recomputed, because they
contain no identifier and no cell smaller than 10 people, and recomputing them
would require retaining exactly the linkage this design avoids. That position
must be reviewed by counsel rather than assumed correct; it is the single most
likely item in this record to be ruled wrong.

Correction of an event is not offered. An event is a record that something
happened at a time, not an assertion about the person, so there is nothing to
correct. Correction rights over the underlying listing, requirement and account
records are unaffected and are handled by Part C3.

### 9. User opt out where applicable

**Proposed, and dependent on item 11.** If the basis is contract performance,
an opt out may not be legally required for the 39, but the recommendation is to
offer one for all of them, because a measurement programme a user cannot decline
is a programme that will eventually be defended rather than explained. The opt
out is per account, takes effect at the next event rather than retroactively, and
is honoured by not writing rather than by writing and filtering.

Where the basis is `consent`, on the 2 comprehension events, opt in is required
and absence of a choice means no collection. There is no pre-ticked state and no
inferred consent. Both of those events also carry `not_collected` retention
today, so they are held twice over and an O17 ruling does not reach them.

**Decided, carried from the O12 ruling:** acceptance of general platform terms is
not consent to anything, and specifically not to automated opportunity marketing.
The same reasoning applies here: accepting terms is not consent to behavioural
measurement under a consent basis.

**Not yet built:** finding 192 records that a consent label already promises a
withdrawal that has no route, control or channel. No opt out may be advertised
here until that class of defect is closed, or this record repeats the same error
at a larger scale.

### 10. Privacy notice changes

**Proposed.** The notice cannot go live before collection and must not go live
after it. Required additions, in both languages with true parity:

A named measurement section stating that SAT measures use of its own product
using first party events; that the events record which step, which control and
which outcome, and never the text a person typed, the figures they entered, their
documents, their messages or their location; the four identifiers of item 2 and
that they are pseudonymous; the retention windows of items 6 and 7; that no
analytics vendor receives the data and no third party tag runs on any page; the
opt out position of item 9 and where the control is; and how to exercise erasure
under item 8.

**Blocked by O5.** The Terms, Privacy and Contact pages are placeholders pending
counsel engagement. A measurement section cannot be written into a placeholder
and then be described as a notice.

### 11. Lawful basis or consent dependency

**Decided in code, per event, taken from `docs/regulatory-register.md` Part C2
rather than invented:** 39 events declare `contract`, 2 declare `consent`, 5
declare `not_established`. No event declares `legal_obligation`.

**The question O17 actually asks, unresolved:** whether contract performance
genuinely covers product measurement of an account the person asked for, or
whether Saudi PDPL requires a separate basis for measurement that is not
necessary to deliver the service. The 39 events are written as `contract` because
that is the register's classification of the underlying activity, not because
counsel has confirmed that measurement inherits it. Until counsel confirms it,
the `contract` classification on those 39 is a proposal wearing a code
constant's clothing, and this record says so rather than letting the constant
speak for itself.

The 2 `consent` events cannot be opened by any answer to O17 alone. The 5
`not_established` events cannot be opened at all until a basis is established for
each.

### 12. Research session treatment

**Decided in code:** `is_research_participant` exists precisely so a facilitated
session can be excluded from a baseline.

**Decided by Codex, and it governs:** for ELITE-1 sessions, use consented
research notes and manual observation. Product telemetry stays off unless a
separate, explicitly bounded research authorization is approved. So the first
design partner round produces no events at all, and `is_research_participant`
has no data to mark yet.

**Proposed for any later authorized round:** research session data is separated
at write time rather than filtered at read time; it is excluded from every
baseline and every target; and the consent covering it is the research consent
recorded in the session, which is specific, time bounded and separate from
platform terms. A participant withdrawing consent has their session's rows
deleted, not merely flagged.

### 13. Employee and administrator access

**Proposed, and stated without softening.** A database administrator can read any
row in a database they administer. No access control claim in this record
survives that fact, so the controls are procedural and evidential rather than
technical:

Standing access to raw rows is granted to nobody. Engineering access is time
boxed, requires a named defect, and is logged. Administrator access is logged by
the database's own audit facility, and the log is reviewed rather than merely
retained. No employee may query raw events to answer a question about a named
person, a named organization or a named listing; the scorecard is served from
aggregates and there is no legitimate product question that requires a row about
a person. Violating that is a disciplinary matter and should be written as one in
the internal policy, not left to good sense.

No contractor, agency or vendor is granted any access, raw or aggregate.

### 14. Confirmation that prohibited properties cannot enter through generic metadata

**Confirmed, and enforced by test rather than by policy.**

The design has no generic metadata channel. There is no `properties`, `meta`,
`extra`, `context` or `payload` bag anywhere in the type. `EventSpec.allowed` is
`readonly PropertyId[]`, a closed union of 48 identifiers, so a property that is
not in the catalogue is a TypeScript compile error at the call site, not a
runtime check that can be bypassed. `PropertyId` and `ForbiddenId` are disjoint
unions with no overlapping member, so a forbidden identifier cannot be named in
an allowed list even by mistake.

`src/lib/analytics/events.test.ts` asserts all of the following, and the suite is
part of the ship gate:

no event's `allowed` list intersects `FORBIDDEN_PROPERTIES`; every entry in every
`allowed` list exists in `PROPERTY_CATALOGUE`; every `BASE_PROPERTIES` member is
present on every event; every catalogue entry carries a `shape` and a `why`
explaining why it is not personal or commercial content, each above a minimum
length so the explanation cannot be a placeholder; every event serves at least
one declared measure; and `mayCollect` returns false for all 46 while
`COLLECTION_AUTHORISED` is false.

The consequence, stated concretely: a future engineer who wants to record what a
searcher typed has to add `query_text` to the catalogue, delete it from
`FORBIDDEN_PROPERTIES`, and change the test that asserts the two do not
intersect. There is no path that does it quietly, which is the entire point of
holding the dictionary as typed data instead of as a document.

## What is still missing before O17 can be answered yes

Counsel confirmation that measurement inherits contract performance, per item 11.
Counsel review of the erasure position in item 8. The O5 privacy notice, since
item 10 cannot be satisfied against placeholder pages. A ruling on the
`actor_key` derivation secret and its rotation, per item 2. Confirmation of the
database region against what the notice will say, per item 3. And the closure of
finding 192, so that an advertised opt out is a real one.

Until all six are settled, `COLLECTION_AUTHORISED` stays false, which is the
ruling already in force.
