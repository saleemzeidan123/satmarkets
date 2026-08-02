# Roadmap reconciliation gate

**This document was rebuilt on 2026-08-02 after Codex rejected the version shipped in `d34ebfa`.** The rejected version is not amended in place, because two of its foundations were false and a patch would have left the false reasoning visible under corrected numbers. Everything below is rebuilt from the original enhancement plan, now preserved in this repository at `docs/baseline-enhancement-plan-2026-07-22.md`.

Written under Codex relay item 5 of 2026-08-02 and corrected under the Codex rejection of the same date: produce one no-code reconciliation against all 37 workstreams in the original enhancement plan, all six end-to-end journeys, the current status ledger and the current findings register. For every item state Complete, Partial, Blocked, Deferred or Not started, the supporting commit or document, the remaining user-visible outcome, the blocker or dependency, and the recommended sequence. Nothing may be labelled Dropped without Saleem's explicit approval, and nothing here is.

**One part of that original commission is superseded.** Relay item 5 asked for a recommended sequence. The Codex rejection of `d34ebfa` then directed that this reconciliation not be used to choose the next package, and that Codex and Saleem approve the product sequence after the corrected matrix. The later instruction governs. Part G.2 is therefore an inventory of unblocked engineering work, ordered by workstream number so it cannot be read as a sequence, and no package is recommended anywhere in this document.

**This document contains no code and proposes no package.** It is a position statement. Codex and Saleem approve the product sequence after this matrix, not this file.

Read against: `docs/baseline-enhancement-plan-2026-07-22.md` as the authority for scope, `docs/status-ledger.md` at the commit this ships in as the authority for present truth, `docs/findings-register.md` at 205 rows, `docs/decision-register.md` at D1 to D33 plus O1 to O19, `docs/roadmap.md`, `docs/accessibility-elite-4.md` and `docs/elite-standard-reconciliation.md`.

---

## A. What was wrong in the rejected version, stated before anything else

The rejected version opened with a section headed "Two things this repository does not contain". Both of the things it said the repository did not contain were recoverable, and the whole matrix was built on top of that mistake.

**Claim 1, false: "Ten of the 37 workstream titles are not recorded anywhere."** The ten are WS21 Advisor AI, WS22 Brokers and listers, WS24 Professional Listing Studio, WS25 Authentication and onboarding, WS26 Dashboard and account, WS27 Enquiries, messages and viewings, WS32 Accessibility, WS33 Performance, WS35 Analytics and observability, and WS37 Launch operations. Each was carried as "Not started, title unknown". Every one of the ten is partly or substantially built. Marking ten live workstreams as not started, in a document whose purpose was to decide what to build next, is the most damaging single error in this project's documentation to date.

**Claim 2, false: "The authoritative six-journey list is not recorded either."** The rejected version substituted four journeys read off a scope table in `docs/accessibility-elite-4.md` and then invented two candidates. The six authoritative journeys were written out in full in the original plan, each with entry, flow, success and recovery. They are restored verbatim in part D.

**What caused it.** The search was run against this repository and the repository was treated as the universe. The original enhancement plan was never in the repository, so the search was correct and the conclusion drawn from it was not. A reconciliation is a comparison against a source, and the source was not consulted before the comparison was declared impossible.

**Titles that were also wrong.** Codex named six examples. All six are confirmed against the baseline, and the audit of all 37 found no further title errors beyond compressions of the true title into the name of the package that touched it. The six: WS11 is Content architecture, not "Unit formatter, Arabic month plurals, punctuation lint, claim wording, British English". WS15 is Home, not "OG and Twitter images, claim wording". WS18 is Listing detail, not "Freshness thresholds, display-rule split". WS20 is Rent Index and market, not "Licensed market datasets". WS31 is SEO and AI discovery, not "Entity schema verified fields, kind-aware entity pages, default locale". WS34 is Security and privacy engineering, not "Dependency patching and Content Security Policy". In each case the rejected version had named the slice of the workstream that a shipped package happened to touch, and then judged the whole workstream against that slice. That is exactly how WS34 came to be marked Complete while findings 41 and 42, a high dependency vulnerability and the absence of a Content Security Policy, were both open in the register at the same commit.

**How the baseline was obtained, and what could not be reached.** Codex gave the owner-side path `C:\Users\salee\OneDrive\Documents\SAT Markets\SAT-Markets-Complete-Enhancement-Plan-2026-07-22.md`. That path is not reachable from this build environment: the device bridge is not connected, and `mcp__remote-devices__get_device_info` returns "The device this session is bound to is not connected to the bridge." Rather than stop and request the file, an authoritative copy of the same document was located through the Google Drive connector, which does work here, under the matching title, date and size. It was decoded, read in full at 787 lines, and committed unedited as the baseline. Full provenance is in the header of `docs/baseline-enhancement-plan-2026-07-22.md`. This is disclosed rather than glossed, because the instruction was to say so if the environment could not access the file. The environment could not access that path. It could access that document.

**What survives from the rejected version.** The status vocabulary in part B, with one rule added. The owner-decision reconciliation in part E. The findings-register reconciliation in part F. Those three sections were not built on the false claims and are carried forward with corrections where the corrected matrix changed them.

**What does not survive.** The whole of the old part C, the whole of the old part D, the whole of the old part G including its headline conclusion and its seven-item recommended sequence, and old part H items 1 and 2. None of them may be used to choose the next package.

**Preservation, so this cannot happen again.** The original plan is now at `docs/baseline-enhancement-plan-2026-07-22.md`. The current status ledger records present truth. The baseline preserves intended scope and prevents accidental omission. Neither replaces the other, and when they disagree about what a workstream is, the baseline is authoritative.

---

## B. The status vocabulary, so the labels mean one thing

| Label | What it asserts |
| --- | --- |
| **Complete** | The original user-visible outcome exists on the deployed build **and** the workstream's own acceptance condition, as written in the baseline, is satisfied. Nothing further is owed on this workstream at E0 |
| **Partial** | Real work has shipped and a stated part of the outcome is still missing. The missing part is named in the row, not implied |
| **Blocked** | Engineering cannot proceed, or may not proceed, until a named external or owner dependency clears. The blocker is named by reference, never as "pending" |
| **Deferred** | Work that could proceed and has been consciously held, with the holder recorded. Deferred is not Blocked and is not Dropped |
| **Not started** | No work has been done. Distinguished from Blocked: nothing external prevents it |

**The rule the rejected version did not apply.** Adjacent code does not make a workstream Complete. Complete means the original user-visible outcome and the original acceptance condition are both satisfied. Where a foundation exists but the complete experience does not, the label is Partial, and the row names two separate things in two separate columns: the remaining engineering work, and the external, owner, counsel, data-right or human-evidence dependency. A row with an entry in the first column and none in the second is unblocked engineering work. A row with an entry only in the second is genuinely waiting on somebody else. Under the rejected version every visible Partial row was implicitly the second kind. Under the corrected matrix most of them are the first.

Two labels this document does not use. **Dropped** requires Saleem's explicit approval and no row here has it. **Closed** is reserved for the findings register, which has its own status column and its own parse rule.

