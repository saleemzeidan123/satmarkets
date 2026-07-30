# Regulatory and data-rights register (ADV-0)

Created 2026-07-28 under the owner directive of the same date. Companion to
`docs/decision-register.md` (what was decided), `docs/findings-register.md` (what is
wrong), `docs/claims-ledger.md` (what we say) and `docs/strategy-reconciliation.md`
(what the Competitive Advantage Strategy asked for and what already existed).

This file answers one question and refuses to answer it optimistically: **what is SAT
Markets permitted to do, with which data, on which surface, and what would make that
permission stop being true.**

## How to read this file

Three things are deliberately kept apart, because conflating them is how a platform
ends up publishing something it had no right to publish.

**Regulatory permission** is whether SAT Markets, as a licensed entity, may perform an
activity at all. It is about us. Part A.

**Data rights** are whether a specific dataset may be stored, shown, derived from,
exported, retrieved by an assistant or sent to a model. It is about the source. Part B,
and it is enforced in code, not here.

**Privacy obligations** are what we owe the individuals whose data passes through, and
they apply even where the first two are satisfied. Part C.

A surface needs all three. Two out of three is not a partial permission, it is a no.

### Status vocabulary

The same four words as `source_registry.rights_status`, used with the same meanings, so
that a reader moving between this file and the database is never translating.

- **evidenced**: somebody read the terms and the terms are quoted or referenced. This is
  the only status that permits anything in public.
- **asserted_unverified**: we believe it and cannot prove it. Permits internal use at
  most. Never a public surface.
- **unknown**: no review has happened. Behaves identically to prohibited at every
  boundary. This is the default and it is the honest state of most rows in Part A.
- **prohibited**: reviewed and denied.

### The rule this file exists to enforce

No surface may render from a source whose rights row is incomplete. Not "should not".
The enforcement is `src/lib/sourceRights.ts`, which fails closed at three independent
points: a missing row denies, an unrecognised value coerces to the most restrictive
member, and `rights_status` caps every policy column downward and never upward. A
permission is widened in exactly one way: a migration that records new licence evidence,
written by a person, with the licence text referenced.

### What this register is not

It is not advice, it does not create rights, and no entry in it may be cited as evidence
that a right exists. Owner ruling 7 of 2026-07-28 governs: do not buy services, contact
vendors, sign agreements or represent that data rights exist. Where a question needs a
vendor, a regulator or Saudi counsel to answer it, this file states the question, names
what a sufficient answer would contain, and stops.

---

## Part A. Regulatory permission

### A1. FAL 1200025510, the licence we hold

Law 1 of `docs/LAWS.md` fixes the number: FAL 1200025510 is the only licence number that
may appear anywhere in the product, and the earlier number it replaced is banned
outright and is not repeated here. The law fixes the number. **It does not establish the
activity scope**, and nothing in this repository does either.

That distinction is the largest single regulatory unknown in the platform, because
several shipped and planned surfaces sit on different sides of a line nobody here has
drawn. Real-estate brokerage is one licensed activity. Real-estate analysis and
consultation is a different one. Formal valuation is a third, and requires an accredited
valuer. A platform that lists property, publishes a rent index, answers analytical
questions and models a highest-and-best-use is touching all three, and the fact that it
does so from one licence number is an assumption until a memorandum says otherwise.

