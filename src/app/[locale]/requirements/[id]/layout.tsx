// A layout exists here for one reason: metadata.
//
// The requirement detail page is a client component, and a client component
// cannot export generateMetadata. Without this file every requirement detail
// page inherited the /requirements layout's metadata, which means every one of
// them declared the SAME canonical URL, pointing at the board rather than at the
// requirement. That is a wrong canonical, not a missing one: it tells a crawler
// these pages are duplicates of the index.
//
// A layout in the same segment can export generateMetadata even when its page is
// a client component, so the canonical and the reciprocal en, ar and x-default
// set are declared here and the page below stays interactive.

import type { ReactNode } from "react";
import { getDictionary } from "@/i18n/getDictionary";
import { localeMeta } from "@/lib/meta";

export function generateMetadata({ params }: { params: { locale: string; id: string } }) {
  const t = getDictionary(params.locale === "ar" ? "ar" : "en").reqDetail;
  return localeMeta(params.locale, `/requirements/${params.id}`, t.metaTitle, t.metaDesc, { type: "article" });
}

export default function RequirementDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
