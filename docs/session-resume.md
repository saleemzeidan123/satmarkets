# Session resume

**Correction, 2026-09-02.** Section 1's position table and section 10's "what is owed
next" predate PR #5 and describe an ephemeral-sandbox operating model (`/tmp/sm2`,
`tools/ship.py`, Google Fonts blocked, every Supabase tool permission-denied) that the
root `CLAUDE.md` rewrite in PR #12 superseded; this project is now worked from a
persistent local clone with normal git/GitHub/Vercel/Supabase access. Read the root
`CLAUDE.md` for current position and its own session-start checklist instead of section 1
below. Sections 7 to 9 (standing authority, owner rulings, evidence discipline) remain
live and binding.

## What this file is

The conversation Claude works in is not durable. It compacts, it slows down, and it ends.
The repository is durable. This file is the bridge: everything a fresh session needs to
continue SAT Markets work identically, written down so that starting a new conversation
costs nothing but the paste of one opening prompt.

Read this file first, then `docs/status-ledger.md`, then `docs/LAWS.md`.

Nothing of value lives only in a conversation. Every package, every finding, every
decision and every piece of evidence is committed. A new session loses the ephemeral
build container and the conversational memory of the standing instructions, and this file
restores the second while section 3 restores the first.

---

## 0. Standing mandate

Read this as the owner's standing instruction, because it is. It does not expire when a
conversation does, and it is not re-granted per session.

You are the builder on SAT Markets. Codex is the independent product, design and technical
adviser, and its messages reach you through Saleem. You are authorized to proceed through
all currently unblocked engineering work without pausing for routine approvals. Work in
substantial, reviewable commits. Do not ask procedural questions that can be answered from
the repository, the evidence or this file. If one item is blocked by a genuine contract,
regulatory or owner decision, record the blocker and continue with the next safe unblocked
dependency rather than stopping. Provide one consolidated handback after each major package
with scope, commits, tests, live English and Arabic evidence, responsive evidence,
remaining blockers and the next package. Continue automatically between packages. Do not
wait for adviser approval unless the change is destructive, legally gated, or requires the
owner to purchase, publish or authorize an external service.

Four things this mandate does not cover, and they are the only four. Do not buy services,
contact vendors or sign agreements. Do not enable anything held by an owner ruling or an
open O-numbered outcome, in particular O17 collection and O12 outbound notification. Do not
publish, index or make a public claim that record level evidence does not support. Do not
ask for a credential to be typed into the conversation.

The one thing that genuinely cannot be inherited is the push credential in section 4. It is
a secret held inside an ephemeral container, so no session can hand it to another and no
document can carry it. Everything else in this file transfers whole.

---

## 1. Position

Read `docs/status-ledger.md` section 1 for the authoritative current values. At the time
this file was written:

