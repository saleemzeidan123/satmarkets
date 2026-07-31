# ADV-1C.1 and ADV-1D handback

One consolidated handback, as Codex required, covering both the corrections to ADV-1C and
the real-evidence integration that followed them without a pause between.

## Scope

Codex conditionally accepted ADV-1C at `e13dcd2` and attached seven corrections, then
required ADV-1D to run straight on from them in the same package. Corrections 1, 2, 3, 5
and 6 are record and semantic repairs to work already shipped. Correction 4 is the
integration. Correction 7 is the gate set that has to prove both.

The single most important sentence in this handback is in the last section and is stated
here as well, because it is the one a reader must not have to hunt for: **Codex's ADV-1D
precondition cannot be met today.** There is no rights-cleared REGA Rental Index (Ejar)
figure to demonstrate. The passport that now renders carries a truthful `derived` state
attributed to "SAT Markets own record", not a cleared REGA figure. Everything else in this
package shipped as specified.

## Commits

| Commit | What it carries |
| --- | --- |
| `71ee177` | Corrections 1, 2, 3, 5, 6 and 7, plus the Rent Index half of correction 4. 29 files, 2,449 insertions, 172 deletions. New modules `launchGate.ts`, `rentIndexEvidence.ts`, `sources/catalogue.ts`, `queries/sourceRights.ts`, and the owner checklist. |
| `1486ec3` | The Advisor half of correction 4, and the evidence-card coherence fix on `/rent-index`. 6 files. |

Deployments, both READY: `dpl_BDu7yshKkEYJiNVcRXWf1j6XVMfj` for `71ee177`, then
`dpl_2AqS8vGx6VjcsJwHfX5peLfGnrge` for `1486ec3`, live at
`satmarkets-3c7ql7zer-sat-markets.vercel.app`.

## Correction 1. The corrected inventory terminology

`realInventoryOnly` is gone from the codebase. The only three remaining occurrences of the
string are in explanatory comments recording why the name was wrong, and the structural
test that proves the name is gone strips comments before it scans, so those three cannot
launder a regression.

Codex ruled that `is_demo = false` establishes nothing, and that five facts had been
collapsed into it. They are now five separate values in `src/lib/launchGate.ts`, each with
its own reader:

| Fact | Type | Reader |
| --- | --- | --- |
| record demo status | `RecordDemoStatus` = `flagged_simulated` / `not_flagged` / `unknown` | `recordDemoStatusOf` |
| preview-environment status | `PreviewEnvironment` = `preview_labelled` / `production_unlabelled` | `previewEnvironmentNow` |
| publication authorization | `PublicationAuthorization` | `publicationAuthorizationOf` |
| availability freshness | `AvailabilityFreshness` = `fresh` / `stale` / `unknown`, tolerance `AVAILABILITY_FRESH_DAYS = 30` | `availabilityFreshnessOf` |
| production-count eligibility | `ProductionCountEligibility` with a `ProductionCountBlocker` list | `productionCountEligibility`, `mayCountAsProductionInventory` |

The middle term matters most. `not_flagged` is a statement about a marker, not about a
record. Nothing in the module ever promotes `not_flagged` to authentic, which is Codex's
instruction not to infer authenticity from the absence of a demo marker, expressed as a
type rather than as a convention.

The runtime predicate that replaced the old name is `nonDemoPublishedInventoryOnly`, with
`withoutFlaggedSimulatedRows` as the unconditional form and `releaseVisibleInventory` as
the release-aware one that 16 public query surfaces call. `SIMULATED_FLAG = "is_demo"` is
declared once, so no surface writes the column name by hand.

### The launch gate

`indexingPermitted()` is `indexingSwitchOn() && productionInventorySwitchOn()`. Both
switches fail closed: unset, empty, a typo, "TRUE", "1" or "yes" are all off. One bad
record spoils the whole set, and an empty set is not a clean one, so a corpus that contains
a single sample, synthetic, unknown or unauthorized record cannot clear the gate, and a
corpus of zero records cannot clear it either. `productionCountEligibility` returns every
blocker rather than stopping at the first, because a gate that stops at the first failure
teaches nobody why the second exists.

The middleware and the sitemap read one gate, not two copies of it. A gate test asserts
that, and a second asserts the sitemap emits no listing-detail URL until the records clear
as well.

Exact sample counts remain visible in the preview, which is the branch Codex permitted,
and they remain visible only while the global preview disclosure and the `noindex,
nofollow` response header both hold.

## Correction 2. The source-register architecture

There were never two registries. There was one database table and three ways of naming the
same source, and one of those ways was a bare string literal.

