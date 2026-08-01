# Handback: PKG-LS1, the Arabic half of the lister's own workspace

Package closed. Commits `aed2c1c` and `da0780d`, deployed on `dpl_5pvwfPNL2PkKKWBj9L7kFtcWqAFG`,
state READY. This is the write half of finding 66. PKG-NM1 closed the reading half, and in doing
so created the defect this package closes: it began telling a lister what a reader in the other
language actually sees, on a screen that gave them no way to answer.

## 1. Scope

**The defect.** `EditListingForm.tsx` had one title box and one description box. Both wrote the
English columns. Both were labelled in whatever language the lister was reading, so an
Arabic-reading lister saw a box labelled `العنوان` and their Arabic sentence was stored as
`title_en`. The Arabic columns were not merely unexposed, they were unreachable: a listing
created through the Studio could hold an Arabic title its own owner could neither read nor
change, and a listing created through this form could never acquire one at all.

Nothing in the write path was missing. `PATCH /api/listings/[id]` had accepted `title_ar` and
`description_ar` behind the same `mayEdit` permission check the whole time, and `ALWAYS_EDITABLE`
already named both columns. The gap was entirely in the screen.

**What changed.** Four fields where there were two. The labels no longer name a field in the
reader's interface language while writing the English column: each names its own language, in
`ListingStudio`'s exact wording, and each control carries the `dir` and `lang` of the text it
holds rather than of the interface around it. So an Arabic input inside an English page and an
English input inside an Arabic page are both marked, and neither renders its own text against
the page direction.

The lister is also told, per field, whether the Arabic on their listing still answers the English
on it. `src/lib/listingArabic.ts` holds that one decision, and it holds it as four states rather
than two: `absent`, `current`, `stale` and `unknown`. `unknown` exists because a row with no
recorded source hash cannot support the claim either way, and telling a lister their Arabic is
behind their English when the record does not say so is a false statement about their own
listing. It fails quiet.

**The correction that changed the package.** `PATCH /api/listings/[id]` re-stamps
`title_ar_src_hash` whenever the request body carries `title_ar`, against whichever English the
same save is writing. That stamp asserts a specific fact: this Arabic was written against this
English. It is read by `/api/listings/[id]/translate` to decide what to refresh, and by
`arabicState` to decide what the lister is told.

A form that posted every field on every save would have stamped that fact onto a row where the
lister changed only the English sentence and left the Arabic untouched. Three consequences, all
real: `stale` becomes unreachable from the very screen `aed2c1c` built to display it; the row is
permanently exempted from any later translate run; and the lister is shown `current` on Arabic
that describes their space in terms their own English no longer uses. `changedArabic` sends an
Arabic field only when its trimmed value differs from what was loaded. Clearing a field counts as
a change, so a lister can delete their own Arabic rather than have the omission silently restore
it.

**The durable part.** The defect was not that one form lacked one field. It was that nothing
anywhere said a form which submits a listing title must submit both of them. The source guard in
`listingArabic.test.ts` scans every `.ts` and `.tsx` under `src`, selects only the files that
actually call the listings API, and fails any that know about one language. A page that merely
reads `title_en`, an internal verification queue, a card that renders one language, is not
accused of anything. What is forbidden is a writer that can only ever write half a row.

## 2. Commits

`aed2c1c` (`aed2c1caae9570b79d9d46ff338c0a4f0882a219`), 8 files, 304 insertions, 12 deletions.

> PKG-LS1: the lister's own edit form speaks both languages, and a guard that stops a
> one-language writer shipping again

New files: `src/lib/listingArabic.ts`, `src/lib/listingArabic.test.ts`,
`src/lib/translate/hash.ts`. `hashSource` moved out of `translateToArabic.ts` because that module
imports the AI gateway at module scope, and the lister's edit screen needs a sha256, not a
provider call. `translateToArabic.ts` re-exports it, so every existing importer keeps working and
there remains exactly one definition of what a source hash is.

`package.json` gained one entry, because `npm test` is an explicit file list rather than a glob
and a new test file that is not added to it is a test file that never runs.

