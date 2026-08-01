import { formatCounted } from "@/lib/format";
import { permitOf } from "@/lib/gate";

// The advertising licence, displayed as the REGA marketing rules require.
//
// Those rules have been in force since 1 May 2026. They require the licence number
// to appear prominently ON the advertisement, together with its expiry date, and
// they require the advertisement to come down when the licence lapses.
//
// Before this, the permit number was a small grey tag among six other tags, and the
// expiry date appeared nowhere at all. A licence number with no expiry beside it
// tells a reader nothing: an expired licence and a live one look identical.
//
// The takedown half of the rule is enforced in the database read policy, so an
// expired advertisement cannot be served. This component is the display half.
export default function AdPermit({
  listing,
  ar,
}: {
  listing: {
    ad_permit_no?: string | null;
    ad_permit_number?: string | null;
    ad_permit_expires_at?: string | null;
  };
  ar: boolean;
}) {
  const permit = permitOf(listing);
  if (!permit) return null;

  const exp = listing.ad_permit_expires_at ? new Date(listing.ad_permit_expires_at) : null;
  const daysLeft = exp ? Math.ceil((exp.getTime() - Date.now()) / 86400000) : null;
  const soon = daysLeft != null && daysLeft <= 14;

  const expText = exp
    ? exp.toLocaleDateString(ar ? "ar-SA-u-nu-latn" : "en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Riyadh",
      })
    : null;

  return (
    <div
      className="card pad"
      style={{
        marginTop: 16,
        boxShadow: "none",
        background: "var(--paper)",
        borderColor: soon ? "var(--amber)" : "var(--silver)",
      }}
    >
      <div className="row between wrap" style={{ gap: 12, alignItems: "center" }}>
        <div>
          <div className="eyebrow">
            {ar ? "رخصة الإعلان العقاري" : "Real estate advertising licence"}
          </div>
          <div
            className="mono"
            style={{ fontSize: "1.1875rem", fontWeight: 600, letterSpacing: ".02em", marginTop: 4 }}
          >
            <bdi dir="ltr">{permit}</bdi>
          </div>
        </div>

        <div style={{ textAlign: ar ? "left" : "right" }}>
          <div className="eyebrow">{ar ? "تنتهي في" : "Expires"}</div>
          <div
            style={{
              fontSize: "0.9375rem",
              fontWeight: 600,
              marginTop: 4,
              color: soon ? "var(--amber-d, #92400e)" : "var(--ink)",
            }}
          >
            {expText ?? (ar ? "غير مسجّل" : "not recorded")}
          </div>
          {daysLeft != null && daysLeft >= 0 && (
            <div className="muted" style={{ fontSize: "0.71875rem", marginTop: 2 }}>
              {ar ? `خلال ${formatCounted(daysLeft, "day", "ar", { oblique: true })}` : `in ${formatCounted(daysLeft, "day", "en")}`}
            </div>
          )}
        </div>
      </div>

      <div
        className="muted"
        style={{
          fontSize: "0.71875rem",
          lineHeight: 1.6,
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid var(--silver)",
        }}
      >
        {ar
          ? "يُعرض رقم الرخصة وتاريخ انتهائها وفق قواعد التسويق والإعلان العقاري. ويُرفع الإعلان تلقائياً عند انتهاء الرخصة."
          : "The licence number and its expiry date are shown as required by the real estate marketing and advertising rules. The advertisement is withdrawn automatically when the licence expires."}
      </div>
    </div>
  );
}
