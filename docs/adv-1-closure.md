# ADV-1 closure: evidence and entity foundation

Package: ADV-1 of the competitive advantage programme (owner directive, 2026-07-28).
Commits: `1047ee6` (Evidence Passport, entity kinds, asymmetric attribution),
`bbed926` (the listing verification resolver and its four independent reasons),
`0625309` (every badge names its gate), `0c4e615` (the claims that live in the label
layer, not in a page).
Deployment verified: `dpl_D2NzqyYQ751YviwKAbWSec74wsmE`, READY, commit `0c4e615`.
Gates at close: `tsc --noEmit` clean, 526 tests passing, `ar-lint` clean, prose-scan
GATE 0 in 0 files.

## What the package was for

ADV-0 wrote down what SAT Markets is permitted to do with each source. ADV-1 is the
other half of the same question: given a record we are permitted to use, what is the
platform actually entitled to say about it, and how does a reader tell.

The starting position was that the platform said one thing about everything. A single
boolean, `listings.ownership_verified`, produced a green badge reading "Verified owner"
on cards, in the gallery, in page metadata and on the home page. That column is true on
all 88 published listings. Every one of those listings is a fixture. No reviewer
countersigned any of them, `verification_method` names the loader that inserted them,
and not one holds an advertising permit. So the strongest claim on the platform appeared
88 times and was earned zero times.

That is register finding 3 and owner decision O3. Finding 24 is the same defect seen
from the party side: `listings.lister_type` and `accounts.type` are different
vocabularies, they disagree on 9 of the 88 published rows, and a badge that reads one
while naming the other is wrong on every one of those nine.

The distinguishing property of this package is that neither defect is fixed by wording.
Both are fixed by making it structurally impossible for one column to carry a claim.

## Scope delivered

**1. The Evidence Passport.** `src/lib/evidence.ts`, 651 lines, 567 lines of test. A
typed record binding a value to the things that make it readable: source, period,
geography, entity kind, unit, statistic kind, transformation, sufficiency, freshness,
confidence, verification scope, correction history and permitted use. Around it sit the
pure functions that read one: `freshnessOf`, `confidenceOf`, `publishability` (which
returns a display form of fact, context or illustrative rather than a boolean), and
`isKnown`.

`isKnown` is the load-bearing one. The directive requires that AI must never convert
unknown data into known data, and the only way to enforce that is for "known" to be a
computed property of the passport rather than an adjective a caller may apply. A
passport that is retracted, insufficient, stale or unsourced is not known, and no
sequence of transformations makes it known.

**2. The entity-kind model and asymmetric attribution.** `EntityKind` separates
property, development, building, unit and the location kinds that D10 already typed.
`attribution(subject, page)` returns `own`, `context` or `denied`, and it is deliberately
asymmetric: a fact true of a building may be shown as context on a unit page inside it,
while a fact true of one unit may never be attributed upward to the building. That
asymmetry is the difference between "this building's published band is 1,421" and "this
unit is worth 1,421", and collapsing it is how a marketplace starts inventing figures
without anyone writing a figure.

**3. The verification dimension model.** Five factual dimensions, each with its own
state and its own reason for not being verified: ownership, authorization, identity,
advertising permit and listing operator. `verificationStateOf` requires a date of check
before any record can read `verified`.

**4. The listing resolver.** `src/lib/listingVerification.ts`, 478 lines, 721 lines of
test. It turns one listing row plus its filing account into dimension results, behind
four independent conditions, each sufficient on its own to withhold a badge:

the record is not a fixture (`is_demo`); the method names a check against something
outside this database, which is why `seed` is excluded from `CHECK_METHODS` even though
it is a real member of the enum and the value on 50 of the 88 rows; there is a date of
check; and an actor countersigned it (`verified_by`, null on all 88).

This is the same shape as `sourceRights.ts`, and for the same reason. A correction that
rests on one flag is one migration away from being undone by accident.

