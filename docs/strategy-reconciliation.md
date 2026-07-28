# Competitive Advantage Strategy, reconciliation against live HEAD

Source: SAT Knowledge Base > Codex Advisory Reviews > `SAT Markets - Competitive
Advantage Strategy - 2026-07-28.md` (35,685 bytes, modified 2026-07-28T14:49:20Z).
Reconciled at HEAD `058a568`, after PKG-2A closed.

The directive is explicit that the strategy is not to be implemented blindly:
recommendations that are already shipped, contradicted by stronger evidence, or
blocked by data rights must be classified as such rather than queued as work. This
file is that classification. The roadmap carries only what survives it.

Five verdicts are used.

**Shipped.** Already built, gated and live. Do not rebuild. The strategy may still
sharpen the wording, and where it does, the sharper wording is recorded here.

**Partial.** A real foundation exists and the remaining work extends it. The extension
must reuse the existing module, not stand up a second one beside it.

**Missing.** Genuinely absent, buildable now, no external permission required.

**Gated.** Buildable only as an interface, a procurement requirement and a decision
record. Owner ruling 7 stands: do not buy services, contact vendors, sign agreements
or represent that data rights exist. The feature stays disabled until the owner holds
the permission.

**Stronger evidence in repo.** The repository already holds a finding that is more
specific or more restrictive than the strategy's treatment of the same question. The
repository finding wins and the strategy item is narrowed accordingly.

---

## 1. The eight product advantages

| # | Strategy item | Verdict | Position at HEAD |
| --- | --- | --- | --- |
| 1 | Evidence Passport: source owner, record, period, geography, entity kind, asset type, unit, statistic type, transformation, sufficiency, last update, correction history, verification scope, permitted display, permitted export, permitted AI use | Partial | `src/lib/provenance.ts` carries four tiers and never a fifth: entered, verified, computed, sourced, with date, method, dataset and period, plus bilingual label and aria text. `source_registry` carries attribution, licence note, storage policy, redisplay policy and licence reference per source. `rent_index_published` carries period, unit, `stat_kind`, `sufficient` and `data_class`. Missing: one named typed object binding those parts to a single field, correction history, permitted-export and permitted-AI-use flags, and a rendering that shows the passport rather than a tier chip. ADV-1. |
| 2 | Professional Listing Studio: asset-specific questions, building facts separate from offered-space facts, media missions, quality detection, brochure extraction confirmed by the lister, bilingual copy from confirmed facts only | Partial | `assetFields.ts`, `intakeValidation.ts`, `documentKinds.ts`, `photos.ts` and the coverage-gated per-asset filters are the field spine. The 12 remaining asset types still lack field specs (open task). Absent: progressive short steps, save and resume, media missions, blur and duplicate and contradiction detection, quality scoring, public marketing media separated from private verification evidence, and the exact EN and AR public preview. ADV-2. |
| 3 | Requirement to deal workspace: shortlist, compare, tours, structured questions or RFP, deterministic offer comparison, editable bilingual decision pack, controlled deal room | Missing | `/compare` is a deliberate stub (parked). Requirements exist as records; there is no viewing workflow, no RFP, no decision pack and no deal room. ADV-2, then the deal analyst in ADV-3. |
| 4 | Permissioned opportunity routing, organization and role model, per-brand requirement profiles, matching, consent and channel controls, matches inbox | Partial | Saved searches with account-backed in-app new-match alerts already ship (`/api/saved-searches`, `SavedSearchRows`, `src/lib/watches.ts`, `saved.ts`). **The matching work extends that alert path. It must not create a second notification system beside it.** Absent: organizations, roles, brand profiles, reverse matching, consent receipts, suppression, frequency caps, quiet hours, mutual-interest contact release. ADV-2. Email delivery remains blocked on the unchosen provider (roadmap, owner input). |
| 5 | Field-level verification, never one unexplained verified badge; verification confirms a defined fact at a defined time | Partial, and stronger in repo | `src/lib/gate.ts` already separates verified OWNER from verified LISTING and states that `is_sat_listed` confers neither. `releaseState.ts` (D11) carries six approved bilingual states with separated tones. D24 reserves confirmed green for evidence-backed verification and `greenReservation.test.ts` enforces it. **The repository rule is bidirectional and the strategy's is not: since 2026-07-27 it is equally a defect for an evidence-backed surface to render without green.** Still open: findings rank 3 (verification states merged into Owner-verified on the PDP) and owner decision O3, which sets the display rules for identity, FAL licence checked, authority to advertise, permit active, area evidence and availability. ADV-1. |
| 6 | First-party demand and supply graph: instrument briefs, matches, evidence views, response time, tours, offers, corrections, pass reasons | Missing | Enquiry attribution (`leads.created_by_user_id`) and report filing exist as isolated events. There is no instrumented graph and no aggregation policy. ADV-2 produces the events; public aggregation is ADV-6 and needs privacy, minimum-sample and competition review. |
| 7 | Public bilingual Riyadh commercial bulletin with full methodology, corrections history and controlled index allowlist | Gated | This is roadmap PD3 under a new name. `routePolicy.ts` (D8) already gives a route-level index holdout, so the allowlist has a home and does not need inventing. Blocked on O10 (exact licence terms and attribution strings per dataset) and O11 (whether the bulletin is the surface that lifts the site-wide noindex). **Owner ruling 1 parks the indexing half: domain and launch indexing are not priorities now.** The evidence half, sourcing and periodising and attributing every figure, is not parked. ADV-4. |
| 8 | AI-readable authority: canonical pages for identity, the SAT Real Estate relationship, FAL 1200025510, neutrality, verification meaning, source policy, Rent Index methodology, corrections, terminology | Partial, gated in one part | `/neutrality` and `/about` exist but are held out of the sitemap and noindexed by D8 until their gates clear, and the SAT Markets to SAT Real Estate relationship statement is open decision O2, which needs counsel. The Rent Index methodology page is blocked by the deferred statistical-methodology item: the current low and high are development test ranges labelled "sample indicative range". Buildable now without permission: the verification-meaning page, the source policy page and the bilingual terminology page, all from facts the repository already holds. ADV-4. |

