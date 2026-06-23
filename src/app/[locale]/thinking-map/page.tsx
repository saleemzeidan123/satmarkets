"use client";
import { useState, useRef, useEffect } from "react";

type Pin = { id: number; x: number; y: number; p: number; t: string; d: string; a: string; k: string; feat?: boolean; muted?: boolean; match: number };

const PINS: Pin[] = [
  { id: 0, x: 38, y: 33, p: 1450, t: "Grade A Floor, Olaya Tower", d: "Al Olaya", a: "320 m²", k: "office", feat: true, match: 96 },
  { id: 1, x: 64, y: 25, p: 2100, t: "Flagship Retail, Tahlia", d: "Tahlia", a: "180 m²", k: "retail", match: 88 },
  { id: 2, x: 27, y: 60, p: 1180, t: "Fitted Floor, KAFD", d: "KAFD", a: "540 m²", k: "office", match: 91 },
  { id: 3, x: 73, y: 64, p: 640, t: "Logistics Warehouse", d: "2nd Industrial", a: "2,400 m²", k: "warehouse", muted: true, match: 54 },
  { id: 4, x: 52, y: 46, p: 1690, t: "Mixed-use Corner, Hittin", d: "Hittin", a: "410 m²", k: "office", match: 79 },
  { id: 5, x: 46, y: 74, p: 980, t: "Showroom, Khurais Rd", d: "Khurais", a: "260 m²", k: "retail", match: 72 },
  { id: 6, x: 58, y: 38, p: 2400, t: "Serviced Suite, Olaya", d: "Al Olaya", a: "90 m²", k: "office", match: 83 },
];
const MEDIAN = 1420;

function Mk({ base = "#14181B", lit = "#3A6EA5" }: { base?: string; lit?: string }) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: "block" }}>
      <rect x="8" y="8" width="34" height="48" rx="6" fill={base} /><rect x="46" y="8" width="46" height="48" rx="6" fill={lit} />
      <rect x="8" y="60" width="34" height="32" rx="6" fill={base} /><rect x="46" y="60" width="46" height="32" rx="6" fill={base} />
    </svg>
  );
}

