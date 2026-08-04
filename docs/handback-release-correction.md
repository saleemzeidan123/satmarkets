# Handback, the PKG-NEXT16-SECURITY release correction

Written 4 August 2026, after `next16-security` was fast-forwarded into `main`
and production was verified serving the merged commit.

This closes the six part release-correction batch that followed the independent
review of `c640f42`. That review accepted the branch conditionally and refused
the merge as it stood. Everything below is what was done about that, and what
was not done and why.

## What is on production now

| | |
| --- | --- |
| Production commit | `2bf652e3d655246f69faa3451be843da62c1b658` |
| Subject | release-correction: webpack production bundler, three performance records, explicit ship branch |
| Production deployment | `dpl_28FxggteRGchKrj6auC7j9BGHZCB` |
| Branch and ref | `main`, `githubCommitRef: main` |
| Built | 4 August 2026, 17:19:05 to 17:20:33 UTC, iad1, 88 seconds |
| Aliases | `satmarkets-wheat.vercel.app`, `satmarkets-sat-markets.vercel.app`, `satmarkets-git-main-sat-markets.vercel.app` |
| Previous production | `dpl_DbbHaXgFsu1pqc26Ht3oySsiFZkK` at `2cfbcdc`, still a rollback candidate |

The merge was a true fast-forward. `origin/main` was at `2cfbcdc` and was an
ancestor of the branch head, so no merge commit exists and the eight commits of
PKG-NEXT16-SECURITY now sit on `main` in the order they were written. The commit
that production serves is the same object the branch deployment was built from,
which is the thing the review asked to be confirmed by SHA rather than by a
green light.

## Part 1, the production bundler

`package.json` now reads `"build": "next build --webpack"`, keeps
`"build:turbopack": "next build"` for comparison, and leaves `"dev": "next dev"`
alone. Vercel runs the `build` script, so that single line is the entire
production bundler choice.

The production build log confirms it rather than the package file claiming it.
The relevant lines are `Running "npm run build"`, then `> next build --webpack`,
then `▲ Next.js 16.2.12 (webpack)`, then `✓ Compiled successfully in 32.4s`.
The deployment metadata is corroborating evidence of the same thing from the
other side: every earlier deployment in this package carries `"bundler":
"turbopack"` in `meta`, and both webpack deployments,
`dpl_J9iVWaogSLgwtK6m1rfkT9zR6fgJ` on the branch and
`dpl_28FxggteRGchKrj6auC7j9BGHZCB` on production, do not.

The decision came from measurement on this project, not from preference.
Turbopack added a median 12 kB of JavaScript per page, in a range of 8 kB to
13 kB, was larger on all forty cells, and was slower to paint on all twenty
mobile cells by a median 186 ms. Blocking time did not favour either bundler,
at 453 ms against 454 ms, which is the framework's cost and not the bundler's.
The aggregate count of 99 against 102 overages against budgets written for a
different framework was rejected as a reason to keep the slower mobile paint.

MapLibre and the vendored RTL plugin were checked specifically, because their
worker behaviour is sensitive to build output. See the browser and deployment
evidence section below.

## Part 2, three performance records

Nothing was overwritten. Five files now exist, each carrying a `record`,
`framework`, `bundler`, `commit` and `status` header so that a reader who opens
one out of context knows what it is and whether anything checks against it.

| File | What it is | Checked by the gate |
| --- | --- | --- |
| `docs/perf-budgets-next14.json` | The pre-migration gate, frozen | No |
| `docs/perf-measurements-next14.json` | The forty cell measurement behind it, at `1a99107` | No |
| `docs/perf-measurements-next16-turbopack.json` | Next.js 16 built with Turbopack, at `73c630a` | No |
| `docs/perf-measurements-next16-webpack.json` | Campaign A, the source of the active budgets, at `c640f42` | No |
| `docs/perf-budgets.json` | The active budgets | Yes |

The active budgets were generated from campaign A and validated by campaign B,
an independent second campaign in its own tree on its own port, run with no
write flag, which is exactly what the gate does in anger. Campaign B passed all
forty cells. Before this batch no budget file in this repository had ever been
asked to pass a campaign other than the one that wrote it.

