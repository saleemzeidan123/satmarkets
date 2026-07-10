"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mark, Logo, Icon, Ph, Verified, HARBOR, COOL } from "@/components/satkit";
import Reveal from "@/components/Reveal";

export type FeaturedListing = { id: string; price: string; title: string; district: string; area: string; type: string; verified: boolean; ph: string; img?: string; idx?: { v: "below" | "within" | "above"; pos: number } | null };
export type HeroBand = { en: string; ar: string; low: number; high: number; median: number; period: string };
type Stats = { listings: string; buildings: string; districts: string; verifiedPct: string };

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

export default function MarketingHome({ locale = "en", featured = [], stats, bands = [], jobs }: { locale?: string; featured?: FeaturedListing[]; stats: Stats; bands?: HeroBand[]; jobs?: { reqs: number | null; segs: number | null } }) {
 const router = useRouter();
 const ar = locale === "ar";
 const [deal, setDeal] = useState<"lease" | "buy" | "req">("lease");
 const [bi, setBi] = useState(0);
 const band = bands[bi] || bands[0] || null;
 const [q, setQ] = useState("");
 const [assetType, setAssetType] = useState("");
 const [showAll, setShowAll] = useState(false);
 const [sug, setSug] = useState<{ label: string; sub: string; did?: string; verified?: boolean }[]>([]);
 const [sopen, setSopen] = useState(false);
 const sref = useRef<HTMLDivElement>(null);
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
  eyebrow: "منصّة تجارية متوافقة مع الهيئة العامة للعقار",
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
  micro1: "توثيق المُلّاك قبل الإدراج", micro2: "لا عمولة مفترضة", micro3: "مرخّصة من الهيئة العامة للعقار ومتوافقة مع نظام حماية البيانات",
  stat: [[stats.listings, "عروض موثّقة"], [stats.verifiedPct, "موثّقة من المالك"], [stats.districts, "أحياء مفهرسة"], ["1", "منصّة محايدة"]] as [string,string][],
  exEye: "المنصّة",
  exH: "أربع وظائف، في مكان محايد واحد",
  exP: "لا أحد غيرنا في المملكة يجمع الوظائف الأربع معاً. هذا هو جوهر المنصّة.",
  cards: [
   ["عروض موثّقة", "مباشرة من المالك الموثّق، أو من SAT بموجب تفويض. لا عروض وسطاء غير موثّقة.", "/listings"],
   ["الطلبات", "يدرج المستأجرون ما يحتاجونه، فيأتيهم العرض المناسب.", "/post-requirement"],
   ["مؤشر الإيجارات", "أسعار تُعتمد للقرار وبيانات النطاق. كل رقم موثّق المصدر.", "/rent-index"],
   ["التمثيل", "خيار صريح بالاختيار. ولا عمولة مدمجة في أي عرض.", "/dashboard"],
  ] as [string,string,string][],
  ftEye: "مختارة، الرياض",
  ftH: "مساحات موثّقة، بأسعار في سياقها",
  ftBrowse: "تصفّح كل العروض",
  unit: " ريال/م²·سنة",
  bandEye: "مؤشر الإيجارات، الربع الأول 2026",
  bandH: "طبقة التسعير خلف كل قرار",
  bandP1: "معايير الربع الأول 2026 المنشورة، منسوبة إلى مصادرها، عبر ", bandP2: " موقعاً بالرياض. قِس إيجاراً، أو حدّد نطاقاً، أو قيّم عقد إيجار. موثّقة المصدر، لا تقديرات.",
  bandBtn: "استكشف مؤشر الإيجارات",
  bandStat: [["+2.1%", "الفئة A بالرياض، سنوياً (منشور)"], ["2,370", "وسيط الفئة A ريال/م²·سنة"], ["97.7%", "إشغال الفئة A"]] as [string,string][],
  flowEye: "كيف تسير الصفقة",
  flowH: "التمثيل دائماً خيارك الصريح",
  pathATag: "المسار أ، مجاني",
  pathATitle: "تواصل مع المُدرِج مباشرة",
  pathADesc: "خدمة ذاتية ومجانية. لا تفويض، لا رسوم، لا عمولة مفترضة. هكذا تعمل غالبية المنصّة.",
  pathBTag: "المسار ب، اختياري",
  pathBTitle: "وكّل SAT العقارية لتمثيلك",
  pathBDesc: "تفويض صريح عندما تريد وسطاء SAT العقارية المرخّصين إلى جانبك. شروط واضحة، يُتفق عليها قبل أي رسوم.",
  pathBLink: "تحدّث إلى SAT العقارية ←",
  oneEye: "منصّة واحدة",
  oneH: "كل ما يحتاجه السوق، في مكان واحد",
  oneP: "الاكتشاف، وبيانات تُعتمد للقرار، والذكاء الاصطناعي، والصفقة كاملة، للمستأجرين والمُلّاك والوسطاء والمستثمرين.",
  feats: [
   ["عروض موثّقة + خريطة", "عروض مدقّقة بالتراخيص ورخصة فال على خريطة مباشرة للرياض."],
   ["مؤشر الإيجارات", "إيجارات تُعتمد للقرار، مع تمييز العقود المسقوفة والمفتوحة."],
   ["ذكاء الموقع", "الحركة والنطاق والجوار التجاري. موثّقة المصدر، لا مُقدّرة."],
   ["تحليل الاستثمار", "العائد وصافي الدخل التشغيلي والسيناريوهات على مقارنات موثّقة."],
   ["المستشار الذكي", "بحث وتقييم حواري، مبني على المؤشر."],
   ["أدرج طلباً", "أخبر السوق بما تحتاجه، فيستجيب المُلّاك والوسطاء."],
   ["لوحة المالك", "أداء العروض، والعملاء المحتملون، ومطابقات الطلبات."],
   ["باقات العضوية", "فئات بحدود واضحة للحصص، وفوترة متوافقة مع هيئة الزكاة والضريبة والجمارك."],
   ["تتبّع الصفقة", "من الاستفسار إلى المعاينة إلى العرض إلى التسليم، بأطراف موثّقة."],
   ["قارن المساحات", "قائمة مختصرة جنباً إلى جنب على حقائق موثّقة والإيجار مقابل المؤشر."],
   ["الثقة والامتثال", "الهيئة العامة للعقار، ونظام حماية البيانات، ومكافحة غسل الأموال، وطبقة توثيق قابلة للتحقّق."],
   ["نبض السوق", "لوحة السوق الحيّة: نطاقات الإيجار حسب الموقع، والمعروض، وانضباط التسعير مقابل المؤشر."],
  ] as [string,string][],
  ctaH: "أدرج مساحتك، أو اعثر على التالية",
  ctaP: "انضمّ إلى المنصّة الموثّقة المبنية للسوق التجاري في الرياض.",
  ctaList: "أدرج مساحتك", ctaBrowse: "تصفّح العروض",
 } : {
  eyebrow: "REGA-native commercial exchange",
  h1a: "Where Saudi business finds ",
  h1b: "verified commercial space",
  sub: "Offices, retail, medical and warehouses across Riyadh. Owner-verified, permit-backed, decision-grade pricing, one neutral exchange.",
  tabs: [["lease","Lease"],["buy","Buy"]] as const,
  phReq: "What space are you looking for?",
  phStd: "District, project or building",
  btnReq: "Post",
  btnStd: "Search",
  popular: "Popular:",
  chip1: "Office, KAFD", chip2: "Retail, Tahlia", chip3: "Warehouse, 2nd Industrial",
  micro1: "Owners verified before listing", micro2: "No assumed commission", micro3: "REGA-licensed & PDPL-compliant",
  stat: [[stats.listings, "Verified listings"], [stats.verifiedPct, "Owner-verified"], [stats.districts, "Districts indexed"], ["1", "Neutral exchange"]] as [string,string][],
  exEye: "The exchange",
  exH: "Four jobs, one neutral place",
  exP: "No one else in the Kingdom brings all four together. That is the exchange.",
  cards: [
   ["Verified listings", "Direct from the verified owner, or SAT under mandate. No unverified broker listings.", "/listings"],
   ["Requirements", "Occupiers post what they need; the right supply comes to them.", "/post-requirement"],
   ["Rent Index", "Decision-grade pricing and catchment data. Every figure sourced.", "/rent-index"],
   ["Representation", "An explicit, opt-in choice. Never a commission baked into a listing.", "/dashboard"],
  ] as [string,string,string][],
  ftEye: "Featured, Riyadh",
  ftH: "Verified spaces, priced in context",
  ftBrowse: "Browse all listings",
  unit: " SAR/m²·yr",
  bandEye: "Rent Index, Q1 2026",
  bandH: "The pricing layer behind every decision",
  bandP1: "Published Q1 2026 benchmarks, attributed to source, across ", bandP2: " Riyadh locations. Benchmark a rent, size a catchment, or value a lease. Sourced, never estimated.",
  bandBtn: "Explore the Rent Index",
  bandStat: [["+2.1%", "Riyadh Grade A, YoY (published)"], ["2,370", "Grade A median SAR/m²·yr"], ["97.7%", "Grade A occupancy"]] as [string,string][],
  flowEye: "How a deal flows",
  flowH: "Representation is always your explicit choice",
  pathATag: "Path A, Free",
  pathATitle: "Contact the lister directly",
  pathADesc: "Self-serve and free. No mandate, no fee, no assumed commission. Most of the exchange runs this way.",
  pathBTag: "Path B, Opt-in",
  pathBTitle: "Appoint SAT Real Estate to represent you",
  pathBDesc: "An explicit mandate when you want SAT Real Estate's licensed brokers at the table. Clear terms, agreed before any fee applies.",
  pathBLink: "Talk to SAT Real Estate →",
  oneEye: "One exchange",
  oneH: "Everything the market needs, in one place",
  oneP: "Discovery, decision-grade data, AI and the full deal, for occupiers, owners, brokers and investors.",
  feats: [
   ["Verified listings + map", "Permit and FAL-checked stock on a live Riyadh map."],
   ["Rent Index", "Decision-grade rents with the capped/open freeze lens."],
   ["Location Intelligence", "Footfall, catchment and co-tenancy. Sourced, not modelled."],
   ["Investment underwriting", "Yield, NOI and scenarios on verified comps."],
   ["AI Advisor", "Conversational search and valuation, grounded in the Index."],
   ["Post a requirement", "Tell the market what you need; owners and brokers respond."],
   ["Owner dashboard", "Listing performance, leads and requirement matches."],
   ["Membership plans", "Grades with clear quota caps; ZATCA invoicing."],
   ["Deal tracking", "Enquiry to viewing to offer to handover, with verified parties."],
   ["Compare spaces", "Shortlist side by side on verified facts and rent vs index."],
   ["Trust and compliance", "REGA, PDPL, AML and a checkable verification layer."],
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
 const vtxt = ar ? "موثّق من المالك" : "Verified owner";
 const idxBar = (f: FeaturedListing) => f.idx ? (
  <div className="idxbar"><div className="idxbar-track"><span className="idxbar-mark" style={{ left: Math.round(f.idx.pos * 100) + "%" }} /></div><div className="idxbar-cap" data-v={f.idx.v}>{f.idx.v === "within" ? (ar ? "ضمن نطاق المؤشر" : "Within the Rent Index band") : f.idx.v === "below" ? (ar ? "أقل من نطاق المؤشر" : "Below the index band") : (ar ? "أعلى من نطاق المؤشر" : "Above the index band")}</div></div>
 ) : null;

 return (
  <div style={{ fontFamily: "var(--sans)", color: "var(--ink)", background: "var(--paper)" }}>
   <div className="satmkt-hero" style={{ position: "relative", padding: "clamp(44px,10vw,70px) 20px clamp(50px,10vw,84px)", overflow: "hidden", backgroundImage: "linear-gradient(180deg, rgba(11,15,21,.82) 0%, rgba(11,15,21,.55) 44%, rgba(11,15,21,.9) 100%), url('/hero-kafd.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}>
    <div style={{ position: "relative", maxWidth: 920, margin: "0 auto", textAlign: "center" }}>
     <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.22)", borderRadius: 20, padding: "6px 13px", backdropFilter: "blur(4px)" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3ECF8E" }} />
      <span className="mono" style={{ fontSize: "var(--fs-2xs)", letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.92)" }}>{T.eyebrow}</span>
     </div>
     <h1 className="serif" style={{ fontSize: "clamp(34px,5.2vw,58px)", fontWeight: 500, lineHeight: 1.05, letterSpacing: "-.02em", margin: "20px auto 0", color: "#fff", maxWidth: 820 }}>
      {T.h1a}<span style={{ color: "#9DBBD6" }}>{T.h1b}</span>
     </h1>
     <p style={{ fontSize: "var(--fs-lg)", lineHeight: 1.6, color: "rgba(255,255,255,.82)", margin: "18px auto 0", maxWidth: 600 }}>{T.sub}</p>
     <div style={{ margin: "30px auto 0", maxWidth: 860, background: "rgba(13,18,26,.55)", border: "1px solid rgba(255,255,255,.16)", borderRadius: 20, backdropFilter: "blur(10px)", padding: "18px 18px 16px", boxShadow: "0 24px 60px rgba(0,0,0,.35)" }}>
      <div style={{ display: "inline-flex", gap: 4, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: 3, marginBottom: 16 }}>
       {T.tabs.map(([v, l]) => (
        <button key={v} type="button" onClick={() => setDeal(v as "lease" | "buy" | "req")} style={{ border: "none", cursor: "pointer", fontSize: "var(--fs-sm)", fontWeight: 600, padding: "7px 16px", borderRadius: 7, background: deal === v ? "#fff" : "transparent", color: deal === v ? "var(--ink)" : "rgba(255,255,255,.78)" }}>{l}</button>
       ))}
      </div>
      {deal !== "req" && (
       <div className="hero-assets" style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(showAll ? ASSETS : ASSETS.slice(0, 5)).map((a) => {
         const on = assetType === a.v;
         return (
          <button key={a.v} type="button" onClick={() => setAssetType(on ? "" : a.v)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: "1 1 0", minWidth: 0, padding: "12px 6px", borderRadius: 12, cursor: "pointer", border: "1px solid " + (on ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.12)"), background: on ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.04)", color: "#fff", transition: "all .12s ease" }}>
           <span style={{ opacity: on ? 1 : .85 }}>{a.icon}</span>
           <span style={{ fontSize: "var(--fs-xs)", fontWeight: 500, color: "rgba(255,255,255,.92)" }}>{ar ? a.ar : a.en}</span>
          </button>
         );
        })}
        <button type="button" onClick={() => setShowAll((v) => !v)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: "1 1 0", minWidth: 0, padding: "12px 6px", borderRadius: 12, cursor: "pointer", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: "#fff", transition: "all .12s ease" }}>
         <span style={{ opacity: .85 }}><Icon.grid size={22} /></span>
         <span style={{ fontSize: "var(--fs-xs)", fontWeight: 500, color: "rgba(255,255,255,.92)" }}>{showAll ? (ar ? "أقل" : "Less") : (ar ? "المزيد" : "More")}</span>
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
          {o.verified ? <span className="mono" style={{ fontSize: "var(--fs-3xs)", color: "var(--green)", border: "1px solid var(--green-line)", background: "var(--green-wash)", borderRadius: 4, padding: "1px 5px", flex: "none" }}>{ar ? "موثّق" : "verified"}</span> : null}
          {o.sub ? <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>{o.sub}</span> : null}
         </button>
        ))}
       </div>
      )}
      </div>
      <div style={{ textAlign: "center", marginTop: 12 }}>
       <Link href={L("/post-requirement")} style={{ color: "rgba(255,255,255,.82)", fontSize: "var(--fs-sm)", textDecoration: "underline", textUnderlineOffset: 3 }}>{ar ? "لم تجد ما تريد؟ أدرج طلبك" : "Didn't find it? Post a requirement"}</Link>
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
        [ar ? "أبحث عن مساحة" : "I need a space", L("/listings")],
        [ar ? "عندي مساحة أعرضها" : "I have a space to list", L("/list")],
        [ar ? "أنا وسيط مرخّص" : "I am a licensed broker", L("/requirements")],
        [ar ? "أستثمر" : "I invest", L("/listings?deal=sale")],
      ] as [string, string][]).map(([label, href], i) => (
       <Link key={i} href={href} className="card" style={{ padding: "14px 14px", textAlign: "center", textDecoration: "none", color: "var(--ink)", fontWeight: 600, fontSize: "var(--fs-sm)" }}>{label}</Link>
      ))}
     </div>
    </div>
   </div>

   <div className="row" style={{ borderTop: "1px solid var(--silver)", borderBottom: "1px solid var(--silver)", background: "var(--paper)", flexWrap: "wrap" }}>
    {T.stat.map((x, i) => (
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
        <span style={{ marginTop: 8, fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--azure-d)", display: "inline-flex", alignItems: "center", gap: 7 }}>{ar ? "اعرض التفاصيل" : "View listing"} <Icon.arrow size={16} /></span>
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
         i === 0 ? [stats.listings, ar ? "مساحة موثّقة، مباشرة الآن" : "verified spaces live now"]
         : i === 1 ? (jobs && jobs.reqs != null ? [String(jobs.reqs), ar ? "طلبات مفتوحة أمام السوق" : "open requirements on the board"] : null)
         : i === 2 ? (jobs && jobs.segs != null ? [String(jobs.segs), ar ? "شريحة مؤشر ببيانات كافية" : "index segments with sufficient data"] : null)
         : ["FAL 1200025510", ar ? "مرخّصة من الهيئة، بتفويض صريح فقط" : "REGA-licensed, opt-in only"];
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
       <div className="eyebrow" style={{ color: "var(--azure-l)" }}>{T.bandEye}</div>
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
        <div><div style={{ fontSize: "var(--fs-sm)", fontWeight: 600 }}>{(ar ? band.ar : band.en) + (ar ? "، مكاتب الفئة A" : ", Grade A office")}</div><div style={{ fontSize: "var(--fs-xs)", color: "rgba(255,255,255,.5)", marginTop: 2 }}>{T.unit.replace(/^[\s/]+/, "")}</div></div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "1px solid rgba(255,255,255,.18)", color: "rgba(255,255,255,.75)", fontSize: "var(--fs-2xs)", fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>{ar ? "الربع الأول 2026" : band.period}</span>
       </div>
       <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 16 }}>
        <span className="mono" style={{ fontSize: 44, fontWeight: 500, lineHeight: 1 }}>{band.median.toLocaleString()}</span>
        <span style={{ fontSize: "var(--fs-sm)", color: "rgba(255,255,255,.55)" }}>{ar ? "الوسيط، ريال/م²·سنة" : "median SAR/m²·yr"}</span>
       </div>
       <div style={{ fontSize: "var(--fs-sm)", color: "rgba(255,255,255,.7)", marginTop: 8 }}>{ar ? `النطاق المنشور: ${band.low.toLocaleString()} إلى ${band.high.toLocaleString()}` : `Published band: ${band.low.toLocaleString()} to ${band.high.toLocaleString()}`}</div>
       <div style={{ color: "#34d399", fontSize: "var(--fs-sm)", fontWeight: 600, marginTop: 8 }}>{T.bandStat[0][0]} · {T.bandStat[0][1]}</div>
       <svg viewBox="0 0 480 110" width="100%" style={{ marginTop: 16, display: "block" }} preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 86 L60 80 L120 84 L180 64 L240 68 L300 46 L360 50 L420 28 L480 18 L480 110 L0 110 Z" fill="rgba(52,211,153,.12)" />
        <path d="M0 86 L60 80 L120 84 L180 64 L240 68 L300 46 L360 50 L420 28 L480 18" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="480" cy="18" r="4" fill="#34d399" />
       </svg>
       <div className="row between" style={{ borderTop: "1px solid rgba(255,255,255,.1)", marginTop: 16, paddingTop: 14, fontSize: "var(--fs-xs)", color: "rgba(255,255,255,.6)" }}>
        <span>{ar ? "إشغال الفئة A بالرياض" : "Riyadh Grade A occupancy"}</span><span className="mono" style={{ color: "#fff", fontWeight: 500 }}>{T.bandStat[2][0]}</span>
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
      {([[ar ? "اكتشف" : "Discover", [0, 5, 9, 4]], [ar ? "قرّر بالأرقام" : "Decide with data", [1, 11, 2]], [ar ? "نفّذ بثقة" : "Transact with trust", [6, 7, 10]]] as [string, number[]][]).map(([gt, idxs], gi) => (
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
     <div className="row gap20 wrap" style={{ maxWidth: 940, margin: "0 auto", alignItems: "stretch" }}>
      <div className="card pad grow" style={{ minWidth: 280 }}>
       <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>{T.pathATag}</span>
       <div style={{ fontSize: 19, fontWeight: 600, margin: "14px 0 8px" }}>{T.pathATitle}</div>
       <div className="muted" style={{ fontSize: "var(--fs-base)", lineHeight: 1.6 }}>{T.pathADesc}</div>
      </div>
      <a href="https://satestate.com/contact" target="_blank" rel="noopener noreferrer" className="card pad grow lift" style={{ borderColor: "var(--harbor)", minWidth: 280, textDecoration: "none", color: "inherit", display: "block" }}>
       <span className="tag" style={{ color: "var(--harbor)", background: "rgba(58,110,165,.08)", borderColor: "rgba(58,110,165,.3)" }}>{T.pathBTag}</span>
       <div style={{ fontSize: 19, fontWeight: 600, margin: "14px 0 8px" }}>{T.pathBTitle}</div>
       <div className="muted" style={{ fontSize: "var(--fs-base)", lineHeight: 1.6 }}>{T.pathBDesc}</div>
       <div style={{ marginTop: 12, fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--harbor)" }}>{T.pathBLink}</div>
      </a>
     </div>
    </div>

    <div style={{ padding: "8px 24px 64px" }}>
     <div style={{ borderRadius: 18, background: "linear-gradient(120deg,var(--azure) 0%,var(--azure-d) 100%)", color: "#fff", padding: "clamp(34px,7vw,52px) clamp(22px,6vw,40px)", textAlign: "center" }}>
      <h2 className="serif" style={{ fontSize: "clamp(25px,5.4vw,34px)", fontWeight: 500, letterSpacing: "-.02em", margin: 0, color: "#fff" }}>{T.ctaH}</h2>
      <p style={{ fontSize: "var(--fs-input)", color: "rgba(255,255,255,.85)", margin: "14px auto 26px", maxWidth: 480 }}>{T.ctaP}</p>
      <div className="row gap12 center wrap">
       <Link href={L("/dashboard")} className="btn lg" style={{ background: "#fff", color: "var(--azure-d)", textDecoration: "none" }}>{T.ctaList}</Link>
       <Link href={L("/find")} className="btn lg" style={{ background: "#fff", color: "var(--ink)", textDecoration: "none" }}>{ar ? "اعثر على مساحتك" : "Find your space"}</Link>
       <Link href={L("/listings")} className="btn lg" style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,.5)", textDecoration: "none" }}>{T.ctaBrowse}</Link>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
