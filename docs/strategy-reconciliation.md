# Competitive Advantage Strategy, reconciliation against live HEAD

Source: SAT Knowledge Base > Codex Advisory Reviews > `SAT Markets - Competitive
Advantage Strategy - 2026-07-28.md` (35,685 bytes, modified 2026-07-28T14:49:20Z).

First pass reconciled at HEAD `058a568`, after PKG-2A closed.
Second pass reconciled at HEAD `a2d2817`, after ADV-5B closed.

The directive is explicit that the strategy is not to be implemented blindly:
recommendations that are already shipped, contradicted by stronger evidence, or
blocked by data rights must be classified as such rather than queued as work. This
file is that classification. The roadmap carries only what survives it.

The first pass is kept on the record rather than overwritten. Every table below shows
the first-pass verdict and, where it changed, the second-pass verdict beside it with
the commit that moved it. A reconciliation whose earlier readings are deleted cannot
be audited, and the point of the exercise is that it can be.

## What changed in the method, and why it matters

The first pass graded the repository by reading its modules and its closure records: a
module exists, it is typed, it is tested, therefore the advantage exists. ADV-5B then
demonstrated on the platform's own surfaces why that is not sufficient. It could have
shipped `mobility.ts`, `sufficiency.ts` and `coverage.ts`, closed on a clean unit suite,
and left five fabricated panels rendering a seeded generator's output as measured
footfall, because nothing on that page imported anything the new modules exported. The
closure record states the lesson in one line: the gate is worth more than the module it
guards.

The second pass applies that lesson to itself. It asks not what was built but what
reaches a reader. That single change of question produced the most significant finding
in this document, which is that the strategy's flagship advantage is built and unreached.

## Verdicts

Six verdicts are used. The sixth is new to this pass.

**Shipped.** Already built, gated and live. Do not rebuild. The strategy may still
sharpen the wording, and where it does, the sharper wording is recorded here.

**Partial.** A real foundation exists and the remaining work extends it. The extension
must reuse the existing module, not stand up a second one beside it.

**Built but unreached.** The module exists, is typed and is tested, and nothing on a
rendering surface or a request path constructs or reads it. This is distinct from
Partial. Partial means some of the work is done. Unreached means the work is done and
no reader benefits from it, so the remaining task is not more module, it is a producer
and a rendering. It is also distinct from a feature that is unreached because a gate
refuses it: where the code is unreached by design, that is recorded as Gated and the
distinction is stated explicitly, because conflating the two would either indict a
working gate or excuse an omission.

**Missing.** Genuinely absent, buildable now, no external permission required.

**Gated.** Buildable only as an interface, a procurement requirement and a decision
record. Owner ruling 7 stands: do not buy services, contact vendors, sign agreements
or represent that data rights exist. The feature stays disabled until the owner holds
the permission.

**Stronger evidence in repo.** The repository already holds a finding that is more
specific or more restrictive than the strategy's treatment of the same question. The
repository finding wins and the strategy item is narrowed accordingly.

---

## 0. What the first pass could not know

The first pass ran at `058a568`. Eight packages have closed since: ADV-3A, ADV-3A.1,
ADV-3B, ADV-4A, ADV-4B, ADV-5A, ADV-5B and the ADV-5B closure. Findings 65 to 75 and
open decisions O15 and O16 were all raised after it. This section is the delta, so the
rest of the file can be read as a current statement rather than as a diff.

