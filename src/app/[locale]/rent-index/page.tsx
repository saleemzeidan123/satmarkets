import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel, segmentLabel, unitLabel } from "@/lib/labels";

interface Row {
  id: string; period: string; district_id: string | null; district_label: string; district_label_ar: string | null;
  asset_type: string; segment: string | null; unit: string; band_low: number | null; band_high: number | null;
  median: number | null; sufficient: boolean; note: string | null; source: string; sort_order: number;
}

// Full, extensible space-type list. Types without a verified sample render as a blank, honest placeholder.
const TYPES: { k: string; en: string; ar: string }[] = [
  { k: "office", en: "Office", ar: "مكاتب" },
  { k: "retail", en: "Retail & F&B", ar: "تجزئة ومطاعم" },
  { k: "warehouse", en: "Warehouse & logistics", ar: "مستودعات ولوجستيات" },
  { k: "medical", en: "Medical", ar: "رعاية صحية" },
  { k: "showroom", en: "Showroom", ar: "معارض" },
  { k: "serviced", en: "Serviced & flexible office", ar: "مكاتب مخدومة ومرنة" },
  { k: "education", en: "Education", ar: "تعليم" },
  { k: "hospitality", en: "Hospitality", ar: "ضيافة" },
  { k: "land", en: "Land & development", ar: "أراضٍ وتطوير" },
  { k: "mixed_use", en: "Mixed-use", ar: "متعدد الاستخدامات" },
];

export default async function RentIndexPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const sb = getSupabaseServer();
  let rows: Row[] = [];
  if (sb) {
    const { data } = await sb.from("rent_index_published").select("*").order("sort_order");
    rows = (data as Row[]) ?? [];
  }

  const t = {
    eyebrow: ar ? "مؤشر سات ماركتس للإيجارات التجارية بالرياض · الربع الأول 2026" : "SAT Markets Riyadh Commercial Rent Index · Q1 2026",
    title: ar ? "نطاقات إيجار موثقة" : "Verified rent bands",
    intro: ar
      ? "نطاقات ووسطاء الإيجار حسب الحي ونوع المساحة، مجمّعة من إصدارات السوق العامة للربع الأول 2026 وبيانات موثقة. مؤشر جزئي يغطي أجزاءً من السوق التجاري؛ تُترك الخلايا دون عينة كافية فارغة بدل تقديرها، وتضيق النطاقات مع نمو البيانات الموثقة. كل أنواع المساحات مدرجة، وما لا تتوفر له أرقام بعد يظهر فارغاً."
      : "Rent bands and medians by district and space type, compiled from public Q1 2026 market releases and verified data. A partial benchmark covering parts of the commercial market — cells without a defensible sample are left blank rather than estimated, and bands narrow as verified data grows. Every space type is listed; those without figures yet appear blank.",
    district: ar ? "الحي / التجمّع" : "District / cluster",
    segment: ar ? "الشريحة" : "Segment",
    band: ar ? "النطاق" : "Band (low–high)",
    median: ar ? "الوسيط" : "Median",
    unit: ar ? "الوحدة" : "Unit",
    insufficient: ar ? "عينة غير كافية" : "Insufficient sample",
    awaiting: ar ? "بانتظار بيانات موثقة لهذا النوع — ستُنشر عند توفّر عينة كافية." : "Awaiting verified data for this space type — figures will publish once a defensible sample exists.",
    cite: ar
      ? "حر الاقتباس مع الإسناد · CC BY 4.0. مجمّع من إصدارات السوق العامة للربع الأول 2026 (JLL، Knight Frank، CBRE، Savills) ووسطاء من القوائم (Bayut، عقار) وبيانات موثقة."
      : "Free to cite with attribution · CC BY 4.0. Compiled from public Q1 2026 market releases (JLL, Knight Frank, CBRE, Savills), listing-derived medians (Bayut, Aqar), and verified data.",
  };

  return (
    <section>
      <div className="eyebrow">{t.eyebrow}</div>
      <h1 className="mt-1 font-display text-3xl text-charcoal">{t.title}</h1>
      <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-charcoal/60">{t.intro}</p>

      <div className="mt-8 space-y-8">
        {TYPES.map((ty) => {
          const grp = rows.filter((r) => r.asset_type === ty.k);
          const label = ar ? ty.ar : ty.en;
          return (
            <div key={ty.k}>
              <h2 className="font-display text-xl text-charcoal">{label}</h2>
              {grp.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-line bg-ivory-2/30 px-5 py-6 text-[13.5px] text-charcoal/45">
                  {t.awaiting}
                </div>
              ) : (
                <div className="mt-3 overflow-x-auto overflow-hidden rounded-2xl border border-line bg-white shadow-card">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-line bg-ivory-2/60 text-start text-[11px] uppercase tracking-wide text-charcoal/45">
                        <th className="px-5 py-3 text-start font-medium">{t.district}</th>
                        <th className="px-5 py-3 text-start font-medium">{t.segment}</th>
                        <th className="px-5 py-3 text-start font-medium">{t.band}</th>
                        <th className="px-5 py-3 text-start font-medium">{t.median}</th>
                        <th className="px-5 py-3 text-start font-medium">{t.unit}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grp.map((r) => {
                        const place = ar ? (r.district_label_ar || r.district_label) : r.district_label;
                        return (
                          <tr key={r.id} className={`border-t border-line ${r.sufficient ? "hover:bg-ivory-2/40" : "bg-ivory-2/20"}`}>
                            <td className="px-5 py-3.5 text-charcoal">{place}</td>
                            <td className="px-5 py-3.5 text-[12.5px] text-charcoal/60">{segmentLabel(r.segment, locale)}</td>
                            {r.sufficient ? (
                              <>
                                <td className="px-5 py-3.5 text-charcoal/75">{r.band_low != null ? `${r.band_low!.toLocaleString()} – ${r.band_high!.toLocaleString()}` : "—"}</td>
                                <td className="px-5 py-3.5 font-display text-lg text-gold">{r.median != null ? Math.round(r.median).toLocaleString() : "—"}</td>
                                <td className="px-5 py-3.5 text-[12px] text-charcoal/50">{unitLabel(r.unit, locale)}</td>
                              </>
                            ) : (
                              <td className="px-5 py-3.5 text-[12.5px] italic text-charcoal/40" colSpan={3}>◌ {r.note || t.insufficient}</td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-line bg-ivory-2/40 p-5">
        <p className="text-[12.5px] leading-relaxed text-charcoal/55">{t.cite}</p>
      </div>
    </section>
  );
}
