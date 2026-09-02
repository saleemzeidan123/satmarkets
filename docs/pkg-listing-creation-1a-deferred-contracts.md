# PKG-LISTING-CREATION-1A: deferred schema and integration contracts

This document exists because the package's own rule required it: "if a
category cannot be persisted honestly without a migration, preserve the
useful in-session experience, label its limitation clearly, document the
required future schema and do not claim it was saved." Every item below is a
real gap this package hit, built around honestly, and left unbuilt rather
than faked. Nothing here is applied. No migration in this package touches
production Supabase, which remains unaudited (standing open item, briefing
`docs/LAWS.md` context).

Each item states: what is missing, why it could not be built honestly today,
the exact schema that would close it, and what changes in the application
once it exists.

## 1. Per-shot photo coverage

**Missing.** `listing_media` records `kind` (`photo` | `floorplan` |
`brochure`), not which of `mediaStandard.ts`'s named shots (`approach`,
`entrance`, `interior_wide`, and the asset-specific extras) a given photo
answers. The guided evidence mission (`src/lib/guidedEvidence.ts`) therefore
cannot tell "the approach shot is missing" from "no photos at all"; both the
Studio and the preview route degrade to `hasAnyPhoto` (or, in the preview
route, "as many photos as the standard has shots, so assume full coverage"),
disclosed in both call sites' own comments rather than left silent.

**Why not built now.** No column exists to hold a shot key, and inventing one
by string-matching a lister's caption or upload order would be a guess
dressed as a fact, which is exactly the class of defect this package's
provenance work exists to prevent.

**Schema this would need.**
```sql
alter table listing_media add column shot_key text null;
-- shot_key, when set, is one of mediaStandard.ts's MediaShot.key values for
-- the listing's asset_type. Null means "not categorised", not "no shot".
```
**What changes once it exists.** The lister tags a photo with its shot at
upload (or the Studio infers a default from the media-step's own shot
context and lets them correct it); `evidenceMission()` takes a real
`photoShotsSupplied: Set<string>` built from these rows instead of the
`hasAnyPhoto` degradation; the "required_by_rule" state for a specific
missing view (not just "more photos needed") becomes reachable everywhere,
not only in the Studio's own session.

## 2. "Marked unavailable, here is why", persisted

**Missing.** `guidedEvidence.ts`'s `unavailable: Map<key, reason>` lives in
Studio component state only, for the length of one browser session. Closing
the tab loses it; a lister who marks the yard photo unavailable on Monday is
asked for it again on Tuesday.

**Why not built now.** Neither `listing_media` nor `listings.attributes`
(jsonb, meant for field VALUES) has a place to record "this category exists
in the taxonomy but does not exist for this property, and here is why," for
an item that has no value to store because it has been declared absent
rather than merely unanswered. Writing the reason into `attributes` under a
made-up key would be exactly the "hide structured data inside an unrelated
column" this package was told not to do.

**Schema this would need.**
```sql
create table listing_evidence_states (
  listing_id uuid not null references listings(id) on delete cascade,
  item_key text not null,        -- a MediaShot.key or an AssetField.key
  item_kind text not null check (item_kind in ('photo', 'fact')),
  state text not null check (state in ('unavailable')),
  reason text null,
  set_by uuid not null references accounts(id),
  set_at timestamptz not null default now(),
  primary key (listing_id, item_key)
);
```
Append-only-by-replacement is deliberate: a later save that answers the item
should delete its row here rather than leave a stale "unavailable" beside a
now-supplied value.

**What changes once it exists.** The Studio's `unavailableItems` state is
seeded from this table on load and written to it on save (a small,
additive API route, not part of this package); the marking survives a
reload and a return visit, and the preview route can show it too, which it
cannot today because it has no session to read state from.

## 3. Cross-session duplicate detection

**Missing.** `src/lib/uploadQuality.ts`'s `findDuplicates()` fingerprints
files (SHA-256) within the CURRENT selection only. A photograph already
uploaded on an earlier visit cannot be checked against a new selection,
because `listing_media` stores no content hash.

**Why not built now.** Computing and storing a hash for every already-stored
photo, to make old and new comparable, is itself a migration plus a backfill,
which this package does not touch.

**Schema this would need.**
```sql
alter table listing_media add column content_sha256 text null;
create index if not exists listing_media_content_sha256_idx
  on listing_media (listing_id, content_sha256);
```
The upload route (`src/app/api/listings/[id]/media/route.ts`) already reads
the file's full bytes to re-encode it; hashing those same bytes before
re-encoding is a cheap addition once the column exists.

**What changes once it exists.** `findDuplicates()` gains a mode that also
checks a batch against the listing's already-stored hashes, and the Studio
can warn "you already uploaded this photograph" instead of silently
accepting a second copy of something already on the server.

