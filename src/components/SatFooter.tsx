import Link from "next/link";

const HARBOR = "#3A6EA5", INK = "#14181B", COOL = "#F6F8FB";

function SatMark({ size = 30, base = INK, lit = HARBOR }: { size?: number; base?: string; lit?: string }) {
  const f = (v: number) => Math.round(v * 1000) / 1000;
  const rr = (x: number, y: number, w: number, h: number, rs: [number, number, number, number], fill: string) => {
    const [tl, tr, br, bl] = rs;
    const d = `M${f(x + tl)} ${f(y)}H${f(x + w - tr)}A${f(tr)} ${f(tr)} 0 0 1 ${f(x + w)} ${f(y + tr)}`
      + `V${f(y + h - br)}A${f(br)} ${f(br)} 0 0 1 ${f(x + w - br)} ${f(y + h)}`
      + `H${f(x + bl)}A${f(bl)} ${f(bl)} 0 0 1 ${f(x)} ${f(y + h - bl)}`
      + `V${f(y + tl)}A${f(tl)} ${f(tl)} 0 0 1 ${f(x + tl)} ${f(y)}Z`;
    return <path key={`${x}-${y}`} d={d} fill={fill} />;
  };
  const p = 7, foot = 100 - 2 * p, vx = 0.40 * foot, hy = 0.58 * foot, st = 0.05 * foot, R = 10, ir = 2.5, X = p, Y = p;
  const w1 = vx - st / 2, w2 = foot - vx - st / 2, h1 = hy - st / 2, h2 = foot - hy - st / 2;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ flex: "none", display: "block" }}>
      {rr(X, Y, w1, h1, [R, ir, ir, ir], base)}
      {rr(X + vx + st / 2, Y, w2, h1, [ir, R, ir, ir], lit)}
      {rr(X, Y + hy + st / 2, w1, h2, [ir, ir, ir, R], base)}
      {rr(X + vx + st / 2, Y + hy + st / 2, w2, h2, [ir, ir, R, ir], base)}
    </svg>
  );
}

function SatLogo({ size = 30, rev = true }: { size?: number; rev?: boolean }) {
  const fontPx = size * 0.48;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: Math.round(size * 0.2) }}>
      <SatMark size={size} base={rev ? COOL : INK} lit={HARBOR} />
      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}>
        <span style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 800, fontSize: fontPx, letterSpacing: ".01em", color: HARBOR }}>SAT</span>
        <span style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 800, fontSize: fontPx, letterSpacing: ".01em", textTransform: "uppercase", color: rev ? COOL : INK }}>MARKETS</span>
      </span>
    </span>
  );
}

const FIcon = {
  phone: (s: number) => <svg viewBox="0 0 24 24" width={s} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L16 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z" /></svg>,
  user: (s: number) => <svg viewBox="0 0 24 24" width={s} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.6" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /></svg>,
  msg: (s: number) => <svg viewBox="0 0 24 24" width={s} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v11H8l-4 4V5z" /></svg>,
  mail: (s: number) => <svg viewBox="0 0 24 24" width={s} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M4 7l8 6 8-6" /></svg>,
};

const FOOT_COLS: [string, string[]][] = [
  ["Platform", ["Listings", "Requirements", "Rent Index", "Compare spaces", "Investment underwriting", "Location Intelligence", "For owners", "Membership"]],
  ["AI and deals", ["AI Advisor", "AI Agent", "Thinking Map", "Deal room", "Messages", "Notifications", "Floor plans", "Bilingual listing"]],
  ["Solutions", ["Occupiers", "Owners and landlords", "Brokers", "Investors", "Setting up an RHQ"]],
  ["Company", ["About SAT Real Estate", "Our neutrality", "Newsroom", "Careers", "Contact"]],
  ["Trust and legal", ["How we verify", "REGA compliance", "Terms of Service", "Privacy and PDPL", "Security", "Help center"]],
];
const FOOT_TRUST = ["REGA-licensed", "PDPL-compliant", "Ejar-integrated", "ZATCA e-invoicing", "Nafath sign-in"];
const ROUTES: Record<string, string> = { "Listings": "/listings", "Requirements": "/post-requirement", "Rent Index": "/rent-index", "Compare spaces": "/compare", "Investment underwriting": "/invest", "Location Intelligence": "/area", "Investment": "/hbu", "For owners": "/dashboard", "Membership": "/pricing", "AI Advisor": "/advisor", "AI Agent": "/agent", "Thinking Map": "/thinking-map", "Deal room": "/deal", "Messages": "/messages", "Notifications": "/notifications", "Floor plans": "/docs", "Bilingual listing": "/bilingual", "About SAT Real Estate": "/about", "Help center": "/search" };

export default function SatFooter({ locale = "en" }: { locale?: string }) {
  const L = (p: string) => `/${locale}${p}`;
  return (
    <footer className="foot">
      <div className="foot-mark"><SatMark size={300} base="#fff" lit={HARBOR} /></div>
      <div className="cta">
        <div className="cta-copy">
          <div className="cta-title">List, lease or invest, on verified ground.</div>
          <div className="cta-sub">Join owners, occupiers and licensed brokers across the Kingdom.</div>
        </div>
        <div className="cta-actions">
          <Link href={L("/dashboard")} className="btn btn-light">List your space</Link>
          <Link href={L("/listings")} className="btn btn-outline">Browse listings</Link>
        </div>
      </div>
      <div className="foot-cols">
        <div className="foot-brand">
          <SatLogo size={30} />
          <p>Saudi Arabia&apos;s REGA-native commercial leasing and sales exchange. Verified listings, decision-grade data, end-to-end deals.</p>
          <div className="stores">
            <a className="store">{FIcon.phone(18)}<span><span className="ec">Download on the</span><span className="nm">App Store</span></span></a>
            <a className="store">{FIcon.phone(18)}<span><span className="ec">Get it on</span><span className="nm">Google Play</span></span></a>
          </div>
        </div>
        {FOOT_COLS.map(([title, links]) => (
          <div className="foot-col" key={title}>
            <h5 className="col-h">{title}</h5>
            {links.map((l) => (ROUTES[l] ? <Link key={l} href={L(ROUTES[l])}>{l}</Link> : <a key={l}>{l}</a>))}
          </div>
        ))}
      </div>
      <div className="foot-mid">
        <div className="trust-row">
          {FOOT_TRUST.map((t) => <span className="tpill" key={t}><span className="d" />{t}</span>)}
        </div>
        <div className="foot-end">
          <span className="langtog"><span className="on">EN</span><span>العربية</span></span>
          <a className="soc">{FIcon.user(16)}</a>
          <a className="soc">{FIcon.msg(16)}</a>
          <a className="soc">{FIcon.mail(16)}</a>
        </div>
      </div>
      <div className="bottom">
        <span>© 2026 SAT MARKETS · SATMARKETS.SA · RIYADH, KSA</span>
        <span>POWERED BY SAT REAL ESTATE</span>
      </div>
    </footer>
  );
}
