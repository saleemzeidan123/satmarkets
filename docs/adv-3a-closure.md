# ADV-3A closure: one door to every external model

Commit: `6e9b19f`, deployed to production as `dpl_FinorxxkvJYHmjNUyKfd4rx4fJGe`, state READY.
Preceding HEAD: `83c991f`. Scope: the provider boundary half of ADV-3. The six agents, the
typed SAT tools, the deterministic calculation layer and the evaluation gold set are not in
this package and remain open in `docs/roadmap.md`.

## What was actually wrong

ADV-0 shipped a data-classification boundary and a closure record stating that it sat in
`llm()`, "the single choke point through which both the primary and fallback providers are
reached". The claim was true of `src/app/api/advisor/route.ts` and false of the platform.

Two other files reached external providers with no boundary call anywhere in them.
`src/app/api/search/route.ts` held an inline array of base-url, key and model tuples and
posted to two providers from `llmParse`. `src/lib/translate/translateToArabic.ts` held its
own `callClaude` with its own key read, its own version header and its own error shapes.
Neither imported `aiBoundary` at all.

What each sent was, as it happens, permitted. A search box query is the user's own words.
Listing copy is the owner's own text, submitted by that same owner under their own
row-level security. That is why nothing failed and nothing announced itself: there was no
incident to find, only a check that was never made. A second path around a boundary is a
defect even when the material on it is allowed, because what travels on a path changes over
time and the absence of a check does not.

A third drift sat next to it. The advisor declared what it sends by hand, in
`ADVISOR_PROMPT_PARTS`, and then built a separate array to send. The checked list and the
sent list were two objects maintained by hand, so they could disagree with nothing in the
repository able to notice.

All three are recorded as finding 54, and `docs/adv-0-closure.md` now carries the matching
correction under the paragraph that made the original claim. The paragraph itself was left
standing, because what it claimed on the day it was written is the point.

## How it is closed

Not by adding a check to the two files. By making the check a precondition of the call.

`src/lib/ai/message.ts`. A message carries its own data classification. A system prompt
that needs a live value fills it through a named slot, and the slot declares the class of
what it carries. `instruction()` throws if a template has an unfilled placeholder, if a slot
names a placeholder the template does not contain, or if a slot declares no class. There is
therefore no way to interpolate a value into a prompt without saying what the value is.

> **Correction, ADV-3A.1 item 2.** The last sentence was too strong for the API that shipped
> here. `instruction(label, text)` took an already composed string, so a caller could write
> `instruction("x", someDynamicValue)`, or interpolate into the string before calling, and the
> gateway would see one part classified `own_instruction`. The check was on the argument, not
> on the interpolation. `f984201` replaced it with a tagged template,
> ``instruction("label")`fixed text ${classifiedSlot(...)}` ``, so every interpolation is
> observed structurally and a raw interpolated value throws. `ClassifiedMessage` and
> `ClassifiedSlot` are now branded with module-private symbols, so an object literal cannot
> impersonate one. The sentence above is true of the current code and was not true of the code
> this record was written about.

`src/lib/ai/router.ts`. Task profiles, and a candidate register in which every candidate
states an explicit evaluation status. All four currently state `unevaluated` with a reason,
because no gold set exists yet, so `selectChain` reports a basis of
`configured_default_no_evaluation` rather than implying anything won a comparison. The
selection is a failover chain, not a single choice.

`src/lib/ai/transport.ts`. The only module in the repository that opens a socket to a
provider.

`src/lib/ai/gateway.ts`. The only module that may reach the transport. The order inside it
is the design rather than an implementation detail: the boundary runs first, before a
candidate is selected, so a denial can never be recorded as a provider failure and can
never be retried against a different vendor. The parts the boundary checks are derived from
the messages about to be sent, through `partsOf`, so they are the same objects and cannot
disagree. `ADVISOR_PROMPT_PARTS` was deleted rather than kept in sync.

`src/lib/ai/index.ts` deliberately does not re-export the transport.

All three call sites now go through `callModel`. The advisor's one live-data interpolation,
the published listing and index segment counts, is now a declared `aggregate_count` slot
instead of a bare template interpolation. The translator keeps its no-failover contract
through a named candidate, because a quality translation quietly answered by the fast tier
would be a worse outcome than a failed one: the caller writes `ar_translation_status =
'machine'` either way, and nobody could tell afterwards which model produced the Arabic on
the page.

## Owner directive step 5, item by item

