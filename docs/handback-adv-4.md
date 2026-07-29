# ADV-4 handback

Codex, this is one consolidated handback for ADV-4, both halves that could ship. It was entered
directly from ADV-3B without waiting for approval, as instructed. Nothing in it needed an owner,
contract or regulatory decision, so nothing paused.

Full records: `docs/adv-4a-closure.md`, `docs/adv-4b-closure.md`. Roadmap marker: `docs/roadmap.md`,
ADV-4 section.

## Scope

The roadmap splits ADV-4 by owner ruling 1. The evidence half proceeds; the indexing half, the
controlled route allowlist over `routePolicy.ts` and the O11 ruling on lifting the site-wide
noindex, stays parked with the rest of launch indexing. This handback covers the evidence half in
full and claims nothing about the indexing half.

ADV-4A: the canonical machine-readable facts. ADV-4B: the three pages the roadmap names as
buildable now without any permission.

## Commits

| Commit | What |
| --- | --- |
| `8cfb7ba` | The canonical machine-readable facts, and the claims guard reaching `public/` |
| `2c2dba1` | The ADV-4A live EN and AR evidence record |
| `3011d99` | The three public records: verification meaning, source register, bilingual standards |
| `d5d1dfa` | The verification page names the state-label collision the live DOM exposed |

Deployments, all production and READY: `dpl_6h9Eh7vrLiujSNK64aDQxNV5rLxk`,
`dpl_BnQAXhrEe5xn52nqAPmQBCjM6ygD`, `dpl_8UthJf1xyKjy5nMa4kTMzUuizXdB`,
`dpl_HBmhMj5zZkSWxURPwrykMM5aWH5H`.

## ADV-4A, in one paragraph

`public/llms.txt` and `public/manifest.webmanifest` are claims written for a machine, shipped
verbatim to the origin, passing through no dictionary, no component, no middleware and no prose
gate. Both still carried the exact positioning frame banned since ruling 3, two folders away from
the file that bans it. The claims guard now reaches `public/`, `llms.txt` is rewritten as the
canonical facts file and no longer advertises the held `/area` or the private `/find`, and both
corrections were verified by reading what the origin actually serves rather than what the
repository contains. The corpus frames were widened by one intervening word on measurement. The
actor-class frames were deliberately not widened, because measured across the whole tree the
widening fired only on true statements, and a guard that fires on a true statement teaches people
to suppress it.

## ADV-4B, and the one design rule underneath it

None of the three pages describes the system. Each one reads it.

`/verification` gets its dimensions from `LISTING_DIMENSIONS`, its state labels from
`verificationStateLabel`, its demotion reasons from `notVerifiedReasonText` and its gate failures
from `gateReasonText`. `/sources` renders `getAllSourceRights()` through an enum-to-label map, so
no source's rights are written into a dictionary. `/bilingual` generates its counted-noun table by
calling `formatCounted`, the same function every counted sentence on the platform calls, and reads
`RE_GLOSSARY` whole rather than publishing a curated subset.

The dictionaries carry the narrative and nothing else. That is the whole design, and it is the
ADV-4A lesson applied before rather than after: a page that restates a rule in its own words is a
second copy of the rule, and a second copy drifts.

## Two findings from the package that are worth your attention

**A Next.js page module may export only the route contract.** The three pages were written with
their published lists beside them and would not build. The lists now live in
`src/lib/publishedRecords.ts`. The part worth recording is that `.next/types` is stale between
builds and a brand new route has no generated type file at all, so `tsc --noEmit` surfaced this for
one of the three routes and stayed silent on the two with the identical fault. On a new page, the
absence of a local type error proves nothing; only the production build reads all three. The
relocation improved the test rather than merely moving the problem: `adv4b.test.ts` now imports the
real values and compares them to the union declarations, instead of regex parsing page source.

**The live DOM again found what no local gate could.** `/en/verification` shipped in `3011d99`
printing `Not verified` twice in the states table, for `not_verified` and again for `unknown`,
directly under copy reading "There are five, and two of them are not failures". Every local gate
was green, and correctly so: the page is generated from the engine, so the page was right. What it
exposed was a deliberate property of the engine that reads as a bug when the states are enumerated.
`STATE_LABEL.unknown` equals `STATE_LABEL.not_verified` on purpose, because on a listing badge a
dimension nobody has looked at must never read better than one that was looked at and could not be
confirmed.

I did not change the engine. The page now names the collision in both languages, and the test that
guards it computes collisions from `verificationStateLabel` at runtime and requires the published
explanation to name every colliding key, so a future relabelling that creates a new pair fails here
rather than shipping a second unexplained duplicate.

This is the second package in a row where the live surface caught something the local gates could
not. Both times the gates were not wrong, they were scoped to the wrong question, which is the
ledger C19 lesson in a third form.

## What `/sources` currently serves, stated plainly

The deployed page renders its unavailable state in both languages, "The register could not be read"
and "تعذّرت قراءة السجل", because `register.size` is `0` at request time on this deployment. The
Supabase read has been returning a permission error for this session and the page fails closed in
exactly the same way at request time.

I am recording that as evidence rather than as a defect, and the reason is the page's own rule: an
empty table reads as an empty register, so where the register cannot be read the page says so
instead of rendering a table. The populated path is the one every reader will see. The fail-closed
path is the one nobody would have noticed was broken. Confirming it live is worth more.

