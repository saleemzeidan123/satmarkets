# PKG-A11Y-1: triage of the 55 open P1 findings

Read from `docs/findings-register.md` at commit `7621724` by parsing the severity
and status columns, not estimated. 192 findings recorded, 111 open, 55 of them P1.
Every number below is a count of rows, and every row referenced here is in the
register with its own file and line evidence.

## The six fields

**User journey improved.** All four critical journeys, because the triage decides
the order in which they get fixed. On its own it improves nothing, which is why
it is one document and not a package.

**Observed problem or unavoidable foundation.** Observed. 55 P1 rows is more than
one package can hold, and the register lists them in discovery order, which is the
order that produces the most duplicated work. Several of the 55 are the same
defect seen from different surfaces.

**Measurable outcome expected.** The number of distinct code changes required to
close 55 findings, stated before the work rather than counted after it. The
triage below reduces 55 findings to 12 root causes plus 9 findings that are not
accessibility defects at all.

**Simplest acceptable implementation.** This file. No tooling, no register
schema change, no new severity system.

**What will not be built.** No automated accessibility harness in this slice.
No re-audit of the 81 closed findings. No reopening of the 50 P2 rows.

**The date or evidence that decides whether to continue.** The root-cause fixes
themselves. If fixing a root cause does not close the findings assigned to it,
the grouping was wrong and the remaining findings return to the register as
unique defects.

**Next highest value action.** Implementation. The triage is the last document
before code in this package.

## Bucket 1: shared component and design-token root causes

These are the ones worth doing first, because each one is a single change that
closes several findings and, more importantly, prevents the next occurrence.

**RC1. The scalar colour override, finding 50.** `tailwind.config.ts` assigns a
scalar hex to 18 palette names under `theme.extend.colors`, which replaces
Tailwind's palette object of the same name instead of extending it. Every numeric
shade of those 18 names stops existing, and 152 remaining classes across 5 files
are dropped at build time. This is not only a colour defect: an element whose text
colour class compiles to nothing inherits whatever is above it, so the contrast of
those elements is unknown rather than merely low. It is listed first because
several colour findings cannot be verified until it is closed.

**RC2. The charcoal opacity series, findings 140 and 150.** `text-charcoal/35`,
`/40`, `/45` and `/55` composite over white to roughly 2.22, 2.53, 2.93 and 3.96
to 1, all on text below 18.66px. 150 is the same defect at `/45` in Listing
Studio helper text. One token decision closes both, and it is a token decision
rather than a repaint: the requirement is a muted-text token that is muted and
also passes, not a lighter grey applied more carefully.

**RC3. Non-token greys and status colours, findings 154, 166 and 179.** The
dashboard rail's `#6B7480` on the dark rail at 3.77 to 1, the pending status dot
at 3.64 to 1, and amber verdict text on its own wash at 3.30 to 1. Same class of
defect as RC2 but on the status palette rather than the text palette, so it needs
its own decision: a status colour also carries meaning, and 165 below says colour
may not be the only carrier.

**RC4. The px type scale, findings 174 and 27.** Every step of the scale is a px
literal at `globals.css:414` to `416`, the right-to-left overrides restate the
same scale in px at line 122, and three journey surfaces set bare React number
font sizes which serialise as px. A px size does not answer a browser text-size
preference. 27 is the Arabic mobile consequence of the same cause. This must be
converted wholesale or not at all, because a partial conversion leaves two scales
disagreeing.

**RC5. The coarse-pointer touch floor, findings 139 and 26.** The floor at
`sat-platform.css:660` to `663` enumerates selectors and does not list `.lang-seg`
or a bare anchor, so the header language control resolves to roughly 23 to 26px.
The systemic fix is the enumeration itself, not the one control.

**RC6. The dashboard shell, findings 143, 161 and 155.** An `<aside>` with no
`<nav>` and no accessible name; `DashNav` rendering its links in a plain `<div>`;
and two `<h1>` on every dashboard page, one from the shell and one from the page.
Three findings, one file region, one fix.

**RC7. Zoom and reflow, findings 141, 158 and 184.** The auth split pane pinned to
`100vh` with a nested scroll region at 400 percent; hardcoded `1fr 1fr` tracks in
the edit form that never collapse; and a 320px minimum grid track that overflows a
400 percent viewport. Same cause in three places: a fixed dimension where a
content-driven one belongs.

Closed in slice F. Three corrections came out of measuring it, all carried into the
register. Finding 141's blast radius was one route and not two: `auth-split` has a
single consumer, `signup/page.tsx:17`, and login uses a different shell entirely.
Finding 158 is not an overflow failure: `1fr 1fr` squeezes rather than pushes here,
because the inputs are `width:100%`, so the fields become unusably narrow and
nothing is lost. Finding 184 does not produce horizontal scrolling: `overflow-x:clip`
on `html` and `body` means the excess is clipped and unreachable instead, which is
why `scrollWidth - clientWidth` reports zero on every page of this site and why
`scripts/reflow-probe.mjs` measures per-item overhang instead. 184 was also a pattern
rather than a line, so all 31 fixed `minmax` floors across 22 files were converted.
One candidate fix was dropped after measurement rather than shipped: rewriting the
comparison loading skeleton's `160px repeat(3, 1fr)` resolves identically at all seven
viewports in both directions, so it is recorded as finding 195 instead.

**RC8. Form group semantics, findings 159, 157, 180, 181 and 153.** A bare
`<label>` where a `<fieldset>` and `<legend>` belong; identical accessible names
across per-row selects; a radio group that cannot be cleared and has no accessible
name; size inputs whose visible label and accessible name share no words; and a
geocode result list with no combobox or listbox semantics. Five findings, one
pattern: the group is drawn visually and never expressed structurally.

