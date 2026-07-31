# ADV-1C handback

## Scope

Codex authorised ADV-1C on the strength of one finding from the strategy reconciliation:
the Evidence Passport is a core SAT Markets differentiator and it existed only as dormant
code. Types, utilities and components had shipped across two packages, every one of them
tested, and not a single reader had ever seen one, because no route imported any of it.

The package therefore has two jobs rather than one. Build the runtime passport, and make
the class of failure that hid the last one impossible to repeat. Boundary 3 states the
first, boundary 7 the second, and the second is the reason this handback spends as much
space on gates as on rendering.

The eleven corrections and boundaries are answered one by one below. Two of them
(boundary 8 on the orphan components, boundary 9 on media integrity) closed as their own
work streams; two more (boundaries 1 and 2) were record corrections that had to land
before anything could be built on top of them.

## Commits

| Commit | What it carries |
| --- | --- |
| `5654802` | Boundaries 1 and 2. The ADV-5 closure records corrected, D31 ruling the Riyadh figure as preview sample inventory, `realInventoryOnly` at 22 public query sites with six documented exceptions, the simulation seeder corrected, and a structural gate. |
| `15939ec` | Finding 79. The `5654802` filter was unconditional and every listings row carries `is_demo`, so it removed the corpus rather than a simulated slice and took the live preview to zero spaces. One predicate now serves both the banner and the filter so they cannot drift. |
| `874fa31` | Boundaries 3, 4, 5, 6, 7 and 10. The producer, the renderer, the two mounted surfaces, the public/internal separation and the reachability gate. Findings 76 and 77 close; 82 to 85 open and close with it. |
| `2d03d9f` | The touch-target floor on the disclosure, and finding 86 registering the hand-enumerated tap-target rule as a class of defect. |
| `8600116` | The repair of `2d03d9f`, which did not work. Finding 87. |

## Boundary 1, the ADV-5 closure records

`docs/roadmap.md` under ADV-5 now states that ADV-5A and ADV-5B close the discovery,
source-rights and egress-control subpackages and nothing else, and that the SPL National
Address integration, the stc Geo Analytics pilot, the real coverage assessment and the
user-value evaluation remain open and are contract or data dependent rather than
engineering blocked. `docs/handback-adv-5b.md` carries the same statement in its scope
section so a reader arriving at either document reaches the same reading.

## Boundary 2, the inventory figure

D31 rules it. Every one of the 93 rows in `listings` carries `is_demo`, 88 of them are
published, and the number a reader sees on `/listings` is 88 sample rows, not marketplace
inventory. The ruling takes the first of Codex's two branches: clearly presented as
sample data in the private preview, rather than suppressed.

`simulatedRowsAreLabelled()` is the single predicate. The layout imports it to decide
whether to mount the preview banner, and `releaseVisibleInventory` imports it to decide
whether to exclude simulated rows, so the label and the filter cannot disagree.
`realInventoryOnly` keeps the unconditional form for the sitemap alone, because a sitemap
entry carries no banner into a crawler index.

Verified live on this deployment: `/en/listings` renders 88 spaces with the sample-data
banner, `/ar/listings` renders 88 مساحة with the same banner, and `/sitemap.xml` returns
`x-robots-tag: noindex` and contains no listing-detail URL.

The first attempt at this is finding 79 and it is the most instructive failure in the
package. The filter was correct in form and catastrophic in effect, the structural gate
was green on the tree that emptied the exchange, and what caught it was reading the
deployment. Two behavioural tests over both release states now cover it.

## Boundaries 3, 4 and 10, the runtime passport

**Source to render, end to end.** A listing row arrives from Supabase. `listingEvidenceByField`
in `src/lib/listingEvidence.ts` turns that row into one passport per field, reading only
what the row actually holds. `publicEvidenceView` in `src/lib/evidenceView.ts` takes a
passport plus the source rights row and returns a `PublicEvidenceView`, which is the only
shape a page is ever handed. `EvidencePassport` in `src/components/EvidencePassport.tsx`
renders it.

**The two mounted surfaces** are `src/app/[locale]/listings/[id]/page.tsx` line 378, the
overview tiles, and line 454, the lease terms grid. Those are where a reader meets a
figure, which is the test boundary 3 sets.

**Why two and not twenty, stated honestly.** `/en/sources` renders `register.size === 0`,
because no external source is licensed today. Every figure whose tier is `sourced`
therefore resolves to `unavailable`, and a passport on a market or rent-index surface
would render the unavailable state and nothing else. The listing detail page is the only
surface today whose figures come from data the platform lawfully holds, which is the
lister's own filing. Mounting passports elsewhere would not be more coverage, it would be
a page of empty passports asserting a breadth that does not exist. The moment a source
enters the register the producer already handles it; the constraint is the register, not
the code.

**The eleven facts of boundary 4** are each a row or a block. Statistic, unit, source owner
with the permitted source reference as a sub-line, the transformation SAT performed,
reporting period, geography, subject entity kind, asset type, sample sufficiency,
freshness with last-updated date, then three blocks: exact verification scope dimension by
dimension, correction history, and the three permissions (display here, export, use by the
assistant). Average and median are distinct values of the statistic row, never merged.

