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

test("Arabic counted-noun agreement holds at 1, 2, 3, 10, 11, 99 and 100 matches", () => {
  const a = answer({});
  assert.equal(searchNote(a, 1, "ar").startsWith("مطابقة واحدة"), true);
  assert.equal(searchNote(a, 2, "ar").startsWith("مطابقتان"), true);
  assert.equal(searchNote(a, 3, "ar").startsWith("3 مطابقات"), true);
  assert.equal(searchNote(a, 10, "ar").startsWith("10 مطابقات"), true);
  assert.equal(searchNote(a, 11, "ar").startsWith("11 مطابقة"), true);
  assert.equal(searchNote(a, 99, "ar").startsWith("99 مطابقة"), true);
  assert.equal(searchNote(a, 100, "ar").startsWith("100 مطابقة"), true);
});

// ------------------------------------------------------------ owner ruling 3
// The head sentence used to read "7 verified matches, owner-verified and
// deduplicated" and, in Arabic, "7 مطابقات موثّقة. التحقق من المالك مباشرة، بلا
// تكرار، مع سند الترخيص". `/api/search` filters on `status = published` and on
// what was asked for, never on `ownership_verified`, so none of the three
// assertions was supported by the query that produced the rows. The count now
// counts matches, and the owner-verified subset is a separate clause that the
// caller has to have counted.

test("the corrected head asserts nothing about the corpus that the search did not select for", () => {
  for (const n of [1, 2, 4, 11]) {
    const en = searchNote(answer({}), n, "en");
    assert.equal(/verified/.test(en), false, en);
    assert.equal(/deduplicated/.test(en), false, en);
    const ar = searchNote(answer({}), n, "ar");
    assert.equal(ar.includes("موثّق"), false, ar);
    assert.equal(ar.includes("سند الترخيص"), false, ar);
    assert.equal(ar.includes("بلا تكرار"), false, ar);
  }
});

test("a caller that has not counted the badge gets no verification clause invented for it", () => {
  assert.equal(searchNote(answer({}), 4, "en"), "4 matches.");
  assert.equal(searchNote(answer({}), 4, "ar"), "4 مطابقات.");
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
    assert.equal(searchNote(answer({}), 4, "en", undefined, bad), "4 matches.", `verified=${String(bad)}`);
    assert.equal(searchNote(answer({}), 4, "ar", undefined, bad), "4 مطابقات.", `verified=${String(bad)}`);
  }
});

test("none verified reads as none, rather than as an absent clause", () => {
  assert.equal(searchNote(answer({}), 4, "en", undefined, 0), "4 matches, none with a verified owner.");
  assert.equal(searchNote(answer({}), 4, "ar", undefined, 0), "4 مطابقات، ولا واحدة بمالك موثّق.");
});

test("a partial verified count is reported as the subset it is, in both languages", () => {
  assert.equal(searchNote(answer({}), 4, "en", undefined, 3), "4 matches, 3 with a verified owner.");
  assert.equal(searchNote(answer({}), 4, "ar", undefined, 3), "4 مطابقات، منها 3 بمالك موثّق.");
  assert.equal(searchNote(answer({}), 1, "en", undefined, 1), "1 match, 1 with a verified owner.");
});

test("the Arabic verification clause is invariant across every count boundary and stays Arabic", () => {
  // The clause is a prepositional phrase and not an adjective on purpose: an
  // adjective agrees with its noun, so a dual count would demand a dual
  // adjective, which is exactly the agreement defect finding 57 was about.
  for (const n of [1, 2, 3, 10, 11, 99, 100]) {
    for (const v of [0, 1, 2, n]) {
      const s = searchNote(answer({}), n, "ar", undefined, v);
      assert.equal(LATIN.test(s), false, s);
      assert.equal(ARABIC_INDIC.test(s), false, s);
      assert.equal(/[\u2014\u2013]/.test(s), false, s);
      assert.ok(s.includes("بمالك موثّق"), s);
    }
  }
});

test("the verification clause counts the rendered rows, so it can never exceed the head count", () => {
  // The hook counts the badge off the rows it slices to, by the same rule
  // finding 65 settled for the total. A clause larger than the head would mean
  // the two numbers were counted from different arrays again.
  const s = searchNote(answer({}), 4, "en", 7, 2);
  assert.ok(s.startsWith("4 matches, 2 with a verified owner."), s);
  assert.ok(s.includes("These are the closest 4 results of 7."), s);
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
  assert.ok(searchNote(answer({}), 1, "en").startsWith("1 match"));
  assert.ok(searchNote(answer({}), 2, "en").startsWith("2 matches"));
  assert.ok(searchNote(answer({}), 100, "en").startsWith("100 matches"));
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
  assert.ok(searchNote(a, 0, "en").startsWith("No matches yet"));
  assert.ok(searchNote(a, 0, "ar").startsWith("لا توجد مطابقات لذلك بعد"));
});

