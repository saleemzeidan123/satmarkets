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

export async function generateMetadata({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) return {};
  const loc = (params.locale === "ar" ? "ar" : "en") as "en" | "ar";
  const ar = loc === "ar";
  const sb = getSupabaseServer();
  let l: any = null;
  if (sb) { const { data } = await sb.from("listings").select("title_en,title_ar,reference_code,asset_type,building_grade,deal_type,area_sqm,asking_rent_sqm,sale_price,districts(name_en,name_ar,city)").eq("id", params.id).single(); l = data; }
  if (!l) return { title: ar ? "العرض غير موجود | سات ماركتس" : "Listing not found | SAT Markets" };
  const dn = l.districts ? (ar ? l.districts.name_ar : l.districts.name_en) : (ar ? "الرياض" : "Riyadh");
  const type = assetLabel(l.asset_type, loc);
  const grade = gradeLabel(l.building_grade, loc);
  const t0 = (ar ? l.title_ar : l.title_en) || l.reference_code;
  const lease = l.deal_type === "lease";
  const price = lease ? l.asking_rent_sqm : l.sale_price;
  const priceStr = price != null ? `${Number(price).toLocaleString("en-US")} ${lease ? (ar ? "ريال/م²·سنة" : "SAR/m²·yr") : (ar ? "ريال" : "SAR")}` : (ar ? "عند الطلب" : "On request");
  const title = ar ? `${t0}، ${type} في ${dn} | سات ماركتس` : `${t0}, ${type} in ${dn} | SAT Markets`;
  const description = ar
    ? `${type} ${grade} في ${dn}، ${l.area_sqm} م²، ${priceStr}. عرض موثّق من المالك على سات ماركتس، مدعوم بمؤشر الإيجارات المنشور. استرشادي وليس نصيحة.`
    : `${grade} ${type} in ${dn}, ${l.area_sqm} m², ${priceStr}. Owner-verified listing on SAT Markets, backed by the published Rent Index. Indicative, not advice.`;
  const url = `${SITE}/${params.locale}/listings/${params.id}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "website" } };
}

export default async function ListingDetail({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale; const ar = locale === "ar";
  const sb = getSupabaseServer();
  let l: any = null;
  if (sb) { const { data } = await sb.from("listings").select("*, districts(name_en,name_ar,city)").eq("id", params.id).single(); l = data; }
  if (!l) return <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 24px" }} className="muted">{params.locale === "ar" ? "العرض غير موجود." : "Listing not found."}</div>;
  const dn = l.districts ? (ar ? l.districts.name_ar : l.districts.name_en) : (ar ? "الرياض" : "Riyadh");
  const city = l.districts && l.districts.city ? cityLabel(l.districts.city, locale) : (ar ? "الرياض" : "Riyadh");
  const cityEn = l.districts && l.districts.city ? cityLabel(l.districts.city, "en") : "Riyadh";
  const type = assetLabel(l.asset_type, locale);
  const lease = l.deal_type === "lease";
  const price = lease ? l.asking_rent_sqm : l.sale_price;
  const title = (ar ? l.title_ar : l.title_en) || l.reference_code;
  const kindFor = (a: string) => a;
  const hours = [3, 2, 4, 7, 11, 15, 17, 18, 16, 17, 15, 9, 5];
  const bars = [62, 70, 78, 92, 74, 58];
  const L = (p: string) => `/${locale}${p}`;
  return (
    <div style={{ fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <div className="row between wrap" style={{ padding: "14px 24px", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 10 }}>
        <Link href={L("/listings")} className="mono muted" style={{ fontSize: 11.5, letterSpacing: ".06em", textDecoration: "none" }}>{"←"} {ar ? "العروض" : "LISTINGS"} / {String(dn).toUpperCase()} / {type.toUpperCase()}</Link>
        <div className="row gap10"><Link href={L(`/listings/${l.id}/flyer`)} className="chip" style={{ textDecoration: "none" }}><Icon.doc size={15} /> {ar ? "ملف PDF" : "Flyer / PDF"}</Link><span className="chip"><Icon.heart size={15} /> {ar ? "حفظ" : "Save"}</span><span className="chip"><Icon.arrow size={15} /> {ar ? "مشاركة" : "Share"}</span></div>
      </div>
      <div className="satmkt-2col" style={{ maxWidth: 1280, margin: "0 auto", padding: 24, display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: 32 }}>
        <div>
          <Photo src={photoFor(l.asset_type, l.id)} kind={kindFor(l.asset_type)} label={`${type}, ${dn}`} h={360} fav badges={[<Verified key="v" text={ar ? "مالك موثّق" : "Verified owner"} />, <span key="f" className="freeze open"><span className="dot" />{ar ? "مفتوح · تأجير أول" : "Open · first-lease"}</span>]} />
          <div className="row gap10 wrap" style={{ marginTop: 18 }}>
            <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>{type} · {dealLabel(l.deal_type, locale)}</span>
            <span className="tag">{gradeLabel(l.building_grade, locale)}</span>
            <span className="tag">{fitoutLabel(l.fitout_condition, locale)}</span>
            <span className="tag">{ar ? "متاح الآن" : "Available now"}</span>
          </div>
          <h1 className="serif" style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-.02em", margin: "14px 0 0" }}>{title}</h1>
          <div className="row gap10 wrap" style={{ marginTop: 10, color: "var(--slate)", fontSize: 14 }}>
            <span className="row gap6"><Icon.pin size={16} /> {dn}{ar ? "، " : ", "}{city}</span><span>·</span><span>{l.area_sqm} m²</span>
          </div>
          <JsonLd data={{
            "@type": "RealEstateListing",
            name: title,
            url: `${SITE}/${locale}/listings/${l.id}`,
            inLanguage: ar ? "ar" : "en",
            provider: { "@type": "Organization", name: "SAT Markets", url: SITE },
            ...(price != null ? { offers: { "@type": "Offer", price: Number(price), priceCurrency: "SAR", description: lease ? "Asking rent, SAR per square metre per year" : "Asking sale price, SAR" } } : {}),
            ...(l.area_sqm ? { floorSize: { "@type": "QuantitativeValue", value: l.area_sqm, unitCode: "MTK" } } : {}),
            address: { "@type": "PostalAddress", streetAddress: String(dn), addressLocality: cityEn, addressCountry: "SA" },
          }} />
          <JsonLd data={{ "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: ar ? "الرئيسية" : "Home", item: `${SITE}/${locale}` },
            { "@type": "ListItem", position: 2, name: ar ? "العروض" : "Listings", item: `${SITE}/${locale}/listings` },
            ...(l.district_id ? [{ "@type": "ListItem", position: 3, name: String(dn), item: `${SITE}/${locale}/listings?district=${l.district_id}` }] : []),
            { "@type": "ListItem", position: l.district_id ? 4 : 3, name: title, item: `${SITE}/${locale}/listings/${l.id}` },
          ] }} />
          <div className="tabs" style={{ marginTop: 22 }}>
            <a href="#ov" className="t on" style={{ textDecoration: "none" }}><Icon.doc size={15} /> {ar ? "نظرة عامة" : "Overview"}</a>
            <a href="#loc" className="t" style={{ textDecoration: "none" }}><Icon.target size={15} /> {ar ? "ذكاء الموقع" : "Location intelligence"}</a>
            <Link href={L("/invest")} className="t" style={{ textDecoration: "none" }}><Icon.coins size={15} /> {ar ? "الاستثمار" : "Investment"}</Link>
            <a href="#comps" className="t" style={{ textDecoration: "none" }}><Icon.chart size={15} /> {ar ? "إيجارات مقارنة" : "Comparable rents"}</a>
          </div>
          <div id="ov" style={{ scrollMarginTop: 80, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 16, marginTop: 22 }}>
            {[[ar ? "المساحة" : "Area", `${l.area_sqm} m²`], [ar ? "الفئة" : "Grade", gradeLabel(l.building_grade, locale)], [ar ? "التجهيز" : "Fit-out", fitoutLabel(l.fitout_condition, locale)], [lease ? (ar ? "المطلوب" : "Asking") : (ar ? "السعر" : "Price"), price != null ? Number(price).toLocaleString() + (lease ? (ar ? " ريال/م²·سنة" : " SAR/m²·yr") : (ar ? " ريال" : " SAR")) : (ar ? "عند الطلب" : "On request")]].map((s, i) => (
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
                <div className="eyebrow">{ar ? "مسعّر في سياقه · مؤشر الإيجارات" : "Priced in context · Rent Index"} <span className="tag" style={{ marginInlineStart: 8 }}>{ar ? "عيّنة" : "sample"}</span></div>
                <p className="muted" style={{ fontSize: 14, marginTop: 8, maxWidth: 340, lineHeight: 1.6 }}>{ar ? `كيف يقف هذا الإيجار المطلوب مقابل صفقات مقارنة في ${dn}.` : `How this asking rent sits against comparable transactions in ${dn}.`}</p>
              </div>
              <div className="bars" style={{ width: 210, height: 120 }}>
                {bars.map((b, i) => (<div key={i} className={"b" + (i === 3 ? " hi" : "")} style={{ height: b + "%" }}><span className="v">{1180 + i * 70}</span></div>))}
              </div>
            </div>
          </div>
          <LocationScore ar={ar} district={String(dn)} assetType={l.asset_type} dealType={l.deal_type} price={price != null ? Number(price) : null} areaSqm={l.area_sqm ?? null} />
          <div id="loc" className="card pad" style={{ scrollMarginTop: 80, marginTop: 18, boxShadow: "none" }}>
            <div className="modhead"><Icon.target size={18} /><span className="ttl">{ar ? "ذكاء الموقع" : "Location intelligence"}</span><span className="grow" /><span className="tag">{ar ? "عيّنة" : "sample"}</span></div>
            <div className="satmkt-2col" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 20, alignItems: "center" }}>
              <div className="map" style={{ height: 200, borderRadius: 11, border: "1px solid var(--silver)", position: "relative" }}>
                <div className="iso r3" style={{ left: "50%", top: "52%", width: 180, height: 180 }} />
                <div className="iso r2" style={{ left: "50%", top: "52%", width: 120, height: 120 }} />
                <div className="iso r1" style={{ left: "50%", top: "52%", width: 66, height: 66 }} />
                <div className="isodot" style={{ left: "50%", top: "52%" }} />
                <span className="tag" style={{ position: "absolute", insetInlineStart: 12, top: 12 }}>{ar ? "زمن القيادة · 5 / 10 / 15 دقيقة" : "Drive-time · 5 / 10 / 15 min"}</span>
              </div>
              <div className="col" style={{ gap: 18 }}>
                <div className="row gap20">
                  <div className="kpi"><span className="v tnum">412k</span><span className="l">{ar ? "السكان النهاريون" : "Daytime population"}</span></div>
                  <div className="kpi"><span className="v tnum">+18%</span><span className="l">{ar ? "الحركة مقابل متوسط الحي" : "Footfall vs district avg"}</span></div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>{ar ? "حركة أيام الأسبوع بالساعة" : "Weekday footfall by hour"}</div>
                  <div className="hours">{hours.map((h, i) => <div key={i} className={"h" + (h >= 16 ? " pk" : "")} style={{ height: (h / 18 * 100) + "%" }} />)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <ListingEnquiry assetType={l.asset_type} satListed={!!l.is_sat_listed} listingId={l.id} price={price != null ? Number(price) : null} lease={lease} unit={lease ? (ar ? "ريال/م²·سنة" : "SAR/m²·yr") : (ar ? "ريال" : "SAR")} type={type} area={l.area_sqm} district={String(dn)} locale={locale} permit={l.ad_permit_no} />
        </div>
      </div>
    </div>
  );
}
