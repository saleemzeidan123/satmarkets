# SAT Markets status ledger

One authoritative place to read what is true right now. Created as slice A of
PKG-ELITE-E1 under the Codex instruction of 2026-08-01.

**How this file is used.** Before proposing or re-running any package, read this file.
A package listed as completed is not re-run and not re-proposed unless a regression is
found and recorded here first. Where this file and a package narrative disagree, this
file is corrected in the same commit that finds the disagreement, and the narrative is
left alone; the narratives are historical records of a decision at a time, this is the
current state.

**How this file is maintained.** Updated in the same commit as any package closure, any
findings-register change, any deployment that becomes production, and any owner decision
that resolves or opens an outcome. It carries no figures that are not read from the
repository, the findings register, the decision register or a live check named beside
them.

**This file and the baseline enhancement plan answer two different questions.** This
file records present truth: what is built, what is deployed, what is open, what is
blocked and by whom. It does not record intended scope, and it never did.
`docs/baseline-enhancement-plan-2026-07-22.md` records intended scope: the 37
workstreams with their original acceptance conditions, the six user journeys and the
58-route register, exactly as they were written on 22 July 2026 and unedited since. A
reader asking "what is this workstream meant to deliver" reads the baseline. A reader
asking "is it delivered" reads this file. Neither is derived from the other, which is
the point: on 2026-08-02 a reconciliation was built by inferring intended scope from
repository numbering, ten workstreams were declared unrecoverable while the source
document sat in the owner's Drive, and six journeys were replaced by four substitutes
and two candidates. Preserving the baseline in the repository is what prevents that
recurring. Do not edit the baseline to match what was built. Record what was built
here.

**Where to start a new session.** `docs/session-resume.md` carries the continuity record:
how to rebuild the ephemeral build container, the gate and ship commands, what this
environment cannot do, the standing owner rulings and Codex commission, the evidence
discipline, and what is owed next. Read it before this file. It defers to this file on
every current figure.

---

## 1. Position

| Item | Value |
| --- | --- |
| GitHub HEAD | `main` is `bdc706c`, "docs: PKG-TRUTH-REQ-1 closure addendum, merge SHA and deployment recorded". The squash merge it follows is `8fed30b`, PR #1, "PKG-TRUTH-REQ-1: requirement notification and match honesty repair". `next16-security` is unchanged from section 1c and is now behind `main` by this package; it is kept as a named rollback point, not as a tracking branch |
| Branch | `main`, remote `github.com/saleemzeidan123/satmarkets`. PKG-TRUTH-REQ-1 was authored on a short-lived branch, `pkg-truth-req-1`, opened as PR #1 and squash-merged; the branch is deleted. The repository now carries two standing controls it did not have before this package: **auto-merge is enabled**, and an active ruleset, "main requires green build", requires the Vercel status check to pass and blocks force pushes and deletion on `main`. A push straight to `main` therefore has to have passed that check on a branch first; the direct-to-`main` docs commit `bdc706c` predates the ruleset taking a build dependency into account for a documentation-only change and was not blocked, but every future code change goes through a branch and a PR |
| Branch position | `next16-security` at `2bf652e`, unmoved and now four commits behind `main`. Nothing in this package touched it |
| Working tree | Clean at the time of writing |
| Production deployment | `dpl_AtmMRa8Zk1cdDYJUvjRe5Si4JVDR`, READY, target production |
| Deployment URL | `satmarkets-arvo56u05-sat-markets.vercel.app`. Built from `githubCommitSha` `bdc706c7c422a022c25bfcd51610d4f56efa8f7e`, `githubCommitRef` `main`. Documentation only, so nothing rendered changed by this build; it is named here only because it is what `meta.githubCommitSha` actually confirms, not the previous commit's build. **Correction to a claim this row held for a few minutes on the branch that carries it:** it first read that `bdc706c` was documentation-only and would not get its own build, generalising the standing deployment-lag rule without checking this specific case first. `list_deployments` shows it did get one, `created` 1786198546663, shortly after the merge build. The prior production commit, `8fed30b`, has its own deployment, `dpl_Cp4XRmW93tbk4UetmMFZfzM114JL`, and `/en/notifications` and `/ar/notifications` were re-read off the production alias after that merge and confirmed live: both serve the truthful preview disclosure and the retitled "preview, not configurable" channels panel, and neither serves the removed "Mark all read", "Preferences" or switch-shaped toggle markup, in either language |
| Aliases | `satmarkets-wheat.vercel.app`, `satmarkets-sat-markets.vercel.app`, `satmarkets-git-main-sat-markets.vercel.app` |
| Commit deployed | `bdc706c`, confirmed by reading `meta.githubCommitSha` and `meta.githubCommitRef`, not `readyState` alone |
| Build ready at | Not read from the build log directly by this session; `list_deployments` reports `created` 1786198546663 (epoch ms) and `state: READY` |
| Deployment lag | None. Both commits since the last ledger update, `8fed30b` and `bdc706c`, each built and reached READY at production on their own `meta.githubCommitSha`, contrary to what an earlier draft of this row assumed from the general rule without checking `list_deployments` for this specific pair |
| Release state | Site-wide `noindex, nofollow`. Preview protected. Owner ruling 1 parks indexing |
| Launch stage | E0, engineering foundation. The gate to E1 is a design-partner alpha |
| Test suite | 1774 tests, 0 failing, on `main`, confirmed by this package's own gate run against the rebased tree. The rise from 1759 is four upstream suites that landed on `main` between this package's authoring and its merge (`authErrors.test.ts`, `rtlTextPlugin.test.ts`, `csp.test.ts`, `next16Surface.test.ts`, already counted in the 1759 row above and restated here because this package rebased onto them) plus this package's own two new files, `src/lib/truthRepair.test.tsx` and the taxonomy additions inside `requirementIntake.test.tsx`. `npm run ship-test` is unchanged at 32 checks. `npm run lint-gate` held its ratchet at 49 pinned errors with no new rule tripped |
| Gate command set | `npx tsc --noEmit`, `npm test`, `npm run ar-lint`, `node scripts/prose-scan.mjs`, `npm run lint-gate`, `npm run ship-test`, then the four probes, each of which needs an explicit browser path: `node scripts/reflow-probe.mjs`, `radio-probe.mjs`, `shell-probe.mjs` and `responsive-probe.mjs`, all with `--chromium /opt/pw-browsers/chromium`. `shell-probe` and `responsive-probe` also need `/tmp/globals.built.css`, built by `npx tailwindcss -i src/styles/globals.css -o /tmp/globals.built.css --minify`. Then a Vercel READY build whose `meta.githubCommitSha` is checked, not only its `readyState`. `npm run build` cannot complete in this sandbox, because `next/font/google` cannot reach Google Fonts through the egress proxy, so the Vercel build is the production build evidence |

**This has now happened twice, so it is a pattern rather than an incident.** A push can
land on `main` without Vercel creating a deployment for it. The check that catches it is
`list_deployments` with a `since` timestamp, not `get_deployment` on the branch alias:
the alias keeps answering READY for the previous commit and looks healthy. Any future
ship that reads READY must confirm `meta.githubCommitSha` matches the commit just
pushed, which is the rule this file already states and which is what caught this one.

**Deployment lineage worth keeping.** `d2d2fb5` never received its own Vercel build
because no GitHub webhook fired for it; it reached production carried by `44a143f`'s
build, which is why the PKG-LS2 READY gate is satisfied without a build of its own. That
is a characterised gap, not an assumed one: `list_deployments` returned zero for the
window fourteen minutes after the commit.

---

## 1a. In flight

**PKG-NEXT16-SECURITY**, authorized 2026-08-03 as a deliberate security exception, **landed
on production `main` on 4 August 2026 and now carried as a completed row in section 2.** The
account below is kept in place rather than moved, because it is the record of what the
package was asked to do and what it cost, and a reader arriving at section 2 is pointed
here. Nothing in this subsection is still in flight. What follows this package is in
section 4, and it is not another foundation package.

The work order that closed PKG-E1-READINESS said to begin no further foundation package
and to let the first ELITE-1 observations choose what came next. This package is the
single named exception to that instruction, not a departure from it, and it exists because
the framework version is on the critical path of the thing the instruction was protecting.
Participants receive the preview link only after this migration is verified, so recruitment
and scheduling continue while the engineering runs. The public-discovery redesign remains
next, and no other general foundation package may be inserted after this one.

Six slices. A migrates Next.js 14.2.35 to the current stable Next.js 16 Active LTS release
with React, React DOM and their types, using the official codemods as an inspected
starting point rather than as output to be trusted. B re-runs the dependency audit and
closes what the supported framework closes, with an applicability analysis and a
time-bound exception for anything that remains, and without claiming completion from
`npm audit` alone. C self-hosts the pinned RTL map-text plugin with its licence notice,
removes `unpkg.com` from `script-src` and `connect-src`, and weighs nonce-based strict CSP
against hash and subresource-integrity alternatives while measuring what forcing dynamic
rendering would cost. D is regression coverage across authentication, public server
component reads, listings canonicalization, metadata, Arabic rendering, the manifest and
every API route method, from 320 through 1920 px. E re-runs the same forty-cell probe and
reports matched before and after results without automatically replacing the budgets. F
prepares, and does not apply, one Vercel WAF owner-action card.

The framework must not reach production main partially migrated. The conditional in the
work order is resolved: this environment does build branch previews, so the work is
validated on branch `next16-security` and its preview before it lands, and the atomic
single commit fallback is not used. Deployment `dpl_HPTLrtfd69E7JHpKgUcWiMDnduWQ` at
`79ab0c3` is READY and is the first successful Next.js 16 build of this application. It is
also the only channel that can see a build error at all: this sandbox cannot run
`npm run build`, because the egress proxy blocks Google Fonts and the four
`next/font/google` declarations in the root layout fail without it.

Slice A is complete. The framework, React and the types are on 16.2.12 and 19.2.8, the
async request API migration is done and its four `UnsafeUnwrapped` escape hatches removed
rather than carried, `next lint` is replaced by ESLint 9.39.5 behind a ratchet gate, the
middleware to proxy rename is deliberately and time-boundedly deferred with the reason
written into the file it governs, and the record with the Turbopack and Webpack assessment
and its documented fallback is `docs/next16-migration.md`.

Slice B is complete, at `2cfbcdc`. `npm audit` reported 3 high entries covering 4
advisories after the upgrade, all against copies of postcss and sharp that Next.js nests
inside itself, and all four reporting the same `fixAvailable: next@9.3.3`, a six-major
downgrade. A flat `overrides` floor at `postcss: ^8.5.25` and `sharp: ^0.35.3` removes
both nested copies, taking the audit to zero at every severity, on a lockfile diff of 0
insertions and 529 deletions. The record, with the applicability analysis for each of the
four, the sharp API compatibility replay that justified forcing 0.35.3 past the
framework's declared `^0.34.5`, the residual uncertainty that could not be proved, and
what `npm audit` structurally cannot see, is the new first section of
`docs/security-baseline.md`.

