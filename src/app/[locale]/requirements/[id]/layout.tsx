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
import { getSupabaseServer } from "@/lib/supabase/server";
import { fill } from "@/lib/format";

// The head names the requirement. It used to serve "Requirement" and "طلب مساحة"
// for every row, so five hundred distinct briefs shared one share title while
// the listing, building, lister and flyer templates all named their entity. The
// rows carry a real bilingual title; the only reason this layout did not use it
// was that it did no data fetch. It does one now, against the same public view
// the detail page reads, and the generic wording survives only as the fallback
// for a missing or unreadable record.
export async function generateMetadata(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  const loc = params.locale === "ar" ? "ar" : "en";
  const t = getDictionary(loc).reqDetail;
  const path = `/requirements/${params.id}`;
  let title: string | null = null;
  const sb = getSupabaseServer();
  if (sb && /^[0-9a-f-]{36}$/i.test(params.id)) {
    const { data } = await sb.from("requirements_public").select("title,title_ar").eq("id", params.id).maybeSingle();
    if (data) title = String((loc === "ar" ? (data as any).title_ar : (data as any).title) || (data as any).title || "").trim() || null;
  }
  if (!title) return localeMeta(params.locale, path, t.metaTitle, t.metaDesc);
  return localeMeta(params.locale, path, fill(t.metaTitleEntity, { title }), t.metaDesc);
}

export default function RequirementDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
