# ADV-5A: the location rights boundary

ADV-5 discovery asked a narrow question, which was whether the platform was ready to
add location intelligence. The answer turned out to be a different question. Four code
paths were already reaching third-party geography services, and none of them consulted
`source_registry` at all.

This package does not add a location capability. It puts the ones that were already
running behind a boundary, and the honest summary of the result is that every external
location provider is now denied, because the register does not permit any of them.

## What was found

Recorded as findings 68 and 69. In short:

`src/lib/locationFacts.ts:driveMinutes` called the Mapbox Directions API, held the answer
under `next: { revalidate: 86400 }`, and rendered the minutes on a public listing page.
The register records `foursquare_mapbox` as `derived_display_policy: none`, and D27(a)
says travel time is computed at request time and is never stored as a property fact.

`src/app/api/places/route.ts` read two API keys at module scope and sent the visitor's
typed query to Google Places, then Mapbox Search, then Photon.
`src/app/api/geocode/route.ts` sent the same typed query to Photon.

`src/app/api/geo/resolve/route.ts` follows a short map link the user pasted. That one is
different in kind and is deliberately out of scope: it is the user's own link, resolved
on their behalf, not our query built from their data. It is recorded as excluded in
`src/lib/location/registry.ts` rather than silently omitted.

## The thing worth carrying forward

`driveMinutes` degraded correctly. With `MAPBOX_TOKEN` unset it returned null, the page
fell back to straight-line distance, and everything looked right. That is precisely why
nobody noticed that it checked no permission. The only thing standing between a public
page and an unlicensed value was an unset environment variable.

So the check order in `src/lib/location/boundary.ts` is the design, not an
implementation detail. Rights are evaluated before the credential:

1. Register unreadable, `rights_unreadable`
2. No row for the source, `no_rights_row`
3. The use is not permitted for this audience, `use_denied`
4. The request carries user text and no processing agreement is recorded, `user_text_denied`
5. No endpoint is wired, `no_endpoint`
6. No declared credential is present, `no_credential`

A rights denial survives someone adding a token. A credential denial survives nothing.
Reporting the second when the first is true is how a licence problem gets filed as a
configuration problem.

## The package

Mirrors `src/lib/ai/` exactly, and for the same reason.

`registry.ts` declares every vendor: its source id, its host, its credential names, and
what kind of use its answer represents. Hostnames appear in exactly one file. Some
entries deliberately name a source id that has no row, because the register's own first
rule is that an unknown source has no rights, so an undeclared vendor denies itself
without anyone having to remember a check.

`boundary.ts` decides. It reads no environment variable at all, so the decision is
reproducible from the register and the request.

`transport.ts` is the only socket, private to the gateway, absent from `index.ts`. Every
URL is built from `provider.host`. Every request is `cache: "no-store"` with no
`next.revalidate`.

`gateway.ts` is the only route to the socket, and runs the boundary first, per candidate.
A denied candidate is skipped without a request being made; it is not silent in the
record, because its reason is accumulated and returned.

`travel.ts` returns a typed union, so a travel time carries its own method
(`driving`), time context (`typical_off_peak`) and attribution rather than arriving as a
bare number that the render site labels from memory.

A second gate, `PROCESSING_AGREEMENTS_IN_FORCE`, governs any request carrying text the
user typed. It is deliberately separate from `AI_AGREEMENT_IN_FORCE` and is not implied
by it, and it is a compile-time constant rather than an environment read, because an
environment variable is a deployment setting and this is a contractual fact.

## What the product does now

Autocomplete serves our own indexed districts alone. Geocode returns an empty list.
Listing pages show straight-line distance and walking time, with no drive time.

Two consequences were deliberate rather than incidental. `indexedPlaces` was un-gated
from the `v=1` flag, because with the external list correctly denied a flag-less caller
would have seen an empty box, and an empty box invites the reader to conclude we have no
coverage rather than that we hold no licence. And the geocode route returns an empty list
rather than an error, because `LocationPicker` already tolerates it and the three ways a
lister actually sets a location all still work: pasted coordinates, a pasted Maps link,
and placing the pin by hand. What is lost is a convenience, not the task.

Denial reasons are never returned to a caller. They quote internal licence reasoning,
which is the rule `denialReason` already follows.

## What the structural test proves, stated narrowly

`src/lib/location/gateway.test.ts` reads the repository and asserts that the three
hostnames and five credential names appear in no file outside `transport.ts` and
`registry.ts`; that the transport is imported by the gateway and nothing else; that
`index.ts` does not re-export it; that no module in the package names a cache option;
that every fetch is in the transport and every one is `no-store`; that every URL
interpolates the declared host; and that three public calls with a throwing fetch
installed open zero sockets, including with every declared credential present.

