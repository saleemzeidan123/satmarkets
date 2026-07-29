# ADV-3B closure record

Entered directly from ADV-3A.1 without waiting for approval, per the directive. Scope as Codex
set it: typed SAT tools, six agent boundaries, deterministic calculation and permission layers,
a synthetic bilingual evaluation gold set, and model-quality, latency and cost evaluation. No
real private data to any provider. No provider selected merely because it is inexpensive. No
autonomous consequential writes.

## What shipped

`3e36d52` carried the first half: `src/lib/agents/tool.ts`, `tools.ts`, `permission.ts` and
`agents.ts`. This record covers the whole package and the second half, which is
`src/lib/eval/`.

### Typed SAT tools

A tool declares a name, an effect, the capability required to call it, a bilingual summary, a
parser and a run function. The parser is a function rather than a schema object because the
refusal sentence a caller reads has to be written, not generated: a machine-generated schema
error names the field, its type and often its enumeration, and that is a disclosure to a caller
who was not permitted to know the tool exists.

Every tool result carries its own `PromptPart` list, so what a tool returned is classified by
the tool rather than by whoever passes the result along afterwards. A result cannot lose its
provenance in transit because the provenance travels inside it.

### The permission layer

`capabilitiesOf` is a grant table keyed on role, and an unknown role falls back to the
signed-out grants rather than to everything. Three faults are closed and each has its test:
a capability over the actor's own records requires an actual party id, so a role alone never
opens somebody's records; a tool the caller may not use is never named in the list a model is
offered, because naming a tool as unavailable discloses everything naming it would have; and
the permission check runs before the parser, so a refused caller never learns the schema. Both
refusal reasons return the same sentence, so a refusal never confirms which tool exists.
Nothing in the layer reads a role out of an argument.

### The six agent boundaries

Discovery, listing copilot, opportunity matching, evidence auditor, deal analyst and
operations. Each declares a purpose and a no-model behaviour in both languages, a bounded tool
list, a maximum capability, a maximum number of tool calls per turn so a loop cannot become a
spend, a permitted data-class list narrower than the global boundary, and a figure policy that
is either `none` or `tool_vouched`.

The narrower gate is the point. The global boundary would permit verification evidence to an
external model once the agreement exists; the discovery agent may still never hold a deed. Only
the operations agent reaches unpublished platform records, and only the deal analyst may hold
licensed source material. No agent may hold personal data or verification evidence, agreement
or not.

`answerPermitted` applies Law 3 at the point of answer rather than in the prompt. A figure the
model composed from two it was given is a new figure: the midpoint of a band it was handed is
not in the band it was handed, and the test says so.

Every agent's mode is `deterministic` today, because `AI_AGREEMENT_IN_FORCE` is false, and the
mode is a function of the agreement and of nothing else.

### The synthetic bilingual evaluation gold set

`src/lib/eval/gold.ts`. Twenty-two cases across three profiles in two languages: twelve
classification, six short prose, four bilingual translation. Registered in `SYNTHETIC_SETS`
under `adv3-eval-gold`, which is what permits a row to reach an external model while the
agreement gate is closed, and which is exactly the permission Codex granted in item 1.

The registration is the claim and the file is the evidence for it. Every district is invented
(Northgate Quarter, Lantern Row, Sail Point), every company is invented (Northwind Logistics,
Harborlight Clinics), and every figure is invented and deliberately implausible as a market
number so that a figure escaping this file into a page would be recognisable as this file's
rather than mistaken for a rate. No listing, requirement, advisor message, document or database
row is copied, paraphrased or sampled. Changing the names on real rows would not have satisfied
this: a district that exists and a rent that was quoted are still real content after a find and
replace.

A case states the properties a correct answer has, never an exact expected string. Pinning one
correct phrasing would score fluency against the author's taste and quietly stop measuring the
things that are not arguable.

