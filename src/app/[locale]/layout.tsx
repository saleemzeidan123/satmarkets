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
  const ar = locale === "ar";
  const f = dict.footer;
  const couplet = ar ? "المساحة لك. وكذلك الأرقام." : "The space is yours. So are the numbers.";
  const family = ar ? "من سات العقارية" : "By SAT Real Estate";
  const areas = (dict.nav as any).areas ?? "Area intel";
  const develop = (dict.nav as any).develop ?? "Develop";
  const signIn = ar ? "تسجيل الدخول" : "Sign in";
  const cols = [
    { h: ar ? "السوق" : "Marketplace", links: [
      { href: `/${locale}/listings`, label: f.listings },
      { href: `/${locale}/map`, label: f.map },
      { href: `/${locale}/saved`, label: ar ? "المحفوظة" : "Saved" },
      { href: `/${locale}/dashboard`, label: f.listSpace },
    ]},
    { h: ar ? "الذكاء" : "Intelligence", links: [
      { href: `/${locale}/area`, label: areas },
      { href: `/${locale}/rent-index`, label: f.rentIndex },
      { href: `/${locale}/search`, label: f.search },
      { href: `/${locale}/hbu`, label: develop },
    ]},
    { h: ar ? "الشركة" : "Company", links: [
      { href: `/${locale}/about`, label: dict.nav.about },
      { href: `/${locale}/login`, label: signIn },
    ]},
  ];
  return (
    <>
      <HtmlLangDir locale={locale} />
      <Header locale={locale} dict={dict} />
      <main className="mx-auto min-h-[70vh] max-w-6xl px-5 py-8 sm:px-6 sm:py-10">{children}</main>
      <footer className="mt-16 border-t border-line bg-ivory-2/60 brand-grid">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6">
          <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-[11px]" style={{background:"#14181B"}}><svg width="22" height="22" viewBox="0 0 32 32"><rect x="6" y="6" width="20" height="20" rx="5" fill="#fff"/><rect x="17" y="17" width="9" height="9" rx="2.5" fill="#2E5FE0"/></svg></span>
                <span className="flex flex-col leading-none">
                  <span className="font-display text-[19px]"><span className="text-charcoal">SAT</span> <span className="italic font-normal text-charcoal/70">Markets</span></span>
                  <span className="mt-1 flex items-center gap-1.5"><span className="live-dot" /><span className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate/80">{ar ? "ذكاء السوق العقاري" : "real-estate intelligence"}</span></span>
                </span>
              </div>
              <p className="mt-4 font-display text-[16px] italic text-charcoal/90">{couplet}</p>
              <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-charcoal/55">{f.tagline}</p>
            </div>
            {cols.map((c) => (
              <div key={c.h}>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-charcoal/40">{c.h}</div>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map((l) => (
                    <li key={l.href}><Link href={l.href} className="text-[13.5px] text-charcoal/60 transition hover:text-charcoal">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 hairline" />
          <div className="mt-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-xs text-charcoal/45">{f.legal}</p>
            <p className="text-[10.5px] uppercase tracking-[0.2em] text-charcoal/40">{family}</p>
          </div>
        </div>
      </footer>
    </>
  );
}
