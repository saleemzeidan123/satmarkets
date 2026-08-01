# Handback, PKG-DEM1: the demand entry point stops rejecting its own visitors

Package closed 2026-08-01. Builder: Claude. Advisor: Codex. This is the consolidated handback the
governing directive asks for after each major package, and it is the continuation Codex item 10
directs: a real user-facing demand outcome rather than further dormant AI or infrastructure work.

## 1. Scope, and why this package rather than another

`/post-requirement` is the public entry point for demand, and it could not submit. That is the
whole justification for taking it next. The supply entry point was repaired in PKG-SUP1; this is
the other side of the same exchange, and it was not merely rough, it was broken in a way that
returned a 400 to a visitor who had filled the form in correctly.

The defect was measured on the deployment rather than inferred from the source. The served HTML of
`/en/post-requirement` carried `checked=""` on `value="1-3 months"`, and `/ar/post-requirement` on
`value="1-3 اشهر"`. `POST /api/requirements` validated the timeline against
`["ASAP","Q1","Q2","Q3","Q4","Flexible","Immediate"]`. Two of the four English options and all
four Arabic options were refused, and the refused set contained the default, so the first thing
every visitor did was submit an invalid brief. `GET /api/requirements` corroborated it: six real
rows whose timelines were null, Q3, ASAP, Q4, Q3 and Q4, not one a value the form could produce.

One layer under the 400, `matchListing` makes a listing's dated availability affirmation part of
the match only when the requirement's timeline is urgent, and it tested a third literal. So even
if `فوري` had reached the column, the matcher would not have recognised it.

Nothing failed when this shipped because the form's vocabulary and the route's accepted set were
two independent literals in two files and no test had put them side by side.

## 2. Which side was wrong, and why it is the form

The tempting fix is to widen the route until it accepts what the form sends. That fixes the wrong
side. The stored token is read by `matching.ts` and is already present on live rows, so the token
set is the system of record and the form is what drifted from it. Relaxing the validator would let
`1-3 months` into a column nothing can interpret, and the requirement would look posted while
being invisible to matching forever.

So the stored tokens are unchanged. Arabic gets labels, not new tokens.

## 3. What shipped

**One vocabulary.** `src/lib/requirementIntake.ts` holds each move-in option's stored token with
its English and Arabic label and its urgency flag, the seven asset types, the two deal types, the
seven must-have conditions, and the location grouping the form's control needs. The form renders
from it, the route validates against it, and `matching.ts` derives its urgent set from it, which
is what makes a future disagreement impossible rather than merely unlikely.

**The form now offers the platform.** `/post-requirement` is a server page that reads the
districts table and passes the rows down; `RequirementForm` is the client half. The control offers
the 77 locations across 21 cities the platform holds, grouped by canonical city key through
`cityLabel`, the same function the locations directory uses, instead of five Riyadh district ids
held as literals with names that had drifted from the source. Asset types went from five offered
to the seven the route accepts, so a serviced-office or education requirement can be posted at
all, and they are named through `assetLabel` rather than title-cased locally.

**The city stopped being invented.** The form sent `city: "Riyadh"` whatever was chosen. The route
now derives the city from the district row it looks up, and refuses a request that names neither a
real district nor a recognised city, rather than filing it in a city nobody stated.

**The district id is checked against the districts, not against a regular expression.** A well
formed UUID that names no district used to be stored, and the board then fell back to the free
text city, so the failure was silent on both sides.

**Must-haves became tokens.** The chips stored whichever language the visitor was reading, so
"Fitted" and "مجهّز" were two different stored conditions no surface could tell were the same one.
What the matcher claims about must-haves is deliberately unchanged: it holds no field that answers
"is this fitted", so each condition is still carried as an open question with the phrase quoted
back, never scored.

**Errors are field-level.** Five messages, in both dictionaries, named against the control that
carries them through `aria-invalid` and `aria-describedby`, with focus moved to the first control
the visitor has to return to and one `role="alert"` summary above the fields so a screen reader
hears that something happened at all. This closes the wording half of finding 28.

**The read side stopped printing tokens.** The board and the requirement detail page name the
stored timeline and must-have values through the same vocabulary the form renders from. The board
also lost a private asset-type map that held seven Arabic entries and zero English ones, gained an
empty state, and lost a page description claiming a Riyadh-only scope the form now contradicts.