The apparent contradiction resolves as follows. The database register is real and holds
nine reviewed rows written by `supabase/migrations/20260728_source_rights_ledger.sql`. The
ADV-1C handback sentence saying it was empty was false and is corrected in place there and
in `docs/roadmap.md`. What is true is that the public anonymous runtime reads no rows from
`source_registry`, which is finding 88, and which is a visibility defect and not an empty
table.

`src/lib/queries/sourceRights.ts` now distinguishes the four ways a read can end, so that
"we could not read" is never reported as "there is nothing":

- `not_configured`, no Supabase credentials in this environment, so no read was attempted;
- `read_failed`, the read was attempted and errored;
- `no_rows_visible`, the read succeeded and returned nothing, which is finding 88's state;
- `loaded`, rows returned and indexed.

`readSourceRegister` is cached and returns `SourceRegisterRead`. `getSourceRights` throws
on absence and `getSourceRightsOrNull` does not, and the difference is deliberate: a
surface that must not render an unevidenced figure calls the throwing form, and a surface
that must degrade rather than break calls the null form. The Advisor calls
`getSourceRightsOrNull`, and a gate test asserts it never calls the other.

`src/lib/sources/catalogue.ts` consolidates the naming. `REGA_RENT_INDEX_SOURCE_ID =
"rega_ejar"` is declared once, and the string literal `"rega_ejar"` now appears in exactly
one non-test module, that declaration. The rent ingest pipeline, the passport producer and
the attribution label all resolve REGA through the constant. `sourceOwnerLabel` carries the
owner-ruling-2 attribution in both languages, so the REGA Rental Index (Ejar) credit cannot
drift by being retyped.

No synthetic evidence was created to populate anything.

## Correction 3. The closure language

`docs/roadmap.md` and `docs/handback-adv-1c.md` both now say the same narrower thing. ADV-1C
closes four things and only four: the Evidence Passport producer, the public permission
boundary, the first runtime surface and the reachability gate.

It does not close the Evidence Passport product outcome and it does not close strategic
ADV-1. Those stay open until at least one real, rights-cleared material figure is rendered
with its complete evidence and the agreed public surfaces are progressively integrated.
Findings 80 and 81 remain open and are not folded into any closure sentence.

ADV-1D does not close them either, for the reason stated at the top and repeated at the
bottom.

## Correction 4. The integrated routes

Two surfaces were added to the one ADV-1C shipped.

**`/[locale]/rent-index`, server-rendered.** `rentIndexEvidenceViews` builds the passports
from the published row on the server, and the evidence card prints the passport's own value
beside the disclosure rather than the row's. That last part was a coherence defect found
during verification: the card printed `{d.figure}` from the row while the passport beside
it described a value the licence might have withheld, so a withheld figure would have left
a number standing next to evidence that did not cover it. Both tiles now print
`{avg.value ?? ri.na}` and `{band.value ?? ri.na}`.

**`/[locale]/advisor`, via `/api/advisor`.** The route selects the record class alongside
the band through a WIDE-then-NARROW two-attempt select, because PostgREST fails the whole
query on an unknown column and the narrow fallback must not buy a claim it cannot evidence.
It then builds the passports server-side and filters to the views whose value the licence
permits showing:

```ts
passports = rentIndexEvidenceViews(band as RentIndexCell, { locale, geography }, rights)
  .filter((v) => v.value !== null);
```

The client carries them and never builds them. `Msg.passports` is optional and additive, so
`STATE_VERSION` stays at `"v2"` and a persisted pre-ADV-1D conversation simply carries no
evidence, which is what it had. A gate test asserts the hook and the page never match
`rentIndexEvidence`, `rentIndexPassports` or `publicEvidenceView(`, because a client that
assembled evidence would be the surface that displays it vouching for itself.

Codex's boundary, that no passport rides on an Advisor answer unless the figure is
completely traceable through an authorized typed tool result, is enforced by that
`.filter`: a view whose value the licence withheld is dropped, so there is never a passport
without a figure. Its converse is finding 90, below.

The thirteen labelled rows carry: Statistic, Unit, Source, What SAT did, Reporting period,
Geography, Subject, Asset type, Sample, Freshness, What was checked, Correction history,
What is permitted. Average and range are distinct statistics and median is never printed as
average.

## Correction 5. The distinct unavailable states

`EvidenceState` has 11 members and each of Codex's seven conditions maps to its own:

| Codex condition | Member |
| --- | --- |
| not supplied | `empty` |
| supplied but not independently verified | `unverified` |
| verification unavailable | `check_unavailable` |
| stale | `stale` |
| insufficient | `insufficient` |
| access restricted | `restricted` |
| sourced and verified within a defined scope | `held` |

