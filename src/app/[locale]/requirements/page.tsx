"use client";
import { getDictionary } from "@/i18n/getDictionary";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/satkit";
import { assetLabel, cityLabel } from "@/lib/labels";
import { timelineLabel, mustHaveLabel } from "@/lib/requirementIntake";

// PKG-DEM1, finding 100's read side. A requirement's timeline and must-haves are
// stored as tokens, and this board printed the tokens. `Q3` is readable enough in
// English to have gone unnoticed; `fitted` beside `مجهّز` on an Arabic card is
// not, and neither is the raw token an Arabic reader sees for a brief posted in
// English. Both fields go through the vocabulary that defines them, which is the
// same one the form renders from and the write path validates against.

interface Req { sample?: boolean; id: string; ref: string; title: string; titleAr?: string | null; asset: string; deal: string; district: string; districtAr?: string | null; city: string; sizeMin: number; sizeMax: number; budget: number; timeline: string; mustHaves: string[]; interest: number; }

export default function RequirementsBoard({ params }: { params: { locale: string } }) {
 const locale = params.locale === "ar" ? "ar" : "en";
 const ar = locale === "ar";
 const dict = getDictionary(locale);
 // The asset type was named from a map declared here, which held seven types in
 // Arabic and none in English, so an English reader got the token title-cased and
 // read "Retail" where every other surface says "Retail & F&B", and an Arabic
 // reader of an education or hospitality brief got the English token. `assetLabel`
 // is where the platform names an asset type.
 const [reqs, setReqs] = useState<Req[]>([]);
 const [loading, setLoading] = useState(true);
 useEffect(() => { fetch("/api/requirements").then((r) => r.json()).then((j) => { setReqs(j.requirements || []); setLoading(false); }).catch(() => setLoading(false)); }, []);

 return (
  <div style={{ background: "var(--cool)" }}>
   <div style={{ padding: "36px 24px 48px", maxWidth: 1080, margin: "0 auto" }}>
    <div className="row between wrap" style={{ alignItems: "flex-end", gap: 14 }}>
     <div>
      <div className="eyebrow">{dict.req.openReqs}</div>
      <h1 className="serif" style={{ fontSize: 32, fontWeight: 500, margin: "12px 0 6px" }}>{dict.req.h1}</h1>
      <p className="muted" style={{ fontSize: 15, maxWidth: 580, lineHeight: 1.6 }}>{dict.req.sub}</p>
     </div>
     <Link href={`/${locale}/post-requirement`} className="btn primary"><Icon.plus size={15} /> {dict.req.postReq}</Link>
    </div>

    {loading ? (
     <div className="muted" style={{ marginTop: 40, fontSize: 14 }}>{dict.req.loading}</div>
    ) : reqs.length === 0 ? (
     /* An empty board rendered an empty grid: the header, the loading line gone,
        and then nothing, which reads as a page that failed rather than a market
        with no open demand yet. */
     <div className="card pad" style={{ marginTop: 28, boxShadow: "none", background: "var(--paper)" }}>
      <p className="muted" style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>{dict.req.empty}</p>
      <div style={{ marginTop: 14 }}><Link href={`/${locale}/post-requirement`} className="btn primary"><Icon.plus size={15} /> {dict.req.postReq}</Link></div>
     </div>
    ) : (
     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16, marginTop: 28 }}>
      {reqs.map((r) => (
       <Link key={r.id} href={`/${locale}/requirements/${r.id}`} className="card pad lift" style={{ boxShadow: "var(--sh-1)", textDecoration: "none", color: "inherit", display: "block" }}>
        <div className="row between" style={{ alignItems: "center" }}>
         <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>{assetLabel(r.asset, locale)} · {r.deal === "lease" ? (dict.req.lease) : (dict.req.buy)}</span>
         <span className="row gap6" style={{ alignItems: "center" }}>
          {r.sample ? <span className="tag" style={{ color: "#92400E", background: "#FFFBEB", borderColor: "#FCD34D", fontSize: 10.5 }}>{dict.req.sampleTag}</span> : null}
          <span className="mono muted" style={{ fontSize: 11 }}>{r.ref}</span>
         </span>
        </div>
        <div style={{ fontSize: 15.5, fontWeight: 700, margin: "12px 0 8px", lineHeight: 1.3 }}>{(ar && r.titleAr) || r.title}</div>
        <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.7 }}>
         <div className="row gap6"><Icon.pin size={14} /> {(ar && r.districtAr) || r.district}{r.city && r.district !== r.city ? (ar ? "، " : ", ") + cityLabel(r.city, locale) : ""}</div>
         <div className="row gap6"><Icon.layers size={14} /> <bdi>{r.sizeMin} {dict.req.rangeTo} {r.sizeMax} {ar ? "م²" : "m²"}</bdi> · {dict.req.upTo} <bdi>{Number(r.budget).toLocaleString("en-US")} {r.deal === "lease" ? (ar ? "ريال/م²·سنة" : "SAR/m²·yr") : (ar ? "ريال" : "SAR")}</bdi></div>
         {/* A brief with no move-in date is a real answer, and the column is
             nullable, so the clock and its empty line are not drawn at all
             rather than drawn beside nothing. */}
         {timelineLabel(r.timeline, ar) ? <div className="row gap6"><Icon.clock size={14} /> {dict.req.timeline}: {timelineLabel(r.timeline, ar)}</div> : null}
        </div>
        {r.mustHaves?.length ? <div className="row gap6 wrap" style={{ marginTop: 10 }}>{r.mustHaves.slice(0, 4).map((m, i) => <span key={i} className="chip" style={{ fontSize: 11 }}>{mustHaveLabel(m, ar)}</span>)}</div> : null}
        <div className="row between" style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--silver)", alignItems: "center" }}>
         <span style={{ fontSize: 12.5, color: r.interest ? "var(--harbor)" : "var(--slate)" }}>{r.interest ? (ar ? `${r.interest} مهتم` : `${r.interest} interested`) : (dict.req.noInterest)}</span>
         <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--azure-d)" }}>{dict.req.viewRespond}</span>
        </div>
       </Link>
      ))}
     </div>
    )}
   </div>
  </div>
 );
}