`gate.ts` stays the truth source for whether a listing may publish, and `ownerVerified`
stays its narrowest claim. The resolver is narrower still and never broader: a dimension
that resolves verified here implies the gate boolean was true, and the converse is
deliberately false. `listingVerification.test.ts` asserts that direction over the real
column combinations, so the two cannot drift apart silently.

`relationConsistency` is finding 24 made into a function. It compares the listing's own
relation vocabulary against the filing account's type vocabulary and returns
`consistent`, `contradicted` or `unknown`, and no surface derives a party badge from the
other vocabulary. The byline states the filing relation, the role tag states the account
role, and the verification badge states a named dimension, so the three may differ
without any of them being wrong.

**5. The rendering half.** `src/components/VerificationState.tsx` is the only place a
verification state is drawn. `verifiedBadgeTexts` returns the badges a card may carry,
which today is an empty array on every published row, so `ListingCard` draws no tick at
all and states `verificationIncomplete` instead. The listing page draws
`VerificationSummary`, which names each unchecked dimension and why. D24 runs in both
directions here: confirmed green is never spent on an unearned claim, and the one place
a claim is earned (the lister identity dimension, and the card tick when badges exist)
is never painted anything else.

**6. The claim sweep that source sweeps could not reach.** `0625309` added ten guards
asserting that no surface carries the retired owner claim, and all 518 tests passed. The
deployed page then printed that claim four times in English and four in Arabic. The
guards walked `src/app` and `src/components`; the claim does not live in a page. It lives
in five dictionary keys the pages interpolate, none of which is named after it, and three
of the five were already orphaned, which is exactly why a source sweep could not see them.

`0c4e615` replaced the key-name check with a value-level walk of both dictionaries. That
is the correction that matters beyond this package: a claim is a string a reader sees, so
a guard that checks anything other than the strings is checking the wrong thing.
`src/lib/claims.test.ts` now walks every value in both locales for the retired owner
claim, for bare verification badges, for the deleted keys returning, for performance
promises the platform has not measured ("more replies", "prominent placement"), for the
Rent Index being claimed as ours, and for the unmarked Arabic plural under owner ruling 2.

**7. Owner ruling 2 attribution on the rent band.** The chip beside the published rent
band on `/building/[id]` read "Verified", above a row whose own `data_class` is
`synthetic`. It is now an attribution line reading `REGA Rental Index (Ejar)` in English
and المؤشر الإيجاري للهيئة العامة للعقار (إيجار) in Arabic, which is both the honest
label for that row and what ruling 2 requires of a cited figure.

## Evidence

### Gates at `0c4e615`

`npx tsc --noEmit` clean. `npm test` 526 passing, 0 failing (347 at ADV-0 close, so the
package added 179 tests). `npm run ar-lint` clean. `node scripts/prose-scan.mjs` GATE
public page source 0 hardcoded prose strings in 0 files; BASE shared component source 328
in 15 files, reported and deferred to the page-redesign packages.

### Live EN and AR

Twelve public pages were fetched from `satmarkets-wheat.vercel.app` at `0c4e615` in both
locales and scanned for the retired claim. `retired_en_verified_owner: 0` and
`retired_ar_verified_owner: 0` on all twelve, against 4 and 4 at `0625309`.

The listing page verification panel renders "Not verified" in English and غير موثّق in
Arabic, in `var(--ink)`, with the unchecked dimensions named. The banded building page
renders the ruling 2 attribution in both locales. D24 holds in both directions live: no
unearned green anywhere on the twelve pages, and the lister identity badge carries
confirmed green where the dimension resolves.

### Responsive

The two surfaces this package changed were measured at 320, 360, 390, 430, 768 and 1280
pixels in both locales using `scripts/responsive-probe.mjs`, which reproduces the surface
character for character against the compiled stylesheet and the real font files. This
channel exists because the Chrome extension bridge is down and the container's Chromium
cannot reach production; it measures layout, not the deployed DOM, and its fragments are
copied from source rather than generated from it.