**The unstated field rule.** For a classification case, a field the expectation does not
mention must come back null or empty. Checking only the stated fields would pass a parser that
invents a city out of a query that never named one, which is precisely the failure discovery
exists to prevent. `QueryExpect` carries an `ignored` field for the same reason: a disclosed
figure is a real output and silence about it should be a requirement rather than a tolerance.

### The graders

`src/lib/eval/grade.ts`. A grader answers one question per case and has no opinion about
whether an answer is well written. Law checks are universal and run on every text answer
regardless of what the case asked for, because a model is not a special author: an em dash
breaks the dash law, an Arabic-Indic digit breaks Law 7, a ten-digit licence number that is not
FAL 1200025510 breaks the licence law, and an answer in the wrong script is a failure even when
its content is right.

`unvouchedFigures` is reused from the agent layer rather than reimplemented, so an evaluation
pass and a runtime refusal cannot disagree about what counts as a figure. The translation
grader's figure rule is deliberately different: the allowed figures are exactly the figures in
the input, so a rendering that gained a number has invented one and a rendering that dropped
them all does not pass an emptied allow list.

A translation case is graded in the language it is going into, not the language it came from.
Getting that backwards would fail every translation row on the script check and report it as a
language defect, which is how an evaluation harness gets switched off.

### The harness

`src/lib/eval/run.ts`, plus `npm run eval`.

It runs a *subject*, not a model. Every candidate in `src/lib/ai/router.ts` is `unevaluated`
and will stay that way until the owner records the AI agreement, so a harness that could only
run against a provider would produce no evidence today and would first be exercised on the day
it was most needed. The deterministic parser is a subject; a provider chain is a subject; they
are graded by the same graders against the same rows.

**Three outcomes, not two.** `unavailable` is first class and is never folded into pass or
fail. Counting it as a failure makes the deterministic baseline look broken; counting it as a
pass makes an unconfigured provider look perfect. Every unavailable result carries a written
reason, and a report is `clean` when nothing failed, which an all-unavailable run also is, so
both numbers have to be read.

**What `unavailable` means today, precisely.** Because the gold set is registered, its rows
classify `synthetic_sample` and the boundary permits them out. A model run therefore does not
stop at the boundary. It reaches provider selection and stops there, because no provider key is
configured, and it says so:

```
subject model (model) over set adv3-eval-gold
0 pass, 0 fail, 10 unavailable
  p-en-01 [short_prose/en] unavailable: the gateway returned nothing, which today means
    no provider is configured; it is not a boundary denial
```

Those are different facts about the system, and a report that confused them would tell the
owner the gate is doing work it is not doing.

**Latency and cost.** The clock is injected, because a latency figure nobody can assert is a
latency figure that silently becomes wrong. Cost is measured as `requests`, `promptChars` and
`completionChars`, and deliberately not as tokens or money: `src/lib/ai/transport.ts` surfaces
no usage from either transport, so a token count here would be an estimate wearing the clothes
of a measurement, and a price would additionally need a rate card this repository cannot keep
current. The limitation is named rather than papered over.

**The cost firewall.** Three tests: the router imports nothing from the evaluation package; no
module anywhere outside `src/lib/eval/` imports the harness, so a provider run is always
deliberate; and the router still carries no price-shaped key. Cost may be reported to a person
and must never be an input to selection. Making the selection code structurally unable to see a
cost is the only version of that rule which survives a future edit.

## What the gold set found on its first run

This is the argument for having written it. It was built to be provably synthetic, and its
first pass against the shipped parser failed two rows for real reasons.

**q-en-03, candidate ordering.** `office for lease in Riyadh for the Northwind Logistics
expansion` resolved to a warehouse. `buildCandidates()` ended with a global longest-phrase-first
sort, so `logistics` at nine characters of warehouse vocabulary beat `office` at six. The asset
slot filled with the wrong value, `office` fell through into free text, and the search then
looked for the literal word "office" among warehouses. A word inside a company name beat the
word the person led with.

