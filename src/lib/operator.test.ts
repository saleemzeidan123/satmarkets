// PKG-SEPARABILITY-1. The separation drill.
//
// The platform is operated today by one company under one licence, and the
// owner's standing rule is that it must stay cheap to hand to another operator
// later. "Cheap" is only true while something checks it, so this file is that
// check, run on every gate:
//
//   1. The configured operator is all-or-nothing and validated.
//   2. Rebranding both dictionaries for a second, test-only operator leaves no
//      trace of the default operator behind.
//   3. No source file writes the default operator's name, licence number or
//      website outside a `rebrand` / `rebrandDeep` call. Checked with the
//      TypeScript parser, by syntactic position, the way the prose scan works:
//      a comment may say anything, a string a reader could be shown may not.
//   4. What the drill cannot move is named and pinned, so it can shrink but not
//      grow unnoticed.
//
// The drill operator's values are deliberately unusable (`.invalid` is a
// reserved top-level domain) and exist only in this file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { DEFAULT_OPERATOR, OPERATOR, readOperator, rebrand, rebrandDeep, type Operator } from "./operator";
import en from "../i18n/dictionaries/en.json";
import ar from "../i18n/dictionaries/ar.json";

const DRILL: Operator = {
  nameEn: "Drill Operator Company",
  nameAr: "شركة التمرين التشغيلية",
  licence: "9999999999",
  url: "https://operator.invalid",
};

/** Every form in which the default operator's identity can appear in text. */
const TRACES: [string, RegExp][] = [
  ["the English name", /SAT Real Estate/i],
  ["the Arabic name", /سات العقارية/],
  ["the licence number", /1200025510/],
  ["the operator's website", /satestate\.com/i],
];
const tracesIn = (text: string) => TRACES.filter(([, re]) => re.test(text)).map(([label]) => label);

test("law: the default operator is SAT Real Estate under FAL 1200025510", () => {
  assert.equal(DEFAULT_OPERATOR.nameEn, "SAT Real Estate");
  assert.equal(DEFAULT_OPERATOR.nameAr, "سات العقارية");
  assert.equal(DEFAULT_OPERATOR.licence, "1200025510");
  assert.equal(DEFAULT_OPERATOR.url, "https://www.satestate.com");
});

test("with nothing configured, the operator is the default and rebranding changes nothing", () => {
  assert.equal(readOperator({}), DEFAULT_OPERATOR);
  assert.equal(readOperator({ nameEn: " ", nameAr: "", licence: undefined, url: "" }), DEFAULT_OPERATOR);
  assert.equal(OPERATOR, DEFAULT_OPERATOR, "the gate must run with no operator override in its environment");
  const text = "SAT Real Estate, FAL 1200025510, https://www.satestate.com";
  assert.equal(rebrand(text), text);
  assert.equal(rebrandDeep(en), en, "with the default operator the dictionary object itself is handed back, not a copy");
});

test("a partial operator configuration is refused, never blended with the default", () => {
  const full = { nameEn: DRILL.nameEn, nameAr: DRILL.nameAr, licence: DRILL.licence, url: DRILL.url };
  assert.deepEqual(readOperator(full), DRILL);
  for (const missing of ["nameEn", "nameAr", "licence", "url"] as const) {
    assert.throws(() => readOperator({ ...full, [missing]: undefined }), /partial/, `a configuration without ${missing} must be refused`);
  }
  assert.throws(() => readOperator({ ...full, licence: "12345" }), /ten digits/);
  assert.throws(() => readOperator({ ...full, url: "http://operator.invalid" }), /https origin/);
  assert.throws(() => readOperator({ ...full, url: "https://operator.invalid/about" }), /https origin/);
});

test("rebrand rewrites every form of the default operator's identity", () => {
  assert.equal(
    rebrand("SAT Real Estate · SAT REAL ESTATE FAL 1200025510 · sat real estate · سات العقارية · https://www.satestate.com · satestate.com", DRILL),
    "Drill Operator Company · DRILL OPERATOR COMPANY FAL 9999999999 · drill operator company · شركة التمرين التشغيلية · https://operator.invalid · operator.invalid",
  );
  assert.equal(rebrand("SAT Markets", DRILL), "SAT Markets", "the platform's own name is not the operator's and must survive");
  const table = rebrandDeep({ "About SAT Real Estate": "/about", nested: [{ x: "FAL 1200025510" }], n: 3, d: null }, DRILL);
  assert.deepEqual(table, { "About Drill Operator Company": "/about", nested: [{ x: "FAL 9999999999" }], n: 3, d: null });
});

