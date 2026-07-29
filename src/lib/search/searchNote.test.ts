import { test } from "node:test";
import assert from "node:assert/strict";
import { relaxReason, searchNote, type SearchAnswer } from "@/lib/search/searchNote";

const ARABIC_INDIC = /[٠-٩۰-۹]/;
const LATIN = /[A-Za-z]/;

const answer = (a: Partial<SearchAnswer> = {}): SearchAnswer => ({ clarify: false, relaxed: false, relaxedBy: null, place: null, parsed: null, ...a });

// ---------------------------------------------------------------- finding 56
// An English phrase composed on the server used to be dropped into the middle of
// an Arabic sentence. Each language owns its whole sentence now.

test("the Arabic sentence contains no Latin script, whichever constraint was relaxed", () => {
  const cases: SearchAnswer[] = [
    answer({ relaxed: true, relaxedBy: "budget", parsed: { maxRent: 1600 } }),
    answer({ relaxed: true, relaxedBy: "size" }),
    answer({ relaxed: true, relaxedBy: "place", place: { kind: "city", en: "Riyadh", ar: "الرياض" } }),
    answer({ relaxed: true, relaxedBy: "place", place: { kind: "district", en: "KAFD", ar: "واجهة الرياض المالية" } }),
    answer({ relaxed: true, relaxedBy: null }),
    answer({ clarify: true }),
    answer({}),
  ];
  for (const a of cases) {
    const s = searchNote(a, 6, "ar");
    assert.equal(LATIN.test(s), false, s);
  }
});

test("an Arabic place name is used in Arabic and the English one in English", () => {
  const a = answer({ relaxed: true, relaxedBy: "place", place: { kind: "district", en: "KAFD", ar: "واجهة الرياض المالية" } });
  assert.ok(relaxReason(a, "ar").includes("واجهة الرياض المالية"));
  assert.equal(relaxReason(a, "ar").includes("KAFD"), false);
  assert.ok(relaxReason(a, "en").includes("outside KAFD"));
});

// ---------------------------------------------------------------- finding 55
// The note may name only the place the route says it applied.

test("the note never names a place the route did not apply", () => {
  const a = answer({ relaxed: true, relaxedBy: "place", place: null });
  assert.equal(relaxReason(a, "en"), "outside your filters");
  assert.equal(relaxReason(a, "ar"), "خارج عوامل التصفية");
});

test("a place with an empty name falls back to the generic phrase rather than printing nothing", () => {
  const a = answer({ relaxed: true, relaxedBy: "place", place: { kind: "city", en: "", ar: "" } });
  assert.equal(relaxReason(a, "en"), "outside your filters");
  assert.equal(relaxReason(a, "ar"), "خارج عوامل التصفية");
});

test("a city relaxation names the city, so the live KAFD sentence cannot be produced from a Riyadh search", () => {
  const a = answer({ relaxed: true, relaxedBy: "place", place: { kind: "city", en: "Riyadh", ar: "الرياض" } });
  const en = searchNote(a, 6, "en");
  assert.ok(en.includes("outside Riyadh"));
  assert.equal(en.includes("KAFD"), false);
  assert.ok(searchNote(a, 6, "ar").includes("خارج الرياض"));
});

test("an unknown relaxation reason is stated as unknown, never guessed from the place", () => {
  const a = answer({ relaxed: true, relaxedBy: "size", place: { kind: "city", en: "Riyadh", ar: "الرياض" } });
  assert.equal(relaxReason(a, "en"), "smaller than the size you asked for");
  assert.equal(relaxReason(a, "ar"), "أصغر من المساحة المطلوبة");
});

// ------------------------------------------------------------------- budget

test("a budget cap is rendered with Western numerals and grouping in both languages", () => {
  const a = answer({ relaxed: true, relaxedBy: "budget", parsed: { maxRent: 250000 } });
  assert.ok(relaxReason(a, "en").includes("250,000"));
  const ar = relaxReason(a, "ar");
  assert.ok(ar.includes("250,000"), ar);
  assert.equal(ARABIC_INDIC.test(ar), false, "global law 7: Western numerals in both locales");
});

test("a budget relaxation with no usable cap falls back rather than printing an empty figure", () => {
  for (const parsed of [null, { maxRent: null }, { maxRent: Number.NaN }, { maxRent: Number.POSITIVE_INFINITY }]) {
    const a = answer({ relaxed: true, relaxedBy: "budget", parsed: parsed as SearchAnswer["parsed"] });
    assert.equal(relaxReason(a, "en"), "outside your filters");
    assert.equal(relaxReason(a, "ar"), "خارج عوامل التصفية");
  }
});

