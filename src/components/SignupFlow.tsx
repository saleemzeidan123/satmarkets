"use client";
import { useState } from "react";
import Link from "next/link";

type Role = "occupier" | "owner" | "broker" | "investor";
type Props = { locale: string };

const S = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const RIC: Record<Role, JSX.Element> = {
  occupier: <svg {...S}><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 10h2M13 10h2M9 14h2M13 14h2" /></svg>,
  owner: <svg {...S}><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-5h4v5" /></svg>,
  broker: <svg {...S}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" /><path d="M16.5 4.5 21 9l-4.5 4.5" /></svg>,
  investor: <svg {...S}><path d="M4 20V10M10 20V4M16 20v-8M21 20H3" /></svg>,
};

export default function SignupFlow({ locale }: Props) {
  const ar = locale === "ar";
  const t = (en: string, arr: string) => (ar ? arr : en);
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role | null>(null);
  const [d, setD] = useState<Record<string, string>>({});
  const [chips, setChips] = useState<string[]>([]);
  const [name, setName] = useState(""); const [company, setCompany] = useState("");
  const [email, setEmail] = useState(""); const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [err, setErr] = useState("");

  const roles: { v: Role; h: string; p: string }[] = [
    { v: "occupier", h: t("I need a space", "أحتاج مساحة"), p: t("Find and lease or buy verified commercial space", "ابحث واستأجر أو اشترِ مساحة تجارية موثّقة") },
    { v: "owner", h: t("I own property", "أملك عقاراً"), p: t("List verified spaces and reach serious occupiers", "اعرض مساحات موثّقة وصل إلى مستأجرين جادّين") },
    { v: "broker", h: t("I am a licensed broker", "أنا وسيط مرخّص"), p: t("Work the exchange with your FAL licence", "اعمل في المنصة برخصة فال الخاصة بك") },
    { v: "investor", h: t("I invest in real estate", "أستثمر في العقار"), p: t("Underwrite verified assets with sourced data", "قيّم أصولاً موثّقة ببيانات مُسندة") },
  ];
  const ASSET = [["office", t("Office", "مكاتب")], ["retail", t("Retail & F&B", "تجزئة ومطاعم")], ["medical", t("Medical", "طبي")], ["warehouse", t("Warehouse", "مستودعات")], ["showroom", t("Showroom", "معارض")], ["serviced", t("Serviced", "مكاتب مخدومة")], ["land", t("Land", "أراضٍ")], ["other", t("Other", "أخرى")]] as const;
  const toggleChip = (v: string) => setChips((c) => (c.includes(v) ? c.filter((x) => x !== v) : [...c, v]));

  const sel = (k: string, opts: [string, string][]) => (
    <div className="row gap8 wrap">
      {opts.map(([v, l]) => (
        <button key={v} type="button" onClick={() => setD((p) => ({ ...p, [k]: v }))} className={d[k] === v ? "chip on" : "chip"}>{l}</button>
      ))}
    </div>
  );
  const field = (label: string, node: JSX.Element) => (
    <div><div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--slate)", marginBottom: 7 }}>{label}</div>{node}</div>
  );

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const falOk = role !== "broker" || /^\d{5,12}$/.test((d.fal || "").trim());
  const step1Ok = role === "occupier" || role === "owner" ? chips.length > 0 : role === "broker" ? falOk && (d.fal || "").length > 0 : true;
  const step2Ok = name.trim().length >= 2 && emailOk && (role !== "broker" || company.trim().length > 1);

  async function submit() {
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, full_name: name.trim(), company: company.trim() || undefined, email: email.trim(), phone: phone.trim() || undefined, locale, details: { ...d, interests: chips } }),
      });
      const j = await res.json();
      if (!res.ok || j.error) throw new Error(j.error || "failed");
      setDone(true);
    } catch (e) {
      setErr(t("Something went wrong. Please try again.", "حدث خطأ. حاول مرة أخرى."));
    } finally { setBusy(false); }
  }

  if (done) {
    const steps = role === "owner"
      ? [t("We confirm your details by phone or email", "نتأكد من بياناتك عبر الهاتف أو البريد"), t("You share the title deed or an authorization", "تشارك صك الملكية أو تفويضاً"), t("Your account opens and your first listing goes up verified", "يُفتح حسابك ويُنشر أول عرض موثّقاً")]
      : role === "broker"
        ? [t("We check your FAL licence against the register", "نتحقق من رخصة فال في السجل"), t("A short call to agree how you work the exchange", "مكالمة قصيرة للاتفاق على طريقة عملك في المنصة"), t("Your verified broker account opens", "يُفتح حساب الوسيط الموثّق")]
        : [t("We confirm your details", "نتأكد من بياناتك"), t("Your account opens", "يُفتح حسابك"), t("You get matched supply and market data from day one", "تصلك العروض المطابقة وبيانات السوق من اليوم الأول")];
    return (
      <div className="card" style={{ padding: 28, textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--azure-wash)", color: "var(--harbor-d)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: "16px 0 6px" }}>{t("Request received", "استلمنا طلبك")}</h2>
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>{t("Every account on SAT Markets is verified by a person before it opens. Here is what happens next:", "كل حساب في سات ماركتس يوثّقه فريقنا قبل فتحه. إليك ما سيحدث الآن:")}</p>
        <div style={{ textAlign: "start", maxWidth: 400, margin: "18px auto 0" }}>
          {steps.map((s, i) => (
            <div key={i} className="row gap12" style={{ padding: "10px 0", borderBottom: i < 2 ? "1px solid var(--silver)" : "none", alignItems: "flex-start" }}>
              <span className="mono" style={{ color: "var(--harbor)", fontSize: 13, fontWeight: 600, marginTop: 1 }}>{"0" + (i + 1)}</span>
              <span style={{ fontSize: 14, lineHeight: 1.55 }}>{s}</span>
            </div>
          ))}
        </div>
        <Link href={`/${locale}/listings`} className="btn primary lg" style={{ marginTop: 24, textDecoration: "none" }}>{t("Browse listings meanwhile", "تصفّح العروض في الأثناء")}</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="row gap6" style={{ marginBottom: 20 }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ height: 4, borderRadius: 2, flex: 1, background: i <= step ? "var(--harbor)" : "var(--silver)", transition: "background .2s" }} />)}
      </div>

      {step === 0 && (
        <div className="col gap10">
          {roles.map((r) => (
            <button key={r.v} type="button" onClick={() => { setRole(r.v); setChips([]); setD({}); setStep(1); }}
              className="card" style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 18px", textAlign: "start", cursor: "pointer", border: "1px solid " + (role === r.v ? "var(--harbor)" : "var(--silver)"), width: "100%" }}>
              <span style={{ width: 48, height: 48, borderRadius: 13, background: "var(--azure-wash)", color: "var(--harbor)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{RIC[r.v]}</span>
              <span><span style={{ display: "block", fontSize: 16, fontWeight: 700 }}>{r.h}</span><span className="muted" style={{ display: "block", fontSize: 13, marginTop: 2, lineHeight: 1.5 }}>{r.p}</span></span>
            </button>
          ))}
        </div>
      )}

      {step === 1 && role && (
        <div className="col gap16">
          {(role === "occupier" || role === "owner") && field(role === "occupier" ? t("What are you looking for?", "ما الذي تبحث عنه؟") : t("What do you own?", "ما الذي تملكه؟"), (
            <div className="row gap8 wrap">{ASSET.map(([v, l]) => <button key={v} type="button" onClick={() => toggleChip(v)} className={chips.includes(v) ? "chip on" : "chip"}>{l}</button>)}</div>
          ))}
          {role === "occupier" && field(t("Size", "المساحة"), sel("size", [["u200", t("Under 200 m²", "أقل من 200 م²")], ["200_1000", "200-1,000 m²"], ["o1000", t("Over 1,000 m²", "أكثر من 1,000 م²")]]))}
          {role === "occupier" && field(t("When do you need it?", "متى تحتاجها؟"), sel("timeline", [["now", t("Now", "الآن")], ["3m", t("Within 3 months", "خلال 3 أشهر")], ["later", t("Exploring", "أستكشف")]]))}
          {role === "owner" && field(t("How many properties?", "كم عقاراً؟"), sel("portfolio", [["1", t("One", "واحد")], ["2_5", "2-5"], ["6p", "6+"]]))}
          {role === "owner" && field(t("Can you provide the title deed or an authorization?", "هل يمكنك تقديم الصك أو تفويض؟"), sel("docs", [["yes", t("Yes", "نعم")], ["help", t("I need help with this", "أحتاج مساعدة في ذلك")]]))}
          {role === "broker" && field(t("FAL licence number", "رقم رخصة فال"), (
            <><input className="input fig" inputMode="numeric" placeholder={t("Digits only", "أرقام فقط")} value={d.fal || ""} onChange={(e) => setD((p) => ({ ...p, fal: e.target.value.replace(/[^\d]/g, "") }))} />
            {!falOk && (d.fal || "").length > 0 ? <div style={{ fontSize: 12, color: "var(--red)", marginTop: 5 }}>{t("5 to 12 digits", "من 5 إلى 12 رقماً")}</div> : <div className="muted" style={{ fontSize: 12, marginTop: 5 }}>{t("SAT reviews it before your account opens. Automated checks against the REGA register arrive before launch.", "تراجعه سات قبل فتح حسابك. التحقق الآلي مقابل سجل الهيئة العامة للعقار يصل قبل الإطلاق.")}</div>}</>
          ))}
          {role === "investor" && field(t("Ticket size", "حجم الاستثمار"), sel("ticket", [["u5", t("Under SAR 5M", "أقل من 5 ملايين ريال")], ["5_50", t("SAR 5-50M", "5-50 مليون ريال")], ["o50", t("Over SAR 50M", "أكثر من 50 مليون ريال")]]))}
          {role === "investor" && field(t("Focus", "التركيز"), (
            <div className="row gap8 wrap">{ASSET.slice(0, 7).map(([v, l]) => <button key={v} type="button" onClick={() => toggleChip(v)} className={chips.includes(v) ? "chip on" : "chip"}>{l}</button>)}</div>
          ))}
          <div className="row gap10" style={{ marginTop: 4 }}>
            <button type="button" className="btn secondary" onClick={() => setStep(0)}>{t("Back", "رجوع")}</button>
            <button type="button" className="btn primary grow" style={{ justifyContent: "center", opacity: step1Ok ? 1 : 0.5 }} disabled={!step1Ok} onClick={() => setStep(2)}>{t("Continue", "متابعة")}</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="col gap14">
          {field(t("Full name", "الاسم الكامل"), <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Your name", "اسمك")} autoComplete="name" />)}
          {field(role === "broker" ? t("Brokerage", "المكتب العقاري") : t("Company (optional)", "الشركة (اختياري)"), <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder={role === "broker" ? t("Licensed entity name", "اسم المنشأة المرخّصة") : t("Company name", "اسم الشركة")} autoComplete="organization" />)}
          {field(t("Work email", "البريد الإلكتروني"), <input className="input" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.sa" autoComplete="email" />)}
          {field(t("Mobile (optional)", "الجوال (اختياري)"), <input className="input fig" type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+966 5X XXX XXXX" autoComplete="tel" />)}
          {err ? <div style={{ fontSize: 13, color: "var(--red)" }}>{err}</div> : null}
          <div className="row gap10" style={{ marginTop: 4 }}>
            <button type="button" className="btn secondary" onClick={() => setStep(1)}>{t("Back", "رجوع")}</button>
            <button type="button" className="btn primary grow" style={{ justifyContent: "center", opacity: step2Ok && !busy ? 1 : 0.5 }} disabled={!step2Ok || busy} onClick={submit}>{busy ? t("Sending...", "جارٍ الإرسال...") : t("Request my account", "اطلب حسابي")}</button>
          </div>
          <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.6, margin: 0 }}>{t("By continuing you agree to the Terms and the privacy policy. Every account is reviewed by SAT before it opens; no unverified account can list.", "بمتابعتك توافق على الشروط وسياسة الخصوصية. تراجع سات كل حساب قبل فتحه، ولا يمكن لحساب غير موثّق أن يعرض.")}</p>
        </div>
      )}
    </div>
  );
}
