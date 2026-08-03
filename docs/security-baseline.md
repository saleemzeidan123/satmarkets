# Security baseline

PKG-E1-READINESS slice F, WS34. Measured and written 2026-08-02 against commit
dcf4cdc, the production deployment dpl_2qnivvdU1jkxa5N5ANyQFFCVcnET serving from
https://satmarkets-au7ch9uf8-sat-markets.vercel.app.

This document records three things: which recorded dependency vulnerabilities
were actually fixable in place and which were not, how the Content Security
Policy in `next.config.mjs` was derived, and what the platform's rate limiting
genuinely is today. It also documents, without installing, the smallest shared
production-capable rate limit and bot defence option and what each would cost.

Read it as a statement of the current position rather than a plan. Where
something is unfixed, the reason is written down rather than deferred to a
future document.

**Amended 2026-08-03 by PKG-NEXT16-SECURITY slice B, at commit 2cfbcdc.** The
dependency half of this document is now two layers. The first section below is
the current position, measured after the Next.js 16.2.12 upgrade. The section
after it is the pre-upgrade position, kept unedited as the record of what the
upgrade closed. Nothing in the Content Security Policy, response header or rate
limiting sections has been re-measured by slice B; the CSP is slice C's subject
and is amended there, not here.

**Amended again 2026-08-03 by PKG-NEXT16-SECURITY slice C, at commit 8bf173c.**
The Content Security Policy half of this document is now two layers in the same
way. The slice C section below is the current position. The section headed
"Content Security Policy, the pre-nonce position" after it is kept unedited as
the record of what slice C changed and why the old reasoning no longer holds.

## What was changed in this slice

One dependency was upgraded, five response headers were added, and one header
was removed. Nothing else. No route logic changed, no middleware changed, and
no rate limiter was added or altered.

## PKG-NEXT16-SECURITY slice B, the post-upgrade audit

Written 2026-08-03 against commit 2cfbcdc. **This section supersedes the three
that follow it.** Those were measured on 2026-08-02 against next@14.2.35 and are
kept unedited, because they are the record of what the upgrade closed and of the
reasoning that said it could not be closed any other way. Read them as history,
not as the current position.

### Where the count went

| Point | critical | high | moderate | low | distinct advisories |
| --- | --- | --- | --- | --- | --- |
| Before, on next@14.2.35 | 0 | 2 | 0 | 0 | 24, across two packages |
| After the upgrade to 16.2.12, before any remedy | 0 | 3 | 0 | 0 | 4 |
| After the override floor, current | 0 | 0 | 0 | 0 | 0 |

The entry counts in the middle three columns are npm's own per-package-path
count. They are not the advisory count and they are not the package count, which
is the same distinction the superseded section below opens with and the reason
the last column exists. Twenty one of the twenty four advisories were the
Next.js rows, and the upgrade closed all twenty one at once. What was left
afterwards was four advisories against two packages, both of them copies the
framework nests inside itself.

### The four that survived the upgrade

Next.js 16.2.12 does not resolve postcss and sharp to the versions this
repository already had. `node_modules/next/package.json` pins them itself:

```
dependencies:         "postcss": "8.4.31"     (exact pin)
optionalDependencies: "sharp": "^0.34.5"      (a caret on a 0.x cannot reach 0.35)
```

So npm installed a second copy of each under `node_modules/next/node_modules/`,
and it is those two nested copies, not the root ones, that the four advisories
were reported against. The root tree was already clean: `sharp` at 0.35.3 and
`postcss` at 8.5.25, both above every fixed range.

| Advisory | Severity | Nested version | Reaches this application |
| --- | --- | --- | --- |
| GHSA-f88m-g3jw-g9cj, inherited libvips CVE-2026-33327 / 33328 / 35590 / 35591, `<0.35.0` | high | sharp 0.34.5 | Not established as reachable. Reasoning below, including what could not be proved. |
| GHSA-qx2v-qp2m-jg93, XSS via unescaped `</style>` in stringify output | moderate | postcss 8.4.31 | No. Requires postcss to process attacker-controlled CSS. |
| GHSA-6g55-p6wh-862q, arbitrary file read via attacker-controlled `sourceMappingURL` | high | postcss 8.4.31 | No. Same precondition. |
| GHSA-r28c-9q8g-f849, path traversal in source map auto-loading | high | postcss 8.4.31 | No. Same precondition. |

**postcss.** All three advisories have the same precondition, that postcss
processes CSS an attacker controls. postcss runs here at build time only, on
Vercel's build machine, over three stylesheets that are in this repository:
`src/styles/globals.css`, `src/styles/footer.css` and
`src/styles/sat-platform.css`. The pipeline is `postcss.config.mjs`, which loads
tailwindcss and autoprefixer, and which resolves the root 8.5.25 rather than the
nested copy. There is no runtime import of postcss anywhere in `src`. This
application accepts listing media and listing text from its users; it does not
accept stylesheets. The precondition is not met by any path.

**sharp.** This one took more work, and the honest answer is weaker than the
postcss one. The single `import sharp from "sharp"` in the whole tree is in
`src/app/api/listings/[id]/media/route.ts`, and Node resolves it to the root
0.35.3, because `node_modules/next/node_modules/` is only reachable from inside
`node_modules/next/`. `next/image` is imported by zero files. But "nothing
imports it" is not sufficient here, because `/_next/image` answers on production
regardless of whether any rendered surface links to it, and the only file in the
framework that touches sharp is `next/dist/server/image-optimizer.js`. So the
question is which sharp actually performs a production transformation.

On Vercel the answer is that the platform does it. Vercel's own documentation
describes Image Optimization as a service Vercel performs and caches, meters as
a billable transformation, and reports through the `HIT` / `MISS` / `STALE`
cache vocabulary; the production probe carries `x-vercel-cache: HIT` and
`server: Vercel`. The requirement for a sharp bundled in the deployment is
stated in the self-hosting guide and scoped to `next start`, which is not how
this application runs.

**What could not be proved.** No single Vercel sentence says "the deployment's
bundled sharp is not used." The conclusion above is assembled from several
documents plus one response header, and assembled inference is not the same
thing as a statement. That is why this advisory was not closed on reachability.
It was closed by removing the vulnerable copy, and the reachability analysis is
recorded as the reason the risk was low while it was there, not as the remedy.

### Why `npm audit` could not close any of this

All four entries reported the same `fixAvailable`: **`next@9.3.3`**. Next.js
9.3.3 is a six-major downgrade, published in 2020, and would undo the entire
migration that slice A just performed. That number is not advice. It is the
audit reaching the end of its search and emitting the only thing its resolver
could find that satisfies the constraint, in the only vocabulary it has.

This is the concrete case for the work order's instruction not to claim security
completion from `npm audit` alone. A tool whose remedy for four advisories is a
six-year downgrade of the framework is not, at that moment, in a position to
tell anyone whether the application is secure. The applicability analysis above
had to be done by reading the resolver's output, the framework's own manifest,
and the one framework file that calls the vulnerable API.

### The remedy

`package.json` now carries a flat `overrides` block:

```json
"overrides": {
  "postcss": "^8.5.25",
  "sharp": "^0.35.3"
},
```

Flat, not scoped under `next`, because the useful statement is a floor for the
whole tree rather than a patch aimed at one dependent, and because a flat floor
also stops a future transitive dependency reintroducing an old copy. Both ranges
are identical to what the root already declares, so the override removes
duplicate subtrees rather than introducing any new version.

Two findings from applying it are worth keeping, because both would mislead a
reader who repeated the work:

**An `npm install` that exits 0 is not evidence the override took.** Four
consecutive attempts (the nested `$ref` form, the nested explicit form,
`--package-lock-only`, and deleting the lockfile outright) each printed "up to
date" and changed nothing. `npm ls postcss sharp` was what exposed it, reporting
`postcss@8.4.31 invalid: "^8.5.25" from node_modules/next overridden`: npm had
applied the override to its ideal tree and then declined to reify it over an
already-installed directory. Deleting
`node_modules/next/node_modules/{postcss,sharp}` and reinstalling was what made
it real ("removed 4 packages").

