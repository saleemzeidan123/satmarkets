import test from "node:test";
import assert from "node:assert/strict";
import { rulesParse, ASSETS } from "./aiParse";

// ADV-3A.1, Codex item 1. "Search must use its deterministic parser."
//
// This parser used to be unreachable. It lived inside `src/app/api/search/route.ts`,
// where a route module may only export HTTP handlers, so nothing could call it,
// and it only ran when a model call failed. Both facts hid the same defect: it
// matched English substrings against a lowercased string, so an Arabic query
// returned every filter null.
//
// With the boundary closed this is the search parser, for everyone. An Arabic
// speaker receiving an unfiltered list with no explanation is not a controlled
// fallback, and calling it one in a closure record would be the exact kind of
// claim ADV-3A.1 exists to correct.

test("an English query yields asset, deal, size and budget", () => {
  const p = rulesParse("I need a 400 sqm office in Al Olaya under 1800 per sqm");
  assert.equal(p.asset, "office");
  assert.equal(p.minSize, 400);
  assert.equal(p.maxRent, 1800);

  const s = rulesParse("warehouse for sale in Sulay");
  assert.equal(s.asset, "warehouse");
  assert.equal(s.deal, "sale");
});

test("an Arabic query yields the same fields", () => {
  const p = rulesParse("مكتب للايجار في العليا");
  assert.equal(p.asset, "office");
  assert.equal(p.deal, "lease");

  const s = rulesParse("مستودع للبيع في السلي");
  assert.equal(s.asset, "warehouse");
  assert.equal(s.deal, "sale");
});

test("Arabic-Indic digits and Arabic units are read as figures", () => {
  const p = rulesParse("عيادة للايجار مساحة ٢٠٠ متر مربع");
  assert.equal(p.asset, "medical");
  assert.equal(p.deal, "lease");
  assert.equal(p.minSize, 200);

  assert.equal(rulesParse("معرض 500 م2").minSize, 500);
  assert.equal(rulesParse("محل تجاري بحد أقصى 250000 ريال").maxRent, 250000);
});

test("a thousands separator does not truncate the figure", () => {
  // The fold that makes Arabic work turns every separator into a space, so
  // "250,000" arrives as "250 000". Read naively that is a budget of 250, which
  // would have silently filtered a quarter-million-riyal search down to nothing.
  assert.equal(rulesParse("shop under SAR 250,000").maxRent, 250000);
  assert.equal(rulesParse("office of 1,200 sqm").minSize, 1200);
  assert.equal(rulesParse("محل بحد أقصى ٢٥٠،٠٠٠ ريال").maxRent, 250000);
});

test("a following number is not absorbed into the figure", () => {
  // The spaced-triple rule is what keeps the separator fix from eating the next
  // number in the sentence.
  assert.equal(rulesParse("office under 1800 2 floors").maxRent, 1800);
});

test("Arabic proclitics do not hide the asset word", () => {
  assert.equal(rulesParse("عروض للمكاتب").asset, "office");
  assert.equal(rulesParse("بالمستودعات في السلي").asset, "warehouse");
});

test("every asset type this endpoint answers about is reachable in both languages", () => {
  const probes: Record<string, [string, string]> = {
    office: ["office space", "مكتب"],
    retail: ["shop", "محل"],
    medical: ["clinic", "عيادة"],
    showroom: ["showroom", "معرض"],
    warehouse: ["warehouse", "مستودع"],
    serviced: ["serviced office", "مكتب مخدوم"],
    education: ["school", "مدرسة"],
    land: ["land", "أرض"],
  };
  for (const a of ASSETS) {
    const [en, ar] = probes[a];
    assert.equal(rulesParse(en).asset, a, `English probe for ${a}`);
    assert.equal(rulesParse(ar).asset, a, `Arabic probe for ${a}`);
  }
});

test("the district is left unresolved rather than guessed", () => {
  // This endpoint does not load the districts vocabulary. Reading a place from a
  // word list here would silently upgrade an unrecognised term into a constraint,
  // which is the law the discovery parser works under and the reason a search for
  // an unknown place returns nothing rather than something nearby.
  assert.equal(rulesParse("office in Al Olaya").district, null);
  assert.equal(rulesParse("مكتب في حي غير معروف").district, null);
});

test("an empty or wordless query yields no constraints and does not throw", () => {
  for (const q of ["", "   ", "???", "أهلاً"]) {
    const p = rulesParse(q);
    assert.equal(p.asset, null);
    assert.equal(p.deal, null);
    assert.equal(p.minSize, null);
    assert.equal(p.maxRent, null);
  }
});
