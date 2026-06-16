import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDictionary } from "@/i18n/getDictionary";
import { getSupabaseServer } from "@/lib/supabase/server";
import HeroSearch from "@/components/HeroSearch";
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
  const chips = ar
    ? ["موثقة ومباشرة من المالك","على مستوى المملكة · الرياض أولاً","إيجار وبيع","عربي / إنجليزي"]
    : ["Verified, owner-direct","Kingdom-wide · Riyadh first","Lease & sale","English / Arabic"];
  const dots = [{c:"#8A7342",x:54,y:60},{c:"#B5482E",x:120,y:42},{c:"#2F6E6E",x:182,y:78},{c:"#C08A3E",x:96,y:104},{c:"#5A6473",x:226,y:54},{c:"#7A5CA8",x:156,y:124},{c:"#4A7A4A",x:60,y:128},{c:"#8A7342",x:250,y:110}];
  const gradMain = ar
    ? "linear-gradient(260deg, rgba(28,20,9,0.92) 0%, rgba(43,31,15,0.72) 34%, rgba(66,49,24,0.34) 64%, rgba(86,64,30,0.10) 100%)"
    : "linear-gradient(100deg, rgba(28,20,9,0.92) 0%, rgba(43,31,15,0.72) 34%, rgba(66,49,24,0.34) 64%, rgba(86,64,30,0.10) 100%)";
  return (
    <div className="space-y-20">
      <section className="relative -mt-8 overflow-hidden sm:-mt-10" style={{ width: "100vw", marginInlineStart: "calc(50% - 50vw)" }}>
        <img src="https://images.unsplash.com/photo-1663900108404-a05e8bf82cda?auto=format&fit=crop&w=2200&q=72" alt="Riyadh skyline at night" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: gradMain }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(24,17,8,0.55) 0%, rgba(24,17,8,0) 24%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(20,14,7,0.62) 0%, rgba(20,14,7,0) 44%)" }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 78% at 80% 64%, rgba(183,154,94,0.20), transparent 70%)" }} />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-28">
          <div className="max-w-2xl">
            <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-gold-soft">{dict.hero.eyebrow}</div>
            <h1 className="mt-4 font-display text-[42px] leading-[1.05] text-white sm:text-[60px]">{dict.hero.title}</h1>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-white/75">{dict.hero.subtitle}</p>
            <div className="mt-8 max-w-2xl"><HeroSearch locale={locale} placeholder={dict.hero.searchPlaceholder} cta={dict.hero.browse} /></div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
              {chips.map((c)=>(<span key={c} className="inline-flex items-center gap-2 text-[12px] text-white/70"><span className="inline-block h-1.5 w-1.5 rounded-full bg-gold-soft" />{c}</span>))}
            </div>
          </div>
        </div>
      </section>

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
              <Link href={p.href} className="link-underline mt-4 text-sm text-gold">{p.c}</Link>
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

      {featured.length > 0 && (
        <Reveal>
          <div className="flex items-end justify-between">
            <div><div className="eyebrow">{dict.featured.eyebrow}</div><h2 className="mt-1 font-display text-2xl text-charcoal">{dict.featured.title}</h2></div>
            <Link href={`/${locale}/listings`} className="link-underline text-sm text-gold">{dict.featured.viewAll} →</Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((l, i)=>(<Reveal key={l.id} delay={i*60}><ListingCard listing={l} locale={locale} sqm={dict.common.sqm} ui={dict.ui} /></Reveal>))}
          </div>
        </Reveal>
      )}

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
                  <div className="mt-1 fig text-[22px] text-gold tracking-tight">{m.v.toLocaleString()}</div>
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
  return <div><div className="fig text-[26px] text-gold tracking-tight">{n}</div><div className="mt-1 text-[12px] text-charcoal/55">{l}</div></div>;
}
