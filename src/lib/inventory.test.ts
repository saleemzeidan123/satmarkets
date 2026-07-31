import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  SIMULATED_FLAG,
  SIMULATED_VISIBLE,
  SIMULATED_VISIBLE_MARKER,
  realInventoryOnly,
  releaseVisibleInventory,
  simulatedRowsAreLabelled,
} from "@/lib/inventory";

// ADV-1C, finding 78. The structural gate on what may be counted as inventory.
//
// A published listing count is a claim about the size of a market, and D31 rules
// that the 88 rows behind the current one are preview sample inventory. The layout
// banner says so on every route in both languages and the release policy holds the
// routes at noindex, so the claim is labelled. What it was not, before this gate,
// was true by construction: no query anywhere excluded a simulated row, and the
// counts agreed with reality only because no simulated row happened to be published
// on the day they were read.
//
// So this file does not test `realInventoryOnly`. It tests that nothing publishes a
// count without it. A helper nothing calls is worth nothing, which is Codex boundary
// 7 stated as a test rather than as an intention.
//
// THE EXCEPTIONS ARE NOT A LIST OF NAMES.
//
// Six sites legitimately read published listings and must see simulated rows: two
// operator consoles, a shortlist and the route behind it, an abuse report and an
// ownership check. Each carries a marker comment at the query itself AND an entry in
// SIMULATED_VISIBLE giving the reason. The gate fails in both directions. A marked
// query with no entry is an undocumented exception. An entry whose file no longer
// carries a marker is a stale one. Neither half alone is reviewable, so neither half
// alone is accepted.
//
// WHAT THIS GATE FOUND ON ITS FIRST RUN.
//
// `scripts/seed-world.mjs` inserted 24 rows at status published, set no flag any
// query read, and described its own SIMW1- reference prefix as the sim tag. Running
// it would have added 24 synthetic spaces to every public count on the exchange, and
// nothing in `src` could have excluded them. The seeder now sets the flag.
//
// WHAT THIS GATE DID NOT CATCH, AND NOW DOES.
//
// It passed on a tree that took the live preview to zero spaces. A structural gate
// proves a rule is applied everywhere; it cannot prove the rule is the right one.
// The rule was wrong: every one of the 93 listings rows is `is_demo`, so an
// unconditional exclusion removed the whole corpus rather than a simulated slice of
// it. Finding 79. The two tests at the end of this file are the part that would have
// caught it, and they check behaviour in both release states rather than presence at
// call sites.

const SURFACE_ROOTS = ["src/app"];

// Needles assembled from fragments, on the ADV-5A rule: a scan that spells the thing
// it looks for finds itself and reports the guard as the breach.
const FROM_LISTINGS = new RegExp('from\\(\\s*"' + "list" + 'ings"\\s*\\)', "g");
const PUBLISHED = '"' + "publish" + 'ed"';
const STRICT = "real" + "InventoryOnly(";
const RELEASE_SCOPED = "release" + "VisibleInventory(";
const APPLIED = [STRICT, RELEASE_SCOPED];

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = SURFACE_ROOTS.flatMap((r) => walk(r)).sort();

// One `from("listings")` chain, cut at its own statement boundaries: back to the
// nearest brace, bracket or semicolon, forward to the semicolon that ends it. Reading
// a fixed window instead would let a neighbouring corrected query vouch for an
// uncorrected one, which is the failure mode a gate can least afford.
type Site = { file: string; line: number; stmt: string; lead: string };

function sites(file: string): Site[] {
  const s = fs.readFileSync(file, "utf8");
  const out: Site[] = [];
  for (const m of s.matchAll(FROM_LISTINGS)) {
    let a = m.index ?? 0;
    while (a > 0 && !";{}[".includes(s[a - 1])) a--;
    let b = s.indexOf(";", m.index ?? 0);
    if (b < 0) b = s.length;
    const stmt = s.slice(a, b);
    if (!stmt.includes(PUBLISHED)) continue;
    // The marker sits on a comment line above the statement, so the lead window
    // reaches back past the statement start to pick it up.
    out.push({ file, line: s.slice(0, m.index).split("\n").length, stmt, lead: s.slice(Math.max(0, a - 400), b) });
  }
  return out;
}

const all = files.flatMap(sites);
const exceptedPaths = new Set(SIMULATED_VISIBLE.map((e) => e.path));

test("the surface scan actually finds published listings queries", () => {
  assert.ok(all.length >= 20, `expected the scan to reach the published listings sites, found ${all.length}`);
  assert.ok(files.length >= 60, `expected the surface walk to reach src/app, found ${files.length} files`);
});

test("every published listings query is filtered or excepted", () => {
  const bad = all.filter((s) => !APPLIED.some((a) => s.stmt.includes(a)) && !s.lead.includes(SIMULATED_VISIBLE_MARKER));
  assert.deepEqual(
    bad.map((s) => `${s.file}:${s.line}`),
    [],
    "a published listings query neither applies the inventory filter nor is marked as a site permitted to see simulated rows",
  );
});

test("every marked query has a documented reason", () => {
  const marked = all.filter((s) => s.lead.includes(SIMULATED_VISIBLE_MARKER));
  for (const s of marked) {
    assert.ok(
      exceptedPaths.has(s.file.split(path.sep).join("/")),
      `${s.file}:${s.line} is marked as permitted to see simulated rows but has no entry in SIMULATED_VISIBLE`,
    );
  }
});

