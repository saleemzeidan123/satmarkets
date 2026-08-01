# PKG-AV2 handback: the lister can answer the sentence their card is making

Package closed 2026-08-01. Finding 11 (P0), the remaining half.
Commit `ee9f3a9`, on top of `b7349c4` (PKG-AV1) and `24b6e69` (its closure).
Production deployment `dpl_9hctvptNTHBwpPQvBQKKhxScez4D`, state READY,
`satmarkets-o0a5iqtn0-sat-markets.vercel.app`.

## Scope

PKG-AV1 changed what a browse card says about availability. An affirmation older than
three weeks stopped claiming the space is available and started reporting its own age:
`Last confirmed 46 days ago` / `آخر تأكيد قبل 46 يوماً`. The deployed evidence taken at that
closure showed the whole preview corpus sitting in that state, with `availability_confirmed_at`
equal to `published_at` on every record, because nothing anywhere on the platform could move
that timestamp after publication.

So the card asked the lister a question they had no way to answer. This package is the answer.

Three changes, and one of them is a refusal.

1. **The lister is shown the occupier's sentence, not a paraphrase of it.**
   `listerAvailability()` returns the exact string `availabilityShortLabel()` puts on the card,
   in the exact colour `availabilityTone()` gives it, prefixed on the dashboard with
   `Occupiers see:` / `يرى الباحثون:`. A lister-side vocabulary would have been a second place
   to describe the same timestamp, and two descriptions of one fact drift.
2. **They are told what changes next and when, before they act.** A fresh affirmation says how
   many days remain before the wording stops saying available. An aging one says how many
   remain before occupiers are asked to check with the lister directly. A stale one says that
   has already happened. The countdown is computed from `FRESH_MAX_DAYS` and `STALE_MIN_DAYS`,
   the same two constants the public label reads, so the lister cannot be promised a date the
   card will not honour.
3. **One button, one listing, and it is labelled with the claim rather than the effect.**
   `Still available today` / `ما زالت متاحة اليوم`. It PATCHes `availability_confirmed_at` and
   nothing else, then refreshes.

**The refusal.** There is no bulk confirm-everything control, and this package will not grow
one. An affirmation SAT prompted into existence across a whole portfolio with a single click is
not more truthful than the date it replaced; it is the same guess with a newer timestamp, and
Law 3 says the date must be a real event. For the same reason the button is not called
"refresh" or "update": a control named after its effect on the display invites the lister to
think about their ranking, and a control named after its claim invites them to think about the
space.

Two scope decisions that follow from the same principle. The affirmation is offered only on a
listing that is actually on the market, because a paused or draft listing makes no public
availability claim and collecting an affirmation nobody reads is collecting a habit. And a
fresh listing is shown its state but offered no button, because affirming an affirmation that
is already current changes nothing an occupier reads.

## Files

| File | Change |
| --- | --- |
| `src/lib/availability.ts` | `ListerAvailability`, `listerAvailability()`, `daysUntilBoundary()`; the public label and tone functions unchanged |
| `src/components/AvailabilityReaffirm.tsx` | new; the one-listing affirmation control |
| `src/app/[locale]/dashboard/listings/page.tsx` | selects `availability_confirmed_at`; renders the public line, the note and the control per published row; bilingual copy and a second footer paragraph |
| `src/lib/availability.test.ts` | 16 tests to 27 |

No route changed. `PATCH /api/listings/[id]` already accepted `availability_confirmed_at`
behind `mayEdit()`, which permits it at any stage because availability is the lister's own
statement, and already rejected a future date and cleared on an empty string. This package is
UI and language on top of a write path that was correct and unreachable.

## Gates

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | 0 errors |
| `npm test` | 1370 tests, 1370 pass, 0 fail (was 1359) |
| `npm run ar-lint` | clean |
| `node scripts/prose-scan.mjs` | GATE 0 hardcoded prose strings in public page source; BASE unchanged at 364 in 16 files |
| Production build | Vercel READY, deployment recorded below |

Eleven new tests. The countdown arithmetic at both boundaries; the lister being shown the
occupier's exact sentence and tone across all three states and both locales; the
never-confirmed case carrying no invented day count; `worthReaffirming` false only for a fresh
affirmation; the countdown agreeing with the real thresholds in both locales; a stale
affirmation given no countdown because the change already happened; Western numerals in the
Arabic note; the oblique dual after `بعد` for the same reason `قبل` takes it; every state
saying something different in each locale; and two source scans, one asserting the dashboard
reads availability only through the module and offers the control only where the claim is being
made, one asserting the control sends the timestamp alone and has no bulk path.

