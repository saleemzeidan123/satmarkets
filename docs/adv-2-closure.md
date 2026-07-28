# ADV-2 closure: the professional supply and demand workflow

Package: ADV-2 of the competitive advantage programme (owner directive, 2026-07-28).

Commits, in order: `ca8e13e` (the completeness model), `c0a4d91` (fact scope and
asymmetric attribution per asset type), `db7dd28` (the Studio step model), `1eeabdc` (the
Studio replaces the single long form, and the write path accepts the Arabic it asks for),
`0dc184a` (a draft you can leave and come back to), `5b0d864` (does this listing answer
that requirement, dimension by dimension), `1842539` (the requirement match page prints
its reasons), `06ec9be` (the permissioned matches endpoint), `d376729` (a pitch carries
the listing it is about), `80ea746` (the decision pack model), `919eb63` (the person who
booked a viewing can read what was decided), `023b4d1` (a shortlist is a saved listing
with a name, on the account), `81901cc` (the shortlist states what it can compare),
`f7c522d` (the Saved page files onto the account shortlist and promotes the browser map
once), `dc780e3` (the professional media standard and the brief in the Studio).

Deployment verified: `dpl_gDQ1jNoqCR7VNs6XjpWhsngYohCC`, READY, commit `dc780e3`, aliased
to `satmarkets-wheat.vercel.app`.

Gates at close: `npx tsc --noEmit` clean, `npm test` 681 passing and 0 failing, `npm run
ar-lint` clean, `node scripts/prose-scan.mjs` GATE 0 in 0 files. 526 tests at ADV-1 close,
so the package added 155: 28 in `listingQuality`, 24 in `factScope`, 29 in `listingStudio`,
7 in `listingEdit`, 24 in `matching`, 29 in `decisionPack` and 14 in `mediaStandard`.

Volume: 37 files, 7,885 insertions, 481 deletions. Two migrations, both applied to
production through the Supabase MCP and recorded in `supabase/migrations` because the repo
is the source of truth for schema.

## What the package was for

ADV-0 wrote down what SAT Markets may lawfully do with each source. ADV-1 built the
apparatus that decides what the platform is entitled to say about a record it holds. ADV-2
is the first package that spends that foundation on the thing a marketplace exists to do:
move an occupier from a requirement to a decision, and a lister from an empty form to a
listing somebody can act on, without either side being handed a fact nobody established.

The starting position had two halves and both were shaped by the same defect.

On the supply side there was one long intake form. It asked the same lister for a ceiling
height and a rent-free period in the same scroll, it asked for facts about the
surroundings that no lister can know, it had no idea which of its questions mattered, and
it could not be left and resumed. A form that cannot say what it is missing produces
listings that cannot say what they are missing, and 88 of those were already published.

On the demand side there were requirements, saved listings and viewings, and nothing
joined them. A requirement sat in a table. A saved listing sat in another. A viewing
request was filed and the person who filed it could never learn the outcome, because
`viewings.requested_by` had been nullable and unwritten since the table was created. A
shortlist name lived in `localStorage` under `satm_saved_folders`, so it did not follow
the person to a second device and the server could not read it, which means nothing could
be built from it.

The distinguishing property of this package is the same one as ADV-1's. None of it is
fixed by wording. Every part of it is fixed by making the honest answer the only one the
types allow: a fact the record does not state is `unknown`, never zero and never a
default, and no surface may print a verdict without printing the reasons it came from.

## Scope delivered

**1. The completeness model.** `src/lib/listingQuality.ts`, 596 lines, 453 lines of test.
Every check carries a scope, a weight, a state and the sentence that says what is missing
and why it matters, so the score is derived from the reasons rather than asserted beside
them. `PHOTO_SET_MIN` is 6. `contradictionsOf` names the kinds of internal disagreement a
record can carry, and a contradicted listing bands below an incomplete one, because a
record that disagrees with itself is worse than a record that is merely short.
`PLATFORM_OWNED_FIELD_KEYS` marks the facts the platform supplies, so a lister is never
scored down for a blank nobody asked them to fill.

