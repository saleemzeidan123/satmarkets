"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import { assetLabel, dealLabel } from "@/lib/labels";

const CAT_KEYS = ["office","retail","warehouse","medical","showroom","serviced","land"];

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
    default: return null;
  }
}

export default function HeroSearch({ locale, placeholder, cta }: { locale: Locale; placeholder: string; cta: string }) {
  const [deal, setDeal] = useState<"lease" | "sale">("lease");
  const [asset, setAsset] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const router = useRouter();
  const go = () => {
    const sp = new URLSearchParams();
    sp.set("deal", deal);
    if (asset) sp.set("asset", asset);
    if (q.trim()) sp.set("q", q.trim());
    router.push(`/${locale}/listings?${sp.toString()}`);
  };
  const tab = (key: "lease" | "sale") => (
    <button type="button" onClick={() => setDeal(key)}
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
        {CAT_KEYS.map((k) => {
          const on = asset === k;
          return (
            <button key={k} type="button" onClick={() => setAsset(on ? null : k)}
              className={`flex shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] leading-tight transition ${on ? "bg-gold text-white" : "text-white/80 hover:bg-white/10"}`}>
              <CatIcon k={k} />
              <span className="whitespace-nowrap">{assetLabel(k, locale)}</span>
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