**Two smaller repairs found on the way.** The segmented control had CSS for `span` and `button`
and none for `label`, which is the element the one control built from real radios uses, so the
selected state was in the DOM and never on the screen in either language at any width, and the
focus ring landed on a visually hidden input. And the preview sample rows carried English
must-have phrases, one of them a condition the form has never offered.

## 4. What is deliberately not asserted

**Nothing is pre-selected on move-in.** The column is nullable, the route accepts an empty
timeline and one live row carries none. A radio that arrives already chosen states a constraint
the visitor never gave, on the one field that decides whether availability is scored. This
substitutes for a stop-condition clause that asked for live evidence that the pre-selected
timeline is an accepted value; there is no such evidence because there is no pre-selection, and
the substitution is recorded here and in the roadmap rather than glossed.

**`ASAP` is accepted and not offered.** It is a synonym of `Immediate`, and a form asking a
visitor to choose between two words with one meaning asks them to guess at a distinction that does
not exist. Rows already carrying it keep working and it is still named on the board, because
dropping a stored value from the vocabulary would blank an existing requirement's timeline.

**One location, not several.** The record holds one `district_id`. The form that shipped
multi-selected, sent the first as `district_id` and appended the rest to `notes` as prose no
matcher reads, while the success card's match count was computed for the first alone. The honest
minimum is one location with the control saying so. What a real fix needs, a `requirement_districts`
join table, a change to the `create_requirement` RPC, a matcher that scores against a set and two
surfaces that name several locations without implying a ranking, is finding 102 rather than a half
build. It is a supervised schema change and is not attempted from a form package.

**The quarters carry no year.** `Q1` submitted in July 2026 may mean January 2026 or January 2027
and the column holds nothing to disambiguate it. Inventing a year the storage cannot hold would be
a fabricated figure; replacing the quarters with a date column is a schema change plus a migration
of the rows that carry them. Finding 103.

## 5. Tests

`src/lib/requirementIntake.test.tsx`, 19 tests, added by hand to the `test` script. The guards read
the `value` attributes the rendered form emits, in both languages, rather than reading the
vocabulary module, because the vocabulary agreeing with itself is not the property that was broken.

Each guard has a sensitivity case beside it, because a guard nobody has watched fail is a guard
nobody knows works. The move-in guard's sensitivity case asserts that the eight literals the
shipped form held still fail the validator's predicate.

Covered: every offered move-in and transaction value is one the write path accepts; both languages
offer the same values under different words; the asset chips offer all seven types under the
platform's own labels; the Arabic urgent option produces a requirement `matchListing` treats as
urgent, and a requirement with no timeline is not scored on availability; nothing is pre-selected
on move-in or location; every offered location reaches a structured field as its own id; Arabic
readers see no Latin script in the location control; a location held in one language widens to its
city instead of borrowing the other spelling; two spellings of one city do not become two groups;
an unreadable locations source says so and disables submission instead of showing an empty market;
no orphan labels in either language; no count on the success card is a literal; neither the form
nor the route holds a second list of timeline tokens; and every timeline, must-have and asset type
in the preview sample rows is a value the form could actually have produced.

Full suite: 1429 tests, 1429 passing, 0 failing, 0 skipped. `npx tsc --noEmit` clean.
`npm run ar-lint` clean. `node scripts/prose-scan.mjs` clean within its stated scope.

## 6. Findings

Closed: 28 (wording half), 100, 101, 104, 105, 106, 107, 108, 109, 110, 111, 112.
Opened and left open with the reason: 102 (multi-location not representable), 103 (quarter-year
ambiguity).

## 7. Live evidence, and the one piece that is missing

Verified on the deployment in both languages after shipping: see section 8 below.

`web_fetch_vercel_url` is the only channel to the deployment from this environment and it issues
GET only, so the submission path cannot be exercised end to end against the running site. What
stands behind the write path is the shared vocabulary plus the tests above, which read the values
out of the rendered markup and test them against the validator itself. A live POST is the one
piece of evidence this package does not have, and it is stated rather than worked around.

## 8. Live evidence