**Regenerating the lockfile is not a neutral act.** Deleting and rebuilding
`package-lock.json` produced a 3283 insertion / 5583 deletion diff, which is
unreviewable structural churn riding along inside a security change. The lock
was restored from backup and the install re-run with the nested directories
already gone, which produced the diff that is actually committed: **0
insertions, 529 deletions**, removing exactly 26 entries, being
`node_modules/next/node_modules/postcss`, `node_modules/next/node_modules/sharp`
and 24 `@img/sharp-*` platform binaries. Nothing else in the lock moved.

### Evidence

| Check | Result |
| --- | --- |
| `npm audit` | 0 critical, 0 high, 0 moderate, 0 low |
| `npm ls postcss sharp` | next@16.2.12 resolves `postcss@8.5.25 deduped` and `sharp@0.35.3 deduped` |
| `npm ci --dry-run` | reproduces with zero `node_modules/next/node_modules/*` entries |
| `tsc --noEmit` | exit 0 |
| `npm test` | 1739 / 1739 pass, 0 fail, 35.0s |
| `npm run ar-lint` | clean |
| `scripts/prose-scan.mjs` | exit 0 |
| `npm run lint-gate` | ratchet held, 49 pinned errors, warn inventory unchanged |
| Vercel build | `dpl_DbbHaXgFsu1pqc26Ht3oySsiFZkK`, READY in 71s, turbopack, 22 static pages, no sharp or postcss resolution warning |
| Production `/_next/image` probe | 200, `image/png`, 571 bytes, 64x64, `x-vercel-cache: HIT` |

The risk in this change is not the postcss floor. It is sharp: the override
forces 0.35.3 where Next.js declares `^0.34.5`, which is outside the range the
framework says it supports. That was measured rather than assumed. Every sharp
call `next/dist/server/image-optimizer.js` makes (`concurrency`, the constructor
with `limitInputPixels` and `sequentialRead`, `timeout`, `rotate`, `resize` with
`withoutEnlargement`, `avif`, `webp`, `png`, `jpeg` with `mozjpeg`, `toBuffer`)
was replayed against 0.35.3 (libvips 8.18.3) on `public/icon-192.png`. All
succeeded at the correct 64x64 output: png 571 bytes, webp 460, avif 684, jpeg
752. The production probe returned a PNG of exactly 571 bytes, matching the
local transform byte for byte.

### The exception, time bound

Nothing on the advisory list survives. What survives is the remedy itself, and
an undated override is the thing that quietly becomes wrong later. Two ways it
does: a future Next.js release may raise its own floor above ours, at which
point the block is dead weight that still reads as protection; or the framework
may pin a version for a reason (an API change in sharp 0.36, say) and the floor
would then hold the tree at a version the framework does not support, which is
the same risk measured above but re-run without anyone measuring it.

**Reviewed at whichever comes first: the next Next.js upgrade of any size, or
2026-11-03.** The review is two questions. Does `npm ls postcss sharp` still
show the root versions winning without the override, in which case delete it?
And does the sharp API replay above still pass against whatever the framework
then declares? If neither has been answered by 2026-11-03 the block is revisited
anyway rather than carried a second time undated. Tracked in
`docs/status-ledger.md`.

### What `npm audit` cannot see, stated so the zero is not misread

The audit now reports zero, and zero is a statement about the npm registry
dependency tree and nothing else. Three things this application depends on are
not npm packages and were never in scope for that number:

The **Vercel platform** serves every request, performs the image
transformations discussed above, and runs the build. Its vulnerabilities are not
in any lockfile.

**Supabase** holds the data and performs authentication. `@supabase/ssr` and
`@supabase/supabase-js` are audited as packages; the hosted Postgres, the
policies on it and the auth service are not. The Supabase advisor checks are a
separate surface and are not covered by this document.

**`https://unpkg.com`**, which the Content Security Policy below allows as a
script origin, for the maplibre right-to-left text plugin fetched at runtime.
That is a third-party origin loading executable code into the page on demand,
with no integrity attribute and no version in any lockfile. `npm audit` has no
visibility into it whatever. It is the single largest thing the zero above does
not cover, and it is a direct input to slice C.

## Dependency vulnerabilities, the pre-upgrade position, superseded 2026-08-03

Everything from here to the end of the Next.js subsection was written against
next@14.2.35 on 2026-08-02, before the upgrade. It is retained because the
21-row applicability table is the record of what the upgrade closed, and because
its conclusion that the postcss node could not be lifted without lifting Next.js
turned out to be correct. The counts and the remedy statements in it are no
longer current. The section above is.

`npm audit` at the time of writing reports 2 high, 0 moderate, 0 low and 0
critical, across two packages. The count is per package and not per advisory,
which understates the shape of the problem: the two packages carry 24 distinct
advisories between them.

### postcss

Three advisories apply, one moderate and two high:

| Advisory | Severity | Affects |
| --- | --- | --- |
| GHSA-qx2v-qp2m-jg93, XSS via unescaped `</style>` in CSS stringify output | moderate | `<8.5.10` |
| GHSA-6g55-p6wh-862q, arbitrary file read via attacker-controlled `sourceMappingURL` | high | `<=8.5.11` |
| GHSA-r28c-9q8g-f849, path traversal in previous source map auto-loading | high | `<=8.5.17` |

The direct devDependency was `^8.4.47`, resolving to 8.5.15, and is now
`^8.5.25`. That moves every node the build actually uses onto a fixed version.
`npm ls postcss --all` now shows autoprefixer, tailwindcss, postcss-import,
postcss-js, postcss-load-config and postcss-nested all deduped onto 8.5.25.

One vulnerable node remains, and it is not removable from here:
`node_modules/next/node_modules/postcss` at 8.4.31, which the framework pins
itself. `npm audit` still reports the postcss entry as high for that reason, and
its `fixAvailable` is `next@16.2.12`, a major upgrade. There is no way to lift it
without lifting Next.js.

The reachability of the remaining node is worth stating plainly, because the
severity label on its own is misleading here. All three advisories require
postcss to process CSS that an attacker controls. postcss runs in this project
at build time only, over stylesheets that are in the repository, on Vercel's
build machine. No request path reaches it, and no user supplied content reaches
it. It is real and it should be closed, but it is not currently exposed.

### Next.js

Twenty one advisories apply to 14.2.35. The fix offered is `next@16.2.12`, and
`isSemVerMajor` is true.

14.2.35 is the terminal release of the 14.x line. There are 46 stable 14.x
versions published and this project is on the last one, so there is no patch
release to move to. The only remediation is a major upgrade to 15.x or 16.x,
which brings asynchronous `headers()` and `cookies()`, React 19, and a set of
route and caching behaviour changes. `src/app/layout.tsx` calls `headers()`
synchronously today, and so do other server surfaces. That work is a package in
its own right with its own regression evidence, and doing it inside a security
essentials slice would be the wrong shape of risk. It is recorded here as a
tracked upgrade requiring the owner's authorization, not as something quietly
skipped.

What can be done from here is to say honestly which of the 21 advisories can
reach this application at all. Each row below was checked against the source
rather than assumed.

