import { test } from "node:test";
import assert from "node:assert/strict";
import { detectScript, scriptLang, textLangAttrs } from "./textScript";

// RC10, finding 171. The detector decides what `lang` and `dir` a filed
// paragraph is rendered with, so its refusals matter more than its answers: a
// wrong `lang` is read aloud with the wrong phonetics, and a wrong `dir` moves
// text on screen. Every case below that expects null is a case where the
// platform would rather state nothing than state something it did not measure.

test("a paragraph of Arabic prose is Arabic", () => {
  const s = "مكتب مجهّز في برج تجاري على شارع رئيسي، بمساحة مناسبة لفريق صغير.";
  assert.match(s, /[؀-ۿ]/);
  assert.equal(detectScript(s), "arabic");
  assert.deepEqual(textLangAttrs(s), { lang: "ar", dir: "rtl" });
});

test("a paragraph of English prose is Latin", () => {
  const s = "Fitted office floor in a commercial tower on a main road, sized for a small team.";
  assert.equal(detectScript(s), "latin");
  assert.deepEqual(textLangAttrs(s), { lang: "en", dir: "ltr" });
});

test("a run too short to mean anything decides nothing", () => {
  // Seven letters is under the floor, so the majority is not consulted at all.
  assert.equal(detectScript("Riyadh"), null);
  assert.equal(detectScript("الرياض"), null);
  assert.deepEqual(textLangAttrs("Riyadh"), { lang: undefined, dir: "auto" });
});

test("the floor is eight letters, not seven", () => {
  assert.equal(detectScript("abcdefg"), null);
  assert.equal(detectScript("abcdefgh"), "latin");
});

test("genuinely mixed text is not called for either script", () => {
  // Half and half is under the 0.7 share in both directions.
  const s = "مكتب مجهز fitted office";
  assert.match(s, /[؀-ۿ]/);
  assert.equal(detectScript(s), null);
  assert.deepEqual(textLangAttrs(s), { lang: undefined, dir: "auto" });
});

test("an Arabic paragraph carrying an English building name is still Arabic", () => {
  // This is the case that actually occurs, and the one the majority exists for.
  const s = "مكتب مجهّز في برج تجاري على شارع رئيسي، بمساحة مناسبة لفريق صغير، باسم Olaya Tower.";
  assert.equal(detectScript(s), "arabic");
});

test("digits, punctuation and whitespace decide nothing", () => {
  assert.equal(detectScript("1,200 / 3,400 . 5,600 - 7,800"), null);
  assert.equal(detectScript("           "), null);
  assert.equal(detectScript("2026 2027 2028 2029 2030 2031"), null);
});

test("Arabic-Indic digits are not evidence of Arabic", () => {
  // SAT writes Western numerals in both languages, so an Arabic-Indic digit is
  // a defect on some other surface and must not tip this decision.
  assert.equal(detectScript("١٢٣٤٥٦٧٨٩٠ ١٢٣٤٥٦٧٨٩٠"), null);
  assert.equal(detectScript("۱۲۳۴۵۶۷۸۹۰ ۱۲۳۴۵۶۷۸۹۰"), null);
});

test("Arabic presentation forms count as Arabic", () => {
  // Text pasted out of older documents arrives in the presentation blocks.
  assert.equal(detectScript("ﻣﻜﺘﺐ ﻣﺠﻬﺰ ﻓﻲ ﺑﺮﺝ"), "arabic");
});

test("accented Latin counts as Latin", () => {
  assert.equal(detectScript("Café façade récemment rénovée"), "latin");
});

test("nothing at all is nothing", () => {
  assert.equal(detectScript(null), null);
  assert.equal(detectScript(undefined), null);
  assert.equal(detectScript(""), null);
  assert.deepEqual(textLangAttrs(null), { lang: undefined, dir: "auto" });
  assert.deepEqual(textLangAttrs(""), { lang: undefined, dir: "auto" });
});

test("the language step is the only mapping and it is two-valued", () => {
  assert.equal(scriptLang("arabic"), "ar");
  assert.equal(scriptLang("latin"), "en");
  assert.equal(scriptLang(null), null);
});

test("dir is never omitted", () => {
  // A paragraph with no dir inherits the page direction, which is the defect.
  for (const s of ["Fitted office floor on a main road", "مكتب مجهّز على شارع رئيسي", "مكتب fitted", "", null]) {
    const a = textLangAttrs(s);
    assert.ok(a.dir === "rtl" || a.dir === "ltr" || a.dir === "auto");
  }
});
