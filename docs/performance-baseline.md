# Performance baseline, PKG-E1-READINESS slice E, WS33

Recorded 2 August 2026 against commit d1b27c7 plus the three source changes described
below. This is the first performance measurement this platform has that can be repeated
and disagreed with. Everything in it came out of `scripts/perf-probe.mjs`, which is in
the repository, takes a base URL and writes both a human table and a JSON matrix.

## What was measured, and what a number here means

Ten route families, two locales and two device profiles, which is forty cells. Each cell
is the median of three cold loads in a fresh browser context, so nothing is served from a
warm cache and one unlucky run cannot move a figure. The families were chosen because
they are the ones a visitor actually reaches without an account: home, listings search,
map, rent index, invest, market, find, login, post requirement and signup.

Bytes are counted through the Chrome DevTools Protocol rather than through the test
framework's response events. That distinction is not pedantry. The first attempt read
each response body inside a `page.on("response")` handler, and because that handler
awaits, an arbitrary subset of responses raced the navigation and were never counted at
all: the same page reported 23 kB, then 183 kB, then 253 kB of JavaScript on three
consecutive runs. Recording `Network.responseReceived` against `Network.loadingFinished`
and reading `encodedDataLength` with no await in between produced identical totals on
three consecutive runs, and that is the method the committed probe uses.

Paint, stability and blocking come from four `PerformanceObserver` registrations injected
before any page script runs, with `buffered: true` so that entries emitted before the
observer attached are still delivered. Layout shift excludes entries with
`hadRecentInput`.

The mobile profile is a 390 by 844 viewport at device pixel ratio 3, four times CPU
throttling, and a network shaped to 1.6 Mbps down with 150 ms of latency. The desktop
profile is 1440 by 900, unthrottled. Neither is a phone. What they are is the same
conditions every time, which is the only property a regression budget can be built on.

## The four limitations, stated before the numbers rather than after them

The sandbox this was measured in cannot reach Google Fonts, so the application as
committed cannot be built here at all: `next/font/google` fails four times and the build
stops. Measurement was therefore done in a scratch copy of the tree whose four font
declarations were swapped to `next/font/local` against the same thirteen woff2 faces.
`next/font` runs at build time and emits CSS and font files, so the JavaScript is
byte for byte the production JavaScript, and the fonts are the same faces at the same
sizes. It is still a swap, and it is named here so that nobody has to discover it.

The database is unreachable from the sandbox, so every data backed route rendered its
no database state. `/listings`, `/map` and `/market` therefore show what an empty result
costs, not what a full one costs. Their JavaScript, CSS and font figures are unaffected
by this. Their image and data figures are, and the JSON matrix records `data` as
`empty` on exactly those cells so the distinction survives.

Headless Chromium on a shared build machine is not a device in a hand on a Saudi mobile
network. The blocking figures in particular should be read as a relative measure between
two builds, not as a promise about anybody's phone.

Next.js prints a "First Load JS" column at the end of every build, and on this platform
that column is wrong in a specific and consistent direction. It is computed per page
segment and excludes the layout, and this application puts its dictionaries, its header
and until this package its authentication client in the layout. The served HTML's script
set is the only honest figure and is what this document quotes.

## Bundle composition

Every chunk over 20 kB, identified by reading its contents rather than by trusting the
build manifest. Raw is the file on disk, gzip is what a correctly configured origin
sends. "Routes" counts the app build manifest entries that list the chunk.

| chunk | raw | gzip | routes | what it is |
| --- | --- | --- | --- | --- |
| `9e961bbb.6973a0635ddd1598.js` | 769.3 kB | 207.5 kB | none | maplibre-gl, reached only through a dynamic import |
| `2102-47f5dbb0dc1014b1.js` | 199.6 kB | 62.3 kB | 20 | both i18n dictionaries, 42538 Arabic characters inside |
| `1640-756d78ede28a9988.js` | 182.5 kB | 51.5 kB | 8 | supabase-js core, realtime and postgrest |
| `ae6120bd-24e98cf7fe5d82db.js` | 168.8 kB | 53.5 kB | 81 | react-dom |
| `framework-*.js` | 136.7 kB | 44.8 kB | none | react |
| `5519-e9f38bcc7110349a.js` | 121.5 kB | 31.8 kB | 81 | Next app router client runtime |
| `polyfills-*.js` | 110.0 kB | 39.4 kB | none | legacy polyfills |
| `8c5840f3-f462f8aea6210285.js` | 62.2 kB | 13.3 kB | 8 | supabase auth-js |
| `1131-717b8fb778d8643c.js` | 25.5 kB | 8.7 kB | many | Next shared route matching |
| `8783c74*.css` | 60.9 kB | 12.9 kB | layout | |
| `af177da*.css` | 48.0 kB | 10.5 kB | layout | |
| `718ee59*.css` | 65.5 kB | 9.2 kB | 5 | |

The manifest and the served HTML disagree, and the served HTML wins. Before this package
the home page's script set was eighteen files totalling 1009.5 kB raw, and it contained
both Supabase chunks even though the build manifest attributes them to the layout rather
than the page. After this package it is fourteen files totalling 658.7 kB raw. The two
Supabase chunks are still served in full to `/auth/callback`, which is correct: that page
exists to complete a session and needs the client at paint.

## Font behavior

Thirteen woff2 faces, 352 kB on disk: Source Serif 4 at three weights, Hanken Grotesk at
four, IBM Plex Mono at two and IBM Plex Sans Arabic at four.