`da0780d` (`da0780d86893aa89ee7cd6cf8dc11fa05a833371`), 4 files, 77 insertions, 4 deletions.

> PKG-LS1 correction: an edit that never touched the Arabic must not stamp it as current

`changedArabic`, its four tests, and findings 96 and 97 opened with finding 94 amended against
the live corpus.

## 3. Tests and gates

| Gate | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | RC 0 |
| Tests | `npm test` | 1394 pass, 0 fail, 0 cancelled, 0 skipped, 26278 ms |
| Arabic lint | `npm run ar-lint` | `ar-lint: clean` |
| Prose scan | `node scripts/prose-scan.mjs` | RC 0 |
| Production build | Vercel | READY on `dpl_ArzX4TDegaDXKPhSQyEYrm7Hrq8T` and `dpl_5pvwfPNL2PkKKWBj9L7kFtcWqAFG` |

`npm run build` fails in this sandbox on four `next/font` fetches to Google Fonts, for `Hanken
Grotesk`, `IBM Plex Mono`, `IBM Plex Sans Arabic` and `Source Serif 4`. That is the egress block
on this container, not a code result. The Vercel build is the production build evidence and it is
READY on both commits.

`listingArabic.test.ts` carries 13 tests. Seven fix what the lister is told, four fix what the
save sends, and two are the source guard plus its own sensitivity test. The sensitivity test
exists because a guard nobody has watched fail is a guard nobody knows works: it asserts the
regex catches a writer that patches `title_en` alone, and that it does not accuse a select that
merely reads the column.

## 4. Live evidence, English and Arabic

**The authenticated surface cannot be photographed from here, and this is stated rather than
blurred.** The edit workspace is session-protected. The only live channel available to this
container is an unauthenticated GET through `web_fetch_vercel_url`, and
`/ar/dashboard/listings/<id>` correctly returns 200 with `<title>تسجيل الدخول | سات
ماركتس</title>`, the sign-in page. That is the right behaviour and it is also the reason the
round trip cannot be demonstrated live in this environment. This is the standing live-evidence
limitation already recorded for authenticated surfaces, not a new one.

What the round trip rests on instead, by construction and by unit test: `ALWAYS_EDITABLE` already
listed both Arabic columns; the route already accepted, trimmed and length-capped both behind the
same `mayEdit` check; and the payload now carries them, with `changedArabic` deciding which.

**Public regression evidence, Arabic.** `/ar/listings/ff29f2d0-d343-4b96-ac8c-8d1b6c25a372` on
`dpl_5pvwfPNL2PkKKWBj9L7kFtcWqAFG` returns 200, 213683 characters,
`<title>دور مكتبي للبيع، غرناطة | سات ماركتس</title>`. The English string "Office Floor for Sale"
appears 0 times. Arabic-Indic digits `٠` and `١` appear 0 times. The em dash appears 0 times. The
naming policy PKG-NM1 shipped is intact and the Arabic detail page is unaffected by this package,
which is the correct outcome: nothing here touches a reader surface.

**Corpus evidence.** Measured against the fifty published rows the deployed `GET /api/listings`
returns, not assumed. `description_ar` is empty on all fifty. Seventeen rows carry a source hash
while `ar_translation_status` still reads `pending` and no model is recorded. Zero rows are
currently stale, so the note this package added is correct and, on today's corpus, silent. Nine
read `unknown` because no hash was ever stamped, and `unknown` says nothing at all, which is the
intended behaviour and not a gap.

## 5. Responsive evidence

No `.css` or `.scss` file changed in this package. The two new controls reuse the `inp` and `lbl`
styles of the four fields already in the form and sit in the same single-column flex stack, so
their behaviour at 320, 360, 390 and 430 pixels, and at tablet and desktop, is the behaviour those
fields already have.

What is genuinely new is direction, and it is per-control rather than per-layout. An Arabic input
in an English page and an English input in an Arabic page each carry their own `dir` and `lang`,
so the text renders with its own direction inside a container that keeps the page's. This is the
same basis PKG-NM1 recorded and it is stated as a basis, not as a photograph. This environment
cannot render or measure any width: Playwright cannot reach the deployment through the sandbox
proxy, the Chrome extension is not connected, and the remote-devices computer tools are
disconnected.

