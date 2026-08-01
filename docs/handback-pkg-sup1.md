# Handback: PKG-SUP1, the public listing entry stops simulating a form

Package closed. Commit `d6806b8`, deployed on `dpl_2mGUZD7s8ZdTBnMa2ZGQNkmiCfj7`, state READY.
This is finding 35, and the `/list` half of finding 12. It also opened, fixed and permanently
guarded a defect class nobody had named, finding 98, and measured and registered a second one,
finding 99, rather than absorbing it.

## 1. Scope

**The defect.** `/list` is the public entry point for supply and it was a picture of a form
rather than a description of one. On the previous deployment, in both languages, the route
returned 8 `<label>` elements and 0 `<input>`, 0 `<textarea>`, 0 `<select>` and 0 `<form>`. Every
field was a `<div class="input">` holding somebody else's answer: "Grade A office floor", "Al
Olaya", "320". A four-step progress bar showed step 1 ticked and step 2 active. A "Drag photos
here" zone was not a drop target. A "Live preview" card previewed a listing nobody had entered.

Three separate harms, not one cosmetic one. An owner reasonably believed they were two steps into
a submission that did not exist, so any work they did on that screen was lost the moment they
left it. A photograph dragged onto that zone vanished with no message. And a screen reader
announced a "Listing title" field with nothing to focus, because a `<label>` with no control is a
promise the page cannot keep.

It also described the wrong intake. Its four steps were Asset, Details and media, Pricing, Verify
and publish. The Listing Studio runs ten stages.

**What changed.** The route now describes the real intake, and it describes it by computing it.
`src/lib/listIntake.ts` reads `studioSteps()` for the stages, with the title and purpose the
Studio itself shows for each, and `DRAFT_REQUIRED_CHECK_KEYS` with `assessListing()` for the
facts the write path refuses to save a draft without, with the label and reason the completeness
model already holds. So the public description of the intake and the intake are the same object.
Change a stage and the page changes with it. Delete one and the page loses a row rather than
lying about it.

**What that module deliberately refuses to assert**, because a page speaking to a visitor who has
chosen nothing yet must not make a promise that is true for a third of them. A stage is listed
only where every asset type has it, and the intersection is computed rather than assumed. A step
count is not a stage count: some asset types split one stage over two screens, so the same ten
stages run to ten steps or eleven, and the page states the range rather than picking the
flattering end, and states it only while the two ends genuinely differ. The asking figure is the
one required fact whose label depends on a choice the visitor has not made, `Asking rent` under a
lease and `Asking price` under a sale, so both are read and joined with the reader's own "or"
rather than one being picked and being wrong for half the market. Every other required fact
carries one label under both deal types, which the test asserts rather than trusts.

**What is deliberately not built.** No real form on this route. Listing intake is permissioned
and writes to a lister's own draft, so a public form here would either collect facts it cannot
store or invite an unauthenticated visitor to type a licence number into nothing. The one control
is a link to the Studio, and the page says plainly that signing in comes first rather than
letting the visitor discover it on arrival.

## 2. Commits

`d6806b8` (`d6806b8f6ad35938e018800dce64dd66874aea2d`), 9 files, 654 insertions, 145 deletions.

> PKG-SUP1: the public listing entry describes the real intake instead of simulating a form, and
> a guard for the custom property that fails silently

New files: `src/lib/listIntake.ts`, `src/lib/listIntake.test.tsx`, `src/lib/cssVars.test.ts`.
`src/app/[locale]/list/page.tsx` rewritten, 118 lines of mock to 141 lines of description with
`generateMetadata` added. `src/app/[locale]/listings/[id]/page.tsx` one line, the pre-existing
`var(--line)` on the owner-documents card. The two dictionaries lost 33 keys and gained 10, in
both files together, because `laws.test.ts` asserts exact key parity between locales.
`package.json` gained two entries, because `npm test` is an explicit file list rather than a glob
and a new test file that is not added to it is a test file that never runs.

## 3. Tests and gates

| Gate | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | RC 0 |
| Tests | `npm test` | 1408 pass, 0 fail, 0 cancelled, 0 skipped, 28314 ms |
| Arabic lint | `npm run ar-lint` | `ar-lint: clean` |
| Prose scan | `node scripts/prose-scan.mjs` | RC 0 |
| Production build | Vercel | READY on `dpl_2mGUZD7s8ZdTBnMa2ZGQNkmiCfj7` |

Fourteen new tests, 1394 to 1408. Eleven in `listIntake.test.tsx` and three in `cssVars.test.ts`.

`npm run build` fails in this sandbox on four `next/font` fetches to Google Fonts, for `Hanken
Grotesk`, `IBM Plex Mono`, `IBM Plex Sans Arabic` and `Source Serif 4`. That is the egress block
on this container, not a code result. The Vercel build is the production build evidence and it is
READY.

