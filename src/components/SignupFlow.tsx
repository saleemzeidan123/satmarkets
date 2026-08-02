"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { apiErrorMessage } from "@/lib/apiErrors";

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
  const uid = useId();

  const roles: { v: Role; h: string; p: string }[] = [
    { v: "occupier", h: t("I need a space", "أحتاج مساحة"), p: t("Find, compare and lease or buy commercial space", "ابحث وقارن واستأجر أو اشترِ مساحة تجارية") },
    { v: "owner", h: t("I own property", "أملك عقاراً"), p: t("List your spaces and reach serious occupiers", "اعرض مساحاتك وصل إلى مستأجرين جادّين") },
    { v: "broker", h: t("I am a licensed broker", "أنا وسيط مرخّص"), p: t("Work the exchange with your FAL licence", "اعمل في المنصة برخصة فال الخاصة بك") },
    { v: "investor", h: t("I invest in real estate", "أستثمر في العقار"), p: t("Underwrite assets with sourced data", "قيّم الأصول ببيانات مُسندة") },
  ];
  const ASSET = [["office", t("Office", "مكاتب")], ["retail", t("Retail & F&B", "تجزئة ومطاعم")], ["medical", t("Medical", "طبي")], ["warehouse", t("Warehouse", "مستودعات")], ["showroom", t("Showroom", "معارض")], ["serviced", t("Serviced", "مكاتب مخدومة")], ["land", t("Land", "أراضٍ")], ["other", t("Other", "أخرى")]] as const;
  const toggleChip = (v: string) => setChips((c) => (c.includes(v) ? c.filter((x) => x !== v) : [...c, v]));

  const lbl: React.CSSProperties = { display: "block", fontSize: "0.78125rem", fontWeight: 600, color: "var(--slate)", marginBottom: 7 };
  const fs: React.CSSProperties = { border: 0, padding: 0, margin: 0, minWidth: 0 };

  /* ELITE-4 J1-2 + J1-3: a single-choice chip row was an unnamed <div> of plain
     buttons whose selection lived only in the "chip on" class. It is a named
     fieldset/legend group now, with a radiogroup and radios that expose aria-checked.
     RC9a, finding 197: that repair took the role and left the keyboard behind. A
     `role="radiogroup"` of `role="radio"` buttons promises one tab stop and arrow
     keys that move the choice; these were eight separate tab stops on which the
     arrow keys did nothing, so the contract the role announced was not the one the
     control honoured, and a keyboard user was told to press arrows that had no
     effect. They are native radios now. The browser supplies roving tabindex, arrow
     keys, Home and End, and it reverses the horizontal arrows under `dir="rtl"`
     without being asked, which is the part a hand-built group in a bilingual product
     is most likely to get wrong. The group name is per-instance because these radios
     are not inside a `<form>`, so without a unique name every group in the document
     would be one group. */
  const sel = (k: string, label: string, opts: [string, string][]) => (
    <fieldset style={fs}>
      <legend style={{ ...lbl, padding: 0 }}>{label}</legend>
      <div className="row gap8 wrap">
        {opts.map(([v, l]) => (
          <label key={v} className={d[k] === v ? "chip on" : "chip"} style={{ cursor: "pointer" }}>
            <input type="radio" name={`${uid}-${k}`} value={v} checked={d[k] === v} onChange={() => setD((p) => ({ ...p, [k]: v }))} className="sronly" />
            {l}
          </label>
        ))}
      </div>
    </fieldset>
  );
  /* ELITE-4 J1-2: the label was a plain <div>, so the control was named by its
     placeholder alone. It is a real <label htmlFor> bound to the control id now. */
  const field = (id: string, label: string, node: JSX.Element) => (
    <div><label htmlFor={id} style={lbl}>{label}</label>{node}</div>
  );
  /* ELITE-4 J1-2: multi-select chip groups carried no group name at all. */
  const group = (label: string, node: JSX.Element) => (
    <fieldset style={fs}>
      <legend style={{ ...lbl, padding: 0 }}>{label}</legend>
      {node}
    </fieldset>
  );

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const falOk = role !== "broker" || /^\d{5,12}$/.test((d.fal || "").trim());
  const falBad = !falOk && (d.fal || "").length > 0;
  const step1Ok = role === "occupier" || role === "owner" ? chips.length > 0 : role === "broker" ? falOk && (d.fal || "").length > 0 : true;
  const step2Ok = name.trim().length >= 2 && emailOk && (role !== "broker" || company.trim().length > 1);

  /* ELITE-4 J1-5: setDone(true) unmounts the focused submit button, dropping focus
     to document.body with nothing announced. Move focus to the success panel. */
  const doneRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (done) doneRef.current?.focus(); }, [done]);

  /* RC9b, finding 145: the three bars above were the only indication of how far
     through the signup a person was, and they carried it in colour alone. A bar is
     harbor or silver and nothing else; there was no text, no name for the step and
     no count, so a screen reader met three empty spans and a person who cannot
     separate those two colours met nothing at all. The count and the step name are
     text now and the bars are decoration, which is the honest split: SC 1.4.1 is
     satisfied because the information no longer depends on colour, and SC 1.3.1
     because it is in the accessibility tree rather than implied by styling. The
     wording is deliberately the same shape as ListingStudio's existing
     "Step {index} of {length}" line, because the register asked for these two
     surfaces to be reconciled rather than separately patched.

     Not an <h2>. sat-platform.css:638 sets h2 { font-size: clamp(1.3125rem, 6.6vw,
     1.875rem) !important } inside @media (max-width: 600px), and an inline style
     cannot outrank !important, so a step name marked up as a heading would render
     at 21 to 30 pixels on a phone directly above a 4 pixel bar. That is a visual
     regression, and the instruction is to resolve the interaction properly rather
     than trade the design away for the semantics.

     RC9b, finding 199: changing step unmounts the Continue or Back button that
     currently holds focus, so focus falls to document.body with nothing announced
     and the next Tab restarts from the top of the document. This is the same class
     as J1-5 above, one screen earlier. The wrapper is a named group that takes
     programmatic focus, so the move lands somewhere that says which step opened and
     where it sits in the sequence. The guard keeps the first render alone: focusing
     on mount would drag the viewport past the page heading for someone who arrived
     by ordinary navigation. */
  const STEP_NAMES = [t("Your role", "دورك"), t("About your work", "عن عملك"), t("Your details", "بياناتك")];
  const stepRef = useRef<HTMLDivElement | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    stepRef.current?.focus();
  }, [step]);

  async function submit() {
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, full_name: name.trim(), company: company.trim() || undefined, email: email.trim(), phone: phone.trim() || undefined, locale, details: { ...d, interests: chips } }),
      });
      const j = await res.json().catch(() => ({}));
      // Finding 203. The register recorded this site as rendering the route's
      // English sentence. It did not: it threw that sentence away and showed one
      // generic line for every refusal. The defect here is therefore the collapse
      // rather than the language. A person who typed an address the route would
      // not accept, or who was rate limited after six attempts, was told only
      // that something went wrong, which is the one thing they already knew.
      //
      // The route names each refusal as a stable code now, and the generic line
      // survives as what an unrecognised code falls to.
      if (!res.ok) {
        setErr(apiErrorMessage(j.code, ar, t("Something went wrong. Please try again.", "حدث خطأ. حاول مرة أخرى.")));
        return;
      }
      setDone(true);
    } catch {
      // Only a genuine network or parse failure reaches here now, so it says so
      // rather than borrowing the sentence for a refusal the server did state.
      setErr(t("Could not reach the server. Check your connection and try again.", "تعذّر الوصول إلى الخادم. تحقق من اتصالك ثم أعد المحاولة."));
    } finally { setBusy(false); }
  }

  if (done) {
    const steps = role === "owner"
      ? [t("We confirm your details by phone or email", "نتأكد من بياناتك عبر الهاتف أو البريد"), t("You share the title deed or an authorization", "تشارك صك الملكية أو تفويضاً"), t("Your account opens and your first listing goes up verified", "يُفتح حسابك ويُنشر أول عرض موثّقاً")]
      : role === "broker"
        ? [t("We check your FAL licence against the register", "نتحقق من رخصة فال في السجل"), t("A short call to agree how you work the exchange", "مكالمة قصيرة للاتفاق على طريقة عملك في المنصة"), t("Your verified broker account opens", "يُفتح حساب الوسيط الموثّق")]
        : [t("We confirm your details", "نتأكد من بياناتك"), t("Your account opens", "يُفتح حسابك"), t("You get matched supply and market data from day one", "تصلك العروض المطابقة وبيانات السوق من اليوم الأول")];
    return (
      <div ref={doneRef} tabIndex={-1} role="status" className="card" style={{ padding: 28, textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--azure-wash)", color: "var(--harbor-d)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h2 style={{ fontSize: "1.375rem", fontWeight: 700, margin: "16px 0 6px" }}>{t("Request received", "استلمنا طلبك")}</h2>
        <p className="muted" style={{ fontSize: "0.875rem", lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>{t("Every account on SAT Markets is verified by a person before it opens. Here is what happens next:", "كل حساب في سات ماركتس يوثّقه فريقنا قبل فتحه. إليك ما سيحدث الآن:")}</p>
        <div style={{ textAlign: "start", maxWidth: 400, margin: "18px auto 0" }}>
          {steps.map((s, i) => (
            <div key={i} className="row gap12" style={{ padding: "10px 0", borderBottom: i < 2 ? "1px solid var(--silver)" : "none", alignItems: "flex-start" }}>
              <span className="mono" style={{ color: "var(--harbor)", fontSize: "0.8125rem", fontWeight: 600, marginTop: 1 }}>{"0" + (i + 1)}</span>
              <span style={{ fontSize: "0.875rem", lineHeight: 1.55 }}>{s}</span>
            </div>
          ))}
        </div>
        <Link href={`/${locale}/listings`} className="btn primary lg" style={{ marginTop: 24, textDecoration: "none" }}>{t("Browse listings meanwhile", "تصفّح العروض في الأثناء")}</Link>
      </div>
    );
  }

  const stepLine = t(`Step ${step + 1} of 3`, `الخطوة ${step + 1} من 3`);

  return (
    <div ref={stepRef} tabIndex={-1} role="group" aria-label={ar ? `${stepLine}، ${STEP_NAMES[step]}` : `${stepLine}, ${STEP_NAMES[step]}`}>
      <div className="row gap8" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--slate)" }}>{STEP_NAMES[step]}</span>
        <span className="muted fig" style={{ fontSize: "0.75rem" }}>{stepLine}</span>
      </div>
      <div className="row gap6" aria-hidden="true" style={{ marginBottom: 20 }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ height: 4, borderRadius: 2, flex: 1, background: i <= step ? "var(--harbor)" : "var(--silver)", transition: "background .2s" }} />)}
      </div>

      {step === 0 && (
        <div className="col gap10">
          {roles.map((r) => (
            <button key={r.v} type="button" onClick={() => { setRole(r.v); setChips([]); setD({}); setStep(1); }}
              className="card" style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 18px", textAlign: "start", cursor: "pointer", border: "1px solid " + (role === r.v ? "var(--harbor)" : "var(--silver)"), width: "100%" }}>
              <span style={{ width: 48, height: 48, borderRadius: 13, background: "var(--azure-wash)", color: "var(--harbor)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{RIC[r.v]}</span>
              <span><span style={{ display: "block", fontSize: "1rem", fontWeight: 700 }}>{r.h}</span><span className="muted" style={{ display: "block", fontSize: "0.8125rem", marginTop: 2, lineHeight: 1.5 }}>{r.p}</span></span>
            </button>
          ))}
        </div>
      )}

      {step === 1 && role && (
        <div className="col gap16">
          {/* ELITE-4 J1-3: multi-select, so each chip is a toggle button with aria-pressed. */}
          {(role === "occupier" || role === "owner") && group(role === "occupier" ? t("What are you looking for?", "ما الذي تبحث عنه؟") : t("What do you own?", "ما الذي تملكه؟"), (
            <div className="row gap8 wrap">{ASSET.map(([v, l]) => <button key={v} type="button" aria-pressed={chips.includes(v)} onClick={() => toggleChip(v)} className={chips.includes(v) ? "chip on" : "chip"}>{l}</button>)}</div>
          ))}
          {role === "occupier" && sel("size", t("Size", "المساحة"), [["u200", t("Under 200 m²", "أقل من 200 م²")], ["200_1000", "200-1,000 m²"], ["o1000", t("Over 1,000 m²", "أكثر من 1,000 م²")]])}
          {role === "occupier" && sel("timeline", t("When do you need it?", "متى تحتاجها؟"), [["now", t("Now", "الآن")], ["3m", t("Within 3 months", "خلال 3 أشهر")], ["later", t("Exploring", "أستكشف")]])}
          {role === "owner" && sel("portfolio", t("How many properties?", "كم عقاراً؟"), [["1", t("One", "واحد")], ["2_5", "2-5"], ["6p", "6+"]])}
          {role === "owner" && sel("docs", t("Can you provide the title deed or an authorization?", "هل يمكنك تقديم الصك أو تفويض؟"), [["yes", t("Yes", "نعم")], ["help", t("I need help with this", "أحتاج مساعدة في ذلك")]])}
          {/* ELITE-4 J1-7: the "5 to 12 digits" message was orphaned. It has an id, the
              input points at it with aria-describedby, aria-invalid carries the state,
              and role="alert" announces it as it appears. */}
          {role === "broker" && field("su-fal", t("FAL licence number", "رقم رخصة فال"), (
            <><input id="su-fal" className="input fig" inputMode="numeric" aria-invalid={falBad} aria-describedby={falBad ? "su-fal-err" : "su-fal-hint"} placeholder={t("Digits only", "أرقام فقط")} value={d.fal || ""} onChange={(e) => setD((p) => ({ ...p, fal: e.target.value.replace(/[^\d]/g, "") }))} />
            {falBad ? <div id="su-fal-err" role="alert" style={{ fontSize: "0.75rem", color: "var(--red)", marginTop: 5 }}>{t("5 to 12 digits", "من 5 إلى 12 رقماً")}</div> : <div id="su-fal-hint" className="muted" style={{ fontSize: "0.75rem", marginTop: 5 }}>{t("SAT reviews it before your account opens. Automated checks against the REGA register arrive before launch.", "تراجعه سات قبل فتح حسابك. التحقق الآلي مقابل سجل الهيئة العامة للعقار يصل قبل الإطلاق.")}</div>}</>
          ))}
          {role === "investor" && sel("ticket", t("Ticket size", "حجم الاستثمار"), [["u5", t("Under SAR 5M", "أقل من 5 ملايين ريال")], ["5_50", t("SAR 5-50M", "5-50 مليون ريال")], ["o50", t("Over SAR 50M", "أكثر من 50 مليون ريال")]])}
          {role === "investor" && group(t("Focus", "التركيز"), (
            <div className="row gap8 wrap">{ASSET.slice(0, 7).map(([v, l]) => <button key={v} type="button" aria-pressed={chips.includes(v)} onClick={() => toggleChip(v)} className={chips.includes(v) ? "chip on" : "chip"}>{l}</button>)}</div>
          ))}
          <div className="row gap10" style={{ marginTop: 4 }}>
            <button type="button" className="btn secondary" onClick={() => setStep(0)}>{t("Back", "رجوع")}</button>
            <button type="button" className="btn primary grow" style={{ justifyContent: "center", opacity: step1Ok ? 1 : 0.5 }} disabled={!step1Ok} onClick={() => setStep(2)}>{t("Continue", "متابعة")}</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="col gap14">
          {field("su-name", t("Full name", "الاسم الكامل"), <input id="su-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Your name", "اسمك")} autoComplete="name" />)}
          {field("su-company", role === "broker" ? t("Brokerage", "المكتب العقاري") : t("Company (optional)", "الشركة (اختياري)"), <input id="su-company" className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder={role === "broker" ? t("Licensed entity name", "اسم المنشأة المرخّصة") : t("Company name", "اسم الشركة")} autoComplete="organization" />)}
          {field("su-email", t("Work email", "البريد الإلكتروني"), <input id="su-email" className="input" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.sa" autoComplete="email" />)}
          {field("su-phone", t("Mobile (optional)", "الجوال (اختياري)"), <input id="su-phone" className="input fig" type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+966 5X XXX XXXX" autoComplete="tel" />)}
          {/* ELITE-4 J1-4: submit failure was a bare div, silent to assistive tech. */}
          {err ? <div role="alert" style={{ fontSize: "0.8125rem", color: "var(--red)" }}>{err}</div> : null}
          <div className="row gap10" style={{ marginTop: 4 }}>
            <button type="button" className="btn secondary" onClick={() => setStep(1)}>{t("Back", "رجوع")}</button>
            <button type="button" className="btn primary grow" style={{ justifyContent: "center", opacity: step2Ok && !busy ? 1 : 0.5 }} disabled={!step2Ok || busy} onClick={submit}>{busy ? t("Sending...", "جارٍ الإرسال...") : t("Request my account", "اطلب حسابي")}</button>
          </div>
          <p className="muted" style={{ fontSize: "0.71875rem", lineHeight: 1.6, margin: 0 }}>{t("By continuing you agree to the Terms and the privacy policy. Every account is reviewed by SAT before it opens; no unverified account can list.", "بمتابعتك توافق على الشروط وسياسة الخصوصية. تراجع سات كل حساب قبل فتحه، ولا يمكن لحساب غير موثّق أن يعرض.")}</p>
        </div>
      )}
    </div>
  );
}
