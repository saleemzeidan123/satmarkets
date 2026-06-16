import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDictionary } from "@/i18n/getDictionary";
import { getSupabaseServer } from "@/lib/supabase/server";
import RentBand from "@/components/RentBand";
import LeadForm from "@/components/LeadForm";
import { galleryFor } from "@/lib/photos";
import { assetLabel, gradeLabel, fitoutLabel, cityLabel } from "@/lib/labels";
import type { Listing } from "@/lib/types";
import type { PubBand } from "@/components/RentBand";

export default async function ListingDetail({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale; const ar = locale === "ar";
  const dict = getDictionary(locale);
  const ui = dict.ui; const L = dict.listing;
  const sb = getSupabaseServer();
  let listing: any = null;
  let cell: PubBand | null = null;
  let briefCount = 0, availCount = 0;
  if (sb) {
    const { data } = await sb.from("listings").select("*, districts(name_en, name_ar, city)").eq("id", params.id).single();
    listing = data ?? null;
    if (listing?.district_id) {
      const { data: cells } = await sb.from("rent_index_published").select("band_low, band_high, median, unit, segment, sufficient").eq("district_id", listing.district_id).eq("asset_type", listing.asset_type).eq("sufficient", true).order("median", { ascending: false }).limit(1);
      cell = ((cells as any[]) ?? [])[0] ?? null;
      const { count: bc } = await sb.from("tenant_briefs").select("*", { count:"exact", head:true }).eq("district_id", listing.district_id).eq("asset_type", listing.asset_type); briefCount = bc ?? 0;
      const { count: ac } = await sb.from("listings").select("*", { count:"exact", head:true }).eq("district_id", listing.district_id).eq("asset_type", listing.asset_type).eq("status","published"); availCount = ac ?? 0;
    }
  }
  if (!listing) return <p className="text-charcoal/50">{ui.noMatch}</p>;
  const title = (locale === "ar" ? listing.title_ar : listing.title_en) || listing.reference_code;
  const d = listing.districts;
  const dn = d ? (locale==="ar"?d.name_ar:d.name_en) : "";
  const place = d ? `${dn}${d.city ? "، " + cityLabel(d.city, locale) : ""}` : "";
  const lease = listing.deal_type === "lease";
  const pics = galleryFor(listing.asset_type, listing.id);
  const repLabel = listing.lister_type === "broker_authorized" ? L.brokerAuthorized : listing.lister_type === "sat" ? L.satListed : L.ownerDirect;
  const docs: any[] = Array.isArray(listing.documents) ? listing.documents : [];
  const video: string | null = listing.video_url || null;
  const isYT = !!video && (video.includes("youtube") || video.includes("youtu.be"));
  const askNum = lease ? Number(listing.asking_rent_sqm ?? 0) : 0;
  let rentCheck: { kind: "in" | "above" | "below"; pct: number } | null = null;
  if (cell && askNum && (cell as any).band_low != null && (cell as any).band_high != null) {
    const lo = (cell as any).band_low as number, hi = (cell as any).band_high as number, med = ((cell as any).median ?? askNum) as number;
    if (askNum > hi) rentCheck = { kind: "above", pct: Math.round(((askNum - med) / (med || askNum)) * 100) };
    else if (askNum < lo) rentCheck = { kind: "below", pct: Math.round(((med - askNum) / (med || askNum)) * 100) };
    else rentCheck = { kind: "in", pct: 0 };
  }
  const linkCls = "inline-flex items-center gap-1 text-[12.5px] font-medium text-signal hover:underline";

  return (
    <div>
      <Link href={`/${locale}/listings`} className="text-sm text-charcoal/50 hover:text-charcoal">← {ui.allListings}</Link>
      <div className="mt-3 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-4 overflow-hidden rounded-2xl"><img src={pics[0]} alt={title} className="h-72 w-full object-cover" /></div>
            <div className="col-span-2 overflow-hidden rounded-xl"><img src={pics[1]} alt="" className="h-28 w-full object-cover" /></div>
            <div className="col-span-2 overflow-hidden rounded-xl"><img src={pics[2]} alt="" className="h-28 w-full object-cover" /></div>
          </div>
          <div>
            <div className="eyebrow">{assetLabel(listing.asset_type, locale)} · {place}</div>
            <h1 className="mt-1 font-display text-3xl text-charcoal">{title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="badge badge-gold">{repLabel}</span>
              {listing.ownership_verified && <span className="badge badge-verified">{L.ownershipVerified}</span>}
              {(listing.authorization_verified || listing.lister_type === "owner_direct") && <span className="badge badge-verified">{L.rightToMarket}</span>}
              {listing.ad_permit_no && <span className="badge">{L.adPermit}: {listing.ad_permit_no}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
            <Spec label={ui.area} value={`${listing.area_sqm} ${dict.common.sqm}`} />
            <Spec label={ui.grade} value={gradeLabel(listing.building_grade, locale)} />
            <Spec label={ui.fitout} value={fitoutLabel(listing.fitout_condition, locale)} />
            <Spec label={lease ? ui.asking : ui.price} value={Number(listing.asking_rent_sqm ?? listing.sale_price ?? 0).toLocaleString()} />
          </div>
          {(locale==="ar"?listing.description_ar:listing.description_en) && <p className="text-[15px] leading-relaxed text-charcoal/70">{locale==="ar"?listing.description_ar:listing.description_en}</p>}

          {video && (
            <div>
              <div className="eyebrow">{L.video}</div>
              <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-black">
                {isYT ? (
                  <iframe src={video} title={L.video} className="aspect-video w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                ) : (
                  <video src={video} controls className="aspect-video w-full" />
                )}
              </div>
            </div>
          )}

          {listing.floorplan_url && (
            <div>
              <div className="eyebrow">{L.floorplan}</div>
              <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-white">
                <img src={listing.floorplan_url} alt={L.floorplan} className="max-h-[460px] w-full object-contain" />
              </div>
            </div>
          )}

          {docs.length > 0 && (
            <div>
              <div className="eyebrow">{L.documents}</div>
              <div className="mt-2 flex flex-col gap-2">
                {docs.map((doc, i) => (
                  <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-[13.5px] text-charcoal/75 shadow-card hover:border-gold/50">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                    {locale==="ar" ? (doc.label_ar || doc.label_en) : (doc.label_en || doc.label_ar)}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <div className="eyebrow">{dict.areaIntel.title}</div>
            <div className="mt-4 space-y-4">
              <RentBand row={cell} locale={locale} labels={{ rentBand: dict.areaIntel.band, median: dict.listing.medianAchieved, notEnough: ui.notEnough }} />
              <div className="grid grid-cols-2 gap-4">
                <Metric n={briefCount} l={dict.areaIntel.briefs} />
                <Metric n={availCount} l={dict.areaIntel.available} />
              </div>
              <p className="text-xs text-charcoal/40">{dict.areaIntel.note}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-3">
                {listing.building_id ? <Link href={`/${locale}/building/${listing.building_id}`} className={linkCls}>{ar ? "تقرير المبنى" : "Building report"} →</Link> : null}
                {listing.district_id ? <Link href={`/${locale}/area?district=${listing.district_id}`} className={linkCls}>{ar ? "تقرير المنطقة" : "Area report"} →</Link> : null}
                <Link href={`/${locale}/rent-index`} className={linkCls}>{ar ? "مؤشر الإيجار" : "Rent index"} →</Link>
                <Link href={`/${locale}/listings?asset=${listing.asset_type}&deal=${listing.deal_type}`} className={linkCls}>{ar ? "المزيد المماثل" : "More like this"} →</Link>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-ivory-2/40 p-5">
            <div className="eyebrow">{L.trustTitle}</div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-charcoal/60">{L.trustBody}</p>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-line bg-white p-5 shadow-card lg:sticky lg:top-24">
          <div className="fig text-2xl text-gold">{Number(listing.asking_rent_sqm ?? listing.sale_price ?? 0).toLocaleString()}</div>
          <div className="text-xs text-charcoal/45">{lease ? ui.perSqmYear : ui.sar}</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="badge badge-gold">{repLabel}</span>
            {listing.ownership_verified && <span className="badge badge-verified">{L.ownershipVerified}</span>}
          </div>
          {rentCheck && (
            <div className="mt-3 rounded-xl border border-line bg-ivory-2/40 p-3">
              <div className="text-[10px] uppercase tracking-wide text-charcoal/40">{L.rentCheckTitle}</div>
              <div className={`mt-0.5 text-[13px] font-medium ${rentCheck.kind==="above"?"text-red-600":rentCheck.kind==="below"?"text-emerald-600":"text-charcoal"}`}>
                {rentCheck.kind==="in" ? L.rentInLine : rentCheck.kind==="above" ? `${rentCheck.pct}% ${L.rentAbove}` : `${rentCheck.pct}% ${L.rentBelow}`}
              </div>
            </div>
          )}
          <div className="mt-4 hairline" />
          <div className="mt-4"><LeadForm listingId={listing.id} labels={{ contactDirectly: dict.listing.contactDirectly, bookRepresentation: dict.listing.bookRepresentation, contactNote: dict.listing.contactNote, repNote: dict.listing.repNote }} /></div>
          {(listing.building_id || listing.district_id) && (
            <div className="mt-4 flex flex-col gap-1.5 border-t border-line pt-4">
              {listing.building_id ? <Link href={`/${locale}/building/${listing.building_id}`} className={linkCls}>{ar ? "تقرير المبنى" : "Building report"} →</Link> : null}
              {listing.district_id ? <Link href={`/${locale}/area?district=${listing.district_id}`} className={linkCls}>{ar ? "ذكاء المنطقة" : "Area intelligence"} →</Link> : null}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
function Spec({ label, value }: { label: string; value: string }) {
  return <div className="bg-white px-4 py-3"><div className="text-[10px] uppercase tracking-wide text-charcoal/40">{label}</div><div className="mt-0.5 fig text-lg text-charcoal">{value}</div></div>;
}
function Metric({ n, l }: { n: number; l: string }) {
  return <div className="rounded-xl border border-line bg-ivory-2/40 p-3"><div className="fig text-2xl text-gold">{n}</div><div className="text-[11px] text-charcoal/55">{l}</div></div>;
}
