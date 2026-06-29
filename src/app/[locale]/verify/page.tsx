import type { CSSProperties } from "react";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = {
  id: string; reference_code: string | null; title_en: string | null; status: string | null;
  is_sat_listed: boolean | null; ownership_verified: boolean | null; authorization_verified: boolean | null;
  verification_method: string | null; verified_at: string | null; authorization_doc_url: string | null;
  ad_permit_number: string | null;
  accounts: { type: string | null; verification_status: string | null; name_en: string | null } | null;
};

const wrap: CSSProperties = { maxWidth: 1180, margin: "0 auto", padding: "40px 24px", fontFamily: "Hanken Grotesk, system-ui, sans-serif", color: "#14181B" };
const th: CSSProperties = { textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "#5B6470", padding: "8px 10px", borderBottom: "1px solid #D7DDE5", whiteSpace: "nowrap" };
const td: CSSProperties = { fontSize: 13, padding: "8px 10px", borderBottom: "1px solid #E9EDF1", verticalAlign: "top" };

function YN({ v }: { v: boolean | null }) {
  return <span style={{ color: v ? "#1F8A5B" : "#5B6470", fontWeight: v ? 600 : 400 }}>{v ? "Yes" : "No"}</span>;
}

export default async function VerifyQueue({ searchParams }: { searchParams: { key?: string } }) {
  const token = process.env.ADMIN_REVIEW_TOKEN;
  if (!token) {
    return <main style={wrap}><h1 style={{ fontFamily: "Playfair Display, serif" }}>Verification review</h1><p style={{ color: "#5B6470" }}>This internal screen is not configured. Set ADMIN_REVIEW_TOKEN in the server environment to enable it.</p></main>;
  }
  if (searchParams?.key !== token) {
    return <main style={wrap}><h1 style={{ fontFamily: "Playfair Display, serif" }}>Verification review</h1><p style={{ color: "#C8412E" }}>Not authorized.</p></main>;
  }
  const sb = getSupabaseServer();
  if (!sb) {
    return <main style={wrap}><h1 style={{ fontFamily: "Playfair Display, serif" }}>Verification review</h1><p style={{ color: "#5B6470" }}>Database not configured.</p></main>;
  }
  const { data } = await sb
    .from("listings")
    .select("id, reference_code, title_en, status, is_sat_listed, ownership_verified, authorization_verified, verification_method, verified_at, authorization_doc_url, ad_permit_number, accounts(type, verification_status, name_en)")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as unknown as Row[];
  const needs = (r: Row) => !r.is_sat_listed && !r.ownership_verified && !r.authorization_verified;
  const total = rows.length;
  const verified = rows.filter((r) => r.ownership_verified || r.authorization_verified || r.is_sat_listed).length;
  const toReview = rows.filter(needs).length;
  return (
    <main style={wrap}>
      <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#3A6EA5" }}>SAT Markets, internal</div>
      <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 30, margin: "6px 0 4px" }}>Verification review queue</h1>
      <p style={{ color: "#5B6470", margin: "0 0 4px" }}>{total} listings, {verified} verified, {toReview} need review. Verification is recorded against the listing; no status is asserted that the data does not carry.</p>
      <p style={{ color: "#5B6470", fontSize: 12, margin: "0 0 20px" }}>Approve and reject require a server-side privileged path (service-role key and admin gate), which is the next step. This is the read-only worklist.</p>
      <div style={{ overflowX: "auto", border: "1px solid #E9EDF1", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Ref","Title","Account","Acct status","Status","Owner","Auth","Method","Verified at","Doc","Ad permit","Action"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ background: needs(r) ? "#FBF3E6" : "#fff" }}>
                <td style={td}><span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11 }}>{r.reference_code || r.id.slice(0, 8)}</span></td>
                <td style={td}>{r.title_en || "(untitled)"}</td>
                <td style={td}>{r.accounts?.name_en || "?"} <span style={{ color: "#8A93A0" }}>({r.accounts?.type || "?"})</span></td>
                <td style={td}>{r.accounts?.verification_status || "?"}</td>
                <td style={td}>{r.status}</td>
                <td style={td}><YN v={r.ownership_verified} /></td>
                <td style={td}><YN v={r.authorization_verified} /></td>
                <td style={td}>{r.verification_method || "-"}</td>
                <td style={td}>{r.verified_at ? new Date(r.verified_at).toISOString().slice(0, 10) : "-"}</td>
                <td style={td}>{r.authorization_doc_url ? <a href={r.authorization_doc_url} style={{ color: "#2E5FE0" }}>view</a> : "-"}</td>
                <td style={td}>{r.ad_permit_number || "-"}</td>
                <td style={td}>{needs(r) ? <span style={{ color: "#B7791F", fontWeight: 600 }}>REVIEW</span> : <span style={{ color: "#1F8A5B" }}>OK</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
