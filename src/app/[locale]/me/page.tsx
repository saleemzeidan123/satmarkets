import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel } from "@/lib/labels";
import { Photo, Icon } from "@/components/satkit";
import { getDictionary } from "@/i18n/getDictionary";

// The occupier's home. Demand-side users (a signed-in person with no supply account)
// land here after sign-in, not in the owner dashboard. It gathers what an occupier
// signed up FOR: the listings they saved, and a door to their message threads. Their
// saved list is account-backed now, so it follows them across devices.
export const dynamic = "force-dynamic";

export default async function OccupierHome({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale;
  const ar = lp === "ar";
  const dict = getDictionary(ar ? "ar" : "en");

  const su = await getSessionUser();
  if (!su) redirect(`/${lp}/login`);
  // Supply-side accounts have their own dashboard; this home is for occupiers.
  if (su.accountId) redirect(`/${lp}/dashboard`);
  const sb = getSupabaseServer();

  let rows: any[] = [];
  let threadCount = 0;
  if (sb) {
    const { data: saved } = await sb.from("saved_listings").select("listing_id").order("created_at", { ascending: false });
    const ids = (saved ?? []).map((r: any) => r.listing_id);
    if (ids.length) {
      const { data: ls } = await sb
        .from("listings")
        .select("id,title_en,title_ar,asset_type,area_sqm,deal_type,asking_rent_sqm,sale_price,reference_code,districts(name_en,name_ar,city)")
        .in("id", ids)
        .eq("status", "published");
      // Preserve saved order (newest first).
      const byId = new Map((ls ?? []).map((l: any) => [l.id, l]));
      rows = ids.map((id: string) => byId.get(id)).filter(Boolean);
    }
    const { count } = await sb.from("conversations").select("id", { count: "exact", head: true });
    threadCount = count ?? 0;
  }

  const t = ar
    ? { hi: "أهلاً بك", sub: "مساحتك على سات ماركتس: محفوظاتك ومراسلاتك في مكان واحد.", saved: "المحفوظات", none: "لم تحفظ أي مساحة بعد.", browse: "تصفّح المساحات", messages: "الرسائل", msgSub: "محادثاتك مع المُعلنين", onReq: "عند الطلب", openMsgs: "فتح الرسائل", explore: "استكشف السوق" }
    : { hi: "Welcome", sub: "Your space on SAT Markets: your saved listings and messages in one place.", saved: "Saved", none: "You have not saved any spaces yet.", browse: "Browse spaces", messages: "Messages", msgSub: "Your conversations with listers", onReq: "On request", openMsgs: "Open messages", explore: "Explore the market" };

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 24px 64px", fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <div className="row between wrap" style={{ alignItems: "flex-end", gap: 12 }}>
        <div>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 500, margin: 0 }}>{t.hi}</h1>
          <p className="muted" style={{ fontSize: 14, marginTop: 6, maxWidth: 560 }}>{t.sub}</p>
        </div>
        <Link href={`/${lp}/listings`} className="btn secondary sm" style={{ textDecoration: "none" }}><Icon.building size={15} /> {t.explore}</Link>
      </div>

      {/* Messages door */}
      <Link href={`/${lp}/messages`} className="card pad row between" style={{ marginTop: 22, alignItems: "center", boxShadow: "var(--sh-1)", textDecoration: "none", color: "inherit" }}>
        <div className="row gap12" style={{ alignItems: "center" }}>
          <span style={{ color: "var(--harbor)", display: "inline-flex" }}><Icon.inbox size={20} /></span>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>{t.messages}{threadCount ? <span className="muted" style={{ fontWeight: 400 }}> · {threadCount}</span> : null}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>{t.msgSub}</div>
          </div>
        </div>
        <span className="btn secondary sm">{t.openMsgs}</span>
      </Link>

      {/* Saved listings */}
      <div style={{ marginTop: 26 }}>
        <div className="modhead"><Icon.heart size={18} /><span className="ttl" style={{ fontWeight: 700 }}>{t.saved}</span><span className="muted" style={{ marginInlineStart: 8, fontSize: 13 }}>{rows.length}</span></div>
        {rows.length === 0 ? (
          <div style={{ padding: "22px 0" }}>
            <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>{t.none}</p>
            <Link href={`/${lp}/listings`} className="btn secondary sm" style={{ marginTop: 12, textDecoration: "none" }}>{t.browse}</Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 16, marginTop: 14 }}>
            {rows.map((l: any) => {
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
