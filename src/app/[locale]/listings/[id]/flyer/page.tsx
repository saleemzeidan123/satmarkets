import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getPublishedKpis } from "@/lib/market/published";
import { assetLabel, gradeLabel, fitoutLabel } from "@/lib/labels";
import { listingTitle, listingPlace, titleMissingIn } from "@/lib/listingTitle";
import { photoFor } from "@/lib/photos";
import { fill, formatInteger, formatWithUnit } from "@/lib/format";
import { netArea, askingPrice } from "@/lib/listingFigures";
import { pickIndexRow, marketVerdict, type IndexRow } from "@/lib/market/verdict";
import { Logo } from "@/components/satkit";
import PrintButton from "@/components/PrintButton";
import { SITE } from "@/components/JsonLd";
import QRCode from "qrcode";
import { getDictionary } from "@/i18n/getDictionary";
import { getListingById } from "@/lib/queries/listings";
import { verifiedBadgeTexts } from "@/lib/listingVerification";
import { localeMeta } from "@/lib/meta";
import { quotableRentIndexRows } from "@/lib/market/quotable";

// Branded property flyer: the landlord outreach artifact. Print-to-PDF via the
// browser (native feature, no dependencies). Every figure is the listing's own
// asking data or the index band from the database; the index context carries
// the platform-sample label pre-launch, and the published benchmarks strip is
// attributed. Bilingual by locale.

// The last public template with no head of its own (WS12). It was serving the
// root layout's generic title and description with no canonical and no
// reciprocal language set, so a shared flyer link described the site rather than
// the property. The title names the listing the way the listing detail page
// names it, and falls back to a described sentence rather than to a reference
// code, because a code identifies a listing and does not describe one: the same
// rule the detail page already follows.
export async function generateMetadata(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  if (!isLocale(params.locale)) return {};
  const loc = (params.locale === "ar" ? "ar" : "en") as "en" | "ar";
  const t = getDictionary(loc).flyer;
  const l: any = await getListingById(params.id);
  if (!l) return {};
  const ar = loc === "ar";
  const dn = listingPlace(l, loc) || t.riyadh;
  const name = titleMissingIn(l, loc) ? "" : listingTitle(l, loc);
  const title = name
    ? fill(t.metaTitle, { title: name })
    : fill(t.metaTitleFallback, { type: assetLabel(l.asset_type, loc), place: dn });
  return localeMeta(loc, `/listings/${params.id}/flyer`, title, t.metaDesc);
}

