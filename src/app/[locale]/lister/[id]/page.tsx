import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { releaseVisibleInventory } from "@/lib/inventory";
import { Icon } from "@/components/satkit";
import ListingCard from "@/components/ListingCard";
import JsonLd, { SITE } from "@/components/JsonLd";
import { getDictionary } from "@/i18n/getDictionary";
import { localeMeta } from "@/lib/meta";
import { fill, formatCounted } from "@/lib/format";
// ADV-1. accounts.verification_status is a workflow status, and account_verifications
// holds zero rows, so no account on the platform has a document behind it. The badge,
// the sentence under it and the page description all used to run off that status.
import { filingAccountOf, listerIdentityVerified, verifiedBadgeText } from "@/lib/listingVerification";
import { entityName } from "@/lib/displayName";
import DataState from "@/components/DataState";
import RetryButton from "@/components/RetryButton";

// A lister's PUBLIC profile: who they are, and every space they have live. Reads the
// listers_public view (the safe projection, only for accounts with a published
// listing), so it can never expose an account that is not already in the market.
export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  if (!isLocale(params.locale)) return {};
  const loc = (params.locale === "ar" ? "ar" : "en") as "en" | "ar";
  const t = getDictionary(loc).listerPage;
  const path = `/lister/${params.id}`;
  // A lister who cannot be loaded still gets a canonical and a reciprocal
  // language set. Returning an empty object here is what made this route inherit
  // the root layout's generic title with no canonical at all.
  let name: string | null = null;
  let verified = false;
  const sb = await getSupabaseServer();
  if (sb) {
    const { data } = await sb.from("listers_public").select("name_en,name_ar,lister_type,is_operator,is_verified,is_demo").eq("id", params.id).maybeSingle();
    if (data) {
      name = entityName(data as any, loc) || null;
      verified = listerIdentityVerified(filingAccountOf(data as any));
    }
  }
  // The Open Graph type is not passed from here. It comes from the route policy
  // in meta.ts, which leaves this route on the website default: listers_public
  // models an organization and carries no individual-person fields, so profile
  // would be a claim the data does not support, and a company profile is not an
  // article. The entity meaning lives in the Schema.org JSON-LD instead.
  if (!name) return localeMeta(params.locale, path, t.metaTitleFallback, t.metaDescFallback);
  // What SAT checked on this record is the lister's identity, so that is what
  // the sentence may say, and only when is_verified is actually true. It does
  // not follow that the spaces they publish are verified, and the head no longer
  // says so. The strip on the page itself already draws exactly this line.
  const desc = verified ? t.metaDescVerified : t.metaDesc;
  return localeMeta(params.locale, path, fill(t.metaTitle, { name }), fill(desc, { name }));
}

