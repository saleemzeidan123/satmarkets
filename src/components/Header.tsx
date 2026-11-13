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
  const MENU_ID = "hdr-site-menu";

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

  // PKG-DESIGN-9. The owner's complaint was that the header did not carry the
  // sections the site has, and three independent critics found the same thing
  // from three directions: Market pulse, Map, Locations, Post a requirement,
  // Verification, Sources and Neutrality were in neither the bar nor the menu,
  // and on a phone Advisor and Requirements were reachable from nowhere.
  //
  // So there is now one list of sections, in four groups, and both the bar and
  // the menu are drawn from it. The bar carries the five places people go to
  // most. The menu carries every section, the bar's five included, because the
  // bar is hidden below the large breakpoint and a section that lives only in
  // a hidden bar is a section a phone cannot reach.
  //
  // Pricing is not here. Its tier cards have no working purchase behind them
  // (see /pricing), and a planned page offered beside working ones read as a
  // destination. It stays in the footer until the offer is real.
  const at = (path: string) => `/${locale}${path}`;
  const primaryNav = [
    { href: at("/listings"), label: dict.nav.explore },
    { href: at("/requirements"), label: dict.nav.requirements },
    { href: at("/rent-index"), label: dict.nav.rentIndex },
    { href: at("/market"), label: dict.nav.market },
    { href: at("/advisor"), label: dict.nav.advisor },
  ];
  // /list is the real, working, public listing intake. The session-gated owner
  // shell is reached from the account group, by people who have a session.
  const groups = [
    { id: "find", title: dict.nav.gFind, items: [
      { href: at("/listings"), label: dict.nav.explore },
      { href: at("/map"), label: dict.nav.map },
      { href: at("/locations"), label: dict.nav.locations },
      { href: at("/post-requirement"), label: dict.nav.postRequirement },
    ] },
    { id: "market", title: dict.nav.gMarket, items: [
      { href: at("/rent-index"), label: dict.nav.rentIndex },
      { href: at("/market"), label: dict.nav.market },
      { href: at("/advisor"), label: dict.nav.advisor },
      { href: at("/sources"), label: dict.nav.sources },
    ] },
    { id: "owners", title: dict.nav.gOwners, items: [
      { href: at("/list"), label: dict.nav.listSpace },
      { href: at("/requirements"), label: dict.nav.requirementsBoard },
      { href: at("/brokers"), label: dict.nav.brokers },
      { href: at("/listers"), label: dict.nav.listers },
    ] },
    { id: "how", title: dict.nav.gHow, items: [
      { href: at("/verification"), label: dict.nav.verification },
      { href: at("/neutrality"), label: dict.nav.neutrality },
      { href: at("/about"), label: dict.nav.about },
    ] },
  ];
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const signInLabel = dict.nav.signIn;
  const menuLabel = dict.nav.menu;
  const accountLabel = dict.nav.account;
  const savedLabel = dict.nav.saved;
  const row = "flex min-h-11 items-center justify-between gap-3 text-[0.9375rem] text-charcoal hover:text-harbor lg:min-h-9";

  return (
    <header className="site-header sticky top-0 z-40" style={{ borderBottomColor: "var(--silver-2)", boxShadow: "none" }}>
      <div className="mx-auto flex h-[52px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-6 lg:h-14">
        <div className="flex items-center gap-10">
          <Link href={`/${locale}`} className="flex items-center" aria-label={locale === "ar" ? "سات ماركتس، الرئيسية" : "SAT Markets, home"}><Logo size={30} /></Link>

          {/* The bar's links sit beside the logo and read as the navigation they
              are: full ink, medium weight, no pill. The page a reader is on is
              marked on the bar's own rule with a measuring line, a hairline
              with a tick at each end, the same mark the search form uses for
              area. It is symmetrical, so it reads the same in Arabic. */}
          <nav className="hidden items-stretch gap-7 lg:flex" aria-label={dict.nav.primaryNav}>
            {primaryNav.map((n) => (
              <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined} className={`relative flex h-14 items-center text-[0.875rem] font-medium transition-colors hover:text-harbor ${active(n.href) ? "text-harbor" : "text-charcoal"}`}>
                {n.label}
                {active(n.href) ? <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[5px] border-x border-b border-harbor" /> : null}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:inline-flex"><LanguageSwitch locale={locale} /></span>
          <span className="sm:hidden"><LanguageSwitch locale={locale} compact /></span>
          {signedIn ? (
            <Link href={at("/dashboard")} className="hidden text-[0.8125rem] text-charcoal/80 hover:text-harbor xl:inline">{dict.dashboard.navOverview}</Link>
          ) : (
            <Link href={at("/login")} className="hidden text-[0.8125rem] text-charcoal/80 hover:text-harbor xl:inline">{signInLabel}</Link>
          )}
          {/* The one button in the bar. */}
          <Link href={at("/list")} className="inline-flex h-9 items-center rounded-[4px] border border-harbor px-3 text-[0.8125rem] font-medium text-harbor transition-colors hover:bg-ivory-2">
            <span className="sm:hidden">{dict.nav.list}</span>
            <span className="hidden sm:inline">{dict.nav.listSpace}</span>
          </Link>

          {/* The wrapper holds the trigger and the sheet, so that focus leaving
              the pair closes the sheet. It used to close on an outside click
              only, and a keyboard reader who tabbed past the last link left it
              open over the page. */}
          <div ref={menuRef} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false); }}>
            <button
              type="button"
              ref={menuBtnRef}
              /* ELITE-4 J3-38: aria-label replaces the button's contents, so the saved
                 count is folded into the name. */
              aria-label={saved > 0 ? `${menuLabel}, ${savedLabel} ${saved}` : menuLabel}
              /* A disclosure, not a menu: the sheet is a list of links, so the
                 trigger says expanded and names what it controls, and does not
                 promise the arrow-key behaviour `aria-haspopup` would. */
              aria-expanded={open}
              aria-controls={open ? MENU_ID : undefined}
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-9 items-center gap-2 px-1.5 text-charcoal transition-colors hover:text-harbor"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                {open ? <><path d="M6 6l12 12"/><path d="M18 6l-12 12"/></> : <><path d="M3 8h18"/><path d="M3 16h18"/></>}
              </svg>
              <span className="hidden text-[0.8125rem] font-medium sm:inline">{menuLabel}</span>
            </button>

            {open && (
              /* A sheet the width of the page, attached to the bar. It is the
                 whole site in four groups and an account group. Plain text:
                 no icons, no descriptions, no welcome. `tabIndex` lets a click
                 on its padding keep focus inside, so that click does not read
                 as focus leaving. */
              <nav id={MENU_ID} aria-label={menuLabel} tabIndex={-1} className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-52px)] overflow-y-auto border-b border-t border-line bg-ivory outline-none lg:max-h-[calc(100dvh-56px)]">
                <div className="mx-auto grid max-w-7xl gap-x-8 px-5 pb-24 pt-2 sm:grid-cols-2 sm:px-6 lg:grid-cols-5 lg:pb-8 lg:pt-6">
                  {groups.map((g) => (
                    <div key={g.id} role="group" aria-labelledby={`hdr-g-${g.id}`} className="border-b border-line py-3 lg:border-0 lg:py-0">
                      <p id={`hdr-g-${g.id}`} className="pb-1 text-[0.75rem] font-medium text-charcoal/65">{g.title}</p>
                      <ul className="m-0 list-none p-0">
                        {g.items.map((n) => (
                          <li key={n.href}>
                            <Link href={n.href} aria-current={active(n.href) ? "page" : undefined} className={`${row} ${active(n.href) ? "font-medium text-harbor" : ""}`}>{n.label}</Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <div role="group" aria-labelledby="hdr-g-account" className="py-3 lg:py-0">
                    <p id="hdr-g-account" className="pb-1 text-[0.75rem] font-medium text-charcoal/65">{accountLabel}</p>
                    <ul className="m-0 list-none p-0">
                      <li>
                        {signedIn ? (
                          <Link href={at("/dashboard")} className={row}>{dict.dashboard.navOverview}</Link>
                        ) : (
                          <Link href={at("/login")} className={row}>{signInLabel}</Link>
                        )}
                      </li>
                      <li>
                        {/* ELITE-4 J3-38: the count is a bare number beside the link text. */}
                        <Link href={at("/saved")} aria-label={saved > 0 ? `${savedLabel} ${saved}` : undefined} className={row}>
                          <span>{savedLabel}</span>
                          {saved > 0 ? <span className="fig text-[0.8125rem] text-charcoal/65">{saved}</span> : null}
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </nav>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
