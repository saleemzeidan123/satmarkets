"use client";
import { useState } from "react";
import Link from "next/link";
import en from "@/i18n/dictionaries/en.json";
import ar from "@/i18n/dictionaries/ar.json";
import { assetLabel, dealLabel, cityLabel } from "@/lib/labels";

interface R { id: string; reference_code: string; asset_type: string; title_en: string|null; title_ar: string|null; area_sqm: number; asking_rent_sqm: number|null; sale_price: number|null; building_grade?: string; districts?: { name_en: string|null; name_ar: string|null; city: string|null } | null; }

const ASSETS = ["office","retail","warehouse","medical","showroom","serviced","land"];
const CITIES = ["Riyadh","Jeddah","Dammam","Khobar"];

export default function SearchPage({ params }: { params: { locale: string } }) {
  const locale = (params.locale === "ar" ? "ar" : "en") as "en"|"ar";
  const dict: any = locale === "ar" ? ar : en;
  const [q, setQ] = useState("");
  const [parsed, setParsed] = useState<any>(null);
  const [clarify, setClarify] = useState(false);
  const [results, setResults] = useState<R[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const T = {
    title: locale==="ar"?"صف ما تحتاجه":"Describe what you need",
    interpreted: dict.search.interpreted,
    grounded: dict.search.grounded,
    none: dict.search.none,
    go: dict.search.go,
    clarifyTitle: locale==="ar"?"دعني أساعدك في التحديد":"Let me help you narrow it down",
    clarifyBody: locale==="ar"?"اختر نوع مساحة أو مدينة أو نوع الصفقة، أو صف ما تريده بكلماتك.":"Pick a space type, a city, or a deal — or describe it in your own words.",
    pickType: locale==="ar"?"نوع المساحة":"Space type",
    pickCity: locale==="ar"?"المدينة":"City",
    pickDeal: locale==="ar"?"الصفقة":"Deal",
    aFew: locale==="ar"?"بعض القوائم للبدء":"A few to start",
    showing: locale==="ar"?"عرض قوائم موثقة":"Showing verified listings",
  };

  async function run(query: string) {
    setBusy(true); setQ(query);
    const r = await fetch("/api/search", { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ query }) });
    const j = await r.json();
    setParsed(j.parsed); setClarify(!!j.clarify); setResults(j.results || []); setBusy(false); setDone(true);
  }
  function pick(term: string) { run((q + " " + term).trim()); }

  const summary = (() => {
    if (!parsed) return "";
    const bits: string[] = [];
    if (parsed.asset) bits.push(assetLabel(parsed.asset, locale));
    if (parsed.deal) bits.push(dealLabel(parsed.deal, locale));
    if (parsed.district) bits.push(parsed.district);
    return `${T.showing}${bits.length ? " · " + bits.join(" · ") : ""}`;
  })();

  return (
    <section>
      <div className="eyebrow">{dict.search.title}</div>
      <h1 className="mt-1 font-display text-3xl text-charcoal">{T.title}</h1>
      <form onSubmit={(e)=>{e.preventDefault(); run(q);}} className="mt-5 flex max-w-3xl items-center gap-2 rounded-2xl border border-line bg-white p-2 shadow-card">
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder={dict.search.placeholder} className="flex-1 bg-transparent px-3 py-2.5 outline-none placeholder:text-charcoal/40" />
        <button className="btn-gold px-5 py-2.5 text-sm font-medium">{busy ? "..." : T.go}</button>
      </form>

      {/* clarifying assistant */}
      {done && clarify && (
        <div className="mt-5 max-w-3xl rounded-2xl border border-line bg-ivory-2/40 p-5">
          <div className="font-display text-lg text-charcoal">{T.clarifyTitle}</div>
          <p className="mt-1 text-[13.5px] text-charcoal/60">{T.clarifyBody}</p>
          <div className="mt-4 space-y-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-charcoal/40">{T.pickType}</div>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {ASSETS.map((a)=>(<button key={a} onClick={()=>pick(a)} className="rounded-full border border-line bg-white px-3 py-1 text-[12.5px] text-charcoal/70 hover:border-signal/50 hover:text-charcoal">{assetLabel(a, locale)}</button>))}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-charcoal/40">{T.pickCity}</div>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {CITIES.map((c)=>(<button key={c} onClick={()=>pick(c)} className="rounded-full border border-line bg-white px-3 py-1 text-[12.5px] text-charcoal/70 hover:border-signal/50 hover:text-charcoal">{cityLabel(c, locale)}</button>))}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-charcoal/40">{T.pickDeal}</div>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <button onClick={()=>pick("lease")} className="rounded-full border border-line bg-white px-3 py-1 text-[12.5px] text-charcoal/70 hover:border-signal/50 hover:text-charcoal">{dealLabel("lease", locale)}</button>
                <button onClick={()=>pick("buy")} className="rounded-full border border-line bg-white px-3 py-1 text-[12.5px] text-charcoal/70 hover:border-signal/50 hover:text-charcoal">{dealLabel("sale", locale)}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* interpreted summary */}
      {done && !clarify && parsed && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-charcoal/45">{summary}</span>
          {parsed.minSize && <span className="badge badge-gold">~{parsed.minSize} {dict.common.sqm}</span>}
          {parsed.maxRent && <span className="badge badge-gold">{Number(parsed.maxRent).toLocaleString()}</span>}
        </div>
      )}

      <p className="mt-3 max-w-2xl text-xs text-charcoal/45">{T.grounded}</p>
      {done && !clarify && results.length === 0 && <p className="mt-8 text-charcoal/50">{T.none}</p>}
      {done && clarify && results.length > 0 && <div className="mt-6 text-[11px] uppercase tracking-wide text-charcoal/40">{T.aFew}</div>}

      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
            <div className="mt-2 fig text-xl text-charcoal">{(l.asking_rent_sqm ?? l.sale_price ?? 0).toLocaleString()}</div>
          </Link>
        );})}
      </div>
    </section>
  );
}
