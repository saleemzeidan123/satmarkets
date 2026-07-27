import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel, gradeLabel, cityLabel } from "@/lib/labels";
import { photoFor } from "@/lib/photos";
import ListingCard from "@/components/ListingCard";
import { getDictionary } from "@/i18n/getDictionary";
import type { Listing } from "@/lib/types";
import JsonLd, { SITE } from "@/components/JsonLd";
import { localeMeta } from "@/lib/meta";
import { fill } from "@/lib/format";
import { getBuildingById } from "@/lib/queries/listings";

const TEAL = "#3A6EA5"; const GOLD = "#3A6EA5";
function rng(seed: number) { return () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }; }
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

export async function generateMetadata({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) return {};
  const loc = (params.locale === "ar" ? "ar" : "en") as "en" | "ar";
  const ar = loc === "ar";
  const dict = getDictionary(loc);
  const b: any = await getBuildingById(params.id);
  if (!b) return { title: dict.building.metaNotFound };
  const name = (ar ? (b.name_ar || b.name_en) : b.name_en) || (dict.building.fallbackName);
  const place = `${ar ? (b.district_label_ar || b.district_label) : b.district_label}${b.city ? (ar ? "، " : ", ") + cityLabel(b.city, loc) : ""}`;
  const grade = gradeLabel(b.grade, loc);
  const type = assetLabel(b.asset_type, loc);
  const title = fill(dict.building.metaTitle, { name, place });
  const description = fill(dict.building.metaDesc, { name, type, grade, place });
  return localeMeta(params.locale, `/building/${params.id}`, title, description, { type: "article" });
}

