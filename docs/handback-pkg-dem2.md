# Handback, PKG-DEM2: a requirement's figures stop being invented

Package closed 2026-08-01. Builder: Claude. Advisor: Codex. This is the consolidated handback the
governing directive asks for, and it is the continuation Codex item 10 directs: the next genuinely
open dependency-ordered product package, and a real user-facing demand outcome rather than further
dormant AI or infrastructure work.

## 1. Scope, and why this package rather than another

PKG-DEM1 made `/post-requirement` submittable. This package is the direct consequence of that, and
it was found by reading the surfaces PKG-DEM1 had just made reachable rather than by looking for
something to do next.

Size and budget are optional on the public form and nullable in the column. `RequirementForm` sends
`Number(sizeMin) || null`, so a visitor who leaves either blank stores a null. Before PKG-DEM1 no
visitor could store anything at all, so no live row had ever carried one, and the two public
surfaces that print those figures had never been asked to render an absent one.

Both of them interpolated the raw values.

The board rendered `{r.sizeMin} to {r.sizeMax} m²`, which prints `null to null m²`. And it rendered
`Number(r.budget).toLocaleString("en-US")`, which for a null budget is not blank and is not an
error: it is the string `0`. A visitor would have been shown a requirement whose occupier had
stated no budget as a requirement with a budget of zero. The detail card carried both defects under
labelled rows, where a bare `0` beside the word `Budget` reads as the occupier's own stated number.

That is an invented figure on a public surface, which is the one thing this platform's standing law
does not allow. It was invented by arithmetic rather than by anybody's judgement, which is why no
review caught it: there was no sentence anywhere claiming a budget of zero, only an expression that
produced one.

## 2. The second defect underneath it

The same stored fact had four renderings across three surfaces, and none of them went through
`src/lib/format.ts`.

The board and the detail card both printed `null to null m²`. The lister-facing dashboard read the
nulls honestly, which is why the defect had gone unnoticed on the one surface a reviewer was most
likely to open, but it printed `200 to ? m²` for a half-open range and spelled its own unit, `sqm`
in English and متر مربع in Arabic. So one column produced four unit spellings, and only one of the
three surfaces told the truth about an absent bound.

`format.ts` is the module this platform built precisely so that a figure has exactly one rendering,
with grouped numerals, one unit spelling per locale, and a first-strong isolate so the digits and
the unit do not swap places in an Arabic paragraph. Three surfaces had reimplemented it, badly,
each in its own way.

## 3. What shipped

**One reader.** `src/lib/requirementFigures.ts` holds `sizeRange` and `budgetCeiling`, both built on
`format.ts`. All three surfaces call them. The contract is that each function returns a finished
string or `null`, and `null` means the occupier did not state it. It never means "we failed to fetch
it" and it is never a number.

**The surface says what an absent figure looks like, not the module.** What to say in place of a
figure is a decision about a surface rather than about a figure, so the module returns nothing and
the caller decides. The board simply does not draw the line: a card with no size and no budget has
no figure row at all, rather than a row drawn around nothing. The detail card is a labelled grid
where a missing row would be a hole, so it says "Not stated" and "غير مذكورة", the wording the
lister dashboard already used.

**A half-open range names the bound that exists.** "from 500 m²" and "up to 1,200 m²", "من" and
"حتى". `500 to ? m²` invites the reader to supply the missing half and `500 to null m²` is not a
sentence. Equal bounds collapse to the single figure, because an occupier who typed 500 twice asked
for 500 m² and "500 to 500 m²" reads as a range that failed to render.

**The budget states itself as a ceiling everywhere.** The column is `budget_sqm_max`. The board
prefixed the number with "up to" and the detail card printed it bare under the label "Budget", so
the same stored number was a ceiling on one screen and a price on the other. The ceiling is part of
the figure now rather than a word a caller remembers to add. The unit depends on the deal type,
because a lease budget is per square metre per year and a purchase budget is a total.

**The connective words live in the module**, for the same reason `formatRange` holds "to" and
"إلى": they are part of the figure's grammar, not copy, and a range whose two halves were assembled
in different files is how finding 100 happened. `scripts/ar-lint.mjs` now reads the module, so its
Arabic clears the same voice and banned-term gate as `format.ts` and the dictionaries.

**Seven dictionary keys are gone from both locales**, `req.upTo`, `req.rangeTo`,
`reqDetail.rangeTo`, `reqDetail.sqm`, `reqDetail.sar`, `reqDetail.sarSqmYr` and `reqDetail.reply`,
because the strings they held are now spelled once inside `format.ts` or are no longer said at all.
Two keys are added, `reqDetail.figureUnstated` and `reqDetail.replyNote`.

