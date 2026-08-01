import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// ADV-1C, Codex boundary 7. The reachability gate.
//
// WHY THIS EXISTS.
//
// "A package must fail if a claimed production component or producer has no
// runtime consumer." The reason that sentence had to be written is finding 76:
// `evidence.ts` shipped a complete Evidence Passport type, a tier resolver, a
// freshness rule and a label table across two packages, all of it correct, none
// of it reached by a single rendered route. The package records said the
// passport existed. A reader on the site could not find one. Both were true.
//
// A test that imports a module proves the module compiles. It proves nothing
// about whether a reader ever sees its output, and a unit test suite is exactly
// the instrument that makes dormant code look alive: `evidence.test.ts` was
// green the whole time.
//
// So this gate does not ask what is tested. It walks the import graph from the
// entry points the framework actually executes and asks what is left over.
//
// TWO TIERS, BECAUSE "CONSUMER" MEANS TWO DIFFERENT THINGS.
//
// A RUNTIME root is something Next.js executes to serve a request: a route
// module under `src/app`, the middleware, the instrumentation hook. A TOOLING
// root is something a developer or the build runs: a file named in a
// package.json script, a build config, a script under `scripts/`.
//
// The distinction matters because the two carry different obligations. A
// rendering surface reached only from a script renders for nobody, so
// everything under `src/components` and `src/app` must be RUNTIME reachable and
// there is no allow list for that rule. A library reached only by the offline
// evaluation harness is doing its job, so the weaker rule is enough for
// `src/lib` and `src/theme`.
//
// WHAT AN ALLOW LIST ENTRY COSTS.
//
// Each one names a file, gives the reason it is unreached, and is itself tested:
// the file must still exist and must still be unreached. An entry whose file was
// deleted, or whose module quietly acquired a consumer, fails here rather than
// sitting in the list being read by nobody. That is the same rule
// `location/claims.test.ts` applies to its exceptions, for the same reason.

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const EXT = [".ts", ".tsx", ".mts", ".js", ".jsx", ".mjs"];

// ---------------------------------------------------------------------------
// The allow list
// ---------------------------------------------------------------------------

type Unreached = { file: string; reason: string };

const ALLOWED_UNREACHED: readonly Unreached[] = [
  {
    file: "src/lib/agents/permission.ts",
    reason:
      "The capability check for the assistant tool layer. Nothing mounts that layer because owner ruling 7 and Codex ADV-3A.1 item 1 keep external processing off until the owner records the provider agreement, the processing terms, the cross-border basis and the disclosure position. The module is the gate that would run first if it were switched on, and permission.test.ts holds its behaviour meanwhile.",
  },
  {
    file: "src/lib/agents/tools.ts",
    reason:
      "The tool definitions the same dormant layer would expose. Held for the same recorded contract dependency, not left behind by accident, and tools.test.ts runs against it on every commit so it cannot rot into something that would misbehave on the day it is enabled.",
  },
  {
    file: "src/lib/location/index.ts",
    reason:
      "The location package barrel. Its value is the omission rather than the re-exports: transport.ts is the only module that opens a socket to a location provider and is deliberately absent from this file, which gateway.test.ts enforces by reading the repository. Callers import the specific module they need, so the barrel has no importer by design.",
  },
  {
    file: "src/lib/location/address.ts",
    reason:
      "ADV-5A address normalisation, re-exported only through that barrel. No surface calls it because no location source is contracted, which is the same dependency that makes every geo provider decision resolve to denied today. address.test.ts keeps it correct against the day one is.",
  },
  {
    file: "src/lib/analytics/events.ts",
    reason:
      "The ELITE-8 event dictionary, held as typed data rather than prose. It has no importer because it is not an emitter: nothing is collected while O17 leaves the lawful basis, the retention position and the user disclosure for first-party behavioural measurement unruled, and O12 holds the notification family separately. events.test.ts turns each of Codex item 6 rules into an assertion, so the dictionary cannot drift before the day a collector is written against it.",
  },
  {
    file: "src/lib/analytics/scorecard.ts",
    reason:
      "The twelve measure product scorecard that the same dictionary feeds. It is unreached for the same recorded reason, and for a second one: ten of the twelve measures have no baseline because no design partner round has run, so there is nothing yet for a surface to render. events.test.ts asserts the two sides stay consistent and that no measure carries an invented target meanwhile.",
  },
];

// ---------------------------------------------------------------------------
// The graph
// ---------------------------------------------------------------------------

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const isCode = (f: string) => EXT.some((x) => f.endsWith(x)) && !/\.test\.tsx?$/.test(f);

/** Every module under src that ships, tests excluded. */
const code = walk(SRC).filter(isCode);

