"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mark, Logo, Icon, HARBOR, COOL } from "@/components/satkit";
import Reveal from "@/components/Reveal";
// PKG-CARD1. This file used to hand-roll its own lead and grid card markup,
// which is how its price caption came to run the lease unit ("SAR/m²/yr")
// under a listing whose deal_type is sale: the four figures shown here never
// passed through `priceParts`, so nothing here could know the unit disagreed
// with the deal. Finding 173's decorative-heart defect (no handler on the
// heart icon) was an earlier symptom of the same private markup. `ListingCard`
// is now the one place a listing becomes a card; this file only decides which
// listing goes in the lead slot and which go in the row beside it.
import ListingCard, { type IndexPosition } from "@/components/ListingCard";
import type { Listing } from "@/lib/types";
import { getDictionary } from "@/i18n/getDictionary";
import { formatPeriod } from "@/lib/market/period";
// RC12, finding 164. The asset rail pages by animating a scroll, which the CSS
// reduced-motion block cannot reach while the behaviour is stated explicitly.
import { scrollBehavior } from "@/lib/motion";
// PKG-FIG2 closure, finding 132. Type only, so nothing server-side is pulled
// into the client bundle. The prop used to restate this shape by hand, which
// is how it came to say `stat: "average" | "median" | null` over a producer
// that can also answer "single", "count", "range", "rate" or "index". A second
// copy of a type is the same defect as a second copy of a unit table.
import type { PublishedKpis } from "@/lib/market/published";
import { fill, formatInteger, formatRange, formatUnit } from "@/lib/format";

// PKG-CARD1. This used to flatten and pre-format every figure a card needs
// (price, title, district, area, badge text) into its own literal shape, which
// is the second place those figures were ever computed: `page.tsx` built them
// from the raw row, and this file trusted whatever it was handed rather than
// reading the row itself. That is exactly how the lease unit ended up under a
// sale price. The wrapper now carries the row `ListingCard` already knows how
// to read, plus the one fact that is genuinely this page's own decision and
// not the card's: where this listing's rent sits in the published band.
export type FeaturedListing = { listing: Listing; indexPosition: IndexPosition | null };
// PKG-FIG2 closure, finding 130. `stat` is the statistic the row itself records,
// already resolved into the reader's language by the server, for the same reason
// `bandNotes` is a prop: the decision is a server one and a client that could
// re-derive it could also re-derive it wrongly. It is not optional and it has no
// default, so a caller cannot obtain a band without saying what the figure is.
export type HeroBand = { en: string; ar: string; low: number; high: number; median: number; period: string; stat: string };
type Stats = { listings: string | null; buildings: string | null; districts: string | null; verifiedPct: string | null };

