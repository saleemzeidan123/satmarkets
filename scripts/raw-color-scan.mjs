// Raw-colour scan (WS07 evidence). Reports raw hex colours used inline in
// components/pages instead of design tokens. This is a REPORTING tool for the
// PKG-1A handback and a baseline for the PKG-1B component de-hex migration; it
// does not fail the build. It excludes the token definition files (where hex is
// the source of truth) and the brand SVG/logo marks.
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src";
// Files that legitimately hold raw hex: the token sources and brand marks.
const ALLOW_FILES = [
  "src/styles/sat-platform.css",
  "src/styles/globals.css",
  "src/styles/footer.css",
  "tailwind.config.ts",
];
const HEX = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(tsx|ts)$/.test(name) && !/\.test\.ts$/.test(name)) yield p;
  }
}

const perFile = [];
let total = 0;
for (const f of files(ROOT)) {
  if (ALLOW_FILES.includes(f)) continue;
  const body = readFileSync(f, "utf8");
  const matches = body.match(HEX) || [];
  if (matches.length) { perFile.push([f, matches.length]); total += matches.length; }
}
perFile.sort((a, b) => b[1] - a[1]);
console.log(`raw-color-scan: ${total} inline hex occurrences across ${perFile.length} files (token sources excluded)`);
for (const [f, n] of perFile.slice(0, 25)) console.log(`  ${n}\t${f}`);
console.log("Note: reporting only. Component de-hex to tokens is scheduled in PKG-1B (WS10).");
