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
interface UseRow { asset: string; rent: number | null; supply: number; avail: number; demand: number; score: number; }

export default async function HbuPage({ params, searchParams }: { params: { locale: string }; searchParams: { district?: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale; const ar = locale === "ar";
  const sel = DISTRICTS.find((d) => d.id === searchParams.district) || DISTRICTS[0];
  const sb = getSupabaseServer();
  let uses: UseRow[] = [];
  if (sb) {
    const [{ data: rent }, { data: blds }, { data: lst }, { data: briefs }] = await Promise.all([
      sb.from("rent_index_published").select("asset_type, median, sufficient").eq("district_id", sel.id),
      sb.from("buildings").select("asset_type").eq("district_id", sel.id),
      sb.from("listings").select("asset_type").eq("district_id", sel.id).eq("status", "published"),
      sb.from("tenant_briefs").select("asset_type").eq("district_id", sel.id),
    ]);
    const rentMap = new Map<string, number>(); (rent ?? []).forEach((r: any) => { if (r.sufficient && r.median != null && !rentMap.has(r.asset_type)) rentMap.set(r.asset_type, r.median); });
    const cnt = (rows: any[]) => { const m = new Map<string, number>(); (rows ?? []).forEach((r: any) => m.set(r.asset_type, (m.get(r.asset_type) ?? 0) + 1)); return m; };
    const supply = cnt(blds ?? []), avail = cnt(lst ?? []), demand = cnt(briefs ?? []);
    const allAssets = Array.from(new Set([...rentMap.keys(), ...supply.keys(), ...avail.keys(), ...demand.keys()]));
    const maxRent = Math.max(1, ...allAssets.map((a) => rentMap.get(a) ?? 0));
    const maxDem = Math.max(1, ...allAssets.map((a) => demand.get(a) ?? 0));
    const maxAvail = Math.max(1, ...allAssets.map((a) => avail.get(a) ?? 0));
    uses = allAssets.map((a) => {
      const rent = rentMap.get(a) ?? null; const av = avail.get(a) ?? 0;
      const score = 0.45 * (rent ? rent / maxRent : 0) + 0.35 * ((demand.get(a) ?? 0) / maxDem) + 0.20 * (1 - av / maxAvail);
      return { asset: a, rent, supply: supply.get(a) ?? 0, avail: av, demand: demand.get(a) ?? 0, score };
    }).sort((x, y) => y.score - x.score);
  }
  const t = {
    eyebrow: ar ? "تحليل أفضل استخدام" : "Highest & best use",
    title: ar ? "ماذا تبني هنا؟" : "What should you build here?",
    intro: ar ? "اختر منطقة وشاهد، بالبيانات الموثقة، أي استخدام تجاري يحمل أقوى إشارة طلب وقيمة. نموذج أولي يُكمَّل بإدخال بيانات التنظيم والتكلفة." : "Pick an area and see, from verified data, which commercial use carries the strongest demand-and-value signal. A prototype completed by zoning and cost inputs.",
    area: ar ? "المنطقة" : "Area", rank: ar ? "الإشارة الحالية حسب الاستخدام" : "Current signal by use", strongest: ar ? "أقوى إشارة" : "Strongest", opp: ar ? "إشارة الفرصة" : "Opportunity",
    rent: ar ? "وسيط الإيجار" : "Median rent", supply: ar ? "مبانٍ" : "Buildings", avail: ar ? "متاح" : "Available", demand: ar ? "طلبات" : "Briefs",
    none: ar ? "لا بيانات كافية لهذه المنطقة بعد." : "Not enough data for this area yet.",
    method: ar ? "منهجية أفضل استخدام — الاختبارات الأربعة" : "Highest-and-best-use — the four tests",
    t1: ar ? "مسموح نظامياً" : "Legally permissible", d1: ar ? "التنظيم ونسبة البناء للقطعة. مطلوب: بيانات الأمانة." : "Zoning and FAR. Input needed: municipal data.",
    t2: ar ? "ممكن مادياً" : "Physically possible", d2: ar ? "مساحة القطعة والوصول والمرافق. مطلوب: بيانات القطعة." : "Parcel size, access, utilities. Input needed: parcel data.",
    t3: ar ? "مجدٍ مالياً" : "Financially feasible", d3: ar ? "الطلب مقابل العرض وقوة الإيجار — معروض أعلاه." : "Demand vs supply and rent strength — shown above.",
    t4: ar ? "الأقصى إنتاجية" : "Maximally productive", d4: ar ? "القيمة المتبقية للأرض. مطلوب: تكاليف الإنشاء." : "Residual land value. Input needed: construction costs.",
    disclaimer: ar ? "مؤشر إرشادي من بيانات موثقة، وليس توصية استثمارية." : "Indicative, from verified data — not investment advice.",
    have: ar ? "متوفر" : "Have it", need: ar ? "مطلوب منك" : "Input needed", use: ar ? "الاستخدام" : "Use",
  };
  const oppLabel = (s: number) => s >= 0.6 ? (ar ? "قوية" : "Strong") : s >= 0.35 ? (ar ? "متوسطة" : "Moderate") : (ar ? "محدودة" : "Limited");

  return (
    <section className="intel-canvas -mx-5 rounded-3xl px-5 py-8 sm:-mx-6 sm:px-8 sm:py-10">
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] intel-gold">{t.eyebrow}</div>
      <h1 className="mt-1 font-display text-3xl text-ivory sm:text-4xl">{t.title}</h1>
      <p className="mt-2 max-w-2xl text-[15px] intel-muted">{t.intro}</p>

      <div className="mt-6">
        <div className="text-[11px] uppercase tracking-wide intel-faint">{t.area}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {DISTRICTS.map((d) => (
            <Link key={d.id} href={`/${locale}/hbu?district=${d.id}`} className={`rounded-full px-3.5 py-1.5 text-[12.5px] transition ${d.id===sel.id?"intel-chip-active":"intel-chip"}`}>{ar ? d.ar : d.en}</Link>
          ))}
        </div>
      </div>

      <h2 className="mt-8 font-display text-xl text-ivory">{t.rank} · {ar ? sel.ar : sel.en}</h2>
      {uses.length === 0 ? <p className="mt-4 intel-muted">{t.none}</p> : (
        <div className="mt-4 space-y-3">
          {uses.map((u, i) => (
            <div key={u.asset} className={`intel-card p-5 ${i===0?"!border-gold/60":""}`} style={i===0?{boxShadow:"0 0 0 1px rgba(217,184,91,0.25), 0 8px 30px rgba(217,184,91,0.08)"}:{}}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg text-ivory">{assetLabel(u.asset, locale)}</span>
                  {i===0 && <span className="rounded-full px-2.5 py-0.5 text-[10px] font-medium tag-sample">{t.strongest}</span>}
                </div>
                <div className="text-end"><div className="text-[10px] uppercase tracking-wide intel-faint">{t.opp}</div><div className="font-display intel-gold">{oppLabel(u.score)}</div></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-4">
                <Sig label={t.rent} value={u.rent != null ? Math.round(u.rent).toLocaleString() : "—"} />
                <Sig label={t.demand} value={String(u.demand)} />
                <Sig label={t.avail} value={String(u.avail)} />
                <Sig label={t.supply} value={String(u.supply)} />
              </div>
              <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full" style={{ width: `${Math.round(u.score*100)}%`, background:"#D9B85B" }} /></div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 intel-card p-6">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] intel-gold">{t.method}</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[[t.t1,t.d1,t.need],[t.t2,t.d2,t.need],[t.t3,t.d3,t.have],[t.t4,t.d4,t.need]].map(([tt,dd,tag],i)=>(
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between"><div className="font-display text-[15px] text-ivory">{i+1}. {tt}</div><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${tag===t.have?"tag-verified":"tag-sample"}`}>{tag}</span></div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed intel-muted">{dd}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 text-xs intel-faint">{t.disclaimer}</p>
    </section>
  );
}
function Sig({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] uppercase tracking-wide intel-faint">{label}</div><div className="mt-0.5 font-display text-base text-ivory tnum">{value}</div></div>;
}
