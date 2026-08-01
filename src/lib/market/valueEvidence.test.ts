import { test } from "node:test";
import assert from "node:assert/strict";
import { arPeriodPhrase, buildValueEvidence, detectRequestedSegment, displayPeriod, renderValue, type RowLike } from "./valueEvidence";
import { formatPeriod } from "./period";

// The real Al Olaya all-office row (the exact P0 case Codex retested).
const AL_OLAYA_OFFICE: RowLike = {
  id: "f134bc64-3729-43fb-b85d-01fbf2ecefc2",
  district_label: "Al Olaya, Riyadh",
  district_label_ar: "العليا",
  district_id: "d2222222-2222-2222-2222-222222222222",
  asset_type: "office",
  segment: "all",
  unit: "SAR/m2/yr",
  band_low: "1250.04",
  band_high: "1590.96",
  median: "1420.50",
  period: "2026-Q2",
  source: "REGA Rental Index (Ejar)",
};

// Rent figures (>=100) in a rendered string, with every rendered form of the period
// removed so its year is not mistaken for a rent figure. Periods now render through
// formatPeriod ("Q2 2026" / "الربع الثاني 2026"), so stripping only the raw storage
// form "2026-Q2" would leave a bare "2026" behind and count it as a rent.
function rentFigures(text: string, period: string): string[] {
  let cleaned = text;
  for (const form of [period, formatPeriod(period, false), formatPeriod(period, true), arPeriodPhrase(period)]) {
    cleaned = cleaned.split(form).join(" ");
  }
  return (cleaned.match(/\d[\d,]*(?:\.\d+)?/g) || []).filter((t) => {
    const n = Number(t.replace(/,/g, ""));
    return Number.isFinite(n) && n >= 100;
  });
}

test("detectRequestedSegment finds Grade A in EN and AR, null when general", () => {
  assert.equal(detectRequestedSegment("Price a Grade A office in Al Olaya")?.key, "grade_a");
  assert.equal(detectRequestedSegment("سعّر مكتب فئة A في العليا")?.key, "grade_a");
  assert.equal(detectRequestedSegment("What's within band in KAFD?"), null);
});

test("a general-office band cannot become a Grade A band (EN and AR)", () => {
  const req = detectRequestedSegment("Price a Grade A office in Al Olaya");
  const ev = buildValueEvidence(AL_OLAYA_OFFICE, req, null);
  assert.ok(ev);
  assert.equal(ev!.supportStatus, "segment_mismatch");
  assert.equal(ev!.supportedSegment, "all");
  assert.equal(ev!.requestedSegment, "grade_a");
  const en = renderValue(ev!, "en");
  const ar = renderValue(ev!, "ar");
  // Neither language may present the figures AS a Grade A band.
  assert.ok(/cannot present it as a Grade A band/i.test(en), en);
  assert.ok(/covers the whole segment, not a single grade/i.test(en), en);
  assert.ok(/لا يمكنني تقديمه كنطاق/.test(ar), ar);
  assert.ok(/يغطي النطاق المنشور قطاع المكاتب ككل/.test(ar), ar);
});

test("EN and AR expose the same numeric set from the same evidence", () => {
  const ev = buildValueEvidence(AL_OLAYA_OFFICE, detectRequestedSegment("Grade A office Al Olaya"), null)!;
  const en = new Set(rentFigures(renderValue(ev, "en"), ev.period));
  const ar = new Set(rentFigures(renderValue(ev, "ar"), ev.period));
  assert.deepEqual([...en].sort(), [...ar].sort());
  // and that set is exactly the evidence band figures.
  assert.deepEqual([...en].sort(), ["1,250.04", "1,420.5", "1,590.96"].sort());
});

test("EN and AR share evidence id and supported scope (one structured result)", () => {
  const ev = buildValueEvidence(AL_OLAYA_OFFICE, null, null)!;
  // Both renderers consume this same object; identity of scope is structural.
  assert.equal(ev.evidenceId, AL_OLAYA_OFFICE.id);
  assert.equal(ev.assetType, "office");
  assert.equal(ev.supportedSegment, "all");
});

test("every rent figure in output comes from evidence or user input", () => {
  const ev = buildValueEvidence(AL_OLAYA_OFFICE, null, 1600)!;
  const allowed = new Set(["1,250.04", "1,420.5", "1,590.96", "1,600"]);
  for (const loc of ["en", "ar"] as const) {
    for (const f of rentFigures(renderValue(ev, loc), ev.period)) {
      assert.ok(allowed.has(f), `unexpected figure ${f} in ${loc}: ${renderValue(ev, loc)}`);
    }
  }
});

test("a missing user price never becomes a user quotation", () => {
  const ev = buildValueEvidence(AL_OLAYA_OFFICE, null, null)!;
  const en = renderValue(ev, "en");
  const ar = renderValue(ev, "ar");
  assert.ok(!/your figure/i.test(en), en);
  assert.ok(!/رقمك/.test(ar), ar);
});