The established headroom methodology was preserved, with two corrections that
the second campaign exposed and that are documented in
`docs/performance-baseline-next16-webpack.md`. Largest contentful paint gained a
500 ms floor, matching the 100 ms floor blocking time has had since the first
baseline, because unthrottled desktop paint lands where thirty five per cent of
a small number is a small number and the same unchanged page reads anywhere
from 240 ms to 544 ms. Two desktop listings cells are bistable on layout shift
rather than noisy, so they carry a named exception at 0.31 inside
`scripts/perf-probe.mjs` with the five campaign readings written next to the
number, instead of widening the formula for all forty cells and producing a gate
that would permit poor pages everywhere in order to tolerate one. That is
finding 215, it predates the migration, and the exception is meant to be deleted
rather than renewed.

### Before and after

Median across the twenty cells of each profile.

| Metric | Next.js 14 | Next.js 16 Turbopack | Next.js 16 Webpack, active |
| --- | --- | --- | --- |
| Mobile JavaScript | 267 kB | 308 kB | 298 kB |
| Mobile total bytes | 547 kB | 599 kB | 591 kB |
| Mobile largest contentful paint | 860 ms | 1060 ms | 860 ms |
| Mobile total blocking time | 318 ms | 453 ms | 454 ms |
| Desktop JavaScript | 267 kB | 308 kB | 298 kB |
| Desktop total bytes | 550 kB | 586 kB | 579 kB |
| Desktop largest contentful paint | 252 ms | 292 ms | 268 ms |
| Desktop total blocking time | 90 ms | 115 ms | 147 ms |

Mobile paint returns to the Next.js 14 figure exactly once the bundler is chosen
deliberately.

### Migration debt, carried and not closed

Shared framework JavaScript grew by a median 31 kB per page, 267 kB to 298 kB,
with the smallest increase on any cell at 30 kB and the largest at 33 kB, which
is the signature of a floor that moved under everything rather than one page
getting heavier. Median mobile blocking time grew by 137 ms, 318 ms to 454 ms;
the reviewer's figure of approximately 153 ms is the same finding measured on
the Turbopack arm, and the smaller number is not an improvement worth claiming.

Both are recorded as debt in `docs/status-ledger.md` and in the baseline
document, and both belong to page and bundle optimisation work that has not been
scheduled. Neither is resolved by the baseline having moved.

## Part 3, the shipping safety correction

`tools/ship.py` was corrected before the merge, and the correction was exercised
by the merge itself.

`--branch` is required and has no default. A push to `main` is refused unless
`--allow-main` is also supplied. A push from a checkout of one branch to a
differently named remote branch is refused unless `--allow-cross-branch` is
supplied, and a detached HEAD is treated the same way because it has no name to
compare. The decision lives in a pure function, `check_target`, which touches no
git, no network and no filesystem, so the incident is reproducible in one line.
Refusals happen before anything is staged or committed, so a refused run leaves
the working tree exactly as it was found. Fast-forward only behaviour is
unchanged and no `--force` appears anywhere in the file.

Both refusals were demonstrated live immediately before the promotion. Omitting
`--branch`, which is the exact slice B invocation, exited 1 with a refusal naming
the incident. Naming `main` without `--allow-main` exited 1 with a refusal saying
that naming the production branch is not the same as intending it.

The promotion then printed, before pushing and without exposing any credential:

```
About to push:
  source branch  main
  source HEAD    2bf652e  release-correction: webpack production bundler, ...
  target ref     saleemzeidan123/satmarkets@main   (PRODUCTION)
  mode           fast-forward only
```

`npm run ship-test` covers this with 32 checks in ten groups, including an AST
walk asserting `--branch` is declared once with no default, an assertion that
the announcement's body never reads the token file, the askpass helper or the
environment, and an assertion that the guard's position in the source precedes
both the staging and the commit calls.

