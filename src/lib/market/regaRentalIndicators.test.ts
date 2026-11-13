import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseRentalIndicators, rentalIndicatorsTitle, LOADED_REGIONS, PORTAL } from "./regaRentalIndicators";
import { leasingActivityFor } from "./leasingActivity";

// PKG-DATA-2. The weekly job publishes a file no person has looked at. These
// tests hold the reasons it must refuse one, and the order in which a load
// becomes visible.

const ROOT = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const extract = readFileSync(join(ROOT, "data/official/rega-rental-indicators/riyadh-2026-q1.commercial.csv"));
const enc = (s: string) => new TextEncoder().encode(s);
const HEAD = "السنة ,الربع,المنطقة ,المدينة,الحي ,نوع العقار ,تصنيف العقار ,عدد الصفقات,متوسط الايجار  ر.س,متوسط الايجار لكل متر مربع ر.س";
const file = (...rows: string[]) => enc([HEAD, ...rows].join("\r\n") + "\r\n");
const OK_ROW = "2026,2,الرياض,الرياض,العليا,مكتب,تجاري,1400,0,0";

test("PKG-DATA-2: the committed extract parses to exactly the bundled quarter", () => {
  const p = parseRentalIndicators(extract);
  assert.ok(p.ok);
  if (!p.ok) return;
  assert.equal(p.period, "2026-Q1");
  assert.equal(p.region, "الرياض");
  assert.equal(p.commercialRows, 1083);
  const bundled = JSON.parse(read("src/data/leasingActivity.json")).cities as Record<string, [string, number | null, number | null, number | null][]>;
  const mine: Record<string, [string, number | null, number | null, number | null][]> = {};
  for (const r of p.rows) (mine[r.city] ??= []).push([r.district, r.office, r.shop, r.showroom]);
  assert.deepEqual(mine, bundled);
});

test("PKG-DATA-2: a full file with residential rows keeps the commercial ones and counts the rest", () => {
  const p = parseRentalIndicators(file(OK_ROW, "2026,2,الرياض,الرياض,العليا,شقة,سكني,900,52000,410", "2026,2,الرياض,الرياض,العليا,محل,تجاري,600,0,0"));
  assert.deepEqual(p, { ok: true, period: "2026-Q2", region: "الرياض", officialRows: 3, commercialRows: 2, rows: [{ city: "الرياض", district: "العليا", office: 1400, shop: 600, showroom: null }] });
});

test("PKG-DATA-2: the header written without the currency, as in 2025, is the same header", () => {
  const h2025 = "السنة,الربع,المنطقة,المدينة,الحي,نوع العقار,تصنيف العقار,عدد الصفقات,متوسط الايجار,متوسط الايجار لكل متر مربع";
  assert.equal(parseRentalIndicators(enc("﻿" + h2025 + "\n" + OK_ROW + "\n")).ok, true);
});

test("PKG-DATA-2: every way a file can differ from the earlier quarters is a refusal", () => {
  const no = (bytes: Uint8Array, why: RegExp) => {
    const p = parseRentalIndicators(bytes);
    assert.equal(p.ok, false);
    if (!p.ok) assert.match(p.reason, why);
  };
  no(file("2026,2,الرياض,الرياض,العليا,مكتب,تجاري,1400,2100,0"), /carries a rent/);
  no(file("2026,2,الرياض,الرياض,العليا,مكتب,تجاري,1400,0,950"), /carries a rent/);
  no(file("2026,2,الرياض,الرياض,العليا,مستودع,تجاري,12,0,0"), /unknown commercial property type/);
  no(file(OK_ROW, OK_ROW), /two rows for one district and type/);
  no(file(OK_ROW, "2026,3,الرياض,الرياض,الملز,مكتب,تجاري,5,0,0"), /mixes 2026-Q2 and 2026-Q3/);
  no(file(OK_ROW, "2026,2,مكة المكرمة,جدة,الحمراء,مكتب,تجاري,5,0,0"), /mixes regions/);
  no(file("2026,2,الرياض,الرياض,العليا,مكتب,تجاري,0,0,0"), /not a positive whole number/);
  no(file("2026,2,الرياض,الرياض,العليا,مكتب,تجاري,1.5,0,0"), /not a positive whole number/);
  no(file("2026,2,الرياض,الرياض,العليا,مكتب,تجاري,1400,0"), /ten columns/);
  no(file("2026,2,الرياض,الرياض,,مكتب,تجاري,1400,0,0"), /no city or district/);
  no(file('2026,2,الرياض,الرياض,"العليا",مكتب,تجاري,1400,0,0'), /quoted fields/);
  no(file("2026,2,الرياض,الرياض,العليا,شقة,سكني,900,52000,410"), /no commercial rows/);
  no(enc(HEAD.replace("عدد الصفقات", "عدد العقود") + "\n" + OK_ROW + "\n"), /column names/);
  no(enc(HEAD + ",عمود جديد\n" + OK_ROW + ",1\n"), /column names/);
  no(enc(HEAD + "\n"), /no rows/);
  no(new Uint8Array([0xff, 0xfe, 0x41]), /not valid UTF-8/);
});

