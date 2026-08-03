# Performance baseline, Next.js 16 with Webpack, active

Recorded 3 August 2026 against `c640f42` on `next16-security`, by the
PKG-NEXT16-SECURITY release-correction batch. This file describes the budgets
that the gate actually checks. It does not replace
`docs/performance-baseline.md`, which describes the instrument, the profiles and
the Next.js 14 measurement, and which is still the place to read how a number
here is produced.

## Three records, none of them overwritten

The migration changed what the application costs, and a rebaseline that quietly
replaces the old standard makes the change unreadable afterwards. So there are
three records with three names and only one of them is a gate.

| File | What it is | Is it checked |
| --- | --- | --- |
| `docs/perf-budgets-next14.json` | The budgets that were the gate before the migration, frozen | No |
| `docs/perf-measurements-next14.json` | The forty cell measurement those budgets came from, at `1a99107` | No |
| `docs/perf-measurements-next16-turbopack.json` | The forty cell measurement of Next.js 16 built with Turbopack, at `73c630a` | No |
| `docs/perf-measurements-next16-webpack.json` | The forty cell measurement the active budgets were generated from, campaign A at `c640f42` | No, it is the source of the budgets rather than the standard |
| `docs/perf-budgets.json` | The active budgets, generated from that campaign and validated by a second one | Yes, by `scripts/perf-probe.mjs` |

Every one of them carries a `record`, `framework`, `bundler` and `status` header,
so that a reader who opens one out of context knows what it is and knows whether
anything checks against it. The three frozen files say so in those words. The
active file names the campaign it came from and the campaign that validated it.

## The bundler decision, and the measurement that made it

Next.js 16 defaults `next build` to Turbopack. Vercel runs the `build` script in
`package.json`, so that one line is the entire production bundler choice, and on
16.x it is one word away from changing by accident. It now reads `next build
--webpack`, `build:turbopack` keeps the default available for comparison, and
`dev` is untouched because development is not what was measured.
`src/lib/next16Surface.test.ts` asserts all three, so the line cannot revert
silently.

Both bundlers were measured on the same commit, the same machine, the same
forty cells and the same three cold loads per cell.

| Comparison, Turbopack minus Webpack | Median | Range across the forty cells |
| --- | --- | --- |
| JavaScript per page | 12 kB more | 8 kB to 13 kB more |
| Total bytes per page | 8 kB more | 2 kB to 16 kB more |
| Mobile largest contentful paint | 186 ms slower | 28 ms to 292 ms slower |
| Mobile total blocking time | 24 ms slower | within run to run noise |

Turbopack is slower to paint on a throttled phone on every one of the twenty
mobile cells, and larger on every one of the forty. The median 186 ms of mobile
paint is the number that decided this, because it is the one a reader on a phone
experiences directly.

The aggregate overage count was the argument for keeping Turbopack, and it was
rejected. Counting how many cells cross a budget written for a different
framework tells you how far the old budgets have drifted, not which bundler is
better, and 99 against 102 is not a difference worth a fifth of a second of
mobile paint.

Blocking time is the honest counterweight and it does not favour either bundler.
The two arms recorded a median mobile total blocking time of 453 ms and 454 ms.
The increase over Next.js 14 is the framework, not the bundler, and choosing
Webpack does not recover any of it.

## The active baseline

Median across the twenty cells of each profile, so a single unusual route cannot
move the figure.

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

Mobile paint returns to the Next.js 14 figure exactly. That is worth saying
plainly, because it is the one headline number the migration does not cost
anything on once the bundler is chosen deliberately.

## Migration debt, which is carried and not closed

Changing the baseline changes what the gate compares against. It does not make
the application faster, and nothing below is resolved by this file existing.

The shared framework JavaScript grew by a median 31 kB per page, from 267 kB to
298 kB on mobile, and the same 31 kB appears on desktop because it is the same
framework code. It is not one page's problem: the smallest increase on any cell
is 30 kB and the largest is 33 kB, which is the signature of a floor that moved
under everything rather than a component that got heavier. The listings route
carries the largest absolute figure at 506 kB.

