import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel } from "@/lib/labels";

const DISTRICTS = [
  { id: "d1111111-1111-1111-1111-111111111111", en: "KAFD", ar: "واجهة الرياض المالية" },
  { id: "d2222222-2222-2222-2222-222222222222", en: "Al Olaya", ar: "العليا" },
  { id: "d5555555-5555-5555-5555-555555555555", en: "North Riyadh (Granada)", ar: "شمال الرياض (غرناطة)" },
  { id: "da333333-3333-3333-3333-333333333333", en: "Hittin / Al Yasmin", ar: "حطين / الياسمين" },
];

interface UseRow { asset: string; rent: number | null; unit: string | null; supply: number; avail: number; demand: number; score: number; rentN: number; demN: number; scarceN: number; }

export default async function HbuPage({ params, searchParams }: { params: { locale: string }; searchParams: { district?: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const sel = DISTRICTS.find((d) => d.id === searchParams.district) || DISTRICTS[0];
  const sb = getSupabaseServer();

  let uses: UseRow[] = [];
  if (sb) {
    const [{ data: rent }, { data: blds }, { data: lst }, { data: briefs }] = await Promise.all([
      sb.from("rent_index_published").select("asset_type, median, unit, sufficient").eq("district_id", sel.id),
      sb.from("buildings").select("asset_type").eq("district_id", sel.id),
      sb.from("listings").select("asset_type").eq("district_id", sel.id).eq("status", "published"),
      sb.from("tenant_briefs").select("asset_type").eq("district_id", sel.id),
    ]);
    const rentMap = new Map<string, { median: number | null; unit: string }>();
    (rent ?? []).forEach((r: any) => { if (r.sufficient && r.median != null && !rentMap.has(r.asset_type)) rentMap.set(r.asset_type, { median: r.median, unit: r.unit }); });
    const cnt = (rows: any[]) => { const m = new Map<string, number>(); (rows ?? []).forEach((r: any) => m.set(r.asset_type, (m.get(r.asset_type) ?? 0) + 1)); return m; };
    const supply = cnt(blds ?? []), avail = cnt(lst ?? []), demand = cnt(briefs ?? []);
    const allAssets = Array.from(new Set([...rentMap.keys(), ...supply.keys(), ...avail.keys(), ...demand.keys()]));

    const maxRent = Math.max(1, ...allAssets.map((a) => rentMap.get(a)?.median ?? 0));
    const maxDem = Math.max(1, ...allAssets.map((a) => demand.get(a) ?? 0));
    const maxAvail = Math.max(1, ...allAssets.map((a) => avail.get(a) ?? 0));
    uses = allAssets.map((a) => {
      const rent = rentMap.get(a)?.median ?? null;
      const av = avail.get(a) ?? 0;
      const rentN = rent ? rent / maxRent : 0;
      const demN = (demand.get(a) ?? 0) / maxDem;
      const scarceN = 1 - av / maxAvail; // lower availability = scarcer = more opportunity
      const score = 0.45 * rentN + 0.35 * demN + 0.20 * scarceN;
      return { asset: a, rent, unit: rentMap.get(a)?.unit ?? null, supply: supply.get(a) ?? 0, avail: av, demand: demand.get(a) ?? 0, score, rentN, demN, scarceN };
    }).sort((x, y) => y.score - x.score);
  }

  const t = {
    eyebrow: ar ? "تحليل أفضل استخدام" : "Highest & best use",
    title: ar ? "ماذا تبني هنا؟" : "What should you build here?",
    intro: ar
      ? "اختر منطقة وشاهد، بالبيانات الموثقة، أي استخدام تجاري يحمل أقوى إشارة طلب وقيمة. نموذج أولي يعتمد على نطاقات الإيجار والعرض والطلب المتاحة؛ يُكمَّل التحليل بإدخال بيانات التنظيم والتكلفة."
      : "Pick an area and see, from verified data, which commercial use carries the strongest demand-and-value signal. A prototype grounded in the rent bands, supply, and demand we hold — completed by zoning and cost inputs.",
    area: ar ? "المنطقة" : "Area",
    rank: ar ? "الإشارة الحالية حسب الاستخدام" : "Current signal by use",
    strongest: ar ? "أقوى إشارة" : "Strongest signal",
    rent: ar ? "وسيط الإيجار" : "Median rent",
    supply: ar ? "مبانٍ قائمة" : "Existing buildings",
    avail: ar ? "متاح الآن" : "Available now",
    demand: ar ? "طلبات نشطة" : "Active briefs",
    opp: ar ? "إشارة الفرصة" : "Opportunity signal",
    none: ar ? "لا بيانات كافية لهذه المنطقة بعد." : "Not enough data for this area yet.",
    method: ar ? "منهجية أفضل استخدام — الاختبارات الأربعة" : "Highest-and-best-use — the four tests",
    test1t: ar ? "مسموح نظامياً" : "Legally permissible",
    test1d: ar ? "التنظيم ونسبة البناء للقطعة. مطلوب: بيانات الأمانة/وزارة الشؤون البلدية." : "Zoning and FAR for the parcel. Input needed: municipal / MoMRAH data.",
    test2t: ar ? "ممكن مادياً" : "Physically possible",
    test2d: ar ? "مساحة القطعة والوصول والمرافق. مطلوب: بيانات القطعة." : "Parcel size, access, and utilities. Input needed: parcel data.",
    test3t: ar ? "مجدٍ مالياً" : "Financially feasible",
    test3d: ar ? "الطلب مقابل العرض وقوة الإيجار لكل استخدام — معروض أدناه من بيانات موثقة." : "Demand vs supply and rent strength per use — shown below, from verified data.",
    test4t: ar ? "الأقصى إنتاجية" : "Maximally productive",
    test4d: ar ? "القيمة المتبقية للأرض لكل استخدام (الإيراد ناقص تكلفة البناء). مطلوب: تكاليف الإنشاء للترتيب النهائي." : "Residual land value per use (revenue minus build cost). Input needed: construction costs for the final ranking.",
    disclaimer: ar ? "مؤشر إرشادي من بيانات موثقة، وليس توصية استثمارية. الترتيب النهائي يتطلب بيانات التنظيم والتكلفة." : "Indicative, derived from verified data — not investment advice. The final ranking requires zoning and cost inputs.",
    have: ar ? "متوفر" : "Have it",
    need: ar ? "مطلوب منك" : "Input needed",
  };
  const oppLabel = (s: number) => s >= 0.6 ? (ar ? "قوية" : "Strong") : s >= 0.35 ? (ar ? "متوسطة" : "Moderate") : (ar ? "محدودة" : "Limited");

  return (
    <section>
      <div className="eyebrow">{t.eyebrow}</div>
      <h1 className="mt-1 font-display text-3xl text-charcoal">{t.title}</h1>
      <p className="mt-2 max-w-2xl text-[15px] text-charcoal/60">{t.intro}</p>

      <div className="mt-5">
        <div className="text-[11px] uppercase tracking-wide text-charcoal/40">{t.area}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {DISTRICTS.map((d) => (
            <Link key={d.id} href={`/${locale}/hbu?district=${d.id}`} className={`rounded-full border px-3.5 py-1.5 text-[12.5px] transition ${d.id===sel.id?"border-gold bg-gold text-white":"border-line text-charcoal/65 hover:border-gold/50 hover:text-charcoal"}`}>{ar ? d.ar : d.en}</Link>
          ))}
        </div>
      </div>

      <h2 className="mt-8 font-display text-xl text-charcoal">{t.rank} · {ar ? sel.ar : sel.en}</h2>
      {uses.length === 0 ? (
        <p className="mt-4 text-charcoal/50">{t.none}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {uses.map((u, i) => (
            <div key={u.asset} className={`rounded-2xl border p-5 ${i===0?"border-gold bg-gold/5":"border-line bg-white"} shadow-card`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg text-charcoal">{assetLabel(u.asset, locale)}</span>
                  {i===0 && <span className="badge badge-gold">{t.strongest}</span>}
                </div>
                <div className="text-end">
                  <div className="text-[10px] uppercase tracking-wide text-charcoal/40">{t.opp}</div>
                  <div className="font-display text-gold">{oppLabel(u.score)}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-4">
                <Sig label={t.rent} value={u.rent != null ? Math.round(u.rent).toLocaleString() : "—"} />
                <Sig label={t.demand} value={String(u.demand)} />
                <Sig label={t.avail} value={String(u.avail)} />
                <Sig label={t.supply} value={String(u.supply)} />
              </div>
              <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-ivory-2">
                <div className="bg-gold" style={{ width: `${Math.round(u.score*100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-line bg-white p-6 shadow-card">
        <div className="eyebrow">{t.method}</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[[t.test1t,t.test1d,t.need],[t.test2t,t.test2d,t.need],[t.test3t,t.test3d,t.have],[t.test4t,t.test4d,t.need]].map(([tt,dd,tag],i)=>(
            <div key={i} className="rounded-xl border border-line bg-ivory-2/30 p-4">
              <div className="flex items-center justify-between">
                <div className="font-display text-[15px] text-charcoal">{i+1}. {tt}</div>
                <span className={`badge ${tag===t.have?"badge-verified":"badge-gold"}`}>{tag}</span>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-charcoal/60">{dd}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-charcoal/40">{t.disclaimer}</p>
    </section>
  );
}
function Sig({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] uppercase tracking-wide text-charcoal/40">{label}</div><div className="mt-0.5 font-display text-base text-charcoal">{value}</div></div>;
}
