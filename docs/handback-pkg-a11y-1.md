# Handback, PKG-A11Y-1

The consolidated handback for the accessibility-remediation package Codex
commissioned on conditionally accepting PKG-ELITE-E1. Eighteen slices, A to R
plus a record-correction slice RC15, all shipped to `main` and all deployed.

Codex required that finding 138 be stated at the head of this handback before
anything else. It is stated first, in full, and the package scope begins after
it.

---

## 1. Finding 138, stated first

**The exact finding.** Two `<select>` queries in the lister dashboard asked the
`districts_geo` table for a `city` column and ordered their results by it, while
the public listings page has read the city from the `districts` table and joined
it since PKG-NM1. Both readings cannot be correct. One of the two names a column
that does not exist on the table it names.

**The affected runtime surface.** `src/app/[locale]/dashboard/new/page.tsx` and
`src/app/[locale]/dashboard/listings/[id]/page.tsx`, specifically the location
picker on each. Both routes are session gated.

**The user consequence.** If `districts_geo` carries no `city` column, the query
errors and the picker returns nothing, so a lister creating or editing a listing
faces a location control that can offer no location. The listing cannot be given
a district, and the journey stops. If the column does exist, there is no user
consequence at all and the finding is a false alarm. Which of those two the user
actually experiences is exactly what is not known.

**Severity.** P2. It was raised in PKG-ELITE-E1 slice C and has carried P2 since.

**The evidence.** UNPROVEN from this environment, and stated as unproven rather
than assumed either way. Every Supabase read tool available here is permission
denied: `execute_sql`, `list_tables`, `get_advisors` and
`generate_typescript_types` all refuse. Both affected routes are session gated,
and the only live channel this environment has,
`Vercel.web_fetch_vercel_url`, is unauthenticated and GET only, so neither
picker can be operated against the deployment. No schema read and no rendered
observation exists. What does exist is the repair: both selects were rewritten
to the pattern that is correct under either answer, which removes the user
consequence without settling the question.

**Its disposition in this package, which is the ruling Codex asked for.** It
stays recorded and does not become a corrective prelude. Codex named six
categories that would force it into PKG-A11Y-1 as a prelude: security,
authorization, privacy, unsupported figures, misleading publication and
irreversible data corruption. It is none of them. It writes nothing, publishes
nothing, exposes nothing and corrupts nothing; its worst case is a control that
returns an empty list on a session-gated screen. It is P2. And because the
repair already applied is correct whichever answer the schema gives, there is no
outcome that resolving it sooner changes. It is therefore left open in the
register, with its evidence class recorded as unproven, and it will close when a
schema read becomes possible rather than when someone decides it probably was
fine.

---

## 2. The six anti-overengineering fields, for the package as a whole

**User journey improved.** All four of the critical journeys Codex named, and
for one class of user the improvement is the difference between using the
product and not using it. A keyboard-only visitor could not clear a radio group,
could not reach the inventory table's scroll region, and on `/docs` had no link
of any kind to leave the page with. A screen-reader user was given the dashboard
navigation as an unnamed `<div>`, two `<h1>` on every dashboard page, identical
accessible names on every row of a table of different rows, and requirement
content that arrived after paint with nothing announcing it. A visitor who sets
a larger text size in their browser was given a type scale declared entirely in
px, which ignores that preference by construction.

**Observed problem or unavoidable foundation.** Observed, in every slice. The
55 P1 findings were found by the ELITE-4 manual pass in PKG-ELITE-E1 slice E and
recorded with file and line evidence before this package opened. Nothing here
was speculative work, and the thirteen findings raised during the package were
raised by checking the claims in the existing rows rather than by looking for
new territory.

**Measurable outcome expected.** Stated before the work, in the triage: 55 P1
findings reduce to 12 shared root causes plus 2 journey-specific defects, of
which 39 are accessibility findings at all. Counted after the work: 38 of those
39 are closed, 46 register rows in total carry this package in their status, and
open P1 falls from 55 to 19. The one that did not close, finding 170, did not
close because it is a content commitment and not a code change.

