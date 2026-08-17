import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * PKG-DISCOVERY-1 UX closure, item 6.
 *
 * Verifying "if a live published-space count is already available" for the
 * directory card found a real, separate defect: `src/lib/queries/listers.ts`
 * and `src/app/[locale]/lister/[id]/page.tsx` both select columns
 * (`logo_url`, `member_since`, and on the profile page also `about_en`,
 * `about_ar`, `website`, `public_email`, `public_phone`) from
 * `public.listers_public` that no migration had ever added to that view.
 * PostgREST errors on a select naming a column a view does not expose, so
 * both queries failed on every request against a real database: the public
 * lister directory and every public lister profile, not a missing feature.
 * `20260809_listers_public_directory_fields.sql` redefines the view to
 * carry what these two call sites already assume.
 *
 * WHY SOURCE-LEVEL. Same constraint as every other law test in this
 * repository (see e.g. `adv4b.test.ts`, `reflow.test.ts`): no live database
 * and no SQL runner in `npm test`. This reads the migration that currently
 * defines `listers_public` for its column list, and reads the two
 * TypeScript call sites for the columns they ask for, so a future select
 * added to either query without a matching column on the view fails this
 * test instead of failing silently against production.
 */

const ROOT = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

// Every migration that has ever defined this view, oldest first (the
// filenames sort chronologically, the same convention every other
// migration-reading test in this repo relies on). The view in effect is
// whichever one of these sorts last; earlier ones are kept only so a
// reviewer can see the view's history, not read for columns here.
const VIEW_MIGRATIONS = [
  "supabase/migrations/20260714d_neutrality_no_representation_and_lister_identity.sql",
  "supabase/migrations/20260809_listers_public_directory_fields.sql",
].sort();

const LISTERS_QUERY = read("src/lib/queries/listers.ts");
const LISTER_PROFILE_PAGE = read("src/app/[locale]/lister/[id]/page.tsx");

/**
 * The columns a `create or replace view public.listers_public as select ...
 * from public.accounts a` block actually exposes, as the public names a
 * caller would select by: either a bare `a.col` (name `col`) or `... as
 * alias` (name `alias`).
 */
function viewColumns(sql: string): string[] {
  const m = sql.match(/create or replace view public\.listers_public as\s+select([\s\S]*?)from public\.accounts a/);
  assert.ok(m, "expected a `create or replace view public.listers_public as select ... from public.accounts a` block in this migration; the view definition's shape changed and this test must be updated deliberately");
  const body = m![1];
  const cols: string[] = [];
  for (const rawLine of body.split(",")) {
    const line = rawLine.trim();
    if (!line) continue;
    const asMatch = line.match(/\bas\s+(\w+)\s*$/i);
    if (asMatch) { cols.push(asMatch[1]); continue; }
    const bareMatch = line.match(/a\.(\w+)\s*$/);
    if (bareMatch) { cols.push(bareMatch[1]); continue; }
    assert.fail(`could not extract a column name from view-definition clause "${line}"; update this parser deliberately if the view's SQL shape changed`);
  }
  return cols;
}

/**
 * Every column name any `.select("a,b,c")` call site on `listers_public`
 * asks for in this file. A `.select` immediately follows `.from
 * ("listers_public")`, possibly on the next line; every such call in the
 * file is checked, not just the first, because a file can (and here, does)
 * read the view more than once with a different column list each time.
 */
function querySelectedColumns(src: string): string[] {
  const matches = [...src.matchAll(/\.from\("listers_public"\)\s*\n?\s*\.select\("([^"]+)"/g)];
  assert.ok(matches.length > 0, "expected at least one `.from(\"listers_public\").select(\"...\")` call in this file; if every call site moved or was rewritten, update this test deliberately");
  return matches.flatMap((m) => m[1].split(",").map((c) => c.trim()));
}

test("listers_public: the view in effect (the latest-dated migration that defines it) carries every column src/lib/queries/listers.ts selects", () => {
  const latest = read(VIEW_MIGRATIONS[VIEW_MIGRATIONS.length - 1]);
  const exposed = new Set(viewColumns(latest));
  for (const col of querySelectedColumns(LISTERS_QUERY)) {
    assert.ok(exposed.has(col), `src/lib/queries/listers.ts selects "${col}" from listers_public, but the view defined in ${VIEW_MIGRATIONS[VIEW_MIGRATIONS.length - 1]} does not expose it. This is exactly the defect this test exists to catch: PostgREST errors on an unknown column, so this query would fail on every request against a real database.`);
  }
});

test("listers_public: the view in effect carries every column the public lister profile page selects", () => {
  const latest = read(VIEW_MIGRATIONS[VIEW_MIGRATIONS.length - 1]);
  const exposed = new Set(viewColumns(latest));
  for (const col of querySelectedColumns(LISTER_PROFILE_PAGE)) {
    assert.ok(exposed.has(col), `src/app/[locale]/lister/[id]/page.tsx selects "${col}" from listers_public, but the view defined in ${VIEW_MIGRATIONS[VIEW_MIGRATIONS.length - 1]} does not expose it.`);
  }
});

test("listers_public: member_since is a named alias, not assumed to be a physical column", () => {
  const latest = read(VIEW_MIGRATIONS[VIEW_MIGRATIONS.length - 1]);
  assert.match(latest, /\bas\s+member_since\b/i, "member_since is selected by two TypeScript call sites but no accounts table in this repository's migrations ever gains a member_since column; it must be aliased from a real column (this migration aliases accounts.created_at) rather than assumed to exist under that name");
});