Closed in slice G, four of the five. The systemic cause turned out to be two
missing stylesheet rules rather than four markup sites. There was no `fieldset`
rule and no `legend` rule anywhere in `src/styles/`, which is what made the group
element look like a visual change and kept it deferred. It is not one: Tailwind
preflight, loaded at `globals.css:1`, already zeroes fieldset margin, padding and
border, so the box was inert all along. What preflight does not reset is
`min-inline-size: min-content`, a user-agent default unique to fieldset that stops
the element shrinking below its content, which is RC7's property again and would
have turned an accessibility fix into a reflow defect at 400 percent zoom.
`fieldset{min-inline-size:0}` handles it once for the platform. The second rule,
`.field legend` matching `.field label`, is the other half of Codex's instruction
not to reduce visual quality to satisfy accessibility, and it deliberately also
corrects three legends in `RequirementForm.tsx` that had been rendering at body
size beside 0.75rem siblings since they were written, which no finding had caught.

Three corrections came out of the work. Finding 157's deferral treated row index,
file name and `aria-labelledby` as three alternatives needing participant evidence
to choose between; they are complements, and the objection raised against each is
answered by another, so index plus name settles it without a research round.
Finding 180 is two defects and not one: the unreachable clearing branch is real,
but a radio group with no attach-nothing member is incomplete even if that branch
had worked, because a toggle was written into a control type that has no toggle
semantics. Finding 181 is a defect and not a pattern, proven by an `src`-wide
sweep for a visible label overridden by a differing `aria-label`, which found one
site pair and no other.

Finding 153 is split out to slice H. It is the only bare `<label>` left anywhere
in the four critical journeys and is exempted by name, with its reason, in
`src/lib/formGroups.test.ts`, so the guard passes without forgetting it: there is
no control for that caption to point at until `LocationPicker` grows managed
option ids, `aria-activedescendant` and direction-aware arrow keys.

A note on line drift. The two new stylesheet rules moved every line below them,
which the RC7 guard's exemption audit caught immediately by design. The pointers
inside `reflow.test.ts` and `scripts/reflow-probe.mjs` were re-aimed, and the
comment stripper in the new guard was changed to preserve line count so its
exemption keys stay equal to real file line numbers. Finding 184's closure note in
the register still quotes `sat-platform.css:617`, `:682`, `:687` and `:688`, which
were correct when written and are now `:622`, `:687`, `:692` and `:693`; the
closure record is left as written rather than retrofitted, and this paragraph is
the correction.

Closed in slice H, the fifth. Finding 153 was the survivor, and the reason it
survived is worth keeping: a caption cannot be attached to a set of controls that
are not a set. `LocationPicker` is a search box, a map, a latitude and a longitude,
so there was never a `htmlFor` to write, and a legend over controls that announce
nothing is a named box around silence. Slice H built the APG combobox first: the
input carries `role="combobox"`, `aria-expanded`, `aria-controls`,
`aria-autocomplete` and `aria-activedescendant`, the results are a listbox of
options rather than a run of buttons, and an always-present polite status region
says the list appeared. Only then did the two captions become legends, at
`EditListingForm.tsx:357` and `ListingStudio.tsx:703`.

Three decisions inside that work are design positions rather than mechanics. The
options are `<li>` and not `<button>`, because focus stays in the input and the
active option is named, so a focusable option would put the same choice in the tab
order twice and pull the caret out of the box being typed in; the pointer path uses
`onMouseDown` so it fires before blur and lands in the same call the keyboard uses.
The finding asked for arrow keys that respect direction, and the honest answer is
that a vertically stacked list has no direction: Down, Up, Home and End are correct
unchanged in both languages, and the direction-aware part is refusing to intercept
Left and Right, which move the caret, already reverse themselves under RTL, and
would break ordinary Arabic editing if taken. And `aria-invalid` was dropped from
the Studio group rather than carried over, because it is not supported on
`role="group"`; it was equally inert on the `<div>` it used to sit on, so the group
now carries only the `aria-describedby` that points at the error naming it.

Building the combobox exposed one defect that the old markup had been hiding, filed
as finding 196 and fixed in the same slice: choosing a suggestion writes its label
back into the search box, which retriggers the debounced query and reopens the list
on the item just chosen. Untidy under a div of buttons; under a live region it
re-announces a list the lister did not ask for, immediately after their choice was
taken. A `chosen` ref suppresses that one echo and is released on the next
keystroke, so typing the same string again still searches.

`BARE_LABEL_EXEMPT` is now empty, and that is the point of keeping the map in the
guard rather than deleting the mechanism. An exemption is a debt with a name on it,
not a permanent category. `LocationPicker.tsx` also joined the guard's `JOURNEYS`
list, so the component is scanned rather than merely excused. The reflow probe was
re-run after two more div-to-fieldset conversions and returned track widths
numerically identical to the RC7 baseline at all fourteen renders, which is the
evidence that the semantic change moved no layout, and therefore that the RC8
instruction not to trade visual quality for accessibility was honoured rather than
asserted.

**RC9. State and announcement, findings 167, 182, 187, 156 and 145.** View toggles
exposing no current or pressed state; `aria-pressed` misused for a single-valued
choice; client-fetched requirement content arriving outside any live region;
Listing Studio per-step state announced but not visible; and a signup step stated
by colour alone. The unifying defect is that state is expressed to one audience
and not the other, in both directions.

Closed in slice I, the one-of-many half of RC9. RC9 was scoped by root cause
rather than by finding, and the first cut through it is the distinction between a
control that expresses a choice and a control that expresses a status. Finding
182 is the first kind. Findings 145, 156, 167 and 187 are the second, and they
are left to slices RC9b, RC9c and RC9d because reconciling them means deciding
what the visible state should be, not correcting a control that already exists.