The remaining four are `retracted`, `permission_unrecorded`, `corrected` and `derived`. In
the same pass the member formerly called `unavailable` was renamed to
`permission_unrecorded`, because "unavailable" is the exact word Codex ruled must stop
standing in for several different facts. It is now a statement about a missing permission
record and about nothing else.

The wording no longer implies SAT tried to verify and failed. `empty` says the figure was
not supplied to us and that nothing is estimated in its place. `check_unavailable` says a
check exists whose outcome is not known to us. `permission_unrecorded` says no rights row
could be read. A listing page missing a field reads as a field we do not hold, not as a
broken page.

## Correction 6. The owner items

`docs/owner-actions-adv-1c1.md` is the single checklist, written once so these three stop
reopening.

`public.map_anchors`, 104 rows: the recommendation covers what is actually exposed, what
RLS with no policy would do to it, the minimal read policy if it stays in `public`, and the
case for moving it to a private schema instead. It is an owner decision and no SQL was
applied, because enabling RLS without a policy blocks all access.

`public.spatial_ref_sys`: not touched, on Codex's instruction. The document explains that
the table is PostGIS extension-owned, that the Supabase-supported remedy is not to alter it
in place, and that the concern here is an automated advisory rather than a demonstrated
exposure of anything private, since the table holds public spatial reference definitions.

`.github/workflows/arabic-font.yml`: recorded once as owner-administrative. The deploy
token has no workflow scope and one must not be requested, so the file is delivered for
manual installation and the existing manual and live font evidence continues to be used.
No engineering work is paused on it.

## Correction 7. The gates

All eight required proofs exist as named tests.

| Codex requirement | Test |
| --- | --- |
| preview/sample records cannot silently become production-count inventory | `Codex gate: a preview or sample record cannot silently become production inventory`, plus `one bad record spoils the set, and an empty set is not a clean one` |
| the production indexing gate fails closed | `Codex gate: the production indexing gate fails closed`, plus `the middleware and the sitemap read one gate, not two copies of it` and `the sitemap emits no detail URL until the records clear too` |
| the REGA source is resolved through one canonical path | `ADV-1C.1, owner ruling 2: the REGA owner name is the canonical attribution`, plus the scan asserting the literal appears in one module |
| EN and AR passport values and periods remain identical | `Codex gate: EN and AR carry identical values and identical periods`, and for the Advisor `the Advisor passport carries the figure the Advisor printed, in both languages` |
| unauthorized source details never render | `Codex gate: no unauthorized source detail reaches either language` |
| a real route constructs and displays the complete passport | `Codex gate: /rent-index builds its passports from the row and mounts them`, plus `the machine-readable REGA claim does not ride on simulated rows` |
| unavailable states remain semantically distinct | the `EvidenceState` mapping tests in `evidenceView.test.ts` |
| mobile disclosure at least 44px and overflow-free | `Codex gate: the disclosure is mounted outside the horizontally scrolling table`, `the Advisor disclosure is mounted outside the fixed-height band bar`, and the responsive probe below |

### Gate results

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | silent |
| `npm test` | 1,302 tests, 1,302 pass, 0 fail, 32.4s |
| `npm run ar-lint` | clean |
| `node scripts/prose-scan.mjs` | clean |
| responsive probe, 320 / 360 / 390 / 430 / 768 / 1280, EN and AR | PASS, 156 measurements, no row past its box, no item wider than its content box, 22 inside a declared scroll rail |
| production build | Vercel READY on `dpl_2AqS8vGx6VjcsJwHfX5peLfGnrge` |

The `evidence-summary` fragment measured `minH 16.5` with item heights 22.3, 36.6 and 16.5
at every width in both locales, zero document overflow and zero row overflow.

## Live EN and AR evidence on this deployment

`/en/rent-index`, 200, 270,749 characters. The evidence card renders
"Al Olaya, Riyadh | Office | Average | **1,421** | Computed | Derived by SAT" followed by
the thirteen rows: Statistic Average, Unit SAR/m²/year, Source "SAT Markets own record",
What SAT did "Modelled assumption", Reporting period 2026-Q2, Geography Al Olaya Riyadh,
Subject Market segment, Asset type Office, Sample Sufficient, Freshness "Current · last
updated 30 Jun 2026", What was checked "No verification record is attached to this figure.",
Correction history "No correction has been recorded for this figure.", What is permitted
"Display here Permitted / Export Not recorded / Use by the assistant Not recorded". The
band tile carries 1,250–1,591 with the same structure and Statistic Range.

`/ar/rent-index`, 200, 257,717 characters. Identical values 1,421 and 1,250–1,591,
identical period 2026-Q2, Arabic labels ("نوع الرقم | المتوسط", "المصدر | سجل سات ماركتس",
"الحداثة | محدّث · آخر تحديث 30 يونيو 2026", "العرض هنا | مسموح"). A whole-page
Eastern-Arabic digit scan returns False.

