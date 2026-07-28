# Owner rulings 3 and 4 closure: the claims correction package

Package: the ADV-1 precondition set from the owner directive of 2026-07-28, tasks
#108 (ruling 3, over-broad claims) and #109 (ruling 4, HBU comparables).

Commits, oldest first:

| Commit | Scope |
| --- | --- |
| `41f4f8f` | `/invest` corrected, HBU modelling comparables anonymised (rulings 3 and 4) |
| `726b72b` | the verified count made to mean verified; real parties removed from fabricated events |
| `0d07cb8` | `/about` states a verification standard instead of asserting one already met; seven unreferenced sections deleted |
| `b94b6b4` | discovery, listing, requirement and advisory surfaces describe the record |
| `f6368c4` | home page, footer, social card and advisor API describe the record |
| `11c9518` | the home hero trust chip states the launch standard instead of a completed owner check |

Deployment verified: `dpl_9kQ6BtQTTgk2e51uWn4MoHgQa6E8`, state READY, target
production, sha `11c9518e4544e2b4a3982a28ccffc1ba443ccd54`.

## What the rulings asked for, and what the package actually did

Ruling 3 asked for the roughly one hundred remaining over-broad claims to be audited
and corrected, `/invest` first, then public discovery, listing, lister, requirement,
research and advisory surfaces, with the crucial qualifier that claims must be
determined from actual record-level evidence and never inferred from route type or
generic wording. Ruling 4 asked that HBU comparables be anonymised unless each named
comparable carries a lawful, documented public source and permission for this use.

The qualifier in ruling 3 is the part that shaped the whole package. It is easy to
sweep a codebase for the word "verified" and soften every hit, and the result of doing
that is a platform that has stopped claiming things it can prove alongside the things
it cannot. So every correction in these six commits starts from a query against
production data, and the ledger row for each one records the query result rather than
the reasoning. The evidence base was:

```
listings                93 rows, every one is_demo. 88 published, all 88 carrying
                        ownership_verified = true AND authorization_verified = true,
                        0 carrying an ad_permit_number.
accounts                10 rows, every one is_demo. owner/verified 7, sat/verified 1,
                        broker/verified 1, occupier/unverified 1. No licence column.
account_verifications   0 rows.
requirements_public     6 rows. No verification column exists on this table.
buildings               75 rows, all is_demo. No verification column.
rent_index_published    7 rows, all sufficient = true, period 2026-Q2,
                        source "REGA Rental Index (Ejar)", data_class synthetic.
verification_events     3 rows, all is_demo. Each basis text records that no Wathq
                        and no REGA lookup was performed.
listing_verification_events   94 rows on gate rega_permit, all is_demo.
```

Two consequences of that table are worth stating plainly, because they are what most
of the corrections turn on. First, `account_verifications` is empty, so no account
holder on this platform has been checked by anyone, which makes every present-tense
claim that owners are verified false rather than merely optimistic. Second,
`requirements_public` has no verification column at all, so "verified occupiers" was
not an overstatement of a weak signal, it was a description of a field that does not
exist.

The distinction the package kept throughout is between a claim about a record and a
claim about a standard. "Owners are verified before listing" is a claim about records
and it is false. "At launch, owners are checked before listing" is a claim about the
standard the exchange will operate to, and it is true and worth making. Nearly every
correction here is that conversion, following the pattern C23 and C31 set earlier,
rather than a deletion. Deleting the sentence would have been cheaper and would have
lost something real.

## Scope delivered

**`/invest` and HBU (`41f4f8f`).** Corrected first, per the ruling's ordering. The
underwriting surface carried the strongest claims on the platform because it is the
one that reads as decision-grade by nature. The HBU comparables were named real
parties supporting a fabricated model, which is the ruling 4 case exactly, and they are
now anonymised. HBU remains illustrative and stays behind `PRIVATE_PREFIXES` in
`src/lib/routePolicy.ts`, so `src/middleware.ts` continues to serve it
`X-Robots-Tag: noindex, nofollow` regardless of `ALLOW_INDEX`, until its evidence and
regulatory gates clear.

**The verified count (`726b72b`).** The home KPI labelled "Owner-verified" was counting
three different facts and calling all of them verification: a checked owner, a broker's
authorisation to market, and the row simply being our own stock. `src/lib/gate.ts` is
the truth source and says `ownership_verified === true` is the only one of those that
carries the claim, so both the SQL count in `src/app/[locale]/page.tsx` and the
per-card badge now read that field alone. The same commit removed real named parties
from fabricated deal events on the term sheet surface, which is ruling 4 applied
outside HBU.

