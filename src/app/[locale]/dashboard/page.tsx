import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon, Logo, Photo } from "@/components/satkit";

function KCard({ icon: I, tone, v, l, delta, dir }: { icon: (p: { size?: number }) => JSX.Element; tone?: string; v: string; l: string; delta?: string; dir?: string }) {
  return (
    <div className="kcard">
      <div className="top">
        <span className={"ic" + (tone ? " " + tone : "")}><I size={18} /></span>
        {delta && <span className={"delta " + (dir || "")}>{dir === "up" ? "▲ " : dir === "down" ? "▼ " : ""}{delta}</span>}
      </div>
      <div className="v tnum">{v}</div>
      <div className="l">{l}</div>
    </div>
  );
}

export default function DashboardPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const nav: { label: string; icon?: (p: { size?: number }) => JSX.Element; badge?: string; warn?: boolean; sec?: boolean }[] = [
    { label: "Overview", icon: Icon.grid },
    { label: "My listings", icon: Icon.building },
    { label: "Enquiries", icon: Icon.inbox, badge: "9" },
    { label: "Requirement matches", icon: Icon.target, badge: "5" },
    { label: "Performance", icon: Icon.chart },
    { label: "Account", sec: true },
    { label: "Billing & plan", icon: Icon.coins },
    { label: "Settings", icon: Icon.gear },
  ];
  const listings: [string, string, string, string, string, number, number, number, string][] = [
    ["Grade A Office, Olaya Tower", "Al Olaya · 320 m²", "office", "1,450", "live", 4820, 186, 7, "+2%"],
    ["Fitted floor, KAFD", "KAFD · 540 m²", "city", "1,310", "live", 3110, 98, 2, "−8%"],
    ["Retail unit, Tahlia St", "Tahlia · 180 m²", "retail", "2,100", "pending", 0, 0, 0, "+10%"],
    ["Warehouse, 2nd Industrial", "2nd Ind. · 2,400 m²", "warehouse", "640", "live", 1290, 41, 0, "+16%"],
  ];
  const leads: [string, string, string, string, string][] = [
    ["AK", "Ahmed K.", "Grade A Office, Olaya Tower", "2h ago", "new"],
    ["RD", "Reem D.", "Fitted floor, KAFD", "5h ago", "new"],
    ["MQ", "Majed Q.", "Grade A Office, Olaya Tower", "Yesterday", "replied"],
    ["SF", "Sara F.", "Warehouse, 2nd Industrial", "2 days ago", "replied"],
  ];
  const matches: [string, string][] = [
    ["Regional HQ, Grade A", "Olaya / KAFD · 300–600 m²"],
    ["Fitted office, immediate", "Olaya · ~320 m²"],
    ["Showroom, street-front", "Tahlia · 150–220 m²"],
  ];
  const views = [42, 50, 47, 58, 64, 60, 72, 80, 76, 88, 95, 104];
  return (
    <div className="dash">
      <aside className="dside">
        <div className="brand"><Logo size={26} rev /></div>
        <div className="dnav">
          {nav.map((n, i) => n.sec
            ? <div key={i} className="sec">{n.label}</div>
            : <a key={i} className={n.label === "Overview" ? "on" : ""}>
                <span className="ic">{n.icon && n.icon({ size: 18 })}</span>
                <span>{n.label}</span>
                {n.badge && <span className={"badge" + (n.warn ? " warn" : "")}>{n.badge}</span>}
              </a>)}
        </div>
        <div className="me">
          <span className="avatar" style={{ background: "var(--harbor)" }}>OT</span>
          <div><div className="nm">Olaya Towers Co.</div><div className="rl">Verified owner</div></div>
          <span style={{ marginLeft: "auto", color: "#6B7480" }}><Icon.logout size={17} /></span>
        </div>
      </aside>
      <div className="dmain">
        <div className="dtopbar">
          <div><h1>Welcome back, Olaya Towers</h1><div className="sub">6 active listings · 9 new enquiries this week</div></div>
          <span style={{ flex: 1 }} />
          <span className="dsearch"><Icon.search size={16} /> Search…</span>
          <span style={{ color: "var(--slate)", position: "relative" }}><Icon.bell size={19} /><span style={{ position: "absolute", top: -2, right: -2, width: 7, height: 7, borderRadius: "50%", background: "var(--red)" }} /></span>
          <span className="btn primary"><Icon.plus size={16} /> List a space</span>
        </div>
        <div className="dbody">
          <div className="kgrid">
            <KCard icon={Icon.building} tone="h" v="6" l="Active listings" />
            <KCard icon={Icon.eye} v="12,480" l="Total views · 30d" delta="+18%" dir="up" />
            <KCard icon={Icon.inbox} v="9" l="New enquiries" delta="+3" dir="up" />
            <KCard icon={Icon.clock} tone="a" v="34h" l="Avg. time-to-verified" />
          </div>

          <div className="dash-2col">
            <div className="dpanel">
              <div className="ph"><span className="t">Listing performance</span><span style={{ flex: 1 }} /><span className="chip" style={{ borderColor: "var(--silver)" }}>Last 30 days <Icon.chevd size={13} /></span></div>
              <div style={{ overflowX: "auto" }}>
                <table className="dt" style={{ minWidth: 520 }}>
                  <thead><tr><th>Listing</th><th style={{ textAlign: "right" }}>Views</th><th style={{ textAlign: "right" }}>Saves</th><th style={{ textAlign: "right" }}>Enquiries</th><th style={{ textAlign: "right" }}>Status</th></tr></thead>
                  <tbody>
                    {listings.map((l, i) => (
                      <tr key={i}>
                        <td>
                          <div className="row gap10">
                            <Photo kind={l[2]} h={40} style={{ width: 56, borderRadius: 7, flex: "none" }} />
                            <div><div style={{ fontWeight: 600, fontSize: 13 }}>{l[0]}</div><div className="mono muted" style={{ fontSize: 11 }}>{l[1]} · {l[3]} SAR/m²</div></div>
                          </div>
                        </td>
                        <td className="num mono">{l[5].toLocaleString()}</td>
                        <td className="num mono">{l[6]}</td>
                        <td className="num mono" style={{ fontWeight: 600, color: l[7] ? "var(--ink)" : "var(--slate-2)" }}>{l[7] || "—"}</td>
                        <td className="num"><span className={"statusdot " + (l[4] === "live" ? "ok" : "pend")}>{l[4] === "live" ? "Live" : "Pending"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="dpanel">
              <div className="ph"><span className="t">Recent enquiries</span><span style={{ flex: 1 }} /><span style={{ fontSize: 12.5, color: "var(--azure-d)", fontWeight: 600 }}>View all</span></div>
              {leads.map((l, i) => (
                <div key={i} className="lead-item">
                  <span className="avatar" style={{ background: i % 2 ? "var(--slate)" : "var(--harbor)" }}>{l[0]}</span>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{l[1]}</div><div className="muted" style={{ fontSize: 11.5 }}>{l[2]}</div></div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono muted" style={{ fontSize: 10.5 }}>{l[3]}</div>
                    {l[4] === "new" ? <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)", marginTop: 4 }}>New</span> : <span className="muted2" style={{ fontSize: 10.5 }}>Replied</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dash-2col">
            <div className="dpanel">
              <div className="ph"><span className="t">Views &amp; enquiries</span><span style={{ flex: 1 }} /><span className="lgd"><span className="sw" /> Views</span></div>
              <div style={{ padding: "22px 20px 16px" }}>
                <div className="bars" style={{ height: 150, gap: 8 }}>
                  {views.map((h, i) => <div key={i} className={"b" + (i >= 10 ? " hi" : "")} style={{ height: (h / 104 * 100) + "%" }} />)}
                </div>
                <div className="row between mono muted" style={{ fontSize: 10, marginTop: 8 }}><span>Jan</span><span>Jun</span><span>Dec</span></div>
              </div>
            </div>
            <div className="dpanel">
              <div className="ph"><span style={{ color: "var(--harbor)" }}><Icon.target size={17} /></span><span className="t">Requirement matches</span></div>
              <div style={{ padding: "6px 0" }}>
                {matches.map((r, i) => (
                  <div key={i} className="lead-item">
                    <span className="queue-ic"><Icon.doc size={16} /></span>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{r[0]}</div><div className="muted" style={{ fontSize: 11.5 }}>{r[1]}</div></div>
                    <span className="btn secondary sm">Pitch</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
