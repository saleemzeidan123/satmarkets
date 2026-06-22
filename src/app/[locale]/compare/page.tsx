import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon, Ph, Verified } from "@/components/satkit";

type Col = { ttl: string; dist: string; ph: string; freeze: string };
type Row = [string, [string, string, string], number | null, string];

export default function ComparePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const cols: Col[] = [
    { ttl: "Grade A Floor, Olaya Tower", dist: "Al Olaya", ph: "Grade A office · Al Olaya", freeze: "open" },
    { ttl: "Fitted floor, KAFD", dist: "KAFD", ph: "Office floor · KAFD", freeze: "open" },
    { ttl: "Tahlia Gate, Fl.6", dist: "Tahlia", ph: "Office · Tahlia Gate", freeze: "open" },
  ];
  const rows: Row[] = [
    ["Price · SAR/m²·yr", ["1,450", "1,310", "1,560"], 1, "mono"],
    ["Total · SAR/yr", ["464,000", "707,400", "444,600"], null, "mono"],
    ["Net leasable area", ["320 m²", "540 m²", "285 m²"], null, ""],
    ["Grade", ["Grade A", "Grade A", "Grade A"], null, ""],
    ["Fit-out", ["Fitted", "Fitted", "Shell & core"], null, ""],
    ["Lease status", ["open", "open", "open"], null, "freeze"],
    ["vs Olaya median (1,420)", ["+2%", "−8%", "+10%"], 1, "delta"],
    ["Daytime catchment", ["412k", "286k", "503k"], 2, "mono"],
    ["Footfall index (city=100)", ["138", "121", "152"], 2, "mono"],
    ["Net initial yield", ["6.8%", "7.0%", "6.4%"], 1, "mono"],
    ["Median time-to-lease", ["18 days", "22 days", "14 days"], 2, "mono"],
    ["Metro distance", ["350 m", "200 m", "600 m"], 1, ""],
  ];
  const GRID = "232px 1fr 1fr 1fr";
  return (
    <div style={{ background: "var(--cool)" }}>
      <div style={{ maxWidth: 1360, margin: "0 auto" }}>
        <div className="row between wrap" style={{ padding: "22px 24px 18px", alignItems: "flex-end", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 16 }}>
          <div>
            <div className="eyebrow">Compare · 3 spaces</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", margin: "10px 0 0" }}>Side by side, priced in context</h1>
          </div>
          <div className="row gap10 wrap">
            <span className="btn secondary"><Icon.download size={15} /> Export</span>
            <span className="btn primary"><Icon.spark size={15} /> Ask AI to recommend</span>
          </div>
        </div>

        <div style={{ padding: "24px 24px 44px" }}>
          <div style={{ overflowX: "auto" }}>
            <div className="card" style={{ overflow: "hidden", boxShadow: "var(--sh-1)", minWidth: 720 }}>
              <div style={{ display: "grid", gridTemplateColumns: GRID }}>
                <div style={{ borderRight: "1px solid var(--silver)", borderBottom: "1px solid var(--silver)" }} />
                {cols.map((c, i) => (
                  <div key={i} style={{ padding: 16, borderRight: i < 2 ? "1px solid var(--silver)" : "none", borderBottom: "1px solid var(--silver)" }}>
                    <div style={{ position: "relative" }}>
                      <Ph label={c.ph} h={108} style={{ borderRadius: 9 }} badges={[<Verified key="v" text="V" />, <span key="f" className={"freeze " + c.freeze} style={{ background: "rgba(255,255,255,.92)" }}><span className="dot" />{c.freeze === "open" ? "Open" : "Capped"}</span>]} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12, letterSpacing: "-.01em" }}>{c.ttl}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{c.dist}, Riyadh</div>
                  </div>
                ))}
              </div>

              {rows.map((r, ri) => (
                <div key={ri} style={{ display: "grid", gridTemplateColumns: GRID, borderBottom: ri < rows.length - 1 ? "1px solid var(--silver)" : "none" }}>
                  <div style={{ padding: "14px 16px", fontSize: 12.5, fontWeight: 600, color: "var(--slate)", background: "var(--cool)", borderRight: "1px solid var(--silver)" }}>{r[0]}</div>
                  {r[1].map((v, ci) => {
                    const best = r[2] === ci;
                    return (
                      <div key={ci} style={{ padding: "14px 16px", borderRight: ci < 2 ? "1px solid var(--silver)" : "none", background: best ? "var(--green-wash)" : "transparent", display: "flex", alignItems: "center", gap: 8 }}>
                        {r[3] === "freeze"
                          ? <span className={"freeze " + v}><span className="dot" />{v === "open" ? "Open · first-lease" : "Capped · frozen"}</span>
                          : <span className={(r[3] === "mono" ? "mono " : "") + (r[3] === "delta" ? "delta up " : "")} style={{ fontSize: 13.5, fontWeight: r[3] === "mono" ? 500 : 600, color: r[3] === "delta" ? (v[0] === "−" ? "var(--red)" : "var(--green)") : "var(--ink)" }}>{v}</span>}
                        {best && <span className="tag" style={{ color: "var(--green)", background: "transparent", border: 0, padding: 0, fontSize: 9.5 }}>BEST</span>}
                      </div>
                    );
                  })}
                </div>
              ))}

              <div style={{ display: "grid", gridTemplateColumns: GRID, borderTop: "1px solid var(--silver)", background: "var(--cool)" }}>
                <div style={{ padding: "16px", borderRight: "1px solid var(--silver)" }} />
                {cols.map((c, i) => (
                  <div key={i} style={{ padding: 16, borderRight: i < 2 ? "1px solid var(--silver)" : "none" }}>
                    <span className="btn primary sm" style={{ width: "100%", justifyContent: "center" }}>Contact — free</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="row gap10" style={{ marginTop: 16 }}>
            <span style={{ color: "var(--harbor)" }}><Icon.info size={15} /></span>
            <span className="muted" style={{ fontSize: 12.5 }}>Highlighted cells mark the strongest value on each metric. Catchment, yield and time-to-lease are drawn from the SAT Rent Index &amp; Location Intelligence — every figure is sourced.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
