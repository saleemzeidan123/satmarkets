# Handback, PKG-E1-READINESS

Package: PKG-E1-READINESS, six slices, WS13, WS09, WS16, WS25, WS33 and WS34.
Commissioned: 2026-08-02, in the same instruction that authorised ELITE-1 recruitment.
Closed: 2026-08-02.
Head at handback: the documentation commit that carries this file.
Last commit that changed a rendered surface: `ac05525`.
Production deployment verified: `dpl_GzRbErecMZ17EKS44DNxQJsGdiDY`, READY, `satmarkets-4mi28jetc-sat-markets.vercel.app`, `meta.githubCommitSha` `ac0552588ee14dbac2697bcb642ef27bba8ac253`.

The brief said to continue through the internal slices without pausing for intermediate
approval and return one consolidated handback. That is what this is. Every slice shipped
on its own commit and was verified live before the next began, so the package was never
carrying more than one unproven change at a time, but no approval was requested between
them.

---

## 1. What the package was asked to do, and what it did

| Slice | Workstream | Asked | Outcome |
| --- | --- | --- | --- |
| A | WS13, functional truth | Remove the falsely positive success behaviour from `/api/viewings` and `/api/signup` | Done. Both routes now refuse with `storage_unavailable` and a 503. Finding 206 raised and closed. Finding 207 raised and left open on purpose |
| B | WS09, responsive shell | Extend automated responsive evidence through 1920 px in both languages, resolve the dead 62 px `main.has-tabbar` padding if genuinely unused, preserve safe-area handling and real bottom-navigation spacing | Done. The padding was not unused, it was misplaced. Findings 208 and 209 raised and closed. A new shell probe was written to prove it |
| C | WS16, search correctness | Create the known-query test set and canonicalisation matrix, English and Arabic, verify URL persistence, back-button behaviour, canonical rules, and that developments never become districts | Done. One canonical module, 38 cases in the known-query set, no finding raised because everything it found was fixed in the same commit and none of it had been previously recorded |
| D | WS25, authentication safety | Add recorded account-enumeration coverage for signup, login, recovery and relevant error states, preserving safe generic responses while keeping recovery understandable in both languages | Done. The login form was answering four different sentences for four different account states. Findings 210 to 213 raised and closed |
| E | WS33, performance | Produce the first reproducible synthetic baseline by route family, locale and profile, add budgets from the measured application, record bundle, image, font and map behaviour and the largest causes, apply only obvious low-risk improvements | Done. Forty cells, three runs each, budgets in `docs/perf-budgets.json`, three changes applied, one axis recorded as not improved |
| F | WS34, security essentials | Address recorded high and moderate dependency vulnerabilities where upgrades are compatible, introduce CSP report-only first, do not add decorative rate limiting and call it protection, document the smallest shared production-capable option without installing paid infrastructure | Done. One dependency upgraded, one not upgradeable and analysed instead, CSP shipped report-only, nothing added to the limiter, two options costed and left to the owner |

---

## 2. The commits, separated by scope

Eight commits. Two of the six slices took two commits; the rest took one each.

| Commit | Scope | Files | Lines |
| --- | --- | --- | --- |
| `92ade4a` | Governance. Record the six rulings as decisions D34 to D37, the 90-day acceptance against O19, and recruitment authorisation | 4 | +73 / -17 |
| `031bfb3` | Slice A, WS13. A request that was not stored no longer returns or renders success | 8 | +310 / -17 |
| `d700636` | Slice B, WS09. The tab bar reservation follows the tab bar, and the responsive matrix reaches 1920 | 12 | +754 / -22 |
| `345f7a3` | Slice C, WS16. One canonical URL module, gated head labels, validated measurements, developments never rendered as districts, honest sort control, bare Arabic metre read as area | 7 | +962 / -38 |
| `dca8b16` | Slice C follow-up. The saved-search name passes the same three gates the head does | 2 | +23 / -1 |
| `d1b27c7` | Slice D, WS25. A sign-in refusal may name the request, never the account behind the address | 11 | +659 / -20 |
| `dcf4cdc` | Slice E, WS33. A performance baseline the application measured itself, and three changes it justified | 6 | +1092 / -14 |
| `ac05525` | Slice F, WS34. A report-only CSP derived from what the application actually loads, a postcss upgrade, and an honest account of the rate limiting | 4 | +475 / -10 |

Every one of the six product commits reached a READY Vercel deployment at its own SHA
before the next slice began. The governance commit and this handback commit are
documentation only.

---

## 3. Slice A, WS13, functional truth

### The exact before and after, for both routes

This is the evidence the brief asked for by name.

**`/api/signup`, before.**

```
if (!supabase) return NextResponse.json({ ok: true, note: "supabase not configured (request not stored)" });
```

HTTP 200. Body `{ ok: true, note: "..." }`. The client tests the response, not the note,
so `ok` on a 200 rendered the "Request received" card, which then lists what happens next
by role. The product made three specific promises about a request it had not written
down. The `note` field is displayed by nothing.

