import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon } from "@/components/satkit";

type Tier = { nm: string; who: string; price: string; unit: string; feat: boolean; ghost?: boolean; cta: string; pts: string[] };

export default function PricingPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const tiers: Tier[] = [
  { nm: "Explorer", who: "Browse and enquire, free", price: "0", unit: "SAR", feat: false, ghost: true, cta: "Current plan",
   pts: ["<b>1</b> active listing", "<b>2</b> requirement posts", "Contact verified listers", "Rent Index, district medians", "<b>10</b> AI Advisor queries / mo"] },
  { nm: "Starter", who: "Individual owners getting started", price: "299", unit: "SAR/mo", feat: false, cta: "Choose Starter",
   pts: ["<b>5</b> active listings", "<b>1</b> featured boost / mo", "<b>50</b> contact reveals / mo", "Full Rent Index + alerts", "<b>100</b> AI queries / mo"] },
  { nm: "Professional", who: "Active owners & solo brokers", price: "899", unit: "SAR/mo", feat: true, cta: "Choose Professional",
   pts: ["<b>25</b> active listings", "<b>5</b> featured boosts / mo", "Unlimited reveals & leads", "Location Intelligence, <b>10</b>/mo", "<b>5</b> seats · representation mandates"] },
  { nm: "Agency", who: "Brokerages & multi-agent teams", price: "2,900", unit: "SAR/mo", feat: false, cta: "Choose Agency",
   pts: ["<b>150</b> active listings", "<b>30</b> featured / mo", "Location Intelligence, <b>50</b>/mo", "<b>15</b> seats · lead routing", "API, <b>25k</b> calls / mo"] },
  { nm: "Enterprise", who: "Developers, REITs & institutions", price: "Custom", unit: "", feat: false, ghost: true, cta: "Talk to sales",
   pts: ["<b>Unlimited</b> listings & seats", "Full data & API feeds", "SSO & custom roles", "Scheduled portfolio reports", "Dedicated manager + SLA"] },
 ];
 const matrix: string[][] = [
  ["grp", "Listings & marketing"],
  ["Active listings", "1", "5", "25", "150", "∞"],
  ["Featured boosts / mo", "n/a", "1", "5", "30", "Custom"],
  ["Requirement posts", "2", "10", "∞", "∞", "∞"],
  ["grp", "Leads & enquiries"],
  ["Contact reveals / mo", "5", "50", "∞", "∞", "∞"],
  ["Lead inbox & analytics", "no", "yes", "yes", "yes", "yes"],
  ["Saved searches & alerts", "3", "20", "∞", "∞", "∞"],
  ["grp", "Data & intelligence"],
  ["Rent Index", "Medians", "Full", "Full + history", "Full + bulk", "Full + feed"],
  ["Location Intelligence / mo", "n/a", "2", "10", "50", "∞"],
  ["AI Advisor queries / mo", "10", "100", "500", "2,000", "∞"],
  ["Report export", "no", "yes", "yes", "yes", "yes"],
  ["grp", "Team, API & support"],
  ["Team seats", "1", "2", "5", "15", "∞"],
  ["Representation mandates", "no", "no", "yes", "yes", "yes"],
  ["API access", "no", "no", "no", "25k/mo", "Custom"],
  ["Support", "Community", "Email", "Priority", "Manager", "SLA + manager"],
 ];
 const cell = (v: string) => v === "yes" ? <span className="yes">✓</span> : v === "no" ? <span className="no">n/a</span> : <span className="tnum">{v}</span>;
 return (
  <div style={{ background: "var(--paper)" }}>
   <div style={{ padding: "48px 24px 28px", textAlign: "center", background: "linear-gradient(180deg,var(--cool),var(--paper))" }}>
    <div className="eyebrow">Membership</div>
    <h1 className="serif" style={{ fontSize: "clamp(30px,5vw,40px)", fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 0" }}>Plans that scale with how you use the exchange</h1>
    <p className="muted" style={{ fontSize: 15.5, maxWidth: 560, margin: "14px auto 0" }}>Every grade includes verified listings and the Rent Index. Higher grades raise your limits, listings, leads, data and seats.</p>
    <p className="muted" style={{ fontSize: 13, maxWidth: 600, margin: "8px auto 0" }}>Browsing is free, and a free account unlocks full listings, leads, and saved searches. For owners, listing is free during the launch window, then moves to a paid plan.</p>
    <div className="seg" style={{ display: "inline-flex", marginTop: 22 }}><span className="on">Monthly</span><span>Annual · save 2 months</span></div>
   </div>
   <div style={{ maxWidth: 1360, margin: "0 auto" }}>
    <div className="tier-grid" style={{ padding: "14px 24px 8px" }}>
     {tiers.map((t, i) => (
      <div key={i} className={"tier" + (t.feat ? " feat" : "")}>
       {t.feat && <span className="ribbon">Most popular</span>}
       <div className="nm">{t.nm}</div>
       <div className="who">{t.who}</div>
       <div className="price">{t.price}{t.unit && <small> {t.unit}</small>}</div>
       <ul>
        {t.pts.map((p, j) => <li key={j}><span className="ck"><Icon.check size={14} /></span><span dangerouslySetInnerHTML={{ __html: p }} /></li>)}
       </ul>
       <div style={{ flex: 1 }} />
       <span className={"btn " + (t.ghost ? "secondary" : "primary")} style={{ justifyContent: "center", marginTop: 20 }}>{t.cta}</span>
      </div>
     ))}
    </div>
    <p className="muted" style={{ textAlign: "center", fontSize: 12, margin: "10px 0 0" }}>Prices exclude 15% VAT · ZATCA-compliant tax invoices · cancel anytime</p>

    <div style={{ padding: "36px 24px 48px" }}>
     <h2 className="serif" style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 16px" }}>Compare every limit</h2>
     <div className="card" style={{ overflow: "hidden", boxShadow: "none" }}>
      <div style={{ overflowX: "auto" }}>
       <table className="matrix">
        <thead><tr><th></th><th>Explorer</th><th>Starter</th><th style={{ color: "var(--azure-d)" }}>Professional</th><th>Agency</th><th>Enterprise</th></tr></thead>
        <tbody>
         {matrix.map((r, i) => r[0] === "grp"
          ? <tr key={i} className="grp"><td colSpan={6}>{r[1]}</td></tr>
          : <tr key={i}><td>{r[0]}</td>{r.slice(1).map((v, j) => <td key={j}>{cell(v)}</td>)}</tr>)}
        </tbody>
       </table>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