The strategy's own instruction that "a citation chip is not enough" is accepted. It is
also the sharpest available description of what `provenance.ts` currently is, which is
why item 1 is Partial rather than Shipped.

---

## 2. The eight contracts and licences

| # | Strategy item | Verdict | Position at HEAD |
| --- | --- | --- | --- |
| 1 | FAL analytics and consultation scope; a Saudi counsel memorandum mapping FAL 1200025510 against Rent Index, bulletin, Advisor, HBU, investment scenarios, private consultation and formal valuation | Gated | Nothing in the repository establishes the activity scope of 1200025510. Law 1 fixes the number, not the scope. The memorandum is an owner and counsel action. ADV-0 delivers the register that states the question per surface and the stop condition for each, and no more. |
| 2 | REGA and Ejar use and republication rights | Gated, partly answered | `source_registry.rega_ejar` already records: open data via open.data.gov.sa under an attribution licence, publishes averages and not medians. That covers attribution and statistic type. It does not cover derived values, AI retrieval, model input, user export, refresh, corrections, audit or termination. O10 stays open. |
| 3 | SPL National Address as the authoritative geography layer | Gated | `source_registry.spl_address` already carries the honest state: "Written redisplay terms unverified pre-signup." `districts.spl_id` exists as the join point. ADV-5 writes the interface; the signup is owner-side. |
| 4 | stc Geo Analytics, narrow first pilot, full PDPL contract requirements | Gated | Nothing exists. ADV-5 records the procurement requirements only: coverage map, historical depth, refresh, sample construction, bias, consent provenance, aggregation threshold, controller and processor roles, storage location, cross-border transfer, audit, deletion, no user-level output. No vendor contact. |
| 5 | Maps, POI and travel time chosen on coverage, permitted caching, display conditions, derivative use, export and model-input rights | **Stronger evidence in repo** | The repository has already answered this and answered it more strictly than the strategy asks. `foursquare_mapbox` is `storage_policy: id_only`, `redisplay_policy: none`: the live Foursquare terms permit caching nothing but `fsq_place_id`, Mapbox forbids caching isochrone results at all and requires display on a Mapbox map, **so no isochrone table exists in this schema and the server holds no Navigation-scoped token**. `fsq_os_places` (Apache 2.0) is recorded as the only lawful stored POI layer, attribution "Powered by Foursquare". ADV-5 must not reintroduce an isochrone cache. Travel time, if it ships, is computed at request time, carries its method and time context, and is never stored as a property fact. |
| 6 | Enterprise AI agreement before private brochures, floor plans, requirements, messages and deal documents reach an external model | Gated, and it is the binding constraint on ADV-3 | Until no-training, retention, storage region, cross-border, subprocessors, encryption, deletion, incident notice, audit rights, model-change notice and output rights are covered, external models receive only public, sample or strongly redacted information. ADV-0 writes this as the AI data-classification policy, which is a code-enforceable boundary rather than a promise: the classification decides what may leave the process, so ADV-3's router cannot route a private document to an external provider by accident. |
| 7 | Contributor and portfolio agreements | Gated | ADV-6. Nothing to build before ADV-1's correction and audit model exists to attach permissions to. |
| 8 | GASTAT and MOJ open data | Partial, GASTAT already stronger in repo | `gastat_sama` is already recorded as `redisplay_policy: public` with the licence basis named: GASTAT use policy 1.2.2 expressly permits republication including commercial use with attribution, and it is noted as the only cleanly redisplayable source held. MOJ is roadmap PD1 and stays subject to the standing hard constraint: **srem.moj.gov.sa and the Najiz UIs are interactive portals, not data products, and are never scraped** (D26). Per-dataset review, never a blanket site-terms reading. |

