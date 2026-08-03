import { isLocale } from "@/i18n/config";
import { isSqmYear } from "@/lib/market/verdict";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { releaseVisibleInventory } from "@/lib/inventory";
import { cityLabel } from "@/lib/labels";
import JsonLd, { SITE } from "@/components/JsonLd";
import { getDictionary } from "@/i18n/getDictionary";
import { localeMeta } from "@/lib/meta";
import { quotableRentIndexRows } from "@/lib/market/quotable";
import { evidenceStateLabel } from "@/lib/evidenceView";
import { placeName } from "@/lib/displayName";

export const revalidate = 3600;

// ADV-1E. `officeSample` rides with the figure. The directory prints one office
// average per location, and it printed it for every row the table called
// `sufficient`, which is a statement about the size of a sample and not about
// whether SAT may publish what the sample produced. The figure now comes from
// the same decision the Rent Index and the Advisor take, and a figure that may
// be shown only as sample data says so on its own card rather than relying on a
// note somewhere else on a long scrolling page.
type Loc = { id: string; city: string; name_en: string; name_ar: string; kind: string; count: number; officeMedian: number | null; officeSample: boolean };

const KIND_ORDER = ["district", "development", "area"];

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const d = getDictionary(params.locale === "ar" ? "ar" : "en").locations;
  return localeMeta(params.locale, "/locations", d.metaTitle, d.metaDesc);
}

export default async function LocationsPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const d = getDictionary(locale).locations;
  const sb = getSupabaseServer();
  let locs: Loc[] = [];
  let statements: readonly string[] = [];
  if (sb) {
    const [{ data: ds }, { data: ls }, { data: idx }] = await Promise.all([
      sb.from("districts").select("id,city,name_en,name_ar,kind"),
      releaseVisibleInventory(sb.from("listings").select("district_id").eq("status", "published")).limit(1000),
      sb.from("rent_index_published").select("district_id,asset_type,segment,median,band_low,band_high,period,sufficient,stat_kind,data_class,is_demo,unit").eq("sufficient", true).eq("asset_type", "office"),
    ]);
    const counts = new Map<string, number>();
    (ls ?? []).forEach((l: any) => { if (l.district_id) counts.set(l.district_id, (counts.get(l.district_id) ?? 0) + 1); });
    const quotable = await quotableRentIndexRows((idx ?? []) as any[], locale);
    statements = quotable.statements;
    const med = new Map<string, { value: number; sample: boolean }>();
    for (const { row: r, gate } of quotable.rows) {
      if (r.median != null && isSqmYear(r.unit) && !med.has(r.district_id)) {
        med.set(r.district_id, { value: Number(r.median), sample: gate.kind === "labelled_sample" });
      }
    }
    locs = (ds ?? []).map((d: any) => ({ id: d.id, city: d.city, name_en: d.name_en, name_ar: d.name_ar, kind: d.kind || "district", count: counts.get(d.id) ?? 0, officeMedian: med.get(d.id)?.value ?? null, officeSample: med.get(d.id)?.sample ?? false }));
  }
  const KIND_T: Record<string, [string, string]> = {
    district: [d.kDistrict, d.kDistrictSub],
    development: [d.kDevelopment, d.kDevelopmentSub],
    area: [d.kArea, d.kAreaSub],
  };
  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 24px 64px", fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <JsonLd data={{ "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: d.crumbHome, item: `${SITE}/${locale}` },
        { "@type": "ListItem", position: 2, name: d.crumbLocations, item: `${SITE}/${locale}/locations` },
      ] }} />
      <JsonLd data={{ "@type": "ItemList", name: d.itemListName, numberOfItems: locs.length, itemListElement: locs.map((l, i) => ({ "@type": "ListItem", position: i + 1, name: `${placeName(l, ar ? "ar" : "en")}, ${cityLabel(l.city, locale)}`, url: `${SITE}/${locale}/listings?district=${l.id}` })) }} />
      <div className="eyebrow">{d.directory}</div>
      <h1 className="serif" style={{ fontSize: "2rem", fontWeight: 500, margin: "10px 0 0" }}>{d.title}</h1>
      <p className="muted" style={{ marginTop: 8, fontSize: "0.90625rem", maxWidth: 640 }}>{d.intro}</p>
      {/* The short marker on each card says which figures these sentences are
          about; this says what the marker means, once, before a reader meets
          the first one. */}
      {statements.map((s) => (
        <p key={s} className="muted" style={{ marginTop: 6, fontSize: "0.78125rem", lineHeight: 1.7, maxWidth: 640 }}>{s}</p>
      ))}
      <div className="row gap8" style={{ marginTop: 12 }}><Link href={`/${locale}/market`} className="chip" style={{ textDecoration: "none", color: "var(--azure-d)" }}>{d.marketPulse}</Link></div>
      {KIND_ORDER.map((k) => {
        const group = locs.filter((l) => l.kind === k).sort((a, b) => b.count - a.count || a.name_en.localeCompare(b.name_en));
        if (group.length === 0) return null;
        const t = KIND_T[k];
        return (
          <section key={k} style={{ marginTop: 34 }}>
            <div className="row between wrap" style={{ alignItems: "baseline", gap: 10 }}>
              <h2 className="serif" style={{ fontSize: "1.375rem", fontWeight: 500, margin: 0 }}>{t[0]}</h2>
              <span className="muted" style={{ fontSize: "0.78125rem" }}>{t[1]}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%, 230px), 1fr))", gap: 14, marginTop: 14 }}>
              {group.map((l) => (
                <Link key={l.id} href={`/${locale}/listings?district=${l.id}`} className="card lift" style={{ textDecoration: "none", color: "inherit", padding: "16px 18px", display: "block" }}>
                  <div style={{ fontSize: "0.96875rem", fontWeight: 700 }}>{placeName(l, ar ? "ar" : "en")}</div>
                  <div className="muted" style={{ fontSize: "0.78125rem", marginTop: 3 }}>{cityLabel(l.city, locale as "en" | "ar")}{k === "development" ? d.projectSuffix : ""}</div>
                  <div className="mono" style={{ fontSize: "0.78125rem", marginTop: 10, color: "var(--harbor)", fontWeight: 600 }}>{`${l.count} ${l.count === 1 ? d.listedSpace : d.listedSpaces}`}</div>
                  {l.officeMedian != null && (
                    <div className="mono muted" style={{ fontSize: "0.71875rem", marginTop: 4 }}>{`${d.officeMedianPre}${l.officeMedian.toLocaleString("en-US")}${d.officeMedianSuf}`}</div>
                  )}
                  {l.officeMedian != null && l.officeSample && (
                    <div className="muted" style={{ fontSize: "0.6875rem", marginTop: 3 }}>{evidenceStateLabel("sample", ar)}</div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        );
      })}
      <p className="muted" style={{ marginTop: 30, fontSize: "0.75rem" }}>{d.footer}</p>
    </div>
  );
}