| Area | First pass | What shipped since | Second pass |
| --- | --- | --- | --- |
| AI boundary and provider routing | Missing, no router exists | ADV-3A, ADV-3A.1 (`2040a50`, `411f205`, `7a3c995`, closure `d9e4599`) and ADV-3B (`1cb0bd5`): the model-agnostic gateway, the classification boundary denying nonpublic user text before network access while `AI_AGREEMENT_IN_FORCE` is false, the tagged-template builder closing instruction-value laundering, conversation-history provenance excluding assistant turns from external context and from `allowedSrc`, and the synthetic evaluation gold set | Shipped as an architecture, Gated as a capability. No provider is configured and none may be until the owner records the agreement, the processing terms, the cross-border basis and the disclosure position |
| Evaluation gold set | Missing | ADV-3B shipped it, deliberately synthetic, containing no real user, requirement, listing or document data | Shipped |
| Public evidence surfaces | Gated on O10 and O11 | ADV-4A and ADV-4B: the published-record spine, the state and demotion vocabulary, the counted-noun formatter | Partial, with the indexing half still parked by owner ruling 1 |
| Location and mobility | Not applicable until ADV-5 | ADV-5A denied every external location provider because the register permits none. ADV-5B built the publication rule, the National Address interface, Part E as twelve executable clauses, and the structural claims gate | Gated by design, and the gate itself is Shipped |
| Fabricated figures on live surfaces | Not known | Finding 72: `/building/[id]` had been rendering a seeded generator's output as measured footfall, catchment, dwell, daytime population and spend for the whole life of the prototype. Deleted in `df2f216` | Closed, and it is the evidence for this pass's method |
| Contrast | Not known | Finding 75: the two habitual muted tiers measure 2.93:1 and 3.96:1 against a 4.5:1 threshold, and there is no gate that measures contrast at all | Open, assigned to the parked visual-quality package |
| Rent Index attribution scope | Not raised | O15: 36 English and 59 Arabic dictionary values name the index with no attribution, and most cannot structurally hold one | Open owner decision, blocks the sweep, not the surfaces |
| Availability green | Not raised | O16: on one browse card the reserved green means two unrelated things | Open owner decision |
| The Evidence Passport | Partial | ADV-1 shipped `evidence.ts` in full, with 567 lines of test | **Built but unreached.** See finding 76 |

---

## 1. The eight product advantages

