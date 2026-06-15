"use client";
import { useState } from "react";
import Link from "next/link";

interface R { id: string; reference_code: string; asset_type: string; title_en: string|null; area_sqm: number; asking_rent_sqm: number|null; sale_price: number|null; districts?: { name_en: string|null; city: string|null } | null; }

export default function SearchPage({ params }: { params: { locale: string } }) {
  const [q, setQ] = useState("");
  const [parsed, setParsed] = useState<any>(null);
  const [results, setResults] = useState<R[]>([]);
  const [busy, setBusy] = useState(false);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: q }) });
    const j = await r.json();
    setParsed(j.parsed); setResults(j.results || []); setBusy(false);
  }

  return (
    <section className="py-6">
      <div className="text-xs uppercase tracking-widest text-gold">AI search</div>
      <h1 className="mt-2 font-serif text-2xl">Describe what you need</h1>
      <form onSubmit={go} className="mt-4 flex max-w-3xl gap-2">
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="3,000 sqm Grade A office near KAFD under SAR 2,800" className="flex-1 rounded border border-charcoal/20 px-4 py-3" />
        <button className="rounded bg-gold px-5 text-white">Search</button>
      </form>
      {parsed && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {parsed.asset && <span className="rounded bg-slate/10 px-2 py-1 text-slate">{parsed.asset}</span>}
          {parsed.deal && <span className="rounded bg-slate/10 px-2 py-1 text-slate">{parsed.deal}</span>}
          {parsed.district && <span className="rounded bg-slate/10 px-2 py-1 text-slate">{parsed.district}</span>}
          {parsed.minSize && <span className="rounded bg-slate/10 px-2 py-1 text-slate">~{parsed.minSize} sqm</span>}
          {parsed.maxRent && <span className="rounded bg-slate/10 px-2 py-1 text-slate">under {parsed.maxRent}</span>}
        </div>
      )}
      <p className="mt-3 max-w-2xl text-xs text-charcoal/50">Results come from verified listings. The assistant interprets and filters, it never invents a rent figure.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((l) => (
          <Link key={l.id} href={`/${params.locale}/listings/${l.id}`} className="block rounded-lg border border-charcoal/10 bg-white p-4 hover:border-gold/40">
            <div className="text-xs uppercase text-charcoal/50">{l.asset_type}</div>
            <div className="mt-1 font-serif text-lg">{l.title_en || l.reference_code}</div>
            <div className="mt-1 text-sm text-charcoal/60">{l.districts?.name_en}{l.districts?.city ? `, ${l.districts.city}` : ""} · {l.area_sqm} sqm</div>
            <div className="mt-2 text-gold">{l.asking_rent_sqm ?? l.sale_price}</div>
          </Link>
        ))}
      </div>
      {busy && <p className="mt-4 text-charcoal/50">Searching...</p>}
    </section>
  );
}
