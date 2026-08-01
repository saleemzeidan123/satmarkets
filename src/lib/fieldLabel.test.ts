import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ASSET_FIELDS } from "./assetFields";
import { resolveUnitKey } from "./format";
import { areaFieldLabel, fieldLabel, fieldUnitText, priceFieldLabel } from "./fieldLabel";

/**
 * PKG-LS2, findings 133 and 134. What a lister is told the number means.
 *
 * Everything else about a figure is guarded downstream: `figureGrammar.test.ts`
 * catches a surface that spells a rendered figure itself, and `format.test.ts`
 * guards the table. Neither can see this defect, because the label on an empty
 * input box is not a figure and the value it collects is a bare number. The
 * unit lives only in the words above the box, and if those words are wrong the
 * stored number is wrong in a way no later gate can detect.
 *
 * So the behavioural half asserts the label, and the source half asserts that
 * no surface builds one itself.
 */

const codeOnly = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const sources = (dir: string): string[] => {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...sources(p));
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
};

// ------------------------------------------------------------ units of measure

test("an Arabic reader is shown the Arabic unit, not the registry string", () => {
  const cases: [string, string, string][] = [
    // unit, English, Arabic
    ["m", "m", "م"],
    ["m²", "m²", "م²"],
    ["kVA", "kVA", "ك.ف.أ"],
    ["t/m²", "t/m²", "طن/م²"],
    ["kN/m²", "kN/m²", "ك.ن/م²"],
    ["L", "L", "لتر"],
    ["SAR/m²/yr", "SAR/m²/yr", "ريال/م²·سنة"],
    ["SAR/m²", "SAR/m²", "ريال/م²"],
    ["SAR", "SAR", "ريال"],
    ["%", "%", "%"],
  ];
  for (const [unit, en, ar] of cases) {
    assert.equal(fieldUnitText(unit, "en"), en, `English unit for ${unit}`);
    assert.equal(fieldUnitText(unit, "ar"), ar, `Arabic unit for ${unit}`);
  }
});

test("months and years are counted nouns, so a label takes the plural and not the English word", () => {
  assert.equal(fieldUnitText("months", "en"), "months");
  assert.equal(fieldUnitText("years", "en"), "years");
  assert.equal(fieldUnitText("months", "ar"), "أشهر");
  assert.equal(fieldUnitText("years", "ar"), "سنوات");
});

test("a field with no unit gets no parentheses", () => {
  assert.equal(fieldUnitText(undefined, "ar"), "");
  assert.equal(fieldUnitText("", "en"), "");
  assert.equal(fieldLabel({ label_en: "Tenant name", label_ar: "اسم المستأجر" }, "ar"), "اسم المستأجر");
  assert.equal(fieldLabel({ label_en: "Tenant name", label_ar: "اسم المستأجر" }, "en"), "Tenant name");
});

test("the label is the base plus the unit, and nothing else", () => {
  const field = { label_en: "Floor plate", label_ar: "مساحة الطابق", unit: "m²" };
  assert.equal(fieldLabel(field, "en"), "Floor plate (m²)");
  assert.equal(fieldLabel(field, "ar").replace(/⁠/g, ""), "مساحة الطابق (م²)");
  // No required marker, no range hint: a caller that wants one appends it.
  assert.ok(!fieldLabel(field, "en").includes("*"));
});

test("every unit the registry declares can be rendered, so none falls through verbatim", () => {
  const declared = new Set<string>();
  for (const fields of Object.values(ASSET_FIELDS)) for (const f of fields) if (f.unit) declared.add(f.unit);
  assert.ok(declared.size > 0, "the registry declares units");
  const nouns = new Set(["months", "years"]);
  const unrenderable = [...declared].filter((u) => !nouns.has(u.toLowerCase()) && resolveUnitKey(u) === null);
  assert.deepEqual(unrenderable, [], "a registry unit that neither resolves nor is a counted noun would print verbatim in Arabic");
});

// -------------------------------------------------------- the platform columns

test("area is labelled with the canonical unit in both languages", () => {
  assert.equal(areaFieldLabel("en").replace(/⁠/g, ""), "Area (m²)");
  assert.equal(areaFieldLabel("ar").replace(/⁠/g, ""), "المساحة (م²)");
  assert.ok(!areaFieldLabel("en").includes("sqm"), "sqm is not a unit this platform shows a reader");
  assert.ok(!areaFieldLabel("ar").includes("متر مربع"), "the Arabic canon is م², spelled once in format.ts");
});

test("the price label carries the unit its deal type gives it, decided by priceUnitKey", () => {
  const plain = (s: string) => s.replace(/⁠/g, "");
  assert.equal(plain(priceFieldLabel("lease", "en")), "Asking rent (SAR/m²/yr)");
  assert.equal(plain(priceFieldLabel("sale", "en")), "Sale price (SAR)");
  assert.equal(plain(priceFieldLabel("lease", "ar")), "الإيجار المطلوب (ريال/م²·سنة)");
  assert.equal(plain(priceFieldLabel("sale", "ar")), "سعر البيع (ريال)");
  // A missing deal type is a lease, the same way every rendering surface reads it.
  assert.equal(plain(priceFieldLabel(null, "en")), plain(priceFieldLabel("lease", "en")));
});

// --------------------------------------------------------------- source guards

test("no surface builds a field label by concatenating the registry unit", () => {
  const offenders: string[] = [];
  for (const file of sources("src")) {
    if (file.endsWith(join("lib", "fieldLabel.ts"))) continue;
    const src = codeOnly(readFileSync(file, "utf8"));
    // `field.unit ? ` (${field.unit})` : ""` and `f.unit ? " (" + f.unit + ")" : ""`
    if (/\.unit\s*\?\s*[`"']\s*\(/.test(src)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], "a registry unit put in parentheses by hand is the Arabic reader seeing kVA and t/m²");
});

test("no intake surface spells the area or price unit by hand", () => {
  const offenders: string[] = [];
  for (const file of ["src/components/ListingStudio.tsx", "src/components/EditListingForm.tsx"]) {
    const src = codeOnly(readFileSync(file, "utf8"));
    if (/\(sqm\)|SAR per sqm|متر مربع/.test(src)) offenders.push(`${file}: hand-spelled unit`);
    // A deal_type comparison on the same line as a currency or area token is a
    // surface deciding the price unit for itself. `priceUnitKey` owns that.
    for (const line of src.split("\n")) {
      if (/deal_type\s*===/.test(line) && /sar|ريال|sqm|m²|م²/i.test(line)) {
        offenders.push(`${file}: decides the price unit inline instead of through priceUnitKey`);
      }
    }
  }
  assert.deepEqual(offenders, [], "the screen that collects a price must agree with the screens that render it");
});