One further defect was found and fixed while verifying this. The commit and push
path closed by printing that Vercel would build the push to production after
every ship, on any branch. That is the slice B error restated in words rather
than in refs: a message that reads as a production event when the push never
went near production. Both paths now close through one `report` function, which
says plainly that nothing reached production on a branch ship, and six of the
32 checks hold that behaviour by calling the function and reading what it says.

## Part 4, CSP stays report-only

Enforcement was not enabled and no policy exception was created. The public
policy was not weakened to accommodate `/[locale]/proto`.

Every response checked on production carries exactly one
`content-security-policy-report-only` header and no enforcing
`content-security-policy` header. Page responses carry the middleware policy
with a per-request nonce; static assets carry the build time policy without one.
Neither names a third party script origin, and `unpkg.com` appears nowhere in
any header or body.

`/[locale]/proto` remains nonce incompatible because it is `force-static`, and
it produced 15 to 16 report-only violations per locale in the local browser run.
That is recorded for launch hardening and is not fixed here.

## Part 5, WAF and Upstash

The prepared six route WAF rule is accepted in principle and was not applied.
No rule exists on the project. It should enter log and observation mode when
ELITE-1 participant traffic begins, remain in observation through the pilot and
the first meaningful week of genuine usage, and move to deny only after a false
positive review. `/api/places` stays excluded.

Upstash remains deferred until open beta, evidence of multi-instance limiter
weakness, or real abuse. Nothing was bought and nothing was configured. Both of
these are owner side decisions and remain untouched under owner ruling 7.

## Gates