`filter-pills`, the `/listings` rail whose longest chip the package lengthened to
"Ownership verified" and الملكية موثّقة: document overflow 0 at every width in both
locales, and 0 row overflow at 1280. Below 769 pixels the row is wider than its box by
221 to 669 pixels, which is the design (`globals.css:408`, a declared horizontal scroll
rail), and the probe declares it rather than tolerating it silently. Minimum interactive
height 44 pixels at every touch-capable width in both locales, 38 at 1280 on a fine
pointer. Widest chip 161.4 English and 118.0 Arabic against content boxes of 272 to 1232.

`band-source`, the published rent band with its new attribution line: document overflow 0
and row overflow 0 at every width in both locales, 2 lines, widest item 231.8 English and
252.8 Arabic. The 44-character Arabic attribution against the 24-character English one
does not break the block at any width.

`hero-chips` was re-measured unchanged as a regression check: 0 overflow of either kind
at all six widths in both locales.

Result: `PASS  36 measurements, 0 document overflow, no item wider than its content box,
10 inside a declared scroll rail`.

## What the package found and did not fix

Three findings are recorded open rather than swept, each for a stated reason.

**Rank 45, the Rent Index attribution scope.** The four places where the index is cited
as a source beneath a figure are fixed, as is the one place it was claimed as ours. 36
remaining English values and 59 Arabic values name it with no attribution, and most
cannot hold one: a nav label, an eyebrow, a footer link, nine page descriptions. Owner
ruling 2 requires the attribution on every reference, so the ruling needs a scope line
the code can enforce, which is now open decision O15. Sweeping it without that ruling
would put a 44-character Arabic string into a tab label.

**Rank 46, two meanings of green on one card.** The browse card paints the verification
tick and the availability dot the same `#1B7A50`, both permitted by D24 separately. On
the same card they are two unrelated claims in the reserved colour. Worse,
`availabilityShortLabel` returns "Available" for both the fresh and the ageing state and
returns no date in either, so colour alone separates a listing confirmed this week from
one last confirmed months ago, which is what D24's own non-colour label clause exists to
prevent. Open decision O16.

**Rank 47, `/building/[id]` renders edge to edge.** The route returns a bare `<section>`
into a `<main>` with no max-width and no side padding, while its own `loading.tsx`
skeleton renders inside `max-width:1280px` with 24 pixel sides, so the skeleton is inset
and the page that replaces it is not. Measured by the `band-source` fragment as content
box equal to viewport width at all six widths in both locales. Not fixed here because the
correction changes every section on the route and its blast radius is layout rather than
claims; it joins the parked visual-quality package alongside finding 27.

## What remains in ADV-1 scope

Two items are specified and not yet built, and neither blocks ADV-2.

The append-only field-level corrections model. `evidence.ts` types `CorrectionEntry`,
`latestCorrection` and `isRetracted`, and `publishability` already refuses a retracted
passport, so the read path is complete. The write path, a corrections table with an audit
trail and the surfaces that accept a correction, arrives with ADV-6 contributor controls,
where corrections actually originate.

PD4 deed checks under FAL. This extends `gate.ts` dimensions and never replaces
`ownerVerified` as the truth source. It is gated on O13, the separate REGA analytics
licence question, and on O10, so it is blocked by owner and counsel decisions rather than
by engineering.

## Gate assessment

The ADV-1 gate reads: every material public claim traceable to source, scope, time and
verification meaning, and verification rendering satisfies D24 in both directions.

The second half is met and is enforced by test in both directions. The first half is met
for verification claims, which are now traceable to a dimension, a method, a date and an
actor, and for the rent band, which names its index. It is not yet met for every Rent
Index reference on the platform, which is finding 45 and open decision O15, and that is
the honest reading of the gate rather than a claim that it is fully closed.

## Next package

ADV-2, the professional supply and demand workflow. It is the first package that spends
the foundation this one built: a Listing Studio that records what is missing rather than
inferring it, media and quality scoring, requirement matching with explainable reasons,
viewing workflow, shortlisting and deal-room preparation. O12 keeps external notification
channels disabled in code until the consent basis is ruled, and O14 keeps contact release
unspecified until organisation authority is ruled, so ADV-2 opens with in-product
notification only and consent receipts recorded from the start.
