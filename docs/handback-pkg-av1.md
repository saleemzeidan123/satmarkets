# PKG-AV1 handback: availability states are told apart by their words

Package closed 2026-08-01. Findings 46 (P1, closed) and 11 (P0, partially addressed).
Commit `b7349c4`. Production deployment `dpl_DRoPVDchC7Bhxj6QPgBTENuRABPj`, state READY.

## Scope

A tenant scanning `/listings` could not tell a space confirmed available three days ago from
one last confirmed two months ago. Both cards said "Available", neither carried a date, and the
only difference between them was a colour. That colour was the reserved verification green,
which the same card also spends on the verification tick, so a single card carried the reserved
colour twice for two unrelated claims: a check SAT ran, and a sentence the lister typed.

Three changes, all in the words rather than in the layout.

1. **The aging state stops claiming the space is available.** It now says when the lister last
   said so and lets the reader judge. `Last confirmed 34 days ago` / `آخر تأكيد قبل 34 يوماً`.
   This is the substantive product change. SAT does not know that a two-month-old affirmation
   still holds, so it no longer says so in the present tense.
2. **Every state carries its age in Western numerals, in both locales.** The freshness gradient
   now survives greyscale, colour blindness and a screen reader, because it is carried by the
   sentence rather than by the dot.
3. **Availability gives up the reserved green.** `availabilityTone()` is the single writer of
   the colour and cannot return it. Fresh takes `var(--harbor-d)`, which already serves as a
   positive status in `sat-platform.css` (`.statusdot.ok`). Aging takes `var(--slate)`, stale
   keeps `var(--status-stale)`.

The Arabic count goes through `formatCounted(..., { oblique: true })` because the preposition
`قبل` governs what follows: `قبل يومين`, never `قبل 2 يوماً`.

## The D24 follow-up ruling, answered without the owner

Finding 46 asked for an owner ruling on whether availability keeps the reserved green now that
verification uses it on the same card. It did not need one. The standing quality rule already
says verified green appears only for evidence-backed verification, and a date the lister typed
is not a check anybody ran. So the exception was **deleted** from `greenReservation.test.ts`
rather than narrowed. An exception that has to be explained on every card is not an exception.
Both listing surfaces left the green allowlist as a result.

## Files

| File | Change |
| --- | --- |
| `src/lib/availability.ts` | `availabilityAge`, `availabilityShortLabel` rewritten, `availabilityLabel` aging branch, new `availabilityTone` |
| `src/app/[locale]/listings/page.tsx` | browse card calls the two new functions; no inline colour |
| `src/app/[locale]/listings/[id]/page.tsx` | detail page calls `availabilityTone`; no inline colour |
| `src/lib/greenReservation.test.ts` | availability exception deleted; both listing surfaces removed from `ALLOW` |
| `src/lib/availability.test.ts` | 7 tests to 16 |
| `docs/findings-register.md` | 46 closed, 11 partially addressed |
| `docs/roadmap.md` | PKG-AV1 in the six anti-overengineering fields |

## Gates

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | 0 errors |
| `npm test` | 1359 tests, 1359 pass, 0 fail (was 1350) |
| `npm run ar-lint` | clean |
| `node scripts/prose-scan.mjs` | 0 |
| Production build | Vercel READY on `dpl_DRoPVDchC7Bhxj6QPgBTENuRABPj` |

Ten of the sixteen availability tests are new and specific to this package: distinct card and
full labels per state per locale, the aging state not containing `Available` or `متاح`, an age
present in every label, EN and AR agreeing on the number, no Arabic-Indic digits, the day-zero
`today` / `اليوم` case, the oblique dual, no reserved green in any tone, and a source scan
asserting that neither surface branches on `av.state` to pick a colour.

## Live evidence

The deployment at `b7349c4` serves and reaches the database:
`GET /api/listings?district=00000000-0000-0000-0000-000000000000` returns `{"listings":[]}` at
200 with `x-robots-tag: noindex` intact, so the release protection did not regress.

Real availability timestamps read back from the deployed preview corpus
(`GET /api/listings?asset=medical` on `satmarkets-bzc9oak5i-sat-markets.vercel.app`) rendered
through the shipped functions at the time of the fetch:

