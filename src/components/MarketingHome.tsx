"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mark, Logo, Icon, Ph, Verified, HARBOR, COOL } from "@/components/satkit";
import HeroMiniMap from "@/components/HeroMiniMap";

export type FeaturedListing = { id: string; price: string; title: string; district: string; area: string; type: string; verified: boolean; ph: string; img?: string };
type Stats = { listings: string; buildings: string; districts: string };

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
      <div className="satmkt-hero" style={{ position: "relative", padding: "84px 40px 76px", overflow: "hidden", backgroundImage: "linear-gradient(100deg, rgba(11,15,21,.92) 0%, rgba(16,26,38,.72) 46%, rgba(44,85,127,.30) 100%), url('/hero-riyadh.svg')", backgroundSize: "cover", backgroundPosition: "center" }}>
        <div style={{ position: "relative", display: "flex", gap: 72, alignItems: "center", flexWrap: "wrap", maxWidth: 1360, margin: "0 auto" }}>
          <div style={{ flex: "1 1 520px", maxWidth: 660 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.22)", borderRadius: 20, padding: "6px 13px", backdropFilter: "blur(4px)" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3ECF8E" }} />
              <span className="mono" style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.92)" }}>REGA-native commercial exchange</span>
            </div>
            <h1 className="serif" style={{ fontSize: "clamp(34px,5.6vw,62px)", fontWeight: 500, lineHeight: 1.04, letterSpacing: "-.02em", margin: "20px 0 0", color: "#fff" }}>
              Saudi Arabia&apos;s verified home for <span style={{ color: "#9DBBD6" }}>commercial space</span>
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: "rgba(255,255,255,.82)", margin: "20px 0 0", maxWidth: 560 }}>
              Find, compare and lease Grade A offices, retail and warehouses. Verified listings and decision-grade pricing, in one neutral exchange.
            </p>
            <div className="card" style={{ marginTop: 28, padding: 10, maxWidth: 600, boxShadow: "var(--sh-2)", borderRadius: 16 }}>
              <div className="seg" style={{ marginBottom: 12 }}>
                <span className={deal === "lease" ? "on" : ""} onClick={() => setDeal("lease")} style={{ cursor: "pointer" }}>Lease</span>
                <span className={deal === "buy" ? "on" : ""} onClick={() => setDeal("buy")} style={{ cursor: "pointer" }}>Buy</span>
                <span className={deal === "req" ? "on" : ""} onClick={() => setDeal("req")} style={{ cursor: "pointer" }}>Post a requirement</span>
              </div>
              <form onSubmit={go} style={{ display: "flex", alignItems: "stretch", border: "1px solid var(--silver-2)", borderRadius: 13, overflow: "hidden", background: "#fff", boxShadow: "var(--sh-1)" }}>
                {deal !== "req" && (
                  <div style={{ display: "flex", alignItems: "center", borderRight: "1px solid var(--silver)", paddingLeft: 14 }}>
                    <select value={assetType} onChange={(e) => setAssetType(e.target.value)} aria-label="Asset type" style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, fontWeight: 600, color: "var(--ink)", fontFamily: "var(--sans)", height: 56, paddingRight: 8, cursor: "pointer" }}>
                      <option value="">All types</option>
                      <option value="office">Office</option>
                      <option value="retail">Retail &amp; F&amp;B</option>
                      <option value="medical">Medical</option>
                      <option value="warehouse">Warehouse</option>
                      <option value="showroom">Showroom</option>
                      <option value="serviced">Serviced</option>
                      <option value="land">Land</option>
                    </select>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 11, flex: 1, padding: "0 16px", minWidth: 0 }}>
                  <span style={{ color: "var(--azure)", flex: "none" }}><Icon.search size={20} /></span>
                  <input className="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={deal === "req" ? "What space are you looking for?" : "District, building or area \u2014 e.g. Al Olaya"} style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 15, height: 56, color: "var(--ink)", fontFamily: "var(--sans)", minWidth: 0 }} />
                </div>
                <button type="submit" className="btn primary" style={{ borderRadius: 0, padding: "0 26px", fontSize: 15, fontWeight: 600, flex: "none" }}>{deal === "req" ? "Post" : "Search"}</button>
              </form>
              <div className="row gap8 wrap" style={{ marginTop: 12 }}>
                <span className="tag">Popular:</span>
                <Link href={L("/listings?q=Al%20Olaya")} className="chip on" style={{ textDecoration: "none" }}>Office, Al Olaya</Link>
                <Link href={L("/listings?q=Tahlia")} className="chip" style={{ textDecoration: "none" }}>Retail, Tahlia</Link>
                <Link href={L("/listings?q=Industrial")} className="chip" style={{ textDecoration: "none" }}>Warehouse, 2nd Industrial</Link>
              </div>
            </div>
            <div className="row gap20 wrap" style={{ marginTop: 22, fontSize: 13, color: "rgba(255,255,255,.85)" }}>
              <span className="row gap8"><span style={{ color: "#3ECF8E" }}><Icon.check size={16} /></span> Owners verified before listing</span>
              <span className="row gap8"><span style={{ color: "#3ECF8E" }}><Icon.check size={16} /></span> No assumed commission</span>
            </div>
            <div className="row gap8 wrap" style={{ marginTop: 18 }}>
              {["REGA-licensed", "PDPL-compliant", "Ejar-integrated", "100% verified"].map((t, i) => (
                <span key={i} className="tag" style={{ gap: 6, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", color: "rgba(255,255,255,.9)" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3ECF8E" }} />{t}</span>
              ))}
            </div>
          </div>
          <div style={{ flex: "1 1 360px", maxWidth: 404, position: "relative" }}>
            <HeroMiniMap locale={locale as "en" | "ar"} />
          </div>
        </div>
      </div>
      <div className="row" style={{ borderTop: "1px solid var(--silver)", borderBottom: "1px solid var(--silver)", background: "var(--paper)", flexWrap: "wrap" }}>
        {sStat.map((x, i) => (
          <div key={i} className="grow" style={{ padding: "22px 24px", borderRight: "1px solid var(--silver)", textAlign: "center", minWidth: 140 }}>
            <div className="mono tnum" style={{ fontSize: 28, fontWeight: 500, color: "var(--ink)" }}>{x[0]}</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{x[1]}</div>
          </div>
        ))}
      </div>
      <div style={{ maxWidth: 1360, margin: "0 auto" }}>
        <div style={{ padding: "64px 24px 20px" }}>
          <div className="eyebrow">The exchange</div>
          <h2 className="serif" style={{ fontSize: 36, fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 6px" }}>Four jobs, one neutral place</h2>
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
        <div style={{ padding: "52px 24px 20px" }}>
          <div className="row between wrap" style={{ alignItems: "flex-end", gap: 12 }}>
            <div>
              <div className="eyebrow">Featured, Riyadh</div>
              <h2 className="serif" style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 0" }}>Verified spaces, priced in context</h2>
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
        <div className="hero-band" style={{ margin: "56px 24px 0", borderRadius: 18, background: "var(--ink)", color: "#fff", padding: "48px 40px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -20, bottom: -40, opacity: .35 }}><Mark size={300} base="#222A31" lit={HARBOR} /></div>
          <div className="hero-band-grid" style={{ position: "relative", display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)", gap: 40, alignItems: "center" }}>
            <div>
              <div className="eyebrow" style={{ color: "var(--azure-l)" }}>SAT Rent Index, Q1 2026</div>
              <h2 className="serif" style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-.02em", margin: "14px 0 0", color: "#fff" }}>The pricing layer behind every decision</h2>
              <p style={{ fontSize: 16, lineHeight: 1.62, color: "#AEB6C0", margin: "16px 0 24px", maxWidth: 440 }}>Verified transaction data across {stats.districts} Riyadh districts. Benchmark a rent, size a catchment, or value a lease. Sourced, never estimated.</p>
              <Link href={L("/rent-index")} className="btn primary" style={{ textDecoration: "none" }}>Explore the Rent Index</Link>
            </div>
            <div className="row gap16 wrap">
              {[["+8.4%", "Olaya office, YoY"], ["1,420", "Median office SAR/m²"], ["96%", "Occupancy, Grade A"]].map((x, i) => (
                <div key={i} className="grow" style={{ minWidth: 120, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: "18px 16px" }}>
                  <div className="mono tnum" style={{ fontSize: 24, fontWeight: 500, color: "#fff" }}>{x[0]}</div>
                  <div style={{ fontSize: 11.5, color: "#8A93A0", marginTop: 6 }}>{x[1]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: "72px 40px 64px" }}>
          <div className="eyebrow" style={{ textAlign: "center" }}>How a deal flows</div>
          <h2 className="serif" style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 34px", textAlign: "center" }}>You always make an explicit choice</h2>
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
          <h2 className="serif" style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 6px", textAlign: "center" }}>Everything the market needs, in one place</h2>
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
          <div style={{ borderRadius: 18, background: "linear-gradient(120deg,var(--azure) 0%,var(--azure-d) 100%)", color: "#fff", padding: "52px 40px", textAlign: "center" }}>
            <h2 className="serif" style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-.02em", margin: 0, color: "#fff" }}>List your space, or find your next one</h2>
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