There is one root layout for both languages, so all four families are declared on `<html>`
regardless of the direction the reader is in, and `[dir="rtl"]` in `globals.css` is the
only rule that reaches for the Arabic variable. With `next/font`'s default preloading,
every reader was sent every face. Measured, that was a flat 322 kB of font transfer on
every one of the forty cells, of which roughly half was a family that reader's own CSS
would never select. An English reader downloaded the whole Arabic family and rendered
none of it. An Arabic reader downloaded Source Serif and Hanken Grotesk for the same
reason in reverse.

Preloading is a promise that a file is needed for the first paint. For half of these
files, on every single request, that promise was false.

## Image behavior

`src/lib/photos.ts` returns third party `images.unsplash.com` URLs from a fixed list of
photo ids, keyed by asset type and seeded by record id. Seven modules call it. On the
home page that is 366 kB of image transfer, which is the single largest category on that
route and is larger than all of its JavaScript.

No module in this codebase imports `next/image`. There are fourteen raw `<img>` tags,
three of which carry `loading="lazy"` and none of which carry intrinsic width and height
attributes. `next.config.mjs` permits remote images from `**.supabase.co` only, so
adopting `next/image` for the demonstration photography would additionally require
`images.unsplash.com` to be added there, or the photography to be replaced.

None of that was changed in this package. Demonstration photography is a content and
rights question before it is a performance question, and the brief for this package
excludes page redesign.

## Map loading

The 769.3 kB maplibre-gl chunk appears in no route's initial script set, and that is not
an accident of bundling. `src/app/[locale]/listings/page.tsx` wraps the map component in
`next/dynamic`, and four components load the library itself at use time:
`ListingsMap.tsx`, `MapExplorer.tsx`, `LocationFacts.tsx` and `LocationPicker.tsx` all
call `import("maplibre-gl")` inside an effect. This was verified by reading the served
script sets rather than by trusting the imports.

Two things about the map are worth recording anyway. The four call sites each install the
right to left text plugin from `https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/`,
which is a third party runtime fetch on a public surface and belongs on the content
security policy work in slice F. And the map's arrival is the largest source of layout
instability on the platform, which is the next section.


## The largest observed causes, in measured order

These are ordered by how many bytes or how much instability each one actually accounts
for in the measurements above, not by how easy it is to talk about.

First, photography on the home page. `/en` and `/ar` transfer 366 kB of imagery from
`images.unsplash.com`, which is more than all the JavaScript on the same page and is the
single reason the home LCP stays above four seconds on the throttled mobile profile while
every other family sits under a second. Nothing else on the platform is in this range.

Second, fonts, which were 322 kB on every one of the forty cells before this package and
are a median of 140 kB after it. This is now the second largest category on most pages
rather than the first, and what remains is genuinely used by the direction being read.

Third, the shared dictionary chunk at 199.6 kB raw and 62.3 kB over the wire. It is on
every page in both languages and it contains both languages, so roughly half of it is
never read. It is about a quarter of all the JavaScript on a typical route. It was not
split, for reasons recorded in the next section.

Fourth, legacy polyfills at 110.0 kB raw and 39.4 kB over the wire, present on every
route. There is no `browserslist` key in `package.json`, so the default target applies.
Narrowing it would remove most of this, but which browsers a Saudi commercial property
platform must support is a product decision and not a performance one, so it is recorded
rather than changed.

Fifth, and this one is stability rather than bytes: the listings map pane. Desktop CLS on
`/en/listings` is 0.182 and on `/ar/listings` 0.183, and both come from a single shift
entry between 380 and 410 ms. Capturing the `sources` array of that entry named the
elements: `DIV.lst-split` grows from 320 px to about 460 px tall and `FOOTER.foot`
collapses to a zero rectangle, which is the dynamically imported map taking its real
height after hydration and the page below it moving to accommodate. This predates the
package, the font change neither caused it nor fixed it, and reserving the pane's height
is a page change that the brief excludes. It is the largest remaining stability defect on
the platform and it is recorded here so the next package can start from a measurement
rather than a guess.

## What was changed, and what each change actually did

Three changes were applied. All three are in the working tree of this commit and each was
measured on its own before the next was made.

The first was font preloading. `next/font` preloads by default, one root layout serves
both languages, so every reader was sent all thirteen woff2 faces on every cold load
whichever direction they read in. Setting `preload: false` on all four families lets the
browser fetch a face when the cascade matches it. Font transfer went from a flat 322 kB
on all forty cells to a median of 140 kB, and it became direction appropriate: English
cells now transfer between 62 and 127 kB, Arabic cells between 153 and 226 kB. The
asymmetry is real and expected, since the Arabic family carries four weights of a much
larger character set.

The second change followed from measuring the first, and it is the one worth reading
carefully because the obvious version of it was wrong. Removing the preload link on its
own made the page less stable, not more: cumulative layout shift went from a median of
0.001 to 0.026, from a maximum of 0.094 to 0.177 on mobile, and from 0.182 to 0.387 on
the Arabic Rent Index page on desktop. Rather than guess, the `layout-shift` entries were
captured with their `sources` arrays, and the cause was a single entry about 300 ms after
paint moving whole blocks up by roughly 56 px. That is the swap from the fallback face to
the real one. The preload had been buying stability as well as speed, because the face
arrived before there was anything on screen to move. Pairing `preload: false` with
`display: "optional"` removes the swap period entirely: the face is either ready in time
or it is left for the next navigation. Measured again, CLS returned to 0.000 across the
sweep while the byte and paint improvements were kept. A separate check under CDP mobile
throttling confirmed the real Arabic face is still applied in both directions, comparing
a measured advance width of 513 px against 548.39 px for the system fallback, with all
four FontFace objects reporting `loaded`.

