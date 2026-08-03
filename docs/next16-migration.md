# Next.js 16 migration record, PKG-NEXT16-SECURITY slice A

This file is the record of the framework migration itself. Slice B records the
dependency audit, slice C the Content Security Policy, slice D the regression
matrix, slice E the matched performance comparison and slice F the Vercel WAF
owner card. Where this file and a narrative disagree, this file is corrected in
the same commit.

## 1. What moved

| Package | Before | After |
| --- | --- | --- |
| next | 14.2.35 | 16.2.12 |
| react | ^18.3.1 | ^19.2.8 |
| react-dom | ^18.3.1 | ^19.2.8 |
| @types/react | ^18.3.11 | ^19.2.18 |
| @types/react-dom | ^18.3.0 | ^19.2.4 |
| eslint | absent | 9.39.5 |
| eslint-config-next | absent | 16.2.12 |

`@types/node` stayed at `^20.16.11`. It is not a framework peer, the current
release is a major ahead of the runtime family this project targets, and moving
it inside a framework migration would put a second unrelated type surface into
the same diff.

Next.js 16 was released on 2025-10-21 and is the Active Long Term Support line.
15.x is in maintenance and 14.x, the version this project was on, is end of life.
The owner instruction was explicit that the target is 16 and not 15, and the
support policy is the reason: an end of life framework does not receive the
security fixes that this package exists to collect.

The production runtime satisfies the new minimum. Next.js 16 declares
`engines.node >= 20.9.0`; the Vercel project reports `nodeVersion: 24.x`, and
the successful build reports three Node.js lambda runtimes. This was read from
the project configuration rather than assumed from the local sandbox, which runs
Node v22.22.2 and is not what serves the application.

Branch total across the five commits: 120 files changed, 6800 insertions,
1198 deletions.

## 2. Codemods, run as a starting point and not as an answer

The work order said to use the official codemods as an inspected starting point
rather than as unquestioned output, so the raw codemod result was committed on
its own, unreviewed, at `dca9472`. That commit exists purely so the review of it
is visible as a diff: 82 files, 279 insertions, 161 deletions, none of it read.
The corrections are the separate commit `72fe6fc`, 74 files, 141 insertions,
115 deletions, which is very nearly the same file set. That ratio is the point.
The codemod was right about where the work was and wrong about a great deal of
what to do there.

What it got wrong, in the shape it repeats: `next-async-request-api` reaches for
`(await headers())` where it can prove the enclosing function is async, and
falls back to the `UnsafeUnwrapped` escape hatch where it cannot. Four of those
escape hatches were left standing in its output. Every one of them was in a
function that could simply be made async, so all four were removed rather than
carried. An escape hatch named unsafe that is committed because a tool wrote it
is a deprecation deferred rather than a migration performed.

The async request API change also reached further than the codemod looks. The
Supabase server client is constructed from `cookies()`, so making that call
awaited made `getSupabaseServer` async, and that propagated to 73 call sites
across the application. Those were changed by hand.

## 3. Turbopack and Webpack, assessed separately

Next.js 16 makes Turbopack the default bundler for `next build` as well as for
`next dev`. That is a change of engine underneath an application that had never
been built with it, so it is assessed here as its own question rather than
absorbed into the version bump.

What was established, from the deployed build rather than from the sandbox:

The build ran on Turbopack and succeeded. The log opens `Next.js 16.2.12
(Turbopack)`, compiled in 21.9s, ran TypeScript in 18.8s, generated 22 static
pages in 160ms and emitted 105 routes. Whole build 56s on a two core, 8 GB
machine. One warning, the middleware deprecation, which is deliberate and
documented in `src/middleware.ts`.

There is no custom Webpack configuration anywhere in this repository.
`next.config.mjs` carries no `webpack` key and no `webpack` string appears in
`package.json`. That matters because a custom `webpack` function is the
documented reason a project is forced onto `next build --webpack` in 16, and
this project has never had one. There is nothing to port and nothing to lose.

The one failure Turbopack produced was not a bundler parity problem. It rejected
`next/dynamic` with `ssr: false` inside a Server Component, which Next.js
documents as a framework semantics error rather than a bundling limitation: the
option asks to skip a render that has already happened by the time a Server
Component's output exists, so it never meant anything on the server and 16 says
so instead of ignoring it. The fix moved the deferral into a Client Component
boundary at `src/components/ListingsMapDeferred.tsx` and preserved the deferral
exactly. Building with `--webpack` would have produced the same error, because
it is not the bundler that raises it.

