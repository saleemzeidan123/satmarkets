# ADV-0 closure: regulatory and data-rights register

Package: ADV-0 of the competitive advantage programme (owner directive, 2026-07-28).
Commits: `8b6614a` (rights ledger, schema and accessor), `9018c2f` (register, AI
boundary, procurement backlog).
Deployment verified: `dpl_6pgwxiPsK4C76oxQdYQxnyZD55zd`, READY, commit `9018c2f`.

## What the package was for

Every later package in this programme spends permissions. ADV-1 attaches a passport to
a figure, ADV-2 moves private documents through a workflow, ADV-3 hands material to a
third party's model, ADV-4 publishes figures, ADV-5 buys a dataset and ADV-6 accepts
contributions. None of those is safe to build on an unwritten assumption about what we
are allowed to do, and an assumption that is never written down is one that gets more
optimistic each time it is repeated.

So ADV-0 writes the permissions down in the two places that can actually hold them: a
database row that the product reads before it renders, and a code boundary that the
product passes through before it sends. A document alone would have been a promise. The
distinguishing property of this package is that the permissions are enforced by things
that fail closed rather than by things that are remembered.

## Scope delivered

**1. The rights ledger.** `supabase/migrations/20260728_source_rights_ledger.sql`
extends `source_registry` from two permission questions (may we store it, may we show
it) to nine: derived display, user export, AI retrieval, model input, refresh terms,
corrections process, audit rights, termination terms and a stop condition, plus an
overall `rights_status` and a review timestamp. Twelve columns, five check
constraints. Applied to production through the Supabase MCP and recorded in the repo,
which stays the source of truth for schema (PR-T).

Every new column fails closed by default. The backfill records only what the existing
`licence_ref` already evidences and leaves every unanswered question at the failing
default, because the only safe reading of an unanswered permission question is that we
do not have it.

**2. The typed accessor.** `src/lib/sourceRights.ts` is pure policy logic with no React
and no Supabase import, so the fail-closed rules are unit testable; `src/lib/queries/
sourceRights.ts` is the cached loader whose every failure path returns an empty map.
Three independent fail-closed points: a missing row denies, an unrecognised enum value
coerces to the most restrictive member, and `rights_status` caps the policy columns
downward and never upward. 28 tests.

**3. The regulatory register.** `docs/regulatory-register.md`, Parts A to F. It
separates three things that are commonly run together and should not be: regulatory
permission (may SAT do this activity), data rights (may this dataset be used this way)
and privacy obligations (what we owe the individuals in it). A surface needs all three.

Part A tabulates the FAL 1200025510 activity scope per surface with its counsel
question and its stop condition, and states plainly that Law 1 fixes the licence number
but does not establish the activity scope. Part B is the nine registered sources with
four observations, the load-bearing one being that no source currently permits model
input. Part C is PDPL: roles, lawful basis per data category, subject rights,
cross-border, retention, security. Part D is the AI provider requirement. Part E is the
contract requirement. Part F is the review trigger set, which is trigger-based rather
than calendar-based, because a permission is re-read when something changes and not
when a date arrives.

**4. The AI data-classification boundary.** `src/lib/aiBoundary.ts`. Two gates that
answer different questions and must both pass. The provider gate asks whether an
enterprise agreement covering training, retention, region, subprocessors, deletion and
incident notice exists; today it does not. The source gate asks whether the licence
behind this specific material permits it to be sent to a third party; today no source
does. A source we may publish to the world can still be barred from a model, and a
provider agreement does not create a licence we never had. The tests assert that
independence in both directions.

`AI_AGREEMENT_IN_FORCE` is a compile-time constant and deliberately not an environment
variable. An environment variable can be set by anyone with deploy access, can be set
by accident, and can differ between preview and production, none of which are
properties you want in the switch that decides whether private documents cross a
border. A test reads the source file and fails if a future edit makes it one.

`buildExternalPrompt` fails whole rather than partial. A model given a context with a
hole in it does not know the hole is there: it answers anyway, from the remaining
material plus whatever it invents to bridge the gap. A partial context produces a
confident wrong answer where a refusal was wanted.

**5. The boundary wired to the live call site.** `src/app/api/advisor/route.ts` calls
the boundary in `llm()`, the single choke point through which both the primary and
fallback providers are reached. What the advisor may send is declared once, in
`ADVISOR_PROMPT_PARTS`: the user's own message, up to six of their own prior turns, and
two counts. A denial returns null, which every caller below already handles by
degrading to a written deterministic sentence, so a closed boundary produces a plainer
advisor and never a silent send. This is what makes the module an enforcement point
rather than a dormant policy file.

**Correction, recorded as finding 54.** The paragraph above is left standing because it
is what this record claimed on the day it was written, and the claim is exactly what was
wrong. `llm()` was the single choke point of the advisor route, not of the platform.
`src/app/api/search/route.ts` reached two providers from an inline array of base-url, key
and model tuples, and `src/lib/translate/translateToArabic.ts` reached one from its own
key read and its own headers. Neither file imported this module at all. Both sent material
that was in fact permitted, which is why the error survived a closure review: there was no
failure to find, only a check that was never made. The declaration was drifting too, since
`ADVISOR_PROMPT_PARTS` was written by hand next to a separately written send.

