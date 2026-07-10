// Shared page metadata builder: locale-aware title/description, canonical, hreflang, OpenGraph.
import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export function pageMeta(
  locale: string,
  path: string,
  titleEn: string,
  titleAr: string,
  descEn: string,
  descAr: string,
): Metadata {
  const ar = locale === "ar";
  const title = ar ? titleAr : titleEn;
  const description = ar ? descAr : descEn;
  const url = `${SITE}/${locale}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: { en: `${SITE}/en${path}`, ar: `${SITE}/ar${path}` } },
    openGraph: { title, description, url, type: "website", siteName: "SAT Markets" },
  };
}