Slice C is complete, at `8bf173c` on `next16-security`, preview
`dpl_4jH9SA8VpnbMh1oh8zcxbs5rtYTP`. The right to left map text plugin is vendored at
`public/vendor/mapbox-gl-rtl-text-0.2.3/` from the npm registry tarball, with the
publisher integrity hash checked before extraction and the resulting sha256 pinned in
`src/lib/rtlTextPlugin.test.ts`; the deployment serves those exact 206,897 bytes and the
hash matches, so the chain from publisher to edge is closed. The third party CDN origin
is gone from `script-src` and `connect-src`, and two tests at opposite ends stop it
returning. The policy also acquired a per request nonce: `script-src` carried
`'unsafe-inline'` on the grounds that a nonce would trade a known weakness for
CVE-2026-44581, and that advisory is patched in 16.2.5 while this tree runs 16.2.12, so
the justification had expired and was retired rather than inherited. Hashes and
subresource integrity were both closed on structure, not preference: hashes cannot cover
the App Router's per request inline flight data, and `experimental.sri`, which does exist
in 16.2.12, covers `<script src>` elements only. The policy moved to `src/lib/csp.mjs`
with two callers so the directive list cannot drift, and middleware deletes client
supplied CSP request headers before setting its own, because that header is where the
renderer looks for the nonce. **Still report only.** The record, including what a live
browser pass has to show before enforcement and who can run it, is the new first CSP
section of `docs/security-baseline.md`, and the plugin provenance is
`docs/vendored-third-party.md`.

**The measurement the slice C work order asked for.** The instruction was not to force
every public page into dynamic rendering without measuring the cost. The build route
tables at `2cfbcdc` and at `8bf173c` are identical entry for entry: three routes are
prerendered as static content, `/[locale]/proto`, `/icon.svg` and `/robots.txt`, and
everything else was already server rendered on demand beforehand. Nothing was forced
dynamic, because the nonce reaches the renderer through the request headers and no
component has to call `headers()`. The measured cost is one page: `/[locale]/proto`
declares `force-static`, so its prerendered HTML carries no nonce, and it was fetched
from the preview to confirm that rather than assumed. Under report only that is a console
listing; under enforcement it would not hydrate. It is an internal noindexed design
system reference, and it is the one recorded blocker to enforcement.

**Correction found by the slice C live check.** The comments written during the slice
predicted that both the build time header and the middleware header would arrive on a
matched route and that the browser would evaluate both. The deployment returns exactly
one policy per response: middleware's `res.headers.set()` replaces the config value where
middleware runs, and the config value stands alone where it does not. Both comments were
corrected in this commit, and `set` is now documented as load bearing.

Slice D is complete, in this commit, with its evidence taken against
`dpl_9gSpSvRa2w4427bv1Na8jhwr3G4p` at `5464a46`. It has two halves and they are
different kinds of claim. The half that lasts is `src/lib/next16Surface.test.ts`,
six assertions over 121 modules under `src/app` and 246 shipped modules overall:
every `params` and `searchParams` annotation begins with `Promise<`, all 108
reads are paired with `await` in a Server Component or `use()` in a Client
Component (101 and 7, with floors asserted on both so neither half can quietly
stop matching), all six `cookies()` and `headers()` calls are awaited, no shipped
module mentions `UnsafeUnwrapped`, all 38 route files match a written-down method
inventory totalling 14 GET, 26 POST, 5 PATCH and 3 DELETE, and exactly one of
`middleware.ts` and `proxy.ts` exists. The half that does not last is the live
sweep, so it is filed with the deployment named beside it: all 38 route files
requested, 24 returning 405 with a matching `x-matched-path` which proves the
module is deployed and GET genuinely not exported without firing a write method
at a live deployment, 11 returning real bodies, and one each of 400, 401 and 404
in the application's own words. Page surfaces cover authentication in both
languages, public server component reads, listings canonicalization against the
four defects `src/lib/search/canonical.ts` names, metadata with `hreflang` and
Open Graph, Arabic rendering at `lang="ar" dir="rtl"`, and the manifest. The
viewport range is the four Playwright probes, 320 through 1920, all passing. The
record is section 11 of `docs/next16-migration.md`, and section 11.6 states what
it does not prove: no hydration, no console, and no write method exercised.

**A recorded limitation retired by slice D.** `/manifest.webmanifest`,
`/api/viewings` and `/api/admin/accounts/provision` were recorded in earlier
sessions as unfetchable through the Vercel fetch tool. They are not.
`"Unable to create shareable URL"` is transient: seven paths failed that way
during slice D and every one succeeded on retry. Retry three times before writing
down a limitation.

Slice E is complete, in this commit, and it is a measurement rather than a change:
no application file moved. The forty cell probe was run three times in one
container in one session, at `1a99107` with webpack, at `73c630a` with webpack,
and at `73c630a` with Turbopack, because `next build --webpack` still exists in
16.2.12. That retires the conflation caveat `docs/next16-migration.md` recorded:
the bundler and the framework are separable and were separated. The pre migration
tree rebuilt here came back one kilobyte over one budget, which is what licenses
reading the after run's overages as the change and not as a slower machine.
JavaScript over the wire rose on all forty cells, 39 to 45 kB, median 43, of which
roughly three quarters is framework and one quarter is Turbopack chunking. Total
transfer rose on all forty by about the same amount. Blocking time is the
framework's cost, a median 153 ms added on mobile with the bundler adding nothing.
Mobile paint is the bundler's cost, a median 182 ms with the framework adding 26.
Desktop paint medians did not move, but desktop cells above 400 ms went from two
to between six and eight across four independent Next 16 sweeps, each affected
cell reading either about 250 ms or about 550 ms with nothing between and the
membership not stable between sweeps, so it is recorded as a bimodal paint that
Next 16 enters more often and not as a per cell regression. Fonts did not move.
The record is the last section of `docs/performance-baseline.md`.

**The one apparent stability regression was the instrument, not the application.**
`desktop:en:home` read 0.091 on both Next 16 arms, consistently, and that nearly
went into the record as the slice's one real defect. It was the measurement tree.
In Next 16 `next/font/local` names the emitted family after the JavaScript
binding, with no hash, so the sandbox font swap's `const serif` emitted
`@font-face { font-family: "serif" }` and collided with the CSS generic keyword:
sixteen faces registered instead of seventeen, the size adjusted fallback did not
hold, and the heading rewrapped at a fixed size about 335 ms in. Renaming the four
bindings and rebuilding both Next 16 arms took it to 0.000, and the reported matrix
is those rebuilt arms. The committed application uses `next/font/google`, which
takes its family from the CSS Google returns, so it does not have the collision,
and that was checked rather than assumed.

**The budget decision is the owner's and is not taken here.** `--write-budgets`
was not passed, per the work order. The standing consequence is that
`node scripts/perf-probe.mjs` exits 1 against the committed budgets with 99
overages, 40 on JavaScript bytes, 32 on total bytes, 15 on blocking, 12 on paint
and none on stability. The webpack arm reports 102 by the same measure, so the
failure is the framework and not the bundler choice. Re baselining accepts about
43 kB of extra JavaScript per page as the new normal in exchange for a supported
framework, which is the trade that was already made when the migration was
authorized. Leaving the budgets alone keeps a red gate standing that no code change
in this repository can turn green. Either is defensible and an unrecorded choice is
not, because an unexplained failing gate gets ignored and then deleted.

Slice F is complete, in this commit, and it prepared one Vercel WAF rate limit rule
and applied nothing. No rule exists on the project, no account setting was touched,
and the card is written so the owner stays one command from either publishing it or
throwing it away, because `vercel firewall rules add` stages a draft and drafts do
not reach production traffic until `vercel firewall publish`. The record is the last
section of `docs/security-baseline.md`.

**The measurement is what changed the rule, and it is the part worth reading.** The
withdrawn recommendation was one fixed window keyed on IP across `/api/*`. A new
instrument, `scripts/burst-probe.mjs`, drove the real production build with a real
browser through four sessions, an English listing browse using both public search
boxes, a tour of the six read heavy market surfaces, the same browse in Arabic, and
an advisor conversation of four questions, and recorded every request with a
millisecond timestamp. It ran twice over the same script, at 140 ms between
keystrokes and at 320 ms, because both public typeaheads debounce at 220 ms and that
threshold is the difference between a word costing one request and a word costing
eight. The fast arm sent 8 requests to `/api`, the deliberate arm sent 26. Same
person, same actions, three times the traffic, decided by typing speed. Twenty one of
the deliberate arm's twenty six were one route, `/api/places`, the browsing
typeahead. That is why no threshold serves the blanket scope: low enough to protect
the routes that spend money is low enough to throttle someone typing a district name.

Split by whether the route would be covered, the answer falls out. The covered set
peaked at 5 requests per 60 s in both arms, identically, `POST /api/advisor` four
times and `POST /api/search` once, and did not move with typing speed at all,
because every request typing speed moves is `/api/places`. Excluding that one route
removes the conflict and leaves a threshold that can be set from evidence.

**The inventory the ledger asked for.** Of 38 route files under `src/app/api`, 28
call `getSession` before acting and two more sit behind `CRON_SECRET`, leaving ten an
anonymous request can reach: `/api/advisor`, `/api/advisor/shortlist`, `/api/search`,
`/api/signup`, `/api/requirements` on both methods, `/api/geocode`,
`/api/geo/resolve`, `/api/places`, `/api/index/segments` and `/api/saved`. Two facts
came out of building it. `/api/saved` has no limiter of any kind. And exactly one
route in the application uses `allowShared`; the other 31 importers of
`@/lib/ratelimit` call the per instance `allow`, which on serverless hands each cold
start a fresh quota. Neither is fixed by this rule and both are said again in the
card rather than left implied.

**The recommendation.** Six condition groups OR combined inside one rule, because
Hobby allows exactly one: `/api/advisor` by prefix, which also catches the shortlist,
`/api/search`, `/api/signup`, `/api/requirements` with the method pinned to POST so
ordinary browsing is not counted, `/api/geocode` and `/api/geo/resolve`. Keyed on IP
address alone, 60 requests per 60 seconds, fixed window. Sixty is twelve times the
measured ordinary peak, which reads as twelve colleagues behind one office address
each simultaneously at personal peak, and that is the shared address case the ledger
named. JA4 was available as a second key and was rejected: an attacker varies a TLS
fingerprint far more easily than colleagues vary browsers, so it multiplies an
attacker's quota by more than it relieves the office.

**The first action is log, not deny.** The measurement was taken in a sandbox against
a database with no listings, by one scripted reader. It is the best evidence
obtainable from here and it is not production, so the card publishes in observation
mode, gives the owner the two commands that read what the rule would have done over a
week, and only then the one command that promotes it to deny. Rollback is one command
at each stage: `discard` before publish, `disable` after it, `remove` if the rule is
to go entirely.