---

## 3. The six agents and the model platform

| Strategy item | Verdict | Position at HEAD |
| --- | --- | --- |
| Model-agnostic architecture; Kimi evaluated, not selected; no provider chosen on token price | Missing, no conflict | No router exists. The advisor calls one provider directly. ADV-3. |
| Discovery agent: natural language to a confirmed brief, asks only for what is missing, explains match reasons | Partial | PKG-2A shipped the deterministic floor this agent has to sit on: `src/lib/search/queryParse.ts` reads asset kind, grade, fit-out, deal, city, district, place, price ceiling, price floor and approximate size in both languages from a closed vocabulary, reports unrecognised terms as not used, and shows every reading back as a withdrawable chip. **The agent may propose a parse; it may not replace this one, and it may not silently upgrade an unrecognised term into a constraint.** |
| Listing copilot: extract from brochures and floor plans, classify media, draft bilingual copy from confirmed facts | Missing, and gated on contract 6 for private documents | ADV-2 builds the confirmation surface; ADV-3 attaches the model. A brochure is private data. |
| Opportunity-matching agent, operating only after deterministic eligibility, permission and consent | Missing | ADV-2 must land the deterministic layer first, or the agent has nothing lawful to rank. |
| Evidence auditor | Partial | `src/lib/market/guard.ts` and Law 3 already enforce server-side that AI never generates a rent figure, price or market statistic, and that a period is part of a figure. `valueEvidence.ts` (D25) already builds one structured evidence result and renders both locales deterministically from it, which is the pattern the auditor generalises. |
| Deal analyst: deterministic calculations, facts separated from assumptions, editable bilingual pack | Partial | `valueEvidence.ts` and `underwrite.ts` are the deterministic calculation precedent. The pack does not exist. ADV-2 and ADV-3. |
| Operations agent: stale listings, missing evidence, unanswered enquiries, expiring advertising licences | Partial | `availability.ts` already computes fresh, aging and stale from a real affirmation event and never falls back to `updated_at`. `ad_permit_expires_at` already drives a gate failure in `gate.ts`. The signals exist; the routing to authorized humans does not. |
| Evaluation gold set, EN and AR, with prompt injection and unsupported-figure attempts | Missing | ADV-3. The existing law tests are the nearest precedent and should be the format's model: a rule that can be machine-checked must be. |

The strategy's line that fine-tuning is not the first step is accepted and needs no work.

---

## 4. The "do not build" list, checked against HEAD