**`/about` (`0d07cb8`).** The page asserted a verification regime already in operation.
It now states the standard the exchange will hold itself to. Seven sections that
nothing referenced were deleted rather than reworded, because unreferenced copy is
where stale claims survive audits.

**Discovery, listing, requirement and advisory surfaces (`b94b6b4`, `f6368c4`).** The
bulk of the corpus. Dictionary copy in both locales, plus the component and script tier
that the new source-tier scan surfaced, plus the advisor API's system prompt and its
deterministic answers, plus the JSON-LD organisation description, plus the Open Graph
cards. Two of those deserve a note. The JSON-LD description is read by a crawler with
no page around it to qualify anything, so it now describes the organisation by what it
is and by the one credential that is evidenced, the FAL licence. The Open Graph cards
were regenerated from `scripts/og-cards.mjs` for the same reason: a share card travels
away from the page that would have qualified it.

The meta description on `/post-requirement` was handled differently from the page copy
above it, and the reasoning is recorded as C32. The dictionary keeps the recipient
restriction in `postReq.intro` and in the consent label, because narrowing who receives
a requirement is a promise to the person posting it and must not be weakened. A meta
description is not that promise. It is read in a search result, away from the page and
away from the preview notice, so it states who can respond without asserting they were
checked.

**The home hero trust chip (`11c9518`).** Found by reading the deployed Arabic page
after `f6368c4` shipped, not by a test. An enumeration of the root توثيق on `/ar`
returned eight occurrences, seven of them correct, and the first was a chip sitting
directly under the hero with a green tick beside it. Rescoped in both languages, using
the same verb as `list.intro` ("checked" / "يُفحص") rather than the verification
vocabulary the badge system owns.

The tick mattered as much as the words. `#3ECF8E` is a third green, outside the two
that `src/lib/laws.test.ts` guards, and it sits in the verified family. A green tick
reads as "confirmed" wherever it appears, which is the whole reason
`src/styles/sat-platform.css` reserves `--verified` (`#1B7A50`) for evidence-backed
verification. Spending a verified-looking mark on a launch-scoped promise would have
reinstated in colour the claim the wording had just given up. The three ticks in that
row now use `#C4DAF2`, the harbour tint already present in the same file as the h1
highlight, so no new palette literal entered the repo. The change was held to that one
row on purpose: the standing constraint is not to open another broad cosmetic colour
sweep, and the palette consolidation is a separate parked package.

## The guard, and the lesson it repeats

`CORPUS_BANNED` in `src/lib/claims.test.ts` already banned both shapes of the hero chip
claim, and both escaped, because both patterns had been written to the exact grammar
the defect was first seen in. The English pattern required a copula (`owners are
verified before`) and the chip had dropped it (`Owners verified before listing`). The
Arabic pattern required `يتم` and the chip had dropped it and spelled the noun with the
ruling 2 diacritics (`توثيق المُلّاك قبل الإدراج`, codepoints `627 644 645 64f 644 651
627 643`). Both are now frame-matched:

```ts
[/every listing is verified|owners? (?:are |get )?verified before|we verify (the parties|every)/i, ...]
[/توثّق سات كل|توثيق ال[^ ]{2,6}ك قبل/, ...]
```

Both were validated in Node against the old and new strings before shipping: the Arabic
frame matches `توثيق المُلّاك قبل الإدراج` and `يتم توثيق الملاك قبل النشر`, and does
not match `عند الإطلاق، يُفحص المُلّاك قبل الإدراج`.

This is the C19 lesson for the third time and it is now written into the ledger in
those words: a pattern written to the shape a defect was first seen in will not find the
same defect in another shape. Every guard added by this package is a frame match rather
than a literal.

## Records

`docs/claims-ledger.md` now holds 40 rows, C1 to C40, each naming the surface, the
claim as it stood, the record-level evidence that determined the verdict, and the
correction. `src/lib/claims.test.ts` holds 18 tests. The corpus scan runs over both
dictionaries and, since this package, over the component and script tier as well, which
is what surfaced nine of the corrections in `f6368c4`.

## Tests

The full ship gate, run before each of the six commits and green each time. Final state
at `11c9518`:

```
npx tsc --noEmit                 exit 0
npm test                         # tests 401  # pass 401  # fail 0
npm run ar-lint                  ar-lint: clean
node scripts/prose-scan.mjs      GATE public page source: 0 hardcoded prose strings in 0 files
                                 BASE shared component source: 327 in 16 files (not enforced)
dash and numeral check           3 files checked, 0 with defects
```