| Item | Value |
| --- | --- |
| Branch and remote | `main`, `github.com/saleemzeidan123/satmarkets` |
| GitHub HEAD | `53c33d7`, PR #4 |
| Production deployment | `dpl_FRLBVwFctc1cUiPnz7gSZ3jzG9iV`, READY, `meta.githubCommitSha` `53c33d7c24ab5bd8a8ab82b96690848af2258cf1` (matches HEAD, confirmed by polling `get_deployment` past an initial `BUILDING` state) |
| Deployment URL | `satmarkets-gx5nu0o4b-sat-markets.vercel.app` |
| Stable alias for polling | `satmarkets-git-main-sat-markets.vercel.app` |
| Test suite | 1774 tests, 0 failing |
| Findings register | Unchanged by the last package. See `docs/status-ledger.md` section 5 for the current count; do not restate a figure here that the ledger did not just confirm |
| Launch stage | E0, engineering foundation |
| Release state | Site-wide `noindex, nofollow`, preview protected |
| Last package | PKG-DISCOVERY-1, in flight (D37's named next package). Slice A (truth map) complete; slice B's first installment shipped, PR #4. See `docs/status-ledger.md` section 1a-1 and section 10 below |

The status ledger is corrected in the same commit that finds it wrong. Where this file
and the ledger disagree, the ledger is right and this file is stale.

---

## 2. Identifiers

| Thing | Value |
| --- | --- |
| Supabase project | `ltqgwpivmumfwqdxwwgo` |
| Vercel team | `team_f8rT28yvu25U4hyjrExwcJ7i` |
| Vercel project | `prj_ZvgOBlyqbT0lsYRlUun9DEfDhSMO` |
| Domain | satmarkets.sa, parked by owner ruling 1 |
| FAL licence | 1200025510, and never any other number |

---

## 3. Rebuilding the build environment

The container is ephemeral and has been reclaimed mid-package before. The working clone
lives at `/tmp/sm2` and can vanish. Rebuilding it takes about 30 seconds:

```bash
cd /tmp && git clone https://github.com/saleemzeidan123/satmarkets sm2
cd /tmp/sm2 && npm install --no-audit --no-fund
```

The shell working directory resets to the home directory between calls, so every command
must begin with `cd /tmp/sm2`.

If a clone already exists but is behind, `git fetch origin main` then confirm the local
diff is already upstream before resetting. Never discard uncommitted work without first
proving the same content is on `origin/main`.

---

## 4. The gate set and the ship idiom

Every package closes by running all of this and recording the result:

```bash
cd /tmp/sm2 && npx tsc --noEmit
cd /tmp/sm2 && npm test
cd /tmp/sm2 && npm run ar-lint
cd /tmp/sm2 && node scripts/prose-scan.mjs
cd /tmp/sm2 && node scripts/reflow-probe.mjs --chromium /opt/pw-browsers/chromium
cd /tmp/sm2 && node scripts/radio-probe.mjs --chromium /opt/pw-browsers/chromium
```

`prose-scan.mjs` reports three counters. GATE, which covers public page source under
`src/app/[locale]/`, must be 0. BASE (shared components) and NOTE (library modules) are
deferred by standing agreement. Grep for `^(GATE|BASE|NOTE)`; a plain `tail` cuts the
GATE line off.

Shipping. There are two paths, and the second one needs no secret at all.

**Path 1, `tools/ship.py`.** The normal path when a token is present:

```bash
cd /tmp/sm2 && python3 tools/ship.py --auto -m "message"
```

It prints `Shipped <sha> to main.` and the commit URL. Its em dash guard rejects any
commit message containing one.

It looks for a fine-grained PAT in three places, in order: the `SM_GH_TOKEN` environment
variable, the file `~/.sm_ship_token`, and **an attached file named `sm_ship_token.txt`**
in the session upload or working directory. The third route exists so the owner can give a
container push rights by attaching a file rather than typing a secret into a chat, where it
would sit in a transcript that outlives it. When one is found there, `ship.py` copies the
value to `~/.sm_ship_token` at mode 600, overwrites the attached file and deletes it, and
prints only the file name. The value is never printed, logged or echoed.

**The container is ephemeral, so that is gone in every new session** and one of the three
routes has to happen again. When none of them holds anything, `ship.py` prints the three
routes and exits without pushing. Do not stall on it, and do not ask for a secret in the
conversation. Either the owner attaches the file, or you use path 2 below.

**Path 2, the bundle relay.** Use this when the container has no token. It moves commits,
not secrets, and it needs nothing from the owner but one file upload.

```bash
cd /tmp/sm2 && git fetch origin main -q
cd /tmp/sm2 && git bundle create /tmp/satmarkets-outgoing.bundle origin/main..HEAD --branches
```

Deliver that bundle with `SendUserFile` and ask the owner to attach it to a session that
does have a token. There, with the clone at `/tmp/sm2`:

```bash
cd /tmp/sm2 && git bundle verify /path/to/satmarkets-outgoing.bundle
cd /tmp/sm2 && git fetch /path/to/satmarkets-outgoing.bundle main:incoming
cd /tmp/sm2 && git merge --ff-only incoming
cd /tmp/sm2 && python3 tools/ship.py --push-only
```

`--push-only` pushes commits that already exist and makes none. It refuses a dirty tree,
refuses when HEAD is not ahead of `origin/main`, and surfaces a non fast forward rather
than forcing it. The same bundle also refreshes the recovery copy described in
`RECOVERY.md`, so this path pays for itself twice.

**Corrected 2026-08-08, PKG-TRUTH-REQ-1.** The paragraph below, that the `GitHub_Pat`
connector is read-only, was true when written and is not true now. The connector
authenticates through a GitHub App, "Claude Github MCP Connector", owned by `anthropics`.
It was authorized on the owner's account but **installed on no repository**, which is a
different failure from a scope problem on a personal access token: `push_files` failed
with `403 Resource not accessible by integration`, GitHub's own phrasing for an
under-installed App, not for an under-scoped PAT. The fix was installing the App, scoped to
`saleemzeidan123/satmarkets` alone with Contents read and write, from
`https://github.com/settings/installations`, an owner action taken live in that session.
Confirmed working the same session: `create_branch`, four `push_files` calls each verified
byte-identical to the source file by comparing git blob SHAs, and `create_pull_request`.
The install is account-level and does not expire with the container, so this fix should
already be standing for whatever session reads this next. If `push_files` fails again with
this exact message, re-check the install at that URL before assuming the connector is
read-only again; do not conclude that from one failure without checking.

**What is still true.** This session's own git-proxy path (`tools/ship.py`, plain `git
push`) still refuses this repository outright with "not in this session's authorized
repository set", which is a session network-authorization boundary, not a credential
problem and not the same failure as the connector's. That refusal is per-session, so it
may or may not hold for the session reading this. Try `tools/ship.py` first; fall back to
the connector, now a genuine push path, only if the proxy refuses.

**Two repository-side controls exist now that did not before.** Auto-merge is enabled, and
an active ruleset "main requires green build" requires the Vercel status check to pass
before anything merges into `main`, and blocks force pushes and deletion of `main`. A
direct push to `main` that has not passed that check on a branch first will be refused by
GitHub itself, not only by the sandbox. Ship on a branch, open a PR, and either let
auto-merge land it once Vercel goes green or merge it once that check passes.

**What does not work, tested rather than assumed, before the fix above.** The `GitHub_Pat`
MCP connector read this repository fine (`get_me`, `list_commits` and `get_file_contents`
all returned), but every write was refused as described. It was useful for checking what
was actually on `main` from a container that had no clone, and it was not a push path. An
earlier revision of this file claimed it was a push path, and that claim was wrong at the
time. It is a push path again now, for the reason recorded above.

**What to do when path 1 finds nothing.** Do not stall, and do not ask for a secret in the
conversation. Commit locally, keep working, and either wait for the owner to attach
`sm_ship_token.txt` or use path 2. The safe form of that credential is a fine grained PAT
scoped to Contents read and write on this repository alone, with a short expiry, revoked
when the work is done. Never ask for it to be typed into the chat: what is pasted into a
chat stays in a transcript, and the attached-file route exists precisely to avoid that.

Then confirm the deployment. Load the Vercel tools with the ToolSearch query
`select:mcp__Vercel__get_deployment,mcp__Vercel__web_fetch_vercel_url`, wait about 100
seconds, and poll `get_deployment` on `satmarkets-git-main-sat-markets.vercel.app` with
the team id. **Check `meta.githubCommitSha`, not `readyState` alone**, because a READY
build may be the previous commit's. Measured build times sit between 59 and 74 seconds.

---

## 5. What this environment cannot do

These are measured, not assumed. Rediscovering them costs an hour each time.

* The sandbox egress proxy blocks the deployment and the database over HTTP.
  `curl` to Vercel or Supabase REST returns `CONNECT tunnel failed, response 403`.
  The only working live-evidence channel is `mcp__Vercel__web_fetch_vercel_url`,
  which is GET only and unauthenticated.
* `git fetch`, `git clone` and pushing through `tools/ship.py` all work normally.
* Every Supabase write and read tool is permission denied: `execute_sql`,
  `apply_migration`, `list_tables`, `get_advisors`, `generate_typescript_types`.
  Migrations are authored and committed, never applied from here.
* `npm run build` fails locally with four `next/font` errors because Google Fonts is
  blocked. The Vercel READY build is the production build evidence.
* ESLint is not configured. Do not run `npx next lint`.
* The deploy token has no `workflow` scope, so `.github/workflows/` files cannot be
  pushed. The owner installs those manually. Do not request a workflow scoped token.
* The `GitHub_Pat` MCP server needs interactive authorization. **Corrected 2026-08-08,
  PKG-TRUTH-REQ-1, section 4 above has the full account:** once authorized and once the
  GitHub App behind it is installed on this repository, it can write here, through a
  branch and a pull request, not a direct push to `main`. An earlier revision of this
  bullet said it could only read and never write; that was true only because the App was
  authorized but not installed, and it is not true now that the App is installed. The
  session-specific git-proxy path (`tools/ship.py`, plain `git push`) is a separate thing
  and may still refuse this repository outright; see section 4 for which to try first.
  Never ask the user for tokens, authorization codes or callback URLs.
* Inspecting git credential storage is blocked by the safety classifier, as is
  `git checkout -- <path>`. Use `git show HEAD:<path> > <path>` to restore a file.

---

## 6. Environment quirks that cost time

* `npm test` is `tsx --test` over an **explicit space separated file list** in
  `package.json`. A new test file that is not added to that list silently never runs.
* Never round trip `src/i18n/dictionaries/*.json` through `json.load` and `json.dump`.
  Edit textually, then verify with `json.load`. A round trip has destroyed work before.
* The Edit tool requires a prior Read of the same file in the same conversation. The
  reliable bulk idiom is a `python3` heredoc with exact occurrence count assertions,
  `assert s.count(old) == 1`.
* A Bash command with no output prints only the cwd reset line. Append `; echo "RC=$?"`.
  `grep -c` exits 1 when the count is 0, so wrap it in `( ... || true)`, and it counts
  matching lines rather than occurrences.
* `cmd 2>&1 | tail -5; echo "RC=$?"` reports `tail`'s exit code, not the command's.
* `grep -P "[\x{0600}-\x{06FF}]"` fails here. Use python with the literal class
  `[؀-ۿ]`. In tests the working assertion is `assert.match(x, /[؀-ۿ]/)`.
* Playwright resolves `import { chromium } from "playwright"` only for scripts under
  `/tmp/sm2`. `hasTouch: true` is what makes `@media (pointer: coarse)` match.
* `{/* ... */}` is valid only in JSX children position. In an expression position use a
  bare `/* ... */` with no braces.
* `useId()` values contain colons, which are legal in an HTML id but invalid in a CSS
  selector.
* `.sronly` is the platform screen reader class in `src/styles/globals.css`. The login
  page separately uses Tailwind's `sr-only`. They are different classes.
* When a `web_fetch_vercel_url` response exceeds the token limit it still saves the full
  body to the session `tool-results` directory, sliceable with python. The saved body is
  JSON escaped, so `s.replace('\\"','"').replace('\\n','\n')` makes it greppable.
* The production bundle is readable and is first class live evidence. Compiled client
  source for a route lives at
  `/_next/static/chunks/app/%5Blocale%5D/<route>/page-<hash>.js`.

---

## 7. Standing authority

Three layers, in order of precedence.

**The Laws.** Canonical in the SAT Knowledge Base at `sat-markets/CLAUDE.md`, owned by
Saleem. Restated in enforceable form in `docs/LAWS.md` and machine checked by
`src/lib/laws.test.ts`. Read that file; it is short and it governs everything.

**The owner rulings.** Seven, all still binding:

1. Domain acquisition and launch indexing are not priorities now. Do not spend more time
   on domain configuration except to prevent regressions. Keep the preview protected
   according to the current release policy.
2. The Arabic term "ملّاك" is approved because it distinguishes property owners from
   "ملاك". "مؤشر الإيجارات المنشور" is acceptable where contextually accurate, but every
   Rent Index reference must retain the required attribution to the REGA Rental Index
   (Ejar).
3. Audit and correct the remaining over-broad claims across the platform. Prioritize
   `/invest`, then public discovery, listing, lister, requirement, research and advisory
   surfaces. Claims must be determined from actual record level evidence, never inferred
   from route type or generic wording.
4. HBU comparables must be anonymized unless each named comparable has a lawful,
   documented public source and permission for this use. HBU remains illustrative and
   noindex until its evidence and regulatory gates are cleared.
5. Fix the `/listings?city=riyadh` raw slug display defect in both languages. **Closed in
   `b3e2dfa`.**
6. The Arabic font workflow file remains an owner side administrative task. Do not allow
   that to stop the remaining engineering work.
7. Do not buy services, contact vendors, sign agreements or represent that data rights
   exist. Create the required technical interfaces, procurement requirements and decision
   records, but keep gated features disabled until the owner obtains the necessary
   permissions.

**The Codex commission.** Codex is the independent product, design and technical adviser;
Claude is the builder. Its messages arrive through Saleem. The standing directive is to
work in substantial reviewable commits, not to ask procedural questions answerable from
the repository or the evidence, to record a blocker and move to the next unblocked
dependency rather than stall, and to provide one consolidated handback after each package
with scope, commits, tests, live English and Arabic evidence, responsive evidence,
remaining blockers and the next package. Do not wait for Codex approval between packages
unless the change is destructive, legally gated, or requires the owner to purchase,
publish or authorize an external service.

Two Codex rulings currently hold features closed:

* **O17, collection remains disabled.** `COLLECTION_AUTHORISED = false`. The event
  catalogue, scorecard and collection architecture are authorized; production behavioral
  collection is not. Before O17 can be enabled, a data collection readiness record must
  be approved. One is written at `docs/data-collection-readiness.md`. Do not install or
  send data to an analytics vendor. Product telemetry stays off.
* **O12, outbound notifications remain held.** No automatic email, SMS, WhatsApp, push or
  other external match notification. The authenticated in product matches inbox may
  remain if it respects organization permissions. The preference and consent model may be
  prepared; external delivery requires explicit per channel opt in, Saudi privacy and
  communications review, and zero cold outreach generated from inferred interest.

**The competitive objective.** Do not imitate Paseetah, Paseet.ai or Placer.ai visually
or functionally. SAT Markets should become the verified Saudi commercial real estate
evidence and transaction operating system: requirement, then verified inventory, then
evidence backed comparison, then viewing, then decision pack, then transaction
preparation, then first party market intelligence.

---

## 8. Quality and operating rules

Preserve every law in the canonical Laws file. Use FAL 1200025510 only. No invented
figures. Western numerals in English and Arabic. True RTL and bilingual parity. Harbor
`#3A6EA5`, never SATEstate gold. Developments are not districts. Average and median
remain distinct. Verified green appears only for evidence backed verification. Rent Index
attribution remains REGA Rental Index (Ejar). No em dashes. Preserve current privacy,
route and release state protections. Validate English and Arabic on mobile, tablet and
desktop, at 320, 360, 390 and 430 pixels plus tablet and desktop widths. Test keyboard
use, screen reader semantics, reduced motion, touch targets, empty states, loading, retry,
failure and weak network behaviour. Run the full gate set and confirm the deployed preview
rather than relying only on local results.

