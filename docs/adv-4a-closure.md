# ADV-4A: the canonical machine-readable facts

ADV-4 in `docs/roadmap.md` names "the canonical AI-facts pages" alongside the bilingual
bulletin and the structured data. This is the facts half. It ships first because the scoping
found that the two files carrying the platform's strongest claims are the two files no gate
had ever read.

## What was outside the guard, and why that matters

`src/components/JsonLd.tsx` was corrected under owner ruling 3. Its organisation description
now reads "Commercial real estate exchange for Saudi Arabia. Powered by SAT Real Estate (REGA
FAL licence 1200025510). Open to the market." That correction happened because `CLAIM_SOURCES`
walks `src`, and the structured data happens to live there.

`public/llms.txt` and `public/manifest.webmanifest` are the same class of artefact: a claim
written for a machine, read without the page around it to qualify it. They are shipped verbatim
to the origin, so they pass through no dictionary, no component, no middleware and no prose
gate. Both still read `Verified commercial real estate exchange for Saudi Arabia`, the exact
positioning frame `CORPUS_BANNED` has banned since ruling 3, sitting untouched two folders away
from the file that bans it.

That is the ledger C19 lesson a third time: scope a guard to the claim, not to the folder the
claim happened to be in when the guard was written.

## The frames, widened on measurement rather than on instinct

`docs/ruling-3-residual-closure.md` deferred this deliberately, at its own lines 138 to 142: a
frame that fires on a true statement teaches people to suppress the guard, so widening had to be
measured first. It now has been.

Both corpus frames were adjacency-only. The noun had to sit immediately beside the adjective, so
one intervening word walked straight past them. In English that is `verified commercial space`
and `verified commercial listings`. In Arabic the adjective follows the noun, so the intervening
word sits between the two: `مساحة تجارية موثّقة`. The noun lists were also simply missing assets
and property. Both frames now allow a single intervening word and carry the missing nouns, and
the Arabic frame is built once from a noun list and an adjective rather than spelled out as an
alternation of every pairing, because an alternation of pairings is what produced the gap.

The actor-class frames are deliberately not widened the same way, and this is the part worth
reading. Measured across the whole tree, adding singular `owners`, `brokers` and `parties` to
them fired five times, on no false claim and on five true ones:

```
src/lib/search/searchNote.ts    "4 matches, 4 with a verified owner"
                                the subset counted off the rows the search returned
src/app/api/requirements/[id]/interest/route.ts   "Only verified owners and brokers can
                                register interest"  enforced two lines below by
                                acct.verification_status !== "verified"
src/app/api/requirements/[id]/matches/route.ts    the same rule on the sibling route
src/lib/translate/glossary.ts   the glossary entry for the term itself
src/lib/legalContent.ts         "facilitating enquiries between verified parties",
                                inside the PDPL lawful-basis clause
```

A set claim is false at the record level because no query selects for it. A singular claim about
one record can be simply true. Widening the actor-class frame would therefore have bought three
path exemptions and two suppressions in exchange for catching nothing, and an exemption list is
where a guard goes to stop being read. The corpus frames were widened; the actor-class frames
were left alone; nothing needed an exemption. The final measurement over 269 files reports five
offenders and every one of them is a real claim.

## The five offenders and what each became

### 1 and 2. `public/llms.txt`

The positioning claim and `verified commercial listings`, a corpus claim the old adjacency frame
missed by one word.

Two further defects the claim frames could never have caught. The file advertised `/en/area`,
which `routePolicy.ts` holds out of indexing under the audit rank register, and `/en/find`, which
is a private account surface. So the middleware sent `noindex` for both while the file published
for machines invited a crawler to cite them. That is a louder contradiction than an unlisted page.

And nothing in it disclosed the demonstration state. Every listing row in the database carries
`is_demo`. A model reading this file and quoting a sample rent as a market rent would have been
misled by the file rather than by the platform.