Test count moved from 400 at `f6368c4` to 401 at `11c9518`.

## Live evidence

Fetched from the deployed preview with a cache-busting parameter after
`dpl_9kQ6BtQTTgk2e51uWn4MoHgQa6E8` reached READY.

**English, `/en`.** The three hero chips read "At launch, owners checked before
listing", "No assumed commission", "FAL 1200025510". The exact string "Owners verified
before listing" does not appear anywhere on the page. H1: "Where Saudi business finds
commercial space it can check". KPIs: 88 published listings, 100% owner-verified, 77
districts indexed, 75 buildings. Western numerals throughout.

**Arabic, `/ar`.** H1: "حيث تجد الأعمال السعودية مساحات تجارية يمكن التحقق منها". An
enumeration of the root توثيق across the whole page now returns only defensible uses:
`100% موثّقة من المالك` (the KPI, counting `ownership_verified` alone since C4),
`موثّق من المالك` on four listing cards (per-row `ownership_verified`), and
`لكل عرض حالة توثيقه` twice, which is a neutral statement that each listing displays
its own verification state rather than a claim about any of them.
`توثيق المُلّاك قبل الإدراج` is absent. `عند الإطلاق، يُفحص المُلّاك قبل الإدراج` is
present. Western numerals throughout, and the Rent Index attribution retains
`المؤشر الإيجاري للهيئة العامة للعقار (إيجار)`.

## Responsive evidence

Both channels that previous packages used for this are down, and the substitute is
weaker. That is stated first so the numbers below are read at their real weight.

The extension bridge returns "Browser extension is not connected", so the PKG-2A method
of driving the live page inside a same-origin iframe cannot run. Container Chromium
cannot reach the deployed host either: `page.goto` on the preview fails with
`net::ERR_TUNNEL_CONNECTION_FAILED` through the egress proxy at `http://127.0.0.1:46537`.

So `scripts/responsive-probe.mjs` was written, and it is committed rather than left in
scratch, because the capability is now missing from the toolchain and will be needed
again. It reproduces a fragment locally against the repository's own CSS: `globals.css`
compiled through the repo's own tailwind, so preflight and the type scale and the
`[dir="rtl"]` block are all present in source order, plus `sat-platform.css` verbatim,
so `.row`, `.gap8`, `.gap20`, `.wrap` and the `.satmkt-hero` padding overrides at 680px
and 600px are the shipped rules. The markup is copied out of `MarketingHome.tsx`
character for character, inside the full padding chain rather than in isolation.

The declared substitution: the two faces come from `@fontsource` rather than
`next/font/google`. Same families and weights, but next/font subsets and self-hosts its
own copies, so glyph advance can differ slightly. The deployed font chunk was fetched
and confirms the families and their fallback metrics
(`__Hanken_Grotesk_c8454b`, `size-adjust: 100.94%`; `__IBM_Plex_Sans_Arabic_92a6d2`,
`size-adjust: 101.17%`), so the substitution is the same typeface, not an approximation
of one.

```
loc  vw    content  fs    doc ovf  row ovf  lines  widest  minH  item heights
en   320   284      13px  0        0        3      257.8   19.5  19.5 / 19.5 / 19.5
en   360   324      13px  0        0        2      257.8   19.5  19.5 / 19.5 / 19.5
en   390   354      13px  0        0        2      257.8   19.5  19.5 / 19.5 / 19.5
en   430   394      13px  0        0        2      257.8   19.5  19.5 / 19.5 / 19.5
en   768   728      13px  0        0        1      257.8   19.5  19.5 / 19.5 / 19.5
en   1280  920      13px  0        0        1      257.8   19.5  19.5 / 19.5 / 19.5
ar   320   284      13px  0        0        2      208.3   19.5  19.5 / 19.5 / 19.5
ar   360   324      13px  0        0        2      208.3   19.5  19.5 / 19.5 / 19.5
ar   390   354      13px  0        0        2      208.3   19.5  19.5 / 19.5 / 19.5
ar   430   394      13px  0        0        2      208.3   19.5  19.5 / 19.5 / 19.5
ar   768   728      13px  0        0        1      208.3   19.5  19.5 / 19.5 / 19.5
ar   1280  920      13px  0        0        1      208.3   19.5  19.5 / 19.5 / 19.5

PASS  12 measurements, 0 horizontal overflow, no item wider than its content box
```

The measurement that mattered: the English `micro1` string grew from 30 characters to
39, and the widest chip is 257.8px against a 284px content box at 320px, so it still
fits on a line of its own. The row wraps to three visual lines at 320px and two from
360px up, which is the intended behaviour of `.wrap`. These chips are static text and
not interactive, so the 44px touch-target floor does not apply to them.

