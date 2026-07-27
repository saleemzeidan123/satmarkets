# PKG-1B.2 closure record (2026-07-27)

Corrective package requested by Codex after the 27 July recheck of main and the live
preview. Seven failures were named; all seven are implemented, gated, shipped and
verified on the live production preview, not from local tests or source inspection.

Commits: 09ff795 (the package), 34551dd (Arabic copy correction found only on live),
plus this record.

## 1-2. A reporting year is never a comparison rent

`src/lib/market/numericIntent.ts` now classifies every number in a question before any
value evidence is built. Years, areas, percentages, budgets and rents each land in their
own bucket, and a number is promoted to a comparison rent only when the user supplies a
rent unit (SAR/m2, ريال/م²) or the sentence is explicitly a comparison ("is that fair",
"we pay"). A bare number with neither cue is not a rent.

The client was the second half of the defect. `useAdvisorChat` used to re-parse the
question with a first-number regex to place the "your rate" marker on the band chart, so
even a correct sentence drew a marker at 2,026. It now trusts the server's `quoted`
value or shows no marker at all.

Live result, both locales: "What was the office band in Al Olaya in 2026?" returns
`quoted: null`, and the answer contains no "your figure" sentence.

## 3. A requested period is honoured or refused, never substituted

`detectRequestedPeriod()` parses a year ("2025") or an explicit quarter ("2025-Q3",
"Q3 2025", "الربع الثالث 2025") in either language and either order. The retrieval layer
queries that period. When the index does not publish it, `ValueEvidence.periodStatus`
becomes `unavailable` and the renderer leads with an explicit refusal naming the newest
published period, then states twice that the figures below are not an answer to the
question asked.

## 4. Arabic grade letters are recognized

`detectRequestedSegment()` matched Latin A/B/C only, so "سعّر مكتب فئة أ في العليا" fell
through to the general-office band with no scope limitation. أ, إ, آ and bare ا now all
normalize to A, ب to B, ج to C, with a following-letter boundary so فئة أخرى does not
match. The Arabic request is now scope-limited exactly as its English twin is.

## 5. Every visible period goes through formatPeriod()

Raw storage form "2026-Q2" no longer reaches user-facing prose anywhere in the advisor,
the rent-index page, the watch banner or the marketing home. `displayPeriod()` wraps the
shared bilingual helper and renders a year-only request as the plain year.

## 6. Mobile overflow

Two structural fixes (`.input{min-width:0}`, `.chatmsg{max-inline-size:100%;
overflow-wrap:anywhere}`) plus one real offender found only after the local segments API
was mocked: a `.chip` is `white-space:nowrap`, which is right in a scrolling `.chip-rail`
and wrong in a wrapping row of full-sentence suggestions. At 320px the chip "Is 1,600
SAR/m2 fair for Granada offices?" ran 282px inside a 272px column. Scoped rule
`.chip-flow .chip` lets those chips wrap; the rail is untouched.

Verified on the live preview at 320, 360, 390 and 430px in English and Arabic: zero
elements overflow the document box and zero have `scrollWidth > clientWidth`.

## 7. The colour gate reads stylesheets

`greenReservation.test.ts` scanned .ts and .tsx only, so about a dozen green rules in the
stylesheets were invisible to it, and every one meant something other than verification.
The gate now scans .ts, .tsx and .css under src plus tailwind.config.ts, and each
allowlisted file carries a context regex, so an allowed file cannot quietly reuse green
for an unrelated meaning inside itself.

## Gate

`npx tsc --noEmit` exit 0. `npm test` 222 pass, 0 fail. `npm run ar-lint` clean.

## Arabic copy correction (34551dd)

Found only by reading the live Arabic answers: the single-letter prefixes rendered with a
trailing space ("لـ مكاتب", "بـ فئة A") and the scope sentence had a definiteness
mismatch ("نطاق مكاتب المنشور"). Corrected to "لـمكاتب", "بـفئة A" and "النطاق المنشور
لـمكاتب". A space before Latin script or digits is correct and was left alone.