| Record | `availability_confirmed_at` | State | Card EN | Card AR |
| --- | --- | --- | --- | --- |
| SATM-057E66A0 Clinic Floor, Ajyad | 2026-06-27 | aging, 34 days | `Last confirmed 34 days ago` | `آخر تأكيد قبل 34 يوماً` |
| SATM-08283D8E Clinic Unit, Al Olaya | 2026-06-28 | aging, 33 days | `Last confirmed 33 days ago` | `آخر تأكيد قبل 33 يوماً` |
| SATM-160850E4 Polyclinic Floor, Al Malaz | 2026-06-15 | aging, 46 days | `Last confirmed 46 days ago` | `آخر تأكيد قبل 46 يوماً` |
| SATM-5DCC156E Clinic Floor, Ar Rawdah | 2026-06-15 | aging, 46 days | `Last confirmed 46 days ago` | `آخر تأكيد قبل 46 يوماً` |

Detail-page forms for the same records: `Last confirmed 27 Jun 2026` / `آخر تأكيد 27 يونيو 2026`.

**The finding this evidence produced, and it is the important part of this handback.** Every
record in the sample is in the aging state, and in every one of them
`availability_confirmed_at` equals `published_at` to the microsecond. No listing in the preview
corpus has ever been re-affirmed. Before this package every one of those cards said
"Available", flatly and with no date, about an affirmation between 33 and 46 days old. The
oldest rows cross the 60-day stale threshold on **15 August 2026**, at which point the corpus
begins telling readers to confirm availability with the lister. That is correct behaviour and
it is also a deadline: the re-affirmation half of finding 11 is now dated, not merely open.

**Stated limitation.** The rendered HTML of `/en/listings` and `/ar/listings` was not fetched.
The only live channel available in this environment is `mcp__Vercel__web_fetch_vercel_url`,
which is GET-only and returns the whole body into the transcript, and a full SAT browse page
overflows the tool-result limit. So the evidence above is deployed data plus the shipped pure
functions, not a screenshot of the deployed page. The label is a total function of
`availability_confirmed_at` and the locale with no branch on request context, and sixteen tests
gate it, but this is stated rather than claimed as page-level live evidence.

**Responsive position.** No layout changed. The availability row is the same flex row at the
same 10.5px mono size in the same card; only the string inside it is longer. The longest new
English string, `Confirm availability · last confirmed 65 days ago`, wraps within the card at
320px because the row already declares `alignItems: flex-start` and `lineHeight: 1.35` for that
purpose, and the dot is `flex: 0 0 auto` so it does not compress. The dot is `aria-hidden`
because it is now decoration: the sentence carries the whole signal.

## Blockers unchanged by this package

- Codex item 7, interactive-browser Advisor verification. Both channels remain environmentally
  blocked: the sandbox egress proxy 403s the deployment and Supabase, and the Chrome extension
  is not connected. A third channel now exists, `mcp__remote-devices__computer_*`, but
  `computer_list_granted_applications` returns no granted application. It was deliberately not
  requested, because the request raises an approval dialog on the owner's desktop and nobody is
  there to answer it. The owner can grant it on return.
- **New this package.** `mcp__Supabase__execute_sql` now returns
  `MCP error -32600: You do not have permission to perform this action` on this project, so the
  direct database channel used in earlier packages is gone. The deployed JSON API routes remain
  as a read path, which is what the evidence above used.
- ADV-1 append-only field-level corrections WRITE path (originates with ADV-6); PD4 deed checks
  under FAL blocked on O13 and O10; O10 to O16; finding 74; contract 6 and provider activation;
  the twelve Part E clauses for any mobility source; ADV-5C, no candidate dataset.
- Owner-side administrative: install `.github/workflows/arabic-font.yml`.

## Next package

**PKG-AV2, the re-affirmation the card now asks for.** The card tells a reader that an
affirmation is 46 days old. Nothing yet lets the lister renew it. The write path already exists
(`PATCH /api/listings/[id]` accepts `availability_confirmed_at` behind the field permission
check), so the missing piece is a lister-side action and the state that surrounds it, not new
plumbing. That closes the remaining half of finding 11 at its source, it is user-facing supply
work rather than dormant infrastructure, and the 15 August threshold gives it a real date.