| # | Strategy item | First pass | Second pass | Position at HEAD `a2d2817` |
| --- | --- | --- | --- | --- |
| 1 | Evidence Passport: source owner, record, period, geography, entity kind, asset type, unit, statistic type, transformation, sufficiency, last update, correction history, verification scope, permitted display, permitted export, permitted AI use | Partial | **Built but unreached** | `src/lib/evidence.ts` now defines `EvidencePassport` with every part the strategy names, plus `CorrectionEntry`, `latestCorrection`, `isRetracted`, `freshnessOf`, `confidenceOf`, `isKnown` and `publishability`. The first pass's three gaps are closed: the typed object exists, correction history exists, and `sourceRights.ts` carries `exportPolicy`, `aiRetrievalPolicy` and `modelInputPolicy` at source level, reaching 13 non-test importers. The fourth gap did not close and is now the whole of the item. **Nothing in `src` constructs a passport.** Call sites of `publishability`, `isKnown`, `freshnessOf`, `confidenceOf`, `latestCorrection` and `isRetracted` outside `src/lib/evidence*` number zero. The six modules importing `@/lib/evidence` import only its verification vocabulary. Underneath it `provenance.ts` is in the same state: every `ASSET_FIELDS` entry declares a tier, the only runtime reader of that tier is `attributeDisplay.ts:122`, which uses it to skip computed fields, and `ProvenanceChip.tsx` is an orphan that nothing imports. The strategy's line is that a citation chip is not enough. At HEAD there is no citation chip either. Finding 76. Nothing gates this: no permission, no vendor and no owner decision stands between here and a rendered passport, which is why it is the next package |
| 2 | Professional Listing Studio: asset-specific questions, building facts separate from offered-space facts, media missions, quality detection, brochure extraction confirmed by the lister, bilingual copy from confirmed facts only | Partial | Partial, materially advanced | ADV-2 shipped `listingStudio.ts` and `ListingStudio.tsx` (short steps partitioning every fact onto exactly one step, replacing `NewListingForm.tsx`), `listingEdit.ts` (save, resume, per-stage editability), `listingQuality.ts` (completeness with the reason attached to the score, and `contradictionsOf`) and `factScope.ts` (whose fact it is, per asset type and per field). Remaining: media missions, blur and duplicate detection, public marketing media separated from private verification evidence, the exact EN and AR public preview, and field specs for the 12 outstanding asset types. Brochure extraction stays gated on contract 6 because a brochure is private data |
| 3 | Requirement to deal workspace: shortlist, compare, tours, structured questions or RFP, deterministic offer comparison, editable bilingual decision pack, controlled deal room | Missing | Partial | ADV-2 shipped `matching.ts` (named dimensions, declared tolerance, eligibility before comparison, no verdict without reasons) reaching three surfaces, and `decisionPack.ts` reaching `DecisionPackPanel.tsx` and `/compare`. Still absent: the viewing and tour workflow, structured questions and RFP, and a deal room built from records. `/deal` and `/deal/termsheet` exist as sample surfaces with hardcoded bilingual term arrays behind `SampleBanner`, which is honest labelling and is not the workspace |
| 4 | Permissioned opportunity routing, organization and role model, per-brand requirement profiles, matching, consent and channel controls, matches inbox | Partial | Partial | Unchanged in substance. Saved searches with account-backed in-app new-match alerts ship; the matching work extends that alert path and **must not create a second notification system beside it**. Absent: organizations, roles, brand profiles, reverse matching, consent receipts, suppression, frequency caps, quiet hours, mutual-interest contact release. External channels stay disabled in code pending O12; the organization authority model needs O14 |
| 5 | Field-level verification, never one unexplained verified badge; verification confirms a defined fact at a defined time | Partial, and stronger in repo | Shipped, and stronger in repo | ADV-1 closed this half. `listingVerification.ts` carries the five verification dimensions and four independent fail-closed conditions, reaches 12 non-test importers, and is enforced by test: no published row can draw a badge, because the resolver requires a non-fixture record, a method naming a check outside this database, a date of check and a countersigning actor, and every one of the 88 published rows fails at least one. **The repository rule remains bidirectional and the strategy's is not: it is equally a defect for an evidence-backed surface to render without the reserved green.** O3 resolved into the shipped dimension set. What is open is O16, whether availability may keep the same green on the same card, which is a narrower question than the one the first pass logged |
| 6 | First-party demand and supply graph: instrument briefs, matches, evidence views, response time, tours, offers, corrections, pass reasons | Missing | Missing | Unchanged. ADV-2 produced some of the events; there is still no instrumented graph and no aggregation policy. Public aggregation is ADV-6 and needs privacy, minimum-sample and competition review. Note the dependency the first pass did not state: the corrections stream this graph needs is the same append-only write path ADV-1 left open |
| 7 | Public bilingual Riyadh commercial bulletin with full methodology, corrections history and controlled index allowlist | Gated | Partial, indexing half still parked | ADV-4A and ADV-4B built the published-record spine and its state vocabulary, so the evidence half is under way rather than pending. `routePolicy.ts` (D8) gives the route-level holdout the allowlist needs. Blocked on O10 for the per-dataset licence terms and attribution strings, and on O11 for whether this is the surface that lifts the site-wide noindex. **Owner ruling 1 parks the indexing half.** O11 blocks finishing ADV-4, not starting it |
| 8 | AI-readable authority: canonical pages for identity, the SAT Real Estate relationship, FAL 1200025510, neutrality, verification meaning, source policy, Rent Index methodology, corrections, terminology | Partial, gated in one part | Partial | `/neutrality` and `/about` exist, held out of the sitemap and noindexed by D8 until their gates clear. The relationship statement is O2 and needs counsel. The Rent Index methodology page is still blocked by the deferred statistical-methodology item: the current low and high are development test ranges labelled "sample indicative range". Buildable now without permission and still unbuilt: the verification-meaning page, the source policy page and the bilingual terminology page. The verification-meaning page is now much cheaper than it was, because ADV-1 shipped the exact vocabulary it has to explain |

