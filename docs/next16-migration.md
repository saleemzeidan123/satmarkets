# Next.js 16 migration record, PKG-NEXT16-SECURITY slices A and D

This file is the record of the framework migration itself. Sections 1 to 10 are
slice A, which performed it. Section 11 is slice D, the regression matrix, which
lives here rather than in a file of its own because the surface it guards is the
surface the ten sections above describe, and a matrix kept away from the
migration it guards is read by nobody. Slice B records the dependency audit and
slice C the Content Security Policy, both in `docs/security-baseline.md`. Slice E
is the matched performance comparison and slice F the Vercel WAF owner card.
Where this file and a narrative disagree, this file is corrected in the same
commit.

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

## 11. Slice D, the regression matrix

The work order for this slice asked for regression coverage across
authentication, public server component reads, listings canonicalization,
metadata, Arabic rendering, the manifest and every API route method, from 320
through 1920 px. It is written as one slice and it is really two different kinds
of claim, so they are kept apart here.

The first is a property of the source that has to stay true for as long as this
application is on Next.js 16, and it is held by a gate that runs on every commit:
`src/lib/next16Surface.test.ts`. The second is what a deployment actually
returned on one day, which no gate can hold, and which is written down with the
deployment named beside it. A live check that is not repeated becomes a claim
about the past the moment it is filed, so it is filed as one.

### 11.1 The gate on the migration surface

The risk this file exists for is drift, and it is specific. The next person to
add a page copies an older one or writes the signature from memory of Next.js 14.
`params.locale` read off an unawaited promise is `undefined` rather than an
error, `undefined` is not `"ar"`, and every one of these pages opens with that
comparison. The result is the English build served under an Arabic URL, produced
by code the compiler was happy with. A typecheck cannot hold this on its own,
which is why it is a test.

Six assertions, over 121 modules under `src/app` and 246 shipped modules once
`src/lib` and `src/middleware.ts` are included, with the test files excluded and
comments stripped before any pattern is matched:

Every `params` and `searchParams` annotation begins with `Promise<`. A signature
typed `{ params: { locale: string } }` still compiles against the framework's
structural types and then awaits nothing, so the annotation is checked rather
than trusted.

Every read of `props.params` or `props.searchParams` is preceded either by
`await ` in a Server Component or by `use(` in a Client Component, and the two
are not interchangeable: a Client Component cannot await, and a gate that knew
only about `await` would fail the seven client pages that are already correct.
The current census is 108 reads, 101 awaited and 7 through `use()`. The seven
are `ops`, `requirements`, `requirements/[id]`, `invest`, `login`, `advisor` and
`saved`, all under `src/app/[locale]/`. Floors are asserted on both halves,
`awaited > 50` and `used > 0`, because a rule that quietly stops matching
anything stays green and stops proving anything.

Every call to `cookies()`, `headers()` or `draftMode()` is awaited. There are six
across the tree, three of each of the first two. The pattern uses a negative
lookbehind so that `req.headers` and `res.headers`, which are the Fetch API and
were never synchronous, are not swept up.

No shipped module mentions `UnsafeUnwrapped`. Slice A removed the four the
codemod left standing; this stops a fifth arriving. The gate has to write that
identifier out in full in order to search for it, so the scan excludes test files
by construction, and the reason is recorded in the file: a gate that fails on its
own search term teaches the next person to weaken the search term rather than to
fix the code.

The API inventory matches disk. All 38 route files are listed with the methods
each exports, the list is compared against the directory tree so that adding or
deleting a route fails until the inventory is updated, and the totals are
asserted separately at 14 GET, 26 POST, 5 PATCH, 3 DELETE and no PUT, HEAD or
OPTIONS anywhere. The totals are a second assertion rather than a derived
comfort, because a pair of offsetting edits that moved one method from one file
to another would satisfy every per-file check. The migration is why this exists
at all: the codemod edited all 38 of these files, and an editing pass over 38
files is exactly the moment a handler stops being exported. A route that loses
its POST does not fail to build. It answers 405 to the form that calls it.

Exactly one of `src/middleware.ts` and `src/proxy.ts` exists. Section 4 records
why the rename was declined; what must never be true is both files existing,
because the framework picks one and the other becomes code that reads as live, is
reviewed as live, and runs for nobody.

The gate was negative-control checked rather than assumed to work: each rule was
made to fail on a deliberately broken copy before the file was committed. It
brings the suite from 1752 tests to 1758.

### 11.2 The method that made the live half safe

Every live observation below is a GET, and no request in this slice mutated
anything. Two patterns did the work.

The first covers routes that export no GET at all, which is 24 of the 38. An
unauthenticated GET to a POST-only route returns 405 with `content-length: 0` and
`x-matched-path` set to the route's own path. That combination is stronger than
it looks: the 405 proves the module is deployed and matched, and the matched path
proves which module, so it separates "this route exists and GET is genuinely not
exported" from "this path is a 404". It covers a write-method route without ever
firing a write method at a live deployment.

