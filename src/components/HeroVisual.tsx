import { photoFor } from "@/lib/photos";
export default function HeroVisual({ locale = "en" }: { locale?: "en"|"ar" }) {
  const ar = locale === "ar";
  const bars = [62, 78, 70, 88, 74, 95, 82];
  const t = {
    index: ar ? "مؤشر سات للإيجار" : "SAT Rent Index",
    verified: ar ? "موثق" : "verified",
    place: ar ? "واجهة الرياض المالية · مكاتب" : "KAFD, Riyadh · Office",
    unit: ar ? "ريال / م²<br/>وسيط المتحقق" : "SAR / sqm<br/>median achieved",
    cardTitle: ar ? "مكتب فئة A، واجهة الرياض" : "Grade A Office, KAFD",
    cardMeta: ar ? "٨٥٠ م² · A+" : "850 sqm · A+",
  };
  return (
    <div className="relative hidden h-[430px] lg:block">
      <div className="float-slow card glass absolute end-0 top-0 z-10 w-[330px] p-5 shadow-lift">
        <div className="flex items-center justify-between">
          <div className="eyebrow">{t.index}</div>
          <span className="badge badge-verified">{t.verified}</span>
        </div>
        <div className="mt-1 text-[13px] text-charcoal/55">{t.place}</div>
        <div className="mt-3 flex items-end gap-3">
          <div className="font-display text-4xl text-gold">3,505</div>
          <div className="pb-1 text-[11px] text-charcoal/50" dangerouslySetInnerHTML={{__html: t.unit}} />
        </div>
        <div className="mt-4 flex h-16 items-end gap-1.5">
          {bars.map((h, i) => <div key={i} className="bar flex-1" style={{ height: `${h}%`, opacity: 0.5 + i * 0.06 }} />)}
        </div>
      </div>
      <div className="card absolute start-0 top-[250px] z-20 w-[230px] overflow-hidden shadow-lift">
        <div className="relative h-24">
          <img src={photoFor("office","kafd-hero")} alt="" className="h-full w-full object-cover" />
          <span className="badge glass absolute start-2 top-2 text-[10px] text-charcoal/80">{ar?"موثق":"Verified"}</span>
        </div>
        <div className="p-3">
          <div className="text-[13px] font-medium text-charcoal">{t.cardTitle}</div>
          <div className="mt-0.5 flex items-center justify-between"><span className="text-[11px] text-charcoal/50">{t.cardMeta}</span><span className="font-display text-gold">3,600</span></div>
        </div>
      </div>
      <div className="pointer-events-none absolute -end-6 top-6 z-0 h-40 w-40 rounded-full bg-gold/10 blur-2xl" />
    </div>
  );
}
