# SAT Markets: agent briefing

Read this fully before doing any work. It is the standing context for every AI session in this repository.

## Authority and canon

- The canonical project Laws live in the SAT Knowledge Base at `sat-markets/CLAUDE.md`, owned by Saleem. That file is the single source of truth. Nothing in this repository overrides it. See `docs/LAWS.md`.
- Work in this repo is governed by the Codex process: an external audit and shipping discipline. Codex issues findings, ranks them, and requires live evidence before anything is called closed.
- The findings register is `docs/findings-register.md`. It is canonical status tracking. Statuses move to "Closed with live evidence" only after live EN and AR checks on the deployed site. "Partially addressed" never counts as fixed. Update the register in the same commit as any fix.

## Honesty and verification protocol

1. Never claim something is done without verification evidence. A claim of "done" requires the command output, test totals, deployed URL check, or diff that proves it.
2. Never fabricate or estimate evidence. If a check cannot be run in the current environment, say so plainly and name it as a limitation.
3. Verify on the live page, not just in code, for anything user-visible. EN and AR both.
4. Large files (for example the 380KB findings register) move by git object transfer only: push, bundle, or history restore verified with `git hash-object`. Never retype or relay large file content through model context or the Contents API in fragments.
5. No retry-commit litter. If an approach fails, clean up before trying another.
6. Disclose every known gap in PR bodies honestly, including partial recoveries and environment limitations.

## Style and product rules

- No em dashes anywhere in repo content. Use commas, periods, or parentheses.
- Full EN/AR parity. Every user-facing string exists in both dictionaries (`src/i18n/dictionaries`). RTL correctness is verified, not assumed.
- Green (`--green`) is reserved for evidence-backed verification states only (see `src/lib/greenReservation.test.ts` and the footer licence pill). Never use it decoratively.
- Verification wording is explicit and literal: "Not verified" / "غير موثّق" etc. States are shown as recorded, never inferred.
- Prose lives in dictionaries, not hardcoded in components (enforced by the prose scan).

## The shipping gate (run all, in order, before any PR)

1. `npm ci` (clean install on the exact branch)
2. `npm run typecheck`
3. `npm test` (as of 2026-08-17: 1851 tests, all must pass)
4. `npm run ar-lint`
5. Prose scan (hardcoded-string check)
6. `npm run lint-gate` (ESLint ratchet: 49 pinned errors as of 2026-08-17, no new rules; pinned counts live in `scripts/eslint-gate.mjs`)
7. `npm run build` (full production build; it fetches Google Fonts at build time, so it needs normal network egress)

Vercel builds every PR automatically; the preview deployment doubles as a production-build check, but a local build is still required when the environment allows it.

## Infrastructure

- GitHub: `saleemzeidan123/satmarkets`, default branch `main`. One PR per package, no slicing a package into multiple PRs unless instructed.
- Vercel: team `sat-markets` (`team_f8rT28yvu25U4hyjrExwcJ7i`), project `satmarkets` (`prj_ZvgOBlyqbT0lsYRlUun9DEfDhSMO`). Production URL: `satmarkets-sat-markets.vercel.app`. Note: the team subscription lapsing pauses ALL deployments site-wide (shows "temporarily paused"). Reactivating the plan fixes it; the deployments themselves are unaffected.
- Supabase: production database for this app is NOT the "SAT Website" project (`gwyeserfgxcxhwfdjfav`, that is satestate.com's intake DB). Confirm you are pointed at the real satmarkets project before any migration or audit work.
- The site intentionally shows a preview-environment banner and demo-flagged sample listings. That is a tested feature (`publicFacts.test.ts`), not a bug.

## State as of 2026-08-17

- `main` HEAD: `d9e817d454e26f7efba3893462674f6aa2d39bdc` (PR #11, the PKG-DISCOVERY-1 UX closure package: Location sheet portal fix, safe-zone tabbar token system, route-truth audit, FilterBar "All filters" two-level sheet, ListerCard verification/count/RTL work, `listers_public` directory-fields migration plus schema guard test).
- Before it: PR #10 (`ba1aa97`) restored `docs/findings-register.md` to the intact historical blob `0c46ac74` (227 lines), verified byte-identical. Known gap, disclosed in that PR: roughly 355 bytes of later row edits from a lost repair blob (`9404a765`) were not recoverable.
- Production deployment `dpl_GwE2iNhoPEWNLXiKsiiRrMYpxSyb` is live at exactly `d9e817d`. Full gate was clean at merge (1851/1851 tests, ratchet held at 49).

## Open items (verify current state before acting; this list ages)

1. Supabase production audit for `supabase/migrations/20260809_listers_public_directory_fields.sql`: confirm against the REAL production schema the actual columns, grants, RLS, security-invoker state, that anonymous reads expose no PII (`public_email`/`public_phone` only if explicitly approved), published-only filtering, and published-inventory-only counts. This was blocked because no connected tool could reach the real database. Do not apply or assume the migration is applied without this audit.
2. Live 320px and 390px pixel-width verification (EN and AR) of the discovery UX: automated suites cover it (`FilterBar.mobileSheet.test.ts`, `reflow.test.ts`, `touchTarget.test.ts`), but a real narrow-viewport visual pass was never completed.
3. The SAT Knowledge Base root `CLAUDE.md` has a pending "Agent honesty and verification protocol" insertion (drafted, never applied, because that file lives outside this repo).

## Session start checklist

1. Read this file, `docs/LAWS.md`, and skim `docs/findings-register.md` headers.
2. `git log --oneline -5` to see where main actually is; do not trust this file's "state as of" section over git itself.
3. Confirm which environment you are in and what it can reach (network, Vercel, Supabase) before promising verification you cannot perform.
