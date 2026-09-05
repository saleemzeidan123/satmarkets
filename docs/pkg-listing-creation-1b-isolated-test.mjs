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
  "20260905b_pkg1b_media_cleanup_queue.sql",
  "20260905c_pkg1b_media_url_photo_block.sql",
];

const ROLLBACK_SQL = `
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
-- must run as this non-owner role, named exactly as Supabase's own real
-- non-owner role, because migrations B/C/D's own Codex-review REVOKE
-- statements name "authenticated" literally: this role has to be the real
-- target for those statements to mean anything in this harness.
create role authenticated nologin;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Codex review, trusted-write boundary. Supabase's real service_role is a
-- superuser-equivalent that bypasses RLS by role attribute (BYPASSRLS),
-- not by a policy exception; this stand-in matches that exactly; so a
-- test using it can prove "the trusted path still works" without needing
-- a different mechanism than production actually uses.
create role service_role nologin bypassrls;
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
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
      "grant select, insert, update, delete on all tables in schema public to authenticated",
    );
    await admin.query(
      "grant select, insert, update, delete on all tables in schema public to service_role",
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
    for (const file of MIGRATION_FILES) {
      await check(`forward re-apply after rollback: ${file}`, async () => {
        await admin.query(migrationText[file]);
      });
    }
    // The rollback dropped listing_evidence_marks outright; re-applying
    // recreates it with no grant for authenticated at all (grants do not
    // survive a drop and recreate). This is a harness-only concern, not a
    // migration concern: real production RLS/grants come from the real
    // schema, not this stand-in's own bootstrap.
    await admin.query(
      "grant select, insert, update, delete on all tables in schema public to authenticated",
    );
    await admin.query(
      "grant select, insert, update, delete on all tables in schema public to service_role",
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
