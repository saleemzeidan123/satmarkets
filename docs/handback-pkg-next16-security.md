# Handback, PKG-NEXT16-SECURITY

Package: PKG-NEXT16-SECURITY, six slices, A through F.
Commissioned: 2026-08-03, as the single named exception to the instruction that no further
foundation package should begin before the first ELITE-1 observations.
Closed: 2026-08-03.
Head at handback: `b7031aa` on branch `next16-security`.
Branch preview verified: `dpl_BAkfqFypjGsQMBTtt2KTE9DPhViG`, READY, alias
`satmarkets-git-next16-security-sat-markets.vercel.app`, `meta.githubCommitSha`
`b7031aa8045eaa66847e3ff45e8eed626a802684`, bundler turbopack, region `iad1`.

The brief said to continue through the internal migration slices without pausing. That is
what happened, and this is the consolidated return. Every slice shipped on its own commit
and reached a READY deployment before the next began, with one exception that is recorded
in section 10 rather than left to be discovered.

**Read section 10 first if you read nothing else.** The production alias is serving
`2cfbcdc`, which is slice B. Slices C through F are on the branch and are not live. Six
commits separate them.

---

## 1. What the package was asked to do, and what it did

| Slice | Asked | Outcome |
| --- | --- | --- |
| A | Migrate Next.js 14.2.35 to the current stable Next.js 16 Active LTS release with React, React DOM and their types, using the official codemods as an inspected starting point rather than as output to be trusted | Done. 16.2.12 and React 19.2.8. The codemod output was committed raw and alone, then corrected in a second commit, so the review of it is visible in the history. Four `UnsafeUnwrapped` escape hatches removed rather than carried. `next lint` replaced by ESLint 9.39.5 behind a ratchet. Finding 214 raised and left open on purpose |
| B | Re-run the dependency audit and close what the supported framework closes, with an applicability analysis and a time-bound exception for anything that remains, without claiming completion from `npm audit` alone | Done. Four advisories against copies of postcss and sharp that the framework nests inside itself, all four reporting the same six-major downgrade as their fix. A flat `overrides` floor takes the audit to zero at every severity on a lockfile diff of 0 insertions and 529 deletions. The exception is dated |
| C | Self-host the pinned RTL map-text plugin with its licence notice, remove `unpkg.com` from `script-src` and `connect-src`, weigh nonce-based strict CSP against hash and subresource-integrity alternatives, and measure what forcing dynamic rendering would cost | Done. The plugin is vendored and its bytes verified from publisher to edge. The nonce is in. The measurement is that nothing was forced dynamic, and the one page that pays is `/[locale]/proto`. Still report only |
| D | Regression coverage across authentication, public server component reads, listings canonicalization, metadata, Arabic rendering, the manifest and every API route method, from 320 through 1920 px | Done. Six assertions over 121 modules under `src/app` as the part that lasts, and a live sweep of all 38 route files filed with the deployment named beside it as the part that does not |
| E | Re-run the same forty-cell probe and report matched before and after results without automatically replacing the budgets | Done. Three runs in one container in one session, which separated the bundler from the framework. Budgets untouched. The consequence is a red gate that no code change here can turn green, and that is stated rather than hidden |
| F | Prepare, and do not apply, one Vercel WAF owner-action card | Done. The measurement changed the rule. Nothing was applied and no rule exists on the project |

---

## 2. The commits

Thirteen commits. Slice A took five, because the codemod review and a build error only the
deployment could see are separate claims and were kept separate.

