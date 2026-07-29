# ADV-3A.1 handback

One consolidated handback, as the operating rules require. The full record with evidence is
`docs/adv-3a1-closure.md`; this file is the summary a reviewer reads first.

Deployed HEAD: `d9e4599`, Vercel `dpl_Bgm3WCt4F74yocs9qfruxNeT8WD5`, READY.

## Scope

Codex accepted the ADV-3A gateway architecture and rejected the closure claims around it. Six
corrections were asked for. All six are done, and the wording that overstated the old boundary
has been narrowed rather than defended.

**1. The regulatory contradiction is resolved.** `user_own_words` was permitted
unconditionally on the argument that typing a sentence consents to its processing. That
argument does not survive contact with what people type into a commercial property search: a
company name, an expansion plan, a budget, a headcount, a tenant's confidential requirement, an
unpublished draft listing. Part D of the regulatory register already said an external model may
receive public information, deliberately constructed samples or approved redacted material, and
unstructured user text is none of those. The class is now gated on `AI_AGREEMENT_IN_FORCE` like
every other nonpublic class. Search uses its deterministic parser, the advisor uses its
deterministic fallback, and translation returns a controlled unavailable state rather than
writing a success state it did not earn. `preAgreement.test.ts` installs a throwing `fetch`
**with provider keys present**, so a stop cannot be mistaken for a missing key.

**2. Instruction-value laundering is closed structurally.** `instruction(label, text)` accepted
an already composed string, so `instruction("x", SYS + userQuery)` compiled, ran, and reached
the boundary declaring only `own_instruction`. The string parameter is gone. An instruction is
now a tagged template, so JavaScript hands the module the fixed spans and the interpolated
values as separate arrays; a raw interpolated value is rejected by the type checker and at
runtime, and the only door for a runtime value is `classifiedSlot(value, parts)`, which cannot
be called without naming a data class. `ClassifiedMessage` and `ClassifiedSlot` are branded
with module-private symbols, so application code cannot forge one with an object literal. There
is deliberately no `fixedText(someString)` convenience; it would be one line and would reopen
exactly this hole.

**3. Conversation-history provenance is corrected.** `priorTurn()` classified assistant replies
as `user_own_words`. There is now no constructor for an assistant turn at all, which is the
honest shape until history retains typed provenance per turn. Assistant text is excluded from
external-model context and from `allowedSrc` in `/api/advisor`, so a figure that appeared only
in a previous assistant reply can no longer become an allowed source on the next turn. A
regression test pins that: a number present only in a prior assistant message stays unsupported.

**4. The structural claim was narrowed to what the scan proves.** The guard now covers provider
SDK imports, provider hostnames, model-related environment-key reads, `/responses`, `/messages`
and `/chat/completions`. It is still a source-tree scan rather than module-system enforcement,
because this repository has no ESLint configuration at all, so the honest cost of import
boundary linting is adopting and tuning a linter across the whole tree. That is recorded in
`docs/roadmap.md` as its own package, and in the meantime the closure claim is the narrower
truthful one: all currently known and registered provider integrations are centralized and
guarded.

**5. Live evidence replaces the missing evidence, and it is readable.** Both languages were
exercised on the deployed site. `/en/advisor`, "office for lease in Riyadh":

> 4 verified matches, owner-verified and deduplicated. These are the closest 4 results of 18.

`/ar/advisor`, `مكتب للإيجار في الرياض`:

> 4 مطابقات موثّقة. التحقق من المالك مباشرة، بلا تكرار، مع سند الترخيص. هذه أقرب 4 نتائج من أصل 18.

Four rows on the screen in each language, the leading count is the number of rows rendered, the
eighteen matched rows are declared rather than dropped, Western numerals in both locales per Law
7, and the counted noun agrees. The first Arabic card reads `مكاتب في العليا` where the previous
deployment read `SATM-A0DC83D0`. The Arabic evidence is screenshots of the rendered page, not
DOM text reconstructed after the fact, and not the mojibake the last handback offered. The
`/api/` trace across both turns is exactly four same-origin requests and no third-party request
of any kind. The caveat is stated without softening: a browser cannot observe server-side
egress, so this proves the client made no external call and that the answers are the
deterministic fallback. `preAgreement.test.ts` is the evidence about the function's own egress,
and it is recorded as a unit test rather than described as equivalent to a live proof.

