# Owner ruling 3 residual: the claims guard past the enforced tier

This closes the item `docs/ruling-3-4-closure.md` recorded at its own lines 316 to 321 as an
open question for a later package: `scripts/prose-scan.mjs` has two tiers and only the public
page source tier is enforced, so a corpus claim living in a library module, a route handler or
a generated content file was outside every gate. The residual named the shape of the fix as a
claims-only strict mode over the unenforced tier, matching the `CORPUS_BANNED` frames rather
than all prose.

It was measured before it was claimed as scope. The governing directive forbids implementing
what is already shipped, and a residual recorded three packages ago is exactly the kind of item
that gets fixed incidentally and then re-done. It had not been. Three shipped modules carried
corpus claims, one of them on a surface owner ruling 3 named explicitly.

## How it was measured

The measurement extracts the live `CORPUS_BANNED` array out of `src/lib/claims.test.ts` by
brace matching and evaluates it, rather than restating the frames in a second place. A
measurement that carries its own copy of the pattern list will drift from the guard the first
time the guard is tightened, and will then report a clean tree for a rule nobody is enforcing.
8 English frames and 7 Arabic frames. Comments are stripped before matching, by the same
`code()` rule the guard uses, so an explanatory paragraph that names a banned phrase in order
to say it is banned is not itself an offence.

Those 15 frames were then run over the 147 source files that `CLAIM_SOURCES` did not reach:
everything under `src` and `scripts` outside `src/components`, `src/app`, `src/lib/meta.ts` and
`scripts/og-cards.mjs`.

| Stage | Offenders |
| --- | --- |
| Before any correction | 20 |
| After `searchNote.ts` and `format.ts` | 17 |
| After `legalContent.ts` | 13 |

The remaining 13 are all in the two files that quote the needles as needles: 12 in
`src/lib/claims.test.ts`, which is the guard's own pattern list and its fixture strings, and 1
in `src/lib/agents/agents.test.ts`. A guard has to be able to write down what it forbids, and a
test of a correction has to be able to write down the wording it corrected, so test sources are
exempt as a set with that reason attached rather than one by one with a suppression comment.

## The record-level evidence

Every correction below starts from the production evidence table recorded in
`docs/ruling-3-4-closure.md`, not from the wording sounding strong. That table:

```
listings                93 rows, every one is_demo. 88 published, all 88 carrying
                        ownership_verified = true AND authorization_verified = true,
                        0 carrying an ad_permit_number.
account_verifications   0 rows.
verification_events     3 rows, all is_demo. Each basis text records that no Wathq
                        and no REGA lookup was performed.
listing_verification_events   94 rows on gate rega_permit, all is_demo.
```

Two facts out of it do most of the work here. No listing row carries an advertising permit
number, so any sentence asserting a licence authorisation over a result set is false at the
record level. And `account_verifications` is empty, so no account holder has been checked by
anyone, which makes a present-tense claim that owners are verified false rather than merely
optimistic.

## The three shipped modules

### 1. The advisor search note, `src/lib/search/searchNote.ts`

The largest of the three, because it is the sentence printed above every search result in both
languages, on a discovery surface owner ruling 3 named first. It read:

```
7 verified matches, owner-verified and deduplicated
7 مطابقات موثّقة. التحقق من المالك مباشرة، بلا تكرار، مع سند الترخيص
```

Three assertions, none of them supported by the query that produced the rows.

`/api/search` filters on `status = published` and on what the person asked for. It has never
filtered on `ownership_verified`. Calling every returned row a verified match asserts a property
of the corpus the search did not select for. `src/lib/gate.ts` is the truth source and
`ownerVerified` is `ownership_verified === true` alone.

Deduplication is not measured anywhere in this repository.

"مع سند الترخيص", a licence authorisation, is a permit claim, and 0 of 88 published listings
carry an `ad_permit_number`.

The correction is the one `726b72b` made to the home Owner-verified KPI: a count has to count
the thing its label names. The head counts matches, which is what the search returned, and the
owner-verified subset is a separate clause reported only when the caller has counted it off the
rows it actually rendered. `src/lib/useAdvisorChat.ts` now passes
`results.filter((r) => r.ownership_verified === true).length`, counted off the returned rows
rather than off the query, because the route does not select on that column and the badge is
therefore a property of the row and not of the request.

An absent count prints no verification clause at all. It does not default to the flattering
reading. A caller that has not counted must not have a claim invented on its behalf.

