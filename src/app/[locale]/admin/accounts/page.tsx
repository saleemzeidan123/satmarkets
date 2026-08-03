import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import AdminShell, { requireSat, stamp } from "@/components/AdminShell";
import { Icon } from "@/components/satkit";
import ScrollRegion from "@/components/ScrollRegion";
import VerifyAccount from "@/components/VerifyAccount";
import { entityName } from "@/lib/displayName";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale;
  const ar = lp === "ar";
  const session = await requireSat(lp);
  const sb = (await getSupabaseServer())!;

  const t = ar ? {
    title: "الحسابات", sub: "كل حساب على المنصّة",
    thName: "الحساب", thType: "النوع", thCr: "السجل التجاري", thListings: "عروض", thStatus: "التوثيق", thWhen: "أُنشئ",
    empty: "لا حسابات.", verified: "موثّق", pending: "بانتظار التوثيق", noCr: "لا يوجد",
    types: { sat: "سات", owner: "مالك", broker: "وسيط" } as Record<string, string>,
    thAction: "القرار",
    verify: "توثيق", reject: "رفض", revoke: "سحب التوثيق",
    basis: "على أي أساس؟",
    basisPh: "ما الذي تحقّقت منه، ومقابل أي مصدر؟ مثال: طابق رقم السجل التجاري 1010111222 مع السجل التجاري باسم الشركة نفسه.",
    cancel: "إلغاء", save: "تسجيل القرار", saving: "جارٍ الحفظ", minBasis: "اذكر الأساس في جملة على الأقل.",
    ledgerT: "سجلّ قرارات التوثيق",
    ledgerEmpty: "لا قرارات مسجّلة بعد. كل قرار توثيق يُسجَّل هنا باسم من اتخذه ووقته وأساسه، ولا يمكن تعديله أو حذفه.",
    lWho: "من", lWhat: "القرار", lBasis: "الأساس", lWhen: "الوقت",
    note: "شارة \"موثّق\" تأتي من قرار بشري مسجّل. والسجلّ أدناه غير قابل للتعديل أو الحذف.",
  } : {
    title: "Accounts", sub: "Every account on the platform",
    thName: "Account", thType: "Type", thCr: "CR number", thListings: "Listings", thStatus: "Verification", thWhen: "Created",
    empty: "No accounts.", verified: "Verified", pending: "Awaiting verification", noCr: "None on file",
    types: { sat: "SAT", owner: "Owner", broker: "Broker" } as Record<string, string>,
    thAction: "Decision",
    verify: "Verify", reject: "Reject", revoke: "Revoke",
    basis: "On what basis?",
    basisPh: "What did you check, and against what? e.g. CR 1010111222 matched against the commercial register under the same legal name.",
    cancel: "Cancel", save: "Record decision", saving: "Saving", minBasis: "State the basis, at least a sentence.",
    ledgerT: "Verification decision log",
    ledgerEmpty: "No decisions recorded yet. Every verification is written here with who made it, when, and on what basis. The log cannot be edited or deleted.",
    lWho: "Who", lWhat: "Decision", lBasis: "Basis", lWhen: "When",
    note: "A verified badge comes from a recorded human decision. The log below cannot be edited or deleted, by anyone.",
  };

  const [{ data: accounts }, { data: listings }, sq, { data: events }] = await Promise.all([
    sb.from("accounts").select("id,type,name_en,name_ar,legal_name,cr_number,verification_status,created_at").order("created_at", { ascending: false }),
    // simulated-visible. Reviewing an account means seeing every listing behind it,
    // including the simulated ones. Admin gated, and it publishes no claim.
    sb.from("listings").select("id,account_id").eq("status", "published"),
    sb.from("signup_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
    sb.from("verification_events").select("id,account_id,from_status,to_status,actor_email,basis,created_at").order("created_at", { ascending: false }).limit(50),
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
          <span className="muted" style={{ fontSize: "0.71875rem" }}>{rows.length}</span>
        </div>
        {rows.length === 0 ? (
          <div className="muted" style={{ padding: "22px 20px", fontSize: "0.78125rem" }}>{t.empty}</div>
        ) : (
          <ScrollRegion label={t.title}>
            <table className="dt" style={{ minWidth: 720 }}>
              <caption className="sronly">{t.title}</caption>
              <thead>
                <tr>
                  <th scope="col">{t.thName}</th><th scope="col">{t.thType}</th><th scope="col">{t.thCr}</th>
                  <th scope="col" style={{ textAlign: "right" }}>{t.thListings}</th>
                  <th scope="col">{t.thStatus}</th>
                  <th scope="col" style={{ textAlign: "right" }}>{t.thWhen}</th>
                  <th scope="col" style={{ textAlign: "right" }}>{t.thAction}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a: any) => {
                  const nm = entityName(a, ar ? "ar" : "en");
                  const ok = a.verification_status === "verified";
                  return (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{nm}</div>
                        {a.legal_name && a.legal_name !== nm && <div className="muted" style={{ fontSize: "0.71875rem" }}>{a.legal_name}</div>}
                      </td>
                      <td className="muted" style={{ fontSize: "0.78125rem" }}>{t.types[a.type] || a.type}</td>
                      <td className="mono muted" style={{ fontSize: "0.71875rem" }}>{a.cr_number || t.noCr}</td>
                      <td className="num mono" style={{ fontWeight: 600 }}>{counts.get(a.id) || 0}</td>
                      <td><span className={"statusdot " + (ok ? "ok" : "pend")} style={{ fontSize: "0.75rem" }}>{ok ? t.verified : t.pending}</span></td>
                      <td className="num mono muted" style={{ fontSize: "0.71875rem" }}>{stamp(a.created_at, ar)}</td>
                      <td className="num">
                        <VerifyAccount
                          accountId={a.id}
                          status={a.verification_status}
                          locale={lp}
                          t={{ verify: t.verify, reject: t.reject, revoke: t.revoke, basis: t.basis, basisPh: t.basisPh, cancel: t.cancel, save: t.save, saving: t.saving, minBasis: t.minBasis }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollRegion>
        )}
        <div className="muted" style={{ padding: "12px 20px 16px", fontSize: "0.71875rem", lineHeight: 1.6, borderTop: "1px solid var(--silver)" }}>{t.note}</div>
      </div>

      {/* The ledger behind the badge. Append-only: no update and no delete policy
          exists on this table, so a recorded decision cannot be rewritten or erased,
          not even by SAT. */}
      <div className="dpanel" style={{ marginTop: 18 }}>
        <div className="ph">
          <span style={{ color: "var(--harbor)" }}><Icon.shield size={17} /></span>
          <span className="t">{t.ledgerT}</span>
          <span style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: "0.71875rem" }}>{(events || []).length}</span>
        </div>
        {!events || events.length === 0 ? (
          <div className="muted" style={{ padding: "22px 20px 24px", fontSize: "0.78125rem", lineHeight: 1.7, maxWidth: 560 }}>{t.ledgerEmpty}</div>
        ) : (
          <ScrollRegion label={t.ledgerT}>
            <table className="dt" style={{ minWidth: 700 }}>
              <caption className="sronly">{t.ledgerT}</caption>
              <thead><tr><th scope="col">{t.lWho}</th><th scope="col">{t.lWhat}</th><th scope="col">{t.lBasis}</th><th scope="col" style={{ textAlign: "right" }}>{t.lWhen}</th></tr></thead>
              <tbody>
                {events.map((e: any) => {
                  const acct = rows.find((x: any) => x.id === e.account_id);
                  const nm = acct ? entityName(acct, ar ? "ar" : "en") : e.account_id;
                  return (
                    <tr key={e.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: "0.78125rem" }}>{e.actor_email || ""}</div>
                        <div className="muted" style={{ fontSize: "0.71875rem" }}>{nm}</div>
                      </td>
                      <td className="mono" style={{ fontSize: "0.71875rem" }}>{e.from_status} {ar ? "←" : "→"} <strong>{e.to_status}</strong></td>
                      <td className="muted" style={{ fontSize: "0.75rem", lineHeight: 1.6, maxWidth: 320 }}>{e.basis}</td>
                      <td className="num mono muted" style={{ fontSize: "0.71875rem" }}>{stamp(e.created_at, ar)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollRegion>
        )}
      </div>
    </AdminShell>
  );
}
