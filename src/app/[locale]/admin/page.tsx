import Link from "next/link";
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

export default function AdminPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const nav: { label: string; icon?: (p: { size?: number }) => JSX.Element; badge?: string; warn?: boolean; sec?: boolean }[] = [
    { label: "Overview", icon: Icon.grid },
    { label: "Verification queue", icon: Icon.shield, badge: "14", warn: true },
    { label: "Listings", icon: Icon.building },
    { label: "Requirements", icon: Icon.doc },
    { label: "Users & brokers", icon: Icon.users },
    { label: "Data & ops", sec: true },
    { label: "Rent Index data", icon: Icon.chart },
    { label: "Compliance · REGA", icon: Icon.flag, badge: "3", warn: true },
    { label: "Reports", icon: Icon.download },
    { label: "Settings", icon: Icon.gear },
  ];
  const queue: [string, string, string, string, string, string][] = [
    ["Grade A Office, Olaya Tower", "Olaya Towers Co.", "office", "7200-AD-118934", "1100398472", "2h ago"],
    ["Logistics warehouse, Sudair", "Sudair Logistics", "warehouse", "7200-AD-118901", "1100221190", "4h ago"],
    ["Retail, Tahlia Walk", "Tahlia Holdings", "retail", "pending", "1100887651", "6h ago"],
    ["Clinic floor, Hittin", "NorthMed Co.", "interior", "7200-AD-118870", "pending", "Yesterday"],
  ];
  const compliance: [string, string, string][] = [
    ["Advertising permits valid", "5,298 / 5,312", "ok"],
    ["FAL licences current", "418 / 421", "pend"],
    ["Permits expiring ≤30d", "23 listings", "pend"],
    ["Listings missing permit", "3", "off"],
  ];
  const activity = [40, 52, 48, 60, 70, 66, 78, 72, 84, 80, 92, 88, 96, 90];
  return (
    <div className="dash">
      <aside className="dside">
        <div className="brand"><Link href={`/${params.locale}`} aria-label="Home"><Logo size={26} rev /></Link></div>
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
          <span className="avatar" style={{ background: "var(--azure-d)" }}>MR</span>
          <div><div className="nm">M. Al-Rashid</div><div className="rl">Platform admin</div></div>
          <span style={{ marginLeft: "auto", color: "#6B7480" }}><Icon.logout size={17} /></span>
        </div>
      </aside>
      <div className="dmain">
        <div className="dtopbar">
          <div><h1>Platform overview</h1><div className="sub">Q1 2026 · Riyadh</div></div>
          <span style={{ flex: 1 }} />
          <span className="dsearch"><Icon.search size={16} /> Search…</span>
          <span style={{ color: "var(--slate)", position: "relative" }}><Icon.bell size={19} /><span style={{ position: "absolute", top: -2, right: -2, width: 7, height: 7, borderRadius: "50%", background: "var(--red)" }} /></span>
          <span className="btn secondary"><Icon.download size={15} /> Export</span>
          <span className="btn primary"><Icon.plus size={16} /> New listing</span>
        </div>
        <div className="dbody">
          <div className="kgrid">
            <KCard icon={Icon.shield} tone="a" v="14" l="Pending verification" delta="SLA 36h" />
            <KCard icon={Icon.building} tone="h" v="5,312" l="Active listings" delta="+126" dir="up" />
            <KCard icon={Icon.inbox} v="1,204" l="Open enquiries" delta="+9%" dir="up" />
            <KCard icon={Icon.flag} tone="a" v="3" l="Flagged items" />
          </div>

          <div className="dash-2col" style={{ gridTemplateColumns: "1.7fr 1fr" }}>
            <div className="dpanel">
              <div className="ph"><span style={{ color: "var(--amber)" }}><Icon.shield size={17} /></span><span className="t">Verification queue</span><span style={{ flex: 1 }} /><span className="chip" style={{ borderColor: "var(--silver)" }}>Oldest first <Icon.chevd size={13} /></span></div>
              <div style={{ overflowX: "auto" }}>
                <table className="dt" style={{ minWidth: 560 }}>
                  <thead><tr><th>Listing</th><th>Permit / FAL</th><th>Submitted</th><th style={{ textAlign: "right" }}>Action</th></tr></thead>
                  <tbody>
                    {queue.map((q, i) => (
                      <tr key={i}>
                        <td>
                          <div className="row gap10">
                            <Photo kind={q[2]} h={38} style={{ width: 52, borderRadius: 7, flex: "none" }} />
                            <div><div style={{ fontWeight: 600, fontSize: 13 }}>{q[0]}</div><div className="muted" style={{ fontSize: 11.5 }}>{q[1]}</div></div>
                          </div>
                        </td>
                        <td>
                          <div className="col" style={{ gap: 3 }}>
                            <span className={"statusdot " + (q[3] === "pending" ? "pend" : "ok")} style={{ fontSize: 11 }}>{q[3] === "pending" ? "Permit pending" : q[3]}</span>
                            <span className={"statusdot " + (q[4] === "pending" ? "pend" : "ok")} style={{ fontSize: 11 }}>{q[4] === "pending" ? "FAL pending" : "FAL " + q[4]}</span>
                          </div>
                        </td>
                        <td className="mono muted" style={{ fontSize: 11.5 }}>{q[5]}</td>
                        <td className="num">
                          <div className="row gap6" style={{ justifyContent: "flex-end" }}>
                            <span className="btn secondary sm">Review</span>
                            <span className="btn primary sm" style={{ background: "var(--green)" }}>Approve</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col gap18">
              <div className="dpanel">
                <div className="ph"><span style={{ color: "var(--harbor)" }}><Icon.flag size={16} /></span><span className="t">REGA compliance</span></div>
                <div style={{ padding: "14px 20px 18px" }}>
                  {compliance.map((r, i) => (
                    <div key={i} className="row between" style={{ padding: "9px 0", borderTop: i ? "1px solid var(--silver)" : 0 }}>
                      <span className="muted" style={{ fontSize: 12.5 }}>{r[0]}</span>
                      <span className={"statusdot " + r[2]} style={{ fontSize: 12, fontWeight: 600 }}>{r[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="dpanel">
                <div className="ph"><span style={{ color: "var(--harbor)" }}><Icon.activity size={16} /></span><span className="t">Activity · 14 days</span></div>
                <div style={{ padding: "20px 20px 16px" }}>
                  <div className="bars" style={{ height: 96, gap: 5 }}>
                    {activity.map((h, i) => <div key={i} className={"b" + (i > 10 ? " hi" : "")} style={{ height: h + "%" }} />)}
                  </div>
                  <div className="row between" style={{ marginTop: 14 }}>
                    <div className="kpi"><span className="v tnum" style={{ fontSize: 18 }}>312</span><span className="l">New listings</span></div>
                    <div className="kpi"><span className="v tnum" style={{ fontSize: 18 }}>86</span><span className="l">New users</span></div>
                    <div className="kpi"><span className="v tnum" style={{ fontSize: 18 }}>1.3%</span><span className="l">Flag rate</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
