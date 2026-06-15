"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/i18n/config";

export default function SearchBar({ locale, placeholder, cta }: { locale: Locale; placeholder: string; cta: string }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  function go(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/${locale}/listings?q=${encodeURIComponent(q)}`);
  }
  return (
    <form onSubmit={go} className="flex w-full max-w-2xl items-center gap-2 rounded-lg border border-charcoal/15 bg-white p-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent px-3 py-2 outline-none"
      />
      <button type="submit" className="rounded bg-gold px-4 py-2 text-white">{cta}</button>
    </form>
  );
}
