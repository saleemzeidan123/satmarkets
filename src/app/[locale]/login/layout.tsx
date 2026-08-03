import type { ReactNode } from "react";
import { getDictionary } from "@/i18n/getDictionary";
import { localeMeta } from "@/lib/meta";

// SM-P1-009 / route metadata: the login route carries its own localized title
// and is never indexable (it is an authentication surface, not marketing). It
// still goes through the factory, because a canonical and a reciprocal language
// set are how a crawler learns the two locales are the same page, which is a
// separate question from whether it may index them.
export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = getDictionary(params.locale === "ar" ? "ar" : "en").login;
  return localeMeta(params.locale, "/login", t.metaTitle, t.metaDesc, { robots: { index: false, follow: false } });
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
