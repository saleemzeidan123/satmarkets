import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon } from "@/components/satkit";

type Note = [(p: { size?: number }) => JSX.Element, string, string, string, string, boolean];

export default function NotificationsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const groups: [string, Note[]][] = [
    ["Today", [
      [Icon.shield, "g", "Listing verified", "Grade A Office, Olaya Tower is now live and verified.", "2m", true],
      [Icon.inbox, "a", "New enquiry", "Ahmed K. enquired about Olaya Tower — responds best within 2h.", "40m", true],
      [Icon.spark, "h", "AI match found", "3 new requirement matches fit your KAFD floor.", "1h", true],
    ]],
    ["Earlier", [
      [Icon.cal, "a", "Viewing confirmed", "Thursday 10:00 with Olaya Towers Co. Added to your calendar.", "Yesterday", false],
      [Icon.coins, "h", "Offer received", "Reem D. submitted an offer: 1,420 SAR/m², 5-year term.", "Yesterday", false],
      [Icon.chart, "", "Rent Index update", "Al Olaya Grade A rose +0.6% this week (open stock).", "2 days", false],
      [Icon.flag, "a", "Permit expiring", "Advertising permit for Tahlia retail expires in 30 days.", "3 days", false],
    ]],
  ];
  const tone: Record<string, [string, string]> = {
    g: ["#E7F3EC", "var(--green)"], a: ["var(--azure-wash)", "var(--azure-d)"],
    h: ["#EAF0F7", "var(--harbor)"], "": ["var(--cool)", "var(--slate)"],
  };
  const prefs: [string, boolean, boolean, boolean][] = [
    ["New enquiries", true, true, true], ["Offers & deals", true, true, true],
    ["Viewing reminders", true, true, false], ["Verification status", true, true, false],
    ["Requirement matches", true, false, true], ["Rent Index alerts", false, true, false],
    ["Product & tips", false, true, false],
  ];
  return (
    <div style={{ background: "var(--cool)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px 48px" }}>
        <div className="row between wrap" style={{ alignItems: "flex-end", gap: 14, marginBottom: 22 }}>
          <div><div className="eyebrow">Notifications</div><h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", margin: "10px 0 0" }}>You&rsquo;re caught up</h1><div className="muted" style={{ fontSize: 13.5, marginTop: 5 }}>3 unread</div></div>
          <div className="row gap8 wrap"><span className="btn secondary sm">Mark all read</span><span className="btn secondary sm"><Icon.gear size={14} /> Preferences</span></div>
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
                      <div style={{ textAlign: "right", flex: "none" }}><div className="mono muted" style={{ fontSize: 10.5 }}>{n[4]}</div>{n[5] && <span style={{ display: "inline-block", marginTop: 6, width: 8, height: 8, borderRadius: "50%", background: "var(--azure)" }} />}</div>
                    </div>
                  ); })}
                </div>
              </div>
            ))}
          </div>
          <div className="dpanel" style={{ alignSelf: "flex-start" }}>
            <div className="ph"><span className="t">How you&rsquo;re notified</span></div>
            <div style={{ padding: "6px 20px 16px" }}>
              {prefs.map((r, i) => (
                <div key={i} className="urow" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="grow" style={{ fontSize: 13 }}>{r[0]}</span>
                  {[r[1], r[2], r[3]].map((on, j) => (
                    <span key={j} title={["In-app", "Email", "Push"][j]} style={{ width: 30, height: 18, borderRadius: 10, background: on ? "var(--azure)" : "var(--silver)", position: "relative", flex: "none" }}><span style={{ position: "absolute", width: 14, height: 14, borderRadius: "50%", background: "#fff", top: 2, left: on ? 14 : 2, transition: ".15s" }} /></span>
                  ))}
                </div>
              ))}
              <div className="row gap14" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--silver)", justifyContent: "flex-end" }}>
                {["In-app", "Email", "Push"].map((l, i) => <span key={i} className="mono muted" style={{ fontSize: 9.5, width: 30, textAlign: "center" }}>{l}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
