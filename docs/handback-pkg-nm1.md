# Handback: PKG-NM1, one naming policy for every row

Package closed. Commit `0e490d8`, deployed on `dpl_Av7coZHQkTJ1tJXvVw3vqaWuRaty`, state READY.
This is the second half of finding 66. The first half shipped in `7a3c995` and fixed one field
in one file.

## 1. Scope

**The defect.** `listingTitle.ts` was written to kill one idiom, the fallback from a missing
title to a reference code, and its header states a second law while it was there: the other
language's title is deliberately not a rung on the ladder, because showing an Arabic reader an
English sentence is worse than a short honest description, since it looks like a title somebody
chose. Nothing anywhere enforced that second law. The source guard in the test file scanned only
for the reference-code shape. So the other-language borrow survived, written by hand, in
twenty-two files:

```
(ar ? x.name_ar : x.name_en) || x.name_en
```

including the public `/brokers` page, `/locations`, the map, the admin surfaces, the messages
list and every page of the lister workspace.

**The decision this package makes, once, in one place.** `src/lib/displayName.ts` holds two
policies and the reason they differ, so that a future call site inherits a decision instead of
making one:

A place name is a DESCRIPTION. When we do not hold it in the reader's language we own a
truthful alternative, the city, which is wider than the district, never false, and held in both
languages. So a district never borrows; it widens. That is `placeName`.

An account, lister or building name is an IDENTIFIER. There is no wider true form of "Olaya
Towers", and blanking it leaves the reader nothing to recognise. Showing the one registered
spelling we hold is not a mistranslation, because nobody claimed it was a translation. So an
entity does borrow, deliberately, once, here. That is `entityName`, and it is the only
authorized borrow in the platform.

**What changed.** Twenty-three call sites migrated to `placeName`, `entityName`, `listingTitle`
or `listingPlace`. Three Supabase selects widened to carry `city`, because a district cannot
widen to a city it was never given. The source guard gained a second scan for the borrow, and a
sensitivity test of its own. The lister is told, on their listings table and on the listing
detail page, what a reader in the other language is actually shown.

**Correction to the package as scoped.** The roadmap entry said nine call sites. That was an
estimate made before the guard existed. Expressed as a tested regex the real figure was
twenty-three sites in twenty-two files, which is why the commit is thirty-seven files.

## 2. Commits

`0e490d8` (`0e490d8d9a3a594c4e626f196eb66c1233cc51d3`), 37 files, 454 insertions, 86 deletions.

> PKG-NM1: one naming policy for every row, and a guard that enforces it

New files: `src/lib/displayName.ts` (77 lines), `src/lib/displayName.test.ts` (62 lines, 8
tests). `src/lib/listingTitle.test.ts` grew by 110 lines, `listingTitle.ts` by 35, and
`package.json` by one entry, because `npm test` is an explicit file list rather than a glob and
a new test file that is not added to it is a test file that never runs.

Public and lister surfaces touched: `brokers`, `locations`, `listings`, `listings/[id]`,
`listings/[id]/flyer`, `building/[id]`, `lister/[id]`, `requirements/[id]`, `compare`, `find`,
`map`, `me`, `messages`, the whole of `dashboard`, the admin shell and accounts pages, four API
routes, `ListingStudio`, `LocationPicker`, `ListerBadge` and `lib/search/place.ts`.

Also confirmed in this window: PKG-AV2's documentation commit `f051f50` deployed as
`dpl_5ueDsydC1RKVcBQP15sE4jgc5TjH`, state READY. That was the one verification item left open at
the end of PKG-AV2, and it is now closed.

## 3. Tests and gates

All four gates green on the first run, no retries.

```
npx tsc --noEmit          RC=0, no output
npm test                  1..1381   # pass 1381   # fail 0   # duration_ms 24909
npm run ar-lint           ar-lint: clean
node scripts/prose-scan.mjs
  29 public entry points, 124 source files reachable
  GATE public page source: 0 hardcoded prose strings in 0 files
  BASE shared component source: 364 in 16 files (reported, deferred)
  NOTE library modules: 1569 strings
```

Production build evidence is the Vercel deployment reaching READY.