| Strategy prohibition | State |
| --- | --- |
| Generic chatbot disconnected from listings and actions | Compliant. The advisor is bound to published segments and refuses outside them. |
| Black-box match, location or investment score | Compliant today and now a standing constraint on ADV-2. No score ships without its reasons. |
| Scraped government data without rights | Already forbidden by D26, more specifically than the strategy states it. |
| User-level mobility tracking | Compliant. Nothing of the kind exists. |
| Low-sample mobility reports | Not applicable until ADV-5, and gated. |
| One broad verified badge | Already law. D11, D24 and `gate.ts`. The remaining PDP defect is findings rank 3 and is ADV-1 work. |
| Definitive valuation without licence and professional review | Compliant. The advisor gives a band with its source and its limitation, never a valuation. Reinforced by the FAL scope question in ADV-0. |
| Raw broker comparables exchange before legal and competition review | Compliant and reinforced: `broker_overlay` is `redisplay_policy: internal` because JLL, CBRE and Knight Frank each forbid reproduction without written permission. |
| Native app before the PWA proves a native-only need | Already decided as D6. No work. |
| Architecture tied permanently to any one model provider | ADV-3. |

---

## 5. Conflicts, corrections and things the strategy does not know

**The maps and POI question is already closed, and closed harder.** Recorded above as
contract item 5. This is the one place where implementing the strategy as written would
be a regression.

**Green is bidirectional here.** The strategy forbids the unexplained verified badge.
The repository forbids that and its inverse: an evidence-backed verification surface
rendering without confirmed green is equally a defect, which is what the first pass
missed on `ListingCard`, where the `passesGate()` tick was an off-palette teal. Any
ADV-1 verification rendering must satisfy both directions.

**The public bulletin's two halves separate under owner ruling 1.** Its evidence work
proceeds; its indexing does not. Ruling 1 says domain acquisition and launch indexing
are not priorities and the preview stays protected under the current release policy.
O11 therefore does not need answering to start ADV-4, only to finish it.

**PD5 is now owner-action-only.** Getting SAT Markets onto a government recognised
platform list, which Etimad announcement 240141005052 shows is Paseetah's one genuinely
non-copyable asset, requires approaching a government buyer. Owner ruling 7 forbids
contacting vendors or representing that rights exist. PD5 stays a named objective in the
roadmap and produces no engineering task.

**Two live-surface truth defects outrank the whole programme.** Owner ruling 3 (about
100 remaining over-broad claims, `/invest` first) and owner ruling 4 (HBU comparables
anonymized unless each named comparable has a lawful documented public source and
permission) are not additions to ADV-1, they are its precondition. Shipping an Evidence
Passport onto pages whose surrounding copy still over-claims would make the passport
decorative. They are sequenced into ADV-1 ahead of the passport itself.

**The strategy's confidence section is honest about what it does not establish**, and
none of those items may be treated as fact: Paseet enterprise sharing and export rights,
Placer Saudi coverage, stc field coverage and methodology and bias and refresh, REGA and
Ejar API and republication and derivative rights, specific MOJ dataset endpoints and
terms, AI-provider Saudi storage and retention and transfer terms, and the exact activity
scope of FAL 1200025510. Every one of those is a register row with a stop condition in
ADV-0, not a premise.

---

## 6. New open decisions raised by the strategy

Added to `docs/decision-register.md` as O12, O13 and O14.

- **O12.** Notification consent basis for opportunity routing. The strategy records an
  owner preference for opt-out and flags that Saudi law may require affirmative opt-in
  before any email, push, SMS or WhatsApp message. This is a counsel question, and until
  it is answered ADV-2 ships in-product notification only, with consent receipts recorded
  and external channels disabled in code.
- **O13.** Whether SAT Markets holds or seeks the separate REGA real-estate analytics
  and consultation licence, distinct from FAL 1200025510. This determines whether the
  bulletin, HBU, investment scenarios and public market commentary are permitted at all.
- **O14.** Organization and role model authority: who inside a landlord or tenant
  organization may release contact details, accept a viewing or bind the organization.
  Needed before ADV-2's mutual-interest contact release can be specified.

---

## 7. What this converts to

The roadmap now carries ADV-0 through ADV-6 in dependency order, with the PD workstreams
folded into them rather than running as a parallel plan. Mapping:

| Old | New home |
| --- | --- |
| PD1, MOJ official ingestion | ADV-0 register rows and contract backlog, then ADV-4 |
| PD2, Ejar commercial rent index ingest | ADV-0 rights question, then ADV-4 evidence spine |
| PD3, public bilingual Riyadh bulletin | ADV-4, indexing half parked by owner ruling 1 |
| PD4, RER deed checks under FAL | ADV-1 verification dimensions, extends `gate.ts`, does not replace it |
| PD5, government recognition and procurement listing | Owner action only, ruling 7. No engineering task. |
