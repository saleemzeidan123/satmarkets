import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import Header from "@/components/Header";
import HtmlLangDir from "@/components/HtmlLangDir";

export default function LocaleLayout({ children, params }: { children: ReactNode; params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const dict = getDictionary(locale);
  return (
    <>
      <HtmlLangDir locale={locale} />
      <Header locale={locale} dict={dict} />
      <main className="mx-auto max-w-6xl px-6 py-10 min-h-[70vh]">{children}</main>
      <footer className="mt-10 border-t border-line bg-ivory-2/60">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
            <div>
              <div className="font-display text-lg"><span className="text-charcoal">SAT</span> <span className="italic text-gold">Markets</span></div>
              <p className="mt-2 max-w-sm text-sm text-charcoal/55">Verified commercial real estate for Saudi Arabia. Powered by SAT Real Estate. Open to the market.</p>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm text-charcoal/65">
              <Link href={`/${locale}/listings`} className="hover:text-charcoal">Listings</Link>
              <Link href={`/${locale}/search`} className="hover:text-charcoal">AI search</Link>
              <Link href={`/${locale}/rent-index`} className="hover:text-charcoal">Rent index</Link>
              <Link href={`/${locale}/dashboard`} className="hover:text-charcoal">List your space</Link>
            </div>
          </div>
          <div className="mt-8 hairline" />
          <p className="mt-4 text-xs text-charcoal/45">SAT Markets | Powered by SAT Real Estate. FAL licensed, Real Estate General Authority, KSA.</p>
        </div>
      </footer>
    </>
  );
}