What is not established, and is stated rather than glossed: production output
parity between the two bundlers has not been measured, because only one of them
has ever built this application. Slice E is where the Next.js 14 to Next.js 16
comparison is measured, and that comparison is Webpack-on-14 against
Turbopack-on-16, so it measures the bundler change and the framework change
together and cannot separate them. It is not evidence of Turbopack against
Webpack on the same version.

THE DOCUMENTED FALLBACK. If production parity fails, the fallback is
`next build --webpack`, set in the `build` script in `package.json`, with no
other change required, because there is no Webpack configuration to restore.
The cost of taking it is that Webpack support in 16 is a compatibility path
rather than the maintained default, so it is a place to stand while a defect is
diagnosed and not a place to live.

The conditions that trigger it, written down now so the decision is not made
under pressure later: a build that succeeds on Turbopack and produces output
that behaves differently in the browser from the Next.js 14 build in a way slice
D's regression matrix catches and slice A's diff does not explain; or a slice E
result whose movement cannot be attributed to any framework change and
disappears when the same commit is rebuilt with `--webpack`. In either case the
`--webpack` build is the diagnostic first and the shipping decision second.
Neither condition has been met.

## 4. The middleware to proxy convention

Deliberately not taken in this package. The full reasoning is written into
`src/middleware.ts` itself rather than only here, because the file is where
someone will ask the question. In short: `proxy` runs on the Node.js runtime,
that runtime is not configurable there, the edge runtime is not supported in
`proxy`, and Next.js tells an application that wants edge to keep using
`middleware`. This file exports no `runtime` and therefore runs on edge today,
so the rename would move the execution environment of a hot path that performs
the locale redirect and calls `supabase.auth.getUser()` on every non-API
request. That is its own regression surface and its own latency measurement, and
it does not belong inside the package that also rewrote 73 Supabase call sites.

The deferral is time bound. It is revisited at whichever comes first: the first
Next.js release that announces a removal version for the `middleware`
convention, or the next framework upgrade package after this one. If neither has
happened by then it is revisited anyway rather than carried a third time.

## 5. next lint, removed and replaced

`next lint` no longer exists in 16, and `next build` no longer lints. The
`"lint": "next lint"` script this repository carried had never once run: an
unconfigured project makes `next lint` stop and ask an interactive question, and
no gate here can answer one.

The replacement is ESLint 9.39.5 with `eslint-config-next` 16.2.12, a flat
config at `eslint.config.mjs` scoped to the framework author's own
`core-web-vitals` and `typescript` sets and to nothing else. No house style, no
formatting rules, no import ordering: a rule that would force a mechanical
rewrite of files this package is not otherwise touching would make the migration
diff unreviewable, which is the opposite of what a framework migration needs.

Running it for the first time on a tree that had never been linted found 82
problems, none of them migration breakage. Ten were fixed. The remaining 49
errors are pinned by `scripts/eslint-gate.mjs`, wired as `npm run lint-gate`,
which fails if a pinned count rises, fails if a pinned count falls without the
pin being lowered in the same diff, and fails if any rule not on the list
appears at all. The debt is recorded as finding 214 with a named follow-up
package rather than hidden inside this one.

Two of the three `prefer-const` style findings deserve a note because the
obvious fix was wrong. They were `let { data, error } = await q(WIDE)` followed
by a narrower retry that reassigns `data` only. A destructuring binding cannot
be half const, so the tempting repair was to set `prefer-const`'s
`destructuring: "all"` option, which silences the finding by weakening the rule
everywhere. Each site was restructured instead, which is semantically identical
and keeps the rule at full strength.

Two of the three unused disable directives were also not stale. The one in
`src/lib/search/canonical.ts` suppresses a real `no-control-regex` finding that
the Next.js sets simply never turn on, so the directive was protecting a
deliberate control character class guarding what reaches a page title. Deleting
it was the wrong repair; the rule was enabled instead, which is what makes the
comment true again. This was verified by probe rather than assumed: with the
rule turned on, the directive stopped being reported as unused.

## 6. tsconfig, aligned with what the framework mandates

Next.js 16 rewrites `tsconfig.json` at build time. The build log states it
plainly: `jsx was set to react-jsx (next.js uses the React automatic runtime)`
as a mandatory change, and `include was updated to add
'.next/dev/types/**/*.ts'` as a suggested one. The typed routes output directory
moved from `.next/types` to `.next/dev/types`.

