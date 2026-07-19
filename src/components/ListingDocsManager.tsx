"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/satkit";

// Floor plans and the marketing brochure, managed after a listing is created. Floor
// plans may be images or PDFs; the brochure is a PDF. Images go to the media route
// (re-encoded), PDFs to the docs route (never re-encoded, sniffed as %PDF-), and both
// remove through the same owner-scoped media DELETE. Uploading one sets no
// verification flag; these are marketing material, not evidence.
type Doc = { id: string; url: string | null; isPdf: boolean; label: string | null };

function useUploader(id: string, onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function upload(file: File, kind: "floorplan" | "brochure") {
    setBusy(true); setErr(null);
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    // Brochure is always a PDF (docs route). A floor plan PDF also goes to docs; a
    // floor plan image goes to the media route which re-encodes it.
    const route = kind === "brochure" || isPdf ? "docs" : "media";
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    try {
      const res = await fetch(`/api/listings/${id}/${route}`, { method: "POST", body: fd });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(j.error || "Upload failed."); setBusy(false); return; }
      setBusy(false); onDone();
    } catch { setErr("Upload failed."); setBusy(false); }
  }
  return { busy, err, upload };
}

export default function ListingDocsManager({ id, locale, floorplans, brochures }: { id: string; locale: string; floorplans: Doc[]; brochures: Doc[] }) {
  const ar = locale === "ar";
  const router = useRouter();
  const planRef = useRef<HTMLInputElement>(null);
  const brochRef = useRef<HTMLInputElement>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [rmErr, setRmErr] = useState<string | null>(null);

  const plan = useUploader(id, () => { if (planRef.current) planRef.current.value = ""; router.refresh(); });
  const broch = useUploader(id, () => { if (brochRef.current) brochRef.current.value = ""; router.refresh(); });

  const t = ar ? {
    plans: "المخططات", brochure: "الكتيّب التسويقي", add: "إضافة", remove: "حذف",
    noPlans: "لا مخططات بعد.", noBroch: "لا كتيّب بعد.", pdf: "ملف PDF",
    planHint: "صورة أو PDF، حتى 20 ميغابايت.", brochHint: "PDF، حتى 20 ميغابايت.",
    uploading: "جارٍ الرفع...", errRm: "تعذّر الحذف.",
  } : {
    plans: "Floor plans", brochure: "Marketing brochure", add: "Add", remove: "Remove",
    noPlans: "No floor plans yet.", noBroch: "No brochure yet.", pdf: "PDF file",
    planHint: "Image or PDF, up to 20MB.", brochHint: "PDF, up to 20MB.",
    uploading: "Uploading...", errRm: "Could not remove.",
  };

  async function remove(mediaId: string) {
    setRemoving(mediaId); setRmErr(null);
    try {
      const res = await fetch(`/api/listings/${id}/media/${mediaId}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setRmErr(j.error || t.errRm); setRemoving(null); return; }
      setRemoving(null); router.refresh();
    } catch { setRmErr(t.errRm); setRemoving(null); }
  }

  const tile = (d: Doc) => (
    <div key={d.id} style={{ border: "1px solid var(--silver)", borderRadius: 10, overflow: "hidden", background: "var(--paper)" }}>
      <div style={{ position: "relative", aspectRatio: "4 / 3", background: "var(--cool)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {d.isPdf || !d.url
          ? <span className="row gap6 muted" style={{ fontSize: 12 }}><Icon.doc size={18} /> {t.pdf}</span>
          : <img src={d.url} alt={d.label || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      </div>
      <div className="row" style={{ padding: "8px 10px", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer" className="muted" style={{ fontSize: 11.5, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label || (ar ? "عرض" : "Open")}</a> : <span />}
        <button type="button" onClick={() => remove(d.id)} disabled={removing === d.id} className="chip" style={{ cursor: "pointer", fontSize: 11.5, color: "#C8412E", borderColor: "var(--silver)", flex: "none" }}>
          <Icon.trash size={13} /> {t.remove}
        </button>
      </div>
    </div>
  );

  return (
    <div className="col gap16">
      <div>
        <div className="row between" style={{ alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{t.plans} <span className="muted" style={{ fontWeight: 400, fontSize: 12.5 }}>· {floorplans.length}</span></div>
          <label className="btn secondary sm" style={{ cursor: plan.busy ? "default" : "pointer", opacity: plan.busy ? 0.6 : 1 }}>
            <Icon.plus size={14} /> {plan.busy ? t.uploading : t.add}
            <input ref={planRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) plan.upload(f, "floorplan"); }} disabled={plan.busy} style={{ display: "none" }} />
          </label>
        </div>
        {floorplans.length === 0 ? <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>{t.noPlans}</p> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>{floorplans.map(tile)}</div>
        )}
        <p className="muted" style={{ fontSize: 11.5, marginTop: 8, marginBottom: 0 }}>{t.planHint}{plan.err ? <span style={{ color: "#C8412E" }}> · {plan.err}</span> : null}</p>
      </div>

      <div style={{ borderTop: "1px solid var(--silver)", paddingTop: 16 }}>
        <div className="row between" style={{ alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{t.brochure} <span className="muted" style={{ fontWeight: 400, fontSize: 12.5 }}>· {brochures.length}</span></div>
          <label className="btn secondary sm" style={{ cursor: broch.busy ? "default" : "pointer", opacity: broch.busy ? 0.6 : 1 }}>
            <Icon.plus size={14} /> {broch.busy ? t.uploading : t.add}
            <input ref={brochRef} type="file" accept="application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) broch.upload(f, "brochure"); }} disabled={broch.busy} style={{ display: "none" }} />
          </label>
        </div>
        {brochures.length === 0 ? <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>{t.noBroch}</p> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>{brochures.map(tile)}</div>
        )}
        <p className="muted" style={{ fontSize: 11.5, marginTop: 8, marginBottom: 0 }}>{t.brochHint}{broch.err ? <span style={{ color: "#C8412E" }}> · {broch.err}</span> : null}</p>
      </div>
      {rmErr && <p style={{ fontSize: 12, color: "#C8412E", margin: 0 }}>{rmErr}</p>}
    </div>
  );
}
