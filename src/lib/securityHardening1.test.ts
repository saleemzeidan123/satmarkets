import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ENFORCED_BASELINE_CSP, ENFORCED_CSP_HEADER, buildCsp } from "./csp.mjs";

// Security hardening 1 (2026-11-13). Source-level, like every other law test
// here: each test holds one decision in place so a later change has to undo it
// on purpose.

const root = path.join(import.meta.dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const strip = (s: string) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

test("four directives are enforced, not only reported", () => {
  assert.equal(ENFORCED_CSP_HEADER, "Content-Security-Policy");
  for (const d of ["object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "form-action 'self'"]) {
    assert.ok(ENFORCED_BASELINE_CSP.split("; ").includes(d), `${d} must be enforced`);
  }
  // Nothing that governs what a page loads may ride in on the enforced header
  // before the browser pass the baseline document describes has been done.
  assert.doesNotMatch(ENFORCED_BASELINE_CSP, /script-src|style-src|img-src|connect-src|default-src|font-src|worker-src/);
  const cfg = strip(read("next.config.mjs"));
  assert.match(cfg, /\{ key: ENFORCED_CSP_HEADER, value: ENFORCED_BASELINE_CSP \}/);
  assert.match(cfg, /\{ key: "Cross-Origin-Opener-Policy", value: "same-origin" \}/);
  assert.match(cfg, /\{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" \}/);
});

test("the policy names no origin the product no longer loads from", () => {
  // The library photographs were removed in PKG-DESIGN-6; their host stayed in
  // img-src. An origin on the list that nothing uses is only attack surface.
  assert.doesNotMatch(buildCsp(), /unsplash/);
});

test("map popups are built from nodes and never from an HTML string", () => {
  for (const f of ["src/components/ListingsMap.tsx", "src/components/MapExplorer.tsx", "src/components/LocationFacts.tsx", "src/components/LocationPicker.tsx"]) {
    assert.doesNotMatch(strip(read(f)), /\.setHTML\(/, `${f} hands markup to the map library`);
  }
  const helper = strip(read("src/lib/mapPopup.ts"));
  assert.doesNotMatch(helper, /innerHTML|insertAdjacentHTML|outerHTML/);
  assert.match(helper, /textContent = l\.text/);
  assert.match(helper, /SAFE_ID\.test\(link\.listingId\)/);
});

test("the public requirement write goes through the service client when there is one", () => {
  const route = strip(read("src/app/api/requirements/route.ts"));
  assert.match(route, /const writer = getSupabaseServiceRole\(\) \?\? sb;/);
  assert.match(route, /await writer\.rpc\("create_requirement"/);
  // Reads stay on the caller's client, so the match count sees what a visitor may see.
  assert.match(route, /releaseVisibleInventory\(sb\.from\("listings"\)/);
});

test("the prepared migrations remove only what the application does not use", () => {
  const a = read("supabase/migrations/20261113_security_hardening_1.sql");
  const b = read("supabase/migrations/20261113b_security_hardening_1_requirement_gate.sql");
  assert.match(a, /revoke execute on function public\.sat_publish_index_cell\(uuid\) from public, anon, authenticated;/);
  assert.match(a, /grant execute on function public\.sat_publish_index_cell\(uuid\) to service_role;/);
  assert.match(a, /revoke truncate, references, trigger on all tables in schema public from anon, authenticated;/);
  assert.match(b, /revoke execute on function public\.create_requirement\(jsonb\) from public, anon, authenticated;/);
  assert.match(b, /ORDER MATTERS/);
  // The views being closed must not be read anywhere in the application.
  const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const users = walk(path.join(root, "src")).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f)).filter((f) => /from\("rent_index_(cells|asking)"\)|rpc\("demo_census"\)/.test(fs.readFileSync(f, "utf8")));
  assert.deepEqual(users, [], "the application reads an object the prepared migration closes to the public roles");
  // The one application caller of the publish function must be reachable only with the service client.
  const callers = walk(path.join(root, "src")).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f)).filter((f) => /rpc\("sat_publish_index_cell"/.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(root, f));
  assert.deepEqual(callers, ["src/lib/ingest/rentBasePipeline.ts"]);
});

test("the framework is on a release that carries the 2026 fixes", () => {
  const pkg = JSON.parse(read("package.json"));
  const [maj, min, pat] = String(pkg.dependencies.next).replace(/^[^\d]*/, "").split(".").map(Number);
  assert.ok(maj > 16 || (maj === 16 && (min > 4 || (min === 4 && pat >= 6))), "next must be 16.4.6 or later");
});
