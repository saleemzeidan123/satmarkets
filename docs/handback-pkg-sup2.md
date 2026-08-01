# Handback, PKG-SUP2: one figure, one grammar, on every surface that shows a listing

Commit `0bf68c6`. Deployment `dpl_9mYWf9XgXdTTnzCGrURi5vtwibjx`, READY, production,
`satmarkets-6becf03yq-sat-markets.vercel.app`.

Findings 120, 121, 122, 123 and 124. Register rows appended; roadmap section added.

## 1. Scope, and why this package rather than another

The supply-side twin of PKG-DEM2, chosen because the governing instruction asks for a real
user-facing supply, demand or Listing Studio outcome ahead of further dormant AI or infrastructure
work, and because PKG-DEM2 had just proved the same class of defect on the demand side. Fourteen
surfaces were each spelling a listing's price and area themselves. A surface that spells a figure
has also, privately, decided what the figure means. Three of them decided wrong, one of them
decided nothing, and one of them was breaking a standing law in production.

Nothing here needed a database write, a schema read, a purchase, a vendor or an owner decision,
which is why it was reachable at all: the whole of it is code the tree already owns.

## 2. The four defects, in the order they matter

**The unit, finding 120, P1.** `listings.asking_rent_sqm` is collected by a form whose own label
reads "Asking rent (SAR per sqm per year)" and, in Arabic, `الإيجار المطلوب (ريال للمتر المربع سنوياً)`
(`ListingStudio.tsx:459`). That is record-level evidence of what the column holds, taken from the
form that fills it, not inferred from the column name or the route type. The public listing page,
the compare table, the map pin and the broker profile rendered it per year. `/dashboard`,
`/dashboard/listings` and `/find` rendered it as `SAR/m²`, with the year removed. So the lister who
set an annual rate was the one reader shown it as something else, on the one screen whose whole
purpose is letting them confirm that the price they entered is the price the market is being shown.

**The absent figure, findings 121 and 122.** `area_sqm` is nullable and seven surfaces
interpolated it unguarded, printing the word `null` beside a unit. One of those surfaces is the
printable flyer, where the defect leaves the building on paper and nothing can be corrected
afterwards. `/advisor` coerced the same null through `Number()` and showed `0 m²`, which is worse
than nothing, because zero is a figure and no one wrote it down. `/saved` drew its unit outside its
own guard and produced `na m²`. On the lister dashboard the brief-match panel rendered
`(b.size_min_sqm || "?")`, advertising every requirement whose occupier deliberately left the size
open as `? to ? m²`, and `||` swallowed a stated zero on the way.

**The numerals, finding 123.** `Number(price).toLocaleString()` with no locale argument resolves
the runtime default rather than the page's. `ListingCard.tsx` and `saved/page.tsx` are client
components, so on a phone set to Arabic the public explore grid and the saved shortlist rendered
asking prices in Arabic-Indic digits. Western numerals in both languages is the first defect
`format.ts` was written to kill and it was live on the most viewed surface on the site. Three
server-side copies of the same call sat one environment setting away from the same result. The same
unit was also spelled six ways across the tree, including `SAR/m2 yr` on `/saved` against a
different Arabic separator from everywhere else.

**Finding 124, P2, found while rewiring rather than by a separate audit.**
`/api/advisor/shortlist` selected both price columns and forwarded only `asking_rent_sqm`, which is
null on every sale row, so an occupier who asked the Advisor to buy was shown inventory with no
prices at all. `AdvisorWidget` printed a bare number with no unit, putting a rent and a sale price
in one column with nothing to tell them apart, and `/advisor` chose its unit by asking which column
happened to be populated rather than what the deal type was. That is finding 120 reached from the
other end.

## 3. What shipped

`src/lib/listingFigures.ts`, new. `netArea`, `askingPrice`, `priceParts`, `annualTotal`,
`priceUnitKey`, `priceUnit`. Every function returns `null` for a figure the record does not state,
and `null` is not "zero", not "?" and not the empty string: it is the caller's instruction to draw
no line at all. The unit is decided from the deal type and nowhere else. `annualTotal` is derived,
so it is stated only where both inputs are stated and only for a lease, since multiplying a sale
price by an area states a number that means nothing.

`priceParts` exists because three cards set the amount large and the unit quietly beside it. That
is typography and it belongs to the card. Deciding what the unit says does not, which is why the
split happens in the module: both halves still come from one place, and a caller cannot take the
amount without the unit that qualifies it.

Rewired: `/dashboard`, `/dashboard/listings`, the printable flyer, `/find`, `/compare`, `/me` in
four places, `/saved`, `ListingCard` (public explore grid), `/brokers`, the `/listings` map pins,
`ListingEnquiry`, the similar-listings card on `listings/[id]`, `AdvisorWidget`, `/advisor` and
`building/[id]`. Two props were deleted rather than rewired: `ListingCard`'s `sqm` and
`ListingEnquiry`'s `unit`, both unit strings threaded in from callers, which is the shape that lets
a component be handed a unit that does not match the figure beside it.

`/api/advisor/shortlist` now forwards `deal_type` and `sale_price`; the `Row` type on `/find` and
the `R` interface in `useAdvisorChat.ts` declare them. `R` had been understating what
`/api/search` returns, which is `select("*, districts(...)")`, so `deal_type` was always on the
wire and only the declaration was missing.

Fifteen dictionary keys holding hand-spelled unit strings were deleted from each locale, every one
checked for readers first. `common.sqm`, `building.perYear` and `locations.officeMedianSuf` were
kept because they still have them. `locationScore.sar` appears unread but was not orphaned by this
work and is out of scope; it is not claimed here as cleaned.

