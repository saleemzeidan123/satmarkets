import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { listingTitle } from "@/lib/listingTitle";
import ViewingDecision from "@/components/ViewingDecision";
import ScrollRegion from "@/components/ScrollRegion";

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

  // Finding 155. The page title was an `h2` on the populated branch and did not exist
  // at all on the empty one, because the only `h1` came from the dashboard shell and
  // read the account name. One title block now serves both branches, so the page has
  // exactly one first-level heading whatever state it is in, and the empty state gets
  // the heading it never had.
  const head = (
    <div>
      <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-.01em", margin: 0 }}>{t.title}</h1>
      <div className="sub">{t.sub}</div>
    </div>
  );

  if (!rows.length) {
    return (
      <div className="col gap14">
        {head}
        <div style={{ display: "grid", placeItems: "center", padding: "48px 24px" }}>
          <div style={{ textAlign: "center", maxWidth: 460 }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>{t.emptyT}</h2>
            <p className="muted" style={{ fontSize: "0.84375rem", lineHeight: 1.7, marginTop: 8 }}>{t.emptyB}</p>
            <Link href={`/${lp}/dashboard/listings`} className="btn secondary" style={{ marginTop: 16 }}>{t.browse}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="col gap14">
      {head}

      {/* The card is the scroller. `overflow: "hidden"` was dropped from it because
          `.scrollx` sets overflow-x, which computes overflow-y to auto and clips to the
          card radius exactly as the shorthand did, while still allowing a pan. */}
      <ScrollRegion label={t.title} className="card" style={{ padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84375rem" }}>
          <caption className="sronly">{t.title}</caption>
          <thead>
            <tr style={{ background: "var(--cool)", textAlign: ar ? "right" : "left" }}>
              <th scope="col" style={{ padding: "10px 14px", fontWeight: 600 }}>{t.thWho}</th>
              <th scope="col" style={{ padding: "10px 14px", fontWeight: 600 }}>{t.thListing}</th>
              <th scope="col" style={{ padding: "10px 14px", fontWeight: 600 }}>{t.thWhen}</th>
              <th scope="col" style={{ padding: "10px 14px", fontWeight: 600 }}>{t.thState}</th>
              <th scope="col" style={{ padding: "10px 14px" }} />
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
      </ScrollRegion>
    </div>
  );
}
