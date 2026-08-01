# ADV-1E and finding 91: consolidated handback

Codex's ten-item corrective package, executed. This is the single handback item 10 asks
for. It covers what was built, what was proved, what was proved only partially and why,
and what the package deliberately did not close.

Commits: `fd5aebc` (items 1, 2, 3, 4, 6 and 8) and `b2fc4b8` (finding 91, raised by item 7's
own live run). Deployment `dpl_2M4xJtfW4ZxPrWAzezkjZKqoVh5k`, production, READY.

## The one-sentence version

There is now exactly one function in the codebase that decides whether a market figure may
be shown in public, and the source name is part of that decision rather than a string each
caller writes for itself.

## Item by item

**Item 1, separate statistical, publication and environment meanings.** `src/lib/publicQuote.ts`
holds `decidePublicQuote`, which returns one of four kinds: `authorized_public`,
`labelled_sample`, `withheld`, `unavailable`. It reads data class, demo status, source
rights, permitted display, environment and stop condition, in that order, and it is the only
place any of those six inputs are weighed against each other. Server rendering, the segments
API, Advisor prose, the Evidence Passport, metadata and machine-readable output all reach it
through `publicEvidenceView` or `rentIndexQuoteGate`, so none of them can arrive at a
different answer from the others.

The four kinds are not four synonyms for hidden. `withheld` means a real figure exists and
SAT may not publish it, and it says so. `unavailable` means no figure is held and nothing was
estimated in its place. Collapsing those two would have been the easy implementation and it
would have taught a reader that SAT has no data when the truth is that SAT has data it may
not quote.

**Item 2, fail closed on unauthorized figures.** `show = decision.allowed && quote.mayShowFigure`
in `evidenceView.ts`. Two independent decisions must both permit a figure, and the figure is
absent from the payload rather than hidden in it. The proof is in the deployed response
quoted below: the numbers that are not authorized are not in the JSON at all, so no CSS rule,
missing passport, `noindex` header or preview banner is load-bearing.

**Item 3, handle synthetic data honestly.** `SAMPLE_STATEMENT` carries "Sample data for
product testing. Not a published market figure." and the Arabic
"بيانات تجريبية لاختبار المنتج، وليست رقماً سوقياً منشوراً.", which passes `ar-lint` and the
content gates. It travels with the figure into Advisor prose rather than sitting in a page
banner, because a banner is a claim about a page and this is a claim about a number.

**Item 4, prevent source laundering.** "SAT Markets own record" is written in one module and
set on one first-party branch. `mayNameSatOwnRecord` is never inferred from a missing source
block. The specific laundering default that existed before this package,
`source: row.source || "REGA Rental Index (Ejar)"` in `valueEvidence.ts`, is deleted.

**Item 5, correct finding 90, and the finding 91 it uncovered.** Finding 90 closed in
`fd5aebc`. Item 7's live run then found finding 91, which is the same class of defect one
level down: the figure decision was canonical but the source NAME was not, so on `fd5aebc`
the deployed Advisor could print "Source: REGA Rental Index (Ejar), average of registered
rental contracts." directly above a passport reading "Source: Sample data for product
testing." with `source: null`. Prose and passport disagreed about the same number in the same
response.

The fix was subtractive. Source naming was removed from `analyser.ts`, `valueEvidence.ts` and
`segments.ts` rather than parameterised, because a composer that can name a source is a
composer that will eventually name the wrong one. `rentIndexQuoteGate` now returns
`sourceText` and `proseSource`, `advisorQuoteMessage` appends the single clause the gate
authorized, and `toPublicSegment` takes the source text as a required second argument so the
compiler visited every call site rather than trusting a sweep.

A second hole surfaced while fixing the first. The gate consulted `decidePublicQuote` but not
`publishability`, so a figure could clear the quote decision and still be dropped by the
evidence view, leaving a passport with no figure. `mayShowFigure` is now
`leadAllows && lead.value !== null` and that case degrades to `withheld`, not `unavailable`.

**Item 6, clarify O10.** `src/lib/sources/o10.ts` records O10 as ten executable clauses:
source access, public display, attribution wording, SAT transformations and derived figures,
aggregation and minimum samples, export, API and machine-readable output, AI retrieval and
response use, retention and correction, and Arabic and English publication. Each quotes the
regulatory register verbatim so the document and the module fail together, and each is
answered by a recorded string rather than a tick. `O10_RECORDS` is empty under owner ruling 7,
which is the truthful state, and the production decision therefore fails closed. `assessO10().reasons`
carries the same in-code constraint as `sourceRights.denialReason`: it quotes internal licence
reasoning and callers must not render it to the public.

