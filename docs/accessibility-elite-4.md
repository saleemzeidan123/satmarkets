# ELITE-4 accessibility pass, PKG-ELITE-E1 slice E

Codex item 5 of PKG-ELITE-E1. A structured manual accessibility review of four
complete journeys, with the critical and high severity objective defects fixed
in the same slice.

## The six anti-overengineering fields

**User journey improved.** All four. A keyboard-only or screen-reader user could
not add a photo to a listing, could not press the availability reaffirm control
at all, could not escape the gallery lightbox, and could not reach a single map
pin. Each of those is a journey that ends rather than a journey that is awkward.

**Observed problem or unavoidable foundation.** Observed problem. The defects
below were found by reading the running source of the four journeys against the
ten dimensions Codex named. None of them was hypothesised in advance.

**Measurable outcome expected.** Independent task completion for a keyboard-only
participant in the ELITE-1 design-partner round. The instrument written in slice
D measures independent completion, time, errors, help requests and abandonment,
so the effect of this slice is measurable by the instrument that already exists
rather than by an assertion made here.

**Simplest acceptable implementation.** Native semantics wherever the platform
already provides them, ARIA only where it does not. No component library was
introduced, no automation vendor was added, and no visual redesign was made.
Four of the fixes are a single attribute; the largest is a focus trap.

**What will not be built.** No axe or automated accessibility harness in this
slice. No accessibility statement or conformance claim. No new tokens and no
colour sweep to chase contrast: the contrast defects are recorded, not repainted,
because a token change reaches every surface and belongs to the parked visual
package, not to a bug fix.

**The date or evidence that decides whether to continue.** The design-partner
round. If a keyboard-only or screen-reader participant still cannot complete a
core task, the remaining recorded defects are reprioritised on that evidence
rather than on their severity label here.

**Next highest-value action after this slice.** Implementation, specifically
slice F, the ELITE-8 event dictionary and scorecard. The accessibility pass has
produced a queue of recorded defects but no behavioural evidence about which of
them costs a real user a task. The scorecard is what turns the design-partner
round into that evidence, so it precedes any further remediation.

## Method, and the limits that shaped it

Three facts about this environment determined the method and are stated first,
because they bound every claim below.

1. **There is no accessibility automation anywhere in the repository.** No axe,
   no pa11y, no jest-axe, no Lighthouse step, no accessibility npm script. `e2e/`
   contains exactly two specs, `smoke.spec.ts` and `arabic-font.spec.ts`. The
   single automated accessibility assertion in the whole codebase was one line in
   `src/components/EvidencePassport.render.test.tsx`, and that line asserted the
   presence of an `aria-label` this pass removed as a defect, so it was inverted
   rather than kept.
2. **No development server is reachable inside this container.** A request to
   `http://localhost:3000/en/login` returns status 000. The sandbox egress proxy
   also blocks the deployment and the database directly.
3. **The only live channel is unauthenticated GET**, through
   `mcp__Vercel__web_fetch_vercel_url`. It cannot POST and cannot hold a session,
   so no session gated surface can be exercised end to end from here. Three of
   the four journeys are session gated for most of their length.

The consequence is stated plainly: **every finding in this pass was established
by reading the source.** Nothing was established by operating the product with a
keyboard, by listening to a screen reader, or by measuring a rendered contrast
ratio in a browser. Contrast figures below are computed from the token values in
`src/styles/sat-platform.css` and `tailwind.config.ts` against the stated
background, which is arithmetic on declared colours, not a measurement of paint.

## The five-way tested-by table Codex required