| Commit | Slice | Scope | Files | Lines |
| --- | --- | --- | --- | --- |
| `84a2e9c` | A | Dependency upgrade only, before any codemod | 2 | +589 / -167 |
| `dca9472` | A | Raw output of the official `next-async-request-api` codemod, unreviewed, committed alone | 82 | +279 / -161 |
| `72fe6fc` | A | The reviewed corrections to that output, no deprecated unwrap left standing | 74 | +141 / -115 |
| `4d61024` | A | `ship.py` could not push a branch the remote had never seen | 1 | +29 / -8 |
| `79ab0c3` | A | The build error the sandbox could not see, plus the lint workflow Next 16 removed | 15 | +5583 / -568 |
| `f115c12` | A | The slice A record, its Turbopack fallback and the lint debt as a counted finding | 6 | +313 / -12 |
| `2cfbcdc` | B | Force the framework's nested postcss and sharp to the patched root copies | 2 | +4 / -530 |
| `0c42e42` | B | The slice B security record, and the ledger correction for the commit that went to `main` | 2 | +279 / -8 |
| `8bf173c` | C | Self-host the RTL text plugin and add a per-request nonce | 14 | +700 / -63 |
| `5464a46` | C | Record the slice C CSP decision against live evidence | 4 | +322 / -11 |
| `73c630a` | D | A regression gate on the async request API surface, and the slice D evidence record | 5 | +552 / -12 |
| `bdd9a7b` | E | The matched Next 16 re-measurement, framework and bundler separated | 2 | +264 / -1 |
| `b7031aa` | F | One measured WAF rate limit rule, prepared and not applied | 4 | +608 / -2 |

The 5583 lines in `79ab0c3` are mostly the ESLint dependency's arrival in the lockfile.

---

## 3. Slice A, the framework migration

The target was not a choice between two majors. The Next.js version support policy places
16.x in Active LTS, 15.x in Maintenance LTS receiving only critical fixes, and 14.x at End
of Life. `next@14.2.35` is the terminal 14.x release, so the 21 advisories recorded against
it have no patch inside the major version at all.

The codemod was treated as a draft. Its raw output is `dca9472` and the review of it is
`72fe6fc`, in that order, so anyone can read what the tool did and what a person disagreed
with. The four `UnsafeUnwrapped` escape hatches it left behind were removed rather than
carried, because an escape hatch that ships is a migration that did not finish.

Two things could not be seen from this sandbox and were found by the deployment instead.
`npm run build` cannot run here: the egress proxy blocks Google Fonts and the four
`next/font/google` declarations in the root layout fail without it. So Turbopack's
rejection of `next/dynamic` with `ssr: false` in a Server Component was invisible to every
local gate, and was fixed in `79ab0c3` by moving the deferral into a client boundary.
`dpl_HPTLrtfd69E7JHpKgUcWiMDnduWQ` at `79ab0c3` is the first successful Next.js 16 build of
this application.

`next lint` is gone in 16. The lint script it left behind had never run. ESLint 9.39.5 with
`eslint-config-next` replaces it, ten trivially safe findings were fixed, and the remaining
49 are pinned by `scripts/eslint-gate.mjs`, a ratchet that can only go down. Those 49 are
finding 214 and they are open on purpose: they are React Compiler errors, none of them
migration breakage, all of them older than this package, and sweeping them would have
buried a framework semantics diff under several hundred lines of unrelated hook
refactoring. They are assigned to PKG-REACT-1.

`middleware.ts` was deliberately not renamed to `proxy.ts`. The reason is written into the
file it governs and the deferral is time-bounded.

The record is `docs/next16-migration.md`, including the Turbopack and Webpack assessment
and the conditions that would trigger `next build --webpack`.

## 4. Slice B, the dependency audit

`npm audit` after the upgrade reported 3 high entries covering 4 advisories: three postcss
and one sharp, all under `node_modules/next`, all with the same `fixAvailable: next@9.3.3`.
That is a six-major downgrade, which is the audit saying it cannot fix this in the only
vocabulary it has.

Both packages nest for a declared reason. `next` pins `"postcss": "8.4.31"` exactly, and
its `"sharp": "^0.34.5"` optional dependency carries a caret on a 0.x version, which by
semver cannot reach 0.35. Neither is reachable by upgrading `next`.

