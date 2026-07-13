import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import { Icon, Logo } from "@/components/satkit";

// SAT operator console.
//
// Project law: claim nothing that is not evidenced. Every figure on this page is
// a live count from the database, or it is not shown. Where a capability is not
// built yet (REGA permit tracking, flagging, activity history) we say so plainly
// instead of painting a number. This page previously shipped invented REGA
// compliance ratios and fabricated advertising-permit and CR numbers against
// named companies; none of that data exists in the schema and it is all gone.

export const dynamic = "force-dynamic";

function KCard({ icon: I, tone, v, l, note }: { icon: (p: { size?: number }) => JSX.Element; tone?: string; v: string; l: string; note?: string }) {
  return (
    <div className="kcard">
      <div className="top">
        <span className={"ic" + (tone ? " " + tone : "")}><I size={18} /></span>
      </div>
      <div className="v tnum">{v}</div>
      <div className="l">{l}</div>
      {note && <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{note}</div>}
    </div>
  );
}

function ago(d: string, ar: boolean) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 3600) { const n = Math.max(1, Math.round(s / 60)); return ar ? `منذ ${n} د` : n + "m ago"; }
  if (s < 86400) { const n = Math.round(s / 3600); return ar ? `منذ ${n} س` : n + "h ago"; }
  const n = Math.round(s / 86400);
  return ar ? `منذ ${n} ي` : n + "d ago";
}

