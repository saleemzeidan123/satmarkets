import { isLocale } from "@/i18n/config";
import { localeMeta } from "@/lib/meta";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { releaseVisibleInventory } from "@/lib/inventory";
import { assetLabel } from "@/lib/labels";
import { listingTitle, listingPlace } from "@/lib/listingTitle";
import { Icon } from "@/components/satkit";
import { getDictionary } from "@/i18n/getDictionary";
import { netArea, askingPrice } from "@/lib/listingFigures";

export const revalidate = 3600;

export function generateMetadata({ params }: { params: { locale: string } }) {
  const d = getDictionary(params.locale === "ar" ? "ar" : "en").brokers;
  return localeMeta(params.locale, "/brokers", d.metaTitle, d.metaDesc);
}

export default async function BrokersPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const b = getDictionary(locale).brokers;
  const sb = getSupabaseServer();
  let sample: any[] = [];
  if (sb) {
    const { data } = await releaseVisibleInventory(sb.from("listings").select("id,title_en,title_ar,asset_type,reference_code,deal_type,asking_rent_sqm,area_sqm,districts(name_en,name_ar,city)").eq("status", "published")).eq("deal_type", "lease").limit(3);
    sample = data ?? [];
  }
  const steps: [string, string][] = [
    [b.falLabel, b.falBody],
    [b.idLabel, b.idBody],
    [b.perfLabel, b.perfBody],
  ];
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 24px 64px", fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <div className="eyebrow">{b.eyebrow}</div>
      <h1 className="serif" style={{ fontSize: "2rem", fontWeight: 500, margin: "10px 0 0" }}>{b.title}</h1>
      <p className="muted" style={{ marginTop: 8, fontSize: "0.90625rem", maxWidth: 640, lineHeight: 1.6 }}>{b.intro}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 240px), 1fr))", gap: 14, marginTop: 24 }}>
        {steps.map((s, i) => (
          <div key={i} className="card" style={{ padding: "18px 20px" }}>
            <div className="row gap8" style={{ alignItems: "center", marginBottom: 8 }}><span style={{ color: "var(--harbor)" }}><Icon.shield size={16} /></span><span style={{ fontSize: "0.875rem", fontWeight: 700 }}>{s[0]}</span></div>
            <p className="muted" style={{ fontSize: "0.78125rem", lineHeight: 1.6, margin: 0 }}>{s[1]}</p>
          </div>
        ))}
      </div>

      <section className="card" style={{ marginTop: 26, padding: "24px 26px", position: "relative" }}>
        <span className="tag" style={{ position: "absolute", top: 14, insetInlineEnd: 14, background: "var(--cool)" }}>{b.sampleTag}</span>
        <div className="row gap12" style={{ alignItems: "center" }}>
          <span style={{ width: 46, height: 46, borderRadius: 12, background: "var(--azure-wash)", color: "var(--azure-d)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontFamily: "var(--mono)" }}>NG</span>
          <div>
            <div style={{ fontSize: "1.0625rem", fontWeight: 700 }}>{b.sampleName}</div>
            <div className="muted" style={{ fontSize: "0.75rem" }}>{b.falAppears}</div>
          </div>
        </div>
        <div className="row gap8 wrap" style={{ marginTop: 14 }}>
          <span className="chip">{b.coverage}</span>
          <span className="chip">{b.officeRetail}</span>
        </div>
        {sample.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 220px), 1fr))", gap: 12, marginTop: 16 }}>
            {sample.map((l) => (
              <Link key={l.id} href={`/${locale}/listings/${l.id}`} className="card lift" style={{ padding: "14px 16px", textDecoration: "none", color: "inherit" }}>
                <div style={{ fontSize: "0.84375rem", fontWeight: 700, lineHeight: 1.35 }}>{listingTitle(l, ar ? "ar" : "en")}</div>
                <div className="muted" style={{ fontSize: "0.71875rem", marginTop: 4 }}>{[assetLabel(l.asset_type, locale), netArea(l.area_sqm, locale), listingPlace(l, ar ? "ar" : "en")].filter(Boolean).join(" · ")}</div>
                <div className="mono" style={{ fontSize: "0.75rem", marginTop: 8, color: "var(--harbor)", fontWeight: 600 }}>{askingPrice(l.deal_type === "sale" ? l.sale_price : l.asking_rent_sqm, l.deal_type, locale) ?? b.onRequest}</div>
              </Link>
            ))}
          </div>
        )}
        <p className="muted" style={{ fontSize: "0.71875rem", marginTop: 14, lineHeight: 1.55 }}>{b.illustration}</p>
      </section>

      <div className="row gap10 wrap" style={{ marginTop: 26 }}>
        <Link href={`/${locale}/signup`} className="btn primary" style={{ textDecoration: "none" }}>{b.signupCta} <Icon.arrow size={15} /></Link>
        <Link href={`/${locale}/requirements`} className="btn secondary" style={{ textDecoration: "none" }}>{b.seeReqs}</Link>
      </div>
      <p className="muted" style={{ marginTop: 20, fontSize: "0.75rem" }}>{b.footer}</p>
    </div>
  );
}
