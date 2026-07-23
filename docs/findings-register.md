# Codex audit findings register, status tracking

Source: Codex audit 2026-07-22, snapshot `6c6797e`. Statuses per Codex direction:
Confirmed open | Partially addressed | Blocked by evidence or decision |
Fixed and awaiting deployment verification | Closed with live evidence |
Not independently reverified. "Partially addressed" never counts as fixed.
Original rank and severity are preserved. Update this file in the same commit as
any fix; move to "Closed with live evidence" only after live EN and AR checks.

| Rank | Sev | Finding (short) | Status after PKG-0A | Evidence / note |
| --- | --- | --- | --- | --- |
| 1 | P0 | Arabic body/UI inherits Hanken via --sans | Confirmed open | Verified: inline `var(--sans)` overrides the `[dir=rtl]` base rule. Fix is WS08 (direction-aware token), next package. |
| 2 | P0 | Inline negative tracking survives RTL reset | Confirmed open | Verified: inline `letterSpacing` on H1s in requirements, area, hbu, locations, brokers. WS08. |
| 3 | P0 | Verification states merged into Owner-verified | Confirmed open | Verified: PDP metadata hardcodes owner-verified wording. DB has ownership_verified, authorization_verified, is_sat_listed; label split is Phase 2 with owner-approved policy. |
| 4 | P0 | Internal reference H1, N/A in metadata | Confirmed open | Verified: title falls back to reference_code (2 published AR titles missing); grade label renders N/A in description. WS12/WS17. |
| 5 | P0 | Q2 vs Q1 reporting-period mismatch | Closed with live evidence | DB evidence: rent_index_published carries only 2026-Q2 (7 rows, sufficient). Arabic corrected to الربع الثاني in both strings; advisor now renders via formatPeriod; parity test added. |
| 6 | P0 | وسطاء الأحياء mistranslation on Pricing | Closed with live evidence | Copy verified live in PKG-0A. Codex reopened the API layer; PKG-0A.1 added the toPublicSegment contract. Live on 958d7e2: /api/index/segments returns 7 rows whose keys include `average` and exclude `median`; advisor band payloads mapped the same way; EN analyser renders "Published band: ... average 1,420.5 · Q2 2026". Contract test guards regression. Internal column rename stays under rank 31. |
| 7 | P0 | Preview canonicalizes to unowned satmarkets.sa | Closed with live evidence | site.ts now env-aware (NEXT_PUBLIC_SITE_URL, then VERCEL_PROJECT_PRODUCTION_URL, then VERCEL_URL); no satmarkets.sa fallback. |
| 8 | P0 | /compare in sitemap while noindex | Closed with live evidence | Removed from sitemap ROUTES. |
| 9 | P0 | Counsel placeholders in legal pages | Blocked by evidence or decision | Needs Saudi counsel (WS30). Pages remain noindex. |
| 10 | P0 | Developments flow through district parameter | Partially addressed | WS04 done: docs/taxonomy.md + typed src/lib/locationKind.ts (a development is never labelled a district; unknown kinds coerce to neutral area; mixed lists use the Location umbrella), tested. The district URL parameter rename is Phase 2 (WS19), launch-adjacent. |
| 11 | P0 | Availability shown as static trust statement | Confirmed open | Freshness thresholds are WS13/WS18. |
| 12 | P0 | Map/Advisor/Requirements inherit root metadata | Confirmed open | WS12 metadata factory upgrade, Phase 1. |
| 13 | P1 | Area/lister missing hreflang alternates | Confirmed open | WS12. |
| 14 | P1 | x-default missing from page metadata | Partially addressed | Sitemap emits x-default; pageMeta does not yet. WS12. |
| 15 | P1 | OG/Twitter images absent | Confirmed open | WS12/WS15. |
| 16 | P1 | Arabic uses Latin m² | Confirmed open | WS11 unit formatter. |
| 17 | P1 | Arabic month plurals wrong | Confirmed open | WS11 with editorial review. |
| 18 | P1 | Map controls English in Arabic | Confirmed open | WS19. |
| 19 | P1 | Six ASCII commas in Arabic dictionary | Confirmed open | Verified count = 6. WS11 with punctuation lint. |
| 20 | P1 | Claims outrun evidence (No one else, live now, 100%) | Confirmed open | Claim ledger created (docs/claims-ledger.md); wording changes are WS11/WS15 after Saleem approves preview-state language. |
| 21 | P1 | Pricing looks purchasable | Blocked by evidence or decision | Saleem decision: concept label vs hide (deferred per Codex 9). |
| 22 | P1 | English leakage in Arabic new-listing flow | Confirmed open | WS11/Phase 3. |
| 23 | P1 | Search q ignored, returns full inventory | Confirmed open | Verified: q input never read server-side. WS16. |
| 24 | P1 | Lister type contradicts badge | Confirmed open | WS17/WS18 fixture matrix. |
| 25 | P1 | Title and district can disagree | Not independently reverified | WS17. |
| 26 | P1 | Touch targets below 44 px | Not independently reverified | WS10. |
| 27 | P1 | Arabic mobile text below reading size | Partially addressed | AR --fs scale raised 2026-07-20; full audit against 13/17 px floors is WS08. |
| 28 | P1 | Post-requirement sentence unclear | Confirmed open | WS11/WS23. |
| 29 | P1 | English comma splices | Confirmed open | WS11. |
| 30 | P1 | Arabic calques | Confirmed open | WS11 editorial pass. |
| 31 | P1 | Key names disagree with displayed terms | Partially addressed | Display now says averages; internal `median` column rename deferred (schema change, supervised). |
| 32 | P1 | Listing alternates omit x-default | Confirmed open | WS12. |
| 33 | P1 | /verify not covered by noindex middleware | Closed with live evidence | Verified all three /verify pages already 404 for non-SAT (su.isSat gate); /verify, /ops, /proto added to noindex prefixes. |
| 34 | P1 | Footer advertises SATMARKETS.SA | Closed with live evidence | Footer shows bilingual brand name only; law test bans the domain in dictionary copy. |
| 35 | P1 | /list looks like a working form | Not independently reverified | WS24 or honest coming-soon, Phase 3. |
| 36 | P2 | WebSite/SearchAction schema absent | Confirmed open | WebSite in WS12; SearchAction only after WS16. |
| 37 | P2 | Entity schema lacks verified fields | Not independently reverified | WS31. |
| 38 | P2 | No kind-aware entity pages | Confirmed open | WS31/Phase 5. |
| 39 | P2 | Quality rules not in automated gates | Partially addressed | laws.test.ts adds forbidden-term, period-parity, key-parity gates; metadata/font/tracking automation is WS36. |
| 40 | P2 | No repository CI workflow | Confirmed open | Gate is local ship.py; GitHub Actions is WS36. |
| 41 | P2 | 1 high + 1 moderate dependency finding | Confirmed open | Verified via npm audit. WS34, patch without breaking build. |
| 42 | P2 | No Content Security Policy | Confirmed open | WS34, report-only first. |
| 43 | P2 | No formal English house style | Confirmed open | British English adoption is WS11. |
| 44 | P2 | No promise ledger governance | Partially addressed | docs/claims-ledger.md created; enforcement (no claim ships without entry) becomes real in WS11/WS36. |
