"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mark, Logo, Icon, Ph, Verified, HARBOR, COOL } from "@/components/satkit";
import Reveal from "@/components/Reveal";
import { getDictionary } from "@/i18n/getDictionary";

export type FeaturedListing = { id: string; price: string; title: string; district: string; area: string; type: string; verified: boolean; ph: string; img?: string; idx?: { v: "below" | "within" | "above"; pos: number } | null };
export type HeroBand = { en: string; ar: string; low: number; high: number; median: number; period: string };
type Stats = { listings: string | null; buildings: string | null; districts: string | null; verifiedPct: string | null };

const ASSETS = [
 { v: "office", en: "Office", ar: "مكاتب", icon: <Icon.building size={22} /> },
 { v: "retail", en: "Retail", ar: "تجزئة", icon: <Icon.store size={22} /> },
 { v: "warehouse", en: "Warehouse", ar: "مستودعات", icon: <Icon.layers size={22} /> },
 { v: "medical", en: "Medical", ar: "طبي", icon: <Icon.activity size={22} /> },
 { v: "land", en: "Land", ar: "أراضٍ", icon: <Icon.ruler size={22} /> },
 { v: "showroom", en: "Showroom", ar: "معارض", icon: <Icon.grid size={22} /> },
 { v: "serviced", en: "Serviced", ar: "مكاتب مخدومة", icon: <Icon.clock size={22} /> },
 { v: "mixed_use", en: "Mixed use", ar: "متعدد الاستخدامات", icon: <Icon.target size={22} /> },
 { v: "hospitality", en: "Hospitality", ar: "ضيافة", icon: <Icon.star size={22} /> },
 { v: "education", en: "Education", ar: "تعليم", icon: <Icon.doc size={22} /> },
 { v: "gas_station", en: "Gas station", ar: "محطة وقود", icon: <Icon.bolt size={22} /> },
 { v: "entertainment", en: "Entertainment", ar: "ترفيه", icon: <Icon.spark size={22} /> },
 { v: "wedding_hall", en: "Events & halls", ar: "قاعات ومناسبات", icon: <Icon.cal size={22} /> },
 { v: "worker_housing", en: "Worker housing", ar: "سكن عمالة", icon: <Icon.user size={22} /> },
 { v: "self_storage", en: "Self storage", ar: "تخزين ذاتي", icon: <Icon.inbox size={22} /> },
];

