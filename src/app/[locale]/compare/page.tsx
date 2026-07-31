import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { realInventoryOnly } from "@/lib/inventory";
import { assetLabel, gradeLabel, fitoutLabel, dealLabel, cityLabel } from "@/lib/labels";
import { listingTitle } from "@/lib/listingTitle";
import { Photo, Icon } from "@/components/satkit";
import { photoFor } from "@/lib/photos";
import { pickIndexRow, marketVerdict, type IndexRow } from "@/lib/market/verdict";
import { getDictionary } from "@/i18n/getDictionary";
import { verifiedBadges } from "@/components/VerificationState";
import { listingDimensionState } from "@/lib/listingVerification";
import DecisionPackPanel from "@/components/DecisionPackPanel";
import type { PackListing } from "@/lib/decisionPack";

type SP = { ids?: string };

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const ar = params.locale === "ar";
  return { title: ar ? "قارن المساحات · سات ماركتس" : "Compare spaces · SAT Markets", robots: { index: false } };
}

export default async function ComparePage({ params, searchParams }: { params: { locale: string }; searchParams: SP }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale; const ar = locale === "ar";
  const cp = getDictionary(locale === "ar" ? "ar" : "en").compare;
  const L = (p: string) => `/${locale}${p}`;
  const ids = (searchParams.ids || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);

  const sb = getSupabaseServer();
  let items: any[] = [];
  if (sb && ids.length) {
    const { data } = await realInventoryOnly(sb.from("listings").select("*, districts(name_en,name_ar,city)").in("id", ids).eq("status", "published"));
    const byId = new Map((data ?? []).map((l: any) => [l.id, l]));
    items = ids.map((id) => byId.get(id)).filter(Boolean); // preserve requested order
    // grounded verdict per item from the published Rent Index
    const distIds = Array.from(new Set(items.map((l) => l.district_id).filter(Boolean)));
    const idxByDistrict = new Map<string, IndexRow[]>();
    if (distIds.length) {
      const { data: irows } = await sb.from("rent_index_published").select("district_id,asset_type,segment,unit,band_low,median,band_high,period,sufficient,district_label,district_label_ar").in("district_id", distIds).eq("sufficient", true);
      (irows ?? []).forEach((r: any) => { const a = idxByDistrict.get(r.district_id) ?? []; a.push(r as IndexRow); idxByDistrict.set(r.district_id, a); });
    }
    items.forEach((l) => {
      const dnEn = l.districts ? l.districts.name_en : null;
      const dnAr = l.districts ? (l.districts.name_ar || l.districts.name_en) : null;
      l.__verdict = l.deal_type === "lease"
        ? marketVerdict(l.asking_rent_sqm ?? null, pickIndexRow(idxByDistrict.get(l.district_id) ?? [], l.asset_type, l.building_grade), dnEn, dnAr)
        : null;
    });
  }

  const dn = (l: any) => l.districts ? (ar ? l.districts.name_ar : l.districts.name_en) : (cp.riyadh);
  const cty = (l: any) => l.districts && l.districts.city ? cityLabel(l.districts.city, locale) : (cp.riyadh);

  // Empty / invalid state: guide to the shortlist, no fabricated demo
  if (!items.length) {
    return (
      <div style={{ background: "var(--cool)", minHeight: "60vh" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px", textAlign: "center" }}>
          <div className="eyebrow">{cp.eyebrowSaved}</div>
          <h1 className="serif" style={{ fontSize: "clamp(26px,4vw,36px)", fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 0" }}>{cp.emptyTitle}</h1>
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.6, margin: "14px auto 0", maxWidth: 520 }}>{cp.emptyBody}</p>
          <div className="row gap10" style={{ justifyContent: "center", marginTop: 22 }}>
            <Link href={L("/listings")} className="btn primary" style={{ textDecoration: "none" }}>{cp.browseListings}</Link>
            <Link href={L("/saved")} className="btn secondary" style={{ textDecoration: "none" }}><Icon.heart size={15} /> {cp.myShortlist}</Link>
          </div>
        </div>
      </div>
    );
  }

  const priceCell = (l: any) => l.deal_type === "lease"
    ? (l.asking_rent_sqm != null ? `${Number(l.asking_rent_sqm).toLocaleString()} ${cp.sarSqmYr}` : (cp.onRequest))
    : (l.sale_price != null ? `${Number(l.sale_price).toLocaleString()} ${cp.sar}` : (cp.onRequest));
  const totalCell = (l: any) => (l.deal_type === "lease" && l.asking_rent_sqm != null && l.area_sqm != null)
    ? `${Number(l.asking_rent_sqm * l.area_sqm).toLocaleString()} ${cp.sarYr}` : "–";

  // best value = most below its district median (lease with a verdict)
  let bestIdx = -1, bestDelta = Infinity;
  items.forEach((l, i) => { const v = l.__verdict; if (v && v.deltaPct != null && v.deltaPct < bestDelta) { bestDelta = v.deltaPct; bestIdx = i; } });

  // How the decision pack names a candidate. The model holds ids only, on purpose, so the
  // naming rule lives here beside the one the table headers already use: the title in the
  // reader's language, and the reference code when the title is missing rather than a
  // truncated id, which names nothing to the person reading it.
  const titleById = new Map<string, string>(items.map((l: any) => [l.id, listingTitle(l, ar ? "ar" : "en")]));
  const titleOf = (id: string) => titleById.get(id) || id;

  const GRID = `232px ${items.map(() => "1fr").join(" ")}`;
  const HeaderRow = ({ label, render }: { label: string; render: (l: any, i: number) => React.ReactNode }) => (
    <div style={{ display: "grid", gridTemplateColumns: GRID, borderBottom: "1px solid var(--silver)" }}>
      <div style={{ padding: "14px 16px", fontSize: 12.5, fontWeight: 600, color: "var(--slate)", background: "var(--cool)", borderRight: "1px solid var(--silver)" }}>{label}</div>
      {items.map((l, i) => (
        <div key={l.id} style={{ padding: "14px 16px", borderRight: i < items.length - 1 ? "1px solid var(--silver)" : "none", fontSize: 13.5, display: "flex", alignItems: "center", gap: 8 }}>{render(l, i)}</div>
      ))}
    </div>
  );

  return (
    <div style={{ background: "var(--cool)" }}>
      <div style={{ maxWidth: 1360, margin: "0 auto" }}>
        <div className="row between wrap" style={{ padding: "22px 24px 18px", alignItems: "flex-end", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 16 }}>
          <div>
            <div className="eyebrow">{ar ? `قارن · ${items.length} مساحات` : `Compare · ${items.length} space${items.length === 1 ? "" : "s"}`}</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", margin: "10px 0 0" }}>{cp.sideBySide}</h1>
          </div>
          <Link href={L("/saved")} className="btn secondary" style={{ textDecoration: "none" }}><Icon.heart size={15} /> {cp.myShortlist}</Link>
        </div>

        <div style={{ padding: "24px 24px 44px" }}>
          <div style={{ overflowX: "auto" }}>
            <div className="card" style={{ overflow: "hidden", boxShadow: "var(--sh-1)", minWidth: 260 + items.length * 200 }}>
              <div style={{ display: "grid", gridTemplateColumns: GRID }}>
                <div style={{ borderRight: "1px solid var(--silver)", borderBottom: "1px solid var(--silver)" }} />
                {items.map((l, i) => (
                  <div key={l.id} style={{ padding: 16, borderRight: i < items.length - 1 ? "1px solid var(--silver)" : "none", borderBottom: "1px solid var(--silver)" }}>
                    <Link href={L(`/listings/${l.id}`)} style={{ textDecoration: "none", color: "inherit" }}>
                      <Photo src={photoFor(l.asset_type, l.id)} kind={l.asset_type} alt={`${assetLabel(l.asset_type, locale)}, ${dn(l)}`} h={108} style={{ borderRadius: 9 }} badges={verifiedBadges(l, null, ar)} />
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12, letterSpacing: "-.01em" }}>{listingTitle(l, ar ? "ar" : "en")}</div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{dn(l)}{cp.sep}{cty(l)}</div>
                    </Link>
                  </div>
                ))}
              </div>

              <HeaderRow label={cp.deal} render={(l) => <span>{dealLabel(l.deal_type, locale)}</span>} />
              <HeaderRow label={cp.type} render={(l) => <span>{assetLabel(l.asset_type, locale)}</span>} />
              <HeaderRow label={cp.price} render={(l) => <span className="mono" style={{ fontWeight: 500 }}>{priceCell(l)}</span>} />
              <HeaderRow label={cp.totalYr} render={(l) => <span className="mono">{totalCell(l)}</span>} />
              <HeaderRow label={cp.netArea} render={(l) => <span className="mono">{l.area_sqm != null ? `${Number(l.area_sqm).toLocaleString()} m²` : "–"}</span>} />
              <HeaderRow label={cp.grade} render={(l) => <span>{l.building_grade && l.building_grade !== "n_a" ? gradeLabel(l.building_grade, locale) : getDictionary(locale).common.na}</span>} />
              <HeaderRow label={cp.fitout} render={(l) => <span>{fitoutLabel(l.fitout_condition, locale)}</span>} />
              <HeaderRow label={cp.vsDistrictMedian} render={(l, i) => {
                const v = l.__verdict;
                if (!v || v.status === "na" || v.deltaPct == null) return <span className="muted" style={{ fontSize: 12.5 }}>{l.deal_type === "sale" ? (cp.indexLease) : (cp.noSuffIndex)}</span>;
                const a = Math.abs(v.deltaPct);
                const txt = v.status === "below" ? (ar ? `أقل بنحو ${a}%` : `~${a}% below`) : v.status === "above" ? (ar ? `أعلى بنحو ${a}%` : `~${a}% above`) : (cp.withinBand);
                const col = v.status === "below" ? "var(--dv-quote-below)" : v.status === "above" ? "var(--dv-quote-above)" : "var(--dv-quote-within)";
                return <><span className="mono" style={{ color: col, fontWeight: 600 }}>{txt}</span>{i === bestIdx && <span className="tag" style={{ color: "var(--dv-quote-below)", background: "transparent", border: 0, padding: 0, fontSize: 9.5 }}>{cp.bestValue}</span>}</>;
              }} />
              <HeaderRow label={cp.district} render={(l) => <span>{dn(l)}</span>} />
              {/* C4, then ADV-1. Ownership OR authorisation OR the row being our own
                  stock, all printed as one green "Verified" in the row a reader uses to
                  pick between spaces. It is now the ownership dimension itself. */}
              <HeaderRow label={cp.owner} render={(l) => listingDimensionState(l as any, "ownership") === "verified" ? <span style={{ color: "var(--green)", fontWeight: 600 }}>{cp.verified}</span> : <span className="muted">–</span>} />

              <div style={{ display: "grid", gridTemplateColumns: GRID, borderTop: "1px solid var(--silver)", background: "var(--cool)" }}>
                <div style={{ padding: 16, borderRight: "1px solid var(--silver)" }} />
                {items.map((l, i) => (
                  <div key={l.id} style={{ padding: 16, borderRight: i < items.length - 1 ? "1px solid var(--silver)" : "none" }}>
                    <Link href={L(`/listings/${l.id}`)} className="btn primary sm" style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}>{cp.viewContact}</Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="row gap10" style={{ marginTop: 16 }}>
            <span style={{ color: "var(--harbor)" }}><Icon.info size={15} /></span>
            <span className="muted" style={{ fontSize: 12.5 }}>{cp.note}</span>
          </div>

          {/* ADV-2D. The table above arranges the figures. This states which of those
              arrangements is a comparison, which is withheld and why, and what is missing
              from each record. It reads the same rows; it computes nothing of its own. */}
          <DecisionPackPanel listings={items as PackListing[]} titleOf={titleOf} ar={ar} />
        </div>
      </div>
    </div>
  );
}