**2. Fact scope, resolved per asset type and per field.** `src/lib/factScope.ts`, 490
lines, 267 lines of test. Five scopes: property, space, deal, compliance, area. Scope is
resolved per `(assetType, key)` and never per key alone, because `frontage_m` is a fact of
the offered shop for retail and a fact of the plot for land, and a flat key map would have
to be wrong about one of them. Nothing resolves by fallback: `factScope` returns null for
a pair it has no entry for and the test asserts every registry entry resolves, so adding a
field forces a scope decision rather than inheriting whichever default happened to be the
common case.

`attributionOf` carries ADV-1's asymmetry down to the field level. A property fact may
appear on a unit page as context. A space fact or a deal fact may never be restated as a
fact of the building. That asymmetry is the difference between "this building is grade A"
and "this building rents at 1,400", and collapsing it is how a marketplace starts
publishing figures nobody wrote.

**3. The Listing Studio.** `src/lib/listingStudio.ts` (328 lines, 454 lines of test) plus
`src/components/ListingStudio.tsx` (1,095 lines), which replaced `NewListingForm.tsx`.
Short progressive steps, `STEP_MAX_FIELDS` of 8, each step owning a named set of facts and
nothing else. Three properties are held by test rather than by care: every fact a lister
can supply lives on exactly one step, so the partition rules out both asking twice and
never asking; a step asks only for facts of its own subject, so the building step cannot
smuggle in a rent; and a fact the lister cannot know is omitted from the steps entirely
rather than presented as a blank they are expected to fill.

Progress and resume both read the completeness model, so "what is missing" has one
definition on this surface and on every public surface, and the Studio never computes its
own. `1eeabdc` also fixed the write path, which had been rejecting the Arabic the form
asked for.

**4. Save and resume.** `src/lib/listingEdit.ts`, 107 lines, 60 lines of test.
`ALWAYS_EDITABLE`, `DRAFT_ONLY_EDITABLE` and `NEVER_EDITABLE` are three explicit lists
rather than one permissive default, `stageOf` maps a status to a stage, and `mayEdit`
answers per field and per stage. `resumeStepId` returns the step a returning lister lands
on, derived from the same quality report. A draft is a thing you can leave.

**5. Requirement matching, stated rather than scored.** `src/lib/matching.ts`, 549 lines,
279 lines of test. Named dimensions with a state each, and the verdict derived from those
states rather than asserted alongside them. Four properties:

A fact the listing does not state is `unknown`, never a pass and never a fail, and every
unknown dimension carries a remedy naming the fact that would resolve it, so "why is this
only a possible match" always has a factual answer somebody can supply. A free-text
must-have is never inferred from structured fields, so a brief carrying must-haves has no
exact match by construction, which is the honest result rather than a defect. Tolerance is
declared and published, `SIZE_TOLERANCE_PCT` and `BUDGET_TOLERANCE_PCT` both 10, and a
near miss is a `possible` match whose reason states by how much it missed rather than
being rounded quietly into an exact one. Eligibility precedes comparison: a draft, a demo
row facing a real requirement, or an advertisement whose permit has expired is excluded
with a stated exclusion rather than scored badly, because permission is not a score.

`1842539` prints those reasons on the lister's requirement page, `06ec9be` serves them
through a permissioned endpoint that answers only for listings the caller actually files,
and `d376729` makes a pitch carry the listing it is about and the reasons it answers, so
an expression of interest is no longer a message with no evidence attached.

**6. The viewing workflow, both ways.** `919eb63` and migration
`20260728b_requester_can_see_the_viewing_they_booked.sql`. A lister could already see and
decide viewings against their own listings. Nothing addressed the person who booked: the
status column recorded an outcome the one party waiting on it had no route to. The column
to hang it on already existed and had never been written, so `/api/viewings` now stamps
`requested_by` from the session when the booker is signed in and leaves it null when they
are not, a new SELECT policy lets a person read the viewing they booked, and the INSERT
policy was ALTERed rather than dropped and recreated so that no window exists in which
public booking fails.

