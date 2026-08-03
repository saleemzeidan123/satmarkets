import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import { Icon, Logo } from "@/components/satkit";
import { entityName } from "@/lib/displayName";

// The SAT operator console shell.
//
// Two rules this file exists to enforce:
//  1. Every nav item navigates. The first version of this console shipped with
//     <a> tags that had no href, so the sidebar was decoration. If a destination
//     is not built, it does not appear here.
//  2. The gate lives in one place. Any page inside /admin calls requireSat() and
//     gets a 404 (not a "forbidden") for non-SAT sessions, so the console does
//     not advertise its own existence.

export type SatSession = { accountId: string; name: string; email: string | null };

export async function requireSat(locale: string): Promise<SatSession> {
  const su = await getSessionUser();
  if (!su) redirect(`/${locale}/login`);
  const sb = await getSupabaseServer();
  if (!sb || !su.accountId || !su.isSat) notFound();
  const { data } = await sb.from("accounts").select("name_en,name_ar").eq("id", su.accountId).maybeSingle();
  const nm = entityName(data as any, locale === "ar" ? "ar" : "en") || su.email || "SAT";
  return { accountId: su.accountId, name: nm, email: su.email };
}

// Operators investigating something need an absolute time, not "8h ago".
export function stamp(d: string, ar: boolean) {
  const dt = new Date(d);
  const date = dt.toLocaleDateString(ar ? "ar-SA-u-nu-latn" : "en-GB", { day: "2-digit", month: "short", timeZone: "Asia/Riyadh" });
  const time = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Riyadh" });
  return `${date} ${time}`;
}

const initials = (s: string) => s.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export default function AdminShell({
  locale, active, title, sub, session, counts, children,
}: {
  locale: string;
  active: "overview" | "signups" | "accounts";
  title: string;
  sub: string;
  session: SatSession;
  counts: { signups: number };
  children: React.ReactNode;
}) {
  const ar = locale === "ar";
  const t = ar
    ? { overview: "نظرة عامة", signups: "طلبات الانضمام", accounts: "الحسابات", role: "فريق سات", signOut: "تسجيل الخروج" }
    : { overview: "Overview", signups: "Signup requests", accounts: "Accounts", role: "SAT team", signOut: "Sign out" };

  const nav = [
    { key: "overview", label: t.overview, icon: Icon.grid, href: `/${locale}/admin` },
    { key: "signups", label: t.signups, icon: Icon.shield, href: `/${locale}/admin/signups`, badge: counts.signups || undefined },
    { key: "accounts", label: t.accounts, icon: Icon.chart, href: `/${locale}/admin/accounts` },
  ];

  return (
    <div className="dash">
      <aside className="dside">
        <div className="brand"><Link href={`/${locale}`} aria-label="SAT Markets"><Logo size={26} rev /></Link></div>
        <div className="dnav">
          {nav.map((n) => (
            <Link key={n.key} href={n.href} className={n.key === active ? "on" : ""} aria-current={n.key === active ? "page" : undefined}>
              <span className="ic">{n.icon({ size: 18 })}</span>
              <span>{n.label}</span>
              {n.badge ? <span className="badge warn">{n.badge}</span> : null}
            </Link>
          ))}
        </div>
        <div className="me">
          <span className="avatar" style={{ background: "var(--azure-d)" }}>{initials(session.name)}</span>
          <div><div className="nm">{session.name}</div><div className="rl">{t.role}</div></div>
        </div>
        <div style={{ padding: "0 14px 14px" }}><SignOutButton locale={locale} label={t.signOut} /></div>
      </aside>
      <div className="dmain">
        <div className="dtopbar">
          <div><h1>{title}</h1><div className="sub">{sub}</div></div>
        </div>
        <div className="dbody">{children}</div>
      </div>
    </div>
  );
}