**Boundary 10, the absent states.** A row whose value is absent still renders and says
`Not stated` / `غير مذكور`. Nothing is filled with generated wording and nothing is
inferred. Empty, unavailable, stale, insufficient, corrected, derived and access-restricted
each have their own state and note, and every state that applies is listed rather than only
the one the collapsed line shows, because a figure is routinely several at once. Finding 80
is the visible cost of this rule and it is left visible: a lister's own figures have no
recorded export or model-input permission, so the passport prints `Not recorded` twice on
every first-party figure. Softening that to permitted or hardening it to refused would be
reporting a decision nobody made.

## Boundary 5, progressive disclosure

The compact indicator is `ProvenanceChip`, which says the one thing a reader scanning a
figure needs: who says so. Everything else sits behind a native `<details>`.

Native deliberately. A hand-built drawer needs a client bundle, a focus trap, an escape
handler, an `aria-expanded` pair kept in step with state and a reduced-motion branch.
`<details>` is keyboard-operable, announces its own expanded state, restores focus by
having never moved it, costs no JavaScript and works before hydration. Every one of those
is a requirement in boundary 5.

Two sizing decisions came out of measurement rather than judgement. The chip is rendered
without a date, because the dated form is 180px and cannot wrap while the tile it mounts
in drops to 103px once the listing page's auto-fit grid splits; the responsive probe
measured it hanging 51px out of its own card at four of six widths. Nothing is lost,
because the panel carries the freshness date on its own row and a checked date per
verification dimension, which is finer than the single conflated date the chip showed. And
`ProvenanceChip` gained an opt-in `wrap` prop rather than being overridden from the
caller's stylesheet, because how wide the chip sits is the chip's business and a rule
reaching in to defeat an inline style stops working the day the inline style moves.

## Boundary 6, public and internal separation

`EvidencePassport` receives a `PublicEvidenceView` and nothing else, so the boundary holds
by construction: there is no internal source record, confidential URL, contributor
identity or restricted field on the type it is given, and therefore no path by which one
could be rendered even by mistake. `PublicEvidenceView.corrections` was tightened to
`PublicCorrection` during the package, which is finding 84.

Ten-term leak scan on this deployment, EN and AR listing detail: `denialReason`,
`actorRole`, `contributor`, `internal_note`, `reviewedNote`, `stopCondition`, `sourceUrl`,
`modelInputPolicy`, `redisplayPolicy`, `rightsStatus`. All zero in both locales.

`sourceRights.denialReason` carries an in-code constraint saying callers must not render it
to the public because it quotes internal licence reasoning; the public view type is what
enforces that rather than the comment.

**Stated rather than implied:** there is no authorised internal evidence view today. The
separation exists, the internal side of it is not built, and nothing renders it. That is a
deliberate absence, not an oversight, and it belongs with the ADV-1 append-only
field-level correction write path, which originates with ADV-6.

## Boundary 7, reachability

`src/lib/reachability.test.ts` walks the import graph from every App Router root and fails
when a component or producer named as production has no runtime consumer. That is the
standing answer to how two packages of correct, tested, invisible evidence code were
possible: every unit test passed, and no test asked whether anything imported the module
under test.

Rendered-route evidence, not only unit tests: the live EN and AR listing detail pages on
this deployment each render two `<details class="evi">` elements with matching `evi-sum`
and `evi-body`, with per-summary aria labels `Evidence for Area: Evidence held` and
`Evidence for Asking: Evidence held` in English, `دليل المساحة: الدليل متوفر` and
`دليل المطلوب: الدليل متوفر` in Arabic.

The gate found finding 81 on its first run: five library modules unreachable from every
route root, three of them held in the tree only by a test asserting that nothing imports
them. It remains open.

## Boundary 8, the orphan components

Five reviewed. Four deleted. `ProvenanceChip` integrated, and it is the one that was worth
keeping because the passport needed exactly the thing it did. RentBand was not repaired and
retained: it was removed, which is the disposition boundary 8 asks for when the only
argument for a component is that it exists. Finding 77 closes.

## Boundary 9, property media integrity

Law 8 is in `docs/LAWS.md`: AI must never alter media in a way that changes the apparent
physical reality, condition, dimensions, finishes, fixtures, views, access, defects or
surroundings of a property; originals are preserved; any permitted enhancement must be
non-deceptive and traceable. `src/lib/mediaStandard.ts` is the machine-readable form and
`src/lib/mediaStandard.test.ts` is the regression protection at 25 tests. The larger media
workflow remains part of Listing Studio and is not claimed here.

## Boundary 11, scope

No Superpowers, no Spec Kit, no workflow engine, no MCP adoption, no vector database. One
scope decision was taken and rejected under this boundary and is recorded rather than
quietly dropped: a general gate over every `cursor:pointer` selector was scoped during
finding 86 and rejected, because it would need written exemptions for `.asset-arrow`,
`.dnav a`, `table.dt tbody tr:hover` and `.seg button` before it could be green, and that
is a platform-wide change. It is deferred to the parked visual-quality package alongside
finding 75's contrast gate.