The finding named one site. The scan found four. `aria-pressed` on the asset
chips was what 182 reported, and a repository-wide search for the class it
belongs to returned three more: `SignupFlow.tsx:45-47`, and
`ListingEnquiry.tsx:280-282` and `:294-296`. Those three were not mislabelled the
way 182 was. They declared `role="radiogroup"` and `role="radio"` correctly and
then failed to implement what those roles promise, which is worse than saying the
wrong thing, because a keyboard user who trusts the role presses the arrow keys
and nothing moves. Each rebuild had lost a different piece. 182 lost the mutual
exclusion from the accessibility tree while keeping it in the state. 197 lost the
roving tabindex and the arrow keys. 198 lost those and also added a deselect that
a radio cannot do, and named itself twice. Four sites, one cause, four different
symptoms, which is precisely the shape Codex's instruction to fix systemic causes
before individual occurrences is aimed at.

The register's reason for deferring 182 was wrong, and correcting it is the most
useful thing in this slice. It read that converting to `role="radio"` inside a
`role="radiogroup"` "also requires roving tabindex and arrow-key handling to be
written, which is a structural rewrite larger than a bug fix." That is an
accurate description of the cost of the ARIA authoring pattern and an inaccurate
description of the work, because the ARIA pattern is not the control this needed.
A native `<input type="radio">` inside the existing label supplies roving
tabindex, arrow keys, wrapping, direction-correct horizontal arrows, form
participation and the impossibility of clearing a chosen option, and none of it
has to be written. The proof that this was available rather than merely arguable
is that it was already three lines below the defect in the same file: the
transaction-type control at `RequirementForm.tsx:296` has been exactly this
since the deal-type and timeline selectors were converted from `<span onClick>`,
and the technique is written down in the comment on `.sronly` at
`globals.css:498`. The deferral priced the pattern it was looking at instead of
the one already shipping one screen down. Three further sites were built the same
way in the interval.

The deselect was removed rather than reproduced, and that is a deliberate
behaviour change. Both ListingEnquiry groups let a second press on the chosen
option clear it, which is a real affordance and not obviously a bug: a person who
picked the wrong viewing slot might reasonably want to unpick it. It is still
wrong here, because it was unannounced, undiscoverable, and contradicted the role
the control claimed. If an explicit no-preference state is wanted it belongs in
the group as an option with a written label, where it can be reached by the same
arrow keys as everything else. Two guard tests assert the exact former handler
text is gone, because this is the kind of thing that returns quietly.

One CSS rule was added, and it is the reason this conversion did not trade one
failure for another. The input is `.sronly`, a one pixel clipped box at margin
-1px, so the browser draws its focus ring somewhere nobody can see. Converting
the chips without `.chip:has(input:focus-visible)` at `sat-platform.css:161`
would have fixed SC 4.1.2 by breaking SC 2.4.7. The rule is copied from
`.seg label:has(input:focus-visible)` at `:223`, which is the same solution the
`.seg` conversion had already found, so the fix is a second use of a settled
answer rather than a new invention.

None of that would be evidence if it were only reasoned about. `aria-pressed` was
wrong on those chips for as long as it was, and the three `role="radiogroup"`
sites were built after the correct control already existed in the codebase,
because in both cases somebody made a claim about behaviour without rendering
it. So the claim is measured: `scripts/radio-probe.mjs` builds the five groups
from the shipped markup with the shipped stylesheet, renders them under a coarse
pointer at 390 wide in both directions, and presses the keys. Twenty-four options
across five groups are six tab stops. ArrowDown walks and wraps; ArrowUp steps
back. ArrowRight advances in `ltr` and retreats in `rtl`, which is the one part
of the contract that depends on writing direction and the part every hand-built
group here would have had to code and none did. Two presses of Space on the
chosen option leave it chosen. The label carries a 2px `rgb(58, 110, 165)` ring.
The smallest target is 48 by 60 in Arabic and 49.5 by 58 in English, both above
the 44px SAT floor. The already-correct `.seg` group is in the probe as a control
row, so a future failure is attributable: if every row fails the stylesheet
moved, and if only the chip rows fail this slice did.

Visual quality was not traded for any of this, and the evidence is the same
non-regression the earlier slices used. `scripts/reflow-probe.mjs` returns the
identical fourteen rows and identical track widths it returned at the RC7 and RC8
baselines, `edit-numbers=1@246 edit-contact=1@246 profile-links=1@246
req-stats=1@226 compare-skeleton=4@25.3 req-cards=1@272` at the 400 percent
reference, so replacing four `<button>` groups with `<label>` groups moved no
layout. The chips keep `.chip` and `.chip.on`. Nothing about the design changed
except that it now works from a keyboard.

*Closed in slice J, the progress-and-step-state half of RC9.* Findings 145 and
156, plus finding 199 found while fixing 145.

The register had deferred both of these for the same stated reason, that the
remedy was a choice about the shape of onboarding rather than a defect with one
obvious repair, and that no participant evidence about how people actually read
these surfaces was available. That reasoning was half right and it is worth
saying which half, because the same reasoning is what deferred finding 182 into
four sites. It was right that neither finding named its own fix. It was wrong
that the fix therefore needed evidence this environment could not obtain,
because the register had already written down the answer in the same sentence
that deferred it: Listing Studio solves this problem, one panel above the rail
that fails it, with a `Step 2 of 7` line and a `3 of 9 facts supplied` line.
Reconciling a broken surface with a working one in the same product is not a
matter of taste and does not need a participant to authorise it.

So both fixes adopt the phrasing that already exists rather than inventing a
second vocabulary for the same idea.

