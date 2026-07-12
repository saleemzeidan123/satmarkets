import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel, gradeLabel, fitoutLabel, dealLabel, cityLabel } from "@/lib/labels";
import LocationScore from "@/components/LocationScore";
import JsonLd, { SITE } from "@/components/JsonLd";
import { Photo, Verified, Icon } from "@/components/satkit";
import { photoFor } from "@/lib/photos";
import ListingEnquiry from "@/components/ListingEnquiry";
import ContactBar from "@/components/ContactBar";
import SaveButton from "@/components/SaveButton";
import { pickIndexRow, marketVerdict } from "@/lib/market/verdict";
import { getListingById } from "@/lib/queries/listings";
import { getDictionary } from "@/i18n/getDictionary";

export async function generateMetadata({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) return {};
  const loc = (params.locale === "ar" ? "ar" : "en") as "en" | "ar";
  const dict = getDictionary(loc);
  const ar = loc === "ar";
  const l: any = await getListingById(params.id);
  if (!l) return { title: dict.ld.notFoundTitle };
  const dn = l.districts ? (ar ? l.districts.name_ar : l.districts.name_en) : (dict.ld.riyadh);
  const type = assetLabel(l.asset_type, loc);
  const grade = gradeLabel(l.building_grade, loc);
  const t0 = (ar ? l.title_ar : l.title_en) || l.reference_code;
  const lease = l.deal_type === "lease";
  const price = lease ? l.asking_rent_sqm : l.sale_price;
  const priceStr = price != null ? `${Number(price).toLocaleString("en-US")} ${lease ? (ar ? "ريال/م²·سنة" : "SAR/m²·yr") : (ar ? "ريال" : "SAR")}` : (dict.ld.onRequest);
  const inDn = String(t0).includes(dn) ? "" : (ar ? ` في ${dn}` : ` in ${dn}`);
  const title = ar ? `${t0}، ${type}${inDn} | سات ماركتس` : `${t0}, ${type}${inDn} | SAT Markets`;
  const description = ar
    ? `${type} ${grade} في ${dn}، ${l.area_sqm} م²، ${priceStr}. عرض موثّق من المالك على سات ماركتس، مدعوم بمؤشر الإيجارات المنشور. استرشادي وليس نصيحة.`
    : `${grade} ${type} in ${dn}, ${l.area_sqm} m², ${priceStr}. Owner-verified listing on SAT Markets, backed by the published Rent Index. Indicative, not advice.`;
  const url = `${SITE}/${params.locale}/listings/${params.id}`;
  return { title, description, alternates: { canonical: url, languages: { en: `${SITE}/en/listings/${params.id}`, ar: `${SITE}/ar/listings/${params.id}` } }, openGraph: { title, description, url, type: "website" } };
}