| Surface | What it does | Question for counsel | Stop condition and current holding |
| --- | --- | --- | --- |
| `/listings`, `/listings/[id]`, `/map` | Advertises property for lease and sale, with the REGA advertising permit displayed | Brokerage and advertising: the least contested activity. Confirm the permit display obligations are met in both languages | Live. Permit number and expiry are mandatory display under the REGA marketing rules in force since 2026-05-01; `rega_permit` is `evidenced` on that basis |
| `/rent-index` | Republishes the REGA Rental Index (Ejar) published averages with attribution | Does republishing another body's published index, with attribution, constitute analysis and consultation, or is it redistribution | Live. Constrained today to the source's own published figure. Any **derived** figure moves it across the line and is denied by `rega_ejar.derived_display_policy = internal` |
| `/advisor` | Answers questions about the market from platform evidence | Where does explaining published evidence become consultation | Live. Bounded by the unsourced-figure guard: the assistant may not generate a rent, price or market statistic (Law 3) |
| `/market`, the planned bulletin (ADV-4) | Publishes commentary and derived market figures | This is analysis and consultation on its face. Requires the O13 answer before it publishes a derived figure | **Blocked.** ADV-4's evidence half proceeds; nothing derived publishes until O13 |
| `/hbu` | Highest and best use | Analysis, and arguably valuation-adjacent. Also carries owner ruling 4 on comparables | **Private and noindex** (`PRIVATE_PREFIXES`). Every figure and comparable simulated. Stays private until both the evidence gate and O13 clear |
| `/invest` | Investment framing and scenarios | Analysis, and closest to financial advice of any surface | **Private and noindex.** Also carries owner ruling 3, the over-broad claims audit, as its first correction. No scenario publishes before O13 |
| Formal valuation | Not built and not planned | Requires accredited valuer licensing, which is a separate regime | Out of scope. Recorded so that no future package drifts into it by naming a number a valuation |

**O13 is the open decision that governs this whole table.** Whether SAT Markets holds or
seeks the separate REGA real-estate analytics and consultation licence, distinct from FAL
1200025510. A sufficient answer is a Saudi counsel memorandum that maps 1200025510
surface by surface against the table above, states which activities it authorises, and
states what additional licensing the remainder would require. Until it exists, the
blocked rows stay blocked, and the live rows stay inside the narrower reading.

Status: **unknown**. No review has happened. Owner and counsel action.

### A2. REGA marketing and advertising rules

Evidenced and already enforced. The advertising permit number and expiry are mandatory
display items. `src/lib/gate.ts` encodes permit presence and expiry as gate reasons
(`permit_missing`, `permit_expired`) and mirrors the database trigger
`enforce_listing_publish_gate`, so a listing whose permit lapsed cannot publish from
either side.

Stop condition: REGA amends the mandatory display items. Re-read on any REGA marketing
rule change; the gate and this row move in the same commit.

### A3. PDPL, as a regulatory rather than privacy question

Covered in Part C as an obligations set. Recorded here because it is also a permission
question: several planned features are not merely riskier under PDPL, they are
unavailable without a lawful basis that does not currently exist. Named at C2.

### A4. Electronic communications and consent

Opportunity routing (ADV-2) sends messages. Whether Saudi law requires affirmative
opt-in before an email, push, SMS or WhatsApp message, or permits opt-out, is **O12** and
unresolved. Until it is ruled, ADV-2 ships in-product notification only, external
channels stay disabled in code rather than merely unconfigured, and consent receipts are
recorded from the first release so that a later opt-in ruling does not invalidate the
existing user base.

Status: **unknown**. Counsel question.

---

## Part B. Data rights per source

The authoritative record is the `source_registry` table, extended on 2026-07-28 by
`supabase/migrations/20260728_source_rights_ledger.sql`. It is authoritative because it
is the thing the code reads. This section is the human-readable summary and it is not
the enforcement point; where the two disagree, the table is right and this file is stale.

Nine sources are registered. The columns now answer eight questions per source rather
than two: may we store it, may we show the source's own figure, may we show a value we
derived, may a user export it, may the assistant retrieve it, how much may be sent to an
external model, what is the evidence status, and what makes all of that stop.

| Source | Store | Show own figure | Derived | Export | AI retrieval | Model input | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `gastat_sama` | full | public | public | public | public | none | evidenced |
| `rega_ejar` | full | public | internal | none | internal | none | asserted_unverified |
| `rega_permit` | full | public | none | internal | public | none | evidenced |
| `fsq_os_places` | full | public | public | internal | public | none | evidenced |
| `spl_address` | full | public | none | none | none | none | asserted_unverified |
| `foursquare_mapbox` | id_only | none | none | none | none | none | evidenced |
| `nafath` | id_only | none | none | none | none | none | evidenced |
| `wathq_deeds` | id_only | none | none | none | none | none | evidenced |
| `broker_overlay` | full | internal | none | none | none | none | prohibited |

Four observations worth stating in prose, because a table hides them.

