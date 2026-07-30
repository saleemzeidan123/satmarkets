# ADV-5B: the mobility and address interfaces, and the claims gate

ADV-5A put every external location provider behind a rights boundary and the honest
result was that all of them are denied. ADV-5B asks the next question, which is what
happens on the day one of them is permitted.

The package builds the publication rule for movement and visitation figures before any
source exists, builds the National Address interface the same way, and then adds a
structural gate that reads the rendering surfaces themselves. The gate is the part that
mattered most, because it found that the platform was already publishing movement,
catchment, dwell, daytime population and spend figures for every building, and had been
for the whole life of the prototype.

## What the gate found

`src/app/[locale]/building/[id]/page.tsx` hashed the building id, fed it to a linear
congruential generator, and rendered the output as that building's weekly visitor curve,
hourly rhythm, three drive-time catchment rings, dwell time, working-age share, daytime
population and spend index. Three of those values sat in the overview row beside the
counted unit total and the brief count, in the same colour, with no sample label and no
source line.

Because the generator was seeded on the id, the numbers were stable. Reload the page and
they did not move. Finding 72 records the reason that made it worse rather than better: a
number that does not move is a number a reader concludes was measured. A random number is
a bug that announces itself; a deterministic one is a claim.

That is the whole argument for scanning surfaces rather than trusting a module. ADV-5B
could have shipped `mobility.ts`, `sufficiency.ts` and `coverage.ts`, closed the package
on a clean unit suite, and left the fabricated panels untouched, because nothing on that
page imported anything the new modules exported. The gate is worth more than the module it
guards.

Two smaller claims fell out of the same audit. `/ops` listed a data-source row noting
"POI + isochrones", rendered with a green dot, when D27(a) records that no isochrone table
exists in this schema, that the server holds no Navigation-scoped token, and that the
vendor forbids caching isochrone results at all; and the `catchment_population` field help
described a drive-time isochrone the same way. Finding 70. `/area` described its figures
as coming from Saudi telecom partners, payment gateways and data partnerships that were
being onboarded, none of which exist, which owner ruling 7 forbids outright. Finding 71.

Wiring the building profile to the new interface then exposed a fourth. The location
package's barrel re-exported `mobilityFigure` itself, so any page was one plain import
away from a verdict carrying licence reasoning, a register denial code and a list of
unanswered clause identifiers. The same omission argument had already been made for
`transport.ts` in ADV-5A and nobody had applied it here. Finding 73.

## The four gates

A movement figure passes four independent checks in a fixed order, and stops at the first
refusal. Rights, then sufficiency, then data, then coverage. `docs/mobility-privacy-methodology.md`
is the full statement and D29 is the binding record; the short version is that none of the
four substitutes for another. A signed contract does not make a figure computed from
eleven devices publishable, a well-covered panel does not make an unlicensed figure
publishable, and a permitted, sufficient, well-covered source still produces nothing at a
geography SAT refuses to publish at.

The order carries the same weight as the list. A rights denial survives someone recording
an agreement or improving a panel, so it is reported first. Reporting a coverage problem
while a rights problem is true files a licence question as a data-quality question, and
data-quality questions get fixed by engineers without anyone reading a contract. That is
the ADV-5A check-order argument applied one level up.

## The smallest thing SAT will describe is a district

A building-level movement figure is not refused at runtime. It cannot be constructed.
`MobilityAvailable` narrows its geography to city or district, so code attempting to
produce a figure for one address does not compile, and `districtMobilityPanel` does not
accept a building argument at all.

At a district a footfall number is a description of a place. At a doorway it is a
description of behaviour. The building profile therefore shows a district panel or the
reason there is none, and never a number of its own.

## Part E made executable

The twelve clauses at Part E of the regulatory register are no longer prose. Each is a
`ClauseId` in `sufficiency.ts`, `RECORDED_AGREEMENTS` is empty, and assessing a candidate
agreement returns the clauses it fails to answer by name. A partial answer is not a
partial pass. Reading a vendor's terms now produces a diff against a written standard
rather than an impression of one, which is the only negotiating value an interface built
before a contract can have.

`coverage.ts` holds the publication thresholds separately, because a contract that answers
every clause still says nothing about whether one particular figure has enough
observations behind it.

## The view boundary

`panel.ts` is the only route from a verdict to a rendering surface. Its view type has no
field for `reasons`, `code` or `unanswered`, so a page cannot print internal licence
reasoning because a page never holds it. The `sourceRights.denialReason` rule is honoured
by shape rather than by comment.

It carries a second job. A page that names `footfall_index` reads as a page that has one,
so metric vocabulary stays inside the geo package and the surface asks for a panel. That
is what lets the structural gate keep scanning `src/app` and `src/components` for the
vocabulary itself.

The register is read in the page and the resulting map is passed in, because
`getAllSourceRights` uses React's request cache and the geo package must stay importable
by the unit suite.

## The exceptions are tested, not listed

Three surfaces are excepted from the claims gate, and each exception carries a test that
its reason is still true rather than a name on an allow list. `/area` is excepted only
while it stays in `HELD_ROUTES`, keeps rendering its sample tag, and represents no
contract or feed. `LocationScore.tsx` only while nothing imports it. `/find` only while
the phrase there remains a selectable requirement preference with no value beside it, on a
route still in `PRIVATE_PREFIXES`.

A hardcoded allow list decays. A file gets renamed, a reason stops being true, and the
entry survives because nobody rereads it.

## What shipped

New: `src/lib/location/mobility.ts`, `sufficiency.ts`, `coverage.ts`, `address.ts`,
`panel.ts`, with `mobility.test.ts`, `sufficiency.test.ts`, `coverage.test.ts`,
`address.test.ts`, `panel.test.ts` and `claims.test.ts`. All six test files are registered
in the explicit `npm test` list.

Changed: the building profile, rewritten; `/ops` and `assetFields.ts` for finding 70;
`/area` copy in both dictionaries for finding 71; the barrel for finding 73; both
dictionaries lose 19 dead mobility-claim keys and gain ten `mobility*` keys plus corrected
`note` and `metaDesc`.

Records: findings 70 to 74, decision D29, `docs/mobility-privacy-methodology.md`,
regulatory register B1 and Part E, procurement backlog items 4 and 8.

## What is deliberately not done

Nothing here activates anything. There is no mobility source, no agreement and no figure,
and under owner ruling 7 no vendor has been contacted and no data right is represented.
The interface refusing every input today is not a placeholder. It is the check, working.

Finding 74 stays open by intent: `/building/[id]` appears in none of `SITEMAP_ROUTES`,
`HELD_ROUTES` or `PRIVATE_PREFIXES`, so it is neither declared for indexing nor held back
from it. Which of the two it should be is an owner and Codex decision, not an engineering
one, and it is recorded rather than guessed.
