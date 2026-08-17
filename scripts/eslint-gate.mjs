import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// PKG-NEXT16-SECURITY slice A. The enforcement half of the `next lint`
// replacement.
//
// WHY A RATCHET AND NOT A PASS OR FAIL.
//
// `next lint` was removed in Next.js 16, and the `"lint": "next lint"` script it
// left behind had never once run: an unconfigured project makes `next lint` stop
// and ask an interactive question, and no gate in this repository can answer
// one. So the first time ESLint actually ran here it was reading a tree that had
// never been linted, and it found 82 problems. None of them are migration
// breakage. They are pre-existing findings in files this package has no other
// reason to touch.
//
// That leaves three ways to close the slice, and two of them are worse than
// doing nothing:
//
//   Wire up `eslint .` as a gate that exits 1. Every package from here on opens
//   with a red gate that nobody can clear and everybody learns to skip. A gate
//   that is always failing is not enforcing anything, it is training people to
//   ignore it.
//
//   Set the offending rules to "warn" so the command exits 0. Now the gate is
//   green and enforces nothing at all. This project has already ruled on the
//   shape of that mistake in another context, in the words "do not add
//   decorative per-instance rate limiting and call it protection". A decorative
//   lint gate is the same object.
//
//   Fix all 49 errors inside the framework migration. That buries a
//   framework-semantics diff, which is the thing that most needs reviewing, in
//   several hundred lines of unrelated hook refactoring. Twenty-eight
//   `static-components` and seventeen `set-state-in-effect` findings are real
//   React correctness questions that deserve their own package and their own
//   evidence, not a ride-along.
//
// So the counts below are pinned at what the tree actually carries, and the gate
// enforces one thing: the number in each row may go DOWN and may never go UP. A
// new violation of a rule already on this list fails the gate. A rule that is
// not on this list at all fails the gate, because a finding nobody has decided
// about should not enter silently. And a count that has dropped ALSO fails, with
// an instruction to lower the pin, so the debt cannot be paid off and then
// quietly re-borrowed.
//
// WHAT THIS IS NOT. It is not a substitute for the gates that decide whether a
// package closes: `tsc --noEmit`, the test suite, `ar-lint`, `prose-scan` and
// the Playwright probes. Those check Arabic register, Arabic-Indic digits, em
// dashes, the FAL number, hardcoded prose on public pages, reflow at nine widths
// and the tab bar reservation, none of which ESLint has any opinion about. This
// runs alongside them and never in front of them.
//
// The debt is recorded as a finding in docs/status-ledger.md with a named
// follow-up package. Lowering a number here without fixing the code is the one
// move this file cannot detect, which is why the numbers are in the diff.

const PINNED = {
  // React Compiler rules, shipped in the Next.js core-web-vitals set. Each is a
  // real question about a component's behaviour, and each needs to be answered
  // by looking at the component rather than by a sweep.
  "react-hooks/static-components": 28,
  "react-hooks/set-state-in-effect": 17,
  "react-hooks/purity": 4,
};

// Warnings are inventoried, not enforced. They are reported below so a package
// can see them, but a warning that cannot fail anything is not a gate, and
// pretending otherwise is the decorative case this file exists to refuse.
const WARN_INVENTORY = {
  // PKG-DISCOVERY-1, item 6. 14 to 15: the Listers directory card
  // (src/components/ListerCard.tsx) renders a lister's own uploaded logo the
  // same way every other avatar on the platform already does (ListerBadge,
  // the lister profile page, ListingCard), a raw <img> rather than
  // next/image, because the source is an arbitrary external URL a lister
  // supplied and not a build-time asset next/image can optimise. Recorded
  // here rather than left to drift, per this file's own rule that a warning
  // count exists to be seen, not to be stale.
  "@next/next/no-img-element": 15,
  "react-hooks/exhaustive-deps": 9,
};

