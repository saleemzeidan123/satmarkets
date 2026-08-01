# SAT Markets — build state & roadmap

Updated 2026-07-28. Companions: `competitive-research.md` (the OSUS / Property Finder
decisions and the ASSET_FIELDS data-coverage audit), `competitive-paseetah.md` (the
public-data dossier) and `strategy-reconciliation.md` (the Competitive Advantage
Strategy classified against live HEAD, which is what the ADV programme below is
converted from).

**Read `status-ledger.md` first.** It is the canonical answer to what is shipped, what is
deployed, what is open and what is owed. This file is the narrative record of how each
package was reasoned about; the ledger is the current state. Where the two disagree, the
ledger is corrected and this file is left as the historical record it is.

## Shipped and verified (recent sessions)

- **Google OAuth** for occupier sign-in — live and published to production.
- **Coverage-gated per-asset filters** + completed warehouse technical group + boolean
  facet matching; **PDP facts-grid** promotes present typed-column specs into the
  at-a-glance tiles. (`facets.ts`, `/listings`, `/listings/[id]`)
- **CRITICAL FIX — RLS infinite recursion** (`listings` ↔ `offmarket_access_grants`)
  that was hiding **every** public listing. Fixed via a SECURITY DEFINER helper
  (`account_owns_listing`); all 89 listings visible again. (migration
  `fix_offmarket_listings_rls_recursion`)
- **Attributes backfill** for the six newer asset types (medical, serviced, showroom,
  education, land, mixed_use) so they render facts + coverage-gated filters. Demo data.
- **Broker/agency verification profile** (`/lister/[id]`): trust dossier — Identity
  verified by SAT, live-spaces / lease-sale split / member-since, operator disclosure.
  CR + legal name stay private by design. (added `member_since` to `listers_public`)
- **Occupier slice**: enquiry history (message threads **plus** attributed
  direct-contact leads, deduped by listing — thread wins) + **account-backed saved
  searches with in-app new-match alerts** on `/me`. (`/api/saved-searches`,
  `SavedSearchRows`, `SaveSearch` mirror, auth-callback merge)
- **Report this listing** — governance-as-trust; files into `listing_reports` for SAT
  review; anyone files, only SAT reads. (`/api/report`, `ReportListing`)
- **Enquiry attribution** — `leads.created_by_user_id` stamped from the session; self-
  read RLS so an occupier can read their own enquiries. (migration
  `leads_created_by_attribution`)
- **Typography system (Fable review)** — Playfair → Source Serif 4 (EN display),
  Cairo dropped → IBM Plex Sans Arabic 700 for AR headings (one unified Arabic voice),
  Arabic size/leading uplift + hard no-tracking, Western numerals. Verified EN + AR.
- **Map Phase 0 + Phase 1** — see below.

## Map enhancement (Fable plan) — status

The `/listings` split map was confusing: two overlapping mark systems, full-page reload
on click, tiny pins under big bubbles.

- **Phase 0 — DONE & verified.** Killed the full-page reload → in-place soft-nav filter
  + fly-to + amber selected ring; a filter header above the list (District · N spaces ·
  Clear); a legend (district approx vs exact building); invisible padded hit-areas +
  larger min bubble radius; map reacts to filter via its sources (camera survives).
- **Phase 1 — DONE & verified.** Zoom-gated crossfade: district bubbles own the overview
  and fade out past z12.5 (maxzoom 14.5); exact building pins hidden at overview, fade in
  past z12 (minzoom 11.5). Overview is now clean bubbles only; drill-in reveals pins.
- **Phase 2 — DEFERRED (careful follow-up).** Wire `listings.geom` into the pin pipeline
  to raise exact coverage (16/93 → 54/93) via a PostGIS RPC; city-level aggregation for
  the far-out Kingdom view (fixes central-Riyadh bubble overlap when zoomed out); honest
  "≈" grammar + exact-location chips. Left for a supervised pass — the geom/RPC query
  changes touch the core listings query and shouldn't ship unwatched.

## Open — NEEDS OWNER INPUT (deliberately not done)

- **Microsoft / LinkedIn / Apple OAuth** — each needs its OAuth app created in that
  provider's console (like we did Google together).
- **Saved-search EMAIL alerts** — in-app alert ships; emailing on new matches needs an
  email provider (Resend/SendGrid) + credentials. Which provider?
- **Direct WhatsApp/Call vs mediated enquiry** — a product decision. The PDP still
  exposes direct lister contact, against Fable's advice.
- **Market data** (transactions + price trends) — NO LONGER BLOCKED as of 2026-07-28.
  The sourcing question is answered; see the public data programme below.
- **Report destination** — reports land in `listing_reports` for now; if you want email
  notification or an admin review screen, say so.

## Public data programme (owner ruling, 2026-07-28)

Source: `docs/competitive-paseetah.md`. Paseetah (بسيطة) and its enterprise sibling
Paseet (paseet.ai) sell Saudi real-estate data assembled entirely from public government
sources, which they state themselves: "بيانات دقيقة من وزارة العدل والسجل العقاري وشبكة
إيجار والعديد من المصادر". No FAL licence, no MOU and no data partnership was found.
Their data position is therefore not defensible, and every source is open to us on
identical terms. This closes the long-standing "gated on sourcing KSA commercial data"
blocker above. It is now a build problem, not a sourcing problem.

Five workstreams, in priority order.

**PD1. Official ingestion of MOJ open data.** Through moj.gov.sa/ar/opendata and the
custom data-request form at moj.gov.sa/ar/OpenData/Pages/Request.aspx. Every dataset
enters `source_registry` with its licence, its period and its attribution string before
a single figure renders. **Hard constraint: srem.moj.gov.sa and the Najiz UIs are
interactive portals, not data products, and are never scraped.** A verification-first
exchange cannot be caught taking that shortcut.

**PD2. Ingest the Ejar commercial rent index.** Published at sakani.sa/reports-and-data.
It carries price per square metre for shops, showrooms and offices across six cities
including Riyadh, back to 2019. This is the evidence spine behind the Rent Index context
line that PKG-1C.1 now renders on every listing, building, lister and flyer head.
Highest-value single action in the programme. It interacts with the deferred "final Rent
Index statistical methodology" item: a real series may replace the current development
low/high test ranges, which are labelled "sample indicative range" today.

**PD3. A public, un-gated, bilingual monthly Riyadh CRE bulletin, with the full method
published.** This is the competitive move, not a marketing one. Paseetah gates everything
behind a login at paseetah.com/map and has published zero methodology, so they hold no
public data surface and no search position on any Saudi CRE query. Taking that ground is
what makes a broker cite SAT Markets instead of them, and it gives the site its first
genuinely indexable public asset. **Route policy consequence: this is the first surface
that argues for coming out from under the site-wide noindex, and it must not ship until
its numbers are sourced, periodised and attributed under the existing laws.** No figure
may be published without its source row.

**PD4. Verification via RER deed checks under FAL 1200025510.** The one thing the data
players structurally cannot copy. Their data says a transaction happened; ours says this
owner is this owner. Feeds the existing `gate.ts` dimensions rather than inventing new
ones, and `ownerVerified` stays the truth source.

