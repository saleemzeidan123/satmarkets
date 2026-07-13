import Link from "next/link";
import LanguageSwitch from "@/components/LanguageSwitch";

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
        <span style={{ fontFamily: "var(--font-serif),Georgia,serif", fontWeight: 800, fontSize: fontPx, letterSpacing: ".01em", color: HARBOR }}>SAT</span>
        <span style={{ fontFamily: "var(--font-serif),Georgia,serif", fontWeight: 800, fontSize: fontPx, letterSpacing: ".01em", textTransform: "uppercase", color: rev ? COOL : INK }}>MARKETS</span>
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
  ["AI and deals", ["AI Advisor", "Deal room", "Messages", "Notifications", "Floor plans"]],
  ["Solutions", ["Occupiers", "Owners and landlords", "Brokers", "Investors"]],
  ["Company", ["About SAT Real Estate", "Our neutrality", "Help center"]],
  ["Trust and legal", ["How we verify", "Terms of Service", "Privacy and PDPL", "Contact"]],
];
// Claims register: only the FAL advertising licence is evidenced today. Ejar,
// ZATCA and Nafath are not integrated and PDPL compliance has not been
// certified, so those four badges asserted capabilities the platform does not
// have. Do not re-add a badge here without a source, date and scope.
const FOOT_TRUST = ["FAL 1200025510"];
const ROUTES: Record<string, string> = { "Listings": "/listings", "Requirements": "/requirements", "Rent Index": "/rent-index", "Compare spaces": "/compare", "Investment underwriting": "/invest", "Location Intelligence": "/area", "Investment": "/hbu", "For owners": "/dashboard", "Membership": "/pricing", "AI Advisor": "/advisor", "Deal room": "/deal", "Messages": "/messages", "Notifications": "/notifications", "Floor plans": "/docs", "About SAT Real Estate": "/about", "Help center": "/about", "Brokers": "/brokers", "Occupiers": "/listings", "Owners and landlords": "/dashboard", "Investors": "/invest", "Our neutrality": "/neutrality", "How we verify": "/about", "REGA compliance": "/about", "Terms of Service": "/terms", "Privacy and PDPL": "/privacy", "Contact": "/contact" };

export default function SatFooter({ locale = "en" }: { locale?: string }) {
  const __T: Record<string, string> = {"FAL 1200025510":"فال 1200025510","Platform":"المنصة","AI and deals":"الذكاء والصفقات","Solutions":"الحلول","Company":"الشركة","Trust and legal":"الثقة والامتثال","Listings":"العروض","Requirements":"الطلبات","Rent Index":"مؤشر الإيجارات","Compare spaces":"قارن المساحات","Investment underwriting":"تحليل الاستثمار","Location Intelligence":"ذكاء الموقع","For owners":"للملاك","Membership":"العضوية","AI Advisor":"المستشار الذكي","Deal room":"غرفة الصفقة","Messages":"الرسائل","Notifications":"الإشعارات","Floor plans":"المخططات","About SAT Real Estate":"عن سات العقارية","Help center":"مركز المساعدة","Occupiers":"المستأجرون","Owners and landlords":"الملاك والمؤجرون","Brokers":"الوسطاء","Investors":"المستثمرون","Setting up an RHQ":"تأسيس مقر إقليمي","Our neutrality":"حيادنا","Newsroom":"غرفة الأخبار","Careers":"الوظائف","Contact":"تواصل","How we verify":"كيف نتحقق","Terms of Service":"شروط الخدمة","Privacy and PDPL":"الخصوصية وحماية البيانات","Security":"الأمان","List your space":"أدرج مساحتك","Browse listings":"تصفّح العروض","POWERED BY SAT REAL ESTATE":"مدعومة من سات العقارية","List, lease or invest, on verified ground.":"أدرج، أجّر، أو استثمر، على أرض موثّقة.","Join owners, occupiers and licensed brokers across the Kingdom.":"انضم إلى الملاك والمستأجرين والوسطاء المرخّصين في أنحاء المملكة.","Saudi Arabia's commercial leasing and sales exchange. Verified listings, decision-grade data, end-to-end deals.":"منصة سعودية للتأجير والبيع التجاري. عروض موثّقة، بيانات تدعم القرار، وصفقات متكاملة."};
  const t = (x: string): string => (locale === "ar" ? (__T[x] ?? x) : x);
  const L = (p: string) => `/${locale}${p}`;
  return (
    <footer className="foot">
      <div className="foot-mark"><SatMark size={300} base="#fff" lit={HARBOR} /></div>
      <div className="cta">
        <div className="cta-copy">
          <div className="cta-title">{t("List, lease or invest, on verified ground.")}</div>
          <div className="cta-sub">{t("Join owners, occupiers and licensed brokers across the Kingdom.")}</div>
        </div>
        <div className="cta-actions">
          <Link href={L("/dashboard")} className="btn btn-light">{t("List your space")}</Link>
          <Link href={L("/listings")} className="btn btn-outline">{t("Browse listings")}</Link>
        </div>
      </div>
      <div className="foot-cols">
        <div className="foot-brand">
          <SatLogo size={30} />
          <p>{t("Saudi Arabia's commercial leasing and sales exchange. Verified listings, decision-grade data, end-to-end deals.")}</p>
        </div>
        {FOOT_COLS.map(([title, links]) => (
          <div className="foot-col" key={title}>
            <h5 className="col-h">{t(title)}</h5>
            {links.map((l) => (ROUTES[l] ? <Link key={l} href={L(ROUTES[l])}>{t(l)}</Link> : <a key={l}>{t(l)}</a>))}
          </div>
        ))}
      </div>
      <div className="foot-mid">
        <div className="trust-row">
          {FOOT_TRUST.map((b) => <span className="tpill" key={b}><span className="d" />{t(b)}</span>)}
        </div>
        <div className="foot-end">
          {/* The language toggle was two <span>s: it looked like a switcher and did
              nothing. It is now a real pair of locale links. The three social icons
              were <a> tags with no href, so they rendered as empty grey boxes that
              went nowhere. They stay out until the accounts exist. */}
          <LanguageSwitch locale={locale === "ar" ? "ar" : "en"} />
          <Link className="soc" href={L("/contact")} aria-label={t("Contact")}>{FIcon.mail(16)}</Link>
        </div>
      </div>
      <div className="bottom">
        <span>© 2026 SAT MARKETS · SATMARKETS.SA · {locale === "ar" ? "الرياض، السعودية" : "RIYADH, KSA"} · SAT REAL ESTATE FAL 1200025510</span>
        <span>{t("POWERED BY SAT REAL ESTATE")}</span>
      </div>
    </footer>
  );
}
