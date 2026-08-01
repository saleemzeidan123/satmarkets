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

// ELITE-4 J2-20: `errUp` is passed in because this hook sits outside the
// component and so outside the `t` object; it used to say "Upload failed." in
// English to an Arabic reader.
function useUploader(id: string, onDone: () => void, errUp: string) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function upload(file: File, kind: "floorplan" | "brochure") {
    if (busy) return;
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
      if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(j.error || errUp); setBusy(false); return; }
      setBusy(false); onDone();
    } catch { setErr(errUp); setBusy(false); }
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
  // The two visually hidden file inputs cannot paint their own focus ring, so the
  // labels standing in for them do. See ELITE-4 J2-1 below.
  const [focused, setFocused] = useState<"plan" | "broch" | null>(null);

  // Declared ahead of the uploaders because they now take their failure sentence
  // from it (ELITE-4 J2-20).
  const t = ar ? {
    plans: "المخططات", brochure: "الكتيّب التسويقي", add: "إضافة", remove: "حذف",
    noPlans: "لا مخططات بعد.", noBroch: "لا كتيّب بعد.", pdf: "ملف PDF",
    planHint: "صورة أو PDF، حتى 20 ميغابايت.", brochHint: "PDF، حتى 20 ميغابايت.",
    uploading: "جارٍ الرفع...", errRm: "تعذّر الحذف.", errUp: "تعذّر رفع الملف.",
    addPlan: "إضافة مخطط", addBroch: "إضافة كتيّب",
    // ELITE-4 J2-9: one accessible name per tile, not N identical ones.
    planItem: "مخطط", brochItem: "كتيّب",
  } : {
    plans: "Floor plans", brochure: "Marketing brochure", add: "Add", remove: "Remove",
    noPlans: "No floor plans yet.", noBroch: "No brochure yet.", pdf: "PDF file",
    planHint: "Image or PDF, up to 20MB.", brochHint: "PDF, up to 20MB.",
    uploading: "Uploading...", errRm: "Could not remove.", errUp: "Upload failed.",
    addPlan: "Add a floor plan", addBroch: "Add a brochure",
    // ELITE-4 J2-9: one accessible name per tile, not N identical ones.
    planItem: "Floor plan", brochItem: "Brochure",
  };

  const plan = useUploader(id, () => { if (planRef.current) planRef.current.value = ""; router.refresh(); }, t.errUp);
  const broch = useUploader(id, () => { if (brochRef.current) brochRef.current.value = ""; router.refresh(); }, t.errUp);

  async function remove(mediaId: string) {
    // ELITE-4 J2-6: no `disabled` attribute on the tile buttons, so pressing one
    // never blurs it. This guard is what `aria-disabled` announces.
    if (removing) return;
    setRemoving(mediaId); setRmErr(null);
    try {
      const res = await fetch(`/api/listings/${id}/media/${mediaId}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setRmErr(j.error || t.errRm); setRemoving(null); return; }
      setRemoving(null); router.refresh();
    } catch { setRmErr(t.errRm); setRemoving(null); }
  }

  // ELITE-4 J2-9. Every tile used to expose the same name, "Remove", and every
  // image the same empty alt, so a screen reader read N identical delete buttons
  // with no way to tell which file each one destroyed. The name of the file, or
  // failing that its kind and position, is now part of both.
  const tile = (d: Doc, i: number, group: string) => {
    const name = d.label || `${group} ${i + 1}`;
    return (
      <div key={d.id} style={{ border: "1px solid var(--silver)", borderRadius: 10, overflow: "hidden", background: "var(--paper)" }}>
        <div style={{ position: "relative", aspectRatio: "4 / 3", background: "var(--cool)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {d.isPdf || !d.url
            ? <span className="row gap6 muted" style={{ fontSize: "0.75rem" }}><Icon.doc size={18} /> {t.pdf}</span>
            : <img src={d.url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        </div>
        <div className="row" style={{ padding: "8px 10px", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer" className="muted" style={{ fontSize: "0.71875rem", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label || (ar ? "عرض" : "Open")}</a> : <span />}
          <button type="button" onClick={() => remove(d.id)} aria-disabled={removing === d.id || undefined} aria-label={`${t.remove}: ${name}`} className="chip" style={{ cursor: "pointer", fontSize: "0.71875rem", color: "var(--red)", borderColor: "var(--silver)", flex: "none", opacity: removing === d.id ? 0.6 : 1 }}>
            <Icon.trash size={13} /> {t.remove}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="col gap16">
      {/* ELITE-4 J2-6: each section announces its own pending request. */}
      <div aria-busy={plan.busy || undefined}>
        <div className="row between" style={{ alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: "0.875rem", fontWeight: 700 }}>{t.plans} <span className="muted" style={{ fontWeight: 400, fontSize: "0.78125rem" }}>· {floorplans.length}</span></div>
          {/* ELITE-4 J2-1: the input was `display:none`, so it was out of the tab
              order and out of the accessibility tree, and a <label> is not
              focusable. Floor plans could not be attached by keyboard at all. It
              is now visually hidden but focusable, named by an explicit htmlFor,
              and the label paints the focus ring the clipped input cannot. */}
          <label
            className="btn secondary sm"
            htmlFor="ldm-add-floorplan"
            style={{ cursor: plan.busy ? "default" : "pointer", opacity: plan.busy ? 0.6 : 1, position: "relative", outline: focused === "plan" ? "2px solid var(--harbor)" : undefined, outlineOffset: 2 }}
          >
            <Icon.plus size={14} /> {plan.busy ? t.uploading : t.add}
            <input
              id="ldm-add-floorplan"
              ref={planRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              aria-label={t.addPlan}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) plan.upload(f, "floorplan"); }}
              aria-disabled={plan.busy || undefined}
              onFocus={() => setFocused("plan")}
              onBlur={() => setFocused(null)}
              style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}
            />
          </label>
        </div>
        {floorplans.length === 0 ? <p className="muted" style={{ fontSize: "0.78125rem", margin: 0 }}>{t.noPlans}</p> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>{floorplans.map((d, i) => tile(d, i, t.planItem))}</div>
        )}
        <p className="muted" style={{ fontSize: "0.71875rem", marginTop: 8, marginBottom: 0 }}>{t.planHint}{plan.err ? <span style={{ color: "var(--red)" }}> · {plan.err}</span> : null}</p>
      </div>

      <div style={{ borderTop: "1px solid var(--silver)", paddingTop: 16 }} aria-busy={broch.busy || undefined}>
        <div className="row between" style={{ alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: "0.875rem", fontWeight: 700 }}>{t.brochure} <span className="muted" style={{ fontWeight: 400, fontSize: "0.78125rem" }}>· {brochures.length}</span></div>
          {/* ELITE-4 J2-1: same defect and same repair as the floor plan control above. */}
          <label
            className="btn secondary sm"
            htmlFor="ldm-add-brochure"
            style={{ cursor: broch.busy ? "default" : "pointer", opacity: broch.busy ? 0.6 : 1, position: "relative", outline: focused === "broch" ? "2px solid var(--harbor)" : undefined, outlineOffset: 2 }}
          >
            <Icon.plus size={14} /> {broch.busy ? t.uploading : t.add}
            <input
              id="ldm-add-brochure"
              ref={brochRef}
              type="file"
              accept="application/pdf"
              aria-label={t.addBroch}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) broch.upload(f, "brochure"); }}
              aria-disabled={broch.busy || undefined}
              onFocus={() => setFocused("broch")}
              onBlur={() => setFocused(null)}
              style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}
            />
          </label>
        </div>
        {brochures.length === 0 ? <p className="muted" style={{ fontSize: "0.78125rem", margin: 0 }}>{t.noBroch}</p> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>{brochures.map((d, i) => tile(d, i, t.brochItem))}</div>
        )}
        <p className="muted" style={{ fontSize: "0.71875rem", marginTop: 8, marginBottom: 0 }}>{t.brochHint}{broch.err ? <span style={{ color: "var(--red)" }}> · {broch.err}</span> : null}</p>
      </div>
      {rmErr && <p style={{ fontSize: "0.75rem", color: "var(--red)", margin: 0 }}>{rmErr}</p>}
    </div>
  );
}
