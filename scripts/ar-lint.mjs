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
// Shipped Arabic copy that lives outside the dictionaries: the label catalogue
// and the unit and plural formatter tables. Both render straight into public
// pages, so both must clear the same voice gate as src/i18n.
for (const p of ["src/lib/labels.ts", "src/lib/format.ts", "src/lib/search/searchNote.ts"]) {
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

if (bad) { console.error(`ar-lint: ${bad} violation groups`); process.exit(1); }
else console.log("ar-lint: clean");
