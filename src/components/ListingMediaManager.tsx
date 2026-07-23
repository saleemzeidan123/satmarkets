"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/satkit";

// The owner's photo manager for a listing. Add photos (uploaded, sniffed and
// re-encoded server-side), remove them, and choose the cover (the first photo, the
// one the search card and the gallery hero use). It talks to the same owner-scoped
// media routes the create flow uses, and refreshes after each change so the grid and
// the public listing agree. Verification is never touched here: a photo is a photo.
type Photo = { id: string; url: string | null };

export default function ListingMediaManager({ id, locale, photos }: { id: string; locale: string; photos: Photo[] }) {
  const ar = locale === "ar";
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const t = ar ? {
    title: "الصور", cover: "الغلاف", makeCover: "اجعلها الغلاف", remove: "حذف", add: "إضافة صور",
    uploading: "جارٍ الرفع...", none: "لا توجد صور بعد. أضف صوراً ليراها المهتمّون.",
    hint: "JPEG أو PNG أو WebP، حتى 4 ميغابايت. أول صورة هي الغلاف.",
    errUp: "تعذّر رفع الصورة.", errRm: "تعذّر الحذف.", added: "تمت الإضافة", removed: "تم الحذف", coverSet: "تم تعيين الغلاف",
  } : {
    title: "Photos", cover: "Cover", makeCover: "Make cover", remove: "Remove", add: "Add photos",
    uploading: "Uploading...", none: "No photos yet. Add some so viewers can see the space.",
    hint: "JPEG, PNG, or WebP, up to 4MB each. The first photo is the cover.",
    errUp: "Could not upload the photo.", errRm: "Could not remove.", added: "Added", removed: "Removed", coverSet: "Cover set",
  };

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    if (!list.length) return;
    setBusy(true); setErr(null); setNote(null);
    let ok = 0;
    for (const file of list) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch(`/api/listings/${id}/media`, { method: "POST", body: fd });
        if (res.ok) ok++;
        else { const j = await res.json().catch(() => ({})); setErr(j.error || t.errUp); }
      } catch { setErr(t.errUp); }
    }
    if (fileRef.current) fileRef.current.value = "";
    setBusy(false);
    if (ok) { setNote(t.added); router.refresh(); }
  }

  async function remove(mediaId: string) {
    setBusy(true); setErr(null); setNote(null);
    try {
      const res = await fetch(`/api/listings/${id}/media/${mediaId}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(j.error || t.errRm); setBusy(false); return; }
      setNote(t.removed); setBusy(false); router.refresh();
    } catch { setErr(t.errRm); setBusy(false); }
  }

  async function makeCover(mediaId: string) {
    const order = [mediaId, ...photos.map((p) => p.id).filter((x) => x !== mediaId)];
    setBusy(true); setErr(null); setNote(null);
    try {
      const res = await fetch(`/api/listings/${id}/media`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ order }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(j.error || t.errRm); setBusy(false); return; }
      setNote(t.coverSet); setBusy(false); router.refresh();
    } catch { setErr(t.errRm); setBusy(false); }
  }

  return (
    <div>
      <div className="row between" style={{ alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700 }}>{t.title} <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>· {photos.length}</span></div>
        <label className="btn secondary" style={{ cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
          <Icon.plus size={15} /> {busy ? t.uploading : t.add}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onUpload} disabled={busy} style={{ display: "none" }} />
        </label>
      </div>

      {photos.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>{t.none}</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
          {photos.map((p, i) => (
            <div key={p.id} style={{ border: "1px solid var(--silver)", borderRadius: 10, overflow: "hidden", background: "var(--paper)" }}>
              <div style={{ position: "relative", aspectRatio: "4 / 3", background: "var(--cool)" }}>
                {p.url ? <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}
                {i === 0 && (
                  <span style={{ position: "absolute", top: 8, insetInlineStart: 8, fontSize: 10.5, fontWeight: 700, letterSpacing: ".03em", color: "var(--on-brand)", background: "var(--harbor)", padding: "3px 8px", borderRadius: 6 }}>{t.cover}</span>
                )}
              </div>
              <div className="row gap8" style={{ padding: "8px 10px", justifyContent: "space-between" }}>
                {i !== 0 ? (
                  <button type="button" onClick={() => makeCover(p.id)} disabled={busy} className="chip" style={{ cursor: "pointer", fontSize: 11.5 }}>{t.makeCover}</button>
                ) : <span />}
                <button type="button" onClick={() => remove(p.id)} disabled={busy} aria-label={t.remove} className="chip" style={{ cursor: "pointer", fontSize: 11.5, color: "var(--red)", borderColor: "var(--silver)" }}>
                  <Icon.trash size={13} /> {t.remove}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="row gap10" style={{ marginTop: 10, alignItems: "center" }}>
        <p className="muted" style={{ fontSize: 11.5, margin: 0 }}>{t.hint}</p>
        {note && <span style={{ fontSize: 12.5, color: "var(--green)" }}>{note}</span>}
        {err && <span style={{ fontSize: 12.5, color: "var(--red)" }}>{err}</span>}
      </div>
    </div>
  );
}
