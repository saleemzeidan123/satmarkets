# ADV-3A.1 closure: the boundary holds before the network, and the record says only what the code enforces

Commits, in order:

| Commit | What it did |
| --- | --- |
| `f984201` | Items 1 to 4. The pre-agreement boundary, the tagged-template instruction API, typed history provenance, the widened structural scan. |
| `0600934` | Item 6. The case-aware Arabic counted-noun formatter across eight modules, and an honest probe for finding 53. |
| `1981317` | Item 5, first defect set. A typed city stops collapsing into an arbitrary district; Arabic city queries filter; the search note owns its own sentence per language. |
| `259792d` | Item 5, second defect set. The advisor's own suggestions reach the path their words promise; a ceiling is a constraint, not an offered rent; a bracketed placeholder is never read as a district. |
| `2040a50` | Owner ruling 2. One canonical Rent Index attribution, guarded by a source-tree scan. |
| `411f205` | The same guard extended over the shipped dictionaries. |
| `7a3c995` | The advisor counts the rows it renders; a listing with no title in the reader's language is described rather than coded. |

Preceding HEAD: `e657053`. Codex accepted the gateway architecture and it is unchanged. What
follows is what the six corrective items asked for and what each one actually cost.

## Item 1: the regulatory contradiction

`docs/regulatory-register.md` Part D says that, before an enterprise AI agreement exists,
external models may receive only public information, deliberately constructed samples or
strongly redacted material. The shipped boundary nevertheless permitted `user_own_words`
unconditionally, and Codex is right that a person typing text does not establish that the
text contains no personal, third-party, confidential or commercially sensitive information. A
search box is where somebody types their company name, their expansion plan and their budget.

While `AI_AGREEMENT_IN_FORCE` is false the boundary now permits `own_instruction`,
`public_published`, constructed synthetic samples and approved redacted material, and nothing
else. `user_own_words`, requirements, conversation history and draft listing copy are denied
before a socket is opened.

The three paths behave as Codex specified. Search uses its deterministic parser. The advisor
uses its deterministic fallback. Translation returns a controlled agreement-required state
and does not write a success state it did not earn: the caller does not set
`ar_translation_status = 'machine'` on a translation that never happened.

`src/lib/ai/preAgreement.test.ts` is the proof, and the shape of the test matters more than
the count. It installs a throwing `fetch` **with provider keys configured**, so a path that
stops cannot be mistaken for a path that had nothing to call. A test that proved only "no key,
no call" would have proved nothing about the boundary.

The evaluation harness exception Codex granted is recorded rather than used: the synthetic
gold set `adv3-eval-gold` is registered in `SYNTHETIC_SETS`, and no provider has been called
with it, because calling one needs a key that this session must not request and item 1
forbids activating external processing before the owner records the agreement, the processing
terms, the cross-border basis and the disclosure or consent position. That is an owner
blocker, recorded as one, not worked around.

## Item 2: instruction-value laundering

The old `instruction(label, text)` took an already composed string, so
`instruction("x", dynamicTextContainingPrivateData)` type-checked and the gateway saw one
part classified `own_instruction`. The check was on the argument, not on the interpolation.

It is now a tagged template:

```ts
instruction("label")`fixed text ${classifiedSlot(...)}`
```

Every interpolation is observed structurally. A raw interpolated value throws rather than
passing. `ClassifiedMessage` and `ClassifiedSlot` carry module-private symbol brands, so an
object literal in ordinary application code cannot impersonate a classified message.

`docs/adv-3a-closure.md` carries the correction under the paragraph that made the original
claim, and the original paragraph was left standing, because what a record claimed on the day
it was written is the point of keeping it.

## Item 3: conversation-history provenance

`priorTurn()` classified assistant turns as `user_own_words`, which they are not, and
`/api/advisor` included prior assistant text in `allowedSrc`, so a figure produced by an
earlier assistant reply could become an allowed source for the next one. That is a laundering
path for numbers, and Law 3 exists precisely to stop a model-shaped figure becoming a market
statistic.

`src/lib/advisor/history.ts` now types the provenance. Assistant turns are dropped from the
external-model context and from `allowedSrc`. The regression test shows a number present only
in a previous assistant message stays unsupported, and pins the old shape alongside it so the
fault cannot return quietly. The window counts person turns rather than raw transcript turns,
because counting transcript turns silently halved the history when the assistant answers were
removed.

The conversation-envelope model that would preserve classifications and sources per assistant
turn is recorded in `docs/roadmap.md`, not built here.

## Item 4: the structural test and the claim

The scan looked for three provider-request needles. A new file could have reached a provider
through a vendor SDK, a `/responses` or `/messages` endpoint, a hostname, a differently named
authorization header, or a generic fetch to a configured URL, and passed.

