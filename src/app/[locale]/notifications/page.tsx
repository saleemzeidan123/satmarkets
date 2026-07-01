import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon } from "@/components/satkit";

type Note = [(p: { size?: number }) => JSX.Element, string, string, string, string, boolean];

export default function NotificationsPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const ar = params.locale === "ar";
 const groups: [string, Note[]][] = [
  [ar ? "اليوم" : "Today", [
   [Icon.shield, "g", ar ? "تم توثيق الإعلان" : "Listing verified", ar ? "مكتب فئة A في برج العليا أصبح منشوراً وموثّقاً." : "Grade A Office, Olaya Tower is now live and verified.", ar ? "منذ دقيقتين" : "2m", true],
   [Icon.inbox, "a", ar ? "استفسار جديد" : "New enquiry", ar ? "استفسر أحمد ك. عن برج العليا، وأفضل وقت للرد خلال ساعتين." : "Ahmed K. enquired about Olaya Tower, responds best within 2h.", ar ? "منذ 40 دقيقة" : "40m", true],
   [Icon.spark, "h", ar ? "تطابق بالذكاء الاصطناعي" : "AI match found", ar ? "3 متطلبات جديدة تطابق دورك في مركز الملك عبدالله المالي." : "3 new requirement matches fit your KAFD floor.", ar ? "منذ ساعة" : "1h", true],
  ]],
  [ar ? "سابقاً" : "Earlier", [
   [Icon.cal, "a", ar ? "تم تأكيد المعاينة" : "Viewing confirmed", ar ? "الخميس 10:00 مع شركة أبراج العليا. أُضيفت إلى تقويمك." : "Thursday 10:00 with Olaya Towers Co. Added to your calendar.", ar ? "أمس" : "Yesterday", false],
   [Icon.coins, "h", ar ? "عرض مستلَم" : "Offer received", ar ? "قدّمت ريم د. عرضاً: 1,850 ريال/م²، مدة 5 سنوات." : "Reem D. submitted an offer: 1,850 SAR/m², 5-year term.", ar ? "أمس" : "Yesterday", false],
   [Icon.chart, "", ar ? "تحديث مؤشر الإيجار" : "Rent Index update", ar ? "ارتفعت فئة A في العليا +0.6% هذا الأسبوع (المعروض المفتوح)." : "Al Olaya Grade A rose +0.6% this week (open stock).", ar ? "منذ يومين" : "2 days", false],
   [Icon.flag, "a", ar ? "ترخيص على وشك الانتهاء" : "Permit expiring", ar ? "ترخيص الإعلان لمتجر التحلية ينتهي خلال 30 يوماً." : "Advertising permit for Tahlia retail expires in 30 days.", ar ? "منذ 3 أيام" : "3 days", false],
  ]],
 ];
 const tone: Record<string, [string, string]> = {
  g: ["#E7F3EC", "var(--green)"], a: ["var(--azure-wash)", "var(--azure-d)"],
  h: ["#EAF0F7", "var(--harbor)"], "": ["var(--cool)", "var(--slate)"],
 };
 const prefs: [string, boolean, boolean, boolean][] = [
  [ar ? "استفسارات جديدة" : "New enquiries", true, true, true], [ar ? "العروض والصفقات" : "Offers & deals", true, true, true],
  [ar ? "تذكيرات المعاينة" : "Viewing reminders", true, true, false], [ar ? "حالة التوثيق" : "Verification status", true, true, false],
  [ar ? "تطابق المتطلبات" : "Requirement matches", true, false, true], [ar ? "تنبيهات مؤشر الإيجار" : "Rent Index alerts", false, true, false],
  [ar ? "المنتج والنصائح" : "Product & tips", false, true, false],
 ];
 const chans = ar ? ["داخل التطبيق", "البريد", "تنبيه"] : ["In-app", "Email", "Push"];
 return (
  <div style={{ background: "var(--cool)" }}>
   <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px 48px" }}>
    <div className="row between wrap" style={{ alignItems: "flex-end", gap: 14, marginBottom: 22 }}>
     <div><div className="eyebrow">{ar ? "الإشعارات" : "Notifications"}</div><h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", margin: "10px 0 0" }}>{ar ? "أنت على اطّلاع بكل جديد" : "You’re caught up"}</h1><div className="muted" style={{ fontSize: 13.5, marginTop: 5 }}>{ar ? "3 غير مقروءة" : "3 unread"}</div></div>
     <div className="row gap8 wrap"><span className="btn secondary sm">{ar ? "تعليم الكل كمقروء" : "Mark all read"}</span><span className="btn secondary sm"><Icon.gear size={14} /> {ar ? "التفضيلات" : "Preferences"}</span></div>
    </div>
    <div className="notif-grid">
     <div className="col gap18">
      {groups.map((g, gi) => (
       <div key={gi}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>{g[0]}</div>
        <div className="dpanel">
         {g[1].map((n, i) => { const I = n[0]; const t = tone[n[1]]; return (
          <div key={i} className="lead-item" style={{ background: n[5] ? "var(--azure-wash)" : "transparent" }}>
           <span className="queue-ic" style={{ background: t[0], color: t[1] }}><I size={17} /></span>
           <div className="grow"><div style={{ fontSize: 13.5, fontWeight: 600 }}>{n[2]}</div><div className="muted" style={{ fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>{n[3]}</div></div>
           <div style={{ textAlign: ar ? "left" : "right", flex: "none" }}><div className="mono muted" style={{ fontSize: 10.5 }}>{n[4]}</div>{n[5] && <span style={{ display: "inline-block", marginTop: 6, width: 8, height: 8, borderRadius: "50%", background: "var(--azure)" }} />}</div>
          </div>
         ); })}
        </div>
       </div>
      ))}
     </div>
     <div className="dpanel" style={{ alignSelf: "flex-start" }}>
      <div className="ph"><span className="t">{ar ? "طريقة إشعارك" : "How you’re notified"}</span></div>
      <div style={{ padding: "6px 20px 16px" }}>
       {prefs.map((r, i) => (
        <div key={i} className="urow" style={{ display: "flex", alignItems: "center", gap: 10 }}>
         <span className="grow" style={{ fontSize: 13 }}>{r[0]}</span>
         {[r[1], r[2], r[3]].map((on, j) => (
          <span key={j} title={chans[j]} style={{ width: 30, height: 18, borderRadius: 10, background: on ? "var(--azure)" : "var(--silver)", position: "relative", flex: "none" }}><span style={{ position: "absolute", width: 14, height: 14, borderRadius: "50%", background: "#fff", top: 2, insetInlineStart: on ? 14 : 2, transition: ".15s" }} /></span>
         ))}
        </div>
       ))}
       <div className="row gap14" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--silver)", justifyContent: "flex-end" }}>
        {chans.map((l, i) => <span key={i} className="mono muted" style={{ fontSize: 9.5, width: 30, textAlign: "center" }}>{l}</span>)}
       </div>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