**6. Finding 52 is closed with a formatter, not with patched sentences.** A case-aware Arabic
counted-noun formatter covers 1, 2, 3, 10, 11, 99 and 100, and it was applied across eight
modules. Finding 53 remains a documented probe limitation with the element-level overflow
assertions still the passing gate.

Two live defects were found while doing item 5 and fixed inside this package rather than filed:
the advisor's search note counted server rows while the screen showed fewer (finding 65), and
every listing card fell back from a missing title to the reference code (finding 66). The second
had already been fixed once, in the share metadata of one page, and left standing on fifteen
other call sites. It is now a shared function with a source-tree guard.

## Commits

| Commit | What it carries |
| --- | --- |
| `f984201` | Items 1 to 4. The pre-agreement boundary, the tagged-template instruction API, history provenance, the broadened transport scan, and a bilingual deterministic search parser. |
| `0600934` | Item 6. The Arabic counted-noun formatter across eight modules; the responsive probe made honest about finding 53. |
| `1981317` | Item 5 defects. A typed city no longer collapses into an arbitrary district; Arabic city queries filter; the search note owns its own sentence per language. |
| `259792d` | Item 5 defects. Suggestion chips reach the path their words promise; a ceiling reads as a search constraint rather than an offered rent; a bracketed placeholder is never read as a district. |
| `2040a50` | One canonical Rent Index attribution, guarded by a source-tree scan. |
| `411f205` | The attribution guard extended to the shipped dictionaries. |
| `7a3c995` | Findings 65 and 66. The advisor counts the rows it renders; a listing with no title in your language is described rather than coded. |
| `d9e4599` | The closure record, the live evidence, nine new findings rows, and Part D saying what the boundary actually denies. |

## Gate

`npx tsc --noEmit` clean. `npm test` 856 pass, 0 fail. `npm run ar-lint` clean.
`node scripts/prose-scan.mjs` 0 hardcoded prose strings in 0 public page source files. The
Vercel production build for every commit above reached READY, which is the build-gate evidence.
`npm run build` fails in this container for one environmental reason only, recorded so nobody
reads it as a defect: `next/font` cannot fetch four Google-hosted families because
`fonts.googleapis.com` is not on the container's egress allowlist.

## Responsive evidence

`7a3c995` is the only commit here that changes rendered output a measurement could see, and what
it changes is one sentence and a card's fallback title, inside layouts already measured at 320,
360, 390, 430, 768 and 1280 pixels in both locales. Both replacements are shorter or comparable
in Arabic to what they replace. The element-level overflow assertions in
`scripts/responsive-probe.mjs` remain the gate.

## Remaining blockers, all owner-side

The enterprise AI agreement is the binding constraint on ADV-3 and is still `unknown` in Part D.
Until the owner records the provider agreement, the processing terms, the cross-border basis and
the user disclosure or consent position, `AI_AGREEMENT_IN_FORCE` stays false and the three paths
stay deterministic. No vendor has been contacted and no data right has been represented.

`.github/workflows/arabic-font.yml` remains an owner-side install. The deploy credential carries
no workflow scope and none may be requested.

Row-level security is disabled on `public.spatial_ref_sys` and `public.map_anchors`, reported by
the Supabase advisor as critical. The remediation is one statement per table and it is **not**
applied here, because enabling row-level security without policies blocks all access to those
tables. That is an owner decision with a rollback plan, not a package edit.

Finding 62, mixed and false decimal precision on a published rent figure, is left open rather
than rounded in passing, because the precision of a published figure is a figure decision.

## Next

ADV-3B, entered directly and without waiting for approval.
