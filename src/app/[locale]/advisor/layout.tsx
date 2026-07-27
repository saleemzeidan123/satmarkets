import type { ReactNode } from "react";
import { localeMeta } from "@/lib/meta";
import { getDictionary } from "@/i18n/getDictionary";

export function generateMetadata({ params }: { params: { locale: string } }) {
  const d = getDictionary(params.locale === "ar" ? "ar" : "en").advisor;
  return localeMeta(params.locale, "/advisor", d.metaTitle, d.metaDesc);
}

export default function AdvisorLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