**Item 7, resolve the live-evidence limitation.** Partially met. See the next section.

**Item 8, regression gates.** `src/lib/adv1e.test.ts`, thirty tests, one per named property,
plus nine in `src/lib/sources/o10.test.ts` and eight in `src/lib/finding91.test.ts`. They
prove the properties rather than restate them: `published` and `sufficient` cannot override
withheld rights; `noindex` is not display authorization and the response header is not read as
one; synthetic figures always carry sample status; unauthorized figures never reach an API or
rendered payload; prose and passport use one decision; no source is relabelled as SAT because
public rights are missing; English and Arabic expose identical figures and evidence states;
and enabling indexing cannot expose synthetic, unknown or withheld data.

## Gates

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | 0 |
| `npm test` | 1350 tests, 1350 pass, 0 fail |
| `npm run ar-lint` | clean |
| `node scripts/prose-scan.mjs` | 0 |
| Production build | Vercel `dpl_2M4xJtfW4ZxPrWAzezkjZKqoVh5k` READY |

## Live deployed evidence

`GET https://satmarkets-sat-markets.vercel.app/api/index/segments` at `b2fc4b8`, HTTP 200,
`x-robots-tag: noindex`, `x-vercel-cache: MISS`. All seven rows now read:

```
"source":"Sample data for product testing. Not a published market figure.",
"quote":"labelled_sample",
"statement":"Sample data for product testing. Not a published market figure.",
"proseSource":null
```

with `"notes":["Sample data for product testing. Not a published market figure."]` and
`"withheld":0`. There is no occurrence of "REGA" or "Ejar" anywhere in the payload. Before
`b2fc4b8` this same route shipped `"source":"REGA Rental Index (Ejar)"` for these same
synthetic rows. That is primary deployed evidence for items 1, 2, 3 and 4 and for the payload
half of finding 91.

Also verified live, at `fd5aebc`: the English value path, the English no-data path, the
English Evidence Passport, and `/sources` in both English and Arabic.

## Item 7: implemented, awaiting live verification

Item 7 requires one genuine end to end Advisor request in English and Arabic through an
interactive browser. That is not met, and item 7's own clause applies: the package is
"implemented, awaiting live verification", not fully closed.

Both possible channels are unavailable from this build environment, for reasons that are
environmental rather than a shortcut taken:

The Chrome extension is not connected, so no interactive browser is reachable.

The sandbox routes all egress through `http://127.0.0.1:39529`, whose allowlist covers
localhost and package registries only. `curl https://satmarkets-sat-markets.vercel.app/...`
returns `curl: (56) CONNECT tunnel failed, response 403`, and Playwright inside the container
fails with `net::ERR_TUNNEL_CONNECTION_FAILED`. The obvious fallback of running the
application locally and driving that instead does not work either:
`curl https://ltqgwpivmumfwqdxwwgo.supabase.co/rest/v1/` returns the same 403, so a local
server would fail closed on every data read and could only demonstrate the "unavailable"
branch, which is the one branch that proves nothing.

`/api/advisor` is POST only, so the read-only Vercel URL fetch that produced the segments
evidence above cannot substitute.

`/tmp/probe/adv-live.mjs` is written and ready. It runs three passes at a 390 by 844
viewport, English, Arabic, and English with the first `/api/advisor` call aborted to exercise
retry and failure behaviour, and it captures the rendered text, the full page source, every
button label and every `/api/advisor` response body. It needs an interactive browser or an
unblocked egress path and nothing else.

What remains unproven by live browser evidence, specifically: the Advisor's rendered English
and Arabic prose beside its passport, the retry and failure behaviour, and the page-source
check for an unauthorized figure. What is proven by deployed evidence: the server decision
itself, through the segments API, which is the same `decidePublicQuote` call the Advisor
makes.

## What this package does not close

The rights input is still missing and no amount of correct machinery substitutes for it. The
Rent Index publishes no REGA figure today and will not until O10 is resolved externally.
Strategic ADV-1 and the Evidence Passport product outcome remain open on that dependency,
exactly as Codex ruled: a functioning passport displaying synthetic or unavailable evidence is
not the evidence-backed product outcome.

One dormant remnant is recorded rather than swept: `makeRentBandTool` in
`src/lib/agents/tools.ts` still appends the attribution to a band sentence with no gate. It is
referenced only from `agents.test.ts` and `tools.test.ts` and reaches no route, so it ships
nothing today, but it is the shape of the defect finding 91 described and it is on the list
for whichever package activates the agent tools.
