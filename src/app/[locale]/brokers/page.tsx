import { isLocale } from "@/i18n/config";
import { localeMeta } from "@/lib/meta";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel } from "@/lib/labels";
import { Icon } from "@/components/satkit";
import { getDictionary } from "@/i18n/getDictionary";

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
    const { data } = await sb.from("listings").select("id,title_en,title_ar,asset_type,deal_type,asking_rent_sqm,area_sqm,districts(name_en,name_ar)").eq("status", "published").eq("deal_type", "lease").limit(3);
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
      <h1 className="serif" style={{ fontSize: 32, fontWeight: 500, margin: "10px 0 0" }}>{b.title}</h1>
      <p className="muted" style={{ marginTop: 8, fontSize: 14.5, maxWidth: 640, lineHeight: 1.6 }}>{b.intro}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14, marginTop: 24 }}>
        {steps.map((s, i) => (
          <div key={i} className="card" style={{ padding: "18px 20px" }}>
            <div className="row gap8" style={{ alignItems: "center", marginBottom: 8 }}><span style={{ color: "var(--harbor)" }}><Icon.shield size={16} /></span><span style={{ fontSize: 14, fontWeight: 700 }}>{s[0]}</span></div>
            <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>{s[1]}</p>
          </div>
        ))}
      </div>

      <section className="card" style={{ marginTop: 26, padding: "24px 26px", position: "relative" }}>
        <span className="tag" style={{ position: "absolute", top: 14, insetInlineEnd: 14, background: "var(--cool)" }}>{b.sampleTag}</span>
        <div className="row gap12" style={{ alignItems: "center" }}>
          <span style={{ width: 46, height: 46, borderRadius: 12, background: "var(--azure-wash)", color: "var(--azure-d)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontFamily: "var(--mono)" }}>NG</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{b.sampleName}</div>
            <div className="muted" style={{ fontSize: 12 }}>{b.falAppears}</div>
          </div>
        </div>
        <div className="row gap8 wrap" style={{ marginTop: 14 }}>
          <span className="chip">{b.coverage}</span>
          <span className="chip">{b.officeRetail}</span>
        </div>
        {sample.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginTop: 16 }}>
            {sample.map((l) => (
              <Link key={l.id} href={`/${locale}/listings/${l.id}`} className="card lift" style={{ padding: "14px 16px", textDecoration: "none", color: "inherit" }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.35 }}>{(ar ? l.title_ar : l.title_en) || l.title_en}</div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{assetLabel(l.asset_type, locale)} · {l.area_sqm} {b.sqmUnit} · {(ar ? l.districts?.name_ar : l.districts?.name_en) || ""}</div>
                <div className="mono" style={{ fontSize: 12, marginTop: 8, color: "var(--harbor)", fontWeight: 600 }}>{l.asking_rent_sqm != null ? `${Number(l.asking_rent_sqm).toLocaleString("en-US")} ${b.rentUnit}` : b.onRequest}</div>
              </Link>
            ))}
          </div>
        )}
        <p className="muted" style={{ fontSize: 11.5, marginTop: 14, lineHeight: 1.55 }}>{b.illustration}</p>
      </section>

      <div className="row gap10 wrap" style={{ marginTop: 26 }}>
        <Link href={`/${locale}/signup`} className="btn primary" style={{ textDecoration: "none" }}>{b.signupCta} <Icon.arrow size={15} /></Link>
        <Link href={`/${locale}/requirements`} className="btn secondary" style={{ textDecoration: "none" }}>{b.seeReqs}</Link>
      </div>
      <p className="muted" style={{ marginTop: 20, fontSize: 12 }}>{b.footer}</p>
    </div>
  );
}