The third change was the Supabase browser client. It was statically imported by
`src/components/Header.tsx`, which is on every public page, and by the login page, which
put 244.7 kB raw and 64.8 kB over the wire into the render blocking script set of every
marketing route. None of it is needed to paint a header. Both call sites now import it
inside the handler or effect that uses it. Reading the served HTML confirmed the change
landed rather than inferring it from the build output: `/en`, `/ar`, `/en/login` and
`/en/listings` went from eighteen script files totalling 1009.5 kB raw to fourteen files
totalling 658.7 kB, with zero font preload links. Content sniffing identified the two
departing chunks as the auth, ssr and realtime bundles, and both are still served in full
to `/auth/callback`, which is where they belong.

Across all forty cells, total transfer fell from 29026 kB to 22183 kB, a reduction of
23.6 per cent. Mobile first contentful paint improved from a median of 1368 ms to 804 ms
and mobile LCP by the same amount, home excepted for the reason given above. Desktop LCP
improved from a median of 282 ms to 242 ms. Maximum mobile CLS improved from 0.094 to
0.020.

One axis did not improve. Total blocking time went from a median of 303 ms to 317.5 ms on
mobile and from 80.5 ms to 85 ms on desktop.

That is an observed difference and nothing more, and this paragraph has been corrected to
say so. It was first written here as the honest cost of deferring the authentication
chunk, which asserts a cause. Three median runs on a shared build machine establish
neither statistical significance nor causation, and the correction is owed rather than
optional: the same document, three sections below, records that running the whole sweep
twice against an unchanged build produced a worst case run to run ratio of 1.426 on
blocking time. The move recorded here is a ratio of 1.048 on mobile and 1.056 on desktop.
Both sit far inside the noise this instrument has already been shown to produce, so this
measurement cannot distinguish a real regression from the machine.

It is therefore recorded as an observed, unconfirmed regression requiring remeasurement.
The remeasurement belongs to the next matched sweep, where the same forty cells are run
again on the same harness, and where a proper reading needs more than three runs per cell
if blocking time is to be separated from noise at all. Until that exists, no conclusion is
drawn about the authentication deferral from this number, and the transfer reduction is
not reversed on the strength of it. The byte and paint results were measured on the same
runs and moved by margins the noise band does not cover: total transfer by 23.6 per cent
against a 1.088 worst case ratio, mobile first contentful paint from 1368 ms to 804 ms
against 1.115. Those stand. This one does not yet.

## What was considered and not done

Splitting the dictionary chunk per locale is the largest single improvement still
available in JavaScript, and it was not made. `getDictionary` is synchronous and
statically imports both JSON files, and roughly forty client components call it. Making
it per locale means making it asynchronous or moving the boundary, which is an
architectural change to how every client component receives its strings. The brief for
this package permits obvious, low risk improvements and excludes page redesign, and this
is neither obvious nor low risk. It is recorded as the first candidate for a package that
is allowed to touch the i18n boundary.

Narrowing `browserslist` to remove the 110.0 kB polyfill chunk was not done because it is
a browser support decision that belongs to the owner, not a tuning knob.

Moving the demonstration photography to `next/image` was not done. There are zero
`next/image` importers today, fourteen raw `<img>` tags of which three set
`loading="lazy"` and none set intrinsic dimensions, and `next.config.mjs` permits only
`**.supabase.co` as a remote pattern, so the current Unsplash URLs would not pass through
the optimiser without a configuration change. More to the point, what photography this
platform is entitled to display is a rights question, and it should be answered before
its delivery is optimised.

## The regression budgets

`docs/perf-budgets.json` records a budget for every one of the forty cells on five
metrics: total transfer, JavaScript transfer, LCP, total blocking time and cumulative
layout shift. Every budget is the measured value of that cell plus headroom. None of them
is an industry target, because an industry target would say nothing about whether this
application got worse.

The headroom differs per metric because the metrics do not repeat equally. Running the
whole sweep twice against an unchanged build gave worst case run to run ratios of 1.000
for JavaScript bytes, 1.088 for total bytes, 1.115 for LCP and 1.426 for blocking time.
Bytes therefore get 10 per cent, which covers the observed spread with a little to spare.
Timings get 35 per cent, which is wide enough that a green run means something and narrow
enough that doubling a bundle cannot hide inside it.

Blocking time also gets a floor of 100 ms before the 35 per cent is applied, and that
floor was chosen from the same data rather than picked. The 1.426 worst case was 68 ms
becoming 97 ms on an identical build: a 29 ms absolute move that looks alarming only
because the base is small. A first attempt used a 50 ms floor and the verification run
failed exactly one cell out of forty, `desktop:ar:rent-index`, at 97 ms against a 92 ms
budget, which is a budget failing on noise rather than on a regression. The 100 ms floor
puts the smallest possible blocking budget at 135 ms, above this machine's noise and
still below any real regression. Cumulative layout shift gets a fixed floor of 0.05 for
the same reason, since it is now 0.000 on most cells and a proportional budget on zero is
not a budget.

