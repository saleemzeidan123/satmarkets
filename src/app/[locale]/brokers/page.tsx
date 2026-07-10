import { isLocale } from "@/i18n/config";
import { pageMeta } from "@/lib/meta";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel } from "@/lib/labels";
import { Icon } from "@/components/satkit";

export const revalidate = 3600;

export function generateMetadata({ params }: { params: { locale: string } }) {
  return pageMeta(params.locale, '/brokers', 'For Brokers | SAT Markets', 'للوسطاء | سات ماركتس', 'A neutral exchange for licensed brokers: verified demand, honest pricing context, and no assumed commission.', 'منصة محايدة للوسطاء المرخّصين: طلب موثّق، وسياق سعري صادق، ودون عمولة مفترضة.');
}

export default async function BrokersPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const sb = getSupabaseServer();
  let sample: any[] = [];
  if (sb) {
    const { data } = await sb.from("listings").select("id,title_en,title_ar,asset_type,deal_type,asking_rent_sqm,area_sqm,districts(name_en,name_ar)").eq("status", "published").eq("deal_type", "lease").limit(3);
    sample = data ?? [];
  }
  const steps: [string, string][] = ar ? [
    ["رخصة فال", "نتحقق من رقم فال مقابل سجل الهيئة العامة للعقار قبل تفعيل أي واجهة."],
    ["الهوية والتفويض", "هوية الوسيط وتفويضات العرض موثّقة قبل النشر."],
    ["الأداء علناً", "زمن الاستجابة ونطاق التغطية يظهران على الواجهة، من نشاط حقيقي لا من إدخال يدوي."],
  ] : [
    ["FAL licence", "The FAL number is checked against the REGA register before any storefront goes live."],
    ["Identity and authorization", "Broker identity and listing authorizations are verified before publishing."],
    ["Performance in the open", "Response time and coverage show on the storefront, from real activity, never self-declared."],
  ];
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 24px 64px", fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <div className="eyebrow">{ar ? "واجهات الوسطاء" : "Broker storefronts"}</div>
      <h1 className="serif" style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-.02em", margin: "10px 0 0" }}>{ar ? "واجهة موثّقة لكل وسيط مرخّص" : "A verified storefront for every licensed broker"}</h1>
      <p className="muted" style={{ marginTop: 8, fontSize: 14.5, maxWidth: 640, lineHeight: 1.6 }}>{ar ? "صفحة عامة باسمك ورخصتك وعروضك الموثّقة. تُفعّل الواجهات مع الحسابات الحقيقية؛ ما تراه أدناه نموذج يوضح الآلية." : "A public page under your name, your licence and your verified listings. Storefronts activate with real accounts; what you see below is a sample illustrating the mechanism."}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14, marginTop: 24 }}>
        {steps.map((s, i) => (
          <div key={i} className="card" style={{ padding: "18px 20px" }}>
            <div className="row gap8" style={{ alignItems: "center", marginBottom: 8 }}><span style={{ color: "var(--harbor)" }}><Icon.shield size={16} /></span><span style={{ fontSize: 14, fontWeight: 700 }}>{s[0]}</span></div>
            <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>{s[1]}</p>
          </div>
        ))}
      </div>

      <section className="card" style={{ marginTop: 26, padding: "24px 26px", position: "relative" }}>
        <span className="tag" style={{ position: "absolute", top: 14, insetInlineEnd: 14, background: "var(--cool)" }}>{ar ? "نموذج توضيحي" : "Sample storefront"}</span>
        <div className="row gap12" style={{ alignItems: "center" }}>
          <span style={{ width: 46, height: 46, borderRadius: 12, background: "var(--azure-wash)", color: "var(--azure-d)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontFamily: "var(--mono)" }}>NG</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{ar ? "وكالة البوابة الشمالية · نموذج" : "Northern Gate Realty · sample"}</div>
            <div className="muted" style={{ fontSize: 12 }}>{ar ? "رقم فال يظهر هنا بعد التحقق من سجل الهيئة" : "The FAL number appears here once verified against the REGA register"}</div>
          </div>
        </div>
        <div className="row gap8 wrap" style={{ marginTop: 14 }}>
          <span className="chip">{ar ? "يستجيب خلال ساعتين" : "Responds in 2h"}</span>
          <span className="chip">{ar ? "التغطية: العليا، حطين، واجهة الرياض المالية" : "Coverage: Al Olaya, Hittin, KAFD"}</span>
          <span className="chip">{ar ? "مكاتب وتجزئة" : "Office and retail"}</span>
        </div>
        {sample.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginTop: 16 }}>
            {sample.map((l) => (
              <Link key={l.id} href={`/${locale}/listings/${l.id}`} className="card lift" style={{ padding: "14px 16px", textDecoration: "none", color: "inherit" }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.35 }}>{(ar ? l.title_ar : l.title_en) || l.title_en}</div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{assetLabel(l.asset_type, locale)} · {l.area_sqm} {ar ? "م²" : "m²"} · {(ar ? l.districts?.name_ar : l.districts?.name_en) || ""}</div>
                <div className="mono" style={{ fontSize: 12, marginTop: 8, color: "var(--harbor)", fontWeight: 600 }}>{l.asking_rent_sqm != null ? `${Number(l.asking_rent_sqm).toLocaleString("en-US")} ${ar ? "ريال/م²·سنة" : "SAR/m²·yr"}` : (ar ? "عند الطلب" : "On request")}</div>
              </Link>
            ))}
          </div>
        )}
        <p className="muted" style={{ fontSize: 11.5, marginTop: 14, lineHeight: 1.55 }}>{ar ? "العروض أعلاه عروض حقيقية على المنصّة أُرفقت هنا للتوضيح فقط، ولا تعود لوسيط بعينه بعد." : "The listings above are real platform listings attached for illustration only; they do not yet belong to a specific broker."}</p>
      </section>

      <div className="row gap10 wrap" style={{ marginTop: 26 }}>
        <Link href={`/${locale}/signup`} className="btn primary" style={{ textDecoration: "none" }}>{ar ? "سجّل كوسيط مرخّص" : "Sign up as a licensed broker"} <Icon.arrow size={15} /></Link>
        <Link href={`/${locale}/requirements`} className="btn secondary" style={{ textDecoration: "none" }}>{ar ? "اطّلع على الطلبات المفتوحة" : "See open requirements"}</Link>
      </div>
      <p className="muted" style={{ marginTop: 20, fontSize: 12 }}>{ar ? "تُفتح الواجهات الحقيقية مع إطلاق الحسابات. التحقق أولاً، دائماً." : "Real storefronts open with account launch. Verification first, always."}</p>
    </div>
  );
}
