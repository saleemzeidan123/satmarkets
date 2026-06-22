"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mark, Logo, Icon, Ph, Verified, MarkPin, HARBOR, COOL } from "@/components/satkit";

export type FeaturedListing = { id: string; price: string; title: string; district: string; area: string; type: string; verified: boolean; ph: string };
type Stats = { listings: string; buildings: string; districts: string };

export default function MarketingHome({ locale = "en", featured = [], stats }: { locale?: string; featured?: FeaturedListing[]; stats: Stats }) {
  const router = useRouter();
  const [deal, setDeal] = useState<"lease" | "buy" | "req">("lease");
  const [q, setQ] = useState("");
  const go = (e?: React.FormEvent) => { if (e) e.preventDefault(); const sp = new URLSearchParams(); sp.set("deal", deal === "buy" ? "sale" : "lease"); if (q.trim()) sp.set("q", q.trim()); router.push(`/${locale}/listings?${sp.toString()}`); };
  const L = (p: string) => `/${locale}${p}`;
  const sStat = [[stats.listings, "Verified listings"], ["100%", "Owner-verified"], [stats.districts, "Districts indexed"], ["1", "Neutral exchange"]];
  return (
    <div style={{ fontFamily: "var(--sans)", color: "var(--ink)", background: "var(--paper)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, background: "var(--ink)", color: "#fff", padding: "8px 24px", fontSize: 12.5, flexWrap: "wrap" }}>
        <Mark size={16} base={COOL} lit={HARBOR} />
        <span style={{ color: "rgba(255,255,255,.86)" }}>SAT Rent Index Q1 2026 is live. Verified rents across {stats.districts} Riyadh districts.</span>
        <Link href={L("/rent-index")} style={{ color: "var(--azure-l)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none" }}>Explore <Icon.arrow size={14} /></Link>
      </div>
      <div className="satmkt-hero" style={{ position: "relative", padding: "72px 40px 64px", background: "linear-gradient(160deg,#FBFCFE 0%,#EEF2F8 60%,#E7EDF5 100%)", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: .5, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: -66, right: -46 }}><Mark size={360} base="#E6ECF4" lit="#DCE6F1" /></div>
        </div>
        <div style={{ position: "relative", display: "flex", gap: 46, alignItems: "center", flexWrap: "wrap", maxWidth: 1360, margin: "0 auto" }}>
          <div style={{ flex: "1 1 520px", maxWidth: 640 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid var(--silver)", borderRadius: 20, padding: "6px 13px", boxShadow: "var(--sh-1)" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)" }} />
              <span className="mono" style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--slate)" }}>REGA-native commercial exchange</span>
            </div>
            <h1 className="serif" style={{ fontSize: "clamp(34px,5.6vw,62px)", fontWeight: 500, lineHeight: 1.04, letterSpacing: "-.02em", margin: "20px 0 0", color: "var(--ink)" }}>
              Riyadh&apos;s verified home for <span style={{ color: "var(--harbor)" }}>commercial space</span>
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--slate)", margin: "20px 0 0", maxWidth: 560 }}>
              Find, compare and lease Grade A offices, retail and warehouses. Verified listings and decision-grade pricing, in one neutral exchange.
            </p>
            <div className="card" style={{ marginTop: 30, padding: 14, maxWidth: 660, boxShadow: "var(--sh-2)" }}>
              <div className="seg" style={{ marginBottom: 12 }}>
                <span className={deal === "lease" ? "on" : ""} onClick={() => setDeal("lease")} style={{ cursor: "pointer" }}>Lease</span>
                <span className={deal === "buy" ? "on" : ""} onClick={() => setDeal("buy")} style={{ cursor: "pointer" }}>Buy</span>
                <span className={deal === "req" ? "on" : ""} onClick={() => setDeal("req")} style={{ cursor: "pointer" }}>Post a requirement</span>
              </div>
              <form onSubmit={go} className="search focus" style={{ boxShadow: "none", border: "1px solid var(--azure)" }}>
                <span style={{ color: "var(--azure)" }}><Icon.search size={19} /></span>
                <input className="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={'Search by district, building or asset type, e.g. "Grade A office, Al Olaya"'} style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14.5, color: "var(--ink)", fontFamily: "var(--sans)" }} />
                <button type="submit" className="btn primary">Search</button>
              </form>
              <div className="row gap8 wrap" style={{ marginTop: 12 }}>
                <span className="tag">Popular:</span>
                <Link href={L("/listings?q=Al%20Olaya")} className="chip on" style={{ textDecoration: "none" }}>Office, Al Olaya</Link>
                <Link href={L("/listings?q=Tahlia")} className="chip" style={{ textDecoration: "none" }}>Retail, Tahlia</Link>
                <Link href={L("/listings?q=Industrial")} className="chip" style={{ textDecoration: "none" }}>Warehouse, 2nd Industrial</Link>
              </div>
            </div>
            <div className="row gap20 wrap" style={{ marginTop: 22, fontSize: 13, color: "var(--slate)" }}>
              <span className="row gap8"><span style={{ color: "var(--green)" }}><Icon.check size={16} /></span> Owners verified before listing</span>
              <span className="row gap8"><span style={{ color: "var(--green)" }}><Icon.check size={16} /></span> No assumed commission</span>
            </div>
            <div className="row gap8 wrap" style={{ marginTop: 18 }}>
              {["REGA-licensed", "PDPL-compliant", "Ejar-integrated", "100% verified"].map((t, i) => (
                <span key={i} className="tag" style={{ gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />{t}</span>
              ))}
            </div>
          </div>
          <div style={{ flex: "1 1 360px", maxWidth: 404, position: "relative" }}>
            <div className="card" style={{ position: "absolute", left: -10, top: 24, padding: "11px 14px", boxShadow: "var(--sh-2)", zIndex: 2 }}>
              <div className="mono" style={{ fontSize: 19, fontWeight: 500, color: "var(--green)" }}>+8.4%</div>
              <div className="muted" style={{ fontSize: 10.5, marginTop: 1 }}>Olaya Grade A, YoY</div>
            </div>
            <div className="map" style={{ height: 384, borderRadius: 18, border: "1px solid var(--silver)", boxShadow: "var(--sh-2)" }}>
              <div className="marea" style={{ left: "5%", top: "9%", width: 148, height: 116 }}><span>Al Olaya</span></div>
              <div className="marea b" style={{ left: "56%", top: "7%", width: 128, height: 98 }}><span>KAFD</span></div>
              <div className="marea" style={{ left: "30%", top: "56%", width: 158, height: 120 }}><span>Tahlia</span></div>
              <div className="road" style={{ left: 0, right: 0, top: "34%", height: 8 }} />
              <div className="road" style={{ left: 0, right: 0, top: "72%", height: 4 }} />
              <div className="road" style={{ top: 0, bottom: 0, left: "30%", width: 6 }} />
              <div className="metro" style={{ left: "-6%", right: "-6%", top: "50%", transform: "rotate(-7deg)" }} />
              <MarkPin featured price="1,450" style={{ left: "40%", top: "30%" }} />
              <MarkPin price="2,100" style={{ left: "70%", top: "21%" }} />
              <MarkPin price="1,180" style={{ left: "21%", top: "60%" }} />
              <MarkPin muted price="640" style={{ left: "48%", top: "80%" }} />
              <span className="tag" style={{ position: "absolute", left: 14, top: 14, background: "rgba(255,255,255,.94)", display: "flex", gap: 7, alignItems: "center", boxShadow: "var(--sh-1)" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)" }} />248 verified, Al Olaya</span>
            </div>
            <div className="card" style={{ position: "absolute", right: -12, bottom: -18, width: 232, padding: 14, boxShadow: "var(--sh-2)", zIndex: 2 }}><div className="row between"><Verified /><span className="muted2"><Icon.heart size={15} /></span></div><div className="price" style={{ marginTop: 8 }}>1,450 <small>SAR/m²·yr</small></div><div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>Grade A Office, Olaya Tower</div><div style={{ display: "flex", gap: 8, marginTop: 8, fontFamily: "var(--mono)", fontSize: 11, color: "var(--slate)" }}><span>Al Olaya</span><span>·</span><span>320 m²</span></div></div>
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
              [Icon.building, "Verified listings", "Direct from the verified owner, or SAT under mandate. No unverified broker listings."],
              [Icon.doc, "Requirements", "Occupiers post what they need; the right supply comes to them."],
              [Icon.chart, "Rent Index", "Decision-grade pricing and catchment data. Every figure sourced."],
              [Icon.user, "Representation", "An explicit, opt-in choice. Never a commission baked into a listing."],
            ].map((c, i) => { const I = c[0] as (p: { size?: number }) => JSX.Element; return (
              <div key={i} className="card pad" style={{ boxShadow: "none" }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: "var(--azure-wash)", color: "var(--azure-d)", display: "flex", alignItems: "center", justifyContent: "center" }}><I size={21} /></div>
                <div style={{ fontSize: 17, fontWeight: 600, margin: "16px 0 8px", letterSpacing: "-.01em" }}>{c[1] as string}</div>
                <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>{c[2] as string}</div>
              </div>
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
                <Ph label={f.ph} h={150} badges={[f.verified ? <Verified key="v" /> : null, <span key="t" className="tag" style={{ background: "rgba(255,255,255,.9)" }}>{f.type}</span>].filter(Boolean)} />
                <div className="body">
                  <div className="row between"><div className="price">{f.price}<small> SAR/m²·yr</small></div><span className="muted2"><Icon.heart size={17} /></span></div>
                  <div className="ttl">{f.title}</div>
                  <div className="meta"><span>{f.district}</span><i /><span>{f.area}</span><i /><span>{f.type}</span></div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div style={{ margin: "56px 24px 0", borderRadius: 18, background: "var(--ink)", color: "#fff", padding: "48px 40px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -20, bottom: -40, opacity: .35 }}><Mark size={300} base="#222A31" lit={HARBOR} /></div>
          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)", gap: 40, alignItems: "center" }}>
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
            <div className="card pad grow" style={{ borderColor: "var(--harbor)", minWidth: 280 }}>
              <span className="tag" style={{ color: "var(--harbor)", background: "rgba(58,110,165,.08)", borderColor: "rgba(58,110,165,.3)" }}>Path B, Opt-in</span>
              <div style={{ fontSize: 19, fontWeight: 600, margin: "14px 0 8px" }}>Appoint SAT to represent you</div>
              <div className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>An explicit mandate when you want SAT&apos;s brokers at the table. Clear terms, agreed before any fee applies.</div>
            </div>
          </div>
        </div>
        <div style={{ padding: "20px 24px 20px" }}>
          <div className="eyebrow" style={{ textAlign: "center" }}>One exchange</div>
          <h2 className="serif" style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 6px", textAlign: "center" }}>Everything the market needs, in one place</h2>
          <p className="muted" style={{ fontSize: 15.5, maxWidth: 600, margin: "0 auto", textAlign: "center" }}>Discovery, decision-grade data, AI and the full deal, for occupiers, owners, brokers and investors.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14, marginTop: 34 }}>
            {[
              [Icon.building, "Verified listings + map", "Permit and FAL-checked, with branded map search.", "h"],
              [Icon.chart, "Rent Index", "Decision-grade rents with the capped/open freeze lens.", "a"],
              [Icon.target, "Location Intelligence", "Footfall, catchment and co-tenancy. Sourced, not modelled.", ""],
              [Icon.coins, "Investment underwriting", "Yield, NOI and scenarios on verified comps.", "h"],
              [Icon.spark, "AI Advisor", "Conversational search and valuation, grounded in the Index.", "a"],
              [Icon.msg, "Bilingual listings", "Author in Arabic or English, verified mirror in both.", ""],
              [Icon.grid, "Owner dashboard", "Listing performance, leads and requirement matches.", "h"],
              [Icon.coins, "Membership plans", "Grades with clear quota caps; ZATCA invoicing.", "a"],
              [Icon.cal, "Deal rail", "Enquiry to viewing to offer to Ejar contract and escrow.", ""],
              [Icon.phone, "Mobile app", "The whole exchange, iOS and Android.", "h"],
              [Icon.shield, "Trust and compliance", "REGA, PDPL, AML and a checkable verification layer.", "a"],
              [Icon.headset, "Support and help", "AI and live support, with a full help center.", ""],
            ].map((m, i) => { const I = m[0] as (p: { size?: number }) => JSX.Element; const k = m[3] as string; return (
              <div key={i} className="card pad" style={{ boxShadow: "none" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: k === "a" ? "var(--azure-wash)" : k === "h" ? "#EAF0F7" : "var(--cool)", color: k === "a" ? "var(--azure-d)" : "var(--harbor)" }}><I size={20} /></div>
                <div style={{ fontSize: 15, fontWeight: 600, margin: "14px 0 5px", letterSpacing: "-.01em" }}>{m[1] as string}</div>
                <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.55 }}>{m[2] as string}</div>
              </div>
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
