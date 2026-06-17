import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDictionary } from "@/i18n/getDictionary";
import { getSupabaseServer } from "@/lib/supabase/server";
import HeroLive from "@/components/HeroLive";
import ListingCard from "@/components/ListingCard";
import ValuePillars from "@/components/ValuePillars";
import Reveal from "@/components/Reveal";
import type { Listing } from "@/lib/types";
import { assetLabel } from "@/lib/labels";

export default async function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const dict = getDictionary(locale);
  const ar = locale === "ar";
  const sb = getSupabaseServer();
  let featured: Listing[] = [];
  let count = 0;
  if (sb) {
    const { data } = await sb.from("listings").select("*, districts(name_en, name_ar, city)").eq("status","published").order("created_at",{ascending:false}).limit(6);
    featured = (data as Listing[]) ?? [];
    const { count: c } = await sb.from("listings").select("*", { count:"exact", head:true }).eq("status","published");
    count = c ?? 0;
  }
  const smartChips = ar
    ? ["ملكية موثّقة","مدعومة بتصريح","مطابَقة بمؤشر سات","ذكاء المنطقة"]
    : ["Verified ownership","Permit-backed","Rent-checked vs SAT index","Area intelligence"];
  const dots = [{c:"#6E92EC",x:54,y:60},{c:"#2E5FE0",x:120,y:42},{c:"#2F6E6E",x:182,y:78},{c:"#4D7CF0",x:96,y:104},{c:"#5A6473",x:226,y:54},{c:"#5b6470",x:156,y:124},{c:"#3E6E66",x:60,y:128},{c:"#6E92EC",x:250,y:110}];
  return (
    <div className="space-y-20">
      <HeroLive locale={locale} hero={dict.hero} count={count} />

      {featured.length > 0 && (
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#2E5FE0]">{ar ? "قوائم ذكية" : "Smart listings"}</div>
              <h2 className="mt-1 font-display text-3xl text-charcoal">{ar ? "مساحات موثّقة — بذكاء مدمج" : "Verified space, with the intelligence built in"}</h2>
              <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-charcoal/60">{ar ? "ليست إعلانات. كل قائمة موثّقة وذكية — مع نطاق إيجار وذكاء منطقة." : "Not classifieds. Every listing is verified and intelligence-backed — with a rent band and area intelligence."}</p>
            </div>
            <Link href={`/${locale}/listings`} className="link-underline text-sm text-signal">{dict.featured.viewAll} →</Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {smartChips.map((c)=>(<span key={c} className="inline-flex items-center gap-2 text-[12px] text-charcoal/60"><span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#2E5FE0" }} />{c}</span>))}
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((l, i)=>(<Reveal key={l.id} delay={i*60}><ListingCard listing={l} locale={locale} sqm={dict.common.sqm} ui={dict.ui} /></Reveal>))}
          </div>
        </Reveal>
      )}

      <Reveal>
        <div className="text-center">
          <div className="divider-gold mx-auto" />
          <h2 className="mt-4 font-display text-3xl text-charcoal">{dict.why.title}</h2>
          <p className="mx-auto mt-2 max-w-xl text-charcoal/60">{dict.why.sub}</p>
        </div>
        <div className="mt-8"><ValuePillars why={dict.why} /></div>
      </Reveal>

      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-ivory-2 to-white px-8 py-10 text-charcoal">
          <div className="grid items-center gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="eyebrow">{dict.home.mapTitle}</div>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-charcoal/65">{dict.home.mapBody}</p>
              <Link href={`/${locale}/map`} className="btn-gold mt-5 inline-block px-5 py-2.5 text-sm font-medium">{dict.home.mapCta}</Link>
            </div>
            <div className="hidden lg:block">
              <svg viewBox="0 0 300 170" className="w-full rounded-xl border border-line bg-ivory/70">
                <g stroke="rgba(28,26,21,0.07)" strokeWidth="1">
                  <path d="M0 34h300M0 74h300M0 114h300M40 0v170M110 0v170M180 0v170M250 0v170" />
                </g>
                <g stroke="rgba(28,26,21,0.16)" strokeWidth="2.5" fill="none">
                  <path d="M0 96 L120 96 L120 0" />
                  <path d="M0 50 L70 50 L70 170" />
                  <path d="M180 0 L180 130 L300 130" />
                </g>
                {dots.map((d,i)=>(<g key={i}><circle cx={d.x} cy={d.y} r="6.5" fill={d.c} opacity="0.92" /><circle cx={d.x} cy={d.y} r="11" fill={d.c} opacity="0.16" /></g>))}
              </svg>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="text-center">
          <h2 className="font-display text-3xl text-charcoal">{dict.home.forTitle}</h2>
          <p className="mx-auto mt-2 max-w-xl text-charcoal/60">{dict.home.forSub}</p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            { t: dict.home.occT, b: dict.home.occB, c: dict.home.occC, href: `/${locale}/listings` },
            { t: dict.home.ownT, b: dict.home.ownB, c: dict.home.ownC, href: `/${locale}/dashboard` },
            { t: dict.home.invT, b: dict.home.invB, c: dict.home.invC, href: `/${locale}/hbu` },
          ].map((p, i) => (
            <div key={i} className="card flex flex-col p-6">
              <h3 className="font-display text-xl text-charcoal">{p.t}</h3>
              <p className="mt-2 flex-1 text-[14px] leading-relaxed text-charcoal/65">{p.b}</p>
              <Link href={p.href} className="link-underline mt-4 text-sm text-signal">{p.c}</Link>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-ivory-2 to-white px-8 py-9 text-charcoal">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat n={`${count}+`} l={dict.statBand.listings} />
            <Stat n="60+" l={dict.statBand.buildings} />
            <Stat n="4" l={dict.statBand.cities} />
            <Stat n="9" l={dict.statBand.districts} />
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-line bg-white px-8 py-10 shadow-card">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <div className="eyebrow">{ar ? "مؤشر سات ماركتس للإيجارات التجارية" : "SAT Markets Rent Index"}</div>
              <h2 className="mt-2 font-display text-3xl text-charcoal">{dict.rentTeaser.title}</h2>
              <p className="mt-3 max-w-md text-charcoal/60">{dict.rentTeaser.body}</p>
              <Link href={`/${locale}/rent-index`} className="btn-gold mt-5 inline-block px-5 py-2.5 text-sm font-medium">{dict.rentTeaser.cta}</Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[{a:"office",v:3700},{a:"retail",v:3200},{a:"medical",v:2000},{a:"warehouse",v:230}].map((m,i)=>(
                <div key={i} className="rounded-xl border border-line bg-ivory-2/40 p-4">
                  <div className="text-[11px] text-charcoal/50">{assetLabel(m.a, locale)}</div>
                  <div className="mt-1 fig text-[22px] text-charcoal tracking-tight">{m.v.toLocaleString()}</div>
                  <div className="text-[10px] text-charcoal/45">{dict.home.teaserPlaces[i]} · {locale==="ar"?"ريال/م²/سنة":"SAR/sqm/yr"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
function Stat({ n, l }: { n: string; l: string }) {
  return <div><div className="fig text-[26px] text-charcoal tracking-tight">{n}</div><div className="mt-1 text-[12px] text-charcoal/55">{l}</div></div>;
}
