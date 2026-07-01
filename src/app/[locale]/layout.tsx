import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import Header from "@/components/Header";
import SatFooter from "@/components/SatFooter";
import ChromeGate from "@/components/ChromeGate";
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
      <ChromeGate header={<>
      <div className="topnotice" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, background: "#14181B", color: "#fff", padding: "8px 24px", fontSize: 12.5, flexWrap: "wrap" }}>
        <svg width="16" height="16" viewBox="0 0 100 100" style={{ flex: "none" }}><rect x="7" y="7" width="32" height="48" rx="3" fill="#F6F8FB"/><rect x="44" y="7" width="49" height="48" rx="3" fill="#3A6EA5"/><rect x="7" y="59" width="32" height="34" rx="3" fill="#F6F8FB"/><rect x="44" y="59" width="49" height="34" rx="3" fill="#F6F8FB"/></svg>
        <span style={{ color: "rgba(255,255,255,.86)" }}>{ar ? "مؤشر SAT للإيجارات للربع الأول 2026 متاح الآن. معايير الرياض المنشورة، منسوبة إلى مصادرها." : "SAT Rent Index Q1 2026 is live. Published Riyadh benchmarks, attributed to source."}</span>
        <Link href={`/${locale}/rent-index`} style={{ color: "#9DBBD6", fontWeight: 600, textDecoration: "none" }}>{ar ? "استكشف ←" : "Explore →"}</Link>
      </div>
      <Header locale={locale} dict={dict} />
      </>} footer={<SatFooter locale={locale} />}>
      <main className="min-h-[70vh]">{children}</main>
      </ChromeGate>
    </>
  );
}
