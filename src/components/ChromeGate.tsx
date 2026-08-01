"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { chromeTier } from "@/lib/chrome";

// Chrome has three tiers, and the tables that define them live in
// `src/lib/chrome.ts` so a test can call the classification rather than grep the
// alternation. Each route there records WHY it sits in the tier it sits in.
//
// The `notice` slot is separate from `header` for a reason that finding 147
// exposed. The release-state notice used to be nested inside the header node
// this component receives, so withholding the header from the APP tier also
// withheld a disclosure the layout's own comment describes as "persistent and
// site wide". Navigation and disclosure are two different decisions and only one
// of them belongs to a tier: a reader on /advisor needs to be told the figures
// in front of them are sample data whether or not that route also wants a
// marketing sitemap. `notice` therefore renders on every tier, unconditionally,
// and must stay outside the tier tests below.
export default function ChromeGate({
  notice,
  header,
  footer,
  children,
}: {
  notice?: ReactNode;
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const tier = chromeTier(usePathname() || "");
  return (
    <>
      {notice}
      {tier !== "app" && header}
      {children}
      {tier === "marketing" && footer}
    </>
  );
}
