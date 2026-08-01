# Handback, PKG-FIG1: the grammar of a figure, on the surfaces that answer a person

Findings 125, 126, 127 and 128. Register rows appended; roadmap section added.

## 1. Scope, and why this package rather than another

PKG-DEM2 fixed the demand-side figures and PKG-SUP2 fixed the supply-side ones. What was left was
everything in between: the front door, the explore map, the Listing Studio preview, the Advisor and
the match explainer. Same defect class, one step further from the record. A surface that spells a
figure has also, privately, decided what the figure means, and by this package the surfaces still
doing it were the ones that answer a person rather than list a row, which is where a wrong figure is
hardest to notice and easiest to believe.

Nothing here needed a database write, a schema read, a purchase, a vendor or an owner decision. The
whole of it is code the tree already owns, which is why it was reachable.

## 2. The four findings, in the order they matter

**The numerals, finding 125, P0.** `MarketingHome.tsx` and `MapExplorer.tsx` both begin
`"use client"`, and both called `Number(x).toLocaleString()` with no locale argument on the published
Rent Index band. With no argument that call resolves the DEVICE locale, so on a phone set to Arabic
the first screen of the site and the explore map rendered the one externally attributed figure the
platform carries in Arabic-Indic digits. Western numerals in both languages is the first law
`format.ts` was written to enforce, and it was live on the front door, on the REGA-attributed figure.
Two invented bounds travelled with it: `sel.bandHigh ?? 0` on the map, and a truthiness test on
`band_low` in `building/[id]`, each of which let one stated end print beside an absent end, so a band
with no stated ceiling read as a band ending at zero. Zero is a figure and nobody wrote it down.

**The preview, finding 126, P2.** The Listing Studio preview block is captioned "As a visitor will
read it". It spelled its own price as `formatMoney(price) + " per sqm per year"`, in Arabic
` للمتر المربع سنوياً`, and decided the unit inline from `f.deal_type === "sale"`. That is a seventh
spelling of the unit finding 120 consolidated, under a caption that is a claim about fidelity, on the
one screen built so a lister can check that the price they typed is the price the market will see.
The caption was false in exactly the way the screen exists to prevent.

**The separator, finding 127, P2.** `src/lib/market/verdict.ts` built the Arabic verdict sentence
`النطاق 1,800-2,900` in source. The dictionary walk in `ar-lint` bans the en dash inside `src/i18n`
only; the tree-wide sweep beside it bans the em dash alone, deliberately, because in English the en
dash is the correct numeric range separator. Both rules assumed Arabic copy lives only in the
dictionaries. It does not, so the exact construction the gate exists to prevent shipped in the one
place the gate did not look. Four surfaces spelled the separator themselves and a fifth branched
inline on `ar ? " إلى " : "-"`.

**The storage grammar, finding 128, P1.** Six sub-defects on the two surfaces that answer a person in
sentences. `/api/advisor` interpolated `band_low`, `band_high` and `median` raw from PostgREST, which
returns `numeric` as a string, so the figures were ungrouped; and it interpolated `band.unit` raw,
which holds the STORED key `sar_sqm_yr`, written by `ingest/rentBasePipeline.ts` and aliased in
`format.ts`. So an Arabic answer quoting the published, REGA-attributed, licence-gated,
passport-carrying band ended in a Latin snake_case identifier. The same file forbids the raw
`2026-Q2` period form six lines above, under Codex item 5, which is the same rule about the same
class of value. `/api/advisor/shortlist` spelled the lease unit `SAR/m²·yr` with a middle dot against
the canonical `SAR/m²/yr`, an eighth spelling; and it could reach `Asking runs NaN to NaN`, because
`.map(Number)` yields NaN for an unparseable stored price, `Math.min` of NaN is NaN and the string
`"NaN"` is truthy. `matching.ts` printed `1200 sqm` and `1200 متر مربع`, ungrouped because its local
formatter was `String(n)`, in a unit spelling no visitor surface renders, beside a card reading
`1,200 m²`. And the same file printed a budget as `2000 per sqm` and `2000 للمتر المربع`, which names
an area and carries no currency and no period, for a number the occupier's own form collected under
the label "Budget ceiling (SAR/m2/yr)". A rate with the currency taken off is not a smaller version of
the figure, it is a different figure, and the reader has no way to tell which one they are looking at.

