import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";

interface Cell { district_id: string; asset_type: string; deal_type: string; deal_count: number; median_achieved_sqm: number; confidence: string; }

export default async function RentIndexPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const sb = getSupabaseServer();
  let cells: Cell[] = [];
  let names: Record<string,string> = {};
  if (sb) {
    const { data } = await sb.from("rent_index_cells").select("*");
    cells = (data as Cell[]) ?? [];
    const { data: d } = await sb.from("districts").select("id, name_en, city");
    (d ?? []).forEach((r: any)=>{ names[r.id] = `${r.name_en}, ${r.city}`; });
  }
  cells.sort((a,b)=> (names[a.district_id]||"").localeCompare(names[b.district_id]||""));
  return (
    <section>
      <div className="eyebrow">SAT Riyadh Commercial Rent Index</div>
      <h1 className="mt-1 font-display text-3xl text-charcoal">Verified rent bands</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-charcoal/60">Median achieved rents by district and asset type, published only where there are enough verified transactions. Every figure comes from verified data, never a model.</p>
      <div className="mt-7 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-line bg-ivory-2/60 text-left text-[11px] uppercase tracking-wide text-charcoal/45">
            <th className="px-5 py-3 font-medium">District</th><th className="px-5 py-3 font-medium">Asset</th>
            <th className="px-5 py-3 font-medium">Median achieved (SAR/sqm)</th><th className="px-5 py-3 font-medium">Deals</th><th className="px-5 py-3 font-medium">Confidence</th>
          </tr></thead>
          <tbody>
            {cells.length === 0 ? (<tr><td colSpan={5} className="px-5 py-8 text-charcoal/45">No bands meet the minimum transaction threshold yet.</td></tr>)
            : cells.map((c,i)=>(
              <tr key={i} className="border-t border-line hover:bg-ivory-2/40">
                <td className="px-5 py-3.5 text-charcoal">{names[c.district_id] || c.district_id}</td>
                <td className="px-5 py-3.5 uppercase text-[12px] text-charcoal/55">{c.asset_type}</td>
                <td className="px-5 py-3.5 font-display text-lg text-gold">{Math.round(c.median_achieved_sqm).toLocaleString()}</td>
                <td className="px-5 py-3.5 text-charcoal/70">{c.deal_count}</td>
                <td className="px-5 py-3.5"><span className={`badge ${c.confidence==="high"?"badge-verified":"badge-gold"}`}>{c.confidence}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
