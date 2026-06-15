"use client";
import { useState } from "react";
export default function LeadForm({ listingId, labels }: { listingId: string; labels: { contactDirectly: string; bookRepresentation: string; contactNote: string; repNote: string }; }) {
  const [sent, setSent] = useState<string | null>(null);
  async function submit(path: "direct_contact" | "representation") {
    await fetch("/api/leads", { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ listing_id: listingId, path }) });
    setSent(path);
  }
  if (sent) return <div className="rounded-xl border border-slate/20 bg-slate/8 p-3 text-sm text-slate">Request received. The team will be in touch.</div>;
  return (
    <div className="space-y-3">
      <button onClick={()=>submit("representation")} className="btn-gold w-full py-2.5 text-sm font-medium">{labels.bookRepresentation}</button>
      <p className="text-xs text-charcoal/55">{labels.repNote}</p>
      <button onClick={()=>submit("direct_contact")} className="btn-ghost w-full py-2.5 text-sm">{labels.contactDirectly}</button>
      <p className="text-xs text-charcoal/55">{labels.contactNote}</p>
    </div>
  );
}
