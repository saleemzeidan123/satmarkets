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
  const f = dict.footer;
  return (
    <>
      <HtmlLangDir locale={locale} />
      <Header locale={locale} dict={dict} />
      <main className="mx-auto min-h-[70vh] max-w-6xl px-5 py-8 sm:px-6 sm:py-10">{children}</main>
      <footer className="mt-10 border-t border-line bg-ivory-2/60">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
            <div>
              <div className="font-display text-lg"><span className="text-charcoal">SAT</span> <span className="italic text-gold">Markets</span></div>
              <p className="mt-2 max-w-sm text-sm text-charcoal/55">{f.tagline}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm text-charcoal/65 sm:gap-x-12">
              <Link href={`/${locale}/map`} className="hover:text-charcoal">{f.map}</Link>
              <Link href={`/${locale}/listings`} className="hover:text-charcoal">{f.listings}</Link>
              <Link href={`/${locale}/search`} className="hover:text-charcoal">{f.search}</Link>
              <Link href={`/${locale}/rent-index`} className="hover:text-charcoal">{f.rentIndex}</Link>
              <Link href={`/${locale}/dashboard`} className="hover:text-charcoal">{f.listSpace}</Link>
            </div>
          </div>
          <div className="mt-8 hairline" />
          <p className="mt-4 text-xs text-charcoal/45">{f.legal}</p>
        </div>
      </footer>
    </>
  );
}
