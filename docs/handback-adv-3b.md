# ADV-3B handback

Codex, this is one consolidated handback for ADV-3B. It was entered directly from ADV-3A.1
without waiting for approval, as instructed. Nothing in it needed an owner, contract or
regulatory decision, so nothing paused.

Full record: `docs/adv-3b-closure.md`. Roadmap marker: `docs/roadmap.md`, ADV-3 section.

## Scope, as you set it

Typed SAT tools. Six agent boundaries. Deterministic calculation and permission layers.
Synthetic bilingual evaluation gold set. Model-quality, latency and cost evaluation. No real
private data to any provider. No provider selected merely because it is inexpensive. No
autonomous consequential writes.

All eight are met. Where a claim is narrower than it might sound, it is written narrowly below
rather than left to be read generously.

## Commits

| Commit | What |
| --- | --- |
| `3e36d52` | Typed SAT tools, the permission layer, the six agent boundaries |
| `97d1c1e` | The synthetic gold set, the graders, the harness, `npm run eval`, and the two parser defects the gold set found |

Deployment `dpl_FuD9dCouWC4DgNw6GvxTVz5kJP5X`, production, READY.

## What is in it

**Typed SAT tools.** A tool declares a name, an effect, the capability required to call it, a
bilingual summary, a parser and a run function. The parser is a written function rather than a
schema object on purpose: a generated schema error names the field, its type and usually its
enumeration, and that is a disclosure to a caller who was not permitted to know the tool
exists. Every tool result carries its own classified parts, so what a tool returned is
classified by the tool and cannot lose its provenance in transit.

**The permission layer.** A grant table keyed on role, where an unknown role falls back to the
signed-out grants rather than to everything. Three faults are closed and each has a test: a
capability over the actor's own records requires an actual party id, so a role alone never
opens somebody's records; a tool the caller may not use is never named in the list a model is
offered, because naming a tool as unavailable discloses what naming it would have; and the
permission check runs before the parser, so a refused caller never learns the schema. Both
refusal reasons return the same sentence. Nothing in the layer reads a role out of an argument.

**The six agent boundaries.** Discovery, listing copilot, opportunity matching, evidence
auditor, deal analyst, operations. Each declares a purpose and a no-model behaviour in both
languages, a bounded tool list, a maximum capability, a call ceiling per turn so a loop cannot
become a spend, a permitted data-class list narrower than the global boundary, and a figure
policy of either `none` or `tool_vouched`. The narrower gate is the point: the global boundary
would permit verification evidence to an external model once the agreement exists, and the
discovery agent may still never hold a deed. No agent may hold personal data or verification
evidence, agreement or not. `answerPermitted` applies Law 3 at the point of answer rather than
in the prompt, and treats a figure composed from two it was given as a new figure, because the
midpoint of a band is not in the band. Every agent's mode is deterministic today, and the mode
is a function of `AI_AGREEMENT_IN_FORCE` and of nothing else.

**The gold set.** 22 cases, three profiles, two languages, registered in `SYNTHETIC_SETS` as
`adv3-eval-gold`, which is exactly the permission you granted in item 1 and the only content
that may reach a provider while the gate is closed. Every district is invented, every company
is invented, every figure is invented and deliberately implausible as a market number so that
one escaping into a page would be recognisable as this file's rather than mistaken for a rate.
No listing, requirement, advisor message, document or database row is copied, paraphrased or
sampled. Renaming real rows would not have satisfied this: a district that exists and a rent
that was quoted are still real content after a find and replace.

A case states the properties a correct answer has, never an exact expected string. For a
classification case, a field the expectation does not mention must come back empty, because
checking only the stated fields would pass a parser that invents a city out of a query that
never named one.

**The graders.** Law checks are universal and run on every text answer regardless of what the
case asked for: the dash law, Law 7, a ten-digit licence that is not FAL 1200025510, and an
answer in the wrong script. `unvouchedFigures` is reused from the agent layer rather than
reimplemented, so an evaluation pass and a runtime refusal cannot disagree about what counts as
a figure. A translation is graded in the language it is going into.

**The harness.** `npm run eval`. It runs a subject, not a model, so the deterministic parser is
measured today rather than the harness first being exercised on the day a provider arrives.
`unavailable` is a first-class third outcome and is never folded into pass or fail; counting it
as a failure makes the baseline look broken and counting it as a pass makes an unconfigured
provider look perfect. Every unavailable row carries a written reason.

## Three things stated narrowly

**What `unavailable` means today.** Because the gold set is registered, its rows classify
`synthetic_sample` and the boundary permits them out. A model run therefore does not stop at
the boundary. It reaches provider selection and stops there, because no provider key is
configured, and the report says so in those words. Those are different facts and a report that
confused them would tell the owner the gate is doing work it is not doing.

**Cost is not money.** It is measured as requests, prompt characters and completion characters.
`src/lib/ai/transport.ts` surfaces no token usage from either transport, so a token count here
would be an estimate wearing the clothes of a measurement, and a price would additionally need
a rate card this repository cannot keep current. The limitation is named rather than papered
over.

**The cost firewall is structural, not documentary.** Three tests: the router imports nothing
from the evaluation package; no module anywhere outside `src/lib/eval/` imports the harness, so
a provider run is always deliberate; and the router still carries no price-shaped key. Cost may
be reported to a person and must never be an input to selection, and the only version of that
rule which survives a future edit is one where the selection code cannot see a cost at all.

## What the gold set found on its first run

This is the argument for having written it rather than assumed the parser was fine. Its first
pass against the shipped parser failed two rows for real reasons.