One counting rule carried from the ledger, because it explains a number that looks wrong. The register is counted closed when a status string begins "Closed". Rank 113 is deliberately held open against that parse, which is why a naive parse of the file returns 127 closed and 78 open while the ledger correctly states 126 and 79.

---

## C. The 37 workstreams, rebuilt from the baseline

Ordered by the baseline's own phases, not regrouped. Titles and acceptance conditions are the baseline's, quoted. **Kind** is V where a person using the product would notice the workstream's absence and F where they would not. **Remaining engineering work** and **External dependency** are deliberately two columns, because conflating them is what produced the conclusion Codex withdrew.

### C.0 Phase 0: Control the build

| WS | Title | Kind | Acceptance condition, as written in the baseline | Status | Evidence | Remaining engineering work | External, owner, counsel, data-right or human-evidence dependency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WS01 | Product governance | F | "No implementation decision contradicts the approved Laws." | **Complete** | `docs/LAWS.md`, `sat-markets/CLAUDE.md`, the gate command set run on every package | None | None |
| WS02 | Claim and evidence ledger | F | "No public claim ships without a current evidence entry." | **Complete** | `docs/claims-ledger.md`, `scripts/prose-scan.mjs` GATE at 0, owner ruling 3 and 4 closure | None. It gains rows, it does not reopen | None |
| WS03 | Route and state map | F | "Sitemap, robots, middleware, navigation and metadata agree." | **Complete** | `docs/routes.md`, `src/lib/routePolicy.ts`, `src/middleware.ts` | None | None |
| WS04 | Entity and taxonomy model | F | "No development is represented or routed as a district." | **Complete** | `docs/taxonomy.md`, `src/lib/locationKind.ts` | None | None |
| WS05 | Release-state language | V | "A user can distinguish current, planned, sample and stale states instantly." | **Complete** | decision D11, `src/lib/releaseState.ts`, six bilingual states | None | None |
| WS06 | Evidence protocol | F | "Every completed package has reproducible review evidence." | **Complete** | `docs/evidence-template.md` and every `docs/handback-*.md` | None | None |

### C.1 Phase 1: Rebuild shared foundations

| WS | Title | Kind | Acceptance condition, as written in the baseline | Status | Evidence | Remaining engineering work | External, owner, counsel, data-right or human-evidence dependency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WS07 | Design tokens | V | "No satestate gold; no page-specific visual constants without an approved token." | **Complete** | `docs/design-tokens.md`, `src/styles/sat-platform.css`, `docs/token-migration-results.md`, PKG-1A | None. Reopens only if the parked visual-quality package runs | None |
| WS08 | Bilingual typography | V | "Arabic uses IBM Plex Sans Arabic, zero tracking and approved sizes across all shared components." | **Complete** | PKG-1A, `docs/pkg-1b-verification.md`, live font evidence on the deployment | None | The Arabic font workflow file is an owner-side install under owner ruling 6 and explicitly does not hold this |
| WS09 | Responsive app shell | V | "No duplicate navigation, collision, overlap or horizontal page overflow from 320 to 1920 px." | **Partial** | PKG-1B, PKG-E1-READINESS slice B, `scripts/reflow-probe.mjs`, `scripts/responsive-probe.mjs`, `scripts/shell-probe.mjs` | Both recorded items are closed. The probe matrix now runs 320, 360, 390, 430, 768, 1024, 1280, 1440 and 1920 in both locales, 234 measurements, so the stated range is measured end to end. The 62 px reservation is no longer dead and no longer misplaced: findings 208 and 209. What holds this row Partial is not an engineering item. Every measurement in it is a headless Chromium render, `env(safe-area-inset-bottom)` resolves to 0 there, and no probe can answer whether a bar that occupies a third of the viewport at 400 percent zoom should collapse, shrink or unpin, which is finding 142 | Whether the shell is usable on a physical handset is a human question, not a probe question. The three ELITE-1 mobile seats M1 to M3 are allocated and gated on outreach authorisation |
| WS10 | Component system | V | "Components pass keyboard, focus, RTL, touch-size and error-state checks." | **Partial** | PKG-1B, PKG-A11Y-1 slices B to R, `scripts/touch-probe.mjs`, `scripts/radio-probe.mjs` | The medium, low and cosmetic accessibility remainder attributable to shared components, part of the 54 open P2 rows. All 7 critical and all 41 high are fixed | Independent verification of the 22 private-flow accessibility findings, which are fixed and awaiting an assistive-technology pass this environment cannot run |
| WS11 | Content architecture | V | "No hardcoded public prose, unapproved English leakage or metric mistranslation." | **Partial** | `docs/pkg-1c-closure.md`, `npm run ar-lint`, `scripts/prose-scan.mjs` | Substantial and entirely unblocked. The scan reports **372 hardcoded prose strings in 16 shared component files** as BASE, deferred rather than closed, and `SignupFlow.tsx` alone carries 33 inline bilingual literals. Three reviewer consoles, `verify/page.tsx`, `verify/viewings/page.tsx` and `verify/signups/page.tsx`, are monolingual English. The acceptance condition says no hardcoded public prose, and the gate currently enforces that only on page source | None |
| WS12 | Metadata system | F | "Every indexable template has unique valid metadata; preview never canonicalizes to an unowned domain." | **Partial** | `docs/pkg-1c-closure.md`, the metadata factory | The `x-default` target cannot be set until the production default locale is ruled, which is findings 14 and 32 | The second clause holds today. The first clause is untestable because the site is `noindex, nofollow` site-wide under owner ruling 1, and O11 holds which surface lifts it. O4 holds the default locale |
| WS13 | Data-state components | V | "No blank, ambiguous or falsely positive state." | **Partial** | decision D17, the shared data-state pattern, freshness thresholds | One unblocked defect against the acceptance condition by name: `/api/viewings` and `/api/signup` return `{ ok: true, note: "supabase not configured (request not stored)" }`, which is a falsely positive state presented to a user who believes their request was filed | O16 holds whether availability freshness keeps the reserved green, so one colour currently carries two unrelated meanings on one card |
| WS14 | PWA and app mode | V | "Install works on supported mobile browsers; private data is not cached insecurely." | **Partial** | PKG-1D, `public/manifest.webmanifest`, `docs/pwa-and-private-cache.md` | The second clause holds by construction and by defence in depth: there is deliberately no service worker, and every private prefix carries `Cache-Control: private, no-store`. That is a **scope variance from the baseline**, which names a "safe service worker", and Codex should accept or reject it explicitly rather than let it stand by omission | The first clause has never been observed. No install on a physical handset has been attempted by anyone, which is the ELITE-1 mobile seats again |

### C.2 Phase 2: Perfect public discovery