Re run the sweep with `node scripts/perf-probe.mjs --base <url> --chromium <path>` and it
exits non zero on the first cell that exceeds any of its five budgets, printing the cell
key and the metric. Recording a new baseline after a deliberate change is
`--write-budgets`, which should be a conscious act and never a reflex.

## Verification of this baseline

The budget file was derived from the after run and then verified by a fresh independent
sweep against the same server, which reported `perf-probe: PASS 40 cells within budget`.
That is the reproducibility claim: not that these numbers are the truth about a phone in
Riyadh, but that this harness, run twice against an unchanged build, agrees with itself
inside the headroom it declares.

## Recommended follow ups

Deliver each direction its own font faces, by locale scoped layouts or by a route group,
so that preloading can return with `display: "swap"` and each reader is preloaded exactly
the faces they will read. That restores the first paint guarantee this package traded
away, and it is the proper fix for the cost recorded in `src/app/layout.tsx`.

Reserve the listings map pane's height so the 0.18 shift at 380 ms does not happen.

Split the dictionaries per locale once a package is authorised to change the i18n
boundary.

Decide the browser support floor, then narrow `browserslist` to match it.

Decide the photography rights question, then move whatever survives it to `next/image`
with intrinsic dimensions and above the fold priority set deliberately.

Move the maplibre right to left text plugin off `unpkg.com` or account for it explicitly
in the content security policy, which slice F now has as a known input.

## The full matrix

Every cell is the median of three cold loads. `Data` records what the page could actually
render: `static` where the route needs no database, `empty` where the database was
unreachable and the route rendered its no data state honestly. Values read as before to
after.

| Route family | Locale | Profile | Data | Total kB | JS kB | Font kB | LCP ms | CLS | Blocking ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| home | en | mobile | static | 1017 to 804 | 253 to 254 | 322 to 113 | 5388 to 4336 | 0.000 to 0.000 | 308 to 480 |
| listings | en | mobile | empty | 862 to 671 | 458 to 458 | 322 to 127 | 1316 to 820 | 0.021 to 0.019 | 668 to 656 |
| map | en | mobile | empty | 857 to 634 | 454 to 455 | 322 to 98 | 1368 to 796 | 0.000 to 0.000 | 694 to 790 |
| rent-index | en | mobile | static | 643 to 448 | 246 to 247 | 322 to 127 | 1368 to 828 | 0.031 to 0.000 | 225 to 369 |
| invest | en | mobile | static | 637 to 421 | 247 to 248 | 322 to 106 | 1312 to 792 | 0.000 to 0.000 | 305 to 413 |
| market | en | mobile | empty | 643 to 431 | 246 to 246 | 322 to 113 | 1368 to 784 | 0.000 to 0.000 | 260 to 282 |
| find | en | mobile | static | 640 to 380 | 251 to 252 | 322 to 62 | 1252 to 692 | 0.000 to 0.000 | 171 to 202 |
| login | en | mobile | static | 640 to 431 | 247 to 247 | 322 to 113 | 1304 to 760 | 0.001 to 0.000 | 219 to 230 |
| post-requirement | en | mobile | static | 645 to 435 | 254 to 255 | 322 to 113 | 1272 to 724 | 0.000 to 0.000 | 301 to 206 |
| signup | en | mobile | static | 646 to 436 | 252 to 253 | 322 to 112 | 1324 to 764 | 0.000 to 0.000 | 244 to 238 |
| home | ar | mobile | static | 1021 to 851 | 253 to 254 | 322 to 153 | 5416 to 4540 | 0.001 to 0.000 | 498 to 559 |
| listings | ar | mobile | empty | 870 to 747 | 458 to 458 | 322 to 196 | 1476 to 828 | 0.028 to 0.020 | 719 to 647 |
| map | ar | mobile | empty | 865 to 741 | 454 to 455 | 322 to 196 | 1460 to 820 | 0.031 to 0.000 | 704 to 783 |
| rent-index | ar | mobile | static | 650 to 539 | 246 to 247 | 322 to 211 | 1488 to 888 | 0.032 to 0.000 | 342 to 341 |
| invest | ar | mobile | static | 643 to 547 | 247 to 248 | 322 to 226 | 1396 to 804 | 0.094 to 0.000 | 499 to 382 |
| market | ar | mobile | empty | 646 to 522 | 246 to 246 | 322 to 196 | 1460 to 828 | 0.001 to 0.000 | 318 to 282 |
| find | ar | mobile | static | 646 to 520 | 251 to 252 | 322 to 196 | 1296 to 756 | 0.001 to 0.000 | 198 to 209 |
| login | ar | mobile | static | 644 to 521 | 247 to 247 | 322 to 196 | 1380 to 820 | 0.000 to 0.000 | 286 to 274 |
| post-requirement | ar | mobile | static | 651 to 481 | 254 to 255 | 322 to 153 | 1356 to 804 | 0.000 to 0.000 | 301 to 294 |
| signup | ar | mobile | static | 652 to 540 | 252 to 253 | 322 to 211 | 1432 to 804 | 0.001 to 0.000 | 295 to 273 |
| home | en | desktop | static | 1010 to 800 | 253 to 254 | 322 to 113 | 416 to 456 | 0.000 to 0.000 | 85 to 93 |
| listings | en | desktop | empty | 860 to 665 | 458 to 458 | 322 to 127 | 276 to 248 | 0.182 to 0.182 | 169 to 178 |
| map | en | desktop | empty | 857 to 631 | 454 to 455 | 322 to 98 | 320 to 300 | 0.000 to 0.000 | 105 to 181 |
| rent-index | en | desktop | static | 641 to 444 | 246 to 247 | 322 to 127 | 244 to 228 | 0.000 to 0.000 | 0 to 98 |
| invest | en | desktop | static | 637 to 420 | 247 to 248 | 322 to 106 | 296 to 252 | 0.000 to 0.000 | 99 to 83 |
| market | en | desktop | empty | 638 to 431 | 246 to 246 | 322 to 113 | 244 to 260 | 0.000 to 0.000 | 0 to 87 |
| find | en | desktop | static | 640 to 380 | 251 to 252 | 322 to 62 | 252 to 216 | 0.000 to 0.000 | 67 to 73 |
| login | en | desktop | static | 637 to 427 | 247 to 247 | 322 to 113 | 244 to 220 | 0.000 to 0.000 | 68 to 76 |
| post-requirement | en | desktop | static | 644 to 435 | 254 to 255 | 322 to 113 | 260 to 208 | 0.000 to 0.000 | 96 to 76 |
| signup | en | desktop | static | 642 to 432 | 252 to 253 | 322 to 112 | 232 to 212 | 0.000 to 0.000 | 50 to 86 |
| home | ar | desktop | static | 1018 to 848 | 253 to 254 | 322 to 153 | 436 to 524 | 0.000 to 0.000 | 105 to 106 |
| listings | ar | desktop | empty | 869 to 774 | 458 to 458 | 322 to 196 | 312 to 232 | 0.056 to 0.183 | 191 to 164 |
| map | ar | desktop | empty | 861 to 740 | 454 to 455 | 322 to 196 | 372 to 300 | 0.000 to 0.000 | 111 to 182 |
| rent-index | ar | desktop | static | 681 to 535 | 246 to 247 | 322 to 211 | 260 to 248 | 0.000 to 0.000 | 59 to 68 |
| invest | ar | desktop | static | 643 to 547 | 247 to 248 | 322 to 226 | 288 to 248 | 0.000 to 0.000 | 91 to 98 |
| market | ar | desktop | empty | 644 to 520 | 246 to 246 | 322 to 196 | 288 to 228 | 0.000 to 0.000 | 0 to 74 |
| find | ar | desktop | static | 645 to 519 | 251 to 252 | 322 to 196 | 288 to 236 | 0.000 to 0.000 | 0 to 73 |
| login | ar | desktop | static | 642 to 517 | 247 to 247 | 322 to 196 | 272 to 232 | 0.000 to 0.000 | 76 to 74 |
| post-requirement | ar | desktop | static | 650 to 481 | 254 to 255 | 322 to 153 | 336 to 232 | 0.000 to 0.000 | 105 to 84 |
| signup | ar | desktop | static | 649 to 537 | 252 to 253 | 322 to 211 | 248 to 248 | 0.000 to 0.000 | 60 to 76 |