The remedy is a flat `overrides` floor at `postcss: ^8.5.25` and `sharp: ^0.35.3`,
deliberately flat rather than scoped under `next`, because the useful statement is not
"patch this one edge" but "no package in this tree may resolve below these versions". The
audit goes to zero at every severity, and the lockfile diff is 0 insertions and 529
deletions, which is the shape of a deduplication rather than an addition.

Forcing sharp past the framework's declared range needed more than an assertion, so the
sharp API surface the application actually uses was replayed against 0.35.3 before the
override was accepted. The record carries that replay, the applicability analysis for each
of the four advisories, the residual uncertainty that could not be proved, and what
`npm audit` structurally cannot see. It is the new first section of
`docs/security-baseline.md`.

**The exception is dated.** An undated override becomes wrong quietly. This one is reviewed
at whichever comes first, the next Next.js upgrade of any size or **2026-11-03**, and the
review asks whether the root versions now win without it and whether the sharp replay still
passes against whatever the framework then declares.

## 5. Slice C, the Content Security Policy

The right to left map text plugin was loaded from a third party CDN, which meant that
origin was named in both `script-src` and `connect-src` and was permitted to put executable
code into the page. It could not be pinned: `setRTLTextPlugin` loads through
`importScripts` inside a worker, so there is no element to carry an integrity attribute and
Subresource Integrity is not available for that load at all.

It is now at `public/vendor/mapbox-gl-rtl-text-0.2.3/`, taken from the npm registry tarball
with the publisher integrity hash checked before extraction, its BSD-2-Clause notice beside
it, and the resulting sha256 pinned in `src/lib/rtlTextPlugin.test.ts`. The deployment
serves exactly those 206,897 bytes and the hash matches, so the chain from publisher to
edge is closed. The CDN origin appears in no header and no body, and two tests at opposite
ends stop it returning.

The policy also acquired a per request nonce. `script-src` carried `'unsafe-inline'` on the
recorded grounds that a nonce would trade a known weakness for CVE-2026-44581. That
advisory is patched in 16.2.5 and this tree runs 16.2.12, so the justification had expired
and was retired rather than inherited. Hashes and Subresource Integrity were both closed on
structure and not on preference: hashes cannot cover the App Router's per request inline
flight data, and `experimental.sri`, which does exist in 16.2.12, covers `<script src>`
elements only.

**The measurement the work order asked for.** The instruction was not to force every public
page into dynamic rendering without measuring the cost. The build route tables at `2cfbcdc`
and at `8bf173c` are identical entry for entry. Nothing was forced dynamic, because the
nonce reaches the renderer through the request headers and no component has to call
`headers()`. The measured cost is one page: `/[locale]/proto` declares `force-static`, so
its prerendered HTML carries no nonce. That was fetched from the preview to confirm rather
than assumed. Under report only it is a console listing; under enforcement it would not
hydrate.

**A correction the live check produced.** The comments written during the slice predicted
that both the build time header and the middleware header would arrive on a matched route
and that the browser would evaluate both. The deployment returns exactly one policy per
response: middleware's `res.headers.set()` replaces the config value where middleware runs,
and the config value stands alone where it does not. Both comments were corrected in
`5464a46` and `set` is now documented as load bearing.

**The policy is still report only, and turning it on is section 11.**

## 6. Slice D, the regression gate

Two halves, and they are different kinds of claim, so they are filed differently.

The half that lasts is `src/lib/next16Surface.test.ts`: six assertions over 121 modules
under `src/app` and 246 shipped modules overall. Every `params` and `searchParams`
annotation begins with `Promise<`. All 108 reads are paired with `await` in a Server
Component or `use()` in a Client Component, 101 and 7, with floors asserted on both so
neither half can quietly stop matching. All six `cookies()` and `headers()` calls are
awaited. No shipped module mentions `UnsafeUnwrapped`. All 38 route files match a written
down method inventory totalling 14 GET, 26 POST, 5 PATCH and 3 DELETE. Exactly one of
`middleware.ts` and `proxy.ts` exists.