| WS | Title | Kind | Acceptance condition, as written in the baseline | Status | Evidence | Remaining engineering work | External, owner, counsel, data-right or human-evidence dependency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WS15 | Home | V | "The user understands what SAT Markets is, what is real and what to do next within the first screen." | **Partial** | `src/app/[locale]/page.tsx`, `src/components/MarketingHome.tsx` at 535 lines, four persona entry points, featured supply, open requirements, hero bands | The persona routing exists for four personas and the baseline names one clear CTA per persona; whether the first screen achieves the comprehension the acceptance describes has never been read by a first-time user | The hero bands are Rent Index figures and O10 withholds every derived figure, so the market-evidence third of the acceptance is currently a hole rather than a weakness |
| WS16 | Listings search | V | "Known test queries return correct results and every URL state is shareable and canonicalized correctly." | **Partial** | `docs/pkg-2a-plan.md`, server-side `q`, gated SearchAction, `src/app/api/saved-searches/route.ts`, `SaveSearch.tsx`, the `/listings?city=riyadh` raw-slug fix at `b3e2dfa` | Unblocked. There is no recorded known-query test set and no canonicalization test across the filter matrix, so the second half of the acceptance is asserted rather than demonstrated | None |
| WS17 | Listing card | V | "No internal code, N/A, contradictory geography or ambiguous verification label." | **Complete** | PKG-NM1 one name per listing, PKG-AV1 and AV2 availability truth, PKG-FIG1 and FIG2 figure grammar, `docs/taxonomy.md` | None | None |
| WS18 | Listing detail | V | "A user can evaluate trust and submit an enquiry without hidden facts or overlapping controls." | **Partial** | `src/app/[locale]/listings/[id]/page.tsx` at 660 lines with gallery, key facts, provenance, owner-only private documents, transit anchors, enquiry and four similar spaces | Reflow at 320 to 430 is probed; the overlap half of the acceptance above 1280 px inherits the WS09 probe gap | O16 for the freshness colour, and O10 for the market context a demand-side reader would use to judge the asking figure |
| WS19 | Map and location intelligence | V | "Map is usable in AR and EN, and every place retains the correct entity kind." | **Partial** | `docs/pkg-2a-plan.md`, kind-aware location routes, ADV-5A and ADV-5B interfaces | Map Phase 2, held by standing agreement rather than blocked | O6 for any licensed overlay, and the twelve Part E clauses for any mobility source |
| WS20 | Rent Index and market | V | "Every figure has source, period, unit, population and update date; attribution is REGA Rental Index (Ejar) only." | **Blocked** | decision O6, O10, O13, `src/lib/sources/o10.ts`, `decidePublicQuote` | None available. The mechanism is built and fails closed | O10, nine clauses of ten answered and therefore unresolved; O13 for the analytics and consultation licence; O15 for the attribution scope; owner ruling 7, which forbids representing that a data right exists |
| WS21 | Advisor AI | V | "No invented figure; every factual answer cites an approved retrievable source or explicitly abstains." | **Partial** | ADV-3A, ADV-3A.1, ADV-3B, ADV-4A, ADV-4B, `src/app/api/advisor/route.ts` at 518 lines, `unsourcedFigure` in `src/lib/market/guard.ts`, `src/lib/advisor/*`, the source viewer at `/sources` | Unblocked and named in the baseline deliverable: the Advisor surface has **no feedback control and no human-escalation route**. Neither depends on a provider agreement or on O10. Result cards exist through the shortlist route; the escalation path does not exist at all | O10 withholds every derived figure the Advisor would cite for a rent or price. ADV-3A.1 item 1 holds external processing until the owner records the provider agreement, processing terms, cross-border basis and disclosure position |
| WS22 | Brokers and listers | V | "Profile claims match verified records and consent." | **Partial** | `/brokers`, `/lister/[id]`, the owner and broker role distinction, FAL 1200025510 used only where lawful | The baseline deliverable names licence, service area, inventory and contact permissions. The profile currently displays role and inventory. Licence display and service area are unbuilt | Contact permissions depend on O14, who may bind an organisation, and on O12, which holds every outbound channel |

### C.3 Phase 3: Complete supply and demand conversion

| WS | Title | Kind | Acceptance condition, as written in the baseline | Status | Evidence | Remaining engineering work | External, owner, counsel, data-right or human-evidence dependency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WS23 | Post a requirement | V | "User completes the task on 390 px in both languages with validation and recovery." | **Partial** | PKG-DEM1, PKG-DEM2, `/post-requirement`, `RequirementForm.tsx`, `src/lib/matching.ts` | O18 clause 1, the one-time withdrawal token for new anonymous requirements, hash stored only. It depends on nothing external and it is finding 193 | Finding 117's migration is authored and unapplied by the owner, so the direct-call path can still file a requirement in a city nobody stated. O7 holds requester exposure. O5 gates the manual withdrawal route for requirements already posted |
| WS24 | Professional Listing Studio | V | "A lister can produce a tenant-decision-ready commercial listing on mobile or desktop without invented facts, hidden requirements, data loss, misleading media or a false promise of publication." | **Partial** | PKG-LS1, PKG-LS2, PKG-LS3, `src/components/ListingStudio.tsx` at 1227 lines with an asset-type-aware step model, draft resume, autosave and blockers, `ListingMediaManager.tsx`, `ListingDocsManager.tsx`, `/list` and `/dashboard/new` | Measured against the baseline's own LST-0 to LST-7 subpackages: LST-1 draft architecture and LST-2 building reuse and asset branching are substantially built. **LST-3 guided media mission, LST-4 quality assistant and contradiction engine, LST-5 exact bilingual public preview, LST-6 reviewer workspace with version comparison, and LST-7 measurement are not.** All of LST-3, LST-5 and LST-6 are unblocked engineering | LST-4 touches AI-assisted extraction and therefore inherits ADV-3A.1 item 1. LST-7 inherits O17. Two of the three ledger conditional acceptances live here, because every changed screen is session-gated and the only live channel from this environment is unauthenticated GET |
| WS25 | Authentication and onboarding | V | "Correct autocomplete, safe errors, no account enumeration and full RTL parity." | **Partial** | `/login` with `autoComplete="email"` and `current-password`, `/signup` with `SignupFlow.tsx`, `/auth/callback`, ELITE-4 journey 1 with 0 critical and 7 high, all fixed | Unblocked. There is **no recorded account-enumeration test**, and the acceptance names it explicitly. The RTL parity half is probed; `SignupFlow.tsx` carries 33 inline bilingual literals, which is the WS11 defect appearing inside this workstream | Whether a first-time lister completes onboarding alone is the ELITE-1 seats S1 and S2, held for Arabic and scheduled first |
| WS26 | Dashboard and account | V | "Each role sees a focused home with no irrelevant modules or synthetic-live ambiguity." | **Partial** | `/dashboard` at 304 lines, `/dashboard/listings`, `/dashboard/requirements`, `/dashboard/enquiries`, `/dashboard/viewings`, `/dashboard/profile`, `/me`, PKG-LS1 for the Arabic half | The role-adaptive claim in the acceptance has never been checked role by role, and no test asserts that a role sees no irrelevant module | Verification rather than construction. Every screen is session-gated |
| WS27 | Enquiries, messages and viewings | V | "Mobile exposes every required decision and private data stays protected." | **Partial** | `/dashboard/enquiries` and `[id]`, `/messages`, `/dashboard/viewings`, `/notifications`, `/api/conversations`, `/api/viewings/[id]/decision`, `/api/leads` | The confirm and decline actions exist. Whether mobile exposes **every** required decision is unmeasured at 320 and 360 px inside the authenticated shell | O12 holds every outbound notification, so a decision taken here reaches the counterparty only inside the product. Finding 118 records that registering interest notifies nobody, and that is correct until ruled |
| WS28 | Deal and documents | V | "No legal-signature, fund-holding or transaction-completion implication beyond actual capability." | **Partial** | `/deal`, `/deal/termsheet`, `/docs`, `/verify/viewings`, `/api/documents/[id]/download`, `docs/claims-ledger.md` claim C7 | **Correcting the rejected version, which said there is no deal workspace.** The three Phase 4 routes exist and the baseline route register assigns them to Track a deal as surfaces needing enhancement, not creation. What is missing against the acceptance is the separation the baseline names: user input, SAT verification, generated draft and signed artifact are not yet four distinct states on the surface | O14 for who may bind an organisation, O5 for whatever the workspace would have people agree to, O12 for anything that would notify a counterparty |