**Simplest acceptable implementation.** No new dependency was added in any
slice. No accessibility vendor, no component library, no automation harness, no
analytics SDK. The largest single change, slice C, converted 1073 font-size
declarations to rem and added nothing. Two probe scripts were written, and both
are plain Playwright scripts run against the Chromium already installed here.

**What will not be built.** Nothing on Codex's prohibited list was built. No
marketplace surface, no AI provider, no analytics vendor, no outbound
notification, no platform redesign. The parked visual-quality package stayed
parked, and three of the findings this package raised, 194, 195 and 202, were
deliberately recorded rather than fixed because fixing them belongs to that
package. Codex's instruction not to reduce visual quality to satisfy
accessibility was held: no contrast fix was made by greying a surface, and the
colour work split tokens rather than flattening them.

**The date or evidence that decides whether to continue.** Independent
verification. 22 of the 39 accessibility findings are fixed in code and
unverified by anything this environment can produce, and no amount of further
engineering changes that. The next evidence that moves this product is a screen
reader, a physical handset and a human reviewer, which is the same input the
design-partner round needs.

**Next highest-value action after this package.** Not another accessibility
package. The 17 findings that could be verified here are verified here; the
remaining 22 need people.

---

## 3. Finding triage

Full record in `docs/a11y-p1-triage.md`, written as slice B and corrected in
RC15. Read from the register at commit `7621724` by parsing the severity and
status columns rather than estimating.

| Quantity | Count |
| --- | --- |
| Findings recorded when the package opened | 192 |
| Open at that point | 111 |
| Open and P1 | 55 |
| Of the 55, not accessibility findings at all | 16 |
| Accessibility findings in scope | 39 |
| Shared root causes those 39 reduce to | 12 |
| Journey-specific defects that do not share a cause | 2 |
| Strict duplicates | 0 |
| Subsumed, closing as a consequence of a root cause | 10 |
| Verifiable in this environment | 17 |
| Requiring a device, a screen reader or human judgement | 22 |

The 16 that are not accessibility findings are named so nobody later reads "55
P1 accessibility findings": metadata and syndication, 13, 14, 15 and 32;
language and content quality, 16, 17, 19, 25, 29, 30, 31 and 45; claims and
figure precision, 20, 21 and 62; data quality, 117. Of these only 117 was taken
into the package, under Codex's allowance for reliability and data-quality work,
because a requirement silently recorded in the wrong city is a data-correctness
defect with a real user consequence.

**A correction belonging to the triage itself.** The original bucket-5 paragraph
said nine while the list beneath it named sixteen, and the arithmetic paragraph
then used a third number again. Three of its four figures were wrong. No work
was mis-ordered and no finding was mis-triaged, because every finding sat in the
bucket its own reasoning put it in; what was wrong was the total a reader would
quote. It is corrected at the source, in `docs/a11y-p1-triage.md`, with the
correction visible rather than the number quietly restated, and this handback
quotes the corrected figure.

---

## 4. Root-cause fixes, slice by slice

Codex asked for systemic causes before individual occurrences, and the order
below is the order the triage set, not the order the register listed.