| How established | Count | What it covers |
| --- | --- | --- |
| Automatically tested | 0 | There is no accessibility automation in the repository. One caveat: `EvidencePassport.render.test.tsx` carried the only automated accessibility assertion, and this slice inverted it so the fix cannot regress. That is regression protection for one defect, not automated coverage of the pass. |
| Manually tested by Claude | 126 | All of them, by reading source against the ten dimensions. Two component test files were additionally executed: `EvidencePassport.render.test.tsx` (34 pass) and `src/lib/matching.test.ts` (26 pass, including the state-word test added here). |
| Tested on a real physical device | 0 | No device was available and none was used. No claim is made about iOS VoiceOver, Android TalkBack, or any physical keyboard. |
| Independently tested by a human accessibility specialist | 0 | No specialist has seen any of this. |
| Still awaiting verification | 126 | Every finding, fixed or recorded. A source-read fix is a plausible fix, not a verified one. Specifically awaiting: assistive-technology announcement of every added live region and every added name, actual focus order in a rendered document, real reflow at 200 and 400 percent, and measured contrast. |

**No independent WCAG conformance is claimed.** This document is a record of a
structured manual pass and its repairs. It is not a conformance statement, not a
VPAT, and not an accessibility statement. Success-criterion numbers appear below
only to name the rule a defect engages, never to assert that the rule is met.

## Scope

Four complete journeys, as named by Codex.

| Journey | Surfaces read |
| --- | --- |
| 1. Authentication and organization onboarding | `login/page.tsx`, `SignupFlow.tsx`, `ProfileForm.tsx`, `ChromeGate.tsx`, shared chrome |
| 2. Listing Studio and inventory management | `ListingStudio.tsx`, `EditListingForm.tsx`, `ListingMediaManager.tsx`, `ListingDocsManager.tsx`, `LocationPicker.tsx`, `AvailabilityReaffirm.tsx`, `ListingStatusToggle.tsx`, `dashboard/listings/page.tsx` |
| 3. Search, listing detail and Evidence Passport | `listings/page.tsx`, `listings/[id]/page.tsx`, `FilterBar.tsx`, `Gallery.tsx`, `ListingsMap.tsx`, `EvidencePassport.tsx`, `ProvenanceChip.tsx`, `ListingEnquiry.tsx`, `ReportListing.tsx`, `Header.tsx`, `LocationFacts.tsx` |
| 4. Requirement creation and matching | `post-requirement/RequirementForm.tsx`, `requirements/[id]/page.tsx`, `dashboard/requirements/page.tsx`, `matching.ts` |

## Inventory

| Journey | Critical | High | Medium | Low | Cosmetic | Total |
| --- | --- | --- | --- | --- | --- | --- |
| 1. Authentication and onboarding | 0 | 7 | 12 | 11 | 0 | 30 |
| 2. Listing Studio and inventory | 2 | 9 | 14 | 4 | 0 | 29 |
| 3. Search, detail and passport | 4 | 19 | 16 | 3 | 2 | 44 |
| 4. Requirement and matching | 1 | 6 | 10 | 5 | 1 | 23 |
| **Total** | **7** | **41** | **52** | **23** | **3** | **126** |

**Fixed in this slice: all 7 critical and all 41 high, 48 defects.** Recorded and
not fixed: 78, every medium, low and cosmetic. The split is exactly the one
Codex set: "Fix objective critical and high-severity defects found during this
pass." Recording the rest is not deferral by preference; a token change or a
table-semantics rewrite reaches surfaces this slice did not audit, and the
scorecard in slice F is what should decide their order.

## The ten dimensions

