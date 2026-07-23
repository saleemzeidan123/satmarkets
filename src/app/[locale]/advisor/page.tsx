"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Icon, Logo } from "@/components/satkit";
import { assetLabel } from "@/lib/labels";
import { useAdvisorChat } from "@/lib/useAdvisorChat";
import { formatPeriod } from "@/lib/market/period";
import { spaceTypeLabel, rentUnitLabel, rateBasisLabel, pickSegment, validBand, analyseDeal, num } from "@/lib/market/analyser";
import { getDictionary } from "@/i18n/getDictionary";

// Mirrors PublicIndexSegment from /api/index/segments: the figure arrives as
// `average` (it is an arithmetic average from the REGA source, never a median).
type SegRow = { district_label: string; district_label_ar: string | null; district_id: string | null; asset_type: string; segment: string; band_low: string; band_high: string; average: string; unit: string; period: string; source: string };

const XIcon = ({ size = 16 }: { size?: number }) => (
 <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
);

export default function AdvisorPage({ params }: { params: { locale: string } }) {
 const locale = (params.locale === "ar" ? "ar" : "en") as "en"|"ar";
 const ar = locale === "ar";
 const av = getDictionary(locale).advisor;
 const { msgs, setMsgs, busy, send, reset } = useAdvisorChat(locale, "sat_advisor_page");
 const [input, setInput] = useState("");
 const [tool, setTool] = useState<null | "value">(null);
 const [segs, setSegs] = useState<SegRow[] | null>(null);
 // No implicit space type on entry: the user must choose one (or a valid page
 // context supplies it). API row order must never become the user's intent.
 const [segKey, setSegKey] = useState("");
 const [segLoc, setSegLoc] = useState("");
 const [rent, setRent] = useState("");
 const [size, setSize] = useState("");
 const scrollRef = useRef<HTMLDivElement>(null);
 const inputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
  if (tool !== "value" || segs) return;
  fetch("/api/index/segments").then((r) => r.json()).then((d) => setSegs(d.segments || [])).catch(() => setSegs([]));
 }, [tool, segs]);

 // Keep a still-valid previous selection, but never auto-pick a segment as
 // implicit intent: if the current choice is not among the loaded options,
 // clear it back to "choose a type" rather than snapping to the first row.
 useEffect(() => {
  if (!segs || !segs.length || !segKey) return;
  const opts = Array.from(new Set(segs.map((s) => `${s.asset_type}|${s.segment}`)));
  setSegKey((prev) => pickSegment(opts, prev));
 }, [segs, segKey]);

 const JOBS = ar ? [
  { icon: <Icon.search size={18} />, label: "ابحث عن مساحة", sub: "صِف ما تحتاجه بكلماتك وسأبحث في العروض الموثّقة", prefill: "مكتب فئة A مجهّز في غرناطة، نحو 300 م²، بأقل من 1,600 ريال/م²", tool: null },
  { icon: <Icon.spark size={18} />, label: "اكتب إعلاناً", sub: "أعطني تفاصيل مساحتك وأكتب الإعلان كاملاً", prefill: "اكتب إعلاناً لمساحتي: [النوع]، [الموقع]، [المساحة] م²، [مجهّزة أو هيكل]", tool: null },
  { icon: <Icon.chart size={18} />, label: "حلّل صفقة أو عقد إيجار", sub: "أدخل أرقام صفقتك وأقيسها على النطاقات الاسترشادية التجريبية", prefill: "", tool: "value" as const },
  { icon: <Icon.target size={18} />, label: "راقب السوق", sub: "تنبيه دائم عند تحرّك المؤشر", prefill: "نبّهني عندما تتحرك إيجارات المكاتب في [الموقع] أكثر من 3%", tool: null },
 ] : [
  { icon: <Icon.search size={18} />, label: "Find a space", sub: "Describe what you need in your own words, I search verified stock", prefill: "Fitted Grade A office in Granada, around 300 m², under 1,600 SAR/m²", tool: null },
  { icon: <Icon.spark size={18} />, label: "Draft a listing", sub: "Give me your space's details and I write the whole listing", prefill: "Draft a listing for my space: [type], [location], [size] m², [fitted or shell]", tool: null },
  { icon: <Icon.chart size={18} />, label: "Analyse a deal or lease", sub: "Enter your deal's numbers, I grade them against the sample indicative ranges", prefill: "", tool: "value" as const },
  { icon: <Icon.target size={18} />, label: "Watch the market", sub: "A standing alert when the index moves", prefill: "Alert me when office rents in [location] move more than 3%", tool: null },
 ];

 const CHIPS = ar
  ? ["سعّر مكتب فئة A في العليا", "ما النطاق الاسترشادي في كافد؟", "هل 1,600 ريال/م² عادل لمكاتب غرناطة؟", "راقب مكاتب كافد فئة A"]
  : ["Price a Grade A office in Al Olaya", "What's within band in KAFD?", "Is 1,600 SAR/m² fair for Granada offices?", "Watch KAFD Grade A offices"];

 useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }); }, [msgs, busy, tool]);

 function pickJob(j: (typeof JOBS)[number]) {
  if (j.tool === "value") { setTool("value"); return; }
  setTool(null);
  setInput(j.prefill);
  inputRef.current?.focus();
 }

 const segOptions = segs ? Array.from(new Set(segs.map((s) => `${s.asset_type}|${s.segment}`))) : [];
 const locOptions = segs && segKey ? segs.filter((s) => `${s.asset_type}|${s.segment}` === segKey) : [];
 const activeRow = locOptions.find((s) => s.district_label === segLoc) || locOptions[0] || null;
 const activeBand = activeRow ? validBand({ band_low: activeRow.band_low, band_high: activeRow.band_high, average: activeRow.average }) : null;
 const rateValid = num(rent.replace(/[,\s]/g, "")) !== null && Number(rent.replace(/[,\s]/g, "")) > 0;

 function analyse() {
  if (!activeRow) return;
  const locL = ar ? (activeRow.district_label_ar || activeRow.district_label) : activeRow.district_label;
  const res = analyseDeal({
   rate: rent.replace(/[,\s]/g, ""),
   size: size.replace(/[,\s]/g, ""),
   band: { band_low: activeRow.band_low, band_high: activeRow.band_high, average: activeRow.average },
   unit: activeRow.unit,
   assetType: activeRow.asset_type,
   segment: activeRow.segment,
   locationLabel: locL,
   period: activeRow.period,
   ar,
  });
  if (!res) return;
  setMsgs((m) => [...m, { role: "a", text: res.text, band: { low: res.band.low, average: res.band.average, high: res.band.high, unit: activeRow.unit }, quoted: res.quoted, handoffDistrict: activeRow.district_id || null, handoffAsset: activeRow.asset_type || null, handoffLabel: locL }]);
 }

 const started = msgs.length > 0;

 return (
  <div className="dash">
   <aside className="dside advisor-rail-l" style={{ background: "var(--paper)", color: "var(--ink)", borderRight: "1px solid var(--silver)" }}>
    <div className="brand" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
     <Link href={`/${locale}`} aria-label="Home"><Logo size={26} /></Link>
     <button className="btn primary sm" onClick={() => { reset(); setTool(null); }}><Icon.plus size={14} /> {av.newBadge}</button>
    </div>
    <div className="dnav" style={{ gap: 4, marginTop: 10 }}>
     <div className="eyebrow" style={{ padding: "4px 12px" }}>{av.whatICanDo}</div>
     {JOBS.map((j, i) => (
      <button key={i} onClick={() => pickJob(j)} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, color: "var(--ink)", background: "transparent", border: "none", textAlign: ar ? "right" : "left", padding: "9px 12px", borderRadius: 9, cursor: "pointer", width: "100%" }}>
       <span style={{ fontSize: "var(--fs-sm)", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><span style={{ color: "var(--harbor)" }}>{j.icon}</span>{j.label}</span>
       <span className="mono" style={{ fontSize: "var(--fs-3xs)", color: "var(--slate-2)" }}>{j.sub}</span>
      </button>
     ))}
    </div>
   </aside>

   <div className="dmain" style={{ display: "flex", flexDirection: "column" }}>
    <div className="dtopbar" style={{ gap: 10 }}>
     <Link href={`/${locale}`} aria-label={av.backHome} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 9, border: "1px solid var(--silver)", color: "var(--ink)", background: "#fff", flex: "none", textDecoration: "none" }}><span style={{ display: "inline-flex", transform: ar ? undefined : "scaleX(-1)" }}><Icon.arrow size={16} /></span></Link>
     <span style={{ color: "var(--harbor)" }}><Icon.spark size={20} /></span>
     <div style={{ minWidth: 0 }}><h1>{av.title}</h1><div className="sub adv-desk">{av.subtitle}</div></div>
     <span style={{ flex: 1 }} />
     <button className="btn ghost sm adv-mob" onClick={() => { reset(); setTool(null); }} style={{ flex: "none" }}><Icon.plus size={14} /> {av.newBadge}</button>
     <span className="tag adv-desk">{av.beta}</span>
    </div>

    <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "26px 24px", background: "var(--cool)" }}>
     <div style={{ maxWidth: 760, margin: "0 auto" }} className="col gap18">
      {!started && tool !== "value" && (
       <div>
        <div className="eyebrow">{av.welcome}</div>
        <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", margin: "8px 0 4px" }}>{av.welcomeTitle}</h2>
        <p className="muted" style={{ fontSize: "var(--fs-base)", margin: "0 0 18px" }}>{av.welcomeSub}</p>
        <div className="adv-jobs-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
         {JOBS.map((j, i) => (
          <button key={i} onClick={() => pickJob(j)} className="card pad lift" style={{ textAlign: ar ? "right" : "left", cursor: "pointer", border: "1px solid var(--silver)", background: "#fff" }}>
           <span style={{ color: "var(--harbor)", display: "inline-flex", width: 34, height: 34, borderRadius: 9, background: "var(--azure-wash)", alignItems: "center", justifyContent: "center" }}>{j.icon}</span>
           <div style={{ fontSize: "var(--fs-md)", fontWeight: 700, margin: "12px 0 3px" }}>{j.label}</div>
           <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>{j.sub}</div>
          </button>
         ))}
        </div>
       </div>
      )}

      {msgs.map((m, i) => m.role === "u" ? (
       <div key={i} className="chatmsg u" style={{ alignSelf: "flex-end" }}>{m.text}</div>
      ) : (
       <div key={i} className="chatmsg a">
        <div className="row gap8" style={{ marginBottom: m.results?.length ? 10 : 0 }}><span style={{ color: "var(--harbor)" }}><Icon.spark size={16} /></span><span style={{ fontWeight: 500 }}>{m.text}</span></div>
        {m.band && (() => {
         // Validate through the shared guard: rejects missing, null, empty, NaN,
         // Infinity and out-of-order (low>average>high) values, and also accepts
         // an older stored shape (band.median). Invalid state renders nothing
         // rather than a false zero (PKG-0B, Codex correction 4).
         const vb = validBand(m.band);
         if (!vb) return null;
         const b: any = m.band; const q0raw = m.quoted ?? null;
         const lo = vb.low, hi = vb.high, avg = vb.average;
         const q0 = num(q0raw);
         const mn0 = Math.min(lo, q0 ?? lo), mx0 = Math.max(hi, q0 ?? hi);
         const pad = ((mx0 - mn0) || 1) * 0.12; const mn = mn0 - pad, mx = mx0 + pad; const sp = (mx - mn) || 1;
         const pc = (v: number) => `${((v - mn) / sp) * 100}%`;
         const st = q0 == null ? null : q0 < lo ? "below" : q0 > hi ? "above" : "within";
         const col = st === "below" ? "#1B7A50" : st === "above" ? "#8A5A1F" : "#3A6EA5";
         const unitL = rentUnitLabel(b.unit, ar);
         const fmt = (n: number) => n.toLocaleString("en-US");
         return (
          <div style={{ margin: "10px 0 2px" }}>
           <div style={{ position: "relative", height: 8, borderRadius: 999, background: "var(--silver)" }}>
            <div style={{ position: "absolute", top: 0, bottom: 0, left: pc(lo), width: `calc(${pc(hi)} - ${pc(lo)})`, background: "var(--azure-wash)", borderRadius: 999 }} />
            <div style={{ position: "absolute", top: -3, bottom: -3, left: pc(avg), width: 2, background: "var(--harbor)" }} />
            {q0 != null && <div style={{ position: "absolute", top: -5, bottom: -5, left: pc(q0), width: 3, marginInlineStart: -1, background: col, borderRadius: 2 }} />}
           </div>
           <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--slate)", marginTop: 6 }}>
            <span>{fmt(lo)}</span><span>{(av.averageLabel) + fmt(avg) + (unitL ? " · " + unitL : "")}</span><span>{fmt(hi)}</span>
           </div>
           {q0 != null && <div style={{ fontSize: "var(--fs-2xs)", fontWeight: 600, color: col, marginTop: 4 }}>{(av.yourRate) + fmt(q0)}</div>}
          </div>
         );
        })()}
        {m.handoffDistrict && (
         <Link href={`/${locale}/listings?district=${m.handoffDistrict}${m.handoffAsset ? `&asset=${m.handoffAsset}` : ""}`} className="row gap8" style={{ marginTop: 10, textDecoration: "none", color: "var(--harbor)", fontSize: 12.5, fontWeight: 600 }}>
          <Icon.search size={14} />{ar ? `اعرض العروض الموثّقة في ${m.handoffLabel || ""}` : `See verified listings in ${m.handoffLabel || "this district"}`}
         </Link>
        )}
        {m.results && m.results.length > 0 && (
         <div className="col gap10">
          {m.results.slice(0, 4).map((l) => {
           const title = (locale === "ar" ? l.title_ar : l.title_en) || l.reference_code;
           const dn = l.districts ? (locale === "ar" ? l.districts.name_ar : l.districts.name_en) : "";
           const price = l.asking_rent_sqm ?? l.sale_price ?? 0;
           return (
            <Link key={l.id} href={`/${locale}/listings/${l.id}`} className="row gap12" style={{ background: "#fff", border: "1px solid var(--silver)", borderRadius: 11, padding: 10, textDecoration: "none", color: "inherit" }}>
             <span style={{ width: 42, height: 42, borderRadius: 8, flex: "none", background: "var(--azure-wash)", color: "var(--azure-d)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon.pin size={17} /></span>
             <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</div><div className="mono muted" style={{ fontSize: "var(--fs-2xs)", marginTop: 3 }}>{assetLabel(l.asset_type, locale)} · {l.area_sqm} m²{dn ? " · " + dn : ""}</div></div>
             <div style={{ textAlign: ar ? "left" : "right" }}><div className="mono" style={{ fontSize: "var(--fs-md)", fontWeight: 500 }}>{price ? price.toLocaleString("en-US") : (av.na)}</div><div className="muted" style={{ fontSize: 10.5 }}>{l.asking_rent_sqm ? (av.unitSqmYr) : (av.sar)}</div></div>
            </Link>
           );
          })}
          {m.note && <div className="src">{m.note}</div>}
         </div>
        )}
       </div>
      ))}

      {tool === "value" && (
       <div className="chatmsg a" style={{ maxWidth: 640 }}>
        <div className="row gap8" style={{ marginBottom: 12 }}><span style={{ color: "var(--harbor)" }}><Icon.chart size={16} /></span><span style={{ fontWeight: 600 }}>{av.analyserTitle}</span>
         <span style={{ flex: 1 }} />
         <button onClick={() => setTool(null)} aria-label={av.closeAnalyser} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--slate)", display: "inline-flex", padding: 2 }}><XIcon size={15} /></button>
        </div>
        {!segs && <div className="muted" style={{ fontSize: "var(--fs-sm)" }}>{av.loadingBands}</div>}
        {segs && segs.length === 0 && <div className="muted" style={{ fontSize: "var(--fs-sm)" }}>{av.noBands}</div>}
        {segs && segs.length > 0 && (
         <div className="col gap10">
          <label className="col gap4" style={{ fontSize: 12.5, fontWeight: 600 }}>{av.spaceType}
           <select className="input" value={segKey} onChange={(e) => { setSegKey(e.target.value); setSegLoc(""); }} style={{ fontFamily: "var(--sans)" }}>
            <option value="">{av.chooseType}</option>
            {segOptions.map((k) => { const [a, seg] = k.split("|"); return <option key={k} value={k}>{spaceTypeLabel(a, seg, ar)}</option>; })}
           </select>
          </label>
          {segKey && <label className="col gap4" style={{ fontSize: 12.5, fontWeight: 600 }}>{av.locationLabel}
           <select className="input" value={activeRow ? activeRow.district_label : ""} onChange={(e) => setSegLoc(e.target.value)} style={{ fontFamily: "var(--sans)" }}>
            {locOptions.map((s) => <option key={s.district_label} value={s.district_label}>{ar ? (s.district_label_ar || s.district_label) : s.district_label}</option>)}
           </select>
          </label>}
          {activeRow && <>
          <div className="row gap10 wrap">
           <label className="col gap4 grow" style={{ fontSize: 12.5, fontWeight: 600, minWidth: 170 }}>{rateBasisLabel(activeRow.unit, ar)}
            <input className="input" inputMode="decimal" value={rent} onChange={(e) => setRent(e.target.value)} placeholder={activeBand ? activeBand.average.toLocaleString("en-US") : ""} />
           </label>
           <label className="col gap4 grow" style={{ fontSize: 12.5, fontWeight: 600, minWidth: 130 }}>{av.sizeLabel}
            <input className="input" inputMode="decimal" value={size} onChange={(e) => setSize(e.target.value)} placeholder="300" />
           </label>
          </div>
          {activeBand && <div className="mono muted" style={{ fontSize: "var(--fs-2xs)" }}>{ar ? `نطاق استرشادي تجريبي (بيانات اختبار): ${activeBand.low.toLocaleString("en-US")} إلى ${activeBand.high.toLocaleString("en-US")} ${rentUnitLabel(activeRow.unit, true)}. متوسط مؤشر الإيجارات (إيجار) ${activeBand.average.toLocaleString("en-US")}، ${formatPeriod(activeRow.period, true)}.` : `Sample indicative range (test data): ${activeBand.low.toLocaleString("en-US")} to ${activeBand.high.toLocaleString("en-US")} ${rentUnitLabel(activeRow.unit, false)}. Rent Index (Ejar) average ${activeBand.average.toLocaleString("en-US")}, ${formatPeriod(activeRow.period, false)}.`}</div>}
          <div className="row gap8">
           <button className="btn primary sm" onClick={analyse} disabled={!activeBand || !rateValid}>{av.analyse}</button>
          </div>
          </>}
          <div className="muted" style={{ fontSize: "var(--fs-2xs)" }}>{av.analyserNote}</div>
         </div>
        )}
       </div>
      )}

      {busy && (
       <div className="chatmsg a"><div className="row gap8"><span style={{ color: "var(--harbor)" }}><Icon.spark size={16} /></span><span className="muted">{av.searching}</span></div></div>
      )}
     </div>
    </div>

    <div style={{ padding: "14px 24px 20px", background: "var(--paper)", borderTop: "1px solid var(--silver)" }}>
     <div style={{ maxWidth: 760, margin: "0 auto" }}>
      {!busy && (
       <div style={{ marginBottom: 10 }}>
        <div className="muted" style={{ fontSize: "var(--fs-2xs)", margin: "0 2px 7px" }}>{started ? (av.keepExploring) : (av.tryAsking)}</div>
        <div className="row gap8 wrap">
         {CHIPS.map((p, i) => <button key={i} className="chip" style={{ cursor: "pointer", border: "1px solid var(--silver)", background: "#fff" }} onClick={() => { setTool(null); send(p); }}>{p}</button>)}
        </div>
       </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); const t = input; setInput(""); send(t); }} className="search focus" style={{ boxShadow: "0 4px 16px rgba(20,24,27,.06)", border: "1px solid var(--azure)", borderRadius: 999, padding: "8px 10px 8px 18px", display: "flex", alignItems: "center", gap: 8 }}>
       <span style={{ color: "var(--harbor)" }}><Icon.spark size={18} /></span>
       <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder={av.inputPh} style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "var(--fs-base)", color: "var(--ink)", textAlign: ar ? "right" : "left" }} />
       <button type="submit" className="btn primary sm" disabled={busy} aria-label={av.send}><Icon.send size={15} /></button>
      </form>
      <p className="muted" style={{ fontSize: "var(--fs-2xs)", margin: "8px 2px 0" }}>{av.groundedNote}</p>
     </div>
    </div>
   </div>

   <aside className="advisor-rail-r" style={{ background: "var(--paper)", borderLeft: "1px solid var(--silver)", overflowY: "auto" }}>
    <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--silver)" }}><div className="eyebrow">{av.marketSnapshot}</div></div>
    <div style={{ padding: 20 }} className="col gap16">
     <div className="card pad" style={{ boxShadow: "none", background: "var(--cool)" }}>
      <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.65 }}>
       {ar
        ? "تُستمد أرقام المؤشر من المؤشر الإيجاري (إيجار): متوسط العقود المسجّلة. اسأل عن حيّ ونوع أصل وسيعرض المستشار النطاق مع مصدره."
        : "Index figures come from the REGA Rental Index (Ejar): averages of registered rental contracts. Ask about a district and an asset type and the Advisor will show the band with its source."}
      </div>
     </div>
     <div className="card pad" style={{ boxShadow: "none", background: "var(--cool)" }}>
      <div className="eyebrow">{av.sourcesUsed}</div>
      <div className="col gap8" style={{ marginTop: 10 }}>
       {[[<Icon.chart key="a" size={14} />, av.sourceRentIndex], [<Icon.shield key="b" size={14} />, av.sourceRega], [<Icon.target key="c" size={14} />, av.sourceListings]].map((s, i) => (
        <div key={i} className="row gap8" style={{ fontSize: "var(--fs-xs)" }}><span style={{ color: "var(--harbor)" }}>{s[0]}</span>{s[1]}</div>
       ))}
      </div>
     </div>
    </div>
   </aside>
  </div>
 );
}
