"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/satkit";

interface Req { id: string; ref: string; title: string; asset: string; deal: string; district: string; city: string; sizeMin: number; sizeMax: number; budget: number; timeline: string; mustHaves: string[]; interest: number; }

export default function RequirementsBoard({ params }: { params: { locale: string } }) {
 const locale = params.locale === "ar" ? "ar" : "en";
 const ar = locale === "ar";
 const ASSET_L: Record<string, string> = ar ? { office: "مكاتب", retail: "تجزئة", warehouse: "مستودعات", land: "أراضٍ", medical: "طبي", showroom: "معارض", serviced: "مفروشة" } : {};
 const [reqs, setReqs] = useState<Req[]>([]);
 const [loading, setLoading] = useState(true);
 useEffect(() => { fetch("/api/requirements").then((r) => r.json()).then((j) => { setReqs(j.requirements || []); setLoading(false); }).catch(() => setLoading(false)); }, []);

 return (
  <div style={{ background: "var(--cool)" }}>
   <div style={{ padding: "36px 24px 48px", maxWidth: 1080, margin: "0 auto" }}>
    <div className="row between wrap" style={{ alignItems: "flex-end", gap: 14 }}>
     <div>
      <div className="eyebrow">{ar ? "الطلبات المفتوحة" : "Open requirements"}</div>
      <h1 className="serif" style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 6px" }}>{ar ? "مستأجرون موثّقون يبحثون عن مساحات" : "Verified occupiers looking for space"}</h1>
      <p className="muted" style={{ fontSize: 15, maxWidth: 580, lineHeight: 1.6 }}>{ar ? "عكس الإعلان. إن كنت مالكاً أو وسيطاً لديه مساحة مطابقة، سجّل اهتمامك، ويرى المستأجر من استجاب ويختار من يحادثه." : "The reverse of a listing. If you are an owner or broker with a match, register interest, the occupier sees who responded and chooses who to talk to."}</p>
     </div>
     <Link href={`/${locale}/post-requirement`} className="btn primary"><Icon.plus size={15} /> {ar ? "انشر طلبك" : "Post a requirement"}</Link>
    </div>

    {loading ? (
     <div className="muted" style={{ marginTop: 40, fontSize: 14 }}>{ar ? "جارٍ تحميل الطلبات…" : "Loading requirements…"}</div>
    ) : (
     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16, marginTop: 28 }}>
      {reqs.map((r) => (
       <Link key={r.id} href={`/${locale}/requirements/${r.id}`} className="card pad lift" style={{ boxShadow: "var(--sh-1)", textDecoration: "none", color: "inherit", display: "block" }}>
        <div className="row between" style={{ alignItems: "center" }}>
         <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>{ar ? (ASSET_L[r.asset] || r.asset) : r.asset[0].toUpperCase() + r.asset.slice(1)} · {r.deal === "lease" ? (ar ? "إيجار" : "Lease") : (ar ? "شراء" : "Buy")}</span>
         <span className="mono muted" style={{ fontSize: 11 }}>{r.ref}</span>
        </div>
        <div style={{ fontSize: 15.5, fontWeight: 700, margin: "12px 0 8px", letterSpacing: "-.01em", lineHeight: 1.3 }}>{r.title}</div>
        <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.7 }}>
         <div className="row gap6"><Icon.pin size={14} /> {r.district}{r.city && r.district !== r.city ? ", " + r.city : ""}</div>
         <div className="row gap6"><Icon.layers size={14} /> {r.sizeMin}–{r.sizeMax} {ar ? "م²" : "m²"} · {ar ? "حتى" : "up to"} {Number(r.budget).toLocaleString()} {r.deal === "lease" ? (ar ? "ريال/م²·سنة" : "SAR/m²·yr") : (ar ? "ريال" : "SAR")}</div>
         <div className="row gap6"><Icon.clock size={14} /> {r.timeline}</div>
        </div>
        {r.mustHaves?.length ? <div className="row gap6 wrap" style={{ marginTop: 10 }}>{r.mustHaves.slice(0, 4).map((m, i) => <span key={i} className="chip" style={{ fontSize: 11 }}>{m}</span>)}</div> : null}
        <div className="row between" style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--silver)", alignItems: "center" }}>
         <span style={{ fontSize: 12.5, color: r.interest ? "var(--green)" : "var(--slate)" }}>{r.interest ? (ar ? `${r.interest} مهتم` : `${r.interest} interested`) : (ar ? "لا اهتمام بعد" : "No interest yet")}</span>
         <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--azure-d)" }}>{ar ? "اعرض واستجب ←" : "View & respond →"}</span>
        </div>
       </Link>
      ))}
     </div>
    )}
   </div>
  </div>
 );
}