**What the card refuses to assert.** The status code the mitigation returns is not
stated in the CLI documentation and a second search did not settle it, so the card
tells the owner to read it off the first observation instead of guessing. The rest of
the honest limits are recorded with it: this is not authorization, it is not input
validation, it does not make `allow` durable, its counters are per region, it leaves
`/api/places` on the per instance limiter, and with one rule allowed the threshold is
the loosest of the six routes' needs by construction.

**Time-bound exception opened by slice B.** The `overrides` block is the thing that
survives, and an undated override becomes wrong quietly. It is reviewed at whichever
comes first: the next Next.js upgrade of any size, or **2026-11-03**. The review asks
whether the root versions now win without it (delete it if so) and whether the sharp API
replay still passes against whatever the framework then declares.

**All six slices are complete and the consolidated handback is
`docs/handback-pkg-next16-security.md`.** It carries what each slice was asked and did, the
thirteen commits with their file and line counts and each one mapped to its own deployment
by `meta.githubCommitSha`, the six gates and the four Playwright probes with `perf-probe`
named as the deliberate exception, the branch and main divergence set out in a table, the
five decisions now waiting on the owner, what the package was told not to do and did not
do, and what moved in the findings register, which is one finding raised and none closed.
The package stayed in this section while the engineering being finished was not the same as
the work being landed. That condition is now met: the branch reached production `main` on
4 August 2026 at `2bf652e`, so the package has moved to section 2 and the release-correction
batch below is kept here only as the record of how it got there. What is not closed by the
promotion is listed in section 5 and in the residuals of
`docs/handback-release-correction.md`, and the two largest are the migration debt and the
authenticated-surface evidence gap.

### The release-correction batch of 2026-08-03

The independent review tested the branch deployment in a real browser across Home,
Listings, Listing Detail, Map, Rent Index, Advisor, Login and Proto, in English and
Arabic at a 390 px mobile viewport, and found language and direction correct, no
horizontal overflow, and no console, hydration or CSP error. It accepted the branch
conditionally and ordered one bounded correction batch before any merge. Six parts.
What each settled, and what each deliberately left open, is below.

**The production bundler is Webpack, and the reason is measured.** `package.json` now
reads `"build": "next build --webpack"`, `build:turbopack` keeps the default available
for comparison, and `dev` is untouched because development is not what was measured.
Vercel runs the `build` script, so that single line is the entire production bundler
choice, and `src/lib/next16Surface.test.ts` asserts all three so it cannot revert
silently. Measured on the same commit, the same machine and the same forty cells,
Turbopack ships a median 12 kB more JavaScript per page, 8 kB to 13 kB across the
range, and paints a median 186 ms slower on a throttled phone, slower on every one of
the twenty mobile cells. The aggregate overage count of 99 against 102 was the argument
for keeping Turbopack and it was rejected: counting cells against budgets written for a
different framework measures how far the old budgets have drifted, not which bundler is
better. Blocking time does not favour either arm, 453 ms against 454 ms, which is the
evidence that the blocking increase is the framework and not the bundler.

**The performance standard is now three named records and exactly one gate.** The old
standard was preserved rather than overwritten, because a rebaseline that quietly
replaces the previous file makes the migration unreadable afterwards.

| File | What it is | Checked |
| --- | --- | --- |
| `docs/perf-budgets-next14.json` | The budgets that were the gate before the migration | No |
| `docs/perf-measurements-next14.json` | The measurement they came from, at `1a99107` | No |
| `docs/perf-measurements-next16-turbopack.json` | Next.js 16 built with Turbopack, at `73c630a`, the arm that was measured and not chosen | No |
| `docs/perf-measurements-next16-webpack.json` | Campaign A, the measurement the active budgets were generated from | No |
| `docs/perf-budgets.json` | The active budgets | Yes, by `scripts/perf-probe.mjs` |

The budgets were generated from campaign A and then validated by campaign B, an
independent build in a second tree on a second port, which passed all forty cells. That
step is new and it earned its place immediately: no budget file in this repository had
ever been asked to pass a campaign other than the one that wrote it, and asking found
two defects in the instrument. The recorded worst paint ratio of 1.115 came from
repeating one sweep and is wrong for the unthrottled desktop profile, where the same
page reads anywhere from 240 ms to 544 ms, so paint now carries a 500 ms floor for the
same reason blocking time has carried a 100 ms floor since the first baseline. And one
cell is bistable rather than noisy, which is finding 215. The full record is
`docs/performance-baseline-next16-webpack.md`.

**The migration debt is carried, not closed.** Moving the baseline changes what the gate
compares against and makes the application no faster. Shared framework JavaScript grew a
median 31 kB per page, from 267 kB to 298 kB, with the smallest increase on any cell
30 kB and the largest 33 kB, which is the signature of a floor that moved under
everything rather than one component that got heavier. Median mobile blocking time grew
137 ms, from 318 ms to 454 ms; the review's figure of about 153 ms is the same finding
read off the Turbopack arm, and the smaller number is not an improvement worth claiming.
Both belong to page and bundle optimisation that has not been scheduled. Neither is
resolved by the budgets moving, and describing them that way is the exact failure the
three record structure exists to prevent.

**Shipping safety is corrected in the tool, not in the habit.** `tools/ship.py` gave
`--branch` a default of `main`, and that default is what sent slice B to production. The
flag now has no default; `main` additionally requires `--allow-main`; pushing a checkout
of one branch to a differently named remote branch additionally requires
`--allow-cross-branch`, and a detached HEAD is treated the same way because it has no
name to compare. Every refusal happens before anything is staged, so a refused run leaves
the working tree exactly as it was found, and the push prints its source branch, source
HEAD and target ref first. The decision is the pure function `check_target`, which
touches no git, no network and no filesystem, which is what lets `tools/ship_test.py`
reproduce the slice B invocation in one line. That file is a seventh gate,
`npm run ship-test`, 26 checks when this batch was written and 32 once the closing-line
defect in section 1c was found. It also asserts what must not appear: no `--force` anywhere
in the file, and nothing in the announcement that can reach the token, the askpass helper or
the environment. This is a release-safety correction to an existing tool following a real
incident. It is not a new foundation package.

**CSP stays report only through this merge.** The public evidence is now clean in a real
browser, but the authenticated half of the application has never been observed live, and
`/[locale]/proto` is still `force-static` and therefore cannot carry a nonce. Enforcing
now would be enforcing against a policy that half the surface has not been tested under.
Both available shortcuts were refused explicitly: a broad policy exception, and weakening
the public policy to accommodate one internal noindexed page. The `/proto` blocker stays
recorded for launch hardening.

**The WAF rule is accepted in principle and applied to nothing.** The six route design
from slice F stands, `/api/places` stays excluded, and no rule exists on the project. It
enters log and observation mode when ELITE-1 participant traffic begins, stays in
observation through the pilot and the first meaningful week of genuine usage, and moves
to deny only after a false positive review. The measurement behind it was taken in a
sandbox against a database with no listings, which is why the first action is observation
and not enforcement.

**Upstash stays deferred and nothing was bought or configured.** It reopens on any of
three named triggers: open beta, evidence of multi instance limiter weakness, or real
abuse. The weakness it would address is unchanged and is not hidden by the deferral: 31
importers of `@/lib/ratelimit` call the per instance `allow`, which hands each cold start
a fresh quota, exactly one route uses the durable `allowShared`, and `/api/saved` has no
limiter at all.

## 1b. The slice B commit went to `main`, not to the branch

Recorded here because the ledger is corrected in the same commit that finds it wrong, and
because it changes what the production alias is serving.

`tools/ship.py` declares `ap.add_argument("--branch", default="main", help="target
branch")`. The slice B ship was run without `--branch`, so it pushed the local
`next16-security` HEAD to `refs/heads/main`. Because `main` was still at `1a99107`, an
ancestor, the push was a clean fast-forward rather than a rejected one, and it carried
all five commits at once: `72fe6fc`, `4d61024`, `79ab0c3`, `f115c12`, `2cfbcdc`. Vercel
built `main` as production. **The framework migration is therefore live**, at
`dpl_DbbHaXgFsu1pqc26Ht3oySsiFZkK`, before slices C through F have run. The branch was
afterwards synced to the same commit with `--push-only --branch next16-security`, so the
two references now agree.

This contradicts the in-flight statement above that the work is validated on the branch
before it lands. That statement was the intent and it was not honoured.

**It was not reverted, and the reasoning is written here rather than left implicit.** The
site is pre-launch: site-wide `noindex, nofollow`, sample data, launch stage E0, no real
users, and owner ruling 1 parks indexing. All six local gates are green on the commit,
the Vercel build log is clean apart from the known and deliberately retained `middleware`
deprecation notice, and the preview at `f115c12` had already been verified before this
happened. Against that, a `git revert` across five commits of a framework migration,
including a codemod-derived async request API change, is a larger and less reviewable
operation than the state it would be undoing, and force-pushing `main` backwards would
discard the one production build that proves Next.js 16 compiles here. Proceeding was
judged the lower risk. That is a judgement, not a rule, and it is recorded as one.

**What it costs.** Slices C through F now run against a production `main` rather than
against an unmerged branch, so each of them must be gated as a production change. The
rollback target if one is needed is `08470dd` at `dpl_7ShsR8PTz4yu75Rm11vfVVEgXtH4`.

**The fix for the cause.** Pass `--branch` explicitly on every ship for the remainder of
this package. The default is the hazard, and changing it is itself a change to shipping
infrastructure in the middle of a migration, so it is recorded as a follow-up rather than
made here. That follow-up is now done and it is section 1c.

## 1c. The branch was promoted, and the ship tool was corrected twice

Recorded on 4 August 2026, in the commit that follows the promotion rather than in the one
that performed it, because a ledger cannot record a deployment before that deployment
exists. The full account, with the evidence for each part, is
`docs/handback-release-correction.md`.

**The promotion was a real fast-forward and it was checked as one.** `origin/main` at
`2cfbcdc` was confirmed an ancestor of `next16-security` before anything was merged, and
`git merge --ff-only` then reported `Updating 2cfbcdc..2bf652e` across 35 files, 7198
insertions and 264 deletions, with no merge commit created. The push went through
`--branch main --allow-main`, which is the explicit promotion path section 1b asked for.
Production deployment `dpl_28FxggteRGchKrj6auC7j9BGHZCB` is READY at
`2bf652e3d655246f69faa3451be843da62c1b658` with `githubCommitRef` `main`, built by webpack.
Eight production routes across both locales return 200, carry the deployment id in
`data-dpl-id`, carry the correct `lang` and `dir`, carry exactly one nonce each and a
different one per document, contain no `unpkg.com` reference, and carry a report-only CSP
header with no enforcing header beside it. The vendored RTL plugin serves 206,897 bytes
from the versioned path with sha256 `142f4fc3...e6fdf5d2`, byte identical to the repository
file that `src/lib/rtlTextPlugin.test.ts` pins against the verified npm tarball, which is
what closes the plugin chain on a webpack build specifically.

