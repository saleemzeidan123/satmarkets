import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { cityLabel } from "@/lib/labels";
import JsonLd, { SITE } from "@/components/JsonLd";

export const revalidate = 3600;

type Loc = { id: string; city: string; name_en: string; name_ar: string; kind: string; count: number; officeMedian: number | null };

const KIND_ORDER = ["district", "development", "area"];

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const ar = params.locale === "ar";
  return {
    title: ar ? "المواقع التجارية في المملكة | سات ماركتس" : "Commercial locations across Saudi Arabia | SAT Markets",
    description: ar
      ? "الأحياء والمشاريع والمناطق التجارية التي تغطيها سات ماركتس، مع عدد المساحات الموثّقة ووسيط مؤشر الإيجارات للمكاتب حيث تكفي البيانات."
      : "The commercial districts, developments and areas SAT Markets covers across Saudi Arabia, with verified space counts and the office Rent Index median where the data is sufficient.",
    alternates: { canonical: `${SITE}/${params.locale}/locations`, languages: { en: `${SITE}/en/locations`, ar: `${SITE}/ar/locations` } },
    openGraph: { title: ar ? "المواقع التجارية في المملكة | سات ماركتس" : "Commercial locations across Saudi Arabia | SAT Markets", url: `${SITE}/${params.locale}/locations`, type: "website", siteName: "SAT Markets" },
  };
}

export default async function LocationsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const sb = getSupabaseServer();
  let locs: Loc[] = [];
  if (sb) {
    const [{ data: ds }, { data: ls }, { data: idx }] = await Promise.all([
      sb.from("districts").select("id,city,name_en,name_ar,kind"),
      sb.from("listings").select("district_id").eq("status", "published").limit(1000),
      sb.from("rent_index_published").select("district_id,asset_type,median,sufficient,unit").eq("sufficient", true).eq("asset_type", "office").eq("unit", "sar_sqm_year"),
    ]);
    const counts = new Map<string, number>();
    (ls ?? []).forEach((l: any) => { if (l.district_id) counts.set(l.district_id, (counts.get(l.district_id) ?? 0) + 1); });
    const med = new Map<string, number>();
    (idx ?? []).forEach((r: any) => { if (r.median != null && !med.has(r.district_id)) med.set(r.district_id, Number(r.median)); });
    locs = (ds ?? []).map((d: any) => ({ id: d.id, city: d.city, name_en: d.name_en, name_ar: d.name_ar, kind: d.kind || "district", count: counts.get(d.id) ?? 0, officeMedian: med.get(d.id) ?? null }));
  }
  const KIND_T: Record<string, [string, string, string, string]> = {
    district: ["Districts", "الأحياء", "Established commercial districts.", "أحياء تجارية قائمة."],
    development: ["Developments and destinations", "المشاريع والوجهات", "Master-planned projects, for example KAFD by PIF. A development is not a district.", "مشاريع كبرى مخططة، مثل واجهة الرياض المالية التابعة لصندوق الاستثمارات العامة. المشروع ليس حياً."],
    area: ["Areas", "المناطق", "Broader commercial areas.", "مناطق تجارية أوسع."],
  };
  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 24px 64px", fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <JsonLd data={{ "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: ar ? "الرئيسية" : "Home", item: `${SITE}/${locale}` },
        { "@type": "ListItem", position: 2, name: ar ? "المواقع" : "Locations", item: `${SITE}/${locale}/locations` },
      ] }} />
      <JsonLd data={{ "@type": "ItemList", name: ar ? "المواقع التجارية في السعودية" : "Commercial locations in Saudi Arabia", numberOfItems: locs.length, itemListElement: locs.map((l, i) => ({ "@type": "ListItem", position: i + 1, name: `${(ar ? l.name_ar : l.name_en) || l.name_en}, ${cityLabel(l.city, locale)}`, url: `${SITE}/${locale}/listings?district=${l.id}` })) }} />
      <div className="eyebrow">{ar ? "الدليل" : "The directory"}</div>
      <h1 className="serif" style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-.02em", margin: "10px 0 0" }}>{ar ? "المواقع التجارية في المملكة" : "Commercial locations across the Kingdom"}</h1>
      <p className="muted" style={{ marginTop: 8, fontSize: 14.5, maxWidth: 640 }}>{ar ? "الأحياء والمشاريع والمناطق التي تغطيها المنصّة، مع عدد المساحات الموثّقة ووسيط مؤشر الإيجارات للمكاتب حيث تتوفر بيانات كافية." : "The districts, developments and areas the exchange covers, with verified space counts and the SAT office index median where the data is sufficient."}</p>
      <div className="row gap8" style={{ marginTop: 12 }}><Link href={`/${locale}/market`} className="chip" style={{ textDecoration: "none", color: "var(--azure-d)" }}>{ar ? "نبض السوق" : "Market pulse"}</Link></div>
      {KIND_ORDER.map((k) => {
        const group = locs.filter((l) => l.kind === k).sort((a, b) => b.count - a.count || a.name_en.localeCompare(b.name_en));
        if (group.length === 0) return null;
        const t = KIND_T[k];
        return (
          <section key={k} style={{ marginTop: 34 }}>
            <div className="row between wrap" style={{ alignItems: "baseline", gap: 10 }}>
              <h2 className="serif" style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>{ar ? t[1] : t[0]}</h2>
              <span className="muted" style={{ fontSize: 12.5 }}>{ar ? t[3] : t[2]}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 14, marginTop: 14 }}>
              {group.map((l) => (
                <Link key={l.id} href={`/${locale}/listings?district=${l.id}`} className="card lift" style={{ textDecoration: "none", color: "inherit", padding: "16px 18px", display: "block" }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700 }}>{(ar ? l.name_ar : l.name_en) || l.name_en}</div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>{cityLabel(l.city, locale as "en" | "ar")}{k === "development" ? (ar ? " · مشروع" : " · project") : ""}</div>
                  <div className="mono" style={{ fontSize: 12.5, marginTop: 10, color: "var(--harbor)", fontWeight: 600 }}>{ar ? `${l.count} مساحة موثّقة` : `${l.count} verified ${l.count === 1 ? "space" : "spaces"}`}</div>
                  {l.officeMedian != null && (
                    <div className="mono muted" style={{ fontSize: 11.5, marginTop: 4 }}>{ar ? `وسيط المكاتب ${l.officeMedian.toLocaleString("en-US")} ريال/م²·سنة` : `Office median ${l.officeMedian.toLocaleString("en-US")} SAR/m²·yr`}</div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        );
      })}
      <p className="muted" style={{ marginTop: 30, fontSize: 12 }}>{ar ? "الوسيط من مؤشر الإيجارات، عيّنة المنصّة، للشرائح ذات البيانات الكافية فقط. استرشادي وليس نصيحة." : "Medians come from the Rent Index, platform sample, sufficient segments only. Indicative, not advice."}</p>
    </div>
  );
}