The five policy notes render regardless, including the D26 refusal, in both languages: the Ministry
of Justice transaction portal and the Najiz interfaces are interactive portals built for people,
not data products, and are never scraped.

## Gate

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npm test` | 1052 pass, 0 fail (1028 before ADV-4) |
| `npm run ar-lint` | clean |
| `node scripts/prose-scan.mjs` | GATE 0 hardcoded prose strings in 0 files |
| Production build | four deployments READY, listed above |

`src/lib/publicFacts.test.ts` and `src/lib/adv4b.test.ts` are both new and both registered in the
explicit list in the `test` script. That list is not a glob.

Adding the three routes to `HELD_ROUTES` pulled their `page.tsx` into the enforced prose tier, so
all three were written against the gate rather than retrofitted to it.

`npm run build` still fails locally for environmental reasons only: `next/font` cannot reach
fonts.googleapis.com from this container. The Vercel production build reaching READY is the build
gate evidence, as in every closure since ADV-2.

## Live evidence, EN and AR

All eight documents were fetched from the deployment and read as served text. The Arabic below is
read out of the served document, not transcribed from an image, which is what your item 5 asked for
after the mojibake in an earlier handback.

`/llms.txt` and `/manifest.webmanifest` serve the corrected bodies byte for byte, with the banned
frame absent from both. `/en/signup` and `/ar/signup` serve each correction once and neither
superseded string at all.

`/en/verification`, `/ar/verification`, `/en/sources`, `/ar/sources`, `/en/bilingual` and
`/ar/bilingual` all serve `200` and render fully. Titles as served: "What verification means | SAT
Markets" and "ماذا يعني التوثيق | سات ماركتس"; "Data sources and rights | SAT Markets" and "المصادر
وحقوق البيانات | سات ماركتس"; "Bilingual standards | SAT Markets" and "المعايير ثنائية اللغة | سات
ماركتس". Every Arabic document serves `<html lang="ar" dir="rtl">`. All six carry
`x-robots-tag: noindex, nofollow` and `cache-control: private, no-cache, no-store, max-age=0,
must-revalidate`.

The collision card as served, both languages:

```
Two of the five print the same words on purpose
not_verified and unknown carry the same badge text, so the table above shows one label twice.

حالتان من الخمس تطبعان النص نفسه عن قصد
تحمل not_verified وunknown النص ذاته على الشارة، لذا يظهر الوصف نفسه مرتين في الجدول أعلاه.
```

The generated counted table as served, which is the public half of the evidence for finding 52:

```
listing   0  0 قائمة      1  قائمة واحدة   2  قائمتان    3  3 قوائم
         10  10 قوائم    11  11 قائمة     99  99 قائمة  100  100 قائمة
month     0  0 شهر        1  شهر واحد      2  شهران      3  3 أشهر
         10  10 أشهر     11  11 شهراً      99  99 شهراً   100  100 شهر
```

Note 11, 99 and 100 for `listing`: three counts, one written form. The difference at those
boundaries is case marking that unvocalised text does not carry, which is why the test asserts four
distinct forms at 1, 2, 3 and 11 rather than one form per row. The table still prints all eight,
because a reader checking the rule needs to see the boundary that does not move as much as the ones
that do.

`/en/verification` reports the current record state: 88 published rows, all demonstration records,
50 recording a seed method and 38 no method, none naming an accountable checker, nine stating a
lister relation that contradicts the filing account. Under the rule the page states, no published
row passes, and every listing surface says so rather than showing a badge.

## Responsive

No new measurement. The three pages reuse the 880 pixel centred column, card and grid primitives
measured across ADV-2's seven fragments. The one new shape is the two term tables on `/bilingual`,
which are CSS grids carrying long strings in both scripts; both cells set `overflow-wrap: anywhere`.
Finding 53 remains open as a documented probe limitation, with the element level overflow assertions
still the passing gate.

## Blockers, unchanged

O11 holds the indexing half of ADV-4. All three pages ship noindex.

O10 holds the derivation, export and retrieval columns on the REGA Rental Index (Ejar) row, which
`/sources` reports rather than resolves.

`broker_overlay` stays `redisplay_policy: internal`. Nothing here draws on it.

The enterprise AI agreement remains absent, so `/sources` reports model input as never on every row.
That is the true current state, not a placeholder.

Supabase reports RLS disabled on `public.spatial_ref_sys` and `public.map_anchors`. Owner decision,
not auto-applied: enabling RLS with no policy blocks all access.

`.github/workflows/arabic-font.yml` remains an owner-side install. The deploy token has no workflow
scope and none may be requested.

Import-boundary lint enforcement, which your item 4 asked for where practical, still has no place to
live: there is no ESLint configuration in the repository at all. The closure wording therefore
remains the narrower truthful claim, and installing a configuration is its own package rather than a
line in this one.

## Next

The roadmap's next unblocked package is ADV-5, location intelligence and interfaces, with its own
hard constraint already recorded from `source_registry`: the live Foursquare terms permit caching
nothing but `fsq_place_id` and Mapbox forbids caching isochrone results at all, so no isochrone
table exists in this schema and none will be created. No vendor contact, no purchase, no
representation that data rights exist.

Also open and independent of any permission: the remaining findings register items, and the
`/listings?city=riyadh` raw-slug defect under owner ruling 5, which was re-confirmed fixed on HEAD
at ADV-2 closure and should be re-checked on the current deployment before it is called closed.
