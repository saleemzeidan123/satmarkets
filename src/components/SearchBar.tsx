"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/i18n/config";

export default function SearchBar({ locale, placeholder, cta }: { locale: Locale; placeholder: string; cta: string }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  return (
    <form onSubmit={(e)=>{e.preventDefault(); router.push(`/${locale}/search`);}}
      className="flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-line bg-white/90 p-2 shadow-card backdrop-blur">
      <span className="pl-3 text-charcoal/35">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
      </span>
      <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder={placeholder} className="flex-1 bg-transparent px-2 py-2.5 text-[15px] outline-none placeholder:text-charcoal/40" />
      <button type="submit" className="btn-gold px-5 py-2.5 text-sm font-medium">{cta}</button>
    </form>
  );
}
