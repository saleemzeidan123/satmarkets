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

## What was changed in this slice

One dependency was upgraded, five response headers were added, and one header
was removed. Nothing else. No route logic changed, no middleware changed, and
no rate limiter was added or altered.

## Dependency vulnerabilities

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

## Content Security Policy

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
complete is a derivation, not an observation.

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
