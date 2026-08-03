import { isLocale } from "@/i18n/config";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/satkit";
import { getDictionary } from "@/i18n/getDictionary";

import SampleBanner from "@/components/SampleBanner";
export default async function DocsPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 if (!isLocale(params.locale)) notFound();
 const ar = params.locale === "ar";
 const d = getDictionary(params.locale).docs;
 const sheets: [string, boolean][] = [
  [d.sheet1, true], [d.sheet2, false], [d.sheet3, false], [d.sheet4, false],
 ];
 const rooms: [string, string, string, string, string][] = [
  [d.roomOpen, "14%", "16%", "44%", "50%"],
  [d.roomMeeting, "60%", "16%", "26%", "24%"],
  [d.roomExec, "60%", "44%", "26%", "22%"],
  [d.roomReception, "14%", "70%", "26%", "16%"],
  [d.roomPantry, "42%", "70%", "18%", "16%"],
  [d.roomServer, "60%", "70%", "12%", "16%"],
 ];
 const details: [string, string][] = [
  [d.dTitle, d.sheet1], [d.dScale, "1:100"], [d.dArea, d.vArea],
  [d.dFormat, "DWG + PDF"], [d.dUpdated, d.vUpdated], [d.dVerifiedBy, d.vVerifiedBy],
 ];
 return (
  <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--cool)" }}>
   <SampleBanner ar={ar} />
   {/* top bar */}
   <div className="row between wrap" style={{ padding: "13px 24px", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 12, flex: "none" }}>
    <div className="row gap12" style={{ alignItems: "center" }}>
     {/* RC13, finding 147. This chevron was a `<span>`: a back control drawn as a
         disc, in the position a reader expects a back control, that could not be
         focused, could not be activated and went nowhere. It was the only thing
         on the page that looked like a way out, and /docs is an APP-tier route,
         so there was no header, no footer and no tab bar behind it either. The
         page had zero links of any kind.

         The hit area is 44px to clear the SAT touch floor while the disc stays
         32px, and the negative margin absorbs the difference so the row's
         layout is unchanged. The chevron is mirrored for English because it
         points back along the reading direction, not left. */}
     <Link href={`/${params.locale}`} aria-label={d.backHome} style={{ width: 44, height: 44, margin: -6, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--ink)", textDecoration: "none", flex: "none" }}>
      <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--cool)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ display: "inline-flex", transform: ar ? "none" : "rotate(180deg)" }}><Icon.chevr size={17} /></span></span>
     </Link>
     <div><h1 style={{ fontSize: "0.9375rem", fontWeight: 700, margin: 0 }}>{d.buildingName}</h1><div className="mono muted" style={{ fontSize: "0.6875rem" }}>{d.plansSub}</div></div>
    </div>
    <div className="row gap8 wrap">
     <span className="ftype"><span className="ext">DWG</span> floor-plate-L18.dwg</span>
     <span className="btn secondary sm"><Icon.download size={14} /> {d.downloadAll}</span>
     <span className="btn secondary sm"><Icon.arrow size={14} /> {d.share}</span>
    </div>
   </div>

   <div className="row" style={{ flex: 1, alignItems: "stretch", minHeight: 0 }}>
    {/* sheet rail */}
    <div className="docs-rail-l" style={{ width: 188, flex: "none", borderRight: "1px solid var(--silver)", background: "var(--paper)", padding: 14, overflowY: "auto" }}>
     <div className="eyebrow" style={{ marginBottom: 12 }}>{d.sheets}</div>
     <div className="col gap10">
      {sheets.map((s, i) => (
       <div key={i} className={"sheetthumb" + (s[1] ? " on" : "")}>
        <div className="mini">
         <div style={{ position: "absolute", inset: 8, border: "1.5px solid var(--slate-2)" }} />
         <div style={{ position: "absolute", left: 8, top: 8, width: "46%", height: "54%", border: "1px solid var(--silver-2)" }} />
         <div style={{ position: "absolute", right: 8, top: 8, width: "34%", height: "34%", border: "1px solid var(--silver-2)" }} />
        </div>
        <div className="row between" style={{ marginTop: 7 }}><span style={{ fontSize: "0.6875rem", fontWeight: 600 }}>{s[0]}</span><span className="mono muted" style={{ fontSize: "0.5625rem" }}>{i + 1}</span></div>
       </div>
      ))}
     </div>
    </div>

    {/* canvas */}
    <div className="viewer" style={{ flex: 1, position: "relative", minWidth: 0 }}>
     <div className="planpaper plan" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 560, height: 420, maxWidth: "90%" }}>
      <div style={{ position: "absolute", inset: 18, border: "2.5px solid #1F262E" }} />
      {rooms.map((r, i) => (
       <div key={i} className="room" style={{ left: r[1], top: r[2], width: r[3], height: r[4] }}><span className="rl">{r[0]}</span></div>
      ))}
      <div className="dim" style={{ left: "50%", top: 4, transform: "translateX(-50%)" }}>{d.dimW}</div>
      <div className="dim" style={{ left: 4, top: "50%", transform: "translateY(-50%) rotate(-90deg)" }}>{d.dimH}</div>
      <div style={{ position: "absolute", right: 14, top: 14, display: "flex", flexDirection: "column", alignItems: "center", color: "var(--slate)" }}><span style={{ display: "inline-flex", transform: "rotate(-90deg)" }}><Icon.arrow size={16} /></span><span className="mono" style={{ fontSize: "0.5625rem" }}>{d.north}</span></div>
     </div>
     <div className="vtool" style={{ position: "absolute", right: 18, bottom: 18 }}>
      <span><Icon.search size={16} /></span><span>−</span><span className="on"><Icon.target size={15} /></span><span>+</span>
     </div>
     <div className="vtool" style={{ position: "absolute", left: 18, top: 18 }}>
      <span className="on" title={d.pan}><Icon.layers size={15} /></span><span title={d.measure}><Icon.ruler size={15} /></span><span title={d.fullscreen}><Icon.grid size={15} /></span>
     </div>
     <div style={{ position: "absolute", left: 18, bottom: 18, display: "flex", alignItems: "flex-end", gap: 14 }}>
      <div className="scalebar"><span>{d.scale05}</span><span className="b" /></div>
      <span className="tag" style={{ background: "rgba(255,255,255,.9)" }}>100% · 1:100</span>
     </div>
    </div>

    {/* info rail */}
    <div className="docs-rail-r" style={{ width: 248, flex: "none", borderLeft: "1px solid var(--silver)", background: "var(--paper)", padding: 18, overflowY: "auto" }}>
     <div className="eyebrow" style={{ marginBottom: 12 }}>{d.sheetDetails}</div>
     <div className="col gap10" style={{ fontSize: "0.78125rem" }}>
      {details.map((r, i) => (
       <div key={i} className="row between" style={{ paddingBottom: 9, borderBottom: "1px solid var(--silver)" }}><span className="muted">{r[0]}</span><b style={{ fontWeight: 600 }}>{r[1]}</b></div>
      ))}
     </div>
     <div className="card pad" style={{ marginTop: 16, boxShadow: "none", background: "var(--cool)" }}>
      <div className="row gap8"><span style={{ color: "var(--azure-d)" }}><Icon.spark size={15} /></span><div><div style={{ fontSize: "0.78125rem", fontWeight: 600 }}>{d.aiRead}</div><div className="muted" style={{ fontSize: "0.71875rem", lineHeight: 1.5, marginTop: 4 }}>{d.aiDesc}</div></div></div>
     </div>
     <div className="col gap8" style={{ marginTop: 16 }}>
      <span className="btn secondary sm" style={{ justifyContent: "center" }}><Icon.download size={14} /> {d.dlDwg}</span>
      <span className="btn secondary sm" style={{ justifyContent: "center" }}><Icon.download size={14} /> {d.dlPdf}</span>
     </div>
    </div>
   </div>
  </div>
 );
}
