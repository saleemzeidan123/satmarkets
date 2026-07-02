import type { CSSProperties } from "react";
import { createClient } from "@supabase/supabase-js";
import ViewingActions from "@/components/ViewingActions";

export const dynamic = "force-dynamic";

type Row = {
  id: string; created_at: string; scheduled_at: string | null; status: string;
  contact_name: string | null; contact_email: string | null;
  qualification: { summary_en?: string } | null;
  listings: { reference_code: string | null; title_en: string | null; is_sat_listed: boolean | null } | null;
};

const wrap: CSSProperties = { maxWidth: 1220, margin: "0 auto", padding: "40px 24px", fontFamily: "Hanken Grotesk, system-ui, sans-serif", color: "#14181B" };
const th: CSSProperties = { textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "#5B6470", padding: "8px 10px", borderBottom: "1px solid #D7DDE5", whiteSpace: "nowrap" };
const td: CSSProperties = { fontSize: 13, padding: "8px 10px", borderBottom: "1px solid #E9EDF1", verticalAlign: "top" };

function riyadh(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Riyadh", weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

export default async function ViewingsQueue({ searchParams }: { searchParams: { key?: string } }) {
  const token = process.env.ADMIN_REVIEW_TOKEN;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !url || !serviceKey) {
    return <main style={wrap}><h1 style={{ fontFamily: "Playfair Display, serif" }}>Viewing requests</h1><p style={{ color: "#5B6470" }}>This internal screen is not configured. Set ADMIN_REVIEW_TOKEN and SUPABASE_SERVICE_ROLE_KEY in the server environment.</p></main>;
  }
  if (searchParams?.key !== token) {
    return <main style={wrap}><h1 style={{ fontFamily: "Playfair Display, serif" }}>Viewing requests</h1><p style={{ color: "#C8412E" }}>Not authorized.</p></main>;
  }
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data } = await sb.from("viewings").select("id, created_at, scheduled_at, status, contact_name, contact_email, qualification, listings(reference_code, title_en, is_sat_listed)").order("created_at", { ascending: false }).limit(300);
  const rows = (data ?? []) as unknown as Row[];
  const pending = rows.filter((r) => r.status === "requested").length;
  const sColor: Record<string, string> = { requested: "#B7791F", confirmed: "#1F8A5B", completed: "#2C557F", cancelled: "#C8412E", no_show: "#C8412E" };
  return (
    <main style={wrap}>
      <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#3A6EA5" }}>SAT Markets, internal</div>
      <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 30, margin: "6px 0 4px" }}>Viewing requests</h1>
      <p style={{ color: "#5B6470", margin: "0 0 4px" }}>{rows.length} requests, {pending} awaiting a decision. SAT-listed viewings are SAT&apos;s to host; owner-listed viewings route to the lister once accounts go live, until then this queue serves both with the route shown.</p>
      <p style={{ color: "#5B6470", fontSize: 12, margin: "0 0 20px" }}>The brief is what the requester stated; the platform never scores people.</p>
      <div style={{ overflowX: "auto", border: "1px solid #E9EDF1", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Slot (Riyadh)", "Listing", "Route", "Requester", "Stated brief", "Status", "Action"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td style={td} colSpan={7}>No viewing requests yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} style={{ background: r.status === "requested" ? "#FBF3E6" : "#fff" }}>
                <td style={td}><span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11.5 }}>{riyadh(r.scheduled_at)}</span></td>
                <td style={td}>{r.listings?.title_en || "?"}<div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, color: "#8A93A0" }}>{r.listings?.reference_code || ""}</div></td>
                <td style={td}><span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".04em", color: r.listings?.is_sat_listed ? "#2C557F" : "#1F8A5B" }}>{r.listings?.is_sat_listed ? "SAT HOSTS" : "OWNER"}</span></td>
                <td style={td}>{r.contact_name || ""}{r.contact_email ? <div><a href={`mailto:${r.contact_email}`} style={{ color: "#2C557F", fontSize: 12 }}>{r.contact_email}</a></div> : null}</td>
                <td style={{ ...td, maxWidth: 280 }}>{r.qualification?.summary_en || ""}</td>
                <td style={td}><span style={{ fontWeight: 600, color: sColor[r.status] || "#5B6470" }}>{r.status}</span></td>
                <td style={td}><ViewingActions id={r.id} token={token} status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