## 3. What shipped

`src/lib/figureGrammar.test.ts`, new, 11 tests, added by hand to the `test` script in `package.json`,
which is an explicit file list rather than a glob.

Rewired to `formatRange`, `formatInteger`, `formatUnit`, `formatArea` or `formatWithUnit`:
`MapExplorer.tsx`, `MarketingHome.tsx`, `building/[id]/page.tsx`, `market/page.tsx`,
`listings/page.tsx`, `ops/page.tsx`, `market/verdict.ts`, `rentIndexEvidence.ts`,
`ListingStudio.tsx`, `matching.ts`, `api/advisor/route.ts` and `api/advisor/shortlist/route.ts`.

`scripts/ar-lint.mjs` gained a rule scoped to the LANGUAGE rather than to a directory: a quoted
string or template chunk carrying Arabic script may not also carry an en dash, wherever in the tree
it is written. Two limits of the rule are stated in the script itself rather than discovered later. A
literal that renders INTO Arabic without containing any Arabic, because its locale arrives as a
parameter, is invisible to it, which is precisely what `rentIndexEvidence.ts` was, and is why the
call sites were rewired rather than left for the gate to catch. And JSX text content is not a string
literal, so a dash typed between two elements is not seen either.

`requirementFigures.budgetCeiling` no longer branches on the deal type. `matching.ts` gained
`money()` over `formatWithUnit` and kept its local `fmt` for the percentages alone, which carry their
own word and no unit. `/api/advisor` now gates the sentence and the JSON payload with one flag,
`showBaseline`, so Codex item 2 is satisfied by one decision rather than two that can drift.
`en.json`'s `postReq.budgetCeiling` moved from `SAR/m²·yr` to `SAR/m²/yr` to match the canon
`format.ts` renders; the Arabic value already matched and was left alone, so dictionary key parity is
untouched.

## 4. Two corrections made to this package's own work, recorded rather than quietly fixed

The first version of finding 126's guard asserted that the string "per sqm per year" appears nowhere
in `ListingStudio.tsx`. It fails, and it should: the string appears once more in the file, in the
FORM LABEL that collects the price. That label is the record-level evidence finding 120 turned on. It
is the sentence the lister reads while typing the number, and it is the only statement anywhere in
the tree of what `listings.asking_rent_sqm` holds. A guard whose satisfaction requires deleting the
evidence for the rule it enforces is worse than no guard. It is now scoped to the `preview()` body
and additionally asserts the label is present.

The second version of finding 127's guard was a tree-wide regex for "an interpolation joined to
another interpolation by a dash or by the Arabic connective". Run against the tree it named fourteen
files. Six were React keys, an ISO date and a CSS `calc()`. Four more were correct prose. Only four
were real, and those four became finding 128. A guard whose output is mostly noise gets suppressed
rather than read, so it was rewritten as a named-file regression guard over the eight rewired
surfaces.

A third thing was nearly recorded as a defect and is not, because it is not one. The four files in
finding 127's prose tail build a range inside a larger Arabic sentence without a bidi isolate, and
the obvious conclusion is that they render backwards. The Unicode Bidi Algorithm was derived by hand
for the case before any code was touched: W7 is a no-op, I1 puts the European numerals at level 2
inside an RTL paragraph, N1 and N2 put the separating whitespace at level 1, and the reversal yields
a display buffer an Arabic reader reads as low then high. They render correctly. Isolation matters
for a composite placed beside a differently-directioned neighbour, not for a bare range inside an RTL
sentence. No defect was invented to justify a sweep.

## 5. What is deliberately not done

