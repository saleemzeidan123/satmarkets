"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/satkit";

const ICON: Record<string, (p: { size?: number }) => JSX.Element> = {
  overview: Icon.grid, listings: Icon.building, enquiries: Icon.inbox,
  requirements: Icon.target, billing: Icon.coins, profile: Icon.user,
};

export type NavItem = { key: string; label: string; href?: string; badge?: number; section?: boolean };

// The dashboard highlighted whichever item happened to be first in the array, so it
// always claimed you were on Overview. It follows the route now.
//
// Finding 161. The landmark this component's links belong to is supplied by the
// dashboard shell, which is a single `<nav aria-label>` wrapping the brand link, this
// item list and the account and sign-out controls. It is deliberately NOT declared
// here as well: a `<nav>` inside a `<nav>` is two navigation landmarks over one set of
// destinations, and the second one would be unnamed.
//
// The item list is also deliberately not a `<ul>`. Below 900px `.dnav` becomes a
// horizontal scroller, `flex-direction:row` with `flex:none` on each link, and a list
// wrapper only keeps that layout through `display:contents`, which is the pattern known
// to strip list semantics in some assistive technology. That trade buys an item count
// and costs the layout and, in some readers, the semantics it was added for. The
// destinations are already announced: each is a link inside a named navigation region,
// and the current one carries `aria-current="page"` below.
export default function DashNav({ locale, items }: { locale: string; items: NavItem[] }) {
  const path = usePathname() || "";
  const base = `/${locale}/dashboard`;
  const active = (href?: string) => {
    if (!href) return false;
    if (href === base) return path === base || path === `${base}/`;
    return path === href || path.startsWith(href + "/");
  };
  return (
    <div className="dnav">
      {items.map((n) =>
        n.section ? (
          <div key={n.key} className="sec">{n.label}</div>
        ) : (
          <Link key={n.key} href={n.href!} className={active(n.href) ? "on" : ""} aria-current={active(n.href) ? "page" : undefined}>
            <span className="ic">{(ICON[n.key] || Icon.grid)({ size: 18 })}</span>
            <span>{n.label}</span>
            {n.badge ? <span className="badge">{n.badge}</span> : null}
          </Link>
        )
      )}
    </div>
  );
}
