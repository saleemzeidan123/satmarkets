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
