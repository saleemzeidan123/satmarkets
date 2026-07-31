# ADV-5B handback

## Scope

ADV-5A ended with every external location provider denied, because the register permits
none of them. ADV-5B asks the next question, which is what happens on the day one of them
is permitted, and answers it before that day arrives: the publication rule for movement
and visitation figures, the National Address interface built the same way, and a
structural gate that reads the rendering surfaces rather than trusting the module.

The scope the package ended with is larger than the scope it started with, because the
gate found on its first run that the platform was already publishing movement, catchment,
dwell, daytime population and spend figures for every building, and had been for the whole
life of the prototype. That is finding 72 and it is the most serious figure-integrity
defect found on this platform. The package therefore closes with a deletion at its centre
rather than an addition.

**What this closes, and what it does not.** This handback closes ADV-5B. It does not close
the strategic ADV-5. The SPL National Address integration, the stc Geo Analytics pilot,
the real coverage assessment and the user-value evaluation all remain open, and all four
are contract or data dependent rather than engineering blocked. `docs/roadmap.md` under
ADV-5 carries the full statement. Codex boundary 1, 2026-07-31.

`docs/adv-5b-closure.md` is the full record and is not repeated here. This document is the
handback the directive asks for: scope, commits, tests, live evidence in both languages,
responsive evidence, remaining blockers and the next package.

## What the gate found

`src/app/[locale]/building/[id]/page.tsx` hashed the building id, fed it to a linear
congruential generator, and rendered the output as that building's weekly visitor curve,
hourly rhythm, three drive-time catchment rings, dwell time, working-age share, daytime
population and spend index. Three of those values sat in the overview row beside the
counted unit total and the brief count, in the same colour, with no sample label and no
source line.

The numbers were stable because the generator was seeded on the id. Reload the page and
they did not move, which is worse than obvious noise rather than better: a number that
does not move is a number a reader concludes was measured. A random number is a bug that
announces itself; a deterministic one is a claim.

That is the argument for scanning surfaces rather than trusting a module. ADV-5B could
have shipped `mobility.ts`, `sufficiency.ts` and `coverage.ts`, closed on a clean unit
suite, and left the fabricated panels untouched, because nothing on that page imported
anything the new modules exported.

Three smaller claims fell out of the same audit. `/ops` asserted a stored isochrone
capability that D27(a) says this schema does not hold and the vendor terms forbid caching,
and `assetFields.ts` documented the same plan in a field help string; finding 70. `/area`
described its figures as coming from Saudi telecom partners, payment gateways and data
partnerships that were being onboarded, none of which exist and all of which owner ruling
7 forbids; finding 71. The location barrel re-exported `mobilityFigure` itself, putting a
verdict carrying licence reasoning, a register denial code and unanswered clause
identifiers one plain import away from any page; finding 73.

## What the product does now

A building profile shows one panel where five used to be, and today that panel states that
no movement source is licensed and that when one is licensed a figure will appear at
district level or wider only, carrying its aggregation count, period, coverage share,
method and required attribution. The overview row is three counted tiles.

A building-level movement figure is not refused at runtime. It cannot be constructed.
`MobilityAvailable` narrows its geography to city or district, so code attempting to
produce a figure for one address does not compile, and `districtMobilityPanel` accepts no
building argument. At a district a footfall number is a description of a place. At a
doorway it is a description of behaviour.

The twelve clauses at Part E of the regulatory register are executable rather than prose.
Each is a `ClauseId`, `RECORDED_AGREEMENTS` is empty, and assessing a candidate agreement
returns by name the clauses it fails to answer. A partial answer is not a partial pass.
Reading a vendor's terms now produces a diff against a written standard rather than an
impression of one, which is the only negotiating value an interface built before a
contract can have.

## Commits

`df2f216`, the package. Twenty-nine files, 2,702 insertions, 162 deletions. New:
`src/lib/location/mobility.ts`, `sufficiency.ts`, `coverage.ts`, `address.ts`, `panel.ts`,
with `mobility.test.ts`, `sufficiency.test.ts`, `coverage.test.ts`, `address.test.ts`,
`panel.test.ts` and `claims.test.ts`, all six registered in the explicit `npm test` list.
Changed: the building profile rewritten, `/ops` and `assetFields.ts` for finding 70,
`/area` copy in both dictionaries for finding 71, the barrel for finding 73, and both
dictionaries losing 19 dead mobility-claim keys and gaining ten `mobility*` keys plus
corrected `note` and `metaDesc`. Records: findings 70 to 74, decision D29,
`docs/mobility-privacy-methodology.md`, regulatory register B1 and Part E, procurement
backlog items 4 and 8.

The closure commit carries this handback, `docs/adv-5b-closure.md`, finding 75, and the
accessibility correction on the panel described below.

## Tests

1,154 tests, 1,154 passing, 0 failing, on the closure commit. The package added 84 across
its six new files. `npx tsc --noEmit` is silent, `npm run ar-lint` reports clean, and
`node scripts/prose-scan.mjs --strict` reports GATE 0 hardcoded prose strings in 0 files
across 29 public entry points and 111 reachable source files, exit 0.

