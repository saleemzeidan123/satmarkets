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
  // The visually hidden file input cannot show its own focus ring, so the label
  // that stands in for it draws one. See ELITE-4 J2-1 below.
  const [focused, setFocused] = useState(false);

  const t = ar ? {
    title: "الصور", cover: "الغلاف", makeCover: "اجعلها الغلاف", remove: "حذف", add: "إضافة صور",
    uploading: "جارٍ الرفع...", none: "لا توجد صور بعد. أضف صوراً ليراها المهتمّون.",
    hint: "JPEG أو PNG أو WebP، حتى 4 ميغابايت. أول صورة هي الغلاف.",
    errUp: "تعذّر رفع الصورة.", errRm: "تعذّر الحذف.", added: "تمت الإضافة", removed: "تم الحذف", coverSet: "تم تعيين الغلاف",
    // ELITE-4 J2-9: one accessible name per tile, not N identical ones.
    photoAt: (n: number) => `صورة ${n}`,
    makeCoverAt: (n: number) => `اجعل الصورة ${n} صورة الغلاف`,
    removeAt: (n: number) => `احذف الصورة ${n}`,
  } : {
    title: "Photos", cover: "Cover", makeCover: "Make cover", remove: "Remove", add: "Add photos",
    uploading: "Uploading...", none: "No photos yet. Add some so viewers can see the space.",
    hint: "JPEG, PNG, or WebP, up to 4MB each. The first photo is the cover.",
    errUp: "Could not upload the photo.", errRm: "Could not remove.", added: "Added", removed: "Removed", coverSet: "Cover set",
    // ELITE-4 J2-9: one accessible name per tile, not N identical ones.
    photoAt: (n: number) => `Photo ${n}`,
    makeCoverAt: (n: number) => `Make photo ${n} the cover`,
    removeAt: (n: number) => `Remove photo ${n}`,
  };

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    // ELITE-4 J2-6: nothing here is ever given the `disabled` attribute, so no
    // control is blurred mid-request. These guards are what `aria-disabled` states.
    if (busy) return;
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
    if (busy) return;
    setBusy(true); setErr(null); setNote(null);
    try {
      const res = await fetch(`/api/listings/${id}/media/${mediaId}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(j.error || t.errRm); setBusy(false); return; }
      setNote(t.removed); setBusy(false); router.refresh();
    } catch { setErr(t.errRm); setBusy(false); }
  }

  async function makeCover(mediaId: string) {
    if (busy) return;
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
    <div aria-busy={busy || undefined}>
      <div className="row between" style={{ alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700 }}>{t.title} <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>· {photos.length}</span></div>
        {/* ELITE-4 J2-1: the input was `display:none`, which takes it out of the tab
            order and out of the accessibility tree, and a <label> is not focusable,
            so photographs could not be attached by keyboard at all. It is now
            visually hidden but focusable, tied to the label by id, and the label
            paints the focus ring on its behalf so the ring is not clipped away. */}
        <label
          className="btn secondary"
          htmlFor="lmm-add-photos"
          style={{ cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, position: "relative", outline: focused ? "2px solid var(--harbor)" : undefined, outlineOffset: 2 }}
        >
          <Icon.plus size={15} /> {busy ? t.uploading : t.add}
          <input
            id="lmm-add-photos"
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={onUpload}
            aria-disabled={busy || undefined}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}
          />
        </label>
      </div>

      {photos.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>{t.none}</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
          {photos.map((p, i) => (
            <div key={p.id} style={{ border: "1px solid var(--silver)", borderRadius: 10, overflow: "hidden", background: "var(--paper)" }}>
              <div style={{ position: "relative", aspectRatio: "4 / 3", background: "var(--cool)" }}>
                {p.url ? <img src={p.url} alt={t.photoAt(i + 1)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}
                {i === 0 && (
                  <span style={{ position: "absolute", top: 8, insetInlineStart: 8, fontSize: 10.5, fontWeight: 700, letterSpacing: ".03em", color: "var(--on-brand)", background: "var(--harbor)", padding: "3px 8px", borderRadius: 6 }}>{t.cover}</span>
                )}
              </div>
              <div className="row gap8" style={{ padding: "8px 10px", justifyContent: "space-between" }}>
                {/* ELITE-4 J2-9: every tile used to repeat the same two names, so a
                    screen reader read N identical "Remove" buttons with nothing to
                    tell them apart. The position is now part of each name and of
                    the image's own alternative text. */}
                {i !== 0 ? (
                  <button type="button" onClick={() => makeCover(p.id)} aria-disabled={busy || undefined} aria-label={t.makeCoverAt(i + 1)} className="chip" style={{ cursor: "pointer", fontSize: 11.5, opacity: busy ? 0.6 : 1 }}>{t.makeCover}</button>
                ) : <span />}
                <button type="button" onClick={() => remove(p.id)} aria-disabled={busy || undefined} aria-label={t.removeAt(i + 1)} className="chip" style={{ cursor: "pointer", fontSize: 11.5, color: "var(--red)", borderColor: "var(--silver)", opacity: busy ? 0.6 : 1 }}>
                  <Icon.trash size={13} /> {t.remove}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="row gap10" style={{ marginTop: 10, alignItems: "center" }}>
        <p className="muted" style={{ fontSize: 11.5, margin: 0 }}>{t.hint}</p>
        {note && <span style={{ fontSize: 12.5, color: "var(--harbor-d)" }}>{note}</span>}
        {err && <span style={{ fontSize: 12.5, color: "var(--red)" }}>{err}</span>}
      </div>
    </div>
  );
}
