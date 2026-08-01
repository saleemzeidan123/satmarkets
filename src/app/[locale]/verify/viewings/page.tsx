import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/auth/session";
import ViewingActions from "@/components/ViewingActions";
import ScrollRegion from "@/components/ScrollRegion";

export const dynamic = "force-dynamic";

type Row = {
  id: string; created_at: string; scheduled_at: string | null; status: string;
  contact_name: string | null; contact_email: string | null;
  qualification: { summary_en?: string } | null;
  listings: { reference_code: string | null; title_en: string | null; is_sat_listed: boolean | null } | null;
};

const wrap: CSSProperties = { maxWidth: 1220, margin: "0 auto", padding: "40px 24px", fontFamily: "var(--font-sans), system-ui, sans-serif", color: "var(--ink)" };
const th: CSSProperties = { textAlign: "left", fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: ".06em", color: "var(--slate)", padding: "8px 10px", borderBottom: "1px solid var(--silver-2)", whiteSpace: "nowrap" };
const td: CSSProperties = { fontSize: "0.8125rem", padding: "8px 10px", borderBottom: "1px solid var(--silver)", verticalAlign: "top" };

function riyadh(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Riyadh", weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

export default async function ViewingsQueue() {
  // Session-gated on app_is_sat (RLS-safe). Non-reviewers get 404.
  const su = await getSessionUser();
  if (!su?.isSat) notFound();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return <main style={wrap}><h1 style={{ fontFamily: "var(--font-serif), serif" }}>Viewing requests</h1><p style={{ color: "var(--slate)" }}>This internal screen is not configured. Set SUPABASE_SERVICE_ROLE_KEY in the server environment.</p></main>;
  }
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data } = await sb.from("viewings").select("id, created_at, scheduled_at, status, contact_name, contact_email, qualification, listings(reference_code, title_en, is_sat_listed)").order("created_at", { ascending: false }).limit(300);
  const rows = (data ?? []) as unknown as Row[];
  const pending = rows.filter((r) => r.status === "requested").length;
  const sColor: Record<string, string> = { requested: "var(--amber-d)", confirmed: "var(--harbor-d)", completed: "var(--harbor-d)", cancelled: "var(--red)", no_show: "var(--red)" };
  return (
    <main style={wrap}>
      <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.6875rem", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--harbor)" }}>SAT Markets, internal</div>
      <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.875rem", margin: "6px 0 4px" }}>Viewing requests</h1>
      <p style={{ color: "var(--slate)", margin: "0 0 4px" }}>{rows.length} requests, {pending} awaiting a decision. SAT-listed viewings are SAT&apos;s to host; owner-listed viewings route to the lister once accounts go live, until then this queue serves both with the route shown.</p>
      <p style={{ color: "var(--slate)", fontSize: "0.75rem", margin: "0 0 20px" }}>The brief is what the requester stated; the platform never scores people.</p>
      <ScrollRegion label="Viewing requests" style={{ border: "1px solid var(--silver)", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <caption className="sronly">Viewing requests</caption>
          <thead><tr>{["Slot (Riyadh)", "Listing", "Route", "Requester", "Stated brief", "Status", "Action"].map((h) => <th scope="col" key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td style={td} colSpan={7}>No viewing requests yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} style={{ background: r.status === "requested" ? "#FBF3E6" : "var(--paper)" }}>
                <td style={td}><span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.71875rem" }}>{riyadh(r.scheduled_at)}</span></td>
                <td style={td}>{r.listings?.title_en || "?"}<div style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.65625rem", color: "#8A93A0" }}>{r.listings?.reference_code || ""}</div></td>
                <td style={td}><span style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: ".04em", color: r.listings?.is_sat_listed ? "var(--harbor-d)" : "var(--slate)" }}>{r.listings?.is_sat_listed ? "SAT HOSTS" : "OWNER"}</span></td>
                <td style={td}>{r.contact_name || ""}{r.contact_email ? <div><a href={`mailto:${r.contact_email}`} style={{ color: "var(--harbor-d)", fontSize: "0.75rem" }}>{r.contact_email}</a></div> : null}</td>
                <td style={{ ...td, maxWidth: 280 }}>{r.qualification?.summary_en || ""}</td>
                <td style={td}><span style={{ fontWeight: 600, color: sColor[r.status] || "var(--slate)" }}>{r.status}</span></td>
                <td style={td}><ViewingActions id={r.id} status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
    </main>
  );
}
