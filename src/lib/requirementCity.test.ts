import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// PKG-A11Y-1, finding 117. A requirement whose payload named no city was stored
// as a requirement in Riyadh, by a `coalesce(..., 'Riyadh')` inside the
// `create_requirement` RPC. Nothing downstream can tell an assumed city from a
// stated one afterwards, and the city is what decides who the requirement is
// shown to.
//
// This file holds the two layers separately, because they are two different
// claims with two different kinds of evidence.
//
// The database layer is a MIGRATION IN THE REPOSITORY, and these tests prove
// what the repository says, not what the live database does. The Supabase write
// tools are permission denied from this environment, so
// `20260801_requirement_city_is_never_assumed.sql` is authored, checked in and
// awaiting the owner. Until it is applied, the deployed function still defaults.
// A test cannot close that gap and this one does not pretend to.
//
// The application layer IS live, and has been since PKG-DEM1 closed finding 102.
// The route derives the city from the district row, falls back to a recognised
// city key, and refuses the write when neither yields one, so no request through
// HTTP has been able to reach the default. That is what the second half holds:
// not that the route is careful today, but that it cannot quietly stop being.

const DIR = join("supabase", "migrations");

/** The last definition of `fn` in migration order, which is the one that stands. */
function latestDefinition(fn: string): { file: string; body: string } {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
  let found: { file: string; body: string } | null = null;
  for (const f of files) {
    const sql = readFileSync(join(DIR, f), "utf8");
    const at = sql.indexOf(`function public.${fn}(`);
    if (at < 0) continue;
    // A plpgsql body is dollar quoted, and the tag is the author's choice: these
    // migrations use both `$$` and `$function$`. Read the tag rather than assume
    // one, or a file written the other way is silently skipped and the guard
    // reports on a definition that no longer stands.
    const open = /as\s+(\$[A-Za-z_]*\$)/.exec(sql.slice(at));
    assert.ok(open, `${f} declares ${fn} with no readable body`);
    const tag = open![1];
    const from = at + open!.index + open![0].length;
    const close = sql.indexOf(tag, from);
    assert.ok(close > from, `${f} declares ${fn} with an unterminated body`);
    found = { file: f, body: sql.slice(from, close) };
  }
  assert.ok(found, `no migration defines ${fn}`);
  return found!;
}

test("the standing definition of create_requirement assumes no city", () => {
  const { file, body } = latestDefinition("create_requirement");
  assert.equal(
    /coalesce\s*\(\s*nullif\s*\(\s*payload->>'city'/i.test(body),
    false,
    `${file} defaults the city again, which is finding 117`,
  );
  assert.equal(
    /'Riyadh'/i.test(body),
    false,
    `${file} names a city literal inside the write path`,
  );
});

test("an absent city is refused, not filled in", () => {
  const { file, body } = latestDefinition("create_requirement");
  assert.match(body, /raise exception/i, `${file} no longer refuses a payload with no city`);
  assert.match(
    body,
    /errcode\s*=\s*'check_violation'/,
    `${file} raises without a sqlstate, so a caller cannot tell this apart from a constraint failure`,
  );
  // The refusal has to come before the insert, or it refuses nothing.
  assert.ok(
    body.indexOf("raise exception") < body.indexOf("insert into public.tenant_briefs"),
    `${file} raises after the row has already been written`,
  );
});

test("everything else about the write is unchanged", () => {
  // The migration restates the whole function because `create or replace` has no
  // partial form. That is the risk: a restatement can quietly drop a line. These
  // are the properties earlier packages put there and paid for.
  const { file, body } = latestDefinition("create_requirement");
  assert.match(body, /'open'/, `${file} lost the hardcoded open status`);
  assert.equal(
    /payload->>'status'/.test(body),
    false,
    `${file} lets the caller choose the status`,
  );
  assert.match(body, /requirement_notifications/, `${file} lost the notification rows`);
  const sql = readFileSync(join(DIR, file), "utf8");
  assert.match(sql, /set search_path = public, pg_temp/, `${file} unpinned the search path on a SECURITY DEFINER function`);
});

test("the route cannot send a requirement with no city", () => {
  // The live half. `create_requirement` is SECURITY DEFINER and callable by anon,
  // so this route is one caller and not a gate; it is still the only caller that
  // exists, and the guard is that its refusal stays a refusal.
  const src = readFileSync(join("src", "app", "api", "requirements", "route.ts"), "utf8");
  const post = src.slice(src.indexOf("export async function POST"));
  const rpc = post.indexOf('sb.rpc("create_requirement"');
  assert.ok(rpc > 0, "the route no longer calls create_requirement");

  const before = post.slice(0, rpc);
  assert.match(before, /if \(!city\) return NextResponse\.json/, "the route stopped refusing an empty city");
  assert.ok(
    before.lastIndexOf("if (!city) return NextResponse.json") < rpc,
    "the city check moved after the write",
  );
  // And it must not have grown a default of its own on the way past.
  assert.equal(
    /city\s*=\s*["'`]\w/.test(before.replace(/city = ""/g, "")),
    false,
    "the route assigns a literal city, which moves finding 117 up a layer instead of closing it",
  );
});