The half that does not last is the live sweep, taken against
`dpl_9gSpSvRa2w4427bv1Na8jhwr3G4p` at `5464a46` and filed with that deployment named beside
it. All 38 route files were requested. 24 returned 405 with a matching `x-matched-path`,
which proves the module is deployed and GET genuinely not exported without firing a write
method at a live deployment. 11 returned real bodies, and one each returned 400, 401 and
404 in the application's own words. Page surfaces covered authentication in both languages,
public server component reads, listings canonicalization against the four defects
`src/lib/search/canonical.ts` names, metadata with `hreflang` and Open Graph, Arabic
rendering at `lang="ar" dir="rtl"`, and the manifest.

Section 11.6 of `docs/next16-migration.md` states what it does not prove: no hydration, no
console, and no write method exercised.

**A recorded limitation retired here.** `/manifest.webmanifest`, `/api/viewings` and
`/api/admin/accounts/provision` were written down in earlier sessions as unfetchable
through the Vercel fetch tool. They are not. "Unable to create shareable URL" is transient:
seven paths failed that way during this slice and every one succeeded on retry. Retry three
times before writing down a limitation.

## 7. Slice E, the matched re-measurement

No application file moved. The forty cell probe ran three times in one container in one
session, at `1a99107` with webpack, at `73c630a` with webpack, and at `73c630a` with
Turbopack, because `next build --webpack` still exists in 16.2.12. That retires the
conflation caveat `docs/next16-migration.md` recorded: the bundler and the framework are
separable and were separated.

The pre-migration tree rebuilt in this container came back one kilobyte over one budget,
which is what licenses reading the after run's overages as the change rather than as a
slower machine.

JavaScript over the wire rose on all forty cells, 39 to 45 kB, median 43, of which roughly
three quarters is framework and one quarter is Turbopack chunking. Total transfer rose on
all forty by about the same. Blocking time is the framework's cost, a median 153 ms added
on mobile with the bundler adding nothing. Mobile paint is the bundler's cost, a median
182 ms with the framework adding 26. Desktop paint medians did not move, but desktop cells
above 400 ms went from two to between six and eight across four independent Next 16 sweeps,
each affected cell reading either about 250 ms or about 550 ms with nothing between and the
membership not stable between sweeps. That is recorded as a bimodal paint that Next 16
enters more often, not as a per cell regression, because the evidence does not support the
stronger claim. Fonts did not move.

**The one apparent stability regression was the instrument.** `desktop:en:home` read 0.091
on both Next 16 arms, consistently, and nearly went into the record as the slice's one real
defect. In Next 16 `next/font/local` names the emitted family after the JavaScript binding,
with no hash, so the sandbox font swap's `const serif` emitted
`@font-face { font-family: "serif" }` and collided with the CSS generic keyword. Sixteen
faces registered instead of seventeen, the size adjusted fallback did not hold, and the
heading rewrapped about 335 ms in. Renaming the four bindings and rebuilding both Next 16
arms took it to 0.000. The committed application uses `next/font/google`, which takes its
family from the CSS Google returns, so it does not have the collision, and that was checked
rather than assumed.

**The budgets were not rewritten**, per the work order. The standing consequence is in
section 11.

## 8. Slice F, the WAF card

The recommendation this slice inherited was one fixed window rule keyed on IP across
`/api/*`. The owner withdrew that scope on 2026-08-03 and required a measurement before any
scope could be applied. The measurement ruled the inherited scope out.