**No source permits model input.** Not one of the nine. That is not an oversight, it is
the honest position: a republication right is not a model-input right, and no provider
agreement has been read. This is the code-enforceable half of the enterprise AI
agreement gate, and it is why ADV-3's router cannot leak a private document by accident
rather than merely being instructed not to.

**GASTAT is the only cleanly public source we hold.** GASTAT use policy 1.2.2 expressly
permits republication including commercial use with attribution. Every other public
surface is either the source's own published figure with attribution (Ejar), a
mandatory display item (the REGA permit), or an openly licensed dataset (the Apache 2.0
Foursquare snapshot).

**The Rent Index sits on an asserted, unverified right.** `rega_ejar` is
`redisplay_policy: public` because the dataset is published via open.data.gov.sa under an
attribution licence, which covers showing the source's own published average with
attribution. That is what `/rent-index` shows today. It does not cover deriving a figure
from it, exporting it or having the assistant retrieve it in public, so all three are
denied. **O10** is exactly this gap, and it sits under the highest-value surface in the
product.

**The maps and POI question is closed harder here than the strategy proposed.** The live
Foursquare API permits caching nothing but `fsq_place_id`; Mapbox forbids caching
isochrone results at all. Accordingly no isochrone table exists in this schema and the
server holds no Navigation-scoped token. ADV-5 may not reintroduce either. Travel time,
if it ships, is computed at request time, carries its method and time context, and is
never stored as a property fact. This is recorded as decision D27(a).

### B1. Sources not yet registered

A source with no row denies by construction, so this list is a work queue rather than a
risk.

**SPL National Address.** The candidate authoritative geography layer; `districts.spl_id`
already exists as the join point. Written redisplay terms are unverified pre-signup, so
every new rights column stays at its failing default and the pre-existing
`redisplay_policy: public` is recorded in the row's note as an assumption predating this
review, not as evidence. ADV-5 writes the interface. The signup is owner-side.
Status: **asserted_unverified**.

**stc Geo Analytics, and any location-intelligence provider (`geo_analytics`).** Nothing
exists, no contact has been made, and none will be under owner ruling 7. What a sufficient
contract would have to cover is recorded at Part E as a procurement requirement so that the
requirement is ready when the owner is. ADV-5B declares the capability in
`src/lib/location/registry.ts` with no host and no key, so it denies itself, and
`mobilityFigure` refuses every input at the rights gate because there is no row here to
find. Status: **unknown**.

**Google Places.** Was in production through `/api/places` and had never been registered.
No row, therefore no rights, therefore denied by construction once ADV-5A put the route
behind the location boundary. Nothing has been read, agreed or recorded about Google's
terms, and until that happens the correct state is an unregistered id whose declaration in
`src/lib/location/registry.ts` denies itself. Status: **unknown**.

**Photon / OpenStreetMap.** Was in production through `/api/places` and `/api/geocode`.
The underlying OpenStreetMap data is openly licensed and attribution is known
("OpenStreetMap contributors"), but the public Photon endpoint is a courtesy service with
a usage policy, and the requests carried text the visitor typed, which is a separate
question from the data licence and is gated separately. No row, so denied by construction.
Registering it means recording the ODbL attribution obligation and either accepting the
public endpoint's policy or self-hosting. Status: **unknown**.

**MOJ real-estate transactions.** Roadmap PD1. Subject to the standing hard constraint
recorded as D26: **srem.moj.gov.sa and the Najiz interfaces are interactive portals, not
data products, and are never scraped.** Any use requires a per-dataset open-data review,
never a blanket reading of site terms. Status: **unknown**.

**Contributor-supplied data** (brokers, landlords, valuers, research partners). ADV-6.
There is nothing to register until ADV-1's correction and audit model exists to attach
permissions to. Status: **unknown**, and the correct order of work rather than a gap.

---

## Part C. PDPL

### C1. Roles

SAT Markets is the **controller** for account data, listing data submitted by users,
requirements, enquiries, saved searches and verification events. Every external service
that processes personal data on our instruction is a **processor**, and each needs a
processing agreement. Nafath is a distinct case: it is a government verification service
returning verified identity attributes, and the row is deliberately `storage_policy:
id_only` because the verification **event** is ours to keep and the payload never was.

