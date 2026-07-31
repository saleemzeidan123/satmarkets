"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { getDictionary } from "@/i18n/getDictionary";

type Verdict = {
  status: "below" | "within" | "above" | "na";
  deltaPct: number | null;
  line_en: string;
  line_ar: string;
};
type Underwrite = {
  status: "ok" | "na";
  grossYieldPct: number | null;
  paybackYears: number | null;
  line_en: string;
  line_ar: string;
};
type Row = {
  id: string;
  reference_code: string;
  title_en: string | null;
  title_ar: string | null;
  district_en: string | null;
  district_ar: string | null;
  area_sqm: number | null;
  asking_rent_sqm: number | null;
  building_grade: string | null;
  fit_score: number;
  verdict: Verdict;
  underwrite?: Underwrite;
};

const ASSETS: { v: string; en: string; ar: string }[] = [
  { v: "office", en: "Office", ar: "مكتب" },
  { v: "retail", en: "Retail", ar: "تجزئة" },
  { v: "warehouse", en: "Warehouse", ar: "مستودع" },
  { v: "showroom", en: "Showroom", ar: "صالة عرض" },
  { v: "medical", en: "Medical", ar: "طبي" },
  { v: "land", en: "Land", ar: "أرض" },
  { v: "mixed_use", en: "Mixed use", ar: "متعدد الاستخدامات" },
  { v: "hospitality", en: "Hospitality", ar: "ضيافة" },
  { v: "gas_station", en: "Gas station", ar: "محطة وقود" },
  { v: "entertainment", en: "Entertainment", ar: "ترفيه" },
  { v: "wedding_hall", en: "Events & wedding halls", ar: "قاعات ومناسبات" },
  { v: "worker_housing", en: "Worker housing", ar: "سكن عمالة" },
  { v: "self_storage", en: "Self storage", ar: "تخزين ذاتي" },
  { v: "education", en: "Education", ar: "تعليم" },
];
const GRADES: { v: string; en: string; ar: string }[] = [
  { v: "", en: "Any grade", ar: "أي فئة" },
  { v: "a_plus", en: "Grade A+", ar: "الفئة A+" },
  { v: "a", en: "Grade A", ar: "الفئة A" },
  { v: "b", en: "Grade B", ar: "الفئة B" },
];

const NEEDS: Record<string, { v: string; en: string; ar: string }[]> = {
  office: [
    { v: "fitted", en: "Fitted", ar: "مجهز" },
    { v: "whole_floor", en: "Whole floor", ar: "دور كامل" },
    { v: "parking", en: "Strong parking", ar: "مواقف كافية" },
    { v: "metro", en: "Metro nearby", ar: "قرب المترو" },
    { v: "rhq", en: "RHQ-grade", ar: "بمستوى المقرات الإقليمية" },
  ],
  retail: [
    { v: "street_frontage", en: "Street frontage", ar: "واجهة شارع" },
    { v: "mall_unit", en: "Mall unit", ar: "وحدة مول" },
    { v: "fnb_venting", en: "F&B venting", ar: "تهوية مطاعم" },
    { v: "drive_thru", en: "Drive-thru", ar: "خدمة السيارات" },
    { v: "high_footfall", en: "High footfall", ar: "حركة مشاة عالية" },
  ],
  warehouse: [
    { v: "clear_9m", en: "Clear height 9m+", ar: "ارتفاع صافٍ +9م" },
    { v: "dock", en: "Dock loading", ar: "أرصفة تحميل" },
    { v: "power", en: "Heavy power", ar: "قدرة كهربائية عالية" },
    { v: "cold", en: "Cold chain", ar: "سلسلة تبريد" },
    { v: "yard", en: "Yard space", ar: "ساحة خارجية" },
  ],
  medical: [
    { v: "cbahi", en: "CBAHI-ready", ar: "جاهز لاعتماد سباهي" },
    { v: "ground", en: "Ground floor", ar: "دور أرضي" },
    { v: "parking", en: "Strong parking", ar: "مواقف كافية" },
    { v: "clinic_zoning", en: "Clinic zoning", ar: "ترخيص عيادات" },
  ],
  land: [
    { v: "corner", en: "Corner plot", ar: "قطعة زاوية" },
    { v: "high_far", en: "High FAR", ar: "معامل بناء مرتفع" },
    { v: "main_road", en: "Main-road frontage", ar: "واجهة طريق رئيسي" },
    { v: "utilities", en: "Utilities at plot", ar: "خدمات عند القطعة" },
  ],
  showroom: [
    { v: "main_road", en: "Main-road frontage", ar: "واجهة طريق رئيسي" },
    { v: "double_height", en: "Double height", ar: "ارتفاع مضاعف" },
    { v: "parking", en: "Strong parking", ar: "مواقف كافية" },
  ],
  serviced: [
    { v: "furnished", en: "Furnished", ar: "مفروش" },
    { v: "short_term", en: "Short term", ar: "مدة قصيرة" },
    { v: "meeting", en: "Meeting rooms", ar: "قاعات اجتماعات" },
  ],
  gas_station: [
    { v: "highway", en: "Highway access", ar: "وصول طريق سريع" },
    { v: "corner", en: "Corner site", ar: "موقع زاوية" },
    { v: "ev", en: "EV-ready", ar: "جاهز لشحن الكهربائية" },
  ],
};

