import { test } from "node:test";
import assert from "node:assert/strict";
import { buildValueEvidence, detectRequestedSegment, renderValue, type RowLike } from "./valueEvidence";

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

// Rent figures (>=100) in a rendered string, with the period removed so its year is
// not mistaken for a rent figure.
function rentFigures(text: string, period: string): string[] {
  const cleaned = text.split(period).join(" ");
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
  assert.ok(/covers all/i.test(en), en);
  assert.ok(/لا يمكنني تقديمه كنطاق/.test(ar), ar);
  assert.ok(/يغطي جميع/.test(ar), ar);
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
