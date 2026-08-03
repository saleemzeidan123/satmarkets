import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { RTL_TEXT_PLUGIN_URL, registerRTLTextPlugin } from "./rtlTextPlugin";

// PKG-NEXT16-SECURITY slice C. The gate that keeps the third party origin out.
//
// Self-hosting the plugin is a one-line change to reverse, and reversing it by
// accident is easy: any future map component that copies the old snippet, or a
// merge that restores it, puts an unverifiable executable origin back into the
// page without failing anything. `npm audit` cannot see a URL in a string
// literal, and the CSP would have to be widened again to make it work, which is
// exactly the kind of change that gets made to "fix the map" without anyone
// reading what it costs.
//
// So the rule is asserted here rather than left to review.

const SRC = join(process.cwd(), "src");
const VENDOR_FILE = join(
  process.cwd(),
  "public/vendor/mapbox-gl-rtl-text-0.2.3/mapbox-gl-rtl-text.min.js"
);

// The sha256 of `mapbox-gl-rtl-text.min.js` as extracted from the npm registry
// tarball for @mapbox/mapbox-gl-rtl-text@0.2.3, whose published dist.integrity
// (sha512-RaCYfnxULUUUxNwcUimV9C/o2295ktTyLEUzD/+VWkqXqvaVfFcZ5slytGzb2Sd/Jj4MlbxD0DCZbfa6CzcmMw==)
// was verified against the downloaded tarball before extraction. Provenance is
// recorded in docs/vendored-third-party.md.
const VENDOR_SHA256 =
  "142f4fc31b4911887bacfea4df1813df67be28dfcb4c56e3f8f576f2e6fdf5d2";

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, acc);
    else if (/\.(ts|tsx|mjs|js|jsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

test("no source file loads the RTL plugin from a third party origin", () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    // rtlTextPlugin.ts documents the origin it replaced, in comments. Every
    // other mention is a live URL and is the thing being forbidden.
    if (file.endsWith("rtlTextPlugin.ts") || file.endsWith("rtlTextPlugin.test.ts")) continue;
    if (readFileSync(file, "utf8").includes("unpkg.com")) offenders.push(file);
  }
  assert.deepEqual(
    offenders,
    [],
    "load it from /vendor via registerRTLTextPlugin() instead; see src/lib/rtlTextPlugin.ts"
  );
});

test("setRTLTextPlugin is called through the shared helper and nowhere else", () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    if (file.endsWith("rtlTextPlugin.ts") || file.endsWith("rtlTextPlugin.test.ts")) continue;
    if (readFileSync(file, "utf8").includes("setRTLTextPlugin")) offenders.push(file);
  }
  assert.deepEqual(offenders, [], "maplibre throws if it is called twice; use registerRTLTextPlugin()");
});

test("the plugin URL is a same-origin absolute path", () => {
  assert.ok(RTL_TEXT_PLUGIN_URL.startsWith("/"), "must be same-origin");
  assert.ok(!/^\/\//.test(RTL_TEXT_PLUGIN_URL), "// is protocol-relative, not same-origin");
  // maplibre resolves this against the document and then hands the absolute URL
  // to importScripts inside the worker, so a relative path would resolve
  // differently depending on which route mounted the map.
  assert.ok(!RTL_TEXT_PLUGIN_URL.includes(":"), "must not name a scheme or host");
});

test("the vendored plugin is present and byte-for-byte the published one", () => {
  assert.ok(existsSync(VENDOR_FILE), "public/vendor copy is missing");
  const bytes = readFileSync(VENDOR_FILE);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), VENDOR_SHA256);
  // The URL the code asks for must be the file that actually exists.
  assert.equal(
    RTL_TEXT_PLUGIN_URL,
    "/vendor/mapbox-gl-rtl-text-0.2.3/mapbox-gl-rtl-text.min.js"
  );
});

test("the BSD-2-Clause notice is served beside the file it covers", () => {
  const licence = join(
    process.cwd(),
    "public/vendor/mapbox-gl-rtl-text-0.2.3/LICENSE.md"
  );
  assert.ok(existsSync(licence), "redistribution requires the notice to travel with it");
  const text = readFileSync(licence, "utf8");
  assert.ok(text.includes("copyright (c) 2017 Mapbox"));
  assert.ok(text.includes("Unicode, Inc."), "the ICU notice is part of the required text");
});

test("registerRTLTextPlugin registers once and never throws", () => {
  const calls: string[] = [];
  const fake: any = {
    setRTLTextPlugin: (url: string) => calls.push(url),
  };
  registerRTLTextPlugin(fake);
  registerRTLTextPlugin(fake);
  registerRTLTextPlugin(fake);
  assert.deepEqual(calls, [RTL_TEXT_PLUGIN_URL], "maplibre throws on a second call");

  // A module that does not expose the function, and one that throws, are both
  // degraded maps rather than dead ones.
  assert.doesNotThrow(() => registerRTLTextPlugin({}));
  assert.doesNotThrow(() => registerRTLTextPlugin(null));
  assert.doesNotThrow(() =>
    registerRTLTextPlugin({
      setRTLTextPlugin() {
        throw new Error("already called");
      },
    })
  );
});
