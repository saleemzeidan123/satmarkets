import { photoFor } from "@/lib/photos";

export default function HeroVisual({ locale = "en" }: { locale?: "en" | "ar" }) {
  const ar = locale === "ar";
  const bars = [54, 68, 60, 82, 66, 90, 74];
  const t = {
    index: ar ? "مؤشر سات للإيجار" : "SAT Rent Index",
    verified: ar ? "موثق" : "verified",
    idxMeta: ar ? "واجهة الرياض · مكاتب · الوسيط" : "KAFD · Office · median",
    unit: ar ? "ريال/م²/سنة" : "SAR/sqm/yr",
    cardTitle: ar ? "مكتب فئة A، واجهة الرياض" : "Grade A Office, KAFD",
    cardMeta: ar ? "850 م² · A+ · واجهة الرياض" : "850 sqm · A+ · KAFD, Riyadh",
    inline: ar ? "ضمن نطاق السوق" : "In line with the market band",
    band: ar ? "النطاق 3٬000–4٬200" : "Band 3,000–4,200",
  };
  return (
    <div className="relative hidden lg:block">
      {/* soft depth, behind the cards */}
      <div className="pointer-events-none absolute -end-12 top-4 -z-0 h-72 w-72 rounded-full bg-signal/10 blur-3xl" />

      {/* clean vertical stack, flow layout, cannot overlap */}
      <div className="relative z-10 ms-auto w-[340px] space-y-4">
        {/* listing preview (anchor) */}
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
          <div className="relative h-44">
            <img src={photoFor("office", "kafd-hero")} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
            <span className="badge glass absolute start-3 top-3 text-[10px] text-charcoal/80">{t.verified}</span>
            <div className="absolute bottom-3 start-3 text-white">
              <div className="font-display text-2xl leading-none tnum drop-shadow">3,600</div>
              <div className="text-[10px] opacity-90">{t.unit}</div>
            </div>
          </div>
          <div className="p-4">
            <div className="font-display text-[17px] leading-snug text-charcoal">{t.cardTitle}</div>
            <div className="mt-1 text-[12.5px] text-charcoal/55">{t.cardMeta}</div>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-ivory-2/50 px-3 py-2">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate/15 text-slate">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
              </span>
              <div className="leading-tight">
                <div className="text-[12px] font-medium text-slate">{t.inline}</div>
                <div className="text-[10.5px] text-charcoal/45">{t.band}</div>
              </div>
            </div>
          </div>
        </div>

        {/* rent index (supporting data) */}
        <div className="rounded-2xl border border-line bg-white/85 p-4 shadow-card backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="eyebrow">{t.index}</div>
            <span className="badge badge-verified">{t.verified}</span>
          </div>
          <div className="mt-1 text-[12px] text-charcoal/50">{t.idxMeta}</div>
          <div className="mt-1.5 flex items-end justify-between">
            <div className="flex items-end gap-2">
              <div className="font-display text-[32px] leading-none text-charcoal tnum">3,505</div>
              <div className="pb-1 text-[10px] text-charcoal/45">{t.unit}</div>
            </div>
            <div className="flex h-9 items-end gap-1">
              {bars.map((h, i) => <div key={i} className="w-2 rounded-t-sm" style={{ height: `${h}%`, background: "#3A6EA5", opacity: 0.4 + i * 0.08 }} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
