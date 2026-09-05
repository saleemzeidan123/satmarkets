// Isolated-environment test harness for PKG-LISTING-CREATION-1B's four
// migrations, run 2026-09-05 and recorded as evidence in
// docs/pkg-listing-creation-1b-migration-runbook.md section 4. Not wired
// into this repo's own package.json/gate: it depends on the `embedded-postgres`
// and `pg` packages, which are deliberately not repo devDependencies (this
// is a one-time diagnostic, not ongoing tooling). To re-run it:
//
//   mkdir /path/to/scratch && cd /path/to/scratch
//   npm init -y && npm install embedded-postgres@16.14.0-beta.17 pg
//   cp <repo>/docs/pkg-listing-creation-1b-isolated-test.mjs .
//   node pkg-listing-creation-1b-isolated-test.mjs /absolute/path/to/satmarkets/repo
//
// Spins up a real local Postgres 16 via `embedded-postgres` (userspace, no
// Docker/sudo/system changes), reconstructs a minimal stand-in for the base
// schema these migrations depend on (the real base schema, including
// app_user_id() / app_account_id() / app_is_sat(), exists only in the live
// production database and is not captured in any local migration file,
// confirmed by grep across supabase/migrations/ finding zero CREATE FUNCTION
// for any of the three and zero CREATE TABLE for listings/listing_media/
// accounts/users), applies the real migration files verbatim, and runs a
// deterministic test matrix against them.
//
// This proves the migration SQL itself (idempotency, constraints, RLS
// POLICY LOGIC given controlled inputs, concurrency behaviour) on a real
// Postgres engine. It does NOT prove the migrations apply cleanly to the
// real production schema's exact existing objects, grants, or the real
// bodies of the app_* functions, since this harness cannot reach that
// database. That gap is recorded in the runbook, not hidden by this test.

import { readFileSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const repoRoot = process.argv[2];
if (!repoRoot) {
  console.error("usage: node pkg-listing-creation-1b-isolated-test.mjs <path to satmarkets repo root>");
  process.exit(2);
}
const REPO_MIGRATIONS = path.join(repoRoot, "supabase", "migrations") + path.sep;
const MIGRATION_FILES = [
  "20260902_pkg1b_durable_evidence_state.sql",
  "20260902b_pkg1b_media_categorization.sql",
  "20260902c_pkg1b_media_content_fingerprint.sql",
  "20260902d_pkg1b_media_derivation_integrity.sql",
  "20260905_pkg1b_evidence_mark_invalidation.sql",
];

const ROLLBACK_SQL = `
-- Reverse of migration E. Its constraint changes need no separate reversal:
-- "reverse of migration A" below drops listing_evidence_marks outright,
-- taking every constraint on it with it. Only the trigger and function,
-- defined on public.listings rather than on the table being dropped,
-- survive a table drop and need an explicit drop of their own.
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
`;

const BOOTSTRAP_SQL = `
create extension if not exists pgcrypto;

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
  sort_order int not null default 0
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
-- must run as this non-owner role, mirroring Supabase's own non-owner
-- "authenticated" role.
create role app_test_role nologin;
grant usage on schema public to app_test_role;
grant select, insert, update, delete on all tables in schema public to app_test_role;
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
  await client.query("set role app_test_role");
  await client.query("select set_config('app.test_user_id', $1, false)", [userId ?? ""]);
  await client.query("select set_config('app.test_account_id', $1, false)", [accountId ?? ""]);
  await client.query("select set_config('app.test_is_sat', $1, false)", [isSat ? "true" : "false"]);
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

    console.log("\n=== Step 1: apply all four migrations verbatim, in order ===");
    const migrationText = {};
    for (const file of MIGRATION_FILES) {
      const sql = readFileSync(REPO_MIGRATIONS + file, "utf8");
      migrationText[file] = sql;
      await check(`apply ${file}`, async () => {
        await admin.query(sql);
      });
    }

    // The blanket grant in BOOTSTRAP_SQL ran before listing_evidence_marks
    // existed; extend it now, matching how a real grant would need to cover
    // a genuinely new table.
    await admin.query(
      "grant select, insert, update, delete on all tables in schema public to app_test_role",
    );

    console.log("\n=== Step 2: reapplication idempotency (rerun all four, expect zero errors) ===");
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
    await check("listing_media has all 13 new columns", async () => {
      const r = await admin.query(
        `select column_name from information_schema.columns
           where table_name = 'listing_media'
             and column_name in ('shot_key','media_scope','media_condition','is_cover',
               'rights_acknowledged_by','rights_acknowledged_at','visibility',
               'moderation_state','content_sha256','original_path',
               'derived_transforms','derived_by','derived_at')`,
      );
      assert(r.rowCount === 13, `expected 13 columns, found ${r.rowCount}`);
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

    console.log("\n=== Step 4: RLS policy logic (as app_test_role, stubbed identity) ===");
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

    console.log("\n=== Step 6: at most one cover photo per listing (outcome B), including under concurrency ===");
    const mediaA = (
      await admin.query("insert into public.listing_media (listing_id) values ($1) returning id", [listing1])
    ).rows[0].id;
    const mediaB = (
      await admin.query("insert into public.listing_media (listing_id) values ($1) returning id", [listing1])
    ).rows[0].id;

    await check("two concurrent is_cover=true updates on the same listing: exactly one succeeds", async () => {
      const c1 = pg.getPgClient("satmarkets_test");
      const c2 = pg.getPgClient("satmarkets_test");
      await c1.connect();
      await c2.connect();
      try {
        const results = await Promise.allSettled([
          c1.query("update public.listing_media set is_cover = true where id = $1", [mediaA]),
          c2.query("update public.listing_media set is_cover = true where id = $1", [mediaB]),
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
    // UPDATE must run as an authenticated app_test_role session, not the bare
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
             order by created_at desc limit 1`,
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
           order by item_kind, item_key, created_at desc`,
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
             order by created_at desc limit 1`,
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
             order by created_at desc limit 1`,
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
    await check("all 13 new listing_media columns are gone after rollback", async () => {
      const r = await admin.query(
        `select column_name from information_schema.columns
           where table_name = 'listing_media'
             and column_name in ('shot_key','media_scope','media_condition','is_cover',
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
    for (const file of MIGRATION_FILES) {
      await check(`forward re-apply after rollback: ${file}`, async () => {
        await admin.query(migrationText[file]);
      });
    }
    // The rollback dropped listing_evidence_marks outright; re-applying
    // recreates it with no grant for app_test_role at all (grants do not
    // survive a drop and recreate). This is a harness-only concern, not a
    // migration concern: real production RLS/grants come from the real
    // schema, not this stand-in's own bootstrap.
    await admin.query(
      "grant select, insert, update, delete on all tables in schema public to app_test_role",
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
             order by created_at desc limit 1`,
          [listingR],
        );
        assert(r.rows[0].action === "invalidated_by_asset_change", "reapplied migration E's trigger should fire correctly on a fresh listing");
      } finally {
        await c.end();
      }
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