`/en/advisor`, 200, title "AI Advisor | SAT Markets", 16 client chunks, response header
`x-robots-tag: noindex`. `/ar/advisor`, 200, `x-robots-tag: noindex, nofollow`, `dir="rtl"`,
title "المستشار الذكي | سات ماركتس", same chunk hash, no Eastern digits, REGA attribution
present.

The deployed advisor chunk `page-17d2c48e970b0c81.js` contains the full minified
`EvidencePassport` renderer with all thirteen rows in both languages, the 11-state label and
description maps, and the `e.passports` block mounted after the band-bar and before the
retry button, which is the position the gate test asserts.

### The limit of that live evidence, stated plainly

The Advisor's passport could not be exercised end to end on the deployment. This container
has no network egress to the platform and the available fetch tool is GET-only, so
`/api/advisor` could not be posted to. What is proved live is that the renderer and its
mount point are present in the shipped client bundle in the asserted position, plus the
server-rendered Rent Index passports in both languages, plus 20 unit and structural tests
in `src/lib/adv1d.test.tsx`. What is not proved live is a real round trip producing a
passport on screen in a browser. That is an evidence gap in this handback, not a claim.

`x-robots-tag` is a response header set at `src/middleware.ts:71`, not a meta tag, so the
absence of the string "noindex" from the HTML body is correct and is not a regression.

## Findings

Opened: **finding 90**, open. The Advisor prints its published-band figure in prose from
the row, whatever the passport decides. Correction 4's boundary is enforced by dropping
every view whose value the licence withheld, so a passport is never wrong, but a withheld
licence leaves the number visible in the sentence with no evidence beside it. The passport
can therefore be absent but never contradicting, and the withheld case is silent rather
than stated. This is unchanged pre-ADV-1D behaviour and matches the Rent Index district
table, which still prints the row's figure and band; only the evidence card was made
coherent. Gating the prose would make a published sufficient row unquotable platform-wide
and would touch the Rent Index table, the Advisor, listing benchmark lines and every fixture
lacking record-class markers. Leaving it is defensible only while the preview disclosure and
the `noindex, nofollow` header hold and the launch gate stays closed. **Resolution depends
on O10.**

Still open by decision: 80 and 81, per correction 3.

Corrected in place: the ADV-1C "the source register is empty" sentence, in both
`docs/handback-adv-1c.md` and `docs/roadmap.md`, per correction 2 and finding 88.

## The exact strategic items that remain open

**ADV-1D's own precondition is not met.** Codex asked for an existing rights-cleared REGA
Rental Index (Ejar) figure as the first complete demonstration. There is not one, for three
record reasons, none of which engineering can resolve:

1. `rega_ejar` is recorded as `asserted_unverified` with an `internal` ceiling and a
   `stop_condition` of "O10 unresolved". It is not cleared for public display.
2. Finding 88: the public runtime reads no rights row from `source_registry`, so even a
   cleared row would not reach a public surface today.
3. Every `rent_index_published` row is `data_class 'synthetic'` with `is_demo true`. There
   is no real figure in the table to demonstrate with.

Rather than manufacture one, the passport renders what the record actually supports: a
`derived` state, Source "SAT Markets own record", What SAT did "Modelled assumption". That
is the honest output of the machinery Codex asked for, running on the only inputs that
exist. The machinery is complete and the input is missing.

Consequently: strategic ADV-1 is **not** closed, the Evidence Passport product outcome is
**not** closed, and findings 80 and 81 stay open. ADV-1C.1 and ADV-1D close the corrections,
the launch gate, the source-register architecture, the distinct unavailable states and two
further integrated runtime surfaces.

**Carried blockers, unchanged.** The ADV-1 append-only field-level correction write path
originates with ADV-6. PD4 deed checks under FAL 1200025510 are blocked on O13 and O10.
O10 through O16 are open, and **O10 is now on the critical path twice**: once for a cleared
REGA figure and once for finding 90. Finding 74 is open. Contract 6 and provider activation
are owner-side. Any mobility source needs twelve Part E clauses first. ADV-5C has no
candidate dataset to validate against. Owner ruling 7 holds throughout: no service bought,
no vendor contacted, no data right represented, and the gated features stay disabled.

**Owner-side and administrative only.** The three items in
`docs/owner-actions-adv-1c1.md`: the `map_anchors` RLS decision, the `spatial_ref_sys`
advisory, and the manual installation of `.github/workflows/arabic-font.yml`.

## Next package

Codex's to name. On the current record the two candidates that unblock the most are O10,
which is not engineering work but which gates the real figure, finding 90 and PD4 together;
and the ADV-6 correction write path, which turns the passport's correction history from a
read surface into a working one.
