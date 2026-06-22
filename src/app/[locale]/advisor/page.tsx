import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon, Logo, Photo, Verified } from "@/components/satkit";

export default function AdvisorPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const threads: [string, string, boolean][] = [
    ["Grade A office, Olaya < 1,600", "2m ago", true],
    ["Value my 3-yr KAFD lease", "1h ago", false],
    ["Warehouse near 2nd Industrial", "Yesterday", false],
    ["Tahlia retail footfall", "2 days ago", false],
  ];
  const matches: [string, string, string, string][] = [
    ["Grade A Office, Olaya Tower", "320 m²", "1,450", "office"],
    ["Olaya Plaza, Fl.12", "300 m²", "1,420", "office"],
    ["Tahlia Gate, Fl.6", "285 m²", "1,560", "interior"],
  ];
  const sources: [(p: { size?: number }) => JSX.Element, string][] = [
    [Icon.chart, "SAT Rent Index Q1 2026"], [Icon.shield, "REGA permit registry"], [Icon.target, "Mobility panel · footfall"],
  ];
  return (
    <div className="dash">
      <aside className="dside advisor-rail-l" style={{ background: "var(--paper)", color: "var(--ink)", borderRight: "1px solid var(--silver)" }}>
        <div className="brand" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Logo size={26} />
          <span className="btn primary sm"><Icon.plus size={14} /> New</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "6px 0 10px", padding: "9px 12px", background: "var(--cool)", border: "1px solid var(--silver)", borderRadius: 9, color: "var(--slate-2)", fontSize: 12.5 }}><Icon.search size={15} /> Search chats…</div>
        <div className="dnav" style={{ gap: 4 }}>
          {threads.map((t, i) => (
            <a key={i} className={t[2] ? "on" : ""} style={{ flexDirection: "column", alignItems: "flex-start", gap: 3, color: "var(--ink)", background: t[2] ? "var(--azure-wash)" : "transparent" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{t[0]}</span>
              <span className="mono" style={{ fontSize: 10, color: "var(--slate-2)" }}>{t[1]}</span>
            </a>
          ))}
        </div>
        <div className="me" style={{ borderTopColor: "var(--silver)" }}>
          <span className="avatar" style={{ background: "var(--harbor)" }}>AK</span>
          <div><div className="nm" style={{ color: "var(--ink)" }}>Ahmed K.</div><div className="rl">Occupier · Acme Co.</div></div>
        </div>
      </aside>

      <div className="dmain" style={{ display: "flex", flexDirection: "column" }}>
        <div className="dtopbar">
          <span style={{ color: "var(--harbor)" }}><Icon.spark size={20} /></span>
          <div><h1>SAT Advisor</h1><div className="sub">Grounded in the verified Rent Index · explains the data, never invents it</div></div>
          <span style={{ flex: 1 }} />
          <span className="tag">Beta</span>
          <span className="btn secondary sm"><Icon.download size={14} /> Export</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "26px 24px", background: "var(--cool)" }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }} className="col gap18">
            <div className="chatmsg u" style={{ alignSelf: "flex-end" }}>I need a fitted Grade A office in Al Olaya, around 300 m², under 1,600 SAR/m².</div>
            <div className="chatmsg a">
              <div className="row gap8" style={{ marginBottom: 10 }}><span style={{ color: "var(--harbor)" }}><Icon.spark size={16} /></span><b style={{ fontWeight: 600 }}>3 verified matches</b> in Al Olaya — all owner-verified, fitted, 280–340 m².</div>
              <div className="col gap10">
                {matches.map((r, i) => (
                  <div key={i} className="row gap12" style={{ background: "#fff", border: "1px solid var(--silver)", borderRadius: 11, padding: 10 }}>
                    <Photo kind={r[3]} h={56} style={{ width: 80, borderRadius: 8, flex: "none" }} badges={[<Verified key="v" text="V" />]} />
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{r[0]}</div><div className="mono muted" style={{ fontSize: 11, marginTop: 3 }}>{r[1]} · Al Olaya</div></div>
                    <div style={{ textAlign: "right" }}><div className="mono" style={{ fontSize: 15, fontWeight: 500 }}>{r[2]}</div><div className="muted" style={{ fontSize: 10.5 }}>SAR/m²·yr</div></div>
                  </div>
                ))}
              </div>
              <div className="src">SAT Rent Index Q1 2026 · 142 districts · verified transactions only</div>
            </div>
            <div className="chatmsg u" style={{ alignSelf: "flex-end" }}>How does 1,450 compare to the market?</div>
            <div className="chatmsg a">
              <div style={{ marginBottom: 10 }}>Olaya Tower at <b>1,450</b> sits <b style={{ color: "var(--green)" }}>2% above</b> the Al Olaya Grade A median of <b>1,420</b>, which is up <b style={{ color: "var(--green)" }}>+8.4% YoY</b>. It&apos;s an <b style={{ color: "var(--azure-d)" }}>open first-lease</b>, so it sets headline — not a frozen rent.</div>
              <div className="bars" style={{ height: 84, marginTop: 6 }}>{[64, 70, 68, 76, 82, 90].map((h, i) => <div key={i} className={"b" + (i > 3 ? " hi" : "")} style={{ height: h + "%" }}><span className="v">{i === 5 ? "+8.4%" : ""}</span></div>)}</div>
              <div className="src">Source: SAT Rent Index · Al Olaya · Grade A office</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 24px 20px", background: "var(--paper)", borderTop: "1px solid var(--silver)" }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <div className="row gap8 wrap" style={{ marginBottom: 10 }}>
              {["Compare Olaya vs KAFD", "Value a 3-yr lease", "Catchment near Tahlia", "Capped vs open?"].map((p, i) => <span key={i} className="chip">{p}</span>)}
            </div>
            <div className="search focus" style={{ boxShadow: "none", border: "1px solid var(--azure)", padding: "11px 14px" }}>
              <span style={{ color: "var(--harbor)" }}><Icon.spark size={18} /></span>
              <div className="q"><span className="ph">Ask about rents, catchment, or value a lease…</span></div>
              <span className="btn primary sm"><Icon.send size={15} /></span>
            </div>
          </div>
        </div>
      </div>

      <aside className="advisor-rail-r" style={{ background: "var(--paper)", borderLeft: "1px solid var(--silver)", overflowY: "auto" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--silver)" }}><div className="eyebrow">Live context · Al Olaya</div></div>
        <div style={{ padding: 20 }} className="col gap16">
          <div className="row gap16"><div className="kpi"><span className="v tnum" style={{ fontSize: 20 }}>1,420</span><span className="l">Median Grade A</span></div><div className="kpi"><span className="v tnum" style={{ fontSize: 20, color: "var(--green)" }}>+8.4%</span><span className="l">YoY · open stock</span></div></div>
          <div className="row gap16"><div className="kpi"><span className="v tnum" style={{ fontSize: 20 }}>96%</span><span className="l">Occupancy</span></div><div className="kpi"><span className="v tnum" style={{ fontSize: 20 }}>412k</span><span className="l">Daytime catchment</span></div></div>
          <div className="card pad" style={{ boxShadow: "none", background: "var(--cool)" }}>
            <div className="eyebrow">Sources used</div>
            <div className="col gap8" style={{ marginTop: 10 }}>
              {sources.map((s, i) => { const I = s[0]; return (
                <div key={i} className="row gap8" style={{ fontSize: 12 }}><span style={{ color: "var(--harbor)" }}><I size={14} /></span>{s[1]}</div>
              ); })}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