The scan now covers endpoints (`/responses`, `/messages`, `/chat/completions`), provider
hostnames, SDK package names, provider authorization headers and model-related environment-key
reads. It is still a source scan. A hostname assembled from fragments would evade it, exactly
as the test assembles its own needles to avoid matching itself.

So the claim was narrowed to the true one, in both this record and `docs/adv-3a-closure.md`:
**all currently known and registered provider integrations are centralized in `transport.ts`
and guarded.** Import-boundary or lint enforcement is a roadmap item, not a claim. There is no
ESLint configuration in this repository, so adding one is a package of its own rather than a
line in this one.

## Item 5: the live evidence that was missing

See "Live evidence" below. It is the longest section because it is the one that found things.

## Item 6: the Arabic counted noun

Finding 52 is closed with a tested formatter, not with patched sentences. Arabic agreement
depends on the count: 1 and 2 take their own forms, 3 to 10 takes the plural genitive, 11 to
99 takes the singular accusative, and 100 returns to the singular. The formatter existed and
was tested against `Intl.PluralRules`; the defect was that eight modules did not use it.

One real gap in the formatter had to be closed first. CLDR gives Arabic a single `two` form,
but Arabic marks the dual for case, and every one of these phrases sits after a preposition
(`قبل`, `عند`, `خلال`) or under a governing noun (`مدة`, `البالغة`), where the oblique dual is
correct and visibly different: `قبل يومين`, never `قبل يومان`. `PluralForms` gained an optional
`twoOblique` and `CountOptions` an `oblique` flag. A table-wide invariant test fails if a
counted noun is added later without its oblique dual.

`formatCount` also stopped rounding. It used `formatInteger`, so routing 1.5 months through it
would have printed 2 months, which is a display layer altering a figure.

The boundaries Codex named are asserted at 1, 2, 3, 10, 11, 99 and 100, against the **rendered
sentence** rather than the formatter, in `format.test.ts`, `decisionPack.test.ts`,
`listedSince.test.ts`, `matching.test.ts`, `listingQuality.test.ts`,
`attributeDisplay.test.ts`, `market/underwrite.test.ts` and `search/searchNote.test.ts`.

Finding 53 remains a documented probe limitation on the condition Codex set, and the condition
was verified rather than assumed: `scripts/responsive-probe.mjs:704` fails a run on
`rowOverflow > 0 && !rail` or `widest > innerW`, both element-level. The `docOverflow` term is
retained only as a backstop should `overflow-x: clip` ever be removed. Two overclaims in the
probe's own output were corrected at the same time, because the script was announcing a
document-level result that its own CSS makes unmeasurable.

## Live evidence

Everything below was exercised in a browser holding the deployment-protection cookie, against
production deployments of the named commits. The container's own egress allowlist answers
`x-deny-reason: host_not_allowed` before a request leaves, which is why `scripts/smoke.mjs`
cannot run from here and why the earlier record misattributed the 403 to Vercel.

### What was exercised

`/en/advisor` and `/ar/advisor`, both in search mode, so both `POST /api/advisor` and
`POST /api/search` were exercised for real. `/en` and `/ar` home. `/en/listings` and
`/ar/listings`, including `?city=riyadh` for owner ruling 5.

### What the network trace shows, and what it does not

The trace on the Arabic advisor turn shows exactly `POST /api/advisor 200` and
`POST /api/search 200`, same origin only, with no third-party request of any kind.

Stated plainly, because this is the kind of sentence that gets over-read later: a browser
cannot see server-to-provider egress. This trace proves the client made no external call and
that the rendered answers are the deterministic fallback. It is **not** proof that the
function made no provider call. The proof for that is `preAgreement.test.ts`, which is a unit
test with a throwing fetch and provider keys present, and it is being recorded as a unit test
rather than described as equivalent to a live network observation.

### Arabic renders readably

The mojibake in the ADV-3A handback was a transport artefact of the capture, not the page.
Readable Arabic DOM text was captured this time. `/ar/advisor` on `411f205` returned
`7 مطابقات موثّقة.` with the full attribution `المؤشر الإيجاري للهيئة العامة للعقار (إيجار)`
beneath it. Western numerals throughout, per Law 7. That single turn closes findings 52, 56,
57 and 61 in Arabic with live evidence.

### What the live exercise found

Seven defects that the unit tests had not, which is the whole argument for the item.

