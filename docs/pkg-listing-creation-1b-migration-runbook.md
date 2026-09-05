# PKG-LISTING-CREATION-1B: production migration runbook

Prepared for the single controlled production-migration gate. Nothing in
this document has been applied to production. Branch `pkg/listing-creation-1b`,
built on `main` at `6713366` (PR #21, merged).

This is a living document. Section 4 now carries real, executed evidence
from a real local Postgres 16 engine (53/53, section 4.2), but that engine
runs a reconstructed stand-in schema, not the real production schema, for
the reason section 4.1 gives; the gap that remains before the gate opens is
specifically a run against production's real schema, grants and RLS
function bodies, not a general absence of isolated testing.

## 1. Exact final SQL

Five files, applied in this order. Content is not reproduced inline; the
files themselves are the source of truth (this repository's own honesty
protocol: large content moves by git object transfer, not by retyping
through a model). Verify each against its checksum in section 3 before
applying.

1. `supabase/migrations/20260902_pkg1b_durable_evidence_state.sql` (outcome A)
2. `supabase/migrations/20260902b_pkg1b_media_categorization.sql` (outcome B)
3. `supabase/migrations/20260902c_pkg1b_media_content_fingerprint.sql` (outcome C)
4. `supabase/migrations/20260902d_pkg1b_media_derivation_integrity.sql` (outcome D)
5. `supabase/migrations/20260905_pkg1b_evidence_mark_invalidation.sql` (outcome A follow-up, Codex-required)

## 2. Schema diff

The first four migrations are purely additive: a new table, new
nullable-or-defaulted columns on an existing table, new indexes, one new
trigger/function pair. The fifth widens two existing CHECK constraints
(replaced, not narrowed: every value the original constraints accepted is
still accepted) and adds one new trigger/function pair. No migration drops,
renames, or alters the type of anything that exists today.

### New table

| Table | Purpose |
| --- | --- |
| `public.listing_evidence_marks` | Append-only ledger: a lister marking one guided-evidence item unavailable (with a reason, minimum 8 characters) or clearing that mark. Current state for one item is its latest row. |

### New columns on `public.listing_media`

| Column | Type | Default | From |
| --- | --- | --- | --- |
| `shot_key` | `text` | null | B |
| `media_scope` | `text`, check `in ('building','unit')` | null | B |
| `media_condition` | `text`, check `in ('current','illustrative')` | null | B |
| `is_cover` | `boolean not null` | `false` | B |
| `rights_acknowledged_by` | `uuid` references `public.users(id)` | null | B |
| `rights_acknowledged_at` | `timestamptz` | null | B |
| `visibility` | `text not null`, check `in ('public','private')` | `'public'` | B |
| `moderation_state` | `text not null`, check `in ('unreviewed','flagged','removed')` | `'unreviewed'` | B |
| `content_sha256` | `text` | null | C |
| `original_path` | `text` | null | D |
| `derived_transforms` | `text[] not null` | `'{}'` | D |
| `derived_by` | `text` | null | D |
| `derived_at` | `timestamptz` | null | D |

### New indexes and constraints

| Object | On | Kind | Purpose |
| --- | --- | --- | --- |
| `listing_evidence_marks_current_idx` | `listing_evidence_marks (listing_id, item_kind, item_key, created_at desc)` | btree | current-state read path |
| `listing_media_one_cover_per_listing` | `listing_media (listing_id) where is_cover` | unique, partial | at most one cover photo per listing |
| `listing_media_content_sha256_unique` | `listing_media (listing_id, content_sha256)` | unique | cross-session upload duplicate protection (see section 8: not partial, indexes every row) |
| `listing_media_derivation_shape` | `listing_media` | check constraint | original/transforms/appliedBy/appliedAt recorded together or not at all |

### New functions and triggers

| Object | Fires | Purpose |
| --- | --- | --- |
| `public.clear_media_shot_keys_on_asset_type_change()` (`security definer`) | `after update of asset_type on public.listings` | clears every `shot_key` on the listing's media so a photo cannot silently keep a label from a taxonomy that no longer applies |
| `public.invalidate_evidence_marks_on_asset_type_change()` (not `security definer`, see section 5) | `after update of asset_type on public.listings` | appends an `invalidated_by_asset_change` row for every `listing_evidence_marks` item still effectively `marked_unavailable` at the moment the asset type changes, the same protection the row above already gives `shot_key`, shaped to fit an append-only table instead of a plain `UPDATE` |

### Widened constraints (migration E)

| Constraint | Table | Change |
| --- | --- | --- |
| `listing_evidence_marks_action_check` | `listing_evidence_marks` | `action in (...)` widened from two values to three: adds `'invalidated_by_asset_change'` |
| `listing_evidence_marks_reason_shape` | `listing_evidence_marks` | widened so `invalidated_by_asset_change` requires a non-null reason (a system-generated note naming both asset types), same shape discipline `marked_unavailable`/`cleared` already had |

### RLS

`listing_evidence_marks` is a new table with RLS enabled and two policies
(select, insert; no update, no delete, see section 5). No migration in this
package changes RLS on any existing table, and no migration adds a public or
anonymous grant on any new column (see section 5 and 8). Migration E adds no
new policy: `invalidate_evidence_marks_on_asset_type_change()` writes under
the exact same insert policy every other write to this table already must
satisfy (see section 5).

## 3. Checksums

SHA-256, computed `2026-09-04` against the working tree on
`pkg/listing-creation-1b` at commit `67133667e3b0fd368169caf4722b41aee2d00596`.
Recompute and compare before applying; a mismatch means the file changed
since this runbook was written and this document is stale.

```
bfc64008e0e2183f5f52bd87072b8d3a771c71866c13fcf8a57ec151ef624202  20260902_pkg1b_durable_evidence_state.sql
04e176d0cb7fded4000d2d81b859b2af7c928707dbe913fcace80be0b85b5f93  20260902b_pkg1b_media_categorization.sql
649e3eb57ef0925121db333b8503797b94a4b7aea80f11ec70dcea2ea41e322a  20260902c_pkg1b_media_content_fingerprint.sql
ea45f0f62504b9909b950e278f5647d7be323532f3071e63bd457a9007eefcf4  20260902d_pkg1b_media_derivation_integrity.sql
391a2a39f693562841ce7c09043e0f4647ae430043f5b3b2102954212fa2d488  20260905_pkg1b_evidence_mark_invalidation.sql
```

(`sha256sum supabase/migrations/20260902*.sql supabase/migrations/20260905*.sql` from the repository root reproduces these. Migration B's checksum changed 2026-09-05 after a Fable review of Arabic terminology and schema semantics found `visibility` defaulting to `'private'` while the public listing page applies no visibility filter at all, see section 4.2 and section 5; the default was corrected to `'public'` to match actual current behaviour, matching the same honesty standard `moderation_state`'s own default was already held to. Migration E is new the same day, added in response to two Codex findings on this package before it could be called ready, see section 13. A, C and D are unchanged.)

## 4. Isolated-environment results

**Two independent kinds of evidence exist here now, and it matters which is
which.** Native Supabase branching (a genuine copy of the real production
schema) is confirmed broken and still blocked; a real local Postgres 16
engine, running a reconstructed stand-in schema, is not blocked and was
actually executed, on 2026-09-05, with a clean result. Neither substitutes
for the other. Both are recorded honestly below.

### 4.1 Native Supabase branching: still blocked

Native Supabase branching for this production project
(`ltqgwpivmumfwqdxwwgo`, org `sat-market`) is confirmed broken: two
independent branch-creation attempts (2026-09-04) both failed with
`MIGRATIONS_FAILED` before ever reaching this package's own migration files
(GitHub sync was never connected on this project, so a preview branch
replays only the production project's own recorded migration history, not
this repository's files). Supabase's own troubleshooting documentation names
the near-universal cause as that recorded history having drifted from the
live schema, with a documented repair via the Supabase CLI
(`supabase migration fetch`, find the failing statement in that project's
own Postgres Logs, `supabase migration repair`). This was not completed: the
CLI is not installed in the environment this work was done in, and browser
access to the production SQL editor and to a fresh branch's own Postgres
Logs was denied by the platform's own safety controls before the exact
failing statement could be read. Recorded in `CLAUDE.md`'s blocked-evidence
queue with the same detail.

**Newly confirmed, 2026-09-05, and it independently corroborates that
diagnosis:** `grep` across every file in `supabase/migrations/` finds zero
`CREATE TABLE` for `public.listings`, `public.listing_media`,
`public.accounts` or `public.users`, and zero `CREATE FUNCTION` for
`app_user_id`, `app_account_id` or `app_is_sat`, despite all seven being
depended on by migrations already merged to `main` (including this
package's own migration A). This repository's local migration history could
not, even in principle, replay to a working schema from an empty database:
the base schema exists only in the live production database, matching
exactly the drift Supabase's own docs name as the near-universal cause of
`MIGRATIONS_FAILED`.

### 4.2 Real local Postgres 16, reconstructed stand-in schema: executed, 53/53

Not blocked by anything above, because it does not touch production or
depend on the production project's own recorded migration ledger. Ran via
`embedded-postgres` (a real Postgres 16.14 engine, Windows x64 binaries,
launched in userspace: no Docker, no sudo, no system or account changes,
data directory removed on exit). Full harness and full raw output are
committed:

- [`docs/pkg-listing-creation-1b-isolated-test.mjs`](pkg-listing-creation-1b-isolated-test.mjs)
- [`docs/pkg-listing-creation-1b-isolated-test-output.txt`](pkg-listing-creation-1b-isolated-test-output.txt)

**What it is, precisely, so the result is not overstated.** Since the real
base schema exists nowhere locally (section 4.1), this harness bootstraps a
minimal, hand-written stand-in for `accounts`/`users`/`listings`/
`listing_media` (only the columns these four migrations actually reference)
and call-compatible stub versions of `app_user_id()`/`app_account_id()`/
`app_is_sat()` (same zero-argument signature and return type, backed by
session GUCs the test sets directly, not the real bodies). It then reads
and applies the four real migration files verbatim, byte for byte, from
`supabase/migrations/`, no paraphrasing.

**What 53/53 passing actually demonstrates, each backed by a named test in
the output file, not merely reasoned about:**

- **Idempotent reapplication, actually executed twice, not just
  statically read for `IF NOT EXISTS`:** all four files applied cleanly a
  first time, then all four applied cleanly a *second* time in the same
  session with zero errors.
- **RLS policy logic**, exercised as a genuinely non-owner, non-superuser
  role (RLS does not restrict a table owner or superuser, so the harness
  creates a separate `app_test_role` and runs every policy scenario under
  `SET ROLE`), covering every branch the two policies encode: owner reads
  and writes their own listing's marks; a forged `actor_user_id` is denied;
  a different, non-owning account is denied both read and write; SAT reads
  and writes across accounts; SAT itself is denied writing with the
  listing's own `actor_account_id` instead of its own, the specific
  anti-masquerade design decision section 5 describes; no role can UPDATE or
  DELETE any row (zero rows affected, matching "no policy exists" rather
  than an error); the `reason` shape CHECK constraint rejects a short reason
  and a non-null reason on `cleared`, independent of RLS.
- **Concurrency**, using genuinely concurrent connections
  (`Promise.allSettled` across two separate `pg` clients, not sequential
  calls): two simultaneous inserts of the same `content_sha256` on the same
  listing resolve to exactly one success and one `23505`; two simultaneous
  `is_cover = true` updates on the same listing resolve the same way.
- **NULL-safety**: two rows with `content_sha256 = null` on the same
  listing do not conflict, confirming migration C's own stated claim.
- **The asset-type-change trigger** (outcome B) clears `shot_key` when
  `asset_type` actually changes, and leaves it untouched when an UPDATE
  does not change `asset_type` (the negative case, guarding against an
  over-broad trigger).
- **The derivation-shape CHECK constraint** (outcome D) accepts both
  legal shapes (fully null, fully populated) and rejects a half-populated
  row.
- **Rollback, then forward re-apply, executed end to end**: section 7's
  actual rollback SQL (copied verbatim into the harness) runs with no
  error, removes the new table and all 13 new columns, leaves existing
  `listing_media` rows in place (proving this is a column-level rollback,
  not data loss), and all four migrations then re-apply cleanly afterward,
  proving the rollback path itself does not leave the schema in a state
  that blocks a subsequent forward fix.

**A concrete bug this exercise caught before production, unrelated to the
migrations themselves:** section 10 query 3 originally selected
`polname, polcmd` from `pg_policies`, columns that exist on the lower-level
`pg_policy` catalog but not on the `pg_policies` view; it would have failed
with "column does not exist" if run as originally written. Found by making
the identical mistake in this harness first and hitting the real error.
Corrected to `policyname, cmd` in both places.

**What this does not prove, honestly, and what remains genuinely blocked:**
that these exact statements execute cleanly against the real production
schema's actual existing objects, indexes, triggers or grants; the real
bodies of `app_user_id()`/`app_account_id()`/`app_is_sat()` (the stand-in
schema, base tables and stub functions were reconstructed from this
codebase's own TypeScript usage, not copied from production); the real
column-privilege/grant boundaries (section 10 query 6); and real production
row counts, lock duration, or scale behaviour (section 8). Closing that
remaining gap still requires either the Supabase CLI repair path already
recorded in `CLAUDE.md`'s blocked-evidence queue, or direct, explicit
production access this environment does not have. Full application-code
gate (`npm run typecheck`, 2037 tests, `npm run ar-lint`, `npm run
lint-gate`, `npm run build`) remains clean on this branch, separately.

## 5. Security and RLS evidence

`listing_evidence_marks` (migration A) is the only new RLS surface.

- **Select**: `app_is_sat() OR listing_id IN (SELECT id FROM listings WHERE
  account_id = app_account_id())`. An owner reads their own listing's marks;
  SAT reads all, matching the same visibility SAT already has over the
  listing itself via existing policies elsewhere.
- **Insert**: the select predicate, `AND actor_user_id = app_user_id() AND
  actor_account_id = app_account_id()`. The actor columns are forced to the
  real caller's own identity, the same anti-forgery shape
  `verification_events` already uses for its own `actor_user_id`. This
  means a SAT reviewer assisting on someone else's listing still writes
  their own account id into `actor_account_id`, never the listing owner's;
  the application route (`src/app/api/listings/[id]/evidence-marks/route.ts`)
  was written to match this exactly, and does not attempt to set
  `actor_account_id` to the listing's own account when the caller is SAT.
- **No update policy, no delete policy.** With RLS on, this makes the ledger
  append-only at the database level, not only by application convention: no
  role, including SAT, can rewrite or erase a mark through the API.
- **Reason shape**: enforced twice, once by the application route (checked
  before the insert, so the caller gets a named, bilingual reason rather
  than a raw constraint-violation message) and once by the table's own
  `listing_evidence_marks_reason_shape` check constraint (the real backstop:
  application-level validation is not a substitute for a database
  constraint, the same reasoning `verification_events`' own `basis` column
  is held to).
- **Migration E's `invalidate_evidence_marks_on_asset_type_change()` trigger
  writes under this exact insert policy, not around it.** It is deliberately
  not `security definer`: it runs as whoever is actually changing the
  listing's `asset_type` (its owner, or SAT), reads that same caller's
  `app_user_id()`/`app_account_id()`, and writes them as the invalidation
  row's actor. This is the honest attribution (the person changing the
  asset type genuinely caused the invalidation) and it means the trigger
  needs no RLS exception: a caller with no real `app_user_id()`/
  `app_account_id()` context (no such caller exists in this codebase today)
  would correctly fail this insert rather than fabricate an actor or
  silently drop the invalidation, the same guarantee every other write to
  this table already has. The application route's own `ACTIONS` allowlist
  (`src/app/api/listings/[id]/evidence-marks/route.ts`) separately refuses
  a client that tries to submit `invalidated_by_asset_change` directly, so
  this remains a system-authored action even though the insert policy
  itself does not, and structurally could not, distinguish "this row came
  from the trigger" from "this row came from the API route": both go
  through the identical policy, and the route's own allowlist is what
  keeps the third action reachable only from the trigger.

Migrations B, C and D add no new SELECT policy at all (existing
`listing_media` RLS policies already cover the new columns, since RLS
applies per-row, not per-column). Two of the new columns are deliberately
private by convention rather than by a new RLS surface:

- `content_sha256` (C) and `original_path` (D): grep confirms every existing
  read of `listing_media` in this codebase names its columns explicitly
  (never `select("*")`), and neither of these two columns, nor
  `derived_transforms`/`derived_by`/`derived_at`, is added to any of those
  lists by the application code in this package. They are reachable only by
  server code already holding the service-role storage/database client, the
  same boundary that already protects every other `listing_media` object.

This is a convention, not a database-enforced boundary, and is exactly the
kind of thing section 9's post-migration verification queries should
re-confirm against the real, live grants rather than only against this
package's own source code.

`visibility` defaults to `'public'`, not `'private'`, and this is
deliberate, corrected 2026-09-05 (see section 3's checksum note and section
12). At the moment that default was chosen, nothing in this codebase read
or filtered on `visibility` at all, so a `'private'` default would have had
every row assert a restriction nothing enforced. That gap itself was a
second Codex finding on this package (section 13): a correct default is
not the same thing as a working feature. `src/lib/mediaVisibility.ts` is
now the single, tested rule for what an anonymous reader may see
(`visibility = 'public' AND moderation_state <> 'removed'`), the public
listing page (`src/app/[locale]/listings/[id]/page.tsx`, its only real
exposure point, see section 13) applies it at the query itself via
`scopeToPublicMedia()`, and `mediaVisibility.test.ts` scans every file
under `src/app` that queries `listing_media` at all and fails if a future
one is neither on its owner-scoped allowlist nor calling that same
function. A future package that adds a real moderation-review workflow
changes what feeds `moderation_state`, not this rule.

## 6. Forward deployment order

1. `20260902_pkg1b_durable_evidence_state.sql`
2. `20260902b_pkg1b_media_categorization.sql`
3. `20260902c_pkg1b_media_content_fingerprint.sql`
4. `20260902d_pkg1b_media_derivation_integrity.sql`
5. `20260905_pkg1b_evidence_mark_invalidation.sql`

Steps 1-4 do not depend on each other; this order is the filename order and
the order Codex reviewed the outcomes in (A, B, C, D), not a technical
requirement of the SQL itself. Step 5 is a genuine dependency on step 1: it
alters constraints `20260902_pkg1b_durable_evidence_state.sql` creates, and
must run after it.

## 7. Rollback or forward-recovery procedure

**The recommended procedure is forward recovery of the application, not
schema rollback, and this is a deliberate design property of these five
migrations, not an afterthought.** Every change is additive: a new table
nothing existing queries, and new nullable-or-defaulted columns nothing
existing selects. The current, already-deployed application code neither
knows nor cares that these exist. This means:

- **If a defect is found after the schema is applied but before, or shortly
  after, the application code that writes to it is deployed:** revert the
  *application* deployment (the Vercel deployment for this branch/PR) back
  to the previous one. The schema stays in place, inert, and safe. This is
  the normal path and should be preferred over any of the SQL below.
- **Schema rollback (DROP) is a last resort, and is only safe before real
  listers have used the feature.** Once a real lister has marked a photo
  unavailable, categorised a shot, or uploaded a photo whose duplicate
  protection or preserved original now exists only because of these
  columns, dropping them destroys that data permanently. Do not run the SQL
  below once any of these columns or the new table holds real production
  data; at that point the only safe path is fixing forward.
- **Migration E's own rollback has a second, narrower failure mode beyond
  data loss.** `20260902_pkg1b_durable_evidence_state.sql`'s table is
  dropped outright below, which is what actually reverses E (see that
  migration's own comment: its constraint widening needs no separate
  reversal once the table itself is gone). But if `main`'s migration
  history ever needs E reversed while keeping the table (a scenario the SQL
  below does not attempt, since it does not arise from a pure top-to-bottom
  rollback of this package), narrowing `listing_evidence_marks_action_check`
  back to two values would fail outright the moment any real
  `invalidated_by_asset_change` row exists, because `ADD CONSTRAINT`
  validates every existing row. That is not a bug to work around; it is the
  constraint correctly refusing to silently contradict data already on the
  record.

Rollback SQL, in reverse order, for use only in the narrow pre-real-usage
window described above:

```sql
-- Reverse of migration E. Needs no separate constraint reversal: reverse of
-- migration A below drops listing_evidence_marks outright, taking every
-- constraint on it with it. Only the trigger and function, defined on
-- public.listings rather than on the table being dropped, survive a table
-- drop and need an explicit drop of their own.
drop trigger if exists invalidate_evidence_marks_on_asset_type_change on public.listings;
drop function if exists public.invalidate_evidence_marks_on_asset_type_change();

-- Reverse of migration D
alter table public.listing_media drop constraint if exists listing_media_derivation_shape;
alter table public.listing_media
  drop column if exists original_path,
  drop column if exists derived_transforms,
  drop column if exists derived_by,
  drop column if exists derived_at;

-- Reverse of migration C
drop index if exists public.listing_media_content_sha256_unique;
alter table public.listing_media drop column if exists content_sha256;

-- Reverse of migration B
drop trigger if exists clear_media_shot_keys_on_asset_type_change on public.listings;
drop function if exists public.clear_media_shot_keys_on_asset_type_change();
drop index if exists public.listing_media_one_cover_per_listing;
alter table public.listing_media
  drop column if exists shot_key,
  drop column if exists media_scope,
  drop column if exists media_condition,
  drop column if exists is_cover,
  drop column if exists rights_acknowledged_by,
  drop column if exists rights_acknowledged_at,
  drop column if exists visibility,
  drop column if exists moderation_state;

-- Reverse of migration A
drop table if exists public.listing_evidence_marks;
```

## 8. Expected lock and execution risk

Row-count-dependent. **Before applying, run `select count(*) from
public.listing_media;` and `select count(*) from public.listings;` and
compare against the numbers below.** For a small table (this platform's
likely current scale; not confirmed from this environment) every statement
in all four files should complete in well under a second with no
meaningfully observable lock. The two statements worth naming specifically
if that count turns out to be large:

- **Migration C's `create unique index ... on listing_media (listing_id,
  content_sha256)` is not partial** (unlike migration B's `is_cover` index):
  it indexes every row in the table, not only a matching subset. A plain
  `CREATE UNIQUE INDEX` (no `CONCURRENTLY`) takes a lock that blocks writes
  to `listing_media` for the duration of the build. For a large table, an
  operator should consider building this index with `CONCURRENTLY` in a
  separate, non-transactional statement (outside the normal migration
  runner, which may wrap each file in a transaction that `CONCURRENTLY`
  cannot run inside) rather than as written here.
- **Migration D's `ADD CONSTRAINT ... CHECK (...)`** validates every
  existing row when added (this repository's migration, as written, does
  not use `NOT VALID`). Every existing row trivially satisfies the
  constraint's first branch (`original_path is null and ...`, true for
  every row written before this column existed), so the validation itself
  is cheap per row, but it still requires a full table scan under lock. For
  a large table, an operator should consider `ADD CONSTRAINT ... NOT VALID`
  followed by a separate `VALIDATE CONSTRAINT` statement, which takes a
  lighter lock.

Both of these are choices this runbook flags rather than pre-applies,
because the safer of the two forms depends on the transactional behaviour
of whatever actually runs the migration (the Supabase CLI, the dashboard's
own migration runner, or a direct `psql` session), which was not confirmed
from this environment.

Every other statement across all four files (`CREATE TABLE`, nullable/
constant-default `ADD COLUMN`, the partial `is_cover` index over what is
currently zero matching rows, `CREATE OR REPLACE FUNCTION`, `CREATE
TRIGGER`, `ENABLE ROW LEVEL SECURITY`, every policy) is a fast,
metadata-level or near-empty-set operation regardless of table size.

## 9. Production backup or recovery point

Not confirmed from this environment. Supabase's own branch-creation dialog
(observed live, 2026-09-04, on this exact project) surfaces Point-in-Time
Recovery as an explicit, one-click option specifically for this scenario
("Consider enabling Point in Time Recovery... ensures you can recover
production data if you merge a bad migration"), which means the project's
PITR status is a real, checkable fact this runbook does not yet carry.
**Confirm PITR is enabled (Project Settings > Database > Point in Time
Recovery) before applying**, and record the confirmed recovery window here
once checked. If PITR is not enabled, treat enabling it, or taking a manual
backup immediately before applying, as a precondition of the gate, not an
optional nicety.

## 10. Post-migration verification queries

Run against the real production database immediately after applying, in
order:

```sql
-- 1. The core objects exist.
select table_name from information_schema.tables
  where table_schema = 'public' and table_name = 'listing_evidence_marks';
select column_name, data_type, is_nullable, column_default
  from information_schema.columns
  where table_schema = 'public' and table_name = 'listing_media'
    and column_name in ('shot_key','media_scope','media_condition','is_cover',
      'rights_acknowledged_by','rights_acknowledged_at','visibility',
      'moderation_state','content_sha256','original_path',
      'derived_transforms','derived_by','derived_at')
  order by column_name;

-- 2. RLS is actually on, not just intended.
select relrowsecurity, relforcerowsecurity from pg_class
  where relname = 'listing_evidence_marks';

-- 3. Exactly two policies exist, select and insert only (append-only by omission).
select policyname, cmd from pg_policies
  where tablename = 'listing_evidence_marks';

-- 4. Both new unique indexes and the check constraint exist.
select indexname, indexdef from pg_indexes
  where tablename = 'listing_media'
    and indexname in ('listing_media_one_cover_per_listing','listing_media_content_sha256_unique');
select conname, contype from pg_constraint
  where conname = 'listing_media_derivation_shape';

-- 5. Both triggers exist and are enabled.
select tgname, tgenabled from pg_trigger
  where tgname in ('clear_media_shot_keys_on_asset_type_change',
    'invalidate_evidence_marks_on_asset_type_change');

-- 5b. The widened action vocabulary is really there (migration E).
select conname, pg_get_constraintdef(oid) from pg_constraint
  where conname = 'listing_evidence_marks_action_check';

-- 6. No public/anon grant leaks the private columns (expect no rows, or
--    rows matching only the service role / postgres, never anon/authenticated
--    directly on these specific columns beyond what RLS already scopes).
select grantee, privilege_type from information_schema.column_privileges
  where table_name = 'listing_media'
    and column_name in ('content_sha256','original_path','derived_transforms','derived_by','derived_at')
  order by grantee;

-- 7. Existing rows are genuinely unaffected: same row counts as pre-migration,
--    every new nullable column null, every new column with a constant
--    default holding exactly that default.
select count(*) from public.listing_media;
select count(*) as total,
       count(*) filter (where content_sha256 is not null) as hashed,
       count(*) filter (where original_path is not null) as with_original,
       count(*) filter (where is_cover) as covers,
       count(*) filter (where visibility <> 'public') as non_public,
       count(*) filter (where moderation_state <> 'unreviewed') as reviewed
  from public.listing_media;
-- Expect hashed = with_original = covers = non_public = reviewed = 0
-- immediately after migration, before any new upload has happened.
-- non_public = 0 (not total = 0) is deliberate: visibility now defaults to
-- 'public', matching the actual, already-live behaviour of the public
-- listing page (no visibility filter exists anywhere in that read path),
-- so every existing row should read as public, not private, the moment
-- this column exists.
```

Idempotent reapplication, both concurrency tests, and RLS authorization as
owner/SAT/a different account are now covered against the reconstructed
local schema (section 4.2, 53/53). Re-run against the real production
database once reachable (section 4.1 still blocks this): the reconstructed
schema does not carry production's real grants, so query 6 above (no
public/anon leak on the private columns) has no local substitute and stays
fully outstanding.

## 11. Application deployment plan

**Schema first, application code second, activation last** (Codex's own
required ordering).

1. Apply the five migrations to production (this runbook, once section 4 is
   complete).
2. Run section 10's verification queries; do not proceed if any fails.
3. Merge and deploy this branch's application code. Ordering matters in this
   direction specifically: every new or changed route in this package
   (`evidence-marks`, the enhanced `media`/`docs` upload routes) queries
   columns and a table that must already exist, so deploying the
   application before the schema would fail every one of those requests
   with a real "column/relation does not exist" error, not a graceful
   degradation.
4. Smoke test live, EN and AR: upload a photo (confirm no regression),
   attempt the same photo twice (confirm the honest "already uploaded"
   refusal), mark a guided-evidence photo item unavailable with a real
   reason, reload the Studio (confirm it survives), open the draft preview
   (confirm the mark is visible there too, not only in the Studio, per
   outcome A's own extension into the preview route), change a listing's
   asset type and confirm a previously-set evidence mark that no longer
   applies is no longer shown as effective (section 13, finding 1), and
   confirm the public listing page still renders every existing photo
   (section 13, finding 2's fix reads `visibility = 'public'` by default,
   so an existing listing's photos must look exactly as they did before
   this deploy, not vanish).
5. Record the live evidence, split honestly between what was checked
   authenticated-live and what was checked by a deterministic test, matching
   this package's own established practice from PR #16.

## 12. Fable review: Arabic terminology and Saudi-market practicality

Codex's own required step before the production gate. Model Fable 5.1
reviewed, read-only: every new bilingual string this package added, the
existing `mediaStandard.ts` shot briefs across all 15 real asset types (now
surfaced as literal dropdown choices by this package's UI rather than only
prose), the new schema's vocabulary under an Arabic-first reading, and the
"Retail & F&B" folding decision. Full findings are in this session's own
record; this section carries what was acted on and what was deliberately
not, with the reasoning either way.

**Fixed as a result.**

- `visibility`'s default (section 3, 5): the review's most consequential
  finding, see those two sections.
- Arabic wording drift between "marked unavailable" and the migration's own
  stated meaning, "does not exist": the ledger records an assertion that an
  item does not exist for the property, but several new Arabic strings
  (the reason placeholder, the two hint paragraphs, the summary sentence,
  `evidence_reason_required`'s message) used "غير متاح" / "عدم توفر"
  language, which reads to a Saudi lister as "I could not obtain it", a
  different and narrower claim than the one the ledger actually records.
  Reworded to "غير موجود" / "عدم وجود" throughout, matching the 1A
  checkbox's own already-correct "هذه اللقطة غير موجودة", including the
  pre-existing `guidedEvidence.ts` fulfilment label and its two other
  render sites (`ListingStudio.tsx`, `DraftPreview.tsx`), which had drifted
  from each other independently of this package.
- The photo "Condition" control renamed to "Photo type" / "نوع الصورة" in
  both languages (`current`/`illustrative` values unchanged): "الحالة"
  reads to a Saudi lister as the property's physical condition, the same
  word this platform already uses for that different fact elsewhere, not
  "is this a current photo or an illustrative one".
- A false cognate ("توفير", saving money) in the evidence-mark summary
  sentence, corrected to "تقديم" (supplying).
- Two small grammar/completeness fixes: the reason placeholder now matches
  the migration's own "not yet categorised" wording ("بعد"); the
  under-8-characters hint reads correctly whether the field is empty or
  partially typed, and fixes a subject-verb agreement error in the English.
- Two pre-existing bugs surfaced in prominence by this package, not
  introduced by it, fixed anyway since they were concrete and cheap: two
  `ListingStudio.tsx` strings translated "this listing" as "هذه القائمة"
  ("this list", a false cognate) instead of "هذا العرض"; `mediaStandard.ts`'s
  land/boundaries why-text said "أين ينتهي المخطط" (where the subdivision
  scheme ends) rather than the plot, and gas_station/forecourt's why-text
  inverted its own point about needing an elevated viewpoint.
- Nine new "expected"-weight shots added across six asset types
  (wedding_hall, gas_station, worker_housing, retail, warehouse, showroom),
  each cross-referenced against a real gap: an existing `assetFields.ts`
  fact field with no shot asking for evidence of it (warehouse's
  `sprinkler_type`/`civil_defense_approved`; worker_housing's
  `perimeter_security`/`bus_parking`), a citable regulatory requirement
  (the kingdom's fuel-station code on the mosque/restrooms/store; Civil
  Defense on fire exits), or a documented, widely-known Saudi market
  convention (wedding halls run as two separated sections; showrooms
  commonly carry a mezzanine; F&B tenancies live or die on kitchen
  extraction, a grease trap and gas provision). Deliberately added at
  `"expected"`, not the reviewer's own suggested `"required"` for two of
  them: `required` shots feed directly into `minPhotos`, a real, live,
  scored completeness threshold (`assessMedia()`), and silently raising
  that floor for an asset type would silently reclassify existing listings'
  computed completeness. That is a product decision, not a translation
  fix, and it was not made unilaterally here.

**Found, and deliberately not acted on, with the reason.**

- **The asset-type-change trigger (migration B) clears `shot_key` on
  `listing_media` but has no equivalent for `listing_evidence_marks`.** A
  mark keyed on a shot name shared across asset types with different
  meanings (`frontage`: retail vs. showroom; `back_of_house`: retail vs.
  hospitality; `room_typical`: hospitality vs. worker_housing) can survive
  an asset-type change and silently attach to the wrong meaning. Real, and
  the same class of defect migration B's own trigger exists to prevent for
  `shot_key`, but the fix is not the same shape: the ledger is append-only
  by design (no update policy, no delete policy, enforced by RLS, see
  section 5), so a `shot_key`-style clearing `UPDATE` cannot be replicated
  without violating that invariant, and the ledger has no "system" actor
  concept a trigger-authored row could use for `actor_user_id`/
  `actor_account_id` (both `not null`, both foreign keys to a real
  account/user). A reader-side fix (ignore marks older than the listing's
  last `asset_type` change) needs a new fact this schema does not carry
  yet, when that change happened, and is a real design decision, not a
  same-session patch. Recorded here rather than rushed.
- **"Retail & F&B" (`labels.ts`) is folded into one asset type without the
  F&B-specific fact fields** (grease trap, gas supply, electrical load,
  outdoor-seating rights) that would make the fold complete; only the new
  shot above was added this round. Defensible as a product choice (every
  Saudi market report treats F&B as a retail sub-segment) but incomplete
  as shipped; a later package's own scope, not silently expanded into here.
- A tier of lower-confidence, genuinely-judgment-call findings the review
  itself did not recommend acting on before ship: `moderation_state`'s
  `'removed'` value reading the same as the owner's own "Remove" button
  once a moderation UI exists (moot today, since nothing renders
  `moderation_state` yet); `land`'s single `road_frontage` shot not
  distinguishing a corner plot's two fronting streets; an optional
  hospitality "view from guest rooms" shot for Makkah/Madinah stock; a
  Saudi K-12 gender-separated-wings consideration for `education`. None
  block this gate; each is a real product question for whoever owns that
  asset type's brief next.

## 13. Two Codex findings resolved before this package could be called ready

Raised directly against this package after section 12's review, with an
explicit instruction not to defer either. Both are now built, tested, and
carried through every section above; this section is the single place that
states each finding, the fix, and what was verified, together.

### Finding 1: asset-type changes must invalidate incompatible evidence marks

**The finding.** `listing_evidence_marks` is keyed on `item_key` values
several of which are reused across asset types with different meanings
(`frontage`: retail's shopfront vs. showroom's display glazing;
`back_of_house`: retail's stockroom vs. hospitality's kitchens and stores;
`room_typical`: hospitality's guest key vs. worker_housing's occupancy
room). Migration B already solved this exact problem for `shot_key` with
`clear_media_shot_keys_on_asset_type_change`; until this fix, nothing did
the equivalent for the evidence ledger, so a mark made under one asset type
could silently read as effective under a different one.

**The fix.** `supabase/migrations/20260905_pkg1b_evidence_mark_invalidation.sql`
(section 1 item 5, full detail in sections 2, 5, 6 and 7): a third ledger
action, `invalidated_by_asset_change`, appended (never an `UPDATE`, the
ledger stays append-only) by a new trigger for every item still effectively
`marked_unavailable` at the instant a listing's `asset_type` changes.
"Effective" is read the same way `guidedEvidence.ts`'s `currentEvidenceMarks()`
already reads it (latest row per item wins), which needed no code change at
all to correctly exclude the new action, a fact the tests below prove
rather than assume. Conservative by design, matching migration B's own
stated reasoning exactly: every currently-effective mark is invalidated on
any asset_type change, not only ones the trigger could prove are
incompatible, because there is no second, SQL-side copy of
`mediaStandard.ts`'s taxonomy to check against, and a false "still valid"
is the failure this exists to prevent.

**Verified against every acceptance case named:**

| Case | Where |
| --- | --- |
| Office mark, then change to warehouse (or here, retail to showroom): incompatible mark is not effective | isolated harness, "changing asset_type to showroom invalidates the retail-meaning 'frontage' mark"; `guidedEvidence.test.ts` |
| Change back to the original type: the previous mark does not silently become effective again | isolated harness, "reverting to the original asset type does not resurrect the invalidated mark"; `guidedEvidence.test.ts` |
| Audit history still shows what happened and why | the invalidation row's own `reason` states both asset types by name, not a null or generic note |
| Concurrent saves cannot leave a mixed effective state | the trigger runs inside the same transaction as the `asset_type` `UPDATE` (standard Postgres `AFTER` trigger semantics); no separate transaction exists for a concurrent reader to observe half-applied |
| A failed asset-type transition rolls back all invalidations atomically | same transaction, same guarantee: any error rolls back the trigger's inserts with the `UPDATE` that fired it |
| EN and AR show the same effective truth | `currentEvidenceMarks()` is the one function both locales' readers call; its return value carries no language, only the item key and reason string already in the reason the caller supplied |
| Compatible shared evidence remains only if semantics are genuinely identical | not attempted, by design: no reliable way to state "genuinely identical" in SQL without a second taxonomy copy, so the conservative "invalidate everything currently effective" is the actual answer, tested explicitly in the harness ("a currently-effective mark of any item_key is invalidated too") and distinguished from an already-cleared item, which correctly gets no spurious row |

Also verified: reapplication safety (idempotent, isolated harness), rollback
removes the trigger and function cleanly and a forward re-apply on a fresh
listing works again, and a client cannot submit the new action directly
through the API (`evidence-marks/route.ts`'s own `ACTIONS` allowlist,
unchanged, deliberately narrower than the database's own vocabulary). 8 new
isolated-harness checks and 4 new `guidedEvidence.test.ts` tests; full
counts in section 4.2's evidence files.

**Not claimed:** that "genuinely identical semantics" preservation is
implemented. It is not, on purpose (see the table above); the platform asks
a lister to reassert a mark that happened to still be true after an asset
type change, rather than risk one that silently was not.

### Finding 2: media visibility must be enforced, not merely recorded

**The finding.** Correcting `visibility`'s default to `'public'` (section 3,
5) made the column's *default value* honest. It did not make the column do
anything: nothing read it, so a row actually set to `'private'` by any
future means would still have rendered publicly.

**The audit, done before writing a fix.** Every file under `src/app` (and
the discovery/search/lister/building/flyer/compare surfaces the finding
named) was checked for whether it reads real `listing_media` rows at all.
Public listing cards, the "similar spaces" section, the flyer page, the
building page and the compare page all render `photoFor()`/`galleryFor()`
(`src/lib/photos.ts`), deterministic placeholder stock images keyed on
asset type and id, never a real uploaded photo; the JSON-LD blocks on the
public listing page carry no `image` field; the sitemap carries no image
entries; the public lister pages render no gallery at all. The **single**
place in this entire codebase that ever serves a real, uploaded
`listing_media` row to an anonymous reader is
`src/app/[locale]/listings/[id]/page.tsx`'s own query (hero photo, full
gallery, floor plans, and brochure signed-URL downloads all come from this
one result set). This materially narrows the finding's scope; it does not
reduce its severity where it actually applies.

**The fix.** `src/lib/mediaVisibility.ts`: one rule, `visibility = 'public'
AND moderation_state <> 'removed'`, as both a predicate
(`isPubliclyVisibleMedia`) and a query-level filter (`scopeToPublicMedia`),
so the two cannot drift apart. Applied at the one real call site. Every
"at minimum" requirement:

- **Private media never enters a public response, signed URL, metadata
  object, structured data or downloadable document**: the filter runs
  before the query's own signed-URL generation and before the values that
  feed the page's `JsonLd` blocks are ever assembled, so a private or
  removed row is excluded from `media` before any of those exist.
- **Owner preview may show the owner's private media with a clear private
  label**: the owner's own dashboard media manager now selects
  `visibility` and renders a "Private" badge on any photo not `'public'`.
  No control to actually set a photo private was built in this pass (that
  is a real product decision, the same class as `is_cover`'s own deferred
  scope, not an oversight); the badge is the forward-compatible half, so
  the Studio can never silently disagree with what the public page shows
  once a future package adds that control.
- **Rejected media must never render publicly**: `moderation_state <>
  'removed'` is the second half of the same filter, not a separate one.
- **Unreviewed media's treatment is explicit**: `'unreviewed'` (today's
  default, and the only state any real action has ever produced, since no
  moderation workflow exists) stays visible, stated as a deliberate choice
  in `mediaVisibility.ts`'s own comment and tested directly
  (`mediaVisibility.test.ts`), not left to be inferred. Full moderation
  enforcement (acting on `'flagged'`, building a review workflow) belongs
  to a future package (LST-6 or equivalent), stated here precisely rather
  than silently expanded into this one.
- **Existing media is backfilled deliberately, not by accident**: there is
  no backfill to write, because the default itself (`'public'`) already
  matches what every existing row's actual, live behaviour has always
  been; a listing's photos look exactly as they did before this migration,
  which is the explicit smoke-test check added to section 11 step 4.
- **New defaults match actual product behaviour and visible wording**:
  `'public'`, matched to the one real, currently-live consumer, not to an
  aspirational future one.
- **No UI claims enforcement it does not have**: the new "Private" badge
  only ever renders from the real column value; no copy anywhere asserts a
  visibility or moderation choice is respected beyond what
  `mediaVisibility.ts` actually filters.
- **Structural test so a future unfiltered query fails the gate**:
  `mediaVisibility.test.ts` walks every file under `src/app`, finds every
  one that queries `listing_media` at all, and requires each to be on an
  explicit, reasoned owner-scoped allowlist or to call `scopeToPublicMedia`
  itself; a new file in neither category fails the test by name, and a
  listed file that stops calling the function fails a second, separate
  assertion.

**Not claimed:** that a lister can set a photo to private today (no such
control was built, see above); that `moderation_state` is acted on beyond
excluding `'removed'` (flagging has no review workflow to feed it yet);
that this has been checked against production's real grants (section 4.1's
gap applies here exactly as it does everywhere else in this package,
post-migration query 6 in section 10 remains the real, live confirmation
this runbook still owes).

## 14. Primary sources for the three regulation-derived shots

Section 12's Fable review asserted three shots (warehouse fire protection,
gas station service block, worker housing fire safety) were tied to real
Saudi regulatory requirements, from the reviewing model's own general
knowledge, not a checked citation. Codex's own instruction was explicit:
record primary sources for anything derived from regulation, and never
present market convention as a legal requirement. Verified by web search,
2026-09-05, before letting the claims stand as written:

- **Warehouse fire protection** (`fire_protection`): Saudi Building Code
  SBC 801 (Fire Protection Requirements) incorporates NFPA 13 (Standard
  for the Installation of Sprinkler Systems), which requires ESFR
  sprinkler heads for rack storage above 7.5m; Civil Defense enforces SBC
  compliance as a building-licensing gate.
  [SBC 801, official document](https://sbc.gov.sa/ar/BC/Documents/tableofcontent2024/SBC%20801/SBC801_CR_241224-FA.pdf),
  a primary government source. Corroborating secondary detail:
  [Sprinkler Systems in Saudi Arabia](https://dar-alhmaya.com/en/sprinkler-systems-in-saudi-arabia-regulations-technology-and-best-practices/),
  [Saudi Civil Defense Fire Safety Regulations](https://www.lifeco-uk.com/saudi-civil-defense-regulations-for-fire-safety-equipment/).
- **Gas station service block** (`service_block`): MOMRAH's fuel-station
  licensing categories require a Category A station to provide a mosque
  of at least 200 sqm (a Category B station, a 20 sqm prayer room),
  separate men's and women's restrooms (with real, enforced fines for
  uncleanliness), and a retail shop.
  [Complete Fuel Stations Guide 2025](https://raghdan.sa/en/news/complete-fuel-stations-guide-2025-categories-permits-requirements-qualification-and-approved-companies-in-saudi-arabia/),
  an industry guide summarizing MOMRAH's own categories, not the raw
  government text itself; corroborating:
  [Saudi Arabia: 2,500 riyal fine imposed on petrol stations for unkept toilets](https://gulfnews.com/world/gulf/saudi/saudi-arabia-2500-riyal-fine-imposed-on-petrol-stations-for-unkept-toilets-1.98780543).
- **Worker housing fire safety** (`fire_safety`): labor accommodation is
  jointly regulated by MOMRAH and HRSD (Ministry of Human Resources and
  Social Development), whose standards name fire safety systems (alarms,
  extinguishers) and emergency exits as required, regularly inspected
  compliance items, alongside per-person space and occupancy limits
  `assetFields.ts` already records separately.
  [Legal Requirements for Labor Camp Accommodation in Saudi Arabia](https://www.namariq.com.sa/legal-requirements-for-labor-camp-accommodation-in-saudi-arabia/),
  [Health and safety in the work environment, HRSD](https://www.hrsd.gov.sa/en/care-about-you/health-and-safety)
  (the ministry's own site, a primary source for the framework's
  existence, though not itself the specific worker-housing standard text).

None of these three shots' own lister-facing `why_en`/`why_ar` text was
rewritten as a result: each already read as a practical, defensible
statement rather than an overclaimed legal mandate, and the claims check
out against what was found. What changed is that each now carries a
source citation in `mediaStandard.ts`'s own comments, so the claim is
recorded rather than merely believed. The nine shots added on Fable
review that are NOT regulation-derived (market-convention shots like
wedding_hall's two-section convention, showroom's mezzanine, retail's F&B
services and outdoor seating, gas station's ancillary income units, and
worker housing's compound perimeter and utilities provision) are
presented in their own why-text as practical/market reasoning, not as
citing a specific regulation, which is the correct treatment for a market
convention and was not changed here.
