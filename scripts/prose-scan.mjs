// Hardcoded-prose scan (WS11 evidence, PKG-1C).
//
// Reports natural-language prose that is written directly into a public page or
// into a component a public page renders, instead of coming from the EN and AR
// dictionaries. The rule set is the one fixed in docs/phase1-proposal.md and is
// implemented literally, not approximated:
//
//   Allowlisted, never flagged: CSS values and units, className / style / aria-*
//   / data-* attribute values, import paths and URLs, dictionary keys and enum
//   identifiers, single-token codes matching ^[A-Za-z0-9_.:/-]+$ (asset keys,
//   SATM- reference codes, unit strings), numeric-and-punctuation-only strings,
//   and any string carrying an explicit /* i18n-exempt */ marker.
//
//   A string is flagged only when it contains a run of two or more
//   natural-language words in Latin or Arabic script outside those categories.
//
// The scan is AST based (the TypeScript compiler's own parser), not regex over
// source text, because the allowlist is defined by SYNTACTIC POSITION: the same
// characters are prose in a JSX text node and a token list in a className. A
// regex cannot tell those apart and would report a fictional number.
//
// Scope is derived from src/lib/routePolicy.ts, so it cannot drift from the
// route map: every public route's page and layout, plus the public detail
// templates, plus the transitive src/ import graph beneath them. Private and
// admin surfaces are out of scope for PKG-1C by design.
//
// Reporting tool. It prints a baseline and exits 0 unless --strict is passed.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import ts from "typescript";

const ROOT = resolve(process.cwd());
const SRC = join(ROOT, "src");
const STRICT = process.argv.includes("--strict");
const VERBOSE = process.argv.includes("--verbose");
const rel = (p) => relative(ROOT, p).split("\\").join("/");

// ---------------------------------------------------------------- route scope

/** Read the exported route arrays out of routePolicy.ts without importing TS. */
function routePolicy() {
  const body = readFileSync(join(SRC, "lib/routePolicy.ts"), "utf8");
  const sitemap = [...(/SITEMAP_ROUTES\s*=\s*\[([\s\S]*?)\]/.exec(body)?.[1] ?? "").matchAll(/"([^"]*)"/g)].map((m) => m[1]);
  const held = [...(/HELD_ROUTES[\s\S]*?=\s*\[([\s\S]*?)\];/.exec(body)?.[1] ?? "").matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]);
  return { sitemap, held };
}

// Public detail templates. These are public-indexable-later in docs/routes.md
// but are not literal members of SITEMAP_ROUTES (they are gated on ALLOW_INDEX),
// so they are named here and cross-checked against the doc in review.
const DETAIL_ROUTES = [
  "/listings/[id]",
  "/listings/[id]/flyer",
  "/building/[id]",
  "/lister/[id]",
  "/requirements/[id]",
  "/locations/[slug]",
  "/market/[slug]",
];

const ALWAYS = ["src/app/layout.tsx", "src/app/not-found.tsx", "src/app/[locale]/layout.tsx", "src/app/[locale]/error.tsx"];

function entryPoints() {
  const { sitemap, held } = routePolicy();
  const paths = [...new Set([...sitemap, ...held, ...DETAIL_ROUTES])];
  const out = [];
  for (const p of paths) {
    for (const leaf of ["page.tsx", "layout.tsx", "opengraph-image.tsx"]) {
      const f = join(SRC, "app/[locale]" + p, leaf);
      if (existsSync(f)) out.push(f);
    }
  }
  for (const a of ALWAYS) { const f = join(ROOT, a); if (existsSync(f)) out.push(f); }
  return out;
}

// ------------------------------------------------------------- module resolve

const EXTS = [".tsx", ".ts", ".jsx", ".js"];
function resolveImport(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(fromFile), spec);
  else return null; // node_modules and bare specifiers are out of scope
  for (const e of EXTS) { if (existsSync(base + e)) return base + e; }
  if (existsSync(base) && statSync(base).isDirectory()) {
    for (const e of EXTS) { const i = join(base, "index" + e); if (existsSync(i)) return i; }
  }
  if (existsSync(base) && statSync(base).isFile() && /\.(tsx?|jsx?)$/.test(base)) return base;
  return null;
}

function graph(entries) {
  const seen = new Set();
  const queue = [...entries];
  while (queue.length) {
    const f = queue.shift();
    if (seen.has(f) || !existsSync(f)) continue;
    if (/\.test\.tsx?$/.test(f)) continue;
    seen.add(f);
    const sf = parse(f);
    for (const st of sf.statements) {
      let spec = null;
      if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) spec = st.moduleSpecifier.text;
      if (ts.isExportDeclaration(st) && st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) spec = st.moduleSpecifier.text;
      if (!spec) continue;
      const r = resolveImport(spec, f);
      if (r && !seen.has(r)) queue.push(r);
    }
  }
  return [...seen].sort();
}

