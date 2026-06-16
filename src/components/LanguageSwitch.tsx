"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";

export default function LanguageSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  return (
    <div className="lang-pill">
      {locales.map((l) => {
        const rest = pathname.replace(/^\/(en|ar)/, "") || "";
        const href = `/${l}${rest}`;
        return <Link key={l} href={href} className={`lang-seg ${l === locale ? "on" : ""}`}>{l.toUpperCase()}</Link>;
      })}
    </div>
  );
}
