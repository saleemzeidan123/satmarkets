"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import { locales, type Locale } from "@/i18n/config";

// Switching language keeps the reader where they are, filters included. The
// link's own address is the path alone (the server cannot know the query when
// it renders the header), so a plain click is completed here with whatever
// query the address bar holds. A modified click (new tab, new window) is left
// to the browser.
function keepQuery(e: MouseEvent<HTMLAnchorElement>, href: string) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const q = window.location.search;
  if (!q) return;
  e.preventDefault();
  window.location.assign(href + q);
}

export default function LanguageSwitch({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const pathname = usePathname();
  const rest = pathname.replace(/^\/(en|ar)/, "") || "";
  // The phone header has no room for the two-part pill, so the switch was only
  // inside the menu, where nobody looking for Arabic would think to open it. The
  // compact form is one link, in the header, naming the OTHER language in that
  // language: an Arabic reader on the English page reads "العربية" and taps it.
  if (compact) {
    const other: Locale = locale === "ar" ? "en" : "ar";
    const href = `/${other}${rest}`;
    return (
      <Link href={href} className="lang-one" lang={other} hrefLang={other} onClick={(e) => keepQuery(e, href)}>
        {other === "ar" ? "العربية" : "English"}
      </Link>
    );
  }
  return (
    <div className="lang-pill">
      {locales.map((l) => {
        const href = `/${l}${rest}`;
        return <Link key={l} href={href} className={`lang-seg ${l === locale ? "on" : ""}`} onClick={(e) => keepQuery(e, href)}>{l.toUpperCase()}</Link>;
      })}
    </div>
  );
}