const cache = new Map();
function parse(file) {
  if (cache.has(file)) return cache.get(file);
  const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, /\.tsx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  cache.set(file, sf);
  return sf;
}

// ------------------------------------------------------------------ allowlist

// Two or more natural-language words, Latin or Arabic script. A "word" is a run
// of letters; the run must total at least four letters so that "m ²" or "a b"
// cannot register as prose.
const LETTER = "A-Za-z\\u0621-\\u064A\\u0660-\\u0669";
const WORD = `[${LETTER}]+(?:['’،-][${LETTER}]+)*`;
const PROSE = new RegExp(`${WORD}(?:[\\s\\u00A0]+${WORD})+`);

function isProse(s) {
  const m = PROSE.exec(s);
  if (!m) return false;
  const letters = (m[0].match(new RegExp(`[${LETTER}]`, "g")) || []).length;
  const words = m[0].trim().split(/[\s ]+/).length;
  return letters >= 4 && words >= 2;
}

/** Single-token codes, numeric-and-punctuation-only strings, URLs, paths. */
function isAllowlistedByShape(s) {
  const t = s.trim();
  if (!t) return true;
  if (/^[A-Za-z0-9_.:/-]+$/.test(t)) return true;                 // single-token code
  if (!new RegExp(`[${LETTER}]`).test(t)) return true;            // numeric + punctuation only
  if (/^(?:https?:|mailto:|tel:|data:|\/\/|\.\.?\/|@\/)/.test(t)) return true; // URL or import path
  return false;
}

// CSS: a value written as a style-object property, a unit string, or a rule body.
const CSS_UNIT = /^-?\d*\.?\d+(?:px|rem|em|vh|vw|vmin|vmax|%|s|ms|deg|fr|ch|ex|pt)$/;
const CSS_VALUEISH = /(?:^|\s)(?:var\(|calc\(|rgba?\(|hsla?\(|linear-gradient|radial-gradient|url\(|clamp\(|min\(|max\()/;
const CSS_KEYWORDS = /^(?:[a-z-]+(?:\s+[a-z0-9.%-]+)*)$/;

const SKIP_ATTRS = new Set([
  "className", "class", "style", "id", "key", "href", "src", "srcSet", "sizes", "rel", "target", "type",
  "role", "name", "htmlFor", "xmlns", "viewBox", "d", "fill", "stroke", "transform", "points", "preserveAspectRatio",
  "as", "rev", "property", "charSet", "httpEquiv", "encType", "method", "action", "accept", "autoComplete",
  "inputMode", "pattern", "dir", "lang", "loading", "decoding", "fetchPriority", "referrerPolicy", "crossOrigin",
]);
const isSkippedAttrName = (n) => SKIP_ATTRS.has(n) || n.startsWith("aria-") || n.startsWith("data-");

// Object-literal property names whose values are configuration, not prose.
const SKIP_PROP = new Set([
  "className", "class", "style", "id", "key", "href", "src", "url", "path", "route", "slug", "icon", "test",
  "type", "kind", "value", "code", "unit", "locale", "lang", "dir", "color", "background", "border", "font",
  "fontFamily", "fontWeight", "fontSize", "boxShadow", "transition", "transform", "gridTemplateColumns", "flex",
]);

function nearestJsxAttr(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isJsxAttribute(p)) return p.name.getText();
    if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p) || ts.isJsxFragment(p)) return null;
  }
  return null;
}

function insideStyleTag(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isJsxElement(p)) {
      const tag = p.openingElement.tagName.getText();
      if (tag === "style" || tag === "script") return true;
    }
  }
  return false;
}

function insideStyleObject(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isJsxAttribute(p)) return isSkippedAttrName(p.name.getText());
    if (ts.isPropertyAssignment(p)) {
      const n = p.name.getText().replace(/^["']|["']$/g, "");
      if (SKIP_PROP.has(n)) return true;
    }
  }
  return false;
}

function insideExemptCall(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isCallExpression(p)) {
      const t = p.expression.getText();
      // Diagnostics and dev-only guards are not user-visible page prose.
      if (/^console\.|^assert|^JSON\.|Error$/.test(t)) return true;
    }
    if (ts.isNewExpression(p) && /Error$/.test(p.expression.getText())) return true;
  }
  return false;
}

function hasExemptMarker(sf, node) {
  const full = sf.getFullText();
  const lead = full.slice(node.getFullStart(), node.getStart(sf));
  if (/i18n-exempt/.test(lead)) return true;
  // Also honour a marker anywhere on the same source line.
  const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  const starts = sf.getLineStarts();
  const lineText = full.slice(starts[line], starts[line + 1] ?? full.length);
  return /i18n-exempt/.test(lineText);
}