### C2. Lawful basis, per data category

| Category | Basis relied on | Note |
| --- | --- | --- |
| Account and authentication data | Contract performance | Necessary to provide the service the user asked for |
| Listing content submitted by a lister | Contract performance | The lister is publishing it deliberately |
| Verification documents (private bucket, RLS) | Contract performance and legal obligation | Held for the verification purpose only; access limited to the owner and SAT reviewers |
| Nafath verification event and masked identifier | Legal obligation and contract | The identity itself is not retained |
| Enquiries and messages | Contract performance | Contact release is a separate consent question, see O14 |
| Saved searches and watches, in-product alerts | Contract performance | The user created the watch |
| External-channel notifications (email, push, SMS, WhatsApp) | **Not established** | O12. Disabled in code until ruled |
| Any mobility, visitation or demographic dataset | **Not established** | Requires a licensed source, methodology review and privacy review before it exists at all |

The last two rows are the two places where a feature is unavailable rather than merely
constrained.

### C3. Data subject rights

Access, correction, deletion and objection must be servable. Today the correction path
exists as an operational one rather than a systematic one; ADV-1's corrections model is
what makes it structural, which is another reason ADV-1 precedes ADV-6.

### C4. Cross-border transfer

Every transfer out of the Kingdom needs its own basis. This bears directly on ADV-3:
model providers are the largest planned cross-border flow in the platform, which is why
`model_input_policy` is `none` for all nine sources and why the classification boundary
is a code gate rather than a policy document.

### C5. Retention and deletion

Each category needs a stated retention period and a deletion path. Verification
documents in particular should not outlive their verification purpose. Not yet specified
per category; recorded as an ADV-1 deliverable rather than left implicit.

### C6. Security

Private verification documents already sit in a private bucket behind RLS with
signed-URL access limited to the owner and SAT reviewers, which was the subject of an
earlier remediation. Incident notification obligations are unspecified and belong with
the processing agreements at Part E.

---

## Part D. AI provider terms

No provider agreement has been read, and therefore no provider may receive anything.
That sentence is the current state and it is enforced rather than intended:
`maySendToModel` returns false for every registered source at every fidelity above
`none`, and it opens only for sources whose `rights_status` is `evidenced`, because
sending material to a third party is irreversible in a way that showing a figure on a
page is not.

An agreement sufficient to change that must cover, at minimum: no training on our data
or our users' data; retention period and deletion on request; storage region; whether
and where processing crosses a border; the subprocessor list and notice of changes to
it; encryption in transit and at rest; incident notification; audit rights; notice of
model changes that would alter behaviour; and who owns the output.

Until one exists, external models see only public information, deliberately constructed
samples, or strongly redacted material, and the boundary that decides which is
`src/lib/sourceRights.ts` rather than a system prompt. A system prompt is an
instruction to a model. A classification boundary is a property of the code path.

Status: **unknown**. Owner action, and it is the binding constraint on ADV-3.

### D1. What "public information" excludes, settled in ADV-3A.1

The boundary previously permitted a class named `user_own_words` unconditionally, on the
reasoning that a person may send their own text wherever they like. Codex rejected that
reading and it was wrong. A person typing a sentence does not establish that the sentence
contains no personal, third-party, confidential or commercially sensitive information, and
the material travelling on that class was: search queries, advisor messages and their
history, tenant requirements, company, brand, budget and expansion details typed into a
query, and unpublished listing titles and descriptions sent for translation. None of that
is public information, a constructed sample or redacted material, so none of it was
permitted by the paragraph above.

While `AI_AGREEMENT_IN_FORCE` is false, the boundary now permits exactly four classes:
`own_instruction` (fixed text this repository authored), `public_published` (material
already published by us and attributable), properly constructed synthetic samples, and
approved redacted material. Unstructured user text, requirements, conversation history and
draft listings are denied before any network access.

The consequence in each of the three paths, which is behaviour rather than intention:

* Search uses its deterministic parser, `src/lib/search/queryParse.ts`.
* The advisor uses its deterministic fallback.
* Translation returns a controlled unavailable or agreement-required state. It does not
  call a provider and it does not write a success state it did not earn.

