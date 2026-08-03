import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import LegalDoc from "@/components/LegalDoc";
import { LEGAL } from "@/lib/legalContent";
import { getDictionary } from "@/i18n/getDictionary";
import { localeMeta } from "@/lib/meta";

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const m = getDictionary(params.locale === "ar" ? "ar" : "en").legalMeta;
  // robots stays explicit here rather than riding the site-wide noindex: the
  // contact details on this page are prototype placeholders, so it must stay out
  // of the index even after indexing is eventually allowed for the rest of the site.
  return localeMeta(params.locale, "/contact", m.contactTitle, m.contactDesc, { robots: { index: false } });
}

export default async function ContactPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  if (!isLocale(params.locale)) notFound();
  const locale = (params.locale === "ar" ? "ar" : "en") as "en" | "ar";
  return <LegalDoc locale={locale} doc={LEGAL.contact} />;
}
