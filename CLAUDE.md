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
3. `npm test` (as of 2026-09-02: 2028 tests, all must pass)
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

- **`main` HEAD: `524f18820b4511d576920c3bb9bbfbe7995b0dff`** (PR #16, PKG-LISTING-CREATION-1A, squash-merged). Full gate clean at merge (typecheck, 2028/2028 tests, ar-lint, prose scan, ESLint ratchet held at 49, production build); confirmed on GitHub's own `gate` Actions check-run, not only the legacy commit-status API, a distinction that mattered this round (see below).
- Between the 2026-08-17 position below and this one, PRs #5 through #20 shipped (PKG-DISCOVERY-1 remaining slices, the shared listing-card system, SEO/AI discovery work, a findings-register recovery, this file's own rewrite in PR #12, portable gates in PR #13, discovery defect fixes in PR #14-15, the signup-provisioning console fix in PR #17-18, the corrected invite/password-reset auth flow in PR #19, this file's own continuity-doc correction in PR #20, and PR #16 above). `docs/session-resume.md` and `docs/status-ledger.md` describe an older ephemeral-sandbox operating model (`/tmp/sm2`, `tools/ship.py`) that this file's own PR #12 rewrite superseded; their position tables predate PR #5 and are historical, not current. Trust this file and `git log` over them for current state.
- **PR #16 (PKG-LISTING-CREATION-1A) merged.** Guided evidence capture (requirement/fulfilment kept as two independent fields), a bilingual listing-content preview for the Studio, session-observed Arabic origin/review provenance, a real photo-inventory tri-state, per-locale Evidence Passports, and commercial-terms parity with the public page. Full detail, live-evidence account, and disclosed limitations are in the PR's own final description (GitHub PR #16, not this file) rather than duplicated here. Two real bugs were found and fixed during this package's own closing round, beyond its stated scope: a preview-route query reading `is_operator`/`is_verified` off a table that has never had those columns (fixed by matching the public page's `getLister()` pattern), and a CI-only lockfile inconsistency where `npm install` run on Windows/Node 24 produced a `package-lock.json` that failed `npm ci` on the Linux/Node 22 gate runner (fixed by regenerating the lockfile from scratch rather than patching it). Both are worth remembering as a class: a fix that only ever ran locally, or a lockfile only ever regenerated on this machine, is not verified until it has actually run on the gate's own platform.
- **PKG-LISTING-CREATION-1B (durable evidence and resumable media mission) is the active follow-on package**, authorized by Codex to start immediately after PR #16 merged. Scope: a durable (auditable, append-only) evidence-state table replacing the session-only "marked unavailable" state; per-shot media categorization (`shot_key`, scope, condition, cover, rights, visibility, moderation) on `listing_media`; a server-side content-fingerprint column with a real DB uniqueness constraint for cross-session upload duplicate protection; activating the existing-but-uncalled `mediaStandard.ts` media-integrity/derivation machinery; and a resumable mobile-first Studio media workflow. Explicitly out of scope for 1B: the AI quality assistant, reviewer publication workflow, outbound notifications, REGA/Nafath integration. `docs/pkg-listing-creation-1a-deferred-contracts.md` items 1-3 and 7 are 1B's starting design brief, already reviewed once during PR #16's own process.

## Open items (verify current state before acting; this list ages)

1. Supabase production audit for `supabase/migrations/20260809_listers_public_directory_fields.sql`: confirm against the REAL production schema the actual columns, grants, RLS, security-invoker state, that anonymous reads expose no PII (`public_email`/`public_phone` only if explicitly approved), published-only filtering, and published-inventory-only counts. Re-check whether this is still open before re-blocking on it; a later session may have reached the database.
2. Live 320/390/430/768/1280px pixel-width verification, EN and AR: done live for the discovery UX's shared components and for PKG-LISTING-CREATION-1A's public-page-shared components (PR #16's own description has the exact live evidence and method). Not yet done live, specifically: the authenticated Studio/preview surfaces' own unique controls (the DraftPreview locale toggle, its review buttons, the dashboard nav and floating Advisor button) at narrow widths specifically, because the authenticated browser tool available could not resize its window this round (confirmed: `resize_window` reports success but `window.innerWidth` never actually changes). A second, resizable authenticated session was requested but not obtained before PR #16 closed. Re-check whether this has since been completed before re-blocking on it.
3. The three items in the blocked-evidence queue above (Arabic and dashboard-triggered recovery proof, one fresh invitation journey), parked on the Supabase built-in mailer's rate limit.
4. PKG-LISTING-CREATION-1B's own migration (durable evidence state, per-shot media columns, content-fingerprint uniqueness constraint) is unapplied to production until that package's own migration slice lands and is verified against the real schema; do not assume any of its columns exist yet.

## Session start checklist

1. Read this file, `docs/LAWS.md`, and skim `docs/findings-register.md` headers.
2. `git log --oneline -5` to see where main actually is; do not trust this file's "state as of" section over git itself.
3. Confirm which environment you are in and what it can reach (network, Vercel, Supabase) before promising verification you cannot perform.
