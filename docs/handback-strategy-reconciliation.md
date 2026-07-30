# Strategy reconciliation, second pass: handback

## Scope

The governing directive's second instruction, executed: read the Codex Competitive
Advantage Strategy, reconcile it against the current live HEAD, the handovers, the
findings register, the decisions register and the completed package records, and convert
the uncompleted recommendations into the repository roadmap, without blindly implementing
anything already shipped, contradicted by stronger evidence or blocked by data rights.

This is a records package. It changes no rendering code, adds no route and touches no
dictionary. What it produces is a classification and a converted roadmap, plus the two
findings and the one decision that classification raised.

The first reconciliation ran at `058a568`, before ADV-3A, ADV-3A.1, ADV-3B, ADV-4A,
ADV-4B, ADV-5A and ADV-5B closed and before findings 65 to 75 and decisions O15 and O16
existed. This pass runs at `a2d2817` and keeps the first pass beside it rather than
overwriting it, because a classification whose earlier readings are deleted cannot be
audited, and auditability is the entire point of the exercise.

## The method change, and what it found

The first pass graded the repository by reading its modules and closure records: a module
exists, it is typed, it is tested, therefore the advantage exists. ADV-5B had since
demonstrated on this platform's own surfaces why that is not sufficient. It could have
shipped `mobility.ts`, `sufficiency.ts` and `coverage.ts`, closed on a clean unit suite,
and left five fabricated panels rendering a seeded generator's output as measured
footfall, because nothing on that page imported anything the new modules exported.

The second pass applies that lesson to itself and asks what reaches a reader rather than
what was built. That single change of question produced finding 76.

**The strategy's flagship advantage is built and unreached.** `src/lib/evidence.ts`
defines `EvidencePassport` with every part the strategy names, plus `CorrectionEntry`,
`latestCorrection`, `isRetracted`, `freshnessOf`, `confidenceOf`, `isKnown` and
`publishability`, behind 567 lines of test. Call sites of those six functions outside
`src/lib/evidence*` number zero, and no code in `src` constructs a passport. One level
down `provenance.ts` is in the same state: every `ASSET_FIELDS` entry declares the tier it
is born at, the only runtime reader of that tier is `attributeDisplay.ts:122`, which reads
it to skip computed fields, and `ProvenanceChip.tsx`, the component that would draw it, is
imported by nothing. The strategy's line is that a citation chip is not enough. At HEAD
there is no citation chip either.

**Finding 77 is the same thing from the component side.** Five of 57 components have no
importer anywhere in `src`: `HeroSearch`, `LocationFilter`, `LocationScore`,
`ProvenanceChip` and `RentBand`. That two of the five are the passport's rendering
surfaces is not a coincidence. The cost is not tidiness: an orphan is how a retired
pattern survives every sweep, and `RentBand.tsx` still carries a `badge-gold` class name,
an en dash range with no `<bdi dir="ltr">` isolation against D20, three muted tiers
finding 75 measures below threshold, and a locale-free `toLocaleString()` that is a Law 7
hazard the moment anything renders it. No gate catches any of it, because none of it
renders.

**The distinction that keeps finding 76 honest.** The AI agent layer is also unreached:
`agents/tools.ts` and `agents/permission.ts` have zero non-test importers and
`agents/agents.ts` is reached only by `eval/grade.ts`. That is not the same defect and is
not reported as one. The agent layer is dormant because a documented boundary refuses to
activate it while `AI_AGREEMENT_IN_FORCE` is false and no provider agreement is recorded,
which is a gate working exactly as designed under owner ruling 7. The passport is dormant
because nobody wired it. One is a refusal and the other is an omission, and a
reconciliation that cannot tell them apart would either indict a working gate or excuse an
unfinished feature.

## What the reconciliation reclassified

Six verdicts are now used; the sixth, **Built but unreached**, is new and is defined
against Partial: Partial means some of the work is done, unreached means the work is done
and no reader benefits, so the remaining task is a producer and a rendering rather than
more module.

Moved since the first pass: the evaluation gold set from Missing to Shipped (ADV-3B,
deliberately synthetic, no real user, requirement, listing or document data); the
model-agnostic architecture from Missing to Shipped as architecture and Gated as
capability; field-level verification from Partial to Shipped, with the repository's
bidirectional green rule intact; the requirement-to-deal workspace from Missing to Partial
on `matching.ts` and `decisionPack.ts`; the public bulletin from Gated to Partial on
ADV-4A and ADV-4B, with its indexing half still parked by owner ruling 1; the SPL address
and stc requirements from prose to executable interfaces; and the AI contract constraint
from a policy to a boundary that denies before network access rather than at it.

Three things the strategy asks for are recorded as genuinely uncompleted, cheap and
ungated: the passport producer and rendering, the orphan class, and the image-integrity
rule. The last of these appears nowhere in this repository in any wording. A
verification-first exchange that retouches a photograph has falsified the record it exists
to hold, so it converts to a law plus a structural test rather than to a sentence in a
document.