Rewritten as the canonical facts file: the nine sitemap routes and nothing else, each described
from its own shipped meta description rather than from new copy; a status section reusing the
shipped `layout.preview` wording; the REGA Rental Index (Ejar) attribution on every line that
names the Rent Index, per owner ruling 2; and citation rules covering the average and median
distinction, Western numerals, and the fact that a path not listed is either held or private.

### 3. `public/manifest.webmanifest`

The same positioning claim, plus two more. `a decision-grade rent index` describes figures that
are REGA's, republished, and labelled indicative on every surface that renders them. `AI search`
describes a capability that is switched off: `AI_AGREEMENT_IN_FORCE` is false, so search runs its
deterministic parser and calls no provider. The description now states the exchange, the index
with its source, and the one property of search that is true today.

### 4 and 5. `src/components/SignupFlow.tsx`

The role chooser offered `Find and lease or buy verified commercial space` and `Underwrite
verified assets with sourced data`, with their Arabic twins. Both assert a property of the
inventory. The owner and broker subtitles beside them are plain descriptions of an action with no
claim in them at all, so the two corrections take that shape rather than inventing a hedge:
`Find, compare and lease or buy commercial space` and `Underwrite assets with sourced data`.

## Triaged and not corrected

`SignupFlow.tsx` also carries `Every account on SAT Markets is verified by a person before it
opens` and `Every account is reviewed by SAT before it opens; no unverified account can list`.
Recorded here rather than corrected, because they are a different class. Both are forward-looking
statements of the process the applicant is entering, and the next clause is literally "Here is
what happens next". They state a policy rather than a count, so no record contradicts them the
way the empty `account_verifications` table contradicts a claim that accounts have been checked.
Written down so that leaving them is a decision rather than an oversight.

## The guard now reaches `public/`

`CLAIM_SOURCES` gains every `.txt`, `.webmanifest` and `.json` under `public/`, and the self-reach
test names both files so a future refactor that narrows the walk fails on the assertion rather
than on the absence of one.

One detail that matters more than it looks. The comment stripper `code()` is a TypeScript rule.
Applied to a manifest or a text file it deletes content rather than commentary, which would be a
way for a claim to hide from the guard inside the guard. It now runs only on the extensions it
was written for, and public assets are matched raw.

## `src/lib/publicFacts.test.ts`

Six tests holding the rules that are specific to a facts file rather than to a claim, all read
against `routePolicy.ts` rather than against a copy of the route list:

* Every locale-prefixed path in `llms.txt` is in `SITEMAP_ROUTES`.
* No `HELD_ROUTES` path and no `PRIVATE_PREFIXES` surface appears. Matched on the parsed route
  rather than on a substring, because `/list` is a private prefix and `/listings` is a published
  route, and a substring test would report the sitemap's own listings page as private and would
  then have to be suppressed.
* Every line naming the Rent Index carries the REGA Rental Index (Ejar) attribution. Asserted per
  line, not per file, because a facts file is quoted a line at a time and the line that gets
  quoted is the one that has to carry the source.
* The demonstration state is disclosed.
* The manifest description carries none of its three defects and does name the index source.
* Both files obey the dash law, law 7, the FAL law and law 5. `public/` is outside
  `scripts/ar-lint.mjs`, which walks `src` only, and outside the prose gate, so these four laws
  had no other enforcement on these two files at all.

Two of those laws caught this package while it was being written, which is the argument for
having them. The Law 5 sweep in `brand-color.test.ts` failed on the new test file because the
file quoted the retired gold literally; the needle is now assembled from parts, the same way that
guard assembles its own. And the route regex initially read the ellipsis in `/en/... and /ar/...`
as a route named `/`, which the sitemap test caught on its first run.

