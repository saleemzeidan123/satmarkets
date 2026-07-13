// The publish gate, in one place.
//
// The database has the last word: trigger enforce_listing_publish_gate on
// public.listings. This mirrors it, for two reasons.
//
//  1. So a trust badge is drawn only on a listing that has actually earned it.
//     Every listing card in this app used to render a green tick and the words
//     "Verified listing" unconditionally, driven by no field at all, while six of
//     the seven live listings had no advertising permit on file and
//     authorization_verified = false. A badge that is always on is not a badge,
//     it is wallpaper, and on an exchange whose entire pitch is that the badge
//     means something, wallpaper is a lie.
//
//  2. So an owner is told WHY a listing cannot go live, instead of being handed a
//     button that returns 500.
//
// Two different claims live here and they must not be conflated:
//   verified OWNER   -> we checked the person and their ownership of this asset.
//   verified LISTING -> the asset also has a valid advertising permit and the
//                       right to market is confirmed, so it may legally publish.
// An owner can be verified while a listing is not. Being SAT's own listing
// (is_sat_listed) confers neither: our own stock does not get a trust badge for
// free, which is also what /neutrality commits us to.
//
// Keep in step with supabase/migrations/20260713_publish_gate_insert.sql.

export type GateFields = {
  right_to_market_confirmed?: boolean | null;
  ownership_verified?: boolean | null;
  authorization_verified?: boolean | null;
  ad_permit_no?: string | null;
  ad_permit_number?: string | null;
  ad_permit_expires_at?: string | null;
};

export type GateReason =
  | "ownership"
  | "authorization"
  | "right_to_market"
  | "permit_missing"
  | "permit_expired";

// The schema carries both spellings. The trigger coalesces them, so we do too,
// rather than quietly reading the empty one (which is how /verify came to print
// "-" for the one listing that actually holds a permit).
export function permitOf(l: GateFields): string | null {
  return l.ad_permit_number || l.ad_permit_no || null;
}

// Mirrors the trigger exactly, including its null handling: ownership and
// authorization default to PASS when unset (coalesce(..., true)), while the right
// to market defaults to FAIL when unset (coalesce(..., false)).
export function gateFailures(l: GateFields): GateReason[] {
  const f: GateReason[] = [];
  if (l.ownership_verified === false) f.push("ownership");
  if (l.authorization_verified === false) f.push("authorization");
  if (!l.right_to_market_confirmed) f.push("right_to_market");
  const p = permitOf(l);
  if (!p) f.push("permit_missing");
  else if (l.ad_permit_expires_at && new Date(l.ad_permit_expires_at).getTime() <= Date.now()) {
    f.push("permit_expired");
  }
  return f;
}

export function passesGate(l: GateFields): boolean {
  return gateFailures(l).length === 0;
}

// "Verified owner" is a narrower claim than "verified listing" and is allowed to
// stand on its own.
export function ownerVerified(l: GateFields): boolean {
  return l.ownership_verified === true;
}

const TEXT: Record<GateReason, [string, string]> = {
  ownership: ["Ownership not verified", "الملكية غير موثّقة"],
  authorization: ["Authorisation to market not verified", "التفويض بالتسويق غير موثّق"],
  right_to_market: ["Right to market not confirmed", "لم يُؤكَّد حق التسويق"],
  permit_missing: ["No advertising permit on file", "لا يوجد تصريح إعلان مسجّل"],
  permit_expired: ["The advertising permit has expired", "انتهى تصريح الإعلان"],
};

export function gateReasonText(r: GateReason, ar: boolean): string {
  return TEXT[r][ar ? 1 : 0];
}

export function gateReasonsText(rs: GateReason[], ar: boolean): string {
  return rs.map((r) => gateReasonText(r, ar)).join(ar ? "، " : ". ");
}
