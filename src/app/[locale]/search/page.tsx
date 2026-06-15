"use client";
import { useState } from "react";
import Link from "next/link";
import en from "@/i18n/dictionaries/en.json";
import ar from "@/i18n/dictionaries/ar.json";
import { assetLabel, dealLabel, cityLabel } from "@/lib/labels";

interface R { id: string; reference_code: string; asset_type: string; title_en: string|null; title_ar: string|null; area_sqm: number; asking_rent_sqm: number|null; sale_price: number|null; building_grade?: string; districts?: { name_en: string|null; name_ar: string|null; city: string|null } | null; }

export default function SearchPage({ params }: { params: { locale: string } }) {
  const locale = (params.locale === "ar" ? "ar" : "en") as "en"|"ar";
  const dict: any = locale === "ar" ? ar : en;
  const ui = dict.ui;
  const [q, setQ] = useState("");
  const [parsed, setParsed] = useState<any>(null);
  const [results, setResults] = useState<R[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const r = await fetch("/api/search", { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ query: q }) });
    const j = await r.json();
    setParsed(j.parsed); setResults(j.results || []); setBusy(false); setDone(true);
  }
  return (
    <section>
      <div className="eyebrow">{dict.search.title}</div>
      <h1 className="mt-1 font-display text-3xl text-charcoal">{locale==="ar"?"صف ما تحتاجه":"Describe what you need"}</h1>
      <form onSubmit={go} className="mt-5 flex max-w-3xl items-center gap-2 rounded-2xl border border-line bg-white p-2 shadow-card">
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder={dict.search.placeholder} className="flex-1 bg-transparent px-3 py-2.5 outline-none placeholder:text-charcoal/40" />
        <button className="btn-gold px-5 py-2.5 text-sm font-medium">{busy ? "..." : dict.search.go}</button>
      </form>
      {parsed && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-charcoal/40">{dict.search.interpreted}</span>
          {parsed.asset && <span className="badge badge-gold">{assetLabel(parsed.asset, locale)}</span>}
          {parsed.deal && <span className="badge badge-gold">{dealLabel(parsed.deal, locale)}</span>}
          {parsed.district && <span className="badge badge-gold">{parsed.district}</span>}
          {parsed.minSize && <span className="badge badge-gold">~{parsed.minSize} {dict.common.sqm}</span>}
          {parsed.maxRent && <span className="badge badge-gold">{Number(parsed.maxRent).toLocaleString()}</span>}
        </div>
      )}
      <p className="mt-3 max-w-2xl text-xs text-charcoal/45">{dict.search.grounded}</p>
      {done && results.length === 0 && <p className="mt-8 text-charcoal/50">{dict.search.none}</p>}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((l)=>{
          const title = (locale==="ar"?l.title_ar:l.title_en) || l.reference_code;
          const dn = l.districts ? (locale==="ar"?l.districts.name_ar:l.districts.name_en) : "";
          return (
          <Link key={l.id} href={`/${locale}/listings/${l.id}`} className="card group block p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-charcoal/45">{assetLabel(l.asset_type, locale)}</span>
              <span className="badge badge-verified">{dict.listing.verified}</span>
            </div>
            <h3 className="mt-2 font-display text-lg text-charcoal">{title}</h3>
            <div className="mt-1 text-[13px] text-charcoal/55">{dn}{l.districts?.city ? "، "+cityLabel(l.districts.city, locale) : ""} · {l.area_sqm} {dict.common.sqm}</div>
            <div className="mt-2 font-display text-xl text-gold">{(l.asking_rent_sqm ?? l.sale_price ?? 0).toLocaleString()}</div>
          </Link>
        );})}
      </div>
    </section>
  );
}
