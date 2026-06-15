import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";

interface Cell {
  district_id: string;
  asset_type: string;
  deal_type: string;
  deal_count: number;
  median_achieved_sqm: number;
  confidence: string;
}

export default async function RentIndexPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const sb = getSupabaseServer();
  let cells: Cell[] = [];
  let names: Record<string, string> = {};
  if (sb) {
    const { data } = await sb.from("rent_index_cells").select("*");
    cells = (data as Cell[]) ?? [];
    const { data: d } = await sb.from("districts").select("id, name_en, city");
    (d ?? []).forEach((r: any) => { names[r.id] = `${r.name_en}, ${r.city}`; });
  }

  return (
    <section className="py-6">
      <div className="text-xs uppercase tracking-widest text-gold">SAT Riyadh Commercial Rent Index</div>
      <h1 className="mt-2 font-serif text-2xl">Verified rent bands</h1>
      <p className="mt-2 max-w-2xl text-sm text-charcoal/60">
        Achieved-rent bands by district and asset type. Published only where there are enough verified transactions. Every figure comes from verified data, never a model.
      </p>
      <div className="mt-6 overflow-hidden rounded-lg border border-charcoal/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-ivory text-left text-xs uppercase text-charcoal/50">
            <tr>
              <th className="px-4 py-2">District</th>
              <th className="px-4 py-2">Asset</th>
              <th className="px-4 py-2">Median achieved (SAR/sqm)</th>
              <th className="px-4 py-2">Deals</th>
              <th className="px-4 py-2">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {cells.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-charcoal/50">No bands meet the minimum transaction threshold yet.</td></tr>
            ) : (
              cells.map((c, i) => (
                <tr key={i} className="border-t border-charcoal/5">
                  <td className="px-4 py-2">{names[c.district_id] || c.district_id}</td>
                  <td className="px-4 py-2 uppercase text-charcoal/60">{c.asset_type}</td>
                  <td className="px-4 py-2 text-gold">{Math.round(c.median_achieved_sqm)}</td>
                  <td className="px-4 py-2">{c.deal_count}</td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-slate/10 px-2 py-0.5 text-xs text-slate">{c.confidence}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