`preAgreement.test.ts` proves all three stop before the socket. It installs a throwing
`fetch` **with provider keys present**, so a stop cannot be mistaken for a missing key.

One exception is recorded and bounded: the evaluation harness may call providers using a
deliberately synthetic gold set that contains no real user or platform data. The set is
registered as `adv3-eval-gold` in `SYNTHETIC_SETS`. No provider has been called under it,
because activation still waits on this Part.

Activation requires the owner to record four things, not one: the provider agreement, the
processing terms, the cross-border basis (Part C4), and the user disclosure or consent
position. Three of the four are already open decisions in this file.

### D2. Agents and tools, settled in ADV-3B

An agent is a model that can ask the platform for things, so it is a new way for material
to reach a provider and it needs its answer recorded here rather than assumed from D1.

The route a naive agent loop opens is the one worth naming. The loop asks a model what to
do, calls a tool, appends the tool's answer to the transcript as an observation, and sends
the transcript back on the next turn. The observation is platform data wearing the
transcript's clothes, and the boundary sees `own_instruction`. That is D1 reopened one
layer up, so `ToolResult` carries its own `parts` and `toolResultSlot()` in
`src/lib/agents/tool.ts` is the only route from a tool result into a prompt. A tool that
reads unpublished rows denies at the gateway today for the same reason a draft listing
does.

**The parsed query is classified at three grains, and this is the boundary judgement in
the package.** `parsedQueryParts()` in `src/lib/agents/tools.ts` splits a parsed search
sentence into: the platform vocabulary it matched, which is our own closed enum and is
`own_instruction`; any budget or size the person typed, which is `user_own_words`; and any
free text the vocabulary did not recognise, which is `user_own_words`. The reasoning is
that a value which cannot appear unless it is already one of our published labels carries
nothing about the person, while a ceiling of 1400 is a tenant's budget and a residual
phrase is whatever they wrote.

The practical consequence, stated so it can be challenged: `office for lease in Riyadh`
carries no user text and could reach an external model today, while `office under 1400 for
the Acme expansion` cannot. The first is a claim about the grain of the classification and
not about the sentence, and if the grain is wrong this is the paragraph to argue with.

Two further positions are recorded because they do not follow from D1:

* **An agent boundary is narrower than the provider boundary, and stays narrower after an
  agreement exists.** `agentMayInclude()` runs before `buildExternalPrompt()`. Once
  `AI_AGREEMENT_IN_FORCE` flips, verification evidence becomes globally sendable; a
  discovery agent helping a visitor find offices still has no business holding a deed.
  Widening what the platform may do does not widen what a search assistant is for.
* **No figure is derived by a model.** `answerPermitted()` allows a number in an answer
  only if a tool returned that exact value or the person typed it. There is deliberately no
  policy permitting a derived figure, so a midpoint a model computed from a band it was
  given is refused. That is Law 3 as a code path rather than as a prompt instruction.

Nothing in this section activates anything. Every one of the six agent boundaries reports
`deterministic` while Part D stays `unknown`.

---

## Part E. Contract and procurement requirements

Recorded so the requirement is ready when the owner chooses to act. Owner ruling 7
stands: no vendor is contacted, nothing is purchased, nothing is signed, and no entry
here represents that a right exists.

This part states the requirement. `docs/procurement-backlog.md` states the order of
leverage, what each open item costs the product while it stays open, and exactly what
changes in this repository on the day an answer arrives.

**Saudi counsel memorandum.** The FAL 1200025510 activity-scope mapping described at A1,
plus O12 (consent basis for external notification channels), plus the legal-page
placeholders that are finding rank 9. One instruction, three answers, and it unblocks
more than any other single item in this file.

**REGA and Ejar permitted-use language (O10).** A written statement of whether derived
values, user export and assistant retrieval are permitted, and what attribution string
is required. Sufficient to move `rega_ejar` from `asserted_unverified` to `evidenced`
and to open the highest-value surface in the product to derived figures.

**SPL National Address.** Signup, then read and record the written redisplay terms.