The strategy's instruction that "a citation chip is not enough" is accepted and is now
sharper than the first pass could make it. The first pass read it as a criticism of
`provenance.ts`. The second reads it as a description of the gap between a passport that
exists in the type system and a passport a reader can see, which is the same gap the
platform crossed in the wrong direction on the building profile.

---

## 2. The eight contracts and licences

| # | Strategy item | First pass | Second pass | Position at HEAD `a2d2817` |
| --- | --- | --- | --- | --- |
| 1 | FAL analytics and consultation scope; a Saudi counsel memorandum mapping FAL 1200025510 against Rent Index, bulletin, Advisor, HBU, investment scenarios, private consultation and formal valuation | Gated | Gated | Unchanged. Law 1 fixes the number, not the scope. ADV-0 delivered the register stating the question per surface with a stop condition for each, and no more. The memorandum is an owner and counsel action, recorded as O13 |
| 2 | REGA and Ejar use and republication rights | Gated, partly answered | Gated, partly answered | Unchanged in rights terms. `source_registry.rega_ejar` records open data via open.data.gov.sa under an attribution licence, publishing averages and not medians. Derived values, AI retrieval, model input, user export, refresh, corrections, audit and termination remain uncovered; O10 stays open. New since the first pass: O15 asks a narrower question about the attribution string's scope in the interface, which is an owner wording decision rather than a licence one |
| 3 | SPL National Address as the authoritative geography layer | Gated | Gated, interface shipped | ADV-5B built `src/lib/location/address.ts` around an **empty permitted-field set**, on the reasoning that the request is the moment data crosses: asking for a building number and rendering only the district does not make the other fields unrequested, it makes them received. An empty list builds no request. The signup remains owner-side under ruling 7 |
| 4 | stc Geo Analytics, narrow first pilot, full PDPL contract requirements | Gated | Gated, requirements made executable | The thirteen requirements the first pass listed as prose are now twelve `ClauseId` values in `src/lib/location/sufficiency.ts`, `RECORDED_AGREEMENTS` is empty, and assessing a candidate agreement returns by name the clauses it fails to answer. A partial answer is not a partial pass. Reading a vendor's terms now produces a diff against a written standard rather than an impression of one. No vendor has been contacted |
| 5 | Maps, POI and travel time chosen on coverage, permitted caching, display conditions, derivative use, export and model-input rights | **Stronger evidence in repo** | **Stronger evidence in repo, and enforced** | The first pass recorded that the repository had answered this more strictly than the strategy asks. ADV-5B then found the platform contradicting its own record on two live surfaces: `/ops` asserted a stored isochrone capability D27(a) says this schema does not hold, and `assetFields.ts` documented the same plan in a field help string. Finding 70, corrected. The rule stands: `foursquare_mapbox` is `storage_policy: id_only`, `redisplay_policy: none`; no isochrone table exists and the server holds no Navigation-scoped token; `fsq_os_places` under Apache 2.0 is the only lawful stored POI layer. Travel time, if it ever ships, is computed at request time and never stored as a property fact |
| 6 | Enterprise AI agreement before private brochures, floor plans, requirements, messages and deal documents reach an external model | Gated, and it is the binding constraint on ADV-3 | Gated, and now enforced before the socket rather than at it | ADV-3A.1 moved this from a policy to a structural property. Nonpublic user text is denied **before network access** while `AI_AGREEMENT_IN_FORCE` is false, with tests proving all three paths stop before any network call. Conversation history no longer launders provenance: assistant turns are excluded from external-model context and from `allowedSrc`, because previous AI output is never evidence for a figure. The claim made at closure is the narrow truthful one: all currently known and registered provider integrations are centralized and guarded. Activation still waits on the owner recording the agreement, the processing terms, the cross-border basis and the disclosure or consent position |
| 7 | Contributor and portfolio agreements | Gated | Gated | Unchanged. ADV-6. There is now a concrete dependency to state: the correction and audit model these agreements attach permissions to is the write path ADV-1 left open, so ADV-6 cannot start before it exists |
| 8 | GASTAT and MOJ open data | Partial, GASTAT already stronger in repo | Partial, unchanged | `gastat_sama` remains `redisplay_policy: public` with the licence basis named, GASTAT use policy 1.2.2, the only cleanly redisplayable source held. MOJ stays subject to D26: **srem.moj.gov.sa and the Najiz UIs are interactive portals, not data products, and are never scraped.** Per-dataset review, never a blanket site-terms reading |