| Advisory | Severity | Reaches this application |
| --- | --- | --- |
| GHSA-9g9p-9gw9-jx7f, DoS via Image Optimizer remotePatterns | moderate | No. The advisory is scoped to self-hosted applications. This is hosted on Vercel. `images.remotePatterns` is configured but there are zero importers of `next/image` in `src`. |
| GHSA-h25m-26qc-wcjf, request deserialization DoS with insecure React Server Components | high | Fixed range ends before 15.0.8 and this is 14.2.35, so it applies by version. Exposure is the App Router request path, which this application does use. |
| GHSA-ggv3-7p47-pfv8, HTTP request smuggling in rewrites | moderate | No. `next.config.mjs` declares no `rewrites`. |
| GHSA-3x4c-7xq6-9pq8, unbounded `next/image` disk cache growth | moderate | No. Zero `next/image` importers, and the disk cache concern is a self-hosted one. |
| GHSA-q4gf-8mx6-v5v3, DoS with Server Components | high | Applies by version. App Router is in use. |
| GHSA-8h8q-6873-q5fj, DoS with Server Components | high | Applies by version. App Router is in use. |
| GHSA-3g8h-86w9-wvmq, middleware and proxy redirect cache poisoning | low | Applies by version. `src/middleware.ts` performs locale redirects. |
| GHSA-ffhc-5mcf-pf4q, XSS in App Router applications using CSP nonces | moderate | No, and deliberately so. There are zero occurrences of `nonce` in `src`. This advisory is the direct reason the policy below uses `'unsafe-inline'` rather than a nonce. |
| GHSA-vfv6-92ff-j949, cache poisoning via RSC cache-busting collisions | low | Applies by version. |
| GHSA-gx5p-jg67-6x7h, XSS in `beforeInteractive` scripts | moderate | No. Zero occurrences of `beforeInteractive` and zero imports of `next/script`. |
| GHSA-h64f-5h5j-jqjh, DoS in the Image Optimization API | moderate | Not through this application's own code. Zero `next/image` importers, so the optimizer endpoint is not referenced by any rendered surface. |
| GHSA-c4j6-fc7j-m34r, SSRF in applications using WebSocket upgrades | high | No. No WebSocket upgrade handling exists in `src`. |
| GHSA-wfc6-r584-vfw7, cache poisoning in RSC responses | moderate | Applies by version. |
| GHSA-36qx-fr4f-26g5, middleware bypass in Pages Router applications using i18n | high | No. There is no `pages` directory. Localisation is App Router segments plus middleware. |
| GHSA-m99w-x7hq-7vfj, DoS in App Router using Server Actions | high | No. Zero `"use server"` directives in `src`. This application has no Server Actions. |
| GHSA-89xv-2m56-2m9x, SSRF in Server Actions on custom servers | high | No. No Server Actions, and not a custom server. |
| GHSA-68g3-v927-f742, cache confusion of response bodies for requests with bodies | moderate | Applies by version. |
| GHSA-4633-3j49-mh5q, cache confusion for request bodies with invalid UTF-8 | moderate | Applies by version. |
| GHSA-4c39-4ccg-62r3, unbounded Server Action payload in the Edge runtime | moderate | No. No Server Actions. |
| GHSA-p9j2-gv94-2wf4, SSRF in rewrites via attacker-controlled destination hostname | high | No. No `rewrites`. |
| GHSA-955p-x3mx-jcvp, unauthenticated disclosure of internal Server Function endpoints | moderate | No. No Server Actions or Server Functions. |

Counted that way, 11 of the 21 do not reach this application at all, and 10
apply by version through the App Router and middleware request path. That does
not make the upgrade optional. It does mean the residual risk is denial of
service and cache behaviour on a preview that is noindex, protected and not yet
carrying real users, rather than remote code execution or data disclosure on a
live public product. The upgrade should happen before E1 exposure, not after.

## PKG-NEXT16-SECURITY slice C, the Content Security Policy as it now stands

Written 2026-08-03 against commit 8bf173c, preview deployment
dpl_4jH9SA8VpnbMh1oh8zcxbs5rtYTP on branch `next16-security`, serving from
https://satmarkets-iufa00ogr-sat-markets.vercel.app. **This section supersedes
"Content Security Policy, the pre-nonce position" below.** That section was
written on 2026-08-02 against next@14.2.35 and is kept unedited, because the
argument it makes for `'unsafe-inline'` is the argument this slice retired, and
retiring an argument is only legible if the argument is still there to read.

Three things changed. The third party script origin left the policy, because the
file it named is now served from this origin. The policy acquired a per-request
nonce, because the advisory that forbade one is fixed in the version this
repository now runs. And the policy stopped living in `next.config.mjs`, because
it acquired a second emitter and two hand-written copies of a directive list are
two policies waiting to disagree.

### The third party origin is gone

`https://unpkg.com` was in `script-src` and `connect-src` for one reason: the
right to left text plugin that makes Arabic labels render correctly on the map
was loaded from it at runtime. The plugin is now vendored at
`public/vendor/mapbox-gl-rtl-text-0.2.3/`, taken from the npm registry tarball
with the publisher integrity hash checked before extraction, and loaded through
`src/lib/rtlTextPlugin.ts` from a same origin path that `'self'` already covers.
The provenance, the licence obligation and the upgrade procedure are in
`docs/vendored-third-party.md`; this document records only the policy effect,
which is that `script-src` now names no origin other than this one.

That claim is held in two places at once. `src/lib/csp.test.ts` asserts that
`script-src` contains no `http` source and that `connect-src` is an exact closed
list, and `src/lib/rtlTextPlugin.test.ts` asserts that no source file outside the
plugin helper names the removed origin at all. Neither the policy nor the code
can reintroduce it alone.

### The nonce, and the advisory that used to forbid it

The pre-nonce section below argues that this application cannot use a nonce
because Next.js 14.2.35 carries GHSA-ffhc-5mcf-pf4q, and that adding one would
trade a known weakness for a known vulnerability. That was correct when it was
written and is not correct now. The advisory, CVE-2026-44581, is titled
cross site scripting in App Router applications using CSP nonces, is rated
Moderate at CVSS 4.7, affects `>= 13.4.0 < 15.5.16` and `>= 16.0.0 < 16.2.5`,
and is patched in 15.5.16 and 16.2.5. Slice B moved this repository to 16.2.12.
The stated reason for `'unsafe-inline'` therefore expired with the upgrade, and
leaving it in place would have meant keeping a compromise whose justification had
been deleted underneath it.

What the framework does with a nonce was read from the installed code rather than
from the documentation. `app-render.js` and `render.js` both take the request's
own `content-security-policy` header, or `content-security-policy-report-only` if
the first is absent, and pass it to
`next/dist/server/app-render/get-script-nonce-from-header.js`. That module finds
`script-src`, falls back to `default-src`, and returns the first source matching
`/^'nonce-([A-Za-z0-9+/_-]+={0,2})'$/`, ignoring anything malformed. So the nonce
has to be on the request for the renderer to stamp it, and on the response for
the browser to accept it, which is why it is generated in middleware and written
in both places.

`src/lib/csp.test.ts` holds a copy of that regex and checks two hundred generated
nonces against it. A nonce the framework silently rejects is worse than no nonce,
because the header would then claim a protection the document does not carry.

### The part of the advisory that is still this application's problem

The framework bug is fixed. The shape of it is not, because the mechanism it
exploited is the intended mechanism: the renderer reads the nonce out of a
request header, and a request header is something a client sends. Without a
defence, a visitor could put a chosen nonce on the request, have the renderer
stamp it on the framework's inline scripts, and know in advance a value that the
policy trusts.

`src/middleware.ts` therefore deletes both `content-security-policy` and
`content-security-policy-report-only` from the copied request headers before
setting its own, and `src/lib/csp.test.ts` fails if the delete ever moves after
the set. This is application side work that the framework upgrade does not do for
you and that nothing warns about.

### What was measured before deciding, and what it cost

The instruction for this slice was not to force every public page into dynamic
rendering without measuring the cost. The measurement is a matched pair of build
route tables, one from commit 2cfbcdc before the change and one from commit
8bf173c after it, and they are identical entry for entry. Three routes in the
whole application are prerendered as static content: `/[locale]/proto`,
`/icon.svg` and `/robots.txt`. Everything else was already server rendered on
demand before this slice touched anything.

Nothing was forced dynamic, and the reason is structural rather than lucky. A
nonce reaches the renderer through the request headers and is injected by the
framework itself, so no component has to call `headers()` and no route acquires a
dynamic dependency. The cost of the nonce is therefore not a rendering mode
change at all. It is one page.

`/[locale]/proto` declares `export const dynamic = "force-static"`, so its HTML
was produced at build time when no nonce existed, while middleware still runs on
the request and still puts a nonce in the response header. Fetched from the
deployment, that page returns twenty eight script tags of which none carry a
nonce. Under report only that is a console listing. Under enforcement the eleven
`<script src>` chunks would still load, because `'self'` covers them, and the
fifteen framework inline scripts would be blocked, so the page would not hydrate.
It is an internal, noindexed design system reference, which is why this is a
recorded blocker to enforcement rather than a reason to abandon the nonce, but it
is the one thing that must be resolved before the header changes name.

### Alternatives, and why each was closed on structure rather than preference

Hashes were considered first, because a hash needs no per-request plumbing. They
cannot work here. The App Router serves its flight data in inline scripts whose
content varies per request, so there is no stable digest to enumerate at build
time.

Subresource integrity was considered second. It is impossible for the plugin load
that motivated this slice, because maplibre passes the URL to `importScripts`
inside a worker and there is no element to carry an `integrity` attribute.
Separately, `experimental.sri` does exist in 16.2.12, and Turbopack does handle
its manifest, but it covers `<script src>` elements only. It cannot cover inline
flight data, so it is not a substitute for a nonce and was not adopted on the
strength of being easier.