**The dead Reply control is removed.** It sat beside every response to a requirement. It was a
`span` with no handler, no role and no keyboard path, and there was nothing for it to open:
`GET /api/requirements/[id]` returns a respondent's name, organisation and message and deliberately
returns no email and no phone, so the platform holds no channel from the occupier back to the
person who answered. A control that cannot act is a promise the product does not keep, and the
occupier who posted the requirement was the only person who ever saw it. One honest sentence
replaces it: replying inside SAT Markets is not built, no contact details are shown on the page, so
what each party wrote is the whole of their response.

## 4. What is deliberately not asserted, and what is recorded instead

**The reply loop is not mocked up.** What a real one needs is a messages table keyed to the
requirement and the respondent, a write route under the same server-side identity derivation the
interest route already uses, and a disclosure position on what each side sees of the other. That is
a supervised schema change and there is no database write channel from this environment. Finding
116.

**The RPC still fabricates Riyadh.** PKG-DEM1 corrected the route to derive the city from the
district row and refuse a request naming neither a real district nor a recognised city. One layer
under it, `create_requirement` still holds `coalesce(nullif(payload->>'city',''), 'Riyadh')`. It is
not reachable through the route today, which is why it is P1 rather than P0, but any other caller
files a requirement in a city nobody stated. The fix is a one-line migration and it is deliberately
not authored here: a migration file that is never applied is worse than the defect, because the
tree then claims a fix the database does not have. `execute_sql` and `apply_migration` are both
permission-denied from this environment. Finding 117.

**Registering interest notifies nobody.** `create_requirement` inserts `requirement_notifications`
for the broker, landlord and SAT audiences, so the platform tells owners and brokers that demand
exists. The interest route inserts no notification, so it never tells the occupier that supply
answered; they find out by returning to the page. The schema for it exists and this write path does
not use it. Same missing write channel. Finding 118.

## 5. Tests

`src/lib/requirementFigures.test.ts`, 19 tests, added by hand to the `test` script.

The guards are written against the output string rather than against the module's branches, because
the property under test is not "the module agrees with itself", it is that a figure the occupier
never stated never reaches a screen as a figure.

The sensitivity case reproduces both shipped expressions verbatim and asserts that
`` `${null} to ${null} m²` `` is `"null to null m²"` and that `Number(null).toLocaleString("en-US")`
is `"0"` and not `""`. The defect is therefore reproduced in the suite rather than described in a
comment.

Covered: an unstated size and an unstated budget are both `null` for every shape the column and the
API can carry; no output ever contains `null`, `NaN`, `undefined`, `?` or `Infinity`; a value that
cannot be printed is withheld rather than shown as `NaN`; half-open ranges in both languages; equal
bounds collapse; closed ranges in both languages; figures are grouped and in Western numerals in
both languages, with an explicit assertion that no Arabic-Indic digit appears; the unit comes from
`format.ts` rather than from the caller; a lease budget and a purchase budget carry different units;
the budget reads as a ceiling in both languages; Arabic output is bidi-isolated and English is not;
no Latin script leaks into an Arabic figure; and a numeric string from PostgREST groups like a
number rather than printing raw.

Full suite: 1450 tests, 1450 passing, 0 failing, 0 skipped. `npx tsc --noEmit` clean.
`npm run ar-lint` clean. `node scripts/prose-scan.mjs` clean within its stated scope: 0 hardcoded
prose strings across 29 public entry points and 126 reachable source files.

## 6. Findings

Opened and fixed in this package: 114, 115.
Opened and partially addressed, with the open half stated: 116.
Opened and left open with the reason: 117, 118.
Opened by this package's own live evidence and fixed in the closure commit: 119.

## 7. A correction made during closure

The first commit of this package shipped three documents saying `scripts/ar-lint.mjs` reads
`src/lib/requirementFigures.ts`. It did not. The edit adding the module to the lint's explicit file
list was rejected and was not retried, and the module's own doc comment, this handback's section 3
and the roadmap entry all asserted a gate that was not there. `npm run ar-lint` reported clean and
that report did not cover the new file's Arabic, so the clean result was true and the reason given
for it was false.

It is applied now, and it was checked by watching it fail rather than by watching it pass: an
Arabic-Indic digit was put into the module's `حتى`, `ar-lint` was run, and it reported
`src/lib/requirementFigures.ts: 1x "٥"` and exited non-zero. The digit was reverted and `git diff`
confirms the file is unchanged. A gate nobody has watched fail is a gate nobody knows works, which
is the same rule the tests in section 5 are written to.

