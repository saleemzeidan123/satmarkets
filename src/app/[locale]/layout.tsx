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
  const couplet = locale === "ar" ? "المساحة لك. وكذلك الأرقام." : "The space is yours. So are the numbers.";
  const family = locale === "ar" ? "شركة ضمن مجموعة سات" : "An SAT company";
  return (
    <>
      <HtmlLangDir locale={locale} />
      <Header locale={locale} dict={dict} />
      <main className="mx-auto min-h-[70vh] max-w-6xl px-5 py-8 sm:px-6 sm:py-10">{children}</main>
      <footer className="mt-10 border-t border-line bg-ivory-2/60 brand-grid">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{background:"#14181B"}}><svg width="20" height="20" viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="1.6"/><circle cx="16" cy="16" r="8.5" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.6"/><circle cx="16" cy="16" r="3.4" fill="#2FB8A6"/></svg></span><div className="font-display text-lg"><span className="text-charcoal">SAT</span> <span className="italic text-charcoal">Markets</span></div>
                <span className="live-dot" />
              </div>
              <p className="mt-2 font-display text-[15px] italic text-charcoal/90">{couplet}</p>
              <p className="mt-1.5 max-w-sm text-sm text-charcoal/55">{f.tagline}</p>
              <p className="mt-3 text-[10.5px] uppercase tracking-[0.18em] text-charcoal/40">{family}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm text-charcoal/65 sm:gap-x-12">
              <Link href={`/${locale}/map`} className="hover:text-charcoal">{f.map}</Link>
              <Link href={`/${locale}/listings`} className="hover:text-charcoal">{f.listings}</Link>
              <Link href={`/${locale}/search`} className="hover:text-charcoal">{f.search}</Link>
              <Link href={`/${locale}/rent-index`} className="hover:text-charcoal">{f.rentIndex}</Link>
              <Link href={`/${locale}/area`} className="hover:text-charcoal">{(dict.nav as any).areas ?? "Area intel"}</Link>
              <Link href={`/${locale}/hbu`} className="hover:text-charcoal">{(dict.nav as any).develop ?? "Develop"}</Link>
              <Link href={`/${locale}/saved`} className="hover:text-charcoal">{locale === "ar" ? "المحفوظة" : "Saved"}</Link>
              <Link href={`/${locale}/about`} className="hover:text-charcoal">{dict.nav.about}</Link>
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