Median mobile total blocking time grew by 137 ms, from 318 ms to 454 ms. The
reviewer's figure for this was approximately 153 ms, taken from the Turbopack
campaign; the two are the same finding measured on two arms, and the smaller
number is not an improvement worth claiming. Blocking time is the noisiest
metric this instrument records, so the direction is reliable and the exact
figure is not.

Both belong to page and bundle optimisation work that has not been scheduled.
They are recorded here and in `docs/status-ledger.md` as debt. Describing them as
resolved because the budgets moved would be the exact failure this three record
structure exists to prevent.

## How the budgets were generated and validated

Two independent campaigns, each a full build of the same commit in its own tree,
each served on its own port and measured by its own forty cell sweep.

Campaign A generated the budgets, using `--write-budgets`, which applies the
headroom formula recorded in `scripts/perf-probe.mjs`. Campaign B then ran
against those budgets with no write flag, which is exactly what the gate does in
anger. A budget file that only its own campaign can pass is not a gate, and
before this batch no budget file in this repository had ever been asked to pass a
campaign other than the one that wrote it.

Campaign B passed all forty cells against the budgets campaign A wrote, on the
run that followed the two corrections below. That result is what makes this a
gate rather than a transcript of one afternoon.

That validation found two things, and both of them were real.

### The largest contentful paint budget needed a floor

The recorded worst run to run ratio for paint was 1.115, and it was wrong,
because it came from repeating one sweep twice. Five campaigns are now on record
and the same unchanged desktop page reports paint anywhere from 240 ms to
544 ms, a ratio of 2.125 on `desktop:en:market` alone. Desktop is measured
unthrottled, so its paint lands in the few hundred milliseconds where the figure
is mostly machine scheduling, and thirty five per cent of a small number is a
small number.

So paint now gets a floor of 500 ms, in the same way and for the same reason
that blocking time has had a floor of 100 ms since the first baseline. The
smallest possible paint budget becomes 675 ms, which sits above the worst
desktop reading on record with margin. Mobile is throttled and its smallest
paint is 772 ms, so the floor never touches the profile where a paint regression
would actually reach a reader.

### One cell is bistable, and it is not noise

`desktop:en:listings` layout shift reads 0.182, 0.147, 0.182, 0.288 and 0.288
across the five campaigns. `desktop:ar:listings` reads 0.056, 0.151, 0.183,
0.056 and 0.056. The mobile cells for the same route sit at 0.019 every time.
That is a page that shifts on one of two timings, not an instrument that cannot
count.

It predates the migration. The Next.js 14 record already carries 0.182, which
means the previous gate would also have failed at random on this cell had anyone
ever run a second campaign against it. It is registered as finding 215 and
assigned to the public discovery and design package, which is where the listings
grid is being worked on next.

Widening the layout shift formula for everything was refused, because an
additive large enough to cover 0.288 would set every cell's budget above the
threshold at which the metric is considered poor, which is a gate that permits
bad pages everywhere in order to tolerate one. Instead the two cells carry a
named exception at 0.31 inside `scripts/perf-probe.mjs`, and the generated budget
file carries the reason next to the number. The exception exists so the gate does
not fail at random while the finding is open. It is not a standard, and it is
meant to be deleted rather than renewed.

## Reproducing this

Google Fonts is unreachable from the sandbox, so `next/font/google` cannot build
here. Both campaign trees use the same workaround slice E established: a copy of
the tree with `src/app/layout.tsx` switched to `next/font/local` against the
thirteen vendored faces in `src/app/fonts/`, carrying `display: "optional"` and
`preload: false` across unchanged. The Turbopack and Webpack arms used byte
identical layout files, so the comparison is between bundlers and nothing else.

```bash
npx next build --webpack
npx next start -p 4331
node scripts/perf-probe.mjs --base http://127.0.0.1:4331 \
  --chromium /opt/pw-browsers/chromium --runs 3 --json /tmp/perf.json
```

Add `--write-budgets` only when the intention is to move the standard, and when
that happens, run a second campaign in a second tree on a second port and check
it against the file the first one wrote. That step is cheap, it takes about ten
minutes, and it is the step that found both of the problems above.
