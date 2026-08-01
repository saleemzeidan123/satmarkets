# Handback, PKG-FIG2: one table for a unit

Finding 129. Register row appended; roadmap section added.

## 1. Scope, and why this package rather than another

PKG-FIG1 closed with a live sweep of the deployed preview, and that sweep found one thing: the
English front door was spelling the lease unit `SAR/m²·yr` where the canon is `SAR/m²/yr`. The
obvious next move was to fix six occurrences in one file and move on.

That would have been the fourth time. Finding 120 consolidated the unit and a new spelling appeared.
Finding 124 fixed the shortlist and a new spelling appeared. Finding 128 fixed the Advisor and a new
spelling appeared. Four packages, four rewires of the call sites, and each time the defect came back
somewhere the previous sweep had not looked. So this package started by measuring instead of fixing.

A scan of every `.ts`, `.tsx` and `.json` file under `src` for anything unit-shaped, compared against
the canonical set, found nineteen distinct spellings across eighty-nine occurrences. It also found
why they kept coming back.

## 2. There were four unit tables, and only the first was typed

`src/lib/format.ts` `UNITS`. The canon: eleven keys, both locales, long and short, typed, with an
alias map for legacy spellings arriving from data.

`src/lib/labels.ts`. A two-entry `Record<string, [string, string]>` exported as `unitLabel`, holding
`"SAR / m² / yr"` with spaces around the slashes, a spelling nothing on the platform renders. It had
zero callers anywhere in the tree. It was deleted rather than rewired.

`src/lib/attributeDisplay.ts`. A six-entry EN to AR map keyed on the exact strings in
`assetFields.ts`. This one had a failure mode the others did not: a unit the map did not list fell
through to the English spelling, so it was not merely a second spelling, it was a silent hole. `kN/m²`
and `L` reached Arabic attribute rows still in Latin script through it.

`src/lib/market/valueEvidence.ts`. Two regexes and a private duplicate of `format.ts`'s `joinUnit`.
Neither regex matched `sar_sqm_yr`, which is the exact string `ingest/rentBasePipeline.ts` writes
into `index_cells.unit`, so the file was pattern-matching against a spelling the data does not use.

## 3. The instance nobody could have found by looking at spellings

`resolveUnitKey` had no alias for `m`.

`m` is what the asset field registry stores, in sixteen fields. That is more fields than any other
unit in the registry: more than `m²`, more than `SAR/m²/yr`, more than all the money units together.
Every one of them rendered the Latin `m` on an Arabic page.

It survived four sweeps because it produced no wrong spelling. `formatUnit` passes an unresolved unit
through verbatim, deliberately, so that a new unit arriving from data is visible and reportable
rather than silently blank. That decision is correct and it is also exactly why this was invisible:
nothing raises an error when a lookup that finds nothing was supposed to find nothing. The `metre`
key had been in `UNITS` from the beginning, reachable only by a caller spelling the key itself, which
none do.

It was found by an existing test, `attributeDisplay.test.ts`, failing on `'4.5 m' == '4.5 م'` after
the rewire. The test had been asserting the right property all along against a private map that
happened to satisfy it; routing through the canon is what exposed that the canon could not.

## 4. What shipped

`src/lib/format.ts` gained `t_sqm`, `kn_sqm` and `litre`, three units the registry has always carried
and the table never did, plus fourteen aliases including `m`, `metre`, `metres`, `meter` and
`meters`. The canon itself was NOT changed, for the reason in section 7.

`src/lib/labels.ts` lost its dead table. `src/lib/attributeDisplay.ts` and
`src/lib/market/valueEvidence.ts` became callers of `format.ts` rather than copies of it.

Rewired to `formatUnit` or `formatWithUnit`: `assetFields.ts` (six rows), `MarketingHome.tsx`,
`MapExplorer.tsx`, `FilterBar.tsx`, `EditListingForm.tsx`, `proto/page.tsx`, `searchNote.ts` and
`building/[id]/page.tsx`.

`en.json` had eight values corrected from `·` to `/`. `perSqm`, `unitDeskMo` and `perYear` were
deleted from BOTH locales, which keeps the exact key parity `laws.test.ts:177` asserts. Two of the
three had zero callers; `perYear` had exactly one, now reading the unit from the table.

`scripts/ar-lint.mjs` gained the rule that is meant to end the class.

## 5. The live one

`MarketingHome.tsx` held the lease unit twice in its own copy objects, once per language. The Arabic
spelling happened to match the table. The English one, ` SAR/m²·yr`, did not, and it was live on the
first screen of the site six times: on the band panel, on the band caption, and on three featured
price cards. It was the most-read wrong spelling of the platform's most-used unit.