const ASSETS = [
 { v: "office", en: "Office", ar: "مكاتب", icon: <Icon.building size={22} /> },
 { v: "retail", en: "Retail", ar: "تجزئة", icon: <Icon.store size={22} /> },
 { v: "warehouse", en: "Warehouse", ar: "مستودعات", icon: <Icon.layers size={22} /> },
 { v: "medical", en: "Medical", ar: "طبي", icon: <Icon.activity size={22} /> },
 { v: "land", en: "Land", ar: "أراضِ", icon: <Icon.ruler size={22} /> },
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

// ADV-1E. `bandNotes` carries the sentences the server's quote decision attached
// to the figures in `bands`. It is a prop rather than a lookup because this
// component is a client component and the decision is a server one: a client
// that could re-derive the sentence could also re-derive it wrongly, and the
// figure and its sentence must come from the same place.
export default function MarketingHome({ locale = "en", featured = [], stats, bands = [], bandNotes = [], jobs, kpis }: { locale?: string; featured?: FeaturedListing[]; stats: Stats; bands?: HeroBand[]; bandNotes?: readonly string[]; jobs?: { reqs: number | null; segs: number | null }; kpis: PublishedKpis }) {
 const router = useRouter();
 const ar = locale === "ar";
 // PKG-FIG1, finding 125. These three figures are the published Rent Index band,
 // and they were rendered with a bare `toLocaleString()`, which resolves the
 // DEVICE locale in a client component. On a phone set to Arabic the front door
 // of the site printed the attributed published band in Arabic-Indic digits,
 // against the standing law that both languages use Western numerals. Same
 // defect as finding 123, on the one page every visitor sees first.
 const fig = (n: number) => formatInteger(Math.round(n), ar ? "ar" : "en");
 const H = getDictionary(ar ? "ar" : "en").home;
 // PKG-FIG2 closure, finding 132. The pattern that puts a quantity word beside
 // a unit is one sentence shape used by the front door, the Rent Index and the
 // listings index cut. A second copy under `home` would be the second table this
 // package exists to remove.
 const C = getDictionary(ar ? "ar" : "en").common;
 // PKG-FIG2, finding 129. The lease unit was spelled twice in this file's own
 // copy objects, once per language. The Arabic spelling happened to match the
 // table; the English one, " SAR/m²·yr", did not, and it was live on the front
 // door six times: on the band panel, on the band caption and on three featured
 // price cards. It is the first screen of the site, so it was the most-read
 // wrong spelling of the platform's most-used unit.
 //
 // The leading space each literal carried was structural rather than
 // typographic, which is why the band caption had to strip it back off with
 // `.replace(/^[\s/]+/, "")`. The space belongs to the JSX that needs it.
 const unitShort = formatUnit("sar_sqm_year", ar ? "ar" : "en", "short");
 const [deal, setDeal] = useState<"lease" | "buy" | "req">("lease");
 const [bi, setBi] = useState(0);
 const band = bands[bi] || bands[0] || null;
 const [q, setQ] = useState("");
 const [assetType, setAssetType] = useState("");
 const [sug, setSug] = useState<{ label: string; sub: string; did?: string; indexed?: boolean }[]>([]);
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
 const page = (d: number) => { const el = assetRef.current; if (!el) return; const amount = Math.round(el.clientWidth * 0.7); el.scrollBy({ left: (ar ? -d : d) * amount, behavior: scrollBehavior() }); };
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
  h1b: "مساحات تجارية يمكن التحقق منها",
  sub: "مكاتب ومتاجر وعيادات ومستودعات في الرياض. لكل عرض حالة توثيقه، ونطاقات إيجار منشورة منسوبة إلى مصادرها، في منصّة محايدة واحدة.",
  tabs: [["lease","إيجار"],["buy","شراء"]] as const,
  phReq: "ما المساحة التي تبحث عنها؟",
  phStd: "الحي أو المشروع أو المبنى",
  btnReq: "أدرج",
  btnStd: "بحث",
  popular: "الأكثر طلباً:",
  chip1: "مكاتب، كافد", chip2: "تجزئة، التحلية", chip3: "مستودعات، الصناعية الثانية",
  micro1: "عند الإطلاق، يُفحص المُلّاك قبل الإدراج", micro2: "لا عمولة مفترضة", micro3: "فال 1200025510",
  stat: [[stats.listings, "عروض منشورة"], [stats.verifiedPct, "موثّقة من المالك"], [stats.districts, "أحياء مفهرسة"], [stats.buildings, "مبانِ"]] as [string | null, string][],
  exEye: "المنصّة",
  exH: "أربع وظائف، في مكان محايد واحد",
  exP: "الاكتشاف، والطلبات، والأسعار المنشورة، ومستشار يذكر مصدره، في مكان محايد واحد.",
  cards: [
   ["العروض", "مباشرة من المالك أو من وسيط مرخّص. لكل عرض حالة توثيقه ظاهرة عليه.", "/listings"],
   ["الطلبات", "يدرج المستأجرون ما يحتاجونه، فيأتيهم العرض المناسب.", "/post-requirement"],
   ["مؤشر الإيجارات", "نطاقات إيجار منشورة من المؤشر الإيجاري للهيئة العامة للعقار (إيجار)، مع الفترة والمصدر على كل رقم.", "/rent-index"],
   ["المستشار الذكي", "بحث وتقييم بالمحادثة، مستند إلى مؤشر الإيجارات.", "/advisor"],
  ] as [string,string,string][],
  ftEye: "مختارة، الرياض",
  ftH: "مساحات معروضة، مقارنة بالنطاق المنشور",
  ftBrowse: "تصفّح كل العروض",
  bandEye: "مؤشر الإيجارات",
  bandH: "طبقة التسعير خلف كل قرار",
  bandP1: "المعايير المنشورة، منسوبة إلى مصادرها، عبر ", bandP2: " موقعاً بالرياض. قِس إيجاراً، أو قارن عقداً بالنطاق. كل رقم يحمل فترته ومصدره.",
  bandBtn: "استكشف مؤشر الإيجارات",
  flowEye: "كيف تسير الصفقة",
  flowH: "مسار واحد. تتعامل مع المعلن مباشرة.",
  flowBody: "تواصل مع المعلن مباشرة. مجاناً، ودون تفويض، ودون عمولة. سات ماركتس ليست طرفاً في الصفقة ولا تأخذ منها أي نسبة.",
  flowNote: "شركة سات العقارية مرخّصة للوساطة بشكل منفصل، وتنشر إعلاناتها هنا كأي وسيط آخر. وحين يكون الإعلان لها، يُذكر ذلك بوضوح.",
  oneEye: "منصّة واحدة",
  oneH: "كل ما يحتاجه السوق، في مكان واحد",
  oneP: "الاكتشاف، والبيانات المنشورة، والذكاء الاصطناعي، والصفقة كاملة، للمستأجرين والمُلّاك والوسطاء والمستثمرين.",
  feats: [
   ["عروض وخريطة", "عروض مباشرة من الملّاك على خريطة حيّة للرياض، ولكل عرض حالة توثيقه ظاهرة عليه."],
   ["مؤشر الإيجارات", "نطاقات إيجار منشورة، مع تمييز العقود المسقوفة والمفتوحة."],
   ["ذكاء الموقع", "الجوار التجاري والمحيط من سجل المنصّة. بيانات الحركة والزيارات غير مفعّلة."],
   ["تحليل الاستثمار", "العائد وصافي الدخل التشغيلي والسيناريوهات على مقارنات توضيحية."],
   ["المستشار الذكي", "بحث وتقييم حواري، مبني على المؤشر."],
   ["أدرج طلباً", "أخبر السوق بما تحتاجه، فيستجيب المُلّاك والوسطاء."],
   ["لوحة المالك", "أداء العروض، والعملاء المحتملون، ومطابقات الطلبات."],
   ["باقات العضوية", "فئات بحدود واضحة للحصص."],
   ["تتبّع الصفقة", "من الاستفسار إلى المعاينة إلى العرض إلى التسليم، مسجّلة في مسار واحد."],
   ["قارن المساحات", "قائمة مختصرة جنباً إلى جنب على الحقائق المسجلة والإيجار مقابل المؤشر."],
   ["الثقة والامتثال", "فال 1200025510، مع إظهار حالة التوثيق على كل عرض."],
   ["نبض السوق", "لوحة السوق الحيّة: نطاقات الإيجار حسب الموقع، والمعروض، وانضباط التسعير مقابل المؤشر."],
  ] as [string,string][],
  ctaH: "أدرج مساحتك، أو اعثر على التالية",
  ctaP: "انضمّ إلى المنصّة المبنية للسوق التجاري في الرياض.",
  ctaList: "أدرج مساحتك", ctaBrowse: "تصفّح العروض",
 } : {
  eyebrow: "Commercial real estate exchange",
  h1a: "Where Saudi business finds ",
  h1b: "commercial space it can check",
  sub: "Offices, retail, medical and warehouses across Riyadh. Each listing carries its own verification state, published rent bands attributed to source, one neutral exchange.",
  tabs: [["lease","Lease"],["buy","Buy"]] as const,
  phReq: "What space are you looking for?",
  phStd: "District, project or building",
  btnReq: "Post",
  btnStd: "Search",
  popular: "Popular:",
  chip1: "Office, KAFD", chip2: "Retail, Tahlia", chip3: "Warehouse, 2nd Industrial",
  micro1: "At launch, owners checked before listing", micro2: "No assumed commission", micro3: "FAL 1200025510",
  stat: [[stats.listings, "Published listings"], [stats.verifiedPct, "Owner-verified"], [stats.districts, "Districts indexed"], [stats.buildings, "Buildings"]] as [string | null, string][],
  exEye: "The exchange",
  exH: "Four jobs, one neutral place",
  exP: "Discovery, requirements, published pricing and an advisor that names its source, in one neutral place.",
  cards: [
   ["Listings", "Direct from the owner or a licensed broker. Each listing shows its own verification state.", "/listings"],
   ["Requirements", "Occupiers post what they need; the right supply comes to them.", "/post-requirement"],
   ["Rent Index", "Published rent bands from the REGA Rental Index (Ejar), with the period and the source on every figure.", "/rent-index"],
   ["AI Advisor", "Conversational search and valuation, grounded in the Rent Index.", "/advisor"],
  ] as [string,string,string][],
  ftEye: "Featured, Riyadh",
  ftH: "Listed spaces, priced against the published band",
  ftBrowse: "Browse all listings",
  bandEye: "Rent Index",
  bandH: "The pricing layer behind every decision",
  bandP1: "Published benchmarks, attributed to source, across ", bandP2: " Riyadh locations. Benchmark a rent or check a lease against the band. Every figure carries its period and its source.",
  bandBtn: "Explore the Rent Index",
  flowEye: "How a deal flows",
  flowH: "One path. You deal with the lister.",
  flowBody: "Contact the lister directly. It is free, there is no mandate and no commission. SAT Markets is not a party to the transaction and takes no cut of it.",
  flowNote: "SAT Real Estate is separately licensed as a brokerage and lists here like any other broker. Where a listing is ours, it says so.",
  oneEye: "One exchange",
  oneH: "Everything the market needs, in one place",
  oneP: "Discovery, published data, AI and the full deal, for occupiers, owners, brokers and investors.",
  feats: [
   ["Listings + map", "Owner-direct stock on a live Riyadh map, each listing showing its own verification state."],
   ["Rent Index", "Published rent bands with the capped/open freeze lens."],
   ["Location Intelligence", "Co-tenancy and surroundings from the platform record. Mobility and visitation data are not enabled."],
   ["Investment underwriting", "Yield, NOI and scenarios on illustrative comparables."],
   ["AI Advisor", "Conversational search and valuation, grounded in the Index."],
   ["Post a requirement", "Tell the market what you need; owners and brokers respond."],
   ["Owner dashboard", "Listing performance, leads and requirement matches."],
   ["Membership plans", "Grades with clear quota caps."],
   ["Deal tracking", "Enquiry to viewing to offer to handover, recorded on one thread."],
   ["Compare spaces", "Shortlist side by side on the recorded facts and rent vs index."],
   ["Trust and compliance", "FAL 1200025510, with each listing's verification state shown on it."],
   ["Market pulse", "The live market board: rent bands by location, supply and pricing discipline vs the index."],
  ] as [string,string][],
  ctaH: "List your space, or find your next one",
  ctaP: "Join the exchange built for Riyadh's commercial market.",
  ctaList: "List your space", ctaBrowse: "Browse listings",
 };

 const featLinks = ["/map","/rent-index","/area","/invest","/advisor","/post-requirement","/dashboard","/pricing","/deal","/compare","/about","/market"];
 const featKeys = ["h","a","","h","a","","h","a","","h","","a"];
 const featIcons = [Icon.building, Icon.chart, Icon.target, Icon.coins, Icon.spark, Icon.msg, Icon.grid, Icon.coins, Icon.cal, Icon.bolt, Icon.shield, Icon.activity];
 const cardIcons = [Icon.building, Icon.doc, Icon.chart, Icon.user];
 const f0 = featured[0];
 const rest = featured.slice(1);
 // ListingCard reads `view`, `onRequest` and `verificationIncomplete` off this
 // slice; `H` and `C` above are Home's own copy, not a second one of these.
 const UI = getDictionary(ar ? "ar" : "en").ui;
 const cardLocale = ar ? "ar" : "en";

 return (
  <div style={{ fontFamily: "var(--sans)", color: "var(--ink)", background: "var(--paper)" }}>
   <div className="satmkt-hero" style={{ position: "relative", padding: "clamp(44px,10vw,70px) 20px clamp(50px,10vw,84px)", overflow: "hidden", backgroundImage: "linear-gradient(180deg, rgba(9,13,19,.9) 0%, rgba(9,13,19,.74) 42%, rgba(9,13,19,.94) 100%), url('/hero-kafd.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}>
    <div style={{ position: "relative", maxWidth: 920, margin: "0 auto", textAlign: "center" }}>
     <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.22)", borderRadius: 20, padding: "6px 13px", backdropFilter: "blur(4px)" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3ECF8E" }} />
      <span className="mono" style={{ fontSize: "var(--fs-2xs)", letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.92)" }}>{T.eyebrow}</span>
     </div>
     <h1 className="serif" style={{ fontSize: "clamp(2.125rem,5.2vw,3.625rem)", fontWeight: 500, lineHeight: 1.08, letterSpacing: "-.02em", margin: "20px auto 0", color: "var(--on-brand)", maxWidth: 820, textShadow: "0 2px 28px rgba(0,0,0,.45)" }}>
      {T.h1a}<span style={{ color: "#C4DAF2", textShadow: "0 2px 28px rgba(0,0,0,.45)" }}>{T.h1b}</span>
     </h1>
     <p style={{ fontSize: "var(--fs-lg)", lineHeight: 1.6, color: "rgba(255,255,255,.82)", margin: "18px auto 0", maxWidth: 600 }}>{T.sub}</p>
     <div style={{ margin: "30px auto 0", maxWidth: 860, background: "rgba(13,18,26,.55)", border: "1px solid rgba(255,255,255,.16)", borderRadius: 20, backdropFilter: "blur(10px)", padding: "18px 18px 16px", boxShadow: "0 24px 60px rgba(0,0,0,.35)" }}>
      <div style={{ display: "inline-flex", gap: 4, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: 3, marginBottom: 16 }}>
       {T.tabs.map(([v, l]) => (
        <button key={v} type="button" onClick={() => setDeal(v as "lease" | "buy" | "req")} style={{ border: "none", cursor: "pointer", fontSize: "var(--fs-sm)", fontWeight: 600, padding: "7px 16px", borderRadius: 7, background: deal === v ? "var(--paper)" : "transparent", color: deal === v ? "var(--ink)" : "rgba(255,255,255,.78)" }}>{l}</button>
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
           <button key={a.v} type="button" onClick={() => setAssetType(on ? "" : a.v)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: "0 0 auto", minWidth: 88, scrollSnapAlign: "start", padding: "11px 12px 10px", borderRadius: 12, cursor: "pointer", border: "1px solid " + (on ? "rgba(127,168,212,.85)" : "rgba(255,255,255,.1)"), background: on ? "rgba(58,110,165,.24)" : "rgba(255,255,255,.045)", color: "var(--on-brand)", boxShadow: on ? "0 0 0 1px rgba(58,110,165,.35), 0 6px 16px -8px rgba(58,110,165,.5)" : "none", transition: "background .15s, border-color .15s" }}>
            <span style={{ opacity: on ? 1 : .82 }}>{a.icon}</span>
            <span style={{ fontSize: "var(--fs-xs)", fontWeight: 500, whiteSpace: "nowrap", color: on ? "var(--on-brand)" : "rgba(255,255,255,.82)" }}>{ar ? a.ar : a.en}</span>
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
      <form onSubmit={go} style={{ display: "flex", alignItems: "stretch", border: "1px solid var(--silver-2)", borderRadius: 13, overflow: "hidden", background: "var(--paper)", boxShadow: "0 6px 20px rgba(0,0,0,.18)" }}>
       <div style={{ display: "flex", alignItems: "center", gap: 11, flex: 1, padding: "0 18px", minWidth: 0 }}>
        <span style={{ color: "var(--azure)", flex: "none" }}><Icon.pin size={20} /></span>
        <input className="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={deal === "req" ? T.phReq : T.phStd} style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: "var(--fs-md)", height: 58, color: "var(--ink)", fontFamily: "var(--sans)", minWidth: 0, textAlign: ar ? "right" : "left" }} />
       </div>
       <button type="submit" className="btn primary" style={{ borderRadius: 0, padding: "0 30px", fontSize: "var(--fs-md)", fontWeight: 600, flex: "none" }}>{deal === "req" ? T.btnReq : T.btnStd}</button>
      </form>
      {sopen && sug.length > 0 && (
       <div style={{ position: "absolute", top: "calc(100% + 6px)", insetInlineStart: 0, insetInlineEnd: 0, background: "var(--paper)", border: "1px solid var(--silver)", borderRadius: 12, boxShadow: "0 14px 36px rgba(20,24,27,.22)", zIndex: 50, overflow: "hidden", textAlign: ar ? "right" : "left" }}>
        {sug.map((o, i) => (
         <button key={i} type="button" onClick={() => { setSopen(false); if (o.did) { const sp = new URLSearchParams(); sp.set("deal", deal === "buy" ? "sale" : "lease"); sp.set("district", o.did); router.push(`/${locale}/listings?${sp.toString()}`); } else { setQ(o.label); } }}
          style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 15px", border: "none", borderTop: i === 0 ? "none" : "1px solid var(--paper)", cursor: "pointer", background: "var(--paper)", color: "var(--ink)", fontSize: "var(--fs-base)", fontFamily: "var(--sans)", textAlign: "inherit" }}>
          <span style={{ color: "var(--harbor)", flex: "none" }}><Icon.pin size={15} /></span>
          <span style={{ fontWeight: 600 }}>{o.label}</span>
          {/* ADV-1, and D24 in the direction that is easier to miss. This chip was
              green and read "verified" for any place found in our own districts
              table, which means only that we hold a record of the place: nothing
              about it had been checked by anyone. It now says the thing that is
              true, in a colour that claims nothing. */}
          {o.indexed ? <span className="mono" style={{ fontSize: "var(--fs-3xs)", color: "var(--slate)", border: "1px solid var(--silver-2)", background: "var(--paper)", borderRadius: 4, padding: "1px 5px", flex: "none" }}>{H.indexedShort}</span> : null}
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
       <Link href={L("/listings?q=KAFD")} className="chip" style={{ textDecoration: "none", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.18)", color: "var(--on-brand)" }}>{T.chip1}</Link>
       <Link href={L("/listings?q=Tahlia")} className="chip" style={{ textDecoration: "none", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.18)", color: "var(--on-brand)" }}>{T.chip2}</Link>
       <Link href={L("/listings?q=Industrial")} className="chip" style={{ textDecoration: "none", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.18)", color: "var(--on-brand)" }}>{T.chip3}</Link>
      </div>
     </div>
     <div className="row gap20 wrap" style={{ marginTop: 22, fontSize: "var(--fs-sm)", color: "rgba(255,255,255,.85)", justifyContent: "center" }}>
      <span className="row gap8"><span style={{ color: "#C4DAF2" }}><Icon.check size={16} /></span> {T.micro1}</span>
      <span className="row gap8"><span style={{ color: "#C4DAF2" }}><Icon.check size={16} /></span> {T.micro2}</span>
      <span className="row gap8"><span style={{ color: "#C4DAF2" }}><Icon.check size={16} /></span> {T.micro3}</span>
     </div>
     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: 12, marginTop: 26, maxWidth: 760, marginInline: "auto" }}>
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
      <div className="mono tnum" style={{ fontSize: "1.75rem", fontWeight: 500, color: "var(--ink)" }}>{x[0]}</div>
      <div className="muted" style={{ fontSize: "var(--fs-sm)", marginTop: 4 }}>{x[1]}</div>
     </div>
    ))}
   </div>

   <div style={{ maxWidth: 1360, margin: "0 auto" }}>

    {f0 && (
     <div style={{ padding: "clamp(44px,7vw,72px) 24px 8px" }}>
      <div className="row between wrap" style={{ alignItems: "flex-end", gap: 12 }}>
       <div><div className="eyebrow">{T.ftEye}</div><h2 className="serif" style={{ fontSize: "clamp(1.5rem,5vw,2.125rem)", fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 0" }}>{T.ftH}</h2></div>
       <Link href={L("/listings")} className="btn ghost" style={{ gap: 7, textDecoration: "none" }}>{T.ftBrowse} <Icon.arrow size={16} /></Link>
      </div>
      <div style={{ marginTop: 28 }}>
       <ListingCard listing={f0.listing} locale={cardLocale} ui={UI} variant="lead" indexPosition={f0.indexPosition} />
      </div>
      <div className="snap-row" style={{ marginTop: 18 }}>
       {rest.map((f) => (
        <ListingCard key={f.listing.id} listing={f.listing} locale={cardLocale} ui={UI} variant="grid" indexPosition={f.indexPosition} />
       ))}
      </div>
     </div>
    )}

    <div style={{ padding: "clamp(52px,8vw,84px) 24px" }}>
     <div style={{ maxWidth: 1160, margin: "0 auto" }}>
      <div style={{ maxWidth: 560 }}>
       <div className="eyebrow">{T.exEye}</div>
       <h2 className="serif" style={{ fontSize: "clamp(1.75rem,4vw,2.75rem)", fontWeight: 500, letterSpacing: "-.02em", margin: "14px 0 0" }}>{T.exH}</h2>
       <p className="muted" style={{ fontSize: "var(--fs-lg)", lineHeight: 1.65, marginTop: 16 }}>{T.exP}</p>
      </div>
      <div className="job-grid" style={{ marginTop: 36 }}>
       {T.cards.map((c, i) => {
        const I = cardIcons[i] as (p: { size?: number }) => React.JSX.Element;
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
           <span style={{ display: "block", fontSize: "1.25rem", fontWeight: 600, letterSpacing: "-.01em", marginTop: 14 }}>{c[0]}</span>
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

    <div className="hero-band" style={{ margin: "0 24px", borderRadius: 18, background: "var(--ink)", color: "var(--on-brand)", padding: "clamp(40px,6vw,56px) clamp(28px,5vw,48px)", position: "relative", overflow: "hidden" }}>
     <div className="band-mark" style={{ position: "absolute", right: -20, bottom: -40, opacity: .3 }}><Mark size={300} base="#222A31" lit={HARBOR} /></div>
     <div className="hero-band-grid" style={{ position: "relative", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.05fr)", gap: 48, alignItems: "center" }}>
      <div>
       <div className="eyebrow" style={{ color: "var(--azure-l)" }}>{T.bandEye}{kpis.period ? (ar ? "، " : ", ") + formatPeriod(kpis.period, ar) : ""}</div>
       <h2 className="serif" style={{ fontSize: "clamp(1.625rem,3.6vw,2.5rem)", fontWeight: 500, letterSpacing: "-.02em", margin: "14px 0 0", color: "var(--on-brand)" }}>{T.bandH}</h2>
       <p style={{ fontSize: "var(--fs-input)", lineHeight: 1.62, color: "#AEB6C0", margin: "16px 0 22px", maxWidth: 420 }}>{T.bandP1}{stats.districts}{T.bandP2}</p>
       <div className="row gap8 wrap" style={{ marginBottom: 22 }}>
        {bands.map((b, i) => (
         <button key={b.en} type="button" onClick={() => setBi(i)} style={{ cursor: "pointer", fontFamily: "var(--sans)", fontSize: "var(--fs-sm)", fontWeight: 600, padding: "7px 13px", borderRadius: 20, border: "1px solid rgba(255,255,255,.16)", color: i === bi ? "var(--ink)" : "rgba(255,255,255,.8)", background: i === bi ? "var(--paper)" : "transparent", transition: "all .15s ease" }}>{ar ? b.ar : b.en}</button>
        ))}
       </div>
       <Link href={L("/rent-index")} className="btn primary" style={{ textDecoration: "none" }}>{T.bandBtn}</Link>
      </div>
      {band && <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: 24 }}>
       <div className="row between" style={{ alignItems: "flex-start" }}>
        <div><div style={{ fontSize: "var(--fs-sm)", fontWeight: 600 }}>{(ar ? band.ar : band.en) + (H.gradeAOfficeSuffix)}</div><div style={{ fontSize: "var(--fs-xs)", color: "rgba(255,255,255,.5)", marginTop: 2 }}>{unitShort}</div></div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "1px solid rgba(255,255,255,.18)", color: "rgba(255,255,255,.75)", fontSize: "var(--fs-2xs)", fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>{formatPeriod(band.period, ar)}</span>
       </div>
       <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 16 }}>
        <span className="mono" style={{ fontSize: "2.75rem", fontWeight: 500, lineHeight: 1 }}>{fig(band.median)}</span>
        {/* PKG-FIG2 closure, findings 129 and 130. This caption used to be one
            frozen dictionary string, "average SAR/m²/yr", and it was wrong in
            two independent ways at once.
            It spelled the unit, so it was a fifth place the platform's
            most-used unit was written down, and the live payload showed it: it
            was the one occurrence of six on this page carrying no word joiner,
            because the joiner is applied by `formatUnit` and this string never
            went through it. The ar-lint rule shipped in this package could not
            see it, because that rule fires on a spelling that differs from the
            canon and this spelling matched.
            And it asserted the statistic. The word "average" was fixed in the
            dictionary above a figure read from a column named `median`, which
            is the exact confusion Law 6 and ADV-1D exist to prevent, on the
            first screen of the site. `rentIndexEvidence.ts` states the rule
            plainly: the statistic comes from the row's own `stat_kind` and from
            nothing else. It now does here too. */}
        <span style={{ fontSize: "var(--fs-sm)", color: "rgba(255,255,255,.55)" }}>{fill(C.statUnit, { stat: band.stat, unit: unitShort })}</span>
       </div>
       <div style={{ fontSize: "var(--fs-sm)", color: "rgba(255,255,255,.7)", marginTop: 8 }}>{/* PKG-FIG1, finding 127. The connective was spelled here too, in both
           languages, on the site's front door. `formatRange` is the one place
           that knows Arabic takes إلى between two figures and that the pair has
           to be isolated so an RTL line cannot reorder it. */}
       {ar ? `النطاق المنشور: ${formatRange(band.low, band.high, "ar", 0)}` : `Published band: ${formatRange(band.low, band.high, "en", 0)}`}</div>
       {/* A year-on-year figure and a rising curve used to sit here. The curve was
           nine hand-placed coordinates in an SVG path, drawn to look like a trend.
           Year-on-year needs two periods of the same series and we have one, so
           neither is shown. */}
       <div className="row between" style={{ borderTop: "1px solid rgba(255,255,255,.1)", marginTop: 16, paddingTop: 14, fontSize: "var(--fs-xs)", color: "rgba(255,255,255,.6)" }}>
        <span>{kpis.source || (ar ? "المصدر" : "Source")}</span>
        <span className="mono" style={{ color: "var(--on-brand)", fontWeight: 500 }}>{kpis.cells > 0 ? `${kpis.cells} ${ar ? "خلية" : "cells"}` : ""}</span>
       </div>
       {bandNotes.map((n) => (
        <div key={n} style={{ fontSize: "var(--fs-xs)", lineHeight: 1.7, color: "rgba(255,255,255,.6)", marginTop: 8 }}>{n}</div>
       ))}
      </div>}
     </div>
    </div>

    <div style={{ padding: "clamp(52px,8vw,84px) 24px" }}>
     <div style={{ textAlign: "center" }}>
      <div className="eyebrow">{T.oneEye}</div>
      <h2 className="serif" style={{ fontSize: "clamp(1.625rem,5vw,2.25rem)", fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 6px" }}>{T.oneH}</h2>
      <p className="muted" style={{ fontSize: "var(--fs-md)", maxWidth: 600, margin: "0 auto" }}>{T.oneP}</p>
     </div>
     <div>
      {([[H.tabDiscover, [0, 5, 9, 4]], [H.tabDecide, [1, 11, 2]], [H.tabTransact, [6, 7, 10]]] as [string, number[]][]).map(([gt, idxs], gi) => (
       <div key={gi} style={{ marginTop: gi === 0 ? 36 : 30 }}>
        <div className="row gap10" style={{ alignItems: "center", marginBottom: 14 }}>
         <span className="eyebrow">{gt}</span>
         <span style={{ flex: 1, height: 1, background: "var(--silver)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 232px), 1fr))", gap: 16 }}>
         {idxs.map((fi) => { const m = T.feats[fi]; const I = featIcons[fi] as (p: { size?: number }) => React.JSX.Element; const k = featKeys[fi]; return (
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


    <div style={{ padding: "8px 24px 64px" }}>
     <div style={{ borderRadius: 18, background: "linear-gradient(120deg,var(--azure) 0%,var(--azure-d) 100%)", color: "var(--on-brand)", padding: "clamp(34px,7vw,52px) clamp(22px,6vw,40px)", textAlign: "center" }}>
      <h2 className="serif" style={{ fontSize: "clamp(1.5625rem,5.4vw,2.125rem)", fontWeight: 500, letterSpacing: "-.02em", margin: 0, color: "var(--on-brand)" }}>{T.ctaH}</h2>
      <p style={{ fontSize: "var(--fs-input)", color: "rgba(255,255,255,.85)", margin: "14px auto 26px", maxWidth: 480 }}>{T.ctaP}</p>
      <div className="row gap12 center wrap">
       <Link href={L("/dashboard")} className="btn lg" style={{ background: "var(--paper)", color: "var(--azure-d)", textDecoration: "none" }}>{T.ctaList}</Link>
       <Link href={L("/find")} className="btn lg" style={{ background: "var(--paper)", color: "var(--ink)", textDecoration: "none" }}>{H.findSpace}</Link>
       <Link href={L("/listings")} className="btn lg" style={{ background: "transparent", color: "var(--on-brand)", border: "1px solid rgba(255,255,255,.5)", textDecoration: "none" }}>{T.ctaBrowse}</Link>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
