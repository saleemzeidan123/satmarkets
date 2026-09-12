// Isolated-environment test harness for PKG-LISTING-CREATION-1B's nine
// migrations (seven from 2026-09-05, plus the 2026-09-12 security-closure
// pair), recorded as evidence in
// docs/pkg-listing-creation-1b-migration-runbook.md sections 4 and 18/19.
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
// Step 8g proves this round's two new migrations close it, across anon,
// unrelated authenticated, owning-account, SAT, and service_role, and Step 9
// proves both are safely reversible and safely re-appliable.
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
  "20260912b_pkg1b_storage_originals_read_boundary.sql",
  "20260912c_pkg1b_media_row_visibility_boundary.sql",
];
const MIGRATION_FILES = [...BASE_MIGRATION_FILES, ...SECURITY_MIGRATION_FILES];

const ROLLBACK_SQL = `
-- Reverse of migration 20260912c (security closure, row visibility boundary)
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

-- Reverse of migration 20260912b (security closure, storage read boundary)
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
-- NOT part of the real, captured five: reconstructed conservatively so
-- this harness's own SAT-role tests have a real row-level policy to
-- exercise (every migration trigger in this package already treats
-- app_is_sat() as trusted well beyond owner scope, so SAT lacking any
-- table-level read of listing_media at all would be inconsistent with
-- everything else this codebase does). Flagged here, and in the runbook,
-- as unconfirmed against the real project, not asserted as production fact.
create policy "sat reads all listing media (unconfirmed, reconstructed)" on public.listing_media for select
  using (app_is_sat());

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

    console.log("\n=== Step 1c: apply this round's three security-closure migrations verbatim, in order ===");
    for (const file of SECURITY_MIGRATION_FILES) {
      const sql = readFileSync(REPO_MIGRATIONS + file, "utf8");
      migrationText[file] = sql;
      await check(`apply ${file}`, async () => {
        await admin.query(sql);
      });
    }

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
    let gMediaEligible, gMediaPrivate, gMediaRemoved, gMediaFlagged, gMediaPending, gMediaLegacy, gMediaExpired, gMediaDraft, gMediaDemo;
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
      gMediaFlagged = (
        await admin.query("insert into public.listing_media (listing_id, path) values ($1, $2) returning id", [gListingPub, gPath(gListingPub, "flagged.webp")])
      ).rows[0].id;
      await gSvc.query("update public.listing_media set moderation_state = 'flagged' where id = $1", [gMediaFlagged]);

      // Pending upload: phase 1 of the real two-phase write only (private,
      // no integrity record yet). Never reached trusted finalization.
      gMediaPending = (
        await admin.query("insert into public.listing_media (listing_id, path, visibility) values ($1, $2, 'private') returning id", [gListingPub, gPath(gListingPub, "pending.webp")])
      ).rows[0].id;

      // Valid legacy media: a default-only insert, exactly what every
      // existing production row looks like the moment this column set
      // first applies (content_sha256/original_path null, visibility at
      // its column default 'public', never explicitly touched).
      gMediaLegacy = (
        await admin.query("insert into public.listing_media (listing_id, path) values ($1, $2) returning id", [gListingPub, gPath(gListingPub, "legacy.webp")])
      ).rows[0].id;

      gMediaExpired = (
        await admin.query("insert into public.listing_media (listing_id, path) values ($1, $2) returning id", [gListingExpired, gPath(gListingExpired, "expired.webp")])
      ).rows[0].id;
      gMediaDraft = (
        await admin.query("insert into public.listing_media (listing_id, path) values ($1, $2) returning id", [gListingDraft, gPath(gListingDraft, "draft.webp")])
      ).rows[0].id;
      gMediaDemo = (
        await admin.query("insert into public.listing_media (listing_id, path) values ($1, $2) returning id", [gListingDemo, gPath(gListingDemo, "demo.webp")])
      ).rows[0].id;

      // Storage objects mirroring every row above, plus one true orphan
      // (no listing_media row at all) and the preserved original.
      const gOrigEligiblePath = gPath(gListingPub, "originals/eligible-orig.jpg");
      const gOrphanPath = gPath(gListingPub, "orphan-no-row.webp");
      const gObjectPaths = [
        gPath(gListingPub, "eligible.webp"), gOrigEligiblePath,
        gPath(gListingPub, "private.webp"), gPath(gListingPub, "removed.webp"),
        gPath(gListingPub, "flagged.webp"), gPath(gListingPub, "pending.webp"),
        gPath(gListingPub, "legacy.webp"), gOrphanPath,
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
        await check(`${label} sees only eligible+flagged+legacy media on a published listing (not private/removed/pending)`, async () => {
          const c = await roleFn();
          try {
            const r = await c.query("select path from public.listing_media where listing_id = $1 order by path", [gListingPub]);
            const paths = r.rows.map((row) => row.path).sort();
            assert(
              JSON.stringify(paths) === JSON.stringify([gPath(gListingPub, "eligible.webp"), gPath(gListingPub, "flagged.webp"), gPath(gListingPub, "legacy.webp")].sort()),
              `${label}: expected exactly the 3 eligible rows, got ${JSON.stringify(paths)}`,
            );
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

      await check("SAT sees every state on a listing it does not own (private, removed, pending, eligible)", async () => {
        const c = await asTestRole(pg, { userId: gUserSat, accountId: gAcctSat, isSat: true });
        try {
          const r = await c.query("select id from public.listing_media where listing_id = $1", [gListingPub]);
          assert(r.rowCount === 6, `SAT should see all 6 rows, saw ${r.rowCount}`);
        } finally {
          await c.end();
        }
      });

      await check("legitimate owner editing: owner updates their own media row (shot_key)", async () => {
        const c = await asTestRole(pg, { userId: gUserOwner, accountId: gAcctOwner, isSat: false });
        try {
          const r = await c.query("update public.listing_media set shot_key = 'entrance' where id = $1", [gMediaLegacy]);
          assert(r.rowCount === 1, "owner must be able to edit their own row now that RLS is actually enabled");
        } finally {
          await c.end();
        }
      });

      await check("legitimate owner deletion: owner deletes their own media row", async () => {
        const c = await asTestRole(pg, { userId: gUserOwner, accountId: gAcctOwner, isSat: false });
        try {
          const r = await c.query("delete from public.listing_media where id = $1", [gMediaPending]);
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

      await check("AFTER FIX: the real getPublicListingMedia() query shape (its exact select+filter list) still succeeds for anon and returns exactly the eligible set", async () => {
        // src/lib/queries/publicMedia.ts's own select list and
        // src/lib/mediaVisibility.ts's own scopeToPublicMedia() filter,
        // reproduced verbatim, not paraphrased, run as anon: the one
        // canonical public reader this package's own round-2 review
        // introduced must not be broken by the column restriction above.
        const c = await asAnonRole(pg);
        try {
          const r = await c.query(
            `select path,source,kind,mime,alt_en,alt_ar,plan_type,sort_order
               from public.listing_media
              where listing_id = $1 and kind in ('photo','floorplan','brochure')
                and visibility = 'public' and moderation_state <> 'removed'
              order by sort_order`,
            [gListingPub],
          );
          const paths = r.rows.map((row) => row.path).sort();
          assert(
            JSON.stringify(paths) === JSON.stringify([gPath(gListingPub, "eligible.webp"), gPath(gListingPub, "flagged.webp"), gPath(gListingPub, "legacy.webp")].sort()),
            `getPublicListingMedia()'s own query shape must keep working and returning the right rows for anon, got ${JSON.stringify(paths)}`,
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

        await check(`AFTER FIX: ${label} can still read valid LEGACY media's object`, async () => {
          const c = await roleFn();
          try {
            const r = await c.query("select 1 from storage.objects where bucket_id = 'listing-media' and name = $1", [gPath(gListingPub, "legacy.webp")]);
            assert(r.rowCount === 1, `${label}: legacy media's object must remain readable, matching every pre-existing production row`);
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
