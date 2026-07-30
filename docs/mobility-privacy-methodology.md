# Mobility and visitation: what SAT Markets will and will not publish

Written in ADV-5B, before any source exists. That order is deliberate. A methodology
written after a contract is signed describes what the contract allows; a methodology
written before one describes what the product is willing to accept, and it is the second
that has any force in a negotiation.

Nothing in this document describes a live capability. There is no mobility source, no
agreement and no figure. `mobilityFigure` refuses every input today and the building
profile says so in both languages.

---

## The four gates, in order

A movement, visitation, dwell, catchment or spend figure passes four independent checks
before a reader sees it. They run in a fixed order and stop at the first refusal.

**1. Rights.** Does the register permit a figure from this source to be shown to this
audience. An unknown source has no rights. A register that could not be read denies
exactly as an empty one does, because absence is never a grant.

**2. Sufficiency.** Does a recorded agreement answer every clause at Part E of the
regulatory register: coverage map and gaps, historical depth, refresh cadence, sample
construction and known biases, consent provenance for the underlying subjects, minimum
aggregation threshold, controller and processor roles, storage location, cross-border
transfer basis, audit rights, deletion on termination, and an explicit contractual
prohibition on user-level output. A partial answer is not a partial pass; the unanswered
clauses are returned by name.

**3. Data.** Is there an aggregate for this area at all, and did it come from the source
that was permitted. Absence is not zero and is not an error. A permission is not
transferable between sources, so an observation carrying a different source id is refused
even when both sources are permitted.

**4. Coverage.** Does this particular figure meet the publication thresholds: a
publishable geography, a minimum aggregation count, a period that is recent enough, a
minimum observed share of the population it claims to describe, a stated sample basis and
a method note.

None of the four substitutes for another. A signed contract does not make a figure
computed from eleven devices publishable. A well-covered panel does not make an
unlicensed figure publishable. And a permitted, sufficient, well-covered source still
produces nothing at a geography SAT refuses to publish at.

The order matters as much as the list. A rights denial survives someone recording an
agreement or improving a panel, so it is reported first. Reporting a coverage problem
while a rights problem is true files a licence question as a data-quality question, and
data-quality questions get fixed by engineers without anyone reading a contract.

---

## The smallest thing SAT will describe is a district

A building-level movement figure is not refused at runtime. It cannot be constructed.
The available result type narrows its geography to city or district, so code that tries
to produce a figure for a single building or parcel does not compile.

This is the line that matters most, and it is worth being plain about why. A footfall
number attached to one address is close to a claim about the people who go there. At a
district it is a description of a place; at a doorway it is a description of behaviour.
SAT publishes descriptions of places.

The building profile therefore shows a district panel, or the reason there is none, and
never a number of its own. Before ADV-5B that page did the opposite: it produced a
weekly visitor curve, an hourly rhythm, three drive-time rings, a dwell figure and a
spend index for each building from a generator seeded on the building id, three of them
rendered in the same colour as the counted unit and brief totals. Finding 72 records it.

---

## What an available figure has to carry

Not "should carry". Has to. Every one of these is a required field on the available
result, so a figure that cannot state its own basis fails to typecheck rather than
rendering bare.

The aggregation count, so a reader knows how many observations stand behind the number.
The period it ends at, so nobody reads a figure from two years ago as a description of
today. The coverage share, so a panel covering four percent of a district cannot present
itself as the district. The method note and its known biases, carried with the value
rather than linked from a page nobody opens. And the vendor's required attribution
string, verbatim, taken from the agreement and never composed at the render site, because
an attribution invented where the number is drawn is a breach with good intentions.

A missing attribution is treated as a coverage failure, not as a formatting problem.

---

## What is never held

No record of an individual, whether a device, a person, a trajectory, a visit or a
timestamped event. The available result type has no field for any of them, so this is a
shape rather than a promise.

No travel-time area, cached or stored. Decision D27(a) records that no isochrone table
exists in this schema, that the server holds no Navigation-scoped token, and that the
vendor forbids caching isochrone results at all. If a travel time ever ships it is
computed at request time, carries its method and time context, and is never written down
as a property fact. The drive-time rings that used to appear on the building profile and
the "POI + isochrones" row that used to appear in the operations console were both
assertions of a capability that does not exist; findings 70 and 72 record them.

No user-level output, contractually as well as technically. The prohibition is one of the
Part E clauses, so an agreement that omits it is insufficient no matter what else it
offers.

---

## Why the interface exists before the source does

Two reasons, and the second is the real one.

The first is negotiating position. The clauses at Part E are executable: each is an
identifier in `sufficiency.ts`, and assessing a candidate agreement produces the list of
clauses it fails to answer. Reading a set of terms produces a diff against a written
standard rather than an impression of one.

The second is that the day a source is permitted is the worst possible day to decide what
may be published. There is a signature, a cost, an expectation, and a natural reading of
"we are allowed to use this" as "we may show this". Separating permission from
publication now, while nothing is at stake, means that day involves recording an
agreement and then running a separate, already written check. The interface refusing
everything today is not a placeholder. It is the check, working.

---

## Where this is enforced

`src/lib/location/mobility.ts` holds the four gates. `sufficiency.ts` holds the clauses,
`coverage.ts` the thresholds, `boundary.ts` the rights decision. `panel.ts` is the only
route from a verdict to a rendering surface, and its view type has no field for the
verdict's licence reasoning, register code or clause list, so a page cannot print them
because a page never holds them.

`claims.test.ts` reads every file under `src/app` and `src/components` and fails if any
of them states a mobility figure. Three files are excepted, and each exception carries a
test that its reason is still true rather than a name on a list: the sample trade-area
page is excepted only while it stays out of indexing and keeps its sample tag, the orphan
location-score component only while nothing imports it, and the requirement-finder only
while the phrase there remains a selectable preference with no value beside it.

Decision D29 is the binding record. Findings 70 to 73 are what the gate found.