**`/api/signup`, after.**

```
if (!supabase) {
  console.error("[signup] not stored: no database client is configured");
  return NextResponse.json(
    { ok: false, error: "Storage unavailable. Please try again.", code: "storage_unavailable" },
    { status: 503 },
  );
}
```

HTTP 503. Body carries `ok: false` and the stable code `storage_unavailable`. The client
renders the bilingual sentence for that code. The log line names the misconfiguration and
carries no name, company, email address or phone number, which matters on a route whose
entire payload is personal data.

**`/api/viewings`, before.**

```
// This answers ok for a request it did not store, which is a defect and is
// deliberately not repaired here.
if (!supabase) return NextResponse.json({ ok: true, note: "supabase not configured (request not stored)" });
```

HTTP 200, `{ ok: true }`, confirmation panel rendered. A person who asked to see a space
was told the lister had their request when no row existed and nobody would ever read it.
The defect was known, written into the source as a comment, and had never reached the
findings register. That is recorded in the register as the wrong order, in those words.

**`/api/viewings`, after.** Identical to the signup route above, with a `[viewings]` log
prefix. The same condition, the same code, the same status as the nine other routes in
this repository that already refused it correctly. No code was invented for this case.

### Two changes that came with it

`/api/signup` used to parse its body outside a guard, so an unparseable request threw out
of the handler and Next answered a bare 500 with no code, which made the one refusal a
reader could not act on the one caused by a malformed request. It now parses inside a
`try` and falls through to the role check, which refuses with `invalid_role`.

The signup route also used to log the whole PostgREST error object. Its `details` field
quotes the failing row back, so a unique-constraint violation on the email column wrote
the applicant's email address into the log. It now logs `error.code` and `error.message`,
neither of which carries a value from the request.

`apiErrors.ts` said "File storage is unavailable" for `storage_unavailable`. That was
true of the five media surfaces the code was written for and wrong on the four row
surfaces that adopted it afterwards. Slice A adds a tenth and eleventh row surface, so
the sentence became neutral about what was being saved: "This could not be saved right
now. Try again in a moment." and the matching Arabic.

### Findings

Finding 206 raised and closed in the same commit, which is the wrong order and is stated
as such. Finding 207, the listings read that answers an empty list when it cannot reach
the store, was found while writing slice A's class guard and is deliberately left open,
because the surface that owns its fix is the public-discovery package that follows.

### Tests

`src/lib/functionalTruth.test.ts`, 222 lines, added to the explicit test file list in
`package.json`.

---

## 4. Slice B, WS09, responsive shell

The brief asked for the automated evidence to reach 1920 px in both languages, and for
the dead 62 px `main.has-tabbar` padding to be investigated and resolved "if it is
genuinely unused". It was not unused. It was misplaced, and the investigation found three
defects rather than one.

The class that reserved the space was written in a server component, which cannot call
`usePathname()`, so it could never have been conditional and was set on every route
whether or not a tab bar existed. The reservation sat on `main`, which is not the last
element in the document, so on the routes that do render a bar the footer's copyright
strip painted underneath it: 10 px at phone widths and 24.5 px at 768, in both locales.
And the probe written to measure all of this reported clean pages on its first run,
because `globals.css:7` is `html{scroll-behavior:smooth}` and a synchronous read after
`scrollTo` returns the pre-scroll position, so it had been measuring the top of every
document.

Nothing in slice B was found by reading. The arithmetic was right throughout and the
elements were wrong, which is the class of defect a browser finds and a review does not.

The fix moves the reservation onto the footer through a `--tabbar-reserve` custom
property, and introduces the chrome-tier module `src/lib/chrome.ts` with its APP,
PRODUCT and MARKETING tiers so that the question "does this route have a tab bar" is
answered once, in a client boundary, rather than assumed in a server layout. Safe-area
handling is preserved and is now tested.

One visible consequence is recorded rather than left to be discovered: on marketing
routes below 1024 px the 62 px that used to sit between page content and the footer now
sits below the copyright strip instead. Content-to-footer spacing on a phone tightens by
that much, and the space now does the job it was declared for. This is inside the brief,
which asks for the dead padding to be resolved and for real bottom-navigation spacing to
be preserved where the tab bar exists. It is not a visual redesign, which the package
excludes.

`scripts/shell-probe.mjs` is new, 334 lines. `scripts/responsive-probe.mjs` was extended.
Findings 208 and 209 raised and closed inside the slice, so the open count is unchanged.

---

## 5. Slice C, WS16, search correctness

The brief asked for a known-query test set and a canonicalisation matrix covering English
and Arabic, combinations of type, city, district, price, area, sort and empty results,
with URL persistence, back-button behaviour, canonical rules, and the guarantee that
developments never become districts.

