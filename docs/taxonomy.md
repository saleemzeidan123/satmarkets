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

- `normalizeKind` returns the kind only when it is a real taxonomy value, else
  `null`. An unknown or legacy kind is NEVER coerced to `area`: "area" is a
  genuine catchment assertion, not a fallback (Codex Phase 0 correction 3).
- A `null`/unknown kind, and any mixed list, use the neutral umbrella
  "Location" / "الموقع", never "Area" and never "District".
- Developments carry a project marker next to the name (`isDevelopment`).

Deferred (recorded, not done now): the taxonomy is currently all keyed through a
`district` query parameter. A kind-aware location route or neutral location
parameter is Phase 2 / WS19; until then no development is *labelled* a district,
which is the WS04 acceptance gate, but the URL parameter name change is a
launch-adjacent item.

## Reconciliation with the canonical domain model (WS04, Codex correction 5)

This workstream adds only the ONE genuinely missing type, `LocationKind`
(`src/lib/locationKind.ts`); it does not duplicate the working domain models,
which stay canonical and are referenced here:

- `src/lib/types.ts` owns `AssetType`, `DealType`, `Listing` (incl.
  `ownership_verified`, `authorization_verified`, `right_to_market_confirmed`,
  `is_sat_listed`, permit fields), `DistrictRef` and `RentIndexCell`.
- `src/lib/gate.ts` owns the verification/publish logic: `GateFields`,
  `ownerVerified`, `permitOf`, `passesGate`, `gateFailures`. Verification
  dimensions are read through these, not re-declared.
- `src/lib/market/segments.ts` owns the public Rent Index segment contract
  (`average`, never `median`).
- `src/lib/releaseState.ts` owns the release-state vocabulary and tones.

Trust / verification dimensions therefore live in `types.ts` + `gate.ts` and must
never collapse into one generic "Verified" badge (audit rank 3, decision O3
open). A generic "Verified" label may not render unless its specific dimension is
actually true; only that evidence-backed state uses the confirmed-green tone
(release-state tone `verified`), while `available` is informational (Harbor), not
green. Each dimension maps to one documented database condition; the display-rule
split is Phase 2 (WS17/WS18) with a fixture matrix.

## Other entities (canonical, listed for reference)

`buildings` (lat/lng, exact pins) belong to a location of a known kind;
`listings` (see `types.ts`) belong to a building and/or a location; `listers`
carry a role (owner / licensed broker / SAT) and verification records;
`requirements` are occupier demand; market figures are attributed to a source
publication (REGA Ejar, via `segments.ts`).