*Finding 145, signup.* Three bare `<span>` bars, 4 pixels tall, no content, the
only difference between done and pending being `--harbor` against `--silver`.
Nothing in the accessibility tree and nothing at all for a person who cannot
separate those two fills. The step is written down now: the step name on the
start side, `Step {step + 1} of 3` and `الخطوة {step + 1} من 3` on the end
side, both at 0.75rem, above the bar. The bars became `aria-hidden`, which is
the honest half of the change rather than an afterthought: three empty spans
were never anything but noise to a screen reader, and once the count sits
beside them in text they would be a second announcement of one fact. Step names
come from what each step actually asks, not from an abstract sequence: `Your
role`, `About your work`, `Your details`.

One design constraint decided the markup and is recorded because it is
invisible in the result. The step name is not an `<h2>`. `sat-platform.css:638`
declares `h2 { font-size: clamp(1.3125rem, 6.6vw, 1.875rem) !important; }`
inside `@media (max-width: 600px)`. That is an unscoped `!important` of exactly
the class finding 194 records, and an inline `style` cannot outrank it, so a
step name marked up as a heading would render at 21 to 30 pixels on a phone,
directly above a 4 pixel bar, in a panel whose next line is 0.78125rem. The
instruction for this package is to resolve the interaction and the design
properly rather than reduce visual quality to satisfy accessibility, so the
heading was not the answer. The naming that a heading would have supplied is
carried instead by the focusable group that finding 199 required anyway, which
means one structure does both jobs and neither is bolted on.

*Finding 199, signup, filed and closed in the same slice.* Every step change is
driven by a `Continue` or `Back` button that lives inside the panel being
replaced, so the render that draws the next step destroys the element holding
focus. Focus falls to `document.body`, nothing is announced, and the next Tab
restarts at the top of the document, which means reaching the first field of
step 2 costs the entire header every time. This is not a new class of defect in
this file: ELITE-4 J1-5 fixed exactly this on the success panel, one screen
later. The repair had simply never been carried back to the two transitions
that come first, which is the same pattern as 182, a correct fix applied at the
site where it was reported and nowhere else. The wrapper is now a
`tabIndex={-1} role="group"` named with the step line and the step name, and a
`mounted` ref keeps the first render alone, because focusing on mount would
drag the viewport past the page heading for someone who simply navigated to the
page. That would be a different SC 2.4.3 failure, not a fix for this one.

*Finding 156, the Studio rail.* The recorded finding was precise about what was
missing and left the placement open, asking whether the states belonged on the
rail chips, in a summary above the panel, or nowhere, on a rail that already
scrolls horizontally at narrow widths. The judgement taken is the rail, because
the state belongs to the step and the chips are where the steps are; a summary
above the panel would describe steps that are not on screen next to a step that
is. Each chip renders `{p.answered}/{p.askable}` visibly and `aria-hidden`,
guarded by `p.askable > 0` so the review step does not print `0/0`. The count
is the non-colour carrier: `0/5` reads as not started, `5/5` as done, anything
between as part done, with no dependence on `border-signal` against
`border-line` or `text-signal` against `text-charcoal/70`. It is not new
wording; it is the `answered of askable` phrasing this component already prints
twice on the same screen.

Two decisions inside that fix are worth stating. The `!` blocked marker stays,
because a blocked step can be 4 of 5 and so is not separable by the count
alone; the count distinguishes three of the four states and the marker
distinguishes the fourth. And the visible `4/5` is hidden from assistive
technology while the `sr-only` span gains the count in words, because a
fraction read aloud is not what the mark means on screen. Both languages use
Western numerals, which this platform requires regardless, and the Arabic
separator is `،`.

The cost is about 28 pixels per chip on a rail that is already `overflow-x-auto`
with `min-w-max`. That buys the distinction with horizontal scrolling rather
than with layout, which is the trade this rail was built to absorb. The reflow
probe reports the same fourteen viewport renders as at RC7, RC8 and RC9a, with
identical numbers, so nothing else moved.

*Evidence.* Automated source scan and guard tests for all three findings, and
the browser-emulated reflow probe as non-regression evidence for 156. None of
this was tested on a physical device, none with an actual screen reader and
none independently audited. WCAG 2.2 AA conformance is not claimed from it.

**RC9c. Which control is a navigation and which is a dialog trigger, findings
167 and 200.**

Finding 167 was deferred twice, and both deferrals said the same thing in
different words: the two controls on the listings split view look like a pair
but want opposite remedies, and choosing between them is a decision about what
the split view is rather than an attribute to add. Slice K made that decision,
and it was made by reading the stylesheet rather than the component, because the
stylesheet is where the behaviour actually lives.

`src/styles/sat-platform.css:695-706` says it plainly. Above 1080 pixels
`.lst-split` is `minmax(0,1fr) minmax(300px,40%)`, `.lst-map-panel` is a sticky
element in the second column, and `.lst-map-toggle` is `display:none`. There is
no control, and the map is a region of the page sitting beside the results.
Below 1080 pixels the second column is gone, the panel is hidden until it gains
`.open`, and `.open` sets `position:fixed;inset:0;z-index:90`. That is a layer
over the whole viewport, and the component had already, correctly, given it
`role="dialog"`, `aria-modal`, a focus trap and Escape.

So the properties and insights chips and the show map button are not two
instances of one pattern. The chips are two `Link` elements that change the URL
and reload the route. That is navigation, and the attribute that says which one
you are on is `aria-current="page"`. The map button opens a modal dialog, and
the attribute for that is `aria-haspopup="dialog"`.