`src/lib/search/canonical.ts` is the answer to "what does a `/listings` URL mean", stated
once, as plain functions over strings so the whole matrix can be held in
`src/lib/search/knownQueries.test.ts` without a browser, a database or a rendered page.
38 cases.

Four defects were found by reading the page against itself rather than against a
specification.

The page canonicalised the city in its body and echoed it raw in its head. The body reads
the city through `cityKey`, so `?city=riyadh`, `?city=Riyadh`, `?city=RIYADH` and
`?city=الرياض` render one identical result set. `generateMetadata` built
`?city=${encodeURIComponent(searchParams.city)}` straight from the URL, so those four
requests declared four different canonical URLs and four different three-entry hreflang
sets for one page. `crumbQs`, which feeds the `item` of the BreadcrumbList structured
data, carried the identical bug. **This is the canonical half of owner ruling 5.** The
display half was closed in `b3e2dfa`; both halves are now closed, and the canonical half
is confirmed live at `345f7a3`.

A label rendered into a title, a description or structured data was echoed from the URL.
`dealLabel`, `assetLabel` and `cityLabel` all ended in `?? t` or `prettifyKey(t)`, which
is correct for a database value not yet translated and wrong for a query string a
stranger wrote. `?deal=banana` put "banana" in the `<title>`, the `og:title` and the meta
description of a public page. React and Next escape all of it, so this was never script
injection. It was the page making a claim about a place it had never heard of, which is
the same failure class as an unattributed figure.

Numeric parameters reached the database unvalidated. `Number("abc")` is NaN and
`NaN != null` is true, so `?sz=abc` started a proximity sort whose comparator returned NaN
for every pair, and `?smin=abc` sent `gte("area_sqm", NaN)` to PostgREST. `bbox` was the
one parameter with a guard, and that guard is the shape the rest now copy.

A development was named back to the reader as a bare place. The picker and the map
bubbles both mark one; the location header, the breadcrumb and the parse chip did not.
Selecting Roshn Front from the Developments group produced a page whose URL says
`district=` and whose heading said "Roshn Front". Developments are not districts is a
platform law, so the marker now travels with the name wherever the name is printed.

Two further corrections shipped with it: the sort control is handed the computed
ordering rather than the raw parameter, so a pill can no longer read "Newest" over a
result set ordered by something else, and a bare Arabic metre in a typed query is read as
an area rather than discarded.

`dca8b16` is the follow-up: the saved-search name was built from the same parameters and
was not passing the same three gates the head passes. It does now, with 13 more lines of
test.

Slice C raised no finding. Everything it found was fixed in the commit that found it and
none of it had been previously recorded, which is stated in the ledger rather than passed
over.

---

## 6. Slice D, WS25, authentication safety

The brief asked for recorded account-enumeration coverage across signup, login, recovery
and the relevant error states, preserving safe generic responses while keeping recovery
understandable in both languages.

Signup was already correct after slice A. There is no password-recovery surface on this
platform, because recovery is the magic link. The login form was the problem, and it was
two failures at once.

Three call sites on `/[locale]/login` and the whole of `/auth/callback` rendered the
authentication library's own English sentence. The obvious failure is language: an Arabic
reader was refused in English on the Arabic build, the same class as findings 22 and 203,
in the one place not yet swept because the sentence arrived from a dependency rather than
from our source.

The failure that matters more is enumeration. GoTrue answers a failed sign-in with the
true reason: `invalid_credentials`, `email_not_confirmed`, `user_banned` or
`user_not_found`. Four sentences for four account states, obtainable by typing an address
and reading the screen. On a platform whose members are named owners, brokers and
licensed agents, that is a disclosure about a person.

`src/lib/authErrors.ts` is the third bilingual refusal table in this repository and its
defining property is the opposite of the two before it. `listingIntakeErrors.ts` and
`apiErrors.ts` exist to say precisely what went wrong. This one exists to say as little as
the platform can get away with while still leaving a way in. That is why it is a third
table rather than a section of either of the others, and why its resolver is an allowlist
whose default is silence rather than a blocklist whose default is disclosure: a library
upgrade that adds a new account-state code cannot leak by omission.

Two further defects were found on the page a magic link actually lands on.
`/auth/callback` was the last monolingual English surface on the authenticated path and
sent every reader to `/en/login`. It now reads its locale from `next`, which the login
page already builds as `/{locale}/go`, and renders nothing until it has. And it handed
that same `next` straight to `window.location.replace`, which made a genuine address on
this origin an off-site redirect for anyone able to write a link. `safeNext` in
`src/lib/authRedirect.ts` admits only a single-slash absolute path.

Findings 210 to 213, all four raised and closed inside the slice. 14 new tests. One
limitation recorded rather than fixed: the magic-link path is safe because
`shouldCreateUser` is true, and a test now holds that in place rather than leaving it as
an assumption.

---

## 7. Slice E, WS33, performance baseline

