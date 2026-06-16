"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import { dealLabel } from "@/lib/labels";

type Cat = { key: string; en: string; ar: string };
const LEASE_CATS: Cat[] = [
  { key: "office", en: "Office", ar: "مكاتب" },
  { key: "retail", en: "Retail & F&B", ar: "تجزئة ومطاعم" },
  { key: "warehouse", en: "Warehouse", ar: "مستودعات" },
  { key: "medical", en: "Medical", ar: "رعاية صحية" },
  { key: "showroom", en: "Showroom", ar: "معارض" },
  { key: "serviced", en: "Serviced", ar: "مكاتب مخدومة" },
  { key: "land", en: "Land", ar: "أراضٍ" },
];
const SALE_CATS: Cat[] = [
  { key: "office", en: "Office building", ar: "مبنى مكاتب" },
  { key: "retail", en: "Retail project", ar: "مشروع تجزئة" },
  { key: "mixed_use", en: "Mixed-use", ar: "متعدد الاستخدامات" },
  { key: "hospitality", en: "Hotel", ar: "فندق" },
  { key: "warehouse", en: "Logistics", ar: "لوجستي" },
  { key: "land", en: "Land", ar: "أرض" },
];

function CatIcon({ k }: { k: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (k) {
    case "office": return (<svg width="18" height="18" viewBox="0 0 24 24" {...p}><rect x="6" y="3" width="12" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/></svg>);
    case "retail": return (<svg width="18" height="18" viewBox="0 0 24 24" {...p}><path d="M4 9h16l-1-4H5L4 9z"/><path d="M5 9v10h14V9"/><path d="M10 19v-4h4v4"/></svg>);
    case "warehouse": return (<svg width="18" height="18" viewBox="0 0 24 24" {...p}><path d="M3 21V8l9-4 9 4v13"/><path d="M7 21v-7h10v7"/></svg>);
    case "medical": return (<svg width="18" height="18" viewBox="0 0 24 24" {...p}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8M8 12h8"/></svg>);
    case "showroom": return (<svg width="18" height="18" viewBox="0 0 24 24" {...p}><rect x="3" y="6" width="18" height="12" rx="1"/><path d="M3 10h18"/></svg>);
    case "serviced": return (<svg width="18" height="18" viewBox="0 0 24 24" {...p}><circle cx="12" cy="8" r="3"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/></svg>);
    case "land": return (<svg width="18" height="18" viewBox="0 0 24 24" {...p}><path d="M3 20h18"/><path d="M5 20l4-11 4 7 2-4 4 8"/></svg>);
    case "mixed_use": return (<svg width="18" height="18" viewBox="0 0 24 24" {...p}><rect x="3" y="9" width="8" height="12" rx="1"/><rect x="13" y="4" width="8" height="17" rx="1"/><path d="M6 13h2M16 8h2M16 12h2"/></svg>);
    case "hospitality": return (<svg width="18" height="18" viewBox="0 0 24 24" {...p}><path d="M3 20v-9M3 14h13a4 4 0 0 1 4 4v2"/><path d="M3 20h18"/><circle cx="7.5" cy="10.5" r="1.5"/></svg>);
    default: return null;
  }
}

export default function HeroSearch({ locale, placeholder, cta }: { locale: Locale; placeholder: string; cta: string }) {
  const ar = locale === "ar";
  const [deal, setDeal] = useState<"lease" | "sale">("lease");
  const [asset, setAsset] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const router = useRouter();
  const cats = deal === "sale" ? SALE_CATS : LEASE_CATS;
  const pick = (key: "lease" | "sale") => { setDeal(key); setAsset(null); };
  const go = () => {
    const sp = new URLSearchParams();
    sp.set("deal", deal);
    if (asset) sp.set("asset", asset);
    if (q.trim()) sp.set("q", q.trim());
    router.push(`/${locale}/listings?${sp.toString()}`);
  };
  const tab = (key: "lease" | "sale") => (
    <button type="button" onClick={() => pick(key)}
      className={`relative pb-2.5 text-[14px] font-medium transition ${deal === key ? "text-white" : "text-white/55 hover:text-white/80"}`}>
      {dealLabel(key, locale)}
      <span className={`absolute inset-x-0 -bottom-px h-[2px] rounded-full ${deal === key ? "bg-gold-soft" : "bg-transparent"}`} />
    </button>
  );
  return (
    <div className="rounded-2xl border border-white/15 bg-black/25 p-3 backdrop-blur-md sm:p-3.5">
      <div className="flex items-center gap-6 border-b border-white/10 px-1">
        {tab("lease")}
        {tab("sale")}
      </div>
      <div className="mt-2.5 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cats.map((c) => {
          const on = asset === c.key;
          return (
            <button key={c.key} type="button" onClick={() => setAsset(on ? null : c.key)}
              className={`flex shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] leading-tight transition ${on ? "bg-gold text-white" : "text-white/80 hover:bg-white/10"}`}>
              <CatIcon k={c.key} />
              <span className="whitespace-nowrap">{ar ? c.ar : c.en}</span>
            </button>
          );
        })}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); go(); }}
        className="mt-2.5 flex items-center gap-2 rounded-xl bg-white p-1.5 shadow-card">
        <span className="pl-2.5 text-charcoal/40">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        </span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-1.5 py-2 text-[15px] text-charcoal outline-none placeholder:text-charcoal/40" />
        <button type="submit" className="btn-gold shrink-0 px-5 py-2.5 text-sm font-medium">{cta}</button>
      </form>
    </div>
  );
}
