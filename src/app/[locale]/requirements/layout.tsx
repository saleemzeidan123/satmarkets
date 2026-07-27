import type { ReactNode } from "react";
import { localeMeta } from "@/lib/meta";
import { getDictionary } from "@/i18n/getDictionary";

export function generateMetadata({ params }: { params: { locale: string } }) {
  const d = getDictionary(params.locale === "ar" ? "ar" : "en").req;
  return localeMeta(params.locale, "/requirements", d.metaTitle, d.metaDesc);
}

export default function RequirementsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