const initials = (s: string) => s.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export default async function AdminPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale;
  const ar = lp === "ar";

  // Gate: SAT team only. Anyone else gets a 404 rather than a "forbidden", so the
  // console does not advertise its own existence to non-SAT accounts.
  const su = await getSessionUser();
  if (!su) redirect(`/${lp}/login`);
  const sb = getSupabaseServer();
  if (!sb || !su.accountId) notFound();
  if (!su.isSat) notFound();
  const { data: me } = await sb.from("accounts").select("name_en,name_ar").eq("id", su.accountId).maybeSingle();

  const t = ar
    ? {
        title: "لوحة تشغيل المنصّة",
        sub: "بيانات مباشرة من قاعدة البيانات",
        role: "فريق سات",
        navOverview: "نظرة عامة",
        navQueue: "طلبات الانضمام",
        navAccounts: "الحسابات",
        kListings: "عروض منشورة",
        kEnquiries: "استفسارات (الإجمالي)",
        kReqs: "طلبات مفتوحة",
        kAccounts: "حسابات",
        kAcctNote: (v: number, p: number) => `${v} موثّق · ${p} بانتظار التوثيق`,
        queueTitle: "طلبات الانضمام",
        queueEmpty: "لا توجد طلبات انضمام معلّقة.",
        thWho: "مقدّم الطلب",
        thRole: "الصفة",
        thWhen: "أُرسل",
        recentTitle: "أحدث الاستفسارات",
        recentEmpty: "لا توجد استفسارات بعد.",
        notBuiltTitle: "غير مبني بعد",
        notBuiltBody:
          "تتبّع تصاريح الإعلان ورخص فال، ووسم العروض، وسجلّ نشاط المنصّة: لا شيء من ذلك مبني بعد، ولا توجد له بيانات في المنصّة. ولن نعرض هنا أي رقم تنظيمي قبل أن يأتي من مصدر رسمي موثّق.",
        signOut: "تسجيل الخروج",
      }
    : {
        title: "Platform operations",
        sub: "Live counts from the database",
        role: "SAT team",
        navOverview: "Overview",
        navQueue: "Signup requests",
        navAccounts: "Accounts",
        kListings: "Published listings",
        kEnquiries: "Enquiries (all time)",
        kReqs: "Open requirements",
        kAccounts: "Accounts",
        kAcctNote: (v: number, p: number) => `${v} verified · ${p} awaiting verification`,
        queueTitle: "Signup requests",
        queueEmpty: "No pending signup requests.",
        thWho: "Applicant",
        thRole: "Role",
        thWhen: "Submitted",
        recentTitle: "Recent enquiries",
        recentEmpty: "No enquiries yet.",
        notBuiltTitle: "Not built yet",
        notBuiltBody:
          "Advertising-permit and FAL licence tracking, listing flagging, and platform activity history are not built, and no data for them exists on the platform. No regulatory figure will appear here until it comes from an authoritative source.",
        signOut: "Sign out",
      };

  const [lc, ec, rc, ac, avc, sq, recent] = await Promise.all([
    sb.from("listings").select("id", { count: "exact", head: true }).eq("status", "published"),
    sb.from("leads").select("id", { count: "exact", head: true }),
    sb.from("tenant_briefs").select("id", { count: "exact", head: true }).eq("status", "open"),
    sb.from("accounts").select("id", { count: "exact", head: true }),
    sb.from("accounts").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
    sb.from("signup_requests").select("id,full_name,company,role,created_at").eq("status", "new").order("created_at", { ascending: false }).limit(20),
    sb.from("leads").select("id,contact_name,path,created_at").order("created_at", { ascending: false }).limit(6),
  ]);

  const listings = lc.count ?? 0;
  const enquiries = ec.count ?? 0;
  const reqs = rc.count ?? 0;
  const accounts = ac.count ?? 0;
  const verified = avc.count ?? 0;
  const pendingAccts = Math.max(0, accounts - verified);
  const queue = sq.data || [];
  const recentLeads = recent.data || [];

  const acctName = (ar ? (me as any)?.name_ar : (me as any)?.name_en) || (me as any)?.name_en || su.email || "SAT";

  return (
    <div className="dash">
      <aside className="dside">
        <div className="brand"><Link href={`/${lp}`} aria-label="SAT Markets"><Logo size={26} rev /></Link></div>
        <div className="dnav">
          <a className="on"><span className="ic"><Icon.grid size={18} /></span><span>{t.navOverview}</span></a>
          <a><span className="ic"><Icon.shield size={18} /></span><span>{t.navQueue}</span>{queue.length > 0 && <span className="badge warn">{queue.length}</span>}</a>
          <a><span className="ic"><Icon.chart size={18} /></span><span>{t.navAccounts}</span></a>
        </div>
        <div className="me">
          <span className="avatar" style={{ background: "var(--azure-d)" }}>{initials(acctName)}</span>
          <div><div className="nm">{acctName}</div><div className="rl">{t.role}</div></div>
        </div>
        <div style={{ padding: "0 14px 14px" }}><SignOutButton locale={lp} label={t.signOut} /></div>
      </aside>

      <div className="dmain">
        <div className="dtopbar">
          <div><h1>{t.title}</h1><div className="sub">{t.sub}</div></div>
        </div>

        <div className="dbody">
          <div className="kgrid">
            <KCard icon={Icon.building} tone="h" v={listings.toLocaleString("en-US")} l={t.kListings} />
            <KCard icon={Icon.inbox} v={enquiries.toLocaleString("en-US")} l={t.kEnquiries} />
            <KCard icon={Icon.doc} v={reqs.toLocaleString("en-US")} l={t.kReqs} />
            <KCard icon={Icon.grid} tone="a" v={accounts.toLocaleString("en-US")} l={t.kAccounts} note={t.kAcctNote(verified, pendingAccts)} />
          </div>

          <div className="dash-2col" style={{ gridTemplateColumns: "1.7fr 1fr" }}>
            <div className="dpanel">
              <div className="ph">
                <span style={{ color: "var(--amber)" }}><Icon.shield size={17} /></span>
                <span className="t">{t.queueTitle}</span>
              </div>
              {queue.length === 0 ? (
                <div className="muted" style={{ padding: "24px 20px", fontSize: 12.5 }}>{t.queueEmpty}</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="dt" style={{ minWidth: 520 }}>
                    <thead><tr><th>{t.thWho}</th><th>{t.thRole}</th><th>{t.thWhen}</th></tr></thead>
                    <tbody>
                      {queue.map((q: any) => (
                        <tr key={q.id}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{q.full_name || ""}</div>
                            <div className="muted" style={{ fontSize: 11.5 }}>{q.company || ""}</div>
                          </td>
                          <td className="muted" style={{ fontSize: 12.5 }}>{q.role || ""}</td>
                          <td className="mono muted" style={{ fontSize: 11.5 }}>{ago(q.created_at, ar)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="col gap18">
              <div className="dpanel">
                <div className="ph">
                  <span style={{ color: "var(--harbor)" }}><Icon.inbox size={16} /></span>
                  <span className="t">{t.recentTitle}</span>
                </div>
                {recentLeads.length === 0 ? (
                  <div className="muted" style={{ padding: "20px", fontSize: 12.5 }}>{t.recentEmpty}</div>
                ) : (
                  <div style={{ padding: "6px 20px 16px" }}>
                    {recentLeads.map((l: any, i: number) => (
                      <div key={l.id} className="row between" style={{ padding: "10px 0", borderTop: i ? "1px solid var(--silver)" : 0 }}>
                        <span style={{ fontSize: 12.5 }}>{l.contact_name || (ar ? "استفسار" : "Enquiry")}</span>
                        <span className="mono muted" style={{ fontSize: 11.5 }}>{ago(l.created_at, ar)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="dpanel">
                <div className="ph">
                  <span style={{ color: "var(--slate)" }}><Icon.flag size={16} /></span>
                  <span className="t">{t.notBuiltTitle}</span>
                </div>
                <div className="muted" style={{ padding: "14px 20px 18px", fontSize: 12.5, lineHeight: 1.7 }}>
                  {t.notBuiltBody}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
