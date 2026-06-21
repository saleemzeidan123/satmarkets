"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LanguageSwitch from "@/components/LanguageSwitch";
import MobileNav from "@/components/MobileNav";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/getDictionary";

export default function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [saved, setSaved] = useState(0);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 6);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    const read = () => { try { const s = JSON.parse(localStorage.getItem("satm_saved") || "[]"); setSaved(Array.isArray(s) ? s.length : 0); } catch {} };
    read();
    window.addEventListener("focus", read); window.addEventListener("storage", read);
    return () => { window.removeEventListener("focus", read); window.removeEventListener("storage", read); };
  }, [pathname]);
  const nav = [
    { href: `/${locale}/map`, label: (dict.nav as any).map ?? "Map" },
    { href: `/${locale}/area`, label: (dict.nav as any).areas ?? "Area intel" },
    { href: `/${locale}/listings`, label: dict.nav.listings },
    { href: `/${locale}/search`, label: dict.search.title },
    { href: `/${locale}/rent-index`, label: dict.nav.rentIndex },
    { href: `/${locale}/hbu`, label: (dict.nav as any).develop ?? "Develop" },
    { href: `/${locale}/about`, label: dict.nav.about },
  ];
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const signInLabel = locale === "ar" ? "تسجيل الدخول" : "Sign in";
  const descriptor = locale === "ar" ? "ذكاء السوق العقاري" : "real-estate intelligence";
  const savedItem = { href: `/${locale}/saved`, label: locale === "ar" ? "المحفوظة" : "Saved" };
  return (
    <header className={`site-header sticky top-0 z-40 ${scrolled ? "scrolled" : ""}`}>
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-6">
        <Link href={`/${locale}`} className="flex items-center gap-2.5 sm:gap-3">
          <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center"><svg width="34" height="34" viewBox="0 0 100 100" aria-hidden="true"><path d="M22.0 13.0H40.84A2.5 2.5 0 0 1 43.34 15.5V50.46A2.5 2.5 0 0 1 40.84 52.96H15.5A2.5 2.5 0 0 1 13.0 50.46V22.0A9.0 9.0 0 0 1 22.0 13.0Z" fill="#14181B"/><path d="M50.28 13.0H78.0A9.0 9.0 0 0 1 87.0 22.0V50.46A2.5 2.5 0 0 1 84.5 52.96H50.28A2.5 2.5 0 0 1 47.78 50.46V15.5A2.5 2.5 0 0 1 50.28 13.0Z" fill="#3A6EA5"/><path d="M15.5 57.4H40.84A2.5 2.5 0 0 1 43.34 59.9V84.5A2.5 2.5 0 0 1 40.84 87.0H22.0A9.0 9.0 0 0 1 13.0 78.0V59.9A2.5 2.5 0 0 1 15.5 57.4Z" fill="#14181B"/><path d="M50.28 57.4H84.5A2.5 2.5 0 0 1 87.0 59.9V78.0A9.0 9.0 0 0 1 78.0 87.0H50.28A2.5 2.5 0 0 1 47.78 84.5V59.9A2.5 2.5 0 0 1 50.28 57.4Z" fill="#14181B"/></svg></span><span className="flex flex-col leading-none">
            <span className="font-display text-[19px] sm:text-[22px] tracking-tight"><span className="text-[#3A6EA5]">SAT</span> <span className="font-medium text-charcoal/80">Markets</span></span>
            <span className="mt-1 hidden sm:flex items-center gap-1.5">
              <span className="live-dot" />
              <span className="text-[9.5px] font-medium uppercase tracking-[0.16em] text-slate/80">{descriptor}</span>
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={`nav-link ${active(n.href) ? "active" : ""}`}>{n.label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <Link href={`/${locale}/saved`} aria-label="Saved" className="icon-btn relative hidden sm:inline-flex">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
            {saved > 0 ? <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-signal px-1 text-[9px] font-medium text-white fig">{saved}</span> : null}
          </Link>
          <Link href={`/${locale}/search`} aria-label="Search" className="icon-btn hidden sm:inline-flex">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></svg>
          </Link>
          <span className="inline-flex"><LanguageSwitch locale={locale} /></span>
          <Link href={`/${locale}/login`} className="hidden text-[13.5px] text-charcoal/65 hover:text-charcoal lg:block">{signInLabel}</Link>
          <Link href={`/${locale}/dashboard`} className="btn-gold px-3.5 py-2 text-[13px] font-medium">
            <span className="sm:hidden">{locale === "ar" ? "أدرج" : "List"}</span>
            <span className="hidden sm:inline">{dict.nav.listSpace}</span>
          </Link>
          <MobileNav items={[...nav, savedItem]} signIn={`/${locale}/login`} signInLabel={signInLabel} lang={<LanguageSwitch locale={locale} />} />
        </div>
      </div>
    </header>
  );
}