| Dimension | Result |
| --- | --- |
| Keyboard-only operation | 4 critical defects, all fixed. A `display:none` file input, a control sitting under a full-row link overlay, a lightbox with no escape, and a canvas-only map with no keyboard path to any pin. |
| Focus visibility and order | 1 critical, fixed centrally. `.input:focus{outline:none}` at specificity (0,2,0) beat the platform `input:focus-visible` rule at (0,1,1), so every text control in the requirement form and the signup flow had a 1.17:1 box-shadow as its only focus affordance. Focus order itself was clean; focus movement after step changes and after success was not, and is now managed in six places. |
| Screen-reader semantics and announcements | The largest category. Unlabelled inputs across five files, decorative SVG glyphs polluting every control name, three label-in-name violations, chip groups with no group semantics, and no live region on any client-fetched result. |
| Validation and error recovery | 2 high, fixed. Errors that were colour-only, errors with no `role="alert"`, and one error sentence that was destroyed by a state reset in the same React batch before it could render. |
| 200 and 400 percent zoom or reflow | Clean on journey 3. Three medium defects recorded elsewhere: a `min-height:100vh` split pane that nests a scroll region, a hardcoded `1fr 1fr` grid, and a 320px fixed track. |
| Contrast and non-color meaning | No critical or high. Recorded, all figures arithmetic on declared token values rather than measurements of paint: the `text-charcoal/35|40|45|55` series at 2.22, 2.53, 2.93 and 3.96 to 1 composited over white; `--amber` `#B7791F` at 3.64:1 on white for a status dot and 3.30:1 on `#FBF3E3` for verdict text; `#6B7480` navigation labels at 3.77:1 on `--ink`. Non-colour meaning was fixed where it blocked a task: save success and failure now differ by a textual tag, and every match dimension now carries its state as a word rather than as a glyph alone. |
| Reduced motion | Clean in all four journeys. The blanket `*,*::before,*::after` override at `globals.css:247`, the `--motion-scale` and `--dur-*` zeroing at `sat-platform.css:99`, and per-keyframe opt-outs cover the CSS surface. One exception recorded: the JavaScript `flyTo({duration:650})` at `ListingsMap.tsx:125`, which no CSS media query can reach. |
| 44px SAT touch-target floor | 2 medium, fixed centrally. The coarse-pointer floor at `sat-platform.css:661` lists buttons, chips, tabs, selects and summaries but not `input` and not a bare `label`, so checkboxes and radios sat at the roughly 13px user-agent default. The save-blocking marketing-right confirmation in Listing Studio and the listing attachment radio on a requirement were both below the floor. |
| Arabic and mixed-direction output | Every string added in this slice exists in both languages, either in the dictionary or in a component-local bilingual object in the file's existing style. Recorded and not fixed: physical `margin-left` in the dashboard rail, physical `text-align:left` in `table.dt` and on geocode results, un-inverted RTL arrow keys in the lightbox, an unflipped arrow icon, English-only MapLibre control labels, and a description paragraph carrying no `lang` or `dir`. |
| Charts, maps and evidence alternatives | 2 critical on the map, both fixed: the search-area control and every pin now have a non-canvas path. Clean on the detail-page location block, where `LocationFacts.tsx:192` already carries `role="img"` and every mapped fact is present as text. Clean on journey 4, which has no raster image, canvas or chart at all and states match evidence as a text list of named dimensions by design. |

## What was fixed

### Shared and central

Four changes were made ahead of everything else, because they are the root of
defects that appear in more than one journey.

- `src/styles/globals.css`, the focus-indicator suppression. `.input:focus` no
  longer sets `outline:none`; a `.input:focus-visible` rule restores a 2px azure
  outline at a specificity that holds. The tinted border and shadow remain as
  decoration.
- `src/styles/globals.css`, a `.field-err` rule. The class was referenced by the
  requirement form and defined nowhere in the repository, so a validation message
  rendered identically to the helper hint beside it.
- `src/styles/globals.css`, the coarse-pointer floor for `input[type=checkbox]`,
  `input[type=radio]` and any `label` wrapping one.
- `src/components/satkit.tsx`, the shared `Ic` icon wrapper. Every decorative
  glyph on every surface now carries `aria-hidden="true"` and `focusable="false"`
  instead of adding noise to the name of the control it sits inside.

### Journey 1, authentication and organization onboarding

Six of the six controls in `ProfileForm.tsx` gained an `id` and a matching
`htmlFor`; the public email and public phone fields had no programmatic name at
all before this. `SignupFlow.tsx` had its single `field()` helper split into
three, so a plain field emits a real `label`, a multi-select chip row is wrapped
in `fieldset` and `legend`, and a single-choice group owns its own `fieldset`.
The ARIA pattern was decided from the state shape rather than from appearance:
`sel()` writes one value per key, so size, timeline, portfolio, docs and ticket
are `role="radio"` inside `role="radiogroup"`; the asset and investor-focus chips
call `toggleChip`, which adds to and removes from an array, so they are
`aria-pressed` with no radiogroup wrapper. The FAL field now carries
`aria-invalid` and points `aria-describedby` at whichever of the hint or the
error is actually rendered, so no dangling id reference is created. Submit
failure is `role="alert"`, and both success panels, signup and login, receive
focus and are announced.

