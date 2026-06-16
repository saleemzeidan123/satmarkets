import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel, segmentLabel, unitLabel } from "@/lib/labels";

interface Row {
  id: string; period: string; district_id: string | null; district_label: string; district_label_ar: string | null;
  asset_type: string; segment: string | null; unit: string; band_low: number | null; band_high: number | null;
  median: number | null; sufficient: boolean; note: string | null; source: string; sort_order: number;
}

const ASSET_ORDER = ["office","serviced","medical","showroom","warehouse","retail"];

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
  const groups = ASSET_ORDER.map((a) => ({ asset: a, rows: rows.filter((r) => r.asset_type === a) })).filter((g) => g.rows.length);

  const t = {
    eyebrow: ar ? "مؤشر سات للإيجارات التجارية بالرياض · الربع الأول 2026" : "SAT Riyadh Commercial Rent Index · Q1 2026",
    title: ar ? "نطاقات إيجار موثقة" : "Verified rent bands",
    intro: ar
      ? "نطاقات ووسطاء الإيجار حسب الحي ونوع الأصل، من عمل سات الاستشاري وإصدارات الربع الأول 2026. مؤشر جزئي يغطي أجزاءً من السوق التجاري؛ تُترك الخلايا دون عينة عامة كافية فارغة بدل تقديرها، وتضيق النطاقات مع نمو بيانات صفقات سات."
      : "Rent bands and medians by district and asset class, from SAT's advisory work and the Q1 2026 releases. A partial benchmark covering parts of the commercial market — cells without a defensible public sample are left blank rather than estimated, and bands narrow as SAT's transaction data grows.",
    district: ar ? "الحي / التجمّع" : "District / cluster",
    segment: ar ? "الشريحة" : "Segment",
    band: ar ? "النطاق" : "Band (low–high)",
    median: ar ? "الوسيط" : "Median",
    unit: ar ? "الوحدة" : "Unit",
    insufficient: ar ? "عينة عامة غير كافية" : "Insufficient public sample",
    cite: ar
      ? "حر الاقتباس مع الإسناد · CC BY 4.0. المصدر: JLL وKnight Frank وCBRE وSavills (الربع الأول 2026)، ووسطاء من Bayut وعقار، وعمل سات الاستشاري عبر أكثر من 200 صفقة و500 مبنى."
      : "Free to cite with attribution · CC BY 4.0. Sourced from JLL, Knight Frank, CBRE and Savills Q1 2026 releases, listing-derived medians from Bayut and Aqar, and SAT's advisory work across 200+ transactions and 500+ buildings.",
    full: ar ? "اقرأ الإصدار الكامل" : "Read the full publication",
  };

  return (
    <section>
      <div className="eyebrow">{t.eyebrow}</div>
      <h1 className="mt-1 font-display text-3xl text-charcoal">{t.title}</h1>
      <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-charcoal/60">{t.intro}</p>

      <div className="mt-8 space-y-8">
        {groups.map((g) => (
          <div key={g.asset}>
            <h2 className="font-display text-xl text-charcoal">{assetLabel(g.asset, locale)}</h2>
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
                  {g.rows.map((r) => {
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
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-line bg-ivory-2/40 p-5">
        <p className="text-[12.5px] leading-relaxed text-charcoal/55">{t.cite}</p>
        <a href="https://www.satestate.com/insights/riyadh-commercial-rent-index" target="_blank" rel="noopener noreferrer" className="link-underline mt-2 inline-block text-sm text-gold">{t.full} →</a>
      </div>
    </section>
  );
}