test("the sentence counts what the caller renders, not what the server said it found", () => {
  // The count is a parameter for this reason: a note that claims six while three
  // rows are on screen is the same class of untruth as an invented figure.
  assert.ok(searchNote(answer({}), 3, "en").startsWith("3 matches"));
});

// ---------------------------------------------------------------- finding 65
// Found live on `411f205`, in both languages, on the deployed advisor: the note
// read "7 verified matches" and "7 مطابقات موثّقة" over four rows. The hook
// passed the server total; the page rendered four and the widget three. The
// formatter was right about the number it was handed. These tests fix which
// number that is, and require the other one to be declared rather than dropped.

test("the note counts the rendered rows, never the server total, in both languages", () => {
  const en = searchNote(answer({}), 4, "en", 7);
  assert.ok(en.startsWith("4 matches"), en);
  assert.equal(en.startsWith("7"), false, "the live defect sentence");
  const ar = searchNote(answer({}), 4, "ar", 7);
  assert.ok(ar.startsWith("4 مطابقات"), ar);
  assert.equal(ar.startsWith("7"), false, "the live Arabic defect sentence");
});

test("the withheld rows are declared, not silently dropped", () => {
  // A reader shown four of seven is owed the seven. The alternative, printing
  // only the four, hides that the search matched more than it showed.
  assert.ok(searchNote(answer({}), 4, "en", 7).includes("These are the closest 4 results of 7."));
  assert.ok(searchNote(answer({}), 4, "ar", 7).includes("هذه أقرب 4 نتائج من أصل 7."));
});

test("English does not print the numeral one in front of a singular result", () => {
  // "These are the closest 1 result of 7" is what a formatter writes and nobody
  // says. The count is still one; the sentence just stops counting out loud.
  const s = searchNote(answer({}), 1, "en", 7);
  assert.ok(s.startsWith("1 match."), s);
  assert.ok(s.includes("This is the closest result of 7."), s);
});

test("nothing is declared when nothing is withheld", () => {
  for (const total of [undefined, 4, 3, Number.NaN, Number.POSITIVE_INFINITY]) {
    for (const locale of ["en", "ar"] as const) {
      const s = searchNote(answer({}), 4, locale, total as number | undefined);
      assert.equal(/closest|أقرب/.test(s), false, `total=${String(total)} ${locale}: ${s}`);
      assert.equal(s, searchNote(answer({}), 4, locale), `total=${String(total)} ${locale}`);
    }
  }
});

test("the relaxed sentence carries the total inline rather than appending a second one", () => {
  const a = answer({ relaxed: true, relaxedBy: "size" });
  assert.ok(searchNote(a, 4, "en", 9).includes("here are the closest 4 results of 9, some are"));
  assert.ok(searchNote(a, 4, "ar", 9).includes("أقرب 4 نتائج من أصل 9، بعضها"));
});

test("Arabic agreement still holds at every boundary when the total clause is present", () => {
  // The clause carries a second numeral, and "من أصل" governs a bare one, so the
  // counted noun in front of it must not change its agreement.
  const cases: [number, string, string][] = [
    [1, "مطابقة واحدة.", "هذه أقرب نتيجة واحدة من أصل 400."],
    [2, "مطابقتان.", "هذه أقرب نتيجتين من أصل 400."],
    [3, "3 مطابقات.", "هذه أقرب 3 نتائج من أصل 400."],
    [10, "10 مطابقات.", "هذه أقرب 10 نتائج من أصل 400."],
    [11, "11 مطابقة.", "هذه أقرب 11 نتيجة من أصل 400."],
    [99, "99 مطابقة.", "هذه أقرب 99 نتيجة من أصل 400."],
    [100, "100 مطابقة.", "هذه أقرب 100 نتيجة من أصل 400."],
  ];
  for (const [n, head, tail] of cases) {
    const s = searchNote(answer({}), n, "ar", 400);
    assert.ok(s.startsWith(head), s);
    assert.ok(s.includes(tail), s);
  }
});

test("the total clause introduces no Latin script, no Arabic-Indic numeral and no em dash", () => {
  for (const a of [answer({}), answer({ relaxed: true, relaxedBy: "size" })]) {
    for (const n of [1, 2, 4, 11]) {
      const s = searchNote(a, n, "ar", 400);
      assert.equal(LATIN.test(s), false, s);
      assert.equal(ARABIC_INDIC.test(s), false, s);
      assert.equal(/[\u2014\u2013]/.test(s), false, s);
      assert.equal(/[\u2014\u2013]/.test(searchNote(a, n, "en", 400)), false);
    }
  }
});

test("a total is never printed when the caller rendered nothing, or when the answer asks for more detail", () => {
  assert.ok(searchNote(answer({}), 0, "en", 7).startsWith("No matches yet"));
  assert.equal(searchNote(answer({}), 0, "en", 7).includes("7"), false);
  assert.equal(searchNote(answer({ clarify: true }), 0, "ar", 7).includes("7"), false);
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
