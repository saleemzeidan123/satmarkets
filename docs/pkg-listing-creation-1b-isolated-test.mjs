// Isolated-environment test harness for PKG-LISTING-CREATION-1B's eleven
// migrations (seven from 2026-09-05, plus four from the 2026-09-12
// security-closure round, one of which, the trusted-object-binding
// migration, was added the SAME day by a second, adversarial correction
// pass after the first pass's own storage-policy fix was found to trust
// an owner-writable column as proof of legitimate upload), recorded as
// evidence in docs/pkg-listing-creation-1b-migration-runbook.md sections
// 4 and 18/19.
// Not wired into this repo's own package.json/gate: it depends on the
// `embedded-postgres` and `pg` packages, which are deliberately not repo
// devDependencies (this is a diagnostic, not ongoing tooling). To re-run it:
//
//   mkdir /path/to/scratch && cd /path/to/scratch
//   npm init -y && npm install embedded-postgres@16.14.0-beta.17 pg
//   cp <repo>/docs/pkg-listing-creation-1b-isolated-test.mjs .
//   node pkg-listing-creation-1b-isolated-test.mjs /absolute/path/to/satmarkets/repo
//
// Spins up a real local Postgres 16 via `embedded-postgres` (userspace, no
// Docker/sudo/system changes), reconstructs a minimal stand-in for the base
// schema these migrations depend on, applies the real migration files
// verbatim, and runs a deterministic test matrix against them.
//
// UPDATED, 2026-09-12: the base-schema stand-in is no longer purely
// reconstructed-by-inference. A genuine, project-scoped, read-only Supabase
// connection (not the account-wide connector this repo's own docs record as
// pointed at the wrong account) reached the real production project and
// returned real pg_policies text for all five listing_media policies and
// the one storage.objects policy governing the listing-media bucket, the
// real storage.buckets.public flag, and real effective grants (including
// PUBLIC and role-membership-inherited privileges, via aclexplode and
// has_table_privilege, not only information_schema, which this session
// separately confirmed under-reports for a restricted connecting role).
// Those five table policies, the one storage policy (both AS THEY STOOD
// BEFORE this round's own fix), storage.foldername(), and app.demo_visible()
// are now reproduced VERBATIM in BOOTSTRAP_SQL below, not paraphrased or
// invented; app_user_id()/app_account_id()/app_is_sat() remain
// call-compatible STUBS, not real bodies (never obtained, real identity
// resolution is out of this session's scope). Step 0b below proves the real,
// pre-fix policy text is genuinely vulnerable BEFORE any migration applies;
// Step 8g proves this round's four new migrations close it, across anon,
// unrelated authenticated, owning-account, SAT, and service_role, and Step 9
// proves all four are safely reversible and safely re-appliable.
//
// This proves the migration SQL itself (idempotency, constraints, and now,
// for the first time, REAL RLS POLICY TEXT enforcing real row-level and
// column-level access decisions, not only application-level query shapes)
// on a real Postgres engine. It does NOT prove the migrations apply cleanly
// to the real production schema's exact existing OTHER objects (unrelated
// tables, unrelated policies) or reproduce the real bodies of the app_*
// identity functions, since this harness still cannot execute DDL against
// that database (this session's own connection is read-only by design, not
// merely by convention: execute_sql/list_tables/list_migrations/
// list_extensions only). That narrower gap is recorded in the runbook, not
// hidden by this test.

import { readFileSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const repoRoot = process.argv[2];
if (!repoRoot) {
  console.error("usage: node pkg-listing-creation-1b-isolated-test.mjs <path to satmarkets repo root>");
  process.exit(2);
}
const REPO_MIGRATIONS = path.join(repoRoot, "supabase", "migrations") + path.sep;
const BASE_MIGRATION_FILES = [
  "20260902_pkg1b_durable_evidence_state.sql",
  "20260902b_pkg1b_media_categorization.sql",
  "20260902c_pkg1b_media_content_fingerprint.sql",
  "20260902d_pkg1b_media_derivation_integrity.sql",
  "20260905_pkg1b_evidence_mark_invalidation.sql",
  "20260905b_pkg1b_media_cleanup_queue.sql",
  "20260905c_pkg1b_media_url_photo_block.sql",
];
// Security closure, 2026-09-12: applied in a separate, later pass (Step 1c),
// after a dedicated "before this round's own fix" proof (Step 1b) that
// needs content_sha256 (added by the base migrations above) to already
// exist but these three NOT to have applied yet. Exercised with the same
// rigor as the seven above everywhere else (Step 2 idempotent reapply,
// Step 9 rollback/forward-reapply both use the full combined list below),
// not as a separate, less-rigorous side path.
const SECURITY_MIGRATION_FILES = [
  "20260912_pkg1b_sensitive_media_column_grants.sql",
  // Correction, same day, adversarial review: inserted ahead of the
  // storage-boundary migration (renamed b -> c to make room), since that
  // migration's own EXISTS clause now depends on the columns this one adds.
  "20260912b_pkg1b_media_trusted_object_binding.sql",
  "20260912c_pkg1b_storage_originals_read_boundary.sql",
  "20260912d_pkg1b_media_row_visibility_boundary.sql",
];
const MIGRATION_FILES = [...BASE_MIGRATION_FILES, ...SECURITY_MIGRATION_FILES];

const ROLLBACK_SQL = `
-- Reverse of migration 20260912d (security closure, row visibility boundary)
drop policy if exists "public read eligible media of published" on public.listing_media;
create policy "public read media of published" on public.listing_media for select
  using (exists (
    select 1 from public.listings l
    where l.id = listing_media.listing_id
      and l.status = 'published'
      and (not l.is_demo or app.demo_visible())
      and coalesce(l.ad_permit_number, l.ad_permit_no) is not null
      and l.ad_permit_expires_at > now()
  ));

-- Reverse of migration 20260912c (security closure, storage read boundary)
drop policy if exists "read eligible media objects or own listing" on storage.objects;
create policy "read media objects of published or own listing" on storage.objects for select
  using (
    bucket_id = 'listing-media'
    and (
      (storage.foldername(name))[1] = app_account_id()::text
      or app_is_sat()
      or exists (
        select 1 from public.listings l
        where l.id::text = (storage.foldername(objects.name))[2]
          and l.status = 'published'
      )
    )
  );

-- Reverse of migration 20260912b (security closure, trusted object binding)
-- Correction, fourth adversarial review: this block previously omitted
-- the object-identity freeze trigger and the validated-provenance
-- function, both added to 20260912b across the two prior correction
-- rounds. Neither references is_legacy_media/derivation_verified in a
-- way that would have errored if left behind, so no existing test caught
-- the omission, but a "rollback" that leaves the freeze trigger attached
-- (still blocking path/source/listing_id updates on the old, pre-fix
-- schema) is not a genuine, complete reversal.
drop function if exists public.grant_validated_legacy_media_trust(timestamptz, timestamptz, boolean);
drop trigger if exists listing_media_freeze_object_identity on public.listing_media;
drop function if exists public.listing_media_freeze_object_identity();
drop trigger if exists listing_media_protect_legacy_flag on public.listing_media;
drop function if exists public.listing_media_protect_legacy_flag();
drop table if exists public.listing_media_legacy_backfill_done;
alter table public.listing_media
  drop column if exists derivation_verified,
  drop column if exists is_legacy_media;

-- Reverse of migration 20260912 (security closure, column grants)
revoke select on public.listing_media from anon, authenticated;
grant select on public.listing_media to anon, authenticated;

-- Reverse of migration G
drop trigger if exists listing_media_block_new_url_photos on public.listing_media;
drop function if exists public.listing_media_block_new_url_photos();

-- Reverse of migration F
drop table if exists public.media_cleanup_queue;

-- Reverse of migration E. Its constraint changes need no separate reversal:
-- "reverse of migration A" below drops listing_evidence_marks outright,
-- taking every constraint on it with it. Only the trigger and function,
-- defined on public.listings rather than on the table being dropped,
-- survive a table drop and need an explicit drop of their own.
drop trigger if exists invalidate_evidence_marks_on_asset_type_change on public.listings;
drop function if exists public.invalidate_evidence_marks_on_asset_type_change();

-- Reverse of migration D
drop trigger if exists listing_media_protect_trusted_columns_d on public.listing_media;
drop function if exists public.listing_media_protect_trusted_columns_d();
alter table public.listing_media drop constraint if exists listing_media_derivation_shape;
alter table public.listing_media
  drop column if exists original_path,
  drop column if exists derived_transforms,
  drop column if exists derived_by,
  drop column if exists derived_at;

-- Reverse of migration C
drop trigger if exists listing_media_protect_trusted_columns_c on public.listing_media;
drop function if exists public.listing_media_protect_trusted_columns_c();
drop index if exists public.listing_media_content_sha256_unique;
alter table public.listing_media drop column if exists content_sha256;

-- Reverse of migration B
drop trigger if exists listing_media_protect_trusted_columns_b on public.listing_media;
drop function if exists public.listing_media_protect_trusted_columns_b();
drop trigger if exists clear_media_shot_keys_on_asset_type_change on public.listings;
drop function if exists public.clear_media_shot_keys_on_asset_type_change();
alter table public.listing_media
  drop column if exists shot_key,
  drop column if exists media_scope,
  drop column if exists media_condition,
  drop column if exists rights_acknowledged_by,
  drop column if exists rights_acknowledged_at,
  drop column if exists visibility,
  drop column if exists moderation_state;

-- Reverse of migration A
drop table if exists public.listing_evidence_marks;
`;

const BOOTSTRAP_SQL = `
-- No "create extension pgcrypto": gen_random_uuid() has been a Postgres
-- core built-in since PG13 (this harness targets a real Postgres 16), so
-- the extension is unnecessary here, and this specific embedded-postgres
-- Windows binary distribution does not bundle pgcrypto at all (confirmed:
-- its native/share/postgresql/extension directory does not exist, and
-- native/lib holds only dict_snowball, plpgsql, utf8_and_win). Requiring
-- it was dead weight, not a real dependency of anything this harness does.

create table public.accounts (
  id uuid primary key default gen_random_uuid()
);

create table public.users (
  id uuid primary key default gen_random_uuid()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id),
  asset_type text not null default 'office'
);

create table public.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  kind text not null default 'photo',
  path text,
  source text,
  sort_order int not null default 0,
  -- Security closure, 2026-09-12: the remaining real production columns
  -- (confirmed via information_schema.columns against the real project,
  -- read-only connection) that predate this package's own seven migrations
  -- and were not previously needed by this harness. 20260912_pkg1b_
  -- sensitive_media_column_grants.sql names all of these explicitly in its
  -- own GRANT column list, so they must exist here for that migration to
  -- apply at all, matching the real table it targets.
  alt_en text,
  alt_ar text,
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  mime text,
  bytes int,
  plan_type text
);

-- Call-compatible stubs, not the real bodies (not retrieved in this
-- session): same zero-arg signature and return type as the real
-- app_user_id()/app_account_id()/app_is_sat(), parameterised by session
-- GUCs the test sets directly, so RLS POLICY LOGIC can be exercised
-- deterministically without needing the real identity-resolution chain.
create or replace function public.app_user_id() returns uuid
language sql stable as $$
  select nullif(current_setting('app.test_user_id', true), '')::uuid
$$;

create or replace function public.app_account_id() returns uuid
language sql stable as $$
  select nullif(current_setting('app.test_account_id', true), '')::uuid
$$;

create or replace function public.app_is_sat() returns boolean
language sql stable as $$
  select coalesce(nullif(current_setting('app.test_is_sat', true), '')::boolean, false)
$$;

-- RLS does not apply to the table owner or a superuser. All policy tests
-- must run as this non-owner role, named exactly as Supabase's own real
-- non-owner role, because migrations B/C/D's own Codex-review REVOKE
-- statements name "authenticated" literally: this role has to be the real
-- target for those statements to mean anything in this harness.
create role authenticated nologin;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Security closure, 2026-09-12: a real, unauthenticated caller (the public
-- anon key, embedded in every page's client bundle) is a DISTINCT role from
-- a signed-in stranger. The harness previously had no stand-in for it at
-- all (every prior round's tests used "authenticated", with or without an
-- identity GUC set); item 4 of the security-closure review explicitly asks
-- for anonymous coverage separately from "unrelated authenticated". A real
-- production grant snapshot (2026-09-12) confirms anon holds the same
-- table-wide grants authenticated does today, mirrored here.
create role anon nologin;
grant usage on schema public to anon;
grant select, insert, update, delete on all tables in schema public to anon;

-- Codex review, trusted-write boundary. Supabase's real service_role is a
-- superuser-equivalent that bypasses RLS by role attribute (BYPASSRLS),
-- not by a policy exception; this stand-in matches that exactly; so a
-- test using it can prove "the trusted path still works" without needing
-- a different mechanism than production actually uses.
create role service_role nologin bypassrls;
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;

-- Security closure, third adversarial review, item 3: the blanket GRANTs
-- above are ONE-TIME, applying only to tables that already exist at this
-- point in the script. A table created LATER by a migration (e.g.
-- listing_media_legacy_backfill_done) would get NO grant at all under
-- this harness as previously written, which does not accurately model
-- the real project: this package's own real, confirmed production
-- evidence is that anon/authenticated hold broad grants by default on
-- every table checked so far, strongly implying a real
-- ALTER DEFAULT PRIVILEGES (or equivalent) applies broadly in the real
-- project, not that each table happens to have been granted by hand.
-- Modelled here so that a later migration's own explicit REVOKE against
-- this default (the marker table's own lockdown) is a genuine test of
-- overriding a real default, not a vacuous pass against a harness that
-- never granted anything by default in the first place.
alter default privileges in schema public grant select, insert, update, delete, truncate on tables to anon, authenticated;

-- Base-schema gap (docs/pkg-listing-creation-1b-migration-runbook.md
-- section 4.1 / 18): everything below this line is NOT in any local
-- migration file. It is part of the real production schema this
-- repository's own migrations have never captured, reconstructed here,
-- verbatim where the real text was actually obtained (2026-09-12, a
-- genuine read-only connection to the real project), as a stand-in exactly
-- like app_user_id()/app_account_id()/app_is_sat() already are above. This
-- package's own new security-closure migrations alter or replace some of
-- these; the point of reconstructing the real "before" state here, rather
-- than starting from an idealized one, is so this harness can prove what
-- those migrations actually change, not merely that new SQL runs without
-- error.

alter table public.listings
  add column status text not null default 'draft' check (status in ('draft', 'published')),
  add column is_demo boolean not null default false,
  add column ad_permit_number text,
  add column ad_permit_no text,
  add column ad_permit_expires_at timestamptz;

create schema app;
-- Real name, real schema (app.demo_visible(), distinct from
-- app_account_id()/app_is_sat() which the real policy text calls bare,
-- unqualified). GUC-controlled, matching this file's own existing stub
-- pattern for the other three identity functions.
create or replace function app.demo_visible() returns boolean
language sql stable as $$
  select coalesce(nullif(current_setting('app.test_demo_visible', true), '')::boolean, false)
$$;
grant usage on schema app to anon, authenticated, service_role;

alter table public.listing_media enable row level security;

-- The five real listing_media policies (captured verbatim, 2026-09-12,
-- pg_policies against the real project). The real "roles" column reads
-- {public} for all five, meaning the Postgres pseudo-role PUBLIC (applies
-- regardless of role, not this harness's own Supabase-style "anon"/
-- "authenticated" role names); granted to public here for the same effect.
create policy "owner selects own listing media" on public.listing_media for select
  using (exists (select 1 from public.listings l where l.id = listing_media.listing_id and l.account_id = app_account_id()));
create policy "owner inserts own listing media" on public.listing_media for insert
  with check (exists (select 1 from public.listings l where l.id = listing_media.listing_id and l.account_id = app_account_id()));
create policy "owner updates own listing media" on public.listing_media for update
  using (exists (select 1 from public.listings l where l.id = listing_media.listing_id and l.account_id = app_account_id()));
create policy "owner deletes own listing media" on public.listing_media for delete
  using (exists (select 1 from public.listings l where l.id = listing_media.listing_id and l.account_id = app_account_id()));
create policy "public read media of published" on public.listing_media for select
  using (exists (
    select 1 from public.listings l
    where l.id = listing_media.listing_id
      and l.status = 'published'
      and (not l.is_demo or app.demo_visible())
      and coalesce(l.ad_permit_number, l.ad_permit_no) is not null
      and l.ad_permit_expires_at > now()
  ));
-- Correction, same-day adversarial review: an earlier version of this
-- harness added a SIXTH policy here, "sat reads all listing media", not
-- present in the real, captured five, to make this harness's own SAT-role
-- table-SELECT tests pass. That is exactly the "test-only permission to
-- obtain green results" this package's own honesty protocol exists to
-- catch: a disclosed invention is still an invention, and it made the
-- suite's own "141/141 against the real captured policy text" claim
-- overstated for the SAT-role assertions specifically. Removed outright,
-- not merely relabeled. The real, intended SAT authorization path for
-- listing_media, confirmed by reading src/app/api/listings/[id]/review/
-- route.ts (the one real reviewer-facing write this codebase has today),
-- is a SESSION-GATED APPLICATION ROUTE using getSupabaseServiceRole()
-- after checking su.isSat in code, the same pattern this package's own
-- trusted-column triggers already single out service_role for, NOT a
-- database RLS policy granting app_is_sat() broad table access. Step 8g
-- below tests THAT real path explicitly (service_role, already exempted
-- by every trigger and by 20260912's own grant restriction) instead of
-- asserting an RLS-level SAT capability nothing in the real schema
-- confirms exists. If a future package gives SAT a genuine RLS-level read
-- of listing_media (rather than routing every reviewer action through a
-- service-role-backed route, as every other privileged action in this
-- codebase already does), that is a real, deliberate schema change to
-- make and test then, not a gap to paper over here.

create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);
-- Real value (storage.buckets.public, 2026-09-12, read-only connection):
-- false. The bucket is genuinely private; this is not assumed from a code
-- comment.
insert into storage.buckets (id, name, public) values ('listing-media', 'listing-media', false);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id),
  name text not null,
  owner uuid,
  created_at timestamptz not null default now()
);

-- Supabase's own real helper (the storage-api extension, not vanilla
-- Postgres, so embedded-postgres has no built-in copy): every path segment
-- except the filename. Reproduced to match its real, documented behaviour,
-- since the real policy text's own use of it ((storage.foldername(name))[1],
-- [2]) only makes sense against this exact semantics.
create or replace function storage.foldername(name text) returns text[]
language plpgsql immutable as $$
declare
  _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1 : array_length(_parts, 1) - 1];
end;
$$;

alter table storage.objects enable row level security;

-- The real, currently-live storage policy (captured verbatim, 2026-09-12):
-- folder-membership only, no distinction between a derivative and its
-- preserved original under the same listing's own originals/ subfolder.
-- Live here, before 20260912b_pkg1b_storage_originals_read_boundary.sql
-- replaces it in Step 1 below, so the vulnerability that migration closes
-- can be demonstrated against the real policy text itself, not a
-- description of it.
create policy "read media objects of published or own listing" on storage.objects for select
  using (
    bucket_id = 'listing-media'
    and (
      (storage.foldername(name))[1] = app_account_id()::text
      or app_is_sat()
      or exists (
        select 1 from public.listings l
        where l.id::text = (storage.foldername(objects.name))[2]
          and l.status = 'published'
      )
    )
  );

grant usage on schema storage to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
`;

let passCount = 0;
let failCount = 0;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    passCount++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failCount++;
    failures.push({ name, err });
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

async function asTestRole(pg, { userId, accountId, isSat }) {
  const client = pg.getPgClient("satmarkets_test");
  await client.connect();
  await client.query("set role authenticated");
  await client.query("select set_config('app.test_user_id', $1, false)", [userId ?? ""]);
  await client.query("select set_config('app.test_account_id', $1, false)", [accountId ?? ""]);
  await client.query("select set_config('app.test_is_sat', $1, false)", [isSat ? "true" : "false"]);
  return client;
}

// Stands in for getSupabaseServiceRole()'s own client: Supabase's real
// service_role, a superuser-equivalent (BYPASSRLS) exempted, by name, in the
// body of every trusted-column-protection trigger migrations B/C/D add.
// Used for the adversarial tests proving the trusted-write boundary actually
// works in both directions (authenticated denied, service_role allowed),
// and for exercising media_cleanup_queue (migration F), which RLS blocks
// for every role except this one.
async function asServiceRole(pg) {
  const client = pg.getPgClient("satmarkets_test");
  await client.connect();
  await client.query("set role service_role");
  return client;
}

// Security closure, 2026-09-12: a genuinely unauthenticated caller. No
// app.test_user_id/app.test_account_id GUC is set at all (left at this
// connection's own default, unset), matching a real anonymous request
// exactly: app_user_id()/app_account_id() resolve to NULL, app_is_sat() to
// false, the same as they would for a direct PostgREST call carrying only
// the public anon key and no session.
async function asAnonRole(pg) {
  const client = pg.getPgClient("satmarkets_test");
  await client.connect();
  await client.query("set role anon");
  return client;
}

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: "./data/db",
    user: "postgres",
    password: "password",
    port: 55432,
    persistent: false,
    onLog: () => {},
    onError: (e) => console.error("[postgres]", e),
  });

  console.log("Starting embedded Postgres 16...");
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("satmarkets_test");
  console.log("Postgres up on port 55432, database satmarkets_test created.\n");

  const admin = pg.getPgClient("satmarkets_test");
  await admin.connect();

  try {
    console.log("=== Bootstrap: minimal stand-in schema + RLS stub helpers ===");
    await check("bootstrap schema applies with no error", async () => {
      await admin.query(BOOTSTRAP_SQL);
    });

    console.log("\n=== Step 0b: the REAL, currently-live storage policy is genuinely vulnerable (before any migration applies) ===");
    // Runs exactly once, here, before Step 1a applies anything: the one
    // point in the script where the base schema's real, currently-live
    // storage policy (bootstrap SQL above, captured verbatim 2026-09-12) is
    // still in force, unmodified. The content_sha256/original_path column
    // grant and the listing_media row-visibility gap need columns migration
    // C/B add first, so their own "before fix" proofs run later, in Step
    // 1b, after the base migrations but before this round's own three.
    let step0bDerivPath, step0bOrigPath, step0bListingV;
    // Populated in Step 1b, below: a row inserted with no content_sha256
    // BEFORE 20260912b_pkg1b_media_trusted_object_binding.sql's own
    // one-time backfill runs, so it becomes genuinely, mechanically
    // is_legacy_media = true, not merely simulated as such. Referenced by
    // Step 8g's own "legacy media stays readable" storage test.
    let preMigrationLegacyPath, preMigrationLegacyMediaId;
    {
      const acctV = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
      const acctStranger = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
      const listingV = (
        await admin.query(
          `insert into public.listings (account_id, status, ad_permit_number, ad_permit_expires_at)
           values ($1, 'published', '7200000001', now() + interval '30 days') returning id`,
          [acctV],
        )
      ).rows[0].id;
      const derivPath = `${acctV}/${listingV}/before-fix-derivative.webp`;
      const origPath = `${acctV}/${listingV}/originals/before-fix-original.jpg`;
      step0bDerivPath = derivPath; step0bOrigPath = origPath; step0bListingV = listingV;
      await admin.query("insert into public.listing_media (listing_id, path) values ($1, $2)", [listingV, derivPath]);
      await admin.query(
        "insert into storage.objects (bucket_id, name) values ('listing-media', $1), ('listing-media', $2)",
        [derivPath, origPath],
      );

      await check("BEFORE FIX: an unrelated stranger can already read the derivative of a published listing's media row (expected: this is the intended, legitimate public behaviour)", async () => {
        const c = await asTestRole(pg, { userId: null, accountId: acctStranger, isSat: false });
        try {
          const r = await c.query("select 1 from public.listing_media where listing_id = $1 and path = $2", [listingV, derivPath]);
          assert(r.rowCount === 1, "a published listing's media should already be readable by anyone; if this fails, the fixture itself is wrong");
        } finally {
          await c.end();
        }
      });

      await check("BEFORE FIX: anon can read (sign) the PRESERVED ORIGINAL object under originals/, identically to the derivative, via the real storage policy's own folder-membership logic", async () => {
        // storage.foldername((account)/(listing)/originals/(file)) =
        // [account, listing, 'originals']; segment [2] (the listing id) is
        // identical to the derivative's own segment [2], and the real
        // policy's third branch never inspects segment [3]. This is the
        // exact mechanism 20260912b_pkg1b_storage_originals_read_boundary.sql
        // exists to close.
        const c = await asAnonRole(pg);
        try {
          const r = await c.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [origPath]);
          assert(r.rowCount === 1, "expected the preserved original to be readable by anon under the real, currently-live storage policy, proving the gap exists before this round's fix");
        } finally {
          await c.end();
        }
      });
    }

    console.log("\n=== Step 1a: apply the seven base migrations verbatim, in order ===");
    const migrationText = {};
    for (const file of BASE_MIGRATION_FILES) {
      const sql = readFileSync(REPO_MIGRATIONS + file, "utf8");
      migrationText[file] = sql;
      await check(`apply ${file}`, async () => {
        await admin.query(sql);
      });
    }

    // The blanket grant in BOOTSTRAP_SQL ran before listing_evidence_marks
    // or media_cleanup_queue existed (both created by this loop, A and F);
    // extend it now, matching how a real grant would need to cover a
    // genuinely new table. Scoped to exactly those two tables, not "all
    // tables in schema public": a blanket schema-wide regrant would also
    // silently re-widen listing_media's own SELECT back to unrestricted on
    // any later pass through this same statement (Step 9's forward
    // re-apply reuses it after 20260912 has already narrowed listing_
    // media's grant in that same pass), which is exactly the kind of
    // "narrower grant added, broader one left standing" mistake this whole
    // security round exists to close, not repeat.
    await admin.query(
      "grant select, insert, update, delete on public.listing_evidence_marks, public.media_cleanup_queue to authenticated, anon, service_role",
    );

    console.log("\n=== Step 1b: two more REAL, currently-live gaps are genuinely vulnerable (base migrations applied, this round's three security migrations have not) ===");
    // Needs content_sha256 (migration C) and visibility/moderation_state
    // (migration B) to exist, which Step 1a just applied; needs this
    // round's own three security migrations to NOT have applied yet, which
    // is true here and only here. Reuses step0bListingV/step0bDerivPath
    // from Step 0b: same published, permit-valid listing, same derivative
    // row, now with the later-added columns available on it.
    {
      const acctStranger2 = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
      const privatePath = `${step0bDerivPath}-private-sibling`;
      const privateMediaId = (
        await admin.query(
          "insert into public.listing_media (listing_id, path, visibility) values ($1, $2, 'private') returning id",
          [step0bListingV, privatePath],
        )
      ).rows[0].id;

      // A genuine pre-migration legacy row: no content_sha256 (this
      // package's own outcome C did not exist for it), visibility at its
      // column default 'public', inserted HERE, before
      // 20260912b_pkg1b_media_trusted_object_binding.sql's own one-time
      // backfill runs in Step 1c below. This is the one place in this
      // harness that can produce a row the real backfill will mechanically
      // mark is_legacy_media = true, rather than a fixture that merely
      // asserts the same end state.
      preMigrationLegacyPath = `${step0bDerivPath}-legacy-sibling`;
      preMigrationLegacyMediaId = (
        await admin.query(
          "insert into public.listing_media (listing_id, path) values ($1, $2) returning id",
          [step0bListingV, preMigrationLegacyPath],
        )
      ).rows[0].id;
      await admin.query("insert into storage.objects (bucket_id, name) values ('listing-media', $1)", [preMigrationLegacyPath]);

      await check("BEFORE FIX: anon can SELECT content_sha256 and original_path directly for a published listing's media (the real Fable-threat-model finding, proven against the real policy, not assumed)", async () => {
        // Table-wide SELECT, no column list (the real, confirmed production
        // grant): RLS lets the ROW through (public read media of
        // published); nothing at the column level stops these two from
        // coming back too. This is the exact defect 20260912_pkg1b_
        // sensitive_media_column_grants.sql exists to close.
        const c = await asAnonRole(pg);
        try {
          const r = await c.query(
            "select content_sha256, original_path from public.listing_media where listing_id = $1 and path = $2",
            [step0bListingV, step0bDerivPath],
          );
          assert(r.rowCount === 1, "expected the row to be readable at all (published, public read policy)");
        } finally {
          await c.end();
        }
      });

      await check("BEFORE FIX: an unrelated stranger can already read a PRIVATE media row's own path via the real table policy, which has no awareness of visibility/moderation_state at all (discovered building this harness, not assumed; closed by 20260912c_pkg1b_media_row_visibility_boundary.sql)", async () => {
        const c = await asTestRole(pg, { userId: null, accountId: acctStranger2, isSat: false });
        try {
          const r = await c.query("select path from public.listing_media where id = $1", [privateMediaId]);
          assert(r.rowCount === 1, "expected the real, currently-live 'public read media of published' policy to admit a private row too, proving the gap exists before this round's fix");
        } finally {
          await c.end();
        }
      });
    }

    console.log("\n=== Step 1c: apply this round's four security-closure migrations verbatim, in order ===");
    for (const file of SECURITY_MIGRATION_FILES) {
      const sql = readFileSync(REPO_MIGRATIONS + file, "utf8");
      migrationText[file] = sql;
      await check(`apply ${file}`, async () => {
        await admin.query(sql);
      });
    }

    await check("the one-time backfill genuinely marked the pre-migration row is_legacy_media, not merely a simulated end state", async () => {
      const r = await admin.query(
        "select is_legacy_media, derivation_verified from public.listing_media where id = $1",
        [preMigrationLegacyMediaId],
      );
      assert(r.rows[0].is_legacy_media === true, "a row with no content_sha256 that existed before this migration first ran must be marked legacy");
      assert(r.rows[0].derivation_verified === false, "derivation_verified must stay false: this row never went through the trusted pipeline, it is only legacy");
    });

    console.log("\n=== Step 1c-2: the legacy-backfill marker table is locked down (third adversarial review, item 3) ===");
    // The default-privileges statement in BOOTSTRAP_SQL means a table
    // created with no explicit grant/RLS of its own WOULD otherwise be
    // fully open to anon/authenticated, matching this package's own real,
    // confirmed production evidence for every other table checked so far.
    // A positive control on a DIFFERENT, deliberately-unprotected table
    // proves that baseline is genuinely modelled (not simply "nothing
    // was ever granted in this harness"), so the marker table's own
    // zero-privilege result below is evidence of its OWN explicit
    // lockdown, not an accident of an empty harness.
    await check("positive control: a table with no explicit grant/RLS of its own DOES inherit the default-privilege baseline (proves the baseline itself is real)", async () => {
      await admin.query("create table public.unprotected_control_table (id int primary key)");
      const r = await admin.query("select has_table_privilege('anon', 'public.unprotected_control_table', 'SELECT') as anon_select");
      assert(r.rows[0].anon_select === true, "a table with no explicit revoke must inherit the default-privilege grant; if this is false, the harness's own baseline is not modelling reality and the marker-table test below would be meaningless");
    });

    await check("listing_media_legacy_backfill_done: anon/authenticated/PUBLIC have ZERO effective privileges, for every DML privilege including TRUNCATE", async () => {
      for (const role of ["anon", "authenticated"]) {
        for (const priv of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"]) {
          const r = await admin.query(
            "select has_table_privilege($1, 'public.listing_media_legacy_backfill_done', $2) as has_priv",
            [role, priv],
          );
          assert(r.rows[0].has_priv === false, `${role} must have NO ${priv} privilege on the marker table, got true`);
        }
      }
      // PUBLIC itself, not only the two named roles: has_table_privilege
      // also accepts the literal pseudo-role name.
      const pub = await admin.query("select has_table_privilege('public', 'public.listing_media_legacy_backfill_done', 'SELECT') as has_priv");
      assert(pub.rows[0].has_priv === false, "the PUBLIC pseudo-role must have no SELECT on the marker table either");
    });

    await check("client tampering (INSERT, UPDATE, DELETE) against the marker table is rejected outright, both by RLS-zero-policies and by the explicit REVOKE", async () => {
      const c = await asAnonRole(pg);
      try {
        for (const sql of [
          "insert into public.listing_media_legacy_backfill_done default values",
          "update public.listing_media_legacy_backfill_done set backfilled_at = now()",
          "delete from public.listing_media_legacy_backfill_done",
        ]) {
          let denied = false;
          try {
            await c.query(sql);
          } catch (e) {
            denied = e.code === "42501";
          }
          assert(denied, `expected insufficient_privilege (42501) for: ${sql}`);
        }
      } finally {
        await c.end();
      }
    });

    await check("client tampering via TRUNCATE is rejected (RLS does not govern TRUNCATE at all; only the explicit REVOKE closes this)", async () => {
      const c = await asAnonRole(pg);
      try {
        let denied = false;
        try {
          await c.query("truncate public.listing_media_legacy_backfill_done");
        } catch (e) {
          denied = e.code === "42501";
        }
        assert(denied, "expected insufficient_privilege (42501) truncating the marker table; RLS alone would NOT catch this, since TRUNCATE is not governed by row security");
      } finally {
        await c.end();
      }
    });

    await check("client tampering cannot suppress the initial backfill or reset its one-time guarantee: the marker row itself, and every already-backfilled row, survive an anon TRUNCATE/DELETE attempt unchanged", async () => {
      const before = await admin.query("select count(*) from public.listing_media_legacy_backfill_done");
      assert(Number(before.rows[0].count) === 1, "fixture sanity: exactly one marker row should exist at this point");
      const c = await asAnonRole(pg);
      try {
        await c.query("truncate public.listing_media_legacy_backfill_done").catch(() => {});
        await c.query("delete from public.listing_media_legacy_backfill_done").catch(() => {});
      } finally {
        await c.end();
      }
      const after = await admin.query("select count(*) from public.listing_media_legacy_backfill_done");
      assert(Number(after.rows[0].count) === 1, "the marker row must be completely unaffected by anon's own tampering attempts, whether or not those attempts threw");
      const legacyStillMarked = await admin.query("select is_legacy_media from public.listing_media where id = $1", [preMigrationLegacyMediaId]);
      assert(legacyStillMarked.rows[0].is_legacy_media === true, "the pre-migration row's own legacy status must be completely unaffected by anon's tampering attempts against the marker table");
    });

    console.log("\n=== Step 2: reapplication idempotency (rerun all ten, expect zero errors) ===");
    for (const file of MIGRATION_FILES) {
      await check(`reapply ${file} is a no-op`, async () => {
        await admin.query(migrationText[file]);
      });
    }

    console.log("\n=== Step 3: schema shape sanity ===");
    await check("listing_evidence_marks table exists", async () => {
      const r = await admin.query(
        "select 1 from information_schema.tables where table_name = 'listing_evidence_marks'",
      );
      assert(r.rowCount === 1);
    });
    await check("listing_media has all 12 new columns (is_cover removed, Codex review)", async () => {
      const r = await admin.query(
        `select column_name from information_schema.columns
           where table_name = 'listing_media'
             and column_name in ('shot_key','media_scope','media_condition',
               'rights_acknowledged_by','rights_acknowledged_at','visibility',
               'moderation_state','content_sha256','original_path',
               'derived_transforms','derived_by','derived_at')`,
      );
      assert(r.rowCount === 12, `expected 12 columns, found ${r.rowCount}`);
    });
    await check("is_cover genuinely does not exist (removed, not merely unused)", async () => {
      const r = await admin.query(
        "select 1 from information_schema.columns where table_name = 'listing_media' and column_name = 'is_cover'",
      );
      assert(r.rowCount === 0, "is_cover should not exist; sort_order = 0 remains the one cover convention");
    });
    await check("RLS is enabled on listing_evidence_marks", async () => {
      const r = await admin.query(
        "select relrowsecurity from pg_class where relname = 'listing_evidence_marks'",
      );
      assert(r.rows[0].relrowsecurity === true);
    });
    await check("exactly two policies exist (select, insert only)", async () => {
      const r = await admin.query(
        "select cmd from pg_policies where tablename = 'listing_evidence_marks' order by cmd",
      );
      assert(r.rowCount === 2, `expected 2 policies, found ${r.rowCount}`);
      const cmds = r.rows.map((row) => row.cmd).sort();
      assert(JSON.stringify(cmds) === JSON.stringify(["INSERT", "SELECT"]), `unexpected policy commands: ${cmds}`);
    });

    console.log("\n=== Step 4: RLS policy logic (as authenticated, stubbed identity) ===");
    const acct1 = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
    const acct2 = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
    const acctSat = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
    const u1 = (await admin.query("insert into public.users default values returning id")).rows[0].id;
    const u2 = (await admin.query("insert into public.users default values returning id")).rows[0].id;
    const u3sat = (await admin.query("insert into public.users default values returning id")).rows[0].id;
    const listing1 = (
      await admin.query("insert into public.listings (account_id) values ($1) returning id", [acct1])
    ).rows[0].id;

    await check("visibility defaults to 'public', matching actual current behaviour, not 'private'", async () => {
      // Fable review, 2026-09-05: the public listing page applies no
      // visibility filter anywhere, so a 'private' default would have every
      // row claim a restriction nothing enforces. Confirmed on a fresh
      // insert against the real migration file, not just read from the SQL.
      const r = await admin.query(
        "insert into public.listing_media (listing_id) values ($1) returning visibility",
        [listing1],
      );
      assert(r.rows[0].visibility === "public", `expected default 'public', got '${r.rows[0].visibility}'`);
    });

    let markFromU1;
    await check("owner (U1/A1) can insert a valid mark on their own listing", async () => {
      const c = await asTestRole(pg, { userId: u1, accountId: acct1, isSat: false });
      try {
        const r = await c.query(
          `insert into public.listing_evidence_marks
             (listing_id, item_kind, item_key, action, reason, actor_user_id, actor_account_id)
           values ($1, 'photo', 'yard', 'marked_unavailable', 'no yard exists on this lot', $2, $3)
           returning id`,
          [listing1, u1, acct1],
        );
        markFromU1 = r.rows[0].id;
      } finally {
        await c.end();
      }
    });

    await check("owner cannot forge actor_user_id to someone else", async () => {
      const c = await asTestRole(pg, { userId: u1, accountId: acct1, isSat: false });
      try {
        let denied = false;
        try {
          await c.query(
            `insert into public.listing_evidence_marks
               (listing_id, item_kind, item_key, action, reason, actor_user_id, actor_account_id)
             values ($1, 'photo', 'roof', 'marked_unavailable', 'no roof access available', $2, $3)`,
            [listing1, u2, acct1],
          );
        } catch (e) {
          denied = e.code === "42501";
        }
        assert(denied, "expected a row-level security violation (42501)");
      } finally {
        await c.end();
      }
    });

    await check("a different account cannot insert a mark on a listing they do not own", async () => {
      const c = await asTestRole(pg, { userId: u2, accountId: acct2, isSat: false });
      try {
        let denied = false;
        try {
          await c.query(
            `insert into public.listing_evidence_marks
               (listing_id, item_kind, item_key, action, reason, actor_user_id, actor_account_id)
             values ($1, 'photo', 'kitchen', 'marked_unavailable', 'not applicable to this unit', $2, $3)`,
            [listing1, u2, acct2],
          );
        } catch (e) {
          denied = e.code === "42501";
        }
        assert(denied, "expected a row-level security violation (42501)");
      } finally {
        await c.end();
      }
    });

    await check("a different account sees zero marks on a listing they do not own", async () => {
      const c = await asTestRole(pg, { userId: u2, accountId: acct2, isSat: false });
      try {
        const r = await c.query(
          "select * from public.listing_evidence_marks where listing_id = $1",
          [listing1],
        );
        assert(r.rowCount === 0, `expected 0 visible rows, saw ${r.rowCount}`);
      } finally {
        await c.end();
      }
    });

    await check("SAT sees marks on a listing it does not own", async () => {
      const c = await asTestRole(pg, { userId: u3sat, accountId: acctSat, isSat: true });
      try {
        const r = await c.query(
          "select * from public.listing_evidence_marks where listing_id = $1",
          [listing1],
        );
        assert(r.rowCount >= 1, "expected SAT to see at least the owner's own mark");
      } finally {
        await c.end();
      }
    });

    await check("SAT can insert a mark on a listing it does not own, as its own actor", async () => {
      const c = await asTestRole(pg, { userId: u3sat, accountId: acctSat, isSat: true });
      try {
        await c.query(
          `insert into public.listing_evidence_marks
             (listing_id, item_kind, item_key, action, reason, actor_user_id, actor_account_id)
           values ($1, 'fact', 'parking_spaces', 'marked_unavailable', 'lister could not confirm this fact', $2, $3)`,
          [listing1, u3sat, acctSat],
        );
      } finally {
        await c.end();
      }
    });

    await check("SAT cannot masquerade as the listing's own account in actor_account_id", async () => {
      const c = await asTestRole(pg, { userId: u3sat, accountId: acctSat, isSat: true });
      try {
        let denied = false;
        try {
          await c.query(
            `insert into public.listing_evidence_marks
               (listing_id, item_kind, item_key, action, reason, actor_user_id, actor_account_id)
             values ($1, 'fact', 'lot_size', 'marked_unavailable', 'lister could not confirm this fact', $2, $3)`,
            [listing1, u3sat, acct1],
          );
        } catch (e) {
          denied = e.code === "42501";
        }
        assert(denied, "expected actor_account_id != app_account_id() to be denied even for SAT");
      } finally {
        await c.end();
      }
    });

    await check("no UPDATE policy exists: an owner's UPDATE on their own row affects zero rows", async () => {
      const c = await asTestRole(pg, { userId: u1, accountId: acct1, isSat: false });
      try {
        const r = await c.query(
          "update public.listing_evidence_marks set reason = 'trying to rewrite history' where id = $1",
          [markFromU1],
        );
        assert(r.rowCount === 0, `expected 0 rows updated, updated ${r.rowCount}`);
      } finally {
        await c.end();
      }
    });

    await check("no DELETE policy exists: an owner's DELETE on their own row affects zero rows", async () => {
      const c = await asTestRole(pg, { userId: u1, accountId: acct1, isSat: false });
      try {
        const r = await c.query("delete from public.listing_evidence_marks where id = $1", [markFromU1]);
        assert(r.rowCount === 0, `expected 0 rows deleted, deleted ${r.rowCount}`);
      } finally {
        await c.end();
      }
    });

    await check("reason shape: marked_unavailable with a short reason is rejected by the DB constraint", async () => {
      const c = await asTestRole(pg, { userId: u1, accountId: acct1, isSat: false });
      try {
        let denied = false;
        try {
          await c.query(
            `insert into public.listing_evidence_marks
               (listing_id, item_kind, item_key, action, reason, actor_user_id, actor_account_id)
             values ($1, 'photo', 'garden', 'marked_unavailable', 'short', $2, $3)`,
            [listing1, u1, acct1],
          );
        } catch (e) {
          denied = e.code === "23514";
        }
        assert(denied, "expected a check_violation (23514)");
      } finally {
        await c.end();
      }
    });

    await check("reason shape: cleared with a non-null reason is rejected by the DB constraint", async () => {
      const c = await asTestRole(pg, { userId: u1, accountId: acct1, isSat: false });
      try {
        let denied = false;
        try {
          await c.query(
            `insert into public.listing_evidence_marks
               (listing_id, item_kind, item_key, action, reason, actor_user_id, actor_account_id)
             values ($1, 'photo', 'garden', 'cleared', 'should not be allowed', $2, $3)`,
            [listing1, u1, acct1],
          );
        } catch (e) {
          denied = e.code === "23514";
        }
        assert(denied, "expected a check_violation (23514)");
      } finally {
        await c.end();
      }
    });

    console.log("\n=== Step 4b: deterministic total order on the evidence ledger (Codex review) ===");
    await check("seq is a real database-generated identity: monotonic, unique, not settable by the caller", async () => {
      const r = await admin.query(
        "select column_default, is_nullable from information_schema.columns where table_name = 'listing_evidence_marks' and column_name = 'seq'",
      );
      assert(r.rowCount === 1, "seq column must exist");
      assert(/nextval|identity/i.test(r.rows[0].column_default ?? "") || r.rows[0].is_nullable === "NO", "seq must be a generated, non-null value, not an ordinary nullable column");
    });

    await check("two events sharing an identical created_at are still ordered correctly, by seq", async () => {
      const c = await asTestRole(pg, { userId: u1, accountId: acct1, isSat: false });
      try {
        // A literal, identical timestamp on both rows: the exact scenario
        // the migration's own comment names (Postgres's now() is
        // transaction-stable, so two real rows can share a value too).
        const SAME_INSTANT = "2026-09-01T00:00:00.000Z";
        await c.query(
          `insert into public.listing_evidence_marks
             (listing_id, item_kind, item_key, action, reason, actor_user_id, actor_account_id, created_at)
           values ($1, 'photo', 'ceiling_services', 'marked_unavailable', 'no ceiling access on this floor', $2, $3, $4)`,
          [listing1, u1, acct1, SAME_INSTANT],
        );
        await c.query(
          `insert into public.listing_evidence_marks
             (listing_id, item_kind, item_key, action, reason, actor_user_id, actor_account_id, created_at)
           values ($1, 'photo', 'ceiling_services', 'cleared', null, $2, $3, $4)`,
          [listing1, u1, acct1, SAME_INSTANT],
        );
        const distinctTimestamps = await admin.query(
          "select count(distinct created_at) from public.listing_evidence_marks where listing_id = $1 and item_key = 'ceiling_services'",
          [listing1],
        );
        assert(distinctTimestamps.rows[0].count === "1", "both rows must genuinely share one created_at value for this test to prove anything");
        const latest = await admin.query(
          `select action from public.listing_evidence_marks where listing_id = $1 and item_key = 'ceiling_services'
             order by seq desc limit 1`,
          [listing1],
        );
        assert(latest.rows[0].action === "cleared", "seq, not created_at (which ties here), must decide which row is latest");
      } finally {
        await c.end();
      }
    });

    await check("concurrent mark and clear on the same item: both are recorded (append-only), seq decides which is current", async () => {
      // Documented conflict policy (also stated in the migration's own
      // comment): an append-only ledger has no lock-contention conflict to
      // resolve. Both concurrent writers succeed; seq, assigned at insert
      // time, is the real, agreed-upon order, and "current state" is
      // simply whichever action has the higher seq. This test proves both
      // survive and that the ledger's own seq ordering is self-consistent,
      // not that one request is rejected.
      const c1 = await asTestRole(pg, { userId: u1, accountId: acct1, isSat: false });
      const c2 = await asTestRole(pg, { userId: u1, accountId: acct1, isSat: false });
      try {
        const results = await Promise.allSettled([
          c1.query(
            `insert into public.listing_evidence_marks
               (listing_id, item_kind, item_key, action, reason, actor_user_id, actor_account_id)
             values ($1, 'fact', 'lot_size', 'marked_unavailable', 'lister could not confirm this fact', $2, $3)`,
            [listing1, u1, acct1],
          ),
          c2.query(
            `insert into public.listing_evidence_marks
               (listing_id, item_kind, item_key, action, reason, actor_user_id, actor_account_id)
             values ($1, 'fact', 'lot_size', 'cleared', null, $2, $3)`,
            [listing1, u1, acct1],
          ),
        ]);
        assert(results.every((r) => r.status === "fulfilled"), "an append-only ledger must not reject either concurrent writer");
        const rows = await admin.query(
          "select action, seq from public.listing_evidence_marks where listing_id = $1 and item_key = 'lot_size' order by seq",
          [listing1],
        );
        assert(rows.rowCount === 2, "both concurrent writes must be durably recorded, neither silently dropped");
        assert(rows.rows[0].seq < rows.rows[1].seq, "seq must be strictly increasing even under concurrent inserts");
      } finally {
        await c1.end();
        await c2.end();
      }
    });

    console.log("\n=== Step 5: content_sha256 uniqueness and NULL-safety (outcome C) ===");
    await check("two concurrent inserts of the same hash: exactly one succeeds", async () => {
      const c1 = pg.getPgClient("satmarkets_test");
      const c2 = pg.getPgClient("satmarkets_test");
      await c1.connect();
      await c2.connect();
      try {
        const hash = "a".repeat(64);
        const results = await Promise.allSettled([
          c1.query(
            "insert into public.listing_media (listing_id, content_sha256) values ($1, $2)",
            [listing1, hash],
          ),
          c2.query(
            "insert into public.listing_media (listing_id, content_sha256) values ($1, $2)",
            [listing1, hash],
          ),
        ]);
        const fulfilled = results.filter((r) => r.status === "fulfilled").length;
        const rejected = results.filter((r) => r.status === "rejected");
        assert(fulfilled === 1, `expected exactly 1 success, got ${fulfilled}`);
        assert(rejected.length === 1, `expected exactly 1 rejection, got ${rejected.length}`);
        assert(
          rejected[0].reason.code === "23505",
          `expected unique_violation 23505, got ${rejected[0].reason.code}`,
        );
      } finally {
        await c1.end();
        await c2.end();
      }
    });

    await check("multiple NULL content_sha256 rows on the same listing do not conflict", async () => {
      await admin.query("insert into public.listing_media (listing_id, content_sha256) values ($1, null)", [listing1]);
      await admin.query("insert into public.listing_media (listing_id, content_sha256) values ($1, null)", [listing1]);
    });

    // Step 6 (at most one cover photo per listing) is retired: Codex review
    // removed is_cover and its unique index from the migration entirely
    // (see 20260902b's own updated comment), ruling that sort_order = 0,
    // this codebase's existing cover convention, stays the one source of
    // truth. There is no is_cover uniqueness left to test at the database
    // level; sort_order's own reordering is an application-level PATCH
    // loop (media/route.ts), not a DB constraint, and is exercised by that
    // route's own tests, not this harness.

    console.log("\n=== Step 7: asset_type-change trigger clears shot_key (outcome B) ===");
    const listing2 = (
      await admin.query("insert into public.listings (account_id, asset_type) values ($1, 'office') returning id", [acct1])
    ).rows[0].id;
    const media2 = (
      await admin.query(
        "insert into public.listing_media (listing_id, shot_key) values ($1, 'entrance') returning id",
        [listing2],
      )
    ).rows[0].id;

    await check("changing asset_type clears shot_key on the listing's media", async () => {
      await admin.query("update public.listings set asset_type = 'retail' where id = $1", [listing2]);
      const r = await admin.query("select shot_key from public.listing_media where id = $1", [media2]);
      assert(r.rows[0].shot_key === null, `expected shot_key cleared, got ${r.rows[0].shot_key}`);
    });

    await check("an UPDATE that does not change asset_type leaves shot_key untouched", async () => {
      await admin.query("update public.listing_media set shot_key = 'entrance' where id = $1", [media2]);
      await admin.query("update public.listings set asset_type = 'retail' where id = $1", [listing2]);
      const r = await admin.query("select shot_key from public.listing_media where id = $1", [media2]);
      assert(r.rows[0].shot_key === "entrance", "shot_key should be untouched when asset_type does not change");
    });

    console.log("\n=== Step 7b: evidence-mark invalidation on asset-type change (migration E) ===");
    // listing2 is 'retail' at this point (Step 7 left it there). The asset-type
    // UPDATE must run as an authenticated session, not the bare
    // admin/superuser connection: the trigger's own insert needs a real
    // app_user_id()/app_account_id() to satisfy listing_evidence_marks' insert
    // policy, exactly as a real asset_type-changing UPDATE from the app always
    // would. A superuser session has neither GUC set, which is itself a fact
    // worth the assertion below rather than quietly working around it.
    await check("owner marks 'frontage' unavailable while the listing is retail", async () => {
      const c = await asTestRole(pg, { userId: u1, accountId: acct1, isSat: false });
      try {
        await c.query(
          `insert into public.listing_evidence_marks
             (listing_id, item_kind, item_key, action, reason, actor_user_id, actor_account_id)
           values ($1, 'photo', 'frontage', 'marked_unavailable', 'no dedicated frontage, interior mall unit', $2, $3)`,
          [listing2, u1, acct1],
        );
      } finally {
        await c.end();
      }
    });

    await check("changing asset_type to showroom invalidates the retail-meaning 'frontage' mark", async () => {
      const c = await asTestRole(pg, { userId: u1, accountId: acct1, isSat: false });
      try {
        await c.query("update public.listings set asset_type = 'showroom' where id = $1", [listing2]);
        const r = await c.query(
          `select action, reason, actor_user_id, actor_account_id from public.listing_evidence_marks
             where listing_id = $1 and item_kind = 'photo' and item_key = 'frontage'
             order by seq desc limit 1`,
          [listing2],
        );
        assert(r.rows[0].action === "invalidated_by_asset_change", `expected invalidation, got ${r.rows[0].action}`);
        assert(/retail/.test(r.rows[0].reason) && /showroom/.test(r.rows[0].reason), `reason should name both asset types, got: ${r.rows[0].reason}`);
        assert(r.rows[0].actor_user_id === u1 && r.rows[0].actor_account_id === acct1, "invalidation must attribute to the real caller who changed the asset type");
      } finally {
        await c.end();
      }
    });

    await check("the invalidated mark reads as ineffective (currentEvidenceMarks-equivalent query)", async () => {
      const r = await admin.query(
        `select distinct on (item_kind, item_key) action from public.listing_evidence_marks
           where listing_id = $1 and item_kind = 'photo' and item_key = 'frontage'
           order by item_kind, item_key, seq desc`,
        [listing2],
      );
      assert(r.rows[0].action !== "marked_unavailable", "the latest row must not be marked_unavailable after invalidation");
    });

    await check("a currently-effective mark of any item_key is invalidated too (conservative by design, matching migration B's own shot_key trigger)", async () => {
      // The trigger cannot know which item_keys share genuinely identical
      // meaning across two asset types (mediaStandard.ts's taxonomy is the
      // only source of that, and it is not duplicated into SQL), so it
      // conservatively invalidates every currently-effective mark on any
      // asset_type change, the same conservatism 20260902b's own
      // clear_media_shot_keys_on_asset_type_change already applies to
      // shot_key. This is intended breadth, not a bug: it never falsely
      // preserves a stale mark, at the cost of occasionally asking a lister
      // to reassert one that happened to still be true.
      const c = await asTestRole(pg, { userId: u1, accountId: acct1, isSat: false });
      try {
        await c.query(
          `insert into public.listing_evidence_marks
             (listing_id, item_kind, item_key, action, reason, actor_user_id, actor_account_id)
           values ($1, 'fact', 'parking_spaces', 'marked_unavailable', 'lister could not confirm this fact', $2, $3)`,
          [listing2, u1, acct1],
        );
        await c.query("update public.listings set asset_type = 'office' where id = $1", [listing2]);
        const r = await c.query(
          `select action from public.listing_evidence_marks
             where listing_id = $1 and item_kind = 'fact' and item_key = 'parking_spaces'
             order by seq desc limit 1`,
          [listing2],
        );
        assert(r.rows[0].action === "invalidated_by_asset_change", "a currently-effective mark of any item_key should be invalidated on any asset_type change");
      } finally {
        await c.end();
      }
    });

    await check("an already-cleared (not currently effective) mark gets no spurious invalidation row", async () => {
      const c = await asTestRole(pg, { userId: u1, accountId: acct1, isSat: false });
      try {
        await c.query(
          `insert into public.listing_evidence_marks
             (listing_id, item_kind, item_key, action, reason, actor_user_id, actor_account_id)
           values ($1, 'fact', 'lot_size', 'marked_unavailable', 'lister could not confirm this fact', $2, $3)`,
          [listing2, u1, acct1],
        );
        await c.query(
          `insert into public.listing_evidence_marks
             (listing_id, item_kind, item_key, action, reason, actor_user_id, actor_account_id)
           values ($1, 'fact', 'lot_size', 'cleared', null, $2, $3)`,
          [listing2, u1, acct1],
        );
        const before = await c.query(
          "select count(*) from public.listing_evidence_marks where listing_id = $1 and item_key = 'lot_size'",
          [listing2],
        );
        await c.query("update public.listings set asset_type = 'land' where id = $1", [listing2]);
        const after = await c.query(
          "select count(*) from public.listing_evidence_marks where listing_id = $1 and item_key = 'lot_size'",
          [listing2],
        );
        assert(before.rows[0].count === after.rows[0].count, "an already-cleared item is not currently effective and must not gain a spurious invalidation row");
      } finally {
        await c.end();
      }
    });

    await check("reverting to the original asset type does not resurrect the invalidated mark", async () => {
      const c = await asTestRole(pg, { userId: u1, accountId: acct1, isSat: false });
      try {
        // listing2 has been retail -> showroom -> office (previous check) ->
        // back to retail now. Nothing is currently effective for 'frontage'
        // (it is still invalidated), so this revert should append nothing new.
        const before = await c.query(
          "select count(*) from public.listing_evidence_marks where listing_id = $1 and item_key = 'frontage'",
          [listing2],
        );
        await c.query("update public.listings set asset_type = 'retail' where id = $1", [listing2]);
        const after = await c.query(
          "select count(*) from public.listing_evidence_marks where listing_id = $1 and item_key = 'frontage'",
          [listing2],
        );
        assert(before.rows[0].count === after.rows[0].count, "reverting with nothing currently effective must append no new row");
        const latest = await c.query(
          `select action from public.listing_evidence_marks where listing_id = $1 and item_key = 'frontage'
             order by seq desc limit 1`,
          [listing2],
        );
        assert(latest.rows[0].action === "invalidated_by_asset_change", "the original mark must stay superseded after reverting, not become effective again");
      } finally {
        await c.end();
      }
    });

    console.log("\n=== Step 8: derivation-shape constraint (outcome D) ===");
    await check("fully-null derivation fields are accepted (legacy / not-yet-derived row)", async () => {
      await admin.query(
        "insert into public.listing_media (listing_id, original_path, derived_by, derived_at) values ($1, null, null, null)",
        [listing1],
      );
    });
    await check("fully-populated derivation fields are accepted", async () => {
      await admin.query(
        `insert into public.listing_media
           (listing_id, original_path, derived_transforms, derived_by, derived_at)
         values ($1, 'originals/x.jpg', '{downscale,format_convert}', 'system:upload-pipeline', now())`,
        [listing1],
      );
    });
    await check("a half-populated derivation (original set, derived_by null) is rejected", async () => {
      let denied = false;
      try {
        await admin.query(
          "insert into public.listing_media (listing_id, original_path, derived_by, derived_at) values ($1, 'originals/y.jpg', null, null)",
          [listing1],
        );
      } catch (e) {
        denied = e.code === "23514";
      }
      assert(denied, "expected a check_violation (23514)");
    });

    console.log("\n=== Step 8b: database-enforced trusted-write boundary (Codex review) ===");
    const trustedMedia = (
      await admin.query("insert into public.listing_media (listing_id) values ($1) returning id", [listing1])
    ).rows[0].id;

    const SENSITIVE_COLUMNS = [
      ["content_sha256", "'deadbeef'"],
      ["original_path", "'originals/forged.jpg'"],
      ["derived_by", "'someone-forged-this'"],
      ["moderation_state", "'removed'"],
      ["rights_acknowledged_by", `'${u1}'`],
    ];
    for (const [column, value] of SENSITIVE_COLUMNS) {
      await check(`authenticated cannot UPDATE listing_media.${column} directly, even on its own account's row`, async () => {
        const c = await asTestRole(pg, { userId: u1, accountId: acct1, isSat: false });
        try {
          let denied = false;
          try {
            await c.query(`update public.listing_media set ${column} = ${value} where id = $1`, [trustedMedia]);
          } catch (e) {
            denied = e.code === "42501";
          }
          assert(denied, `expected insufficient_privilege (42501) setting ${column} as authenticated, the column-level REVOKE must be missing or wrong`);
        } finally {
          await c.end();
        }
      });
    }

    await check("authenticated cannot INSERT a row that sets content_sha256/original_path/derived_* directly", async () => {
      const c = await asTestRole(pg, { userId: u1, accountId: acct1, isSat: false });
      try {
        let denied = false;
        try {
          await c.query(
            `insert into public.listing_media (listing_id, content_sha256, original_path, derived_by, derived_at)
             values ($1, 'forged-hash', 'originals/forged.jpg', 'forged', now())`,
            [listing1],
          );
        } catch (e) {
          denied = e.code === "42501";
        }
        assert(denied, "expected insufficient_privilege (42501) inserting the trusted columns as authenticated");
      } finally {
        await c.end();
      }
    });

    await check("authenticated CAN still write the columns it legitimately owns (shot_key), unaffected by the REVOKE", async () => {
      const c = await asTestRole(pg, { userId: u1, accountId: acct1, isSat: false });
      try {
        await c.query("update public.listing_media set shot_key = 'entrance' where id = $1", [trustedMedia]);
        const r = await admin.query("select shot_key from public.listing_media where id = $1", [trustedMedia]);
        assert(r.rows[0].shot_key === "entrance", "the REVOKE must be scoped to the sensitive columns only, not the whole table");
      } finally {
        await c.end();
      }
    });

    await check("service_role (the trusted path getSupabaseServiceRole() uses) CAN write every sensitive column", async () => {
      const c = await asServiceRole(pg);
      try {
        await c.query(
          `update public.listing_media
             set content_sha256 = 'realhash', original_path = 'originals/real.jpg',
                 derived_transforms = '{downscale,format_convert}', derived_by = 'system:upload-pipeline',
                 derived_at = now(), moderation_state = 'flagged'
           where id = $1`,
          [trustedMedia],
        );
        const r = await admin.query(
          "select content_sha256, original_path, moderation_state from public.listing_media where id = $1",
          [trustedMedia],
        );
        assert(r.rows[0].content_sha256 === "realhash", "the trusted path must still be able to write what the app's own upload route needs to record");
        assert(r.rows[0].moderation_state === "flagged", "the trusted path must still be able to record a real moderation decision");
      } finally {
        await c.end();
      }
    });

    console.log("\n=== Step 8c: the actual public-media filter query, run against real rows (Codex review, item 3) ===");
    await check("private and removed media never come back from the real public-media filter, only public+non-removed does", async () => {
      // Runs the literal query shape scopeToPublicMedia()/getPublicListingMedia()
      // generate (visibility = 'public' AND moderation_state <> 'removed'), not
      // a description of it, against four rows covering every combination that
      // matters, on a fresh listing so no earlier test's rows can interfere.
      const acctV = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
      const listingV = (
        await admin.query("insert into public.listings (account_id) values ($1) returning id", [acctV])
      ).rows[0].id;
      const svc = await asServiceRole(pg);
      try {
        const publicVisible = (
          await admin.query("insert into public.listing_media (listing_id, path) values ($1, 'public-visible.webp') returning id", [listingV])
        ).rows[0].id;
        const privateHidden = (
          await admin.query("insert into public.listing_media (listing_id, path) values ($1, 'private-hidden.webp') returning id", [listingV])
        ).rows[0].id;
        await svc.query("update public.listing_media set visibility = 'private' where id = $1", [privateHidden]);
        const removedHidden = (
          await admin.query("insert into public.listing_media (listing_id, path) values ($1, 'removed-hidden.webp') returning id", [listingV])
        ).rows[0].id;
        await svc.query("update public.listing_media set moderation_state = 'removed' where id = $1", [removedHidden]);
        const flaggedVisible = (
          await admin.query("insert into public.listing_media (listing_id, path) values ($1, 'flagged-visible.webp') returning id", [listingV])
        ).rows[0].id;
        await svc.query("update public.listing_media set moderation_state = 'flagged' where id = $1", [flaggedVisible]);

        const result = await admin.query(
          `select path from public.listing_media
             where listing_id = $1 and visibility = 'public' and moderation_state <> 'removed'
             order by path`,
          [listingV],
        );
        const paths = result.rows.map((r) => r.path).sort();
        assert(
          JSON.stringify(paths) === JSON.stringify(["flagged-visible.webp", "public-visible.webp"]),
          `expected exactly the public, non-removed rows, got: ${JSON.stringify(paths)}`,
        );
        assert(!paths.includes("private-hidden.webp"), "a private row must never appear in the public-media filter result");
        assert(!paths.includes("removed-hidden.webp"), "a removed row must never appear in the public-media filter result, even if visibility is public");
      } finally {
        await svc.end();
      }
    });

    console.log("\n=== Step 8d: media_cleanup_queue exists, is service_role/superuser-only, and durably records what it is told (Codex review, item 7) ===");
    await check("media_cleanup_queue table exists with its expected columns", async () => {
      const r = await admin.query(
        `select column_name from information_schema.columns
           where table_name = 'media_cleanup_queue'
             and column_name in ('listing_id','listing_media_id','storage_paths','reason','queued_at','resolved_at','resolved_by')`,
      );
      assert(r.rowCount === 7, `expected 7 columns, found ${r.rowCount}`);
    });
    await check("RLS is enabled on media_cleanup_queue with zero policies (complete default-deny)", async () => {
      const enabled = await admin.query("select relrowsecurity from pg_class where relname = 'media_cleanup_queue'");
      assert(enabled.rows[0].relrowsecurity === true);
      const policies = await admin.query("select 1 from pg_policies where tablename = 'media_cleanup_queue'");
      assert(policies.rowCount === 0, "no policies should exist; RLS-enabled-with-none is what makes this table unreadable/unwritable for authenticated regardless of any table-level GRANT it holds");
    });
    await check("authenticated cannot read media_cleanup_queue, even a row that genuinely exists", async () => {
      const svc = await asServiceRole(pg);
      const acctQ = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
      const listingQ = (await admin.query("insert into public.listings (account_id) values ($1) returning id", [acctQ])).rows[0].id;
      let queueId;
      try {
        queueId = (
          await svc.query(
            "insert into public.media_cleanup_queue (listing_id, storage_paths, reason) values ($1, $2, $3) returning id",
            [listingQ, ["a/b/c.webp"], "upload_insert_failed"],
          )
        ).rows[0].id;
      } finally {
        await svc.end();
      }
      const userQ = (await admin.query("insert into public.users default values returning id")).rows[0].id;
      const c = await asTestRole(pg, { userId: userQ, accountId: acctQ, isSat: false });
      try {
        const r = await c.query("select 1 from public.media_cleanup_queue where id = $1", [queueId]);
        assert(r.rowCount === 0, "authenticated must see zero rows here, including one it could otherwise identify by id");
      } finally {
        await c.end();
      }
    });
    await check("authenticated cannot insert into media_cleanup_queue", async () => {
      const acctQ = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
      const listingQ = (await admin.query("insert into public.listings (account_id) values ($1) returning id", [acctQ])).rows[0].id;
      const userQ = (await admin.query("insert into public.users default values returning id")).rows[0].id;
      const c = await asTestRole(pg, { userId: userQ, accountId: acctQ, isSat: false });
      try {
        let denied = false;
        try {
          await c.query(
            "insert into public.media_cleanup_queue (listing_id, storage_paths, reason) values ($1, $2, $3)",
            [listingQ, ["a/b/c.webp"], "upload_insert_failed"],
          );
        } catch (e) {
          denied = e.code === "42501";
        }
        assert(denied, "RLS-enabled-with-no-policies must reject this insert (42501) even though authenticated holds the same table-level INSERT grant every other table in this schema does");
      } finally {
        await c.end();
      }
    });
    await check("service_role can insert into and read from media_cleanup_queue (the positive case the block above depends on)", async () => {
      const svc = await asServiceRole(pg);
      try {
        const acctQ = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
        const listingQ = (await admin.query("insert into public.listings (account_id) values ($1) returning id", [acctQ])).rows[0].id;
        const mediaQ = (
          await admin.query("insert into public.listing_media (listing_id, path) values ($1, 'x.webp') returning id", [listingQ])
        ).rows[0].id;
        const row = (
          await svc.query(
            `insert into public.media_cleanup_queue (listing_id, listing_media_id, storage_paths, reason)
               values ($1, $2, $3, $4) returning listing_id, listing_media_id, storage_paths, reason, resolved_at`,
            [listingQ, mediaQ, ["acct/listing/x.webp", "acct/listing/originals/x.jpg"], "deletion_storage_remove_failed"],
          )
        ).rows[0];
        assert(row.listing_id === listingQ);
        assert(row.listing_media_id === mediaQ);
        assert(
          JSON.stringify(row.storage_paths) === JSON.stringify(["acct/listing/x.webp", "acct/listing/originals/x.jpg"]),
          `unexpected storage_paths: ${JSON.stringify(row.storage_paths)}`,
        );
        assert(row.reason === "deletion_storage_remove_failed");
        assert(row.resolved_at === null, "a freshly queued entry starts unresolved");
      } finally {
        await svc.end();
      }
    });
    await check("listing_media_id has no foreign key: a queue row survives its referenced listing_media row being deleted", async () => {
      // By design (this migration's own header comment): the referenced row
      // may legitimately already be gone (the exact case a deletion-cleanup
      // failure queues), so the queue insert must never be blocked by, or
      // coupled to, that row's own lifecycle.
      const svc = await asServiceRole(pg);
      try {
        const acctQ = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
        const listingQ = (await admin.query("insert into public.listings (account_id) values ($1) returning id", [acctQ])).rows[0].id;
        const mediaQ = (
          await admin.query("insert into public.listing_media (listing_id, path) values ($1, 'y.webp') returning id", [listingQ])
        ).rows[0].id;
        await svc.query("delete from public.listing_media where id = $1", [mediaQ]);
        const queueId = (
          await svc.query(
            "insert into public.media_cleanup_queue (listing_id, listing_media_id, storage_paths, reason) values ($1, $2, $3, $4) returning id",
            [listingQ, mediaQ, ["acct/listing/y.webp"], "deletion_storage_remove_failed"],
          )
        ).rows[0].id;
        const r = await admin.query("select listing_media_id from public.media_cleanup_queue where id = $1", [queueId]);
        assert(r.rows[0].listing_media_id === mediaQ, "the id is kept as a plain informational value even though the row it names is already gone");
      } finally {
        await svc.end();
      }
    });

    console.log("\n=== Step 8e: the database-level url-photo block, for every role, no exemption (Codex review round 2, item 12) ===");
    await check("authenticated cannot INSERT a new kind='photo' + source='url' row", async () => {
      const acctU = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
      const listingU = (await admin.query("insert into public.listings (account_id) values ($1) returning id", [acctU])).rows[0].id;
      const userU = (await admin.query("insert into public.users default values returning id")).rows[0].id;
      const c = await asTestRole(pg, { userId: userU, accountId: acctU, isSat: false });
      try {
        let denied = false;
        try {
          await c.query(
            "insert into public.listing_media (listing_id, path, kind, source) values ($1, 'https://attacker.example/x.jpg', 'photo', 'url')",
            [listingU],
          );
        } catch (e) {
          denied = e.code === "23514";
        }
        assert(denied, "expected a check_violation (23514), the exact bypass this trigger exists to close");
      } finally {
        await c.end();
      }
    });
    await check("service_role ALSO cannot INSERT a new kind='photo' + source='url' row (no exemption, unlike the trusted-column triggers)", async () => {
      const acctU = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
      const listingU = (await admin.query("insert into public.listings (account_id) values ($1) returning id", [acctU])).rows[0].id;
      const svc = await asServiceRole(pg);
      try {
        let denied = false;
        try {
          await svc.query(
            "insert into public.listing_media (listing_id, path, kind, source) values ($1, 'https://attacker.example/x.jpg', 'photo', 'url')",
            [listingU],
          );
        } catch (e) {
          denied = e.code === "23514";
        }
        assert(denied, "this rule has no legitimate writer at all, not even service_role");
      } finally {
        await svc.end();
      }
    });
    await check("authenticated CAN still insert kind='floorplan' + source='url' (deliberately out of this rule's scope)", async () => {
      const acctU = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
      const listingU = (await admin.query("insert into public.listings (account_id) values ($1) returning id", [acctU])).rows[0].id;
      const userU = (await admin.query("insert into public.users default values returning id")).rows[0].id;
      const c = await asTestRole(pg, { userId: userU, accountId: acctU, isSat: false });
      try {
        await c.query(
          "insert into public.listing_media (listing_id, path, kind, source) values ($1, 'https://cdn.example/plan.pdf', 'floorplan', 'url')",
          [listingU],
        );
      } finally {
        await c.end();
      }
    });
    await check("authenticated CAN still insert kind='photo' + source='upload' (the real upload path, unaffected)", async () => {
      const acctU = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
      const listingU = (await admin.query("insert into public.listings (account_id) values ($1) returning id", [acctU])).rows[0].id;
      const userU = (await admin.query("insert into public.users default values returning id")).rows[0].id;
      const c = await asTestRole(pg, { userId: userU, accountId: acctU, isSat: false });
      try {
        await c.query(
          "insert into public.listing_media (listing_id, path, kind, source) values ($1, 'acct/listing/real.webp', 'photo', 'upload')",
          [listingU],
        );
      } finally {
        await c.end();
      }
    });
    await check("an EXISTING legacy kind='photo' + source='url' row can still be updated on an unrelated column (categorization is not blocked)", async () => {
      const acctU = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
      const listingU = (await admin.query("insert into public.listings (account_id) values ($1) returning id", [acctU])).rows[0].id;
      const userU = (await admin.query("insert into public.users default values returning id")).rows[0].id;
      // This trigger has NO role exemption at all (by design: there is no
      // legitimate writer of this shape, not even service_role or a
      // superuser), which means admin's own INSERT would be rejected by it
      // too, same as any other role's. A REAL legacy row predates the
      // trigger's own existence (it was inserted before this migration
      // ever ran), which a plain INSERT here cannot reproduce; disabling
      // the trigger for exactly this one seed statement is the accurate
      // simulation of that, not a workaround for a trigger bug.
      await admin.query("alter table public.listing_media disable trigger listing_media_block_new_url_photos");
      let legacyId;
      try {
        legacyId = (
          await admin.query(
            "insert into public.listing_media (listing_id, path, kind, source) values ($1, 'https://legacy.example/old.jpg', 'photo', 'url') returning id",
            [listingU],
          )
        ).rows[0].id;
      } finally {
        await admin.query("alter table public.listing_media enable trigger listing_media_block_new_url_photos");
      }
      const c = await asTestRole(pg, { userId: userU, accountId: acctU, isSat: false });
      try {
        await c.query("update public.listing_media set shot_key = 'frontage' where id = $1", [legacyId]);
        const r = await admin.query("select shot_key from public.listing_media where id = $1", [legacyId]);
        assert(r.rows[0].shot_key === "frontage", "an update that leaves kind/source unchanged must not be blocked by this trigger");
      } finally {
        await c.end();
      }
    });

    console.log("\n=== Step 8f: newly inserted media is not publicly eligible before the trusted integrity write completes (Codex review round 3, item 1) ===");
    await check("a row inserted visibility='private' does not appear in the public-media filter until the trusted UPDATE flips it to 'public'", async () => {
      // Reproduces media/route.ts's and docs/route.ts's own two-phase write
      // exactly: phase 1 (the session-scoped client's own INSERT) now sets
      // visibility='private' explicitly rather than taking the column's own
      // 'public' default, and phase 2 (the service-role UPDATE that writes
      // content_sha256/original_path/derived_*) flips it to 'public' in the
      // SAME statement, not a separate one after. A request landing between
      // the two phases must see nothing.
      const acctW = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
      const listingW = (await admin.query("insert into public.listings (account_id) values ($1) returning id", [acctW])).rows[0].id;
      const userW = (await admin.query("insert into public.users default values returning id")).rows[0].id;
      const c = await asTestRole(pg, { userId: userW, accountId: acctW, isSat: false });
      const svc = await asServiceRole(pg);
      try {
        const mediaId = (
          await c.query(
            "insert into public.listing_media (listing_id, path, kind, source, visibility) values ($1, 'acct/listing/new.webp', 'photo', 'upload', 'private') returning id",
            [listingW],
          )
        ).rows[0].id;

        const midway = await admin.query(
          "select path from public.listing_media where id = $1 and visibility = 'public' and moderation_state <> 'removed'",
          [mediaId],
        );
        assert(midway.rowCount === 0, "the row must not be publicly visible between the two phases of the write");

        // All four derivation fields together, matching migration D's own
        // listing_media_derivation_shape constraint (recorded together or
        // not at all) and the real route's own UPDATE payload exactly.
        await svc.query(
          `update public.listing_media
             set content_sha256 = 'deadbeef', original_path = 'acct/listing/originals/new.jpg',
                 derived_transforms = '{downscale,format_convert}', derived_by = 'system:upload-pipeline',
                 derived_at = now(), visibility = 'public'
             where id = $1`,
          [mediaId],
        );

        const after = await admin.query(
          "select path from public.listing_media where id = $1 and visibility = 'public' and moderation_state <> 'removed'",
          [mediaId],
        );
        assert(after.rowCount === 1, "the row must become publicly visible once the trusted write completes and flips visibility in the same statement");
      } finally {
        await c.end();
        await svc.end();
      }
    });

    console.log("\n=== Step 8g: security closure (2026-09-12), AFTER 20260912/20260912b apply, against the real base-schema policies ===");
    // One shared fixture for this whole section: an owner, a completely
    // unrelated stranger, SAT, and every media/listing state item 4 of the
    // security-closure review names by name. Everything here is deliberately
    // fresh (new accounts/listings/media), never reusing an earlier step's
    // rows, so this section proves its own claims independently of what ran
    // before it.
    const gAcctOwner = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
    const gUserOwner = (await admin.query("insert into public.users default values returning id")).rows[0].id;
    const gAcctStranger = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
    const gUserStranger = (await admin.query("insert into public.users default values returning id")).rows[0].id;
    const gAcctSat = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
    const gUserSat = (await admin.query("insert into public.users default values returning id")).rows[0].id;

    const gListingPub = (
      await admin.query(
        `insert into public.listings (account_id, status, ad_permit_number, ad_permit_expires_at)
         values ($1, 'published', '7200000002', now() + interval '30 days') returning id`,
        [gAcctOwner],
      )
    ).rows[0].id;
    const gListingExpired = (
      await admin.query(
        `insert into public.listings (account_id, status, ad_permit_number, ad_permit_expires_at)
         values ($1, 'published', '7200000003', now() - interval '1 day') returning id`,
        [gAcctOwner],
      )
    ).rows[0].id;
    const gListingDraft = (
      await admin.query(
        `insert into public.listings (account_id, status, ad_permit_number, ad_permit_expires_at)
         values ($1, 'draft', '7200000004', now() + interval '30 days') returning id`,
        [gAcctOwner],
      )
    ).rows[0].id;
    const gListingDemo = (
      await admin.query(
        `insert into public.listings (account_id, status, is_demo, ad_permit_number, ad_permit_expires_at)
         values ($1, 'published', true, '7200000005', now() + interval '30 days') returning id`,
        [gAcctOwner],
      )
    ).rows[0].id;

    const gSvc = await asServiceRole(pg);
    let gMediaEligible, gMediaPrivate, gMediaRemoved, gMediaFlagged, gMediaPending, gMediaForged, gMediaExpired, gMediaDraft, gMediaDemo;
    const gPath = (listingId, name) => `${gAcctOwner}/${listingId}/${name}`;
    try {
      // Eligible public derivative: fully finalized, exactly as the real
      // upload route's trusted-column UPDATE leaves a successful upload.
      gMediaEligible = (
        await admin.query("insert into public.listing_media (listing_id, path) values ($1, $2) returning id", [gListingPub, gPath(gListingPub, "eligible.webp")])
      ).rows[0].id;
      await gSvc.query(
        `update public.listing_media set content_sha256 = 'eligiblehash', original_path = $2,
           derived_transforms = '{downscale,format_convert}', derived_by = 'system:upload-pipeline', derived_at = now()
         where id = $1`,
        [gMediaEligible, gPath(gListingPub, "originals/eligible-orig.jpg")],
      );

      // Private: an owner's own deliberate privacy choice.
      gMediaPrivate = (
        await admin.query("insert into public.listing_media (listing_id, path, visibility) values ($1, $2, 'private') returning id", [gListingPub, gPath(gListingPub, "private.webp")])
      ).rows[0].id;

      // Removed: a real moderation decision (service_role only, matching the trusted-write boundary).
      gMediaRemoved = (
        await admin.query("insert into public.listing_media (listing_id, path) values ($1, $2) returning id", [gListingPub, gPath(gListingPub, "removed.webp")])
      ).rows[0].id;
      await gSvc.query("update public.listing_media set moderation_state = 'removed' where id = $1", [gMediaRemoved]);

      // Flagged: a pending concern, established rule says it STAYS visible.
      // Realistically finalized first (content_sha256 set via service_role,
      // matching a genuine upload), THEN flagged: SAT flags existing,
      // already-legitimate content, it never creates a new row of its own.
      // An earlier version of this fixture skipped finalization entirely,
      // which is not a state moderation_state='flagged' can actually reach
      // in production (a row cannot be flagged before it exists as either
      // a real upload or a legacy row), and made this test fail once the
      // trusted-object-binding gate (item 1's own fix) applied, correctly:
      // the fixture was unrealistic, not the fix.
      gMediaFlagged = (
        await admin.query("insert into public.listing_media (listing_id, path) values ($1, $2) returning id", [gListingPub, gPath(gListingPub, "flagged.webp")])
      ).rows[0].id;
      await gSvc.query("update public.listing_media set content_sha256 = 'flaggedhash', moderation_state = 'flagged' where id = $1", [gMediaFlagged]);

      // Pending upload: phase 1 of the real two-phase write only (private,
      // no integrity record yet). Never reached trusted finalization.
      gMediaPending = (
        await admin.query("insert into public.listing_media (listing_id, path, visibility) values ($1, $2, 'private') returning id", [gListingPub, gPath(gListingPub, "pending.webp")])
      ).rows[0].id;

      // Correction, same-day adversarial review: this row is NOT "valid
      // legacy media" (an earlier version of this fixture labelled it
      // that way, then asserted it stayed storage-readable, before this
      // round's own trusted-object-binding gap was found). It is created
      // fresh, right now, AFTER 20260912b_pkg1b_media_trusted_object_
      // binding.sql's own one-time backfill already ran in Step 1c above,
      // via a direct INSERT with no content_sha256 and no upload route
      // involved: exactly item 1's own first adversarial scenario ("an
      // owner inserts a new public source='upload' row directly, without
      // calling the upload route or setting integrity fields"). It IS
      // still table-visible (the row-visibility policy has no opinion on
      // content_sha256/is_legacy_media, only visibility/moderation_state/
      // the listing's own eligibility), which is expected and correct;
      // what changed is the STORAGE-level expectation below, which must
      // now DENY it. preMigrationLegacyMediaId (Step 1b) is the real
      // legacy fixture, backfilled by the actual migration, used below for
      // the genuine "legacy media stays readable" storage proof instead.
      gMediaForged = (
        await admin.query("insert into public.listing_media (listing_id, path, source) values ($1, $2, 'upload') returning id", [gListingPub, gPath(gListingPub, "forged-no-upload.webp")])
      ).rows[0].id;

      gMediaExpired = (
        await admin.query("insert into public.listing_media (listing_id, path) values ($1, $2) returning id", [gListingExpired, gPath(gListingExpired, "expired.webp")])
      ).rows[0].id;
      gMediaDraft = (
        await admin.query("insert into public.listing_media (listing_id, path) values ($1, $2) returning id", [gListingDraft, gPath(gListingDraft, "draft.webp")])
      ).rows[0].id;
      // Finalized via service_role (item 2 correction, same class of fix as
      // gMediaFlagged above): this row's own test isolates the demo-
      // visibility dimension specifically ("becomes visible once
      // demo_visible() is true"), which requires every OTHER eligibility
      // condition, trust included, to already hold; otherwise the test
      // cannot tell "still hidden because untrusted" from "still hidden
      // because not demo-visible".
      gMediaDemo = (
        await admin.query("insert into public.listing_media (listing_id, path) values ($1, $2) returning id", [gListingDemo, gPath(gListingDemo, "demo.webp")])
      ).rows[0].id;
      await gSvc.query("update public.listing_media set content_sha256 = 'demotesthash' where id = $1", [gMediaDemo]);

      // Storage objects mirroring every row above, plus one true orphan
      // (no listing_media row at all) and the preserved original.
      const gOrigEligiblePath = gPath(gListingPub, "originals/eligible-orig.jpg");
      const gOrphanPath = gPath(gListingPub, "orphan-no-row.webp");
      const gObjectPaths = [
        gPath(gListingPub, "eligible.webp"), gOrigEligiblePath,
        gPath(gListingPub, "private.webp"), gPath(gListingPub, "removed.webp"),
        gPath(gListingPub, "flagged.webp"), gPath(gListingPub, "pending.webp"),
        gPath(gListingPub, "forged-no-upload.webp"), gOrphanPath,
        gPath(gListingExpired, "expired.webp"), gPath(gListingDraft, "draft.webp"), gPath(gListingDemo, "demo.webp"),
      ];
      for (const p of gObjectPaths) {
        await admin.query("insert into storage.objects (bucket_id, name) values ('listing-media', $1)", [p]);
      }

      console.log("\n--- table-level RLS: the real five policies, now actually enabled (previously untested: RLS was never on for listing_media in this harness before this round) ---");

      await check("owner sees ALL of their own listing's media regardless of visibility/moderation (private, removed, pending, eligible)", async () => {
        const c = await asTestRole(pg, { userId: gUserOwner, accountId: gAcctOwner, isSat: false });
        try {
          const r = await c.query("select id from public.listing_media where listing_id = $1", [gListingPub]);
          assert(r.rowCount === 6, `owner should see all 6 rows on their own listing (eligible, private, removed, flagged, pending, legacy), saw ${r.rowCount}`);
        } finally {
          await c.end();
        }
      });

      for (const [label, roleFn] of [["unrelated authenticated stranger", () => asTestRole(pg, { userId: gUserStranger, accountId: gAcctStranger, isSat: false })], ["anonymous", () => asAnonRole(pg)]]) {
        await check(`${label} sees only eligible+flagged media on a published listing (item 2 correction: NOT the forged row either, matching storage eligibility now)`, async () => {
          // Correction, item 2 of the second adversarial review: an
          // earlier version of this expected set INCLUDED
          // forged-no-upload.webp, because the row-visibility policy at
          // the time had no trust gate at all -- an incorrect expected
          // outcome baked into the test, not proof the boundary was
          // closed. The real, captured legacy row (preMigrationLegacyPath)
          // is on a DIFFERENT listing (step0bListingV), so it is
          // deliberately not part of THIS listing's own expected set.
          const c = await roleFn();
          try {
            const r = await c.query("select path from public.listing_media where listing_id = $1 order by path", [gListingPub]);
            const paths = r.rows.map((row) => row.path).sort();
            assert(
              JSON.stringify(paths) === JSON.stringify([gPath(gListingPub, "eligible.webp"), gPath(gListingPub, "flagged.webp")].sort()),
              `${label}: expected exactly the 2 eligible rows (forged-no-upload.webp must now be excluded too), got ${JSON.stringify(paths)}`,
            );
          } finally {
            await c.end();
          }
        });

        await check(`${label} (item 2) cannot read the forged row's own metadata via the table either, not only its storage object`, async () => {
          const c = await roleFn();
          try {
            const r = await c.query("select 1 from public.listing_media where listing_id = $1 and path = $2", [gListingPub, gPath(gListingPub, "forged-no-upload.webp")]);
            assert(r.rowCount === 0, `${label}: a forged row's own path/metadata must not be readable via the table, even though it was already correctly unreachable in storage`);
          } finally {
            await c.end();
          }
        });

        await check(`${label} sees zero media on an expired-permit published listing`, async () => {
          const c = await roleFn();
          try {
            const r = await c.query("select id from public.listing_media where listing_id = $1", [gListingExpired]);
            assert(r.rowCount === 0, `${label}: expired permit must hide media even though visibility/moderation are eligible, saw ${r.rowCount}`);
          } finally {
            await c.end();
          }
        });

        await check(`${label} sees zero media on an unpublished (draft) listing`, async () => {
          const c = await roleFn();
          try {
            const r = await c.query("select id from public.listing_media where listing_id = $1", [gListingDraft]);
            assert(r.rowCount === 0, `${label}: draft listing must hide media, saw ${r.rowCount}`);
          } finally {
            await c.end();
          }
        });

        await check(`${label} sees zero media on a demo listing when demo_visible() is false`, async () => {
          const c = await roleFn();
          try {
            const r = await c.query("select id from public.listing_media where listing_id = $1", [gListingDemo]);
            assert(r.rowCount === 0, `${label}: demo listing must hide media outside a demo-visible context, saw ${r.rowCount}`);
          } finally {
            await c.end();
          }
        });

        await check(`${label} sees the demo listing's media once demo_visible() is true`, async () => {
          const c = await roleFn();
          try {
            await c.query("select set_config('app.test_demo_visible', 'true', false)");
            const r = await c.query("select id from public.listing_media where listing_id = $1", [gListingDemo]);
            assert(r.rowCount === 1, `${label}: demo-visible context must reveal the demo listing's media, saw ${r.rowCount}`);
          } finally {
            await c.end();
          }
        });
      }

      await check("the real, captured listing_media policies grant app_is_sat() no table-level access at all: an authenticated-but-SAT session sees only the same eligible rows any other stranger does (negative evidence for the finding above: SAT's real access path is elsewhere)", async () => {
        // Correction, same-day adversarial review: an earlier version of
        // this harness added a sixth, invented "sat reads all" policy to
        // make a positive version of this assertion pass. Removed (see
        // BOOTSTRAP_SQL's own comment at its removal site). This is now
        // the honest claim the real, captured five policies actually
        // support: app_is_sat() has no listing_media table policy of its
        // own in what this session obtained, so an authenticated session
        // with isSat=true, and no other privilege, is bound by the same
        // owner/public-eligible policies as anyone else.
        const c = await asTestRole(pg, { userId: gUserSat, accountId: gAcctSat, isSat: true });
        try {
          const r = await c.query("select path from public.listing_media where listing_id = $1 order by path", [gListingPub]);
          const paths = r.rows.map((row) => row.path).sort();
          assert(
            JSON.stringify(paths) === JSON.stringify([gPath(gListingPub, "eligible.webp"), gPath(gListingPub, "flagged.webp")].sort()),
            `an authenticated session with isSat=true and no other real privilege should see exactly the 2 eligible rows (item 2 correction: not the forged row either), same as any stranger, got ${JSON.stringify(paths)}`,
          );
        } finally {
          await c.end();
        }
      });

      await check("the REAL intended SAT authorization path (service_role, the same pattern review/route.ts's own reviewer actions already use, gated on su.isSat in application code, not by an RLS policy) sees every state on a listing it does not own", async () => {
        const r = await gSvc.query("select id from public.listing_media where listing_id = $1", [gListingPub]);
        assert(r.rowCount === 6, `service_role should see all 6 rows, saw ${r.rowCount}`);
      });

      await check("legitimate owner editing: owner updates their own media row (shot_key)", async () => {
        const c = await asTestRole(pg, { userId: gUserOwner, accountId: gAcctOwner, isSat: false });
        try {
          const r = await c.query("update public.listing_media set shot_key = 'entrance' where id = $1", [gMediaForged]);
          assert(r.rowCount === 1, "owner must be able to edit their own row now that RLS is actually enabled");
        } finally {
          await c.end();
        }
      });

      await check("legitimate owner deletion: owner deletes their own media row", async () => {
        // A dedicated, disposable row, not one of the named fixtures
        // (gMediaPending in particular is still needed, unmutated, by a
        // later storage test proving an owner-flipped-public pending row
        // stays storage-ineligible): deleting a shared fixture here would
        // make that later test's own result depend on THIS test having
        // run first, rather than on the security boundary it claims to
        // check.
        const disposableId = (
          await admin.query("insert into public.listing_media (listing_id, path) values ($1, $2) returning id", [gListingPub, gPath(gListingPub, "disposable-for-deletion-test.webp")])
        ).rows[0].id;
        const c = await asTestRole(pg, { userId: gUserOwner, accountId: gAcctOwner, isSat: false });
        try {
          const r = await c.query("delete from public.listing_media where id = $1", [disposableId]);
          assert(r.rowCount === 1, "owner must be able to delete their own row");
        } finally {
          await c.end();
        }
      });

      await check("a stranger cannot update or delete another account's media row (both affect zero rows, not an error, matching RLS semantics)", async () => {
        const c = await asTestRole(pg, { userId: gUserStranger, accountId: gAcctStranger, isSat: false });
        try {
          const u = await c.query("update public.listing_media set shot_key = 'stolen' where id = $1", [gMediaEligible]);
          assert(u.rowCount === 0, "a stranger's UPDATE on another account's media must affect zero rows");
          const d = await c.query("delete from public.listing_media where id = $1", [gMediaEligible]);
          assert(d.rowCount === 0, "a stranger's DELETE on another account's media must affect zero rows");
        } finally {
          await c.end();
        }
      });

      console.log("\n--- column-level read boundary: 20260912_pkg1b_sensitive_media_column_grants.sql, contrasted with Step 0b's own before-fix proof ---");

      for (const [label, roleFn] of [
        ["anonymous", () => asAnonRole(pg)],
        ["unrelated authenticated stranger", () => asTestRole(pg, { userId: gUserStranger, accountId: gAcctStranger, isSat: false })],
        ["the media's OWNING account (not just any authenticated caller)", () => asTestRole(pg, { userId: gUserOwner, accountId: gAcctOwner, isSat: false })],
      ]) {
        await check(`AFTER FIX: ${label} is denied SELECT on content_sha256/original_path for the eligible row (42501, not merely omitted)`, async () => {
          const c = await roleFn();
          try {
            let denied = false;
            try {
              await c.query("select content_sha256, original_path from public.listing_media where id = $1", [gMediaEligible]);
            } catch (e) {
              denied = e.code === "42501";
            }
            assert(denied, `${label}: expected insufficient_privilege (42501); if this passes with no error, the column-scoped REVOKE is missing or was outranked by a leftover table-level grant`);
          } finally {
            await c.end();
          }
        });

        await check(`AFTER FIX: ${label} is denied even a WHERE-clause reference to content_sha256 that selects only id (the exact media/route.ts precheck compatibility bug, now fixed by reading via service_role instead)`, async () => {
          const c = await roleFn();
          try {
            let denied = false;
            try {
              await c.query("select id from public.listing_media where listing_id = $1 and content_sha256 = 'x'", [gListingPub]);
            } catch (e) {
              denied = e.code === "42501";
            }
            assert(denied, `${label}: Postgres requires SELECT privilege on every column referenced anywhere in a query, including WHERE, not only the output list`);
          } finally {
            await c.end();
          }
        });
      }

      await check("AFTER FIX: service_role (the trusted path) can still SELECT content_sha256/original_path", async () => {
        const r = await gSvc.query("select content_sha256, original_path from public.listing_media where id = $1", [gMediaEligible]);
        assert(r.rows[0].content_sha256 === "eligiblehash", "service_role must retain full read access; this is the one path the app's own fixed prechecks now use");
      });

      // Third adversarial review, item 5b: the runbook's own section 10
      // preflight query (`information_schema.column_privileges` with no
      // privilege_type filter) would ALWAYS return non-zero rows even in
      // the correctly-fixed state, since anon/authenticated legitimately,
      // unavoidably hold table-wide INSERT/UPDATE (an already-accepted
      // baseline this package's own history established: a column-level
      // REVOKE cannot retract a pre-existing table-level GRANT), which
      // that view surfaces per-column regardless of privilege_type. The
      // corrected preflight checks SELECT specifically, via
      // has_column_privilege (role-independent, not subject to
      // information_schema's own restricted-role visibility limits,
      // already discovered earlier this package's own history), with a
      // visible-column positive control proving the check itself is
      // live, not vacuously true. Executed here for real, against a real
      // Postgres engine, not only written into the runbook.
      const SENSITIVE_COLUMNS = ["content_sha256", "original_path", "derived_transforms", "derived_by", "derived_at"];
      const VISIBLE_POSITIVE_CONTROL_COLUMNS = ["path", "alt_en", "visibility", "moderation_state", "derivation_verified", "is_legacy_media"];
      await check("AFTER FIX (item 5b, corrected preflight): has_column_privilege(SELECT) is false for anon/authenticated on every sensitive column, with visible-column positive controls proving the check is live", async () => {
        for (const role of ["anon", "authenticated"]) {
          for (const col of SENSITIVE_COLUMNS) {
            const r = await admin.query(
              "select has_column_privilege($1, 'public.listing_media', $2, 'SELECT') as can_select",
              [role, col],
            );
            assert(r.rows[0].can_select === false, `${role} must NOT have SELECT on ${col}`);
          }
          for (const col of VISIBLE_POSITIVE_CONTROL_COLUMNS) {
            const r = await admin.query(
              "select has_column_privilege($1, 'public.listing_media', $2, 'SELECT') as can_select",
              [role, col],
            );
            assert(r.rows[0].can_select === true, `POSITIVE CONTROL: ${role} must have SELECT on ${col} (a non-sensitive, intentionally-readable column); if this is false, the check methodology itself is broken, not the security boundary`);
          }
        }
      });

      await check("AFTER FIX: the real getPublicListingMedia() query shape (its exact select+filter list) still succeeds for anon and returns exactly the eligible set", async () => {
        // src/lib/queries/publicMedia.ts's own select list and
        // src/lib/mediaVisibility.ts's own scopeToPublicMedia() filter,
        // reproduced verbatim, not paraphrased, run as anon: the one
        // canonical public reader this package's own round-2 review
        // introduced must not be broken by the column restriction above.
        // Correction, item 2 of the second adversarial review: the .or()
        // clause is part of the real scopeToPublicMedia() now (mediaVisibility.ts),
        // reproduced here too; the earlier version of this query (and its
        // own expected set) predates that fix and incorrectly included
        // the forged row.
        const c = await asAnonRole(pg);
        try {
          const r = await c.query(
            `select path,source,kind,mime,alt_en,alt_ar,plan_type,sort_order
               from public.listing_media
              where listing_id = $1 and kind in ('photo','floorplan','brochure')
                and visibility = 'public' and moderation_state <> 'removed'
                and (derivation_verified = true or is_legacy_media = true)
              order by sort_order`,
            [gListingPub],
          );
          const paths = r.rows.map((row) => row.path).sort();
          assert(
            JSON.stringify(paths) === JSON.stringify([gPath(gListingPub, "eligible.webp"), gPath(gListingPub, "flagged.webp")].sort()),
            `getPublicListingMedia()'s own query shape must keep working and returning exactly the trusted, eligible rows for anon (not the forged row), got ${JSON.stringify(paths)}`,
          );
        } finally {
          await c.end();
        }
      });

      console.log("\n--- storage read boundary: 20260912b_pkg1b_storage_originals_read_boundary.sql, contrasted with Step 0b's own before-fix proof ---");

      for (const [label, roleFn] of [
        ["anonymous", () => asAnonRole(pg)],
        ["unrelated authenticated stranger", () => asTestRole(pg, { userId: gUserStranger, accountId: gAcctStranger, isSat: false })],
      ]) {
        await check(`AFTER FIX: ${label} can no longer read the preserved ORIGINAL object (headline fix; Step 0b proved this was readable before)`, async () => {
          const c = await roleFn();
          try {
            const r = await c.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [gOrigEligiblePath]);
            assert(r.rowCount === 0, `${label}: the preserved original must no longer match the published-listing branch`);
          } finally {
            await c.end();
          }
        });

        await check(`AFTER FIX: ${label} can still read the legitimate eligible DERIVATIVE object (fix does not break public access)`, async () => {
          const c = await roleFn();
          try {
            const r = await c.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [gPath(gListingPub, "eligible.webp")]);
            assert(r.rowCount === 1, `${label}: the eligible derivative must remain readable`);
          } finally {
            await c.end();
          }
        });

        await check(`AFTER FIX: ${label} can still read the FLAGGED media object (flagged stays visible, established rule, now also enforced in storage)`, async () => {
          const c = await roleFn();
          try {
            const r = await c.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [gPath(gListingPub, "flagged.webp")]);
            assert(r.rowCount === 1, `${label}: flagged media's object must remain readable`);
          } finally {
            await c.end();
          }
        });

        await check(`AFTER FIX: ${label} can still read the GENUINE legacy media object (backfilled by the real migration in Step 1c, not simulated)`, async () => {
          const c = await roleFn();
          try {
            const r = await c.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [preMigrationLegacyPath]);
            assert(r.rowCount === 1, `${label}: a genuinely pre-migration, is_legacy_media=true row's object must remain readable, matching every pre-existing production row`);
          } finally {
            await c.end();
          }
        });

        await check(`AFTER FIX (item 1, scenario 1): ${label} CANNOT read a row an owner inserted directly with source='upload' and no content_sha256, bypassing the real upload route entirely (the untrusted-path-binding gap)`, async () => {
          const c = await roleFn();
          try {
            const r = await c.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [gPath(gListingPub, "forged-no-upload.webp")]);
            assert(r.rowCount === 0, `${label}: a row with no content_sha256 and not backfilled as legacy must not grant storage eligibility merely because path/visibility/source were self-asserted`);
          } finally {
            await c.end();
          }
        });

        await check(`AFTER FIX: ${label} cannot read the PRIVATE media object`, async () => {
          const c = await roleFn();
          try {
            const r = await c.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [gPath(gListingPub, "private.webp")]);
            assert(r.rowCount === 0, `${label}: a private row's object must not be reachable via the published branch`);
          } finally {
            await c.end();
          }
        });

        await check(`AFTER FIX: ${label} cannot read the REMOVED media object`, async () => {
          const c = await roleFn();
          try {
            const r = await c.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [gPath(gListingPub, "removed.webp")]);
            assert(r.rowCount === 0, `${label}: a removed row's object must not be reachable via the published branch, even though visibility is public`);
          } finally {
            await c.end();
          }
        });

        await check(`AFTER FIX: ${label} cannot read the PENDING (not-yet-finalized) media object`, async () => {
          const c = await roleFn();
          try {
            const r = await c.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [gPath(gListingPub, "pending.webp")]);
            assert(r.rowCount === 0, `${label}: a pending upload's object must not be reachable via the published branch while visibility is private`);
          } finally {
            await c.end();
          }
        });

        await check(`AFTER FIX (item 1, scenario 2): ${label} still cannot read a pending row's object even after its OWNER flips visibility to 'public' before trusted finalization (no process crash needed to attempt this; visibility is owner-writable, content_sha256 is not)`, async () => {
          // The owner's own account, using the real, unmodified "owner
          // updates own listing media" RLS policy (no column restriction
          // on visibility, by design: round 2's own decision, unchanged
          // by this batch), flips gMediaPending public. Table-level
          // eligibility now genuinely matches (visibility=public,
          // moderation=unreviewed); storage eligibility must still be
          // denied, because content_sha256 remains null and this row was
          // never backfilled as legacy (it did not exist before Step 1c).
          const owner = await asTestRole(pg, { userId: gUserOwner, accountId: gAcctOwner, isSat: false });
          try {
            const upd = await owner.query("update public.listing_media set visibility = 'public' where id = $1", [gMediaPending]);
            assert(upd.rowCount === 1, "the owner must be able to flip their own row's visibility; if this fails the fixture itself is wrong, not the security boundary");
          } finally {
            await owner.end();
          }
          const c = await roleFn();
          try {
            const r = await c.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [gPath(gListingPub, "pending.webp")]);
            assert(r.rowCount === 0, `${label}: an owner-flipped-public pending row must still be denied storage eligibility; only content_sha256/is_legacy_media decide this, not visibility`);
          } finally {
            await c.end();
          }
        });

        await check(`AFTER FIX: ${label} cannot read an ORPHAN object with no matching listing_media row at all`, async () => {
          const c = await roleFn();
          try {
            const r = await c.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [gOrphanPath]);
            assert(r.rowCount === 0, `${label}: an object with no eligible listing_media row must not be reachable via the published branch, regardless of which folder it sits under`);
          } finally {
            await c.end();
          }
        });

        await check(`AFTER FIX: ${label} cannot read media on an expired-permit or unpublished listing via storage either`, async () => {
          const c = await roleFn();
          try {
            const r1 = await c.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [gPath(gListingExpired, "expired.webp")]);
            assert(r1.rowCount === 0, `${label}: expired-permit listing's storage object must not be reachable`);
            const r2 = await c.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [gPath(gListingDraft, "draft.webp")]);
            assert(r2.rowCount === 0, `${label}: draft listing's storage object must not be reachable`);
          } finally {
            await c.end();
          }
        });
      }

      await check("AFTER FIX (item 1, scenario 3, cross-account denial): an owner cannot forge a row on their OWN eligible listing pointing at ANOTHER account's private/original object to gain public read access to it", async () => {
        // A second, entirely separate account/listing, unrelated to
        // gAcctOwner, with its own eligible published listing: the
        // forger's INSERT is legitimate by every check RLS itself makes
        // (they own the listing they are inserting on), which is exactly
        // why this cannot be closed by RLS on listing_media alone. The
        // forged row's own `path` targets gOrigEligiblePath, gAcctOwner's
        // real preserved original, unrelated to the forger's own account
        // prefix entirely.
        const forgerAcct = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
        const forgerUser = (await admin.query("insert into public.users default values returning id")).rows[0].id;
        const forgerListing = (
          await admin.query(
            `insert into public.listings (account_id, status, ad_permit_number, ad_permit_expires_at)
             values ($1, 'published', '7200000006', now() + interval '30 days') returning id`,
            [forgerAcct],
          )
        ).rows[0].id;
        const forger = await asTestRole(pg, { userId: forgerUser, accountId: forgerAcct, isSat: false });
        try {
          const ins = await forger.query(
            "insert into public.listing_media (listing_id, path, source) values ($1, $2, 'upload')",
            [forgerListing, gOrigEligiblePath],
          );
          assert(ins.rowCount === 1, "the forged INSERT itself must succeed under the real, unmodified owner-insert RLS policy; this is the precondition the fix must still close despite, not by preventing the insert");
        } finally {
          await forger.end();
        }
        const strangerCheck = await asAnonRole(pg);
        try {
          const r = await strangerCheck.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [gOrigEligiblePath]);
          assert(r.rowCount === 0, "a cross-account forged row must not grant anon read access to another account's real object, regardless of the forger's own listing being published and eligible");
        } finally {
          await strangerCheck.end();
        }
      });

      await check("AFTER FIX (item 1, scenario 4): an owner cannot resurrect moderation-removed media by inserting a fresh row pointing at the same object path", async () => {
        // Same account as the removed row (gMediaRemoved), a fresh
        // second listing, same object path: the owner is not trying to
        // steal someone else's content here, they are trying to defeat
        // SAT's own moderation decision on THEIR OWN content by
        // re-registering the same bytes under a new row identity, whose
        // own moderation_state starts at the default 'unreviewed' (the
        // only value a non-trusted INSERT may ever set it to).
        const secondListing = (
          await admin.query(
            `insert into public.listings (account_id, status, ad_permit_number, ad_permit_expires_at)
             values ($1, 'published', '7200000007', now() + interval '30 days') returning id`,
            [gAcctOwner],
          )
        ).rows[0].id;
        const owner = await asTestRole(pg, { userId: gUserOwner, accountId: gAcctOwner, isSat: false });
        try {
          const ins = await owner.query(
            "insert into public.listing_media (listing_id, path, source) values ($1, $2, 'upload')",
            [secondListing, gPath(gListingPub, "removed.webp")],
          );
          assert(ins.rowCount === 1, "the resurrection INSERT itself must succeed under the real, unmodified owner-insert RLS policy");
        } finally {
          await owner.end();
        }
        const strangerCheck = await asTestRole(pg, { userId: gUserStranger, accountId: gAcctStranger, isSat: false });
        try {
          const r = await strangerCheck.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [gPath(gListingPub, "removed.webp")]);
          assert(r.rowCount === 0, "a fresh row referencing a moderation-removed object's own path must not restore its public storage eligibility; the new row has no content_sha256 and was never backfilled as legacy");
        } finally {
          await strangerCheck.end();
        }
      });

      // Third adversarial review, item 1: derivation_verified/is_legacy_media
      // alone prove a row was trusted AT SOME POINT, never that its CURRENT
      // path is what was trusted, because path/source/listing_id were not
      // frozen. A dedicated victim account/object, distinct from every
      // other fixture in this file, keeps these three tests self-contained.
      {
        const victimAcct = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
        const victimListing = (
          await admin.query(
            `insert into public.listings (account_id, status, ad_permit_number, ad_permit_expires_at)
             values ($1, 'published', '7200000008', now() + interval '30 days') returning id`,
            [victimAcct],
          )
        ).rows[0].id;
        const victimPrivatePath = `${victimAcct}/${victimListing}/private-victim-object.webp`;
        await admin.query("insert into storage.objects (bucket_id, name) values ('listing-media', $1)", [victimPrivatePath]);

        await check("AFTER FIX (item 1, correction: object-identity freeze), scenario A: an owner CANNOT repoint an already-TRUSTED row's own path to a victim object via UPDATE; BEFORE this fix (trigger disabled) the same UPDATE succeeds, proving the gap was real", async () => {
          const finalizedId = (
            await admin.query("insert into public.listing_media (listing_id, path, source) values ($1, $2, 'upload') returning id", [gListingPub, gPath(gListingPub, "freeze-test-finalized.webp")])
          ).rows[0].id;
          await gSvc.query("update public.listing_media set content_sha256 = 'freezetesthash' where id = $1", [finalizedId]);
          const verified = await admin.query("select derivation_verified from public.listing_media where id = $1", [finalizedId]);
          assert(verified.rows[0].derivation_verified === true, "fixture setup: the row must genuinely be derivation_verified before this test means anything");

          await admin.query("alter table public.listing_media disable trigger listing_media_freeze_object_identity");
          const owner1 = await asTestRole(pg, { userId: gUserOwner, accountId: gAcctOwner, isSat: false });
          try {
            const beforeFix = await owner1.query("update public.listing_media set path = $1 where id = $2", [victimPrivatePath, finalizedId]);
            assert(beforeFix.rowCount === 1, "BEFORE FIX (trigger disabled): the path substitution must succeed, proving the gap the review found was real, not hypothetical");
          } finally {
            await owner1.end();
            await admin.query("alter table public.listing_media enable trigger listing_media_freeze_object_identity");
            await admin.query("update public.listing_media set path = $1 where id = $2", [gPath(gListingPub, "freeze-test-finalized.webp"), finalizedId]);
          }

          const owner2 = await asTestRole(pg, { userId: gUserOwner, accountId: gAcctOwner, isSat: false });
          try {
            let denied = false;
            try {
              await owner2.query("update public.listing_media set path = $1 where id = $2", [victimPrivatePath, finalizedId]);
            } catch (e) {
              denied = e.code === "42501";
            }
            assert(denied, "AFTER FIX (trigger enabled): the SAME path substitution on an already-trusted row must be rejected (42501)");
          } finally {
            await owner2.end();
          }
        });

        await check("AFTER FIX (item 1, correction), scenario B: an owner CANNOT repoint a genuine is_legacy_media=true row's own path either; BEFORE this fix the same UPDATE succeeds", async () => {
          const legacyLikeId = (
            await admin.query("insert into public.listing_media (listing_id, path, source) values ($1, $2, 'upload') returning id", [gListingPub, gPath(gListingPub, "freeze-test-legacy.webp")])
          ).rows[0].id;
          await admin.query("update public.listing_media set is_legacy_media = true where id = $1", [legacyLikeId]);

          await admin.query("alter table public.listing_media disable trigger listing_media_freeze_object_identity");
          const owner1 = await asTestRole(pg, { userId: gUserOwner, accountId: gAcctOwner, isSat: false });
          try {
            const beforeFix = await owner1.query("update public.listing_media set path = $1 where id = $2", [victimPrivatePath, legacyLikeId]);
            assert(beforeFix.rowCount === 1, "BEFORE FIX (trigger disabled): a legacy row's own path substitution must also succeed, proving the same gap applies to legacy rows");
          } finally {
            await owner1.end();
            await admin.query("alter table public.listing_media enable trigger listing_media_freeze_object_identity");
            await admin.query("update public.listing_media set path = $1 where id = $2", [gPath(gListingPub, "freeze-test-legacy.webp"), legacyLikeId]);
          }

          const owner2 = await asTestRole(pg, { userId: gUserOwner, accountId: gAcctOwner, isSat: false });
          try {
            let denied = false;
            try {
              await owner2.query("update public.listing_media set path = $1 where id = $2", [victimPrivatePath, legacyLikeId]);
            } catch (e) {
              denied = e.code === "42501";
            }
            assert(denied, "AFTER FIX (trigger enabled): a legacy row's own path substitution must also be rejected (42501)");
          } finally {
            await owner2.end();
          }
        });

        await check("AFTER FIX (item 1, correction), scenario C: the pre-finalization RACE is closed unconditionally, not merely once-already-trusted; BEFORE this fix the same mid-window UPDATE succeeds", async () => {
          // Reproduces the real two-phase write's own timing: phase 1 (the
          // owner's own session) INSERTs with visibility='private', NOT YET
          // trusted (content_sha256 null, is_legacy_media false). The freeze
          // must apply even here, in the window BEFORE the later trusted
          // UPDATE ever runs, or a concurrent request in that exact window
          // could repoint path while the row still looks "pending", and the
          // real upload route's own later trusted UPDATE (which never
          // touches path) would finalize trust for a row now pointing
          // somewhere else entirely.
          const pendingId = (
            await admin.query("insert into public.listing_media (listing_id, path, source, visibility) values ($1, $2, 'upload', 'private') returning id", [gListingPub, gPath(gListingPub, "freeze-test-race.webp")])
          ).rows[0].id;
          const notYetTrusted = await admin.query("select derivation_verified, is_legacy_media from public.listing_media where id = $1", [pendingId]);
          assert(notYetTrusted.rows[0].derivation_verified === false && notYetTrusted.rows[0].is_legacy_media === false, "fixture setup: this row must genuinely be untrusted at this point for the race test to mean anything");

          await admin.query("alter table public.listing_media disable trigger listing_media_freeze_object_identity");
          const owner1 = await asTestRole(pg, { userId: gUserOwner, accountId: gAcctOwner, isSat: false });
          try {
            const beforeFix = await owner1.query("update public.listing_media set path = $1 where id = $2", [victimPrivatePath, pendingId]);
            assert(beforeFix.rowCount === 1, "BEFORE FIX (trigger disabled): a concurrent path change during the pending window must also succeed, proving the finalization race was real");
          } finally {
            await owner1.end();
            await admin.query("alter table public.listing_media enable trigger listing_media_freeze_object_identity");
            await admin.query("update public.listing_media set path = $1 where id = $2", [gPath(gListingPub, "freeze-test-race.webp"), pendingId]);
          }

          const owner2 = await asTestRole(pg, { userId: gUserOwner, accountId: gAcctOwner, isSat: false });
          try {
            let denied = false;
            try {
              await owner2.query("update public.listing_media set path = $1 where id = $2", [victimPrivatePath, pendingId]);
            } catch (e) {
              denied = e.code === "42501";
            }
            assert(denied, "AFTER FIX (trigger enabled): the mid-window path change must be rejected even though the row is not yet trusted, since the freeze is unconditional");
          } finally {
            await owner2.end();
          }
        });

        await check("AFTER FIX (item 1, correction): source and listing_id are frozen the same way path is, and captions/categorization/ordering/visibility remain fully owner-editable", async () => {
          const c = await asTestRole(pg, { userId: gUserOwner, accountId: gAcctOwner, isSat: false });
          try {
            // 'legacy-import', not 'url': gMediaEligible's own kind is
            // 'photo', and source='url' on an existing kind='photo' row
            // ALSO trips migration G's own, separate, pre-existing
            // listing_media_block_new_url_photos trigger (23514, fires
            // first in trigger-name order), which would make this
            // specific value ambiguous about WHICH protection actually
            // fired. An arbitrary non-'url' string isolates the freeze
            // trigger's own 42501 cleanly.
            let sourceDenied = false;
            try {
              await c.query("update public.listing_media set source = 'legacy-import' where id = $1", [gMediaEligible]);
            } catch (e) {
              sourceDenied = e.code === "42501";
            }
            assert(sourceDenied, "source must be frozen the same way path is");

            const otherOwnListing = (
              await admin.query("insert into public.listings (account_id, status) values ($1, 'draft') returning id", [gAcctOwner])
            ).rows[0].id;
            let listingDenied = false;
            try {
              await c.query("update public.listing_media set listing_id = $1 where id = $2", [otherOwnListing, gMediaEligible]);
            } catch (e) {
              listingDenied = e.code === "42501";
            }
            assert(listingDenied, "listing_id must be frozen too, even to another listing the SAME owner genuinely owns");

            // Preserved capabilities: captions, categorization, ordering,
            // and the owner's own privacy choice are all untouched by this
            // freeze and must keep working exactly as before.
            const alt = await c.query("update public.listing_media set alt_en = 'Updated caption' where id = $1", [gMediaEligible]);
            assert(alt.rowCount === 1, "captions (alt_en/alt_ar) must remain owner-editable");
            const cat = await c.query("update public.listing_media set shot_key = 'entrance' where id = $1", [gMediaEligible]);
            assert(cat.rowCount === 1, "categorization (shot_key) must remain owner-editable");
            const ord = await c.query("update public.listing_media set sort_order = 5 where id = $1", [gMediaEligible]);
            assert(ord.rowCount === 1, "ordering (sort_order) must remain owner-editable");
            const vis = await c.query("update public.listing_media set visibility = 'private' where id = $1", [gMediaEligible]);
            assert(vis.rowCount === 1, "the owner's own visibility choice must remain editable");
            await admin.query("update public.listing_media set visibility = 'public' where id = $1", [gMediaEligible]);
          } finally {
            await c.end();
          }
        });
      }

      await check("AFTER FIX: the owner can still read/sign EVERY object under their own account prefix, unaffected by eligibility (own-folder branch unchanged)", async () => {
        const c = await asTestRole(pg, { userId: gUserOwner, accountId: gAcctOwner, isSat: false });
        try {
          for (const p of [gOrigEligiblePath, gOrphanPath, gPath(gListingPub, "private.webp"), gPath(gListingPub, "removed.webp"), gPath(gListingPub, "pending.webp")]) {
            const r = await c.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [p]);
            assert(r.rowCount === 1, `owner must still read every object under their own account prefix, including ${p}`);
          }
        } finally {
          await c.end();
        }
      });

      await check("AFTER FIX: SAT can still read anything (app_is_sat() branch unchanged)", async () => {
        const c = await asTestRole(pg, { userId: gUserSat, accountId: gAcctSat, isSat: true });
        try {
          const r = await c.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [gOrigEligiblePath]);
          assert(r.rowCount === 1, "SAT must still read the preserved original of any listing");
        } finally {
          await c.end();
        }
      });
    } finally {
      await gSvc.end();
    }

    console.log("\n=== Step 8h: the deployment-window reconciliation is PROVENANCE-VALIDATED, not time-based alone (fourth adversarial review) ===");
    // CORRECTION: an earlier version of both this harness section and
    // scripts/reconcile-deployment-window-legacy-gap.mjs granted trust to
    // ANY row matching the time window and a null content_sha256 alone.
    // That is a real, distinct vulnerability: an authenticated owner can
    // INSERT A FORGED ROW on their own eligible listing, inside the SAME
    // window, with path naming a DIFFERENT account's real private/
    // original object; that row is shaped identically (dates, source=
    // 'upload', real listing ownership) to a genuine old-app upload. This
    // section first proves the OLD, naive time+hash-null query WOULD have
    // caught the forged and pending rows below (the regression the
    // review asked for, using the real owner-scoped RLS INSERT, not an
    // admin bypass, so the INSERT itself is proven reachable by a real
    // attacker), THEN proves public.grant_validated_legacy_media_trust()
    // (20260912b's own function, which scripts/reconcile-deployment-
    // window-legacy-gap.mjs now calls instead of querying directly)
    // correctly excludes them while still granting the genuine row.
    //
    // WHAT "THE OLD APP RAN" MEANS HERE, PRECISELY. The "legitimate" row
    // below is inserted via a plain admin.query INSERT, matching the
    // ROW SHAPE the old (pre-PKG-1B) application's own upload route would
    // produce (no content_sha256, a real object already placed in
    // storage). This is a database-shape simulation, proving what the
    // RECONCILIATION LOGIC does with a row of that shape; it is NOT
    // evidence that the old application's own route handler code
    // actually executed, which this harness has no way to invoke (that
    // code lives on `main`, unmerged with this branch, and this harness
    // never starts a Next.js server or issues a real HTTP request). Every
    // assertion below is real Postgres RLS/function-execution evidence
    // against a real engine; none of it is HTTP or application-route
    // evidence, and it is not described as such anywhere in this file.
    {
      const gapAcctOwner = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
      const gapUserOwner = (await admin.query("insert into public.users default values returning id")).rows[0].id;
      const gapListing = (
        await admin.query(
          `insert into public.listings (account_id, status, ad_permit_number, ad_permit_expires_at)
           values ($1, 'published', '7200000009', now() + interval '30 days') returning id`,
          [gapAcctOwner],
        )
      ).rows[0].id;
      // The victim: a DIFFERENT account, with a real private object the
      // attacker below will attempt to reference. Distinct from every
      // other fixture in this file.
      const gapVictimAcct = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
      const gapVictimListing = (
        await admin.query("insert into public.listings (account_id, status) values ($1, 'draft') returning id", [gapVictimAcct])
      ).rows[0].id;
      const gapVictimPath = `${gapVictimAcct}/${gapVictimListing}/deployment-gap-victim-object.webp`;
      await admin.query("insert into storage.objects (bucket_id, name) values ('listing-media', $1)", [gapVictimPath]);

      const windowFrom = "2026-09-15T10:00:00Z";
      const windowTo = "2026-09-15T10:07:00Z";

      // 1. Legitimate: shaped like a real old-app upload. Real object,
      // same account, inside the window.
      const legitimatePath = `${gapAcctOwner}/${gapListing}/gap-legitimate.webp`;
      await admin.query("insert into storage.objects (bucket_id, name) values ('listing-media', $1)", [legitimatePath]);
      const legitimateId = (
        await admin.query(
          "insert into public.listing_media (listing_id, path, source, created_at) values ($1, $2, 'upload', $3) returning id",
          [gapListing, legitimatePath, "2026-09-15T10:03:00Z"],
        )
      ).rows[0].id;

      // 2. Forged: inserted via the REAL owner-scoped RLS session (not
      // admin), path naming the VICTIM's real object, same window.
      const gapOwnerSession = await asTestRole(pg, { userId: gapUserOwner, accountId: gapAcctOwner, isSat: false });
      let forgedId;
      try {
        const ins = await gapOwnerSession.query(
          "insert into public.listing_media (listing_id, path, source, created_at) values ($1, $2, 'upload', $3) returning id",
          [gapListing, gapVictimPath, "2026-09-15T10:04:00Z"],
        );
        forgedId = ins.rows[0].id;
      } finally {
        await gapOwnerSession.end();
      }

      // 3. Pending: a genuinely in-flight upload (visibility='private',
      // matching the real two-phase write's own phase 1), real object,
      // same window. Must never be promoted while still pending, or an
      // owner's later visibility flip (already closed for the
      // derivation_verified path) would reopen an equivalent bypass
      // through is_legacy_media instead.
      const pendingPath = `${gapAcctOwner}/${gapListing}/gap-pending.webp`;
      await admin.query("insert into storage.objects (bucket_id, name) values ('listing-media', $1)", [pendingPath]);
      const pendingId = (
        await admin.query(
          "insert into public.listing_media (listing_id, path, source, visibility, created_at) values ($1, $2, 'upload', 'private', $3) returning id",
          [gapListing, pendingPath, "2026-09-15T10:05:00Z"],
        )
      ).rows[0].id;

      // 4. Moderation-removed reference: a real, same-account object, but
      // SOME row (any row) already recorded this exact path as removed.
      const removedRefPath = `${gapAcctOwner}/${gapListing}/gap-removed-ref.webp`;
      await admin.query("insert into storage.objects (bucket_id, name) values ('listing-media', $1)", [removedRefPath]);
      const alreadyRemovedId = (
        await admin.query("insert into public.listing_media (listing_id, path, source) values ($1, $2, 'upload') returning id", [gapListing, removedRefPath])
      ).rows[0].id;
      await admin.query("update public.listing_media set moderation_state = 'removed' where id = $1", [alreadyRemovedId]);
      const freshRefToRemovedId = (
        await admin.query(
          "insert into public.listing_media (listing_id, path, source, created_at) values ($1, $2, 'upload', $3) returning id",
          [gapListing, removedRefPath, "2026-09-15T10:06:00Z"],
        )
      ).rows[0].id;

      const beforeWindowId = (
        await admin.query(
          "insert into public.listing_media (listing_id, path, source, created_at) values ($1, $2, 'upload', $3) returning id",
          [gapListing, "gap/before-window.webp", "2026-09-15T09:55:00Z"],
        )
      ).rows[0].id;

      await check("REGRESSION (fails against the naive time+hash-null-only condition, matching this fix's own earlier version): the forged and pending rows are BOTH caught by a query that checks only the time window and content_sha256, proving that condition alone is not sufficient evidence", async () => {
        const naive = await admin.query(
          `select id from public.listing_media
             where content_sha256 is null and is_legacy_media = false
               and created_at >= $1 and created_at < $2`,
          [windowFrom, windowTo],
        );
        const ids = naive.rows.map((r) => r.id);
        assert(ids.includes(forgedId), "the naive condition must (incorrectly) match the forged row: this is the exact gap the review found");
        assert(ids.includes(pendingId), "the naive condition must (incorrectly) match the still-pending row too");
        assert(ids.includes(freshRefToRemovedId), "the naive condition must (incorrectly) match a fresh reference to an already-removed object's path");
        assert(ids.includes(legitimateId), "sanity: the legitimate row must also match the naive condition, or this fixture proves nothing");
      });

      await check("public.grant_validated_legacy_media_trust() (report mode, p_apply=false): validates exactly the legitimate row, excluding the forged, pending, and removed-reference rows", async () => {
        const r = await admin.query("select id from public.grant_validated_legacy_media_trust($1, $2, false)", [windowFrom, windowTo]);
        const ids = r.rows.map((row) => row.id);
        assert(ids.includes(legitimateId), "the genuine row must validate");
        assert(!ids.includes(forgedId), "the forged row (real object, WRONG account) must fail same-account provenance");
        assert(!ids.includes(pendingId), "the still-pending row (visibility=private) must fail the public-visibility precondition");
        assert(!ids.includes(freshRefToRemovedId), "a fresh reference to an already-removed object's path must fail the never-removed check");
        assert(!ids.includes(beforeWindowId), "a row outside the window must not appear at all");
      });

      await check("public.grant_validated_legacy_media_trust() is read-only when p_apply=false: none of the candidate rows are actually mutated by the report call above", async () => {
        for (const id of [legitimateId, forgedId, pendingId, freshRefToRemovedId]) {
          const r = await admin.query("select is_legacy_media from public.listing_media where id = $1", [id]);
          assert(r.rows[0].is_legacy_media === false, `${id} must remain unmarked after a report-only (p_apply=false) call`);
        }
      });

      await check("public.grant_validated_legacy_media_trust() (apply mode, p_apply=true): grants trust ONLY to the legitimate row; the forged, pending, and removed-reference rows remain permanently untrusted", async () => {
        const r = await admin.query("select id from public.grant_validated_legacy_media_trust($1, $2, true)", [windowFrom, windowTo]);
        const grantedIds = r.rows.map((row) => row.id);
        assert(JSON.stringify(grantedIds.sort()) === JSON.stringify([legitimateId].sort()), `expected exactly [${legitimateId}] granted, got ${JSON.stringify(grantedIds)}`);

        const legit = await admin.query("select is_legacy_media, derivation_verified from public.listing_media where id = $1", [legitimateId]);
        assert(legit.rows[0].is_legacy_media === true, "the legitimate row must now be granted");
        assert(legit.rows[0].derivation_verified === false, "derivation_verified correctly stays false: this row is legacy-by-reconciliation, not a genuine finalized upload");

        for (const [label, id] of [["forged", forgedId], ["pending", pendingId], ["removed-reference", freshRefToRemovedId], ["before-window", beforeWindowId]]) {
          const r2 = await admin.query("select is_legacy_media from public.listing_media where id = $1", [id]);
          assert(r2.rows[0].is_legacy_media === false, `the ${label} row must remain unmarked after apply`);
        }
      });

      await check("REAL API BOUNDARY, NOT ONLY DATABASE POLICY: after the grant above, anonymous and an unrelated authenticated stranger can read the legitimate row's own storage object, and cannot read the forged, pending, or removed-referenced objects, matching the real storage policy's own EXISTS clause exactly", async () => {
        // Distinguishing evidence types precisely, per instruction: this
        // check exercises the REAL storage.objects RLS policy
        // (20260912c_pkg1b_storage_originals_read_boundary.sql) against a
        // real Postgres engine -- database-policy evidence, proving what
        // the database itself would decide for these exact rows/objects.
        // It is NOT a live HTTP call against a running Supabase Storage
        // API or a real browser fetch; no such call is made anywhere in
        // this harness, and this assertion is not evidence of one.
        const gapStrangerAcct = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
        for (const [label, roleFn] of [["anonymous", () => asAnonRole(pg)], ["unrelated authenticated stranger", () => asTestRole(pg, { userId: null, accountId: gapStrangerAcct, isSat: false })]]) {
          const c = await roleFn();
          try {
            const legit = await c.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [legitimatePath]);
            assert(legit.rowCount === 1, `${label}: the legitimate, now-validated derivative must be readable`);
            const forged = await c.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [gapVictimPath]);
            assert(forged.rowCount === 0, `${label}: the forged reference must not grant read access to the victim's real object`);
            const pending = await c.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [pendingPath]);
            assert(pending.rowCount === 0, `${label}: the still-pending object must remain unreadable`);
            const removedRef = await c.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [removedRefPath]);
            assert(removedRef.rowCount === 0, `${label}: the removed-referenced object must remain unreadable`);
          } finally {
            await c.end();
          }
        }
      });
    }

    console.log("\n=== Step 8i: the write-pause/drain procedure (item 2, fourth adversarial review) ===");
    // Provenance validation (Step 8h) closes the SECURITY question: a
    // forged or pending row can never pass grant_validated_legacy_media_
    // trust(), regardless of timing. This section is the separate,
    // OPERATIONAL question item 2 asks for: a safe rollout approach that
    // avoids producing untrusted-but-legitimate rows in the first place,
    // rather than relying on reconciliation after the fact every time.
    //
    // WHY THIS, NOT A "BRIDGE" PATCH TO main's OWN OLD UPLOAD ROUTE. A
    // compatible-upload bridge would require modifying and deploying code
    // that lives on `main`, unmerged with this branch, as its own,
    // separate, earlier change; doing that from here would be a
    // production change to a different, live branch, outside this PR's
    // own scope and this session's own authorization. A pure
    // DATABASE-level pause needs no application code anywhere, in either
    // the old or new app, and is fully preparable and testable within
    // this migration set alone:
    //
    //   1. Before applying migrations: REVOKE INSERT ON public.listing_
    //      media FROM authenticated; (a single operator-run SQL
    //      statement, not a migration file: temporary and reversible by
    //      design, not a permanent schema change).
    //   2. Apply all eleven migrations (unaffected: migrations run as the
    //      superuser/table-owner role, which bypasses ordinary grants).
    //   3. Run section 10's verification queries.
    //   4. Drain: wait a short, bounded period (serverless function
    //      execution is itself time-bounded) for any request already
    //      in-flight when the revoke took effect to complete or fail.
    //   5. Merge PR #22 (deploys the new application code).
    //   6. Re-grant: GRANT INSERT ON public.listing_media TO
    //      authenticated; (this round's own migrations never touch the
    //      INSERT grant, only SELECT, so this step is not automatic and
    //      must be explicit).
    //   7. Smoke test a real upload through the new app.
    //   8. Run scripts/reconcile-deployment-window-legacy-gap.mjs as a
    //      SAFETY NET, not a required step when the pause was actually
    //      used: any row it finds represents either a request that was
    //      genuinely already in-flight at the moment of step 1's own
    //      REVOKE (should be rare and short-lived, given step 4's drain)
    //      or a pause that was skipped/forgotten. Deployment failure
    //      (any migration in step 2 fails) and rollback (reverting to the
    //      old app while keeping this schema) both reduce to "the pause
    //      from step 1 was never lifted, or must be re-engaged": no new
    //      code path, no new procedure, the same eight steps either way.
    {
      await check("REVOKE INSERT on listing_media from authenticated makes a real owner's own upload INSERT fail cleanly (the mechanism the pause procedure depends on)", async () => {
        const pauseAcct = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
        const pauseUser = (await admin.query("insert into public.users default values returning id")).rows[0].id;
        const pauseListing = (await admin.query("insert into public.listings (account_id, status) values ($1, 'draft') returning id", [pauseAcct])).rows[0].id;
        await admin.query("revoke insert on public.listing_media from authenticated");
        try {
          const c = await asTestRole(pg, { userId: pauseUser, accountId: pauseAcct, isSat: false });
          try {
            let denied = false;
            try {
              await c.query("insert into public.listing_media (listing_id, path, source) values ($1, $2, 'upload')", [pauseListing, "pause-test/should-not-land.webp"]);
            } catch (e) {
              denied = e.code === "42501";
            }
            assert(denied, "with the pause engaged, a real owner's own upload INSERT must fail with insufficient_privilege (42501), the same error shape this codebase's own upload routes already handle as a normal, honest failure");
          } finally {
            await c.end();
          }
        } finally {
          await admin.query("grant insert on public.listing_media to authenticated");
        }
      });

      await check("re-granting INSERT (step 6) genuinely restores the owner's own ability to upload; the pause is fully reversible, not a one-way lockout", async () => {
        const pauseAcct = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
        const pauseUser = (await admin.query("insert into public.users default values returning id")).rows[0].id;
        const pauseListing = (await admin.query("insert into public.listings (account_id, status) values ($1, 'draft') returning id", [pauseAcct])).rows[0].id;
        await admin.query("revoke insert on public.listing_media from authenticated");
        await admin.query("grant insert on public.listing_media to authenticated");
        const c = await asTestRole(pg, { userId: pauseUser, accountId: pauseAcct, isSat: false });
        try {
          const ins = await c.query("insert into public.listing_media (listing_id, path, source) values ($1, $2, 'upload') returning id", [pauseListing, "pause-test/resumed.webp"]);
          assert(ins.rowCount === 1, "after re-granting INSERT, a real owner's own upload must succeed exactly as before the pause");
        } finally {
          await c.end();
        }
      });

      await check("the pause is scoped to INSERT only: an owner's own SELECT/UPDATE/DELETE on their existing media remain unaffected while paused (the Studio's own read/edit/delete controls keep working during the window)", async () => {
        const pauseAcct = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
        const pauseUser = (await admin.query("insert into public.users default values returning id")).rows[0].id;
        const pauseListing = (await admin.query("insert into public.listings (account_id, status) values ($1, 'draft') returning id", [pauseAcct])).rows[0].id;
        const existingId = (await admin.query("insert into public.listing_media (listing_id, path) values ($1, $2) returning id", [pauseListing, "pause-test/pre-existing.webp"])).rows[0].id;
        await admin.query("revoke insert on public.listing_media from authenticated");
        try {
          const c = await asTestRole(pg, { userId: pauseUser, accountId: pauseAcct, isSat: false });
          try {
            const sel = await c.query("select id from public.listing_media where id = $1", [existingId]);
            assert(sel.rowCount === 1, "SELECT on the owner's own existing media must be unaffected by an INSERT-only pause");
            const upd = await c.query("update public.listing_media set shot_key = 'entrance' where id = $1", [existingId]);
            assert(upd.rowCount === 1, "UPDATE (categorization/ordering/visibility) on existing media must be unaffected");
            const del = await c.query("delete from public.listing_media where id = $1", [existingId]);
            assert(del.rowCount === 1, "DELETE of existing media must be unaffected");
          } finally {
            await c.end();
          }
        } finally {
          await admin.query("grant insert on public.listing_media to authenticated");
        }
      });
    }

    console.log("\n=== Step 9: rollback, then forward re-apply ===");
    await check("rollback SQL runs with no error", async () => {
      await admin.query(ROLLBACK_SQL);
    });
    await check("listing_evidence_marks is gone after rollback", async () => {
      const r = await admin.query(
        "select 1 from information_schema.tables where table_name = 'listing_evidence_marks'",
      );
      assert(r.rowCount === 0);
    });
    await check("the asset-type-change invalidation trigger and function are gone after rollback", async () => {
      const trig = await admin.query(
        "select 1 from pg_trigger where tgname = 'invalidate_evidence_marks_on_asset_type_change'",
      );
      assert(trig.rowCount === 0, "trigger should not survive rollback");
      const fn = await admin.query(
        "select 1 from pg_proc where proname = 'invalidate_evidence_marks_on_asset_type_change'",
      );
      assert(fn.rowCount === 0, "function should not survive rollback");
    });
    await check("all 12 new listing_media columns are gone after rollback", async () => {
      const r = await admin.query(
        `select column_name from information_schema.columns
           where table_name = 'listing_media'
             and column_name in ('shot_key','media_scope','media_condition',
               'rights_acknowledged_by','rights_acknowledged_at','visibility',
               'moderation_state','content_sha256','original_path',
               'derived_transforms','derived_by','derived_at')`,
      );
      assert(r.rowCount === 0, `expected 0 columns remaining, found ${r.rowCount}`);
    });
    await check("existing listing_media rows survive rollback (additive drop, not a table drop)", async () => {
      const r = await admin.query("select count(*) from public.listing_media where listing_id = $1", [listing1]);
      assert(Number(r.rows[0].count) > 0, "rows should still exist after column-level rollback");
    });
    await check("security-closure rollback is not a no-op: the OLD broad grant and OLD storage policy are genuinely back, not merely 'ran with no error'", async () => {
      // A rollback that errors nothing but silently leaves the fix in place
      // would be a false emergency-recovery path. Checked directly against
      // pg_policies/has_table_privilege, not inferred from the rollback
      // script's own exit status.
      const pol = await admin.query("select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'read media objects of published or own listing'");
      assert(pol.rowCount === 1, "the OLD storage policy name must exist again after rollback");
      const newPol = await admin.query("select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'read eligible media objects or own listing'");
      assert(newPol.rowCount === 0, "the NEW storage policy must not still exist after rollback");
      const oldRowPol = await admin.query("select 1 from pg_policies where schemaname = 'public' and tablename = 'listing_media' and policyname = 'public read media of published'");
      assert(oldRowPol.rowCount === 1, "the OLD listing_media row-visibility policy name must exist again after rollback");
      // has_table_privilege, not has_column_privilege('content_sha256'):
      // migration C's own reversal (further down this same rollback script)
      // drops content_sha256 entirely, so checking a column privilege on it
      // here would fail with "column does not exist", not report the grant
      // state. Table-level SELECT is the right level for what this
      // migration's own rollback actually restores.
      const priv = await admin.query("select has_table_privilege('anon', 'public.listing_media', 'SELECT') as can_select");
      assert(priv.rows[0].can_select === true, "anon must have table-wide SELECT on listing_media again after rollback (the old broad grant restored)");
    });
    for (const file of MIGRATION_FILES) {
      await check(`forward re-apply after rollback: ${file}`, async () => {
        await admin.query(migrationText[file]);
      });
    }
    // The rollback dropped listing_evidence_marks and media_cleanup_queue
    // outright; re-applying recreates both with no grant for
    // authenticated/anon at all (grants do not survive a drop and
    // recreate). This is a harness-only concern, not a migration concern:
    // real production RLS/grants come from the real schema, not this
    // stand-in's own bootstrap. Scoped to exactly these two tables, NOT
    // "all tables in schema public": listing_media already reapplied
    // 20260912's own column-scoped restriction earlier in this same loop,
    // and a blanket schema-wide regrant here would silently undo it again
    // (the exact bug this comment used to have, caught by the security
    // closure's own rollback-safety check further down).
    await admin.query(
      "grant select, insert, update, delete on public.listing_evidence_marks, public.media_cleanup_queue to authenticated, anon, service_role",
    );
    await check("post-re-apply: listing_evidence_marks exists again", async () => {
      const r = await admin.query(
        "select 1 from information_schema.tables where table_name = 'listing_evidence_marks'",
      );
      assert(r.rowCount === 1);
    });
    await check("post-re-apply: the invalidation trigger works again on a fresh listing", async () => {
      const acctR = (await admin.query("insert into public.accounts default values returning id")).rows[0].id;
      const uR = (await admin.query("insert into public.users default values returning id")).rows[0].id;
      const listingR = (
        await admin.query("insert into public.listings (account_id, asset_type) values ($1, 'retail') returning id", [acctR])
      ).rows[0].id;
      const c = await asTestRole(pg, { userId: uR, accountId: acctR, isSat: false });
      try {
        await c.query(
          `insert into public.listing_evidence_marks
             (listing_id, item_kind, item_key, action, reason, actor_user_id, actor_account_id)
           values ($1, 'photo', 'frontage', 'marked_unavailable', 'no dedicated frontage, interior mall unit', $2, $3)`,
          [listingR, uR, acctR],
        );
        await c.query("update public.listings set asset_type = 'showroom' where id = $1", [listingR]);
        const r = await c.query(
          `select action from public.listing_evidence_marks where listing_id = $1 and item_key = 'frontage'
             order by seq desc limit 1`,
          [listingR],
        );
        assert(r.rows[0].action === "invalidated_by_asset_change", "reapplied migration E's trigger should fire correctly on a fresh listing");
      } finally {
        await c.end();
      }
    });
    await check("post-re-apply: the security closure is back in effect (new storage policy exists, anon denied content_sha256 again)", async () => {
      const pol = await admin.query("select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'read eligible media objects or own listing'");
      assert(pol.rowCount === 1, "the NEW storage policy must exist again after forward re-apply");
      const priv = await admin.query("select has_column_privilege('anon', 'public.listing_media', 'content_sha256', 'SELECT') as can_select");
      assert(priv.rows[0].can_select === false, "anon must be denied content_sha256 again after forward re-apply");
    });
  } finally {
    await admin.end();
    console.log("\nStopping embedded Postgres (persistent:false, data directory will be removed)...");
    try {
      await pg.stop();
    } catch (e) {
      // Windows can hold a file lock on the data directory for a moment
      // after the postgres process itself has exited, which makes stop()'s
      // own directory removal fail with EBUSY even though the database
      // shut down correctly and every check above already ran to
      // completion. Not a test failure: reported, not swallowed silently,
      // but must not prevent the real PASS/FAIL summary below from
      // printing.
      console.log(`(cleanup warning, not a test failure: ${e.message})`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`RESULT: ${passCount} passed, ${failCount} failed (of ${passCount + failCount})`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`  - ${f.name}: ${f.err.message}`);
    }
  }
  console.log("=".repeat(60));
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(2);
});