`'strict-dynamic'` was rejected on what it costs rather than on what it gives.
`'self'` already covers the chunk files the framework injects during navigation,
so `'strict-dynamic'` adds nothing this application needs, and it would cause
`'self'` to be ignored, which makes correctness depend on every dynamically
inserted script being inserted by an already trusted one. That is a stronger
claim than this application can currently verify, so it is not made.

`'unsafe-inline'` was kept alongside the nonce, which looks like a contradiction
and is not. A browser that understands nonces ignores `'unsafe-inline'` for the
whole directive as soon as a nonce source is present. That is specified
behaviour, and it was confirmed by measurement rather than assumed: a local page
served under `script-src 'nonce-x' 'unsafe-inline'` still raised a
`script-src-elem` violation for an unnonced inline script, and under enforcement
that script did not run. A browser too old to understand nonces ignores the nonce
instead and falls back to exactly the position this application already shipped.
So the pair is better in every browser and worse in none.

`style-src` still carries `'unsafe-inline'` and a nonce cannot help it. Nonces
apply to elements, and the 565 inline `style` attributes across the components
have no element of their own to carry one. Removing it is a refactor into
classes, not a header change, so it is not part of this slice.

### One measurement that reversed an assumption

The working assumption was that every unnonced inline script in the document
would have to be given a nonce, including the JSON-LD structured data blocks,
which would have made this a change across many components rather than a change
to a header. That was tested rather than believed, using Chromium from the
sandbox against a local server, with isolated cases and a control: a page with
only a JSON-LD block produced no violation, a page with a JSON-LD block plus an
unnonced control script produced exactly one violation at the control's line, and
under enforcement the control did not run while the JSON-LD remained in the
document. An unnonced `<script type="application/ld+json">` does not violate
`script-src`, which matches the CSP treatment of data blocks.

The caveat travels with the finding: this was measured in Chromium 141 only. It
was not checked in Safari or Firefox, and it should be checked there during the
live pass, because the whole enforcement decision rests on the deployed pages
having no unnonced executable inline script left.

### Where the policy lives now

`src/lib/csp.mjs` is the only file that writes a directive. It is `.mjs` rather
than `.ts` because it has two importers that cannot both read TypeScript:
`next.config.mjs` is loaded by the framework's config loader before any
TypeScript pipeline exists, and `src/middleware.ts` is bundled for the edge
runtime. `allowJs` in `tsconfig.json` means the middleware still gets types from
the JSDoc.

There are two emitters because a nonce is per request and `headers()` in
`next.config.mjs` is evaluated once at build time. The config emits the nonce
less policy, which is what keeps `/api`, `/auth`, `/_next/static`, `/_next/image`
and every dotted path covered, since the middleware matcher excludes all of them.
Middleware emits the nonce bearing one on the routes it runs on.

It was predicted, in an earlier draft of these comments, that both headers would
arrive together on a matched route and that the browser would evaluate both. The
deployment says otherwise, and the deployment is the authority: middleware's
`res.headers.set()` replaces the value the config emitted, so every response
carries exactly one policy. That is worth knowing rather than a detail, because
`set` is load bearing. Changing it to `append` would emit two policies, and a
script would then have to satisfy both.

`src/lib/csp.test.ts` fails if either emitter writes a directive string of its
own, if the two forms differ anywhere except `script-src`, if the nonce is placed
where the framework will not find it, or if the header name changes without a
decision.

### It is still report only, and here is exactly what would change that

The header is still `Content-Security-Policy-Report-Only`. Nothing about this
slice makes it safe to enforce, and shipping a nonce is not a licence to switch
the name in the same breath.

What enforcement needs is a live browser pass that this sandbox cannot perform:
egress to the deployment is blocked here, and the Playwright probes in this
repository are configured to run against a live URL from outside it. A person
with a browser has to load, in both languages and with the console open, the home
page, the listings search with the map pane open, a listing detail page carrying a
video, the map explorer, the location picker inside the listing studio, the rent
index, the advisor and sign in, and report zero violations. The map surfaces
matter most, because the remaining third party origins only fire after
hydration. Safari and Firefox should be included, for the JSON-LD reason above.
And `/[locale]/proto` has to be resolved, by dropping `force-static`, by
excluding the path, or by accepting that one internal page does not hydrate.

Until that pass exists, the claim that the directive list is complete is a
derivation from the source, not an observation.

### What the deployment actually returned

Taken one request at a time against dpl_4jH9SA8VpnbMh1oh8zcxbs5rtYTP.

| Request | Result |
| --- | --- |
| `GET /en` | 200. One policy header, nonce bearing. 25 script tags: 12 external and 11 inline all carrying the same nonce, 2 unnonced JSON-LD data blocks. No occurrence of the removed origin in the header or the body. |
| `GET /ar/listings` | 200, `dir="rtl"`. One policy header carrying a different nonce from the `/en` request, which is what per request means. 206 script tags: 12 external and 191 inline all nonced, 3 unnonced JSON-LD blocks. |
| `GET /en/proto` | 200. One policy header, nonce bearing. 28 script tags, none nonced, because the HTML was prerendered. The enforcement blocker described above, observed rather than predicted. |
| `GET /api/listings?limit=1` | 200 `application/json`. One policy header, the nonce less form, plus the four other response headers. This is the coverage the build time header exists for, since middleware does not run here. |
| `GET /vendor/mapbox-gl-rtl-text-0.2.3/mapbox-gl-rtl-text.min.js` | 200 `application/javascript`, 206,897 bytes, sha256 `142f4fc31b4911887bacfea4df1813df67be28dfcb4c56e3f8f576f2e6fdf5d2`, identical to the hash pinned in `src/lib/rtlTextPlugin.test.ts` and to the file in the repository. The chain from the registry tarball to the served bytes is closed. |
| `GET /vendor/mapbox-gl-rtl-text-0.2.3/LICENSE.md` | 200 `text/markdown`, carrying both the Mapbox and the ICU notices, which is how the BSD-2-Clause obligation is met. |

One thing these requests cannot show. The plugin is registered lazily by the map
components after hydration, so the vendor path does not appear in the served HTML
of any page, and no server response can demonstrate that Arabic labels are
actually shaped. The bytes are proven; the shaping is not. That check belongs to
the live pass, and `docs/vendored-third-party.md` says why it matters: a plugin
that downloads and fails to parse is silent, because maplibre swallows the error
and the labels are simply wrong.

### Re-measured by slice D on the next deployment, and what it sizes

The table above was taken against `dpl_4jH9SA8VpnbMh1oh8zcxbs5rtYTP`. Slice D
repeated the nonce check against `dpl_9gSpSvRa2w4427bv1Na8jhwr3G4p` at `5464a46`
across five more surfaces, and found the same shape every time: the nonce in the
response header equalled the single distinct nonce stamped on every executable
script in the document, and the document never carried more than one nonce value.
`/en/login` and `/ar/login` carried 21 nonced scripts each, `/en` 23,
`/en/requirements` 21 and `/ar/listings` 203. On `/auth/callback`, which the
matcher excludes, the header carried no nonce and every script in the flight
payload carried `"nonce":"$undefined"`, which is the excluded case behaving as
designed rather than failing quietly. There was no mismatch anywhere.

What this sizes is the enforcement pass above. The unnonced population is the
`application/ld+json` data blocks and nothing else: 2 per page on every page
measured, 3 on listings. Those are data rather than executable script, and
whether a browser holds them to `script-src` is the specific thing the Safari and
Firefox pass has to answer. It is now a question about roughly two elements per
page, not an open-ended audit, and the slice D record in
`docs/next16-migration.md` section 11.4 carries the per-page counts.

## Content Security Policy, the pre-nonce position

**Superseded 2026-08-03 by the slice C section above.** Kept unedited. The
argument below that a nonce cannot be used, and the `unpkg.com` row in the
origin table, are both retired; read them as the record of a position, not as
current guidance.

The policy lives in `next.config.mjs` and is served on every path by the
`headers()` function rather than by middleware. That placement is deliberate:
the middleware matcher at `src/middleware.ts` excludes `/api`, `/auth`,
`/_next/static` and `/_next/image`, so a policy attached there would miss the
API surface entirely.

### Why report-only first