Fixed by `orderCandidates`: earliest match wins, and length still decides between two phrases
that start in the same place, which is the overlap case the length rule was written for and the
only case it was ever right about. "serviced office" and "serviced" both begin at zero;
"مكة المكرمة" and "مكة" both begin at zero. The sort is stable, so the incoming length order
survives inside each tie, and a phrase that is not present is sorted last rather than dropped,
because a cut can leave two previously separated words adjacent.

**q-en-05, ranges.** `medical 200 to 400 m2` read as a single target of 400 with 200 discarded
into `ignored`. `readNumerics` recognised a maximum, a minimum and an approximation, and did not
recognise a pair. Fixed by reading the joiner once, on the gap between two figures, so the
second figure is never also read alone: it is the second figure that carries the unit, which is
what turned the pair into a single value. The joiner is read every way it is written, including
"to", "and", both dashes, "الي" and "و".

Two deliberate conservatisms. A pair with no area unit and no currency around it is still two
undirected figures and both still land in `ignored`, because a range states its direction and
not its axis: "200 to 400" says which way each bound points and says nothing about metres or
riyals. And a descending pair is not a range, because nobody states a floor above a ceiling.

Both fixes carry regression tests in `src/lib/search/queryParse.test.ts`, which went from 22
tests to 30.

## A note on the ADV-3A.1 item-2 claim

The handback said a raw interpolated value is rejected by the type checker and at runtime.
Writing `run.ts` tested that claim without meaning to: three attempts to interpolate ordinary
fixed strings into an `instruction` template were rejected by `tsc` before any of them ran. The
branch-varying text is now built with `phrase`, which declares it as our own instruction text.
The claim holds, and the first new caller of the API was the thing that checked it.

