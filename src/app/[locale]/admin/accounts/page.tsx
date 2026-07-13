import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import AdminShell, { requireSat, stamp } from "@/components/AdminShell";
import { Icon } from "@/components/satkit";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale;
  const ar = lp === "ar";
  const session = await requireSat(lp);
  const sb = getSupabaseServer()!;

  const t = ar ? {
    title: "الحسابات", sub: "كل حساب على المنصّة",
    thName: "الحساب", thType: "النوع", thCr: "السجل التجاري", thListings: "عروض", thStatus: "التوثيق", thWhen: "أُنشئ",
    empty: "لا حسابات.", verified: "موثّق", pending: "بانتظار التوثيق", noCr: "لا يوجد",
    types: { sat: "سات", owner: "مالك", broker: "وسيط" } as Record<string, string>,
    note: "التوثيق يُقرَّر خارج المنصّة حالياً. أداة الاعتماد داخل اللوحة لم تُبنَ بعد.",
  } : {
    title: "Accounts", sub: "Every account on the platform",
    thName: "Account", thType: "Type", thCr: "CR number", thListings: "Listings", thStatus: "Verification", thWhen: "Created",
    empty: "No accounts.", verified: "Verified", pending: "Awaiting verification", noCr: "None on file",
    types: { sat: "SAT", owner: "Owner", broker: "Broker" } as Record<string, string>,
    note: "Verification is decided outside the platform today. The in-console approval tool is not built yet.",
  };

  const [{ data: accounts }, { data: listings }, sq] = await Promise.all([
    sb.from("accounts").select("id,type,name_en,name_ar,legal_name,cr_number,verification_status,created_at").order("created_at", { ascending: false }),
    sb.from("listings").select("id,account_id").eq("status", "published"),
    sb.from("signup_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);

  const counts = new Map<string, number>();
  (listings || []).forEach((l: any) => counts.set(l.account_id, (counts.get(l.account_id) || 0) + 1));
  const rows = accounts || [];

  return (
    <AdminShell locale={lp} active="accounts" title={t.title} sub={t.sub} session={session} counts={{ signups: sq.count ?? 0 }}>
      <div className="dpanel">
        <div className="ph">
          <span style={{ color: "var(--harbor)" }}><Icon.chart size={17} /></span>
          <span className="t">{t.title}</span>
          <span style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: 11.5 }}>{rows.length}</span>
        </div>
        {rows.length === 0 ? (
          <div className="muted" style={{ padding: "22px 20px", fontSize: 12.5 }}>{t.empty}</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="dt" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th>{t.thName}</th><th>{t.thType}</th><th>{t.thCr}</th>
                  <th style={{ textAlign: "right" }}>{t.thListings}</th>
                  <th>{t.thStatus}</th>
                  <th style={{ textAlign: "right" }}>{t.thWhen}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a: any) => {
                  const nm = (ar ? a.name_ar : a.name_en) || a.name_en;
                  const ok = a.verification_status === "verified";
                  return (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{nm}</div>
                        {a.legal_name && a.legal_name !== nm && <div className="muted" style={{ fontSize: 11.5 }}>{a.legal_name}</div>}
                      </td>
                      <td className="muted" style={{ fontSize: 12.5 }}>{t.types[a.type] || a.type}</td>
                      <td className="mono muted" style={{ fontSize: 11.5 }}>{a.cr_number || t.noCr}</td>
                      <td className="num mono" style={{ fontWeight: 600 }}>{counts.get(a.id) || 0}</td>
                      <td><span className={"statusdot " + (ok ? "ok" : "pend")} style={{ fontSize: 12 }}>{ok ? t.verified : t.pending}</span></td>
                      <td className="num mono muted" style={{ fontSize: 11.5 }}>{stamp(a.created_at, ar)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="muted" style={{ padding: "12px 20px 16px", fontSize: 11.5, lineHeight: 1.6, borderTop: "1px solid var(--silver)" }}>{t.note}</div>
      </div>
    </AdminShell>
  );
}
