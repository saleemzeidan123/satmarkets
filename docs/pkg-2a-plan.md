# PKG-2A — the discovery redesign

Authored 2026-07-28. Phase 2 opens here, on the surface `docs/phase1-proposal.md`
promised the shared components would be proved against: "the later page-redesign
packages, against real screens" (D17).

There was no written plan for this package anywhere in the repository. A grep for
"discovery" across `docs/` and `CLAUDE.md` returned one unrelated hit. So the scope
below is assembled from evidence that already exists in the registers and from the
source itself, not from taste.

## Why this package exists

`/listings` is the only surface on the platform where a person states what they need
and the platform answers. It carries a search box that has never searched. That is
not a polish item; it is the product's front door being a picture of a front door.

## Scope, and the evidence for each item

**1. Server-side `q`. Findings register rank 23, P1, "Confirmed open | Verified: q
input never read server-side. WS16."** Verified again in source before writing this:
`src/app/[locale]/listings/page.tsx` renders `<input name="q">` inside a
`method="get"` form, and `searchParams.q` appears in no Supabase filter and in none
of the `shown = shown.filter(...)` chains. The box submits, the URL changes, the
result set does not.

The placeholder makes a specific promise, in both languages: "Describe what you
need, e.g. fitted Grade A office in Al Olaya under 1,600, around 300 m²". There are
two honest ways to close the gap between that sentence and the code. Weaken the
sentence, or make the sentence true. This package makes it true, because the
promise is the right one and because a search that understands a stated requirement
is the first step of the requirement-to-transaction spine the platform is for.

**2. The search must be deterministic.** No model participates in reading the query.
A parser resolves the words against the vocabularies that already exist in
`src/lib/labels.ts` (asset, deal, grade, fitout, city) plus the district list the
page already loads, and it reports what it understood. Everything it could not
resolve is applied as literal text matching, and anything it deliberately ignored is
shown to the user. This is the law "AI must never convert unknown data into known
data" applied one level earlier: the search must never convert an unrecognised word
into a silent assumption.

**3. Transparency row.** The parse is shown back as removable chips, with a short
line naming anything that was not used. A search that quietly drops half of what
was typed is the same defect class as an unattributed figure.

**4. Filters survive a search.** The search form carries no hidden inputs today, so
submitting it discards every active filter, facet, sort and map area. Fixed here.

**5. `cityLabel` raw-slug defect. Owner ruling 5.** `src/lib/labels.ts:24` ends in
`?? t`, so an unrecognised key renders verbatim: `/listings?city=riyadh` produces
"Commercial spaces in riyadh" and "مساحات تجارية في riyadh", on the page and in the
metadata head. Resolution becomes case, slug, separator and Arabic-alias tolerant,
and the last-resort fallback prettifies rather than printing a slug.

**6. WebSite and SearchAction schema. Findings register rank 36, P2,** recorded as
"WebSite in WS12; SearchAction only after WS16". WS16 is item 1 above, so the gate
opens in this package and not before. The register is right to gate it: publishing a
`SearchAction` whose target the server ignores is a machine-readable false claim.

## Deliberately not in scope

Finding 16 (Latin m² in Arabic) and finding 18 (map controls English in Arabic) are
open, but neither is a discovery defect on `/listings`: the listings cards already
route every unit through `formatUnit`, and the map controls belong to WS19 with the
district-parameter rename. Pulling them in here would mix two packages and make the
live evidence harder to read.

Map Phase 2 (geom wiring, city aggregation) stays deferred by standing agreement.

## Gate

Typecheck, the full test suite, `ar-lint`, `prose-scan`, then live verification of
`/en/listings` and `/ar/listings` on the deployed preview at 320, 360, 390 and 430
pixels plus tablet and desktop, with keyboard traversal of the search form and the
transparency chips.