test("no entry in SIMULATED_VISIBLE has gone stale", () => {
  for (const e of SIMULATED_VISIBLE) {
    assert.ok(fs.existsSync(e.path), `${e.path} is excepted but does not exist`);
    const s = fs.readFileSync(e.path, "utf8");
    assert.ok(s.includes(SIMULATED_VISIBLE_MARKER), `${e.path} is excepted but carries no marker at any query`);
    assert.ok(
      sites(e.path).some((x) => x.lead.includes(SIMULATED_VISIBLE_MARKER)),
      `${e.path} carries the marker but no longer has a published listings query to except`,
    );
    assert.ok(e.reason.length > 80, `${e.path} needs a reason a reviewer can weigh, not a label`);
  }
});

test("the exception list is short and every entry is distinct", () => {
  // Not a style rule. This gate is only as strong as the number of sites outside it,
  // and an exception list that grows without anyone noticing is how it stops working.
  assert.ok(SIMULATED_VISIBLE.length <= 8, `${SIMULATED_VISIBLE.length} exceptions is more than this gate can be trusted with`);
  assert.equal(new Set(SIMULATED_VISIBLE.map((e) => e.path)).size, SIMULATED_VISIBLE.length);
});

test("the sitemap never lists a simulated row, in any release state", () => {
  // The one surface where an unfiltered row would become an indexed claim rather
  // than a labelled preview figure. Codex boundary 2 names this outcome exactly.
  // A sitemap entry carries no banner into a crawler's index, so this site takes
  // the unconditional predicate and must never be moved to the release-scoped one.
  const s = sites("src/app/sitemap.ts");
  assert.equal(s.length, 1);
  assert.ok(s[0].stmt.includes(STRICT), "the sitemap must apply the unconditional filter");
  assert.ok(!s[0].stmt.includes(RELEASE_SCOPED), "the sitemap must not depend on the release state");
  assert.ok(!s[0].lead.includes(SIMULATED_VISIBLE_MARKER));
});

test("the filter reads null and false alike as real inventory", () => {
  // `is_demo` is nullable and predates the committed migrations. Under an equality
  // test every unflagged row would drop out and the published count would silently
  // shrink, so the predicate must be the negative one.
  const calls: any[] = [];
  const q = { not: (...a: any[]) => (calls.push(a), q) };
  realInventoryOnly(q);
  assert.deepEqual(calls, [[SIMULATED_FLAG, "is", true]]);
});

test("the simulation seeder flags the rows it publishes", () => {
  // Finding 78's latent half. This seeder inserts at status published, and before
  // ADV-1C it set no flag at all, so its rows would have entered every public count
  // as ordinary inventory and no filter could have excluded them.
  const s = fs.readFileSync("scripts/seed-world.mjs", "utf8");
  const i = s.indexOf(`status: "` + `publish` + `ed"`);
  assert.ok(i > 0, "the seeder no longer publishes, so this test needs rereading rather than deleting");
  assert.ok(s.slice(i, i + 400).includes(`${SIMULATED_FLAG}: true`), "seed-world publishes rows without the simulated flag");
});

test("the other seeder still agrees on which flag means simulated", () => {
  const s = fs.readFileSync("scripts/seed-demo.mjs", "utf8");
  assert.ok(s.includes(SIMULATED_FLAG), "seed-demo no longer sets the flag the public filter reads");
});

// Finding 79. The two tests below are the behavioural half. The structural tests
// above prove the rule reaches every site; these prove the rule is the right one.

test("a simulated row is shown exactly when something is labelling it", () => {
  const before = { s: process.env.SITE_ENV, n: process.env.NEXT_PUBLIC_SITE_ENV };
  const trace = () => {
    const calls: any[] = [];
    const q = { not: (...a: any[]) => (calls.push(a), q) };
    releaseVisibleInventory(q);
    return calls;
  };
  try {
    // Preview. The banner is up on every route, so the rows it labels must reach
    // the reader. This is the case that took the live exchange to zero spaces, and
    // it is the whole reason this test exists.
    delete process.env.SITE_ENV;
    delete process.env.NEXT_PUBLIC_SITE_ENV;
    assert.equal(simulatedRowsAreLabelled(), true, "an unset environment must be the labelled preview state");
    assert.deepEqual(trace(), [], "the preview must not filter away the rows its own banner is labelling");

    process.env.SITE_ENV = "preview";
    assert.deepEqual(trace(), []);

    // Production. Nothing labels anything, so nothing simulated may be counted.
    process.env.SITE_ENV = "production";
    assert.equal(simulatedRowsAreLabelled(), false);
    assert.deepEqual(trace(), [[SIMULATED_FLAG, "is", true]]);

    // And the unconditional form does not consult the release state at all.
    const calls: any[] = [];
    const q = { not: (...a: any[]) => (calls.push(a), q) };
    delete process.env.SITE_ENV;
    realInventoryOnly(q);
    assert.deepEqual(calls, [[SIMULATED_FLAG, "is", true]]);
  } finally {
    if (before.s === undefined) delete process.env.SITE_ENV;
    else process.env.SITE_ENV = before.s;
    if (before.n === undefined) delete process.env.NEXT_PUBLIC_SITE_ENV;
    else process.env.NEXT_PUBLIC_SITE_ENV = before.n;
  }
});

test("the banner and the filter read one predicate, not two copies of it", () => {
  // If the layout recomputes the release condition itself, the two can drift and
  // the deployment can end up showing simulated rows with nothing saying so, or
  // showing an empty exchange under a banner explaining the samples that are not
  // there. Both halves of finding 79 are that drift.
  const s = fs.readFileSync("src/app/[locale]/layout.tsx", "utf8");
  const fn = "simulatedRows" + "AreLabelled";
  assert.ok(s.includes(fn), "the layout no longer imports the shared release predicate");
  // The comment may name the variable an operator sets. The code may not read it.
  assert.ok(
    !new RegExp("process" + "\\.env\\.[A-Z_]*SITE_ENV").test(s),
    "the layout reads the environment directly again instead of asking the one predicate",
  );
});