## Gate

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npm test` | 1021 tests, 1021 pass, 0 fail (was 961) |
| `npm run ar-lint` | clean |
| `node scripts/prose-scan.mjs` | 0 hardcoded prose strings in 0 files, exit 0 |
| `npm run eval` | 12 pass, 0 fail, 10 unavailable |
| `npm run eval -- --subject=model` | 0 pass, 0 fail, 10 unavailable, no provider configured |
| Production build | Vercel `dpl_FuD9dCouWC4DgNw6GvxTVz5kJP5X` READY (`97d1c1e`) |

The local `npm run build` fails for an environmental reason only: `next/font` cannot reach
fonts.googleapis.com from this container, so Hanken Grotesk, IBM Plex Mono, IBM Plex Sans
Arabic and Source Serif 4 cannot be fetched at build time. The Vercel production build reaching
READY is the build-gate evidence.

Every new test file was added to the explicit list in the `test` script. That list is not a
glob, so a file not named there silently never runs, which is the failure mode that makes a
test suite quietly stop being one.

## Acceptance, item by item

| ADV-3B line | Where it is met |
| --- | --- |
| Typed SAT tools | `src/lib/agents/tool.ts`, `tools.ts` (`3e36d52`) |
| Six agent boundaries | `src/lib/agents/agents.ts` (`3e36d52`) |
| Deterministic calculation and permission layers | `src/lib/agents/permission.ts`, tool `run` functions (`3e36d52`) |
| Synthetic bilingual evaluation gold set | `src/lib/eval/gold.ts`, registered in `SYNTHETIC_SETS` |
| Model-quality, latency and cost evaluation | `src/lib/eval/grade.ts`, `run.ts`, `npm run eval` |
| No real private data sent to any provider | Gold set is invented throughout; `gold.test.ts` asserts the registration and the invented vocabulary; nothing outside `src/lib/eval/` imports the harness |
| No provider selected merely because it is inexpensive | Three firewall tests in `run.test.ts`; the candidate type still carries no price field |
| No autonomous consequential writes | Every tool declares `effect: "read"`; there is no write tool |

## Live evidence

Commits: `3e36d52` (tools, permission, agents) and `97d1c1e` (gold set, graders, harness,
the two parser fixes). Deployment `dpl_FuD9dCouWC4DgNw6GvxTVz5kJP5X`, READY, production.

Most of this package is server-side library code with no rendered surface, so there is nothing
to look at for the tools, the permission layer or the agent boundaries beyond their tests. The
two parser fixes are different: they sit directly under `/listings`, and they are what the gold
set found, so they are the thing worth exercising on the deployed build rather than only in a
test runner.

**Candidate ordering, EN.** `/en/listings?q=office for lease in Riyadh for the Northwind
Logistics expansion` renders the chips Office, Lease, Riyadh and `Text: northwind logistics
expansion`. Before the fix the asset chip read Warehouse, because "logistics" inside a company
name outranked the word the person led with. The result count is zero, which is correct and not
a defect: the free terms are conjunctive and no sample listing is titled for an invented
company, so the honest answer to that query is that nothing matches.

**Candidate ordering, AR.** `/ar/listings?q=مكتب للإيجار في الرياض للتوسعة اللوجستية` renders
مكاتب, إيجار, الرياض and `نص: للتوسعه اللوجستيه`. The warehouse synonym لوجستي did not take the
asset slot. The Arabic path was fixed by the same ordering function rather than by a second
rule, which is why it behaves identically.

**Ranges, EN.** `/en/listings?q=office 200 to 400 m2 in Riyadh` renders Office, Riyadh,
`From 200 m²` and `Up to 400 m²`, and returns four spaces at 320, 400 and 250 m². Before the
fix this read as a single target of 400 with 200 disclosed in `ignored`.

**Ranges, AR.** `/ar/listings?q=مكتب من 200 إلى 400 م2 في الرياض` renders مكاتب, الرياض,
`من 200 م²` and `حتى 400 م²`, four مساحات, the same three areas. The standard spelling إلى
reaches the joiner through `foldText`, which folds إ to ا and ى to ي, so the joiner list does
not have to carry every orthography separately.

Arabic renders as readable script in the DOM and in the screenshots, in true RTL, with Western
numerals in both locales, which is the evidence form Codex item 5 asked for.

## Blockers, unchanged and owner-side

The enterprise AI agreement remains the binding constraint and is still `unknown` in
`docs/regulatory-register.md` Part D. Until the owner records the provider agreement, the
processing terms, the cross-border basis and the user disclosure or consent position,
`AI_AGREEMENT_IN_FORCE` stays false, every agent stays deterministic, and the model subject
reports unavailable.

Model evaluation cannot produce a score until a provider key exists. The harness is what
converts that from a missing capability into a one-command answer on the day it does.

`.github/workflows/arabic-font.yml` remains an owner-side install; the deploy credential
carries no workflow scope and none may be requested.

Row-level security is disabled on `public.spatial_ref_sys` and `public.map_anchors`, reported
critical by the Supabase advisor, and is not being applied here: enabling it without policies
blocks all access, so it is an owner decision with a rollback plan.

## Next

**Corrected after `1cb0bd5`.** This section named owner ruling 3 and owner ruling 5 as the next
package. Both were closed packages earlier, ruling 3 and ruling 4 in `41f4f8f`, `726b72b`,
`0d07cb8`, `b94b6b4`, `f6368c4` and `11c9518`, and ruling 5 in `b3e2dfa` during PKG-2A, all
recorded in `docs/ruling-3-4-closure.md`. The error is corrected in place rather than deleted,
because a closure record whose Next line was wrong is itself a fact about how the programme was
being tracked.

What was outstanding is the residual recorded at `docs/ruling-3-4-closure.md` lines 316 to 321,
a claims-only strict mode over the tier `scripts/prose-scan.mjs` reports but does not enforce.
It was measured before it was claimed as scope, and it was real. Closed in
`docs/ruling-3-residual-closure.md`.

After that, ADV-4, evidence half only under owner ruling 1. The indexing half stays held on O11.