The null guard on that policy is not decoration. `requested_by` is null on anonymous rows
and `app_user_id()` is null for an anonymous caller, and `null = null` is null rather than
true in SQL, so without the guard every anonymous row would have been readable by every
other anonymous caller. The INSERT check now permits a row filed anonymously or in your
own name and in no other name, because an open INSERT plus a new ownership-carrying column
plus a public publishable key is an invitation to plant a viewing in somebody else's list.
No existing row was backfilled: a viewing booked without an identity does not acquire one
retrospectively.

**7. The shortlist, on the account.** `023b4d1` and migration
`20260728c_a_shortlist_is_a_saved_listing_with_a_name.sql`, then `f7c522d` for the client
half. One nullable `shortlist` column on `saved_listings`, null meaning saved but unfiled,
a length constraint between 1 and 60 that rules out both the empty string pretending to be
a name and a name long enough to be a note, and a `(user_id, shortlist)` index for the one
read this supports. No new policy: the existing ALL policy scopes both `using` and `with
check` to `user_id = app_user_id()`, so a name may only be written onto a row the writer
already owns.

`promoteDeviceFolders` in `src/lib/saved.ts` moves the old browser map onto the account
once, and it is deliberately conservative in three ways: it writes only onto rows the
account already holds, it never overwrites a name the account already carries because that
name may have been set from another device with the column in place, and it clears only
the entries that actually landed, so a failed request leaves the evidence in place to try
again rather than losing the name.

**8. Decision pack preparation.** `src/lib/decisionPack.ts` (647 lines, 431 lines of test)
and `src/components/DecisionPackPanel.tsx` (188 lines). A shortlist is not a decision. Four
saved spaces are four records of uneven completeness, and the standing temptation is to
line them up in a table and let the layout imply they are comparable, at which point the
missing facts read as zeros and the reader decides on arithmetic nobody performed.

The model answers two questions and refuses a third. Per candidate: which decision-relevant
facts the record states, on whose word, and how recently, with every dimension carrying a
state, a sentence and, where the fact is missing or stale, the ask that would resolve it,
addressed to a person who can answer it. Per pack: which comparisons are actually
available, offered only when every candidate states the inputs on the same basis and
otherwise withheld with a reason and with the candidates that cannot join it named. The
third question, which one to take, it does not answer: `PackReadiness` is a statement about
the completeness of the record, not a recommendation about the property.

`effectiveRentSqm` computes only when every input is on the record and carries the basis it
was computed from, which is the ADV-1 rule restated as arithmetic: arithmetic on stated
facts is allowed, arithmetic across a gap is not. `TONE` maps readiness to harbor, amber
and slate. Never green, because readiness is not verification.

**9. The professional media standard.** `src/lib/mediaStandard.ts` (373 lines, 172 lines of
test) and `src/components/MediaBrief.tsx` (95 lines). The floor-plan taxonomy, the
EXIF-stripping upload route, PDF routing and video embedding already existed from the media
slices. What did not exist was any statement of what a listing of a given asset type has to
show.

The module is deliberately two things that never merge. The BRIEF is 44 distinct shots
across 15 asset types, 6 universal and 2 to 4 specific, each bilingual and each carrying the
reason it matters to the person deciding. It is addressed to the lister and it is never
scored. The STATUS reports on the three things the record actually holds: a photograph
count, a plan with a recorded type, and a video link.

They never merge because the platform holds a count of files, a recorded plan type and a
link. It does not know what a photograph is a photograph OF. A model that scored the content
of an image would be asserting a fact nobody established, which is the same defect as
inventing a rent. `minPhotos` is `Math.max(PHOTO_SET_MIN, requiredShotCount)`, so an asset
type with more to show raises the floor and nothing can lower it. The `plan_type` check is
spliced in only once a plan exists, so a listing with no plan reports one gap under one name
rather than the same gap twice. Nonsense counts read down. The panel paints signal for met
and amber for outstanding, never green, and the test asserts that no string the module emits
contains the word "verified".

Wiring that honestly required a schema-level read rather than a count: `dashboard/new` now
reads `plan_type` rows instead of a head count, because passing null for each already
attached plan would have reported "the attached plan is not of a kind this asset uses"
against a listing whose type IS recorded, which is a false negative created by the client's
ignorance rather than by the record.

