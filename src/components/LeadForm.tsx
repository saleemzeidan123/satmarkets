"use client";
import { useState } from "react";

export default function LeadForm({ listingId, labels }: {
  listingId: string;
  labels: { contactDirectly: string; bookRepresentation: string; contactNote: string; repNote: string };
}) {
  const [sent, setSent] = useState<string | null>(null);
  async function submit(path: "direct_contact" | "representation") {
    await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listing_id: listingId, path })
    });
    setSent(path);
  }
  if (sent) return <div className="rounded bg-slate/10 p-3 text-sm text-slate">Request received ({sent}).</div>;
  return (
    <div className="space-y-3">
      <button onClick={() => submit("representation")} className="w-full rounded bg-gold px-4 py-2 text-white">
        {labels.bookRepresentation}
      </button>
      <p className="text-xs text-charcoal/60">{labels.repNote}</p>
      <button onClick={() => submit("direct_contact")} className="w-full rounded border border-charcoal/20 px-4 py-2">
        {labels.contactDirectly}
      </button>
      <p className="text-xs text-charcoal/60">{labels.contactNote}</p>
    </div>
  );
}
