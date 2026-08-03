import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { Icon } from "@/components/satkit";
import ProfileForm from "@/components/ProfileForm";
import { entityName } from "@/lib/displayName";

// The owner's profile editor. Their public identity and verification are shown
// read-only (SAT owns those); the about text, website, public contact and logo are
// editable and appear on the public lister page.
export const dynamic = "force-dynamic";

export default async function ProfilePage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale;
  const ar = lp === "ar";

  const su = await getSessionUser();
  if (!su) redirect(`/${lp}/login`);
  if (!su.accountId) redirect(`/${lp}`);
  const sb = await getSupabaseServer();
  if (!sb) notFound();

  const { data: acct } = await sb
    .from("accounts")
    .select("id,name_en,name_ar,type,verification_status,about_en,about_ar,website,public_email,public_phone,logo_url")
    .eq("id", su.accountId)
    .maybeSingle();
  const a: any = acct || {};

  const t = ar ? {
    title: "ملفي العام", sub: "ما يراه المستأجرون عنك",
    viewPublic: "عرض الملف العام", name: "الاسم", type: "النوع", verification: "التحقّق",
    verified: "موثّق", pending: "قيد التحقّق", identityNote: "الاسم والنوع والتحقّق تُدار عبر سات ولا تُعدَّل من هنا.",
    edit: "تفاصيل الملف",
    typeLabels: { sat: "شركة سات (وسيط مرخّص)", broker: "وسيط مرخّص", owner: "مالك", investor: "مستثمر" } as Record<string, string>,
  } : {
    title: "Your public profile", sub: "What tenants see about you",
    viewPublic: "View public profile", name: "Name", type: "Type", verification: "Verification",
    verified: "Verified", pending: "Pending verification", identityNote: "Name, type, and verification are managed by SAT and are not edited here.",
    edit: "Profile details",
    typeLabels: { sat: "SAT Real Estate (licensed broker)", broker: "Licensed broker", owner: "Owner", investor: "Investor" } as Record<string, string>,
  };

  const name = entityName(a, ar ? "ar" : "en");
  const verified = a.verification_status === "verified";

  return (
    <div>
      <div className="row between wrap" style={{ alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-.01em", margin: 0 }}>{t.title}</h1>
          <div className="muted" style={{ fontSize: "0.8125rem", marginTop: 3 }}>{t.sub}</div>
        </div>
        <Link href={`/${lp}/lister/${a.id}`} className="chip" style={{ textDecoration: "none" }}><Icon.arrow size={15} /> {t.viewPublic}</Link>
      </div>

      <div className="dpanel" style={{ padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 160px), 1fr))", gap: 14 }}>
          <div>
            <div className="muted" style={{ fontSize: "0.71875rem" }}>{t.name}</div>
            <div style={{ fontSize: "0.90625rem", fontWeight: 600, marginTop: 5 }}>{name}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.71875rem" }}>{t.type}</div>
            <div style={{ fontSize: "0.84375rem", marginTop: 6 }}>{t.typeLabels[a.type] || a.type}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.71875rem" }}>{t.verification}</div>
            <div style={{ marginTop: 5 }}><span className={"statusdot " + (verified ? "ok" : "pend")} style={{ fontSize: "0.8125rem" }}>{verified ? t.verified : t.pending}</span></div>
          </div>
        </div>
        <div className="muted" style={{ fontSize: "0.71875rem", lineHeight: 1.6, marginTop: 14, borderTop: "1px solid var(--silver)", paddingTop: 12 }}>{t.identityNote}</div>
      </div>

      <div className="dpanel" style={{ padding: 20, marginTop: 18 }}>
        <div style={{ fontSize: "0.90625rem", fontWeight: 700, marginBottom: 14 }}>{t.edit}</div>
        <ProfileForm
          locale={lp}
          init={{
            about_en: a.about_en || "",
            about_ar: a.about_ar || "",
            website: a.website || "",
            public_email: a.public_email || "",
            public_phone: a.public_phone || "",
            logo_url: a.logo_url || "",
          }}
        />
      </div>
    </div>
  );
}