---

## 3. The six agents and the model platform

| Strategy item | First pass | Second pass | Position at HEAD `a2d2817` |
| --- | --- | --- | --- |
| Model-agnostic architecture; Kimi evaluated, not selected; no provider chosen on token price | Missing, no conflict | **Shipped as architecture, Gated as capability** | `src/lib/ai/gateway.ts` reaches 7 non-test importers and is the single guarded route out. No provider is configured. `agents/tools.ts` and `agents/permission.ts` have zero non-test importers and `agents/agents.ts` is reached only by `lib/eval/grade.ts`. **That is unreached by gate and by design, not by omission**, and it is the opposite case to finding 76: here the code is dormant because a documented boundary refuses to activate it, and the correct state of a refusing gate is that nothing downstream of it runs |
| Discovery agent: natural language to a confirmed brief, asks only for what is missing, explains match reasons | Partial | Partial | Unchanged. PKG-2A shipped the deterministic floor: `queryParse.ts` reads asset kind, grade, fit-out, deal, city, district, place, price ceiling, price floor and approximate size in both languages from a closed vocabulary, reports unrecognised terms as not used, and shows every reading back as a withdrawable chip. **The agent may propose a parse; it may not replace this one, and it may not silently upgrade an unrecognised term into a constraint** |
| Listing copilot: extract from brochures and floor plans, classify media, draft bilingual copy from confirmed facts | Missing, gated on contract 6 | Missing, gated on contract 6 | ADV-2 built the confirmation surface it attaches to. The model attaches when contract 6 is recorded and not before. A brochure is private data |
| Opportunity-matching agent, operating only after deterministic eligibility, permission and consent | Missing | Missing, deterministic layer now present | `matching.ts` shipped in ADV-2 with named dimensions, declared tolerance and eligibility before comparison. The agent now has a lawful deterministic layer to rank behind, and O12 and O14 gate the routing rather than the ranking |
| Evidence auditor | Partial | Partial, and its subject does not yet exist | `market/guard.ts` and Law 3 enforce server-side that AI never generates a rent figure, price or market statistic. `valueEvidence.ts` (D25) builds one structured evidence result and renders both locales deterministically from it. The auditor generalises that pattern over passports, and finding 76 is the reason it cannot start yet: **there is nothing for it to audit until a passport has a producer** |
| Deal analyst: deterministic calculations, facts separated from assumptions, editable bilingual pack | Partial | Partial | `decisionPack.ts` shipped and reaches two surfaces, closing the first pass's "the pack does not exist". `valueEvidence.ts` and `underwrite.ts` remain the calculation precedent. The deal room itself is sample-only |
| Operations agent: stale listings, missing evidence, unanswered enquiries, expiring advertising licences | Partial | Partial | Unchanged. `availability.ts` computes fresh, aging and stale from a real affirmation event and never falls back to `updated_at`; `ad_permit_expires_at` drives a gate failure in `gate.ts`. The signals exist; the routing to authorized humans does not |
| Evaluation gold set, EN and AR, with prompt injection and unsupported-figure attempts | Missing | **Shipped** | ADV-3B shipped it, deliberately synthetic, containing no real user, requirement, listing or document data. `eval/run.ts` is reached by its CLI and `eval/grade.ts` by the harness |

The strategy's line that fine-tuning is not the first step is accepted and needs no work.

---

## 4. The "do not build" list, checked against HEAD `a2d2817`

