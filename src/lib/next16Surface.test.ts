import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// PKG-NEXT16-SECURITY slice D. The regression gate on the migration surface.
//
// WHAT THIS FILE IS FOR.
//
// Next.js 16 made the request APIs asynchronous. `params`, `searchParams`,
// `cookies()`, `headers()` and `draftMode()` all return promises now, and the
// codemod rewrote 108 call sites across 61 pages, 9 layouts and 38 route
// handlers to match. Slice A ran that codemod and reviewed it. Nothing since
// then has stopped the tree drifting back.
//
// Drifting back is the specific risk, and it is not hypothetical. The next
// person to add a page will copy an older one, or write the signature from
// memory of Next.js 14, and `params.locale` on an unawaited promise is
// `undefined` rather than an error. An undefined locale does not throw. It
// falls through the `=== "ar"` test that every one of these pages opens with
// and renders the English build under an Arabic URL. That is a silent
// bilingual regression produced by a type the compiler was happy with, which
// is exactly the class of defect a typecheck cannot hold on its own.
//
// WHY THE RULE HAS TWO HALVES AND NOT ONE.
//
// A Server Component awaits the promise. A Client Component cannot await
// anything, so it unwraps with React's `use()`. Both are correct and each is
// wrong in the other's file, so a gate that only knows about `await` would
// either fail the seven client pages that are already right or pass a server
// page that forgot. This file checks the pairing rather than the keyword.
//
// WHAT IS DELIBERATELY NOT HERE.
//
// There is no assertion that a particular page exists or renders. Reachability
// is reachability.test.ts's job and rendering is the Playwright probes' job.
// This gate reads the source for properties of the source, in the same shape as
// apiErrors.test.ts and inventory.test.ts, because a property of the source is
// the only thing a source scan can honestly claim.

const ROOT = path.join(__dirname, "..", "..");

/**
 * Everything under a directory, by extension, named repo-relative with forward
 * slashes. The separator is not cosmetic: `API_METHODS` below is keyed by these
 * names in forward-slash form, and `path.join` separates with a backslash on
 * Windows, so a joined name matches no key and the route inventory reads as
 * every file having been added and every recorded one deleted at once.
 */
function walk(rel: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
    const next = `${rel}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(next, exts));
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(next);
  }
  return out;
}

const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/**
 * Source with comments removed.
 *
 * Every rule below is about code. `src/middleware.ts` explains the build-time
 * `headers()` in a comment and `src/lib/supabase/server.ts` explains why the
 * factory became asynchronous, and a scan that cannot tell prose from a call
 * site fails on both and teaches the next person to write the rule looser
 * rather than to write the code right.
 */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const isClient = (source: string) => /^\s*("use client"|'use client')/m.test(source);

const APP_MODULES = walk("src/app", [".ts", ".tsx"]);
// Everything the framework ships. The test files are excluded because a rule
// about what the application may call is not a rule about what a scan may name:
// this file has to write `UnsafeUnwrapped` out in full to look for it, and a
// gate that fails on its own search term teaches the next person to weaken the
// search term rather than to fix the code.
const SHIPPED_MODULES = [...APP_MODULES, ...walk("src/lib", [".ts", ".tsx"]), "src/middleware.ts"].filter(
  (f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx")
);

test("every route module declares params and searchParams as promises", () => {
  // The type is the part a reader checks against and the part a codemod can
  // rewrite, so it is also the part that has to stay true. A signature typed
  // `{ params: { locale: string } }` compiles against Next.js 16 only because
  // the framework's own types are structural, and then awaits nothing.
  for (const rel of APP_MODULES) {
    const source = code(read(rel));
    for (const m of source.matchAll(/\b(params|searchParams)\s*\??\s*:\s*([A-Za-z_$<{[]*)/g)) {
      // `const { searchParams } = new URL(req.url)` is the WHATWG URL property
      // and has nothing to do with the framework. It is a destructuring, not an
      // annotation, so it never reaches this expression.
      assert.equal(
        m[2].startsWith("Promise<"),
        true,
        `${rel} types ${m[1]} as ${m[2] || "(nothing)"}; Next.js 16 passes a Promise, and reading a property off an unawaited one yields undefined rather than an error`
      );
    }
  }
});

test("params are awaited in server components and unwrapped with use() in client ones", () => {
  let awaited = 0;
  let used = 0;
  for (const rel of APP_MODULES) {
    const source = read(rel);
    const body = code(source);
    const client = isClient(source);
    for (const m of body.matchAll(/props\.(params|searchParams)/g)) {
      const before = body.slice(Math.max(0, m.index - 8), m.index);
      if (before.endsWith("await ")) {
        awaited++;
        assert.equal(client, false, `${rel} is a Client Component and cannot await; unwrap props.${m[1]} with use()`);
      } else if (before.endsWith("use(")) {
        used++;
        assert.equal(client, true, `${rel} is a Server Component; await props.${m[1]} rather than calling use() on it`);
      } else {
        assert.fail(`${rel} reads props.${m[1]} without awaiting it or passing it through use()`);
      }
    }
  }
  // Both halves have to stay populated. If either falls to zero the rule above
  // is still green and is no longer proving anything, which is how a gate
  // becomes decoration.
  assert.ok(awaited > 50, `expected the server pages to keep awaiting, saw ${awaited}`);
  assert.ok(used > 0, `expected the client pages to keep using use(), saw ${used}`);
});

test("cookies, headers and draftMode are awaited everywhere they are called", () => {
  for (const rel of SHIPPED_MODULES) {
    const body = code(read(rel));
    // The negative lookbehind excludes `req.headers`, `res.headers` and
    // `new Headers()`, which are the Fetch API and were never synchronous.
    for (const m of body.matchAll(/(?<![\w.$])(cookies|draftMode|headers)\(\)/g)) {
      const before = body.slice(Math.max(0, m.index - 6), m.index);
      assert.equal(before.endsWith("await "), true, `${rel} calls ${m[1]}() without awaiting it`);
    }
  }
});

test("no module reaches for the synchronous unwrap escape hatch", () => {
  // Next.js ships `UnsafeUnwrapped` types so a large migration can compile
  // before it is finished. This one is finished. A cast through those types
  // silences the compiler on precisely the mistake this file exists to catch.
  for (const rel of SHIPPED_MODULES) {
    assert.equal(
      /UnsafeUnwrapped/.test(code(read(rel))),
      false,
      `${rel} unwraps a request API through the framework's own deprecated escape hatch`
    );
  }
});