export default function ThinkingMapPage() {
  const [mode, setMode] = useState<"pins" | "heat" | "reach">("pins");
  const [hour, setHour] = useState(13);
  const [drawing, setDrawing] = useState(false);
  const [zone, setZone] = useState<{ x: number; y: number; r: number } | null>(null);
  const [sel, setSel] = useState<Pin | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [shortlist, setShortlist] = useState<Pin[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const hours = [6, 7, 10, 16, 28, 40, 52, 58, 54, 46, 42, 50, 66, 72, 64, 55, 60, 74, 82, 70, 48, 30, 18, 10];
  const ff = hours[hour];
  const heat = [[34, 34, 150], [60, 28, 124], [50, 52, 176], [70, 60, 112], [26, 62, 96], [48, 20, 90], [58, 40, 120]];

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setHour((h) => (h + 1) % 24), 380);
    return () => clearInterval(id);
  }, [playing]);

  function pt(e: React.MouseEvent) { const r = mapRef.current!.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 100 }; }
  function onDown(e: React.MouseEvent) { if (!drawing) return; dragRef.current = pt(e); setZone({ ...dragRef.current, r: 0 }); }
  function onMove(e: React.MouseEvent) { if (!drawing || !dragRef.current) return; const m = pt(e); setZone({ x: dragRef.current.x, y: dragRef.current.y, r: Math.hypot(m.x - dragRef.current.x, m.y - dragRef.current.y) }); }
  function onUp() { if (drawing) { dragRef.current = null; setDrawing(false); } }
  const inZone = zone ? PINS.filter((p) => Math.hypot(p.x - zone.x, p.y - zone.y) <= zone.r) : [];

  function toggleShort(p: Pin) { setShortlist((s) => s.find((x) => x.id === p.id) ? s.filter((x) => x.id !== p.id) : [...s, p]); }
  const inShort = (id: number) => shortlist.some((x) => x.id === id);

  return (
    <div className="poc">
      <div className="pbar">
        <span className="eyebrow">POC · The Thinking Map</span>
        <div className="seg" style={{ marginLeft: 8 }}>
          <button className={mode === "pins" ? "on" : ""} onClick={() => setMode("pins")}>Listings</button>
          <button className={mode === "heat" ? "on" : ""} onClick={() => setMode("heat")}>Footfall heat</button>
          <button className={mode === "reach" ? "on" : ""} onClick={() => setMode("reach")}>Catchment</button>
        </div>
        <span className="grow" />
        <button className={"chip" + (drawing ? " on" : "")} onClick={() => { setDrawing((d) => !d); setZone(null); }}>✎ Draw a zone</button>
        <button className="btn ghost sm" onClick={() => { setZone(null); setSel(null); setShortlist([]); }}>Reset</button>
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div ref={mapRef} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          style={{ flex: 1, position: "relative", overflow: "hidden", cursor: drawing ? "crosshair" : "default", background: "#e8edf2" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#dfe5ec 1px,transparent 1px),linear-gradient(90deg,#dfe5ec 1px,transparent 1px)", backgroundSize: "46px 46px", opacity: .6 }} />
          <div style={{ position: "absolute", left: "6%", top: "74%", width: 130, height: 90, background: "#dbe7dc", borderRadius: "46% 54% 50% 50%", opacity: .8 }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: "40%", height: 12, background: "#fff", boxShadow: "0 0 0 1px #dde3ea" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: "70%", height: 7, background: "#fff", boxShadow: "0 0 0 1px #e1e7ee" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "44%", width: 10, background: "#fff", boxShadow: "0 0 0 1px #dde3ea" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "72%", width: 6, background: "#fff", boxShadow: "0 0 0 1px #e1e7ee" }} />
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}><line x1="0" y1="88%" x2="100%" y2="14%" stroke="#b8b0d8" strokeWidth="2.5" strokeDasharray="7 5" /></svg>
          {[["Al Olaya", "13%", "15%"], ["Tahlia", "60%", "11%"], ["KAFD", "17%", "52%"], ["Hittin", "50%", "58%"]].map((d, i) => (
            <div key={i} className="mono" style={{ position: "absolute", left: d[1], top: d[2], fontSize: 10, color: "#9aa3ae", letterSpacing: ".1em", textTransform: "uppercase", pointerEvents: "none" }}>{d[0]}</div>
          ))}

          <div className="rise" style={{ position: "absolute", left: 18, top: 18, right: 18, zIndex: 15, display: "flex", justifyContent: "center" }}>
            <div style={{ width: "min(620px,100%)", background: "var(--paper)", borderRadius: 13, boxShadow: "var(--z2)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "var(--harbor)", fontSize: 16 }}>✦</span>
              <span style={{ flex: 1, fontSize: 13.5, color: "var(--ink)" }}>Fitted Grade A office in Al Olaya under 1,600, near metro</span>
              <span style={{ display: "flex", gap: 5 }}>
                {["Office", "Olaya", "≤1,600"].map((c, i) => <span key={i} className="mono" style={{ fontSize: 9.5, background: "var(--azure-wash)", color: "var(--azure-d)", border: "1px solid var(--azure-l)", borderRadius: 5, padding: "2px 6px" }}>{c}</span>)}
              </span>
            </div>
          </div>

          {mode === "heat" && heat.map((h, i) => (
            <div key={i} className="fade" style={{ position: "absolute", left: h[0] + "%", top: h[1] + "%", width: h[2] * (0.5 + ff / 120), height: h[2] * (0.5 + ff / 120), transform: "translate(-50%,-50%)", borderRadius: "50%", pointerEvents: "none", transition: "all .38s var(--ease)", background: `radial-gradient(circle, rgba(216,80,40,${0.12 + ff / 240}) 0%, rgba(216,120,40,${0.07 + ff / 360}) 38%, transparent 70%)` }} />
          ))}

          {mode === "reach" && (
            <div className="fade" style={{ position: "absolute", left: "38%", top: "33%", pointerEvents: "none" }}>
              {[[320, .06, "15 min"], [214, .10, "10 min"], [112, .17, "5 min"]].map((r, i) => (
                <div key={i} style={{ position: "absolute", left: 0, top: 0, width: Number(r[0]), height: Number(r[0]) * 0.92, transform: "translate(-50%,-50%)", borderRadius: "50%", border: "1.5px solid rgba(58,110,165,.5)", background: `rgba(58,110,165,${r[1]})`, display: "flex", justifyContent: "center" }}>
                  <span className="mono" style={{ fontSize: 9, color: "var(--azure-d)", marginTop: -1, background: "#fff", padding: "1px 5px", borderRadius: 4, height: 13, transform: "translateY(-50%)" }}>{r[2]}</span>
                </div>
              ))}
              <div style={{ position: "absolute", left: 0, top: 0, width: 320, height: 294, transform: "translate(-50%,-50%)", borderRadius: "50%", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: "conic-gradient(from 0deg, rgba(58,110,165,.28), transparent 60deg)", animation: "spin 3s linear infinite" }} />
              </div>
            </div>
          )}

          {mode !== "heat" && PINS.map((p) => {
            const active = sel && sel.id === p.id, hov = hover === p.id, short = inShort(p.id);
            return (
              <button key={p.id} onClick={() => setSel(p)} onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)} className="pop"
                style={{ position: "absolute", left: p.x + "%", top: p.y + "%", transform: "translate(-50%,-100%)", animationDelay: (p.id * 40) + "ms", zIndex: active || hov ? 9 : p.feat ? 5 : 2, border: "none", background: "none" }}>
                {hov && <div className="cue" style={{ left: "50%", top: -34, transform: "translateX(-50%)" }}>{p.t} · {p.a}</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 11, background: p.feat ? "var(--ink)" : "#fff", color: p.feat ? "#fff" : "var(--ink)", border: "1px solid " + (short ? "var(--azure)" : p.feat ? "var(--ink)" : "var(--silver-2)"), boxShadow: active ? "var(--glow),var(--z2)" : hov ? "var(--z3)" : "var(--z2)", opacity: p.muted ? .72 : 1, transition: "box-shadow .2s,transform .2s var(--spring)", transform: (active || hov) ? "scale(1.09)" : "scale(1)", whiteSpace: "nowrap" }}>
                  <span style={{ width: 14, height: 14 }}><Mk lit={p.feat ? "#fff" : "var(--harbor)"} base={p.feat ? "#4b5d72" : "var(--ink)"} /></span>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>{p.p.toLocaleString()}</span>
                  {short && <span style={{ color: "var(--azure)", fontSize: 11 }}>✓</span>}
                </div>
              </button>
            );
          })}

          {zone && zone.r > 1 && (
            <div style={{ position: "absolute", left: zone.x + "%", top: zone.y + "%", width: zone.r * 2 + "%", height: zone.r * 2 + "%", transform: "translate(-50%,-50%)", borderRadius: "50%", border: "2px dashed var(--azure)", background: "rgba(58,110,165,.07)", pointerEvents: "none" }}>
              <span className="mono" style={{ position: "absolute", left: "50%", top: -12, transform: "translateX(-50%)", fontSize: 10, background: "var(--azure)", color: "#fff", padding: "2px 8px", borderRadius: 5, whiteSpace: "nowrap" }}>{inZone.length} spaces in zone</span>
            </div>
          )}

          <div className="fade" style={{ position: "absolute", right: 18, bottom: 18, background: "var(--paper)", borderRadius: 10, padding: "10px 13px", boxShadow: "var(--z1)", fontSize: 10.5 }}>
            {mode === "pins" && <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--ink)" }} />Featured</span>
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "#fff", border: "1px solid var(--silver-2)" }} />Verified listing</span>
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 14, height: 2, borderTop: "2px dashed #b8b0d8" }} />Metro line</span>
            </div>}
            {mode === "heat" && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="mono muted">low</span><span style={{ width: 70, height: 8, borderRadius: 4, background: "linear-gradient(90deg,rgba(216,120,40,.15),rgba(216,80,40,.8))" }} /><span className="mono muted">high</span></div>}
            {mode === "reach" && <span className="mono muted">Drive-time from Olaya Tower</span>}
          </div>

          {mode !== "pins" && (
            <div className="rise" style={{ position: "absolute", left: 18, bottom: 18, background: "var(--paper)", borderRadius: 12, padding: "12px 16px", boxShadow: "var(--z2)", minWidth: 184 }}>
              <div className="eyebrow">{mode === "heat" ? "Footfall index" : "Catchment · 10 min"}</div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 500, marginTop: 4, color: "var(--ink)" }}>
                {mode === "heat" ? (ff * 5).toLocaleString() : "412k"}
                {mode === "heat" && <span style={{ fontSize: 11, color: "var(--slate)" }}> @ {String(hour).padStart(2, "0")}:00</span>}
              </div>
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{mode === "heat" ? "visits / hr · Al Olaya" : "daytime population"}</div>
            </div>
          )}

          {drawing && <div className="cue" style={{ left: "50%", top: 70, transform: "translateX(-50%)" }}>Drag on the map to draw a catchment zone</div>}
        </div>

        <div className="tmap-side" style={{ width: 300, flex: "none", background: "var(--paper)", borderLeft: "1px solid var(--silver)", padding: 18, overflowY: "auto" }}>
          {sel ? (
            <div className="rise" key={sel.id}>
              <button className="chip" onClick={() => setSel(null)} style={{ marginBottom: 12 }}>← Back</button>
              <div style={{ height: 128, borderRadius: 11, position: "relative", overflow: "hidden", boxShadow: "var(--z1)", background: sel.k === "retail" ? "linear-gradient(165deg,#5b4a44,#8d7560 60%,#c9b6a1)" : sel.k === "warehouse" ? "linear-gradient(165deg,#3a414c,#5a6473 60%,#9aa6b6)" : "linear-gradient(165deg,#33455c,#5d7186 60%,#a9b9cb)" }}>
                <span style={{ position: "absolute", left: 10, top: 10, background: "rgba(255,255,255,.92)", borderRadius: 6, padding: "3px 8px", fontSize: 9.5, fontFamily: "var(--mono)" }}>✓ Verified · {sel.match}% match</span>
                <span className="mono" style={{ position: "absolute", left: 10, bottom: 8, fontSize: 10, color: "rgba(255,255,255,.85)" }}>{sel.d}</span>
              </div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 500, marginTop: 14 }}>{sel.p.toLocaleString()} <span style={{ fontSize: 11, color: "var(--slate)" }}>SAR/m²·yr</span></div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{sel.t}</div>
              <div className="mono muted" style={{ fontSize: 11.5, marginTop: 4 }}>{sel.d} · {sel.a}</div>
              <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 10, background: "var(--cool)" }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>vs Olaya median</div>
                <div style={{ position: "relative", height: 8, borderRadius: 4, background: "var(--silver-2)" }}>
                  <div style={{ position: "absolute", left: "50%", top: -3, bottom: -3, width: 2, background: "var(--slate)" }} />
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 4, background: sel.p >= MEDIAN ? "var(--green)" : "var(--amber)", width: Math.min(100, sel.p / MEDIAN * 50) + "%" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, fontSize: 11 }}>
                  <span className="muted">median {MEDIAN.toLocaleString()}</span>
                  <b style={{ color: sel.p >= MEDIAN ? "var(--green)" : "var(--amber)" }}>{sel.p >= MEDIAN ? "+" : ""}{Math.round((sel.p / MEDIAN - 1) * 100)}%</b>
                </div>
              </div>
              <button className="btn primary" style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>View space →</button>
              <button className="btn ghost" onClick={() => toggleShort(sel)} style={{ width: "100%", justifyContent: "center", marginTop: 8, borderColor: inShort(sel.id) ? "var(--azure)" : "var(--silver-2)", color: inShort(sel.id) ? "var(--azure-d)" : "var(--ink)" }}>{inShort(sel.id) ? "✓ In shortlist" : "+ Add to shortlist"}</button>
            </div>
          ) : (
            <div>
              <div className="eyebrow">The map thinks</div>
              <div style={{ fontSize: 16, fontWeight: 700, margin: "8px 0 12px", letterSpacing: "-.01em" }}>
                {mode === "pins" ? "248 verified spaces" : mode === "heat" ? "Footfall over a day" : "Drive-time catchment"}
              </div>
              <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>
                {mode === "pins" && "Hover a pin for a peek, tap for the space priced against the index. Switch modes, or draw a zone to count supply anywhere."}
                {mode === "heat" && "Scrub the hour below to watch footfall pulse across the district — peaks at lunch and early evening."}
                {mode === "reach" && "5 / 10 / 15-minute drive-time isochrones around Olaya Tower, with live daytime catchment."}
              </p>
              {mode === "pins" && <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                <button className="chip" onClick={() => setMode("heat")}>See footfall heat →</button>
                <button className="chip" onClick={() => setMode("reach")}>See what&rsquo;s reachable →</button>
              </div>}
              {shortlist.length > 0 && <div className="rise" style={{ marginTop: 20 }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}>Shortlist · {shortlist.length}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {shortlist.map((s) => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: 8, border: "1px solid var(--silver)", borderRadius: 9 }}>
                      <span style={{ width: 18, height: 18 }}><Mk /></span>
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.t}</div><div className="mono muted" style={{ fontSize: 10 }}>{s.p.toLocaleString()} · {s.a}</div></div>
                      <button onClick={() => toggleShort(s)} className="muted" style={{ fontSize: 14, background: "none", border: "none", cursor: "pointer" }}>×</button>
                    </div>
                  ))}
                </div>
                {shortlist.length > 1 && <button className="btn primary sm" style={{ width: "100%", justifyContent: "center", marginTop: 10 }}>Compare {shortlist.length} spaces →</button>}
              </div>}
            </div>
          )}
        </div>
      </div>

      {mode === "heat" && (
        <div className="rise" style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 22px", background: "var(--paper)", borderTop: "1px solid var(--silver)" }}>
          <button className="btn primary sm" onClick={() => setPlaying((p) => !p)} style={{ width: 92, justifyContent: "center" }}>{playing ? "❚❚ Pause" : "▶ Play day"}</button>
          <span className="mono" style={{ fontSize: 13, fontWeight: 600, width: 54 }}>{String(hour).padStart(2, "0")}:00</span>
          <div style={{ flex: 1, position: "relative", height: 42, display: "flex", alignItems: "flex-end", gap: 2 }}>
            {hours.map((h, i) => (
              <div key={i} onClick={() => setHour(i)} title={String(i).padStart(2, "0") + ":00"} style={{ flex: 1, height: (h / 82 * 100) + "%", borderRadius: "2px 2px 0 0", cursor: "pointer", background: i === hour ? "var(--azure)" : (h >= 66 ? "#d88050" : "var(--silver-2)"), transition: "background .15s,height .3s var(--ease)" }} />
            ))}
            <input type="range" min={0} max={23} value={hour} onChange={(e) => setHour(+e.target.value)} style={{ position: "absolute", left: 0, right: 0, bottom: -6, width: "100%", accentColor: "var(--azure)" }} />
          </div>
          <span className="mono muted" style={{ fontSize: 11 }}>peak 18:00</span>
        </div>
      )}
    </div>
  );
}
