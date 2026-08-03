import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildCsp, newNonce, CSP_HEADER, CLIENT_CSP_REQUEST_HEADERS } from "./csp.mjs";

// PKG-NEXT16-SECURITY slice C. The gate on the Content Security Policy.
//
// Two emitters share one builder, and the whole point of that arrangement is
// that they cannot drift. Nothing enforces it except this file, because a
// hand-written policy string in either emitter would still compile, still ship
// and still look correct in review.

const ROOT = process.cwd();
const nextConfig = readFileSync(join(ROOT, "next.config.mjs"), "utf8");
const middleware = readFileSync(join(ROOT, "src/middleware.ts"), "utf8");

// The regex the framework uses to read the nonce back out of the header, copied
// from next/dist/server/app-render/get-script-nonce-from-header.js. A nonce this
// does not match is silently ignored, and a silently ignored nonce means the
// framework's inline scripts ship unnonced while the header claims otherwise.
const CSP_NONCE_SOURCE_REGEX = /^'nonce-([A-Za-z0-9+/_-]+={0,2})'$/;

function directives(policy: string): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const d of policy.split(";").map((s) => s.trim()).filter(Boolean)) {
    const [name, ...sources] = d.split(/\s+/);
    m.set(name, sources);
  }
  return m;
}

test("the policy names no third party script origin, and connect-src is a closed list", () => {
  // Nothing outside this origin may execute. src/lib/rtlTextPlugin.test.ts holds
  // the matching rule at the other end, that no source file names the CDN origin
  // slice C removed, so neither the policy nor the code can reintroduce it alone.
  for (const policy of [buildCsp(), buildCsp("abc")]) {
    const d = directives(policy);
    assert.deepEqual(d.get("script-src")?.filter((s) => s.startsWith("http")), []);
    assert.deepEqual(d.get("connect-src"), [
      "'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://*.cartocdn.com",
      "https://tiles.openfreemap.org",
    ], "adding an origin here is a decision that belongs in docs/security-baseline.md");
  }
});

test("the nonce and nonce-less policies differ in script-src and nowhere else", () => {
  const without = directives(buildCsp());
  const withNonce = directives(buildCsp("abc"));
  assert.deepEqual([...without.keys()], [...withNonce.keys()], "directive order and set must match");
  for (const [name, sources] of without) {
    if (name === "script-src") continue;
    assert.deepEqual(withNonce.get(name), sources, `${name} drifted between the two emitters`);
  }
});

test("the nonce is placed where the framework will find it", () => {
  const sources = directives(buildCsp("abc123")).get("script-src")!;
  // The framework looks at script-src first and falls back to default-src, then
  // takes the first source in that directive matching its nonce regex.
  const found = sources.find((s) => CSP_NONCE_SOURCE_REGEX.test(s));
  assert.equal(found, "'nonce-abc123'");
  // 'unsafe-inline' is retained on purpose as the pre-nonce fallback, and a
  // browser that understands nonces ignores it. It must stay after the nonce so
  // there is no argument about which source is read first.
  assert.ok(sources.includes("'unsafe-inline'"));
  assert.ok(sources.indexOf("'nonce-abc123'") < sources.indexOf("'unsafe-inline'"));
});

test("a generated nonce satisfies the framework's own regex", () => {
  for (let i = 0; i < 200; i++) {
    const n = newNonce();
    assert.match(`'nonce-${n}'`, CSP_NONCE_SOURCE_REGEX, `rejected nonce: ${n}`);
  }
  assert.notEqual(newNonce(), newNonce(), "a constant nonce is not a nonce");
});

test("neither emitter writes a policy string of its own", () => {
  for (const [name, source] of [["next.config.mjs", nextConfig], ["src/middleware.ts", middleware]] as const) {
    assert.ok(source.includes("buildCsp"), `${name} must build the policy through src/lib/csp.mjs`);
    assert.ok(
      !/(default|script|style|connect|img|font|frame|media|worker|object|manifest|base)-src\s/.test(
        source.replace(/^\s*\/\/.*$/gm, "")
      ),
      `${name} contains a directive outside a comment; the policy lives in src/lib/csp.mjs`
    );
  }
});

test("middleware strips client-supplied CSP request headers before setting its own", () => {
  // The framework reads the nonce out of the REQUEST's csp header, and a request
  // header is attacker-controlled. Deleting both names is what stops a visitor
  // choosing the nonce the renderer stamps on the framework's inline scripts.
  assert.deepEqual(CLIENT_CSP_REQUEST_HEADERS, [
    "content-security-policy",
    "content-security-policy-report-only",
  ]);
  const del = middleware.indexOf("CLIENT_CSP_REQUEST_HEADERS");
  const set = middleware.indexOf("reqHeaders.set(CSP_HEADER.toLowerCase()");
  assert.ok(del > -1 && set > -1, "middleware must delete then set the request policy header");
  assert.ok(del < set, "the delete must come before the set, or the set is not authoritative");
});

test("the policy is report-only until the evidence for enforcement exists", () => {
  // Changing this is a decision, not a tidy-up. docs/security-baseline.md records
  // what has to be observed first and who can observe it.
  assert.equal(CSP_HEADER, "Content-Security-Policy-Report-Only");
});
