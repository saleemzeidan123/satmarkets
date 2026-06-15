import Link from "next/link";
import LanguageSwitch from "@/components/LanguageSwitch";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/getDictionary";

export default function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <header className="border-b border-charcoal/10 bg-ivory">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link href={`/${locale}`} className="font-serif text-xl">
          <span className="text-charcoal">SAT</span> <span className="text-gold italic">Markets</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-charcoal/80">
          <Link href={`/${locale}/listings`}>{dict.nav.listings}</Link>
          <Link href={`/${locale}/requirements`}>{dict.nav.requirements}</Link>
          <Link href={`/${locale}/rent-index`}>{dict.nav.rentIndex}</Link>
          <Link href={`/${locale}/about`}>{dict.nav.about}</Link>
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitch locale={locale} />
          <Link href={`/${locale}/dashboard`} className="rounded bg-gold px-3 py-1.5 text-sm text-white">
            {dict.nav.listSpace}
          </Link>
        </div>
      </div>
    </header>
  );
}
