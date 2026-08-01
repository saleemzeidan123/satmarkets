import fs from "node:fs";
import path from "node:path";

// The automatic Arabic voice gate. Fails the build on robotic constructions,
// calqued marketing idioms, non-Western numerals, forbidden dashes, wrong FAL.
const BANNED = [
  // The imperative starts a word, so the rule has to start at one. Without the left
  // boundary this fired on الرقم بلا and on any other word ending in قم that happens
  // to be followed by a preposition, which is a false accusation of robotic Arabic
  // against ordinary prose, and the only way past it is to write worse Arabic. The
  // optional و and ف are the conjunctions Arabic attaches to the front of the verb
  // itself (وقم بـ), so they stay inside the match rather than defeating it.
  { re: /(?<!\p{L})[وف]?(?:قم|قومي|قوموا|يقوم) ب/gu, why: "qum-bi construction; use the direct verb" },
  { re: /الخاصة? بك/g, why: "analytic possessive; use a pronoun suffix (مساحتك)" },
  { re: /رحلتك|لا تتردد|لا تفوت|عالم من/g, why: "calqued marketing idiom" },
  { re: /[٠-٩]/g, why: "Arabic-Indic numeral; Western numerals only" },
  { re: /[—–]/g, why: "em/en dash forbidden" },
  { re: /03005508/g, why: "wrong FAL number" },
];

const files = [];
const walk = (d) => {
  if (!fs.existsSync(d)) return;
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx|json)$/.test(p)) files.push(p);
  }
};
walk("src/i18n");
walk("src/lib/translate");
// Shipped Arabic copy that lives outside the dictionaries: the label catalogue,
// the unit and plural formatter tables, and the requirement figure grammar. All
// of them render straight into public pages, so all of them must clear the same
// voice gate as src/i18n. `requirementFigures.ts` holds من, إلى and حتى, which
// are the connectives a range is built from rather than copy, which is exactly
// why they live in source and exactly why they still need the gate.
for (const p of ["src/lib/labels.ts", "src/lib/format.ts", "src/lib/search/searchNote.ts", "src/lib/requirementFigures.ts"]) {
  if (fs.existsSync(p)) files.push(p);
}

let bad = 0;
for (const f of files) {
  const t = fs.readFileSync(f, "utf8");
  for (const { re, why } of BANNED) {
    const m = t.match(re);
    if (m) { console.error(`${f}: ${m.length}x ${JSON.stringify(m[0])} -> ${why}`); bad++; }
  }
}

// Project law: no em dash anywhere in shipped copy, not just the dictionaries.
// The narrow walk above misses generated content (legal docs) and inline JSX
// strings, which is how em dashes reached Terms, Privacy and the DRAFT banners.
// The en dash is still allowed outside src/i18n because it is the numeric range
// separator ("1,800-2,900"); only the em dash is swept here.
//
// The sweep matches the character AND the source escape that produces it
// (PKG-1C.1 item 5). A string written as an escape renders an em dash on the
// page while reading as seven ASCII characters in the file, so the old
// character-only sweep would have passed it: an author escaping the character
// was the one case the law could not see. It found one, on the marketing home.
//
// Two positions may legitimately NAME the character rather than print it, and
// only the escape half of the sweep has to make room for them:
//
//   Test files. A test asserting the law has to be able to spell what it
//   forbids, and a test is not shipped copy. The literal-character half still
//   applies to them, which is why they were written as escapes in the first
//   place.
//
//   A sanitizer or detector in shipped source, which must carry an explicit
//   `em-dash-law` marker on the line. The marker is deliberate friction: it is
//   the same shape as the prose scan's i18n-exempt marker, so an exemption is
//   always a visible decision in the diff rather than a silent pass.
const NAMES_THE_CHARACTER = /em-dash-law/;
const all = [];
const walkAll = (d) => {
  if (!fs.existsSync(d)) return;
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walkAll(p);
    else if (/\.(ts|tsx|json)$/.test(p)) all.push(p);
  }
};
walkAll("src");
for (const f of all) {
  const t = fs.readFileSync(f, "utf8");
  const literal = t.match(/\u2014/g);
  if (literal) { console.error(`${f}: ${literal.length}x em dash -> forbidden in shipped copy`); bad++; }
  const isTest = /\.test\.tsx?$/.test(f);
  const escaped = isTest ? null : t.split(/\r?\n/)
    .filter((line) => /\\u\{?0*2014\}?/i.test(line) && !NAMES_THE_CHARACTER.test(line));
  if (escaped && escaped.length) {
    console.error(`${f}: ${escaped.length}x escaped em dash -> forbidden in shipped copy; mark a sanitizer with em-dash-law`);
    bad++;
  }
}