## Evidence

### Gates at `dc780e3`

`npx tsc --noEmit` clean. `npm test` 681 passing, 0 failing. `npm run ar-lint` clean.
`node scripts/prose-scan.mjs` GATE public page source 0 hardcoded prose strings in 0 files.

Every new test file was registered in the `test` script in `package.json` in the same
commit that created it. That is not housekeeping: `npm test` is an explicit file list and
not a glob, so an unregistered test file passes by never running.

### Live EN and AR

`satmarkets-wheat.vercel.app` at `dc780e3`. `/en/listings` renders "Commercial spaces
across the Kingdom" with 88 cards and the preview banner. `/ar/listings` renders
مساحات تجارية في المملكة with 88 cards and the Arabic preview banner. No Arabic-Indic
numerals, confirmed independently by `ar-lint` over source.

The limit of this evidence is stated rather than papered over. Nine of the eleven surfaces
this package built sit behind `PRIVATE_PREFIXES`: `/dashboard/new`, `/dashboard/requirements`,
`/me`, `/compare` and `/saved` are all session-gated, so an anonymous fetch cannot reach
them and the public evidence available at this commit is that the public surfaces still
render correctly in both locales after 37 files changed. The Studio, the media brief, the
shortlist chooser, the viewing outcome panel and the decision pack panel are covered by
unit test and by source review, not by an anonymous live fetch, because no anonymous live
fetch of them is possible.

### Responsive

Owed at the time this record was written, and collected in `f47be8c`. This paragraph is
the amendment; the debt above did not travel past one package.

Seven fragments were added to `scripts/responsive-probe.mjs`, one per surface: the Studio
step surface, the media brief, the requirement match reason list, the `/me` viewings
section, the `/me` shortlist grouping, the `/saved` shortlist chooser and the `/compare`
decision pack panel. Each was measured at 320, 360, 390, 430, 768 and 1280 pixels in both
locales, which is 120 measurements. The probe is the available channel because the Chrome
extension bridge is down and the container's Chromium cannot reach production; it
reproduces a surface character for character against the compiled stylesheet and the real
font files rather than measuring the deployed DOM.

Every string in the seven fragments was dumped from the model that emits it rather than
written for the probe. A scratch script ran `studioSteps`, `assessMedia`, `matchListing`
and `decisionPack` over one office lease scenario (520 sqm, 1,350 SAR per square metre per
year, fitted, three photographs, no plan, no video) against an office brief of 400 to 600
sqm with a 1,200 ceiling, and the EN and AR output was copied in verbatim. String length is
the entire thing a responsive measurement measures, so plausible-looking invented copy
would have measured nothing.

The run found one real defect, in the surface with the tightest constraint. The decision
pack dimension rows overflowed their 230 px card by 16 px at 320 px in both locales, because
the detail span was declared `flex: 1` with `min-width: 200`: `flex: 1` is `flex: 1 1 0%`,
so the wrap was decided as though the span were zero wide and the minimum was applied after
the line had already been assembled. Corrected in `src/components/DecisionPackPanel.tsx` to
`flex: 1 1 200px`, so the same 200 that constrains the span is the number the break is
decided on. Recorded as finding 51.

Result after the fix: 120 measurements, 0 document overflow, no item wider than its content
box, 22 inside a declared scroll rail. The 22 are the Studio step rail, which is a
`nav.overflow-x-auto` over an `ol.min-w-max` at every width by design, so a row wider than
its box is the intended behaviour and the document not overflowing is the assertion that
matters. One limit on that reading is recorded as finding 53: `sat-platform.css:550` sets
`html,body{overflow-x:clip}`, which clamps `documentElement.scrollWidth`, so the
document-level column cannot fail and the load-bearing assertions are the element-level
ones. That is exactly how this defect surfaced, as `row ovf 16` with `doc ovf 0`.

Three dead Tailwind numeric-shade classes were fixed in the same commit because they were
ADV-2's own error states rendering with no colour at all: the blocked-step marker, the
contradictions panel border and the error paragraph in `src/components/ListingStudio.tsx`.
The other 152 sites are finding 50.

