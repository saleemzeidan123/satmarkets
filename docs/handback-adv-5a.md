# ADV-5A handback

## Scope, and why it is not the scope the package started with

ADV-5 was meant to open with the SPL National Address interface and the mobility
procurement requirements, on the assumption that location intelligence was a capability
the platform did not yet have. Discovery found the opposite. Four code paths were already
calling third-party geography services in production, and none of them consulted
`source_registry`.

So ADV-5A is not an addition. It puts what was already running behind a boundary, and the
honest summary of the outcome is that every external location provider is now denied,
because the register permits none of them.

The four paths:

`src/lib/locationFacts.ts:driveMinutes` called the Mapbox Directions API, held the answer
under `next: { revalidate: 86400 }`, and rendered the minutes on a public listing page.
The register records `foursquare_mapbox` as `derived_display_policy: none`, and D27(a)
says travel time is computed at request time, carries its method and time context, and is
never stored as a property fact. Finding 68.

`src/app/api/places/route.ts` read two API keys at module scope and sent the visitor's
typed query to Google Places, then Mapbox Search, then Photon.
`src/app/api/geocode/route.ts` sent the same typed query to Photon. Neither vendor is
registered. A person typing text does not establish that the text is public: a tenant
search can name a brand, a budget or an unannounced expansion. Finding 69.

`src/app/api/geo/resolve/route.ts` follows a short map link the user pasted. That one is
different in kind and is deliberately out of scope, because it is the user's own link
resolved on their behalf rather than our query built from their data. It is recorded as
excluded in `src/lib/location/registry.ts` rather than silently omitted.

## The thing worth carrying forward

`driveMinutes` degraded correctly. With `MAPBOX_TOKEN` unset it returned null, the page
fell back to straight-line distance, and everything looked right. That is exactly why
nobody noticed it checked no permission. The only thing standing between a public page
and an unlicensed value was an unset environment variable.

So the check order in `src/lib/location/boundary.ts` is the design and not an
implementation detail. Rights are evaluated before credentials: register unreadable, then
no row for the source, then the use is not permitted for this audience, then the request
carries user text and no processing agreement is recorded, then no endpoint is wired, and
only last, no declared credential is present. A rights denial survives someone adding a
token. A credential denial survives nothing. Reporting the second when the first is true
is how a licence problem gets filed as a configuration problem.

## The package

`src/lib/location/` mirrors `src/lib/ai/` exactly, and for the same reason. `registry.ts`
declares every vendor with its source id, host, credential names and what kind of use its
answer represents, and hostnames appear in exactly one file. Some entries deliberately
name a source id with no row, because the register's own first rule is that an unknown
source has no rights, so an undeclared vendor denies itself without anyone having to
remember a check. `boundary.ts` decides and reads no environment variable at all.
`transport.ts` is the only socket, private to the gateway and absent from `index.ts`,
with every URL built from `provider.host` and every request `cache: "no-store"`.
`gateway.ts` is the only route to the socket and runs the boundary first per candidate, so
a denial costs no request but is still recorded in the returned reasons.

`travel.ts` returns a typed union, so a travel time carries its own method and time
context rather than arriving as a bare number the render site labels from memory.

A second gate, `PROCESSING_AGREEMENTS_IN_FORCE`, governs any request carrying text the
user typed. It is deliberately separate from `AI_AGREEMENT_IN_FORCE` and is not implied by
it, and it is a compile-time constant rather than an environment read, because an
environment variable is a deployment setting and this is a contractual fact.

## What the product does now

Autocomplete serves our own indexed districts alone. Geocode returns an empty list.
Listing pages show straight-line distance and walking time, with no drive time.

Two consequences were deliberate. `indexedPlaces` was un-gated from the `v=1` flag,
because with the external list correctly denied a flag-less caller would have seen an
empty box, and an empty box invites the reader to conclude we have no coverage rather
than that we hold no licence. And the geocode route returns an empty list rather than an
error, because `LocationPicker` already tolerates it and the three ways a lister actually
sets a location all still work: pasted coordinates, a pasted Maps link, and placing the
pin by hand. What is lost is a convenience, not the task.

Denial reasons are never returned to a caller. They quote internal licence reasoning,
which is the rule `denialReason` already follows.

## Commits

- `c0ca303` ADV-5A: the location rights boundary, and the four geo paths that were
  reaching providers with no register check

One commit, because the boundary and the four call sites are one change: shipping the
package without rewiring the callers would have left the defect in place behind a module
that claimed to have fixed it.

## Tests

`npm test`: 1089 passing, 0 failing, up from 1052. Both new files are registered in the
explicit `scripts.test` list, which is an enumeration and not a glob, so an unregistered
test file silently never runs.

`src/lib/location/boundary.test.ts`, 18 tests, including the two that pin the package:
with the register as it actually stands every public geo call is denied, and adding every
credential does not open a single one of them. Credential names in that file are read from
the registry rather than written out, because a test that hardcoded them would be the
first thing to quietly reopen the single-file rule.

`src/lib/location/gateway.test.ts`, 19 tests. It asserts that the three hostnames and five
credential names appear in no file outside `transport.ts` and `registry.ts`; that the
transport is imported by the gateway and nothing else; that `index.ts` does not re-export
it; that no module in the package names a cache option; that every fetch is in the
transport and every one is `no-store`; that every URL interpolates the declared host; and
that three public calls with a throwing fetch installed open zero sockets, including with
every declared credential present.