**Both guards were demonstrated live, not only asserted in tests.** Immediately before the
promotion, a ship with `--branch` omitted exited 1 with text naming the slice B incident,
and a ship with `--branch main` and no `--allow-main` exited 1 with text saying that naming
the production branch is not the same as intending it. A unit test proves the function; the
live refusal proves the wiring.

**A second defect in the same tool was found while doing that, and fixed.** The two push
paths closed differently. The `--push-only` path already distinguished a branch ship from a
main ship, but the commit-and-push path told every ship, on any branch, that Vercel was
building it to production. That is the slice B error restated in words rather than in refs:
a closing message that reads as a production event when the push never went near
production. Both paths now close through one `report` function, so there is one sentence to
keep true instead of two to drift apart, and `npm run ship-test` rises from 26 checks to 32.
The six new checks assert that both paths call `report`, that the production sentence exists
exactly once in the source, and then capture the actual printed output of a branch ship and
a main ship and assert what each does and does not say.

**Two evidence gaps are stated rather than glossed.** Production was not verified in a live
browser at mobile and desktop widths: this sandbox has no egress to `vercel.app`, `curl`
returns 000, and no Chrome extension is connected, so `list_connected_browsers` returns
nothing. What stands in place of it is the 234 measurement responsive probe, the 14 render
reflow probe, and a 28 load local browser run at 390 and 1280 px against source that differs
from the deployed tree by one test file. And no authenticated surface was exercised at any
point in this batch: no dashboard, listing management, studio, inventory, requirement,
matches, messages or admin surface was opened, and no authenticated write journey was
fired. That gap is the same one section 9 carries and the same one that keeps CSP in report
only mode.

## 2. Completed packages

Listed once. Do not re-run, do not re-propose, do not rebuild any of these unless a
regression is recorded in section 6 first.

| Package | What it closed | Recorded in |
| --- | --- | --- |
| PKG-0A to PKG-2A | The original Codex audit remediation sequence, typography, RTL, verification labelling | `docs/pkg-1b-verification.md`, `pkg-1b1-closure.md`, `pkg-1b2-closure.md`, `pkg-1c-closure.md`, `pkg-1c1-closure.md`, `pkg-2a-closure.md` |
| ADV-0 | Regulatory and data-rights register, rights ledger, AI data boundary, procurement backlog | `docs/adv-0-closure.md` |
| ADV-1 | Evidence and entity foundation, five verification dimensions, fail-closed resolver | `docs/adv-1-closure.md` |
| ADV-1C | The Evidence Passport producer, its rendering and its gate | `docs/handback-adv-1c.md` |
| ADV-1C.1, ADV-1D | The eleven corrections and the first integrated evidence | `docs/handback-adv-1c1-adv-1d.md` |
| ADV-1E | One quote decision, and the meanings it separates | `docs/handback-adv-1e-finding-91.md` |
| ADV-2 | Professional supply and demand workflow | roadmap, ADV-2 section |
| ADV-3A, ADV-3A.1, ADV-3B | Model-agnostic AI platform, its corrections, agents and tools | `docs/adv-3a-closure.md`, `adv-3a1-closure.md`, `adv-3b-closure.md` |
| ADV-4A, ADV-4B | Source-linked research, to the limit O10 and O13 allow | `docs/adv-4a-closure.md`, `adv-4b-closure.md` |
| ADV-5A, ADV-5B | Location intelligence interfaces, no dataset activated | `docs/adv-5a-closure.md`, `adv-5b-closure.md` |
| Owner ruling 3 and 4 closure | Verification labelling and HBU comparable anonymisation | `docs/ruling-3-4-closure.md`, `ruling-3-residual-closure.md` |
| PKG-AV1, PKG-AV2 | Availability truth on the browse card, and the re-affirmation it asks for | roadmap lines 805 and 854 |
| PKG-NM1 | One name per listing in the reader's language | roadmap line 888 |
| PKG-LS1 | The Arabic half of the lister's own workspace | roadmap line 961 |
| PKG-SUP1, PKG-SUP2 | The public listing entry stops simulating a form; one figure grammar on every listing surface | roadmap lines 1054 and 1397 |
| PKG-DEM1, PKG-DEM2 | The demand entry point stops rejecting its visitors; a requirement's figures stop being invented | roadmap lines 1180 and 1338 |
| PKG-FIG1, PKG-FIG2 | The grammar of a figure; one table for a unit | roadmap lines 1456 and 1509 |
| Codex ten-item corrective package | Items 1 to 8 implemented, item 9 closed at `b2fc4b8` | `docs/elite-standard-reconciliation.md` |
| PKG-ELITE-E1 slice A | The authoritative status ledger, this file | shipped `3b80cf9` |
| PKG-ELITE-E1 slice B | The working practice against environment reclamation, and the first recovery bundle | shipped `e2f776b`, section 10 below |
| PKG-ELITE-E1 slice C | Finding 137 resolved safely: a first pin may offer a location and never overwrite one, a contradiction refuses the write and blocks production counting | shipped `cf3504a` and `83dfdf3`, roadmap slice C section |
| PKG-ELITE-E1 slice D | The ELITE-1 research instrument in English and Arabic, eleven artefacts at full parity | `docs/research/elite-1-instrument-en.md`, `docs/research/elite-1-instrument-ar.md`, roadmap slice D section |
| PKG-ELITE-E1 slice E | The ELITE-4 manual accessibility pass over four journeys. 126 defects found, all 7 critical and all 41 high fixed, 54 of the remainder recorded | shipped `ae7b198`, `docs/accessibility-elite-4.md`, findings 139 to 192 |
| PKG-ELITE-E1 slice F | The ELITE-8 event dictionary and product scorecard. 46 events across the ten named families, 48 catalogued properties, 30 forbidden by name, 12 measures with no invented target, nothing collected | shipped `1b9bc0a`, `docs/elite-8-event-dictionary.md`, O17 below |
| PKG-ELITE-E1, whole package | Codex items 1 to 6 delivered, item 7 observed. Consolidated handback with scope, commits, gates, live EN and AR evidence, responsive limits, blockers and the next action | `docs/handback-pkg-elite-e1.md` |
| PKG-A11Y-1 slice A | The O17 and O12 rulings recorded against the surfaces they hold shut, the data-collection readiness record and the owner-ready recruitment sheet | shipped `7621724`, `docs/data-collection-readiness.md`, `docs/research/elite-1-recruitment-sheet.md` |
| PKG-A11Y-1 slices B to R | The accessibility remediation itself. 55 open P1 findings triaged to 12 root causes plus 2 journey-specific defects, 38 of the 39 accessibility findings closed, 8 further findings raised and closed inside the package, 1 data-quality migration authored for the owner | shipped `beef75a`, `7dfca13`, `7dfa5e7`, `1853e92`, `8beeaf6`, `abc3495`, `69fc447`, `72d04fa`, `d8de177`, `ededded`, `a38c06e`, `fcb4388`, `9fde67c`, `3cf25b4`, `8e80dbe`, `c6cad0e`, `7aaab03`; `docs/a11y-p1-triage.md` |
| PKG-A11Y-1, whole package | Consolidated handback with the Finding 138 disposition stated first, the triage, the root-cause fixes by journey, EN and AR live evidence, viewport and assistive-technology evidence classified by kind, and the independent-audit items that automation cannot settle | `docs/handback-pkg-a11y-1.md` |
| PKG-KIT-REC | The O18 ruling recorded and the four ELITE-1 recruitment kit corrections applied. **Its third deliverable, the roadmap reconciliation gate, was rejected by Codex on 2026-08-02 and has been rebuilt. Do not read the version shipped in `d34ebfa`, and do not read sections 4 or 5 of its handback.** The O18 record and the kit corrections stand | `docs/handback-recruitment-kit-and-reconciliation.md` sections 1 to 3, `docs/research/elite-1-recruitment-sheet.md`, `docs/research/elite-1-instrument-en.md`, `docs/research/elite-1-instrument-ar.md`, O18 and O19 in `docs/decision-register.md` |
| PKG-REC-COR | The corrected reconciliation. The original enhancement plan was recovered from the owner's Google Drive, preserved unedited in the repository as a baseline reference, and the gate rebuilt against it: all 37 workstream titles audited against source rather than inferred from repository numbering, the authoritative six journeys restored in place of four substitutes and two candidates, the status matrix rebuilt from the original acceptance conditions, and the conclusion that every incomplete visible workstream awaits something other than engineering time withdrawn verbatim and replaced by an eighteen-workstream inventory of unblocked engineering work. Two further ELITE-1 corrections applied at parity in three files: what ELITE-1-AT validates stated exactly with a separate authenticated round ELITE-1-AT-B defined for the 22 private-flow findings, and raw research notes bounded to 90 days after the final session rather than to the life of an open finding | `docs/baseline-enhancement-plan-2026-07-22.md`, `docs/roadmap-reconciliation-gate.md`, `docs/handback-reconciliation-corrected.md`, `docs/research/elite-1-recruitment-sheet.md`, `docs/research/elite-1-instrument-en.md`, `docs/research/elite-1-instrument-ar.md` |
| Finding 203, slices A to G | The bilingual refusal architecture. A route states a stable `code` and keeps its English sentence on the wire for the log and the API consumer; a client-side `[en, ar]` table names that code in the reader's language. 127 refusals across 16 route files all state a code, 76 codes are named in `src/lib/apiErrors.ts`, 15 client files render the named sentence, and 11 guards read the source so neither half can drift back. Four PostgREST leaks closed on the way, three of them on routes that take no session at all | shipped `bbdc22b`, `b731f7f`, `81844ed`, `085a4bc`, `0d62cb5`, `994f02e`, `48352e3`; `src/lib/apiErrors.ts`, `src/lib/apiErrors.test.ts`, findings register row 203. Status is "Fixed and awaiting deployment verification", not closed, for the reason in section 9 |
| Codex bounded batch, items 2 to 4 | The three owner-facing items of the batch that opened with finding 203. Item 2 is the finding 117 action card: preflight reads that establish a baseline and are explicitly not a count of affected rows, the application steps, four post-application checks including a refusal proved inside a transaction that is rolled back, a rollback that restores the defect exactly and therefore reopens the finding, and the four artefacts that close it. The Arabic-font workflow stays item 3 of the same file and is referenced rather than restated, per Codex condition 3. Item 3 of the batch is the ELITE-1 recruitment kit, finalised and unsent, with the authorisation error corrected: the sheet had read that recruitment was authorised when only preparation is. Item 4 is decision O18, the identity mechanism for an anonymous poster's withdrawal, written as a decision the owner rules on rather than a design already chosen | shipped `0391130`; `docs/owner-actions-adv-1c1.md` section 4, `docs/research/elite-1-recruitment-sheet.md`, `docs/decision-register.md` row O18, findings register row 193. Nothing in it is implemented and nobody has been contacted |
| Finding 203 and the owner batch, handback | One consolidated handback covering commits, gates, live EN and AR evidence read from the deployed build, what is genuinely closed, what requires human verification because no automation in this environment can settle it, what remains owner-blocked, and what was deliberately not started | `docs/handback-203-and-owner-batch.md` |
| PKG-E1-READINESS slice A, WS13 | Functional truth. A request that was not stored no longer returns or renders success. `/api/signup` returned `{ok:true}` with a note when no database client was configured, and `/api/viewings` did the same; both now refuse with a stable code, a bilingual sentence and a 503. The body parse is guarded, and the PostgREST detail is redacted out of the log rather than into it | shipped `031bfb3`; `src/lib/functionalTruth.test.ts`, findings 206 and 207 |
| PKG-E1-READINESS slice B, WS09 | The responsive shell. The tab-bar reservation follows the tab bar instead of sitting on every route, the 62px it reserved is no longer dead, and the automated matrix reaches 1920px in both languages. Three defects, none of them findable by reading: a server component that could not have been conditional, a reservation on an element that is not last in the document, and a probe that had been measuring the top of every page because `scroll-behavior:smooth` makes a synchronous read after `scrollTo` return the pre-scroll position | shipped `d700636`; `src/lib/chrome.ts`, `src/lib/chromeGate.test.ts`, findings 208 and 209 |
| PKG-E1-READINESS slice C, WS16 | Search correctness. One canonical URL module, a known-query test set of 38 cases across both languages covering type, city, district, price, area, sort and empty results, URL persistence, back-button behaviour and the rule that a development never becomes a district. It also closed the canonical half of owner ruling 5 | shipped `345f7a3` and `dca8b16`; `src/lib/search/canonical.ts`, `src/lib/search/knownQueries.test.ts`. Raised no finding, which section 5 records rather than passes over |
| PKG-E1-READINESS slice D, WS25 | Authentication safety. The login form was answering four different sentences for four different account states, which is an enumeration oracle. A third bilingual refusal table, whose defining property is the opposite of the two before it: it says as little as the platform can get away with while still leaving a reader a way in, and its resolver is an allowlist whose default is silence rather than a blocklist whose default is disclosure | shipped `d1b27c7`; `src/lib/authErrors.ts`, `src/lib/authErrors.test.ts`, findings 210 to 213 |
| PKG-E1-READINESS slice E, WS33 | The first reproducible performance baseline. Forty cells, ten route families by two locales by two device profiles, median of three cold loads, budgets derived from the measured application rather than from invented industry targets. Three changes it justified: `preload:false` paired with `display:"optional"` on all four faces, and the Supabase browser client deferred out of the header's first script set. Font transfer 322 kB flat to a 140 kB median, total transfer down 23.6 per cent, mobile FCP 1368 to 804 ms. Total blocking time did not improve, 303 to 317.5 ms. That is recorded as an observed, unconfirmed regression requiring remeasurement, not as a proven cost of the auth deferral: three median runs on a shared build machine settle neither significance nor cause, and the same document's own repeatability check moved blocking time by 1.426 on an unchanged build against the 1.048 claimed here. The transfer reduction is not reversed on that result alone | shipped `dcf4cdc`; `docs/performance-baseline.md` |
| PKG-E1-READINESS slice F, WS34 | Security essentials. A Content Security Policy in report-only mode with every directive derived from what the application actually loads and written out so the reasoning can be checked, five further security headers, `poweredByHeader` off, and the compatible dependency upgrade taken. No reporting endpoint, because a collector would be collection and O17 holds that shut. The rate limiting is described as what it is rather than called protection: three owner decisions were produced instead, and they are in section 7 | shipped `ac05525`; `next.config.mjs`, `docs/security-baseline.md` |
| PKG-NEXT16-SECURITY, whole package including the release-correction batch | Next.js 14.2.35 to 16.2.12 with React 19.2.8, the dependency audit and its dated exception, the self-hosted RTL map-text plugin with `unpkg.com` removed from the policy, the regression coverage, the forty-cell rebaseline and the prepared-not-applied WAF card. Then the six-part correction the independent review ordered before any merge: webpack chosen as the production bundler on measured mobile paint rather than preference, three named performance records with exactly one gate, the shipping-safety correction to `tools/ship.py`, CSP held in report-only, the WAF and Upstash decisions left unapplied, and the promotion itself. Landed on production `main` at `2bf652e`, deployment `dpl_28FxggteRGchKrj6auC7j9BGHZCB`. What the promotion does not close is the migration debt and the authenticated-surface evidence gap, both carried in section 5 and section 9 | `docs/handback-pkg-next16-security.md`, `docs/handback-release-correction.md`, `docs/performance-baseline-next16-webpack.md`; sections 1a, 1b and 1c above |
| PKG-E1-READINESS, whole package | One consolidated handback: scope, eight commits separated by scope with file and line counts, every commit mapped to its own READY deployment by `meta.githubCommitSha`, the gate results, live EN and AR evidence, responsive evidence from 320 through 1920, the exact before-and-after of the two false-success routes as literal code, and the security and performance limitations stated in place rather than appended | `docs/handback-pkg-e1-readiness.md`, shipped `08470dd` |
| PKG-TRUTH-REQ-1 | Corrective honesty repair, commissioned after the Mobbin synthesis and independently accepted as closed by Codex. Dropped the hardcoded `NOTIFIED` audience constant and the `notified` field from `/api/requirements`, on the fact that nothing in the codebase dispatches email, SMS or push. Renamed `match` to `candidate_count` in the same response, on the fact that the query filters status, asset type, deal type and district and evaluates none of size, budget, timeline, availability or must-haves. Added `land` and `mixed_use` to `REQUIREMENT_ASSET_TYPES`, named the remaining six as `REQUIREMENT_ASSET_TYPES_EXCLUDED`, and added a structural test asserting the two lists together cover every key in the 15-entry `ASSET_FIELDS` registry. Removed the notifications preview page's decoy "Mark all read" and "Preferences" controls and its switch-shaped per-channel toggles, replacing the toggles with static status dots and adding an explicit preview-only disclosure. Regression protection is route- and render-level, `src/lib/truthRepair.test.tsx`, not a source scan. Reported O18's exact state (ruled, sequenced, unbuilt) rather than building any part of it. Authored against a `main` that went 21 commits stale mid-package (the Next.js 16 to React 19 migration); rebased, with two rebase-only fixes recorded in the handback. **Pushed by a mechanism this file has not recorded before.** This session's own git-proxy path refused the repository outright, the same refusal section 4 of `docs/session-resume.md` already names. Discovered this session: the `Claude Github MCP Connector` GitHub App was authorized on the owner's account but installed on no repository, which is why every earlier write through it also failed with `403 Resource not accessible by integration`; that is a GitHub App install-scope error, distinct in kind from the git-proxy's session-authorization refusal, and both had to be true at once for the connector to look like a dead end. The owner installed the app, scoped to this repository, code read and write only, live in this session. The change then went up as four file-relay commits carrying the original three commits' content, each verified byte-identical to the tested tree by comparing git blob SHAs after upload, merged through PR #1 with the owner clicking squash-merge. Two standing repository controls were added immediately after, recorded in section 1's Branch row | `docs/handback-pkg-truth-req-1.md`, PR #1, shipped `8fed30b`, closure addendum `bdc706c` |

