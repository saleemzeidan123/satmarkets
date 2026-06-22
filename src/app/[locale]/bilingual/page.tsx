import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon, Photo } from "@/components/satkit";

export default function BilingualPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const specs: [string, string][] = [
    ["٣٢٠ م²", "المساحة"], ["الطابق ١٨", "منطقة عليا"], ["٣٢", "محطة عمل"], ["مجهّز", "جاهز للدخول"],
  ];
  return (
    <div style={{ background: "var(--paper)" }}>
      {/* language switch bar */}
      <div className="row between wrap" style={{ padding: "12px 24px", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 10 }}>
        <div className="row gap10 wrap" style={{ alignItems: "center" }}>
          <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}><Icon.spark size={12} /> Auto-translated from English</span>
          <span className="muted" style={{ fontSize: 12 }}>· reviewed by owner</span>
          <span style={{ fontSize: 12, color: "var(--azure-d)", fontWeight: 600 }}>View original (EN)</span>
        </div>
        <span className="seg"><span>EN</span><span className="on">العربية</span></span>
      </div>

      {/* RTL listing body */}
      <div dir="rtl" className="bilingual-grid" style={{ fontFamily: "var(--ar)", padding: "22px 24px 44px" }}>
        <div>
          <Photo kind="office" label="مكتب فئة A · برج العليا" h={320} style={{ borderRadius: 12 }} badges={[<span key="v" className="verified"><span className="dot" />مالك موثّق</span>]} />
          <div className="row gap10 wrap" style={{ margin: "16px 0 10px" }}>
            <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>مكتب · إيجار</span>
            <span className="tag">فئة A</span><span className="tag">مجهّز</span><span className="tag">متاح الآن</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: 0, margin: 0 }}>طابق مكتبي فئة A، برج العليا</h1>
          <div className="row gap10" style={{ marginTop: 10, color: "var(--slate)", fontSize: 14 }}>
            <span className="row gap6"><Icon.pin size={16} /> حي العليا، الرياض</span><span>·</span><span>الطابق ١٨</span>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "24px 0 8px" }}>عن هذه المساحة</h3>
          <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.85, maxWidth: 560 }}>
            طابق فئة A مجهّز بالكامل بإطلالة بانورامية على المدينة، أرضيات تقنية مرفوعة ومصعد مخصص. جاهز للتسجيل في إيجار، ومثالي لمقر إقليمي في حي العليا.
          </p>
          <div className="bilingual-specs" style={{ marginTop: 22 }}>
            {specs.map((s, i) => (
              <div key={i} className="card pad" style={{ boxShadow: "none", padding: 16 }}>
                <div className="mono" style={{ fontSize: 16, fontWeight: 500 }}>{s[0]}</div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{s[1]}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="card" style={{ padding: 22, boxShadow: "var(--sh-2)" }}>
            <div className="price" style={{ fontSize: 26 }}>١٬٤٥٠ <small style={{ fontSize: 13 }}>ريال/م²·سنة</small></div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>≈ ٤٦٤٬٠٠٠ ريال/سنة · ٣٢٠ م²</div>
            <div style={{ height: 1, background: "var(--silver)", margin: "18px 0" }} />
            <div className="row gap12" style={{ alignItems: "center" }}>
              <span className="avatar" style={{ background: "var(--harbor)" }}>OT</span>
              <div><div style={{ fontSize: 14, fontWeight: 600 }}>شركة أبراج العليا</div><div className="muted" style={{ fontSize: 12 }}>مالك مباشر · يرد خلال ساعتين</div></div>
            </div>
            <div className="col gap10" style={{ marginTop: 16 }}>
              <span className="btn primary lg" style={{ justifyContent: "center" }}>تواصل مع المُعلِن — مجاناً</span>
              <span className="btn secondary" style={{ justifyContent: "center" }}><Icon.cal size={16} /> طلب معاينة</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
