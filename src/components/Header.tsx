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
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 6);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
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
  const descriptor = locale === "ar" ? "ذكاء · تداول" : "intelligence · exchange";
  return (
    <header className={`site-header sticky top-0 z-40 ${scrolled ? "scrolled" : ""}`}>
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-6">
        <Link href={`/${locale}`} className="flex items-center gap-2.5">
          <span className="logo-mark">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4.5" y="9" width="4" height="10" rx="1" fill="#fff" opacity="0.85" />
              <rect x="10" y="5" width="4" height="14" rx="1" fill="#5FD2C6" />
              <rect x="15.5" y="11.5" width="3.5" height="7.5" rx="1" fill="#fff" opacity="0.75" />
            </svg>
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-[20px] tracking-tight"><span className="text-charcoal">SAT</span> <span className="italic text-gold">Markets</span></span>
            <span className="mt-1 flex items-center gap-1.5">
              <span className="live-dot" />
              <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-slate/80">{descriptor}</span>
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={`nav-link ${active(n.href) ? "active" : ""}`}>{n.label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <Link href={`/${locale}/search`} aria-label="Search" className="icon-btn hidden sm:inline-flex">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></svg>
          </Link>
          <LanguageSwitch locale={locale} />
          <Link href={`/${locale}/login`} className="hidden text-[13.5px] text-charcoal/65 hover:text-charcoal lg:block">{signInLabel}</Link>
          <Link href={`/${locale}/dashboard`} className="btn-gold px-3.5 py-2 text-[13px] font-medium">{dict.nav.listSpace}</Link>
          <MobileNav items={nav} signIn={`/${locale}/login`} signInLabel={signInLabel} />
        </div>
      </div>
    </header>
  );
}