---

## 3. Conditionally completed packages

Work that is shipped and gated but whose acceptance carries a stated condition.

| Package | Condition |
| --- | --- |
| PKG-LS2 | Accepted by Codex on the reported gates and live evidence. Its own commit `d2d2fb5` never built; the READY gate is satisfied by the later build that carries it |
| PKG-LS3 | Accepted by Codex on the reported gates and live evidence. Neither changed screen is verifiable end to end, because both are session gated and the only live channel is unauthenticated GET |
| Finding 11, availability re-affirmation | Register status is "Fixed and awaiting deployment verification". The fix is deployed; the verification that would close it needs an authenticated session |
| Findings 114 and 115 | Register status is "Fixed, verified on the deployment", 114 with the qualifier "to the limit the corpus allows". Neither is "Closed with live evidence" and neither should be reported as closed |
| Finding 203, the bilingual refusal architecture | Register status is "Fixed and awaiting deployment verification". All six slices are deployed and each was confirmed READY at its own `meta.githubCommitSha`. What is missing is not code and not a gate: every refusal in the finding is reached by a POST, and the only live channel here is GET only and unauthenticated, so no refusal sentence can be made to appear on the deployed build from this container. The evidence that closes it is one interactive session submitting an invalid enquiry, viewing request and requirement on the Arabic build and reading the rendered sentence |

---

## 4. Open product outcomes

Owner or counsel decisions. None of these is engineering-blocked; each blocks a surface.

| Ref | Question | What it holds shut |
| --- | --- | --- |
| O1 | Pricing visibility, labelled concept or hidden until real | The pricing page CTA truthfulness |
| O2 | SAT Markets and SAT Real Estate relationship statement | `/neutrality` |
| O4 | Production default locale | The `x-default` alternate target, finding 14 and finding 32 |
| O5 | Legal wording and counsel engagement | Terms, Privacy and Contact placeholders, finding 9 |
| O6 | Licensed market datasets for public display and AI retrieval | Broker overlays stay internal only |
| O7 | Requirements indexability and requester-data exposure | Consent and redaction rules on the demand side |
| O8 | Write canonical-law amendments back into the knowledge base | Law drift between the repository and the knowledge base |
| O9 | Origin of the repository gstack instruction | A documentation tidy only |
| **O10** | **External written confirmation of REGA Rental Index (Ejar) permitted use, unanimous across ten clauses: access, public display, attribution wording, transformations and derived figures, aggregation and minimum samples, export, API and machine-readable output, AI retrieval and response use, retention and correction, Arabic and English publication** | **Every derived Rent Index figure on every channel. `decidePublicQuote` withholds it from the browser, the API, metadata, structured data and the assistant. Nine clauses answered is unresolved. The decision fails closed until it is unanimous. Held as data in `src/lib/sources/o10.ts`** |
| O11 | Whether the public bulletin is the surface that lifts the site-wide noindex | Finishing ADV-4. Owner ruling 1 parks the indexing half |
| **O12** | **Notification consent basis for opportunity routing, affirmative opt-in or opt-out, per channel. Ruled held on the PKG-A11Y-1 commission: no automatic email, SMS, WhatsApp, push or other external match notification may be activated** | **Every external channel. Email, push, SMS and WhatsApp are disabled in code, not by convention. This is why registering interest in a requirement notifies nobody, which is finding 118, and why a match is something a lister finds rather than something SAT sends. The authenticated in-product opportunity or matches inbox may remain available where it respects organization permissions and exposes nothing confidential. The preference and consent model may be prepared; external delivery needs all ten preconditions recorded in the decision register, and acceptance of general platform terms is not consent to automated opportunity marketing** |
| O13 | The separate REGA analytics and consultation licence, distinct from FAL 1200025510 | The bulletin, HBU, investment scenarios, public market commentary, and PD4 deed checks |
| O14 | Who inside an organization may release contact details or bind the organization | Progressive disclosure and mutual-interest contact release |
| O15 | Attribution scope for the Rent Index, citation against navigation | Finding 45. A proposed rule is written and awaiting approval |
| O16 | Whether availability freshness keeps the reserved green, and what the label must state | Finding 46's follow-up. One colour currently carries two unrelated meanings on one card |
| **O17** | **The lawful basis, the retention position and the user disclosure for first-party behavioural measurement. Whether contract performance covers product measurement of an account the person asked for, what the raw retention window may be before aggregation, and what the person must be told and where. Ruled on the PKG-A11Y-1 commission: collection remains disabled, the catalogue and the architecture are authorized, production behavioural collection is not** | **Every one of the 46 events in `src/lib/analytics/events.ts`. `COLLECTION_AUTHORISED` is a module constant set to false, not an environment variable, so switching it on is a commit rather than a dashboard setting. Answering O17 would open 39 events and would still leave the notification family shut, because O12 holds that separately. The fourteen-item readiness record required before enablement is written at `docs/data-collection-readiness.md`. No analytics vendor may be installed and no data may be sent to one; ELITE-1 sessions use consented research notes and manual observation** |

