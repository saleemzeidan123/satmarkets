"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { formatUnit } from "@/lib/format";
import { Icon } from "@/components/satkit";

// Dropdown filter bar for the exchange. Pills toggle a single in-flow panel
// rendered below the row, so it never overflows on mobile or in the app shell.
// Location searches verified areas first and the full Saudi geography via
// /api/places (Mapbox). Property type, grade and fit-out are multi-select.
// Size and rent take a preset band or an exact figure (nearest first).

export type LocOpt = { id: string; city: string; kind: string; en: string; ar: string; count: number };
type Opt = { value: string; label: string };
type Params = Record<string, string>;

const KIND_T: Record<string, [string, string]> = {
  development: ["Developments", "المشاريع والوجهات"],
  district: ["Districts", "الأحياء"],
  area: ["Areas", "المناطق"],
};
const KIND_ORDER = ["development", "district", "area"];

export default function FilterBar({ locale, params, cities, locations, assets, grades, fits, sorts, basePath, assetCounts, gradeCounts, fitCounts, activeSort }: {
  locale: "en" | "ar"; params: Params; cities: { key: string; label: string }[];
  locations: LocOpt[]; assets: Opt[]; grades: Opt[]; fits: Opt[]; sorts: Opt[]; basePath: string;
  assetCounts?: Record<string, number>; gradeCounts?: Record<string, number>; fitCounts?: Record<string, number>;
  /**
   * PKG-E1-READINESS slice C, WS16. The ordering the page actually ran.
   *
   * This control used to read the raw sort parameter, falling back to the first
   * entry in the list, which is the sort the reader asked for or a default the
   * page may not have used. Neither is the sort it ran. `?sz=350` orders by
   * closeness to
   * 350 and sets no `sort` parameter at all, so the pill read "Newest" over a
   * proximity-ordered list; `?sz=350&sort=rent` used to order by closeness while
   * the pill read "Price, low to high". A control that names an ordering the page
   * is not running is a false statement made on every load, and the reader has no
   * way to catch it.
   *
   * The page computes the ordering and hands it here. Optional, because the
   * fallback is the previous reading and a caller that has not been updated is
   * no worse off than it was.
   */
  activeSort?: string;
}) {
  const ar = locale === "ar";
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  // Item 5, mobile Search discovery. "All filters" opens a two-level sheet: a
  // category list first, each row's own panel second. This tracks whether the
  // currently open category panel was reached through that list, so the
  // sheet header can offer a back chevron into the list instead of only a
  // close button -- opening a category directly from its own quick-rail pill
  // still closes straight to the page, unchanged.
  const [cameFromAll, setCameFromAll] = useState(false);
  const openCategory = (key: string) => { setCameFromAll(true); setOpen(key); };
  const closeSheet = () => { setOpen(null); setCameFromAll(false); };
  const [q, setQ] = useState("");
  const [places, setPlaces] = useState<{ label: string; sub: string }[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  /* ELITE-4 J3-16: Escape and an outside click both unmounted the panel and left
     focus nowhere. Each pill keeps a ref so focus can go back to the control that
     opened the panel. */
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const prevOpen = useRef<string | null>(null);
  // Item 8. The mobile filter sheet. Below the site's small breakpoint
  // (max-width:640px, matching --bp-sm in sat-platform.css), the same panel
  // content renders as a real bottom sheet instead of the always-in-flow
  // dropdown desktop uses: a backdrop, a focus trap, background scroll
  // locking, and initial focus on open. `isMobileSheet` is read from
  // matchMedia rather than a CSS-only breakpoint because these behaviors
  // (scroll lock, focus trap) must not run on desktop, where the panel is a
  // non-modal popup and trapping Tab or locking the page would be a
  // regression, not an improvement.
  const [isMobileSheet, setIsMobileSheet] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  /* Mobile sheet stacking fix. `.fb-sheet` used to render in-place, inside
     `.lst-filterwrap` (position:sticky, z-index:30). A positioned ancestor
     with its own z-index creates a new stacking context, and a
     position:fixed descendant does NOT escape that context for paint order
     (only for layout) -- so the sheet's own z-index:62 was being compared
     against siblings only within that z-index:30 box, not against the site
     header (z-index:40), the bottom tab bar (45) or the Advisor fab (60) at
     the root level. All three painted over the sheet's top edge, which is
     exactly what looked like "the sheet doesn't reach the header/tabbar/
     Advisor" and, wherever the header's bottom edge overlapped the sheet's
     title bar at the sheet's taller (near-85vh) heights, like the sheet
     opening already scrolled into the middle of its own content. A portal
     to a dedicated node appended directly to <body> renders the sheet in
     the root stacking context, where 62 legitimately outranks all three. */
  // react-hooks/refs (the React Compiler's ESLint rule) refuses a ref read
  // during render, and this node is read in the JSX below to decide whether
  // to portal at all: a ref's `.current` is exactly the kind of value the
  // rule assumes may be stale or absent when a render is replayed. State
  // does not have that problem, so the node lives in state instead, built
  // by useState's lazy initializer (React runs this exactly once, for the
  // very first render, never again on a re-render) rather than assigned from
  // inside an effect: `setState` called synchronously in an effect body is
  // its own, separately pinned finding (react-hooks/set-state-in-effect),
  // and this sidesteps it rather than trading one finding for another.
  const [sheetPortalEl] = useState<HTMLDivElement | null>(() => (typeof document !== "undefined" ? document.createElement("div") : null));
  const t = (en: string, arr: string) => (ar ? arr : en);
  /* Slice C, WS16. The ordering that ran, when the page told us, and otherwise the
     reader's own parameter. A value the list does not carry names nothing, so the
     pill falls back to the first entry rather than rendering an empty label. */
  const sortNow = activeSort || params.sort || (sorts[0] ? sorts[0].value : "");
  /* ELITE-4 J3-17: one id for the single panel, so a pill can point at what it opens. */
  const PANEL_ID = "fb-panel";

  useEffect(() => {
    // The mobile sheet portals to a node appended straight to <body> (see
    // sheetPortalEl above `renderPanel`), outside `wrapRef`'s own subtree.
    // Left unpatched, this listener reads every click inside the sheet
    // itself -- including a row in the "All filters" list drilling into its
    // own category -- as an "outside" click and closes the whole sheet
    // before the row's own onClick can run, since mousedown fires first.
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      const insideWrap = wrapRef.current && wrapRef.current.contains(t);
      const insideSheet = sheetPortalEl && sheetPortalEl.contains(t);
      if (!insideWrap && !insideSheet) closeSheet();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeSheet(); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
    // sheetPortalEl goes from null to a real node exactly once, right after
    // mount; re-running this effect that one extra time (cleanup then
    // re-add) is what keeps onDoc's closure from reading a stale null
    // forever, the way it would with an empty dependency array.
  }, [sheetPortalEl]);
  useEffect(() => {
    const prev = prevOpen.current;
    prevOpen.current = open;
    if (!prev || open) return;
    const el = pillRefs.current[prev];
    const act = document.activeElement as HTMLElement | null;
    // Only reclaim focus if the panel took it with it. If the user clicked another
    // control outside, that control keeps focus.
    if (el && (!act || act === document.body || (wrapRef.current ? wrapRef.current.contains(act) : false))) el.focus();
  }, [open]);
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) { setPlaces([]); return; }
    const ctl = new AbortController();
    const h = setTimeout(async () => {
      try { const r = await fetch(`/api/places?q=${encodeURIComponent(s)}`, { signal: ctl.signal }); const j = await r.json(); setPlaces(Array.isArray(j.items) ? j.items.slice(0, 6) : []); } catch {}
    }, 220);
    return () => { clearTimeout(h); ctl.abort(); };
  }, [q]);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobileSheet(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  // Background scroll locking. Only while the sheet is genuinely a modal
  // takeover; the desktop popup never locks the page.
  // The lock must be applied to the element that actually scrolls. This
  // document scrolls on <html> (`document.scrollingElement` is the
  // documentElement), so `overflow:hidden` on <body> alone locks nothing: the
  // page keeps scrolling behind an open sheet under both programmatic and wheel
  // input, and with no offset recorded, closing returns the reader to wherever
  // the background drifted rather than where they opened it.
  //
  // The `position:fixed` half is not belt-and-braces. iOS Safari ignores
  // `overflow:hidden` as a scroll lock, and pinning the body is the only
  // technique that holds there. Pinning is also what makes exact restoration
  // possible, because the offset is recorded rather than inferred.
  //
  // Restoration lives in the cleanup rather than on any one dismissal path, so
  // Escape, the backdrop, the explicit Close control and an unmount all restore
  // identically and no future dismissal path can forget to. `scrollRestoration`
  // is borrowed, not set: it returns to whatever it was, so a component that
  // mounts and unmounts never permanently changes how the browser restores
  // history. `behavior:instant` stops a smooth animation replaying the scroll.
  useEffect(() => {
    if (!open || !isMobileSheet) return;
    const doc = document.documentElement;
    const body = document.body;
    const y = window.scrollY || doc.scrollTop || 0;
    const prev = {
      htmlOverflow: doc.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      restoration: ("scrollRestoration" in history ? history.scrollRestoration : undefined) as
        | ScrollRestoration
        | undefined,
    };
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    doc.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    // Pinning takes the body out of flow, so without an explicit width it
    // collapses to its content and the locked page visibly reflows behind the
    // sheet. Reflowing the thing the reader returns to is its own defect.
    body.style.width = "100%";
    return () => {
      doc.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.width = prev.bodyWidth;
      window.scrollTo({ top: y, left: 0, behavior: "instant" as ScrollBehavior });
      if ("scrollRestoration" in history && prev.restoration) history.scrollRestoration = prev.restoration;
    };
  }, [open, isMobileSheet]);
  // Mount the portal node, cover-and-inert everything else on the page, and
  // hide the two floating controls the sheet would otherwise fight for
  // layering with (the tab bar and the Advisor fab live outside this
  // component's tree and outside this portal, so they can't be reached by
  // props -- a body class is the one thing both sides can agree on). Native
  // `inert` (not just aria-hidden) both removes background content from the
  // accessibility tree and blocks pointer/keyboard interaction with it,
  // which is what "cover and inert the background" asks for beyond what the
  // Tab-trap above already does for keyboard users.
  useEffect(() => {
    if (!open || !isMobileSheet) return;
    const node = sheetPortalEl;
    if (!node) return;
    document.body.appendChild(node);
    document.body.classList.add("fb-sheet-modal-open");
    const inerted = Array.from(document.body.children).filter((el) => el !== node) as HTMLElement[];
    inerted.forEach((el) => { el.inert = true; });
    // Defensive reset: a browser scrolling an autoFocus input into view (the
    // location panel's search box) has been observed to leave a freshly
    // mounted scroll container at a non-zero scrollTop instead of showing
    // its content from the top.
    const body = node.querySelector<HTMLElement>(".fb-sheet-body");
    if (body) body.scrollTop = 0;
    return () => {
      inerted.forEach((el) => { el.inert = false; });
      document.body.classList.remove("fb-sheet-modal-open");
      if (node.parentNode) node.parentNode.removeChild(node);
    };
  }, [open, isMobileSheet, sheetPortalEl]);
  // Initial focus. The location panel keeps its own autoFocus search input
  // (unchanged desktop behaviour); every other panel has no focusable
  // element of its own to land on, so focus goes to the sheet's close
  // button, per the dialog pattern.
  useEffect(() => {
    if (!open || !isMobileSheet || open === "loc") return;
    closeBtnRef.current?.focus();
  }, [open, isMobileSheet]);
  // Contained keyboard focus. Tab and Shift+Tab wrap within the sheet's own
  // focusable elements rather than escaping into the page behind it.
  useEffect(() => {
    if (!open || !isMobileSheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const root = panelRef.current;
      if (!root) return;
      const items = Array.from(
        root.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      );
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !active || !root.contains(active)) { e.preventDefault(); last.focus(); }
      } else if (active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, isMobileSheet]);

  const nav = (patch: Params) => {
    const next: Params = { ...params, ...patch };
    const p = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
    closeSheet();
    router.push(`${basePath}${p.toString() ? `?${p.toString()}` : ""}`);
  };
  const csv = (key: string) => (params[key] ? params[key].split(",").filter(Boolean) : []);
  const toggleCsv = (key: string, val: string) => {
    const set = new Set(csv(key));
    if (set.has(val)) set.delete(val);
    else set.add(val);
    const next: Params = { ...params, [key]: Array.from(set).join(",") };
    const p = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
    router.push(`${basePath}${p.toString() ? `?${p.toString()}` : ""}`);
  };
  const nameOf = (l: LocOpt) => (ar ? l.ar || l.en : l.en);
  const cityLabel = (k: string) => cities.find((c) => c.key === k)?.label ?? k;
  const selLoc = params.district ? locations.find((l) => l.id === params.district) ?? null : null;

  const SIZES: [string, string, string][] = [
    [t("Under 200 m²", "أقل من 200 م²"), "", "200"], [t("200 to 500", "200 إلى 500"), "200", "500"],
    [t("500 to 1,000", "500 إلى 1,000"), "500", "1000"], [t("1,000 to 2,500", "1,000 إلى 2,500"), "1000", "2500"],
    [t("Over 2,500 m²", "أكثر من 2,500"), "2500", ""],
  ];
  const RENTS: [string, string, string][] = [
    [t("Under 1,000", "أقل من 1,000"), "", "1000"], [t("1,000 to 2,000", "1,000 إلى 2,000"), "1000", "2000"],
    [t("2,000 to 3,000", "2,000 إلى 3,000"), "2000", "3000"], [t("Over 3,000", "أكثر من 3,000"), "3000", ""],
  ];
  const SALE_PRICES: [string, string, string][] = [
    [t("Under 5M SAR", "أقل من 5 مليون ريال"), "", "5000000"], [t("5M to 15M", "5 إلى 15 مليون"), "5000000", "15000000"],
    [t("15M to 50M", "15 إلى 50 مليون"), "15000000", "50000000"], [t("Over 50M", "أكثر من 50 مليون"), "50000000", ""],
  ];
  const isSale = params.deal === "sale";
  const assetSel = csv("asset"), gradeSel = csv("grade"), fitSel = csv("fit");
  const activeSize = params.sz ? `${Number(params.sz).toLocaleString("en-US")} m²` : (params.smin || params.smax ? SIZES.find((s) => s[1] === (params.smin || "") && s[2] === (params.smax || ""))?.[0] : "");
  const activeRent = params.rt ? `${Number(params.rt).toLocaleString("en-US")}` : (params.pmin || params.pmax ? RENTS.find((s) => s[1] === (params.pmin || "") && s[2] === (params.pmax || ""))?.[0] : "");
  const activePrice = params.sp ? `${Number(params.sp).toLocaleString("en-US")}` : (params.spmin || params.spmax ? SALE_PRICES.find((s) => s[1] === (params.spmin || "") && s[2] === (params.spmax || ""))?.[0] : "");

  // Correct dialog labelling. Declared after `isSale` on purpose: an earlier
  // draft of this panel placed an equivalent lookup before `isSale`'s own
  // declaration in this same function scope, which throws a ReferenceError
  // at runtime (a temporal-dead-zone read), not a type error `tsc` catches.
  const PANEL_TITLES: Record<string, [string, string]> = {
    loc: ["Location", "الموقع"], deal: ["Deal", "الصفقة"], asset: ["Property type", "نوع العقار"],
    size: ["Size", "المساحة"], rent: isSale ? ["Price", "السعر"] : ["Rent", "الإيجار"],
    grade: ["Grade", "الفئة"], fit: ["Fit-out", "التجهيز"], sort: ["Sort", "ترتيب"],
    all: ["All filters", "كل الفلاتر"],
  };
  const PANEL_TITLE_ID = "fb-panel-title";
  const panelTitleText = open && PANEL_TITLES[open] ? t(PANEL_TITLES[open][0], PANEL_TITLES[open][1]) : "";

  const pill = (key: string, label: string, active: boolean, right?: boolean) => (
    <button type="button" key={key} ref={(el) => { pillRefs.current[key] = el; }} onClick={() => { setCameFromAll(false); setOpen(open === key ? null : key); }}
      /* ELITE-4 J3-17: the pill said it was expanded but never said what it opens. */
      aria-expanded={open === key} aria-haspopup="true" aria-controls={open === key ? PANEL_ID : undefined}
      className="chip" style={{ height: 38, padding: "0 13px", borderRadius: 999, gap: 7, cursor: "pointer", marginInlineStart: right ? "auto" : undefined,
        borderColor: active || open === key ? "var(--azure)" : "var(--silver-2)", background: active ? "var(--azure-wash)" : "var(--paper)", color: active ? "var(--azure-d)" : "var(--ink)", fontSize: "var(--fs-base)", whiteSpace: "nowrap" }}>
      {label}<span style={{ fontSize: "var(--fs-sm)", color: "var(--slate-2)", transform: open === key ? "rotate(180deg)" : undefined }}>▾</span>
    </button>
  );
  /* ELITE-4 J3-13: a tick glyph is not a state. These rows pick one value out of a
     list, so they carry the checked state themselves and the glyph is decoration. */
  const row = (label: React.ReactNode, active: boolean, on: () => void, rightTxt?: string) => (
    <button type="button" onClick={on} role="menuitemradio" aria-checked={active} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: ar ? "right" : "left", padding: "10px 10px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: "var(--fs-md)", background: active ? "var(--azure-wash)" : "transparent", color: "var(--ink)" }}>
      <span style={{ flex: 1 }}>{label}</span>
      {rightTxt ? <span className="mono" style={{ fontSize: "var(--fs-xs)", color: "var(--slate-2)" }}>{rightTxt}</span> : null}
      {active ? <span aria-hidden="true" style={{ color: "var(--azure-d)" }}>✓</span> : null}
    </button>
  );
  /* ELITE-4 J3-13: multi-select rows, so a real checked state. */
  const check = (label: string, on: boolean, toggle: () => void, count?: number) => (
    <button key={label} type="button" onClick={toggle} role="checkbox" aria-checked={on} style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: ar ? "right" : "left", padding: "10px 10px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: "var(--fs-md)", background: "transparent", color: "var(--ink)" }}>
      <span style={{ width: 20, height: 20, flex: "0 0 auto", borderRadius: 5, border: `1.5px solid ${on ? "var(--azure)" : "var(--silver-2)"}`, background: on ? "var(--azure)" : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--on-brand)", fontSize: "var(--fs-xs)" }} aria-hidden="true">{on ? "✓" : ""}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {count != null ? <span className="mono" style={{ fontSize: "var(--fs-2xs)", color: "var(--slate-2)" }}>{count}</span> : null}
    </button>
  );

  const renderPanel = () => {
    if (open === "all") {
      // Item 5, mobile Search discovery. Every dimension in one list, each
      // row showing its own current selection, so a reader who wants "Grade"
      // or "Sort" -- both past the fold of the quick rail on a phone -- has
      // one always-visible way in that does not depend on discovering the
      // rail can scroll sideways at all.
      const any = t("Any", "أي");
      const cats: { key: string; label: string; summary: string }[] = [
        { key: "loc", label: t("Location", "الموقع"), summary: selLoc ? nameOf(selLoc) : (params.place || any) },
        { key: "deal", label: t("Deal", "الصفقة"), summary: params.deal ? (params.deal === "sale" ? t("For sale", "للبيع") : t("For lease", "للإيجار")) : any },
        { key: "asset", label: t("Property type", "نوع العقار"), summary: assetSel.length ? String(assetSel.length) : any },
        { key: "size", label: t("Size", "المساحة"), summary: activeSize || any },
        { key: "rent", label: isSale ? t("Price", "السعر") : t("Rent", "الإيجار"), summary: (isSale ? activePrice : activeRent) || any },
        { key: "grade", label: t("Grade", "الفئة"), summary: gradeSel.length ? String(gradeSel.length) : any },
        { key: "fit", label: t("Fit-out", "التجهيز"), summary: fitSel.length ? String(fitSel.length) : any },
        { key: "sort", label: t("Sort", "ترتيب"), summary: (sortNow ? sorts.find((s) => s.value === sortNow)?.label : sorts[0]?.label) ?? "" },
      ];
      return (
        <div>
          {cats.map((c) => (
            <button key={c.key} type="button" onClick={() => openCategory(c.key)} className="row between"
              style={{ width: "100%", textAlign: ar ? "right" : "left", padding: "12px 4px", border: "none", borderTop: "1px solid var(--silver)", background: "transparent", cursor: "pointer", fontSize: "var(--fs-md)", color: "var(--ink)" }}>
              <span>{c.label}</span>
              <span className="row gap6" style={{ alignItems: "center" }}>
                <span className="muted" style={{ fontSize: "var(--fs-sm)" }}>{c.summary}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "var(--slate-2)", flex: "none", transform: ar ? "rotate(180deg)" : undefined }}><path d="M9 6l6 6-6 6" /></svg>
              </span>
            </button>
          ))}
          <div style={{ borderTop: "1px solid var(--silver)", paddingTop: 8, marginTop: 4 }}>
            {check(t("Ownership verified", "الملكية موثّقة"), !!params.verified, () => nav({ verified: params.verified ? "" : "1" }))}
          </div>
        </div>
      );
    }
    if (open === "loc") return (
      <div>
        {/* ELITE-4 J3-18: autoFocus lands here, so an unnamed box is the first thing
            a screen-reader user meets in this panel. */}
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("Search any city or district in Saudi Arabia", "ابحث عن أي مدينة أو حي في السعودية")} placeholder={t("Search any city or district in Saudi Arabia", "ابحث عن أي مدينة أو حي في السعودية")}
          className="input" style={{ width: "100%", height: 42, padding: "0 12px", borderRadius: 8, border: "1px solid var(--silver-2)", fontSize: "var(--fs-input)", boxSizing: "border-box", textAlign: ar ? "right" : "left" }} />
        <div className="muted" style={{ fontSize: "var(--fs-xs)", margin: "8px 2px 6px" }}>{q.trim() ? t("Indexed areas first, then all of Saudi Arabia.", "المناطق المفهرسة أولاً، ثم كل السعودية.") : t("Areas with listed spaces. Type to search all of Saudi Arabia.", "مناطق بها مساحات معروضة. اكتب للبحث في كل السعودية.")}</div>
        {cities.map((c) => {
          const ql = q.trim().toLowerCase();
          const inCity = locations.filter((l) => l.city === c.key && (ql ? (l.en.toLowerCase().includes(ql) || (l.ar || "").includes(q.trim())) : (Number(l.count) || 0) > 0));
          if (!inCity.length) return null;
          return (
            <div key={c.key} style={{ marginBottom: 4 }}>
              <div style={{ fontSize: "var(--fs-base)", fontWeight: 500, margin: "6px 2px 2px" }}>{c.label}</div>
              {KIND_ORDER.filter((k) => inCity.some((l) => l.kind === k)).map((k) => (
                <div key={k}>
                  <div className="muted2" style={{ fontSize: "var(--fs-2xs)", textTransform: "uppercase", letterSpacing: ".07em", margin: "6px 2px 2px", fontFamily: "var(--mono)" }}>{ar ? KIND_T[k][1] : KIND_T[k][0]}</div>
                  {inCity.filter((l) => l.kind === k).map((l) => row(nameOf(l) + (k === "development" ? t(" · project", " · مشروع") : ""), params.district === l.id, () => nav({ district: l.id, city: c.key, place: "" }), String(l.count)))}
                </div>
              ))}
            </div>
          );
        })}
        {places.length ? (
          <div style={{ marginTop: 6, borderTop: "1px solid var(--silver)", paddingTop: 6 }}>
            <div className="muted2" style={{ fontSize: "var(--fs-2xs)", textTransform: "uppercase", letterSpacing: ".07em", margin: "0 2px 2px", fontFamily: "var(--mono)" }}>{t("Across Saudi Arabia", "في أنحاء السعودية")}</div>
            {places.map((p, i) => row(`${p.label}${p.sub ? ` · ${p.sub}` : ""}`, false, () => nav({ place: p.label, district: "", city: "" })))}
          </div>
        ) : null}
      </div>
    );
    if (open === "deal") return (<div>{row(t("Any", "الكل"), !params.deal, () => nav({ deal: "" }))}{row(t("For lease", "للإيجار"), params.deal === "lease", () => nav({ deal: "lease" }))}{row(t("For sale", "للبيع"), params.deal === "sale", () => nav({ deal: "sale" }))}</div>);
    if (open === "asset") return (<div><div className="muted" style={{ fontSize: "var(--fs-xs)", margin: "0 2px 6px" }}>{t("Pick one or more.", "اختر واحداً أو أكثر.")}</div>{assets.map((a) => check(a.label, assetSel.includes(a.value), () => toggleCsv("asset", a.value), assetCounts?.[a.value]))}</div>);
    if (open === "grade") return (<div>{grades.map((g) => check(g.label, gradeSel.includes(g.value), () => toggleCsv("grade", g.value), gradeCounts?.[g.value]))}</div>);
    if (open === "fit") return (<div>{fits.map((f) => check(f.label, fitSel.includes(f.value), () => toggleCsv("fit", f.value), fitCounts?.[f.value]))}</div>);
    if (open === "sort") return (<div>{sorts.map((s) => row(s.label, sortNow === s.value, () => nav({ sort: s.value })))}</div>);
    if (open === "size") return (
      <div>
        {SIZES.map((s) => row(s[0], (params.smin || "") === s[1] && (params.smax || "") === s[2] && !params.sz, () => nav({ smin: s[1], smax: s[2], sz: "" })))}
        <div style={{ borderTop: "1px solid var(--silver)", margin: "8px 0", paddingTop: 8 }}>
          <div className="muted" style={{ fontSize: "var(--fs-xs)", margin: "0 2px 6px" }}>{t("Or enter an exact size, we show the nearest", "أو أدخل مساحة محددة، ونعرض الأقرب")}</div>
          <form onSubmit={(e) => { e.preventDefault(); const v = (new FormData(e.currentTarget).get("sz") as string || "").replace(/[^0-9]/g, ""); if (v) nav({ sz: v, smin: "", smax: "" }); }} className="row gap8">
            {/* ELITE-4 J3-18 */}
            <input name="sz" defaultValue={params.sz || ""} inputMode="numeric" aria-label={t("Exact size in m²", "مساحة محددة بالمتر المربع")} placeholder={t("e.g. 350", "مثال 350")} className="input" style={{ flex: 1, height: 42, padding: "0 10px", borderRadius: 8, border: "1px solid var(--silver-2)", fontSize: "var(--fs-input)", boxSizing: "border-box" }} />
            <button type="submit" className="btn primary" style={{ height: 42 }}>{t("m²", "م²")}</button>
          </form>
        </div>
      </div>
    );
    if (open === "rent") return isSale ? (
      <div>
        <div className="muted" style={{ fontSize: "var(--fs-xs)", margin: "0 2px 6px" }}>{t("SAR total. Sale listings.", "ريال إجمالي. عروض البيع.")}</div>
        {SALE_PRICES.map((s) => row(s[0], (params.spmin || "") === s[1] && (params.spmax || "") === s[2] && !params.sp, () => nav({ spmin: s[1], spmax: s[2], sp: "" })))}
        <div style={{ borderTop: "1px solid var(--silver)", margin: "8px 0", paddingTop: 8 }}>
          <div className="muted" style={{ fontSize: "var(--fs-xs)", margin: "0 2px 6px" }}>{t("Or enter an exact price, we show the nearest", "أو أدخل سعراً محدداً، ونعرض الأقرب")}</div>
          <form onSubmit={(e) => { e.preventDefault(); const v = (new FormData(e.currentTarget).get("sp") as string || "").replace(/[^0-9]/g, ""); if (v) nav({ sp: v, spmin: "", spmax: "" }); }} className="row gap8">
            {/* ELITE-4 J3-18 */}
            <input name="sp" defaultValue={params.sp || ""} inputMode="numeric" aria-label={t("Exact sale price in SAR", "سعر بيع محدد بالريال")} placeholder={t("e.g. 12,000,000", "مثال 12,000,000")} className="input" style={{ flex: 1, height: 42, padding: "0 10px", borderRadius: 8, border: "1px solid var(--silver-2)", fontSize: "var(--fs-input)", boxSizing: "border-box" }} />
            <button type="submit" className="btn primary" style={{ height: 42 }}>{t("SAR", "ريال")}</button>
          </form>
        </div>
      </div>
    ) : (
      <div>
        <div className="muted" style={{ fontSize: "var(--fs-xs)", margin: "0 2px 6px" }}>{/* PKG-FIG2, finding 129. Both halves of this caption spelled the lease
                unit with spaces around the separators, which is a spelling no figure
                on the site is rendered in, so the heading over the rent bands did not
                match the rents underneath it. */}
          {t(`${formatUnit("sar_sqm_year", "en", "short")}. Lease listings.`, `${formatUnit("sar_sqm_year", "ar", "short")}. عروض الإيجار.`)}</div>
        {RENTS.map((s) => row(s[0], (params.pmin || "") === s[1] && (params.pmax || "") === s[2] && !params.rt, () => nav({ pmin: s[1], pmax: s[2], rt: "" })))}
        <div style={{ borderTop: "1px solid var(--silver)", margin: "8px 0", paddingTop: 8 }}>
          <div className="muted" style={{ fontSize: "var(--fs-xs)", margin: "0 2px 6px" }}>{t("Or enter an exact rent, we show the nearest", "أو أدخل إيجاراً محدداً، ونعرض الأقرب")}</div>
          <form onSubmit={(e) => { e.preventDefault(); const v = (new FormData(e.currentTarget).get("rt") as string || "").replace(/[^0-9]/g, ""); if (v) nav({ rt: v, pmin: "", pmax: "" }); }} className="row gap8">
            {/* ELITE-4 J3-18 */}
            <input name="rt" defaultValue={params.rt || ""} inputMode="numeric" aria-label={t("Exact rent in SAR", "إيجار محدد بالريال")} placeholder={t("e.g. 1,800", "مثال 1,800")} className="input" style={{ flex: 1, height: 42, padding: "0 10px", borderRadius: 8, border: "1px solid var(--silver-2)", fontSize: "var(--fs-input)", boxSizing: "border-box" }} />
            <button type="submit" className="btn primary" style={{ height: 42 }}>{t("SAR", "ريال")}</button>
          </form>
        </div>
      </div>
    );
    return null;
  };

  const clearAll = () => {
    const p = new URLSearchParams();
    if (params.sort) p.set("sort", params.sort);
    closeSheet();
    router.push(`${basePath}${p.toString() ? `?${p.toString()}` : ""}`);
  };
  const activeChips: { label: string; clear: Params }[] = [];
  if (selLoc) activeChips.push({ label: nameOf(selLoc), clear: { district: "", city: "", place: "" } });
  else if (params.place) activeChips.push({ label: params.place, clear: { place: "" } });
  if (params.deal) activeChips.push({ label: params.deal === "sale" ? t("For sale", "للبيع") : t("For lease", "للإيجار"), clear: { deal: "" } });
  if (assetSel.length) activeChips.push({ label: `${t("Type", "النوع")} (${assetSel.length})`, clear: { asset: "" } });
  if (activeSize) activeChips.push({ label: activeSize as string, clear: { smin: "", smax: "", sz: "" } });
  if (isSale ? activePrice : activeRent) activeChips.push({ label: (isSale ? activePrice : activeRent) as string, clear: isSale ? { spmin: "", spmax: "", sp: "" } : { pmin: "", pmax: "", rt: "" } });
  if (gradeSel.length) activeChips.push({ label: `${t("Grade", "الفئة")} (${gradeSel.length})`, clear: { grade: "" } });
  if (fitSel.length) activeChips.push({ label: `${t("Fit-out", "التجهيز")} (${fitSel.length})`, clear: { fit: "" } });
  if (params.verified) activeChips.push({ label: t("Ownership verified", "الملكية موثّقة"), clear: { verified: "" } });

  return (
    <div ref={wrapRef}>
      <div className="row gap8 wrap lst-filterpills" style={{ alignItems: "center" }}>
        {/* Item 5, mobile Search discovery. First in DOM order, so on a phone
            (where this row scrolls horizontally, mask-faded at the trailing
            edge below) it is the one control never past that fade -- a
            reader does not have to find out the rail scrolls at all to reach
            Grade, Fit-out or Sort. Desktop wraps rather than scrolls, so
            there is nothing here to surface a shortcut past. */}
        {isMobileSheet && pill("all", activeChips.length ? `${t("All filters", "كل الفلاتر")} (${activeChips.length})` : t("All filters", "كل الفلاتر"), activeChips.length > 0)}
        {pill("loc", selLoc ? nameOf(selLoc) : params.place ? params.place : t("Location", "الموقع"), !!(selLoc || params.place))}
        {pill("deal", params.deal ? (params.deal === "sale" ? t("For sale", "للبيع") : t("For lease", "للإيجار")) : t("Deal", "الصفقة"), !!params.deal)}
        {pill("asset", assetSel.length ? `${t("Type", "النوع")} (${assetSel.length})` : t("Property type", "نوع العقار"), assetSel.length > 0)}
        {pill("size", activeSize || t("Size", "المساحة"), !!activeSize)}
        {pill("rent", isSale ? (activePrice || t("Price", "السعر")) : (activeRent || t("Rent", "الإيجار")), isSale ? !!activePrice : !!activeRent)}
        {pill("grade", gradeSel.length ? `${t("Grade", "الفئة")} (${gradeSel.length})` : t("Grade", "الفئة"), gradeSel.length > 0)}
        {pill("fit", fitSel.length ? `${t("Fit-out", "التجهيز")} (${fitSel.length})` : t("Fit-out", "التجهيز"), fitSel.length > 0)}
        {/* ELITE-4 J3-14: a toggle with no pressed state, whose own name began with a
            tick glyph that a screen reader read out as part of the label. */}
        <button type="button" onClick={() => nav({ verified: params.verified ? "" : "1" })} aria-pressed={!!params.verified} className="chip"
          style={{ height: 38, padding: "0 13px", borderRadius: 999, cursor: "pointer", gap: 7, whiteSpace: "nowrap", borderColor: params.verified ? "var(--green)" : "var(--silver-2)", background: params.verified ? "#EAF6EF" : "var(--paper)", color: params.verified ? "var(--verified)" : "var(--ink)", fontSize: "var(--fs-base)" }}>
          {params.verified ? <span aria-hidden="true">✓ </span> : null}{t("Ownership verified", "الملكية موثّقة")}
        </button>
        {pill("sort", `${t("Sort", "ترتيب")}: ${sortNow ? sorts.find((s) => s.value === sortNow)?.label ?? sorts[0].label : sorts[0].label}`, false, true)}
      </div>
      {activeChips.length > 0 ? (
        <div className="row gap8 wrap" style={{ alignItems: "center", marginTop: 9 }}>
          {activeChips.map((c, i) => (
            <button key={i} type="button" onClick={() => nav(c.clear)} aria-label={`${t("Remove", "إزالة")} ${c.label}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", borderRadius: 999, border: "1px solid var(--silver-2)", background: "var(--azure-wash)", color: "var(--azure-d)", fontSize: "var(--fs-sm)", cursor: "pointer", whiteSpace: "nowrap" }}>
              {c.label}<span aria-hidden style={{ fontSize: "var(--fs-md)", lineHeight: 1, color: "var(--slate-2)" }}>×</span>
            </button>
          ))}
          <button type="button" onClick={clearAll}
            style={{ height: 30, padding: "0 8px", border: "none", background: "transparent", color: "var(--slate-2)", fontSize: "var(--fs-sm)", cursor: "pointer", textDecoration: "underline", whiteSpace: "nowrap" }}>
            {t("Clear all", "مسح الكل")}
          </button>
        </div>
      ) : null}
      {open && isMobileSheet && sheetPortalEl ? createPortal(
        <>
          {/* Backdrop behavior: a full-viewport scrim, click to dismiss. Portalled
              to <body> (see sheetPortalEl above) so it and the sheet both paint
              in the root stacking context, above the header/tabbar/Advisor
              fab, instead of being trapped inside .lst-filterwrap's own
              z-index:30 context. The existing outside-click listener above
              (bound to `wrapRef`, the in-place pill row) correctly does NOT
              treat a backdrop click as "outside" once the backdrop lives
              outside that ref's subtree, which is why it needs its own
              explicit onClick here regardless. */}
          <div className="fb-sheet-backdrop" onClick={closeSheet} aria-hidden="true" />
          <div id={PANEL_ID} ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={PANEL_TITLE_ID} className="fb-sheet">
            <div className="fb-sheet-head">
              {/* Item 5. A category opened from the "All filters" list gets a
                  back chevron into that list instead of straight to close, so
                  picking the wrong category isn't a full restart. A category
                  opened directly from its own quick-rail pill keeps the plain
                  close button, unchanged: there is no list to go back to. */}
              {cameFromAll && open !== "all" ? (
                <button type="button" onClick={() => { setCameFromAll(false); setOpen("all"); }} aria-label={t("Back to all filters", "الرجوع إلى كل الفلاتر")} className="fb-sheet-close">
                  {/* Icon.chevr points right by default; every back affordance on the
                      platform rotates it 180deg in English and leaves it unrotated in
                      Arabic (src/lib/rtlChevron.test.ts enumerates every call site and
                      guards this exact expression against a bare, unconditional
                      rotation -- this is that test's 6th site). */}
                  <span aria-hidden="true" style={{ display: "inline-flex", transform: ar ? "none" : "rotate(180deg)" }}><Icon.chevr size={16} /></span>
                </button>
              ) : <span aria-hidden="true" />}
              <span id={PANEL_TITLE_ID} className="fb-sheet-title">{panelTitleText}</span>
              <button type="button" ref={closeBtnRef} onClick={closeSheet} aria-label={t("Close", "إغلاق")} className="fb-sheet-close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <div className="fb-sheet-body">{renderPanel()}</div>
          </div>
        </>,
        sheetPortalEl,
      ) : open ? (
        <div id={PANEL_ID} role="group" aria-labelledby={PANEL_TITLE_ID} className="card" style={{ marginTop: 10, padding: 12, width: "100%", maxWidth: 460, maxHeight: "min(60vh, 440px)", overflowY: "auto", boxShadow: "var(--sh-1)", boxSizing: "border-box" }}>
          <span id={PANEL_TITLE_ID} className="sronly">{panelTitleText}</span>
          {renderPanel()}
        </div>
      ) : null}
    </div>
  );
}