Two things are recorded as differences rather than shortfalls. `publishedRecords.ts`
carries five states and six demotion reasons where the strategy names eleven states; the
demotion reasons carry the same information as a reason rather than as a label. And
`/deal` and `/deal/termsheet` are honestly labelled sample surfaces with hardcoded term
arrays, which is not a defect but must not be counted as advantage 3 delivered.

## Commits

`762abf0`. Five files, records only. `docs/strategy-reconciliation.md` rewritten as a
two-pass document with a new section 0 stating what the first pass could not know and a
rewritten section 7 giving the dependency-ordered conversion; `docs/findings-register.md`
gains findings 76 and 77; `docs/decision-register.md` gains D30; `docs/roadmap.md` records
the reconciliation as done and gains ADV-1C as the next package. The uncommitted
`scripts/responsive-probe.mjs` section-header correction from the ADV-5B closure is folded
in; it changes no measured value, because the header sits outside `[data-probe]` and
carries no `[data-item]`.

## Tests

1,154 tests, 1,154 passing, 0 failing. The count is unchanged and is expected to be: this
package adds no code and therefore adds no test. `npx tsc --noEmit` is silent,
`npm run ar-lint` reports clean, and `node scripts/prose-scan.mjs --strict` reports GATE 0
hardcoded prose strings in 0 files across 29 public entry points and 111 reachable source
files, exit 0.

The production build gate is `dpl_8gSo4uhu1VvPWKvmw16AjVEg9bBB`, READY on `762abf0`, the
local build being unable to fetch the four Google font families and failing for that
reason alone.

## Live evidence

Captured on production against `762abf0`, not from local results. Because this package
changes no rendering code, the live check is a regression check rather than a
demonstration, and it is reported as one.

Arabic, `/ar/building/0e7c4a8c-984a-4a7d-b41e-1603bf844e1a`: the ADV-5B panel is intact
and readable as Arabic DOM text, "الحركة ونطاق الجذب" and
"لا تنشر سات أي رقم للزوّار أو المكوث أو نطاق الجذب لهذا المبنى" both present. The
canonical attribution "المؤشر الإيجاري للهيئة العامة للعقار (إيجار)" appears 34 times and
is unaltered. Arabic-Indic digits: 0. Em dashes: 0.

English, `/en/verification`: the verification vocabulary renders, FAL 1200025510 appears
13 times and no other licence number does, and the canonical English attribution "REGA
Rental Index (Ejar)" appears 32 times. Em dashes: 0.

## Responsive evidence

No new fragment and no re-measurement, because no fragment changed. The twelve
measurements recorded in the ADV-5B handback stand: three prose blocks at every width in
both directions, PASS, content widths 288, 328, 358, 398, 736 and 1,248 at 320, 360, 390,
430, 768 and 1,280. Document overflow is not claimed; `sat-platform.css` sets
`overflow-x: clip` and finding 53 records why that measurement is unavailable.

Claiming fresh responsive evidence for a records package would be the same category of
error this reconciliation exists to name.

## Remaining blockers

Nothing in this package is gated, because it activates nothing. The blockers it inherits
and now states in one place, in the section 7 table, are unchanged: O10 for per-dataset
licence terms and attribution strings; O11 for the bulletin's indexing, itself parked by
owner ruling 1; O12 for external notification channels; O13 and O10 for PD4 deed checks;
O14 for organization authority and contact release; O15 for the Rent Index attribution
sweep, which blocks the sweep and not the surfaces; O16 for the availability green
collision; finding 74, whether `/building/[id]` is declared for indexing or held, which is
an owner and Codex decision; contract 6 and the owner recording the agreement, processing
terms, cross-border basis and disclosure position before any provider activates; and, for
mobility, an agreement answering all twelve Part E clauses.

Administrative and owner-side, unchanged: `.github/workflows/arabic-font.yml` remains an
owner install because the deploy credential holds no workflow scope and none has been
requested; and the RLS advisory on `public.spatial_ref_sys` and `public.map_anchors` is
deliberately not auto-applied, because enabling row level security without policies blocks
all access.

Finding 75 stays open beyond the one panel corrected in ADV-5B, assigned to the parked
visual-quality package, whose first item should be the contrast gate that does not exist.

## Next package

**ADV-1C, the Evidence Passport producer, its rendering and its gate.** Chosen on three
grounds rather than on preference: it is the strategy's flagship advantage; nothing gates
it, because no permission, vendor, contract or owner decision stands between here and a
rendered passport; and every remaining evidence-dependent agent item, the evidence auditor
first among them, has nothing to operate on until it exists.

It delivers a producer building a passport from records the platform already holds, a
rendering that shows it to a reader, the four reading functions wired to that rendering
rather than exercised only in unit tests, and a structural gate in the `claims.test.ts`
pattern that fails when a surface states a figure no passport reaches. On the ADV-5B
evidence the gate is the part that carries the value. Finding 77's five orphans and the
image-integrity rule ship with it, because they are the same finding from other sides.

D30 records the standard this pass established and that ADV-1C is the first package to be
held to: reachability is part of delivery. A package does not close on a green unit suite
alone. Its closing evidence must show that a rendering surface or a request path reaches
what was built, or must state plainly that nothing does and why.