The register's own proposed remedy for the button, `aria-expanded`, is wrong,
and slice K corrected the register rather than implementing it. `aria-expanded`
describes content that expands in place while the rest of the page stays
reachable. ARIA authoring practice excludes modal dialog triggers from it
specifically, because announcing a control as collapsed or expanded while the
thing it opens covers the screen and holds focus describes the opposite of what
happens. A guard test now asserts `aria-expanded` is absent from the file, so
the suggestion is not reinstated by a later reader of that row.

SC 1.4.1 is a separate obligation and `aria-current` does not discharge it,
because nothing about it is visible. The active chip takes `fontWeight: 700`
inline. Inline and not on `.chip.on`, because since RC9a `.chip.on` is the
selected face of every native radio on the platform, and reweighting all of them
to fix one pair would be a cosmetic sweep with no evidence behind it. The rule
that visual quality is not reduced to satisfy accessibility cuts both ways: it
also forbids changing the look of controls that have no finding against them.

Finding 200 came out of the same reading, and it is the more serious of the two.
Every dialog semantic on the map was keyed on `open`, which records a button
press and knows nothing about the viewport. The button only exists below the
breakpoint, and so does the overlay, but `open` survives a resize. A map opened
narrow and then widened, an ordinary tablet rotation or window drag, was drawn
inline in the split grid while still carrying `role="dialog"` and
`aria-modal="true"`. `aria-modal="true"` instructs assistive technology to treat
everything outside the element as inert, so the results, the filters and the
view pair sitting visibly beside the map were removed from the accessibility
tree while remaining fully operable by mouse and keyboard, and the close button
that would have ended the state had been set to `display:none` by the same
media query. The focus trap ran there too, cycling inside a panel that covered
nothing.

The fix makes the layout decide. `overlay` tracks
`window.matchMedia("(max-width:1080px)")` through a `change` listener, `modal`
is `open && overlay`, and leaving overlay also closes the panel so it never sits
open in a layout with no visible way out. `role`, `aria-modal`, the trap and
Escape are all gated on `modal`; above the breakpoint the panel is a plain
`role="region"` with the same name. The focus return checks
`offsetParent !== null` before calling `focus()`, because a `display:none`
element accepts the call and drops focus to the body, which is finding 199
recreated. `matchMedia` is read in an effect and not during render, so server
and first client render agree; the panel is simply not a dialog until the client
has measured, which is the safe direction to be wrong in.

One repository lesson worth recording. `src/components/ListingsMap.tsx` was not
in the journey scan in `src/lib/formGroups.test.ts`. The listings route file was,
and it draws the header and the view pair, so the scan looked complete while
seeing only one half of a split view. The two new guard tests failed on the
missing file before they could fail on anything real, which is the good failure
mode, but the gap had been open since slice B. It is closed now, and it is the
second time a shared component holding a journey's actual work sat outside a
scan named after that journey.

**RC9d. Content that arrives after the page does, findings 187 and 201.**

Both requirement routes are client components that fetch their own content on
mount. The route resolves at once, the visitor is given a heading, a subtitle and
a loading line, and then some time later the entire body of the page is replaced.
A sighted reader watches that happen. Nobody else was told anything.

The register's deferral proposed a route-level loading boundary plus a focus move
to the new heading. Slice L implemented neither, and the reasons are worth
writing down because both are instructive.

The loading boundary does nothing here. A `loading.tsx` covers the wait for a
server render, and there is no server wait: the route resolves immediately and
the delay belongs to a `fetch` the browser starts after hydration. Putting a
boundary above these routes would produce a file that never renders.

The focus move is the more interesting mistake, and it is the second time in this
package the register proposed the wrong instrument. It assumes a screen reader
user sits still while the request runs. They do not. They land on the URL and
start reading the heading and the subtitle with the virtual cursor, which walks
the document without moving DOM focus at all. So `document.activeElement` is
`document.body` for the reader who is three paragraphs in and for the reader who
has touched nothing, and no guard written around focus can tell them apart.
Calling `focus()` when the data settles would drag the attentive one back to the
top of a page they had already started. Focus is moved when the user asked for
the change. Nobody asked for this one; the page finished loading.

What fits is a status message, which is what SC 4.1.3 is for and which moves
nobody. Both routes now carry a `.sronly` `role="status" aria-live="polite"`
region and set `aria-busy` on their container while the request is in flight.

The difficulty in a status region is never the attributes. It is whether the
element survives the swap it is reporting on. A live region announces changes
inside an element the browser was already watching, so a region created in the
same render as its text is silent. The board file keeps the region outside the
loading branch. The detail file could not: it had three early returns with three
unrelated root elements, which is precisely the shape that breaks this, and it
was restructured so every branch opens with the same root and the same region as
its first child. React reconciles by type and position, so the region is
preserved and only what sits under it is replaced. That restructure is the actual
work of finding 187; the attributes are the easy part, and a version of this fix
that added the attributes without moving the returns would test the same and
announce nothing.

Two further repairs travelled with it. The board's `.catch` set `loading` to
false and nothing else, so a request that failed fell straight into the empty
branch and told the visitor that no occupier in the country is looking for space.
That is the ELITE-4 J4-5 defect in a second place, and it now says it failed,
distinguishes a connection problem from an empty market in the sentence itself,
and offers the retry an automatic one would have hidden. And the same fetch was
parsing a `!r.ok` response as JSON and treating it as success, so a 500 produced
an empty board rather than a failure.

Finding 201 came out of reading the detail page for 187, and it is the sharper of
the two. The response form is a disclosure. On a successful registration the
handler calls `setShow(false)`, and the element holding focus at that instant is
the submit button inside the panel that call unmounts, so focus fell to
`document.body`. That is finding 199 exactly, one journey over. It is compounded
because the confirmation is silent too: the evidence that the response saved is
that a count in the heading above went up by one and an entry appeared in a list
further down, both visual, both below the fold on a phone, neither announced. A
responder using a screen reader submitted a message and was told nothing.

