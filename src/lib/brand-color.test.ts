import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Law 5 guardrail. Harbor #3A6EA5 is SAT Markets; satestate's gold (the brand
// colour forbidden here) must never appear in this source tree. Built as a scan
// so a redesign that touches colours cannot silently reintroduce it. The needle
// is assembled from parts so this test file does not match itself.
const GOLD = "#8a" + "7342";
const EXTS = [".ts", ".tsx", ".css", ".json"];
const SELF = "brand-color.test.ts";

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (EXTS.some((e) => name.endsWith(e)) && name !== SELF) out.push(p);
  }
  return out;
}

test("satestate gold never appears in src (Law 5)", () => {
  const offenders = walk("src").filter((f) => readFileSync(f, "utf-8").toLowerCase().includes(GOLD));
  assert.deepEqual(offenders, [], "Law 5 violation: satestate gold found in " + offenders.join(", "));
});
