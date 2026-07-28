# SAT Markets — build state & roadmap

Updated 2026-07-28. Companions: `competitive-research.md` (the OSUS / Property Finder
decisions and the ASSET_FIELDS data-coverage audit), `competitive-paseetah.md` (the
public-data dossier) and `strategy-reconciliation.md` (the Competitive Advantage
Strategy classified against live HEAD, which is what the ADV programme below is
converted from).

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

Deliver: the six agents (discovery, listing copilot, opportunity matching, evidence
auditor, deal analyst, operations); typed SAT tools; the deterministic calculation layer;
the evaluation gold set and the cost-aware router. Kimi may be evaluated and is not
automatically selected; DeepSeek, Gemini and others go through the same evaluation; no
provider is chosen on token price.

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

### ADV-6. Contributor network

Deliver: portfolio feeds, contributor agreements as interfaces and requirements, the
analyst review queue, aggregated comparables, response and demand intelligence, each with
permission, correction, audit and revocation controls. Depends on ADV-1's correction and
audit model existing to attach permissions to.

Gate: legal, confidentiality, competition, quality and minimum-sample controls pass.

## Parked (deliberate)

- **`/compare`** — stub until post-launch (facts-only, no winner-highlighting).
- **Off-market** — dormant DB scaffolding; recursion it caused is now fixed.

## Follow-ups (buildable, lower priority)

- Exact map pins beyond `building_id` (Phase 2 geom wiring).
- Central-Riyadh bubble overlap at city zoom (Phase 2 city aggregation).
