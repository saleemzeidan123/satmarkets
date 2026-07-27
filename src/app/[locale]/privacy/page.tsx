import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import LegalDoc from "@/components/LegalDoc";
import { LEGAL } from "@/lib/legalContent";
import { getDictionary } from "@/i18n/getDictionary";
import { localeMeta } from "@/lib/meta";

export function generateMetadata({ params }: { params: { locale: string } }) {
  const m = getDictionary(params.locale === "ar" ? "ar" : "en").legalMeta;
  // robots stays explicit here rather than riding the site-wide noindex: this
  // document is a working draft pending licensed counsel, so it must stay out of
  // the index even after indexing is eventually allowed for the rest of the site.
  return localeMeta(params.locale, "/privacy", m.privacyTitle, m.privacyDesc, { robots: { index: false } });
}

export default function PrivacyPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = (params.locale === "ar" ? "ar" : "en") as "en" | "ar";
  return <LegalDoc locale={locale} doc={LEGAL.privacy} />;
}