test("PKG-DATA-2: a dataset title is read strictly, and only loaded regions are loaded", () => {
  assert.deepEqual(rentalIndicatorsTitle("Rental indicators in Riyadh region 1st Q 2026"), { regionEn: "Riyadh", period: "2026-Q1" });
  assert.deepEqual(rentalIndicatorsTitle("Rental indicators in Riyadh region 4th Q 2025"), { regionEn: "Riyadh", period: "2025-Q4" });
  assert.equal(rentalIndicatorsTitle("Rental indicators in Riyadh region 1st Q 2026E"), null);
  assert.equal(rentalIndicatorsTitle("Sale indicators in Riyadh region 1st Q 2026"), null);
  assert.deepEqual(Object.keys(LOADED_REGIONS), ["Riyadh"]);
  assert.equal(PORTAL.fileUrl("a/b/v1/Rental indicators in Riyadh region 1st Q 2026.csv"), "https://open.data.gov.sa/odp-public/a/b/v1/Rental%20indicators%20in%20Riyadh%20region%201st%20Q%202026.csv");
});

test("PKG-DATA-2: a loaded quarter is the whole answer, never mixed with the bundled one", () => {
  const d = [{ name_en: "Al Olaya", name_ar: "العليا", city: "Riyadh" }, { name_en: "Al Malaz", name_ar: "الملز", city: "Riyadh" }];
  const rows = leasingActivityFor(d, { "الرياض": [["العليا", 1400, 600, null]] });
  assert.deepEqual(rows, [{ en: "Al Olaya", ar: "العليا", office: 1400, shop: 600, showroom: null }]);
  assert.equal(leasingActivityFor(d).length, 2);
});

test("PKG-DATA-2: the job is closed to the public and a load is visible only when whole", () => {
  const code = read("src/app/api/cron/ingest-leasing/route.ts").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  assert.match(code, /authed\(req, secret\)/);
  assert.match(code, /getSupabaseServiceRole\(\)/);
  assert.match(code, /allowShared\("cron-ingest-leasing"/);
  // Rejected first, counts second, published last.
  const inProgress = code.indexOf('reason: "load in progress"');
  const counts = code.indexOf('.from("official_leasing_counts").insert(');
  const publish = code.indexOf('update({ status: "published"');
  assert.ok(inProgress > 0 && counts > inProgress && publish > counts, "the load is not written rejected, then counts, then published");
  // The only place a load becomes published is after the parser said yes.
  assert.equal(code.split('.update({ status: "published"').length - 1, 1);
  assert.doesNotMatch(code, /upsert\([^)]*status: "published"/);
  assert.match(code, /if \(!parsed\.ok\) \{ await reject\(/);
  assert.match(code, /parsed\.period !== named\.period/);
  // It reads one fixed host and nothing a response tells it to read.
  assert.doesNotMatch(code, /fetch\((?!url,|`\$\{PORTAL\.origin\})/);
  const sched = JSON.parse(read("vercel.json")).crons.find((c: { path: string }) => c.path === "/api/cron/ingest-leasing");
  assert.equal(sched.schedule, "0 3 * * 1");
});

test("PKG-DATA-2: the tables hold counts only and show the public only published loads", () => {
  const sql = read("supabase/migrations/20261113f_official_leasing_counts.sql");
  const code = sql.replace(/--[^\n]*/g, "");
  assert.doesNotMatch(code, /rent|price|sar/i, "the tables have a column a rent could go in");
  assert.match(code, /enable row level security/);
  assert.match(code, /revoke all on public\.official_leasing_loads, public\.official_leasing_counts from anon, authenticated/);
  assert.match(code, /for select to anon, authenticated using \(status = 'published'\)/);
  assert.match(code, /l\.status = 'published'/);
  assert.doesNotMatch(code, /for (insert|update|delete|all)/i);
  assert.match(code, /office\s+integer check \(office > 0\)/);
});

test("PKG-DATA-2: the page falls back to the bundled quarter and never to nothing", () => {
  const c = read("src/components/LeasingActivity.tsx");
  assert.match(c, /latestLoadedQuarter\(sb, BUNDLED_PLACE\.region, BUNDLED_PLACE\.city\)/);
  assert.match(c, /loaded !== null && loaded\.period >= LEASING_DATASET\.period/);
  const q = read("src/lib/queries/leasingActivity.ts");
  assert.match(q, /\.eq\("status", "published"\)/);
  assert.match(q, /catch \{\s*return null;/);
});
