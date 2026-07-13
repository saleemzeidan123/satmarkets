import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon, Logo, Mark, HARBOR } from "@/components/satkit";
import SignupFlow from "@/components/SignupFlow";
import { getDictionary } from "@/i18n/getDictionary";
import Link from "next/link";

export default function SignupPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const locale = params.locale;
 const ar = locale === "ar";
 const t = getDictionary(ar ? "ar" : "en").signupPage;
 const bullets = ar
  ? ["لكل عرض حالة توثيق ظاهرة، لا شارة على كل شيء", "مؤشر إيجارات وذكاء موقع بمستوى القرار", "الصفقة من أولها إلى آخرها في مكان واحد"]
  : ["Every listing shows its real verification state", "Decision-grade Rent Index & Location Intelligence", "The full deal, end to end, in one place"];
 return (
  <div className="auth-split">
   <div className="auth-brand">
    <div style={{ position: "absolute", right: -60, bottom: -70, opacity: .14 }}><Mark size={360} base="#2a3742" lit={HARBOR} /></div>
    <Logo size={30} rev />
    <div style={{ marginTop: "auto", position: "relative" }}>
     <div className="serif" style={{ fontSize: 34, fontWeight: 500, lineHeight: 1.12, letterSpacing: "-.02em" }}>{t.hero}</div>
     <div className="col gap12" style={{ marginTop: 26 }}>
      {bullets.map((b, i) => (
       <div key={i} className="row gap10" style={{ fontSize: 14, color: "#C7CFD7" }}><span style={{ color: "var(--azure-l)" }}><Icon.check size={16} /></span>{b}</div>
      ))}
     </div>
     <div className="row gap8" style={{ marginTop: 30 }}>
      {["REGA-licensed", "PDPL", "Ejar"].map((t, i) => <span key={i} className="tag" style={{ color: "rgba(255,255,255,.7)", borderColor: "rgba(255,255,255,.2)" }}>{t}</span>)}
     </div>
    </div>
   </div>
   <div className="auth-form">
    <div style={{ width: 480, maxWidth: "100%" }}>
     <div className="mono muted" style={{ fontSize: 11, letterSpacing: ".06em" }}>{t.byFamily}</div>
     <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", margin: "10px 0 4px" }}>{t.createAccount}</h1>
     <p className="muted" style={{ fontSize: 14, margin: "0 0 20px" }}>{t.pickRole}</p>
     <SignupFlow locale={locale} />
     <p className="muted" style={{ fontSize: 12.5, textAlign: "center", marginTop: 18 }}>{t.haveAccount} <Link href={"/" + locale + "/login"} style={{ color: "var(--azure-d)", fontWeight: 600, textDecoration: "none" }}>{t.signIn}</Link></p>
    </div>
   </div>
  </div>
 );
}
