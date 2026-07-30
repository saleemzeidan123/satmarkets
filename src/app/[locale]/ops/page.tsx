"use client";
// src/app/[locale]/ops/page.tsx
// SAT Markets - Data Operations console (Slice 5: the report becomes a console), bilingual EN/AR.
// Slice 5 (Fable 5 world-class advisory): health header + needs-attention worklist at the top,
// reconciliation board pivoted to one row per CELL (district x asset x segment) with a computed
// Disagreement verdict (REGA vs broker beyond tolerance), combined band, and expandable
// contributing-source rows. Thin is amber, never red. Overrides only make a cell more conservative.
// All data is SYNTHETIC. Never production. See ops/layout.tsx for noindex.

import { Fragment, useMemo, useState } from "react";
import { RENT_INDEX_SOURCE } from "@/lib/market/attribution";

type Seg = "blended" | "grade_a" | "grade_b" | "modern";
type Row = {
  district: string; districtAr: string; asset: string; assetAr: string;
  segment: Seg; segEn: string; segAr: string;
  low: number; median: number; high: number; sufficient: boolean;
  src: "rega" | "broker"; period: string; source: string; sourceAr: string;
  basis: string; basisAr: string; resolved: boolean; note?: string; noteAr?: string;
  cell?: string;
};

// Owner ruling 2. Both forms come from the canonical constant; the Arabic one
// used to transliterate the authority as "ريجا" instead of naming it.
const REGA = RENT_INDEX_SOURCE.en;
const REGA_AR = RENT_INDEX_SOURCE.ar;
const BJLL = "Published: JLL";
const BJLL_AR = "منشور: JLL";
const B3 = "Published: CBRE, JLL, Knight Frank";
const B3_AR = "منشور: CBRE و JLL و Knight Frank";