The second covers the route-handler half of the async params migration, which is
the part a page fetch cannot reach. A GET to `/api/requirements/{a real id}`
returned 200 carrying that requirement's own body, and a GET to
`/api/documents/{a bogus id}/download` returned 404 `not_found`. Both are only
possible if the awaited `params` promise inside the handler resolved to the
actual segment value. An unawaited promise would have produced neither.

### 11.3 Every API route method, observed

Against `satmarkets-p6qbnfiyg-sat-markets.vercel.app`, deployment
`dpl_9gSpSvRa2w4427bv1Na8jhwr3G4p`, commit `5464a46`, all 38 route files were
requested. Every single response carried the nonce-less report-only policy and
all five security response headers, which is the coverage the build-time header
in `next.config.mjs` exists for, since the middleware matcher excludes `/api`.

| Result | Count | Routes |
| --- | --- | --- |
| 405, `x-matched-path` matching, `content-length: 0` | 24 | `account`, `advisor`, `advisor/shortlist`, `conversations`, `leads`, `leads/[id]`, `report`, `search`, `signup`, `signups/review`, `viewings`, `viewings/review`, `viewings/[id]/decision`, `admin/accounts/provision`, `admin/accounts/[id]/verification`, `requirements/[id]/interest`, `listings/[id]`, `listings/[id]/docs`, `listings/[id]/documents`, `listings/[id]/media`, `listings/[id]/media/[mediaId]`, `listings/[id]/review`, `listings/[id]/status`, `listings/[id]/translate` |
| 200 with a body | 11 | `listings` (full inventory), `requirements` (six), `requirements/[id]` (the named one), `saved` `{"listings":[]}`, `saved-searches` `{"searches":[],"signedIn":false}`, `favorites` `{"ids":[],"items":[],"shortlists":[],"signedIn":false}`, `geocode` `{"items":[]}`, `places` `{"items":[]}`, `index/segments` (seven labelled sample segments), `cron/expire-permits`, `cron/ingest-rega` `{"ok":true,"endpoint":"ingest-rega","configured":true}` |
| 400, 401 and 404, each the handler's own answer | 3 | `geo/resolve` `{"error":"unsupported_url"}`; `requirements/[id]/matches` 401 with the signed-out sentence; `documents/[id]/download` 404 `{"error":"not_found"}` |

The 401 is worth its own line, because it is the authentication half of the work
order answered at the API rather than at a page. The route did not fail, it
declined, in the application's own words rather than in the framework's.

`/manifest.webmanifest` returned 200 as
`application/manifest+json; charset=utf-8`, 808 bytes, `etag`
`"e10123df4009fefb0cfe4358b7446df6"`.

**A limitation that had been recorded as a fact, and is now retired.** Earlier
sessions recorded `/manifest.webmanifest`, `/api/viewings` and
`/api/admin/accounts/provision` as unfetchable through this channel. They are
not. `"Unable to create shareable URL"` from the Vercel fetch tool is transient:
seven paths failed that way during this slice and every one of them succeeded on
a retry, three of them on the first retry. The rule from here is to retry three
times before writing down a limitation, because a limitation written down once is
believed thereafter.

### 11.4 Page surfaces

Authentication, both languages. `/en/login` and `/ar/login` both returned 200
with `x-matched-path` `/[locale]/login`. `/ar/login` rendered `lang="ar"` and
`dir="rtl"` and the Arabic title. Login is one of the seven Client Components
that unwrap `params` with `use()`, so this is the silent bilingual regression
scenario from 11.1 checked against a running deployment rather than against the
source. `/auth/callback` returned 200 and is excluded from the middleware
matcher, which is visible in its own response and is the point of 11.5 below.

Public server component reads. `/en` and `/ar/listings` both returned 200 with
content rendered from the database. `/en/listings/{a real id}` produced the title
"Office Floor for Sale, Granada" from that listing's own row, which is
`generateMetadata` awaiting its `params` promise and then reading a database, in
one observation.

Listings canonicalization, checked against the four defects
`src/lib/search/canonical.ts` names in its own header. `?deal=banana&sort=nonsense`
canonicalized to `/en/listings` with the generic title, so unknown enum values are
dropped rather than echoed. `?city=Atlantis&place=nowhere&measure=cubits`
canonicalized to `/en/listings?place=nowhere`: the unknown city and the unknown
measure were dropped and the free-text place was kept, which is `safePlace`
behaving exactly as documented. `?city=RIYADH` canonicalized to `?city=Riyadh`,
and `/ar/listings?city=الرياض` canonicalized to `/ar/listings?city=Riyadh` with
the Arabic title, so two spellings in two scripts collapse onto one canonical
URL. That is defect one from the module header, closed before the migration and
now shown still closed after it. `?place=<script>alert(1)</script>` was rejected
by the markup guard, the canonical fell back to `/en/listings`, and the literal
string `<script>alert` appears zero times in the served document.