### C.4 Phase 5: Trust, legal and index readiness

| WS | Title | Kind | Acceptance condition, as written in the baseline | Status | Evidence | Remaining engineering work | External, owner, counsel, data-right or human-evidence dependency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WS29 | Pricing and entitlements | V | "Every CTA and entitlement works exactly as described." | **Blocked** | `docs/claims-ledger.md` claim C5, decision O1, `/pricing` | None available until the position is ruled | O1, and the commercial decision the baseline names as a dependency in its own right |
| WS30 | Legal and privacy | V | "Zero placeholders and a documented approval date." | **Blocked** | decision O2, O5, finding 9, `/terms`, `/privacy`, `/contact`, `/neutrality` | None available. Placeholders cannot be replaced by a builder | O5, and no Saudi counsel memorandum is commissioned. This also gates half of the O18 withdrawal ruling, because a manual privacy request has nowhere to land until `/contact` is real |
| WS31 | SEO and AI discovery | F | "Only truthful, complete, canonical pages become indexable." | **Blocked** | decision O4, O6, O7, O11, findings 14 and 32, the entity pages and verified fields that already render | None available. The acceptance is about what becomes indexable and nothing may | Owner ruling 1 parks domain and indexing. O11 holds which surface lifts the noindex. O4 holds the default locale. The baseline additionally makes this depend on real inventory and on WS30 |

### C.5 Phase 6: Hardening and release evidence

| WS | Title | Kind | Acceptance condition, as written in the baseline | Status | Evidence | Remaining engineering work | External, owner, counsel, data-right or human-evidence dependency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WS32 | Accessibility | V | "Zero critical or serious accessibility defects on primary journeys." | **Partial** | PKG-ELITE-E1 slice E, PKG-A11Y-1 slices B to R, `docs/accessibility-elite-4.md`, `docs/a11y-p1-triage.md`, 126 defects found, all 7 critical and all 41 high fixed | **The correction that only the right journey list could reveal.** ELITE-4 audited four journeys, and they were not the baseline's six. Mapping its scope table onto the authoritative journeys, **Track a deal was never audited and Research the market was never audited**, and Manage supply and demand was audited only through the listing-inventory screens. `/deal`, `/deal/termsheet`, `/docs`, `/verify/viewings`, `/rent-index`, `/market`, `/advisor`, `/area`, `/hbu`, `/invest`, `/sources`, `/messages`, `/notifications`, `/saved`, `/me`, `/dashboard/enquiries/[id]` and `/dashboard/viewings` carry no manual pass, being seventeen surfaces in all. Extending the pass to them is unblocked engineering | Independent verification of the 22 private-flow findings that are fixed and awaiting an assistive-technology pass. ELITE-1-AT covers the public path only, which part D.5 states exactly |
| WS33 | Performance | V | "At p75: LCP at most 2.5 s, INP at most 200 ms and CLS at most 0.1 on mobile and desktop." | **Partial** | Server components throughout, `next/font` for all four faces, no client-side data waterfall on the public routes | Almost everything, and almost all of it unblocked. There is **no lab performance baseline of any kind**, one `next/image` usage across the whole tree, one `next/dynamic` usage, no bundle budget, no map deferral and no caching strategy document. A synthetic lab measurement is not behavioural measurement of a user and needs no consent, so the first Core Web Vitals baseline can be taken now | The acceptance names p75, which is a field statistic and therefore requires real-user monitoring. O17 holds that, and no vendor may be installed. The lab work is unblocked; the acceptance as written is not satisfiable until O17 clears |
| WS34 | Security and privacy engineering | F | "No anonymous private access, no high dependency vulnerability without exception, and security headers verified." | **Partial** | `src/middleware.ts` private prefixes with `no-store`, RLS review in ADV-1C and ADV-4B, signed download route, PII minimisation in the requirement model | **The rejected version marked this Complete while two of its own findings were open in the register at the same commit.** Finding 41, one high and one moderate dependency vulnerability, confirmed open. Finding 42, no Content Security Policy, confirmed open, report-only first. Neither rate limiting nor bot defence exists. All of it is unblocked engineering | The two Supabase advisories on `public.spatial_ref_sys` and `public.map_anchors` are owner-side and must not be auto-remediated, because enabling RLS without policies blocks all access. `spatial_ref_sys` may be PostGIS extension-owned |
| WS35 | Analytics and observability | F | "Every primary journey and guardrail can be measured without exposing sensitive content." | **Partial** | PKG-ELITE-E1 slice F, `docs/elite-8-event-dictionary.md`, 46 events, 48 properties, 30 forbidden by name, 12 measures with no invented target, `COLLECTION_AUTHORISED = false` | The taxonomy half is done. **Error logging and release dashboards are not behavioural measurement of users and do not need the O17 basis**, and neither exists. That part is unblocked | O17 holds all 46 events and the fourteen-item readiness record is written and unrun. No analytics vendor may be installed or sent data. Product telemetry stays off unless a separate bounded research authorisation is approved |
| WS36 | CI and regression prevention | F | "A failed quality gate blocks merge." | **Blocked** | `docs/owner-actions-adv-1c1.md`, the gate command set run by hand on every package | None available from this environment | The deploy token has no `workflow` scope and `.github/workflows/` cannot be pushed from here. The owner installs `arabic-font.yml` and the gate workflow. A workflow-scoped token must not be requested |

### C.6 Phase 7: Launch and optimize

| WS | Title | Kind | Acceptance condition, as written in the baseline | Status | Evidence | Remaining engineering work | External, owner, counsel, data-right or human-evidence dependency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WS37 | Launch operations | F | "Launch can be paused or rolled back without data loss or misleading index exposure." | **Not started** | None. No go-live checklist, rollback runbook, incident-ownership record or monitoring plan exists in `docs/` | The checklist, the rollback runbook and the incident-ownership record are documents and can be written at any time. They are correctly sequenced last rather than blocked | Search submission and monitoring depend on owner ruling 1 and on WS31 |

### C.7 The count

| Status | Count | Workstreams |
| --- | --- | --- |
| **Complete** | 9 | WS01, WS02, WS03, WS04, WS05, WS06, WS07, WS08, WS17 |
| **Partial** | 22 | WS09, WS10, WS11, WS12, WS13, WS14, WS15, WS16, WS18, WS19, WS21, WS22, WS23, WS24, WS25, WS26, WS27, WS28, WS32, WS33, WS34, WS35 |
| **Blocked** | 5 | WS20, WS29, WS30, WS31, WS36 |
| **Deferred** | 0 | None. Map Phase 2 is a deferred slice inside WS19, not a deferred workstream |
| **Not started** | 1 | WS37 |
| **Dropped** | 0 | None, and none without Saleem's explicit approval |