The fix returns focus to the disclosure button, which is where a user belongs
when a disclosure they operated closes, and carries the confirmation on the
reload rather than asserting it before the reload proves it: `load()` takes an
optional sentence and sets it into the same region 187 installed, so the words
appear only in the render that also shows the response in the list. The order is
deliberate. Focus moves first, the fetch resolves second, so the reader is
already at the disclosure button when the confirmation is spoken rather than
being moved after it.

One test in this slice asserts an absence: there is no `.focus()` call in the
board file. A deliberate absence with nothing guarding it reads as an oversight to
the next person and gets helpfully corrected, and the correction would be a
regression that no other test in the repository would notice.

**RC10. Locale leakage in constructed controls, findings 18, 160, 162, 22 and
171.** Map controls in English in the Arabic build; the MapLibre container with no
accessible name and its built-in controls constructed with no locale; lightbox
control names as English literals; English leakage in the Arabic new-listing flow;
and a description paragraph declaring neither `lang` nor `dir`. The cause is that
a control built in JavaScript does not pass through the dictionary, so every such
control has to be found rather than caught.

**RC10 slice M, done. Findings 18, 160 and 162.** Three findings, two work
streams, four components, one cause: nothing in this repository had ever passed
MapLibre a `locale`, and one component had never been told which language it was
rendering in.

The map half was deferred in the register on an evidence question. Finding 160
said the correct remedy could not be chosen because no browser was reachable in
this container, so which strings MapLibre actually renders into the DOM could not
be observed. That was the wrong place to look for the answer. The strings are in
the dependency, and the dependency is on disk. Read directly at
`node_modules/maplibre-gl/dist/maplibre-gl-dev.js`, version 4.7.1: a
`defaultLocale` table of twenty-one keys, a resolver
`_getUIString(key) { const str = this._locale[key]; if (str == null) throw ... }`,
and a `setAttribute('aria-label', ...)` at each site that consumes one, which was
read at the canvas, the marker, the logo link, the navigation buttons and the
attribution toggle. The merge is
`this._locale = Object.assign(Object.assign({}, defaultLocale), options.locale)`,
which is the fact that makes a shared partial table safe: a key left out keeps
MapLibre's English rather than throwing.

That is source-level verification of a dependency. It is not browser
verification and it is not screen-reader verification, and the register records
it under that name. It is enough to decide the remedy, which is what the
deferral was waiting on.

So `src/lib/mapLocale.ts` holds one table, built from a new `mapControls`
dictionary section, and all four construction sites pass it. Nine keys are
translated. Five available controls are deliberately not, because no site in
`src` constructs a scale, fullscreen, geolocate or terrain control or turns on
cooperative gestures, and translating markup that does not exist is dictionary
weight that will rot. The omission fails open to English rather than to a crash,
so a guard test asserts that none of the five appears, and a second asserts that
every `NavigationControl` still passes `showCompass: false`. That last one is the
interesting guard: `ResetBearing` is translated even though the compass is not
drawn anywhere, so turning the compass on is a one-line change that cannot
reintroduce an English control, and the test is what tells whoever makes that
change that the question was already considered.

Finding 160's second half was a design objection rather than an evidence one:
naming the container without a non-canvas path to the same information would
create a false affordance, an invitation to operate something a keyboard cannot
reach. The path exists here and was verified in the file. The combobox above the
map resolves a place name, a pasted map link or a bare `lat, lng` pair; the two
number inputs below set the same coordinates; all three end in the same `place()`
call a map click ends in. So the host is named, as `role="group"` with an
`aria-label`, and described by the instruction paragraph that was already under
it, extended to say where that keyboard path is. `role="group"` and not the
`role="img"` `LocationFacts.tsx` uses, because that map is a picture of a
location already decided and this one is an input. Describing an editable
control as a picture is a worse description than none.

Finding 162 is the same shape one level down. The register proposed threading
three label props into `Gallery.tsx` from the page that mounts it. That would
have fixed the three attributes and left the file in the state that produced
them. The component's props were `images`, `title` and `photosLabel`, and
`photosLabel` is what hid the gap: one already-translated word arriving as a prop
made the file look bilingual while every other string in it was English, so the
close, previous and next buttons were English in both locales and the next name
added here would have been too. The locale replaces the word, the component reads
its own names from a new `gallery` dictionary section, and the listing detail
page stops carrying an inline `ar ? "صور" : "photos"` ternary.

Two files joined the journey scan with it, `Gallery.tsx` and
`LocationFacts.tsx`. Journey 3 ends at a listing detail page that mounts both and
holds neither of their names, which is the third time in this package that a
scan named after a journey has been looking at the route file while the journey's
actual work sat in a shared component: finding 153 behind `LocationPicker.tsx` in
slice H, findings 167 and 200 behind `ListingsMap.tsx` in slice K, and now these.

Adding `Gallery.tsx` to the scan immediately failed the duplicate-name test, and
the failure was the guard's and not the file's. The test matched
`aria-label=(\{[^}]*\}|"[^"]*")`, and `[^}]*` stops at the first `}`, which
inside a template literal is the end of the first interpolation rather than the
end of the value. Gallery names its thumbnails `` `${title}, ${k + 2} / ${images.length}` ``
and its dialog `` `${title}, ${images.length} ${photosLabel}` ``; both truncated
to the same seven characters, and the guard reported two controls sharing a name
that neither of them has. It is now a brace counter rather than a pattern. A
guard that accuses correct code is worse than one that misses a defect, because
the next person to meet it learns to work around the test rather than to read it.