---

## 9. Evidence discipline

This is the rule that has mattered most, and it is easy to lose.

Evidence is classified, never blurred, into: automated, manually exercised, browser
emulated, tested on a physical device, tested with an actual screen reader, independently
audited, and awaiting independent verification. Three of those classes are empty for this
project and saying so is part of the deliverable. No WCAG 2.2 AA conformance claim may be
made from automation alone.

Related standing constraints, all still in force:

* When a real source lacks confirmed public display rights, do not send its figure to the
  browser, API consumer, metadata, structured data or AI response. Do not rely on CSS, a
  missing passport, `noindex`, a preview banner or client side hiding. Statistical
  sufficiency never bypasses publication permission.
* "SAT Markets own record" may be used only for genuine first party information lawfully
  collected by SAT. If the source cannot legally be disclosed or the figure cannot legally
  be displayed, withhold the public figure.
* Do not create synthetic evidence merely to populate the passport. Do not infer
  authenticity from the absence of a demo marker. Do not attach a passport to an Advisor
  answer unless the displayed figure is completely traceable through an authorized typed
  tool result.
* Never treat previous AI output as evidence for a figure.
* Do not use real user, requirement, listing or document data for provider testing. Any
  evaluation harness uses a deliberately synthetic gold set. No real private data goes to
  any provider, and external processing does not activate until the owner records the
  provider agreement, processing terms, cross border basis and disclosure position.