// PKG-FIG1, finding 127. The en dash, scoped to the LANGUAGE rather than to a
// directory.
//
// The narrow walk at the top of this file bans it inside src/i18n, and the em
// dash sweep above deliberately leaves it alone everywhere else, because in
// English it is the correct numeric range separator ("1,800-2,900"). That pair
// of rules assumed Arabic copy lives only in the dictionaries. It does not:
// src/lib/market/verdict.ts built the Arabic verdict sentence
// "النطاق 1,800-2,900" in source, and neither rule could see it, so the
// construction the gate exists to prevent shipped in the one place the gate did
// not look.
//
// The rule therefore follows the Arabic. A quoted string or template chunk that
// carries Arabic script may not also carry an en dash, wherever it is written.
// Arabic takes إلى between two figures, formatRange() in src/lib/format.ts is
// where that is decided for both languages, and a caller spelling it again is
// the defect rather than an alternative.
//
// Two limits, stated rather than implied. A literal that renders INTO Arabic
// without containing any Arabic itself, because its locale arrives as a
// parameter, is invisible to this rule; that is exactly what
// src/lib/rentIndexEvidence.ts was, and it is why the range call sites were
// routed through formatRange() rather than left for the gate to catch. And JSX
// text content is not a string literal, so a dash typed between two elements is
// not seen either.
const ARABIC_SCRIPT = /[\u0600-\u06FF]/;
const EN_DASH = /\u2013/;
const LITERAL = /"[^"\n]*"|'[^'\n]*'|`[^`]*`/g;
for (const f of all) {
  const t = fs.readFileSync(f, "utf8");
  const hits = (t.match(LITERAL) || []).filter((s) => ARABIC_SCRIPT.test(s) && EN_DASH.test(s));
  if (hits.length) {
    console.error(`${f}: ${hits.length}x en dash inside Arabic copy -> Arabic takes the word, not a dash; render the range with formatRange()`);
    bad++;
  }
}

// PKG-FIG2, finding 129. One spelling per unit per language, taken from the
// table rather than restated here.
//
// Findings 120, 124, 128 and 129 were all the same defect arriving again: a
// surface spelling a unit itself. Each was fixed by rewiring the call sites, and
// each time a new spelling appeared somewhere the previous sweep had not looked,
// because nothing stopped one. At the point this rule was written the tree held
// nineteen distinct spellings of units `format.ts` already owns, across four
// parallel unit tables, and one of them was live on the English front door.
//
// So the canonical set is READ FROM `src/lib/format.ts` rather than written out
// below. A hardcoded list here would be a fifth table, and it would be wrong the
// first time UNITS changed.
//
// Scope, stated rather than implied:
//
//   Only separator-joined tokens are checked, a currency followed by `/` or `·`.
//   Prose that names a period in words is not a unit token: "1,200,000 SAR per
//   year as a total" in `decisionPack.ts` is a sentence, and forcing "SAR/yr"
//   into it would make the English worse, not more consistent.
//
//   Comments are stripped first. Half the remaining matches in the tree are
//   comments naming a legacy spelling to explain the defect that removed it,
//   which is exactly the record this project keeps and must not be made
//   unwritable by its own gate.
//
//   `format.ts` itself is exempt: it holds the table and the lowercase alias
//   keys the table resolves. Test files are exempt because a test proving that
//   a legacy spelling still resolves has to be able to spell it, and a test is
//   not shipped copy. Anything else needs an explicit `unit-law` marker on the
//   line, the same visible-in-the-diff friction the em dash rule uses.
const fmtSrc = fs.readFileSync("src/lib/format.ts", "utf8");
const unitsBlock = fmtSrc.slice(fmtSrc.indexOf("export const UNITS = {"), fmtSrc.indexOf("} as const;"));
const CANON_UNITS = new Set([...unitsBlock.matchAll(/(?:long|short): "([^"]+)"/g)].map((m) => m[1]));
if (CANON_UNITS.size < 10) {
  console.error("ar-lint: could not read UNITS out of src/lib/format.ts; the unit rule is aimed at nothing");
  bad++;
}
// A currency, a separator, then an area, a desk or a period. The second
// separator is optional so "SAR/m²" is checked too.
const UNIT_TOKEN = /(?:SAR|ريال)\s*[/·]\s*(?:m²|m2|sqm|م²|desk|مكتب|yr|year|mo|month|سنة|شهر|سنوياً|سنويا)(?:\s*[/·]\s*(?:m²|m2|sqm|م²|desk|مكتب|yr|year|mo|month|سنة|شهر|سنوياً|سنويا))?/g;
// PKG-FIG2 closure. Blanking a comment rather than deleting it, and blanking it
// in place rather than collapsing it, is not tidiness. The `unit-law` exemption
// this gate documents COULD NOT BE USED in a TypeScript file: the marker lives
// in a comment, comments were removed before the marker was looked for, and a
// block comment removed its own newlines on the way out, so every line number
// after it moved. The exemption was reachable only from a `.json` file, which is
// the one kind of file that cannot hold a comment at all. Nothing had used it
// yet, so nothing was wrongly failed; the first line that needed it would have
// been unable to pass. Line for line and column for column, the stripped text
// now lines up with the file it came from.
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
   .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + " ".repeat(m.length - p1.length));