This was found by reading the head of the build log, not by any local gate,
and it mattered: the repository carried `jsx: "preserve"` and pointed at the old
directory, which meant `npx tsc --noEmit` locally and the TypeScript step inside
the deployed build were checking the same code under two different
configurations. The repository now carries what the framework mandates. The new
`include` entry was added alongside the old one rather than replacing it, which
is exactly what the build itself does.

`tsconfig.test.json` existed only to flip `jsx` to `react-jsx` for the test
runner. The base config now says the same thing, so the override is redundant;
it is kept, with the reason recorded in the file, because `package.json` names
it and because the moment the two configs need to differ again, that is where
the difference belongs.

## 7. Changes assessed and found inapplicable

Recorded so that a later reader can see they were considered rather than missed.

`next/image` defaults changed in several ways in 16: `minimumCacheTTL` moved
from 60 to 14400, `16` was removed from `imageSizes`, `qualities` narrowed to
`[75]`, `maximumRedirects` became 3 and `images.dangerouslyAllowLocalIP` was
added. All of it is inapplicable here. `next/image` is imported nowhere in this
codebase. The only occurrence of the string is `_next/image` inside the
middleware matcher, which is a path exclusion and not a component. The
`images.remotePatterns` entry in `next.config.mjs` is vestigial and is left
alone rather than removed inside a migration, since removing it is a separate
question about dead configuration.

Parallel route slots now require an explicit `default.js`. This repository has
no parallel routes.

AMP support, `serverRuntimeConfig` and `publicRuntimeConfig`, `unstable_rootParams`
and the old `devIndicators` options were all removed in 16. None of them are
used here. `experimental.dynamicIO` and `useCache` were renamed to
`cacheComponents`; neither was enabled.

## 8. The one behaviour change that was applied

Next.js no longer overrides `scroll-behavior` during client side navigation.
`globals.css` sets `html { scroll-behavior: smooth }`, and up to 15 the router
forced that property to `auto` for the duration of a route change and released
it afterwards, so a navigation jumped to the top the way a document load does
while an in-page anchor still glided. With 16 and nothing else changed, every
client navigation would animate its way to the top of the new page instead,
which on a long listings result is a visible slide of several thousand pixels.

`data-scroll-behavior="smooth"` on the `html` element in `src/app/layout.tsx` is
how the router is told the document opted into smooth scrolling deliberately, so
it restores the suppression it used to apply on its own. The reduced motion
block in `globals.css` is untouched and still wins, so a reader who asked for
less motion is not handed more of it by this attribute.

## 9. Evidence

The sandbox cannot run `npm run build`: the egress proxy blocks
`fonts.googleapis.com` and `fonts.gstatic.com`, and the four `next/font/google`
declarations in the root layout fail without them. The branch preview build is
therefore the production build evidence for this package, and it earned that
role twice: both the `ssr: false` rejection and the tsconfig rewrite were
invisible to the typecheck, the tests and every local gate, and only the
deployed build surfaced them.

Branch `next16-security`, five commits on top of main at `1a99107`.

| Commit | What |
| --- | --- |
| 84a2e9c | dependency upgrade only, before any codemod |
| dca9472 | raw codemod output, unreviewed, committed alone so the review is visible |
| 72fe6fc | the reviewed corrections, no deprecated unwrap left standing |
| 4d61024 | ship.py could not push a branch the remote had never seen |
| 79ab0c3 | the build error the sandbox could not see, plus the lint replacement |

`79ab0c3` produced deployment `dpl_HPTLrtfd69E7JHpKgUcWiMDnduWQ`, state READY,
at `satmarkets-9rpvb9hh2-sat-markets.vercel.app`, branch alias
`satmarkets-git-next16-security-sat-markets.vercel.app`. That is the first
successful Next.js 16 build of this application.

Branch previews are built by this environment, which resolves the work order's
conditional in favour of the branch and preview shape. The atomic single commit
fallback is not needed and is not used.

Local gates at this commit: `npx tsc --noEmit` clean; 1739 tests pass;
`npm run ar-lint` clean; `scripts/prose-scan.mjs` reports GATE 0 hardcoded prose
strings on public pages; `npm run lint-gate` holds at 49 pinned errors with no
new rule.

## 10. Rollback

Nothing from this package has reached production main. The live production
deployment is still `1a99107` at `dpl_AXyN53ctDUBm2JUTBvVx2cDqwn8g`, which is
Next.js 14.2.35, and it is unaffected by anything on this branch. Rollback
before the merge is deleting the branch. Rollback after the merge is
`git revert` of the merge commit followed by a deploy, since every change in
this package is source and configuration with no database migration and no
external service behind it.