export default async function ListingFlyer(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const t = getDictionary(ar ? "ar" : "en").flyer;
  const pub = await getPublishedKpis(locale);
  const sb = await getSupabaseServer();
  let l: any = null;
  let idxRows: IndexRow[] = [];
  let idxStatements: readonly string[] = [];
  if (sb) {
    const { data } = await sb.from("listings").select("*, districts(name_en,name_ar,city)").eq("id", params.id).single();
    l = data;
    if (l?.district_id) {
      // ADV-1E. The flyer is the one surface that leaves the platform: a landlord
      // prints it and carries it into a meeting, where nothing on the page can be
      // corrected later. The pricing context on it is a derived display of the
      // third-party figure and it takes the same decision as every other surface.
      // A row whose rights are unread or withheld produces no context block at
      // all, which is the correct outcome for a document that cannot be recalled.
      const { data: rows } = await sb.from("rent_index_published").select("asset_type,segment,unit,band_low,median,band_high,period,sufficient,stat_kind,data_class,is_demo,district_label,district_label_ar").eq("district_id", l.district_id);
      const quotable = await quotableRentIndexRows((rows ?? []) as any[], locale, (r: any) => (ar ? (r.district_label_ar || r.district_label) : r.district_label) ?? null);
      idxRows = quotable.rows.map((q) => q.row as unknown as IndexRow);
      idxStatements = quotable.statements;
    }
  }
  if (!l) notFound();
  const dn = listingPlace(l, ar ? "ar" : "en") || t.riyadh;
  const title = listingTitle(l, ar ? "ar" : "en");
  const type = assetLabel(l.asset_type, locale);
  const lease = l.deal_type === "lease";
  // PKG-SUP2, findings 122 and 123. The area tile printed `${l.area_sqm} m²`
  // unguarded, so a listing whose record states no area produced a tile reading
  // "null m²" on a document a broker prints and hands to a client, where nothing
  // can be corrected afterwards. The unit was also spelled here by hand, a fourth
  // spelling of the same unit. Both now come from `listingFigures.ts`, and an
  // unstated area draws no tile rather than a tile drawn around a hole.
  const areaFig = netArea(l.area_sqm, locale);
  const priceFig = askingPrice(lease ? l.asking_rent_sqm : l.sale_price, l.deal_type, locale);
  // C4, then ADV-1. This read ownership OR authorisation OR the row being our own
  // stock, and printed one green "Verified owner" tag for any of the three, onto a
  // document a landlord takes into a meeting. It now prints the badges the record
  // has earned, each naming its own gate, which today is none of them.
  const badges = verifiedBadgeTexts(l as any, null, ar);
  const row = lease ? pickIndexRow(idxRows, l.asset_type, l.building_grade) : null;
  const v = lease ? marketVerdict(l.asking_rent_sqm, row, l.districts?.name_en, l.districts?.name_ar) : null;
  const today = new Date().toISOString().slice(0, 10);
  const liveUrl = `${SITE}/${locale}/listings/${l.id}`;
  let qrSvg = "";
  try { qrSvg = await QRCode.toString(liveUrl, { type: "svg", margin: 2, width: 104, color: { dark: "#14181B", light: "#ffffff" } }); } catch {}

  return (
    <div className="flyer-wrap" style={{ background: "var(--cool)", padding: "24px 16px 48px" }}>
      <div className="row gap10 no-print" style={{ maxWidth: 800, margin: "0 auto 14px", justifyContent: "flex-end" }}>
        <Link href={`/${locale}/listings/${l.id}`} className="btn secondary" style={{ textDecoration: "none" }}>{t.backToListing}</Link>
        <PrintButton label={t.printSave} />
      </div>
      <div className="flyer-page" style={{ maxWidth: 800, margin: "0 auto", background: "var(--paper)", border: "1px solid var(--silver)", borderRadius: 12, overflow: "hidden", fontFamily: "var(--sans)", color: "var(--ink)" }}>
        <div className="row between" style={{ padding: "18px 26px", borderBottom: "1px solid var(--silver)", alignItems: "center" }}>
          <Logo />
          <div style={{ textAlign: "end" }}>
            <div className="eyebrow">{t.propertyFlyer}</div>
            <div className="mono muted" style={{ fontSize: "0.6875rem" }}>{l.reference_code || l.id.slice(0, 8)} · {today}</div>
          </div>
        </div>
        <img src={photoFor(l.asset_type, l.id)} alt={title} style={{ width: "100%", height: 260, objectFit: "cover", display: "block" }} />
        <div style={{ padding: "22px 26px" }}>
          <div className="row gap8 wrap">
            {/* Verified badges only. Each string names the dimension it rests on and
                is resolved on the server; confirmed green is reserved for exactly this. */}
            {badges.map((b, i) => (
              <span key={`v${i}`} className="tag" style={{ color: "var(--green)", background: "var(--green-wash)", borderColor: "var(--green-line)" }}>{b}</span>
            ))}
            <span className="tag">{type} · {lease ? t.lease : t.sale}</span>
            <span className="tag">{gradeLabel(l.building_grade, locale)}</span>
            <span className="tag">{fitoutLabel(l.fitout_condition, locale)}</span>
          </div>
          <h1 className="serif" style={{ fontSize: "1.625rem", fontWeight: 500, margin: "12px 0 4px" }}>{title}</h1>
          <div className="muted" style={{ fontSize: "0.84375rem" }}>{dn}{l.districts?.city ? `, ${l.districts.city}` : ""}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 128px), 1fr))", gap: 12, marginTop: 18 }}>
            {([[t.area, areaFig], [t.grade, gradeLabel(l.building_grade, locale)], [t.fitout, fitoutLabel(l.fitout_condition, locale)], [lease ? t.askingRent : t.askingPrice, priceFig ?? t.onRequest]] as [string, string | null][]).filter((s) => s[1]).map((s, i) => (
              <div key={i} style={{ border: "1px solid var(--silver)", borderRadius: 9, padding: "10px 12px" }}>
                <div className="muted" style={{ fontSize: "0.65625rem" }}>{s[0]}</div>
                <div className="mono" style={{ fontSize: "0.875rem", fontWeight: 500, marginTop: 5 }}>{s[1]}</div>
              </div>
            ))}
          </div>
          {v && v.status !== "na" && (
            <div style={{ marginTop: 18, border: "1px solid var(--silver)", borderRadius: 9, padding: "12px 14px", background: "var(--cool)" }}>
              <div className="row between wrap" style={{ gap: 8 }}>
                <div className="eyebrow">{t.pricedInContext}</div>
                <span className="tag">{t.platformSample}</span>
              </div>
              <div style={{ fontSize: "0.8125rem", lineHeight: 1.6, marginTop: 8 }}>{ar ? v.line_ar : v.line_en}</div>
              {/* Inside the same bordered block, because the block is what gets
                  printed and a sentence further down the page is a sentence a
                  folded flyer can lose. */}
              {idxStatements.map((s) => (
                <div key={s} className="muted" style={{ fontSize: "0.71875rem", lineHeight: 1.6, marginTop: 6 }}>{s}</div>
              ))}
            </div>
          )}
          <div className="muted" style={{ fontSize: "0.71875rem", lineHeight: 1.6, marginTop: 16 }}>
            {/* PKG-FIG2 closure, findings 131 and 132. This line read "Office average
                {rate} SAR/m²/yr", which named a statistic the flyer never read and
                spelled a unit the unit table already owns, beside a number formatted
                by a raw `toLocaleString`. The figure is an average across the quoted
                cells, which the label now says; the unit comes from those same cells
                through `pub.unit`, and is simply absent when they do not agree. */}
            {`${pub.officeRent != null ? fill(t.officeAvg, { rate: pub.unit ? formatWithUnit(pub.officeRent, pub.unit, locale, "short", 0) : formatInteger(pub.officeRent, locale) }) + ". " : ""}${t.indexSource}`}
            {pub.officeRent != null && pub.statements.map((s) => (
              <div key={s} style={{ marginTop: 4 }}>{s}</div>
            ))}
          </div>
        </div>
        <div className="row between wrap" style={{ padding: "14px 26px", borderTop: "1px solid var(--silver)", background: "var(--cool)", fontSize: "0.71875rem", gap: 14, alignItems: "center" }}>
          <div className="col gap4" style={{ minWidth: 0 }}>
            <span style={{ fontWeight: 600 }}>{t.footer}</span>
            <span className="mono muted" style={{ fontSize: "0.6875rem" }}>{SITE.replace(/^https?:\/\//, "")}/{locale}/listings/{l.id.slice(0, 8)}…</span>
          </div>
          {qrSvg ? (
            <div className="row gap8" style={{ alignItems: "center", flex: "none" }}>
              <span className="muted" style={{ fontSize: "0.65625rem", maxWidth: 96, textAlign: "end", lineHeight: 1.45 }}>{t.scanHint}</span>
              <div aria-label={t.qrAria} style={{ width: 104, height: 104, flex: "none", background: "var(--paper)", border: "1px solid var(--silver)", borderRadius: 8, overflow: "hidden", lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: qrSvg }} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