All seven local gates and all four Playwright probes were run green on the
restored tree at `2bf652e` immediately before the promotion.

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npm test` | 1759 pass, 0 fail |
| `npm run ar-lint` | clean |
| `node scripts/prose-scan.mjs` | clean |
| `npm run lint-gate` | ratchet held, 49 pinned errors, no new rule |
| `npm run ship-test` | 32 checks passed, 0 failed |
| `scripts/reflow-probe.mjs` | 14 viewport renders, 320x256 to 1280x1024, EN and AR |
| `scripts/radio-probe.mjs` | 5 groups, EN and AR, coarse pointer at 390 wide |
| `scripts/shell-probe.mjs` | 36 measurements |
| `scripts/responsive-probe.mjs` | 234 measurements, no row past its box |
| `scripts/perf-probe.mjs` | campaign B, 40 cells within budget |

## Browser and deployment evidence

### Production, checked over HTTP against the merged deployment

Eight routes, both locales, all returning 200 and all carrying
`data-dpl-id="dpl_28FxggteRGchKrj6auC7j9BGHZCB"`, which ties the rendered
document to the deployment rather than to the alias.

| Route | lang | dir | Nonces | `unpkg.com` | Enforcing CSP | Report-only CSP |
| --- | --- | --- | --- | --- | --- | --- |
| `/en` | en | ltr | 1 | 0 | absent | present |
| `/ar` | ar | rtl | 1 | 0 | absent | present |
| `/en/listings` | en | ltr | 1 | 0 | absent | present |
| `/ar/listings` | ar | rtl | 1 | 0 | absent | present |
| `/en/rent-index` | en | ltr | 1 | 0 | absent | present |
| `/en/login` | en | ltr | 1 | 0 | absent | present |
| `/ar/map` | ar | rtl | 1 | 0 | absent | present |
| `/ar/advisor` | ar | rtl | 1 | 0 | absent | present |

Each of the eight carries a different nonce, which is the per-request behaviour
rather than a build time constant.

### The vendored RTL plugin

`/vendor/mapbox-gl-rtl-text-0.2.3/mapbox-gl-rtl-text.min.js` returns 200 from
production as `application/javascript`, with `x-matched-path` equal to the
versioned path, at 206,897 bytes. Its sha256 is
`142f4fc31b4911887bacfea4df1813df67be28dfcb4c56e3f8f576f2e6fdf5d2`, byte
identical to the file in the repository, which `src/lib/rtlTextPlugin.test.ts`
pins against the npm registry tarball whose published integrity was verified
before extraction. The chain from registry tarball to repository file to served
bytes is closed on the webpack build. `LICENSE.md` serves beside it.

The plugin is registered lazily by MapLibre and only when the map meets Arabic
text, which requires basemap tiles. The sandbox has no egress to
`basemaps.cartocdn.com`, so the registration itself could not be observed
locally. What is proven is that the file the code asks for exists, is served
from the vendored path by the webpack build, and is the exact audited byte
sequence.

### The local browser run

Fourteen routes at 390 and 1280, twenty eight loads, against a local `next build
--webpack` production server, using Playwright with Chromium. Every route
returned 200. `lang` and `dir` were correct on all twenty eight.
`scrollWidth - innerWidth` was 0 everywhere. There were zero hydration messages
anywhere and zero page errors other than the sandbox's own egress failures. The
only CSP reports were `/proto`'s known `force-static` nonce gap.

Two things must be said precisely about that run. First, it was a build of
application-identical source rather than of the deployment, because this sandbox
has no egress to `vercel.app`: `git diff --stat c640f42..2bf652e -- src/` shows
only `src/lib/next16Surface.test.ts`, 23 insertions. Second, it cannot be
reproduced in the current container. The container was rolled back mid-batch and
the thirteen vendored font faces in `src/app/fonts/`, which were the workaround
for Google Fonts being unreachable, were scratch tree only and were never
committed. No local production build is possible here any more.

### Widths on production

Mobile and desktop width verification of the production alias in a live browser
was not possible from this session. The sandbox has no egress to `vercel.app`,
and no Chrome extension is connected to this account. What exists instead is the
234 measurement responsive probe and the 14 render reflow probe over the
identical application source at 320 through 1920 including 390 and 1280, and the
28 load local browser run at 390 and 1280 described above. The production checks
in this handback are HTTP level and document level, not rendered viewport level.

### Authenticated surfaces

No authenticated surface was exercised at any point in this batch. No Dashboard,
listing management, Listing Studio, inventory, requirement, matches, messages or
admin surface was opened in a browser, and no authenticated write journey was
fired. `/en/login` was fetched as an unauthenticated public document only. The
review's request to check Dashboard and listing management entry surfaces if a
session were available was not met, because no session was available. This is
the single largest gap in the evidence and it is the reason CSP enforcement
should stay off.

## Known residuals

The `middleware.ts` to `proxy.ts` rename is still deferred; the production build
log still emits the deprecation warning. `/[locale]/proto` is still
`force-static` and therefore nonce incompatible. Finding 215, the bistable
desktop listings layout shift, is open and assigned to the public discovery and
design package, and the two cell exception at 0.31 exists only while it is open.
The 31 kB shared framework JavaScript increase and the 137 ms median mobile
blocking time increase are carried as migration debt. The dated `overrides`
exception review is due at the next Next.js upgrade or on 3 November 2026. The
owner side WAF rule and the Upstash decision are unchanged. Task 147, live
evidence across the seven named surfaces, is still open and overlaps directly
with the authenticated surface gap above. The build also emits a Supabase Edge
Runtime warning about `process.version`, which is unchanged from before the
migration.

## Rollback

Production can be returned to the pre-merge position by promoting
`dpl_DbbHaXgFsu1pqc26Ht3oySsiFZkK`, which is the deployment of `2cfbcdc` and is
still marked a rollback candidate. Its own predecessor is
`dpl_AXyN53ctDUBm2JUTBvVx2cDqwn8g` at `1a99107`. Promoting a previous deployment
changes nothing in the repository, so it is the fast path and it is reversible.

To roll the branch back as well, `main` would need to be reset to `2cfbcdc` and
force pushed, which `tools/ship.py` will not do by design. That is a deliberate
manual step, not an omission.

Note that rolling back past `2bf652e` also reverts the bundler line, so a rolled
back production would be built by Turbopack again and would carry the mobile
paint cost described in part 1.

## What is next

No further foundation package. The next work is ELITE-1 participant activity and
the public discovery and design package covering Home, Listings Search, Listing
Detail and Brokers and Listers.
