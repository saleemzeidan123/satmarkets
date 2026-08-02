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
  // The account menu used to offer "Sign in" to people who were already signed in.
  // Resolve the real session and show them where their account actually is.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  // PKG-E1-READINESS slice E, WS33. The client is imported here rather than at
  // the top of the file, and the reason is that this header is on every public
  // page on the platform.
  //
  // A static import put the Supabase browser client into the first script set of
  // every marketing route: 244.7 kB raw, 64.8 kB over the wire, which measured
  // as roughly a quarter of all the JavaScript on the home page. None of it is
  // needed to paint a header. It is needed to answer one question, whether the
  // person reading is signed in, and that question is asked in an effect after
  // the paint has already happened.
  //
  // Deferring it does not remove a byte from a signed-in reader's session, and
  // it is not meant to: the same chunk is fetched a moment later by this same
  // effect. What it removes is the chunk's place in the render-blocking script
  // set, so first paint no longer waits on an authentication library. Measured
  // before and after in docs/performance-baseline.md.
  useEffect(() => {
    let alive = true;
    let unsubscribe: (() => void) | undefined;
    (async () => {
      const { getSupabaseBrowser } = await import("@/lib/supabase/client");
      if (!alive) return;
      const sb = getSupabaseBrowser();
      if (!sb) { setSignedIn(false); return; }
      sb.auth.getUser().then(({ data }) => { if (alive) setSignedIn(!!data.user); }).catch(() => { if (alive) setSignedIn(false); });
      const { data: sub } = sb.auth.onAuthStateChange((_e, sess) => { if (alive) setSignedIn(!!sess?.user); });
      unsubscribe = () => sub?.subscription?.unsubscribe();
      // The component can unmount while the import is still in flight, so the
      // subscription has to be checked against the flag it was made after.
      if (!alive) unsubscribe();
    })();
    return () => { alive = false; unsubscribe?.(); };
  }, []);
  const [saved, setSaved] = useState(0);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  /* ELITE-4 J3-37: Escape closed the panel and left focus on nothing. */
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const MENU_ID = "hdr-account-menu";

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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); menuBtnRef.current?.focus(); } };
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
        <Link href={`/${locale}`} className="flex items-center" aria-label={locale === "ar" ? "سات ماركتس، الرئيسية" : "SAT Markets, home"}><Logo size={34} /></Link>

        <nav className="hidden md:flex items-center gap-0.5" aria-label={dict.nav.primaryNav}>
          {primaryNav.map((n) => (
            <Link key={n.href} href={n.href} className={`rounded-lg px-3 py-2 text-[0.84375rem] transition-colors ${active(n.href) ? "bg-ivory-2 text-charcoal font-semibold" : "text-charcoal/70 font-medium hover:bg-ivory-2 hover:text-charcoal"}`}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <span className="hidden sm:inline-flex"><LanguageSwitch locale={locale} /></span>
          <Link href={`/${locale}/dashboard`} className="btn-ink px-3.5 py-2 text-[0.8125rem] font-medium">
            <span className="sm:hidden">{dict.nav.list}</span>
            <span className="hidden sm:inline">{dict.nav.listSpace}</span>
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              ref={menuBtnRef}
              /* ELITE-4 J3-38: aria-label replaces the button's contents, so the saved
                 count in the badge was not in the name at all. It is folded in here,
                 and the badge itself is hidden from the name to avoid saying it twice. */
              aria-label={saved > 0 ? `${menuLabel}, ${savedLabel} ${saved}` : menuLabel}
              aria-expanded={open}
              /* ELITE-4 J3-37: the trigger never said it opens a popup, nor which one. */
              aria-haspopup="true"
              aria-controls={open ? MENU_ID : undefined}
              onClick={() => setOpen((v) => !v)}
              className={`inline-flex h-9 items-center gap-2 rounded-lg border border-line px-2.5 text-charcoal/80 transition-colors hover:border-charcoal/25 hover:bg-ivory-2 ${open ? "border-charcoal/25 bg-ivory-2" : ""}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {open ? <><path d="M6 6l12 12"/><path d="M18 6l-12 12"/></> : <><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/></>}
              </svg>
              <span className="hidden text-[0.8125rem] font-medium sm:inline">{menuLabel}</span>
              {saved > 0 ? <span aria-hidden="true" className="flex h-4 min-w-4 items-center justify-center rounded-full bg-signal px-1 text-[0.5625rem] font-medium text-white fig">{saved}</span> : null}
            </button>

            {open && (
              /* ELITE-4 J3-37: the popup itself was an anonymous div. */
              <div id={MENU_ID} role="group" aria-label={menuLabel} className="absolute end-0 top-full z-50 mt-2 w-[270px] overflow-hidden rounded-xl border border-line bg-ivory shadow-[0_18px_44px_rgba(20,24,28,0.20)]">
                <div className="border-b border-line bg-ivory-2 px-4 py-3">
                  <p className="text-[0.875rem] font-semibold text-charcoal">{welcomeTitle}</p>
                  <p className="mt-0.5 text-[0.71875rem] text-charcoal/65">{welcomeSub}</p>
                </div>

                <div className="px-2 py-2">
                  <p className="px-2 pb-1 pt-1 text-[0.65625rem] font-semibold uppercase tracking-wider text-charcoal/65">{browseLabel}</p>
                  {nav.map((n) => (
                    <Link key={n.href} href={n.href} className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-[0.875rem] hover:bg-ivory-2 ${active(n.href) ? "bg-ivory-2 font-medium text-charcoal" : "text-charcoal/80"}`}>
                      {n.label}
                    </Link>
                  ))}
                </div>

                <div className="border-t border-line px-2 py-2">
                  <p className="px-2 pb-1 pt-1 text-[0.65625rem] font-semibold uppercase tracking-wider text-charcoal/65">{accountLabel}</p>
                  {/* ELITE-4 J3-38: the badge is a bare number beside the link text. */}
                  <Link href={`/${locale}/saved`} aria-label={saved > 0 ? `${savedLabel} ${saved}` : undefined} className="flex items-center justify-between rounded-lg px-2.5 py-2 text-[0.875rem] text-charcoal/80 hover:bg-ivory-2">
                    <span>{savedLabel}</span>
                    {saved > 0 ? <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-signal px-1 text-[0.5625rem] font-medium text-white fig">{saved}</span> : null}
                  </Link>
                  {signedIn ? (
                    <Link href={`/${locale}/dashboard`} className="block rounded-lg px-2.5 py-2 text-[0.875rem] text-charcoal/80 hover:bg-ivory-2">{dict.dashboard.navOverview}</Link>
                  ) : (
                    <Link href={`/${locale}/login`} className="block rounded-lg px-2.5 py-2 text-[0.875rem] text-charcoal/80 hover:bg-ivory-2">{signInLabel}</Link>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-line px-4 py-3 sm:hidden">
                  <span className="text-[0.75rem] text-charcoal/65">{dict.nav.language}</span>
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