The leading space each literal carried was structural rather than typographic, which is why the band
caption had to strip it back off with `.replace(/^[\s/]+/, "")`. The space belongs to the JSX that
needs it, and it is there now.

## 6. The gate, and the three things it deliberately does not do

The rule reads the canonical set out of `src/lib/format.ts` rather than restating it. A hardcoded
list inside the gate would have been a fifth table and would have been wrong the first time `UNITS`
changed. If the slice fails to find `UNITS`, the gate fails loudly rather than passing everything,
because a rule aimed at an empty set is worse than no rule.

It does not check prose. Only separator-joined tokens are matched, a currency followed by `/` or `·`.
`decisionPack.ts` says `1,200,000 SAR per year as a total` and `market/analyser.ts` says
`ريال سنوياً`, and both are sentences naming a period in words. Forcing `SAR/yr` into them would
make the English worse, not more consistent.

It does not check comments. After the fixes, every remaining match in shipped source was a comment
naming a legacy spelling in order to explain the defect that removed it. That is the record this
project keeps, and a gate that made the record unwritable would be the same mistake PKG-FIG1's first
over-broad guard was, when it would have required deleting finding 120's evidence to pass.

`format.ts` is exempt because it holds the table and the lowercase alias keys. Test files are exempt
because a test proving a legacy spelling still resolves has to be able to spell it. Anything else
needs an explicit `unit-law` marker on the line, the same visible-in-the-diff friction the em dash
rule uses.

## 7. What was deliberately not changed, and why it looks wrong

English renders `SAR/m²/yr` and Arabic renders `ريال/م²·سنة`. Reading the table, that asymmetry looks
like the exact inconsistency this package exists to remove.

It is a decision. In English, `·` doubles as the LIST separator in the very strings that used it as a
unit separator: `3,700 SAR/m²·yr · 1,200 m² · KAFD` is a real string from a card, and an English
reader has no way to tell which dot is which. In Arabic the middle dot is the correct typographic
choice inside a unit, and Arabic does not use it as the list separator in the same strings, so no
clash exists. `format.ts` renders every figure's unit on the platform, `SAR/desk/mo`, `SAR/m²/mo` and
`SAR/yr` all already used the slash, and PKG-FIG1 had already moved `postReq.budgetCeiling` to it.
The canon was left alone and the callers were moved to it.

## 8. A claim this package made about itself and then withdrew

While reading `attributeDisplay.ts` it looked like there was a second defect beside the unit map: its
`num()` called `toLocaleString("ar-SA-u-nu-latn")`, pinning the numbering system but taking the group
separator from `ar-SA`, so Arabic attribute rows would not carry the comma every other figure uses.
It was written up that way.

It was then checked, before it was believed. On the runtime this ships on, `ar-SA` with the Latin
numbering system groups with the same comma `en-US` does. There is no grouping difference and none is
claimed. The comment in the file now says so explicitly rather than quietly dropping the claim.

What the call did do was pin half the format and leave the rest to whichever CLDR data the runtime
carries, so the output was a property of the deployment rather than a decision this project made. The
one difference visible today is on a negative value, where `ar-SA` emits a `U+200E` LEFT-TO-RIGHT
MARK before the minus sign, putting an invisible control inside a figure a reader can copy off the
page. `LocationFacts.tsx` carried the identical pattern and is a client component, so there the
runtime is the visitor's browser rather than this deployment. Both now go through `formatNumber`.

## 9. One existing assertion rewritten rather than deleted

`valueEvidence.test.ts`'s "Codex closure: the Arabic unit cannot break after the slash" ended with
`assert.ok(!/⁠/.test(renderValue(ev, "en")))`, under the comment "English is untouched".

That was the local rule of one file rather than the platform's. `formatUnit` has always applied word
joiners to both languages, and every other surface that renders a unit goes through it, so "English
is untouched" was true only inside the private `joinUnit` this file used to keep. English breaks after
its slash at 320 pixels for exactly the reason Arabic did. The test now asserts the property that
matters: the joiner is present and it is invisible, so what a reader sees is unchanged and what a
narrow column can break is.

## 10. Tests and gates

`npx tsc --noEmit` clean. `npm test`: 1498 tests, 1498 pass, 0 fail, up from 1483. `npm run ar-lint`
clean with the new unit rule and the new authorship rule both active. `node scripts/prose-scan.mjs` clean, 0 hardcoded prose strings
in public page source. Production build evidence is the Vercel deployment reaching READY, since
`npm run build` cannot complete in this environment: `next/font` reaches Google Fonts and egress is
proxied.

