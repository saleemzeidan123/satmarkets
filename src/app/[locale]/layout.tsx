import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import Header from "@/components/Header";
import HtmlLangDir from "@/components/HtmlLangDir";

export default function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const dict = getDictionary(locale);
  return (
    <>
      <HtmlLangDir locale={locale} />
      <Header locale={locale} dict={dict} />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      <footer className="border-t border-charcoal/10 py-6 text-center text-xs text-charcoal/50">
        {dict.common.poweredBy}
      </footer>
    </>
  );
}
