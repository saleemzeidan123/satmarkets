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

**RC10. Locale leakage in constructed controls, findings 18, 160, 162, 22 and
171.** Map controls in English in the Arabic build; the MapLibre container with no
accessible name and its built-in controls constructed with no locale; lightbox
control names as English literals; English leakage in the Arabic new-listing flow;
and a description paragraph declaring neither `lang` nor `dir`. The cause is that
a control built in JavaScript does not pass through the dictionary, so every such
control has to be found rather than caught.

**RC11. Table semantics, findings 148, 149 and 168.** `display:block` dropping
table semantics at phone widths; a horizontal scroll wrapper unreachable by
keyboard; and the Insights table with no caption and no `scope`.

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