export default async function ListerProfilePage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale;
  const ar = lp === "ar";
  const dict = getDictionary(ar ? "ar" : "en");
  const t0 = dict.listerPage;
  // PKG-DISCOVERY-1 item 8, the lister profile's own instance of the
  // storage-unavailable/not-found distinction item 9 ruled for the listing
  // and flyer routes. `if (!sb) notFound()` and a discarded query `error`
  // both used to resolve to the same bare notFound() as a genuine "no such
  // lister", so a storage outage told a reader SAT has no such lister
  // rather than that the read could not be completed.
  const sb = await getSupabaseServer();
  if (!sb) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "64px 24px" }}>
        <DataState kind="error" title={t0.unavailableTitle} body={t0.unavailableBody} action={<RetryButton label={t0.retryLabel} />} />
      </div>
    );
  }

  const { data: lister, error: listerError } = await sb
    .from("listers_public")
    .select("id,name_en,name_ar,lister_type,is_operator,is_verified,is_demo,about_en,about_ar,website,public_email,public_phone,logo_url,member_since")
    .eq("id", params.id)
    .maybeSingle();
  if (listerError) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "64px 24px" }}>
        <DataState kind="error" title={t0.unavailableTitle} body={t0.unavailableBody} action={<RetryButton label={t0.retryLabel} />} />
      </div>
    );
  }
  if (!lister) notFound();
  const p: any = lister;
  // The badge below is an IDENTITY claim and nothing more. It never implied that the
  // spaces this lister publishes are verified, and now it does not imply that anyone
  // checked the lister either, unless someone did.
  const identityVerified = listerIdentityVerified(filingAccountOf(p));

  // PKG-CARD1. The card grid below now reads through `ListingCard`, which
  // resolves a listing's verified badges from the same four-part chain every
  // other card on the platform reads. That chain needs its own columns; the
  // narrower select this used to carry left them all undefined, which
  // `listingVerification.ts` resolves as unverified for every row regardless
  // of what the record actually says, silently understating a lister's own
  // verified listings on their own public profile.
  const { data: listings } = await releaseVisibleInventory(sb
    .from("listings")
    .select("id,title_en,title_ar,asset_type,area_sqm,building_grade,deal_type,asking_rent_sqm,sale_price,reference_code,created_at,ownership_verified,authorization_verified,right_to_market_confirmed,ad_permit_number,ad_permit_expires_at,is_demo,verified_at,verified_by,verification_method,lister_type,districts(name_en,name_ar,city)")
    .eq("account_id", params.id).eq("status", "published"))
    .order("created_at", { ascending: false }).limit(60);
  const rows = (listings || []) as any[];

  // Dossier facts, all non-sensitive and true OF the lister (never a judgment about
  // them): how many spaces they have live, the lease/sale split, and how long they
  // have been on the exchange. CR number and legal name are deliberately not exposed.
  const leaseCount = rows.filter((l) => l.deal_type === "lease").length;
  const saleCount = rows.filter((l) => l.deal_type === "sale").length;
  const memberYear = p.member_since && isFinite(new Date(p.member_since).getTime())
    ? new Date(p.member_since).getFullYear()
    : null;

  const name = entityName(p, ar ? "ar" : "en");
  // Finding 93. This used to fall back to the other language silently: an
  // Arabic reader with no `about_ar` on file was handed `about_en`, unlabelled,
  // as if it were the lister's own Arabic words. `entityName`'s reasoning does
  // not transfer here the way it does for a title: a registered name in the
  // wrong script is still recognisable at a glance, but a paragraph in the
  // wrong language is unreadable to the reader it is shown to. The paragraph
  // itself is not hidden (it is the lister's own written words, and hiding it
  // would be its own honesty failure toward a reader who could still read
  // that language), it is labelled: `aboutIsFallback` marks exactly the case
  // where the shown text is not in the reader's own language, and the render
  // below states that plainly, with `lang`/`dir` set to the paragraph's own
  // language rather than the page's.
  const aboutOwnLang = ar ? p.about_ar : p.about_en;
  const aboutOtherLang = ar ? p.about_en : p.about_ar;
  const about = aboutOwnLang || aboutOtherLang || "";
  const aboutIsFallback = !aboutOwnLang && !!aboutOtherLang;
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  // This page used to carry its own private EN and AR object, so its copy sat
  // outside the dictionaries and outside the controlled vocabulary entirely. It
  // reads the shared section now, and the live-space count is a real plural
  // rather than one Arabic noun form printed after every number.
  const t = dict.listerPage;
  const role = p.lister_type === "broker" ? t.roleBroker : t.roleOwner;
  const profileUrl = `${SITE}/${lp}/lister/${params.id}`;
  // The entity meaning this route's own generateMetadata comment promises lives
  // "in the Schema.org JSON-LD instead" of og:type, but nothing here ever
  // emitted any. RealEstateAgent is schema.org's subtype for a business that
  // acts as a broker; an owner is not one, so the type follows lister_type
  // exactly the way the visible role tag above does. Every field below is a
  // column this query actually selected: no address, no licence number and no
  // rating are invented to fill the shape out, because none of those live on
  // listers_public. `description` carries the About paragraph only when it is
  // already in the reader's own language, the same rule the visible fallback
  // notice above enforces, so structured data cannot restate finding 93's
  // defect in a place a screen reader and the page's own render never share.
  const listerEntity = {
    "@type": p.lister_type === "broker" ? "RealEstateAgent" : "Organization",
    "@id": `${profileUrl}#lister`,
    name,
    mainEntityOfPage: profileUrl,
    ...(p.website ? { url: p.website, sameAs: [p.website] } : {}),
    ...(p.logo_url ? { logo: p.logo_url, image: p.logo_url } : {}),
    ...(p.public_email ? { email: p.public_email } : {}),
    ...(p.public_phone ? { telephone: p.public_phone } : {}),
    ...(aboutOwnLang ? { description: aboutOwnLang } : {}),
  };

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 24px 64px", fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <JsonLd data={{ "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: dict.listers.crumbHome, item: `${SITE}/${lp}` },
        { "@type": "ListItem", position: 2, name: dict.listers.crumbListers, item: `${SITE}/${lp}/listers` },
        { "@type": "ListItem", position: 3, name, item: profileUrl },
      ] }} />
      <JsonLd data={listerEntity} />
      <div className="card" style={{ padding: 22, boxShadow: "var(--sh-1)", display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        {p.logo_url
          ? <img src={p.logo_url} alt={name} style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", flex: "none", border: "1px solid var(--silver)" }} />
          : <span className="avatar" style={{ width: 64, height: 64, borderRadius: 12, fontSize: "1.375rem", background: "var(--harbor)", flex: "none" }}>{initials}</span>}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="row gap10 wrap" style={{ alignItems: "center" }}>
            <h1 className="serif" style={{ fontSize: "1.625rem", fontWeight: 500, margin: 0 }}>{name}</h1>
            <span className="tag">{role}</span>
            {identityVerified && <span className="verified"><span className="dot" />{verifiedBadgeText("identity", ar)}</span>}
          </div>
          {/* Verification is the whole brand: state plainly that SAT checked the
              identity, when the lister is verified. A binary fact, not a rank. */}
          {identityVerified && (
            <div className="row gap6" style={{ marginTop: 8, alignItems: "center", color: "var(--verified)", fontSize: "0.78125rem" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              <span style={{ fontWeight: 600 }}>{t.verifiedBy}</span>
            </div>
          )}
          {/* Dossier stat strip: facts true OF the lister. No ratings, no tiers. */}
          <div className="row gap8 wrap" style={{ marginTop: 12, alignItems: "center", fontSize: "0.8125rem", color: "var(--slate)" }}>
            <span style={{ color: "var(--ink)", fontWeight: 700 }}>{formatCounted(rows.length, "liveSpace", lp)}</span>
            {leaseCount > 0 && <><span aria-hidden="true">·</span><span>{leaseCount} {t.forLease}</span></>}
            {saleCount > 0 && <><span aria-hidden="true">·</span><span>{saleCount} {t.forSale}</span></>}
            {memberYear && <><span aria-hidden="true">·</span><span>{t.since} <bdi dir="ltr">{memberYear}</bdi></span></>}
          </div>
          {about && (
            <div style={{ marginTop: 12, maxWidth: 680 }}>
              {aboutIsFallback && <p className="muted t-xs" style={{ margin: "0 0 4px" }}>{t.aboutOtherLanguage}</p>}
              <p className="muted" lang={ar && aboutIsFallback ? "en" : !ar && aboutIsFallback ? "ar" : undefined} dir={ar && aboutIsFallback ? "ltr" : !ar && aboutIsFallback ? "rtl" : undefined} style={{ fontSize: "0.875rem", lineHeight: 1.7 }}>{about}</p>
            </div>
          )}
          <div className="row gap10 wrap" style={{ marginTop: 12, fontSize: "0.8125rem" }}>
            {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer nofollow" className="chip" style={{ textDecoration: "none" }}><Icon.pin size={14} /> {t.website}</a>}
            {p.public_phone && <a href={`tel:${p.public_phone}`} className="chip" style={{ textDecoration: "none" }}>{p.public_phone}</a>}
            {p.public_email && <a href={`mailto:${p.public_email}`} className="chip" style={{ textDecoration: "none" }}>{p.public_email}</a>}
          </div>
          {/* Neutrality disclosure: when the operator lists, say so plainly. */}
          {p.is_operator && (
            <p className="muted" style={{ marginTop: 12, fontSize: "0.75rem", lineHeight: 1.6, maxWidth: 680, paddingTop: 12, borderTop: "1px solid var(--silver)" }}>{t.operator}</p>
          )}
        </div>
      </div>

      <div style={{ marginTop: 26 }}>
        <div className="modhead"><Icon.building size={18} /><span className="ttl" style={{ fontWeight: 700 }}>{t.spaces}</span><span className="muted" style={{ marginInlineStart: 8, fontSize: "0.8125rem" }}>{rows.length}</span></div>
        {rows.length === 0 ? (
          <p className="muted" style={{ marginTop: 12 }}>{t.none}</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%, 210px), 1fr))", gap: 16, marginTop: 14 }}>
            {/* PKG-CARD1. This grid used to draw its own card with no
                verification badge, no save affordance and its own price
                assembly, so the one surface built to show what a lister has
                live said nothing about which of it SAT has actually checked.
                `ListingCard` is now the one place a listing becomes a card. */}
            {rows.map((l) => (
              <ListingCard key={l.id} listing={l} locale={lp} ui={dict.ui} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
