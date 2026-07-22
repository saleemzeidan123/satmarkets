import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { formatPeriod, parsePeriod } from "./market/period";

// PKG-0A law enforcement (Codex correction 6). Scope is deliberate: these tests
// target user-visible output (both dictionaries, rendered source strings) and
// known forbidden tokens, NOT an indiscriminate repo-wide ban on ordinary words.
// Semantic average-versus-median mapping is tested at the exact strings that
// carried the defect.

const ROOT = join(__dirname, "..");
const EN = JSON.parse(readFileSync(join(ROOT, "i18n/dictionaries/en.json"), "utf8"));
const AR = JSON.parse(readFileSync(join(ROOT, "i18n/dictionaries/ar.json"), "utf8"));

function* strings(o: unknown, path = ""): Generator<[string, string]> {
  if (typeof o === "string") yield [path, o];
  else if (o && typeof o === "object") {
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) yield* strings(v, path ? `${path}.${k}` : k);
  }
}

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* sourceFiles(p);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name)) yield p;
  }
}

test("law: no em dash in any dictionary string (either locale)", () => {
  for (const dict of [EN, AR]) {
    for (const [path, s] of strings(dict)) {
      assert.ok(!s.includes("\u2014"), `em dash in dictionary string ${path}`);
    }
  }
});

test("law: no em dash anywhere in application source (copy, comments, literals)", () => {
  for (const f of sourceFiles(ROOT)) {
    const body = readFileSync(f, "utf8");
    assert.ok(!body.includes("\u2014"), `em dash in ${f}`);
  }
});

test("law: FAL licence is 1200025510 and the obsolete number never appears", () => {
  for (const f of sourceFiles(ROOT)) {
    assert.ok(!readFileSync(f, "utf8").includes("03005508"), `obsolete FAL number in ${f}`);
  }
  // Wherever a FAL number is written in copy, it is the real one.
  for (const dict of [EN, AR]) {
    for (const [path, s] of strings(dict)) {
      if (/FAL|رخصة فال/.test(s) && /\d{8,}/.test(s)) {
        assert.ok(s.includes("1200025510"), `FAL string without the licensed number at ${path}`);
      }
    }
  }
});

test("law: satestate gold and the retired status green never appear", () => {
  for (const f of sourceFiles(ROOT)) {
    const body = readFileSync(f, "utf8").toUpperCase();
    assert.ok(!body.includes("8A7342"), `satestate gold in ${f}`);
    assert.ok(!body.includes("1F8A5B"), `retired status green in ${f} (locked token is #1B7A50)`);
  }
});

test("law: average and median are never interchangeable in the Rent Index strings", () => {
  // The defect was pricing rendering the Rent Index metric as district brokers
  // in Arabic and medians in English, while the REGA source publishes averages
  // (source_registry.rega_ejar: "Publishes AVERAGES, not medians").
  for (const f of sourceFiles(ROOT)) {
    const body = readFileSync(f, "utf8");
    assert.ok(!body.includes("وسطاء الأحياء"), `district-brokers mistranslation in ${f}`);
    assert.ok(!body.includes("district medians"), `medians label on an averages metric in ${f}`);
  }
});

test("law: English and Arabic reference identical Rent Index reporting periods", () => {
  // Extract every quarter identifier from each dictionary and require the sets
  // to match. This is the regression test for the Q2/Q1 parity defect.
  const AR_Q: Record<string, string> = { "الأول": "1", "الثاني": "2", "الثالث": "3", "الرابع": "4" };
  const periods = (dict: unknown, ar: boolean) => {
    const found = new Set<string>();
    for (const [, s] of strings(dict)) {
      if (ar) {
        for (const m of s.matchAll(/الربع (الأول|الثاني|الثالث|الرابع) (\d{4})/g)) found.add(`Q${AR_Q[m[1]]} ${m[2]}`);
      } else {
        for (const m of s.matchAll(/Q([1-4])\s?(\d{4})/g)) found.add(`Q${m[1]} ${m[2]}`);
      }
    }
    return found;
  };
  const en = periods(EN, false), arp = periods(AR, true);
  assert.deepEqual([...en].sort(), [...arp].sort(), `EN periods ${[...en]} vs AR periods ${[...arp]}`);
});

test("period formatter renders the stored DB form in both languages", () => {
  assert.equal(formatPeriod("2026-Q2", false), "Q2 2026");
  assert.equal(formatPeriod("2026-Q2", true), "الربع الثاني 2026");
  assert.equal(formatPeriod("Q1 2026", true), "الربع الأول 2026");
  // Never invent: unrecognized input passes through untouched.
  assert.equal(formatPeriod("H1 2026", true), "H1 2026");
  assert.equal(formatPeriod(null, false), "");
  assert.deepEqual(parsePeriod("2026-q3"), { year: "2026", q: "3" });
  assert.equal(parsePeriod("2026"), null);
});

test("law: the preview never claims the unacquired domain in visible copy", () => {
  // satmarkets.sa may appear in code comments and launch plumbing, but not in
  // dictionary copy while unowned. (Canonical URLs are covered by lib/site.ts.)
  for (const dict of [EN, AR]) {
    for (const [path, s] of strings(dict)) {
      assert.ok(!/SATMARKETS\.SA/i.test(s), `unowned domain claim in dictionary at ${path}`);
    }
  }
});

test("law: dictionary key parity is exact between locales", () => {
  const keys = (o: unknown) => [...strings(o)].map(([p]) => p).sort();
  assert.deepEqual(keys(EN), keys(AR));
});
