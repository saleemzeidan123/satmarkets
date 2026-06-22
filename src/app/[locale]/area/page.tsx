import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon, MarkPin } from "@/components/satkit";

function IntelStat({ v, l, delta, dir }: { v: string; l: string; delta?: string; dir?: string }) {
  return (
    <div className="statpill grow" style={{ minWidth: 150 }}>
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="v tnum">{v}</div>
        {dir && <span className={"delta " + dir}>{dir === "up" ? "▲" : "▼"}</span>}
      </div>
      <div className="l">{l}</div>
      {delta && <div className={"delta " + (dir || "")} style={{ marginTop: 8, color: dir ? undefined : "var(--slate)" }}>{delta}</div>}
    </div>
  );
}

export default function AreaPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const hours = [4, 5, 7, 11, 18, 26, 30, 28, 24, 20, 22, 27, 31, 29, 25, 23, 28, 33, 30, 21, 14, 9, 6, 4];
  const origins: [string, number, string][] = [
    ["Hittin · Al Malqa", 34, ""], ["KAFD corridor", 27, ""], ["Diplomatic Quarter", 19, "h2"],
    ["Al Wurud · Sulimaniyah", 12, "h2"], ["Outside Riyadh", 8, "h2"],
  ];
  const ages: [string, number, string][] = [["25–34", 34, "var(--azure)"], ["35–44", 28, "var(--harbor)"], ["45–54", 16, "var(--azure-l)"], ["18–24", 12, "#B9C6E8"], ["55+", 10, "#D7DDE5"]];
  const mix: [string, number][] = [["Corporate office", 41], ["Banking & finance", 22], ["F&B", 19], ["Retail", 11], ["Medical", 7]];
  let acc = 0;
  const stops = ages.map((a) => { const s = `${a[2]} ${acc}% ${acc + a[1]}%`; acc += a[1]; return s; }).join(",");
  const comp: [string, string][] = [["44%", "34%"], ["62%", "40%"], ["58%", "62%"], ["40%", "60%"], ["68%", "52%"]];
  return (
    <div style={{ background: "var(--cool)" }}>
      <div style={{ maxWidth: 1360, margin: "0 auto" }}>
        <div className="row between wrap" style={{ padding: "24px 24px 20px", alignItems: "flex-end", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 16 }}>
          <div>
            <div className="eyebrow">Location Intelligence · Q1 2026</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.02em", margin: "10px 0 0" }}>Al Olaya trade area</h1>
            <div className="muted" style={{ fontSize: 13.5, marginTop: 6 }}>Footfall, catchment &amp; co-tenancy · mobility-panel + transaction sourced</div>
          </div>
          <div className="row gap10 wrap">
            <span className="chip">Drive-time 10 min <Icon.chevd size={14} /></span>
            <span className="chip">Weekday <Icon.chevd size={14} /></span>
            <span className="btn secondary"><Icon.download size={15} /> Export</span>
            <span className="btn primary"><Icon.spark size={15} /> Ask AI</span>
          </div>
        </div>

        <div className="intel-2" style={{ padding: "24px 24px 0" }}>
          <div className="card" style={{ overflow: "hidden", boxShadow: "var(--sh-1)" }}>
            <div className="map" style={{ height: 372 }}>
              <div className="road" style={{ left: 0, right: 0, top: "46%", height: 8 }} />
              <div className="road" style={{ top: 0, bottom: 0, left: "52%", width: 7 }} />
              <div className="road" style={{ top: 0, bottom: 0, left: "24%", width: 4 }} />
              <div className="iso r3" style={{ left: "52%", top: "50%", width: 330, height: 300 }} />
              <div className="iso r2" style={{ left: "52%", top: "50%", width: 220, height: 200 }} />
              <div className="iso r1" style={{ left: "52%", top: "50%", width: 116, height: 108 }} />
              <div className="isodot" style={{ left: "52%", top: "50%" }} />
              <MarkPin featured price="Subject" style={{ left: "52%", top: "50%" }} />
              {comp.map((p, i) => (
                <span key={i} style={{ position: "absolute", left: p[0], top: p[1], width: 9, height: 9, borderRadius: "50%", background: "var(--harbor)", transform: "translate(-50%,-50%)", boxShadow: "0 0 0 3px rgba(58,110,165,.18)" }} />
              ))}
              <div className="card" style={{ position: "absolute", left: 16, bottom: 16, padding: "11px 14px", boxShadow: "var(--sh-2)" }}>
                <div className="row gap16">
                  <span className="lgd"><span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(46,95,224,.35)", border: "1.5px solid rgba(46,95,224,.55)", display: "inline-block" }} /> Trade area</span>
                  <span className="lgd"><span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--harbor)", display: "inline-block" }} /> Comparable occupiers</span>
                </div>
              </div>
              <div className="tag" style={{ position: "absolute", right: 16, top: 16 }}>5 / 10 / 15 min drive-time</div>
            </div>
          </div>

          <div className="col gap16">
            <div className="row gap16 wrap"><IntelStat v="412k" l="Daytime population" delta="+18% vs district avg" dir="up" /><IntelStat v="168k" l="Resident population" delta="within 10-min" /></div>
            <div className="row gap16 wrap"><IntelStat v="138" l="Footfall index (city = 100)" delta="+6 QoQ" dir="up" /><IntelStat v="47 min" l="Median dwell time" delta="+4 min YoY" dir="up" /></div>
            <div className="row gap16 wrap"><IntelStat v="3.2×" l="Visit frequency / month" delta="repeat visitors 58%" /><IntelStat v="124" l="Median income index" delta="top-quartile catchment" dir="up" /></div>
          </div>
        </div>

        <div className="intel-2" style={{ padding: "20px 24px 0" }}>
          <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
            <div className="row between">
              <div><div style={{ fontSize: 15, fontWeight: 700 }}>Footfall rhythm — weekday</div><div className="muted" style={{ fontSize: 12.5 }}>Hourly index · peaks 12–14h &amp; 18–19h</div></div>
              <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>Olaya</span>
            </div>
            <div className="hours" style={{ height: 150, marginTop: 20, gap: 4 }}>
              {hours.map((h, i) => <div key={i} className={"h" + (h >= 30 ? " pk" : "")} style={{ height: (h / 33 * 100) + "%" }} />)}
            </div>
            <div className="row between mono muted" style={{ fontSize: 10, marginTop: 8 }}>
              <span>00</span><span>06</span><span>09</span><span>12</span><span>15</span><span>18</span><span>21</span><span>23</span>
            </div>
          </div>

          <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Where the catchment comes from</div>
            <div className="muted" style={{ fontSize: 12.5 }}>Home-origin of daytime visitors</div>
            <div className="col gap14" style={{ marginTop: 18 }}>
              {origins.map((o, i) => (
                <div key={i} className="hrow"><span className="nm">{o[0]}</span><span className="hbar"><i className={o[2]} style={{ width: o[1] + "%" }} /></span><span className="pc">{o[1]}%</span></div>
              ))}
            </div>
          </div>
        </div>

        <div className="intel-11" style={{ padding: "20px 24px 40px" }}>
          <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Catchment age mix</div>
            <div className="muted" style={{ fontSize: 12.5 }}>Daytime visitors · skews working-age professional</div>
            <div className="row gap24 wrap" style={{ marginTop: 18, alignItems: "center" }}>
              <div className="donut" style={{ width: 132, height: 132, background: `conic-gradient(${stops})` }}>
                <div className="hole"><span className="mono" style={{ fontSize: 18, fontWeight: 500 }}>62%</span><span style={{ fontSize: 10, color: "var(--slate)" }}>aged 25–44</span></div>
              </div>
              <div className="col gap10 grow">
                {ages.map((a, i) => (
                  <div key={i} className="row between" style={{ fontSize: 12.5 }}>
                    <span className="row gap8"><span style={{ width: 10, height: 10, borderRadius: 3, background: a[2], display: "inline-block" }} /> {a[0]}</span>
                    <span className="mono muted">{a[1]}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
            <div className="row between">
              <div><div style={{ fontSize: 15, fontWeight: 700 }}>Co-tenancy mix in trade area</div><div className="muted" style={{ fontSize: 12.5 }}>Verified occupiers within 10-min drive</div></div>
              <span className="muted2"><Icon.store size={18} /></span>
            </div>
            <div className="col gap14" style={{ marginTop: 18 }}>
              {mix.map((m, i) => (
                <div key={i} className="hrow"><span className="nm" style={{ width: 150 }}>{m[0]}</span><span className="hbar"><i style={{ width: m[1] + "%" }} /></span><span className="pc">{m[1]}%</span></div>
              ))}
            </div>
            <div className="row gap10" style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--silver)" }}>
              <span style={{ color: "var(--harbor)" }}><Icon.check size={15} /></span>
              <span className="muted" style={{ fontSize: 12.5 }}>Mobility figures from anonymised panel data; occupier mix from verified SAT listings — every metric is sourced, never modelled.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