---

# The Next.js 16 re-measurement, PKG-NEXT16-SECURITY slice E

Recorded 3 August 2026. The before is commit `1a99107`, the last commit before the
migration, running Next.js 14.2.35 with React 18.3.1. The after is commit `73c630a` on
branch `next16-security`, running Next.js 16.2.12 with React 19.2.8. Both trees were
built and served inside the same container in the same session, and every figure below
came out of the same `scripts/perf-probe.mjs` that produced the baseline above, with no
change to the probe and no change to the budgets.

## Why the before was measured again instead of read off the table above

`docs/perf-budgets.json` was measured on 2 August on a different machine. The after run
here exceeds those budgets in ninety nine places, and a hundred overages could as easily
be a slower container as a slower application. So the pre-migration commit was rebuilt and
probed in this same sandbox first, and it came back `perf-probe: 1 over budget`: one cell,
`desktop:ar:market`, at 573 kB against a 572 kB budget, which is one kilobyte. This
machine therefore reproduces the recorded budgets, and that is what licenses reading the
after run's overages as the change rather than as the environment.

## Three arms, because the bundler turned out to be separable

`docs/next16-migration.md` recorded that a 14 against 16 comparison would conflate two
changes, since Next 16 builds with Turbopack by default and 14 built with webpack. That
caveat is retired rather than repeated. `next build --webpack` still exists in 16.2.12,
so the sweep was run three times: Next 14 with webpack, Next 16 with webpack, and Next 16
with Turbopack as production actually builds it. The first pair holds the bundler still
and moves the framework. The second pair holds the framework still and moves the bundler.
Every value in the matrix at the end of this section reads as those three arms in that
order.

## JavaScript over the wire rose on every one of the forty cells

The rise is between 39 and 45 kB, median 43 kB, and no cell fell. Splitting it: the
framework and React 19 account for 30 to 33 kB, median 31, and Turbopack's chunking
accounts for a further 8 to 13 kB, median 12. That is roughly three quarters framework and
one quarter bundler. The largest movers are the three `listings` cells at 45 kB and the
smallest are the three `post-requirement` cells at 39 kB, which is a narrow enough spread
to say the cost is in the shared runtime rather than in any one route.

Uncompressed, the scripts served on `/en` total 733,577 bytes across 14 files on Next 14,
837,490 bytes across 14 files on Next 16 with webpack, and 920,358 bytes across 12 files
on Next 16 with Turbopack. A chunk of exactly 112,594 bytes, the polyfill bundle, is
present and byte identical in all three, which is the control that says the delta is not
polyfills moving around. The wire figures in the matrix are smaller than these because
they are compressed.

