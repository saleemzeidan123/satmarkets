"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { chromeTier, rendersFooterSlot } from "@/lib/chrome";

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
//
// PKG-E1-READINESS slice B, WS09. `<main>` moved here from the layout, and it
// moved for one reason: the class that reserves 62px of bottom padding for the
// mobile tab bar has to be decided by the same expression that decides whether
// the bar renders. The layout is a server component, it cannot read the
// pathname, and so it did the only thing it could: it set the class on every
// route. The bar travels inside `footer`, which only the marketing tier gets, so
// every APP and PRODUCT route below 1024px carried 62px of padding under which
// nothing was ever drawn. `footerSlot` below is used twice, four lines apart,
// and that adjacency is the fix. The reservation cannot disagree with the bar
// again without someone editing both halves of one boolean.
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
  const path = usePathname() || "";
  const tier = chromeTier(path);
  const footerSlot = rendersFooterSlot(path);
  return (
    <>
      {notice}
      {tier !== "app" && header}
      <main id="main" tabIndex={-1} className={footerSlot ? "min-h-[70vh] has-tabbar" : "min-h-[70vh]"}>{children}</main>
      {footerSlot && footer}
    </>
  );
}
