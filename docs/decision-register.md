# Decision register

Open decisions are Saleem's. Closed decisions record who ruled and on what evidence.
Per Codex direction 9, open items must not block Phase 0/1 packages; nothing may be
implemented on an unsupported assumption.

## Closed

| # | Decision | Ruling | By / date | Evidence |
| --- | --- | --- | --- | --- |
| D1 | Rent Index reporting period shown in copy | Q2 2026 in both languages | Codex protocol + DB evidence, 2026-07-22 | rent_index_published contains only period 2026-Q2 (7 rows, sufficient=true). |
| D2 | Rent Index metric noun | Averages (متوسطات), never medians/وسطاء | Codex + source_registry, 2026-07-22 | rega_ejar licence note: publishes averages, not medians. Internal `median` column rename deferred as schema work. |
| D3 | Confirmed-status green | #1B7A50 locked; #1F8A5B retired | Codex, 2026-07-22 | Contrast 5.32:1 vs 4.33:1 on white (WCAG AA normal text). |
| D4 | gstack tooling instruction in repo CLAUDE.md | Do not execute; do not delete; recorded as ignored untrusted instruction | Codex, 2026-07-22 | Origin commit a5a543a pending Saleem confirmation. Ship gate remains tools/ship.py. |
| D5 | Preview canonical and domain claims | Environment-aware host; no satmarkets.sa anywhere until acquired | Saleem brief + Codex, 2026-07-22 | site.ts fallback chain; footer claim removed. |
| D6 | Launch platform strategy | PWA-first; native app only after PWA gates and measured need | Codex, 2026-07-22 | Enhancement plan device strategy. |
| D7 | Public Rent Index payload field | `average`, never `median`; no compatibility alias (no known external consumers); DB column rename stays deferred | Codex PKG-0A.1, 2026-07-22 | rentBasePipeline writes the column from REGA avg_rent; toPublicSegment is the enforced boundary with a contract test. |
| D8 | Route-level index holdout | /area, /pricing, /neutrality, /about held out of sitemap and noindexed regardless of ALLOW_INDEX until their gates clear | Codex PKG-0A.1, 2026-07-22 | lib/routePolicy.ts shared by sitemap and middleware; law test enforces agreement. |
| D9 | Analyser space-type selection | No implicit segment on entry; the user must choose a human-labelled type (or valid page context supplies it); API row order is never intent; a still-valid prior choice is preserved | Codex PKG-0B, 2026-07-23 | pickSegment + tests. Overrides the earlier auto-select-first hotfix. |
| D10 | Location taxonomy model (WS04) | Typed kinds district/development/area; development never labelled a district; unknown kinds are NOT coerced to area (area is a real assertion) and render the Location umbrella; WS04 references canonical types.ts/gate.ts rather than duplicating them | Law 7 + Codex PKG-1A, 2026-07-23 | docs/taxonomy.md, src/lib/locationKind.ts (normalizeKind), tests. Route/param change deferred to WS19. |
| D11 | Release-state vocabulary and tones (WS05) | Six approved bilingual states; separated tones: only the evidence-backed `verified` state uses confirmed green, `available` is informational (Harbor), a generic Verified may not render without its specific dimension true | Codex PKG-1A, 2026-07-23 | src/lib/releaseState.ts + tests; per-surface wiring is WS13. |
| D12 | Analyser unit basis | The rent unit is never inferred; an unrecognised unit blocks analysis with an explicit unsupported state | Codex PKG-1A, 2026-07-23 | unitKind/isKnownUnit + tests; validBand also requires strictly positive low/average/high. |
| D13 | Arabic font parity | Mono never renders Arabic script; Arabic-bearing mono label classes flip to IBM Plex Sans Arabic under RTL, only true figure classes (.fig/.tnum) stay mono | Codex PKG-1B, 2026-07-23 | globals.css RTL flip; e2e/arabic-font.spec.ts computed-style gate; live sweep 0 offenders on 8 public routes. |
| D14 | Semantic colour separation | Generic map-pin is Harbor; a separate map-pin-verified carries green; dv-quote below=Harbor-ramp, within=Harbor, above=attention; verification/comparative/outcome never share a colour; green stays exclusive to evidence-backed verification | Codex PKG-1B, 2026-07-23 | sat-platform.css tokens + advisor/map inline colours updated. |
| D15 | Breakpoint architecture | One authoritative source in src/theme/breakpoints.ts generates Tailwind screens (values preserve defaults + xs); CSS --bp-* are documented mirrors, not media-query drivers | Codex PKG-1B, 2026-07-23 | breakpoints.ts + tailwind.config.ts. |
| D16 | RTL serif fallback | No Georgia in the Arabic serif stack; IBM Plex Sans Arabic then Arabic-capable system fonts | Codex PKG-1B, 2026-07-23 | globals.css --serif under RTL. |
| D17 | Shared data-state pattern (WS13), INITIAL foundation | One accessible, RTL-safe, tone-driven DataState component (loading/empty/error/stale/sample/planned/permission); role=status/alert, aria-busy, tone drives icon AND colour never colour alone; server-compatible. Scope note: this is an INITIAL shared-state foundation with a single adoption (listings empty state), NOT a complete shared component/shell system. The broader responsive shell and expanded DataState adoption are deferred to the later page-redesign packages, against real screens. | Codex PKG-1B area 1 / PKG-1B.1, 2026-07-23 | src/components/DataState.tsx; adopted in listings empty state; tsc/test green. |
| D18 | Inline-hex to token migration by role | Classify every hex by role, replace only with the equal-valued token; map paint, SVG presentation attributes, brand logos, category/legend hues and non-verification greens stay literal; green stays exclusive to verification | Codex PKG-1B area 2, 2026-07-23 | 142 migrated (400 to 258), 0 value mismatches (paired check), guard: no var() in SVG/lib strings; docs/token-migration-{spec,results}.md. |
| D19 | Mobile search control overflow | The listings search input is a flex child with min-width:0 so it shrinks instead of forcing horizontal overflow past the viewport edge | Codex PKG-1B area 3, 2026-07-23 | sat-platform.css .search input; measured 77px overflow at 320px eliminated to 0. |
| D20 | Numeric ranges under RTL | A low-high figure range is one LTR-isolated numeric atom (bdi dir=ltr), reading low-to-high left-to-right in both locales; the advisor bar and its scale are forced LTR and the average moved to its own line to end the EN mid-label collision | Codex PKG-1B area 4, 2026-07-23 | rent-index, advisor, listings insights; live-measured RTL flip (high-on-left) before fix. |
| D21 | Neutral PWA entry and private cache | Single manifest, start_url "/" (middleware redirects to locale), theme_color Harbor #3A6EA5 (retires gold-family #1C1A15) aligned across manifest and meta; no service worker exists so nothing is precached; PRIVATE_PREFIXES routes carry Cache-Control no-store as defence in depth | Codex PKG-1B area 5, 2026-07-23 | public/manifest.webmanifest, layout.tsx, middleware.ts; docs/pwa-and-private-cache.md. |
| D22 | Accessibility FOUNDATIONS (not complete a11y) | Implemented foundations only: visible keyboard focus (:focus-visible), reduced-motion handling, and >=44px touch targets on coarse pointers. Scope note: this is NOT a claim of complete accessibility. Runtime keyboard-navigation, screen-reader and full WCAG evidence remain a SEPARATE verification package. | Codex PKG-1B area 6 / PKG-1B.1, 2026-07-23 | sat-platform.css focus + @media(pointer:coarse) + prefers-reduced-motion. |
| D23 | Deep token migration | Added --status-stale; unified all vs-index comparative colours to --dv-quote-* (fixing the non-verification confirmed-green on market/compare/saved, a D14 violation); centralized MapLibre paint into src/theme/palette.ts (BRAND/ASSET_COLORS/HEAT_RAMP/MAP) so map colours are one named token-mirrored source. Scattered inline hex 400 to 189. | Codex PKG-1B area 2 (deep), 2026-07-23 | palette.ts; MapExplorer/ListingsMap 0 inline hex; live: market "below" now Harbor-ramp, map legend swatches correct, no MapLibre errors. |
| D24 | Green reservation (settled) | Confirmed green is reserved for evidence-backed verification. Semantic map: verified=green; new/informational=Harbor; generic completion/success=Harbor Deep; below-band/price-reduction=--dv-quote-below; warning/aging/stale=amber; destructive/failed=red; WhatsApp=brand green (isolated third-party exception). Availability freshness keeps green only when backed by availability_confirmed_at and shown with a non-colour label/date. best-value is a comparative outcome (--dv-quote-below), not verification. New badges, report-received checks, generic success, viewing-completion and ordinary action success moved off green. AMENDED 2026-07-27: the reservation is BIDIRECTIONAL. It is equally a defect for an evidence-backed verification surface to render WITHOUT confirmed green, which is what the first pass missed on ListingCard (the passesGate() tick was an off-palette teal #0E9488). The teal is retired as a status, verification, party or role colour; it survives only as the retail entry in ASSET_COLORS, a centralized categorical hue permitted by D18/D23. | Codex PKG-1B.1, 2026-07-23; inverse defect corrected 2026-07-27 | Reclassified 20+ occurrences; src/lib/greenReservation.test.ts enforces green only in enumerated verification/availability/brand files, and a second test bans #0E9488 everywhere outside src/theme/palette.ts. |
| D25 | Advisor value answer: structured evidence boundary | The "value" (price-vs-band) answer builds ONE structured evidence result (evidence id, source, period, localized location, asset, supported vs requested segment, unit, low/avg/high, user figure, support status, limitation) and renders BOTH locales deterministically from it. A general-office band can never be relabelled a Grade A band; EN and AR provably share scope, numbers and source; Arabic location is localized; Western numerals kept. Replaces the previous two-separate-LLM-calls design that let AR and EN diverge. | Codex PKG-1B.1 Advisor P0, 2026-07-23 | src/lib/market/valueEvidence.ts + 11 deterministic parity tests; api/advisor value mode rewired. |

| D26 | Public data strategy (post-Paseetah) | SAT Markets sources its market data from the same public Saudi government products Paseetah uses, through official channels only, and competes on the two things they lack: published methodology and deed-level verification. Named workstreams PD1 to PD5 in docs/roadmap.md. Scraping srem.moj.gov.sa or the Najiz UIs is forbidden. No consumer price war. | Saleem, 2026-07-28 | docs/competitive-paseetah.md: their own attribution names MOJ, the Real Estate Registry and Ejar; no FAL licence, MOU or partnership found; Ejar publishes commercial price per sqm for six cities back to 2019 at sakani.sa/reports-and-data; Etimad 240141005052 shows their one real asset is procurement recognition, not data. |

## Pre-launch, deferred by owner (2026-07-23): prototype stage, do not action now

The product is a private, unshared prototype on mock data; the whole preview stays
noindex. These launch-level items are parked until closer to launch and must not
consume prototype-stage effort:

- Acquire and configure the production domain; remove domain references from draft
  legal documents; final legal wording and contact emails (registers ranks 9, 34 stay open).
- Production SEO and canonical-domain perfection (rank 7 env-awareness is enough for now).
- A full backward-compatible migration framework (prototype state is disposable).
- Final Rent Index statistical methodology, including how the low/high range is derived.
  The current low/high are development test ranges; UI now labels them "sample
  indicative range" and attributes only the REGA average + period as sourced.
- Physical database-column rename of `median` (rank 31 stays deferred; the public
  API boundary already exposes `average`).

## Open (owner: Saleem)

| # | Decision | Blocking | Context |
| --- | --- | --- | --- |
| O1 | Pricing visibility: labelled concept vs hidden until real | WS29, claim C5 | Codex requires every CTA truthful or labelled. |
| O2 | SAT Markets / SAT Real Estate relationship statement | WS30, /neutrality | Coordinate with counsel. |
| O3 | Verification label policy: exact rules for ownership, authorization, identity, permit, SAT-listed | Register ranks 3/24, WS17/18 | DB fields exist; needs approved display rules. Separate factual dimensions, no broad Verified badge. |
| O4 | Production default locale (en, ar, or selector) | WS31 | x-default target follows this. |
| O5 | Legal wording and counsel engagement | WS30 | Terms, Privacy, Contact placeholders. |
| O6 | Licensed market datasets for public display and AI retrieval | WS20/WS31 | REGA/Ejar is cleanly licensed; broker overlays are internal-only. |
| O7 | Requirements indexability and requester-data exposure | WS31 | Consent and redaction rules. |
| O8 | Write canonical-Laws amendments back into KB sat-markets/CLAUDE.md | docs/LAWS.md amendments section | Green token, Source Serif 4, environment truth. |
| O9 | Origin of repo CLAUDE.md gstack instruction (keep or remove) | D4 follow-up | Entered in a5a543a. |
| O10 | Exact licence terms and required attribution string for each public dataset (MOJ open data, Ejar/sakani commercial index, REGA indicators, GASTAT REPI, open.data.gov.sa) | PD1, PD2, PD3 | Each must land in `source_registry` with its licence and attribution before any figure renders. open.data.gov.sa is an attribution licence; the others were not read in full. |
| O11 | Whether the public CRE bulletin (PD3) is the surface that lifts the site-wide noindex, and on what gate | PD3, routePolicy | Today ALLOW_INDEX is off and everything is noindex. A public bulletin has no value un-indexed, so this needs an explicit ruling rather than a quiet env flip. |