The brief asked for the first reproducible synthetic baseline by route family, locale and
mobile or desktop profile, with regression budgets based on the measured application
rather than invented industry targets, a record of bundle composition, image behaviour,
font behaviour, map loading and the largest observed causes, and only obvious, low-risk
improvements applied. No page redesign.

### Method

Ten route families, two locales, two device profiles: forty cells. Each cell is the
median of three cold loads in a fresh browser context. Families are the ones a visitor
reaches without an account: home, listings search, map, rent index, invest, market, find,
login, post requirement and signup.

Bytes are counted through the Chrome DevTools Protocol, not through the test framework's
response events. That distinction is not pedantry. The first attempt read each response
body inside a `page.on("response")` handler, and because that handler awaits, an
arbitrary subset of responses raced the navigation and were never counted: the same page
reported 23 kB, then 183 kB, then 253 kB of JavaScript on three consecutive runs.
Recording `Network.responseReceived` against `Network.loadingFinished` and reading
`encodedDataLength` with no await between produced identical totals three runs running,
and that is the method the committed probe uses.

The mobile profile is 390 by 844 at device pixel ratio 3, four times CPU throttling,
1.6 Mbps down and 150 ms latency. The desktop profile is 1440 by 900, unthrottled.
Neither is a phone. What they are is the same conditions every time, which is the only
property a regression budget can be built on.

### The four limitations, recorded in the document before the numbers rather than after

The sandbox cannot reach Google Fonts, so the application as committed cannot be built
here: `next/font/google` fails four times and the build stops. Measurement was done in a
scratch copy whose four font declarations were swapped to `next/font/local` against the
same thirteen woff2 faces. The JavaScript is byte for byte the production JavaScript and
the fonts are the same faces at the same sizes, but it is still a swap and it is named.

The database is unreachable from the sandbox, so every data-backed route rendered its
no-database state. `/listings`, `/map` and `/market` therefore show what an empty result
costs, not what a full one costs. The JSON matrix records `data` as `empty` on exactly
those cells so the distinction survives.

Headless Chromium on a shared build machine is not a device in a hand on a Saudi mobile
network. The blocking figures in particular are a relative measure between two builds,
not a promise about anybody's phone.

Next.js prints a "First Load JS" column that is wrong here in a specific and consistent
direction: it is computed per page segment and excludes the layout, and this application
puts its dictionaries, its header and until this package its authentication client in the
layout. The served HTML's script set is the only honest figure and is what the document
quotes.

### The three changes, and what each actually did

Font preloading. `next/font` preloads by default, one root layout serves both languages,
so every reader was sent all thirteen faces on every cold load whichever direction they
read in. `preload: false` on all four families took font transfer from a flat 322 kB on
all forty cells to a median of 140 kB, and made it direction-appropriate: English cells
between 62 and 127 kB, Arabic cells between 153 and 226 kB.

The second change followed from measuring the first, and it is the one worth reading
because the obvious version of it was wrong. Removing the preload link on its own made
the page less stable, not more: cumulative layout shift went from a median of 0.001 to
0.026, and to 0.387 on the Arabic Rent Index page on desktop. Rather than guess, the
`layout-shift` entries were captured with their `sources` arrays, and the cause was a
single entry about 300 ms after paint moving whole blocks up by roughly 56 px. That is
the swap from the fallback face to the real one. The preload had been buying stability as
well as speed. Pairing `preload: false` with `display: "optional"` removes the swap period
entirely, and CLS returned to 0.000 across the sweep while the byte and paint
improvements were kept. A separate check under CDP mobile throttling confirmed the real
Arabic face is still applied in both directions, comparing a measured advance width of
513 px against 548.39 px for the system fallback, with all four FontFace objects
reporting `loaded`.

The Supabase browser client. It was statically imported by `src/components/Header.tsx`,
which is on every public page, and by the login page, putting 244.7 kB raw and 64.8 kB
over the wire into the render-blocking script set of every marketing route. None of it is
needed to paint a header. Both call sites now import it inside the handler or effect that
uses it. Reading the served HTML confirmed the change landed rather than inferring it
from build output: `/en`, `/ar`, `/en/login` and `/en/listings` went from eighteen script
files totalling 1009.5 kB raw to fourteen files totalling 658.7 kB, with zero font
preload links. Both departing chunks are still served in full to `/auth/callback`, which
is where they belong.

### The results, including the one that did not improve

Across all forty cells total transfer fell from 29026 kB to 22183 kB, a reduction of
23.6 per cent. Mobile first contentful paint improved from a median of 1368 ms to 804 ms
and mobile LCP by the same amount. Desktop LCP improved from a median of 282 ms to
242 ms. Maximum mobile CLS improved from 0.094 to 0.020.

Total blocking time did not improve. It went from a median of 303 ms to 317.5 ms on
mobile and from 80.5 ms to 85 ms on desktop.

