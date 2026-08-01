import { test } from "node:test";
import assert from "node:assert";
import { formatFieldValue, spaceAttributeRows, complianceRows } from "./attributeDisplay";
import { fieldsFor, type AssetField } from "./assetFields";

const field = (over: Partial<AssetField>): AssetField => ({
  key: "k", label_en: "K", label_ar: "ك", type: "number", section: "space", provenance: "entered", ...over,
});

test("empty, null, and false values do not render", () => {
  assert.equal(formatFieldValue(field({ type: "number" }), null, false), null);
  assert.equal(formatFieldValue(field({ type: "number" }), undefined, false), null);
  assert.equal(formatFieldValue(field({ type: "text" }), "", false), null);
  assert.equal(formatFieldValue(field({ type: "boolean" }), false, false), null);
});

/** U+2060 WORD JOINER, which format.ts puts either side of a unit separator. */
const visible = (s: string | null): string => (s ?? "").replace(/⁠/g, "");

test("numbers render with their unit, localised", () => {
  // PKG-FIG2, finding 129. The two money lines below used to expect
  // "SAR/m²·yr" in English, because this file rendered units from its own
  // six-entry map rather than from format.ts. The canonical English spelling is
  // "SAR/m²/yr"; the middle dot is Arabic's separator and, in English, doubles
  // as the LIST separator in the same strings ("3,700 SAR/m²·yr · 1,200 m²"),
  // which is why the canon does not use it there.
  //
  // The legacy spelling is still asserted, one line down, because it is still
  // what some stored rows hold: it must resolve to the canon rather than pass
  // through. Spelling it here is allowed; ar-lint's unit rule exempts test
  // files for exactly this reason.
  assert.equal(visible(formatFieldValue(field({ type: "number", unit: "m" }), 4.5, false)), "4.5 m");
  assert.equal(visible(formatFieldValue(field({ type: "number", unit: "m" }), 4.5, true)), "4.5 م");
  assert.equal(visible(formatFieldValue(field({ type: "money", unit: "SAR/m²/yr" }), 1500, false)), "1,500 SAR/m²/yr");
  assert.equal(visible(formatFieldValue(field({ type: "money", unit: "SAR/m²/yr" }), 1500, true)), "1,500 ريال/م²·سنة");
  assert.equal(visible(formatFieldValue(field({ type: "money", unit: "SAR/m²·yr" }), 1500, false)), "1,500 SAR/m²/yr");
});

// PKG-FIG2, finding 129. The registry stores sixteen fields in metres, more than
// it stores in any other unit, and this file's private map did not list "m". A
// unit the map did not list fell through to the English spelling, so every one
// of those sixteen fields printed a Latin "m" on an Arabic page. Nothing raised
// an error, because a passthrough is not a failure.
test("every unit the asset field registry stores renders in Arabic script in Arabic", () => {
  const stored = ["m", "m²", "SAR/m²/yr", "SAR/m²", "SAR", "kVA", "t/m²", "kN/m²", "L"];
  for (const unit of stored) {
    const ar = visible(formatFieldValue(field({ type: "number", unit }), 12, true));
    assert.ok(ar !== null, unit);
    assert.ok(!/[A-Za-z]/.test(ar), `${unit} left Latin script in the Arabic rendering: ${ar}`);
  }
  // The shipped map, quoted, so this guard fails against the code it replaced.
  const shipped: Record<string, string> = { "m²": "م²", "SAR": "ريال", "SAR/m²": "ريال/م²", "SAR/m²/yr": "ريال/م²·سنة", "kVA": "ك.ف.أ", "t/m²": "طن/م²" };
  assert.equal(shipped["m"] ?? "m", "m");
  assert.equal(shipped["kN/m²"] ?? "kN/m²", "kN/m²");
  assert.equal(shipped["L"] ?? "L", "L");
});

// ADV-3A.1, finding 52. A month and a year are counted nouns. Nineteen registry
// fields carry one of these two units, and the counts they hold (a deposit, a
// rent free period, a minimum term, a ground lease remainder) sit exactly where
// Arabic changes form. The old code appended a fixed word, so English produced
// "1 months" and Arabic produced the 11-to-99 form for every count.
test("a months or years field is counted, not suffixed, at every boundary", () => {
  const months = (n: number, ar: boolean) => formatFieldValue(field({ type: "integer", unit: "months" }), n, ar);
  const years = (n: number, ar: boolean) => formatFieldValue(field({ type: "integer", unit: "years" }), n, ar);

  assert.deepEqual(
    [1, 2, 3, 10, 11, 99, 100].map((n) => months(n, true)),
    ["شهر واحد", "شهران", "3 أشهر", "10 أشهر", "11 شهراً", "99 شهراً", "100 شهر"]
  );
  assert.deepEqual(
    [1, 2, 3, 10, 11, 99, 100].map((n) => years(n, true)),
    ["سنة واحدة", "سنتان", "3 سنوات", "10 سنوات", "11 سنة", "99 سنة", "100 سنة"]
  );

  assert.equal(months(1, false), "1 month", "one month is not months");
  assert.equal(months(6, false), "6 months");
  assert.equal(years(1, false), "1 year");
  assert.equal(years(5, false), "5 years");
});

