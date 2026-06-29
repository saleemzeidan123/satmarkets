"use client";
import { useEffect, useState } from "react";
import HeroSearch from "@/components/HeroSearch";

const CSS = `
.hl-live{display:inline-block;width:7px;height:7px;border-radius:50%;background:#34d399;animation:hlLive 1.8s ease-out infinite}
@keyframes hlLive{0%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}100%{box-shadow:0 0 0 8px rgba(52,211,153,0)}}
@media (prefers-reduced-motion:reduce){.hl-live{animation:none}}
`;

function useReduced(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion:reduce)");
    setR(m.matches);
    const h = () => setR(m.matches);
    m.addEventListener && m.addEventListener("change", h);
    return () => { m.removeEventListener && m.removeEventListener("change", h); };
  }, []);
  return r;
}

function useCountUp(target: number, reduced: boolean, ms: number): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (reduced) { setV(target); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / ms, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setV(target * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced, ms]);
  return v;
}

export default function HeroLive({ locale, hero, count }: {
  locale: "en" | "ar";
  hero: { eyebrow: string; title: string; subtitle: string; searchPlaceholder: string; browse: string };
  count: number;
}) {
  const reduced = useReduced();
  const ar = locale === "ar";
  const rent = useCountUp(3700, reduced, 1500);
  const ver = useCountUp(count || 0, reduced, 1500);

  const grad = ar
    ? "linear-gradient(250deg, rgba(7,11,23,.94) 0%, rgba(7,11,23,.74) 40%, rgba(7,11,23,.34) 72%, rgba(7,11,23,.16) 100%)"
    : "linear-gradient(110deg, rgba(7,11,23,.94) 0%, rgba(7,11,23,.74) 40%, rgba(7,11,23,.34) 72%, rgba(7,11,23,.16) 100%)";

  return (
    <section className="relative -mt-8 min-h-[580px] overflow-hidden sm:-mt-10 sm:min-h-[640px]" style={{ width: "100vw", marginInlineStart: "calc(50% - 50vw)", background: "#070B17" }}>
      <style>{CSS}</style>
      <div className="!absolute inset-0" style={{ backgroundImage: "url(/hero-kafd.jpg)", backgroundSize: "cover", backgroundPosition: "center 38%" }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: "rgba(7,11,23,.28)" }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: grad }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(7,11,23,.55), rgba(7,11,23,0) 20%)" }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,11,23,.78), rgba(7,11,23,0) 38%)" }} />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <defs><pattern id="hlg" width="68" height="68" patternUnits="userSpaceOnUse"><path d="M68 0H0V68" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="1" /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#hlg)" />
      </svg>
      <span className="pointer-events-none absolute left-4 top-4 h-3.5 w-3.5 border-l border-t border-white/20" />
      <span className="pointer-events-none absolute right-4 top-4 h-3.5 w-3.5 border-r border-t border-white/20" />
      <span className="pointer-events-none absolute bottom-4 left-4 h-3.5 w-3.5 border-b border-l border-white/20" />
      <span className="pointer-events-none absolute bottom-4 right-4 h-3.5 w-3.5 border-b border-r border-white/20" />

      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28">
        <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="anim-rise max-w-xl">
            <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/70">
              <span className="hl-live" />{hero.eyebrow}
            </div>
            <h1 className="mt-4 font-display text-[42px] leading-[1.05] text-white sm:text-[60px]">{hero.title}</h1>
            <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-white/75">{hero.subtitle}</p>
            <div className="mt-8"><HeroSearch locale={locale} placeholder={hero.searchPlaceholder} cta={hero.browse} /></div>
          </div>

          <div className="lg:justify-self-end">
            <div className="w-full max-w-[340px] overflow-hidden rounded-2xl border border-white/12 bg-white/[0.06] p-5 shadow-lift backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[12px] font-medium text-white/85">{ar ? "مؤشر سات للإيجار" : "SAT Rent Index"}</div>
                  <div className="text-[11px] text-white/50">{ar ? "مكاتب رئيسية · الرياض" : "Prime office · Riyadh"}</div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-emerald-300"><span className="hl-live" />{ar ? "مباشر" : "LIVE"}</span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="fig text-[40px] leading-none text-white tracking-tight">{Math.round(rent).toLocaleString()}</span>
                <span className="text-[12px] text-white/55">{ar ? "ريال/م²/سنة" : "SAR / sqm / yr"}</span>
              </div>
              <div className="mt-1.5 text-[12px] font-medium text-emerald-300">{ar ? "+4.2% سنوياً" : "+4.2% YoY"}</div>
              <svg viewBox="0 0 300 56" className="mt-3 w-full" preserveAspectRatio="none">
                <path d="M0 44 L40 40 L80 42 L120 32 L160 34 L200 22 L240 24 L300 10" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
                <path d="M0 44 L40 40 L80 42 L120 32 L160 34 L200 22 L240 24 L300 10 L300 56 L0 56 Z" fill="#34d399" opacity="0.08" />
              </svg>
              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-[12px] text-white/60">{ar ? "قوائم موثّقة، مباشرة" : "Verified listings, live"}</span>
                <span className="fig text-[18px] text-white tracking-tight">{Math.round(ver).toLocaleString()}</span>
              </div>
              <div className="mt-3 font-mono text-[10px] tracking-wide text-white/30">24.7136°N · 46.6753°E · RUH</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
