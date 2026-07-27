# PKG-1C.1 closure record

Bounded correction package reopening PKG-1C. Five items, all implemented, gated
and verified live in EN and AR.

Commits: `3877ad9` (the package), `213ea33` (law-test pin).
Production deployment: satmarkets-wheat.vercel.app / satmarkets-sat-markets.vercel.app.

## 1. Open Graph type policy

The universal "every detail route declares `article`" rule is gone, along with the
regression test that enforced it. It has not been replaced by a second mechanical
rule. The type is now derived centrally in `src/lib/meta.ts`:

- `OgType` is `"website" | "profile" | "article"`.
- `OG_TYPE_POLICY` is an ordered table of pattern-to-type departures, each carrying
  a written reason. It is currently EMPTY by design.
- `ogTypeFor(path)` returns the policy's ruling, defaulting to `website`.
- `localeMeta` reads `ogTypeFor(path)`. `MetaOptions` no longer accepts a `type`,
  so no template can pick its own.

Two candidate departures were considered and rejected, and both are documented in
the policy comment so neither is relitigated silently:

- `/lister/[id]` to `profile`. `listers_public` models an organization (`name_en`,
  `lister_type`, `is_operator`, `website`, `public_email`). It carries no
  individual-person fields, so `profile` would be a claim the data does not
  support. The lister profile on `website` was not a defect.
- The other four detail routes to `article`. None is editorial. The entity meaning
  is already carried by the Schema.org JSON-LD.

Two tests replace the deleted one: the type comes from the policy and the generic
value is `website`; and every future departure must name a non-`website` type and
state a reason of at least five words. A third test reads the template sources and
asserts no `generateMetadata` or `metadata` export contains a literal
`type: "website" | "profile" | "article"`.

Live: `og:type=website` on `/listings/[id]`, `/building/[id]`, `/lister/[id]`,
`/requirements/[id]` and `/listings/[id]/flyer`, in both locales.

## 2. Metadata truth sweep, targeted

Rule applied: the sentence may assert only what the underlying row actually
carries, and no sentence may imply that every figure comes from the Rent Index.
Exact verification wording is preserved where the row genuinely passes the gate,
which meant adding a second string per surface rather than weakening one string.

| Surface | Before | After |
| --- | --- | --- |
| `appMeta.description` | "Verified listings" | "Commercial spaces listed by verified owners and licensed brokers" |
| `home.metaTitle` / `metaDesc` | "verified commercial space" | "verified owners and licensed brokers" |
| `listings.metaDesc` / `metaDescIn` | "Browse verified commercial spaces ... backed by the Rent Index" | "listed by verified owners and licensed brokers ... with published Rent Index context where available" |
| `ld.metaDesc` | "Owner-verified listing, backed by the Rent Index" | neutral: "Listed on SAT Markets, with published Rent Index context where available" |
| `ld.metaDescOwnerVerified` (new) | n/a | "Listed by a verified owner ..." |
| `listerPage.metaDesc` | "Verified commercial spaces listed by {name} ... with the published Rent Index behind every figure" | "Commercial spaces listed by {name} ... with published Rent Index context where available" |
| `listerPage.metaDescVerified` (new) | n/a | "... whose identity is verified by SAT Markets ..." |
| `flyer.metaDesc` | "A verified listing ..." | "A printable one page summary of a listing ...: its asking terms, its verification state and its Rent Index context" |
| `reqDetail.metaDesc` | "A verified occupier requirement" | "An occupier requirement published on SAT Markets" |

The branch is evidence-driven, not decorative. `/listings/[id]` selects
`metaDescOwnerVerified` only when `ownerVerified(l)` passes (`src/lib/gate.ts`);
`/lister/[id]` now fetches `is_verified` and selects `metaDescVerified` only when
it is literally `true`. `listerPage.metaDescFallback` was left untouched because
it was already evidence-qualified.

Live proof of both branches:

- `/en/listings/a0000000-...-0101` (owner-verified row): "Listed by a verified
  owner on SAT Markets, with published Rent Index context where available."
- `/en/listings/6f6a42e3-...` (`ownership_verified = false`): "Listed on SAT
  Markets, with published Rent Index context where available." No verification
  claim at all.
- Same split in Arabic: "يعرضه مالك موثّق على سات ماركتس" versus "معروض على سات ماركتس".

## 3. Route policy gap

`/login` and `/hbu` added to `PRIVATE_PREFIXES` in `src/lib/routePolicy.ts`, with
`docs/routes.md` updated in the same commit. Both are pinned in the law test in
`src/lib/laws.test.ts`, so a later edit to the array cannot silently undo the
ruling. Sitemap is 18 URLs and contains neither path.

`/hbu` claims were corrected as well as withheld, so the page is not carrying a
false claim while it waits:

- The Source column rendered a verification tick on every comparable row, which
  said each named building had a checked SAT-advised transaction behind it. It now
  renders a "Simulated" / "محاكاة" tag.
- `hbu.compsNote` is now "Simulated demonstration. Every comparable, price and cap
  rate in this table is illustrative and does not describe a real transaction."
- `hbu.assetSub` now says "simulated underwriting on illustrative comparables"
  instead of "underwritten on verified comparable transactions".
- New `hbu.compsSubtitle`: "Illustrative figures, not observed transactions."

Live: zero occurrences of "verified" in the rendered `/hbu` page body, EN and AR.

## 4. Requirement detail metadata

`/requirements/[id]` is a client page, so its head lives in the sibling
`layout.tsx`. That layout did no data fetch, which is the only reason it served
"Requirement" and "طلب مساحة" for every row. It is now `async` and reads
`title, title_ar` from `requirements_public`, the same public view the detail page
reads. `reqDetail.metaTitleEntity` is the new entity template; the generic wording
survives only as the missing-record fallback.

Live: `/en/requirements/fb11...` returns "Office 200-400 sqm, North Riyadh | SAT
Markets"; `/ar/...` returns "مكتب 200 إلى 400 م²، شمال الرياض | سات ماركتس"; an
unknown UUID still returns "Requirement | SAT Markets".

## 5. Scans ratified and strengthened

The directive-prologue exclusion in `scripts/prose-scan.mjs` is recorded as
ratified and no longer provisional.

`scripts/ar-lint.mjs` now catches the source escape as well as the literal
character. A string written `"—"` renders an em dash on the page while reading
as seven ASCII characters in the file, so the old sweep passed it. Two positions
may legitimately name the character, and only the escape half makes room for them:
test files, which must be able to spell what they forbid and are not shipped copy
(the literal half still applies to them); and a sanitizer or detector carrying an
explicit `em-dash-law` marker on the line, the same shape as the prose scan's
`i18n-exempt` marker so the exemption is visible in the diff.

The new law found one real defect: `src/components/MarketingHome.tsx` rendered an
escaped em dash as its empty-value placeholder on the public marketing home. It now
renders an empty string. The only marked exemption is the advisor route's output
sanitizer, which has to name the dashes it strips.

Non-vacuousness was proved, not assumed: a probe file containing an escaped em dash
was added, `ar-lint` failed on it with a non-zero exit, and the probe was removed
and the scan re-run clean.

## Gates

`npx tsc --noEmit` exit 0. `npm test` 268/268. `npm run ar-lint` clean.
`node scripts/prose-scan.mjs` GATE tier 0 hardcoded prose strings in 0 files.
