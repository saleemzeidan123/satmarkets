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