| Slice | Commit | Root cause and what it closed | Findings closed |
| --- | --- | --- | --- |
| A | `7621724` | Record the O17 and O12 rulings, write the fourteen-item data-collection readiness record and the owner-ready recruitment sheet. No code | none |
| B | `beef75a` | RC1, the scalar colour override in `tailwind.config.ts` that made every numeric shade of 18 palette names compile to nothing. RC2, the charcoal opacity series. RC3, non-token greys and status colours. Plus finding 192, the untrue consent label, taken first as a corrective because it was a false statement shown to a user | 192, 50, 140, 150, 154, 166, 179 |
| C | `7dfca13` | RC4, the px type scale. Every step converted to rem, 1073 declarations across 95 files, and the Arabic size uplift restated in the same units so the two scales cannot disagree | 174, 27 |
| D | `7dfa5e7` | RC5, the coarse-pointer touch floor. The defect was the selector enumeration itself, not the one control it missed, so the enumeration was rewritten | 139, 26 |
| E, RC6 | `1853e92` | The dashboard shell. An `<aside>` with no `<nav>` and no name, `DashNav` rendering links in a plain `<div>`, and two `<h1>` per page. Three findings, one file region | 143, 161, 155 |
| F, RC7 | `8beeaf6` | Zoom and reflow. A fixed dimension where a content-driven one belongs, in three places, plus all 31 fixed `minmax` floors across 22 files converted to `minmax(min(100%, Npx), 1fr)` | 141, 158, 184 |
| G, RC8 | `abc3495` | Form group semantics. The systemic cause was two absent stylesheet rules, not four markup sites: there was no `fieldset` and no `legend` rule anywhere in `src/styles/`, which is what kept the group element looking like a visual change | 159, 157, 180, 181 |
| H | `69fc447` | The location combobox. Geocode suggestions given real combobox and listbox semantics rather than a styled list | 153, 196 |
| I | `72d04fa` | One of many is a radio. Chips using `aria-pressed` for a single-valued choice, and two groups claiming `role="radiogroup"` with no roving tabindex behind it | 182, 197, 198 |
| J | `d8de177` | Progress and step state. A step indicator carried by colour alone, and per-step state announced to a screen reader but written nowhere a sighted user could read it | 145, 156, 199 |
| K | `ededded` | Navigation, dialog, and the layout that decides which. View toggles exposing no current state, and a map announcing itself as a modal dialog whose backdrop was inert | 167, 200 |
| L | `a38c06e` | Content that arrives after the page does. Client-fetched requirement content landing outside any live region, and a panel destroying the focused control it had just been submitted from | 187, 201 |
| M | `fcb4388` | Names this codebase does not write. Map controls and lightbox controls whose accessible names are constructed by a library or an English literal and never switch with locale | 18, 160, 162 |
| N | `9fde67c` | Text nobody in this codebase wrote. User-supplied listing text declaring neither `lang` nor `dir`, and English leakage through the Arabic new-listing flow | 171, 22 |
| O, RC11 | `3cf25b4` | The box a wide region does not fit in. `display:block` dropping table semantics at phone widths, a scroll wrapper no keyboard could reach, and a table with no caption and no header scope | 148, 149, 168 |
| P, RC12 | `8e80dbe` | The motion CSS cannot reach, and the mark colour that alone carried meaning. Five explicit `behavior: "smooth"` sites routed through one helper read at call time, and the exact-building mark given a second, non-colour form | 164, 165 |
| Q, RC13 | `c6cad0e` | One switch deciding two questions. The chrome tier tables moved to `src/lib/chrome.ts` with a written reason per route, `/signup` falling to the marketing default, the release-state disclosure separated into its own slot rendered on every tier, and `/docs` given a link that leaves it | 147, 204, 205 |
| R, RC14 | `7aaab03` | A requirement is not filed in a city nobody stated. The `create_requirement` RPC's `coalesce(..., 'Riyadh')` replaced by a refusal carrying sqlstate 23514. Authored and checked in, NOT applied | none yet, 117 awaits the owner |
| RC15 | this commit | Record correction. Six register rows stale by eight slices, the triage arithmetic, the ledger and this handback | none |

Totals: 137 files changed across the package, 9168 insertions and 1502
deletions, 46 register rows closed, 13 findings raised of which 8 closed inside
the package.

