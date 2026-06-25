"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mark, Logo, Icon, Ph, Verified, HARBOR, COOL } from "@/components/satkit";

export type FeaturedListing = { id: string; price: string; title: string; district: string; area: string; type: string; verified: boolean; ph: string; img?: string };
type Stats = { listings: string; buildings: string; districts: string };

const ASSETS = [
 { v: "office", label: "Office", icon: <Icon.building size={22} /> },
 { v: "retail", label: "Retail", icon: <Icon.store size={22} /> },
 { v: "medical", label: "Medical", icon: <Icon.activity size={22} /> },
 { v: "showroom", label: "Showroom", icon: <Icon.grid size={22} /> },
 { v: "warehouse", label: "Warehouse", icon: <Icon.layers size={22} /> },
 { v: "serviced", label: "Serviced", icon: <Icon.user size={22} /> },
 { v: "education", label: "Education", icon: <Icon.doc size={22} /> },
 { v: "land", label: "Land", icon: <Icon.ruler size={22} /> },
];

export default function MarketingHome({ locale = "en", featured = [], stats }: { locale?: string; featured?: FeaturedListing[]; stats: Stats }) {
 const router = useRouter();
 const [deal, setDeal] = useState<"lease" | "buy" | "req">("lease");
 const [q, setQ] = useState("");
 const [assetType, setAssetType] = useState("");
 const go = (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  if (deal === "req") { router.push(`/${locale}/post-requirement${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`); return; }
  const sp = new URLSearchParams();
  sp.set("deal", deal === "buy" ? "sale" : "lease");
  if (assetType) sp.set("asset", assetType);
  if (q.trim()) sp.set("q", q.trim());
  router.push(`/${locale}/listings?${sp.toString()}`);
 };
 const L = (p: string) => `/${locale}${p}`;
 const sStat = [[stats.listings, "Verified listings"], ["100%", "Owner-verified"], [stats.districts, "Districts indexed"], ["1", "Neutral exchange"]];
 return (
  <div style={{ fontFamily: "var(--sans)", color: "var(--ink)", background: "var(--paper)" }}>
   <div className="satmkt-hero" style={{ position: "relative", padding: "clamp(48px,10vw,78px) 20px clamp(54px,10vw,90px)", overflow: "hidden", background: "radial-gradient(125% 85% at 50% -12%, #143150 0%, #0C2138 46%, #081522 100%)" }}>
    <style>{`
      .satmkt-hero::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(157,187,214,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(157,187,214,.07) 1px,transparent 1px);background-size:46px 46px;-webkit-mask-image:radial-gradient(120% 92% at 50% 0%,#000 32%,transparent 78%);mask-image:radial-gradient(120% 92% at 50% 0%,#000 32%,transparent 78%);pointer-events:none}
      .satmkt-hero::after{content:"";position:absolute;inset:0;background:url('/hero-riyadh.svg') center bottom/cover no-repeat;opacity:.09;mix-blend-mode:luminosity;pointer-events:none}
      .hero-rise{opacity:0;transform:translateY(14px);animation:heroRise .72s cubic-bezier(.2,.7,.2,1) forwards}
      .hero-rise.d1{animation-delay:.07s}.hero-rise.d2{animation-delay:.15s}.hero-rise.d3{animation-delay:.25s}.hero-rise.d4{animation-delay:.36s}
      @keyframes heroRise{to{opacity:1;transform:none}}
      @keyframes livePulse{0%,100%{box-shadow:0 0 0 0 rgba(62,207,142,.55)}50%{box-shadow:0 0 0 5px rgba(62,207,142,0)}}
      .live-dot{width:7px;height:7px;border-radius:50%;background:#3ECF8E;flex:none;animation:livePulse 2.4s ease-in-out infinite}
      .hero-assets{scrollbar-width:none}.hero-assets::-webkit-scrollbar{display:none}
      @media (max-width:640px){.hero-assets{flex-wrap:nowrap!important;justify-content:flex-start!important;overflow-x:auto;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity;padding-bottom:6px}.hero-assets>button{flex:0 0 auto!important;scroll-snap-align:start}}
      .reg-rail{display:flex;align-items:stretch;justify-content:center;flex-wrap:wrap;border:1px solid rgba(157,187,214,.2);border-radius:12px;background:rgba(8,21,34,.5);backdrop-filter:blur(6px);overflow:hidden}
      .reg-cell{display:flex;flex-direction:column;gap:3px;padding:11px 22px;border-left:1px solid rgba(157,187,214,.14);text-align:left}
      .reg-cell.lead{border-left:none;justify-content:center;background:rgba(157,187,214,.06)}
      @media (max-width:560px){.reg-cell{flex:1 1 50%}.reg-cell.lead{flex:1 1 100%;align-items:center;text-align:center}}
      @media (prefers-reduced-motion:reduce){.hero-rise{animation:none;opacity:1;transform:none}.live-dot{animation:none}}
    `}</style>
    <div style={{ position: "relative", maxWidth: 940, margin: "0 auto", textAlign: "center" }}>
     <div className="hero-rise mono" style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "rgba(196,214,233,.92)" }}>
      <span className="live-dot" />
      REGA-native exchange
      <span style={{ opacity: .42 }}>/</span>
      Riyadh 24.71&deg;N 46.67&deg;E
     </div>
     <h1 className="serif hero-rise d1" style={{ fontSize: "clamp(34px,5.4vw,60px)", fontWeight: 500, lineHeight: 1.04, letterSpacing: "-.022em", margin: "20px auto 0", color: "#F5F8FC", maxWidth: 860 }}>
      Where Saudi business finds <span style={{ color: "#9DBBD6", borderBottom: "2px solid rgba(157,187,214,.42)", paddingBottom: 1 }}>verified commercial space</span>
     </h1>
     <p className="hero-rise d2" style={{ fontSize: 17.5, lineHeight: 1.6, color: "rgba(214,224,235,.8)", margin: "18px auto 0", maxWidth: 600 }}>
      Offices, retail, medical and warehouses across Riyadh. Owner-verified, permit-backed, decision-grade pricing, one neutral exchange.
     </p>

     <div className="hero-rise d3" style={{ margin: "30px auto 0", maxWidth: 870, background: "rgba(10,24,38,.55)", border: "1px solid rgba(157,187,214,.2)", borderRadius: 18, backdropFilter: "blur(12px)", padding: "18px 18px 16px", boxShadow: "0 30px 70px rgba(0,0,0,.42)" }}>
      <div style={{ display: "inline-flex", gap: 4, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: 3, marginBottom: 16 }}>
       {([["lease","Lease"],["buy","Buy"],["req","Post a requirement"]] as const).map(([v,l]) => (
        <button key={v} type="button" onClick={() => setDeal(v)} style={{ border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "7px 16px", borderRadius: 7, background: deal===v ? "#fff" : "transparent", color: deal===v ? "var(--ink)" : "rgba(255,255,255,.78)" }}>{l}</button>
       ))}
      </div>

      {deal !== "req" && (
       <div className="hero-assets" style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {ASSETS.map((a) => {
         const on = assetType === a.v;
         return (
          <button key={a.v} type="button" onClick={() => setAssetType(on ? "" : a.v)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 92, padding: "12px 6px", borderRadius: 12, cursor: "pointer", border: "1px solid " + (on ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.12)"), background: on ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.04)", color: "#fff", transition: "all .12s ease" }}>
           <span style={{ opacity: on ? 1 : .85 }}>{a.icon}</span>
           <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,.92)" }}>{a.label}</span>
          </button>
         );
        })}
       </div>
      )}

      <form onSubmit={go} style={{ display: "flex", alignItems: "stretch", border: "1px solid var(--silver-2)", borderRadius: 13, overflow: "hidden", background: "#fff", boxShadow: "0 6px 20px rgba(0,0,0,.18)" }}>
       <div style={{ display: "flex", alignItems: "center", gap: 11, flex: 1, padding: "0 18px", minWidth: 0 }}>
        <span style={{ color: "var(--azure)", flex: "none" }}><Icon.pin size={20} /></span>
        <input className="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={deal === "req" ? "What space are you looking for?" : "District, building or area"} style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 15.5, height: 58, color: "var(--ink)", fontFamily: "var(--sans)", minWidth: 0, textAlign: "left" }} />
       </div>
       <button type="submit" className="btn primary" style={{ borderRadius: 0, padding: "0 30px", fontSize: 15, fontWeight: 600, flex: "none" }}>{deal === "req" ? "Post" : "Search"}</button>
      </form>

      <div className="row gap8 wrap" style={{ marginTop: 14, justifyContent: "center" }}>
       <span className="tag" style={{ color: "rgba(255,255,255,.6)", background: "transparent", border: "none" }}>Popular:</span>
       <Link href={L("/listings?q=Al%20Olaya")} className="chip" style={{ textDecoration: "none", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.18)", color: "#fff" }}>Office, Al Olaya</Link>
       <Link href={L("/listings?q=Tahlia")} className="chip" style={{ textDecoration: "none", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.18)", color: "#fff" }}>Retail, Tahlia</Link>
       <Link href={L("/listings?q=Industrial")} className="chip" style={{ textDecoration: "none", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.18)", color: "#fff" }}>Warehouse, 2nd Industrial</Link>
      </div>
     </div>

     <div className="hero-rise d4" style={{ margin: "20px auto 0", maxWidth: 740 }}>
      <div className="reg-rail">
       <div className="reg-cell lead">
        <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(214,228,244,.9)" }}><span className="live-dot" /> SAT Index</span>
        <span className="mono" style={{ fontSize: 10, letterSpacing: ".08em", color: "rgba(170,188,208,.6)", textTransform: "uppercase" }}>Live, Q1 2026</span>
       </div>
       {[["+8.4%", "Olaya office, YoY"], ["1,420", "Median SAR/m²"], ["96%", "Grade A occupancy"]].map((x, i) => (
        <div key={i} className="reg-cell">
         <span className="mono tnum" style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>{x[0]}</span>
         <span className="mono" style={{ fontSize: 10, letterSpacing: ".05em", color: "rgba(180,198,218,.7)", textTransform: "uppercase" }}>{x[1]}</span>
        </div>
       ))}
      </div>
      <div className="mono" style={{ marginTop: 12, fontSize: 11, letterSpacing: ".03em", color: "rgba(170,188,208,.66)" }}>Owners verified before listing &middot; No assumed commission &middot; REGA-licensed, PDPL-compliant</div>
     </div>
    </div>
   </div>
   <div className="row" style={{ borderTop: "1px solid var(--silver)", borderBottom: "1px solid var(--silver)", background: "var(--paper)", flexWrap: "wrap" }}>
    {sStat.map((x, i) => (
     <div key={i} className="grow sstat-cell" style={{ padding: "22px 24px", borderRight: "1px solid var(--silver)", textAlign: "center", minWidth: 140 }}>
      <div className="mono tnum" style={{ fontSize: 28, fontWeight: 500, color: "var(--ink)" }}>{x[0]}</div>
      <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{x[1]}</div>
     </div>
    ))}
   </div>
   <div style={{ maxWidth: 1360, margin: "0 auto" }}>
    <div style={{ padding: "clamp(40px,8vw,64px) 20px 20px" }}>
     <div className="eyebrow">The exchange</div>
     <h2 className="serif" style={{ fontSize: "clamp(26px,6vw,36px)", fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 6px" }}>Four jobs, one neutral place</h2>
     <p className="muted" style={{ fontSize: 16, maxWidth: 620 }}>No one in the Kingdom combines all four. That combination is the platform.</p>
     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 18, marginTop: 34 }}>
      {[
       [Icon.building, "Verified listings", "Direct from the verified owner, or SAT under mandate. No unverified broker listings.", "/listings"],
       [Icon.doc, "Requirements", "Occupiers post what they need; the right supply comes to them.", "/post-requirement"],
       [Icon.chart, "Rent Index", "Decision-grade pricing and catchment data. Every figure sourced.", "/rent-index"],
       [Icon.user, "Representation", "An explicit, opt-in choice. Never a commission baked into a listing.", "/dashboard"],
      ].map((c, i) => { const I = c[0] as (p: { size?: number }) => JSX.Element; return (
       <Link key={i} href={L(c[3] as string)} className="card pad lift" style={{ boxShadow: "none", textDecoration: "none", color: "inherit", display: "block" }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: "var(--azure-wash)", color: "var(--azure-d)", display: "flex", alignItems: "center", justifyContent: "center" }}><I size={21} /></div>
        <div style={{ fontSize: 17, fontWeight: 600, margin: "16px 0 8px", letterSpacing: "-.01em" }}>{c[1] as string}</div>
        <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>{c[2] as string}</div>
       </Link>
      ); })}
     </div>
    </div>
    <div style={{ padding: "clamp(36px,7vw,52px) 20px 20px" }}>
     <div className="row between wrap" style={{ alignItems: "flex-end", gap: 12 }}>
      <div>
       <div className="eyebrow">Featured, Riyadh</div>
       <h2 className="serif" style={{ fontSize: "clamp(24px,5vw,32px)", fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 0" }}>Verified spaces, priced in context</h2>
      </div>
      <Link href={L("/listings")} className="btn ghost" style={{ gap: 7, textDecoration: "none" }}>Browse all listings <Icon.arrow size={16} /></Link>
     </div>
     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 18, marginTop: 28 }}>
      {featured.map((f) => (
       <Link key={f.id} href={L(`/listings/${f.id}`)} className="listing" style={{ textDecoration: "none", color: "inherit" }}>
        <Ph src={f.img} label={f.ph} h={150} badges={[f.verified ? <Verified key="v" /> : null, <span key="t" className="tag" style={{ background: "rgba(255,255,255,.9)" }}>{f.type}</span>].filter(Boolean)} />
        <div className="body">
         <div className="row between"><div className="price">{f.price}<small> SAR/m²·yr</small></div><span className="muted2"><Icon.heart size={17} /></span></div>
         <div className="ttl">{f.title}</div>
         <div className="meta"><span>{f.district}</span><i /><span>{f.area}</span><i /><span>{f.type}</span></div>
        </div>
       </Link>
      ))}
     </div>
    </div>
    <div className="hero-band" style={{ margin: "56px 24px 0", borderRadius: 18, background: "radial-gradient(130% 130% at 100% 0%, #143150 0%, #0C2138 52%, #081522 100%)", color: "#fff", padding: "clamp(34px,6vw,48px) clamp(24px,5vw,40px)", position: "relative", overflow: "hidden", border: "1px solid rgba(157,187,214,.16)" }}>
     <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(157,187,214,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(157,187,214,.06) 1px,transparent 1px)", backgroundSize: "42px 42px", WebkitMaskImage: "radial-gradient(130% 130% at 100% 0%,#000 28%,transparent 74%)", maskImage: "radial-gradient(130% 130% at 100% 0%,#000 28%,transparent 74%)", pointerEvents: "none" }} />
     <div className="hero-band-grid" style={{ position: "relative", display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)", gap: 40, alignItems: "center" }}>
      <div>
       <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "rgba(196,214,233,.9)" }}><span className="live-dot" /> SAT Index / Q1 2026</span>
       <h2 className="serif" style={{ fontSize: "clamp(25px,5.4vw,34px)", fontWeight: 500, letterSpacing: "-.02em", margin: "14px 0 0", color: "#fff" }}>The pricing layer behind every decision</h2>
       <p style={{ fontSize: 16, lineHeight: 1.62, color: "#AEB6C0", margin: "16px 0 24px", maxWidth: 440 }}>Verified transaction data across {stats.districts} Riyadh districts. Benchmark a rent, size a catchment, or value a lease. Sourced, never estimated.</p>
       <Link href={L("/rent-index")} className="btn primary" style={{ textDecoration: "none" }}>Explore the Rent Index</Link>
      </div>
      <div className="row gap16 wrap">
       {[["+8.4%", "Olaya office, YoY"], ["1,420", "Median office SAR/m²"], ["96%", "Occupancy, Grade A"]].map((x, i) => (
        <div key={i} className="grow" style={{ minWidth: 120, background: "rgba(8,21,34,.5)", border: "1px solid rgba(157,187,214,.18)", borderRadius: 12, padding: "18px 16px" }}>
         <div className="mono tnum" style={{ fontSize: 24, fontWeight: 600, color: "#fff" }}>{x[0]}</div>
         <div className="mono" style={{ fontSize: 10.5, letterSpacing: ".05em", textTransform: "uppercase", color: "rgba(180,198,218,.7)", marginTop: 6 }}>{x[1]}</div>
        </div>
       ))}
      </div>
     </div>
    </div>
    <div style={{ padding: "clamp(44px,9vw,72px) clamp(20px,5vw,40px) clamp(40px,8vw,64px)" }}>
     <div className="eyebrow" style={{ textAlign: "center" }}>How a deal flows</div>
     <h2 className="serif" style={{ fontSize: "clamp(24px,5vw,32px)", fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 34px", textAlign: "center" }}>You always make an explicit choice</h2>
     <div className="row gap20 wrap" style={{ maxWidth: 940, margin: "0 auto", alignItems: "stretch" }}>
      <div className="card pad grow" style={{ minWidth: 280 }}>
       <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>Path A, Free</span>
       <div style={{ fontSize: 19, fontWeight: 600, margin: "14px 0 8px" }}>Contact the lister directly</div>
       <div className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>Self-serve and free. No mandate, no fee, no assumed commission. Most of the exchange runs this way.</div>
      </div>
      <a href="https://satestate.com/contact" target="_blank" rel="noopener noreferrer" className="card pad grow lift" style={{ borderColor: "var(--harbor)", minWidth: 280, textDecoration: "none", color: "inherit", display: "block" }}>
       <span className="tag" style={{ color: "var(--harbor)", background: "rgba(58,110,165,.08)", borderColor: "rgba(58,110,165,.3)" }}>Path B, Opt-in</span>
       <div style={{ fontSize: 19, fontWeight: 600, margin: "14px 0 8px" }}>Appoint SAT Real Estate to represent you</div>
       <div className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>An explicit mandate when you want SAT Real Estate&apos;s licensed brokers at the table. Clear terms, agreed before any fee applies.</div>
       <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: "var(--harbor)" }}>Talk to SAT Real Estate &rarr;</div>
      </a>
     </div>
    </div>
    <div style={{ padding: "20px 24px 20px" }}>
     <div className="eyebrow" style={{ textAlign: "center" }}>One exchange</div>
     <h2 className="serif" style={{ fontSize: "clamp(25px,5.4vw,34px)", fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 6px", textAlign: "center" }}>Everything the market needs, in one place</h2>
     <p className="muted" style={{ fontSize: 15.5, maxWidth: 600, margin: "0 auto", textAlign: "center" }}>Discovery, decision-grade data, AI and the full deal, for occupiers, owners, brokers and investors.</p>
     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14, marginTop: 34 }}>
      {[
       [Icon.building, "Verified listings + map", "Permit and FAL-checked stock on a live Riyadh map.", "h", "/map"],
       [Icon.chart, "Rent Index", "Decision-grade rents with the capped/open freeze lens.", "a", "/rent-index"],
       [Icon.target, "Location Intelligence", "Footfall, catchment and co-tenancy. Sourced, not modelled.", "", "/area"],
       [Icon.coins, "Investment underwriting", "Yield, NOI and scenarios on verified comps.", "h", "/invest"],
       [Icon.spark, "AI Advisor", "Conversational search and valuation, grounded in the Index.", "a", "/advisor"],
       [Icon.msg, "Post a requirement", "Tell the market what you need; owners and brokers respond.", "", "/post-requirement"],
       [Icon.grid, "Owner dashboard", "Listing performance, leads and requirement matches.", "h", "/dashboard"],
       [Icon.coins, "Membership plans", "Grades with clear quota caps; ZATCA invoicing.", "a", "/pricing"],
       [Icon.cal, "Deal tracking", "Enquiry to viewing to offer to handover, with verified parties.", "", "/deal"],
       [Icon.bolt, "Compare spaces", "Shortlist side by side on verified facts and rent vs index.", "h", "/compare"],
       [Icon.shield, "Trust and compliance", "REGA, PDPL, AML and a checkable verification layer.", "", "/about"],
      ].map((m, i) => { const I = m[0] as (p: { size?: number }) => JSX.Element; const k = m[3] as string; return (
       <Link key={i} href={L(m[4] as string)} className="card pad lift" style={{ boxShadow: "none", textDecoration: "none", color: "inherit", display: "block" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: k === "a" ? "var(--azure-wash)" : k === "h" ? "#EAF0F7" : "var(--cool)", color: k === "a" ? "var(--azure-d)" : "var(--harbor)" }}><I size={20} /></div>
        <div style={{ fontSize: 15, fontWeight: 600, margin: "14px 0 5px", letterSpacing: "-.01em" }}>{m[1] as string}</div>
        <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.55 }}>{m[2] as string}</div>
       </Link>
      ); })}
     </div>
    </div>
    <div style={{ padding: "44px 24px 64px" }}>
     <div style={{ borderRadius: 18, background: "linear-gradient(120deg,var(--azure) 0%,var(--azure-d) 100%)", color: "#fff", padding: "clamp(34px,7vw,52px) clamp(22px,6vw,40px)", textAlign: "center" }}>
      <h2 className="serif" style={{ fontSize: "clamp(25px,5.4vw,34px)", fontWeight: 500, letterSpacing: "-.02em", margin: 0, color: "#fff" }}>List your space, or find your next one</h2>
      <p style={{ fontSize: 16, color: "rgba(255,255,255,.85)", margin: "14px auto 26px", maxWidth: 480 }}>Join the verified exchange built for Riyadh&apos;s commercial market.</p>
      <div className="row gap12 center wrap">
       <Link href={L("/dashboard")} className="btn lg" style={{ background: "#fff", color: "var(--azure-d)", textDecoration: "none" }}>List your space</Link>
       <Link href={L("/listings")} className="btn lg" style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,.5)", textDecoration: "none" }}>Browse listings</Link>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
