# ADV-4B: the three public records

ADV-4A shipped the facts a machine reads. This is the half a person reads: the three pages
`docs/roadmap.md` names as buildable now without any permission, at `/[locale]/verification`,
`/[locale]/sources` and `/[locale]/bilingual`. All three ship noindex, held under owner decision
O11 with the rest of the indexing half.

Commits `3011d99` and `d5d1dfa`.

## The design rule the package is built on

A page that restates a rule in its own words is a second copy of the rule, and a second copy
drifts. `docs/adv-4a-closure.md` is the record of what that costs: the platform's strongest claim
sat in two files two folders away from the guard that banned it, and stayed there for as long as
no gate walked that folder.

So none of these three pages describes the system. Each one reads it.

`/verification` gets its dimensions from `LISTING_DIMENSIONS`, its state labels from
`verificationStateLabel`, its demotion reasons from `notVerifiedReasonText` and its gate failures
from `gateReasonText`. The dictionary carries the narrative around them and nothing else. Change
a label in `evidence.ts` tomorrow and the page changes with it, because there is no second copy
to forget.

`/sources` renders the live register through `getAllSourceRights()`. Every policy value on the
page is an enum read out of the register and mapped to a label. Nothing about a source's rights
is written into the dictionary.

`/bilingual` generates its counted-noun table by calling `formatCounted`, the same function every
counted sentence on the platform calls, at the boundaries Arabic actually breaks on. A page that
typed those forms into the dictionary would be asserting the formatter is correct rather than
showing that it is. Its term base is `RE_GLOSSARY` read whole, 115 pairs, because publishing a
curated subset would let the shipped mapping and the published mapping diverge, which is the
exact defect the page claims not to have.

## Where the lists had to live, and why that turned out better

The three pages were written with their lists beside them, which is where they read best. It is
not where they are allowed to live. A Next.js App Router page module may export only the route
contract, and `next build` generates a type that fails the compile on any other export:

```
Type error: Type '{ default: ...; generateMetadata: ...; COUNT_BOUNDARIES: readonly number[]; }'
does not satisfy the constraint '{ [x: string]: never; ... }'.
  Property 'COUNT_BOUNDARIES' is incompatible with index signature.
    Type 'readonly number[]' is not assignable to type 'never'.
```

Worth recording precisely, because the local signal was misleading. `.next/types` is stale between
builds, and a brand new route has no generated type file at all, so `tsc --noEmit` surfaced this
for `/bilingual` alone and stayed silent on the two routes with the identical fault. The absence
of a local error on a new page proves nothing. Only the production build reads all three.

The seven constants now live in `src/lib/publishedRecords.ts`, which imports types only and is
therefore pure and test-importable. That relocation improved the test rather than merely relocating
the problem: `src/lib/adv4b.test.ts` now imports the real values and compares them against the
union declarations in `evidence.ts`, `gate.ts` and `listingVerification.ts`, instead of regex
parsing page source for array literals. A state, reason or source added to an engine tomorrow
fails the suite rather than quietly going unpublished.

## The defect the live DOM found, and the one it did not

`/en/verification` shipped in `3011d99` printing `Not verified` twice in the states table, once for
`not_verified` and once for `unknown`, directly beneath narrative copy reading "There are five, and
two of them are not failures". Local tests were green. The page is generated from the engine, so
the page was correct; what it exposed was a deliberate property of the engine that reads as a bug
when the states are enumerated.

`STATE_LABEL.unknown` equals `STATE_LABEL.not_verified` on purpose. On a listing badge that
collapse is protective: a dimension nobody has looked at must never read better than one that was
looked at and could not be confirmed. Changing it would have made the explanatory page tidier and
the product weaker.

So the engine is unchanged and the page now names the collision, in both languages, as its own
card. The test that guards it computes the collisions from `verificationStateLabel` at runtime
rather than hardcoding the pair, and requires the published explanation to name every colliding
key, so a future relabelling that creates a new collision fails here instead of shipping a second
unexplained duplicate.

This is the second time in two packages that live DOM caught something no local gate could. Both
times the local gate was not wrong; it was scoped to the wrong question.

## What `/sources` currently serves, and why that is the evidence

The deployed page renders its unavailable state, in both languages: "The register could not be
read", Arabic "تعذّرت قراءة السجل". `register.size` is `0` at request time on this deployment.

That is not a defect being reported as a feature. `mcp__Supabase__execute_sql` has been returning
a permission error for this session, and the register read fails closed at request time in exactly
the same way. The page's own copy states the rule it is following: an empty table reads as an empty
register, so where the register cannot be read the page says so instead of rendering a table.
Confirming that path live is worth more than a populated table would have been, because the
populated path is the one every reader will see and the fail-closed path is the one nobody would
have noticed was broken.

The five policy notes render in both languages regardless, including the D26 refusal: the Ministry
of Justice transaction portal and the Najiz interfaces are interactive portals built for people,
not data products, and are never scraped.

Three fields are withheld from this page by rule rather than by layout: `denialReason`, whose own
doc comment forbids rendering it publicly because it quotes internal licence reasoning;
`stopCondition` and `reviewedNote`, both recorded in one language only, so publishing them would
put English on the Arabic page and break parity on the page that explains our rules; and any
licensor named on a prohibited row, because naming them republishes the term being respected. The
test asserts each omission against the page source with comments stripped, since the page's own
header comment names the very fields it refuses to render.