It ships as `Content-Security-Policy-Report-Only`. A report-only policy is fully
evaluated by the browser and every violation is printed, but nothing is blocked.
A wrong directive therefore shows up as a console line rather than as a blank
map, a dead sign-in button or a listing whose video will not play. The
instruction for this slice was to introduce the policy in report-only mode and
verify required platform resources before enforcement, and that is exactly the
sequence being followed. It stays report-only until a live pass over every
surface that loads a third party resource comes back clean.

There is deliberately no `report-uri` and no `report-to`. A reporting endpoint
means sending visitor request data to a collector, and collection is disabled
platform-wide under O17 with `COLLECTION_AUTHORISED` false. Violations are read
from the browser console during verification, by a person, on purpose.

### How the directives were derived

Every origin below was found by reading the source, not by copying a template.
The enumeration is written out here so the reasoning can be checked rather than
inherited.

| Origin | Where it comes from | Directive |
| --- | --- | --- |
| `basemaps.cartocdn.com` | `PRIMARY_STYLE` and `STYLE` in ListingsMap, LocationFacts, LocationPicker and MapExplorer. Style JSON, glyphs, sprite sheet. | `connect-src`, `img-src` |
| `tiles.openfreemap.org` | `FALLBACK_STYLE` in the same four components. | `connect-src`, `img-src` |
| `unpkg.com` | `setRTLTextPlugin("https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js")` in four map components. This is the plugin that makes Arabic labels render correctly on the map, so it is not optional. | `script-src`, `connect-src` |
| `images.unsplash.com` | `src/lib/photos.ts`, the demonstration photography. | `img-src` |
| `**.supabase.co` | Database, auth and uploaded listing media, over both HTTPS and WebSocket. | `connect-src`, `img-src` |
| `www.youtube.com`, `player.vimeo.com` | The single iframe at `src/app/[locale]/listings/[id]/page.tsx`. `src/lib/videoEmbed.ts` will only ever produce these two embed origins, a same-origin file element, or a plain link. It never frames an arbitrary URL. | `frame-src` |
| `blob:` | maplibre-gl builds its workers and its map canvas from blob URLs. | `worker-src`, `img-src`, `media-src` |
| `data:` | Inline SVG icons and font data URIs. | `img-src`, `font-src` |
| Any HTTPS host, media only | A lister may supply a direct video file at any host. A media element cannot execute. Narrowing this would silently break a legitimate listing. | `media-src` |

Not in the policy, because they are server-side only and never reach a browser:
`api.deepseek.com`, `api.anthropic.com` and `api.moonshot.ai` in
`src/lib/ai/router.ts`. `wa.me` is navigation only, which no directive governs.
There are zero `url(http` references in `src/styles`.

### The largest compromise, stated as such

`script-src` carries `'unsafe-inline'`. This is the weakest part of the policy
and it is not presented as anything else.

The App Router serves its flight data in inline `<script>` blocks. The correct
answer to that is a per-request nonce. This application cannot use one, because
Next.js 14.2.35 carries GHSA-ffhc-5mcf-pf4q, cross-site scripting in App Router
applications that use CSP nonces. Adding a nonce here would trade a known
weakness for a known vulnerability in the same header.

What `script-src 'self' 'unsafe-inline' https://unpkg.com` still does is refuse
script from any origin not named. Given that this platform will carry
lister-supplied text, media URLs and documents, that is the class it is most
exposed to. What it does not do is stop injected inline script, and no reading
of this document should suggest otherwise. The proper fix is the framework
upgrade recorded above.

`style-src` carries `'unsafe-inline'` for a duller reason: 565 inline `style`
attributes across the components, plus the map popup markup that maplibre
builds as HTML.

### What must be verified before enforcement

Enforcement is a separate decision and should not be taken until a person has
loaded, in both languages, with the console open and zero violations reported:
the home page, the listings search page with the map pane open, a listing detail
page that has a video, the map explorer, the location picker inside the listing
studio, the rent index, the advisor, and sign-in. The map surfaces matter most,
because they are where the third party origins actually fire.

## Security response headers

Measured on `GET /en` at commit dcf4cdc, before this change:

