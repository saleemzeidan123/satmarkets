import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import LegalDoc from "@/components/LegalDoc";
import { LEGAL } from "@/lib/legalContent";

export function generateMetadata({ params }: { params: { locale: string } }) {
  const ar = params.locale === "ar";
  const d = LEGAL.privacy;
  return { title: (ar ? d.titleAr : d.titleEn) + " | SAT Markets", robots: { index: false } };
}

export default function PrivacyPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = (params.locale === "ar" ? "ar" : "en") as "en" | "ar";
  return <LegalDoc locale={locale} doc={LEGAL.privacy} />;
}