* `sourceRights.denialReason` and `assessO10().reasons` quote internal licence reasoning
  and must never be rendered to the public.
* Until O10 is resolved, the production decision fails closed.
* srem.moj.gov.sa and the Najiz interfaces are interactive portals, not data products,
  and are never scraped.
* Do not blindly implement recommendations that are already shipped, contradicted by
  stronger evidence, or blocked by data rights.
* If WebFetch or WebSearch reports that a domain cannot be fetched, do not retrieve it by
  any other means, including archives and caches.

Targets are set prospectively. After a research round: calculate the baseline, document
sample limitations, set the next round target before the next test, preserve the original
baseline and target history, and never revise a target retrospectively. Zero tolerance
guardrails need no baseline: unsupported public figures, unauthorized disclosure,
unauthorized notifications and deceptive media transformation.

---

## 10. What is owed next

**PKG-TRUTH-REQ-1 is closed and stays closed.** Codex reviewed it independently and
accepted it as closed on 2026-08-08. Do not reopen it, do not re-propose it, do not
re-run its gate.

**PKG-DISCOVERY-1 is open and is the current package.** Commissioned 2026-08-08 by
Saleem and Codex, the named next package after D37's sequence per `docs/status-ledger.md`
section 1a-1. Slice A (truth map) is complete. Slice B (Home) has a first installment
shipped, PR #4, `53c33d7`: the decorative heart on the four featured-listing cards
replaced with a working `SaveHeart` control. Owed next, in dependency order the
commissioning message set: the remainder of slice B (the 8-breakpoint EN/AR sweep,
keyboard/screen-reader/reduced-motion verification, any further visual-distinctiveness
work), then slice C (Listings Search), slice D (Listing Detail), slice E (Brokers/Listers,
including the missing public directory page the truth map found), and slice F
(system-wide design-system/accessibility/RTL/motion quality). Do not restart slice A;
read `docs/status-ledger.md` section 1a-1 for its findings instead of re-mapping.

