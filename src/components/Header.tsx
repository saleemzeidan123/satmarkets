"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LanguageSwitch from "@/components/LanguageSwitch";
import { Logo } from "@/components/satkit";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/getDictionary";

export default function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [saved, setSaved] = useState(0);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const ar = locale === "ar";
  const primaryNav = [
    { href: `/${locale}/listings`, label: dict.nav.explore },
    { href: `/${locale}/rent-index`, label: dict.nav.rentIndex },
    { href: `/${locale}/advisor`, label: dict.nav.advisor },
    { href: `/${locale}/requirements`, label: dict.nav.requirements },
  ];
  const nav = [
    { href: `/${locale}/about`, label: dict.nav.about },
    { href: `/${locale}/pricing`, label: dict.nav.pricing },
    { href: `/${locale}/brokers`, label: dict.nav.brokers },
  ];
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const signInLabel = dict.nav.signIn;
  const menuLabel = dict.nav.menu;
  const browseLabel = dict.nav.browse;
  const accountLabel = dict.nav.account;
  const savedLabel = dict.nav.saved;
  const dashLabel = dict.nav.dashboard;
  const welcomeTitle = dict.nav.welcomeTitle;
  const welcomeSub = dict.nav.welcomeSub;

  return (
    <header className={`site-header sticky top-0 z-40 ${scrolled ? "scrolled" : ""}`}>
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-6">
        <Link href={`/${locale}`} className="flex items-center"><Logo size={34} /></Link>

        <nav className="hidden md:flex items-center gap-0.5" aria-label={dict.nav.primaryNav}>
          {primaryNav.map((n) => (
            <Link key={n.href} href={n.href} className={`rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors hover:bg-ivory-2 ${active(n.href) ? "text-harbor font-semibold" : "text-charcoal/75"}`}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <span className="hidden sm:inline-flex"><LanguageSwitch locale={locale} /></span>
          <Link href={`/${locale}/dashboard`} className="btn-gold px-3.5 py-2 text-[13px] font-medium">
            <span className="sm:hidden">{dict.nav.list}</span>
            <span className="hidden sm:inline">{dict.nav.listSpace}</span>
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label={menuLabel}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className={`inline-flex h-9 items-center gap-2 rounded-lg border border-line px-2.5 text-charcoal/75 transition-colors hover:bg-ivory-2 ${open ? "bg-ivory-2" : ""}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {open ? <><path d="M6 6l12 12"/><path d="M18 6l-12 12"/></> : <><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/></>}
              </svg>
              <span className="hidden text-[13px] font-medium sm:inline">{menuLabel}</span>
              {saved > 0 ? <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-signal px-1 text-[9px] font-medium text-white fig">{saved}</span> : null}
            </button>

            {open && (
              <div className="absolute end-0 top-full z-50 mt-2 w-[270px] overflow-hidden rounded-xl border border-line bg-ivory shadow-[0_18px_44px_rgba(20,24,28,0.20)]">
                <div className="border-b border-line bg-ivory-2 px-4 py-3">
                  <p className="text-[14px] font-semibold text-charcoal">{welcomeTitle}</p>
                  <p className="mt-0.5 text-[11.5px] text-charcoal/55">{welcomeSub}</p>
                </div>

                <div className="px-2 py-2">
                  <p className="px-2 pb-1 pt-1 text-[10.5px] font-semibold uppercase tracking-wider text-charcoal/40">{browseLabel}</p>
                  {nav.map((n) => (
                    <Link key={n.href} href={n.href} className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-[14px] hover:bg-ivory-2 ${active(n.href) ? "bg-ivory-2 font-medium text-charcoal" : "text-charcoal/80"}`}>
                      {n.label}
                    </Link>
                  ))}
                </div>

                <div className="border-t border-line px-2 py-2">
                  <p className="px-2 pb-1 pt-1 text-[10.5px] font-semibold uppercase tracking-wider text-charcoal/40">{accountLabel}</p>
                  <Link href={`/${locale}/saved`} className="flex items-center justify-between rounded-lg px-2.5 py-2 text-[14px] text-charcoal/80 hover:bg-ivory-2">
                    <span>{savedLabel}</span>
                    {saved > 0 ? <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-signal px-1 text-[9px] font-medium text-white fig">{saved}</span> : null}
                  </Link>
                  <Link href={`/${locale}/login`} className="block rounded-lg px-2.5 py-2 text-[14px] text-charcoal/80 hover:bg-ivory-2">{signInLabel}</Link>
                </div>

                <div className="flex items-center justify-between border-t border-line px-4 py-3 sm:hidden">
                  <span className="text-[12px] text-charcoal/55">{dict.nav.language}</span>
                  <LanguageSwitch locale={locale} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