---

## 5. Open findings by severity

214 findings recorded. 133 are closed. 81 are not. Counts read from
`docs/findings-register.md` at this commit by parsing the status column, not estimated, with
one deliberate correction to the parse: rank 113 begins "Closed in PKG-DEM1 for the reading,
open for the data" and is counted here as open, because half of it is. A naive read of the
first word returns 134 and 80 and is wrong by exactly that row.

PKG-NEXT16-SECURITY slice A added one, finding 214, and left it open. It is the 49 React
Compiler errors that the first ESLint run in this repository's history found, none of them
migration breakage and all of them older than this package. It is open rather than swept
because sweeping it would have buried a framework semantics diff in several hundred lines
of unrelated hook refactoring, and it is a finding rather than a silence because a lint
gate that is green because the rules were softened enforces nothing. It is held at its
current size by `scripts/eslint-gate.mjs` and assigned to PKG-REACT-1.

PKG-E1-READINESS slice F raised and closed nothing here, and that is the correct outcome
rather than a gap. Its brief was dependency vulnerabilities, a report-only Content Security
Policy, and an honest account of the rate limiting. What it found is recorded in
`docs/security-baseline.md` as a position rather than as register rows, because the two
things it could not fix are a framework major version and an owner purchase decision, and
neither is a defect in this application's own code. The one item that belongs to a future
count is the Next.js 14 to 16 upgrade, which was an owner authorization and is now
authorized and in flight as PKG-NEXT16-SECURITY rather than sitting as a finding.

PKG-E1-READINESS slice E raised and closed nothing either. It was asked for a measurement
and a set of budgets, and it produced both plus three changes the measurement justified.
The one thing worth carrying forward from it is recorded in `docs/performance-baseline.md`
rather than here: total blocking time did not improve, because deferring the Supabase
browser client moves the chunk after paint without removing it.

PKG-E1-READINESS slice D added four, findings 210 to 213, every one of them raised and closed
inside the slice, so the open count and the severity table below are unchanged by it. Two are
the defect the brief named, the login form's account-state enumeration and the English
refusal rendered into the Arabic build. The other two were found on the page a sign-in link
actually lands on, `/auth/callback`, which nobody had read since it was written: it was the
last monolingual English surface on the authenticated path, and it handed its own `next`
parameter to the browser as a location, which made a legitimate address on this origin into
an off-site redirect for anyone who could write a link. The second of those is the more
serious of the four and was not in the brief. It was found because slice D had to read the
recovery landing to translate it.

PKG-E1-READINESS slice C raised and closed nothing. Its brief asked for a test set and a
canonicalization matrix rather than for a defect hunt, and it is recorded in its commits,
`345f7a3` and `dca8b16`, rather than here. A slice that finds nothing is worth stating,
because a register that only ever grows starts to look like the only measure of work.

PKG-E1-READINESS slice B added two, findings 208 and 209, both raised and closed inside the
slice. The open count is therefore unchanged by slice B and the P2 total below is unchanged
with it. That is the honest shape of a slice that fixed what it was sent to fix and found one
more thing while it was there.

PKG-E1-READINESS slice A moved three of those. Finding 206, the two write routes that
reported success for a request they had not stored, is recorded and closed in the same
commit, which is the wrong order and is stated as such in the register: the defect was
known and written into the source as a comment for weeks without ever reaching this
count. Finding 207, the listings read that answers an empty list when it cannot reach the
store, was found while writing slice A's class guard and is left open on purpose, because
the surface that owns its fix is the public-discovery package that follows. Two rows
raised and one net closed is the same pattern as before and means the same thing.

The movement since PKG-ELITE-E1 is PKG-A11Y-1 and nothing else. P1 falls from 55 to 19,
which is 36 net, and the gross figure is larger: 47 rows carry "PKG-A11Y-1" in their
status. Thirteen findings were raised during the package, 193 to 205, and eight of those
were closed inside it. Thirteen new rows appearing while the open count falls by 32 is the
same pattern slice E showed and means the same thing: looking properly finds things, and
the count that matters is the one after both halves are recorded.

| Severity | Not closed | Ranks |
| --- | --- | --- |
| P0 | 6 | 4, 9, 10, 11, 12, 114 |
| P1 | 20 | 13, 14, 15, 16, 17, 19, 20, 21, 25, 29, 30, 31, 32, 45, 62, 117, 170, 193, 203, 214 |
| P2 | 55 | 37, 38, 39, 40, 41, 42, 43, 44, 47, 48, 49, 53, 63, 64, 74, 75, 80, 81, 92, 93, 94, 96, 97, 99, 102, 103, 113, 115, 116, 118, 138, 142, 144, 146, 151, 152, 163, 169, 172, 173, 175, 176, 177, 178, 183, 185, 186, 188, 189, 190, 191, 194, 195, 202, 207 |

**What the 20 open P1 rows are, because "20 open P1" reads worse than it is.** Sixteen of
them were open before PKG-A11Y-1 began and are not accessibility findings: 13, 14, 15 and
32 are metadata and syndication; 16, 17, 19, 25, 29, 30, 31 and 45 are language and content
quality; 20, 21 and 62 are claims and figure precision, two of them already blocked by an
owner decision; and 117 is the requirement-city data-quality defect, whose migration is
authored and awaiting the owner. Of the three that are accessibility rows, 170 is the
listing video's missing captions, which is a content and ingest commitment rather than a
markup change; 193 is a requirement poster's consent withdrawal, which needs a database
migration this environment cannot apply; and 203 is the server-composed English refusal
sentence, which is fixed in six shipped slices and is still counted open here because the
refusals it repairs are all reached by a POST and nothing in this environment can send one
to the deployment. See section 3. The twentieth, 214, is the lint debt raised above, which
is bounded, measured and ratcheted rather than merely noted.

**The 203 arithmetic, corrected rather than restated.** The line above used to read
"sixteen client sites rendering a server-composed English error sentence in both
languages". Sixteen was the route count, not the client count, and it had been carried
forward without measurement. Measured at `994f02e`: 127 refusals across 16 route files, 76
codes named, 15 client files rendering them. The slice D, E and F commit messages state 56,
73 and 80 codes; those were running additions and are wrong. Commit messages are immutable
and are left as written. This is the corrected figure, and it also stands in the register
row.

Rank 113 now reads "Closed in PKG-DEM1 for the reading, open for the data" and IS counted
above, under P2, unlike in the PKG-ELITE-E1 edition of this file where it was excluded by a
parse that treated its leading "Closed" as closure. Its data half still needs a write
channel to the database that this environment does not have. The count moved because the
rule was corrected, not because the finding changed.

Ranks 11, 114, 115 and 203 appear above because their status is "fixed" rather than
"closed"; see section 3.

**A correction made in RC15, recorded because a ledger that quietly restates a number is
worse than one that was wrong.** Six P1 rows, 50, 140, 150, 154, 166 and 179, read "Open"
or "Confirmed open, 3 of 155 fixed" in this file and in the register for eight slices after
`beef75a` closed them. The fixes were real and shipped; the register was not updated in the
same commit, which is the practice this file's own header requires. The rows now carry the
correction, the arithmetic that closes them and the evidence class, and the counts above
are computed from the corrected register.

### The three Codex named explicitly

**Finding 80, P2, open.** A lister's own figures have no recorded export or model-input
permission, so the Evidence Passport reports two of its three permissions as unrecorded
on every first-party figure. This is honest rather than broken: the passport is refusing
to claim a permission nobody granted. Closing it means deciding, at the point a lister
publishes, what they are granting SAT the right to do with their own numbers, which is an
owner and terms question before it is an engineering one.

**Finding 81, P2, open.** Five library modules are unreachable from every route root, and
three of them are held in the tree only by a test asserting that nothing imports them.
Dead code that a test keeps alive is worse than dead code, because the test reads as
coverage. Resolution is either to delete them with their test or to wire them to the
surface they were written for, and that decision needs a reading of what each was for.

**Finding 137, P2, CLOSED in PKG-ELITE-E1 slice C.** A first pin whose nearest district
disagreed with the listing's recorded `district_id` was a real disagreement nothing read.
`district_id` had been deliberately excluded from `FILLABLE_WHEN_ABSENT` in PKG-LS3 rather
than silently derived, because deriving a district from a pin is a substitution wearing an
addition's clothes; that was the safe half, and reading the disagreement was the missing
half. Closed by `src/lib/locationConsistency.ts`, a pure module read by four surfaces that
already existed. The evidence source, which Codex required be documented: SAT holds no
district boundary geometry, the deployed preview is the proof, and every location row
carries a point and a kind and no polygon, radius, bounding box or area. So the module has
five verdicts and no `verified` among them, and cannot grow one while the data is one point
per row. A later pin now offers a location and never takes one, `PATCH /api/listings/[id]`
refuses a contradicting pin with 409, and `launchGate.ts` blocks a contradicted or an
unchecked row from counting as production inventory. No dataset was purchased, licensed or
scraped, per Codex and owner ruling 7. Full record in `docs/findings-register.md` and in
the roadmap's slice C section.

**Finding 138, P2, open, raised in PKG-ELITE-E1 slice C.** Two dashboard selects asked
`districts_geo` for a `city` column while the public listings page has read the city from
`districts` and joined it since PKG-NM1. Both cannot be right, and which one is right is
UNPROVEN from this environment: every Supabase read here is permission denied and both
routes are session gated while `web_fetch_vercel_url` is GET only. Both selects were
repaired to the pattern that is correct under either answer. Recorded so the repair is not
mistaken for a proof.