export default async function BuildingPage({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale; const ar = locale === "ar";
  const dict = getDictionary(locale);
  const sb = getSupabaseServer();
  if (!sb) notFound();
  const b: any = await getBuildingById(params.id);
  if (!b) notFound();
  const [{ data: units }, { data: rentRows }, { data: briefs }] = await Promise.all([
    sb.from("listings").select("*, districts(name_en, name_ar, city)").eq("building_id", b.id).eq("status", "published").order("created_at", { ascending: false }),
    sb.from("rent_index_published").select("asset_type, unit, band_low, band_high, median, sufficient").eq("district_id", b.district_id).eq("asset_type", b.asset_type),
    sb.from("tenant_briefs").select("id").eq("district_id", b.district_id).eq("asset_type", b.asset_type),
  ]);
  const listings = (units as Listing[]) ?? [];
  const band = (rentRows ?? []).find((r: any) => r.sufficient && r.median != null) as any;
  const demand = (briefs ?? []).length;

  const rnd = rng(hash(b.id) + 7);
  const weekly = Array.from({ length: 8 }, (_, i) => 55 + Math.round(rnd() * 40) + (i > 4 ? 12 : 0));
  const wow = Math.round(rnd() * 18 - 6);
  const hours = Array.from({ length: 24 }, (_, h) => { let v = 8 + Math.round(Math.sin((h - 6) / 24 * Math.PI * 2) * 18 + rnd() * 14); if ([5, 12, 15, 18, 20].includes(h)) v = Math.max(4, v - 14); return Math.max(3, v); });
  const catch5 = 40 + Math.round(rnd() * 60), catch10 = catch5 + 120 + Math.round(rnd() * 180), catch15 = catch10 + 260 + Math.round(rnd() * 320);
  const workingAge = 58 + Math.round(rnd() * 14), daytime = 60 + Math.round(rnd() * 30), spendIdx = 90 + Math.round(rnd() * 60);
  const dwell = 26 + Math.round(rnd() * 20);

  const name = ar ? (b.name_ar || b.name_en) : b.name_en;
  const place = `${ar ? (b.district_label_ar || b.district_label) : b.district_label}${b.city ? "، " + cityLabel(b.city, locale) : ""}`;
  const grade = gradeLabel(b.grade, locale);

  const T = dict.building;

  const maxWeekly = Math.max(...weekly), maxHour = Math.max(...hours);
  const days = ar ? ["أحد","إثن","ثلا","أرب","خمي","جمع","سبت","أحد"] : ["Su","Mo","Tu","We","Th","Fr","Sa","Su"];
  const W = 520, H = 120;
  const pts = weekly.map((v, i) => [12 + i * ((W - 24) / (weekly.length - 1)), H - 12 - (v / maxWeekly) * (H - 30)]);
  const lineP = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaP = `${lineP} L${pts[pts.length-1][0].toFixed(1)},${H-12} L${pts[0][0].toFixed(1)},${H-12} Z`;

  return (
    <section>
      <JsonLd data={{ "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: dict.building.crumbHome, item: `${SITE}/${locale}` },
        { "@type": "ListItem", position: 2, name: dict.building.crumbListings, item: `${SITE}/${locale}/listings` },
        ...(b.district_id ? [{ "@type": "ListItem", position: 3, name: ar ? (b.district_label_ar || b.district_label) : b.district_label, item: `${SITE}/${locale}/listings?district=${b.district_id}` }] : []),
        { "@type": "ListItem", position: b.district_id ? 4 : 3, name, item: `${SITE}/${locale}/building/${b.id}` },
      ] }} />
      <Link href={`/${locale}/map`} className="text-[13px] text-charcoal/55 hover:text-charcoal">{ar ? "→" : "←"} {T.back}</Link>

      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <div className="relative h-52 sm:h-60">
          <img src={photoFor(b.asset_type, b.id)} alt={name} className="h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(20,24,28,0.80), rgba(20,24,28,0.05))" }} />
          <span className="absolute start-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[11px] text-white backdrop-blur"><span className="live-dot" />{T.profile}</span>
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
            <div className="text-[11px] uppercase tracking-wide text-white/70">{place}</div>
            <h1 className="mt-1 font-display text-3xl text-white sm:text-4xl">{name}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-white/85">
              <span className="rounded-md bg-white/15 px-2 py-1 backdrop-blur">{assetLabel(b.asset_type, locale)}</span>
              {grade && grade !== "N/A" ? <span className="rounded-md bg-white/15 px-2 py-1 backdrop-blur">{T.grade} {grade}</span> : null}
              {b.year_built ? <span className="rounded-md bg-white/15 px-2 py-1 backdrop-blur fig">{b.year_built}</span> : null}
              {b.size_sqm ? <span className="rounded-md bg-white/15 px-2 py-1 backdrop-blur"><span className="fig">{Number(b.size_sqm).toLocaleString()}</span> {dict.common.sqm}</span> : null}
              {b.owner_developer ? <span className="rounded-md bg-white/15 px-2 py-1 backdrop-blur">{b.owner_developer}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          {band ? (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-charcoal/45">{T.rentBand}</div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="fig text-[26px]" style={{ color: GOLD }}>{Math.round(band.median).toLocaleString()}</span>
                <span className="fig text-[12px] text-charcoal/55">{band.band_low ? `${Number(band.band_low).toLocaleString()}–${Number(band.band_high).toLocaleString()} · ` : ""}{T.perYear}</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] tag-verified">{T.verified}</span>
              </div>
            </div>
          ) : <div className="text-[13px] text-charcoal/45">{T.noBand}</div>}
          <span className="text-[13px] text-charcoal/60"><span className="fig">{listings.length}</span> {T.units}</span>
        </div>
      </div>

      <SectionLabel n="00" title={T.overview} sub="" />
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label={T.units} value={`${listings.length}`} tone="verified" />
        <Kpi label={T.grade} value={grade && grade !== "N/A" ? grade : "N/A"} tone="verified" />
        <Kpi label={T.visitors} value={`${weekly[weekly.length-1]}k`} tone="live" />
        <Kpi label={T.dwell} value={`${dwell} ${T.min}`} tone="live" />
        <Kpi label={T.catch15} value={`${catch15}k`} tone="live" />
        <Kpi label={T.demand} value={`${demand}`} tone="verified" />
      </div>

      <SectionLabel n="01" title={T.movement} sub={T.live} />
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <Card title={T.footfall} ok={false} sample={T.sample} verified={T.verified}>
          <div className="flex items-end justify-between">
            <div className="fig text-[26px]" style={{ color: TEAL }}>{weekly[weekly.length-1]}k</div>
            <div className={`fig text-sm ${wow>=0?"text-emerald-600":"text-red-500"}`}>{wow>=0?"▲":"▼"} {Math.abs(wow)}%</div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full">
            <defs><linearGradient id="bf" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={TEAL} stopOpacity="0.38"/><stop offset="100%" stopColor={TEAL} stopOpacity="0"/></linearGradient></defs>
            <path d={areaP} fill="url(#bf)" /><path d={lineP} fill="none" stroke={TEAL} strokeWidth="2.5" />
            {pts.map((p,i)=>(<circle key={i} cx={p[0]} cy={p[1]} r="3" fill={TEAL} />))}
          </svg>
          <div className="mt-1 flex justify-between text-[10px] text-charcoal/40">{days.map((d,i)=>(<span key={i}>{d}</span>))}</div>
        </Card>
        <Card title={T.hourly} ok={false} sample={T.sample} verified={T.verified}>
          <div className="flex h-[120px] items-end gap-[3px]">
            {hours.map((v,h)=>(<div key={h} className="flex-1 rounded-t" style={{ height: `${(v/maxHour)*100}%`, background: [5,12,15,18,20].includes(h)?"rgba(47,163,154,0.32)":TEAL }} />))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-charcoal/40"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
          <div className="mt-1 text-[11px] text-charcoal/40">● {T.prayer}</div>
        </Card>
      </div>

      <SectionLabel n="02" title={T.catchSec} sub={T.live} />
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <Card title={T.catchment} ok={false} sample={T.sample} verified={T.verified}>
          <div className="flex items-center gap-5">
            <svg viewBox="0 0 160 160" className="h-36 w-36">
              <circle cx="80" cy="80" r="72" fill={TEAL} opacity="0.10" /><circle cx="80" cy="80" r="50" fill={TEAL} opacity="0.18" /><circle cx="80" cy="80" r="28" fill={TEAL} opacity="0.30" /><circle cx="80" cy="80" r="4" fill={TEAL} />
            </svg>
            <div className="space-y-2 text-[13px]">
              <Ring label={T.min5} v={`${catch5}k`} /><Ring label={T.min10} v={`${catch10}k`} /><Ring label={T.min15} v={`${catch15}k`} />
            </div>
          </div>
        </Card>
        <Card title={T.demo} ok={false} sample={T.sample} verified={T.verified}>
          <div className="space-y-3">
            <Bar label={T.workingAge} value={workingAge} suffix="%" max={100} />
            <Bar label={T.daytime} value={daytime} suffix="" max={120} />
            <Bar label={T.spend} value={spendIdx} suffix="" max={160} />
          </div>
        </Card>
      </div>

      <SectionLabel n="03" title={T.unitsSec} sub={T.verified} />
      {listings.length === 0 ? (
        <p className="mt-3 text-[14px] text-charcoal/50">{T.noUnits}</p>
      ) : (
        <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l)=>(<ListingCard key={l.id} listing={l} locale={locale} sqm={dict.common.sqm} ui={dict.ui} />))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-4"><Link href={`/${locale}/area?district=${b.district_id}`} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-signal hover:underline">{T.areaReport} {ar ? "←" : "→"}</Link><Link href={`/${locale}/listings?asset=${b.asset_type}`} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-signal hover:underline">{T.browseUse} {ar ? "←" : "→"}</Link><Link href={`/${locale}/rent-index`} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-signal hover:underline">{T.rentIndexLink} {ar ? "←" : "→"}</Link></div>
      <p className="mt-6 text-xs text-charcoal/40">{T.note}</p>
    </section>
  );
}

