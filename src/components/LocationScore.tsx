import { Icon } from "@/components/satkit";

// SAT Location Score v1 (sample-labelled, Law 3 safe).
// Renders only for retail-like assets. Every rating is transparent: the five
// lenses and the sourcing note are always shown, figures are representative
// samples until the live Saudi data partnerships come online (see /area).
// A rating never asserts what the data cannot support: uses without inputs
// route to the advisor instead of showing a score.

const COVERED = ["retail", "showroom", "medical", "serviced"];

function Stars({ n, size = 15 }: { n: number; size?: number }) {
  return (
    <span aria-label={`${n} / 5`} style={{ letterSpacing: 2, fontSize: size, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= Math.round(n) ? "var(--harbor)" : "var(--silver-2)" }}>★</span>
      ))}
    </span>
  );
}

export default function LocationScore({ ar, district, assetType }: { ar: boolean; district: string; assetType: string }) {
  if (!COVERED.includes(assetType)) return null;

  const uses: [string, string, number, string, string][] = [
    ["Café", "مقهى", 5, "High daytime population and an office-worker visitor profile", "كثافة نهارية عالية وزوّار من موظفي المكاتب"],
    ["Pharmacy", "صيدلية", 4, "Steady weekday footfall, low direct saturation in the trade area", "حركة مشاة منتظمة أيام الأسبوع وتشبّع منخفض في النطاق"],
    ["Medical clinic", "عيادة طبية", 4, "Working-age catchment and complementary co-tenancy", "نطاق بعمر العمل ومزيج مستأجرين مكمّل"],
    ["Fashion retail", "أزياء وتجزئة", 3, "Footfall peaks midday, evening dwell is moderate", "ذروة الحركة منتصف النهار وبقاء مسائي متوسط"],
    ["Luxury retail", "تجزئة فاخرة", 2, "Top-quartile income, but a work-led visit pattern", "دخل في الربع الأعلى لكن نمط الزيارة مرتبط بالعمل"],
  ];
  const lenses = [
    ["Foot traffic", "حركة المشاة"], ["Demographics fit", "ملاءمة الديموغرافيا"], ["Market potential", "إمكانات السوق"], ["Competition", "المنافسة"], ["Visibility", "الظهور"],
  ];

  return (
    <div className="card pad" style={{ marginTop: 18, boxShadow: "none" }}>
      <div className="modhead">
        <Icon.target size={18} />
        <span className="ttl">{ar ? "درجة الموقع من سات" : "SAT Location Score"}</span>
        <span className="grow" />
        <span className="tag">{ar ? "عيّنة" : "sample"}</span>
      </div>
      <div className="row gap16 wrap" style={{ alignItems: "center", marginTop: 4 }}>
        <span className="mono" style={{ fontSize: 34, fontWeight: 500 }}>4.2</span>
        <div className="col" style={{ gap: 4 }}>
          <Stars n={4.2} size={17} />
          <span className="muted" style={{ fontSize: 12 }}>{ar ? `تقييم عام للموقع في ${district} (عيّنة)` : `Overall location rating in ${district} (sample)`}</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 14, marginTop: 18 }}>
        {[
          [ar ? "مؤشر حركة المشاة" : "Footfall index", "138", ar ? "المدينة = 100" : "city = 100"],
          [ar ? "السكان نهاراً" : "Daytime population", "412k", ar ? "نطاق 10 دقائق" : "10-min catchment"],
          [ar ? "مؤشر دخل الأسرة" : "Household income index", "124", ar ? "الربع الأعلى" : "top quartile"],
          [ar ? "أبرز الزوّار" : "Top visitors", ar ? "موظفو المكاتب" : "Office workers", ar ? "62% بعمر 25 إلى 44" : "62% aged 25 to 44"],
        ].map((k, i) => (
          <div key={i} className="card pad" style={{ boxShadow: "none", background: "var(--cool)", padding: 14 }}>
            <div className="muted" style={{ fontSize: 11 }}>{k[0]}</div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 500, marginTop: 6 }}>{k[1]}</div>
            <div className="muted" style={{ fontSize: 10.5, marginTop: 4 }}>{k[2]}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{ar ? "ماذا يريد هذا الموقع" : "What this location wants"}</div>
        <div className="col" style={{ gap: 10, marginTop: 12 }}>
          {uses.map((u, i) => (
            <div key={i} className="row gap12 wrap" style={{ alignItems: "baseline" }}>
              <span style={{ minWidth: 120, fontSize: 13.5, fontWeight: 600 }}>{ar ? u[1] : u[0]}</span>
              <Stars n={u[2]} />
              <span className="muted" style={{ fontSize: 12.5 }}>{ar ? u[4] : u[3]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="row gap8 wrap" style={{ marginTop: 18 }}>
        {lenses.map((l, i) => (<span key={i} className="chip" style={{ fontSize: 11.5 }}>{ar ? l[1] : l[0]}</span>))}
      </div>
      <p className="muted" style={{ fontSize: 12, lineHeight: 1.65, marginTop: 12, marginBottom: 0 }}>
        {ar
          ? "تُبنى الدرجة من العدسات الخمس أعلاه بمدخلات مُسندة المصدر، لا رقم صندوق أسود. الأرقام المعروضة عيّنات تمثيلية حتى تفعيل شراكات البيانات السعودية الحية الموضحة في صفحة ذكاء الموقع. الاستخدامات دون بيانات كافية تُوجَّه إلى المستشار. استرشادي، ليس نصيحة."
          : "The score is built from the five lenses above with sourced inputs, never a black-box number. Figures shown are representative samples until the live Saudi data partnerships described on the Location Intelligence page come online. Uses without sufficient data route to the advisor. Indicative, not advice."}
      </p>
    </div>
  );
}