## What remains in ADV-2 scope

The directive's step 4 enumerated: the asset-specific AI-supported Listing Studio,
professional media requirements, floor-plan and video handling, quality scoring, short
progressive steps, save and resume, requirement matching, viewing workflow, shortlisting
and deal-room preparation. Every one of those is delivered, with one qualification stated
below.

The roadmap paragraph for ADV-2 is wider than the directive's enumeration, and six items in
it are not delivered. Each is recorded here with the reason.

**AI-supported drafting inside the Studio.** The Studio is asset-specific, progressive and
resumable, and it is not yet AI-supported. That is deliberate sequencing rather than an
omission: the model-agnostic platform, the deterministic calculation boundary and the
classification that decides what an external provider may see are all ADV-3, and wiring a
drafting call before that boundary exists would send listing content to a provider under no
declared policy. Arabic drafting assistance arrives with ADV-3.

**Organizations, teams, roles and brand profiles.** Not built. The role lists exist in the
strategy and the authority rules do not, which is open decision O14. Building the containers
before the authority rules are ruled would produce a role model that has to be rebuilt the
moment counsel answers.

**Secure progressive disclosure and mutual-interest contact release.** Blocked on the same
O14. Who inside a landlord or tenant organization may release contact details, accept a
viewing or bind the organization is not answerable from this repository, and specifying
release without it would expose a party who never agreed.

**Consent, channel, suppression and frequency controls.** Partially blocked on O12. Until
the notification consent basis is ruled, external channels (email, push, SMS, WhatsApp) stay
disabled in code and only in-product notification ships, which is the position ADV-2 held
throughout. The consent-receipt recording that O12 requires from the start is specified and
not yet built, and it belongs with the contributor permission model in ADV-6.

**RFP.** Not built. It sits on the organization model above and therefore on O14.

**Blur and duplicate detection, and the exact EN and AR public preview.** Not built. Both
are honest to defer for the same reason the media standard exists: duplicate detection over
image content is a claim about what a file depicts, and this package deliberately declined
to make claims of that kind without a model whose limits are declared. Duplicate detection
over metadata and text is a different and cheaper question and is a candidate for ADV-3. The
exact public preview is straightforward engineering and is queued rather than blocked.

## Gate assessment

The ADV-2 gate reads: a mobile EN or AR user completes the core journey without duplicate
entry, invented facts or hidden verification meaning; and a new verified availability or
active requirement produces relevant explainable matches without exposing confidential
information or sending an unauthorized message.

Duplicate entry is structurally excluded and asserted by test: the step model partitions
every fact onto exactly one step. Invented facts are structurally excluded across all three
new models, each of which types absence as `unknown` and refuses to let it read as zero, a
default or a pass. Hidden verification meaning is excluded by D24 holding on all three new
surfaces, none of which spends confirmed green on completeness, readiness or media.

Explainable matches are delivered and no match is renderable without its reasons.
Confidential information is not exposed, and the matches endpoint answers only for listings
the caller files. No unauthorized message can be sent because no external channel is
enabled in code.

The half of the gate that is not evidenced is the word "mobile". The journey is built and
tested; it has not yet been measured at the six widths in both locales, and the private
surfaces cannot be fetched anonymously to check. That is the honest reading, and the probe
fragments are the first work of the next package rather than something claimed here.

## Next package

ADV-3, the model-agnostic AI platform: the six agents, typed SAT tools, the deterministic
calculation layer, the evaluation gold set and the cost-aware router. Kimi may be evaluated
and is not automatically selected, and no provider is chosen on token price. Calculations,
permissions, ranking eligibility, verification and transaction state stay deterministic. The
discovery agent sits on top of `queryParse.ts` and may not replace it or silently upgrade an
unrecognised term into a constraint. Private documents do not reach an external provider
until the enterprise AI agreement exists, and until then external models see only public,
sample or strongly redacted information, enforced by the ADV-0 classification rather than by
care.

It opens with the responsive evidence owed above, since seven fragments is a short job and
the debt should not travel further than one package.