The rejected version reported 27 workstreams with a status and 10 as "Not started, title unknown". The corrected matrix has 37 with a status, and the ten that were called not started are one Partial short of the whole of Phase 3, Phase 4 and Phase 6.

---

## D. The six journeys, restored

### D.1 What was replaced

The rejected version did not use the journey list from the enhancement plan. It
used four journeys copied out of `docs/accessibility-elite-4.md` line 90, which
were the four scopes an accessibility audit had happened to read, plus two
further journeys it labelled candidates because it could not find them anywhere.
That is a record of what one audit covered, not a product definition, and it must
not be used as one.

The authoritative six journeys are in the baseline at lines 44 to 59, under the
heading "Six Journeys Define the Product", with a five-column table giving each
journey an entry, a flow, a success condition and a recovery expectation. They
are used verbatim below and are not renamed, reordered, merged or supplemented.

| Rejected version | Corrected |
| --- | --- |
| J1 Authentication and organization onboarding | Not a journey. Authentication is WS25, and the surfaces sit inside "List a property" and "Manage supply and demand" |
| J2 Listing Studio and inventory management | Not a journey. It splits across "List a property" (creation and verification) and "Manage supply and demand" (inventory upkeep) |
| J3 Search, listing detail and Evidence Passport | Corresponds to "Find and enquire", but stops at the listing page and omits enquiry, message and viewing request |
| J4 Requirement creation and matching | Corresponds to "Post a space requirement", but the baseline journey continues into tracking responses |
| C5 candidate | Withdrawn. The real journey is "Track a deal" |
| C6 candidate | Withdrawn. The real journey is "Research the market" |
| Absent entirely | "Manage supply and demand" was never named as a journey in the rejected version |

### D.2 The six journeys mapped to the shipped product

Each row uses the journey name exactly as the baseline writes it. The success
condition is quoted from the baseline journey table. The routes are the ones the
baseline's own route register assigns to that journey, and every one of them
exists as a shipped template, verified by comparing the 58 routes in the register
against the 60 `page.tsx` files in `src/app`.

| Journey | Success condition, as written in the baseline | Baseline routes | Workstreams | Status | What is missing for the journey to be complete |
| --- | --- | --- | --- | --- | --- |
| 1. Find and enquire | "A qualified enquiry is submitted and visible to both authorized parties." | `/`, `/area`, `/brokers`, `/building/[id]`, `/lister/[id]`, `/listings`, `/listings/[id]`, `/listings/[id]/flyer`, `/locations`, `/map` | WS15, WS16, WS17, WS18, WS19, WS22 | **Partial** | The route exists end to end and an enquiry does reach the dashboard. Home is not the persona-aware search-led surface WS15 describes, the canonicalization matrix WS16 names is untested, saved search does not exist, and the Arabic invalid-enquiry evidence for finding 203 still needs one interactive session |
| 2. Post a space requirement | "A consented requirement is stored and can receive matching responses." | `/post-requirement`, `/requirements`, `/requirements/[id]` | WS23 | **Partial** | Storage, consent and matching exist. Withdrawal for anonymous requesters is designed under ruling O18 and not built, edit-after-submit rules are not implemented, and the recovery column's field-level help is uneven |
| 3. List a property | "A complete listing reaches the correct verification queue with no false publication promise." | `/signup`, `/list`, `/dashboard/new`, `/verify`, `/verify/signups` | WS24, WS25 | **Partial** | This is the least complete of the six. LST-1 and LST-2 are substantially built. LST-3 guided media mission, LST-4 quality assistant, LST-5 bilingual factual composer with exact public preview, LST-6 reviewer workspace and LST-7 analytics are not. The three reviewer consoles are English only. WS25 has no recorded account-enumeration test |
| 4. Manage supply and demand | "The next best action is obvious and completed without leaving the workspace." | `/dashboard`, `/dashboard/enquiries`, `/dashboard/enquiries/[id]`, `/dashboard/listings`, `/dashboard/listings/[id]`, `/dashboard/profile`, `/dashboard/requirements`, `/dashboard/viewings`, `/login`, `/me`, `/messages`, `/notifications`, `/saved` | WS26, WS27 | **Partial** | Thirteen surfaces exist and are role-gated. The dashboard is a set of lists rather than the role-adaptive command centre WS26 names, there is no next-best-action model, and the reminder half of WS27 is held by ruling O12 because a reminder is an outbound notification |
| 5. Track a deal | "All participants understand status, evidence, responsibility and what SAT Markets does not do." | `/deal`, `/deal/termsheet`, `/docs`, `/verify/viewings` | WS28 | **Partial** | The four surfaces exist. What WS28 actually requires and what does not exist is the four-way separation of user input, SAT verification, generated draft and signed artifact, plus version history and an unresolved-item list |
| 6. Research the market | "User receives a source-attributed answer without invented figures or taxonomy ambiguity." | `/advisor`, `/market`, `/rent-index`, `/hbu`, `/invest` | WS20, WS21 | **Blocked in part, Partial in part** | WS20 is Blocked on publication rights, which is a genuine external dependency and the one place the withdrawn conclusion was accidentally right. WS21 is Partial for reasons that are not external: the Advisor has numeric abstention and a `/sources` viewer, but the feedback control and the human-escalation route named in its own deliverable do not exist and depend on neither O10 nor a provider agreement |

Two shipped routes are not in the baseline register because they were built after
22 July 2026: `/sources`, the source viewer that WS21 names as a deliverable, and
`/verification`, which explains verification scope. Both serve journeys 1 and 6.
They are additions, not substitutions, and neither displaces a register row.

### D.3 The eighteen routes the baseline does not assign to a journey

The register assigns 40 of its 58 routes to a journey. The remaining 18 carry
category labels rather than journey names, and this is the baseline's own
structure, not a gap in it.

| Category in the register | Routes | What it is |
| --- | --- | --- |
| Routing | `/agent`, `/bilingual`, `/compare`, `/find`, `/go`, `/search`, `/thinking-map` | Aliases and redirects. WS03. They preserve a journey rather than being one |
| Trust and company | `/about`, `/contact`, `/neutrality`, `/pricing`, `/privacy`, `/terms` | Company and legal surfaces. WS29 and WS30. Read across journeys, owned by neither |
| Operations | `/admin`, `/admin/accounts`, `/admin/signups`, `/ops`, `/proto` | Internal. Not user journeys at all |

Three journey cells in the register read "Professional Listing Studio",
"Professional Listing Studio entry" and "Professional Listing Studio
verification" for `/dashboard/new`, `/list`, `/verify` and `/verify/signups`.
Those are WS24 package labels appearing in the journey column. The journey those
four routes serve is journey 3, "List a property", whose flow in the journey
table is "Choose role; identify property; set location kind; enter facts; upload
evidence; review; submit; verification; publish". They are mapped to journey 3
above on that basis, which is a reading of the baseline rather than a rename of
anything. The register also writes journey 2 in its short form, "Post a
requirement". The journey table's full form, "Post a space requirement", is the
one used here.