**Three corrections that came out of measuring rather than assuming.** Finding
141's blast radius was one route and not two. Finding 158 is not an overflow
failure, because `1fr 1fr` squeezes rather than pushes when the inputs are
`width:100%`, so the fields become unusable and nothing is lost off-screen.
Finding 184 produces no horizontal scrolling at all, because `overflow-x:clip`
on `html` and `body` clips the excess and makes it unreachable, which is why
`scrollWidth - clientWidth` reports zero on every page of this site and why the
reflow probe measures per-item overhang instead. Finding 164's recorded
diagnosis was simply wrong: the installed maplibre-gl 4.7.1 already collapses
`flyTo` to `jumpTo` under `prefers-reduced-motion`, so the register row was
corrected rather than obeyed, and the real defect was five explicit smooth-scroll
calls that no CSS query can reach.

**One candidate fix dropped after measurement rather than shipped.** Rewriting
the comparison loading skeleton's `160px repeat(3, 1fr)` resolves identically at
all seven viewports in both directions, so it changes nothing and is recorded as
finding 195 for the visual-quality package instead of shipped as an
accessibility fix.

---

## 5. Affected journeys

Codex named four critical journeys and asked that they be prioritised. Findings
are listed under the journey where the defect is experienced. Seven root causes
are platform-wide and are listed separately, because they touch all four.

**Platform-wide, all four journeys.** 50, the dead numeric-shade classes whose
elements rendered with no colour of their own; 140, the charcoal opacity series;
174 and 27, the px type scale and its Arabic mobile consequence; 139 and 26, the
touch floor; 184, the minimum grid track at 400 percent zoom.

**Journey 1, authentication and organization onboarding.** 192, the consent
label promising a withdrawal with no route, control or channel. 141, the
authentication split pane pinned to `100vh` with a nested scroll region. 145,
the three-step signup progress stated by colour alone. 147, `/signup` classed as
an APP route so a signed-out visitor lost the header, the footer, the language
switch and the tab bar. 197, the signup organisation-type and role choices
declaring `role="radiogroup"` with no roving tabindex. 199, focus falling to
`document.body` when a step advance unmounted the button holding it. 204, the
release-state disclosure withheld from every APP-tier route. 205, `/docs`
rendering no links at all.

**Journey 2, Listing Studio and inventory management.** The largest count, which
is why the triage ordered it first among the journeys. 143, 161 and 155, the
dashboard shell's landmarks and heading outline. 154, the rail's section labels
at 3.77 to 1 on the dark rail. 150, Listing Studio helper text at the `/45`
step. 157, identical accessible names repeated across every row of per-row
selects. 158, hardcoded `1fr 1fr` tracks in the edit form. 148 and 149, the
inventory table losing its semantics at phone widths and its scroll region being
unreachable by keyboard. 153 and 196, the geocode suggestion list. 160, the
MapLibre container with no name and locale-blind built-in controls. 156, per-step
state announced but never written. 180 and 181, the attachment radio group and
the size inputs. 22, English leakage through the Arabic new-listing flow. 166,
the pending status dot at 3.64 to 1. 179, amber verdict text at 3.30 to 1.

**Journey 3, search, listing detail and Evidence Passport.** 18, map controls in
English inside Arabic. 164, the map flight animation out of CSS reach. 165,
district bubbles and building pins carrying the same fill and shape. 167, view
toggles exposing no current state. 168, the Insights table with no caption and
no header scope. 171, the listing description declaring neither `lang` nor
`dir`. 162, English lightbox control names. 200, the listings map announcing
itself as a modal dialog with an inert backdrop. 170 remains open here.

**Journey 4, requirement creation and matching.** 159, the contact-channel
checkbox group introduced by a bare `<label>`. 182, asset chips using
`aria-pressed` for a single-valued choice. 198, the viewing-slot rail and the
enquiry qualifying answers claiming `role="radiogroup"`. 187, client-fetched
requirement board and detail content arriving outside any live region. 201,
registering interest destroying the panel that held the focused submit button.
117, the requirement city, whose migration is authored and awaiting the owner.

---

## 6. Evidence classification

