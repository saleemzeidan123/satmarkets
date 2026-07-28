import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMeta } from "@/lib/meta";

// The page itself is a client component, so its metadata comes from this route
// layout. Without it the route inherited the English homepage title even in
// Arabic (Codex correction 5). /post-requirement is noindex (private prefix),
// but the title must still be accurate and locale-specific.
export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return pageMeta(
    params.locale,
    "/post-requirement",
    "Post a space requirement | SAT Markets",
    "انشر طلب مساحة | سات ماركتس",
    // C32. The dictionary keeps the recipient restriction in postReq.intro and in
    // the consent label, because narrowing who receives a requirement is a promise
    // to the person posting it. A meta description is not that promise: it is read
    // in a search result, away from the page and away from the preview notice, so
    // here the wording states who can respond without asserting they were checked.
    "Post what you need. Owners and licensed brokers with a matching space can respond, and you choose whom to contact.",
    "انشر ما تحتاجه، فيستجيب الملاك والوسطاء المرخّصون ممن لديهم مساحة مطابقة، وتختار من تتواصل معه."
  );
}

export default function PostRequirementLayout({ children }: { children: ReactNode }) {
  return children;
}
