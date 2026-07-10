import fs from "node:fs";
import path from "node:path";

// The automatic Arabic voice gate. Fails the build on robotic constructions,
// calqued marketing idioms, non-Western numerals, forbidden dashes, wrong FAL.
const BANNED = [
  { re: /قم ب|قومي ب|قوموا ب|يقوم ب/g, why: "qum-bi construction; use the direct verb" },
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
if (fs.existsSync("src/lib/labels.ts")) files.push("src/lib/labels.ts");

let bad = 0;
for (const f of files) {
  const t = fs.readFileSync(f, "utf8");
  for (const { re, why } of BANNED) {
    const m = t.match(re);
    if (m) { console.error(`${f}: ${m.length}x ${JSON.stringify(m[0])} -> ${why}`); bad++; }
  }
}
if (bad) { console.error(`ar-lint: ${bad} violation groups`); process.exit(1); }
else console.log("ar-lint: clean");