export default async function ListingDetail({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale; const ar = locale === "ar";
  const dict = getDictionary(locale as "en" | "ar");
  const sb = getSupabaseServer();
  const l: any = await getListingById(params.id);
  if (!l) return <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 24px" }} className="muted">{dict.ld.notFound}</div>;
  const dn = l.districts ? (ar ? l.districts.name_ar : l.districts.name_en) : (dict.ld.riyadh);
  const dnAr = l.districts ? (l.districts.name_ar || l.districts.name_en) : "الرياض";
  const city = l.districts && l.districts.city ? cityLabel(l.districts.city, locale) : (dict.ld.riyadh);
  const cityEn = l.districts && l.districts.city ? cityLabel(l.districts.city, "en") : "Riyadh";
  const type = assetLabel(l.asset_type, locale);
  const lease = l.deal_type === "lease";
  const price = lease ? l.asking_rent_sqm : l.sale_price;
  const title = (ar ? l.title_ar : l.title_en) || l.reference_code;
  const kindFor = (a: string) => a;
  const hours = [3, 2, 4, 7, 11, 15, 17, 18, 16, 17, 15, 9, 5];
  const L = (p: string) => `/${locale}${p}`;

  // Rent Index context, grounded in the published bands (same engine as the listings cards and compare page)
  let verdict: any = null;
  if (sb && l.district_id) {
    const { data: irows } = await sb.from("rent_index_published").select("asset_type,segment,unit,band_low,median,band_high,period,sufficient,district_label,district_label_ar").eq("district_id", l.district_id).eq("sufficient", true);
    const row = pickIndexRow((irows ?? []) as any, l.asset_type, l.building_grade);
    verdict = marketVerdict(lease ? (l.asking_rent_sqm ?? null) : null, row, String(dn), String(dnAr));
  }
  const band = verdict && verdict.status !== "na" && verdict.median != null && verdict.band_low != null && verdict.band_high != null && lease && l.asking_rent_sqm != null ? (() => {
    const lo = Number(verdict.band_low), hi = Number(verdict.band_high), med = Number(verdict.median), ask = Number(l.asking_rent_sqm);
    const dmin = Math.min(lo, ask), dmax = Math.max(hi, ask);
    const pad = (dmax - dmin) * 0.14 || Math.max(1, dmax * 0.1);
    const a = dmin - pad, b = dmax + pad;
    const pct = (v: number) => Math.max(2, Math.min(98, ((v - a) / (b - a)) * 100));
    const color = verdict.status === "below" ? "#1F8A5B" : verdict.status === "above" ? "#8A5A1F" : "#3A6EA5";
    return { lo, hi, med, ask, pctLo: pct(lo), pctHi: pct(hi), pctMed: pct(med), pctAsk: pct(ask), color };
  })() : null;

  // Similar verified spaces: same district first, then fall back to the same asset type
  let similar: any[] = [];
  if (sb) {
    const cols = "id,title_en,title_ar,reference_code,asset_type,building_grade,area_sqm,deal_type,asking_rent_sqm,sale_price, districts(name_en,name_ar)";
    if (l.district_id) {
      const { data: sim } = await sb.from("listings").select(cols).eq("status", "published").eq("district_id", l.district_id).neq("id", l.id).limit(6);
      similar = sim ?? [];
    }
    if (similar.length < 3) {
      const { data: sim2 } = await sb.from("listings").select(cols).eq("status", "published").eq("asset_type", l.asset_type).neq("id", l.id).limit(8);
      const seen = new Set(similar.map((x: any) => x.id));
      (sim2 ?? []).forEach((x: any) => { if (!seen.has(x.id) && similar.length < 4) { seen.add(x.id); similar.push(x); } });
    }
    similar = similar.slice(0, 4);
  }

  return (
    <div style={{ fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <div className="row between wrap" style={{ padding: "14px 24px", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 10 }}>
        <Link href={L("/listings")} className="mono muted" style={{ fontSize: 11.5, letterSpacing: ".06em", textDecoration: "none" }}>{ar ? "→" : "←"} {dict.ld.crumbListingsUpper} / {String(dn).toUpperCase()} / {type.toUpperCase()}</Link>
        <div className="row gap10"><Link href={L(`/listings/${l.id}/flyer`)} className="chip" style={{ textDecoration: "none" }}><Icon.doc size={15} /> {dict.ld.flyerPdf}</Link><SaveButton id={l.id} locale={locale} /><span className="chip"><Icon.arrow size={15} /> {dict.ld.share}</span></div>
      </div>
      <div className="satmkt-2col" style={{ maxWidth: 1280, margin: "0 auto", padding: 24, display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: 32 }}>
        <div>
          <Photo src={photoFor(l.asset_type, l.id)} kind={kindFor(l.asset_type)} label={`${type}, ${dn}`} h={360} fav badges={[<Verified key="v" text={dict.ld.verifiedOwner} />, <span key="f" className="freeze open"><span className="dot" />{dict.ld.openFirstLease}</span>]} />
          <div className="row gap10 wrap" style={{ marginTop: 18 }}>
            <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>{type} · {dealLabel(l.deal_type, locale)}</span>
            <span className="tag">{gradeLabel(l.building_grade, locale)}</span>
            <span className="tag">{fitoutLabel(l.fitout_condition, locale)}</span>
            <span className="tag">{dict.ld.availableNow}</span>
          </div>
          <h1 className="serif" style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-.02em", margin: "14px 0 0" }}>{title}</h1>
          <div className="row gap10 wrap" style={{ marginTop: 10, color: "var(--slate)", fontSize: 14 }}>
            <span className="row gap6"><Icon.pin size={16} /> {dn}{ar ? "، " : ", "}{city}</span><span>·</span><span><bdi dir="ltr">{l.area_sqm} m²</bdi></span>
          </div>
          <JsonLd data={{
            "@type": "RealEstateListing",
            name: title,
            url: `${SITE}/${locale}/listings/${l.id}`,
            inLanguage: ar ? "ar" : "en",
            provider: { "@type": "Organization", name: "SAT Markets", url: SITE },
            // SM-P1-004: a lease price here is SAR per square metre PER YEAR, not a
            // total. Emitting it as a flat offers.price told Google (and any other
            // consumer) that a 2,600 SAR/m2/yr office costs 2,600 SAR. A rate needs
            // UnitPriceSpecification with the unit and the billing period; only an
            // outright sale price is a plain price.
            ...(price != null
              ? {
                  offers: lease
                    ? {
                        "@type": "Offer",
                        priceCurrency: "SAR",
                        priceSpecification: {
                          "@type": "UnitPriceSpecification",
                          price: Number(price),
                          priceCurrency: "SAR",
                          unitCode: "MTK",              // square metre
                          unitText: "SAR per square metre per year",
                          billingDuration: 1,
                          billingIncrement: 1,
                          referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "ANN" },
                        },
                      }
                    : { "@type": "Offer", price: Number(price), priceCurrency: "SAR", description: "Asking sale price, SAR" },
                }
              : {}),
            ...(l.area_sqm ? { floorSize: { "@type": "QuantitativeValue", value: l.area_sqm, unitCode: "MTK" } } : {}),
            address: { "@type": "PostalAddress", streetAddress: String(dn), addressLocality: cityEn, addressCountry: "SA" },
          }} />
          <JsonLd data={{ "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: dict.ld.crumbHome, item: `${SITE}/${locale}` },
            { "@type": "ListItem", position: 2, name: dict.ld.crumbListings, item: `${SITE}/${locale}/listings` },
            ...(l.district_id ? [{ "@type": "ListItem", position: 3, name: String(dn), item: `${SITE}/${locale}/listings?district=${l.district_id}` }] : []),
            { "@type": "ListItem", position: l.district_id ? 4 : 3, name: title, item: `${SITE}/${locale}/listings/${l.id}` },
          ] }} />
          <div className="tabs" style={{ marginTop: 22 }}>
            <a href="#ov" className="t on" style={{ textDecoration: "none" }}><Icon.doc size={15} /> {dict.ld.overview}</a>
            <a href="#loc" className="t" style={{ textDecoration: "none" }}><Icon.target size={15} /> {dict.ld.locationIntel}</a>
            <Link href={L("/invest")} className="t" style={{ textDecoration: "none" }}><Icon.coins size={15} /> {dict.ld.investment}</Link>
            <a href="#comps" className="t" style={{ textDecoration: "none" }}><Icon.chart size={15} /> {dict.ld.comparableRents}</a>
          </div>
          <div id="ov" style={{ scrollMarginTop: 80, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 16, marginTop: 22 }}>
            {[[dict.ld.area, `${l.area_sqm} m²`], [dict.ld.grade, gradeLabel(l.building_grade, locale)], [dict.ld.fitout, fitoutLabel(l.fitout_condition, locale)], [lease ? (dict.ld.asking) : (dict.ld.price), price != null ? Number(price).toLocaleString() + (lease ? (ar ? " ريال/م²·سنة" : " SAR/m²·yr") : (ar ? " ريال" : " SAR")) : (dict.ld.onRequest)]].map((s, i) => (
              <div key={i} className="card pad" style={{ boxShadow: "none", padding: 16 }}>
                <div className="muted" style={{ fontSize: 11.5 }}>{s[0]}</div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 500, marginTop: 8 }}>{s[1]}</div>
              </div>
            ))}
          </div>
          {(ar ? l.description_ar : l.description_en) && <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.7, maxWidth: 640, marginTop: 22 }}>{ar ? l.description_ar : l.description_en}</p>}
          <div id="comps" className="card pad" style={{ scrollMarginTop: 80, marginTop: 22, background: "var(--cool)", boxShadow: "none" }}>
            <div className="eyebrow">{dict.ld.pricedInContext}</div>
            {band ? (
              <>
                <div style={{ position: "relative", height: 76, marginTop: 26 }}>
                  <div style={{ position: "absolute", left: "0%", right: "0%", top: 46, height: 8, borderRadius: 6, background: "var(--silver)" }} />
                  <div style={{ position: "absolute", top: 46, height: 8, borderRadius: 6, left: band.pctLo + "%", width: (band.pctHi - band.pctLo) + "%", background: "rgba(58,110,165,.20)", border: "1px solid rgba(58,110,165,.45)" }} />
                  <div style={{ position: "absolute", top: 40, left: band.pctMed + "%", width: 2, height: 20, marginLeft: -1, background: "#3A6EA5" }} />
                  <span className="mono" style={{ position: "absolute", top: 62, left: band.pctLo + "%", transform: "translateX(-50%)", fontSize: 10, color: "var(--slate-2)", whiteSpace: "nowrap" }}>{Math.round(band.lo).toLocaleString()}</span>
                  <span className="mono" style={{ position: "absolute", top: 62, left: band.pctMed + "%", transform: "translateX(-50%)", fontSize: 10.5, color: "var(--slate)", whiteSpace: "nowrap" }}>{dict.ld.median} {Math.round(band.med).toLocaleString()}</span>
                  <span className="mono" style={{ position: "absolute", top: 62, left: band.pctHi + "%", transform: "translateX(-50%)", fontSize: 10, color: "var(--slate-2)", whiteSpace: "nowrap" }}>{Math.round(band.hi).toLocaleString()}</span>
                  <div style={{ position: "absolute", top: 4, left: band.pctAsk + "%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: band.color, whiteSpace: "nowrap" }}>{Math.round(band.ask).toLocaleString()}</span>
                    <span style={{ fontSize: 9.5, color: "var(--slate)", whiteSpace: "nowrap" }}>{dict.ld.thisSpace}</span>
                    <span style={{ width: 13, height: 13, borderRadius: 999, background: band.color, border: "2.5px solid #fff", boxShadow: "var(--sh-1)", marginTop: 3 }} />
                  </div>
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 18, color: "var(--ink)", maxWidth: 560 }}>{ar ? verdict.line_ar : verdict.line_en}</p>
              </>
            ) : (
              <p className="muted" style={{ fontSize: 14, marginTop: 12, lineHeight: 1.6, maxWidth: 460 }}>{lease ? (dict.ld.noBandLease) : (dict.ld.noBandSale)} <Link href={L("/advisor")} style={{ color: "var(--harbor)", fontWeight: 600, textDecoration: "none" }}>{dict.ld.askAdvisor}</Link></p>
            )}
            <div className="muted" style={{ fontSize: 11, marginTop: 16 }}>{dict.ld.bandsDisclaimer}</div>
          </div>
          <LocationScore ar={ar} district={String(dn)} assetType={l.asset_type} dealType={l.deal_type} price={price != null ? Number(price) : null} areaSqm={l.area_sqm ?? null} />
          <div id="loc" className="card pad" style={{ scrollMarginTop: 80, marginTop: 18, boxShadow: "none" }}>
            <div className="modhead"><Icon.target size={18} /><span className="ttl">{dict.ld.locationIntel}</span><span className="grow" /><span className="tag">{dict.ld.sample}</span></div>
            <div className="satmkt-2col" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 20, alignItems: "center" }}>
              <div className="map" style={{ height: 200, borderRadius: 11, border: "1px solid var(--silver)", position: "relative" }}>
                <div className="iso r3" style={{ left: "50%", top: "52%", width: 180, height: 180 }} />
                <div className="iso r2" style={{ left: "50%", top: "52%", width: 120, height: 120 }} />
                <div className="iso r1" style={{ left: "50%", top: "52%", width: 66, height: 66 }} />
                <div className="isodot" style={{ left: "50%", top: "52%" }} />
                <span className="tag" style={{ position: "absolute", insetInlineStart: 12, top: 12 }}>{dict.ld.driveTime}</span>
              </div>
              <div className="col" style={{ gap: 18 }}>
                <div className="row gap20">
                  <div className="kpi"><span className="v tnum">412k</span><span className="l">{dict.ld.daytimePopulation}</span></div>
                  <div className="kpi"><span className="v tnum">+18%</span><span className="l">{dict.ld.footfallVsDistrict}</span></div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>{dict.ld.weekdayFootfall}</div>
                  <div className="hours">{hours.map((h, i) => <div key={i} className={"h" + (h >= 16 ? " pk" : "")} style={{ height: (h / 18 * 100) + "%" }} />)}</div>
                </div>
              </div>
            </div>
          </div>
          {similar.length > 0 && (
            <div style={{ marginTop: 26 }}>
              <div className="modhead"><Icon.building size={18} /><span className="ttl">{dict.ld.similarSpaces}</span><span className="grow" /><Link href={L(`/listings${l.district_id ? `?district=${l.district_id}` : ""}`)} className="muted" style={{ fontSize: 12.5, textDecoration: "none" }}>{dict.ld.seeAll}</Link></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginTop: 14 }}>
                {similar.map((s: any) => {
                  const sdn = s.districts ? (ar ? s.districts.name_ar : s.districts.name_en) : dn;
                  const sp = s.deal_type === "lease" ? s.asking_rent_sqm : s.sale_price;
                  return (
                    <Link key={s.id} href={L(`/listings/${s.id}`)} className="listing" style={{ textDecoration: "none", color: "inherit" }}>
                      <Photo src={photoFor(s.asset_type, s.id)} kind={s.asset_type} alt={`${assetLabel(s.asset_type, locale)}, ${sdn}`} h={104} />
                      <div className="body" style={{ padding: "10px 12px 12px" }}>
                        <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{sp != null ? Number(sp).toLocaleString() : (dict.ld.onRequest)}<small style={{ fontWeight: 400, color: "var(--slate)" }}>{sp != null ? (s.deal_type === "lease" ? (ar ? " ريال/م²·سنة" : " SAR/m²·yr") : (ar ? " ريال" : " SAR")) : ""}</small></div>
                        <div style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.35 }}>{(ar ? s.title_ar : s.title_en) || s.reference_code}</div>
                        <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>{sdn} · <bdi dir="ltr">{s.area_sqm} m²</bdi></div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div>
          <ListingEnquiry assetType={l.asset_type} satListed={!!l.is_sat_listed} listingId={l.id} price={price != null ? Number(price) : null} lease={lease} unit={lease ? (ar ? "ريال/م²·سنة" : "SAR/m²·yr") : (ar ? "ريال" : "SAR")} type={type} area={l.area_sqm} district={String(dn)} locale={locale} permit={l.ad_permit_no} contact={{ phone: l.contact_phone || process.env.NEXT_PUBLIC_CONTACT_PHONE || null, email: l.contact_email || null, channels: Array.isArray(l.contact_channels) ? l.contact_channels : [], refCode: l.reference_code || "", title, url: `${SITE}/${locale}/listings/${l.id}`, messageHref: `/${locale}/messages` }} />
          <ContactBar phone={l.contact_phone || process.env.NEXT_PUBLIC_CONTACT_PHONE || null} email={l.contact_email || null} channels={Array.isArray(l.contact_channels) ? l.contact_channels : []} refCode={l.reference_code || ""} title={title} url={`${SITE}/${locale}/listings/${l.id}`} messageHref={`/${locale}/messages`} ar={ar} />
        </div>
      </div>
    </div>
  );
}