test("a supplied user price is compared, identically in both languages", () => {
  const ev = buildValueEvidence(AL_OLAYA_OFFICE, null, 1600)!;
  assert.ok(/above the band/i.test(renderValue(ev, "en")));
  assert.ok(/أعلى من النطاق/.test(renderValue(ev, "ar")));
});

test("unsupported evidence produces the same limitation in both languages", () => {
  const ev = buildValueEvidence(AL_OLAYA_OFFICE, detectRequestedSegment("class A office Al Olaya"), null)!;
  assert.equal(ev.limitationReason, "requested_segment_not_in_index");
  // Both carry the same machine limitation, and both surface it in prose.
  assert.ok(/cannot present it as/i.test(renderValue(ev, "en")));
  assert.ok(/لا يمكنني تقديمه كنطاق/.test(renderValue(ev, "ar")));
});

test("Arabic location names are localized, English is not leaked", () => {
  const ev = buildValueEvidence(AL_OLAYA_OFFICE, null, null)!;
  const ar = renderValue(ev, "ar");
  assert.ok(ar.includes("العليا"), ar);
  assert.ok(!/Al Olaya/i.test(ar), ar);
  assert.ok(renderValue(ev, "en").includes("Al Olaya, Riyadh"));
});

test("Western numerals remain in Arabic output", () => {
  const ev = buildValueEvidence(AL_OLAYA_OFFICE, detectRequestedSegment("فئة A"), 1600)!;
  const ar = renderValue(ev, "ar");
  assert.ok(!/[٠-٩۰-۹]/.test(ar), `Arabic-Indic digits found: ${ar}`);
  assert.ok(/1,420\.5/.test(ar), ar);
});

test("no em dash in rendered output (global law)", () => {
  const ev = buildValueEvidence(AL_OLAYA_OFFICE, detectRequestedSegment("Grade A"), 1600)!;
  for (const loc of ["en", "ar"] as const) assert.ok(!/\u2014/.test(renderValue(ev, loc)));
});

// ===== PKG-1B.2 (Codex items 3, 4 and 5) =====

test("Codex 4: Arabic grade letters are normalized to the Latin grades", () => {
  for (const q of ["سعّر مكتب فئة أ في العليا", "سعّر مكتب فئة إ في العليا", "سعّر مكتب فئة آ في العليا", "سعّر مكتب فئة ا في العليا"]) {
    assert.equal(detectRequestedSegment(q)?.key, "grade_a", q);
  }
  assert.equal(detectRequestedSegment("مكتب فئة ب في العليا")?.key, "grade_b");
  assert.equal(detectRequestedSegment("مكتب فئة ج في العليا")?.key, "grade_c");
  assert.equal(detectRequestedSegment("مكتب فئة أ+ في العليا")?.key, "grade_a_plus");
  // A general Arabic question must still be general.
  assert.equal(detectRequestedSegment("ما نطاق المكاتب في العليا؟"), null);
});

test("Codex 4: the Arabic grade request carries the SAME scope limitation as English", () => {
  const arReq = detectRequestedSegment("سعّر مكتب فئة أ في العليا");
  const enReq = detectRequestedSegment("Price a Grade A office in Al Olaya");
  assert.equal(arReq?.key, enReq?.key);
  const ev = buildValueEvidence(AL_OLAYA_OFFICE, arReq, null)!;
  assert.equal(ev.supportStatus, "segment_mismatch");
  const ar = renderValue(ev, "ar");
  assert.ok(/لا يمكنني تقديمه كنطاق/.test(ar), ar);
  assert.ok(/فئة A/.test(ar), ar);
});

test("Codex 5: no raw storage period reaches the reader, in either language", () => {
  const ev = buildValueEvidence(AL_OLAYA_OFFICE, null, null)!;
  for (const loc of ["en", "ar"] as const) {
    const out = renderValue(ev, loc);
    assert.ok(!out.includes("2026-Q2"), `raw period leaked in ${loc}: ${out}`);
  }
  assert.ok(renderValue(ev, "en").includes("Q2 2026"));
  assert.ok(renderValue(ev, "ar").includes("الربع الثاني من عام 2026"));
  // A year-only request has no quarter and renders as the plain year.
  assert.equal(displayPeriod("2025", false), "2025");
  assert.equal(displayPeriod("2025", true), "2025");
});

test("Codex 3: an unavailable period is stated, not silently substituted", () => {
  const ev = buildValueEvidence(AL_OLAYA_OFFICE, null, null, { requested: "2025", status: "unavailable" })!;
  assert.equal(ev.requestedPeriod, "2025");
  assert.equal(ev.periodStatus, "unavailable");
  const en = renderValue(ev, "en");
  assert.ok(/does not publish .* for 2025/i.test(en), en);
  assert.ok(/newest published period is Q2 2026/i.test(en), en);
  assert.ok(/not an answer for 2025/i.test(en), en);
  const ar = renderValue(ev, "ar");
  assert.ok(ar.includes("لعام 2025"), ar);
  assert.ok(ar.includes("أحدث فترة منشورة هي الربع الثاني من عام 2026"), ar);
  // The 2025 in the question is never rendered as the user's rent.
  assert.ok(!/Your figure/i.test(en), en);
  assert.ok(!/رقمك/.test(ar), ar);
});