It does not prove that no other socket is expressible. A future edit could assemble a
hostname from fragments, exactly as this test assembles its own needles so as not to
match its own scan. Import-boundary lint would be the stronger enforcement and remains
unavailable for the same reason recorded in `docs/adv-3a1-closure.md`: this repository
has no ESLint configuration at all, so adding one is its own package rather than a line
in this one.

So the claim made here is the narrow one Codex accepted in ADV-3A.1 item 4: all
currently known and registered location provider integrations are centralized and
guarded.

One guard was also corrected rather than added. The AI structural scan carried a comment
explaining that Google's model header is not a needle because `/api/places` is "a
legitimate maps integration". That was true of the header and quietly wrong about the
route, which was at that moment calling three vendors with no register check. The comment
now says so and points at this package.

## Gate

- `npx tsc --noEmit`: clean
- `npm test`: 1089 passing, 0 failing (1052 before this package, plus 18 in
  `boundary.test.ts` and 19 in `gateway.test.ts`); both new files registered in the
  explicit `scripts.test` list, which is an enumeration and not a glob
- `npm run ar-lint`: clean
- `node scripts/prose-scan.mjs --strict`: clean
- Production build: the Vercel deployment reaching READY is the build evidence, as the
  local build cannot fetch the four Google-hosted font families from this container

Responsive evidence is stated rather than re-measured, and the reason is worth being
explicit about. This package added exactly one string per locale, `srcTravel`, and that
string renders only when a provider route was actually computed, which is never while
every provider is denied. Every string the listing page now renders in the location
section is one PKG-2A already measured: the value cell prints `{km} km` over
`straight-line distance` and `مسافة مباشرة`, which is the shorter of the cell's two
states in both languages. The API routes carry no layout at all. When a travel provider
is one day permitted, the longer state and the attribution line it adds to the source
row are new layout and must be measured before that switch is thrown. That is recorded
here as a condition on enabling travel time, not as evidence already held.

## Live evidence

Commit `c0ca303`, deployment `dpl_BYPbpRgVW3dUHTKyvZ5pz47dhvRa`, READY, production, on
`satmarkets-sat-markets.vercel.app`. The Vercel build reaching READY is the production
build evidence.

`/api/places?q=olaya&lang=en` returns two indexed districts and `"src":"indexed"`. The
Arabic call `/api/places?q=العليا&lang=ar` returns the same two rows as `العليا / الرياض`
and `العليا / الخبر`, also `"src":"indexed"`. `src` names what actually answered, so the
absence of a provider name is the denial, stated without quoting a licence reason.

The clearest single piece of evidence is `/api/places?q=kingdom+centre&lang=en`, which
returns `{"items":[],"src":""}`. Kingdom Centre is a landmark Google Places would answer
for immediately and our district table does not hold. Before this package that query
reached three vendors. It now reaches none, and the response says so by naming none.

`/api/geocode?q=kingdom tower riyadh` and the Arabic `/api/geocode?q=برج المملكة` both
return `{"items":[]}` with no `attribution` key, which is the documented degraded state
rather than an error.

On the listing page `0024e7a0-6a68-4921-ae12-7107636e9bdc`, the airport row reads
`Nearest airport | King Khalid International Airport | 21 km | straight-line distance` in
English and `أقرب مطار | مطار الملك خالد الدولي | 21 كم | مسافة مباشرة` in Arabic. Both
are readable DOM text rather than mojibake, both use Western numerals, and neither prints
a drive time. The rendered source line is the metro and computed-distance line alone. The
strings `Travel time via` and `زمن التنقل عبر` each appear exactly once in the served
document, in the serialized dictionary, and nowhere in rendered output, because
attribution follows the value and no provider value exists. `api.mapbox.com`,
`places.googleapis.com` and `photon` appear zero times in either document.

## Records

- Findings 68 and 69 in `docs/findings-register.md`
- `docs/regulatory-register.md` Part B1 gains Google Places and Photon / OpenStreetMap as
  unregistered sources; Part E gains the location and geography procurement requirement
  and the Mapbox-specific note that a derived display and a stored value are two separate
  permissions and neither implies the other

## Blockers unchanged by this package

Owner ruling 7 stands: no vendor contacted, nothing purchased, nothing signed. The
interfaces for SPL National Address and for mobility exist as declarations with no host,
so they deny for a rights reason before they reach a missing-endpoint reason. Whether any
location provider is ever permitted is an owner and contract decision, and this package
deliberately does not pre-empt it.

## Next

ADV-5B: the SPL National Address interface, the mobility and visitation interface with
Part E as an executable sufficiency checklist, the privacy methodology, the
coverage-validation gate, the procurement and register updates, and the `/ops` "POI +
isochrones" claim, which contradicts D27(a)'s statement that no isochrone table exists in
this schema.