| Strategy prohibition | State |
| --- | --- |
| Generic chatbot disconnected from listings and actions | Compliant. The advisor is bound to published segments and refuses outside them, and since ADV-3A.1 it refuses before network access rather than after |
| Black-box match, location or investment score | Compliant. `matching.ts` shipped with no verdict without reasons, which converts this from a constraint into an implemented property |
| Scraped government data without rights | Already forbidden by D26, more specifically than the strategy states it |
| User-level mobility tracking | Compliant, and now structurally so. `MobilityAvailable` narrows geography to city or district, so a building-level figure cannot be constructed rather than merely refused, and the available type has no field for a device, a person, a trajectory, a visit or a timestamped event |
| Low-sample mobility reports | Compliant by construction. `coverage.ts` holds the thresholds separately from the clauses, because a contract answering every clause still says nothing about whether one figure has enough observations behind it |
| One broad verified badge | Already law, and now enforced by resolver rather than by convention. D11, D24, `gate.ts`, `listingVerification.ts`. The PDP defect the first pass listed as findings rank 3 closed in ADV-1 |
| Definitive valuation without licence and professional review | Compliant. The advisor gives a band with its source and its limitation, never a valuation |
| Raw broker comparables exchange before legal and competition review | Compliant and reinforced: `broker_overlay` is `redisplay_policy: internal` because JLL, CBRE and Knight Frank each forbid reproduction without written permission |
| Native app before the PWA proves a native-only need | Already decided as D6. No work |
| Architecture tied permanently to any one model provider | Compliant. ADV-3A shipped the gateway; no provider is configured |
| **AI must never beautify an image in a way that changes the physical reality of the property** | **Not compliant, because the rule is not written anywhere.** See section 5 |

---

## 5. Conflicts, corrections and things the strategy does not know

**The maps and POI question is already closed, and closed harder.** Recorded above as
contract item 5. This remains the one place where implementing the strategy as written
would be a regression. ADV-5B strengthened rather than weakened it, by finding two live
surfaces that had drifted from the record and correcting them.

**Green is bidirectional here.** The strategy forbids the unexplained verified badge.
The repository forbids that and its inverse: an evidence-backed verification surface
rendering without confirmed green is equally a defect. ADV-1 satisfied both directions
by resolver. O16 is the remaining question, and it is not about the rule but about a
collision: on one browse card the reserved green currently carries an evidence-backed
verification meaning on the tick and a confirmed availability date on the dot, and
`availabilityShortLabel` returns the same word for the fresh and the aging state, so
colour alone separates a listing confirmed this week from one confirmed months ago.

**The flagship advantage is built and unreached, and nothing is stopping it.** This is
the second pass's central finding and the reason the next package is what it is.
`evidence.ts` defines the Evidence Passport and its four reading functions, with 567
lines of test behind them, and no code in `src` constructs one. `provenance.ts` is in the
same state one level down: the tier is declared on every asset field and read at runtime
only to skip computed fields. `ProvenanceChip.tsx`, the component that would render it,
is an orphan. The closure record for ADV-1 is not dishonest about this; it describes the
passport as "a typed record binding a value to the things that make it readable" with
pure functions around it, and claims no rendering. But the strategy's advantage is not a
type. It is a reader being able to see where a number came from, and today no reader can.
Finding 76.

**The distinction that keeps that finding honest.** The AI agent layer is also unreached:
`agents/tools.ts` and `agents/permission.ts` have zero non-test importers. That is not
the same defect and must not be reported as one. The agent layer is dormant because a
documented boundary refuses to activate it while `AI_AGREEMENT_IN_FORCE` is false and no
provider agreement is recorded, which is a gate working exactly as designed under owner
ruling 7. The passport is dormant because nobody wired it. One is a refusal, the other is
an omission, and a reconciliation that cannot tell them apart is worthless in both
directions: it would either indict a working gate or excuse an unfinished feature.