This paragraph originally called that the honest cost of deferring the authentication
chunk. That was an assertion of cause, and it has been corrected under the Codex review of
this package. Three median runs on a shared build machine prove neither significance nor
causation, and the repeatability figure in `docs/performance-baseline.md` shows why: the
same sweep run twice against an unchanged build moved blocking time by a worst case ratio
of 1.426, while the movement claimed here is 1.048. It is recorded as an observed,
unconfirmed regression requiring remeasurement, the remeasurement belongs to the next
matched sweep, and the transfer reduction is not reversed on this result alone.

### Budgets

`docs/perf-budgets.json` records a budget for every one of the forty cells on five
metrics: total transfer, JavaScript transfer, LCP, total blocking time and cumulative
layout shift. Every budget is the measured value of that cell plus headroom, and the
headroom differs per metric because the metrics do not repeat equally. None of them is an
industry target, because an industry target would say nothing about whether this
application got worse.

### What was considered and not done

Splitting the dictionary chunk per locale is the largest single JavaScript improvement
still available and was not made: `getDictionary` is synchronous and statically imports
both files, and roughly forty client components call it, so making it per locale means
making it asynchronous or moving the boundary. That is an architectural change to how
every client component receives its strings, which is neither obvious nor low risk. It is
recorded as the first candidate for a package allowed to touch the i18n boundary.

Narrowing `browserslist` to remove the 110.0 kB polyfill chunk was not done because it is
a browser-support decision that belongs to the owner.

Moving the demonstration photography to `next/image` was not done. There are zero
`next/image` importers today and `next.config.mjs` permits only `**.supabase.co` as a
remote pattern, so the current Unsplash URLs would not pass the optimiser without a
configuration change. More to the point, what photography this platform is entitled to
display is a rights question, and it should be answered before its delivery is optimised.

---

## 8. Slice F, WS34, security essentials

Full detail is in `docs/security-baseline.md`, 384 lines plus its verification section.
The summary here is the position, not the working.

### Dependency vulnerabilities, where upgrades are compatible

`postcss` was compatible and was upgraded from `^8.4.47` to `^8.5.25`, which clears three
advisories including two rated high. One postcss node remains at 8.4.31 under
`node_modules/next/node_modules`, vendored by the framework and not reachable from here.
postcss runs at build time only, over stylesheets in this repository.

Next.js was not compatible. `next@14.2.35` is the terminal 14.x release, so the 21
advisories against it have no patch inside the major version, and `npm audit` offers only
`next@16.2.12` with `isSemVerMajor` true. Rather than record a false fix, each of the 21
was checked against this application's source and written into a reachability table.
Eleven provably do not reach this application at all: no Server Actions, no
`beforeInteractive`, no `next/script`, no nonces, no `next/image` importers, no Pages
Router, no rewrites, no WebSocket upgrades, not self-hosted, not a custom server. Ten
apply by version through the App Router and middleware request path. Their residual
character is denial of service and cache behaviour on a `noindex` protected preview
rather than remote execution or data disclosure, which is why the upgrade is recorded as
a scheduled owner-authorised package and not an emergency.

### Content Security Policy, report-only first

Shipped as `Content-Security-Policy-Report-Only` in `next.config.mjs`, derived by
enumerating the origins this application actually loads rather than from a template, with
each directive carrying the reason it exists in an inline comment.

It is in `next.config.mjs` and not in the middleware for a specific reason: the middleware
matcher excludes `/api`, so a middleware-attached policy would miss every API response.
The live check on `/api/listings?limit=1` is the decisive proof that the placement is
right.

There is deliberately no `report-uri` and no `report-to`. A reporting endpoint would mean
sending visitor request data to a collector, and collection is disabled platform-wide
under O17 with `COLLECTION_AUTHORISED` false. Violations are read from the browser console
during verification, by a person, on purpose.

The largest compromise is stated as such in both the file and the document:
`script-src` carries `'unsafe-inline'`, because the App Router serves its flight data in
inline script blocks and nonces cannot be used on 14.2.35, where GHSA-ffhc-5mcf-pf4q is
cross-site scripting in App Router applications that use them. Adding a nonce here would
trade a known weakness for a known vulnerability. The proper fix is the framework
upgrade.

Four security response headers ship with it: `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` and a
`Permissions-Policy` denying camera, microphone, geolocation, payment, USB and
interest-cohort. `poweredByHeader` is now false, so `x-powered-by` is gone.

### Rate limiting, the honest position

Nothing was added. The brief said not to add decorative per-instance rate limiting and
call it protection, and nothing was added that would have qualified. What exists is
documented exactly as it is: `allow()` is an in-process sliding window that resets with
each serverless instance and is close to decorative on this platform, kept because it
costs nothing and stops accidental abuse; `allowShared()` speaks the Upstash REST protocol
with a 1500 ms abort and degrades to `allow()` with `durable: false` when no store is
configured. 32 route files import `@/lib/ratelimit` and exactly one,
`src/app/api/advisor/route.ts`, calls `allowShared`. No store is configured, so
`limiterIsDurable()` is false in production and even that one route currently runs
degraded. Migrating the other 31 is not useful before a store exists.