The flyer's tile grid moved from `repeat(4, 1fr)` to `repeat(auto-fit, minmax(128px, 1fr))` so a
withheld tile leaves no hole rather than a gap in a row of four.

The `loc` fix in `src/app/[locale]/dashboard/page.tsx` is part of finding 121's closure: the file
referenced `loc` in three places and never declared it, so the tree did not typecheck until
`const loc: Loc = ar ? "ar" : "en";` was added.

## 4. What is deliberately not asserted

`src/lib/listingFigures.ts` holds no Arabic literals, since it delegates every string to
`format.ts`. It therefore does **not** need adding to the `ar-lint` file list and has **not** been
added. This is stated explicitly because PKG-DEM2's first commit claimed in three places that
`ar-lint` read its new module when it did not, and the correction is only worth anything if the
next package does not repeat the shape of the mistake.

Out of scope and not swept: `MarketingHome.tsx` and `MapExplorer.tsx` carry unit strings for rent
index band figures, which is a different module with a different source and attribution; the
`locationScore` dictionary section; and `locations.officeMedianSuf`'s bare `toLocaleString("en-US")`,
which passes an explicit locale and so is not a numeral-law breach.

## 5. Tests

`src/lib/listingFigures.test.ts`, 22 tests, added by hand to the `test` script. Four of them
reproduce the shipped expression beside the fixed one and watch the old one fail: the Advisor's
`rent ? unitSqmYr : sar` returning `SAR` for a sale, `/find`'s `asking_rent_sqm != null` test
printing nothing for a sale row, `Number(null)` returning `0`, and the joined price matching the
split price only once the word joiners are normalised on both sides. A guard that cannot fail
against the code it replaced is a claim, not a guard.

Suite: 1472 tests, 1472 pass, 0 fail. `npx tsc --noEmit` clean. `npm run ar-lint` clean.
`node scripts/prose-scan.mjs` clean, 0 hardcoded prose strings in public page source. Production
build evidence is the Vercel deployment reaching READY, since `npm run build` cannot complete in
this environment: `next/font` reaches Google Fonts and egress is proxied.

## 6. Live evidence

Fetched from `satmarkets-6becf03yq-sat-markets.vercel.app` in both languages. `<script>` and
`<style>` are stripped before asserting on rendered text, because the whole active-locale
dictionary is serialised into the RSC payload and would otherwise answer for the page.

`/en/listings` and `/ar/listings`. 88 listings rendered. English serves the lease unit as
`SAR/m²/yr` on 70 of them and a bare `SAR` on the remaining 18, which are the sale rows; Arabic
serves `ريال/م²·سنة` and `ريال` in the same split. No card fell back to "on request", so every one
of the 88 carried a price and a unit that agree with each other. Zero Arabic-Indic digits in the
Arabic body, which is the finding 123 breach directly disproved on the surface where it was live.

`/ar/compare`, three listings. Price cells serve `ريال/م²·سنة` for leases and `ريال` for the sale,
the whole-space total serves `ريال/سنة`, and each figure closes its bidi isolate. Zero Arabic-Indic
digits.

`/ar/listings/<id>` and `/ar/listings/<id>/flyer`, and `/en/brokers`. Clean on every check.

Across all six payloads: zero occurrences of `null`, `NaN` or `undefined` in rendered text, zero
standalone `0 m²` or `0 م²` under a boundary-aware match that does not false-positive on
`1,200 m²`, and zero Arabic-Indic digits.

The fifteen deleted dictionary keys were checked against the **unstripped** payload, where the
dictionary is serialised, so their absence is meaningful: `perSqmYear`, `sarSqmYr`, `sqmUnit`,
`rentUnit`, `unitSqmYr` and `sarSqm` return zero hits in both locales, while the control keys kept
on purpose (`perYear`, `officeMedianSuf`, `common`) return their expected single hits. Without the
control the zero would only have proved the dictionary was not in the payload.

## 7. Limits of this evidence, stated rather than glossed

`/dashboard`, `/dashboard/listings`, `/me` and `/saved` sit behind a session. The only live channel
available here is an unauthenticated GET, so those four cannot be reached and are **not** live
verified. For them the evidence is the typecheck, the 22 module tests, the suite and the production
build, and the deployment establishes only that the corrected code is the code being served. Two of
the four are where finding 120 was worst, so this is the weakest part of the package's evidence and
it is named rather than implied.

The live corpus does not exercise the withheld-figure path. All 88 listings state a price and the
rendered payload carries no raw column names, so nullity cannot be read back through this channel
at all. Findings 121 and 122 are therefore verified against the module under test, not against a
live row that trips them.

`/api/advisor/shortlist` is a POST, and this channel cannot POST, so finding 124's route half is
verified by the shipped code and its type declarations rather than by a live sale shortlist.

## 8. Blockers, unchanged

No new blockers. Carried: the database channel is permission denied for `execute_sql`,
`apply_migration` and `list_tables`, which is what still holds findings 113's data half, 117, 118
and 116's schema; `.github/workflows/arabic-font.yml` remains an owner-side install and no
workflow-scoped token has been or will be requested; O10 to O16, contract 6 and provider activation
remain owner and legal gates with the gated features disabled.

## 9. Next package

The supply and demand figure surfaces are now consistent on both sides. The next genuinely open,
dependency-free, user-facing item is the Listing Studio and the lister's own workspace, where the
unit label that started finding 120 is authored and where the remaining defects are reachable
without a database write.