Scope of this evidence, stated honestly: it covers the fragment this package changed.
It is not whole-page overflow evidence, which remains PKG-2A's measurement of
`/listings` at the same six widths, and it does not extend to the other public surfaces,
which stay unmeasured and are recorded as such against finding 26.

## A defect the probe found, deliberately not fixed here

Writing the probe exposed that the Arabic size uplift has never applied. `globals.css`
line 122 sets `[dir="rtl"]{ --fs-cap:11px; --fs-3xs:12px; --fs-2xs:13px; --fs-xs:14px;
--fs-sm:15px; --fs-base:17px; }` with a comment explaining that Arabic's meaningful
detail sits in fine loops and dots so it must be set a notch larger. Line 395 then sets
`:root{ --fs-cap:9px; ... --fs-sm:13px; --fs-base:14px; ... }`. Both selectors have
specificity (0,1,0), so the later one wins, and every one of the six tokens the RTL
block declares is overridden by the block 273 lines below it. Arabic renders the Latin
scale everywhere.

This is measured rather than reasoned. The probe reports computed `font-size: 13px`
under `dir="rtl"` at all six widths, and the ordering is visible in the compiled output
(`--fs-sm:15px` at byte 29783, `--fs-sm:13px` at byte 48444).

It is not fixed in this package, and the reason is not scope discipline for its own
sake. The fix is one line. Its blast radius is the type size of every Arabic surface on
the platform, and the two channels that could measure that blast radius are exactly the
two that are down. Shipping a site-wide Arabic type increase with no way to check what
it overflows would be trading a known small defect for an unknown set of larger ones.

Finding 27 in `docs/findings-register.md` has been corrected from "Partially addressed,
AR --fs scale raised" to "Confirmed open, previous fix does not apply", with the
evidence above. It becomes the first item of the parked visual-quality package, where
the type scale lock already sits.

## Remaining blockers

**Owner decision, not to be actioned here.** The Supabase advisor reports row level
security disabled on `public.spatial_ref_sys` and `public.map_anchors`, both rated
critical. Per the tool's own instruction this is surfaced rather than remediated:
enabling RLS without first writing policies blocks all access to those tables, and
`map_anchors` is read by the map surface. The remediation needs the owner's decision on
the policy shape before any migration is applied.

**Environment, no owner action available.** The Chrome extension bridge is
disconnected and container Chromium cannot reach the deployed host. The consequence is
recorded above: live responsive measurement and live browser interaction are both
unavailable, and `scripts/responsive-probe.mjs` is a partial substitute for the first
of those only.

**Carried verification debt.** `docs/adv-0-closure.md` records that one EN and one AR
advisor message should be sent on the deployed site and a normal answer confirmed in
each. That needs a connected browser and is still open.

**Owner administrative, unchanged.** `.github/workflows/arabic-font.yml` is delivered
and must be installed by the owner. The deploy PAT does not carry `workflow` scope and
a workflow-scoped token is not to be requested, per the standing instruction.

## Items closed or recorded, not carried

Owner ruling 5, the `/listings?city=riyadh` raw-slug display defect, was already closed
in `b3e2dfa` during PKG-2A by the tolerant `cityKey` and `cityLabel` fold in
`src/lib/labels.ts`. It is recorded here rather than carried forward, because the
directive asked for it in "the next suitable package" and it had in fact been fixed one
package earlier.

The surviving `#3ECF8E` at `MarketingHome.tsx:221` is the hero eyebrow status dot. It
asserts nothing about any record, so it was left alone deliberately, and the count is
pinned at exactly one by a test so it cannot spread. It is a finding for the parked
visual package alongside the type scale lock.

An open question for a later package, recorded so it is not lost: `scripts/prose-scan.mjs`
has two tiers and only the public page source tier is enforced. The shared component
tier stands at 327 strings in 16 files, and nine of this package's corrections came out
of it. That tier cannot be enforced wholesale without a large migration, but a
claims-only strict mode over it, matching the `CORPUS_BANNED` frames rather than all
prose, would close the gap that let the hero chip ship.

## Next package

ADV-1 proper. The evidence and entity foundation: field-level provenance, verification
states, freshness, confidence, correction history, source restrictions and a reusable
Evidence Passport, with `ownerVerified` in `src/lib/gate.ts` remaining the single
verification truth source and AI never converting unknown data into known data. Its
preconditions, tasks #108 and #109, are closed by this package.