// Every API route and the HTTP methods it exports. This is an inventory and not
// a derivation: the point is that removing a method, or adding one, has to be
// written down here as well as in the route, so neither can happen by accident
// in a diff nobody reads closely.
//
// The migration is why it exists. Next.js 16 changed the second argument of a
// route handler to `{ params: Promise<...> }`, so every one of these files was
// edited by the codemod, and an editing pass over 38 files is the moment a
// handler quietly stops being exported. A route that loses its POST does not
// fail to build. It answers 405 to the form that calls it.
const API_METHODS: Record<string, string[]> = {
  "src/app/api/account/route.ts": ["PATCH"],
  "src/app/api/admin/accounts/[id]/verification/route.ts": ["POST"],
  "src/app/api/admin/accounts/provision/route.ts": ["POST"],
  "src/app/api/advisor/route.ts": ["POST"],
  "src/app/api/advisor/shortlist/route.ts": ["POST"],
  "src/app/api/conversations/route.ts": ["POST"],
  "src/app/api/cron/expire-permits/route.ts": ["GET", "POST"],
  "src/app/api/cron/ingest-rega/route.ts": ["GET", "POST"],
  "src/app/api/documents/[id]/download/route.ts": ["GET"],
  "src/app/api/favorites/route.ts": ["DELETE", "GET", "PATCH", "POST"],
  "src/app/api/geo/resolve/route.ts": ["GET"],
  "src/app/api/geocode/route.ts": ["GET"],
  "src/app/api/index/segments/route.ts": ["GET"],
  "src/app/api/leads/[id]/route.ts": ["PATCH"],
  "src/app/api/leads/route.ts": ["POST"],
  "src/app/api/listings/[id]/docs/route.ts": ["POST"],
  "src/app/api/listings/[id]/documents/route.ts": ["POST"],
  "src/app/api/listings/[id]/media/[mediaId]/route.ts": ["DELETE"],
  "src/app/api/listings/[id]/media/route.ts": ["PATCH", "POST"],
  "src/app/api/listings/[id]/review/route.ts": ["POST"],
  "src/app/api/listings/[id]/route.ts": ["PATCH"],
  "src/app/api/listings/[id]/status/route.ts": ["POST"],
  "src/app/api/listings/[id]/translate/route.ts": ["POST"],
  "src/app/api/listings/route.ts": ["GET", "POST"],
  "src/app/api/places/route.ts": ["GET"],
  "src/app/api/report/route.ts": ["POST"],
  "src/app/api/requirements/[id]/interest/route.ts": ["POST"],
  "src/app/api/requirements/[id]/matches/route.ts": ["GET"],
  "src/app/api/requirements/[id]/route.ts": ["GET"],
  "src/app/api/requirements/route.ts": ["GET", "POST"],
  "src/app/api/saved-searches/route.ts": ["DELETE", "GET", "POST"],
  "src/app/api/saved/route.ts": ["GET"],
  "src/app/api/search/route.ts": ["POST"],
  "src/app/api/signup/route.ts": ["POST"],
  "src/app/api/signups/review/route.ts": ["POST"],
  "src/app/api/viewings/[id]/decision/route.ts": ["POST"],
  "src/app/api/viewings/review/route.ts": ["POST"],
  "src/app/api/viewings/route.ts": ["POST"],
};

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

