# PKG-1C closure record (2026-07-27)

Centralized content and metadata system, WS11 and WS12 of `docs/phase1-proposal.md`.
Shipped as `5d67027`, `1a7a75a` and `dd6fa45`, plus this record. Every claim below was
read off the live production preview, not off local source or local tests.

## What the package was asked to do

Move all public prose into the two dictionaries behind the controlled vocabulary; add
typed unit, plural and numeral formatters; upgrade the metadata factory to reciprocal
`en`, `ar` and `x-default`, complete Open Graph and Twitter, and a unique bilingual title
and description per public template.

## WS11: the dictionaries and the formatters

`src/lib/format.ts` is the single numeric and unit surface: `formatNumber`,
`formatInteger`, `formatDecimal`, `formatPercent`, `formatRange`, `formatUnit`,
`formatArea`, `formatWithUnit`, `formatMoney`, `pluralCategory`, `plural`, `formatCount`,
`formatCounted`, `bidiIsolate`, `ltrIsolate`, `fill` and `fillProse`. Units live in one
typed `UNITS` table with locale pairs and aliases, so an Arabic card can no longer print a
Latin unit: that was assembled from four inline strings on the lister profile and from
similar inline pairs on the listing card, the flyer and the rent index. Plurals go through
the CLDR categories for Arabic rather than one noun form printed after every number, and
composites are held together with a word joiner (U+2060) so `299 SAR/mo` cannot break
across a line at 320px. Numerals stay Western in Arabic, per the standing law, and the
composite is wrapped in bidi isolates only where it sits inside laid-out prose.

`scripts/prose-scan.mjs` is the gate. It is AST based rather than regex based, and it
implements the allowlist named in the proposal: CSS values and units, `className`,
`style`, `aria-*` and `data-*` attribute values, import paths and URLs, dictionary keys
and enum identifiers, single-token codes, numeric and punctuation only strings, and an
explicit `/* i18n-exempt */` marker. A string is flagged only when it carries two or more
natural-language words in Latin or Arabic script outside those categories.

Current reading:

```
GATE  public page source:   0 hardcoded prose strings in 0 files
BASE  shared component source: 333 in 16 files (reported, deferred to the page-redesign packages)
NOTE  library modules: 969 strings (typed EN/AR catalogues, pairing asserted by test)
```

The BASE tier is the shared shell and the shared components, which Codex deferred to the
later page-redesign packages. It is reported rather than silently excluded.

## WS12: the metadata factory

`src/lib/meta.ts` builds every public head. `localeMeta` and `pageMeta` are the only two
entry points, and `meta.test.ts` asserts that no public template hand writes `alternates`
or `openGraph`. The factory emits the reciprocal triple, complete Open Graph including
`locale` and `locale:alternate` and a sized locale share card, and a Twitter card carrying
the same image. It also strips the invisible bidi controls that the formatters add for
prose, because a title is not prose.

Indexing is unaffected. The site-wide noindex is the `x-robots-tag` response header owned
by the middleware and `src/lib/routePolicy.ts`; `meta.ts` does not touch it.

## Evidence: rendered heads

Nineteen public templates in two locales, thirty-eight URLs, all HTTP 200. Every one
passed on every check:

Unique bilingual title and unique bilingual description per template. Canonical exactly
`https://satmarkets-wheat.vercel.app/{loc}{path}`. The reciprocal set exactly `en`, `ar`
and `x-default`, with `x-default` equal to the `en` URL. All ten required `og:*` fields
present (`title`, `description`, `url`, `site_name`, `locale`, `locale:alternate`, `type`,
`image`, `image:width`, `image:height`, `image:alt`). All four required `twitter:*` fields
with `card` = `summary_large_image` and the same image. `og:locale` `en_US` and `ar_SA`.
`og:image` `/og-{loc}.png`. `x-robots-tag: noindex, nofollow` on every URL. Arabic script
present in every Arabic title and description and absent from every English one. No bidi
controls and no em dashes in any head string.

Nineteen unique titles and eighteen unique descriptions per locale. The single repeated
description is two instances of the flyer template, which is correct: uniqueness is
required per template, and even the two flyer titles differ because each names its
listing.

The flyer fallback was exercised live rather than assumed.
`/ar/listings/40347a1f.../flyer` renders the described-sentence fallback, because that
seed row has no `title_ar`, while `/ar/listings/a0000000...0101/flyer` renders the named
title. Both declare `og:type article`.

## The one real defect found during the audit

`/lister/[id]` was calling `localeMeta` with no options, so a single-entity profile
declared `og:type website`, the value `meta.ts` explicitly reserves for index pages, while
its four sibling detail templates all declared `article`. This is exactly the class of
disagreement the factory exists to remove, and it had survived inside the factory's own
call site. Fixed in `dd6fa45` with a regression test that reads the call sites rather than
a return value, because the defect is a forgotten argument.

Verified live after deployment, both locales: `og:type` is now `article`, `og:locale` is
`en_US` and `ar_SA`, the image is `/og-en.png` and `/og-ar.png`, the reciprocal triple is
intact, and the head carries no bidi controls and no em dash.

## Evidence: live layout at six widths

