import { Icon } from "@/components/satkit";
import type { Lister } from "@/lib/queries/listings";

// WHO IS LISTING THIS, AND ARE THEY US.
//
// Every listing now says who filed it. That is ordinary marketplace hygiene: a tenant
// should know whether they are talking to the owner of the building or to a broker acting
// for them.
//
// The part that is not ordinary is `is_operator`. SAT Real Estate is a licensed brokerage
// AND it runs this exchange. Both facts are true, and hiding the second one while asking
// brokers to trust a neutral platform is not a position you can hold. So its listings say
// so, on the listing, next to everyone else's.
//
// Read the mark carefully: it is a DISCLOSURE, not a decoration. It confers nothing. SAT's
// listings sit in the same ranking, clear the same publish gate, need the same advertising
// licence, and get no badge or placement another broker cannot earn. The only thing SAT
// had at launch was a head start on paperwork: it was already verified and already held
// its FAL licence, so it could list on day one while other brokers were still signing up.
// First in the queue, not first in the ranking.
export default function ListerBadge({ lister, ar }: { lister: Lister | null; ar: boolean }) {
  if (!lister) return null;

  const name = (ar ? lister.name_ar : lister.name_en) || lister.name_en || lister.name_ar;
  if (!name) return null;

  const role =
    lister.lister_type === "broker"
      ? (ar ? "وسيط مرخّص" : "Licensed broker")
      : (ar ? "المالك" : "Owner");

  return (
    <div className="col gap6" style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--silver)" }}>
      <div className="muted" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase" }}>
        {ar ? "الإعلان مقدَّم من" : "Listed by"}
      </div>

      <div className="row gap8 wrap" style={{ alignItems: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{name}</span>
        <span className="tag">{role}</span>
        {lister.is_verified && (
          <span className="verified"><span className="dot" />{ar ? "موثّق" : "Verified"}</span>
        )}
      </div>

      {lister.is_operator && (
        <div
          className="row gap8"
          style={{
            alignItems: "flex-start",
            marginTop: 6,
            padding: "8px 10px",
            borderRadius: 8,
            background: "var(--cool)",
            border: "1px solid var(--silver)",
          }}
        >
          <span style={{ color: "var(--slate)", marginTop: 1, flex: "none" }}><Icon.info size={14} /></span>
          <span style={{ fontSize: 12, lineHeight: 1.6, color: "var(--slate)" }}>
            {ar
              ? "شركة سات العقارية هي مشغّلة هذه المنصة، وتُدرج إعلاناتها هنا كأي وسيط مرخّص. لا تحصل إعلاناتها على أي أفضلية في الترتيب أو العرض، وتخضع لذات قواعد التحقق ورخصة الإعلان."
              : "SAT Real Estate operates this exchange and lists here as any licensed broker does. Its listings get no ranking or placement advantage, and clear the same verification and advertising-licence rules as everyone else's."}
          </span>
        </div>
      )}
    </div>
  );
}
