export default function ValuePillars({ why }: { why: any }) {
  const items = [
    { t: why.p1t, d: why.p1d }, { t: why.p2t, d: why.p2d },
    { t: why.p3t, d: why.p3d }, { t: why.p4t, d: why.p4d },
  ];
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
      {items.map((it, i) => (
        <div key={i} className="bg-white p-7 transition-colors duration-300 hover:bg-ivory-2/50 sm:p-8">
          <div className="flex items-baseline gap-4">
            <span className="fig text-2xl leading-none text-signal/65">{String(i).padStart(2, "0")}</span>
            <h3 className="font-display text-xl text-charcoal">{it.t}</h3>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-charcoal/60 ps-[2.6rem]">{it.d}</p>
        </div>
      ))}
    </div>
  );
}
