"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ListingCard from "@/components/ListingCard";
import { getDictionary } from "@/i18n/getDictionary";
import { isLocale } from "@/i18n/config";
import { assetLabel, dealLabel, gradeLabel, cityLabel } from "@/lib/labels";
import type { Listing } from "@/lib/types";

const KEY = "satm_saved";

export default function SavedPage({ params }: { params: { locale: string } }) {
  const locale = (isLocale(params.locale) ? params.locale : "en") as "en" | "ar";
  const ar = locale === "ar";
  const dict = getDictionary(locale);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let saved: string[] = [];
    try { const s = JSON.parse(localStorage.getItem(KEY) || "[]"); saved = Array.isArray(s) ? s : []; } catch {}
    if (!saved.length) { setLoading(false); return; }
    fetch(`/api/saved?ids=${saved.join(",")}`).then((r) => r.json()).then((d) => { setListings(d.listings || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const clearAll = () => { try { localStorage.setItem(KEY, "[]"); } catch {} setListings([]); };

  const T = {
    title: ar ? "المحفوظة" : "Saved",
    sub: ar ? "قائمتك المختصرة, قارن جنباً إلى جنب." : "Your shortlist, compare side by side.",
    empty: ar ? "لا شيء محفوظ بعد. اضغط على ♥ في أي قائمة لإضافتها هنا." : "Nothing saved yet. Tap the heart on any listing to add it here.",
    browse: ar ? "تصفّح القوائم" : "Browse listings",
    clear: ar ? "مسح الكل" : "Clear all",
    loading: ar ? "جارٍ تحميل قائمتك…" : "Loading your shortlist…",
    compare: ar ? "مقارنة" : "Compare",
    deal: ar ? "الصفقة" : "Deal", type: ar ? "النوع" : "Type", price: ar ? "الإيجار / السعر" : "Rent / price",
    size: ar ? "المساحة" : "Size", grade: ar ? "التصنيف" : "Grade", district: ar ? "الحي" : "District",
    perYear: ar ? "ريال/م²/سنة" : "SAR/sqm/yr", sar: ar ? "ريال" : "SAR", onReq: ar ? "عند الطلب" : "On request",
  };

  const priceOf = (l: Listing) => {
    const lease = l.deal_type === "lease";
    const v = lease ? (l as any).asking_rent_sqm : (l as any).sale_price;
    if (v == null) return T.onReq;
    return `${Number(v).toLocaleString()} ${lease ? T.perYear : T.sar}`;
  };
  const distOf = (l: Listing) => { const d: any = (l as any).districts; if (!d) return "—"; const n = ar ? d.name_ar : d.name_en; return `${n}${d.city ? "، " + cityLabel(d.city, locale) : ""}`; };

  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="eyebrow">{T.title}</div>
          <h1 className="mt-1 font-display text-3xl text-charcoal">{T.title} {!loading && listings.length > 0 ? <span className="fig text-charcoal">· {listings.length}</span> : null}</h1>
          <p className="mt-1 text-charcoal/60">{T.sub}</p>
        </div>
        {listings.length > 0 ? <button onClick={clearAll} className="btn-ghost px-3.5 py-2 text-[13px] text-charcoal/70">{T.clear}</button> : null}
      </div>

      {loading ? (
        <p className="mt-10 text-charcoal/50">{T.loading}</p>
      ) : listings.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line bg-white/60 p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-signal/10 text-signal">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
          </div>
          <p className="text-charcoal/60">{T.empty}</p>
          <Link href={`/${locale}/listings`} className="btn-gold mt-5 inline-block px-5 py-2.5 text-sm font-medium">{T.browse}</Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (<ListingCard key={l.id} listing={l} locale={locale} sqm={dict.common.sqm} ui={dict.ui} />))}
          </div>
          <div className="mt-10">
            <h2 className="font-display text-xl text-charcoal">{T.compare}</h2>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="p-3 text-start text-[11px] uppercase tracking-wide text-charcoal/40"></th>
                    {listings.map((l) => (<th key={l.id} className="p-3 text-start font-display text-[14px] text-charcoal">{(ar ? l.title_ar : l.title_en) || (l as any).reference_code}</th>))}
                  </tr>
                </thead>
                <tbody className="text-charcoal/75">
                  <Row label={T.deal}>{listings.map((l) => <Cell key={l.id}>{dealLabel(l.deal_type, locale)}</Cell>)}</Row>
                  <Row label={T.type}>{listings.map((l) => <Cell key={l.id}>{assetLabel(l.asset_type, locale)}</Cell>)}</Row>
                  <Row label={T.price}>{listings.map((l) => <Cell key={l.id}><span className="fig text-charcoal">{priceOf(l)}</span></Cell>)}</Row>
                  <Row label={T.size}>{listings.map((l) => <Cell key={l.id}><span className="fig">{(l as any).area_sqm ? Number((l as any).area_sqm).toLocaleString() : "—"}</span> {dict.common.sqm}</Cell>)}</Row>
                  <Row label={T.grade}>{listings.map((l) => <Cell key={l.id}>{(l as any).building_grade && (l as any).building_grade !== "n_a" ? gradeLabel((l as any).building_grade, locale) : "—"}</Cell>)}</Row>
                  <Row label={T.district}>{listings.map((l) => <Cell key={l.id}>{distOf(l)}</Cell>)}</Row>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (<tr className="border-b border-line/70"><td className="p-3 text-[11px] uppercase tracking-wide text-charcoal/40">{label}</td>{children}</tr>);
}
function Cell({ children }: { children: React.ReactNode }) {
  return (<td className="p-3 align-top">{children}</td>);
}
