import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDictionary } from "@/i18n/getDictionary";
import { getSupabaseServer } from "@/lib/supabase/server";
import SearchBar from "@/components/SearchBar";
import ListingCard from "@/components/ListingCard";
import Skyline from "@/components/Skyline";
import HeroVisual from "@/components/HeroVisual";
import ValuePillars from "@/components/ValuePillars";
import Reveal from "@/components/Reveal";
import type { Listing } from "@/lib/types";
import { assetLabel } from "@/lib/labels";

const LENS = ["office","retail","warehouse","medical","showroom","land"];

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
    ? ["مرخّصة من FAL","متوافقة مع الهيئة","أكثر من ٥٠٠ مبنى مُراجَع","عربي / إنجليزي"]
    : ["FAL licensed","REGA-native","500+ buildings reviewed","English / Arabic"];
  const cityBars = ar ? ["واجهة الرياض","العليا","جدة","الدمام"] : ["KAFD","Olaya","Jeddah","Dammam"];
  return (
    <div className="space-y-20">
      <section className="mesh relative -mx-6 -mt-10 overflow-hidden px-6 pt-16">
        <div className="grid-faint pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 pb-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow">{dict.hero.eyebrow}</div>
            <h1 className="mt-4 font-display text-[46px] leading-[1.04] text-charcoal sm:text-[60px]">{dict.hero.title}</h1>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-charcoal/65">{dict.hero.subtitle}</p>
            <div className="mt-8"><SearchBar locale={locale} placeholder={dict.hero.searchPlaceholder} cta={dict.hero.browse} /></div>
            <div className="mt-6">
              <div className="text-[11px] uppercase tracking-wide text-charcoal/40">{dict.home.lens}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {LENS.map((a)=>(
                  <Link key={a} href={`/${locale}/listings?asset=${a}`} className="rounded-full border border-line bg-white/70 px-3 py-1.5 text-[12.5px] text-charcoal/70 transition hover:border-gold/50 hover:text-charcoal">{assetLabel(a, locale)}</Link>
                ))}
              </div>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
              {chips.map((c)=>(<span key={c} className="chip-line"><Dot/>{c}</span>))}
            </div>
          </div>
          <HeroVisual locale={locale} />
        </div>
        <Skyline className="pointer-events-none absolute inset-x-0 bottom-0 w-full opacity-90" />
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
        <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-[#1C1A15] to-[#2A2620] px-8 py-10 text-ivory">
          <div className="grid items-center gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="eyebrow text-gold-soft">{dict.home.mapTitle}</div>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ivory/75">{dict.home.mapBody}</p>
              <Link href={`/${locale}/map`} className="btn-gold mt-5 inline-block px-5 py-2.5 text-sm font-medium">{dict.home.mapCta}</Link>
            </div>
            <div className="hidden gap-2 lg:grid lg:grid-cols-4">
              {["#8A7342","#B5482E","#2F6E6E","#5A6473","#C08A3E","#7A5CA8","#4A7A4A","#8C7B52"].map((c,i)=>(
                <span key={i} className="h-10 rounded-md" style={{ background: c, opacity: 0.35 + (i%4)*0.18 }} />
              ))}
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
            { t: dict.home.invT, b: dict.home.invB, c: dict.home.invC, href: `/${locale}/map` },
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
        <div className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-[#1C1A15] to-[#2A2620] px-8 py-9 text-ivory">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat n={`${count}+`} l={dict.statBand.listings} />
            <Stat n="7" l={dict.statBand.assets} />
            <Stat n="4" l={dict.statBand.cities} />
            <Stat n="200+" l={dict.statBand.tx} />
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
              <div className="eyebrow">{ar ? "مؤشر سات للإيجارات التجارية بالرياض" : "SAT Riyadh Commercial Rent Index"}</div>
              <h2 className="mt-2 font-display text-3xl text-charcoal">{dict.rentTeaser.title}</h2>
              <p className="mt-3 max-w-md text-charcoal/60">{dict.rentTeaser.body}</p>
              <Link href={`/${locale}/rent-index`} className="btn-gold mt-5 inline-block px-5 py-2.5 text-sm font-medium">{dict.rentTeaser.cta}</Link>
            </div>
            <div className="flex h-44 items-end gap-3 rounded-xl border border-line bg-ivory-2/40 p-5">
              {[3505,2670,2410,280].map((v,i)=>(
                <div key={i} className="flex flex-1 flex-col items-center justify-end">
                  <div className="bar w-full" style={{height: `${Math.min(100, v/40)}%`}} />
                  <div className="mt-2 font-display text-sm text-gold">{v.toLocaleString()}</div>
                  <div className="text-[10px] text-charcoal/45">{cityBars[i]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
function Dot(){ return <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold/70" />; }
function Stat({ n, l }: { n: string; l: string }) {
  return <div><div className="font-display text-3xl text-gold-soft">{n}</div><div className="mt-1 text-[12px] text-ivory/55">{l}</div></div>;
}