const BASE: Row[] = [
  { district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 1200, median: 1700, high: 2200, sufficient: true, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=412, min 30", basisAr: "ن=412، الحد 30", resolved: true, cell: "al-olaya/office" },
  { district: "Al Malaz", districtAr: "الملز", asset: "Office", assetAr: "مكاتب", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 700, median: 980, high: 1300, sufficient: true, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=208, min 30", basisAr: "ن=208، الحد 30", resolved: true, cell: "al-malaz/office" },
  { district: "Granada", districtAr: "غرناطة", asset: "Office", assetAr: "مكاتب", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 1000, median: 1350, high: 1800, sufficient: true, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=151, min 30", basisAr: "ن=151، الحد 30", resolved: true, cell: "granada/office" },
  { district: "KAFD", districtAr: "كافد", asset: "Office", assetAr: "مكاتب", segment: "grade_a", segEn: "Grade A", segAr: "الفئة أ", low: 3400, median: 3700, high: 4100, sufficient: true, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=88, min 30", basisAr: "ن=88، الحد 30", resolved: true, cell: "kafd/office" },
  { district: "Al Yasmin", districtAr: "الياسمين", asset: "Office", assetAr: "مكاتب", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 950, median: 1150, high: 1450, sufficient: true, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=38, min 30", basisAr: "ن=38، الحد 30", resolved: true, cell: "al-yasmin/office" },
  { district: "Al Olaya", districtAr: "العليا", asset: "Retail", assetAr: "تجزئة", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 1800, median: 2600, high: 3600, sufficient: true, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=96, min 30", basisAr: "ن=96، الحد 30", resolved: true, cell: "al-olaya/retail" },
  { district: "Granada", districtAr: "غرناطة", asset: "Retail", assetAr: "تجزئة", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 1300, median: 1900, high: 2600, sufficient: true, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=44, min 30", basisAr: "ن=44، الحد 30", resolved: true, cell: "granada/retail" },
  { district: "Al Malaz", districtAr: "الملز", asset: "Warehouse", assetAr: "مستودعات", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 180, median: 240, high: 320, sufficient: true, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=63, min 30", basisAr: "ن=63، الحد 30", resolved: true, cell: "al-malaz/warehouse" },
  { district: "Al Malaz", districtAr: "الملز", asset: "Retail", assetAr: "تجزئة", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 1100, median: 1400, high: 1750, sufficient: false, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=19, min 30, below threshold", basisAr: "ن=19، الحد 30، دون الحد", resolved: true, cell: "al-malaz/retail" },
  { district: "As Sulimaniyah", districtAr: "السليمانية", asset: "Retail", assetAr: "تجزئة", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 1700, median: 2100, high: 2600, sufficient: false, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=27, min 30, below threshold", basisAr: "ن=27، الحد 30، دون الحد", resolved: true, cell: "as-sulimaniyah/retail" },
  { district: "Al Yasmin", districtAr: "الياسمين", asset: "Retail", assetAr: "تجزئة", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 1300, median: 1600, high: 2000, sufficient: false, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=29, min 30, below threshold", basisAr: "ن=29، الحد 30، دون الحد", resolved: true, cell: "al-yasmin/retail" },
  { district: "An Narjis", districtAr: "النرجس", asset: "Office", assetAr: "مكاتب", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 600, median: 760, high: 980, sufficient: false, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=7, min 30, below threshold", basisAr: "ن=7، الحد 30، دون الحد", resolved: false, cell: "an-narjis/office" },
  { district: "Qurtubah", districtAr: "قرطبة", asset: "Office", assetAr: "مكاتب", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 700, median: 900, high: 1150, sufficient: false, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=11, min 30, unresolved crosswalk", basisAr: "ن=11، الحد 30، مطابقة غير محلولة", resolved: false, cell: "qurtubah/office" },
  { district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", segment: "grade_a", segEn: "Grade A", segAr: "الفئة أ", low: 1580, median: 1720, high: 1900, sufficient: true, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=64, min 30", basisAr: "ن=64، الحد 30", resolved: true, cell: "al-olaya/office-a" },
  { district: "Granada", districtAr: "غرناطة", asset: "Office", assetAr: "مكاتب", segment: "grade_a", segEn: "Grade A", segAr: "الفئة أ", low: 1350, median: 1480, high: 1700, sufficient: true, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=42, min 30", basisAr: "ن=42، الحد 30", resolved: true, cell: "granada/office-a" },
  { district: "KAFD", districtAr: "كافد", asset: "Office", assetAr: "مكاتب", segment: "grade_a", segEn: "Grade A", segAr: "الفئة أ", low: 3500, median: 3800, high: 4200, sufficient: true, src: "broker", period: "2026-Q1", source: B3, sourceAr: B3_AR, basis: "3 sources, min 2", basisAr: "3 مصادر، الحد 2", resolved: true, cell: "kafd/office" },
  { district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", segment: "grade_a", segEn: "Grade A", segAr: "الفئة أ", low: 1750, median: 2043, high: 2500, sufficient: true, src: "broker", period: "2026-Q1", source: B3, sourceAr: B3_AR, basis: "3 sources, min 2", basisAr: "3 مصادر، الحد 2", resolved: true },
  { district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", segment: "grade_b", segEn: "Grade B", segAr: "الفئة ب", low: 1100, median: 1300, high: 1550, sufficient: false, src: "broker", period: "2026-Q1", source: BJLL, sourceAr: BJLL_AR, basis: "1 source, min 2", basisAr: "مصدر واحد، الحد 2", resolved: true },
  { district: "Granada", districtAr: "غرناطة", asset: "Office", assetAr: "مكاتب", segment: "grade_a", segEn: "Grade A", segAr: "الفئة أ", low: 1300, median: 1500, high: 1850, sufficient: false, src: "broker", period: "2026-Q1", source: BJLL, sourceAr: BJLL_AR, basis: "1 source, min 2", basisAr: "مصدر واحد، الحد 2", resolved: true },
  { district: "Al Yasmin", districtAr: "الياسمين", asset: "Office", assetAr: "مكاتب", segment: "grade_a", segEn: "Grade A", segAr: "الفئة أ", low: 1200, median: 1400, high: 1650, sufficient: false, src: "broker", period: "2026-Q1", source: BJLL, sourceAr: BJLL_AR, basis: "1 source, min 2", basisAr: "مصدر واحد، الحد 2", resolved: true },
  { district: "Al Malaz", districtAr: "الملز", asset: "Warehouse", assetAr: "مستودعات", segment: "modern", segEn: "Modern", segAr: "حديثة", low: 190, median: 235, high: 300, sufficient: false, src: "broker", period: "2026-Q1", source: "Published: CBRE", sourceAr: "منشور: CBRE", basis: "1 source, min 2", basisAr: "مصدر واحد، الحد 2", resolved: true },
];

type Scn = "thin" | "deed" | "disagree" | "stale" | "restate";
const SCENARIOS: { id: Scn; en: string; ar: string; expEn: string; expAr: string }[] = [
  { id: "thin", en: "Thin district", ar: "حي قليل العينة", expEn: "Granada retail drops below threshold and shows Thin sample.", expAr: "تجزئة غرناطة تنخفض دون الحد وتظهر كعينة قليلة." },
  { id: "deed", en: "Failed deed", ar: "صك غير صالح", expEn: "SAT-1847 deed fails; it moves from Published to Held. published count drops.", expAr: "يفشل صك SAT-1847؛ ينتقل من منشور إلى معلّق. ينخفض عدد المنشور." },
  { id: "disagree", en: "Brokers disagree", ar: "اختلاف الوسطاء", expEn: "KAFD Grade A broker jumps; REGA and broker fall outside tolerance so the cell reads Disagreement.", expAr: "تقفز مراجع الوسطاء للفئة أ في كافد؛ يخرج ريجا والوسيط عن الحد فتُقرأ الخلية تعارض المصادر." },
  { id: "stale", en: "Stale REGA feed", ar: "تغذية ريجا قديمة", expEn: "REGA is a month late; source health flags it Attention and raises an alert.", expAr: "ريجا متأخرة شهراً؛ حالة المصدر تُعلَّم انتباه وتُصدر تنبيهاً." },
  { id: "restate", en: "REGA restatement", ar: "تصحيح ريجا", expEn: "REGA restates Al Olaya office median 1,700 to 1,650, tagged restated.", expAr: "ريجا تصحح وسيط مكاتب العليا من 1,700 إلى 1,650، موسوم مُصحَّح." },
];

type Role = "viewer" | "reviewer" | "admin";
const ROLES: Role[] = ["viewer", "reviewer", "admin"];
type Audit = { ts: string; op: string; role: Role; action: string; target: string; change: string; reason: string };

type Deed = "valid" | "not_found" | "pending" | "duplicate";
type Listing = {
  ref: string; district: string; districtAr: string; asset: string; assetAr: string;
  deal: string; dealAr: string; nafath: boolean; permit: string | null; permitOk?: boolean;
  deed: Deed; asking: number | null; init?: string; dup?: string;
};

const LISTINGS: Listing[] = [
  { ref: "SAT-1847", district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", deal: "Lease", dealAr: "إيجار", nafath: true, permit: "7200256841", deed: "valid", asking: 1550 },
  { ref: "SAT-1902", district: "Al Malaz", districtAr: "الملز", asset: "Warehouse", assetAr: "مستودعات", deal: "Lease", dealAr: "إيجار", nafath: true, permit: "7200256990", deed: "not_found", asking: 205 },
  { ref: "SAT-1955", district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", deal: "Sale", dealAr: "بيع", nafath: true, permit: "7200257050", deed: "pending", asking: null },
  { ref: "SAT-2010", district: "Granada", districtAr: "غرناطة", asset: "Office", assetAr: "مكاتب", deal: "Lease", dealAr: "إيجار", nafath: true, permit: "7200257180", deed: "valid", asking: 1320 },
  { ref: "SAT-2011", district: "KAFD", districtAr: "كافد", asset: "Office", assetAr: "مكاتب", deal: "Lease", dealAr: "إيجار", nafath: true, permit: "7200257205", deed: "valid", asking: 3650 },
  { ref: "SAT-2044", district: "Al Yasmin", districtAr: "الياسمين", asset: "Office", assetAr: "مكاتب", deal: "Lease", dealAr: "إيجار", nafath: true, permit: "7200255010", permitOk: false, deed: "valid", asking: 1180 },
  { ref: "SAT-2050", district: "Al Malaz", districtAr: "الملز", asset: "Warehouse", assetAr: "مستودعات", deal: "Lease", dealAr: "إيجار", nafath: true, permit: "7200257260", deed: "duplicate", asking: 230, dup: "SAT-2051" },
  { ref: "SAT-2051", district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", deal: "Sale", dealAr: "بيع", nafath: true, permit: "7200257261", deed: "duplicate", asking: null, dup: "SAT-2050" },
  { ref: "SAT-2077", district: "Qurtubah", districtAr: "قرطبة", asset: "Office", assetAr: "مكاتب", deal: "Lease", dealAr: "إيجار", nafath: false, permit: "7200257300", deed: "valid", asking: 940 },
  { ref: "SAT-2088", district: "As Sulimaniyah", districtAr: "السليمانية", asset: "Retail", assetAr: "تجزئة", deal: "Lease", dealAr: "إيجار", nafath: true, permit: "7200254120", deed: "not_found", asking: 2050, init: "rejected" },
  { ref: "SAT-2099", district: "Granada", districtAr: "غرناطة", asset: "Retail", assetAr: "تجزئة", deal: "Lease", dealAr: "إيجار", nafath: true, permit: "7200257355", deed: "valid", asking: 1850 },
  { ref: "SAT-2101", district: "Al Yasmin", districtAr: "الياسمين", asset: "Retail", assetAr: "تجزئة", deal: "Sale", dealAr: "بيع", nafath: true, permit: "7200257402", deed: "pending", asking: null },
];

function fmt(n: number) { return n.toLocaleString("en-US"); }
const ck = (r: { district: string; asset: string; segment: string }) => r.district + "|" + r.asset + "|" + r.segment;
const TOL = 0.12; // sources within 12% agree; wider is a disagreement
// KSA is UTC+3, no DST.
const ksaNow = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");

type Verdict = "sufficient" | "thin" | "disagree" | "override";
type Cell = {
  k: string; district: string; districtAr: string; asset: string; assetAr: string;
  segEn: string; segAr: string; low: number; high: number; median: number | null;
  rows: Row[]; suffCount: number; unresolved: boolean; verdict: Verdict; computed: Exclude<Verdict, "override">;
  spreadPct: number; note?: string; noteAr?: string;
};

export default function OpsPage({ params }: { params: { locale: string } }) {
  const ar = params.locale === "ar";
  const t = (en: string, arr: string) => (ar ? arr : en);
  const [period, setPeriod] = useState("2026-06");
  const [scn, setScn] = useState<Record<Scn, boolean>>({ thin: false, deed: false, disagree: false, stale: false, restate: false });
  const toggle = (id: Scn) => setScn((s) => ({ ...s, [id]: !s[id] }));
  const [role, setRole] = useState<Role>("viewer");
  const [op, setOp] = useState("");
  const [audit, setAudit] = useState<Audit[]>([]);
  const [forcedThin, setForcedThin] = useState<Record<string, string>>({});
  const [resolvedOv, setResolvedOv] = useState<Record<string, boolean>>({});
  const [listingOv, setListingOv] = useState<Record<string, string>>({});
  const [acked, setAcked] = useState<Record<string, boolean>>({});
  const [openCell, setOpenCell] = useState<Record<string, boolean>>({});

  const can = (a: "review" | "admin") => (a === "review" ? role !== "viewer" : role === "admin");
  const log = (action: string, target: string, change: string, reason: string) =>
    setAudit((l) => [{ ts: ksaNow(), op: op.trim() || "(unnamed)", role, action, target, change, reason }, ...l]);
  const ask = (label: string) => (typeof window === "undefined" ? "" : window.prompt(label) || "");

  const index = useMemo(() => {
    let rows: Row[] = BASE.map((r) => ({ ...r }));
    if (period === "2026-07") {
      rows.push({ district: "An Nakheel", districtAr: "النخيل", asset: "Office", assetAr: "مكاتب", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 900, median: 1150, high: 1500, sufficient: true, src: "rega", period: "2026-07", source: REGA, sourceAr: REGA_AR, basis: "n=58, min 30", basisAr: "ن=58، الحد 30", resolved: true, cell: "an-nakheel/office" });
      rows = rows.map((r) => (r.district === "Al Yasmin" && r.asset === "Retail" ? { ...r, sufficient: true, low: 1400, median: 1700, high: 2100, basis: "n=34, min 30", basisAr: "ن=34، الحد 30" } : r));
      rows = rows.map((r) => (r.district === "Granada" && r.segment === "grade_a" && r.src === "rega" ? { ...r, sufficient: false, basis: "n=24, min 30, below threshold", basisAr: "ن=24، الحد 30، دون الحد" } : r));
    }
    if (scn.thin) rows = rows.map((r) => (r.district === "Granada" && r.asset === "Retail" ? { ...r, sufficient: false, basis: "n=9, min 30, below threshold", basisAr: "ن=9، الحد 30، دون الحد" } : r));
    if (scn.disagree) rows = rows.map((r) => (r.district === "KAFD" && r.segment === "grade_a" && r.src === "broker" ? { ...r, median: 4600, high: 5000, basis: "3 sources jumped", basisAr: "قفزت 3 مصادر" } : r));
    if (scn.restate) rows = rows.map((r) => (r.district === "Al Olaya" && r.asset === "Office" && r.segment === "blended" ? { ...r, median: 1650, note: "restated", noteAr: "مُصحَّح" } : r));
    rows = rows.map((r) => (resolvedOv[ck(r)] ? { ...r, resolved: true, sufficient: true, basis: "n=34, min 30, after crosswalk", basisAr: "ن=34، الحد 30، بعد المطابقة" } : r));
    return rows;
  }, [period, scn, resolvedOv]);

  const cells = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of index) {
      const k = ck(r);
      const arr = map.get(k);
      if (arr) arr.push(r); else map.set(k, [r]);
    }
    const out: Cell[] = [];
    map.forEach((rows, k) => {
      const first = rows[0];
      const suff = rows.filter((r) => r.sufficient);
      const unresolved = rows.some((r) => !r.resolved);
      const pool = suff.length ? suff : rows;
      const low = Math.min(...pool.map((r) => r.low));
      const high = Math.max(...pool.map((r) => r.high));
      const rega = suff.find((r) => r.src === "rega");
      const broker = suff.find((r) => r.src === "broker");
      let spreadPct = 0, disagree = false;
      if (rega && broker) { spreadPct = Math.abs(rega.median - broker.median) / Math.min(rega.median, broker.median); disagree = spreadPct > TOL; }
      const median = disagree ? null : (rega ?? suff[0])?.median ?? null;
      const computed: Exclude<Verdict, "override"> = unresolved || suff.length === 0 ? "thin" : disagree ? "disagree" : "sufficient";
      const ov = forcedThin[k];
      const noteRow = rows.find((r) => r.note);
      out.push({ k, district: first.district, districtAr: first.districtAr, asset: first.asset, assetAr: first.assetAr, segEn: first.segEn, segAr: first.segAr, low, high, median, rows, suffCount: suff.length, unresolved, verdict: ov ? "override" : computed, computed, spreadPct, note: noteRow?.note, noteAr: noteRow?.noteAr });
    });
    return out;
  }, [index, forcedThin]);

  const listings = useMemo(() => {
    return LISTINGS.map((l) => (scn.deed && l.ref === "SAT-1847" ? { ...l, deed: "not_found" as Deed } : l));
  }, [scn.deed]);

  const liveN = t("live", "مباشر");
  const sources = useMemo(() => {
    const narjisResolved = resolvedOv["An Narjis|Office|blended"];
    return [
      { name: "REGA / Ejar Rental Index", nameAr: REGA_AR, cad: t("Dated, monthly", "مؤرخ، شهري"), last: scn.stale ? "2026-05" : period, ok: !scn.stale, note: scn.stale ? t("stale, expected " + period, "قديمة، المتوقع " + period) : t("rows received", "صفوف مستلمة") },
      { name: "Broker benchmarks", nameAr: "مراجع الوسطاء", cad: t("Dated, quarterly", "مؤرخ، ربعي"), last: "2026-Q1", ok: !scn.disagree, note: scn.disagree ? t("disagreement flagged", "تعارض موسوم") : t("overlay valid 1 quarter", "التراكب صالح ربعاً") },
      { name: "SPL National Address", nameAr: "العنوان الوطني (سبل)", cad: t("Live API", "واجهة مباشرة"), last: liveN, ok: true, note: narjisResolved ? t("1 district unresolved (Qurtubah)", "حي غير محلول (قرطبة)") : t("2 districts unresolved (An Narjis, Qurtubah)", "حيّان غير محلولين (النرجس، قرطبة)") },
      { name: "Wathq (deeds)", nameAr: "واثق (الصكوك)", cad: t("Live, per listing", "مباشر، لكل إعلان"), last: liveN, ok: true, note: scn.deed ? t("2 deeds failed", "صكان غير صالحين") : t("1 not found, 1 duplicate", "صك غير موجود، وصك مكرر") },
      { name: "Nafath (identity)", nameAr: "نفاذ (الهوية)", cad: t("Live OIDC", "مباشر OIDC"), last: liveN, ok: true, note: t("1 unverified (SAT-2077)", "واحد غير موثّق (SAT-2077)") },
      { name: "REGA advertising permit", nameAr: "رخصة الإعلان", cad: t("Live inquiry", "استعلام مباشر"), last: liveN, ok: true, note: t("1 expired (SAT-2044)", "واحدة منتهية (SAT-2044)") },
      { name: "GASTAT / SAMA (context)", nameAr: "الإحصاء / ساما", cad: t("Dated, monthly", "مؤرخ، شهري"), last: period, ok: true, note: t("context only", "سياق فقط") },
      { name: "Foursquare open POI (stored)", nameAr: "نقاط فورسكوير المفتوحة (مخزّنة)", cad: t("Snapshot, Apache 2.0", "لقطة، رخصة أباتشي 2.0"), last: period, ok: true, note: t("POI layer only. No travel time and no isochrone is stored.", "طبقة نقاط فقط. لا زمن تنقل ولا عزل زمني مخزّن.") },
    ];
  }, [period, scn, ar, resolvedOv]);

  const gatesPass = (l: Listing) => l.nafath && !!l.permit && l.permitOk !== false && l.deed === "valid";
  const listStatus = (l: Listing) => {
    if (listingOv[l.ref]) return listingOv[l.ref];
    if (l.init) return l.init;
    return gatesPass(l) ? "published" : "held";
  };
  const gateReason = (l: Listing) => {
    if (!l.nafath) return { en: "Nafath unverified", ar: "نفاذ غير موثّق", hard: true };
    if (l.permitOk === false) return { en: "permit expired", ar: "رخصة منتهية", hard: true };
    if (l.deed === "not_found") return { en: "deed not found", ar: "صك غير موجود", hard: true };
    if (l.deed === "duplicate") return { en: "duplicate deed", ar: "صك مكرر", hard: true };
    if (l.deed === "pending") return { en: "deed pending", ar: "صك قيد الانتظار", hard: false };
    return { en: "", ar: "", hard: false };
  };

  const alerts = sources.filter((s) => !s.ok && !acked[s.name]);
  const cellsSuff = cells.filter((c) => c.verdict === "sufficient").length;
  const gatesHeld = listings.filter((l) => listStatus(l) === "held").length;
  const freshCount = sources.filter((s) => s.ok).length;
  const pubCount = listings.filter((l) => listStatus(l) === "published").length;

  type Work = { sev: "blocked" | "watch" | "info"; en: string; ar: string; anchor: string };
  const worklist = useMemo(() => {
    const items: Work[] = [];
    for (const l of listings) {
      if (listStatus(l) !== "held") continue;
      const gr = gateReason(l);
      if (!gr.en) continue;
      items.push({ sev: gr.hard ? "blocked" : "watch", en: l.ref + " held · " + gr.en, ar: l.ref + " معلّق · " + gr.ar, anchor: "#gate" });
    }
    for (const c of cells) {
      if (c.verdict === "disagree") items.push({ sev: "watch", en: c.district + " " + c.segEn + " · sources disagree " + Math.round(c.spreadPct * 100) + "%", ar: c.districtAr + " " + c.segAr + " · تعارض المصادر " + Math.round(c.spreadPct * 100) + "٪", anchor: "#board" });
      else if (c.unresolved) items.push({ sev: "watch", en: c.district + " " + c.asset + " · crosswalk unresolved", ar: c.districtAr + " " + c.assetAr + " · مطابقة غير محلولة", anchor: "#board" });
    }
    for (const s of alerts) items.push({ sev: s.name.indexOf("REGA / Ejar") === 0 ? "blocked" : "watch", en: s.name + " · " + s.note, ar: s.nameAr + " · " + s.note, anchor: "#alerts" });
    const ord: Record<Work["sev"], number> = { blocked: 0, watch: 1, info: 2 };
    return items.sort((a, b) => ord[a.sev] - ord[b.sev]);
  }, [cells, listings, alerts, listingOv, ar]);

  const doListing = (l: Listing, status: string) => {
    if (!can("review")) return;
    if (status === "approved" && !gatesPass(l)) return;
    const reason = ask(t("Reason for " + status + " on " + l.ref, "سبب " + status + " على " + l.ref)); if (!reason) return;
    const prev = listStatus(l);
    setListingOv((o) => ({ ...o, [l.ref]: status })); log(status, l.ref, prev + " → " + status, reason);
  };
  const doForceThin = (c: Cell) => { if (!can("review")) return; const reason = ask(t("Reason to force thin", "سبب الإجبار على قليل")); if (!reason) return; setForcedThin((f) => ({ ...f, [c.k]: reason })); log("force_thin", c.k, t("sufficient → thin (override)", "كافٍ → قليل (تجاوز)"), reason); };
  const doRelease = (c: Cell) => { if (!can("admin")) return; const reason = ask(t("Reason to release override", "سبب رفع التجاوز")); if (!reason) return; setForcedThin((f) => { const n = { ...f }; delete n[c.k]; return n; }); log("release_override", c.k, t("override → computed", "تجاوز → محسوب"), reason); };
  const doResolve = (c: Cell) => { if (!can("review")) return; const reason = ask(t("District to map (reason)", "الحي للمطابقة (سبب)")); if (!reason) return; setResolvedOv((o) => ({ ...o, [c.k]: true })); log("resolve_district", c.k, t("unresolved → resolved", "غير محلول → محلول"), reason); };
  const doAck = (name: string) => { if (!can("review")) return; const reason = ask(t("Acknowledge note", "ملاحظة الإقرار")); if (!reason) return; setAcked((a) => ({ ...a, [name]: true })); log("acknowledge", name, t("open → acknowledged", "مفتوح → مُقَر"), reason); };

  const download = (name: string, text: string) => {
    const blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  };
  const exportCsv = () => {
    const head = "district,asset,segment,source,low,median,high,sufficient,basis,period,synthetic";
    const body = index.map((r) => [r.district, r.asset, r.segment, r.src, r.low, r.median, r.high, r.sufficient, '"' + r.basis + '"', r.period, "true"].join(",")).join("\n");
    download("sat-reconciliation-" + period + ".csv", head + "\n" + body);
  };
  const exportAudit = () => {
    const head = "ts_ksa,operator,role,action,target,change,reason";
    const body = audit.map((a) => [a.ts, '"' + a.op + '"', a.role, a.action, '"' + a.target + '"', '"' + a.change + '"', '"' + a.reason + '"'].join(",")).join("\n");
    download("sat-audit-" + period + ".csv", head + "\n" + body);
  };

  const H = ({ n, en, arr }: { n: string; en: string; arr: string }) => (<div className="mb-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{n}</p><h2 className="text-lg font-semibold text-slate-900">{t(en, arr)}</h2></div>);
  const btn = "rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 disabled:opacity-40";
  const rentIndex = "/" + params.locale + "/rent-index";

  const verdictChip = (c: Cell) => {
    if (c.verdict === "override") return (<span><span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{t("Thin (override)", "قليل (تجاوز)")}</span><span className="ms-1 text-xs text-slate-400">{t("computed: ", "محسوب: ")}{c.computed === "sufficient" ? t("Sufficient", "كافٍ") : c.computed === "disagree" ? t("Disagreement", "تعارض") : t("Thin", "قليل")}</span></span>);
    if (c.verdict === "sufficient") return <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">{t("Sufficient", "كافٍ")}</span>;
    if (c.verdict === "disagree") return <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{t("Disagreement", "تعارض المصادر")}</span>;
    return <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{t("Thin", "قليل")}</span>;
  };

  const tileTone = (bad: boolean, warnOnly?: boolean) => bad ? (warnOnly ? "border-amber-300 bg-amber-50 text-amber-900" : "border-rose-300 bg-rose-50 text-rose-900") : "border-slate-200 text-slate-900";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-10">
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">{t("SAMPLE DATA. Data-operations simulation. Everything below is synthetic and never reaches production. This page is not indexed.", "بيانات عيّنة. محاكاة عمليات البيانات. كل ما يظهر هنا اصطناعي ولا يصل إلى الإنتاج إطلاقاً. هذه الصفحة غير مفهرسة.")}</div>

      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("Data Operations", "عمليات البيانات")}</p>
        <h1 className="text-2xl font-semibold text-slate-900">{t("Ingestion console", "لوحة استقبال البيانات")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{t("Open with the answer: what needs attention right now. Then advance the period, inject scenarios, and act as Reviewer or Admin. Overrides can only make data more conservative, never promote thin data to sufficient.", "ابدأ بالجواب: ما الذي يتطلب انتباهاً الآن. ثم قدّم الفترة، واحقن السيناريوهات، وتصرّف كمراجع أو مدير. التجاوزات تجعل البيانات أكثر تحفظاً فقط، ولا ترفع القليل إلى كافٍ أبداً.")}</p>
      </header>

      <section aria-label={t("Health", "الصحة")}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <a href="#sources" className={"rounded-lg border p-3 " + tileTone(freshCount < sources.length, true)}><p className="text-xl font-semibold"><bdi dir="ltr">{freshCount}/{sources.length}</bdi></p><p className="text-xs opacity-70">{t("Sources fresh", "مصادر حديثة")}</p></a>
          <a href="#board" className={"rounded-lg border p-3 " + tileTone(cellsSuff < cells.length, true)}><p className="text-xl font-semibold"><bdi dir="ltr">{cellsSuff}/{cells.length}</bdi></p><p className="text-xs opacity-70">{t("Cells sufficient", "خلايا كافية")}</p></a>
          <a href="#gate" className={"rounded-lg border p-3 " + tileTone(gatesHeld > 0, true)}><p className="text-xl font-semibold"><bdi dir="ltr">{gatesHeld}</bdi></p><p className="text-xs opacity-70">{t("Gates held", "بوابات معلّقة")}</p></a>
          <a href="#alerts" className={"rounded-lg border p-3 " + tileTone(alerts.length > 0)}><p className="text-xl font-semibold"><bdi dir="ltr">{alerts.length}</bdi></p><p className="text-xs opacity-70">{t("Alerts open", "تنبيهات مفتوحة")}</p></a>
          <a href="#audit" className={"rounded-lg border p-3 " + tileTone(false)}><p className="truncate text-sm font-semibold">{audit[0] ? audit[0].action : t("none", "لا شيء")}</p><p className="text-xs opacity-70">{t("Last action", "آخر إجراء")}</p></a>
        </div>
      </section>

      <section>
        <H n="00" en="Needs attention" arr="يتطلب إجراء" />
        {worklist.length === 0 ? (<p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{t("Nothing needs attention. Sources fresh, cells reconciled, gate queue clear.", "لا شيء يتطلب انتباهاً. المصادر حديثة، الخلايا مطابَقة، وطابور البوابة نظيف.")}</p>) : (
          <ul className="space-y-1.5">{worklist.map((w, i) => (<li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm"><span className="flex items-center gap-2"><span className={"inline-block h-2 w-2 shrink-0 rounded-full " + (w.sev === "blocked" ? "bg-rose-500" : w.sev === "watch" ? "bg-amber-500" : "bg-slate-400")} /><span className="text-slate-700">{ar ? w.ar : w.en}</span></span><a href={w.anchor} className="shrink-0 rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600">{t("Go", "انتقال")}</a></li>))}</ul>
        )}
      </section>

      <section>
        <H n="01" en="Controls" arr="التحكم" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">{t("Operator:", "المشغّل:")}</span>
          <input value={op} onChange={(e) => setOp(e.target.value)} placeholder={t("your name", "اسمك")} className="rounded border border-slate-300 px-2 py-1 text-sm" />
          <span className="ms-3 text-xs text-slate-500">{t("Role:", "الدور:")}</span>
          {ROLES.map((r) => (<button key={r} onClick={() => setRole(r)} className={"rounded border px-3 py-1 text-sm " + (role === r ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700")}>{t(r === "viewer" ? "Viewer" : r === "reviewer" ? "Reviewer" : "Admin", r === "viewer" ? "مشاهد" : r === "reviewer" ? "مراجع" : "مدير")}</button>))}
          <span className="ms-3 text-xs text-slate-500">{t("Sim period:", "الفترة:")}</span>
          {["2026-06", "2026-07"].map((p) => (<button key={p} onClick={() => setPeriod(p)} className={"rounded border px-3 py-1 text-sm " + (period === p ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700")}>{p}</button>))}
          <button onClick={exportCsv} className="ms-2 rounded border border-slate-300 px-3 py-1 text-sm text-slate-700">{t("Reconciliation CSV", "تصدير CSV للمطابقة")}</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (<button key={s.id} onClick={() => toggle(s.id)} title={ar ? s.expAr : s.expEn} className={"rounded-full border px-3 py-1 text-xs " + (scn[s.id] ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-300 text-slate-600")}>{t(s.en, s.ar)}</button>))}
        </div>
        {SCENARIOS.some((s) => scn[s.id]) && (<div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900"><p className="mb-1 font-medium">{t("Active scenarios, expected outcome:", "السيناريوهات النشطة، النتيجة المتوقعة:")}</p><ul className="list-disc space-y-0.5 ps-5">{SCENARIOS.filter((s) => scn[s.id]).map((s) => (<li key={s.id}>{t(s.en, s.ar)}: {t(s.expEn, s.expAr)}</li>))}</ul></div>)}
      </section>

      <section id="alerts">
        <H n="02" en="Alerts" arr="التنبيهات" />
        {alerts.length === 0 ? (<p className="text-sm text-slate-500">{t("All sources fresh. No open alerts.", "جميع المصادر حديثة. لا تنبيهات مفتوحة.")}</p>) : (
          <div className="space-y-2">{alerts.map((s) => (<div key={s.name} className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"><span>{(ar ? s.nameAr : s.name)}: {s.note}</span><button onClick={() => doAck(s.name)} disabled={!can("review")} className={btn}>{t("Acknowledge", "إقرار")}</button></div>))}</div>
        )}
      </section>

      <section id="sources">
        <H n="03" en="Source health" arr="حالة المصادر" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sources.map((s) => (<div key={s.name} className="rounded-lg border border-slate-200 p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-slate-900">{ar ? s.nameAr : s.name}</p><span className={"inline-block h-2 w-2 shrink-0 rounded-full " + (s.ok ? "bg-emerald-500" : "bg-amber-500")} /></div><p className="mt-1 text-xs text-slate-500">{s.cad} · {s.last}</p><p className="mt-1 text-xs text-slate-600">{s.note}</p></div>))}
        </div>
      </section>

      <section id="board">
        <H n="04" en="Reconciliation board" arr="لوحة مطابقة المصادر" />
        <p className="mb-2 text-xs text-slate-500">{t("One row per cell (district × asset × segment). The verdict reconciles every source in the cell: where REGA and a broker cover the same cell and their medians fall outside tolerance the cell reads Disagreement and does not publish a number until resolved. Thin is conservative, not an error. An override can only make a cell more conservative. Expand a row to see the contributing sources.", "صف لكل خلية (الحي × الأصل × الشريحة). يوفّق الحكم كل مصادر الخلية: حين يغطي ريجا ووسيط الخلية نفسها ويخرج وسيطاهما عن الحد تُقرأ الخلية تعارض المصادر ولا تنشر رقماً حتى تُحلّ. القليل تحفظ لا خطأ. التجاوز يجعل الخلية أكثر تحفظاً فقط. وسّع الصف لرؤية المصادر المساهمة.")}</p>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2 text-start font-medium">{t("District", "الحي")}</th><th className="px-3 py-2 text-start font-medium">{t("Asset · Segment", "الأصل · الشريحة")}</th><th className="px-3 py-2 text-start font-medium">{t("Band", "النطاق")}</th><th className="px-3 py-2 text-start font-medium">{t("Median", "الوسيط")}</th><th className="px-3 py-2 text-start font-medium">{t("Verdict", "الحكم")}</th><th className="px-3 py-2 text-start font-medium">{t("Sources", "المصادر")}</th><th className="px-3 py-2 text-start font-medium">{t("Action", "إجراء")}</th></tr></thead>
            <tbody>
              {cells.map((c) => {
                const isOpen = !!openCell[c.k];
                return (<Fragment key={c.k}>
                  <tr className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2 text-slate-900">{ar ? c.districtAr : c.district}{c.unresolved && <span className="ms-1 rounded bg-amber-100 px-1 text-xs text-amber-800">{t("unresolved", "غير محلول")}</span>}{c.note && <span className="ms-1 rounded bg-slate-100 px-1 text-xs text-slate-600">{ar ? c.noteAr : c.note}</span>}</td>
                    <td className="px-3 py-2 text-slate-600">{t(c.asset, c.assetAr)} · {t(c.segEn, c.segAr)}</td>
                    <td className="px-3 py-2 text-slate-600"><bdi dir="ltr">{fmt(c.low)}–{fmt(c.high)}</bdi></td>
                    <td className="px-3 py-2 text-slate-900">{c.verdict === "sufficient" && c.median != null ? (<span><bdi dir="ltr">{fmt(c.median)}</bdi>{c.verdict === "sufficient" && <a href={rentIndex} className="ms-1 text-sky-600 underline">{t("→ live cell", "→ الخلية المنشورة")}</a>}</span>) : c.verdict === "disagree" ? t("Not published", "غير منشور") : t("Thin sample", "عينة قليلة")}</td>
                    <td className="px-3 py-2">{verdictChip(c)}</td>
                    <td className="px-3 py-2"><button onClick={() => setOpenCell((o) => ({ ...o, [c.k]: !o[c.k] }))} className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600">{isOpen ? "▾ " : "▸ "}<bdi dir="ltr">{c.rows.length}</bdi></button></td>
                    <td className="px-3 py-2">{c.verdict === "override" ? <button onClick={() => doRelease(c)} disabled={!can("admin")} className={btn}>{t("Release override", "رفع التجاوز")}</button> : c.unresolved ? <button onClick={() => doResolve(c)} disabled={!can("review")} className={btn}>{t("Resolve district", "حل الحي")}</button> : c.verdict === "sufficient" ? <button onClick={() => doForceThin(c)} disabled={!can("review")} className={btn}>{t("Force thin", "إجبار قليل")}</button> : <span className="text-xs text-slate-400">–</span>}</td>
                  </tr>
                  {isOpen && (<tr className="border-t border-slate-100 bg-slate-50/60"><td colSpan={7} className="px-3 py-2">
                    <table className="w-full text-xs"><thead className="text-slate-400"><tr><th className="px-2 py-1 text-start font-medium">{t("Source", "المصدر")}</th><th className="px-2 py-1 text-start font-medium">{t("Band", "النطاق")}</th><th className="px-2 py-1 text-start font-medium">{t("Median", "الوسيط")}</th><th className="px-2 py-1 text-start font-medium">{t("Basis", "الأساس")}</th><th className="px-2 py-1 text-start font-medium">{t("Sufficient", "كافٍ")}</th></tr></thead>
                    <tbody>{c.rows.map((r, ri) => (<tr key={ri} className="border-t border-slate-100"><td className="px-2 py-1 text-slate-600">{ar ? r.sourceAr : r.source} · {r.period}</td><td className="px-2 py-1 text-slate-600"><bdi dir="ltr">{fmt(r.low)}–{fmt(r.high)}</bdi></td><td className="px-2 py-1 text-slate-600"><bdi dir="ltr">{fmt(r.median)}</bdi></td><td className="px-2 py-1 text-slate-500">{ar ? r.basisAr : r.basis}</td><td className="px-2 py-1">{r.sufficient ? <span className="text-emerald-600">{t("yes", "نعم")}</span> : <span className="text-amber-600">{t("no", "لا")}</span>}</td></tr>))}</tbody></table>
                    {c.verdict === "disagree" && <p className="mt-1 text-xs text-amber-700">{t("Sources spread " + Math.round(c.spreadPct * 100) + "% apart, beyond the 12% tolerance. Conservative resolution: hold, do not publish a median.", "المصادر متباعدة " + Math.round(c.spreadPct * 100) + "٪، خارج حد 12٪. الحل المتحفظ: تعليق، دون نشر وسيط.")}</p>}
                  </td></tr>)}
                </Fragment>);
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section id="gate">
        <H n="05" en="Verification gate queue" arr="طابور بوابة التحقق" />
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2 text-start font-medium">{t("Listing", "الإعلان")}</th><th className="px-3 py-2 text-start font-medium">{t("Nafath", "نفاذ")}</th><th className="px-3 py-2 text-start font-medium">{t("Permit", "الرخصة")}</th><th className="px-3 py-2 text-start font-medium">{t("Deed", "الصك")}</th><th className="px-3 py-2 text-start font-medium">{t("Status", "الحالة")}</th><th className="px-3 py-2 text-start font-medium">{t("Actions", "إجراءات")}</th></tr></thead>
            <tbody>
              {listings.map((l) => { const st = listStatus(l); const blocked = !gatesPass(l); const gr = gateReason(l); return (<tr key={l.ref} className="border-t border-slate-100">
                <td className="px-3 py-2"><span className="font-medium text-slate-900" dir="ltr">{l.ref}</span><span className="text-slate-500"> · {ar ? l.districtAr : l.district} · {t(l.asset, l.assetAr)} · {t(l.deal, l.dealAr)}</span>{l.dup && <span className="ms-1 rounded bg-rose-100 px-1 text-xs text-rose-700">{t("duplicate deed", "صك مكرر")}</span>}</td>
                <td className="px-3 py-2">{l.nafath ? "✓" : <span className="text-rose-600">✕</span>}</td>
                <td className="px-3 py-2"><span dir="ltr">{l.permit || "–"}</span>{l.permitOk === false && <span className="ms-1 rounded bg-rose-100 px-1 text-xs text-rose-700">{t("expired", "منتهية")}</span>}</td>
                <td className="px-3 py-2">{l.deed === "valid" ? t("Valid", "سارٍ") : l.deed === "not_found" ? <span className="text-rose-600">{t("Not found", "غير موجود")}</span> : l.deed === "duplicate" ? <span className="text-rose-600">{t("Duplicate", "مكرر")}</span> : t("Pending", "قيد الانتظار")}</td>
                <td className="px-3 py-2">{st === "published" || st === "approved" ? <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">{st === "approved" ? t("Approved", "معتمد") : t("Published", "منشور")}</span> : st === "rejected" ? <span className="rounded bg-rose-50 px-2 py-0.5 text-xs text-rose-700">{t("Rejected", "مرفوض")}</span> : <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{t("Held", "معلّق")}</span>}</td>
                <td className="px-3 py-2"><div className="flex flex-wrap items-center gap-1"><button onClick={() => doListing(l, "approved")} disabled={!can("review") || blocked} title={blocked ? (ar ? gr.ar : gr.en) : ""} className={btn}>{t("Approve", "اعتماد")}</button><button onClick={() => doListing(l, "rejected")} disabled={!can("review")} className={btn}>{t("Reject", "رفض")}</button><button onClick={() => doListing(l, "held")} disabled={!can("review")} className={btn}>{t("Hold", "تعليق")}</button>{blocked && gr.en && <span className="text-xs text-rose-600">{ar ? gr.ar : gr.en}</span>}</div></td>
              </tr>); })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">{t("Approve is disabled until Nafath, a valid permit, and the deed all pass; the disabled button names the failing gate. The asymmetry rule applies here too: a failed gate can never be published.", "الاعتماد معطّل حتى تجتاز نفاذ ورخصة سارية والصك جميعاً؛ الزر المعطّل يذكر البوابة المتعثرة. قاعدة عدم التناظر تنطبق هنا أيضاً: البوابة غير المجتازة لا تُنشَر أبداً.")}</p>
      </section>

      <section id="audit">
        <H n="06" en="Audit trail" arr="سجل التدقيق" />
        <div className="mb-2 flex items-center justify-between"><p className="text-xs text-slate-500">{t("In-memory in this slice. Times in KSA (UTC+3). Append-only once persisted.", "في الذاكرة في هذه المرحلة. الأوقات بتوقيت السعودية (UTC+3). للإضافة فقط بعد الحفظ.")}</p>{audit.length > 0 && <button onClick={exportAudit} className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700">{t("Audit CSV", "تصدير سجل CSV")}</button>}</div>
        {audit.length === 0 ? (<p className="text-sm text-slate-500">{t("No actions yet. Enter your name, switch to Reviewer or Admin, and act on a row.", "لا إجراءات بعد. أدخل اسمك، وبدّل إلى مراجع أو مدير، وتصرّف على صف.")}</p>) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2 text-start font-medium">{t("Time (KSA)", "الوقت (السعودية)")}</th><th className="px-3 py-2 text-start font-medium">{t("Operator", "المشغّل")}</th><th className="px-3 py-2 text-start font-medium">{t("Role", "الدور")}</th><th className="px-3 py-2 text-start font-medium">{t("Action", "الإجراء")}</th><th className="px-3 py-2 text-start font-medium">{t("Target", "الهدف")}</th><th className="px-3 py-2 text-start font-medium">{t("Change", "التغيير")}</th><th className="px-3 py-2 text-start font-medium">{t("Reason", "السبب")}</th></tr></thead><tbody>{audit.map((a, i) => (<tr key={i} className="border-t border-slate-100"><td className="px-3 py-2 text-slate-600" dir="ltr">{a.ts}</td><td className="px-3 py-2 text-slate-600">{a.op}</td><td className="px-3 py-2 text-slate-600">{a.role}</td><td className="px-3 py-2 text-slate-900">{a.action}</td><td className="px-3 py-2 text-slate-600" dir="ltr">{a.target}</td><td className="px-3 py-2 text-slate-600">{a.change}</td><td className="px-3 py-2 text-slate-600">{a.reason}</td></tr>))}</tbody></table></div>
        )}
      </section>

      <section>
        <H n="07" en="Reports" arr="التقارير" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-2xl font-semibold text-slate-900"><bdi dir="ltr">{cellsSuff}/{cells.length}</bdi></p><p className="text-xs text-slate-500">{t("Cells sufficient", "خلايا كافية")}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-2xl font-semibold text-slate-900"><bdi dir="ltr">{pubCount}/{listings.length}</bdi></p><p className="text-xs text-slate-500">{t("Listings published", "إعلانات منشورة")}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-2xl font-semibold text-slate-900"><bdi dir="ltr">{audit.length}</bdi></p><p className="text-xs text-slate-500">{t("Actions logged", "إجراءات مسجّلة")}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-2xl font-semibold text-slate-900"><bdi dir="ltr">{worklist.length}</bdi></p><p className="text-xs text-slate-500">{t("Items needing attention", "بنود تتطلب إجراء")}</p></div>
        </div>
        <p className="mt-3 text-xs text-slate-500">{t("Next: in-page reason drawer (replacing prompts), URL-persisted filters and saved views, per-cell and per-source drill-down drawers, scenario regression suite. Then auth + append-only audit table + synthetic Supabase branch. Needs SUPABASE_SERVICE_ROLE_KEY.", "التالي: لوحة سبب داخل الصفحة بدل النوافذ، مرشّحات محفوظة في الرابط وعروض محفوظة، أدراج تفصيل لكل خلية ومصدر، مجموعة اختبار انحدار للسيناريوهات. ثم مصادقة وجدول تدقيق للإضافة فقط وفرع Supabase اصطناعي.")}</p>
      </section>

      <footer className="border-t border-slate-100 pt-4 text-xs text-slate-400">{t("SAT Markets data operations. Synthetic simulation. FAL 1200025510.", "عمليات بيانات سات ماركتس. محاكاة اصطناعية. رخصة فال 1200025510.")}</footer>
    </main>
  );
}