function n(v: number | null): string {
  return v == null ? "" : Number(v).toLocaleString("en-US");
}

export default function FindPage() {
  const ar = usePathname().startsWith("/ar");
  const t = getDictionary(ar ? "ar" : "en").findPage;
  const [assetType, setAssetType] = useState("office");
  const [dealType, setDealType] = useState("lease");
  const [grade, setGrade] = useState("");
  const [sizeMin, setSizeMin] = useState("");
  const [sizeMax, setSizeMax] = useState("");
  const [budget, setBudget] = useState("");
  const [needs, setNeeds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");

  const T = ar
    ? {
        h1: "اعثر على مساحتك",
        sub: "صف ما تريده، ويعرض SAT قائمة مختصرة مرتبة، كل خيار مُقيّم مقابل مراجع السوق الموثّقة.",
        asset: "نوع الأصل",
        deal: "النوع",
        lease: "إيجار",
        sale: "بيع",
        grade: "الفئة",
        sizeMin: "أدنى مساحة (م²)",
        sizeMax: "أعلى مساحة (م²)",
        budget: "الميزانية القصوى (ريال/م²)",
        go: "اعرض الصفقات",
        loading: "جارٍ البحث...",
        none: "لا توجد نتائج مطابقة بعد. جرّب توسيع النطاق.",
        fit: "ملاءمة",
        relaxedBudget: "تم توسيع البحث بتجاوز الميزانية.",
        relaxedBoth: "تم توسيع البحث بتجاوز الميزانية والحي.",
      }
    : {
        h1: "Find your space",
        sub: "Describe what you need, and SAT returns a ranked shortlist, each option graded against verified market benchmarks.",
        asset: "Asset type",
        deal: "Type",
        lease: "Lease",
        sale: "Sale",
        grade: "Grade",
        sizeMin: "Min size (m²)",
        sizeMax: "Max size (m²)",
        budget: "Max budget (SAR/m²)",
        go: "Show deals",
        loading: "Searching...",
        none: "No matches yet. Try widening the brief.",
        fit: "fit",
        relaxedBudget: "Widened past your budget to find options.",
        relaxedBoth: "Widened past budget and district to find options.",
      };

  const [relaxed, setRelaxed] = useState("none");
  // ADV-1E. The sentences the server's quote decision attached to the index
  // figures behind every verdict and yield on this page.
  const [idxNotes, setIdxNotes] = useState<readonly string[]>([]);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    setRows(null);
    setIdxNotes([]);
    try {
      // The locale was never sent, so an Arabic reader was served an English
      // decision. Law: identical figures and evidence states in both languages.
      const body: Record<string, unknown> = { assetType, dealType, limit: 8, locale: ar ? "ar" : "en" };
      if (grade) body.grade = grade;
      if (sizeMin) body.sizeMin = Number(sizeMin);
      if (sizeMax) body.sizeMax = Number(sizeMax);
      if (budget) body.budgetSqmMax = Number(budget);
      if (needs.length) body.needs = needs;
      const res = await fetch("/api/advisor/shortlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setRows(data.results || []);
      setRelaxed(data.relaxed || "none");
      setIdxNotes(Array.isArray(data.statements) ? data.statements : []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const chip = (v: Verdict) => {
    const map: Record<string, string> = {
      below: "bg-emerald-50 text-emerald-700 border-emerald-200",
      within: "bg-slate-50 text-slate-600 border-slate-200",
      above: "bg-amber-50 text-amber-700 border-amber-200",
      na: "bg-gray-50 text-gray-500 border-gray-200",
    };
    const label = ar
      ? { below: "قيمة جيدة", within: "سعر عادل", above: "أعلى من السوق", na: "لا مرجع" }
      : { below: "Good value", within: "Fairly priced", above: "Above market", na: "No benchmark" };
    return (
      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[v.status]}`}>
        {(label as Record<string, string>)[v.status]}
      </span>
    );
  };

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">{T.h1}</h1>
      <p className="mt-2 text-sm text-slate-600">{T.sub}</p>

      <form onSubmit={run} className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <label className="col-span-2 sm:col-span-1 text-xs text-slate-500">
          {T.asset}
          <select value={assetType} onChange={(e) => { setAssetType(e.target.value); setNeeds([]); }} className={inp}>
            {ASSETS.map((a) => (
              <option key={a.v} value={a.v}>{ar ? a.ar : a.en}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          {T.deal}
          <select value={dealType} onChange={(e) => setDealType(e.target.value)} className={inp}>
            <option value="lease">{T.lease}</option>
            <option value="sale">{T.sale}</option>
          </select>
        </label>
        <label className="text-xs text-slate-500">
          {T.grade}
          <select value={grade} onChange={(e) => setGrade(e.target.value)} className={inp}>
            {GRADES.map((g) => (
              <option key={g.v} value={g.v}>{ar ? g.ar : g.en}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          {T.sizeMin}
          <input value={sizeMin} onChange={(e) => setSizeMin(e.target.value)} inputMode="numeric" className={inp} />
        </label>
        <label className="text-xs text-slate-500">
          {T.sizeMax}
          <input value={sizeMax} onChange={(e) => setSizeMax(e.target.value)} inputMode="numeric" className={inp} />
        </label>
        <label className="text-xs text-slate-500">
          {T.budget}
          <input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="numeric" className={inp} />
        </label>
        {(NEEDS[assetType] || []).length > 0 && (
          <div className="col-span-2 sm:col-span-3">
            <div className="text-xs text-slate-500">{t.assetNeeds}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(NEEDS[assetType] || []).map((n) => {
                const on = needs.includes(n.v);
                return (
                  <button key={n.v} type="button" onClick={() => setNeeds((p) => (on ? p.filter((x) => x !== n.v) : [...p, n.v]))} className={on ? "chip on" : "chip"} style={{ cursor: "pointer" }}>
                    {ar ? n.ar : n.en}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{t.needsNote}</p>
          </div>
        )}
        <div className="col-span-2 sm:col-span-3">
          <button type="submit" disabled={loading} style={{ background: "var(--ink, #0B2A4A)", color: "var(--on-brand)", padding: "11px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? T.loading : T.go}
          </button>
        </div>
      </form>

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
      {relaxed === "budget" && rows && rows.length > 0 && <p className="mt-4 text-xs text-amber-600">{T.relaxedBudget}</p>}
      {relaxed === "budget+district" && rows && rows.length > 0 && <p className="mt-4 text-xs text-amber-600">{T.relaxedBoth}</p>}

      {rows && rows.length === 0 && <p className="mt-6 text-sm text-slate-500">{T.none}</p>}

      <div className="mt-6 space-y-3">
        {rows?.map((r) => (
          <a key={r.id} href={`/${ar ? "ar" : "en"}/listings/${r.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-400 hover:shadow-sm" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">{ar ? r.title_ar || r.title_en : r.title_en}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {r.reference_code}
                  {r.area_sqm != null && <> · <bdi dir="ltr">{n(r.area_sqm)} m²</bdi></>}
                  {r.asking_rent_sqm != null && <> · {n(r.asking_rent_sqm)} {t.sarSqm}</>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {r.underwrite && r.underwrite.status === "ok" ? (
                  <span className="inline-block rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    ~{r.underwrite.grossYieldPct}% {t.yieldWord}
                  </span>
                ) : (
                  chip(r.verdict)
                )}
                <span className="text-[11px] text-slate-400">{r.fit_score}% {T.fit}</span>
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              {r.underwrite && r.underwrite.status === "ok"
                ? ar ? r.underwrite.line_ar : r.underwrite.line_en
                : ar ? r.verdict.line_ar : r.verdict.line_en}
            </p>
          </a>
        ))}
        {/* Directly beneath the cards whose verdicts and yields the index stands
            behind, because a label further from the figure than this is a label
            a reader can miss. */}
        {rows && rows.length > 0 && idxNotes.map((note) => (
          <p key={note} className="text-[11px] leading-relaxed text-slate-500">{note}</p>
        ))}
      </div>
    </main>
  );
}
