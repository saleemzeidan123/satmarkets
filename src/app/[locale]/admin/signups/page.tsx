import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import AdminShell, { requireSat, stamp } from "@/components/AdminShell";
import { Icon } from "@/components/satkit";

export const dynamic = "force-dynamic";

export default async function AdminSignupsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale;
  const ar = lp === "ar";
  const session = await requireSat(lp);
  const sb = getSupabaseServer()!;

  const t = ar ? {
    title: "طلبات الانضمام", sub: "من طلب حساباً على سات ماركتس",
    thWho: "مقدّم الطلب", thRole: "الصفة", thContact: "التواصل", thWhen: "أُرسل",
    emptyT: "لا طلبات انضمام معلّقة",
    emptyB: "عندما يطلب مالك أو وسيط حساباً من صفحة الانضمام، يظهر طلبه هنا ببيانات تواصله لتتابعه.",
    note: "المتابعة تتم خارج المنصّة حالياً (بريد أو هاتف). أداة الاعتماد داخل اللوحة لم تُبنَ بعد، ولا ندّعي أنها موجودة.",
  } : {
    title: "Signup requests", sub: "Who has asked for an account on SAT Markets",
    thWho: "Applicant", thRole: "Role", thContact: "Contact", thWhen: "Submitted",
    emptyT: "No pending signup requests",
    emptyB: "When an owner or broker requests an account from the signup page, it appears here with their contact details so you can follow up.",
    note: "Follow-up happens off-platform today (email or phone). The in-console approval tool is not built yet, and we do not pretend it is.",
  };

  const [{ data: rows }, sq] = await Promise.all([
    sb.from("signup_requests").select("id,full_name,company,role,email,phone,details,created_at,status").order("created_at", { ascending: false }).limit(100),
    sb.from("signup_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);
  const list = rows || [];

  return (
    <AdminShell locale={lp} active="signups" title={t.title} sub={t.sub} session={session} counts={{ signups: sq.count ?? 0 }}>
      <div className="dpanel">
        <div className="ph">
          <span style={{ color: "var(--amber)" }}><Icon.shield size={17} /></span>
          <span className="t">{t.title}</span>
          <span style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: 11.5 }}>{list.length}</span>
        </div>
        {list.length === 0 ? (
          <div style={{ padding: "22px 20px 26px" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.emptyT}</div>
            <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.65, marginTop: 5, maxWidth: 420 }}>{t.emptyB}</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="dt" style={{ minWidth: 680 }}>
              <thead>
                <tr><th>{t.thWho}</th><th>{t.thRole}</th><th>{t.thContact}</th><th style={{ textAlign: "right" }}>{t.thWhen}</th></tr>
              </thead>
              <tbody>
                {list.map((r: any) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.full_name || ""}</div>
                      {r.company && <div className="muted" style={{ fontSize: 11.5 }}>{r.company}</div>}
                    </td>
                    <td className="muted" style={{ fontSize: 12.5 }}>{r.role || ""}</td>
                    <td className="mono muted" style={{ fontSize: 11.5 }}>
                      <div>{r.email || ""}</div>
                      {r.phone && <div>{r.phone}</div>}
                    </td>
                    <td className="num mono muted" style={{ fontSize: 11.5 }}>{stamp(r.created_at, ar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="muted" style={{ padding: "12px 20px 16px", fontSize: 11.5, lineHeight: 1.6, borderTop: "1px solid var(--silver)" }}>{t.note}</div>
      </div>
    </AdminShell>
  );
}
