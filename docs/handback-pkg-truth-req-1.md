# Handback: PKG-TRUTH-REQ-1, the requirement notification and match honesty repair

Committed locally at `34e4b7c` (`34e4b7c7bbf026c8ccbfae52b4ad8c506bca8559`), 9 files, 485
insertions, 45 deletions. NOT pushed and NOT deployed; see section 6 for why, and what has to
happen for that gap to close.

This package is scoped exactly to the seven items Codex commissioned after accepting the final
Mobbin synthesis. It does not touch bulk import, the enquiry workspace, notification delivery
infrastructure, the verification redesign, or any other Mobbin-derived roadmap item. Those
remain on the approved sequence, untouched.

## 1. The notification claim (item 1)

**The defect.** `src/app/api/requirements/route.ts` returned `notified: NOTIFIED` on every
successful submission, where `NOTIFIED` was a hardcoded three-entry constant: `"SAT broker
network"`, `"Verified landlords in your locations"`, `"SAT requirements desk"`. Nothing in the
codebase reads the notification ledger `create_requirement` writes, and nothing dispatches from
it: `package.json` carries no email library (no `resend`, `nodemailer`, `SES`, `postmark`), no
push integration exists, and the two cron jobs that do exist, `expire-permits` and
`ingest-rega`, do neither. The claim was never evidenced.

