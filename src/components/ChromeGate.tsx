"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Chrome has three tiers, not two.
//
// APP: routes that carry their own navigation rail (the dashboard/admin shell).
//   They get neither the marketing header nor the marketing footer, because both
//   would duplicate navigation the page already has.
//
// PRODUCT: routes a signed-in person uses to do work: the deal room, saved,
//   compare, notifications, the listing entry point. These have no nav of their
//   own, so they keep the header. What they must NOT have is the marketing
//   footer, which carries the mega sitemap and a "List, lease or invest, on
//   verified ground" sales banner. Selling the product to someone who is already
//   mid-transaction inside it is a hierarchy failure at the page level.
//
// MARKETING: everything else. Full chrome.
const APP = /\/(dashboard|admin|signup|advisor|messages|docs|agent|thinking-map)(\/|$)/;
const PRODUCT = /\/(deal|notifications|saved|compare|list|invest|find|post-requirement)(\/|$)/;

export default function ChromeGate({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const path = usePathname() || "";
  const isApp = APP.test(path);
  const isProduct = !isApp && PRODUCT.test(path);
  return (
    <>
      {!isApp && header}
      {children}
      {!isApp && !isProduct && footer}
    </>
  );
}