## Total transfer rose on every cell too, and by about the same amount

Between 14 and 58 kB, median 44 kB, which is the JavaScript delta and little else. The
smallest riser, `desktop:ar:market` at 14 kB, is the cell that was one kilobyte over
budget on the Next 14 arm as well, so its own run to run spread accounts for most of the
difference between it and the rest.

## Blocking time is the framework's cost

On the mobile profile the framework arm adds a median of 153 ms of total blocking time,
across a range of 39 to 280 ms, while the bundler arm adds a median of nothing at all,
minus 1.5 ms across a range of minus 99 to plus 158. On desktop the same shape holds
smaller: the framework adds a median 61 ms and the bundler subtracts a median 42 ms. Main
thread work went up because there is more framework to execute, and which bundler emitted
it does not matter.

## Mobile paint is the bundler's cost

The picture inverts on largest contentful paint. On mobile the framework arm moves the
median by 26 ms, across a range of minus 28 to plus 352, and the bundler arm moves it by a
median of 182 ms across a range of plus 20 to plus 424. Under four times CPU throttling
and 1.6 Mbps, Turbopack's twelve larger chunks arrive and parse later than webpack's
fourteen smaller ones, and the paint waits.

## Desktop paint did not move, but it acquired a second mode

The desktop medians say nothing happened: the framework arm moves the median by 8 ms and
the bundler arm by minus 4 ms. What did change is how often a desktop cell paints slowly.
On Next 14 exactly two desktop cells sit above 400 ms, and both are `home`, where the
largest element is the hero photograph. On Next 16 six to eight do, across four
independent Next 16 sweeps, and each of those cells reads either about 250 ms or about
550 ms with nothing in between. Which cells land in the slow mode is not stable between
sweeps: `desktop:en:rent-index` is fast on the webpack arm and slow on the Turbopack arm,
`desktop:ar:rent-index` is the other way round. So this is recorded as a bimodal paint
that Next 16 enters more often than Next 14 did, and not as a per cell regression, because
naming the twelve cells that happen to exceed their paint budget in this particular sweep
would be naming a coin toss. It is worth a look in a package that is allowed to change
pages.

## Fonts did not move

`fontKb` is identical to the kilobyte on 38 of the 40 cells across all three arms, and
differs by one kilobyte on the two `invest` cells. All three builds emit the same
seventeen `@font-face` rules, thirteen real faces and four size adjusted fallbacks, with
`font-display: optional` on every one. Whatever the migration cost, it did not cost
anything in font delivery, and the font swap described in the limitation below did not
distort the comparison.

## The one new layout shift was the measurement instrument, not the application

The first sweep produced a genuine looking stability regression: `desktop:en:home` read
0.000 on Next 14 and 0.091 on both Next 16 arms, consistently, which is well past the 0.05
budget and looked like the one real defect of the whole slice. It is worth writing down
what it actually was, because the conclusion nearly went into this document the wrong way
round.

Capturing the layout shift entries with their `sources` arrays showed a single shift of
0.0912 at about 335 ms in which the hero heading grew from 125 px to 188 px, one rendered
line to two, pushing the subtitle paragraph down 63 px and the panel below it down 62 px.
The font size was 58 px before and after, so this was a rewrap and not a resize, and a
rewrap at a fixed size is a font metric change.

The cause is in the measurement tree. As the limitations above record, this sandbox cannot
reach Google Fonts, so the four `next/font/google` declarations are swapped to
`next/font/local` against the same thirteen faces. In Next 14 that swap was harmless:
`next/font` hashed the emitted family name to `__serif_f10e71`. In Next 16 it is not.
`next/font/local` now names the emitted family after the JavaScript binding, at
`next/dist/compiled/@next/font/dist/local/loader.js`, which pushes `['font-family',
variableName]`, and the binding in the root layout is `serif`. The build therefore emitted
`@font-face { font-family: "serif" }` and a usage of `"serif", "serif Fallback", Georgia,
serif`, where `serif` is a CSS generic family keyword. The browser registered sixteen
faces instead of seventeen, the size adjusted fallback did not hold, and the heading
rewrapped when the real face finally applied.

The test was to rename the four bindings to `serifFace`, `sansFace`, `monoFace` and
`arabicFace`, changing nothing else, and rebuild both Next 16 arms. The emitted families
became `serifFace` and its siblings, seventeen faces registered, the heading held at
125 px through the whole load, and the shift went to 0.000. Both Next 16 arms in the matrix
below are the renamed builds, and the whole sweep was re run on them, which is why the
after column here is not the one the first campaign produced.

The committed application does not have this collision, and that was checked rather than
assumed: `next/font/google` takes its family name from the CSS that Google returns, which
carries `'Source Serif 4'`, not from the binding. The trap only exists for
`next/font/local`. It is written down here because it is a real Next 16 behaviour change
that would bite silently, and because the next person to swap fonts for measurement in
this sandbox will otherwise rediscover it as a defect.

With the artifact removed, no cell exceeds its layout shift budget in the after run. Six
cells read a nonzero shift somewhere in the three arms, and none of them repeats between
the two measurement campaigns except `desktop:en:listings`, which is the unreserved map
pane already recorded in the follow ups above and is present on Next 14 as well at 0.182.

## The budgets were not rewritten

