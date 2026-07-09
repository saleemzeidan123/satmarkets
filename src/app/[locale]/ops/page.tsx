"use client";
// src/app/[locale]/ops/page.tsx
// SAT Markets - Data Operations simulation console (Slice 3, bilingual EN/AR).
// Adds: role switcher (Viewer/Reviewer/Admin), management actions (approve/reject/hold/force-thin)
// with a required reason and an in-memory audit trail, and a stale-source alerts panel.
// All data is SYNTHETIC. Never production.

import { useMemo, useState } from "react";

type Seg = "blended" | "grade_a" | "grade_b" | "modern";
type Row = {
  district: string; districtAr: string; asset: string; assetAr: string;
  segment: Seg; segEn: string; segAr: string;
  low: number; median: number; high: number; sufficient: boolean;
  src: "rega" | "broker"; period: string; source: string; sourceAr: string;
  basis: string; basisAr: string; resolved: boolean; note?: string; noteAr?: string;
};

const BASE: Row[] = [
  { district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 1200, median: 1700, high: 2200, sufficient: true, src: "rega", period: "2026-06", source: "REGA Rental Index (Ejar)", sourceAr: "مؤشر إيجار", basis: "412 transactions", basisAr: "412 صفقة", resolved: true },
  { district: "Al Malaz", districtAr: "الملز", asset: "Office", assetAr: "مكاتب", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 700, median: 980, high: 1300, sufficient: true, src: "rega", period: "2026-06", source: "REGA Rental Index (Ejar)", sourceAr: "مؤشر إيجار", basis: "208 transactions", basisAr: "208 صفقة", resolved: true },
  { district: "Granada", districtAr: "غرناطة", asset: "Office", assetAr: "مكاتب", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 1000, median: 1350, high: 1800, sufficient: true, src: "rega", period: "2026-06", source: "REGA Rental Index (Ejar)", sourceAr: "مؤشر إيجار", basis: "151 transactions", basisAr: "151 صفقة", resolved: true },
  { district: "Al Olaya", districtAr: "العليا", asset: "Retail", assetAr: "تجزئة", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 1800, median: 2600, high: 3600, sufficient: true, src: "rega", period: "2026-06", source: "REGA Rental Index (Ejar)", sourceAr: "مؤشر إيجار", basis: "96 transactions", basisAr: "96 صفقة", resolved: true },
  { district: "Granada", districtAr: "غرناطة", asset: "Retail", assetAr: "تجزئة", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 1300, median: 1900, high: 2600, sufficient: true, src: "rega", period: "2026-06", source: "REGA Rental Index (Ejar)", sourceAr: "مؤشر إيجار", basis: "44 transactions", basisAr: "44 صفقة", resolved: true },
  { district: "An Narjis", districtAr: "النرجس", asset: "Office", assetAr: "مكاتب", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 600, median: 760, high: 980, sufficient: false, src: "rega", period: "2026-06", source: "REGA Rental Index (Ejar)", sourceAr: "مؤشر إيجار", basis: "7 transactions, below threshold", basisAr: "7 صفقات، دون الحد", resolved: false },
  { district: "Al Malaz", districtAr: "الملز", asset: "Warehouse", assetAr: "مستودعات", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 180, median: 240, high: 320, sufficient: true, src: "rega", period: "2026-06", source: "REGA Rental Index (Ejar)", sourceAr: "مؤشر إيجار", basis: "63 transactions", basisAr: "63 صفقة", resolved: true },
  { district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", segment: "grade_a", segEn: "Grade A", segAr: "الفئة أ", low: 1750, median: 2043, high: 2500, sufficient: true, src: "broker", period: "2026-Q1", source: "Published: CBRE, JLL, Knight Frank", sourceAr: "منشور: CBRE و JLL و Knight Frank", basis: "3 sources agree", basisAr: "3 مصادر متوافقة", resolved: true },
  { district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", segment: "grade_b", segEn: "Grade B", segAr: "الفئة ب", low: 1100, median: 1300, high: 1550, sufficient: false, src: "broker", period: "2026-Q1", source: "Published: JLL", sourceAr: "منشور: JLL", basis: "single source", basisAr: "مصدر واحد", resolved: true },
  { district: "Granada", districtAr: "غرناطة", asset: "Office", assetAr: "مكاتب", segment: "grade_a", segEn: "Grade A", segAr: "الفئة أ", low: 1300, median: 1500, high: 1850, sufficient: false, src: "broker", period: "2026-Q1", source: "Published: JLL", sourceAr: "منشور: JLL", basis: "single source", basisAr: "مصدر واحد", resolved: true },
  { district: "Al Malaz", districtAr: "الملز", asset: "Warehouse", assetAr: "مستودعات", segment: "modern", segEn: "Modern", segAr: "حديثة", low: 190, median: 235, high: 300, sufficient: false, src: "broker", period: "2026-Q1", source: "Published: CBRE", sourceAr: "منشور: CBRE", basis: "single source", basisAr: "مصدر واحد", resolved: true },
];

type Scn = "thin" | "deed" | "disagree" | "stale" | "restate";
const SCENARIOS: { id: Scn; en: string; ar: string; expEn: string; expAr: string }[] = [
  { id: "thin", en: "Thin district", ar: "حي قليل العينة", expEn: "Granada retail drops below threshold and shows Thin sample.", expAr: "تجزئة غرناطة تنخفض دون الحد وتظهر كعينة قليلة." },
  { id: "deed", en: "Failed deed", ar: "صك غير صالح", expEn: "SAT-1847 deed fails; it moves from Published to Held. 0 published.", expAr: "يفشل صك SAT-1847؛ ينتقل من منشور إلى محجوز. 0 منشور." },
  { id: "disagree", en: "Brokers disagree", ar: "اختلاف الوسطاء", expEn: "Al Olaya Grade A becomes insufficient and the broker source card turns amber.", expAr: "الفئة أ للعليا تصبح غير كافية وبطاقة مصدر الوسطاء تتحول للكهرماني." },
  { id: "stale", en: "Stale REGA feed", ar: "تغذية ريجا قديمة", expEn: "REGA is a month late; source health flags it Attention and raises an alert.", expAr: "ريجا متأخرة شهراً؛ حالة المصدر تُعلَّم انتباه وتُصدر تنبيهاً." },
  { id: "restate", en: "REGA restatement", ar: "تصحيح ريجا", expEn: "REGA restates Al Olaya office median 1,700 to 1,650, tagged restated.", expAr: "ريجا تصحح وسيط مكاتب العليا من 1,700 إلى 1,650، موسوم مُصحَّح." },
];

type Role = "viewer" | "reviewer" | "admin";
const ROLES: Role[] = ["viewer", "reviewer", "admin"];
type Audit = { ts: string; role: Role; action: string; target: string; reason: string };

function fmt(n: number) { return n.toLocaleString("en-US"); }
const keyOf = (r: Row) => r.district + "|" + r.asset + "|" + r.segment;

export default function OpsPage({ params }: { params: { locale: string } }) {
  const ar = params.locale === "ar";
  const t = (en: string, arr: string) => (ar ? arr : en);
  const [period, setPeriod] = useState("2026-06");
  const [scn, setScn] = useState<Record<Scn, boolean>>({ thin: false, deed: false, disagree: false, stale: false, restate: false });
  const toggle = (id: Scn) => setScn((s) => ({ ...s, [id]: !s[id] }));
  const [role, setRole] = useState<Role>("viewer");
  const [audit, setAudit] = useState<Audit[]>([]);
  const [forcedThin, setForcedThin] = useState<Record<string, string>>({});
  const [listingOv, setListingOv] = useState<Record<string, string>>({});
  const [acked, setAcked] = useState<Record<string, boolean>>({});

  const can = (a: "review" | "admin") => (a === "review" ? role !== "viewer" : role === "admin");
  const log = (action: string, target: string, reason: string) => setAudit((l) => [{ ts: new Date().toISOString().slice(0, 19).replace("T", " "), role, action, target, reason }, ...l]);
  const ask = (label: string) => (typeof window === "undefined" ? "" : window.prompt(label) || "");

  const index = useMemo(() => {
    let rows: Row[] = BASE.map((r) => ({ ...r }));
    if (period === "2026-07") rows.push({ district: "An Nakheel", districtAr: "النخيل", asset: "Office", assetAr: "مكاتب", segment: "blended", segEn: "Blended", segAr: "مجمع", low: 900, median: 1150, high: 1500, sufficient: true, src: "rega", period: "2026-07", source: "REGA Rental Index (Ejar)", sourceAr: "مؤشر إيجار", basis: "58 transactions", basisAr: "58 صفقة", resolved: true });
    if (scn.thin) rows = rows.map((r) => (r.district === "Granada" && r.asset === "Retail" ? { ...r, sufficient: false, basis: "9 transactions, below threshold", basisAr: "9 صفقات، دون الحد" } : r));
    if (scn.disagree) rows = rows.map((r) => (r.district === "Al Olaya" && r.segment === "grade_a" ? { ...r, sufficient: false, basis: "sources outside tolerance", basisAr: "مصادر خارج الحد", note: "disagreement", noteAr: "اختلاف" } : r));
    if (scn.restate) rows = rows.map((r) => (r.district === "Al Olaya" && r.asset === "Office" && r.segment === "blended" ? { ...r, median: 1650, note: "restated", noteAr: "مُصحَّح" } : r));
    rows = rows.map((r) => (forcedThin[keyOf(r)] ? { ...r, sufficient: false, note: "forced thin", noteAr: "أُجبر قليل" } : r));
    return rows;
  }, [period, scn, forcedThin]);

  const listings = useMemo(() => {
    const deedOk = !scn.deed;
    return [
      { ref: "SAT-1847", district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", deal: "Lease", dealAr: "إيجار", nafath: true, permit: "7200256841", deed: deedOk ? "valid" : "not_found", asking: 1550 },
      { ref: "SAT-1902", district: "Al Malaz", districtAr: "الملز", asset: "Warehouse", assetAr: "مستودعات", deal: "Lease", dealAr: "إيجار", nafath: true, permit: "7200256990", deed: "not_found", asking: 205 },
      { ref: "SAT-1955", district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", deal: "Sale", dealAr: "بيع", nafath: true, permit: "7200257050", deed: "pending", asking: null as number | null },
    ];
  }, [scn.deed]);

  const sources = useMemo(() => ([
    { name: "REGA / Ejar Rental Index", nameAr: "مؤشر إيجار", cad: t("Dated, monthly", "مؤرخ، شهري"), last: scn.stale ? "2026-05" : period, ok: !scn.stale, note: scn.stale ? t("stale, expected " + period, "قديمة، المتوقع " + period) : t("rows received", "صفوف مستلمة") },
    { name: "Broker benchmarks", nameAr: "مراجع الوسطاء", cad: t("Dated, quarterly", "مؤرخ، ربعي"), last: "2026-Q1", ok: !scn.disagree, note: scn.disagree ? t("disagreement flagged", "اختلاف موسوم") : t("rows received", "صفوف مستلمة") },
    { name: "SPL National Address", nameAr: "العنوان الوطني (سبل)", cad: t("Live API", "مباشر"), last: "live", ok: true, note: t("1 district unresolved (An Narjis)", "حي غير محلول (النرجس)") },
    { name: "Wathq (deeds)", nameAr: "واثق (الصكوك)", cad: t("Live, per listing", "مباشر، لكل إعلان"), last: "live", ok: true, note: scn.deed ? t("2 deeds failed", "صكان غير صالحين") : t("1 deed not found", "صك غير موجود") },
    { name: "Nafath (identity)", nameAr: "نفاذ (الهوية)", cad: t("Live OIDC", "مباشر"), last: "live", ok: true, note: t("all verified", "الكل موثّق") },
    { name: "REGA advertising permit", nameAr: "رخصة الإعلان", cad: t("Live inquiry", "استعلام مباشر"), last: "live", ok: true, note: t("all valid", "الكل سارٍ") },
    { name: "GASTAT / SAMA (context)", nameAr: "الإحصاء / ساما", cad: t("Dated, monthly", "مؤرخ، شهري"), last: period, ok: true, note: t("context only", "سياق فقط") },
    { name: "Foursquare / Mapbox (geo)", nameAr: "Foursquare / Mapbox", cad: t("Snapshot / live", "لقطة / مباشر"), last: period, ok: true, note: t("POI + isochrones", "نقاط + عزل زمني") },
  ]), [period, scn, ar]);

  const listStatus = (l: { ref: string; nafath: boolean; permit: string | null; deed: string }) => {
    if (listingOv[l.ref]) return listingOv[l.ref];
    return l.nafath && !!l.permit && l.deed === "valid" ? "published" : "held";
  };
  const alerts = sources.filter((s) => !s.ok && !acked[s.name]);
  const suffCount = index.filter((r) => r.sufficient).length;
  const pubCount = listings.filter((l) => listStatus(l) === "published").length;
  const thinList = index.filter((r) => !r.sufficient);

  const doListing = (ref: string, status: string) => { if (!can("review")) return; const reason = ask(t("Reason for " + status + " on " + ref, "سبب " + status + " على " + ref)); if (!reason) return; setListingOv((o) => ({ ...o, [ref]: status })); log(status, ref, reason); };
  const doForceThin = (r: Row) => { if (!can("review")) return; const reason = ask(t("Reason to force thin", "سبب الإجبار على قليل")); if (!reason) return; setForcedThin((f) => ({ ...f, [keyOf(r)]: reason })); log("force_thin", keyOf(r), reason); };
  const doAck = (name: string) => { if (!can("review")) return; const reason = ask(t("Acknowledge note", "ملاحظة الإقرار")); if (!reason) return; setAcked((a) => ({ ...a, [name]: true })); log("acknowledge", name, reason); };

  const exportCsv = () => {
    const head = "district,asset,segment,low,median,high,sufficient,source,period";
    const body = index.map((r) => [r.district, r.asset, r.segment, r.low, r.median, r.high, r.sufficient, '"' + r.source + '"', r.period].join(",")).join("\n");
    const blob = new Blob([head + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "sat-reconciliation-" + period + ".csv"; a.click();
  };

  const H = ({ n, en, arr }: { n: string; en: string; arr: string }) => (<div className="mb-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{n}</p><h2 className="text-lg font-semibold text-slate-900">{t(en, arr)}</h2></div>);
  const btn = "rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 disabled:opacity-40";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-10">
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">{t("SAMPLE DATA. Data-operations simulation. Everything below is synthetic and never reaches production.", "بيانات عيّنة. محاكاة عمليات البيانات. كل ما يظهر هنا اصطناعي ولا يصل إلى الإنتاج إطلاقاً.")}</div>

      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("Data Operations", "عمليات البيانات")}</p>
        <h1 className="text-2xl font-semibold text-slate-900">{t("Ingestion simulation console", "محاكاة استقبال البيانات")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{t("Advance the period, inject scenarios, act on the data as a Reviewer or Admin, and watch the audit trail. Overrides can only make data more conservative, never promote thin data to sufficient.", "قدّم الفترة، واحقن السيناريوهات، وتصرّف على البيانات كمراجع أو مدير، وتابع سجل التدقيق. التجاوزات تجعل البيانات أكثر تحفظاً فقط، ولا ترفع القليل إلى كافٍ أبداً.")}</p>
      </header>

      <section>
        <H n="00" en="Controls" arr="التحكم" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">{t("Role:", "الدور:")}</span>
          {ROLES.map((r) => (<button key={r} onClick={() => setRole(r)} className={"rounded border px-3 py-1 text-sm " + (role === r ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700")}>{t(r === "viewer" ? "Viewer" : r === "reviewer" ? "Reviewer" : "Admin", r === "viewer" ? "مشاهد" : r === "reviewer" ? "مراجع" : "مدير")}</button>))}
          <span className="ms-3 text-xs text-slate-500">{t("Sim period:", "الفترة:")}</span>
          {["2026-06", "2026-07"].map((p) => (<button key={p} onClick={() => setPeriod(p)} className={"rounded border px-3 py-1 text-sm " + (period === p ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700")}>{p}</button>))}
          <button onClick={exportCsv} className="ms-2 rounded border border-slate-300 px-3 py-1 text-sm text-slate-700">{t("Reconciliation CSV", "توحيد CSV")}</button>
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
        <H n="03" en="Reconciliation board" arr="لوحة التوحيد" />
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2 text-start font-medium">{t("District", "الحي")}</th><th className="px-3 py-2 text-start font-medium">{t("Asset · Segment", "الأصل · الشريحة")}</th><th className="px-3 py-2 text-start font-medium">{t("Source", "المصدر")}</th><th className="px-3 py-2 text-start font-medium">{t("Band", "النطاق")}</th><th className="px-3 py-2 text-start font-medium">{t("Median", "الوسيط")}</th><th className="px-3 py-2 text-start font-medium">{t("Verdict", "الحكم")}</th><th className="px-3 py-2 text-start font-medium">{t("Action", "إجراء")}</th></tr></thead>
            <tbody>
              {index.map((r, i) => (<tr key={i} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-900">{ar ? r.districtAr : r.district}{!r.resolved && <span className="ms-1 rounded bg-amber-100 px-1 text-xs text-amber-800">{t("unresolved", "غير محلول")}</span>}</td>
                <td className="px-3 py-2 text-slate-600">{t(r.asset, r.assetAr)} · {t(r.segEn, r.segAr)}</td>
                <td className="px-3 py-2 text-slate-600">{ar ? r.sourceAr : r.source} · {r.period}{r.note && <span className="ms-1 rounded bg-rose-100 px-1 text-xs text-rose-700">{ar ? r.noteAr : r.note}</span>}</td>
                <td className="px-3 py-2 text-slate-600" dir="ltr">{fmt(r.low)}–{fmt(r.high)}</td>
                <td className="px-3 py-2 text-slate-900">{r.sufficient ? fmt(r.median) : t("Thin sample", "عينة قليلة")}</td>
                <td className="px-3 py-2">{r.sufficient ? <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">{t("Sufficient", "كافٍ")}</span> : <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{t("Thin", "قليل")}</span>}</td>
                <td className="px-3 py-2">{r.sufficient ? <button onClick={() => doForceThin(r)} disabled={!can("review")} className={btn}>{t("Force thin", "إجبار قليل")}</button> : <span className="text-xs text-slate-400">—</span>}</td>
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
              {listings.map((l) => { const st = listStatus(l); return (<tr key={l.ref} className="border-t border-slate-100">
                <td className="px-3 py-2"><span className="font-medium text-slate-900" dir="ltr">{l.ref}</span><span className="text-slate-500"> · {ar ? l.districtAr : l.district} · {t(l.asset, l.assetAr)} · {t(l.deal, l.dealAr)}</span></td>
                <td className="px-3 py-2">{l.nafath ? "✓" : "✕"}</td>
                <td className="px-3 py-2" dir="ltr">{l.permit || "—"}</td>
                <td className="px-3 py-2">{l.deed === "valid" ? t("Valid", "سارٍ") : l.deed === "not_found" ? t("Not found", "غير موجود") : t("Pending", "قيد الانتظار")}</td>
                <td className="px-3 py-2">{st === "published" || st === "approved" ? <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">{st === "approved" ? t("Approved", "معتمد") : t("Published", "منشور")}</span> : st === "rejected" ? <span className="rounded bg-rose-50 px-2 py-0.5 text-xs text-rose-700">{t("Rejected", "مرفوض")}</span> : <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{t("Held", "محجوز")}</span>}</td>
                <td className="px-3 py-2"><div className="flex gap-1"><button onClick={() => doListing(l.ref, "approved")} disabled={!can("review")} className={btn}>{t("Approve", "اعتماد")}</button><button onClick={() => doListing(l.ref, "rejected")} disabled={!can("review")} className={btn}>{t("Reject", "رفض")}</button><button onClick={() => doListing(l.ref, "held")} disabled={!can("review")} className={btn}>{t("Hold", "حجز")}</button></div></td>
              </tr>); })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">{t("Approve requires all gates to actually pass in a real run; here it is a synthetic reviewer action logged to the audit trail.", "الاعتماد يتطلب اجتياز جميع البوابات فعلياً في تشغيل حقيقي؛ هنا هو إجراء مراجع اصطناعي مسجّل في سجل التدقيق.")}</p>
      </section>

      <section>
        <H n="05" en="Audit trail" arr="سجل التدقيق" />
        {audit.length === 0 ? (<p className="text-sm text-slate-500">{t("No actions yet. Switch to Reviewer or Admin and act on a row.", "لا إجراءات بعد. بدّل إلى مراجع أو مدير وتصرّف على صف.")}</p>) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2 text-start font-medium">{t("Time", "الوقت")}</th><th className="px-3 py-2 text-start font-medium">{t("Role", "الدور")}</th><th className="px-3 py-2 text-start font-medium">{t("Action", "الإجراء")}</th><th className="px-3 py-2 text-start font-medium">{t("Target", "الهدف")}</th><th className="px-3 py-2 text-start font-medium">{t("Reason", "السبب")}</th></tr></thead><tbody>{audit.map((a, i) => (<tr key={i} className="border-t border-slate-100"><td className="px-3 py-2 text-slate-600" dir="ltr">{a.ts}</td><td className="px-3 py-2 text-slate-600">{a.role}</td><td className="px-3 py-2 text-slate-900">{a.action}</td><td className="px-3 py-2 text-slate-600" dir="ltr">{a.target}</td><td className="px-3 py-2 text-slate-600">{a.reason}</td></tr>))}</tbody></table></div>
        )}
      </section>

      <section>
        <H n="06" en="Reports" arr="التقارير" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-2xl font-semibold text-slate-900">{suffCount}/{index.length}</p><p className="text-xs text-slate-500">{t("Index cells sufficient", "خلايا كافية")}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-2xl font-semibold text-slate-900">{pubCount}/{listings.length}</p><p className="text-xs text-slate-500">{t("Listings published", "إعلانات منشورة")}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-2xl font-semibold text-slate-900">{audit.length}</p><p className="text-xs text-slate-500">{t("Actions logged", "إجراءات مسجّلة")}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-2xl font-semibold text-slate-900">{alerts.length}</p><p className="text-xs text-slate-500">{t("Open alerts", "تنبيهات مفتوحة")}</p></div>
        </div>
        <p className="mt-3 text-xs text-slate-500">{t("Next: persist actions and roles to a real store with auth, and wire these views to a synthetic Supabase branch (live reads instead of inlined fixtures). Needs SUPABASE_SERVICE_ROLE_KEY.", "التالي: حفظ الإجراءات والأدوار في مخزن حقيقي مع مصادقة، وربط هذه العروض بفرع Supabase اصطناعي (قراءات مباشرة بدل بيانات مضمّنة). يتطلب مفتاح الخدمة.")}</p>
      </section>

      <footer className="border-t border-slate-100 pt-4 text-xs text-slate-400">{t("SAT Markets data operations. Synthetic simulation. FAL 1200025510.", "عمليات بيانات سات ماركتس. محاكاة اصطناعية. رخصة فال 1200025510.")}</footer>
    </main>
  );
}