**PD5. Government recognition and procurement listing. OWNER ACTION ONLY (ruling 7,
2026-07-28).** Getting onto a recognised-platform list requires approaching a government
buyer, and the owner ruling forbids contacting vendors, signing agreements or
representing that rights exist. This stays a named objective and produces no engineering
task. Etimad announcement
240141005052 (مركز الإسناد و التصفية, published 11/01/2024, closed) was a **limited**
competition naming exactly three permitted platforms: منصة ساس, منصة سهيل (the Ministry
of Justice's own) and منصة بسيطة. Paseetah's only genuinely non-copyable asset is being
on a government buyer's recognised-platform list, and it was acquired by being early and
visible, not by holding a licence. Getting SAT Markets onto those lists is a named
objective. The buyer is itself a lead: a liquidation centre needs verified ownership,
asset search and comparable evidence, which is this product almost exactly.

Explicit non-goal: **no consumer price war.** Paseetah prices a one-off property report
at SAR 49.99 and plans from SAR 90.99. Competing there buys a consumer product we do not
want, at margins that cannot fund verification.

Also open from the dossier: **منصة ساس** appeared only in the tender and is an
unresearched fourth competitor. Aqar (aqar.fm) is the real clock, because it already
owns the supply side and the traffic and has begun adding deal data.

## Competitive advantage programme, ADV-0 to ADV-6 (owner directive, 2026-07-28)

Converted from the Competitive Advantage Strategy through
`docs/strategy-reconciliation.md`, which classifies every recommendation as shipped,
partial, missing, gated or already answered more strictly in this repository. Only the
surviving items appear below. The five PD workstreams above are folded in rather than
run in parallel; the mapping is at the end of the reconciliation file.

**Objective.** Not a Saudi real-estate chatbot, not a mobility-data company, not a
listing-count portal. SAT Markets is the verified evidence and transaction operating
system for Saudi commercial real estate: requirement, verified inventory,
evidence-backed comparison, viewing, decision pack, transaction preparation, first-party
market intelligence.

**Standing constraints across every package.** Owner ruling 7: create interfaces,
procurement requirements and decision records, but buy nothing, contact no vendor, sign
nothing, and never represent that a data right exists. Gated features stay disabled in
code until the owner holds the permission. Nothing in this programme relaxes a law in
`docs/LAWS.md`.

### ADV-0. Regulatory and data-rights register

**Delivered** in `8b6614a` and `9018c2f`. Closure record and handback:
`docs/adv-0-closure.md`. Artefacts: `supabase/migrations/20260728_source_rights_ledger.sql`,
`src/lib/sourceRights.ts`, `src/lib/queries/sourceRights.ts`, `src/lib/aiBoundary.ts`
wired into `src/app/api/advisor/route.ts`, `docs/regulatory-register.md`,
`docs/procurement-backlog.md`. 52 new tests, 347 total.

The gate below is met in the only sense available today: every registered source has an
owner, a recorded permission state and a stop condition, and every unanswered question
sits at a failing default rather than an optimistic one. The surfaces whose permissions
are still open (the bulletin, HBU, investment scenarios, derived Rent Index figures,
external notification channels, any external-model use of private material) stay
disabled in code, not by convention. What remains is owner and counsel decisions,
ordered by leverage in `docs/procurement-backlog.md`.

Deliver: the FAL scope question stated per surface with its stop condition; a rights
ledger extending `source_registry` rather than replacing it (permitted derived values,
permitted export, permitted AI retrieval, permitted model input, refresh, corrections,
audit, termination, stop condition); the AI data-classification policy as a
code-enforceable boundary deciding what may leave the process; the contract backlog.
Covers FAL 1200025510 scope, the separate REGA analytics licence question (O13), REGA
and Ejar republication and derivative rights (O10), SPL National Address, stc Geo
Analytics, maps and POI providers, AI-provider privacy terms, contributor agreements and
PDPL roles.

Gate: every planned data surface has an owner, a lawful basis, permitted uses and a stop
condition. No surface may render from a source whose row is incomplete.

Already in place and not to be rebuilt: `source_registry` with attribution, licence
note, storage policy, redisplay policy and licence reference across nine sources.

### ADV-1. Evidence and entity foundation

**Delivered** in `1047ee6`, `bbed926`, `0625309` and `0c4e615`, after the owner ruling 3
and 4 precondition closed in `41f4f8f`, `726b72b`, `0d07cb8`, `b94b6b4`, `f6368c4`,
`11c9518` and `6c2e1fa`. Closure record and handback: `docs/adv-1-closure.md`. Artefacts:
`src/lib/evidence.ts` (Evidence Passport, entity kinds, asymmetric `attribution`,
`isKnown`, `publishability`), `src/lib/listingVerification.ts` (the five verification
dimensions, the four independent fail-closed conditions, `relationConsistency`),
`src/components/VerificationState.tsx`, the value-level dictionary guards in
`src/lib/claims.test.ts`, with `src/lib/evidence.test.ts` and
`src/lib/listingVerification.test.ts`. 179 new tests, 526 total.

The gate is met in one half and honestly open in the other. Verification rendering
satisfies D24 in both directions and is enforced by test: no published row can draw a
badge, because the resolver requires a non-fixture record, a method naming a check
outside this database, a date of check and a countersigning actor, and every one of the
88 published rows fails at least one; and where a dimension does resolve, the reserved
green is used and nothing else is. Traceability is met for verification claims and for
the cited rent band, and is not yet met for every Rent Index reference on the platform:
36 English and 59 Arabic dictionary values name the index with no attribution, most of
them labels and page descriptions that cannot structurally hold a 44-character Arabic
citation. That is findings rank 45 and open decision O15, which needs an owner scope
line before a sweep can be written. Two specified items remain and neither blocks ADV-2:
the append-only corrections WRITE path (the read path is complete and `publishability`
already refuses a retracted passport; the write path arrives with ADV-6, where
corrections originate), and PD4 deed checks, blocked on O13 and O10.

Precondition, sequenced first because a passport on an over-claiming page is decorative:
**owner ruling 3**, audit and correct the roughly 100 remaining over-broad claims from
record-level evidence, `/invest` first, then public discovery, listing, lister,
requirement, research and advisory surfaces; and **owner ruling 4**, anonymize the HBU
comparables unless each named comparable has a lawful documented public source and
permission, with HBU staying illustrative and noindex until its gates clear.

Then deliver: a typed Evidence Passport binding field, value, source, period, geography,
entity kind, unit, statistic type, transformation, sufficiency, freshness, confidence,
verification scope, correction history and permitted use, extending `provenance.ts`;
the entity-kind model separating property, development, building and unit (the location
side is already typed by D10); field-level verification states resolving findings rank 3
and owner decision O3; the corrections model. PD4, deed checks under FAL, extends
`gate.ts` dimensions and never replaces `ownerVerified` as the truth source.

Gate: every material public claim traceable to source, scope, time and verification
meaning. Verification rendering satisfies D24 in **both** directions.

### ADV-2. Professional supply and demand workflow

**Delivered** in `ca8e13e`, `c0a4d91`, `db7dd28`, `1eeabdc`, `0dc184a`, `5b0d864`,
`1842539`, `06ec9be`, `d376729`, `80ea746`, `919eb63`, `023b4d1`, `81901cc`, `f7c522d`
and `dc780e3`. Closure record and handback: `docs/adv-2-closure.md`. Artefacts:
`src/lib/listingQuality.ts` (completeness with the reason attached to the score, and
`contradictionsOf`), `src/lib/factScope.ts` (whose fact it is, resolved per asset type and
per field, with ADV-1 attribution asymmetry at field level), `src/lib/listingStudio.ts`
and `src/components/ListingStudio.tsx` (short steps partitioning every fact onto exactly
one step, replacing `NewListingForm.tsx`), `src/lib/listingEdit.ts` (save, resume and
per-stage editability), `src/lib/matching.ts` (named dimensions, declared tolerance,
eligibility before comparison, no verdict without reasons), `src/lib/decisionPack.ts` with
`src/components/DecisionPackPanel.tsx` (what a shortlist can compare and what it must ask
first), `src/lib/mediaStandard.ts` with `src/components/MediaBrief.tsx` (44 shots across 15
asset types as a brief, and a status over the three countable facts), and two migrations:
`20260728b` (the requester can read the viewing they booked, with the null guard and the
ALTERed insert check) and `20260728c` (a shortlist is a saved listing with a name, on the
account). 155 new tests, 681 total. 37 files, 7,885 insertions. Closed out in `f47be8c`
with the seven owed responsive fragments, one defect found and fixed, four findings
recorded.

Every item in the owner directive's step 4 is delivered. Six items from the wider scope
paragraph below are not, each for a stated reason recorded in the closure: AI-supported
drafting inside the Studio (sequenced to ADV-3, where the provider boundary and the
classification that governs it are built); organizations, teams, roles and brand profiles,
and RFP, which sits on them (both blocked on O14); secure progressive disclosure and
mutual-interest contact release (O14); consent receipts, the recording half of the consent
controls (specified, and arriving with the ADV-6 permission model; external channels stay
disabled in code under O12 as they did throughout); blur and duplicate detection over image
content (deliberately deferred for the same reason the media standard refuses to score
image content, with metadata and text duplicate detection a candidate for ADV-3); and the
exact EN and AR public preview (queued, not blocked). The gate is now met in full,
including the word "mobile": `f47be8c` added the seven owed probe fragments and measured
all seven surfaces at 320, 360, 390, 430, 768 and 1280 pixels in both locales, 120
measurements, 0 document overflow, no item wider than its content box. The run found and
fixed one real defect (finding 51, the decision pack dimension rows overflowing their card
by 16 px at 320 px in both locales) and recorded three further findings, 50, 52 and 53.
The amendment is in `docs/adv-2-closure.md` under Responsive.

Deliver: the asset-specific Listing Studio (short progressive steps, save and resume,
building facts separate from offered-space facts, media missions, quality scoring, blur
and duplicate and contradiction detection, originals preserved, public marketing media
separated from private verification evidence, exact EN and AR public preview, and an
explicit statement of what is missing); availability confirmation; structured
requirements; organizations, teams, roles and brand profiles; permissioned passive
opportunity matching and its reverse; explainable match reasons with exact, possible and
needs-clarification states; a matches inbox for both sides; consent, channel, suppression
and frequency controls; secure progressive disclosure and mutual-interest contact
release; shortlist and comparison; viewing workflow; RFP; deal-room preparation.

Constraints: matching extends the existing saved-search and watch alert path, it does not
stand up a second notification system. No score ships without its reasons. Nothing infers
a missing utility, permission, dimension, rent or term. Until O12 is ruled, external
channels (email, push, SMS, WhatsApp) stay disabled in code and only in-product
notification ships, with consent receipts recorded from the start.

Gate: a mobile EN or AR user completes the core journey without duplicate entry, invented
facts or hidden verification meaning; a new verified availability or active requirement
produces relevant explainable matches without exposing confidential information or
sending an unauthorized message.

### ADV-3. Model-agnostic AI platform

**ADV-3A delivered** in `6e9b19f`. Closure record and handback: `docs/adv-3a-closure.md`.
One boundary-enforcing gateway for every external model call, and the closure of finding 54.
Artefacts: `src/lib/ai/message.ts` (a message carries its own
data classification, and a system prompt fills its live values through named slots, so
nothing reaches a prompt without being declared), `src/lib/ai/router.ts` (task profiles, a
candidate register in which every candidate states an explicit evaluation status, and a
failover chain), `src/lib/ai/transport.ts` (the only module in the repository that opens a
socket to a provider), `src/lib/ai/gateway.ts` (the one door: the boundary runs before
selection, so a denial can never be recorded as a provider failure or retried against a
different vendor, and the parts checked are derived from the messages sent) and
`src/lib/ai/index.ts`, which deliberately does not re-export the transport. All three
provider call sites are rewired onto it: the advisor, the search intent parser and the
Arabic translator, the last of which keeps its no-failover contract through a named
candidate so a quality translation is never quietly answered by the fast tier. Kimi is
registered with an honest unevaluated status and no configured key, so considering it is
on the record and selecting it is not automatic. No provider is chosen on token price:
the candidate type carries no price field, so the ordering function cannot reach one, and
a source scan over `router.ts` with the comments removed fails if a price-shaped key ever
appears. 24 new tests, 705 total.

**ADV-3A.1 delivered** in `f984201`, `0600934`, `1981317`, `259792d`, `2040a50`, `411f205`
and `7a3c995`. Closure record and handback: `docs/adv-3a1-closure.md`. The gateway
architecture was accepted and retained; what was corrected is the set of claims that ran
ahead of what the code enforced. Six items: the boundary now denies unstructured user text,
requirements, conversation history and draft listings before any network access while the
agreement gate is closed, with search, advisor and translation each holding a controlled
deterministic behaviour and a test proving each stops before the socket (see
`docs/regulatory-register.md` Part D1); `instruction()` became a tagged-template builder so
every interpolation is structurally observed and a raw dynamic value cannot enter a message,
with `ClassifiedMessage` and `ClassifiedSlot` nominally branded by a private symbol; the
assistant's own turns stopped being classified as the user's words and stopped being an
allowed source for a figure, so a number that appeared only in a previous model reply stays
unsupported; the transport source scan widened to provider SDK imports, provider hostnames,
model environment keys, `/responses`, `/messages` and `/chat/completions`, and the closure
wording narrowed to the truthful claim that all currently known and registered provider
integrations are centralized and guarded; the deployed search and advisor paths were
exercised live in EN and AR, which found nine defects the unit tests had not (findings 55 to
61, 65 and 66); and finding 52 was closed with a tested Arabic counted-noun formatter
carrying an oblique dual, asserted at 1, 2, 3, 10, 11, 99 and 100 against rendered sentences.
856 tests.

**Follow-up, not yet scheduled: import-boundary lint enforcement.** Codex item 4 asks for
import-boundary or lint enforcement of the transport rule "where practical". It is currently
enforced by three source-tree tests rather than by the module system, because there is no
ESLint configuration in this repository at all, so the honest cost is adopting and tuning a
linter across the whole tree rather than adding one rule. Recorded here as its own package so
the closure wording and the enforcement stay in agreement in the meantime: the claim made is
the narrower one, and it is what the tests actually check.

**ADV-3B delivered** in `3e36d52` and the commit carrying `src/lib/eval/`. Closure record:
`docs/adv-3b-closure.md`. Six pieces. Typed SAT tools, where a tool declares its effect, the
capability required to call it, a written parser and a bilingual summary, and where every
result carries its own classified parts so provenance travels inside the result rather than
alongside it. A deterministic permission layer whose grant table falls back to the signed out
grants for an unknown role, requires an actual party id before a capability over the actor's
own records opens anything, never names a tool the caller may not use, and runs the permission
check before the parser so a refused caller never learns the schema. The six agent boundaries
(discovery, listing copilot, opportunity matching, evidence auditor, deal analyst, operations),
each with a bounded tool list, a maximum capability, a call ceiling per turn so a loop cannot
become a spend, a permitted data class list narrower than the global boundary, and a figure
policy of either `none` or `tool_vouched`; no agent may hold personal data or verification
evidence whether or not the agreement exists, and every agent's mode is deterministic today
because it is a function of `AI_AGREEMENT_IN_FORCE` and of nothing else. A synthetic bilingual
gold set of 22 cases across three profiles in both languages, registered in `SYNTHETIC_SETS` as
`adv3-eval-gold`, invented throughout down to the districts and the companies, which is the
permission Codex granted in item 1 and the only content that may reach a provider while the
gate is closed. Deterministic graders that apply the dash law, Law 7, the licence law and the
script check to every text answer, reuse `unvouchedFigures` from the agent layer so an
evaluation pass and a runtime refusal cannot disagree, and grade a translation in the language
it is going into. And a harness, `npm run eval`, that runs a subject rather than a model, so
the deterministic parser is measured today rather than the harness first being exercised on the
day a provider arrives.

`unavailable` is a first class third outcome and is never folded into pass or fail: counting it
as a failure makes the baseline look broken and counting it as a pass makes an unconfigured
provider look perfect. The model subject today reports that no provider is configured, which is
deliberately not the same fact as a boundary denial and is asserted as a distinct sentence.
Cost is measured as requests and characters, not tokens or money, because `transport.ts`
surfaces no usage from either transport; the limitation is named rather than estimated. The
cost firewall is structural rather than documentary: the router imports nothing from the
evaluation package, no module outside `src/lib/eval/` imports the harness so a provider run is
always deliberate, and the router still carries no price shaped key.

The set found two real defects on its first pass against the shipped parser, which is the
argument for having written it. `buildCandidates()` ended with a global longest phrase first
sort, so "logistics" inside a company name beat the word "office" the person led with and the
asset slot filled with the wrong value; `orderCandidates` now gives earliest match wins with
length as the tie break between phrases starting in the same place, which is the overlap case
the length rule was ever right about. And `readNumerics` recognised a maximum, a minimum and an
approximation but not a pair, so "200 to 400 m2" read as a single target of 400; the joiner is
now read once on the gap between two figures, in every form it is written including both
dashes, "الي" and "و". Both carry regression tests. 1021 tests.

**Owner ruling 3 residual delivered.** Closure record: `docs/ruling-3-residual-closure.md`.
The item `docs/ruling-3-4-closure.md` left open at its own lines 316 to 321: the claims guard
reached `src/components`, `src/app`, `src/lib/meta.ts` and `scripts/og-cards.mjs` only, so a
corpus claim in a library module or a generated content file sat outside every gate. It was
measured before it was scoped, by extracting the live `CORPUS_BANNED` frames out of
`src/lib/claims.test.ts` and running them over the 147 files the guard did not reach, and it was
real: 20 offenders, of which three were shipped modules. The advisor search note said "7 verified
matches, owner-verified and deduplicated" above rows the search had filtered on `status =
published` alone, with an Arabic twin additionally asserting a licence authorisation that 0 of 88
published listings carry; it now counts matches and reports the owner-verified subset separately,
only when the caller has counted it off the rows it rendered, with the Arabic clause written as a
prepositional phrase so it stays invariant across the dual. Five claim sites and their Arabic
twins in the legal draft were corrected with the Rent Index attribution restored per owner ruling
2. `CLAIM_SOURCES` now reaches every non-test source under `src` and `scripts` and asserts its own
reach so it cannot silently shrink. The remaining 13 hits are the two test files that quote the
needles as needles. The wrong "Next" section that shipped in `1cb0bd5` in both
`docs/handback-adv-3b.md` and `docs/adv-3b-closure.md` is corrected on the record rather than
overwritten. 1028 tests.

Deliver: the six agents (discovery, listing copilot, opportunity matching, evidence
auditor, deal analyst, operations); typed SAT tools; the deterministic calculation layer;
the evaluation gold set that would let the router report an evaluated basis rather than a
configured default. Kimi may be evaluated and is not automatically selected; DeepSeek,
Gemini and others go through the same evaluation; no provider is chosen on token price.

Constraints: calculations, permissions, ranking eligibility, verification and transaction
state stay deterministic. The discovery agent sits on top of `queryParse.ts` and may not
replace it or silently upgrade an unrecognised term into a constraint. Private documents
do not reach an external provider until the enterprise AI agreement exists; until then
external models see only public, sample or strongly redacted information, enforced by the
ADV-0 classification rather than by care.

Gate: zero unsupported figures, no uncontrolled writes, source-correct evaluation
results, human confirmation for consequential fields.

### ADV-4. Source-linked research and AI-search authority

Deliver: the bilingual Riyadh commercial bulletin with published methodology,
definitions, source, period, geography, statistic type, sufficiency, limitations and
corrections history; the canonical AI-facts pages; structured data. Absorbs PD1, PD2 and
PD3.

Split by owner ruling 1: the **evidence** half proceeds now. The **indexing** half, the
controlled route allowlist over `routePolicy.ts` and the O11 ruling on lifting the
site-wide noindex, is parked with the rest of launch indexing. Buildable now without any
permission: the verification-meaning page, the source-policy page and the bilingual
terminology page. Blocked: anything drawing on `broker_overlay`, which is
`redisplay_policy: internal` because JLL, CBRE and Knight Frank each forbid reproduction
without written permission.

Gate: every figure licensed, sourced, period-correct, sufficiently aggregated and
bilingual, with EN and AR parity.

**ADV-4A shipped**, the canonical machine-readable facts: `docs/adv-4a-closure.md`. The
claims guard now reaches `public/`, which no gate had ever read, and both files there
carried the banned positioning frame. `llms.txt` is rewritten as the canonical facts
file and no longer advertises the held `/area` or the private `/find`. The corpus frames
are widened by one intervening word on measurement; the actor-class frames are not,
because widening them fired only on true statements. ADV-4B is the three pages.

**ADV-4B shipped**, the three public records: `docs/adv-4b-closure.md`. `/verification`,
`/sources` and `/bilingual` are built now, each generated from the engine it describes
rather than describing it: the dimensions, states, demotion reasons and gate failures are
read from `evidence.ts`, `listingVerification.ts` and `gate.ts`; the source policies are
read from the live register; the counted-noun table is produced by `formatCounted` and the
term base is `RE_GLOSSARY` whole. All three ship noindex under O11. Two things are worth
carrying forward. A Next.js page module may export only the route contract, so the lists
these pages publish live in `src/lib/publishedRecords.ts`, and `.next/types` is stale
enough that only the production build catches the violation on a new route. And the live
DOM again found what no local gate could: the states table printed one label twice,
because `unknown` and `not_verified` share a badge on purpose, so the page now names the
collision and a test discovers collisions from the engine at runtime.

### ADV-5. Location intelligence, interfaces and a controlled pilot

Deliver: the SPL National Address interface, the stc Geo Analytics procurement
requirements, a retail or showroom decision workflow, the privacy methodology and the
coverage and value evaluation. No mobility, visitation or demographic claim is exposed
without licensed data, methodology, privacy review and coverage validation. No vendor
contact.

**Hard constraint carried from `source_registry`, stricter than the strategy asks:** the
live Foursquare terms permit caching nothing but `fsq_place_id`, and Mapbox forbids
caching isochrone results at all, so no isochrone table exists in this schema and the
server holds no Navigation-scoped token. ADV-5 must not reintroduce an isochrone cache.
`fsq_os_places` under Apache 2.0 remains the only lawful stored POI layer, attribution
"Powered by Foursquare". Travel time, if it ships, is computed at request time, carries
its method and time context, and is never stored as a property fact.

Gate: coverage, bias, sample, privacy and user-value evidence pass.

**ADV-5 is not closed, and ADV-5A and ADV-5B did not close it.** What those two packages
closed is the discovery, the source-rights boundary and the egress control: the question
of whether the platform was ready, the register check that now stands in front of every
external geography call, and the publication rule and claims gate that decide what may be
said on the day a source exists. Four deliverables in the paragraph above remain open, and
not one of them is blocked by engineering. The SPL National Address integration needs an
agreement, the stc Geo Analytics pilot needs a contract, the coverage assessment needs a
real dataset to assess, and the user-value evaluation needs the coverage assessment to have
run first. Each is contract or data dependent under owner ruling 7, which is why the
interfaces were built against an empty permitted-field set and why the gated capabilities
stay disabled. Recording ADV-5B's closure as ADV-5's closure would convert four unmet
dependencies into four delivered features, which is the error the strategy reconciliation
exists to catch. Codex boundary 1, 2026-07-31.

**ADV-5A shipped**, the location rights boundary: `docs/adv-5a-closure.md`. Discovery
asked whether the platform was ready to add location intelligence and found the wrong
question. Four code paths were already calling third-party geography services and none of
them consulted `source_registry`. `driveMinutes` called the Mapbox Directions API, held
the answer under a day-long revalidate and rendered the minutes on a public listing page,
while the register records `foursquare_mapbox` as `derived_display_policy: none`.
`/api/places` sent the visitor's typed query to Google Places, then Mapbox Search, then
Photon. `/api/geocode` sent the same text to Photon. `src/lib/location/` now mirrors
`src/lib/ai/` exactly: a registry that is the only place a hostname or a credential name
is written, a boundary that reads no environment variable, a transport that is the only
socket and is absent from the package index, and a gateway that runs the boundary first
per candidate so a denial costs no request. Findings 68 and 69.

Two things carry forward. `driveMinutes` degraded correctly with `MAPBOX_TOKEN` unset,
which is exactly why nobody noticed it checked no permission: the only thing between a
public page and an unlicensed value was an unset environment variable, so the boundary
evaluates rights before credentials and a rights denial survives someone adding a token.
And requests carrying text the user typed are gated separately by
`PROCESSING_AGREEMENTS_IN_FORCE`, a compile-time constant rather than an environment
read, because an environment variable is a deployment setting and this is a contractual
fact. With the register as it stands every external location provider is denied:
autocomplete serves our own indexed districts alone, geocode returns an empty list, and
listing pages show straight-line distance with no drive time.

**ADV-5B shipped**, the mobility and address interfaces and the claims gate:
`docs/adv-5b-closure.md`. Scope was the SPL National Address interface, the mobility and
visitation interface with regulatory-register Part E as an executable sufficiency
checklist, the privacy methodology, the coverage thresholds, the procurement and register
updates, and the `/ops` "POI + isochrones" claim.

The address interface is built around an empty permitted-field set, because the request is
the moment data crosses: asking for a building number and rendering only the district does
not make the other fields unrequested, it makes them received. An empty list builds no
request, and two further refusals sit under it. The mobility interface runs four gates in
a fixed order, rights first, and its available type narrows geography to city or district
so a building-level movement figure cannot be constructed rather than merely refused.
D29 records the rule and `docs/mobility-privacy-methodology.md` states it in prose,
written before any source exists on purpose.

What made the package worth more than its interfaces was the structural gate. Reading
every file under `src/app` and `src/components` for mobility claims found that
`/building/[id]` hashed the building id into a seeded generator and rendered the output as
that building's weekly visitors, hourly rhythm, drive-time rings, dwell, daytime and spend
figures, three of them in the overview row with no sample label, stable across reloads.
Auditing `/area` before excepting it found four source cards representing telecom
partnerships, payment-gateway feeds and data partnerships that do not exist. Findings 70
to 73; 74 stays open, on whether `/building` should be declared for indexing or held,
which is an owner decision rather than a defect.

**ADV-5B closed.** `docs/handback-adv-5b.md` is the consolidated handback: commits, the
1,154-test suite, live EN and AR evidence on production, twelve responsive measurements of
the new panel, and the remaining blockers. The accessibility check on that panel found
finding 75, the two habitual muted text tiers measuring 2.93:1 and 3.96:1 against a WCAG
AA threshold of 4.5:1. It is corrected on the panel where the muted text was the whole
content and left open elsewhere, because forty other uses are a platform-wide visual change
and belong to the parked visual-quality package. The general point it raises, that contrast
has no gate at all, is the natural first item of that package.

**The strategy reconciliation is done, second pass.** `docs/strategy-reconciliation.md`
now carries both passes: the first at `058a568` and the second at `a2d2817`, with the
first-pass verdicts kept beside the current ones so the classification can be audited
rather than taken on trust. It adds a sixth verdict, **Built but unreached**, for a module
that exists, is typed and is tested, and that nothing on a rendering surface or request
path reaches. Section 7 of that file is the dependency-ordered conversion and is the
authority for what follows here.

The second pass applied ADV-5B's own method to itself, asking not what was built but what
reaches a reader, and that produced finding 76: the strategy's flagship advantage, the
Evidence Passport, is built and unreached. `evidence.ts` defines it with 567 lines of test
behind it and no code in `src` constructs one; `provenance.ts` declares a tier on every
asset field whose only runtime reader uses it to skip computed fields; and
`ProvenanceChip.tsx`, the component that would draw it, is imported by nothing. Finding 77
is the same thing seen from the component side, five orphans of 57 with two of them being
the passport's rendering surfaces. The reconciliation is careful to separate this from the
dormant AI agent layer, which is unreached because a gate refuses to activate it under
owner ruling 7 and is therefore working as designed.

ADV-5C, when it runs: the coverage-validation harness against known ground truth, which
Part E requires before a first figure is ever published, and which needs a candidate
dataset to validate against. Nothing about it is blocked by ADV-5B; it is blocked by
there being no source, which is owner-side under ruling 7.

### ADV-1C. The Evidence Passport producer, its rendering and its gate

**Closed 2026-07-31**, commits `5654802`, `15939ec`, `874fa31`, `2d03d9f`, `8600116`, live on
`dpl_2rQxGuzPJwFAx9gJJdbRdPaTccGQ`. Record: `docs/handback-adv-1c.md`. The passport renders on
the listing detail page in both languages, and that is the only surface it can lawfully reach
today because the public runtime cannot read a rights row and every `sourced` figure
therefore resolves to permission not recorded; the handback states that rather than claiming
breadth. CORRECTED AT ADV-1C.1: this paragraph said the source register is empty. It is not.
Nine reviewed rows are written by `supabase/migrations/20260728_source_rights_ledger.sql`,
and what the public runtime observes is that `source_registry` returns no rows to it. See
finding 88. Findings 80 and 81 stay
open by decision, and there is still no authorised internal evidence view.

**What ADV-1C closes, narrowed at ADV-1C.1 on Codex correction 3.** It closes four things
and only four: the Evidence Passport PRODUCER, the PUBLIC PERMISSION BOUNDARY, the FIRST
RUNTIME SURFACE and the REACHABILITY GATE. It does not close the Evidence Passport product
outcome, and it does not close strategic ADV-1. Those remain open until at least one real,
rights-cleared material figure is rendered with its complete evidence, and until the agreed
public surfaces are progressively integrated rather than one detail route carrying the whole
demonstration. Findings 80 and 81 are legitimately open and are not to be swept into a
closure sentence. The distinction matters because a passport that renders is an engineering
result, and a passport that carries a real cleared figure is the product claim, and this
package earned the first.

**Was next.** Converted from the second strategy reconciliation, section 7. Chosen on three
grounds rather than on preference: it is the strategy's flagship advantage; nothing gates
it, because no permission, vendor, contract or owner decision stands between here and a
rendered passport; and every remaining evidence-dependent agent item, the evidence auditor
first among them, has nothing to operate on until it exists.

Deliver: a producer that builds an `EvidencePassport` from records the platform already
holds, so the type stops being a description of intent; a rendering that shows the passport
to a reader, which is what the strategy means by a citation chip not being enough; the four
reading functions, `freshnessOf`, `confidenceOf`, `isKnown` and `publishability`, wired to
that rendering rather than exercised only in unit tests; and a structural gate in the
`claims.test.ts` pattern that fails when a rendering surface states a figure no passport
reaches. On the ADV-5B evidence the gate is the part that carries the value, because a
module can be shipped, tested and green while the surfaces contradict it.

Two smaller items ship with it because they are the same finding from other sides. Finding
77's five orphan components are each wired, deleted, or excepted with a test that the
reason for the exception is still true, on the `LocationScore` precedent; `RentBand.tsx`
carries a `badge-gold` name, an unisolated en dash range under RTL against D20, three muted
tiers finding 75 measures below threshold, and a locale-free `toLocaleString()`, none of
which any gate catches because none of it renders. And the strategy's image-integrity rule,
that AI must never beautify an image in a way that changes the physical reality of the
property, is written as a law and enforced by a test: it appears nowhere in this repository
today, and a verification-first exchange that retouches a photograph has falsified the
record it exists to hold.

Gate: no public figure renders without a passport a reader can inspect, and the structural
test proves it by reading the surfaces rather than the module.

Not in scope: the append-only corrections write path, which stays with ADV-6 where
corrections originate; PD4 deed checks, blocked on O13 and O10; and the availability green
collision, which needs O16.

### ADV-1C.1 and ADV-1D. The corrections, and the first integrated evidence

**Closed 2026-07-31**, commits `71ee177` and `1486ec3`, live on
`dpl_2AqS8vGx6VjcsJwHfX5peLfGnrge` at `satmarkets-3c7ql7zer-sat-markets.vercel.app`.
Record: `docs/handback-adv-1c1-adv-1d.md`. Owner checklist: `docs/owner-actions-adv-1c1.md`.

Codex's seven corrections all landed. `realInventoryOnly` is gone and the one predicate it
was became five separate facts in `src/lib/launchGate.ts`: `RecordDemoStatus`,
`PreviewEnvironment`, `PublicationAuthorization`, `AvailabilityFreshness` and
`ProductionCountEligibility`, with `indexingPermitted()` failing closed on both switches and
on any sample, synthetic, unknown or unauthorized record in the set. The runtime predicate is
`nonDemoPublishedInventoryOnly`, reached through `releaseVisibleInventory` at 16 public query
surfaces. Nothing promotes the absence of a demo marker to authenticity.

The source register is one register, not two. `readSourceRegister` now separates
`not_configured`, `read_failed`, `no_rows_visible` and `loaded`, so "we could not read" is
never reported as "there is nothing", and finding 88's state is named. REGA resolves through
one canonical constant, `REGA_RENT_INDEX_SOURCE_ID`, and the string literal appears in
exactly one non-test module.

`EvidenceState` carries 11 members and each of Codex's seven reader-distinguishable
conditions has its own. The member formerly called `unavailable` is now
`permission_unrecorded`, because "unavailable" was the exact word ruled out as a stand-in for
several different facts.

Two runtime surfaces were added to ADV-1C's one: `/[locale]/rent-index`, server-rendered,
whose evidence card now prints the passport's own value rather than the row's; and
`/[locale]/advisor`, where `/api/advisor` builds the passports server-side, filters to the
values the licence permits, and the client carries them without ever building them. Live in
both languages at 1,421 and 1,250–1,591 for 2026-Q2, Western numerals throughout.

**What this does NOT close.** ADV-1D's own precondition is unmet. There is no rights-cleared
REGA Rental Index (Ejar) figure to demonstrate: `rega_ejar` is `asserted_unverified` with an
`internal` ceiling and a `stop_condition` of "O10 unresolved"; finding 88 means the public
runtime reads no rights row at all; and every `rent_index_published` row is `data_class
'synthetic'`, `is_demo true`. The passport therefore renders a truthful `derived` state
attributed to "SAT Markets own record". The machinery is complete and the input is missing.
Strategic ADV-1 and the Evidence Passport product outcome stay open, findings 80 and 81 stay
open, and finding 90 opens: the Advisor's prose figure comes from the row whatever the
passport decides, so a withheld licence leaves the number visible with no evidence beside it.
O10 is now on the critical path twice.

### ADV-1E. One quote decision, and the meanings it separates

Codex's corrective package on the ADV-1D handback. The defect it answers is finding 90 and
it is worth stating plainly, because the machinery around it was already correct: a row
being `published` in the database and `sufficient` under the statistical rule was being read
as permission to say the number out loud. Those are three different questions. Statistics
answers whether a figure means anything. Publication status answers whether SAT has finished
preparing it. Neither answers whether SAT is allowed to publish it, and only the third
question has a licensor's signature behind it.

There is now one function that answers it. `decidePublicQuote` in `src/lib/publicQuote.ts`
takes data class, demo status, source-rights status, permitted display, environment and any
recorded stop condition, and returns one of four meanings: `authorized_public`,
`labelled_sample`, `withheld`, `unavailable`. Every reader of `rent_index_published` goes
through it, all fourteen, and so do the API responses, the metadata, the structured data and
the Advisor. Fail-closed is the default rather than a branch: an unrecognised combination
withholds.

The prose and the passport can no longer disagree, because they are no longer two decisions.
The Advisor's figure and the passport beside it are produced from the same call, so a
withheld licence removes the number from the sentence rather than leaving it stranded beside
an empty evidence panel, which is exactly what finding 90 described.

Synthetic rows stay visible on the private preview and say what they are. `SAMPLE_STATEMENT`
carries "Sample data for product testing. Not a published market figure." and its Arabic
twin, which passes the existing language gates, and it travels with the figure into the
Advisor's prose rather than sitting in a banner at the top of a page a reader has scrolled
past.

Source laundering is closed structurally rather than by review. "SAT Markets own record" and
its Arabic twin are written in exactly one module, `src/lib/evidenceView.ts`, and
`publicSourceText` is the only writer of the Source field, read by both the Evidence Passport
and the Rent Index table. Discovering this was the useful part of the package: the two
surfaces had each grown their own hand-written ladder answering "who says so", and a rule
written twice is a rule that will eventually be written differently. `mayNameSatOwnRecord` is
set on one first-party branch and is never inferred from a missing source block, so clearing
a third party's rights still never converts its figure into SAT's own record.

O10 is recorded precisely for the first time. It had been carried in four documents in four
shapes, each true and none a specification, which is how a question gets answered in a
meeting with three of its dimensions untouched. `src/lib/sources/o10.ts` holds the ten
clauses Codex named as data, each quoting the register verbatim so the document and the
module fail together, and each answered by a recorded string rather than a tick, on the
ADV-5B rule that a boolean checkbox reads identically whether the statement behind it is a
licence or a recollection. `O10_RECORDS` is empty under owner ruling 7 and that is the
truthful state. It is deliberately not a second gate: the ledger already withholds, and two
independent gates on one question is one more thing that can be flipped by mistake.

Eight regression gates in `src/lib/adv1e.test.ts`, thirty tests, plus nine in
`src/lib/sources/o10.test.ts`. They prove the properties rather than restate them:
`published` and `sufficient` cannot override withheld rights; `noindex` is not display
authorization and the response header is not read as one; synthetic figures always carry
sample status; unauthorized figures never reach an API or rendered payload; prose and
passport use one decision; no source is relabelled as SAT because public rights are missing;
English and Arabic expose identical figures and evidence states; and enabling indexing cannot
expose synthetic, unknown or withheld data.

**What this does NOT close.** The rights input is still missing, and no amount of correct
machinery substitutes for it. The Rent Index publishes no REGA figure today and will not
until O10 is resolved externally. Strategic ADV-1 and the Evidence Passport product outcome
remain open on that dependency, as Codex ruled: a functioning passport displaying synthetic
or unavailable evidence is not the evidence-backed product outcome.

### ADV-6. Contributor network

Deliver: portfolio feeds, contributor agreements as interfaces and requirements, the
analyst review queue, aggregated comparables, response and demand intelligence, each with
permission, correction, audit and revocation controls. Depends on ADV-1's correction and
audit model existing to attach permissions to.

Gate: legal, confidentiality, competition, quality and minimum-sample controls pass.

## Elite product operating standard (Codex item 9, reconciled 2026-08-01)

Full classification in `docs/elite-standard-reconciliation.md`. The strategy document was
read in full at `b2fc4b8`. This section is the roadmap half.

**Launch stage gates of record.** E0 engineering foundation, E1 design-partner alpha, E2
closed beta, E3 launch candidate, E4 broad launch, E5 scale. **The product is at E0.**
Shipping a package no longer counts, by itself, as movement toward launch.

**Adopted immediately, no infrastructure.** Every future package record and handback must
name six things before the package starts: the user journey it improves, the observed problem
or unavoidable foundation it addresses, the measurable outcome expected, the simplest
acceptable implementation, what will not be built, and the date or evidence that decides
whether to continue. After each foundation package, record explicitly whether the next
highest-value action is implementation, design, user research, data acquisition, legal work
or operational preparation.

**Already substantially covered.** E0. Parts of ELITE-2 (design tokens, Harbor discipline,
responsive probe at 320/360/390/430, reduced motion, empty and error states), ELITE-3
(`ar-lint`, glossary, Western numerals, dictionary parity) and ELITE-6 (RLS, admin auth, rate
limiting, AI boundary, source-rights ledger, deny-by-default publication).

**Genuinely missing, buildable without a licence.**

- ELITE-1 instrument: written task protocol per critical journey, severity scheme, research
  repository. Preparable now. Participants are an owner item.
- ELITE-4 manual pass: keyboard completion, focus visibility, reading order, 200 and 400
  percent reflow, non-visual form of evidence panels, comparison and map. Begin now on
  existing journeys. Independent audit is procurement.
- ELITE-8 event dictionary, lawful basis, retention and access. Writable now. Instrumentation
  only after the dictionary, and measuring only once a cohort exists.

**Waiting on a cohort, because they measure something that does not exist yet.** ELITE-5
Core Web Vitals field data, ELITE-7 production operations and support, ELITE-8
instrumentation, ELITE-9 the Riyadh design-partner beta itself.

**Owner and procurement items.** The eight named independent accountabilities. Senior
independent design review, professional Arabic review, independent accessibility audit,
independent penetration test, privacy and FAL counsel, production operations ownership. None
represented as arranged, per owner ruling 7.

**Technology adoption gates, all queued, none started.** DEV-1 specification discipline (pilot
only for a major net-new domain), OPS-1 durable background execution (before production
notification fan-out), DATA-1 safe preview environments (after the GitHub workflow permission
resolves), SEARCH-1 evidence-aware bilingual retrieval (inside the existing Supabase stack
first), OBS-1 AI observability (after the enterprise AI agreement), ADV-3B agent framework
evaluation, API-1 partner API and MCP distribution (after publication-rights approval),
GROWTH-1 bilingual public tools (after FAL scope). No mid-package migration is permitted for
any of them.

**Rejected for this project, continuing.** Agent swarms and headless fleets, a flat-rate AI
subscription as production workforce, a Bun migration, a framework rewrite, arbitrary plugin
packs or memory injectors in the build environment, and any vector store before the Supabase
retrieval baseline is measured.

**Reconciled conflicts.** ELITE-5 wants Core Web Vitals field data; owner ruling 1 keeps the
preview protected and unindexed, so there is no field traffic. Resolved by the standard's own
alternative, a bounded beta sample at ELITE-9. Until then the recorded state is "not
measured", never a laboratory number presented as a field result. ELITE-8 wants adoption
measured; adoption is zero by construction on a private preview, and a zero recorded as a
product failure would be false.

## PKG-AV1, availability truth on the browse card (findings 46 and 11, 2026-08-01)

The first package recorded in the six anti-overengineering fields the section above makes
mandatory. It is deliberately small, and it is user-facing rather than infrastructural, which
is what Codex item 10 asked the next package to be.

**User journey improved.** A tenant scanning `/listings` deciding which spaces are worth
opening.

**Observed problem.** Finding 46 (P1) and the display half of finding 11 (P0). The card said
"Available" for a space confirmed three days ago and for one confirmed two months ago, with no
date on either, so the only difference between them was a colour. That colour was the reserved
verification green, which the same card also used for the verification tick, so one card
carried the reserved colour twice for two unrelated claims. A reader who cannot separate those
two colours, or who is hearing the card read out, received no freshness signal at all.

**Measurable outcome expected.** On every browse card carrying `availability_confirmed_at`,
the freshness state is readable in words with an age in Western numerals, in both locales,
with no reliance on colour; and the reserved green appears at most once per card, only for
evidence-backed verification.

**Simplest acceptable implementation.** Three distinct sentences from
`availabilityShortLabel`, an `availabilityAge` helper for the counted-noun forms, one
`availabilityTone` writer for the colour, and the two surfaces calling it instead of composing
a colour inline.

**What was deliberately not built.** No new component, no card redesign, no re-confirmation
workflow, no notification, no lister prompt, no dictionary migration of the four strings.

**Stop condition.** All gates green plus deployed evidence of the states rendering distinctly
in English and Arabic. Reached.

The one judgement worth recording: finding 46 asked for a D24 follow-up ruling from the owner,
and it turned out not to need one. The standing quality rule already says verified green is
only for evidence-backed verification, and a date the lister typed is not a check anybody ran.
The exception was deleted from the green gate rather than narrowed.

Closed in `b7349c4`, deployed on `dpl_DRoPVDchC7Bhxj6QPgBTENuRABPj`. Handback in
`docs/handback-pkg-av1.md`, which also records what the deployed evidence turned up:
`availability_confirmed_at` equals `published_at` on every record, and the oldest cross the
60-day stale threshold on 15 August 2026. Nothing has ever been re-affirmed because nothing can
be.

**Correction recorded at PKG-AV2 closure.** That handback said the whole sampled corpus was in
the aging state. A full record-level read of the 50 published rows at PKG-AV2 closure shows 3
fresh and 47 aging, ages 17, 19, 33, 34 and 46 days. The sample PKG-AV1 examined was aging; the
corpus is not entirely so. The `availability_confirmed_at` equals `published_at` finding holds on
all 50.

## PKG-AV2, the re-affirmation the card now asks for (finding 11, closed)

**User journey improved.** A lister keeping their own inventory truthful, and the tenant on the
other side of it who now reads an age instead of a claim.

**Observed problem.** PKG-AV1 made the card say "Last confirmed 46 days ago". There is no
surface on which a lister can answer that. The remaining half of finding 11 (P0).

**Measurable outcome expected.** A lister can re-affirm a published listing's availability from
their own workspace, the timestamp moves, and the browse card returns to the fresh sentence
without any other field changing.

**Simplest acceptable implementation.** The write path already exists: `PATCH
/api/listings/[id]` accepts `availability_confirmed_at` behind the field permission check. What
is missing is the lister-side action, the state around it (which of my listings are aging or
stale) and honest confirmation copy. No notification system, no cron, no scheduled expiry.

**What is deliberately not built.** No automatic expiry of a stale listing, no email or SMS
reminder, no lister scoring, no bulk re-affirm-everything button. An affirmation SAT prompted
into existence with one click across a whole portfolio is not more truthful than the date it
replaced, and Law 3 says the date must be a real event.

**Stop condition.** A lister can re-affirm, the two thresholds are visible to them before they
do, all gates green, deployed evidence in both locales.

Closed in `ee9f3a9`, deployed on `dpl_9hctvptNTHBwpPQvBQKKhxScez4D`, state READY. Handback in
`docs/handback-pkg-av2.md`. Stop condition met on every clause except the last, which is met
only in part and is recorded as such: the deployed evidence in both locales covers the session
gate, the absence of any lister-copy leak, and the public sentence at exact EN and AR parity,
but the rendered lister dashboard is behind a session and the only live channel in this
environment is GET-only and unauthenticated, so that surface could not be fetched. The
lister-side composition is evidenced by test and by running the shipped function against the
real deployed ages.

## PKG-NM1, one name per listing in the reader's language (finding 66's other half, closed)

**User journey improved.** An Arabic reader anywhere a listing is named, and the lister who does
not know their listing is unreadable to half the market.

**Observed problem.** `listingTitle()` exists and its header states that the other language's
title is deliberately not a rung on the fallback ladder. Its source guard enforces only the
fallback to `reference_code`. The forbidden other-language fallback survives as
`(ar ? l.title_ar : l.title_en) || l.title_en` at nine call sites, including the public
`/brokers` page and every page of the lister workspace. Evidence, record-level rather than
inferred: of the 50 published rows the public API returns, `title_ar` is blank on one,
`SATM-BB3FCB59`, published, district present. That reader is shown English.

**Measurable outcome expected.** Zero surviving instances of the other-language fallback, a
source guard that fails if one returns, and a lister whose listing has no Arabic title told so
on their own row along with what an Arabic reader is shown instead.

**Simplest acceptable implementation.** Migrate the nine call sites to `listingTitle()`, widen
the existing `listingTitle.test.ts` source guard from the reference-code pattern to the
other-language pattern, add the `districts` embed on the queries whose data the fallback ladder
needs, and add one line to the lister row when `title_ar` is blank.

**What is deliberately not built.** No machine translation of titles, no title-quality score, no
blocking of publication on a missing Arabic title, no prompt to write one at publish time. The
lister is told what a reader sees; SAT does not write the lister's words for them and does not
invent a name it cannot source.

**Stop condition.** The guard catches the pattern, no call site carries it, the blank-Arabic row
is named correctly on the public surface in both locales on the deployment, and the lister is
told.

Closed in `0e490d8`, deployed on `dpl_Av7coZHQkTJ1tJXvVw3vqaWuRaty`, state READY. Handback in
`docs/handback-pkg-nm1.md`.

**Correction to the scope written above.** Nine call sites was an undercount taken before the
guard existed. Once the pattern was expressed as a regex with its three constraints, the real
figure was twenty-three call sites in twenty-two files. The package shipped all of them rather
than the nine, which is why the commit is thirty-seven files rather than a dozen.

**Stop condition, clause by clause.**

The guard catches the pattern. `listingTitle.test.ts` now carries a second scan for the
other-language borrow, and beside it a sensitivity test that runs the regex against the eight
shapes actually deleted in this package and seven shapes that must stay legal. The first form of
that regex reported twenty files with twelve of them innocent, and a scan with that hit rate
earns an allow list from the next reader rather than a fix, so the three constraints (different
languages, one line, field name ends where it is written) are themselves tested.

No call site carries it. Both scans return empty over the whole of `src`, with four exemptions,
all of them files where the decision is written down rather than files where it is broken:
`listingTitle.ts`, `displayName.ts` and their two tests.

The blank-Arabic row is named correctly on the public surface in both locales on the deployment.
`SATM-BB3FCB59` is the one published row of fifty whose `title_ar` is blank. On
`dpl_Av7coZHQkTJ1tJXvVw3vqaWuRaty` its Arabic detail page reads `مكاتب مخدومة في العقيق` in the
tab title, the H1 and `og:title`, the English string does not appear in the Arabic document at
all, and on `/ar/listings` the reference code appears zero times where it used to be the card
heading.

The lister is told. Two surfaces carry it, and both are behind a session. The only live channel
in this environment is GET-only and unauthenticated, the same limitation PKG-AV2's closure
records, so this clause is evidenced by test and by source rather than by fetch.

**What the package found and did not fix.** Two further borrows of the same shape were separated
by substance rather than swept into the new module, and both are recorded with their reasons.
Finding 92 is `district_label` and `district_label_ar`, twenty-seven sites in eighteen files:
that label names the geography a published third-party statistic describes, so widening it to a
city would restate a band measured in one district as a band measured across a city, which is a
false statement about someone else's figure. Its correct fix is upstream at ingestion and is a
data and rights question, not a rendering one. Finding 93 is the lister `about` paragraph, which
is free prose and therefore neither a description we own nor an identifier, so it has no honest
generic substitute; three candidate answers are named and none chosen.

## PKG-LS1, the Arabic half of the lister's own workspace (closed)

**User journey improved.** The lister who has just been told, on two screens, that an Arabic
reader sees a generic description of their listing instead of the name they wrote.

**Observed problem.** PKG-NM1 states the gap and gives the lister nowhere to answer it. Source
evidence, record-level: `src/components/EditListingForm.tsx` declares `title_en: string` and
`description_en: string` and nothing else, submits those two fields, and renders exactly one
title input and one description textarea. `src/app/[locale]/dashboard/listings/[id]/page.tsx`
passes only `title_en` and `description_en` into it. There is no Arabic title or description
field anywhere in the edit workspace. Meanwhile the write path already exists and is already
permission-checked: `PATCH /api/listings/[id]` accepts `title_ar` and `description_ar` behind
`can()`, trims and length-caps both, and maintains `title_ar_src_hash` so that the translate
route can tell Arabic SAT generated from Arabic a lister wrote. `ListingStudio.tsx`, the create
path, already carries both languages. So a listing created in the Studio can hold an Arabic
title that the edit form will never show its owner and never let them change.

**Measurable outcome expected.** A lister can write, read and edit the Arabic title and
description of their own listing from the edit workspace, in both interface languages; the
notice PKG-NM1 added disappears for a row once they do; and a lister who writes their own Arabic
does not have it silently overwritten.

**Simplest acceptable implementation.** Add the two fields to the form's type, its state, its
payload and its markup, mirroring the existing English pair with correct `dir` and `lang` on the
Arabic inputs; pass the two existing column values in from the page; keep the hash behaviour the
API already implements. No new column, no new route, no new permission.

**What is deliberately not built.** No machine translation button in this package, no
publish-time block on a missing Arabic title, no quality score. The lister writes their own
words, which is the same rule PKG-NM1 closed on.

**Stop condition.** Both fields exist, round-trip a real value through the existing API, are
correct in RTL and LTR at 320, 360, 390 and 430 pixels plus tablet and desktop, all gates green,
and lister-written Arabic survives a subsequent English edit.

Closed in `aed2c1c` and `da0780d`, deployed on `dpl_5pvwfPNL2PkKKWBj9L7kFtcWqAFG`, state READY. Handback in
`docs/handback-pkg-ls1.md`.

**The stop condition, clause by clause.**

*Both fields exist.* Met. `src/components/EditListingForm.tsx` now declares `title_ar` and
`description_ar` in `Init`, holds them in state, renders them as an input and a textarea, and
`src/app/[locale]/dashboard/listings/[id]/page.tsx` passes both column values in. The labels no
longer name a field in the reader's interface language while writing the English column: they
name their own language, in `ListingStudio`'s exact wording, and each control carries the `dir`
and `lang` of the text it holds rather than of the interface around it.

*Round-trip a real value through the existing API.* Met by construction and by unit test, NOT by
an authenticated live submit, and the difference is stated rather than blurred. The edit
workspace is session-protected; the only live channel available to this environment is an
unauthenticated GET, and it lands on the sign-in page, which is the correct behaviour and is
also the reason the round trip cannot be photographed here. What is verified: `ALWAYS_EDITABLE`
already listed both fields, the route already accepted, trimmed and length-capped both behind
the same `mayEdit` check, and the payload now carries them. This is the standing live-evidence
limitation recorded for authenticated surfaces, not a new one.

*Correct in RTL and LTR at 320, 360, 390 and 430 pixels plus tablet and desktop.* Met on the
same basis PKG-NM1 recorded: no `.css` or `.scss` file changed in this package. The two new
controls reuse the `inp` and `lbl` styles of the four fields already in the form and sit in the
same single-column flex stack, so their behaviour at every width is the behaviour those fields
already have. What is genuinely new is direction, and that is per-control rather than
per-layout: an Arabic input inside an English page and an English input inside an Arabic page
are both now marked, so neither renders its own text against the page direction.

*All gates green.* Met. `tsc` clean, 1394 tests passing with 0 failures, `ar-lint: clean`,
prose-scan clean, Vercel READY as the production build evidence. The local `next build` fails in
this sandbox on four `next/font` fetches to Google Fonts, which is the egress block and not a
code result; the deployed build is the one that counts.

*Lister-written Arabic survives a subsequent English edit.* Met, and this is the clause that
changed the package. The route re-stamps `title_ar_src_hash` whenever the request body carries
the Arabic, so a form posting every field on every save would have declared the Arabic current
on English the lister had just rewritten, made `stale` unreachable from the screen that was
built to show it, and permanently exempted the row from any later translate run. `changedArabic`
sends an Arabic field only when its trimmed value actually differs from what was loaded, so an
English-only edit leaves the stamp alone and the row becomes honestly stale, while an edit that
touches the Arabic re-stamps it against the English of the same save, which is true. Clearing a
field is treated as a change so a lister can delete their own Arabic. Recorded as finding 97,
left open, because the discipline currently lives in the client and the durable fix belongs in
the route.

**What the package found and did not fix.** Three findings, measured against the fifty published
rows the deployed `/api/listings` returns rather than assumed. Finding 96: `description_ar` is
empty on all fifty, so every Arabic reader in the exchange gets a name and then nothing. The
field has existed in the Studio throughout and now exists on the edit form, so this is a corpus
fact and no further form work closes it. Finding 94: `ar_translation_status` is row-level and
cannot separate a lister-written title from a machine-written description, and the corpus
already shows it, with seventeen of the fifty carrying a source hash while the status still
reads `pending` and no model is recorded. Finding 97 above. Also observed and stated plainly:
zero rows are currently stale, so the note this package added is correct and, on today's corpus,
silent. Nine rows read `unknown` because no hash was ever stamped, and `unknown` says nothing at
all, which is the intended behaviour and not a gap.

## PKG-SUP1, the public listing entry stops simulating a form (closed)

**User journey improved.** The owner or broker who has a space to market, arrives on `/list`
from the header or the home page, and needs to know what SAT will ask them for before they
decide to start.

**Observed problem.** `/list` is the public entry point for supply and it is a mock of a form
rather than a description of one. Live, on `dpl_5pvwfPNL2PkKKWBj9L7kFtcWqAFG`: `/en/list`
returns 200 with 8 `<label>` elements, 0 `<input>`, 0 `<textarea>`, 0 `<select>` and 0 `<form>`,
and `/ar/list` returns the same counts on the same markup. Every field is a `<div class="input">`
holding somebody else's answer, and those answers are in the served HTML: "Grade A office floor"
7 times, "Al Olaya" 23 times, "320" 11 times, and the Arabic equivalents on the Arabic route. A
four-step progress bar shows step 1 checked and step 2 active. A "Drag photos here" zone is not a
drop target. A "Live preview" card previews nothing. The only real controls on the page are two
links, one back to the home page and one to `/dashboard/new`.

This is two defects in the same markup. It is a deception: a lister reasonably believes they are
two steps into a submission that does not exist, and a photograph dropped on that zone is lost
without a message. And it is an accessibility defect: a screen-reader user is told there is a
"Listing title" field, and there is nothing to focus, because a `<label>` with no control is an
orphan in the accessibility tree. Separately, the four steps it names, Asset, Details and media,
Pricing, Verify and publish, are not the intake. The real intake, from `studioSteps()`, is ten
steps.

**Measurable outcome expected.** A lister reading `/list` in either language can state, before
signing in, what the ten steps of the intake are, what each one is for, and which seven facts a
draft cannot be saved without. Zero labels on the route have no associated control. Zero
fabricated listing values are served. The described step list is generated from
`studioSteps()`, so it cannot drift from the intake it describes.

**Simplest acceptable implementation.** Keep the left rail unchanged: it is already
claim-audited and its `avgTime` card already says "Checked at launch" rather than quoting a
turnaround nobody measured. Replace the right column with three honest blocks, composed in a thin
`src/lib/listIntake.ts` so the page stays declarative and the logic is unit-testable. First, the
real intake spine rendered from `studioSteps()`, which returns the same ten kinds for all fifteen
asset types, each with its bilingual title and purpose, plus one honest line that the facts
inside each step differ by asset type. Second, what is needed before a draft can be saved: the
seven `DRAFT_REQUIRED_CHECK_KEYS`, with the `label_en`, `label_ar`, `why_en` and `why_ar` that
`assessListing()` already returns for each. Third, one call to action to `/dashboard/new` with an
honest note that it requires signing in. Delete the mock grid, the fake wizard, the fake live
preview, the inert drop zone and every fabricated value, and delete the dictionary keys that
existed only to hold them.

**What is deliberately not built.** No real form on the public route. Listing intake is
permissioned, it writes to a lister's own draft, and moving it to an anonymous page would
either invent an anonymous draft owner or collect a space's details with nowhere lawful to put
them. No file upload outside the authenticated Studio. No claim about how long a listing takes
to publish or to verify, because that is owner ruling 3 territory and no measurement supports
one. No new Arabic marketing copy: the step titles and the check labels are the ones the
platform already uses, which is what makes the page unable to drift.

**Stop condition.** A render test over both locales proves every `<label>` on the route has an
associated control or is not a `<label>`, that none of the fabricated strings appears, and that
the rendered step list equals `studioSteps()` for a representative asset type in both languages.
The dictionary keys that held mock values are gone and `ar-lint` is clean on the block that
replaces them. Live evidence on the deployment in English and Arabic shows 0 orphan labels and 0
occurrences of each fabricated value. All gates green.

**Closed on `d6806b8`, deployed on `dpl_2mGUZD7s8ZdTBnMa2ZGQNkmiCfj7`, state READY.** Clause by
clause against the stop condition above.

*A render test over both locales proves every `<label>` has an associated control or is not a
`<label>`.* Met, and met more generally than the clause asks. `src/lib/listIntake.test.tsx`
renders the route with `renderToStaticMarkup` in both locales and runs `orphanLabels` over the
markup, which accepts the two legitimate shapes, an explicit `for` naming the `id` of a control
present in the same document, or a control nested inside the label, and reports everything else.
The outcome on this route is zero, by construction: there are now no `<label>` elements at all.
The guard is written against the shape rather than the count so that it keeps protecting the
route as it grows, and it carries its own sensitivity test over four cases including the exact
markup that shipped.

*That none of the fabricated strings appears.* Met. Twelve literals are held in the test and
checked against the stripped visible text in both locales. The dictionary is checked separately,
because the markup guard alone would pass if the strings had merely moved.

*That the rendered step list equals `studioSteps()` for a representative asset type in both
languages.* Exceeded. The page does not compare itself to one representative type, it is computed
from all of them: `intakeStages` lists a stage only where every asset type in `ASSET_FIELDS` has
it, and the test asserts the kind sequence of every asset type equals the sequence the page
shows. Two claims the page makes are pinned rather than assumed: that every stage has an unsplit
occurrence somewhere, which is what lets a title be shown without a ", part 1" suffix that is
true of a step and false of a stage; and that the asking figure is the only required fact whose
label differs between lease and sale, checked over office and land in both languages, which is
why that one label is joined with the reader's own "or".

*The dictionary keys that held mock values are gone.* Met. The `list` block went from 43 keys to
20 in both locales: 33 deleted, 10 added, 10 surviving. Key parity between the two files is
exact and is asserted by `laws.test.ts`. `MarketingHome` reads `home.gradeAOfficeSuffix` and not
`list.gradeAOffice`, which was checked before the deletion rather than after it.

*`ar-lint` is clean on the block that replaces them.* Met. `ar-lint: clean`, and the `list` block
is inside its BANNED scope, so the ten new Arabic values were linted rather than merely written.

*Live evidence in English and Arabic shows 0 orphan labels and 0 occurrences of each fabricated
value.* Met on `dpl_2mGUZD7s8ZdTBnMa2ZGQNkmiCfj7`. Both routes return 200 with 0 `<label>`, 0
`<input>`, 0 `<textarea>`, 0 `<select>` and 0 `<form>`. Every fabricated literal, and "320", is
absent from the visible text of both. The ten stage titles appear in intake order in both
languages, all seven required facts appear with their labels, the range note reads "10 or 11
steps" and "10 أو 11 خطوة", and the joined asking-figure label appears in both. Titles are the
route's own, `List a space | SAT Markets` and `إدراج مساحة | سات ماركتس`, in place of the root
layout's generic one, which is the `/list` half of finding 12. No em dash and no Arabic-Indic
digit on either route.

*All gates green.* `npx tsc --noEmit` RC 0. `npm test` 1408 pass, 0 fail, 0 cancelled, 0 skipped.
`ar-lint: clean`. `prose-scan` RC 0. Vercel READY.

**What the package found and did not plan for.** Finding 98, a defect class rather than a defect.
`var(--line)` is not a declared custom property, and a declaration containing an unresolvable
`var()` is invalid at computed-value time, so the whole declaration is discarded and the element
renders with no border and no error. I introduced it in the new stage list, found it by grepping
`src/styles` rather than by any gate, and the same sweep found it already shipped on the
owner-documents card of the listing detail page. Both are fixed to `var(--silver)`, and
`src/lib/cssVars.test.ts` now scans every non-test `.ts`, `.tsx` and `.css` file under `src`. It
derives the legal declaration set rather than holding a list: the platform tokens from
`src/styles/*.css`, and the `next/font` families from the `variable:` options in
`src/app/layout.tsx`, which are injected onto the `html` element and appear in no stylesheet. An
allow list of those four names would have accepted `--font-serif` forever, including after the
font that declares it was deleted.

**What the package found and did not fix.** Finding 99. The active locale's entire dictionary is
serialised into every page's payload. On `/en/list` that is 141,202 of 165,422 characters of
script against 2,906 characters of visible text, and it includes the sample strings of fifteen
other routes. It is a payload and coupling fact rather than a truth defect, the sample values
carry their own sample labelling where they are rendered, and narrowing it means changing how
every page obtains its dictionary, so it is recorded rather than absorbed.

## PKG-DEM1, the demand entry point stops rejecting its own visitors (closed)

**User journey improved.** The occupier, or the broker acting for one, who cannot find what they
need in the published inventory, arrives on `/post-requirement` from the header, the requirements
board or the empty state of a search, and tells the market what they are looking for.

**Observed problem.** The form does not submit. This is measured on
`dpl_2mGUZD7s8ZdTBnMa2ZGQNkmiCfj7` rather than inferred from the source.

The move-in control is a four-option segmented radio group. It ships
`Immediate`, `1–3 months`, `3–6 months` and `Flexible` in English, and `فوري`, `1–3 أشهر`, `3–6
أشهر` and `مرن` in Arabic, and the served HTML carries `checked=""` on `value="1–3 months"` and on
`value="1–3 أشهر"`, so the rejected option is the one the page arrives with. `POST
/api/requirements` validates `timeline` against `["ASAP","Q1","Q2","Q3","Q4","Flexible",
"Immediate"]` and returns 400 `Choose a valid timeline.` for anything outside it. Two of the four
English options and four of the four Arabic options are outside it.

So an English visitor who completes every field and does not touch the move-in control is
refused, and an Arabic visitor is refused whichever option they choose. The refusal renders as a
single `role="alert"` card at the foot of the page carrying the server's one sentence, with
nothing tying it to any of the fourteen controls, so the visitor is told their requirement is
invalid and not told which answer to change. There is no test anywhere that submits this form,
which is why a form and its own API have disagreed in production without anything failing.

The live board corroborates it. `GET /api/requirements` returns six rows with `sample: false`,
whose stored timelines are `null`, `Q3`, `ASAP`, `Q4`, `Q3` and `Q4`. Not one is a value this form
can produce, which is consistent with no requirement ever having been filed through it.

The urgency semantics fail one layer deeper. `matchListing` treats a timeline as urgent only when
it folds to `asap` or `immediate`, and that is the branch that makes a listing's dated
availability affirmation part of the match. `فوري` is exactly `Immediate`, and it is neither
accepted by the route nor recognised by the matcher, so the single most decision-relevant thing
an Arabic occupier can say about timing is dropped twice.

Three further defects are the same drift class `/list` was cured of in PKG-SUP1. The five
districts are name and UUID literals inside the client component; the Arabic label the form shows
for KAFD is `كافد` while the districts table holds `واجهة الرياض المالية`, which is the name the
board then displays for the requirement that visitor just filed, so a person is shown one name
when choosing and a different one when reading back their own brief. The board already carries
`Al Faisaliyah`, a district the fixed five does not offer. Only the first selected district is
sent as `district_id` and the rest become `"Districts: " + …`, an English-keyed prose note that no
matcher and no filter reads, so a visitor who selects three locations has two of them silently
demoted to text. And the success card writes `3` as a literal beside the audiences caption while
`done.notified` holds the list the route actually returned, so the number and the list beneath it
are two different claims about the same fact.

**Measurable outcome expected.** Every option the form offers is accepted by the route that
receives it, in both languages, asserted by a test that submits every option rather than by
reading. An Arabic occupier who needs a space immediately produces a requirement the matcher
treats as urgent. Every district the form offers exists in the districts table under the name the
form displays, and every district the visitor selects reaches a structured field. Zero
hand-written counts on the success card.

**Simplest acceptable implementation.** One shared timeline vocabulary, in
`src/lib/requirementIntake.ts`, holding each option's stored token with its English and Arabic
label, imported by the form for what it renders and by the route for what it accepts, so the two
cannot disagree again. The stored token stays English and stays inside the set the matcher and
the existing rows already use, because the six live rows and `matching.ts` are the system of
record here and the form is the thing that is wrong. Arabic gets labels, not new tokens. The
error path becomes field-level: the route already knows which field it rejected and should name
it, and the form should move focus to that control rather than printing a sentence at the bottom.

Districts come from the districts table through a small read endpoint or a server-rendered prop,
with the same `name_en` and `name_ar` the board reads, so the label a visitor picks and the label
they read back are one string. Selected districts beyond the first go into a structured field
rather than a prose note; if the schema holds only one `district_id`, the honest minimum is to
say so in the interface rather than to silently keep one, and the extra locations belong in a
typed array the matcher can read. The success card reads `done.notified.length`.

**What is deliberately not built.** No change to who is notified or how, because that is the
route's own behaviour and this package is about the form telling the truth about it. No new
Arabic marketing copy: the district names come from the table and the timeline labels are the
platform's own. No relaxation of the route's validation to accept whatever the form sends, which
would be fixing the wrong side and would let `1–3 months` into a column the matcher cannot read.
No match-count claim beyond the real count the route already computes.

**Stop condition.** A test enumerates every option the form renders in both languages and asserts
each is accepted by the route's validator, and its own sensitivity case asserts the test fails
against today's mismatched pair. A test asserts the Arabic urgent option produces a requirement
`matchListing` treats as urgent. A test asserts every district the form offers is one the
districts source returns, with the same names in both languages, and that every selected district
reaches a structured field rather than a note. A test asserts no count on the success card is a
literal. Live evidence in English and Arabic shows the pre-selected timeline is an accepted value
and that the district labels match the board's. All gates green.

**What shipped, and where the stop condition was substituted.** Every clause above holds except
one, and the exception is recorded rather than glossed.

`src/lib/requirementIntake.ts` is the single vocabulary: each move-in option's stored token with
its English and Arabic label and its urgency flag, the seven asset types, the two deal types and
the seven must-have conditions. The form renders from it, `POST /api/requirements` validates
against it and `matching.ts` derives its urgent set from it. `/post-requirement` became a server
page that reads the districts table and passes the rows to `RequirementForm`, so the control
offers the 77 locations across 21 cities the platform actually holds, grouped by city through the
same `cityLabel` the locations directory uses, instead of five Riyadh ids held as literals. The
city is no longer sent as a fact: the route derives it from the district row it now looks up.
Errors are named against the control that carries them, focus moves to the first one, and one
`role="alert"` summary sits above the fields. The success card counts `done.notified.length`.
Both read surfaces, the board and the requirement detail page, name the stored tokens through the
same vocabulary, so an Arabic reader is no longer shown `fitted` and `Q3`.

The substituted clause is the last one: "Live evidence in English and Arabic shows the
pre-selected timeline is an accepted value". Nothing is pre-selected, so there is no such
evidence and there should not be. The column is nullable, the route accepts an empty timeline and
one live row already carries none, which makes an unstated move-in date a real answer rather than
missing data; a radio that arrives already chosen states a constraint the visitor never gave, on
the one field that decides whether availability is scored at all. What replaces the clause is a
test asserting that no move-in radio is rendered `checked` in either language, plus the live
evidence that the values the rendered form emits are the accepted tokens.

The multi-location clause is also answered differently from the way it was written. "Selected
districts beyond the first go into a structured field" is not buildable against a record that
holds one `district_id`; the honest minimum named in the same paragraph is what shipped, and what
a real fix needs is written down as finding 102 rather than half built.

**Live-evidence limitation, stated rather than worked around.** `web_fetch_vercel_url` is the only
channel to the deployment from this environment and it issues GET only, so the submission path
cannot be exercised end to end against the running site. What is verified live is what the two
routes render in both languages. What stands behind the write path is the shared vocabulary and
`src/lib/requirementIntake.test.tsx`, which reads the `value` attributes out of the rendered
markup and tests each against the validator's own predicate, and which carries a sensitivity case
asserting the eight literals the shipped form held still fail that predicate. A live POST remains
the one piece of evidence this package does not have.

**What the live sweep found after the ship, and the correction it forced (finding 113).** The
stop condition asks for live evidence, and live evidence is worth having only if it is allowed to
disagree with a closure. It did.

Finding 108, "the read side stopped printing tokens", was closed against the tokens the new form
writes. Measured against the deployed corpus it was true of every future row and almost no
present one. `GET /api/requirements` on `dpl_5p9z42CxnpbVY4PHQFjtSgUvjJza` returns six real rows
whose must-haves are `Fitted`, `Parking`, `Metro nearby`, `24/7 access`, `Raised floor`, `Dock
doors`, `Street-front`, `Heavy power` and `High footfall`: display phrases the old form stored in
whichever language the visitor happened to be reading. `mustHaveLabel` resolved a stored value by
lowercasing it and comparing it to the token, so only the single-word phrases matched, and five of
the six rows on the board still showed an Arabic reader Latin script.

Corrected inside the same package rather than left for a reader to find. A stored value is now
recognised by its own label in either language as well as by its token, matching case
insensitively and treating the space and the underscore as one character, because "Metro nearby",
"metro nearby" and `metro_nearby` are one condition written three ways. That is a reading of what
the row already says, not a new claim about it.

`Heavy power` and `High footfall` were never offered by any form, so there is no token they belong
to and choosing one would file a condition under a name the visitor never gave. They keep their own
words. The other half of finding 113, a supervised one-time migration rewriting the stored phrases
as tokens, needs a database write channel this environment does not have and stays open.

Two tests in `src/lib/requirementIntake.test.tsx` guard the reading, and the first was run against
the pre-fix lookup and fails there. Suite is 1431 tests.

The second live-evidence limitation, also stated rather than worked around:
`/[locale]/requirements` and `/[locale]/requirements/[id]` are client components that fetch on
mount, so their served HTML is the loading state and the labelled read side cannot be observed in
any GET. What was verified instead is the payload they render and the labelling function itself,
under test, against exactly the values that payload carries. Making that substitution explicit is
what turned the defect up: the substitute evidence was the corpus, and the corpus disagreed.

## PKG-DEM2, a requirement's figures stop being invented (closed)

Findings 114, 115 and 116. The package that follows PKG-DEM1 directly, and it exists because
PKG-DEM1 made the path reachable: `/post-requirement` could not submit before it, so no live row
had ever carried a null size or a null budget, and the two public surfaces that print those
figures had never been asked to.

Size and budget are optional on the form and nullable in the column. `RequirementForm` sends
`Number(sizeMin) || null`, so a visitor who leaves either blank stores a null. The board then
rendered `{r.sizeMin} to {r.sizeMax} m²` and `Number(r.budget).toLocaleString("en-US")`. The first
printed the word `null` twice. The second, for a null budget, is not blank and is not an error: it
is the string `0`. A visitor would have been shown a requirement whose occupier had stated no
budget as a requirement with a budget of zero, and the detail card printed the same `0` under a
row labelled `Budget`, where it reads as the occupier's own number. No figure on this platform may
be invented, and this one was invented by arithmetic rather than by anybody's judgement, which is
why no review caught it.

The same stored fact also had four renderings across three surfaces, none through
`src/lib/format.ts`. `src/lib/requirementFigures.ts` is now the one reader. Its contract is that
each function returns a finished string or `null`, and `null` means the occupier did not state it;
it never means a fetch failed and it is never a number. The surface supplies its own phrase for the
unstated case, because what to say in place of a figure is a decision about a surface rather than
about a figure: the board simply does not draw the line, and the labelled detail grid says "Not
stated" and "غير مذكورة". A half-open range names the bound that exists, "from 500 m²" or "up to
1,200 m²", rather than the `200 to ? m²` the dashboard printed, which invites the reader to supply
the missing half. Equal bounds collapse to the single figure. The budget states itself as a
ceiling on every surface, because the column is `budget_sqm_max`. `scripts/ar-lint.mjs` reads the
new module, so its Arabic is inside the same banned-term gate as `format.ts`.

The Reply control beside every response is gone. It was a `span` with no handler, no role and no
keyboard path, and there was nothing for it to open: the route returns a respondent's name,
organisation and message and deliberately no email and no phone, so the platform holds no channel
from the occupier back to the person who answered. One honest sentence replaces it. What a real
reply loop needs is finding 116 rather than a mock-up.

Two defects found on the way and recorded rather than half fixed, both needing a database write
channel this environment does not have: the `create_requirement` RPC still holds
`coalesce(nullif(payload->>'city',''), 'Riyadh')` one layer under PKG-DEM1's city fix (finding
117), and registering interest inserts no notification row, so the occupier is never told a
response arrived (finding 118).

`src/lib/requirementFigures.test.ts`, 19 tests, added by hand to the `test` script. The guards read
the output string rather than the module's branches, and the sensitivity case reproduces both
shipped expressions and watches them print `null to null m²` and `0`. Suite is 1450 tests, all
passing.

Corrected during closure: the first commit of this package said in three places that `ar-lint` reads
the new module and it did not, because the edit adding it to the lint's file list was rejected and
not retried. It is applied now, and it was checked by putting an Arabic-Indic digit into the
module's `حتى` and watching the gate fail on it before reverting. A gate whose coverage is asserted
and never tested is a claim, not a gate.

Verified on `dpl_BJTZoWcdPKkpSFtZsR9sHGkozieR` in both languages, with the limit stated rather than
glossed: all six live requirements carry non-null size and budget, so no live row exercises the null
path and the fix is verified against the module under test while the deployment evidence establishes
only that the corrected code and dictionary are the ones being served. The live sweep also found
finding 119, two Arabic progress strings written `جاري` where the platform's other eight write
`جارٍ`, fixed in the closure commit.

## PKG-SUP2, one figure, one grammar, on every surface that shows a listing (closed)

Findings 120 to 124. The supply-side twin of PKG-DEM2, and it exists for the same reason that one
did: fourteen surfaces were each spelling a listing's price and area themselves, and a surface that
spells a figure has also, privately, decided what the figure means. Three of them decided wrong and
one of them decided nothing at all.

The unit was the first of it. `listings.asking_rent_sqm` is collected by a form whose own label
says the number is per square metre per year. The public listing page, the compare table, the map
pin and the broker profile rendered it that way. `/dashboard`, `/dashboard/listings` and `/find`
rendered it as `SAR/m²` with the year taken off, which means the lister who set an annual rate was
the one reader shown it as something else, on the screen whose whole purpose is confirming that the
price they entered is the price the market is being shown. The unit is decided once now, from the
deal type, and no surface spells it.

The absent figure was the second. `area_sqm` is nullable and seven surfaces interpolated it
unguarded, so a listing that states no area printed the word `null` beside a unit. One of those
surfaces is the printable flyer, where the defect leaves the building on paper. `/advisor` coerced
the same null through `Number()` and showed `0 m²`, which is worse, because zero is a figure and
nobody wrote it down. Every function in `src/lib/listingFigures.ts` returns `null` for a figure the
record does not state, and `null` is not "zero", not "?" and not the empty string: it is the
caller's instruction to draw no line at all. The flyer's tile grid became `auto-fit` so a dropped
tile leaves no hole rather than a gap in a row of four.

The numerals were the third, and they were the one already-live breach of a standing law.
`Number(price).toLocaleString()` with no locale argument resolves the runtime default rather than
the page's. Two of the surfaces doing it are client components, so on a phone set to Arabic the
public explore grid and the saved shortlist rendered asking prices in Arabic-Indic digits. Western
numerals in both languages is the first defect `format.ts` was written to kill, and it was still
live on the most viewed surface on the site. Three server-side copies of the same call sat one
environment setting away from the same result.

Finding 124 was found while rewiring the rest and is the same error reached from the other end:
`/api/advisor/shortlist` forwarded only the lease price column, which is null on every sale row, so
an occupier who asked the Advisor to buy was shown inventory with no prices at all, and `/advisor`
chose its unit by asking which column happened to be populated rather than what the deal type was.

`priceParts` exists because three cards set the amount large and the unit quietly beside it. That
is typography and it belongs to the card. Deciding what the unit says does not, which is why the
split happens in the module: both halves still come from one place, and a caller cannot take the
amount without the unit that qualifies it.

Fifteen dictionary keys holding hand-spelled unit strings were deleted from each locale, every one
checked for readers first. `common.sqm`, `building.perYear` and `locations.officeMedianSuf` were
kept because they still have them. `src/lib/listingFigures.ts` holds no Arabic literals, since it
delegates every string to `format.ts`, so unlike `requirementFigures.ts` it does not need adding to
the `ar-lint` file list and has not been added.

`src/lib/listingFigures.test.ts`, 22 tests. The guards read the module's output rather than its
branches, and four of them reproduce the shipped expression beside the fixed one and watch the old
one fail. Suite is 1472 tests, all passing.

Verified on the deployment in both languages, with the limit stated rather than glossed: `/listings`,
`/compare`, `/brokers`, a listing detail page and a printable flyer are reachable without a session
and were checked live. `/dashboard`, `/dashboard/listings`, `/me` and `/saved` sit behind one and
cannot be reached through the GET-only evidence channel available here, so for those four the
verification is the test suite, the typecheck and the production build, and the deployment evidence
establishes only that the corrected code is the code being served.

## PKG-FIG1, the grammar of a figure, on the surfaces that answer a person

Findings 125, 126, 127 and 128. The sibling of PKG-DEM2 and PKG-SUP2, aimed at what is left after
those two: the front door, the explore map, the Listing Studio preview, the Advisor and the match
explainer. Same defect class, further from the record. A surface that spells a figure has privately
decided what the figure means, and by this package the surfaces still doing it were the ones that
answer a person rather than list a row.

The worst of it was on the front door. `MarketingHome.tsx` and `MapExplorer.tsx` are client
components and both called `toLocaleString()` with no locale on the published, REGA-attributed Rent
Index band, so an Arabic-locale phone read the one externally attributed figure on the site in
Arabic-Indic digits, on the first screen. Two invented band bounds went with it, where one stated end
printed beside an absent end as a range ending at zero.

`scripts/ar-lint.mjs` gained a rule scoped to the language rather than to a directory: a string
literal carrying Arabic script may not carry an en dash. The old pair of rules banned it inside
`src/i18n` and banned the em dash everywhere, which left Arabic copy written in source unguarded, and
`src/lib/market/verdict.ts` was building `النطاق 1,800-2,900` there. The new rule was proved to fire
against a deliberate probe before the probe was removed.

Finding 128 was found by running `src/lib/figureGrammar.test.ts` for the first time and treating its
failures as a discovery instrument. It is the biggest of the four and the least visible: the Advisor
quoted the published band with the stored column key `sar_sqm_yr` printed where the unit belongs, the
shortlist could reach `Asking runs NaN to NaN`, and the match explainer told an occupier their
ceiling was "2000 per sqm", with no currency and no period, for a number their own form collected
under the label "Budget ceiling (SAR/m2/yr)".

One correction ran the other way. `requirementFigures.budgetCeiling` rendered a purchase budget as a
bare SAR total, and the test asserting it should was itself wrong: `RequirementForm` has one
unconditional budget field under one label, and `matching.ts` compares the column it fills against a
rate per square metre for sales as well as leases. The renderer was the only one of the three that
disagreed. Both were corrected and the test now carries the record it was wrong about.

Deliberately not done, recorded rather than left silent:

Finding 127's prose tail. `WatchBanner.tsx`, `market/analyser.ts`, `market/valueEvidence.ts` and
`agents/tools.ts` build a range inside a larger sentence that carries its own preposition. All are
locale-pinned, none uses a dash, and the Arabic case was checked by hand against the Unicode Bidi
Algorithm before it was excluded: a bare range inside an already-RTL paragraph reads low then high
correctly. Consolidating them would churn asserted AI answer text for no reader-facing gain.

An owner decision, recorded rather than taken: whether a requirement's purchase budget should be a
total rather than a rate per square metre. Today the form collects one budget under one label and the
matcher reads it as a rate, so a rate is what it is. If a purchase budget should be a total, the FORM
is what changes first, and the column almost certainly has to split in two, because one column cannot
hold two units. That is a decision about intake and it is not taken here.

Also out of scope and unchanged: `area/page.tsx`'s English-only age bucket labels behind the ADV-5C
mobility gate; `listings/page.tsx`'s median cell, which passes an explicit locale and breaks no law;
the Listing Studio's ungated inline Arabic literals, which overlap the deferred BASE prose strings;
and the single-character placeholders standing for an absent value on `compare`, `listings`,
`rent-index` and `ops`.

## PKG-FIG2, one table for a unit

Finding 129, P1, closed. The direct continuation of PKG-FIG1's live sweep, which had found the wrong
spelling of the lease unit on the English front door and treated it as one defect. It was not one
defect. A scan of every `.ts`, `.tsx` and `.json` file under `src` found nineteen distinct spellings
of units `format.ts` already owns, across eighty-nine occurrences, and it found the reason: there
were FOUR unit tables, not one, and only the first was typed.

`format.ts` `UNITS` is the canon. `labels.ts` held a two-entry map exported as `unitLabel`, in
spellings nothing renders, with zero callers anywhere in the tree. `attributeDisplay.ts` held a
six-entry EN to AR map keyed on the exact strings in `assetFields.ts`. `market/valueEvidence.ts` held
two regexes and a private duplicate of `joinUnit`, and neither regex matched `sar_sqm_yr`, which is
the string the ingest pipeline actually writes.

Findings 120, 124, 128 and 129 were therefore the same defect arriving four times. Each was fixed by
rewiring call sites, and each time a new spelling appeared where the previous sweep had not looked,
because nothing stopped one. This package fixed the structure rather than the instances: three units
the registry has always stored and the table never carried (`t/m²`, `kN/m²`, litres) were added,
fourteen aliases were added, the dead table was deleted outright, and the two live ones became
callers of `format.ts` rather than copies of it.

The largest instance was invisible to every previous sweep because it produced no wrong spelling at
all. `resolveUnitKey` had no alias for `m`, which is what the asset field registry stores in sixteen
fields, more than any other unit. An unresolved unit is passed through verbatim, which is deliberate,
correct, and the reason nobody saw that sixteen fields were printing a Latin `m` on Arabic pages. The
same passthrough is how `kN/m²` and `L` reached Arabic attribute rows still in Latin script. Nothing
raises an error when a lookup that finds nothing is supposed to find nothing.

The gate is the part meant to end the class. `ar-lint` gained a rule that READS the canonical set out
of `src/lib/format.ts` rather than restating it, because a hardcoded list inside the gate would have
been a fifth table and would have been wrong the first time `UNITS` changed. Its scope is stated in
the script: only separator-joined tokens are checked, so prose naming a period in words is out of
scope by design; comments are stripped first, because half the remaining matches in the tree are the
project's own record of the spellings it removed and a gate that made that record unwritable would be
the same mistake PKG-FIG1's first over-broad guard was; `format.ts` and test files are exempt;
anything else needs an explicit `unit-law` marker, the same visible-in-the-diff friction the em dash
rule uses.

Two sub-defects were closed beside the main one. `attributeDisplay.ts` and `LocationFacts.tsx` each
pinned half a number format, fixing the numbering system to Latin and leaving everything else to
whichever CLDR data the runtime happens to carry, which on a client component is the visitor's
browser rather than this deployment. This was first written up as a grouping defect and the claim was
checked before it was believed: on the runtime this ships on, `ar-SA` with Latin numerals groups with
the same comma `en-US` does, so no grouping difference exists and none is claimed. The difference
that does exist is a `U+200E` LEFT-TO-RIGHT MARK emitted before the minus sign of a negative value,
an invisible control inside a figure a reader can copy out of the page.

One existing assertion was rewritten rather than deleted. `valueEvidence.test.ts` asserted that the
English unit carried no word joiner, and that was the local rule of one file rather than the
platform's: `formatUnit` has always joined both languages, and English breaks after its slash at 320
pixels for exactly the reason Arabic did.

Deliberately out of scope: the English `/` against the Arabic `·` separator. It reads as an
inconsistency and it is a decision. `·` doubles as the LIST separator in the very strings that used
it as a unit separator, so `3,700 SAR/m²·yr · 1,200 m² · KAFD` is genuinely ambiguous to an English
reader, while in Arabic the middle dot is the right typographic choice and carries no such clash.
`format.ts` was not changed.

### PKG-FIG2 closure, a heading is a claim about the column under it (findings 130, 131, 132)

Finding 129 built one unit table and a gate that reads the canonical spellings out of it. The gate
checks spelling. It cannot see authorship, and it cannot see a heading, and both of those turned out
to be live defects on public pages.

Finding 130, the front door. The hero band panel captioned the published Rent Index band with
`home.medianUnit`, valued `Average {unit}` and `المتوسط {unit}`. The word was typed once and rendered
over whatever row the query returned, so a median cell and an average cell were captioned
identically; the key said `median` and the value said `Average`; and the select did not fetch
`stat_kind` at all. `stat` is now a required field on `HeroBand`, so the compiler is what stops a band
travelling without one, and the word comes from `statisticLabel(normalizeStatisticKind(r.stat_kind))`,
which routes an unrecognised value to `Unlabelled` rather than to a named statistic. `normalizeStatisticKind`
is case sensitive on purpose: `Average` with a capital letter is a near miss, and a near miss must
cost the caption its name.

Finding 131, authorship. Forty six unit shaped strings per dictionary, seven of which put Latin script
inside Arabic copy, on `/invest` and `/hbu`. The spelling gate could not see them because they were
spelled correctly. `ar-lint` gained a fifth pass, an authorship rule that fires when an English unit
spelling appears inside a literal that also carries Arabic script, proved to fail against HEAD with
seven hits before it was believed. `unitText` was added beside `formatUnit`, deliberately not a second
table: `formatUnit` is now defined in terms of it, and the difference is the word joiner. A `U+2060`
belongs on a page, where it stops a unit breaking across two lines, and does not belong in a CSV
header, where it is an invisible control character in someone else's spreadsheet that survives a copy
and defeats an exact match. The remaining surface is recorded rather than implied, in the findings
register: `/invest`'s three private formatters, the Latin `M` suffix on Arabic pages, the Latin year
heads in the investment CSV.

Finding 132, the heading. Two public tables printed `Average SAR/m²` over rows whose stored unit is
`SAR/m2/yr`. Both halves were wrong. The statistic was a word someone typed once, so the column said
the same thing whatever the rows said, and the unit dropped the period, and a reader who assumes a
month is out by a factor of twelve with nothing on the page to warn them. `src/lib/market/columnHeading.ts`
resolves a heading from the cells beneath it on the rule the passports already follow: name a thing
only if every record agrees, and say nothing rather than guess. Mixed statistics get the neutral
quantity word. Mixed or unresolvable units get no unit at all, and one row arriving without a unit
denies the whole column, which is what makes the Rent Index page's narrow fallback select safe, since
it does not fetch `unit`. `PublishedKpis` gained a resolved `unit` beside a now honest `stat`, which
had been `rows[0].stat_kind`, the first row's word standing for the whole set.

A unit and a statistic name are not market figures. Resolving a heading over rows whose figures the
licence withheld publishes nothing Codex item 2 fences: the heading describes the column, and each
cell still decides on its own whether it has anything to put in it.

The blind spot is stated rather than closed. When units do not agree the heading names none, and the
cells render bare numbers, so a mixed unit column would show figures with no unit anywhere. That case
does not exist today, since all seven published segments store `SAR/m2/yr`. It is the first thing to
close when a second unit enters the index.

One thing was left asserting a statistic in copy on purpose. `rentIndex.kpiContracts` describes the
source's methodology, REGA publishing averages of registered contracts, not our rows. Building it from
`statisticLabel` would also produce ungrammatical Arabic, because the label carries the definite
article.

Live evidence, `1cfb308b` on `satmarkets-kb9l9mzq9`, against the preceding production deployment
`1a56dd84` as the control. Arabic Rent Index head before: `المتوسط ريال/م²` and `النطاق (ريال/م²)`.
After: `المتوسط، ريال/م²·سنة` and `النطاق، ريال/م²·سنة`. The proof the statistic is read rather than
typed is that the same resolver answers `Average` on the Rent Index and `median` on `/market` on the
same deployment, because the two pages read different rows. Full table in
`docs/handback-pkg-fig2.md` section 12, including the one control fetch that failed and is recorded as
missing rather than described.


## PKG-LS2, the unit the lister is told they are typing (findings 133, 134)

PKG-FIG2 closed the surfaces that RENDER a figure. This closes the surface that COLLECTS one, which
is the only place in the chain where a wrong unit cannot be detected afterwards. What a listing
stores in `area_sqm` and `asking_rent_sqm` is a bare number. The unit exists only in the words above
the box, so if those words name a unit the platform does not use, every figure derived from the
number is wrong at the source and consistently so, and no downstream gate can see it, because there
is nothing wrong with the number.

Finding 133, the class. Three surfaces built a field label by concatenating `field.unit` verbatim:
`ListingStudio.tsx` and `EditListingForm.tsx` in `renderField`, and the numeric facet placeholder on
the public `/listings` page. The registry string is a developer's note, not copy, so an Arabic lister
filling in a warehouse was asked for `ارتفاع السقف (m)`, `مساحة الطابق (m²)`, `(kVA)`, `(t/m²)`,
`(kN/m²)` and `(L)`, and for a lease term in the bare English words `(months)` and `(years)`. Seventy
registry fields declare a unit. The canon in `format.ts` holds م, م², ك.ف.أ, طن/م², ك.ن/م² and لتر for
exactly these, and nothing was reading it. The sharpest evidence that this was an oversight rather
than a decision is `attributeDisplay.ts`, which already routes the VALUE through the one table and
already special cases `months` and `years` as counted nouns: the number a reader is shown on a
listing page carried the right unit while the box the lister typed it into carried the wrong one.

Finding 134, the instance underneath it. The Studio asked for `Area (sqm)` and
`Asking rent (SAR per sqm per year)`, and in Arabic `المساحة (متر مربع)` and
`الإيجار المطلوب (ريال للمتر المربع سنوياً)`. None of those four unit spellings is a spelling
`format.ts` knows. The edit screen for the same two stored numbers already said `Size (m²)` and
`Asking rent (SAR/m²/yr)`. So a lister created a price under one unit and edited it under another, on
two screens of the same product, and had no way to tell which one the stored number was. Both screens
also decided the deal to unit question inline with a `deal_type` comparison, while
`listingFigures.ts` has owned that decision for every rendering surface since PKG-SUP2.

The fix is one module, `src/lib/fieldLabel.ts`. `fieldUnitText` and `fieldUnitLabel` resolve a
registry unit through the one table, with `months` and `years` taken from the exported `COUNTED`
forms rather than passed through, because a label carries no count and `formatCounted` would prefix a
numeral. `fieldLabel` puts the unit after the base label and appends nothing else, so a caller that
wants a required marker or a range hint adds its own and cannot put one inside the parentheses where
it would read as part of the unit. `areaFieldLabel` and `priceFieldLabel` cover the two platform
columns that are not registry fields, with the deal read from `priceUnitKey` and the noun settled as
`Area` rather than `Size`, because `Area` is what the public dictionaries and `netArea` already say
and the label a lister types into should be the label their reader is shown. All five call sites now
go through it.

Guards. `fieldLabel.test.ts` asserts the Arabic rendering of every unit class the registry declares,
asserts that every declared unit either resolves or is a counted noun so a new one cannot fall
through verbatim, and carries two source rules: no file outside the module may put `.unit` in
parentheses by hand, and neither intake screen may spell an area or price unit itself or decide the
price unit on a line that names a currency. Against `95f162b` both fail and name all five sites.
`fieldLabel.ts` joins the ar-lint pass A watch list, since it now holds shipped Arabic copy.

One existing guard was superseded rather than kept. The finding 126 test asserted that the Studio
still contained the literals `Asking rent (SAR per sqm per year)` and
`الإيجار المطلوب (ريال للمتر المربع سنوياً)`, on the reasoning that the form label was the only thing
in the tree stating what `listings.asking_rent_sqm` holds, so deleting it would remove finding 120's
own evidence. That reasoning was right about why the label matters and wrong about where the evidence
belongs: neither spelling was one `format.ts` knows. The assertion is now that the label is built by
`priceFieldLabel`, which is the same function every rendering surface reads, so the evidence is
stronger than the literal it replaces and cannot drift from them.

Live verification, and the correction that came out of insisting on it. `web_fetch_vercel_url` is
GET only, and `/dashboard/new` and the edit form are both session gated, so neither intake screen can
be fetched from this environment at all. Those two remain implemented and not live verified, and are
recorded that way rather than described as shipped.

The third call site, the numeric facet placeholder on public `/listings`, was written up as dark
before the package shipped, on the strength of one fetch of `/ar/listings?asset=office` that returned
200 with zero `f_*` inputs. That was a true observation and a false conclusion. The gate is
`coveredFacetFields(assetType, listings, minCount = 3, minCoverage = 0.4)`, which is a per asset type
threshold, so office being under it says nothing about warehouse. Fetching the other asset types
rather than generalising from the first found the surface live, and it carries the defect and the fix
in the same three placeholders.

Deployment `3f13eb6` (`satmarkets-5won7hz03`), `/ar/listings?asset=warehouse`, 200:

    الارتفاع الصافي (م) الأدنى
    أبواب التحميل الأدنى
    الطاقة (ك.ف.أ) الأدنى

The same path on `95f162b` (`satmarkets-qrbf3fcft`), the deployment immediately before this one, 200:

    الارتفاع الصافي (m) الأدنى
    أبواب التحميل الأدنى
    الطاقة (kVA) الأدنى

That is the finding rendered to an Arabic reader in production, and the same page after the fix. The
middle field is the control in both: `loading_docks` declares no unit, so it takes no parentheses
before or after, which is what separates a unit that is now translated from a label that is merely
different. English is unchanged and correct on the new deployment, `Clear height (m) min`,
`Dock doors min`, `Power (kVA) min`, so the two languages expose the same three fields and each shows
its own canonical spelling. Zero Arabic-Indic digits on either page.

Two things worth keeping from this. The first is that a coverage gate reading zero is not evidence
of absence until every input to the gate has been tried, which is the same shape as the
`?view=insights` vacuous check caught in PKG-FIG2. The second is that office really is dark, so the
inventory density that would light the office facets is still owed, and the two intake screens are
still owed a session-capable channel.


## PKG-LS3, telling the lister what is missing, and giving them the one field that had no route (findings 135, 136, 137)

**User journey improved.** A lister who has already published. Until now the product spoke to them
once, inside the Listing Studio, and never again. After this package the screen they own the listing
from names every fact absent from it and says why each one matters, in their own language, and the
one gap that had no self serve route at any stage can be closed from that screen.

**Observed problem.** Measured live on `3f13eb6` through `GET /api/listings`, which is public and
unauthenticated and returns every column of every published row. Fifty rows, HTTP 200. Running the
repository's own `assessListing` over them puts all fifty in the `incomplete` band. Description is
absent in both languages on 50 of 50. Coordinates on 50 of 50. Supporting documents on 50 of 50.
Floor plan on 49 of 50. Video on 49 of 50. Building on 44 of 50. Two rows carry no contact route at
all and one has no Arabic title. Median score 60, range 40 to 76, zero contradictions. That is not a
corpus that needs a better ranking algorithm. It is a corpus nobody was ever told about. The
coordinates gap was worse than untold: `PATCH /api/listings/[id]` refused it outright with 403 and
the words `The location of a published listing is changed by SAT.`, so an essential check named a gap
the lister structurally could not close.

**Measurable outcome expected.** Re-measure description, coordinate and document presence from the
same public endpoint against today's 50 of 50 baseline. The claim being tested is that naming a gap
to the person who can close it closes some of them; if the three counts have not moved, the panel is
not the constraint and the next move is demand side, not another lister surface.

**Simplest acceptable implementation.** One server rendered completeness panel on the manage screen,
one count line per row on the inventory screen, the floor plan fix, and one narrow new editability
category. No new dictionary keys, no new tables, no background jobs, no new dependency.

**What will not be built.** No public quality badge, score, band or colour, because D24 holds that
quality is not verification and this model must never produce one. No change to a pin that already
exists. No movement of `district_id` on a live listing, from any screen, at any stage. No email
nudges, no auto fill, no ranking penalty for an incomplete listing, no bulk action.

**Date that decides whether to continue.** Re-measure on 1 September 2026.

The narrowing that made the coordinates gap closable. `lat` and `lng` sit in `DRAFT_ONLY_EDITABLE`,
and that rule is written against substitution: a reader relied on the pin, so moving it changes what
was advertised. The reasoning does not reach a listing that never had a pin. Nothing was relied on,
the space is on no map, and it answers no radius search. Supplying the first pin adds a fact;
replacing an existing one substitutes one. `FILLABLE_WHEN_ABSENT` and `mayFillAbsent` in
`listingEdit.ts` open exactly the first case. `mayFillAbsent` is a widening of `mayEdit` and never a
narrowing, asserted by a test that walks every field in both existing sets at both stages, and it
fails closed on a field nobody declared. `mayEdit` itself is byte identical, so every existing caller
and test is untouched. The route tests the value on the row rather than what the client asserts, and
the form is gated on the same predicate computed on the server and passed down as `mayPin`, so the
screen cannot offer a write the route refuses.

`district_id` is deliberately not in that set. Every published row already carries a district and
that district is what places the listing in search today, so deriving a new one from a first pin
would be a substitution wearing an addition's clothes. A first pin that disagrees with the recorded
district is a real disagreement, and it is recorded as finding 137 rather than resolved silently.

Finding 136 is smaller and was found by reading the model rather than the corpus. A floor plan
arrives either as a link in `floorplan_url` or as a `listing_media` row of kind `floorplan`, and the
check read only the column, so a lister who uploaded one through the docs panel was told it was
missing while the page above them displayed it. The Studio hid this at creation time behind its own
sentinel, which is why it only bit a lister returning to a listing that already exists. The count is
optional on `ListingFacts`, so a caller that cannot supply it falls back to the column rather than
assuming either way.

One trap avoided rather than a defect fixed. The inventory query selected seventeen columns. Feeding
such a row to `assessListing` would have reported every unselected column as a fact the lister failed
to supply, producing an inflated and false missing count on the exact screen meant to build trust.
The select was widened to `*` before the count line was written, and the reason is recorded in the
file so it is not narrowed again for performance.

Gates. `tsc --noEmit` clean, 1513 tests pass, `ar-lint` clean, `prose-scan` gate zero on public page
source with the deferred BASE count unchanged at 366. Shipped as `44a143f`, built to production as
`dpl_8ghGvXwiLToJZDwxVbCGqZFUcQQM` on `satmarkets-d134yxarx-sat-markets.vercel.app`, READY. That
deployment also carries `d2d2fb5`, the PKG-LS2 closure commit for which GitHub never fired a
deployment, so the READY gate PKG-LS2 was owed is now satisfied by this build rather than by its own.

Live evidence on that deployment. `GET /api/listings` returns HTTP 200 and the same fifty rows with
the same zeroes, which is the before measurement anchored on the build that carries the fix rather
than on an earlier one. The public listing page renders in both languages, `/ar` at `lang="ar"
dir="rtl"` and `/en`, both `noindex, nofollow`, and neither carries a single string from this package:
zero occurrences of the panel heading, the facts on file line, the map label or the SAT assessment
note in either language, and zero Arabic-Indic digits. That is the D24 boundary tested rather than
asserted. The PKG-LS2 facets re-confirm on the same build, Arabic `الارتفاع الصافي (م) الأدنى`,
`أبواب التحميل الأدنى`, `الطاقة (ك.ف.أ) الأدنى` and English `Clear height (m) min`, `Dock doors min`,
`Power (kVA) min`, with the unitless middle field as the control in both and zero Latin unit
leakage.

Honest limits. The public endpoint carries no media count, so the photo and photo set checks read
missing because the channel cannot decide them, not because it proved them absent; the `incomplete`
band conclusion survives regardless, since description and coordinates alone are enough to produce
it. Both screens changed here are session gated, and `web_fetch_vercel_url` is GET only and
unauthenticated, so neither is live verifiable end to end from this environment. That is now the
third package in a row owing the same evidence, and a session capable channel is the thing that would
retire the debt.

## What the next highest-value action is, after PKG-LS3 (Elite standard, required record)

The reconciled Elite section requires that after each foundation package the next highest-value
action be named explicitly as implementation, design, user research, data acquisition, legal work or
operational preparation. After PKG-LS3 it is **user research and design-partner recruitment, not
implementation.**

The evidence for that, measured live on `dpl_EaFKqyyh9ht7gPVMJ4fALuvmfU5v`. The supply side holds 50
published listings, and PKG-LS3 established that every one of them is incomplete and that nobody had
ever been told. The demand side holds six requirements, of which five share a single seed timestamp,
and `interest` is zero on all six. So no lister has ever registered interest in any brief on this
platform, once.

The reflex reading is that the loop is unbuilt. It is not. `POST /api/requirements/[id]/interest`
exists with the SM-P0-002 trust bar, anonymous 401 and unverified 403.
`GET /api/requirements/[id]/matches` answers which of the caller's own listings answer a brief, scoped
to one account by session, returning named dimensions with a state and a bilingual sentence each and
a remedy for every unknown. `dashboard/requirements` renders that model with reasons rather than a
score, derives city from the district record rather than guessing it, and links each unknown to the
listing field that would resolve it. The one piece deliberately absent is notification, held by O12
until consent is designed and recorded, which is an owner item and not an engineering one.

A complete, careful, well reasoned loop with zero traffic through it is not a loop that needs more
engineering. Building another surface on top of it would be building against no observed behaviour,
which is the failure mode the six-field discipline exists to prevent. The product is at E0 and the
gate to E1 is design-partner alpha, so the constraint is participants.

What is therefore preparable now without participants, in order: the ELITE-1 instrument, meaning a
written task protocol per critical journey with a severity scheme and a research repository, which is
buildable today and is the thing that makes the first partner session worth having; the ELITE-4
manual accessibility pass over the journeys that already exist; and the ELITE-8 event dictionary with
its lawful basis and retention position, which must be written before any instrumentation and which
also unblocks measuring whether PKG-LS3 moved anything. Recruiting the partners themselves, and the
O12 consent position that would let SAT tell a lister a brief matches their space, are owner items.

The 1 September 2026 re-measure stands regardless, and it is cheap: the same public endpoint, the
same three counts.

## PKG-ELITE-E1, slice C: a first map pin stops silently contradicting the record (finding 137, closed)

**The six required fields, before the slice.**

*User journey improved.* Supply side: a lister places the first pin on a listing that already
records a location, in Listing Studio or on the dashboard listing screen. Demand side, indirectly:
a searcher relies on where a space says it is.

*Observed problem or unavoidable foundation.* Observed, and named as finding 137 in PKG-LS3 rather
than invented here. `LocationPicker` derived a location from the pin on every move and overwrote
whatever was on file, and it labelled the result District whatever it actually was. Every published
listing already carries a `district_id`, which is the field that places it in search today, so a
later pin could silently replace a fact a lister or SAT had recorded. Two live defects sat inside
that one behaviour: a silent rewrite, and a Law 7 violation, because the nearest row to a pin is
frequently a development and KAFD, ITCC, Laysen Valley and Roshn Front all carry listings today.

*Measurable outcome expected.* Zero silent rewrites of a recorded location: a later pin may offer a
replacement and may never take one. Zero rows countable as production inventory while their pin and
their record disagree. Every lister-facing statement about a disagreement present in both languages
and naming no column, table or distance model. Measured by test rather than by traffic, because
this is a correctness property and not a behavioural one.

*Simplest acceptable implementation.* One pure module with no I/O, `src/lib/locationConsistency.ts`,
read by four surfaces that each already existed: the picker, the PATCH route, the launch gate and
the completeness model. No new table, no new query pattern beyond one row lookup, no new dependency,
no migration, and no dataset.

*What will not be built.* No containment test, because SAT holds no polygon to contain anything. No
`verified` verdict, now or later, while the data is one point per row. No boundary dataset purchased,
licensed or scraped: Codex forbade it in this package and owner ruling 7 forbids representing that
data rights exist. No reverse geocoding of a pin into a district name. No automatic correction of
either side of a disagreement, because deciding which of two recorded facts is wrong is not a
reading. No new marketplace surface, per Codex item 7.

*The date or evidence that decides whether to continue.* Nothing here continues. The slice closes
finding 137 and the module is complete under its own constraint. What would reopen it is a single
event and not a date: SAT obtaining authorized canonical district geometry. On that day the
containment test Codex asked for becomes possible, `unverifiable` stops being the honest answer for
rows with no point, and a `verified` verdict can exist for the first time. Until then this module is
finished, and the 1 September 2026 corpus re-measure will report how many published rows carry a
pin at all, which today is zero of fifty.

**The evidence source for the boundary decision, as Codex required it be documented.** SAT holds no
district boundary geometry. The deployed production preview is the evidence and it is conclusive:
the listings page ships the whole location set to the browser, and every row carries an id, an
English name, an Arabic name, a latitude, a longitude and a kind. No polygon, no radius, no bounding
box, no area. That is why the module can only ever say two points are too far apart to describe one
building, and can never say they match.

**What shipped.** `nearestDistrict.ts` renamed to `nearestLocation.ts`, because the old name
asserted something the function cannot know, with `kind` now travelling on every row so the label
comes from `locationKind.ts`. `locationConsistency.ts` with five verdicts and no sixth.
`LocationPicker` no longer rewrites a recorded location at all: only an empty one is answered from
the pin, and a closer alternative becomes an offer with a button. `PATCH /api/listings/[id]` refuses
a contradicting pin with 409 and `code: location_contradiction` in both languages. `launchGate.ts`
gained a fifth fact and two blockers, with `unverifiable` mapping to not checked on purpose.
`listingQuality.ts` relays the contradiction to the lister and relays rather than restates, so no
second place in the codebase can decide what a district is. Both dashboard location selects repaired
to the PKG-NM1 pattern, which raised finding 138.

**After this slice, the next highest-value action is unchanged from the PKG-LS3 record below: user
research and design-partner recruitment, not implementation.** Slice C was a correctness repair on a
journey that already exists, not a new capability, so it moves nothing about that judgment. Slices D,
E and F of this package are the research instrument, the accessibility pass and the event dictionary,
which is the same answer expressed as work.

## PKG-ELITE-E1, slice D: the ELITE-1 research instrument, in both languages (Codex item 4)

**The six required fields, before the slice.**

*User journey improved.* None directly. This slice improves no journey; it is the instrument that
decides which journey gets improved next. Every journey it observes already exists: organisation
onboarding, Listing Studio, listing detail, search, comparison, requirement creation, matching,
notification control.

*Observed problem or unavoidable foundation.* Observed, and it is the reason this package exists at
all. The product carries 50 published preview listings, 6 requirements and 0 registered interests.
Six requirements and zero interests are not behavioural evidence, and the last four packages have
each been decided from internal reasoning against the register rather than from anything a user did.
That is a stable and worsening condition: the register can rank findings against each other but it
cannot tell us which of them a landlord would actually hit. The instrument is what ends it.

*Measurable outcome expected.* Ten sessions, 5 supply side and 5 demand side, each producing an
independent completion rate per task, a time, an error count, a help count, an abandonment record,
a verification comprehension score, a rent basis comprehension score and a confidence score. The
threshold that turns those into work is written into the instrument rather than decided afterwards:
a task below 3 of 5 independent completion is a build input for the next package, and any critical
finding is fixed before round 2. That is the measurable outcome of this slice, and it is deliberately
a measurement of the product rather than of the instrument.

*Simplest acceptable implementation.* Two Markdown files at full parity, `docs/research/
elite-1-instrument-en.md` and `docs/research/elite-1-instrument-ar.md`, carrying all eleven artefacts
Codex named plus the standing constraints. No research tooling, no recruiting platform, no survey
product, no consent-management service, no participant database in this repository. The round runs on
the existing preview deployment with 10 ordinary preview accounts.

*What will not be built.* No participant is contacted: recruitment is an owner item and no session is
scheduled until the owner authorises it. No confidential commercial requirement is collected, and the
instrument supplies fictional briefs precisely so that the tasks never need one. No market data, no
demand estimate and no pricing evidence comes out of this round, and section 11 of the instrument says
so in both languages. No conformance claim of any kind. No third-party analytics is wired to observe
these sessions; the event dictionary is slice F and is a separate decision. No product change is made
in this slice, because a slice that both writes the test and changes the thing under test measures
nothing.

*The date or evidence that decides whether to continue.* The instrument is complete when it is
written; it does not continue. What continues is the round, and the round is blocked on one owner
decision, which is authorising recruitment. If that authorisation has not arrived by 1 October 2026,
the honest reading is that design-partner research is not the owner's next priority, and the ranking
in this roadmap changes rather than the instrument.

**The confidentiality position, stated once and carried in both files.** A tenant expansion plan, a
rent under negotiation, a lease expiry and a named counterparty are confidential by default. The
instrument does not ask for any of them, the facilitator does not write one down if it is volunteered,
and no figure a participant states about their own portfolio reaches the product, a document or any
later claim about the Saudi market. Recording requires explicit per-session consent before the
recording starts, consent to observe is not consent to record, and consent to record is not consent
to quote by name. The participant record kept in this repository carries side, role group, city,
portfolio size or search scope, session language, prior platform use and device, and carries no name,
employer, phone number or email.

**What shipped.** Eleven artefacts in each language: participant criteria and a six-question screener
with explicit exclusions; an invitation template sent by the owner; a consent and recording script
whose third and fourth paragraphs may not be paraphrased; a facilitator guide with three permitted
questions, an 8 minute task stop and a rule against the word just; test account and data requirements
including a pre-round check that the preview carries enough inventory in both languages to run the
demand-side tasks at all; 8 supply-side and 7 demand-side task scripts grounded in the real routes in
`docs/routes.md`; an observation sheet with independent completion separated from completion after
help; a five-level severity rubric assigned by the observer from what happened rather than from what
the participant asked for; a task-success calculation that reports fractions alongside percentages
because a denominator of 5 does not carry two significant figures; interview questions ordered so the
comparison questions precede anything product-specific, with a named list of questions that are never
asked; and a findings and retest template whose findings enter `docs/findings-register.md` under their
own numbers so research and engineering findings rank against each other.

Two task scripts exist to expose work this package already shipped. S4 puts finding 137 in front of a
real user for the first time, and asks not whether the contradiction message is liked but whether it
reads as a correction or as a rejection. D6 asks what participants expect about notification and
visibility while O12 is unresolved and outbound matching notifications are off, which makes it direct
input to that decision rather than a usability question, and it is one of the two tasks the guide
forbids cutting for time.

**After this slice, the next highest-value action is still user research, and it is now blocked on
one owner authorisation rather than on missing preparation.** That is a change of kind: before this
slice, research was ranked first and unstarted; after it, research is ranked first and ready. Slices
E and F, the accessibility pass and the event dictionary, are the remaining engineering work that
does not depend on the round, and they run next while the authorisation is outstanding.

## PKG-ELITE-E1, slice E: the ELITE-4 manual accessibility pass over four journeys (Codex item 5)

*User journey improved.* All four of them. This is not a polish slice. A keyboard-only or
screen-reader user could not add a photo to a listing at any point, could not press the availability
reaffirm control at all because it sat under a full-row link overlay, could not leave the gallery
lightbox once inside it, and could not reach a single map pin. Each of those is a journey that ends,
not a journey that is awkward.

*Observed problem or unavoidable foundation.* Observed problem. Every defect below was found by
reading the running source of the four journeys against the ten dimensions Codex named. None was
hypothesised in advance and none came from a checklist applied without looking.

*Measurable outcome expected.* Independent task completion for a keyboard-only participant in the
ELITE-1 round. Slice D already measures independent completion, time, errors, help requests and
abandonment, so the effect of this slice is measured by an instrument that exists rather than by an
assertion made here.

*Simplest acceptable implementation.* Native semantics wherever the platform supplies them, ARIA only
where it does not. No component library, no automation vendor, no visual redesign, no new token. Four
of the fixes are one attribute. The largest is a focus trap.

*What will not be built.* No axe or automated accessibility harness, because Codex item 7 forbids new
tooling in this package. No accessibility statement, no VPAT and no conformance claim. No contrast
repaint: every contrast defect is recorded rather than fixed, because a token change reaches surfaces
this pass did not read and belongs to the parked visual package.

*The date or evidence that decides whether to continue.* The design-partner round. If a keyboard-only
or screen-reader participant still cannot complete a core task, the remaining recorded defects are
reprioritised on that evidence rather than on the severity label written here.

**What was found.** 126 defects across the four journeys: 7 critical, 41 high, 52 medium, 23 low and
3 cosmetic. All 7 critical and all 41 high are fixed and shipped in `ae7b198`. 54 of the remaining 78
are recorded in `docs/findings-register.md` as findings 139 to 192.

**The gap in that last number is stated rather than smoothed over.** The four per-journey audits were
carried out in a working context that was compacted before the register was written, and 24 of the
lower-severity items did not survive that compaction precisely enough to be restated truthfully.
Writing plausible entries to reach 78 would have been worse than recording 54 and saying so. None of
the missing 24 is a keyboard-blocking or name-missing defect, because every defect of those two kinds
was graded critical or high and is therefore fixed.

**The three environment facts that shaped the method, and bound every claim made.** There is no
accessibility automation anywhere in this repository: no axe, no pa11y, no jest-axe, no Lighthouse
step, no accessibility npm script, and `e2e/` holds two specs neither of which is one. No development
server is reachable in this container: `http://localhost:3000/en/login` returns status 000. And the
only live channel is unauthenticated GET, which cannot hold a session, while three of the four
journeys are session gated for most of their length. So every finding in this pass was established by
reading source. Nothing was established by operating the product with a keyboard, by listening to a
screen reader, or by measuring a rendered contrast ratio. Contrast figures are arithmetic on declared
token values, and the record says so wherever one appears.

**The five-way labelling Codex required, answered honestly.** Automatically tested: 0, and the single
automated accessibility assertion that existed in the whole codebase was one asserting the presence
of an `aria-label` this pass removed as a defect, so it was inverted rather than kept. Manually
tested by Claude: 126, all of them. Tested on a real physical device: 0. Independently tested by a
human accessibility specialist: 0. Still awaiting verification: 126, fixed and recorded alike,
because a source-read fix is a plausible fix and not a verified one. **No independent WCAG
conformance is claimed anywhere in this slice.**

**The repairs that mattered most.** A `.input:focus{outline:none}` rule at specificity (0,2,0) was
beating the platform `input:focus-visible` rule at (0,1,1), so every text control in the requirement
form and the signup flow had a 1.17 to 1 box shadow as its only focus affordance; that is one central
fix reaching two journeys. The three media inputs were `display:none`, which removes an element from
the tab order entirely. The availability control was under `a.rowlink::after`. The lightbox had no
dialog role, no focus trap and no return path. The map published its entire content through a canvas
and nothing else. The shared icon wrapper emitted every decorative glyph into the accessible name of
whatever control contained it, which is one attribute fixing noise on all four journeys at once.

**One latent bug was found in the course of the work and is worth naming, because it would have made
another fix decorative.** `ListingStudio.save()` called `setError(msg)` and then `go(target)`, and
`go()` cleared the error unconditionally in the same React batch, so the sentence was destroyed
before it could render. `go()` now takes a `keepError` parameter and all three error-then-navigate
sites pass it.

**Three proposals from the audit were rejected during the fix, and the rejections are the useful
part.** `role="img"` on `ProvenanceChip` would have made its contents presentational, and its
description text does not contain its visible tier text, so it would have created exactly the
label-in-name defect the neighbouring finding reports, on chips that render inside the passport
summary. `role="menu"` was rejected twice, on the filter panel and the header popup, because free
text inputs, headings and arbitrary links are not valid children of a `menu`. And the Share
affordance on the listing detail page was removed rather than implemented: it was a non-interactive
span styled as a chip, and inventing a share behaviour inside an accessibility pass would have been
feature expansion under a package that forbids it.

**Nine of the 54 recorded findings corrected the description they came from**, because each was
re-verified against the shipped source rather than transcribed. The table-semantics breakpoint is
920px and not 1024px. The tab bar items are not below the touch floor, only its viewport consumption
is a defect. The Listing Studio step state is missing for sighted users on the steps that are not
open, which is the inverse of how it was first written. The passport already uses a `<dl>` for its
provenance rows. The heart glyph is already out of every accessible name, and the real residual is
that the card carries no save control. Three quoted contrast ratios were recomputed and are not the
figures first recorded.

**Live evidence.** `ae7b198` is production, deployment `dpl_DYFyVHfPMYX8XyBVupLNYBkCCCkz`, READY.
Checked on the deployed pages rather than locally: `/en/listings` carries `role="search"`, a
`role="status"` polite result count, `aria-haspopup` on 10 filter pills, `aria-pressed` on the
verified toggle and 90 decorative SVGs now carrying `focusable="false"`; `/ar/listings/[id]` renders
`dir="rtl"`, 2 `<summary>` elements of which 0 carry an `aria-label`, which is the label-in-name fix
live, and the Share chip is absent from the rendered document while its dictionary key survives only
in the serialized payload. Every session-gated fix, which is most of journeys 1, 2 and 4, remains
unverifiable from here and is recorded as such in section 9 of the status ledger.

**Gates.** `npx tsc --noEmit` clean, `npm test` 1527 pass and 0 fail, `npm run ar-lint` clean,
`node scripts/prose-scan.mjs` GATE 0 in 0 files, Vercel READY. Two strings added during the fixes
were first written as a component-local bilingual object inside a public page, which the prose gate
correctly refused; both now live in `reqDetail` in both dictionaries.

**After this slice, the next highest-value action is implementation, specifically slice F.** The
accessibility pass has produced a queue of 54 recorded defects and no behavioural evidence about
which of them costs a real user a task. The event dictionary and scorecard are what turn the
design-partner round into that evidence, so they precede any further accessibility remediation. That
ranking would change if a physical-device or specialist test became available, because that would
convert some of the recorded queue from reasoned to observed.


## Parked (deliberate)

- **`/compare`** — stub until post-launch (facts-only, no winner-highlighting).
- **Off-market** — dormant DB scaffolding; recursion it caused is now fixed.

## Follow-ups (buildable, lower priority)

- Exact map pins beyond `building_id` (Phase 2 geom wiring).
- Central-Riyadh bubble overlap at city zoom (Phase 2 city aggregation).
