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

function rng(seed: number) { return () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }; }
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

export default async function AreaPage({ params, searchParams }: { params: { locale: string }; searchParams: { district?: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale; const ar = locale === "ar";
  const sel = DISTRICTS.find((d) => d.id === searchParams.district) || DISTRICTS[0];
  const sb = getSupabaseServer();

  // REAL data: rent + supply + availability + demand per asset
  let real: { asset: string; rent: number | null; supply: number; avail: number; demand: number }[] = [];
  if (sb) {
    const [{ data: rent }, { data: blds }, { data: lst }, { data: briefs }] = await Promise.all([
      sb.from("rent_index_published").select("asset_type, median, sufficient").eq("district_id", sel.id),
      sb.from("buildings").select("asset_type").eq("district_id", sel.id),
      sb.from("listings").select("asset_type").eq("district_id", sel.id).eq("status", "published"),
      sb.from("tenant_briefs").select("asset_type").eq("district_id", sel.id),
    ]);
    const rm = new Map<string, number>(); (rent ?? []).forEach((r: any) => { if (r.sufficient && r.median != null) rm.set(r.asset_type, r.median); });
    const c = (rows: any[]) => { const m = new Map<string, number>(); (rows ?? []).forEach((r: any) => m.set(r.asset_type, (m.get(r.asset_type) ?? 0) + 1)); return m; };
    const sup = c(blds ?? []), av = c(lst ?? []), de = c(briefs ?? []);
    const keys = Array.from(new Set([...rm.keys(), ...sup.keys(), ...av.keys(), ...de.keys()]));
    real = keys.map((a) => ({ asset: a, rent: rm.get(a) ?? null, supply: sup.get(a) ?? 0, avail: av.get(a) ?? 0, demand: de.get(a) ?? 0 }));
  }

  // SAMPLE data (deterministic, clearly labelled) until the movement-data partner is live
  const rnd = rng(hash(sel.id) + 7);
  const weekly = Array.from({ length: 8 }, (_, i) => 55 + Math.round(rnd() * 40) + (i > 4 ? 12 : 0));
  const wow = Math.round((rnd() * 18 - 6));
  const hours = Array.from({ length: 24 }, (_, h) => {
    let v = 8 + Math.round(Math.sin((h - 6) / 24 * Math.PI * 2) * 18 + rnd() * 14);
    if ([5, 12, 15, 18, 20].includes(h)) v = Math.max(4, v - 14); // prayer-time dips
    return Math.max(3, v);
  });
  const catch5 = 40 + Math.round(rnd() * 60), catch10 = catch5 + 120 + Math.round(rnd() * 180), catch15 = catch10 + 260 + Math.round(rnd() * 320);
  const workingAge = 58 + Math.round(rnd() * 14), daytime = 60 + Math.round(rnd() * 30), spendIdx = 90 + Math.round(rnd() * 60);

  const t = {
    eyebrow: ar ? "ذكاء المنطقة" : "Area intelligence",
    title: ar ? "ما الذي يخبرك به الموقع" : "What a location tells you",
    intro: ar
      ? "حركة الزوّار، نطاق الجذب، والسكان حول كل منطقة — مع الطلب والعرض والإيجار الموثق. البيانات الموثقة معلّمة، وحركة الزوّار والخصائص السكانية معروضة كعيّنة إرشادية حتى تفعيل شراكة بيانات الحركة."
      : "Visitor movement, catchment, and population around each area — alongside verified demand, supply, and rent. Verified data is tagged; footfall and demographics are shown as an indicative sample until the movement-data partnership is live.",
    area: ar ? "المنطقة" : "Area",
    verified: ar ? "موثق" : "Verified",
    sample: ar ? "عيّنة · بانتظار شريك البيانات" : "Sample · pending data partner",
    footfall: ar ? "حركة الزوّار (اتجاه أسبوعي)" : "Visitor footfall (weekly trend)",
    wow: ar ? "مقارنة بالأسبوع السابق" : "vs last week",
    hourly: ar ? "النمط خلال اليوم" : "Pattern through the day",
    prayer: ar ? "انخفاضات أوقات الصلاة" : "prayer-time dips",
    catchment: ar ? "نطاق الجذب (سكان ضمن زمن القيادة)" : "Catchment (population within drive-time)",
    min5: ar ? "٥ دقائق" : "5 min", min10: ar ? "١٠ دقائق" : "10 min", min15: ar ? "١٥ دقيقة" : "15 min",
    demo: ar ? "لمحة سكانية" : "Demographics snapshot",
    workingAge: ar ? "نسبة في سن العمل" : "Working-age share",
    daytime: ar ? "مؤشر السكان النهاري" : "Daytime population index",
    spend: ar ? "مؤشر الإنفاق" : "Spend index",
    demandSupply: ar ? "الطلب والعرض والإيجار حسب الاستخدام" : "Demand, supply & rent by use",
    rent: ar ? "وسيط الإيجار" : "Median rent", supplyL: ar ? "مبانٍ" : "Buildings", availL: ar ? "متاح" : "Available", demandL: ar ? "طلبات" : "Briefs",
    none: ar ? "لا بيانات كافية لهذه المنطقة بعد." : "Not enough verified data for this area yet.",
    note: ar ? "أرقام حركة الزوّار والسكان إرشادية وستُستبدل ببيانات حركة حقيقية عبر شريك (telco / مزوّد بيانات تنقل)." : "Footfall and population figures are indicative and will be replaced by real movement data via a partner (telco / mobility-data provider).",
  };

  const maxWeekly = Math.max(...weekly), maxHour = Math.max(...hours);
  const days = ar ? ["أحد","إثن","ثلا","أرب","خمي","جمع","سبت","أحد"] : ["Su","Mo","Tu","We","Th","Fr","Sa","Su"];
  // area-chart path
  const W = 520, H = 120;
  const pts = weekly.map((v, i) => [12 + i * ((W - 24) / (weekly.length - 1)), H - 12 - (v / maxWeekly) * (H - 30)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaPath = `${line} L${pts[pts.length-1][0].toFixed(1)},${H-12} L${pts[0][0].toFixed(1)},${H-12} Z`;
  const maxReal = Math.max(1, ...real.map((r) => r.rent ?? 0));

  return (
    <section>
      <div className="eyebrow">{t.eyebrow}</div>
      <h1 className="mt-1 font-display text-3xl text-charcoal">{t.title}</h1>
      <p className="mt-2 max-w-3xl text-[15px] text-charcoal/60">{t.intro}</p>

      <div className="mt-5">
        <div className="text-[11px] uppercase tracking-wide text-charcoal/40">{t.area}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {DISTRICTS.map((d) => (
            <Link key={d.id} href={`/${locale}/area?district=${d.id}`} className={`rounded-full border px-3.5 py-1.5 text-[12.5px] transition ${d.id===sel.id?"border-gold bg-gold text-white":"border-line text-charcoal/65 hover:border-gold/50 hover:text-charcoal"}`}>{ar ? d.ar : d.en}</Link>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Footfall trend */}
        <Card title={t.footfall} tag={t.sample} tagOk={false}>
          <div className="flex items-end justify-between">
            <div className="font-display text-3xl text-gold">{weekly[weekly.length-1]}k</div>
            <div className={`text-sm ${wow>=0?"text-emerald-600":"text-red-500"}`}>{wow>=0?"▲":"▼"} {Math.abs(wow)}% <span className="text-charcoal/40">{t.wow}</span></div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full">
            <defs><linearGradient id="ff" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#8A7342" stopOpacity="0.35"/><stop offset="100%" stopColor="#8A7342" stopOpacity="0"/></linearGradient></defs>
            <path d={areaPath} fill="url(#ff)" />
            <path d={line} fill="none" stroke="#8A7342" strokeWidth="2.5" />
            {pts.map((p,i)=>(<circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#8A7342" />))}
          </svg>
          <div className="mt-1 flex justify-between text-[10px] text-charcoal/40">{days.map((d,i)=>(<span key={i}>{d}</span>))}</div>
        </Card>

        {/* Hourly */}
        <Card title={t.hourly} tag={t.sample} tagOk={false}>
          <div className="flex h-[120px] items-end gap-[3px]">
            {hours.map((v,h)=>(
              <div key={h} className="flex-1 rounded-t" style={{ height: `${(v/maxHour)*100}%`, background: [5,12,15,18,20].includes(h)?"#C9BfA6":"#8A7342" }} title={`${h}:00`} />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-charcoal/40"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
          <div className="mt-1 text-[11px] text-charcoal/45">● <span className="text-charcoal/55">{t.prayer}</span></div>
        </Card>

        {/* Catchment rings */}
        <Card title={t.catchment} tag={t.sample} tagOk={false}>
          <div className="flex items-center gap-5">
            <svg viewBox="0 0 160 160" className="h-36 w-36">
              <circle cx="80" cy="80" r="72" fill="#8A7342" opacity="0.10" />
              <circle cx="80" cy="80" r="50" fill="#8A7342" opacity="0.16" />
              <circle cx="80" cy="80" r="28" fill="#8A7342" opacity="0.26" />
              <circle cx="80" cy="80" r="4" fill="#8A7342" />
            </svg>
            <div className="space-y-2 text-[13px]">
              <Ring c="#8A7342" o={0.26} label={t.min5} v={`${catch5}k`} />
              <Ring c="#8A7342" o={0.16} label={t.min10} v={`${catch10}k`} />
              <Ring c="#8A7342" o={0.10} label={t.min15} v={`${catch15}k`} />
            </div>
          </div>
        </Card>

        {/* Demographics */}
        <Card title={t.demo} tag={t.sample} tagOk={false}>
          <div className="space-y-3">
            <Bar label={t.workingAge} value={workingAge} suffix="%" max={100} />
            <Bar label={t.daytime} value={daytime} suffix="" max={120} />
            <Bar label={t.spend} value={spendIdx} suffix="" max={160} />
          </div>
        </Card>
      </div>

      {/* REAL demand/supply/rent */}
      <div className="mt-6">
        <Card title={t.demandSupply} tag={t.verified} tagOk={true}>
          {real.length === 0 ? <p className="text-charcoal/50">{t.none}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="text-start text-[11px] uppercase tracking-wide text-charcoal/45">
                  <th className="py-2 text-start font-medium">{ar?"الاستخدام":"Use"}</th><th className="py-2 text-start font-medium">{t.rent}</th>
                  <th className="py-2 text-start font-medium">{t.supplyL}</th><th className="py-2 text-start font-medium">{t.availL}</th><th className="py-2 text-start font-medium">{t.demandL}</th>
                </tr></thead>
                <tbody>
                  {real.map((r)=>(
                    <tr key={r.asset} className="border-t border-line">
                      <td className="py-2.5 text-charcoal">{assetLabel(r.asset, locale)}</td>
                      <td className="py-2.5"><div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-ivory-2"><div className="h-full bg-gold" style={{width:`${r.rent?(r.rent/maxReal)*100:0}%`}}/></div><span className="font-display text-gold">{r.rent?Math.round(r.rent).toLocaleString():"—"}</span></div></td>
                      <td className="py-2.5 text-charcoal/70">{r.supply}</td><td className="py-2.5 text-charcoal/70">{r.avail}</td><td className="py-2.5 text-charcoal/70">{r.demand}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <p className="mt-4 text-xs text-charcoal/40">{t.note}</p>
    </section>
  );
}

function Card({ title, tag, tagOk, children }: { title: string; tag: string; tagOk: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="font-display text-[15px] text-charcoal">{title}</div>
        <span className={`badge ${tagOk?"badge-verified":"badge-gold"}`}>{tag}</span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
function Ring({ c, o, label, v }: { c: string; o: number; label: string; v: string }) {
  return <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full" style={{ background: c, opacity: o + 0.35 }} /><span className="text-charcoal/55">{label}</span><span className="font-display text-charcoal">{v}</span></div>;
}
function Bar({ label, value, suffix, max }: { label: string; value: number; suffix: string; max: number }) {
  return (
    <div>
      <div className="flex justify-between text-[12.5px]"><span className="text-charcoal/60">{label}</span><span className="font-display text-charcoal">{value}{suffix}</span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ivory-2"><div className="h-full bg-gold" style={{ width: `${Math.min(100,(value/max)*100)}%` }} /></div>
    </div>
  );
}
