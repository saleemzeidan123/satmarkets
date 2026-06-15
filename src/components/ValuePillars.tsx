const paths = [
  <g key="1"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/></g>,
  <g key="2"><path d="M4 20V8M10 20V4M16 20v-8M22 20H2"/></g>,
  <g key="3"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></g>,
  <g key="4"><path d="M16 21v-2a4 4 0 0 0-8 0v2"/><circle cx="12" cy="7" r="4"/></g>
];
export default function ValuePillars({ why }: { why: any }) {
  const items = [
    { t: why.p1t, d: why.p1d }, { t: why.p2t, d: why.p2d },
    { t: why.p3t, d: why.p3d }, { t: why.p4t, d: why.p4d },
  ];
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it, i) => (
        <div key={i} className="card p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{paths[i]}</svg>
          </div>
          <h3 className="mt-3 font-display text-lg text-charcoal">{it.t}</h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-charcoal/60">{it.d}</p>
        </div>
      ))}
    </div>
  );
}