### The smallest shared production-capable options, documented not installed

Both were researched from public documentation and costed. Nothing was installed, no
account was created, no environment variable was set, no vendor was contacted.

A Vercel WAF fixed-window rule on `/api/*` is the recommendation to take first: it is
included at no additional charge on the current plan, needs no code, adds no
sub-processor and requires no data-protection agreement. The caveats recorded with it are
that the plan allows a single custom rule and that counters are per region.

**Corrected on 2026-08-03. The `/api/*` scope above is withdrawn and is not what to
apply.** The owner narrowed it, and PKG-NEXT16-SECURITY slice F then measured the request
bursts an ordinary client generates instead of assuming them. The measurement rules the
blanket scope out: one route, the browsing typeahead, produces four fifths of ordinary API
traffic and it varies threefold with how fast the visitor types, so no single threshold
protects the paid routes without throttling a person entering a district name. The rule
that replaces it covers six unauthenticated paid or writing paths, excludes the typeahead,
and is written out as an owner-action card at the end of `docs/security-baseline.md`. This
paragraph is left standing rather than deleted so the change of position is visible.

An Upstash Redis store is the second step, for per-route limits. The free tier covers
roughly 250,000 limited requests per month at two commands per check. It is not only a
cost decision: a store is a new sub-processor holding client IP addresses in short-lived
counter keys, which is a data-protection choice for the owner.

Both are now rows in section 7 of `docs/status-ledger.md`, governed by owner ruling 7.

### Limitations recorded with the baseline

Four. The CSP is derived from source rather than observed under enforcement. The
reachability table is source-level and does not prove the framework never reaches those
paths internally. `npm audit` sees the dependency tree, not the runtime. And nothing in
the slice covers authorisation or row-level security, so the two Supabase advisories
remain owner-side and untouched.

---

## 9. Gates

The ship gate for this platform is `npx tsc --noEmit`, `npm test`, `npm run ar-lint`,
`node scripts/prose-scan.mjs`, four Playwright probes, and a READY Vercel production
deployment at the expected SHA. Every slice passed all of them before the next began.

| Gate | Result at package close |
| --- | --- |
| `npx tsc --noEmit` | Clean, exit 0 |
| `npm test` | 1739 pass, 0 fail, exit 0 |
| `npm run ar-lint` | `ar-lint: clean`, exit 0 |
| `node scripts/prose-scan.mjs` | `GATE public page source: 0 hardcoded prose strings in 0 files`, `BASE shared component source: 372 in 16 files`, exit 0 |
| Reflow probe | PASS, 14 viewport renders, EN and AR, 320x256 through 1280x1024 |
| Radio probe | PASS, 5 groups |
| Shell probe | PASS, 36 measurements |
| Responsive probe | PASS, 234 measurements, 28 inside a declared scroll rail |
| Production build | READY on Vercel at every slice SHA, table below |

The 372 BASE prose strings are unchanged and were explicitly excluded from this package.

**A note on the production build, because it should not be quietly assumed.** `npm run
build` cannot complete in this sandbox: `next/font/google` fails four times because the
egress proxy blocks `fonts.googleapis.com` and `fonts.gstatic.com`. The production build
evidence for this package is therefore the Vercel build, which runs the same command with
network access and reaches READY. That is stated rather than papered over.

### Every commit reached a READY production deployment at its own SHA

| Commit | Deployment | URL | State |
| --- | --- | --- | --- |
| `92ade4a` | `dpl_8bJtd8SC4GHpj3yFhaRQqvsB8k8N` | `satmarkets-rofould4o-sat-markets.vercel.app` | READY |
| `031bfb3` | `dpl_UuNoBTgucK25apc9YC97KNkGvFBu` | `satmarkets-jb0xacmli-sat-markets.vercel.app` | READY |
| `d700636` | `dpl_JKNYAkvSzH1L4BeaxrmyeNhPajFH` | `satmarkets-4qw0b0vc8-sat-markets.vercel.app` | READY |
| `345f7a3` | `dpl_7kXzsKF6QcxjvKXBGtaJSsvwTr8q` | `satmarkets-7tmhbzwt6-sat-markets.vercel.app` | READY |
| `dca8b16` | `dpl_CYUwAr9T1Cpxzbg1RzLqKUnqAxoH` | `satmarkets-nqzjb3565-sat-markets.vercel.app` | READY |
| `d1b27c7` | `dpl_E3XCFWTfjnSSqTHN9dpXzhZgex55` | `satmarkets-div0jkka7-sat-markets.vercel.app` | READY |
| `dcf4cdc` | `dpl_2qnivvdU1jkxa5N5ANyQFFCVcnET` | `satmarkets-au7ch9uf8-sat-markets.vercel.app` | READY |
| `ac05525` | `dpl_GzRbErecMZ17EKS44DNxQJsGdiDY` | `satmarkets-4mi28jetc-sat-markets.vercel.app` | READY |

