import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { leasingActivityFor, normaliseDistrictName, columnMax, LEASING_DATASET } from "./leasingActivity";
import { deniedRights, mayRedisplay, parseSourceRights } from "../sourceRights";
import { SOURCE_CATALOGUE, REGA_OPEN_RENTAL_INDICATORS_SOURCE_ID, REGA_RENT_INDEX_SOURCE_ID } from "../sources/catalogue";

// PKG-DATA-1. The leasing activity section shows figures SAT did not originate.
// These tests hold the chain from the official file to the page: the extract is
// the recorded file, the module is what the generator makes of it, the module
// carries no rent, and the page asks the register before it shows anything.

const ROOT = join(__dirname, "..", "..", "..");
const DIR = join(ROOT, "data/official/rega-rental-indicators");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const prov = JSON.parse(readFileSync(join(DIR, "riyadh-2026-q1.provenance.json"), "utf8"));

test("PKG-DATA-1: the extract is the file its provenance record describes", () => {
  const raw = readFileSync(join(DIR, prov.extract.file));
  assert.equal(raw.length, prov.extract.bytes);
  assert.equal(createHash("sha256").update(raw).digest("hex"), prov.extract.sha256);
  const lines = raw.toString("utf8").split("\n").filter((l) => l.length > 0);
  assert.equal(lines.length - 1, prov.extract.rows);
  assert.match(prov.official.sha256, /^[0-9a-f]{64}$/);
});

test("PKG-DATA-1: no commercial row in the official extract carries a rent", () => {
  // The reason the section shows counts and no rent. If a later file carries a
  // commercial rent, this fails, and showing it becomes a decision.
  const lines = readFileSync(join(DIR, prov.extract.file), "utf8").split("\n").filter((l) => l.length > 0).slice(1);
  const withRent = lines.filter((l) => { const f = l.split(","); return f[8] !== "0" || f[9] !== "0"; });
  assert.equal(withRent.length, 0);
  assert.equal(prov.extract.rowsWithARent, 0);
});

test("PKG-DATA-1: the data module is exactly what the generator makes of the extract", async () => {
  const { buildLeasingActivity } = await import("../../../scripts/build-leasing-activity.mjs" as string);
  assert.equal(read("src/data/leasingActivity.json"), buildLeasingActivity());
});

test("PKG-DATA-1: the data module has nowhere to put a rent", () => {
  const j = JSON.parse(read("src/data/leasingActivity.json"));
  assert.deepEqual(j.columns, ["district", "office", "shop", "showroom"]);
  for (const rows of Object.values(j.cities) as unknown[][][]) {
    for (const r of rows) {
      assert.equal(r.length, 4);
      assert.equal(typeof r[0], "string");
      for (const n of r.slice(1)) assert.ok(n === null || (Number.isInteger(n) && (n as number) > 0));
      assert.ok(r.slice(1).some((n) => n !== null), "a district row with no figure at all");
    }
  }
});

test("PKG-DATA-1: no two districts of one city collapse to the same name", () => {
  // The match is by normalised name, so a collision would hand one district
  // another's figures.
  const j = JSON.parse(read("src/data/leasingActivity.json"));
  for (const [city, rows] of Object.entries(j.cities) as [string, [string][]][]) {
    const names = rows.map((r) => normaliseDistrictName(r[0]));
    assert.equal(new Set(names).size, names.length, `two districts of ${city} normalise to one name`);
  }
});

test("PKG-DATA-1: a platform district gets the file's own figures, unchanged", () => {
  const rows = leasingActivityFor([
    { name_en: "Al Olaya", name_ar: "العليا", city: "Riyadh" },
    { name_en: "King Fahd District", name_ar: "حي الملك فهد", city: "Riyadh" },
  ]);
  assert.equal(rows.length, 2);
  // Read straight from the extract, not from the module under test.
  const lines = readFileSync(join(DIR, prov.extract.file), "utf8").split("\n").map((l) => l.split(","));
  const count = (district: string, type: string) => Number(lines.find((f) => f[3] === "الرياض" && f[4] === district && f[5] === type)![7]);
  assert.equal(rows[0].en, "Al Olaya");
  assert.equal(rows[0].office, count("العليا", "مكتب"));
  assert.equal(rows[0].shop, count("العليا", "محل"));
  assert.equal(rows[0].showroom, count("العليا", "معرض تجاري"));
  // The file writes this district without the word for "district".
  assert.equal(rows[1].office, count("الملك فهد", "مكتب"));
});

test("PKG-DATA-1: a district the file does not name, or in a city the file does not cover, is absent", () => {
  assert.deepEqual(leasingActivityFor([{ name_en: "KAFD", name_ar: "واجهة الرياض المالية", city: "Riyadh" }]), []);
  // Same Arabic name, another city: the Riyadh file must not answer for Khobar.
  assert.deepEqual(leasingActivityFor([{ name_en: "Al Olaya", name_ar: "العليا", city: "Khobar" }]), []);
  assert.deepEqual(leasingActivityFor([{ name_en: "X", name_ar: "", city: "Riyadh" }]), []);
});