test("Codex 3: a period that IS available is answered without the caveat", () => {
  const ev = buildValueEvidence(AL_OLAYA_OFFICE, null, null, { requested: "2026-Q2", status: "match" })!;
  const en = renderValue(ev, "en");
  assert.ok(!/does not publish/i.test(en), en);
  assert.ok(en.includes("Q2 2026"), en);
});

test("Codex 1 and 2: a year question produces no user figure in either language", () => {
  // The route hands renderValue whatever readNumericIntent found; for a year question
  // that is null, and null must never become a quotation.
  const ev = buildValueEvidence(AL_OLAYA_OFFICE, null, null, { requested: "2026", status: "unavailable" })!;
  const en = renderValue(ev, "en");
  const ar = renderValue(ev, "ar");
  assert.ok(!/2,026/.test(en), en);
  assert.ok(!/2,026/.test(ar), ar);
  assert.ok(!/sits (above|below|within) the band/i.test(en), en);
  assert.ok(!/رقمك/.test(ar), ar);
});

// ===== Codex closure patch (27 July): Arabic surface grammar =====
// The strings below were correct data and wrong Arabic: a one-letter preposition
// glued to a bare noun ("بـفئة A", "لـمكاتب") and a quarter apposed to "الفترة"
// ("للفترة الربع الثاني 2026"). They are now grammar, not concatenation.

test("Codex closure: no detached prefix and no apposed period in the Arabic answer", () => {
  const cases = [
    buildValueEvidence(AL_OLAYA_OFFICE, null, null)!,
    buildValueEvidence(AL_OLAYA_OFFICE, detectRequestedSegment("فئة A"), 1600)!,
    buildValueEvidence(AL_OLAYA_OFFICE, null, null, { requested: "2025", status: "unavailable" })!,
    buildValueEvidence(AL_OLAYA_OFFICE, null, null, { requested: "2025-Q3", status: "unavailable" })!,
  ];
  for (const ev of cases) {
    const ar = renderValue(ev, "ar");
    assert.ok(!ar.includes("بـ"), ar);
    assert.ok(!ar.includes("لـ"), ar);
    assert.ok(!ar.includes("للفترة"), ar);
    assert.ok(!/[٠-٩۰-۹]/.test(ar), ar);
  }
  const general = renderValue(cases[0], "ar");
  assert.ok(general.startsWith("يتراوح نطاق مؤشر الإيجارات للمكاتب في العليا"), general);
  assert.ok(general.includes("في الربع الثاني من عام 2026"), general);
  const mismatch = renderValue(cases[1], "ar");
  assert.ok(mismatch.includes("نطاقاً خاصاً بالفئة A"), mismatch);
  assert.ok(mismatch.includes("يغطي النطاق المنشور قطاع المكاتب ككل"), mismatch);
  assert.ok(renderValue(cases[2], "ar").includes("لعام 2025"), renderValue(cases[2], "ar"));
  assert.ok(renderValue(cases[3], "ar").includes("للربع الثالث من عام 2025"), renderValue(cases[3], "ar"));
});

test("Codex closure: the Arabic unit cannot break after the slash", () => {
  const ev = buildValueEvidence(AL_OLAYA_OFFICE, null, null)!;
  const ar = renderValue(ev, "ar");
  assert.ok(ar.includes("ريال⁠/⁠م²⁠·⁠سنة"), JSON.stringify(ar));
  // The joiner is invisible: strip it and the unit reads exactly as written.
  assert.ok(ar.replace(/⁠/g, "").includes("ريال/م²·سنة"));

  // PKG-FIG2, finding 129. This line used to assert that English carried no
  // joiner at all, and that was the local rule of one file rather than the
  // platform's. `formatUnit` in src/lib/format.ts has always joined both
  // languages, and every other surface that renders a unit goes through it, so
  // "English is untouched" held only here, inside the private copy of joinUnit
  // this file used to keep. English breaks after its slash at 320px for exactly
  // the reason Arabic did.
  //
  // The property that matters is the one asserted below: the joiner is
  // invisible, so what a reader sees is unchanged and what a narrow column can
  // break is.
  const en = renderValue(ev, "en");
  assert.ok(en.includes("SAR⁠/⁠m²⁠/⁠year"), JSON.stringify(en));
  assert.ok(en.replace(/⁠/g, "").includes("SAR/m²/year"));
});

test("Codex closure: an Arabic period phrase never leaks the raw storage form", () => {
  assert.equal(arPeriodPhrase("2026-Q2"), "الربع الثاني من عام 2026");
  assert.equal(arPeriodPhrase("2025"), "عام 2025");
  assert.equal(arPeriodPhrase("2025-Q3"), "الربع الثالث من عام 2025");
  assert.equal(arPeriodPhrase(null), "");
});