// The marker is read from the ORIGINAL line, because the marker is a comment and
// the text being scanned no longer has any.
const exempt = (rawLines, i) => /unit-law/.test(rawLines[i] ?? "");
for (const f of all) {
  if (f === path.normalize("src/lib/format.ts")) continue;
  if (/\.test\.tsx?$/.test(f)) continue;
  const raw = fs.readFileSync(f, "utf8");
  const body = /\.json$/.test(f) ? raw : stripComments(raw);
  const rawLines = raw.split(/\r?\n/);
  const offenders = [];
  const bodyLines = body.split(/\r?\n/);
  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i];
    if (exempt(rawLines, i)) continue;
    for (const m of line.matchAll(UNIT_TOKEN)) {
      const s = m[0].trim();
      if (!CANON_UNITS.has(s)) offenders.push(s);
    }
  }
  if (offenders.length) {
    const shown = [...new Set(offenders)].map((s) => JSON.stringify(s)).join(", ");
    console.error(`${f}: ${offenders.length}x non-canonical unit ${shown} -> render it with formatUnit() from src/lib/format.ts`);
    bad++;
  }
}

// PKG-FIG2 closure, finding 131. The rule above checks SPELLING. This one checks
// AUTHORSHIP, and it exists because the rule above shipped with a hole its own
// package walked straight through.
//
// The band caption on the front door read "average SAR/m²/yr" out of a frozen
// dictionary string. `SAR/m²/yr` is the canon, so the spelling rule passed it,
// in the same commit that rule was written to end this class. It was found by a
// live sweep instead: five of the six unit occurrences on the deployed page
// carried the word joiner `formatUnit` applies and one did not, because that one
// never went through `formatUnit` at all. A gate that checks how a unit is
// spelled cannot see who spelled it.
//
// The narrow half of that hole is checkable without ambiguity, so it is checked
// here: a literal that carries ARABIC script may not also carry the ENGLISH
// spelling of a unit. `ar.json` held four, "(SAR)" and "(SAR/yr)" inside Arabic
// sentences, while their own on-screen siblings used ريال and ريال/سنة. The
// prototype card held a fifth, "850 m²" on the Arabic listing card, two lines
// below a unit this package had already rewired.
//
// The canonical sets are read from `format.ts` per locale, and a spelling that
// is IDENTICAL in both languages is excluded: `%` is not evidence of anything.
// Tokens shorter than two characters are excluded too, because the English
// metre is `m` and a one-letter match inside Arabic prose would be noise rather
// than a finding; that limit is the reason this rule is narrow and it is stated
// rather than implied.
//
// A literal that must legitimately hold both is a user-input PARSER: the search
// query grammar has to accept `m²` typed on an Arabic keyboard. Those lines
// carry the same `unit-law` marker the spelling rule uses, so the exemption is a
// visible decision in the diff.
const localeUnits = (loc) =>
  new Set([...unitsBlock.matchAll(new RegExp(`${loc}: \\{ long: "([^"]+)", short: "([^"]+)" \\}`, "g"))].flatMap((m) => [m[1], m[2]]));
const EN_UNITS = localeUnits("en");
const AR_UNITS = localeUnits("ar");
const EN_ONLY = [...EN_UNITS].filter((u) => !AR_UNITS.has(u) && u.length >= 2).sort((a, b) => b.length - a.length);
if (EN_ONLY.length < 8) {
  console.error("ar-lint: could not read the per-locale UNITS out of src/lib/format.ts; the authorship rule is aimed at nothing");
  bad++;
}
// A unit is a whole token. The right guard is not a word boundary: `_` is a word
// character, so `SAR` matched inside the identifier `SAR_SQM_YR_AR` and accused
// `decisionPack.ts` three times over of a defect it does not have.
const enUnitIn = (s) => EN_ONLY.filter((u) => new RegExp(`(?<![A-Za-z0-9_])${u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9_])`).test(s));
for (const f of all) {
  if (f === path.normalize("src/lib/format.ts")) continue;
  if (/\.test\.tsx?$/.test(f)) continue;
  const raw = fs.readFileSync(f, "utf8");
  const body = /\.json$/.test(f) ? raw : stripComments(raw);
  const rawLines = raw.split(/\r?\n/);
  const bodyLines = body.split(/\r?\n/);
  const offenders = [];
  for (let i = 0; i < bodyLines.length; i++) {
    if (exempt(rawLines, i)) continue;
    for (const s of bodyLines[i].match(LITERAL) || []) {
      if (!ARABIC_SCRIPT.test(s)) continue;
      offenders.push(...enUnitIn(s));
    }
  }
  if (offenders.length) {
    const shown = [...new Set(offenders)].map((s) => JSON.stringify(s)).join(", ");
    console.error(`${f}: ${offenders.length}x English unit ${shown} inside Arabic copy -> the Arabic reader gets the Arabic spelling; take it from format.ts with a {unit} slot`);
    bad++;
  }
}

if (bad) { console.error(`ar-lint: ${bad} violation groups`); process.exit(1); }
else console.log("ar-lint: clean");