function exportedMethods(source: string): string[] {
  const found = new Set<string>();
  for (const m of code(source).matchAll(/export\s+(?:async\s+)?(?:function|const)\s+([A-Z]+)\b/g)) {
    if (HTTP_METHODS.includes(m[1])) found.add(m[1]);
  }
  return [...found].sort();
}

test("every API route's method set is the one written down here", () => {
  const onDisk = APP_MODULES.filter((f) => f.endsWith("route.ts")).sort();
  assert.deepEqual(
    onDisk,
    Object.keys(API_METHODS).sort(),
    "a route file was added or removed; add it to API_METHODS with the methods it exports, or take it out"
  );
  for (const rel of onDisk) {
    assert.deepEqual(
      exportedMethods(read(rel)),
      API_METHODS[rel],
      `${rel} no longer exports the methods recorded here; a method that disappears answers 405 rather than failing the build`
    );
  }
  // 14 GET, 26 POST, 5 PATCH, 3 DELETE, and no PUT, HEAD or OPTIONS anywhere.
  // The totals are asserted separately because a pair of offsetting edits, one
  // method moved from one file to another, would satisfy every per-file check.
  const totals: Record<string, number> = {};
  for (const methods of Object.values(API_METHODS)) for (const m of methods) totals[m] = (totals[m] ?? 0) + 1;
  assert.deepEqual(totals, { DELETE: 3, GET: 14, PATCH: 5, POST: 26 });
});

test("the middleware file convention is whole, whichever one it is", () => {
  // Next.js 16 deprecates `middleware.ts` in favour of `proxy.ts` and prints
  // that warning on every build. Slice A declined the rename for a reason
  // recorded in the file itself. What must never be true is both files
  // existing, because the framework picks one and the other becomes code that
  // reads as live, is reviewed as live, and runs for nobody.
  const middleware = fs.existsSync(path.join(ROOT, "src/middleware.ts"));
  const proxy = fs.existsSync(path.join(ROOT, "src/proxy.ts"));
  assert.notEqual(middleware, proxy, "exactly one of src/middleware.ts and src/proxy.ts may exist");
});

test("the production build script names the bundler explicitly", () => {
  // PKG-NEXT16-SECURITY release-correction batch. The bundler is a measured
  // decision, not a default, and `next build` with no flag silently means
  // Turbopack on 16.x. Slice E measured the difference on this application:
  // Turbopack shipped roughly 8 to 13 kB more JavaScript per page and cost a
  // median 182 ms of mobile LCP. Vercel runs the `build` script, so this line
  // is the whole of the production bundler choice and it is one word away from
  // reverting by accident.
  const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
  assert.equal(
    pkg.scripts.build,
    "next build --webpack",
    "the production build must name --webpack; see docs/performance-baseline-next16-webpack.md for the measurement that chose it"
  );
  // The Turbopack arm stays reachable under its own name, because the
  // comparison record has to be reproducible and because the decision is
  // reviewed at the next framework upgrade rather than settled forever.
  assert.equal(pkg.scripts["build:turbopack"], "next build");
  // Development is deliberately not pinned. The flag is about what reaches a
  // user, and `next dev` on Turbopack is the supported development path.
  assert.equal(pkg.scripts.dev, "next dev");
});
