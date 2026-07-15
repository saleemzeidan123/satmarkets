import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

// Design-system reference (Verified Ground). Route-flagged prototype for the
// approved redesign: renders the token roles and the core shared components so
// the direction can be reviewed in EN and AR before broad implementation. This
// route is additive and carries the global noindex until ALLOW_INDEX is set.
export const dynamic = "force-static";

export default function ProtoPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const ar = params.locale === "ar";
  const t = (en: string, a: string) => (ar ? a : en);

  const swatch = (name: string, v: string, note?: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ height: 56, borderRadius: "var(--r-sm)", background: v, border: "1px solid var(--silver)" }} />
      <div style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 600 }}>{name}</div>
      <div className="mono" style={{ fontSize: 11, color: "var(--slate)" }}>{v}{note ? " · " + note : ""}</div>
    </div>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section style={{ marginBlockStart: "var(--space-7)" }}>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--ink)", marginBlockEnd: "var(--space-4)" }}>{title}</h2>
      {children}
    </section>
  );

  return (
    <main style={{ maxWidth: 1100, marginInline: "auto", padding: "var(--space-6) var(--space-5)", color: "var(--ink)", fontFamily: "var(--sans)" }} dir={ar ? "rtl" : "ltr"}>
      <p className="mono" style={{ fontSize: 12, color: "var(--harbor)", letterSpacing: ".08em", textTransform: "uppercase" }}>{t("Design system", "نظام التصميم")}</p>
      <h1 style={{ fontFamily: "var(--serif)", fontSize: 34, marginBlockStart: 4 }}>{t("Verified Ground", "الأرض الموثّقة")}</h1>
      <p style={{ color: "var(--slate)", maxWidth: 620, marginBlockStart: 8 }}>{t("Reference for the SAT Markets redesign: token roles and the trust-critical shared components. Sample content only.", "مرجع لإعادة تصميم سات ماركتس: أدوار الألوان والمكوّنات المشتركة الحرجة للثقة. محتوى تجريبي فقط.")}</p>

      <Section title={t("Color roles", "أدوار الألوان")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: "var(--space-4)" }}>
          {swatch(t("Harbor (interaction)", "هاربر (تفاعل)"), "#3A6EA5")}
          {swatch(t("Ink (authority)", "الحبر"), "#14181B")}
          {swatch(t("Slate (secondary)", "الأردوازي"), "#5B6470")}
          {swatch(t("Verified (confirmed)", "موثّق"), "#1B7A50")}
          {swatch(t("Amber (caution)", "كهرماني (تنبيه)"), "#B7791F")}
          {swatch(t("Red (blocking)", "أحمر (حظر)"), "#C8412E")}
        </div>
        <p style={{ fontSize: 12.5, color: "var(--slate)", marginBlockStart: "var(--space-4)" }}>{t("satestate gold is forbidden here and enforced by a build test.", "ذهبي ساتستيت محظور هنا ويُفرض ذلك باختبار بناء.")}</p>
      </Section>

      <Section title={t("Verification capsule", "كبسولة التوثيق")}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--verified-wash)", color: "var(--verified)", border: "1px solid var(--green-line)", borderRadius: 999, paddingBlock: 6, paddingInline: 12, fontSize: 13, fontWeight: 600 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--verified)" }} />
          {t("Verified owner · checked 29 Jun 2026", "مالك موثّق · روجع 29 يونيو 2026")}
        </span>
      </Section>

      <Section title={t("Source footer", "تذييل المصدر")}>
        <p style={{ fontSize: 12.5, color: "var(--slate)", borderInlineStart: "3px solid var(--harbor)", paddingInlineStart: 12 }}>
          {t("Updated Q2 2026 · REGA Rental Index (Ejar), averages of registered contracts · indicative, not advice.", "محدّث الربع الثاني 2026 · المؤشر الإيجاري (إيجار)، متوسطات العقود المسجّلة · استرشادي وليس نصيحة.")}
        </p>
      </Section>

      <Section title={t("Buttons", "الأزرار")}>
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <button style={{ minHeight: 44, paddingInline: 18, borderRadius: "var(--r-sm)", background: "var(--harbor)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600 }}>{t("Primary", "أساسي")}</button>
          <button style={{ minHeight: 44, paddingInline: 18, borderRadius: "var(--r-sm)", background: "transparent", color: "var(--ink)", border: "1px solid var(--silver-2)", fontSize: 14, fontWeight: 600 }}>{t("Secondary", "ثانوي")}</button>
          <button style={{ minHeight: 44, paddingInline: 18, borderRadius: "var(--r-sm)", background: "transparent", color: "var(--harbor)", border: "none", fontSize: 14, fontWeight: 600 }}>{t("Ghost", "شبحي")}</button>
          <button style={{ minHeight: 44, paddingInline: 18, borderRadius: "var(--r-sm)", background: "transparent", color: "var(--red)", border: "1px solid var(--red)", fontSize: 14, fontWeight: 600 }}>{t("Destructive", "حذف")}</button>
        </div>
      </Section>

      <Section title={t("Listing card", "بطاقة العرض")}>
        <div style={{ maxWidth: 320, borderRadius: "var(--r-md)", border: "1px solid var(--silver)", overflow: "hidden", background: "var(--paper)" }}>
          <div style={{ height: 150, background: "linear-gradient(135deg,#2C557F,#3A6EA5)" }} />
          <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ alignSelf: "start", display: "inline-flex", alignItems: "center", gap: 6, background: "var(--verified-wash)", color: "var(--verified)", borderRadius: 999, paddingBlock: 3, paddingInline: 8, fontSize: 11, fontWeight: 700 }}>{t("Verified owner", "مالك موثّق")}</span>
            <div style={{ fontSize: 18, fontWeight: 700 }}>1,650 <span style={{ fontSize: 12, color: "var(--slate)" }}>{t("SAR/m²·yr", "ريال/م²·سنة")}</span></div>
            <div style={{ fontWeight: 600 }}>{t("Grade A Office, Al Olaya", "مكتب الفئة A، العليا")}</div>
            <div style={{ fontSize: 12.5, color: "var(--slate)" }}>{t("Al Olaya · 850 m²", "العليا · 850 m²")}</div>
            <div style={{ fontSize: 12.5, color: "var(--amber)", fontWeight: 600 }}>{t("~16% above index average", "أعلى من متوسط المؤشر بنحو 16%")}</div>
          </div>
        </div>
      </Section>

      <Section title={t("Spacing and radii", "التباعد والزوايا")}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-3)", flexWrap: "wrap" }}>
          {["--space-1","--space-2","--space-3","--space-4","--space-5","--space-6"].map((s) => (
            <div key={s} style={{ textAlign: "center" }}>
              <div style={{ width: `var(${s})`, height: `var(${s})`, background: "var(--harbor)", borderRadius: 2, marginInline: "auto" }} />
              <div className="mono" style={{ fontSize: 10, color: "var(--slate)", marginBlockStart: 6 }}>{s.replace("--space-","s")}</div>
            </div>
          ))}
          {["--r-sm","--r-md","--r-lg"].map((r) => (
            <div key={r} style={{ textAlign: "center" }}>
              <div style={{ width: 40, height: 40, background: "var(--cool)", border: "1px solid var(--silver-2)", borderRadius: `var(${r})` }} />
              <div className="mono" style={{ fontSize: 10, color: "var(--slate)", marginBlockStart: 6 }}>{r.replace("--r-","")}</div>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