test("separation drill: both dictionaries, rebranded for a second operator, carry no trace of the default one", () => {
  for (const [name, dict] of [["en", en], ["ar", ar]] as const) {
    const before = JSON.stringify(dict);
    assert.ok(tracesIn(before).length > 0, `${name}.json no longer names the default operator; this drill is no longer testing anything`);
    const after = JSON.stringify(rebrandDeep(dict, DRILL));
    assert.deepEqual(tracesIn(after), [], `${name}.json still carries the default operator after rebranding`);
    const count = (s: string, re: RegExp) => (s.match(new RegExp(re.source, "g")) ?? []).length;
    assert.equal(count(after, /9999999999/), count(before, /1200025510/), `${name}.json: every licence number must have moved, one for one`);
  }
});

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

/** True when `node` sits inside a call to `rebrand(...)` or `rebrandDeep(...)`. */
function insideRebrand(node: ts.Node): boolean {
  for (let n: ts.Node | undefined = node.parent; n; n = n.parent) {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && (n.expression.text === "rebrand" || n.expression.text === "rebrandDeep")) return true;
  }
  return false;
}

test("separation drill: no source file names the default operator outside a rebrand call", () => {
  const offenders: string[] = [];
  let wrapped = 0;
  for (const file of sourceFiles("src")) {
    const rel = relative(".", file).split("\\").join("/");
    if (rel === "src/lib/operator.ts") continue; // the one place the default operator is defined
    const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (node: ts.Node) => {
      const isText = ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node);
      if (isText) {
        const found = tracesIn(node.text);
        if (found.length > 0) {
          if (insideRebrand(node)) wrapped++;
          else offenders.push(`${rel}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1} states ${found.join(" and ")}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  assert.deepEqual(offenders, [], "these strings name the default operator directly; wrap them in rebrand(...) or rebrandDeep(...), or read the value from OPERATOR");
  assert.ok(wrapped > 0, "no wrapped operator string was found at all; the audit is not looking at the real source tree");
});

// What the drill cannot move. Each entry is a real cost on separation day, named
// here so that it is a known list and not a surprise.
test("separation drill: the residue is named and pinned", () => {
  // 1. A static file. It is served as written and cannot pass through rebrand.
  //    On separation it is rewritten by hand (docs/separation-runbook.md).
  const llms = readFileSync("public/llms.txt", "utf8");
  assert.deepEqual(tracesIn(llms), ["the English name", "the licence number"], "public/llms.txt changed what it says about the operator; update the runbook and this pin together");

  // 2. The operator called "SAT" for short. `rebrand` deliberately leaves the
  //    bare word alone, because the platform's own name starts with it. These
  //    sentences have to be reworded by a person. The counts may fall. A rise
  //    means new copy leaned on the short form and added to the separation bill.
  const shortEn = (JSON.stringify(en).match(/\bSAT\b(?!\s+(?:Markets|MARKETS|Real Estate|REAL ESTATE))/g) ?? []).length;
  // Arabic: the standalone word, with an optional one-letter prefix, and the
  // Latin "SAT" where Arabic copy keeps it. The lookarounds keep words that
  // merely contain the same three letters (مؤسسات, دراسات) out of the count.
  const arText = JSON.stringify(ar);
  const shortAr =
    (arText.match(/(?<![\u0600-\u06FF])[ولبفك]?سات(?![\u0600-\u06FF])(?!\s+(?:ماركتس|العقارية))/g) ?? []).length +
    (arText.match(/\bSAT\b(?!\s+(?:Markets|MARKETS|Real Estate|REAL ESTATE))/g) ?? []).length;
  assert.ok(shortEn <= SHORT_FORM_EN, `en.json uses the bare word SAT ${shortEn} times, up from the pinned ${SHORT_FORM_EN}`);
  assert.ok(shortAr <= SHORT_FORM_AR, `ar.json uses the bare word سات ${shortAr} times, up from the pinned ${SHORT_FORM_AR}`);
});
const SHORT_FORM_EN = 50;
const SHORT_FORM_AR = 50;