Each row was confirmed by `meta.githubCommitSha` on the deployment rather than by the
deployment simply existing. This is the check `e8b3ef4` was written to institutionalise
after `4dcfb93` received no build at all.

---

## 10. Live EN and AR evidence

Every changed surface was validated live in both languages on the deployment carrying its
change. The current head deployment carries all six slices, and the table below is the
final pass taken against it.

| Surface | Result |
| --- | --- |
| `/en` | 200. `<html lang="en" dir="ltr">`. All five security headers present, `content-security-policy-report-only` carrying the exact expected string, `content-security-policy` correctly absent. `x-powered-by` absent. `x-robots-tag: noindex, nofollow` unchanged. 14 scripts, 3 stylesheets, 1 preload |
| `/ar` | 200. `<html lang="ar" dir="rtl">`. CSP byte-identical to `/en`. 48050 Arabic characters. Zero Arabic-Indic digits. 14 scripts, 1 preload |
| `/ar/listings` | 200. CSP byte-identical. All five headers. Zero Arabic-Indic digits |
| `/api/listings?limit=1` | 200 `application/json`. All five headers present, `x-powered-by` absent. **This is the decisive check**: it is exactly the case a middleware-attached policy would have missed, and it is why the headers live in `next.config.mjs` |
| `/api/health` | 404, route does not exist. Headers still applied to the 404 |

One limitation is recorded with this evidence rather than left implicit: the map
components load their style JSON, tiles, sprites and the right-to-left text plugin after
hydration, so none of the third-party origins appear in the served HTML. That is precisely
why the policy ships report-only and why a browser pass with the console open is named as
the precondition for enforcement.

The slice-by-slice live checks taken at the time of each ship are recorded in the
per-slice documents: `docs/performance-baseline.md` section "Verification of this
baseline" and `docs/security-baseline.md` section "Verification of this baseline" carry
theirs in full, including the served font CSS check for slice E.

---

## 11. Responsive evidence, 320 through 1920

The brief asked for the automated evidence to reach 1920 px. It does.

`scripts/responsive-probe.mjs` and `scripts/shell-probe.mjs` both run
`[320, 360, 390, 430, 768, 1024, 1280, 1440, 1920]` in English and Arabic. The nine widths
are chosen rather than sampled: 320 is the narrowest device still in use, 360, 390 and 430
are the phone sizes the operating rules name, 768 and 1024 are the tablet breakpoints,
1280 is the smallest common desktop, 1440 is the common laptop and 1920 is the stated
ceiling. Between 1280 and 1920 nothing in this repository introduces a new rule, which is
recorded in the probe itself so the gap is a decision rather than an omission.

The responsive probe reports 234 measurements passing, with 28 of them inside a declared
scroll rail, which is a horizontal scroller that is meant to scroll and is named as such
rather than being silently tolerated. The shell probe reports 36 measurements: the tab bar
reservation, the footer strip and the safe-area inset, on every width, in both languages,
on a route that has a tab bar and a route that does not.

Both probes require an explicit Chromium path in this environment
(`--chromium /opt/pw-browsers/chromium`), which is recorded here because a future run
without it fails in a way that looks like a code fault and is not.

---

## 12. Findings movement across the package

The register began the package at 205 recorded and ends at 213 recorded, 133 closed and
80 open. The open count is unchanged, and that is the honest shape of the package rather
than a disappointment.

| Slice | Raised | Closed in the same slice | Left open |
| --- | --- | --- | --- |
| A | 206, 207 | 206 | 207, deliberately, because the surface that owns its fix is the next package |
| B | 208, 209 | both | none |
| C | none | none | none. Everything it found was fixed in the commit that found it and none of it had been previously recorded |
| D | 210, 211, 212, 213 | all four | none |
| E | none | none | none. Its carry-forward is recorded in `docs/performance-baseline.md` |
| F | none | none | none. What it could not fix is a framework major version and an owner purchase decision, neither of which is a defect in this application's code |

Severity table at close: P0 6, being ranks 4, 9, 10, 11, 12 and 114. P1 19. P2 55.

The count uses one deliberate correction to the parse: rank 113 begins "Closed in PKG-DEM1
for the reading, open for the data" and is counted here as open, because half of it is. A
naive read of the first word returns 134 closed and 79 open and is wrong by exactly that
row.

---

## 13. Exclusions, honoured

The brief listed nine exclusions. Each was observed.

No broad visual redesign. The one visible change in the package is slice B's footer
spacing, which is inside slice B's own brief and is recorded in the ledger before anybody
could be surprised by it. No 372-string mass migration; the BASE count is unchanged at
372 in 16 files. No Listing Studio expansion. No external notification activation. No
analytics collection, and slice F specifically declined to add a CSP reporting endpoint
because that would have been collection. No indexing or domain work; `x-robots-tag` is
unchanged. No licensed-data assumptions. No O18 implementation. No new governance package;
`92ade4a` records decisions that had already been made and creates no process.