**What changed.** The `NOTIFIED` constant and the `notified` field are deleted from the route.
`src/app/[locale]/post-requirement/RequirementForm.tsx`'s `Done` type dropped `notified:
string[]` and the success card's two-tile grid (candidate tile plus a rendered list of the
three audiences) is now one tile. The requirement-detail empty state and the post-requirement
success body were corrected in both languages (before/after in section 3).

**Before, `route.ts`:**

```ts
const NOTIFIED = ["SAT broker network", "Verified landlords in your locations", "SAT requirements desk"];
...
return NextResponse.json({ ok: true, id, ref, match, notified: NOTIFIED, stored: true });
```

**After:**

```ts
return NextResponse.json(buildRequirementSuccessResponse(id, ref, candidateCount));
// buildRequirementSuccessResponse(id, ref, candidateCount) returns:
//   { ok: true, id, ref, candidate_count: candidateCount, stored: true }
```

## 2. The match claim (item 2)

**The defect.** The same response called a filtered listing count a "match". The query filters
on published status, asset type, deal type and district when one is given. It does not evaluate
size, budget, timeline, availability or must-haves, five of the ten fields a requirement can
carry, and it never ran the canonical matcher in `src/lib/matching.ts`. Calling it a match
implied a check that never happened.

**What changed.** The field is `candidate_count`. Zero renders as zero (see the regression test
in section 5, "a zero candidate count renders as zero"). Copy was rewritten to describe what the
number is, with an explicit caveat that it is partial.

**API response contract, before and after:**

| Field | Before | After |
|---|---|---|
| `match` | number, called a match | removed |
| `notified` | `string[]`, hardcoded | removed |
| `candidate_count` | did not exist | number, published listings sharing location and category, never a match |
| `ok`, `id`, `ref`, `stored` | unchanged | unchanged |

**Copy, before and after (EN; AR changed in parallel, see the dictionary diff):**

`postReq.successBody`: "Your requirement is posted to the SAT exchange. We've notified the
people who can fill it, and you'll see here whenever someone shows interest, your contact
details stay private until you reply." became "Your requirement is posted to the SAT exchange.
You'll see here whenever someone shows interest, your contact details stay private until you
reply."

`postReq.matchToday` ("spaces match today") and `postReq.audiencesNotified` ("audiences
notified") were deleted, not left unused. In their place: `postReq.candidateCountLabel`
("published listings today") and `postReq.candidateCountNote` ("Published listings that share
this location and category. Not everyone who responds will match every detail of your brief,
and no one has been notified yet beyond an internal record of your requirement.").

`postReq.locationNote`: "so the count of matching spaces below is a count for that location"
became "so the candidate count above is for that location alone".

`reqDetail.none`: "No interest yet, owners and brokers were notified. Responses will appear
here." became "No interest yet. Responses will appear here."

## 3. Requirement asset taxonomy (item 3)

**The defect.** `REQUIREMENT_ASSET_TYPES` held 7 entries (office, retail, warehouse, medical,
showroom, serviced, education) against `assetFields.ts`'s 15-entry `ASSET_FIELDS` registry, with
no record anywhere of a decision on the other 8. The public form silently withheld types the
platform otherwise fully supports.

**The audit this decision rests on.** `docs/competitive-research.md`'s data-coverage count: 93
live listings total, office 37, retail 17, medical 10, warehouse 8, serviced 7, showroom 6, land
3, education 3, mixed_use 2. That sums exactly to 93, which confirms zero live listings in
hospitality, gas_station, entertainment, wedding_hall, worker_housing and self_storage.

**The decision, made per type rather than as a blanket edit.**

Added: `land` and `mixed_use`. Both carry live inventory (3 and 2 listings). Both have a full
support chain already in place: a field set in `ASSET_FIELDS`, a bilingual label in
`labels.ts`'s `ASSET` table, and no special handling needed in the matcher, because
`matching.ts` compares asset type with plain string equality and holds no enumerated list of its
own to fall out of step. The shared `public.asset_type` Postgres enum, which both
`listings.asset_type` and `requirements.asset_type` cast to, is the enum the live land and
mixed_use listings already sit under, so there is no schema gap on the write path either.

Excluded, and named as `REQUIREMENT_ASSET_TYPES_EXCLUDED` rather than left silently absent:
`hospitality`, `gas_station`, `entertainment`, `wedding_hall`, `worker_housing`,
`self_storage`. All six have complete field sets and labels, identical in kind to land and
mixed_use. The reason they stay off the requirement form is the one reason that matters for a
requirement specifically: zero live listings means an occupier who posted a brief in one of
these six would read a live product and never receive a single response the platform could ever
generate. That is a worse failure than the type not being offered.

**The structural guard.** `src/lib/requirementIntake.test.tsx` gained three tests: that
`REQUIREMENT_ASSET_TYPES` and `REQUIREMENT_ASSET_TYPES_EXCLUDED` together equal exactly the
`ASSET_FIELDS` registry with no overlap and no gap; that land and mixed_use resolve to real
labels in both languages rather than falling back to the raw token; and that every excluded type
still has a real field set and label, so the exclusion is provably about live inventory and not
about the type being unsupported. A fourth test asserts `matching.ts` names no asset type
literally, so it cannot become a second vocabulary the taxonomy has to agree with.

**What this cannot check.** Whether "zero live listings" is still true is a live-inventory fact,
not a structural property of the source tree, and no test run from this environment can
re-query the production database. It can only be re-audited against real data. If any of the six
excluded types gains live inventory, `docs/competitive-research.md`'s audit needs updating and
this decision needs revisiting by hand; nothing here will catch that automatically.

## 4. The notifications preview page (item 4)

**The defect.** `src/app/[locale]/notifications/page.tsx` rendered `<span className="btn
secondary sm">{d.markAllRead}</span>` and a second span for `{d.preferences}`, styled and shaped
exactly like the real, working buttons used elsewhere in the product, with no `onClick` and no
route behind either. The per-channel preference cells were pill-shaped elements with an
absolutely positioned circle offset to one side and a `transition: .15s`, the precise visual
grammar of an iOS or Material toggle switch, also with no handler and no persisted state. A
reader has no way to tell a decorative control from a working one by looking at it.

**What changed.**

The two fake buttons are removed outright, not disabled and not relabelled "coming soon". Codex
was explicit that they should not render as action-looking spans at all, and disabling a
button-shaped element still leaves a button-shaped element.

