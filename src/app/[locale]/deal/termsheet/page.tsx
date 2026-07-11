import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import PrintButton from "@/components/PrintButton";

import SampleBanner from "@/components/SampleBanner";
import { getDictionary } from "@/i18n/getDictionary";
export default function TermSheetPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const t = getDictionary(ar ? "ar" : "en").termsheet;
  const terms: [string, string, string][] = ar ? [
    ["الإيجار السنوي", "464,000 ريال", "1,450/م² · 320 م²"],
    ["المدة", "5 سنوات", "شهران مجاناً"],
    ["التصعيد", "مفتوح · إعادة تسعير عند التجديد", "خارج التجميد"],
    ["التأمين", "5% · 23,200 ريال", "يُدفع مباشرة للمالك"],
    ["تسجيل إيجار", "بواسطة المالك / الوسيط", "عقد إيجار قياسي"],
  ] : [
    ["Annual rent", "464,000 SAR", "1,450/m² · 320 m²"],
    ["Term", "5 years", "2 months rent-free"],
    ["Escalation", "Open · re-price at renewal", "Not under the freeze"],
    ["Deposit", "5% · 23,200 SAR", "Paid direct to landlord"],
    ["Ejar registration", "By landlord / broker", "Standard Ejar lease"],
  ];
  const parties: [string, string][] = ar
    ? [["أنت · شركة آكمي", "مستأجر"], ["شركة أبراج العليا", "مالك موثّق"]]
    : [["You · Acme Co.", "Occupier"], ["Olaya Towers Co.", "Verified owner"]];
  const next: string[] = ar
    ? ["يشارك المالك مسودة عقد إيجار", "يوقّع الطرفان في إيجار مباشرة", "دفع التأمين وتسليم المفاتيح"]
    : ["Owner shares the Ejar lease draft", "Both parties sign in Ejar directly", "Deposit paid and keys handed over"];
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "28px 24px 56px", fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <SampleBanner ar={ar} />
      <div className="row between wrap no-print" style={{ marginBottom: 18, gap: 10 }}>
        <Link href={`/${locale}/deal`} className="chip" style={{ textDecoration: "none" }}>{t.dealRoomLink}</Link>
        <PrintButton label={t.printSave} />
      </div>
      <div className="card" style={{ padding: "30px 34px" }}>
        <div className="row between wrap" style={{ alignItems: "flex-start", gap: 10 }}>
          <div>
            <div className="eyebrow">{t.termSheetRef}</div>
            <h1 className="serif" style={{ fontSize: 26, fontWeight: 500, margin: "10px 0 2px" }}>{t.propertyTitle}</h1>
            <div className="muted" style={{ fontSize: 12.5 }}>{t.propertySub}</div>
          </div>
          <div className="mono muted" style={{ fontSize: 11, textAlign: ar ? "left" : "right" }}>SAT MARKETS<br />{new Date().toISOString().slice(0, 10)}</div>
        </div>
        <div style={{ marginTop: 22 }}>
          {terms.map((r, i) => (
            <div key={i} className="row between" style={{ padding: "11px 0", borderTop: i ? "1px solid var(--silver)" : "2px solid var(--ink)" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{r[0]}</span>
              <div style={{ textAlign: ar ? "left" : "right" }}>
                <div className="mono" style={{ fontSize: 13 }}>{r[1]}</div>
                <div className="muted" style={{ fontSize: 11 }}>{r[2]}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 22 }}>
          <div>
            <div className="eyebrow" style={{ fontSize: 10.5 }}>{t.parties}</div>
            {parties.map((p, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--silver)" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p[0]}</div>
                <div className="muted" style={{ fontSize: 11 }}>{p[1]}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="eyebrow" style={{ fontSize: 10.5 }}>{t.whatNext}</div>
            {next.map((n, i) => (
              <div key={i} className="row gap8" style={{ padding: "8px 0", borderBottom: "1px solid var(--silver)", alignItems: "baseline" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--harbor)" }}>{i + 1}</span>
                <span style={{ fontSize: 12.5 }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="muted" style={{ fontSize: 10.5, lineHeight: 1.6, marginTop: 24, paddingTop: 12, borderTop: "1px solid var(--silver)" }}>
          {ar
            ? "هذه الورقة تلخيص للشروط المتفق عليها وليست عقداً. يُوقّع عقد إيجار مباشرة بين الطرفين، ولا توقّع SAT ولا تحتفظ بالأموال. سات ماركتس منصّة تابعة لـ SAT العقارية، رخصة فال 1200025510."
            : "This sheet summarises the agreed terms and is not a contract. The Ejar lease is signed directly between the parties; SAT does not sign or hold funds. SAT Markets is a SAT Real Estate platform, FAL licence 1200025510."}
        </p>
      </div>
    </div>
  );
}