Five new tests in `figureGrammar.test.ts` and one in `attributeDisplay.test.ts`. Each was run against
`git show HEAD` of the file it guards and each fails there: `labels.ts` did export `unitLabel`,
`MarketingHome.tsx` did carry its own `unit:` literal, `attributeDisplay.ts` did hold a private EN to
AR map and did call `toLocaleString` with `ar-SA`, `valueEvidence.ts` did spell an Arabic unit, and
`format.ts` did not carry the `m` alias. A guard that cannot fail against the code it replaced is a
claim, not a guard.

The closure added six more, three for finding 131 and three for finding 132, and one behavioural
assertion inside the finding 130 block. The falsification for the closure was run as a tree: the
repository copied without `node_modules`, `.next` and `.git`, then the seven callers and both
dictionaries overwritten from `git show HEAD`, leaving the new modules and the new tests in place.
Five tests fail there, including all three finding 131 and 132 caller scans. One does not, and the
reason is stated rather than hidden: `columnHeading.ts` is new, so reverting the callers does not
exercise it. The rule it replaced, `rows[0].stat_kind`, is therefore written out inside the
behavioural test and asserted to disagree with the new one, which is the only honest way to falsify a
guard on code that did not previously exist.

The class-closing guard is the one that walks `assetFields.ts` and asserts every unit the registry
stores renders in Arabic script in Arabic. It is on the entry point rather than on the exits, so a
seventeenth field storing a new unit fails here rather than shipping a Latin token to an Arabic page.

## 11. Limits of this evidence

The scan that found the nineteen spellings is a regex over source. It cannot see a unit assembled at
runtime from parts, and it cannot see one arriving in data. The registry guard covers the data path
for the registry specifically; `index_cells.unit` is covered by the `sar_sqm_yr` alias and by
`valueEvidence`'s tests, and nothing beyond those two is claimed.

The `m` defect affected Arabic attribute rows on listing detail pages, which are public GETs and
therefore live-verifiable in principle, but only for a listing whose stored `attributes` actually
populate one of those sixteen fields. Whether any currently seeded listing does is not established
here, so the live evidence in section 12 covers the front door rather than the attribute rows.

`EditListingForm.tsx` and the Listing Studio sit behind a session, which the GET-only live channel
cannot open. Their evidence is the source, the typecheck and the suite.

The central claim of this package needs qualifying, and it is qualified here rather than left to be
discovered. "One table for a unit" is true of the CODE: every surface that renders a unit now resolves
it through `format.ts`, and a gate reads the canonical spellings out of that file rather than
restating them. It is NOT yet true of the DICTIONARIES. Forty six unit shaped strings remain per
locale. Most are legitimate sentences that name a unit as part of a label and would read worse as a
template, but they are still forty six places where a unit is spelled outside the table, and the new
authorship rule catches only the subset that puts Latin script into Arabic copy. The honest statement
of where this package leaves the platform is: one table, one gate on spelling, one gate on authorship
inside Arabic, and forty six remaining strings that no gate would notice if the canon changed.

Neither the Rent Index nor the listings index cut can demonstrate the heading resolver's INTERESTING
branch live, because live data has no disagreement in it: all seven published segments store one unit
and one statistic. What the live payloads establish is that the agreeing case renders the resolved
statistic and the full `SAR/m²/yr`, in both languages, where the shipped code rendered a typed
`Average SAR/m²`. The disagreeing branches are covered by the behavioural tests and by nothing else,
and nothing more is claimed for them.

## 12. Live evidence

Pending the deployment reaching READY. Filled below in this same section, not in section 13, which is
blockers.

## 13. Blockers, unchanged

No new blockers. Carried: `execute_sql`, `apply_migration` and `list_tables` are all permission
denied, which still holds finding 113's data half, 117, 118 and 116's schema;
`.github/workflows/arabic-font.yml` remains an owner-side install and no workflow-scoped token has
been or will be requested; O10 to O16, contract 6 and provider activation remain owner and legal
gates with the gated features disabled.

## 14. Next package

The figure grammar now has one table, one gate on it, and a guard at the point where a unit enters
the platform. The next genuinely open, dependency-free, user-facing item is unchanged from what
PKG-SUP2 and PKG-FIG1 both named: the Listing Studio and the lister's own workspace. The unit label
that started finding 120 is authored there, the ungated inline Arabic literals are there, and the
remaining defects on it are reachable without a database write.