`scripts/burst-probe.mjs` drives the real production build with a real browser through four
sessions and records every request with a millisecond timestamp. It runs twice over the
same script, at 140 ms between keystrokes and at 320 ms, because both public typeaheads
debounce at 220 ms and that threshold decides whether a word costs one request or eight.
The fast arm sent 8 requests to `/api`. The deliberate arm sent 26. Same person, same
actions, three times the traffic, decided by typing speed. Twenty one of the deliberate
arm's twenty six were one route, `/api/places`, the browsing typeahead. So a limit low
enough to protect the routes that spend money is low enough to throttle a person typing a
district name, and there is no number that serves both.

Split by whether the route would be covered, the answer falls out. The covered set peaked
at 5 requests per 60 s in both arms, identically, and did not move with typing speed at
all. Excluding one route removes the conflict.

The inventory: of 38 route files, 28 call `getSession` before acting and two sit behind
`CRON_SECRET`, leaving ten an anonymous request can reach. Two facts came out of building
it. `/api/saved` has no limiter of any kind. And exactly one route in the application uses
the durable `allowShared`; the other 31 importers call the per instance `allow`, which on
serverless hands each cold start a fresh quota.

The card is six OR-combined groups over `/api/advisor` by prefix, `/api/search`,
`/api/signup`, `/api/requirements` with the method pinned to POST, `/api/geocode` and
`/api/geo/resolve`. Keyed on IP alone, 60 requests per 60 seconds, fixed window. Sixty is
twelve times the measured peak, which reads as twelve colleagues behind one office address
each simultaneously at personal peak. JA4 was available as a second key and was rejected:
an attacker varies a TLS fingerprint far more easily than colleagues vary browsers.

**Nothing was applied.** No rule exists on the project. `vercel firewall rules add` stages a
draft and drafts do not reach production traffic until `vercel firewall publish`, which is
what makes the card safe to paste. The first action in it is `log`, not `deny`, because the
measurement was taken in a sandbox against a database with no listings by one scripted
reader, and that is the best evidence obtainable from here rather than production evidence.
Rollback is one command at each stage.

The card declines to assert the status code the mitigation returns, because the CLI
documentation does not state it and a second search did not settle it. It tells the owner
to read it off the first observation.

The full section is at the end of `docs/security-baseline.md`.

---

## 9. Gates