**Its PKG-A11Y-1 disposition, which Codex required be stated at the head of the handback.**
It stays recorded and does not become a corrective prelude. It is P2; it concerns none of
the categories Codex named for escalation, being neither security, authorization, privacy,
an unsupported figure, misleading publication nor irreversible data corruption; and the
repair already applied is correct whichever answer the schema gives, so there is no
outcome that waiting changes. The full statement is at the head of
`docs/handback-pkg-a11y-1.md`.

---

## 6. Regressions

None recorded. This section exists so that a claim of regression has a place to be
written down before any completed package is reopened.

---

## 7. External owner dependencies

Everything here is outside the repository. None of it is a reason to stop engineering
work, per the governing directive and owner ruling 6.

| Dependency | State | What it costs while open |
| --- | --- | --- |
| **Arabic font workflow** | Delivered to the owner as a file, documented in `docs/owner-actions-adv-1c1.md`. Not installed. The deploy token has no `workflow` scope, so `.github/workflows/arabic-font.yml` cannot be pushed from here | Arabic font correctness is evidenced manually and by live check rather than by a gate on every push. Owner ruling 6 explicitly says this does not stop other work |
| **Migration `20260801_requirement_city_is_never_assumed.sql`** | Authored, checked in, NOT applied. `apply_migration` and `execute_sql` are permission denied from this environment. The full action card is section 4 of `docs/owner-actions-adv-1c1.md`: preflight, application, post-application verification, rollback, and the four artefacts that close the finding. Shorter instructions remain in `supabase/migrations/README.md` | Finding 117 stays open. The deployed `create_requirement` still writes `coalesce(nullif(payload->>'city',''), 'Riyadh')`, so any caller that is not the API route can still file a requirement in a city nobody stated. The HTTP path has been safe since PKG-DEM1, so nothing a visitor can do reaches the default; what is open is the direct-call path, because the function is SECURITY DEFINER and executable by `anon` |
| **Finding 193, consent withdrawal** | The owner question is answered. Ruling O18 arrived on 2026-08-02 and is recorded in the closed section of `docs/decision-register.md`: a new anonymous requirement gets a cryptographically strong one-time withdrawal token, shown once at confirmation and stored only as a hash; an already-posted requirement and any lost token are served by a manual privacy-request route once the approved privacy contact surface exists, which O5 still gates; an authenticated user in the mature organisation workflow withdraws from their own dashboard; and reference code paired with the recorded email is refused outright, in any form. Implementation does not begin until the product sequence is approved. The reconciliation gate that was to establish this work's position was rejected on 2026-08-02 and rebuilt, and Codex then directed that the rebuilt gate not be used to choose the next package: Codex and Saleem approve the sequence after the corrected matrix. So the finding stays open on sequencing rather than on an unanswered question, and the sequencing decision now sits with the advisor and the owner rather than with a document | A requirement poster still has no route to withdraw the consent that shares their contact details, and the already-posted rows are the half the ruling routes through O5 rather than through code. `beef75a` corrected the label so it no longer promises a withdrawal that does not exist, which is why 192 is closed and 193 is the remaining and larger half. The obligation exists whether or not the product offers a control |
| **RLS advisory, `public.map_anchors`** | 104 rows of public reference geography. RLS off. SQL written for the owner in `docs/owner-actions-adv-1c1.md`, deliberately not auto-applied | The exposure is public-by-design data, so the risk today is future columns rather than current rows. Enabling RLS without the SELECT policy in the same transaction would take location facts off every listing page, which is why this is owner-run |
| **RLS advisory, `public.spatial_ref_sys`** | 8500 rows. RLS off. Not to be modified blindly because the table may be PostGIS extension owned | Nothing user-facing. It is an advisory artefact of an extension, and acting on it without knowing the ownership risks breaking PostGIS |
| Advisory re-check | `Supabase.get_advisors` now answers permission denied, as do `execute_sql`, `apply_migration` and `list_tables` | The two advisories above cannot be re-read from here. They are carried forward from the last successful read rather than re-confirmed, and this file says so rather than presenting them as current |
| Design-partner recruitment | **Authorised 2026-08-02.** Owner side. The instrument is written and ready to run: criteria, screener, invitation, consent script, facilitator guide, accounts, task scripts, observation sheet, severity rubric, success calculation, interview questions and findings template, in English and Arabic. Six corrections required by Codex on 2026-08-02 are now applied across all three files, four from the first review and two from the rejection of `d34ebfa`. Physical mobile coverage is allocated before outreach rather than accepted by chance: three handset seats, M1 on D1 as iPhone Safari in Arabic and not substitutable, M2 on D5 as Android Chrome, M3 on S3, with a gate that the round does not close below 3 mobile sessions or without M1. Assistive-technology validation is stated as a separate required round, ELITE-1-AT, seat A1, public path only, and stage E1 is gated on it having run. What A1 validates is now stated exactly rather than implied: it validates whether four public surfaces can be operated with a screen reader, and it does not verify the 22 accessibility findings recorded in the private flows. Those 22 are fixed and awaiting independent verification, not known-broken, and the round that verifies them is a separate authenticated session, ELITE-1-AT-B, run against registration, the Listing Studio and the dashboard with a prepared test account after the ELITE-1 write-up. Until ELITE-1-AT-B has run and its results are recorded, no document may state that the 22 are closed. Raw notes retention is also now bounded by a date rather than by a condition: raw pseudonymous notes are destroyed no later than 90 days after the final session of the round, after which only synthesized findings are kept, carrying no participant identifier including seat labels; a finding still open on day 91 is carried by its synthesized form, and any duration other than 90 days is an owner or counsel decision recorded in `docs/decision-register.md` before the round runs. The recording policy is corrected: round one is notes only, no audio, video or screen capture, automatic transcription and AI notetakers switched off before every session, and no notes uploaded to any unapproved transcription service, which removes the contradiction of retaining a recording while claiming nothing personal was retained. Whether a later round may record, and on what seven data-protection terms, is now decision O19. **The authorisation to approach 10 people arrived on 2026-08-02 and recruitment is now running with the corrected kit.** Four conditions came with it and bind every session. Saleem holds the real contact list outside the repository, so no name, phone number or email of a prospective participant is committed, staged or written to any file here. Saleem controls the actual external messages; the kit supplies the wording and nothing in this repository sends anything. No automatic outreach of any kind is authorised, which forecloses generating an approach from an inferred interest as much as it forecloses a mail merge. No AI transcription and no recording is authorised, which keeps round one at notes only and leaves O19 the only route to changing that. ELITE-1-AT and ELITE-1-AT-B both remain required under the scopes recorded above; authorising recruitment did not fold them into the main round | The gate from E0 to E1. This is the binding constraint on the whole product, not any missing feature. It is no longer blocked on preparation and no longer blocked on authorisation either: what remains is scheduling and the sessions themselves. The 1 October 2026 re-ranking condition is discharged, because the authorisation arrived before it |
| **Next.js 14 to 16 upgrade** | Raised by PKG-E1-READINESS slice F. **Authorized by the owner on 2026-08-03, delivered as PKG-NEXT16-SECURITY, and landed on production `main` at `2bf652e` on 2026-08-04.** This row is kept rather than deleted because two of the things it gated are still open: participants have not yet received the link, and the Content Security Policy is still report-only rather than enforcing, for the reason in section 1c. What the migration did close is the version constraint itself, so nonces are now possible and are in fact being emitted, one per document, verified on eight production routes. The target was fixed and is not a choice between two majors: the Next.js version support policy places 16.x, released 2025-10-21, in Active LTS, 15.x in Maintenance LTS receiving only critical fixes and essential security updates, and 14.x and earlier at End of Life. `next@14.2.35` is the terminal 14.x release, so the 21 recorded advisories against it have no patch inside the major version. The reachability of each of the 21 was checked against this application's source and written out in `docs/security-baseline.md`: 11 provably do not reach it, 10 apply by version through the App Router and middleware request path | The row stays open until the migration is verified, because it also gates two other things. Participants receive the preview link only after the migration is verified, so this row is on the ELITE-1 path. And it holds the Content Security Policy's largest compromise in place: nonces cannot be introduced on 14.2.35 because GHSA-ffhc-5mcf-pf4q is cross-site scripting in App Router applications that use them, which is the recorded reason `script-src` carries `'unsafe-inline'` |
| **Vercel WAF rate-limit rule, scope now fixed, card prepared, not applied** | Raised by PKG-E1-READINESS slice F, **narrowed by the owner on 2026-08-03.** Preparation of one rule was authorized. Applying it was not, and the blanket `/api/*` scope this row originally recommended is explicitly withdrawn: a policy over every API path may not be applied without first measuring the request bursts the real client generates in ordinary use. PKG-NEXT16-SECURITY slice F therefore owed an inventory of unauthenticated state-changing and high-cost routes, a measured normal peak burst, and one cautious fixed-window recommendation that protects those routes without throttling ordinary listing browsing or corporate users behind a shared IP address. **All three were delivered on 2026-08-03 and the card is at the end of `docs/security-baseline.md`.** The inventory is ten anonymous-reachable routes out of 38. The burst was measured with `scripts/burst-probe.mjs` in two typing arms, and the covered set peaked at 5 requests per 60 s in both while `/api/places` alone went from 3 to 21, which is what ruled the blanket scope out. The recommendation is six OR-combined groups over `/api/advisor` by prefix, `/api/search`, `/api/signup`, `POST /api/requirements`, `/api/geocode` and `/api/geo/resolve`, keyed on IP, 60 per 60 s fixed window, published first with the action set to log so the owner reads a week of observation before promoting it to deny. Rollback is one command at each stage. **What remains is the owner's: run it, or decide not to.** Nothing in this repository applied any part of it | Every API route is protected only by the in-process limiter, which resets with each serverless instance. Slice F deliberately did not dress that up as protection. Nothing in this repository can create the rule and nothing here should: it is account configuration, and owner ruling 7 puts it on the owner's side. One caveat is recorded with it: the plan allows a single custom rule, the counters are per region, and WAF rate limiting is not a substitute for authorization, input validation or future per-route durable limits |
| **Upstash Redis store for `allowShared()`, declined for now** | Raised by PKG-E1-READINESS slice F as a recommendation. **The owner declined to authorize it on 2026-08-03, and this row is corrected rather than deleted so the reversal is visible.** No account, no environment variable, no processor and no route migration may be introduced. The decision is to be revisited after ELITE-1, or before broader public exposure, whichever comes first. The engineering position is unchanged and is recorded only as background: `src/lib/ratelimit.ts` already speaks the REST protocol and falls back cleanly, `limiterIsDurable()` returns false without `KV_REST_API_URL` and `KV_REST_API_TOKEN`, and the one route that calls `allowShared` therefore runs degraded today | Per-route durable limits stay unavailable and the 31 routes that import the limiter without using the shared path cannot be migrated. That is the accepted consequence, not an oversight. The reason the recommendation did not survive is the part worth keeping: a store is a new sub-processor holding client IP addresses in short-lived counter keys, which is a data-protection choice for the owner and not an engineering one, and free tier pricing does not make it a smaller decision |
| Saudi counsel memorandum | Not commissioned | O5, O13, and the FAL scope question surface by surface |
| REGA and Ejar permitted use | Not obtained | O10 |
| Enterprise AI agreement and processing terms | Not signed | External model processing stays off |
| Email or messaging provider | Not chosen | Saved-search email alerts, and any external notification once O12 is ruled |
| Additional OAuth providers | Not created | Microsoft, LinkedIn and Apple sign-in |
| Purchase budget shape | Undecided: a total, or a rate per square metre | The demand-side budget field's grammar |