| Header | Before | After |
| --- | --- | --- |
| `content-security-policy-report-only` | absent | present, the policy above |
| `x-content-type-options` | absent | `nosniff` |
| `x-frame-options` | absent | `DENY` |
| `referrer-policy` | absent | `strict-origin-when-cross-origin` |
| `permissions-policy` | absent | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` |
| `x-powered-by` | `Next.js` | absent |
| `strict-transport-security` | `max-age=63072000; includeSubDomains; preload` | unchanged, supplied by Vercel |
| `x-robots-tag` | `noindex, nofollow` | unchanged, from middleware |
| `cache-control` on a private route | `private, no-cache, no-store, max-age=0, must-revalidate` | unchanged, from middleware |

Each addition has a reason rather than a checklist entry behind it.
`nosniff` matters because this platform accepts uploaded documents, and content
sniffing decides what an uploaded file is by guessing. `X-Frame-Options: DENY`
restates `frame-ancestors 'none'` for anything that only understands the older
header, which is relevant while the policy above is still report-only and
`frame-ancestors` is therefore not being enforced. `Referrer-Policy` matters
because a path here can name a listing, a requirement or an account surface, and
the default would send that full path to a third party host on outbound
navigation. `Permissions-Policy` denies capabilities the application never asks
for. Removing `x-powered-by` removes a version targeting hint that nothing needs
to publish.

## Rate limiting, the honest position

The instruction for this slice was not to add decorative per-instance rate
limiting and call it protection. Nothing was added. What follows is what is
already there and what it is actually worth.

`src/lib/ratelimit.ts` contains two limiters.

`allow(name, req, limit = 15, windowMs = 60000)` is an in-memory sliding window
keyed on the client IP. Its own comment already says what it is: per-instance
only, so on a serverless cold-start fan-out it does not share state. Every cold
start begins with an empty bucket, so a fan-out of concurrent instances each
grant the full quota. Against a determined caller it is close to decorative, and
the file says so rather than implying otherwise. It is still worth keeping, for
two reasons: it costs nothing, and it does stop the ordinary case of a single
warm instance being hammered by one client, which is most accidental abuse.

`allowShared(name, req, limit = 15, windowSec = 60)` is the durable version. It
posts an `INCR` plus an `EXPIRE ... NX` pipeline to an Upstash or Vercel KV REST
endpoint with a 1500 ms abort timeout, so the window is shared across every
instance. If no store is configured, or the store is unreachable, or the
response is malformed, it degrades to `allow()` and returns `durable: false`
rather than silently pretending. `limiterIsDurable()` reports the same fact to
any caller that wants to check first.

The gap is in adoption, not in design. 32 route files under `src/app/api` import
from `@/lib/ratelimit`. Exactly one of them, `src/app/api/advisor/route.ts`,
calls `allowShared`. Every other protected route is on the per-instance limiter.

No store is configured today, so `limiterIsDurable()` returns false in
production and even the advisor route is running on the degraded path. The
interface is ready and the environment behind it is empty. That is the true
state, and it does not change until the owner authorises a store.

Migrating the other 31 routes to `allowShared` is not useful before a store
exists, because without one it is the same limiter with an extra await. It
should be done as part of turning the store on, in one change, so that the
before and after can be measured.

## The smallest shared production-capable options, documented not installed

Owner ruling 7 stands: do not buy services, contact vendors or sign agreements.
Both options below were researched from public documentation on 2026-08-02 and
are recorded for the owner's decision. Neither has been installed, no account
has been created, and no environment variable has been set.

### Option 1, Upstash Redis, the store `allowShared` already speaks to

This requires no code change at all. `allowShared` already posts to the Upstash
REST pipeline format, so the entire integration is two environment variables in
the Vercel project:

`KV_REST_API_URL` or `UPSTASH_REDIS_REST_URL`, and `KV_REST_API_TOKEN` or
`UPSTASH_REDIS_REST_TOKEN`.

Published pricing at https://upstash.com/pricing/redis:

| Item | Figure |
| --- | --- |
| Free tier | 256 MB data, 500,000 commands per month, 10 GB monthly bandwidth |
| Pay as you go, commands | 0.20 US dollars per 100,000 commands |
| Pay as you go, storage | 0.25 US dollars per GB per month, first 1 GB free |
| Pay as you go, bandwidth | free to 200 GB per month, then 0.03 US dollars per additional GB |
| Fixed plans | from 10 US dollars per month at 250 MB, up to 1500 US dollars per month at 500 GB |
| Read region replicas | 5 US dollars per month up to 750 US dollars per month |
| Operational commands | AUTH, HELLO, SELECT and PING are not charged |

Each rate limit check costs two commands, the `INCR` and the `EXPIRE`. The free
tier's 500,000 commands per month therefore covers roughly 250,000 limited
requests per month, which is far above anything an E1 pilot will generate. On
present traffic this option is free, and the first real cost appears only at a
scale this platform does not have.

The operational caveat is that the store becomes a dependency on the request
path for every route that uses it. `allowShared` already bounds that at 1500 ms
and degrades rather than failing the request, which is the correct behaviour,
but it is a new external call in a place that previously had none.

### Option 2, Vercel WAF rate limiting, at the edge

Documentation at https://vercel.com/docs/vercel-firewall/vercel-waf and
/rate-limiting and /usage-and-pricing, last updated 2026-06-16.

This is a different shape of answer. It runs before the request reaches the
application, so it costs nothing on the request path, requires no code, and
mitigated traffic does not incur CDN Requests or Fast Data Transfer. It is
configured entirely in the Vercel dashboard under Firewall, and published
changes take effect globally within about 300 ms with rollback available through
the Firewall audit log.

| Resource | Hobby | Pro | Enterprise |
| --- | --- | --- | --- |
| Rate limit rules | 1 per project | 40 per project | 1000 per project |
| Counting keys | IP, JA4 digest | IP, JA4 digest | plus User Agent and arbitrary header keys |
| Counting algorithm | fixed window | fixed window | fixed window, token bucket |
| Counting window | 10 s minimum, 10 minutes maximum | same | 10 s minimum, 1 hour maximum |
| Included requests | 1,000,000 allowed requests | usage based | custom |
| Custom firewall rules, total | up to 3 | up to 40 | up to 1000 |
| IP blocking, project level | up to 3 | up to 100 | up to 1000 |
| Managed rulesets, including OWASP CRS | not available | 4 KB of each inspected request included | contact sales |
| Account level IP blocking | not available | not available | available |

Two limitations matter for this platform. Counters are tracked per region, so
traffic matching one key across several regions can exceed the configured limit
in aggregate. And on Hobby there is exactly one rate limit rule per project,
which means one policy for the whole application rather than a different limit
for the advisor than for signup.

Bot defence specifically: DDoS mitigation, IP blocking and custom rules are free
on every plan. Custom rules can take a Challenge action, which is the closest
thing to bot filtering available below Enterprise. The OWASP managed ruleset
begins at Pro. Full managed rulesets and JA3 legacy keys are Enterprise only and
require contacting sales, which owner ruling 7 forbids doing from here.

### What is actually recommended

Both, in a specific order, and neither yet.

The Vercel WAF rule is the smaller step and should come first. It costs nothing
on the current plan, needs no code, no account, no new vendor and no data
processing agreement, and it stops abusive volume before it reaches a function
at all. One fixed window rule keyed on IP across `/api/*` would cover the whole
API surface.

That last sentence is withdrawn. The owner narrowed the scope on 2026-08-03, and
PKG-NEXT16-SECURITY slice F then measured what an ordinary client actually sends,
which changed the rule: no single threshold serves both the routes that spend
money and a typeahead a person drives with a keyboard. The section at the end of
this file, "the one WAF rate limit rule, prepared and not applied", carries the
measurement, the narrowed scope and the owner-action card, and it supersedes this
paragraph.

Upstash then remains worthwhile for the application-level limits, because per
route limits with different thresholds are something the edge rule cannot
express on Hobby, and because `allowShared` is written and waiting. It is a new
sub-processor holding IP addresses in a counter key, which is a real privacy
consideration and needs recording in the processing position before it is turned
on, not after.

Neither is installed. Both need Saleem.

## Limitations of this baseline

Four, stated before anyone relies on the document.

The CSP has not been observed under enforcement, only reasoned from the source
and shipped in report-only. Until a person walks the map and video surfaces in
both languages with a console open, the claim that the directive list is
complete is a derivation, not an observation. Slice C narrowed what is unobserved
without closing it: the headers, the nonce and the vendored plugin bytes have now
been read back off a live deployment, and one enforcement blocker at
`/[locale]/proto` has been observed rather than predicted, but no browser has
executed a page under this policy and the Chromium 141 finding about JSON-LD data
blocks has not been repeated in Safari or Firefox.

The advisory reachability table is a source-level assessment. It establishes
that the vulnerable code paths are not called from this repository. It does not
prove the framework never reaches them internally on a request this application
serves.

`npm audit` sees the dependency tree, not the runtime. It says nothing about the
Vercel platform, Supabase, or any configuration weakness.

Nothing here covers authorization or row level security. The two outstanding
Supabase RLS advisories, on `public.spatial_ref_sys` and `public.map_anchors`,
remain owner-side actions and are recorded in the status ledger rather than in
this document. They are not addressed by this slice.

## Decisions this document needs from the owner

Three, none of which block the rest of PKG-E1-READINESS.

Whether to authorize the Next.js 14 to 15 or 16 upgrade as its own package with
its own regression evidence. The recommendation is yes, before E1 exposure, and
that it is scoped as a package rather than folded into product work.

Whether to create the one Vercel WAF fixed window rate limit rule on `/api/*`.
This costs nothing on the current plan and needs only dashboard configuration.

Added by slice C, and the only one of these that needs a browser rather than a
decision: whether to run the live console pass described above so the policy can
move from report only to enforced. It costs one person perhaps twenty minutes in
two languages and cannot be done from this sandbox at all. Without it the policy
blocks nothing, which is the current position and is stated as such rather than
implied away.

Whether to authorize an Upstash Redis store so `allowShared` becomes durable,
accepting a new sub-processor that holds client IP addresses in short lived
counter keys, and accepting that the 31 remaining routes would then be migrated
onto it in one measured change.

## Verification of this baseline

Shipped at ac05525, production deployment dpl_GzRbErecMZ17EKS44DNxQJsGdiDY,
READY, serving from https://satmarkets-4mi28jetc-sat-markets.vercel.app.

Gates before shipping: `tsc --noEmit` clean, 1739 tests passing with 0 failures,
`ar-lint: clean`, prose scan GATE 0 in 0 files and BASE 372 in 16 files, and all
four Playwright probes passing (reflow 14 viewport renders, radio 5 groups,
shell 36 measurements, responsive 234 measurements). The production build is the
Vercel READY state, because `npm run build` cannot complete in this sandbox with
Google Fonts unreachable.

Live checks after shipping, taken one request at a time:

| Surface | Result |
| --- | --- |
| `GET /en` | 200. All five new headers present, `x-powered-by` absent, `x-robots-tag: noindex, nofollow`, `<html lang="en" dir="ltr">`, 14 script sources, 1 preload, 3 stylesheets. |
| `GET /ar` | 200. Identical policy string to `/en`, byte for byte. `<html lang="ar" dir="rtl">`, 48050 Arabic characters, 0 Arabic-Indic digits. |
| `GET /ar/listings` | 200. Identical policy string. All five headers present, 0 Arabic-Indic digits. |
| `GET /api/listings?limit=1` | 200 `application/json`. All five headers present and `x-powered-by` absent on a route handler response, which is the case that would have been missed if the policy had been attached to middleware. |
| `GET /api/health` | 404 as expected, and the headers are still applied, confirming they reach the whole path space rather than only rendered routes. |

One thing the server response cannot show. The map components load their style
JSON, tiles, sprites and the right to left text plugin from the browser after
hydration, so none of the third party origins appear in the served HTML of
`/ar/listings`. Their presence in the policy is derived from the source, and
confirming that the policy does not block them requires the interactive pass
described above under enforcement. That pass has not been done, which is
precisely why the header is report-only.

---

## PKG-NEXT16-SECURITY slice F, the one WAF rate limit rule, prepared and not applied

This section replaces the recommendation two sections above under "What is
actually recommended", and the matching lines in
`docs/handback-pkg-e1-readiness.md`. Those said one fixed window rule keyed on IP
across `/api/*` would cover the whole API surface. The owner withdrew that scope
on 2026-08-03 and the status ledger records the withdrawal: a policy over every
API path may not be applied without first measuring the request bursts the real
client generates in ordinary use. This slice does that measurement, and the
measurement changed the rule.

Nothing here has been applied. No rule exists on the project. The card at the end
is written so that the owner can paste it, look at it, and still be one command
away from either publishing it or throwing it away.

### Why the blanket scope was wrong, in one number

An ordinary reader browsing listings sends between 8 and 26 requests to `/api` in
a two minute tour of the whole public site. Twenty one of the twenty six are one
route, `/api/places`, and they come from a search box. A limit set low enough to
be protection for the routes that cost money would have been tripped by a person
typing a district name. A limit set high enough not to trip on that person would
have been no protection at all. The blanket scope forced one threshold to serve
both, and there is no number that does.

Removing one route from the scope removes the conflict entirely, and the rest of
this section is the evidence for that claim.

### The inventory: what is actually reachable without a session

There are 38 route files under `src/app/api`. Twenty eight of them call
`getSession` before doing anything, and two more sit behind `CRON_SECRET`. That
leaves ten routes an anonymous request can reach, and they are not equivalent to
each other.

| Route | Methods | In-process limit | What it costs | Class |
| --- | --- | --- | --- | --- |
| `/api/advisor` | POST | `allowShared` 15 per 60 s | a language model call per request | paid |
| `/api/advisor/shortlist` | POST | `allow` 5 per 60 s | progressive relaxation query, up to three passes | expensive read |
| `/api/search` | POST | `allow` 15 per 60 s | `llmParse`, a language model call | paid |
| `/api/signup` | POST | `allow` 6 per 60 s | writes a signup row | unauthenticated write |
| `/api/requirements` | POST | `allow` 8 per 60 s | writes a requirement row | unauthenticated write |
| `/api/requirements` | GET | `allow` 60 per 60 s | ordinary listing read | read |
| `/api/geocode` | GET | `allow` 30 per 60 s | third party geo gateway quota | paid, third party |
| `/api/geo/resolve` | GET | `allow` 20 per 60 s | an outbound fetch to a URL the caller supplies | egress |
| `/api/places` | GET | `allow` 30 per 60 s | third party geo gateway quota | paid, third party, and the typeahead |
| `/api/index/segments` | GET | `allow` 60 per 60 s | cached read, `revalidate = 1800` | read |
| `/api/saved` | GET | none | read | read, and unlimited |

Two things in that table are worth saying out loud rather than leaving in a
column. `/api/saved` has no limiter at all, and neither do
`/api/listings/[id]/status`, `/api/requirements/[id]`, `/api/cron/expire-permits`
and the two admin provisioning routes; the last three are behind a session or a
secret, so the omission only matters on `/api/saved`. And exactly one route in
the whole application uses the durable limiter. The other 31 importers of
`@/lib/ratelimit` call `allow`, which is per instance, which on serverless means
a fan-out of cold starts each hands out the full quota. That is the position this
rule is meant to improve, and it is not fixed by this rule either. It is stated
again below.

### The measured normal peak burst

`scripts/burst-probe.mjs` drives the real production build with a real browser
and records every request the page makes, with a millisecond timestamp and the
path it went to. Four sessions: an English listing browse that uses both public
search boxes and walks five filtered views, a tour of the six read heavy market
surfaces, the same browse in Arabic, and an advisor conversation of four
questions asked back to back. Nothing about the client is simulated. The
typeahead debounce, the abort on each keystroke, the router's document requests
and the advisor's two call fallback are whatever the shipped code does.

The variable that decides the answer is typing speed, and it is the one a
careless probe gets wrong. Both public typeaheads debounce at 220 ms. A fast
typist never lets that timer expire, so an eight letter word costs one request. A
slower or hunt and peck typist lets it expire between every letter, so the same
eight letter word costs eight. The second person is not attacking anything. So
the probe runs twice over the same script, once at 140 ms between keystrokes and
once at 320 ms, and reports both.

| Arm | Total requests | Total to `/api` | Peak `/api` per 60 s | Peak per 10 s |
| --- | --- | --- | --- | --- |
| 140 ms between keystrokes | 785 | 8 | 8 | 3 |
| 320 ms between keystrokes | 815 | 26 | 24 | 16 |

Three times the API traffic, from the same person doing the same thing, because
of how fast they type. That is the whole argument against the blanket scope in
one table.

Now split the same two runs by whether the route is one this rule would cover.

| Arm | Peak per 60 s, covered routes | Peak per 60 s, `/api/places` |
| --- | --- | --- |
| 140 ms between keystrokes | 5 | 3 |
| 320 ms between keystrokes | 5 | 21 |

The covered set peaks at five requests per sixty seconds and does not move when
typing speed changes. Every request that typing speed does move is
`/api/places`. The two arms recorded exactly the same covered traffic, `POST
/api/advisor` four times and `POST /api/search` once, which is one person asking
four advisor questions in about twenty five seconds with one of them falling
through to search mode.

So the rule excludes `/api/places` and the conflict disappears. What is given up
by excluding it is real and is recorded at the end: the third party geo quota
behind the typeahead keeps only its per instance limiter. What is bought is a
threshold that can be set from evidence instead of from fear.

### What the covered set is, and why each route is in it

Six condition groups, OR combined, inside one rule, because Hobby allows exactly
one rate limit rule per project and the whole design has to fit in it.

`/api/advisor` by prefix, which also catches `/api/advisor/shortlist`. These are
the two routes where a request costs money on every call, and the first is the
only route in the application already carrying the durable limiter, which is a
statement about how the risk was ranked when that limiter was written.

`/api/search` exactly, for the same reason: it calls a model.

`/api/signup` exactly and `/api/requirements` with the method pinned to POST.
These are the two places an anonymous request writes a row. The method has to be
pinned because `GET /api/requirements` is ordinary browsing on the requirements
page and must not be counted. Measured traffic to both POST paths in ordinary use
is zero, because a person signs up once.

`/api/geocode` exactly and `/api/geo/resolve` exactly. The first spends a third
party quota. The second makes an outbound fetch to a URL the caller supplies,
which is a shape worth a ceiling for reasons beyond cost. Both are reached from
the lister's location picker, which sits behind a session in the product even
though the routes themselves do not check one, so measured traffic in an
anonymous browse is zero for both.

Not `/api/places`, for the reason above. Not `/api/index/segments` or
`/api/saved`, which are reads that cost a cached query. Not any route behind
`getSession`, because a WAF rule cannot see the session and would be counting the
wrong thing.

### The threshold, and the arithmetic behind it

Sixty requests per sixty seconds, keyed on IP address, fixed window.

Measured ordinary peak on the covered set is 5 per 60 s for one person. Sixty is
twelve times that. Read as the shared address case the ledger asks about, it is
twelve colleagues behind one office egress address each simultaneously at their
own personal peak, which for the advisor means each of them asking a question
every six seconds without pause. Read as the single client case it is one caller
submitting a model backed request every second for a minute. A brokerage office
does not do the first and a reader does not do the second.

The counting key is IP alone. JA4 digest is the only other key Hobby offers and
adding it makes the key a pair, which does help slightly on the shared address
case because colleagues on different browsers would then count separately. It was
rejected anyway: an attacker can vary a TLS fingerprint far more easily than
colleagues can vary their browsers, so adding JA4 multiplies an attacker's quota
by more than it relieves the office. The honest tradeoff is to key on IP and set
the threshold high enough that the office is comfortable, which is what the
number above does.

The window is 60 s. Hobby allows 10 s to 10 minutes and fixed window only. Sixty
seconds matches the window the application's own limiters already use, so a
single number describes both layers.

### The card

Prepared. Not applied. Everything below is for the owner to run, and the first
command changes nothing on its own: `vercel firewall rules add` stages a draft,
and drafts do not affect production traffic until `vercel firewall publish`.

**Counting key.** IP address, one counter per address.

**Paths covered.** `/api/advisor` and everything under it, `/api/search`,
`/api/signup`, `POST /api/requirements`, `/api/geocode`, `/api/geo/resolve`.

**Paths deliberately not covered.** `/api/places`, `/api/index/segments`,
`/api/saved`, `GET /api/requirements`, and every route behind a session.

**Threshold and window.** 60 requests per 60 seconds, fixed window.

**First action: log, not deny.** The measurement above was taken in a sandbox
against a database with no listings in it, by one scripted reader. It is the best
evidence available from here and it is not production. So the rule goes on in
observation mode first and the owner reads what it would have done before it does
anything.

```bash
vercel firewall rules add "SAT anonymous paid and write paths" \
  --description "Fixed window ceiling on the unauthenticated routes that spend money or write rows. Measured ordinary peak is 5 per 60 s per client. Excludes /api/places, which is the browsing typeahead." \
  --condition '{"type":"path","op":"pre","value":"/api/advisor"}' \
  --or \
  --condition '{"type":"path","op":"eq","value":"/api/search"}' \
  --or \
  --condition '{"type":"path","op":"eq","value":"/api/signup"}' \
  --or \
  --condition '{"type":"path","op":"eq","value":"/api/requirements"}' \
  --condition '{"type":"method","op":"eq","value":"POST"}' \
  --or \
  --condition '{"type":"path","op":"eq","value":"/api/geocode"}' \
  --or \
  --condition '{"type":"path","op":"eq","value":"/api/geo/resolve"}' \
  --action rate_limit \
  --rate-limit-window 60 \
  --rate-limit-requests 60 \
  --rate-limit-keys ip \
  --rate-limit-action log \
  --yes
```

Conditions inside a group are AND combined and `--or` starts a new group, which
is why the method pin sits immediately after the `/api/requirements` path and
before the next `--or`.

**Before publishing anything.**

```bash
vercel firewall diff
vercel firewall rules list --expand
vercel firewall rules inspect "SAT anonymous paid and write paths"
```

`diff` shows the staged change against what is live. If any of it reads wrong,
stop there: nothing has happened yet.

**Publishing the observation mode rule.**

```bash
vercel firewall publish --yes
```

**Expected behaviour while in observation mode.** No request is blocked, delayed
or altered. Traffic over the threshold is recorded. Ordinary readers see no
change whatsoever, which is the point of running this arm first.

**Verification, after a week or after whatever period covers a normal working
pattern.**

```bash
vercel firewall overview
vercel logs --since 7d --json
```

The question to ask of that output is narrow: did the rule ever count past sixty
for an address that turns out to be a real office, and if it did, what was the
address doing. If the answer is that only obviously automated traffic reached the
ceiling, the rule is ready to enforce. If a real office reached it, the threshold
moves up and the observation period restarts. Either outcome is a better decision
than the one available today.

**Turning it on, once the observation says it is safe.**

```bash
vercel firewall rules edit "SAT anonymous paid and write paths" \
  --rate-limit-action deny --yes
vercel firewall diff
vercel firewall publish --yes
```

Read the status code the mitigation returns off the first observation rather than
assuming it. The documentation for the CLI does not state it for this action, and
the client code in `src/lib/useAdvisorChat.ts` treats a non-OK response as a
failed turn either way.

**Rollback, one command at each stage.**

Before publish, at any point, discard everything staged:

```bash
vercel firewall discard --yes
```

After publish, take the rule out of the path without deleting it:

```bash
vercel firewall rules disable "SAT anonymous paid and write paths"
vercel firewall publish --yes
```

Or remove it entirely:

```bash
vercel firewall rules remove "SAT anonymous paid and write paths" --yes
vercel firewall publish --yes
```

Disable is the one to reach for first. It keeps the rule and its history, and the
matching `rules enable` puts it back.

### What this rule does not do, stated plainly

It is not authorization. Every covered route still has to check who is calling
and what they may do, and the WAF cannot see a session.

It is not input validation. The rule counts requests and does not look at them.

It does not make `allow` durable. Thirty one route files still call the per
instance limiter, and a serverless fan-out still hands each new instance a fresh
bucket. The Upstash decision recorded above is unaffected by this rule and is
still the only thing that fixes that.

Its counters are tracked per region. Traffic from one address spread across
several regions can exceed sixty per minute in aggregate. On a project serving
`iad1` today this is close to theoretical, and it is recorded because it will
stop being theoretical if the project ever runs in more than one region.

It leaves `/api/places` covered only by a per instance limiter, which is a
deliberate trade and the reason the whole rule is expressible in one condition
set. If the third party geo quota ever becomes the thing that hurts, the answer
is a per route limit, which is the Upstash path and not this one.

And it is one rule. Hobby allows exactly one rate limit rule per project, so
there is no version of this that gives the advisor a tighter ceiling than signup.
The threshold is the loosest of the six routes' needs, by construction.

### How to reproduce the measurement

```bash
npx next build && npx next start -p 4321
node scripts/burst-probe.mjs
```

Flags: `BURST_BASE` for the origin, default `http://localhost:4321`,
`BURST_CHROMIUM` for the browser binary, default `/opt/pw-browsers/chromium`, and
`BURST_OUT` for the JSON, default `/tmp/burst.json`. The JSON carries every
`/api` request with its arm, its session, its offset in milliseconds and its
path, so the peaks in the tables above can be recomputed rather than trusted.

The caveat on all of it: the sandbox has no database, so the listings grid is
empty and no listing detail page was opened from a card. Those pages render on
the server and fetch nothing from `/api` for an anonymous reader, so the covered
set is unaffected, but the figure for total site traffic is a floor rather than a
measurement.

## PKG-NEXT16-SECURITY release-correction batch, the rulings of 2026-08-03

An independent review of the package at `c640f42` accepted it conditionally and
returned five rulings that this section records so they are not carried only in a
conversation. Two of them are about this document's open questions and are
answered here. The rest are recorded in `docs/status-ledger.md` and in
`docs/handback-pkg-next16-security.md`.

The review tested the deployed branch in a real browser across the home page,
listings, listing detail, the map, the rent index, the advisor, sign in and
`/proto`, in English and Arabic, at a 390 pixel mobile viewport. Language and
direction were correct on every route, horizontal scroll width matched the
rendered viewport, and there were no console errors, hydration failures or
policy warnings. The `/proto` nonce gap was confirmed as described above.
Authenticated write journeys were not exercised.

### Content Security Policy: report only stays, through this merge

The policy is not enforced in this batch. That is a decision, not an omission,
and the reasoning is narrower than the section above anticipated.

The live browser evidence on the public routes is now clean, which closes most
of the pass that section asked for. What it does not close is the authenticated
half. Nobody has yet loaded the dashboard, the listing studio or the location
picker with a session and a console open, and those are the surfaces where the
third party origins in the policy actually fire hardest. Enforcing a policy whose
riskiest routes have never been observed would be trading a real risk of breaking
a signed in lister's page for a theoretical gain on pages that already report
clean.

`/[locale]/proto` remains the second reason. It is `force-static`, so it renders
at build time, so it cannot carry a per request nonce. It is an internal page
carrying `noindex`, and the temptation is to widen the policy or to add a path
exception so that enforcement can proceed. Both are refused. A public security
policy is not weakened to accommodate an internal page, and a broad exception is
worse than the gap it papers over because it outlives the page that motivated it.
The correct fix is to stop the page being force static, or to accept that one
internal page does not hydrate under an enforced policy, and neither is this
batch's work. It is recorded as launch hardening.

So the position after this merge is unchanged in mechanism and better in
evidence: the header is still `Content-Security-Policy-Report-Only`, the public
routes have now been observed clean in a real browser in both languages, the
authenticated surfaces have not, and `/proto` is a known, named, unresolved gap
rather than a surprise waiting for whoever flips the header.

### The WAF rule: accepted in principle, applied on a schedule, not now

The six route design in the section above is accepted as designed, including the
exclusion of `/api/places`, which stays excluded. It is not applied during this
code batch, because a rule whose threshold came from a sandbox measurement should
meet real traffic before it meets a decision.

The sequence is fixed. The rule goes on in log and observation mode when ELITE-1
participant traffic begins, not before, so that the first thing it observes is a
person rather than a probe. It stays in observation through the pilot and through
the first meaningful week of genuine usage, where meaningful means a week in
which real listers and real readers used the product rather than a week in which
the calendar advanced. Only after a false positive review of what the rule would
have blocked does it move to deny, and if that review finds a real office at the
ceiling the threshold moves up and the observation period restarts rather than
the rule being forced through.

This is an owner side action in the Vercel dashboard or CLI. The card above is
complete and unchanged.

### Upstash: still deferred, and the trigger conditions are named

No store is bought and none is configured. The deferral holds until one of three
things is true: open beta, evidence that the per instance limiter is actually
failing across instances, or real abuse observed in production. Any one of them
reopens it. None of them is true today, and the thirty one route files calling
the per instance `allow` remain the known weakness that the WAF rule above does
not fix and does not claim to fix.
