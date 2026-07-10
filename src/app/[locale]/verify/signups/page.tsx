import type { CSSProperties } from "react";
import { createClient } from "@supabase/supabase-js";
import SignupActions from "@/components/SignupActions";

export const dynamic = "force-dynamic";

type Row = {
  id: string; created_at: string; role: string; full_name: string; company: string | null;
  email: string; phone: string | null; details: Record<string, unknown> | null; locale: string;
  status: string; notes: string | null;
};

const wrap: CSSProperties = { maxWidth: 1180, margin: "0 auto", padding: "40px 24px", fontFamily: "var(--font-sans), system-ui, sans-serif", color: "#14181B" };
const th: CSSProperties = { textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "#5B6470", padding: "8px 10px", borderBottom: "1px solid #D7DDE5", whiteSpace: "nowrap" };
const td: CSSProperties = { fontSize: 13, padding: "8px 10px", borderBottom: "1px solid #E9EDF1", verticalAlign: "top" };

function detailsSummary(d: Record<string, unknown> | null): string {
  if (!d) return "";
  const parts: string[] = [];
  if (Array.isArray(d.interests) && d.interests.length) parts.push((d.interests as string[]).join(", "));
  for (const k of ["size", "timeline", "portfolio", "docs", "fal", "ticket"]) {
    if (d[k]) parts.push(`${k}: ${String(d[k])}`);
  }
  return parts.join(" · ");
}

export default async function SignupQueue({ searchParams }: { searchParams: { key?: string } }) {
  const token = process.env.ADMIN_REVIEW_TOKEN;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !url || !serviceKey) {
    return <main style={wrap}><h1 style={{ fontFamily: "var(--font-serif), serif" }}>Signup requests</h1><p style={{ color: "#5B6470" }}>This internal screen is not configured. Set ADMIN_REVIEW_TOKEN and SUPABASE_SERVICE_ROLE_KEY in the server environment.</p></main>;
  }
  if (searchParams?.key !== token) {
    return <main style={wrap}><h1 style={{ fontFamily: "var(--font-serif), serif" }}>Signup requests</h1><p style={{ color: "#C8412E" }}>Not authorized.</p></main>;
  }
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data } = await sb.from("signup_requests").select("*").order("created_at", { ascending: false }).limit(300);
  const rows = (data ?? []) as Row[];
  const news = rows.filter((r) => r.status === "new").length;
  const roleColor: Record<string, string> = { occupier: "#2C557F", owner: "#1F8A5B", broker: "#A88B5C", investor: "#7C3AED" };
  return (
    <main style={wrap}>
      <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#3A6EA5" }}>SAT Markets, internal</div>
      <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: 30, margin: "6px 0 4px" }}>Signup requests</h1>
      <p style={{ color: "#5B6470", margin: "0 0 20px" }}>{rows.length} requests, {news} new. Every account opens only after this review. Approve marks the request verified; account provisioning follows when auth goes live.</p>
      <div style={{ overflowX: "auto", border: "1px solid #E9EDF1", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["When", "Role", "Name", "Company", "Contact", "Details", "Lang", "Status", "Notes", "Action"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td style={td} colSpan={10}>No requests yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} style={{ background: r.status === "new" ? "#FBF3E6" : "#fff" }}>
                <td style={td}><span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11 }}>{new Date(r.created_at).toISOString().slice(0, 16).replace("T", " ")}</span></td>
                <td style={td}><span style={{ fontSize: 11, fontWeight: 700, color: roleColor[r.role] || "#5B6470", textTransform: "uppercase", letterSpacing: ".04em" }}>{r.role}</span></td>
                <td style={td}>{r.full_name}</td>
                <td style={td}>{r.company || ""}</td>
                <td style={td}><a href={`mailto:${r.email}`} style={{ color: "#2C557F" }}>{r.email}</a>{r.phone ? <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, color: "#5B6470" }}>{r.phone}</div> : null}</td>
                <td style={{ ...td, maxWidth: 260 }}>{detailsSummary(r.details)}</td>
                <td style={td}>{r.locale}</td>
                <td style={td}><span style={{ fontWeight: 600, color: r.status === "verified" ? "#1F8A5B" : r.status === "rejected" ? "#C8412E" : r.status === "contacted" ? "#2C557F" : "#B7791F" }}>{r.status}</span></td>
                <td style={{ ...td, maxWidth: 180, color: "#5B6470", fontSize: 12 }}>{r.notes || ""}</td>
                <td style={td}><SignupActions id={r.id} token={token} status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
