import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/auth/session";
import ReviewActions from "@/components/ReviewActions";
import { permitOf } from "@/lib/gate";
import { documentLabel } from "@/lib/documentKinds";

export const dynamic = "force-dynamic";

type Row = {
  id: string; reference_code: string | null; title_en: string | null; status: string | null;
  is_sat_listed: boolean | null; ownership_verified: boolean | null; authorization_verified: boolean | null;
  verification_method: string | null; verified_at: string | null; authorization_doc_url: string | null;
  ad_permit_number: string | null;
  ad_permit_no?: string | null;
  accounts: { type: string | null; verification_status: string | null; name_en: string | null } | null;
};

const wrap: CSSProperties = { maxWidth: 1180, margin: "0 auto", padding: "40px 24px", fontFamily: "var(--font-sans), system-ui, sans-serif", color: "#14181B" };
const th: CSSProperties = { textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "#5B6470", padding: "8px 10px", borderBottom: "1px solid #D7DDE5", whiteSpace: "nowrap" };
const td: CSSProperties = { fontSize: 13, padding: "8px 10px", borderBottom: "1px solid #E9EDF1", verticalAlign: "top" };

function YN({ v }: { v: boolean | null }) {
  return <span style={{ color: v ? "#1F8A5B" : "#5B6470", fontWeight: v ? 600 : 400 }}>{v ? "Yes" : "No"}</span>;
}

export default async function VerifyQueue() {
  // Session-gated on app_is_sat (RLS-safe). A non-reviewer sees a 404: the console
  // does not confirm it exists. No token in the URL, none in the client bundle.
  const su = await getSessionUser();
  if (!su?.isSat) notFound();
  // After the isSat gate, read the full worklist with the service role, exactly as
  // the signups and viewings consoles do. A reviewer must see every listing (drafts
  // included), which session RLS deliberately does not expose.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return <main style={wrap}><h1 style={{ fontFamily: "var(--font-serif), serif" }}>Verification review</h1><p style={{ color: "#5B6470" }}>Database not configured.</p></main>;
  }
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data } = await sb
    .from("listings")
    // Disambiguate the accounts embed: listings has TWO FKs to accounts
    // (account_id and verified_by), so the relationship must be named or PostgREST
    // errors the whole query and returns nothing.
    .select("id, reference_code, title_en, status, is_sat_listed, ownership_verified, authorization_verified, verification_method, verified_at, authorization_doc_url, ad_permit_number, ad_permit_no, accounts!listings_account_id_fkey(type, verification_status, name_en)")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as unknown as Row[];

  // Verification documents for the listings in view. Rendered as links to the
  // session-gated download route, never as raw storage URLs.
  const ids = rows.map((r) => r.id);
  const { data: docData } = ids.length
    ? await sb.from("listing_documents").select("id, listing_id, kind").in("listing_id", ids).is("deleted_at", null)
    : { data: [] as { id: string; listing_id: string; kind: string }[] };
  const docsByListing = new Map<string, { id: string; kind: string }[]>();
  for (const d of (docData ?? []) as { id: string; listing_id: string; kind: string }[]) {
    const arr = docsByListing.get(d.listing_id) ?? [];
    arr.push({ id: d.id, kind: d.kind });
    docsByListing.set(d.listing_id, arr);
  }

  const needs = (r: Row) => !r.is_sat_listed && !r.ownership_verified && !r.authorization_verified;
  const total = rows.length;
  const verified = rows.filter((r) => r.ownership_verified || r.authorization_verified || r.is_sat_listed).length;
  const toReview = rows.filter(needs).length;
  return (
    <main style={wrap}>
      <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#3A6EA5" }}>SAT Markets, internal</div>
      <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: 30, margin: "6px 0 4px" }}>Verification review queue</h1>
      <p style={{ color: "#5B6470", margin: "0 0 4px" }}>{total} listings, {verified} verified, {toReview} need review. Verification is recorded against the listing; no status is asserted that the data does not carry.</p>
      <p style={{ color: "#5B6470", fontSize: 12, margin: "0 0 20px" }}>Approve and reject act on the listing immediately, gated on your SAT session. Document links open the private file through a short-lived, download-only signed URL.</p>
      <div style={{ overflowX: "auto", border: "1px solid #E9EDF1", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Ref","Title","Account","Acct status","Status","Owner","Auth","Method","Verified at","Doc","Ad permit","Action"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ background: needs(r) ? "#FBF3E6" : "#fff" }}>
                <td style={td}><span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11 }}>{r.reference_code || r.id.slice(0, 8)}</span></td>
                <td style={td}>{r.title_en || "(untitled)"}</td>
                <td style={td}>{r.accounts?.name_en || "?"} <span style={{ color: "#8A93A0" }}>({r.accounts?.type || "?"})</span></td>
                <td style={td}>{r.accounts?.verification_status || "?"}</td>
                <td style={td}>{r.status}</td>
                <td style={td}><YN v={r.ownership_verified} /></td>
                <td style={td}><YN v={r.authorization_verified} /></td>
                <td style={td}>{r.verification_method || "-"}</td>
                <td style={td}>{r.verified_at ? new Date(r.verified_at).toISOString().slice(0, 10) : "-"}</td>
                <td style={td}>{(() => {
                  const ds = docsByListing.get(r.id) ?? [];
                  if (ds.length === 0) {
                    // Legacy authorization_doc_url is a raw storage URL; do not link it
                    // (that was the leak). It is migrated into listing_documents separately.
                    return r.authorization_doc_url ? <span style={{ color: "#8A93A0", fontSize: 11 }}>legacy</span> : "-";
                  }
                  return <span style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>{ds.map((d) => (
                    <a key={d.id} href={`/api/documents/${d.id}/download`} style={{ color: "#2E5FE0", fontSize: 11.5 }}>{documentLabel(d.kind)}</a>
                  ))}</span>;
                })()}</td>
                <td style={td}>{permitOf(r) || "-"}</td>
                <td style={td}><ReviewActions id={r.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
