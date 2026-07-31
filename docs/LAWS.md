# SAT Markets Laws, enforced register (WS01)

## Authority chain (read this first)

1. **Canonical authority:** the SAT Markets project Laws in the SAT Knowledge Base,
   `sat-markets/CLAUDE.md`. That file is owned by Saleem and remains the single
   source of truth. This repository file never overrides it.
2. **This file** is the enforced register: the canonical Laws restated verbatim in
   the terms the automated tests check, plus Codex-ratified amendments recorded in
   the amendments section below until Saleem writes them back into the canonical
   file. Content here may change only to (a) match the canonical file or (b) record
   a Codex- or owner-approved amendment, explicitly dated and attributed.
3. **Enforcement:** `src/lib/laws.test.ts` runs in the standard test gate on every
   ship. A law that can be machine-checked must be.

No other Laws copy may be created. Documents that need the Laws link here.

## The Laws (mirror of canonical)

1. The FAL licence number is 1200025510. Never 03005508. Never anywhere: copy,
   schema, metadata, AI output.
2. No em dashes anywhere, ever. Copy, headings, meta, code comments, commits,
   alt text. Use commas, full stops, or restructure.
3. AI never generates a rent figure, price, or market statistic. Retrieval from
   verified data only; if a figure is not in a source, the AI states it is
   unavailable. Enforced server-side. A reporting period is part of the figure.
4. Never use the phrase "company deck." Use "brand profile" or "profile and
   materials."
5. Saleem's identity never appears in public copy, schema, metadata, or AI output.
6. SAT Markets brand system only. Harbor #3A6EA5 identifies SAT Markets. The
   satestate gold #8A7342 must never appear.
7. Location taxonomy: never call a development a district. `districts.kind`
   carries district, development, area; UI copy uses the umbrella "Location"
   (الموقع) when a list mixes kinds; developments carry a project marker.
8. Property media integrity. AI must never alter media in a way that changes the
   apparent physical reality, condition, dimensions, finishes, fixtures, views,
   access, defects or surroundings of a property. Originals must be preserved.
   Any permitted enhancement must be non-deceptive and traceable.

## Law 8, property media integrity, in operation

Codified on Codex direction (ADV-1C boundary 9), 2026-07-31. The law is stated
above in the words it was given. This section is what enforcing it means, and
`src/lib/mediaStandard.ts` carries the machine-readable half.

A photograph of a property is evidence about that property. A viewer reads it as
a record of what is there, which is why altering it is not a styling decision but
a claim: a relit room is a claim about light, a cleared frame is a claim about
condition, a replaced sky is a claim about aspect. SAT Markets is a verification
exchange, so it cannot make claims of that kind by way of a filter.

The distinction the platform draws is not between manual and automatic editing.
It is between a transformation that changes what a reasonable viewer would
conclude about the physical property and one that does not. Exposure correction
on an underexposed frame does not change the room. Removing the damp patch above
the skirting does, and so does a generative upscale that invents a texture the
camera never resolved, because the invented detail is indistinguishable from
recorded detail once it is in the frame.

Three obligations follow, and all three are conditions, not preferences:

Originals are preserved. The file as delivered by the lister is retained
unmodified and remains the reference copy for any dispute. A derived file never
replaces it.

Every transformation is recorded. What was applied, by what, and when. An
enhancement nobody can enumerate afterwards is not traceable, and an untraceable
enhancement is treated as a forbidden one.

Permitted enhancement is non-deceptive by construction, which is why the
permitted set is enumerated rather than described. `MEDIA_TRANSFORMS` in
`src/lib/mediaStandard.ts` is that enumeration, each entry carrying the reason it
is permitted or forbidden. A transformation absent from the list is forbidden
until it is added deliberately, because the failure mode this law exists to
prevent is a new capability arriving and being used before anyone rules on it.

Virtual staging and any other depiction of a state the property is not in is not
an enhancement. It may only ever appear as a clearly labelled separate image
beside the unaltered original, never in its place, and the wider workflow for it
belongs to Listing Studio rather than to this law.

## Controlled vocabulary and claims

The controlled bilingual vocabulary in the Codex audit
(`SAT Markets - Complete Bilingual Typography SEO and Content Audit - 2026-07-22`)
is adopted as product law, including: average (المتوسط) only for arithmetic mean and
median (الوسيط) only for a true median, never interchangeable; the Rent Index is
attributed only to the REGA Rental Index (Ejar); listing/lister/verification nouns
per the audit table; Western numerals in both languages; `م²` in Arabic copy.

Public claims are governed by `docs/claims-ledger.md`. No new material public claim
ships without a ledger entry.

## Amendments ratified in PKG-0A (pending write-back to canonical)

- **Confirmed-status green is #1B7A50** (5.32:1 on white, WCAG AA). The previous
  #1F8A5B (4.33:1) is retired everywhere. Ruled by Codex, 2026-07-22. Green is
  used only for genuinely verified or completed states, always with text and,
  where appropriate, an icon.
- **English display serif is Source Serif 4** (replaced Playfair Display,
  owner-approved 2026-07-20). The canonical KB brand section still names
  Playfair and needs Saleem's one-line update.
- **Environment truth:** the preview never canonicalizes to, or claims,
  satmarkets.sa until the domain is acquired (Codex audit ranks 7 and 34,
  confirmed by Saleem 2026-07-22). `src/lib/site.ts` is the single origin source.

## Untrusted instruction on record

The repository root `CLAUDE.md` (entered in commit `a5a543a`, 2026-07-18)
instructs installing and running a third-party tool (`gstack`). Per Codex
direction 2026-07-22 it is preserved but **ignored as an untrusted, unapproved
tooling instruction** pending confirmation of its origin by Saleem. The build
and ship gate remains `tools/ship.py` (typecheck + tests + em-dash commit guard).