Owner ruling 7 governs all of these: create the interfaces, the procurement requirements
and the decision records, but buy nothing, contact no vendor, sign nothing, and never
represent that a data right exists.

---

## 8. Packages superseded or renamed

| Original | Now |
| --- | --- |
| PD1 to PD5, the public data programme | Folded into ADV-4 and ADV-0 rather than run in parallel. PD5 is owner action only and carries no engineering task |
| Codex ten-item corrective package, item 10 | Superseded by PKG-ELITE-E1 |
| The competitive advantage strategy document | Converted through `docs/strategy-reconciliation.md`. Only the surviving items became ADV packages; the rest were classified as shipped, already answered more strictly here, or gated |
| Map Phase 2 | Deferred by standing agreement, not cancelled. It touches the core listings query and is a supervised pass |
| The visual-quality package | Parked by the owner: finish the Codex work first |
| `/compare` | Parked deliberately as a stub until post-launch |
| Off-market | Dormant scaffolding. The RLS recursion it caused is fixed |

---

## 9. Live-verification gaps

The single largest evidence debt on this product. Stated plainly because three
consecutive packages have now owed the same thing.

| Gap | Why it exists | What would retire it |
| --- | --- | --- |
| No authenticated live channel | The sandbox egress proxy blocks both the deployment and the database directly. The only working channel is `Vercel.web_fetch_vercel_url`, which is unauthenticated and GET only | A session-capable channel. One thing, and it retires most of this table |
| **PKG-TRUTH-REQ-1's own live-only checks: `npm run smoke`, `npx playwright test`, and one disposable `POST /api/requirements`** | Both scripts are written to run against the live deployment, not localhost. Confirmed again in this session with `curl -v` through the egress proxy: the gateway answers the CONNECT tunnel to `satmarkets-sat-markets.vercel.app:443` with `403 Forbidden`, the same class of denial as the long-standing `fonts.googleapis.com` block, not a timeout. `WebFetch` reached both language variants of `/notifications` read-only and confirmed the preview disclosure, the retitled channels panel and the absence of the removed controls, in this session; it cannot run a script, submit a POST, or read an exact JSON response body, so it does not retire this row. Codex accepted the package as closed on the read-only evidence obtained this way and ordered these two specifically deferred, not skipped, per `docs/handback-pkg-truth-req-1.md` section 6 and Codex's message of 2026-08-08 | A session with real egress to `vercel.app`, or an owner-side run. On success, confirm the response body carries no `notified` key and no `match` key, that `candidate_count` is the documented narrow count, and that the disposable requirement (synthetic contact data only, per O18 below) and any notification-ledger row it creates are deleted afterward. Record the result as a verification addendum to the same handback rather than reopening the package |
| Every session-gated screen | Listing Studio, the lister dashboard, inventory, requirement creation, matches, messages, admin. None can be exercised end to end from here | The same |
| Photo and media presence | `GET /api/listings` carries no media count, so photo checks read as missing because the channel cannot decide them, not because they were proved absent | A media count on the public endpoint, or a session channel |
| Database reads | `execute_sql`, `apply_migration` and `list_tables` are permission denied | Restored permission, or a read-only public route for each fact needed |
| Real physical device testing | No device in this environment. Zoom, reflow, screen reader and touch behaviour can be reasoned about and tested in code, not observed | A human on a real device. This is a stated limit of slice E, not a claim it will make |
| No accessibility automation in the repository | There is no axe, pa11y, jest-axe or Lighthouse step anywhere, and no accessibility npm script. `e2e/` holds two specs and neither is an accessibility spec | An automated harness, which slice E deliberately did not add because Codex item 7 forbids new tooling in this package |
| No reachable development server | `curl http://localhost:3000/en/login` returns status 000 in this container, so no surface can be operated locally either | A running server in the container, or the session channel above |
| **Every refusal sentence on the platform** | Finding 203. A refusal is what a route returns when it declines a write, and every write is a POST. The live channel is GET only, so the 127 refusals across 16 routes can be proved correct by reading the source and proved present by the test suite, and cannot be made to appear on the deployed build from here. Two of the routes take no session at all, `/api/viewings` and `/api/leads`, and even those cannot be exercised, because the channel will not POST | One interactive session on the deployed preview: submit an enquiry with a mistyped email, a viewing request for a time that has passed, and a requirement with a missing city, on the Arabic build, and read the sentence each one renders. That single session retires this row and closes finding 203 |
| No screen reader and no accessibility specialist | Neither exists in this environment | A human. Every one of the 126 slice E findings is source-read only and none is independently verified |
| Interactive browser Advisor verification | Codex item 7. Needs a browser session against the deployment | Owner-side browser run, or a session channel |
| `LocationPicker` visual fit at 320 to 430 pixels | Tailwind-classed component inside an inline-styled form, on a session-gated screen | The same session channel |
| **Every name, role, value and announcement fixed in PKG-A11Y-1** | 16 of the 39 accessibility findings are defects in what a screen reader says. A DOM assertion proves an attribute is present; only a screen reader proves what is spoken, and in Arabic only an Arabic screen reader proves it is spoken in Arabic | One session with NVDA or JAWS in English and one with a screen reader in Arabic, against the deployed preview. Until then the package's own record classifies these as fixed and awaiting independent verification, and claims no WCAG 2.2 AA conformance |
| **Touch target size, reading size and phone-width table semantics** | Findings 26, 27, 139 and 148. A CSS `min-height` is evidence that a rule exists, and a Chromium viewport with `hasTouch` is evidence that a media query matches. Neither is evidence that a thumb reaches a control on a real handset | A human with a phone. `scripts/touch-probe.mjs` and `scripts/radio-probe.mjs` measure the rendered box and say in their own output that they are browser emulated and not a device |
| **Production at a real viewport width, added 2026-08-04** | The promotion in section 1c verified production at the HTTP and document level only. `curl` to `vercel.app` returns 000 from this container, and `list_connected_browsers` returns nothing, so the deployed production build has never been rendered in a browser at 390 or 1280 px. What stands in its place is a local browser run at both widths against a tree that differs from the deployed one by a single test file, plus the responsive and reflow probes | Any browser that can reach the production alias. One pass over the eight public routes in both locales at both widths, which is minutes of work for anyone with a browser and impossible from here |
| **Two judgement calls that are not measurements** | Finding 165, whether the non-colour distinction between district bubbles and building pins is actually distinguishable, and finding 145, whether the non-colour step indicator reads as progress. Both are now non-colour distinctions in code; whether they communicate is a human question | An independent reviewer, or the ELITE-1 design-partner sessions once recruitment is authorised |

**The rule that follows from this table.** Where a thing cannot be verified live, the
package record says so in those words and does not substitute a local result for a live
one. A local pass is evidence that the code does what it says; it is not evidence that
the deployed product does.

**What slice D added to the GET-only channel, and what it did not.** An
unauthenticated GET to a route that exports no GET returns 405 with
`x-matched-path` set to that route's path, which proves the module is deployed and
that the method is genuinely not exported, and separates both from a 404. That is
how all 38 route files were covered without firing a write method at a live
deployment, and it is the strongest thing this channel can say about a write
route. It says nothing about what those handlers do when they are called, so the
refusal-sentence row above is unchanged and finding 203 is still open.

---

## 10. Environment and durability

| Item | Value |
| --- | --- |
| Repository clone | `/tmp/sm2`, inside an ephemeral container |
| Durability of `/home/claude` | Identical. Same filesystem `/dev/vda`. Relocating inside the container buys nothing |
| Persistent workspace available | Yes. `C:\Users\salee\Desktop\SAT Knowledge Base` on the owner's device, through the device bridge |
| Consequence | No completed multi-file slice may exist only in the container clone. See PKG-ELITE-E1 slice B |
| Deployment mechanism | `python3 tools/ship.py --branch <branch> --auto -m "message"`. `--branch` is required and has no default; `main` additionally requires `--allow-main`, and pushing from a differently named checkout additionally requires `--allow-cross-branch`. The em-dash guard rejects an em dash in a commit message. `npm run ship-test` covers the guards |
| Known local build limitation | `npm run build` fails locally on four `next/font` errors because Google Fonts is unreachable. A Vercel READY build is the production build evidence |

### The working practice, adopted in PKG-ELITE-E1 slice B

The container has been reclaimed mid-package before, and it took uncommitted work with
it. The practice below exists so that it can happen again without costing anything.

1. **Commit each coherent slice as it finishes.** A slice is coherent when its tests pass
   and its record is written. Not per file, not per edit.
2. **Push each of those commits.** A commit that exists only in the container clone is
   protected from an editor mistake, not from a reclamation.
3. **Keep the tree clean between slices.** `git status` at the start of a slice should
   show nothing. If it does not, the previous slice is not finished.
4. **No large multi-file uncommitted package.** If more than a handful of files are
   uncommitted at once, the slice was drawn too wide and should be split.
5. **No meaningless microcommits.** Reviewability is the reason commits exist. A commit
   whose message cannot state what changed and why is the wrong size in the other
   direction.
6. **Record the intended deployment commit before beginning the next package.** Written
   into section 1 of this file, so that a reclamation between packages loses nothing but
   time.
7. **Mirror a recovery bundle to the persistent workspace at each package close.** A
   `git bundle` of `main` plus this ledger goes to
   `C:\Users\salee\Desktop\SAT Knowledge Base\sat-markets\work\recovery\` on the owner's
   device, with a `RECOVERY.md` stating how to restore from it. GitHub stays the
   authoritative remote; the bundle is a second copy held somewhere a container cannot
   reclaim.

   **Blocked since slice C.** The device bridge is absent from this session: the
   `remote-devices` tools do not resolve at all, so the persistent workspace cannot be
   written to and the bundle has not been refreshed since slice B. This is recorded rather
   than worked around. Nothing is at risk, because every slice since is committed and
   pushed to GitHub, which this practice names as the authoritative remote and the bundle
   only duplicates. The refresh happens at the first package close where the bridge is
   present.

**Intended deployment commit for the next package:** unchanged practice. Each slice ships on
its own commit to `main` and deploys to production on its own Vercel build. There is no
long-lived branch and no accumulated package commit. PKG-A11Y-1 ran eighteen slices this
way, A through R, and the container was not reclaimed during it; the practice is what made
that unremarkable rather than lucky.