The switch shape is gone. Each channel cell is now a small static dot (a circle with no rail, no
travel distance and no transition), the same visual language the unread-item indicator already
uses elsewhere on the same page for "this is a status marker, not a control". Each dot carries
an `aria-label` stating the channel and state in words ("included in this preview" / "not
included in this preview") rather than leaving the state to be read from a shape.

A new, specific disclosure was added: `notifications.previewNotice`, rendered directly above the
channel table. It reads (EN): "Preview only. Selecting a channel here does not change anything
you receive, and SAT does not currently send email or push notifications for any category." This
is distinct from the generic `SampleBanner`, which discloses that the displayed content is
sample data; `previewNotice` discloses that the controls on this specific page are inert, which
is a different claim the banner never made.

The panel title changed from "How you're notified" to "Notification channels (preview, not
configurable)", so the label itself no longer implies live routing.

No email, push, or vendor integration was added. O12 (decision-register.md) remains
authoritative and unmodified: it holds all outbound notification pending ten explicit
conditions, none of which this package touches.

## 5. Regression protection (item 5)

Two test files carry the new guards, both run as part of `npm test`.

`src/lib/truthRepair.test.tsx`, new, 11 tests. Calls the actual route function
(`buildRequirementSuccessResponse`, exported specifically so a test can construct the real
response object rather than a copy a regex has to trust matches it) and the actual
`NotificationsPage` component via `renderToStaticMarkup`, not a source scan alone, per Codex's
instruction for this item. Covers: the success shape carries no `notified` or `match` field and
its key set is exact; a zero candidate count survives as the number 0; the retired `NOTIFIED`
constant and its three audience strings cannot reappear in the route's live code (comments
stripped before the scan, since this file's own comments legitimately name the retired constant
in prose); an unconfigured submission is refused with none of the retired claims; the requirement
success body and empty-interest state carry no completed-notification language in either
language; the retired `matchToday` and `audiencesNotified` dictionary keys are gone rather than
orphaned; the candidate count has real, non-empty label and caveat strings in both languages and
the label alone does not claim a match; the notifications page renders no `btn secondary sm`
decoy control; the page states its preview disclosure in the actual rendered HTML; the
switch-shaped pill radius, knob size and transition are gone from the rendered output; and the
generic sample-data banner and the new preview disclosure both render together.

`src/lib/requirementIntake.test.tsx`, extended. The pre-existing "no count on the success card is
a literal" test, which the type rename broke, was rewritten to assert `{done.candidateCount}` is
present, that neither `done.notified` nor `done.match` is referenced, and that neither the `Done`
type declaration nor any `setDone(...)` call carries a `notified` field, while keeping its
original property that no bare number renders as literal text. Four new tests hold the taxonomy
alignment described in section 3.

EN/AR dictionary parity is covered by the pre-existing `laws.test.ts` test "law: dictionary key
parity is exact between locales", which runs against the changed dictionaries unmodified and
passed.

**Full local result:** `npx tsc --noEmit` clean. `npm test`: 1740 passed, 0 failed, across every
existing suite plus the two files above. `npm run ar-lint`: clean. `node scripts/prose-scan.mjs`:
0 hardcoded prose strings on public page source (the gated tier); the notifications page is
counted in that gate and passed at 0.

## 6. What could not be verified from this session, stated plainly

Two things Codex's item 7 asked for could not be produced here, and neither is a defect in the
change itself.

**Push and deployment.** `tools/ship.py --auto` committed cleanly (`34e4b7c`) but the push was
refused by this session's git proxy: `access denied by the git proxy: saleemzeidan123/satmarkets
is not in this session's authorized repository set`. This is a session authorization boundary,
not a credential or code problem; the token file this script reads is present and the commit
itself is fine. Without a push there is no new Vercel deployment and therefore no deployment SHA
to report.

**Live EN/AR mobile/desktop verification and the disposable live POST.** `scripts/smoke.mjs` and
the two Playwright specs in `e2e/` are written to run against the live deployment
(`https://satmarkets-sat-markets.vercel.app` by default), not localhost, and a full `npm run
build` in this sandbox fails independently of this change: it cannot reach `fonts.googleapis.com`
to fetch the four `next/font` families the layout requires, which is a sandbox network allowlist
limitation, not something this package touches. With no deployment and no successful local
production build, there is no server this session can run the live checks or the disposable
preview-requirement POST against.