/**
 * The same specifier resolution the bundler performs, restricted to the two
 * forms this repository uses: the `@/` alias and a relative path. A bare
 * specifier is a package and is not part of this graph.
 */
function resolveSpec(spec: string, from: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const x of EXT) if (fs.existsSync(base + x)) return base + x;
  for (const x of EXT) {
    const idx = path.join(base, "index" + x);
    if (fs.existsSync(idx)) return idx;
  }
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  return null;
}

// Static imports, type-only imports, side-effect imports, dynamic import() and
// require() all reduce to a quoted specifier after one of three lead-ins. A
// dynamic import whose specifier is a variable is invisible to any static walk;
// the repository has none, and the surface rule below would fail loudly if one
// were introduced to reach a component.
const SPEC = /(?:from\s*|import\s*|require\(\s*)["']([^"']+)["']/g;

function importsOf(file: string): string[] {
  const body = fs.readFileSync(file, "utf8");
  const out = new Set<string>();
  SPEC.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SPEC.exec(body))) {
    const r = resolveSpec(m[1], file);
    if (r) out.add(r);
  }
  return [...out];
}

function closure(roots: Iterable<string>): Set<string> {
  const seen = new Set<string>();
  const stack = [...roots];
  while (stack.length) {
    const f = stack.pop() as string;
    if (seen.has(f)) continue;
    seen.add(f);
    for (const d of importsOf(f)) if (!seen.has(d)) stack.push(d);
  }
  return seen;
}

// ---------------------------------------------------------------------------
// The roots
// ---------------------------------------------------------------------------

/** The App Router file names Next.js executes. Anything else under src/app is imported or is dead. */
const ROUTE_MODULE =
  /(^|\/)(page|layout|route|not-found|error|global-error|template|default|loading|sitemap|robots|opengraph-image|icon|apple-icon|manifest)\.(tsx?|jsx?)$/;

const runtimeRoots = new Set<string>(
  code.filter((f) => f.startsWith(path.join(SRC, "app")) && ROUTE_MODULE.test(f))
);
for (const n of ["src/middleware.ts", "src/instrumentation.ts"]) {
  const p = path.join(ROOT, n);
  if (fs.existsSync(p)) runtimeRoots.add(p);
}

const toolingRoots = new Set<string>();
{
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  // A file named in a script is run by that script. `npm run eval` is why the
  // gold set and the grader are not orphans.
  for (const cmd of Object.values(pkg.scripts ?? {})) {
    for (const m of cmd.matchAll(/(?:^|\s)(src\/[\w./[\]-]+\.(?:tsx?|mjs|js))/g)) {
      const p = path.join(ROOT, m[1]);
      if (fs.existsSync(p) && isCode(p)) toolingRoots.add(p);
    }
  }
  for (const f of fs.readdirSync(ROOT)) {
    if (/^(tailwind|next|postcss)\.config\.(ts|js|mjs|cjs)$/.test(f)) toolingRoots.add(path.join(ROOT, f));
  }
  for (const f of walk(path.join(ROOT, "scripts"))) if (isCode(f)) toolingRoots.add(f);
}

const runtime = closure(runtimeRoots);
const anywhere = closure([...runtimeRoots, ...toolingRoots]);

const rel = (f: string) => path.relative(ROOT, f);

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

test("reachability: the walk found the application", () => {
  // A resolver that silently stops resolving turns this whole file into a test
  // that passes because it looked at nothing.
  assert.ok(runtimeRoots.size > 80, `only ${runtimeRoots.size} route modules found, so the walk is not walking`);
  assert.ok(code.length > 200, `only ${code.length} modules found under src`);
  assert.ok(
    runtime.size > code.length * 0.8,
    `only ${runtime.size} modules reachable from ${runtimeRoots.size} routes, which is too few to be real`
  );
});

test("reachability: every rendering surface is reached by a route", () => {
  const stranded = code
    .filter((f) => f.startsWith(path.join(SRC, "components")) || f.startsWith(path.join(SRC, "app")))
    .filter((f) => !runtime.has(f))
    .map(rel)
    .sort();
  assert.deepEqual(
    stranded,
    [],
    `a component or route module has no runtime consumer, so it renders for nobody:\n  ${stranded.join("\n  ")}`
  );
});

test("reachability: no module outside the recorded allow list is unreached", () => {
  const allowed = new Set(ALLOWED_UNREACHED.map((e) => path.join(ROOT, e.file)));
  const orphans = code
    .filter((f) => !anywhere.has(f) && !allowed.has(f))
    .map(rel)
    .sort();
  assert.deepEqual(
    orphans,
    [],
    `unreached module with no recorded reason. Integrate it, delete it, or add it to ALLOWED_UNREACHED with the reason it is held:\n  ${orphans.join("\n  ")}`
  );
});