**The specifically flagged risk passed.** `src/lib/reachability.test.ts` enforces a two-tier
rule: everything under `src/components` and `src/app` must be runtime reachable with no allow
list, while `src/lib` and `src/theme` may be listed in `ALLOWED_UNREACHED` with a stated reason.
A new library module is the exact shape that test is built to catch. `src/lib/displayName.ts`
passed it without an allow-list entry, which is the correct outcome: it is reached at runtime by
the pages that import it, so no exemption was needed and none was written.

**The guard has a test of its own.** A guard nobody has watched fail is a guard nobody knows
works. The sensitivity test runs the borrow regex against the eight shapes actually deleted in
this package, which it must catch, and seven shapes that must stay legal: a hash comparison
against `title_ar_src_hash`, a multi-line insert with one default per column, a lowercase
normalisation, the shipped shape where one language is chosen and the last resort is not a name,
a ternary that reads one field, a fallback to a caller-supplied string, and a PostgREST select
list. The first version of the regex reported twenty files with twelve of them innocent, and a
scan with that hit rate gets switched off by the next person who reads it, so the three
constraints are themselves under test: the pattern must join fields of different languages, on
one line, and the field name must end where it is written.

## 4. Live evidence, English and Arabic

All fetches against `dpl_Av7coZHQkTJ1tJXvVw3vqaWuRaty`.

**The subject row, chosen from records rather than inferred.** `/api/listings` returns 50
published rows. Exactly one has a blank `title_ar`: `SATM-BB3FCB59`, id
`40347a1f-1c3f-440d-a509-f578c9eb88fc`, `title_en` "Serviced offices, Al Aqiq", asset type
`serviced`, district present, status published. Zero rows have a blank `title_en`.

**Detail page, Arabic.** `<title>` and `H1` and `og:title` all read `مكاتب مخدومة في العقيق`.
The English string "Serviced offices, Al Aqiq" does not appear anywhere in the Arabic document.
`SATM-BB3FCB59` appears four times, and every one of them is the separate reference-code field
beside the title or the mailto subject line, which is a code being used as a code.

**Detail page, English.** `<title>Serviced offices, Al Aqiq | SAT Markets</title>`, `H1` the
same.

**Browse, Arabic.** `/ar/listings`: `SATM-BB3FCB59` count 0, "Serviced offices" count 0,
`مكاتب مخدومة في العقيق` count 2. Map bubbles read `واجهة الرياض المالية · مشروع`,
`واحة الاتصالات · مشروع`, `وادي ليسن · مشروع`, `روشن فرونت · مشروع`.

**Browse, English.** `/en/listings`: "Serviced offices, Al Aqiq" count 2, Arabic leak count 0.
Bubbles read `KAFD · project`, `ITCC · project`, `Laysen Valley · project`,
`Roshn Front · project`.

**The public borrow that was fixed.** `/ar/brokers` three cards:
`أركيد الحاج للتجزئة، العزيزية`, `وحدة خدمات لوجستية، قرطبة`, `معرض، الدمام`, with districts
`العزيزية`, `قرطبة`, `الفيصلية`. `/en/brokers`, the same three: "Pilgrim Retail Arcade, Al
Aziziyah", "Logistics Unit, Qurtubah", "Showroom, Dammam".

**The widening policy, at scale.** `/ar/locations` renders 77 district cards and the count of
cards bearing a Latin-script name is 0. `/en/locations` renders the same 77 and the count
bearing an Arabic-script name is 0. The JSON-LD `ItemList` on the Arabic page reports
`numberOfItems` 77 with first entries `واجهة الرياض المالية, الرياض` and
`واحة الاتصالات, الرياض`, so the structured data carries the same policy as the visible page
rather than a separate one.

**What could not be fetched.** The lister notice ships on two surfaces and both are behind a
session. The only live channel available in this environment is GET-only and unauthenticated,
the same limitation recorded in PKG-AV2's closure, so that clause is evidenced by test and by
source rather than by fetch.

## 5. Responsive evidence

No stylesheet changed in this commit. `git show --stat 0e490d8` matched no `.css` or `.scss`
file. Every change is the string placed inside a container that already existed, so the 320,
360, 390 and 430 pixel behaviour is inherited unchanged from the card and table CSS that was
already validated in earlier packages.