**What this leaves as evidence instead.** Everything in section 5, run directly against the
source in this working tree: the full unit and route-level test suite, the type check, the
Arabic linter and the prose scan, all green. What is not covered is genuinely live-only:
rendered pixel layout at each breakpoint, the RTL mirror in a real browser, and one full round
trip through the live database for a real `candidate_count`.

**What has to happen next.** Someone with push access to `saleemzeidan123/satmarkets` (or a
session this proxy authorizes for that repository) needs to push commit `34e4b7c` to `main`,
after which Vercel deploys automatically per the existing pipeline. Once that deployment exists,
`npm run smoke`, `npx playwright test`, and a real POST to `/api/requirements` with a uniquely
marked disposable title (something like `"PKG-TRUTH-REQ-1 live verification, delete after
read"`) against the live endpoint would complete the checklist this item asked for. That
disposable requirement should be removed afterward if the environment's data-retention policy
allows a direct delete; if not, it should be flagged rather than left to read as real demand.

## 7. O18, reported rather than built (item 6)

The instruction for this item was explicit: read O18's exact current state and report it, map
the missing route to already-approved work if one exists, and build no new mechanism in this
package. Nothing in this section is new code.

**What exists today.** `src/app/api/requirements/[id]/route.ts` exports `GET` only. There is no
`PATCH`, `PUT` or `DELETE` on that route, and a repository-wide search for `withdraw` finds
nothing in any requirement-related file. There is no edit or withdraw UI anywhere in
`src/app/[locale]/requirements/`. A poster who wants a requirement removed today has no
self-service path at all.

**What O18 already ruled, in full.** Decision-register row O18 has four clauses and a
sequencing condition, already approved by Codex and relayed by the owner on 2026-08-02.

(1) For a NEW anonymous requirement: issue a cryptographically strong one-time withdrawal token,
display it once at confirmation, and store only its hash. This is the mechanism named
"mechanism 2" in the underlying analysis.

(2) For requirements ALREADY POSTED, or for anyone who has lost their token: a manual
privacy-request route, gated on O5, because `/contact` still carries COUNSEL placeholders and a
request has nowhere to land until that clears.

(3) In the mature organization workflow, an authenticated user manages withdrawal from their own
dashboard.

(4) Reference code paired with the recorded email is explicitly REFUSED as a mechanism, in any
form, with or without a shared rate limiter. This is not deferred, it is closed.

**Sequencing, which is the actual blocker.** The ruling is recorded but its implementation was
not included in D37, the product sequence approved 2026-08-02. O18 implementation is named
explicitly in the PKG-E1-READINESS exclusions, and the package D37 places immediately after
PKG-E1-READINESS is the public-discovery experience, which does not touch requirement withdrawal
either. So the mechanism is chosen (clause 1, the withdrawal token) but has no slot in the
sequence yet; the next opportunity to place it is whatever sequencing decision follows the
public-discovery package.

**The mapping this item asked for.** The missing `PATCH`/`DELETE` on
`src/app/api/requirements/[id]/route.ts`, and the absent withdraw UI, are the exact surface
clause 1 of O18 would fill once sequenced: a one-time token issued at creation, a route that
accepts the token and clears `contact_name`, `contact_email`, `contact_phone` and closes the
brief, returning nothing distinguishable on failure so the route cannot be used to test whether
a given code is valid. None of that is built here. This gap should be treated as a P0 launch
blocker, not because the mechanism is undecided, but because it is decided and unbuilt: a
product that lets anyone post contact details with no way to ever retract them is not launch
ready regardless of how the rest of the checklist reads.

**What was explicitly not done.** No new mechanism, no code touching
`requirements/[id]/route.ts` beyond reading it, and reference-code-plus-email was not
implemented anywhere, consistent with clause 4's refusal.

## 8. Standing constraint, restated

This package is closed at the seven items above. Bulk import, the commercial enquiry workspace,
notification delivery infrastructure, the verification redesign, and every other Mobbin-derived
roadmap item remain exactly where D37 and the synthesis left them: not started. The next step is
for Saleem or Codex to authorize pushing `34e4b7c`, after which the live half of item 7 can
actually run, and after that, resume the approved sequence.
