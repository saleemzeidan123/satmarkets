import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon, Logo, Photo } from "@/components/satkit";

export default function AdminListingsPage({ params }: { params: { locale: string } }) {
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
 const rows: [number, string, string, string, string, string, string, string, number, number][] = [
  [1, "Grade A Office, Olaya Tower", "Al Olaya", "office", "Olaya Towers Co.", "Office", "1,450", "live", 4820, 7],
  [2, "Fitted floor, KAFD", "KAFD", "city", "KAFD Devco", "Office", "1,310", "live", 3110, 2],
  [3, "Flagship retail, Tahlia", "Tahlia", "retail", "Tahlia Holdings", "Retail", "2,100", "pending", 0, 0],
  [4, "Logistics warehouse", "2nd Industrial", "warehouse", "Sudair Logistics", "Warehouse", "640", "live", 1290, 0],
  [5, "Clinic floor, Hittin", "Hittin", "interior", "NorthMed Co.", "Medical", "1,180", "pending", 0, 0],
  [6, "Showroom, Khurais Rd", "Khurais", "retail", "Auto Plaza", "Showroom", "980", "flagged", 540, 1],
  [7, "Serviced suite, Olaya", "Al Olaya", "interior", "WorkHub", "Serviced", "2,400", "live", 2210, 4],
  [8, "Cold store, Sudair", "Sudair", "warehouse", "IceLine", "Warehouse", "720", "archived", 88, 0],
 ];
 const stTone: Record<string, string> = { live: "ok", pending: "pend", flagged: "off", archived: "off" };
 const stLabel: Record<string, string> = { live: "Live", pending: "Pending", flagged: "Flagged", archived: "Archived" };
 const box = <span style={{ width: 15, height: 15, border: "1.5px solid var(--silver-2)", borderRadius: 4, display: "inline-block" }} />;
 return (
  <div className="dash">
   <aside className="dside">
    <div className="brand"><Link href={`/${params.locale}`} aria-label="Home"><Logo size={26} rev /></Link></div>
    <div className="dnav">
     {nav.map((n, i) => n.sec
      ? <div key={i} className="sec">{n.label}</div>
      : <a key={i} className={n.label === "Listings" ? "on" : ""}>
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
     <div><h1>Listings</h1><div className="sub">5,312 total · 14 pending · 3 flagged</div></div>
     <span style={{ flex: 1 }} />
     <span className="btn secondary"><Icon.download size={15} /> Export</span>
     <span className="btn primary"><Icon.plus size={16} /> Add listing</span>
    </div>
    <div className="dbody">
     <div className="row between wrap" style={{ marginBottom: 16, gap: 12 }}>
      <div className="tabs" style={{ border: 0 }}>
       <span className="t on">All · 5,312</span><span className="t">Live · 5,021</span><span className="t">Pending · 14</span><span className="t">Flagged · 3</span><span className="t">Archived · 274</span>
      </div>
      <div className="row gap8 wrap">
       <span className="chip" style={{ borderColor: "var(--silver)" }}>All districts <Icon.chevd size={13} /></span>
       <span className="chip" style={{ borderColor: "var(--silver)" }}>All types <Icon.chevd size={13} /></span>
       <span className="dsearch" style={{ minWidth: 200 }}><Icon.search size={15} /> Search listings…</span>
      </div>
     </div>

     <div className="dpanel">
      <div style={{ overflowX: "auto" }}>
       <table className="dt" style={{ minWidth: 860 }}>
        <thead><tr>
         <th style={{ width: 34 }}>{box}</th>
         <th>Listing</th><th>Owner</th><th>Type</th><th style={{ textAlign: "right" }}>SAR/m²</th>
         <th style={{ textAlign: "right" }}>Views</th><th style={{ textAlign: "right" }}>Enq.</th><th style={{ textAlign: "right" }}>Status</th><th style={{ width: 90, textAlign: "right" }}>Manage</th>
        </tr></thead>
        <tbody>
         {rows.map((r, i) => (
          <tr key={i}>
           <td>{box}</td>
           <td>
            <div className="row gap10">
             <Photo kind={r[3]} h={40} style={{ width: 56, borderRadius: 7, flex: "none" }} badges={r[7] === "flagged" ? [<span key="f" className="tag" style={{ background: "rgba(200,65,46,.92)", color: "#fff", border: 0, fontSize: 8 }}>!</span>] : undefined} />
             <div><div style={{ fontWeight: 600, fontSize: 13 }}>{r[1]}</div><div className="mono muted" style={{ fontSize: 11 }}>#{1000 + r[0]} · {r[2]}</div></div>
            </div>
           </td>
           <td className="muted" style={{ fontSize: 12.5 }}>{r[4]}</td>
           <td><span className="tag">{r[5]}</span></td>
           <td className="num mono" style={{ fontWeight: 500 }}>{r[6]}</td>
           <td className="num mono">{r[8].toLocaleString()}</td>
           <td className="num mono">{r[9] || "n/a"}</td>
           <td className="num"><span className={"statusdot " + stTone[r[7]]}>{stLabel[r[7]]}</span></td>
           <td className="num">
            <div className="row gap8" style={{ justifyContent: "flex-end", color: "var(--slate)" }}>
             <Icon.edit size={16} /><Icon.eye size={16} /><Icon.dots size={16} />
            </div>
           </td>
          </tr>
         ))}
        </tbody>
       </table>
      </div>
      <div className="row between" style={{ padding: "13px 20px", borderTop: "1px solid var(--silver)", background: "var(--cool)" }}>
       <span className="muted" style={{ fontSize: 12 }}>Showing 1–8 of 5,312</span>
       <div className="row gap6">
        <span className="btn secondary sm">Prev</span>
        <span className="btn secondary sm" style={{ background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" }}>1</span>
        <span className="btn secondary sm">2</span><span className="btn secondary sm">3</span>
        <span className="btn secondary sm">Next</span>
       </div>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
