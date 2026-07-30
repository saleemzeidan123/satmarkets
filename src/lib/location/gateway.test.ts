import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { callGeoGeocode, callGeoSuggest, callGeoTravel } from "./gateway";
import { GEO_PROVIDERS, providersFor } from "./registry";

// ADV-5A. The structural half of the location boundary.
//
// `boundary.test.ts` checks that the decision is right. This file checks that
// the decision is unavoidable, which is a claim about every file in the tree and
// cannot be made from inside one module. It reads the repository.
//
// WHAT THIS PROVES, STATED NARROWLY. The needle list below covers the three
// hostnames and the five credential names this product actually uses, the import
// of the transport, the cache options, and the shape of the processing gate. A
// determined future edit can still assemble a hostname from fragments, exactly as
// this file assembles its own needles so as not to match its own scan, and no
// source scan sees through that. So the claim, here and in the closure record, is
// the one Codex accepted for the model gateway in ADV-3A.1 item 4: all currently
// known and registered location provider integrations are centralized and
// guarded. It is not a proof that no other socket is expressible.
//
// Comments are stripped before matching. `src/lib/locationFacts.ts` and
// `registry.ts` both name api.mapbox.com in prose, describing the defect that
// started this package, and a guard that forbids writing down what went wrong is
// a guard that erases its own reason for existing.

const SRC = "src";
const GEO = "src/lib/location";

const tsFiles = (root: string): string[] => {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(p)) out.push(p);
    }
  };
  walk(root);
  return out;
};

const norm = (p: string) => p.split(path.sep).join("/");

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const code = (f: string) => stripComments(fs.readFileSync(f, "utf8"));

/** The package's shipping modules. A test file opens no socket and stores nothing. */
const geoModules = () => tsFiles(GEO).filter((f) => !/\.test\.tsx?$/.test(f));

// 1. One socket, one declaration.

// Assembled from fragments so this file does not match its own scan.
const GEO_NEEDLES: RegExp[] = [
  // Hostnames.
  new RegExp("api\\.map" + "box\\.com"),
  new RegExp("places\\.google" + "apis\\.com"),
  new RegExp("photon\\.ko" + "moot\\.io"),
  // Credential names. A second file that reads a maps key is a second maps
  // integration even if it never opens a socket, which is precisely how
  // `driveMinutes` and `/api/places` each grew their own private key read.
  new RegExp("MAP" + "BOX_TOKEN"),
  new RegExp("map" + "box_token"),
  new RegExp("GOOGLE_MAPS" + "_API_KEY"),
  new RegExp("google_places" + "_key"),
  new RegExp("SPL" + "_API_KEY"),
];

// The transport is the socket. The registry is the declaration of which vendors
// exist and which environment names configure them, which is its stated job.
const GEO_ALLOWED = new Set([
  "src/lib/location/trans" + "port.ts",
  "src/lib/location/registry.ts",
  "src/lib/location/gateway.test.ts",
]);

