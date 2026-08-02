# Handback: finding 203 and the three owner-facing items

One handback for the bounded batch Codex authorised after conditionally accepting
PKG-A11Y-1. Four items were commissioned: close finding 203 systemically, produce the
finding 117 owner-action card, finalise the ELITE-1 recruitment kit without sending it,
and produce a decision memo for finding 193 without implementing it. All four are done.
Nothing in the batch was implemented past the point Codex set, and nobody has been
contacted.

## 1. Commits

| Commit | What it carried |
| --- | --- |
| `bbdc22b` | Finding 203 slice A. The table, `src/lib/apiErrors.ts`, and the first routes |
| `b731f7f` | Slice B. The media and document routes |
| `81844ed` | Slice C. Four PostgREST leaks, three of them on routes that take no session |
| `085a4bc` | Slice D. The review and account surfaces |
| `0d62cb5` | Slice E. The requirement surfaces, the most public write paths the platform has |
| `994f02e` | Slice F. The listing page's two public writes. The last commit of the finding carrying a source change |
| `48352e3` | Slice G. The findings register row and status ledger sections 1, 2, 3, 5 and 9 |
| `0391130` | This batch. The finding 117 action card, the finalised ELITE-1 kit, decision O18, and the ledger rows that point at them |

## 2. Gates, at `0391130`

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | 0 |
| `npm test` | 1679 tests, 1679 pass, 0 fail, 30.9 seconds |
| `npm run ar-lint` | clean |
| `node scripts/prose-scan.mjs` | GATE 0 hardcoded prose strings in 0 files. BASE 372 in 16 files and NOTE 1781 remain deferred and are reported rather than gated |
| `node scripts/reflow-probe.mjs` | PASS. 14 viewport renders, EN and AR, 320x256 through 1280x1024, no horizontal scroll |
| `node scripts/radio-probe.mjs` | PASS. 5 groups, EN and AR, coarse pointer at 390 wide |
| Em dash | 0 in every file the batch touched |
| Vercel | `dpl_C7SXY5qnKLav7GDgtePvECN22pV5`, READY, target production, `meta.githubCommitSha` `039113086c9c4d90a2807692c02d6e0e076f2405`, built in 63.6 seconds |

`npm run build` still fails locally on four `next/font` errors because Google Fonts is
unreachable from this container. The Vercel READY build is the production build evidence,
and the SHA is read rather than the ready state alone.

## 3. Live EN and AR evidence

Read from the deployed build, not from the local tree.

| Surface | English | Arabic |
| --- | --- | --- |
| `/post-requirement` at `0391130` | 200, `<html lang="en" dir="ltr">`, the consent label present verbatim, `x-robots-tag: noindex, nofollow` | 200, `<html lang="ar" dir="rtl">`, the Arabic consent label present verbatim, no English half leaking onto the Arabic page, same `x-robots-tag` |
| A listing page at `994f02e` and `48352e3` | 200, `dir="ltr"`, all eight `enquiry` dictionary values present | 200, `dir="rtl"`, all eight Arabic `enquiry` values present |
| `GET /api/requirements` at `48352e3` | 200, 6 requirements, `sample: false` and `interest: 0` on every one, refs R-20417 to R-20422 | same payload, language independent |

The consent label was compared against the dictionary value rather than against a
remembered sentence, after an error earlier in this work where a guessed English string
produced a false negative.

## 4. What is genuinely closed

Finding 203's engineering is complete and deployed. A route states a stable `code` and
keeps its English sentence on the wire for the log and the API consumer; a client-side
`[en, ar]` table names that code in the reader's language. Measured at `994f02e`: 127
refusals across 16 route files all state a code, 76 codes are named in
`src/lib/apiErrors.ts`, 15 client files render the named sentence, and 11 guards read the
source so neither half can drift back. Four PostgREST leaks were closed on the way, three
of them on routes that take no session at all, which was an information disclosure and
not only a translation gap.

The register status is "Fixed and awaiting deployment verification" and deliberately not
"Closed". The reason is in section 5.

Three earlier figures in the slice D, E and F commit messages, 56, 73 and 80 codes, were
running additions and were never measured. The measured figure is 76. Commit messages are
immutable and are left as written; the corrected figure stands in the register row, the
ledger and here.

## 5. What requires human verification

| Item | What would settle it |
| --- | --- |
| Finding 203's rendered sentences | Every refusal in the finding is reached by a POST, and the only live channel available here is GET only and unauthenticated. One interactive session on the deployed preview, submitting an invalid enquiry, a viewing request for a time that has passed, and a requirement with a missing city, on the Arabic build, and reading each rendered sentence |
| The 22 accessibility findings from PKG-A11Y-1 | A physical device, an actual screen reader, or independent human judgement. 16 screen reader, 4 physical device, 2 human judgement. They stay recorded as fixed and awaiting independent verification, and no conformance claim is made for them |
| Finding 117 after application | The four post-application artefacts listed in the action card: the live function body, the grants comparison, the SQLSTATE 23514 refusal text, and the Arabic rendered refusal |

## 6. What remains owner-blocked

| Item | Blocked on |
| --- | --- |
| Finding 117 | Application of `supabase/migrations/20260801_requirement_city_is_never_assumed.sql`. Every Supabase write tool in this environment is permission denied and the egress proxy blocks the database. The full card is section 4 of `docs/owner-actions-adv-1c1.md`: preflight, application, verification, rollback, and the evidence that closes it. The preflight row count is a baseline for comparison and is explicitly not a count of affected rows, because no marker exists on an existing row saying its city was assumed |
| Finding 193 | Decision O18 in `docs/decision-register.md`. Nothing is implemented until the owner rules on the identity mechanism |
| ELITE-1 outreach | One sentence from the owner authorising it. Preparation is authorised and outreach is not, and the sheet previously ran the two together, which is corrected in its first section |
| The Arabic font workflow | Owner-side administration, recorded once as item 3 of `docs/owner-actions-adv-1c1.md` and deliberately not restated here or in any later package |
| O5, O12, O10, O13, O17 | Counsel, consent basis, permitted use and lawful basis. Each already holds a named surface shut in code rather than by convention |

## 7. Decision O18 in one paragraph

A requirement is posted with no account and no session, so at withdrawal time there is
nothing to authenticate against. Neither identifier that already exists can serve as a
secret: `ref_code` is sequential and is published on the public board, and the recorded
contact email is unpublished but low-entropy, so a code-and-email route confirms who
posted which requirement to anyone who asks. The textbook answer, a one-time emailed
link, is blocked twice over, because the product carries no email dependency of any kind
and O12 independently holds all outbound notification. O18 sets out four mechanisms, a
recommendation that is marked as a recommendation, the risks that bind whichever is
chosen, the recovery path when a token is lost, and the smallest implementation that
would be acceptable once the owner rules.

## 8. What was not started

No new accessibility package and no redesign package was opened. Codex asked that
engineering not begin another broad package merely to stay busy, and it has not. The next
package waits on this handback.