Metadata. Every page fetched emitted a title, a description, a canonical, three
`hreflang` alternates (`en`, `ar`, `x-default`), and a complete Open Graph and
Twitter set with the locale-correct image and `og:locale` plus
`og:locale:alternate`. Canonicals point at the production alias
`satmarkets-wheat.vercel.app` and not at the preview host, which is correct: a
preview must not publish itself as the canonical copy of a page.

Nonce coherence, which is slice C's claim re-measured on this deployment. On
every middleware-matched page the nonce in the response header equalled the
single distinct nonce stamped on every executable script in the document, and the
count of distinct nonce values in the document was one. `/en/login` and
`/ar/login` carried 21 nonced scripts each with 2 unnonced `application/ld+json`
blocks, `/en` 23 with 2, `/en/requirements` 21 with 2, and `/ar/listings` 203
with 3. On `/auth/callback`, which the matcher excludes, the header carried no
nonce and every script in the flight payload carried `"nonce":"$undefined"`.
There was no mismatch anywhere. This quantifies the owner action already recorded
in `docs/security-baseline.md`: the JSON-LD data blocks are the population a
browser console pass has to clear, and they are 2 per page on most pages and 3 on
listings.

The removed third-party origin. The literal `unpkg.com` occurs zero times in
every document fetched in this slice, which is slice C's removal confirmed at the
served level and not only in the source.

### 11.5 From 320 through 1920 px

Four Playwright probes, all against Chromium at `/opt/pw-browsers/chromium`, with
`shell-probe` and `responsive-probe` also taking the repository's own Tailwind
output compiled to `/tmp/globals.built.css`.

| Probe | Measurements | Range | Result |
| --- | --- | --- | --- |
| `reflow-probe.mjs` | 14 viewport renders, EN and AR | 320x256 to 1280x1024 | PASS. Every field pair collapses at the 400 percent reflow reference, no surface scrolls horizontally, and no column count regresses above its stated floor |
| `radio-probe.mjs` | 5 groups, EN and AR, coarse pointer at 390 wide | 390 | PASS. One tab stop per group, arrows walk and wrap, `ArrowRight` follows the writing direction (advances at LTR, retreats at RTL), every target clears 44px |
| `shell-probe.mjs` | 36 | 320 to 1920 | PASS. The bottom reservation follows the tab bar, nothing sits under it at the end of the document, the Advisor button keeps its gap |
| `responsive-probe.mjs` | 234 | 320 to 1920 | PASS. No row past its box, no item wider than its content box, 28 rows inside a declared scroll rail by design |

Two honesty notes carried forward from the probes' own headers rather than
restated as stronger than they are. These run against locally reproduced
fragments compiled from the repository's own CSS, not against the deployment,
because container Chromium cannot reach the deployed host through the egress
proxy; the cascade, the type scale, the breakpoints and the markup are the
shipped ones, but the two font faces are `@fontsource` copies rather than the
`next/font/google` self-hosted ones, so glyph advance can differ by a hair. And
`env(safe-area-inset-bottom)` resolves to 0 in headless Chromium, so the shell
numbers are the no-home-indicator floor case; the inset's presence in the three
declarations that use it is held separately by `src/lib/chromeGate.test.ts`.

`reflow-probe` tops out at 1280 and the other two reach 1920, so the stated range
is covered, but not by every probe. That is deliberate rather than an omission:
reflow is a WCAG 1.4.10 measurement and the reference condition is 320 CSS pixels
wide by 256 tall, so extending it upward measures nothing the two width probes do
not already measure better.

### 11.6 What slice D does not prove

Rendering is not correctness. Every live observation here is a server response,
and a server response cannot show that a page hydrated, that the map drew, that
the vendored RTL plugin actually shaped Arabic labels, or that no console error
fired. Those belong to the live browser pass recorded as an owner action in
`docs/security-baseline.md`, and this slice does not substitute for it.

The write methods were never exercised. 24 routes are proven deployed and proven
not to export GET. Nothing here shows that their POST, PATCH or DELETE handlers
behave correctly under the new `{ params: Promise<...> }` signature, and the only
honest way to show that from outside would be to mutate production data. Their
handlers' internals are covered by the unit suite and their signatures by the
gate in 11.1, and that is the whole of the claim.

The static gate reads source, not behaviour. It can prove that every `params`
read is paired with an `await` or a `use()`. It cannot prove that the awaited
value is then used correctly, and it is not trying to.