Both new test files carry their own sensitivity test, because a guard nobody has watched fail is
a guard nobody knows works. `orphanLabels` is checked against the exact markup that shipped, and
against the three shapes it must not accuse: an explicit `for`/`id` pair, a control nested inside
the label, and a `for` pointing at something that is not a control, which is still an orphan. The
custom-property guard is checked against all four judgements it makes, including that
`var(--amber-d, #92400e)` is not an offence because the fallback keeps the declaration valid.

## 4. Live evidence, English and Arabic

`dpl_2mGUZD7s8ZdTBnMa2ZGQNkmiCfj7`, `satmarkets-fsay8q4vj-sat-markets.vercel.app`, both routes
200.

**The form that was not one is gone.** `<label>` 0, `<input>` 0, `<textarea>` 0, `<select>` 0 and
`<form>` 0 on `/en/list` and on `/ar/list`. There is nothing left on the route that can be
mistaken for a control.

**No fabricated answer is served.** Every one of the twelve literals, and "320", is absent from
the visible text of both routes.

**The intake it describes is the real one.** The ten stage titles appear in intake order in both
languages, all seven required facts appear with their labels and their reasons, and the joined
asking-figure label appears in both. The range note reads "10 stages. Some asset types split one
stage across two screens, so the intake runs to 10 or 11 steps depending on what you are
listing." and, in Arabic, "10 مراحل. بعض أنواع الأصول تقسم مرحلة واحدة على شاشتين، فيصبح المسار 10
أو 11 خطوة بحسب ما تدرجه."

**The route carries its own metadata.** `List a space | SAT Markets` and `إدراج مساحة | سات
ماركتس`, in place of the root layout's generic title. That is the `/list` half of finding 12.

**Platform laws hold on the served HTML.** `var(--line)` 0 occurrences, em dash 0, Arabic-Indic
digits 0, on both routes.

**A false alarm, investigated rather than accepted or dismissed.** The first live pass reported
"Grade A office floor", "Al Olaya" and "SAR/m" present on `/en/list`, and "العليا" and "سعرك" on
`/ar/list`, which would have meant the package failed its own stop condition. Locating every
occurrence with its leading context showed all of them inside the serialised dictionary in the
RSC script payload, in the `invest`, `hbu`, `area`, `messages`, `advisor`, `termsheet` and
`broker` blocks. None was in the `list` block and none was rendered. Re-running with `<script>`
and `<style>` stripped and only `<body>` taken gives zero in both locales. The render test had
been correct throughout: it renders `<ListPage>` alone, without the layout that carries the
payload. The investigation is recorded because the technique now matters for every future live
check on this platform, and because the measurement it produced became finding 99 rather than
being discarded.

## 5. Responsive evidence

No `.css` or `.scss` file changed. The route's two-column `list-split` shell, its `list-rail` and
its `list-form` are the classes that were already there and already responsive; what changed is
what sits inside the right column. The stage list is a single-column `<ol>` of rows that wrap
their own text, the required-facts card is the platform `card pad` at `maxWidth: 720`, and the
two links sit in the existing `row gap12 between wrap`, which is the wrapping button row used
across the platform. Every new element is one column at every width, so there is no new
breakpoint behaviour to measure. The route also removed a two-column mock grid, a four-step
progress bar and a drop zone, all of which had their own narrow-width behaviour, so the surface
that can break at 320 pixels is strictly smaller than before.

This environment cannot render or measure any width. Playwright cannot reach the deployment
through the sandbox proxy, the Chrome extension is not connected, and the remote-devices computer
tools are disconnected. That is the standing limitation recorded in every handback since it
began, it is stated rather than blurred, and the paragraph above is a basis rather than a
photograph.

## 6. Findings

**Finding 35, closed with live evidence.** The public listing entry was a mock of a form. The
evidence is in section 4 and the closure is clause by clause against the stop condition in
`docs/roadmap.md`.

**Finding 12, partially addressed.** `/list` now carries its own title and description in both
languages. The Map, Advisor and Requirements routes are still on the root layout's generic
metadata, so the finding stays open on those.

**Finding 98, opened and closed in the same package.** A CSS custom property that nothing
declares fails silently. `var(--line)` is not declared anywhere, and the cascade treats a
declaration containing an unresolvable `var()` as invalid at computed-value time, so the whole
declaration is discarded and the element renders with no border, no console warning and no build
error. I introduced it in the new stage list. A grep of `src/styles` found it was never declared,
and the same sweep found it already shipped on the owner-documents card of the listing detail
page, where owners had been reading a card whose border never drew.