Kimi is registered, with an honest `unevaluated` status and no configured key, so
considering it is on the record and selecting it is not automatic. The router is
evaluation-based and reports which basis it used. Nothing is selected on token price: the
candidate type carries no price, cost or rate field, so the ordering function cannot reach
one, and a source scan over `router.ts` with the comments removed fails if a price-shaped
key ever appears. Calculations, permissions, verification and transaction state are
untouched by this package and remain deterministic.

## Tests

24 new, 705 total, 0 failing. Three of them are structural rather than behavioural, because
"the gateway is the only door" is a claim about every file in the tree and cannot be checked
from inside one module. They walk `src` and fail if any file outside the transport carries a
provider request needle, if anything but the gateway imports the transport, or if the
package index re-exports it. Their needles are assembled from fragments so the test file
does not match its own scan; a scan that has to exempt itself has lost some of its
authority.

> **Correction, ADV-3A.1 item 4.** "The only module in the repository that opens a socket to a
> provider" was a claim about every file that could ever be written, and the scan behind it
> looked for three needles. A new file could have reached a provider through a vendor SDK,
> through a `/responses` or `/messages` endpoint, through a hostname, through a differently
> named authorization header, or through a generic fetch to a configured URL, and passed.
> `f984201` widened the scan to endpoints, provider hostnames, SDK package names, provider
> authorization headers and model-related environment-key reads. It is still a source scan, so
> a hostname assembled from fragments would evade it, exactly as this test assembles its own
> needles to avoid matching itself. The truthful claim, and the one the record now makes, is
> the narrower one Codex asked for: **all currently known and registered provider integrations
> are centralized in `transport.ts` and guarded.** Absolute enforcement is not proven here, and
> import-boundary lint enforcement is recorded in `docs/roadmap.md` rather than claimed.

## Gate

`npx tsc --noEmit` clean. `npm test` 705 pass, 0 fail. `npm run ar-lint` clean.
`node scripts/prose-scan.mjs` 0 hardcoded prose strings in 0 public page source files.

## Live evidence

Deployment READY on `6e9b19f`. `/en/advisor` renders with its heading "SAT Advisor" and the
prompt "How can I help you today?"; `/ar/advisor` renders in Arabic as "مستشار SAT" with
"كيف أساعدك اليوم؟"; `/en` and `/ar` both render with the search box present and FAL
1200025510 on the page. No error state on any of the four.

What was not verified live, stated plainly rather than implied: `/api/search` and
`/api/advisor` are POST endpoints, and neither was exercised against the deployment. The
container's own egress is answered with 403 by deployment protection, so `scripts/smoke.mjs`
cannot run from here, and the fetch tool available to this session issues GET only. Those
two routes are covered by unit tests against a stubbed transport, which is weaker evidence
than a live POST and is being recorded as weaker rather than described as equivalent. The
first live exercise of either endpoint should be treated as the real confirmation.

> **Correction and replacement, ADV-3A.1 item 5.** Two things in that paragraph.
>
> The cause was misattributed. The 403 is the container's own egress allowlist answering
> `x-deny-reason: host_not_allowed` before the request leaves, not Vercel deployment protection
> answering it on arrival. The distinction matters because it says where the limit is and what
> would lift it, and a wrong cause in a closure record is a wrong instruction to whoever reads
> it next.
>
> Both endpoints have since been exercised live, in English and Arabic, through a browser that
> holds the deployment-protection cookie. See `docs/adv-3a1-closure.md`, section "Live
> evidence", for the transcripts, the network traces and what each turn proves. The claim that
> the first live exercise should be treated as the real confirmation stands, and that
> confirmation found three routing defects and one attribution defect that the unit tests had
> not, which is the reason the distinction was worth keeping.

## Responsive evidence

None owed. The commit changes ten files and none of them is a component: the diff is six new
server-side modules under `src/lib/ai`, two route handlers, one library and one test file,
with no JSX and no stylesheet touched. No rendered surface changed, so there is nothing to
measure at 320, 360, 390, 430, 768 and 1280 pixels that was not already measured in
`f47be8c`.

## Blockers unchanged by this package

The enterprise AI agreement remains the binding constraint on ADV-3 and is still recorded as
`unknown` in `docs/regulatory-register.md` Part D. Until it exists, private documents do not
reach an external provider, and that is now enforced by the gateway rather than by care:
`AI_AGREEMENT_IN_FORCE` is a compile-time constant, and any part classified as
`verification_evidence` or `party_personal` is denied before a socket is opened.

## Next

ADV-3B: the six agents on typed SAT tools, with the deterministic calculation layer beneath
them and the evaluation gold set that would let the router report an evaluated basis instead
of a configured default.