**An orphan is how a retired pattern survives every sweep.** Five of 57 components have
no importer anywhere in `src`: `HeroSearch`, `LocationFilter`, `LocationScore`,
`ProvenanceChip` and `RentBand`. Two of those five are precisely the passport's rendering
surfaces, which is not a coincidence but the same finding seen from the component side.
The cost is concrete rather than tidiness: `RentBand.tsx` still carries a `badge-gold`
class name, an en dash range separator with no `<bdi dir="ltr">` isolation under RTL
against D20, three muted tiers at `/40`, `/45` and `/55` that finding 75 measures below
threshold, and a bare `toLocaleString()` with no locale argument, which is a Law 7 hazard.
None of that is caught by any gate, because none of it renders. `LocationScore` is already
the second recorded exception in `claims.test.ts` on exactly this basis, and that
exception carries a test that nothing imports it, which is the right pattern. Finding 77.

**The image rule is absent from the repository.** The strategy states that AI must never
beautify an image in a way that changes the physical reality of the property. Searching
`docs/` and `src/lib` for that rule in any wording returns nothing. It is not in
`docs/LAWS.md`, not in the AI boundary, not in the media handling. This is one of the few
strategy recommendations that is genuinely uncompleted, cheap, ungated and load-bearing:
a verification-first exchange that retouches a photograph has falsified the record it
exists to hold. It converts to a law plus a structural test, alongside the media work in
the listing studio.

**Published state vocabulary is narrower than the strategy's.** `publishedRecords.ts`
carries five states and six demotion reasons where the strategy names eleven states. The
repository's set is not a shortfall to be padded out; the six demotion reasons carry the
information the extra states would have carried, and they carry it as a reason rather
than as a label. Recorded so the difference is not later read as an omission.

**The deal room is a sample surface.** `/deal` and `/deal/termsheet` render hardcoded
bilingual term arrays behind `SampleBanner`. The labelling is honest and the surfaces are
not a defect, but they must not be counted as advantage 3 being delivered.

**PD5 is owner-action-only.** Getting SAT Markets onto a government recognised platform
list, which Etimad announcement 240141005052 shows is Paseetah's one genuinely
non-copyable asset, requires approaching a government buyer. Owner ruling 7 forbids
contacting vendors or representing that rights exist. PD5 stays a named objective and
produces no engineering task.

**The two live-surface truth defects that outranked the whole programme are closed.**
Owner ruling 3 and owner ruling 4 were sequenced ahead of ADV-1's passport work and
delivered in `41f4f8f`, `726b72b`, `0d07cb8`, `b94b6b4`, `f6368c4`, `11c9518` and
`6c2e1fa`. The first pass's reasoning still holds and is worth keeping on the record,
because it applies again now: shipping an Evidence Passport onto pages whose surrounding
copy over-claims would make the passport decorative.

**The strategy's confidence section is honest about what it does not establish**, and
none of those items may be treated as fact: Paseet enterprise sharing and export rights,
Placer Saudi coverage, stc field coverage and methodology and bias and refresh, REGA and
Ejar API and republication and derivative rights, specific MOJ dataset endpoints and
terms, AI-provider Saudi storage and retention and transfer terms, and the exact activity
scope of FAL 1200025510. Every one is a register row with a stop condition, not a premise.

---

## 6. Open decisions carried by this reconciliation

O12, O13 and O14 were raised by the first pass. O15 and O16 were raised by ADV-1 and
ADV-4 after it and are recorded here so the reconciliation and the decision register
agree.

- **O12.** Notification consent basis for opportunity routing. Counsel question. Until it
  is answered ADV-2 ships in-product notification only, with consent receipts recorded
  and external channels disabled in code.
- **O13.** Whether SAT Markets holds or seeks the separate REGA real-estate analytics and
  consultation licence, distinct from FAL 1200025510. Determines whether the bulletin,
  HBU, investment scenarios and public market commentary are permitted at all.
- **O14.** Organization and role model authority: who inside a landlord or tenant
  organization may release contact details, accept a viewing or bind the organization.
  Needed before ADV-2's mutual-interest contact release can be specified.
