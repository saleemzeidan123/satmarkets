import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel, dealLabel } from "@/lib/labels";
import { Icon } from "@/components/satkit";
import ListingStatusToggle from "@/components/ListingStatusToggle";
import EditListingForm from "@/components/EditListingForm";
import ListingMediaManager from "@/components/ListingMediaManager";
import { gateFailures, gateReasonsText, permitOf } from "@/lib/gate";
import { intakeFields } from "@/lib/assetFields";

const BASE_OWNED = new Set(["asking_rent_sqm", "sale_price"]);

// The owner's manage page for one listing: status and actions at the top, a
// self-serve editor for the fields they control, and the licence and verification
// shown read-only (those change through SAT, not here). Reaching this page from the
// My listings row is what finally lets an owner edit their own listing.
export const dynamic = "force-dynamic";

export default async function ManageListingPage({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale;
  const ar = lp === "ar";

  const su = await getSessionUser();
  if (!su) redirect(`/${lp}/login`);
  if (!su.accountId) redirect(`/${lp}`);
  const sb = getSupabaseServer();
  if (!sb) notFound();

  // The owner's own row: select everything so the per-asset registry can read its
  // column-backed values (grade, fit-out, clear height, and so on) alongside the
  // jsonb attributes, without enumerating 15 asset types' worth of columns here.
  const { data: l } = await sb
    .from("listings")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!l) notFound();
  if ((l as any).account_id !== su.accountId) notFound(); // not yours: do not confirm it exists

  const L: any = l;

  // Seed the editor's per-asset fields from the listing's current state: a
  // column-backed field reads its column, everything else reads the attributes blob.
  // Booleans stay boolean; every other type becomes a string for the inputs.
  const existingAttrs: Record<string, unknown> = (L.attributes && typeof L.attributes === "object") ? L.attributes : {};
  const initAttrs: Record<string, unknown> = {};
  for (const field of intakeFields(L.asset_type)) {
    if (BASE_OWNED.has(field.key)) continue;
    const raw = field.column ? L[field.column] : existingAttrs[field.key];
    if (raw === null || raw === undefined) { initAttrs[field.key] = field.type === "boolean" ? false : ""; continue; }
    initAttrs[field.key] = field.type === "boolean" ? raw === true : String(raw);
  }

  // The listing's photos, in display order, each signed for the owner (RLS lets an
  // owner read their own media on any status; the URLs are short-lived).
  const { data: mediaRows } = await sb
    .from("listing_media")
    .select("id,path,sort_order")
    .eq("listing_id", params.id)
    .eq("kind", "photo")
    .order("sort_order");
  const photos: { id: string; url: string | null }[] = [];
  for (const m of (mediaRows ?? []) as { id: string; path: string }[]) {
    const { data: signed } = await sb.storage.from("listing-media").createSignedUrl(String(m.path), 3600);
    photos.push({ id: m.id, url: signed?.signedUrl ?? null });
  }
  const t = ar ? {
    back: "عروضي", edit: "تعديل التفاصيل", viewPublic: "عرض الصفحة العامة", locked: "الترخيص والتحقّق",
    lockedNote: "رقم رخصة الإعلان والتحقّق من الملكية لا تُعدَّل من هنا؛ تغييرها يتطلّب مراجعة سات ويحمي شارة التوثيق.",
    permit: "رخصة الإعلان", expires: "تنتهي", verifiedOwner: "مالك موثّق", pendingV: "قيد التحقّق",
    pause: "إيقاف مؤقّت", resume: "إعادة النشر", working: "جارٍ", cannot: "تعذّرت إعادة النشر:",
    st: { published: "منشور", archived: "موقوف", draft: "مسودة", pending_review: "قيد المراجعة", approved: "معتمد", rejected: "مرفوض" } as Record<string, string>,
  } : {
    back: "My listings", edit: "Edit details", viewPublic: "View public listing", locked: "Licence and verification",
    lockedNote: "The advertising licence number and ownership verification are not edited here; changing them goes through SAT review and protects the Verified badge.",
    permit: "Advertising licence", expires: "Expires", verifiedOwner: "Verified owner", pendingV: "Pending verification",
    pause: "Pause", resume: "Republish", working: "Working", cannot: "Cannot republish:",
    st: { published: "Published", archived: "Paused", draft: "Draft", pending_review: "In review", approved: "Approved", rejected: "Rejected" } as Record<string, string>,
  };

  const live = L.status === "published";
  const fails = L.status === "archived" ? gateFailures(L) : [];
  const blocked = fails.length ? gateReasonsText(fails, ar) : null;
  const price = L.deal_type === "lease" ? L.asking_rent_sqm : L.sale_price;
  const title = (ar ? L.title_ar : L.title_en) || L.title_en;
  const verified = L.ownership_verified || L.authorization_verified || L.is_sat_listed;
  const expiry = L.ad_permit_expires_at ? new Date(L.ad_permit_expires_at).toLocaleDateString(ar ? "ar-SA-u-nu-latn" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null;

  return (
    <div>
      <Link href={`/${lp}/dashboard/listings`} className="mono muted" style={{ fontSize: 12, textDecoration: "none" }}>{ar ? "→" : "←"} {t.back}</Link>

      <div className="row between wrap" style={{ alignItems: "flex-start", gap: 12, margin: "10px 0 18px" }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.01em", margin: 0 }}>{title}</h1>
          <div className="row gap10" style={{ marginTop: 6, alignItems: "center" }}>
            <span className={"statusdot " + (live ? "ok" : "pend")} style={{ fontSize: 12.5 }}>{t.st[L.status] || L.status}</span>
            <span className="muted" style={{ fontSize: 12.5 }}>· {assetLabel(L.asset_type, lp)} · {dealLabel(L.deal_type, lp)}</span>
          </div>
        </div>
        <div className="row gap10" style={{ alignItems: "center" }}>
          <Link href={`/${lp}/listings/${L.id}`} className="chip" style={{ textDecoration: "none" }}><Icon.arrow size={15} /> {t.viewPublic}</Link>
          <ListingStatusToggle id={L.id} status={L.status} blocked={blocked} t={{ pause: t.pause, resume: t.resume, working: t.working, cannot: t.cannot }} />
        </div>
      </div>

      <div className="dpanel" style={{ padding: 20 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 14 }}>{t.edit}</div>
        <EditListingForm
          id={L.id}
          locale={lp}
          assetType={L.asset_type}
          initAttrs={initAttrs}
          init={{
            title_en: L.title_en || "",
            description_en: L.description_en || "",
            area_sqm: L.area_sqm != null ? String(L.area_sqm) : "",
            price: price != null ? String(price) : "",
            deal_type: L.deal_type,
            video_url: L.video_url || "",
            contact_phone: L.contact_phone || "",
            contact_email: L.contact_email || "",
            contact_channels: Array.isArray(L.contact_channels) ? L.contact_channels : [],
          }}
        />
      </div>

      <div className="dpanel" style={{ padding: 20, marginTop: 18 }}>
        <ListingMediaManager id={L.id} locale={lp} photos={photos} />
      </div>

      <div className="dpanel" style={{ padding: 20, marginTop: 18 }}>
        <div className="row gap8" style={{ alignItems: "center", marginBottom: 6 }}>
          <span className="muted" style={{ display: "inline-flex" }}><Icon.info size={15} /></span>
          <span style={{ fontSize: 14.5, fontWeight: 700 }}>{t.locked}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginTop: 10 }}>
          <div>
            <div className="muted" style={{ fontSize: 11.5 }}>{t.permit}</div>
            <div className="mono" style={{ fontSize: 14, fontWeight: 500, marginTop: 5 }}>{permitOf(L) || "—"}</div>
          </div>
          {expiry && (
            <div>
              <div className="muted" style={{ fontSize: 11.5 }}>{t.expires}</div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 500, marginTop: 5 }}>{expiry}</div>
            </div>
          )}
          <div>
            <div className="muted" style={{ fontSize: 11.5 }}>{ar ? "التحقّق" : "Verification"}</div>
            <div style={{ marginTop: 5 }}>
              <span className={"statusdot " + (verified ? "ok" : "pend")} style={{ fontSize: 13 }}>{verified ? t.verifiedOwner : t.pendingV}</span>
            </div>
          </div>
        </div>
        <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.6, marginTop: 14, borderTop: "1px solid var(--silver)", paddingTop: 12 }}>{t.lockedNote}</div>
      </div>
    </div>
  );
}
