"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";

export default function LanguageSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 text-xs">
      {locales.map((l) => {
        const rest = pathname.replace(/^\/(en|ar)/, "") || "";
        const href = `/${l}${rest}`;
        const active = l === locale;
        return (
          <Link
            key={l}
            href={href}
            className={`px-2 py-1 rounded ${active ? "bg-gold text-white" : "text-charcoal/70"}`}
          >
            {l.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}
