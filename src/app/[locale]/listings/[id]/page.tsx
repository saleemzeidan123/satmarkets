import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel, gradeLabel, fitoutLabel } from "@/lib/labels";
import LocationScore from "@/components/LocationScore";
import JsonLd, { SITE } from "@/components/JsonLd";
import { Photo, Verified, Icon } from "@/components/satkit";
import { photoFor } from "@/lib/photos";
import ListingEnquiry from "@/components/ListingEnquiry";

export default async function ListingDetail({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale; const ar = locale === "ar";
  const sb = getSupabaseServer();
  let l: any = null;
  if (sb) { const { data } = await sb.from("listings").select("*, districts(name_en,name_ar,city)").eq("id", params.id).single(); l = data; }
  if (!l) return <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 24px" }} className="muted">Listing not found.</div>;
  const dn = l.districts ? (ar ? l.districts.name_ar : l.districts.name_en) : "Riyadh";
  const type = assetLabel(l.asset_type, locale);
  const lease = l.deal_type === "lease";
  const price = lease ? l.asking_rent_sqm : l.sale_price;
  const title = (ar ? l.title_ar : l.title_en) || l.reference_code;
  const kindFor = (a: string) => (a === "retail" || a === "showroom" ? "retail" : a === "warehouse" ? "warehouse" : "office");
  const hours = [3, 2, 4, 7, 11, 15, 17, 18, 16, 17, 15, 9, 5];
  const bars = [62, 70, 78, 92, 74, 58];
  const L = (p: string) => `/${locale}${p}`;
  return (
    <div style={{ fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <div className="row between wrap" style={{ padding: "14px 24px", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 10 }}>
        <Link href={L("/listings")} className="mono muted" style={{ fontSize: 11.5, letterSpacing: ".06em", textDecoration: "none" }}>{"←"} LISTINGS / {String(dn).toUpperCase()} / {type.toUpperCase()}</Link>
        <div className="row gap10"><span className="chip"><Icon.heart size={15} /> Save</span><span className="chip"><Icon.arrow size={15} /> Share</span></div>
      </div>
      <div className="satmkt-2col" style={{ maxWidth: 1280, margin: "0 auto", padding: 24, display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: 32 }}>
        <div>
          <Photo src={photoFor(l.asset_type, l.id)} kind={kindFor(l.asset_type)} label={`${type}, ${dn}`} h={360} fav badges={[<Verified key="v" />, <span key="f" className="freeze open"><span className="dot" />Open · first-lease</span>]} />
          <div className="row gap10 wrap" style={{ marginTop: 18 }}>
            <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>{type} · {lease ? "Lease" : "Sale"}</span>
            <span className="tag">{gradeLabel(l.building_grade, locale)}</span>
            <span className="tag">{fitoutLabel(l.fitout_condition, locale)}</span>
            <span className="tag">Available now</span>
          </div>
          <h1 className="serif" style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-.02em", margin: "14px 0 0" }}>{title}</h1>
          <div className="row gap10 wrap" style={{ marginTop: 10, color: "var(--slate)", fontSize: 14 }}>
            <span className="row gap6"><Icon.pin size={16} /> {dn}, Riyadh</span><span>·</span><span>{l.area_sqm} m²</span>
          </div>
          <JsonLd data={{
            "@type": "RealEstateListing",
            name: title,
            url: `${SITE}/${locale}/listings/${l.id}`,
            inLanguage: ar ? "ar" : "en",
            provider: { "@type": "Organization", name: "SAT Markets", url: SITE },
            ...(price != null ? { offers: { "@type": "Offer", price: Number(price), priceCurrency: "SAR", description: lease ? "Asking rent, SAR per square metre per year" : "Asking sale price, SAR" } } : {}),
            ...(l.area_sqm ? { floorSize: { "@type": "QuantitativeValue", value: l.area_sqm, unitCode: "MTK" } } : {}),
            address: { "@type": "PostalAddress", addressLocality: "Riyadh", addressRegion: String(dn), addressCountry: "SA" },
          }} />
          <div className="tabs" style={{ marginTop: 22 }}>
            <a href="#ov" className="t on" style={{ textDecoration: "none" }}><Icon.doc size={15} /> Overview</a>
            <a href="#loc" className="t" style={{ textDecoration: "none" }}><Icon.target size={15} /> Location intelligence</a>
            <Link href={L("/invest")} className="t" style={{ textDecoration: "none" }}><Icon.coins size={15} /> Investment</Link>
            <a href="#comps" className="t" style={{ textDecoration: "none" }}><Icon.chart size={15} /> Comparable rents</a>
          </div>
          <div id="ov" style={{ scrollMarginTop: 80, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 16, marginTop: 22 }}>
            {[["Area", `${l.area_sqm} m²`], ["Grade", gradeLabel(l.building_grade, locale)], ["Fit-out", fitoutLabel(l.fitout_condition, locale)], [lease ? "Asking" : "Price", price != null ? Number(price).toLocaleString() + (lease ? " SAR/m²·yr" : " SAR") : "On request"]].map((s, i) => (
              <div key={i} className="card pad" style={{ boxShadow: "none", padding: 16 }}>
                <div className="muted" style={{ fontSize: 11.5 }}>{s[0]}</div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 500, marginTop: 8 }}>{s[1]}</div>
              </div>
            ))}
          </div>
          {(ar ? l.description_ar : l.description_en) && <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.7, maxWidth: 640, marginTop: 22 }}>{ar ? l.description_ar : l.description_en}</p>}
          <div id="comps" className="card pad" style={{ scrollMarginTop: 80, marginTop: 22, background: "var(--cool)", boxShadow: "none" }}>
            <div className="row between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div className="eyebrow">Priced in context · SAT Rent Index <span className="tag" style={{ marginLeft: 8 }}>sample</span></div>
                <p className="muted" style={{ fontSize: 14, marginTop: 8, maxWidth: 340, lineHeight: 1.6 }}>How this asking rent sits against comparable transactions in {dn}.</p>
              </div>
              <div className="bars" style={{ width: 210, height: 120 }}>
                {bars.map((b, i) => (<div key={i} className={"b" + (i === 3 ? " hi" : "")} style={{ height: b + "%" }}><span className="v">{1180 + i * 70}</span></div>))}
              </div>
            </div>
          </div>
          <LocationScore ar={ar} district={String(dn)} assetType={l.asset_type} />
          <div id="loc" className="card pad" style={{ scrollMarginTop: 80, marginTop: 18, boxShadow: "none" }}>
            <div className="modhead"><Icon.target size={18} /><span className="ttl">Location intelligence</span><span className="grow" /><span className="tag">sample</span></div>
            <div className="satmkt-2col" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 20, alignItems: "center" }}>
              <div className="map" style={{ height: 200, borderRadius: 11, border: "1px solid var(--silver)", position: "relative" }}>
                <div className="iso r3" style={{ left: "50%", top: "52%", width: 180, height: 180 }} />
                <div className="iso r2" style={{ left: "50%", top: "52%", width: 120, height: 120 }} />
                <div className="iso r1" style={{ left: "50%", top: "52%", width: 66, height: 66 }} />
                <div className="isodot" style={{ left: "50%", top: "52%" }} />
                <span className="tag" style={{ position: "absolute", left: 12, top: 12 }}>Drive-time · 5 / 10 / 15 min</span>
              </div>
              <div className="col" style={{ gap: 18 }}>
                <div className="row gap20">
                  <div className="kpi"><span className="v tnum">412k</span><span className="l">Daytime population</span></div>
                  <div className="kpi"><span className="v tnum">+18%</span><span className="l">Footfall vs district avg</span></div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>Weekday footfall by hour</div>
                  <div className="hours">{hours.map((h, i) => <div key={i} className={"h" + (h >= 16 ? " pk" : "")} style={{ height: (h / 18 * 100) + "%" }} />)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <ListingEnquiry listingId={l.id} price={price != null ? Number(price) : null} lease={lease} unit={lease ? "SAR/m\u00b2\u00b7yr" : "SAR"} type={type} area={l.area_sqm} district={String(dn)} locale={locale} permit={l.ad_permit_no} />
        </div>
      </div>
    </div>
  );
}
