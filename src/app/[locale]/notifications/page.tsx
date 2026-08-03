import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon } from "@/components/satkit";
import { getDictionary } from "@/i18n/getDictionary";

type Note = [(p: { size?: number }) => JSX.Element, string, string, string, string, boolean];

import SampleBanner from "@/components/SampleBanner";
export default async function NotificationsPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 if (!isLocale(params.locale)) notFound();
 const ar = params.locale === "ar";
 const d = getDictionary(params.locale).notifications;
 const groups: [string, Note[]][] = [
  [d.today, [
   [Icon.shield, "g", d.n1Title, d.n1Body, d.n1Time, true],
   [Icon.inbox, "a", d.n2Title, d.n2Body, d.n2Time, true],
   [Icon.spark, "h", d.n3Title, d.n3Body, d.n3Time, true],
  ]],
  [d.earlier, [
   [Icon.cal, "a", d.n4Title, d.n4Body, d.n4Time, false],
   [Icon.coins, "h", d.n5Title, d.n5Body, d.n5Time, false],
   [Icon.chart, "", d.n6Title, d.n6Body, d.n6Time, false],
   [Icon.flag, "a", d.n7Title, d.n7Body, d.n7Time, false],
  ]],
 ];
 const unread = groups.reduce((n, g) => n + g[1].filter((x) => x[5]).length, 0);
 const tone: Record<string, [string, string]> = {
  g: ["var(--azure-wash)", "var(--harbor-d)"], a: ["var(--azure-wash)", "var(--azure-d)"],
  h: ["#EAF0F7", "var(--harbor)"], "": ["var(--cool)", "var(--slate)"],
 };
 const prefs: [string, boolean, boolean, boolean][] = [
  [d.prefEnquiries, true, true, true], [d.prefOffers, true, true, true],
  [d.prefViewing, true, true, false], [d.prefVerification, true, true, false],
  [d.prefMatches, true, false, true], [d.prefRentIndex, false, true, false],
  [d.prefTips, false, true, false],
 ];
 const chans = [d.chanInApp, d.chanEmail, d.chanPush];
 return (
  <div style={{ background: "var(--cool)" }}>
   <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px 48px" }}>
    <SampleBanner ar={ar} />
    <div className="row between wrap" style={{ alignItems: "flex-end", gap: 14, marginBottom: 22 }}>
     <div><div className="eyebrow">{d.title}</div><h1 style={{ fontSize: "1.625rem", fontWeight: 700, letterSpacing: "-.02em", margin: "10px 0 0" }}>{unread > 0 ? `${unread} ${d.unread}` : d.caughtUp}</h1></div>
     <div className="row gap8 wrap"><span className="btn secondary sm">{d.markAllRead}</span><span className="btn secondary sm"><Icon.gear size={14} /> {d.preferences}</span></div>
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
           <div className="grow"><div style={{ fontSize: "0.84375rem", fontWeight: 600 }}>{n[2]}</div><div className="muted" style={{ fontSize: "0.75rem", marginTop: 2, lineHeight: 1.5 }}>{n[3]}</div></div>
           <div style={{ textAlign: ar ? "left" : "right", flex: "none" }}><div className="mono muted" style={{ fontSize: "0.65625rem" }}>{n[4]}</div>{n[5] && <span style={{ display: "inline-block", marginTop: 6, width: 8, height: 8, borderRadius: "50%", background: "var(--azure)" }} />}</div>
          </div>
         ); })}
        </div>
       </div>
      ))}
     </div>
     <div className="dpanel" style={{ alignSelf: "flex-start" }}>
      <div className="ph"><span className="t">{d.howNotified}</span></div>
      <div style={{ padding: "6px 20px 16px" }}>
       <div className="row gap10" style={{ alignItems: "center", paddingBottom: 8, marginBottom: 4, borderBottom: "1px solid var(--silver)" }}>
        <span className="grow" />
        {chans.map((l, i) => <span key={i} className="mono muted" style={{ fontSize: "0.59375rem", width: 30, textAlign: "center", lineHeight: 1.25 }}>{l}</span>)}
       </div>
       {prefs.map((r, i) => (
        <div key={i} className="urow" style={{ display: "flex", alignItems: "center", gap: 10 }}>
         <span className="grow" style={{ fontSize: "0.8125rem" }}>{r[0]}</span>
         {[r[1], r[2], r[3]].map((on, j) => (
          <span key={j} title={chans[j]} style={{ width: 30, height: 18, borderRadius: 10, background: on ? "var(--azure)" : "var(--silver)", position: "relative", flex: "none" }}><span style={{ position: "absolute", width: 14, height: 14, borderRadius: "50%", background: "var(--paper)", top: 2, insetInlineStart: on ? 14 : 2, transition: ".15s" }} /></span>
         ))}
        </div>
       ))}
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
