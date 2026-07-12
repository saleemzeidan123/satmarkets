import type { ReactNode } from "react";
import { getDictionary } from "@/i18n/getDictionary";

// SM-P1-009 / route metadata: the login route carries its own localized title
// and is never indexable (it is an authentication surface, not marketing).
export function generateMetadata({ params }: { params: { locale: string } }) {
  const ar = params.locale === "ar";
  const t = getDictionary(ar ? "ar" : "en").login;
  return { title: t.metaTitle, robots: { index: false, follow: false } };
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