Codex required that evidence be classified into seven named classes and that no
WCAG 2.2 AA conformance be claimed from automation alone. **This package makes
no conformance claim of any kind.** Three of the seven classes are empty, and
they are the three that would be needed for one.

| Class | What is in it |
| --- | --- |
| **Automated** | The 1668-test suite, run in full before every slice shipped. `src/lib/palette.test.ts` recomputes every contrast ratio this package relied on from the declared token values, so a future edit that reintroduces a failing step fails the suite. `src/lib/chromeGate.test.ts` calls the tier classification rather than grepping it. `src/lib/requirementCity.test.ts` reads the standing SQL definition by its dollar tag. Plus `npx tsc --noEmit`, `npm run ar-lint` and `node scripts/prose-scan.mjs` |
| **Manually exercised** | The deployed HTML of `/en/listings` and `/ar/listings` at commit `7aaab03`, fetched and read in full: 619,197 and 608,254 characters respectively. Named attributes confirmed present, dead classes confirmed absent, anchor counts compared across locales. Also the compiled client chunks under `/_next/static/chunks/app/` for the routes whose source is a client component |
| **Browser-emulated** | `scripts/reflow-probe.mjs`, 14 renders across 7 viewports in both locales, and `scripts/radio-probe.mjs`, 5 groups in both locales at 390 pixels with `hasTouch` set so `@media (pointer: coarse)` matches. Both scripts state in their own output that they are browser emulated and not a device. `scripts/touch-probe.mjs` and `scripts/responsive-probe.mjs` are in the same class |
| **Tested on a physical device** | **Nothing.** No device exists in this environment |
| **Tested with an actual screen reader** | **Nothing.** No screen reader exists in this environment, in either language |
| **Independently audited** | **Nothing.** No accessibility specialist has reviewed any of it |
| **Awaiting independent verification** | 22 of the 39 accessibility findings. Listed in section 9 |

The distinction that matters most, and the one an automated pass will always
blur: a DOM assertion proves an attribute is present. Only a screen reader
proves what is spoken, and in the Arabic case only an Arabic screen reader
proves it is spoken in Arabic. Sixteen of these findings are defects in what is
spoken. Their fixes are real and their verification is owed.

---

## 7. English and Arabic live evidence

Production at package close is `satmarkets-5msvw3v3f-sat-markets.vercel.app`,
deployment `dpl_8wfQorDuSgikb34od8JG8ao7L7MM`, READY, commit `7aaab03`. Both
documents below were fetched from that deployment, not from a local build.

| Check | English, `/en/listings` | Arabic, `/ar/listings` |
| --- | --- | --- |
| Document element | `<html lang="en" dir="ltr">` | `<html lang="ar" dir="rtl">` |
| Title | Commercial spaces in Saudi Arabia \| SAT Markets | مساحات تجارية في السعودية \| سات ماركتس |
| Release-state notice present | Yes | Yes |
| `<header>` present | Yes | Yes |
| `<footer>` present | Yes | Yes |
| Mobile tab bar present | Yes | Yes |
| Anchors on the page | 136 | 136 |
| `aria-current="page"` | 2 | 2 |
| `role="status"` regions | 2 | 2 |
| Result counter | `<div role="status" aria-live="polite">88 spaces</div>` | `<div role="status" aria-live="polite">88 مساحة</div>` |
| `aria-haspopup="dialog"` on the map trigger | 1 | 1 |
| Western numerals in both locales | 88 | 88 |
| `text-red-600`, `text-slate-500`, `border-slate-200` | Absent | Absent |
| Charcoal opacity classes in the served document | `/70` and `/80` only | `/70` and `/80` only |
| `lang="en"` leaking into the Arabic document | not applicable | 0 occurrences |

Two of those rows are the direct live proof of specific findings. The absence of
`text-red-600`, `text-slate-500` and `border-slate-200` from the deployed
document is finding 50 closed on the deployment rather than in the config: those
classes compiled to nothing, and they are now gone rather than merely
overridden. The presence of only `/70` and `/80` charcoal steps, both above 6.6
to 1, is finding 140 closed the same way.

