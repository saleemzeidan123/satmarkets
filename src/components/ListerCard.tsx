import Link from "next/link";
import { entityName } from "@/lib/displayName";
import { filingAccountOf, listerIdentityVerified, verifiedBadgeText } from "@/lib/listingVerification";
import type { ListerRow } from "@/lib/queries/listers";
import { Icon } from "@/components/satkit";

// PKG-DISCOVERY-1, item 6. The directory's one card. It shows exactly what
// `listers_public` records and nothing this codebase would have to guess:
// name, role, identity-verification state (through the same dimension
// resolver `ListerBadge` and `/lister/[id]` already use, never the raw
// `is_verified` column directly, which is a workflow flag and not a check),
// and how long the account has been on the exchange. No licence, expertise,
// performance, activity or specialisation claim, because the record does not
// carry one: this card cannot invent "top broker" or "5 years experience"
// out of columns that do not exist.
export default function ListerCard({
  lister,
  ar,
  locale,
  sinceLabel,
  roleLabel,
  unnamedLabel,
}: {
  lister: ListerRow;
  ar: boolean;
  locale: string;
  sinceLabel: string;
  /** Already-resolved, dictionary-sourced role text (listerPage.roleOwner /
   * listerPage.roleBroker), so this card and the profile page it links to
   * cannot drift into naming the same role two different ways. */
  roleLabel: string;
  unnamedLabel: string;
}) {
  const name = entityName(lister, ar ? "ar" : "en") || unnamedLabel;
  const initials = name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const verified = listerIdentityVerified(filingAccountOf(lister));
  // PKG-DISCOVERY-1 visible-polish follow-up. `roleLabel` already tells the
  // reader owner vs. broker in text; this adds the same glyph the persona
  // picker on Home uses for the broker path (Icon.shield, "I am a licensed
  // broker") so the directory is scannable by shape too, not just by text.
  // Driven off `lister.lister_type`, a column this card already receives,
  // not a new claim.
  const RoleIcon = lister.lister_type === "broker" ? Icon.shield : Icon.user;
  const year = lister.member_since && isFinite(new Date(lister.member_since).getTime())
    ? new Date(lister.member_since).getFullYear()
    : null;

  return (
    <Link href={`/${locale}/lister/${lister.id}`} className="card" style={{ display: "block", padding: 16, textDecoration: "none", color: "inherit" }}>
      <div className="row gap10" style={{ alignItems: "center" }}>
        {lister.logo_url
          ? <img src={lister.logo_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flex: "none", border: "1px solid var(--silver)" }} />
          : <span className="avatar" aria-hidden style={{ width: 44, height: 44, borderRadius: 10, fontSize: "0.9375rem", fontWeight: 600, background: "var(--harbor)", color: "var(--on-brand)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{initials}</span>}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: "1rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><bdi>{name}</bdi></div>
          <div className="row gap6 wrap" style={{ alignItems: "center", marginTop: 4 }}>
            <span className="tag row gap6" style={{ alignItems: "center", display: "inline-flex" }}><RoleIcon size={12} /> {roleLabel}</span>
            {lister.is_operator && <span className="tag">{ar ? "سات العقارية" : "SAT Real Estate"}</span>}
          </div>
        </div>
      </div>
      {verified && (
        <div className="row gap6" style={{ alignItems: "center", marginTop: 10, color: "var(--verified)", fontSize: "0.78125rem" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
          <span style={{ fontWeight: 600 }}>{verifiedBadgeText("identity", ar)}</span>
        </div>
      )}
      {year && <div className="muted" style={{ fontSize: "0.75rem", marginTop: verified ? 4 : 10 }}>{sinceLabel} <bdi dir="ltr">{year}</bdi></div>}
    </Link>
  );
}