### Journey 2, Listing Studio and inventory management

Two critical defects. The photo, floor-plan and brochure file inputs were
`display:none`, which removes them from the tab order entirely, so a keyboard
user could not add media to a listing at any point; each is now visually hidden
but focusable, with a real label association and a focus ring painted on the
wrapping label since a 1px-clipped input cannot show its own. Separately, the
"Still available today" control on the dashboard list sat underneath the
full-row link overlay that `a.rowlink::after` paints at `z-index:0`, so pressing
it navigated to the detail page instead of reaffirming availability; it is now
inside the `.rowact` wrapper that lifts to `z-index:1`.

Beyond those: every `disabled` attribute that a request could set was converted
to `aria-disabled` plus an early-return guard, so the control keeps its place in
the tab order and can still be found and announced while it is busy; buttons
that repeated the same name for every row now carry their position; the step
heading receives focus when the studio moves between steps; and every gated
field carries `aria-invalid` and `aria-required` derived from the same blocking
check that drives the visible message.

One latent bug was found in the course of that last item and is worth naming.
`save()` called `setError(msg)` and then `go(target)`, and `go()` cleared the
error unconditionally in the same React batch, so the sentence was destroyed
before it could render. `go()` now takes a `keepError` parameter and all three
error-then-navigate sites pass it. Without that repair the entire validation fix
would have been decorative.

### Journey 3, search, listing detail and Evidence Passport

Four critical defects. The gallery lightbox was a `role`-less overlay with no
focus trap and no way back: it is now `role="dialog" aria-modal="true"` with an
accessible name, Tab is trapped, focus moves to Close on open and returns to the
exact thumbnail that opened it. The lightbox image had no alt text and its
counter did not announce: both fixed. The map exposed its entire content only
through a canvas: a visually hidden block now lists every district as a button
and every pin as a link to its listing, driving the same selection and
navigation path a canvas click drives. And "Search this area" was conditionally
rendered, so it appeared and vanished without announcement: it is now always
present with `aria-disabled` and a visual dim.

Three label-in-name violations were fixed by removing the `aria-label` that was
overriding visible text rather than by rewriting the visible text: on the
passport `summary`, on `ProvenanceChip`, and implicitly wherever the icon wrapper
change removed a glyph from a name. The filter panel gained `aria-haspopup`,
`aria-controls`, real `menuitemradio` and `checkbox` semantics with the tick and
the fake checkbox marked decorative, focus return to the owning pill on close,
and names for four previously unlabelled free-text inputs. The result count is
now a polite live region.

The Share affordance on the listing detail page was **removed rather than
implemented**. It was a non-interactive `span` styled as a chip, so it read as a
control and did nothing. Inventing a share behaviour in an accessibility pass
would have been a feature, and Codex item 7 forbids feature expansion in this
package, so the false affordance is gone and a comment records why. The
consequence is that `ld.share` is now an unused dictionary key, left in place.

### Journey 4, requirement creation and matching

The critical defect was the focus-indicator suppression, fixed centrally and
then removed at its two local sources, the `inp` constants in the requirement
form and in the requirement detail page. The interest message textarea gained a
visible label. The response panel toggle gained `aria-expanded` and
`aria-controls`. The match list gained a polite live region and, for the first
time, a stated failure: a failed fetch previously left an empty panel, which
reads as "you have no listings" rather than as a request that did not complete.
Consent is now a validated field with its own error and its own place in the
focus order. And every match dimension now announces its state as a word,
through a new `stateLabel` export in `src/lib/matching.ts`, because the `✓ ~ ? ×`
glyphs beside each dimension are the only thing a screen reader had, and two of
them are punctuation a screen reader may skip entirely.

## Deliberate deviations from the audit's own proposals

Recorded because each one is a case where doing what the finding said would have
been wrong.

