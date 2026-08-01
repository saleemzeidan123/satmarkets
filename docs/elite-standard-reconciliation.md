# Elite product operating standard: reconciliation

Codex item 9, executed. `SAT-MARKETS-COMPETITIVE-ADVANTAGE-STRATEGY-2026-07-28.md` was read
in full, all 1443 lines. This document classifies its `## Elite product operating standard`
and `## Technology adoption and developer-leverage gates` sections against the repository at
`b2fc4b8`, and converts what remains into roadmap entries.

It builds nothing. That is deliberate and it is the standard's own instruction: "Do not
interpret it as an instruction to add more infrastructure immediately. Its central rule is
that tests and unused code are not proof of product value."

## The sentence that should change how packages are chosen

"A green test suite can prove that code behaves as specified. It cannot prove that the
specification solves the right problem. Orphaned components, dormant agents and unused
infrastructure do not count as delivered product value."

This platform has already produced the evidence for that claim twice from its own surfaces.
ADV-5B could have closed on a clean unit suite while five panels rendered a seeded
generator's output as measured footfall. Finding 76 recorded a fully built, fully tested
Evidence Passport with zero call sites. Finding 91 was found by a live run and by no gate.
The standard is not an outside opinion being imported. It is a description of this
repository's three most expensive mistakes.

## What is already covered

**Anti-overengineering rule, partially.** Package records already name scope, commits, tests
and remaining blockers. They do not name the user journey improved, the measurable outcome
expected, what will not be built, or the date or evidence that decides whether to continue.
Four of six fields are missing, so this counts as partially covered and the handback template
changes below close the gap. It costs nothing to adopt and it is the single highest-leverage
item in the whole standard, because it changes what gets built rather than adding a way to
check what was built.

**E0, engineering foundation, substantially met.** Laws, architecture, evidence model,
permissions, bilingual parity and automated gates are stable. ADV-1E and finding 91 closed the
last known case where mock or unknown data could be presented as production data, and
`X-Robots-Tag: noindex` plus the launch gate keep preview surfaces out of the index. E0 is the
stage gate this repository is actually standing on.

**ELITE-2, in part.** `docs/design-tokens.md`, the Harbor discipline, the green reservation
rule, `scripts/responsive-probe.mjs` at 320, 360, 390 and 430, reduced motion handled in
`globals.css` and `sat-platform.css`, and the empty, loading, error and insufficient states
that `DataState.tsx` and the evidence surfaces already distinguish. What is missing is the
independent senior design review, the interactive prototypes before rebuilding a high-risk
journey, and the widths above 430 evaluated systematically rather than incidentally.

**ELITE-3, in part.** `scripts/ar-lint.mjs`, `src/lib/translate/glossary.ts`, the bilingual
page, the Western-numerals law, the counted-noun and prefix rules the Arabic gates enforce,
and dictionary parity between `en.json` and `ar.json`. What is missing is the professional
human Arabic review, and comprehension measured separately from grammatical correctness. The
gates prove the Arabic is well formed. Nothing yet proves a Riyadh leasing manager reads it
the way it was meant.

**ELITE-6, in part.** Row-level security on the tables that carry it, `adminauth.ts`,
`ratelimit.ts`, `aiBoundary.ts`, the source-rights ledger, deny-by-default publication after
ADV-1E, and the AI data-classification policy from ADV-0. What is missing is the written
threat model, the ASVS 5.0 mapping, backup restoration testing and independent penetration
testing.

**Watch list and rejected lists, already honoured.** Nothing in this repository uses an
external vector store, an agent swarm, Bun, or a framework migration. `rejected for the
current project` requires no action beyond continuing not to do those things, and it is worth
recording that the standing directive against installing plugin packs and memory injectors
into the active build environment matches item 9 of the strategy's own directive to Claude.

## What is genuinely missing, and buildable without a licence

**ELITE-1, real-user discovery and task validation.** No research repository exists, no
representative user has been observed attempting any journey, and no task-completion rate has
ever been measured. This is the largest single gap in the standard and it is not an
engineering gap. It cannot be closed by this builder alone: it needs recruited participants.
What this builder can prepare is the instrument, which is a written task protocol per critical
journey, a severity scheme, and the repository the findings live in.

**ELITE-4, accessibility.** `aria-` attributes are used, touch targets meet the 44px floor in
the components that were reviewed, and reduced motion is handled. There is no WCAG 2.2 AA
conformance review of a complete journey, no assistive-technology testing on VoiceOver,
TalkBack or NVDA, no 200 and 400 percent reflow check, and no non-visual form of the evidence
panels, comparison tables or map. Automated scanning is explicitly named as one input and not
a conformance claim, so no gate currently in `npm test` counts toward this.

