"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

type Verdict = {
  status: "below" | "within" | "above" | "na";
  deltaPct: number | null;
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
  { v: "education", en: "Education", ar: "تعليم" },
];
const GRADES: { v: string; en: string; ar: string }[] = [
  { v: "", en: "Any grade", ar: "أي فئة" },
  { v: "a_plus", en: "Grade A+", ar: "الفئة A+" },
  { v: "a", en: "Grade A", ar: "الفئة A" },
  { v: "b", en: "Grade B", ar: "الفئة B" },
];

function n(v: number | null): string {
  return v == null ? "" : Number(v).toLocaleString("en-US");
}

export default function FindPage() {
  const ar = usePathname().startsWith("/ar");
  const [assetType, setAssetType] = useState("office");
  const [dealType, setDealType] = useState("lease");
  const [grade, setGrade] = useState("");
  const [sizeMin, setSizeMin] = useState("");
  const [sizeMax, setSizeMax] = useState("");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");

  const T = ar
    ? {
        h1: "اعثر على مساحتك",
        sub: "صف ما تريده، ويعرض SAT قائمة مختصرة مرتبة، كل خيار مُقيّم مقابل مؤشر SAT للإيجارات.",
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
        sub: "Describe what you need, and SAT returns a ranked shortlist, each option graded against the SAT Rent Index.",
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

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    setRows(null);
    try {
      const body: Record<string, unknown> = { assetType, dealType, limit: 8 };
      if (grade) body.grade = grade;
      if (sizeMin) body.sizeMin = Number(sizeMin);
      if (sizeMax) body.sizeMax = Number(sizeMax);
      if (budget) body.budgetSqmMax = Number(budget);
      const res = await fetch("/api/advisor/shortlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setRows(data.results || []);
      setRelaxed(data.relaxed || "none");
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
      ? { below: "قيمة جيدة", within: "سعر عادل", above: "أعلى من السوق", na: "لا مؤشر" }
      : { below: "Good value", within: "Fairly priced", above: "Above market", na: "No index" };
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
          <select value={assetType} onChange={(e) => setAssetType(e.target.value)} className={inp}>
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
        <div className="col-span-2 sm:col-span-3">
          <button type="submit" disabled={loading} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
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
          <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">{ar ? r.title_ar || r.title_en : r.title_en}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {r.reference_code}
                  {r.area_sqm != null && <> · {n(r.area_sqm)} m²</>}
                  {r.asking_rent_sqm != null && <> · {n(r.asking_rent_sqm)} {ar ? "ريال/م²" : "SAR/m²"}</>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {chip(r.verdict)}
                <span className="text-[11px] text-slate-400">{r.fit_score}% {T.fit}</span>
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{ar ? r.verdict.line_ar : r.verdict.line_en}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