test("reachability: every allow list entry still exists and is still unreached", () => {
  for (const e of ALLOWED_UNREACHED) {
    const p = path.join(ROOT, e.file);
    assert.ok(fs.existsSync(p), `allow listed file is gone, so its entry is dead weight: ${e.file}`);
    assert.ok(e.reason.length > 120, `the entry for ${e.file} does not say why it is held`);
    assert.equal(
      anywhere.has(p),
      false,
      `${e.file} now has a consumer, so it is no longer an orphan and its entry should go`
    );
  }
});

// ---------------------------------------------------------------------------
// ADV-1C: the passport chain, named rather than counted
// ---------------------------------------------------------------------------
//
// The rules above would pass if the Evidence Passport were deleted. These name
// the chain, because boundary 3 is a statement about this specific spine: the
// producer, the public projection, the vocabulary and the component that renders
// it must each be reached from a route that serves a reader.

const ADV_1C_CHAIN = [
  "src/lib/evidence.ts",
  "src/lib/evidenceView.ts",
  "src/lib/listingEvidence.ts",
  "src/components/EvidencePassport.tsx",
  "src/components/ProvenanceChip.tsx",
] as const;

test("reachability: the Evidence Passport chain is reached from a route", () => {
  const dormant = ADV_1C_CHAIN.filter((f) => !runtime.has(path.join(ROOT, f)));
  assert.deepEqual(
    dormant,
    [],
    `finding 76 again: the passport exists and no route reaches it:\n  ${dormant.join("\n  ")}`
  );
});

test("reachability: the listing detail route is what reaches it", () => {
  // Not "some route": this one. A future refactor that moves the passport onto a
  // private admin surface would still pass the test above while removing it from
  // every reader, which is the failure boundary 3 was written about.
  const listing = path.join(SRC, "app", "[locale]", "listings", "[id]", "page.tsx");
  assert.ok(fs.existsSync(listing), "the listing detail route moved");
  const fromListing = closure([listing]);
  for (const f of ADV_1C_CHAIN) {
    assert.ok(
      fromListing.has(path.join(ROOT, f)),
      `${f} is no longer reached from the listing detail page, which is the surface that renders the passport`
    );
  }
});

// ---------------------------------------------------------------------------
// Codex boundary 8: the four removed components stay removed
// ---------------------------------------------------------------------------
//
// "Either integrate them intentionally or remove them. Do not repair and retain
// RentBand merely because it exists."
//
// Each was reviewed and removed, and the reason is recorded here rather than only
// in a commit message, because the commit message is not what a reader consults
// before adding the file back.

const REMOVED: readonly Unreached[] = [
  {
    file: "src/components/RentBand.tsx",
    reason:
      "Removed rather than repaired. It carried badge-gold, which is Law 5, an en dash range with no bidi isolation, three charcoal opacities below the contrast floor and a locale-free toLocaleString that would print Eastern Arabic numerals against Law 7. Repairing four law violations to keep a component nothing renders is work spent on a file no reader reaches; the published band is rendered by the rent index surfaces from the same query.",
  },
  {
    file: "src/components/LocationScore.tsx",
    reason:
      "Removed. It held a per-asset template of hardcoded representative figures, a drive time, an anchor count, a daytime population and a spend index, each one invented copy shaped like a measurement. LocationFacts.tsx is the honest successor and renders only what the record holds.",
  },
  {
    file: "src/components/HeroSearch.tsx",
    reason:
      "Removed. The home page renders MarketingHome instead, and this file carried its own hardcoded bilingual copy of the asset taxonomy, fifteen entries duplicating labels.ts, which is the shape a taxonomy drift takes before anybody notices it happened.",
  },
  {
    file: "src/components/LocationFilter.tsx",
    reason:
      "Removed. The listings page renders FilterBar instead, which does the same job against the live facet counts. Its locationFilter dictionary section went with it in both locales, because a correctly translated section with no reader is one autocomplete away from a surface.",
  },
];

test("boundary 8: the reviewed orphan components stay removed", () => {
  for (const r of REMOVED) {
    assert.equal(
      fs.existsSync(path.join(ROOT, r.file)),
      false,
      `${r.file} is back. It was reviewed and removed: ${r.reason}`
    );
    assert.ok(r.reason.length > 120, `the disposition for ${r.file} does not say why`);
  }
});

test("boundary 8: the orphaned dictionary section went with its component", () => {
  for (const locale of ["en", "ar"] as const) {
    const dict = JSON.parse(
      fs.readFileSync(path.join(SRC, "i18n", "dictionaries", `${locale}.json`), "utf8")
    ) as Record<string, unknown>;
    assert.equal(
      "locationFilter" in dict,
      false,
      `${locale}.json carries a locationFilter section again, and no component reads it`
    );
  }
});