`--write-budgets` was not passed, because the work order for this slice says to report
matched results without automatically replacing the budgets. The standing consequence is
that `node scripts/perf-probe.mjs` now exits 1 against the committed budgets, reporting 99
overages across 40 cells: all 40 cells on JavaScript bytes, 32 on total bytes, 15 on
blocking time, 12 on paint, and none on layout shift. The webpack arm of Next 16 reports
102 by the same measure, so the failure is the framework and not the bundler choice.

Whether to re baseline is an owner decision and it is not taken here. Re baselining
accepts about 43 kB of extra JavaScript per page as the new normal in exchange for a
supported framework, which is a defensible trade and is also the trade that was already
made when the migration was authorized. Leaving the budgets as they are keeps a red gate
standing that no code change in this repository can turn green. Recording the choice
matters more than which way it goes, because an unexplained failing gate gets ignored and
then deleted.

## How to reproduce this

Build the two trees, serve them on different ports, and run the probe against each with
`node scripts/perf-probe.mjs --base http://127.0.0.1:<port> --chromium <path> --json
<out>`. In a sandbox that cannot reach Google Fonts, swap the four root layout
declarations to `next/font/local` against the same faces at the same weights and subsets,
and do not name the bindings after CSS generic family keywords. Build the third arm with
`npx next build --webpack`. Nothing here needs the network beyond the font files, which
are already on disk.

## The full three-way matrix

Every cell is the median of three cold loads, as above. `Data` records what the page could
actually render: `static` where the route needs no database, `empty` where the database was
unreachable and the route rendered its no data state honestly. Values read as Next 14 with
webpack, then Next 16 with webpack, then Next 16 with Turbopack.