## Gate

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npm test` | 1052 pass, 0 fail (was 1034 at ADV-4A) |
| `npm run ar-lint` | clean |
| `node scripts/prose-scan.mjs` | GATE 0 hardcoded prose strings in 0 files, 29 entry points, 101 files reachable |
| Production build | `dpl_8UthJf1xyKjy5nMa4kTMzUuizXdB` READY (`3011d99`), `dpl_HBmhMj5zZkSWxURPwrykMM5aWH5H` READY (`d5d1dfa`) |

`src/lib/adv4b.test.ts` is a new file carrying 18 tests and is registered in the explicit list in
the `test` script. That list is not a glob and a file not named in it silently never runs.

Adding the three routes to `HELD_ROUTES` pulled their `page.tsx` into the enforced prose tier, so
all three were written against the gate rather than retrofitted to it. GATE remains 0.

`npm run build` still fails locally for environmental reasons only: `next/font` cannot reach
fonts.googleapis.com from this container. The Vercel production build reaching READY is the build
gate evidence, as recorded in every closure since ADV-2.

## Live evidence

All six documents fetched from the deployment and extracted as text. Arabic below is read out of
the served document, not transcribed from an image, which is what Codex item 5 asked for after the
mojibake in an earlier handback.

`/en/verification` and `/ar/verification` on `dpl_HBmhMj5zZkSWxURPwrykMM5aWH5H`, `d5d1dfa`. Titles
"What verification means | SAT Markets" and "ماذا يعني التوثيق | سات ماركتس". Both serve all four
dimensions, five states, six demotion reasons and five gate reasons with the raw key beside each
row. Both serve the new collision card: "Two of the five print the same words on purpose" and
"حالتان من الخمس تطبعان النص نفسه عن قصد". The current-state section reports 88 published rows,
all demonstration records, 50 recording a seed method and 38 no method, none naming an accountable
checker, nine stating a lister relation that contradicts the filing account.

`/en/sources` and `/ar/sources`. Titles "Data sources and rights | SAT Markets" and "المصادر وحقوق
البيانات | سات ماركتس". Both serve the unavailable state and all five policy notes. Headers on
both: `x-robots-tag: noindex, nofollow`, `cache-control: private, no-cache, no-store, max-age=0,
must-revalidate`, `x-matched-path: /[locale]/sources`.

`/en/bilingual` and `/ar/bilingual`. Titles "Bilingual standards | SAT Markets" and "المعايير
ثنائية اللغة | سات ماركتس". Both serve the eight rules, the generated counted table for both nouns
at all eight boundaries, and the full 115 pair term base. The Arabic column of the counted table
as served:

```
listing   0  0 قائمة      1  قائمة واحدة   2  قائمتان    3  3 قوائم
         10  10 قوائم    11  11 قائمة     99  99 قائمة  100  100 قائمة
month     0  0 شهر        1  شهر واحد      2  شهران      3  3 أشهر
         10  10 أشهر     11  11 شهراً      99  99 شهراً   100  100 شهر
```

That is the public half of the evidence for finding 52. Note 11, 99 and 100 for `listing`: three
counts, one written form. The difference at those boundaries is case marking that unvocalised text
does not carry, which is why the test asserts four distinct forms at 1, 2, 3 and 11 rather than
asserting one form per row. The table still prints all eight, because the reader checking the rule
needs to see the boundary that does not move as much as the ones that do.

Every Arabic document serves `<html lang="ar" dir="rtl">`. The footer serves the three new links
in both languages: "How we verify", "Data sources", "Bilingual standards", and "كيف نتحقق",
"مصادر البيانات", "المعايير ثنائية اللغة".

## Responsive

No new responsive measurement was taken. The three pages use the same 880 pixel centred column,
card and grid primitives measured across ADV-2's seven fragments, with one exception: the two term
tables on `/bilingual` are CSS grids of two and three columns carrying long Arabic and English
strings. Both cells set `overflow-wrap: anywhere`, and the `Fragment` wrappers are load-bearing
rather than cosmetic, since a `div` wrapper would collapse the three column grid into one. Finding
53 remains open as a documented probe limitation and the element level overflow assertions remain
the passing gate.

## Blockers unchanged by this package

O11 holds the indexing half of ADV-4. All three pages ship noindex.

O10 holds the derivation, export and retrieval columns on the REGA Rental Index (Ejar) row, which
`/sources` reports rather than resolves.

`broker_overlay` remains `redisplay_policy: internal`. Nothing on these pages draws on it.

The enterprise AI agreement remains absent, so `/sources` reports model input as never on every
row, which is the true current state rather than a placeholder.

Supabase reports RLS disabled on `public.spatial_ref_sys` and `public.map_anchors`. That remains an
owner decision and is not auto-applied, because enabling RLS with no policy blocks all access.

`.github/workflows/arabic-font.yml` remains an owner-side install. The deploy token has no workflow
scope and none may be requested.

## Next

ADV-4 is closed on its evidence half. See `docs/handback-adv-4.md`.