All six local gates and all four Playwright probes are green at `b7031aa`.

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npm test` | 1758 tests, 0 failing |
| `npm run ar-lint` | clean |
| `node scripts/prose-scan.mjs` | clean within its stated scope |
| `npm run lint-gate` | ratchet held, 49 pinned errors, no new rule |
| `scripts/reflow-probe.mjs` | PASS, 14 viewport renders, EN and AR, 320x256 through 1280x1024 |
| `scripts/radio-probe.mjs` | PASS, 5 groups, EN and AR, coarse pointer at 390 wide |
| `scripts/shell-probe.mjs` | PASS, 36 measurements |
| `scripts/responsive-probe.mjs` | PASS, 234 measurements |

`node scripts/perf-probe.mjs` is the exception and it is deliberate. See section 11.

Every commit in the package reached a READY deployment at its own SHA, verified by reading
`meta.githubCommitSha` rather than `readyState` alone. One deployment in the package failed:
`dpl_4SqAXQ14dAnGTduKDBSgFFwpTTtB` at `4d61024`, before the Turbopack build error in slice A
was found and fixed.

## 10. The one deviation, and what it means for you today

The slice B ship was run without `--branch`. `tools/ship.py` declares
`ap.add_argument("--branch", default="main")`, so it pushed the local `next16-security` HEAD
to `refs/heads/main`. `main` was still at `1a99107`, an ancestor, so the push was a clean
fast-forward rather than a rejected one, and it carried five commits at once. Vercel built
`main` as production. **The framework migration went live before slices C through F had
run.**

It was not reverted. The site is pre-launch, site-wide `noindex, nofollow`, sample data,
launch stage E0, no real users, and owner ruling 1 parks indexing. All six local gates were
green on the commit and the preview at `f115c12` had already been verified. Against that, a
revert across five commits of a framework migration including a codemod-derived async
request API change is a larger and less reviewable operation than the thing it would undo.
The full reasoning is section 1b of `docs/status-ledger.md`.

Every ship after that passed `--branch next16-security` explicitly. The consequence for you
is this:

| Reference | Commit | What it carries |
| --- | --- | --- |
| `origin/main`, production alias | `2cfbcdc` | Slices A and B. Next 16.2.12, the dependency floor |
| `origin/next16-security` | `b7031aa` | All six slices |

Six commits separate them: `0c42e42`, `8bf173c`, `5464a46`, `73c630a`, `bdd9a7b`,
`b7031aa`. Five of those six are documentation. The one that changes rendered output is
`8bf173c`, the self-hosted plugin and the nonce, and it has been live on the branch preview
since it shipped and verified against the deployment. **Merging the branch into `main` is
your decision and was not taken here**, because production main is not a place to put an
unrequested merge at the close of a package.

The `--branch` default in `tools/ship.py` was not changed either. It is the obvious fix and
it is a change to the shipping tool at the moment of shipping, which is the worst time to
make one. It is recorded as a follow-up.

## 11. What is now waiting on you

Five decisions, none of them doable from this repository.

**The WAF rule.** Prepared and not applied, at the end of `docs/security-baseline.md`. Run
it, or decide not to. The first command stages a draft and changes nothing.

**CSP enforcement.** The policy is report only and the last thing standing between it and
enforcement is a live browser console pass in both languages, which needs a browser this
environment does not have. The one known blocker it will find is `/[locale]/proto`, which
declares `force-static` and therefore has no nonce in its prerendered HTML. It is an
internal noindexed design system reference. Either it stops being `force-static` or it is
excluded, and that is a small decision that has to be taken before the switch.

**The performance budgets.** `--write-budgets` was not passed, per the work order. So
`node scripts/perf-probe.mjs` exits 1 against the committed budgets with 99 overages: 40 on
JavaScript bytes, 32 on total bytes, 15 on blocking, 12 on paint, none on stability. The
webpack arm reports 102 by the same measure, so the failure is the framework and not the
bundler choice. Re-baselining accepts about 43 kB of extra JavaScript per page as the new
normal in exchange for a supported framework, which is the trade that was already made when
the migration was authorized. Leaving the budgets alone keeps a red gate standing that no
code change in this repository can turn green. Either is defensible. An unrecorded choice is
not, because an unexplained failing gate gets ignored and then deleted.

**Upstash.** Declined on 2026-08-03 and not revisited here. Until it exists, 31 route files
run on a per instance limiter that resets with each serverless instance, and the WAF rule
does not change that.

**The merge to `main`.** Section 10.

Two dated items are also now on the calendar. The `overrides` exception is reviewed at the
next Next.js upgrade or **2026-11-03**, whichever comes first. The `middleware.ts` to
`proxy.ts` rename is deferred with its own bound, recorded in the file it governs.

## 12. Exclusions honoured

No service was bought, no vendor contacted, no agreement signed, no account created and no
environment variable set. Owner ruling 7 was not approached. No participant contact detail
was written anywhere in this repository. The push credential was never typed into a
transcript: it was read from the file on disk and handed to git through a temporary askpass
helper, never in a URL, an argument or a config value, and its value was never printed.

## 13. Findings movement

One finding raised, finding 214, open on purpose, assigned to PKG-REACT-1. Nothing closed.
That is the honest count for a package whose subject was a framework version, a dependency
tree, a policy header, a test surface, a measurement and a card: five of the six produce
positions rather than register rows, and the sixth is a lint debt that predates all of it.

## 14. The next package

Unchanged. The public-discovery redesign remains next, and no other general foundation
package may be inserted after this one. Participants receive the preview link only after
this migration is verified, and the verification that remains outside this repository is the
live browser console pass named in section 11.