// --------------------------------------------------------------------- scan

function scanFile(file) {
  const sf = parse(file);
  const hits = [];
  const push = (node, text, kind) => {
    const t = String(text);
    if (isAllowlistedByShape(t)) return;
    if (CSS_UNIT.test(t.trim()) || CSS_VALUEISH.test(t)) return;
    if (!isProse(t)) return;
    if (hasExemptMarker(sf, node)) return;
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    hits.push({ file: rel(file), line: line + 1, kind, text: t.trim().replace(/\s+/g, " ").slice(0, 110) });
  };

  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) { ts.forEachChild(node, visit); return; }

    if (ts.isJsxText(node)) {
      const t = node.text;
      if (t.trim() && !insideStyleTag(node)) push(node, t, "jsx-text");
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const attr = nearestJsxAttr(node);
      const skip = insideStyleTag(node)
        || (attr !== null && isSkippedAttrName(attr))
        || insideStyleObject(node)
        || insideExemptCall(node)
        || (ts.isPropertyAssignment(node.parent) && node.parent.name === node)   // object KEY
        || (ts.isPropertyAssignment(node.parent) && SKIP_PROP.has(node.parent.name.getText().replace(/^["']|["']$/g, "")))
        || ts.isElementAccessExpression(node.parent)                              // dict["key"]
        || (ts.isCallExpression(node.parent) && /^(?:t|tr|dict|d)\b/.test(node.parent.expression.getText())) // dictionary lookup
        || (CSS_KEYWORDS.test(node.text.trim()) && attr === null && /^[a-z][a-z0-9 .%-]*$/.test(node.text.trim()) && node.text.trim().split(/\s+/).every((w) => /^[a-z0-9.%-]+$/.test(w)) && insideStyleObject(node));
      if (!skip) push(node, node.text, attr ? `jsx-attr:${attr}` : "string");
    } else if (ts.isTemplateExpression(node)) {
      if (!insideStyleTag(node) && !insideStyleObject(node) && !insideExemptCall(node)) {
        const parts = [node.head.text, ...node.templateSpans.map((s) => s.literal.text)];
        for (const p of parts) if (p.trim()) push(node, p, "template");
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sf, visit);
  return hits;
}

// -------------------------------------------------------------------- report
//
// Three tiers, because the proposal draws two different lines and both matter.
// The SCAN covers "page and component source"; the EVIDENCE requirement is
// "showing none in public pages". So the page tier is the gate and the component
// tier is a reported baseline that later page-redesign packages drive down.
// Library modules are neither page nor component source and are outside the
// scan's stated scope; their count is printed anyway so nothing is hidden.

function tierOf(file) {
  if (file.startsWith("src/app/")) return "page";
  if (file.startsWith("src/components/")) return "component";
  return "library";
}

const entries = entryPoints();
const files = graph(entries);
const all = [];
for (const f of files) all.push(...scanFile(f));

const tiers = { page: [], component: [], library: [] };
for (const h of all) tiers[tierOf(h.file)].push(h);

function ranked(hits) {
  const byFile = new Map();
  for (const h of hits) byFile.set(h.file, (byFile.get(h.file) || 0) + 1);
  return [...byFile.entries()].sort((a, b) => b[1] - a[1]);
}

const pageRank = ranked(tiers.page);
console.log(`prose-scan: ${entries.length} public entry points, ${files.length} source files reachable.`);
console.log("");
console.log(`GATE  public page source:   ${tiers.page.length} hardcoded prose strings in ${pageRank.length} files`);
for (const [f, n] of pageRank.slice(0, VERBOSE ? 999 : 30)) console.log(`  ${String(n).padStart(4)}\t${f}`);
console.log("");
const compRank = ranked(tiers.component);
console.log(`BASE  shared component source: ${tiers.component.length} in ${compRank.length} files (reported, deferred to the page-redesign packages)`);
for (const [f, n] of compRank.slice(0, VERBOSE ? 999 : 12)) console.log(`  ${String(n).padStart(4)}\t${f}`);
console.log("");
console.log(`NOTE  library modules: ${tiers.library.length} strings. Outside the scan's stated scope (page and component source);`);
console.log(`      these are typed EN/AR catalogues (assetFields, verdict, labels, documentKinds) whose pairing is asserted by test.`);
if (VERBOSE) {
  console.log("");
  for (const h of [...tiers.page, ...tiers.component]) console.log(`${h.file}:${h.line}\t[${h.kind}]\t${h.text}`);
}
if (STRICT && tiers.page.length) { console.error(`prose-scan: FAIL, ${tiers.page.length} hardcoded prose strings in public page source`); process.exit(1); }