**Sequencing clarification, binding for PKG-DISCOVERY-1 and anything after it.** Two
verification tasks Codex deferred when PKG-TRUTH-REQ-1 closed (`npm run smoke` and
`npx playwright test` against the live deployment; one disposable synthetic-data
`POST /api/requirements`) are **not prerequisites for this or any later package.** Attempt
them only opportunistically, on a session that genuinely has production egress to
`vercel.app`. This session confirmed again, once, that it is not that session (`curl -v`
still gets `403` on the CONNECT tunnel) and did not re-test it a second time, per the
explicit instruction not to repeatedly probe a known denial. Do not fabricate their
result, and do not pause PKG-DISCOVERY-1 or any later package waiting for them. If a
future session does have real egress and completes them, record the result as a
verification addendum to `docs/handback-pkg-truth-req-1.md`, appended, not rewritten over
section 6 or 7; the two tasks are:

1. Run `npm run smoke` and `npx playwright test` against the live deployment.
2. Submit one requirement through `/api/requirements` with synthetic contact information
   only, uniquely marked so it can be found again, and confirm from the actual response
   body: no `notified` key, no `match` key, and `candidate_count` carries the documented
   narrow meaning (a filtered listing count, not a verified match). Confirm the bilingual
   success experience stays truthful. Then delete the exact test record and any
   notification-ledger rows it created.