The durable part is `src/lib/cssVars.test.ts`. It derives the legal declaration set rather than
holding a list: the platform tokens from `src/styles/*.css`, and the four `next/font` families
from the `variable:` options in `src/app/layout.tsx`, which are injected onto the `html` element
at runtime and appear in no stylesheet. An allow list of those four names would have been shorter
and wrong. It would accept `--font-serif` forever, including after somebody deleted the font that
declares it, and it would reject a fifth family the day it is added. A third test asserts the
font names are read from `layout.tsx` and are not also declared in CSS, so the layout read stays
load bearing rather than becoming decorative.

Two corrections to my own first attempt are worth recording. The first sweep scanned only `.ts`
and `.tsx`, which missed that the three stylesheets are the heaviest consumers of the font
variables and that `--font-ar` is used in CSS alone. And `var(--x, fallback)` is deliberately not
flagged, because the fallback keeps the declaration valid, which is why `AdPermit.tsx:73` is
correct and is not accused.

**Finding 99, opened, measured, not fixed.** The active locale's entire dictionary is serialised
into every page's payload. On `/en/list` that is 141,202 of 165,422 characters of script against
2,906 characters of visible text, and it carries the sample strings of fifteen other routes. Only
the active locale ships, zero Arabic characters appear in the English payload, and the sample
values carry their own sample labelling on the routes that render them, so this is a payload and
coupling fact rather than a truth defect. It is registered rather than absorbed because narrowing
it means changing how every page obtains its dictionary, which is a package with a regression
surface across every route, not a line in this one.

*Considered and rejected during this package:* keeping a reduced version of the left rail's
"average time" card as a measured figure. There is no measurement. It stays as the claim-audited
wording that already says the figure is checked at launch, which `claims.test.ts` asserts in both
languages, and this package neither strengthened nor weakened it.

## 7. Remaining blockers

Unchanged, and none of them introduced here.

The sandbox egress proxy returns 403 CONNECT for both the deployment and Supabase REST, so
`web_fetch_vercel_url` is the only live channel, it is GET only and unauthenticated, and the
local production build cannot fetch its fonts. `mcp__Supabase__execute_sql` returns a permission
error, so record-level evidence comes from the deployed API routes instead. Authenticated
surfaces cannot be photographed from this container at all, so lister and admin workspaces are
verified by construction and unit test. Codex item 7's interactive-browser Advisor verification
remains blocked on the same channels.

Owner-side and unchanged: `.github/workflows/arabic-font.yml` is delivered but must be installed
by the owner, because the deploy token has no `workflow` scope and a workflow-scoped token must
not be requested. O10 through O16, finding 74, contract 6 and provider activation, and the twelve
Part E clauses for any mobility source are owner or contract decisions, not engineering ones.

## 8. Next package

**PKG-DEM1: the demand entry point stops rejecting its own visitors.** Findings 28 and 100.

Supply is now honest. Demand is worse than dishonest, it is broken, and the break is live and
measurable rather than inferred.

`/post-requirement` is a real form, unlike `/list`. Codex P1-02 already repaired it from
unassociated labels and `<span onClick>` pseudo-radios into thirteen labels over fourteen
controls, five `<fieldset>` groups and a real consent checkbox that gates the submit button. What
it does not do is submit.

The move-in control offers `Immediate`, `1–3 months`, `3–6 months` and `Flexible` in English, and
`فوري`, `1–3 أشهر`, `3–6 أشهر` and `مرن` in Arabic. `POST /api/requirements` accepts exactly
`ASAP`, `Q1`, `Q2`, `Q3`, `Q4`, `Flexible` and `Immediate`, and returns 400 "Choose a valid
timeline." for anything else. So two of the four English options are rejected, all four Arabic
options are rejected, and the option the page ships pre-selected is one of the rejected ones:
`checked=""` sits on `value="1–3 months"` on the deployment, and on `value="1–3 أشهر"` in Arabic.
An English visitor who fills the form and does not touch that control is refused. An Arabic
visitor is refused whatever they choose. The refusal arrives as one sentence in a card at the
bottom of the page with no indication which of fourteen controls caused it.

The live board corroborates it. `GET /api/requirements` returns six real rows, `sample: false`,
whose timelines are `null`, `Q3`, `ASAP`, `Q4`, `Q3` and `Q4`. Not one is a value this form can
produce.

Three more defects sit behind it, and they are the same drift class `/list` was just cured of.
The five districts are name and UUID literals inside the client component, and the Arabic label
the form shows for KAFD is `كافد` while the districts table holds `واجهة الرياض المالية`, which
is what the board then displays for the requirement the visitor just filed. The board already
carries `Al Faisaliyah`, a district the form does not offer. Only the first selected district is
sent as `district_id`, and the rest are stuffed into an English-keyed prose note that no matcher
reads. And the success card writes `3` by hand next to the audiences caption while `done.notified`
carries the real list returned by the route.

Full scope, stop condition and what is deliberately not built are in `docs/roadmap.md`.
