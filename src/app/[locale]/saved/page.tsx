"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ListingCard from "@/components/ListingCard";
import { getDictionary } from "@/i18n/getDictionary";
import { isLocale } from "@/i18n/config";
import { assetLabel, dealLabel, gradeLabel, cityLabel } from "@/lib/labels";
import { listingTitle } from "@/lib/listingTitle";
import { fetchAccountSaved, promoteDeviceFolders, setShortlist } from "@/lib/saved";
import type { Listing } from "@/lib/types";
import { netArea, askingPrice } from "@/lib/listingFigures";

const KEY = "satm_saved";
const FKEY = "satm_saved_folders";
const PKEY = "satm_saved_px";

export default function SavedPage({ params }: { params: { locale: string } }) {
  const locale = (isLocale(params.locale) ? params.locale : "en") as "en" | "ar";
  const ar = locale === "ar";
  const dict = getDictionary(locale);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<Record<string, string>>({});
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [px, setPx] = useState<Record<string, { was: number; now: number }>>({});
  // The sentences the server's quote decision attached to the index figures the
  // "vs index" row is built from. Empty when nothing was quoted.
  const [idxNotes, setIdxNotes] = useState<readonly string[]>([]);
  // Whether the shortlist names on this page live on the account or only in this browser.
  // The page says which, because a person filing four spaces into a shortlist deserves to
  // know whether that survives opening the site on their phone.
  const [onAccount, setOnAccount] = useState(false);

  // ADV-2D. The shortlist moves to the account for a signed-in person, and the device map
  // is promoted into it once. A signed-out visitor keeps exactly the page they had.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const account = await fetchAccountSaved();
      if (cancelled || !account) return;
      const promoted = await promoteDeviceFolders(account);
      if (cancelled) return;
      const filed: Record<string, string> = {};
      account.forEach((i) => { if (i.shortlist) filed[i.listing_id] = i.shortlist; });
      Object.assign(filed, promoted);
      setOnAccount(true);
      setFolders(filed);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let saved: string[] = [];
    try { const s = JSON.parse(localStorage.getItem(KEY) || "[]"); saved = Array.isArray(s) ? s : []; } catch {}
    try { const f = JSON.parse(localStorage.getItem(FKEY) || "{}"); if (f && typeof f === "object") setFolders(f); } catch {}
    if (!saved.length) { setLoading(false); return; }
    // ADV-1E. The locale travels with the request because the sentence that has
    // to accompany a quoted index figure is language-specific and the decision
    // that produces it is taken on the server.
    fetch(`/api/saved?ids=${saved.join(",")}&locale=${locale}`).then((r) => r.json()).then((d) => {
      const ls: Listing[] = d.listings || [];
      setListings(ls);
      setIdxNotes(Array.isArray(d.statements) ? d.statements : []);
      try {
        const prev = JSON.parse(localStorage.getItem(PKEY) || "{}");
        const stored: Record<string, number> = prev && typeof prev === "object" ? prev : {};
        const changes: Record<string, { was: number; now: number }> = {};
        const nextStore: Record<string, number> = {};
        ls.forEach((l: any) => {
          const v = l.deal_type === "lease" ? l.asking_rent_sqm : l.sale_price;
          if (v == null) return;
          const now = Number(v);
          nextStore[l.id] = now;
          const was = stored[l.id];
          if (typeof was === "number" && was !== now) changes[l.id] = { was, now };
        });
        localStorage.setItem(PKEY, JSON.stringify(nextStore));
        setPx(changes);
      } catch {}
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [locale]);

  const clearAll = () => { try { localStorage.setItem(KEY, "[]"); localStorage.setItem(FKEY, "{}"); } catch {} setListings([]); setFolders({}); setActiveFolder(null); };

  const setFolder = (id: string, name: string) => {
    const next = { ...folders };
    if (name) next[id] = name; else delete next[id];
    setFolders(next);
    // Signed in: the name belongs on the row, and this browser stops being a second store
    // of it. Signed out: nothing changes, the map stays where it always was.
    if (onAccount) { void setShortlist(id, name || null); return; }
    try { localStorage.setItem(FKEY, JSON.stringify(next)); } catch {}
  };
  const folderNames = Array.from(new Set(Object.values(folders))).sort();
  const shownL = activeFolder === null ? listings : listings.filter((l) => (folders[l.id] || "") === activeFolder);

  const T = dict.saved;

  // PKG-SUP2, finding 123. This is a CLIENT component, and `toLocaleString()`
  // with no argument resolves the device locale, so a shortlist opened on a
  // phone set to Arabic rendered its prices in Arabic-Indic digits. That is the
  // first defect the formatter was written to kill, and it was live here. The
  // unit was also spelled a sixth way in this file: `SAR/m2 yr` in English
  // against a different Arabic separator from every other surface.
  const priceOf = (l: Listing) =>
    askingPrice(l.deal_type === "sale" ? (l as any).sale_price : (l as any).asking_rent_sqm, l.deal_type, locale) ?? T.onReq;
  const pxNote = (id: string) => {
    const c = px[id];
    if (!c) return null;
    const pct = Math.round(((c.now - c.was) / c.was) * 100);
    const down = c.now < c.was;
    return (
      <span className="fig block text-[11px] font-semibold" style={{ color: down ? "var(--dv-quote-below)" : "var(--dv-quote-above)" }}>
        {`${T.wasWord} ${c.was.toLocaleString("en-US")} · ${down ? T.downWord : T.upWord} ${Math.abs(pct)}%`}
      </span>
    );
  };
  const pxCount = Object.keys(px).length;
  const distOf = (l: Listing) => { const d: any = (l as any).districts; if (!d) return dict.common.na; const n = ar ? d.name_ar : d.name_en; return `${n}${d.city ? (ar ? "، " : ", ") + cityLabel(d.city, locale) : ""}`; };

  return (
    <section className="mx-auto max-w-[1360px] px-6 pt-7 pb-16">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="eyebrow">{T.title}</div>
          <h1 className="mt-1 font-display text-3xl text-charcoal">{T.title} {!loading && listings.length > 0 ? <span className="fig text-charcoal">· {listings.length}</span> : null}</h1>
          <p className="mt-1 text-charcoal/70">{T.sub}</p>
        </div>
        {listings.length > 0 ? <button onClick={clearAll} className="btn-ghost px-3.5 py-2 text-[13px] text-charcoal/70">{T.clear}</button> : null}
      </div>

      {pxCount > 0 && (
        <div className="mt-5 rounded-xl border border-line bg-white/80 px-4 py-3 text-[13px] text-charcoal">
          {ar ? `تغيّرت أسعار ${pxCount} من مساحاتك المحفوظة منذ زيارتك الأخيرة. التفاصيل تحت كل سعر.` : `${pxCount} of your saved ${pxCount === 1 ? "space has" : "spaces have"} changed price since your last visit. Details under each price.`}
        </div>
      )}
      {loading ? (
        <p className="mt-10 text-charcoal/65">{T.loading}</p>
      ) : listings.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line bg-white/60 p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-signal/10 text-signal">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
          </div>
          <p className="text-charcoal/70">{T.empty}</p>
          <Link href={`/${locale}/listings`} className="btn-gold mt-5 inline-block px-5 py-2.5 text-sm font-medium">{T.browse}</Link>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button onClick={() => setActiveFolder(null)} className={activeFolder === null ? "chip on" : "chip"}>{T.fAll} · {listings.length}</button>
            {folderNames.map((n) => (
              <button key={n} onClick={() => setActiveFolder(n)} className={activeFolder === n ? "chip on" : "chip"}>{n} · {listings.filter((l) => folders[l.id] === n).length}</button>
            ))}
            {folderNames.length > 0 && <span className="text-[11px] text-charcoal/65">{onAccount ? T.fAccount : T.fDevice}</span>}
          </div>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shownL.map((l) => (
              <div key={l.id}>
                <ListingCard listing={l} locale={locale} ui={dict.ui} />
                <select
                  value={folders[l.id] || ""}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      const name = window.prompt(T.fPrompt);
                      if (name && name.trim()) setFolder(l.id, name.trim());
                      e.target.value = folders[l.id] || "";
                    } else setFolder(l.id, e.target.value);
                  }}
                  className="mt-2 w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12.5px] text-charcoal/70"
                >
                  <option value="">{T.fNone}</option>
                  {folderNames.map((n) => (<option key={n} value={n}>{n}</option>))}
                  <option value="__new__">{T.fNew}</option>
                </select>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl text-charcoal">{T.compare}</h2>
              {shownL.length >= 2 && (
                <Link href={`/${locale}/compare?ids=${shownL.slice(0, 4).map((l) => l.id).join(",")}`} className="text-[13px] font-medium hover:underline" style={{ color: "var(--harbor)" }}>
                  {T.openCompare}
                </Link>
              )}
            </div>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="p-3 text-start text-[11px] uppercase tracking-wide text-charcoal/65"></th>
                    {shownL.map((l) => (<th key={l.id} className="p-3 text-start font-display text-[14px] text-charcoal">{listingTitle(l, ar ? "ar" : "en")}</th>))}
                  </tr>
                </thead>
                <tbody className="text-charcoal/75">
                  <Row label={T.deal}>{shownL.map((l) => <Cell key={l.id}>{dealLabel(l.deal_type, locale)}</Cell>)}</Row>
                  <Row label={T.type}>{shownL.map((l) => <Cell key={l.id}>{assetLabel(l.asset_type, locale)}</Cell>)}</Row>
                  <Row label={T.price}>{shownL.map((l) => <Cell key={l.id}><span className="fig text-charcoal">{priceOf(l)}</span>{pxNote(l.id)}</Cell>)}</Row>
                  <Row label={T.vsIdx}>{shownL.map((l) => { const v = (l as any).vs_index; if (!v) return <Cell key={l.id}><span className="text-charcoal/65">{T.noIndex}</span></Cell>; const a = Math.abs(v.deltaPct ?? 0); const txt = v.status === "below" ? `${T.belowPre}${a}${T.belowSuf}` : v.status === "above" ? `${T.abovePre}${a}${T.aboveSuf}` : T.withinBand; const col = v.status === "below" ? "var(--dv-quote-below)" : v.status === "above" ? "var(--dv-quote-above)" : "var(--dv-quote-within)"; return <Cell key={l.id}><span className="fig" style={{ color: col, fontWeight: 600 }}>{txt}</span></Cell>; })}</Row>
                  <Row label={T.size}>{shownL.map((l) => <Cell key={l.id}><span className="fig">{netArea((l as any).area_sqm, locale) ?? dict.common.na}</span></Cell>)}</Row>
                  <Row label={T.grade}>{shownL.map((l) => <Cell key={l.id}>{(l as any).building_grade && (l as any).building_grade !== "n_a" ? gradeLabel((l as any).building_grade, locale) : dict.common.na}</Cell>)}</Row>
                  <Row label={T.district}>{shownL.map((l) => <Cell key={l.id}>{distOf(l)}</Cell>)}</Row>
                </tbody>
              </table>
            </div>
            {idxNotes.map((n) => (
              <div key={n} className="px-3 pt-2 text-[11.5px] leading-relaxed text-charcoal/65">{n}</div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (<tr className="border-b border-line/70"><td className="p-3 text-[11px] uppercase tracking-wide text-charcoal/65">{label}</td>{children}</tr>);
}
function Cell({ children }: { children: React.ReactNode }) {
  return (<td className="p-3 align-top">{children}</td>);
}