Anchor parity at 136 in both locales, with identical `aria-current`,
`role="status"` and `aria-haspopup` counts, is the evidence for SC 3.2.3
consistent navigation across the language switch, which is the property finding
147 broke on `/signup`.

Slice-specific live evidence for earlier slices was captured on the build each
one shipped on, and is recorded in that slice's section of `docs/roadmap.md`
rather than repeated here.

---

## 8. Viewport and assistive-technology evidence

**Viewport.** The reflow probe builds a static replica of the container chain
and measures per-item overhang, because `scrollWidth - clientWidth` is
structurally blind on this site: `html, body { max-width: 100%; overflow-x: clip }`
means excess is clipped and unreachable rather than scrollable. Clipped overflow
is not scrollable overflow, and reading the scroll width would report a pass on
a page that had lost content.

Measured at `7aaab03`, English and Arabic identical, and identical to the
baseline taken when slice F closed, which is the regression evidence:

| Viewport | edit-numbers | edit-contact | profile-links | req-stats | compare-skeleton | req-cards |
| --- | --- | --- | --- | --- | --- | --- |
| 320 x 256 and 320 x 900 | 1 col at 246 | 1 at 246 | 1 at 246 | 1 at 226 | 4 at 25.3 | 1 at 272 |
| 360 x 900 | 2 at 137 | 2 at 137 | 2 at 137 | 2 at 127 | 4 at 38.7 | 1 at 312 |
| 390 x 900 | 2 at 152 | 2 at 152 | 2 at 152 | 2 at 142 | 4 at 48.7 | 1 at 342 |
| 430 x 900 | 2 at 172 | 2 at 172 | 2 at 172 | 2 at 162 | 4 at 62 | 1 at 382 |
| 768 x 1024 | 2 at 327 | 2 at 327 | 2 at 327 | 2 at 331 | 4 at 160 | 2 at 352 |
| 1280 x 1024 | 2 at 583 | 2 at 583 | 2 at 583 | 2 at 331 | 4 at 160 | 3 at 349.3 |

320 x 256 is the arithmetic of 400 percent zoom on a 1280 x 1024 display, and it
is listed first because it is the case SC 1.4.10 is written about. Every region
collapses to a single column there, with no item overhanging its container.

**Assistive technology.** Emulated only, and the emulation is named as such. The
radio probe drives 5 groups in both locales at 390 pixels with `hasTouch: true`,
which is what makes `@media (pointer: coarse)` match, and checks arrow-key
movement, `tabindex` roving and the single tab stop each group should present.
It passes at 5 groups in both languages. Its own output says it is browser
emulated and is not a physical device and not a screen reader, so a reader of
the log cannot mistake it for one.

No screen reader ran. No handset was held. Both statements belong in this
section rather than in a footnote, because the sixteen findings in section 9
that are defects in what a screen reader says are, at this moment, fixed and
unverified.

---

## 9. Remaining independent-audit items

22 of the 39 accessibility findings are closed in code and awaiting independent
verification. They are recorded in `docs/status-ledger.md` section 9 as well, so
this is not the only place they exist.

**Needing an actual screen reader, 16 findings.** 143, 161, 155, 153, 157, 159,
180, 181, 167, 182, 187, 156, 160, 162, 168, 171. Everything whose defect is a
name, a role, a value or an announcement. What retires it: one session with NVDA
or JAWS in English and one with an Arabic screen reader, against the deployed
preview.

**Needing a physical device, 4 findings.** 26 and 139, touch target size, because
a CSS `min-height` is evidence that a rule exists and a Chromium viewport with
`hasTouch` is evidence that a media query matches, and neither is evidence that
a thumb reaches a control. 27, Arabic mobile reading size, for the same reason.
148, table semantics at phone widths, because an emulated narrow viewport is not
a phone. What retires it: a human with a handset.