---

## 14. Remaining blockers

Nothing in this package is blocked. What follows is carried forward unchanged and none of
it stopped the work.

Finding 117 remains an owner-side Supabase action and, as the brief directed, did not
block this package. Finding 203 remains fixed pending one interactive session on the
Arabic build submitting an invalid enquiry, a past-dated viewing request and a
missing-city requirement; that session needs a browser and a person, which is why it is
still open rather than because anything is unfixed.

All five Supabase tools answer permission denied from this environment, so the two
row-level-security advisories cannot be re-read and are carried forward from the last
successful read rather than presented as current. The `.github/workflows/arabic-font.yml`
file cannot be pushed because the deploy token has no `workflow` scope, and per owner
ruling 6 that does not stop engineering work. The interactive-browser Advisor
verification, PD4 deed checks under O13 and O10, decisions O10 through O17, finding 74,
contract 6 and provider activation, the twelve Part E clauses for any mobility source,
ADV-5C and the recovery-bundle refresh are all unchanged.

Deferred by standing agreement and untouched here: Map Phase 2, the parked visual-quality
package, the `median` column physical rename, import-boundary lint enforcement, the 22
documentation-only em dashes in `docs/roadmap.md`, the 372 BASE prose strings, findings
202 and 207, and the three monolingual English reviewer consoles.

---

## 15. Owner decisions this package produced

Three, all from slice F, all now recorded as rows in section 7 of
`docs/status-ledger.md` and governed by owner ruling 7.

**One. Authorise the Next.js 14 to 15 or 16 upgrade as its own package.** The
recommendation is yes, before E1 exposure. Ten advisories currently have no available fix
inside 14.x, and the upgrade is also what would let the Content Security Policy drop
`'unsafe-inline'` from `script-src`. It is a major version with async `headers()` and
`cookies()` and React 19, and `src/app/layout.tsx` calls `headers()` synchronously, so it
is a package and not a bump.

**Two. Create one Vercel WAF fixed-window rate-limit rule on `/api/*`.** Free on the
current plan, no code, no new sub-processor, no agreement. It is dashboard configuration
and nothing in this repository can or should do it. Until it exists the platform has no
shared rate limit at all.

Corrected on 2026-08-03: the `/api/*` scope in that item is withdrawn, for the reason
recorded above. The replacement is one rule over six unauthenticated paid or writing
paths, with the browsing typeahead deliberately excluded, prepared and not applied as an
owner-action card at the end of `docs/security-baseline.md`. The rest of the item stands:
it is still account configuration, nothing here can create it, and until it exists the
platform still has no shared rate limit.

**Three. Authorise an Upstash Redis store** so `allowShared()` becomes durable and the
other 31 routes can be migrated. The free tier covers roughly 250,000 limited requests per
month. This one is not only a cost decision: it introduces a sub-processor holding client
IP addresses in short-lived counter keys.

Carried forward and still waiting: apply migration
`20260801_requirement_city_is_never_assumed.sql` per section 4 of
`docs/owner-actions-adv-1c1.md`; install the Arabic font workflow; the two RLS advisories;
independent accessibility verification of the 22 findings through ELITE-1-AT-B; revoke the
old deploy PAT and replace it with a fine-grained token; the one interactive Arabic session
that closes finding 203; and decision O19 on whether any later research round may record.

---

## 16. Deployment note for this commit, per ruling 4

This handback commit changes documentation only: `docs/handback-pkg-e1-readiness.md` is
new and `docs/status-ledger.md` and `docs/security-baseline.md` gain recording sections.
**No rendered surface changed.** No source file, no configuration file, no database
behaviour and no route was touched. Per ruling 4, no further commit will be created to
force a deployment for it, and a missing deployment for this commit is not a blocker. The
last commit that changed a rendered surface is `ac05525` and it is READY and verified
live.

---

## 17. The next package

The brief is explicit on two points and both are respected here.

**Do not begin another foundation package.** This handback closes PKG-E1-READINESS and
starts nothing.

**The next major product package is the visible public-discovery experience** across Home,
Listings Search, Listing Detail and Brokers/Listers, informed by the first ELITE-1
observations and designed to the highest mobile-first Saudi and GCC standard. It is not
begun and should not be, because its brief says it is informed by observations that do not
exist yet. Recruitment is authorised and running with the corrected kit; the gate from E0
to E1 is those sessions, not any missing feature.

Two things already sit in that package's inbox and are recorded so they are not
rediscovered. Finding 207, the listings read that answers an empty list when it cannot
reach the store, was deliberately left open for it. And the dictionary chunk split, the
largest single JavaScript improvement still available, needs a package permitted to touch
the i18n boundary, which the discovery package plausibly is.

The product remains at stage E0.