Five changed pages in two locales at 320, 390, 430, 768, 1024 and 1440 px, sixty
measurements. Zero horizontal overflow at every width in both languages, and the correct
`dir` on every load. Document width tracked the viewport exactly at every step.

At 320px, zero clipped leaf text nodes on every changed page, and identical English and
Arabic leaf-node counts on all five: pricing 274 and 274, about 130 and 130, neutrality
127 and 127, advisor 71 and 71, area 264 and 264. The Arabic page is a true semantic
mirror, not a shorter summary.

A suspected Arabic clipping on `/ar/area` at 390px was chased down and dismissed: the
floating chat launcher overlays the map legend, and the only real clipping relationship on
that page is the map clipping its own isochrone rings, which is by design.

Note on method: `resize_window` reports success but does not change the rendering
viewport in this bridge, so the widths were produced with an in-page iframe rig at real
CSS widths. Media queries respond to the iframe width, and the 1440px frame is scaled
inside a clipping box so it fits the window.

## Evidence: the Arabic laws

Across `/ar/pricing`, `/ar/about`, `/ar/neutrality`, `/ar/area` and `/ar/advisor`: zero
Arabic-Indic digits, zero em dashes, and the only multi-word Latin runs are the brand
mark, the language switcher and the FAL licence line. The live pricing tiers match the
unit tests exactly, in both languages, word joiners included.

## Gate

`npx tsc --noEmit` exit 0. `npm test` 267 pass, 0 fail. `npm run ar-lint` clean.
`node scripts/prose-scan.mjs` GATE 0 in 0 files.

## Handback to Codex

Items found while doing this package that are outside its scope, are a ruling for Codex,
or are deliberately left alone.

**Route policy.** `/hbu` and `/login` are linked from the public header and footer but
appear in neither `SITEMAP_ROUTES`, `HELD_ROUTES` nor `PRIVATE_PREFIXES`. Reclassification
is Codex's call, and whichever way it goes it needs a same-commit `docs/routes.md` update.

**A generic requirement title.** `/requirements/[id]` serves "Requirement" and "طلب مساحة"
for every requirement even though the rows carry real titles, because a client page cannot
export `generateMetadata` and its head therefore lives in a route-segment layout that does
no data fetch. Listing, building, lister and flyer all name their entity. Flagged rather
than fixed, because naming the entity means adding a server fetch to that layout, which is
new scope.

**Seed-data gaps.** Two of eighty-eight published listings have no `title_ar`
(SATM-BB3FCB59 and SATM-A0DC83D0). They exercise the fallback correctly, so this is a data
observation, not a defect.

**Scan rules worth adding.** `ar-lint`'s em-dash sweep matches the literal character and
does not catch the same character written as a `\u2014` escape in source. Separately, the prose scan now excludes
directive prologues on syntactic position, which is an allowlist addition beyond the four
categories named in the proposal and should be ratified or removed.

**Vocabulary still outside the controlled set.** `WatchBanner.tsx` and the private `/ops`
page carry their own segment vocabularies. `src/lib/market/verdict.ts` and
`src/lib/translate/glossary.ts` still spell "الفئة A" with a Latin letter, the same defect
class corrected on the public pages, at NOTE tier and so outside the GATE.

**Duplication introduced by the tests.** `DETAIL_ROUTES` now exists in both
`scripts/prose-scan.mjs` and `src/lib/meta.test.ts`, so `docs/routes.md` mirrors two copies
rather than one.

**Copy and vocabulary changes made inside this package**, listed because they change
visible wording. `segmentLabel` derives grade-segment wording from `gradePhrase`, so
"فئة A" became "فئة أ" on `/rent-index`, in `RentBand` and in the advisor analyser, and
`clinic` now reads "عيادات ضمن مبانٍ فئة أ". Advisor chips and the search prefill likewise
say "فئة أ". `/rent-index` asset names now come from `labels.ts`, so retail rows read
"Retail & F&B" and "تجزئة ومطاعم", and three segments (`blended`, `prime`, `street`) were
added to the `labels.ts` SEGMENT table. The em dash and the raw `2026-06` period are gone
from `/rent-index`. The `neutrality` first commitment had fully diverged between the two
languages and the Arabic was rewritten to mirror the English. The advisor handoff
sentence's missing-label fallback was asymmetric between languages and is now shared.
`/about` no longer says the Rent Index publishes "median" rents; it says "average" and
"متوسط". The pricing comparison table spelled the absence cell two ways in Arabic and now
spells it once. A `sar_month` unit was added to `UNITS` with three aliases.

**Left alone on standing instruction.** `src/app/not-found.tsx` still carries `btn-gold`
and `text-charcoal`; untouched because another broad cosmetic colour sweep is forbidden.
At 768px the shared header's "List your space" call to action wraps to three lines in
English and the navigation labels wrap in Arabic; untouched because the shared shell is
deferred to a later page-redesign package.

**Still open from PKG-1B, administrative only.** The owner must install
`.github/workflows/arabic-font.yml`. The deploy token has no workflow scope and a
workflow-scoped token is not being requested.

**Backlog, not actioned.** The Arabic wording improvement from "رقمك" to "سعرك المقترح",
kept for the later copy-polish pass on Codex's instruction.