ADV-3A closes all three by construction rather than by correction. `src/lib/ai/transport.ts`
is now the only module in the repository that opens a socket to a provider, `src/lib/ai/gateway.ts`
is the only module that may reach it, the boundary runs inside the gateway before any
candidate is selected, and the parts the boundary checks are derived from the messages
being sent rather than described alongside them. `ADVISOR_PROMPT_PARTS` is deleted. What
made the old claim unverifiable was that it was a claim about every file in the tree
stated from inside one module, so the replacement claim is tested from outside: three
structural tests walk `src` and fail on any file that reaches a provider, imports the
transport, or re-exports it.

**6. The procurement backlog.** `docs/procurement-backlog.md` orders the eight open
items by leverage rather than by package, states what each costs the product while it
stays open, and records what changes in this repository on the day an answer arrives.
The counsel memorandum is first because one instruction answers three questions
blocking four surfaces. Location intelligence is last because it is the only item whose
failure mode is a confident wrong number rather than a missing one.

Owner ruling 7 is honoured throughout: nothing bought, no vendor contacted, nothing
signed, no right represented, and every gated feature disabled in code rather than by
convention.

## Gate

Run on commit `9018c2f`:

- `npx tsc --noEmit`: clean.
- `npm test`: 347 tests, 347 pass, 0 fail, 0 skipped. 52 of those are new in this
  package (28 in `sourceRights.test.ts`, 24 in `aiBoundary.test.ts`). Both files were
  appended to the explicit list in `package.json`, because `npm test` is a file list
  and not a glob, so an unregistered test file silently never runs.
- `npm run ar-lint`: clean.
- `node scripts/prose-scan.mjs`: public page source gate at 0 hardcoded prose strings
  in 0 files.
- Em dashes and Arabic-Indic digits: zero in every file touched by this package.
- Production build: run by Vercel on the push. Deployment READY.

## Live evidence

Verified on the deployed production alias after READY.

- `/en/advisor`: title "AI Advisor | SAT Markets", heading "SAT Advisor", intake copy
  intact. No error state.
- `/ar/advisor`: title "المستشار الذكي | سات ماركتس", heading "مستشار SAT", first line
  "دليلك للمساحات التجارية في الرياض. اسأل بكلماتك، وأجيب من بيانات موثّقة." Numerals
  render as Western digits, including "1,600" and "الربع الثاني 2026".
- `/en/rent-index`: the attribution reads "Averages of registered rental contracts,
  from the REGA Rental Index (Ejar)", with "Indicative, not advice." Owner ruling 2 is
  satisfied: the REGA Rental Index (Ejar) attribution is retained.

## Verification not completed, and why

The advisor's POST path could not be exercised live in this session. The Chrome
extension bridge, which is the only route this container has to an authenticated
interactive session on the deployed host, reports no connected browser, and the
container's egress proxy does not reach the production host directly. Page rendering
was verified through the fetch path, which does reach it.

What that leaves unverified is a live round trip through `llm()`. The behaviour is
asserted by test rather than by observation: `buildExternalPrompt(ADVISOR_PROMPT_PARTS)`
returns allowed, so the guard is a pass-through today and the advisor's answers are
unchanged. That is a weaker form of evidence than a live answer in both languages, and
it is recorded here as weaker rather than presented as equivalent. The first session
with a connected browser should send one EN and one AR advisor message and confirm a
normal answer in each.

## Blockers carried out of this package

All are owner or counsel decisions, none is an engineering blocker, and each is
recorded with what it costs while it stays open.

- **O13**, the FAL 1200025510 activity scope and the separate REGA analytics licence
  question. Blocks the bulletin, HBU, investment scenarios and public market commentary.
- **O10**, REGA and Ejar permitted use. Blocks any derived Rent Index figure, export or
  public assistant retrieval. The attribution requirement is separately settled by owner
  ruling 2 and does not wait on this.
- **O12**, notification consent basis per channel. Blocks ADV-2 external channels; only
  in-product notification ships until it is ruled.
- **O14**, who inside an organization may release contact details. Blocks ADV-2
  mutual-interest contact release.
- **Enterprise AI agreement.** Blocks any private material reaching an external model,
  and therefore blocks the ADV-3 agents that would read a document or an enquiry thread.
- **O11**, whether the bulletin is the surface that lifts the site-wide noindex. Parked
  by owner ruling 1 along with the rest of launch indexing.

Administrative and unchanged: `.github/workflows/arabic-font.yml` is delivered and
awaits owner installation. No workflow-scoped token is requested.

## Next

ADV-1, evidence and entity foundation, sequenced behind its two preconditions because a
passport on an over-claiming page is decorative:

1. **Owner ruling 3.** Audit and correct the roughly 100 remaining over-broad claims
   from record-level evidence, `/invest` first, then public discovery, listing, lister,
   requirement, research and advisory surfaces. Claims determined from actual
   record-level evidence, never inferred from route type or generic wording.
2. **Owner ruling 4.** Anonymize the HBU comparables unless each named comparable has a
   lawful documented public source and permission, with HBU staying illustrative and
   noindex until its gates clear.

Then the Evidence Passport, the entity-kind model, field-level verification states and
the corrections model, with `ownerVerified` remaining the verification truth source.
