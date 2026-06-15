export default function AssetIcon({ type, className = "" }: { type: string; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, JSX.Element> = {
    office: <g {...common}><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" /></g>,
    retail: <g {...common}><path d="M4 9h16l-1-4H5L4 9Z" /><path d="M5 9v10h14V9" /><path d="M9 19v-5h6v5" /></g>,
    medical: <g {...common}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 8v8M8 12h8" /></g>,
    showroom: <g {...common}><path d="M3 10l2-5h14l2 5" /><path d="M3 10v9h18v-9" /><path d="M3 10h18" /></g>,
    warehouse: <g {...common}><path d="M3 21V9l9-5 9 5v12" /><path d="M7 21v-6h10v6" /></g>,
    serviced: <g {...common}><rect x="4" y="6" width="16" height="12" rx="2" /><path d="M8 18v2M16 18v2M9 10h6" /></g>,
    education: <g {...common}><path d="M3 8l9-4 9 4-9 4-9-4Z" /><path d="M7 10v5c0 1 2 2 5 2s5-1 5-2v-5" /></g>,
    land: <g {...common}><path d="M3 20h18" /><path d="M6 20l3-9 3 5 2-3 4 7" /></g>
  };
  return <svg viewBox="0 0 24 24" className={className} aria-hidden>{paths[type] || paths.office}</svg>;
}