**Candidate ordering.** `office for lease in Riyadh for the Northwind Logistics expansion`
resolved to a warehouse. `buildCandidates()` ended with a global longest-phrase-first sort, so
`logistics` at nine characters of warehouse vocabulary beat `office` at six. The asset slot
filled with the wrong value, `office` fell through into free text, and the search then looked
for the literal word "office" among warehouses. A word inside a company name beat the word the
person led with. Fixed by `orderCandidates`: earliest match wins, with length still deciding
between two phrases that start in the same place, which is the overlap case the length rule was
ever right about. The sort is stable, and a phrase that is not present is sorted last rather
than dropped, because a cut can leave two previously separated words adjacent.

**Ranges.** `medical 200 to 400 m2` read as a single target of 400 with 200 discarded into
`ignored`. `readNumerics` recognised a maximum, a minimum and an approximation, and not a pair.
Fixed by reading the joiner once, on the gap between two figures, so the second figure is never
also read alone; it is the second figure that carries the unit, which is what turned the pair
into a single value. Two deliberate conservatisms kept: a pair with no area unit and no
currency around it is still two undirected figures and both still land in `ignored`, because a
range states its direction and not its axis; and a descending pair is not a range.

Both carry regression tests. `queryParse.test.ts` went from 22 to 30.

## Your item-2 claim, checked by accident

The ADV-3A.1 handback said a raw interpolated value is rejected by the type checker and at
runtime. Writing `run.ts` tested that without meaning to: three attempts to interpolate
ordinary fixed strings into an `instruction` template were rejected by `tsc` before any of them
ran. The branch-varying text is now built with `phrase`, which declares it as our own
instruction text. The claim holds, and the first new caller of the API was the thing that
checked it.

## Gate

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npm test` | 1021 pass, 0 fail (was 961) |
| `npm run ar-lint` | clean |
| `node scripts/prose-scan.mjs` | 0 hardcoded prose strings in 0 files, exit 0 |
| `npm run eval` | 12 pass, 0 fail, 10 unavailable |
| `npm run eval -- --subject=model` | 0 pass, 0 fail, 10 unavailable, no provider configured |
| Production build | `dpl_FuD9dCouWC4DgNw6GvxTVz5kJP5X` READY |

The local `npm run build` fails for an environmental reason only: `next/font` cannot reach
fonts.googleapis.com from this container. The Vercel production build reaching READY is the
build-gate evidence, as it has been for every package in this programme.

Every new test file was added to the explicit list in the `test` script. That list is not a
glob, so a file not named there silently never runs.

## Live evidence

Most of this package has no rendered surface. The two parser fixes do, and they are what the
gold set found, so they were exercised on the deployed build in both languages.

`/en/listings?q=office for lease in Riyadh for the Northwind Logistics expansion` renders
Office, Lease, Riyadh and `Text: northwind logistics expansion`. Zero results, which is correct
rather than a defect: free terms are conjunctive and no sample listing is titled for an
invented company.

`/ar/listings?q=مكتب للإيجار في الرياض للتوسعة اللوجستية` renders مكاتب, إيجار, الرياض and
`نص: للتوسعه اللوجستيه`. The warehouse synonym لوجستي did not take the asset slot.

`/en/listings?q=office 200 to 400 m2 in Riyadh` renders Office, Riyadh, `From 200 m²`,
`Up to 400 m²`, four spaces at 320, 400 and 250 m².

`/ar/listings?q=مكتب من 200 إلى 400 م2 في الرياض` renders مكاتب, الرياض, `من 200 م²`,
`حتى 400 م²`, four مساحات, the same three areas. The standard spelling إلى reaches the joiner
through `foldText`, so the joiner list does not carry every orthography separately.

Arabic renders as readable script in true RTL with Western numerals in both locales.

## Blockers

All owner-side and all unchanged.

The enterprise AI agreement is still `unknown` in `docs/regulatory-register.md` Part D and
remains the binding constraint on ADV-3. Until the owner records the provider agreement, the
processing terms, the cross-border basis and the user disclosure or consent position,
`AI_AGREEMENT_IN_FORCE` stays false, every agent stays deterministic, and the model subject
reports unavailable. Model evaluation cannot produce a score until a provider key exists; the
harness is what converts that from a missing capability into a one-command answer on the day it
does.

`.github/workflows/arabic-font.yml` remains an owner-side install. The deploy credential
carries no workflow scope and none may be requested.

Row-level security is disabled on `public.spatial_ref_sys` and `public.map_anchors`, reported
critical by the Supabase advisor. It is not applied here because enabling it without policies
blocks all access, so it is an owner decision with a rollback plan.

Import-boundary lint enforcement of the transport rule stays a package of its own. There is no
ESLint configuration in this repository at all, so the honest cost is adopting and tuning a
linter across the whole tree rather than adding one rule. The closure wording stays the narrower
claim in the meantime, and the three source-tree tests are what actually check it.

One small item found while writing this: `docs/roadmap.md` carries 22 em dashes in its oldest
top section, predating the dash law. `src` is clean and the lint gate covers `src` only. Not
swept here, because a doc-wide punctuation sweep in a package about evaluation would be the
kind of unrelated churn the operating rules discourage. Recorded so it is a decision rather
than an oversight.

## Next

Owner ruling 3: audit and correct the remaining over-broad claims across the platform,
prioritising `/invest`, then public discovery, listing, lister, requirement, research and
advisory surfaces, with each claim determined from record-level evidence rather than inferred
from route type or generic wording. Owner ruling 5, the `/listings?city=riyadh` raw-slug
display defect in both languages, is small and belongs in the same package.

Continuing into it without waiting, per the directive.
