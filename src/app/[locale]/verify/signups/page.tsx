import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/auth/session";
import SignupActions from "@/components/SignupActions";

export const dynamic = "force-dynamic";

type Row = {
  id: string; created_at: string; role: string; full_name: string; company: string | null;
  email: string; phone: string | null; details: Record<string, unknown> | null; locale: string;
  status: string; notes: string | null;
};

const wrap: CSSProperties = { maxWidth: 1180, margin: "0 auto", padding: "40px 24px", fontFamily: "var(--font-sans), system-ui, sans-serif", color: "var(--ink)" };
const th: CSSProperties = { textAlign: "left", fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: ".06em", color: "var(--slate)", padding: "8px 10px", borderBottom: "1px solid var(--silver-2)", whiteSpace: "nowrap" };
const td: CSSProperties = { fontSize: "0.8125rem", padding: "8px 10px", borderBottom: "1px solid var(--silver)", verticalAlign: "top" };

function detailsSummary(d: Record<string, unknown> | null): string {
  if (!d) return "";
  const parts: string[] = [];
  if (Array.isArray(d.interests) && d.interests.length) parts.push((d.interests as string[]).join(", "));
  for (const k of ["size", "timeline", "portfolio", "docs", "fal", "ticket"]) {
    if (d[k]) parts.push(`${k}: ${String(d[k])}`);
  }
  return parts.join(" · ");
}

export default async function SignupQueue() {
  // Session-gated on app_is_sat (RLS-safe). Non-reviewers get 404.
  const su = await getSessionUser();
  if (!su?.isSat) notFound();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return <main style={wrap}><h1 style={{ fontFamily: "var(--font-serif), serif" }}>Signup requests</h1><p style={{ color: "var(--slate)" }}>This internal screen is not configured. Set SUPABASE_SERVICE_ROLE_KEY in the server environment.</p></main>;
  }
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data } = await sb.from("signup_requests").select("*").order("created_at", { ascending: false }).limit(300);
  const rows = (data ?? []) as Row[];
  const news = rows.filter((r) => r.status === "new").length;
  // Role is a CATEGORY (who someone is), never a status, so these must not carry
  // confirmed green and, per D24, not teal either. The role word is always written
  // next to the swatch, so colour is never the sole carrier. Tokens resolve here
  // because these are inline styles, not SVG presentation attributes.
  const roleColor: Record<string, string> = { occupier: "var(--harbor-d)", owner: "var(--harbor)", broker: "var(--brass)", investor: "var(--slate)" };
  return (
    <main style={wrap}>
      <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.6875rem", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--harbor)" }}>SAT Markets, internal</div>
      <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.875rem", margin: "6px 0 4px" }}>Signup requests</h1>
      <p style={{ color: "var(--slate)", margin: "0 0 20px" }}>{rows.length} requests, {news} new. Every account opens only after this review. Approve marks the request verified; account provisioning follows when auth goes live.</p>
      <div style={{ overflowX: "auto", border: "1px solid var(--silver)", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["When", "Role", "Name", "Company", "Contact", "Details", "Lang", "Status", "Notes", "Action"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td style={td} colSpan={10}>No requests yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} style={{ background: r.status === "new" ? "#FBF3E6" : "var(--paper)" }}>
                <td style={td}><span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.6875rem" }}>{new Date(r.created_at).toISOString().slice(0, 16).replace("T", " ")}</span></td>
                <td style={td}><span style={{ fontSize: "0.6875rem", fontWeight: 700, color: roleColor[r.role] || "var(--slate)", textTransform: "uppercase", letterSpacing: ".04em" }}>{r.role}</span></td>
                <td style={td}>{r.full_name}</td>
                <td style={td}>{r.company || ""}</td>
                <td style={td}><a href={`mailto:${r.email}`} style={{ color: "var(--harbor-d)" }}>{r.email}</a>{r.phone ? <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.6875rem", color: "var(--slate)" }}>{r.phone}</div> : null}</td>
                <td style={{ ...td, maxWidth: 260 }}>{detailsSummary(r.details)}</td>
                <td style={td}>{r.locale}</td>
                <td style={td}><span style={{ fontWeight: 600, color: r.status === "verified" ? "var(--verified)" : r.status === "rejected" ? "var(--red)" : r.status === "contacted" ? "var(--harbor-d)" : "var(--amber-d)" }}>{r.status}</span></td>
                <td style={{ ...td, maxWidth: 180, color: "var(--slate)", fontSize: "0.75rem" }}>{r.notes || ""}</td>
                <td style={td}><SignupActions id={r.id} status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