The production build gate is the Vercel build reaching READY, because the local build
cannot fetch the four Google font families and fails for that reason alone.
`dpl_Gv1VTqNDB3n4yTyfr25GPAY7nucr` is READY on `df2f216`. `dpl_Fr35Yyy94rB6ZWmP8TZnd8ZPQZH1`
is READY on `e1f83c9`, which had not previously been confirmed.

## Live evidence

Captured on production against `df2f216`, not from local results.

English, `/en/building/0e7c4a8c-984a-4a7d-b41e-1603bf844e1a`, renders "01 Movement and
catchment", then "SAT publishes no visitor, dwell or catchment figure for this building",
then "No movement source is licensed, so there is nothing to publish here", then the rule
paragraph. The overview row reads "Available units 2 / Grade A / Active briefs 0". None of
the five fabricated panels remains.

Arabic, the same id, renders under `<html lang="ar" dir="rtl">` with readable Arabic DOM
text rather than an image or an entity soup: "01 الحركة ونطاق الجذب", then
"لا تنشر سات أي رقم للزوّار أو المكوث أو نطاق الجذب لهذا المبنى", then
"لا يوجد مصدر حركة مرخّص، فلا شيء يُنشر هنا". The canonical attribution
"المؤشر الإيجاري للهيئة العامة للعقار (إيجار)" is present and unaltered, and numerals are
Western throughout.

`/en/area` returns zero matches for telecom partners, payment gateways, data partnerships,
being onboarded and isochrone. It carries 31 "Sample data" tags and responds with
`x-robots-tag: noindex, nofollow`, which is what the claims-gate exception for that page is
conditioned on.

`/en/ops` returns zero matches for "POI + isochrones" and one each for "Foursquare open
POI" and "No travel time and no isochrone is stored".

`/sitemap.xml` contains no `/building` URL. That is finding 74 visible in production rather
than only in the register: the route is neither declared for indexing nor held back from
it.

## Responsive evidence

The existing probe covered no fragment resembling the new panel, so one was added rather
than an old measurement reused. The eight copy strings were pulled programmatically out of
the shipped dictionaries rather than retyped, which matters because the entire measurement
is a measurement of string length; plausible-looking substitute copy would have measured
nothing.

It is measured in its unavailable state because that is the only state that exists. No
mobility source is licensed, so the panel returns the rights-stage key on every call, and
this is what every reader sees on every building today.

Twelve measurements, PASS. Three prose blocks at every width in both directions, no row
past its box and no item wider than its content box, content widths 288, 328, 358, 398,
736 and 1,248 at 320, 360, 390, 430, 768 and 1,280. Document overflow is not claimed,
because `sat-platform.css` sets `overflow-x: clip` and the measurement is therefore not
available; finding 53 records that.

## Accessibility, and the defect the check found in the new panel

The panel shipped with its status line at `text-charcoal/55` and its rule paragraph at
`text-charcoal/45`. Those composite over the paper to 3.96:1 and 2.93:1, both below the
WCAG AA threshold of 4.5:1 for normal text. They are the platform's two habitual muted
tiers and they appear 21 and 19 times across `src`.

On most of those surfaces the tier sits on a footnote beside a figure the reader can
already see. On this panel it did not. The status line was the only thing telling a reader
why there is no figure, and the rule paragraph was the publication rule itself, so the
muted text was the entire content of the panel. A footnote nobody can read is a footnote.
An explanation nobody can read is an absence.

Raised to `/70` and `/60`, which measure 6.61:1 and 4.69:1, on this panel only, with the
reasoning recorded in the JSX so it is not later read as the opening move of a colour
sweep. The other forty uses are untouched: correcting them is a platform-wide visual change
belonging to the parked visual-quality package, and the standing rule against another broad
cosmetic sweep applies. Finding 75 records the pattern, and records the more useful point
underneath it, which is that contrast has no gate at all and that is why a defect of this
class survived every green run.

## Remaining blockers

Nothing in this package is activated. There is no mobility source, no agreement and no
figure. Under owner ruling 7 no vendor has been contacted and no data right is
represented, and the interfaces stay refusing until the owner records an agreement.

Finding 74 is open by intent. Whether `/building/[id]` is declared for indexing or held is
an owner and Codex decision about what SAT publishes, not an engineering one, and it is
recorded rather than guessed. It is the one item in this package that needs a decision
before it can move.

Finding 75 is open beyond the one panel corrected here, assigned to the parked
visual-quality package.

Carried from before and unchanged: the ADV-1 append-only field-level correction write path;
PD4 deed checks under FAL, blocked on O13 and O10; the RLS advisory on
`public.spatial_ref_sys` and `public.map_anchors`, which is an owner decision and is
deliberately not auto-applied because enabling row level security without policies blocks
all access; and `.github/workflows/arabic-font.yml`, which remains an owner-side
administrative install because the deploy credential holds no workflow scope and one has
not been requested.

## Next package

Per the governing directive, the strategy reconciliation. Read the Codex Competitive
Advantage Strategy document, reconcile it against live HEAD, the handovers, the findings
and decision registers and the completed package records, and convert the uncompleted
recommendations into the repository roadmap. Recommendations already shipped, contradicted
by stronger evidence or blocked by data rights are to be recorded as such rather than
implemented. `docs/strategy-reconciliation.md` exists and is where that lands.