export default function MarketingHome({ locale = "en", featured = [], stats, bands = [], jobs, kpis }: { locale?: string; featured?: FeaturedListing[]; stats: Stats; bands?: HeroBand[]; jobs?: { reqs: number | null; segs: number | null }; kpis: { period: string | null; source: string | null; stat: "average" | "median" | null; officeRent: number | null; retailRent: number | null; cells: number; districts: number } }) {
 const router = useRouter();
 const ar = locale === "ar";
 const H = getDictionary(ar ? "ar" : "en").home;
 const [deal, setDeal] = useState<"lease" | "buy" | "req">("lease");
 const [bi, setBi] = useState(0);
 const band = bands[bi] || bands[0] || null;
 const [q, setQ] = useState("");
 const [assetType, setAssetType] = useState("");
 const [sug, setSug] = useState<{ label: string; sub: string; did?: string; verified?: boolean }[]>([]);
 const [sopen, setSopen] = useState(false);
 const sref = useRef<HTMLDivElement>(null);
 const assetRef = useRef<HTMLDivElement>(null);
 const [atStart, setAtStart] = useState(true);
 const [atEnd, setAtEnd] = useState(false);
 useEffect(() => {
  const el = assetRef.current; if (!el) return;
  const update = () => {
   const max = el.scrollWidth - el.clientWidth;
   if (max <= 1) { setAtStart(true); setAtEnd(true); return; }
   const pos = Math.abs(el.scrollLeft);
   setAtStart(pos <= 4); setAtEnd(pos >= max - 4);
  };
  const onWheel = (e: WheelEvent) => { if (el.scrollWidth <= el.clientWidth) return; if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; el.scrollBy({ left: (ar ? -1 : 1) * e.deltaY * 1.4 }); e.preventDefault(); };
  update();
  el.addEventListener("scroll", update, { passive: true });
  el.addEventListener("wheel", onWheel, { passive: false });
  const ro = new ResizeObserver(update); ro.observe(el);
  return () => { el.removeEventListener("scroll", update); el.removeEventListener("wheel", onWheel); ro.disconnect(); };
 }, [deal, ar]);
 const page = (d: number) => { const el = assetRef.current; if (!el) return; const amount = Math.round(el.clientWidth * 0.7); el.scrollBy({ left: (ar ? -d : d) * amount, behavior: "smooth" }); };
 const fadeLogical = !atStart && !atEnd ? "both" : atStart && !atEnd ? "end" : atEnd && !atStart ? "start" : "none";
 const fadePhysical = !ar ? fadeLogical : fadeLogical === "end" ? "start" : fadeLogical === "start" ? "end" : fadeLogical;
 useEffect(() => {
  const onDoc = (e: MouseEvent) => { if (sref.current && !sref.current.contains(e.target as Node)) setSopen(false); };
  document.addEventListener("mousedown", onDoc);
  return () => document.removeEventListener("mousedown", onDoc);
 }, []);
 useEffect(() => {
  const term = q.trim();
  if (term.length < 2) { setSug([]); return; }
  const ctl = new AbortController();
  const t = setTimeout(() => {
   fetch(`/api/places?q=${encodeURIComponent(term)}&v=1&lang=${locale}`, { signal: ctl.signal })
    .then((r) => r.json())
    .then((d) => { setSug((d.items || []).slice(0, 6)); setSopen(true); })
    .catch(() => {});
  }, 220);
  return () => { clearTimeout(t); ctl.abort(); };
 }, [q]);
 const go = (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  if (deal === "req") { router.push(`/${locale}/post-requirement${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`); return; }
  const sp = new URLSearchParams();
  sp.set("deal", deal === "buy" ? "sale" : "lease");
  if (assetType) sp.set("asset", assetType);
  if (q.trim()) sp.set("q", q.trim());
  router.push(`/${locale}/listings?${sp.toString()}`);
 };
 const L = (p: string) => `/${locale}${p}`;

 const T = ar ? {
  eyebrow: "منصّة للعقار التجاري",
  h1a: "حيث تجد الأعمال السعودية ",
  h1b: "مساحات تجارية موثّقة",
  sub: "مكاتب ومتاجر وعيادات ومستودعات في الرياض. موثّقة من المالك، مدعومة بالتراخيص، بأسعار تُعتمد للقرار، في منصّة محايدة واحدة.",
  tabs: [["lease","إيجار"],["buy","شراء"]] as const,
  phReq: "ما المساحة التي تبحث عنها؟",
  phStd: "الحي أو المشروع أو المبنى",
  btnReq: "أدرج",
  btnStd: "بحث",
  popular: "الأكثر طلباً:",
  chip1: "مكاتب، كافد", chip2: "تجزئة، التحلية", chip3: "مستودعات، الصناعية الثانية",
  micro1: "توثيق المُلّاك قبل الإدراج", micro2: "لا عمولة مفترضة", micro3: "فال 1200025510",
  stat: [[stats.listings, "عروض موثّقة"], [stats.verifiedPct, "موثّقة من المالك"], [stats.districts, "أحياء مفهرسة"], ["1", "منصّة محايدة"]] as [string | null, string][],
  exEye: "المنصّة",
  exH: "أربع وظائف، في مكان محايد واحد",
  exP: "لا أحد غيرنا في المملكة يجمع الوظائف الأربع معاً. هذا هو جوهر المنصّة.",
  cards: [
   ["عروض موثّقة", "مباشرة من المالك الموثّق أو من وسيط مرخّص. كل إعلان يُراجع قبل نشره.", "/listings"],
   ["الطلبات", "يدرج المستأجرون ما يحتاجونه، فيأتيهم العرض المناسب.", "/post-requirement"],
   ["مؤشر الإيجارات", "أسعار تُعتمد للقرار وبيانات النطاق. كل رقم موثّق المصدر.", "/rent-index"],
   ["المستشار الذكي", "بحث وتقييم بالمحادثة، مستند إلى مؤشر الإيجارات.", "/advisor"],
  ] as [string,string,string][],
  ftEye: "مختارة، الرياض",
  ftH: "مساحات موثّقة، بأسعار في سياقها",
  ftBrowse: "تصفّح كل العروض",
  unit: " ريال/م²·سنة",
  bandEye: "مؤشر الإيجارات",
  bandH: "طبقة التسعير خلف كل قرار",
  bandP1: "المعايير المنشورة، منسوبة إلى مصادرها، عبر ", bandP2: " موقعاً بالرياض. قِس إيجاراً، أو حدّد نطاقاً، أو قيّم عقد إيجار. موثّقة المصدر، لا تقديرات.",
  bandBtn: "استكشف مؤشر الإيجارات",
  bandStat: ["الفئة A بالرياض، سنوياً (منشور)", "متوسط الفئة A ريال/م²·سنة", "إشغال الفئة A"] as string[],
  flowEye: "كيف تسير الصفقة",
  flowH: "مسار واحد. تتعامل مع المعلن مباشرة.",
  flowBody: "تواصل مع المعلن مباشرة. مجاناً، ودون تفويض، ودون عمولة. سات ماركتس ليست طرفاً في الصفقة ولا تأخذ منها أي نسبة.",
  flowNote: "شركة سات العقارية مرخّصة للوساطة بشكل منفصل، وتنشر إعلاناتها هنا كأي وسيط آخر. وحين يكون الإعلان لها، يُذكر ذلك بوضوح.",
  oneEye: "منصّة واحدة",
  oneH: "كل ما يحتاجه السوق، في مكان واحد",
  oneP: "الاكتشاف، وبيانات تُعتمد للقرار، والذكاء الاصطناعي، والصفقة كاملة، للمستأجرين والمُلّاك والوسطاء والمستثمرين.",
  feats: [
   ["عروض وخريطة", "عروض مباشرة من الملاك على خريطة حيّة للرياض، ولكل عرض حالة توثيقه ظاهرة عليه."],
   ["مؤشر الإيجارات", "إيجارات تُعتمد للقرار، مع تمييز العقود المسقوفة والمفتوحة."],
   ["ذكاء الموقع", "الحركة والنطاق والجوار التجاري. موثّقة المصدر، لا مُقدّرة."],
   ["تحليل الاستثمار", "العائد وصافي الدخل التشغيلي والسيناريوهات على مقارنات موثّقة."],
   ["المستشار الذكي", "بحث وتقييم حواري، مبني على المؤشر."],
   ["أدرج طلباً", "أخبر السوق بما تحتاجه، فيستجيب المُلّاك والوسطاء."],
   ["لوحة المالك", "أداء العروض، والعملاء المحتملون، ومطابقات الطلبات."],
   ["باقات العضوية", "فئات بحدود واضحة للحصص."],
   ["تتبّع الصفقة", "من الاستفسار إلى المعاينة إلى العرض إلى التسليم، بأطراف موثّقة."],
   ["قارن المساحات", "قائمة مختصرة جنباً إلى جنب على حقائق موثّقة والإيجار مقابل المؤشر."],
   ["الثقة والامتثال", "فال 1200025510 وطبقة توثيق قابلة للتحقّق."],
   ["نبض السوق", "لوحة السوق الحيّة: نطاقات الإيجار حسب الموقع، والمعروض، وانضباط التسعير مقابل المؤشر."],
  ] as [string,string][],
  ctaH: "أدرج مساحتك، أو اعثر على التالية",
  ctaP: "انضمّ إلى المنصّة الموثّقة المبنية للسوق التجاري في الرياض.",
  ctaList: "أدرج مساحتك", ctaBrowse: "تصفّح العروض",
 } : {
  eyebrow: "Commercial real estate exchange",
  h1a: "Where Saudi business finds ",
  h1b: "verified commercial space",
  sub: "Offices, retail, medical and warehouses across Riyadh. Owner-verified, decision-grade pricing, one neutral exchange.",
  tabs: [["lease","Lease"],["buy","Buy"]] as const,
  phReq: "What space are you looking for?",
  phStd: "District, project or building",
  btnReq: "Post",
  btnStd: "Search",
  popular: "Popular:",
  chip1: "Office, KAFD", chip2: "Retail, Tahlia", chip3: "Warehouse, 2nd Industrial",
  micro1: "Owners verified before listing", micro2: "No assumed commission", micro3: "FAL 1200025510",
  stat: [[stats.listings, "Verified listings"], [stats.verifiedPct, "Owner-verified"], [stats.districts, "Districts indexed"], ["1", "Neutral exchange"]] as [string | null, string][],
  exEye: "The exchange",
  exH: "Four jobs, one neutral place",
  exP: "No one else in the Kingdom brings all four together. That is the exchange.",
  cards: [
   ["Verified listings", "Direct from the verified owner or a licensed broker. Every listing is checked before it goes live.", "/listings"],
   ["Requirements", "Occupiers post what they need; the right supply comes to them.", "/post-requirement"],
   ["Rent Index", "Decision-grade pricing and catchment data. Every figure sourced.", "/rent-index"],
   ["AI Advisor", "Conversational search and valuation, grounded in the Rent Index.", "/advisor"],
  ] as [string,string,string][],
  ftEye: "Featured, Riyadh",
  ftH: "Verified spaces, priced in context",
  ftBrowse: "Browse all listings",
  unit: " SAR/m²·yr",
  bandEye: "Rent Index",
  bandH: "The pricing layer behind every decision",
  bandP1: "Published benchmarks, attributed to source, across ", bandP2: " Riyadh locations. Benchmark a rent, size a catchment, or value a lease. Sourced, never estimated.",
  bandBtn: "Explore the Rent Index",
  bandStat: ["Riyadh Grade A, YoY (published)", "Grade A average SAR/m²·yr", "Grade A occupancy"] as string[],
  flowEye: "How a deal flows",
  flowH: "One path. You deal with the lister.",
  flowBody: "Contact the lister directly. It is free, there is no mandate and no commission. SAT Markets is not a party to the transaction and takes no cut of it.",
  flowNote: "SAT Real Estate is separately licensed as a brokerage and lists here like any other broker. Where a listing is ours, it says so.",
  oneEye: "One exchange",
  oneH: "Everything the market needs, in one place",
  oneP: "Discovery, decision-grade data, AI and the full deal, for occupiers, owners, brokers and investors.",
  feats: [
   ["Listings + map", "Owner-direct stock on a live Riyadh map, each listing showing its own verification state."],
   ["Rent Index", "Decision-grade rents with the capped/open freeze lens."],
   ["Location Intelligence", "Footfall, catchment and co-tenancy. Sourced, not modelled."],
   ["Investment underwriting", "Yield, NOI and scenarios on verified comps."],
   ["AI Advisor", "Conversational search and valuation, grounded in the Index."],
   ["Post a requirement", "Tell the market what you need; owners and brokers respond."],
   ["Owner dashboard", "Listing performance, leads and requirement matches."],
   ["Membership plans", "Grades with clear quota caps."],
   ["Deal tracking", "Enquiry to viewing to offer to handover, with verified parties."],
   ["Compare spaces", "Shortlist side by side on verified facts and rent vs index."],
   ["Trust and compliance", "FAL 1200025510 and a checkable verification layer."],
   ["Market pulse", "The live market board: rent bands by location, supply and pricing discipline vs the index."],
  ] as [string,string][],
  ctaH: "List your space, or find your next one",
  ctaP: "Join the verified exchange built for Riyadh's commercial market.",
  ctaList: "List your space", ctaBrowse: "Browse listings",
 };

 const featLinks = ["/map","/rent-index","/area","/invest","/advisor","/post-requirement","/dashboard","/pricing","/deal","/compare","/about","/market"];
 const featKeys = ["h","a","","h","a","","h","a","","h","","a"];
 const featIcons = [Icon.building, Icon.chart, Icon.target, Icon.coins, Icon.spark, Icon.msg, Icon.grid, Icon.coins, Icon.cal, Icon.bolt, Icon.shield, Icon.activity];
 const cardIcons = [Icon.building, Icon.doc, Icon.chart, Icon.user];
 const f0 = featured[0];
 const rest = featured.slice(1);
 const vtxt = H.verifiedOwner;
 const idxBar = (f: FeaturedListing) => f.idx ? (
  <div className="idxbar"><div className="idxbar-track"><span className="idxbar-mark" style={{ left: Math.round(f.idx.pos * 100) + "%" }} /></div><div className="idxbar-cap" data-v={f.idx.v}>{f.idx.v === "within" ? (H.idxWithin) : f.idx.v === "below" ? (H.idxBelow) : (H.idxAbove)}</div></div>
 ) : null;

 return (
  <div style={{ fontFamily: "var(--sans)", color: "var(--ink)", background: "var(--paper)" }}>
   <div className="satmkt-hero" style={{ position: "relative", padding: "clamp(44px,10vw,70px) 20px clamp(50px,10vw,84px)", overflow: "hidden", backgroundImage: "linear-gradient(180deg, rgba(9,13,19,.9) 0%, rgba(9,13,19,.74) 42%, rgba(9,13,19,.94) 100%), url('/hero-kafd.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}>
    <div style={{ position: "relative", maxWidth: 920, margin: "0 auto", textAlign: "center" }}>
     <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.22)", borderRadius: 20, padding: "6px 13px", backdropFilter: "blur(4px)" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3ECF8E" }} />
      <span className="mono" style={{ fontSize: "var(--fs-2xs)", letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.92)" }}>{T.eyebrow}</span>
     </div>
     <h1 className="serif" style={{ fontSize: "clamp(34px,5.2vw,58px)", fontWeight: 500, lineHeight: 1.08, letterSpacing: "-.02em", margin: "20px auto 0", color: "#fff", maxWidth: 820, textShadow: "0 2px 28px rgba(0,0,0,.45)" }}>
      {T.h1a}<span style={{ color: "#C4DAF2", textShadow: "0 2px 28px rgba(0,0,0,.45)" }}>{T.h1b}</span>
     </h1>
     <p style={{ fontSize: "var(--fs-lg)", lineHeight: 1.6, color: "rgba(255,255,255,.82)", margin: "18px auto 0", maxWidth: 600 }}>{T.sub}</p>
     <div style={{ margin: "30px auto 0", maxWidth: 860, background: "rgba(13,18,26,.55)", border: "1px solid rgba(255,255,255,.16)", borderRadius: 20, backdropFilter: "blur(10px)", padding: "18px 18px 16px", boxShadow: "0 24px 60px rgba(0,0,0,.35)" }}>
      <div style={{ display: "inline-flex", gap: 4, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: 3, marginBottom: 16 }}>
       {T.tabs.map(([v, l]) => (
        <button key={v} type="button" onClick={() => setDeal(v as "lease" | "buy" | "req")} style={{ border: "none", cursor: "pointer", fontSize: "var(--fs-sm)", fontWeight: 600, padding: "7px 16px", borderRadius: 7, background: deal === v ? "#fff" : "transparent", color: deal === v ? "var(--ink)" : "rgba(255,255,255,.78)" }}>{l}</button>
       ))}
      </div>
      {deal !== "req" && (
       <div className="asset-slider" style={{ marginBottom: 16 }}>
        <button type="button" aria-label="Previous asset types" onClick={() => page(-1)} className="asset-arrow" data-hidden={atStart} tabIndex={atStart ? -1 : 0}>
         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div ref={assetRef} className="hero-assets" data-fade={fadePhysical} style={{ display: "flex", flexWrap: "nowrap", gap: 8, overflowX: "auto", paddingBottom: 4, scrollSnapType: "x proximity" }}>
         {ASSETS.map((a) => {
          const on = assetType === a.v;
          return (
           <button key={a.v} type="button" onClick={() => setAssetType(on ? "" : a.v)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: "0 0 auto", minWidth: 88, scrollSnapAlign: "start", padding: "11px 12px 10px", borderRadius: 12, cursor: "pointer", border: "1px solid " + (on ? "rgba(127,168,212,.85)" : "rgba(255,255,255,.1)"), background: on ? "rgba(58,110,165,.24)" : "rgba(255,255,255,.045)", color: "#fff", boxShadow: on ? "0 0 0 1px rgba(58,110,165,.35), 0 6px 16px -8px rgba(58,110,165,.5)" : "none", transition: "background .15s, border-color .15s" }}>
            <span style={{ opacity: on ? 1 : .82 }}>{a.icon}</span>
            <span style={{ fontSize: "var(--fs-xs)", fontWeight: 500, whiteSpace: "nowrap", color: on ? "#fff" : "rgba(255,255,255,.82)" }}>{ar ? a.ar : a.en}</span>
           </button>
          );
         })}
        </div>
        <button type="button" aria-label="Next asset types" onClick={() => page(1)} className="asset-arrow" data-hidden={atEnd} tabIndex={atEnd ? -1 : 0}>
         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
       </div>
      )}
      <div ref={sref} style={{ position: "relative" }}>
      <form onSubmit={go} style={{ display: "flex", alignItems: "stretch", border: "1px solid var(--silver-2)", borderRadius: 13, overflow: "hidden", background: "#fff", boxShadow: "0 6px 20px rgba(0,0,0,.18)" }}>
       <div style={{ display: "flex", alignItems: "center", gap: 11, flex: 1, padding: "0 18px", minWidth: 0 }}>
        <span style={{ color: "var(--azure)", flex: "none" }}><Icon.pin size={20} /></span>
        <input className="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={deal === "req" ? T.phReq : T.phStd} style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: "var(--fs-md)", height: 58, color: "var(--ink)", fontFamily: "var(--sans)", minWidth: 0, textAlign: ar ? "right" : "left" }} />
       </div>
       <button type="submit" className="btn primary" style={{ borderRadius: 0, padding: "0 30px", fontSize: "var(--fs-md)", fontWeight: 600, flex: "none" }}>{deal === "req" ? T.btnReq : T.btnStd}</button>
      </form>
      {sopen && sug.length > 0 && (
       <div style={{ position: "absolute", top: "calc(100% + 6px)", insetInlineStart: 0, insetInlineEnd: 0, background: "#fff", border: "1px solid var(--silver)", borderRadius: 12, boxShadow: "0 14px 36px rgba(20,24,27,.22)", zIndex: 50, overflow: "hidden", textAlign: ar ? "right" : "left" }}>
        {sug.map((o, i) => (
         <button key={i} type="button" onClick={() => { setSopen(false); if (o.did) { const sp = new URLSearchParams(); sp.set("deal", deal === "buy" ? "sale" : "lease"); sp.set("district", o.did); router.push(`/${locale}/listings?${sp.toString()}`); } else { setQ(o.label); } }}
          style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 15px", border: "none", borderTop: i === 0 ? "none" : "1px solid var(--paper)", cursor: "pointer", background: "#fff", color: "var(--ink)", fontSize: "var(--fs-base)", fontFamily: "var(--sans)", textAlign: "inherit" }}>
          <span style={{ color: "var(--harbor)", flex: "none" }}><Icon.pin size={15} /></span>
          <span style={{ fontWeight: 600 }}>{o.label}</span>
          {o.verified ? <span className="mono" style={{ fontSize: "var(--fs-3xs)", color: "var(--green)", border: "1px solid var(--green-line)", background: "var(--green-wash)", borderRadius: 4, padding: "1px 5px", flex: "none" }}>{H.verifiedShort}</span> : null}
          {o.sub ? <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>{o.sub}</span> : null}
         </button>
        ))}
       </div>
      )}
      </div>
      <div style={{ textAlign: "center", marginTop: 12 }}>
       <Link href={L("/post-requirement")} style={{ color: "rgba(255,255,255,.82)", fontSize: "var(--fs-sm)", textDecoration: "underline", textUnderlineOffset: 3 }}>{H.postReqPrompt}</Link>
      </div>
      <div className="row gap8 wrap" style={{ marginTop: 14, justifyContent: "center" }}>
       <span className="tag" style={{ color: "rgba(255,255,255,.6)", background: "transparent", border: "none" }}>{T.popular}</span>
       <Link href={L("/listings?q=KAFD")} className="chip" style={{ textDecoration: "none", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.18)", color: "#fff" }}>{T.chip1}</Link>
       <Link href={L("/listings?q=Tahlia")} className="chip" style={{ textDecoration: "none", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.18)", color: "#fff" }}>{T.chip2}</Link>
       <Link href={L("/listings?q=Industrial")} className="chip" style={{ textDecoration: "none", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.18)", color: "#fff" }}>{T.chip3}</Link>
      </div>
     </div>
     <div className="row gap20 wrap" style={{ marginTop: 22, fontSize: "var(--fs-sm)", color: "rgba(255,255,255,.85)", justifyContent: "center" }}>
      <span className="row gap8"><span style={{ color: "#3ECF8E" }}><Icon.check size={16} /></span> {T.micro1}</span>
      <span className="row gap8"><span style={{ color: "#3ECF8E" }}><Icon.check size={16} /></span> {T.micro2}</span>
      <span className="row gap8"><span style={{ color: "#3ECF8E" }}><Icon.check size={16} /></span> {T.micro3}</span>
     </div>
     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 26, maxWidth: 760, marginInline: "auto" }}>
      {([
        [H.personaNeed, L("/listings")],
        [H.personaHave, L("/list")],
        [H.personaBroker, L("/requirements")],
        [H.personaInvest, L("/listings?deal=sale")],
      ] as [string, string][]).map(([label, href], i) => (
       <Link key={i} href={href} className="card" style={{ padding: "14px 14px", textAlign: "center", textDecoration: "none", color: "var(--ink)", fontWeight: 600, fontSize: "var(--fs-sm)" }}>{label}</Link>
      ))}
     </div>
    </div>
   </div>

   <div className="row" style={{ borderTop: "1px solid var(--silver)", borderBottom: "1px solid var(--silver)", background: "var(--paper)", flexWrap: "wrap" }}>
    {T.stat.filter((x) => x[0]).map((x, i) => (
     <div key={i} className="grow sstat-cell" style={{ padding: "22px 24px", borderRight: "1px solid var(--silver)", textAlign: "center", minWidth: 140 }}>
      <div className="mono tnum" style={{ fontSize: 28, fontWeight: 500, color: "var(--ink)" }}>{x[0]}</div>
      <div className="muted" style={{ fontSize: "var(--fs-sm)", marginTop: 4 }}>{x[1]}</div>
     </div>
    ))}
   </div>

   <div style={{ maxWidth: 1360, margin: "0 auto" }}>

    {f0 && (
     <div style={{ padding: "clamp(44px,7vw,72px) 24px 8px" }}>
      <div className="row between wrap" style={{ alignItems: "flex-end", gap: 12 }}>
       <div><div className="eyebrow">{T.ftEye}</div><h2 className="serif" style={{ fontSize: "clamp(24px,5vw,34px)", fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 0" }}>{T.ftH}</h2></div>
       <Link href={L("/listings")} className="btn ghost" style={{ gap: 7, textDecoration: "none" }}>{T.ftBrowse} <Icon.arrow size={16} /></Link>
      </div>
      <Link href={L(`/listings/${f0.id}`)} className="home-lead lift" style={{ border: "1px solid var(--silver)", borderRadius: 16, overflow: "hidden", background: "var(--paper)", textDecoration: "none", color: "inherit", marginTop: 28, boxShadow: "var(--sh-1)" }}>
       <Ph src={f0.img} label={f0.ph} h={284} badges={[f0.verified ? <Verified key="v" text={vtxt} /> : null, <span key="t" className="tag" style={{ background: "rgba(255,255,255,.9)" }}>{f0.type}</span>].filter(Boolean)} />
       <div style={{ padding: "clamp(24px,3vw,38px)", display: "flex", flexDirection: "column", justifyContent: "center", gap: 11 }}>
        <div style={{ fontFamily: "var(--mono)", fontWeight: 500, fontSize: 28, color: "var(--ink)" }}>{f0.price}<small style={{ fontSize: "var(--fs-sm)", color: "var(--slate)", fontWeight: 400 }}>{T.unit}</small></div>
        <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.01em" }}>{f0.title}</div>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", fontFamily: "var(--mono)", fontSize: "var(--fs-xs)", color: "var(--slate)" }}><span>{f0.district}</span><span>·</span><span>{f0.area}</span><span>·</span><span>{f0.type}</span></div>
        {idxBar(f0)}
        <span style={{ marginTop: 8, fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--azure-d)", display: "inline-flex", alignItems: "center", gap: 7 }}>{H.viewListing} <Icon.arrow size={16} /></span>
       </div>
      </Link>
      <div className="snap-row" style={{ marginTop: 18 }}>
       {rest.map((f) => (
        <Link key={f.id} href={L(`/listings/${f.id}`)} className="listing" style={{ textDecoration: "none", color: "inherit" }}>
         <Ph src={f.img} label={f.ph} h={150} badges={[f.verified ? <Verified key="v" text={vtxt} /> : null, <span key="t" className="tag" style={{ background: "rgba(255,255,255,.9)" }}>{f.type}</span>].filter(Boolean)} />
         <div className="body">
          <div className="row between"><div className="price">{f.price}<small>{T.unit}</small></div><span className="muted2"><Icon.heart size={17} /></span></div>
          <div className="ttl">{f.title}</div>
          <div className="meta"><span>{f.district}</span><i /><span>{f.area}</span><i /><span>{f.type}</span></div>
          {idxBar(f)}
         </div>
        </Link>
       ))}
      </div>
     </div>
    )}

    <div style={{ padding: "clamp(52px,8vw,84px) 24px" }}>
     <div style={{ maxWidth: 1160, margin: "0 auto" }}>
      <div style={{ maxWidth: 560 }}>
       <div className="eyebrow">{T.exEye}</div>
       <h2 className="serif" style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 500, letterSpacing: "-.02em", margin: "14px 0 0" }}>{T.exH}</h2>
       <p className="muted" style={{ fontSize: "var(--fs-lg)", lineHeight: 1.65, marginTop: 16 }}>{T.exP}</p>
      </div>
      <div className="job-grid" style={{ marginTop: 36 }}>
       {T.cards.map((c, i) => {
        const I = cardIcons[i] as (p: { size?: number }) => JSX.Element;
        const st: [string, string] | null =
         i === 0 ? (stats.listings ? [stats.listings, H.statSpacesLive] : null)
         : i === 1 ? (jobs && jobs.reqs != null ? [String(jobs.reqs), H.statOpenReqs] : null)
         : i === 2 ? (jobs && jobs.segs != null ? [String(jobs.segs), H.statSegments] : null)
         : null;
        return (
         <Reveal key={i} delay={i * 90}>
          <Link href={L(c[2])} className="job-card">
           <span className="row between" style={{ alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
             <span className="jc-ic"><I size={22} /></span>
             <span className="mono" style={{ fontSize: "var(--fs-sm)", color: "var(--harbor)", fontWeight: 500 }}>{"0" + (i + 1)}</span>
            </span>
            <span className="jc-arrow"><Icon.arrow size={19} /></span>
           </span>
           <span style={{ display: "block", fontSize: 20, fontWeight: 600, letterSpacing: "-.01em", marginTop: 14 }}>{c[0]}</span>
           <span className="muted" style={{ display: "block", fontSize: "var(--fs-md)", marginTop: 6, lineHeight: 1.55 }}>{c[1]}</span>
           {st && (
            <span className="jc-stat">
             <span className="mono" style={{ fontSize: i === 3 ? 16 : 26, fontWeight: 500, color: "var(--ink)", letterSpacing: i === 3 ? ".02em" : "0" }}>{st[0]}</span>
             <span className="muted" style={{ fontSize: "var(--fs-sm)" }}>{st[1]}</span>
            </span>
           )}
          </Link>
         </Reveal>
        );
       })}
      </div>
     </div>
    </div>

    <div className="hero-band" style={{ margin: "0 24px", borderRadius: 18, background: "var(--ink)", color: "#fff", padding: "clamp(40px,6vw,56px) clamp(28px,5vw,48px)", position: "relative", overflow: "hidden" }}>
     <div className="band-mark" style={{ position: "absolute", right: -20, bottom: -40, opacity: .3 }}><Mark size={300} base="#222A31" lit={HARBOR} /></div>
     <div className="hero-band-grid" style={{ position: "relative", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.05fr)", gap: 48, alignItems: "center" }}>
      <div>
       <div className="eyebrow" style={{ color: "var(--azure-l)" }}>{T.bandEye}{kpis.period ? (ar ? "، " : ", ") + kpis.period : ""}</div>
       <h2 className="serif" style={{ fontSize: "clamp(26px,3.6vw,40px)", fontWeight: 500, letterSpacing: "-.02em", margin: "14px 0 0", color: "#fff" }}>{T.bandH}</h2>
       <p style={{ fontSize: "var(--fs-input)", lineHeight: 1.62, color: "#AEB6C0", margin: "16px 0 22px", maxWidth: 420 }}>{T.bandP1}{stats.districts}{T.bandP2}</p>
       <div className="row gap8 wrap" style={{ marginBottom: 22 }}>
        {bands.map((b, i) => (
         <button key={b.en} type="button" onClick={() => setBi(i)} style={{ cursor: "pointer", fontFamily: "var(--sans)", fontSize: "var(--fs-sm)", fontWeight: 600, padding: "7px 13px", borderRadius: 20, border: "1px solid rgba(255,255,255,.16)", color: i === bi ? "var(--ink)" : "rgba(255,255,255,.8)", background: i === bi ? "#fff" : "transparent", transition: "all .15s ease" }}>{ar ? b.ar : b.en}</button>
        ))}
       </div>
       <Link href={L("/rent-index")} className="btn primary" style={{ textDecoration: "none" }}>{T.bandBtn}</Link>
      </div>
      {band && <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: 24 }}>
       <div className="row between" style={{ alignItems: "flex-start" }}>
        <div><div style={{ fontSize: "var(--fs-sm)", fontWeight: 600 }}>{(ar ? band.ar : band.en) + (H.gradeAOfficeSuffix)}</div><div style={{ fontSize: "var(--fs-xs)", color: "rgba(255,255,255,.5)", marginTop: 2 }}>{T.unit.replace(/^[\s/]+/, "")}</div></div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "1px solid rgba(255,255,255,.18)", color: "rgba(255,255,255,.75)", fontSize: "var(--fs-2xs)", fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>{band.period}</span>
       </div>
       <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 16 }}>
        <span className="mono" style={{ fontSize: 44, fontWeight: 500, lineHeight: 1 }}>{band.median.toLocaleString()}</span>
        <span style={{ fontSize: "var(--fs-sm)", color: "rgba(255,255,255,.55)" }}>{H.medianUnit}</span>
       </div>
       <div style={{ fontSize: "var(--fs-sm)", color: "rgba(255,255,255,.7)", marginTop: 8 }}>{ar ? `النطاق المنشور: ${band.low.toLocaleString()} إلى ${band.high.toLocaleString()}` : `Published band: ${band.low.toLocaleString()} to ${band.high.toLocaleString()}`}</div>
       {/* A year-on-year figure and a rising curve used to sit here. The curve was
           nine hand-placed coordinates in an SVG path, drawn to look like a trend.
           Year-on-year needs two periods of the same series and we have one, so
           neither is shown. */}
       <div className="row between" style={{ borderTop: "1px solid rgba(255,255,255,.1)", marginTop: 16, paddingTop: 14, fontSize: "var(--fs-xs)", color: "rgba(255,255,255,.6)" }}>
        <span>{kpis.source || (ar ? "\u0627\u0644\u0645\u0635\u062f\u0631" : "Source")}</span>
        <span className="mono" style={{ color: "#fff", fontWeight: 500 }}>{kpis.cells > 0 ? `${kpis.cells} ${ar ? "\u062e\u0644\u064a\u0629" : "cells"}` : "\u2014"}</span>
       </div>
      </div>}
     </div>
    </div>

    <div style={{ padding: "clamp(52px,8vw,84px) 24px" }}>
     <div style={{ textAlign: "center" }}>
      <div className="eyebrow">{T.oneEye}</div>
      <h2 className="serif" style={{ fontSize: "clamp(26px,5vw,36px)", fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 6px" }}>{T.oneH}</h2>
      <p className="muted" style={{ fontSize: "var(--fs-md)", maxWidth: 600, margin: "0 auto" }}>{T.oneP}</p>
     </div>
     <div>
      {([[H.tabDiscover, [0, 5, 9, 4]], [H.tabDecide, [1, 11, 2]], [H.tabTransact, [6, 7, 10]]] as [string, number[]][]).map(([gt, idxs], gi) => (
       <div key={gi} style={{ marginTop: gi === 0 ? 36 : 30 }}>
        <div className="row gap10" style={{ alignItems: "center", marginBottom: 14 }}>
         <span className="eyebrow">{gt}</span>
         <span style={{ flex: 1, height: 1, background: "var(--silver)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(232px,1fr))", gap: 16 }}>
         {idxs.map((fi) => { const m = T.feats[fi]; const I = featIcons[fi] as (p: { size?: number }) => JSX.Element; const k = featKeys[fi]; return (
          <Link key={fi} href={L(featLinks[fi])} className="feat-card" style={{ textDecoration: "none", color: "inherit" }}>
           <span className={"feat-ic" + (k === "a" ? " a" : k === "h" ? "" : " s")}><I size={20} /></span>
           <div className="feat-h">{m[0]}</div>
           <div className="feat-p">{m[1]}</div>
          </Link>
         ); })}
        </div>
       </div>
      ))}
     </div>
    </div>

    <div style={{ padding: "clamp(44px,7vw,64px) clamp(20px,5vw,40px) clamp(40px,8vw,64px)" }}>
     <div className="eyebrow" style={{ textAlign: "center" }}>{T.flowEye}</div>
     <h2 className="serif" style={{ fontSize: "clamp(24px,5vw,32px)", fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 34px", textAlign: "center" }}>{T.flowH}</h2>
     <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="card pad" style={{ textAlign: "center" }}>
       <div style={{ fontSize: "var(--fs-lg)", lineHeight: 1.65 }}>{T.flowBody}</div>
       <div className="muted" style={{ fontSize: "var(--fs-base)", lineHeight: 1.6, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>{T.flowNote}</div>
      </div>
     </div>
    </div>

    <div style={{ padding: "8px 24px 64px" }}>
     <div style={{ borderRadius: 18, background: "linear-gradient(120deg,var(--azure) 0%,var(--azure-d) 100%)", color: "#fff", padding: "clamp(34px,7vw,52px) clamp(22px,6vw,40px)", textAlign: "center" }}>
      <h2 className="serif" style={{ fontSize: "clamp(25px,5.4vw,34px)", fontWeight: 500, letterSpacing: "-.02em", margin: 0, color: "#fff" }}>{T.ctaH}</h2>
      <p style={{ fontSize: "var(--fs-input)", color: "rgba(255,255,255,.85)", margin: "14px auto 26px", maxWidth: 480 }}>{T.ctaP}</p>
      <div className="row gap12 center wrap">
       <Link href={L("/dashboard")} className="btn lg" style={{ background: "#fff", color: "var(--azure-d)", textDecoration: "none" }}>{T.ctaList}</Link>
       <Link href={L("/find")} className="btn lg" style={{ background: "#fff", color: "var(--ink)", textDecoration: "none" }}>{H.findSpace}</Link>
       <Link href={L("/listings")} className="btn lg" style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,.5)", textDecoration: "none" }}>{T.ctaBrowse}</Link>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
