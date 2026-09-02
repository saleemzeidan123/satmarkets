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

## Obstacle protocol

When work hits an obstacle, classify it first: product defect, test-environment limitation, external quota or outage, missing credential or owner action, owner decision, or a counsel/regulatory/vendor dependency. Fix product defects immediately when in scope. Reduce every external obstacle to the smallest acceptance item it actually blocks, and record that item in the blocked-evidence queue below with: exact evidence missing, cause, owner, retry trigger, and whether it blocks merging or only formal closure. Then keep moving: continue every independent task the dependency does not touch (research, spec, automated coverage, design review, threat modeling, test prep). Never weaken an acceptance gate to keep moving. Never fabricate live evidence, delivery, authenticated access, data rights, or production behavior. Never repeatedly retry a rate-limited service; record the failure time, pick a rational retry interval, and move to the next package. Ask the owner only when the action genuinely needs their identity, credentials, purchase, or legal authority, bundled into one request rather than one interruption per issue. Automated tests are a separate evidence class from live evidence, never a substitute for it. Do not say "nothing remains" until the full dependency graph is checked and every remaining task is genuinely blocked.

## Blocked-evidence queue

Parked items that do not block engineering progress elsewhere. Cleared automatically when the retry trigger fires; do not re-derive them from scratch each session.

| Evidence missing | Cause | Owner | Retry trigger | Blocks |
| --- | --- | --- | --- | --- |
| App-triggered Arabic password-recovery live proof | Supabase built-in mailer's fixed rate limit (no dashboard override without custom SMTP) | Saleem: wait, or decide on custom SMTP | Quota window clears, or SMTP configured | Formal closure of the PR #19 auth work only; PR #19 is already merged |
| Supabase Dashboard-triggered recovery live proof | Same rate limit | Same | Same | Same |
| One fresh production invitation journey on an owner-controlled, deliverable address | Rate limit, and no fresh address confirmed yet | Saleem: supply the address | Address supplied and quota available | Same |

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

## State as of 2026-09-02

- **Application baseline immediately before this documentation change (PR #20) merged.** `main` HEAD at that point: `4dc52b44a3c2afd444e1a7463d439e98fd1dcbb9` (PR #19, the corrected invite/password-reset auth flow: token_hash confirm-gate so a scanner or browser preloader can no longer spend a single-use link before the reader's own click, password-visibility toggles, busy-label fix, dual-branch email templates for app- and dashboard-triggered sends). Full gate was clean at merge (1891/1891 tests, ratchet held at 49). Production confirmed serving this exact commit.
- Between the 2026-08-17 position below and this one, PRs #5 through #19 shipped (PKG-DISCOVERY-1 remaining slices, the shared listing-card system, SEO/AI discovery work, a findings-register recovery, this file's own rewrite in PR #12, portable gates in PR #13, discovery defect fixes in PR #14-15, the signup-provisioning console fix in PR #17-18, and PR #19 above). `docs/session-resume.md` and `docs/status-ledger.md` describe an older ephemeral-sandbox operating model (`/tmp/sm2`, `tools/ship.py`) that this file's own PR #12 rewrite superseded; their position tables predate PR #5 and are historical, not current. Trust this file and `git log` over them for current state.
- PR #16 (PKG-LISTING-CREATION-1A, guided evidence capture and bilingual preview for listing creation) is open, rebased onto `4dc52b4`, full gate clean (1960/1960 tests). Held unmerged pending authenticated QA and independent review; see `docs/pkg-listing-creation-1a-deferred-contracts.md`.

## Open items (verify current state before acting; this list ages)

1. Supabase production audit for `supabase/migrations/20260809_listers_public_directory_fields.sql`: confirm against the REAL production schema the actual columns, grants, RLS, security-invoker state, that anonymous reads expose no PII (`public_email`/`public_phone` only if explicitly approved), published-only filtering, and published-inventory-only counts. Re-check whether this is still open before re-blocking on it; a later session may have reached the database.
2. Live 320px and 390px pixel-width verification (EN and AR) of the discovery UX: automated suites cover it (`FilterBar.mobileSheet.test.ts`, `reflow.test.ts`, `touchTarget.test.ts`), but re-check whether a real narrow-viewport visual pass has since been completed.
3. The three items in the blocked-evidence queue above (Arabic and dashboard-triggered recovery proof, one fresh invitation journey), parked on the Supabase built-in mailer's rate limit.

## Session start checklist

1. Read this file, `docs/LAWS.md`, and skim `docs/findings-register.md` headers.
2. `git log --oneline -5` to see where main actually is; do not trust this file's "state as of" section over git itself.
3. Confirm which environment you are in and what it can reach (network, Vercel, Supabase) before promising verification you cannot perform.