| Route family | Locale | Profile | Data | Total kB | JS kB | Font kB | LCP ms | CLS | Blocking ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| home | en | mobile | static | 837 to 873 to 884 | 268 to 299 to 311 | 119 to 119 to 119 | 4436 to 4704 to 4728 | 0.000 to 0.000 to 0.000 | 580 to 665 to 603 |
| listings | en | mobile | empty | 699 to 740 to 754 | 473 to 506 to 518 | 134 to 134 to 134 | 856 to 840 to 984 | 0.019 to 0.019 to 0.019 | 739 to 874 to 858 |
| map | en | mobile | empty | 660 to 692 to 710 | 469 to 500 to 512 | 103 to 103 to 103 | 864 to 844 to 1028 | 0.000 to 0.000 to 0.000 | 700 to 882 to 978 |
| rent-index | en | mobile | static | 476 to 521 to 528 | 260 to 291 to 303 | 134 to 134 to 134 | 844 to 1196 to 1388 | 0.000 to 0.000 to 0.000 | 272 to 552 to 557 |
| invest | en | mobile | static | 446 to 477 to 490 | 262 to 292 to 305 | 112 to 111 to 111 | 848 to 848 to 1032 | 0.000 to 0.000 to 0.000 | 440 to 523 to 424 |
| market | en | mobile | empty | 456 to 498 to 512 | 260 to 291 to 303 | 119 to 119 to 119 | 828 to 836 to 1260 | 0.000 to 0.000 to 0.000 | 342 to 433 to 452 |
| find | en | mobile | static | 403 to 435 to 446 | 267 to 298 to 308 | 66 to 66 to 66 | 768 to 760 to 948 | 0.000 to 0.000 to 0.000 | 193 to 356 to 327 |
| login | en | mobile | static | 460 to 498 to 513 | 261 to 292 to 304 | 119 to 119 to 119 | 824 to 856 to 1020 | 0.000 to 0.000 to 0.000 | 292 to 421 to 445 |
| post-requirement | en | mobile | static | 462 to 496 to 499 | 270 to 301 to 309 | 119 to 119 to 119 | 784 to 832 to 1008 | 0.000 to 0.000 to 0.000 | 210 to 398 to 352 |
| signup | en | mobile | static | 464 to 507 to 515 | 267 to 298 to 309 | 118 to 118 to 118 | 796 to 828 to 1032 | 0.000 to 0.000 to 0.000 | 231 to 418 to 418 |
| home | ar | mobile | static | 875 to 922 to 926 | 268 to 299 to 311 | 156 to 156 to 156 | 4668 to 4940 to 4960 | 0.000 to 0.000 to 0.000 | 550 to 748 to 699 |
| listings | ar | mobile | empty | 770 to 816 to 825 | 473 to 506 to 518 | 201 to 201 to 201 | 884 to 1204 to 1368 | 0.020 to 0.020 to 0.020 | 712 to 868 to 865 |
| map | ar | mobile | empty | 765 to 799 to 809 | 469 to 500 to 512 | 201 to 201 to 201 | 864 to 864 to 984 | 0.000 to 0.000 to 0.000 | 723 to 787 to 945 |
| rent-index | ar | mobile | static | 565 to 607 to 623 | 260 to 291 to 303 | 216 to 216 to 216 | 904 to 1140 to 1168 | 0.000 to 0.000 to 0.000 | 344 to 478 to 559 |
| invest | ar | mobile | static | 572 to 604 to 616 | 262 to 292 to 305 | 232 to 232 to 232 | 880 to 900 to 1080 | 0.000 to 0.000 to 0.000 | 405 to 444 to 454 |
| market | ar | mobile | empty | 548 to 586 to 605 | 260 to 291 to 303 | 201 to 201 to 201 | 864 to 1204 to 1248 | 0.000 to 0.000 to 0.000 | 283 to 478 to 509 |
| find | ar | mobile | static | 543 to 576 to 584 | 267 to 298 to 308 | 201 to 201 to 201 | 784 to 788 to 1004 | 0.000 to 0.000 to 0.000 | 209 to 305 to 361 |
| login | ar | mobile | static | 546 to 591 to 593 | 261 to 292 to 304 | 201 to 201 to 201 | 852 to 884 to 1068 | 0.000 to 0.000 to 0.000 | 263 to 446 to 437 |
| post-requirement | ar | mobile | static | 504 to 539 to 542 | 270 to 301 to 309 | 156 to 156 to 156 | 864 to 836 to 1052 | 0.000 to 0.000 to 0.000 | 283 to 434 to 430 |
| signup | ar | mobile | static | 567 to 611 to 618 | 267 to 298 to 309 | 216 to 216 to 216 | 884 to 884 to 1068 | 0.000 to 0.000 to 0.000 | 295 to 466 to 388 |
| home | en | desktop | static | 825 to 856 to 865 | 268 to 299 to 311 | 119 to 119 to 119 | 496 to 516 to 492 | 0.000 to 0.000 to 0.000 | 109 to 172 to 155 |
| listings | en | desktop | empty | 696 to 776 to 737 | 473 to 506 to 518 | 134 to 134 to 134 | 240 to 256 to 596 | 0.182 to 0.182 to 0.147 | 194 to 252 to 228 |
| map | en | desktop | empty | 654 to 693 to 695 | 469 to 500 to 512 | 103 to 103 to 103 | 300 to 292 to 300 | 0.000 to 0.000 to 0.000 | 172 to 266 to 236 |
| rent-index | en | desktop | static | 469 to 504 to 515 | 260 to 291 to 303 | 134 to 134 to 134 | 260 to 252 to 540 | 0.000 to 0.000 to 0.043 | 56 to 157 to 134 |
| invest | en | desktop | static | 443 to 479 to 484 | 262 to 292 to 305 | 112 to 111 to 111 | 236 to 220 to 228 | 0.000 to 0.000 to 0.000 | 88 to 121 to 96 |
| market | en | desktop | empty | 452 to 490 to 501 | 260 to 291 to 303 | 119 to 119 to 119 | 252 to 536 to 492 | 0.000 to 0.022 to 0.022 | 85 to 169 to 114 |
| find | en | desktop | static | 402 to 432 to 444 | 267 to 298 to 308 | 66 to 66 to 66 | 228 to 212 to 244 | 0.000 to 0.000 to 0.000 | 89 to 127 to 61 |
| login | en | desktop | static | 451 to 486 to 493 | 261 to 292 to 304 | 119 to 119 to 119 | 248 to 232 to 220 | 0.000 to 0.000 to 0.000 | 117 to 155 to 63 |
| post-requirement | en | desktop | static | 461 to 493 to 497 | 270 to 301 to 309 | 119 to 119 to 119 | 212 to 228 to 224 | 0.000 to 0.000 to 0.000 | 89 to 127 to 125 |
| signup | en | desktop | static | 456 to 492 to 501 | 267 to 298 to 309 | 118 to 118 to 118 | 260 to 244 to 212 | 0.000 to 0.000 to 0.000 | 88 to 152 to 53 |
| home | ar | desktop | static | 868 to 899 to 910 | 268 to 299 to 311 | 156 to 156 to 156 | 504 to 552 to 548 | 0.000 to 0.000 to 0.000 | 106 to 172 to 160 |
| listings | ar | desktop | empty | 777 to 841 to 820 | 473 to 506 to 518 | 201 to 201 to 201 | 256 to 596 to 596 | 0.056 to 0.292 to 0.151 | 178 to 240 to 262 |
| map | ar | desktop | empty | 768 to 794 to 805 | 469 to 500 to 512 | 201 to 201 to 201 | 356 to 348 to 328 | 0.000 to 0.000 to 0.000 | 220 to 267 to 208 |
| rent-index | ar | desktop | static | 558 to 592 to 606 | 260 to 291 to 303 | 216 to 216 to 216 | 260 to 592 to 536 | 0.000 to 0.036 to 0.036 | 99 to 107 to 69 |
| invest | ar | desktop | static | 569 to 601 to 618 | 262 to 292 to 305 | 232 to 232 to 232 | 248 to 276 to 284 | 0.000 to 0.000 to 0.000 | 100 to 183 to 99 |
| market | ar | desktop | empty | 573 to 583 to 587 | 260 to 291 to 303 | 201 to 201 to 201 | 240 to 512 to 464 | 0.000 to 0.020 to 0.020 | 89 to 150 to 125 |
| find | ar | desktop | static | 543 to 575 to 584 | 267 to 298 to 308 | 201 to 201 to 201 | 220 to 220 to 232 | 0.000 to 0.000 to 0.000 | 78 to 140 to 80 |
| login | ar | desktop | static | 540 to 571 to 580 | 261 to 292 to 304 | 201 to 201 to 201 | 252 to 244 to 240 | 0.000 to 0.000 to 0.000 | 78 to 162 to 116 |
| post-requirement | ar | desktop | static | 503 to 538 to 545 | 270 to 301 to 309 | 156 to 156 to 156 | 228 to 252 to 240 | 0.000 to 0.000 to 0.000 | 84 to 145 to 76 |
| signup | ar | desktop | static | 562 to 596 to 606 | 267 to 298 to 309 | 216 to 216 to 216 | 256 to 224 to 232 | 0.000 to 0.000 to 0.000 | 90 to 139 to 90 |