**ELITE-5, real-device performance.** Nothing measures Core Web Vitals. There is no field
data, no route-level budget for JavaScript, images, fonts, API response, search, map loading
or AI wait, and no physical-device testing. The one honest thing to record here is that a
Core Web Vitals target without field data is a number nobody has measured, and this
repository has a rule against those.

**ELITE-7, production operations.** No service-level objectives, no alert ownership, no
incident or rollback runbook, no backup restore drill, no support, correction or dispute
workflow. Vercel provides deployment and rollback mechanics; nothing else in this list exists.

**ELITE-8, product analytics.** No event dictionary, no instrumentation, no vendor, and
deliberately so: the standard requires the event dictionary, lawful basis, retention and
access to be defined before instrumentation, and that ordering has not been violated.

**ELITE-9, controlled Saudi design-partner beta.** Not started. It depends on authorized
inventory, which depends on the rights work, so it cannot be pulled forward.

**Required independent roles.** None of the eight named accountabilities is currently held by
anyone other than the builder and Codex. Codex covers independent product and technical
advice. Design, Arabic UX writing, domain review, security testing, privacy counsel,
accessibility and production operations are unowned. This is an owner decision, not an
engineering task, and it is recorded as such.

## What depends on a licence, contract or owner action

O10 continues to block the Rent Index product outcome, ELITE-9's authorized inventory, and
ADV-4's public research. It is on the critical path twice and it is the single external
dependency whose resolution unblocks the most.

ELITE-6's independent penetration test, ELITE-4's independent accessibility audit, ELITE-2's
senior design review and ELITE-3's professional Arabic review all require the owner to engage
a person. Under owner ruling 7 this builder does not contact vendors or sign agreements, so
each is recorded as a procurement requirement in `docs/procurement-backlog.md` and nothing is
represented as arranged.

DATA-1 remains blocked behind the same GitHub workflow permission that blocks the Arabic font
workflow. OBS-1 and ADV-3B remain blocked behind the enterprise AI agreement. API-1 follows
publication-rights approval. GROWTH-1 follows the FAL scope memorandum.

## What conflicts, and how it is resolved

**Nothing conflicts outright.** Two items needed reading against existing rulings rather than
adopted literally.

The standard's ELITE-5 asks for Core Web Vitals "in representative field data or an
explicitly bounded beta sample". Owner ruling 1 says domain acquisition and launch indexing
are not priorities and the preview stays protected. A protected noindex preview has no field
data by definition. These are reconciled by the standard's own alternative: the bounded beta
sample, which arrives with ELITE-9 and not before. Until then the honest state is "not
measured", not a laboratory number presented as a field result.

The standard's ELITE-8 wants adoption measured. The preview is private and unshared, so
adoption is currently zero by construction and will stay zero until a design-partner cohort
exists. Recording a zero as a product failure would be false. The event dictionary can be
written now; the measuring starts with the cohort.

## Roadmap insertion

Three things are adopted immediately because they cost no infrastructure and change what gets
built:

1. The anti-overengineering six fields become required in every future package record and
   handback. A package that cannot name its user journey, observed problem, measurable
   outcome, simplest acceptable implementation, what it will not build, and its stop
   condition, does not start.
2. After each foundation package, the reassessment the standard asks for is performed
   explicitly and recorded: is the next highest-value action implementation, design, user
   research, data acquisition, legal work or operational preparation. The default of "more
   code" stops being automatic.
3. E0 to E5 become the launch stage gates of record, superseding any implicit notion that
   shipping a package moves the product toward launch. The product is at E0.

Everything else is sequenced, not scheduled, because most of it is gated on people and rights
this builder does not control:

- **ELITE-1 instrument** may be prepared now, before any participant exists, and should be,
  because writing the task protocol is what reveals which journeys are actually critical.
- **ELITE-4 manual pass** may begin now on the journeys that exist, since keyboard completion,
  focus visibility, reading order and reflow need no external party. The independent audit is
  procurement.
- **ELITE-2 prototypes** apply to the next high-risk journey rebuild, whichever that turns out
  to be, rather than retrospectively to shipped surfaces.
- **ELITE-5, 7 and 8** wait for the beta cohort, because each of them measures something that
  does not exist yet.
- **ELITE-3 and 6 independent reviews, ELITE-9 cohort** are owner and procurement items.
- **DEV-1, OPS-1, DATA-1, SEARCH-1, OBS-1, ADV-3B, API-1, GROWTH-1** keep the strategy's own
  ordering, all queued, none started, none permitted to trigger a mid-package migration.

## The immediate consequence for package selection

Codex item 10 asks for the next genuinely open dependency-ordered product package, preferring
a real user-facing supply, demand or Listing Studio outcome over more dormant AI or
infrastructure work. The elite standard sharpens that into a test rather than a preference:
the next package must improve a journey a real person completes, and it must be able to name
its measurable outcome before it starts. That rules out, for now, activating the dormant agent
tools, building the observability layer, and adding the job queue, all of which are real work
whose value cannot yet be measured on a user.
