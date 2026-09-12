// PKG-NEXT16-SECURITY slice A. The replacement for `next lint`.
//
// WHAT WAS HERE BEFORE. Nothing. `package.json` carried `"lint": "next lint"`
// and no ESLint configuration existed anywhere in the repository, so the script
// had never been run: `next lint` on an unconfigured project stops and asks an
// interactive question, which no gate in this repo can answer. Next.js 16
// removes the command entirely, so that script was about to stop being merely
// unused and start being broken.
//
// WHAT THIS DOES NOT REPLACE. Nothing here weakens or substitutes for the gates
// that actually run before a package closes: `npx tsc --noEmit`, the 1739 tests,
// `npm run ar-lint`, `scripts/prose-scan.mjs` and the four Playwright probes.
// Those check things ESLint has no opinion about, including Arabic register,
// Arabic-Indic digits, em dashes, the FAL number, hardcoded prose on public
// pages, reflow at nine widths and the tab bar's reservation. ESLint is added
// alongside them, never in front of them.
//
// WHAT IT IS SCOPED TO. The Next.js core-web-vitals set, which is the framework
// author's own rule list, plus the TypeScript set. It is deliberately not a
// house style: no formatting rules, no import ordering, no opinion this
// repository has not already decided elsewhere. A rule that would force a
// mechanical rewrite of files this package is not otherwise touching does not
// belong inside a framework migration, and would make the migration diff
// unreviewable, which is the opposite of what slice A is for.

import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      // A background agent's own worktree (a full nested checkout of this
      // repo, under .claude/worktrees/ via the Agent tool's own isolation
      // feature) is not this checkout's code. Found unignored during
      // PKG-LISTING-CREATION-1B: every ratchet count roughly doubled while
      // an agent's worktree sat here mid-run, from a second copy of src/
      // being scanned alongside the real one.
      ".claude/**",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // The repository's own typecheck is the authority on unused symbols and on
      // `any`. `tsc --noEmit` runs on every package and is already clean; a
      // second, differently tuned opinion on the same two questions would report
      // findings the build does not consider errors, which turns a gate into
      // noise. Both are recorded as reported rather than enforced.
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",

      // These two are not additions of taste. The tree already carried
      // `eslint-disable-next-line no-control-regex` in src/lib/search/canonical.ts,
      // written to suppress a report from a rule that the Next.js sets do not
      // turn on, so the suppression sat there protecting nothing and ESLint
      // reported the directive itself as unused. Deleting the directive was the
      // wrong repair: the code under it is a deliberate control-character class
      // guarding what reaches a page title, and the comment is the record of
      // that decision. Turning the rule on is what makes the record true again.
      // `no-cond-assign` is enabled alongside it for the same reason, one level
      // weaker: it costs nothing today, it is a correctness rule rather than a
      // style rule, and the tree writes the parenthesised form it permits.
      "no-control-regex": "error",
      "no-cond-assign": "error",
    },
  },
];

export default config;