**Needing independent human judgement, 2 findings.** 165, whether the non-colour
distinction between district bubbles and building pins is actually
distinguishable. 145, whether the non-colour step indicator reads as progress.
Both are non-colour distinctions in code now; whether they communicate is not a
measurement. What retires it: an independent reviewer, or the ELITE-1
design-partner sessions once recruitment is authorised.

**Still open rather than awaiting verification.** Finding 170, the listing
video's missing captions, is partially mitigated in this package: the video now
carries an accessible name and a plain statement that it has no captions. It is
not closed, because captions are a content and ingest commitment and writing an
empty track would be worse than the honest disclosure. Findings 193, 202 and 203
were raised during the package and remain open, and 194 and 195 belong to the
parked visual-quality package.

---

## 10. Gates and live deployment

Every slice ran the full gate before shipping, and no slice was closed on a
local result alone.

| Check | At package open, `7621724~1` | At package close, `7aaab03` |
| --- | --- | --- |
| `npx tsc --noEmit` | Clean | Clean |
| `npm test` | 1557 tests, 0 failing | 1668 tests, 0 failing |
| `npm run ar-lint` | Clean | Clean |
| `node scripts/prose-scan.mjs` | GATE 0 | GATE 0 in 0 files |
| `node scripts/reflow-probe.mjs` | Did not exist | PASS, 14 renders, both locales |
| `node scripts/radio-probe.mjs` | Did not exist | PASS, 5 groups, both locales |
| Em dashes in source | 0 | 0 |
| Vercel production build | READY | READY |

**The live deployment.** `dpl_8wfQorDuSgikb34od8JG8ao7L7MM`, READY, target
production, URL `satmarkets-5msvw3v3f-sat-markets.vercel.app`, build ready at
epoch ms 1785625695362, 69 seconds after build start. The commit was confirmed
by reading `meta.githubCommitSha` and matching it to `7aaab03`, not by reading
`readyState` alone, which is now written into the ledger's gate command set
because a READY build of the wrong commit is the easiest false pass available
here.

`npm run build` does not succeed in this container: four `next/font` calls
cannot reach Google Fonts through the egress proxy. The Vercel READY build is
therefore the production build evidence for every slice, which is why the gate
requires it rather than treating it as confirmation.

---

## 11. Owner actions and remaining blockers

| Item | Kind | What it holds |
| --- | --- | --- |
| Apply `supabase/migrations/20260801_requirement_city_is_never_assumed.sql` | Owner, database | Finding 117. The migration is authored, checked in and NOT applied: every Supabase write tool here is permission denied. `supabase/migrations/README.md` carries the two commands. Until it runs, the deployed function still defaults to Riyadh, and the register says so rather than claiming closure |
| Install `.github/workflows/arabic-font.yml` | Owner administrative | Delivered to the owner already. The deploy token carries no `workflow` scope. Owner ruling 6 says this must not stop engineering, and it has not |
| RLS advisories on `public.spatial_ref_sys` and `public.map_anchors` | Owner, database | Remediation is written and deliberately not auto-applied, because enabling RLS with no policies blocks all access, and `spatial_ref_sys` may be PostGIS extension-owned |
| Design-partner recruitment authorisation | Owner | The instrument and the one-page recruitment sheet are both ready. Decision date recorded as 1 October 2026 |
| **Independent accessibility verification** | People | The 22 findings in section 9, and any conformance statement about this product |
| O17, first-party behavioural collection | Owner and counsel | Unchanged. `COLLECTION_AUTHORISED = false`. The readiness record written in slice A is the input to that decision, not a substitute for it |
| O12, outbound notification | Owner and counsel | Unchanged. No external channel activated. The preference and consent model is prepared and shut |
| O10 to O16, contract 6, finding 74 | Owner and counsel | Unchanged by this package |
| No authenticated live channel, no database read | Environment | Every session-gated screen, which is most of journeys 1, 2 and 4. Finding 138's evidence sits here |

