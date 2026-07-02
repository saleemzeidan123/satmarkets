"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const S = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const IC = {
  home: <svg {...S}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>,
  explore: <svg {...S}><circle cx="11" cy="11" r="7" /><path d="m20.5 20.5-4-4" /></svg>,
  post: <svg {...S}><circle cx="12" cy="12" r="9" /><path d="M12 8.5v7M8.5 12h7" /></svg>,
  index: <svg {...S}><path d="M4 5v14h16" /><path d="m6.5 15.5 4.5-4.5 3 2.5 5-6" /></svg>,
  saved: <svg {...S}><path d="M12 20.5s-7.5-4.6-9.3-9C1.5 8.6 3.2 5.5 6.4 5.5c2 0 3.5 1.1 4.3 2.6.4.8 1.3.8 1.7 0 .8-1.5 2.3-2.6 4.3-2.6 3.2 0 4.9 3.1 3.7 6-1.8 4.4-8.4 9-8.4 9Z" /></svg>,
};

export default function TabBar({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const pathname = usePathname() || "";
  const [saved, setSaved] = useState(0);
  useEffect(() => {
    const read = () => { try { const s = JSON.parse(localStorage.getItem("satm_saved") || "[]"); setSaved(Array.isArray(s) ? s.length : 0); } catch {} };
    read();
    window.addEventListener("focus", read); window.addEventListener("storage", read);
    return () => { window.removeEventListener("focus", read); window.removeEventListener("storage", read); };
  }, [pathname]);
  const tabs = [
    { href: `/${locale}`, label: ar ? "الرئيسية" : "Home", ic: IC.home, exact: true, badge: 0 },
    { href: `/${locale}/listings`, label: ar ? "استكشف" : "Explore", ic: IC.explore, exact: false, badge: 0 },
    { href: `/${locale}/find`, label: ar ? "اطلب" : "Post", ic: IC.post, exact: false, badge: 0 },
    { href: `/${locale}/rent-index`, label: ar ? "المؤشر" : "Index", ic: IC.index, exact: false, badge: 0 },
    { href: `/${locale}/saved`, label: ar ? "المحفوظة" : "Saved", ic: IC.saved, exact: false, badge: saved },
  ];
  const on = (t: (typeof tabs)[number]) => (t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(t.href + "/"));
  return (
    <nav className="tabbar" aria-label={ar ? "التنقل السفلي" : "Bottom navigation"}>
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={on(t) ? "on" : ""} aria-current={on(t) ? "page" : undefined}>
          <span className="tb-ic">{t.ic}{t.badge > 0 ? <span className="tb-badge fig">{t.badge}</span> : null}</span>
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