The lesson is worth keeping rather than burying: a gate's coverage is a claim about the world, and
this package asserted one in three places without checking it once.

## 8. Live evidence

Deployment `dpl_BJTZoWcdPKkpSFtZsR9sHGkozieR`, host `satmarkets-e0uigro4o-sat-markets.vercel.app`,
commit `4909df0`, state READY, target production. Vercel READY is this package's production-build
evidence, because `npm run build` cannot complete in this environment: `next/font` reaches Google
Fonts and the sandbox egress proxy refuses it.

**The data the fix was verified against, stated plainly.** `GET /api/requirements` returns 200 with
`sample: false` and six rows, `R-20417` through `R-20422`, and **every one of them carries a non-null
`sizeMin`, `sizeMax` and `budget`**. So the corpus contains no null-figure row today, and no live
page renders the case this package exists for. The defect was reachable and not yet realised: the
form has been submittable only since PKG-DEM1, and no visitor has yet posted a brief leaving size or
budget blank. The fix is therefore verified against the module under test, and the deployment
evidence below establishes that the corrected code and the corrected dictionary are the ones being
served, not that a live null row now renders correctly. One row, `R-20417`, does carry
`timeline: null`, which is the same shape on the field that PKG-DEM1 made nullable, and the board
draws no clock line for it.

**English board, `/en/requirements`.** 135,039 characters. With `<script>` and `<style>` removed,
15,065 characters, containing `null` 0, `NaN` 0, `undefined` 0, `Not stated` 0, `Reply` 0. The
served HTML is the loading state, `Loading requirements…`.

**Arabic board, `/ar/requirements`.** 125,412 characters, `<html lang="ar" dir="rtl">`. Stripped,
14,808 characters, containing `null` 0, `NaN` 0, `undefined` 0, `Infinity` 0, and `م²` 0, `متر مربع`
0, `sqm` 0, since the figures are inside the client payload rather than the served markup. The four
remaining `?` characters are all the `?dpl=` cache key on asset URLs. The four `إلى` are the skip
link and two marketing lines, none of them a figure. The served HTML is the Arabic loading state,
`جارٍ تحميل الطلبات…`.

**English and Arabic requirement detail, `/{locale}/requirements/aa892eae-4106-4625-a2bf-ef362eb49d92`.**
135,674 and 126,119 characters, `dir="ltr"` and `dir="rtl"` respectively. Stripped, both contain
`null` 0, `NaN` 0, `undefined` 0, `Infinity` 0 and `Reply` 0. Both serve their loading state.

**What the RSC payload proves, which the served markup cannot.** These four routes are client
components that fetch on mount, so their served HTML is the loading state and carries no figure at
all. The active locale's dictionary is serialised into the payload, so the payload is where the
deployed strings can be read. In it, on all four pages: `reqDetail.figureUnstated` is present once
(`Not stated`, `غير مذكورة`), `reqDetail.replyNote` is present once in the right language on each,
and `req.upTo`, `req.rangeTo`, `reqDetail.rangeTo` and `reqDetail.reply` are absent, which is the
seven deleted keys and the two added ones, confirmed on the deployment rather than in the tree. The
`sarSqmYr` and `sar` keys that remain in the Arabic payload belong to the listing, shortlist,
benchmark, location-score and compare namespaces, not to `reqDetail`.

The stripping matters and is not decoration. Asserting a string's absence against the raw response
would be meaningless here, because the whole dictionary is in it; asserting it against the stripped
markup is what finding 99 exists to enforce.

**One defect found by this evidence.** The Arabic board serves `جارٍ تحميل الطلبات…` and the Arabic
detail page serves `جاري تحميل الطلب`, one click apart. Eight of the platform's ten progress strings
use `جارٍ`, including `reqDetail.matchesLoading` in the same dictionary object as the offender.
`reqDetail.loading` and `reqDetail.registering` are corrected in this closure commit, so all ten
agree. Finding 119.

**The two standing limitations, unchanged.** `mcp__Vercel__web_fetch_vercel_url` is the only channel
to the deployment from this environment and it issues GET only, so the requirement submission path
cannot be exercised end to end from here. And `/[locale]/requirements` and
`/[locale]/requirements/[id]` are client components that fetch on mount, so the served HTML is the
loading state and the rendered figures cannot be read from it at all.

## 9. Next package

Continuing under Codex item 10 to the next genuinely open dependency-ordered product package,
preferring a user-facing supply, demand or Listing Studio outcome.