**Findings 55, 56 and 57**, fixed in `1981317`. Asked "warehouse for lease in Riyadh", the
deployed advisor answered that some results were outside KAFD. Nobody typed KAFD. The district
matcher tested the raw query against the districts table's `city` column and `.find` returned
the first row satisfying it, so every English Riyadh query collapsed into whichever Riyadh
district sorted first, and the relaxation note then named it. The Arabic half failed the
opposite way: `الرياض` matches no district's Arabic name and contains no Latin text, so no
place filter was applied at all and a Riyadh query returned a Dammam listing. One fault, two
faces: invent a constraint the person did not give, or drop the one they did.

**Findings 58, 59 and 60**, fixed in `259792d`. The advisor's own suggestion chips did not
reach the path their words promised; a ceiling typed into a query was read as an offered rent
rather than a search constraint; a bracketed placeholder in a suggestion was parsed as a
district name.

**Finding 61**, fixed in `2040a50` and `411f205`. Owner ruling 2 requires the REGA Rental
Index (Ejar) attribution on every Rent Index reference. English carried it everywhere. Arabic
carried it nowhere a sentence was composed at runtime, and disobeyed differently in each place:
five spellings of one source across `valueEvidence`, the advisor route, the analyser, `/ops`
and `/proto`, none of them naming the General Real Estate Authority, all facing a single fixed
English form that does. The rule was already tested, but both tests read shipped dictionary
strings while all five offenders were composed in TypeScript at request time. The gate held
exactly where it was easy to hold. `src/lib/market/attribution.ts` is now the one place the
source is named, and a source-tree scan fails the build if a sixth spelling appears.

**Finding 65**, fixed in `7a3c995`. The note above the results read "7 verified matches" and
"7 مطابقات موثّقة" above four visible rows. `useAdvisorChat` stored everything the route
returned and passed that length to the sentence; the advisor page sliced to four and the
widget to three. Three places each held a different idea of how many results there were, and
the one that spoke aloud held the wrong one. The hook now truncates once, so the array, the
sentence and the screen cannot disagree, and the rows that are withheld are declared rather
than dropped: "These are the closest 4 results of 7." / "هذه أقرب 4 نتائج من أصل 7."
English drops the numeral at one, because "These are the closest 1 result of 7" is not a
sentence anyone writes.

**Finding 66**, fixed in `7a3c995`. On one row of one search, the English reader saw
"Grade A floor, Al Olaya" and the Arabic reader saw `SATM-A0DC83D0`. A reference code
identifies a listing; it does not describe one. A row whose Arabic title has not been written
yet is not thereby nameless: its asset type and its district are known, and they are exactly
what the English sentence is made of. This class had already been found once and fixed once,
in the share metadata of `listings/[id]/page.tsx`, and the fix stopped at that one function
while fifteen other call sites kept the idiom by hand. Per item 6, this is a shared function
with a source-tree guard rather than another local repair: `src/lib/listingTitle.ts` owns the
ladder, thirteen call sites import it, and a scan over `src` fails if any file falls back from
a title to a reference code again. Two selects were widened so the surfaces that had never
been given an asset type can now describe a listing at all.

### Re-verified live on `7a3c995`

Both fixes were then exercised on the deployment of the commit that carries them,
`dpl_2DWWzZWYXE8BofkQ7fcKQX98RqK2`, on a fresh page load in each language.

`/en/advisor`, query "office for lease in Riyadh". The note reads:

> 4 verified matches, owner-verified and deduplicated. These are the closest 4 results of 18.

Four rows are rendered. The leading count is the number of rows on the screen, the eighteen
rows the search matched are declared rather than dropped, and the two numbers are told apart
in the sentence itself. Before this commit the same search would have opened with the server
total above four rows.

`/ar/advisor`, query `مكتب للإيجار في الرياض`. The note reads:

> 4 مطابقات موثّقة. التحقق من المالك مباشرة، بلا تكرار، مع سند الترخيص. هذه أقرب 4 نتائج من أصل 18.

Four rows, the same two numbers, Western numerals in both places per Law 7, and the counted
noun agrees: `مطابقات` at four, and `نتائج` after `أقرب`. The first card reads `مكاتب في العليا`,
a description in the reader's own language, where the same row on the previous deployment read
`SATM-A0DC83D0`. The rail carries `المؤشر الإيجاري للهيئة العامة للعقار (إيجار)` and the footnote
reads `مؤشر الإيجارات الربع الثاني 2026 · معايير منشورة منسوبة إلى مصادرها`.

The `/api/` trace across both turns is exactly `POST /api/advisor 200` and `POST /api/search 200`
in each language, same origin, four requests in total and no third-party request of any kind.
The caveat above still applies without softening: this says nothing about server-side egress.

Screenshots: `en-advisor-7a3c995-search.jpg` and `ar-advisor-7a3c995-search.jpg`, both readable,
neither reconstructed from DOM text. Findings 65 and 66 are closed with live evidence.

