"use client";
// src/app/[locale]/ops/page.tsx
// SAT Markets - Data Operations simulation console (Slice 4 + expanded fixtures, bilingual EN/AR).
// Data expansion (Fable 5 world-class advisory, section 6): more districts, overlapping
// source cells (REGA + broker on the same grade so reconciliation actually has overlap),
// a thin gradient (n=7/11/19/27/29), a second unresolved crosswalk (Qurtubah), and a fuller
// gate queue (expired permit, duplicate-deed pair, Nafath-unverified, pre-rejected).
// All data is SYNTHETIC. Never production. See ops/layout.tsx for noindex.

import { useMemo, useState } from "react";

type Seg = "blended" | "grade_a" | "grade_b" | "modern";
type Row = {
  district: string; districtAr: string; asset: string; assetAr: string;
  segment: Seg; segEn: string; segAr: string;
  low: number; median: number; high: number; sufficient: boolean;
  src: "rega" | "broker"; period: string; source: string; sourceAr: string;
  basis: string; basisAr: string; resolved: boolean; note?: string; noteAr?: string;
  computed?: boolean; ov?: boolean; cell?: string;
};

const REGA = "REGA Rental Index (Ejar)";
const REGA_AR = "مؤشر ريجا للإيجارات (إيجار)";
const BJLL = "Published: JLL";
const BJLL_AR = "منشور: JLL";
const B3 = "Published: CBRE, JLL, Knight Frank";
const B3_AR = "منشور: CBRE و JLL و Knight Frank";