Deployment `dpl_5p9z42CxnpbVY4PHQFjtSgUvjJza`, commit `8a1853a`, state READY, target production,
served at `satmarkets-b6d5rhf0i-sat-markets.vercel.app`. READY is also the production build
evidence, because `npm run build` cannot complete in this environment: `next/font` reaches Google
Fonts and the egress proxy refuses it.

Each assertion below was made against the served HTML with `<script>` and `<style>` blocks stripped
first. That is not a formality. The whole active-locale dictionary is serialised into the payload
(finding 99), so any assertion about the presence or absence of a word, made against the raw
response, would be reading the copy deck of every other route.

**`/en/post-requirement`.** Six move-in radios, `Immediate`, `Q1`, `Q2`, `Q3`, `Q4` and `Flexible`,
which is exactly the offered subset of the accepted tokens. None carries `checked`. One `checked`
attribute exists on the whole page and it is `deal=lease`, which is a two-value question with a
defensible default and an accepted value either way. The location control holds 78 options: one
empty placeholder and 77 district ids, all distinct, under 21 `optgroup` labels. Seven asset chips
and seven must-have chips, the asset chips reading `Office`, `Retail & F&B`, `Warehouse`,
`Medical`, `Showroom`, `Serviced` and `Education`, which is `assetLabel`'s wording rather than the
title-cased token. Every `<label for>` on the page names a control that exists.

**`/ar/post-requirement`.** `dir="rtl"` and `lang="ar"`. The same six timeline values under Arabic
labels, none checked. 78 options, 77 ids, 21 `optgroup` labels, and no Latin character in any
group label or any option's text. Fourteen chips, all Arabic. No orphan labels. This is also the
live evidence for finding 104: the 21 groups read الرياض, جدة, الخبر, الدمام, مكة المكرمة,
المدينة المنورة, الظهران, الأحساء, الجبيل, الطائف, ينبع, أبها, الخرج, بريدة, تبوك, جازان, حائل,
خميس مشيط, سكاكا, عرعر and نجران, where before the package fifteen of them appeared in Latin script
inside an Arabic sentence.

**`GET /api/requirements`.** Six rows, `sample: false`, the same six the package was scoped
against.

**What the live sweep found, and what was done about it.** The must-haves on those six rows are
`Fitted`, `Parking`, `Metro nearby`, `24/7 access`, `Raised floor`, `Dock doors`, `Street-front`,
`Heavy power` and `High footfall`: display phrases the old form stored in whichever language the
visitor was reading. `mustHaveLabel` resolved a stored value by lowercasing it and comparing it to
the token, so only the single-word ones matched, and five of the six rows still showed an Arabic
reader Latin script. Finding 108 was closed against the tokens the new form writes, which made it
true of every future row and almost no present one. That is corrected in this same package rather
than left for a reader to discover: a stored value is now recognised by its own label in either
language as well as by its token, ignoring case and treating the space and the underscore as one
character. `Heavy power` and `High footfall` were never offered by any form, so they belong to no
token and keep their own words. The remaining half, a supervised migration rewriting the stored
phrases as tokens, needs a database write channel this environment does not have and is finding
113's open half. Two tests guard the reading, and the first of them was run against the pre-fix
lookup and fails there.

**What could not be verified live, stated rather than worked around.** Two things.

The submission path. `web_fetch_vercel_url` is the only channel to the deployment from this
environment and it issues GET only, so no requirement was posted to the running site. What stands
behind the write path is the shared vocabulary plus the tests, which read the values out of the
rendered markup and put them against the validator's own predicate.

The rendered read side. `/[locale]/requirements` and `/[locale]/requirements/[id]` are client
components that fetch on mount, so the served HTML is the loading state: `/ar/requirements/aa892eae`
returns جاري تحميل الطلب and no card. The labelled timelines and must-haves therefore cannot be
observed in a GET of those pages at all. What was verified instead is the payload they render
(above) and the labelling function itself, under test, against exactly the values that payload
carries. Naming this is what turned the must-have defect up: the substitute evidence was the
corpus, and the corpus disagreed with the closure.

## 9. Next package

Continuing under Codex item 10 to the next genuinely open dependency-ordered product package,
preferring a user-facing supply, demand or Listing Studio outcome.
