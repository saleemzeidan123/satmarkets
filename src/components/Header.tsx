import Link from "next/link";
import LanguageSwitch from "@/components/LanguageSwitch";
import MobileNav from "@/components/MobileNav";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/getDictionary";

export default function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const nav = [
    { href: `/${locale}/map`, label: (dict.nav as any).map ?? "Map" },
    { href: `/${locale}/listings`, label: dict.nav.listings },
    { href: `/${locale}/search`, label: dict.search.title },
    { href: `/${locale}/rent-index`, label: dict.nav.rentIndex },
    { href: `/${locale}/hbu`, label: (dict.nav as any).develop ?? "Develop" },
    { href: `/${locale}/about`, label: dict.nav.about }
  ];
  const signInLabel = locale === "ar" ? "تسجيل الدخول" : "Sign in";
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ivory/85 backdrop-blur-md">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-6">
        <Link href={`/${locale}`} className="font-display text-[21px] tracking-tight sm:text-[22px]">
          <span className="text-charcoal">SAT</span> <span className="italic text-gold">Markets</span>
        </Link>
        <nav className="hidden items-center gap-7 text-[13.5px] text-charcoal/75 md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="link-underline hover:text-charcoal">{n.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <LanguageSwitch locale={locale} />
          <Link href={`/${locale}/login`} className="hidden text-[13.5px] text-charcoal/70 hover:text-charcoal sm:block">{signInLabel}</Link>
          <Link href={`/${locale}/dashboard`} className="btn-gold px-3.5 py-2 text-[13px] font-medium sm:text-[13.5px]">{dict.nav.listSpace}</Link>
          <MobileNav items={nav} signIn={`/${locale}/login`} signInLabel={signInLabel} />
        </div>
      </div>
    </header>
  );
}