// ESLint is run as a script under this process's own Node, not through `npx`.
//
// `execFileSync` does not go through a shell, and on Windows the thing on PATH is
// `npx.cmd` rather than `npx`, so `execFileSync("npx", ...)` fails with ENOENT
// before ESLint is ever reached. The catch below then reports "eslint produced no
// output" and exits 2, which reads as a broken lint run rather than as a gate step
// that cannot start: gate step 6 was unrunnable on Windows for that one reason.
//
// Running the resolved binary under `process.execPath` fixes it without a shell,
// which is also the safer construction, and it skips an npx startup on every run.
//
// The location is resolved rather than assumed. A hardcoded `../node_modules`
// path is correct only while this package is the resolution root, and it goes
// wrong the first time the dependency is hoisted or the repository grows a
// workspace. Node's own resolver already answers this question correctly in
// every one of those layouts.
//
// The resolution target is `eslint/package.json` rather than the bin path,
// because ESLint ships an `exports` map that does not list `./bin/eslint.js`,
// so asking for the bin directly fails with ERR_PACKAGE_PATH_NOT_EXPORTED.
// Resolving the manifest and walking to its directory stays on the supported
// path while still finding the binary wherever the install actually put it.
const require = createRequire(import.meta.url);
let ESLINT;
try {
  ESLINT = join(dirname(require.resolve("eslint/package.json")), "bin", "eslint.js");
} catch {
  console.error("eslint-gate: could not launch eslint, the eslint package did not resolve. Run npm ci.");
  process.exit(2);
}

if (!existsSync(ESLINT)) {
  console.error(`eslint-gate: no eslint at ${ESLINT}. Run npm ci.`);
  process.exit(2);
}

let raw;
try {
  raw = execFileSync(process.execPath, [ESLINT, ".", "-f", "json"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (e) {
  // Two unrelated failures land here and they must not report the same way.
  // ESLint exits 1 whenever it reports an error, which is the normal case in
  // this repository, and the JSON report still arrives on stdout. A failure to
  // launch the process at all also lands here, and it means the gate never ran,
  // which deserves its own message rather than the misleading claim that ESLint
  // was asked and answered nothing.
  if (e.code === "ENOENT" || e.code === "EACCES") {
    console.error(`eslint-gate: could not launch eslint (${e.code}) at ${ESLINT}.`);
    process.exit(2);
  }
  raw = e.stdout;
  if (!raw || !raw.trim()) {
    console.error("eslint-gate: eslint ran but produced no output.\n" + (e.stderr || e.message));
    process.exit(2);
  }
}

let report;
try {
  report = JSON.parse(raw);
} catch {
  console.error("eslint-gate: could not parse the eslint json report.");
  process.exit(2);
}

const errors = new Map();
const warns = new Map();
for (const file of report) {
  for (const m of file.messages) {
    // A directive problem and a fatal parse error both arrive with no ruleId.
    // Neither may be swallowed: a file ESLint cannot parse is reported as zero
    // findings, which reads exactly like a clean file.
    const id = m.ruleId ?? (m.fatal ? "FATAL" : "unused-disable-directive");
    const bucket = m.severity === 2 ? errors : warns;
    bucket.set(id, (bucket.get(id) ?? 0) + 1);
  }
}

let failed = false;
const say = (s) => console.log(s);

say("ESLint ratchet");
say("");

const seen = new Set();
for (const [rule, pin] of Object.entries(PINNED)) {
  seen.add(rule);
  const now = errors.get(rule) ?? 0;
  if (now > pin) {
    say(`  FAIL  ${rule}: ${now}, pinned at ${pin}. A new violation was added.`);
    failed = true;
  } else if (now < pin) {
    say(`  FAIL  ${rule}: ${now}, pinned at ${pin}. Lower the pin in scripts/eslint-gate.mjs.`);
    failed = true;
  } else {
    say(`  held  ${rule}: ${now}`);
  }
}

for (const [rule, n] of [...errors].sort()) {
  if (seen.has(rule)) continue;
  say(`  FAIL  ${rule}: ${n}. Not pinned. Fix it, or add it to PINNED with a reason.`);
  failed = true;
}

say("");
for (const [rule, was] of Object.entries(WARN_INVENTORY)) {
  const now = warns.get(rule) ?? 0;
  say(`  warn  ${rule}: ${now} (inventoried at ${was})`);
}
for (const [rule, n] of [...warns].sort()) {
  if (rule in WARN_INVENTORY) continue;
  say(`  warn  ${rule}: ${n} (new since the inventory)`);
}

say("");
if (failed) {
  say("ESLint ratchet FAILED. Run `npm run lint` for the file and line of each finding.");
  process.exit(1);
}
say(`ESLint ratchet held. ${[...errors.values()].reduce((a, b) => a + b, 0)} pinned errors, no new rule.`);