## Accessibility, and the correction the package owes

Native `<details>` with an `aria-label` per summary naming the figure and its state, a
`:focus-visible` outline, logical properties throughout, `overflow-wrap:anywhere` on every
free-text value, and Arabic correction text tagged with `lang` and `dir` when the filing
language is not the reader's, so a screen reader pronounces it correctly and bidi resolves
it against its own base direction.

The touch target took three attempts and the first two are the finding.

Finding 86: the disclosure summary is a control by the platform's own test, and it shipped
at 40px because the platform's WCAG 2.5.5 rule is a hand-enumerated list of selectors and
`.evi>summary` was in none of the lists. The block's own comment already recorded
`.vtool span` as an earlier miss for the same reason. Registered as a class rather than
repaired quietly for a third time.

Finding 87: the fix in `2d03d9f` did not work, and the test written to guard it passed
anyway. The 44px floor sat in the enumerated block, roughly ten thousand bytes before the
base `.evi>summary` rule declaring `min-height:40px`. Both selectors are specificity
(0,1,1), a media query contributes nothing to specificity, so the later 40px declaration
won at every width the query matched. `sat-platform.css`'s
`@media (pointer:coarse){...summary{min-height:44px}}` did not cover it either: a bare
element selector is (0,0,1) and loses to any class-qualified rule regardless of order.
Neither mechanism ever protected this control.

The guard is the more useful half of the correction. It was written precisely because the
height is not in the markup, so a render assertion would have passed while the control was
short. The assertion moved one level up, to the stylesheet, and still did not measure the
outcome: it asserted a 44 existed and a 40 existed, both true of an arrangement in which
the 40 won. It is now a scanner that strips comments, tracks open at-rules, collects every
`min-height` declared for `.evi>summary` with its enclosing media conditions, and for each
of 320, 360, 390, 430, 768 and 1024 takes the last applying declaration and asserts it is
at least 44, with a separate desktop assertion at 1280. Mutation-checked by restoring the
inert arrangement: it fails with `the disclosure resolves to 40px at 320px wide, under the
platform's 44px`, which names the defect rather than merely going red.

Verified on the deployed stylesheet, not the local file. In
`/_next/static/css/bc8b0e0036588653.css`, which both listing detail pages link, the base
rule sits at byte 50066 declaring 40px and the `@media(max-width:1024px)` block opens at
50379 with the 44px declaration at 50404. The last applying declaration at every touch
width is 44px.

## Gates

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | 0 errors |
| `npm test` | 1258 tests, 1258 pass, 0 fail |
| `npm run ar-lint` | clean |
| `node scripts/prose-scan.mjs` | 0 hardcoded prose strings in 0 files |
| Responsive probe | PASS, 156 measurements, 13 fragments, EN and AR at 320/360/390/430/768/1280 |
| Production build | `dpl_2rQxGuzPJwFAx9gJJdbRdPaTccGQ` READY on `8600116` |

The passport's own suites: `evidenceView.test.ts`, `listingEvidence.test.ts`,
`EvidencePassport.render.test.tsx` at 34 tests including the cascade guard,
`reachability.test.ts`, and `mediaStandard.test.ts` at 25.

The local production build cannot be used as the build gate because `next/font` cannot
fetch four Google font families from this container. The Vercel production build reaching
READY is the evidence, which is why the deployment id is quoted rather than a local exit
code.

## Live evidence on this deployment

English listing detail: 214,470 characters, two passports, aria labels as quoted above,
ten-term leak scan zero. Arabic: 204,927 characters, two passports, Arabic aria labels,
leak scan zero. `/en/listings` 88 spaces with the sample banner, `/ar/listings` 88 مساحة
with the same banner, `/sitemap.xml` noindex with no listing-detail URL.

## Findings opened, closed and corrected

Closed: 76, 77, 78 (corrected by 79), 79, 82, 83, 84, 85, 86 (corrected by 87), 87.
Open and left open deliberately: 80 (no recorded export or model-input permission on
first-party figures, an owner and terms question), 81 (five unreachable library modules).

## Remaining dependencies

The ADV-1 append-only field-level correction write path originates with ADV-6 and is not
in this package. No authorised internal evidence view exists yet, stated above. The source
register is empty, which is what limits the passport to one surface. Finding 80 should be
closed before any bulk export feature or any retrieval path that would feed a lister's
figures to a model. Owner ruling 7 continues to hold: no service purchased, no vendor
contacted, no data right represented.

Two items outside this package that belong on the owner's desk. The Supabase advisor
reports row level security disabled on `public.spatial_ref_sys` and `public.map_anchors`;
the remediation SQL is not applied here, because enabling RLS without policies blocks all
access and that is an owner decision. And `.github/workflows/arabic-font.yml` still needs
installing by hand, because the deploy token has no workflow scope and one must not be
requested.

## Next package

ADV-1C is complete. The next package is Codex's to name. The strongest candidates on the
current record are the ADV-6 correction write path, which is what turns the passport's
correction history from a read surface into a working one, and finding 81's unreachable
modules, which is the same class of defect this package was authorised to fix.