**RC10, slice N. Text nobody in this codebase wrote, findings 171 and 22.**
Slice M closed the names MapLibre writes for itself. Slice N closes the two
places where text a stranger typed, or a route composed, reaches a reader in the
wrong language.

Finding 171 is the listing description. It is the one paragraph on the detail
page that SAT did not compose: everything else there comes from the dictionary or
a controlled vocabulary and is in the reader's language by construction. The
column it arrived in, `description_en` or `description_ar`, is a declaration by
the person who filed it rather than a measurement, and it is wrong in both
directions often enough to matter. The register had this recorded as blocked on a
data-model question, which was the right caution and the wrong conclusion. The
passport solves the equivalent problem with a stored flag, and that is correct
there because a correction reason is filed through one field with one recorded
language; adding such a column here would only move the problem, because the new
flag would be the field name again. What is available is the text. Script is not
inferred, it is read. `src/lib/textScript.ts` counts letters, excludes both
Arabic-Indic digit ranges because SAT writes Western numerals in both languages,
requires eight letters and a seventy percent share before it will answer, and
returns null for everything else including genuinely mixed text, where the caller
states `dir="auto"` rather than a direction nobody checked. `dir` is never
omitted now.

The same class turned up twice more on journey 4, and only one half of it was
fixed. Both requirement surfaces render a title as `(ar && titleAr) || title`,
which hands an Arabic reader the English title whenever no Arabic one was
written. Both now declare the script of whatever that fallback produced, so the
run is announced with the right phonetics and resolved in the right direction.
That the crossing happens at all is a parity decision rather than a markup
defect, and `listingTitle.ts` has already taken the opposite decision one journey
over and says so in its own doc comment. It is recorded as finding 202 and left
for a package that can decide how a requirement title is composed.

Finding 22 is not what its one-line register row suggested. Every visible string
on the intake form is already bilingual; the leakage is on the unhappy path. The
two listing routes refuse a save for twenty-six distinct reasons, every one an
English sentence composed in the route, and `ListingStudio` rendered it verbatim.
Two were worse than untranslated: the edit route composed `${label}: ${message}`
from the English registry label, and both routes returned PostgREST's own
`error.message` to the browser on a failed write. The fix follows a precedent
already in the tree rather than inventing a convention, because
`/api/listings/[id]` already answered one case with `{ error, error_ar, code }`.
Every error response now carries a code, `src/lib/listingIntakeErrors.ts` names
the codes in the reader's language, and `error` stays on the wire in English for
logs and API consumers where nobody renders it. A route knows what happened and
does not know who is reading. An unrecognised code falls to the generic sentence
in the reader's language, so a route added later cannot reintroduce the defect by
forgetting the table: the worst it can do is be vague.

Establishing that scope found a wider class and it is recorded rather than
absorbed. Sixteen further client sites render `j.error || <fallback>`, and four
of those fallbacks are themselves English literals shown in both languages,
including the single word `error`. They span all four journeys. That is finding
203, and the remedy is the one this slice just proved, applied deliberately
rather than by extension.

RC10 is closed.

**RC11, slice O, done. Findings 148, 149 and 168.** `display:block` dropping
table semantics at phone widths; a horizontal scroll wrapper unreachable by
keyboard; and the Insights table with no caption and no `scope`.

Three findings, one cause: the table was made responsible for its own overflow.
It is not. A table is a grid of related cells; the box it does not fit in belongs
to the box. Every consequence in this bucket follows from that inversion.
`table.dt{display:block}` inside the 920px fit guard is the usual way people make
a table scroll, and it works, and it also removes the table role from the
accessibility tree while `thead`, `tr`, `th` and `td` keep their `display:table-*`
values, so at exactly the width where a reader most needs column context the
header cells stop being associated with the data cells. That is 148. The wrapper
that scrolls instead, `<div style={{ overflowX: "auto" }}>`, is not focusable,
carries no role and has no name, so nobody without a pointer can pan it; the
enquiry-count column on the lister inventory contains nothing focusable at all
and is simply unreachable. That is 149. And a table whose name lives in a `<div>`
above it has no accessible name of its own. That is 168.

The repair is one primitive and one class. `.scrollx` in `sat-platform.css`
declares `overflow-x:auto;max-width:100%;min-width:0` unconditionally, at the top
level rather than inside a media query, because content with a `minWidth`
overflows whenever its column is narrower than that, which a desktop split view
does as readily as a phone; the old rule only scrolled below 920px, so between
920px and the table's own `minWidth` the excess was clipped by
`html,body{overflow-x:clip}` and silently unreachable. With overflow owned at
every width, `display:block` could simply be deleted. `ScrollRegion.tsx` owns the
part of the job CSS cannot express: it measures `scrollWidth - clientWidth > 1` on
mount and through a `ResizeObserver` on both itself and its content, and applies
`tabIndex={0}`, `role="region"` and `aria-label` only while that is true. Both
halves of the recorded blocker on 149 were real and both were true only when the
region actually scrolls, so the answer is to state what is true at that size
rather than to state it always. This is finding 200's sticky-rail reasoning
applied again: let the layout decide, not the markup.

Scope was widened twice on purpose. First from the three named surfaces to all 21
data tables, because the findings were register-blocked on "the same pattern
appears on other data surfaces" and the commission says to fix systemic causes
before individual occurrences. Then from tables to any horizontal scroller, after
the sweep found the `/compare` comparison grid (`minWidth: 260 + items.length *
200`) and the `/deal` stepper (`minWidth: 460`) carrying the identical 149 defect
on content that is not a table. That is why the component is named for the box and
not for what is in it, and why the guard can assert an absolute invariant, no bare
`overflowX: "auto"` anywhere, with three exemptions carrying reasons, rather than
a table-shaped one with unexplained gaps. The three exempt rails, the
`MarketingHome` hero assets, the two `MapExplorer` rails and the `ListingStudio`
step nav, hold only buttons and links, so focus movement pans them; a table cell
containing plain text is what focus movement cannot reach.