function SectionLabel({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (<div className="mt-8 flex items-baseline gap-3 border-b border-line pb-2"><span className="fig text-[12px] text-charcoal">{n}</span><h2 className="font-display text-xl text-charcoal">{title}</h2>{sub ? <span className="text-[11px] uppercase tracking-wide text-charcoal/40">{sub}</span> : null}</div>);
}
function Kpi({ label, value, tone }: { label: string; value: string; tone: "live" | "verified" }) {
  const c = tone === "live" ? TEAL : GOLD;
  return (<div className="card p-3.5"><div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-charcoal/45"><span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: c }} />{label}</div><div className="mt-1 fig text-[20px] tracking-tight" style={{ color: c }}>{value}</div></div>);
}
function Card({ title, ok, sample, verified, children }: { title: string; ok: boolean; sample: string; verified: string; children: React.ReactNode }) {
  return (<div className="card p-5"><div className="flex items-center justify-between"><div className="font-display text-[15px] text-charcoal">{title}</div><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${ok?"tag-verified":"tag-sample"}`}>{ok?verified:sample}</span></div><div className="mt-3">{children}</div></div>);
}
function Ring({ label, v }: { label: string; v: string }) {
  return (<div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full" style={{ background: TEAL, opacity: 0.5 }} /><span className="text-charcoal/60">{label}</span><span className="fig text-charcoal">{v}</span></div>);
}
function Bar({ label, value, suffix, max }: { label: string; value: number; suffix: string; max: number }) {
  return (<div><div className="flex justify-between text-[12.5px]"><span className="text-charcoal/60">{label}</span><span className="fig text-charcoal">{value}{suffix}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-charcoal/[0.05]"><div className="h-full" style={{ width: `${Math.min(100,(value/max)*100)}%`, background: TEAL }} /></div></div>);
}
