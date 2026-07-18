import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel, gradeLabel, fitoutLabel, dealLabel, cityLabel } from "@/lib/labels";
import { listedSince, listedLabel } from "@/lib/listedSince";
import { availabilityOf, availabilityLabel } from "@/lib/availability";
import JsonLd, { SITE } from "@/components/JsonLd";
import { Photo, Verified, Icon } from "@/components/satkit";
import { photoFor } from "@/lib/photos";
import ListingEnquiry from "@/components/ListingEnquiry";
import ContactBar from "@/components/ContactBar";
import SaveButton from "@/components/SaveButton";
import { getListingById, getLister, getBuildingById } from "@/lib/queries/listings";
import ListerBadge from "@/components/ListerBadge";
import { getDictionary } from "@/i18n/getDictionary";
import { ownerVerified } from "@/lib/gate";
import AdPermit from "@/components/AdPermit";
import LocationFacts from "@/components/LocationFacts";
import { nearest, relevanceFor, driveMinutes, walkMinutes, WALKABLE_KM } from "@/lib/locationFacts";

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
  const lister = await getLister(l?.account_id);
  if (!l) return <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 24px" }} className="muted">{dict.ld.notFound}</div>;
  const dn = l.districts ? (ar ? l.districts.name_ar : l.districts.name_en) : (dict.ld.riyadh);
  const city = l.districts && l.districts.city ? cityLabel(l.districts.city, locale) : (dict.ld.riyadh);
  const cityEn = l.districts && l.districts.city ? cityLabel(l.districts.city, "en") : "Riyadh";
  const type = assetLabel(l.asset_type, locale);
  const lease = l.deal_type === "lease";
  const price = lease ? l.asking_rent_sqm : l.sale_price;
  const title = (ar ? l.title_ar : l.title_en) || l.reference_code;
  const kindFor = (a: string) => a;
  const L = (p: string) => `/${locale}${p}`;


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

  // Location facts: resolve a real coordinate (exact building, else district centroid),
  // then compute sourced distances. Every value shown is a verified coordinate or a
  // computation over one. Metro is Riyadh-only; airports cover every listed city.
  let originLL: { lat: number; lng: number; exact: boolean } | null = null;
  if (sb) {
    if (l.building_id) {
      const b: any = await getBuildingById(l.building_id);
      if (b && b.lat != null && b.lng != null) originLL = { lat: Number(b.lat), lng: Number(b.lng), exact: true };
    }
    if (!originLL && l.district_id) {
      const { data: dg } = await sb.from("districts_geo").select("lat,lng").eq("id", l.district_id).maybeSingle();
      if (dg && (dg as any).lat != null && (dg as any).lng != null) originLL = { lat: Number((dg as any).lat), lng: Number((dg as any).lng), exact: false };
    }
  }
  let locFactsProps: any = null;
  if (sb && originLL) {
    const { data: anch } = await sb.from("map_anchors").select("kind,name_en,name_ar,line,lat,lng").eq("city", cityEn).in("kind", ["metro", "airport", "rail"]);
    const anchors = (anch ?? []).map((a: any) => ({ kind: a.kind, name_en: a.name_en, name_ar: a.name_ar, line: a.line, lat: Number(a.lat), lng: Number(a.lng) }));
    const nm = nearest(originLL, anchors, "metro");
    const na = nearest(originLL, anchors, "airport");
    const nr = nearest(originLL, anchors, "rail");
    const rel = relevanceFor(l.asset_type);
    const airDrive = na ? await driveMinutes(originLL, na.anchor.lat, na.anchor.lng) : null;
    const railDrive = nr ? await driveMinutes(originLL, nr.anchor.lat, nr.anchor.lng) : null;
    locFactsProps = {
      lat: originLL.lat, lng: originLL.lng, exact: originLL.exact,
      metro: nm ? { name_en: nm.anchor.name_en, name_ar: nm.anchor.name_ar, line: nm.anchor.line, lat: nm.anchor.lat, lng: nm.anchor.lng, km: nm.km, walkMin: nm.km <= WALKABLE_KM ? walkMinutes(nm.km) : null } : null,
      airport: na ? { name_en: na.anchor.name_en, name_ar: na.anchor.name_ar, km: na.km, driveMin: airDrive } : null,
      rail: nr ? { name_en: nr.anchor.name_en, name_ar: nr.anchor.name_ar, line: nr.anchor.line, km: nr.km, driveMin: railDrive } : null,
      primary: rel.primary, less: rel.less,
      computedDate: new Date().toLocaleDateString(ar ? "ar-SA-u-nu-latn" : "en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Riyadh" }),
    };
  }

  return (
    <div style={{ fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <div className="row between wrap" style={{ padding: "14px 24px", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 10 }}>
        <Link href={L("/listings")} className="mono muted" style={{ fontSize: 11.5, letterSpacing: ".06em", textDecoration: "none" }}>{ar ? "→" : "←"} {dict.ld.crumbListingsUpper} / {String(dn).toUpperCase()} / {type.toUpperCase()}</Link>
        <div className="row gap10"><Link href={L(`/listings/${l.id}/flyer`)} className="chip" style={{ textDecoration: "none" }}><Icon.doc size={15} /> {dict.ld.flyerPdf}</Link><SaveButton id={l.id} locale={locale} /><span className="chip"><Icon.arrow size={15} /> {dict.ld.share}</span></div>
      </div>
      <div className="satmkt-2col" style={{ maxWidth: 1280, margin: "0 auto", padding: 24, display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: 32 }}>
        <div>
          <Photo src={photoFor(l.asset_type, l.id)} kind={kindFor(l.asset_type)} label={`${type}, ${dn}`} h={360} fav badges={[...(ownerVerified(l as any) ? [<Verified key="v" text={dict.ld.verifiedOwner} />] : []), <span key="f" className="freeze open"><span className="dot" />{dict.ld.openFirstLease}</span>]} />
          <div className="row gap10 wrap" style={{ marginTop: 18 }}>
            <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>{type} · {dealLabel(l.deal_type, locale)}</span>
            {l.building_grade && l.building_grade !== "n_a" ? <span className="tag">{gradeLabel(l.building_grade, locale)}</span> : null}
            {l.fitout_condition && l.fitout_condition !== "n_a" ? <span className="tag">{fitoutLabel(l.fitout_condition, locale)}</span> : null}
            <span className="tag">{dict.ld.availableNow}</span>
            {listedSince((l as any).created_at)?.isNew ? <span className="tag" style={{ background: "#1F8A5B", color: "#fff", borderColor: "transparent" }}>{dict.ld.newBadge}</span> : null}
          </div>
          <h1 className="serif" style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-.02em", margin: "14px 0 0" }}>{title}</h1>
          <div className="row gap10 wrap" style={{ marginTop: 10, color: "var(--slate)", fontSize: 14 }}>
            <span className="row gap6"><Icon.pin size={16} /> {dn}{ar ? "، " : ", "}{city}</span><span>·</span><span><bdi dir="ltr">{l.area_sqm} m²</bdi></span>
            {(() => { const ls = listedSince((l as any).created_at); return ls ? <><span>·</span><span className="mono muted" style={{ fontSize: 12.5 }}>{listedLabel(ls.days, ar)}</span></> : null; })()}
          </div>
          {/* Honest verification stamp (roadmap Q8): shows the real date the owner was
              checked, only when we actually have it. No invented expiry or re-verify
              deadline, because there is no re-verification process to back one yet. */}
          {ownerVerified(l as any) && (l as any).verified_at ? (() => {
            const dt = new Date((l as any).verified_at);
            const dtxt = isFinite(dt.getTime()) ? dt.toLocaleDateString(ar ? "ar-SA-u-nu-latn" : "en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Riyadh" }) : null;
            return dtxt ? (
              <div className="row gap6" style={{ marginTop: 8, alignItems: "center", color: "#1F8A5B", fontSize: 12.5 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
                <span style={{ fontWeight: 600 }}>{dict.ld.verifiedOwner}</span>
                <span className="mono" style={{ color: "var(--slate)", fontWeight: 400 }}>· {dict.ld.checkedOn} <bdi dir="ltr">{dtxt}</bdi></span>
              </div>
            ) : null;
          })() : null}

          {/* Honest availability freshness (Fable 5: own freshness, not just
              provenance). Reads availability_confirmed_at, the real date the lister
              affirmed the space is available, and lets it decay: green when current,
              muted as it ages, an amber re-check nudge once it is old. Shown only when
              the column is set; never inferred from updated_at or verified_at. */}
          {(() => {
            const av = availabilityOf((l as any).availability_confirmed_at);
            if (!av) return null;
            const dt = new Date((l as any).availability_confirmed_at);
            if (!isFinite(dt.getTime())) return null;
            const dtxt = dt.toLocaleDateString(ar ? "ar-SA-u-nu-latn" : "en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Riyadh" });
            const color = av.state === "stale" ? "#B26B00" : av.state === "fresh" ? "#1F8A5B" : "var(--slate)";
            return (
              <div className="row gap6" style={{ marginTop: 6, alignItems: "center", color, fontSize: 12.5 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                <span className="mono">{availabilityLabel(av, dtxt, ar)}</span>
              </div>
            );
          })()}

          {/* The advertising licence and its expiry, displayed as the REGA marketing
              rules require. It used to be a small grey tag with no expiry beside it. */}
          <AdPermit listing={l as any} ar={ar} />
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
            ...((l as any).published_at || (l as any).created_at ? { datePosted: (l as any).published_at || (l as any).created_at } : {}),
          }} />
          <JsonLd data={{ "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: dict.ld.crumbHome, item: `${SITE}/${locale}` },
            { "@type": "ListItem", position: 2, name: dict.ld.crumbListings, item: `${SITE}/${locale}/listings` },
            ...(l.district_id ? [{ "@type": "ListItem", position: 3, name: String(dn), item: `${SITE}/${locale}/listings?district=${l.district_id}` }] : []),
            { "@type": "ListItem", position: l.district_id ? 4 : 3, name: title, item: `${SITE}/${locale}/listings/${l.id}` },
          ] }} />
          <div className="tabs" style={{ marginTop: 22 }}>
            <a href="#ov" className="t on" style={{ textDecoration: "none" }}><Icon.doc size={15} /> {dict.ld.overview}</a>
            <Link href={L("/invest")} className="t" style={{ textDecoration: "none" }}><Icon.coins size={15} /> {dict.ld.investment}</Link>
          </div>
          <div id="ov" style={{ scrollMarginTop: 80, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 16, marginTop: 22 }}>
            {([[dict.ld.area, `${l.area_sqm} m²`], (l.building_grade && l.building_grade !== "n_a" ? [dict.ld.grade, gradeLabel(l.building_grade, locale)] : null), (l.fitout_condition && l.fitout_condition !== "n_a" ? [dict.ld.fitout, fitoutLabel(l.fitout_condition, locale)] : null), [lease ? (dict.ld.asking) : (dict.ld.price), price != null ? Number(price).toLocaleString() + (lease ? (ar ? " ريال/م²·سنة" : " SAR/m²·yr") : (ar ? " ريال" : " SAR")) : (dict.ld.onRequest)]].filter(Boolean) as [string, string][]).map((s, i) => (
              <div key={i} className="card pad" style={{ boxShadow: "none", padding: 16 }}>
                <div className="muted" style={{ fontSize: 11.5 }}>{s[0]}</div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 500, marginTop: 8 }}>{s[1]}</div>
              </div>
            ))}
          </div>
          {(() => {
            const T = (dict as any).ld;
            const num = (n: any) => Number(n).toLocaleString(ar ? "ar-SA-u-nu-latn" : "en-US");
            const rows: [string, string][] = [];
            if (l.clear_height_m != null) rows.push([T.clearHeight, num(l.clear_height_m) + (ar ? " م" : " m")]);
            if (l.loading_docks != null) {
              const d = Number(l.loading_docks);
              const ratio = l.area_sqm && d > 0 ? ` · 1 ${ar ? "لكل" : "per"} ${num(Math.round(Number(l.area_sqm) / d))} ${ar ? "م²" : "m²"}` : "";
              rows.push([T.loadingDocks, `${num(d)}${ratio}`]);
            }
            if (l.power_kva != null) rows.push([T.power, num(l.power_kva) + " kVA"]);
            if (l.parking_ratio != null) rows.push([T.parking, `1 ${ar ? "موقف / " : "space / "}${num(l.parking_ratio)} ${ar ? "م²" : "m²"}`]);
            if (l.civil_defense_approved) rows.push([T.civilDefense, ar ? "معتمد" : "Approved"]);
            if (rows.length === 0) return null;
            return (
              <div className="card pad" style={{ marginTop: 22, boxShadow: "none" }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{T.spaceTitle}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginTop: 12 }}>
                  {rows.map((r, i) => (
                    <div key={i}>
                      <div className="muted" style={{ fontSize: 11.5 }}>{r[0]}</div>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 500, marginTop: 6 }}>{r[1]}</div>
                    </div>
                  ))}
                </div>
                <div className="mono muted" style={{ fontSize: 10.5, marginTop: 12 }}>{T.statedByLister}</div>
              </div>
            );
          })()}
          {(() => {
            const T = (dict as any).ld;
            const num = (n: any) => Number(n).toLocaleString(ar ? "ar-SA-u-nu-latn" : "en-US");
            const termFmt = (m: number) => (m % 12 === 0 ? `${num(m / 12)} ${m / 12 === 1 ? (ar ? "سنة" : "year") : (ar ? "سنوات" : "years")}` : `${num(m)} ${ar ? "شهراً" : "months"}`);
            const vatFmt = (v: string) => (v === "inclusive" ? (ar ? "شامل الضريبة" : "Inclusive") : (ar ? "غير شامل الضريبة" : "Exclusive"));
            const rows: [string, string][] = [];
            if (lease) {
              if (l.service_charge_sqm != null) rows.push([T.serviceCharge, num(l.service_charge_sqm) + (ar ? " ريال/م²·سنة" : " SAR/m²·yr")]);
              if (l.lease_term_months != null) rows.push([T.leaseTerm, termFmt(Number(l.lease_term_months))]);
              if (l.rent_free_months != null && Number(l.rent_free_months) > 0) rows.push([T.rentFree, `${num(l.rent_free_months)} ${ar ? "شهراً" : "months"}`]);
              if (l.fitout_contribution != null && Number(l.fitout_contribution) > 0) rows.push([T.fitoutContribution, num(l.fitout_contribution) + (ar ? " ريال" : " SAR")]);
              if (l.break_option_months != null) rows.push([T.breakOption, `${num(l.break_option_months)} ${ar ? "شهراً" : "months"}`]);
            } else {
              if (l.sale_price_sqm != null) rows.push([T.pricePerSqm, num(l.sale_price_sqm) + (ar ? " ريال/م²" : " SAR/m²")]);
            }
            if (l.vat_treatment) rows.push([T.vat, vatFmt(l.vat_treatment)]);
            if (rows.length === 0) return null;
            return (
              <div className="card pad" style={{ marginTop: 22, boxShadow: "none" }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{T.termsTitle}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginTop: 12 }}>
                  {rows.map((r, i) => (
                    <div key={i}>
                      <div className="muted" style={{ fontSize: 11.5 }}>{r[0]}</div>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 500, marginTop: 6 }}>{r[1]}</div>
                    </div>
                  ))}
                </div>
                <div className="mono muted" style={{ fontSize: 10.5, marginTop: 12 }}>{T.statedByLister}</div>
              </div>
            );
          })()}
          {(ar ? l.description_ar : l.description_en) && <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.7, maxWidth: 640, marginTop: 22 }}>{ar ? l.description_ar : l.description_en}</p>}
          {locFactsProps ? (
            <LocationFacts locale={locale as "en" | "ar"} {...locFactsProps} />
          ) : (
            <div className="card pad" style={{ marginTop: 22, boxShadow: "none" }}>
              <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: 620 }}>{dict.ld.locNote}</div>
            </div>
          )}
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
        <div className="ld-side">
          <ListingEnquiry assetType={l.asset_type} satListed={!!l.is_sat_listed} listingId={l.id} price={price != null ? Number(price) : null} lease={lease} unit={lease ? (ar ? "ريال/م²·سنة" : "SAR/m²·yr") : (ar ? "ريال" : "SAR")} type={type} area={l.area_sqm} district={String(dn)} locale={locale} permit={l.ad_permit_no} contact={{ phone: l.contact_phone || process.env.NEXT_PUBLIC_CONTACT_PHONE || null, email: l.contact_email || null, channels: Array.isArray(l.contact_channels) ? l.contact_channels : [], refCode: l.reference_code || "", title, url: `${SITE}/${locale}/listings/${l.id}`, messageHref: `/${locale}/messages` }} />
          <ListerBadge lister={lister} ar={ar} />
          <ContactBar listingId={l.id} phone={l.contact_phone || process.env.NEXT_PUBLIC_CONTACT_PHONE || null} email={l.contact_email || null} channels={Array.isArray(l.contact_channels) ? l.contact_channels : []} refCode={l.reference_code || ""} title={title} url={`${SITE}/${locale}/listings/${l.id}`} messageHref={`/${locale}/messages`} ar={ar} />
        </div>
      </div>
    </div>
  );
}