test("PKG-DATA-1: a district listed twice is answered once", () => {
  const d = { name_en: "Al Olaya", name_ar: "العليا", city: "Riyadh" };
  assert.equal(leasingActivityFor([d, d]).length, 1);
});

test("PKG-DATA-1: the name match is not a fuzzy match", () => {
  assert.equal(normaliseDistrictName("  حي   الملك فهد "), "الملك فهد");
  assert.equal(normaliseDistrictName("الأندلس"), normaliseDistrictName("الاندلس"));
  assert.notEqual(normaliseDistrictName("السلي"), normaliseDistrictName("السليمانية"));
  // "الحي" is part of a name, not the word for district standing in front of one.
  assert.equal(normaliseDistrictName("الحي الدبلوماسي"), "الحي الدبلوماسي");
});

test("PKG-DATA-1: the module adds nothing up", () => {
  // Open decision O13 holds derived market figures. A total, a share or a rank
  // computed here would be one, so the module's code may not contain the means.
  const code = read("src/lib/market/leasingActivity.ts").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  assert.doesNotMatch(code, /\+=|\bsum\b|\btotal\b|\/\s*\w+\s*\*\s*100|\.sort\(/i);
  const rows = leasingActivityFor([{ name_en: "Al Olaya", name_ar: "العليا", city: "Riyadh" }]);
  assert.equal(columnMax(rows, "office"), rows[0].office);
  assert.equal(columnMax([], "office"), 0);
});

test("PKG-DATA-1: the open dataset is its own source, apart from the Rental Index", () => {
  const ids = SOURCE_CATALOGUE.map((e) => e.id);
  assert.ok(ids.includes(REGA_OPEN_RENTAL_INDICATORS_SOURCE_ID));
  assert.notEqual(REGA_OPEN_RENTAL_INDICATORS_SOURCE_ID, REGA_RENT_INDEX_SOURCE_ID);
});

test("PKG-DATA-1: the section asks the register before it shows a figure, and says where the figures come from", () => {
  const c = read("src/components/LeasingActivity.tsx");
  assert.match(c, /getSourceRights\(REGA_OPEN_RENTAL_INDICATORS_SOURCE_ID\)/);
  assert.match(c, /mayRedisplay\(rights, "public"\)/);
  // The licence notice names the dataset and the licence, each as a link.
  assert.match(c, /LEASING_DATASET\.url/);
  assert.match(c, /LEASING_DATASET\.licenceUrl/);
  // Naming a regulator as a source is not its backing, and the page says so.
  assert.match(c, /t\.laNoAffiliation/);
  for (const lang of ["en", "ar"]) {
    const d = JSON.parse(read(`src/i18n/dictionaries/${lang}.json`));
    assert.ok((d.marketPage.laNoAffiliation ?? "").trim().length > 0, `${lang}: the no-affiliation line is missing`);
  }
  assert.match(LEASING_DATASET.url, /^https:\/\/open\.data\.gov\.sa\//);
  assert.match(LEASING_DATASET.licenceUrl, /^https:\/\/open\.data\.gov\.sa\//);
});

test("PKG-DATA-1: the register row is prepared with the licence quoted, and grants only what the section uses", () => {
  const sql = read("supabase/migrations/20261113d_rega_open_rental_indicators_source.sql");
  assert.match(sql, /'rega_open_rental_indicators'/);
  assert.match(sql, /These rights explicitly include commercial use/);
  assert.match(sql, /'evidenced'/);
  // Own figure in public. Nothing derived in public, nothing exported, retrieved
  // or sent to a model. Each value is labelled with its column in the file.
  assert.match(sql, /'public',\s+-- redisplay_policy/);
  assert.match(sql, /'internal',\s+-- derived_display_policy/);
  assert.match(sql, /'none',\s+-- export_policy/);
  assert.match(sql, /'none',\s+-- ai_retrieval_policy/);
  assert.match(sql, /'none',\s+-- model_input_policy/);
  assert.match(sql, /on conflict \(source_id\) do update/);
});

test("PKG-DATA-1: with no register row the section is refused, and the prepared row allows it", () => {
  // The first is production today: the public site reads no row, so the lookup
  // falls back to the denying default and the component returns nothing.
  assert.equal(mayRedisplay(deniedRights(REGA_OPEN_RENTAL_INDICATORS_SOURCE_ID), "public"), false);
  // The second is the row 20261113d writes, as the loader would hand it over.
  const row = parseSourceRights({
    source_id: REGA_OPEN_RENTAL_INDICATORS_SOURCE_ID, storage_policy: "full", redisplay_policy: "public",
    derived_display_policy: "internal", export_policy: "none", ai_retrieval_policy: "none", model_input_policy: "none",
    rights_status: "evidenced", stop_condition: "x", rights_reviewed_at: "2026-11-13T00:00:00Z", rights_reviewed_note: "x",
  });
  assert.equal(mayRedisplay(row, "public"), true);
  // The same row with its evidence withdrawn shows nothing in public.
  assert.equal(mayRedisplay({ ...row, rightsStatus: "asserted_unverified" }, "public"), false);
});
