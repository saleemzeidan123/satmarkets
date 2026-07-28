import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import Header from "@/components/Header";
import SatFooter from "@/components/SatFooter";
import ChromeGate from "@/components/ChromeGate";
import TabBar from "@/components/TabBar";
import AdvisorWidget from "@/components/AdvisorWidget";
import HtmlLangDir from "@/components/HtmlLangDir";
import JsonLd, { ORG, website } from "@/components/JsonLd";

// Preview containment (SM-P0-006). Everything on this deployment is sample data
// until the owner sets SITE_ENV=production, so the notice is persistent and site
// wide rather than a per-page banner that some routes forget to mount.
const PREVIEW = (process.env.SITE_ENV ?? process.env.NEXT_PUBLIC_SITE_ENV) !== "production";

export default function LocaleLayout({ children, params }: { children: ReactNode; params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const dict = getDictionary(locale);
  const ar = locale === "ar";
  const f = dict.footer;
  const couplet = dict.layout.couplet;
  const family = dict.layout.family;
  // Both keys exist in both dictionaries. The casts and the English fallbacks
  // date from before they did, and the fallback was dead code that would have
  // dropped a Latin label into an Arabic footer if it had ever fired.
  const areas = dict.nav.areas;
  const develop = dict.nav.develop;
  const signIn = dict.layout.signIn;
  const cols = [
    { h: dict.layout.colMarket, links: [
      { href: `/${locale}/listings`, label: f.listings },
      { href: `/${locale}/map`, label: f.map },
      { href: `/${locale}/saved`, label: dict.layout.saved },
      { href: `/${locale}/dashboard`, label: f.listSpace },
    ]},
    { h: dict.layout.colIntel, links: [
      { href: `/${locale}/area`, label: areas },
      { href: `/${locale}/rent-index`, label: f.rentIndex },
      { href: `/${locale}/search`, label: f.search },
      { href: `/${locale}/hbu`, label: develop },
    ]},
    { h: dict.layout.colCompany, links: [
      { href: `/${locale}/about`, label: dict.nav.about },
      { href: `/${locale}/login`, label: signIn },
    ]},
  ];
  return (
    <>
      <a href="#main" className="skip-link">{dict.layout.skip}</a>
      <HtmlLangDir locale={locale} />
      <JsonLd data={ORG} />
      {/* Emitted per locale so the Arabic document never advertises an English
          entry point. The SearchAction is only honest now that /listings actually
          narrows on `q`. */}
      <JsonLd data={website(locale as "en" | "ar")} />
      <ChromeGate header={<>
      {PREVIEW ? (
      <div role="status" className="topnotice preview-notice" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#FFFBEB", color: "#78350F", borderBottom: "1px solid #FCD34D", padding: "8px 24px", fontSize: 12.5, lineHeight: 1.5, flexWrap: "wrap", textAlign: "center" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" style={{ flex: "none" }}><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>
        <span style={{ fontWeight: 600 }}>{dict.layout.preview}</span>
      </div>
      ) : (
      <div className="topnotice" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, background: "var(--ink)", color: "var(--on-brand)", padding: "8px 24px", fontSize: 12.5, flexWrap: "wrap" }}>
        <svg width="16" height="16" viewBox="0 0 100 100" style={{ flex: "none" }}><rect x="7" y="7" width="32" height="48" rx="3" fill="#F6F8FB"/><rect x="44" y="7" width="49" height="48" rx="3" fill="#3A6EA5"/><rect x="7" y="59" width="32" height="34" rx="3" fill="#F6F8FB"/><rect x="44" y="59" width="49" height="34" rx="3" fill="#F6F8FB"/></svg>
        <span style={{ color: "rgba(255,255,255,.86)" }}>{dict.layout.notice}</span>
        <Link href={`/${locale}/rent-index`} style={{ color: "var(--azure-l)", fontWeight: 600, textDecoration: "none" }}>{dict.layout.explore}</Link>
      </div>
      )}
      <Header locale={locale} dict={dict} />
      </>} footer={<><SatFooter locale={locale} /><TabBar locale={locale} /></>}>
      <main id="main" tabIndex={-1} className="min-h-[70vh] has-tabbar">{children}</main>
      </ChromeGate>
      <AdvisorWidget locale={locale} />
    </>
  );
}