### D.4 What the correct journey list reveals, and the rejected version could not

The accessibility programme, WS32, audited four journeys in ELITE-4. Those four
were not the baseline's six. Setting the audit scope table at
`docs/accessibility-elite-4.md` lines 92 to 98 against the corrected map:

| Journey | Audit coverage |
| --- | --- |
| 1. Find and enquire | Covered. ELITE-4 journey 3 read `listings/page.tsx`, `listings/[id]/page.tsx`, `FilterBar.tsx`, `Gallery.tsx`, `ListingsMap.tsx`, `EvidencePassport.tsx`, `ProvenanceChip.tsx`, `ListingEnquiry.tsx`, `ReportListing.tsx`, `Header.tsx`, `LocationFacts.tsx` |
| 2. Post a space requirement | Covered. ELITE-4 journey 4 |
| 3. List a property | Covered. ELITE-4 journeys 1 and 2 |
| 4. Manage supply and demand | Partly covered. Only through the listing-inventory screens in ELITE-4 journey 2. `/messages`, `/notifications`, `/saved`, `/me`, `/dashboard/enquiries/[id]` and `/dashboard/viewings` were not read |
| 5. Track a deal | **Not audited at all.** `/deal`, `/deal/termsheet`, `/docs` and `/verify/viewings` appear in no ELITE-4 scope row |
| 6. Research the market | **Not audited at all.** `/rent-index`, `/market`, `/advisor`, `/area`, `/hbu`, `/invest` and `/sources` appear in no ELITE-4 scope row |

This is the single most consequential correction in this document. WS32's
acceptance condition is "Zero critical or serious accessibility defects on
primary journeys". Two of the six primary journeys have never been assessed
against it, and a third only partly. No claim about accessibility coverage on
those surfaces can be made from ELITE-4, and the rejected version could not have
found this, because it did not have the list of journeys to compare against.

The unaudited surfaces, named so the gap is closable rather than merely stated:
`/deal`, `/deal/termsheet`, `/docs`, `/verify/viewings`, `/rent-index`,
`/market`, `/advisor`, `/area`, `/hbu`, `/invest`, `/sources`, `/messages`,
`/notifications`, `/saved`, `/me`, `/dashboard/enquiries/[id]`,
`/dashboard/viewings`. This is engineering and audit work. It is not waiting on
an owner, on counsel or on a data right.

### D.5 What ELITE-1-AT validates, stated exactly

Codex required that the ELITE-1-AT session not be presented as validating the 22
outstanding private-flow accessibility findings. It is not presented that way in
this document and the recruitment sheet is corrected in the same batch.

A1 validates, and only validates, that a daily screen-reader user, on their own
configuration and their own speech rate, using VoiceOver on iOS Safari or NVDA on
Windows Chrome, can operate four public surfaces: the home page, the listings
index with one filter applied, one listing detail page including its Evidence
Passport, and the requirement form up to but not through submission. That is
journey 1 up to the enquiry, and the first screen of journey 2.

A1 does not validate registration, the Listing Studio, the dashboard, the deal
workspace or any research surface. It therefore says nothing about journeys 3, 4,
5 or 6, and nothing about the 22 findings, which are in the private flows.

The 22 findings are fixed and awaiting independent verification. They are not
known-broken surfaces and must not be described as such. Verifying them requires
a separate authenticated assistive-technology round, with test accounts, seeded
inventory and consent to operate an account under observation, and that round is
scheduled in the recruitment sheet as a distinct commitment rather than folded
into A1.

---

## E. The status ledger, reconciled

Carried forward from the rejected version, which was not wrong here, with every
reference to the withdrawn journey labels replaced by the authoritative journey
names.

The ledger's own sections are correct at this commit and are not restated. What
follows is the reconciliation Codex asked for: every open owner outcome, with the
label this document uses.

| Ref | Status | What it holds shut | Cost of leaving it |
| --- | --- | --- | --- |
| O1 pricing visibility | **Blocked on owner** | The pricing page CTA truthfulness | One public page states a position nobody has ruled |
| O2 SAT Markets and SAT Real Estate relationship | **Blocked on owner** | `/neutrality` | A neutrality page that cannot state the thing it exists to state |
| O4 production default locale | **Blocked on owner** | `x-default`, findings 14 and 32 | Two P1 findings held open by one sentence |
| O5 legal wording and counsel | **Blocked on counsel** | Terms, Privacy, Contact, finding 9, and half of O18 | The single highest-leverage unblock in this document |
| O6 licensed datasets for public display | **Blocked on owner** | Broker and market overlays stay internal | Journey 6, Research the market, stays interface-only in the overlay layer |
| O7 requirements indexability and requester exposure | **Blocked on owner** | Consent and redaction on the demand side | Journey 2, Post a space requirement, cannot be opened to search even if ruling 1 changed |
| O8 canonical-law amendments into the knowledge base | **Deferred** | Law drift between repository and knowledge base | Low. Both are currently in step |
| O9 origin of the gstack instruction | **Deferred** | A documentation tidy | None. Recorded so it is not mistaken for an instruction |
| **O10 REGA Rental Index (Ejar) permitted use** | **Blocked on external confirmation** | Every derived Rent Index figure on every channel | The largest single external hole in the visible product. Nine of ten clauses answered is unresolved, and the decision fails closed |
| O11 which surface lifts the noindex | **Deferred by owner ruling 1** | Finishing ADV-4 | None at E0 |
| **O12 notification consent basis** | **Ruled held** | Every external channel: email, SMS, WhatsApp, push | Finding 118. Registering interest notifies nobody, and that is correct until ruled. It also holds the reminder half of WS27 inside journey 4 |
| O13 REGA analytics and consultation licence | **Blocked on external** | The bulletin, HBU, investment scenarios, PD4 deed checks | Journey 6 again, and PD4 |
| O14 who may bind an organization | **Blocked on owner** | Progressive disclosure and mutual-interest contact release | The contact-release step inside journeys 4 and 5 cannot start |
| O15 Rent Index attribution scope | **Blocked on owner** | Finding 45. A proposed rule is written and awaiting approval | One P1 finding, and a rule already drafted |
| O16 availability freshness colour | **Blocked on owner** | Finding 46's follow-up | One colour carries two unrelated meanings on one card |
| **O17 lawful basis for behavioural measurement** | **Ruled held** | The 46 events. `COLLECTION_AUTHORISED` is a module constant set to false | No product telemetry. The fourteen-item readiness record is written and unrun. It does not hold the WS33 lab baseline or the WS35 error log, for the reason given in part C |
| **O18 anonymous withdrawal identity** | **Ruled and recorded 2026-08-02, implementation sequenced** | Finding 193 | No longer an open question. It is queued engineering work inside journey 2 |
| **O19 whether a research round may record** | **Open, new** | Every ELITE round after round one | None for round one, which is notes only. It becomes a cost if the owner later wants replayable sessions |

