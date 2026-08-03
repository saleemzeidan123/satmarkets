import { getDictionary } from "@/i18n/getDictionary";
import { isLocale } from "@/i18n/config";
import { localeMeta } from "@/lib/meta";
import { notFound } from "next/navigation";
import { Icon } from "@/components/satkit";
import { formatInteger, formatUnit } from "@/lib/format";
import ScrollRegion from "@/components/ScrollRegion";

type Tier = { nm: string; who: string; price: string; unit: string; feat: boolean; ghost?: boolean; cta: string; pts: string[] };

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 const d = getDictionary(params.locale === "ar" ? "ar" : "en").pricing;
 return localeMeta(params.locale, "/pricing", d.metaTitle, d.metaDesc);
}

export default async function PricingPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 if (!isLocale(params.locale)) notFound();
 const loc: "en" | "ar" = params.locale === "ar" ? "ar" : "en";
 const dict = getDictionary(loc);
 const p = dict.pricing;
 // Five tiers and sixteen comparison rows, every one of them written out twice,
 // once per language, inside this file: the largest duplicated block on any
 // public page and the one most likely to drift, because a price or a limit gets
 // edited in the language the editor happens to be reading. The tier names were
 // then written a THIRD time as the comparison table's column headings, so a
 // renamed tier could disagree with its own column. Names, limits and prices now
 // have one source each. The prices themselves go through formatInteger, so the
 // thousands separator in 2,900 comes from the numeral formatter rather than
 // from a hand-typed comma that only the English branch happened to carry.
 const perMonth = formatUnit("sar_month", loc, "short");
 const tiers: Tier[] = [
  { nm: p.tExplorer, who: p.whoExplorer, price: formatInteger(0, loc), unit: formatUnit("sar", loc), feat: false, ghost: true, cta: p.explorerCta,
   pts: [p.pE1, p.pE2, p.pE3, p.pE4, p.pE5] },
  { nm: p.tStarter, who: p.whoStarter, price: formatInteger(299, loc), unit: perMonth, feat: false, cta: p.ctaStarter,
   pts: [p.pS1, p.pS2, p.pS3, p.pS4, p.pS5] },
  { nm: p.tPro, who: p.whoPro, price: formatInteger(899, loc), unit: perMonth, feat: true, cta: p.ctaPro,
   pts: [p.pP1, p.pP2, p.pP3, p.pP4, p.pP5] },
  { nm: p.tAgency, who: p.whoAgency, price: formatInteger(2900, loc), unit: perMonth, feat: false, cta: p.ctaAgency,
   pts: [p.pA1, p.pA2, p.pA3, p.pA4, p.pA5] },
  { nm: p.tEnt, who: p.whoEnt, price: p.priceCustom, unit: "", feat: false, ghost: true, cta: p.ctaEnt,
   pts: [p.pN1, p.pN2, p.pN3, p.pN4, p.pN5] },
 ];
 const n = (v: number) => formatInteger(v, loc);
 const INF = p.vUnlimited;
 const matrix: string[][] = [
  ["grp", p.grpListings],
  [p.rowActiveListings, n(1), n(5), n(25), n(150), INF],
  [p.rowFeatured, "na", n(1), n(5), n(30), p.priceCustom],
  [p.rowRequirements, n(2), n(10), INF, INF, INF],
  ["grp", p.grpLeads],
  [p.rowReveals, n(5), n(50), INF, INF, INF],
  [p.rowLeadInbox, "no", "yes", "yes", "yes", "yes"],
  [p.rowSavedSearches, n(3), n(20), INF, INF, INF],
  ["grp", p.grpData],
  [p.rowRentIndex, p.vAverages, p.vFull, p.vFullHistory, p.vFullBulk, p.vFullFeed],
  [p.rowLocIntel, "na", n(2), n(10), n(50), INF],
  [p.rowAdvisor, n(10), n(100), n(500), n(2000), INF],
  [p.rowExport, "no", "yes", "yes", "yes", "yes"],
  ["grp", p.grpTeam],
  [p.rowSeats, n(1), n(2), n(5), n(15), INF],
  [p.rowApi, "no", "no", "no", p.vApiCalls, p.priceCustom],
  [p.rowSupport, p.vCommunity, p.vEmail, p.vPriority, p.vManager, p.vSlaManager],
 ];
 const heads = [p.tExplorer, p.tStarter, p.tPro, p.tAgency, p.tEnt];
 // "no" and "na" are both absences and both rendered from the same dictionary
 // string. The Arabic table used to spell one of them inline as "غير متاح" and
 // read the other from the dictionary, which is how the same cell meaning got
 // two spellings in one table.
 const cell = (v: string) => v === "yes" ? <span className="yes">✓</span> : (v === "no" || v === "na") ? <span className="no">{p.na}</span> : <span className="tnum">{v}</span>;
 return (
  <div style={{ background: "var(--paper)" }}>
   <div style={{ padding: "48px 24px 28px", textAlign: "center", background: "linear-gradient(180deg,var(--cool),var(--paper))" }}>
    <div className="eyebrow">{dict.pricing.membership}</div>
    <h1 className="serif" style={{ fontSize: "clamp(1.875rem,5vw,2.5rem)", fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 0" }}>{dict.pricing.h1}</h1>
    <p className="muted" style={{ fontSize: "0.96875rem", maxWidth: 560, margin: "14px auto 0" }}>{dict.pricing.sub}</p>
    <div className="seg" style={{ display: "inline-flex", marginTop: 22 }}><span className="on">{dict.pricing.monthly}</span><span>{dict.pricing.annual}</span></div>
   </div>
   <div style={{ maxWidth: 1360, margin: "0 auto" }}>
    <div className="tier-grid" style={{ padding: "14px 24px 8px" }}>
     {tiers.map((t, i) => (
      <div key={i} className={"tier" + (t.feat ? " feat" : "")}>
       {t.feat && <span className="ribbon">{dict.pricing.mostPopular}</span>}
       <div className="nm">{t.nm}</div>
       <div className="who">{t.who}</div>
       <div className="price">{t.price}{t.unit && <small> {t.unit}</small>}</div>
       <ul>
        {t.pts.map((p, j) => <li key={j}><span className="ck"><Icon.check size={14} /></span><span dangerouslySetInnerHTML={{ __html: p }} /></li>)}
       </ul>
       <div style={{ flex: 1 }} />
       <span className={"btn " + (t.ghost ? "secondary" : "primary")} style={{ justifyContent: "center", marginTop: 20 }}>{t.cta}</span>
      </div>
     ))}
    </div>
    <p className="muted" style={{ textAlign: "center", fontSize: "0.75rem", margin: "10px 0 0" }}>{dict.pricing.vatNote}</p>

    <div style={{ padding: "36px 24px 48px" }}>
     <h2 className="serif" style={{ fontSize: "1.5rem", fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 16px" }}>{dict.pricing.compareLimits}</h2>
     <div className="card" style={{ overflow: "hidden", boxShadow: "none" }}>
      <ScrollRegion label={dict.pricing.compareLimits}>
       <table className="matrix">
        <caption className="sronly">{dict.pricing.compareLimits}</caption>
        <thead><tr><th scope="col"></th><th scope="col">{heads[0]}</th><th scope="col">{heads[1]}</th><th scope="col" style={{ color: "var(--azure-d)" }}>{heads[2]}</th><th scope="col">{heads[3]}</th><th scope="col">{heads[4]}</th></tr></thead>
        <tbody>
         {matrix.map((r, i) => r[0] === "grp"
          ? <tr key={i} className="grp"><td colSpan={6}>{r[1]}</td></tr>
          : <tr key={i}><th scope="row">{r[0]}</th>{r.slice(1).map((v, j) => <td key={j}>{cell(v)}</td>)}</tr>)}
        </tbody>
       </table>
      </ScrollRegion>
     </div>
    </div>
   </div>
  </div>
 );
}