## 4. Arabic wording confirmation, durably

**Missing.** `src/lib/provenanceDisplay.ts`'s `arabicWordingProvenance()`
promotes Arabic title/description text from `ai_suggested` to
`lister_supplied` only via `confirmedThisSession`, in-memory Studio state.
Reload the page and the confirmation is gone; the text reverts to reading as
unconfirmed machine output, honestly, because as far as the server can prove,
it is.

**Why not built now.** `listingArabic.ts`'s own header states the deeper
reason plainly: "It never says who wrote the Arabic... authorship is not
derivable here... Recorded as its own finding; the fix is per-field
provenance, which is a schema change." This package did not reopen that
finding; it built the honest session-scoped version on top of the existing
`title_ar_src_hash` / `description_ar_src_hash` mechanism and disclosed the
gap rather than papering over it.

**Schema this would need.** Per-field authorship, at minimum:
```sql
alter table listings add column title_ar_confirmed_by uuid null references accounts(id);
alter table listings add column title_ar_confirmed_at timestamptz null;
alter table listings add column description_ar_confirmed_by uuid null references accounts(id);
alter table listings add column description_ar_confirmed_at timestamptz null;
-- Stamped only by an explicit lister action, never by the translate route,
-- and cleared whenever the corresponding *_ar_src_hash changes (the text
-- changed under the confirmation, so the confirmation no longer applies).
```
**What changes once it exists.** `arabicWordingProvenance()` reads a real,
durable confirmation instead of a session flag; the preview route (which has
no session state to draw on today, so it cannot show this promotion at all)
gains the same capability the Studio's in-session version has now.

## 5. Reviewer version history (LST-6)

**Missing entirely, not merely incomplete.** Confirmed by direct grep of
`src/app/api/listings/[id]/review/route.ts` and `src/app/[locale]/verify/page.tsx`
during this package's source-truth audit: the reviewer console is a flat
approve/reject action on the current row. Neither branch snapshots the prior
state. Nothing in this codebase persists more than one version of a
listing's content.

**Why not built now.** Held explicitly by the owner's own scope for this
package: "reviewer version history if the current storage model cannot
persist it truthfully." It cannot; building a comparison UI over a single
current row would either fabricate a "before" state or silently omit the
comparison it claims to offer, both of which this package's rules forbid.

**Schema this would need, at minimum.**
```sql
create table listing_versions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  captured_at timestamptz not null default now(),
  captured_reason text not null check (captured_reason in ('save', 'submit_for_review', 'review_decision')),
  snapshot jsonb not null,       -- the full row, or the fields that changed since the prior version
  actor uuid not null references accounts(id)
);
```
A field-level diff view, "what changed since the version this reviewer last
saw," is a real product decision (which fields matter enough to surface,
how a diff renders bilingually) that belongs to whoever builds LST-6, not to
this document.

**What changes once it exists.** A reviewer sees what changed since
submission, not only the current state; correction requests can reference a
specific prior version instead of a vague "please recheck."

## 6. The draft-to-published transition

**Not missing because of this package; missing before it, and unchanged by
it.** The source-truth audit that preceded this package confirmed, by
reading every status-mutating route, that no code path anywhere transitions
a listing from `draft` to `published`. `api/listings/[id]/status/route.ts`
allows only `published <-> archived`; `api/listings/[id]/review/route.ts`'s
approve action stamps verification columns and never writes `status`. This
package's preview route (`dashboard/listings/[id]/preview`) renders whatever
`status` a row currently holds, draft or published, and never claims,
implies, or triggers a transition between them. Closing this gap, if it is
one and not an intentional ops-only step, is an owner-and-Codex decision
outside this package's scope, named here so it is not lost.

## 7. A caller for the media-integrity transform log

**Not missing, unused.** `mediaStandard.ts`'s `MediaTransform` /
`MediaDerivation` / `mediaIntegrityFaults()` machinery (Law 8's
machine-readable half) is real, tested, and has no caller anywhere in the
app: nothing today performs an "enhancement" for it to gate, because the
upload pipeline applies exactly one fixed transform (rotate to upright,
resize, re-encode to WebP) unconditionally, with no per-file log. This
package's own deterministic checks (`uploadQuality.ts`) do not change that;
they run in the browser before upload and never transform a file's pixels.
If a future package adds an enhancement workflow (exposure correction,
straightening, the "make it exceptional" tier the baseline plan describes),
that workflow's obligation is to write a real `MediaDerivation` record
(`originalRef`, `transforms`, `appliedBy`, `appliedAt`) for every file it
touches and to call `mediaPublishable()` before letting a derived file
replace what a reader sees, not to build a second, uncalled version of the
same check.