Nothing in this package purchased, licensed, contacted or committed to anything,
per owner ruling 7. No dataset was acquired. No vendor was approached.

---

## 12. Record corrections made in this package

Two defects in the record were found while assembling this handback, and both
are corrected at their source rather than restated correctly here and left wrong
where a reader would find them.

**Six register rows were stale by eight slices.** Findings 50, 140, 150, 154,
166 and 179 read "Open" or "Confirmed open, 3 of 155 fixed" for eight slices
after `beef75a` closed them. The fixes were real, shipped and live; the register
was not updated in the same commit, which is the practice the ledger's own
header requires. Verified against the source before correcting: zero numeric
shade classes anywhere in `src`, no `text-charcoal/35|40|45|55`, the rail label
at `#8A93A0` for 5.75 to 1 on `--ink`, and the amber token split into a
mark-only `#B7791F` at 3.64 to 1, which clears SC 1.4.11's 3 to 1 for a
graphical object, and a text-safe `#8A5A12` at 5.91 to 1 on paper. All six rows
now carry the correction, the arithmetic and the evidence class, and the ledger
records the process failure rather than the corrected number alone.

**The triage's arithmetic was wrong in three of four figures.** Corrected as
described in section 3.

Neither correction changed what was built. Both changed what the record would
have told the next reader, which is the part that outlives the package.

---

## 13. Canonical status ledger

`docs/status-ledger.md` is updated in the same commit as this handback and is
the authoritative current state. What moved:

Section 1, position, now names `7aaab03` as HEAD with the RC15 record commit
above it, the deployment and its verified commit SHA, the test suite at 1668,
and a gate command set that includes both probes and the requirement to check
`meta.githubCommitSha` rather than `readyState` alone. Section 2 lists all 18
PKG-A11Y-1 commits and points at this file. Section 5 carries the corrected
counts, 205 findings recorded, 126 closed, 79 not, with the severity table, an
explanation of what the 19 open P1 rows actually are, the rank-113 parse
correction, and the RC15 correction paragraph. Section 7 adds the pending
migration and corrects a row that had wrongly described finding 193 as a
migration awaiting the owner: it is not one, and no migration is authored for
it. Section 9 adds the three independent-verification blocks from section 9 of
this file. Section 10 records that the package ran eighteen slices without an
environment reclamation.

**One error in this handback's own drafting, recorded because the ledger's rule
applies to me.** An earlier draft of ledger section 7 asserted that finding 193
had a consent-withdrawal migration authored and awaiting the owner. It does not.
Finding 193 is open engineering work blocked on an owner question, which is how
a person who posted a requirement with no account and no session proves they are
that person. The row was corrected before shipping, and the mistake is recorded
here because a blocker list that invents a blocker is worse than one that is
short.

---

## 14. Next package

Codex asked that work continue on accessibility, reliability, security, data
quality and production readiness supported by evidence, and that no speculative
marketplace, AI, analytics or notification feature be added, while participants
are recruited. That constraint is unchanged and this package respected it.

What is owed, in order, and none of it is engineering:

1. Independent verification of the 22 findings in section 9. One screen-reader
   session in English, one in Arabic, one handset, one reviewer. Until then this
   product has 22 accessibility fixes and no accessibility evidence for them,
   and no conformance statement can be made.
2. Application of the requirement-city migration, which is the only thing
   standing between finding 117 and closure.
3. The design-partner recruitment authorisation, which is the same input the
   ELITE-1 instrument, the defect queue and the scorecard have all been waiting
   on since PKG-ELITE-E1 closed.

If Codex judges that one further engineering slice should run alongside
recruitment, the candidates with real evidence behind them are finding 203,
sixteen client sites rendering a server-composed English sentence to readers of
both languages, and finding 193, the requirement poster's consent withdrawal,
which needs the owner question answered before it can be built. Neither requires
a new surface and neither is speculative.
