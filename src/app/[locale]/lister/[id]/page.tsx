import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel, cityLabel } from "@/lib/labels";
import { Photo, Icon } from "@/components/satkit";
import { getDictionary } from "@/i18n/getDictionary";
import { SITE } from "@/components/JsonLd";

// A lister's PUBLIC profile: who they are, and every space they have live. Reads the
// listers_public view (the safe projection, only for accounts with a published
// listing), so it can never expose an account that is not already in the market.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) return {};
  const ar = params.locale === "ar";
  const sb = getSupabaseServer();
  if (!sb) return {};
  const { data } = await sb.from("listers_public").select("name_en,name_ar").eq("id", params.id).maybeSingle();
  const name = data ? ((ar ? (data as any).name_ar : (data as any).name_en) || (data as any).name_en) : null;
  if (!name) return { title: "SAT Markets" };
  return {
    title: ar ? `${name} | سات ماركتس` : `${name} | SAT Markets`,
    description: ar ? `مساحات ${name} المعروضة والموثّقة على سات ماركتس.` : `Verified spaces listed by ${name} on SAT Markets.`,
    alternates: { canonical: `${SITE}/${params.locale}/lister/${params.id}` },
  };
}

export default async function ListerProfilePage({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale;
  const ar = lp === "ar";
  const dict = getDictionary(ar ? "ar" : "en");
  const sb = getSupabaseServer();
  if (!sb) notFound();

  const { data: lister } = await sb
    .from("listers_public")
    .select("id,name_en,name_ar,lister_type,is_operator,is_verified,about_en,about_ar,website,public_email,public_phone,logo_url")
    .eq("id", params.id)
    .maybeSingle();
  if (!lister) notFound();
  const p: any = lister;

  const { data: listings } = await sb
    .from("listings")
    .select("id,title_en,title_ar,asset_type,area_sqm,deal_type,asking_rent_sqm,sale_price,reference_code,districts(name_en,name_ar,city)")
    .eq("account_id", params.id).eq("status", "published")
    .order("created_at", { ascending: false }).limit(60);
  const rows = (listings || []) as any[];

  const name = (ar ? p.name_ar : p.name_en) || p.name_en || "";
  const about = (ar ? p.about_ar : p.about_en) || p.about_en || p.about_ar || "";
  const role = p.lister_type === "broker" ? (ar ? "وسيط مرخّص" : "Licensed broker") : (ar ? "مالك" : "Owner");
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const t = ar
    ? { spaces: "المساحات المعروضة", none: "لا مساحات معروضة حالياً.", website: "الموقع", verified: "موثّق", contact: "تواصل", onReq: "عند الطلب" }
    : { spaces: "Spaces on the market", none: "No spaces are live right now.", website: "Website", verified: "Verified", contact: "Contact", onReq: "On request" };

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 24px 64px", fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <div className="card" style={{ padding: 22, boxShadow: "var(--sh-1)", display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        {p.logo_url
          ? <img src={p.logo_url} alt={name} style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", flex: "none", border: "1px solid var(--silver)" }} />
          : <span className="avatar" style={{ width: 64, height: 64, borderRadius: 12, fontSize: 22, background: "var(--harbor)", flex: "none" }}>{initials}</span>}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="row gap10 wrap" style={{ alignItems: "center" }}>
            <h1 className="serif" style={{ fontSize: 26, fontWeight: 500, margin: 0 }}>{name}</h1>
            <span className="tag">{role}</span>
            {p.is_verified && <span className="verified"><span className="dot" />{t.verified}</span>}
          </div>
          {about && <p className="muted" style={{ fontSize: 14, lineHeight: 1.7, marginTop: 10, maxWidth: 680 }}>{about}</p>}
          <div className="row gap10 wrap" style={{ marginTop: 12, fontSize: 13 }}>
            {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer nofollow" className="chip" style={{ textDecoration: "none" }}><Icon.pin size={14} /> {t.website}</a>}
            {p.public_phone && <a href={`tel:${p.public_phone}`} className="chip" style={{ textDecoration: "none" }}>{p.public_phone}</a>}
            {p.public_email && <a href={`mailto:${p.public_email}`} className="chip" style={{ textDecoration: "none" }}>{p.public_email}</a>}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 26 }}>
        <div className="modhead"><Icon.building size={18} /><span className="ttl" style={{ fontWeight: 700 }}>{t.spaces}</span><span className="muted" style={{ marginInlineStart: 8, fontSize: 13 }}>{rows.length}</span></div>
        {rows.length === 0 ? (
          <p className="muted" style={{ marginTop: 12 }}>{t.none}</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 16, marginTop: 14 }}>
            {rows.map((l) => {
              const dn = l.districts ? (ar ? l.districts.name_ar : l.districts.name_en) : dict.ld.riyadh;
              const price = l.deal_type === "lease" ? l.asking_rent_sqm : l.sale_price;
              return (
                <Link key={l.id} href={`/${lp}/listings/${l.id}`} className="listing" style={{ textDecoration: "none", color: "inherit" }}>
                  <Photo kind={l.asset_type} alt={`${assetLabel(l.asset_type, lp)}, ${dn}`} h={130} />
                  <div className="body" style={{ padding: "10px 12px 12px" }}>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{price != null ? Number(price).toLocaleString("en-US") : t.onReq}<small style={{ fontWeight: 400, color: "var(--slate)" }}>{price != null ? (l.deal_type === "lease" ? (ar ? " ريال/م²·سنة" : " SAR/m²·yr") : (ar ? " ريال" : " SAR")) : ""}</small></div>
                    <div style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.35 }}>{(ar ? l.title_ar : l.title_en) || l.reference_code}</div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>{dn} · <bdi dir="ltr">{l.area_sqm} m²</bdi></div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