Three ledger conditional acceptances carry forward unchanged and are restated here
because they are the difference between "shipped" and "true": PKG-LS2, whose commit
`d2d2fb5` never received its own build and reached production carried by `44a143f`;
PKG-LS3 and finding 11, neither verifiable end to end because both are session
gated; and finding 203, which is engineering-complete and awaiting one interactive
Arabic session that submits an invalid enquiry, a past-dated viewing request and a
missing-city requirement. None of the three is a defect. All three are evidence this
environment cannot produce, because the only live channel here is unauthenticated
GET.

---

## F. The findings register, reconciled

Carried forward from the rejected version with one arithmetic correction. The
rejected version wrote 79 open rows and then listed 6 at P0, 19 at P1 and 53 at
P2, which sums to 78. The ledger is right and the severity line was wrong. P2 is
54.

205 rows. 126 carry a status the ledger counts as closed; 79 do not. A naive parse
that closes any row whose status begins "Closed" returns 127 and 78, because rank
113 reads "Closed in PKG-DEM1 for the reading, open for the data" and is
deliberately held open against that parse. The ledger's figure is the correct one.

| Severity | Open | Rows | What they are, honestly |
| --- | --- | --- | --- |
| **P0** | 6 | 4, 9, 10, 11, 12, 114 | Not six live defects. Finding 9 is O5 counsel placeholders, finding 11 is fixed and awaiting a session-gated verification, and finding 114 is verified on the deployment with a stated corpus qualifier. The genuinely open engineering P0s are fewer than the count suggests, and the count is left honest rather than re-graded to look better |
| **P1** | 19 | 13, 14, 15, 16, 17, 19, 20, 21, 25, 29, 30, 31, 32, 45, 62, 117, 170, 193, 203 | Three are owner-ruling rows in disguise: 14 and 32 fall to O4, 45 falls to O15. One is an owner-applied migration: 117. Two are verification-gated rather than unbuilt: 193 is ruled and sequenced, 203 is engineering-complete and awaiting an interactive session. That leaves 13 genuine P1 engineering items |
| **P2** | 54 | 37, 38, 39, 40, 41, 42, 43, 44, 47, 48, 49, 53, 63, 64, 74, 75, 80, 81, 92, 93, 94, 96, 97, 99, 102, 103, 113, 115, 116, 118, 138, 142, 144, 146, 151, 152, 163, 169, 172, 173, 175, 176, 177, 178, 183, 185, 186, 188, 189, 190, 191, 194, 195, 202 | The accessibility remainder is the bulk of this. 78 of the 126 ELITE-4 defects were recorded and not fixed, all of them medium, low or cosmetic after every critical and high was closed. They are a backlog with a known shape, not an unknown risk. Two of them, 41 and 42, are WS34 rows and are the reason WS34 is Partial rather than Complete in part C |
| **P3** | 0 | none | Fully closed |

The movement worth recording: P1 fell from 55 to 19 across PKG-A11Y-1, and the gross
figure is larger than the net because 47 rows carry that package in their status
while 13 new findings, 193 to 205, were raised during it and 8 of those were closed
inside it. A package that raises findings while closing them is working correctly.

One correction that belongs here rather than in part C, because it is a register
fact: findings 41 and 42 both read "Confirmed open" at `docs/findings-register.md`
lines 52 and 53, and both are WS34 items, being a high and a moderate dependency
advisory and the absence of a Content Security Policy. They were open at the
commit at which the rejected version marked WS34 Complete. A workstream cannot be
Complete while its own acceptance condition, "No anonymous private access, no high
dependency vulnerability without exception, and security headers verified", is
contradicted by two open rows in the register that document it.

---

## G. The withdrawn conclusion, and what the corrected matrix says instead

### G.1 The withdrawal, in the words that were used

The rejected version stated, in bold, in the section that answered Codex's actual
question:

> "Every single visible workstream still marked Partial or Blocked is waiting on
> something other than engineering time."

**That sentence is withdrawn. It is false.** It is withdrawn here rather than
edited, so that anyone who read it can find the retraction next to the claim.

It was false for a mechanical reason and a structural one. Mechanically, it was
asserted over a matrix of 27 workstreams, 10 of which had been declared unknown.
Six of those ten, WS21, WS22, WS24, WS25, WS26 and WS27, are visible product
workstreams, and four of them carry unblocked engineering work. A conclusion about
"every visible workstream" that omits six visible workstreams is not a conclusion.

Structurally, it followed from the same error that produced the unknown titles.
Because the enhancement plan was not read, each workstream was assessed against
adjacent code rather than against its own acceptance condition. Adjacent code is
always present, so everything that had any code looked Complete, everything that
had none looked unknown, and the only things left visibly incomplete were the ones
an owner ruling was already holding. The conclusion was an artefact of the method.

The seven-item recommended sequence that the rejected version built on that
conclusion is withdrawn with it. Codex has directed that this reconciliation not be
used to choose the next package, and no sequence is proposed here. Part G.2 is an
inventory, not an order.

### G.2 Unblocked engineering work the corrected matrix reveals

Every row below is taken from the corrected part C. A row appears here only when
part C records remaining engineering work in column 7 and records nothing external,
owner, counsel, data-right or human-evidence in column 8 that holds *that specific
item*. Several of these workstreams also carry an external dependency against a
different clause of their acceptance; where that is so, it is named.

| WS | Unblocked item | Size, honestly | Also carries an external dependency elsewhere |
| --- | --- | --- | --- |
| WS09 | ~~Extend the responsive probe matrix from 1280 px to 1920 px, and resolve the dead 62 px `main.has-tabbar` padding~~ **Done in PKG-E1-READINESS slice B.** The size estimate was wrong in an instructive way. "One array and one rule" described the array correctly, and the rule turned out to be three separate defects: the class was set by a server component that cannot read the pathname, so it could not have been conditional; the reservation sat on `main`, which is not the last element in the document, so on the routes that do have a bar the footer ran underneath it; and the probe written to measure all this read the top of every page because `html{scroll-behavior:smooth}` makes a synchronous read after `scrollTo` return the pre-scroll position. Findings 208 and 209 | Small. One array and one rule | Yes. Physical-handset use is ELITE-1 mobile seats M1 to M3 |
| WS10 | The shared-component share of the 54 open P2 accessibility rows | Medium, known shape | Yes. Independent verification of the 22 fixed private-flow findings |
| WS11 | 372 hardcoded prose strings across 16 shared component files, 33 inline bilingual literals in `SignupFlow.tsx`, and three monolingual English reviewer consoles | Large. It is the single largest unblocked item in the product, and the acceptance condition forbids exactly what is there | No |
| WS13 | Remove the falsely positive `{ ok: true, note: "supabase not configured (request not stored)" }` from `/api/viewings` and `/api/signup` | Small. Two routes | Yes, for the freshness colour, O16 |
| WS16 | A known-query test set and a canonicalization matrix across the filter states | Medium | No |
| WS21 | The Advisor feedback control and the human-escalation route, both named in the WS21 deliverable | Medium | Yes. O10 for figures, ADV-3A.1 for external processing |
| WS22 | Licence display and service area on the profile | Small to medium | Yes. Contact permissions need O14 and O12 |
| WS23 | O18 clause 1, the one-time withdrawal token, hash stored only | Small | Yes. Clause 2 needs O5, and finding 117's migration is an owner action |
| WS24 | LST-3 guided media mission, LST-5 exact bilingual public preview, LST-6 reviewer workspace with version comparison | Large. This is a phase, not a package | Yes. LST-4 inherits ADV-3A.1, LST-7 inherits O17 |
| WS25 | A recorded account-enumeration test, which the acceptance names explicitly | Small | Yes. First-time completion is ELITE-1 seats S1 and S2 |
| WS26 | A role-by-role assertion that no role sees an irrelevant module | Small | No, beyond the session gating every authenticated screen has |
| WS27 | Measure that mobile exposes every required decision at 320 and 360 px inside the authenticated shell | Small | Yes. O12 holds outbound notification |
| WS28 | Separate user input, SAT verification, generated draft and signed artifact into four distinct states across `/deal`, `/deal/termsheet` and `/docs`, plus version history and an unresolved-item list | Large | Yes. O14, O5 and O12 hold different clauses |
| WS32 | Audit Track a deal and Research the market, which have never been assessed, and the unread half of Manage supply and demand. Seventeen surfaces are named in part D.4 | Large, and it is a gap in the acceptance condition rather than a backlog | Yes. Independent verification of the 22 |
| WS33 | A first synthetic lab performance baseline, a bundle budget, an image strategy and map deferral | Medium to large, and none of it needs consent | Yes. The p75 field statistic in the acceptance needs O17 |
| WS34 | Patch the high and moderate dependency advisories in finding 41, ship a report-only Content Security Policy for finding 42, add rate limiting and bot defence | Medium, and two of its own findings are open in the register | Yes, only for the two Supabase RLS advisories, which are owner-side and must not be auto-remediated |
| WS35 | Error logging and release dashboards, neither of which is behavioural measurement of a user and neither of which needs the O17 basis | Medium | Yes. All 46 events stay held by O17 |
| WS37 | The go-live checklist, the rollback runbook and the incident-ownership record | Small to medium, and they are documents | Yes. Search submission needs owner ruling 1 and WS31 |