Two things are worth stating rather than assuming. First, the strings this package produces are
shorter than the ones it replaced in the failure case, not longer: a reference code becomes a
short description, and an English district name inside an Arabic sentence becomes a city name.
Nothing grew, so nothing that fitted stopped fitting. Second, the one genuinely new element, the
lister notice, is wrapped in `<bdi dir="rtl">` or `<bdi dir="ltr">` chosen by the language being
quoted rather than by the interface language, inside a block capped at `maxWidth: 330`, which is
the same cap the availability lines beside it already use. Quoting the other language without
that isolation is precisely how a bidirectional line breaks, and it is the reason the wrapper is
there.

## 6. Findings

**Finding 66 is now closed in full.** Its register cell carries the second half with the file
counts, the three-way separation, the guard's constraints and the live evidence above.

**Finding 92, new, P2, confirmed open.** `district_label` and `district_label_ar`, twenty-seven
sites in eighteen files. It carries the identical shape and was deliberately not swept into
`displayName.ts`. That column names the geography a published third-party statistic describes.
Widening it to a city would restate a band measured in one district as a band measured across a
city, which is a false statement about someone else's figure rather than a kinder rendering of
our own. The correct fix is upstream at ingestion and is a data and rights question, not a
rendering one. The exclusion is written into the header of `displayName.ts` and into the guard's
comment so that a future reader finds the reason before finding the gap.

**Finding 93, new, P2, confirmed open.** The lister `about` paragraph at
`src/app/[locale]/lister/[id]/page.tsx:92`. Prose is neither a description we own nor an
identifier we hold, so neither policy applies and there is no honest generic substitute. Three
candidate answers are named in the register and none is chosen; it is deferred to whichever
package next touches the lister profile surface.

**Checked and deliberately not opened.** After seeing `generateMetadata` absent from
`advisor`, `requirements` and `find`, a metadata package looked like the obvious successor.
Fetching the deployment showed `/ar/advisor` already serves a correct localized title,
description and canonical from a layout, so finding 12 is only partly open, and that `hreflang`
is absent platform-wide rather than on two routes. Owner ruling 1 deprioritizes launch indexing
and the preview is noindex, so `hreflang` has no present value and the package would have been
effort spent against a standing ruling. Recorded here because the check is the useful artefact,
not the conclusion.

## 7. Remaining blockers

Unchanged from the previous handback, all environmental or owner-side.

Codex item 7, interactive Advisor verification: all three channels are still closed. The sandbox
egress proxy returns 403 on the deployment and on Supabase, the Chrome extension is not
connected, and the desktop bridge tools have disconnected again this session. The bridge
previously reported no granted applications, and `computer_request_access` was deliberately not
called because it raises an approval dialog on the owner's desktop that nobody is present to
answer.

`mcp__Supabase__execute_sql` returns a permission error, so the direct database channel is gone.
Real data is read instead through the deployed public JSON API routes, which is how the
fifty-row census above was taken.

`.github/workflows/arabic-font.yml` remains an owner-side install. The deploy token lacks
workflow scope, and a workflow-scoped token must not be requested.

O10 through O16, contract 6 and provider activation, PD4 deed checks under FAL, finding 74 and
ADV-5C are all unchanged and all still gated on owner or external decisions.

## 8. Next package

PKG-LS1, the Arabic half of the lister's own workspace. It is the package this one created.

PKG-NM1 now tells a lister on two screens that an Arabic reader sees a generic description
instead of the name they wrote, and gives them nowhere to answer it.
`src/components/EditListingForm.tsx` declares `title_en` and `description_en` and nothing else,
submits those two, and renders exactly one title input and one description textarea.
`src/app/[locale]/dashboard/listings/[id]/page.tsx` passes only those two in. Meanwhile
`PATCH /api/listings/[id]` already accepts `title_ar` and `description_ar` behind the same
field-permission check, already trims and caps them, and already maintains `title_ar_src_hash`
so the translate route can distinguish Arabic that SAT generated from Arabic a lister wrote.
`ListingStudio.tsx`, the create path, already carries both languages, which means a listing
created in the Studio can hold an Arabic title its owner can neither see nor change.

So the write path exists, is permission-checked, and is unreachable from the one screen where a
lister edits their listing. No data rights, no external service, no AI, no new column and no new
route are required. It is a supply-side outcome, which is what Codex item 10 asks for, and its
dependency is satisfied precisely because PKG-NM1 shipped first: there is no point offering the
field before the lister knows the gap exists.

Full scope, the deliberate exclusions and the stop condition are in `docs/roadmap.md` under
PKG-LS1. Work begins immediately; no approval is being waited on.
