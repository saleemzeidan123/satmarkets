import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel, gradeLabel, fitoutLabel } from "@/lib/labels";
import { photoFor } from "@/lib/photos";
import { pickIndexRow, marketVerdict, type IndexRow } from "@/lib/market/verdict";
import { Logo } from "@/components/satkit";
import PrintButton from "@/components/PrintButton";

// Branded property flyer: the landlord outreach artifact. Print-to-PDF via the
// browser (native feature, no dependencies). Every figure is the listing's own
// asking data or the index band from the database; the index context carries
// the platform-sample label pre-launch, and the published benchmarks strip is
// attributed. Bilingual by locale.

export default async function ListingFlyer({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const sb = getSupabaseServer();
  let l: any = null;
  let idxRows: IndexRow[] = [];
  if (sb) {
    const { data } = await sb.from("listings").select("*, districts(name_en,name_ar,city)").eq("id", params.id).single();
    l = data;
    if (l?.district_id) {
      const { data: rows } = await sb.from("rent_index_published").select("asset_type,segment,unit,band_low,median,band_high,period,district_label,district_label_ar").eq("district_id", l.district_id);
      idxRows = (rows as IndexRow[]) ?? [];
    }
  }
  if (!l) notFound();
  const dn = l.districts ? (ar ? l.districts.name_ar : l.districts.name_en) : (ar ? "الرياض" : "Riyadh");
  const title = (ar ? l.title_ar : l.title_en) || l.reference_code;
  const type = assetLabel(l.asset_type, locale);
  const lease = l.deal_type === "lease";
  const price = lease ? l.asking_rent_sqm : l.sale_price;
  const unit = lease ? (ar ? "ريال/م²·سنة" : "SAR/m²·yr") : (ar ? "ريال" : "SAR");
  const verified = l.ownership_verified || l.authorization_verified || l.is_sat_listed;
  const row = lease ? pickIndexRow(idxRows, l.asset_type, l.building_grade) : null;
  const v = lease ? marketVerdict(l.asking_rent_sqm, row, l.districts?.name_en, l.districts?.name_ar) : null;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flyer-wrap" style={{ background: "var(--cool)", padding: "24px 16px 48px" }}>
      <div className="row gap10 no-print" style={{ maxWidth: 800, margin: "0 auto 14px", justifyContent: "flex-end" }}>
        <Link href={`/${locale}/listings/${l.id}`} className="btn secondary" style={{ textDecoration: "none" }}>{ar ? "عودة إلى العرض" : "Back to listing"}</Link>
        <PrintButton label={ar ? "طباعة / حفظ PDF" : "Print / save PDF"} />
      </div>
      <div className="flyer-page" style={{ maxWidth: 800, margin: "0 auto", background: "var(--paper)", border: "1px solid var(--silver)", borderRadius: 12, overflow: "hidden", fontFamily: "var(--sans)", color: "var(--ink)" }}>
        <div className="row between" style={{ padding: "18px 26px", borderBottom: "1px solid var(--silver)", alignItems: "center" }}>
          <Logo />
          <div style={{ textAlign: "end" }}>
            <div className="eyebrow">{ar ? "ملف عرض عقاري" : "Property flyer"}</div>
            <div className="mono muted" style={{ fontSize: 11 }}>{l.reference_code || l.id.slice(0, 8)} · {today}</div>
          </div>
        </div>
        <img src={photoFor(l.asset_type, l.id)} alt={title} style={{ width: "100%", height: 260, objectFit: "cover", display: "block" }} />
        <div style={{ padding: "22px 26px" }}>
          <div className="row gap8 wrap">
            {verified && <span className="tag" style={{ color: "var(--green)", background: "var(--green-wash)", borderColor: "var(--green-line)" }}>{ar ? "موثّق من المالك" : "Verified owner"}</span>}
            <span className="tag">{type} · {lease ? (ar ? "إيجار" : "Lease") : (ar ? "بيع" : "Sale")}</span>
            <span className="tag">{gradeLabel(l.building_grade, locale)}</span>
            <span className="tag">{fitoutLabel(l.fitout_condition, locale)}</span>
          </div>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 500, margin: "12px 0 4px" }}>{title}</h1>
          <div className="muted" style={{ fontSize: 13.5 }}>{dn}{l.districts?.city ? `, ${l.districts.city}` : ""}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 18 }}>
            {[[ar ? "المساحة" : "Area", `${l.area_sqm} m²`], [ar ? "الفئة" : "Grade", gradeLabel(l.building_grade, locale)], [ar ? "التجهيز" : "Fit-out", fitoutLabel(l.fitout_condition, locale)], [lease ? (ar ? "الإيجار المطلوب" : "Asking rent") : (ar ? "سعر البيع" : "Asking price"), price != null ? `${Number(price).toLocaleString("en-US")} ${unit}` : (ar ? "عند الطلب" : "On request")]].map((s, i) => (
              <div key={i} style={{ border: "1px solid var(--silver)", borderRadius: 9, padding: "10px 12px" }}>
                <div className="muted" style={{ fontSize: 10.5 }}>{s[0]}</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 500, marginTop: 5 }}>{s[1]}</div>
              </div>
            ))}
          </div>
          {v && v.status !== "na" && (
            <div style={{ marginTop: 18, border: "1px solid var(--silver)", borderRadius: 9, padding: "12px 14px", background: "var(--cool)" }}>
              <div className="row between wrap" style={{ gap: 8 }}>
                <div className="eyebrow">{ar ? "موقعه من نطاق المؤشر" : "Priced in context"}</div>
                <span className="tag">{ar ? "عيّنة المنصّة" : "platform sample"}</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>{ar ? v.line_ar : v.line_en}</div>
            </div>
          )}
          <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.6, marginTop: 16 }}>
            {ar
              ? "معايير الربع الأول 2026 المنشورة (منسوبة): مكاتب الفئة A 2,370 · الفئة B 1,680 ريال/م²·سنة. المصادر: JLL، CBRE، نايت فرانك، ساما. سياق سوقي منسوب إلى مصادره، استرشادي، ليس نصيحة."
              : "Published Q1 2026 benchmarks (attributed): Grade A offices 2,370 · Grade B 1,680 SAR/m²·yr. Sources: JLL, CBRE, Knight Frank, SAMA. Attributed market context. Indicative, not advice."}
          </div>
        </div>
        <div className="row between wrap" style={{ padding: "14px 26px", borderTop: "1px solid var(--silver)", background: "var(--cool)", fontSize: 11.5, gap: 8 }}>
          <span style={{ fontWeight: 600 }}>{ar ? "سات ماركتس · من سات العقارية · رخصة فال 1200025510" : "SAT Markets · Powered by SAT Real Estate · FAL 1200025510"}</span>
          <span className="mono muted">satmarkets-sat-markets.vercel.app/{locale}/listings/{l.id.slice(0, 8)}…</span>
        </div>
      </div>
    </div>
  );
}