### Finding 62, found live and left open

The rendered band shows `1,250.04` and `1,590.96` beside an average of `1,420.5`. Mixed and
false precision on a figure surface. It is recorded as **blocked by evidence or decision**
rather than rounded in passing, because deciding the precision of a published rent figure is
a figure decision, not a formatting one.

### Finding 64, cause narrowed, still open

RSC prefetch returns 503 in both locales, seven times in a single page load. No 5xx appears in
the Vercel runtime logs, so the 503 never reaches the function. Narrowed, not fixed.

### What could not be exercised live, stated as such

Gateway-provider behaviour is covered by `gateway.test.ts` against a stubbed transport with a
synthetic gold row. A real provider call needs a key this session must not request, and item 1
forbids activating external processing before the owner records the agreement. Covered by
stub, blocked on owner. Not equivalent.

Search timeout, provider failure and boundary denial are unit-tested. A timeout cannot be
induced against production without degrading it for anyone else using it, so the unit test is
the evidence and is recorded as the weaker one.

No real user, requirement, listing or document data was used for any provider testing, because
no provider was called at all.

## Owner ruling 5, re-confirmed

`/en/listings?city=riyadh` renders Riyadh and `/ar/listings?city=riyadh` renders الرياض, with
the raw slug appearing only in the URL. Confirmed live on this HEAD rather than carried over
from its PKG-2A closure.

## Gate

`npx tsc --noEmit` clean. `npm test` 856 pass, 0 fail. `npm run ar-lint` clean.
`node scripts/prose-scan.mjs` 0 hardcoded prose strings in 0 public page source files.
Production build: the Vercel build for each commit above reached READY, which is the build
gate for this package. `npm run build` fails in this container for one environmental reason
only, recorded so nobody reads it as a defect: `next/font` cannot fetch Hanken Grotesk, IBM
Plex Mono, IBM Plex Sans Arabic or Source Serif 4 because `fonts.googleapis.com` is not on the
container's egress allowlist.

## Responsive evidence

`7a3c995` is the only commit in this package that changes rendered output in a way a
measurement could see, and what it changes is the text of one sentence and the fallback text
of a card title, inside layouts that were already measured in `f47be8c` at 320, 360, 390, 430,
768 and 1280 pixels in both locales. Both replacements are shorter or comparable in length to
what they replace in Arabic, and the card title was already the longest line in its box. The
element-level overflow assertions in `scripts/responsive-probe.mjs` remain the gate.

## ADV-3A.1 acceptance, item by item

| Codex acceptance line | Where it is met |
| --- | --- |
| Existing gateway retained | Unchanged since `6e9b19f`. |
| Nonpublic user and listing content denied before network access while the gate is closed | `f984201`, `preAgreement.test.ts`. |
| No instruction can accept an unnoticed raw dynamic interpolation | `f984201`, tagged template plus symbol brands. |
| Assistant history is not classified as user-authored | `f984201`, `src/lib/advisor/history.ts`. |
| Previous assistant figures cannot become allowed evidence | `f984201`, regression test pinning the old shape. |
| Search, advisor and translation have controlled deterministic behaviour | `f984201`, all three paths. |
| Structural enforcement and closure wording agree | Item 4 above; the claim was narrowed to match the scan. |
| EN and AR live evidence is readable | "Live evidence" above. |
| Typecheck, complete tests, Arabic lint, prose scan, production build | "Gate" above. |
| Closure record and regulatory register agree with the code | This file plus `docs/regulatory-register.md` Part D. |

## Blockers, unchanged and owner-side

The enterprise AI agreement remains the binding constraint on ADV-3 and is still recorded as
`unknown` in `docs/regulatory-register.md` Part D. Until the owner records the provider
agreement, the processing terms, the cross-border basis and the user disclosure or consent
position, `AI_AGREEMENT_IN_FORCE` stays false and the three paths stay deterministic.

`.github/workflows/arabic-font.yml` remains an owner-side install. The deploy credential
carries no workflow scope and none may be requested.

Row-level security is disabled on `public.spatial_ref_sys` and `public.map_anchors`, reported
by the Supabase advisor as critical. The remediation is one statement per table, and it is
**not** being applied here: enabling row-level security without policies blocks all access to
those tables, so it is an owner decision with a rollback plan, not a package edit.

## Next

ADV-3B, entered directly and without waiting for approval, per the directive: typed SAT tools,
six agent boundaries, deterministic calculation and permission layers, the synthetic bilingual
evaluation gold set, and model-quality, latency and cost evaluation. No real private data to
any provider. No provider selected because it is inexpensive. No autonomous consequential
writes.