test("true boolean renders Yes / نعم", () => {
  assert.equal(formatFieldValue(field({ type: "boolean" }), true, false), "Yes");
  assert.equal(formatFieldValue(field({ type: "boolean" }), true, true), "نعم");
});

test("enum values use their option label, or humanise as fallback", () => {
  const withOpts = field({ type: "enum", options: { n_plus_1: ["N+1", "N+1"], leed: ["LEED", "LEED"] } });
  assert.equal(formatFieldValue(withOpts, "n_plus_1", false), "N+1");
  assert.equal(formatFieldValue(withOpts, "leed", true), "LEED");
  // no options -> snake_case is humanised
  assert.equal(formatFieldValue(field({ type: "enum" }), "some_value", false), "some value");
});

test("office generator and green-cert enums resolve to proper labels", () => {
  const gen = fieldsFor("office").find((f) => f.key === "generator_redundancy")!;
  const green = fieldsFor("office").find((f) => f.key === "green_cert")!;
  assert.equal(formatFieldValue(gen, "n_plus_1", false), "N+1");
  assert.equal(formatFieldValue(green, "leed", false), "LEED");
});

test("warehouse sprinkler enum resolves to a proper label", () => {
  const sprinkler = fieldsFor("warehouse").find((f) => f.key === "sprinkler_type")!;
  assert.equal(formatFieldValue(sprinkler, "esfr", false), "ESFR");
  assert.equal(formatFieldValue(sprinkler, "wet", true), "رطب");
});

test("compliance rows include attribute values but exclude civil defense (shown in space)", () => {
  const office = complianceRows("office", { attributes: { ejar_registered: true, rhq_ready: true } }, false);
  const labels = office.map((r) => r[0]);
  assert.ok(labels.includes("Ejar registration"));
  assert.ok(labels.includes("RHQ-ready"));
  const wh = complianceRows("warehouse", { civil_defense_approved: true, attributes: { ejar_registered: true } }, false);
  const whLabels = wh.map((r) => r[0]);
  assert.ok(whLabels.includes("Ejar registration"));
  assert.ok(!whLabels.includes("Civil Defense"), "civil defense stays in The space, not compliance");
});

test("compliance skips unavailable (unwired) fields like zoning", () => {
  const office = complianceRows("office", { attributes: { zoning_balady: "Commercial" } }, false);
  assert.ok(!office.map((r) => r[0]).includes("Zoning"), "unavailable zoning must not render even if present");
});

test("space rows skip column-backed and unavailable fields, keep attribute fields", () => {
  const rows = spaceAttributeRows("office", {
    floor_plate_sqm: 1200,       // attribute field -> shows
    ceiling_height_m: 3.2,       // attribute field -> shows
    building_grade: "a_plus",    // column-backed -> skipped
    parking_ratio: "1 / 40",     // column-backed -> skipped
    raised_floor: true,          // attribute boolean true -> shows
  }, false);
  const labels = rows.map((r) => r[0]);
  assert.ok(labels.includes("Floor plate"));
  assert.ok(labels.includes("Ceiling height"));
  assert.ok(labels.includes("Raised floor"));
  assert.ok(!labels.includes("Grade"), "grade is column-backed, should be skipped");
  assert.ok(!labels.includes("Parking ratio"), "parking is column-backed, should be skipped");
});

test("no attributes yields no rows", () => {
  assert.deepEqual(spaceAttributeRows("office", null, false), []);
  assert.deepEqual(spaceAttributeRows("office", {}, false), []);
});

test("only registry-known keys render, junk is ignored", () => {
  const rows = spaceAttributeRows("office", { not_a_field: 5, floor_plate_sqm: 900 }, false);
  assert.equal(rows.length, 1);
  assert.equal(rows[0][0], "Floor plate");
});

test("warehouse attribute fields render (yard depth, column grid)", () => {
  const rows = spaceAttributeRows("warehouse", { yard_depth_m: 35, column_grid: "12 x 24 m" }, false);
  const labels = rows.map((r) => r[0]);
  assert.ok(labels.includes("Yard depth"));
  assert.ok(labels.includes("Column grid"));
  // clear_height_m is column-backed, skipped even if present in attributes
  const rows2 = spaceAttributeRows("warehouse", { clear_height_m: 9 }, false);
  assert.equal(rows2.length, 0);
});