## 6. Findings

**Finding 95, closed.** The lister's edit form could not write either Arabic column while the API
accepted both.

**Finding 94, open, amended.** `ar_translation_status` is one value for the whole row, so on a
listing whose title was drafted by SAT and whose description was written by the lister it cannot
be true of both. A hash cannot separate them either, because a lister saving their own Arabic
stamps the same hash the translator would have stamped, and correctly so. Authorship is therefore
not derivable and is not asserted anywhere in `listingArabic.ts`. The live corpus already shows
the inconsistency: seventeen rows hashed, status `pending`, no model. The fix is per-field
provenance, which is a schema change.

**Finding 96, open.** `description_ar` is empty on all fifty published rows, so every Arabic
reader in the exchange gets a name and then nothing. The field has existed in the Studio
throughout and now exists on the edit form, so this is a corpus fact and no further form work
closes it.

*Considered and rejected during this package:* composing an Arabic description ladder for rows
with no `description_ar`. Reading the detail page killed it. The terms grid, compliance grid,
floor plans, video, `LocationFacts` and the evidence passports already render fully bilingually,
so a composed Arabic paragraph would restate, in prose, facts displayed as structured evidence
centimetres above it. That is not a gap worth filling with generated sentences.

**Finding 97, open.** The stamp discipline currently lives in the client. `changedArabic` is
correct and tested, but a second writer that posts the Arabic unconditionally would re-introduce
the false stamp. The durable fix belongs in `PATCH /api/listings/[id]`, which should compare the
incoming Arabic against the stored value and skip the re-stamp when they match.

## 7. Remaining blockers

Unchanged from the previous handback and none of them introduced here.

Authenticated-surface live verification: no channel in this container can hold a session, so
lister and admin workspaces are verified by construction and unit test rather than by photograph.
`mcp__Supabase__execute_sql` returns a permission error, so record-level evidence comes from the
deployed `GET /api/listings` instead. The sandbox egress proxy returns 403 CONNECT for both the
deployment and Supabase REST, which is why `web_fetch_vercel_url` is the only live channel and
why the local production build cannot fetch its fonts.

Owner-side and unchanged: `.github/workflows/arabic-font.yml` is delivered but must be installed
by the owner, because the deploy token has no `workflow` scope and a workflow-scoped token must
not be requested. Codex item 7's interactive-browser Advisor verification remains blocked on the
same channels. O10 through O16, finding 74, contract 6 and provider activation, and the twelve
Part E clauses for any mobility source are all owner or contract decisions, not engineering ones.

## 8. Next package

**PKG-SUP1: the public listing entry stops simulating a form.** Finding 35.

`/list` is the public entry point for supply and it is a mock. On
`dpl_5pvwfPNL2PkKKWBj9L7kFtcWqAFG`, `/en/list` returns 200 with 8 `<label>` elements, 0 `<input>`,
0 `<textarea>`, 0 `<select>` and 0 `<form>`, and `/ar/list` returns the same counts. Every field
is a `<div class="input">` holding someone else's answer: "Grade A office floor" 7 times, "Al
Olaya" 23 times, "320" 11 times. A four-step wizard shows step 1 checked and step 2 active. "Drag
photos here" is not a drop target. The only real control is a link to `/dashboard/new`, a
different and empty form a signed-out owner cannot reach without signing in first.

It is two defects at once. An owner believes they are two steps into a submission that does not
exist, and a photograph dragged onto that zone is lost. A screen-reader user is told there is a
"Listing title" field and there is nothing to focus. The four fake steps also do not match the
real intake, which has ten.

The honest replacement is derivable rather than hand-written, which is what makes it worth
building. `studioSteps()` returns the same ten step kinds for all fifteen asset types, each with a
bilingual title and purpose. `DRAFT_REQUIRED_CHECK_KEYS` and `assessListing()` return the seven
facts the write path refuses to save a draft without, each with a bilingual label and why-text. So
`/list` can describe the real intake from the same model that runs it, and the two cannot drift.

Full scope, stop condition and what is deliberately not built are in `docs/roadmap.md`.
