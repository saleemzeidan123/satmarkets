import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/getDictionary";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel, confLabel, cityLabel } from "@/lib/labels";

interface Cell { district_id: string; asset_type: string; deal_type: string; deal_count: number; median_achieved_sqm: number; confidence: string; }

export default async function RentIndexPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const dict = getDictionary(locale);
  const sb = getSupabaseServer();
  let cells: Cell[] = [];
  let names: Record<string,string> = {};
  if (sb) {
    const { data } = await sb.from("rent_index_cells").select("*");
    cells = (data as Cell[]) ?? [];
    const { data: d } = await sb.from("districts").select("id, name_en, name_ar, city");
    (d ?? []).forEach((r: any)=>{ names[r.id] = `${ar ? r.name_ar : r.name_en}، ${cityLabel(r.city, locale)}`; });
  }
  cells.sort((a,b)=> (names[a.district_id]||"").localeCompare(names[b.district_id]||""));
  const h = {
    eyebrow: ar ? "مؤشر سات للإيجارات التجارية بالرياض" : "SAT Riyadh Commercial Rent Index",
    title: ar ? "نطاقات إيجار موثقة" : "Verified rent bands",
    intro: ar ? "وسيط الإيجارات المتحققة حسب الحي ونوع الأصل، تُنشر فقط حيث توجد صفقات موثقة كافية. كل رقم من بيانات موثقة، لا من نموذج."
              : "Median achieved rents by district and asset type, published only where there are enough verified transactions. Every figure comes from verified data, never a model.",
    district: ar ? "الحي" : "District", asset: ar ? "النوع" : "Asset",
    median: ar ? "وسيط المتحقق (ريال/م²)" : "Median achieved (SAR/sqm)",
    deals: ar ? "الصفقات" : "Deals", conf: ar ? "الثقة" : "Confidence",
    empty: ar ? "لا توجد نطاقات تستوفي الحد الأدنى للصفقات بعد." : "No bands meet the minimum transaction threshold yet.",
  };
  return (
    <section>
      <div className="eyebrow">{h.eyebrow}</div>
      <h1 className="mt-1 font-display text-3xl text-charcoal">{h.title}</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-charcoal/60">{h.intro}</p>
      <div className="mt-7 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-line bg-ivory-2/60 text-start text-[11px] uppercase tracking-wide text-charcoal/45">
            <th className="px-5 py-3 text-start font-medium">{h.district}</th><th className="px-5 py-3 text-start font-medium">{h.asset}</th>
            <th className="px-5 py-3 text-start font-medium">{h.median}</th><th className="px-5 py-3 text-start font-medium">{h.deals}</th><th className="px-5 py-3 text-start font-medium">{h.conf}</th>
          </tr></thead>
          <tbody>
            {cells.length === 0 ? (<tr><td colSpan={5} className="px-5 py-8 text-charcoal/45">{h.empty}</td></tr>)
            : cells.map((c,i)=>(
              <tr key={i} className="border-t border-line hover:bg-ivory-2/40">
                <td className="px-5 py-3.5 text-charcoal">{names[c.district_id] || c.district_id}</td>
                <td className="px-5 py-3.5 text-[12px] text-charcoal/55">{assetLabel(c.asset_type, locale)}</td>
                <td className="px-5 py-3.5 font-display text-lg text-gold">{Math.round(c.median_achieved_sqm).toLocaleString()}</td>
                <td className="px-5 py-3.5 text-charcoal/70">{c.deal_count}</td>
                <td className="px-5 py-3.5"><span className={`badge ${c.confidence==="high"?"badge-verified":"badge-gold"}`}>{confLabel(c.confidence, locale)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