Finding 127's prose tail: `WatchBanner.tsx`, `market/analyser.ts`, `market/valueEvidence.ts` and
`agents/tools.ts`. All locale-pinned, none using a dash, none rendering backwards. Consolidating them
would churn asserted AI answer text for no reader-facing gain.

`area/page.tsx`'s English-only age bucket labels, behind the ADV-5C mobility-source gate.
`listings/page.tsx`'s median cell, which passes an explicit locale and breaks no law. The Listing
Studio's ungated inline Arabic literals, which overlap the deferred BASE prose strings. The
single-character placeholders standing for an absent value on `compare`, `listings`, `rent-index` and
`ops`.

## 6. An owner decision, recorded rather than taken

Whether a requirement's purchase budget should be a total rather than a rate per square metre.

Today three things agree that it is a rate: `RequirementForm` has one budget input, not conditional
on the deal type, under one label reading "Budget ceiling (SAR/m2/yr)"; the column is
`budget_sqm_max`; and `matching.ts` compares it against `ratePerSqm(listing)`, which for a sale
divides the sale price by the area. Only the renderer disagreed, and the renderer is what was
corrected.

If a purchase budget should be a total, the FORM is what changes first, and the column almost
certainly has to split in two, because one column cannot hold two units. That is a decision about
intake and it is not taken here.

## 7. Tests and gates

`npx tsc --noEmit` clean. `npm test`: 1483 tests, 1483 pass, 0 fail. `npm run ar-lint` clean, with
the new language-scoped en dash rule active and previously proved to fire against a deliberate probe.
`node scripts/prose-scan.mjs` clean, 0 hardcoded prose strings in public page source. Production
build evidence is the Vercel deployment reaching READY, since `npm run build` cannot complete in this
environment: `next/font` reaches Google Fonts and egress is proxied.

Seven of the eleven new tests reproduce a shipped expression beside the fixed one and watch the old
one fail: the device-dependent `toLocaleString`, the `?? 0` band ceiling, the preview's own price
string, the ungrouped `String(n)` size, the `NaN to NaN` shortlist range, and the deal-type branch on
the budget unit. A guard that cannot fail against the code it replaced is a claim, not a guard.

One existing test was rewritten rather than deleted:
`requirementFigures.test.ts`'s "a lease budget is per square metre per year and a purchase budget is
not". It asserted the property finding 128 disproved, and it was written from the shape of the
argument list rather than from the record. It now asserts the corrected property and carries the
record it was wrong about.

## 8. Limits of this evidence, stated rather than glossed

Finding 125's breach only manifests on an Arabic-locale DEVICE. The only live channel available here
is an unauthenticated server-rendered GET, which carries the SERVER's locale, so the breach itself
cannot be reproduced live and is not claimed to have been. The live payloads establish that the
corrected code is what is served and that the Arabic bodies carry no Arabic-Indic digits. They cannot
establish what an Arabic-locale phone would have rendered from the previous code.

Finding 128's two Advisor routes are POST-only, and this channel cannot POST. Neither is live
verified at all. For those two the evidence is the source, the typecheck and the suite, and nothing
beyond that is claimed. This is the weakest part of the package's evidence and it is named rather
than implied.

Finding 126's Listing Studio sits behind a session, which the GET-only channel cannot open.

## 9. Blockers, unchanged

No new blockers. Carried: `execute_sql`, `apply_migration` and `list_tables` are all permission
denied, which is what still holds finding 113's data half, 117, 118 and 116's schema;
`.github/workflows/arabic-font.yml` remains an owner-side install and no workflow-scoped token has
been or will be requested; O10 to O16, contract 6 and provider activation remain owner and legal
gates with the gated features disabled.

## 10. Next package

The figure grammar is now consistent across demand, supply and the surfaces that answer in sentences.
The next genuinely open, dependency-free, user-facing item is the Listing Studio and the lister's own
workspace, which PKG-SUP2 named and which this package has only touched at one block. The unit label
that started finding 120 is authored there, the ungated inline Arabic literals are there, and the
remaining defects on it are reachable without a database write.