const BASE: Row[] = [
  // REGA blended (base signal)
  { district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 1200, median: 1700, high: 2200, sufficient: true, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=412, min 30", basisAr: "ن=412، الحد 30", resolved: true, cell: "al-olaya/office" },
  { district: "Al Malaz", districtAr: "الملز", asset: "Office", assetAr: "مكاتب", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 700, median: 980, high: 1300, sufficient: true, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=208, min 30", basisAr: "ن=208، الحد 30", resolved: true, cell: "al-malaz/office" },
  { district: "Granada", districtAr: "غرناطة", asset: "Office", assetAr: "مكاتب", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 1000, median: 1350, high: 1800, sufficient: true, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=151, min 30", basisAr: "ن=151، الحد 30", resolved: true, cell: "granada/office" },
  { district: "KAFD", districtAr: "كافد", asset: "Office", assetAr: "مكاتب", segment: "grade_a", segEn: "Grade A", segAr: "الفئة أ", low: 3400, median: 3700, high: 4100, sufficient: true, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=88, min 30", basisAr: "ن=88، الحد 30", resolved: true, cell: "kafd/office" },
  { district: "Al Yasmin", districtAr: "الياسمين", asset: "Office", assetAr: "مكاتب", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 950, median: 1150, high: 1450, sufficient: true, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=38, min 30", basisAr: "ن=38، الحد 30", resolved: true, cell: "al-yasmin/office" },
  { district: "Al Olaya", districtAr: "العليا", asset: "Retail", assetAr: "تجزئة", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 1800, median: 2600, high: 3600, sufficient: true, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=96, min 30", basisAr: "ن=96، الحد 30", resolved: true, cell: "al-olaya/retail" },
  { district: "Granada", districtAr: "غرناطة", asset: "Retail", assetAr: "تجزئة", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 1300, median: 1900, high: 2600, sufficient: true, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=44, min 30", basisAr: "ن=44، الحد 30", resolved: true, cell: "granada/retail" },
  { district: "Al Malaz", districtAr: "الملز", asset: "Warehouse", assetAr: "مستودعات", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 180, median: 240, high: 320, sufficient: true, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=63, min 30", basisAr: "ن=63، الحد 30", resolved: true, cell: "al-malaz/warehouse" },
  // Thin gradient (varied distance below min 30)
  { district: "Al Malaz", districtAr: "الملز", asset: "Retail", assetAr: "تجزئة", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 1100, median: 1400, high: 1750, sufficient: false, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=19, min 30, below threshold", basisAr: "ن=19، الحد 30، دون الحد", resolved: true, cell: "al-malaz/retail" },
  { district: "As Sulimaniyah", districtAr: "السليمانية", asset: "Retail", assetAr: "تجزئة", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 1700, median: 2100, high: 2600, sufficient: false, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=27, min 30, below threshold", basisAr: "ن=27، الحد 30، دون الحد", resolved: true, cell: "as-sulimaniyah/retail" },
  { district: "Al Yasmin", districtAr: "الياسمين", asset: "Retail", assetAr: "تجزئة", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 1300, median: 1600, high: 2000, sufficient: false, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=29, min 30, below threshold", basisAr: "ن=29، الحد 30، دون الحد", resolved: true, cell: "al-yasmin/retail" },
  // Unresolved crosswalks (two now)
  { district: "An Narjis", districtAr: "النرجس", asset: "Office", assetAr: "مكاتب", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 600, median: 760, high: 980, sufficient: false, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=7, min 30, below threshold", basisAr: "ن=7، الحد 30، دون الحد", resolved: false, cell: "an-narjis/office" },
  { district: "Qurtubah", districtAr: "قرطبة", asset: "Office", assetAr: "مكاتب", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 700, median: 900, high: 1150, sufficient: false, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=11, min 30, unresolved crosswalk", basisAr: "ن=11، الحد 30، مطابقة غير محلولة", resolved: false, cell: "qurtubah/office" },
  // REGA per-grade (so they OVERLAP the broker grade rows below on the same cell)
  { district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", segment: "grade_a", segEn: "Grade A", segAr: "الفئة أ", low: 1580, median: 1720, high: 1900, sufficient: true, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=64, min 30", basisAr: "ن=64، الحد 30", resolved: true, cell: "al-olaya/office-a" },
  { district: "Granada", districtAr: "غرناطة", asset: "Office", assetAr: "مكاتب", segment: "grade_a", segEn: "Grade A", segAr: "الفئة أ", low: 1350, median: 1480, high: 1700, sufficient: true, src: "rega", period: "2026-06", source: REGA, sourceAr: REGA_AR, basis: "n=42, min 30", basisAr: "ن=42، الحد 30", resolved: true, cell: "granada/office-a" },
  // Broker overlay (grade level). Overlaps REGA grade rows above: KAFD + Granada agree, Al Olaya disagrees.
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
  { id: "disagree", en: "Brokers disagree", ar: "اختلاف الوسطاء", expEn: "Al Olaya Grade A becomes insufficient and the broker source card turns amber.", expAr: "الفئة أ للعليا تصبح غير كافية وبطاقة مصدر الوسطاء تتحول للكهرماني." },
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
const keyOf = (r: Row) => r.district + "|" + r.asset + "|" + r.segment + "|" + r.src;
// KSA is UTC+3, no DST.
const ksaNow = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");

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

  const can = (a: "review" | "admin") => (a === "review" ? role !== "viewer" : role === "admin");
  const log = (action: string, target: string, change: string, reason: string) =>
    setAudit((l) => [{ ts: ksaNow(), op: op.trim() || "(unnamed)", role, action, target, change, reason }, ...l]);
  const ask = (label: string) => (typeof window === "undefined" ? "" : window.prompt(label) || "");

  const index = useMemo(() => {
    let rows: Row[] = BASE.map((r) => ({ ...r }));
    if (period === "2026-07") {
      rows.push({ district: "An Nakheel", districtAr: "النخيل", asset: "Office", assetAr: "مكاتب", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 900, median: 1150, high: 1500, sufficient: true, src: "rega", period: "2026-07", source: REGA, sourceAr: REGA_AR, basis: "n=58, min 30", basisAr: "ن=58، الحد 30", resolved: true, cell: "an-nakheel/office" });
      // period drift: Al Yasmin retail rose over the threshold (Thin -> Sufficient)
      rows = rows.map((r) => (r.district === "Al Yasmin" && r.asset === "Retail" ? { ...r, sufficient: true, low: 1400, median: 1700, high: 2100, basis: "n=34, min 30", basisAr: "ن=34، الحد 30" } : r));
      // overlay aged out: Al Yasmin broker grade A now stale (Sufficient -> Thin)
      rows = rows.map((r) => (r.district === "Granada" && r.segment === "grade_a" && r.src === "rega" ? { ...r, sufficient: false, basis: "n=24, min 30, below threshold", basisAr: "ن=24، الحد 30، دون الحد" } : r));
    }
    if (scn.thin) rows = rows.map((r) => (r.district === "Granada" && r.asset === "Retail" ? { ...r, sufficient: false, basis: "n=9, min 30, below threshold", basisAr: "ن=9، الحد 30، دون الحد" } : r));
    if (scn.disagree) rows = rows.map((r) => (r.district === "Al Olaya" && r.segment === "grade_a" ? { ...r, sufficient: false, basis: "sources outside tolerance", basisAr: "مصادر خارج الحد", note: "disagreement", noteAr: "تعارض المصادر" } : r));
    if (scn.restate) rows = rows.map((r) => (r.district === "Al Olaya" && r.asset === "Office" && r.segment === "blended" ? { ...r, median: 1650, note: "restated", noteAr: "مُصحَّح" } : r));
    rows = rows.map((r) => (resolvedOv[keyOf(r)] ? { ...r, resolved: true, sufficient: true, basis: "n=34, min 30, after crosswalk", basisAr: "ن=34، الحد 30، بعد المطابقة" } : r));
    rows = rows.map((r) => (forcedThin[keyOf(r)] ? { ...r, computed: r.sufficient, ov: true, sufficient: false, note: "forced thin", noteAr: "أُجبر قليل" } : r));
    return rows;
  }, [period, scn, forcedThin, resolvedOv]);

  const listings = useMemo(() => {
    return LISTINGS.map((l) => (scn.deed && l.ref === "SAT-1847" ? { ...l, deed: "not_found" as Deed } : l));
  }, [scn.deed]);

  const liveN = t("live", "مباشر");
  const sources = useMemo(() => {
    const narjisResolved = resolvedOv["An Narjis|Office|blended|rega"];
    return [
      { name: "REGA / Ejar Rental Index", nameAr: REGA_AR, cad: t("Dated, monthly", "مؤرخ، شهري"), last: scn.stale ? "2026-05" : period, ok: !scn.stale, note: scn.stale ? t("stale, expected " + period, "قديمة، المتوقع " + period) : t("rows received", "صفوف مستلمة") },
      { name: "Broker benchmarks", nameAr: "مراجع الوسطاء", cad: t("Dated, quarterly", "مؤرخ، ربعي"), last: "2026-Q1", ok: !scn.disagree, note: scn.disagree ? t("disagreement flagged", "تعارض موسوم") : t("overlay valid 1 quarter", "التراكب صالح ربعاً") },
      { name: "SPL National Address", nameAr: "العنوان الوطني (سبل)", cad: t("Live API", "واجهة مباشرة"), last: liveN, ok: true, note: narjisResolved ? t("1 district unresolved (Qurtubah)", "حي غير محلول (قرطبة)") : t("2 districts unresolved (An Narjis, Qurtubah)", "حيّان غير محلولين (النرجس، قرطبة)") },
      { name: "Wathq (deeds)", nameAr: "واثق (الصكوك)", cad: t("Live, per listing", "مباشر، لكل إعلان"), last: liveN, ok: true, note: scn.deed ? t("2 deeds failed", "صكان غير صالحين") : t("1 not found, 1 duplicate", "صك غير موجود، وصك مكرر") },
      { name: "Nafath (identity)", nameAr: "نفاذ (الهوية)", cad: t("Live OIDC", "مباشر OIDC"), last: liveN, ok: true, note: t("1 unverified (SAT-2077)", "واحد غير موثّق (SAT-2077)") },
      { name: "REGA advertising permit", nameAr: "رخصة الإعلان", cad: t("Live inquiry", "استعلام مباشر"), last: liveN, ok: true, note: t("1 expired (SAT-2044)", "واحدة منتهية (SAT-2044)") },
      { name: "GASTAT / SAMA (context)", nameAr: "الإحصاء / ساما", cad: t("Dated, monthly", "مؤرخ، شهري"), last: period, ok: true, note: t("context only", "سياق فقط") },
      { name: "Foursquare / Mapbox (geo)", nameAr: "Foursquare / Mapbox", cad: t("Snapshot / live", "لقطة / مباشر"), last: period, ok: true, note: t("POI + isochrones", "نقاط + عزل زمني") },
    ];
  }, [period, scn, ar, resolvedOv]);

  const gatesPass = (l: Listing) => l.nafath && !!l.permit && l.permitOk !== false && l.deed === "valid";
  const listStatus = (l: Listing) => {
    if (listingOv[l.ref]) return listingOv[l.ref];
    if (l.init) return l.init;
    return gatesPass(l) ? "published" : "held";
  };
  const alerts = sources.filter((s) => !s.ok && !acked[s.name]);
  const suffCount = index.filter((r) => r.sufficient).length;
  const pubCount = listings.filter((l) => listStatus(l) === "published").length;

  const doListing = (l: Listing, status: string) => {
    if (!can("review")) return;
    if (status === "approved" && !gatesPass(l)) return; // asymmetry rule, listing side
    const reason = ask(t("Reason for " + status + " on " + l.ref, "سبب " + status + " على " + l.ref)); if (!reason) return;
    const prev = listStatus(l);
    setListingOv((o) => ({ ...o, [l.ref]: status })); log(status, l.ref, prev + " → " + status, reason);
  };
  const doForceThin = (r: Row) => { if (!can("review")) return; const reason = ask(t("Reason to force thin", "سبب الإجبار على قليل")); if (!reason) return; setForcedThin((f) => ({ ...f, [keyOf(r)]: reason })); log("force_thin", keyOf(r), t("sufficient → thin (override)", "كافٍ → قليل (تجاوز)"), reason); };
  const doRelease = (r: Row) => { if (!can("admin")) return; const reason = ask(t("Reason to release override", "سبب رفع التجاوز")); if (!reason) return; setForcedThin((f) => { const n = { ...f }; delete n[keyOf(r)]; return n; }); log("release_override", keyOf(r), t("override → computed", "تجاوز → محسوب"), reason); };
  const doResolve = (r: Row) => { if (!can("review")) return; const reason = ask(t("District to map (reason)", "الحي للمطابقة (سبب)")); if (!reason) return; setResolvedOv((o) => ({ ...o, [keyOf(r)]: true })); log("resolve_district", keyOf(r), t("unresolved → resolved", "غير محلول → محلول"), reason); };
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-10">
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">{t("SAMPLE DATA. Data-operations simulation. Everything below is synthetic and never reaches production. This page is not indexed.", "بيانات عيّنة. محاكاة عمليات البيانات. كل ما يظهر هنا اصطناعي ولا يصل إلى الإنتاج إطلاقاً. هذه الصفحة غير مفهرسة.")}</div>

      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("Data Operations", "عمليات البيانات")}</p>
        <h1 className="text-2xl font-semibold text-slate-900">{t("Ingestion simulation console", "محاكاة استقبال البيانات")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{t("Advance the period, inject scenarios, act on the data as a Reviewer or Admin, and watch the audit trail. Overrides can only make data more conservative, never promote thin data to sufficient.", "قدّم الفترة، واحقن السيناريوهات، وتصرّف على البيانات كمراجع أو مدير، وتابع سجل التدقيق. التجاوزات تجعل البيانات أكثر تحفظاً فقط، ولا ترفع القليل إلى كافٍ أبداً.")}</p>
      </header>

      <section>
        <H n="00" en="Controls" arr="التحكم" />
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

      <section>
        <H n="01" en="Alerts" arr="التنبيهات" />
        {alerts.length === 0 ? (<p className="text-sm text-slate-500">{t("All sources fresh. No open alerts.", "جميع المصادر حديثة. لا تنبيهات مفتوحة.")}</p>) : (
          <div className="space-y-2">{alerts.map((s) => (<div key={s.name} className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"><span>{(ar ? s.nameAr : s.name)}: {s.note}</span><button onClick={() => doAck(s.name)} disabled={!can("review")} className={btn}>{t("Acknowledge", "إقرار")}</button></div>))}</div>
        )}
      </section>

      <section>
        <H n="02" en="Source health" arr="حالة المصادر" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sources.map((s) => (<div key={s.name} className="rounded-lg border border-slate-200 p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-slate-900">{ar ? s.nameAr : s.name}</p><span className={"inline-block h-2 w-2 shrink-0 rounded-full " + (s.ok ? "bg-emerald-500" : "bg-amber-500")} /></div><p className="mt-1 text-xs text-slate-500">{s.cad} · {s.last}</p><p className="mt-1 text-xs text-slate-600">{s.note}</p></div>))}
        </div>
      </section>

      <section>
        <H n="03" en="Reconciliation board" arr="لوحة مطابقة المصادر" />
        <p className="mb-2 text-xs text-slate-500">{t("One row per source per cell. Where two sources cover the same district and segment they can be compared; a spread beyond tolerance is a disagreement. Verdict is computed from the basis, never hand-edited. An override can only make a cell more conservative.", "صف لكل مصدر لكل خلية. حين يغطي مصدران الحي والشريحة نفسها يمكن مقارنتهما؛ فارق يتجاوز الحد هو تعارض. الحكم محسوب من الأساس، لا يُحرَّر يدوياً. التجاوز يجعل الخلية أكثر تحفظاً فقط.")}</p>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2 text-start font-medium">{t("District", "الحي")}</th><th className="px-3 py-2 text-start font-medium">{t("Asset · Segment", "الأصل · الشريحة")}</th><th className="px-3 py-2 text-start font-medium">{t("Source", "المصدر")}</th><th className="px-3 py-2 text-start font-medium">{t("Band", "النطاق")}</th><th className="px-3 py-2 text-start font-medium">{t("Median", "الوسيط")}</th><th className="px-3 py-2 text-start font-medium">{t("Basis", "الأساس")}</th><th className="px-3 py-2 text-start font-medium">{t("Verdict", "الحكم")}</th><th className="px-3 py-2 text-start font-medium">{t("Action", "إجراء")}</th></tr></thead>
            <tbody>
              {index.map((r, i) => (<tr key={i} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-900">{ar ? r.districtAr : r.district}{!r.resolved && <span className="ms-1 rounded bg-amber-100 px-1 text-xs text-amber-800">{t("unresolved", "غير محلول")}</span>}</td>
                <td className="px-3 py-2 text-slate-600">{t(r.asset, r.assetAr)} · {t(r.segEn, r.segAr)}</td>
                <td className="px-3 py-2 text-slate-600">{ar ? r.sourceAr : r.source} · {r.period}{r.note && <span className="ms-1 rounded bg-rose-100 px-1 text-xs text-rose-700">{ar ? r.noteAr : r.note}</span>}{r.sufficient && r.cell && <a href={rentIndex} className="ms-1 text-sky-600 underline">{t("→ live cell", "→ الخلية المنشورة")}</a>}</td>
                <td className="px-3 py-2 text-slate-600"><bdi dir="ltr">{fmt(r.low)}–{fmt(r.high)}</bdi></td>
                <td className="px-3 py-2 text-slate-900">{r.sufficient ? fmt(r.median) : t("Thin sample", "عينة قليلة")}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{ar ? r.basisAr : r.basis}</td>
                <td className="px-3 py-2">{r.ov ? (<span><span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{t("Thin (override)", "قليل (تجاوز)")}</span><span className="ms-1 text-xs text-slate-400">{t("computed: ", "محسوب: ")}{r.computed ? t("Sufficient", "كافٍ") : t("Thin", "قليل")}</span></span>) : r.sufficient ? <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">{t("Sufficient", "كافٍ")}</span> : <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{t("Thin", "قليل")}</span>}</td>
                <td className="px-3 py-2">{r.ov ? <button onClick={() => doRelease(r)} disabled={!can("admin")} className={btn}>{t("Release override", "رفع التجاوز")}</button> : !r.resolved ? <button onClick={() => doResolve(r)} disabled={!can("review")} className={btn}>{t("Resolve district", "حل الحي")}</button> : r.sufficient ? <button onClick={() => doForceThin(r)} disabled={!can("review")} className={btn}>{t("Force thin", "إجبار قليل")}</button> : <span className="text-xs text-slate-400">—</span>}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <H n="04" en="Verification gate queue" arr="طابور بوابة التحقق" />
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2 text-start font-medium">{t("Listing", "الإعلان")}</th><th className="px-3 py-2 text-start font-medium">{t("Nafath", "نفاذ")}</th><th className="px-3 py-2 text-start font-medium">{t("Permit", "الرخصة")}</th><th className="px-3 py-2 text-start font-medium">{t("Deed", "الصك")}</th><th className="px-3 py-2 text-start font-medium">{t("Status", "الحالة")}</th><th className="px-3 py-2 text-start font-medium">{t("Actions", "إجراءات")}</th></tr></thead>
            <tbody>
              {listings.map((l) => { const st = listStatus(l); const blocked = !gatesPass(l); return (<tr key={l.ref} className="border-t border-slate-100">
                <td className="px-3 py-2"><span className="font-medium text-slate-900" dir="ltr">{l.ref}</span><span className="text-slate-500"> · {ar ? l.districtAr : l.district} · {t(l.asset, l.assetAr)} · {t(l.deal, l.dealAr)}</span>{l.dup && <span className="ms-1 rounded bg-rose-100 px-1 text-xs text-rose-700">{t("duplicate deed", "صك مكرر")}</span>}</td>
                <td className="px-3 py-2">{l.nafath ? "✓" : <span className="text-rose-600">✕</span>}</td>
                <td className="px-3 py-2"><span dir="ltr">{l.permit || "—"}</span>{l.permitOk === false && <span className="ms-1 rounded bg-rose-100 px-1 text-xs text-rose-700">{t("expired", "منتهية")}</span>}</td>
                <td className="px-3 py-2">{l.deed === "valid" ? t("Valid", "سارٍ") : l.deed === "not_found" ? <span className="text-rose-600">{t("Not found", "غير موجود")}</span> : l.deed === "duplicate" ? <span className="text-rose-600">{t("Duplicate", "مكرر")}</span> : t("Pending", "قيد الانتظار")}</td>
                <td className="px-3 py-2">{st === "published" || st === "approved" ? <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">{st === "approved" ? t("Approved", "معتمد") : t("Published", "منشور")}</span> : st === "rejected" ? <span className="rounded bg-rose-50 px-2 py-0.5 text-xs text-rose-700">{t("Rejected", "مرفوض")}</span> : <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{t("Held", "معلّق")}</span>}</td>
                <td className="px-3 py-2"><div className="flex flex-wrap items-center gap-1"><button onClick={() => doListing(l, "approved")} disabled={!can("review") || blocked} title={blocked ? t("A hard gate has not passed", "لم تجتز بوابة إلزامية") : ""} className={btn}>{t("Approve", "اعتماد")}</button><button onClick={() => doListing(l, "rejected")} disabled={!can("review")} className={btn}>{t("Reject", "رفض")}</button><button onClick={() => doListing(l, "held")} disabled={!can("review")} className={btn}>{t("Hold", "تعليق")}</button>{blocked && <span className="text-xs text-rose-600">{t("gate failed", "بوابة غير مجتازة")}</span>}</div></td>
              </tr>); })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">{t("Approve is disabled until Nafath, a valid permit, and the deed all pass. The asymmetry rule applies here too: a failed gate can never be published.", "الاعتماد معطّل حتى تجتاز نفاذ ورخصة سارية والصك جميعاً. قاعدة عدم التناظر تنطبق هنا أيضاً: البوابة غير المجتازة لا تُنشَر أبداً.")}</p>
      </section>

      <section>
        <H n="05" en="Audit trail" arr="سجل التدقيق" />
        <div className="mb-2 flex items-center justify-between"><p className="text-xs text-slate-500">{t("In-memory in this slice. Times in KSA (UTC+3). Append-only once persisted.", "في الذاكرة في هذه المرحلة. الأوقات بتوقيت السعودية (UTC+3). للإضافة فقط بعد الحفظ.")}</p>{audit.length > 0 && <button onClick={exportAudit} className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700">{t("Audit CSV", "تصدير سجل CSV")}</button>}</div>
        {audit.length === 0 ? (<p className="text-sm text-slate-500">{t("No actions yet. Enter your name, switch to Reviewer or Admin, and act on a row.", "لا إجراءات بعد. أدخل اسمك، وبدّل إلى مراجع أو مدير، وتصرّف على صف.")}</p>) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2 text-start font-medium">{t("Time (KSA)", "الوقت (السعودية)")}</th><th className="px-3 py-2 text-start font-medium">{t("Operator", "المشغّل")}</th><th className="px-3 py-2 text-start font-medium">{t("Role", "الدور")}</th><th className="px-3 py-2 text-start font-medium">{t("Action", "الإجراء")}</th><th className="px-3 py-2 text-start font-medium">{t("Target", "الهدف")}</th><th className="px-3 py-2 text-start font-medium">{t("Change", "التغيير")}</th><th className="px-3 py-2 text-start font-medium">{t("Reason", "السبب")}</th></tr></thead><tbody>{audit.map((a, i) => (<tr key={i} className="border-t border-slate-100"><td className="px-3 py-2 text-slate-600" dir="ltr">{a.ts}</td><td className="px-3 py-2 text-slate-600">{a.op}</td><td className="px-3 py-2 text-slate-600">{a.role}</td><td className="px-3 py-2 text-slate-900">{a.action}</td><td className="px-3 py-2 text-slate-600" dir="ltr">{a.target}</td><td className="px-3 py-2 text-slate-600">{a.change}</td><td className="px-3 py-2 text-slate-600">{a.reason}</td></tr>))}</tbody></table></div>
        )}
      </section>

      <section>
        <H n="06" en="Reports" arr="التقارير" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-2xl font-semibold text-slate-900">{suffCount}/{index.length}</p><p className="text-xs text-slate-500">{t("Index rows sufficient", "صفوف كافية")}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-2xl font-semibold text-slate-900">{pubCount}/{listings.length}</p><p className="text-xs text-slate-500">{t("Listings published", "إعلانات منشورة")}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-2xl font-semibold text-slate-900">{audit.length}</p><p className="text-xs text-slate-500">{t("Actions logged", "إجراءات مسجّلة")}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-2xl font-semibold text-slate-900">{alerts.length}</p><p className="text-xs text-slate-500">{t("Open alerts", "تنبيهات مفتوحة")}</p></div>
        </div>
        <p className="mt-3 text-xs text-slate-500">{t("Next: cell-grouped reconciliation, health header + needs-attention worklist, in-page reason drawer, filters. Then auth + append-only audit table + synthetic Supabase branch. Needs SUPABASE_SERVICE_ROLE_KEY.", "التالي: مطابقة مجمّعة بالخلية، ترويسة صحة + قائمة عمل، لوحة سبب داخل الصفحة، مرشّحات. ثم مصادقة وجدول تدقيق للإضافة فقط وفرع Supabase اصطناعي. يتطلب مفتاح الخدمة.")}</p>
      </section>

      <footer className="border-t border-slate-100 pt-4 text-xs text-slate-400">{t("SAT Markets data operations. Synthetic simulation. FAL 1200025510.", "عمليات بيانات سات ماركتس. محاكاة اصطناعية. رخصة فال 1200025510.")}</footer>
    </main>
  );
}