## Gate

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npm test` | 1034 pass, 0 fail (was 1028) |
| `npm run ar-lint` | clean |
| `node scripts/prose-scan.mjs` | 0 hardcoded prose strings in 0 files, exit 0 |
| Production build | `dpl_6h9Eh7vrLiujSNK64aDQxNV5rLxk` READY, commit `8cfb7ba` |

`src/lib/publicFacts.test.ts` is a new file and is registered in the explicit list in the `test`
script. That list is not a glob and a file not named in it silently never runs.

## Live evidence

Taken on `dpl_6h9Eh7vrLiujSNK64aDQxNV5rLxk`, commit `8cfb7ba`, READY. The operating rules require
verifying the deployed preview rather than relying on local results, and this package is the case
where that distinction is not a formality: two of the four corrected files are static assets in
`public/`, so the only way to know they are corrected is to read what the origin actually serves.

`GET /llms.txt` returns `200`, `content-type: text/plain; charset=utf-8`,
`x-robots-tag: noindex`, and the rewritten file byte for byte. The first line of the served body
reads `# SAT Markets (satmarkets.sa)` and the description line reads `Commercial real estate
exchange for Saudi Arabia, powered by SAT Real Estate (REGA FAL licence 1200025510)`. The banned
positioning frame is not in the served body. Neither `/en/area` nor `/en/find` appears; the nine
routes named are exactly `SITEMAP_ROUTES`. The sample-data disclosure is served in the second
section, which is the part that matters most, because a model quoting this file never loads the
page that carries the preview banner.

`GET /manifest.webmanifest` returns `200`, `content-type: application/manifest+json`, and the
served `description` is `Commercial real estate exchange for Saudi Arabia. Riyadh-first leasing and
sales, a rent index republished from the REGA Rental Index (Ejar), and search that never invents a
figure.` `theme_color` is served as `#3A6EA5`. None of the three defects is present in what the
origin returns.

`/en/signup` and `/ar/signup` were fetched from the deployment and the served DOM searched for the
old and the new wording by exact string, rather than read end to end. Both corrections are present
once each and neither superseded string appears at all:

```
/en/signup   "Find, compare and lease or buy commercial space"   1
             "Underwrite assets with sourced data"               1
             "verified commercial space"                         0
             "Underwrite verified assets"                        0
/ar/signup   "ابحث وقارن واستأجر أو اشترِ مساحة تجارية"                    1
             "قيّم الأصول ببيانات مُسندة"                                  1
             "مساحة تجارية موثّقة"                                        0
             "أصولاً موثّقة"                                              0
```

The Arabic above is read out of the served document as text, not transcribed from an image, which
is what Codex item 5 asked for after the mojibake in an earlier handback. `/ar/signup` serves
`<html lang="ar" dir="rtl">` and `/en/signup` serves `<html lang="en" dir="ltr">`, so the
corrected strings land in a true RTL document rather than in a mirrored English one.

The four global laws that `publicFacts.test.ts` now holds over the two public files were also
measured against both served signup documents, since a static test cannot see what a component
composes at request time: zero literal em or en dashes, zero Arabic-Indic numerals in either
locale, zero occurrences of the retired FAL number, zero occurrences of the retired gold.

No responsive re-measurement was taken for the two signup subtitles. Both corrections are shorter
than the strings they replace, in both languages, on the same element, so neither can introduce an
overflow the previous wording did not already have.

## Next

ADV-4B, the three pages the roadmap names as buildable now without any permission: the
verification-meaning page, built from `gate.ts`, `evidence.ts` and `listingVerification.ts`; the
source-policy page, built from `sourceRights.ts` and the source registry, including the standing
constraint that srem.moj.gov.sa and the Najiz portals are interactive portals rather than data
products and are never scraped; and the bilingual terminology page, which today is a four-line
redirect stub at `/[locale]/bilingual`. All three ship noindex. The indexing half of ADV-4 stays
held on owner decision O11, and anything drawing on `broker_overlay` stays blocked because its
redisplay policy is internal.