- **O15.** Attribution scope for the Rent Index: which classes of string are citations
  carrying the full "REGA Rental Index (Ejar)" attribution and which are navigation to a
  page that carries it. Owner ruling 2 requires the attribution on every reference; 36
  English and 59 Arabic values name the index with none, and most cannot structurally
  hold one. Blocks the sweep, not the surfaces.
- **O16.** Whether availability freshness keeps the reserved green now that verification
  uses it on the same card, and what the availability label must state.

---

## 7. What this converts to, in dependency order

The roadmap carries ADV-0 through ADV-6 with the PD workstreams folded in. This pass adds
one package and reorders nothing else, because the dependency it found sits at the front
rather than at the end.

**Next package: ADV-1C, the Evidence Passport producer and rendering.** It is chosen on
three grounds and not on preference. It is the strategy's flagship advantage. Nothing
gates it: no permission, no vendor, no owner decision and no contract stands between here
and a rendered passport. And every remaining agent item that depends on evidence, in
particular the evidence auditor, has nothing to operate on until it exists. Its shape
follows from finding 76 rather than from ambition: a producer that builds a passport from
records the platform already holds, a rendering that shows it, the four reading functions
wired to that rendering rather than tested in isolation, and a structural gate in the
`claims.test.ts` pattern that fails when a surface states a figure no passport reaches.
The gate is the part that carries the value, on the ADV-5B evidence.

Two smaller items ship with it because they are the same finding seen from a different
side: the orphan class of finding 77, each orphan either wired, deleted or excepted with
a test that its reason is still true; and the image rule, written as a law and enforced by
a test rather than by a sentence in a document.

| Item | Home | Blocked by |
| --- | --- | --- |
| Evidence Passport producer, rendering and gate (finding 76) | ADV-1C, next | Nothing |
| Orphan components resolved (finding 77) | ADV-1C | Nothing |
| Image-integrity rule as law plus test | ADV-1C, then the listing studio media work | Nothing |
| Append-only corrections write path | ADV-1, remaining scope | Nothing technical; originates with ADV-6 |
| Verification-meaning, source-policy and terminology pages | ADV-4 | Nothing |
| Media missions, blur and duplicate detection, public preview | ADV-2 remaining | Nothing |
| Viewing and tour workflow, RFP, deal room from records | ADV-2 remaining | O14 for contact release |
| Contrast gate | Parked visual-quality package, first item | Standing rule against another broad cosmetic sweep |
| Brochure extraction, listing copilot, any private document to a model | ADV-3 | Contract 6, and the owner recording the agreement |
| Provider activation | ADV-3 | `AI_AGREEMENT_IN_FORCE`, owner records agreement, terms, cross-border basis, disclosure position |
| Public bulletin evidence half | ADV-4 | O10 |
| Public bulletin indexing half | ADV-4 | O11, and parked by owner ruling 1 |
| `/building/[id]` indexing status (finding 74) | ADV-4 | Owner and Codex decision |
| Rent Index attribution sweep (finding 45) | ADV-4 | O15 |
| Availability green collision | ADV-1 follow-up | O16 |
| PD4 deed checks under FAL, extending `gate.ts` | ADV-1 | O13 and O10 |
| Mobility coverage-validation harness | ADV-5C | No candidate dataset; owner-side under ruling 7 |
| Any mobility, address or location source activation | ADV-5 | Owner records an agreement answering all twelve Part E clauses |
| Demand and supply graph, aggregation policy | ADV-6 | ADV-1 corrections write path |
| Contributor and portfolio agreements | ADV-6 | ADV-1 corrections write path, then counsel |
| MOJ ingestion (PD1) | ADV-4 | O10, and D26 forbids scraping the portals |
| Ejar commercial rent index ingest (PD2) | ADV-4 | O10 |
| Government recognition and procurement listing (PD5) | Owner action only | Ruling 7. No engineering task |