test("no file outside the location package reaches a geo provider or holds its credentials", () => {
  const offenders: { file: string; needle: string }[] = [];
  for (const f of tsFiles(SRC)) {
    const n = norm(f);
    if (GEO_ALLOWED.has(n)) continue;
    const t = code(f);
    for (const re of GEO_NEEDLES) {
      if (re.test(t)) offenders.push({ file: n, needle: String(re) });
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `these files reach a location provider or hold its configuration directly: ${offenders
      .map((o) => `${o.file} (${o.needle})`)
      .join(", ")}`
  );
});

test("every declared host and credential name is actually caught by the needle list", () => {
  // A guard whose list has drifted behind the registry is worse than no guard,
  // because the closure record still claims it. This fails the moment a provider
  // is added with a hostname or a key nobody added a needle for.
  for (const p of GEO_PROVIDERS) {
    if (p.host) {
      assert.ok(
        GEO_NEEDLES.some((re) => re.test(p.host as string)),
        `${p.id} declares host ${p.host}, which no needle matches`
      );
    }
    for (const k of p.envKeys) {
      assert.ok(
        GEO_NEEDLES.some((re) => re.test(k)),
        `${p.id} declares credential ${k}, which no needle matches`
      );
    }
  }
});

test("the transport is imported by the gateway and by nothing else", () => {
  const importers: string[] = [];
  // Scoped deliberately. `src/lib/ai/` has a module of the same name behind its
  // own guard, so a bare relative match would report a file this scan is not
  // about. Inside this package a relative import counts; outside it, only an
  // explicit path to this transport does.
  const mod = "trans" + "port";
  const rel = new RegExp(`from\\s+["']\\./${mod}["']`);
  const abs = new RegExp(`from\\s+["'][^"']*location/${mod}["']`);
  for (const f of tsFiles(SRC)) {
    const n = norm(f);
    if (n === "src/lib/location/gateway.test.ts") continue;
    const t = code(f);
    const inGeo = n.startsWith(GEO + "/");
    if ((inGeo && rel.test(t)) || abs.test(t)) importers.push(n);
  }
  assert.deepEqual(importers, ["src/lib/location/gateway.ts"]);
});

test("the package index does not re-export the transport", () => {
  const t = code(path.join(GEO, "index.ts"));
  assert.doesNotMatch(t, new RegExp("trans" + "port"));
});

test("nothing outside the location package imports the boundary directly", () => {
  // Callers get `callGeo*`. A caller that reached `decideGeoProvider` itself
  // could take a decision and then not act on it, which is how a boundary turns
  // back into advice.
  const offenders: string[] = [];
  for (const f of tsFiles(SRC)) {
    const n = norm(f);
    if (n.startsWith(GEO + "/")) continue;
    if (/from\s+["'][^"']*location\/boundary["']/.test(code(f))) offenders.push(n);
  }
  assert.deepEqual(offenders, []);
});

// 2. Request time, not storage.

test("no geo request carries a cache option that would store the answer", () => {
  // D27(a): travel time is computed at request time and is never stored as a
  // property fact. The old `driveMinutes` held a Mapbox route for 86,400 seconds
  // in a `next: { revalidate }` option, which is storage whatever it is called.
  for (const f of geoModules()) {
    const t = code(f);
    assert.doesNotMatch(t, new RegExp("reval" + "idate"), `${norm(f)} sets a revalidate option`);
    assert.doesNotMatch(t, /next\s*:\s*\{/, `${norm(f)} passes a next cache option`);
  }
});

test("every fetch in the package is no-store, and every fetch is in the transport", () => {
  const fetchers = geoModules().filter((f) => /\bfetch\s*\(/.test(code(f))).map(norm);
  assert.deepEqual(fetchers, ["src/lib/location/transport.ts"]);

  const t = code(path.join(GEO, "transport.ts"));
  const calls = t.match(/\bfetch\s*\(/g) || [];
  const noStore = t.match(/cache:\s*"no-store"/g) || [];
  assert.ok(calls.length > 0);
  assert.equal(
    noStore.length,
    calls.length,
    `${calls.length} fetch calls but ${noStore.length} no-store options`
  );
});

test("every URL in the transport is built from the declared host", () => {
  const t = code(path.join(GEO, "transport.ts"));
  // Every https literal in the socket module interpolates the host rather than
  // naming one. A vendor cannot arrive through a string literal in a route.
  const literals = t.match(/https:\/\/[^\s`"']+/g) || [];
  // The single exception is the contact URL inside the OpenStreetMap user agent.
  // Photon's usage policy requires an identifiable agent; it is a courtesy string
  // in a header, never a request target.
  const contact = new RegExp("git" + "hub\\.com/");
  for (const l of literals) {
    if (contact.test(l)) continue;
    assert.ok(
      l.startsWith("https://${p.host") || l.startsWith("https://${host"),
      `transport.ts contains a hardcoded URL: ${l}`
    );
  }
});

// 3. The processing gate is a contractual fact, not a deployment setting.

test("the processing gate is not derived from the environment", () => {
  const t = code(path.join(GEO, "boundary.ts"));
  assert.match(t, /PROCESSING_AGREEMENTS_IN_FORCE\s*=\s*false/);
  assert.doesNotMatch(t, /PROCESSING_AGREEMENTS_IN_FORCE\s*=\s*[^;]*process\.env/);
});

test("the boundary reads no environment variable at all", () => {
  // The decision must be reproducible from the register and the request. If it
  // could read the environment, a deployment change could move it.
  assert.doesNotMatch(code(path.join(GEO, "boundary.ts")), /process\.env/);
  assert.doesNotMatch(code(path.join(GEO, "registry.ts")), /process\.env/);
});

// 4. The paths stop before network access.

// Every call below runs with an empty register, which is what the deployment
// actually has, and with a fake fetch installed. If any of them reached a socket
// the assertion on the counter would fail rather than a request going out.

const noNetwork = async <T>(run: () => Promise<T>): Promise<{ value: T; calls: number }> => {
  const g = globalThis as unknown as { fetch: typeof fetch };
  const real = g.fetch;
  let calls = 0;
  g.fetch = (async (...args: unknown[]) => {
    calls += 1;
    throw new Error(`a socket was opened: ${String(args[0])}`);
  }) as unknown as typeof fetch;
  try {
    return { value: await run(), calls };
  } finally {
    g.fetch = real;
  }
};

test("a public travel-time call stops before network access", async () => {
  const r = await noNetwork(() =>
    callGeoTravel(
      { fromLat: 24.7, fromLng: 46.6, toLat: 24.9, toLng: 46.7 },
      { audience: "public", rights: new Map(), env: {} }
    )
  );
  assert.equal(r.calls, 0);
  assert.equal(r.value.ok, false);
  assert.equal(r.value.ok === false && r.value.failure, "boundary");
});

test("a public place-suggest call stops before network access", async () => {
  const r = await noNetwork(() =>
    callGeoSuggest("olaya", { audience: "public", rights: new Map(), env: {} })
  );
  assert.equal(r.calls, 0);
  assert.equal(r.value.ok, false);
  assert.equal(r.value.ok === false && r.value.failure, "boundary");
});

test("a public geocode call stops before network access", async () => {
  const r = await noNetwork(() =>
    callGeoGeocode("olaya", { audience: "public", rights: new Map(), env: {} })
  );
  assert.equal(r.calls, 0);
  assert.equal(r.value.ok, false);
  assert.equal(r.value.ok === false && r.value.failure, "boundary");
});

test("supplying every credential does not open a socket", async () => {
  // The point of the ordering in `boundary.ts`, asserted here at the gateway
  // rather than at the decision, because this is the level a route calls.
  const env: Record<string, string> = {};
  for (const p of GEO_PROVIDERS) for (const k of p.envKeys) env[k] = "present";
  const r = await noNetwork(() =>
    callGeoSuggest("olaya", { audience: "public", rights: new Map(), env })
  );
  assert.equal(r.calls, 0);
  assert.equal(r.value.ok, false);
});

test("the reasons returned name every candidate that was refused", async () => {
  const r = await noNetwork(() =>
    callGeoSuggest("olaya", { audience: "public", rights: new Map(), env: {} })
  );
  assert.equal(r.value.reasons.length, providersFor("place_suggest").length);
});

// 5. The routes that call the gateway do not keep a private path around it.

/** The removed function, named in fragments so this file is not its own offender. */
const GONE = new RegExp("\\bdrive" + "Minutes\\b");

test("the two rewired routes reach location providers only through the gateway", () => {
  for (const route of ["src/app/api/places/route.ts", "src/app/api/geocode/route.ts"]) {
    const t = code(route);
    assert.match(t, /from\s+["']@\/lib\/location\/gateway["']/, `${route} does not use the gateway`);
    assert.doesNotMatch(t, /\bfetch\s*\(/, `${route} still opens its own socket`);
  }
});

test("the listing page asks for travel time through the location package", () => {
  const t = code("src/app/[locale]/listings/[id]/page.tsx");
  assert.match(t, /from\s+["']@\/lib\/location\/travel["']/);
  assert.doesNotMatch(t, GONE);
});

test("driveMinutes is gone from the repository", () => {
  // Test files are excluded. Two of them name the removed function in order to
  // assert that it is gone, and a guard that punishes its own evidence is a guard
  // somebody deletes.
  const offenders = tsFiles(SRC)
    .filter((f) => !/\.test\.tsx?$/.test(f))
    .filter((f) => GONE.test(code(f)))
    .map(norm);
  assert.deepEqual(offenders, []);
});
