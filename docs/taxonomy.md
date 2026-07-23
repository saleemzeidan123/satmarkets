# Entity and taxonomy model (WS04)

Typed model for the location and trust entities, so the same meaning is used in
code, URLs, breadcrumbs, titles and schema. Law 7: a development is never a
district. Enforced in code by `src/lib/locationKind.ts` (tested in
`src/lib/taxonomy.test.ts`); route/label wiring is Phase 2 (WS19), this file plus
the typed helper are the Phase 0 deliverable.

## Location entities

The `districts` table carries a `kind` column with three values (live counts as
of 2026-07-23): `district` (48), `area` (21), `development` (8).

| kind | meaning | EN label | AR label | examples |
| --- | --- | --- | --- | --- |
| `district` | an administrative neighbourhood (حي) | District | حي | Al Olaya, Al Malaz, Granada |
| `development` | a named master-planned project, NOT a حي | Development | مشروع تطويري | KAFD, ITCC, Laysen Valley, Roshn Front, Digital City |
| `area` | an analytical/colloquial catchment | Area | منطقة | Al Balad, Corniche, Downtown Buraidah |

Rules the typed helper enforces:

- An unknown or legacy kind coerces to the neutral `area`, never to `district`,
  so a mislabelled row cannot assert district-hood.
- A list that mixes kinds uses the neutral umbrella "Location" / "الموقع", never
  "District".
- Developments carry a project marker next to the name (`isDevelopment`).

Deferred (recorded, not done now): the taxonomy is currently all keyed through a
`district` query parameter. A kind-aware location route or neutral location
parameter is Phase 2 / WS19; until then no development is *labelled* a district,
which is the WS04 acceptance gate, but the URL parameter name change is a
launch-adjacent item.

## Trust / verification dimensions (typed, rendered independently)

The `listings` table already carries these as separate booleans; they must never
collapse into one "Verified" badge (audit rank 3, decision O3 open):

- `ownership_verified` — SAT confirmed the lister owns the asset.
- `authorization_verified` — a broker's written right-to-market is on file.
- `is_sat_listed` — the listing is SAT's own.
- identity verification (account level) — the person/entity is verified.

Each maps to exactly one documented database condition; the display-rule split is
owner decision O3, to be built in Phase 2 (WS17/WS18) with a fixture matrix.

## Other entities (unchanged, listed for completeness)

`buildings` (lat/lng, exact pins) → belong to a location of a known kind;
`listings` → belong to a building and/or a location; `listers` → carry a role
(owner / licensed broker / SAT) and verification records; `requirements` →
occupier demand; market figures → attributed to a source publication (REGA Ejar).