The Arabic assertion that needed care: Arabic spells one and two rather than numbering them
(`يوم واحد`, `يومين`), so a test demanding the same digits in both locales would have been
demanding worse Arabic. It now asserts identical digits from three up, and the absence of
digits at one and two.

## Live evidence

Recorded at closure against the deployment named above.

**Stated limitation, carried forward from PKG-AV1 and narrower here.** The lister dashboard is
behind a session. The only live channel in this environment is
`mcp__Vercel__web_fetch_vercel_url`, which is GET-only and unauthenticated, so the rendered
dashboard cannot be fetched at all, not merely inconveniently. What was verified live is stated
below without inflation; what was verified by test and by the shipped pure functions is stated
as that.

### 1. The session gate holds, in both locales

Unauthenticated GET of the changed route:

| Check | `/en/dashboard/listings` | `/ar/dashboard/listings` |
| --- | --- | --- |
| Status | 200 | 200 |
| `x-matched-path` | `/[locale]/login` | `/[locale]/login` |
| Title | `Sign in \| SAT Markets` | `تسجيل الدخول \| سات ماركتس` |
| `x-robots-tag` | `noindex, nofollow` | `noindex, nofollow` |
| `cache-control` | `private, no-cache, no-store, max-age=0, must-revalidate` | same |
| Document | `<html lang="en" dir="ltr">` | `<html lang="ar" dir="rtl">` |

An anonymous reader receives the login page, not the dashboard. No PKG-AV2 lister copy appears
in either response body: `Occupiers see:`, `Still available today`, `يرى الباحثون:` and
`ما زالت متاحة اليوم` are all absent from both. The new lister vocabulary does not leak.

Release protection is unchanged by this package and was rechecked:
`/api/listings?district=00000000-0000-0000-0000-000000000000` returns 200 `{"listings":[]}`
with `x-robots-tag: noindex`.

### 2. The public sentence this package answers, live and at parity

Counted over the full rendered browse page on the deployment named above:

| String | `/en/listings` | `/ar/listings` |
| --- | --- | --- |
| `Last confirmed` / `آخر تأكيد` | 168 | 168 |
| `Available · confirmed` / `متاح · تأكد التوفر` | 8 | 8 |
| `Confirm availability` / `تأكّد من التوفر` | 0 | 0 |

Identical counts in both locales, which is the EN and AR parity check. The Arabic page carries
Western numerals only: the Arabic-Indic range `[٠-٩]` does not occur. Rendered pairs:

- `Last confirmed 33 days ago` / `آخر تأكيد قبل 33 يوماً`
- `Available · confirmed 17 days ago` / `متاح · تأكد التوفر قبل 17 يوماً`

Zero stale strings is the correct result for this corpus, not a gap: see the ages below.

### 3. Record-level corpus state at closure

Read from the deployed public JSON API (`/api/listings`), 50 published rows:

- `availability_confirmed_at` equals `published_at` on **all 50**. Nothing on the platform has
  ever been re-affirmed, which is correct: until `ee9f3a9` no control existed, and the control
  that now exists is behind the session gate proved above.
- Age distribution: 17 days on 1 row, 19 on 2, 33 on 7, 34 on 23, 46 on 17.
- Therefore 3 fresh, 47 aging, 0 stale.

**This corrects the PKG-AV1 closure note**, which said the whole sampled corpus was aging. Three
records are fresh. The distinction matters here because it is exactly the branch that is offered
no button, so both branches of `listerAvailability()` have real deployed data behind them rather
than one branch being exercised only by tests.

### 4. The lister-side sentences, generated by the shipped function at the real ages

Run against the five ages actually present in the deployed corpus, through the shipped
`listerAvailability()` rather than written by hand:

```
17 days  worthReaffirming=false  tone=var(--harbor-d)
  EN  Occupiers see: Available · confirmed 17 days ago
      Occupiers read this as available. In 5 days the line shows the age of the confirmation instead.
  AR  يرى الباحثون: متاح · تأكد التوفر قبل 17 يوماً
      يقرأ الباحثون العرض متاحاً. بعد 5 أيام يظهر عمر التأكيد بدلاً من كلمة متاح.

19 days  worthReaffirming=false
  EN  In 3 days the line shows the age of the confirmation instead.
  AR  بعد 3 أيام يظهر عمر التأكيد بدلاً من كلمة متاح.

33 days  worthReaffirming=true  tone=var(--slate)
  EN  Occupiers see: Last confirmed 33 days ago
      Occupiers are told how old the confirmation is, not that the space is available.
      In 28 days they are asked to confirm availability with you.
  AR  يرى الباحثون: آخر تأكيد قبل 33 يوماً
      يرى الباحثون عمر التأكيد لا كلمة متاح. بعد 28 يوماً يُطلب منهم تأكيد التوفر معك.

34 days  worthReaffirming=true   EN in 27 days   AR بعد 27 يوماً
46 days  worthReaffirming=true   EN in 15 days   AR بعد 15 يوماً
```

The public line in each of these is byte-identical to the string counted on the live browse page
in section 2, which is the whole point of change 1: one sentence, two readers.

### 5. Responsive and accessibility position

Stated honestly, because the authenticated surface could not be measured live in this
environment.

- The control is a standard `.btn secondary sm`, the same class every other dashboard row action
  uses, placed inside the existing `overflow-x: auto` wrapper on a `min-width: 640` table. It
  introduces no new breakpoint, no new layout primitive and no fixed width, so the 320, 360, 390
  and 430 pixel behaviour of this table is the behaviour it already had and which PKG-AV1 and
  earlier packages measured.
- The availability block is a `col` with `max-width: 330` and `line-height` 1.45 and 1.6, so the
  note wraps rather than forcing horizontal scroll at the narrow widths.
- The two result states are announced: `role="status"` on the confirmed state and `role="alert"`
  on the failure state. The button is a real `<button type="button">` with `disabled` during the
  write, so it is keyboard reachable and its busy state is not mouse-only.
- Colour is not the signal. Each of the three availability states says something different in
  words, and the lister note names the change and the day count, so the block survives greyscale
  and a screen reader. This is asserted by test across all three states and both locales.
- Not verified: the rendered authenticated page at any width, because it cannot be fetched. That
  is a limitation of this environment, not a claim that it was checked.

## Blockers unchanged by this package

- Codex item 7, interactive-browser Advisor verification. The sandbox egress proxy 403s the
  deployment and Supabase, the Chrome extension is not connected, and the third channel
  (`mcp__remote-devices__computer_*`) reports no granted application. It was deliberately not
  requested: the request raises an approval dialog on the owner's desktop and this session is
  unattended.
- `mcp__Supabase__execute_sql` returns `MCP error -32600: You do not have permission to perform
  this action` on this project, so the direct database channel is still gone. The deployed JSON
  API routes remain the read path.
- ADV-1 append-only field-level corrections WRITE path (originates with ADV-6); PD4 deed checks
  under FAL blocked on O13 and O10; O10 to O16; finding 74; contract 6 and provider activation;
  the twelve Part E clauses for any mobility source; ADV-5C, no candidate dataset.
- Owner-side administrative: install `.github/workflows/arabic-font.yml`.

## Next package

PKG-NM1, one name per listing in the reader's own language, wherever a listing is named.

ADV-3A.1 built `listingTitle()` to kill a specific defect: a listing whose English title reads
`Grade A floor, Al Olaya` and whose Arabic title is the bare reference code `SATM-A0DC83D0`. The
module's own header says the other language's title is deliberately not a rung on its fallback
ladder. Its source guard, however, enforces only the fallback to `reference_code`. The other
fallback the module forbids, borrowing the other language's title, survives at nine call sites
including the **public** `/brokers` page and every page of the lister workspace, in the form
`(ar ? l.title_ar : l.title_en) || l.title_en`. An Arabic reader on those surfaces is shown the
English title.

Grounded in record-level evidence rather than in route type: of the 50 published rows the public
API returns, `title_en` is blank on 0 and `title_ar` is blank on 1, and that one row is
`SATM-BB3FCB59`, published, district present, asset type `serviced`. It is the exact case
`listingTitle.ts` was written for and the exact case nine surfaces still get wrong.

Shaped like PKG-AV2, because the same principle applies: show the lister what the other side
reads. Migrate the surviving call sites to `listingTitle()`, widen the finding-66 source guard
from the reference-code fallback to the other-language fallback so the defect cannot return, add
the `districts` embed where a query lacks what the fallback ladder needs, and tell a lister on
their own row when their listing has no Arabic title and what an Arabic reader is shown instead.

Recorded in `docs/roadmap.md` in the six anti-overengineering fields at this closure.