// ---------------------------------------------------------------- finding 57
// "6 مطابقة موثّقة" shipped and was photographed live. Every boundary the
// counted-noun formatter has to cross is asserted here, in the sentence people
// actually read, not only in the formatter's own test.

test("Arabic counted-noun agreement holds at 1, 2, 3, 10, 11, 99 and 100 verified matches", () => {
  const a = answer({});
  assert.equal(searchNote(a, 1, "ar").startsWith("مطابقة واحدة موثّقة"), true);
  assert.equal(searchNote(a, 2, "ar").startsWith("مطابقتان موثّقتان"), true);
  assert.equal(searchNote(a, 3, "ar").startsWith("3 مطابقات موثّقة"), true);
  assert.equal(searchNote(a, 10, "ar").startsWith("10 مطابقات موثّقة"), true);
  assert.equal(searchNote(a, 11, "ar").startsWith("11 مطابقة موثّقة"), true);
  assert.equal(searchNote(a, 99, "ar").startsWith("99 مطابقة موثّقة"), true);
  assert.equal(searchNote(a, 100, "ar").startsWith("100 مطابقة موثّقة"), true);
});

test("the defect sentence itself is gone: no count above two is followed by the singular", () => {
  for (const n of [3, 6, 10]) {
    assert.equal(searchNote(answer({}), n, "ar").startsWith(`${n} مطابقة`), false, `${n} still takes the singular`);
  }
});

test("the dual carries no numeral, in the note as well as in the formatter", () => {
  assert.equal(/[0-9]/.test(searchNote(answer({}), 2, "ar")), false);
  assert.equal(/[0-9]/.test(searchNote(answer({}), 1, "ar")), false);
});

test("English pluralises the same phrase", () => {
  assert.ok(searchNote(answer({}), 1, "en").startsWith("1 verified match,"));
  assert.ok(searchNote(answer({}), 2, "en").startsWith("2 verified matches,"));
  assert.ok(searchNote(answer({}), 100, "en").startsWith("100 verified matches,"));
});

test("the relaxed sentence counts results with the oblique dual, because it follows a governing noun", () => {
  const a = answer({ relaxed: true, relaxedBy: "size" });
  assert.ok(searchNote(a, 2, "ar").includes("أقرب نتيجتين"), searchNote(a, 2, "ar"));
  assert.ok(searchNote(a, 6, "ar").includes("أقرب 6 نتائج"), searchNote(a, 6, "ar"));
  assert.ok(searchNote(a, 11, "ar").includes("أقرب 11 نتيجة"), searchNote(a, 11, "ar"));
});

// -------------------------------------------------------------------- shape

test("clarify wins over every other state", () => {
  const a = answer({ clarify: true, relaxed: true, relaxedBy: "place", place: { kind: "city", en: "Riyadh", ar: "الرياض" } });
  assert.equal(searchNote(a, 0, "en").startsWith("Tell me a bit more"), true);
  assert.equal(searchNote(a, 6, "en").startsWith("Tell me a bit more"), true);
  assert.equal(searchNote(a, 6, "en").includes("Riyadh"), false);
});

test("a relaxation that returned nothing reads as an empty result, not as a widened one", () => {
  const a = answer({ relaxed: true, relaxedBy: "place", place: { kind: "city", en: "Riyadh", ar: "الرياض" } });
  assert.ok(searchNote(a, 0, "en").startsWith("No verified matches yet"));
  assert.ok(searchNote(a, 0, "ar").startsWith("لا توجد مطابقات موثّقة لذلك بعد"));
});

test("the sentence counts what the caller renders, not what the server said it found", () => {
  // The count is a parameter for this reason: a note that claims six while three
  // rows are on screen is the same class of untruth as an invented figure.
  assert.ok(searchNote(answer({}), 3, "en").startsWith("3 verified matches"));
});

test("no em dash reaches either sentence", () => {
  for (const locale of ["en", "ar"] as const) {
    for (const n of [0, 1, 2, 6]) {
      for (const a of [answer({}), answer({ clarify: true }), answer({ relaxed: true, relaxedBy: "budget", parsed: { maxRent: 1600 } })]) {
        assert.equal(/[\u2014\u2013]/.test(searchNote(a, n, locale)), false);
      }
    }
  }
});
