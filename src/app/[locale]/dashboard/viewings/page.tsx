import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { listingTitle } from "@/lib/listingTitle";
import ViewingDecision from "@/components/ViewingDecision";

// Viewing requests on the lister's own listings.
//
// This page did not exist. A visitor booked a viewing, the row landed, the visitor was
// told it had been sent, and the lister never learned it existed: `viewings` had a SELECT
// policy for SAT and for nobody else. The only surface that showed them was
// /verify/viewings, SAT-only and linked from nowhere.
//
// The query below asks for every viewing. RLS returns only those on listings this account
// owns. That is deliberate: the filter is the policy, not the query, so a bug here cannot
// leak someone else's viewings.
export const dynamic = "force-dynamic";

export default async function ViewingsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale;
  const ar = lp === "ar";

  const su = await getSessionUser();
  if (!su) redirect(`/${lp}/login`);
  if (!su.accountId) redirect(`/${lp}`);
  const sb = getSupabaseServer();
  if (!sb) notFound();

  const t = ar
    ? {
        title: "طلبات المعاينة",
        sub: "من يريد زيارة مساحاتك",
        thWho: "الطالب", thListing: "العرض", thWhen: "الموعد المطلوب", thState: "الحالة",
        emptyT: "لا طلبات معاينة بعد",
        emptyB: "حين يطلب مستأجر معاينة أحد عروضك، سيظهر الطلب هنا ببيانات تواصله، ويمكنك التأكيد أو الاعتذار.",
        browse: "عروضي",
        requested: "بانتظار ردك", confirmed: "مؤكد", cancelled: "معتذر عنه",
        completed: "تمت", no_show: "لم يحضر",
      }
    : {
        title: "Viewing requests",
        sub: "Who wants to see your spaces",
        thWho: "Who", thListing: "Listing", thWhen: "Requested slot", thState: "Status",
        emptyT: "No viewing requests yet",
        emptyB: "When someone asks to view one of your listings, the request appears here with their contact details, and you can confirm or decline.",
        browse: "My listings",
        requested: "Awaiting you", confirmed: "Confirmed", cancelled: "Declined",
        completed: "Completed", no_show: "No show",
      };

  const { data } = await sb
    .from("viewings")
    .select("id, created_at, scheduled_at, status, contact_name, contact_email, contact_phone, note, listings(reference_code, title_en, title_ar, asset_type, districts(name_en,name_ar,city))")
    .order("scheduled_at", { ascending: true })
    .limit(200);

  const rows = (data ?? []) as any[];

  const when = (iso: string) =>
    new Date(iso).toLocaleString(ar ? "ar-SA-u-nu-latn" : "en-GB", {
      weekday: "short", day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Riyadh",
    });

  const label = (s: string) => (t as any)[s] ?? s;
  const tone = (s: string) =>
    s === "confirmed" ? "var(--harbor)"
    : s === "requested" ? "var(--amber-d)"
    : "var(--slate)";

  if (!rows.length) {
    return (
      <div style={{ display: "grid", placeItems: "center", padding: "64px 24px" }}>
        <div style={{ textAlign: "center", maxWidth: 460 }}>
          <div style={{ fontSize: "1.125rem", fontWeight: 600 }}>{t.emptyT}</div>
          <p className="muted" style={{ fontSize: "0.84375rem", lineHeight: 1.7, marginTop: 8 }}>{t.emptyB}</p>
          <Link href={`/${lp}/dashboard/listings`} className="btn secondary" style={{ marginTop: 16 }}>{t.browse}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="col gap14">
      <div>
        <h2 style={{ fontSize: "1.125rem", margin: 0 }}>{t.title}</h2>
        <div className="sub">{t.sub}</div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84375rem" }}>
          <thead>
            <tr style={{ background: "var(--cool)", textAlign: ar ? "right" : "left" }}>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>{t.thWho}</th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>{t.thListing}</th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>{t.thWhen}</th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>{t.thState}</th>
              <th style={{ padding: "10px 14px" }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => {
              const title = listingTitle(v.listings, ar ? "ar" : "en");
              return (
                <tr key={v.id} style={{ borderTop: "1px solid var(--silver)" }}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 600 }}>{v.contact_name}</div>
                    <div className="muted" style={{ fontSize: "0.75rem" }}>
                      <a href={`mailto:${v.contact_email}`}>{v.contact_email}</a>
                      {v.contact_phone ? <> · <a href={`tel:${v.contact_phone}`}>{v.contact_phone}</a></> : null}
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>{title}</td>
                  <td style={{ padding: "12px 14px" }} className="mono">{when(v.scheduled_at)}</td>
                  <td style={{ padding: "12px 14px", color: tone(v.status), fontWeight: 600 }}>{label(v.status)}</td>
                  <td style={{ padding: "12px 14px", textAlign: ar ? "left" : "right" }}>
                    <ViewingDecision id={v.id} locale={lp} current={v.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
