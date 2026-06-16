import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel } from "@/lib/labels";

const TEAL = "#0E7C6F";
const GOLD = "#8A7342";

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

  const rnd = rng(hash(sel.id) + 7);
  const weekly = Array.from({ length: 8 }, (_, i) => 55 + Math.round(rnd() * 40) + (i > 4 ? 12 : 0));
  const wow = Math.round((rnd() * 18 - 6));
  const hours = Array.from({ length: 24 }, (_, h) => { let v = 8 + Math.round(Math.sin((h - 6) / 24 * Math.PI * 2) * 18 + rnd() * 14); if ([5, 12, 15, 18, 20].includes(h)) v = Math.max(4, v - 14); return Math.max(3, v); });
  const catch5 = 40 + Math.round(rnd() * 60), catch10 = catch5 + 120 + Math.round(rnd() * 180), catch15 = catch10 + 260 + Math.round(rnd() * 320);
  const workingAge = 58 + Math.round(rnd() * 14), daytime = 60 + Math.round(rnd() * 30), spendIdx = 90 + Math.round(rnd() * 60);
  const dwell = 26 + Math.round(rnd() * 20);
  const verifiedUses = real.filter((r) => r.rent != null).length;

  const t = {
    eyebrow: ar ? "ذكاء المنطقة" : "Area intelligence",
    title: ar ? "ما الذي يخبرك به الموقع" : "What a location tells you",
    intro: ar ? "حركة الزوّار، نطاق الجذب، والسكان حول كل منطقة — مع الطلب والعرض والإيجار الموثق. الأزرق = حركة مأخوذة كعيّنة، الذهبي = بيانات سوق موثّقة من سات." : "Visitor movement, catchment, and population around each area — alongside verified demand, supply, and rent. Teal = sampled movement; gold = verified SAT market data.",
    area: ar ? "المنطقة" : "Area", verified: ar ? "موثق" : "Verified", sample: ar ? "عيّنة" : "Sample",
    overview: ar ? "نظرة عامة" : "Overview",
    visitors: ar ? "زوّار / أسبوع" : "Weekly visitors", wowK: ar ? "مقارنة بالأسبوع السابق" : "vs last week",
    dwellL: ar ? "متوسط المكوث" : "Avg dwell", min: ar ? "د" : "min",
    catch15L: ar ? "نطاق ١٥ دقيقة" : "15-min catchment", workingAgeL: ar ? "في سن العمل" : "Working-age", verifiedUsesL: ar ? "استخدامات بإيجار موثّق" : "Verified-rent uses",
    secMovement: ar ? "الحركة" : "Movement", secCatch: ar ? "نطاق الجذب والسكان" : "Catchment & population", secMarket: ar ? "السوق الموثّق" : "Verified market",
    live: ar ? "مباشر · عيّنة" : "live · sample",
    footfall: ar ? "حركة الزوّار · اتجاه أسبوعي" : "Visitor footfall · weekly", wow: ar ? "مقارنة بالأسبوع السابق" : "vs last week",
    hourly: ar ? "النمط خلال اليوم" : "Pattern through the day", prayer: ar ? "انخفاضات أوقات الصلاة" : "prayer-time dips",
    catchment: ar ? "نطاق الجذب · سكان ضمن زمن القيادة" : "Catchment · population within drive-time",
    min5: ar ? "٥ دقائق" : "5 min", min10: ar ? "١٠ دقائق" : "10 min", min15: ar ? "١٥ دقيقة" : "15 min",
    demo: ar ? "لمحة سكانية" : "Demographics", workingAge: ar ? "نسبة في سن العمل" : "Working-age share", daytime: ar ? "مؤشر السكان النهاري" : "Daytime population", spend: ar ? "مؤشر الإنفاق" : "Spend index",
    demandSupply: ar ? "الطلب والعرض والإيجار حسب الاستخدام" : "Demand, supply & rent by use",
    rent: ar ? "وسيط الإيجار" : "Median rent", supplyL: ar ? "مبانٍ" : "Buildings", availL: ar ? "متاح" : "Available", demandL: ar ? "طلبات" : "Briefs",
    none: ar ? "لا بيانات كافية بعد." : "Not enough verified data yet.",
    note: ar ? "أرقام حركة الزوّار والسكان إرشادية وستُستبدل ببيانات حركة حقيقية عبر شريك." : "Footfall and population figures are indicative and will be replaced by real movement data via a partner.",
    use: ar ? "الاستخدام" : "Use",
  };

  const maxWeekly = Math.max(...weekly), maxHour = Math.max(...hours);
  const days = ar ? ["أحد","إثن","ثلا","أرب","خمي","جمع","سبت","أحد"] : ["Su","Mo","Tu","We","Th","Fr","Sa","Su"];
  const W = 520, H = 120;
  const pts = weekly.map((v, i) => [12 + i * ((W - 24) / (weekly.length - 1)), H - 12 - (v / maxWeekly) * (H - 30)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaPath = `${line} L${pts[pts.length-1][0].toFixed(1)},${H-12} L${pts[0][0].toFixed(1)},${H-12} Z`;
  const maxReal = Math.max(1, ...real.map((r) => r.rent ?? 0));

  return (
    <section className="intel-canvas -mx-5 rounded-3xl px-5 py-8 sm:-mx-6 sm:px-8 sm:py-10">
      <div className="flex items-center gap-2">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] intel-gold">{t.eyebrow}</div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0E7C6F]/25 bg-[#0E7C6F]/8 px-2 py-0.5 text-[10px] font-medium text-[#0E7C6F]"><span className="live-dot" />{t.live}</span>
      </div>
      <h1 className="mt-1 font-display text-3xl text-charcoal sm:text-4xl">{t.title}</h1>
      <p className="mt-2 max-w-3xl text-[15px] intel-muted">{t.intro}</p>

      <div className="mt-6">
        <div className="text-[11px] uppercase tracking-wide intel-faint">{t.area}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {DISTRICTS.map((d) => (
            <Link key={d.id} href={`/${locale}/area?district=${d.id}`} className={`rounded-full px-3.5 py-1.5 text-[12.5px] transition ${d.id===sel.id?"intel-chip-active":"intel-chip hover:border-signal/50"}`}>{ar ? d.ar : d.en}</Link>
          ))}
        </div>
      </div>

      <SectionLabel n="00" title={t.overview} sub="" />
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label={t.visitors} value={`${weekly[weekly.length-1]}k`} tone="live" />
        <Kpi label={t.wowK} value={`${wow>=0?"+":""}${wow}%`} tone="live" />
        <Kpi label={t.dwellL} value={`${dwell} ${t.min}`} tone="live" />
        <Kpi label={t.catch15L} value={`${catch15}k`} tone="live" />
        <Kpi label={t.workingAgeL} value={`${workingAge}%`} tone="live" />
        <Kpi label={t.verifiedUsesL} value={`${verifiedUses}`} tone="verified" />
      </div>

      <SectionLabel n="01" title={t.secMovement} sub={t.live} />
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <Card title={t.footfall} ok={false} sample={t.sample} verified={t.verified}>
          <div className="flex items-end justify-between">
            <div className="fig text-[26px] tracking-tight" style={{ color: TEAL }}>{weekly[weekly.length-1]}k</div>
            <div className={`fig text-sm ${wow>=0?"text-emerald-600":"text-red-500"}`}>{wow>=0?"▲":"▼"} {Math.abs(wow)}% <span className="intel-faint">{t.wow}</span></div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full">
            <defs><linearGradient id="ff" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={TEAL} stopOpacity="0.38"/><stop offset="100%" stopColor={TEAL} stopOpacity="0"/></linearGradient></defs>
            <path d={areaPath} fill="url(#ff)" />
            <path d={line} fill="none" stroke={TEAL} strokeWidth="2.5" />
            {pts.map((p,i)=>(<circle key={i} cx={p[0]} cy={p[1]} r="3" fill={TEAL} />))}
          </svg>
          <div className="mt-1 flex justify-between text-[10px] intel-faint">{days.map((d,i)=>(<span key={i}>{d}</span>))}</div>
        </Card>

        <Card title={t.hourly} ok={false} sample={t.sample} verified={t.verified}>
          <div className="flex h-[120px] items-end gap-[3px]">
            {hours.map((v,h)=>(<div key={h} className="flex-1 rounded-t" style={{ height: `${(v/maxHour)*100}%`, background: [5,12,15,18,20].includes(h)?"rgba(47,163,154,0.32)":TEAL }} title={`${h}:00`} />))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] intel-faint"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
          <div className="mt-1 text-[11px] intel-faint">● {t.prayer}</div>
        </Card>
      </div>

      <SectionLabel n="02" title={t.secCatch} sub={t.live} />
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <Card title={t.catchment} ok={false} sample={t.sample} verified={t.verified}>
          <div className="flex items-center gap-5">
            <svg viewBox="0 0 160 160" className="h-36 w-36">
              <circle cx="80" cy="80" r="72" fill={TEAL} opacity="0.10" /><circle cx="80" cy="80" r="50" fill={TEAL} opacity="0.18" /><circle cx="80" cy="80" r="28" fill={TEAL} opacity="0.30" /><circle cx="80" cy="80" r="4" fill={TEAL} />
            </svg>
            <div className="space-y-2 text-[13px]">
              <Ring label={t.min5} v={`${catch5}k`} o={0.3} /><Ring label={t.min10} v={`${catch10}k`} o={0.18} /><Ring label={t.min15} v={`${catch15}k`} o={0.1} />
            </div>
          </div>
        </Card>

        <Card title={t.demo} ok={false} sample={t.sample} verified={t.verified}>
          <div className="space-y-3">
            <Bar label={t.workingAge} value={workingAge} suffix="%" max={100} />
            <Bar label={t.daytime} value={daytime} suffix="" max={120} />
            <Bar label={t.spend} value={spendIdx} suffix="" max={160} />
          </div>
        </Card>
      </div>

      <SectionLabel n="03" title={t.secMarket} sub={t.verified} />
      <div className="mt-3">
        <Card title={t.demandSupply} ok={true} sample={t.sample} verified={t.verified}>
          {real.length === 0 ? <p className="intel-muted">{t.none}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="text-start text-[11px] uppercase tracking-wide intel-faint">
                  <th className="py-2 text-start font-medium">{t.use}</th><th className="py-2 text-start font-medium">{t.rent}</th><th className="py-2 text-start font-medium">{t.supplyL}</th><th className="py-2 text-start font-medium">{t.availL}</th><th className="py-2 text-start font-medium">{t.demandL}</th>
                </tr></thead>
                <tbody>
                  {real.map((r)=>(
                    <tr key={r.asset} className="border-t border-line">
                      <td className="py-2.5"><Link href={`/${locale}/listings?asset=${r.asset}`} className="text-charcoal hover:text-charcoal">{assetLabel(r.asset, locale)}</Link></td>
                      <td className="py-2.5"><div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-charcoal/[0.05]"><div className="h-full" style={{width:`${r.rent?(r.rent/maxReal)*100:0}%`,background:GOLD}}/></div><span className="fig" style={{color:GOLD}}>{r.rent?Math.round(r.rent).toLocaleString():"—"}</span></div></td>
                      <td className="py-2.5 intel-muted fig">{r.supply}</td><td className="py-2.5 intel-muted fig">{r.avail}</td><td className="py-2.5 intel-muted fig">{r.demand}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-4"><Link href={`/${locale}/map`} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-signal hover:underline">{ar ? "افتح الخريطة" : "Open the map"} →</Link><Link href={`/${locale}/listings`} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-signal hover:underline">{ar ? "تصفّح القوائم" : "Browse listings"} →</Link><Link href={`/${locale}/rent-index`} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-signal hover:underline">{ar ? "مؤشر الإيجار" : "Rent index"} →</Link></div>
      <p className="mt-4 text-xs intel-faint">{t.note}</p>
    </section>
  );
}

function SectionLabel({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (
    <div className="mt-8 flex items-baseline gap-3 border-b border-line pb-2">
      <span className="fig text-[12px] text-charcoal">{n}</span>
      <h2 className="font-display text-xl text-charcoal">{title}</h2>
      {sub ? <span className="text-[11px] uppercase tracking-wide intel-faint">{sub}</span> : null}
    </div>
  );
}
function Kpi({ label, value, tone }: { label: string; value: string; tone: "live" | "verified" }) {
  const c = tone === "live" ? TEAL : GOLD;
  return (
    <div className="intel-card p-3.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide intel-faint"><span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: c }} />{label}</div>
      <div className="mt-1 fig text-[22px] tracking-tight" style={{ color: c }}>{value}</div>
    </div>
  );
}
function Card({ title, ok, sample, verified, children }: { title: string; ok: boolean; sample: string; verified: string; children: React.ReactNode }) {
  return (
    <div className="intel-card p-5">
      <div className="flex items-center justify-between">
        <div className="font-display text-[15px] text-charcoal">{title}</div>
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${ok?"tag-verified":"tag-sample"}`}>{ok?verified:sample}</span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
function Ring({ label, v, o }: { label: string; v: string; o: number }) {
  return <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full" style={{ background: TEAL, opacity: o + 0.3 }} /><span className="intel-muted">{label}</span><span className="fig text-charcoal">{v}</span></div>;
}
function Bar({ label, value, suffix, max }: { label: string; value: number; suffix: string; max: number }) {
  return (
    <div>
      <div className="flex justify-between text-[12.5px]"><span className="intel-muted">{label}</span><span className="fig text-charcoal">{value}{suffix}</span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-charcoal/[0.05]"><div className="h-full" style={{ width: `${Math.min(100,(value/max)*100)}%`, background: TEAL }} /></div>
    </div>
  );
}
