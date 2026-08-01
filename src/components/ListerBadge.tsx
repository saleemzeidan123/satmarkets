import Link from "next/link";
import { Icon } from "@/components/satkit";
import type { Lister } from "@/lib/queries/listings";
import { filingAccountOf, listerIdentityVerified } from "@/lib/listingVerification";
import { entityName } from "@/lib/displayName";

// WHO IS LISTING THIS, AND ARE THEY US.
//
// Every listing says who filed it. That is ordinary marketplace hygiene: a tenant should
// know whether they are talking to the owner of the building or to a broker acting for
// them. This used to sit at the tail of the contact rail, under a tall form, where it
// read as a footnote and, worse, floated loose because the rail was sticky. It now lives
// as a byline directly under the listing title: identity next to the listing's identity,
// read before anyone decides to engage.
//
// The part that is not ordinary is `is_operator`. SAT Real Estate is a licensed brokerage
// AND it runs this exchange. Both facts are true, and hiding the second one while asking
// brokers to trust a neutral platform is not a position you can hold. So its listings say
// so, on the listing, next to everyone else's. The mark is a DISCLOSURE, not a decoration:
// SAT's listings sit in the same ranking, clear the same publish gate, need the same
// advertising licence, and get no badge or placement another broker cannot earn.
export default function ListerBadge({ lister, ar, locale }: { lister: Lister | null; ar: boolean; locale?: string }) {
  if (!lister) return null;
  const lp = locale || (ar ? "ar" : "en");

  const name = entityName(lister, ar ? "ar" : "en");
  if (!name) return null;

  const role =
    lister.lister_type === "broker"
      ? (ar ? "وسيط مرخّص" : "Licensed broker")
      : (ar ? "المالك" : "Owner");

  const initials = String(name).trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div
      className="lister-byline"
      style={{
        marginTop: 16,
        padding: "12px 14px",
        border: "1px solid var(--silver)",
        borderRadius: 12,
        background: "var(--paper)",
      }}
    >
      <div className="row gap10" style={{ alignItems: "center" }}>
        <span
          className="avatar"
          aria-hidden
          style={{ width: 40, height: 40, borderRadius: 10, background: "var(--harbor)", color: "var(--on-brand)", fontSize: 14, fontWeight: 600, flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        >
          {initials}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="muted" style={{ fontSize: 10.5, letterSpacing: ".05em", textTransform: "uppercase" }}>
            {ar ? "الإعلان مقدَّم من" : "Listed by"}
          </div>
          <div className="row gap8 wrap" style={{ alignItems: "center", marginTop: 2 }}>
            <Link href={`/${lp}/lister/${lister.id}`} style={{ fontSize: 15.5, fontWeight: 600, color: "var(--harbor)", textDecoration: "none" }}>{name}</Link>
            {/* ADV-1. This drew a bare green "Verified" from
                accounts.verification_status, which is a workflow status and not a
                check: account_verifications holds zero rows, so no account on the
                platform has a document behind it. A status is not evidence, and a
                badge with no named dimension is the claim O3 removes. */}
            {listerIdentityVerified(filingAccountOf(lister)) && (
              <span className="verified"><span className="dot" />{ar ? "الهوية موثّقة" : "Identity verified"}</span>
            )}
            <span className="tag">{role}</span>
          </div>
        </div>
      </div>

      {lister.is_operator && (
        <div
          className="row gap8"
          style={{ alignItems: "flex-start", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--silver)" }}
        >
          <span style={{ color: "var(--slate)", marginTop: 1, flex: "none" }}><Icon.info size={13} /></span>
          <span style={{ fontSize: 11.5, lineHeight: 1.6, color: "var(--slate)" }}>
            {ar
              ? "شركة سات العقارية هي مشغّلة هذه المنصة، وتُدرج إعلاناتها هنا كأي وسيط مرخّص. لا تحصل إعلاناتها على أي أفضلية في الترتيب أو العرض، وتخضع لذات قواعد التحقق ورخصة الإعلان."
              : "SAT Real Estate operates this exchange and lists here as any licensed broker does. Its listings get no ranking or placement advantage, and clear the same verification and advertising-licence rules as everyone else's."}
          </span>
        </div>
      )}
    </div>
  );
}