**The guardrail this sits inside, restated because it binds task 2 above regardless of
when it runs.** O18 (section 7, and `docs/decision-register.md`) is ruled and sequenced,
not built: no secure token-based self-service withdrawal exists yet. Until it does, no
ELITE-1 participant and no external user may submit real contact information through the
requirement journey; the disposable verification requirement above is exactly the kind of
submission this restricts, which is why it uses synthetic contact data and is deleted
afterward rather than left standing. O18's implementation is scheduled before external
requirement collection or public launch. This guardrail equally binds any requirement-
journey testing PKG-DISCOVERY-1 itself needs (for example, exercising the post-requirement
flow while redesigning Home's entry point to it): synthetic contact data only, always.

**One record to leave alone.** Findings register row 113 already states, correctly and in
full, that the English phrases "Heavy power" and "High footfall" appear inside Arabic
legacy sample requirement data, and why. That belongs to finding 113 and to whichever
future Arabic data-cleanup package closes its open data half. Do not touch it while
working PKG-DISCOVERY-1.

Codex's PKG-A11Y-1 instruction that the next inputs are not engineering, and the old
"do not open a new package without asking" phrasing this section once carried, are both
superseded: D37 was approved by Codex and Saleem on 2026-08-02, PKG-DISCOVERY-1 is the
asking that already happened, and it is open now. Continue it in dependency order without
a further approval pause, per the commissioning message's own instruction.

Owner actions, all recorded in `docs/handback-pkg-a11y-1.md`:

1. Apply `supabase/migrations/20260801_requirement_city_is_never_assumed.sql`, which
   closes finding 117. It is authored, committed and deliberately not applied, because
   every Supabase write tool is permission denied here. **Finding 193 is not a migration.
   Do not list it as one.**
2. Install `.github/workflows/arabic-font.yml`, already delivered to the owner. The deploy
   token cannot push it.
3. Resolve the two RLS advisories on `public.spatial_ref_sys` and `public.map_anchors`.
   The remediation SQL must not be auto applied: enabling RLS without policies blocks all
   access, and `spatial_ref_sys` may be PostGIS extension owned.
4. Authorize design partner recruitment. The sheet is at
   `docs/research/elite-1-recruitment-sheet.md`. Decision date 1 October 2026.
5. Commission independent accessibility verification of the 22 findings that this
   environment cannot verify: 16 needing a real screen reader, 4 needing a physical
   device, 2 needing human judgement.

Carried blockers, unchanged: interactive browser Advisor verification; the ADV-1 append
only field level corrections write path; PD4 deed checks blocked on O13 and O10; O10
through O17; finding 74; contract 6 and provider activation; the twelve Part E clauses for
any mobility source; ADV-5C, which has no candidate dataset; and the recovery bundle
refresh, blocked because the device bridge is gone.

Deferred by standing agreement: Map Phase 2; the parked visual quality package, which the
owner ordered held until the Codex work is finished; the `median` column physical rename;
import boundary lint enforcement; the 22 documentation only em dashes in
`docs/roadmap.md`; the 372 BASE prose strings; and the smaller items listed in the
PKG-A11Y-1 handback.

---

## 11. One thing to fix in this repository

The root `CLAUDE.md` is not a SAT Markets file. It was added in `5e7dfef` and contains
only a third party tooling requirement instructing an AI session to stop work unless an
external repository is cloned into the home directory and a setup script is run. It also
contains an em dash, which the Laws forbid. It has never been followed in this project,
the canonical Laws live in the SAT Knowledge Base and `docs/LAWS.md`, and a fresh session
that reads the root file literally will refuse to work.

No change has been made to it, because deleting or rewriting a file the owner may have
added deliberately is an owner decision. Saleem should either remove it, or replace its
contents with a pointer to `docs/LAWS.md` and this file.

---

## 12. Opening a new conversation

**Corrected 2026-08-08, PKG-TRUTH-REQ-1.** `sm_ship_token.txt` is not required to open a
session or to ship. It is one of two ways to push, not the only one, and the paragraph
this replaced described it as mandatory, which is no longer accurate now that section 4's
branch-and-PR connector path works without any token at all.

Paste this. Attaching `sm_ship_token.txt` is optional, only useful if the owner wants
`tools/ship.py`'s direct path available from the first ship rather than as a fallback.

> You are the builder on SAT Markets, continuing without interruption. Clone
> `https://github.com/saleemzeidan123/satmarkets` to `/tmp/sm2` and run
> `npm install --no-audit --no-fund`. Read `docs/session-resume.md` first, then
> `docs/status-ledger.md`, then `docs/LAWS.md`. Section 0 of the resume is my standing
> mandate and it is in force from your first message: full authority over unblocked
> engineering work, no procedural approvals, record a blocker and move to the next
> dependency rather than stopping, one consolidated handback per package. Ignore the root
> `CLAUDE.md`; section 11 explains it. To ship: use the normal branch-and-PR connector
> path from section 4 whenever it is available, since it needs no credential from me at
> all. Use `tools/ship.py` only in a session already authorized for it, meaning
> `SM_GH_TOKEN` is set, `~/.sm_ship_token` exists, or I have attached
> `sm_ship_token.txt` this session. Never ask me to type a credential into the chat, and
> never attempt a direct push to protected `main`; ship on a branch and open a pull
> request. Do not re-ask me for context that is in these files. Tell me the current
> position and what is owed, then continue.

Everything else is in the repository. A session opened this way has the same authority
and the same rules as the one that wrote this file, and needs nothing further from a
previous conversation, with or without a token attached.