Arabic takes a prepositional phrase rather than an adjective on purpose. An adjective agrees
with its noun and the dual takes a dual adjective, which is why the old `verifiedMatch` counted
noun existed at all: it embedded the adjective inside seven agreeing forms. "بمالك موثّق"
governs the badge rather than the count and is invariant across every boundary, so Codex item
6's boundaries at 1, 2, 3, 10, 11, 99 and 100 stay meaningful without a second agreeing form to
keep in step. `verifiedMatch` is deleted from `src/lib/format.ts`; a grep first confirmed it had
exactly one remaining reference, which was the one being removed.

### 2. The legal draft, `src/lib/legalContent.ts`

Five claim sites and their Arabic twins. The file is generated-shaped but has no generator, and
carries `DRAFT. Pending licensed KSA counsel review.`, so it was edited in place with every
`[COUNSEL: ...]` marker left untouched and no new legal obligation introduced.

"verified owners and licensed brokers to publish verified listings" became "owners and licensed
brokers who have completed SAT's identity and licensing checks to publish listings", which is a
claim about a process this platform runs rather than about a state of a record.
"publishing verified listings and market data" became "publishing listings and market data",
because the verifying is already stated in the same sentence and the adjective was asserting it
a second time as a property of the corpus. "grounded in the verified index and Platform data"
became "grounded in the published Rent Index described above, attributed to the REGA Rental
Index (Ejar), and in other Platform data", which satisfies owner ruling 2's requirement that
every Rent Index reference retains its attribution. "Verified owners and licensed brokers can
also reach support from their account dashboard" became "Owners and licensed brokers with a
Platform account", because who may reach support is a question about having an account.

Every Arabic replacement keeps the shadda spelling ملّاك approved in owner ruling 2 and required
by the `AR_BARE_PLURAL` guard.

### 3. The guard itself, `src/lib/claims.test.ts`

`CLAIM_SOURCES` reached `src/components`, `src/app`, `src/lib/meta.ts` and `scripts/og-cards.mjs`.
It now reaches every non-test `.ts` and `.tsx` under `src` and every non-test script, which is
ledger C19 applied a third time: scope a guard to the claim rather than to the folder the claim
happened to be in when it was written.

The guard asserts its own reach, because a guard that can silently shrink is worse than no
guard: a file-count floor, six named files that must be inside it including the three corrected
here, and two test files that must stay outside it. A future refactor that moves a module or
narrows the walk fails on the assertion rather than on the absence of one.

`CORPUS_BANNED` itself is unchanged. One gap in it is noted and deliberately not closed here:
the frame `verified (…|matches|…)` is plural only, so a singular "1 verified match" would pass.
Widening to `matches?`, `listings?` and `facts?` has to be measured before adoption, because
"verified listing" in the singular may appear legitimately about a single record that is in fact
verified, and a frame that fires on a true statement teaches people to suppress the guard.

## The record correction

`docs/handback-adv-3b.md` and `docs/adv-3b-closure.md` both named owner ruling 3 and owner
ruling 5 as the next package. Both were already closed: rulings 3 and 4 in `41f4f8f`, `726b72b`,
`0d07cb8`, `b94b6b4`, `f6368c4` and `11c9518`, and ruling 5 in `b3e2dfa` during PKG-2A. That
error shipped in `1cb0bd5`.

Both documents are corrected in place, openly, naming the closing commits and stating that the
correction was made after the fact. They are not quietly overwritten, because the handback is
the document Codex reads to decide what is outstanding, and a record that silently changes its
own history is worth less than one that shows where it was wrong.

## Gate

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npm test` | 1028 pass, 0 fail (was 1021) |
| `npm run ar-lint` | clean |
| `node scripts/prose-scan.mjs` | 0 hardcoded prose strings in 0 files, exit 0 |
| Production build | see the handback for the deployment id |

`searchNote.test.ts` went from 25 to 31 and `claims.test.ts` from 72 to 73. No new test file was
created, so the explicit list in the `test` script is unchanged; that list is not a glob and a
file not named in it silently never runs.

One thing caught before the gate rather than by it: a literal em dash written into
`searchNote.test.ts`, in an assertion whose whole purpose was to check that no dash reaches the
rendered sentence. Sweep B of `scripts/ar-lint.mjs` bans the literal character across every
`.ts` under `src`, test files included, so the assertion would have failed the law it was
testing. It is written with the escaped form `\u2014`, which is the convention the rest of
the file already used for exactly this reason.

## Next

ADV-4, evidence half only under owner ruling 1: the bilingual Riyadh commercial bulletin with
published methodology, definitions, source, period, geography, statistic type, sufficiency,
limitations and corrections history, the canonical AI-facts pages and the structured data,
absorbing PD1, PD2 and PD3. The indexing half stays held on owner decision O11.