The first full run failed three tests, and all three were the same class of problem: a
structural scan matching something it was not about. The AI transport scan caught the new
location transport; the new geo transport scan caught the AI one; and the `driveMinutes`
absence scan caught the two test files that name `driveMinutes` in order to assert its
absence. All three were fixed by scoping rather than by weakening the assertion, since a
guard that punishes its own evidence is a guard somebody deletes.

## What the structural test proves, stated narrowly

It does not prove that no other socket is expressible. A future edit could assemble a
hostname from fragments, exactly as this test assembles its own needles so as not to match
its own scan. Import-boundary lint would be the stronger enforcement and remains
unavailable for the reason already recorded in `docs/adv-3a1-closure.md`: this repository
has no ESLint configuration at all, so adding one is its own package rather than a line in
this one.

So the claim made here is the narrow one Codex accepted in ADV-3A.1 item 4: all currently
known and registered location provider integrations are centralized and guarded.

One guard was corrected rather than added. The AI structural scan carried a comment
explaining that Google's model header is not a needle because `/api/places` is "a
legitimate maps integration". That was true of the header and quietly wrong about the
route, which was at that moment calling three vendors with no register check. The comment
now says so and points at this package.

## Live evidence

Deployment `dpl_BYPbpRgVW3dUHTKyvZ5pz47dhvRa`, READY, production, commit `c0ca303`. The
Vercel build reaching READY is the production build evidence, since the local build cannot
fetch the four Google-hosted font families from this container.

`/api/places?q=olaya&lang=en` returns two indexed districts and `"src":"indexed"`. The
Arabic call returns the same two rows as `العليا / الرياض` and `العليا / الخبر`, also
`"src":"indexed"`. `src` names what actually answered, so the absence of a provider name
is the denial, stated without quoting a licence reason.

The clearest single piece of evidence is `/api/places?q=kingdom+centre&lang=en`, which
returns `{"items":[],"src":""}`. Kingdom Centre is a landmark Google Places would answer
for immediately and our district table does not hold. Before this package that query
reached three vendors. It now reaches none, and the response says so by naming none.

`/api/geocode?q=kingdom tower riyadh` and the Arabic `/api/geocode?q=برج المملكة` both
return `{"items":[]}` with no `attribution` key, which is the documented degraded state
rather than an error.

On listing `0024e7a0-6a68-4921-ae12-7107636e9bdc` the airport row reads
`Nearest airport | King Khalid International Airport | 21 km | straight-line distance` in
English and `أقرب مطار | مطار الملك خالد الدولي | 21 كم | مسافة مباشرة` in Arabic. Both
are readable DOM text rather than mojibake, both use Western numerals, and neither prints
a drive time. `Travel time via` and `زمن التنقل عبر` each appear exactly once in the
served document, in the serialized dictionary, and nowhere in rendered output, because
attribution follows the value and no provider value exists. `api.mapbox.com`,
`places.googleapis.com` and `photon` appear zero times in either document.

## Responsive evidence

Stated rather than re-measured, and the reason is worth being explicit about. This package
added exactly one string per locale, `srcTravel`, and that string renders only when a
provider route was actually computed, which is never while every provider is denied. Every
string the listing page now renders in the location section is one PKG-2A already
measured, and the value cell prints the shorter of its two states in both languages. The
API routes carry no layout at all.

When a travel provider is one day permitted, the longer state and the attribution line it
adds to the source row are new layout and must be measured before that switch is thrown.
That is recorded as a condition on enabling travel time, not as evidence already held.

## Gate

`npx tsc --noEmit` clean. `npm test` 1089 passing, 0 failing. `npm run ar-lint` clean.
`node scripts/prose-scan.mjs --strict` clean, 0 hardcoded prose strings in 0 page-tier
files across 29 public entry points and 107 reachable source files. Production build:
deployment READY.

## Remaining blockers

Owner ruling 7 stands and this package deliberately does not pre-empt it: no vendor
contacted, nothing purchased, nothing signed, no representation that data rights exist.
The interfaces for SPL National Address and for mobility exist as declarations with no
host, so they deny for a rights reason before they reach a missing-endpoint reason.
Whether any location provider is ever permitted is an owner and contract decision.

Import-boundary lint enforcement remains blocked on the repository having no ESLint
configuration at all. Adding one is its own package.

`mcp__Supabase__execute_sql` still returns a permission error, so the register cannot be
read from this session and `/sources` renders its fail-closed empty state on the
deployment. The register state used throughout this package was read from
`supabase/migrations/20260728_source_rights_ledger.sql` and `docs/regulatory-register.md`.

Unchanged and still with the owner: RLS is disabled on `public.spatial_ref_sys` and
`public.map_anchors`, which is a decision rather than a fix, because enabling RLS without
policies blocks all access. And `.github/workflows/arabic-font.yml` still needs installing
by hand, since the deploy token holds no workflow scope and one must not be requested.

## Records

Findings 68 and 69 in `docs/findings-register.md`. `docs/regulatory-register.md` Part B1
gains Google Places and Photon / OpenStreetMap as unregistered sources; Part E gains the
location and geography procurement requirement and the Mapbox-specific note that a derived
display and a stored value are two separate permissions and neither implies the other.
`docs/adv-5a-closure.md` is the closure record. `docs/roadmap.md` carries the ADV-5A
marker and names ADV-5B.

## Next package

ADV-5B: the SPL National Address interface, the mobility and visitation interface with
regulatory-register Part E as an executable sufficiency checklist, the privacy
methodology, the coverage-validation gate, the procurement and register updates, and the
`/ops` "POI + isochrones" claim, which contradicts D27(a)'s statement that no isochrone
table exists in this schema and that Mapbox forbids caching isochrone results at all.