**stc Geo Analytics, or any location-intelligence provider.** A sufficient agreement
must state: coverage map and its gaps; historical depth; refresh cadence; how the sample
is constructed and its known biases; consent provenance for the underlying subjects;
minimum aggregation threshold; controller and processor roles; storage location;
cross-border transfer basis; audit rights; deletion on termination; and an explicit
prohibition on user-level output. A pilot that cannot answer coverage and bias is a
pilot that will produce a confident wrong number.

**The twelve clauses above are executable (ADV-5B).** They are not only prose here. Each
one is a `ClauseId` in `src/lib/location/sufficiency.ts`, `RECORDED_AGREEMENTS` is empty,
and `assessMobilityAgreement` returns the list of clauses a candidate agreement leaves
unanswered rather than a yes or a no. So reading a set of terms produces a diff against
this part rather than an impression of it, and a partial answer is a recorded gap instead
of a judgement call. The publication thresholds that sit downstream of a sufficient
agreement are in `src/lib/location/coverage.ts`: the publishable geographies, the minimum
aggregation count, the maximum period age and the minimum observed share, each with its
own failure code. An agreement being sufficient never implies a particular figure is
publishable, and the two are assessed separately for that reason. D29 records the full
rule.

**Location and geography providers (settled in ADV-5A).** Distinct from the AI agreement
and not implied by it. Before any external location provider may receive text a user
typed, the owner must record, per provider: the processing terms; whether the provider is
a controller or a processor for the query text; the storage location and cross-border
basis; the retention period applied to queries; whether the answer may be displayed, and
in redisplayed or derived form; whether it may be cached, and for how long; and the
required attribution string. `PROCESSING_AGREEMENTS_IN_FORCE` in
`src/lib/location/boundary.ts` is the single switch, and it is a compile-time constant
rather than an environment read on purpose: an environment variable is a deployment
setting, and this is a contractual fact. Nothing about a location provider is activated by
setting a key.

**Mapbox, specifically.** `foursquare_mapbox` is `storage_policy: id_only`,
`redisplay_policy: none`, `derived_display_policy: none`. A travel time is a derived value,
so displaying one publicly needs `derived_display_policy` moved, not `redisplay_policy`,
and D27(a) independently forbids storing it. Both must be satisfied; neither implies the
other.

**Enterprise AI agreement.** As specified at Part D.

**Processing agreements** with every processor touching personal data.

**Contributor agreements** (ADV-6): permission scope, correction obligations, audit
rights and revocation, including what happens to already-published material when a
contributor revokes.

---

## Part F. Review cadence and stop conditions

Every registered source carries a `stop_condition` describing what makes its permissions
stop being true, because a permission with no expiry story is a permission nobody is
watching. The conditions currently recorded fall into three kinds: a licence changing
(GASTAT, the Foursquare snapshot, provider terms), an obligation changing (the REGA
marketing rules, PDPL), and an open question being answered (O10 for Ejar, the signed
terms for SPL, written permission for broker research).

Review triggers, rather than a calendar:

- Any release that adds a figure from a source re-reads that source's row first.
- Any change to a regulator's rules moves the affected row and its code gate in the same
  commit.
- Any new source lands with a complete row before it renders anywhere, not after.
- Any answer to O10, O12, O13 or O14 updates this file, the decision register and the
  affected `source_registry` row together.

---

## Open decisions this register depends on

| Ref | Question | Blocks |
| --- | --- | --- |
| O10 | Exact licence terms and required attribution for each public dataset, Ejar first | Any derived Rent Index figure, export or public assistant retrieval |
| O11 | Whether the public bulletin is the surface that lifts the site-wide noindex | Finishing ADV-4; the indexing half is parked by owner ruling 1 |
| O12 | Notification consent basis, affirmative opt-in or opt-out, per channel | ADV-2 external channels |
| O13 | The separate REGA analytics and consultation licence, distinct from FAL 1200025510 | The bulletin, HBU, investment scenarios, public market commentary |
| O14 | Who inside an organization may release contact details or bind the organization | ADV-2 mutual-interest contact release |

All five are recorded in `docs/decision-register.md`. This file states what each one
costs while it stays open.