Eighteen of the 28 workstreams that are not Complete carry unblocked engineering
work. Four workstreams have genuinely none available: WS20 Rent Index and market,
WS29 Pricing and entitlements, WS30 Legal and privacy and WS31 SEO and AI
discovery. WS36 has none available from this environment specifically, because the
deploy token has no `workflow` scope. WS12, WS15, WS18 and WS19 sit between: each
has a clause a builder could progress and a clause an owner ruling holds.

### G.3 The corrected answer to the question Codex asked

The question was whether visible product work is being displaced by governance
work. The corrected answer has two halves and neither is the one the rejected
version gave.

**On displacement: partly yes, and the recent balance is real.** Of the packages in
ledger section 2, the visible-outcome majority sits early. The recent sequence,
PKG-ELITE-E1 slices A, B, D and F, PKG-A11Y-1 slice A, the Codex bounded batch
items 2 to 4 and this document, is governance. Two recent items were not
displacement at all: PKG-ELITE-E1 slice E and PKG-A11Y-1 slices B to R are the
accessibility pass and its remediation, 126 defects found and every critical and
every high fixed, which is the largest single quality improvement in the product's
history. Finding 203 is visible by effect, because an Arabic reader currently meets
an English error sentence and after the fix does not.

**On the cause: no, it is not because nothing else could be built.** That was the
false part. There is a substantial amount of unblocked engineering work, it is
listed in G.2, and three items in particular are large: WS11's 372 strings, WS24's
LST-3, LST-5 and LST-6, and WS32's two entirely unaudited journeys. The reason
recent packages were governance is that governance was chosen, which is a defensible
choice at E0 and a different statement from the one that was made.

**What is still true from the rejected version, restated with the correct
support.** The product is at E0, it has 50 preview listings, 6 requirements and 0
registered interests, and no external person has ever attempted any of the six
journeys. Verification, not construction, is the binding constraint on knowing
whether what is built works. That was true before this correction and remains true.
It is a statement about evidence. It is not a statement about the availability of
engineering work, and the rejected version conflated the two.

### G.4 What this document deliberately does not do

Codex directed: "Do not start implementation, do not contact participants, and do
not use the present reconciliation to choose the next package. After the corrected
matrix, Codex and Saleem will approve the product sequence."

Accordingly: no code was written in this batch, no participant was contacted, no
package is recommended, and G.2 is ordered by workstream number rather than by
priority so that it cannot be read as a sequence. ELITE-1 outreach authorisation
remains a separate owner sentence and is not requested here.

---

## H. Owner and advisor inputs this document still needs

The first two items in the rejected version's part H are removed, because both were
answered by the baseline document and neither was ever an owner input. They are
recorded here as removed rather than deleted silently.

| Rejected item | Disposition |
| --- | --- |
| 1. The ten unrecorded workstream titles | **Removed.** Never an owner input. All 37 titles are in the baseline and are now in part C |
| 2. The authoritative six-journey list | **Removed.** Never an owner input. All six are in the baseline and are now in part D |

What remains genuinely open. **Four of these five were ruled on 2026-08-02 and are
struck through in place rather than deleted, because a list of open questions is
also a record of which ones were asked.**

1. **Decision O19**, whether an ELITE round may be recorded and on what terms.
   Round one is notes only and needs nothing. **Still open**, and it is the only
   item on this list that is. The 90-day raw-notes bound in item 4 was accepted on
   the same day without this question being answered, and the two must not be
   confused: a retention period for notes is not permission to record.
2. ~~Whether any row in this document should be labelled Dropped.~~ **Answered
   2026-08-02, decision D36. No workstream is Dropped.** The part C.7 distribution
   stands unchanged at Complete 9, Partial 22, Blocked 5, Deferred 0, Not started 1,
   Dropped 0.
3. ~~The WS14 scope variance.~~ **Answered 2026-08-02, decision D34. Accepted as an
   E0 safety variance only.** WS14 stays Partial and is not made Complete by the
   acceptance. A strictly public-shell service worker is reconsidered after physical
   mobile research, not before it, and private and authenticated responses must never
   enter an offline cache whatever shape a later worker takes. The acceptance does not
   carry past E0 without being re-ruled.
4. ~~The raw-notes retention period.~~ **Answered 2026-08-02, recorded against O19.
   Ninety days after the final session is accepted as the ceiling**, not assumed as a
   default. Shorter stays available to the owner; longer is recorded before a round
   runs.
5. ~~The product sequence itself.~~ **Answered 2026-08-02, decision D37.**
   PKG-E1-READINESS first, covering WS13, WS09, WS16, WS25, WS33 and WS34, with
   ELITE-1 recruitment and scheduling running alongside it. After it, no further
   foundation package: the next major product package is the visible public-discovery
   experience across Home, Listings Search, Listing Detail and Brokers/Listers,
   informed by the first ELITE-1 observations. G.2 was the inventory the sequence
   would be chosen from and remains exactly that. The sequence came from the advisor
   and the owner, which is what this document declined to do for itself and was right
   to decline.

---

*Corrected under the Codex rejection of `d34ebfa`, 2026-08-02. Rebuilt against
`docs/baseline-enhancement-plan-2026-07-22.md`, which is the complete enhancement
plan of 22 July 2026 preserved unedited. Documentation only. No code, no package,
no implementation started, no participant contacted.*