168's recorded deferral, "adding a caption means adding dictionary keys that this
pass was instructed not to touch", turned out to be false, and finding out why is
most of that fix: all 21 tables already render a visible title, and that title is
already a dictionary value in scope at the call site. So every caption reuses the
string the reader can already see. No dictionary key was added for any caption.
Exactly one key pair was added in the whole slice, `deal.progress`, and it names
the stepper region on `/deal`, which is not a table.

Evidence: typecheck clean; 1641 tests passing, 8 of them new guards on this slice;
`ar-lint: clean`; prose GATE 0 in 0 files; the reflow probe returning PASS over the
same 14 viewport renders with track widths numerically identical to the RC7
baseline, which is the evidence that deleting `display:block` and adding a caption
to every table in the platform moved no layout; the radio probe PASS at 5 groups in
both languages. Automated source scan and browser-emulated measurement in Chromium.
Not a physical device, not an actual screen reader, not independently audited.

**RC12. Media and motion, findings 170, 164 and 165.** A listing video with no
captions track; a map flight animation as a JavaScript duration no reduced-motion
query reaches; and district bubbles and building pins sharing fill and shape, so
colour is the only carrier.

## Bucket 2: journey-specific defects

One route or one component, no shared cause, closed where they live.

**Finding 147**, `ChromeGate` classing `/signup` as an APP route so a signed-out
visitor loses the marketing header and footer. Journey 1. It is a routing
classification defect that happens to have an accessibility consequence, and it
does not generalise to any other route.

**Finding 192**, the consent label promising a withdrawal that has no route,
control or channel. Journey 1. Classified here rather than as a root cause because
it is one label and one missing control, but it is the most serious row in the
55 by kind: it is an untrue statement shown to a user, not a usability defect.
Treated as a corrective and fixed first.

## Bucket 3: duplicates and subsumed findings

None of the 55 is a strict duplicate of another. Ten are subsumed, meaning they
close as a consequence of a root cause rather than needing their own change:
**150** under RC2; **27** under RC4; **26** under RC5; **161** and **155** under
RC6; **158** and **184** under RC7; **166** and **179** under RC3; and **22**
under RC10. They are listed with their root cause above and are not counted twice.

The register's own status column already carries two partial-duplicate warnings
that matter: **26** reads "Partially addressed" and **50** reads "3 of 155
fixed", so both have prior work that must be read before more is added, or the
package will fix the same three sites again.

## Bucket 4: findings requiring physical-device or independent-human verification

These can be fixed in this package. They cannot be **verified** in it, and the
handback must say so rather than implying automation settled them.

**Physical device required:** 139 and 26, touch target size, because a CSS
`min-height` is evidence that a rule exists and not evidence that a thumb reaches
it; 27, Arabic mobile reading size, for the same reason; 148, table semantics at
phone widths, because the browser emulation of a narrow viewport is not a phone.

**Actual screen reader required:** 143, 161, 155, 153, 157, 159, 180, 181, 167,
182, 187, 156, 160, 162, 168, 171. Everything whose defect is a name, a role, a
value or an announcement. A DOM assertion proves the attribute is present; only a
screen reader proves what is spoken, and in the Arabic case only an Arabic screen
reader proves it is spoken in Arabic.

**Independent human judgement required:** 165, whether the non-colour distinction
between district bubbles and building pins is actually distinguishable; 145,
whether the non-colour step indicator reads as progress; 170, whether captions on
the listing video are accurate, which is a content task and not a code task.

**Verifiable here without a device or a screen reader:** 50, 140, 150, 154, 166,
179, 174, 141, 158, 184, 147, 192, 164, 149, 148 partially, 18 and 22. Contrast
is arithmetic on declared token values, reflow is observable in a resized
viewport, a compiled stylesheet either contains a rule or does not, and a missing
captions track is a missing element.

## Bucket 5: not accessibility findings, present in the same P1 set

Nine of the 55 are P1 rows that arrived in the same severity band and are not
accessibility defects. They are named here so the handback's arithmetic is
honest and nobody later reads "55 P1 accessibility findings".

Metadata and syndication: **13**, **14**, **15**, **32**. Language and content
quality: **16**, **17**, **19**, **29**, **30**, **31**, **25**. Claims and
figure precision: **20**, **21**, **45**, **62**, several already blocked by
evidence or an owner decision. Data quality: **117**, the `create_requirement`
RPC filing a requirement in Riyadh when the payload names no city.

Of these, **117** is in scope for this package under Codex's allowance for
reliability, security and data quality work, because a requirement silently
recorded in the wrong city is a data-correctness defect with a user consequence.
The rest stay recorded and are not displaced by the accessibility package.

## Resulting arithmetic

55 open P1 findings. 9 of them are not accessibility findings, leaving 46. Those
46 reduce to 12 shared root causes plus 2 journey-specific defects. 19 of the 46
can be fully verified in this environment; the remaining 27 need a physical
device, an actual screen reader or independent human judgement, and this package
will fix them and classify their evidence accordingly rather than claim
conformance from automation.

## Order of work

Finding 192 first, as a corrective, because it is an untrue statement to a user.
Then RC1, because several colour findings cannot be verified until the compiled
stylesheet contains the rules they name. Then RC2, RC3 and RC4 as one token pass,
because a contrast decision and a scale decision made separately will disagree.
Then RC5 and RC6, which are shared chrome. Then RC7 through RC12 by journey,
starting with journey 2, Listing Studio and inventory, which carries the largest
count.