- **`role="img"` was rejected on `ProvenanceChip`.** That role makes contents
  presentational, and the description text does not contain the visible tier
  text, so applying it would have created exactly the label-in-name defect the
  neighbouring finding reports, on chips that render inside the passport summary.
  Visually hidden supplementary text was used instead.
- **`role="menu"` was rejected twice**, on the filter panel and the header
  popup. The filter panel contains free-text inputs and the header popup contains
  headings, arbitrary links and the language switch, none of which are valid
  children of a `menu`. Both are `role="group"`.
- **`role="radiogroup"` was not put on the signup `fieldset`.** Overriding the
  native role of a `fieldset` does not reliably preserve the `legend` as the
  group name, so the legend carries an id and the inner chip row is the
  radiogroup, labelled by it.
- **The 401 and 403 branch of the matches fetch still renders nothing.** The
  file's own comment states that a permission answer must not read as a failure.
  Only the network `.catch` path now speaks.
- **An empty locations list is not pinned to a field.** It is not user
  controllable, and pointing the focus-first helper at an element that is not
  rendered would trap the user rather than help them, so it is stated in the
  form-level alert.
- **`ListingStatusToggle`'s new failure string is an optional prop.** A second
  call site outside the fixing agent's ownership also renders that component, so
  the prop falls back rather than breaking a caller it did not own.
- **`docs` was not the place for a token change.** Every contrast defect is
  recorded and none is repainted, because the tokens involved reach surfaces this
  pass did not read.

## What was recorded and not fixed

54 of the 78 medium, low and cosmetic defects are entered in
`docs/findings-register.md` as findings 139 to 192. Each entry names the file and
line at which it was re-verified against the shipped source, states the rule it
engages without asserting conformance, and states why it was not fixed in this
slice.

The gap is stated rather than smoothed over. The four per-journey audits were
carried out in a working context that was compacted before the register was
written, and 24 of the lower-severity items did not survive that compaction with
enough precision to be restated truthfully. Inventing plausible entries to reach
78 would have been worse than recording 54 and saying so. The journey totals in
the inventory table above come from the per-journey audit tallies, which did
survive; the missing 24 are all medium, low or cosmetic, and none is a
keyboard-blocking or name-missing defect, because every defect of those two
kinds was graded critical or high and is therefore fixed. Recovering them means
re-reading the same four journeys for medium and below, which is cheaper after
the design-partner round has said which dimensions actually cost a user a task.

Nine of the 54 corrected the description they came from. The re-verification
found that the table-semantics breakpoint is 920px and not 1024px; that the
`.tabbar` items are not in fact below the touch floor, only the bar's viewport
consumption is a defect; that the Listing Studio step state is missing for
sighted users on the steps that are not open, which is the inverse of how it was
first written; that the gallery control names are bare inline literals rather
than a bilingual object, and that the component receives no locale at all; that
the passport already uses a `<dl>` for its provenance rows and only the
verification and permissions blocks do not; that the heart glyph is already out
of every accessible name and the real residual is that the card carries no save
control; that the fake tab strip is an anchor and a cross-route link wearing tab
styling, so tab roles would be the wrong remedy; that the attachment radios are
label wrapped and therefore reached by the new central rule, leaving only its
`:has()` and breakpoint dependence; and that the matches live region shipped,
leaving two other client-fetched instances. Three quoted contrast figures were
recomputed and are lower or higher than first recorded. Those corrections are the
reason the entries were re-verified against source rather than transcribed.

## Gate evidence for this slice

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | Clean |
| `npm test` | 1527 pass, 0 fail |
| `npm run ar-lint` | Clean |
| `node scripts/prose-scan.mjs` | GATE 0 hardcoded prose strings in 0 files |
| Vercel production build | Recorded in `docs/status-ledger.md` for the slice commit |

Two strings added during the fixes were initially written into the requirement
detail page as a component-local bilingual object. That is the pattern several
components use, but this file is a public page, so the prose gate flagged all
four literals. Both strings were moved into `reqDetail` in both dictionaries and
the page now reads them like every other string on it.
